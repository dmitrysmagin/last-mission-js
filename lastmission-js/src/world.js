// World data structures matching world.h + .dat text format parser

export class Pattern {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.index = 0;
  }
}

export class ObjectData {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.index = 0;
    this.speed = 0;
    this.minframe = 0;
    this.maxframe = 0;
    this.ai = 0;
    this.garage_id = 0;
  }
}

export class Bgline {
  constructor() {
    this.x1 = 0; this.y1 = 0;
    this.x2 = 0; this.y2 = 0;
  }
}

export class Room {
  constructor() {
    this.xs = 0;
    this.ys = 0;
    this.pattern_num = 0;
    this.object_num = 0;
    this.bg_type = 0;
    this.bg_num = 0;
    this.background = 0;
    this.shadow = 0;
    this.line_light = 0;
    this.line_shadow = 0;
    this.procedure = 0;
    this.bonus = 0;
    this.pattern = [];    // Pattern[]
    this.object = [];     // ObjectData[]
    this.bgline = [];     // Bgline[]
  }
}

export class Patternset {
  constructor() {
    this.xs = 0;
    this.ys = 0;
    this.data = [];       // Uint16Array
  }
}

export class World {
  constructor() {
    this.room_num = 0;
    this.patternset_num = 0;
    this.spriteset_num = 0;
    this.tileset_num = 0;
    this.fontset_num = 0;
    this.bgspriteset_num = 0;
    this.maph = 0;
    this.mapw = 0;
    this.map = [];        // Uint16Array
    this.room = [];       // Room[]
    this.patternset = []; // Patternset[]
  }
}

// ---- Parser ----

function trim(s) {
  return s.trim();
}

function isBlank(s) {
  return s.trim() === '';
}

function isComment(s) {
  return s.trim().startsWith('#');
}

function nextLine(lines, pos) {
  while (pos < lines.length) {
    const l = lines[pos];
    if (!isBlank(l) && !isComment(l)) return pos;
    pos++;
  }
  return -1;
}

function splitInts(line) {
  return trim(line).split(/\s+/).map(s => parseInt(s, 10));
}

function splitHexInts(line) {
  return trim(line).split(/\s+/).map(s => parseInt(s, 16));
}

function expectKeyword(line, kw) {
  return trim(line).split(/\s+/)[0] === kw;
}

