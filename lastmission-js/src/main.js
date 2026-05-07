import { gfx_init, ClearScreen } from './video.js';
import { input_init } from './input.js';
import { timer_init, timer_start, timer_stop } from './timer.js';
import { GameLoop, GameMode } from './engine.js';
import { GM_EXIT } from './constants.js';
import { LoadSprites, PutString, PutSpriteI, FillScreen } from './sprites.js';
import { load_world } from './world.js';
import { rgb565ToCSS } from './room.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants.js';
import { snd_init } from './sound.js';

async function main() {
  if (!gfx_init()) {
    console.error('Failed to initialize video');
    return;
  }
  input_init();

  // Show loading text
  ClearScreen();
  PutString(80, 112, 'CARGANDO...');
  // We need a flip here but vanilla canvas doesn't auto-flip
  // Just rely on the first frame of the loop

  try {
    // Load game data
    const world = await load_world('data/lastmission.dat');
    console.log(`World loaded: ${world.room_num} rooms, ${world.mapw}x${world.maph} map`);

    await Promise.all([
      LoadSprites(),
      snd_init(),
    ]);
    console.log('Sprites and sounds loaded');

    const step = GameLoop(world);

    timer_init(() => {
      step();
      if (GameMode() === GM_EXIT) {
        timer_stop();
      }
    });

    timer_start();
  } catch (err) {
    console.error('Failed to load game data:', err);
    ClearScreen();
    FillScreen(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'rgb(0,0,0)');
    PutString(40, 112, 'ERROR CARGANDO DATOS');
  }
}

main();
