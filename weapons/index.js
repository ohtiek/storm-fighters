// weapons/index.js
// Each weapon exports fire(px, py, level, branch, bullets) and render(ctx, bullet).
// The registry maps weapon id → { fire, render }.

import * as S from '../core/state.js';

// ── Helpers ───────────────────────────────────────────────────────
function bullet(x, y, vx, vy, w, h, color, dmg, extra = {}) {
  return { x, y, vx, vy, w, h, color, dmg, ...extra };
}

// ── TWIN ──────────────────────────────────────────────────────────
// A: QUAD  — 4 heavy parallel beams
// B: CROSS — twin + angled diagonal shots
function fireTwin(px, py, level, branch, bullets) {
  if (branch === 'A' || (!branch && level < 2)) {
    // Quad parallel (A branch) or base twin
    const offs = level === 1 ? [-7, 7]
               : level === 2 ? [-10, 0, 10]
               : [-13, -5, 5, 13];
    offs.forEach(ox => bullets.push(bullet(px+ox, py-20, 0, -16, 3, 12, '#00ddff', 1)));
    if (level >= 2) bullets.push(bullet(px, py-20, 0, -16, 4, 14, '#ffffff', 1));

  } else {
    // B: CROSS — twin forward + angled diagonals
    bullets.push(bullet(px-7, py-20, 0, -16, 3, 12, '#88ffff', 1));
    bullets.push(bullet(px+7, py-20, 0, -16, 3, 12, '#88ffff', 1));
    if (level >= 2) {
      bullets.push(bullet(px, py-16, -4, -12, 3, 9, '#44ddff', 1));
      bullets.push(bullet(px, py-16,  4, -12, 3, 9, '#44ddff', 1));
    }
    if (level >= 3) {
      bullets.push(bullet(px-14, py-10, -6, -10, 2, 8, '#00bbff', 1));
      bullets.push(bullet(px+14, py-10,  6, -10, 2, 8, '#00bbff', 1));
    }
  }
}
function renderTwin(ctx, b) {
  ctx.save(); ctx.shadowColor = b.color; ctx.shadowBlur = 10;
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
  ctx.restore();
}

// ── SPREAD ────────────────────────────────────────────────────────
// A: INFERNO — wide fire ring
// B: NEEDLE  — tight concentrated fan
function fireSpread(px, py, level, branch, bullets) {
  if (branch === 'B') {
    // NEEDLE: tight fast fan
    const angs = level === 1 ? [-0.12, 0, 0.12]
               : level === 2 ? [-0.18, -0.06, 0, 0.06, 0.18]
               : [-0.22, -0.11, 0, 0.11, 0.22, -0.33, 0.33];
    angs.forEach(a => bullets.push(bullet(px, py-16, -16*Math.sin(a), -16*Math.cos(a), 2, 10, '#ffcc00', 1)));
  } else {
    // INFERNO: wide explosive fan (A or base)
    const angs = level === 1 ? [-0.28, 0, 0.28]
               : level === 2 ? [-0.40, -0.18, 0, 0.18, 0.40]
               : [-0.50, -0.30, -0.10, 0.10, 0.30, 0.50];
    angs.forEach(a => bullets.push(bullet(px, py-16, -13*Math.sin(a), -13*Math.cos(a), 4, 9, '#ff9900', 1, { glow: true })));
  }
}
function renderSpread(ctx, b) {
  ctx.save(); ctx.shadowColor = b.color; ctx.shadowBlur = b.glow ? 14 : 8;
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
  ctx.restore();
}

// ── LASER ─────────────────────────────────────────────────────────
// A: PRISM  — triple heavy prismatic beams
// B: PULSE  — rapid short pulses + side bursts
function fireLaser(px, py, level, branch, bullets) {
  if (branch === 'B') {
    // PULSE: short fat pulses + side
    const w = 5 + level * 2;
    bullets.push(bullet(px, py-18, 0, -18, w, 18, '#cc88ff', 2, { laser: true }));
    if (level >= 2) {
      bullets.push(bullet(px-16, py-12, -0.5, -15, 3, 12, '#aa66cc', 1, { laser: true }));
      bullets.push(bullet(px+16, py-12,  0.5, -15, 3, 12, '#aa66cc', 1, { laser: true }));
    }
    if (level >= 3) {
      bullets.push(bullet(px-28, py-8, -1, -12, 3, 10, '#884499', 1, { laser: true }));
      bullets.push(bullet(px+28, py-8,  1, -12, 3, 10, '#884499', 1, { laser: true }));
    }
  } else {
    // PRISM: thick central + coloured side beams
    const w = 8 + level * 3;
    bullets.push(bullet(px, py-22, 0, -20, w, 30, '#dd00ff', 2 + level, { laser: true }));
    if (level >= 2) {
      bullets.push(bullet(px-20, py-14, -0.4, -16, 5, 18, '#ff00cc', 2, { laser: true }));
      bullets.push(bullet(px+20, py-14,  0.4, -16, 5, 18, '#ff00cc', 2, { laser: true }));
    }
    if (level >= 3) {
      bullets.push(bullet(px-36, py-10, -0.8, -13, 3, 14, '#aa00ff', 1, { laser: true }));
      bullets.push(bullet(px+36, py-10,  0.8, -13, 3, 14, '#aa00ff', 1, { laser: true }));
    }
  }
}
function renderLaser(ctx, b) {
  ctx.save();
  ctx.shadowColor = b.color; ctx.shadowBlur = 14;
  const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y - b.h);
  g.addColorStop(0, b.color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(b.x - b.w/2, b.y - b.h, b.w, b.h);
  ctx.restore();
}

