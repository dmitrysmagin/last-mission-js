/*
 * Level/room editor — port of editor.c.
 *
 * Three modes are wired up (the C code defines five but only uses three):
 *   MAPEDIT (0)  — browse the world map; ENTER to enter ROOMEDIT
 *   ROOMVIEW (1) — preview the current room; ENTER to enter ROOMEDIT
 *   ROOMEDIT (4) — edit patterns in the current room
 *
 * TAB / BACKSPACE toggle between MAPEDIT and ROOMVIEW.
 * ESCAPE returns to the game title (or to old_editmode from ROOMEDIT).
 */

import {
  SCREEN_WIDTH, ACTION_SCREEN_HEIGHT,
  SC_ESCAPE, SC_ENTER, SC_LEFT, SC_RIGHT, SC_UP, SC_DOWN,
  SC_SPACE, SC_TAB, SC_BACKSPACE, SC_Z, SC_X, SC_C, SC_V,
  GM_TITLE,
} from './constants.js';

import { Keys, input_reset } from './input.js';
import {
  ctx, backbuffer, ClearScreen, setRenderTarget,
} from './video.js';
import {
  PutString, PutTileI, PutSpriteI, DrawRect, SpriteSet,
} from './sprites.js';
import { UnpackRoom, BlitRoom } from './room.js';
import {
  gObj_First, gObj_Next, gObj_DestroyAll,
  InitGaragesForNewGame, GarageRestore,
  InitEnemiesFromObjects, GOBJ_VISIBLE,
} from './object.js';
import { SetGameMode, getscreen } from './engine.js';

// ---------------------------------------------------------------
// Mode constants (mirrors editor.c #defines)
// ---------------------------------------------------------------

const MAPEDIT = 0;
const ROOMVIEW = 1;
// const MACROTILE = 2; // defined in C but unused
// const SPRITESET = 3; // defined in C but unused
const ROOMEDIT = 4;

// ---------------------------------------------------------------
// Editor state
// ---------------------------------------------------------------

let reinit = 1;
let cur_room = 1;
let cur_patternset = 0;
let cur_sprite = 0;
let old_editmode = MAPEDIT;
let editmode = ROOMVIEW;
let cur_pattern = 0;
let cur_mapx = 0;
let cur_mapy = 11;

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function pad3(n) {
  return String(n).padStart(3, '0');
}

// Cached world reference, refreshed on every DoEdit() call.
let _world = null;

// Re-renders the current room into the backbuffer.
// Equivalent to ReDraw() in editor.c.
function ReDraw(roomnum) {
  ClearScreen();
  UnpackRoom(_world, roomnum);
  BlitRoom();
  InitGaragesForNewGame();
  GarageRestore();
  gObj_DestroyAll();
  InitEnemiesFromObjects(_world, roomnum);

  // Blit enemies (equivalent of C BlitEnemies — only visible objects).
  for (let g = gObj_First(); g; g = gObj_Next(g)) {
    if (g.flags & GOBJ_VISIBLE) {
      PutSpriteI(g.x, g.y, g.i, g.cur_frame);
    }
  }
}

// ---------------------------------------------------------------
// Press helpers — mirror the ON_PRESS / ELSE macros from editor.c
// ---------------------------------------------------------------

