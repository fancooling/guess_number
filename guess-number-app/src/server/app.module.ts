import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { PlayerModule } from './player/player.module';
import { GameModule } from './game/game.module';
import { RoomModule } from './room/room.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
    }),
    RedisModule,
    AuthModule,
    PlayerModule,
    GameModule,
    RoomModule,
  ],
})
export class AppModule {}
