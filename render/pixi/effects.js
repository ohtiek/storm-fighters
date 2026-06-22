// render/pixi/effects.js
// All visual effects: explosions (flipbook), shockwaves, particle sparks,
// pickup bubbles, bomb screen flash, weapon upgrade banner.

import * as PIXI from 'pixi.js';
import { getLayer } from './pixiApp.js';
import { T, FRAMES } from './assetLoader.js';
import { playOnce } from './spritePool.js';
import { GAME_W, GAME_H } from '../../core/state.js';
import { WEAPONS } from '../../data/weapons.js';

// ── Particles (GPU-friendly Container) ────────────────────────────
const _particleContainer = new PIXI.Container();

export function initEffectsLayer() {
  getLayer('EFFECTS').addChild(_particleContainer);
}

// ── Explosion ─────────────────────────────────────────────────────
export function spawnExplosion(x, y, large = false) {
  const scale = large ? 1.8 : 0.7 + Math.random() * 0.5;
  const layer = getLayer('EFFECTS');

  // Flipbook animation
  if (FRAMES['fx-explosion']) {
    playOnce(FRAMES['fx-explosion'], x, y, layer, scale, 0.45);
  }

  // Shockwave ring
  if (FRAMES['fx-shockwave']) {
    playOnce(FRAMES['fx-shockwave'], x, y, layer, scale * 0.8, 0.35);
  }

  // Burst of spark sprites
  const sparkCount = large ? 20 : 10;
  for (let i = 0; i < sparkCount; i++) {
    _spawnSpark(x, y);
  }
}

// ── Sparks ────────────────────────────────────────────────────────
const _sparks = [];

function _spawnSpark(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const spd   = 2 + Math.random() * 6;
  const spark = new PIXI.Sprite(T['fx-spark'] ?? PIXI.Texture.WHITE);
  spark.anchor.set(0.5);
  spark.scale.set(0.4 + Math.random() * 0.5);
  spark.x = x; spark.y = y;
  spark.tint = Math.random() < 0.5 ? 0xffee44 : 0xff8800;
  spark.blendMode = 'add';
  _particleContainer.addChild(spark);
  _sparks.push({ s: spark, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, life: 1.0, decay: 0.05+Math.random()*0.05 });
}

export function tickSparks() {
  for (let i = _sparks.length - 1; i >= 0; i--) {
    const p = _sparks[i];
    p.s.x  += p.vx; p.s.y += p.vy;
    p.vy   += 0.12;   // gravity
    p.vx   *= 0.96;
    p.life -= p.decay;
    p.s.alpha  = p.life;
    p.s.scale.set(p.life * 0.5);
    if (p.life <= 0) {
      _particleContainer.removeChild(p.s);
      _sparks.splice(i, 1);
    }
  }
}

// ── State-driven particles (from state.particles array) ───────────
export function syncStateParticles(particles) {
  // particles already contain { x, y, vx, vy, life, color, sz }
  // We render them as tiny Graphics since they're transient
  _particleContainer.removeChildren();
  particles.forEach(p => {
    if (p.life <= 0) return;
    const g = new PIXI.Graphics();
    g.circle(0, 0, p.sz).fill({ color: _hexColor(p.color), alpha: p.life });
    g.blendMode = 'add';
    g.x = p.x; g.y = p.y;
    _particleContainer.addChild(g);
  });
}

// ── Pickup bubbles ────────────────────────────────────────────────
const PICKUP_TEXTURES = { weapon: 'fx-pickup-w', bomb: 'fx-pickup-b', health: 'fx-pickup-h' };
const _pickupSprites  = new Map();   // pickup object → sprite

export function syncPickups(pickups) {
  const layer = getLayer('PICKUPS');
  const seen  = new Set();

  pickups.forEach(p => {
    seen.add(p);
    if (!_pickupSprites.has(p)) {
      const texKey = PICKUP_TEXTURES[p.type] ?? 'fx-pickup-w';
      const s = new PIXI.Sprite(T[texKey]);
      s.anchor.set(0.5);
      s.scale.set(0.7);
      s.blendMode = 'add';
      layer.addChild(s);
      _pickupSprites.set(p, s);
    }
    const s = _pickupSprites.get(p);
    s.x = p.x; s.y = p.y;
    s.rotation += 0.04;
    s.alpha = 0.75 + Math.sin(p.age * 0.18) * 0.25;
    s.scale.set(0.65 + Math.sin(p.age * 0.12) * 0.08);
  });

  // Remove sprites for collected/expired pickups
  _pickupSprites.forEach((s, p) => {
    if (!seen.has(p)) {
      layer.removeChild(s);
      _pickupSprites.delete(p);
    }
  });
}

// ── Bomb flash ────────────────────────────────────────────────────
let _bombFlash = null;

export function initBombFlash() {
  _bombFlash = new PIXI.Graphics();
  _bombFlash.rect(0, 0, GAME_W, GAME_H).fill({ color: 0xff7800, alpha: 0 });
  _bombFlash.blendMode = 'add';
  _bombFlash.eventMode = 'none';
  getLayer('UI_FLASH').addChild(_bombFlash);
}

export function updateBombFlash(bombActive, bombTimer) {
  if (!_bombFlash) return;
  _bombFlash.alpha = bombActive ? (bombTimer / 60) * 0.4 : 0;
}