// Returns true if (Keys[sc] && cond) — when true, also runs side effects
// (input_reset + reinit=1) and lets the caller perform its action.
function onPress(sc, cond) {
  if (Keys[sc] && cond) {
    input_reset();
    reinit = 1;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// MAPEDIT — browse the world map
// ---------------------------------------------------------------

function ShowMap() {
  // Render each of the 3x5 cells of the surrounding map to a temporary
  // offscreen canvas (the C "small_screen" swap), then draw it scaled
  // 1/3 into the backbuffer at the proper grid cell.
  const small = document.createElement('canvas');
  small.width = SCREEN_WIDTH;
  small.height = ACTION_SCREEN_HEIGHT;

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const roomnum = getscreen(cur_mapx + x - 1, cur_mapy + y - 2);
      if (!roomnum) continue;

      setRenderTarget(small);
      ReDraw(roomnum);

      // Restore main target and copy the small canvas at 1/3 scale.
      setRenderTarget(backbuffer);
      // ctx is now the backbuffer's context (live binding).
      ctx.drawImage(
        small,
        0, 0, SCREEN_WIDTH, ACTION_SCREEN_HEIGHT,
        107 * x, 46 * y, SCREEN_WIDTH / 3, ACTION_SCREEN_HEIGHT / 3
      );
    }
  }

  // Defensive: make sure we end up rendering to the backbuffer.
  setRenderTarget(backbuffer);

  // Highlight the player-start cell (row index 2, column index 1).
  DrawRect(107, 46 * 2, 107, 46, 'rgb(255,0,255)');
}

function ShowMapInfo() {
  const roomnum = getscreen(cur_mapx, cur_mapy);
  PutString(0 * 8, 29 * 8, `ROOM    ${pad3(roomnum)}:${pad3(_world.room_num - 1)}`);
  PutString(18 * 8, 29 * 8, `X ${pad3(cur_mapx)}`);
  PutString(26 * 8, 29 * 8, `Y ${pad3(cur_mapy)}`);
}

function MapEdit() {
  if (reinit) {
    ClearScreen();
    ShowMap();
    ShowMapInfo();
    reinit = 0;
  }

  if (Keys[SC_ENTER]) {
    input_reset();
    reinit = 1;
    old_editmode = editmode;
    editmode = ROOMEDIT;
    cur_room = getscreen(cur_mapx, cur_mapy);
    return;
  }

  if (onPress(SC_LEFT, cur_mapx > 0)) cur_mapx--;
  else if (onPress(SC_RIGHT, cur_mapx < _world.mapw - 1)) cur_mapx++;
  else if (onPress(SC_UP, cur_mapy > 0)) cur_mapy--;
  else if (onPress(SC_DOWN, cur_mapy < _world.maph - 1)) cur_mapy++;
  else if (onPress(SC_ESCAPE, 1)) SetGameMode(GM_TITLE);
}

// ---------------------------------------------------------------
// ROOMVIEW — preview the current room
// ---------------------------------------------------------------

function ShowViewModeInfo() {
  const patternset = _world.patternset[cur_patternset];
  const data = patternset.data;

  let idx = 0;
  for (let y = 0; y < patternset.ys; y++) {
    for (let x = 0; x < patternset.xs; x++) {
      PutTileI(x * 8 + 132, y * 8 + 22 * 8, data[idx++]);
    }
  }

  PutSpriteI(30 * 8, 22 * 8, cur_sprite, 0);

  PutString(0 * 8, 21 * 8, `ROOM    ${pad3(cur_room)}:${pad3(_world.room_num - 1)}`);
  PutString(0 * 8, 22 * 8, `PTRNSET ${pad3(cur_patternset)}:${pad3(_world.patternset_num - 1)}`);
  PutString(0 * 8, 23 * 8, `SPRTSET ${pad3(cur_sprite)}:${pad3(SpriteSet.length - 1)}`);

  PutString(16 * 8, 20 * 8, 'VIEW MODE');
}

function RoomView() {
  if (reinit) {
    ReDraw(cur_room);
    ShowViewModeInfo();
    reinit = 0;
  }

  if (onPress(SC_ENTER, 1)) {
    old_editmode = editmode;
    editmode = ROOMEDIT;
    cur_pattern = 0;
  }
  else if (onPress(SC_ESCAPE, 1)) SetGameMode(GM_TITLE);
  else if (onPress(SC_Z, cur_patternset > 0)) cur_patternset--;
  else if (onPress(SC_X, cur_patternset < _world.patternset_num - 1)) cur_patternset++;
  else if (onPress(SC_C, cur_sprite > 0)) cur_sprite--;
  else if (onPress(SC_V, cur_sprite < SpriteSet.length - 1)) cur_sprite++;
  else if (onPress(SC_LEFT, cur_room > 0)) cur_room--;
  else if (onPress(SC_RIGHT, cur_room < _world.room_num - 1)) cur_room++;
}

