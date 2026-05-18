# Bake-Off Rush Art Builder Handoff

## Goal

Incorporate the new visual library for the redesigned bake-off micro-game, **Judge Order Bake Rush**. The pack is built for a kid-friendly baking competition loop: judge order ticket, tray/counter build lane, ingredient/tool station taps, ingredient math answer cards, score multiplier, then perfect/correction feedback.

The art avoids protected branding and does not bake gameplay text into the image assets. Render order text, numbers, fractions, timer values, and multiplier labels in Phaser.

## Where The Assets Are

Final runtime assets:

`src/assets/images`

Every logical asset below has a 1x PNG and a 2x PNG:

`asset-key.png`  
`asset-key-2x.png`

Review and source files:

`exports/imagegen/bakeoff-rush/sources` - original generated source sheets  
`exports/imagegen/bakeoff-rush/alpha` - transparent alpha source sheets  
`exports/imagegen/bakeoff-rush/bakeoff-rush-backgrounds-contact-sheet.png`  
`exports/imagegen/bakeoff-rush/bakeoff-rush-sprites-contact-sheet.png`  
`exports/imagegen/bakeoff-rush/bakeoff-rush-stations-contact-sheet.png`  
`exports/imagegen/bakeoff-rush/bakeoff-rush-supplemental-contact-sheet.png`  
`exports/imagegen/bakeoff-rush/bakeoff-rush-asset-inventory.csv`  
`exports/imagegen/bakeoff-rush/bakeoff-rush-supplemental-inventory.csv`  
`exports/imagegen/bakeoff-rush/process_bakeoff_rush_assets.py` - reproducible crop/export script
`exports/imagegen/bakeoff-rush/process_bakeoff_rush_supplemental.py` - supplemental crop/audio/export script

Additional runtime support files:

`src/assets/tray-piece-anchor-guide.json` - suggested local anchors and stack offsets for tray layering  
`src/assets/audio` - short WAV placeholders for the new bake-off timing loop

## Backgrounds

Use the themed background for each level wrapper. `bakeoff-bg` is a fallback alias of the bakery version.

- `bakeoff-bg-yarn` - backyard/picnic qualifier table
- `bakeoff-bg-bakery` - frosting factory bake-off set
- `bakeoff-bg-tower` - birthday finale stage
- `bakeoff-bg` - shared fallback

Logical size: `1280x720`.

## Counter, Conveyor, And Tray Lane

Use these to make the mini-game feel physical instead of quiz-like.

- `bakeoff-counter` - static counter lane, `1024x220`
- `bakeoff-conveyor` - moving conveyor variant, `1024x220`
- `bakeoff-tray-empty` - blank assembly tray, `360x180`
- `bakeoff-tray-complete` - finished tray state, `360x180`
- `tray-arrive-1`
- `tray-arrive-2`
- `tray-arrive-3`
- `serve-plate`

Suggested animation:

`tray-arrive-1 -> tray-arrive-2 -> tray-arrive-3 -> bakeoff-tray-empty`

## Judge Ticket And Answer UI

These are intentionally blank inside so Phaser can render the actual order, prompt, and answers.

- `judge-ticket`
- `judge-ticket-perfect`
- `judge-ticket-correction`
- `recipe-ticket` - alias copy of `judge-ticket` for older code paths
- `answer-card`
- `answer-card-correct`
- `answer-card-wrong`
- `answer-card-fraction`
- `bakeoff-timer-badge`
- `bakeoff-speed-meter`
- `bakeoff-score-badge`
- `perfect-bake-badge`
- `multiplier-badge-base`
- `multiplier-badge-12`
- `multiplier-badge-15`
- `multiplier-badge-20`

Important: render `x1.2`, `x1.5`, and `x2.0` as Phaser text on top of the multiplier badge assets. The badge files are colored/illustrated badge bases, not text-bearing finals.

## Ingredient And Tool Stations

Station base keys:

- `station-base`
- `station-frosting`
- `station-sprinkles`
- `station-berry`
- `station-candle`
- `station-mix`
- `station-frost`
- `station-decorate`
- `station-serve`

Each station also has these state variants:

- `-pressed`
- `-correct`
- `-wrong`
- `-disabled`

Example lookup pattern:

```ts
const stationKey = state === 'normal'
  ? `station-${stationId}`
  : `station-${stationId}-${state}`;
```

Optional frame-only assets are also available:

- `station-button-frame`
- `station-button-frame-pressed`
- `station-button-frame-correct`
- `station-button-frame-wrong`
- `station-button-frame-disabled`

## Treat Build Pieces

Use these as stackable tray pieces. Base pieces are bottom-aligned in their canvas to make tray placement predictable.

- `treat-cupcake-base`
- `treat-cake-base`
- `treat-donut-base`
- `treat-frosting`
- `treat-sprinkles`
- `treat-berry`
- `treat-candle`
- `treat-star-topper`

Suggested assembly order:

`base -> frosting -> sprinkles/berry -> candle/star -> serve`

## Action And Feedback Animations