export async function load_world(name) {
  const resp = await fetch(name);
  const text = await resp.text();
  const lines = text.split('\n');
  let pos = 0;

  const world = new World();

  // LASTMISSION header
  pos = nextLine(lines, pos);
  if (pos === -1) throw new Error('Missing LASTMISSION header');
  {
    const parts = trim(lines[pos]).split(/\s+/);
    if (parts[0] !== 'LASTMISSION') throw new Error('Not a valid .dat file');
    const ver = parseInt(parts[1], 10);
    if (ver !== 1) throw new Error(`Unknown version: ${ver}`);
    pos++;
  }

  // WORLD
  pos = nextLine(lines, pos);
  if (pos === -1) throw new Error('Missing WORLD chunk');
  {
    const parts = trim(lines[pos]).split(/\s+/);
    if (parts[0] !== 'WORLD') throw new Error('Expected WORLD chunk');
    world.room_num = parseInt(parts[1], 10);
    world.patternset_num = parseInt(parts[2], 10);
    world.spriteset_num = parseInt(parts[3], 10);
    world.tileset_num = parseInt(parts[4], 10);
    world.fontset_num = parseInt(parts[5], 10);
    world.bgspriteset_num = parseInt(parts[6], 10);
    pos++;
  }

  // Allocate rooms
  for (let i = 0; i < world.room_num; i++) {
    world.room.push(new Room());
  }
  for (let i = 0; i < world.patternset_num; i++) {
    world.patternset.push(new Patternset());
  }

  // MAP
  pos = nextLine(lines, pos);
  if (pos === -1) throw new Error('Missing MAP chunk');
  {
    const parts = trim(lines[pos]).split(/\s+/);
    if (parts[0] !== 'MAP') throw new Error('Expected MAP chunk');
    world.maph = parseInt(parts[1], 10);
    world.mapw = parseInt(parts[2], 10);
    pos++;
  }

  // Read map data
  world.map = new Uint16Array(world.maph * world.mapw);
  for (let y = 0; y < world.maph; y++) {
    pos = nextLine(lines, pos);
    if (pos === -1) throw new Error('Unexpected end of map data');
    const vals = splitInts(lines[pos]);
    for (let x = 0; x < world.mapw; x++) {
      world.map[y * world.mapw + x] = vals[x] || 0;
    }
    pos++;
  }

  // ROOM definitions
  for (let i = 0; i < world.room_num; i++) {
    pos = nextLine(lines, pos);
    if (pos === -1) throw new Error(`Missing ROOM ${i}`);
    const parts = trim(lines[pos]).split(/\s+/);
    if (parts[0] !== 'ROOM') throw new Error(`Expected ROOM ${i}`);
    const room = world.room[i];
    room.xs = parseInt(parts[1], 10);
    room.ys = parseInt(parts[2], 10);
    room.pattern_num = parseInt(parts[3], 10);
    room.object_num = parseInt(parts[4], 10);
    room.bg_type = parseInt(parts[5], 10);
    room.bg_num = parseInt(parts[6], 10);
    room.background = parseInt(parts[7], 16);
    room.shadow = parseInt(parts[8], 16);
    room.line_light = parseInt(parts[9], 16);
    room.line_shadow = parseInt(parts[10], 16);
    room.procedure = parseInt(parts[11], 10);
    room.bonus = parseInt(parts[12], 10);
    pos++;
  }

  // PATTERN blocks (one per room)
  for (let i = 0; i < world.room_num; i++) {
    pos = nextLine(lines, pos);
    if (pos === -1) throw new Error(`Missing PATTERN ${i}`);
    {
      const parts = trim(lines[pos]).split(/\s+/);
      if (parts[0] !== 'PATTERN') throw new Error(`Expected PATTERN ${i}`);
      // parts[1] is room index, should match i
      pos++;
    }
    const room = world.room[i];
    for (let j = 0; j < room.pattern_num; j++) {
      pos = nextLine(lines, pos);
      if (pos === -1) throw new Error(`Unexpected end in PATTERN ${i}`);
      const vals = splitInts(lines[pos]);
      const p = new Pattern();
      p.x = vals[0] || 0;
      p.y = vals[1] || 0;
      p.index = vals[2] || 0;
      room.pattern.push(p);
      pos++;
    }
  }

  // OBJECT blocks (one per room)
  for (let i = 0; i < world.room_num; i++) {
    pos = nextLine(lines, pos);
    if (pos === -1) throw new Error(`Missing OBJECT ${i}`);
    {
      const parts = trim(lines[pos]).split(/\s+/);
      if (parts[0] !== 'OBJECT') throw new Error(`Expected OBJECT ${i}`);
      pos++;
    }
    const room = world.room[i];
    for (let j = 0; j < room.object_num; j++) {
      pos = nextLine(lines, pos);
      if (pos === -1) throw new Error(`Unexpected end in OBJECT ${i}`);
      const vals = splitInts(lines[pos]);
      const o = new ObjectData();
      o.x = vals[0] || 0;
      o.y = vals[1] || 0;
      o.index = vals[2] || 0;
      o.speed = vals[3] || 0;
      o.minframe = vals[4] || 0;
      o.maxframe = vals[5] || 0;
      o.ai = vals[6] || 0;
      o.garage_id = vals[7] || 0;
      room.object.push(o);
      pos++;
    }
  }

  // BGLINE blocks (one per room)
  for (let i = 0; i < world.room_num; i++) {
    pos = nextLine(lines, pos);
    if (pos === -1) throw new Error(`Missing BGLINE ${i}`);
    {
      const parts = trim(lines[pos]).split(/\s+/);
      if (parts[0] !== 'BGLINE') throw new Error(`Expected BGLINE ${i}`);
      pos++;
    }
    const room = world.room[i];
    for (let j = 0; j < room.bg_num; j++) {
      pos = nextLine(lines, pos);
      if (pos === -1) throw new Error(`Unexpected end in BGLINE ${i}`);
      const vals = splitInts(lines[pos]);
      const b = new Bgline();
      b.x1 = vals[0] || 0;
      b.y1 = vals[1] || 0;
      b.x2 = vals[2] || 0;
      b.y2 = vals[3] || 0;
      room.bgline.push(b);
      pos++;
    }
  }

  // PATTERNSET blocks
  for (let i = 0; i < world.patternset_num; i++) {
    pos = nextLine(lines, pos);
    if (pos === -1) throw new Error(`Missing PATTERNSET ${i}`);
    {
      const parts = trim(lines[pos]).split(/\s+/);
      if (parts[0] !== 'PATTERNSET') throw new Error(`Expected PATTERNSET ${i}`);
      const pset = world.patternset[i];
      pset.xs = parseInt(parts[1], 10);
      pset.ys = parseInt(parts[2], 10);
      pos++;
    }
    const pset = world.patternset[i];
    pset.data = new Uint16Array(pset.xs * pset.ys);
    for (let y = 0; y < pset.ys; y++) {
      pos = nextLine(lines, pos);
      if (pos === -1) throw new Error(`Unexpected end in PATTERNSET ${i}`);
      const vals = splitInts(lines[pos]);
      for (let x = 0; x < pset.xs; x++) {
        pset.data[y * pset.xs + x] = vals[x] || 0;
      }
      pos++;
    }
  }

  return world;
}

export function free_world(world) {
  // For GC: just clear references
  world.room = [];
  world.patternset = [];
  world.map = null;
}