// ---------------------------------------------------------------
// ROOMEDIT — edit patterns in the current room
// ---------------------------------------------------------------

function ShowEditModeInfo() {
  const room = _world.room[cur_room];
  const pattern = room.pattern[cur_pattern];
  const patternset = _world.patternset[pattern.index];

  PutString(16 * 8, 20 * 8, 'ROOM EDIT');
  PutString(0 * 8, 21 * 8, `PATTERN ${pad3(cur_pattern)}:${pad3(room.pattern_num - 1)}`);
  PutString(0 * 8, 22 * 8, `X ${pad3(pattern.x * 8)}`);
  PutString(0 * 8, 23 * 8, `Y ${pad3(pattern.y * 8)}`);
  PutString(0 * 8, 24 * 8, `I ${pad3(pattern.index)}:${pad3(_world.patternset_num - 1)}`);

  DrawRect(pattern.x * 8, pattern.y * 8,
           patternset.xs * 8, patternset.ys * 8,
           'rgb(255,0,255)');
}

function RoomEdit() {
  const room = _world.room[cur_room];
  const pattern = room.pattern[cur_pattern];

  if (reinit) {
    ReDraw(cur_room);
    ShowEditModeInfo();
    reinit = 0;
  }

  if (onPress(SC_ESCAPE, 1)) { editmode = old_editmode; return; }
  if (onPress(SC_Z, pattern.index > 0)) { pattern.index--; return; }
  if (onPress(SC_X, pattern.index < _world.patternset_num - 1)) { pattern.index++; return; }

  // Pattern movement: hold SPACE + arrow to shift the current pattern;
  // arrow alone selects previous/next pattern in the room.
  if (Keys[SC_LEFT]) {
    if (Keys[SC_SPACE] && pattern.x > 0) {
      input_reset();
      reinit = 1;
      pattern.x--;
      Keys[SC_SPACE] = 1; // keep SPACE held so user can shift again
    } else if (cur_pattern > 0) {
      cur_pattern--;
      input_reset();
      reinit = 1;
    }
    return;
  }

  if (Keys[SC_RIGHT]) {
    if (Keys[SC_SPACE] && pattern.x < SCREEN_WIDTH / 8 - 1) {
      input_reset();
      reinit = 1;
      pattern.x++;
      Keys[SC_SPACE] = 1;
    } else if (cur_pattern < room.pattern_num - 1) {
      cur_pattern++;
      input_reset();
      reinit = 1;
    }
    return;
  }

  if (Keys[SC_UP]) {
    if (Keys[SC_SPACE] && pattern.y > 0) {
      input_reset();
      reinit = 1;
      pattern.y--;
      Keys[SC_SPACE] = 1;
    }
    return;
  }

  if (Keys[SC_DOWN]) {
    if (Keys[SC_SPACE] && pattern.y < ACTION_SCREEN_HEIGHT / 8 - 1) {
      input_reset();
      reinit = 1;
      pattern.y++;
      Keys[SC_SPACE] = 1;
    }
  }
}

// ---------------------------------------------------------------
// DoEdit — main editor entry point, called once per frame from DoGame
// ---------------------------------------------------------------

export function DoEdit(worldRef) {
  _world = worldRef;

  // TAB / BACKSPACE toggle between MAPEDIT (0) and ROOMVIEW (1).
  if (editmode <= ROOMVIEW) {
    if (onPress(SC_TAB, editmode > 0)) editmode--;
    else if (onPress(SC_BACKSPACE, editmode < ROOMVIEW)) editmode++;
  }

  switch (editmode) {
    case MAPEDIT:  MapEdit(); break;
    case ROOMVIEW: RoomView(); break;
    case ROOMEDIT: RoomEdit(); break;
  }
}

// Reset internal flags when re-entering the editor.
export function EditorReset() {
  reinit = 1;
}
