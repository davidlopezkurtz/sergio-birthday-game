# Bake-Off Mini-Game Redesign Notes

## Why Redesign
The current bake-off is functional but not fun enough. It is mostly a static recipe-order check followed by one math question, so it feels disconnected from the action-course score chase. The better direction is a short baking competition micro-game that feels active, readable, and score-driven.

## References Reviewed
- Cakery Bakery: https://github.com/cheyzhang/thecakerybakery
- Monika After Story cooking suggestion thread: https://github.com/Monika-After-Story/MonikaModDev/issues/10323

## Useful Takeaways

### Cakery Bakery Direction
Useful pieces:
- Orders arrive with specific cake components.
- The player assembles bases, frosting, and toppings.
- Correct orders score points.
- Speed/pressure can increase over time.
- The game loop is immediately readable because there is a visible customer/order and a visible cake being built.

What to borrow:
- A short conveyor or counter lane.
- One active judge order at a time.
- Tap ingredient stations to build the requested pastry.
- Award score based on accuracy and speed.

What not to borrow:
- Full restaurant-management complexity.
- Punishing lives/failure states. Sergio's game should stay gentle.

### Recipe/Kitchen Direction
Useful pieces from the cooking-suggestion thread:
- Cooking can be framed as following a recipe with ingredients, tools, equipment, and timed steps.
- Substitutions, safety, allergies, and demonstrations make it feel like a real kitchen.
- Timers and step sequencing create a better sense of participation than a static quiz.

What to borrow:
- Recipe cards that ask for counts and ingredient relationships.
- Tool actions like mix, frost, sprinkle, bake.
- Gentle timer pressure.
- Ingredient math as part of the recipe, not a separate pop quiz.

What not to borrow for v1:
- Complex branching recipes.
- Long tutorial flow.
- Any content that slows the 5-8 minute birthday game too much.

## Recommended V2: Judge Order Bake Rush

### Core Loop
At the end of each obstacle-course level, the player enters a 35-45 second bake-off rush.

1. A judge order appears: example, "Make 3 cupcakes with 2 frosting swirls each."
2. A pastry tray slides onto the counter.
3. The player taps ingredient/tool stations in sequence:
   - Base
   - Frosting
   - Topping
   - Decoration
4. The math prompt is embedded in the ticket: "3 cupcakes x 2 swirls = ?"
5. The final answer sets the multiplier:
   - Perfect order and math: x2.0
   - One mistake or slow finish: x1.5
   - Multiple retries: x1.2
6. The multiplier applies to the action-course score collected from pastries and obstacle clears.

### Why This Is Better
- It keeps the baking event connected to the course score.
- It gives the player agency through fast, physical tapping.
- Math feels like ingredient counting instead of an interruption.
- The visual art can carry the fantasy: judge ticket, moving tray, ingredient stations, oven, mixer, timer, celebration.

## Interaction Model

### Tablet Controls
- Four large ingredient/tool stations across the bottom.
- One large "Serve" button after the tray is complete.
- Answer choices appear as ingredient-count cards, not generic quiz buttons.

### Keyboard Fallback
- Number keys 1-4 choose ingredient/tool stations.
- Enter serves the tray.

## Score Model
- Base order score: 300-500 points.
- Speed bonus: up to 300 points.
- Perfect order bonus: 500 points.
- Ingredient math controls the final multiplier.
- No hard fail. Mistakes reduce multiplier and add a short correction animation.

## Level Variants

### Yarn Yard Qualifier
- Simple cupcakes.
- Addition/subtraction ingredient math.
- Example: "Sergio needs 4 berries and adds 3 more. How many berries?"

### Frosting Factory Bake-Off
- Layer cakes or donuts.
- Multiplication/division ingredient math.
- Example: "3 cakes need 4 frosting swirls each. How many swirls?"

### Birthday Beast Tower
- Birthday cake slices or party trays.
- Comparisons/simple fractions.
- Example: "Which tray has more: 1/2 frosted or 3/4 frosted?"

## Art Requests For Design Agent
- Bake-off counter background with judge table.
- Moving tray or conveyor lane.
- Judge order ticket card.
- Ingredient stations for base, frosting, sprinkles, candle, berry.
- Tool station icons: mix, frost, decorate, serve.
- Timer badge and multiplier badge.
- Success animation: perfect bake sparkle/confetti.
- Gentle correction animation: order ticket shakes, ingredient pops back.

## Implementation Plan
1. Replace the current static recipe slots with a tray/order state machine.
2. Add a visible order ticket containing both recipe and math.
3. Convert ingredient taps into tray-building steps.
4. Add a serve phase that checks the tray and then asks/validates the embedded math.
5. Keep the existing `BakingStationResult` contract so PlayScene scoring does not need a rewrite.
6. Add tests for order validation and multiplier outcomes.

## Acceptance Criteria
- The bake-off has at least three meaningful player inputs before the math answer.
- The player can understand the current order without reading a paragraph.
- The math question is about the visible recipe/order.
- The multiplier outcome is obvious before returning to results.
- Mistakes are corrected gently without ending the game.
