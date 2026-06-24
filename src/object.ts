import { RandomInt } from './random.js';
import { GKeys, input_reset } from './input.js';
import { PlaySoundEffect, StopSoundEffect } from './sound.js';
import { PutSpriteI, PutSpriteS, PutPixel, DrawLine, GetSpriteW, GetSpriteH, SpriteSet } from './sprites.js';
import { GetTileI, SetTileI, rgb565ToCSS } from './room.js';
import { Update_Ship, Update_Base, ChangeScreen, InitNewScreen, DestroyHiddenAreaAccess } from './engine.js';
import {
  SCREEN_WIDTH, ACTION_SCREEN_HEIGHT,
  SND_LASER_SHOOT, SND_SHORT_LASER_SHOOT, SND_ROCKET_SHOOT,
  SND_CANNON_SHOOT, SND_EXPLODE, SND_CONTACT, SND_MOVE, SND_ELEVATOR, SND_BONUS,
  KEY_FIRE, KEY_RIGHT, KEY_LEFT, KEY_UP, KEY_DOWN,
  STATUS_YPOS,
} from './constants.js';

export const SH_DEAD = 0;
export const SH_ACTIVE = 1;
export const SH_HIDDEN = 2;

export const AI_STATIC = 0;
export const AI_RANDOM_MOVE = 1;
export const AI_KAMIKADZE = 2;
export const AI_ELECTRIC_SPARKLE_VERTICAL = 3;
export const AI_CEILING_CANNON = 4;
export const AI_HOMING_MISSLE = 5;
export const AI_CANNON = 6;
export const AI_ELECTRIC_SPARKLE_HORIZONTAL = 7;
export const AI_EXPLOSION = 8;
export const AI_BRIDGE = 9;
export const AI_BULLET = 10;
export const AI_ELEVATOR = 11;
export const AI_SMOKE = 12;
export const AI_BONUS = 13;
export const AI_SHOT = 14;
export const AI_GARAGE = 15;
export const AI_SPARE_SHIP = 16;
export const AI_HOMING_SHOT = 17;
export const AI_HIDDEN_AREA_ACCESS = 18;
export const AI_BFG_SHOT = 19;
export const AI_SHIP = 20;
export const AI_BASE = 21;
export const AI_LASER = 22;

export type AIType = typeof AI_STATIC | typeof AI_RANDOM_MOVE | typeof AI_KAMIKADZE
  | typeof AI_ELECTRIC_SPARKLE_VERTICAL | typeof AI_CEILING_CANNON | typeof AI_HOMING_MISSLE
  | typeof AI_CANNON | typeof AI_ELECTRIC_SPARKLE_HORIZONTAL | typeof AI_EXPLOSION
  | typeof AI_BRIDGE | typeof AI_BULLET | typeof AI_ELEVATOR | typeof AI_SMOKE
  | typeof AI_BONUS | typeof AI_SHOT | typeof AI_GARAGE | typeof AI_SPARE_SHIP
  | typeof AI_HOMING_SHOT | typeof AI_HIDDEN_AREA_ACCESS | typeof AI_BFG_SHOT
  | typeof AI_SHIP | typeof AI_BASE | typeof AI_LASER;

export const GOBJ_SOLID = 1 << 0;
export const GOBJ_HURTS = 1 << 1;
export const GOBJ_DESTROY = 1 << 2;
export const GOBJ_SHADOW = 1 << 3;
export const GOBJ_VISIBLE = 1 << 4;
export const GOBJ_PLAYER = 1 << 5;
export const GOBJ_WEAPON = 1 << 6;

export type GObjFlags = number;

export const SHIP_TYPE_LASER = 0;
export const SHIP_TYPE_MACHINE_GUN = 51;
export const SHIP_TYPE_ROCKET_LAUNCHER = 53;
export const SHIP_TYPE_OBSERVER = 8;
export const SHIP_TYPE_BFG = 55;

export const BONUS_FACEBOOK = 47;
export const BONUS_TWITTER = 48;
export const BONUS_HP = 52;

export const GARAGE_WIDTH = 48;
export const GARAGE_HEIGHT = 18;
const MAX_GARAGES = 16;

export class TSHIP {
  x = 0;
  y = 0;
  i = 0;
  state = SH_ACTIVE;
  flags: GObjFlags = 0;
  cur_frame = 0;
  anim_speed_cnt = 0;
  move_speed_cnt = 0;
  ai_update_cnt = 0;
  dx = 0;
  dy = 0;
  min_frame = 0;
  max_frame = 0;
  anim_speed = 0;
  move_speed = 0;
  ai_type: AIType = AI_STATIC;
  dir = 0;
  phase = 0;
  ticks_passed = 0;
  garage_inactive = 0;
  restart_level = 0;
  regenerate_bonus = 0;
  bonus_type = 0;
  base: TSHIP | null = null;
  parent: TSHIP | null = null;
  garage: TSHIP | null = null;
  smoke: TSHIP | null = null;
  laser: TSHIP | null = null;
}

const SHIPS_NUMBER = 32;
const Ships: TSHIP[] = [];
for (let i = 0; i < SHIPS_NUMBER; i++) Ships.push(new TSHIP());

function free_gobj(): number {
  for (let i = 0; i < SHIPS_NUMBER; i++) {
    if (Ships[i].state === SH_DEAD) return i;
  }
  return SHIPS_NUMBER - 1;
}

export function gObj_CreateObject(): TSHIP {
  const obj = Ships[free_gobj()];
  Object.assign(obj, new TSHIP());
  obj.state = SH_ACTIVE;
  return obj;
}

export function gObj_DestroyObject(obj: TSHIP): void {
  Object.assign(obj, new TSHIP());
  obj.state = SH_DEAD;
}

export function gObj_DestroyAll(): void {
  for (let i = 0; i < SHIPS_NUMBER; i++) {
    Object.assign(Ships[i], new TSHIP());
    Ships[i].state = SH_DEAD;
  }
}

export function gObj_Ship(): TSHIP | null {
  for (let i = 0; i < SHIPS_NUMBER; i++) {
    if (Ships[i].state === SH_ACTIVE && Ships[i].ai_type === AI_SHIP)
      return Ships[i];
  }
  return null;
}

export function gObj_First(): TSHIP | null {
  for (let i = 0; i < SHIPS_NUMBER; i++) {
    if (Ships[i].state === SH_ACTIVE)
      return Ships[i];
  }
  return null;
}

