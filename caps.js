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
  const S = { on: false, caps: [mk(0), mk(1)], turn: 0, phase: 'aim', aim: null, t: 0, msg: '', msgT: 0, cam: [600, 1100], zoom: 2.3, end: null };
  let W = 0, H = 0, DPR = 1, sc = 1;
  const layout = () => { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    sc = Math.max(W / 2576, H / 1438) * S.zoom; };
  addEventListener('resize', () => { if (!root.hidden) layout(); });
  const toScreen = (x, y) => [(x - S.cam[0]) * sc + W / 2, (y - S.cam[1]) * sc + H / 2];
  const toWorld = (x, y) => [(x - W / 2) / sc + S.cam[0], (y - H / 2) / sc + S.cam[1]];
  const cur = () => S.caps[S.turn];
  const reset = () => { S.caps = [mk(0), mk(1)]; S.turn = 0; S.phase = 'aim'; S.end = null; S.msg = 'TWÓJ RUCH: NACIĄGNIJ KAPSEL I PUŚĆ'; S.msgT = 3; };

  // ---- shooting ----
  const shoot = (c, ang, pow) => { c.px = c.x; c.py = c.y; c.vx = Math.cos(ang) * MAXV * pow; c.vy = Math.sin(ang) * MAXV * pow; c.shots++; S.phase = 'roll'; S.t = 0; click(0.35); };
  const pull = { on: false, sx: 0, sy: 0, x: 0, y: 0 };
  const P = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); if (S.phase === 'over') { reset(); return; } if (S.phase !== 'aim' || S.turn !== 0) return;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {} const [x, y] = P(e); Object.assign(pull, { on: true, sx: x, sy: y, x, y }); });
  cv.addEventListener('pointermove', (e) => { if (!pull.on) return; [pull.x, pull.y] = P(e); });
  const release = () => { if (!pull.on) return; pull.on = false; const dx = pull.sx - pull.x, dy = pull.sy - pull.y, l = Math.hypot(dx, dy);
    if (l < 12) return; shoot(S.caps[0], Math.atan2(dy, dx), Math.min(1, l / Math.min(W, H) * 2.2)); };
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
        S.msg = c.team ? 'FIOLETOWI W BRAMCE' : 'GOOOL! JESTEŚ W BRAMCE'; S.msgT = 2; continue; }
      if (nearestOn(c.x, c.y).d > HALF) { c.x = c.px; c.y = c.py; c.shots++; tone(300, 140, 0.3, 'sawtooth', 0.05);
        if (c === cur()) { S.msg = c.team ? 'FIOLETOWI POZA TOREM! +1' : 'POZA TOREM! +1 STRZAŁ'; S.msgT = 1.6; } } }
    const [me, cpu] = S.caps;
    // the end: both in, or one in and the other already past its count
    if ((me.done && cpu.done) || (me.done && cpu.shots >= me.shots && !cpu.done) || (cpu.done && me.shots >= cpu.shots && !me.done)) {
      S.phase = 'over'; S.end = me.done && (!cpu.done || me.shots < cpu.shots) ? 'win' : me.shots === cpu.shots && me.done && cpu.done ? 'draw' : 'lose';
      if (S.end === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.18, 'square', 0.05, i * 0.1)); else tone(330, 110, 0.6, 'sawtooth', 0.05); return; }
    let nt = 1 - S.turn; if (S.caps[nt].done) nt = S.turn; S.turn = nt; S.phase = 'aim'; S.t = 0; };

  // ---- drawing ----
  const capDraw = (c) => { const [x, y] = toScreen(c.x, c.y), r = CAP * sc;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + r * 0.15, y + r * 0.25, r * 1.05, r * 0.95, 0, 0, 7); g.fill();
    g.save(); g.translate(x, y); g.rotate(c.rot);
    const T = [['#1f8a3a', '#ffffff', '#3fe060'], ['#6a2aa8', '#c9a2ff', '#8a4ad8'], ['#5a5a62', '#c8c8cc', '#8a8a92']][c.team]; g.fillStyle = T[0]; g.beginPath(); for (let i = 0; i < 42; i++) { const a = i / 42 * Math.PI * 2, rr = r * (i % 2 ? 1 : 0.9); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = Math.max(1.5, r * 0.08); g.stroke();
    g.fillStyle = T[1]; g.beginPath(); g.arc(0, 0, r * 0.72, 0, 7); g.fill(); g.fillStyle = T[2]; g.beginPath(); g.arc(0, 0, r * 0.6, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = `700 ${Math.round(r * 0.62)}px "Pixelify Sans", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.team === 2 ? '✕' : c.team ? 'F' : String(window.CAPTAIN || 27), 0, r * 0.04);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.3, r * 0.3, r * 0.16, -0.6, 0, 7); g.fill(); g.restore(); };
  const chalk = (pts, w, col) => { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = toScreen(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.lineWidth = w * sc; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
  const txt = (s, x, y, size, col = '#fff') => { g.font = `700 ${size}px "Pixelify Sans", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#000'; for (const [a, b] of [[3, 3], [-2, 2], [2, -2], [-2, -2]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const draw = () => {
    g.imageSmoothingEnabled = false; g.fillStyle = '#2a1638'; g.fillRect(0, 0, W, H);
    if (BG.complete) { const [x, y] = toScreen(0, 0); g.drawImage(BG, x, y, 2576 * sc, 1438 * sc); }
    // the lane: chalk edges over a lighter floor, dashed centre line, start and goal marks
    chalk(TRACK, HALF * 2 + 10, 'rgba(255,255,255,.92)'); chalk(TRACK, HALF * 2 - 4, 'rgba(70,30,95,.92)'); chalk(TRACK, HALF * 2 - 16, 'rgba(120,70,150,.55)');
    g.setLineDash([10 * sc, 14 * sc]); chalk(TRACK, 3, 'rgba(255,255,255,.35)'); g.setLineDash([]);
    { const [x, y] = toScreen(...TRACK[0]); g.fillStyle = '#fff'; g.fillRect(x - 3, y - HALF * sc, 6, HALF * 2 * sc); }
    { const [x, y] = toScreen(...FIN); const r = 70 * sc; g.fillStyle = 'rgba(63,224,96,.25)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#3fe060'; g.lineWidth = 4; g.setLineDash([8, 6]); g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.setLineDash([]);
      txt('META', x, y - r - 12, Math.max(12, 16 * sc / 2), '#3fe060'); }
    for (const [bx, by] of BLOCK) capDraw({ x: bx, y: by, team: 2, rot: bx * 0.01 });
    for (const c of [...S.caps].sort((a, b) => a.y - b.y)) capDraw(c);
    // aiming: a rubber band from the cap backwards and an arrow forwards, length = power
    if (pull.on) { const c = S.caps[0], [cx, cy] = toScreen(c.x, c.y), dx = pull.sx - pull.x, dy = pull.sy - pull.y, l = Math.hypot(dx, dy), pw = Math.min(1, l / Math.min(W, H) * 2.2);
      if (l > 6) { const ux = dx / l, uy = dy / l, L = 40 + pw * 220;
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - ux * l * 0.7, cy - uy * l * 0.7); g.stroke();
        g.strokeStyle = '#ffe14a'; g.lineWidth = 3; g.stroke();
        const col = pw > 0.8 ? '#ff4a3a' : pw > 0.5 ? '#ffb02a' : '#3fe060'; g.setLineDash([10, 8]); g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + ux * L, cy + uy * L); g.stroke(); g.setLineDash([]);
        g.save(); g.translate(cx + ux * L, cy + uy * L); g.rotate(Math.atan2(uy, ux)); g.fillStyle = col; g.beginPath(); g.moveTo(14, 0); g.lineTo(-6, -10); g.lineTo(-6, 10); g.closePath(); g.fill(); g.restore();
        txt(Math.round(pw * 100) + '%', cx, cy - CAP * sc - 22, 16, col); } }
    // HUD
    const [me, cpu] = S.caps; g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(10, 10, 210, 56); g.strokeStyle = '#3a3d44'; g.lineWidth = 2; g.strokeRect(10, 10, 210, 56);
    g.font = '700 16px "Pixelify Sans", monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = S.turn === 0 ? '#3fe060' : '#8fd99a'; g.fillText(`${S.turn === 0 ? '▶ ' : '   '}TY: ${me.shots} strz.${me.done ? ' ✔' : ''}`, 18, 28);
    g.fillStyle = S.turn === 1 ? '#c9a2ff' : '#9a86b8'; g.fillText(`${S.turn === 1 ? '▶ ' : '   '}FIOLETOWI: ${cpu.shots}${cpu.done ? ' ✔' : ''}`, 18, 50);
    const prog = Math.min(1, nearestOn(me.x, me.y).s / TOTAL); g.fillStyle = '#333'; g.fillRect(W / 2 - 80, 14, 160, 8); g.fillStyle = '#3fe060'; g.fillRect(W / 2 - 80, 14, 160 * (me.done ? 1 : prog), 8);
    if (S.msgT > 0) txt(S.msg, W / 2, H - 28, Math.min(20, W / 26), '#ffe14a');
    else if (S.phase === 'aim' && S.turn === 0 && !pull.on) txt('Przeciągnij palcem do tyłu i puść', W / 2, H - 28, Math.min(18, W / 28), '#fff');
    if (S.phase === 'aim' && S.turn === 1) txt('FIOLETOWI CELUJĄ…', W / 2, 90, 20, '#c9a2ff');
    if (S.phase === 'over') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H);
      txt(S.end === 'win' ? 'WYGRANA!' : S.end === 'draw' ? 'REMIS' : 'PRZEGRANA', W / 2, H * 0.36, Math.min(54, W / 9), S.end === 'win' ? '#3fe060' : S.end === 'draw' ? '#ffe14a' : '#ff6a4a');
      txt(`Ty: ${me.shots}${me.done ? '' : ' (nie doszedł)'}   ·   Fioletowi: ${cpu.shots}${cpu.done ? '' : ' (nie doszli)'}`, W / 2, H * 0.48, Math.min(20, W / 28));
      txt('DOTKNIJ, ŻEBY ZAGRAĆ JESZCZE RAZ', W / 2, H * 0.6, 16, '#ffe14a'); } };
  const update = (dt) => {
    S.t += dt; if (S.msgT > 0) S.msgT -= dt;
    if (S.phase === 'roll') { const n = 4; for (let i = 0; i < n; i++) physics(dt / n); if (S.t > 0.15 && still()) settle(); }
    if (S.phase === 'aim' && S.turn === 1 && S.t > 0.9) cpuShot();
    // the camera: follows the cap in play, a little ahead along the lane
    const c = cur(), ah = pointAt(nearestOn(c.x, c.y).s + 140), tx = c.x * 0.7 + ah[0] * 0.3, ty = c.y * 0.7 + ah[1] * 0.3;
    S.cam[0] += (tx - S.cam[0]) * Math.min(1, dt * 3); S.cam[1] += (ty - S.cam[1]) * Math.min(1, dt * 3);
    const hw = W / 2 / sc, hh = H / 2 / sc; S.cam[0] = Math.max(hw, Math.min(2576 - hw, S.cam[0])); S.cam[1] = Math.max(hh, Math.min(1438 - hh, S.cam[1]));
  };
  let last = 0, raf = 0;
  const loop = (now) => { if (!S.on) return; raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; update(dt); draw(); };
  const close = () => { S.on = false; cancelAnimationFrame(raf); root.hidden = true; if (MUS) MUS.pause(); if (S.onExit) S.onExit(); };
  window.CAPS = { start(onExit) { S.onExit = onExit; root.hidden = false; layout(); reset(); S.cam = TRACK[0].slice(); S.on = true; last = 0; if (MUS) MUS.play().catch(() => {}); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, _S: S, _shoot: shoot };
})();
