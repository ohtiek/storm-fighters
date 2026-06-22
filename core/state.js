// core/state.js
// Single source of truth. Every module imports from here.
// Nothing except initGame() should reset these — mutations happen in-place.

export const GAME_W = 390;
export const GAME_H = 700;

// ── Phase ────────────────────────────────────────────────────────
// 'title' | 'playing' | 'gameover'
export let phase = 'title';
export function setPhase(p) { phase = p; }

// ── Scores & progression ─────────────────────────────────────────
export let score    = 0;
export let hiScore  = 0;
export let kills    = 0;
export let stage    = 1;
export let stageTimer    = 0;
export const stageDuration = 1800;  // frames per stage before boss

export function addScore(n)   { score += n; if (score > hiScore) hiScore = score; }
export function addKill()     { kills++; }
export function tickStage()   { stageTimer++; }
export function nextStage()   { stage++; stageTimer = 0; }
export function resetScores() { score = 0; kills = 0; stage = 1; stageTimer = 0; }

// ── Player ───────────────────────────────────────────────────────
export const player = { x: GAME_W / 2, y: GAME_H - 100, w: 28, h: 28 };
export function resetPlayer() {
  player.x = GAME_W / 2;
  player.y = GAME_H - 100;
}

export let health     = 100;
export let maxHealth  = 100;
export let invincible = 0;
export function setHealth(v)     { health = Math.max(0, Math.min(maxHealth, v)); }
export function tickInvincible() { if (invincible > 0) invincible--; }
export function setInvincible(v) { invincible = v; }
export function resetHealth()    { health = maxHealth; invincible = 0; }

// ── Bombs ────────────────────────────────────────────────────────
export let bombs       = 3;
export let maxBombs    = 5;
export let bombActive  = false;
export let bombTimer   = 0;
export function useBomb()   { if (bombs > 0 && !bombActive) { bombs--; bombActive = true; bombTimer = 60; return true; } return false; }
export function tickBomb()  { if (bombActive) { bombTimer--; if (bombTimer <= 0) bombActive = false; } }
export function addBomb()   { if (bombs < maxBombs) bombs++; }
export function resetBombs(){ bombs = 3; bombActive = false; bombTimer = 0; }

// ── Weapon state ─────────────────────────────────────────────────
// branch: null (lv1, no branch yet) | 'A' | 'B'
export const weaponState = { index: 0, level: 1, branch: null, flashTimer: 0, flashLabel: '' };
export function resetWeapon(startIndex = 0) {
  weaponState.index  = startIndex;
  weaponState.level  = 1;
  weaponState.branch = null;
  weaponState.flashTimer = 0;
  weaponState.flashLabel = '';
}

// ── Boss ─────────────────────────────────────────────────────────
export let bossSpawned = false;
export let bossActive  = false;
export let boss        = null;
export function setBoss(b)         { boss = b; bossActive = b !== null; }
export function setBossSpawned(v)  { bossSpawned = v; }
export function resetBoss()        { boss = null; bossActive = false; bossSpawned = false; }

// ── Entity arrays ────────────────────────────────────────────────
export let bullets    = [];
export let eBullets   = [];
export let enemies    = [];
export let particles  = [];
export let pickups    = [];

export function resetEntities() {
  bullets   = [];
  eBullets  = [];
  enemies   = [];
  particles = [];
  pickups   = [];
}

export function filterBullets(fn)  { bullets  = bullets.filter(fn);  }
export function filterEBullets(fn) { eBullets = eBullets.filter(fn); }
export function clearEBullets()    { eBullets = []; }
export function filterEnemies(fn)  { enemies  = enemies.filter(fn);  }

// ── Selected ship ────────────────────────────────────────────────
export let selectedShip = 0;
export function setSelectedShip(i) { selectedShip = i; }

// ── Timers ───────────────────────────────────────────────────────
export let spawnTimer = 0;
export let fireTimer  = 0;
export function tickSpawn()       { spawnTimer++; }
export function resetSpawnTimer() { spawnTimer = 0; }
export function tickFire()        { fireTimer++; }
export function resetFireTimer()  { fireTimer = 0; }