export function gObj_Next(obj: TSHIP): TSHIP | null {
  const startIdx = Ships.indexOf(obj) + 1;
  if (startIdx < 0 || startIdx >= SHIPS_NUMBER) return null;
  for (let i = startIdx; i < SHIPS_NUMBER; i++) {
    if (Ships[i].state === SH_ACTIVE)
      return Ships[i];
  }
  return null;
}

export function gObj_GetWidth(obj: TSHIP): number {
  switch (obj.ai_type) {
    case AI_GARAGE: return GARAGE_WIDTH;
    case AI_HIDDEN_AREA_ACCESS:
    case AI_LASER: return obj.dx;
    default: return GetSpriteW(obj.i);
  }
}

export function gObj_GetHeight(obj: TSHIP): number {
  switch (obj.ai_type) {
    case AI_GARAGE: return GARAGE_HEIGHT;
    case AI_HIDDEN_AREA_ACCESS:
    case AI_LASER: return obj.dy;
    default: return GetSpriteH(obj.i);
  }
}

export function UpdateAnimation(obj: TSHIP): number {
  if (obj.anim_speed_cnt === 0) {
    obj.anim_speed_cnt = obj.anim_speed;
    obj.cur_frame += 1;
    if (obj.cur_frame > obj.max_frame) {
      obj.cur_frame = obj.min_frame;
      return 1;
    }
  } else {
    obj.anim_speed_cnt -= 1;
  }
  return 0;
}

export function UpdateMoveSpeed(obj: TSHIP): number {
  if (obj.move_speed_cnt === 0) {
    obj.move_speed_cnt = obj.move_speed;
    return 1;
  } else {
    obj.move_speed_cnt -= 1;
  }
  return 0;
}

let _game: any = null;

export function _setGame(g: any): void { _game = g; }
export function _getGame(): any { return _game; }

function FacingLeft(ship: TSHIP): boolean {
  return ship.cur_frame === ship.max_frame;
}

function FacingRight(ship: TSHIP): boolean {
  return ship.cur_frame === ship.min_frame;
}

let laser_overload = 0;

export function UpdateLaserCounter(delta: number): number {
  laser_overload += delta;
  if (laser_overload > 32 * 8 - 1) {
    laser_overload = 0;
    return 1;
  }
  if (laser_overload < 0) laser_overload = 0;
  return 0;
}

export function ResetLaser(): void {
  laser_overload = 0;
}

export function DoLaser(ship: TSHIP): void {
  if (GKeys[KEY_FIRE]) {
    if (UpdateLaserCounter(1)) {
      gObj_Explode(ship);
      input_reset();
      return;
    }
    if (!ship.laser && !_game.elevator_flag) {
      if (FacingRight(ship)) {
        const laser = gObj_CreateObject();
        gObj_Constructor(laser, AI_LASER);
        ship.laser = laser;
        laser.parent = ship;
        laser.x = ship.x + 32;
        laser.dx = 1;
        laser.y = ship.y + 6;
        laser.dy = 1;
        laser.dir = 1;
        laser.phase = 0;
        PlaySoundEffect(SND_LASER_SHOOT);
      } else if (FacingLeft(ship)) {
        const laser = gObj_CreateObject();
        gObj_Constructor(laser, AI_LASER);
        ship.laser = laser;
        laser.parent = ship;
        laser.x = ship.x - 1;
        laser.dx = 1;
        laser.y = ship.y + 6;
        laser.dy = 1;
        laser.dir = -1;
        laser.phase = 0;
        PlaySoundEffect(SND_LASER_SHOOT);
      }
    }
  } else {
    UpdateLaserCounter(-1);
  }
}

export function BlitLaser(obj: TSHIP): void {
  if (obj.dir !== 0) {
    DrawLine(obj.x, obj.y, obj.x + obj.dx, obj.y, 'rgb(170,170,170)');
  }
}

export function BlitLaserStatus(): void {
  for (let i = 0; i <= 31; i++) {
    const c = (i < (laser_overload >> 3)) ? 'rgb(255,0,0)' : '#000';
    PutPixel(i + 192, STATUS_YPOS + 18, c);
    PutPixel(i + 192, STATUS_YPOS + 19, c);
    PutPixel(i + 192, STATUS_YPOS + 20, c);
  }
}

function Update_Laser(obj: TSHIP): void {
  const ship = obj.parent;
  if (!ship) {
    obj.dir = 0;
    gObj_DestroyObject(obj);
    return;
  }

  if (obj.dir === 1) {
    if (obj.phase === 0) {
      obj.x = ship.x + 32;
      for (let dx = 0; dx <= 11; dx++) {
        obj.dx++;
        if (gObj_CheckTouch(obj.x, obj.y, obj)) {
          obj.phase = 1;
          break;
        }
      }
    } else {
      for (let dx = 0; dx <= 11; dx++) {
        obj.x++;
        obj.dx--;
        if (obj.dx <= 0) {
          obj.dir = 0;
          if (obj.parent) obj.parent.laser = null;
          gObj_DestroyObject(obj);
          break;
        }
        gObj_CheckTouch(obj.x, obj.y, obj);
      }
    }
  } else if (obj.dir === -1) {
    if (obj.phase === 0) {
      obj.dx = ship.x - obj.x - 1;
      for (let dx = 0; dx <= 11; dx++) {
        obj.x--;
        obj.dx++;
        if (gObj_CheckTouch(obj.x, obj.y, obj)) {
          obj.phase = 1;
          break;
        }
      }
    } else {
      for (let dx = 0; dx <= 11; dx++) {
        obj.dx--;
        if (obj.dx <= 0) {
          obj.dir = 0;
          if (obj.parent) obj.parent.laser = null;
          gObj_DestroyObject(obj);
          break;
        }
        gObj_CheckTouch(obj.x, obj.y, obj);
      }
    }
  }
}

let garage_data: [number, number][] = new Array(MAX_GARAGES).fill(null).map(() => [0, 0]);
let main_garage_data: [number, number][] = new Array(MAX_GARAGES).fill(null).map(() => [0, 0]);

export function GarageRestore(): void {
  for (let i = 0; i < MAX_GARAGES; i++) {
    garage_data[i][0] = main_garage_data[i][0];
    garage_data[i][1] = main_garage_data[i][1];
  }
}

export function GarageSave(): void {
  for (let i = 0; i < MAX_GARAGES; i++) {
    main_garage_data[i][0] = garage_data[i][0];
    main_garage_data[i][1] = garage_data[i][1];
  }
}

