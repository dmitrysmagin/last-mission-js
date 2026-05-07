import {
  GM_EXIT, GM_TITLE, GM_GAME, GM_PAUSE,
  GM_GAMEOVER, GM_YOUWIN, GM_DEMO, GM_SPLASH, GM_EDITOR,
  SCREEN_WIDTH, STATUS_YPOS,
  KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN, KEY_FIRE, KEY_PAUSE, KEY_QUIT,
  SC_ESCAPE, SC_SPACE, SC_ENTER, SC_E,
} from './constants.js';

import { GKeys, Keys, input_poll, input_reset, input_anykey } from './input.js';
import { gfx_flip, ClearScreen } from './video.js';
import {
  PutString, PutSpriteI, PutSpriteS, FillScreen, SetClipGameArea, EraseBackground
} from './sprites.js';
import {
  UnpackRoom, BlitRoom, BlitBackground, BlitRoomOutlines, rgb565ToCSS
} from './room.js';
import {
  TSHIP, gObj_Ship, gObj_First, gObj_Next, gObj_CreateObject, gObj_DestroyObject, gObj_DestroyAll,
  gObj_Constructor, gObj_Update, gObj_Explode, gObj_GetWidth, gObj_GetHeight,
  InitEnemiesFromObjects, CleanupBfg,
  _setGame, _getGame,
  DoLaser, DoBFG, ResetLaser,
  BlitLaser, BlitLaserStatus, BlitBfg, BlitEnemies,
  AI_SHIP, AI_BASE, AI_SMOKE, AI_GARAGE, AI_HIDDEN_AREA_ACCESS, AI_LASER, AI_ELEVATOR,
  AI_EXPLOSION, AI_BONUS, AI_RANDOM_MOVE, AI_KAMIKADZE, AI_SHOT, AI_HOMING_SHOT, AI_BFG_SHOT,
  AI_HOMING_MISSLE, AI_BULLET, AI_BRIDGE, AI_SPARE_SHIP, AI_STATIC, AI_CEILING_CANNON,
  AI_CANNON, AI_ELECTRIC_SPARKLE_VERTICAL, AI_ELECTRIC_SPARKLE_HORIZONTAL,
  SHIP_TYPE_LASER, SHIP_TYPE_MACHINE_GUN, SHIP_TYPE_ROCKET_LAUNCHER, SHIP_TYPE_BFG, SHIP_TYPE_OBSERVER,
  InitGaragesForNewGame, GetPlayerShipIndex, GarageSave, GarageRestore,
  GOBJ_VISIBLE, GOBJ_SHADOW, GOBJ_DESTROY, GOBJ_SOLID,
} from './object.js';

// ============================================================
// Game state (mirrors TGAMEDATA from engine.h)
// ============================================================

const MAX_GARAGES = 16;

let mode = GM_SPLASH;
let world = null;

const game = {
  mode: GM_SPLASH,
  score: 0,
  ship_screen: 0,
  base_screen: 0,
  base_restart_screen: 0,
  lives: 0,
  fuel: 0,
  health: 0,
  easy_mode: 0,
  level: 0,
  screen_bonus: 0,
  player_attached: 0,
  elevator_flag: 0,
  hidden_level_entered: 0,
  ticks_for_damage: 0,
  garages: new Array(MAX_GARAGES).fill(null).map(() => [0, 0]),
  mapx: 0, mapy: 0,
  rmapx: 0, rmapy: 0,
  world: null,
};

// ============================================================
// Engine functions
// ============================================================

export function SetGameMode(newMode) {
  mode = newMode;
  game.mode = newMode;
  // Music selection omitted for now
}

export function GameMode() {
  return mode;
}

function getscreen(mapx, mapy) {
  if (!world) return 0;
  if (mapx < 0 || mapx >= world.mapw) return 0;
  if (mapy < 0 || mapy >= world.maph) return 0;
  return world.map[mapy * world.mapw + mapx];
}

