import { describe, expect, it } from 'vitest';
import { levels } from '../src/data/levels';
import { calculateBakingAward, isBakingStationResult } from '../src/game/baking';

describe('baking station helpers', () => {
  it('validates baking result payloads before scoring', () => {
    expect(isBakingStationResult({ mistakes: 0, perfect: true })).toBe(true);
    expect(isBakingStationResult({ mistakes: 2, perfect: false })).toBe(true);
    expect(isBakingStationResult({ mistakes: -1, perfect: false })).toBe(false);
    expect(isBakingStationResult({ mistakes: 0 })).toBe(false);
    expect(isBakingStationResult(null)).toBe(false);
  });

  it('awards base plus perfect bonus only for perfect bakes', () => {
    const station = levels[1].bakingStations[0];

    expect(calculateBakingAward(station, { mistakes: 0, perfect: true })).toBe(
      station.value + station.perfectBonus
    );
    expect(calculateBakingAward(station, { mistakes: 1, perfect: false })).toBe(station.value);
  });
});
