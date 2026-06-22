// render/ships.js
// Pure draw functions — no state mutation.
// drawShip(ctx, cx, cy, ship, scale)
// drawEnemy(ctx, enemy)
// drawShipPreview(canvas, ship)  — for title screen cards

// ── Player ships ──────────────────────────────────────────────────
export function drawShip(ctx, cx, cy, ship, sc = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  const col = ship.color, acc = ship.ac;

  if (ship.baseShot === 'twin') {
    // Delta-wing, nose UP
    ctx.beginPath();
    ctx.moveTo(0, -24); ctx.lineTo(-20, 8); ctx.lineTo(-8, 4);
    ctx.lineTo(0, 14);  ctx.lineTo(8, 4);  ctx.lineTo(20, 8);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(-5,-2); ctx.lineTo(0,6); ctx.lineTo(5,-2); ctx.closePath();
    ctx.fillStyle = acc; ctx.fill();
    ctx.fillStyle = '#ff8800'; ctx.fillRect(-14,8,9,6); ctx.fillRect(5,8,9,6);
    ctx.fillStyle = '#ffee00'; ctx.fillRect(-13,9,7,4); ctx.fillRect(6,9,7,4);
    ctx.fillStyle = '#aaddff'; ctx.fillRect(-24,2,5,3); ctx.fillRect(19,2,5,3);

  } else if (ship.baseShot === 'spread') {
    // Swept-wing fast fighter
    ctx.beginPath();
    ctx.moveTo(0,-26); ctx.lineTo(-24,12); ctx.lineTo(-5,6);
    ctx.lineTo(0,18);  ctx.lineTo(5,6);   ctx.lineTo(24,12);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(-5,2); ctx.lineTo(0,9); ctx.lineTo(5,2); ctx.closePath();
    ctx.fillStyle = acc; ctx.fill();
    ctx.fillStyle = '#ff4400'; ctx.fillRect(-11,10,22,6);
    ctx.fillStyle = '#ffaa00'; ctx.fillRect(-9,11,18,4);

  } else {
    // Heavy cruiser
    ctx.beginPath();
    ctx.moveTo(0,-22); ctx.lineTo(-14,2); ctx.lineTo(-22,14); ctx.lineTo(-8,10);
    ctx.lineTo(0,18);  ctx.lineTo(8,10);  ctx.lineTo(22,14);  ctx.lineTo(14,2);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(-7,5); ctx.lineTo(0,12); ctx.lineTo(7,5); ctx.closePath();
    ctx.fillStyle = acc; ctx.fill();
    for (let i = -14; i <= 14; i += 7) {
      ctx.fillStyle = '#aa00ff'; ctx.fillRect(i-3,12,6,7);
      ctx.fillStyle = '#dd88ff'; ctx.fillRect(i-2,13,4,5);
    }
  }
  ctx.restore();
}

// Engine flame below ship
export function drawFlame(ctx, px, py) {
  ctx.save();
  ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 16;
  const h = 6 + Math.random() * 8;
  ctx.fillStyle = 'rgba(255,150,0,0.85)'; ctx.fillRect(px - 4, py + 14, 8, h);
  ctx.fillStyle = 'rgba(255,220,80,0.6)'; ctx.fillRect(px - 2, py + 15, 4, h * 0.6);
  ctx.restore();
}

// ── Enemy ships ───────────────────────────────────────────────────
export function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.type === 'fighter') {
    ctx.beginPath();
    ctx.moveTo(0, 16); ctx.lineTo(-13,-10); ctx.lineTo(-5,-5);
    ctx.lineTo(0,-14); ctx.lineTo(5,-5);    ctx.lineTo(13,-10);
    ctx.closePath();
    ctx.fillStyle = e.color || '#cc2200'; ctx.fill();
    ctx.fillStyle = '#ff6600'; ctx.fillRect(-5,-5,10,4);

  } else if (e.type === 'bomber') {
    ctx.beginPath();
    ctx.moveTo(0,22); ctx.lineTo(-22,4); ctx.lineTo(-16,-10);
    ctx.lineTo(0,-16); ctx.lineTo(16,-10); ctx.lineTo(22,4);
    ctx.closePath();
    ctx.fillStyle = '#884400'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(-7,0); ctx.lineTo(0,7); ctx.lineTo(7,0); ctx.closePath();
    ctx.fillStyle = '#cc6600'; ctx.fill();

  } else if (e.type === 'gunship') {
    ctx.beginPath();
    ctx.moveTo(0,20); ctx.lineTo(-20,6); ctx.lineTo(-24,-6);
    ctx.lineTo(0,-20); ctx.lineTo(24,-6); ctx.lineTo(20,6);
    ctx.closePath();
    ctx.fillStyle = '#226600'; ctx.fill();
    ctx.fillStyle = '#44aa00'; ctx.fillRect(-9,-12,18,15);
    ctx.fillStyle = '#88ff44'; ctx.fillRect(-4,-16,8,7);

  } else if (e.type === 'boss') {
    ctx.scale(1.5, 1.5);
    ctx.beginPath();
    ctx.moveTo(0,-36); ctx.lineTo(-26,-18); ctx.lineTo(-38,0); ctx.lineTo(-30,18);
    ctx.lineTo(-14,26); ctx.lineTo(0,30);   ctx.lineTo(14,26); ctx.lineTo(30,18);
    ctx.lineTo(38,0);   ctx.lineTo(26,-18);
    ctx.closePath(); ctx.fillStyle = '#440033'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(-14,-8); ctx.lineTo(-18,8);
    ctx.lineTo(0,14); ctx.lineTo(18,8); ctx.lineTo(14,-8); ctx.closePath();
    ctx.fillStyle = '#880055'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,-2,10,0,Math.PI*2); ctx.fillStyle = '#ff0066'; ctx.fill();
    ctx.beginPath(); ctx.arc(-3,-5,4,0,Math.PI*2); ctx.fillStyle = '#ff88cc'; ctx.fill();
    ctx.fillStyle = '#cc0044'; ctx.fillRect(-36,-3,11,5); ctx.fillRect(25,-3,11,5);
    ctx.scale(1/1.5, 1/1.5);
    const bw = 80;
    ctx.fillStyle = '#220011'; ctx.fillRect(-bw/2, 44, bw, 8);
    ctx.fillStyle = '#ff0066'; ctx.fillRect(-bw/2, 44, bw*(e.hp/e.maxHp), 8);
    ctx.strokeStyle = '#880033'; ctx.lineWidth = 1; ctx.strokeRect(-bw/2, 44, bw, 8);
  }
  ctx.restore();
}

// ── Title screen preview ──────────────────────────────────────────
export function drawShipPreview(canvas, ship) {
  const c = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  c.fillStyle = '#030b18'; c.fillRect(0, 0, w, h);
  // Subtle grid
  c.strokeStyle = 'rgba(0,80,160,0.18)'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 10) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
  for (let y = 0; y < h; y += 10) { c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
  // Ship
  const sc = Math.min(w, h) / 68;
  const cx = w / 2, cy = h / 2 + 3;
  drawShip(c, cx, cy, ship, sc);
  // Flame
  c.save();
  c.shadowColor = '#ff8800'; c.shadowBlur = 8;
  const fy = cy + 14 * sc;
  c.fillStyle = 'rgba(255,150,0,0.9)';
  c.fillRect(cx - 3 * sc, fy, 6 * sc, 7 * sc);
  c.fillStyle = 'rgba(255,230,80,0.7)';
  c.fillRect(cx - 1.5 * sc, fy + 1, 3 * sc, 4 * sc);
  c.restore();
}
