import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { GameService } from '../game/game.service';
import { PlayerService } from '../player/player.service';
import { Room, RoomInternal, RoomPlayer, RoomGameStateInternal, RoomGuessResult } from '../../common/types/room';

@Injectable()
export class RoomService {
  constructor(
    private redis: RedisService,
    private gameService: GameService,
    private playerService: PlayerService,
  ) {}

  // === Read ===

  async getRoom(roomId: string): Promise<RoomInternal | null> {
    const data = await this.redis.hgetall(`room:${roomId}`);
    if (!data || !data['name']) return null;
    return {
      id: roomId,
      name: data['name'],
      creatorId: data['creatorId'],
      creatorName: data['creatorName'],
      status: data['status'] as any,
      players: JSON.parse(data['players'] || '[]'),
      gameState: data['gameState'] ? JSON.parse(data['gameState']) : undefined,
      createdAt: parseInt(data['createdAt'] || '0', 10),
      updatedAt: parseInt(data['updatedAt'] || '0', 10),
    };
  }

  toClientRoom(room: RoomInternal): Room {
    const { gameState, ...rest } = room;
    if (!gameState) return { ...rest, gameState: undefined };
    const { targetNumber, ...clientGameState } = gameState;
    return { ...rest, gameState: clientGameState };
  }

  async getAvailableRooms(): Promise<Room[]> {
    const roomIds = await this.redis.smembers('rooms:waiting');
    const rooms: Room[] = [];
    for (const id of roomIds) {
      const room = await this.getRoom(id);
      if (room && room.status === 'waiting') {
        rooms.push(this.toClientRoom(room));
      }
    }
    return rooms;
  }

  // === Create ===

  async createRoom(uid: string, displayName: string, name: string): Promise<RoomInternal> {
    const roomId = this.generateId();
    const now = Date.now();
    const room: RoomInternal = {
      id: roomId,
      name,
      creatorId: uid,
      creatorName: displayName,
      status: 'waiting',
      players: [{ uid, displayName }],
      createdAt: now,
      updatedAt: now,
    };

    await this.saveRoom(room);
    await this.redis.sadd('rooms:waiting', roomId);
    await this.redis.sadd('rooms:active', roomId);
    await this.redis.set(`player:room:${uid}`, roomId);
    return room;
  }

  // === Join ===

  async joinRoom(uid: string, displayName: string, roomId: string): Promise<RoomInternal> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room does not exist');
    if (room.status !== 'waiting') throw new Error('Game already in progress');
    if (room.players.length >= 3) throw new Error('Room is full');
    if (room.players.some(p => p.uid === uid)) throw new Error('Already in this room');

