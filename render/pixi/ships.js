// render/pixi/ships.js
// Manages sprites for the player ship and all enemy ships.
// Sprites are created on demand and stored on the entity object (e._sprite).

import * as PIXI from 'pixi.js';
import { getLayer } from './pixiApp.js';
import { T, FRAMES } from './assetLoader.js';
import { SHIPS } from '../../data/ships.js';
import { GAME_W, GAME_H } from '../../core/state.js';

// ── Ship texture map ──────────────────────────────────────────────
const SHIP_TEXTURES = ['ship-raijin', 'ship-viper', 'ship-thunder'];

const ENEMY_TEXTURE_MAP = {
  fighter: 'enemy-fighter',
  bomber:  'enemy-bomber',
  gunship: 'enemy-gunship',
  boss:    'enemy-boss',
};

// ── Player sprite ─────────────────────────────────────────────────
let playerSprite  = null;
let shieldSprite  = null;
let exhaustLeft   = null;
let exhaustRight  = null;
let exhaustMid    = null;
let _playerTilt   = 0;

export function initPlayerSprite(shipIndex) {
  // Remove old
  _removeSprite(playerSprite);
  _removeSprite(shieldSprite);
  [exhaustLeft, exhaustRight, exhaustMid].forEach(_removeSprite);

  const texKey = SHIP_TEXTURES[shipIndex] ?? SHIP_TEXTURES[0];
  playerSprite = new PIXI.Sprite(T[texKey]);
  playerSprite.anchor.set(0.5);
  playerSprite.scale.set(0.42);   // scale 256px source → ~108px game footprint
  getLayer('PLAYER').addChild(playerSprite);

  // Shield ring (starts hidden, shown during invincibility)
  shieldSprite = new PIXI.Sprite(T['ship-shield']);
  shieldSprite.anchor.set(0.5);
  shieldSprite.scale.set(0.55);
  shieldSprite.alpha = 0;
  getLayer('SHIELD').addChild(shieldSprite);

  // Exhaust flames — use a tinted copy of the exhaust texture
  exhaustMid   = _makeExhaust(0xff8800, 0.5, 0.9);
  exhaustLeft  = _makeExhaust(0xff6600, 0.38, 0.75);
  exhaustRight = _makeExhaust(0xff6600, 0.38, 0.75);
  getLayer('EFFECTS').addChild(exhaustMid);
  getLayer('EFFECTS').addChild(exhaustLeft);
  getLayer('EFFECTS').addChild(exhaustRight);
}

function _makeExhaust(tint, scale, alpha) {
  const s = new PIXI.Sprite(T['ship-exhaust'] ?? PIXI.Texture.WHITE);
  s.anchor.set(0.5, 0);
  s.scale.set(scale);
  s.tint = tint;
  s.alpha = alpha;
  return s;
}

export function updatePlayerSprite(x, y, dx, invincible) {
  if (!playerSprite) return;

  // Smooth tilt based on horizontal movement
  const targetTilt = dx * 0.22;
  _playerTilt += (targetTilt - _playerTilt) * 0.15;

  playerSprite.x = x; playerSprite.y = y;
  playerSprite.rotation = _playerTilt;
  playerSprite.visible  = invincible === 0 || Math.floor(invincible / 4) % 2 === 0;

  // Shield ring
  if (shieldSprite) {
    shieldSprite.x = x; shieldSprite.y = y;
    shieldSprite.rotation += 0.04;
    shieldSprite.alpha = invincible > 0
      ? Math.min(0.9, invincible / 30)
      : Math.max(0, shieldSprite.alpha - 0.05);
  }

  // Exhaust flames follow ship
  const flicker = 0.85 + Math.random() * 0.3;
  const ship = SHIPS[0]; // exhaust offsets — fine for all ships
  if (exhaustMid) {
    exhaustMid.x = x; exhaustMid.y = y + 14;
    exhaustMid.scale.y = 0.5 * flicker;
    exhaustMid.visible = playerSprite.visible;
  }
  if (exhaustLeft) {
    exhaustLeft.x = x - 13; exhaustLeft.y = y + 12;
    exhaustLeft.scale.y = 0.38 * flicker;
    exhaustLeft.visible = playerSprite.visible;
  }
  if (exhaustRight) {
    exhaustRight.x = x + 13; exhaustRight.y = y + 12;
    exhaustRight.scale.y = 0.38 * flicker;
    exhaustRight.visible = playerSprite.visible;
  }
}

