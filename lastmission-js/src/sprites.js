import { SCREEN_WIDTH, SCREEN_HEIGHT, ACTION_SCREEN_HEIGHT } from './constants.js';
import { ctx, palette, spriteBuffer, tileBuffer, SPRITES_WIDTH, TILES_WIDTH, logoCanvas, logoWidth } from './video.js';

// ---- SPRITESET definitions (from sprites.c) ----
// {x, y, w, h, dx, dy, frames}
const SpriteSet = [
  { x: 17*16, y:  3*16, w: 32, h: 12, dx:  0, dy: 16, n: 7  }, // 0 ship
  { x: 12*16, y: 13*16, w: 40, h: 16, dx: 40, dy:  0, n: 2  }, // 1 chassis
  { x:  0*16, y:  0*16, w: 16, h: 16, dx: 16, dy:  0, n: 3  }, // 2 enemy explosion
  { x:  0*16, y:  1*16, w: 16, h: 16, dx: 16, dy:  0, n: 3  },
  { x:  0*16, y:  2*16, w: 16, h: 16, dx: 16, dy:  0, n: 3  },
  { x:  0*16, y:  3*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  0*16, y:  4*16, w:  8, h: 16, dx:  8, dy:  0, n: 2  }, // 6 breakable walls
  { x:  0*16, y:  5*16, w: 16, h: 16, dx: 16, dy:  0, n: 3  }, // 7 walls explosion
  { x:  0*16, y:  6*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  0*16, y:  7*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  0*16, y:  8*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  0*16, y:  9*16, w: 16, h: 16, dx: 16, dy:  0, n: 2  },
  { x:  0*16, y: 10*16, w: 16, h: 16, dx: 16, dy:  0, n: 3  },
  { x:  0*16, y: 11*16, w: 16, h: 16, dx: 16, dy:  0, n: 2  },
  { x:  0*16, y: 12*16, w: 16, h: 16, dx: 16, dy:  0, n: 2  },
  { x:  0*16, y: 13*16, w: 16, h: 16, dx: 16, dy:  0, n: 2  },
  { x:  0*16, y: 14*16, w: 16, h: 16, dx: 16, dy:  0, n: 2  },
  { x: 12*16, y:  5*16, w: 16, h:  6, dx: 16, dy:  0, n: 2  }, // 17 horizontal sparkle
  { x: 12*16, y:  6*16, w:  8, h: 14, dx:  8, dy:  0, n: 2  }, // 18 vertical sparkle
  { x:  5*16, y:  0*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  5*16, y:  1*16, w: 16, h: 16, dx: 16, dy:  0, n: 2  },
  { x: 12*16, y:  7*16, w: 48, h:  8, dx:  0, dy:  0, n: 1  }, // 21 elevator platform
  { x:  5*16, y:  2*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x: 12*16, y: 14*16, w: 32, h: 12, dx: 32, dy:  0, n: 4  }, // 23 chassis explosion
  { x:  5*16, y:  3*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  5*16, y:  4*16, w: 16, h: 16, dx: 16, dy:  0, n: 6  },
  { x:  5*16, y:  5*16, w: 16, h: 16, dx: 16, dy:  0, n: 2  },
  { x:  5*16, y:  6*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  5*16, y:  7*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  5*16, y:  8*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  5*16, y:  9*16, w: 16, h: 16, dx: 16, dy:  0, n: 6  },
  { x:  5*16, y: 10*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  5*16, y: 11*16, w: 16, h: 16, dx: 16, dy:  0, n: 6  },
  { x:  5*16, y: 12*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  5*16, y: 13*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x:  5*16, y: 14*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x: 12*16, y:  0*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x: 12*16, y:  1*16, w: 16, h: 16, dx: 16, dy:  0, n: 6  },
  { x: 12*16, y:  2*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  },
  { x: 12*16, y:  3*16, w: 16, h: 16, dx: 16, dy:  0, n: 2  },
  { x: 12*16, y:  8*16, w: 24, h:  7, dx: 24, dy:  0, n: 2  }, // 40 missile 1
  { x: 12*16, y:  9*16, w: 24, h:  7, dx: 24, dy:  0, n: 2  }, // 41 missile 2
  { x: 12*16, y:  4*16, w: 16, h: 16, dx: 16, dy:  0, n: 4  }, // 42 cannon
  { x: 12*16, y: 10*16, w:  4, h:  4, dx:  0, dy:  0, n: 1  }, // 43 bullet
  { x: 12*16, y: 11*16, w: 40, h:  8, dx:  0, dy:  0, n: 1  }, // 44 platform
  { x: 12*16, y: 12*16, w: 72, h: 12, dx:  0, dy:  0, n: 1  }, // 45 Opera Soft logo
  { x:   117,    y:   17, w: 13, h: 13, dx: 13, dy:  0, n: 5  }, // 46 smoke
  { x:   151,    y:   33, w: 15, h: 15, dx:  0, dy:  0, n: 1  }, // 47 facebook logo
  { x:   167,    y:   33, w: 15, h: 15, dx:  0, dy:  0, n: 1  }, // 48 twitter logo
  { x:   243,    y:   86, w: 26, h: 19, dx:  0, dy: 19, n: 4  }, // 49 two astronauts
  { x:   372,    y:   52, w:  8, h:  2, dx:  0, dy:  3, n: 2  }, // 50 machine gun bullet
  { x:   334,    y:  3*16, w: 32, h: 12, dx:  0, dy: 16, n: 7  }, // 51 machine gun ship
  { x:   165,    y:   91, w: 11, h: 12, dx:  0, dy:  0, n: 1  }, // 52 extra HP
  { x:   303,    y:  3*16, w: 32, h: 12, dx:  0, dy: 16, n: 7  }, // 53 rocket ship
  { x:   309,    y:   12, w: 14, h:  8, dx:  0, dy:  8, n: 4  }, // 54 rocket
  { x:   375,    y:  145, w: 16, h: 16, dx:  0, dy: 18, n: 5  }, // 55 BFG
  { x:   287,    y:  204, w: 10, h: 10, dx: 11, dy:  0, n: 4  }, // 56 BFG shot
];

