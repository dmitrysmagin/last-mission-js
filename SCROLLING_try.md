# Smooth Horizontal Scrolling Plan for Last Mission JS

Status: Completed - Ready for implementation

## Overview
Modify the engine to scroll smoothly between screens when the ship reaches the inner quarter of the screen (right: ≥ SCREEN_WIDTH - SCREEN_WIDTH/4, left: ≤ SCREEN_WIDTH/4). During scrolling, draw both current and target screens with an offset, activate objects as they enter the visible window, and keep all game logic in world coordinates.

---

## 1. Scroll State Variables (engine.js)

```js
let scrollOffsetX = 0;      // pixels scrolled from current screen (0 = aligned)
let targetScreenX  = 0;     // world screen X we are scrolling toward
let scrollSpeed    = 2;     // pixels per frame (tweakable)
let isScrolling    = false; // true while a scroll transition is active
const SCROLL_TRIGGER_RIGHT = SCREEN_WIDTH - (SCREEN_WIDTH / 4); // 240
const SCROLL_TRIGGER_LEFT  =  SCREEN_WIDTH / 4;                // 80
```

Initialize in `InitNewGame()`:
```js
scrollOffsetX = 0;
targetScreenX = game.mapx;
isScrolling   = false;
```

---

## 2. Trigger Scrolling from Ship Movement (Replace Instant Screen Change)

### Right movement (in `Update_Ship`)

Replace the edge‑check block:
```js
if (ship.x >= SCROLL_TRIGGER_RIGHT && ship.x + 2 > SCREEN_WIDTH - gObj_GetWidth(ship)) {
    const nx = game.mapx + 1;
    if (nx < world.mapw) {               // world‑bounds check
        targetScreenX = nx;
        isScrolling   = true;            // begin smooth scroll
    }
    ship.x = SCREEN_WIDTH - gObj_GetWidth(ship); // keep ship at edge
}
```

### Left movement (similar)
```js
if (ship.x <= SCROLL_TRIGGER_LEFT && ship.x - 2 < 0) {
    const nx = game.mapx - 1;
    if (nx >= 0) {
        targetScreenX = nx;
        isScrolling   = true;
    }
    ship.x = 0; // stick to left edge while scrolling
}
```

> No call to `ChangeScreen()` or `InitNewScreen()` yet; those happen after the scroll completes.

---

## 3. Update Scroll Offset Each Frame

Add to the main game step (after input polling, before `DoGame()`):
```js
// ----- Smooth scroll update -----
if (isScrolling) {
    const dir = targetScreenX > game.mapx ? 1 : -1; // +1 = right, -1 = left
    scrollOffsetX += dir * scrollSpeed;

    // Have we scrolled a full screen?
    if (Math.abs(scrollOffsetX) >= SCREEN_WIDTH) {
        // Snap to the new screen
        game.mapx = targetScreenX;
        scrollOffsetX = 0;
        isScrolling = false;

        // Initialize the newly reached screen
        InitNewScreen();
        ReEnableBase(gObj_Ship()?.base ?? null);
    }
}
```
`game.mapy` updates only for vertical moves (unchanged).

---

## 4. Rendering – Draw One or Two Screens Based on Offset

### a) Helper to draw a screen at a given offset (engine.js)
```js
function drawScreenAt(screenIndex, offsetX) {
    SetClipGameArea(1);
    BlitBackground(world, screenIndex, offsetX);    // modified to take offset
    BlitRoomOutlines(world, screenIndex, offsetX);
    BlitRoom(world, screenIndex, offsetX);
    BlitBfg(offsetX);                               // pass offset if needed

    // Enemies / objects (still using world coords; offset applied in draw calls)
    let gobj = gObj_First();
    for (; gobj; gobj = gObj_Next(gobj)) {
        if (gobj.ai_type === AI_GARAGE || gobj.ai_type === AI_HIDDEN_AREA_ACCESS) {
            continue;
        }
        const drawX = gobj.x + offsetX;
        if (gobj.ai_type === AI_LASER) {
            BlitLaser(gobj, offsetX);   // adjust if needed
        } else if (gobj.flags & GOBJ_VISIBLE) {
            PutSpriteI(drawX, gobj.y, gobj.i, gobj.cur_frame);
        }
    }
    SetClipGameArea(0);
}
```

### b) Update drawing functions in `sprites.js`
Add an optional `offsetX` parameter (default 0) and add it to all X coordinates before drawing.
Example:
```js
export function PutSpriteI(x, y, i, frame, offsetX = 0) {
    const sx = x + (offsetX || 0);
    // existing drawing code using sx instead of x
}
```
Apply similarly to `PutSpriteS`, `BlitRoom`, `BlitBackground`, `BlitLaser`, etc.

