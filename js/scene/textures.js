/*
 * Procedural Texture Generators
 * Canvas-based textures for casino elements (Blackjack felt, roulette wheel, etc)
 * Demonstrates canvas rendering + Three.js texture mapping (ICG_02 concepts)
 */

/**
 * Generates carpet/rug texture with diamond pattern
 * Used for casino floor
 */
function mkCarpetTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');

  x.fillStyle = '#6a0a0a';
  x.fillRect(0, 0, 512, 512);

  // Diamond grid pattern
  x.strokeStyle = 'rgba(212,175,55,0.35)';
  x.lineWidth = 1;
  for (let r = 0; r < 512; r += 32) {
    for (let cl = 0; cl < 512; cl += 32) {
      x.beginPath();
      x.moveTo(cl + 16, r);
      x.lineTo(cl + 32, r + 16);
      x.lineTo(cl + 16, r + 32);
      x.lineTo(cl, r + 16);
      x.closePath();
      x.stroke();
    }
  }

  // Center dots
  x.fillStyle = 'rgba(180,130,0,0.18)';
  for (let r = 16; r < 512; r += 64) {
    for (let cl = 16; cl < 512; cl += 64) {
      x.beginPath();
      x.arc(cl, r, 5, 0, Math.PI * 2);
      x.fill();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

/**
 * Generates damask-style wall texture
 */
function mkWallTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');

  x.fillStyle = '#28180a';
  x.fillRect(0, 0, 512, 512);

  x.strokeStyle = 'rgba(212,175,55,0.12)';
  x.lineWidth = 1;
  for (let r = 0; r < 512; r += 64) {
    for (let cl = 0; cl < 512; cl += 64) {
      x.strokeRect(cl + 5, r + 5, 54, 54);
      x.beginPath();
      x.moveTo(cl + 32, r + 8);
      x.lineTo(cl + 56, r + 32);
      x.lineTo(cl + 32, r + 56);
      x.lineTo(cl + 8, r + 32);
      x.closePath();
      x.stroke();
      x.beginPath();
      x.arc(cl + 32, r + 32, 6, 0, Math.PI * 2);
      x.stroke();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1.5);
  return t;
}

/**
 * Generates roulette wheel texture with numbered sectors
 * 37 numbers (0-36) with appropriate red/black coloring
 */
function mkWheelTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');

  const cx = 256, cy = 256, r = 250;
  // European roulette wheel number sequence
  const order = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const seg = (Math.PI * 2) / 37;

  order.forEach((n, i) => {
    const a0 = i * seg - Math.PI / 2;
    const a1 = a0 + seg;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = n === 0 ? '#1a6b1a' : reds.has(n) ? '#8b1a1a' : '#111';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,175,55,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Number labels
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a0 + seg / 2);
    ctx.translate(r * 0.72, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n, 0, 5);
    ctx.restore();
  });

  // Center hub gradient
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 75);
  g.addColorStop(0, '#d4af37');
  g.addColorStop(0.5, '#8a6020');
  g.addColorStop(1, '#2a1804');
  ctx.beginPath();
  ctx.arc(cx, cy, 75, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  return new THREE.CanvasTexture(c);
}

/**
 * Generates Blackjack felt texture with layout markings
 */
function mkBJFeltTex() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const x = c.getContext('2d');

  x.fillStyle = '#1a5c28';
  x.fillRect(0, 0, 512, 256);

  x.strokeStyle = 'rgba(212,175,55,0.5)';
  x.lineWidth = 2;
  // Semi-circle arc
  x.beginPath();
  x.arc(256, 220, 180, Math.PI, 0);
  x.stroke();

  // Labels
  x.fillStyle = 'rgba(212,175,55,0.5)';
  x.font = 'bold 22px Georgia,serif';
  x.textAlign = 'center';
  x.fillText('DEALER', 256, 50);
  x.font = '14px Georgia';
  x.fillText('BLACKJACK PAYS 3 TO 2', 256, 80);

  // Player spots
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + ((i / 6) * Math.PI);
    const px = 256 + Math.cos(a) * 150;
    const py = 220 + Math.sin(a) * 150;
    x.beginPath();
    x.arc(px, py, 18, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(212,175,55,0.4)';
    x.stroke();
  }

  return new THREE.CanvasTexture(c);
}

/**
 * Generates roulette betting grid texture
 * Shows number grid and betting regions
 */