export function InitGaragesForNewGame(): void {
  for (let i = 0; i < MAX_GARAGES; i++) { garage_data[i][0] = 0; garage_data[i][1] = 0; }

  let n = 0;
  garage_data[n][0] = 100; garage_data[n][1] = -1; n++;
  garage_data[n][0] = 101; garage_data[n][1] = SHIP_TYPE_MACHINE_GUN; n++;
  garage_data[n][0] = 110; garage_data[n][1] = -1; n++;
  garage_data[n][0] = 111; garage_data[n][1] = SHIP_TYPE_ROCKET_LAUNCHER; n++;
  garage_data[n][0] = 120; garage_data[n][1] = SHIP_TYPE_OBSERVER; n++;
  garage_data[n][0] = 121; garage_data[n][1] = SHIP_TYPE_OBSERVER; n++;
  garage_data[n][0] = 122; garage_data[n][1] = SHIP_TYPE_OBSERVER; n++;
  garage_data[n][0] = 123; garage_data[n][1] = -1; n++;
  garage_data[n][0] = 124; garage_data[n][1] = SHIP_TYPE_OBSERVER; n++;
  garage_data[n][0] = 130; garage_data[n][1] = -1; n++;
  garage_data[n][0] = 131; garage_data[n][1] = SHIP_TYPE_OBSERVER; n++;
  garage_data[n][0] = 190; garage_data[n][1] = -1; n++;
  garage_data[n][0] = 191; garage_data[n][1] = SHIP_TYPE_BFG; n++;
  GarageSave();
}

function SetGarageShipIndex(garageId: number, shipIndex: number): void {
  for (let i = 0; i < MAX_GARAGES; i++) {
    if (garage_data[i][0] === garageId) {
      garage_data[i][1] = shipIndex;
    }
  }
}

function GarageShipIndex(garageId: number): number {
  for (let i = 0; i < MAX_GARAGES; i++) {
    if (garage_data[i][0] === garageId) {
      return garage_data[i][1];
    }
  }
  return -1;
}

function BestPositionInGarage(ship: TSHIP): { x: number; y: number } {
  if (!ship.garage) {
    return { x: ship.x, y: ship.y };
  }
  const garage = ship.garage;
  return {
    x: garage.x + ((GARAGE_WIDTH - gObj_GetWidth(ship)) >> 1),
    y: garage.y + ((GARAGE_HEIGHT - gObj_GetHeight(ship)) >> 1),
  };
}

function CreateGarage(en: TSHIP, garage_id: number): void {
  en.i = garage_id;
  const iShip = GarageShipIndex(en.i);
  if (iShip !== -1) {
    const ship = gObj_CreateObject();
    ship.i = iShip;
    gObj_Constructor(ship, AI_SPARE_SHIP);
    ship.garage = en;

    switch (iShip) {
      case SHIP_TYPE_LASER:
      case SHIP_TYPE_MACHINE_GUN:
      case SHIP_TYPE_ROCKET_LAUNCHER:
        ship.max_frame = 6;
        ship.min_frame = 0;
        break;
      case SHIP_TYPE_OBSERVER:
        ship.max_frame = 3;
        ship.min_frame = 1;
        ship.cur_frame = 1;
        break;
      case SHIP_TYPE_BFG:
        ship.max_frame = 4;
        ship.min_frame = 0;
        break;
    }
    const pos = BestPositionInGarage(ship);
    ship.x = pos.x;
    ship.y = pos.y;
  }
}

function IsParked(ship_type: number): number {
  for (let i = 0; i < MAX_GARAGES; i++) {
    if (garage_data[i][0] && garage_data[i][1] === ship_type) return 1;
  }
  return 0;
}

export function GetPlayerShipIndex(): number {
  if (!IsParked(SHIP_TYPE_LASER)) return SHIP_TYPE_LASER;
  if (!IsParked(SHIP_TYPE_MACHINE_GUN)) return SHIP_TYPE_MACHINE_GUN;
  if (!IsParked(SHIP_TYPE_ROCKET_LAUNCHER)) return SHIP_TYPE_ROCKET_LAUNCHER;
  if (!IsParked(SHIP_TYPE_BFG)) return SHIP_TYPE_BFG;
  return SHIP_TYPE_OBSERVER;
}

function Update_Garage(obj: TSHIP): void {
  const ship = gObj_Ship();
  if (!ship || ship.ai_type === AI_EXPLOSION) return;

  if (GarageShipIndex(obj.i) !== -1) return;

  const w = gObj_GetWidth(ship);
  const h = gObj_GetHeight(ship);

  if (!obj.garage_inactive &&
      ship.x >= obj.x &&
      ship.x + w < obj.x + GARAGE_WIDTH &&
      ship.y >= obj.y &&
      ship.y + h < obj.y + GARAGE_HEIGHT) {
    let spare = gObj_First();
    for (; spare; spare = gObj_Next(spare)) {
      if (spare.ai_type === AI_SPARE_SHIP) break;
    }

    if (spare) {
      const garageEnt = spare.garage!;
      garageEnt.garage_inactive = 1;

      SetGarageShipIndex(obj.i, ship.i);
      SetGarageShipIndex(garageEnt.i, -1);

      gObj_Constructor(spare, AI_SHIP);
      spare.garage = null;
      spare.base = ship.base;
      spare.smoke = null;

      gObj_Constructor(ship, AI_SPARE_SHIP);
      ship.garage = obj;
      ship.base = null;

      _game.health = 3;
      Destroy_Smoke(ship);
      PlaySoundEffect(SND_CONTACT);
    }
  } else if (obj.garage_inactive) {
    if (!gObj_CheckOverlap(ship.x, ship.y, ship, obj)) {
      obj.garage_inactive = 0;
    }
  }
}

function Update_SpareShip(obj: TSHIP): void {
  const speed = 1;
  const pos = BestPositionInGarage(obj);
  if (pos.x > obj.x) obj.x += speed;
  else if (pos.x < obj.x) obj.x -= speed;
  if (pos.y > obj.y) obj.y += speed;
  else if (pos.y < obj.y) obj.y -= speed;

  const middle_frame = ((obj.max_frame + obj.min_frame) / 2) | 0;
  if (obj.cur_frame > obj.min_frame && obj.cur_frame <= middle_frame)
    obj.cur_frame--;
  else if (obj.cur_frame > middle_frame && obj.cur_frame < obj.max_frame)
    obj.cur_frame++;
}

