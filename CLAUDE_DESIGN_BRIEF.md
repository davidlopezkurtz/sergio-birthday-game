# Claude Design Brief: Sergio's Cat Beast Birthday

## Goal

Create a cute, tablet-friendly visual library for a browser game about Sergio's 7th birthday. The game is a score-chasing cat obstacle course with math gates, chess powerups, baking-show obstacle themes, visible point thrusters, vertical upper-route platforms, and short baking bonus micro-games.

## Visual Direction

- Bright, playful, readable on iPad Safari in landscape.
- Cute birthday-game-show energy, not a direct copy of any real show branding.
- Friendly orange tabby hero cat, celebratory but still game-like.
- Sports-obstacle-course structure with upper lanes, climb platforms, and score targets; do not copy protected show branding, set design, names, logos, or announcer style.
- Shapes should read clearly at small sizes and while moving.
- Avoid dark, blurry, overly detailed, or stock-like art.

## Required Asset Keys

Keep these keys stable in `src/assets/assetManifest.ts`.

| Key | Suggested Size | Purpose |
| --- | --- | --- |
| `cat` | 180x130 transparent PNG/WebP | Running orange tabby contestant |
| `catSlide` | 190x90 transparent PNG/WebP | Low sliding cat pose |
| `gate` | 180x220 transparent PNG/WebP | Math gate with blank answer/sign area |
| `hurdle` | 160x160 transparent PNG/WebP | Ribbon rail jump obstacle |
| `lowBarrier` | 160x160 transparent PNG/WebP | Yarn tunnel, banner crawl, or mixer arm |
| `swing` | 160x160 transparent PNG/WebP | Swinging donut, rolling pin, or sweeper |
| `frostingPit` | 160x160 transparent PNG/WebP | Frosting slick or sprinkle slide |
| `cakeWall` | 160x160 transparent PNG/WebP | Gift stack, cupcake stack, or cake wall |
| `rook` | 128x128 transparent PNG/WebP | Rook dash power badge |
| `knight` | 128x128 transparent PNG/WebP | Knight jump power badge |
| `bishop` | 128x128 transparent PNG/WebP | Bishop leap power badge |
| `queen` | 128x128 transparent PNG/WebP | Queen shield power badge |
| `star` | 96x96 transparent PNG/WebP | Score star |

## Code-Drawn Gameplay Pieces

These are currently generated in Phaser rather than loaded from the manifest, but Claude Design can propose a matching visual treatment:

- Point Thrusters: bright pulsing score rings with `+100`, `+250`, `+500`, or `+750` displayed inside.
- Upper-route platforms: obstacle-course ledges/steps used for vertical score routes.
- Baking stations: cupcake/cake bonus markers on the Frosting Factory course.
- Baking micro-game UI: large ingredient buttons for frosting, sprinkles, candles, and berries, plus recipe-order slots.
- Score popups: short-lived `+points` and combo bursts near the cat or thruster.

## Level Themes

- Yarn Yard Qualifier: backyard yarn-ball competition course, rook dash.
- Frosting Factory Bake-Off: bakery-show course with mixers, frosting, cupcakes, knight jump, and quick recipe-matching bonus rounds.
- Birthday Beast Tower: final birthday tower with candles, confetti, fractions, queen shield, bishop leap, and upward platform scoring routes.

## Integration Notes

- Put final image files under `src/assets/images/`.
- Add each file path as the `url` for its matching key in `src/assets/assetManifest.ts`.
- Preserve transparent backgrounds for sprites and obstacles.
- Keep the same approximate proportions so collision and layout tuning do not need to change.
- The current Phaser-generated placeholders are fallbacks; final art can be added incrementally.
