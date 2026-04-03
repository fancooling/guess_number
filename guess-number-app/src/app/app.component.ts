import { Component, inject, signal, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { GameService } from './services/game.service';
import { AuthService } from './services/auth.service';
import { ApiService } from './services/api.service';
import { RoomWsService } from './services/room-ws.service';
import { LeaderBoardComponent } from './components/leader-board/leader-board.component';
import { PlayerStatsComponent } from './components/player-stats/player-stats.component';
import { RoomListComponent } from './components/room-list/room-list.component';
import { RoomLobbyComponent } from './components/room-lobby/room-lobby.component';
import { RoomGameComponent } from './components/room-game/room-game.component';
import { LeaderboardEntry } from '../common/types/player';

@Component({
    selector: 'app-root',
    imports: [CommonModule, FormsModule, LeaderBoardComponent, PlayerStatsComponent, RoomListComponent, RoomLobbyComponent, RoomGameComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewChecked {
  game = inject(GameService);
  auth = inject(AuthService);
  api = inject(ApiService);
  roomService = inject(RoomWsService);

  @ViewChild('googleBtn') googleBtn?: ElementRef;

  isNative = Capacitor.isNativePlatform();
  lengthInput = signal(4);
  guessInput = signal('');

  // UI state
  showLeaderBoard = signal(false);
  selectedPlayer = signal<LeaderboardEntry | null>(null);
  showNameEdit = signal(false);
  nameInput = signal('');
  private googleBtnInitialized = false;

  ngAfterViewChecked() {
    if (this.googleBtn && !this.googleBtnInitialized) {
      this.googleBtnInitialized = true;
      this.auth.initGoogleSignIn(this.googleBtn.nativeElement);
    }
    if (!this.googleBtn) {
      this.googleBtnInitialized = false;
    }
  }

  startGame() {
    if (this.lengthInput() >= 1 && this.lengthInput() <= 10) {
      this.game.startGame(this.lengthInput());
      this.guessInput.set('');
    }
  }

  submitGuess() {
    const guess = this.guessInput();
    if (guess && guess.length === this.game.digits()) {
      this.game.makeGuess(guess);
      this.guessInput.set('');
    }
  }

  resetGame() {
    this.game.reset();
  }

  // Auth methods
  async signInAsGuest() {
    await this.auth.signInAsGuest();
  }

  async nativeGoogleSignIn() {
    await this.auth.signInWithGoogleNative();
  }

  signOut() {
    this.auth.signOut();
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

  // Display name methods
  openNameEdit() {
    this.nameInput.set(this.auth.displayName());
    this.showNameEdit.set(true);
  }

  async saveDisplayName() {
    const name = this.nameInput().trim();
    if (!name || name.length > 20) return;
    try {
      const savedName = await this.api.updateDisplayName(name);
      this.auth.updateDisplayName(savedName);
      this.showNameEdit.set(false);
      this.auth.dismissNamePrompt();
    } catch (e) {
      console.error('Error updating display name:', e);
    }
  }

  cancelNameEdit() {
    this.showNameEdit.set(false);
    this.auth.dismissNamePrompt();
  }
}
