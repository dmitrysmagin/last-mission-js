let randseed = 0x342a;

export function RandomInt(): number {
  const randLo = randseed & 0xFFFF;
  const randHi = (randseed >>> 16) & 0xFFFF;

  let bx = ((randLo << 16) | 0xFFFD) | 0;
  let ah = randHi;

  let oldBx = bx | 0;
  bx = (bx - randseed) | 0;
  if ((oldBx >>> 0) < (randseed >>> 0)) ah = (ah - 1) & 0xFFFF;

  oldBx = bx | 0;
  bx = (bx - randseed) | 0;
  if ((oldBx >>> 0) < (randseed >>> 0)) ah = (ah - 1) & 0xFFFF;

  const dx = ah;
  oldBx = bx | 0;
  bx = (bx - dx) | 0;
  if ((oldBx >>> 0) < (dx >>> 0)) bx = (bx + 1) | 0;

  randseed = bx | 0;
  return randseed;
}

export function Randomize(seed: number): void {
  randseed = (seed === 0) ? 0x342a : (seed | 0);
}
