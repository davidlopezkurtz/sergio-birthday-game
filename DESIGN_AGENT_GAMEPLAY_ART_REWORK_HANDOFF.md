# Design Agent Gameplay Art Rework Handoff

## Goal
Refresh the current art direction around the new vertical climber gameplay. The game is moving away from horizontal auto-runner and into a Donkey Kong inspired obstacle-course tower: climb ladders, run across clear floor tiers, jump hazards, crawl under hazards, collect pastry points, then finish each level with a baking competition micro-game and score multiplier.

The existing ninja-cat library is a useful baseline, but the game needs clearer floor readability, better motion support, stronger collectible art, and more exciting bake-off/finale presentation.

## Current Player-Visible Issues To Address With Art
- The loading screen is too plain. It needs a kid-friendly game-show/birthday loading treatment with more personality.
- The cat can appear visually above the level floor or running in the air. Engineering is adjusting collision alignment, but floor art should make the walkable top edge unmistakable.
- Floors currently do not read as distinct stacked tiers. Each platform needs a strong top contact edge and visible underside/depth.
- The bake-off multiplier UI feels misaligned and visually static.
- Bake-off art is only medium-satisfying. It needs to feel like a baking competition, not just a recipe quiz.
- Level completion and finale pages need cleaner scoreboard art and celebration polish.
- Current pastry rewards look like pulsing point circles. These should become actual pastry collectibles.
- Obstacles should evolve toward Donkey Kong-like readable hazards, without using protected Donkey Kong branding.
- Crawl/duck hazards need art that clearly communicates "go under this".

## Requested New Or Revised Assets

### Loading Screen
Create a 1280x720 loading screen background for "Sergio's Ultimate Mathmaster" with:
- Ninja cat entering a birthday obstacle-course arena.
- Visible ladders, floor tiers, pastries, and a bake-off stage in the distance.
- A clear area for a progress bar and short loading text.
- Optional 2-4 frame loop elements: blinking lights, bouncing pastry, cat paw step, or confetti.

Suggested manifest keys:
- `loading-bg` at 1280x720 and 2560x1440.
- Optional `loading-cat-1`, `loading-cat-2`, etc. at about 180x130 logical px.

### Vertical Course Floors And Ladders
Revise or add platform sprites so each floor tier reads as a real surface.

Requirements:
- Each platform must have a crisp, high-contrast walkable top edge.
- Add visible thickness/underside so stacked floors look separated.
- Avoid art that makes the top edge ambiguous or floating.
- Ladders should visually connect from one floor top to the next floor top.

Suggested manifest keys:
- Keep `platform-yarn`, `platform-bakery`, `platform-tower`.
- Add optional floor edge overlays: `floor-edge-yarn`, `floor-edge-bakery`, `floor-edge-tower`.
- Add ladder variants if useful: `ladder-yarn`, `ladder-bakery`, `ladder-tower`.

Target logical sizes:
- Platform tile: 512x96, with the walkable contact line in the top 12-18 px.
- Ladder segment: about 96x384, transparent PNG/WebP.

### Pastry Point Pickups
Replace the abstract point circles with collectible pastries. The point value can stay as UI, but the object should read as a pastry first.

Create a small set:
- Croissant
- Cupcake
- Donut
- Cookie
- Birthday cake slice or macaron for high-value pickups

Requirements:
- Transparent background.
- Strong silhouette at iPad size.
- Optional 2-3 frame sparkle/bounce loop.
- Different value tiers should be readable by color/shape, not just text.

Suggested manifest keys:
- `pickup-croissant`
- `pickup-cupcake`
- `pickup-donut`
- `pickup-cookie`
- `pickup-cake-slice`
- Optional sparkle: `pickup-sparkle-1`, `pickup-sparkle-2`

Target logical size:
- 96x96 for normal pickups.
- 112x112 or 128x128 for high-value multiplier pickups.

### DK-Inspired Hazards And Enemies
The game needs hazards that feel like readable competition obstacles. Avoid using Donkey Kong barrels directly; use kid-friendly original equivalents.

