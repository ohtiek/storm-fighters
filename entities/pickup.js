// entities/pickup.js
import * as S from '../core/state.js';
import { collectWeaponBubble } from '../weapons/weaponManager.js';

function _overlap(ax,ay,aw,ah,bx,by,bw,bh) {
  return ax-aw/2<bx+bw/2 && ax+aw/2>bx-bw/2 && ay-ah/2<by+bh/2 && ay+ah/2>by-bh/2;
}

export function updatePickups() {
  for (let i = S.pickups.length - 1; i >= 0; i--) {
    const p = S.pickups[i];
    p.y  += p.vy;
    p.age++;

    if (_overlap(S.player.x, S.player.y, 24, 24, p.x, p.y, 22, 22)) {
      if (p.type === 'weapon') {
        collectWeaponBubble(p.branch ?? null);
      } else if (p.type === 'bomb') {
        S.addBomb();
      } else if (p.type === 'health') {
        S.setHealth(S.health + 35);
      }
      S.pickups.splice(i, 1);
      continue;
    }

    if (p.y > S.GAME_H + 20) S.pickups.splice(i, 1);
  }
}
