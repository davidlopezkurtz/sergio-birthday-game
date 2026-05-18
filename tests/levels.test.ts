import { describe, expect, it } from 'vitest';
import { assetManifest, courseBackgroundAssetKeys } from '../src/assets/assetManifest';
import { levels } from '../src/data/levels';

describe('level authoring', () => {
  it('places explicit power badges before each power obstacle', () => {
    for (const level of levels) {
      expect(level.powerBadges.length).toBeGreaterThan(0);
      expect(new Set(level.powerBadges.map((badge) => badge.id)).size).toBe(level.powerBadges.length);

      const powerObstacles = level.obstacles.filter((obstacle) => obstacle.kind === 'cakeWall');
      for (const obstacle of powerObstacles) {
        const badgeBeforeWall = level.powerBadges.some(
          (badge) => badge.x < obstacle.x && Math.abs(badge.y - (obstacle.y ?? 0)) <= 140
        );

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
