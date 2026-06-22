// main.js
// Entry point. Boots PixiJS, loads assets, wires all modules, runs the loop.
// Game logic (state, input, entities, weapons) is UNCHANGED from the Canvas version.

import { GAME_W, GAME_H, phase, setPhase,
         resetScores, resetPlayer, resetHealth, resetBombs,
         resetEntities, resetBoss, setBossSpawned,
         stage, stageTimer, stageDuration,
         bossSpawned, bullets, eBullets, enemies,
         tickStage, resetSpawnTimer,
         selectedShip, weaponState, bombActive, bombTimer,
         pickups, invincible, player } from './core/state.js';

import { initInput, resetJoy, getMovement } from './core/input.js';
import { initResize }                        from './core/resize.js';
import { SHIPS }                             from './data/ships.js';

// ── PixiJS render layer ───────────────────────────────────────────
import { initPixiApp, renderFrame }          from './render/pixi/pixiApp.js';
import { loadAllAssets }                     from './render/pixi/assetLoader.js';
import { initBackground, updateBackground }  from './render/pixi/background.js';
import { initPlayerSprite, updatePlayerSprite,
         ensureEnemySprite, updateEnemySprite,
         removeEnemySprite, drawShipPreview } from './render/pixi/ships.js';
import { syncPlayerBullets, syncEnemyBullets,
         removePlayerBullet, removeEnemyBullet,
         clearAllBulletSprites }             from './render/pixi/bullets.js';
import { initEffectsLayer, spawnExplosion,
         spawnScorePopup, tickSparks, tickScorePopups,
         syncPickups, updateBombFlash, updateWeaponFlash,
         updateBossWarning, initBombFlash, initFlashText,
         initBossWarning, clearAllEffects,
         showStageBanner }                   from './render/pixi/effects.js';
import { updateHUD }                         from './render/pixi/hud.js';

// ── Game logic (unchanged) ────────────────────────────────────────
import { resetWeaponToShip }                        from './weapons/weaponManager.js';
import { tickBullets }                              from './weapons/index.js';
import { updatePlayer, checkPlayerHit,
         setBombDropHook }                           from './entities/player.js';
import { spawnEnemy, spawnBoss, updateEnemies,
         setEnemyDeathHook }                        from './entities/enemy.js';
import { updatePickups }                            from './entities/pickup.js';
import { initTitleScreen, showTitle, hideTitle }    from './screens/titleScreen.js';
import { initGameOverScreen, showGameOver }         from './screens/gameOverScreen.js';

// ═════════════════════════════════════════════════════════════════
//  BOOT
// ═════════════════════════════════════════════════════════════════
async function boot() {
  // 1. Init PixiJS — inserts its canvas replacing <canvas id="gameCanvas">
  const gameArea = document.getElementById('game-area');
  await initPixiApp(gameArea);

  // 2. Resize system (uses the Pixi canvas now in the DOM)
  const canvas = document.getElementById('gameCanvas');
  initResize(canvas);

  // 3. Load assets with progress bar
  const bar = document.getElementById('loading-bar');
  const pct = document.getElementById('loading-pct');
  await loadAllAssets(progress => {
    const p = Math.round(progress * 100);
    if (bar) bar.style.width = p + '%';
    if (pct) pct.textContent = p + '%';
  });

  // 4. Swap screens
  const loadScreen = document.getElementById('loading-screen');
  if (loadScreen) loadScreen.style.display = 'none';
  document.getElementById('shell').style.display = 'flex';

  // 5. Init Pixi effect layers
  initEffectsLayer();
  initBombFlash();
  initFlashText();
  initBossWarning();

  // 6. Wire bomb drop hook → Pixi sprite removal
  setBombDropHook((deadBullets, deadEnemies) => {
    deadBullets.forEach(b => removeEnemyBullet(b));
    deadEnemies.forEach(e => removeEnemySprite(e));
  });

  // Wire enemy death hook → Pixi explosions + score popups
  setEnemyDeathHook(e => {
    if (e.type === '_hit') {
      spawnExplosion(e.x, e.y, false);
    } else {
      spawnExplosion(e.x, e.y, e.type === 'boss');
      if (e.pts > 0) spawnScorePopup(e.x, e.y - 20, e.pts);
    }
    // Clean up the PixiJS sprite attached to this enemy
    removeEnemySprite(e);
  });

  // 7. Input
  initInput();

  // 8. Screens — pass PixiJS preview renderer to title screen
  initTitleScreen(() => startGame(), drawShipPreview);
  initGameOverScreen(
    () => startGame(),
    () => { showTitle(); setPhase('title'); resetJoy(); }
  );

  // 9. Start title background
  initBackground(1);
  updateHUD();

  // 10. Loop
  requestAnimationFrame(loop);
}

