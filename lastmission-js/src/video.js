import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants.js';

// Backbuffer canvas (320x240) — mirrors original SDL_Surface *small_screen
export const backbuffer = document.createElement('canvas');
backbuffer.width = SCREEN_WIDTH;
backbuffer.height = SCREEN_HEIGHT;
export const ctx = backbuffer.getContext('2d');

// Display canvas (shown on screen)
const display = document.getElementById('game');
const displayCtx = display.getContext('2d');

let scale = 1;

function computeScale() {
  const sx = ((window.innerWidth / SCREEN_WIDTH) | 0);
  const sy = ((window.innerHeight / SCREEN_HEIGHT) | 0);
  scale = Math.max(1, Math.min(sx, sy));
}

function resizeDisplay() {
  computeScale();
  display.width = SCREEN_WIDTH * scale;
  display.height = SCREEN_HEIGHT * scale;
  displayCtx.imageSmoothingEnabled = false;
}

window.addEventListener('resize', resizeDisplay);

export function gfx_init() {
  resizeDisplay();
  return true;
}

export function gfx_quit() {
}

export function gfx_flip() {
  displayCtx.drawImage(
    backbuffer,
    0, 0, SCREEN_WIDTH, SCREEN_HEIGHT,
    0, 0, display.width, display.height
  );
}

export function ClearScreen() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

// ---- 8-bit Indexed BMP data (loaded as raw Uint8Array) ----

export let spriteBuffer = null;  // Uint8Array(SPRITES_WIDTH * SPRITES_HEIGHT)
export let tileBuffer = null;    // Uint8Array(TILES_WIDTH * TILES_HEIGHT)
export let palette = null;       // Uint8Array(256 * 3) RGB

export const SPRITES_WIDTH = 400;
export const SPRITES_HEIGHT = 240;
export const TILES_WIDTH = 320;
export const TILES_HEIGHT = 240;

function parseIndexedBMP(buffer) {
  const dv = new DataView(buffer);

  if (dv.getUint16(0, true) !== 0x4D42)
    throw new Error('Not a BMP file');

  const pixelOffset = dv.getUint32(10, true);
  const width = dv.getInt32(18, true);
  const height = dv.getInt32(22, true);
  const bpp = dv.getUint16(28, true);

  if (bpp !== 8)
    throw new Error('Not an 8-bit BMP');

  // Palette (256 entries x 4 bytes BGRA at offset 54)
  const pal = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const off = 54 + i * 4;
    pal[i * 3]     = dv.getUint8(off + 2); // R
    pal[i * 3 + 1] = dv.getUint8(off + 1); // G
    pal[i * 3 + 2] = dv.getUint8(off);     // B
  }

  // Pixel data (bottom-up, padded to 4-byte rows)
  const stride = ((width + 3) >> 2) << 2;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const srcOff = pixelOffset + (height - 1 - y) * stride;
    const dstOff = y * width;
    for (let x = 0; x < width; x++) {
      pixels[dstOff + x] = dv.getUint8(srcOff + x);
    }
  }

  return { palette: pal, pixels, width, height };
}

export async function LoadSprites() {
  const [spriteResp, tileResp] = await Promise.all([
    fetch('graphics/sprites.bmp'),
    fetch('graphics/tiles.bmp'),
  ]);

  const [spriteAB, tileAB] = await Promise.all([
    spriteResp.arrayBuffer(),
    tileResp.arrayBuffer(),
  ]);

  const sprite = parseIndexedBMP(spriteAB);
  const tile = parseIndexedBMP(tileAB);

  spriteBuffer = sprite.pixels;
  tileBuffer = tile.pixels;
  palette = sprite.palette; // shared palette from sprites.bmp
}
