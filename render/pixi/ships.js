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

// ── Title screen previews (Canvas 2D — off-screen 80×80) ──────────
export function drawShipPreview(canvas, ship) {
  const c  = canvas.getContext('2d');
  const W  = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H * 0.46;
  const col = ship.color, acc = ship.ac;

  // Background
  c.fillStyle = '#020c1a';
  c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(0,70,160,0.14)';
  c.lineWidth = 1;
  for (let x = 0; x < W; x += 8) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,H); c.stroke(); }
  for (let y = 0; y < H; y += 8) { c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke(); }

  c.save();
  if      (ship.baseShot === 'twin')   _previewRaijin(c, cx, cy, col, acc);
  else if (ship.baseShot === 'spread') _previewViper(c, cx, cy, col, acc);
  else                                 _previewThunder(c, cx, cy, col, acc);
  c.restore();
}

function _previewFlame(c, x, y, rw, rh, bright, dim) {
  const g = c.createLinearGradient(x, y, x, y + rh);
  g.addColorStop(0, bright); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(x, y + rh * 0.5, rw, rh * 0.5, 0, 0, Math.PI * 2); c.fill();
}

// RAIJIN-X — balanced delta fighter (twin/blue)
function _previewRaijin(c, cx, cy, col, acc) {
  // Engine flames (drawn first, behind the ship)
  c.globalAlpha = 0.85;
  _previewFlame(c, cx - 10, cy + 20, 5, 14, '#ffcc44', '#ff3300');
  _previewFlame(c, cx + 10, cy + 20, 5, 14, '#ffcc44', '#ff3300');
  c.globalAlpha = 1;

  // Wing glow
  c.shadowColor = col; c.shadowBlur = 18;

  // Main delta wing body
  const wg = c.createLinearGradient(cx, cy - 28, cx, cy + 20);
  wg.addColorStop(0, '#ddf6ff'); wg.addColorStop(0.35, col); wg.addColorStop(1, acc);
  c.beginPath();
  c.moveTo(cx,      cy - 28);  // nose
  c.lineTo(cx - 30, cy +  8);  // left wingtip
  c.lineTo(cx - 14, cy +  5);  // left inner notch
  c.lineTo(cx - 10, cy + 20);  // left engine pod
  c.lineTo(cx + 10, cy + 20);  // right engine pod
  c.lineTo(cx + 14, cy +  5);  // right inner notch
  c.lineTo(cx + 30, cy +  8);  // right wingtip
  c.closePath();
  c.fillStyle = wg; c.fill();

  // Leading-edge highlight
  c.shadowBlur = 4;
  c.strokeStyle = 'rgba(180,240,255,0.55)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx, cy - 28); c.lineTo(cx - 30, cy + 8); c.stroke();
  c.beginPath(); c.moveTo(cx, cy - 28); c.lineTo(cx + 30, cy + 8); c.stroke();

  // Center spine / fuselage
  c.shadowBlur = 10;
  const sg = c.createLinearGradient(cx, cy - 26, cx, cy + 18);
  sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.5, col); sg.addColorStop(1, acc);
  c.beginPath();
  c.moveTo(cx,    cy - 26);
  c.lineTo(cx - 8, cy + 4);
  c.lineTo(cx - 6, cy + 20);
  c.lineTo(cx + 6, cy + 20);
  c.lineTo(cx + 8, cy + 4);
  c.closePath();
  c.fillStyle = sg; c.fill();

  // Cockpit canopy
  c.shadowColor = '#88eeff'; c.shadowBlur = 10;
  const cpg = c.createLinearGradient(cx, cy - 22, cx, cy - 4);
  cpg.addColorStop(0, '#ffffff'); cpg.addColorStop(1, '#44ccff');
  c.fillStyle = cpg;
  c.beginPath();
  c.moveTo(cx,     cy - 22);
  c.lineTo(cx - 5, cy - 8);
  c.lineTo(cx,     cy - 3);
  c.lineTo(cx + 5, cy - 8);
  c.closePath();
  c.fill();

  // Engine nacelles
  c.shadowColor = '#ff8800'; c.shadowBlur = 10;
  c.fillStyle = acc;
  c.fillRect(cx - 14, cy + 13, 10, 9);
  c.fillRect(cx +  4, cy + 13, 10, 9);
  c.fillStyle = '#ff9900';
  c.fillRect(cx - 13, cy + 18, 8, 4);
  c.fillRect(cx +  5, cy + 18, 8, 4);

  // Wingtip cannons
  c.shadowColor = col; c.shadowBlur = 6;
  c.fillStyle = '#cce8ff';
  c.fillRect(cx - 36, cy + 2, 10, 3);
  c.fillRect(cx + 26, cy + 2, 10, 3);
}

