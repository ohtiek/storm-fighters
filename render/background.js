// render/background.js
// Layered parallax space background.
// Layers (back to front):
//   1. Deep nebula blobs       — radial gradients, barely visible, very slow drift
//   2. Distant star field      — tiny dim points, near-static
//   3. Mid star field          — medium speed
//   4. Near star field         — fastest, brightest
//   5. Scrolling planet        — one large body, enters/exits over ~30 seconds
//   6. Asteroid belt           — dark rotating polygons between planet and foreground

import { GAME_W, GAME_H } from '../core/state.js';

// ── Star layers ───────────────────────────────────────────────────
// Three independent layers at different speeds & sizes
const STAR_LAYERS = [
  { count: 60,  spdMin: 0.1, spdMax: 0.4,  szMax: 1, alpha: 0.3 },  // far
  { count: 70,  spdMin: 0.4, spdMax: 1.0,  szMax: 1, alpha: 0.6 },  // mid
  { count: 40,  spdMin: 1.0, spdMax: 2.2,  szMax: 2, alpha: 1.0 },  // near
];
let starLayers = [];

// ── Nebula blobs ──────────────────────────────────────────────────
// 6 large soft glows that drift very slowly with sine-wave animation
const NEBULA_DEFS = [
  { bx: 0.15, by: 0.20, r: 180, color: [40, 0, 80],   spd: 0.010 },
  { bx: 0.75, by: 0.10, r: 220, color: [0, 20, 80],   spd: 0.007 },
  { bx: 0.50, by: 0.55, r: 200, color: [0, 50, 40],   spd: 0.008 },
  { bx: 0.85, by: 0.70, r: 160, color: [60, 0, 60],   spd: 0.012 },
  { bx: 0.20, by: 0.80, r: 190, color: [0, 30, 70],   spd: 0.009 },
  { bx: 0.60, by: 0.35, r: 140, color: [30, 10, 60],  spd: 0.011 },
];
let nebulaPhase = 0;

// ── Planet ────────────────────────────────────────────────────────
// One planet drifts across the screen over ~1800 frames (~30s at 60fps)
// Resets each stage. Palette changes per stage.
const PLANET_PALETTES = [
  { rim: '#4488ff', mid: '#112266', dark: '#020820', ring: null },           // stage 1 — ice giant
  { rim: '#ff8844', mid: '#882200', dark: '#1a0500', ring: '#cc6633' },      // stage 2 — lava world
  { rim: '#44ffcc', mid: '#006644', dark: '#001810', ring: null },           // stage 3 — jungle gas
  { rim: '#ffdd88', mid: '#886600', dark: '#1a1000', ring: '#ffcc44' },      // stage 4 — saturn-like
  { rim: '#ff44aa', mid: '#660033', dark: '#150010', ring: null },           // stage 5+ — crimson
];
let planet = null;

// ── Asteroids ────────────────────────────────────────────────────
// ~12 dark polygons that scroll downward and rotate slowly
let asteroids = [];

// ── Public init ──────────────────────────────────────────────────
export function initBackground(stage = 1) {
  _initStars();
  _initNebula();
  _initPlanet(stage);
  _initAsteroids();
}

function _initStars() {
  starLayers = STAR_LAYERS.map(def => ({
    ...def,
    stars: Array.from({ length: def.count }, () => ({
      x:  Math.random() * GAME_W,
      y:  Math.random() * GAME_H,
      spd: def.spdMin + Math.random() * (def.spdMax - def.spdMin),
      sz:  Math.random() < 0.15 ? def.szMax : 1,
      tw:  Math.random() * Math.PI * 2,
      // Tinted stars — 5% chance of coloured
      tint: Math.random() < 0.05
        ? ['#aaddff','#ffddaa','#ffaaaa'][Math.floor(Math.random()*3)]
        : '#ffffff',
    })),
  }));
}

function _initNebula() {
  nebulaPhase = 0;
}

function _initPlanet(stage) {
  const pal = PLANET_PALETTES[Math.min(stage - 1, PLANET_PALETTES.length - 1)];
  // Planet enters from left or right edge, drifts across over ~1800 frames
  const fromLeft = Math.random() < 0.5;
  const r = 90 + Math.random() * 60;
  planet = {
    x:     fromLeft ? -r - 20 : GAME_W + r + 20,
    y:     80 + Math.random() * (GAME_H * 0.5),
    r,
    vx:    fromLeft ? 0.18 : -0.18,
    pal,
    phase: Math.random() * Math.PI * 2,
    age:   0,
  };
}

function _initAsteroids() {
  asteroids = Array.from({ length: 14 }, () => _makeAsteroid(-Math.random() * GAME_H));
}

function _makeAsteroid(startY) {
  const n = 6 + Math.floor(Math.random() * 4);
  const r = 12 + Math.random() * 28;
  const verts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const jitter = 0.6 + Math.random() * 0.4;
    return { x: Math.cos(a) * r * jitter, y: Math.sin(a) * r * jitter };
  });
  return {
    x:     20 + Math.random() * (GAME_W - 40),
    y:     startY ?? -r - 10,
    vx:    (Math.random() - 0.5) * 0.3,
    vy:    0.3 + Math.random() * 0.5,
    rot:   0,
    rotSpd:(Math.random() - 0.5) * 0.012,
    r,
    verts,
    alpha: 0.12 + Math.random() * 0.18,
  };
}

