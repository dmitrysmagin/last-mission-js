import {
  GM_EXIT, GM_TITLE, GM_GAME, GM_PAUSE,
  GM_GAMEOVER, GM_YOUWIN, GM_DEMO, GM_SPLASH, GM_EDITOR,
} from './constants.js';

import { input_poll, input_reset, Keys, GKeys } from './input.js';
import { gfx_flip, ClearScreen } from './video.js';

let mode = GM_SPLASH;

export function SetGameMode(newMode) {
  mode = newMode;
}

export function GameMode() {
  return mode;
}

function DoGame() {
  // Placeholder state machine — will be fleshed out in Phase 4
  switch (mode) {
    case GM_SPLASH:
      ClearScreen();
      SetGameMode(GM_TITLE);
      break;

    case GM_TITLE:
      ClearScreen();
      if (Keys[0x01] /* ESC */) {
        SetGameMode(GM_EXIT);
      }
      break;

    case GM_GAME:
    case GM_DEMO:
      // Game logic placeholder
      break;

    case GM_PAUSE:
      break;

    case GM_GAMEOVER:
    case GM_YOUWIN:
      break;

    case GM_EDITOR:
      break;
  }
}

export function GameLoop() {
  SetGameMode(GM_SPLASH);

  // This is called each fixed timestep (mirrors original loop body)
  function step() {
    input_poll();
    DoGame();
    gfx_flip();
  }

  return step;
}
