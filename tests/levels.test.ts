import { describe, expect, it } from 'vitest';
import { assetManifest } from '../src/assets/assetManifest';
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

  it('does not publish obsolete course background or old crawl/swing manifest keys', () => {
    const manifestKeys = new Set<string>(assetManifest.map((asset) => asset.key));

    expect(manifestKeys.has('level-yarn-yard-bg')).toBe(false);
    expect(manifestKeys.has('level-frosting-factory-bg')).toBe(false);
    expect(manifestKeys.has('level-birthday-beast-tower-bg')).toBe(false);
    expect(manifestKeys.has('lowBarrier-yarn')).toBe(false);
    expect(manifestKeys.has('swing-yarn')).toBe(false);
  });
});
