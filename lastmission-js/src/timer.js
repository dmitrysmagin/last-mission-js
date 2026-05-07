// Game loop tied to display refresh rate (requestAnimationFrame)
// One step per frame — matches the display's native rate

let rafId = null;
let running = false;
let stepCallback = null;

function frame() {
  if (!running) return;
  if (stepCallback) stepCallback();
  rafId = requestAnimationFrame(frame);
}

export function timer_init(callback) {
  stepCallback = callback;
}

export function timer_start() {
  if (running) return;
  running = true;
  rafId = requestAnimationFrame(frame);
}

export function timer_stop() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
