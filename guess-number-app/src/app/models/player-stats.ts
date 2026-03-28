export interface LengthStats {
  wins: number;
  totalGuesses: number;
}

export interface PlayerStats {
  uid: string;
  displayName: string;
  stats: {
    [key: number]: LengthStats;
  };
  totalWins: number;
  roomWins: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  totalWins: number;
  roomWins: number;
  stats: {
    [key: number]: LengthStats;
  };
}