// VIPER-II — fast wide fighter (spread/orange)
function _previewViper(c, cx, cy, col, acc) {
  // Triple engine flames
  c.globalAlpha = 0.85;
  for (const xo of [-13, 0, 13]) {
    _previewFlame(c, cx + xo, cy + 20, 4, 13, '#ffaa22', '#ff3300');
  }
  c.globalAlpha = 1;

  // Wing glow
  c.shadowColor = col; c.shadowBlur = 18;

  // Ultra-wide swept wings
  const wg = c.createLinearGradient(cx, cy - 30, cx, cy + 20);
  wg.addColorStop(0, '#fff4ee'); wg.addColorStop(0.3, col); wg.addColorStop(1, acc);
  c.beginPath();
  c.moveTo(cx,      cy - 30);  // nose tip
  c.lineTo(cx - 35, cy +  0);  // far left wingtip
  c.lineTo(cx - 20, cy +  8);  // left inner indent
  c.lineTo(cx - 16, cy + 20);  // left engine flank
  c.lineTo(cx + 16, cy + 20);  // right engine flank
  c.lineTo(cx + 20, cy +  8);  // right inner indent
  c.lineTo(cx + 35, cy +  0);  // far right wingtip
  c.closePath();
  c.fillStyle = wg; c.fill();

  // Leading-edge highlight lines
  c.shadowBlur = 4;
  c.strokeStyle = 'rgba(255,210,160,0.5)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx, cy - 30); c.lineTo(cx - 35, cy); c.stroke();
  c.beginPath(); c.moveTo(cx, cy - 30); c.lineTo(cx + 35, cy); c.stroke();

  // Fuselage stripe
  c.shadowBlur = 10;
  const sg = c.createLinearGradient(cx, cy - 28, cx, cy + 20);
  sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.4, col); sg.addColorStop(1, acc);
  c.beginPath();
  c.moveTo(cx,      cy - 28);
  c.lineTo(cx - 11, cy +  2);
  c.lineTo(cx - 14, cy + 20);
  c.lineTo(cx + 14, cy + 20);
  c.lineTo(cx + 11, cy +  2);
  c.closePath();
  c.fillStyle = sg; c.fill();

  // Cockpit dome
  c.shadowColor = '#ffeedd'; c.shadowBlur = 10;
  const cpg = c.createLinearGradient(cx - 7, cy - 24, cx + 7, cy - 6);
  cpg.addColorStop(0, '#ffffff'); cpg.addColorStop(1, '#ffcc88');
  c.fillStyle = cpg;
  c.beginPath();
  c.moveTo(cx,     cy - 24);
  c.lineTo(cx - 7, cy - 10);
  c.lineTo(cx,     cy -  4);
  c.lineTo(cx + 7, cy - 10);
  c.closePath();
  c.fill();

  // Wide engine bank
  c.shadowColor = '#ff4400'; c.shadowBlur = 14;
  c.fillStyle = acc;
  c.fillRect(cx - 16, cy + 14, 32, 8);
  c.fillStyle = '#ff6600';
  c.fillRect(cx - 14, cy + 17, 28, 4);

  // Forward nose gun
  c.shadowColor = col; c.shadowBlur = 6;
  c.fillStyle = '#ffddbb';
  c.fillRect(cx - 1, cy - 38, 2, 10);

  // Under-wing gun pods
  c.fillStyle = '#ffbb88';
  c.fillRect(cx - 28, cy - 2, 8, 3);
  c.fillRect(cx + 20, cy - 2, 8, 3);
}

