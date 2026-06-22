// screens/titleScreen.js
// Accepts an optional drawPreviewFn so PixiJS version can supply its own renderer.

import { SHIPS } from '../data/ships.js';
import * as S from '../core/state.js';

let _onStart      = null;
let _drawPreview  = null;   // (canvas, ship) => void

export function initTitleScreen(onStart, drawPreviewFn) {
  _onStart     = onStart;
  _drawPreview = drawPreviewFn ?? _defaultDrawPreview;
  _buildShipCards();

  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('screen-title').classList.add('hidden');
    _onStart();
  });
}

export function showTitle() {
  document.getElementById('screen-title').classList.remove('hidden');
}

export function hideTitle() {
  document.getElementById('screen-title').classList.add('hidden');
}

function _buildShipCards() {
  const row = document.getElementById('ship-row');
  // Guard — cards already built on hot-reload
  if (row.children.length > 0) return;

  const previews = [];

  SHIPS.forEach((ship, i) => {
    const card = document.createElement('div');
    card.className = 'ship-card' + (i === 0 ? ' selected' : '');

    const cv = document.createElement('canvas');
    cv.width = 80; cv.height = 80;
    cv.style.display = 'block';
    cv.style.margin  = '0 auto 6px';
    card.appendChild(cv);
    previews.push({ cv, ship });

    const nameEl = document.createElement('div');
    nameEl.className = 'ship-name';
    nameEl.textContent = ship.name;
    card.appendChild(nameEl);

    const statEl = document.createElement('div');
    statEl.className = 'ship-stat';
    statEl.textContent = ship.desc;
    card.appendChild(statEl);

    card.addEventListener('click', () => {
      document.querySelectorAll('.ship-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      S.setSelectedShip(i);
    });

    row.appendChild(card);
  });

  // Draw previews after first paint — canvases need to be in DOM
  requestAnimationFrame(() => {
    previews.forEach(({ cv, ship }) => _drawPreview(cv, ship));
  });
}

// ── Default Canvas 2D fallback preview ────────────────────────────
function _defaultDrawPreview(cv, ship) {
  const c = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  c.fillStyle = '#030b18'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(0,80,160,0.18)'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 10) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
  for (let y = 0; y < h; y += 10) { c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }

  const sc = Math.min(w, h) / 68;
  const cx = w / 2, cy = h / 2 + 3;
  c.save(); c.translate(cx, cy); c.scale(sc, sc);
  c.shadowColor = ship.color; c.shadowBlur = 18;

  if (ship.baseShot === 'twin') {
    c.beginPath(); c.moveTo(0,-24); c.lineTo(-20,8); c.lineTo(-8,4); c.lineTo(0,14); c.lineTo(8,4); c.lineTo(20,8); c.closePath();
    c.fillStyle = ship.color; c.fill();
    c.beginPath(); c.moveTo(0,-18); c.lineTo(-5,-2); c.lineTo(0,6); c.lineTo(5,-2); c.closePath();
    c.fillStyle = ship.ac; c.fill();
    c.fillStyle = '#ff8800'; c.fillRect(-14,8,9,6); c.fillRect(5,8,9,6);
  } else if (ship.baseShot === 'spread') {
    c.beginPath(); c.moveTo(0,-26); c.lineTo(-24,12); c.lineTo(-5,6); c.lineTo(0,18); c.lineTo(5,6); c.lineTo(24,12); c.closePath();
    c.fillStyle = ship.color; c.fill();
    c.beginPath(); c.moveTo(0,-18); c.lineTo(-5,2); c.lineTo(0,9); c.lineTo(5,2); c.closePath();
    c.fillStyle = ship.ac; c.fill();
    c.fillStyle = '#ff4400'; c.fillRect(-11,10,22,6);
  } else {
    c.beginPath(); c.moveTo(0,-22); c.lineTo(-14,2); c.lineTo(-22,14); c.lineTo(-8,10); c.lineTo(0,18); c.lineTo(8,10); c.lineTo(22,14); c.lineTo(14,2); c.closePath();
    c.fillStyle = ship.color; c.fill();
    c.beginPath(); c.moveTo(0,-14); c.lineTo(-7,5); c.lineTo(0,12); c.lineTo(7,5); c.closePath();
    c.fillStyle = ship.ac; c.fill();
  }
  c.restore();

  c.save(); c.shadowColor = '#ff8800'; c.shadowBlur = 8;
  const fy = cy + 14 * sc;
  c.fillStyle = 'rgba(255,150,0,0.9)'; c.fillRect(cx - 3*sc, fy, 6*sc, 7*sc);
  c.restore();
}
