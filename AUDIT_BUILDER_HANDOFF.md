# Builder Handoff: Audit-Driven Improvements

## Context

This project is a Vite + TypeScript + Phaser browser game for Sergio's 7th birthday. The current baseline builds and passes tests, but the audit found several production-readiness and design issues worth addressing before handoff or playtesting on iPad Safari.

Verified baseline:

- `npm test` passes: 10 tests across math/scoring.
- `npm run build` succeeds.
- Live smoke test confirmed title screen, play scene, first math gate, scoring HUD, and no browser console errors in the sampled path.
- Vite emits a large chunk warning because Phaser is bundled into the main JS chunk.

Primary files to inspect first:

- `src/main.ts`
- `src/scenes/PlayScene.ts`
- `src/scenes/MathGateScene.ts`
- `src/assets/assetManifest.ts`
- `src/data/levels.ts`
- `src/assets/README.md`
- `vite.config.ts`

## Priority 1: Fix Input Conflicts And Accessibility

### Problem

`Space` is currently bound to both jump and power:

- `this.cursors = this.input.keyboard?.createCursorKeys()`
- `this.keyPower = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)`
- `handleKeyboardInput()` checks cursor space for jump before checking power.

This makes keyboard behavior ambiguous and likely prevents reliable power activation from the keyboard. Math gate answer selection is pointer-only, which is weak for testing and accessibility.

### Recommended Change

Use distinct keyboard controls:

- Jump: `ArrowUp`, optionally `W`
- Slide: `ArrowDown`, optionally `S`
- Power: `Space`
- Math answers: `1`, `2`, `3`, `4`, plus pointer/touch

Avoid binding `Space` through `createCursorKeys()` as jump if it remains the power key.

### Acceptance Criteria

- Pressing `Space` activates the current power, not jump.
- Pressing `ArrowUp` jumps.
- Pressing `ArrowDown` or `S` slides.
- In `MathGateScene`, number keys `1-4` select the visible answer buttons in reading order.
- Touch controls still work.
- Add focused tests if control logic is extracted into testable helpers; otherwise smoke test manually in browser.

## Priority 2: Guard Math Gate Launching

### Problem

`PlayScene.checkGateTriggers()` loops through all gate positions and can launch a math gate when the cat crosses a threshold. If a large frame delta occurs, especially after a mobile tab pause/resume, the cat could cross more than one gate threshold in one update and attempt to launch multiple `MathGateScene` instances or register multiple pending events.

### Recommended Change

Add a simple gate state guard, for example:

- `private activeGate = false`
- In `checkGateTriggers()`, return immediately if `activeGate` is true.
- Set `activeGate = true` before pausing/launching `MathGateScene`.
- Reset it in the math gate event callback, immediately before or after `this.scene.resume()`.
- Break or return after launching one gate.

### Acceptance Criteria

- Only one math gate can be active at a time.
- Large `delta` or manually advancing cat position across multiple gates cannot launch multiple overlays.
- Existing math scoring still increments once per solved gate.

## Priority 3: Improve First-Run Onboarding And Difficulty Ramp

### Problem

The first obstacle appears too quickly for the intended player. The cat starts at `x=160`, moves at `230px/s`, and the first obstacle is at `x=650`, leaving roughly two seconds before the first required action. In smoke testing, the first hit occurred before the first math gate. For a 7-year-old tablet-first birthday game, this is abrupt.

### Recommended Change

Add one or more of the following:

- A short `Ready / Go` countdown before auto-run starts.
- Move the first obstacle farther right.
- Add a non-penalizing practice obstacle before scoring begins.
- Show control prompts near the first obstacle, then hide them after use.
- Delay hit counting for the first 2-3 seconds of the first level.

Most pragmatic path: add a short countdown and move the first level's first obstacle from `650` to around `850-950`.

### Acceptance Criteria

- A first-time player has enough time to see the controls before the first obstacle.
- The first obstacle does not usually cause an unavoidable hit during a normal smoke test.
- The tutorial/prompt does not obscure the cat, obstacles, gates, or touch controls.

