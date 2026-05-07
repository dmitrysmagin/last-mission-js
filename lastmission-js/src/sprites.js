import { SCREEN_WIDTH, SCREEN_HEIGHT, ACTION_SCREEN_HEIGHT } from './constants.js';
import { ctx } from './video.js';

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
const FONT_ROW_OFFSET = 64; // 8 rows * 8px

// Pre-processed sprite sheet canvas
let spritesCanvas = null;
let spritesData = null;

// Pre-processed tile canvases
let tilesCanvas = null;      // with color key (black transparent)
let tilesOpaqueCanvas = null; // without color key
let tilesData = null;        // pixel data for tiles (with key)

export function GetSpriteW(index) {
  if (index < 0 || index >= SpriteSet.length) return 0;
  return SpriteSet[index].w;
}

export function GetSpriteH(index) {
  if (index < 0 || index >= SpriteSet.length) return 0;
  return SpriteSet[index].h;
}

// Apply color key (black → transparent) to a canvas
function applyColorKey(canvas) {
  const ctx2 = canvas.getContext('2d');
  const imageData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
      data[i + 3] = 0;
    }
  }
  ctx2.putImageData(imageData, 0, 0);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function LoadSprites() {
  // Load and process sprites.bmp
  const spriteImg = await loadImage('graphics/sprites.bmp');
  spritesCanvas = document.createElement('canvas');
  spritesCanvas.width = spriteImg.width;
  spritesCanvas.height = spriteImg.height;
  const sctx = spritesCanvas.getContext('2d');
  sctx.drawImage(spriteImg, 0, 0);
  applyColorKey(spritesCanvas);

  // Load and process tiles.bmp
  const tileImg = await loadImage('graphics/tiles.bmp');
  // With color key
  tilesCanvas = document.createElement('canvas');
  tilesCanvas.width = tileImg.width;
  tilesCanvas.height = tileImg.height;
  const tctx = tilesCanvas.getContext('2d');
  tctx.drawImage(tileImg, 0, 0);
  applyColorKey(tilesCanvas);

  // Without color key
  tilesOpaqueCanvas = document.createElement('canvas');
  tilesOpaqueCanvas.width = tileImg.width;
  tilesOpaqueCanvas.height = tileImg.height;
  const toctx = tilesOpaqueCanvas.getContext('2d');
  toctx.drawImage(tileImg, 0, 0);

  // Cache pixel data for pixel-level ops
  spritesData = sctx.getImageData(0, 0, spritesCanvas.width, spritesCanvas.height);
  tilesData = tctx.getImageData(0, 0, tilesCanvas.width, tilesCanvas.height);
}

function getSpritePixelData(index, frame) {
  const s = SpriteSet[index];
  if (!s || frame >= s.n) return null;
  const sx = s.x + s.dx * frame;
  const sy = s.y + s.dy * frame;
  const w = s.w;
  const h = s.h;
  const imgData = spritesData;
  const result = new Uint8Array(w * h);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = sx + dx;
      const py = sy + dy;
      const off = (py * imgData.width + px) * 4;
      result[dy * w + dx] = imgData.data[off + 3]; // alpha
    }
  }
  return { data: result, w, h };
}

// ---- Rendering primitives ----

export function PutSpriteI(x, y, index, frame) {
  if (!spritesCanvas) return;
  if (index < 0 || index >= SpriteSet.length) return;
  const s = SpriteSet[index];
  if (frame >= s.n) return;
  const sx = s.x + s.dx * frame;
  const sy = s.y + s.dy * frame;
  ctx.drawImage(spritesCanvas, sx, sy, s.w, s.h, x, y, s.w, s.h);
}

export function PutSpriteS(x, y, index, frame, colorCSS) {
  const px = getSpritePixelData(index, frame);
  if (!px) return;
  for (let dy = 0; dy < px.h; dy++) {
    for (let dx = 0; dx < px.w; dx++) {
      if (px.data[dy * px.w + dx] !== 0) {
        PutPixel(x + dx - 1, y + dy, colorCSS);
        PutPixel(x + dx + 1, y + dy, colorCSS);
        PutPixel(x + dx, y + dy - 1, colorCSS);
        PutPixel(x + dx, y + dy + 1, colorCSS);
        PutPixel(x + dx, y + dy + 2, colorCSS);
      }
    }
  }
}

export function PutTileI(x, y, index) {
  if (!tilesCanvas) return;
  if (index > 256) return;
  const sx = (index % TILES_PER_ROW) * TILE_SIZE;
  const sy = ((index / TILES_PER_ROW) | 0) * TILE_SIZE;
  ctx.drawImage(tilesCanvas, sx, sy, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE);
}

export function PutTileS(x, y, index, colorCSS) {
  if (!tilesData) return;
  if (index > 256) return;
  const sx = (index % TILES_PER_ROW) * TILE_SIZE;
  const sy = ((index / TILES_PER_ROW) | 0) * TILE_SIZE;
  const w = TILE_SIZE, h = TILE_SIZE;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = sx + dx;
      const py = sy + dy;
      const off = (py * tilesData.width + px) * 4;
      if (tilesData.data[off + 3] !== 0) {
        PutPixel(x + dx - 1, y + dy, colorCSS);
        PutPixel(x + dx + 1, y + dy, colorCSS);
        PutPixel(x + dx, y + dy - 1, colorCSS);
        PutPixel(x + dx, y + dy + 1, colorCSS);
        PutPixel(x + dx, y + dy + 2, colorCSS);
      }
    }
  }
}

// Background sprites (from row 6 of tiles, 16x16)
export function PutBgI(x, y, index) {
  if (!tilesCanvas) return;
  if (index > 9) return;
  const sx = index * 16;
  const sy = 6 * 16;
  ctx.drawImage(tilesCanvas, sx, sy, 16, 16, x, y, 16, 16);
}

// Font rendering (from tiles without color key)
function PutLetterI(x, y, index) {
  if (!tilesOpaqueCanvas) return;
  if (index > 256) return;
  const sx = (index % TILES_PER_ROW) * TILE_SIZE;
  const sy = ((index / TILES_PER_ROW) | 0) * TILE_SIZE + FONT_ROW_OFFSET;
  ctx.drawImage(tilesOpaqueCanvas, sx, sy, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE);
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

export function PutPixel(x, y, colorCSS) {
  ctx.fillStyle = colorCSS;
  ctx.fillRect(x, y, 1, 1);
}

export function DrawLine(x1, y1, x2, y2, colorCSS) {
  ctx.strokeStyle = colorCSS;
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