boot().catch(err => {
  console.error('Boot failed:', err);
  const ls = document.getElementById('loading-screen');
  if (ls) ls.style.display = 'none';
  document.getElementById('shell').style.display = 'flex';
});

// ═════════════════════════════════════════════════════════════════
//  GAME LIFECYCLE
// ═════════════════════════════════════════════════════════════════
function startGame() {
  resetScores();
  resetPlayer();
  resetHealth();
  resetBombs();
  resetEntities();
  resetBoss();
  setBossSpawned(false);
  resetSpawnTimer();
  clearAllBulletSprites(bullets, eBullets);
  clearAllEffects();

  const baseShot = SHIPS[selectedShip].baseShot;
  resetWeaponToShip(baseShot);

  initPlayerSprite(selectedShip);
  initBackground(stage);
  showStageBanner(stage);

  updateHUD();
  hideTitle();
  document.getElementById('screen-gameover').classList.add('hidden');
  setPhase('playing');
  _spawnTimerLocal = 0;
}

function triggerGameOver() {
  if (phase === 'gameover') return;   // guard double-trigger
  setPhase('gameover');
  resetJoy();
  showGameOver();
}

// ═════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═════════════════════════════════════════════════════════════════
let _spawnTimerLocal = 0;

function loop() {
  requestAnimationFrame(loop);

  if (phase === 'playing') {
    try { _update(); } catch (e) { console.error('[storm] _update error:', e); }
    _draw();
  } else {
    updateBackground(0.5);   // animate background on title/game-over
  }

  renderFrame();   // PixiJS renderer.render(stage)
}

// ═════════════════════════════════════════════════════════════════
//  UPDATE
// ═════════════════════════════════════════════════════════════════
function _update() {
  // Stage progression
  tickStage();
  if (!bossSpawned && stageTimer > stageDuration) {
    setBossSpawned(true);
    enemies.forEach(e => removeEnemySprite(e));
    enemies.length  = 0;
    eBullets.forEach(b => removeEnemyBullet(b));
    eBullets.length = 0;
    spawnBoss();
  }

  // Spawn regular enemies
  if (!bossSpawned) {
    _spawnTimerLocal++;
    const rate = Math.max(25, 65 - stage * 5);
    if (_spawnTimerLocal >= rate) {
      spawnEnemy();
      _spawnTimerLocal = 0;
    }
  }

  // Player movement + firing
  updatePlayer(triggerGameOver);
  checkPlayerHit(triggerGameOver);

  // Move player bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx; b.y += b.vy;
    const offscreen = b.y < -60 || b.y > GAME_H + 60 || b.x < -60 || b.x > GAME_W + 60;
    if (b.beam) {
      b.life--;
      if (b.life <= 0) { removePlayerBullet(b); bullets.splice(i, 1); }
    } else if (offscreen) {
      removePlayerBullet(b); bullets.splice(i, 1);
    }
  }
  tickBullets(bullets);

  // Move enemy bullets
  for (let i = eBullets.length - 1; i >= 0; i--) {
    const b = eBullets[i];
    b.x += b.vx; b.y += b.vy;
    if (b.y > GAME_H + 40 || b.x < -40 || b.x > GAME_W + 40) {
      removeEnemyBullet(b);
      eBullets.splice(i, 1);
    }
  }

  // Enemies (updateEnemies calls setEnemyDeathHook on deaths)
  updateEnemies(triggerGameOver);

  // Ensure new enemies have sprites
  enemies.forEach(e => ensureEnemySprite(e));

  // Pickups
  updatePickups();

  // Tick visual effects
  tickSparks();
  tickScorePopups();
}

// ═════════════════════════════════════════════════════════════════
//  DRAW  (sync Pixi sprite positions to game state every frame)
// ═════════════════════════════════════════════════════════════════
function _draw() {
  updateBackground(1.5);

  // Player
  const { dx } = getMovement();
  updatePlayerSprite(player.x, player.y, dx, invincible);

  // Enemies
  enemies.forEach(e => {
    ensureEnemySprite(e);
    updateEnemySprite(e);
  });

  // Bullets
  syncPlayerBullets(bullets);
  syncEnemyBullets(eBullets);

  // Pickups
  syncPickups(pickups);

  // Overlay effects
  updateBombFlash(bombActive, bombTimer);
  updateWeaponFlash(weaponState);
  updateBossWarning(enemies.find(e => e.type === 'boss') ?? null);

  // DOM HUD
  updateHUD();
}
