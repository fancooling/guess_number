import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { PlayerStats, LeaderboardEntry, LengthStats } from '../../common/types/player';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private _leaderboard = signal<LeaderboardEntry[]>([]);
  leaderboard = this._leaderboard.asReadonly();

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  async updateDisplayName(displayName: string): Promise<string> {
    const result = await firstValueFrom(
      this.http.post<{ ok: boolean; displayName: string }>('/api/players/display-name', { displayName }, { headers: this.getHeaders() })
    );
    return result.displayName;
  }

  async saveGameResult(length: number, guessCount: number): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/players/game-result', { length, guessCount }, { headers: this.getHeaders() })
    );
    await this.loadLeaderboard();
  }

  async loadLeaderboard(): Promise<void> {
    try {
      const entries = await firstValueFrom(
        this.http.get<LeaderboardEntry[]>('/api/players/leaderboard')
      );
      this._leaderboard.set(entries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }

  async getPlayerStats(uid: string): Promise<LeaderboardEntry | null> {
    try {
      return await firstValueFrom(
        this.http.get<LeaderboardEntry>(`/api/players/${uid}`)
      );
    } catch {
      return null;
    }
  }

  getAverageGuesses(stats: { [key: number]: LengthStats }, length: number): number | null {
    const lengthStats = stats[length];
    if (!lengthStats || lengthStats.wins === 0) return null;
    return Math.round((lengthStats.totalGuesses / lengthStats.wins) * 10) / 10;
  }
}
