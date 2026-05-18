# Design Agent Bake-Off Mini-Game Art Handoff

## Goal
Create the visual library for the redesigned bake-off micro-game: a short, active baking competition called "Judge Order Bake Rush."

The current bake-off is too static. The new version should feel like a kid-friendly baking show: a judge order appears, a tray slides onto the counter, the player taps ingredient/tool stations to assemble the treat, then answers ingredient math to set the final score multiplier.

The art should make the micro-game feel physical, fast, and readable on iPad landscape.

## Gameplay Concept To Support

### Core Loop
1. A judge order ticket appears.
2. A pastry tray or counter lane presents the item being built.
3. The player taps ingredient/tool stations:
   - Base
   - Frosting
   - Topping
   - Decoration
   - Serve
4. The math question is built into the order: example, "3 cupcakes x 2 frosting swirls = ?"
5. The result gives a multiplier:
   - Perfect: x2.0
   - One miss or slower finish: x1.5
   - Multiple retries: x1.2
6. Celebration or gentle correction animation plays before returning to the results screen.

## Visual Direction
- Premium kid-friendly illustrated baking competition.
- Bright, clean, high-energy, but not visually noisy.
- Large silhouettes and clear tap targets.
- "Game show bake-off" feel: judge card, timer, counter, tray, lights, score/multiplier badge.
- Avoid protected show/game branding. Inspired by baking competitions and arcade order-building games, not copied from any specific IP.

## Required Layout Art

### 1. Bake-Off Background
Purpose: full-screen backdrop behind the micro-game UI.

Needs:
- Baking stage/counter setting.
- Optional audience/lights/confetti in background.
- Clear darker or lighter zones where UI panels can sit.
- No important detail behind text-safe regions.

Suggested manifest keys:
- `bakeoff-bg-yarn`
- `bakeoff-bg-bakery`
- `bakeoff-bg-tower`
- Fallback shared key: `bakeoff-bg`

Logical size:
- 1280x720
- Export 1x and 2x.

Text-safe zones:
- Top center: judge order/timer area.
- Middle center: tray/build area.
- Bottom row: ingredient/tool buttons.

### 2. Counter / Conveyor / Tray Lane
Purpose: make the bake-off feel active rather than a quiz panel.

Needs:
- A counter or conveyor lane where the treat is assembled.
- A tray that can slide or bounce in.
- The tray should have an obvious center area for treat layers.

Suggested manifest keys:
- `bakeoff-counter`
- `bakeoff-conveyor`
- `bakeoff-tray-empty`
- `bakeoff-tray-complete`

Logical sizes:
- Counter/conveyor: 960x180 or 1024x220.
- Tray: 360x180.

Animation:
- Optional `bakeoff-tray-1`, `bakeoff-tray-2` for bounce/arrival.

### 3. Judge Order Ticket
Purpose: display the recipe and ingredient math prompt.

Needs:
- Card/ticket art with 3-4 empty recipe slots.
- Strong border and readable empty interior.
- Space for math prompt and answer prompt.
- Optional judge stamp/ribbon.

Suggested manifest keys:
- `judge-ticket`
- `judge-ticket-perfect`
- `judge-ticket-correction`

Logical size:
- 430x210 or 480x240.

Important:
- Do not bake readable text into the art. Leave blank areas for Phaser-rendered text.

### 4. Ingredient / Tool Station Buttons
Purpose: replace generic rectangles with satisfying tap targets.

Needed station art:
- Cake/cupcake base
- Frosting
- Sprinkles
- Berry
- Candle
- Mix tool
- Frost tool
- Decorate tool
- Serve bell/plate

Suggested manifest keys:
- `station-base`
- `station-frosting`
- `station-sprinkles`
- `station-berry`
- `station-candle`
- `station-mix`
- `station-frost`
- `station-decorate`
- `station-serve`

States:
- Normal
- Pressed
- Correct
- Wrong/correction
- Disabled

Naming pattern:
- `station-frosting`
- `station-frosting-pressed`
- `station-frosting-correct`
- `station-frosting-wrong`
- `station-frosting-disabled`

Logical size:
- 128x128 icon art.
- Button frame optional at 180x112.

### 5. Treat Build Pieces
Purpose: visually assemble the order on the tray.

Needed pieces:
- Cupcake base
- Cake slice/base
- Donut base
- Frosting swirl
- Sprinkles layer
- Berry topping
- Candle decoration
- Birthday star topper

Suggested manifest keys:
- `treat-cupcake-base`
- `treat-cake-base`
- `treat-donut-base`
- `treat-frosting`
- `treat-sprinkles`
- `treat-berry`
- `treat-candle`
- `treat-star-topper`

Logical sizes:
- Base pieces: 180x140 to 240x180.
- Toppings: 80x80 to 160x100.

Important:
- Pieces should layer cleanly on top of each other.
- Transparent background.
- Consistent anchor/baseline so engineering can stack them predictably.

### 6. Math Answer Cards
Purpose: make ingredient math feel like part of baking, not a quiz screen.

Needs:
- Large answer cards with room for Phaser-rendered numbers/fractions.
- Correct/incorrect states.
- Optional ingredient-count visual on each card.

Suggested manifest keys:
- `answer-card`
- `answer-card-correct`
- `answer-card-wrong`
- `answer-card-fraction`

