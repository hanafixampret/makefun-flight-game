# Ridge Runner — Alpine Air Rally

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/rank/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward $500](https://make.fun/badge/reward/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete, original 3D flight game that runs offline in a desktop browser from
static files. Fly a red bush plane through an alpine valley: take off from the
runway, thread golden rings, mind your fuel, and land gently to refuel.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with any static
server — `node serve.ts` is not included; `python3 -m http.server` works). No
network requests, no installs.

- **Fly:** Arrow keys or W A S D — pitch and bank. **Shift / Ctrl** — throttle
  up / down. **Mouse** — move to steer as well.
- **C** — chase / cockpit camera. **R** — restart a sortie. **Esc** — menu.
  **M** — mute.
- **Goal:** fly through the golden rings in order. Each ring is worth 100
  points. Fuel burns with throttle — land on the runway to refuel. Touch the
  terrain or run dry in the air and the sortie ends.

## Sorties

- **Ring Run** — fly all 10 rings, with a time bonus for finishing fast.
- **Canyon Dash** — reach the far beacon in 150 seconds.
- **Free Flight** — explore the valley; the rings respawn when you clear them.

## What is in the game

- A 2,400 m alpine valley built from seeded value noise: grass slopes, rocky
  peaks with snow, a lake, pine forest, drifting clouds, a lit runway with a
  windsock and a hangar.
- A low-poly bush plane with a spinning prop, moving ailerons and elevator,
  and wingtip nav lights.
- A full HUD: airspeed, altitude, compass, attitude ball, fuel and throttle
  gauges, score, rings and a timer — plus a cockpit camera with a glareshield
  and a fading prop disc.
- Synthesized sound only: engine hum, wind rush, ring chimes, crash thud.
  Nothing is loaded from the network; the only library is three.js, vendored
  under `game/vendor/`.

## Files

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
- `game/index.html` — the page. `game/src/` — one job per file: noise,
  terrain, aircraft, input, audio, HUD, missions, main loop.
- `game/vendor/three.min.js` — three.js r160, vendored as a minified build.
- `screenshots/` — four real renders of the game: takeoff, rings, cockpit,
  vista.

## License

SPDX-License-Identifier: MIT — see `LICENSE`.
