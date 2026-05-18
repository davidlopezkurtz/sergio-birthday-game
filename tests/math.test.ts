import { describe, expect, it } from 'vitest';
import { generateProblem } from '../src/game/math';
import type { MathCategory } from '../src/types';

const seededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

describe('generateProblem', () => {
  it.each<MathCategory>(['addSub', 'multiplyDivide', 'compareFraction'])(
    'creates four answer choices for %s',
    (category) => {
      const problem = generateProblem(category, seededRandom(7));
      const labels = problem.displayChoices ?? problem.choices.map(String);

      expect(labels).toHaveLength(4);
      expect(new Set(labels).size).toBe(4);
    }
  );

  it('keeps add/subtract answers in the provided choices', () => {
    const problem = generateProblem('addSub', seededRandom(21));

    expect(problem.choices).toContain(problem.correctAnswer);
  });

  it('keeps multiplication/division answers in the provided choices', () => {
    const problem = generateProblem('multiplyDivide', seededRandom(32));

    expect(problem.choices).toContain(problem.correctAnswer);
    expect(problem.correctAnswer).toBeGreaterThan(0);
  });

  it('formats comparison and fraction prompts for tablet answer buttons', () => {
    const problem = generateProblem('compareFraction', seededRandom(3));
    const labels = problem.displayChoices ?? problem.choices.map(String);

    expect(problem.prompt.length).toBeGreaterThan(10);
    expect(labels.every((label) => label.length > 0)).toBe(true);
  });
});
