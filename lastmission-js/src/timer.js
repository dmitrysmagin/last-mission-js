// Fixed-timestep game loop at ~60fps (16667µs per frame)
// Mirrors the original synchronize_us() from timer.c

const FRAME_TIME_US = 16667; // ~60 fps
const FRAME_TIME_MS = FRAME_TIME_US / 1000;

let startTime = 0;
let accumulator = 0;

// Callback signature: (dt_us) => void
let stepCallback = null;
let rafId = null;
let running = false;

function frame(now) {
  if (!running) return;

  const elapsed = now - startTime;
  startTime = now;

  // Clamp to avoid spiral of death
  accumulator += Math.min(elapsed, 100);

  while (accumulator >= FRAME_TIME_MS) {
    accumulator -= FRAME_TIME_MS;
    if (stepCallback) stepCallback(FRAME_TIME_US);
  }

  rafId = requestAnimationFrame(frame);
}

export function timer_init(callback) {
  stepCallback = callback;
}

export function timer_start() {
  if (running) return;
  running = true;
  startTime = performance.now();
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
