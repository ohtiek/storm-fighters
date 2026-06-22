// render/pixi/background.js
// Layered parallax background using PixiJS sprites.
// Layers (drawn via LAYERS constants in pixiApp.js):
//   BG_FAR      — scrolling terrain/space background (2 tiles for seamless loop)
//   BG_NEBULA   — semi-transparent nebula overlay, animated with tiling sprite
//   BG_STARS    — 3 containers of star Graphics at different scroll speeds
//   BG_PLANET   — one TilingSprite planet per stage
//   BG_ASTEROID — pool of rotating polygon Graphics

import * as PIXI from 'pixi.js';
import { getLayer } from './pixiApp.js';
import { T } from './assetLoader.js';
import { GAME_W, GAME_H } from '../../core/state.js';

// ── Internal state ────────────────────────────────────────────────
let bgTile1, bgTile2;
let nebulaSprite;
let starContainers = [];   // [far, mid, near] — each a PIXI.Container of Graphics
let planetSprite = null;
let planetVx = 0;
let asteroidPool = [];
let _shootingStars = [];
let _bgScrollY = 0;
let _nebulaPhase = 0;

const STAR_LAYERS = [
  { count: 60,  spdMin: 0.1, spdMax: 0.35, szMax: 1.5, alpha: 0.35 },
  { count: 70,  spdMin: 0.4, spdMax: 1.0,  szMax: 1.5, alpha: 0.65 },
  { count: 40,  spdMin: 1.0, spdMax: 2.2,  szMax: 2.5, alpha: 1.0  },
];

const PLANET_PALETTES = [
  { tint: 0x4488ff },   // stage 1 — ice blue
  { tint: 0xff6633 },   // stage 2 — lava orange
  { tint: 0x44ffaa },   // stage 3 — jungle
  { tint: 0xffdd66 },   // stage 4 — saturn gold
  { tint: 0xff44aa },   // stage 5 — crimson
];

// ── Init ──────────────────────────────────────────────────────────
export function initBackground(stageNum = 1) {
  _clearAll();

  const bgKey = `bg-stage${Math.min(stageNum, 5)}`;
  const bgTex = T[bgKey] ?? T['bg-stage1'];

  // Two vertically stacked copies for seamless scroll
  bgTile1 = new PIXI.Sprite(bgTex);
  bgTile2 = new PIXI.Sprite(bgTex);
  bgTile1.width  = bgTile2.width  = GAME_W;
  bgTile1.height = bgTile2.height = GAME_H;
  bgTile2.y = -GAME_H;
  getLayer('BG_FAR').addChild(bgTile1);
  getLayer('BG_FAR').addChild(bgTile2);

  // Nebula overlay
  nebulaSprite = new PIXI.Sprite(T['bg-nebula']);
  nebulaSprite.width  = GAME_W;
  nebulaSprite.height = GAME_H;
  nebulaSprite.alpha  = 0.6;
  getLayer('BG_NEBULA').addChild(nebulaSprite);

  // Stars — build three Graphics containers
  starContainers = [];
  STAR_LAYERS.forEach((def, li) => {
    const container = new PIXI.Container();
    const stars = [];
    for (let i = 0; i < def.count; i++) {
      const g = new PIXI.Graphics();
      const sz = Math.random() < 0.12 ? def.szMax : 1;
      // Colour tint: 5% chance of coloured star
      const tint = Math.random() < 0.05
        ? [0xaaddff, 0xffddaa, 0xffaaaa][Math.floor(Math.random() * 3)]
        : 0xffffff;
      g.rect(-sz/2, -sz/2, sz, sz).fill({ color: tint });
      g.x = Math.random() * GAME_W;
      g.y = Math.random() * GAME_H;
      g.alpha = def.alpha * (0.4 + Math.random() * 0.6);
      const spd = def.spdMin + Math.random() * (def.spdMax - def.spdMin);
      container.addChild(g);
      stars.push({ g, spd, twinklePhase: Math.random() * Math.PI * 2, baseAlpha: g.alpha, sz, tint });
    }
    container._stars = stars;
    container._def   = def;
    getLayer('BG_STARS').addChild(container);
    starContainers.push(container);
  });

  // Planet
  _spawnPlanet(stageNum);

  // Asteroids
  _initAsteroids();
}

