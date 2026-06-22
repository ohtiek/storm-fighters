// core/input.js
// Abstracts keyboard, virtual joystick, and touch buttons.
// Game logic never accesses DOM events directly — it calls getMovement(), isFiring(), etc.

const keys    = {};
const joy     = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
let autofire  = false;
let bombPress = false;

// ── Joystick ─────────────────────────────────────────────────────
let jZone, jKnob;

export function initInput() {
  jZone = document.getElementById('joystick-zone');
  jKnob = document.getElementById('joystick-knob');

  jZone.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; joy.id = t.identifier; _joyStart(t.clientX, t.clientY); }, { passive: false });
  jZone.addEventListener('touchmove',  e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joy.id) _joyMove(t.clientX, t.clientY); }, { passive: false });
  jZone.addEventListener('touchend',   e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joy.id) _joyEnd(); }, { passive: false });
  jZone.addEventListener('touchcancel',() => _joyEnd(), { passive: false });

  const btnFire = document.getElementById('btn-fire');
  const btnBomb = document.getElementById('btn-bomb');
  btnFire.addEventListener('touchstart', e => { e.preventDefault(); autofire = true;  }, { passive: false });
  btnFire.addEventListener('touchend',   e => { e.preventDefault(); autofire = false; }, { passive: false });
  btnFire.addEventListener('touchcancel',() => { autofire = false; }, { passive: false });
  btnBomb.addEventListener('touchstart', e => { e.preventDefault(); bombPress = true; }, { passive: false });
  btnBomb.addEventListener('touchend',   e => { e.preventDefault(); bombPress = false; }, { passive: false });

  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ') e.preventDefault();
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });
}

function _joyStart(cx, cy) {
  joy.ox = cx; joy.oy = cy; joy.active = true;
  _joyMove(cx, cy);
}

function _joyMove(cx, cy) {
  if (!joy.active) return;
  const jr   = jZone.getBoundingClientRect();
  const maxR = jr.width / 2;
  const dx   = cx - joy.ox, dy = cy - joy.oy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const cDist = Math.min(dist, maxR);
  const angle = Math.atan2(dy, dx);
  const ks = jKnob.offsetWidth / 2;
  jKnob.style.left = (maxR + Math.cos(angle) * cDist - ks) + 'px';
  jKnob.style.top  = (maxR + Math.sin(angle) * cDist - ks) + 'px';
  const DEAD = 0.06, norm = Math.min(dist / maxR, 1);
  if (norm < DEAD) { joy.dx = 0; joy.dy = 0; return; }
  const curved = Math.pow((norm - DEAD) / (1 - DEAD), 1.4);
  joy.dx = Math.cos(angle) * curved;
  joy.dy = Math.sin(angle) * curved;
}

function _joyEnd() {
  joy.active = false; joy.dx = 0; joy.dy = 0;
  const jr = jZone.getBoundingClientRect();
  const ks = jKnob.offsetWidth / 2;
  jKnob.style.left = (jr.width / 2 - ks) + 'px';
  jKnob.style.top  = (jr.height / 2 - ks) + 'px';
}

export function resetJoy() { _joyEnd(); autofire = false; bombPress = false; }

// ── Public API ───────────────────────────────────────────────────

/** Returns normalised dx/dy in range -1..1 */
export function getMovement() {
  let dx = joy.active ? joy.dx : 0;
  let dy = joy.active ? joy.dy : 0;
  if (keys['ArrowLeft']  || keys['a']) dx = -1;
  if (keys['ArrowRight'] || keys['d']) dx =  1;
  if (keys['ArrowUp']    || keys['w']) dy = -1;
  if (keys['ArrowDown']  || keys['s']) dy =  1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 1) { dx /= len; dy /= len; }
  return { dx, dy };
}

export function isFiring()  { return autofire || !!keys[' '] || !!keys['z']; }
export function isBombing() {
  const b = bombPress || !!keys['x'] || !!keys['X'] || !!keys['Shift'];
  return b;
}