Keep loops short and snappy.

Frosting:

`frosting-apply-1 -> frosting-apply-2`

Sprinkles:

`sprinkle-burst-1 -> sprinkle-burst-2`

Perfect bake:

`perfect-sparkle-1 -> perfect-sparkle-2`

Correction:

`correction-poof-1 -> correction-poof-2`

Mixing:

`mixing-bowl-1 -> mixing-bowl-2 -> mixing-bowl-3`

## Characters And Props

- `judge-cat`
- `judge-cat-happy`
- `judge-cat-thinking`
- `judge-cupcake`
- `bakeoff-mixer-1`
- `bakeoff-mixer-2`
- `bakeoff-oven`
- `bakeoff-bell`
- `bakeoff-spotlight`
- `bakeoff-confetti-1`
- `bakeoff-confetti-2`
- `audience-silhouette`

Use judge expressions as state feedback:

- Thinking/order state: `judge-cat-thinking`
- Correct or perfect bake: `judge-cat-happy`
- Neutral idle: `judge-cat`

## Supplemental Timing Loop Assets

These were added after the initial pack for the completed-treat rack, multi-ticket flow, serve timing mechanic, station readability, and batch math presentation.

Completed treat area:

- `completed-treat-rack`
- `judge-rack`

Escalating judge tickets:

- `ticket-stack`
- `ticket-complete-stamp`
- `ticket-next-tab`
- `ticket-priority-star`

Serve timing meter:

- `serve-meter-track`
- `serve-meter-sweet-zone`
- `serve-meter-marker`
- `serve-hit-burst`
- `serve-miss-wobble`

Suggested timing composition:

1. Place `serve-meter-track` as the base.
2. Position `serve-meter-sweet-zone` over the target range.
3. Animate `serve-meter-marker` horizontally across the track.
4. On hit, play `serve-hit-burst` at the marker or tray.
5. On miss, play `serve-miss-wobble` on the tray or meter.

Station next-step readability:

- `station-current-glow`
- `station-next-ring`

Suggested use:

- Put `station-current-glow` behind the active station.
- Pulse `station-next-ring` over the next required station.
- Keep the existing `station-*-pressed`, `station-*-correct`, and `station-*-wrong` sprites for tap feedback.

Batch math presentation:

- `math-treat-count-card`
- `math-topping-chip`
- `math-batch-card`

Use these as art-backed containers for rendered numbers, fractions, and ingredient icons. Do not bake math text into the assets.

## SFX Placeholders

Short WAV placeholders are available in `src/assets/audio`:

- `sfx-tray-slide.wav`
- `sfx-station-correct.wav`
- `sfx-station-wrong.wav`
- `sfx-serve-green.wav`
- `sfx-serve-miss.wav`
- `sfx-multiplier-reveal.wav`

These are procedural placeholder sounds meant for implementation timing and gameplay feel. They are named for direct manifest registration and can be replaced by polished audio later without changing code keys.

## Anchor Guide

Use `src/assets/tray-piece-anchor-guide.json` for tray stacking and completed-rack placement hints. It includes:

- normalized tray anchor
- per-piece local anchors
- suggested `stackOffset` values for `treat-*` pieces
- normalized rack slot positions for `completed-treat-rack` and `judge-rack`

## Integration Notes

1. Register all keys from `exports/imagegen/bakeoff-rush/bakeoff-rush-asset-inventory.csv` in the asset manifest.
2. Register all keys from `exports/imagegen/bakeoff-rush/bakeoff-rush-supplemental-inventory.csv`.
3. Register the six `src/assets/audio/*.wav` placeholders if the build already supports audio manifests.
4. Prefer level-specific backgrounds first, then fall back to `bakeoff-bg`.
5. Keep text rendered by Phaser over the blank ticket/card/badge interiors.
6. Use station state variants for tap feedback instead of tinting generic rectangles.
7. Use treat pieces as layered sprites on the tray, not as one merged treat image.
8. Use `tray-piece-anchor-guide.json` for consistent stack/rack placement.
9. Use `tray-arrive-*`, `mixing-bowl-*`, `frosting-apply-*`, `sprinkle-burst-*`, `perfect-sparkle-*`, and `correction-poof-*` as small frame animations.
10. Use iPad landscape scale checks around `1280x720`; the assets were exported for that logical layout.

## QA Checklist

- Background does not compete with the judge ticket, tray, or bottom station controls.
- Ticket/card interiors remain readable after Phaser text is drawn.
- Station buttons are recognizable at tablet distance.
- Disabled/wrong/correct station states are visibly distinct.
- Treat pieces layer cleanly on `bakeoff-tray-empty`.
- Completed treats move cleanly into `completed-treat-rack` or `judge-rack`.
- The serve meter can be assembled from separate track, target zone, marker, hit burst, and miss wobble assets.
- Multiplier badges leave room for rendered `x1.2`, `x1.5`, and `x2.0` labels.
- Perfect/correction effects feel celebratory or gentle, not punitive.
- 2x files exist for every 1x asset used by the manifest.
