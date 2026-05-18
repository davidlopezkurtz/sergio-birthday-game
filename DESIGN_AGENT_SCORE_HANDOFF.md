# Design Agent Handoff: Make Score The Main Game

## Core Direction

The current game improvements helped onboarding and controls, but the experience is still framed too much like a timed obstacle course. Reframe it as a score-chasing obstacle game where Sergio is trying to earn the biggest birthday score possible.

The timer should remain visible, but it is secondary. The primary emotional loop should be:

1. Spot point opportunities.
2. Choose a riskier action path.
3. Hit a point target or "point thruster."
4. See a satisfying score burst.
5. Build a combo or multiplier.
6. Finish with a bigger score than last run.

Use *Ultimate Beastmaster* only as structural inspiration: a sports-entertainment obstacle course where scoring matters and higher scores determine advancement. Do not copy branding, set design, names, logos, announcer style, or any protected visual identity. Reference: [Ultimate Beastmaster on Wikipedia](https://en.wikipedia.org/wiki/Ultimate_Beastmaster).

## Biggest Design Change

### Before

- Timer and completion feel like the main objectives.
- Obstacles are mostly pass/fail.
- Stars are based heavily on elapsed time, math accuracy, hits, and hints.

### After

- Score is the main objective.
- Time is a tiebreaker, bonus, or secondary stat.
- Obstacles create scoring opportunities.
- Optional point targets matter more than simply surviving.
- Results screen should celebrate total points first, then stars/time/accuracy.

## Point Thrusters

Introduce high-value collectible or trigger zones called **Point Thrusters** unless the team wants a more birthday-specific name.

Possible themed names:

- Point Thrusters
- Birthday Boosters
- Score Rockets
- Star Thrusters
- Cake Boosters

Recommendation: use **Point Thrusters** in game logic and maybe **Star Thrusters** or **Birthday Boosters** in visible UI if that feels more kid-friendly.

### Visual Concept

Point Thrusters should be impossible to miss:

- Bright vertical or circular score targets.
- Animated pulsing ring or sparkle effect.
- Score value shown directly on the object, such as `+250`, `+500`, `x2`.
- Placed just above, below, or after obstacles to reward correct timing.
- Bigger point thrusters should look riskier or more special.

### Gameplay Function

Point Thrusters should reward skillful obstacle interaction:

- Jump through a high thruster above a hurdle.
- Slide through a low thruster under a barrier.
- Use power to collect a protected thruster near a wall.
- Hit a math gate correctly on the first try to unlock a multiplier thruster.
- Chain multiple thrusters to build a combo.

The player should be able to complete the course without collecting all thrusters, but the best scores should require them.

## Scoring Model

Add explicit points. Suggested first-pass values:

- Finish a level: `+1000`
- Clear an obstacle correctly: `+150`
- Collect small point thruster: `+100`
- Collect medium point thruster: `+250`
- Collect risky point thruster: `+500`
- First-try math gate: `+400`
- Math gate after wrong answer: `+150`
- No-hit level bonus: `+750`
- All math first try bonus: `+750`
- Combo streak bonus: `+50` per consecutive successful obstacle/thruster action

Penalties should reduce bonus opportunity more than directly punish:

- Obstacle bump: breaks combo and may subtract `100`.
- Wrong math answer: loses first-try bonus and breaks math streak.
- Hint use: no direct shame, but removes first-try math bonus for that gate.

## HUD Redesign

The HUD should make score dominant.

Current style is roughly:

- Time
- Math
- Hits
- Power

Recommended hierarchy:

1. Large score display: `Score 3,450`
2. Combo or streak: `Combo x4`
3. Power status
4. Math progress
5. Time as small supporting stat
6. Hits as small supporting stat

Do not make the timer visually louder than score. A player should glance at the screen and understand that points are the thing to chase.

## Results Screen Redesign

Results should lead with score:

- Big headline: `Score: 8,750`
- Secondary: stars earned
- Breakdown:
  - Thrusters collected
  - Obstacle clears
  - Math points
  - Combo bonus
  - Finish bonus
  - Penalties
  - Time bonus, if used

Stars should be derived primarily from score thresholds, not time.

Example:

- 3 stars: score >= target score
- 2 stars: score >= 70% of target score
- 1 star: completed level
- 0 stars: incomplete, if incomplete states are later added

Time can contribute a modest bonus, but it should not define success.

## Level Design Direction

Each level should have a score route:

### Yarn Yard Qualifier

- Easier thrusters near jump and slide actions.
- Teach the player that taking the right action earns points.
- First thruster should be safe and obvious.

### Frosting Factory Bake-Off

- Add medium-risk thrusters around frosting pits and mixer arms.
- Introduce combo chains.
- Put one visible high-value thruster that requires good timing.

### Birthday Beast Tower

- Highest point values.
- Thrusters tied to queen shield and bishop leap.
- Optional score route should feel exciting but not mandatory for finishing.

## Design Fixes To Carry Forward

The latest implementation also has a few behavior issues that affect design:

1. **Timer/scoring bypass:** after countdown, jump/slide/power can move or clear obstacles before `Run` starts the timer. Score work should fix this by starting the run on any meaningful action, or by disabling actions until Run.
2. **Obstacle clearing is too generous:** actions can clear matching obstacles far ahead. Point thrusters should require actual proximity/contact, not broad pre-clearing.
3. **Global pointer action handler is risky:** visible button hit zones already exist. Avoid extra coordinate mapping that can fire actions from unrelated bottom-screen taps.

These should be fixed before judging scoring feel, because they can make point collection inaccurate.

## Implementation Notes For Builder

Likely data/model changes:

- Add score fields to `ScoreSummary`.
- Add level target scores to `LevelDefinition`.
- Add point thruster definitions to level data:
  - `id`
  - `x`
  - `y`
  - `value`
  - `requiredAction?: 'jump' | 'slide' | 'power'`
  - `kind?: 'small' | 'medium' | 'risky' | 'multiplier'`

Likely scene changes:

- `PlayScene` should track `score`, `combo`, `thrustersCollected`, and score events.
- Add visible score popups at the cat position and thruster position.
- Add thruster sprites or generated placeholder textures.
- Results should show score breakdown.
- Tests should cover scoring math separately from Phaser rendering.

## Acceptance Criteria

- Score is the largest and most visually important HUD stat.
- Player can explain, after one run, how to get a higher score.
- Point Thrusters are visible before the player reaches them.
- Correctly timed jump/slide/power actions collect visible point opportunities.
- Results screen ranks success by score first, not time first.
- Timer remains present but secondary.
- A slower run with better point collection can beat a faster low-score run.
- No direct copying of Ultimate Beastmaster branding or visual identity.

## One-Sentence Creative Brief

Make this feel like a birthday obstacle-course score chase: Sergio is not just racing the clock, he is hunting big point thrusters, building combos, and trying to put up the biggest Cat Beast score.

