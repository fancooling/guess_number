import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PlayerStats, LeaderboardEntry, LengthStats } from '../../common/types/player';

@Injectable()
export class PlayerService {
  constructor(private redis: RedisService) {}

  async saveGameResult(uid: string, displayName: string, length: number, guessCount: number, isRoomWin = false): Promise<void> {
    const key = `player:${uid}`;
    const exists = await this.redis.exists(key);

    if (exists) {
      const rawStats = await this.redis.hget(key, 'stats');
      const stats: { [key: number]: LengthStats } = rawStats
        ? JSON.parse(rawStats)
        : { 3: { wins: 0, totalGuesses: 0 }, 4: { wins: 0, totalGuesses: 0 }, 5: { wins: 0, totalGuesses: 0 } };

      if (!stats[length]) {
        stats[length] = { wins: 0, totalGuesses: 0 };
      }
      stats[length].wins += 1;
      stats[length].totalGuesses += guessCount;

      const totalWins = Object.values(stats).reduce((sum, s) => sum + s.wins, 0);

      await this.redis.hset(key, 'stats', JSON.stringify(stats));
      await this.redis.hset(key, 'totalWins', String(totalWins));

      if (isRoomWin) {
        await this.redis.hincrby(key, 'roomWins', 1);
      }

      await this.redis.zadd('leaderboard', totalWins, uid);
    } else {
      const stats: { [key: number]: LengthStats } = {
        3: { wins: 0, totalGuesses: 0 },
        4: { wins: 0, totalGuesses: 0 },
        5: { wins: 0, totalGuesses: 0 },
      };
      stats[length] = { wins: 1, totalGuesses: guessCount };

      await this.redis.hmset(key, {
        displayName,
        totalWins: '1',
        roomWins: isRoomWin ? '1' : '0',
        stats: JSON.stringify(stats),
      });

      await this.redis.zadd('leaderboard', 1, uid);
    }
  }

  async getPlayerStats(uid: string): Promise<PlayerStats | null> {
    const data = await this.redis.hgetall(`player:${uid}`);
    if (!data || !data['displayName']) return null;

    return {
      uid,
      displayName: data['displayName'],
      totalWins: parseInt(data['totalWins'] || '0', 10),
      roomWins: parseInt(data['roomWins'] || '0', 10),
      stats: data['stats'] ? JSON.parse(data['stats']) : {},
    };
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const topUids = await this.redis.zrevrangeWithScores('leaderboard', 0, 99);
    const entries: LeaderboardEntry[] = [];

    for (const { member: uid } of topUids) {
      const stats = await this.getPlayerStats(uid);
      if (stats) {
        entries.push(stats);
      }
    }

    return entries;
  }

  async updateDisplayName(uid: string, displayName: string): Promise<void> {
    const key = `player:${uid}`;
    await this.redis.hset(key, 'displayName', displayName);
  }

  getAverageGuesses(stats: { [key: number]: LengthStats }, length: number): number | null {
    const lengthStats = stats[length];
    if (!lengthStats || lengthStats.wins === 0) return null;
    return Math.round((lengthStats.totalGuesses / lengthStats.wins) * 10) / 10;
  }
}
