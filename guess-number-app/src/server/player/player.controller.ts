import { Controller, Get, Post, Param, Body, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('players')
export class PlayerController {
  constructor(private playerService: PlayerService) {}

  @Get('leaderboard')
  async getLeaderboard() {
    return this.playerService.getLeaderboard();
  }

  @Get(':uid')
  async getPlayerStats(@Param('uid') uid: string) {
    const stats = await this.playerService.getPlayerStats(uid);
    if (!stats) throw new NotFoundException('Player not found');
    return stats;
  }

  @Post('game-result')
  @UseGuards(JwtAuthGuard)
  async saveGameResult(
    @Req() req: any,
    @Body() body: { length: number; guessCount: number },
  ) {
    const { uid, displayName } = req.user;
    await this.playerService.saveGameResult(uid, displayName, body.length, body.guessCount);
    return { ok: true };
  }
}