function mkBetGridTex() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const x = c.getContext('2d');

  x.fillStyle = '#1a5c28';
  x.fillRect(0, 0, 512, 256);

  const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const cw = 38, ch = 66;

  // 3 rows × 12 cols = 36 numbers
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const n = col * 3 + (2 - row) + 1;
      const nx = 35 + col * cw;
      const ny = 10 + row * ch;

      x.fillStyle = reds.has(n) ? '#7a1515' : '#181818';
      x.fillRect(nx, ny, cw - 2, ch - 2);
      x.strokeStyle = 'rgba(212,175,55,0.5)';
      x.lineWidth = 1;
      x.strokeRect(nx, ny, cw - 2, ch - 2);
      x.fillStyle = '#fff';
      x.font = 'bold 12px sans-serif';
      x.textAlign = 'center';
      x.fillText(n, nx + (cw - 2) / 2, ny + (ch - 2) / 2 + 5);
    }
  }

  // Green 0 column
  x.fillStyle = '#1a6b1a';
  x.fillRect(3, 10, 28, 196);
  x.strokeStyle = 'rgba(212,175,55,0.5)';
  x.strokeRect(3, 10, 28, 196);
  x.fillStyle = '#fff';
  x.save();
  x.translate(17, 108);
  x.rotate(-Math.PI / 2);
  x.font = 'bold 13px sans-serif';
  x.textAlign = 'center';
  x.fillText('0', 0, 4);
  x.restore();

  return new THREE.CanvasTexture(c);
}

/**
 * Generates Texas Hold'em community cards area texture
 */
function mkPokerCenterTex() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const x = c.getContext('2d');

  x.fillStyle = '#0d4a24';
  x.fillRect(0, 0, 256, 64);

  x.strokeStyle = 'rgba(212,175,55,0.4)';
  x.lineWidth = 1;
  x.strokeRect(4, 4, 248, 56);

  x.fillStyle = 'rgba(212,175,55,0.45)';
  x.font = '12px Georgia';
  x.textAlign = 'center';
  x.fillText('COMMUNITY CARDS', 128, 38);

  return new THREE.CanvasTexture(c);
}

/**
 * Generates table sign texture with labels
 */
function mkSignTex(l1, l2) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 68;
  const x = c.getContext('2d');

  x.fillStyle = 'rgba(0,0,0,0.88)';
  x.fillRect(0, 0, 256, 68);

  x.strokeStyle = '#d4af37';
  x.lineWidth = 1.5;
  x.strokeRect(2, 2, 252, 64);

  x.fillStyle = '#d4af37';
  x.font = 'bold 20px Georgia,serif';
  x.textAlign = 'center';
  x.fillText(l1, 128, 28);

  x.font = '13px Georgia';
  x.fillStyle = '#c0a060';
  x.fillText(l2, 128, 50);

  return new THREE.CanvasTexture(c);
}

/**
 * Generates card face texture with suit and value
 */
function mkCardFaceTex(val, suit) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 180;
  const x = c.getContext('2d');

  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 128, 180);

  x.strokeStyle = '#ddd';
  x.lineWidth = 1;
  x.strokeRect(1, 1, 126, 178);

  const red = ['♥', '♦'].includes(suit);
  x.fillStyle = red ? '#cc0000' : '#000';

  x.font = 'bold 20px Georgia';
  x.textAlign = 'left';
  x.fillText(val, 8, 28);

  x.font = '16px Georgia';
  x.fillText(suit, 10, 48);

  x.font = '52px Georgia';
  x.textAlign = 'center';
  x.fillText(suit, 64, 110);

  // Rotated bottom corner
  x.save();
  x.translate(128, 180);
  x.rotate(Math.PI);
  x.font = 'bold 20px Georgia';
  x.textAlign = 'left';
  x.fillText(val, 8, 28);
  x.font = '16px Georgia';
  x.fillText(suit, 10, 48);
  x.restore();

  return new THREE.CanvasTexture(c);
}

/**
 * Generates card back texture with pattern
 */
function mkCardBackTex() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 180;
  const x = c.getContext('2d');

  x.fillStyle = '#1a3a8a';
  x.fillRect(0, 0, 128, 180);

  x.strokeStyle = 'rgba(255,255,255,0.12)';
  x.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    x.beginPath();
    x.moveTo(i * 8, 0);
    x.lineTo(0, i * 8);
    x.stroke();

    x.beginPath();
    x.moveTo(128 - i * 8, 0);
    x.lineTo(128, i * 8);
    x.stroke();
  }

  x.strokeStyle = 'rgba(212,175,55,0.55)';
  x.lineWidth = 2;
  x.strokeRect(5, 5, 118, 170);
  x.strokeRect(10, 10, 108, 160);

  return new THREE.CanvasTexture(c);
}
