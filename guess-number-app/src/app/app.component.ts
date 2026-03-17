import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from './services/game.service';
import { AuthService } from './services/auth.service';
import { LeaderBoardComponent } from './components/leader-board/leader-board.component';
import { PlayerStatsComponent } from './components/player-stats/player-stats.component';
import { LeaderboardEntry } from './models/player-stats';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, LeaderBoardComponent, PlayerStatsComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  game = inject(GameService);
  auth = inject(AuthService);

  lengthInput = signal(4);
  guessInput = signal('');

  // UI state
  showLeaderBoard = signal(false);
  selectedPlayer = signal<LeaderboardEntry | null>(null);

  startGame() {
    if (this.lengthInput() >= 1 && this.lengthInput() <= 10) {
      this.game.startGame(this.lengthInput());
      this.guessInput.set('');
    }
  }

  submitGuess() {
    const guess = this.guessInput();
    if (guess && guess.length === this.game.length()) {
      this.game.makeGuess(guess);
      this.guessInput.set('');
    }
  }

  resetGame() {
    this.game.reset();
  }

  // Auth methods
  async signInWithGoogle() {
    await this.auth.signInWithGoogle();
  }

  async signInAsGuest() {
    await this.auth.signInAsGuest();
  }

  async signOut() {
    await this.auth.signOut();
  }

  // Leaderboard methods
  openLeaderBoard() {
    this.showLeaderBoard.set(true);
  }

  closeLeaderBoard() {
    this.showLeaderBoard.set(false);
  }

  onSelectPlayer(player: LeaderboardEntry) {
    this.selectedPlayer.set(player);
  }

  closePlayerStats() {
    this.selectedPlayer.set(null);
  }
}
