// render/pixi/assetLoader.js
// Loads every texture before the game starts.
// If real PNG assets are missing, procedurally generates placeholder textures
// on a temporary canvas so the game always runs during development.
// Replace the generated textures with real artwork at any time — zero code changes needed.

import * as PIXI from 'pixi.js';
import { GAME_W, GAME_H } from '../../core/state.js';

// Public texture registry — imported by all render modules
export const T = {};

// Sprite-sheet frame arrays (AnimatedSprite-ready)
export const FRAMES = {};

let _loaded = false;

// ─────────────────────────────────────────────────────────────────────────────
// ASSET MANIFEST
// Replace 'src' paths with real files when you have them.
// 'fallback' is called only when the file is missing / returns 404.
// ─────────────────────────────────────────────────────────────────────────────
const MANIFEST = [
  // Ships (256×256 PNG, transparent bg, nose pointing UP)
  { alias: 'ship-raijin',  src: 'assets/ships/raijin-x.png',   fallback: () => _genShip('#00ccff','#0044ff','twin')    },
  { alias: 'ship-viper',   src: 'assets/ships/viper-ii.png',   fallback: () => _genShip('#ff6600','#ff2200','spread')  },
  { alias: 'ship-thunder', src: 'assets/ships/thunder-9.png',  fallback: () => _genShip('#cc00ff','#6600cc','laser')   },
  { alias: 'ship-shield',  src: 'assets/ships/shield-ring.png', fallback: () => _genShieldRing()                       },
  { alias: 'ship-exhaust', src: 'assets/ships/exhaust.png',    fallback: () => _genExhaust()                          },

  // Enemies (sprite sheets: 4 frames wide × 1 row, each frame 96×96)
  { alias: 'enemy-fighter',  src: 'assets/enemies/fighter-sheet.png',  fallback: () => _genEnemySheet('fighter',  4) },
  { alias: 'enemy-bomber',   src: 'assets/enemies/bomber-sheet.png',   fallback: () => _genEnemySheet('bomber',   4) },
  { alias: 'enemy-gunship',  src: 'assets/enemies/gunship-sheet.png',  fallback: () => _genEnemySheet('gunship',  4) },
  { alias: 'enemy-boss',     src: 'assets/enemies/boss-sheet.png',     fallback: () => _genEnemySheet('boss',     8, 192) },

  // Bullets
  { alias: 'bullet-player', src: 'assets/bullets/bullet-player.png', fallback: () => _genBulletOrb('#00ddff', 12) },
  { alias: 'bullet-enemy',  src: 'assets/bullets/bullet-enemy.png',  fallback: () => _genBulletOrb('#ff3300', 10) },
  { alias: 'bullet-laser',  src: 'assets/bullets/laser-strip.png',   fallback: () => _genLaserStrip('#dd00ff')    },
  { alias: 'bullet-missile',src: 'assets/bullets/missile.png',       fallback: () => _genMissile('#00ff88')       },
  { alias: 'bullet-plasma', src: 'assets/bullets/plasma-orb.png',    fallback: () => _genBulletOrb('#ffee00', 16) },

  // FX (sprite sheets)
  { alias: 'fx-explosion',  src: 'assets/fx/explosion-sheet.png',   fallback: () => _genExplosionSheet(4, 4, 128) },
  { alias: 'fx-shockwave',  src: 'assets/fx/shockwave-sheet.png',   fallback: () => _genShockwaveSheet(6, 128)    },
  { alias: 'fx-spark',      src: 'assets/fx/spark.png',             fallback: () => _genSpark()                   },
  { alias: 'fx-pickup-w',   src: 'assets/fx/pickup-weapon.png',     fallback: () => _genPickup('#00ff99', 'W')    },
  { alias: 'fx-pickup-b',   src: 'assets/fx/pickup-bomb.png',       fallback: () => _genPickup('#ff6600', 'B')    },
  { alias: 'fx-pickup-h',   src: 'assets/fx/pickup-health.png',     fallback: () => _genPickup('#00cc44', '+')    },

  // Backgrounds (390 × 1400, seamless vertical tile)
  { alias: 'bg-stage1', src: 'assets/bg/stage1.png', fallback: () => _genBackground(1) },
  { alias: 'bg-stage2', src: 'assets/bg/stage2.png', fallback: () => _genBackground(2) },
  { alias: 'bg-stage3', src: 'assets/bg/stage3.png', fallback: () => _genBackground(3) },
  { alias: 'bg-stage4', src: 'assets/bg/stage4.png', fallback: () => _genBackground(4) },
  { alias: 'bg-stage5', src: 'assets/bg/stage5.png', fallback: () => _genBackground(5) },
  { alias: 'bg-nebula', src: 'assets/bg/nebula-overlay.png', fallback: () => _genNebula() },
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC LOAD
// ─────────────────────────────────────────────────────────────────────────────
export async function loadAllAssets(onProgress) {
  if (_loaded) return;
  let done = 0;

  for (const entry of MANIFEST) {
    let tex;
    try {
      tex = await PIXI.Assets.load({ alias: entry.alias, src: entry.src });
    } catch {
      // File not found — generate procedural placeholder
      const canvas = entry.fallback();
      tex = PIXI.Texture.from(canvas);
    }
    T[entry.alias] = tex;
    done++;
    onProgress?.(done / MANIFEST.length);
  }

  // Build sprite sheet frame arrays
  FRAMES['enemy-fighter'] = _sliceSheet(T['enemy-fighter'],  4, 1, 96,  96);
  FRAMES['enemy-bomber']  = _sliceSheet(T['enemy-bomber'],   4, 1, 96,  96);
  FRAMES['enemy-gunship'] = _sliceSheet(T['enemy-gunship'],  4, 1, 96,  96);
  FRAMES['enemy-boss']    = _sliceSheet(T['enemy-boss'],     8, 1, 192, 192);
  FRAMES['fx-explosion']  = _sliceSheet(T['fx-explosion'],   4, 4, 128, 128);
  FRAMES['fx-shockwave']  = _sliceSheet(T['fx-shockwave'],   6, 1, 128, 128);

  _loaded = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET SLICER
// ─────────────────────────────────────────────────────────────────────────────
function _sliceSheet(tex, cols, rows, fw, fh) {
  const frames = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      frames.push(new PIXI.Texture({
        source: tex.source,
        frame:  new PIXI.Rectangle(c * fw, r * fh, fw, fh),
      }));
    }
  }
  return frames;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL FALLBACK GENERATORS
// All return an HTMLCanvasElement.
// ─────────────────────────────────────────────────────────────────────────────

function _c(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

// ── Player ships ─────────────────────────────────────────────────
function _genShip(col, acc, type) {
  const cv = _c(256, 256);
  const c  = cv.getContext('2d');
  const cx = 128, cy = 128;
  c.save(); c.translate(cx, cy);

  if (type === 'twin') {
    // Detailed delta wing with glow
    c.shadowColor = col; c.shadowBlur = 24;
    c.beginPath(); c.moveTo(0,-70); c.lineTo(-58,24); c.lineTo(-26,14); c.lineTo(0,42); c.lineTo(26,14); c.lineTo(58,24); c.closePath();
    const g = c.createLinearGradient(0,-70,0,42);
    g.addColorStop(0,'#ffffff'); g.addColorStop(0.3, col); g.addColorStop(1,acc);
    c.fillStyle = g; c.fill();
    // Cockpit
    c.shadowBlur = 16;
    c.beginPath(); c.moveTo(0,-52); c.lineTo(-14,-8); c.lineTo(0,16); c.lineTo(14,-8); c.closePath();
    c.fillStyle = '#aaeeff'; c.fill();
    // Engine pods
    c.fillStyle = '#ff8800'; c.shadowColor = '#ff8800'; c.shadowBlur = 12;
    c.fillRect(-42,22,26,18); c.fillRect(16,22,26,18);
    c.fillStyle = '#ffee44'; c.fillRect(-40,24,22,12); c.fillRect(18,24,22,12);
    // Wing cannons
    c.fillStyle = '#cceeFF'; c.shadowBlur = 8;
    c.fillRect(-72,4,14,8); c.fillRect(58,4,14,8);

  } else if (type === 'spread') {
    c.shadowColor = col; c.shadowBlur = 24;
    c.beginPath(); c.moveTo(0,-76); c.lineTo(-70,36); c.lineTo(-16,20); c.lineTo(0,54); c.lineTo(16,20); c.lineTo(70,36); c.closePath();
    const g = c.createLinearGradient(0,-76,0,54);
    g.addColorStop(0,'#ffffff'); g.addColorStop(0.3,col); g.addColorStop(1,acc);
    c.fillStyle = g; c.fill();
    c.beginPath(); c.moveTo(0,-56); c.lineTo(-16,6); c.lineTo(0,28); c.lineTo(16,6); c.closePath();
    c.fillStyle = '#ffeeaa'; c.fill();
    c.fillStyle = '#ff4400'; c.shadowColor='#ff4400'; c.shadowBlur=14;
    c.fillRect(-32,30,64,18); c.fillStyle='#ffaa00'; c.fillRect(-28,32,56,12);

  } else {
    // Heavy cruiser
    c.shadowColor = col; c.shadowBlur = 28;
    c.beginPath(); c.moveTo(0,-66); c.lineTo(-42,6); c.lineTo(-66,42); c.lineTo(-24,30); c.lineTo(0,54); c.lineTo(24,30); c.lineTo(66,42); c.lineTo(42,6); c.closePath();
    const g = c.createLinearGradient(0,-66,0,54);
    g.addColorStop(0,'#ffffff'); g.addColorStop(0.3,col); g.addColorStop(1,acc);
    c.fillStyle = g; c.fill();
    c.beginPath(); c.moveTo(0,-42); c.lineTo(-20,14); c.lineTo(0,36); c.lineTo(20,14); c.closePath();
    c.fillStyle = '#dd88ff'; c.fill();
    c.fillStyle = '#aa00ff'; c.shadowColor='#aa00ff'; c.shadowBlur=14;
    for (let i = -28; i <= 28; i += 14) { c.fillRect(i-9,36,18,20); c.fillStyle='#ee88ff'; c.fillRect(i-7,38,14,14); c.fillStyle='#aa00ff'; }
  }
  c.restore();
  return cv;
}

// ── Shield ring ──────────────────────────────────────────────────
function _genShieldRing() {
  const cv = _c(128, 128);
  const c  = cv.getContext('2d');
  c.strokeStyle = '#44ddff'; c.lineWidth = 4;
  c.shadowColor = '#00aaff'; c.shadowBlur = 20;
  c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = 'rgba(100,220,255,0.3)'; c.lineWidth = 12;
  c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke();
  return cv;
}

// ── Engine exhaust ───────────────────────────────────────────────
function _genExhaust() {
  const cv = _c(32, 64); const c = cv.getContext('2d');
  const g = c.createLinearGradient(0,0,0,64);
  g.addColorStop(0,'rgba(255,200,50,0.9)'); g.addColorStop(0.4,'rgba(255,100,0,0.7)');
  g.addColorStop(1,'rgba(255,60,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(16,0); c.lineTo(0,64); c.lineTo(32,64); c.closePath(); c.fill();
  return cv;
}

// ── Enemy sheets ─────────────────────────────────────────────────
function _genEnemySheet(type, frames, sz = 96) {
  const cv = _c(sz * frames, sz);
  const c  = cv.getContext('2d');
  const configs = {
    fighter:  { col:'#cc2200', acc:'#ff4400', glow:'#ff6600' },
    bomber:   { col:'#884400', acc:'#cc6600', glow:'#ff8800' },
    gunship:  { col:'#226600', acc:'#44aa00', glow:'#88ff44' },
    boss:     { col:'#440033', acc:'#880055', glow:'#ff0066' },
  };
  const cfg = configs[type] || configs.fighter;
  const half = sz / 2;

  for (let f = 0; f < frames; f++) {
    const ox = f * sz + half;
    const pct = f / (frames - 1 || 1); // 0..1 animation progress
    c.save(); c.translate(ox, half);
    c.shadowColor = cfg.glow; c.shadowBlur = 14 + Math.sin(pct * Math.PI) * 8;

    if (type === 'fighter') {
      c.beginPath(); c.moveTo(0,half*0.5); c.lineTo(-half*0.4,-half*0.35); c.lineTo(-half*0.18,-half*0.18); c.lineTo(0,-half*0.48); c.lineTo(half*0.18,-half*0.18); c.lineTo(half*0.4,-half*0.35); c.closePath();
      const g=c.createRadialGradient(0,0,4,0,0,half*0.5); g.addColorStop(0,'#ff8866'); g.addColorStop(1,cfg.col);
      c.fillStyle=g; c.fill();
      // Animated engine intake pulse
      c.fillStyle=`rgba(255,100,0,${0.4+pct*0.6})`; c.beginPath(); c.arc(0,-half*0.15,half*0.12,0,Math.PI*2); c.fill();

    } else if (type === 'bomber') {
      c.beginPath(); c.moveTo(0,half*0.65); c.lineTo(-half*0.65,half*0.15); c.lineTo(-half*0.5,-half*0.35); c.lineTo(0,-half*0.55); c.lineTo(half*0.5,-half*0.35); c.lineTo(half*0.65,half*0.15); c.closePath();
      const g=c.createRadialGradient(-half*0.1,-half*0.1,4,0,0,half*0.6); g.addColorStop(0,'#ddaa66'); g.addColorStop(1,cfg.col);
      c.fillStyle=g; c.fill();
      c.fillStyle=cfg.acc; c.beginPath(); c.moveTo(0,-half*0.45); c.lineTo(-half*0.2,0); c.lineTo(0,half*0.2); c.lineTo(half*0.2,0); c.closePath(); c.fill();

    } else if (type === 'gunship') {
      c.beginPath(); c.moveTo(0,half*0.65); c.lineTo(-half*0.62,half*0.2); c.lineTo(-half*0.72,-half*0.18); c.lineTo(0,-half*0.62); c.lineTo(half*0.72,-half*0.18); c.lineTo(half*0.62,half*0.2); c.closePath();
      const g=c.createRadialGradient(0,0,6,0,0,half*0.6); g.addColorStop(0,'#88ee44'); g.addColorStop(1,cfg.col);
      c.fillStyle=g; c.fill();
      c.fillStyle=cfg.acc; c.fillRect(-half*0.26,-half*0.38,half*0.52,half*0.48);
      c.fillStyle='#aaffaa'; c.fillRect(-half*0.12,-half*0.52,half*0.24,half*0.22);

    } else {
      // Boss — elaborate
      const pulse = 0.85 + Math.sin(pct*Math.PI*2)*0.15;
      c.scale(pulse, pulse);
      c.beginPath(); c.moveTo(0,-half*0.75); c.lineTo(-half*0.54,-half*0.38); c.lineTo(-half*0.79,0); c.lineTo(-half*0.62,half*0.38); c.lineTo(-half*0.29,half*0.54); c.lineTo(0,half*0.62); c.lineTo(half*0.29,half*0.54); c.lineTo(half*0.62,half*0.38); c.lineTo(half*0.79,0); c.lineTo(half*0.54,-half*0.38); c.closePath();
      const g=c.createRadialGradient(-half*0.2,-half*0.2,8,0,0,half*0.75); g.addColorStop(0,'#cc44aa'); g.addColorStop(0.5,cfg.acc); g.addColorStop(1,cfg.col);
      c.fillStyle=g; c.fill();
      c.beginPath(); c.moveTo(0,-half*0.54); c.lineTo(-half*0.28,-half*0.18); c.lineTo(-half*0.36,half*0.18); c.lineTo(0,half*0.3); c.lineTo(half*0.36,half*0.18); c.lineTo(half*0.28,-half*0.18); c.closePath();
      c.fillStyle=cfg.acc; c.fill();
      c.beginPath(); c.arc(0,-half*0.06,half*0.2,0,Math.PI*2); c.fillStyle='#ff0066'; c.fill();
      c.beginPath(); c.arc(-half*0.08,-half*0.14,half*0.08,0,Math.PI*2); c.fillStyle='#ff88cc'; c.fill();
      // Weapon arms
      c.fillStyle='#cc0044'; c.fillRect(-half*0.74,-half*0.1,half*0.22,half*0.1); c.fillRect(half*0.52,-half*0.1,half*0.22,half*0.1);
    }
    c.restore();
  }
  return cv;
}

// ── Bullet orb ───────────────────────────────────────────────────
function _genBulletOrb(col, r) {
  const sz = r * 4;
  const cv = _c(sz, sz); const c = cv.getContext('2d');
  const g = c.createRadialGradient(sz*0.35, sz*0.35, 1, sz/2, sz/2, r);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.3,col); g.addColorStop(1,'rgba(0,0,0,0)');
  c.shadowColor = col; c.shadowBlur = r * 1.5;
  c.fillStyle = g; c.beginPath(); c.arc(sz/2, sz/2, r, 0, Math.PI*2); c.fill();
  return cv;
}

// ── Laser strip (tileable vertically) ───────────────────────────
function _genLaserStrip(col) {
  const cv = _c(16, 64); const c = cv.getContext('2d');
  const g = c.createLinearGradient(0,0,16,0);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(0.5,col); g.addColorStop(1,'rgba(0,0,0,0)');
  c.shadowColor = col; c.shadowBlur = 12;
  c.fillStyle = g; c.fillRect(0,0,16,64);
  c.fillStyle = '#ffffff'; c.globalAlpha=0.5; c.fillRect(6,0,4,64);
  return cv;
}

// ── Missile ──────────────────────────────────────────────────────
function _genMissile(col) {
  const cv = _c(16,32); const c = cv.getContext('2d');
  c.shadowColor=col; c.shadowBlur=10;
  const g=c.createLinearGradient(0,0,0,28);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.3,col); g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g; c.fillRect(4,0,8,24);
  c.fillStyle='#ff4400'; c.beginPath(); c.arc(8,28,6,0,Math.PI*2); c.fill();
  return cv;
}

// ── Explosion sheet (cols × rows grid) ──────────────────────────
function _genExplosionSheet(cols, rows, sz) {
  const total = cols * rows;
  const cv = _c(sz * cols, sz * rows);
  const c  = cv.getContext('2d');
  for (let i = 0; i < total; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = col * sz + sz/2, cy = row * sz + sz/2;
    const t  = i / (total - 1);  // 0..1 animation progress
    const r  = sz * 0.08 + sz * 0.38 * Math.sin(t * Math.PI);

    // Outer shockwave ring
    c.globalAlpha = (1 - t) * 0.5;
    c.strokeStyle = '#ffee44'; c.lineWidth = 4;
    c.beginPath(); c.arc(cx, cy, r * 1.6, 0, Math.PI*2); c.stroke();

    // Core fireball gradient
    c.globalAlpha = Math.sin(t * Math.PI);
    const g = c.createRadialGradient(cx - r*0.2, cy - r*0.2, 2, cx, cy, r);
    g.addColorStop(0,'#ffffff');
    g.addColorStop(0.2,'#ffff88');
    g.addColorStop(0.5,'#ff8800');
    g.addColorStop(0.8,'#ff2200');
    g.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2); c.fill();

    // Sparks
    c.globalAlpha = (1-t)*0.8;
    const sparkCount = 6 + Math.floor(t * 6);
    for (let s = 0; s < sparkCount; s++) {
      const a   = (s / sparkCount) * Math.PI*2 + t*1.5;
      const sr  = r * (0.8 + Math.random()*0.4);
      const sx  = cx + Math.cos(a)*sr, sy = cy + Math.sin(a)*sr;
      c.fillStyle = t < 0.5 ? '#ffff00' : '#ff6600';
      c.beginPath(); c.arc(sx, sy, 3, 0, Math.PI*2); c.fill();
    }
    c.globalAlpha = 1;
  }
  return cv;
}