const BFG_KILL_DISTANCE = 60;
const BFG_KILL_TIME = 16;
const MAX_BFG_TARGETS = 13;

class TBFGTARGET {
  xc = 0; yc = 0;
  xt = 0; yt = 0;
  ship: TSHIP | null = null;
  hit_now = 0;
  hit_count = 0;
}

const BfgTargets: TBFGTARGET[] = [];
for (let i = 0; i < MAX_BFG_TARGETS; i++) BfgTargets.push(new TBFGTARGET());
let bfg_on = 0;

function ShipsDistance(i: TSHIP, j: TSHIP): number {
  const x = i.x - j.x;
  const y = i.y - j.y;
  return Math.floor(Math.sqrt(x * x + y * y));
}

export function CleanupBfg(): void {
  for (let i = 0; i < MAX_BFG_TARGETS; i++) Object.assign(BfgTargets[i], new TBFGTARGET());
  bfg_on = 0;
}

function AddBfgTarget(obj: TSHIP, bfg: TSHIP): void {
  let t: TBFGTARGET | null = null;
  for (let n = 0; n < MAX_BFG_TARGETS; n++) {
    if (BfgTargets[n].ship === obj) { t = BfgTargets[n]; break; }
    else if (!t && !BfgTargets[n].ship) t = BfgTargets[n];
  }
  if (!t) return;
  t.hit_count++;
  t.hit_now = 1;
  t.ship = obj;
  t.xc = bfg.x + 5;
  t.yc = bfg.y + 5;
  t.xt = obj.x + 8;
  t.yt = obj.y + 8;
}

let bfg_timeout = 0;

export function DoBFG(ship: TSHIP): void {
  if (--bfg_timeout < 0) bfg_timeout = 0;

  if (GKeys[KEY_FIRE]) {
    if (!bfg_timeout && !bfg_on && !_game.elevator_flag) {
      if (!FacingLeft(ship) && !FacingRight(ship)) return;

      const bullet = gObj_CreateObject();
      bullet.i = 56;
      bullet.x = ship.x + (FacingRight(ship) ? 16 : -11);
      bullet.y = ship.y + 5;
      bullet.dy = 0;
      bullet.dx = FacingRight(ship) ? 2 : -2;
      bullet.anim_speed = 10;
      bullet.anim_speed_cnt = bullet.anim_speed;
      bullet.move_speed_cnt = bullet.move_speed;
      bullet.cur_frame = 0;
      bullet.max_frame = 3;
      gObj_Constructor(bullet, AI_BFG_SHOT);
      bullet.parent = ship;
      bfg_on = 1;
      bfg_timeout = 20;
      PlaySoundEffect(SND_CANNON_SHOOT);
    }
  } else {
    bfg_timeout = 0;
  }
}

export function BlitBfg(): void {
  if (bfg_on) {
    for (let n = 0; n < MAX_BFG_TARGETS; n++) {
      if (BfgTargets[n].ship) {
        let color = 'rgb(85,255,85)';
        if (BfgTargets[n].hit_count < ((BFG_KILL_TIME / 2) | 0))
          color = 'rgb(0,170,0)';
        DrawLine(BfgTargets[n].xc, BfgTargets[n].yc, BfgTargets[n].xt, BfgTargets[n].yt, color);
      }
    }
  }
}

function Update_Static(obj: TSHIP): void {
  UpdateAnimation(obj);
}

function Update_Random(obj: TSHIP): void {
  UpdateAnimation(obj);
  if (UpdateMoveSpeed(obj) === 1) {
    if (obj.ai_update_cnt === 0) {
      obj.dx = RandomInt() & 3;
      if (obj.dx >= 2) obj.dx = -1;
      obj.dy = RandomInt() & 3;
      if (obj.dy >= 2) obj.dy = -1;
      obj.ai_update_cnt = RandomInt() & 0x1f;
      if (obj.ai_update_cnt < 15) obj.ai_update_cnt = 15;
    } else {
      obj.ai_update_cnt -= 1;
    }

    if (gObj_CheckTouch(obj.x + obj.dx, obj.y, obj) === 0)
      obj.x += obj.dx;
    else
      obj.ai_update_cnt = 0;

    if (gObj_CheckTouch(obj.x, obj.y + obj.dy, obj) === 0)
      obj.y += obj.dy;
    else
      obj.ai_update_cnt = 0;
  }
}

function Update_Kamikaze(obj: TSHIP): void {
  const ship = gObj_Ship();
  if (!ship) return;

  if (ship.i === SHIP_TYPE_OBSERVER) {
    Update_Random(obj);
    return;
  }

  UpdateAnimation(obj);
  if (UpdateMoveSpeed(obj) === 1) {
    if (obj.ai_update_cnt === 0) {
      obj.dx = obj.x > ship.x ? -1 : (obj.x < ship.x ? 1 : 0);
      obj.dy = obj.y > ship.y ? -1 : (obj.y < ship.y ? 1 : 0);
      obj.ai_update_cnt = 15;
    } else {
      obj.ai_update_cnt -= 1;
    }

    if (gObj_CheckTouch(obj.x + obj.dx, obj.y, obj) === 0)
      obj.x += obj.dx;
    else
      obj.ai_update_cnt = 0;

    if (gObj_CheckTouch(obj.x, obj.y + obj.dy, obj) === 0)
      obj.y += obj.dy;
    else
      obj.ai_update_cnt = 0;
  }
}

function Update_SparkleVertical(obj: TSHIP): void {
  UpdateAnimation(obj);
  if (UpdateMoveSpeed(obj) === 1) {
    if (obj.dy === 0) obj.dy = 1;
    if (gObj_CheckTouch(obj.x, obj.y + obj.dy, obj) === 0)
      obj.y += obj.dy;
    else
      obj.dy = -obj.dy;
  }
}

function Update_CeilingCannon(obj: TSHIP): void {
  if (obj.dx === 1) return;
  if (UpdateAnimation(obj) === 1) {
    obj.dx = 1;
    const j = gObj_CreateObject();
    j.i = 34;
    j.x = obj.x;
    j.y = obj.y + 16;
    j.anim_speed = 4;
    j.anim_speed_cnt = j.anim_speed;
    j.max_frame = 3;
    gObj_Constructor(j, AI_KAMIKADZE);
    j.parent = obj;
    PlaySoundEffect(SND_CANNON_SHOOT);
  }
}