Concepts to produce:
- Rolling yarn ball hazard for Yarn Yard.
- Rolling pin or mixer wheel hazard for Frosting Factory.
- Rolling birthday candle/log hazard for Birthday Beast Tower.
- Crawl-under gate/tunnel variants that clearly say "duck/crawl".
- Jump-over rails/candle hurdles with a clear top clearance.
- Swinging hazard variants that have an obvious arc.
- Optional silly obstacle-course enemy: tiny referee cupcake or whisk robot.

Suggested manifest keys:
- `roller-yarn`
- `roller-bakery`
- `roller-tower`
- `crawlGate-yarn`
- `crawlGate-bakery`
- `crawlGate-tower`
- Keep or revise existing `hurdle-*`, `lowBarrier-*`, `swing-*`.

Target logical sizes:
- Rolling hazard: 150x150 or 180x160.
- Crawl gate: 220x140 with transparent opening.
- Hurdle: 160x160.
- Swing: 160x180.

### Baking Competition Micro-Game
Rework the bake-off into a more animated competition moment. The current recipe-order interaction is only serviceable; the art should support a richer "build the judge ticket" feeling.

Create:
- Bake-off stage/counter background with judge table.
- Mixing bowl animation frames.
- Oven/counter prop.
- Ingredient icons: frosting, sprinkles, candle, berry.
- Recipe ticket/card art with 3-4 slots.
- Multiplier badge art for x1.2, x1.5, x2.0.
- Success/perfect bake celebration frames.
- Mistake/retry visual cue that is gentle, not punitive.

Suggested manifest keys:
- `bakeoff-bg`
- `bakeoff-counter`
- `bakeoff-bowl-1`, `bakeoff-bowl-2`, `bakeoff-bowl-3`
- `ingredient-frosting`
- `ingredient-sprinkles`
- `ingredient-candle`
- `ingredient-berry`
- `recipe-ticket`
- `multiplier-badge-12`
- `multiplier-badge-15`
- `multiplier-badge-20`
- `bakeoff-perfect-1`, `bakeoff-perfect-2`

Target logical sizes:
- Background: 1280x720.
- Ingredient buttons/icons: 96x96 or 128x128.
- Multiplier badge: 180x120.
- Ticket: 420x180.

### Results And Finale
Create art that supports clean readable score pages.

Results screen needs:
- Scorecard panel with enough room for stats.
- Two button areas that do not overlap the stat layout.
- Star/ribbon elements for level completion.

Finale needs:
- Birthday champion stage background.
- A cleaner scorecard layout area.
- Animated celebration elements: confetti, spotlight, trophy/crown, or cat victory loop.

Suggested manifest keys:
- `results-scorecard`
- `results-ribbon`
- `finale-bg`
- `finale-scorecard`
- `finale-confetti-1`, `finale-confetti-2`
- Keep `catVictory`, but add optional victory loop frames if possible.

## Animation Notes
- Keep animation frame counts small and practical: 2-4 frames per loop is enough.
- Prioritize readable silhouettes over detail.
- Cat run, jump, crawl, climb, bump, and victory frames should share a consistent foot/contact baseline.
- For the climb frames, include paws reaching rungs and keep the body centered enough that engineering can align it to ladders.

## Technical Constraints
- Transparent PNG or WebP for sprites.
- 1x and 2x exports.
- Use ASCII-safe lowercase manifest keys with hyphens.
- Keep old stable manifest keys working where possible, then add new keys for genuinely new concepts.
- Avoid protected show/game branding. The desired feeling is obstacle-course competition plus classic platformer readability, not direct copying.

## QA Checklist For The Art Pack
- At 1280x720, floor tops are obvious and do not look like background decoration.
- Cat feet or body baseline aligns consistently across run/jump/crawl/climb frames.
- Pastry pickups read as pastries before the point text is seen.
- Crawl obstacles clearly have an opening under them.
- Jump obstacles clearly have a jump-over profile.
- Bake-off screen feels like a baking competition with motion and score stakes.
- Results/finale art leaves clean empty space for text, buttons, and score breakdowns.
