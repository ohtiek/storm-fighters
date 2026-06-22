// entities/enemy.js
import * as S from '../core/state.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { WEAPONS } from '../data/weapons.js';
import { spawnExplosion } from '../render/effects.js';

// NOTE: spawnExplosion is a no-op stub when PixiJS render is active.
// main.js overrides it via the hook below.
let _onEnemyDeath = null;
export function setEnemyDeathHook(fn) { _onEnemyDeath = fn; }

const FIGHTER_COLORS = ['#cc2200','#dd3300','#bb1100','#ee4400'];

export function spawnEnemy() {
  const t = Math.random();
  const stage = S.stage;
  let type;
  if      (t < 0.50) type = 'fighter';
  else if (t < 0.80) type = 'bomber';
  else               type = 'gunship';

  const def = ENEMY_TYPES[type];
  const hp  = def.hpBase + def.hpPerStage * stage;
  const spd = def.speedBase + def.speedPerStage * stage + Math.random() * 0.8;
  const fr  = Math.max(60, def.fireRate - def.fireRateReduction * stage);

  S.enemies.push({
    x: 30 + Math.random() * (S.GAME_W - 60),
    y: -30,
    type, hp, maxHp: hp, speed: spd,
    fireRate: fr,
    fireCooldown: Math.floor(Math.random() * fr),
    pts: def.points,
    vx: (Math.random() - 0.5) * 1.4,
    vy: spd,
    color: FIGHTER_COLORS[Math.floor(Math.random() * FIGHTER_COLORS.length)],
    phase: Math.random() * Math.PI * 2,
    age: 0,
  });
}

export function spawnBoss() {
  const def = ENEMY_TYPES.boss;
  const hp  = def.hpBase + def.hpPerStage * S.stage;
  const b = {
    x: S.GAME_W / 2, y: -100,
    type: 'boss', hp, maxHp: hp,
    speed: 0.8, vx: 1.2,
    pts: def.points,
    fireRate: 30, fireCooldown: 0,
    phase: 0, age: 0,
  };
  S.enemies.push(b);
  S.setBoss(b);
}

export function updateEnemies(gameOver) {
  S.enemies.forEach(e => {
    e.age++;
    e.phase += 0.035;
    if (e.type === 'boss') { _moveBoss(e); _fireBoss(e); }
    else { _moveEnemy(e); _fireEnemy(e); }
  });

  // Bullet ↔ enemy collision
  for (let bi = S.bullets.length - 1; bi >= 0; bi--) {
    const b = S.bullets[bi];
    let hitSingle = false;
    for (const e of S.enemies) {
      const ew = e.type==='boss' ? 68 : e.type==='bomber' ? 54 : e.type==='gunship' ? 58 : 50;
      if (_overlap(b.x,b.y,b.w,b.h, e.x,e.y,ew,ew)) {
        e.hp -= b.dmg || 1;
        if (!b.laser && !b.beam && !b.plasma) hitSingle = true;
      }
    }
    if (hitSingle) S.bullets.splice(bi, 1);
  }

  // Dead enemies — reverse-for so splice doesn't skip; avoids namespace assign
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    const e = S.enemies[i];
    if (e.hp > 0) continue;
    S.addKill();
    S.addScore(e.pts);

    // Notify render layer (PixiJS explosions + score popups).
    // Wrap in try/catch — a hook error must not prevent the enemy being removed.
    try { _onEnemyDeath?.(e); } catch (err) { console.error('[storm] death hook:', err); }

    // Drop pickups — weapon bubble carries branch A or B
    const chance = e.type === 'boss' ? 1 : 0.40;
    if (Math.random() < chance) {
      const roll   = Math.random();
      if (roll < 0.55) {
        const branch = Math.random() < 0.5 ? 'A' : 'B';
        const w = WEAPONS[S.weaponState.index];
        S.pickups.push({
          x: e.x, y: e.y, vy: 1.5,
          type:        'weapon',
          branch,
          branchColor: branch === 'A' ? '#ffdd44' : '#44ffdd',
          branchLabel: branch === 'A'
            ? (w.branches?.A?.label ?? 'A')
            : (w.branches?.B?.label ?? 'B'),
          age: 0,
        });
      } else if (roll < 0.80) {
        S.pickups.push({ x: e.x, y: e.y, vy: 1.5, type: 'health', age: 0 });
      } else {
        S.pickups.push({ x: e.x, y: e.y, vy: 1.5, type: 'bomb',   age: 0 });
      }
    }

    if (e.type === 'boss') {
      S.setBoss(null);
      setTimeout(() => { S.nextStage(); S.setBossSpawned(false); }, 1200);
    }
    S.enemies.splice(i, 1);
  }

  // Enemy body ↔ player
  if (!S.invincible) {
    S.enemies.forEach(e => {
      const ew = e.type === 'boss' ? 68 : 48;
      if (_overlap(S.player.x, S.player.y, 12, 12, e.x, e.y, ew, ew)) {
        S.setHealth(S.health - 20);
        S.setInvincible(80);
        _onEnemyDeath?.({ x: S.player.x, y: S.player.y, type: '_hit', pts: 0 });
        if (S.health <= 0) gameOver();
      }
    });
  }
}

