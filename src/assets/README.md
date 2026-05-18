# Replaceable Art Assets

The game now uses the Claude Design PNG sprites in `src/assets/images/`.
Phaser-generated textures remain as fallbacks if a manifest entry has no `url`.

Stable display sizes:

- `cat`: 180x130
- `catSlide`: 190x90
- obstacles: 160x160
- chess powerups: 128x128
- `gate`: 180x220
- `star`: 96x96

The manifest includes both 1x PNG URLs and `highDpiUrl` entries for the
`-2x.png` variants. `BootScene` preloads the high-DPI image when
`window.devicePixelRatio > 1`, and scenes normalize display sizes back to these
logical dimensions so collision and layout tuning stays stable.