### c) In `RenderGame`, decide what to draw:
```js
export function RenderGame(renderStatus) {
    let drawOffset = 0;
    let drawSecond = false;
    let secondOffset = 0;

    if (isScrolling) {
        const dir = targetScreenX > game.mapx ? 1 : -1;
        drawOffset = -scrollOffsetX;               // current screen moves opposite to scroll dir
        drawSecond = true;
        secondOffset = (dir === 1) ? (SCREEN_WIDTH - scrollOffsetX) : (-SCREEN_WIDTH - scrollOffsetX);
    }

    // Draw current (or only) screen
    drawScreenAt(game.ship_screen, drawOffset);

    if (drawSecond) {
        const neighborScreen = getscreen(
            game.mapx + (targetScreenX > game.mapx ? 1 : -1),
            game.mapy
        );
        if (neighborScreen !== 0) {
            drawScreenAt(neighborScreen, secondOffset);
        }
    }

    if (renderStatus) {
        BlitStatusData();
    }
}
```

---

## 5. Lazy Activation of Objects as They Enter View

### a) Add `active` flag (object.js)
In `gObj_CreateObject()`:
```js
export function gObj_CreateObject() {
    // ... existing init ...
    const obj = /* recycled or new */;
    obj.active = false;    // not active until it scrolls into view
    return obj;
}
```

### b) Activation Pass (each frame after scroll update, before `DoGame()`):
```js
// ----- Activate objects that have entered the visible window -----
const viewLeft   = game.mapx * 320 + scrollOffsetX;        // world X of leftmost pixel
const viewRight  = viewLeft + SCREEN_WIDTH;                // exclusive

let gobj = gObj_First();
for (; gobj; gobj = gObj_Next(gobj)) {
    if (gobj.active) continue; // already active

    const objWorldX = gobj.x; // assuming gobj.x is already world‑pixel coord
    if (objWorldX >= viewLeft && objWorldX < viewRight) {
        gobj.active = true;
        // Optionally reset timers / animation counters here
    }
}
```

### c) Skip inactive objects in updates
In `gObj_Update(gobj)` and all AI functions, early‑exit:
```js
export function gObj_Update(gobj) {
    if (!gobj.active) return;
    // … existing update …
}
```

**Object Pool Size**: Ensure the pool can hold objects from at least two screens simultaneously (current + next). Increase the pool size if needed (e.g., double the original estimate).

---

## 6. Collision & Gameplay – Keep in World Coordinates
All collision checks (`gObj_CheckTouch`, tile queries, etc.) should continue to use the objects’ stored `x`, `y` (world pixel coordinates). Since scroll offset is **only** applied during rendering, no changes are needed to logic.

---

## 7. Status Bar / HUD – Remain Fixed
The status bar is drawn *after* `SetClipGameArea(0)` and at fixed Y (`STATUS_YPOS`). It should **not** receive any offset, so leave `BlitStatusData()` unchanged.

---

## 8. Testing & Tuning
1. **Compile & Run** – verify the ship triggers scroll when entering the right/left quarters.  
2. **Observe Smoothness** – adjust `scrollSpeed` (e.g., 2–4 px/frame) for desired feel.  
3. **Object Activation** – watch enemies appear exactly as they enter the visible band; ensure they start moving/shooting at the correct moment.  
4. **Edge Cases** –  
   - Try scrolling rapidly back‑and‑forth.  
   - Reach world boundaries; ensure scrolling stops and does not wrap.  
   - Vertical movement (up/down) should remain unaffected.  
5. **Performance** – monitor FPS; if activation pass becomes costly, consider spatial hashing or only checking objects in nearby rooms.

---

## Summary of Files to Edit
| File | Changes |
|------|---------|
| **engine.js** | Add scroll variables, modify edge‑trigger logic in `Update_Ship`, add per‑frame scroll update, lazy activation pass, adjust `RenderGame` to draw 1/2 screens, introduce `drawScreenAt` helper. |
| **sprites.js** | Update all drawing primitives (`PutSpriteI`, `PutSpriteS`, `BlitRoom`, `BlitBackground`, `BlitLaser`, etc.) to accept an `offsetX` parameter and apply it to X coordinates. |
| **object.js** | Add `active` flag to objects, initialize `false` in `gObj_CreateObject`, add early‑exit in `gObj_Update` and AI functions based on `active`. |
| **room.js** (optional) | If any low‑level tile blitting uses raw X, add offset support similar to sprites. |
| **constants.js** | No changes needed (use existing `SCREEN_WIDTH`). |

--- 

This plan delivers smooth horizontal scrolling that starts when the ship reaches the inner quarter of the screen, activates enemies only as they become visible, and preserves all original gameplay mechanics.