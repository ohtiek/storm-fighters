# STORM FIGHTERS — Operation Dark Horizon
## PixiJS Render Edition

A modular mobile-first vertical shoot-em-up.
**Render layer:** PixiJS v8 (GPU-accelerated WebGL).
**Game logic:** Pure ES Modules, zero framework dependency.

---

## Quick Start

```bash
# Requires a local static server (ES Modules won't load from file://)
npx serve .
# or
python3 -m http.server 8080
# or VS Code Live Server
```

Open `http://localhost:3000` — assets load automatically with a progress bar.
If real PNG files are missing from `assets/`, procedural placeholders are used,
so the game always runs during development.

---

## Controls

| Action | Mobile | Keyboard |
|--------|--------|----------|
| Move   | Virtual joystick | WASD / Arrow keys |
| Fire   | Hold FIRE button | Z / Space (hold) |
| Bomb   | Tap BOMB button  | X / Shift |

---

## Module Map

```
storm-fighters/
├── index.html                 Shell, importmap for PixiJS, loading screen
├── style.css                  All styles including loading screen
├── main.js                    Boot sequence, game loop, wires all modules
│
├── assets/                    Art assets (PNG). Auto-fallback if missing.
│   ├── ships/                 Player ships, shield ring, exhaust
│   ├── enemies/               Enemy sprite sheets (animated)
│   ├── bullets/               Bullet/beam/missile/plasma textures
│   ├── fx/                    Explosion flipbook, shockwave, sparks, pickups
│   └── bg/                    Scrolling background tiles per stage
│   └── README.md              Full art spec — sizes, formats, pipeline guide
│
├── core/
│   ├── state.js               Single source of truth — all game variables
│   ├── input.js               Joystick + keyboard → getMovement()/isFiring()
│   └── resize.js              Canvas + overlay scaling for any screen size
│
├── data/
│   ├── ships.js               Ship definitions
│   ├── weapons.js             Branching weapon tree (5 weapons × 2 branches)
│   └── enemies.js             Enemy base stats
│
├── entities/
│   ├── player.js              Movement, firing, bomb, hit detection
│   ├── enemy.js               Spawn, AI, firing, death hook for render layer
│   └── pickup.js              Bubble collection logic
│
├── weapons/
│   ├── weaponManager.js       Branch upgrade tree: lv1→2(A|B)→3→cycle
│   └── index.js               Fire + tick registry for all 5 weapons
│
├── render/
│   └── pixi/                  PixiJS render layer (drop-in for Canvas 2D)
│       ├── pixiApp.js         PIXI.Application, layer containers (z-order)
│       ├── assetLoader.js     Loads all textures; procedural fallback if missing
│       ├── background.js      Parallax: scrolling BG, nebula, stars, planet, asteroids
│       ├── ships.js           Player + enemy sprites, exhaust, shield ring, HP bar
│       ├── bullets.js         Player + enemy bullet sprites (orb/laser/missile/plasma)
│       ├── effects.js         Explosions (flipbook), shockwave, sparks, pickups,
│       │                      bomb flash, weapon banner, score popups, stage banner
│       ├── hud.js             DOM HUD updates (score, HP, weapon badge, bombs)
│       └── spritePool.js      SpritePool class + playOnce() for one-shot animations
│
└── screens/
    ├── titleScreen.js         Ship select cards; accepts drawPreviewFn callback
    └── gameOverScreen.js      Final score, hi-score, retry / select-ship
```

---

## Weapon Tree

| Weapon  | Branch A (Gold bubble ★) | Branch B (Cyan bubble ★) |
|---------|--------------------------|--------------------------|
| TWIN    | QUAD — 4 heavy parallel beams | CROSS — twin + diagonal shots |
| SPREAD  | INFERNO — wide fire ring | NEEDLE — tight fast fan |
| LASER   | PRISM — triple prismatic beams | PULSE — rapid short pulses |
| MISSILE | CLUSTER — missiles split on impact | SEEKER — lock-on spiral trail |
| PLASMA  | NOVA — expanding orbs | CHAIN — fast chain orbs |

Upgrade path: **LV1** → collect W bubble → **LV2 + choose branch** →
collect matching bubble → **LV3 (max)** → collect any W → **next weapon LV1**

---

## Replacing Procedural Art with Real Sprites

1. Create PNG matching the spec in `assets/README.md`
2. Drop it into the correct `assets/` subfolder
3. No code changes — `assetLoader.js` tries the real file first,
   falls back to procedural only on 404

---

## Adding a New Weapon

1. Add definition to `data/weapons.js` (id, label, color, fmod, branches)
2. Add it to `WEAPON_CYCLE` in the same file
3. Write `fire()` + `render()` in `weapons/index.js`
4. Register in `WEAPON_REGISTRY`

No other files need changing.

---

## Layer Z-Order (pixiApp.js LAYERS)

```
0  BG_FAR        scrolling terrain/space background
1  BG_NEBULA     nebula overlay
2  BG_STARS      3-speed parallax star containers
3  BG_PLANET     one planet per stage
4  BG_ASTEROID   rotating polygon asteroids
5  PICKUPS        weapon/bomb/health bubbles
6  ENEMY_BULLETS  enemy projectiles
7  PLAYER_BULLETS player projectiles
8  ENEMIES        enemy ships + boss HP bar
9  PLAYER         player ship + shield ring
10 EFFECTS        explosions, shockwaves, sparks
11 SHIELD         shield ring (drawn above player)
12 UI_FLASH       weapon banner, boss warning, score popups, stage banner
```
