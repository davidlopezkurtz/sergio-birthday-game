# Sergio's Ultimate Mathmaster

A tablet-first birthday game for Sergio's 7th birthday: a single-player cat obstacle-course climber with ladders, pastry pickups, chess-flavored powers, level-end baking math, and a birthday finale.

## Play

Once GitHub Pages finishes deploying, the live game should be available at:

https://davidlopezkurtz.github.io/sergio-birthday-game/

The game is designed for iPad Safari in landscape orientation, with desktop keyboard controls included for testing.

## Controls

- Move left/right: hold the left-side D-pad `Left` / `Right`, arrow keys, or `A` / `D`
- Jump/climb up: D-pad `Up`, on-screen `Jump`, `ArrowUp`, or `W`
- Duck/crawl/climb down: D-pad `Down`, on-screen `Duck`, `ArrowDown`, or `S`
- Ladders: hold `Up`/`Jump`/`ArrowUp`/`W` near a ladder to climb up; hold `Down`/`Duck`/`ArrowDown`/`S` near a ladder to climb down
- Power: on-screen `Power` or `Space`
- Start: `Space`, `Enter`, or the start button
- Bake-off games: tap the large ingredient and answer buttons

## Gameplay

- Three obstacle-course levels inspired by kid-friendly competition shows:
  - Yarn Yard Qualifier
  - Frosting Factory Bake-Off
  - Birthday Beast Tower
- Climb ladders between floors, then jump over hazards, crawl under low barriers, and use powers for special obstacles.
- Collect pastries during the action course to build the base score.
- The HUD shows the current chess badge, what power is ready, and whether it is recharging.
- Each level ends with a baking micro-game: follow the recipe, solve one ingredient math question, and multiply the course score.
- Chess powers create special movement and protection moments.
- Final results track time, bake math accuracy, obstacle hits, pastry points, bake-off bonuses, and stars.

## Development

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

## Deployment

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that builds the static site and publishes `dist/` to the `gh-pages` branch.

Vite is configured with relative asset paths so the game works from the `/sergio-birthday-game/` GitHub Pages subpath.

First-time GitHub Pages setup:

1. Open the repository on GitHub.
2. Go to `Settings` > `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Set `Branch` to `gh-pages` and folder to `/ (root)`.
5. Save.

After that one-time setting, pushes to `main` will rebuild and update the live game.

## Art Pipeline

The game currently supports code-drawn placeholder assets plus replaceable art references through the asset manifest. Visual assets from Claude Design or another art pass can be added without rewriting gameplay logic.
