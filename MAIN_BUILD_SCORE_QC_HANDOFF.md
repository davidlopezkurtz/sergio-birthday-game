# Main Build Handoff: Score/Thruster QC Fixes

## Context

The score-first game design is now partially implemented:

- Score is the dominant HUD stat.
- Point Thrusters exist in level data and render in the play scene.
- Combos, score buckets, target scores, and score-first results were added.
- Timer is visually secondary.
- `npm test` passes.
- `npm run build` passes, with the expected Phaser large chunk warning.

The direction is correct, but the score system needs tightening before this can be considered reliable. The player must be able to trust that the score shown during the run is the same score used on the results screen.

Primary files:

- `src/scenes/PlayScene.ts`
- `src/game/scoring.ts`
- `src/scenes/ResultsScene.ts`
- `src/data/levels.ts`
- `tests/scoring.test.ts`

## Priority 1: Make Live Score And Final Score Use One Ledger

### Problem

The live HUD score is mutated directly during gameplay, but the final score is recomputed from buckets in `buildScoreSummary()`.

This can create mismatches:

- A bump at `Score 0` records `penaltyPoints`, but the displayed score clamps to `0`.
- The final summary still subtracts the penalty.
- The retroactive `Saved!` path adds points back to live score without a clean matching bucket.

For a score-chase game, this is a major issue. The score the player sees must be the score they receive.

### Recommended Fix

Use one scoring ledger.

Best option:

- Track score buckets only:
  - `obstaclePoints`
  - `thrusterPoints`
  - `mathPoints`
  - `comboBonus`
  - `finishBonus`
  - `noHitBonus`
  - `mathStreakBonus`
  - `timeBonus`
  - `penaltyPoints`
- Derive live score from those buckets with the same formula used by `buildScoreSummary()`.
- Do not separately mutate `this.score` except through the same scoring helper.

Acceptable simpler option:

- Keep `this.score`, but make every score change update a matching bucket.
- Track `appliedPenaltyPoints`, not theoretical penalty points.
- Ensure final summary receives the exact applied score or exact same bucket state.

### Acceptance Criteria

- The final results score always matches the HUD score at level completion.
- A penalty at `Score 0` does not create hidden negative debt unless the HUD shows that debt clearly.
- `Saved!` cannot create a mismatch between live score and final score.
- Add a unit test for clamped penalties and final score calculation.

## Priority 2: Make Power Obstacles Actually Require Power

### Problem

`cakeWall` is labeled as a Power obstacle, but the code also allows jump to clear it.

That undermines the score route design:

- UI tells player: Power.
- Rules allow: Jump.
- Power Thrusters and power timing become less meaningful.

### Recommended Fix

Choose one rule and make UI match it.

Recommended:

- `cakeWall` should be power-only.
- `actionMatchesObstacle('jump', 'cakeWall')` should return `false`.
- `isObstacleClearedByAction('cakeWall')` should require power.

Alternative:

- If jump is intentionally valid, label cake walls as `Jump/Power`, not `Power`.

### Acceptance Criteria

- Obstacle labels match actual accepted action rules.
- Power-specific score routes cannot be bypassed by jumping.
- Relevant level data still places power obstacles where power cooldown makes sense.

## Priority 3: Remove Or Formalize Retroactive Saves

### Problem

After an obstacle has already been hit, a later matching action can:

- remove the hit,
- remove penalty points,
- award a clear,
- show `Saved!`.

This makes scoring feel negotiable after the fact. For a score-chase game, player feedback should be immediate and trustworthy.

### Recommended Fix

Prefer removing retroactive saves for now:

- Once an obstacle is resolved as a hit, keep it resolved as a hit.
- Do not decrement `obstacleHits`.
- Do not remove `penaltyPoints`.
- Do not award a clear after a hit.

If the mechanic is desired:

- Rename it as an explicit retry/parry mechanic.
- Add clear visual feedback.
- Give it its own scoring bucket, not ad hoc score repair.

### Acceptance Criteria

- A bump remains a bump.
- Obstacle clear count cannot increase for an obstacle already counted as a hit.
- Penalty points are stable after being applied.

## Priority 4: Improve Results Score Breakdown

### Problem

The results screen leads with score, which is good, but it combines several bonus sources into one line:

`Finish/no-hit/math streak/time bonuses`

That hides the scoring strategy from the player.

### Recommended Fix

Split the results into clearer lines:

- Finish bonus
- No-hit bonus
- Math streak bonus
- Time bonus
- Thruster points
- Obstacle clear points
- Math points
- Combo bonus
- Penalties

The player should leave the screen understanding how to score higher next run.

### Acceptance Criteria

- Results screen teaches score strategy.
- Time remains secondary.
- Score is still visually the biggest result.
- Text fits inside the panel at 1280x720.

## Priority 5: Validate Target Scores Against Actual Routes

### Current Estimated Max Scores

Rough max scores based on current level data:

- Yarn Yard target `6,500`; rough max around `9,550`
- Frosting Factory target `7,600`; rough max around `9,950`
- Birthday Beast Tower target `8,500`; rough max around `14,650`

These targets may be reasonable, but only if the point thrusters are actually collectible in normal play.

### Recommended Fix

After scoring ledger fixes, playtest each level and record:

- casual completion score,
- good score with several thrusters,
- near-perfect score,
- minimum score for 2 stars,
- minimum score for 3 stars.

Adjust `targetScore` from observed play, not theoretical max.

### Acceptance Criteria

- A casual successful run gets at least 1 star.
- A good score-focused run can get 2 stars.
- 3 stars requires intentional point chasing, not just finishing quickly.
- A slower run with better point collection can beat a faster low-score run.

## Suggested Implementation Order

1. Unify live/final scoring ledger.
2. Remove or formalize retroactive saves.
3. Make obstacle action rules match labels.
4. Improve results score breakdown.
5. Re-run tests and build.
6. Smoke-test first level score collection and final results.
7. Tune target scores after playtesting.

## Verification Checklist

Run:

- `npm test`
- `npm run build`

Manual smoke test:

- Start game.
- Confirm score is dominant in HUD.
- Collect first jump thruster.
- Confirm score and combo increase.
- Hit an obstacle and confirm penalty behavior is clear.
- Complete a math gate on first try.
- Confirm math points are added.
- Finish a level.
- Confirm final result score equals final HUD score.
- Confirm results screen explains where points came from.

## Non-Goals

- Do not rewrite the whole game.
- Do not replace Phaser.
- Do not change the birthday cat/chess/baking obstacle theme.
- Do not make the timer primary again.

## One-Line Goal

Make the score system trustworthy: every point the player sees during the run must reconcile cleanly with the results screen.