// ── Per-frame update ──────────────────────────────────────────────
export function updateBackground(scrollSpeed = 1.5) {
  _bgScrollY += scrollSpeed;
  _nebulaPhase += 0.003;

  // BG scroll — seamless vertical loop
  if (bgTile1 && bgTile2) {
    bgTile1.y = (_bgScrollY) % GAME_H;
    bgTile2.y = bgTile1.y - GAME_H;
  }

  // Nebula gently pulses alpha
  if (nebulaSprite) {
    nebulaSprite.alpha = 0.45 + Math.sin(_nebulaPhase) * 0.15;
  }

  // Stars
  starContainers.forEach(container => {
    container._stars.forEach(s => {
      s.g.y += s.spd;
      if (s.g.y > GAME_H + 2) {
        s.g.y = -2;
        s.g.x = Math.random() * GAME_W;
      }
      s.twinklePhase += 0.04;
      s.g.alpha = s.baseAlpha * (0.65 + Math.sin(s.twinklePhase) * 0.35);
    });
  });

  // Occasional shooting star
  if (Math.random() < 0.0006) _spawnShootingStar();
  _tickShootingStars();

  // Planet drift
  if (planetSprite) {
    planetSprite.x += planetVx;
    planetSprite.rotation += 0.001;
    if (planetVx > 0 && planetSprite.x > GAME_W + 160) _destroyPlanet();
    if (planetVx < 0 && planetSprite.x < -160)          _destroyPlanet();
  }

  // Asteroids
  asteroidPool.forEach(a => {
    a.container.x  += a.vx;
    a.container.y  += a.vy;
    a.container.rotation += a.rotSpd;
    if (a.container.y > GAME_H + 60) _respawnAsteroid(a);
  });
}

// ── Shooting stars ────────────────────────────────────────────────
function _spawnShootingStar() {
  const g = new PIXI.Graphics();
  g.x = Math.random() * GAME_W;
  g.y = -8;
  getLayer('BG_STARS').addChild(g);
  _shootingStars.push({ g, vx: 2.5, vy: 7, life: 1.0, trail: [] });
}

function _tickShootingStars() {
  for (let i = _shootingStars.length - 1; i >= 0; i--) {
    const s = _shootingStars[i];
    s.trail.unshift({ x: s.g.x, y: s.g.y });
    if (s.trail.length > 10) s.trail.pop();
    s.g.x += s.vx;
    s.g.y += s.vy;
    s.life -= 0.06;
    if (s.life <= 0) {
      getLayer('BG_STARS').removeChild(s.g);
      _shootingStars.splice(i, 1);
      continue;
    }
    s.g.clear();
    s.g.alpha = s.life;
    s.trail.forEach((pt, ti) => {
      const a = (1 - ti / s.trail.length) * 0.8;
      s.g.rect(pt.x - s.g.x - 1, pt.y - s.g.y - 1, 2, 2).fill({ color: 0xffffff, alpha: a });
    });
    s.g.rect(-1.5, -1.5, 3, 3).fill(0xffffff);
  }
}

