import {
  SC_UP, SC_DOWN, SC_LEFT, SC_RIGHT,
  SC_ESCAPE, SC_ENTER, SC_CONTROL,
  SC_SPACE, SC_E, SC_S, SC_F,
  SC_Z, SC_X, SC_C, SC_V,
  SC_TAB, SC_BACKSPACE, SC_LSHIFT, SC_ALT,
} from './constants.js';

export const GKeys = new Uint8Array(7);
export const Keys = new Uint8Array(128);

const keyToScan: Record<string, number> = {
  'ArrowUp': SC_UP,
  'ArrowDown': SC_DOWN,
  'ArrowLeft': SC_LEFT,
  'ArrowRight': SC_RIGHT,
  'Escape': SC_ESCAPE,
  'Enter': SC_ENTER,
  ' ': SC_SPACE,
  'e': SC_E,
  's': SC_S,
  'f': SC_F,
  'z': SC_Z,
  'x': SC_X,
  'c': SC_C,
  'v': SC_V,
  'Control': SC_CONTROL,
  'Shift': SC_LSHIFT,
  'Alt': SC_ALT,
  'Tab': SC_TAB,
  'Backspace': SC_BACKSPACE,
};

function keyEventToScan(e: KeyboardEvent): number {
  if (e.key in keyToScan) return keyToScan[e.key];
  return -1;
}

function onKeyDown(e: KeyboardEvent): void {
  const scan = keyEventToScan(e);
  if (scan !== -1) {
    Keys[scan] = 1;
    e.preventDefault();
  }
}

function onKeyUp(e: KeyboardEvent): void {
  const scan = keyEventToScan(e);
  if (scan !== -1) {
    Keys[scan] = 0;
    e.preventDefault();
  }
}

export function input_init(): void {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

export function input_quit(): void {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
}

export function input_reset(): void {
  Keys.fill(0);
}

export function input_anykey(): number {
  return Keys.some(v => v === 1) ? 1 : 0;
}

export function input_poll(): void {
}
