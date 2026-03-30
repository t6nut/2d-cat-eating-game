# Kitten Pizza Catch

A tiny endless 2D pixel-art Phaser game prototype.

## GitHub Pages Demo

This repo is configured to auto-deploy to GitHub Pages from `main` using GitHub Actions.

1. Push to `main`.
2. In GitHub, open `Settings > Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Wait for the `Deploy static site to Pages` workflow to finish.

Demo URL:

- `https://t6nut.github.io/2d-cat-eating-game/`

## Setup

1. Open `index.html` in VS Code Live Server, or
2. Run a static server from this folder, for example:
   - `npx serve .`

## Play

- You must select all options before Start unlocks on the title screen:
   - Character: Orange Cat, Tuxedo Cat, or Pikatchu
   - Mode: Easy, Medium, Hard
   - Theme: Day or Night
   - Zombies: On or Off
- Easy mode is tuned to be easier:
   - Slices and pizzas fall slower
   - Airplane fly-by is slower
   - Growth ramps faster
- Move kitten with `A/D` or `Left/Right`
- Jump with `Up Arrow` or `W` (required when zombies are enabled)
- Catch falling pizza slices to grow
- 5-10% of drops are full pizzas from a fly-by airplane
- Full pizzas grant 5x growth compared to slices
- Night theme adds stars, moon, moonshine, and a cat flashlight glow
- Zombies mode spawns walkers you can jump over or stomp on their head
- Press `R` in-game to return to the title options screen
