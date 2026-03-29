import { Injectable } from '@nestjs/common';
import { evaluateGuess, generateRandomNumber, EvaluationResult } from '../../common/utils/guess-evaluator';

@Injectable()
export class GameService {
  generateNumber(length: number): string {
    return generateRandomNumber(length);
  }

  evaluate(guess: string, target: string): EvaluationResult {
    return evaluateGuess(guess, target);
  }
}
