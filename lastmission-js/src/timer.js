// Fixed-timestep game loop (60fps updates) inside native-rate rAF loop.
// rAF fires at the display's native refresh rate; game logic runs at most
// once per 16.67ms chunk to avoid "requestAnimationFrame handler took Nms"
// warnings on high-refresh displays.

const TICK_MS = 1000 / 60;     // 16.666...ms per game tick at 60fps
const MAX_CATCHUP_MS = 100;    // clamp delta to prevent spiral of death

let rafId = null;
let running = false;
let stepCallback = null;
let lastTime = 0;
let accumulator = 0;

function frame(timestamp) {
  if (!running) return;

  /*if (lastTime !== 0) {
    const delta = timestamp - lastTime;
    accumulator += Math.min(delta, MAX_CATCHUP_MS);

    // Run at most one game step per rAF callback
    if (accumulator >= TICK_MS) {
      accumulator -= TICK_MS;
      if (stepCallback) stepCallback();
    }

    // Keep accumulator bounded (spiral-of-death safety)
    if (accumulator > TICK_MS) accumulator = 0;
  }

  lastTime = timestamp;*/
  if (stepCallback) stepCallback();
  rafId = requestAnimationFrame(frame);
}

export function timer_init(callback) {
  stepCallback = callback;
}

export function timer_start() {
  if (running) return;
  running = true;
  lastTime = 0;
  accumulator = 0;
  rafId = requestAnimationFrame(frame);
}

export function timer_stop() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
