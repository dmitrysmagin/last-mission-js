# The Last Mission — JS Porting Plan

## Project Structure

All source files in `src/`, data/graphics/sound in `public/`.
Build with Vite (`npm run dev` / `npm run build`).

| File | Lines | Purpose |
|---|---|---|
| `main.js` | 55 | Entry point, wires everything together |
| `constants.js` | 94 | Screen sizes, game modes, scancodes, sound IDs |
| `data.js` | 21 | Static tables (SkyMap, STATUSBAR1) |
| `random.js` | 37 | Deterministic RNG (x86 LCG emulation) |
| `input.js` | 75 | Keyboard event → scancode mapping |
| `timer.js` | 54 | Fixed-timestep 60fps loop (rAF) |
| `video.js` | 207 | Backbuffer, BMP loading/parsing, splash screens |
| `sound.js` | 159 | Web Audio SFX/music loader and player |
| `sprites.js` | 417 | Canvas rendering primitives, sprite caches |
| `room.js` | 153 | Tile buffer management, room rendering |
| `world.js` | 388 | Data structures, `.dat` file parser + serializer |
| `object.js` | 1487 | Object pool, AI, weapons, collision, garages |
| `engine.js` | 951 | Game state machine, ship/base/elevator logic |
| `demo.js` | 419 | Demo recording/playback (RecordDemo disabled) |
| `editor.js` | 325 | Level editor — MAPEDIT / ROOMVIEW / ROOMEDIT modes |

---

## Porting Status

### Phase 1: Skeleton

- [x] **HTML/Canvas setup** (`index.html`, `main.js`)
- [x] **Backbuffer + display scaling** (`video.js`: `gfx_init`, `gfx_flip`)
- [x] **Fixed-timestep game loop** (`timer.js`: rAF + accumulator)
- [x] **Keyboard input** (`input.js`: event-driven scancodes)
- [x] **Constants** (`constants.js`: all scancodes, modes, sound IDs)

### Phase 2: Data Pipeline

- [x] **World loader** (`world.js`: `load_world` — full `.dat` parser)
- [x] **World serializer** (`world.js`: `save_world` — reverse of parser + download trigger)
- [x] **BMP loading** (`video.js`: `LoadSprites`, `LoadLogo`, `LoadSplash`)
- [x] **8-bit indexed BMP parser** (`video.js`: `parseIndexedBMP`)
- [x] **Room unpacker** (`room.js`: `UnpackRoom` — patterns → tile buffer)
- [x] **Sprite definitions** (`sprites.js`: `SpriteSet` — 57 entries)
- [x] **Indexed→RGBA canvas conversion** (`sprites.js`: `indexedRegionToCanvas`)
- [x] **Lazy sprite/tile/font/bg canvas caching** (Maps in `sprites.js`)
- [x] **Deterministic RNG** (`random.js`: exact x86 emulation)

### Phase 3: Graphics & Rendering

- [x] **Canvas primitives** — `PutPixel`, `DrawLine`, `DrawRect`, `FillScreen`, `ClearScreen`
- [x] **Sprite blitting** — `PutSpriteI` (opaque), `PutSpriteS` (colored shadow)
- [x] **Tile blitting** — `PutTileI`, `PutTileS` (with shadow), `PutBgI`
- [x] **Font rendering** — `PutString`, `PutStream` (from tiles row 8+)
- [x] **Logo rendering** — `PutLine` (horizontal scanline from logo canvas)
- [x] **Clip regions** — `SetClipGameArea` (save/restore for status bar)
- [x] **Room rendering** — `BlitRoom`, `BlitRoomOutlines`, `BlitBackground` (BGLINEs, sky)
- [x] **Status bar** — 7-row tile-based HUD (`BlitStatus`, `BlitStatusData`)
- [x] **Laser & BFG overlay** — `BlitLaser`, `BlitBfg`, `BlitLaserStatus`

### Phase 4: Sound

- [x] **Web Audio init** (`sound.js`: `snd_init` — AudioContext + buffer preload)
- [x] **11 SFX** — laser, short_laser, rocket_shot, cannon_shot, explode0/1/2, contact, bonus, move, elevator
- [x] **2 Music tracks** — intro + game (looping)
- [x] **SFX playback** — one-shot + looping (move, elevator)
- [x] **Music switching** — `PlayMusic` ties to game mode via `SetGameMode`
- [x] **Random explode SFX** — picks 1 of 3 variants

### Phase 5: Game Objects & Collision

- [x] **Object pool** (`object.js`: 32-slot `TSHIP` pool)
- [x] **Pool management** — `Create`, `Destroy`, `DestroyAll`, `First`/`Next` iteration
- [x] **Object flags** — 7 GOBJ_* flags (SOLID, HURTS, DESTROY, SHADOW, VISIBLE, PLAYER, WEAPON)
- [x] **AABB overlap test** — `gObj_CheckOverlap`
- [x] **Per-pixel tile collision** — `gObj_CheckTouch` (iterates object pixels vs 8x8 tiles)
- [x] **Destruction rules** — `gObj_CheckDestruction` (flag-based interaction)
- [x] **Explosion handler** — `gObj_Explode` (ship, base, enemies, bonuses, walls)
- [x] **AI dispatcher** — `gObj_Update` (23-case switch)
- [x] **EnemyFlags table** — maps AI type → GOBJ flag combo

### Phase 6: Gameplay

