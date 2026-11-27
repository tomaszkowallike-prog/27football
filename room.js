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
    <div class="pv" data-v="2" hidden><img src="pokoj_szafa.jpg?v=1" alt=""><div id="prods"></div><div id="pshelf"></div><div class="pinfo" id="pinfo"></div>
      <button class="pbtn" id="pclose" style="left:2%;bottom:3%">${T('◀ ZAMKNIJ SZAFĘ', '◀ CLOSE WARDROBE')}</button><button class="pbtn shop" id="pshop" style="right:2%;bottom:3%">${T('SKLEP', 'SHOP')}</button></div>
    <button class="parrow l" id="pleft" aria-label="${T('W lewo', 'Left')}"></button><button class="parrow r" id="pright" aria-label="${T('W prawo', 'Right')}"></button>
    <div class="ptitle" id="ptitle">${T('MÓJ POKÓJ', 'MY ROOM')}</div>
    <button class="pbtn" id="pback" style="left:2%;top:3%">${T('◀ SZATNIA', '◀ LOCKER ROOM')}</button><div class="phint" id="phint"></div></div>`;
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

  const fill = () => { const P = window.PROG.get(), I = window.ITEMS || [], shirts = I.filter((i) => i.slot === 'shirt'), boots = I.filter((i) => i.slot === 'boots');
    const owns = (it) => it.free || P.owned.includes(it.id), cur = (slot) => P[slot] || (slot === 'shirt' ? 's0' : null);
    const rods = $('prods'), shelf = $('pshelf'); rods.innerHTML = ''; shelf.innerHTML = '';
    // two hang on the left rod, two on the right one
    const SX = [31.6, 40.4, 51.2, 55.8];
    shirts.slice(0, 4).forEach((it, i) => { const b = document.createElement('button'), own = owns(it), on = own && cur('shirt') === it.id;
      b.className = 'pitem shirt' + (own ? '' : ' none') + (on ? ' on' : ''); b.style.left = SX[i] + '%'; b.style.animationDelay = (i * 0.37) + 's';
      if (own) b.appendChild(window.SHIRT_ART(it)); else b.innerHTML = `<i></i><em>${it.price}</em>`;
      b.onclick = () => choose(it, 'shirt', own, on); rods.appendChild(b); });
    // boots stand on the floor of the lower compartments
    const BX = [33.2, 41.3, 53.2];
    boots.slice(0, 3).forEach((it, i) => { const b = document.createElement('button'), own = owns(it), on = own && cur('boots') === it.id;
      b.className = 'pitem boot' + (own ? '' : ' none') + (on ? ' on' : ''); b.style.left = BX[i] + '%';
      if (own) { b.appendChild(BOOT_ART(it)); b.appendChild(BOOT_ART(it)); } else b.innerHTML = `<i></i><em>${it.price}</em>`;
      b.onclick = () => choose(it, 'boots', own, on); shelf.appendChild(b); });
    const sh = I.find((i) => i.id === cur('shirt')), bo = I.find((i) => i.id === cur('boots')), L = window.L || ((x) => x);
    $('pinfo').innerHTML = `<b>${T('NA SOBIE', 'WEARING')}:</b> ${sh ? L(sh.name) : '-'} · ${bo ? L(bo.name) : T('ZWYKŁE BUTY', 'PLAIN BOOTS')}`; };

  const choose = (it, slot, own, on) => { const P = window.PROG.get(), L = window.L || ((x) => x);
    if (!own) { nope(); window.TOAST?.(`${L(it.name)}\n${T('Sklep: COMING SOON', 'Shop: COMING SOON')}`); return; }
    if (slot === 'shirt') P.shirt = it.id; else P.boots = on ? null : it.id;
    pick(); window.PROG.save(); fill(); };

  $('pleft').onclick = () => show(view === 0 ? 1 : 0); $('pright').onclick = () => show(view === 0 ? 1 : 0);
  $('pwardrobe').onclick = () => { creak(); show(2); }; $('pclose').onclick = () => { creak(); show(1); };
  $('pdoor').onclick = $('pback').onclick = () => close();
  $('pshop').onclick = () => window.OPENSHOP?.();
  $('pballs').onclick = (e) => { tone(300, 0.08, 'triangle', 0.08, 180); e.currentTarget.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3%)' }, { transform: 'translateY(0)' }], { duration: 300 }); };
  $('pmon').onclick = () => { const m = $('pmon'); m.classList.toggle('lit'); tone(m.classList.contains('lit') ? 880 : 440, 0.08); };
  const open = () => { root.hidden = false; show(0); }, close = () => { root.hidden = true; };
  window.POKOJ = { open, close };
})();