// ── Shockwave sheet (ring expand) ───────────────────────────────
function _genShockwaveSheet(frames, sz) {
  const cv = _c(sz * frames, sz);
  const c  = cv.getContext('2d');
  for (let i = 0; i < frames; i++) {
    const cx = i * sz + sz/2, cy = sz/2;
    const t  = i / (frames - 1);
    const r  = sz * 0.08 + sz * 0.42 * t;
    c.globalAlpha = (1 - t) * 0.9;
    c.strokeStyle = `rgb(${Math.floor(255*(1-t))},${Math.floor(200+55*t)},255)`;
    c.lineWidth = 6 * (1 - t * 0.7);
    c.shadowColor='#88aaff'; c.shadowBlur = 20;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2); c.stroke();
    c.globalAlpha = 1;
  }
  return cv;
}

// ── Spark ────────────────────────────────────────────────────────
function _genSpark() {
  const cv = _c(8, 8); const c = cv.getContext('2d');
  const g = c.createRadialGradient(4,4,0,4,4,4);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.5,'#ffcc00'); g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g; c.fillRect(0,0,8,8);
  return cv;
}

// ── Pickup bubbles ───────────────────────────────────────────────
function _genPickup(col, label) {
  const cv = _c(48,48); const c = cv.getContext('2d');
  c.shadowColor=col; c.shadowBlur=16;
  const g=c.createRadialGradient(18,18,2,24,24,22);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.4,col); g.addColorStop(1,'rgba(0,0,0,0.2)');
  c.fillStyle=g; c.beginPath(); c.arc(24,24,20,0,Math.PI*2); c.fill();
  c.strokeStyle='rgba(255,255,255,0.8)'; c.lineWidth=2;
  c.beginPath(); c.arc(24,24,20,0,Math.PI*2); c.stroke();
  c.fillStyle='#000'; c.font='bold 16px monospace';
  c.textAlign='center'; c.textBaseline='middle';
  c.fillText(label,24,25);
  return cv;
}

