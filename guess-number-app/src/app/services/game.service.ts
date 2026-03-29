import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { evaluateGuess, generateRandomNumber } from '../../common/utils/guess-evaluator';

export type GameState = 'menu' | 'playing' | 'gameover';

export interface GuessResult {
    guess: string;
    greenLights: number;
    yellowLights: number;
}

@Injectable({
    providedIn: 'root'
})
export class GameService {
    private api = inject(ApiService);
    private auth = inject(AuthService);

    state = signal<GameState>('menu');
    targetNumber = signal<string>('');
    length = signal<number>(4);
    history = signal<GuessResult[]>([]);

    startGame(length: number) {
        this.length.set(length);
        this.targetNumber.set(generateRandomNumber(length));
        this.history.set([]);
        this.state.set('playing');
    }

    makeGuess(guess: string) {
        if (guess.length !== this.length() || this.state() !== 'playing') return;

        const target = this.targetNumber();
        const { greenLights, yellowLights } = evaluateGuess(guess, target);

        const result: GuessResult = { guess, greenLights, yellowLights };
        this.history.update(h => [result, ...h]);

        if (greenLights === this.length()) {
            this.state.set('gameover');
            this.saveGameResult();
        }
    }

    private async saveGameResult(): Promise<void> {
        if (this.auth.isLoggedIn()) {
            try {
                await this.api.saveGameResult(this.length(), this.history().length);
            } catch (error) {
                console.error('Error saving game result:', error);
            }
        }
    }

    reset() {
        this.state.set('menu');
    }
}
