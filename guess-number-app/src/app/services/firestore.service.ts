import { Injectable, signal } from '@angular/core';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, orderBy, limit, CollectionReference } from 'firebase/firestore';
import { db } from '../firebase.config';
import { PlayerStats, LeaderboardEntry } from '../models/player-stats';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private playersCollection = collection(db, 'players') as CollectionReference<PlayerStats>;

  // Cache for leaderboard
  private _leaderboard = signal<LeaderboardEntry[]>([]);
  leaderboard = this._leaderboard.asReadonly();

  async saveGameResult(userId: string, displayName: string, length: number, guessCount: number): Promise<void> {
    const playerRef = doc(this.playersCollection, userId);
    const playerDoc = await getDoc(playerRef);

    if (playerDoc.exists()) {
      const data = playerDoc.data();
      const stats = data.stats || { 3: { wins: 0, totalGuesses: 0 }, 4: { wins: 0, totalGuesses: 0 }, 5: { wins: 0, totalGuesses: 0 } };

      // Update stats for this length
      if (!stats[length]) {
        stats[length] = { wins: 0, totalGuesses: 0 };
      }
      stats[length].wins += 1;
      stats[length].totalGuesses += guessCount;

      // Calculate total wins
      const totalWins = Object.values(stats).reduce((sum, s) => sum + s.wins, 0);

      await updateDoc(playerRef, {
        stats,
        totalWins,
        displayName: displayName
      });
    } else {
      // Create new player
      const stats: PlayerStats['stats'] = {
        3: { wins: 0, totalGuesses: 0 },
        4: { wins: 0, totalGuesses: 0 },
        5: { wins: 0, totalGuesses: 0 }
      };
      stats[length] = { wins: 1, totalGuesses: guessCount };

      await setDoc(playerRef, {
        uid: userId,
        displayName,
        stats,
        totalWins: 1,
        roomWins: 0
      });
    }

    // Refresh leaderboard
    await this.loadLeaderboard();
  }

  async saveRoomWin(userId: string, displayName: string, length: number, guessCount: number): Promise<void> {
    const playerRef = doc(this.playersCollection, userId);
    const playerDoc = await getDoc(playerRef);

    if (playerDoc.exists()) {
      const data = playerDoc.data();
      const stats = data.stats || { 3: { wins: 0, totalGuesses: 0 }, 4: { wins: 0, totalGuesses: 0 }, 5: { wins: 0, totalGuesses: 0 } };

      if (!stats[length]) {
        stats[length] = { wins: 0, totalGuesses: 0 };
      }
      stats[length].wins += 1;
      stats[length].totalGuesses += guessCount;

      const totalWins = Object.values(stats).reduce((sum, s) => sum + s.wins, 0);
      const roomWins = (data.roomWins || 0) + 1;

      await updateDoc(playerRef, {
        stats,
        totalWins,
        roomWins,
        displayName
      });
    } else {
      const stats: PlayerStats['stats'] = {
        3: { wins: 0, totalGuesses: 0 },
        4: { wins: 0, totalGuesses: 0 },
        5: { wins: 0, totalGuesses: 0 }
      };
      stats[length] = { wins: 1, totalGuesses: guessCount };

      await setDoc(playerRef, {
        uid: userId,
        displayName,
        stats,
        totalWins: 1,
        roomWins: 1
      });
    }

    await this.loadLeaderboard();
  }

  async loadLeaderboard(): Promise<void> {
    console.log('Loading leaderboard...');
    const q = query(this.playersCollection, orderBy('totalWins', 'desc'), limit(100));
    try {
      const snapshot = await getDocs(q);
      console.log('Leaderboard snapshot size:', snapshot.size);
      console.log('Leaderboard docs:', snapshot.docs.map(d => d.data()));

      const entries: LeaderboardEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: data.uid,
          displayName: data.displayName || 'Anonymous',
          totalWins: data.totalWins || 0,
          roomWins: data.roomWins || 0,
          stats: data.stats || { 3: { wins: 0, totalGuesses: 0 }, 4: { wins: 0, totalGuesses: 0 }, 5: { wins: 0, totalGuesses: 0 } }
        };
      });

      this._leaderboard.set(entries);
      console.log('Leaderboard entries set:', entries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }

  async getPlayerStats(uid: string): Promise<LeaderboardEntry | null> {
    const playerRef = doc(this.playersCollection, uid);
    const playerDoc = await getDoc(playerRef);

    if (playerDoc.exists()) {
      const data = playerDoc.data();
      return {
        uid: data.uid,
        displayName: data.displayName || 'Anonymous',
        totalWins: data.totalWins || 0,
        roomWins: data.roomWins || 0,
        stats: data.stats || { 3: { wins: 0, totalGuesses: 0 }, 4: { wins: 0, totalGuesses: 0 }, 5: { wins: 0, totalGuesses: 0 } }
      };
    }
    return null;
  }

  getAverageGuesses(stats: PlayerStats['stats'], length: number): number | null {
    const lengthStats = stats[length];
    if (!lengthStats || lengthStats.wins === 0) return null;
    return Math.round((lengthStats.totalGuesses / lengthStats.wins) * 10) / 10;
  }
}