function ChangeScreen(flag) {
  let result = 0;
  switch (flag) {
    case 0: result = getscreen(game.mapx, game.mapy - 1); break; // F_UP
    case 1: result = getscreen(game.mapx + 1, game.mapy); break; // F_RIGHT
    case 2: result = getscreen(game.mapx, game.mapy + 1); break; // F_DOWN
    case 3: result = getscreen(game.mapx - 1, game.mapy); break; // F_LEFT
  }
  if (result === 0) return 0;

  const ship = gObj_Ship();
  const base = ship ? ship.base : null;

  if (result === game.base_screen && base) {
    if (flag === 3) { // F_LEFT
      if (base.x >= SCREEN_WIDTH - 32 - 40 && ship.y + 12 >= base.y) return 0;
    }
    if (flag === 1) { // F_RIGHT
      if (base.x < 32 && ship.y + 12 >= base.y) return 0;
    }
  }

  game.ship_screen = result;

  switch (flag) {
    case 0: game.mapy--; break;
    case 1: game.mapx++; break;
    case 2: game.mapy++; break;
    case 3: game.mapx--; break;
  }
  return 1;
}

function InitNewScreen() {
  UnpackRoom(world, game.ship_screen);
  InitEnemiesFromObjects(world, game.ship_screen);

  if (game.ship_screen === 92) {
    game.hidden_level_entered = 1;
  } else if (game.hidden_level_entered && game.ship_screen === 1) {
    GarageSave();
    // PublishScore() placeholder
  }
  CleanupBfg();
}

function GameLevelFromScreen(screen) {
  const levels = [8, 15, 22, 29, 36, 43, 50, 55, 62, 70];
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] > screen) return i + 1;
  }
  return 10;
}

function ReEnableBase(base) {
  if (game.base_screen !== game.ship_screen) {
    base.state = 2; // SH_HIDDEN
  } else {
    base.state = 1; // SH_ACTIVE
  }
}

function UpdateFuel() {
  if (--game._fuel_counter <= 0) {
    game._fuel_counter = 25;
    if (game.fuel === 0) {
      SetGameMode(GM_GAMEOVER);
      input_reset();
      PutString(8 * 16, 8 * 10, 'NO FUERZA');
      return 1;
    }
    game.fuel -= 1;
  } else {
    // counter was already decremented
  }
  return 0;
}

function Update_Ship(ship) {
  const base = ship.base;

  if (--game.ticks_for_damage < 0) game.ticks_for_damage = 0;

  // Weapon dispatch
  switch (ship.i) {
    case SHIP_TYPE_ROCKET_LAUNCHER:
      // DoRocketLauncher
      break;
    case SHIP_TYPE_MACHINE_GUN:
      // DoMachineGun
      break;
    case SHIP_TYPE_BFG:
      DoBFG(ship);
      break;
    case SHIP_TYPE_LASER:
      DoLaser(ship);
      break;
  }

  // Attach check
  if (base && base.state === 1 && base.ai_type !== AI_EXPLOSION && game.player_attached === 0) {
    if (ship.cur_frame === ship.max_frame || ship.cur_frame === ship.min_frame) {
      const xs = gObj_GetWidth(ship);
      const ys = gObj_GetHeight(ship);
      const xb = gObj_GetWidth(base);
      if ((ship.x + xs / 2 === base.x + xb / 2) && (ship.y + ys === base.y)) {
        game.player_attached = 1;
        // PlaySoundEffect(SND_CONTACT);
      }
    }
  }

  if (game.player_attached === 1 || ship.state === 0) return;

  // Movement
  if (GKeys[KEY_RIGHT] === 1) {
    if (ship.cur_frame === ship.min_frame) {
      if (gObj_CheckTouch(ship.x + 2, ship.y, ship) === 0) {
        ship.x += 2;
      } else {
        if (ship.x === SCREEN_WIDTH - gObj_GetWidth(ship) && ChangeScreen(1)) {
          ship.x = 0; InitNewScreen(); ReEnableBase(ship.base);
        }
      }
    } else {
      if (ship.anim_speed_cnt === 0) {
        ship.cur_frame -= 1;
        ship.anim_speed_cnt = ship.anim_speed;
      } else {
        ship.anim_speed_cnt -= 1;
      }
    }
  }

  if (GKeys[KEY_LEFT] === 1) {
    if (ship.cur_frame === ship.max_frame) {
      if (gObj_CheckTouch(ship.x - 2, ship.y, ship) === 0) {
        ship.x -= 2;
      } else {
        if (ship.x === 0 && ChangeScreen(3)) {
          ship.x = SCREEN_WIDTH - gObj_GetWidth(ship);
          InitNewScreen(); ReEnableBase(ship.base);
        }
      }
    } else {
      if (ship.anim_speed_cnt === 0) {
        ship.cur_frame += 1;
        ship.anim_speed_cnt = ship.anim_speed;
      } else {
        ship.anim_speed_cnt -= 1;
      }
    }
  }

  let dy;
  if (GKeys[KEY_UP] === 1) {
    dy = (ship.y & 1) ? 1 : 2;
    if (gObj_CheckTouch(ship.x, ship.y - dy, ship) === 0) {
      ship.y -= dy;
    } else {
      if (ship.y === 0 && ChangeScreen(0)) {
        ship.y = ACTION_SCREEN_HEIGHT - gObj_GetHeight(ship);
        InitNewScreen(); ReEnableBase(ship.base);
      }
    }
  } else if (GKeys[KEY_DOWN] === 1) {
    dy = (ship.y & 1) ? 1 : 2;
    if (gObj_CheckTouch(ship.x, ship.y + dy, ship) === 0) {
      ship.y += dy;
    } else {
      if (ship.y === ACTION_SCREEN_HEIGHT - gObj_GetHeight(ship) && ChangeScreen(2)) {
        ship.y = 0; InitNewScreen(); ReEnableBase(ship.base);
      }
    }
  } else {
    // Gravity
    if (gObj_CheckTouch(ship.x, ship.y + 1, ship) === 0)
      ship.y += 1;
    if (ship.y === ACTION_SCREEN_HEIGHT - gObj_GetHeight(ship) && ChangeScreen(2)) {
      ship.y = 0; InitNewScreen(); ReEnableBase(ship.base);
    }
  }
}

