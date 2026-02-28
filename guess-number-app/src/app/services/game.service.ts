import { Injectable, signal } from '@angular/core';

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
        let positionsRight = 0;
        let numbersRight = 0;

        const targetCounts = new Map<string, number>();
        const guessCounts = new Map<string, number>();

        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === target[i]) {
                positionsRight++;
            }
            targetCounts.set(target[i], (targetCounts.get(target[i]) || 0) + 1);
            guessCounts.set(guess[i], (guessCounts.get(guess[i]) || 0) + 1);
        }

        for (const [char, count] of guessCounts.entries()) {
            if (targetCounts.has(char)) {
                numbersRight += Math.min(count, targetCounts.get(char)!);
            }
        }

        const greenLights = positionsRight;
        const yellowLights = numbersRight - positionsRight;

        const result: GuessResult = { guess, greenLights, yellowLights };
        this.history.update(h => [result, ...h]);

        if (greenLights === this.length()) {
            this.state.set('gameover');
        }
    }

    reset() {
        this.state.set('menu');
    }
}