const TILE_SIZE = 8;
const TILES_PER_ROW = 40;
// Font starts at tile row 8 (handled in getFontCanvas)

// ---- Indexed BMP canvas cache helpers ----

// Convert a region of indexed pixel data to a canvas (RGBA via palette)
function indexedRegionToCanvas(pixels, bufW, sx, sy, sw, sh, pal, transparent) {
  if (!pixels || !pal) return null;

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const cctx = canvas.getContext('2d');
  const imageData = cctx.createImageData(sw, sh);
  const data = imageData.data;

  for (let dy = 0; dy < sh; dy++) {
    for (let dx = 0; dx < sw; dx++) {
      const idx = pixels[(sy + dy) * bufW + (sx + dx)];
      const off = (dy * sw + dx) * 4;
      if (transparent && idx === 0) {
        data[off + 3] = 0; // transparent
      } else {
        data[off]     = pal[idx * 3];
        data[off + 1] = pal[idx * 3 + 1];
        data[off + 2] = pal[idx * 3 + 2];
        data[off + 3] = 255;
      }
    }
  }

  cctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Cached sprite frame canvases (built from spriteBuffer)
const spriteFrameCache = new Map();

function getSpriteCanvas(index, frame) {
  const key = `${index}-${frame}`;
  let cached = spriteFrameCache.get(key);
  if (cached) return cached;

  const s = SpriteSet[index];
  if (!s || frame >= s.n) return null;

  const sx = s.x + s.dx * frame;
  const sy = s.y + s.dy * frame;

  cached = indexedRegionToCanvas(spriteBuffer, SPRITES_WIDTH, sx, sy, s.w, s.h, palette, true);
  spriteFrameCache.set(key, cached);
  return cached;
}

// Cached tile canvases (8x8, transparent for index 0)
const tileCache = new Map();

function getTileCanvas(index) {
  const key = `tile-${index}`;
  let cached = tileCache.get(key);
  if (cached) return cached;

  const sx = ((index % TILES_PER_ROW) | 0) * TILE_SIZE;
  const sy = ((index / TILES_PER_ROW) | 0) * TILE_SIZE;

  cached = indexedRegionToCanvas(tileBuffer, TILES_WIDTH, sx, sy, TILE_SIZE, TILE_SIZE, palette, true);
  tileCache.set(key, cached);
  return cached;
}

// Cached font character canvases (from tileBuffer, tile row 8+, no transparency)
const fontCache = new Map();

function getFontCanvas(index) {
  const key = `font-${index}`;
  let cached = fontCache.get(key);
  if (cached) return cached;

  const col = (index % TILES_PER_ROW) | 0;
  const row = ((index / TILES_PER_ROW) | 0) + 8; // font starts at tile row 8
  const sx = col * TILE_SIZE;
  const sy = row * TILE_SIZE;

  cached = indexedRegionToCanvas(tileBuffer, TILES_WIDTH, sx, sy, TILE_SIZE, TILE_SIZE, palette, false);
  fontCache.set(key, cached);
  return cached;
}

// Cached background sprite canvases (16x16 from tileBuffer row 6)
const bgCache = new Map();

function getBgCanvas(index) {
  const key = `bg-${index}`;
  let cached = bgCache.get(key);
  if (cached) return cached;

  const sx = index * 16;
  const sy = 6 * 16;

  cached = indexedRegionToCanvas(tileBuffer, TILES_WIDTH, sx, sy, 16, 16, palette, true);
  bgCache.set(key, cached);
  return cached;
}

export function GetSpriteW(index) {
  if (index < 0 || index >= SpriteSet.length) return 0;
  return SpriteSet[index].w;
}

export function GetSpriteH(index) {
  if (index < 0 || index >= SpriteSet.length) return 0;
  return SpriteSet[index].h;
}

// ---- Rendering primitives ----

// Cache for colored shadow versions
const shadowSpriteCache = new Map();
// Cache for colored shadow tiles - key: "tileIndex-color", value: canvas
const shadowTileCache = new Map();

// Helper to create a colored shadow canvas from a source canvas region.
// Optionally accepts a unique cacheKey to avoid collisions when source
// canvases are pre-cropped (always at origin 0,0).
function createColoredShadow(srcCanvas, sx, sy, sw, sh, colorCSS, offsetX, offsetY, cacheKey) {
  const key = cacheKey || `${sx}-${sy}-${sw}-${sh}-${colorCSS}`;
  let cached = shadowSpriteCache.get(key);
  if (cached) return cached;

  // Create offscreen canvas
  const offscreen = document.createElement('canvas');
  offscreen.width = sw + 2; // extra padding for shadow offset
  offscreen.height = sh + 3;
  const offCtx = offscreen.getContext('2d');

  // Fill with color
  let cachedStyle = fillStyleCache.get(colorCSS);
  if (!cachedStyle) {
    cachedStyle = colorCSS;
    fillStyleCache.set(colorCSS, cachedStyle);
  }
  offCtx.fillStyle = cachedStyle;

  // Get source alpha data and draw pixels
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const imgData = tempCtx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  // Draw colored pixels at original position + offset
  for (let dy = 0; dy < sh; dy++) {
    for (let dx = 0; dx < sw; dx++) {
      const srcOff = (dy * sw + dx) * 4;
      if (data[srcOff + 3] !== 0) { // alpha > 0
        // Draw glow pattern at offset positions
        offCtx.fillRect(dx + offsetX - 1, dy + offsetY, 1, 1);
        offCtx.fillRect(dx + offsetX + 1, dy + offsetY, 1, 1);
        offCtx.fillRect(dx + offsetX, dy + offsetY - 1, 1, 1);
        offCtx.fillRect(dx + offsetX, dy + offsetY + 1, 1, 1);
        offCtx.fillRect(dx + offsetX, dy + offsetY + 2, 1, 1);
      }
    }
  }

  shadowSpriteCache.set(key, offscreen);
  return offscreen;
}

export function PutSpriteI(x, y, index, frame) {
  const canvas = getSpriteCanvas(index, frame);
  if (!canvas) return;
  ctx.drawImage(canvas, x, y);
}

export function PutSpriteS(x, y, index, frame, colorCSS) {
  if (index < 0 || index >= SpriteSet.length) return;
  const s = SpriteSet[index];
  if (frame >= s.n) return;

  const srcCanvas = getSpriteCanvas(index, frame);
  if (!srcCanvas) return;

  const cacheKey = `sprite-${index}-${frame}-${colorCSS}`;
  const shadow = createColoredShadow(srcCanvas, 0, 0, s.w, s.h, colorCSS, 0, 0, cacheKey);
  ctx.drawImage(shadow, x - 1, y - 1);
}

export function PutTileI(x, y, index) {
  if (index > 256) return;
  const canvas = getTileCanvas(index);
  if (!canvas) return;
  ctx.drawImage(canvas, x, y);
}

export function PutTileS(x, y, index, colorCSS) {
  if (index > 256) return;

  const key = `${index}-${colorCSS}`;
  let cached = shadowTileCache.get(key);
  if (cached) {
    ctx.drawImage(cached, x - 1, y - 1);
    return;
  }

  const tileCanvas = getTileCanvas(index);
  if (!tileCanvas) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = TILE_SIZE + 2;
  offscreen.height = TILE_SIZE + 3;
  const offCtx = offscreen.getContext('2d');

  let cachedStyle = fillStyleCache.get(colorCSS);
  if (!cachedStyle) {
    cachedStyle = colorCSS;
    fillStyleCache.set(colorCSS, cachedStyle);
  }
  offCtx.fillStyle = cachedStyle;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = TILE_SIZE;
  tempCanvas.height = TILE_SIZE;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(tileCanvas, 0, 0);

  const imgData = tempCtx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  const data = imgData.data;

  for (let dy = 0; dy < TILE_SIZE; dy++) {
    for (let dx = 0; dx < TILE_SIZE; dx++) {
      const off = (dy * TILE_SIZE + dx) * 4;
      if (data[off + 3] !== 0) {
        offCtx.fillRect(dx, dy, 1, 1);
        offCtx.fillRect(dx + 2, dy, 1, 1);
        offCtx.fillRect(dx + 1, dy - 1, 1, 1);
        offCtx.fillRect(dx + 1, dy + 1, 1, 1);
        offCtx.fillRect(dx + 1, dy + 2, 1, 1);
      }
    }
  }

  shadowTileCache.set(key, offscreen);
  ctx.drawImage(offscreen, x - 1, y - 1);
}

// Background sprites (from row 6 of tiles, 16x16)
export function PutBgI(x, y, index) {
  if (index > 9) return;
  const canvas = getBgCanvas(index);
  if (!canvas) return;
  ctx.drawImage(canvas, x, y);
}

// Font rendering (from tiles without color key)
function PutLetterI(x, y, index) {
  if (index > 256) return;
  const canvas = getFontCanvas(index);
  if (!canvas) return;
  ctx.drawImage(canvas, x, y);
}

function AdjustAscii(a) {
  if (a >= 0x41 && a <= 0x5a) return a - 0x41 + 0x0c; // A-Z
  if (a === 0x20) return 0; // space
  if (a >= 0x30 && a <= 0x39) return a - 0x30 + 1; // 0-9
  return 0;
}

export function PutString(x, y, str) {
  for (let i = 0; i < str.length; i++) {
    PutLetterI(x, y, AdjustAscii(str.charCodeAt(i)));
    x += TILE_SIZE;
  }
}

export function PutStream(x, y, data) {
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) break;
    PutLetterI(x, y, data[i]);
    x += TILE_SIZE;
  }
}