function Update_HomingMissile(obj: TSHIP): void {
  const ship = gObj_Ship();
  if (!ship) return;

  UpdateAnimation(obj);

  if (obj.x > 0) {
    obj.x -= 2;
    gObj_CheckTouch(obj.x, obj.y, obj);
    if (obj.x < ship.x) return;
    if (obj.y > ship.y) obj.y -= 1;
    if (obj.y < ship.y && obj.y < 63) {
      if ((RandomInt() & 1) === 1) obj.y += 1;
    }
  } else {
    obj.x = 296;
    obj.y = RandomInt() & 63;
    obj.i = (obj.i === 40) ? 41 : 40;
  }
}

function Update_Cannon(obj: TSHIP): void {
  const ship = gObj_Ship();
  if (!ship) return;

  if (obj.x - 40 > ship.x) {
    obj.cur_frame = 0;
  } else if (obj.x + 40 < ship.x) {
    obj.cur_frame = 2;
  } else {
    obj.cur_frame = 1;
  }

  if ((RandomInt() & 255) > 252) {
    const bullet = gObj_CreateObject();
    if (bullet) {
      bullet.i = 43;
      if (obj.cur_frame === 0) {
        bullet.x = obj.x - 4;
        bullet.y = obj.y + 4;
        bullet.dx = -1;
        bullet.dy = -1;
      }
      if (obj.cur_frame === 1) {
        bullet.x = obj.x + 6;
        bullet.y = obj.y - 4;
        bullet.dx = 0;
        bullet.dy = -1;
      }
      if (obj.cur_frame === 2) {
        bullet.x = obj.x + 16;
        bullet.y = obj.y + 4;
        bullet.dx = 1;
        bullet.dy = -1;
      }
      bullet.anim_speed = 4;
      bullet.anim_speed_cnt = bullet.anim_speed;
      gObj_Constructor(bullet, AI_BULLET);
      bullet.parent = obj;
    }
  }
}

function Update_SparkleHorizontal(obj: TSHIP): void {
  UpdateAnimation(obj);
  if (UpdateMoveSpeed(obj) === 1) {
    if (obj.dx === 0) obj.dx = 1;
    if (gObj_CheckTouch(obj.x + obj.dx, obj.y, obj) === 0)
      obj.x += obj.dx;
    else
      obj.dx = -obj.dx;
  }
}

const yOffset = [-1, -1, -2, -2, -1, 1, 1, 2, 2, 1];

function Update_Bonus(obj: TSHIP): void {
  if (UpdateAnimation(obj) === 1) {
    obj.y += yOffset[(obj.dy % yOffset.length) | 0];
    obj.dy = ((obj.dy + 1) % yOffset.length) | 0;
  }
}

function Create_Smoke(obj: TSHIP): void {
  if (obj.smoke) return;
  const smoke = gObj_CreateObject();
  obj.smoke = smoke;
  smoke.i = 46;
  smoke.x = obj.x + 8;
  smoke.y = obj.y - 8;
  smoke.dy = -1;
  smoke.dx = FacingRight(obj) ? -1 : (FacingLeft(obj) ? 1 : 0);
  smoke.anim_speed = 4;
  smoke.anim_speed_cnt = smoke.anim_speed;
  smoke.cur_frame = 0;
  smoke.max_frame = 4;
  gObj_Constructor(smoke, AI_SMOKE);
  smoke.parent = obj;
}

function Destroy_Smoke(obj: TSHIP): void {
  if (!obj.smoke) return;
  gObj_DestroyObject(obj.smoke);
  obj.smoke = null;
}

function Update_Smoke(obj: TSHIP): void {
  if (UpdateAnimation(obj) === 1) {
    obj.x = obj.parent!.x + 8;
    obj.y = obj.parent!.y - 8;
    obj.cur_frame = 0;
  } else if ((obj.cur_frame % 2) | 0) {
    obj.x += obj.dx;
    obj.y += obj.dy;
  }
}

function Update_Explosion(obj: TSHIP): void {
  if (UpdateAnimation(obj) === 1) {
    if (obj.bonus_type) {
      if (obj.regenerate_bonus) {
        gObj_Constructor(obj, AI_BONUS);
        switch (obj.bonus_type) {
          case BONUS_FACEBOOK: obj.i = BONUS_TWITTER; break;
          case BONUS_TWITTER: obj.i = BONUS_FACEBOOK; break;
          default: obj.i = obj.bonus_type; break;
        }
        obj.bonus_type = 0;
        obj.regenerate_bonus = 0;
        obj.dx = 0;
        obj.dy = 0;
        obj.max_frame = 0;
        obj.cur_frame = 0;
        obj.min_frame = 0;
        obj.anim_speed = 4;
        return;
      } else {
        PlaySoundEffect(SND_BONUS);
        switch (obj.bonus_type) {
          case BONUS_HP:
            _game.health++;
            if (_game.health > 3) _game.health = 3;
            if (_game.health > 1) Destroy_Smoke(gObj_Ship()!);
            break;
        }
      }
    }

    if (obj.restart_level) {
      _game._needsRestart = 1;
    } else {
      gObj_DestroyObject(obj);
    }
    return;
  }
}

function Update_Bridge(obj: TSHIP): void {
  if (_game.player_attached) {
    obj.flags |= (GOBJ_SOLID | GOBJ_SHADOW | GOBJ_VISIBLE);
  } else {
    obj.flags &= ~(GOBJ_SOLID | GOBJ_SHADOW | GOBJ_VISIBLE);
  }
  const a = _game.player_attached ? 245 : 0;
  for (let f = 0; f <= 4; f++) {
    SetTileI((obj.x >> 3) + f, obj.y >> 3, a);
  }
}

function Update_Bullet(obj: TSHIP): void {
  if (obj.parent && obj.y + 16 < obj.parent.y && (RandomInt() & 63) === 1) {
    gObj_Explode(obj);
    return;
  }
  obj.x += obj.dx;
  if (obj.x < 0 || obj.x > SCREEN_WIDTH) {
    gObj_Explode(obj);
    return;
  }
  obj.y += obj.dy;
  if (obj.y < 0) gObj_Explode(obj);
}

