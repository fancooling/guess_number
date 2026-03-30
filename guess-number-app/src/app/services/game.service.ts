import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';
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
    private analytics = inject(AnalyticsService);

    state = signal<GameState>('menu');
    targetNumber = signal<string>('');
    digits = signal<number>(4);
    history = signal<GuessResult[]>([]);

    startGame(length: number) {
        this.digits.set(length);
        this.targetNumber.set(generateRandomNumber(length));
        this.history.set([]);
        this.state.set('playing');
        this.analytics.event('start_game', { digits: length });
    }

    makeGuess(guess: string) {
        if (guess.length !== this.digits() || this.state() !== 'playing') return;

        const target = this.targetNumber();
        const { greenLights, yellowLights } = evaluateGuess(guess, target);

        const result: GuessResult = { guess, greenLights, yellowLights };
        this.history.update(h => [result, ...h]);
        this.analytics.event('make_guess', { digits: this.digits(), step: this.history().length, green_lights: greenLights, yellow_lights: yellowLights });

        if (greenLights === this.digits()) {
            this.state.set('gameover');
            this.analytics.event('finish_game', { digits: this.digits(), steps: this.history().length });
            this.saveGameResult();
        }
    }

    private async saveGameResult(): Promise<void> {
        if (this.auth.isLoggedIn()) {
            try {
                await this.api.saveGameResult(this.digits(), this.history().length);
            } catch (error) {
                console.error('Error saving game result:', error);
            }
        }
    }

    reset() {
        this.state.set('menu');
    }
}
