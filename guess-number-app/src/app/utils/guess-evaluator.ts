export interface EvaluationResult {
  greenLights: number;
  yellowLights: number;
}

export function evaluateGuess(guess: string, target: string): EvaluationResult {
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

  return {
    greenLights: positionsRight,
    yellowLights: numbersRight - positionsRight
  };
}