// ── MISSILE ───────────────────────────────────────────────────────
// A: CLUSTER — splits into 3 shards on impact
// B: SEEKER  — tight lock-on spiral trail
function fireMissile(px, py, level, branch, bullets, enemies) {
  const count = level === 1 ? 1 : level === 2 ? 2 : 3;
  for (let i = 0; i < count; i++) {
    const ox = (i - (count-1)/2) * 16;
    let vx = 0, vy = -14;
    // Find nearest enemy for guidance
    let nearest = null, nd = 99999;
    enemies.forEach(en => {
      const d = Math.hypot(en.x - (px+ox), en.y - py);
      if (d < nd) { nd = d; nearest = en; }
    });
    if (nearest) {
      const a = Math.atan2(nearest.y - py, nearest.x - (px+ox));
      vx = Math.cos(a) * 3 * 0.25;
      vy = Math.sin(a) * 3 - 13;
    }
    bullets.push(bullet(px+ox, py-16, vx, vy, 5, 10, '#00ff88', 3,
      { missile: true, branch, trail: [], age: 0 }));
  }
}
function renderMissile(ctx, b) {
  ctx.save();
  // Spiral trail
  if (b.trail && b.trail.length > 1) {
    ctx.strokeStyle = b.branch === 'B' ? '#00ffaa' : '#00cc66';
    ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(b.trail[0].x, b.trail[0].y);
    b.trail.forEach(t => ctx.lineTo(t.x, t.y));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowColor = b.color; ctx.shadowBlur = 12;
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
  ctx.fillStyle = '#ff4400';
  ctx.beginPath(); ctx.arc(b.x, b.y + b.h/2, 3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function tickMissile(b) {
  if (!b.trail) return;
  b.trail.unshift({ x: b.x, y: b.y });
  if (b.trail.length > 12) b.trail.pop();
  b.age++;
}

// ── PLASMA ────────────────────────────────────────────────────────
// A: NOVA  — large slow expanding orbs that burst
// B: CHAIN — smaller fast orbs; on hit, chain to nearest enemy
function firePlasma(px, py, level, branch, bullets) {
  if (branch === 'B') {
    // CHAIN: fast small orbs
    const count = level === 1 ? 1 : level === 2 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const ox = (i-(count-1)/2) * 14;
      bullets.push(bullet(px+ox, py-16, ox*0.1, -13, 7, 7, '#ffffaa', 2,
        { plasma: true, branch: 'B', orb: true }));
    }
  } else {
    // NOVA: large slow orb, explodes on contact
    const sz = 8 + level * 4;
    bullets.push(bullet(px, py-18, 0, -8, sz, sz, '#ffee00', 3 + level,
      { plasma: true, branch: 'A', orb: true, nova: true }));
    if (level >= 2) {
      bullets.push(bullet(px-20, py-12, -0.5, -7, 6, 6, '#ffcc00', 2,
        { plasma: true, branch: 'A', orb: true }));
      bullets.push(bullet(px+20, py-12,  0.5, -7, 6, 6, '#ffcc00', 2,
        { plasma: true, branch: 'A', orb: true }));
    }
    if (level >= 3) {
      for (let i = 0; i < 4; i++) {
        const a = (i/4)*Math.PI*2;
        bullets.push(bullet(px, py, Math.cos(a)*3, Math.sin(a)*3 - 5, 5, 5, '#ff8800', 2,
          { plasma: true, orb: true }));
      }
    }
  }
}
function renderPlasma(ctx, b) {
  ctx.save();
  ctx.shadowColor = b.color; ctx.shadowBlur = 16;
  ctx.fillStyle = b.color;
  const r = b.w / 2;
  ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI*2); ctx.fill();
  // Inner bright core
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(b.x - r*0.3, b.y - r*0.3, r*0.3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Registry ──────────────────────────────────────────────────────
export const WEAPON_REGISTRY = {
  twin:    { fire: fireTwin,    render: renderTwin,    tick: null         },
  spread:  { fire: fireSpread,  render: renderSpread,  tick: null         },
  laser:   { fire: fireLaser,   render: renderLaser,   tick: null         },
  missile: { fire: fireMissile, render: renderMissile, tick: tickMissile  },
  plasma:  { fire: firePlasma,  render: renderPlasma,  tick: null         },
};

/** Master fire dispatcher. */
export function fireWeapon(weaponId, px, py, level, branch, bullets, enemies) {
  const w = WEAPON_REGISTRY[weaponId];
  if (w) w.fire(px, py, level, branch, bullets, enemies);
}

/** Render all player bullets. */
export function renderBullets(ctx, bullets) {
  bullets.forEach(b => {
    const wid = b.plasma ? 'plasma' : b.laser ? 'laser' : b.missile ? 'missile' : null;
    if (wid && WEAPON_REGISTRY[wid]) {
      WEAPON_REGISTRY[wid].render(ctx, b);
    } else {
      // Default rect render (twin / spread)
      ctx.save(); ctx.shadowColor = b.color; ctx.shadowBlur = 10;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
      ctx.restore();
    }
  });
}

/** Per-frame tick for bullets that need it (e.g. missile trail). */
export function tickBullets(bullets) {
  bullets.forEach(b => {
    if (b.missile && WEAPON_REGISTRY.missile.tick) {
      WEAPON_REGISTRY.missile.tick(b);
    }
  });
}