// ── Planet ────────────────────────────────────────────────────────
function _spawnPlanet(stageNum) {
  const pal  = PLANET_PALETTES[Math.min(stageNum - 1, PLANET_PALETTES.length - 1)];
  const fromLeft = Math.random() < 0.5;
  const r    = 80 + Math.random() * 50;

  // Draw planet onto a canvas, make a texture
  const sz = Math.ceil(r * 2.8);
  const cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  const c  = cv.getContext('2d');
  const cx = sz / 2, cy = sz / 2;

  // Atmosphere glow
  const gAtmos = c.createRadialGradient(cx,cy,r*0.8,cx,cy,r*1.35);
  gAtmos.addColorStop(0,'rgba(0,0,0,0)');
  gAtmos.addColorStop(0.5,_tintToRgba(pal.tint, 0.12));
  gAtmos.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=gAtmos; c.fillRect(0,0,sz,sz);

  // Body
  const gBody = c.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.08,cx,cy,r);
  gBody.addColorStop(0,'#ffffff');
  gBody.addColorStop(0.3,_tintToRgba(pal.tint,1));
  gBody.addColorStop(0.7,_tintToRgba(pal.tint*0.5,1));
  gBody.addColorStop(1,'#000000');
  c.fillStyle=gBody; c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.fill();

  // Surface bands
  c.save(); c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.clip();
  for(let i=0;i<5;i++){
    const sy=cy-r*0.6+i*r*0.32;
    c.globalAlpha=0.08+i*0.015;
    c.fillStyle='#ffffff'; c.fillRect(cx-r,sy,r*2,r*0.1);
  }
  c.restore();

  // Terminator shadow
  c.save(); c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.clip();
  const gShad=c.createRadialGradient(cx+r*0.4,cy,0,cx+r*0.4,cy,r*1.2);
  gShad.addColorStop(0,'rgba(0,0,0,0)'); gShad.addColorStop(0.6,'rgba(0,0,0,0)'); gShad.addColorStop(1,'rgba(0,0,0,0.6)');
  c.fillStyle=gShad; c.fillRect(cx-r,cy-r,r*2,r*2); c.restore();

  const tex  = PIXI.Texture.from(cv);
  planetSprite = new PIXI.Sprite(tex);
  planetSprite.anchor.set(0.5);
  planetSprite.x = fromLeft ? -r - 20 : GAME_W + r + 20;
  planetSprite.y = 80 + Math.random() * (GAME_H * 0.45);
  planetVx       = fromLeft ? 0.22 : -0.22;
  getLayer('BG_PLANET').addChild(planetSprite);
}

function _destroyPlanet() {
  if (planetSprite) {
    getLayer('BG_PLANET').removeChild(planetSprite);
    planetSprite = null;
  }
}

// ── Asteroids ─────────────────────────────────────────────────────
function _initAsteroids() {
  for (let i = 0; i < 14; i++) {
    const a = _buildAsteroid();
    a.container.y = Math.random() * GAME_H;  // scatter on init
    getLayer('BG_ASTEROID').addChild(a.container);
    asteroidPool.push(a);
  }
}

function _buildAsteroid() {
  const n = 6 + Math.floor(Math.random() * 4);
  const r = 10 + Math.random() * 24;
  const g = new PIXI.Graphics();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a   = (i / n) * Math.PI * 2;
    const jr  = r * (0.6 + Math.random() * 0.4);
    pts.push({ x: Math.cos(a) * jr, y: Math.sin(a) * jr });
  }
  g.poly(pts.flatMap(p => [p.x, p.y])).fill({ color: 0x334455, alpha: 0.22 });
  g.poly(pts.flatMap(p => [p.x, p.y])).stroke({ color: 0x6688aa, alpha: 0.35, width: 1 });

  const container = new PIXI.Container();
  container.addChild(g);
  container.x = 20 + Math.random() * (GAME_W - 40);
  container.y = -r - 10;

  return {
    container,
    vx:     (Math.random() - 0.5) * 0.3,
    vy:     0.3 + Math.random() * 0.5,
    rotSpd: (Math.random() - 0.5) * 0.012,
  };
}

function _respawnAsteroid(a) {
  a.container.x = 20 + Math.random() * (GAME_W - 40);
  a.container.y = -40;
}

// ── Cleanup ───────────────────────────────────────────────────────
function _clearAll() {
  ['BG_FAR','BG_NEBULA','BG_STARS','BG_PLANET','BG_ASTEROID'].forEach(k => {
    getLayer(k).removeChildren();
  });
  starContainers = [];
  asteroidPool   = [];
  planetSprite   = null;
  _shootingStars = [];
  _bgScrollY     = 0;
}

// ── Helper ────────────────────────────────────────────────────────
function _tintToRgba(hex, alpha) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8)  & 0xff;
  const b =  hex        & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
