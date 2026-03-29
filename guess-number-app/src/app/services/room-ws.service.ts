import { Injectable, inject, signal, computed, OnDestroy, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { Room } from '../../common/types/room';

@Injectable({
  providedIn: 'root'
})
export class RoomWsService implements OnDestroy {
  private auth = inject(AuthService);
  private socket: Socket | null = null;

  private _availableRooms = signal<Room[]>([]);
  private _currentRoom = signal<Room | null>(null);
  private _turnTimeRemaining = signal<number>(60);
  private _notification = signal<string | null>(null);

  availableRooms = this._availableRooms.asReadonly();
  currentRoom = this._currentRoom.asReadonly();
  turnTimeRemaining = this._turnTimeRemaining.asReadonly();
  notification = this._notification.asReadonly();

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

  constructor() {
    effect(() => {
      const state = this.auth.authState();
      if (state === 'authenticated') {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect(): void {
    if (this.socket?.connected) return;

    const token = this.auth.getToken();
    if (!token) return;

    this.socket = io('/rooms', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('room:list', (rooms: Room[]) => {
      this._availableRooms.set(rooms);
    });

    this.socket.on('room:update', (room: Room) => {
      this._currentRoom.set(room);
    });

    this.socket.on('room:deleted', () => {
      this._currentRoom.set(null);
      this._turnTimeRemaining.set(60);
      this._notification.set('The room has been closed by the host.');
    });

    this.socket.on('turn:timer', (data: { remaining: number }) => {
      this._turnTimeRemaining.set(data.remaining);
    });

    this.socket.on('room:error', (data: { message: string }) => {
      console.error('Room error:', data.message);
    });

    this.socket.emit('subscribe:rooms');
  }

  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._availableRooms.set([]);
    this._currentRoom.set(null);
    this._turnTimeRemaining.set(60);
  }

  createRoom(name: string): void {
    this.socket?.emit('create:room', { name });
  }

  joinRoom(roomId: string): void {
    this.socket?.emit('join:room', { roomId });
  }

  leaveRoom(): void {
    this.socket?.emit('leave:room');
    this._currentRoom.set(null);
    this._turnTimeRemaining.set(60);
  }

  startGame(length: number): void {
    this.socket?.emit('start:game', { length });
  }

  makeRoomGuess(guess: string): void {
    this.socket?.emit('make:guess', { guess });
  }

  restartGame(length: number): void {
    this.socket?.emit('restart:game', { length });
  }

  dismissNotification(): void {
    this._notification.set(null);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