export function FillScreen(x, y, w, h, colorCSS) {
  ctx.fillStyle = colorCSS;
  ctx.fillRect(x, y, w, h);
}

export function EraseBackground(colorCSS) {
  FillScreen(0, 0, SCREEN_WIDTH, ACTION_SCREEN_HEIGHT, colorCSS);
}

// Cache for fillStyle strings to avoid repeated string allocations
const fillStyleCache = new Map();

export function PutPixel(x, y, colorCSS) {
  let cachedStyle = fillStyleCache.get(colorCSS);
  if (!cachedStyle) {
    cachedStyle = colorCSS;
    fillStyleCache.set(colorCSS, cachedStyle);
  }
  ctx.fillStyle = cachedStyle;
  ctx.fillRect(x, y, 1, 1);
}

export function PutLine(x, y, line) {
  if (!logoCanvas) return;
  ctx.drawImage(logoCanvas, 0, line, logoWidth, 1, x, y, logoWidth, 1);
}

export function DrawLine(x1, y1, x2, y2, colorCSS) {
  let cachedStyle = fillStyleCache.get(colorCSS);
  if (!cachedStyle) {
    cachedStyle = colorCSS;
    fillStyleCache.set(colorCSS, cachedStyle);
  }
  ctx.strokeStyle = cachedStyle;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function DrawRect(x, y, w, h, colorCSS) {
  ctx.strokeStyle = colorCSS;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

// Use save/restore for clip region
let clipStackDepth = 0;

export function SetClipGameArea(flag) {
  if (flag) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SCREEN_WIDTH, ACTION_SCREEN_HEIGHT);
    ctx.clip();
    clipStackDepth++;
  } else {
    if (clipStackDepth > 0) {
      ctx.restore();
      clipStackDepth--;
    }
  }
}
