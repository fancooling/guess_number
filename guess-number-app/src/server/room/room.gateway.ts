import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { PlayerService } from '../player/player.service';
import { RoomService } from './room.service';
import { RoomTimerService } from './room-timer.service';

interface AuthenticatedSocket extends Socket {
  user: { uid: string; displayName: string; isGuest: boolean };
}

@WebSocketGateway({
  namespace: '/rooms',
  cors: { origin: '*' },
  pingInterval: 30000,
  pingTimeout: 90000,
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private lobbySubscribers = new Set<string>(); // socket IDs

  constructor(
    private authService: AuthService,
    private playerService: PlayerService,
    private roomService: RoomService,
    private timerService: RoomTimerService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = client.handshake.auth?.['token'];
    if (!token) {
      client.disconnect();
      return;
    }

    const payload = this.authService.verifyToken(token);
    if (!payload) {
      client.disconnect();
      return;
    }

    // Fetch current display name from Redis (JWT may have stale name)
    if (!payload.isGuest) {
      const stats = await this.playerService.getPlayerStats(payload.uid);
      if (stats) {
        payload.displayName = stats.displayName;
      }
    }

    client.user = payload;
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    this.lobbySubscribers.delete(client.id);

    if (!client.user) return;
    const { room, deleted, roomId } = await this.roomService.leaveRoom(client.user.uid);

    if (roomId) {
      if (deleted) {
        this.server.to(`room:${roomId}`).emit('room:deleted', { roomId });
      } else if (room) {
        this.server.to(`room:${roomId}`).emit('room:update', this.roomService.toClientRoom(room));
        if (room.status === 'playing' && room.gameState) {
          this.startTurnTimer(room.id);
        }
      }
      await this.broadcastRoomList();
    }
  }

  @SubscribeMessage('subscribe:rooms')
  async handleSubscribeRooms(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    this.lobbySubscribers.add(client.id);
    const rooms = await this.roomService.getAvailableRooms();
    client.emit('room:list', rooms);
  }

  @SubscribeMessage('unsubscribe:rooms')
  handleUnsubscribeRooms(@ConnectedSocket() client: AuthenticatedSocket): void {
    this.lobbySubscribers.delete(client.id);
  }

  @SubscribeMessage('create:room')
  async handleCreateRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { name: string },
  ): Promise<void> {
    try {
      if (client.user.isGuest) {
        client.emit('room:error', { message: 'Guests cannot create rooms' });
        return;
      }
      const room = await this.roomService.createRoom(client.user.uid, client.user.displayName, data.name);
      client.join(`room:${room.id}`);
      client.emit('room:update', this.roomService.toClientRoom(room));
      await this.broadcastRoomList();
    } catch (e: any) {
      client.emit('room:error', { message: e.message });
    }
  }

  @SubscribeMessage('join:room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    try {
      if (client.user.isGuest) {
        client.emit('room:error', { message: 'Guests cannot join rooms' });
        return;
      }
      const room = await this.roomService.joinRoom(client.user.uid, client.user.displayName, data.roomId);
      client.join(`room:${room.id}`);
      this.server.to(`room:${room.id}`).emit('room:update', this.roomService.toClientRoom(room));
      await this.broadcastRoomList();
    } catch (e: any) {
      client.emit('room:error', { message: e.message });
    }
  }

  @SubscribeMessage('leave:room')
  async handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const { room, deleted, roomId } = await this.roomService.leaveRoom(client.user.uid);

    if (roomId) {
      // Leave Socket.IO room BEFORE broadcasting so this client doesn't receive the update
      client.leave(`room:${roomId}`);

      if (deleted) {
        this.server.to(`room:${roomId}`).emit('room:deleted', { roomId });
        this.timerService.clearTimer(roomId);
      } else if (room) {
        this.server.to(`room:${roomId}`).emit('room:update', this.roomService.toClientRoom(room));
      }
      await this.broadcastRoomList();
    }
  }

  @SubscribeMessage('start:game')
  async handleStartGame(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { length: number },
  ): Promise<void> {
    try {
      const room = await this.roomService.startGame(client.user.uid, data.length);
      this.server.to(`room:${room.id}`).emit('room:update', this.roomService.toClientRoom(room));
      this.startTurnTimer(room.id);
      await this.broadcastRoomList();
    } catch (e: any) {
      client.emit('room:error', { message: e.message });
    }
  }

  @SubscribeMessage('make:guess')
  async handleMakeGuess(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { guess: string },
  ): Promise<void> {
    try {
      const { room, isWin } = await this.roomService.makeGuess(client.user.uid, data.guess);
      this.server.to(`room:${room.id}`).emit('room:update', this.roomService.toClientRoom(room));

      if (isWin) {
        this.timerService.clearTimer(room.id);
      } else {
        this.startTurnTimer(room.id);
      }
    } catch (e: any) {
      client.emit('room:error', { message: e.message });
    }
  }

  @SubscribeMessage('restart:game')
  async handleRestartGame(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { length: number },
  ): Promise<void> {
    try {
      const room = await this.roomService.restartGame(client.user.uid, data.length);
      this.server.to(`room:${room.id}`).emit('room:update', this.roomService.toClientRoom(room));
      this.startTurnTimer(room.id);
    } catch (e: any) {
      client.emit('room:error', { message: e.message });
    }
  }

  // === Helpers ===

  private startTurnTimer(roomId: string): void {
    this.timerService.startTurnTimer(roomId, this.server, async () => {
      const room = await this.roomService.advanceTurn(roomId);
      if (room) {
        this.server.to(`room:${roomId}`).emit('room:update', this.roomService.toClientRoom(room));
        this.startTurnTimer(roomId);
      }
    });
  }

  private async broadcastRoomList(): Promise<void> {
    if (this.lobbySubscribers.size === 0) return;
    const rooms = await this.roomService.getAvailableRooms();
    for (const socketId of this.lobbySubscribers) {
      this.server.to(socketId).emit('room:list', rooms);
    }
  }
}
