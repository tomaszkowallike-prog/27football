// ---- BUTELKA (hidden): a bottle hangs by its cap at the top of the locker room; flick the phone (or swipe up) to toss it,
// it spins and drops onto the purple floor. A full flip that lands on its base scores. Reached from the bottle on the board's floor.
(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.createElement('div'); root.id = 'flip'; root.hidden = true;
  root.innerHTML = '<canvas id="flipCv"></canvas><button class="ibtn" id="flipBack">✕ MENU</button>';
  document.body.appendChild(root);
  const st = document.createElement('style');
  st.textContent = `#flip { position: fixed; inset: 0; z-index: 18; background: #1a0f2a; touch-action: none; user-select: none; -webkit-user-select: none; }
    #flip[hidden] { display: none; } #flipCv { width: 100%; height: 100%; display: block; }
    #flipBack { right: max(10px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); z-index: 2; }`;
  document.head.appendChild(st);
  const cv = $('flipCv'), g = cv.getContext('2d');
  const BG = new Image(); BG.src = 'flip_bg.jpg';
  const BW = 2576, BH = 1142;               // background picture size
  const FLOOR = 985, LX = 1180;             // where the bottle lands, in picture units
  const BOT_H = 320;                        // bottle height in picture units
  const G = 2700;
  const IMG = {}; const load = (k) => { if (!IMG[k]) { IMG[k] = new Image(); IMG[k].src = `flip_${k}.png`; } return IMG[k]; };
  ['woda', 'cola', 'cytryna', 'truskawka', 'fiolet'].forEach(load);

  // ---- sound ----
  let AC = null;
  const tone = (f0, f1, d, type = 'square', v = 0.05, delay = 0) => { if (window.CFG && window.CFG.sfx === false) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + delay, o = AC.createOscillator(), gn = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) {} };
  const thud = (v = 0.3) => { if (window.CFG && window.CFG.sfx === false) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const n = AC.sampleRate * 0.08, b = AC.createBuffer(1, n, AC.sampleRate), c = b.getChannelData(0);
    for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain(); f.type = 'lowpass'; f.frequency.value = 700; s.buffer = b; gn.gain.value = v; s.connect(f).connect(gn).connect(AC.destination); s.start(); } catch (e) {} };
  const vib = (p) => { try { if (!window.CFG || window.CFG.vib !== false) navigator.vibrate?.(p); } catch (e) {} };

  // ---- state ----
  const S = { on: false, phase: 'intro', kind: 'woda', x: LX, y: 0, vx: 0, vy: 0, a: 0, w: 0, t: 0, msg: '', msgT: 0, msgC: '#fff', streak: 0, score: 0, best: 0, parts: [], side: 1, wob: 0, motion: false, info: '' };
  try { S.best = +localStorage.getItem('flip_best') || 0; } catch (e) {}
  let W = 0, H = 0, DPR = 1, sc = 1, ox = 0, oy = 0;
  const layout = () => { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    sc = Math.max(W / BW, H / BH); ox = (W - BW * sc) / 2; oy = (H - BH * sc) / 2;   // cover: the picture fills the screen
    // keep the landing spot on screen
    const lx = LX * sc + ox; if (lx < W * 0.35) ox += W * 0.35 - lx; if (lx > W * 0.65) ox -= lx - W * 0.65; ox = Math.min(0, Math.max(W - BW * sc, ox)); };
  addEventListener('resize', () => { if (!root.hidden) layout(); });
  const TS = (x, y) => [x * sc + ox, y * sc + oy];
  const holdY = () => (-oy) / sc + 18;       // the cap is held just below the top edge of the screen
  const half = () => BOT_H / 2;
  const hang = () => { S.phase = 'hold'; S.t = 0; S.a = 0; S.w = 0; S.vx = 0; S.vy = 0; S.x = LX; S.y = holdY() + half(); };

  // ---- throwing ----
  const toss = (vy, w, info) => { if (S.phase !== 'hold') return;
    const sw = S.a; S.vy = -Math.max(250, Math.min(1250, vy)); S.w = Math.max(2, Math.min(18, w)); S.vx = (Math.random() - 0.5) * 60 + sw * 120;
    S.phase = 'fly'; S.t = 0; S.info = info; tone(300, 600, 0.12, 'square', 0.04); };
  // phone flick: a short peak in acceleration (height) and rotation rate (spin)
  let cap = null, cool = 0;
  const onMotion = (e) => { if (root.hidden || S.phase !== 'hold') { cap = null; return; }
    const a0 = e.acceleration; let am;
    if (a0 && a0.x != null) am = Math.hypot(a0.x, a0.y, a0.z); else { const ag = e.accelerationIncludingGravity || {}; am = Math.abs(Math.hypot(ag.x || 0, ag.y || 0, ag.z || 0) - 9.81); }
    const r = e.rotationRate || {}, rm = Math.hypot(r.alpha || 0, r.beta || 0, r.gamma || 0), now = performance.now();
    if (now < cool) return;
    if (!cap && am > 10) cap = { t0: now, a: am, r: rm };
    if (cap) { cap.a = Math.max(cap.a, am); cap.r = Math.max(cap.r, rm);
      if (now - cap.t0 > 170) { const w = cap.r > 30 ? cap.r / 57.3 * 0.9 : 3 + (cap.a - 10) * 0.55;
        toss(300 + (cap.a - 10) * 38, w, `ruch: ${cap.a.toFixed(1)} m/s², obrót ${cap.r | 0}°/s`); cap = null; cool = now + 700; } } };
  const askMotion = async () => { try { if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) { if ((await DeviceMotionEvent.requestPermission()) !== 'granted') return false; }
      if (typeof DeviceMotionEvent === 'undefined') return false; addEventListener('devicemotion', onMotion); return true; } catch (e) { return false; } };
  // swipe fallback, always on
  let sw = null;
  const P = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const startBtn = () => { const w = Math.min(280, W * 0.4), h = 60; return { x: W / 2 - w / 2, y: H * 0.66, w, h }; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const [x, y] = P(e);
    if (S.phase === 'intro') return;
    sw = { x, y, t: performance.now() }; });
  cv.addEventListener('click', async (e) => { if (S.phase !== 'intro') return; const [x, y] = P(e), b = startBtn();
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { S.motion = await askMotion(); hang(); tone(520, 780, 0.1); } });
  addEventListener('pointerup', (e) => { if (!sw || root.hidden) return; const [x, y] = P(e), dt = Math.max(30, performance.now() - sw.t), dx = x - sw.x, dy = sw.y - y; sw = null;
    if (S.phase !== 'hold' || dy < 30) return; const sp = dy / dt * 1000 / H, ang = Math.atan2(Math.abs(dx), dy);
    toss(260 + sp * 260, 3 + sp * 2.2 + ang * 4, `palec: ${sp.toFixed(1)} ekr/s`); });
  addEventListener('keydown', (e) => { if (root.hidden) return; e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') close();
    if (e.code === 'Space' && S.phase === 'hold') toss(700, 7 + Math.random() * 3, 'spacja'); }, true);
  $('flipBack').addEventListener('click', () => close());

  // ---- physics ----
  const TAU = Math.PI * 2, wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const lowest = () => { const c = Math.abs(Math.cos(S.a)), s = Math.abs(Math.sin(S.a)), ib = IMG[S.kind], bw = ib && ib.width ? BOT_H * ib.width / ib.height : 90;
    return S.y + (half() * c + bw / 2 * s); };
  const say = (t, c, d = 1.4) => { S.msg = t; S.msgC = c; S.msgT = d; };
  const burst = (x, y, c, n = 22) => { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: (Math.random() - 0.5) * 700, vy: -Math.random() * 700 - 150, l: 0.7 + Math.random() * 0.4, c }); };
  const land = () => { const ang = wrap(S.a), spins = Math.round(Math.abs(S.a) / TAU), tol = 0.55;
    if (Math.abs(ang) < tol && spins >= 1) { S.phase = 'stand'; S.wob = ang * 1.3; S.a = 0; S.y = FLOOR - half(); S.t = 0; S.streak++;
      const pts = spins >= 2 ? 3 : 1; S.score += pts * S.streak; say(spins >= 2 ? 'PODWÓJNY FLIP!' : 'FLIP!', '#ffe14a'); burst(S.x, FLOOR, '#ffe14a'); burst(S.x, FLOOR, '#ff6ad5', 12);
      [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.1, 'square', 0.05, i * 0.08)); thud(0.25); vib([30, 30, 60]);
      if (S.score > S.best) { S.best = S.score; try { localStorage.setItem('flip_best', S.best); } catch (e) {} } }
    else { S.phase = 'fall'; S.t = 0; S.side = Math.sin(ang) >= 0 ? 1 : -1; S.a = ang;
      say(Math.abs(ang) < tol ? 'BEZ OBROTU SIĘ NIE LICZY' : Math.abs(ang) > 2.3 ? 'DO GÓRY DNEM!' : ang > 0 ? 'ZA MOCNO' : 'ZA SŁABO', '#ff6a4a');
      if (S.streak > 1) say('KONIEC SERII ×' + S.streak, '#ff6a4a'); S.streak = 0; S.score = 0; thud(0.4); tone(180, 70, 0.35, 'sawtooth', 0.04); vib(80); } };
  const update = (dt) => { S.t += dt; if (S.msgT > 0) S.msgT -= dt;
    if (S.phase === 'hold') { S.a = Math.sin(S.t * 2.1) * 0.1; const ty = holdY(); S.x = LX + Math.sin(S.a) * half(); S.y = ty + Math.cos(S.a) * half(); }
    else if (S.phase === 'fly') { S.vy += G * dt; S.x += S.vx * dt; S.y += S.vy * dt; S.a += S.w * dt; if (S.vy > 0 && lowest() >= FLOOR) land(); }
    else if (S.phase === 'stand') { S.wob *= Math.exp(-6 * dt); S.a = S.wob * Math.cos(S.t * 24); if (S.t > 1.5) hang(); }
    else if (S.phase === 'fall') { const tgt = S.side * Math.PI / 2; S.a += (tgt - S.a) * Math.min(1, dt * 10); S.x += S.side * 160 * dt * Math.max(0, 1 - S.t * 1.5);
      S.y += (FLOOR - lowest()) * Math.min(1, dt * 14); if (S.t > 1.6) hang(); }
    S.parts = S.parts.filter((p) => (p.l -= dt) > 0); for (const p of S.parts) { p.vy += 1800 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } };

  // ---- drawing ----
  const txt = (s, x, y, size, col = '#fff') => { g.font = `${Math.round(size * 0.62)}px "Press Start 2P", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#000'; for (const [a, b] of [[3, 3], [-2, 2], [2, -2], [-2, -2]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const pbox = (x, y, w, h, fill) => { g.fillStyle = '#000'; g.fillRect(x + 3, y, w - 6, h); g.fillRect(x, y + 3, w, h - 6); g.fillStyle = fill; g.fillRect(x + 6, y + 3, w - 12, h - 6); g.fillRect(x + 3, y + 6, w - 6, h - 12);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 6, y + 6, w - 12, 3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, y + h - 9, w - 12, 3); };
  const bottle = (alpha = 1, mirror = false) => { const im = IMG[S.kind]; if (!im || !im.width) return; const h = BOT_H * sc, w = h * im.width / im.height;
    const [x, y] = TS(S.x, S.y); g.save(); g.globalAlpha = alpha;
    if (mirror) { const fy = FLOOR * sc + oy; g.translate(0, fy * 2); g.scale(1, -1); }
    g.translate(Math.round(x), Math.round(y)); g.rotate(S.a); g.drawImage(im, Math.round(-w / 2), Math.round(-h / 2), Math.round(w), Math.round(h)); g.restore(); };
  const draw = () => { g.imageSmoothingEnabled = false; g.fillStyle = '#1a0f2a'; g.fillRect(0, 0, W, H);
    if (BG.complete) g.drawImage(BG, ox, oy, BW * sc, BH * sc);
    if (S.phase !== 'intro') {
      // shadow on the floor grows and darkens as the bottle comes down; a faint reflection in the shiny floor
      const hgt = Math.max(0, FLOOR - lowest()), k = Math.max(0.25, 1 - hgt / 900), [fx, fy] = TS(S.x, FLOOR);
      g.fillStyle = `rgba(10,0,25,${0.45 * k})`; g.beginPath(); g.ellipse(fx, fy, (40 + 30 * k) * sc * (S.phase === 'fall' ? 2.2 : 1), 12 * sc * k + 2, 0, 0, 7); g.fill();
      if (hgt < 260) { g.save(); g.beginPath(); g.rect(0, fy, W, H - fy); g.clip(); bottle(0.22 * (1 - hgt / 260), true); g.restore(); }
      bottle();
      for (const p of S.parts) { const [x, y] = TS(p.x, p.y), c = Math.max(3, Math.round(6 * sc * 2)); g.fillStyle = p.c; g.fillRect(Math.round(x), Math.round(y), c, c); }
      // HUD
      pbox(10, 10, 230, 62, '#1a1540'); g.font = '10px "Press Start 2P", monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = '#ffe14a'; g.fillText(`WYNIK ${S.score}  ×${S.streak}`, 22, 30); g.fillStyle = '#9fd8ff'; g.fillText(`REKORD ${S.best}`, 22, 52);
      if (S.msgT > 0) txt(S.msg, W / 2, H * 0.42, Math.min(34, W / 16), S.msgC);
      else if (S.phase === 'hold' && Math.floor(S.t * 2.5) % 2) txt(S.motion ? 'MACHNIJ TELEFONEM W GÓRĘ' : 'PRZESUŃ PALCEM W GÓRĘ', W / 2, H - 30, Math.min(20, W / 30), '#fff');
    } else {
      g.fillStyle = 'rgba(10,6,24,.72)'; g.fillRect(0, 0, W, H);
      txt('BOTTLE FLIP', W / 2, H * 0.2, Math.min(48, W / 11), '#ffe14a');
      txt('Weź telefon jak butelkę i machnij nim lekko w górę,', W / 2, H * 0.36, Math.min(17, W / 40), '#fff');
      txt('jakbyś podrzucał butelkę. Ma zrobić fikołka', W / 2, H * 0.44, Math.min(17, W / 40), '#fff');
      txt('i stanąć na denku.', W / 2, H * 0.52, Math.min(17, W / 40), '#fff');
      const b = startBtn(); pbox(b.x, b.y, b.w, b.h, '#3fe060'); g.font = '16px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = '#10301a'; g.fillText('ZACZYNAMY', b.x + b.w / 2, b.y + b.h / 2 + 1);
      txt('Trzymaj telefon mocno!  Bez czujników: przesuń palcem w górę.', W / 2, H * 0.9, Math.min(13, W / 55), '#c8c0ff'); } };
  let last = 0, raf = 0;
  const loop = (now) => { if (!S.on) return; raf = requestAnimationFrame(loop); const dt = Math.min(0.04, (now - (last || now)) / 1000); last = now; update(dt); draw(); };
  const close = () => { S.on = false; cancelAnimationFrame(raf); root.hidden = true; removeEventListener('devicemotion', onMotion); if (S.onExit) S.onExit(); };
  window.FLIP = { start(kind, onExit) { S.kind = kind || 'woda'; load(S.kind); S.onExit = onExit; root.hidden = false; layout(); S.phase = 'intro'; S.streak = 0; S.score = 0; S.parts = []; S.msgT = 0;
      S.on = true; last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, _S: S, _toss: (v, w) => toss(v, w, 'test'), _hang: () => hang() };
})();
