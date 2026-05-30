import { RandomInt } from './random.js';
import {
  SND_LASER_SHOOT, SND_SHORT_LASER_SHOOT, SND_ROCKET_SHOOT,
  SND_CANNON_SHOOT, SND_EXPLODE, SND_CONTACT, SND_BONUS,
  SND_MOVE, SND_ELEVATOR,
  MUSIC_STOP, MUSIC_INTRO, MUSIC_GAME,
} from './constants.js';

let audioCtx = null;
const buffers = {};
let musicIntroBuffer = null;
let musicGameBuffer = null;
let currentMusicSource = null;
let currentMusicId = MUSIC_STOP;
const loopingSources = {};
let isInitialized = false;

async function loadSound(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

function playBuffer(buffer, loop = false) {
  if (!buffer) return null;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  source.connect(audioCtx.destination);
  source.start(0);
  return source;
}

function stopSource(source) {
  if (source) {
    try { source.stop(0); } catch (e) { }
  }
}

function tryResume() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export async function snd_init() {
  if (isInitialized) return 1;
  isInitialized = true;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('Web Audio not available');
    return 0;
  }

  try {
    const sfxPromises = [
      loadSound('sound/laser.ogg').then(b => { buffers[SND_LASER_SHOOT] = b; }),
      loadSound('sound/short_laser.ogg').then(b => { buffers[SND_SHORT_LASER_SHOOT] = b; }),
      loadSound('sound/rocket_shot.ogg').then(b => { buffers[SND_ROCKET_SHOOT] = b; }),
      loadSound('sound/cannon_shot.ogg').then(b => { buffers[SND_CANNON_SHOOT] = b; }),
      loadSound('sound/explode0.ogg').then(b => { buffers.EXPLODE0 = b; }),
      loadSound('sound/explode1.ogg').then(b => { buffers.EXPLODE1 = b; }),
      loadSound('sound/explode2.ogg').then(b => { buffers.EXPLODE2 = b; }),
      loadSound('sound/contact.ogg').then(b => { buffers[SND_CONTACT] = b; }),
      loadSound('sound/bonus.ogg').then(b => { buffers[SND_BONUS] = b; }),
      loadSound('sound/move.ogg').then(b => { buffers[SND_MOVE] = b; }),
      loadSound('sound/elevator.ogg').then(b => { buffers[SND_ELEVATOR] = b; }),
    ];

    const musicPromises = [
      loadSound('sound/music_intro.ogg').then(b => { musicIntroBuffer = b; }),
      loadSound('sound/music.ogg').then(b => { musicGameBuffer = b; }),
    ];

    await Promise.all([...sfxPromises, ...musicPromises]);
  } catch (e) {
    console.warn('Sound loading failed:', e);
    return 0;
  }

  return 1;
}

export function snd_quit() {
  tryResume();
  if (currentMusicSource) {
    stopSource(currentMusicSource);
    currentMusicSource = null;
  }
  Object.keys(loopingSources).forEach(key => {
    stopSource(loopingSources[key]);
    delete loopingSources[key];
  });
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
  isInitialized = false;
}

export function PlaySoundEffect(id) {
  if (!audioCtx) return;
  tryResume();

  if (id === SND_EXPLODE) {
    const explodeBuf = [buffers.EXPLODE0, buffers.EXPLODE1, buffers.EXPLODE2][((RandomInt() % 3) | 0)];
    playBuffer(explodeBuf);
    return;
  }

  const buf = buffers[id];
  if (!buf) return;

  if (id === SND_MOVE) {
    if (loopingSources[SND_MOVE]) return;
    loopingSources[SND_MOVE] = playBuffer(buf, true);
    return;
  }

  if (id === SND_ELEVATOR) {
    if (loopingSources[SND_ELEVATOR]) return;
    loopingSources[SND_ELEVATOR] = playBuffer(buf, true);
    return;
  }

  playBuffer(buf);
}

export function StopSoundEffect(id) {
  if (!audioCtx) return;
  if (loopingSources[id]) {
    stopSource(loopingSources[id]);
    delete loopingSources[id];
  }
}

export function PlayMusic(id) {
  if (!audioCtx) return;
  tryResume();

  if (id === currentMusicId) return;
  currentMusicId = id;

  stopSource(currentMusicSource);
  currentMusicSource = null;

  let buffer = null;
  switch (id) {
    case MUSIC_INTRO: buffer = musicIntroBuffer; break;
    case MUSIC_GAME: buffer = musicGameBuffer; break;
  }

  if (buffer) {
    currentMusicSource = playBuffer(buffer, true);
  }
}
