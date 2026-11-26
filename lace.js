// ---- SZNUROWANIE: tie the boot. Swipe along each lace that pops up, from its red end to its green end, before time
// runs out; every swipe threads one more cross into the boot, faster and faster, and the last one ties the bow.
(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.createElement('div'); root.id = 'lace'; root.hidden = true;
  root.innerHTML = '<canvas id="laceCv"></canvas><button class="ibtn" id="laceBack">✕ MENU</button>';
  document.body.appendChild(root);
  const st = document.createElement('style');
  st.textContent = `#lace { position: fixed; inset: 0; z-index: 18; background: #12151a; touch-action: none; user-select: none; -webkit-user-select: none; }
    #lace[hidden] { display: none; } #laceCv { width: 100%; height: 100%; display: block; }
    #laceBack { right: max(10px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); z-index: 2; }`;
  document.head.appendChild(st);
  const cv = $('laceCv'), g = cv.getContext('2d');
  const img = (s) => { const i = new Image(); i.src = s; return i; };
  const OPEN = img('but0.jpg'), TIED = img('but1.jpg');
  const MUS = window.MV ? MV.reg(new Audio('szatnia.mp3?v=2'), 0.4) : null; if (MUS) MUS.loop = true;
  let AC = null;
  const tone = (f0, f1, d, type = 'square', v = 0.05, delay = 0) => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + delay, o = AC.createOscillator(), gn = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) {} };

  // the picture is drawn "cover" into the screen; these map picture coordinates (of 2576 x 1438) to the screen
  let W = 0, H = 0, DPR = 1, sc = 1, ox = 0, oy = 0;
  const layout = () => { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    sc = Math.max(W / 2576, H / 1438); ox = (W - 2576 * sc) / 2; oy = (H - 1438 * sc) / 2; };
  addEventListener('resize', () => { if (!root.hidden) layout(); });
  const P = (x, y) => [ox + x * sc, oy + y * sc];
  // eyelets, bottom pair first
  const EL = [[1190, 790], [1190, 715], [1162, 635], [1170, 555], [1168, 480]], ER = [[1398, 790], [1400, 715], [1410, 635], [1422, 555], [1428, 480]];
  const SEGS = [[EL[0], ER[0]]]; for (let i = 0; i < 4; i++) { SEGS.push([EL[i], ER[i + 1]]); SEGS.push([ER[i], EL[i + 1]]); }
  const N = SEGS.length + 1;   // + the bow

  // ---- the laces to swipe: a straight line, a zig-zag, an arc or a wave, anywhere, any direction ----
  const S = { on: false, phase: 'idle', t: 0, k: 0, lives: 3, path: null, len: 0, prog: 0, touching: false, time: 2.6, left: 0, msg: '', msgT: 0, best: 0, flash: 0, shake: 0, start: 0, sparks: [] };
  try { S.best = +localStorage.getItem('lace_best') || 0; } catch (e) {}
  const makePath = () => {
    const m = Math.min(W, H), L = m * (0.42 + Math.random() * 0.2), a = Math.random() * Math.PI * 2, kind = ['line', 'line', 'zig', 'arc', 'wave'][S.k < 2 ? 0 : (Math.random() * 5) | 0];
    const cx = W * (0.25 + Math.random() * 0.5), cy = H * (0.3 + Math.random() * 0.45), ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, pts = [];
    for (let i = 0; i <= 40; i++) { const s = i / 40 - 0.5; let o = 0;
      if (kind === 'zig') o = (Math.abs(((s + 0.5) * 3) % 2 - 1) - 0.5) * L * 0.35;
      if (kind === 'arc') o = (0.25 - s * s) * L * 0.9;
      if (kind === 'wave') o = Math.sin((s + 0.5) * Math.PI * 2) * L * 0.16;
      pts.push([cx + ux * s * L + nx * o, cy + uy * s * L + ny * o]); }
    // keep it on screen
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; for (const [x, y] of pts) { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
    const dx = mnx < 40 ? 40 - mnx : mxx > W - 40 ? W - 40 - mxx : 0, dy = mny < 70 ? 70 - mny : mxy > H - 40 ? H - 40 - mxy : 0;
    const out = pts.map(([x, y]) => [x + dx, y + dy]); const cum = [0]; for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    return { pts: out, cum, len: cum[cum.length - 1] };
  };
  const next = () => { S.path = makePath(); S.prog = 0; S.touching = false; S.time = Math.max(0.85, 2.6 * Math.pow(0.88, S.k)); S.left = S.time; S.phase = 'swipe'; tone(660, 880, 0.06); };
  const start = () => { layout(); Object.assign(S, { k: 0, lives: 3, phase: 'ready', t: 0, msg: '', sparks: [] }); };

  // ---- following the finger: progress only moves forward, the finger must stay close to the lace ----
  const TOL = () => Math.max(34, Math.min(W, H) * 0.075);
  const nearest = (x, y) => { const p = S.path.pts; let best = -1, bd = 1e9;
    for (let i = 0; i < p.length; i++) { const d = Math.hypot(p[i][0] - x, p[i][1] - y); if (d < bd) { bd = d; best = i; } } return [best, bd]; };
  const down = (x, y) => { if (S.phase === 'ready') { S.phase = 'go'; S.t = 0; return; } if (S.phase === 'end') { start(); return; } if (S.phase !== 'swipe') return;
    const [i, d] = nearest(x, y); if (i <= 3 && d < TOL() * 1.3) { S.touching = true; S.prog = Math.max(S.prog, i); } else if (d < TOL()) { fail('OD CZERWONEGO!'); } };
  const move = (x, y) => { if (S.phase !== 'swipe' || !S.touching) return; const [i, d] = nearest(x, y);
    if (d > TOL() * 1.25) { fail('ZA DALEKO!'); return; }
    if (i > S.prog && i - S.prog < 14) { S.prog = i; if (Math.random() < 0.5) S.sparks.push({ x, y, t: 0 }); }
    if (S.prog >= S.path.pts.length - 2) done(); };
  const up = () => { if (S.phase === 'swipe' && S.touching && S.prog < S.path.pts.length - 2) fail('NIE PUSZCZAJ!'); S.touching = false; };
  const done = () => { S.k++; S.touching = false; tone(523 + S.k * 40, 1047 + S.k * 60, 0.12, 'square', 0.06); S.flash = 0.35;
    if (S.k >= N) { S.phase = 'won'; S.t = 0; [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.18, 'square', 0.05, i * 0.1)); return; }
    S.phase = 'gap'; S.t = 0; };
  const fail = (why) => { S.touching = false; S.lives--; S.msg = why; S.msgT = 1.1; S.shake = 0.35; tone(220, 110, 0.3, 'sawtooth', 0.06);
    if (S.lives <= 0) { S.phase = 'lost'; S.t = 0; return; } S.phase = 'gap'; S.t = -0.4; };
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} down(...pt(e)); });
  cv.addEventListener('pointermove', (e) => { move(...pt(e)); });
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => { if (root.hidden) return; e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') close(); else if (e.code === 'Enter' || e.code === 'Space') { if (S.phase === 'ready') { S.phase = 'go'; S.t = 0; } else if (S.phase === 'end') start(); } }, true);
  $('laceBack').addEventListener('click', () => close());

  // ---- drawing ----
  // pixel drawing: everything snaps to a grid of square cells, like an 8-bit screen
  const CELL = () => Math.max(4, Math.round(Math.min(W, H) / 95));
  const cellsOf = (pts, w) => { const c = CELL(), R = Math.max(0.5, w / 2 / c), r = Math.ceil(R), set = new Set();
    for (let i = 0; i < pts.length - 1 || i === 0; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[Math.min(i + 1, pts.length - 1)];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (c * 0.5)));
      for (let k = 0; k <= n; k++) { const gx = Math.floor((x0 + (x1 - x0) * k / n) / c), gy = Math.floor((y0 + (y1 - y0) * k / n) / c);
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= R * R) set.add((gx + dx) + ',' + (gy + dy)); }
      if (pts.length < 2) break; }
    return set; };
  const fillCells = (set, col) => { const c = CELL(); g.fillStyle = col; for (const k of set) { const i = k.indexOf(','); g.fillRect(+k.slice(0, i) * c, +k.slice(i + 1) * c, c, c); } };
  const pline = (pts, w, col) => fillCells(cellsOf(pts, w), col);
  const pdot = (x, y, r, col) => fillCells(cellsOf([[x, y]], r * 2), col);
  const lace = (a, b, w, col) => { const A = P(...a), B = P(...b), c = CELL();
    pline([A, B], w + c * 1.6, '#140a10'); pline([A, B], w, col);
    // a darker pixel stripe along the lace so it reads as twisted cord
    const n = Math.max(2, Math.floor(Math.hypot(B[0] - A[0], B[1] - A[1]) / (c * 4))); g.fillStyle = col === '#a3263a' ? '#6a1220' : '#5a0e1a';
    for (let i = 1; i < n; i++) { const x = A[0] + (B[0] - A[0]) * i / n, y = A[1] + (B[1] - A[1]) * i / n; g.fillRect(Math.floor(x / c) * c, Math.floor(y / c) * c, c, c); } };
  const txt = (s, x, y, size, col = '#fff') => { g.font = `${Math.round(size * 0.62)}px "Press Start 2P", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#000'; for (const [a, b] of [[3, 3], [-2, 2], [2, -2], [-2, -2]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const drawPath = () => { const p = S.path.pts, k = S.prog, c = CELL();
    pline(p, 34, '#000'); pline(p, 24, '#6a1622'); pline(p, 8, '#9a3040');
    if (k > 0) { const q = p.slice(0, k + 1); pline(q, 26, '#ffe14a'); pline(q, 10, '#fffbe0'); }
    // the ends: red to start, green to finish (pixel discs), a chevron on the way
    const [sx, sy] = p[0], [ex, ey] = p[p.length - 1], blink = Math.floor(performance.now() / 160) % 2;
    pdot(sx, sy, 26, '#000'); pdot(sx, sy, 20, blink ? '#ff4a3a' : '#c8281a'); pdot(sx - 6, sy - 6, 5, '#ffb0a0');
    pdot(ex, ey, 26, '#000'); pdot(ex, ey, 20, '#3fe060'); pdot(ex - 6, ey - 6, 5, '#c8ffc0');
    const mi = Math.min(p.length - 2, Math.max(k + 6, 12)), [ax, ay] = p[mi], [bx, by] = p[mi + 1], an = Math.atan2(by - ay, bx - ax);
    const tip = [ax + Math.cos(an) * 12, ay + Math.sin(an) * 12], l = [ax + Math.cos(an + 2.4) * 12, ay + Math.sin(an + 2.4) * 12], r = [ax + Math.cos(an - 2.4) * 12, ay + Math.sin(an - 2.4) * 12];
    pline([l, tip, r], 8, '#000'); pline([l, tip, r], 3, '#fff');
    // the clock: a ring of pixel blocks round the red end
    const f = Math.max(0, S.left / S.time), ring = new Set(), R = 36;
    for (let a = 0; a < f * Math.PI * 2; a += 0.05) { const x = sx + Math.sin(a) * R, y = sy - Math.cos(a) * R; ring.add(Math.floor(x / c) + ',' + Math.floor(y / c)); }
    fillCells(ring, f < 0.3 && blink ? '#ff4a3a' : '#fff'); };
  const draw = () => {
    g.save(); if (S.shake > 0) g.translate((Math.random() - 0.5) * 16 * S.shake, (Math.random() - 0.5) * 16 * S.shake);
    g.fillStyle = '#12151a'; g.fillRect(-20, -20, W + 40, H + 40);
    const won = S.phase === 'won' || (S.phase === 'end' && S.win);
    if (OPEN.complete) g.drawImage(OPEN, ox, oy, 2576 * sc, 1438 * sc);
    // the laces threaded so far
    if (won && TIED.complete) { g.globalAlpha = Math.min(1, S.t * 2.5 + (S.phase === 'end' ? 1 : 0)); g.drawImage(TIED, ox, oy, 2576 * sc, 1438 * sc); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, W, H);   // dims the picture so the laces to swipe stand out
    if (!won) { const n = Math.min(S.k, SEGS.length); for (let i = 0; i < n; i++) lace(SEGS[i][0], SEGS[i][1], Math.max(CELL() * 1.2, 15 * sc), i % 2 ? '#8a1c2a' : '#a3263a'); }
    if (S.phase === 'swipe') drawPath();
    for (const s of S.sparks) { s.t += 1 / 60; const c = CELL(); g.fillStyle = s.t < 0.25 ? '#ffe14a' : '#ff9a1f'; g.fillRect(Math.floor((s.x + s.t * 30) / c) * c, Math.floor((s.y - s.t * 40) / c) * c, c, c); }
    S.sparks = S.sparks.filter((s) => s.t < 0.5);
    g.restore();
    if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash})`; g.fillRect(0, 0, W, H); }
    // HUD: progress, hearts
    const bw = Math.min(260, W * 0.4); g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(12, 12, bw + 16, 44); g.fillStyle = '#333'; g.fillRect(20, 36, bw, 12);
    g.fillStyle = '#3fe060'; g.fillRect(20, 36, bw * Math.min(1, S.k / N), 12); g.font = '12px "Press Start 2P", monospace'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.textBaseline = 'middle';
    g.fillText(`SZNUROWANIE ${Math.min(S.k, N)}/${N}`, 20, 24); g.fillStyle = '#ff4a5a'; g.textAlign = 'right'; g.fillText('♥'.repeat(Math.max(0, S.lives)) + '♡'.repeat(Math.max(0, 3 - S.lives)), 20 + bw, 24);
    if (S.phase === 'ready') { txt('ZAWIĄŻ BUTA!', W / 2, H * 0.36, Math.min(56, W / 9), '#ffe14a'); txt('Przesuń palcem po sznurówce: od CZERWONEGO do ZIELONEGO', W / 2, H * 0.5, Math.min(18, W / 30)); txt('Coraz szybciej! · dotknij, żeby zacząć', W / 2, H * 0.58, Math.min(16, W / 34), '#8fd99a'); }
    if (S.phase === 'go') txt(S.t < 0.5 ? 'GOTOWY…' : 'START!', W / 2, H * 0.45, 48, '#ffe14a');
    if (S.msgT > 0) { S.msgT -= 1 / 60; txt(S.msg, W / 2, 90, 30, '#ff6a4a'); }
    if (S.phase === 'end') { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H);
      txt(S.win ? 'ZAWIĄZANE!' : 'SZNURÓWKA SIĘ ROZWIĄZAŁA', W / 2, H * 0.36, Math.min(54, W / (S.win ? 8 : 15)), S.win ? '#3fe060' : '#ff6a4a');
      txt(S.win ? `Czas: ${S.time2.toFixed(1)} s` + (S.rec ? ' · NOWY REKORD!' : S.best ? ` · rekord ${S.best.toFixed(1)} s` : '') : `${S.k} z ${N}`, W / 2, H * 0.48, 22, '#fff');
      txt('DOTKNIJ, ŻEBY ZAGRAĆ JESZCZE RAZ', W / 2, H * 0.6, 16, '#ffe14a'); } };
  const update = (dt) => {
    S.t += dt; S.flash = Math.max(0, S.flash - dt * 2); S.shake = Math.max(0, S.shake - dt);
    if (S.phase === 'go' && S.t > 1) { S.start = performance.now(); next(); }
    if (S.phase === 'swipe') { S.left -= dt; if (S.left <= 0) fail('ZA WOLNO!'); }
    if (S.phase === 'gap' && S.t > 0.25) next();
    if (S.phase === 'won' && S.t > 1.6) { S.phase = 'end'; S.win = true; S.time2 = (performance.now() - S.start) / 1000; S.rec = !S.best || S.time2 < S.best;
      if (S.rec) { S.best = S.time2; try { localStorage.setItem('lace_best', S.best); } catch (e) {} } }
    if (S.phase === 'lost' && S.t > 0.8) { S.phase = 'end'; S.win = false; }
  };
  let last = 0, raf = 0;
  const loop = (now) => { if (!S.on) return; raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; try { update(dt); draw(); } catch (e) { window.__laceErr = String(e.stack || e); } };
  const close = () => { S.on = false; cancelAnimationFrame(raf); root.hidden = true; if (MUS) MUS.pause(); if (S.onExit) S.onExit(); };
  window.LACE = { get _S() { return S; }, start(onExit) { S.onExit = onExit; root.hidden = false; start(); S.on = true; last = 0; if (MUS) MUS.play().catch(() => {}); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, _S: S };
})();
