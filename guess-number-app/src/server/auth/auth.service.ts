import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { RedisService } from '../redis/redis.service';
import { nanoid } from 'nanoid';
import { LoginResponse } from '../../common/types/auth';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private jwt: JwtService,
    private redis: RedisService,
  ) {
    this.googleClient = new OAuth2Client(process.env['GOOGLE_CLIENT_ID']);
  }

  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env['GOOGLE_CLIENT_ID'],
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      throw new Error('Invalid Google token');
    }

    const uid = payload.sub;
    let displayName = payload.name || payload.email || 'Player';

    // Create/update player in Redis
    const playerKey = `player:${uid}`;
    const exists = await this.redis.exists(playerKey);
    const isNewPlayer = !exists;
    if (!exists) {
      await this.redis.hmset(playerKey, {
        displayName,
        totalWins: '0',
        roomWins: '0',
        stats: JSON.stringify({ 3: { wins: 0, totalGuesses: 0 }, 4: { wins: 0, totalGuesses: 0 }, 5: { wins: 0, totalGuesses: 0 } }),
      });
    } else {
      // Use existing display name from Redis (player may have customized it)
      const savedName = await this.redis.hget(playerKey, 'displayName');
      if (savedName) {
        displayName = savedName;
      }
    }

    const token = this.jwt.sign({ uid, displayName, isGuest: false });
    return {
      token,
      user: { uid, displayName, authState: 'authenticated', isNewPlayer },
    };
  }

  async loginAsGuest(): Promise<LoginResponse> {
    const uid = `guest_${nanoid()}`;
    const displayName = 'Guest';

    const token = this.jwt.sign({ uid, displayName, isGuest: true });
    return {
      token,
      user: { uid, displayName, authState: 'guest' },
    };
  }

  verifyToken(token: string): { uid: string; displayName: string; isGuest: boolean } | null {
    try {
      return this.jwt.verify(token) as { uid: string; displayName: string; isGuest: boolean };
    } catch {
      return null;
    }
  }
}