// ── Enemy sprites ─────────────────────────────────────────────────
export function ensureEnemySprite(e) {
  if (e._sprite) return;

  const key    = ENEMY_TEXTURE_MAP[e.type] ?? 'enemy-fighter';
  const frames = FRAMES[key];
  const layer  = getLayer('ENEMIES');

  const scale = e.type === 'boss' ? 0.72 : 0.85;
  if (frames && frames.length > 1) {
    const anim = new PIXI.AnimatedSprite(frames);
    anim.anchor.set(0.5);
    anim.animationSpeed = 0.08 + Math.random() * 0.04;
    anim.play();
    anim.scale.set(scale);
    layer.addChild(anim);
    e._sprite = anim;
  } else {
    const s = new PIXI.Sprite(T[key] ?? PIXI.Texture.WHITE);
    s.anchor.set(0.5);
    s.scale.set(scale);
    layer.addChild(s);
    e._sprite = s;
  }

  // Boss HP bar as a separate Graphics
  if (e.type === 'boss') {
    const bar = new PIXI.Container();
    const bg  = new PIXI.Graphics().rect(-50,0,100,8).fill(0x220011);
    const fg  = new PIXI.Graphics().rect(-50,0,100,8).fill(0xff0066);
    bar.addChild(bg); bar.addChild(fg);
    bar._fg = fg;
    layer.addChild(bar);
    e._hpBar = bar;
  }
}

export function updateEnemySprite(e) {
  if (!e._sprite) return;
  e._sprite.x = e.x;
  e._sprite.y = e.y;

  // Health-based tint — boss flashes red when low HP
  if (e.type === 'boss' && e.hp / e.maxHp < 0.3) {
    e._sprite.tint = (Date.now() % 200 < 100) ? 0xff4444 : 0xffffff;
  }

  // Update HP bar
  if (e._hpBar) {
    e._hpBar.x = e.x;
    e._hpBar.y = e.y + (e.type === 'boss' ? 72 : 30);
    const pct  = Math.max(0, e.hp / e.maxHp);
    const fg   = e._hpBar._fg;
    fg.clear();
    fg.rect(-50, 0, 100 * pct, 8).fill(pct > 0.5 ? 0xff0066 : pct > 0.25 ? 0xff6600 : 0xff0000);
  }
}

export function removeEnemySprite(e) {
  _removeSprite(e._sprite);
  e._sprite = null;
  if (e._hpBar) {
    getLayer('ENEMIES').removeChild(e._hpBar);
    e._hpBar = null;
  }
}

// ── Title screen previews (still uses Canvas 2D — off-screen) ─────
export function drawShipPreview(canvas, ship) {
  const c  = canvas.getContext('2d');
  const w  = canvas.width, h = canvas.height;
  c.fillStyle = '#030b18'; c.fillRect(0,0,w,h);
  c.strokeStyle = 'rgba(0,80,160,0.18)'; c.lineWidth = 1;
  for (let x=0;x<w;x+=10){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
  for (let y=0;y<h;y+=10){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }

  // Draw ship polygon directly (no PIXI needed for static preview)
  const sc = Math.min(w,h) / 68;
  const cx = w/2, cy = h/2+3;
  c.save(); c.translate(cx, cy); c.scale(sc, sc);
  const col = ship.color, acc = ship.ac;
  c.shadowColor = col; c.shadowBlur = 18;
  if (ship.baseShot === 'twin') {
    c.beginPath(); c.moveTo(0,-24); c.lineTo(-20,8); c.lineTo(-8,4); c.lineTo(0,14); c.lineTo(8,4); c.lineTo(20,8); c.closePath();
    c.fillStyle=col; c.fill();
    c.beginPath(); c.moveTo(0,-18); c.lineTo(-5,-2); c.lineTo(0,6); c.lineTo(5,-2); c.closePath(); c.fillStyle=acc; c.fill();
    c.fillStyle='#ff8800'; c.fillRect(-14,8,9,6); c.fillRect(5,8,9,6);
  } else if (ship.baseShot === 'spread') {
    c.beginPath(); c.moveTo(0,-26); c.lineTo(-24,12); c.lineTo(-5,6); c.lineTo(0,18); c.lineTo(5,6); c.lineTo(24,12); c.closePath();
    c.fillStyle=col; c.fill();
    c.beginPath(); c.moveTo(0,-18); c.lineTo(-5,2); c.lineTo(0,9); c.lineTo(5,2); c.closePath(); c.fillStyle=acc; c.fill();
    c.fillStyle='#ff4400'; c.fillRect(-11,10,22,6);
  } else {
    c.beginPath(); c.moveTo(0,-22); c.lineTo(-14,2); c.lineTo(-22,14); c.lineTo(-8,10); c.lineTo(0,18); c.lineTo(8,10); c.lineTo(22,14); c.lineTo(14,2); c.closePath();
    c.fillStyle=col; c.fill();
    c.beginPath(); c.moveTo(0,-14); c.lineTo(-7,5); c.lineTo(0,12); c.lineTo(7,5); c.closePath(); c.fillStyle=acc; c.fill();
  }
  c.restore();
  // Flame
  c.save(); c.shadowColor='#ff8800'; c.shadowBlur=8;
  const fy = cy + 14*sc;
  c.fillStyle='rgba(255,150,0,0.9)'; c.fillRect(cx-3*sc, fy, 6*sc, 7*sc);
  c.restore();
}

function _removeSprite(s) {
  if (s && s.parent) s.parent.removeChild(s);
}
