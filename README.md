# Sergio's Ultimate Mathmaster

A tablet-first birthday game for Sergio's 7th birthday: a single-player cat obstacle-course climb with math gates, chess-flavored powers, baking micro-games, and a birthday finale.

## Play

Once GitHub Pages finishes deploying, the live game should be available at:

https://davidlopezkurtz.github.io/sergio-birthday-game/

The game is designed for iPad Safari in landscape orientation, with desktop keyboard controls included for testing.

## Controls

- Move left/right: hold on-screen `Back` / `Run`, arrow keys, or `A` / `D`
- Jump: on-screen `Jump`, `ArrowUp`, or `W`
- Slide/drop: on-screen `Slide`, `ArrowDown`, or `S`
- Power: on-screen `Power` or `Space`
- Start: `Space`, `Enter`, or the start button
- Math gates and baking games: tap the large answer/action buttons

## Gameplay

- Three obstacle-course levels inspired by kid-friendly competition shows:
  - Yarn Yard Qualifier
  - Frosting Factory Bake-Off
  - Birthday Beast Tower
- Math gates pause the course and ask one multiple-choice problem.
- Wrong answers give hints and a small time penalty, with gentle retries.
- Baking stations trigger short micro-games inside the Frosting Factory level.
- Chess powers create special movement and protection moments.
- Final results track time, math accuracy, obstacle hits, hints, bake-off bonuses, and stars.

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