function InitShip() {
  GarageRestore();
  gObj_DestroyAll();

  const ship = gObj_CreateObject();
  const base = gObj_CreateObject();

  base.x = 148;
  base.y = 104;
  base.i = 1;
  base.min_frame = 0;
  base.cur_frame = 0;
  base.max_frame = 1;
  base.anim_speed = 0;
  base.anim_speed_cnt = 0;
  base.parent = ship;
  gObj_Constructor(base, AI_BASE);

  ship.i = GetPlayerShipIndex();
  ship.x = 148 + (gObj_GetWidth(base) - gObj_GetWidth(ship)) / 2;
  ship.y = 68;
  ship.base = base;
  ship.smoke = null;
  ship.laser = null;

  switch (ship.i) {
    case SHIP_TYPE_LASER:
    case SHIP_TYPE_MACHINE_GUN:
    case SHIP_TYPE_ROCKET_LAUNCHER:
      ship.max_frame = 6;
      ship.min_frame = 0;
      break;
    case SHIP_TYPE_OBSERVER:
      ship.max_frame = 3;
      ship.min_frame = 1;
      break;
    case SHIP_TYPE_BFG:
      ship.min_frame = 0;
      ship.max_frame = 4;
      break;
  }

  ship.cur_frame = ((game.level & 1) === 0) ? ship.max_frame : ship.min_frame;
  ship.anim_speed = 1;
  ship.anim_speed_cnt = 1;
  gObj_Constructor(ship, AI_SHIP);
}

function InitNewGame() {
  game.fuel = 5000;
  game.lives = 10;
  game.health = 3;
  game.score = 0;
  game.ship_screen = 1; // GAME_START_SCREEN
  game.base_screen = 1;
  game.base_restart_screen = 1;
  game.level = GameLevelFromScreen(1);
  game.player_attached = 0;
  game.hidden_level_entered = 0;
  game._fuel_counter = 25;
  game.rmapx = game.mapx = 0;
  game.rmapy = game.mapy = 11;

  InitGaragesForNewGame();
  InitShip();
  InitNewScreen();
}

function RenderGame(renderStatus) {
  SetClipGameArea(1);
  BlitBackground(world, game.ship_screen);
  BlitRoomOutlines(world, game.ship_screen);

  // Enemy outlines (shadows)
  let gobj = gObj_First();
  for (; gobj; gobj = gObj_Next(gobj)) {
    if (gobj.flags & GOBJ_SHADOW) {
      const shadowCSS = rgb565ToCSS(world.room[game.ship_screen].shadow);
      PutSpriteS(gobj.x, gobj.y, gobj.i, gobj.cur_frame, shadowCSS);
    }
  }

  BlitRoom();
  BlitBfg();

  // Blit enemies
  gobj = gObj_First();
  for (; gobj; gobj = gObj_Next(gobj)) {
    if (gobj.ai_type === AI_GARAGE) {
      // debug rect — skip
    } else if (gobj.ai_type === AI_HIDDEN_AREA_ACCESS) {
      // debug rect — skip
    }
    if (gobj.ai_type === AI_LASER) {
      BlitLaser(gobj);
    } else if (gobj.flags & GOBJ_VISIBLE) {
      PutSpriteI(gobj.x, gobj.y, gobj.i, gobj.cur_frame);
    }
  }

  SetClipGameArea(0);

  if (renderStatus) {
    // BlitStatusData would go here
  }
}

