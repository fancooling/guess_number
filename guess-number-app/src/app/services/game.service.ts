import { Injectable, inject, signal } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { evaluateGuess } from '../utils/guess-evaluator';

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
    private firestore = inject(FirestoreService);
    private auth = inject(AuthService);

    state = signal<GameState>('menu');
    targetNumber = signal<string>('');
    length = signal<number>(4);
    history = signal<GuessResult[]>([]);

    startGame(length: number) {
        this.length.set(length);
        this.targetNumber.set(this.generateRandomNumber(length));
        this.history.set([]);
        this.state.set('playing');
    }

    generateRandomNumber(length: number): string {
        const digits: number[] = [];
        while (digits.length < length) {
            const d = Math.floor(Math.random() * 10);
            if (!digits.includes(d)) {
                digits.push(d);
            }
        }
        return digits.join('');
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
        const userId = this.auth.getUserId();
        console.log('Saving game result - userId:', userId, 'isLoggedIn:', this.auth.isLoggedIn());
        if (userId) {
            try {
                await this.firestore.saveGameResult(
                    userId,
                    this.auth.displayName(),
                    this.length(),
                    this.history().length
                );
                console.log('Game result saved successfully');
            } catch (error) {
                console.error('Error saving game result:', error);
            }
        }
    }

    reset() {
        this.state.set('menu');
    }
}