function Update_HomingShot(obj: TSHIP): void {
  if (gObj_CheckTouch(obj.x, obj.y, obj)) {
    gObj_Explode(obj);
    return;
  }

  obj.dy = 0;
  if (++obj.ticks_passed > 10) {
    let trg = gObj_First();
    let best: TSHIP | null = null;
    let dx_best = 0;

    for (; trg; trg = gObj_Next(trg)) {
      if (trg.ai_type !== AI_RANDOM_MOVE && trg.ai_type !== AI_KAMIKADZE)
        continue;
      if (trg.i === 11) continue;

      const dx = trg.x - obj.x;
      if (obj.cur_frame < 2) {
        if (dx > 10 || dx < -110) continue;
        if (!best || dx > dx_best) { best = trg; dx_best = dx; }
      } else {
        if (dx < 10 || dx > 110) continue;
        if (!best || dx > dx_best) { best = trg; dx_best = dx; }
      }
    }

    if (best) {
      const dy = best.y - obj.y;
      if (dy < 0) obj.dy = -1;
      if (dy > 0) obj.dy = 1;
    }
  }

  UpdateAnimation(obj);
  obj.x += obj.dx;
  obj.y += obj.dy;
}

function Update_Shot(obj: TSHIP): void {
  if (gObj_CheckTouch(obj.x, obj.y, obj)) {
    gObj_Explode(obj);
    return;
  }
  obj.x += obj.dx;
  obj.y += obj.dy;
}

let el_phase = 0;

function Update_Elevator(obj: TSHIP): void {
  const ship = gObj_Ship();
  if (!ship) return;
  const base = ship.base;
  if (!base) return;

  if (_game.player_attached !== 1) return;

  if (obj.x !== base.x - 4) return;

  _game.elevator_flag = 1;

  const _handleElevatorEffect = (): void => {
    if (_game.elevator_flag)
      PlaySoundEffect(SND_ELEVATOR);
    else
      StopSoundEffect(SND_ELEVATOR);
  }

  if (el_phase === 0) {
    if (obj.y === 120) {
      for (let j = 0; j <= 5; j++) {
        SetTileI((obj.x >> 3) + j, obj.y >> 3, 0);
      }
    }

    if (ship.y === 0) {
      el_phase = 1;

      const sy = gObj_GetHeight(ship);
      ship.y = 112 - sy;
      base.y = 112;

      ChangeScreen(0);
      _game.base_screen = _game.ship_screen;
      InitNewScreen();

      obj = gObj_CreateObject();
      obj.i = 21;
      obj.x = base.x - 4;
      obj.y = 128;
      gObj_Constructor(obj, AI_ELEVATOR);

      _handleElevatorEffect();
      return;
    }
  } else {
    if (base.y === 104) {
      el_phase = 0;

      for (let i = 0; i <= 5; i++) {
        SetTileI(((base.x - 4) >> 3) + i, (base.y + 16) >> 3, 245);
      }

      if (_game.ship_screen !== 69) {
        _game.level += 1;
        GarageSave();
      }
      _game.base_restart_screen = _game.ship_screen;

      if (_game.base_screen !== 69) {
        let lift = gObj_First();
        for (; lift; lift = gObj_Next(lift)) {
          if (lift.ai_type === AI_ELEVATOR) gObj_DestroyObject(lift);
        }
      }

      _game.elevator_flag = 0;
      _game.health = 3;

      _handleElevatorEffect();
      return;
    }
  }

  ship.y -= 1;
  base.y -= 1;
  obj.y -= 1;

  _handleElevatorEffect();
}

function Update_BfgShot(obj: TSHIP): void {
  UpdateAnimation(obj);

  if (obj.dx === 2) obj.dx = 3;
  else if (obj.dx === -2) obj.dx = -3;
  else if (obj.dx === 3) obj.dx = 2;
  else if (obj.dx === -3) obj.dx = -2;

  for (let n = 0; n < MAX_BFG_TARGETS; n++) BfgTargets[n].hit_now = 0;

  let trg = gObj_First();
  for (; trg; trg = gObj_Next(trg)) {
    if (trg.ai_type === AI_KAMIKADZE || trg.ai_type === AI_RANDOM_MOVE) {
      if (ShipsDistance(obj, trg) < BFG_KILL_DISTANCE) {
        AddBfgTarget(trg, obj);
      }
    }
  }

  for (let n = 0; n < MAX_BFG_TARGETS; n++) {
    if (BfgTargets[n].hit_count) {
      if (BfgTargets[n].hit_now) {
        if (BfgTargets[n].hit_count > BFG_KILL_TIME) {
          gObj_Explode(BfgTargets[n].ship!);
        }
      } else {
        Object.assign(BfgTargets[n], new TBFGTARGET());
      }
    }
  }

  Update_Shot(obj);
}

const EnemyFlags: Record<number, GObjFlags> = {
  [AI_STATIC]: GOBJ_SOLID | GOBJ_HURTS | GOBJ_DESTROY | GOBJ_SHADOW | GOBJ_VISIBLE,
  [AI_RANDOM_MOVE]: GOBJ_SOLID | GOBJ_HURTS | GOBJ_DESTROY | GOBJ_SHADOW | GOBJ_VISIBLE,
  [AI_KAMIKADZE]: GOBJ_SOLID | GOBJ_HURTS | GOBJ_DESTROY | GOBJ_SHADOW | GOBJ_VISIBLE,
  [AI_ELECTRIC_SPARKLE_VERTICAL]: GOBJ_HURTS | GOBJ_VISIBLE,
  [AI_CEILING_CANNON]: GOBJ_SOLID | GOBJ_HURTS | GOBJ_DESTROY | GOBJ_SHADOW | GOBJ_VISIBLE,
  [AI_HOMING_MISSLE]: GOBJ_SOLID | GOBJ_HURTS | GOBJ_DESTROY | GOBJ_VISIBLE,
  [AI_CANNON]: GOBJ_SOLID | GOBJ_HURTS | GOBJ_DESTROY | GOBJ_SHADOW | GOBJ_VISIBLE,
  [AI_ELECTRIC_SPARKLE_HORIZONTAL]: GOBJ_HURTS | GOBJ_VISIBLE,
  [AI_EXPLOSION]: GOBJ_VISIBLE,
  [AI_BRIDGE]: GOBJ_SOLID | GOBJ_SHADOW | GOBJ_VISIBLE,
  [AI_BULLET]: GOBJ_HURTS | GOBJ_DESTROY | GOBJ_VISIBLE,
  [AI_ELEVATOR]: GOBJ_SOLID | GOBJ_SHADOW | GOBJ_VISIBLE,
  [AI_SMOKE]: GOBJ_VISIBLE,
  [AI_BONUS]: GOBJ_SOLID | GOBJ_DESTROY | GOBJ_VISIBLE,
  [AI_SHOT]: GOBJ_HURTS | GOBJ_DESTROY | GOBJ_VISIBLE | GOBJ_WEAPON,
  [AI_GARAGE]: 0,
  [AI_SPARE_SHIP]: GOBJ_SOLID | GOBJ_DESTROY | GOBJ_SHADOW | GOBJ_VISIBLE,
  [AI_HOMING_SHOT]: GOBJ_HURTS | GOBJ_DESTROY | GOBJ_VISIBLE | GOBJ_WEAPON,
  [AI_HIDDEN_AREA_ACCESS]: GOBJ_SOLID | GOBJ_DESTROY,
  [AI_BFG_SHOT]: GOBJ_HURTS | GOBJ_DESTROY | GOBJ_VISIBLE | GOBJ_WEAPON,
  [AI_SHIP]: GOBJ_SOLID | GOBJ_DESTROY | GOBJ_SHADOW | GOBJ_VISIBLE | GOBJ_PLAYER,
  [AI_BASE]: GOBJ_SOLID | GOBJ_DESTROY | GOBJ_SHADOW | GOBJ_VISIBLE | GOBJ_PLAYER,
  [AI_LASER]: GOBJ_HURTS | GOBJ_WEAPON,
};