// THUNDER-9 — heavy assault cruiser (laser/purple)
function _previewThunder(c, cx, cy, col, acc) {
  // Wide triple engine flames with purple tint
  c.globalAlpha = 0.85;
  for (const xo of [-15, 0, 15]) {
    _previewFlame(c, cx + xo, cy + 20, 5, 14, '#ee44ff', '#660099');
  }
  c.globalAlpha = 1;

  // Body glow
  c.shadowColor = col; c.shadowBlur = 20;

  // Main heavy body
  const bg = c.createLinearGradient(cx, cy - 26, cx, cy + 22);
  bg.addColorStop(0, '#f0d0ff'); bg.addColorStop(0.3, col); bg.addColorStop(1, acc);
  c.beginPath();
  c.moveTo(cx,      cy - 24);  // nose
  c.lineTo(cx - 18, cy -  6);  // left shoulder
  c.lineTo(cx - 26, cy + 10);  // left flank
  c.lineTo(cx - 20, cy + 22);  // left engine
  c.lineTo(cx + 20, cy + 22);  // right engine
  c.lineTo(cx + 26, cy + 10);  // right flank
  c.lineTo(cx + 18, cy -  6);  // right shoulder
  c.closePath();
  c.fillStyle = bg; c.fill();

  // Shoulder weapon pods
  c.shadowBlur = 10;
  c.fillStyle = acc;
  c.fillRect(cx - 32, cy - 10, 14, 22);
  c.fillRect(cx + 18, cy - 10, 14, 22);

  // Pod cannon barrels
  c.shadowColor = col; c.shadowBlur = 6;
  c.fillStyle = '#dd88ff';
  c.fillRect(cx - 36, cy - 2, 6, 3);
  c.fillRect(cx + 30, cy - 2, 6, 3);
  // Pod sensors
  c.fillStyle = col;
  c.fillRect(cx - 30, cy - 8, 4, 4);
  c.fillRect(cx + 26, cy - 8, 4, 4);

  // Center fuselage
  c.shadowBlur = 8;
  const sg = c.createLinearGradient(cx, cy - 22, cx, cy + 20);
  sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.4, col); sg.addColorStop(1, acc);
  c.beginPath();
  c.moveTo(cx,      cy - 22);
  c.lineTo(cx - 12, cy -  2);
  c.lineTo(cx - 14, cy + 22);
  c.lineTo(cx + 14, cy + 22);
  c.lineTo(cx + 12, cy -  2);
  c.closePath();
  c.fillStyle = sg; c.fill();

  // Central laser cannon barrel
  c.shadowColor = '#ff00ff'; c.shadowBlur = 16;
  c.fillStyle = '#ee00ff';
  c.fillRect(cx - 3, cy - 34, 6, 12);   // barrel tip (protrudes above nose)
  c.fillStyle = acc;
  c.fillRect(cx - 5, cy - 23, 10, 9);   // cannon housing

  // Cockpit (round dome)
  c.shadowColor = '#ee88ff'; c.shadowBlur = 10;
  const cpg = c.createRadialGradient(cx - 2, cy - 10, 1, cx, cy - 8, 7);
  cpg.addColorStop(0, '#ffffff'); cpg.addColorStop(1, '#dd88ff');
  c.fillStyle = cpg;
  c.beginPath(); c.arc(cx, cy - 8, 7, 0, Math.PI * 2); c.fill();

  // Engine bank
  c.shadowColor = col; c.shadowBlur = 14;
  c.fillStyle = acc;
  c.fillRect(cx - 20, cy + 15, 40, 8);
  c.fillStyle = '#9900cc';
  for (const xo of [-12, 0, 12]) {
    c.fillRect(cx + xo - 4, cy + 17, 8, 5);
  }
}

function _removeSprite(s) {
  if (s && s.parent) s.parent.removeChild(s);
}
