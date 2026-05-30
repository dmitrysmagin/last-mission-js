import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants.js';

// Backbuffer canvas (320x240) — mirrors original SDL_Surface *small_screen
export const backbuffer = document.createElement('canvas');
backbuffer.width = SCREEN_WIDTH;
backbuffer.height = SCREEN_HEIGHT;

// `ctx` is reassignable so the editor can temporarily redirect drawing
// to an offscreen canvas (mirrors the C editor's small_screen swap).
export let ctx = backbuffer.getContext('2d');

export function setRenderTarget(canvas) {
  ctx = (canvas || backbuffer).getContext('2d');
}

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

// ---- Logo BMP (for title screen animation) ----

export let logoCanvas = null;
export let logoWidth = 0;
export let logoHeight = 0;

export async function LoadLogo() {
  const resp = await fetch('graphics/logo.bmp');
  const ab = await resp.arrayBuffer();
  const logo = parseIndexedBMP(ab);

  logoWidth = logo.width;
  logoHeight = logo.height;

  // Build RGBA canvas (no transparency — index 0 is black background)
  const canvas = document.createElement('canvas');
  canvas.width = logo.width;
  canvas.height = logo.height;
  const cctx = canvas.getContext('2d');
  const imageData = cctx.createImageData(logo.width, logo.height);
  const data = imageData.data;
  const pal = logo.palette;
  const pixels = logo.pixels;

  for (let y = 0; y < logo.height; y++) {
    for (let x = 0; x < logo.width; x++) {
      const idx = pixels[y * logo.width + x];
      const off = (y * logo.width + x) * 4;
      data[off]     = pal[idx * 3];
      data[off + 1] = pal[idx * 3 + 1];
      data[off + 2] = pal[idx * 3 + 2];
      data[off + 3] = 255;
    }
  }

  cctx.putImageData(imageData, 0, 0);
  logoCanvas = canvas;
}

// ---- Title splash images (loaded at startup, drawn in DoSplash) ----

export const splashData = []; // [{pixels, palette, width, height}, ...]

export async function LoadSplash() {
  const names = ['title1.bmp', 'title2.bmp', 'title3.bmp', 'title4.bmp'];
  const responses = await Promise.all(names.map(n => fetch('graphics/' + n)));
  const buffers = await Promise.all(responses.map(r => r.arrayBuffer()));
  for (const buf of buffers) {
    const parsed = parseIndexedBMP(buf);
    splashData.push({
      pixels: parsed.pixels,
      palette: parsed.palette,
      width: parsed.width,
      height: parsed.height,
    });
  }
}

export function DrawSplash(splashIdx) {
  if (splashIdx < 0 || splashIdx >= splashData.length) return;
  const data = splashData[splashIdx];
  if (!data) return;

  // Build RGBA canvas from raw Uint8Array pixel data
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  const cctx = canvas.getContext('2d');
  const imageData = cctx.createImageData(data.width, data.height);
  const pixels = imageData.data;
  const pal = data.palette;
  const src = data.pixels;

  for (let y = 0; y < data.height; y++) {
    for (let x = 0; x < data.width; x++) {
      const idx = src[y * data.width + x];
      const off = (y * data.width + x) * 4;
      pixels[off]     = pal[idx * 3];
      pixels[off + 1] = pal[idx * 3 + 1];
      pixels[off + 2] = pal[idx * 3 + 2];
      pixels[off + 3] = 255;
    }
  }
  cctx.putImageData(imageData, 0, 0);

  // Draw centered
  const cx = (SCREEN_WIDTH - data.width) >> 1;
  const cy = (SCREEN_HEIGHT - data.height) >> 1;
  ctx.drawImage(canvas, cx, cy);
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
