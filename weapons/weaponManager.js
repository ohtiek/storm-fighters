// weapons/weaponManager.js
// Manages the branching weapon tree.
//
// Upgrade flow:
//   Level 1 (no branch) → collect any W bubble → Level 2, choose branch A or B
//   Level 2 branch A    → collect gold bubble  → Level 3 (max, same branch)
//   Level 2 branch B    → collect cyan bubble  → Level 3 (max, same branch)
//   Level 3             → collect any W bubble → cycle to next weapon, reset to Level 1
//
// Pickup types that drive this:
//   { type:'weapon', branch:'A' }  — gold bubble  (power path)
//   { type:'weapon', branch:'B' }  — cyan bubble  (utility path)

import * as S from '../core/state.js';
import { WEAPONS, WEAPON_CYCLE } from '../data/weapons.js';

export function currentWeapon() {
  return WEAPONS[S.weaponState.index];
}

export function currentBranchData() {
  const w = currentWeapon();
  if (S.weaponState.branch) return w.branches[S.weaponState.branch];
  return null;
}

/** Called when the player collects a weapon bubble.
 *  @param {string|null} branch  'A', 'B', or null (legacy single-type bubble)
 */
export function collectWeaponBubble(branch = null) {
  const ws = S.weaponState;
  const w  = currentWeapon();

  if (ws.level === 1) {
    // Advance to level 2, lock in branch choice
    ws.level  = 2;
    ws.branch = branch ?? 'A';  // default to A if no branch on bubble

  } else if (ws.level === 2) {
    // Only upgrade further if matching the already-chosen branch
    if (branch === null || branch === ws.branch) {
      ws.level = 3;
    } else {
      // Wrong branch bubble at level 2 — switch branch but stay at level 2
      ws.branch = branch;
    }

  } else {
    // Level 3 — cycle to next weapon
    const nextId    = WEAPON_CYCLE[(WEAPON_CYCLE.indexOf(w.id) + 1) % WEAPON_CYCLE.length];
    ws.index  = WEAPONS.findIndex(x => x.id === nextId);
    ws.level  = 1;
    ws.branch = null;
  }

  // Flash label
  const newW    = currentWeapon();
  const newBranch = ws.branch ? newW.branches[ws.branch] : null;
  ws.flashLabel = `${newBranch ? newBranch.label : newW.label} LV${ws.level}`;
  ws.flashTimer = 90;
}

/** Reset weapon to ship's default on new game. */
export function resetWeaponToShip(baseShot) {
  const idx = WEAPONS.findIndex(w => w.id === baseShot);
  S.resetWeapon(idx >= 0 ? idx : 0);
}

/** Effective fire-rate modifier combining base weapon fmod + branch bonus */
export function getFireMod() {
  const w = currentWeapon();
  // Branch A is power path (slightly faster); Branch B is utility (slightly slower but more coverage)
  const branchMod = S.weaponState.branch === 'A' ? 1.1 : S.weaponState.branch === 'B' ? 0.95 : 1.0;
  return w.fmod * branchMod;
}
