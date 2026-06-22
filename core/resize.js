// core/resize.js
// Scales the canvas and all overlays to fit any screen size.

import { GAME_W, GAME_H } from './state.js';

const CTRL_H = 140;

export function initResize(canvas) {
  _doResize(canvas);
  window.addEventListener('resize', () => _doResize(canvas));
}

function _doResize(canvas) {
  const sw = window.innerWidth, sh = window.innerHeight;
  const availH = sh - CTRL_H;
  const scale  = Math.min(sw / GAME_W, availH / GAME_H);
  const cw = Math.floor(GAME_W * scale);
  const ch = Math.floor(GAME_H * scale);

  canvas.style.width  = cw + 'px';
  canvas.style.height = ch + 'px';

  const gameArea = document.getElementById('game-area');
  gameArea.style.width  = cw + 'px';
  gameArea.style.height = ch + 'px';

  document.getElementById('controls').style.width = cw + 'px';

  const hudOvl = document.getElementById('hud-overlay');
  hudOvl.style.width  = cw + 'px';
  hudOvl.style.height = ch + 'px';
  hudOvl.style.fontSize = Math.max(0.55, scale) * 10 + 'px';

  ['screen-title', 'screen-gameover'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.width = cw + 'px'; el.style.height = ch + 'px'; }
  });

  const jSize = Math.round(Math.min(cw * 0.30, 120));
  const jz    = document.getElementById('joystick-zone');
  if (jz) { jz.style.width = jz.style.height = jSize + 'px'; }
  const knob = document.getElementById('joystick-knob');
  if (knob) { knob.style.width = knob.style.height = Math.round(jSize * 0.42) + 'px'; }

  const btnFire = document.getElementById('btn-fire');
  const btnBomb = document.getElementById('btn-bomb');
  if (btnFire) { btnFire.style.width = btnFire.style.height = Math.round(jSize * 0.62) + 'px'; }
  if (btnBomb) { btnBomb.style.width = btnBomb.style.height = Math.round(jSize * 0.47) + 'px'; }

  const titleText = document.getElementById('title-text');
  if (titleText) { titleText.style.fontSize = Math.round(cw * 0.087) + 'px'; }
}
