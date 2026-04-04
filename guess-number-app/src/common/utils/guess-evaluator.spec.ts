import { evaluateGuess, generateRandomNumber } from './guess-evaluator';

describe('evaluateGuess', () => {
  it('returns all green for exact match', () => {
    expect(evaluateGuess('1234', '1234')).toEqual({ greenLights: 4, yellowLights: 0 });
  });

  it('returns all yellow when digits correct but positions wrong', () => {
    expect(evaluateGuess('4321', '1234')).toEqual({ greenLights: 0, yellowLights: 4 });
  });

  it('returns zero for completely wrong guess', () => {
    expect(evaluateGuess('5678', '1234')).toEqual({ greenLights: 0, yellowLights: 0 });
  });

  it('returns mix of green and yellow', () => {
    // 1 is green (pos 0), 2 is yellow (exists but wrong pos)
    expect(evaluateGuess('1243', '1234')).toEqual({ greenLights: 2, yellowLights: 2 });
  });

  it('handles partial matches correctly', () => {
    // target=1234, guess=1235: 1,2,3 are green, 5 is wrong
    expect(evaluateGuess('1235', '1234')).toEqual({ greenLights: 3, yellowLights: 0 });
  });

  it('handles duplicate digits in guess against unique target', () => {
    // target=1234, guess=1123: 1 green (pos 0), 2 yellow, 3 yellow; second 1 has no match
    expect(evaluateGuess('1123', '1234')).toEqual({ greenLights: 1, yellowLights: 2 });
  });

  it('works with 3-digit numbers', () => {
    expect(evaluateGuess('123', '123')).toEqual({ greenLights: 3, yellowLights: 0 });
    expect(evaluateGuess('321', '123')).toEqual({ greenLights: 1, yellowLights: 2 });
  });

  it('works with 5-digit numbers', () => {
    expect(evaluateGuess('12345', '12345')).toEqual({ greenLights: 5, yellowLights: 0 });
  });

  it('handles example from instructions: guess=9235, target=1234', () => {
    // 2,3 are green, 9,5 are wrong
    expect(evaluateGuess('9235', '1234')).toEqual({ greenLights: 2, yellowLights: 0 });
  });

  it('handles example from instructions: guess=5231, target=1234', () => {
    // 2,3 are green, 1 is yellow, 5 is wrong
    expect(evaluateGuess('5231', '1234')).toEqual({ greenLights: 2, yellowLights: 1 });
  });
});

describe('generateRandomNumber', () => {
  it('generates a number with the specified length', () => {
    expect(generateRandomNumber(3)).toHaveLength(3);
    expect(generateRandomNumber(4)).toHaveLength(4);
    expect(generateRandomNumber(5)).toHaveLength(5);
  });

  it('generates only digits', () => {
    const result = generateRandomNumber(4);
    expect(result).toMatch(/^\d+$/);
  });

  it('generates unique digits (no duplicates)', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateRandomNumber(4);
      const unique = new Set(result.split(''));
      expect(unique.size).toBe(4);
    }
  });

  it('generates different numbers on multiple calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(generateRandomNumber(4));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
