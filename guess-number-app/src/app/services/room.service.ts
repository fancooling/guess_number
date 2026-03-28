import { Injectable, inject, signal, computed, OnDestroy, NgZone } from '@angular/core';
import {
  Firestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, Timestamp, runTransaction,
  CollectionReference, Unsubscribe, Transaction, DocumentSnapshot
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { Room, RoomPlayer, RoomGuessResult, RoomGameState } from '../models/room';
import { evaluateGuess } from '../utils/guess-evaluator';

@Injectable({
  providedIn: 'root'
})
export class RoomService implements OnDestroy {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private ngZone = inject(NgZone);

  private roomsCollection = collection(this.firestore, 'rooms') as CollectionReference;

  // Signals
  private _availableRooms = signal<Room[]>([]);
  private _currentRoom = signal<Room | null>(null);
  private _turnTimeRemaining = signal<number>(60);

  availableRooms = this._availableRooms.asReadonly();
  currentRoom = this._currentRoom.asReadonly();
  turnTimeRemaining = this._turnTimeRemaining.asReadonly();

  isInRoom = computed(() => this._currentRoom() !== null);
  isRoomCreator = computed(() => {
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    return room !== null && uid !== null && room.creatorId === uid;
  });
  isMyTurn = computed(() => {
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    return room?.status === 'playing' && room.gameState?.currentTurnPlayerId === uid;
  });

  // Subscriptions
  private roomListUnsub: Unsubscribe | null = null;
  private currentRoomUnsub: Unsubscribe | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Listen to auth changes to subscribe/unsubscribe from room list
    this.auth.firebaseUser.subscribe(user => {
      if (user && !user.isAnonymous) {
        this.subscribeToAvailableRooms();
      } else {
        this.unsubscribeFromRoomList();
        if (this._currentRoom()) {
          this.leaveRoom();
        }
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  ngOnDestroy() {
    this.cleanup();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleBeforeUnload = () => {
    if (this._currentRoom()) {
      // Use sendBeacon for reliability on unload
      this.leaveRoom();
    }
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && this._currentRoom()) {
      this.sendKeepAlive();
    }
  };

  // === Room List Subscription ===

  private subscribeToAvailableRooms(): void {
    this.unsubscribeFromRoomList();
    const q = query(this.roomsCollection, where('status', '==', 'waiting'));
    this.roomListUnsub = onSnapshot(q, (snapshot) => {
      this.ngZone.run(() => {
        const rooms: Room[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Room));
        this._availableRooms.set(rooms);
      });
    });
  }

  private unsubscribeFromRoomList(): void {
    if (this.roomListUnsub) {
      this.roomListUnsub();
      this.roomListUnsub = null;
    }
    this._availableRooms.set([]);
  }

  // === Room CRUD ===

  async createRoom(name: string): Promise<string> {
    const uid = this.auth.getUserId();
    const displayName = this.auth.displayName();
    if (!uid || this.auth.authState() !== 'authenticated') {
      throw new Error('Must be authenticated to create a room');
    }

    const roomRef = doc(this.roomsCollection);
    const now = Timestamp.now();
    const room: Room = {
      id: roomRef.id,
      name,
      creatorId: uid,
      creatorName: displayName,
      status: 'waiting',
      players: [{
        uid,
        displayName,
        lastKeepAlive: now
      }],
      createdAt: now,
      updatedAt: now
    };

    await setDoc(roomRef, room);
    this.subscribeToRoom(roomRef.id);
    this.startKeepAlive();
    return roomRef.id;
  }

  async joinRoom(roomId: string): Promise<void> {
    const uid = this.auth.getUserId();
    const displayName = this.auth.displayName();
    if (!uid || this.auth.authState() !== 'authenticated') {
      throw new Error('Must be authenticated to join a room');
    }

    const roomRef = doc(this.roomsCollection, roomId);

    await runTransaction(this.firestore, async (transaction: Transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error('Room does not exist');

      const data = roomDoc.data() as Room;
      if (data.status !== 'waiting') throw new Error('Game already in progress');
      if (data.players.length >= 3) throw new Error('Room is full');
      if (data.players.some(p => p.uid === uid)) throw new Error('Already in this room');

      const newPlayer: RoomPlayer = {
        uid,
        displayName,
        lastKeepAlive: Timestamp.now()
      };

      transaction.update(roomRef, {
        players: [...data.players, newPlayer],
        updatedAt: Timestamp.now()
      });
    });

    this.subscribeToRoom(roomId);
    this.startKeepAlive();
  }

  async leaveRoom(): Promise<void> {
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    if (!room || !uid) return;

    this.stopKeepAlive();
    this.stopTimer();
    this.stopStaleCheck();
    this.unsubscribeFromRoom();

    if (room.creatorId === uid) {
      // Creator leaves -> delete room
      await deleteDoc(doc(this.roomsCollection, room.id));
    } else {
      // Remove player from room
      const roomRef = doc(this.roomsCollection, room.id);
      try {
        await runTransaction(this.firestore, async (transaction: Transaction) => {
          const roomDoc = await transaction.get(roomRef);
          if (!roomDoc.exists()) return;

          const data = roomDoc.data() as Room;
          const updatedPlayers = data.players.filter(p => p.uid !== uid);

          const updates: any = {
            players: updatedPlayers,
            updatedAt: Timestamp.now()
          };

          // If it was this player's turn, advance turn
          if (data.gameState && data.gameState.currentTurnPlayerId === uid) {
            const updatedTurnOrder = data.gameState.turnOrder.filter(id => id !== uid);
            if (updatedTurnOrder.length > 0) {
              const currentIndex = data.gameState.turnOrder.indexOf(uid);
              const nextIndex = currentIndex % updatedTurnOrder.length;
              updates['gameState.currentTurnPlayerId'] = updatedTurnOrder[nextIndex];
              updates['gameState.turnOrder'] = updatedTurnOrder;
              updates['gameState.turnStartedAt'] = Timestamp.now();
            }
          }

          transaction.update(roomRef, updates);
        });
      } catch (e) {
        // Room may already be deleted
      }
    }

    this._currentRoom.set(null);
  }

  // === Game Control ===

  async startGame(length: number): Promise<void> {
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    if (!room || room.creatorId !== uid) throw new Error('Only creator can start the game');
    if (room.status !== 'waiting' && room.status !== 'finished') throw new Error('Cannot start game now');

    const targetNumber = this.generateRandomNumber(length);
    const playerIds = room.players.map(p => p.uid);
    // Shuffle turn order
    const turnOrder = [...playerIds].sort(() => Math.random() - 0.5);

    const gameState: RoomGameState = {
      targetNumber,
      length,
      currentTurnPlayerId: turnOrder[0],
      turnOrder,
      turnStartedAt: Timestamp.now(),
      history: []
    };

    await updateDoc(doc(this.roomsCollection, room.id), {
      status: 'playing',
      gameState,
      updatedAt: Timestamp.now()
    });
  }

  async makeRoomGuess(guess: string): Promise<void> {
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    const displayName = this.auth.displayName();
    if (!room || !room.gameState || !uid) return;
    if (room.gameState.currentTurnPlayerId !== uid) return;
    if (guess.length !== room.gameState.length) return;

    const roomRef = doc(this.roomsCollection, room.id);

    await runTransaction(this.firestore, async (transaction: Transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) return;

      const data = roomDoc.data() as Room;
      if (!data.gameState || data.gameState.currentTurnPlayerId !== uid) return;

      const { greenLights, yellowLights } = evaluateGuess(guess, data.gameState.targetNumber);

      const result: RoomGuessResult = {
        playerId: uid,
        playerName: displayName,
        guess,
        greenLights,
        yellowLights,
        timestamp: Timestamp.now()
      };

      const updatedHistory = [...data.gameState.history, result];
      const isWin = greenLights === data.gameState.length;

      if (isWin) {
        transaction.update(roomRef, {
          status: 'finished',
          'gameState.history': updatedHistory,
          'gameState.winnerId': uid,
          'gameState.winnerName': displayName,
          updatedAt: Timestamp.now()
        });
      } else {
        // Advance turn
        const turnOrder = data.gameState.turnOrder;
        const currentIndex = turnOrder.indexOf(uid);
        const nextIndex = (currentIndex + 1) % turnOrder.length;

        transaction.update(roomRef, {
          'gameState.history': updatedHistory,
          'gameState.currentTurnPlayerId': turnOrder[nextIndex],
          'gameState.turnStartedAt': Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    });
  }

  async restartGame(length: number): Promise<void> {
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    if (!room || room.creatorId !== uid || room.status !== 'finished') return;

    const targetNumber = this.generateRandomNumber(length);
    const playerIds = room.players.map(p => p.uid);
    const turnOrder = [...playerIds].sort(() => Math.random() - 0.5);

    const gameState: RoomGameState = {
      targetNumber,
      length,
      currentTurnPlayerId: turnOrder[0],
      turnOrder,
      turnStartedAt: Timestamp.now(),
      history: []
    };

    await updateDoc(doc(this.roomsCollection, room.id), {
      status: 'playing',
      gameState,
      updatedAt: Timestamp.now()
    });
  }

  // === Room Subscription ===

  private subscribeToRoom(roomId: string): void {
    this.unsubscribeFromRoom();
    const roomRef = doc(this.roomsCollection, roomId);
    this.currentRoomUnsub = onSnapshot(roomRef, (snapshot: DocumentSnapshot) => {
      this.ngZone.run(() => {
        if (!snapshot.exists()) {
          // Room was deleted
          this.stopKeepAlive();
          this.stopTimer();
          this.stopStaleCheck();
          this._currentRoom.set(null);
          return;
        }

        const room = { id: snapshot.id, ...snapshot.data() } as Room;
        this._currentRoom.set(room);

        // Manage timer based on game state
        if (room.status === 'playing' && room.gameState) {
          this.startTimer(room.gameState.turnStartedAt);
          this.startStaleCheck();
        } else {
          this.stopTimer();
          this.stopStaleCheck();
        }

        // Handle win - save to leaderboard
        if (room.status === 'finished' && room.gameState?.winnerId) {
          this.handleGameFinished(room);
        }
      });
    });
  }

  private unsubscribeFromRoom(): void {
    if (this.currentRoomUnsub) {
      this.currentRoomUnsub();
      this.currentRoomUnsub = null;
    }
  }

  // === Keep-Alive ===

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.sendKeepAlive();
    this.keepAliveInterval = setInterval(() => this.sendKeepAlive(), 30000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private async sendKeepAlive(): Promise<void> {
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    if (!room || !uid) return;

    const roomRef = doc(this.roomsCollection, room.id);
    try {
      await runTransaction(this.firestore, async (transaction: Transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return;

        const data = roomDoc.data() as Room;
        const updatedPlayers = data.players.map(p =>
          p.uid === uid ? { ...p, lastKeepAlive: Timestamp.now() } : p
        );
        transaction.update(roomRef, { players: updatedPlayers });
      });
    } catch (e) {
      // Room may have been deleted
    }
  }

  // === Turn Timer ===

  private startTimer(turnStartedAt: Timestamp): void {
    this.stopTimer();
    const updateRemaining = () => {
      const elapsed = (Date.now() - turnStartedAt.toMillis()) / 1000;
      const remaining = Math.max(0, 60 - Math.floor(elapsed));
      this._turnTimeRemaining.set(remaining);

      if (remaining <= 0) {
        this.handleTurnTimeout();
      }
    };
    updateRemaining();
    this.timerInterval = setInterval(updateRemaining, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this._turnTimeRemaining.set(60);
  }

  private async handleTurnTimeout(): Promise<void> {
    this.stopTimer();
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    if (!room || !room.gameState || room.status !== 'playing') return;

    // Only the current turn player's client or the creator advances the turn
    const isCurrentTurnPlayer = room.gameState.currentTurnPlayerId === uid;
    const isCreator = room.creatorId === uid;
    if (!isCurrentTurnPlayer && !isCreator) return;

    const roomRef = doc(this.roomsCollection, room.id);
    try {
      await runTransaction(this.firestore, async (transaction: Transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return;

        const data = roomDoc.data() as Room;
        if (!data.gameState || data.status !== 'playing') return;

        // Verify turn actually timed out (prevent race)
        const elapsed = (Date.now() - data.gameState.turnStartedAt.toMillis()) / 1000;
        if (elapsed < 59) return; // Not actually timed out yet

        const turnOrder = data.gameState.turnOrder;
        const currentIndex = turnOrder.indexOf(data.gameState.currentTurnPlayerId);
        const nextIndex = (currentIndex + 1) % turnOrder.length;

        transaction.update(roomRef, {
          'gameState.currentTurnPlayerId': turnOrder[nextIndex],
          'gameState.turnStartedAt': Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });
    } catch (e) {
      // Transaction conflict is fine - another client handled it
    }
  }

  // === Stale Player Check ===

  private startStaleCheck(): void {
    if (this.staleCheckInterval) return; // Already running
    this.staleCheckInterval = setInterval(() => this.checkStalePlayers(), 30000);
  }

  private stopStaleCheck(): void {
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }
  }

  private async checkStalePlayers(): Promise<void> {
    const room = this._currentRoom();
    const uid = this.auth.getUserId();
    if (!room || !uid) return;

    // Only the creator checks for stale players
    // If creator is stale, the player with lowest uid takes over
    const isCreator = room.creatorId === uid;
    const creatorAlive = room.players.some(p =>
      p.uid === room.creatorId &&
      (Date.now() - p.lastKeepAlive.toMillis()) < 120000
    );

    if (!isCreator && creatorAlive) return;
    if (!isCreator) {
      // Creator is stale - check if we're the lowest UID among remaining players
      const alivePlayers = room.players
        .filter(p => p.uid !== room.creatorId)
        .sort((a, b) => a.uid.localeCompare(b.uid));
      if (alivePlayers.length === 0 || alivePlayers[0].uid !== uid) return;
    }

    const now = Date.now();
    const stalePlayers = room.players.filter(p =>
      (now - p.lastKeepAlive.toMillis()) > 120000
    );

    if (stalePlayers.length === 0) return;

    // If creator is stale, delete room
    if (stalePlayers.some(p => p.uid === room.creatorId)) {
      await deleteDoc(doc(this.roomsCollection, room.id));
      return;
    }

    // Remove stale players
    const roomRef = doc(this.roomsCollection, room.id);
    try {
      await runTransaction(this.firestore, async (transaction: Transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return;

        const data = roomDoc.data() as Room;
        const staleUids = new Set(stalePlayers.map(p => p.uid));
        const updatedPlayers = data.players.filter(p => !staleUids.has(p.uid));

        const updates: any = {
          players: updatedPlayers,
          updatedAt: Timestamp.now()
        };

        // Update turn order and advance turn if needed
        if (data.gameState && data.status === 'playing') {
          const updatedTurnOrder = data.gameState.turnOrder.filter(id => !staleUids.has(id));
          updates['gameState.turnOrder'] = updatedTurnOrder;

          if (staleUids.has(data.gameState.currentTurnPlayerId) && updatedTurnOrder.length > 0) {
            const oldIndex = data.gameState.turnOrder.indexOf(data.gameState.currentTurnPlayerId);
            const nextIndex = oldIndex % updatedTurnOrder.length;
            updates['gameState.currentTurnPlayerId'] = updatedTurnOrder[nextIndex];
            updates['gameState.turnStartedAt'] = Timestamp.now();
          }

          // If only one player left, they win by default
          if (updatedPlayers.length <= 1 && updatedPlayers.length > 0) {
            updates.status = 'finished';
            updates['gameState.winnerId'] = updatedPlayers[0].uid;
            updates['gameState.winnerName'] = updatedPlayers[0].displayName;
          }
        }

        transaction.update(roomRef, updates);
      });
    } catch (e) {
      // Transaction conflict
    }
  }

  // === Game Result Handling ===

  private gameResultSaved = new Set<string>();

  private async handleGameFinished(room: Room): Promise<void> {
    if (!room.gameState?.winnerId) return;
    const uid = this.auth.getUserId();
    if (room.gameState.winnerId !== uid) return;

    // Prevent duplicate saves
    const key = `${room.id}-${room.gameState.history.length}`;
    if (this.gameResultSaved.has(key)) return;
    this.gameResultSaved.add(key);

    try {
      await this.firestoreService.saveRoomWin(
        uid!,
        this.auth.displayName(),
        room.gameState.length,
        room.gameState.history.filter(h => h.playerId === uid).length
      );
    } catch (e) {
      console.error('Error saving room win:', e);
      this.gameResultSaved.delete(key);
    }
  }

  // === Utilities ===

  private generateRandomNumber(length: number): string {
    const digits: number[] = [];
    while (digits.length < length) {
      const d = Math.floor(Math.random() * 10);
      if (!digits.includes(d)) {
        digits.push(d);
      }
    }
    return digits.join('');
  }

  private cleanup(): void {
    this.unsubscribeFromRoomList();
    this.unsubscribeFromRoom();
    this.stopKeepAlive();
    this.stopTimer();
    this.stopStaleCheck();
  }
}