- [x] **Ship movement** — 4-direction + gravity, screen transitions
- [x] **Base attachment** — snap when aligned + same X
- [x] **Base+ship linked movement** — both move together (left/right)
- [x] **Base detach** — UP key when not on bridge/elevator
- [x] **Fuel system** — drains 1 unit per 25 ticks, game over at 0
- [x] **Health system** — max 3 HP, smoke at 1 HP, screen flash
- [x] **Lives system** — 10 initial, +1 per 15000 points
- [x] **Score** — per-kill, scaled by AI type × level × ship type
- [x] **Level progression** — 10 levels via elevator transitions
- [x] **Easy mode** — reduced damage, score halved, enemy bonuses
- [x] **Laser** — continuous beam, auto-extend, overheat bar (32 units)
- [x] **Machine Gun** — rapid-fire, 20-tick cooldown
- [x] **Rocket Launcher** — homing rockets, 30-tick cooldown
- [x] **BFG** — paint targets, 16-hit kill, 20-tick cooldown
- [x] **Garages** — 13 predefined, ship swapping on overlap
- [x] **Elevator** — lifts base+ship up, phase-based, seals floor
- [x] **Breakable walls** — sprite 6, clears 2 tiles on destroy
- [x] **Hidden area access** — AI 18, destroys rectangular tile block
- [x] **Bridge tiles** — AI 9, dynamic tile 245 toggle
- [x] **Smoke** — visual puff, drifts from ship at 1 HP
- [x] **Bonuses** — floating HP, Facebook, Twitter pickups
- [x] **Pause** — Enter key, "PAUSA" overlay

### Phase 7: Enemies

- [x] **AI_STATIC** — stationary, animates
- [x] **AI_RANDOM_MOVE** — wanders with random direction changes
- [x] **AI_KAMIKADZE** — chases player, or random if observer ship
- [x] **AI_ELECTRIC_SPARKLE_VERTICAL** — vertical bounce
- [x] **AI_ELECTRIC_SPARKLE_HORIZONTAL** — horizontal bounce
- [x] **AI_CEILING_CANNON** — fires kamikaze enemies downward
- [x] **AI_HOMING_MISSLE** — moves left, tracks player Y, wraps
- [x] **AI_CANNON** — turret aimed at player, fires 3-dir bullets
- [x] **AI_BULLET** — cannon projectile, random early explode
- [x] **AI_EXPLOSION** — animation, bonus spawn, restart trigger
- [x] **AI_ELEVATOR** — lifts ship+base, level transitions
- [x] **AI_GARAGE** — ship swap station
- [x] **AI_SPARE_SHIP** — docked ship in garage
- [x] **AI_BONUS** — floating collectible
- [x] **AI_SHOT** — player machine-gun bullet
- [x] **AI_HOMING_SHOT** — player rocket, targets enemies
- [x] **AI_BFG_SHOT** — oscillates speed, paints BFG targets
- [x] **AI_HIDDEN_AREA_ACCESS** — destructible wall block
- [x] **AI_LASER** — player beam, extends/retracts

### Phase 8: Screens & Menus

- [x] **Splash screen** — 4 rotating title screens, 350-tick timeout, anykey skip
- [x] **Title screen** — room + ship sprite + rotating Opera Soft logo + credits
- [x] **Game screen** — full gameplay with HUD
- [x] **Pause screen** — "PAUSA" overlay
- [x] **Game Over screen** — "HAS PERDIDO" or "NO FUERZA"
- [x] **Win screen** — scrolling marquee text + auto-ship movement
- [x] **Demo mode** — `PlayDemo` feeds recorded input, anykey returns to title

### Phase 9: Known Issues & Placeholders

- [x] **Editor mode** (`GM_EDITOR`) — MAPEDIT (browse world map), ROOMVIEW (preview room + cycle pattern/sprite sets), ROOMEDIT (move/swap patterns). Launched with `E` from title; ESC returns to title. Use `save_world` to persist changes.
- [ ] **God mode** — commented out in `gObj_Explode`
- [ ] **PublishScore / leaderboard** — placeholder only in `InitNewScreen`
- [ ] **Contact sound** — commented out in `Update_Ship` attach check
- [ ] **Frame skipping** — `frame_skip` exists but never set, always renders
- [ ] **GM_CUT mode** — defined in constants but never handled
- [ ] **Demo recording** — `RecordDemo` is disabled (`#if 0` in original C)
- [ ] **Laser collision FIXME** — hack in `gObj_CheckDestruction` (line 1152)
- [ ] **Garage collision FIXME** — hack in `gObj_CheckDestruction` (line 1166)
- [ ] **Weapon ownership FIXME** — `parent` check in `gObj_CheckDestruction` (line 1162)
- [ ] **No mobile/touch input** — keyboard only
- [ ] **`gfx_quit()`** — empty stub in `video.js`

### Phase 10: Polish & Testing

- [ ] **Verify full playthrough** — all 10 levels, all weapons, all enemy types
- [ ] **Test hidden area** — enter/exit screen 92, hidden level
- [ ] **Test garage swapping** — all 13 garages, all ship types
- [ ] **Test elevator transitions** — up/down, floor sealing
- [ ] **Test game over** — death (0 lives), fuel exhaustion
- [ ] **Test win condition** — screen procedure 3
- [ ] **Test pause/unpause** — Enter toggle, no state corruption
- [ ] **Test demo mode** — returns to title on any key
- [ ] **Test sound** — all SFX + music, looping, AudioContext resume
- [ ] **Test resize** — window resize, scaling
- [ ] **Performance benchmark** — object pool limit (32), no leaks
