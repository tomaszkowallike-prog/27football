// The workshop (WARSZTAT): a back room where the captain's boot is customised. Paint whole parts (cut seam to seam),
// paint freely with a pixel brush, lay a pattern, pick the upper material, the stud layout, the stud material and
// colours. Material, layout and studs give skill bonuses in matches (window.BOOT_BONUS); paint is your own style.
(() => {
  const $ = (id) => document.getElementById(id), EN = window.LANG === 'en', L = (pl, en) => (EN ? en : pl);
  const PROG = () => window.PROG;
  const PARTS = { 1: L('CZUBEK', 'TOE'), 2: L('PRZÓD', 'FOREFOOT'), 3: L('ŚRÓDSTOPIE', 'MIDFOOT'), 4: L('PASKI', 'STRIPES'), 5: L('TYŁ', 'BACK'),
    6: L('KOŁNIERZ', 'COLLAR'), 7: L('JĘZYK', 'TONGUE'), 8: L('SZNURÓWKI', 'LACES'), 10: L('PODESZWA', 'SOLE'), 11: L('KORKI', 'STUDS') };
  const COLS = ['#ffffff', '#d8d8e0', '#8a8a96', '#2a2a32', '#e8402a', '#ff8a1f', '#ffe14a', '#6ee05a', '#1f9a4a', '#3fd8ff', '#2a6ae8', '#6b3fa8',
    '#ff6ab8', '#8a4a20', '#ffc21a', '#b8f0ff'];
  const MATS = [{ id: 'skora', n: L('SKÓRA', 'LEATHER'), p: 0, b: { pa: 1 } }, { id: 'syn', n: L('SYNTETYK', 'SYNTHETIC'), p: 120, b: { sp: 1 } },
    { id: 'knit', n: L('DZIANINA', 'KNIT'), p: 200, b: { dr: 1 } }, { id: 'carbon', n: L('KARBON', 'CARBON'), p: 350, b: { st: 1, sp: 0.5 } }];
  const LAYS = [{ id: 'fg', n: 'FG 10', p: 0, b: { sp: 0.5, st: 0.5 }, r: 13, pts: [[.1, .28], [.1, .72], [.22, .22], [.22, .78], [.36, .28], [.36, .72], [.79, .28], [.79, .72], [.91, .34], [.91, .66]] },
    { id: 'sg', n: 'SG 6', p: 150, b: { ob: 1, dr: 0.5 }, r: 17, pts: [[.13, .3], [.13, .7], [.33, .3], [.33, .7], [.83, .3], [.83, .7]] },
    { id: 'mg', n: 'MG 13', p: 150, b: { dr: 1 }, r: 10, pts: [[.08, .5], [.15, .25], [.15, .75], [.24, .5], [.3, .22], [.3, .78], [.42, .3], [.42, .7], [.76, .25], [.76, .75], [.86, .5], [.94, .3], [.94, .7]] },
    { id: 'tf', n: 'TURF', p: 100, b: { pa: 1 }, r: 5, pts: (() => { const a = []; for (let x = 0.06; x < 0.97; x += 0.055) for (let t = 0.15; t < 0.9; t += 0.14) if (x < 0.5 || x > 0.66) a.push([x, t]); return a; })() }];
  const SMAT = [{ id: 'plast', n: L('PLASTIK', 'PLASTIC'), p: 0, b: {} }, { id: 'alu', n: L('ALUMINIUM', 'ALUMINIUM'), p: 120, b: { ob: 0.5 } }, { id: 'tyt', n: L('TYTAN', 'TITANIUM'), p: 250, b: { st: 0.5, sp: 0.5 } }];
  const SK = ['st', 'pa', 'dr', 'ob', 'sp'], SKN = EN ? ['SHOOTING', 'PASSING', 'DRIBBLING', 'DEFENCE', 'SPEED'] : ['STRZAŁ', 'PODANIE', 'DRYBLING', 'OBRONA', 'PRĘDKOŚĆ'];
  const cfg = () => { const P = PROG().get(); P.boot = P.boot || { mat: 'skora', lay: 'fg', smat: 'plast', stud: '#d8d8e0', sole: '#ffffff', own: ['skora', 'fg', 'plast'], style: 0 }; return P.boot; };
  window.BOOT_BONUS = () => { if (!window.PROG) return [0, 0, 0, 0, 0]; const B = cfg(), o = { st: 0, pa: 0, dr: 0, ob: 0, sp: 0 };
    for (const x of [MATS.find((m) => m.id === B.mat), LAYS.find((m) => m.id === B.lay), SMAT.find((m) => m.id === B.smat)]) if (x) for (const k in x.b) o[k] += x.b[k];
    if (B.style) o.dr += 0.5; return SK.map((k) => o[k]); };

  // ---- canvases
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  let studXY = [], ready = null, side, sole, partsData, soleMask, view = 'side', tool = 'part', color = '#e8402a', size = 2, pat = 'paski', undo = [];
  const W = 750, H = 380, SW = 742, SH = 265;
  const paint = document.createElement('canvas'); paint.width = W; paint.height = H; const pg = paint.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tg = tmp.getContext('2d');
  const prep = async () => {
    [side, sole] = await Promise.all([load('boot_side.png?v=1'), load('boot_sole.png?v=1')]);
    const pm = await load('boot_parts.png?v=2'), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(pm, 0, 0);
    const d = g.getImageData(0, 0, W, H).data; partsData = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) partsData[i] = Math.round(d[i * 4] / 20);
    const sm = await load('boot_sole_m.png?v=1'), c2 = document.createElement('canvas'); c2.width = SW; c2.height = SH; const g2 = c2.getContext('2d'); g2.drawImage(sm, 0, 0);
    const d2 = g2.getImageData(0, 0, SW, SH).data; soleMask = new Uint8Array(SW * SH); for (let i = 0; i < SW * SH; i++) soleMask[i] = d2[i * 4 + 3] > 128 ? 1 : 0;
    try { const s = localStorage.getItem('boot_paint'); if (s) pg.drawImage(await load(s), 0, 0); } catch (e) {}
  };
  const save = () => { try { localStorage.setItem('boot_paint', paint.toDataURL()); } catch (e) {} const B = cfg(), d = pg.getImageData(0, 0, W, H).data; let n = 0;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 0 && (d[i - 3] < 245 || d[i - 2] < 245 || d[i - 1] < 245)) n++; B.style = n > 400 ? 1 : 0; PROG().save(); };
  const pushUndo = () => { undo.push(pg.getImageData(0, 0, W, H)); if (undo.length > 15) undo.shift(); };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // patterns, in 2-pixel cells so they look like pixel art
  const PATS = { paski: (x, y) => ((x + y) >> 3) % 2 === 0, kropki: (x, y) => { const a = x % 16, b = y % 16; return (a - 8) ** 2 + (b - 8) ** 2 < 14; },
    kratka: (x, y) => ((x >> 3) + (y >> 3)) % 2 === 0, zygzak: (x, y) => { const p = (x % 16 < 8 ? x % 16 : 16 - x % 16); return (y - p + 64) % 16 < 4; },
    gwiazdki: (x, y) => { const a = x % 20 - 10, b = y % 20 - 10; return (Math.abs(a) < 2 && Math.abs(b) < 6) || (Math.abs(b) < 2 && Math.abs(a) < 6) || (Math.abs(a) === Math.abs(b) && Math.abs(a) < 4); },
    plomienie: (x, y) => { const w = Math.sin(x * 0.35) * 3 + Math.sin(x * 0.13) * 4; return ((y + w) % 22 + 22) % 22 < 7; } };
  const fillPart = (k, withPat) => { const [r, g, b] = hex(color), img = pg.getImageData(0, 0, W, H), d = img.data, f = PATS[pat];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (partsData[i] !== k) continue; if (withPat && !f(x >> 1 << 1, y >> 1 << 1)) continue; d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
    pg.putImageData(img, 0, 0); if (k === 10) cfg().sole = color; if (k === 11) cfg().stud = color; };
  const stamp = (x, y, erase) => { const s = [3, 6, 11][size - 1] * 2, gx = Math.round(x / 2) * 2, gy = Math.round(y / 2) * 2;
    if (erase) pg.clearRect(gx - s / 2, gy - s / 2, s, s); else { pg.fillStyle = color; pg.fillRect(gx - s / 2, gy - s / 2, s, s); } };
  // material texture over the upper (parts 1-8)
  let matTex = null, matFor = '';
  const buildMat = () => { const m = cfg().mat; if (matFor === m) return; matFor = m; matTex = document.createElement('canvas'); matTex.width = W; matTex.height = H; const g = matTex.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, p = partsData[i]; if (!p || p > 8) continue; let a = 0;
      if (m === 'knit') a = (y % 4 < 1) ? 40 : ((x + (y >> 2)) % 6 === 0 ? 22 : 0); else if (m === 'carbon') a = (((x >> 2) + (y >> 2)) % 2 ? 46 : 0) + ((x + y) % 8 === 0 ? 20 : 0);
      else if (m === 'syn') a = ((x - y * 2) % 40 + 40) % 40 < 3 ? -40 : 0; else a = 0;
      if (a > 0) { d[i * 4 + 3] = a; } else if (a < 0) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = -a; } }
    g.putImageData(img, 0, 0); };
  const draw = () => {
    const cv = $('wcv'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    if (view === 'side') { cv.width = W; cv.height = H; g.clearRect(0, 0, W, H); g.drawImage(side, 0, 0);
      tg.clearRect(0, 0, W, H); tg.globalCompositeOperation = 'source-over'; tg.drawImage(paint, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(side, 0, 0); tg.globalCompositeOperation = 'source-over';
      g.globalCompositeOperation = 'multiply'; g.drawImage(tmp, 0, 0); g.globalCompositeOperation = 'source-over';
      buildMat(); g.drawImage(matTex, 0, 0); return; }
    // the sole from below: its colour and the studs of the chosen layout
    cv.width = SW; cv.height = SH; g.clearRect(0, 0, SW, SH); g.drawImage(sole, 0, 0); const B = cfg();
    tg.clearRect(0, 0, W, H); tg.fillStyle = B.sole; tg.fillRect(0, 0, SW, SH); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(sole, 0, 0); tg.globalCompositeOperation = 'source-over';
    g.globalCompositeOperation = 'multiply'; g.drawImage(tmp, 0, 0, SW, SH, 0, 0, SW, SH); g.globalCompositeOperation = 'source-over';
    studXY = []; const lay = LAYS.find((l) => l.id === B.lay), metal = B.smat !== 'plast', [sr, sg2, sb] = hex(B.stud);
    for (const [fx, t] of lay.pts) { const x = Math.round(fx * SW); let top = -1, bot = -1; for (let y = 0; y < SH; y++) if (soleMask[y * SW + x]) { if (top < 0) top = y; bot = y; }
      if (top < 0) continue; const y = Math.round(top + (bot - top) * t), r = lay.r; studXY.push([x, y, r + 4]);
      g.fillStyle = '#14101c'; g.beginPath(); g.arc(x, y + 2, r + 2, 0, 7); g.fill();
      g.fillStyle = `rgb(${sr * 0.6 | 0},${sg2 * 0.6 | 0},${sb * 0.6 | 0})`; g.beginPath(); g.arc(x, y + 1, r, 0, 7); g.fill();
      g.fillStyle = B.stud; g.beginPath(); g.arc(x, y - 1, r - 1, 0, 7); g.fill();
      if (metal) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x - r / 2, y - r / 2, Math.max(2, r / 3), Math.max(2, r / 3)); g.strokeStyle = B.smat === 'tyt' ? '#ffe14a' : '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 1, r - 2, 0, 7); g.stroke(); } }
  };
  // ---- panel
  const bonusTxt = (b) => Object.entries(b).map(([k, v]) => `+${v} ${SKN[SK.indexOf(k)]}`).join(' ') || L('bez premii', 'no bonus');
  const buy = (item, key) => { const B = cfg(), P = PROG().get(); if (B.own.includes(item.id)) { B[key] = item.id; return true; }
    if (P.coins < item.p) { window.TOAST?.(L('ZA MAŁO MONET', 'NOT ENOUGH COINS')); return false; } P.coins -= item.p; B.own.push(item.id); B[key] = item.id; window.TOAST?.(`${item.n}: ${bonusTxt(item.b)}`); return true; };
  const opts = (list, key) => list.map((it) => { const B = cfg(), own = B.own.includes(it.id), on = B[key] === it.id;
    return `<button class="wopt${on ? ' on' : ''}" data-k="${key}" data-id="${it.id}" title="${bonusTxt(it.b)}">${it.n}<small>${own ? bonusTxt(it.b) : it.p + ' ' + L('MONET', 'COINS')}</small></button>`; }).join('');
  const panel = () => { const B = cfg(), bb = window.BOOT_BONUS();
    $('wpanel').innerHTML = `
      <div class="wrow">${[['part', L('CZĘŚCI', 'PARTS')], ['brush', L('PĘDZEL', 'BRUSH')], ['pat', L('WZÓR', 'PATTERN')], ['erase', L('GUMKA', 'ERASER')]].map(([t, n]) => `<button class="wt${tool === t ? ' on' : ''}" data-t="${t}">${n}</button>`).join('')}</div>
      <div class="wrow wpal">${COLS.map((c) => `<i data-c="${c}" style="background:${c}" class="${c === color ? 'on' : ''}"></i>`).join('')}<label class="wcust" style="background:${color}"><input type="color" id="wpick" value="${color}"></label></div>
      ${tool === 'brush' || tool === 'erase' ? `<div class="wrow">${[1, 2, 3].map((s) => `<button class="wt${size === s ? ' on' : ''}" data-s="${s}">${['S', 'M', 'L'][s - 1]}</button>`).join('')}</div>` : ''}
      ${tool === 'pat' ? `<div class="wrow">${Object.keys(PATS).map((p) => `<button class="wt${pat === p ? ' on' : ''}" data-p="${p}">${{ paski: L('PASKI', 'STRIPES'), kropki: L('KROPKI', 'DOTS'), kratka: L('KRATKA', 'CHECK'), zygzak: L('ZYGZAK', 'ZIGZAG'), gwiazdki: L('GWIAZDKI', 'STARS'), plomienie: L('PŁOMIENIE', 'FLAMES') }[p]}</button>`).join('')}</div>` : ''}
      <h5>${L('MATERIAŁ', 'MATERIAL')}</h5><div class="wrow">${opts(MATS, 'mat')}</div>
      <h5>${L('UKŁAD KORKÓW', 'STUD LAYOUT')}</h5><div class="wrow">${opts(LAYS, 'lay')}</div>
      <h5>${L('KORKI Z', 'STUDS MADE OF')}</h5><div class="wrow">${opts(SMAT, 'smat')}</div>
      <h5>${L('PREMIE BUTA', 'BOOT BONUSES')}</h5><div class="wstat">${SKN.map((n, i) => `<span>${n}</span><b>${bb[i] ? '+' + bb[i] : '-'}</b>`).join('')}</div>
      <p class="whint">${L('Własny wzór (pomalowany but) daje +0.5 do dryblingu.', 'Your own paint job gives +0.5 dribbling.')}</p>
      <div class="wrow"><button class="wt" id="wundo">${L('COFNIJ', 'UNDO')}</button><button class="wt" id="wclear">${L('WYCZYŚĆ', 'CLEAR')}</button></div>`;
    $('wcoins').textContent = PROG().get().coins;
  };
  $('wpanel')?.addEventListener('click', (e) => { const b = e.target.closest('button, i'); if (!b) return;
    if (b.dataset.t) tool = b.dataset.t; else if (b.dataset.c) color = b.dataset.c; else if (b.dataset.s) size = +b.dataset.s; else if (b.dataset.p) pat = b.dataset.p;
    else if (b.dataset.k) { const list = { mat: MATS, lay: LAYS, smat: SMAT }[b.dataset.k]; buy(list.find((x) => x.id === b.dataset.id), b.dataset.k); PROG().save(); if (b.dataset.k !== 'mat') setView('sole'); }
    else if (b.id === 'wundo') { const u = undo.pop(); if (u) pg.putImageData(u, 0, 0); save(); }
    else if (b.id === 'wclear') { pushUndo(); pg.clearRect(0, 0, W, H); const B = cfg(); B.sole = '#ffffff'; B.stud = '#d8d8e0'; save(); }
    panel(); draw(); });
  $('wpanel')?.addEventListener('input', (e) => { if (e.target.id === 'wpick') { color = e.target.value; e.target.parentElement.style.background = color; } });
  // ---- painting on the boot
  const pos = (e) => { const cv = $('wcv'), r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.width, (e.clientY - r.top) / r.height * cv.height]; };
  let down = false, last = null;
  const act = (e, first) => { const [x, y] = pos(e);
    if (view === 'sole') { if (!first) return; const c0 = color; if (tool === 'erase') color = '#ffffff'; pushUndo();
      if (studXY.some(([sx, sy, r]) => Math.hypot(sx - x, sy - y) <= r)) { fillPart(11, false); $('wpart').textContent = PARTS[11]; }
      else if (soleMask[(y | 0) * SW + (x | 0)]) { fillPart(10, false); $('wpart').textContent = PARTS[10]; }
      color = c0; save(); draw(); return; }
    const k = partsData[(y | 0) * W + (x | 0)];
    if (tool === 'part' || tool === 'pat') { if (!first || !k) return; pushUndo(); fillPart(k, tool === 'pat'); $('wpart').textContent = PARTS[k] || ''; save(); draw(); return; }
    if (first) pushUndo();
    if (last) { const [lx, ly] = last, n = Math.ceil(Math.hypot(x - lx, y - ly) / 2); for (let s = 1; s <= n; s++) stamp(lx + (x - lx) * s / n, ly + (y - ly) * s / n, tool === 'erase'); } else stamp(x, y, tool === 'erase');
    last = [x, y]; draw(); };
  const cvEl = () => $('wcv');
  document.addEventListener('pointerdown', (e) => { if (e.target !== cvEl()) return; e.preventDefault(); down = true; last = null; act(e, true); });
  document.addEventListener('pointermove', (e) => { if (!down) return; if (view === 'side' && (tool === 'brush' || tool === 'erase')) act(e, false);
    else if (e.target === cvEl() && view === 'side') { const [x, y] = pos(e); $('wpart').textContent = PARTS[partsData[(y | 0) * W + (x | 0)]] || ''; } });
  document.addEventListener('pointerup', () => { if (down && (tool === 'brush' || tool === 'erase')) save(); down = false; last = null; });
  document.addEventListener('mousemove', (e) => { if (down || e.target !== cvEl() || view !== 'side') return; const [x, y] = pos(e); $('wpart').textContent = PARTS[partsData[(y | 0) * W + (x | 0)]] || ''; });
  // ---- views
  const setView = (v) => { view = v; const sideV = v === 'side'; $('wbg').src = sideV ? 'warsztat_side.jpg?v=1' : 'warsztat_sole.jpg?v=1';
    $('wcv').className = sideV ? 'side' : 'sole'; $('wtabS').classList.toggle('on', sideV); $('wtabP').classList.toggle('on', !sideV); $('wpart').textContent = ''; draw(); };
  const openEditor = async () => { await (ready || (ready = prep())); $('wroom').hidden = true; $('wedit').hidden = false; panel(); setView('side'); };
  window.WARSZTAT = { open() { $('warsztat').hidden = false; $('wroom').hidden = false; $('wedit').hidden = true; ready = ready || prep(); } };
  $('wtable').onclick = openEditor; $('wgo').onclick = openEditor;
  $('wtabS').onclick = () => setView('side'); $('wtabP').onclick = () => setView('sole');
  $('wback').onclick = () => { if (!$('wedit').hidden) { $('wedit').hidden = true; $('wroom').hidden = false; } else $('warsztat').hidden = true; };
  // load the saved paint early so the bonus is known
  setTimeout(() => { if (window.PROG) cfg(); }, 0);
})();