// ── Background tiles ─────────────────────────────────────────────
const BG_PALETTES = [
  { base:'#020818', grid:'#041530', accent:'#061844', fog:'#0a2060' }, // stage1 deep space
  { base:'#180802', grid:'#301008', accent:'#441408', fog:'#601820' }, // stage2 lava
  { base:'#021808', grid:'#041e04', accent:'#062408', fog:'#0a3010' }, // stage3 nebula green
  { base:'#100818', grid:'#1c0e28', accent:'#241438', fog:'#301848' }, // stage4 purple gas
  { base:'#180010', grid:'#280018', accent:'#380024', fog:'#480030' }, // stage5 crimson
];
function _genBackground(stageNum) {
  const pal = BG_PALETTES[Math.min(stageNum-1, BG_PALETTES.length-1)];
  const W = GAME_W, H = GAME_H * 2;
  const cv = _c(W, H); const c = cv.getContext('2d');

  // Base fill
  c.fillStyle = pal.base; c.fillRect(0,0,W,H);

  // Grid lines suggesting ground terrain
  c.strokeStyle = pal.grid; c.lineWidth = 1;
  const gs = 40;
  for (let x=0; x<W; x+=gs) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,H); c.stroke(); }
  for (let y=0; y<H; y+=gs) { c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke(); }

  // Diagonal accent lines
  c.strokeStyle = pal.accent; c.lineWidth = 0.5; c.globalAlpha=0.4;
  for (let x=-H; x<W+H; x+=80) { c.beginPath(); c.moveTo(x,0); c.lineTo(x+H,H); c.stroke(); }
  c.globalAlpha=1;

  // Random patches of darker sections (runway / terrain variation)
  c.fillStyle=pal.fog; c.globalAlpha=0.15;
  for (let i=0; i<30; i++) {
    const rx=Math.random()*W, ry=Math.random()*H;
    const rw=40+Math.random()*80, rh=40+Math.random()*80;
    c.fillRect(rx,ry,rw,rh);
  }
  c.globalAlpha=1;
  return cv;
}

// ── Nebula overlay ───────────────────────────────────────────────
function _genNebula() {
  const cv=_c(GAME_W, GAME_H); const c=cv.getContext('2d');
  const blobs=[
    {x:0.15,y:0.2,r:180,col:[40,0,80]},{x:0.75,y:0.1,r:220,col:[0,20,80]},
    {x:0.5,y:0.55,r:200,col:[0,50,40]},{x:0.85,y:0.7,r:160,col:[60,0,60]},
  ];
  blobs.forEach(b=>{
    const bx=b.x*GAME_W, by=b.y*GAME_H;
    const g=c.createRadialGradient(bx,by,0,bx,by,b.r);
    g.addColorStop(0,`rgba(${b.col},0.1)`); g.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=g; c.fillRect(0,0,GAME_W,GAME_H);
  });
  return cv;
}
