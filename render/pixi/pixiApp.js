// render/pixi/pixiApp.js
// Owns the single PIXI.Application instance.
// Every other render module imports { app, stage, renderer } from here.
// Must be the first PixiJS module initialised.

import * as PIXI from 'pixi.js';
import { GAME_W, GAME_H } from '../../core/state.js';

export let app      = null;   // PIXI.Application
export let stage    = null;   // app.stage  (root Container)
export let renderer = null;   // app.renderer

// Z-order layers — addChildAt(sprite, LAYERS.X) keeps draw order stable
export const LAYERS = {
  BG_FAR:      0,   // scrolling background image
  BG_NEBULA:   1,   // nebula overlay
  BG_STARS:    2,   // parallax star containers
  BG_PLANET:   3,   // planet sprite
  BG_ASTEROID: 4,   // asteroid sprites
  PICKUPS:     5,
  ENEMY_BULLETS: 6,
  PLAYER_BULLETS: 7,
  ENEMIES:     8,
  PLAYER:      9,
  EFFECTS:     10,  // explosions, shockwaves
  SHIELD:      11,  // player shield ring
  UI_FLASH:    12,  // weapon flash / boss warning text
};

export async function initPixiApp(container) {
  app = new PIXI.Application();

  await app.init({
    width:           GAME_W,
    height:          GAME_H,
    backgroundColor: 0x020812,
    antialias:       false,
    autoDensity:     true,
    resolution:      window.devicePixelRatio || 1,
    // Stop the built-in ticker — we drive the loop ourselves from main.js
    autoStart:       false,
  });

  // Replace <canvas id="gameCanvas"> with Pixi's canvas
  const old = document.getElementById('gameCanvas');
  if (old) old.replaceWith(app.canvas);
  else container.appendChild(app.canvas);

  app.canvas.id            = 'gameCanvas';
  app.canvas.style.display = 'block';
  app.canvas.style.imageRendering = 'auto';   // smooth for real sprites

  stage    = app.stage;
  renderer = app.renderer;

  // Pre-create empty layer containers in z-order
  const layerCount = Object.keys(LAYERS).length;
  for (let i = 0; i < layerCount; i++) {
    const c = new PIXI.Container();
    c.label = Object.keys(LAYERS)[i];
    stage.addChild(c);
  }

  return app;
}

/** Shorthand: get a specific layer container */
export function getLayer(layerKey) {
  return stage.children[LAYERS[layerKey]];
}

/** Called once per frame from main.js instead of requestAnimationFrame render */
export function renderFrame() {
  renderer.render(stage);
}
