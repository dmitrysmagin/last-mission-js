import {
  GM_EXIT, GM_TITLE, GM_GAME, GM_PAUSE,
  GM_GAMEOVER, GM_YOUWIN, GM_DEMO, GM_SPLASH, GM_EDITOR,
  SCREEN_WIDTH, STATUS_YPOS,
  KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN, KEY_FIRE, KEY_PAUSE, KEY_QUIT,
  SC_LEFT, SC_RIGHT, SC_UP, SC_DOWN,
  SC_ESCAPE, SC_SPACE, SC_ENTER, SC_E,
  MUSIC_STOP, MUSIC_INTRO, MUSIC_GAME,
  ACTION_SCREEN_HEIGHT,
  SND_SHORT_LASER_SHOOT, SND_ROCKET_SHOOT, SND_MOVE, SND_ELEVATOR, SND_CONTACT,
} from './constants.js';

import { GKeys, Keys, input_poll, input_reset, input_anykey } from './input.js';
import { PlaySoundEffect, StopSoundEffect, PlayMusic } from './sound.js';
import { gfx_flip, ClearScreen, ctx, logoWidth, logoHeight } from './video.js';
import {
  PutString, PutSpriteI, PutSpriteS, PutStream, FillScreen, SetClipGameArea, EraseBackground, PutLine
} from './sprites.js';
import { STATUSBAR1 } from './data.js';
import {
  UnpackRoom, BlitRoom, BlitBackground, BlitRoomOutlines, rgb565ToCSS, GetTileI, SetTileI
} from './room.js';
import {
  TSHIP, gObj_Ship, gObj_First, gObj_Next, gObj_CreateObject, gObj_DestroyObject, gObj_DestroyAll,
  gObj_Constructor, gObj_Update, gObj_Explode, gObj_GetWidth, gObj_GetHeight,
  InitEnemiesFromObjects, CleanupBfg,
  _setGame, _getGame,
  DoLaser, DoBFG, ResetLaser, UpdateLaserCounter, UpdateAnimation,
  BlitLaser, BlitLaserStatus, BlitBfg,
  AI_SHIP, AI_BASE, AI_SMOKE, AI_GARAGE, AI_HIDDEN_AREA_ACCESS, AI_LASER, AI_ELEVATOR,
  AI_EXPLOSION, AI_BONUS, AI_RANDOM_MOVE, AI_KAMIKADZE, AI_SHOT, AI_HOMING_SHOT, AI_BFG_SHOT,
  AI_HOMING_MISSLE, AI_BULLET, AI_BRIDGE, AI_SPARE_SHIP, AI_STATIC, AI_CEILING_CANNON,
  AI_CANNON, AI_ELECTRIC_SPARKLE_VERTICAL, AI_ELECTRIC_SPARKLE_HORIZONTAL,
  SHIP_TYPE_LASER, SHIP_TYPE_MACHINE_GUN, SHIP_TYPE_ROCKET_LAUNCHER, SHIP_TYPE_BFG, SHIP_TYPE_OBSERVER,
  InitGaragesForNewGame, GetPlayerShipIndex, GarageSave, GarageRestore,
  GOBJ_VISIBLE, GOBJ_SHADOW, GOBJ_DESTROY, GOBJ_SOLID,
  gObj_CheckTouch
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

let screen_procedure = 0;
let frame_skip = 0;

// ============================================================
// Engine functions
// ============================================================

export function SetGameMode(newMode) {
  mode = newMode;
  game.mode = newMode;

  switch (newMode) {
    case GM_TITLE:
      PlayMusic(MUSIC_INTRO);
      break;
    case GM_GAME:
    case GM_DEMO:
      PlayMusic(MUSIC_GAME);
      break;
    case GM_GAMEOVER:
      PlayMusic(MUSIC_INTRO);
      break;
    case GM_YOUWIN:
      PlayMusic(MUSIC_INTRO);
      break;
    case GM_SPLASH:
      PlayMusic(MUSIC_STOP);
      break;
  }
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

export function ChangeScreen(flag) {
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

export function InitNewScreen() {
  UnpackRoom(world, game.ship_screen);
  screen_procedure = world.room[game.ship_screen].procedure;
  InitEnemiesFromObjects(world, game.ship_screen);

  if (game.ship_screen === 92) {
    game.hidden_level_entered = 1;
  } else if (game.hidden_level_entered && game.ship_screen === 1) {
    GarageSave();
    // PublishScore() placeholder
  }
  CleanupBfg();
}

let mg_timeout = 0;

function DoMachineGun(ship) {
  if (--mg_timeout < 0) mg_timeout = 0;

  if (GKeys[KEY_FIRE] === 1) {
    if (UpdateLaserCounter(1)) {
      gObj_Explode(ship);
      input_reset();
      return;
    }

    if (!mg_timeout) {
      if (!(ship.cur_frame === ship.min_frame || ship.cur_frame === ship.max_frame))
        return;

      const bullet = gObj_CreateObject();
      bullet.i = 50;
      bullet.x = ship.x + (ship.cur_frame === ship.min_frame ? 32 : -8);
      bullet.y = ship.y + 5;
      bullet.dy = 0;
      bullet.dx = (ship.cur_frame === ship.min_frame) ? 5 : -5;
      bullet.anim_speed = 4;
      bullet.anim_speed_cnt = bullet.anim_speed;
      bullet.move_speed_cnt = bullet.move_speed;
      bullet.cur_frame = (ship.cur_frame === ship.min_frame) ? 0 : 1;
      gObj_Constructor(bullet, AI_SHOT);
      bullet.parent = ship;

      mg_timeout = 20;
      PlaySoundEffect(SND_SHORT_LASER_SHOOT);
    }
  } else {
    UpdateLaserCounter(-1);
    mg_timeout = 0;
  }
}

let rl_timeout = 0;

function DoRocketLauncher(ship) {
  if (--rl_timeout < 0) rl_timeout = 0;

  if (GKeys[KEY_FIRE] === 1) {
    if (!rl_timeout) {
      if (!(ship.cur_frame === ship.min_frame || ship.cur_frame === ship.max_frame))
        return;

      const bullet = gObj_CreateObject();
      bullet.i = 54;
      bullet.y = ship.y + 1;
      bullet.dy = 0;
      bullet.anim_speed = 4;
      bullet.anim_speed_cnt = bullet.anim_speed;
      bullet.move_speed_cnt = bullet.move_speed;
      gObj_Constructor(bullet, AI_HOMING_SHOT);
      bullet.parent = ship;

      if (ship.cur_frame === ship.min_frame) {
        bullet.x = ship.x + 32;
        bullet.dx = 3;
        bullet.cur_frame = 2;
        bullet.min_frame = 2;
        bullet.max_frame = 3;
      } else {
        bullet.x = ship.x - 14;
        bullet.dx = -3;
        bullet.cur_frame = 0;
        bullet.max_frame = 1;
      }

      rl_timeout = 30;
      PlaySoundEffect(SND_ROCKET_SHOOT);
    }
  }
}

// ---- Helper functions for Update_Base ----

function ShipBaseOffset(ship, base) {
  const xs = gObj_GetWidth(ship);
  const xb = gObj_GetWidth(base);
  return ((xb - xs) / 2) | 0;
}

// ---- Update_Base: handles base movement when attached to ship ----

export function Update_Base(base) {
  const ship = gObj_Ship();
  if (!ship) return;

  if (game.player_attached === 1 && ship.ai_type !== AI_EXPLOSION) {
    let playMoveSound = 0;

    if (GKeys[KEY_RIGHT] === 1) {
      if (ship.cur_frame === ship.min_frame) {
        base.cur_frame ^= 1;
        playMoveSound = 1;

        const shipCollision = gObj_CheckTouch(ship.x + 2, ship.y, ship);
        const baseCollision = gObj_CheckTouch(base.x + 2, base.y, base);

        if (shipCollision + baseCollision === 0) {
          if (GetTileI((base.x + 40) >> 3, (base.y + 16) >> 3)) {
            ship.x += 2;
            base.x += 2;
          }
        } else {
          if (base.x === 280 && ChangeScreen(1)) {
            ship.x = ShipBaseOffset(ship, base);
            base.x = 0;
            game.base_screen = game.ship_screen;
            InitNewScreen();
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
        base.cur_frame ^= 1;
        playMoveSound = 1;

        const shipCollision = gObj_CheckTouch(ship.x - 2, ship.y, ship);
        const baseCollision = gObj_CheckTouch(base.x - 2, base.y, base);

        if (shipCollision + baseCollision === 0) {
          if (GetTileI((base.x - 2) >> 3, (base.y + 16) >> 3)) {
            ship.x -= 2;
            base.x -= 2;
          }
        } else {
          if (base.x === 0 && ChangeScreen(3)) {
            ship.x = 280 + ShipBaseOffset(ship, base);
            base.x = 280;
            game.base_screen = game.ship_screen;
            InitNewScreen();
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

    if (playMoveSound) {
      PlaySoundEffect(SND_MOVE);
    } else {
      StopSoundEffect(SND_MOVE);
    }

    if (GKeys[KEY_UP] === 1) {
      // If bound with base and standing on a bridge - don't allow to fly up
      for (let f = 0; f <= 3; f++) {
        if (GetTileI(((base.x + 8) >> 3) + f, (base.y + 16) >> 3) === 245) {
          return;
        }
      }

      // If standing on an elevator which is lifting up - don't allow to fly up
      if (game.elevator_flag === 1) {
        return;
      }

      StopSoundEffect(SND_MOVE);

      game.player_attached = 0;
      ship.y -= 2;
    }
  }
}

function UpdateLives() {
  game.lives -= 1;
  game.health = 3;

  StopSoundEffect(SND_ELEVATOR);
  StopSoundEffect(SND_MOVE);

  if (game.lives === 0) {
    SetGameMode(GM_GAMEOVER);
    input_reset();
    PutString(8 * 16, 8 * 10, 'HAS PERDIDO');
    return 1;
  }
  return 0;
}

function RestartLevel() {
  if (UpdateLives() === 1) return;

  game.player_attached = 0;
  game.ship_screen = game.base_restart_screen;
  game.base_screen = game.base_restart_screen;
  game.elevator_flag = 0;

  game.mapx = game.rmapx;
  game.mapy = game.rmapy;

  InitShip();
  InitNewScreen();
}

function BlitStatus() {
  for (let i = 0; i < 7; i++) {
    PutStream(0, STATUS_YPOS + i * 8, STATUSBAR1[i].slice(2));
  }
}

function BlitStatusData() {
  const sb = [];

  // level
  sb[0] = String(game.level).padStart(2, '0');
  PutString(8 * 16, STATUS_YPOS + 16, sb[0]);

  // fuel
  PutString(8 * 14, STATUS_YPOS + 24, String(game.fuel).padStart(4, '0'));

  // score
  PutString(8 * 10, STATUS_YPOS + 32, String(game.score).padStart(8, '0'));

  // health bar
  for (let y = 0; y < 3; y++) {
    const tile = (game.health > y) ? 84 : 88;
    PutStream(8 * 19, STATUS_YPOS + 8 * (4 - y), [tile, tile, 0]);
  }

  // laser
  BlitLaserStatus();

  // lives
  PutString(8 * 28, STATUS_YPOS + 24, String(game.lives).padStart(2, '0'));
}

function DestroyHiddenAreaAccess(obj, playEffects) {
  for (let y = 0; y < obj.dy; y++) {
    const ay = obj.y + y;
    for (let x = 0; x < obj.dx; x++) {
      const ax = obj.x + x;
      SetTileI(ax >> 3, ay >> 3, 0);

      if (playEffects && !(y & 15) && !(x & 15) && (ay + 16 < ACTION_SCREEN_HEIGHT)) {
        // Create wall explosion effect
        const exp = gObj_CreateObject();
        exp.i = 7;
        exp.x = ax;
        exp.y = ay;
        exp.anim_speed = 6;
        exp.anim_speed_cnt = 6;
        exp.max_frame = 2;
        gObj_Constructor(exp, AI_EXPLOSION);
      }
    }
  }

  if (playEffects) {
    PlaySoundEffect(SND_EXPLODE);
  }

  gObj_DestroyObject(obj);
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

let fuel_cnt = 25;

function UpdateFuel() {
  if (fuel_cnt === 0) {
    if (game.fuel === 0) {
      SetGameMode(GM_GAMEOVER);
      input_reset();
      PutString(8 * 16, 8 * 10, 'NO FUERZA');
      return 1;
    }
    game.fuel -= 1;
    fuel_cnt = 25;
  } else {
    fuel_cnt -= 1;
  }
  return 0;
}

export function Update_Ship(ship) {
  const base = ship.base;

  if (--game.ticks_for_damage < 0) game.ticks_for_damage = 0;

  // Weapon dispatch
  switch (ship.i) {
    case SHIP_TYPE_ROCKET_LAUNCHER:
      DoRocketLauncher(ship);
      break;
    case SHIP_TYPE_MACHINE_GUN:
      DoMachineGun(ship);
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
      if ((ship.x + ((xs / 2) | 0) === base.x + ((xb / 2) | 0)) && (ship.y + ys === base.y)) {
        game.player_attached = 1;
        // PlaySoundEffect(SND_CONTACT);
      }
    }
  }

  if (game.player_attached === 1 || UpdateFuel() === 1 || ship.state === 0) return;

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
  ship.x = 148 + ((gObj_GetWidth(base) - gObj_GetWidth(ship)) / 2) | 0;
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
  game.rmapx = game.mapx = 0;
  game.rmapy = game.mapy = 11;

  InitGaragesForNewGame();
  InitShip();
  InitNewScreen();
  BlitStatus();
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
    BlitStatusData();
  }
}

// ============================================================
// DoGame state machine
// ============================================================

let title_start_flag = 0;
let youwin_start_flag = 0;

// RotateLogo animation state
let logo_num_of_lines = 0;
let logo_speed = 2;
let logo_mirror = 0;
let logo_sign = 1;

function RotateLogo() {
  if (logo_speed > 0) {
    logo_speed -= 1;
    return;
  }
  logo_speed = 2;

  const divisor = 23.0 / (23.0 - logo_num_of_lines);
  let iterator = 0.0;

  // Clear logo area
  ctx.fillStyle = '#000';
  ctx.fillRect(96, 142, logoWidth, logoHeight + 1);

  for (let i = logo_num_of_lines; i < 24; i++) {
    PutLine(96, (logo_mirror === 0 ? 142 + i : 142 + 46 - i), iterator | 0);
    PutLine(96, (logo_mirror === 0 ? 142 + 46 - i : 142 + i), 46 - (iterator | 0));
    iterator += divisor;
  }

  logo_num_of_lines += logo_sign;
  if (logo_num_of_lines >= 23) {
    logo_mirror ^= 1;
    logo_sign = -logo_sign;
  }
  if (logo_num_of_lines <= 0) {
    logo_num_of_lines = 0;
    logo_sign = -logo_sign;
  }
}

function DoKeys() {
  if (mode !== GM_DEMO) {
    GKeys[KEY_LEFT] = Keys[SC_LEFT] ? 1 : 0;
    GKeys[KEY_RIGHT] = Keys[SC_RIGHT] ? 1 : 0;
    GKeys[KEY_UP] = Keys[SC_UP] ? 1 : 0;
    GKeys[KEY_DOWN] = Keys[SC_DOWN] ? 1 : 0;
    GKeys[KEY_FIRE] = Keys[SC_SPACE] ? 1 : 0;
    GKeys[KEY_PAUSE] = Keys[SC_ENTER] ? 1 : 0;
    GKeys[KEY_QUIT] = Keys[SC_ESCAPE] ? 1 : 0;
  }
}

function DoSplash() {
  if (!world || world.room.length <= 1) {
    ClearScreen();
    PutString(40, 100, 'ERROR CARGANDO DATOS');
    mode = GM_TITLE;
    return;
  }
  ClearScreen();
  PutString(80, 100, 'THE LAST MISSION');
  PutString(88, 120, 'SDL - JS PORT');
  if (input_anykey()) {
    input_reset();
    ClearScreen();
    SetGameMode(GM_TITLE);
  }
}

function DoTitle() {
  if (title_start_flag === 0) {
    ClearScreen();
    game.ship_screen = 0;
    title_start_flag = 1;
    InitNewScreen();
    BlitRoom();
    PutSpriteI(50 * 4, 108, 45, 0);
    PutString(76, 88, 'ESPACIO PARA COMENZAR');
    PutString(60, 24, 'ORIGINAL GAME: PEDRO RUIZ');
    PutString(76, 36, 'REMAKE: DMITRY SMAGIN');
    PutString(140, 44, 'ALEXEY PAVLOV');
    PutString(60, 56, 'MUSIC AND SFX: MARK BRAGA');
  }

  RotateLogo();

  if (Keys[SC_ESCAPE]) { mode = GM_EXIT; return; }

  if (Keys[SC_SPACE] || Keys[SC_ENTER]) {
    game.easy_mode = 1;
    ClearScreen();
    SetGameMode(GM_GAME);
    input_reset();
    InitNewGame();
  }
}

function DoWinScreen() {
  const win_string =
    '                                        ' +
    'ATENCION    ATENCION     TRANSMISION A LA NAVE EXPLORER           ' +
    'HAS CUMPLIDO TU ULTIMA MISION Y DEBES RETORNAR AL PLANETA NOVA DE LA GALAXIA TRAION' +
    '                                        ' +
    'TU LUCHA NO HA SIDO EN VANO PUES LA LEJANA COLONIA DEL IMPERIO LLAMADA TIERRA HA SIDO ' +
    'LIBERADA DE LOS INVASORES Y PUEDE SER HABITADA DE NUEVO               REPITO  MENSAJE';

  if (youwin_start_flag === 0) {
    FillScreen(0, 144, SCREEN_WIDTH, 56, 'rgb(0,0,0)');
    youwin_start_flag = 1;
    win_x_string = 0;
    win_ticks = 0;
  } else {
    win_ticks++;
  }

  PutString(0 - ((win_x_string % 8) | 0), 20 * 8, win_string.substr(((win_x_string / 8) | 0), 40));

  if (((win_x_string / 8) | 0) >= win_string.length)
    win_x_string = 0;
  else
    win_x_string += 1;

  if (input_anykey() && win_ticks > 300) {
    SetGameMode(GM_TITLE);
    input_reset();
  } else {
    const ship = gObj_Ship();
    if (ship) {
      GKeys[KEY_RIGHT] = (ship.x < 93) ? 1 : 0;
      GKeys[KEY_LEFT] = 0;
      GKeys[KEY_UP] = (ship.x < 93 && ship.y > 40) ? 1 : 0;
      GKeys[KEY_DOWN] = 0;
      GKeys[KEY_FIRE] = 0;

      Update_Ship(ship);

      let gobj = gObj_First();
      for (; gobj; gobj = gObj_Next(gobj)) {
        UpdateAnimation(gobj);
      }

      if (!frame_skip)
        RenderGame(0);
    }
  }
}

let win_x_string = 0;
let win_ticks = 0;

function DoGame() {
  switch (mode) {
    case GM_SPLASH:
      DoSplash();
      break;

    case GM_TITLE:
      DoTitle();
      break;

    case GM_DEMO:
      if (input_anykey()) {
        SetGameMode(GM_TITLE);
        input_reset();
        game.score = 0;
        break;
      }

    case GM_GAME:
      DoKeys();

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

      if (screen_procedure === 3) {
        SetGameMode(GM_YOUWIN);
        input_reset();
        break;
      }


      // Update all objects (ship, base and all enemies)
      let gobj = gObj_First();
      for (; gobj; gobj = gObj_Next(gobj)) {
        gObj_Update(gobj);
      }

      if (!frame_skip)
        RenderGame(1);

      if (game._needsRestart) {
        game._needsRestart = 0;
        RestartLevel();
      }
      break;

    case GM_PAUSE:
      DoKeys();

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
      DoWinScreen();
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
