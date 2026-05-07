// Exact emulation of the assembler random routine from original Last Mission
// Needed for deterministic demo replay

let randseed = 0x342a;

export function RandomInt() {
  // Emulate x86 16-bit register arithmetic via 32-bit ints
  const randLo = randseed & 0xFFFF;
  const randHi = (randseed >>> 16) & 0xFFFF;

  // bx = (randLo << 16) | 0xFFFD
  let bx = ((randLo << 16) | 0xFFFD) | 0;
  let ah = randHi;

  // bx -= dx  (first time)
  let oldBx = bx | 0;
  bx = (bx - randseed) | 0;
  if ((oldBx >>> 0) < (randseed >>> 0)) ah = (ah - 1) & 0xFFFF;

  // bx -= dx  (second time)
  oldBx = bx | 0;
  bx = (bx - randseed) | 0;
  if ((oldBx >>> 0) < (randseed >>> 0)) ah = (ah - 1) & 0xFFFF;

  // dx = ah (low only)
  const dx = ah;
  oldBx = bx | 0;
  bx = (bx - dx) | 0;
  if ((oldBx >>> 0) < (dx >>> 0)) bx = (bx + 1) | 0;

  randseed = bx | 0;
  return randseed;
}

export function Randomize(seed) {
  randseed = (seed === 0) ? 0x342a : (seed | 0);
}