// ============================================================
// DoGame state machine
// ============================================================

function DoGame() {
  switch (mode) {
    case GM_SPLASH:
      ClearScreen();
      PutString(80, 100, 'THE LAST MISSION');
      PutString(88, 120, 'SDL - JS PORT');
      PutString(96, 140, 'PHASE 3');
      mode = GM_TITLE;
      break;

    case GM_TITLE:
      if (world && world.room.length > 1) {
        // Render room 1 to prove everything works
        UnpackRoom(world, 1);
        BlitBackground(world, 1);
        BlitRoom();
        PutSpriteI(148, 68, 0, 0);
        PutSpriteI(148, 104, 1, 0);
      } else {
        ClearScreen();
        PutString(40, 100, 'WORLD DATA NOT LOADED');
      }
      PutString(80, 224, 'ESC - SALIR  ESP - JUGAR');

      if (Keys[SC_ESCAPE]) { mode = GM_EXIT; }
      if (Keys[SC_SPACE] || Keys[SC_ENTER]) {
        game.easy_mode = 1;
        ClearScreen();
        SetGameMode(GM_GAME);
        input_reset();
        InitNewGame();
      }
      break;

    case GM_GAME:
    case GM_DEMO:
      // Game keys
      GKeys[KEY_LEFT] = Keys[SC_LEFT] ? 1 : 0;
      GKeys[KEY_RIGHT] = Keys[SC_RIGHT] ? 1 : 0;
      GKeys[KEY_UP] = Keys[SC_UP] ? 1 : 0;
      GKeys[KEY_DOWN] = Keys[SC_DOWN] ? 1 : 0;
      GKeys[KEY_FIRE] = Keys[SC_SPACE] ? 1 : 0;
      GKeys[KEY_PAUSE] = Keys[SC_ENTER] ? 1 : 0;
      GKeys[KEY_QUIT] = Keys[SC_ESCAPE] ? 1 : 0;

      if (GKeys[KEY_PAUSE]) {
        PutString(8 * 17, 8 * 17, 'PAUSA');
        SetGameMode(GM_PAUSE);
        Keys[SC_ENTER] = 0;
        break;
      }

      if (Keys[SC_ESCAPE]) {
        ClearScreen();
        SetGameMode(GM_TITLE);
        input_reset();
        break;
      }

      // Update ship
      const ship = gObj_Ship();
      if (ship) {
        Update_Ship(ship);
      }

      // Update all objects
      let gobj = gObj_First();
      for (; gobj; gobj = gObj_Next(gobj)) {
        gObj_Update(gobj);
      }

      RenderGame(1);
      break;

    case GM_PAUSE:
      GKeys[KEY_LEFT] = Keys[SC_LEFT] ? 1 : 0;
      GKeys[KEY_RIGHT] = Keys[SC_RIGHT] ? 1 : 0;
      GKeys[KEY_UP] = Keys[SC_UP] ? 1 : 0;
      GKeys[KEY_DOWN] = Keys[SC_DOWN] ? 1 : 0;
      GKeys[KEY_FIRE] = Keys[SC_SPACE] ? 1 : 0;
      GKeys[KEY_PAUSE] = Keys[SC_ENTER] ? 1 : 0;
      GKeys[KEY_QUIT] = Keys[SC_ESCAPE] ? 1 : 0;

      if (GKeys[KEY_PAUSE]) {
        PutString(8 * 17, 8 * 17, '     ');
        SetGameMode(GM_GAME);
        Keys[SC_ENTER] = 0;
      }
      break;

    case GM_GAMEOVER:
      if (input_anykey()) {
        SetGameMode(GM_TITLE);
        input_reset();
      }
      break;

    case GM_YOUWIN:
      break;

    case GM_EDITOR:
      break;
  }
}

// ============================================================
// Game loop entry point
// ============================================================

export function GameLoop(worldData) {
  world = worldData;
  game.world = worldData;

  // Register game state with object system
  _setGame(game);

  mode = GM_SPLASH;

  function step() {
    input_poll();
    DoGame();
    gfx_flip();
  }

  return step;
}
