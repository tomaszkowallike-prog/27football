// The player's room: two views of the room (desk + window, wardrobe + door) and the open wardrobe,
// where the shirts bought in the shop hang on the rods and the boots stand on the bottom shelves.
// Tap a shirt or a pair of boots to put it on. The door leads back to the changing room.
(() => {
  const $ = (id) => document.getElementById(id), EN = window.LANG === 'en', T = (pl, en) => (EN ? en : pl);
  const root = document.createElement('div'); root.id = 'pokoj'; root.hidden = true;
  root.innerHTML = `<div class="pbg"></div><div class="side90 l purple"></div><div class="side90 r purple"></div><div class="pbox">
    <div class="pv" data-v="0"><img src="pokoj_a.jpg?v=2" alt=""><div class="psun"></div><div class="ptv"></div><div class="plamp"></div><button class="phot" id="pmon" style="left:58.6%;top:29%;width:22%;height:18%" aria-label="Monitor"></button></div>
    <div class="pv" data-v="1" hidden><img src="pokoj_b.jpg?v=1" alt=""><button class="phot" id="pwardrobe" style="left:17.2%;top:17%;width:31.4%;height:78%" aria-label="${T('Szafa', 'Wardrobe')}"></button>
      <button class="phot" id="pdoor" style="left:56.7%;top:17.4%;width:19.7%;height:63%" aria-label="${T('Drzwi', 'Door')}"></button><button class="phot" id="pballs" style="left:79.6%;top:57.6%;width:13%;height:42%" aria-label="Piłki"></button></div>
    <div class="pv" data-v="2" hidden><img id="pszimg" src="pokoj_szafa.jpg?v=1" alt=""><button class="phot" id="pszhot" style="left:16%;top:12%;width:64%;height:82%" aria-label="${T('Moje rzeczy', 'My stuff')}"></button><div class="pinfo" id="pinfo"></div>
      <button class="pbtn" id="pclose" style="left:2%;bottom:3%">${T('◀ ZAMKNIJ SZAFĘ', '◀ CLOSE WARDROBE')}</button></div>
    <button class="parrow l" id="pleft" aria-label="${T('W lewo', 'Left')}"></button><button class="parrow r" id="pright" aria-label="${T('W prawo', 'Right')}"></button>
    <div class="ptitle" id="ptitle">${T('MÓJ POKÓJ', 'MY ROOM')}</div>
    <button class="pbtn" id="pback" style="left:2%;top:3%">${T('◀ SZATNIA', '◀ LOCKER ROOM')}</button><div class="phint" id="phint"></div></div>
    <div id="pwar" hidden><div class="pwbox"><div class="pwtop"><b>${T('MOJA SZAFA', 'MY WARDROBE')}</b><button class="pwtab on" data-t="shirt">${T('KOSZULKI', 'JERSEYS')}</button><button class="pwtab" data-t="boots">${T('BUTY', 'BOOTS')}</button><button class="pwx" id="pwx">✕</button></div>
      <div class="pwgrid" id="pwgrid"></div><p class="pwnote" id="pwnote"></p></div></div>`;
  document.body.appendChild(root);

  // sounds: a short creak for the wardrobe, a click for picking
  let AC = null; const tone = (f, d, type = 'square', v = 0.05, f2) => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); } catch (e) {} };
  const creak = () => { tone(180, 0.35, 'sawtooth', 0.03, 120); setTimeout(() => tone(150, 0.25, 'sawtooth', 0.025, 210), 160); };
  const pick = () => { tone(660, 0.07); setTimeout(() => tone(990, 0.12), 70); };
  const nope = () => tone(140, 0.18, 'square', 0.05, 100);

  // pixel art drawn in code, so a new shirt in the shop needs no new picture
  const px = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn((col, x, y, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }); return c; };
  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111' };
  const num = (r, n, x, y, col) => String(n).split('').forEach((d, i) => { const m = DIG[d]; for (let k = 0; k < 15; k++) if (m[k] === '1') r(col, x + i * 4 + k % 3, y + (k / 3 | 0)); });
  window.SHIRT_ART = (it, n = window.CAPTAIN || 27) => px(26, 40, (r) => { const s = it.shirt;
    // hanger
    r('#9aa0a8', 12, 0, 2, 1); r('#9aa0a8', 14, 1, 1, 2); r('#9aa0a8', 12, 3, 2, 1); r('#9aa0a8', 5, 4, 16, 1);
    // outline, then body and sleeves
    r('#111', 1, 4, 24, 12); r('#111', 5, 4, 16, 36); r(s.sl, 2, 5, 4, 10); r(s.sl, 20, 5, 4, 10); r(s.body, 6, 5, 14, 34);
    if (s.stripes) for (let x = 7; x < 20; x += 4) r(s.stripes, x, 5, 2, 34);
    if (s.trim) { r(s.trim, 2, 14, 4, 1); r(s.trim, 20, 14, 4, 1); r(s.trim, 6, 38, 14, 1); }
    r('#111', 11, 5, 4, 2); r(s.collar || s.sl, 11, 5, 4, 1);
    num(r, n, n > 9 ? 9 : 11, 15, s.num); r('rgba(255,255,255,.25)', 6, 5, 1, 33); r('rgba(0,0,0,.18)', 18, 5, 2, 34); });
  const BOOT_ART = (it) => px(18, 10, (r) => { const [a, b] = it.col; r('#111', 1, 1, 8, 6); r('#111', 1, 5, 16, 4); r(a, 2, 2, 6, 5); r(a, 2, 6, 14, 2); r(b, 4, 3, 3, 1); r(b, 9, 6, 4, 1); r('#222', 2, 8, 14, 1); r('#ddd', 3, 9, 1, 1); r('#ddd', 8, 9, 1, 1); r('#ddd', 13, 9, 1, 1); });

  let view = 0;
  const show = (v) => { view = v; root.querySelectorAll('.pv').forEach((e) => (e.hidden = +e.dataset.v !== v)); const open = v === 2;
    $('pleft').hidden = $('pright').hidden = $('pback').hidden = $('ptitle').hidden = open;
    $('phint').textContent = v === 1 ? T('Dotknij szafy, żeby ją otworzyć. Drzwi prowadzą do szatni.', 'Tap the wardrobe to open it. The door leads to the locker room.') : v === 0 ? T('Rozejrzyj się: strzałki obracają pokój.', 'Look around: the arrows turn the room.') : '';
    if (open) fill(); };

  // the open wardrobe fills up with what was bought in the shop: empty, a few, more, full, overflowing (30+)
  // a pink smile and a crooked hand-written BUT / BOOT, drawn in chunky pixels like a kid's doodle
  const KID = () => { const w = 40, h = 36, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#ff4fb4';
    const dot = (x, y) => g.fillRect(Math.round(x), Math.round(y), 2, 2);
    dot(13, 2); dot(13, 4); dot(23, 1); dot(24, 3);                                   // eyes, not quite level
    for (let t = 0; t <= 1; t += 0.03) { const x = 5 + t * 30, y = 8 + Math.sin(t * Math.PI) * 9 + (t > 0.7 ? (t - 0.7) * -8 : 0); dot(x, y); }
    dot(3, 7); dot(36, 6);
    const F = { B: ['110', '101', '110', '101', '110'], U: ['101', '101', '101', '101', '111'], T: ['111', '010', '010', '010', '010'], O: ['111', '101', '101', '101', '111'] };
    const word = T('BUT', 'BOOT'), sp = word.length > 3 ? 8 : 10, x0 = Math.round((w - (word.length - 1) * sp - 6) / 2), jit = [0, 2, -1, 1];
    [...word].forEach((ch, i) => F[ch].forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') g.fillRect(x0 + i * sp + x * 2 + (y > 2 ? i % 2 : 0), 23 + jit[i] + y * 2, 2, 2); })));
    return c; };
  // the stored picture of your boot, with a thick dark pixel outline round its silhouette
  const outlined = (src, done) => { const im = new Image(); im.onload = () => { const w = im.width, h = im.height, B = 4, gw = Math.ceil(w / B) + 4, gh = Math.ceil(h / B) + 4;
    const s = document.createElement('canvas'); s.width = w; s.height = h; const sg = s.getContext('2d'); sg.drawImage(im, 0, 0); const img = sg.getImageData(0, 0, w, h), d = img.data;
    // background = the near-white area reached from the picture's border (a white boot stays whole)
    const bg = new Uint8Array(w * h), st = [], wh = (p) => d[p * 4] > 234 && d[p * 4 + 1] > 234 && d[p * 4 + 2] > 234;
    for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x); for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
    while (st.length) { const p = st.pop(); if (bg[p] || !wh(p)) continue; bg[p] = 1; const x = p % w; if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (p >= w) st.push(p - w); if (p < w * (h - 1)) st.push(p + w); }
    const m = new Uint8Array(gw * gh); for (let p = 0; p < w * h; p++) { if (bg[p]) d[p * 4 + 3] = 0; else m[((p / w / B | 0) + 2) * gw + ((p % w) / B | 0) + 2] = 1; }
    sg.putImageData(img, 0, 0);
    const c = document.createElement('canvas'); c.width = gw * B; c.height = gh * B; const g = c.getContext('2d'); g.fillStyle = '#1a1030';
    for (let y = 2; y < gh - 2; y++) for (let x = 2; x < gw - 2; x++) { let n = 0; for (let dy = -2; dy <= 2 && !n; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2 && m[(y + dy) * gw + x + dx]) { n = 1; break; } if (n) g.fillRect(x * B, y * B, B, B); }
    g.fillStyle = '#fff'; for (let p = 0; p < w * h; p++) if (!bg[p]) g.fillRect((p % w) + 2 * B, (p / w | 0) + 2 * B, 1, 1);   // no outline showing through the boot
    g.drawImage(s, 2 * B, 2 * B); done(c); }; im.src = src; };
  const mineView = (src) => { const ov = document.createElement('div'); ov.className = 'pwbig'; const P = window.PROG.get(), on = P.kboots === 'myboot';
    ov.innerHTML = `<div class="pwbigb"><button class="pwx">✕</button><b>${T('MÓJ BUT', 'MY BOOT')}</b><div class="pwbigi"></div><button class="pwwear${on ? ' on' : ''}">${on ? T('ZAŁOŻONE', 'WEARING') : T('ZAŁÓŻ', 'WEAR')}</button></div>`;
    outlined(src, (c) => ov.querySelector('.pwbigi').appendChild(c));
    ov.onclick = (e) => { if (e.target === ov || e.target.classList.contains('pwx')) ov.remove(); };
    ov.querySelector('.pwwear').onclick = () => { const P2 = window.PROG.get(); P2.kboots = P2.kboots === 'myboot' ? null : 'myboot'; window.PROG.save(); pick(); ov.remove(); war(); };
    $('pwar').appendChild(ov); };
  const myShirts = () => (window.PROG.get().owned || []).filter((k) => /^shirt\d+$/.test(k));
  const fill = () => { const n = myShirts().length, pic = n >= 30 ? 4 : n >= 15 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0;
    $('pszimg').src = pic ? `pokoj_szafa${pic}.jpg?v=1` : 'pokoj_szafa.jpg?v=1';
    $('pinfo').innerHTML = n ? `<b>${T('KOSZULKI', 'JERSEYS')}:</b> ${n} · ${T('dotknij szafy', 'tap the wardrobe')}` : T('Szafa jest pusta. Kup koszulki w sklepie!', 'The wardrobe is empty. Buy jerseys in the shop!'); };
  // the white window with your own things
  let tab = 'shirt';
  const war = () => { const P = window.PROG.get(), grid = $('pwgrid'); root.querySelectorAll('.pwtab').forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); grid.innerHTML = ''; grid.className = 'pwgrid';
    if (tab === 'shirt') { const list = myShirts();
      list.forEach((k) => { const it = window.JSHOP?.info(k); if (!it) return; const on = P.shirt === k, b = document.createElement('button'); b.className = 'pwit' + (on ? ' on' : '');
        b.innerHTML = `<img src="${it.img}" alt=""><span>${it.name}</span><em>${on ? T('ZAŁOŻONA', 'WEARING') : T('ZAŁÓŻ', 'WEAR')}</em>`;
        b.onclick = () => { const P2 = window.PROG.get(); P2.shirt = P2.shirt === k ? null : k; window.PROG.save(); pick(); war(); }; grid.appendChild(b); });
      $('pwnote').textContent = list.length ? '' : T('Nie masz jeszcze koszulek. Kup je w sklepie.', 'No jerseys yet. Buy some in the shop.'); }
    else { const list = (P.owned || []).filter((k) => /^boot\d+$/.test(k)); grid.className = 'pwgrid bt';
      // left: a small doodle icon; tapping it shows the boot you made in the workshop in the middle
      let mine = null; try { mine = P.myboot && localStorage.getItem('boot_mine'); } catch (e) {}
      const left = document.createElement('button'); left.className = 'pwmine' + (P.kboots === 'myboot' ? ' on' : ''); left.title = T('Mój but', 'My boot'); left.appendChild(KID()); grid.appendChild(left);
      left.onclick = () => { pick(); if (mine) mineView(mine); else window.TOAST?.(T('Zrób swojego buta w warsztacie!', 'Make your own boot in the workshop!')); };
      const box = document.createElement('div'); box.className = 'pwlist'; grid.appendChild(box);
      list.forEach((k) => { const it = window.JSHOP?.info(k); if (!it) return; const on = P.kboots === k, b = document.createElement('button'); b.className = 'pwit boot' + (on ? ' on' : '');
        b.innerHTML = `<img src="${it.img}" alt=""><span>${it.name}</span><em>${on ? T('ZAŁOŻONE', 'WEARING') : T('ZAŁÓŻ', 'WEAR')}</em>`;
        b.onclick = () => { const P2 = window.PROG.get(); P2.kboots = P2.kboots === k ? null : k; window.PROG.save(); pick(); war(); }; box.appendChild(b); });
      $('pwnote').textContent = list.length ? '' : T('Butów ze sklepu jeszcze nie masz.', 'No boots from the shop yet.'); }
    $('pwar').hidden = false; };
  root.querySelectorAll('.pwtab').forEach((b) => (b.onclick = () => { tab = b.dataset.t; pick(); war(); }));
  $('pwx').onclick = () => { $('pwar').hidden = true; };
  $('pszhot').onclick = () => { window.JSHOP?.preload?.(); war(); };
  const choose = (it, slot, own, on) => { const P = window.PROG.get(), L = window.L || ((x) => x);
    if (!own) { nope(); window.TOAST?.(`${L(it.name)}\n${T('Sklep: COMING SOON', 'Shop: COMING SOON')}`); return; }
    if (slot === 'shirt') P.shirt = it.id; else P.boots = on ? null : it.id;
    pick(); window.PROG.save(); fill(); };

  $('pleft').onclick = () => show(view === 0 ? 1 : 0); $('pright').onclick = () => show(view === 0 ? 1 : 0);
  $('pwardrobe').onclick = () => { creak(); show(2); }; $('pclose').onclick = () => { creak(); show(1); };
  $('pdoor').onclick = $('pback').onclick = () => close();
  $('pballs').onclick = (e) => { tone(300, 0.08, 'triangle', 0.08, 180); e.currentTarget.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3%)' }, { transform: 'translateY(0)' }], { duration: 300 }); };
  $('pmon').onclick = () => { const m = $('pmon'); m.classList.toggle('lit'); tone(m.classList.contains('lit') ? 880 : 440, 0.08); };
  const open = () => { root.hidden = false; show(0); }, close = () => { root.hidden = true; };
  window.POKOJ = { open, close };
})();
