import type { BakingStationDefinition, BakingStationResult } from '../types';

export const isBakingStationResult = (value: unknown): value is BakingStationResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as { mistakes?: unknown; perfect?: unknown };

  return (
    Number.isInteger(result.mistakes) &&
    typeof result.mistakes === 'number' &&
    result.mistakes >= 0 &&
    typeof result.perfect === 'boolean'
  );
};

export const calculateBakingAward = (
  station: BakingStationDefinition,
  result: BakingStationResult
): number => station.value + (result.perfect ? station.perfectBonus : 0);
