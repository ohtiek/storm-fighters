// entities/player.js
import * as S from '../core/state.js';
import { getMovement, isFiring, isBombing } from '../core/input.js';
import { SHIPS } from '../data/ships.js';
import { WEAPONS } from '../data/weapons.js';
import { fireWeapon } from '../weapons/index.js';
import { getFireMod } from '../weapons/weaponManager.js';
import { spawnExplosion } from '../render/effects.js';

let fireTimer = 0;
let bombWasDown = false;
let _onBombDrop = null;

export function setBombDropHook(fn) { _onBombDrop = fn; }

export function updatePlayer(gameOver) {
  const ship = SHIPS[S.selectedShip];
  const { dx, dy } = getMovement();

  S.player.x = Math.max(16, Math.min(S.GAME_W - 16, S.player.x + dx * ship.speed));
  S.player.y = Math.max(16, Math.min(S.GAME_H - 40, S.player.y + dy * ship.speed));

  // Fire
  fireTimer++;
  const fmod = getFireMod();
  const rate = Math.round(ship.fireRate / fmod);
  if (isFiring() && fireTimer >= rate) {
    const ws  = S.weaponState;
    const wid = WEAPONS[ws.index].id;
    fireWeapon(wid, S.player.x, S.player.y, ws.level, ws.branch, S.bullets, S.enemies);
    fireTimer = 0;
  }

  // Bomb — edge trigger (press, not hold)
  const bombing = isBombing();
  if (bombing && !bombWasDown) _dropBomb();
  bombWasDown = bombing;

  S.tickBomb();
  S.tickInvincible();
  if (S.weaponState.flashTimer > 0) S.weaponState.flashTimer--;
}

function _dropBomb() {
  if (!S.useBomb()) return;
  S.enemies.forEach(e => {
    e.hp -= 50;
    spawnExplosion(e.x, e.y, 15, ['#ff6600','#ffaa00','#ffffff']);
  });
  const dead = S.enemies.filter(e => e.hp <= 0);
  // Notify render layer to remove sprites BEFORE modifying arrays
  _onBombDrop?.(S.eBullets, dead);
  // Mutate in-place to keep live ES module bindings valid
  S.eBullets.length = 0;
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    if (S.enemies[i].hp <= 0) S.enemies.splice(i, 1);
  }
}

export function checkPlayerHit(gameOver) {
  if (S.invincible) return;
  S.eBullets.forEach(b => {
    if (_overlap(S.player.x, S.player.y, 14, 14, b.x, b.y, b.w||5, b.h||5)) {
      S.setHealth(S.health - (b.dmg || 10));
      S.setInvincible(60);
      spawnExplosion(S.player.x, S.player.y, 10, ['#ff4400','#ff8800','#ffffff']);
      b._dead = true;
      if (S.health <= 0) gameOver();
    }
  });
  S.eBullets = S.eBullets.filter(b => !b._dead);
}

function _overlap(ax,ay,aw,ah,bx,by,bw,bh) {
  return ax-aw/2<bx+bw/2 && ax+aw/2>bx-bw/2 && ay-ah/2<by+bh/2 && ay+ah/2>by-bh/2;
}