Logical size:
- 180x110 or 200x120.

### 7. Timer, Score, And Multiplier UI
Purpose: communicate pressure and stakes.

Needed:
- Timer badge/meter.
- Score bonus badge.
- Multiplier badges for x1.2, x1.5, x2.0.
- Perfect bake badge.

Suggested manifest keys:
- `bakeoff-timer-badge`
- `bakeoff-speed-meter`
- `bakeoff-score-badge`
- `multiplier-badge-12`
- `multiplier-badge-15`
- `multiplier-badge-20`
- `perfect-bake-badge`

Logical sizes:
- Timer/meter: 260x72.
- Multiplier badge: 180x120.
- Perfect badge: 240x140.

### 8. Baking Competition Characters / Props
Purpose: add charm and energy without blocking gameplay.

Optional but valuable:
- Judge cat or judge cupcake character.
- Mixer prop.
- Oven prop.
- Spotlight.
- Bell.
- Confetti.
- Audience silhouettes.

Suggested manifest keys:
- `judge-cat`
- `judge-cat-happy`
- `judge-cat-thinking`
- `bakeoff-mixer-1`
- `bakeoff-mixer-2`
- `bakeoff-oven`
- `bakeoff-bell`
- `bakeoff-spotlight`
- `bakeoff-confetti-1`
- `bakeoff-confetti-2`

Logical sizes:
- Judge: 220x220.
- Mixer/oven props: 180x180.
- Confetti overlays: 1280x720 or small reusable 256x256 sprites.

## Required Animation Sets

Keep frame counts small. 2-4 frames per loop is enough.

### High Priority
- Tray slide/bounce arrival: 2-3 frames.
- Mixing bowl active loop: 2-4 frames.
- Frosting/sprinkle application: 2-3 frames.
- Perfect bake sparkle/confetti: 2-4 frames.
- Gentle wrong/correction effect: 2 frames, no harsh failure visuals.

### Suggested Keys
- `tray-arrive-1`, `tray-arrive-2`, `tray-arrive-3`
- `mixing-bowl-1`, `mixing-bowl-2`, `mixing-bowl-3`
- `frosting-apply-1`, `frosting-apply-2`
- `sprinkle-burst-1`, `sprinkle-burst-2`
- `perfect-sparkle-1`, `perfect-sparkle-2`
- `correction-poof-1`, `correction-poof-2`

## Level Variants

The bake-off should support three themed wrappers without requiring separate gameplay logic.

### Yarn Yard Qualifier
Theme:
- Backyard party bake table.
- Yarn/ribbon accents.
- Simpler cupcake orders.

Good visual motifs:
- Yarn garland
- Picnic counter
- Cupcakes with berries/sprinkles

### Frosting Factory Bake-Off
Theme:
- Bakery stage/factory counter.
- Mixer and frosting machinery.
- Layer cakes/donuts.

Good visual motifs:
- Piping bags
- Mixer arms
- Donut trays
- Frosting conveyor

### Birthday Beast Tower
Theme:
- Finale bake-off stage.
- Birthday crown/candles/confetti.
- Bigger showpiece cake.

Good visual motifs:
- Tiered cake
- Candles
- Trophy/crown
- Stage lights

## Deliverables

### Minimum Initial Pack
This is enough to implement the new micro-game.

- `bakeoff-bg`
- `bakeoff-counter`
- `bakeoff-tray-empty`
- `judge-ticket`
- `station-base`
- `station-frosting`
- `station-sprinkles`
- `station-berry`
- `station-candle`
- `station-serve`
- `treat-cupcake-base`
- `treat-frosting`
- `treat-sprinkles`
- `treat-berry`
- `treat-candle`
- `answer-card`
- `answer-card-correct`
- `answer-card-wrong`
- `bakeoff-timer-badge`
- `multiplier-badge-12`
- `multiplier-badge-15`
- `multiplier-badge-20`
- `perfect-bake-badge`
- `perfect-sparkle-1`
- `perfect-sparkle-2`
- `correction-poof-1`
- `correction-poof-2`

### Nice-To-Have Expansion
- Per-level bake-off backgrounds.
- Judge character expressions.
- Mixer/oven props.
- Tool-specific station art.
- Full tray arrival animation.
- Confetti overlay animation.
- Donut/cake alternate treat sets.

## Technical Requirements
- Transparent PNG or WebP for sprites.
- 1x and 2x exports.
- 1280x720 for full-screen backgrounds.
- Use lowercase manifest keys with hyphens.
- Avoid baked-in text except decorative symbols; gameplay text will be rendered in Phaser.
- Keep silhouettes readable at iPad landscape scale.
- Leave clean blank areas for UI text and numbers.
- Provide contact sheets for quick review.

## QA Checklist
- Ingredient/tool buttons read clearly at tablet distance.
- Treat pieces stack cleanly on the tray.
- Answer cards have enough empty space for 1-2 digit numbers and simple fractions.
- Multiplier badges are unmistakable at x1.2, x1.5, and x2.0.
- Perfect/correction animations are celebratory/gentle, not punitive.
- Background art does not compete with the order ticket, tray, or bottom controls.
- The full screen still works with large touch targets in 1280x720.
