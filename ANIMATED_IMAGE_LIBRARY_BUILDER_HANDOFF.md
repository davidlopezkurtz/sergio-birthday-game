# Animated Image Library Handoff

## Purpose

Use this handoff to give the primary builder agent access to the improved image assets, especially the newly generated cat animation frames. The game currently looks bad in motion because it mostly swaps single static cat poses. These files provide enough frame coverage for a basic animated run, slide, jump, and bump/recovery cycle.

All files are already in the workspace under:

`src/assets/images/`

Preview sheets:

- `exports/imagegen/cat-animation-frames-contact-sheet.png`
- `exports/imagegen/final-sprites-contact-sheet.png`
- `exports/imagegen/final-backgrounds-contact-sheet.png`

## Cat Animation Frames

All frame PNGs have transparent backgrounds and matching 1x / 2x exports.

### Recommended Run Loop

Use these first. They are the cleanest active movement frames:

| Frame key suggestion | Files | Logical size |
| --- | --- | --- |
| `catRun1` | `catRun1.png`, `catRun1-2x.png` | 180x130 |
| `catRun2` | `catRun2.png`, `catRun2-2x.png` | 180x130 |
| `catRun4` | `catRun4.png`, `catRun4-2x.png` | 180x130 |
| `catRun5` | `catRun5.png`, `catRun5-2x.png` | 180x130 |

Recommended Phaser cadence:

```ts
const CAT_RUN_FRAMES = ['catRun1', 'catRun2', 'catRun4', 'catRun5'] as const;
const frame = CAT_RUN_FRAMES[Math.floor(time / 95) % CAT_RUN_FRAMES.length];
```

Notes:

- `catRun3.png` exists but turns too far toward camera and should not be used in the first active loop.
- `catRun6.png` exists from an earlier extraction and should also be avoided for now.
- Keep display size fixed at 180x130 for every run frame so the hitbox stays stable.

### Slide Loop

Use these during slide-under actions:

| Frame key suggestion | Files | Logical size |
| --- | --- | --- |
| `catSlideFrame1` | `catSlideFrame1.png`, `catSlideFrame1-2x.png` | 190x90 |
| `catSlideFrame2` | `catSlideFrame2.png`, `catSlideFrame2-2x.png` | 190x90 |
| `catSlideFrame3` | `catSlideFrame3.png`, `catSlideFrame3-2x.png` | 190x90 |

Recommended Phaser cadence:

```ts
const CAT_SLIDE_FRAMES = ['catSlideFrame1', 'catSlideFrame2', 'catSlideFrame3'] as const;
const frame = CAT_SLIDE_FRAMES[Math.floor(time / 110) % CAT_SLIDE_FRAMES.length];
```

Keep display size fixed at 190x90 for every slide frame.

### Jump Frames

Use these based on vertical movement, not as a looping animation:

| Suggested use | Files | Logical size |
| --- | --- | --- |
| takeoff / rising | `catJumpFrame1.png`, `catJumpFrame1-2x.png` | 180x130 |
| rising / tucked | `catJumpFrame2.png`, `catJumpFrame2-2x.png` | 180x130 |
| apex | `catJumpFrame3.png`, `catJumpFrame3-2x.png` | 180x130 |
| falling / landing reach | `catJumpFrame4.png`, `catJumpFrame4-2x.png` | 180x130 |

Recommended selection:

```ts
const frame =
  verticalVelocity < -520 ? 'catJumpFrame1' :
  verticalVelocity < -120 ? 'catJumpFrame2' :
  verticalVelocity < 260 ? 'catJumpFrame3' :
  'catJumpFrame4';
```

Keep display size fixed at 180x130 for every jump frame.

### Bump / Dazed Feedback

Use these briefly after an obstacle hit:

| Frame key suggestion | Files | Logical size |
| --- | --- | --- |
| `catBump1` | `catBump1.png`, `catBump1-2x.png` | 180x130 |
| `catBump2` | `catBump2.png`, `catBump2-2x.png` | 180x130 |
| `catBump3` | `catBump3.png`, `catBump3-2x.png` | 180x130 |

Recommended behavior:

- Set a short `bumping` or `hurtFeedbackUntil` state for roughly 300-450ms.
- Cycle `catBump1 -> catBump2 -> catBump3`.
- Then restore slide / jump / run state based on actual player state.

## Static Cat Fallbacks

These stills remain useful for non-animated states, title screens, fallback textures, or if an animation frame fails to load:

