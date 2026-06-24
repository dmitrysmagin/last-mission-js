import { gfx_init, ClearScreen, LoadSprites, LoadLogo, LoadSplash } from './video.js';
import { input_init } from './input.js';
import { timer_init, timer_start, timer_stop } from './timer.js';
import { GameLoop, GameMode } from './engine.js';
import { GM_EXIT, SCREEN_WIDTH, SCREEN_HEIGHT } from './constants.js';
import { PutString, FillScreen } from './sprites.js';
import { load_world } from './world.js';
import { snd_init } from './sound.js';

async function main(): Promise<void> {
  if (!gfx_init()) {
    console.error('Failed to initialize video');
    return;
  }
  input_init();

  ClearScreen();
  PutString(80, 112, 'CARGANDO...');

  try {
    const world = await load_world('data/lastmission.dat');
    console.log(`World loaded: ${world.room_num} rooms, ${world.mapw}x${world.maph} map`);

    await Promise.all([
      LoadSprites(),
      LoadLogo(),
      LoadSplash(),
      snd_init(),
    ]);
    console.log('Sprites, logo, splash, and sounds loaded');

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
