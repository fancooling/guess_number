export interface LengthStats {
  wins: number;
  totalGuesses: number;
}

export interface PlayerStats {
  uid: string;
  displayName: string;
  stats: { [length: number]: LengthStats };
  totalWins: number;
  roomWins: number;
  joinLeaderboard: boolean;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  totalWins: number;
  roomWins: number;
  stats: { [length: number]: LengthStats };
  joinLeaderboard: boolean;
}

export interface PlayerProfile {
  displayName: string;
  joinLeaderboard: boolean;
}
