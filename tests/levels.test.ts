import { describe, expect, it } from 'vitest';
import { assetManifest, courseBackgroundAssetKeys } from '../src/assets/assetManifest';
import { levels } from '../src/data/levels';

const LOW_BARRIER_SURFACE_OFFSET = 142;
const MIN_CRAWL_RUNWAY_FROM_LADDER = 260;
const MIN_POWER_BADGE_DISTANCE_FROM_FINISH_Y = 150;

describe('level authoring', () => {
  it('places explicit power badges before each power obstacle', () => {
    for (const level of levels) {
      expect(level.powerBadges.length).toBeGreaterThan(0);
      expect(new Set(level.powerBadges.map((badge) => badge.id)).size).toBe(level.powerBadges.length);

      const powerObstacles = level.obstacles.filter((obstacle) => obstacle.kind === 'cakeWall');
      for (const obstacle of powerObstacles) {
        const badgeBeforeWall = level.powerBadges.some((badge) => badge.x < obstacle.x);

        expect(badgeBeforeWall).toBe(true);
      }
    }
  });

  it('distributes power badges across early and late route sections', () => {
    for (const level of levels) {
      const midpointY = ((level.groundY ?? 0) + (level.finish?.y ?? 0)) / 2;

      expect(level.powerBadges.some((badge) => badge.y > midpointY)).toBe(true);
      expect(level.powerBadges.some((badge) => badge.y < midpointY)).toBe(true);
    }
  });

  it('keeps power badges off the final top platform so they can be used before the finish', () => {
    for (const level of levels) {
      const finishY = level.finish?.y ?? 0;

      for (const badge of level.powerBadges) {
        expect(badge.y).toBeGreaterThan(finishY + MIN_POWER_BADGE_DISTANCE_FROM_FINISH_Y);
      }
    }
  });

  it('keeps crawl obstacles away from ladder exits', () => {
    for (const level of levels) {
      const ladders = level.ladders ?? [];
      const crawlObstacles = level.obstacles.filter((obstacle) => obstacle.kind === 'lowBarrier');

      for (const obstacle of crawlObstacles) {
        const obstacleSurfaceY = (obstacle.y ?? 0) + LOW_BARRIER_SURFACE_OFFSET;
        const ladderOnSameSurface = ladders.find((ladder) => Math.abs(ladder.yTop - obstacleSurfaceY) <= 2);

        if (!ladderOnSameSurface) {
          continue;
        }

        expect(Math.abs(obstacle.x - ladderOnSameSurface.x)).toBeGreaterThanOrEqual(MIN_CRAWL_RUNWAY_FROM_LADDER);
      }
    }
  });

  it('publishes level-specific course background assets', () => {
    const manifestKeys = new Set<string>(assetManifest.map((asset) => asset.key));

    for (const key of courseBackgroundAssetKeys) {
      const asset = assetManifest.find((entry) => entry.key === key);
      expect(manifestKeys.has(key)).toBe(true);
      expect(asset?.kind).toBe('Background');
      expect(asset?.url).toBeTruthy();
    }

    expect(manifestKeys.has('lowBarrier-yarn')).toBe(false);
    expect(manifestKeys.has('swing-yarn')).toBe(false);
  });
});
