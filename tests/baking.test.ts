import { describe, expect, it } from 'vitest';
import { calculateBakeMultiplier, calculateBakingAward, isBakingStationResult } from '../src/game/baking';
import type { BakingStationDefinition, BakingStationResult } from '../src/types';

const station: BakingStationDefinition = {
  id: 'test-bake',
  x: 0,
  label: 'Test Bake',
  recipe: ['frosting', 'sprinkles', 'berry'],
  value: 500,
  perfectBonus: 250
};

const result = (overrides: Partial<BakingStationResult> = {}): BakingStationResult => ({
  mistakes: 0,
  perfect: true,
  multiplier: 2,
  mathCorrect: 1,
  mathAttempts: 1,
  ...overrides
});

describe('baking station helpers', () => {
  it('validates baking result payloads before scoring', () => {
    expect(isBakingStationResult(result())).toBe(true);
    expect(isBakingStationResult(result({ mistakes: 2, perfect: false, multiplier: 1.2, mathCorrect: 0 }))).toBe(true);
    expect(isBakingStationResult(result({ mistakes: -1, perfect: false }))).toBe(false);
    expect(isBakingStationResult({ mistakes: 0, perfect: true })).toBe(false);
    expect(isBakingStationResult(null)).toBe(false);
  });

  it('awards base plus perfect bonus only for perfect bakes', () => {
    expect(calculateBakingAward(station, result())).toBe(station.value + station.perfectBonus);
    expect(calculateBakingAward(station, result({ mistakes: 1, perfect: false, multiplier: 1.5 }))).toBe(station.value);
  });

  it('converts recipe and ingredient math misses into score multipliers', () => {
    expect(calculateBakeMultiplier(0, true)).toBe(2);
    expect(calculateBakeMultiplier(1, true)).toBe(1.5);
    expect(calculateBakeMultiplier(0, false)).toBe(1.5);
    expect(calculateBakeMultiplier(2, false)).toBe(1.2);
  });
});
