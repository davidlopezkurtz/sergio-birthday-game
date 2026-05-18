import type { BakingStationDefinition, BakingStationResult } from '../types';

export const isBakingStationResult = (value: unknown): value is BakingStationResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as {
    mistakes?: unknown;
    perfect?: unknown;
    multiplier?: unknown;
    mathCorrect?: unknown;
    mathAttempts?: unknown;
  };

  return (
    Number.isInteger(result.mistakes) &&
    typeof result.mistakes === 'number' &&
    result.mistakes >= 0 &&
    typeof result.perfect === 'boolean' &&
    typeof result.multiplier === 'number' &&
    Number.isFinite(result.multiplier) &&
    result.multiplier >= 1 &&
    result.multiplier <= 3 &&
    Number.isInteger(result.mathCorrect) &&
    typeof result.mathCorrect === 'number' &&
    result.mathCorrect >= 0 &&
    Number.isInteger(result.mathAttempts) &&
    typeof result.mathAttempts === 'number' &&
    result.mathAttempts >= result.mathCorrect
  );
};

export const calculateBakingAward = (
  station: BakingStationDefinition,
  result: BakingStationResult
): number => station.value + (result.perfect ? station.perfectBonus : 0);

export const calculateBakeMultiplier = (recipeMistakes: number, mathCorrect: boolean): number => {
  const totalMisses = Math.max(0, recipeMistakes) + (mathCorrect ? 0 : 1);

  if (totalMisses === 0) {
    return 2;
  }

  if (totalMisses === 1) {
    return 1.5;
  }

  return 1.2;
};