export function gObj_Constructor(obj: TSHIP, ai: AIType): void {
  obj.ai_type = ai;
  obj.flags = EnemyFlags[ai] || 0;
}

export function gObj_CheckOverlap(x: number, y: number, obj1: TSHIP, obj2: TSHIP): number {
  const ys = y + gObj_GetHeight(obj1);
  const xs = x + gObj_GetWidth(obj1);
  const ys2 = obj2.y + gObj_GetHeight(obj2);
  const xs2 = obj2.x + gObj_GetWidth(obj2);

  if (x < obj2.x) {
    if (xs > obj2.x) {
      if ((y < obj2.y && ys > obj2.y) || (y >= obj2.y && ys2 > y))
        return 1;
    }
  } else {
    if (xs2 > x) {
      if ((y < obj2.y && ys > obj2.y) || (y >= obj2.y && ys2 > y))
        return 1;
    }
  }
  return 0;
}

function gObj_CheckDestruction(obj1: TSHIP, obj2: TSHIP): number {
  const obj1_type = (obj1.flags & (GOBJ_PLAYER | GOBJ_WEAPON)) >> 5;
  const obj2_type = (obj2.flags & (GOBJ_PLAYER | GOBJ_WEAPON)) >> 5;

  const _exit_proc = (): number => {
    if (obj1.ai_type === AI_LASER) return 1;
    if (!(obj1.flags & GOBJ_SOLID) || !(obj2.flags & GOBJ_SOLID)) return 0;
    return 1;
  }

  if (obj1_type === obj2_type) return _exit_proc();

  if (obj2.flags & GOBJ_WEAPON && obj1 === obj2.parent) return 0;
  if (obj1.flags & GOBJ_WEAPON && obj2 === obj1.parent) return 0;

  if (obj2.ai_type === AI_GARAGE) return _exit_proc();

  if (obj1.ai_type === AI_BONUS) {
    if (obj2_type === 2) obj1.regenerate_bonus = 1;
    gObj_Explode(obj1);
    return _exit_proc();
  } else if (obj2.ai_type === AI_BONUS) {
    if (obj1_type === 2) obj2.regenerate_bonus = 1;
    gObj_Explode(obj2);
    return _exit_proc();
  }

  if (obj1.flags & GOBJ_HURTS || obj2.flags & GOBJ_HURTS) {
    if (obj1.ai_type !== AI_BFG_SHOT) gObj_Explode(obj1);
    if (obj2.ai_type !== AI_BFG_SHOT) gObj_Explode(obj2);
  }

  return _exit_proc();
}

export function gObj_CheckTouch(x: number, y: number, obj: TSHIP): number {
  if (x < 0 || y < 0) return 1;

  const ys = y + gObj_GetHeight(obj);
  const xs = x + gObj_GetWidth(obj);
  if (xs > SCREEN_WIDTH || ys > ACTION_SCREEN_HEIGHT) return 1;

  let en = gObj_First();
  for (; en; en = gObj_Next(en)) {
    if (en === obj) continue;
    if (gObj_CheckOverlap(x, y, obj, en)) {
      if (!gObj_CheckDestruction(obj, en)) continue;
      return 1;
    }
  }

  for (let dy = y; dy < ys; dy++) {
    for (let dx = x; dx < xs; dx++) {
      const b = GetTileI(dx >> 3, dy >> 3);
      if (b === 0) continue;
      if (obj.ai_type === AI_SHIP && b >= 246) {
        gObj_Explode(obj);
      }
      return 1;
    }
  }

  return 0;
}

export function gObj_Explode(obj: TSHIP): void {
  if (!(obj.flags & GOBJ_DESTROY)) return;

  switch (obj.ai_type) {
    case AI_SHIP:
      if (_game.easy_mode) {
        if (!_game.ticks_for_damage) {
          _game.ticks_for_damage = 20;
          _game.health--;
          if (_game.health <= 1) Create_Smoke(obj);
        }
      } else {
        _game.health = -1;
      }
      if (_game.health >= 0) return;
      obj.restart_level = 1;
      break;

    case AI_BASE:
      _game.player_attached = 0;
      {
        const exp = gObj_CreateObject();
        exp.i = 1;
        exp.x = obj.x;
        exp.y = obj.y;
        _game.base_screen = _game.base_restart_screen;
        obj.state = SH_HIDDEN;
        obj.x = 160;
        obj.y = 104;
        obj = exp;
      }
      break;

    case AI_SHOT:
    case AI_HOMING_SHOT:
      gObj_DestroyObject(obj);
      return;

    case AI_BFG_SHOT:
      CleanupBfg();
      gObj_DestroyObject(obj);
      return;

    case AI_HIDDEN_AREA_ACCESS:
      DestroyHiddenAreaAccess(obj, 1);
      return;

    case AI_BONUS:
      obj.bonus_type = obj.i;
      break;

    case AI_RANDOM_MOVE:
    case AI_KAMIKADZE:
      if (!_game.easy_mode) break;
      if (_game.screen_bonus) {
        let alive_ship = 0;
        let last_alive = gObj_First();
        for (; last_alive; last_alive = gObj_Next(last_alive)) {
          if (last_alive !== obj &&
              (last_alive.ai_type === AI_RANDOM_MOVE || last_alive.ai_type === AI_KAMIKADZE)) {
            alive_ship = 1;
            break;
          }
        }
        if (!alive_ship) {
          obj.bonus_type = _game.screen_bonus;
          obj.regenerate_bonus = 1;
        }
      }
      if (obj.parent) obj.parent.dx = 0;
      break;

    case AI_HOMING_MISSLE:
      {
        const exp = gObj_CreateObject();
        exp.i = 2;
        exp.x = obj.x;
        exp.y = obj.y;
        obj.x += SCREEN_WIDTH;
        obj = exp;
      }
      break;
  }

  UpdateScoreWithShip(obj);

  if (obj.i === 6) {
    if (obj.cur_frame === 0) {
      obj.x -= 8;
      SetTileI(obj.x >> 3, obj.y >> 3, 0);
      SetTileI(obj.x >> 3, (obj.y >> 3) + 1, 0);
    } else {
      SetTileI((obj.x >> 3) + 1, obj.y >> 3, 0);
      SetTileI((obj.x >> 3) + 1, (obj.y >> 3) + 1, 0);
    }
  }

  gObj_Constructor(obj, AI_EXPLOSION);

  switch (obj.i) {
    case 6: obj.i = 7; break;
    case 1:
      obj.x += 4; obj.y += 4;
    case 0:
    case 51:
    case 53:
      obj.i = 23; break;
    default:
      obj.i = 2; break;
  }

  obj.min_frame = 0;
  obj.max_frame = 2;
  obj.cur_frame = 0;
  obj.anim_speed = 6;
  obj.anim_speed_cnt = 6;

  PlaySoundEffect(SND_EXPLODE);
}

