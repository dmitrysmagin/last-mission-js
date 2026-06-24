// Video
export const SCREEN_WIDTH = 320;
export const SCREEN_HEIGHT = 240;
export const ACTION_SCREEN_HEIGHT = 136;
export const GAME_SCREEN_BPP = 16;
export const STATUS_YPOS = 144;

// Game modes
export const GM_EXIT = -1;
export const GM_TITLE = 0;
export const GM_GAME = 1;
export const GM_CUT = 2;
export const GM_GAMEOVER = 3;
export const GM_YOUWIN = 4;
export const GM_DEMO = 5;
export const GM_PAUSE = 6;
export const GM_SPLASH = 7;
export const GM_EDITOR = 8;

export type GameMode = typeof GM_EXIT | typeof GM_TITLE | typeof GM_GAME
  | typeof GM_CUT | typeof GM_GAMEOVER | typeof GM_YOUWIN
  | typeof GM_DEMO | typeof GM_PAUSE | typeof GM_SPLASH | typeof GM_EDITOR;

// Sound effect IDs
export const SND_LASER_SHOOT = 1;
export const SND_SHORT_LASER_SHOOT = 2;
export const SND_ROCKET_SHOOT = 3;
export const SND_CANNON_SHOOT = 4;
export const SND_EXPLODE = 5;
export const SND_CONTACT = 6;
export const SND_MOVE = 7;
export const SND_ELEVATOR = 8;
export const SND_BONUS = 9;

export type SoundEffectId = typeof SND_LASER_SHOOT | typeof SND_SHORT_LASER_SHOOT
  | typeof SND_ROCKET_SHOOT | typeof SND_CANNON_SHOOT | typeof SND_EXPLODE
  | typeof SND_CONTACT | typeof SND_MOVE | typeof SND_ELEVATOR | typeof SND_BONUS;

export const MUSIC_STOP = 0;
export const MUSIC_INTRO = 1;
export const MUSIC_GAME = 2;

export type MusicId = typeof MUSIC_STOP | typeof MUSIC_INTRO | typeof MUSIC_GAME;

// Input
export const KEY_LEFT = 0;
export const KEY_RIGHT = 1;
export const KEY_UP = 2;
export const KEY_DOWN = 3;
export const KEY_FIRE = 4;
export const KEY_PAUSE = 5;
export const KEY_QUIT = 6;

export type GameKey = typeof KEY_LEFT | typeof KEY_RIGHT | typeof KEY_UP
  | typeof KEY_DOWN | typeof KEY_FIRE | typeof KEY_PAUSE | typeof KEY_QUIT;

// Scancodes (mirroring x86 scancodes from original input.h)
export const SC_ESCAPE = 0x01;
export const SC_1 = 0x02;
export const SC_2 = 0x03;
export const SC_3 = 0x04;
export const SC_4 = 0x05;
export const SC_5 = 0x06;
export const SC_6 = 0x07;
export const SC_7 = 0x08;
export const SC_8 = 0x09;
export const SC_9 = 0x0A;
export const SC_0 = 0x0B;
export const SC_ENTER = 0x1C;
export const SC_CONTROL = 0x1D;
export const SC_A = 0x1E;
export const SC_B = 0x30;
export const SC_C = 0x2E;
export const SC_D = 0x20;
export const SC_E = 0x12;
export const SC_F = 0x21;
export const SC_G = 0x22;
export const SC_H = 0x23;
export const SC_I = 0x17;
export const SC_J = 0x24;
export const SC_K = 0x25;
export const SC_L = 0x26;
export const SC_M = 0x32;
export const SC_N = 0x31;
export const SC_O = 0x18;
export const SC_P = 0x19;
export const SC_Q = 0x10;
export const SC_R = 0x13;
export const SC_S = 0x1F;
export const SC_T = 0x14;
export const SC_U = 0x16;
export const SC_V = 0x2F;
export const SC_W = 0x11;
export const SC_X = 0x2D;
export const SC_Y = 0x15;
export const SC_Z = 0x2C;
export const SC_LSHIFT = 0x2A;
export const SC_RSHIFT = 0x36;
export const SC_ALT = 0x38;
export const SC_LALT = 0x38;
export const SC_SPACE = 0x39;
export const SC_TAB = 0x0F;
export const SC_BACKSPACE = 0x0E;
export const SC_UP = 0x48;
export const SC_DOWN = 0x50;
export const SC_LEFT = 0x4B;
export const SC_RIGHT = 0x4D;
export const SC_F1 = 0x3B;
export const SC_F2 = 0x3C;
export const SC_F3 = 0x3D;

export type Scancode = number;
