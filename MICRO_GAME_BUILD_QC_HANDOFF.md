# Micro-Game Build QC Handoff

## Scope

This audit focuses on the new baking micro-game buildout:

- `src/scenes/BakingMiniGameScene.ts`
- `src/scenes/PlayScene.ts`
- `src/game/scoring.ts`
- `tests/scoring.test.ts`

The feature direction is good for the score-first game: the baking stations add optional, high-value point moments inside the course. The main risk is not the scoring math; it is the scene handoff and the player-facing clarity of the point opportunity.

## Verified Baseline

- `npm test` passes: 13 tests.
- `npm run build` passes, with the expected large Phaser chunk warning.
- Browser smoke test reached the title screen with no console errors in the sampled path.
- Direct automated smoke testing of the baking overlay was not completed because the running Phaser game instance was not reachable from browser automation through the expected dev global.

## Priority 1: Make Baking Station Completion Transactional

### Problem

`PlayScene.checkBakingStationTriggers()` marks a station solved before the baking scene has emitted a result:

- `activeBakingStation` is set before launch.
- `bakingStationsSolved.add(station.id)` happens before launch.
- The parent only resumes and clears `activeBakingStation` inside the result event callback.

If `BakingMiniGameScene` fails to launch, is stopped externally, throws before emitting, or otherwise shuts down without the expected event, the parent can end up in a bad state:

- The station is skipped forever because it is already marked solved.
- No baking points are awarded.
- `activeBakingStation` may remain `true`.
- Math gates and future baking stations are blocked by the active-state guard.
- The play scene may remain paused or logically stuck.

Relevant code:

- `src/scenes/PlayScene.ts:766`
- `src/scenes/PlayScene.ts:767`
- `src/scenes/PlayScene.ts:770`
- `src/scenes/PlayScene.ts:787`
- `src/scenes/PlayScene.ts:791`
- `src/scenes/PlayScene.ts:792`
- `src/scenes/BakingMiniGameScene.ts:264`
- `src/scenes/BakingMiniGameScene.ts:265`
- `src/scenes/BakingMiniGameScene.ts:266`

### Recommended Fix

Treat the baking result as a transaction:

1. Set `activeBakingStation = true` before launch.
2. Do not add the station to `bakingStationsSolved` until a valid result is received.
3. Use a `settled` flag so result and shutdown cleanup cannot both run.
4. Add a shutdown fallback for `BakingMiniGameScene`:
   - If the scene shuts down without emitting a result, clear `activeBakingStation`.
   - Resume the play scene.
   - Leave the station unresolved so it can be retried.
5. Validate the result payload before awarding points.

### Acceptance Criteria

- A baking station is counted as solved only after a result is received.
- If the baking overlay exits without a result, the main run recovers.
- The player cannot lose a station's points because of a scene lifecycle failure.
- Math gates and later baking stations are not permanently blocked by a failed overlay.

## Priority 2: Surface Perfect-Bonus Value Before The Player Enters The Micro-Game

### Problem

The in-course station visual only shows the base value:

- `src/scenes/PlayScene.ts:408`

The perfect bonus appears inside the overlay:

- `src/scenes/BakingMiniGameScene.ts:103`
- `src/scenes/BakingMiniGameScene.ts:104`

For a score-chase game, the player should understand the full value of the opportunity before crossing into it. Right now the station reads like `+500`, but the real high-score value can be `+750` or `+1000` after the perfect bonus. That undersells the point moment.

### Recommended Fix

Make the full point opportunity visible from the course:

- Show base and perfect values on the station, for example `+500` and `Perfect +250`.
- Consider a stronger high-value treatment for baking stations, similar to Point Thrusters.
- In the overlay, show the total possible score and the perfect requirement before input begins.
- In the completion popup, split base and perfect points or make the perfect bonus visibly distinct.

### Acceptance Criteria

- Before reaching a station, the player can tell it is a major score opportunity.
- Perfect play feels like winning extra points, not discovering hidden accounting.
- The station supports the score-first direction where points matter more than timer.

## Priority 3: Add Scene-Level Coverage Or Manual QA For The Baking Flow

### Problem

The added tests cover score summary math, but not the actual scene lifecycle:

- `tests/scoring.test.ts:131`
- `tests/scoring.test.ts:139`
- `tests/scoring.test.ts:148`

That confirms baking points can be included in a summary, but it does not confirm:

- station trigger ordering,
- pause/resume behavior,
- duplicate or missed result events,
- shutdown without result,
- keyboard input inside repeated baking overlays,
- completing both level 2 baking stations in sequence.

### Recommended Fix

Add focused coverage where practical:

- If scene-level tests are too heavy, extract the station-result bookkeeping into a small helper and unit test it.
- Manually smoke-test level 2 from before the first baking station through both stations and the results screen.
- Specifically test the failure path by stopping `BakingMiniGameScene` before it emits a result.
- Confirm the HUD and results screen agree on baking points.

### Acceptance Criteria

- Both level 2 baking stations can be completed in one run.
- A wrong ingredient removes only the perfect bonus and breaks combo as intended.
- A perfect bake awards base plus perfect bonus.
- The run resumes reliably after the overlay closes.
- Results show `Bake-Off` totals and the final score includes baking points.

## Priority 4: Be Defensive About Keyboard Handler Cleanup

### Problem

`BakingMiniGameScene.createIngredientButtons()` registers number-key handlers each time the scene is created:

- `src/scenes/BakingMiniGameScene.ts:196`
- `src/scenes/BakingMiniGameScene.ts:204`

Phaser usually tears down scene input on stop, but repeated launch/stop overlays are exactly where stale handlers can become hard-to-debug if cleanup is incomplete or the scene later changes to sleep/wake instead of stop/start.

### Recommended Fix

Keep explicit references to added keys or callbacks and remove them on scene shutdown. This is defensive, not a rewrite.

### Acceptance Criteria

- Replaying multiple baking stations does not fire duplicate ingredient selections.
- Old handlers do not reference destroyed button backgrounds.
- The scene can be safely relaunched many times.

## Builder Checklist

1. Make station solving transactional.
2. Add overlay shutdown fallback.
3. Surface full baking point value before station entry.
4. Add or document a level 2 manual smoke test.
5. Verify perfect bake, missed bake, and two-station sequence.
6. Run `npm test`.
7. Run `npm run build`.

## Non-Goals

- Do not replace the baking micro-game concept.
- Do not make the timer primary again.
- Do not broadly refactor Phaser scene architecture unless the lifecycle fix requires a tiny helper.

## One-Line Goal

Make baking stations feel like reliable, high-value score events: the player sees the points, earns the points, and the main run always recovers cleanly after the micro-game.
