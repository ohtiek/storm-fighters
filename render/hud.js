// render/hud.js
// Updates the DOM HUD elements. Called once per frame during gameplay.

import * as S from '../core/state.js';
import { WEAPONS } from '../data/weapons.js';

export function updateHUD() {
  document.getElementById('hv-score').textContent = S.score.toString().padStart(8,'0');
  document.getElementById('hv-hi').textContent    = S.hiScore.toString().padStart(8,'0');
  document.getElementById('hv-stage').textContent = S.stage;
  document.getElementById('hb-hp').style.width    = (S.health / S.maxHealth * 100) + '%';

  const w      = WEAPONS[S.weaponState.index];
  const branch = S.weaponState.branch;
  const color  = branch ? w.branches[branch].color : w.color;
  const label  = branch ? w.branches[branch].label : w.label;

  const pw = document.getElementById('hb-pw');
  pw.style.background = `linear-gradient(90deg,${color}88,${color})`;
  pw.style.boxShadow  = `0 0 5px ${color}`;
  pw.style.width      = ((S.weaponState.level / 3) * 100) + '%';

  const badge = document.getElementById('wmode-badge');
  const stars = S.weaponState.level > 1 ? '★'.repeat(S.weaponState.level - 1) : '';
  badge.textContent       = `${label} ${stars}`;
  badge.style.color       = color;
  badge.style.borderColor = color;
  badge.style.textShadow  = `0 0 6px ${color}`;

  const bp = document.getElementById('bomb-pips');
  bp.innerHTML = '';
  for (let i = 0; i < S.maxBombs; i++) {
    const d = document.createElement('div');
    d.className = 'bp' + (i >= S.bombs ? ' empty' : '');
    bp.appendChild(d);
  }
}
