// ---- KAPSLE: bottle caps on a chalk track drawn over the pitch on the locker-room floor. Pull the cap back, aim,
// let go; leave the track and you go back with a penalty shot. You against the Purples: fewer shots to the goal wins.
(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.createElement('div'); root.id = 'caps'; root.hidden = true;
  root.innerHTML = '<canvas id="capsCv"></canvas><button class="ibtn" id="capsBack">✕ MENU</button>';
  document.body.appendChild(root);
  const st = document.createElement('style');
  st.textContent = `#caps { position: fixed; inset: 0; z-index: 18; background: #2a1638; touch-action: none; user-select: none; -webkit-user-select: none; }
    #caps[hidden] { display: none; } #capsCv { width: 100%; height: 100%; display: block; }
    #capsBack { right: max(10px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); z-index: 2; }`;
  document.head.appendChild(st);
  const cv = $('capsCv'), g = cv.getContext('2d');
  const BG = new Image(); BG.src = 'kapsle_bg.jpg';
  const MUS = window.MV ? MV.reg(new Audio('tablica.mp3'), 0.35) : null;
  let AC = null;
  const tone = (f0, f1, d, type = 'square', v = 0.05, delay = 0) => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + delay, o = AC.createOscillator(), gn = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) {} };
  const click = (v = 0.25) => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const n = AC.sampleRate * 0.04, b = AC.createBuffer(1, n, AC.sampleRate), c = b.getChannelData(0);
    for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4); const s = AC.createBufferSource(), gn = AC.createGain(); s.buffer = b; gn.gain.value = v; s.connect(gn).connect(AC.destination); s.start(); } catch (e) {} };

  // ---- the track, in picture pixels (the picture is 2576 x 1438): a winding chalk lane across the drawn pitch ----
  const TRACK = [[450, 1200], [800, 1210], [1000, 1080], [1050, 880], [1200, 710], [1450, 690], [1600, 850], [1650, 1050], [1850, 1185],
    [2050, 1110], [2110, 960], [2160, 885]];
  const HALF = 62, CAP = 26, FIN = TRACK[TRACK.length - 1];
  const cum = [0]; for (let i = 1; i < TRACK.length; i++) cum.push(cum[i - 1] + Math.hypot(TRACK[i][0] - TRACK[i - 1][0], TRACK[i][1] - TRACK[i - 1][1]));
  const TOTAL = cum[cum.length - 1];
  const nearestOn = (x, y) => { let bd = 1e9, bs = 0, bp = null;
    for (let i = 0; i < TRACK.length - 1; i++) { const [ax, ay] = TRACK[i], [bx, by] = TRACK[i + 1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)), px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py);
      if (d < bd) { bd = d; bs = cum[i] + t * Math.sqrt(l2); bp = [px, py]; } }
    return { d: bd, s: bs, p: bp }; };
  const pointAt = (s) => { s = Math.max(0, Math.min(TOTAL, s)); for (let i = 0; i < TRACK.length - 1; i++) if (s <= cum[i + 1]) { const t = (s - cum[i]) / (cum[i + 1] - cum[i]);
    return [TRACK[i][0] + (TRACK[i + 1][0] - TRACK[i][0]) * t, TRACK[i][1] + (TRACK[i + 1][1] - TRACK[i][1]) * t]; } return FIN.slice(); };
  // purple opponent caps standing on the lane's edges: something to steer round (or ricochet off)
  // placed by distance along the lane and a side offset, so each one narrows the lane but always leaves a way past
  const BLOCK = [[560, 38], [1000, -40], [1420, 40], [1830, -38], [2180, 36]].map(([d, off]) => { const p0 = pointAt(d - 5), p1 = pointAt(d + 5), dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    const c = pointAt(d); return [c[0] - dy / l * off, c[1] + dx / l * off, 30]; });

  // ---- state ----
  const K = 1.45, MAXV = 1500;   // friction (v *= e^-K t) and launch speed: a full pull rolls about 1000 px
  const mk = (team) => ({ team, x: TRACK[0][0] + (team ? 0 : -30), y: TRACK[0][1] + (team ? 34 : -34), vx: 0, vy: 0, px: 0, py: 0, shots: 0, done: false, rot: 0 });
  const S = { on: false, mode: 'cpu', caps: [mk(0), mk(1)], turn: 0, phase: 'menu', aim: null, t: 0, msg: '', msgT: 0, cam: [600, 1100], zoom: 2.3, end: null };
  let W = 0, H = 0, DPR = 1, sc = 1;
  const layout = () => { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    sc = Math.max(W / 2576, H / 1438) * S.zoom; };
  addEventListener('resize', () => { if (!root.hidden) layout(); });
  const toScreen = (x, y) => [(x - S.cam[0]) * sc + W / 2, (y - S.cam[1]) * sc + H / 2];
  const toWorld = (x, y) => [(x - W / 2) / sc + S.cam[0], (y - H / 2) / sc + S.cam[1]];
  const cur = () => S.caps[S.turn];
  const NAME = (t) => (S.mode === 'duo' ? (t ? 'GRACZ 2' : 'GRACZ 1') : (t ? 'FIOLETOWI' : 'TY'));
  const reset = () => { S.caps = [mk(0), mk(1)]; S.turn = 0; S.phase = 'aim'; S.end = null; S.msg = S.mode === 'duo' ? 'GRACZ 1: NACIĄGNIJ KAPSEL I PUŚĆ' : 'TWÓJ RUCH: NACIĄGNIJ KAPSEL I PUŚĆ'; S.msgT = 3; S.hand = 0; };
  const human = () => S.mode === 'duo' || S.turn === 0;
  // the menu: two big pixel buttons
  const MBTN = () => { const w = Math.min(300, W * 0.36), h = 64, y = H * 0.5; return [{ m: 'cpu', x: W / 2 - w - 12, y, w, h, t: '1 GRACZ', s: 'kontra Fioletowi' }, { m: 'duo', x: W / 2 + 12, y, w, h, t: '2 GRACZY', s: 'na zmianę na 1 telefonie' }]; };

  // ---- shooting ----
  const shoot = (c, ang, pow) => { c.px = c.x; c.py = c.y; c.vx = Math.cos(ang) * MAXV * pow; c.vy = Math.sin(ang) * MAXV * pow; c.shots++; S.phase = 'roll'; S.t = 0; click(0.35); };
  const pull = { on: false, sx: 0, sy: 0, x: 0, y: 0 };
  const P = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const [mx, my] = P(e);
    if (S.phase === 'menu') { for (const b of MBTN()) if (mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) { S.mode = b.m; reset(); S.cam = TRACK[0].slice(); click(0.3); } return; }
    if (S.phase === 'over') { S.phase = 'menu'; return; } if (S.phase !== 'aim' || !human() || S.hand > 0) return;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {} const [x, y] = P(e); Object.assign(pull, { on: true, sx: x, sy: y, x, y }); });
  cv.addEventListener('pointermove', (e) => { if (!pull.on) return; [pull.x, pull.y] = P(e); });
  const release = () => { if (!pull.on) return; pull.on = false; const dx = pull.sx - pull.x, dy = pull.sy - pull.y, l = Math.hypot(dx, dy);
    if (l < 12) return; shoot(cur(), Math.atan2(dy, dx), Math.min(1, l / Math.min(W, H) * 2.2)); };
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', () => { pull.on = false; });
  addEventListener('keydown', (e) => { if (root.hidden) return; e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') close(); }, true);
  $('capsBack').addEventListener('click', () => close());

  // the Purples aim at a point further along the lane they can reach in a straight line that stays inside it
  const cpuShot = () => { const c = S.caps[1], here = nearestOn(c.x, c.y).s;
    const clear = (tx, ty) => { for (let k = 1; k <= 14; k++) { const x = c.x + (tx - c.x) * k / 14, y = c.y + (ty - c.y) * k / 14;
        if (nearestOn(x, y).d > HALF - CAP + 4) return false; for (const [bx, by, br] of BLOCK) if (Math.hypot(x - bx, y - by) < CAP + br + 2) return false; } return true; };
    let best = null;
    for (let d = 640; d >= 50 && !best; d -= 30) for (const off of [0, 20, -20, 36, -36]) { const p0 = pointAt(here + d - 5), p1 = pointAt(here + d + 5), dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
      const tp = pointAt(here + d), tx = tp[0] - dy / l * off, ty = tp[1] + dx / l * off; if (clear(tx, ty)) { best = [tx, ty]; break; } }
    if (!best) best = pointAt(here + 60);
    const D = Math.hypot(best[0] - c.x, best[1] - c.y), ang = Math.atan2(best[1] - c.y, best[0] - c.x) + (Math.random() - 0.5) * 0.06;
    shoot(c, ang, Math.min(1, (D * K / MAXV) * (0.9 + Math.random() * 0.12))); };
  // ---- physics: rolling with friction, bouncing off each other and the purple blockers ----
  const physics = (dt) => {
    for (const c of S.caps) { if (c.done) continue; const f = Math.exp(-K * dt); c.vx *= f; c.vy *= f; const sp = Math.hypot(c.vx, c.vy);
      if (sp < 18) { c.vx = c.vy = 0; } c.x += c.vx * dt; c.y += c.vy * dt; c.rot += sp * dt * 0.01;
      for (const [bx, by, br] of BLOCK) { const dx = c.x - bx, dy = c.y - by, d = Math.hypot(dx, dy), m = CAP + br;
        if (d < m && d > 0) { const nx = dx / d, ny = dy / d; c.x = bx + nx * m; c.y = by + ny * m; const vn = c.vx * nx + c.vy * ny; if (vn < 0) { c.vx -= 1.75 * vn * nx; c.vy -= 1.75 * vn * ny; click(0.3); } } } }
    const [a, b] = S.caps; if (!a.done && !b.done) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < CAP * 2 && d > 0) { const nx = dx / d, ny = dy / d, o = (CAP * 2 - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { const j = -rv * 0.92; a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny; click(0.4); } } } };
  const still = () => S.caps.every((c) => c.done || (c.vx === 0 && c.vy === 0));
  const settle = () => {   // after a shot comes to rest: out of the lane = back where it was + a penalty; in the goal = done
    for (const c of S.caps) { if (c.done) continue;
      if (Math.hypot(c.x - FIN[0], c.y - FIN[1]) < 70) { c.done = true; c.x = FIN[0]; c.y = FIN[1] + (c.team ? 20 : -20); [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.14, 'square', 0.05, i * 0.08));
        S.msg = S.mode === 'duo' ? NAME(c.team) + ' W BRAMCE!' : c.team ? 'FIOLETOWI W BRAMCE' : 'GOOOL! JESTEŚ W BRAMCE'; S.msgT = 2; continue; }
      if (nearestOn(c.x, c.y).d > HALF) { c.x = c.px; c.y = c.py; c.shots++; tone(300, 140, 0.3, 'sawtooth', 0.05);
        if (c === cur()) { S.msg = S.mode === 'duo' ? NAME(c.team) + ': POZA TOREM! +1' : c.team ? 'FIOLETOWI POZA TOREM! +1' : 'POZA TOREM! +1 STRZAŁ'; S.msgT = 1.6; } } }
    const [me, cpu] = S.caps;
    // the end: both in, or one in and the other already past its count
    if ((me.done && cpu.done) || (me.done && cpu.shots >= me.shots && !cpu.done) || (cpu.done && me.shots >= cpu.shots && !me.done)) {
      S.phase = 'over'; S.end = me.done && (!cpu.done || me.shots < cpu.shots) ? 'win' : me.shots === cpu.shots && me.done && cpu.done ? 'draw' : 'lose';
      if (S.end === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.18, 'square', 0.05, i * 0.1)); else tone(330, 110, 0.6, 'sawtooth', 0.05); return; }
    let nt = 1 - S.turn; if (S.caps[nt].done) nt = S.turn; const changed = nt !== S.turn; S.turn = nt; S.phase = 'aim'; S.t = 0;
    if (S.mode === 'duo' && changed) { S.hand = 1.3; tone(660, 880, 0.12, 'square', 0.05); } };

  // ---- drawing ----
  // ---- pixel drawing: caps and the lane are drawn small and blown up with hard pixels ----
  const PXW = 5;                                      // picture pixels per lane pixel
  const thresh = (cn) => { const x = cn.getContext('2d'), d = x.getImageData(0, 0, cn.width, cn.height); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; x.putImageData(d, 0, 0); return cn; };
  let LANE = null;
  const buildLane = () => { const w = Math.ceil(2576 / PXW), h = Math.ceil(1438 / PXW);
    const mkc = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; return [c, x]; };
    const path = (x) => { x.beginPath(); TRACK.forEach(([a, b], i) => (i ? x.lineTo(a / PXW, b / PXW) : x.moveTo(a / PXW, b / PXW))); };
    const [fc, fx] = mkc(); path(fx); fx.lineWidth = HALF * 2 / PXW; fx.strokeStyle = '#4a2266'; fx.stroke(); thresh(fc);
    const [lc, lx] = mkc();
    // thin chalk edges: a 1-pixel ring is the wide stroke minus a slightly narrower one
    path(lx); lx.lineWidth = HALF * 2 / PXW + 2; lx.strokeStyle = '#fff'; lx.stroke(); thresh(lc);
    lx.globalCompositeOperation = 'destination-out'; path(lx); lx.lineWidth = HALF * 2 / PXW; lx.stroke(); lx.globalCompositeOperation = 'source-over';
    // dashed centre line, start bar and the goal ring
    const d = lc.getContext('2d'); d.fillStyle = 'rgba(255,255,255,.55)';
    for (let s2 = 30; s2 < TOTAL - 60; s2 += 34) { const [a, b2] = pointAt(s2); for (let k = 0; k < 3; k++) { const [c1, c2] = pointAt(s2 + k * 5); d.fillRect(Math.floor(c1 / PXW), Math.floor(c2 / PXW), 1, 1); } }
    d.fillStyle = '#fff'; { const [a, b2] = TRACK[0]; d.fillRect(Math.floor(a / PXW) - 1, Math.floor((b2 - HALF) / PXW), 2, Math.round(HALF * 2 / PXW)); }
    { const R = 70 / PXW, [a, b2] = FIN.map((v) => v / PXW); d.fillStyle = 'rgba(63,224,96,.35)';
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const r = Math.hypot(x, y); if (r <= R) { d.fillStyle = r > R - 1.2 ? ((Math.round(Math.atan2(y, x) * 6) % 2) ? '#3fe060' : '#1a8a3a') : 'rgba(63,224,96,.28)'; d.fillRect(Math.floor(a + x), Math.floor(b2 + y), 1, 1); } } }
    LANE = [fc, lc]; };
  // a cap sprite: drawn at 22x22 with no smoothing, then scaled up
  const SPR = {}; const capSprite = (team, rot) => { const k = team + ':' + Math.round(rot * 8) % 50; if (SPR[k]) return SPR[k];
    const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d'); x.translate(12, 12); x.rotate(rot);
    const T = [['#1f8a3a', '#ffffff', '#3fe060'], ['#6a2aa8', '#c9a2ff', '#8a4ad8'], ['#5a5a62', '#c8c8cc', '#8a8a92'], ['#c25a00', '#ffe0a0', '#ff8a1f']][team];
    x.fillStyle = '#111'; x.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rr = 11 * (i % 2 ? 1 : 0.88); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill();
    x.fillStyle = T[0]; x.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rr = 9.6 * (i % 2 ? 1 : 0.88); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill();
    x.fillStyle = T[1]; x.beginPath(); x.arc(0, 0, 6.6, 0, 7); x.fill(); x.fillStyle = T[2]; x.beginPath(); x.arc(0, 0, 5.2, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(-4, -5, 3, 2); thresh(c);
    return (SPR[k] = c); };
  const LBL = (c) => (c.team === 2 ? '' : S.mode === 'duo' ? String(c.team + 1) : c.team ? 'F' : String(window.CAPTAIN || 27));
  const capDraw = (c) => { const [x, y] = toScreen(c.x, c.y), r = CAP * sc, px = Math.max(2, Math.round(r * 2 / 22));
    const sp = capSprite(c.team === 1 && S.mode === 'duo' ? 3 : c.team, c.rot || 0), size = px * 24;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(Math.round(x + px * 1.5), Math.round(y + px * 2.5), size * 0.44, size * 0.4, 0, 0, 7); g.fill();
    g.drawImage(sp, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    const l = LBL(c); if (l) { g.font = `${Math.max(7, px * 4)}px "Press Start 2P", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(l, x + 1, y + 2); g.fillStyle = '#fff'; g.fillText(l, x, y + 1); } };
  const pxLine = (x0, y0, x1, y1, cell, col, gapOn = 0) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / cell)); g.fillStyle = col;
    for (let i = 0; i <= n; i++) { if (gapOn && (Math.floor(i / gapOn) % 2)) continue; const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; g.fillRect(Math.floor(x / cell) * cell, Math.floor(y / cell) * cell, cell, cell); } };
  const txt = (s, x, y, size, col = '#fff') => { g.font = `${Math.round(size * 0.62)}px "Press Start 2P", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#000'; for (const [a, b] of [[3, 3], [-2, 2], [2, -2], [-2, -2]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const pbox = (x, y, w, h, fill, edge = '#000') => { g.fillStyle = edge; g.fillRect(x + 3, y, w - 6, h); g.fillRect(x, y + 3, w, h - 6); g.fillStyle = fill; g.fillRect(x + 6, y + 3, w - 12, h - 6); g.fillRect(x + 3, y + 6, w - 6, h - 12);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 6, y + 6, w - 12, 3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, y + h - 9, w - 12, 3); };
  const draw = () => {
    g.imageSmoothingEnabled = false; g.fillStyle = '#2a1638'; g.fillRect(0, 0, W, H);
    if (BG.complete) { const [x, y] = toScreen(0, 0); g.drawImage(BG, x, y, 2576 * sc, 1438 * sc); }
    if (!LANE) buildLane();
    { const [x, y] = toScreen(0, 0), w = LANE[0].width * PXW * sc, h = LANE[0].height * PXW * sc; g.globalAlpha = 0.5; g.drawImage(LANE[0], x, y, w, h); g.globalAlpha = 1; g.drawImage(LANE[1], x, y, w, h); }
    { const [x, y] = toScreen(...FIN); txt('META', x, y - 70 * sc - 12, Math.max(12, 16 * sc / 2), '#3fe060'); }
    for (const [bx, by] of BLOCK) capDraw({ x: bx, y: by, team: 2, rot: bx * 0.01 });
    for (const c of [...S.caps].sort((a, b) => a.y - b.y)) capDraw(c);
    // aiming: a pixel rubber band backwards and a dashed pixel arrow forwards, length = power
    if (pull.on) { const c = cur(), [cx, cy] = toScreen(c.x, c.y), dx = pull.sx - pull.x, dy = pull.sy - pull.y, l = Math.hypot(dx, dy), pw = Math.min(1, l / Math.min(W, H) * 2.2), cell = 4;
      if (l > 6) { const ux = dx / l, uy = dy / l, L = 40 + pw * 220, col = pw > 0.8 ? '#ff4a3a' : pw > 0.5 ? '#ffb02a' : '#3fe060';
        pxLine(cx, cy, cx - ux * l * 0.7, cy - uy * l * 0.7, cell, '#ffe14a');
        pxLine(cx + ux * 20, cy + uy * 20, cx + ux * L, cy + uy * L, cell, col, 3);
        const tx = cx + ux * L, ty = cy + uy * L; for (const s2 of [-1, 1]) pxLine(tx, ty, tx - ux * 16 + uy * 12 * s2, ty - uy * 16 - ux * 12 * s2, cell, col);
        txt(Math.round(pw * 100) + '%', cx, cy - CAP * sc - 22, 16, col); } }
    // HUD
    const [me, cpu] = S.caps; pbox(10, 10, 250, 62, '#1a1540');
    g.font = '10px "Press Start 2P", monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
    const A = S.mode === 'duo' ? ['#3fe060', '#ffa21a'] : ['#3fe060', '#c9a2ff'];
    g.fillStyle = S.turn === 0 ? A[0] : '#8a90a0'; g.fillText(`${S.turn === 0 ? '>' : ' '} ${NAME(0)}: ${me.shots}${me.done ? ' OK' : ''}`, 22, 30);
    g.fillStyle = S.turn === 1 ? A[1] : '#8a90a0'; g.fillText(`${S.turn === 1 ? '>' : ' '} ${NAME(1)}: ${cpu.shots}${cpu.done ? ' OK' : ''}`, 22, 52);
    { const bw = 160, x0 = Math.round(W / 2 - bw / 2), n = 16; for (const [i, c] of [[0, me], [1, cpu]]) { const pr = c.done ? 1 : Math.min(1, nearestOn(c.x, c.y).s / TOTAL);
        for (let k = 0; k < n; k++) { g.fillStyle = '#000'; g.fillRect(x0 + k * 10, 34 + i * 10, 9, 8); g.fillStyle = k < Math.round(pr * n) ? A[i] : "#333"; g.fillRect(x0 + k * 10 + 1, 35 + i * 10, 7, 6); } } }
    if (S.phase === 'menu') { g.fillStyle = 'rgba(10,6,24,.7)'; g.fillRect(0, 0, W, H); txt('KAPSLE', W / 2, H * 0.28, Math.min(56, W / 9), '#ffe14a');
      txt('Kto zrobi mniej strzałów do mety, wygrywa', W / 2, H * 0.38, Math.min(16, W / 34), '#fff');
      for (const b of MBTN()) { pbox(b.x, b.y, b.w, b.h, b.m === 'duo' ? '#ffa21a' : '#3fe060'); g.font = '14px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = '#1a1030'; g.fillText(b.t, b.x + b.w / 2, b.y + 24);
        g.font = '8px "Press Start 2P", monospace'; g.fillText(b.s, b.x + b.w / 2, b.y + 46); }
      return; }
    if (S.hand > 0 && S.mode === 'duo') { g.fillStyle = 'rgba(10,6,24,.55)'; g.fillRect(0, H * 0.32, W, H * 0.3); txt('RUCH: ' + NAME(S.turn), W / 2, H * 0.42, Math.min(40, W / 12), A[S.turn]); txt('podaj telefon', W / 2, H * 0.53, 16, '#fff'); }
    else if (S.msgT > 0) txt(S.msg, W / 2, H - 28, Math.min(20, W / 26), '#ffe14a');
    else if (S.phase === 'aim' && human() && !pull.on) txt((S.mode === 'duo' ? NAME(S.turn) + ': ' : '') + 'przeciągnij do tyłu i puść', W / 2, H - 28, Math.min(18, W / 28), '#fff');
    if (S.mode === 'cpu' && S.phase === 'aim' && S.turn === 1) txt('FIOLETOWI CELUJĄ…', W / 2, 90, 20, '#c9a2ff');
    if (S.phase === 'over') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H);
      const head = S.mode === 'duo' ? (S.end === 'draw' ? 'REMIS' : 'WYGRYWA ' + (S.end === 'win' ? NAME(0) : NAME(1)) + '!') : S.end === 'win' ? 'WYGRANA!' : S.end === 'draw' ? 'REMIS' : 'PRZEGRANA';
      const hc = S.mode === 'duo' ? (S.end === 'draw' ? '#ffe14a' : S.end === 'win' ? A[0] : A[1]) : S.end === 'win' ? '#3fe060' : S.end === 'draw' ? '#ffe14a' : '#ff6a4a';
      txt(head, W / 2, H * 0.36, Math.min(48, W / 12), hc);
      txt(`${NAME(0)}: ${me.shots}${me.done ? '' : ' (nie doszedł)'}   ·   ${NAME(1)}: ${cpu.shots}${cpu.done ? '' : S.mode === 'duo' ? ' (nie doszedł)' : ' (nie doszli)'}`, W / 2, H * 0.48, Math.min(18, W / 30));
      txt('DOTKNIJ, ŻEBY WRÓCIĆ DO WYBORU', W / 2, H * 0.6, 16, '#ffe14a'); } };
  const update = (dt) => {
    S.t += dt; if (S.msgT > 0) S.msgT -= dt;
    if (S.phase === 'roll') { const n = 4; for (let i = 0; i < n; i++) physics(dt / n); if (S.t > 0.15 && still()) settle(); }
    if (S.hand > 0) S.hand -= dt;
    if (S.mode === 'cpu' && S.phase === 'aim' && S.turn === 1 && S.t > 0.9) cpuShot();
    // the camera: follows the cap in play, a little ahead along the lane
    const c = cur(), ah = pointAt(nearestOn(c.x, c.y).s + 140), tx = c.x * 0.7 + ah[0] * 0.3, ty = c.y * 0.7 + ah[1] * 0.3;
    S.cam[0] += (tx - S.cam[0]) * Math.min(1, dt * 3); S.cam[1] += (ty - S.cam[1]) * Math.min(1, dt * 3);
    const hw = W / 2 / sc, hh = H / 2 / sc; S.cam[0] = Math.max(hw, Math.min(2576 - hw, S.cam[0])); S.cam[1] = Math.max(hh, Math.min(1438 - hh, S.cam[1]));
  };
  let last = 0, raf = 0;
  const loop = (now) => { if (!S.on) return; raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; update(dt); draw(); };
  const close = () => { S.on = false; cancelAnimationFrame(raf); root.hidden = true; if (MUS) MUS.pause(); if (S.onExit) S.onExit(); };
  window.CAPS = { start(onExit) { S.onExit = onExit; root.hidden = false; layout(); reset(); S.phase = 'menu'; S.cam = TRACK[0].slice(); S.on = true; last = 0; if (MUS) MUS.play().catch(() => {}); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, _S: S, _shoot: shoot };
})();
