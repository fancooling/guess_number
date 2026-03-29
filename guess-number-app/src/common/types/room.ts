export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomPlayer {
  uid: string;
  displayName: string;
}

export interface RoomGuessResult {
  playerId: string;
  playerName: string;
  guess: string;
  greenLights: number;
  yellowLights: number;
  timestamp: number;
}

export interface RoomGameState {
  length: number;
  currentTurnPlayerId: string;
  turnOrder: string[];
  turnStartedAt: number;
  history: RoomGuessResult[];
  winnerId?: string;
  winnerName?: string;
}

// Internal server-side state (includes targetNumber)
export interface RoomGameStateInternal extends RoomGameState {
  targetNumber: string;
}

export interface Room {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  status: RoomStatus;
  players: RoomPlayer[];
  gameState?: RoomGameState;
  createdAt: number;
  updatedAt: number;
}

// Server-side room with targetNumber
export interface RoomInternal extends Omit<Room, 'gameState'> {
  gameState?: RoomGameStateInternal;
}