| Use | Files | Logical size |
| --- | --- | --- |
| running still | `cat-ninja.png`, `cat-ninja-2x.png` | 180x130 |
| slide still | `catSlide-ninja.png`, `catSlide-ninja-2x.png` | 190x90 |
| jump still | `catJump-ninja.png`, `catJump-ninja-2x.png` | 180x130 |
| victory | `catVictory-ninja.png`, `catVictory-ninja-2x.png` | 200x200 |
| hurt/dazed still | `catHurt-ninja.png`, `catHurt-ninja-2x.png` | 180x130 |

## Obstacle And World Images

The larger improved image library is also already present.

Theme-specific jump / slide / swing obstacle variants:

| Theme | Hurdle | Low barrier | Swing |
| --- | --- | --- | --- |
| Yarn Yard | `hurdle-yarn.png`, `hurdle-yarn-2x.png` | `lowBarrier-yarn.png`, `lowBarrier-yarn-2x.png` | `swing-yarn.png`, `swing-yarn-2x.png` |
| Frosting Factory | `hurdle-bakery.png`, `hurdle-bakery-2x.png` | `lowBarrier-bakery.png`, `lowBarrier-bakery-2x.png` | `swing-bakery.png`, `swing-bakery-2x.png` |
| Birthday Beast Tower | `hurdle-tower.png`, `hurdle-tower-2x.png` | `lowBarrier-tower.png`, `lowBarrier-tower-2x.png` | `swing-tower.png`, `swing-tower-2x.png` |

Core sprites:

- `gate-beast.png`, `gate-beast-2x.png`
- `frostingPit-beast.png`, `frostingPit-beast-2x.png`
- `cakeWall-beast.png`, `cakeWall-beast-2x.png`
- `rook-beast.png`, `rook-beast-2x.png`
- `knight-beast.png`, `knight-beast-2x.png`
- `bishop-beast.png`, `bishop-beast-2x.png`
- `queen-beast.png`, `queen-beast-2x.png`
- `star-beast.png`, `star-beast-2x.png`

World art:

- `level-yarn-yard-bg.png`, `level-yarn-yard-bg-2x.png`
- `level-frosting-factory-bg.png`, `level-frosting-factory-bg-2x.png`
- `level-birthday-beast-tower-bg.png`, `level-birthday-beast-tower-bg-2x.png`
- `platform-yarn.png`, `platform-yarn-2x.png`
- `platform-bakery.png`, `platform-bakery-2x.png`
- `platform-tower.png`, `platform-tower-2x.png`

## Integration Guidance

The cleanest implementation is to keep the current collision sizes and only change the displayed texture frame.

Recommended rules:

- Do not resize the collision hitboxes per frame.
- Do not use `catRun3` or `catRun6` in the active run loop.
- Use run frames only when the player is moving horizontally and grounded.
- Use a single idle still (`cat` / `cat-ninja`) when the player is grounded and not moving.
- Use slide frames while `sliding === true`.
- Use jump frames while airborne, chosen from `verticalVelocity`.
- Use bump frames during a short bump feedback state, then restore the correct movement frame.
- Keep `catVictory` for finale/results only.

Suggested frame priority in `PlayScene`:

```ts
if (bumping) {
  // catBump1..3
} else if (sliding) {
  // catSlideFrame1..3
} else if (!onGround) {
  // catJumpFrame1..4 based on verticalVelocity
} else if (moving) {
  // catRun1, catRun2, catRun4, catRun5 loop
} else {
  // cat still
}
```

## Current Code State Note

Some manifest edits may already be in progress in `src/assets/assetManifest.ts`. The builder should verify that every animation frame key it uses is imported and included in `assetManifest`, so `BootScene` preloads it.

Minimum keys needed for the recommended first-pass animation:

- `catRun1`
- `catRun2`
- `catRun4`
- `catRun5`
- `catSlideFrame1`
- `catSlideFrame2`
- `catSlideFrame3`
- `catJumpFrame1`
- `catJumpFrame2`
- `catJumpFrame3`
- `catJumpFrame4`
- `catBump1`
- `catBump2`
- `catBump3`

## QA Checklist For Builder

After wiring:

- Run `npm run build`.
- Run `npm test`.
- Start the dev server and verify the title and first play scene.
- Move right: cat should cycle run frames, not slide as a static cutout.
- Jump: cat should change frame through takeoff/apex/fall.
- Slide: cat should cycle low slide frames.
- Hit obstacle: cat should briefly show bump frames, then recover.
- Confirm no console errors for missing texture keys.
