const TICK_MS = 1000 / 60;
const MAX_CATCHUP_MS = 100;

let rafId: number | null = null;
let running = false;
let stepCallback: (() => void) | null = null;
let lastTime = 0;
let accumulator = 0;

function frame(timestamp: number): void {
  if (!running) return;

  if (lastTime !== 0) {
    const delta = timestamp - lastTime;
    accumulator += Math.min(delta, MAX_CATCHUP_MS);

    if (accumulator >= TICK_MS) {
      accumulator -= TICK_MS;
      if (stepCallback) stepCallback();
    }

    if (accumulator > TICK_MS) accumulator = 0;
  }

  lastTime = timestamp;
  rafId = requestAnimationFrame(frame);
}

export function timer_init(callback: () => void): void {
  stepCallback = callback;
}

export function timer_start(): void {
  if (running) return;
  running = true;
  lastTime = 0;
  accumulator = 0;
  rafId = requestAnimationFrame(frame);
}

export function timer_stop(): void {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
