import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { RoomService } from './room.service';
import { RoomTimerService } from './room-timer.service';
import { AuthModule } from '../auth/auth.module';
import { PlayerModule } from '../player/player.module';
import { GameModule } from '../game/game.module';

@Module({
  imports: [AuthModule, PlayerModule, GameModule],
  providers: [RoomGateway, RoomService, RoomTimerService],
})
export class RoomModule {}
