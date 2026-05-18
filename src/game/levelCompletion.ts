import type { BakingStationResult, LevelDefinition, ScoreSummary } from '../types';
import { buildScoreSummary, replaceScoreSummary } from './scoring';

export interface LevelCompletionSnapshot {
  level: LevelDefinition;
  activeElapsedMs: number;
  hintsUsed: number;
  obstacleHits: number;
  obstacleClears: number;
  thrustersCollected: number;
  totalThrusters: number;
  maxCombo: number;
  obstaclePoints: number;
  thrusterPoints: number;
  mathPoints: number;
  comboBonus: number;
  penaltyPoints: number;
  actionScore: number;
}

export const fallbackBakeOffResult = (): BakingStationResult => ({
  mistakes: 1,
  perfect: false,
  multiplier: 1,
  mathCorrect: 0,
  mathAttempts: 1
});

export const buildLevelCompletionSummary = (
  snapshot: LevelCompletionSnapshot,
  result: BakingStationResult
): ScoreSummary => {
  const bakingPoints = Math.max(0, Math.round(snapshot.actionScore * (result.multiplier - 1)));

  return buildScoreSummary({
    level: snapshot.level,
    activeElapsedMs: snapshot.activeElapsedMs,
    mathCorrect: result.mathCorrect,
    mathAttempts: result.mathAttempts,
    hintsUsed: snapshot.hintsUsed,
    obstacleHits: snapshot.obstacleHits,
    obstacleClears: snapshot.obstacleClears,
    thrustersCollected: snapshot.thrustersCollected,
    totalThrusters: snapshot.totalThrusters,
    maxCombo: snapshot.maxCombo,
    obstaclePoints: snapshot.obstaclePoints,
    thrusterPoints: snapshot.thrusterPoints,
    mathPoints: snapshot.mathPoints,
    bakingPoints,
    bakingPerfect: result.perfect ? 1 : 0,
    bakingStationsCompleted: 1,
    totalBakingStations: 1,
    comboBonus: snapshot.comboBonus,
    penaltyPoints: snapshot.penaltyPoints,
    completed: true
  });
};

export const buildFallbackLevelCompletionSummary = (snapshot: LevelCompletionSnapshot): ScoreSummary =>
  buildLevelCompletionSummary(snapshot, fallbackBakeOffResult());

export const upsertLevelCompletionSummary = (summaries: ScoreSummary[], summary: ScoreSummary): ScoreSummary[] =>
  replaceScoreSummary(summaries, summary);
