// ---- BIEG: a race round the pitch, seen from above. Rub the screen up and down (like running in place) to run.
// The captain races the other three boys; the park lamps flicker, midges swarm in their light, leaves drift, tilt-shift blur.
(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.createElement('div'); root.id = 'bieg'; root.hidden = true;
  root.innerHTML = '<canvas id="biegCv"></canvas><button class="ibtn" id="biegBack">✕ MENU</button>';
  document.body.appendChild(root);
  const st = document.createElement('style');
  st.textContent = `#bieg { position: fixed; inset: 0; z-index: 18; background: #0b1a0e; touch-action: none; user-select: none; -webkit-user-select: none; }
    #bieg[hidden] { display: none; } #biegCv { width: 100%; height: 100%; display: block; }
    #biegBack { right: max(10px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); z-index: 2; }`;
  document.head.appendChild(st);
  const cv = $('biegCv'), g = cv.getContext('2d');
  const BW = 1672, BH = 941;
  const BG = new Image(); BG.src = 'bieg_bg.jpg';
  const SA = new Image(); SA.src = 'side_a.png'; const SB = new Image(); SB.src = 'side_b.png';
  let TILE = null;
  const nightTile = () => { if (!SA.complete || !SA.naturalWidth) return null; const c = document.createElement('canvas'); c.width = 192; c.height = 192; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#0c1036'; x.fillRect(0, 0, 192, 192); x.globalAlpha = 0.55; x.drawImage(SA, 0, 0, 192, 192); x.globalAlpha = 1; return c; };
  const AT = new Image(); AT.src = 'bieg_runners.png?v=1795689645'; let ATJ = null;
  fetch('bieg_runners.json?v=1795689645').then((r) => r.json()).then((j) => { ATJ = j; });
  // trees, bushes and lamp posts cut out in bands by where they stand, so a runner passing behind them is hidden
  const FG = new Image(); FG.src = 'bieg_fg.png?v=1795689645'; let FGJ = null, LP = null;
  fetch('bieg_fg.json?v=1795689645').then((r) => r.json()).then((j) => { FGJ = j.fg; buildLanes(j.path); });
  // the line round the pitch and the lamp heads, in picture units
  const PL = 252, PR = 1418, PT = 188, PB = 742;
  const LANES = [-9, -3, 3, 9];
  const LAMPS = [[172, 148], [1497, 148], [157, 636], [1512, 640]];
  const NAMES = { 14: 'SOWA', 10: 'ARTUR', 7: 'SZYMON', 27: 'DOMINIK' };
  const SPR_H = 72;

  // ---- sound ----
  let AC = null;
  const tone = (f0, f1, d, type = 'square', v = 0.05, delay = 0) => { if (window.CFG && window.CFG.sfx === false) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + delay, o = AC.createOscillator(), gn = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) {} };
  const step = () => tone(140 + Math.random() * 30, 70, 0.05, 'triangle', 0.035);

  // ---- layout and the tilt-shift background (blur baked once: sharp middle, soft top and bottom) ----
  let W = 0, H = 0, DPR = 1, sc = 1, ox = 0, oy = 0, TILT = null;
  const layout = () => { DPR = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    sc = Math.min(W / BW, H / BH); ox = (W - BW * sc) / 2; oy = (H - BH * sc) / 2; TILT = null; };
  const bakeTilt = () => { if (!BG.complete || !BG.naturalWidth) return null;
    const c = document.createElement('canvas'); c.width = BW; c.height = BH; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.filter = 'saturate(1.18) contrast(1.05)'; x.drawImage(BG, 0, 0); x.filter = 'none';
    const blurred = (px) => { const b = document.createElement('canvas'); b.width = BW; b.height = BH; const y = b.getContext('2d'); y.filter = `blur(${px}px) saturate(1.18)`; y.drawImage(BG, 0, 0); return b; };
    // bands of growing blur toward the top and bottom edges
    const bands = [[0.10, 2], [0.06, 4], [0.03, 7]];
    for (const [f, px] of bands) { const b = blurred(px), h = BH * f * 1.6;
      x.drawImage(b, 0, 0, BW, h, 0, 0, BW, h); x.drawImage(b, 0, BH - h, BW, h, 0, BH - h, BW, h); }
    return c; };
  addEventListener('resize', () => { if (!root.hidden) layout(); });
  const TS = (x, y) => [x * sc + ox, y * sc + oy];

  // ---- the track: the dirt path round the park, one lane per runner, side by side on the path ----
  const buildLanes = (path) => { const n = path.length; LP = LANES.map((off) => { const pts = [];
      for (let i = 0; i < n; i++) { const [ax, ay] = path[(i - 1 + n) % n], [bx, by] = path[(i + 1) % n], tx = bx - ax, ty = by - ay, l = Math.hypot(tx, ty) || 1;
        pts.push([path[i][0] - ty / l * off, path[i][1] + tx / l * off]); }
      pts.push(pts[0]); const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, cum, len: cum[cum.length - 1] }; }); };
  const perim = (k) => (LP ? LP[k].len : 3500);
  const posAt = (k, d) => { if (!LP) return [0, 0, 'side', 1]; const L = LP[k]; let s2 = ((d % L.len) + L.len) % L.len, lo = 0, hi = L.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.cum[m] <= s2) lo = m; else hi = m; }
    const [ax, ay] = L.pts[lo], [bx, by] = L.pts[hi], f = (s2 - L.cum[lo]) / Math.max(0.001, L.cum[hi] - L.cum[lo]), dx = bx - ax, dy = by - ay;
    const dir = Math.abs(dx) >= Math.abs(dy) * 0.9 ? 'side' : dy > 0 ? 'down' : 'up';
    return [ax + dx * f, ay + dy * f, dir, dx < 0 && dir === 'side' ? -1 : 1]; };

  // ---- state ----
  const S = { on: false, phase: 'intro', t: 0, cnt: 0, runners: [], best: 0, parts: [], leaves: [], flick: [1, 1, 1, 1], res: null, lastDir: 0, acc: 0, strokes: 0 };
  const bestKey = () => 'bieg_best_' + LAPS; const loadBest = () => { try { S.best = +localStorage.getItem(bestKey()) || 0; } catch (e) { S.best = 0; } }; loadBest();
  let LAPS = 3;
  const reset = () => { const cap = window.CAPTAIN || 27, order = [cap, ...[14, 10, 7, 27].filter((n) => n !== cap)];
    const lvl = [0.86, 1, 1.12][(window.CFG && window.CFG.lvl != null) ? window.CFG.lvl : 1];
    S.runners = order.map((n, i) => ({ n, lane: i, d: 0, v: 0, me: i === 0, frame: 0, ft: 0, done: false, time: 0, sta: 1, tired: false,
      base: (255 + Math.random() * 45 + i * 8) * lvl, wob: Math.random() * 6, kick: 0.7 + Math.random() * 0.2 }));
    // the runners stand staggered so every lane has the same distance to run
    S.runners.forEach((r) => { r.dist = perim(r.lane) * LAPS; r.d = 0; });
    S.phase = 'count'; S.t = 0; S.cnt = 3; S.res = null; S.strokes = 0; };

  // ---- input: rub up and down; every change of direction is a step ----
  let last = null;
  const P = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const me = () => S.runners.find((r) => r.me);
  const stride = () => { const m = me(); if (!m || S.phase !== 'run' || m.done) return; m.v = Math.min(m.tired ? 110 : 470, m.v + (m.tired ? 8 : 40)); S.strokes++; S.rubT = 0; if (S.strokes % 2) step(); };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const [x, y] = P(e);
    if (S.phase === 'intro') { for (const l of lapBtns()) if (x > l.x && x < l.x + l.w && y > l.y && y < l.y + l.h) { LAPS = l.n; loadBest(); tone(660, 660, 0.06); }
      const b = btn(); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { reset(); tone(440, 440, 0.12); } return; }
    if (S.phase === 'over') { reset(); S.phase = 'intro'; return; }
    last = { y, dir: 0, acc: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener('pointermove', (e) => { if (!last) return; const [, y] = P(e), dy = y - last.y; last.y = y; if (Math.abs(dy) < 0.5) return;
    const dir = Math.sign(dy);
    if (dir === last.dir) last.acc += Math.abs(dy);
    else { if (last.acc > 14) stride(); last.dir = dir; last.acc = Math.abs(dy); } });
  const up = () => { if (last && last.acc > 14) stride(); last = null; S.lift = 0; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  let lastKey = '';
  addEventListener('keydown', (e) => { if (root.hidden) return; e.stopPropagation();
    if (e.code === 'Escape') { close(); return; }
    if (S.phase === 'intro' && (e.code === 'Enter' || e.code === 'Space')) { reset(); return; }
    if (S.phase === 'over' && (e.code === 'Enter' || e.code === 'Space')) { S.phase = 'intro'; return; }
    const k = ['ArrowUp', 'KeyW'].includes(e.code) ? 'u' : ['ArrowDown', 'KeyS'].includes(e.code) ? 'd' : '';
    if (k && k !== lastKey) { lastKey = k; stride(); } e.preventDefault(); }, true);
  $('biegBack').addEventListener('click', () => close());

  // ---- update ----
  const update = (dt) => { S.t += dt; S.lift = (S.lift || 0) + dt; S.rubT = (S.rubT || 0) + dt;
    for (let i = 0; i < 4; i++) { const f = S.flick[i]; let tgt = 0.85 + Math.sin(S.t * (3 + i) + i * 2) * 0.08 + Math.random() * 0.07;
      if (Math.random() < dt * (i === 2 ? 1.4 : 0.35)) tgt = 0.15 + Math.random() * 0.2; S.flick[i] = f + (tgt - f) * Math.min(1, dt * 25); }
    // midges round the lamps, fireflies over the grass, leaves drifting down
    if (S.parts.length < 90) { const L = LAMPS[Math.floor(Math.random() * 4)]; S.parts.push({ cx: L[0], cy: L[1] + 30, a: Math.random() * 6.28, r: 10 + Math.random() * 60, w: (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 3), z: Math.random() * 6.28, l: 3 + Math.random() * 5 }); }
    for (const p of S.parts) { p.a += p.w * dt; p.z += dt * 3; p.l -= dt; } S.parts = S.parts.filter((p) => p.l > 0);
    if (S.leaves.length < 14 && Math.random() < dt * 2) S.leaves.push({ x: Math.random() * BW, y: -10, vx: 20 + Math.random() * 30, vy: 25 + Math.random() * 25, a: Math.random() * 6, c: Math.random() < 0.5 ? '#3f8a2a' : '#b8862a' });
    for (const l of S.leaves) { l.x += (l.vx + Math.sin(l.a) * 30) * dt; l.y += l.vy * dt; l.a += dt * 2; } S.leaves = S.leaves.filter((l) => l.y < BH + 10 && l.x < BW + 20);
    if (S.phase === 'count') { const c = 3 - Math.floor(S.t); if (c !== S.cnt) { S.cnt = c; if (c > 0) tone(440, 440, 0.12); else { tone(880, 880, 0.3); S.phase = 'run'; S.t = 0; } } }
    if (S.phase === 'run' || S.phase === 'finish') {
      for (const r of S.runners) { if (r.done) { r.v *= Math.exp(-2.5 * dt); r.d += r.v * dt * 0.4; continue; }
        if (!r.me) { const f = r.d / r.dist, push = f > r.kick && r.sta > 0.25 ? 1.2 : 1; let tgt = r.base * push * (1 + Math.sin(S.t * 0.9 + r.wob) * 0.07);
          if (r.tired) tgt = 110; else if (r.sta < 0.3) tgt = Math.min(tgt, 240); r.v += (tgt - r.v) * Math.min(1, dt * 1.6); }
        else { r.v *= Math.exp(-1.15 * dt); if (r.tired) r.v = Math.min(r.v, 110); }
        // stamina: a sprint (fast pace) drains it, an easy pace brings it back; at zero the runner must slow down and rest
        if (r.v > 300) r.sta -= (r.v - 300) / 170 * 0.17 * dt; else r.sta += (r.tired ? 0.1 : r.v < 160 ? 0.2 : 0.09) * dt;
        r.sta = Math.max(0, Math.min(1, r.sta));
        if (r.sta <= 0 && !r.tired) { r.tired = true; if (r.me) { tone(220, 110, 0.4, 'sawtooth', 0.04); try { if (!window.CFG || window.CFG.vib !== false) navigator.vibrate?.([60, 60, 60]); } catch (e) {} } }
        if (r.tired && r.sta > 0.65) r.tired = false;
        r.d += r.v * dt; r.ft += dt * (2 + r.v / 22); r.lap = Math.min(LAPS, Math.floor(r.d / perim(r.lane)) + 1);
        if (r.me && !r.done) { const k = Math.floor(4 * Math.min(1, r.d / r.dist)) * 3; if (k !== S.bpend) { S.bpend = k; window.BIDON?.pend(k); } }   // the bottle fills as you run: 3 points a quarter
        if (r.d >= r.dist) { r.done = true; r.time = S.t; r.place = S.runners.filter((q) => q.done).length;
          if (r.me) { tone(523, 1046, 0.4); S.phase = 'finish'; S.fin = S.t; let rec = false; if (r.place === 1 && (!S.best || r.time < S.best)) { rec = true; S.best = r.time; try { localStorage.setItem(bestKey(), S.best.toFixed(2)); } catch (e) {} } window.TRAIN?.('bieg', { place: r.place, record: rec }); } } }
      if (S.phase === 'finish' && (S.runners.every((r) => r.done) || S.t - S.fin > 3)) { S.phase = 'over'; S.t = 0; } } };

  // ---- drawing ----
  const txt = (s, x, y, size, col = '#fff', al = 'center') => { g.font = `${Math.round(size * 0.62)}px "Press Start 2P", monospace`; g.textAlign = al; g.textBaseline = 'middle';
    g.fillStyle = '#000'; for (const [a, b] of [[3, 3], [-2, 2], [2, -2], [-2, -2]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const pbox = (x, y, w, h, fill) => { g.fillStyle = '#000'; g.fillRect(x + 3, y, w - 6, h); g.fillRect(x, y + 3, w, h - 6); g.fillStyle = fill; g.fillRect(x + 6, y + 3, w - 12, h - 6); g.fillRect(x + 3, y + 6, w - 6, h - 12);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x + 6, y + 6, w - 12, 3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, y + h - 9, w - 12, 3); };
  const btn = () => { const w = Math.min(300, W * 0.42), h = 56; return { x: W / 2 - w / 2, y: H * 0.74, w, h }; };
  const lapBtns = () => { const w = Math.min(110, W * 0.15), h = 46, gap = 14, x0 = W / 2 - (w * 3 + gap * 2) / 2; return [1, 3, 5].map((n, i) => ({ n, x: x0 + i * (w + gap), y: H * 0.56, w, h })); };
  const drawRunner = (r) => { if (!ATJ || !AT.complete) return; const [x, y, dir, flip] = posAt(r.lane, Math.min(r.d, r.dist + 60)), lst = ATJ.p[r.n][dir];
    const idx = r.v > 12 ? lst[Math.floor(r.ft) % lst.length] : lst[0], [fx, fy, fw, fh] = ATJ.f[idx];
    const u = Math.max(1, Math.round(SPR_H * sc / (ATJ.h || 28) * 2) / 2), h = fh * u, w = fw * u, [sx, sy] = TS(x, y);
    g.fillStyle = 'rgba(0,10,0,.35)'; g.beginPath(); g.ellipse(sx, sy, w * 0.42, h * 0.08, 0, 0, 7); g.fill();
    g.save(); g.translate(Math.round(sx), Math.round(sy)); if (flip < 0) g.scale(-1, 1);
    g.drawImage(AT, fx, fy, fw, fh, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h)); g.restore();
    const tag = String(r.n), ty = sy - h - 8; g.font = '8px "Press Start 2P", monospace'; const tw = g.measureText(tag).width + 8;
    g.fillStyle = r.me ? '#ffe14a' : '#1a1540'; g.fillRect(Math.round(sx - tw / 2), Math.round(ty - 7), Math.round(tw), 13); g.fillStyle = r.me ? '#1a1030' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tag, sx, ty);
    if (r.me) { g.fillStyle = '#ffe14a'; g.fillRect(Math.round(sx - 3), Math.round(ty + 7), 6, 3); g.fillRect(Math.round(sx - 1), Math.round(ty + 10), 2, 2); } };
  let PAT = null, PAT2 = null, GLOW = null;
  const draw = () => { g.imageSmoothingEnabled = false; g.fillStyle = '#0c1036'; g.fillRect(0, 0, W, H);
    if (ox > 1) { if (!TILT && !TILE) TILE = nightTile(); if (!TILE) TILE = nightTile();
      if (TILE) { const pat = PAT || (PAT = g.createPattern(TILE, 'repeat')), off = (S.t * 24) % 192; g.save(); g.translate(0, -off); g.fillStyle = pat;
        g.fillRect(0, off, ox, H); g.fillRect(ox + BW * sc, off, W - ox - BW * sc, H);
        if (SB.complete && Math.floor(S.t * 1.8) % 2) { const p2 = PAT2 || (PAT2 = g.createPattern(SB, 'repeat')); g.fillStyle = p2; g.globalAlpha = 0.8; g.fillRect(0, off, ox, H); g.fillRect(ox + BW * sc, off, W - ox - BW * sc, H); }
        g.restore(); g.fillStyle = '#000'; g.fillRect(ox - 3, 0, 3, H); g.fillRect(ox + BW * sc, 0, 3, H); } }
    if (!TILT) TILT = bakeTilt(); if (TILT) g.drawImage(TILT, ox, oy, BW * sc, BH * sc); else if (BG.complete) g.drawImage(BG, ox, oy, BW * sc, BH * sc);
    // start / finish line across the path
    if (LP) { for (let i = 0; i < 6; i++) { const [x, y] = TS(LP[0].pts[0][0] - 2, LP[0].pts[0][1] - 17 + i * 6); const [x2] = TS(LP[0].pts[0][0] + 4, 0); g.fillStyle = i % 2 ? '#111' : '#fff'; g.fillRect(Math.round(x), Math.round(y), Math.max(3, Math.round(x2 - x)), Math.max(2, Math.round(6 * sc))); } }
    // lamp light: warm glow that flickers, additive
    g.save(); g.globalCompositeOperation = 'lighter';
    LAMPS.forEach(([lx, ly], i) => { const [x, y] = TS(lx, ly), f = S.flick[i], R = 230 * sc;
      if (!GLOW) { GLOW = document.createElement('canvas'); GLOW.width = GLOW.height = 128; const q = GLOW.getContext('2d'), gr = q.createRadialGradient(64, 64, 1, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,170,.38)'); gr.addColorStop(0.4, 'rgba(220,255,140,.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(0, 0, 128, 128); }
      g.globalAlpha = Math.max(0, Math.min(1, f)); g.imageSmoothingEnabled = true; g.drawImage(GLOW, x - R, y - R + 40 * sc, R * 2, R * 2); g.imageSmoothingEnabled = false; g.globalAlpha = 1;
      g.fillStyle = `rgba(255,255,230,${0.75 * f})`; g.fillRect(Math.round(x - 9 * sc), Math.round(y - 10 * sc), Math.round(18 * sc), Math.round(18 * sc)); });
    g.restore();
    // runners, sorted top to bottom
    const items = S.runners.map((r) => ({ y: posAt(r.lane, Math.min(r.d, r.dist + 60))[1], r }));
    if (FGJ && FG.complete) for (const f of FGJ) items.push({ y: f[0], f });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) { if (it.r) drawRunner(it.r); else { const [, ax, ay, fx, fy, fw, fh] = it.f; const [x, y] = TS(ax, ay); g.drawImage(FG, fx, fy, fw, fh, x, y, fw * sc, fh * sc); } }
    // midges and leaves, as hard pixels
    const px = Math.max(2, Math.round(2.4 * sc * 1.6));
    for (const p of S.parts) { const li = LAMPS.findIndex((L) => L[0] === p.cx), f = S.flick[li] || 1, [x, y] = TS(p.cx + Math.cos(p.a) * p.r, p.cy + Math.sin(p.a) * p.r * 0.6 + Math.sin(p.z) * 6);
      g.fillStyle = `rgba(255,250,${180 + Math.round(Math.sin(p.z) * 60)},${(0.55 + 0.45 * Math.sin(p.z * 2)) * f})`; g.fillRect(Math.round(x), Math.round(y), px, px); }
    for (const l of S.leaves) { const [x, y] = TS(l.x, l.y); g.fillStyle = l.c; g.fillRect(Math.round(x), Math.round(y), px * 2, px); if (Math.sin(l.a) > 0) g.fillRect(Math.round(x + px), Math.round(y - px), px, px); }
    // HUD, all of it inside the pitch, where nobody runs
    const [px0, py0] = TS(270, 200), [px1, py1] = TS(1400, 730), pcx = (px0 + px1) / 2, pw = px1 - px0;
    if (S.phase === 'run' || S.phase === 'finish' || S.phase === 'count') { const m = me(), key = (r) => (r.done ? 1e9 - r.time : r.d / r.dist), place = [...S.runners].sort((a, b) => key(b) - key(a)).indexOf(m) + 1;
      const bw = Math.min(pw - 20, 430); pbox(pcx - bw / 2, py0 + 6, bw, 40, '#1a1540');
      g.font = '10px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe14a';
      g.fillText(`MIEJSCE ${place}/4   OKR. ${Math.min(LAPS, m.lap || 1)}/${LAPS}   ${(S.phase === 'count' ? 0 : m.done ? m.time : S.t).toFixed(1)}s`, pcx, py0 + 27);
      // stamina and pace, as rows of blocks
      const row = (y, label, f, cols, blink) => { g.font = '8px "Press Start 2P", monospace'; g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(label, pcx - 64, y + 5);
        const n = 12; for (let k = 0; k < n; k++) { const x = pcx - 56 + k * 13; g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, 13, 12); g.fillStyle = k < Math.round(f * n) ? (blink ? '#fff' : cols(k / n)) : '#2a2a36'; g.fillRect(x, y, 11, 10); } };
      const tb = m.tired && Math.floor(performance.now() / 150) % 2;
      row(py0 + 56, 'ZMĘCZENIE', 1 - m.sta, (t) => (t > 0.75 ? '#ff4a3a' : t > 0.45 ? '#ffb02a' : '#3fe060'), tb);
      row(py0 + 72, 'TEMPO', Math.min(1, m.v / 450), (t) => (t > 0.6 ? '#ff6ad5' : '#9fd8ff'), false);
      if (m.tired && !m.done) txt('ZMĘCZONY! ZWOLNIJ I ODPOCZNIJ', pcx, py0 + 102, Math.min(15, pw / 34), Math.floor(performance.now() / 200) % 2 ? '#ff4a3a' : '#fff');
      else if (!m.done && m.sta < 0.25 && S.phase === 'run') txt('UWAGA, OPADASZ Z SIŁ', pcx, py0 + 102, Math.min(14, pw / 36), '#ffb02a');
      // the rubbing guide: two bars to rub between; they fade while you rub and come back when you let go
      if (S.phase !== 'finish' && !m.done) { const cy = (py0 + py1) / 2 + 58, a = S.rubT > 0.5 ? Math.min(0.9, (S.rubT - 0.5) * 1.5 + 0.15) : 0.15, bw2 = Math.min(150, pw * 0.3);
        g.globalAlpha = a; for (const yy of [cy - 40, cy + 40]) { g.fillStyle = '#000'; g.fillRect(pcx - bw2 / 2 - 3, yy - 6, bw2 + 6, 12); g.fillStyle = '#fff'; g.fillRect(pcx - bw2 / 2, yy - 3, bw2, 6); }
        txt('POCIERAJ PALCEM', pcx, cy - 9, 12, '#ffe14a'); txt('GÓRA - DÓŁ', pcx, cy + 10, 12, '#ffe14a'); g.globalAlpha = 1; } }
    const midY = (py0 + py1) / 2 + 22;
    if (S.phase === 'count') txt(S.cnt > 0 ? String(S.cnt) : 'START!', pcx, midY, Math.min(80, pw / 6), S.cnt > 0 ? '#fff' : '#3fe060');
    if (S.phase === 'run' && S.t < 0.8) txt('START!', pcx, midY, Math.min(80, pw / 6), '#3fe060');
    if (S.phase === 'finish' && me().done) txt(me().place === 1 ? 'WYGRANA!' : `${me().place}. MIEJSCE`, pcx, midY, Math.min(50, pw / 9), me().place === 1 ? '#ffe14a' : '#fff');
    if (S.phase === 'intro' || S.phase === 'over') { g.fillStyle = 'rgba(6,10,30,.76)'; g.fillRect(0, 0, W, H);
      if (S.phase === 'intro') { txt('BIEG', W / 2, H * 0.12, Math.min(56, W / 11), '#ffe14a');
        txt('Pocieraj ekran palcem w górę i w dół: im szybciej, tym szybciej biegniesz.', W / 2, H * 0.25, Math.min(13, W / 60));
        txt('Za długi sprint męczy. Gdy pasek ZMĘCZENIE dojdzie do końca,', W / 2, H * 0.32, Math.min(13, W / 60));
        txt('musisz zwolnić i odpocząć. Rozłóż siły na okrążenia!', W / 2, H * 0.39, Math.min(13, W / 60));
        txt('ILE OKRĄŻEŃ?', W / 2, H * 0.5, 13, '#9fd8ff');
        for (const l of lapBtns()) { pbox(l.x, l.y, l.w, l.h, l.n === LAPS ? '#ffe14a' : '#2a2454'); g.font = '14px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = l.n === LAPS ? '#1a1030' : '#fff'; g.fillText(String(l.n), l.x + l.w / 2, l.y + l.h / 2 + 1); }
        const b = btn(); pbox(b.x, b.y, b.w, b.h, '#3fe060'); g.font = '16px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = '#10301a'; g.fillText('NA START', b.x + b.w / 2, b.y + b.h / 2 + 1);
        if (S.best) txt(`REKORD (${LAPS} okr., wygrana): ${S.best.toFixed(1)} s`, W / 2, H * 0.92, 11, '#9fd8ff'); }
      else { const done = [...S.runners].sort((a, b) => (a.done ? a.time : 1e9 - a.d) - (b.done ? b.time : 1e9 - b.d)); txt('WYNIKI', W / 2, H * 0.16, Math.min(44, W / 14), '#ffe14a');
        done.forEach((r, i) => txt(`${i + 1}. ${r.n} ${NAMES[r.n]}  ${r.done ? r.time.toFixed(1) + ' s' : '--'}`, W / 2, H * (0.32 + i * 0.1), Math.min(18, W / 36), r.me ? '#ffe14a' : '#fff'));
        txt('DOTKNIJ, ŻEBY WRÓCIĆ', W / 2, H * 0.82, 14, '#9fd8ff'); } } };
  let lastT = 0, raf = 0;
  const loop = (now) => { if (!S.on) return; raf = requestAnimationFrame(loop); const dt = Math.min(0.04, (now - (lastT || now)) / 1000); lastT = now; update(dt); draw(); };
  const close = () => { window.BIDON?.hud(false); S.on = false; cancelAnimationFrame(raf); root.hidden = true; if (S.onExit) S.onExit(); };
  window.BIEG = { start(onExit) { S.onExit = onExit; root.hidden = false; window.BIDON?.hud(true); S.bpend = 0; layout(); S.phase = 'intro'; S.runners = []; reset(); S.phase = 'intro'; S.on = true; lastT = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); },
    get _S() { return S; } };
})();
