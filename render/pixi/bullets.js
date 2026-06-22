// render/pixi/bullets.js
// Renders player bullets and enemy bullets using PixiJS sprites + Graphics.
// Each bullet gets a sprite/graphic attached as b._sprite on first render.
// Sprites are removed when bullets leave state.bullets.

import * as PIXI from 'pixi.js';
import { getLayer } from './pixiApp.js';
import { T } from './assetLoader.js';

// ── Colour map for weapon types ───────────────────────────────────
const WEAPON_COLORS = {
  twin:    0x00ddff,
  spread:  0xff9900,
  laser:   0xdd00ff,
  missile: 0x00ff88,
  plasma:  0xffee00,
};

// ── Create / update player bullet sprites ─────────────────────────
const _knownPlayerBullets = new Set();

export function syncPlayerBullets(bullets) {
  const layer   = getLayer('PLAYER_BULLETS');
  const current = new Set(bullets);

  // Sprites for bullets removed mid-frame (hit enemy, bomb, etc.) stay in the
  // layer unless we explicitly remove them — do that before updating survivors.
  for (const b of _knownPlayerBullets) {
    if (!current.has(b)) {
      removePlayerBullet(b);
      _knownPlayerBullets.delete(b);
    }
  }

  bullets.forEach(b => {
    if (!b._sprite) b._sprite = _createBulletSprite(b, layer);
    _knownPlayerBullets.add(b);
    _updateBulletSprite(b);
  });
}

export function removePlayerBullet(b) {
  if (b._sprite) {
    getLayer('PLAYER_BULLETS').removeChild(b._sprite);
    b._sprite = null;
  }
}

function _createBulletSprite(b, layer) {
  let sprite;

  if (b.laser) {
    // Vertical laser strip — tiled vertically to match b.h
    sprite = new PIXI.Sprite(T['bullet-laser']);
    sprite.anchor.set(0.5, 1);  // anchor at bottom (muzzle end)
    sprite.width  = b.w;
    sprite.height = Math.abs(b.h);
    sprite.tint   = _hexColor(b.color);
    sprite.blendMode = 'add';
    // Glow filter
    const glow = new PIXI.ColorMatrixFilter();
    sprite.filters = [glow];

  } else if (b.missile) {
    sprite = new PIXI.Sprite(T['bullet-missile']);
    sprite.anchor.set(0.5);
    sprite.scale.set(0.6);
    sprite.tint = _hexColor(b.color);
    sprite.blendMode = 'normal';

  } else if (b.plasma || b.orb) {
    sprite = new PIXI.Sprite(T['bullet-plasma']);
    sprite.anchor.set(0.5);
    const r = b.w / 2;
    sprite.scale.set(r / 8);
    sprite.tint = _hexColor(b.color);
    sprite.blendMode = 'add';

  } else if (b.beam) {
    // Full-height beam — draw as a tall tinted rect
    sprite = new PIXI.Graphics();
    const alpha = 0.18;
    sprite.rect(-b.w/2, -b.h/2, b.w, b.h)
      .fill({ color: _hexColor(b.color), alpha });
    sprite.blendMode = 'add';

  } else {
    // Standard rectangular bullet
    sprite = new PIXI.Sprite(T['bullet-player']);
    sprite.anchor.set(0.5);
    sprite.width  = b.w;
    sprite.height = b.h;
    sprite.tint   = _hexColor(b.color);
    sprite.blendMode = 'add';
  }

  layer.addChild(sprite);
  return sprite;
}

function _updateBulletSprite(b) {
  const s = b._sprite;
  if (!s) return;

  if (b.laser) {
    s.x = b.x; s.y = b.y;
    s.height = Math.abs(b.h);
    s.alpha   = 0.92 + Math.random() * 0.08;  // subtle shimmer

  } else if (b.beam) {
    s.x = b.x; s.y = b.y - b.h/2;
    s.alpha = 0.18 + Math.random() * 0.06;

  } else if (b.missile) {
    s.x = b.x; s.y = b.y;
    // Rotate missile to face travel direction
    s.rotation = Math.atan2(b.vy, b.vx) + Math.PI/2;

  } else {
    s.x = b.x; s.y = b.y;
  }
}

// ── Enemy bullets ─────────────────────────────────────────────────
const _knownEnemyBullets = new Set();

export function syncEnemyBullets(eBullets) {
  const layer   = getLayer('ENEMY_BULLETS');
  const current = new Set(eBullets);

  // Remove sprites for bullets that were spliced out (hit player, off-screen, bomb)
  for (const b of _knownEnemyBullets) {
    if (!current.has(b)) {
      removeEnemyBullet(b);
      _knownEnemyBullets.delete(b);
    }
  }

  eBullets.forEach(b => {
    if (!b._sprite) {
      const sprite = new PIXI.Sprite(T['bullet-enemy']);
      sprite.anchor.set(0.5);
      const r = (b.w || 5) / 2;
      sprite.scale.set(r / 5);
      sprite.tint = _hexColor(b.color || '#ff3300');
      sprite.blendMode = 'add';
      layer.addChild(sprite);
      b._sprite = sprite;
    }
    _knownEnemyBullets.add(b);
    b._sprite.x = b.x;
    b._sprite.y = b.y;
    // Pulse brightness
    b._sprite.alpha = 0.85 + Math.sin(Date.now() * 0.02 + b.x) * 0.15;
  });
}

export function removeEnemyBullet(b) {
  if (b._sprite) {
    getLayer('ENEMY_BULLETS').removeChild(b._sprite);
    b._sprite = null;
  }
}

// ── Cleanup (called on new game / bomb) ───────────────────────────
export function clearAllBulletSprites(bullets, eBullets) {
  bullets.forEach(removePlayerBullet);
  eBullets.forEach(removeEnemyBullet);
  _knownPlayerBullets.clear();
  _knownEnemyBullets.clear();
  getLayer('PLAYER_BULLETS').removeChildren();
  getLayer('ENEMY_BULLETS').removeChildren();
}

// ── Helper ────────────────────────────────────────────────────────
function _hexColor(cssHex) {
  if (typeof cssHex === 'number') return cssHex;
  return parseInt(cssHex.replace('#',''), 16);
}
