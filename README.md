# Solmar City

[![make.fun · gta6-01](https://make.fun/bounty/gta6-01)](https://make.fun/bounty/gta6-01)

An original open-world crime game that runs in a desktop browser from its own files — no
network, no build step. You are Mara Voss, a courier driver who owes the harbour crew five
jobs. Steal cars, outrun the harbour police, and run the jobs across Solmar City, a sun-soaked
coastal town of your own invention: Downtown, the Marina, Old Harbour, Northgate, Sunset Hills
and the East Docks.

## Play

Serve `game/` with any static server (or `node serve.ts`) and open `game/index.html` in
desktop Chrome.

- **WASD / arrows** — move on foot, drive in a car
- **Shift** — sprint
- **E** — enter or leave a car (stealing an occupied car raises your wanted level)
- **Mouse + click** — aim and shoot; **F** — punch
- **Space** — brake / handbrake
- **P** — pause (progress saves) · **M** — mute · **R** — restart the story (on the pause screen)

## The game

- A city to explore on foot and by car: six districts, a beach and marina, parks and plazas
- Traffic that drives the road grid and pedestrians who stroll the sidewalks (and flee gunfire)
- Cars to steal and drive, each with its own name, colour and handling
- A wanted level (0–5 stars) with police cars and foot officers who chase, ram and shoot
- Five story missions with a timer, a police escape, a courier intercept and a warehouse
  shootout — plus free roam once the story is done
- Combat on foot, car damage and wrecks, a HUD with health, money, wanted stars, a mission
  objective and a live minimap
- Synthesised WebAudio sound and a bass music loop — no audio files
- Saves to localStorage: money, mission progress and position

## Files

- `game/index.html` — the page; `game/src/` — the game's own source, one job per file:
  `config` (world and story data), `random`, `input`, `audio`, `world` (city generation),
  `traffic`, `police`, `missions`, `combat`, `player`, `render`, `hud`, `save`, `shots`, `main`
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local playtesting
- `screenshots/` — four real renders of the game running in a browser

## Licence

MIT — see `LICENSE`. Solmar City, Mara Voss and the harbour crew are invented for this game;
nothing here comes from any commercial game.
