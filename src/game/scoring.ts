import type { LevelDefinition, ScoreSummary } from '../types';

export const MATH_WRONG_PENALTY_MS = 3000;
export const OBSTACLE_HIT_PENALTY_MS = 2000;
export const FINISH_LEVEL_POINTS = 1000;
export const OBSTACLE_CLEAR_POINTS = 150;
export const FIRST_TRY_MATH_POINTS = 400;
export const RETRY_MATH_POINTS = 150;
export const NO_HIT_BONUS_POINTS = 750;
export const ALL_MATH_FIRST_TRY_BONUS_POINTS = 750;
export const OBSTACLE_HIT_PENALTY_POINTS = 100;
export const MAX_TIME_BONUS_POINTS = 500;

export interface ScoreInput {
  level: LevelDefinition;
  activeElapsedMs: number;
  mathCorrect: number;
  mathAttempts: number;
  hintsUsed: number;
  obstacleHits: number;
  completed: boolean;
  obstacleClears?: number;
  thrustersCollected?: number;
  totalThrusters?: number;
  maxCombo?: number;
  obstaclePoints?: number;
  thrusterPoints?: number;
  mathPoints?: number;
  bakingPoints?: number;
  bakingPerfect?: number;
  bakingStationsCompleted?: number;
  totalBakingStations?: number;
  comboBonus?: number;
  penaltyPoints?: number;
}

export interface ScoreLedgerInput {
  obstaclePoints?: number;
  thrusterPoints?: number;
  mathPoints?: number;
  bakingPoints?: number;
  comboBonus?: number;
  finishBonus?: number;
  noHitBonus?: number;
  mathStreakBonus?: number;
  timeBonus?: number;
  penaltyPoints?: number;
}

export const calculateScoreFromLedger = (input: ScoreLedgerInput): number =>
  Math.max(
    0,
    (input.obstaclePoints ?? 0) +
      (input.thrusterPoints ?? 0) +
      (input.mathPoints ?? 0) +
      (input.bakingPoints ?? 0) +
      (input.comboBonus ?? 0) +
      (input.finishBonus ?? 0) +
      (input.noHitBonus ?? 0) +
      (input.mathStreakBonus ?? 0) +
      (input.timeBonus ?? 0) -
      (input.penaltyPoints ?? 0)
  );

export const calculateAppliedPenalty = (currentScore: number, requestedPenalty: number): number =>
  Math.min(Math.max(0, currentScore), Math.max(0, requestedPenalty));

export const calculateStars = (summary: Omit<ScoreSummary, 'stars'>, level: LevelDefinition): number => {
  if (!summary.completed) {
    return 0;
  }

  if (summary.score >= level.targetScore) {
    return 3;
  }

  if (summary.score >= level.targetScore * 0.7) {
    return 2;
  }

  return 1;
};

export const buildScoreSummary = (input: ScoreInput): ScoreSummary => {
  const penaltyMs =
    Math.max(0, input.mathAttempts - input.mathCorrect) * MATH_WRONG_PENALTY_MS +
    input.obstacleHits * OBSTACLE_HIT_PENALTY_MS;
  const mathWasPerfect = input.mathCorrect > 0 && input.mathAttempts === input.mathCorrect;
  const finishBonus = input.completed ? FINISH_LEVEL_POINTS : 0;
  const noHitBonus = input.completed && input.obstacleHits === 0 ? NO_HIT_BONUS_POINTS : 0;
  const mathStreakBonus = input.completed && mathWasPerfect ? ALL_MATH_FIRST_TRY_BONUS_POINTS : 0;
  const timeBonus = input.completed ? calculateTimeBonus(input.activeElapsedMs, input.level) : 0;
  const obstaclePoints = input.obstaclePoints ?? 0;
  const thrusterPoints = input.thrusterPoints ?? 0;
  const mathPoints = input.mathPoints ?? 0;
  const bakingPoints = input.bakingPoints ?? 0;
  const comboBonus = input.comboBonus ?? 0;
  const penaltyPoints = input.penaltyPoints ?? input.obstacleHits * OBSTACLE_HIT_PENALTY_POINTS;
  const score = calculateScoreFromLedger({
    obstaclePoints,
    thrusterPoints,
    mathPoints,
    bakingPoints,
    comboBonus,
    finishBonus,
    noHitBonus,
    mathStreakBonus,
    timeBonus,
    penaltyPoints
  });

  const partial: Omit<ScoreSummary, 'stars'> = {
    levelId: input.level.id,
    levelTitle: input.level.title,
    completed: input.completed,
    score,
    targetScore: input.level.targetScore,
    elapsedMs: Math.round(input.activeElapsedMs + penaltyMs),
    penaltyMs,
    mathCorrect: input.mathCorrect,
    mathAttempts: input.mathAttempts,
    hintsUsed: input.hintsUsed,
    obstacleHits: input.obstacleHits,
    obstacleClears: input.obstacleClears ?? 0,
    thrustersCollected: input.thrustersCollected ?? 0,
    totalThrusters: input.totalThrusters ?? input.level.pointThrusters.length,
    maxCombo: input.maxCombo ?? 0,
    obstaclePoints,
    thrusterPoints,
    mathPoints,
    bakingPoints,
    bakingPerfect: input.bakingPerfect ?? 0,
    bakingStationsCompleted: input.bakingStationsCompleted ?? 0,
    totalBakingStations: input.totalBakingStations ?? input.level.bakingStations.length,
    comboBonus,
    finishBonus,
    noHitBonus,
    mathStreakBonus,
    timeBonus,
    penaltyPoints
  };

  return {
    ...partial,
    stars: calculateStars(partial, input.level)
  };
};

export const calculateTimeBonus = (activeElapsedMs: number, level: LevelDefinition): number => {
  if (activeElapsedMs <= 0 || activeElapsedMs >= level.targetTimeMs) {
    return 0;
  }

  const remainingRatio = 1 - activeElapsedMs / level.targetTimeMs;

  return Math.round(MAX_TIME_BONUS_POINTS * remainingRatio);
};

export const formatScore = (score: number): string => Math.round(score).toLocaleString('en-US');

export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