// ── Update + Draw (called once per frame) ────────────────────────
export function drawBackground(ctx) {
  // 1. Black base
  ctx.fillStyle = '#020812';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // 2. Nebula blobs
  nebulaPhase += 0.004;
  NEBULA_DEFS.forEach((def, i) => {
    const ox = Math.sin(nebulaPhase * def.spd * 80 + i * 1.3) * 30;
    const oy = Math.cos(nebulaPhase * def.spd * 60 + i * 0.9) * 20;
    const cx = def.bx * GAME_W + ox;
    const cy = def.by * GAME_H + oy;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, def.r);
    const [rr, gg, bb] = def.color;
    g.addColorStop(0,   `rgba(${rr},${gg},${bb},0.07)`);
    g.addColorStop(0.5, `rgba(${rr},${gg},${bb},0.03)`);
    g.addColorStop(1,   `rgba(${rr},${gg},${bb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  });

  // 3. Star layers (back → front)
  starLayers.forEach(layer => {
    layer.stars.forEach(s => {
      s.y += s.spd;
      s.tw += 0.04;
      if (s.y > GAME_H) { s.y = 0; s.x = Math.random() * GAME_W; }
      const twinkle = layer.alpha * (0.7 + Math.sin(s.tw) * 0.3);
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = s.tint;
      ctx.fillRect(s.x, s.y, s.sz, s.sz);
    });
  });
  ctx.globalAlpha = 1;

  // 4. Occasional shooting star (1-in-1800 chance per frame)
  if (Math.random() < 0.00055) {
    _drawShootingStar(ctx);
  }

  // 5. Planet
  if (planet) {
    planet.age++;
    planet.x += planet.vx;
    planet.phase += 0.003;
    _drawPlanet(ctx, planet);
    // Remove when fully off screen
    if (planet.x < -planet.r - 60 || planet.x > GAME_W + planet.r + 60) {
      planet = null;
    }
  }

  // 6. Asteroids
  asteroids.forEach((a, i) => {
    a.x   += a.vx;
    a.y   += a.vy;
    a.rot += a.rotSpd;
    if (a.y > GAME_H + a.r + 10) asteroids[i] = _makeAsteroid(null);
    _drawAsteroid(ctx, a);
  });
}

// ── Shooting star (one-off streaks) ──────────────────────────────
const _shootingStars = [];
export function _drawShootingStar(ctx) {
  _shootingStars.push({ x: Math.random() * GAME_W, y: -5, life: 1.0 });
}
// call this after drawBackground each frame to animate active shooting stars
export function tickShootingStars(ctx) {
  for (let i = _shootingStars.length - 1; i >= 0; i--) {
    const s = _shootingStars[i];
    s.x += 3; s.y += 8; s.life -= 0.07;
    if (s.life <= 0) { _shootingStars.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = s.life * 0.8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - 12, s.y - 32);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Planet draw ───────────────────────────────────────────────────
function _drawPlanet(ctx, p) {
  const { x, y, r, pal, phase } = p;
  ctx.save();

  // Atmosphere glow
  const atmos = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.35);
  atmos.addColorStop(0,   'rgba(0,0,0,0)');
  atmos.addColorStop(0.5, hexToRgba(pal.rim, 0.06));
  atmos.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = atmos;
  ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, Math.PI * 2); ctx.fill();

  // Planet body
  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  body.addColorStop(0,   pal.rim);
  body.addColorStop(0.5, pal.mid);
  body.addColorStop(1,   pal.dark);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

  // Surface band stripes (clipped to circle)
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  for (let i = 0; i < 4; i++) {
    const sy = y - r * 0.6 + i * r * 0.4 + Math.sin(phase + i) * 8;
    ctx.globalAlpha = 0.07 + i * 0.02;
    ctx.fillStyle = pal.rim;
    ctx.fillRect(x - r, sy, r * 2, r * 0.12);
  }
  ctx.restore();

  // Ring (if palette has one)
  if (pal.ring) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = pal.ring;
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.15, r * 1.7, r * 0.28, 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Terminator shadow (dark crescent on right)
  const shadow = ctx.createRadialGradient(x + r * 0.4, y, 0, x + r * 0.4, y, r * 1.2);
  shadow.addColorStop(0,   'rgba(0,0,0,0)');
  shadow.addColorStop(0.6, 'rgba(0,0,0,0)');
  shadow.addColorStop(1,   'rgba(0,0,0,0.55)');
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = shadow;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();

  ctx.restore();
}

// ── Asteroid draw ─────────────────────────────────────────────────
function _drawAsteroid(ctx, a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.globalAlpha = a.alpha;
  ctx.fillStyle = '#445566';
  ctx.beginPath();
  ctx.moveTo(a.verts[0].x, a.verts[0].y);
  a.verts.forEach(v => ctx.lineTo(v.x, v.y));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = a.alpha * 0.4;
  ctx.strokeStyle = '#7799aa';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ── Helper ───────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
