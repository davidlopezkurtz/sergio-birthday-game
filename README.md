# Sergio's Ultimate Mathmaster

A tablet-first birthday game for Sergio's 7th birthday: a single-player cat obstacle-course climb with math gates, chess-flavored powers, baking micro-games, and a birthday finale.

## Play

Once GitHub Pages finishes deploying, the live game should be available at:

https://davidlopezkurtz.github.io/sergio-birthday-game/

The game is designed for iPad Safari in landscape orientation, with desktop keyboard controls included for testing.

## Controls

- Move left/right: on-screen arrows or `A` / `D`
- Jump: on-screen jump button or `Space`
- Slide/drop: on-screen slide button or `S`
- Power: on-screen power button or `Shift`
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

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that builds the static site and deploys `dist/` to GitHub Pages.

Vite is configured with relative asset paths so the game works from the `/sergio-birthday-game/` GitHub Pages subpath.

## Art Pipeline

The game currently supports code-drawn placeholder assets plus replaceable art references through the asset manifest. Visual assets from Claude Design or another art pass can be added without rewriting gameplay logic.
