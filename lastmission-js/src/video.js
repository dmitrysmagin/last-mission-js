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
  // Scale backbuffer to display canvas (mirrors original 2x scaler logic)
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
