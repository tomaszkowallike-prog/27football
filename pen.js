// ---- RZUTY KARNE: a penalty seen from behind the taker, on its own canvas -------------------------------------------
// Before every kick a big cross: stop the dot on the vertical line, then the one on the horizontal line. Both dead
// centre and a power is drawn: SMOK, ELEKTRYCZNY STRZAŁ or HALLAND, and a power shot always goes in. Otherwise you
// aim at a spot in the goal and stop the power bar. Used as its own mode (5 kicks each, CPU kicks simulated) and for
// the penalties Pixels wins during a match.
(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.createElement('div'); root.id = 'pen'; root.hidden = true;
  root.innerHTML = '<canvas id="penCv"></canvas><button class="ibtn" id="penBack">✕ MENU</button>';
  document.body.appendChild(root);
  const st = document.createElement('style');
  st.textContent = `#pen { position: fixed; inset: 0; z-index: 18; background: #02070f; touch-action: none; user-select: none; -webkit-user-select: none; }
    #pen[hidden] { display: none; } #penCv { width: 100%; height: 100%; display: block; object-fit: contain; image-rendering: pixelated; }
    #penBack { right: max(10px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); } #pen.single #penBack { display: none; }`;
  document.head.appendChild(st);
  const cv = $('penCv'); let g = cv.getContext('2d'); const G0 = g;
  let W = 640; const H = 360;
  const img = (src) => { const i = new Image(); i.src = src; return i; };
  const GFIRE = img('fx_goalfire.png?v=1');   // the burning-goal GIF, cut: 30 frames of 240x145, posts at 24.5/215, bar 56, ground 142.5
  const ATL = img('pen.png'), BG = img('kapki_bg.jpg'); let M = null;
  fetch('pen.json').then((r) => r.json()).then((j) => (M = j));

  // ---- sound ----
  const MUS = window.MV ? MV.reg(new Audio('karne2.mp3?v=2'), 0.45) : new Audio('karne2.mp3?v=2'); MUS.loop = true;   // the penalty tune
  let AC = null;
  const ac = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} return AC; };
  const tone = (f0, f1, d, type = 'square', v = 0.05, delay = 0) => { const a = ac(); if (!a) return; const t = a.currentTime + delay, o = a.createOscillator(), gn = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d); gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(gn).connect(a.destination); o.start(t); o.stop(t + d + 0.02); };
  const noise = (d, v = 0.2, hp = 400, delay = 0) => { const a = ac(); if (!a) return; const t = a.currentTime + delay, b = a.createBuffer(1, a.sampleRate * d, a.sampleRate), c = b.getChannelData(0);
    for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / c.length); const s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain();
    s.buffer = b; f.type = 'highpass'; f.frequency.value = hp; gn.gain.value = v; s.connect(f).connect(gn).connect(a.destination); s.start(t); };
  const SND = {
    tick: () => tone(880, 880, 0.03, 'square', 0.03), stop: () => tone(660, 440, 0.08),
    perfect: () => [988, 1319, 1760].forEach((f, i) => tone(f, f, 0.1, 'square', 0.05, i * 0.07)),
    whistle: () => { tone(2600, 2500, 0.18, 'sine', 0.06); tone(2600, 2500, 0.35, 'sine', 0.06, 0.22); },
    kick: () => { tone(160, 50, 0.12, 'sine', 0.3); noise(0.05, 0.15, 2000); },
    net: () => noise(0.4, 0.12, 900), crowd: () => { noise(1.6, 0.16, 300); [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 'square', 0.04, 0.1 + i * 0.09)); },
    groan: () => { tone(300, 120, 0.7, 'sawtooth', 0.05); noise(0.6, 0.08, 200); },
    save: () => { tone(200, 90, 0.15, 'square', 0.12); noise(0.1, 0.2, 800); },
    roll: () => tone(1200, 1200, 0.025, 'square', 0.03), zap: () => { noise(0.5, 0.25, 3000); tone(1800, 300, 0.4, 'sawtooth', 0.06); },
    roar: () => { noise(1, 0.28, 150); tone(140, 50, 1, 'sawtooth', 0.12); }, hum: () => { tone(110, 220, 1.4, 'sine', 0.12); tone(220, 440, 1.4, 'triangle', 0.04); },
    boom: () => { tone(90, 30, 0.6, 'sine', 0.4); noise(0.5, 0.3, 200); },
  };

  // ---- layout (logical pixels, H = 360; W follows the screen's shape) ----
  const L = {}; const layout = () => { const r = innerWidth / innerHeight; W = Math.round(Math.max(480, Math.min(800, H * r))); cv.width = W; cv.height = H; BAKED = null;
    const cx = W / 2; Object.assign(L, { cx, gx0: cx - 150, gx1: cx + 150, gtop: 118, gbot: 226, spotX: cx + 66, spotY: 340, crossY: 172 }); g.imageSmoothingEnabled = false; };
  addEventListener('resize', () => { if (!root.hidden) layout(); });

  // colour ghosts for the chromatic aberration: the sprite in red and in blue, a few pixels apart, behind the real one
  const TINT = document.createElement('canvas'), tg = TINT.getContext('2d');
  const tinted = (sx, sy, w, h, col) => { TINT.width = w; TINT.height = h; tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, w, h);
    tg.drawImage(ATL, sx, sy, w, h, 0, 0, w, h); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, w, h); return TINT; };
  let CA = 3;   // pixels; grows on a shot
  const frame = (sheet, i, x, y, { flip = false, alpha = 1, scale = 1, add = false, ca = true } = {}) => {   // x, y = the frame's top-left
    if (!M) return; const m = M[sheet], [sx, sy] = m.f[Math.max(0, Math.min(m.f.length - 1, i))];
    const put = (img, ix, iy, dx) => { g.save(); if (flip) { g.translate(x + dx + m.w * scale, y); g.scale(-1, 1); g.drawImage(img, ix, iy, m.w, m.h, 0, 0, m.w * scale, m.h * scale); }
      else g.drawImage(img, ix, iy, m.w, m.h, x + dx, y, m.w * scale, m.h * scale); g.restore(); };
    if (ca && !add) { const d = CA * (0.85 + Math.random() * 0.3);
      g.save(); g.globalAlpha = alpha * 0.7; g.globalCompositeOperation = 'lighter';
      put(tinted(sx, sy, m.w, m.h, '#ff2a2a'), 0, 0, -d); put(tinted(sx, sy, m.w, m.h, '#2a6aff'), 0, 0, d); g.restore(); }
    g.save(); g.globalAlpha = alpha; if (add) g.globalCompositeOperation = 'lighter'; put(ATL, sx, sy, 0); g.restore(); };
  // a sheet placed so its frame-0 ball sits on the penalty spot
  const SC = 0.8;   // the taker's sheets are drawn at this scale
  const atSpot = (sheet) => { const m = M[sheet], b = m.ball || [m.w / 2, m.h]; return [L.spotX - b[0] * SC, L.spotY - b[1] * SC]; };

  // ---- the scene ----
  let BAKED = null;
  const bake = () => {   // the stands and the grass go to an offscreen canvas, then out again in three colour layers, offset
    if (!BG.complete || !BG.naturalWidth) return null;
    const src = document.createElement('canvas'); src.width = W; src.height = H; const s = src.getContext('2d'); const keep = g;
    g = s; s.filter = 'blur(1.2px)'; const bw = W, bh = W * 9 / 16; s.drawImage(BG, 0, (H - bh) / 2 - 58, bw, bh); s.filter = 'none'; drawGrass(); g = keep;
    const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
    const chan = (col) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, W, H); return c; };
    o.fillStyle = '#000'; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'lighter';
    o.drawImage(chan('#ff0000'), -3, 0); o.drawImage(chan('#00ff00'), 0, 0); o.drawImage(chan('#0000ff'), 3, 1);
    return out; };
  const drawPitch = () => { if (!BAKED) BAKED = bake(); if (BAKED) { g.drawImage(BAKED, 0, 0); return; }
    const bw = W, bh = W * 9 / 16; g.drawImage(BG, 0, (H - bh) / 2 - 58, bw, bh); drawGrass(); };
  const drawGrass = () => {
    // the grass in front of the goal, in stripes that widen towards us
    const hz = 200; for (let i = 0; i < 9; i++) { const y0 = hz + (H - hz) * Math.pow(i / 9, 1.6), y1 = hz + (H - hz) * Math.pow((i + 1) / 9, 1.6);
      g.fillStyle = i % 2 ? '#2f8a3a' : '#3a9a44'; g.fillRect(0, Math.floor(y0), W, Math.ceil(y1 - y0) + 1); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, hz, W, 3);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
    const line = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    line([[0, L.gbot + 1], [W, L.gbot + 1]]);                                                // the goal line
    line([[L.cx - 190, L.gbot + 1], [L.cx - 215, 262], [L.cx + 215, 262], [L.cx + 190, L.gbot + 1]]);   // the six-yard box
    line([[L.cx - 330, L.gbot + 1], [L.cx - 420, H + 10]]); line([[L.cx + 330, L.gbot + 1], [L.cx + 420, H + 10]]);
    g.fillStyle = '#fff'; g.fillRect(L.spotX - 5, L.spotY + 3, 10, 3);
  };
  const drawGoalBack = () => {   // the net, behind the keeper
    const { gx0, gx1, gtop, gbot } = L, d = 16;
    g.fillStyle = 'rgba(10,20,15,.35)'; g.fillRect(gx0 + d, gtop + d * 0.6, gx1 - gx0 - 2 * d, gbot - gtop - d * 0.6);
    g.strokeStyle = 'rgba(235,240,245,.55)'; g.lineWidth = 1;
    for (let x = gx0 + d; x <= gx1 - d; x += 8) { g.beginPath(); g.moveTo(x + .5, gtop + d * 0.6); g.lineTo(x + .5, gbot); g.stroke(); }
    for (let y = gtop + d * 0.6; y <= gbot; y += 8) { g.beginPath(); g.moveTo(gx0 + d, y + .5); g.lineTo(gx1 - d, y + .5); g.stroke(); }
    for (const [ax, bx] of [[gx0, gx0 + d], [gx1, gx1 - d]]) for (let y = gtop; y <= gbot; y += 8) { g.beginPath(); g.moveTo(ax, y + .5); g.lineTo(bx, y * 0.98 + gtop * 0.02 + d * 0.5 + .5); g.stroke(); }
    for (let x = gx0; x <= gx1; x += 8) { g.beginPath(); g.moveTo(x + .5, gtop); g.lineTo(gx0 + d + (x - gx0) * (gx1 - gx0 - 2 * d) / (gx1 - gx0) + .5, gtop + d * 0.6); g.stroke(); }
  };
  const drawGoalFront = () => {   // posts and bar in front of everything that is in the goal
    const { gx0, gx1, gtop, gbot } = L;
    g.fillStyle = '#111'; g.fillRect(gx0 - 4, gtop - 4, 8, gbot - gtop + 4); g.fillRect(gx1 - 4, gtop - 4, 8, gbot - gtop + 4); g.fillRect(gx0 - 4, gtop - 4, gx1 - gx0 + 8, 8);
    g.fillStyle = '#f4f4f0'; g.fillRect(gx0 - 3, gtop - 3, 6, gbot - gtop + 3); g.fillRect(gx1 - 3, gtop - 3, 6, gbot - gtop + 3); g.fillRect(gx0 - 3, gtop - 3, gx1 - gx0 + 6, 6);
    g.fillStyle = '#c9c9c2'; g.fillRect(gx0 + 1, gtop + 1, 2, gbot - gtop - 1); g.fillRect(gx1 + 1, gtop + 1, 2, gbot - gtop - 1); g.fillRect(gx0 - 1, gtop + 1, gx1 - gx0 + 2, 2);
  };
  const drawBall = (x, y, r, tint) => {
    g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, r + 1, 0, 7); g.fill();
    g.fillStyle = tint || '#fff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x - r * 0.15, y - r * 0.1, r * 0.33, 0, 7); g.fill();
    for (const a of [0.6, 2.2, 3.8, 5.3]) { g.beginPath(); g.arc(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78, r * 0.2, 0, 7); g.fill(); }
  };
  const shadow = (x, y, w) => { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y, w, w * 0.28, 0, 0, 7); g.fill(); };

  // ---- particles ----
  const P = [];
  const emit = (x, y, n, kind) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 20 + Math.random() * 120;
    P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'fire' ? 60 : 0), life: 0.4 + Math.random() * 0.6, max: 1, kind }); } };
  const COL = { fire: ['#fff3a0', '#ffb02a', '#ff5a1a', '#c21a0a'], zap: ['#ffffff', '#bfe6ff', '#4aa8ff', '#1a4aff'], void: ['#ffd6ff', '#e08aff', '#a03aff', '#5a10b0'],
    grass: ['#8fdc7a', '#3a9a44'], confetti: ['#3fe060', '#ffffff', '#ffe14a', '#111111'] };
  const stepP = (dt) => { for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.life -= dt; if (p.life <= 0) { P.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.kind === 'confetti' ? 40 : p.kind === 'fire' ? -30 : 90) * dt; p.vx *= 0.98; } };
  const drawP = () => { for (const p of P) { const c = COL[p.kind] || COL.fire, k = Math.min(c.length - 1, Math.floor((1 - p.life) * c.length)); g.fillStyle = c[k];
    const s = p.kind === 'confetti' ? 3 : 2 + p.life * 3; g.fillRect(Math.round(p.x), Math.round(p.y), s, s); } };
  const bolts = [];   // lightning strokes in the net
  const drawBolts = () => { for (const b of bolts) { if (Math.random() < 0.3) continue; g.strokeStyle = Math.random() < 0.5 ? '#ffffff' : '#7cc4ff'; g.lineWidth = 2; g.beginPath();
    let x = b.x, y = L.gtop; g.moveTo(x, y); while (y < L.gbot) { y += 8 + Math.random() * 8; x += (Math.random() - 0.5) * 18; g.lineTo(x, y); } g.stroke(); } };

  // ---- game state ----
  const S = { on: false, mode: 'shootout', phase: 'idle', t: 0, round: 0, us: [], them: [], done: null,
    dotV: 0, dotH: 0, stopV: null, stopH: null, aim: [0, 0.5], pow: 0, power: null, roll: 0, rollT: 0, rollK: 0,
    ball: null, keeper: null, result: '', banner: '', bannerT: 0, flash: 0, shake: 0, netFire: 0, rings: [] };
  const KICKS = 5;
  const reset = () => { Object.assign(S, { round: 0, us: [], them: [] }); };
  const newKick = () => { Object.assign(S, { phase: 'intro', t: 0, drag: false, stopV: null, stopH: null, power: null, ball: null, result: '', netFire: 0, gfT: null, rings: [], dotV: 0, dotH: 0, aim: [0, 0.45] });
    S.keeper = { st: 'idle', side: 0, high: false, t: 0, save: false, x: 0, y: 0 }; bolts.length = 0; SND.whistle(); };
  // the dots ride the cross at a steady speed, back and forth
  const CROSS_V = 58, CROSS_H = 140, PERFECT = 7;
  const tri = (t, amp, sp) => { const p = (t * sp / (amp * 2)) % 2; return (p < 1 ? -1 + 2 * p : 3 - 2 * p) * amp; };

  // the keeper's choice and whether he gets there
  const keeperFor = (tx, ty, power, forced) => {
    const sideOf = (x) => (x < L.cx - 50 ? -1 : x > L.cx + 50 ? 1 : 0);
    const bs = sideOf(tx), high = ty < L.gtop + 38;
    let side; if (forced) side = bs === 0 ? (Math.random() < 0.5 ? -1 : 1) : -bs;
    else { const r = Math.random(); side = r < 0.42 ? bs : r < 0.75 ? (bs === 0 ? -1 : 0) : (bs === 0 ? 1 : -bs); }
    const reachX = L.cx + side * 105, reachY = high ? L.gtop + 26 : L.gbot - 28, R = 38 + (power < 0.4 ? 22 : 0) + (side === 0 ? 4 : 0);
    const save = !forced && Math.hypot((tx - reachX) * 0.85, ty - reachY) < R && sideOf(tx) === side;
    return { st: 'dive', side, high: high && side !== 0, t: 0, save, x: 0, y: 0 };
  };
  const shoot = (tx, ty, dur, power, kind) => {
    S.ball = { x0: L.spotX, y0: L.spotY - 6, tx, ty, t: 0, dur, kind, power, gone: false };
    S.keeper = keeperFor(tx, ty, power, !!kind); S.phase = 'fly'; S.t = 0; SND.kick();
    if (kind) { S.flash = 1; S.shake = 0.4; }
  };

  // ---- input ----
  const act = (lx, ly) => {
    ac();
    if (S.phase === 'cross1') { S.stopV = S.dotV; S.phase = 'cross2'; S.t = 0; Math.abs(S.stopV) <= PERFECT ? SND.perfect() : SND.stop(); return; }
    if (S.phase === 'cross2') { S.stopH = S.dotH; S.phase = 'judge'; S.t = 0; Math.abs(S.stopH) <= PERFECT ? SND.perfect() : SND.stop(); return; }
    if (S.phase === 'aim') {
      if (lx != null) setAim(lx, ly);
      S.phase = 'force'; S.t = 0; SND.stop(); return; }
    if (S.phase === 'force') { S.phase = 'run'; S.t = 0; S.pow = powNow(); return; }
    if (S.phase === 'end') { if (S.mode === 'shootout') { reset(); newKick(); } }
  };
  const setAim = (lx, ly) => { const u = (lx - L.cx) / ((L.gx1 - L.gx0) / 2 + 20), v = (L.gbot - ly) / (L.gbot - L.gtop + 20); S.aim = [Math.max(-1.15, Math.min(1.15, u)), Math.max(0, Math.min(1.2, v))]; };
  const powNow = () => tri(S.t + 0.55, 0.5, 1.15) + 0.5;
  const loc = (e) => { const r = cv.getBoundingClientRect(), sc = Math.min(r.width / W, r.height / H), ox = r.left + (r.width - W * sc) / 2, oy = r.top + (r.height - H * sc) / 2; return [(e.clientX - ox) / sc, (e.clientY - oy) / sc]; };
  // aiming: the reticle jumps under the finger, follows it while dragging, and the kick is aimed where the finger lets go
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const [x, y] = loc(e);
    if (S.phase === 'aim') { try { cv.setPointerCapture(e.pointerId); } catch (_) {} S.drag = true; setAim(x, y); SND.tick(); return; }
    act(x, y); });
  cv.addEventListener('pointermove', (e) => { if (S.drag && S.phase === 'aim') { const [x, y] = loc(e); setAim(x, y); } });
  const lift = (e) => { if (!S.drag) return; S.drag = false; if (S.phase === 'aim') { const [x, y] = loc(e); setAim(x, y); act(); } };
  cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
  addEventListener('keydown', (e) => { if (root.hidden) return; e.preventDefault(); e.stopPropagation(); if (e.repeat) return;
    if (e.code === 'Escape' && S.mode === 'shootout') { close(); return; }
    if (S.phase === 'aim' && /Arrow|Key[WASD]/.test(e.code)) { const d = { ArrowLeft: [-0.25, 0], KeyA: [-0.25, 0], ArrowRight: [0.25, 0], KeyD: [0.25, 0], ArrowUp: [0, 0.25], KeyW: [0, 0.25], ArrowDown: [0, -0.25], KeyS: [0, -0.25] }[e.code];
      S.aim = [Math.max(-1.15, Math.min(1.15, S.aim[0] + d[0])), Math.max(0, Math.min(1.2, S.aim[1] + d[1]))]; SND.tick(); return; }
    if (['Space', 'Enter', 'KeyK', 'KeyX', 'KeyJ'].includes(e.code)) act(); }, true);
  $('penBack').addEventListener('click', () => close());

  // ---- the frame timings for the three powers: [sheet, frames, seconds per frame, release index] ----
  const POWERS = {
    smok: { name: 'SMOK', col: '#ff5a1a', ink: '#5a1408', sheet: 'dragon', seq: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], dt: [.12, .12, .12, .14, .14, .14, .16, .2, .2, .16, .1, .1, .1, .1], rel: 9, fx: 'fire', snd: 'roar' },
    zap: { name: 'ELEKTRYCZNY STRZAŁ', col: '#4aa8ff', ink: '#0a1a5a', sheet: 'electric', seq: [0, 1, 2, 3, 4, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14], dt: [.12, .1, .1, .1, .1, .08, .08, .12, .1, .1, .1, .08, .08, .08, .1, .5], rel: 12, fx: 'zap', snd: 'zap' },
    halland: { name: 'HALLAND', col: '#c06aff', ink: '#2a0a5a', sheet: 'halland', seq: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 6, 7, 8, 9, 10, 11, 12], dt: [.25, .14, .14, .14, .12, .1, .1, .1, .1, .1, .09, .09, .09, .09, .09, .08, .08], rel: 16, fx: 'void', snd: 'hum' },
  };
  const ORDER = ['smok', 'zap', 'halland'];

  // ---- update ----
  const update = (dt) => {
    S.t += dt; CA += ((S.phase === 'fly' || S.phase === 'powerfly' || S.phase === 'power' || S.shake > 0 ? 6 : 3) - CA) * Math.min(1, dt * 6); S.flash = Math.max(0, S.flash - dt * 3); S.shake = Math.max(0, S.shake - dt); if (S.bannerT > 0) S.bannerT -= dt; stepP(dt);
    if (S.netFire > 0) { S.netFire -= dt; for (let i = 0; i < 3; i++) { const r = Math.random(); const x = r < 0.25 ? L.gx0 : r < 0.5 ? L.gx1 : L.gx0 + Math.random() * (L.gx1 - L.gx0), y = r < 0.5 ? L.gtop + Math.random() * (L.gbot - L.gtop) : (Math.random() < 0.4 ? L.gtop : L.gtop + Math.random() * (L.gbot - L.gtop));
      P.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 50, life: 0.5 + Math.random() * 0.5, kind: 'fire' }); } }
    for (const r of S.rings) r.t += dt; S.rings = S.rings.filter((r) => r.t < 1);
    for (const b of bolts) b.life -= dt; for (let i = bolts.length - 1; i >= 0; i--) if (bolts[i].life <= 0) bolts.splice(i, 1);
    const K = S.keeper; if (K) K.t += dt;
    switch (S.phase) {
      case 'intro': if (S.t > 0.9) { S.phase = 'cross1'; S.t = 0; } break;
      case 'cross1': S.dotV = tri(S.t, CROSS_V, 150); break;
      case 'cross2': S.dotH = tri(S.t, CROSS_H, 205); break;
      case 'judge': if (S.t > 0.8) { const ok = Math.abs(S.stopV) <= PERFECT && Math.abs(S.stopH) <= PERFECT;
        if (ok) { S.phase = 'roll'; S.t = 0; S.rollK = Math.floor(Math.random() * 3); S.roll = 0; S.rollT = 0; S.rollN = 15 + S.rollK; S.roll = 0; }
        else { S.phase = 'aim'; S.t = 0; } } break;
      case 'roll': S.rollT -= dt; if (S.rollN > 0 && S.rollT <= 0) { S.roll = (S.roll + 1) % 3; S.rollN--; S.rollT = 0.05 + (14 - Math.min(14, S.rollN)) * 0.0 + (S.rollN < 6 ? (6 - S.rollN) * 0.06 : 0); SND.roll(); if (!S.rollN) { SND.perfect(); S.t = 0; } }
        if (!S.rollN && S.t > 0.9) { S.power = ORDER[S.roll]; S.phase = 'power'; S.t = 0; S.pi = 0; S.pt = 0; SND[POWERS[S.power].snd](); } break;
      case 'power': { const Pw = POWERS[S.power]; S.pt += dt; while (S.pi < Pw.seq.length - 1 && S.pt > Pw.dt[S.pi]) { S.pt -= Pw.dt[S.pi]; S.pi++;
          if (S.pi === Pw.rel) { const tx = L.cx + (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 30), ty = L.gtop + 14 + Math.random() * 30; shoot(tx, ty, 0.36, 1, S.power); S.phase = 'powerfly'; } }
        if (Math.random() < 0.5) { const [x, y] = atSpot(Pw.sheet); emit(x + M[Pw.sheet].w * SC * (0.3 + Math.random() * 0.4), y + M[Pw.sheet].h * SC * (0.2 + Math.random() * 0.6), 1, Pw.fx); } break; }
      case 'powerfly': case 'fly': {
        if (S.phase === 'powerfly') { const Pw = POWERS[S.power]; S.pt += dt; while (S.pi < Pw.seq.length - 1 && S.pt > Pw.dt[S.pi]) { S.pt -= Pw.dt[S.pi]; S.pi++; } }
        const B = S.ball; B.t += dt; const k = Math.min(1, B.t / B.dur);
        if (B.kind && Math.random() < 0.9) { const [x, y] = ballAt(B, k); emit(x, y, 3, POWERS[B.kind].fx); }
        if (!K.save && k >= 1 && !B.gone) arrive();
        if (K.save && k >= 0.9 && !B.gone) { B.gone = true; S.result = 'save'; SND.save(); banner('OBRONA!', '#ffe14a'); S.phase = 'after'; S.t = 0; S.shake = 0.2; }
        break; }
      case 'run': { // the run-up: frames 0..13, the ball leaves at frame 9
        S.ki = Math.min(13, Math.floor(S.t * 15)); if (S.ki >= 10 && !S.ball) { const sp = S.pow, over = sp > 0.86 ? (sp - 0.86) * 260 : 0, jit = 6 + sp * 14;
          const tx = L.cx + S.aim[0] * ((L.gx1 - L.gx0) / 2) + (Math.random() - 0.5) * jit, ty = L.gbot - 8 - S.aim[1] * (L.gbot - L.gtop - 12) - over + (Math.random() - 0.5) * jit * 0.6;
          shoot(tx, ty, 0.62 - sp * 0.3, sp, null); S.phase = 'fly'; } break; }
      case 'after': if (S.t > 2.2) next(); break;
    }
  };
  const ballAt = (B, k) => { const e = 1 - Math.pow(1 - k, 1.6), x = B.x0 + (B.tx - B.x0) * e, y = B.y0 + (B.ty - B.y0) * e - Math.sin(Math.PI * k) * (B.kind ? 10 : 22); return [x, y, 6 - 2.6 * e]; };
  const arrive = () => { const B = S.ball; B.gone = true; S.phase = 'after'; S.t = 0;
    const inside = B.tx > L.gx0 + 3 && B.tx < L.gx1 - 3 && B.ty > L.gtop + 3 && B.ty < L.gbot;
    if (!inside) { S.result = 'miss'; SND.groan(); banner(B.ty <= L.gtop + 3 ? 'NAD POPRZECZKĄ!' : 'OBOK!', '#ff8a6a'); return; }
    S.result = 'goal'; S.gfT = 0; SND.net(); SND.crowd(); banner('GOOOL!', '#3fe060'); S.shake = 0.35; B.inNet = [B.tx, B.ty];
    emit(B.tx, B.ty, 26, B.kind ? POWERS[B.kind].fx : 'grass'); for (let i = 0; i < 40; i++) P.push({ x: Math.random() * W, y: -10, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 80, life: 2.2, kind: 'confetti' });
    if (B.kind === 'smok') { S.netFire = 3.2; SND.boom(); S.flash = 1; }
    if (B.kind === 'zap') { for (let i = 0; i < 7; i++) bolts.push({ x: L.gx0 + 10 + Math.random() * (L.gx1 - L.gx0 - 20), life: 1.4 }); S.flash = 1; }
    if (B.kind === 'halland') { S.rings.push({ x: B.tx, y: B.ty, t: 0 }, { x: B.tx, y: B.ty, t: -0.25 }, { x: B.tx, y: B.ty, t: -0.5 }); SND.boom(); }
    if (B.kind) S.keeper.knocked = true;
  };
  const banner = (txt, col) => { S.banner = txt; S.bannerCol = col; S.bannerT = 1.8; };
  // after a kick: the CPU answers (simulated), then the next round or the end
  const next = () => {
    if (S.mode === 'single') { const goal = S.result === 'goal'; close(); S.done && S.done(goal); return; }
    S.us.push(S.result === 'goal'); const cpu = Math.random() < 0.7; S.them.push(cpu); S.cpuT = 1.6; S.cpuGoal = cpu;
    const a = S.us.filter(Boolean).length, b = S.them.filter(Boolean).length, n = S.us.length;
    const left = Math.max(0, KICKS - n), decided = n <= KICKS ? (a + left < b || b + left < a) : a !== b;
    if (decided || (n >= KICKS && a !== b)) { S.phase = 'end'; S.t = 0; S.win = a > b; { let best = 0; try { best = +localStorage.getItem('pen_best') || 0; } catch (e) {} const rec = a > best; if (rec) try { localStorage.setItem('pen_best', a); } catch (e) {} window.TRAIN?.('karne', { goals: a, win: a > b, record: rec }); } setTimeout(() => (S.win ? SND.crowd() : SND.groan()), 900); return; }
    newKick(); S.phase = 'cpu'; S.t = 0;
  };

  // ---- draw ----
  const drawKeeper = () => {
    if (!M) return; const K = S.keeper, gk1 = M.gk1, gk2 = M.gk2; let sheet = 'gk2', fi = Math.floor(performance.now() / 260) % 5, dx = 0, dy = 0, flip = false;
    if (S.phase === 'cpu' || S.phase === 'end') return;
    if (K && K.st === 'dive') { const k = Math.min(1, K.t / 0.42), e = 1 - Math.pow(1 - k, 2); flip = K.side < 0;
      if (K.side === 0) { sheet = 'gk1'; fi = K.save ? (S.ball && S.ball.gone ? 11 : 10) : 3; }
      else if (K.high) { sheet = 'gk2'; fi = K.save && S.ball && S.ball.gone ? Math.min(9, 8 + Math.floor((K.t - 0.38) * 6)) : [5, 6, 7][Math.min(2, Math.floor(k * 3))]; dx = K.side * 88 * e; dy = -Math.sin(Math.PI * Math.min(1, K.t / 0.9)) * 26; }
      else { sheet = 'gk1'; fi = K.save && S.ball && S.ball.gone ? Math.min(9, 7 + Math.floor((K.t - 0.38) * 5)) : [5, 6, 6][Math.min(2, Math.floor(k * 3))]; dx = K.side * 98 * e; dy = -Math.sin(Math.PI * Math.min(1, K.t / 0.7)) * 12; }
      if (K.knocked && K.t > 0.45) { dy += Math.min(10, (K.t - 0.45) * 30); } }
    const m = M[sheet], feet = (m.feet || m.h), x = L.cx - m.w / 2 + dx, y = L.gbot + 5 - feet + dy;
    shadow(L.cx + dx, L.gbot + 5, 18); frame(sheet, fi, x, y, { flip });
  };
  const drawShooter = () => {
    if (!M) return; let sheet = S.kick || 'kick', fi = 0;
    if (S.phase === 'run' || (S.phase === 'fly' && !S.power) || (S.phase === 'after' && !S.power)) fi = S.phase === 'run' ? S.ki : 13;
    if (S.power) { const Pw = POWERS[S.power]; sheet = Pw.sheet; fi = Pw.seq[S.pi || 0]; }
    const [x, y] = atSpot(sheet), m = M[sheet];
    let alpha = 1, ox = 0, oy = 0;
    if (S.power === 'smok' && S.pi >= 10) { const k = (S.pi - 10 + S.pt / 0.1) / 4; ox = k * 60; oy = -k * 90; alpha = Math.max(0, 1 - k * 0.8); }
    if (S.power === 'halland') { oy = -Math.min(30, (S.pi || 0) * 2.2); if (S.phase === 'after') alpha = Math.max(0, 1 - S.t * 1.5); }
    if (S.power === 'smok' && S.phase === 'after') alpha = 0;
    shadow(L.spotX - 30, L.spotY + 8, 30);
    frame(sheet, fi, x + ox, y + oy, { alpha, scale: SC });
    const ballOnSpot = S.phase !== 'fly' && S.phase !== 'after' && S.phase !== 'powerfly' && !(S.phase === 'run' && S.ki >= 9);
    if (sheet === (S.kick || 'kick') && ballOnSpot && S.phase !== 'run') return;   // the drawn frames carry their own ball before the kick
  };
  const drawCross = () => {
    const cx = L.cx, cy = L.crossY, glow = (S.phase === 'cross1' || S.phase === 'cross2');
    g.save(); g.globalAlpha = 0.92;
    const bar = (x, y, w, h) => { g.fillStyle = '#000'; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle = '#fff'; g.fillRect(x, y, w, h); };
    bar(cx - 2, cy - CROSS_V - 8, 4, CROSS_V * 2 + 16); bar(cx - CROSS_H - 8, cy - 2, CROSS_H * 2 + 16, 4);
    g.strokeStyle = '#000'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, PERFECT + 4, 0, 7); g.stroke(); g.strokeStyle = '#ffe14a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, PERFECT + 4, 0, 7); g.stroke();
    const dot = (x, y, col, live) => { g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
      if (live) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 11 + Math.sin(performance.now() / 80) * 2, 0, 7); g.stroke(); } };
    const v = S.stopV != null ? S.stopV : S.dotV, h = S.stopH != null ? S.stopH : S.dotH;
    dot(cx, cy + v, Math.abs(v) <= PERFECT && S.stopV != null ? '#3fe060' : '#ff4a3a', S.phase === 'cross1');
    if (S.phase !== 'cross1') dot(cx + h, cy, Math.abs(h) <= PERFECT && S.stopH != null ? '#3fe060' : '#4aa8ff', S.phase === 'cross2');
    g.restore(); void glow;
  };
  const txt = (s, x, y, size, col = '#fff', align = 'center') => { g.font = `700 ${size}px "Pixelify Sans", monospace`; g.textAlign = align; g.textBaseline = 'middle';
    g.fillStyle = '#000'; for (const [a, b] of [[2, 2], [-2, 2], [2, -2], [-2, -2], [0, 3]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const drawHud = () => {
    if (S.mode === 'shootout') {   // two rows of five dots, like a TV score bug
      const x0 = 12, y0 = 12; g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(x0, y0, 186, 46); g.strokeStyle = '#3a3d44'; g.lineWidth = 2; g.strokeRect(x0, y0, 186, 46);
      const row = (name, col, arr, y) => { txt(name, x0 + 24, y, 13, col); const n = Math.max(KICKS, arr.length);
        for (let i = 0; i < Math.min(n, 8); i++) { const x = x0 + 54 + i * 16; g.fillStyle = '#000'; g.fillRect(x - 6, y - 6, 12, 12);
          g.fillStyle = i >= arr.length ? '#3a3d44' : arr[i] ? '#3fe060' : '#e8361f'; g.fillRect(x - 5, y - 5, 10, 10); } };
      row('CUI', '#3fe060', S.us, y0 + 14); row('FIO', '#c9a2ff', S.them, y0 + 32);
    }
    const hint = { intro: '', cross1: 'ZATRZYMAJ CZERWONĄ KROPKĘ NA ŚRODKU', cross2: 'TERAZ NIEBIESKĄ', judge: '', aim: 'DOTKNIJ BRAMKI I PRZECIĄGNIJ CELOWNIK', force: 'ZATRZYMAJ SIŁĘ', roll: 'LOSOWANIE MOCY!' }[S.phase];
    if (hint) txt(hint, W / 2, H - 16, 16, '#ffe14a');
    if (S.phase === 'intro') txt(S.mode === 'single' ? 'RZUT KARNY!' : `SERIA ${S.us.length + 1}`, W / 2, 70, 30, '#fff');
    if (S.phase === 'judge') { const ok = Math.abs(S.stopV) <= PERFECT && Math.abs(S.stopH) <= PERFECT; txt(ok ? 'IDEALNIE!' : 'PRAWIE...', W / 2, 70, 32, ok ? '#3fe060' : '#ff8a6a'); }
    if (S.phase === 'aim' || S.phase === 'force' || S.phase === 'run') { const [u, v] = S.aim, x = Math.round(L.cx + u * ((L.gx1 - L.gx0) / 2)), y = Math.round(L.gbot - 8 - v * (L.gbot - L.gtop - 12));
      const aiming = S.phase === 'aim', c = 3, R = aiming ? 6 + (Math.floor(performance.now() / 180) % 2) : 5, col = aiming ? '#ffe14a' : (Math.floor(performance.now() / 120) % 2 ? '#ff4a3a' : '#fff');
      const blk = (i, j, k) => { g.fillStyle = k; g.fillRect(x + i * c - c / 2, y + j * c - c / 2, c, c); };
      const ring = []; for (let a = 0; a < 6.283; a += 0.12) ring.push([Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R)]);
      const arms = []; for (let k = R - 2; k <= R + 3; k++) arms.push([k, 0], [-k, 0], [0, k], [0, -k]);
      for (const [i, j] of [...ring, ...arms]) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blk(i + di, j + dj, '#000');
      for (const [i, j] of [...ring, ...arms]) blk(i, j, col); blk(0, 0, col);
      if (aiming && !S.drag) txt('PRZECIĄGNIJ', x, y + (R + 8) * c, 12, '#ffe14a'); }
    if (S.phase === 'force') { const p = powNow(), N = 16, sh = 9, gap = 2, xr = W - 18, y0 = 96, H0 = N * (sh + gap);
      // a wedge of pixel blocks: narrow and green at the bottom, wide and red at the top
      const COLS = ['#2fb84a', '#3fe060', '#6ee85a', '#9aec4a', '#c8ee3a', '#ffe14a', '#ffe14a', '#ffc21a', '#ffa21a', '#ff8a1f', '#ff6a1f', '#ff4a1f', '#f0361f', '#e02a1a', '#c81e14', '#c81e14'];
      const lit = Math.round(p * N), blink = Math.floor(performance.now() / 110) % 2;
      for (let i = 0; i < N; i++) { const w = 8 + Math.round(i * 2.2) * 2, y = y0 + H0 - (i + 1) * (sh + gap), x = xr - w;
        g.fillStyle = '#000'; g.fillRect(x - 3, y - 3, w + 6, sh + 6); }
      for (let i = 0; i < N; i++) { const w = 8 + Math.round(i * 2.2) * 2, y = y0 + H0 - (i + 1) * (sh + gap), x = xr - w, on = i < lit;
        g.fillStyle = on ? COLS[i] : '#2a2a36'; g.fillRect(x, y, w, sh);
        if (on) { g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x, y, w, 2); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + sh - 2, w, 2); }
        if (i === lit - 1 && blink) { g.fillStyle = '#fff'; g.fillRect(x, y, w, sh); } }
      // the "too strong" line: blocks above it fly over the bar
      const ym = y0 + H0 - Math.round(N * 0.86) * (sh + gap) - 1; g.fillStyle = '#fff'; for (let x = xr - 50; x < xr + 6; x += 6) g.fillRect(x, ym, 4, 3);
      const yp = y0 + H0 - lit * (sh + gap) + 2, xa = xr - (8 + Math.round(Math.max(0, lit - 1) * 2.2) * 2) - 14; g.fillStyle = '#000'; g.fillRect(xa - 2, yp - 2, 12, 11); g.fillStyle = '#ffe14a'; g.fillRect(xa, yp, 4, 7); g.fillRect(xa + 4, yp + 2, 4, 3);
      txt('SIŁA', xr - 26, y0 - 16, 12, '#fff'); }
    if (S.phase === 'roll' || ((S.phase === 'power') && S.t < 0.5)) { const cw = 150, gap = 10, tot = cw * 3 + gap * 2, x0 = W / 2 - tot / 2, y = 60;
      ORDER.forEach((k, i) => { const Pw = POWERS[k], sel = S.roll === i || (S.phase === 'power' && S.power === k), x = x0 + i * (cw + gap);
        g.fillStyle = sel ? Pw.col : 'rgba(0,0,0,.75)'; g.fillRect(x, y, cw, 50); g.strokeStyle = sel ? '#fff' : Pw.col; g.lineWidth = 3; g.strokeRect(x, y, cw, 50);
        txt(Pw.name, x + cw / 2, y + 25, k === 'zap' ? 13 : 20, sel ? '#fff' : Pw.col); }); }
    if (S.phase === 'power' || S.phase === 'powerfly') txt(POWERS[S.power].name + '!', W / 2, 48, 28, POWERS[S.power].col);
    if (S.bannerT > 0) { const k = Math.min(1, (1.8 - S.bannerT) * 6), s = S.banner === 'GOOOL!' ? 64 : 40; txt(S.banner, W / 2, 72, Math.round(s * (0.6 + 0.4 * k)), S.bannerCol); }
    if (S.phase === 'cpu') { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(0, 0, W, H); txt('FIOLETOWI STRZELAJĄ…', W / 2, 140, 22, '#c9a2ff');
      if (S.t > 0.8) txt(S.cpuGoal ? 'GOL' : 'PUDŁO!', W / 2, 186, 40, S.cpuGoal ? '#c9a2ff' : '#3fe060'); if (S.t > 1.7) { S.phase = 'intro'; S.t = 0; SND.whistle(); } }
    if (S.phase === 'end') { g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(0, 0, W, H); const a = S.us.filter(Boolean).length, b = S.them.filter(Boolean).length;
      txt(S.win ? 'WYGRANA!' : 'PRZEGRANA', W / 2, 120, 48, S.win ? '#3fe060' : '#ff6a4a'); txt(`${a} : ${b}`, W / 2, 178, 40, '#fff'); txt('DOTKNIJ, ŻEBY ZAGRAĆ JESZCZE RAZ', W / 2, 236, 15, '#ffe14a'); }
  };
  const draw = () => {
    g.save(); if (S.shake > 0) g.translate((Math.random() - 0.5) * 10 * S.shake, (Math.random() - 0.5) * 10 * S.shake);
    drawPitch(); drawGoalBack();
    const B = S.ball, behind = B && B.inNet;
    if (behind) drawBall(B.inNet[0], B.inNet[1], 3.6, B.kind ? POWERS[B.kind].col : null);
    drawKeeper(); drawGoalFront();
    if (S.gfT != null && GFIRE.complete) { S.gfT += 1 / 60; const T = S.gfT, f = T < 0.8 ? 4 + (T / 0.8 * 8 | 0) : 12 + ((T - 0.8) * 10 | 0) % 18;
      const sx = (L.gx1 - L.gx0) / 190.5, sy = (L.gbot - L.gtop) / 86.5; g.imageSmoothingEnabled = false;
      g.drawImage(GFIRE, f * 240, 0, 240, 145, L.gx0 - 24.5 * sx, L.gtop - 56 * sy, 240 * sx, 145 * sy); }
    drawBolts();
    for (const r of S.rings) if (r.t > 0) { g.strokeStyle = `rgba(200,110,255,${1 - r.t})`; g.lineWidth = 4; g.beginPath(); g.ellipse(r.x, r.y, 20 + r.t * 160, 8 + r.t * 60, 0, 0, 7); g.stroke(); }
    drawShooter();
    if (S.phase === 'cross1' || S.phase === 'cross2' || S.phase === 'judge') drawCross();
    if (B && !B.gone) { const [x, y, r] = ballAt(B, Math.min(1, B.t / B.dur)); drawBall(x, y, r, B.kind ? POWERS[B.kind].col : null);
      if (B.kind) { g.globalCompositeOperation = 'lighter'; g.fillStyle = POWERS[B.kind].col; g.globalAlpha = 0.5; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } }
    if (B && B.gone && !B.inNet && S.result === 'miss') { /* gone over / wide */ }
    drawP();
    g.restore();
    if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(0.85, S.flash)})`; g.fillRect(0, 0, W, H); }
    drawHud();
  };
  let last = 0, raf = 0;
  const loop = (now) => { if (!S.on) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; update(dt); draw(); raf = requestAnimationFrame(loop); };
  const open = (mode, done) => { S.mode = mode; S.done = done; root.hidden = false; root.classList.toggle('single', mode === 'single'); layout(); reset(); newKick(); S.on = true; last = 0; try { window.MATCH_MUSIC && window.MATCH_MUSIC.stop(); } catch (e) {} MUS.currentTime = 0; MUS.play().catch(() => {}); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
  const close = () => { MUS.pause(); if (S.mode === 'single') { try { window.MATCH_MUSIC && window.MATCH_MUSIC.start(); } catch (e) {} } S.on = false; cancelAnimationFrame(raf); root.hidden = true; if (S.mode === 'shootout' && S.onExit) S.onExit(); };
  const kickSheet = (n) => ({ 14: 'kick14', 10: 'kick10', 7: 'kick7' }[n] || 'kick');
  window.PEN = { get _S() { return S; }, start(onExit, num) { S.kick = kickSheet(num); S.onExit = onExit; open('shootout', null); }, single(done, num) { S.kick = kickSheet(num || window.CAPTAIN); S.onExit = null; open('single', done); }, get open() { return !root.hidden; },
    _S: S };
})();