export function gObj_Update(obj: TSHIP): void {
  switch (obj.ai_type) {
    case AI_SHIP: Update_Ship(obj); break;
    case AI_BASE: Update_Base(obj); break;
    case AI_STATIC: Update_Static(obj); break;
    case AI_RANDOM_MOVE: Update_Random(obj); break;
    case AI_KAMIKADZE: Update_Kamikaze(obj); break;
    case AI_ELECTRIC_SPARKLE_VERTICAL: Update_SparkleVertical(obj); break;
    case AI_CEILING_CANNON: Update_CeilingCannon(obj); break;
    case AI_HOMING_MISSLE: Update_HomingMissile(obj); break;
    case AI_CANNON: Update_Cannon(obj); break;
    case AI_ELECTRIC_SPARKLE_HORIZONTAL: Update_SparkleHorizontal(obj); break;
    case AI_BONUS: Update_Bonus(obj); break;
    case AI_SMOKE: Update_Smoke(obj); break;
    case AI_EXPLOSION: Update_Explosion(obj); break;
    case AI_BRIDGE: Update_Bridge(obj); break;
    case AI_GARAGE: Update_Garage(obj); break;
    case AI_SPARE_SHIP: Update_SpareShip(obj); break;
    case AI_BULLET: Update_Bullet(obj); break;
    case AI_HOMING_SHOT: Update_HomingShot(obj); break;
    case AI_BFG_SHOT: Update_BfgShot(obj); break;
    case AI_SHOT: Update_Shot(obj); break;
    case AI_ELEVATOR: Update_Elevator(obj); break;
    case AI_LASER: Update_Laser(obj); break;
  }
}

function AddScore(update: number): void {
  const points_per_life = 15000;
  const livesBefore = ((_game.score / points_per_life) | 0);
  _game.score += update;
  const livesAfter = ((_game.score / points_per_life) | 0);
  _game.lives += (livesAfter - livesBefore);
}

export function UpdateScoreWithShip(gobj: TSHIP): void {
  const ship = gObj_Ship();
  if (!ship) return;

  switch (gobj.ai_type) {
    case AI_SHIP:
    case AI_BASE:
    case AI_BULLET:
    case AI_SHOT:
    case AI_BFG_SHOT:
    case AI_HOMING_SHOT:
    case AI_BONUS:
    case AI_ELECTRIC_SPARKLE_VERTICAL:
    case AI_ELECTRIC_SPARKLE_HORIZONTAL:
      break;
    default:
      let score = gobj.ai_type * 100 * (_game.level & 7) + (RandomInt() & 127);
      if (_game.easy_mode) score >>= 1;
      if (ship.i === SHIP_TYPE_ROCKET_LAUNCHER || ship.i === SHIP_TYPE_BFG) score >>= 1;
      AddScore(score);
      break;
  }
}

export function InitEnemiesFromObjects(world: any, screenIdx: number): void {
  const room = world.room[screenIdx];
  const objects = room.object;

  let gobj = gObj_First();
  for (; gobj; gobj = gObj_Next(gobj)) {
    switch (gobj.ai_type) {
      case AI_SMOKE:
        gobj.anim_speed_cnt = 0;
        gobj.cur_frame = gobj.max_frame;
        break;
      case AI_SHIP:
        gobj.laser = null;
      case AI_BASE:
        break;
      default:
        gObj_DestroyObject(gobj);
        break;
    }
  }

  _game.screen_bonus = room.bonus;

  for (let oi = 0; oi < objects.length; oi++) {
    const object = objects[oi];

    if (object.index === BONUS_FACEBOOK || object.index === BONUS_TWITTER) {
      if (_game.mode === 5 || _game.base_screen < _game.ship_screen)
        continue;
    }

    const en = gObj_CreateObject();
    en.i = object.index;
    en.x = object.x;
    en.y = object.y;
    en.anim_speed = object.speed;
    en.anim_speed_cnt = object.speed;
    en.min_frame = object.minframe;
    en.cur_frame = object.minframe;
    en.max_frame = object.maxframe;

    const s = SpriteSet[en.i];
    if (s && en.max_frame >= en.min_frame + s.n) {
      en.max_frame = en.min_frame + s.n - 1;
    }

    gObj_Constructor(en, object.ai);
    en.move_speed = 1;
    en.move_speed_cnt = 1;

    if (en.i === 11 || en.i === 42)
      en.flags &= ~GOBJ_DESTROY;

    if (en.ai_type === AI_HOMING_MISSLE && !_game.easy_mode) {
      en.flags &= ~(GOBJ_SOLID | GOBJ_DESTROY);
    }

    if (en.ai_type === AI_GARAGE) {
      CreateGarage(en, object.garage_id);
    } else if (en.ai_type === AI_HIDDEN_AREA_ACCESS) {
      en.dx = object.speed;
      en.dy = object.minframe;
      if (_game.hidden_level_entered) {
        DestroyHiddenAreaAccess(en, 0);
      }
    }
  }
}