function _moveBoss(e) {
  if (e.y < 120) { e.y += 0.9; return; }
  e.x += e.vx + Math.sin(e.phase * 0.7) * 1.4;
  e.y += Math.sin(e.phase * 0.45) * 0.9;
  if (e.x < 80 || e.x > S.GAME_W - 80) e.vx *= -1;
  e.y = Math.max(90, Math.min(220, e.y));
}

function _fireBoss(e) {
  e.fireCooldown--;
  if (e.fireCooldown > 0) return;
  e.fireCooldown = e.fireRate;
  const pat = Math.floor(e.age / 280) % 3;
  if (pat === 0) {
    for (let i = -2; i <= 2; i++) {
      const ddx = S.player.x - e.x, ddy = S.player.y - e.y;
      const ds  = Math.sqrt(ddx*ddx + ddy*ddy);
      S.eBullets.push({ x:e.x, y:e.y+45, vx:(ddx/ds*3.5)+i*0.35, vy:ddy/ds*3.5, w:6,h:6, color:'#ff0088', dmg:10 });
    }
  } else if (pat === 1) {
    for (let i = 0; i < 10; i++) {
      const a = (i/10)*Math.PI*2;
      S.eBullets.push({ x:e.x, y:e.y, vx:Math.cos(a)*3, vy:Math.sin(a)*3, w:5,h:5, color:'#ff4400', dmg:8 });
    }
  } else {
    for (let ss = -1; ss <= 1; ss++) {
      const ddx = S.player.x - e.x + ss*40, ddy = S.player.y - e.y;
      const ds  = Math.sqrt(ddx*ddx + ddy*ddy);
      S.eBullets.push({ x:e.x+ss*30, y:e.y+45, vx:ddx/ds*4, vy:ddy/ds*4, w:7,h:7, color:'#ffaa00', dmg:12 });
    }
  }
}

function _moveEnemy(e) {
  if (e.type === 'fighter') {
    e.x += e.vx + Math.sin(e.phase) * 1.4; e.y += e.vy;
    if (e.x < 10 || e.x > S.GAME_W - 10) e.vx *= -1;
  } else if (e.type === 'bomber') {
    e.x += Math.sin(e.phase * 0.7) * 1.2; e.y += e.speed * 0.8;
  } else {
    e.y += e.speed * 0.7; e.x += Math.sin(e.phase * 0.5) * 2;
  }
}

function _fireEnemy(e) {
  if (e.y < 0 || e.y > S.GAME_H) return;
  e.fireCooldown--;
  if (e.fireCooldown > 0) return;
  e.fireCooldown = e.fireRate + Math.floor(Math.random() * 30);
  const ddx = S.player.x - e.x, ddy = S.player.y - e.y;
  const ds  = Math.sqrt(ddx*ddx + ddy*ddy);
  if (e.type === 'gunship') {
    for (let i = -1; i <= 1; i++)
      S.eBullets.push({ x:e.x, y:e.y+14, vx:(ddx/ds*3)+i*0.7, vy:ddy/ds*3, w:5,h:8, color:'#44ff44', dmg:7 });
  } else {
    S.eBullets.push({ x:e.x, y:e.y+14, vx:ddx/ds*2.5, vy:ddy/ds*2.5, w:4,h:7,
      color: e.type==='bomber' ? '#ff8800' : '#ff3300',
      dmg:   e.type==='bomber' ? 9 : 7,
    });
  }
}

function _overlap(ax,ay,aw,ah,bx,by,bw,bh) {
  return ax-aw/2<bx+bw/2 && ax+aw/2>bx-bw/2 && ay-ah/2<by+bh/2 && ay+ah/2>by-bh/2;
}
