import { Timestamp } from '@angular/fire/firestore';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomPlayer {
  uid: string;
  displayName: string;
  lastKeepAlive: Timestamp;
}

export interface RoomGuessResult {
  playerId: string;
  playerName: string;
  guess: string;
  greenLights: number;
  yellowLights: number;
  timestamp: Timestamp;
}

export interface RoomGameState {
  targetNumber: string;
  length: number;
  currentTurnPlayerId: string;
  turnOrder: string[];
  turnStartedAt: Timestamp;
  history: RoomGuessResult[];
  winnerId?: string;
  winnerName?: string;
}

export interface Room {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  status: RoomStatus;
  players: RoomPlayer[];
  gameState?: RoomGameState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
