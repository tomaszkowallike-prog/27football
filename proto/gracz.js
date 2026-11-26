// Generator of 8-bit footballers: every player gets a random face, skin, hair and boots,
// the team gives the kit. Each pose is drawn once, pixel by pixel, into a small canvas and cached.
(() => {
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const SKIN = ['#f7d3b4', '#eebd96', '#dba476', '#c08656', '#9a6440', '#74462a', '#55311d'];
  const HAIR = ['#17110d', '#2c1a10', '#4a2a14', '#6e4220', '#a0662c', '#d4a038', '#ecd068', '#b8461c', '#e0e0d8', '#5a5a64'];
  const STYLES = ['short', 'short', 'spiky', 'afro', 'long', 'mohawk', 'bald', 'bun', 'fringe', 'curly', 'buzz', 'side'];
  const BOOTS = ['#141414', '#f4f4f4', '#e8361f', '#2a6ae8', '#ffd21a', '#ff8a1a', '#3ae86a', '#e83ac8', '#30e0e8'];
  const KITS = [
    ['#e8361f', '#ffffff'], ['#2a6ae8', '#ffffff'], ['#ffd21a', '#1a7a3a'], ['#f4f4f4', '#141414'], ['#141414', '#e8361f'],
    ['#ff8a1a', '#141414'], ['#7a2ad0', '#ffd21a'], ['#5ac8ff', '#ffffff'], ['#8a1a2a', '#3ac8e8'], ['#1a7a3a', '#ffffff'],
    ['#e83a8a', '#141414'], ['#1a2a6a', '#e8361f'], ['#c8c8c8', '#2a6ae8'], ['#3ae86a', '#141414']];
  const PATTERNS = ['plain', 'plain', 'stripes', 'hoops', 'sash', 'half', 'sleeves'];
  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
    5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111' };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const hueOf = (hex) => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: h * 60, s: mx ? d / mx : 0, v: mx }; };
  const clash = (a, b) => { const A = hueOf(a), B = hueOf(b); if (A.s < 0.25 || B.s < 0.25) return Math.abs(A.v - B.v) < 0.35 && Math.abs(A.s - B.s) < 0.3;
    const dh = Math.min(Math.abs(A.h - B.h), 360 - Math.abs(A.h - B.h)); return dh < 50; };

  // a team kit: shirt, trim, shorts, socks, pattern; a different one if it would clash with `avoid`
  const kit = (avoid) => { let k; for (let i = 0; i < 40; i++) { k = rnd(KITS); if (!avoid || !clash(k[0], avoid.shirt)) break; }
    const shorts = Math.random() < 0.5 ? k[1] : Math.random() < 0.5 ? '#141414' : '#f4f4f4';
    return { shirt: k[0], trim: k[1], shorts, socks: Math.random() < 0.6 ? k[0] : k[1], pat: rnd(PATTERNS) }; };
  const gkKit = (avoid) => { const opts = [['#ffd21a', '#141414'], ['#3ae86a', '#141414'], ['#e83ac8', '#141414'], ['#ff8a1a', '#141414'], ['#5a5a64', '#ffd21a']];
    let k = opts[0]; for (const o of opts.sort(() => Math.random() - 0.5)) if (!avoid.some((a) => clash(o[0], a))) { k = o; break; }
    return { shirt: k[0], trim: k[1], shorts: '#141414', socks: k[0], pat: 'plain', gloves: '#f4f4f4' }; };
  const look = () => ({ skin: rnd(SKIN), hair: rnd(HAIR), style: rnd(STYLES), boots: rnd(BOOTS),
    band: Math.random() < 0.12 ? rnd(['#ffffff', '#e8361f', '#ffd21a', '#2a6ae8']) : null, beard: Math.random() < 0.12, eyes: Math.random() < 0.5 ? 1 : 0 });

  // ---- drawing: a 20x30 cell, feet on row 27, outline added afterwards ----
  const CW = 20, CH = 30;
  function hair(R, P, dir) {
    const c = P.hair, s = P.style; if (s === 'bald') { if (dir !== 'up') R(7, 3, 2, 1, shade(P.skin, 1.18)); return; }
    const back = dir === 'up', side = dir === 'side';
    if (s === 'afro' || s === 'curly') { const big = s === 'afro';
      R(big ? 3 : 4, big ? 0 : 1, big ? 12 : 10, big ? 5 : 3, c); R(big ? 2 : 4, 2, big ? 14 : 10, 2, c);
      if (side) R(big ? 2 : 4, 4, big ? 6 : 4, big ? 6 : 4, c); else if (!back) { R(big ? 2 : 4, 4, 2, big ? 5 : 2, c); R(big ? 14 : 12, 4, 2, big ? 5 : 2, c); }
      if (back) R(big ? 2 : 4, 4, big ? 14 : 10, big ? 7 : 6, c);
      for (let x = big ? 3 : 5; x < (big ? 15 : 13); x += 2) R(x, big ? -1 : 0, 1, 1, c); return; }
    if (s === 'mohawk') { if (side) { R(5, 0, 6, 3, c); R(4, 2, 3, 2, c); } else R(8, 0, 2, back ? 10 : 4, c); return; }
    if (s === 'buzz') { R(4, 2, 10, 2, shade(c, 1)); if (side) R(4, 4, 3, 3, c); else if (back) R(4, 2, 10, 7, c); else { R(4, 4, 1, 2, c); R(13, 4, 1, 2, c); } return; }
    // short-based styles
    R(4, 1, 10, 3, c); R(5, 0, 8, 1, c);
    if (side) { R(4, 4, 4, 4, c); R(3, 3, 2, 4, c); }
    else if (back) R(4, 1, 10, 9, c);
    else { R(4, 4, 2, 2, c); R(12, 4, 2, 2, c); }
    if (s === 'spiky') { for (let x = 4; x < 14; x += 3) R(x, -1, 2, 1, c); R(13, 0, 2, 1, c); if (side) R(2, 2, 2, 2, c); }
    if (s === 'long') { if (side) R(3, 4, 5, 9, c); else if (back) R(4, 9, 10, 4, c); else { R(3, 4, 2, 9, c); R(13, 4, 2, 9, c); } }
    if (s === 'bun') { R(7, -2, 4, 2, c); if (side) { R(1, 2, 3, 3, c); } }
    if (s === 'fringe' && !back) { if (side) R(8, 4, 5, 1, c); else R(5, 4, 8, 1, c); }
    if (s === 'side' && !back) { if (side) R(9, 3, 4, 1, c); else R(9, 4, 4, 1, c); }
    R(6, 1, 3, 1, shade(c, 1.35)); // a glint
  }
  function head(R, P, dir) {
    const sk = P.skin, dk = shade(sk, 0.82);
    R(5, 2, 8, 10, sk); R(4, 3, 10, 8, sk);
    if (dir === 'side') { R(4, 3, 3, 8, sk); R(14, 6, 1, 2, sk); R(7, 6, 1, 2, dk); R(11, 6, 1, 2, '#1a1020'); if (P.eyes) R(11, 5, 1, 1, '#1a1020'); R(12, 9, 2, 1, dk); }
    else if (dir === 'down') { R(6, 6, 1, 2, '#1a1020'); R(11, 6, 1, 2, '#1a1020'); R(8, 9, 2, 1, dk); R(4, 7, 1, 2, dk); R(13, 7, 1, 2, dk); }
    if (P.beard && dir !== 'up') { const c = P.hair; if (dir === 'side') R(8, 9, 6, 2, c); else R(5, 9, 8, 2, c); }
    hair(R, P, dir);
    if (P.band) { if (dir === 'side') R(4, 4, 10, 1, P.band); else R(4, 4, 10, 1, P.band); }
  }
  function torso(R, P, K, dir, x0, w, y0, h, num) {
    const sh = K.shirt, tr = K.trim; R(x0, y0, w, h, sh);
    if (K.pat === 'stripes') for (let x = x0 + 1; x < x0 + w; x += 2) R(x, y0, 1, h, tr);
    if (K.pat === 'hoops') for (let y = y0 + 1; y < y0 + h; y += 2) R(x0, y, w, 1, tr);
    if (K.pat === 'sash' && dir !== 'up') for (let i = 0; i < h; i++) R(x0 + Math.min(w - 2, i), y0 + i, 2, 1, tr);
    if (K.pat === 'half') R(x0 + (w >> 1), y0, w - (w >> 1), h, tr);
    R(x0 + w - 1, y0, 1, h, shade(sh, 0.78)); // the shaded side
    if (dir !== 'side') R(x0 + 2, y0, w - 4, 1, tr); // collar
    if (dir === 'up' && num != null) { const s = String(num), dw = s.length * 4 - 1, sx = x0 + Math.floor((w - dw) / 2);
      const lite = hueOf(sh).v > 0.75 && hueOf(sh).s < 0.5, dc = K.pat === 'plain' || K.pat === 'sleeves' ? (clash(tr, sh) ? (lite ? '#141414' : '#ffffff') : tr) : (lite ? '#141414' : '#ffffff');
      if (K.pat !== 'plain' && K.pat !== 'sleeves') R(sx - 1, y0, dw + 2, 5, sh);
      for (let i = 0; i < s.length; i++) { const m = DIG[s[i]]; for (let k = 0; k < 15; k++) if (m[k] === '1') R(sx + i * 4 + (k % 3), y0 + Math.floor(k / 3), 1, 1, dc); } }
  }
  // legs: (hip x, foot x, foot lift), one per leg
  function leg(R, P, K, hx, fx, lift, far, kick) {
    const sk = far ? shade(P.skin, 0.85) : P.skin, so = far ? shade(K.socks, 0.8) : K.socks, bo = far ? shade(P.boots, 0.8) : P.boots;
    if (kick) { R(hx, 19, 2, 2, sk); R(hx + 2, 19, 4, 2, so); R(hx + 6, 18, 3, 3, bo); return; }
    const mx = Math.round((hx + fx) / 2);
    R(hx, 19, 2, 2, sk); R(mx, 21 - lift, 2, 2, sk); R(fx, 23 - lift, 2, 2, so); R(fx - (fx < hx ? 1 : 0), 25 - lift, 3, 2, bo);
  }
  const RUN = [[3, -3, 2, 0], [0, 0, 0, 0], [-3, 3, 0, 2], [0, 0, 0, 0]];
  function body(c, P, K, dir, pose, f, num) {
    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x + 1, y + 2, w, h); };
    const bob = pose === 'run' && f % 2 === 0 ? -1 : 0, sk = P.skin, sl = K.pat === 'sleeves' ? K.trim : K.shirt;
    const B = (x, y, w, h, col) => R(x, y + bob, w, h, col);
    const gl = K.gloves;
    if (dir === 'side') {
      if (pose === 'kick') { leg(R, P, K, 7, 4, 0, true); leg(R, P, K, 9, 0, 0, false, true); }
      else if (pose === 'jump') { leg(R, P, K, 6, 5, 3, true); leg(R, P, K, 10, 11, 4, false); }
      else { const r = pose === 'run' ? RUN[f] : [0, 0, 0, 0]; leg(R, P, K, 6, 6 + r[1], r[3], true); leg(R, P, K, 9, 9 + r[0], r[2], false); }
      B(6, 17, 6, 2, K.shorts);
      torso(B, P, K, 'side', 6, 6, 12, 5);
      if (pose === 'jump') { B(8, 7, 2, 5, sl); B(8, 6, 2, 1, gl || sk); }
      else { const sw = pose === 'run' ? [3, 0, -3, 0][f] : pose === 'kick' ? -4 : 0;
        B(8 + Math.sign(sw), 12, 2, 2, sl); B(8 + sw, 14, 2, 2, sk); if (gl) B(8 + sw, 15, 2, 1, gl); }
      head(B, P, 'side');
    } else {
      const r = pose === 'run' ? RUN[f] : [0, 0, 0, 0], up = dir === 'up';
      if (pose === 'jump') { leg(R, P, K, 5, 5, 3, false); leg(R, P, K, 11, 11, 3, false); }
      else { leg(R, P, K, 5, 5, r[2] ? 2 : 0, false); leg(R, P, K, 11, 11, r[3] ? 2 : 0, false); }
      B(5, 17, 8, 2, K.shorts);
      torso(B, P, K, dir, 5, 8, 12, 5, num);
      if (pose === 'jump' || pose === 'cheer') { B(2, 7, 2, 6, sl); B(14, 7, 2, 6, sl); B(4, 12, 1, 1, sl); B(13, 12, 1, 1, sl); B(2, 4, 2, 3, gl || sk); B(14, 4, 2, 3, gl || sk); }
      else { const a = pose === 'run' ? [1, 0, -1, 0][f] : 0;
        B(3, 12, 2, 2, sl); B(13, 12, 2, 2, sl); B(3, 14 + a, 2, 2, gl || sk); B(13, 14 - a, 2, 2, gl || sk); }
      head(B, P, up ? 'up' : 'down');
    }
  }
  function outline(cv) {
    const x = cv.getContext('2d'), d = x.getImageData(0, 0, CW, CH), p = d.data, o = new Uint8ClampedArray(p);
    for (let y = 0; y < CH; y++) for (let i = 0; i < CW; i++) { const k = (y * CW + i) * 4; if (p[k + 3]) continue;
      const n = (a, b) => a >= 0 && b >= 0 && a < CW && b < CH && p[(b * CW + a) * 4 + 3] > 0;
      if (n(i - 1, y) || n(i + 1, y) || n(i, y - 1) || n(i, y + 1)) { o[k] = 22; o[k + 1] = 14; o[k + 2] = 22; o[k + 3] = 255; } }
    d.data.set(o); x.putImageData(d, 0, 0); return cv;
  }
  // the player object: look + kit + number, with a frame cache
  function make(K, num, L) {
    const P = L || look(), cache = {};
    return { look: P, kit: K, num,
      frame(dir, pose, f = 0) { const key = dir + pose + f; if (cache[key]) return cache[key];
        const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const c = cv.getContext('2d');
        body(c, P, K, dir, pose, f, num); return (cache[key] = outline(cv)); } };
  }
  window.GRACZ = { make, look, kit, gkKit, clash, CW, CH, FEET: 28 };
})();