// ── Weapon flash banner ───────────────────────────────────────────
let _flashText = null;

export function initFlashText() {
  _flashText = new PIXI.Text({
    text: '',
    style: new PIXI.TextStyle({
      fontFamily: 'Orbitron, monospace',
      fontSize:   20,
      fontWeight: '700',
      fill:       '#00ddff',
      dropShadow: { color: '#00ddff', blur: 18, distance: 0, alpha: 1 },
    }),
  });
  _flashText.anchor.set(0.5);
  _flashText.x = GAME_W / 2;
  _flashText.y = GAME_H / 2 - 40;
  _flashText.alpha = 0;
  getLayer('UI_FLASH').addChild(_flashText);
}

export function updateWeaponFlash(weaponState) {
  if (!_flashText) return;
  if (weaponState.flashTimer > 0) {
    const w      = WEAPONS[weaponState.index];
    const branch = weaponState.branch;
    const color  = branch ? w.branches[branch].color : w.color;
    _flashText.text  = `⚡ ${weaponState.flashLabel} ⚡`;
    _flashText.style.fill = color;
    _flashText.style.dropShadow = { color, blur: 18, distance: 0, alpha: 1 };
    _flashText.alpha = Math.min(1, weaponState.flashTimer / 20);
  } else {
    _flashText.alpha = 0;
  }
}

// ── Boss warning ──────────────────────────────────────────────────
let _bossText = null;

export function initBossWarning() {
  _bossText = new PIXI.Text({
    text: '⚠  BOSS INCOMING  ⚠',
    style: new PIXI.TextStyle({
      fontFamily: 'Orbitron, monospace',
      fontSize:   16,
      fontWeight: '700',
      fill:       '#ff0066',
      dropShadow: { color: '#ff0066', blur: 22, distance: 0, alpha: 1 },
    }),
  });
  _bossText.anchor.set(0.5);
  _bossText.x = GAME_W / 2;
  _bossText.y = GAME_H / 2;
  _bossText.alpha = 0;
  getLayer('UI_FLASH').addChild(_bossText);
}

export function updateBossWarning(boss) {
  if (!_bossText) return;
  _bossText.alpha = (boss && boss.y < 140) ? 0.9 + Math.sin(Date.now() * 0.01) * 0.1 : 0;
}

// ── Score pop-up numbers ──────────────────────────────────────────
const _scorePopups = [];

export function spawnScorePopup(x, y, value) {
  const t = new PIXI.Text({
    text: '+' + value.toLocaleString(),
    style: new PIXI.TextStyle({
      fontFamily: 'Orbitron, monospace',
      fontSize:    13,
      fontWeight:  '700',
      fill:        value >= 1000 ? '#ffee00' : '#ffffff',
    }),
  });
  t.anchor.set(0.5);
  t.x = x; t.y = y;
  t.alpha = 1;
  getLayer('UI_FLASH').addChild(t);
  _scorePopups.push({ t, vy: -1.2, life: 1.0 });
}

export function tickScorePopups() {
  for (let i = _scorePopups.length - 1; i >= 0; i--) {
    const p = _scorePopups[i];
    p.t.y     += p.vy;
    p.life    -= 0.025;
    p.t.alpha  = p.life;
    if (p.life <= 0) {
      getLayer('UI_FLASH').removeChild(p.t);
      _scorePopups.splice(i, 1);
    }
  }
}

// ── Stage transition banner ───────────────────────────────────────
export function showStageBanner(stageNum, duration = 120) {
  const t = new PIXI.Text({
    text: `STAGE  ${stageNum}`,
    style: new PIXI.TextStyle({
      fontFamily: 'Orbitron, monospace',
      fontSize:    28,
      fontWeight:  '900',
      fill:        '#ffffff',
      dropShadow:  { color: '#0088ff', blur: 30, distance: 0, alpha: 1 },
    }),
  });
  t.anchor.set(0.5);
  t.x = GAME_W / 2; t.y = GAME_H / 2;
  t.alpha = 1;
  getLayer('UI_FLASH').addChild(t);

  let elapsed = 0;
  const tick = () => {
    elapsed++;
    t.alpha = elapsed < duration * 0.2
      ? elapsed / (duration * 0.2)
      : elapsed > duration * 0.7
        ? 1 - (elapsed - duration * 0.7) / (duration * 0.3)
        : 1;
    t.scale.set(1 + Math.sin(elapsed * 0.05) * 0.02);
    if (elapsed < duration) requestAnimationFrame(tick);
    else getLayer('UI_FLASH').removeChild(t);
  };
  requestAnimationFrame(tick);
}

// ── Cleanup ───────────────────────────────────────────────────────
export function clearAllEffects() {
  _sparks.length = 0;
  _pickupSprites.clear();
  _scorePopups.length = 0;
  _particleContainer.removeChildren();
  ['PICKUPS','EFFECTS','UI_FLASH'].forEach(k => getLayer(k).removeChildren());
  initEffectsLayer();
  initBombFlash();
  initFlashText();
  initBossWarning();
}

// ── Helper ────────────────────────────────────────────────────────
function _hexColor(cssHex) {
  if (typeof cssHex === 'number') return cssHex;
  return parseInt(cssHex.replace('#',''), 16);
}
