import {
  GM_EXIT, GM_TITLE, GM_GAME, GM_PAUSE,
  GM_GAMEOVER, GM_YOUWIN, GM_DEMO, GM_SPLASH, GM_EDITOR,
  SCREEN_WIDTH,
} from './constants.js';

import { input_poll, Keys } from './input.js';
import { gfx_flip, ClearScreen } from './video.js';
import { PutString, PutSpriteI } from './sprites.js';
import { UnpackRoom, BlitRoom, BlitBackground, rgb565ToCSS } from './room.js';

let mode = GM_SPLASH;
let world = null;

export function SetGameMode(newMode) {
  mode = newMode;
}

export function GameMode() {
  return mode;
}

export function GameLoop(worldData) {
  world = worldData;
  mode = GM_SPLASH;

  function step() {
    input_poll();

    switch (mode) {
      case GM_SPLASH:
        ClearScreen();
        // Show title text as proof everything loads
        PutString(80, 100, 'THE LAST MISSION');
        PutString(88, 120, 'SDL - JS PORT');
        PutString(96, 140, 'v0.1 PHASE 2');
        // Transition quickly
        mode = GM_TITLE;
        break;

      case GM_TITLE:
        // Demo: render room 1 background to prove world/sprites work
        if (world && world.room.length > 1) {
          UnpackRoom(world, 1);
          // We don't clear the whole screen first since the background
          // rendering handles it - but this is a demo
          BlitBackground(world, 1);
          BlitRoom();

          // Draw a sprite to prove sprite system works
          PutSpriteI(148, 68, 0, 0);
          PutSpriteI(148, 104, 1, 0);
        } else {
          ClearScreen();
          PutString(40, 100, 'WORLD DATA NOT LOADED');
        }

        PutString(80, 224, 'PRESIONA ESC PARA SALIR');

        if (Keys[0x01]) { // ESC
          mode = GM_EXIT;
        }
        break;

      case GM_GAME:
      case GM_DEMO:
        break;

      case GM_PAUSE:
        break;

      case GM_GAMEOVER:
      case GM_YOUWIN:
        break;

      case GM_EDITOR:
        break;
    }

    gfx_flip();
  }

  return step;
}
