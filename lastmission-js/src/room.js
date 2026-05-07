import { SCREEN_WIDTH, ACTION_SCREEN_HEIGHT } from './constants.js';
import { SkyMap } from './data.js';
import {
  PutTileI, PutTileS, EraseBackground, DrawLine, PutBgI
} from './sprites.js';

const ROOM_WIDTH = (SCREEN_WIDTH / 8) | 0;     // 40
const ROOM_HEIGHT = (ACTION_SCREEN_HEIGHT / 8) | 0; // 17

// Tile screen buffer (mirrors unsigned short screen[40*17])
const screen = new Uint16Array(ROOM_WIDTH * ROOM_HEIGHT);

export function GetTileI(x, y) {
  if (x < 0 || x >= ROOM_WIDTH || y < 0 || y >= ROOM_HEIGHT)
    return 0;
  return screen[y * ROOM_WIDTH + x];
}

export function SetTileI(x, y, value) {
  if (x < 0 || x >= ROOM_WIDTH || y < 0 || y >= ROOM_HEIGHT)
    return;
  screen[y * ROOM_WIDTH + x] = value;
}

export function UnpackRoom(world, roomIndex) {
  screen.fill(0);

  const room = world.room[roomIndex];
  const end = ROOM_WIDTH * ROOM_HEIGHT;

  for (let pi = 0; pi < room.pattern.length; pi++) {
    const pat = room.pattern[pi];
    const pset = world.patternset[pat.index];
    if (!pset) continue;

    const src = pset.data;
    const dy = pset.ys;
    const dx = pset.xs;

    for (let y = 0; y < dy; y++) {
      for (let x = 0; x < dx; x++) {
        const dstIdx = (pat.y + y) * ROOM_WIDTH + (pat.x + x);
        if (dstIdx >= end) break;
        if (pat.x + x >= ROOM_WIDTH) break;
        const tileVal = src[y * dx + x];
        if (tileVal !== 0) {
          screen[dstIdx] = tileVal;
        }
      }
    }
  }
}

export function BlitRoom() {
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const val = screen[y * ROOM_WIDTH + x];
      if (val !== 0) {
        PutTileI(x * 8, y * 8, val);
      }
    }
  }
}

export function BlitRoomOutlines(world, roomIndex) {
  const room = world.room[roomIndex];
  const shadowCSS = rgb565ToCSS(room.shadow);

  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const val = screen[y * ROOM_WIDTH + x];
      if (val !== 0) {
        PutTileS(x * 8, y * 8, val, shadowCSS);
      }
    }
  }
}

export function BlitBackground(world, roomIndex) {
  if (roomIndex >= world.room_num) return;

  const room = world.room[roomIndex];

  EraseBackground(rgb565ToCSS(room.background));

  // Draw BGLINEs (two passes: shadow, then light)
  for (let pass = 0; pass < 2; pass++) {
    const color = pass === 1
      ? rgb565ToCSS(room.line_light)
      : rgb565ToCSS(room.line_shadow);

    for (let j = 0; j < room.bgline.length; j++) {
      const bg = room.bgline[j];
      let x1 = bg.x1, y1 = bg.y1, x2 = bg.x2, y2 = bg.y2;

      if (pass === 0) {
        // shadow pass: offset by 1 pixel
        if (x1 === x2) {
          DrawLine(x1 - 1, y1, x2 - 1, y2, color);
        } else if (y1 === y2) {
          DrawLine(x1, y1 - 1, x2, y2 - 1, color);
        } else {
          DrawLine(x1 - 1, y1, x2 - 1, y2, color);
        }
      } else {
        DrawLine(x1, y1, x2, y2, color);
      }
    }
  }

  // Draw sky background for levels 70-91
  if (roomIndex > 69 && roomIndex < 92) {
    for (let y = 0; y <= 8; y++) {
      for (let x = 0; x <= 20; x++) {
        const skyTile = SkyMap[y][x];
        if (skyTile !== 0) {
          PutBgI(x * 16 - 4, y * 16 - 8, skyTile);
        }
      }
    }
  }
}

// ---- Color conversion ----

// Cache for rgb565ToCSS to avoid repeated string allocations
const cssCache = new Map();

export function rgb565ToCSS(color) {
  let cached = cssCache.get(color);
  if (cached) return cached;

  let result;
  if (color > 0xFFFFFF) {
    // 32-bit ARGB
    const b = color & 0xFF;
    const g = (color >> 8) & 0xFF;
    const r = (color >> 16) & 0xFF;
    result = `rgb(${r},${g},${b})`;
  } else {
    // 16-bit RGB565
    const r = (color >> 11) & 0x1F;
    const g = (color >> 5) & 0x3F;
    const b = color & 0x1F;
    const rr = (r << 3) | (r >> 2);
    const gg = (g << 2) | (g >> 4);
    const bb = (b << 3) | (b >> 2);
    result = `rgb(${rr},${gg},${bb})`;
  }

  cssCache.set(color, result);
  return result;
}