    room.players.push({ uid, displayName });
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    await this.redis.set(`player:room:${uid}`, roomId);
    return room;
  }

  // === Leave ===

  async leaveRoom(uid: string): Promise<{ room: RoomInternal | null; deleted: boolean; roomId: string | null }> {
    const roomId = await this.redis.get(`player:room:${uid}`);
    if (!roomId) return { room: null, deleted: false, roomId: null };

    const room = await this.getRoom(roomId);
    if (!room) {
      await this.redis.del(`player:room:${uid}`);
      return { room: null, deleted: false, roomId };
    }

    await this.redis.del(`player:room:${uid}`);

    if (room.creatorId === uid) {
      // Creator leaves -> delete room
      await this.deleteRoom(room);
      return { room: null, deleted: true, roomId };
    }

    // Remove player
    room.players = room.players.filter(p => p.uid !== uid);

    // If it was this player's turn, advance turn
    if (room.gameState && room.gameState.currentTurnPlayerId === uid) {
      const newTurnOrder = room.gameState.turnOrder.filter(id => id !== uid);
      if (newTurnOrder.length > 0) {
        const oldIdx = room.gameState.turnOrder.indexOf(uid);
        room.gameState.currentTurnPlayerId = newTurnOrder[oldIdx % newTurnOrder.length];
        room.gameState.turnOrder = newTurnOrder;
        room.gameState.turnStartedAt = Date.now();
      }
    } else if (room.gameState) {
      room.gameState.turnOrder = room.gameState.turnOrder.filter(id => id !== uid);
    }

    room.updatedAt = Date.now();
    await this.saveRoom(room);
    return { room, deleted: false, roomId };
  }

  // === Game Control ===

  async startGame(uid: string, length: number): Promise<RoomInternal> {
    const roomId = await this.redis.get(`player:room:${uid}`);
    if (!roomId) throw new Error('Not in a room');

    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.creatorId !== uid) throw new Error('Only creator can start');
    if (room.status !== 'waiting' && room.status !== 'finished') throw new Error('Cannot start now');

    const targetNumber = this.gameService.generateNumber(length);
    const turnOrder = [...room.players.map(p => p.uid)].sort(() => Math.random() - 0.5);

    room.gameState = {
      targetNumber,
      length,
      currentTurnPlayerId: turnOrder[0],
      turnOrder,
      turnStartedAt: Date.now(),
      history: [],
    };
    room.status = 'playing';
    room.updatedAt = Date.now();

    await this.saveRoom(room);
    await this.redis.srem('rooms:waiting', room.id);
    return room;
  }

  async makeGuess(uid: string, guess: string): Promise<{ room: RoomInternal; isWin: boolean }> {
    const roomId = await this.redis.get(`player:room:${uid}`);
    if (!roomId) throw new Error('Not in a room');

    const room = await this.getRoom(roomId);
    if (!room || !room.gameState) throw new Error('No active game');
    if (room.gameState.currentTurnPlayerId !== uid) throw new Error('Not your turn');
    if (guess.length !== room.gameState.length) throw new Error('Wrong guess length');

    const { greenLights, yellowLights } = this.gameService.evaluate(guess, room.gameState.targetNumber);
    const player = room.players.find(p => p.uid === uid);

    const result: RoomGuessResult = {
      playerId: uid,
      playerName: player?.displayName || 'Unknown',
      guess,
      greenLights,
      yellowLights,
      timestamp: Date.now(),
    };

    room.gameState.history.push(result);
    const isWin = greenLights === room.gameState.length;

    if (isWin) {
      room.status = 'finished';
      room.gameState.winnerId = uid;
      room.gameState.winnerName = player?.displayName;

      // Save room win
      const guessCount = room.gameState.history.filter(h => h.playerId === uid).length;
      await this.playerService.saveGameResult(uid, player?.displayName || '', room.gameState.length, guessCount, true);
    } else {
      // Advance turn
      const turnOrder = room.gameState.turnOrder;
      const currentIdx = turnOrder.indexOf(uid);
      room.gameState.currentTurnPlayerId = turnOrder[(currentIdx + 1) % turnOrder.length];
      room.gameState.turnStartedAt = Date.now();
    }

    room.updatedAt = Date.now();
    await this.saveRoom(room);
    return { room, isWin };
  }

  async restartGame(uid: string, length: number): Promise<RoomInternal> {
    const roomId = await this.redis.get(`player:room:${uid}`);
    if (!roomId) throw new Error('Not in a room');

    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.creatorId !== uid) throw new Error('Only creator can restart');
    if (room.status !== 'finished') throw new Error('Game not finished');

    const targetNumber = this.gameService.generateNumber(length);
    const turnOrder = [...room.players.map(p => p.uid)].sort(() => Math.random() - 0.5);

    room.gameState = {
      targetNumber,
      length,
      currentTurnPlayerId: turnOrder[0],
      turnOrder,
      turnStartedAt: Date.now(),
      history: [],
    };
    room.status = 'playing';
    room.updatedAt = Date.now();

    await this.saveRoom(room);
    return room;
  }

  async advanceTurn(roomId: string): Promise<RoomInternal | null> {
    const room = await this.getRoom(roomId);
    if (!room || !room.gameState || room.status !== 'playing') return null;

    const turnOrder = room.gameState.turnOrder;
    const currentIdx = turnOrder.indexOf(room.gameState.currentTurnPlayerId);
    room.gameState.currentTurnPlayerId = turnOrder[(currentIdx + 1) % turnOrder.length];
    room.gameState.turnStartedAt = Date.now();
    room.updatedAt = Date.now();

    await this.saveRoom(room);
    return room;
  }

  // === Helpers ===

  private async saveRoom(room: RoomInternal): Promise<void> {
    await this.redis.hmset(`room:${room.id}`, {
      name: room.name,
      creatorId: room.creatorId,
      creatorName: room.creatorName,
      status: room.status,
      players: JSON.stringify(room.players),
      gameState: room.gameState ? JSON.stringify(room.gameState) : '',
      createdAt: String(room.createdAt),
      updatedAt: String(room.updatedAt),
    });
  }

  private async deleteRoom(room: RoomInternal): Promise<void> {
    // Clean up all player mappings
    for (const player of room.players) {
      await this.redis.del(`player:room:${player.uid}`);
    }
    await this.redis.del(`room:${room.id}`);
    await this.redis.srem('rooms:waiting', room.id);
    await this.redis.srem('rooms:active', room.id);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }
}
