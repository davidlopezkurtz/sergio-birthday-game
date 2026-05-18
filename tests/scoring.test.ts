import { describe, expect, it } from 'vitest';
import { levels } from '../src/data/levels';
import {
  buildScoreSummary,
  calculateAppliedPenalty,
  calculateScoreFromLedger,
  calculateStars,
  formatScore,
  formatTime,
  replaceScoreSummary,
  uniqueScoreSummaries
} from '../src/game/scoring';

describe('scoring', () => {
  it('awards three stars for a score above the target', () => {
    const level = levels[0];
    const summary = buildScoreSummary({
      level,
      activeElapsedMs: level.targetTimeMs - 5000,
      mathCorrect: 3,
      mathAttempts: 3,
      hintsUsed: 0,
      obstacleHits: 0,
      completed: true,
      obstaclePoints: 750,
      thrusterPoints: 1600,
      mathPoints: 1200,
      comboBonus: 2000,
      penaltyPoints: 0
    });

    expect(summary.stars).toBe(3);
    expect(summary.score).toBeGreaterThanOrEqual(level.targetScore);
  });

  it('keeps time secondary while adding penalty time and point penalties', () => {
    const level = levels[0];
    const summary = buildScoreSummary({
      level,
      activeElapsedMs: 60000,
      mathCorrect: 2,
      mathAttempts: 4,
      hintsUsed: 2,
      obstacleHits: 1,
      completed: true,
      mathPoints: 950,
      penaltyPoints: 100
    });

    expect(summary.penaltyMs).toBe(8000);
    expect(summary.elapsedMs).toBe(68000);
    expect(summary.penaltyPoints).toBe(100);
  });

  it('applies only visible penalty points and avoids hidden negative debt', () => {
    const level = levels[0];

    expect(calculateAppliedPenalty(0, 100)).toBe(0);
    expect(calculateAppliedPenalty(60, 100)).toBe(60);
    expect(calculateScoreFromLedger({ obstaclePoints: 60, penaltyPoints: 60 })).toBe(0);

    const summary = buildScoreSummary({
      level,
      activeElapsedMs: 12000,
      mathCorrect: 0,
      mathAttempts: 0,
      hintsUsed: 0,
      obstacleHits: 1,
      completed: false,
      penaltyPoints: 0
    });

    expect(summary.score).toBe(0);
    expect(summary.penaltyPoints).toBe(0);
    expect(summary.penaltyMs).toBe(2000);
  });

  it('never awards stars for an incomplete run', () => {
    const level = levels[0];
    const summary = {
      levelId: level.id,
      levelTitle: level.title,
      completed: false,
      elapsedMs: 1000,
      penaltyMs: 0,
      mathCorrect: 0,
      mathAttempts: 0,
      hintsUsed: 0,
      obstacleHits: 0,
      obstacleClears: 0,
      thrustersCollected: 0,
      totalThrusters: 0,
      maxCombo: 0,
      obstaclePoints: 0,
      thrusterPoints: 0,
      mathPoints: 0,
      bakingPoints: 0,
      bakingPerfect: 0,
      bakingStationsCompleted: 0,
      totalBakingStations: 0,
      comboBonus: 0,
      finishBonus: 0,
      noHitBonus: 0,
      mathStreakBonus: 0,
      timeBonus: 0,
      penaltyPoints: 0,
      score: 0,
      targetScore: level.targetScore
    };

    expect(calculateStars(summary, level)).toBe(0);
  });

  it('awards two stars for reaching seventy percent of the target score', () => {
    const level = levels[0];
    const summary = buildScoreSummary({
      level,
      activeElapsedMs: level.targetTimeMs,
      mathCorrect: 2,
      mathAttempts: 3,
      hintsUsed: 1,
      obstacleHits: 1,
      completed: true,
      thrusterPoints: Math.ceil(level.targetScore * 0.7) - 1000,
      penaltyPoints: 0
    });

    expect(summary.stars).toBe(2);
  });

  it('adds baking station points into the score summary', () => {
    const level = levels[1];
    const summary = buildScoreSummary({
      level,
      activeElapsedMs: level.targetTimeMs,
      mathCorrect: 1,
      mathAttempts: 1,
      hintsUsed: 0,
      obstacleHits: 0,
      completed: false,
      bakingPoints: 850,
      bakingPerfect: 1,
      bakingStationsCompleted: 1,
      totalBakingStations: 1
    });

    expect(summary.bakingPoints).toBe(850);
    expect(summary.bakingPerfect).toBe(1);
    expect(summary.bakingStationsCompleted).toBe(1);
    expect(summary.totalBakingStations).toBe(1);
    expect(summary.score).toBe(850);
  });

  it('formats time as minutes and padded seconds', () => {
    expect(formatTime(68000)).toBe('1:08');
  });

  it('formats score with thousands separators', () => {
    expect(formatScore(8750)).toBe('8,750');
  });

  it('replaces replayed level summaries instead of duplicating final totals', () => {
    const firstAttempt = buildScoreSummary({
      level: levels[0],
      activeElapsedMs: levels[0].targetTimeMs,
      mathCorrect: 1,
      mathAttempts: 2,
      hintsUsed: 1,
      obstacleHits: 1,
      completed: true,
      thrusterPoints: 1000,
      penaltyPoints: 100
    });
    const acceptedAttempt = buildScoreSummary({
      level: levels[0],
      activeElapsedMs: levels[0].targetTimeMs - 10000,
      mathCorrect: 3,
      mathAttempts: 3,
      hintsUsed: 0,
      obstacleHits: 0,
      completed: true,
      thrusterPoints: 1800,
      mathPoints: 1200,
      penaltyPoints: 0
    });
    const levelTwo = buildScoreSummary({
      level: levels[1],
      activeElapsedMs: levels[1].targetTimeMs,
      mathCorrect: 1,
      mathAttempts: 1,
      hintsUsed: 0,
      obstacleHits: 0,
      completed: true,
      bakingPoints: 850,
      penaltyPoints: 0
    });

    const summaries = replaceScoreSummary(replaceScoreSummary([firstAttempt, levelTwo], acceptedAttempt), levelTwo);

    expect(summaries).toHaveLength(2);
    expect(summaries.find((summary) => summary.levelId === levels[0].id)?.score).toBe(acceptedAttempt.score);
    expect(uniqueScoreSummaries([firstAttempt, levelTwo, acceptedAttempt])).toHaveLength(2);
  });
});
