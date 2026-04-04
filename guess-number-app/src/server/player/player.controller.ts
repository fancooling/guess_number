import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('players')
export class PlayerController {
  constructor(private playerService: PlayerService) {}

  @Get('leaderboard')
  async getLeaderboard() {
    return this.playerService.getLeaderboard();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    const { uid } = req.user;
    const stats = await this.playerService.getPlayerStats(uid);
    if (!stats) throw new NotFoundException('Player not found');
    return { displayName: stats.displayName, joinLeaderboard: stats.joinLeaderboard };
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: any,
    @Body() body: { displayName: string; joinLeaderboard: boolean },
  ) {
    const { uid } = req.user;
    const name = body.displayName?.trim();
    if (!name || name.length > 20) {
      throw new NotFoundException('Display name must be 1-20 characters');
    }
    await this.playerService.updateProfile(uid, { displayName: name, joinLeaderboard: body.joinLeaderboard });
    return { ok: true, displayName: name, joinLeaderboard: body.joinLeaderboard };
  }

  @Get(':uid')
  async getPlayerStats(@Param('uid') uid: string) {
    const stats = await this.playerService.getPlayerStats(uid);
    if (!stats) throw new NotFoundException('Player not found');
    return stats;
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() req: any) {
    const { uid } = req.user;
    await this.playerService.deleteAccount(uid);
    return { ok: true };
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
