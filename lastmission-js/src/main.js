import { gfx_init } from './video.js';
import { input_init } from './input.js';
import { timer_init, timer_start, timer_stop } from './timer.js';
import { GameLoop, GameMode } from './engine.js';
import { GM_EXIT } from './constants.js';

function main() {
  if (!gfx_init()) return;

  input_init();

  const step = GameLoop();

  timer_init(() => {
    step();
    // Check exit condition after each step
    if (GameMode() === GM_EXIT) {
      timer_stop();
    }
  });

  timer_start();
}

main();
