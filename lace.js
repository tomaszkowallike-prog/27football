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
  const MUS = window.MV ? MV.reg(new Audio('szatnia.mp3'), 0.4) : null; if (MUS) MUS.loop = true;
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
  const lace = (a, b, w, col) => { const [x0, y0] = P(...a), [x1, y1] = P(...b);
    g.lineCap = 'round'; g.strokeStyle = '#1a0a0e'; g.lineWidth = w + 5 * sc * 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const txt = (s, x, y, size, col = '#fff') => { g.font = `700 ${size}px "Pixelify Sans", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#000'; for (const [a, b] of [[3, 3], [-2, 2], [2, -2], [-2, -2]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const drawPath = () => { const p = S.path.pts, k = S.prog;
    const stroke = (from, to, w, col) => { g.beginPath(); for (let i = from; i <= to; i++) (i === from ? g.moveTo : g.lineTo).call(g, p[i][0], p[i][1]); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    stroke(0, p.length - 1, 30, 'rgba(0,0,0,.6)'); stroke(0, p.length - 1, 22, '#7a1a26'); stroke(0, p.length - 1, 8, 'rgba(255,255,255,.25)');
    if (k > 0) { stroke(0, k, 24, '#ffe14a'); stroke(0, k, 10, '#fff7c0'); }
    // the ends: red to start, green to finish, an arrow on the way
    const [sx, sy] = p[0], [ex, ey] = p[p.length - 1], pulse = 1 + Math.sin(performance.now() / 120) * 0.1;
    g.fillStyle = '#000'; g.beginPath(); g.arc(sx, sy, 24 * pulse, 0, 7); g.fill(); g.fillStyle = '#e8361f'; g.beginPath(); g.arc(sx, sy, 19 * pulse, 0, 7); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(ex, ey, 24, 0, 7); g.fill(); g.fillStyle = '#3fe060'; g.beginPath(); g.arc(ex, ey, 19, 0, 7); g.fill();
    const mi = Math.min(p.length - 2, Math.max(k + 6, 12)), [ax, ay] = p[mi], [bx, by] = p[mi + 1], an = Math.atan2(by - ay, bx - ax);
    g.save(); g.translate(ax, ay); g.rotate(an); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -9); g.lineTo(-6, 9); g.closePath(); g.fill(); g.restore();
    // the clock: a ring round the red end
    const f = Math.max(0, S.left / S.time); g.strokeStyle = f < 0.3 ? '#ff4a3a' : '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(sx, sy, 32, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.stroke(); };
  const draw = () => {
    g.save(); if (S.shake > 0) g.translate((Math.random() - 0.5) * 16 * S.shake, (Math.random() - 0.5) * 16 * S.shake);
    g.fillStyle = '#12151a'; g.fillRect(-20, -20, W + 40, H + 40);
    const won = S.phase === 'won' || (S.phase === 'end' && S.win);
    if (OPEN.complete) g.drawImage(OPEN, ox, oy, 2576 * sc, 1438 * sc);
    // the laces threaded so far
    const n = Math.min(S.k, SEGS.length); for (let i = 0; i < n; i++) lace(SEGS[i][0], SEGS[i][1], 16 * sc * 2, i % 2 ? '#8a1c2a' : '#a3263a');
    if (won && TIED.complete) { g.globalAlpha = Math.min(1, S.t * 2.5 + (S.phase === 'end' ? 1 : 0)); g.drawImage(TIED, ox, oy, 2576 * sc, 1438 * sc); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, W, H);   // dims the picture so the laces to swipe stand out
    if (S.phase === 'swipe') drawPath();
    for (const s of S.sparks) { s.t += 1 / 60; g.fillStyle = `rgba(255,225,74,${1 - s.t * 2})`; g.fillRect(s.x - 3 + s.t * 30, s.y - 3 - s.t * 40, 6, 6); }
    S.sparks = S.sparks.filter((s) => s.t < 0.5);
    g.restore();
    if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash})`; g.fillRect(0, 0, W, H); }
    // HUD: progress, hearts
    const bw = Math.min(260, W * 0.4); g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(12, 12, bw + 16, 44); g.fillStyle = '#333'; g.fillRect(20, 36, bw, 12);
    g.fillStyle = '#3fe060'; g.fillRect(20, 36, bw * Math.min(1, S.k / N), 12); g.font = '700 14px "Pixelify Sans", monospace'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.textBaseline = 'middle';
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
  window.LACE = { start(onExit) { S.onExit = onExit; root.hidden = false; start(); S.on = true; last = 0; if (MUS) MUS.play().catch(() => {}); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, _S: S };
})();
