# The Last Mission — JavaScript Port

A JavaScript/Canvas port of the classic SDL game "The Last Mission" — a side-view arcade game inspired by Underwurlde and Starquake. Originally for Win32, Linux, and OpenDingux.

## Play

```
npm install
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

To build for production:

```
npm run build
npm run preview
```

Serve the `dist/` directory on any static host.

## Controls

| Key | Action |
|---|---|
| Arrow keys | Move |
| Space | Fire |
| Enter | Pause |
| Escape | Quit |
| E (from title) | Level editor |

## Project Structure

```
lastmission-js/
├── index.html          # Entry HTML with fullscreen canvas
├── package.json        # Vite dev dependency
├── public/             # Static assets (served as-is)
│   ├── data/
│   │   └── lastmission.dat   # Game world data
│   ├── graphics/       # BMP sprite/tile/logo/splash files
│   └── sound/          # OGG audio files (13 files)
├── scripts/
│   └── rebuild-graphics.js   # Tool to extract sprites/tiles from reference map
└── src/
    ├── main.js         # Entry point, async init, game loop
    ├── constants.js    # Screen sizes, scancodes, sound IDs, game modes
    ├── data.js         # Static lookup tables (SkyMap, STATUSBAR1)
    ├── random.js       # Deterministic x86 LCG RNG
    ├── input.js        # Keyboard event → scancode mapping
    ├── timer.js        # Fixed-timestep 60fps loop (requestAnimationFrame)
    ├── video.js        # Backbuffer, BMP loader, splash screens
    ├── sound.js        # Web Audio SFX/music loader and player
    ├── sprites.js      # Canvas blitting, font, shadows, clip regions
    ├── room.js         # Tile buffer management, room rendering
    ├── world.js        # .dat file parser and serializer
    ├── engine.js       # Game state machine, ship/base control, screens
    ├── object.js       # Object pool, AI dispatcher, collision, weapons
    ├── demo.js         # Demo recording and playback
    └── editor.js       # Level editor (map view, room view, room edit)
```

## Port Status

Complete — all original game features have been ported:

- **Gameplay** — Ship movement with gravity, fuel, health, lives, 10 levels, 4 weapon types (laser, machine gun, rocket launcher, BFG), base attachment/detachment, garage ship swapping, elevators, breakable walls, hidden areas, bonuses
- **Enemies** — 19 AI types (kamikaze, random move, ceiling cannon, homing missile, turret cannon, electric sparkles, etc.)
- **Screens** — Splash, title with rotating logo, game with HUD, pause, game over, win with scrolling marquee, demo mode
- **Audio** — All 11 SFX + 2 music tracks via Web Audio API
- **Editor** — Full level editor (browse world map, preview rooms, edit patterns)

## Differences from the C original

- Rendered via Canvas 2D (not SDL), scaling handled by CSS `image-rendering: pixelated`
- No frame skipping (`frame_skip` exists but is never set)
- `RecordDemo` is disabled (as in the original C source)
- No mobile/touch input support
- `gfx_quit()` and `PublishScore()` are stubs

## Build Tools

- [Vite](https://vitejs.dev/) for dev server and production builds
- `scripts/rebuild-graphics.js` is a Node.js utility to re-extract BMP graphics from a reference map (uses `sharp`)
