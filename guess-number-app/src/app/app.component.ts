import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  game = inject(GameService);

  lengthInput = signal(4);
  guessInput = signal('');

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
}
