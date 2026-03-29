import { Room } from './room';

// Client -> Server
export interface WsCreateRoom { name: string; }
export interface WsJoinRoom { roomId: string; }
export interface WsStartGame { length: number; }
export interface WsMakeGuess { guess: string; }
export interface WsRestartGame { length: number; }

// Server -> Client
export interface WsRoomUpdate { room: Room; }
export interface WsRoomList { rooms: Room[]; }
export interface WsRoomDeleted { roomId: string; }
export interface WsError { message: string; }
export interface WsTurnTimer { remaining: number; }