## Priority 4: Make Retina/iPad Rendering Sharper

### Problem

The design brief targets iPad Safari, but the live manifest loads only 1x PNGs even though `-2x.png` files exist. On high-DPI iPads, the game may look softer than expected.

### Recommended Change

Keep logical display sizes stable, but load higher-resolution assets when appropriate. Do not blindly replace 1x URLs with `-2x.png` unless the draw code also preserves display size; otherwise sprites will render too large.

Suggested implementation:

- Extend asset manifest entries with logical display dimensions already present as `width` and `height`.
- Point manifest URLs to `-2x.png` assets, or add a `highDpiUrl` field and pick it when `window.devicePixelRatio > 1`.
- When creating images/sprites from manifest assets, call `setDisplaySize(asset.width, asset.height)` or otherwise normalize scale so layout/collision tuning remains unchanged.
- For the cat and obstacles, centralize image creation enough that future asset swaps do not require recalibrating every scene.

### Acceptance Criteria

- On standard desktop, layout remains visually identical or intentionally improved.
- On high-DPI screens, sprites appear sharper.
- Cat, gate, obstacle, star, and powerup display sizes remain aligned with the design brief.
- Collision behavior does not change merely because a higher-resolution source image is loaded.

## Priority 5: Improve Collision Fairness And Obstacle Behavior

### Problem

Obstacle collision uses broad rectangle overlap with fixed inflation. Labels such as "Swinging Donut" imply motion, but obstacles are static. The current behavior is acceptable for a prototype, but hits can feel arbitrary as visual polish improves.

### Recommended Change

Introduce per-obstacle collision tuning:

- Define hitbox dimensions/offsets by obstacle kind.
- Use a smaller cat hurtbox while sliding.
- Make swing obstacles actually move or rotate.
- Consider basic obstacle animation even if collision remains simple.

Do not overbuild a full physics system unless needed. The current manual movement approach is fine for a short birthday game.

### Acceptance Criteria

- A visibly cleared obstacle does not still count as a hit.
- Sliding changes the cat's effective hurtbox.
- Swing obstacles have visible motion or are renamed/reworked so visuals match behavior.
- Existing level completion and scoring still work.

## Priority 6: Production Build Hygiene

### Problem

`vite.config.ts` enables production sourcemaps and the build emits a large chunk warning. The chunk warning is expected with Phaser, but sourcemaps may not be desirable for public sharing and the large first-load bundle could matter on tablet connections.

### Recommended Change

- Decide whether public builds should ship sourcemaps. If not, set `sourcemap: false`.
- Consider code-splitting Phaser only if first-load time becomes a measured issue. This is not urgent for a small private birthday game.
- Keep `base: './'` if the game is intended to run from static file hosting or exported folders.

### Acceptance Criteria

- Build settings match the intended distribution method.
- No accidental public sourcemaps unless deliberately desired.
- Bundle warning is either accepted as a known Phaser cost or addressed with measured benefit.

## Nice-To-Have Design Improvements

- Add subtle cat run animation or bobbing to make auto-run feel alive.
- Add feedback for power cooldown beyond text, such as a radial cooldown or dimmed button.
- Make the HUD less text-heavy on tablet by using icons plus short labels.
- Add answer button pressed/disabled states in `MathGateScene` to prevent repeated taps during the correct-answer delay.
- Add a short finale transition or celebration animation after the final level.

## Suggested Verification Pass

After changes:

1. Run `npm test`.
2. Run `npm run build`.
3. Start the local app and smoke test:
   - title start button
   - jump/slide/power touch controls
   - keyboard jump/slide/power
   - math gate pointer answers
   - math gate number-key answers
   - wrong answer hint path
   - first level completion
4. Test at a tablet-like landscape viewport.
5. Do one high-DPI visual check if possible.

## Non-Goals

- Do not rewrite the game architecture.
- Do not replace Phaser.
- Do not change the core theme: cat obstacle-course math race, chess powerups, birthday/baking-show energy.
- Do not make major unrelated refactors while addressing these issues.

