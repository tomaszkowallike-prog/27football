// ---- PALUCHY (hidden): 14 feet in holey socks lie in a circle on the locker-room floor. Big toes pop out of the holes
// one after another (an arrow points at each first); repeat the order by tapping the feet. Every round adds one toe.
// A correct tap shows a little icon in the middle of the floor. Reached from the dark boots in the locker with shirt 14.
(() => {
  const $ = (id) => document.getElementById(id);
  const EN = () => window.LANG === 'en', T = (pl, en) => (EN() ? en : pl);
  const root = document.createElement('div'); root.id = 'paluchy'; root.hidden = true;
  root.innerHTML = '<canvas id="palCv"></canvas><button class="ibtn" id="palBack">✕ MENU</button>';
  document.body.appendChild(root);
  const st = document.createElement('style');
  st.textContent = `#paluchy { position: fixed; inset: 0; z-index: 18; background: #2a0f55; touch-action: none; user-select: none; -webkit-user-select: none; }
    #paluchy[hidden] { display: none; } #palCv { width: 100%; height: 100%; display: block; }
    #palBack { right: max(10px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); z-index: 2; }`;
  document.head.appendChild(st);
  const cv = $('palCv'), g = cv.getContext('2d');
  const BG = new Image(); BG.src = 'paluchy_bg.jpg?v=1';
  // tilt-shift: the legs and bodies round the edge are softly blurred, the toes in the ring stay sharp
  let BGT = null; BG.onload = () => { try { const c = document.createElement('canvas'); c.width = BG.width; c.height = BG.height; const x = c.getContext('2d');
    const b = document.createElement('canvas'); b.width = c.width; b.height = c.height; const bx = b.getContext('2d'); bx.filter = 'blur(7px)'; bx.drawImage(BG, 0, 0); bx.filter = 'none';
    const k = BG.width / 1672; bx.globalCompositeOperation = 'destination-in'; bx.save(); bx.translate(836 * k, 500 * k); bx.scale(1, 290 / 445);
    const gr = bx.createRadialGradient(0, 0, 445 * 1.12 * k, 0, 0, 445 * 1.55 * k); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    bx.fillStyle = gr; bx.fillRect(-3000, -3000, 6000, 6000); bx.restore();
    x.drawImage(BG, 0, 0); x.drawImage(b, 0, 0); BGT = c; } catch (e) { BGT = null; } };
  const TOES = new Image(); TOES.src = 'paluchy_toes.png?v=1';
  const DOG = new Image(); DOG.src = 'dog.png';   // the locker-room dog; frame 3 is the happy face with the tongue out
  const BW = 1672, BH = 941, CX = 836, CY = 500, CELL = 80;
  // where each big toe comes out (picture units), in the order of the sprite sheet: red, yellow, green, orange, blue, white, purple pairs
  const FEET = [[519, 244], [394, 348], [764, 248], [907, 249], [1156, 245], [1277, 349], [391, 465], [391, 577], [1281, 465], [1281, 576], [530, 686], [680, 781], [1155, 686], [998, 789]]
    .map(([x, y], i) => { const dx = x - CX, dy = y - CY, l = Math.hypot(dx, dy); return { x, y, ux: dx / l, uy: dy / l, i }; });
  // one note per foot (pentatonic, so any order sounds fine)
  const NOTES = [392, 440, 523, 587, 659, 784, 880, 330, 294, 262, 1047, 988, 698, 1175];

  // ---- sound ----
  let AC = null;
  const tone = (f0, f1, d, type = 'square', v = 0.05, delay = 0) => { if (window.CFG && window.CFG.sfx === false) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + delay, o = AC.createOscillator(), gn = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) {} };
  const pop = (i) => { const f = NOTES[i]; tone(f * 0.7, f, 0.05, 'square', 0.05); tone(f, f, 0.18, 'triangle', 0.07, 0.04); };
  const vib = (p) => { try { if (!window.CFG || window.CFG.vib !== false) navigator.vibrate?.(p); } catch (e) {} };

  // ---- pixel icons for the middle of the floor ----
  const ICONS = [
    { c: { k: '#10301a', g: '#3fe060' }, p: ['.........kk', '........kgk', '.......kggk', 'k.....kggk.', 'kk...kggk..', 'kgk.kggk...', 'kggkggk....', '.kgggk.....', '..kgk......', '...k.......'] },
    { c: { k: '#3a2400', y: '#ffd21a', w: '#fff6b0' }, p: ['.....k.....', '....kyk....', '....kyk....', 'kkkkywykkkk', 'kyyyyyyyyyk', '.kyyyyyyyk.', '..kyyyyyk..', '.kyyykyyyk.', '.kyyk.kyyk.', 'kyk.....kyk', 'kk.......kk'] },
    { c: { k: '#000', w: '#ffffff', b: '#1a1030' }, p: ['...kkkkk...', '..kwwbwwk..', '.kwwbbbwwk.', 'kwbwwbwwbwk', 'kbbbwwwbbbk', 'kwbwwwwwbwk', 'kwwbbwbbwwk', '.kwbbwbbwk.', '..kwwwwwk..', '...kkkkk...'] },
    { c: { k: '#2a0010', r: '#ff3a4a', w: '#ffd0d8' }, p: ['.kkk...kkk.', 'krwrk.krrrk', 'krwrrkrrrrk', 'krrrrrrrrrk', 'krrrrrrrrrk', '.krrrrrrrk.', '..krrrrrk..', '...krrrk...', '....krk....', '.....k.....'] },
    { c: { k: '#2a1000', y: '#ffb31a', w: '#fff3a0' }, p: ['......kkk', '.....kwyk', '....kwyk.', '...kwyk..', '..kwyykkk', '.kyyyyyyk', 'kkkkyyyk.', '...kyyk..', '..kyyk...', '.kyk.....', 'kk.......'] },
  ];
  const icon = (ic, x, y, s) => { const h = ic.p.length, w = ic.p[0].length; x -= (w * s) / 2; y -= (h * s) / 2;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const ch = ic.p[r][c]; if (ch === '.') continue; g.fillStyle = ic.c[ch]; g.fillRect(Math.round(x + c * s), Math.round(y + r * s), Math.ceil(s), Math.ceil(s)); } };

  // ---- state ----
  const S = { on: false, phase: 'intro', seq: [], step: 0, t: 0, out: {}, arrow: -1, best: 0, round: 0, icons: [], msg: '', msgC: '#fff', msgT: 0, coins: 0, rec: false, smell: 0 };
  try { S.best = +localStorage.getItem('paluchy_best') || 0; } catch (e) {}
  let W = 0, H = 0, DPR = 1, sc = 1, ox = 0, oy = 0;
  const layout = () => { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // cover the screen, but never cut off a toe at the top or bottom
    const need = Math.max(...FEET.map((f) => Math.abs(f.y - BH / 2))) + 60; sc = Math.max(Math.min(W / BW, H / BH), Math.min(Math.max(W / BW, H / BH), H / 2 / need));
    ox = (W - BW * sc) / 2; oy = (H - BH * sc) / 2; };
  addEventListener('resize', () => { if (!root.hidden) layout(); });
  const TS = (x, y) => [x * sc + ox, y * sc + oy];

  // timings shrink a little every round
  const speed = () => Math.max(0.5, 1 - (S.seq.length - 3) * 0.05);
  const LEAD = () => 0.32 * speed(), SHOW = () => 0.5 * speed(), GAP = () => 0.18 * speed();
  const say = (t, c = '#fff', d = 1.2) => { S.msg = t; S.msgC = c; S.msgT = d; };
  const toeOut = (i, d = 0.35) => { S.out[i] = { l: d, a: 0 }; };

  const newGame = () => { S.seq = []; for (let k = 0; k < 2; k++) addStep(); S.round = 0; S.coins = 0; S.rec = false; S.smell = 0; S.icons = []; nextRound(); };
  const addStep = () => { let n; do { n = Math.floor(Math.random() * FEET.length); } while (S.seq.length && n === S.seq[S.seq.length - 1]); S.seq.push(n); };
  const nextRound = () => { addStep(); S.round++; S.step = 0; S.shownK = -1; S.t = -0.9; S.phase = 'show'; S.arrow = -1; say(T('PATRZ!', 'WATCH!'), '#ffe14a', 0.9); };

  const tapFoot = (i) => { if (S.phase !== 'play') return;
    toeOut(i, 0.3); pop(i);
    if (i === S.seq[S.step]) { S.icons.push({ ic: ICONS[S.step % ICONS.length], t: 0 }); S.step++; vib(15);
      if (S.step >= S.seq.length) { S.phase = 'good'; S.t = 0; S.icons = []; say(T('DOBRZE!', 'GREAT!'), '#3fe060', 1);
        [523, 659, 784, 1047].forEach((f, k) => tone(f, f, 0.1, 'square', 0.05, 0.15 + k * 0.08));
        if (S.round > S.best) { S.best = S.round; S.rec = true; try { localStorage.setItem('paluchy_best', S.best); } catch (e) {} } } }
    else { S.phase = 'bad'; S.t = 0; S.smell = 0.01; S.icons = []; FEET.forEach((f) => toeOut(f.i, 2.2)); S.right = S.seq[S.step];
      tone(220, 70, 0.45, 'sawtooth', 0.05); tone(160, 60, 0.5, 'square', 0.03, 0.1); vib([60, 40, 120]); say(T('PUDŁO!', 'OOPS!'), '#ff5a4a', 1.6); } };

  const finish = () => { const done = S.round - 1; S.coins = Math.min(30, done * 2) + (S.rec && done > 0 ? 10 : 0);
    if (S.coins && window.PROG) window.PROG.add(S.coins); S.phase = 'end'; };

  // ---- input ----
  const P = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const btn = () => { const w = Math.min(300, W * 0.42), h = 58; return { x: W / 2 - w / 2, y: H * 0.68, w, h }; };
  const inB = (x, y, b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
  // a foot is the line from its toe outwards along the leg; the nearest one wins
  const pick = (x, y) => { const px = (x - ox) / sc, py = (y - oy) / sc; let best = -1, bd = 70;
    for (const f of FEET) { const t = Math.max(-25, Math.min(190, (px - f.x) * f.ux + (py - f.y) * f.uy)), d = Math.hypot(px - f.x - f.ux * t, py - f.y - f.uy * t); if (d < bd) { bd = d; best = f.i; } }
    return best; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const [x, y] = P(e);
    if (S.phase === 'intro' || S.phase === 'end') { if (inB(x, y, btn())) { tone(520, 780, 0.1); newGame(); } return; }
    const i = pick(x, y); if (i >= 0) tapFoot(i); });
  addEventListener('keydown', (e) => { if (root.hidden) return; if (e.code === 'Escape') { e.preventDefault(); close(); }
    else if ((e.code === 'Enter' || e.code === 'Space') && (S.phase === 'intro' || S.phase === 'end')) { e.preventDefault(); newGame(); } }, true);
  $('palBack').addEventListener('click', () => close());

  // ---- update ----
  const update = (dt) => { S.t += dt; if (S.msgT > 0) S.msgT -= dt; for (const k in S.out) { const o = S.out[k]; o.l -= dt; o.a += dt; if (o.l <= 0) delete S.out[k]; }
    S.icons.forEach((o) => (o.t += dt)); if (S.icons.length > 6) S.icons.shift(); if (S.smell) S.smell += dt;
    if (S.phase === 'show') { const per = LEAD() + SHOW() + GAP(); if (S.t < 0) return;
      const k = Math.floor(S.t / per), f = S.t - k * per;
      if (k >= S.seq.length) { S.phase = 'play'; S.step = 0; S.arrow = -1; S.icons = []; say(T('TWOJA KOLEJ!', 'YOUR TURN!'), '#9fd8ff', 1.1); return; }
      const i = S.seq[k]; S.arrow = f < LEAD() + SHOW() ? i : -1;
      if (f >= LEAD() && S.shownK !== k) { S.shownK = k; toeOut(i, SHOW()); pop(i); } }
    else if (S.phase === 'good' && S.t > 1.2) { S.icons = []; nextRound(); }
    else if (S.phase === 'bad' && S.t > 2.4) finish(); };

  // ---- drawing ----
  const txt = (s, x, y, size, col = '#fff', al = 'center') => { g.font = `${Math.round(size)}px "Press Start 2P", monospace`; g.textAlign = al; g.textBaseline = 'middle';
    g.fillStyle = '#000'; for (const [a, b] of [[3, 3], [-2, 2], [2, -2], [-2, -2]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const pbox = (x, y, w, h, fill) => { g.fillStyle = '#000'; g.fillRect(x + 3, y, w - 6, h); g.fillRect(x, y + 3, w, h - 6); g.fillStyle = fill; g.fillRect(x + 6, y + 3, w - 12, h - 6); g.fillRect(x + 3, y + 6, w - 6, h - 12);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 6, y + 6, w - 12, 3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, y + h - 9, w - 12, 3); };
  const drawToe = (i, k) => { if (!TOES.complete) return; const f = FEET[i], s = CELL * sc * (0.55 + 0.45 * k), push = (1 - k) * 14 * sc;
    const [x, y] = TS(f.x, f.y); g.drawImage(TOES, i * CELL, 0, CELL, CELL, Math.round(x - s / 2 + f.ux * push), Math.round(y - s / 2 + f.uy * push), Math.round(s), Math.round(s)); };
  // a chunky yellow arrow between the middle and the toe, pointing at the toe, bobbing
  const drawArrow = (i) => { const f = FEET[i], bob = Math.abs(Math.sin(S.t * 14)) * 10, d = 58 + bob, [x, y] = TS(f.x - f.ux * d, f.y - f.uy * d), u = 6 * sc * 1.15;
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(Math.atan2(f.uy, f.ux));
    const shape = () => { g.beginPath(); g.moveTo(5 * u, 0); g.lineTo(0, -4 * u); g.lineTo(0, -1.6 * u); g.lineTo(-5 * u, -1.6 * u); g.lineTo(-5 * u, 1.6 * u); g.lineTo(0, 1.6 * u); g.lineTo(0, 4 * u); g.closePath(); };
    shape(); g.lineJoin = 'miter'; g.lineWidth = Math.max(3, 1.4 * u); g.strokeStyle = '#000'; g.stroke(); g.fillStyle = '#ffe14a'; g.fill();
    g.fillStyle = '#fff8c0'; g.fillRect(-5 * u + 2, -1.6 * u + 2, 4.5 * u, Math.max(2, u * 0.7)); g.restore(); };
  const drawSmell = () => { const k = Math.min(1, S.smell * 2), a = Math.max(0, 1 - Math.max(0, S.smell - 1.6) * 1.5);
    g.save(); g.globalAlpha = a * 0.85; for (const f of FEET) { const [x, y] = TS(f.x - f.ux * 20, f.y - f.uy * 20 - S.smell * 40); const r = (10 + 16 * k) * sc * 1.4;
      g.fillStyle = '#7ad04a'; for (const [a2, b2, rr] of [[0, 0, 1], [-0.8, 0.3, 0.7], [0.8, 0.3, 0.7], [0, -0.7, 0.6]]) { const s = Math.round(r * rr); g.fillRect(Math.round(x + a2 * r - s / 2), Math.round(y + b2 * r - s / 2), s, s); }
      g.fillStyle = '#3a7a1a'; g.fillRect(Math.round(x - r * 0.2), Math.round(y - r * 0.1), Math.max(3, r * 0.15), Math.max(3, r * 0.15)); } g.restore(); };
  const draw = () => { g.imageSmoothingEnabled = false; g.fillStyle = '#2a0f55'; g.fillRect(0, 0, W, H);
    if (BG.complete) g.drawImage(BGT || BG, ox, oy, BW * sc, BH * sc);
    for (const k in S.out) { const o = S.out[k]; drawToe(+k, Math.min(1, o.a / 0.08, o.l / 0.1)); }
    if (S.phase === 'show' && S.arrow >= 0) drawArrow(S.arrow);
    if (S.phase === 'bad' && S.right != null && Math.floor(S.t * 5) % 2) drawArrow(S.right);
    if (S.smell) drawSmell();
    // icons in the middle: the newest one pops big, earlier ones line up small below
    const [mx, my] = TS(CX, CY), u = Math.max(4, 9 * sc);
    if (S.icons.length) { const last = S.icons[S.icons.length - 1], k = Math.min(1, last.t / 0.15); icon(last.ic, mx, my - 10 * sc, u * (0.6 + 0.6 * k) * (1 + 0.15 * Math.max(0, 1 - last.t * 4)));
      const n = S.icons.length - 1, w = n * u * 7; S.icons.slice(0, -1).forEach((o, j) => icon(o.ic, mx - w / 2 + j * u * 7 + u * 3.5, my + 95 * sc, u * 0.45)); }
    if (S.phase === 'intro' || S.phase === 'end') {
      g.fillStyle = 'rgba(16,6,36,.78)'; g.fillRect(0, 0, W, H);
      const fs = Math.min(15, W / 48);
      if (S.phase === 'intro') { txt('PALUCHY', W / 2, H * 0.16, Math.min(42, W / 14), '#ffe14a');
        txt(T('Z dziur w skarpetach po kolei wyskakują paluchy.', 'Big toes pop out of the holey socks one by one.'), W / 2, H * 0.32, fs);
        txt(T('Zapamiętaj kolejność i powtórz ją, stukając w stopy.', 'Remember the order and repeat it by tapping the feet.'), W / 2, H * 0.40, fs);
        txt(T('Z każdą rundą dochodzi jeden paluch.', 'Every round adds one more toe.'), W / 2, H * 0.48, fs, '#c8c0ff');
        if (S.best) txt(`${T('REKORD', 'BEST')}: ${S.best}`, W / 2, H * 0.58, fs, '#9fd8ff'); }
      else { txt(T('KONIEC', 'GAME OVER'), W / 2, H * 0.16, Math.min(40, W / 14), '#ff6a4a');
        txt(`${T('ZAPAMIĘTANE PALUCHY', 'TOES REMEMBERED')}: ${S.round > 1 ? S.round + 1 : 0}`, W / 2, H * 0.32, Math.min(20, W / 34), '#fff');
        txt(`${T('UDANE RUNDY', 'ROUNDS DONE')}: ${S.round - 1}   ${T('REKORD', 'BEST')}: ${S.best}`, W / 2, H * 0.42, fs, '#9fd8ff');
        if (S.rec && S.round > 1) txt(T('NOWY REKORD!', 'NEW RECORD!'), W / 2, H * 0.51, fs * 1.2, '#ffe14a');
        if (S.coins) txt(`+${S.coins} ${T('MONET', 'COINS')}`, W / 2, H * 0.59, fs, '#ffd21a'); }
      const b = btn(); pbox(b.x, b.y, b.w, b.h, '#3fe060'); g.font = '15px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#10301a';
      g.fillText(S.phase === 'intro' ? T('ZACZYNAMY', 'START') : T('JESZCZE RAZ', 'AGAIN'), b.x + b.w / 2, b.y + b.h / 2 + 1);
      return; }
    // HUD
    pbox(10, 10, 230, 62, '#1a1540'); g.font = '10px "Press Start 2P", monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = '#ffe14a'; g.fillText(`${T('RUNDA', 'ROUND')} ${S.round}`, 22, 30); g.fillStyle = '#9fd8ff'; g.fillText(`${T('REKORD', 'BEST')} ${S.best}`, 22, 52);
    // progress pips at the bottom while it's your turn
    if (S.phase === 'play' || S.phase === 'good') { const n = S.seq.length, s = Math.min(16, (W * 0.6) / n - 4), y = H - 26, x0 = W / 2 - (n * (s + 4)) / 2;
      for (let j = 0; j < n; j++) { g.fillStyle = '#000'; g.fillRect(x0 + j * (s + 4), y - s / 2, s, s); g.fillStyle = j < S.step ? '#3fe060' : '#4a3a7a'; g.fillRect(x0 + j * (s + 4) + 2, y - s / 2 + 2, s - 4, s - 4); } }
    if (S.phase === 'good' && DOG.complete) { const k = Math.min(1, S.t / 0.25), pop = k < 1 ? 0.4 + 0.75 * k : 1 + 0.05 * Math.sin(S.t * 14), [dx, dy] = TS(CX, 560), h = Math.min(H * 0.3, 150) * pop, w = h * 72 / 60;
      const r = h * 0.5; g.save(); g.imageSmoothingEnabled = false; g.translate(dx, dy); g.rotate(Math.sin(S.t * 9) * 0.08);
      g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, r + 5, 0, 7); g.fill(); g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(0, 0, r + 2, 0, 7); g.fill(); g.fillStyle = '#7ad0ff'; g.beginPath(); g.arc(0, 0, r - 2, 0, 7); g.fill();
      g.beginPath(); g.arc(0, 0, r - 2, 0, 7); g.clip(); g.drawImage(DOG, 176 + 4, 6, 80, 80, -r * 1.05, -r * 0.95, r * 2.1, r * 2.1); g.restore(); }
    if (S.msgT > 0) txt(S.msg, W / 2, TS(CX, 365)[1], Math.min(28, W / 22), S.msgC); };
  let last = 0, raf = 0;
  const loop = (now) => { if (!S.on) return; raf = requestAnimationFrame(loop); const dt = Math.min(0.04, (now - (last || now)) / 1000); last = now; update(dt); draw(); };
  const close = () => { S.on = false; cancelAnimationFrame(raf); root.hidden = true; if (S.onExit) S.onExit(); };
  window.PALUCHY = { start(onExit) { S.onExit = onExit; root.hidden = false; layout(); S.phase = 'intro'; S.out = {}; S.icons = []; S.msgT = 0; S.smell = 0; S.arrow = -1;
      S.on = true; last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, _S: S, _tap: (i) => tapFoot(i) };
})();
