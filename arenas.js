// More arenas for the match: each one is a pitch palette, a surround, a sky, a light, a weather and its own scenery.
// Scenery is built only when the arena is picked. The camera sees mostly the strip just behind the far boards and the
// two ends, so the pieces stand close to the pitch and the big landmarks rise behind them.
export default function extraArenas(C) {
  const { THREE, lam, tex, PX, PZ } = C;
  const M = (c, o = {}) => lam({ color: c, flatShading: true, ...o });
  const GL = (c, k = 0.9) => lam({ color: c, emissive: c, emissiveIntensity: k, flatShading: true });
  const BA = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const mat = (c) => (typeof c === 'string' ? M(c) : c);
  const add = (gr, geo, c, x, y, z, sh = false) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.castShadow = sh; gr.add(m); return m; };
  const box = (gr, w, h, d, c, x, y, z, sh) => add(gr, new THREE.BoxGeometry(w, h, d), c, x, y, z, sh);
  const cyl = (gr, rt, rb, h, c, x, y, z, seg = 8) => add(gr, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z);
  const cone = (gr, r, h, c, x, y, z, seg = 7) => add(gr, new THREE.ConeGeometry(r, h, seg), c, x, y, z);
  const sph = (gr, r, c, x, y, z, d = 1) => add(gr, new THREE.IcosahedronGeometry(r, d), c, x, y, z);
  const R = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const far = (n, fn, z0 = 6, z1 = 15, x0 = -72, x1 = 72) => { for (let i = 0; i < n; i++) fn(x0 + (i + 0.5) * (x1 - x0) / n + R(-2, 2), -PZ - R(z0, z1), i); };
  const ends = (n, fn, d0 = 8, d1 = 22) => { for (let i = 0; i < n; i++) fn((i % 2 ? 1 : -1) * (PX + R(d0, d1)), R(-PZ - 4, PZ + 4), i); };
  const tick = (gr, f) => (gr.userData.tick ||= []).push(f);
  const tile = (draw, rep = [50, 40]) => tex(64, 64, draw, { repeat: rep });
  const speck = (g, cols, n, s = 64) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 1 + (i % 5 === 0), 1); } };
  const fill = (g, c) => { g.fillStyle = c; g.fillRect(0, 0, 64, 64); };
  const pal = (base, s1, s2, noise, worn, line, more = {}) => ({ base, s1, s2, noise, worn, wornE: 'rgba(0,0,0,.18)', line, txt: 'rgba(255,255,255,.16)', ...more });
  const crack = (cols, n) => (g, W, H, K) => { for (let i = 0; i < n; i++) { let x = Math.random() * W, y = Math.random() * H; const a0 = Math.random() * 6.28;
    for (let k = 0; k < 18; k++) { const a = a0 + Math.sin(k * 1.7 + i) * 0.8; x += Math.cos(a) * 3; y += Math.sin(a) * 3; g.fillStyle = cols[0]; g.fillRect(x | 0, y | 0, 3, 2); g.fillStyle = cols[1]; g.fillRect((x | 0) + 1, y | 0, 1, 1); } } };
  const dots = (cols, n, s = 1) => (g, W, H) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, s, s); } };
  const plates = (cols, seam, stud) => (g, W, H, K) => { const B = stud ? K : 2 * K; for (let y = 0; y < H; y += B) for (let x = 0; x < W; x += B) {
    g.fillStyle = cols[(Math.abs(Math.sin(x * 12.9 + y * 78.2)) * 9999 | 0) % cols.length]; g.fillRect(x, y, B, B);
    if (stud) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 1, y + 1, B - 3, 1); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 1, y + B - 2, B - 2, 1); g.fillRect(x + B - 2, y + 1, 1, B - 2); }
    else { g.fillStyle = seam; g.fillRect(x, y + B - 1, B, 1); g.fillRect(x + B - 1, y, 1, B); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x + B - 3, y + 1, 1, 1); } } };
  const planks = (g, W, H, K) => { for (let y = 0; y < H; y += K) { g.fillStyle = 'rgba(60,30,10,.45)'; g.fillRect(0, y, W, 1); for (let x = (y * 7) % (K * 9); x < W; x += K * 9) { g.fillRect(x, y, 1, K); g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(x + 2, y + 2, 1, 1); g.fillStyle = 'rgba(60,30,10,.45)'; } } };
  // a canvas texture with stripes (tents, candy canes, sails)
  const stripes = (a, b, n = 8, vert = true) => { const t = tex(16, 16, (g) => { for (let i = 0; i < 16; i++) { g.fillStyle = Math.floor(i / (16 / n)) % 2 ? a : b; if (vert) g.fillRect(i, 0, 1, 16); else g.fillRect(0, i, 16, 1); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const winTex = (wall, lit, dark, lights = 0.5) => tex(16, 16, (g) => { g.fillStyle = wall; g.fillRect(0, 0, 16, 16); for (const x of [2, 9]) for (const y of [2, 9]) { g.fillStyle = Math.random() < lights ? lit : dark; g.fillRect(x, y, 5, 5); } });
  const building = (gr, x, z, w, h, d, wall, lit, dark, y0 = 0, glow = 0.5) => { const t = winTex(wall, lit, dark); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, w / 3), Math.max(1, h / 3));
    return add(gr, new THREE.BoxGeometry(w, h, d), lam({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: glow }), x, y0 + h / 2, z); };
  const textTex = (s, bg, fg, w = 64, h = 16) => tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `${h - 4}px "Press Start 2P", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, h / 2 + 1); });
  const sign = (gr, s, bg, fg, x, y, z, w = 8, h = 2, glow = 0.8) => { const t = textTex(s, bg, fg); return add(gr, new THREE.PlaneGeometry(w, h), lam({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: glow, side: THREE.DoubleSide }), x, y, z); };
  // shared pieces
  const peak = (gr, x, z, r, h, rock, capC = '#ffffff', capGlow = false) => { cone(gr, r, h, rock, x, h / 2, z); const c = cone(gr, r * 0.42, h * 0.42, capGlow ? GL(capC, 1.2) : M(capC), x, h * 0.79 + 0.05, z); return c; };
  const volcano = (gr, x, z, r, h) => { cone(gr, r, h, '#3a3030', x, h / 2, z); cone(gr, r * 0.3, h * 0.12, GL('#ff5a14', 1.4), x, h * 0.95, z, 7);
    for (let k = 0; k < 3; k++) { const s = box(gr, 1.2, h * 0.6, 0.6, GL('#ff6a1a', 1.2), x + Math.cos(k * 2.1 + 0.4) * r * 0.32, h * 0.62, z + Math.sin(k * 2.1 + 0.4) * r * 0.32 + 1); s.rotation.z = Math.cos(k * 2.1) * 0.55; s.rotation.x = 0.3; }
    const smoke = []; for (let k = 0; k < 6; k++) smoke.push(sph(gr, R(2, 3.5), BA('#5a5050', { transparent: true, opacity: 0.55 }), x, h + k * 3, z)); tick(gr, (t) => smoke.forEach((s, k) => { const p = (t * 0.25 + k / 6) % 1; s.position.set(x + p * 6, h + p * 18, z); s.scale.setScalar(0.6 + p * 1.6); s.material.opacity = 0.6 * (1 - p); })); };
  const rock = (gr, x, z, s, c) => { const m = sph(gr, s, c, x, s * 0.3, z, 0); m.rotation.set(R(0, 3), R(0, 3), 0); return m; };
  const tree = (gr, x, z, s, trunk, leaves) => { cyl(gr, 0.3 * s, 0.45 * s, 3 * s, trunk, x, 1.5 * s, z, 6); for (let k = 0; k < 3; k++) sph(gr, (1.6 - k * 0.25) * s, pick(leaves), x + R(-0.8, 0.8) * s, (3.2 + k * 1.1) * s, z + R(-0.6, 0.6) * s, 0); };
  const palm = (gr, x, z, s = 1) => { for (let i = 0; i < 7; i++) box(gr, 0.55 * s, 1.1 * s, 0.55 * s, '#8a6a3a', x + i * 0.12 * s, (0.55 + i * 1.05) * s, z); for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28, l = box(gr, 3.6 * s, 0.22, 0.9 * s, '#3f9a3a', x + 0.8 * s + Math.cos(a) * 1.6 * s, 7.4 * s, z + Math.sin(a) * 1.6 * s); l.rotation.y = -a; l.rotation.z = -0.4; } };
  const cloud = (gr, x, y, z, s = 1, c = '#ffffff') => { const g2 = new THREE.Group(); for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(R(1.6, 2.6) * s, 1), BA(c, { fog: false })); m.position.set(k * 2 * s - 4 * s, R(-0.5, 0.8) * s, R(-1, 1)); g2.add(m); } g2.position.set(x, y, z); gr.add(g2); return g2; };
  const stars = (gr, n = 700, col = '#ffffff') => { const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2 + 0.05, r = 260; pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gr.add(new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: 2, sizeAttenuation: false, fog: false }))); };
  const moonDisc = (gr, c, x, y, z, r) => add(gr, new THREE.CircleGeometry(r, 16), BA(c, { fog: false }), x, y, z);
  const fence = (gr, c, z = -PZ - 5.5, x0 = -60, x1 = 60, h = 1.2) => { box(gr, x1 - x0, 0.25, 0.25, c, (x0 + x1) / 2, h, z); for (let x = x0; x <= x1; x += 3) box(gr, 0.25, h, 0.25, c, x, h / 2, z); };

  const DEF = {}, BUILD = {};
  // 1. volcano: black pitch with glowing cracks, a lake of lava round it
  DEF.wulkan = { name: 'WULKAN', sky: '#2a1410', fog: '#3a1a10', near: 60, far: 210, hemi: ['#ffb08a', '#3a1008', 1.5], sun: ['#ffc090', 1.9], grav: 30, wx: 'embers',
    pal: pal('#2a2426', '#302a2c', '#262022', ['#3a3236', '#1a1416', '#4a2a20', '#5a3020'], ['#3a2a24', '#4a2a1a', '#2a1a14'], '#ffd8a0', { wornE: 'rgba(255,90,20,.25)', txt: 'rgba(255,120,40,.2)', extra: crack(['#ff5a14', '#ffd24a'], 46) }),
    track: () => tile((g) => { fill(g, '#ff4a10'); speck(g, ['#ffb02a', '#ffd24a', '#c81a08'], 160); g.fillStyle = '#3a1a10'; for (let i = 0; i < 5; i++) g.fillRect(R(0, 56) | 0, R(0, 58) | 0, R(4, 10) | 0, R(3, 6) | 0); }), trackGlow: '#ff5a14', flow: 0.03 };
  BUILD.wulkan = (gr) => { volcano(gr, -8, -PZ - 40, 22, 30); volcano(gr, -PX - 30, -10, 16, 22); volcano(gr, PX + 34, 4, 18, 26);
    far(16, (x, z) => rock(gr, x, z, R(1, 2.6), pick(['#2a2426', '#3a3236', '#1a1416']))); ends(10, (x, z) => rock(gr, x, z, R(1, 2.4), '#2a2426'));
    far(8, (x, z) => { const s = box(gr, 0.5, R(4, 8), 0.5, '#1a1416', x, 2, z); s.rotation.z = R(-0.3, 0.3); }, 8, 14); };
  // 2. jungle: giant trees, palms, ferns and a waterfall
  DEF.dzungla = { name: 'DŻUNGLA', sky: '#a8e0b8', fog: '#7ab890', near: 50, far: 180, hemi: ['#eaffe0', '#2a5a2a', 1.9], sun: ['#fff6d0', 2.4], grav: 30, wx: 'leaves',
    pal: pal('#3a8a3a', '#3f9440', '#368238', ['#2a6a2a', '#4aa04a', '#5ab45a', '#2f7030'], ['#6a4a2a', '#5a3e22', '#7a5a34'], '#f4f8e8'),
    track: () => tile((g) => { fill(g, '#3a2a1a'); speck(g, ['#2a6a2a', '#4a3420', '#5a8a3a', '#2a1a10'], 220); }) };
  BUILD.dzungla = (gr) => { const greens = ['#1f6a2a', '#2a7a32', '#185a22', '#2f8a3a'];
    far(7, (x, z) => { cyl(gr, 1.2, 1.8, 22, '#5a3e24', x, 11, z, 7); for (let k = 0; k < 5; k++) sph(gr, R(4, 6), pick(greens), x + R(-4, 4), R(16, 24), z + R(-2, 2), 0); }, 14, 22);
    far(10, (x, z) => palm(gr, x, z, R(1, 1.4)), 6, 10); ends(10, (x, z) => palm(gr, x, z, R(1, 1.3)));
    far(22, (x, z) => { const f = cone(gr, R(1.4, 2.4), 1.4, pick(greens), x, 0.7, z, 6); f.scale.y = 0.6; }, 5, 9); ends(14, (x, z) => sph(gr, R(1.2, 2), pick(greens), x, 0.8, z, 0));
    // the waterfall: a cliff, a falling sheet of water that runs, a pool
    box(gr, 24, 30, 8, '#5a6a5a', 18, 15, -PZ - 30); for (let k = 0; k < 6; k++) sph(gr, R(3, 5), pick(greens), 6 + k * 5, 30, -PZ - 27, 0);
    const wt = tex(16, 32, (g) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (x * 7 + y * 3) % 11 < 3 ? '#ffffff' : (x + y) % 5 ? '#6ac8f0' : '#8ad8ff'; g.fillRect(x, y, 1, 1); } }); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(2, 3);
    add(gr, new THREE.PlaneGeometry(7, 28), BA('#ffffff', { map: wt }), 18, 14, -PZ - 25.9); tick(gr, (t, dt) => { wt.offset.y += dt * 1.6; });
    const pool = add(gr, new THREE.CircleGeometry(7, 12), BA('#6ac8f0'), 18, 0.06, -PZ - 22); pool.rotation.x = -Math.PI / 2; pool.scale.y = 0.6; };
  // 3. ocean floor: corals, seaweed, shoals of fish, jellyfish; lower gravity
  DEF.ocean = { name: 'OCEAN', sky: '#0a4a7a', fog: '#0e5a8a', near: 30, far: 150, hemi: ['#9ae8ff', '#0a3a5a', 1.8], sun: ['#c8f4ff', 1.7], grav: 20, wx: 'bubbles',
    pal: pal('#c8c49a', '#cfcaa2', '#c2be94', ['#b0ac84', '#dcd8b0', '#a8a47c', '#e4e0bc'], ['#a8a07a', '#9a9270', '#b4ac86'], '#ffffff', { extra: (g, W, H) => { g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 260; i++) { const x = Math.random() * W, y = Math.random() * H; for (let k = 0; k < 6; k++) g.fillRect((x + k * 2) | 0, (y + Math.sin(k) * 2) | 0, 2, 1); } } }),
    track: () => tile((g) => { fill(g, '#b8b48a'); speck(g, ['#a09c74', '#d0cca4', '#e8e4c8', '#8a8664'], 220); g.fillStyle = '#f4d8c8'; g.fillRect(20, 30, 3, 2); g.fillRect(44, 12, 2, 2); }) };
  BUILD.ocean = (gr) => { const coral = ['#ff6a8a', '#ff9a4a', '#c86aff', '#ffd24a', '#4ae0c8', '#ff4a6a'];
    const coralAt = (x, z) => { for (let k = 0; k < 4; k++) { const c = pick(coral); if (k % 2) cyl(gr, 0.3, 0.5, R(2, 5), c, x + R(-1.5, 1.5), 1.5, z + R(-1, 1), 6); else sph(gr, R(0.8, 1.6), c, x + R(-1.5, 1.5), R(0.6, 2.4), z + R(-1, 1), 1); } };
    far(14, coralAt, 6, 12); ends(12, coralAt);
    const weeds = []; far(26, (x, z) => { const h = R(4, 10), w = box(gr, 0.35, h, 0.2, pick(['#2a8a4a', '#3aa05a', '#1f7040']), x, h / 2, z); weeds.push([w, R(0, 6)]); }, 5, 14); ends(14, (x, z) => { const h = R(3, 8), w = box(gr, 0.35, h, 0.2, '#2a8a4a', x, h / 2, z); weeds.push([w, R(0, 6)]); });
    tick(gr, (t) => weeds.forEach(([w, p]) => { w.rotation.z = Math.sin(t * 1.2 + p) * 0.18; }));
    far(10, (x, z) => rock(gr, x, z, R(1.2, 3), pick(['#5a6a7a', '#4a5a6a', '#6a7a8a'])), 8, 16);
    const chest = box(gr, 2.4, 1.4, 1.6, '#7a4a22', -14, 0.7, -PZ - 7); box(gr, 2.5, 0.3, 1.7, '#e8c040', -14, 1.45, -PZ - 7); sph(gr, 0.4, GL('#ffd24a'), -13.2, 1.7, -PZ - 6.6, 0);
    // shoals and jellyfish
    for (let s = 0; s < 4; s++) { const g2 = new THREE.Group(), col = pick(['#ffb02a', '#ffd24a', '#5ac8ff', '#ff6a4a']); for (let k = 0; k < 14; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.18), M(col)); f.position.set(R(-3, 3), R(-1.5, 1.5), R(-2, 2)); g2.add(f); }
      gr.add(g2); const cx = R(-40, 40), cy = R(6, 14), cz = -PZ - R(8, 20), r = R(10, 20), sp = R(0.15, 0.3) * (s % 2 ? 1 : -1); tick(gr, (t) => { const a = t * sp + s * 2; g2.position.set(cx + Math.cos(a) * r, cy + Math.sin(t * 0.7 + s) * 1.5, cz + Math.sin(a) * 4); g2.rotation.y = -a + (sp > 0 ? -Math.PI / 2 : Math.PI / 2); }); }
    for (let j = 0; j < 7; j++) { const g2 = new THREE.Group(), c = pick(['#ff8ad8', '#c88aff', '#8ae0ff']);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 5, 0, 6.28, 0, Math.PI / 2), lam({ color: c, emissive: c, emissiveIntensity: 0.5, transparent: true, opacity: 0.75 })); g2.add(bell);
      for (let k = 0; k < 5; k++) { const tn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), BA(c, { transparent: true, opacity: 0.6 })); tn.position.set(Math.cos(k * 1.26) * 0.7, -1.1, Math.sin(k * 1.26) * 0.7); g2.add(tn); }
      const x = R(-60, 60), z = j % 2 ? -PZ - R(6, 18) : R(-PZ, PZ), y = R(6, 16); g2.position.set(j % 3 === 0 ? (x > 0 ? 1 : -1) * (PX + R(8, 16)) : x, y, z); gr.add(g2); const ph = R(0, 6); tick(gr, (t) => { g2.position.y = y + Math.sin(t * 0.8 + ph) * 2; bell.scale.y = 1 + Math.sin(t * 3 + ph) * 0.15; }); } };
  // 4. city of the future: neon towers, holograms, flying cars
  DEF.przyszlosc = { name: 'MIASTO PRZYSZŁOŚCI', sky: '#120a2a', fog: '#1a0e3a', near: 70, far: 230, hemi: ['#9a8aff', '#1a0a2a', 1.4], sun: ['#d0b8ff', 1.7], grav: 30, wx: 'none',
    pal: pal('#1c1c32', '#22223c', '#1a1a2e', ['#2a2a4a', '#14142a', '#3a2a5a', '#2a3a5a'], ['#2a2a44', '#323250', '#24243c'], '#ff3ad8', { txt: 'rgba(90,240,255,.25)', extra: (g, W, H, K) => { g.fillStyle = 'rgba(90,240,255,.13)'; for (let x = 0; x < W; x += 4 * K) g.fillRect(x, 0, 1, H); for (let y = 0; y < H; y += 4 * K) g.fillRect(0, y, W, 1); } }),
    track: () => tile((g) => { fill(g, '#141428'); g.fillStyle = '#2a2a4a'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); } g.fillStyle = '#5af0ff'; g.fillRect(0, 31, 64, 1); }) };
  BUILD.przyszlosc = (gr) => { const neon = ['#5af0ff', '#ff3ad8', '#ffe14a', '#7a5aff'];
    const tower = (x, z, w, h) => { building(gr, x, z, w, h, w, '#16162a', '#5af0ff', '#0e0e1e', 0, 0.7); const c = pick(neon); for (const dx of [-w / 2, w / 2]) box(gr, 0.25, h, 0.25, GL(c, 1.3), x + dx, h / 2, z + w / 2); box(gr, w, 0.3, 0.3, GL(c, 1.3), x, h, z + w / 2); if (Math.random() < 0.5) cyl(gr, 0.1, 0.1, 6, '#8a8aa0', x, h + 3, z); };
    far(12, (x, z) => tower(x, z, R(5, 9), R(18, 50)), 14, 30); ends(8, (x, z) => tower(x, z, R(5, 8), R(14, 40)), 12, 26);
    const holo = []; for (const [x, z] of [[-24, -PZ - 9], [26, -PZ - 10], [-PX - 10, 0], [PX + 10, 0]]) { cyl(gr, 1, 1.4, 0.6, '#2a2a44', x, 0.3, z); const r = add(gr, new THREE.TorusGeometry(2, 0.12, 6, 24), BA('#5af0ff', { transparent: true, opacity: 0.85 }), x, 4, z); const b = sph(gr, 1.2, BA('#ff3ad8', { transparent: true, opacity: 0.5, wireframe: true }), x, 4, z, 1); holo.push([r, b]); }
    tick(gr, (t) => holo.forEach(([r, b], i) => { r.rotation.x = t * 1.2 + i; r.rotation.y = t * 0.8; b.rotation.y = -t; b.position.y = 4 + Math.sin(t * 2 + i) * 0.4; }));
    for (let k = 0; k < 10; k++) { const car = new THREE.Group(); const c = pick(['#e8ecf2', '#ff3ad8', '#5af0ff', '#ffe14a']); const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.1), M(c)); car.add(b); const l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.8), BA('#ff2a4a')); l.position.x = -1.3; car.add(l); const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.8), BA('#ffffff')); f.position.x = 1.3; car.add(f);
      gr.add(car); const y = R(10, 26), z = -PZ - R(10, 30), sp = R(8, 16) * (k % 2 ? 1 : -1), x0 = R(-100, 100); car.rotation.y = sp > 0 ? 0 : Math.PI; tick(gr, (t) => { car.position.set(((x0 + t * sp + 100) % 200 + 200) % 200 - 100, y + Math.sin(t + k) * 0.5, z); }); } };
  // 5. the roof of a skyscraper: railings, vents, a water tower, a helipad, the whole city around and below
  DEF.dach = { name: 'DACH WIEŻOWCA', sky: '#8ac8f0', fog: '#c0dcf0', near: 90, far: 280, hemi: ['#eaf6ff', '#6a7a8a', 2.0], sun: ['#fff4dc', 2.6], grav: 30, wx: 'none',
    pal: pal('#d6d8da', '#dcdee0', '#d2d4d6', ['#c8cacc', '#e4e6e8', '#c0c2c4', '#eaeced'], ['#c4c6c8', '#bcbec0', '#cacccf'], '#2a2c30', { txt: 'rgba(0,0,0,0)', wornE: 'rgba(120,120,120,.2)', extra: (g, W, H, K, X, Z) => { const r = 5.5 * K;
      g.fillStyle = '#2f9a4a'; g.beginPath(); g.ellipse(X(0), Z(0), r, r, 0, 0, 7); g.fill(); g.fillStyle = '#ffffff'; const h = 2.4 * K, w = 1.8 * K, t = Math.max(2, 0.4 * K | 0); g.fillRect(X(0) - w, Z(0) - h, t, h * 2); g.fillRect(X(0) + w - t, Z(0) - h, t, h * 2); g.fillRect(X(0) - w, Z(0) - t / 2, w * 2, t); } }),
    track: () => tile((g) => { fill(g, '#8a8c90'); speck(g, ['#6e7074', '#a4a6aa', '#7a7c80', '#b4b6ba'], 400); }) };
  BUILD.dach = (gr) => { fence(gr, '#c8ccd2', -PZ - 7, -70, 70, 1.3); for (const s of [-1, 1]) { box(gr, 0.25, 0.25, 50, '#c8ccd2', s * (PX + 9), 1.3, 0); for (let z = -24; z <= 24; z += 3) box(gr, 0.25, 1.3, 0.25, '#c8ccd2', s * (PX + 9), 0.65, z); }
    far(6, (x, z) => { if (Math.abs(x - 16) < 9) return; box(gr, 3, 2, 2.4, '#b0b4ba', x, 1, z); cyl(gr, 0.8, 0.8, 0.3, '#3a3c40', x, 2.1, z); }, 4.5, 6);
    const wt = new THREE.Group(); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 0.25), M('#5a3e24')); l.position.set(dx * 1.6, 3, dz * 1.6); wt.add(l); }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 4, 10), M('#8a5a34')); tank.position.y = 8; wt.add(tank); const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 10), M('#5a3e24')); top.position.y = 10.8; wt.add(top); wt.position.set(-PX - 14, 0, -8); gr.add(wt);
    const pad = add(gr, new THREE.CylinderGeometry(6, 6, 0.3, 16), M('#3a3c40'), PX + 16, 0.15, 6); sign(gr, 'H', '#3a3c40', '#ffe14a', PX + 16, 0.32, 6, 6, 6, 0.4).rotation.x = -Math.PI / 2;
    // a helicopter on the pad: rotor spinning up, it lifts a little, wobbles and sets down again, over and over
    const heli = new THREE.Group(), hc = M('#e8361f'); const hb = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 1), hc); hb.scale.set(1.5, 1, 1); hb.position.y = 2.2; heli.add(hb);
    const glass = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), lam({ color: '#8ad8ff', emissive: '#2a6a9a', emissiveIntensity: 0.4 })); glass.scale.set(1, 0.8, 1.1); glass.position.set(1.7, 2.5, 0); heli.add(glass);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 6, 6), hc); boom.rotation.z = Math.PI / 2; boom.position.set(-5, 2.6, 0); heli.add(boom); const fin = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, 0.2), hc); fin.position.set(-7.8, 3.4, 0); heli.add(fin);
    const tr = new THREE.Group(); for (let k = 0; k < 2; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.1), M('#2a2a2e')); bl.rotation.x = 0; bl.rotation.z = k * Math.PI / 2; tr.add(bl); } tr.position.set(-7.8, 3.4, 0.3); heli.add(tr);
    for (const dz of [-1.2, 1.2]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 0.2), M('#3a3a3e')); sk.position.set(0.3, 0.1, dz); heli.add(sk); for (const dx of [-1, 1.4]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), M('#3a3a3e')); st.position.set(dx, 0.7, dz * 0.8); heli.add(st); } }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 6), M('#3a3a3e')); mast.position.y = 3.6; heli.add(mast); const rotor = new THREE.Group(); for (let k = 0; k < 4; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(6, 0.08, 0.4), M('#2a2a2e')); bl.position.x = 3; const arm = new THREE.Group(); arm.add(bl); arm.rotation.y = k * Math.PI / 2; rotor.add(arm); } rotor.position.y = 4.05; heli.add(rotor);
    const HX = 16, HZ = -PZ - 11; add(gr, new THREE.CylinderGeometry(6.5, 6.5, 0.3, 16), M('#3a3c40'), HX, 0.15, HZ); const hp = add(gr, new THREE.TorusGeometry(5.6, 0.2, 4, 24), M('#ffe14a'), HX, 0.32, HZ); hp.rotation.x = Math.PI / 2;
    heli.position.set(HX, 0.3, HZ); heli.rotation.y = 0.25; gr.add(heli);
    tick(gr, (t, dt) => { const c = t % 12, spin = c < 2 ? c / 2 : c < 10 ? 1 : (12 - c) / 2, lift = c > 3 && c < 9 ? Math.sin((c - 3) / 6 * Math.PI) : 0; rotor.rotation.y += dt * (2 + spin * 26); tr.rotation.z += dt * (3 + spin * 30);
      heli.position.y = 0.3 + lift * 4.5 + Math.sin(t * 9) * 0.05 * spin; heli.rotation.z = lift * Math.sin(t * 1.7) * 0.06; heli.rotation.x = lift * Math.sin(t * 1.3) * 0.05; });
    cyl(gr, 0.15, 0.25, 14, '#c8ccd2', 30, 7, -PZ - 6); const bl = sph(gr, 0.4, BA('#ff2a2a'), 30, 14.2, -PZ - 6, 0); tick(gr, (t) => { bl.visible = Math.floor(t * 1.4) % 2 === 0; });
    // the city: towers rising from far below; the near ones are lower than us
    for (let i = 0; i < 34; i++) { const a = R(-1.3, 1.3), d = R(70, 160), x = Math.sin(a) * d * 1.3, z = -PZ - Math.cos(a) * d * 0.7 - 10, w = R(8, 16), h = R(40, 140);
      building(gr, x, z, w, h, w, pick(['#9aa4b0', '#b8c0ca', '#7a8696', '#c8b8a0']), '#dfefff', '#4a5a6a', -100 + R(-20, 30) + (d - 70) * 0.5, 0.15); }
    for (let i = 0; i < 6; i++) cloud(gr, R(-120, 120), R(30, 50), -PZ - R(80, 160), R(1.5, 3)); };
  // 6. ninja village: pagodas, a torii gate, cherry trees, stone lanterns, bamboo
  DEF.ninja = { name: 'WIOSKA NINJA', sky: '#ffd8c8', fog: '#f6d2c4', near: 70, far: 220, hemi: ['#fff2ea', '#6a5a3a', 1.9], sun: ['#ffd8b0', 2.4], grav: 30, wx: 'petals',
    pal: pal('#e0c890', '#e0c890', '#e0c890', [], ['#cdb478', '#c4aa6e', '#d6bc82'], '#8a2a20', { txt: 'rgba(0,0,0,0)', blocks: (g, W, H, K) => { const sw = Math.round(K * 0.8); for (let x = 0, i = 0; x < W; x += sw, i++) { g.fillStyle = ['#e4cc94', '#d8bc80', '#ead6a2', '#dcc288'][i % 4]; g.fillRect(x, 0, sw, H); g.fillStyle = 'rgba(110,80,30,.35)'; g.fillRect(x, 0, 1, H);
      for (let y = (i * 37) % (K * 6); y < H; y += K * 6) { g.fillStyle = 'rgba(120,90,40,.5)'; g.fillRect(x + 1, y, sw - 2, 1); g.fillStyle = 'rgba(255,245,210,.5)'; g.fillRect(x + 1, y + 1, sw - 2, 1); } g.fillStyle = 'rgba(255,250,225,.35)'; g.fillRect(x + 1, 0, 1, H); } } }),
    track: () => tile((g) => { fill(g, '#d8d0bc'); g.fillStyle = '#c4bca6'; for (let y = 2; y < 64; y += 4) g.fillRect(0, y, 64, 1); speck(g, ['#e8e0cc', '#b8b09a'], 80); }) };
  BUILD.ninja = (gr) => { const pagoda = (x, z, s) => { for (let k = 0; k < 4; k++) { const w = (5 - k * 0.9) * s; box(gr, w * 0.7, 2.2 * s, w * 0.7, '#8a2a20', x, (1.1 + k * 3) * s, z); const roof = box(gr, w * 1.25, 0.5 * s, w * 1.25, '#2a2a32', x, (2.4 + k * 3) * s, z); roof.rotation.y = 0; }
      cyl(gr, 0.1 * s, 0.25 * s, 3 * s, '#e8c040', x, 13.6 * s, z); };
    pagoda(-20, -PZ - 14, 1.6); pagoda(34, -PZ - 18, 1.3); pagoda(-PX - 16, 4, 1.1);
    const torii = (x, z, s) => { for (const dx of [-2.4, 2.4]) cyl(gr, 0.3 * s, 0.35 * s, 7 * s, '#d8301f', x + dx * s, 3.5 * s, z, 8); box(gr, 7.4 * s, 0.6 * s, 0.7 * s, '#1a1a1a', x, 7.2 * s, z); box(gr, 6.2 * s, 0.4 * s, 0.5 * s, '#d8301f', x, 6 * s, z); };
    torii(4, -PZ - 7, 1); torii(PX + 12, -6, 0.9);
    const cherry = (x, z, s) => { cyl(gr, 0.3 * s, 0.5 * s, 4 * s, '#4a2a24', x, 2 * s, z, 6); for (let k = 0; k < 5; k++) sph(gr, R(1.4, 2.2) * s, pick(['#ffb6d0', '#ff9ac0', '#ffd0e2']), x + R(-2, 2) * s, R(4, 6) * s, z + R(-1, 1) * s, 0); };
    far(9, (x, z) => cherry(x, z, R(1, 1.4)), 6, 11); ends(8, (x, z) => cherry(x, z, R(0.9, 1.3)));
    const lantern = (x, z) => { box(gr, 0.5, 1.6, 0.5, '#9a9a94', x, 0.8, z); box(gr, 1.4, 0.3, 1.4, '#9a9a94', x, 1.7, z); box(gr, 0.9, 0.8, 0.9, GL('#ffd890', 0.7), x, 2.25, z); box(gr, 1.6, 0.35, 1.6, '#8a8a84', x, 2.8, z); };
    far(8, (x, z) => lantern(x, z), 4.4, 5, -40, 40);
    ends(6, (x, z) => { for (let k = 0; k < 7; k++) cyl(gr, 0.18, 0.2, R(6, 11), '#6aa04a', x + R(-1.5, 1.5), 4, z + R(-1.5, 1.5), 5); });
    peak(gr, -10, -PZ - 90, 50, 46, '#7a8aa8', '#ffffff');
    // old Japanese houses along the back: white plaster and dark timber, tiled roofs in two tiers with a ridge
    const tile2 = '#3a3a44', timber = '#4a2e1e';
    const jhouse = (x, z, w, h, d, tiers = 1) => { box(gr, w, h, d, '#f2ece0', x, h / 2, z); for (const dx of [-w / 2, 0, w / 2]) box(gr, 0.3, h, 0.3, timber, x + dx, h / 2, z + d / 2 + 0.1); box(gr, w, 0.3, 0.3, timber, x, h * 0.55, z + d / 2 + 0.1);
      for (let k = 0; k < Math.floor(w / 2.4); k++) box(gr, 1.2, 1.4, 0.1, '#e8dcc0', x - w / 2 + 1.4 + k * 2.4, h * 0.3, z + d / 2 + 0.12);
      let y = h; for (let t = 0; t < tiers; t++) { const rw = w + 3 - t * 2, rd = d + 3 - t * 2; box(gr, rw, 0.5, rd, tile2, x, y + 0.25, z); const r = add(gr, new THREE.CylinderGeometry(rd * 0.42, rd * 0.42, rw - 1, 4), M(tile2), x, y + 0.9, z); r.rotation.z = Math.PI / 2; r.scale.set(0.5, 1, 1);
        box(gr, rw - 0.6, 0.35, 0.5, '#2a2a30', x, y + 0.3 + rd * 0.22, z); if (t < tiers - 1) { box(gr, w - 2 - t * 2, 2.4, d - 2 - t * 2, '#f2ece0', x, y + 2.2, z); y += 3.2; } } };
    far(7, (x, z) => jhouse(x, z, R(7, 10), R(3.2, 4.2), R(5, 6), Math.random() < 0.35 ? 2 : 1), 9, 14); ends(4, (x, z) => jhouse(x, z, 6, 3.4, 5, 1), 12, 18);
    // a castle keep: a stone base and white tiers with dark curved roofs, gold ornaments on the ridge
    const kx = 10, kz = -PZ - 34; box(gr, 22, 6, 18, '#8a8680', kx, 3, kz); for (let t = 0; t < 4; t++) { const w = 16 - t * 3.2, d = 13 - t * 2.6, y = 6 + t * 5; box(gr, w, 4, d, '#f4f0e6', kx, y + 2, kz); for (let k = 0; k < 3; k++) box(gr, 1.2, 1.2, 0.1, '#3a2e24', kx - w / 3 + k * w / 3, y + 2.4, kz + d / 2 + 0.06);
      box(gr, w + 3, 0.6, d + 3, tile2, kx, y + 4.3, kz); const r = add(gr, new THREE.CylinderGeometry((d + 3) * 0.4, (d + 3) * 0.4, w + 2, 4), M(tile2), kx, y + 5, kz); r.rotation.z = Math.PI / 2; r.scale.set(0.35, 1, 1); }
    for (const dx of [-2.6, 2.6]) box(gr, 0.8, 1.4, 0.8, '#e8c040', kx + dx, 28.6, kz);
    // a red gatehouse and a low white wall with a tiled top along the back
    box(gr, 150, 2.4, 0.8, '#f2ece0', 0, 1.2, -PZ - 7.5); box(gr, 150.5, 0.4, 1.4, tile2, 0, 2.6, -PZ - 7.5); box(gr, 7, 4, 2, '#a82a20', -40, 2, -PZ - 7.6); box(gr, 9, 0.6, 3.2, tile2, -40, 4.3, -PZ - 7.6); box(gr, 3, 3, 0.2, '#2a1a12', -40, 1.5, -PZ - 6.5); };
  // 7. medieval castle: stone walls with battlements, round towers, banners
  DEF.zamek = { name: 'ZAMEK', sky: '#a8c8e8', fog: '#c4d8ea', near: 80, far: 220, hemi: ['#eef6ff', '#5a6a4a', 2.0], sun: ['#fff0d8', 2.5], grav: 30, wx: 'leaves',
    pal: pal('#c8c8c4', '#c8c8c4', '#c8c8c4', [], ['#b4b4b0', '#aaaaa6', '#bcbcb8'], '#141414', { txt: 'rgba(0,0,0,0)', wornE: 'rgba(80,80,80,.2)', blocks: (g, W, H, K) => { g.fillStyle = '#8e8e8a'; g.fillRect(0, 0, W, H); const B = Math.round(K * 1.2);
      for (let y = 0, r = 0; y < H; y += B, r++) for (let x = -(r % 2) * (B >> 1); x < W; x += B) { const c = ['#cfcfcb', '#c4c4c0', '#d6d6d2', '#bdbdb9', '#c9c9c5'][(Math.abs(Math.sin(x * 12.9 + y * 78.2)) * 9999 | 0) % 5]; g.fillStyle = c; g.fillRect(x + 1, y + 1, B - 2, B - 2);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 1, y + 1, B - 3, 1); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 1, y + B - 2, B - 2, 1); } } }),
    track: () => tile((g) => { fill(g, '#7a7a74'); for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 * 4; x < 64; x += 8) { g.fillStyle = pick(['#8a8a84', '#9a9a92', '#828278']); g.fillRect(x + 1, y + 1, 6, 6); } }) };
  BUILD.zamek = (gr) => { const stone = M('#8e9094'), dark = M('#6e7074');
    const wall = (x0, x1, z) => { box(gr, x1 - x0, 7, 2.4, stone, (x0 + x1) / 2, 3.5, z); for (let x = x0; x < x1; x += 2) box(gr, 1, 1, 2.4, dark, x + 0.5, 7.5, z); };
    const towr = (x, z, r, h, roof) => { cyl(gr, r, r * 1.05, h, stone, x, h / 2, z, 10); for (let k = 0; k < 8; k++) box(gr, 0.9, 1, 0.9, dark, x + Math.cos(k * 0.785) * r, h + 0.5, z + Math.sin(k * 0.785) * r); cone(gr, r * 1.15, r * 1.6, roof, x, h + 1 + r * 0.8, z, 10);
      box(gr, 0.7, 1.4, 0.1, '#1a1410', x, h * 0.65, z + r + 0.02); };
    wall(-66, 66, -PZ - 10); for (const x of [-66, -33, 0, 33, 66]) towr(x, -PZ - 10, 3, 12, '#4a4e56'); box(gr, 6, 5, 2.6, '#2a1e16', 14, 2.5, -PZ - 8.7);
    towr(-8, -PZ - 30, 6, 28, '#4a4e56'); towr(20, -PZ - 34, 5, 22, '#4a4e56');
    for (const s of [-1, 1]) { box(gr, 2.4, 7, 60, stone, s * (PX + 14), 3.5, 0); for (let z = -28; z < 30; z += 2) box(gr, 2.4, 1, 1, dark, s * (PX + 14), 7.5, z + 0.5); towr(s * (PX + 14), -22, 3, 11, '#4a4e56'); towr(s * (PX + 14), 22, 3, 11, '#4a4e56'); }
    far(6, (x, z) => { cyl(gr, 0.1, 0.1, 6, '#3a2a1a', x, 3, z); const f = box(gr, 1.6, 2.4, 0.05, pick(['#b02a2a', '#2a4ab0', '#e8c040', '#2a8a3a']), x + 0.85, 4.6, z); f.castShadow = false; }, 6, 7, -50, 50); };
  // 8. candy land: jelly pitch, a chocolate river round it, lollipop trees, candy canes, gumdrops
  DEF.cukierki = { name: 'KRAINA CUKIERKÓW', sky: '#ffc8e8', fog: '#ffd8f0', near: 70, far: 220, hemi: ['#fff2fa', '#c87ab0', 2.0], sun: ['#fff0f8', 2.5], grav: 30, wx: 'confetti',
    pal: pal('#6ae08a', '#7aea98', '#62d882', ['#9af0b0', '#4ac870', '#b0ffc8', '#58d07a'], ['#ff9ad0', '#ffb0dc', '#e87ab8'], '#ffffff', { extra: dots(['#ff3a5a', '#ffd21a', '#3a8aff', '#ffffff', '#e83ac8', '#ff8a1a'], 900, 2) }),
    track: () => tile((g) => { fill(g, '#6a3a1a'); g.fillStyle = '#8a5a2a'; for (let y = 4; y < 64; y += 10) for (let x = 0; x < 64; x++) g.fillRect(x, y + Math.round(Math.sin(x / 5 + y) * 2), 1, 2); speck(g, ['#5a2a10', '#9a6a3a'], 60); }), flow: 0.05 };
  BUILD.cukierki = (gr) => { const cols = ['#ff3a7a', '#ffd21a', '#3ac8ff', '#a85aff', '#3ae86a', '#ff8a1a'];
    const swirl = (a, b) => tex(32, 32, (g) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const dx = x - 15.5, dy = y - 15.5, r = Math.hypot(dx, dy), an = Math.atan2(dy, dx); if (r > 15.5) continue; g.fillStyle = Math.floor((an + r * 0.35) / 0.785) % 2 ? a : b; g.fillRect(x, y, 1, 1); } });
    const lolli = (x, z, s) => { cyl(gr, 0.18 * s, 0.18 * s, 6 * s, '#ffffff', x, 3 * s, z, 6); const d = add(gr, new THREE.CylinderGeometry(2 * s, 2 * s, 0.5 * s, 20), lam({ map: swirl(pick(cols), '#ffffff') }), x, 7.5 * s, z); d.rotation.x = Math.PI / 2; };
    far(10, (x, z) => lolli(x, z, R(1, 1.5)), 6, 12); ends(8, (x, z) => lolli(x, z, R(0.9, 1.3)));
    const cane = (x, z, h) => { const t = stripes('#ff2a3a', '#ffffff', 6, false); t.repeat.set(1, h / 1.5); cyl(gr, 0.45, 0.45, h, lam({ map: t }), x, h / 2, z, 8); const hook = add(gr, new THREE.TorusGeometry(1.1, 0.45, 6, 12, Math.PI), lam({ map: t }), x + 1.1, h, z); };
    far(8, (x, z) => cane(x, z, R(5, 9)), 5, 9); ends(6, (x, z) => cane(x, z, R(4, 7)));
    far(20, (x, z) => { const g2 = add(gr, new THREE.SphereGeometry(R(0.8, 1.6), 8, 5, 0, 6.28, 0, Math.PI / 2), M(pick(cols)), x, 0, z); }, 4.5, 8); ends(14, (x, z) => add(gr, new THREE.SphereGeometry(R(0.8, 1.4), 8, 5, 0, 6.28, 0, Math.PI / 2), M(pick(cols)), x, 0, z));
    const ice = (x, z, s) => { const c = cone(gr, 1.3 * s, 4 * s, '#e8b870', x, 2 * s, z, 8); c.rotation.x = Math.PI; sph(gr, 1.5 * s, pick(['#ffb0d0', '#fff0c8', '#8a5a3a', '#b0ffd0']), x, 4.6 * s, z, 1); sph(gr, 0.35 * s, '#ff2a3a', x, 6.3 * s, z, 0); };
    far(5, (x, z) => ice(x, z, R(1.6, 2.4)), 14, 22); };
  // 9. halloween: graves, pumpkins with lit faces, a haunted house, bare trees, bats, ghosts, mist
  DEF.halloween = { name: 'HALLOWEEN', sky: '#1a1030', fog: '#3a2a4a', near: 30, far: 150, hemi: ['#a89ad8', '#1a1020', 1.2], sun: ['#c0b0ff', 1.4], grav: 30, wx: 'leaves',
    pal: pal('#4a5a3a', '#506040', '#465436', ['#3a4a2e', '#5a6a46', '#34422a', '#62704e'], ['#4a3a2a', '#3e3022', '#56442e'], '#e8e0c8'),
    track: () => tile((g) => { fill(g, '#2e2a26'); speck(g, ['#3a342e', '#24201c', '#4a4238', '#3a4a2e'], 260); }) };
  BUILD.halloween = (gr) => { moonDisc(gr, '#fff6d0', 50, 70, -200, 16);
    const grave = (x, z) => { const s = box(gr, 1.4, 1.8, 0.4, pick(['#8a8a90', '#7a7a80', '#9a9aa0']), x, 0.9, z); s.rotation.z = R(-0.15, 0.15); sph(gr, 0.7, '#8a8a90', x, 1.8, z, 0).scale.z = 0.3; };
    far(18, (x, z) => (Math.random() < 0.3 ? (box(gr, 0.3, 2.4, 0.3, '#7a7a80', x, 1.2, z), box(gr, 1.4, 0.3, 0.3, '#7a7a80', x, 1.8, z)) : grave(x, z)), 5, 10); ends(10, (x, z) => grave(x, z));
    const pumpkin = (x, z, s) => { const p = sph(gr, 1 * s, '#ff7a1a', x, 0.8 * s, z, 1); p.scale.y = 0.75; box(gr, 0.2 * s, 0.5 * s, 0.2 * s, '#3a6a2a', x, 1.65 * s, z); for (const dx of [-0.35, 0.35]) box(gr, 0.3 * s, 0.25 * s, 0.1, GL('#ffd24a', 1.5), x + dx * s, 0.95 * s, z + 0.95 * s); box(gr, 0.7 * s, 0.15 * s, 0.1, GL('#ffd24a', 1.5), x, 0.55 * s, z + 0.97 * s); };
    far(10, (x, z) => pumpkin(x, z, R(0.8, 1.4)), 4.5, 7); ends(8, (x, z) => pumpkin(x, z, R(0.9, 1.3)));
    // the haunted house
    const hx = -18, hz = -PZ - 22; box(gr, 16, 12, 10, '#3a2a40', hx, 6, hz); const roof = cone(gr, 11.5, 7, '#1e1424', hx, 15.5, hz, 4); roof.rotation.y = Math.PI / 4; cyl(gr, 2.4, 2.4, 18, '#34263a', hx + 9, 9, hz + 2, 8); cone(gr, 3, 5, '#1e1424', hx + 9, 20.5, hz + 2, 8);
    for (let k = 0; k < 6; k++) box(gr, 1.6, 2, 0.2, GL(Math.random() < 0.7 ? '#ffd24a' : '#3a2a40', 1.2), hx - 5 + (k % 3) * 5, 4 + Math.floor(k / 3) * 5, hz + 5.05);
    const dead = (x, z, s) => { cyl(gr, 0.25 * s, 0.45 * s, 6 * s, '#2a2024', x, 3 * s, z, 5); for (let k = 0; k < 4; k++) { const b = box(gr, 0.2 * s, 3 * s, 0.2 * s, '#2a2024', x + (k % 2 ? 1 : -1) * 0.9 * s, (4 + k * 0.7) * s, z); b.rotation.z = (k % 2 ? -1 : 1) * R(0.6, 1); } };
    far(7, (x, z) => dead(x, z, R(1, 1.6)), 9, 16); ends(6, (x, z) => dead(x, z, R(1, 1.4)));
    for (let k = 0; k < 8; k++) { const b = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), M('#14101a')); b.add(body); const wl = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.5), M('#14101a')), wr = wl.clone(); wl.position.x = -0.7; wr.position.x = 0.7; b.add(wl, wr); gr.add(b);
      const cx = R(-40, 40), cz = -PZ - R(6, 20), cy = R(8, 16), r = R(4, 10); tick(gr, (t) => { const a = t * 0.9 + k; b.position.set(cx + Math.cos(a) * r, cy + Math.sin(t * 2 + k) * 1.5, cz + Math.sin(a) * 3); wl.rotation.z = Math.sin(t * 14 + k) * 0.7; wr.rotation.z = -wl.rotation.z; }); }
    for (let k = 0; k < 4; k++) { const gh = new THREE.Group(); const h = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), BA('#eef0ff', { transparent: true, opacity: 0.7 })); const tl = new THREE.Mesh(new THREE.ConeGeometry(1, 2.4, 8), BA('#eef0ff', { transparent: true, opacity: 0.6 })); tl.rotation.x = Math.PI; tl.position.y = -1.4; gh.add(h, tl);
      for (const dx of [-0.35, 0.35]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.1), BA('#14101a')); e.position.set(dx, 0.1, 0.95); gh.add(e); } gr.add(gh); const x = k % 2 ? R(-50, 50) : (k > 1 ? 1 : -1) * (PX + 10), z = k % 2 ? -PZ - R(6, 12) : R(-10, 10);
      tick(gr, (t) => { gh.position.set(x + Math.sin(t * 0.5 + k) * 4, 4 + Math.sin(t * 1.3 + k) * 1, z); }); } };
  // 10. magic forest: glowing mushrooms, purple trees, floating lights, fireflies
  DEF.las = { name: 'MAGICZNY LAS', sky: '#0a1a2a', fog: '#0e2a3a', near: 40, far: 170, hemi: ['#7ae0ff', '#1a0a3a', 1.4], sun: ['#b0c8ff', 1.4], grav: 30, wx: 'fireflies',
    pal: pal('#2a6a5a', '#2e7262', '#286252', ['#3a8a7a', '#1e5040', '#4aa090', '#22584a'], ['#3a5a4a', '#2e4e40', '#466656'], '#c8fff0', { extra: dots(['#6af0ff', '#ff8ae8', '#c8ff6a'], 160, 2) }),
    track: () => tile((g) => { fill(g, '#1e3a32'); speck(g, ['#2a4e42', '#16302a', '#3a6a5a', '#6af0ff'], 200); }) };
  BUILD.las = (gr) => { const caps = ['#6af0ff', '#ff6ad8', '#b06aff', '#6aff9a'];
    const shroom = (x, z, s) => { cyl(gr, 0.25 * s, 0.35 * s, 1.6 * s, '#e8e4f0', x, 0.8 * s, z, 6); add(gr, new THREE.SphereGeometry(1 * s, 10, 5, 0, 6.28, 0, Math.PI / 2), GL(pick(caps), 1.1), x, 1.5 * s, z); };
    far(24, (x, z) => shroom(x, z, R(0.6, 1.4)), 4.5, 9); ends(16, (x, z) => shroom(x, z, R(0.7, 1.3))); far(5, (x, z) => shroom(x, z, R(3, 4.5)), 12, 18);
    const mtree = (x, z, s) => { for (let k = 0; k < 5; k++) { const b = box(gr, 0.9 * s, 1.6 * s, 0.9 * s, '#4a3050', x + Math.sin(k) * 0.4 * s, (0.8 + k * 1.5) * s, z); b.rotation.y = k * 0.5; } for (let k = 0; k < 4; k++) sph(gr, R(1.6, 2.4) * s, GL(pick(['#6a3aa0', '#3a8a8a', '#8a3a9a']), 0.35), x + R(-1.6, 1.6) * s, R(7, 9) * s, z + R(-1, 1) * s, 0); };
    far(8, (x, z) => mtree(x, z, R(1.1, 1.6)), 10, 18); ends(6, (x, z) => mtree(x, z, R(1, 1.3)));
    const orbs = []; for (let k = 0; k < 14; k++) { const o = sph(gr, 0.35, BA(pick(caps)), 0, 0, 0, 1); orbs.push([o, R(-60, 60), -PZ - R(4, 16), R(2, 8), R(0, 6)]); }
    tick(gr, (t) => orbs.forEach(([o, x, z, y, p]) => o.position.set(x + Math.sin(t * 0.4 + p) * 3, y + Math.sin(t * 1.1 + p) * 1.2, z))); };
  // 11. big factory: conveyor belts with crates, pipes, turning gears, chimneys
  DEF.fabryka = { name: 'FABRYKA', sky: '#5a5e66', fog: '#6a6e76', near: 50, far: 180, hemi: ['#e4e8ee', '#4a4a50', 1.9], sun: ['#fff0d8', 2.1], grav: 30, wx: 'ash',
    pal: pal('#7a7e84', '#82868c', '#767a80', ['#6a6e74', '#8a8e94', '#5e6268', '#94989e'], ['#3a3a3e', '#2e2e32', '#46464a'], '#ffd21a', { wornE: 'rgba(20,20,20,.3)', txt: 'rgba(255,210,26,.2)' }),
    track: () => tile((g) => { fill(g, '#4a4c50'); for (let i = -64; i < 64; i += 16) { g.fillStyle = '#ffd21a'; for (let k = 0; k < 8; k++) g.fillRect(i + k + 32, 56 + 0, 1, 8); } g.fillStyle = '#5a5c60'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 1, 56); g.fillRect(0, i, 64, 1); } g.fillStyle = '#7a7c80'; for (let i = 3; i < 64; i += 16) for (let j = 3; j < 56; j += 16) g.fillRect(i, j, 1, 1); }) };
  BUILD.fabryka = (gr) => { const belt = (z, x0, x1, y) => { box(gr, x1 - x0, 0.6, 2.4, '#2a2a2e', (x0 + x1) / 2, y, z); for (let x = x0; x <= x1; x += 4) box(gr, 0.4, y, 0.4, '#5a5a60', x, y / 2, z);
      const crates = []; for (let k = 0; k < 6; k++) crates.push(box(gr, 1.4, 1.4, 1.4, pick(['#c8964a', '#a87a3a', '#3a8ae8', '#e8361f']), 0, y + 1, z)); tick(gr, (t) => crates.forEach((c, k) => { c.position.x = x0 + ((t * 3 + k * (x1 - x0) / 6) % (x1 - x0)); })); };
    belt(-PZ - 7, -60, 60, 2); belt(-PZ - 13, -50, 50, 5);
    for (let k = 0; k < 4; k++) { const p = cyl(gr, 0.8, 0.8, 140, pick(['#b0b4ba', '#c8502a', '#3a8a5a']), 0, 9 + k * 2.5, -PZ - 18 - k * 2, 10); p.rotation.z = Math.PI / 2; }
    far(8, (x, z) => cyl(gr, 0.7, 0.7, R(10, 20), '#8a8e94', x, 6, z, 8), 9, 11);
    const gears = []; const machine = (x, z, s) => { box(gr, 6 * s, 7 * s, 5 * s, pick(['#4a6a8a', '#8a4a3a', '#5a7a4a']), x, 3.5 * s, z); for (let k = 0; k < 2; k++) { const g2 = cyl(gr, 1.6 * s, 1.6 * s, 0.5, '#b0a060', x - 1.5 * s + k * 2.9 * s, 4.5 * s, z + 2.6 * s, 10); g2.rotation.x = Math.PI / 2; gears.push([g2, k ? -1 : 1]); }
      box(gr, 1.2 * s, 0.8 * s, 0.2, GL(pick(['#3aff6a', '#ff3a3a', '#ffd21a']), 1.4), x + 2 * s, 6 * s, z + 2.55 * s); };
    ends(6, (x, z) => machine(x, z, R(1, 1.4)), 8, 16); far(3, (x, z) => machine(x, z, 1.6), 20, 24);
    tick(gr, (t, dt) => gears.forEach(([g2, d]) => { g2.rotation.y += dt * 1.5 * d; }));
    for (const x of [-40, 0, 40]) { cyl(gr, 2.4, 3, 40, '#7a3a2a', x, 20, -PZ - 36, 10); for (let k = 0; k < 3; k++) sph(gr, 3 + k, BA('#8a8a8a', { transparent: true, opacity: 0.4 }), x + k * 2, 42 + k * 4, -PZ - 36, 1); } };
  // 13. dinosaur valley: volcanoes, ferns, cycads, a long-neck and a T-rex, flying reptiles
  DEF.dino = { name: 'DOLINA DINOZAURÓW', sky: '#f0b888', fog: '#d8a880', near: 60, far: 220, hemi: ['#ffeccc', '#5a4a2a', 1.9], sun: ['#ffe0b0', 2.5], grav: 30, wx: 'ash',
    pal: pal('#5a8a3a', '#62923f', '#548236', ['#4a7a2e', '#6a9a46', '#3e6e28', '#72a24e'], ['#7a5a34', '#6a4c2a', '#86643a'], '#f4f0d8'),
    track: () => tile((g) => { fill(g, '#6a4a2a'); speck(g, ['#5a3e22', '#7a5a34', '#4a7a2e', '#3e6e28'], 260); }) };
  BUILD.dino = (gr) => { volcano(gr, -30, -PZ - 50, 24, 34); volcano(gr, 40, -PZ - 60, 20, 28);
    const fern = (x, z, s) => { for (let k = 0; k < 6; k++) { const l = box(gr, 0.4 * s, 0.15, 2.6 * s, pick(['#3a7a2a', '#4a8a32']), x + Math.cos(k) * 0.9 * s, 0.8 * s, z + Math.sin(k) * 0.9 * s); l.rotation.y = k; l.rotation.x = 0.5; } };
    far(18, (x, z) => fern(x, z, R(1, 1.8)), 4.5, 10); ends(12, (x, z) => fern(x, z, R(1, 1.6)));
    const cycad = (x, z, s) => { cyl(gr, 0.6 * s, 0.9 * s, 6 * s, '#6a5030', x, 3 * s, z, 6); for (let k = 0; k < 7; k++) { const l = box(gr, 0.6 * s, 0.2, 4 * s, '#3a8a2a', x + Math.cos(k * 0.9) * 1.8 * s, 6.4 * s, z + Math.sin(k * 0.9) * 1.8 * s); l.rotation.y = -k * 0.9 + Math.PI / 2; l.rotation.x = 0.35; } };
    far(8, (x, z) => cycad(x, z, R(1.2, 1.8)), 9, 16); ends(6, (x, z) => cycad(x, z, R(1, 1.5)));
    // dinosaurs walking about: two long-necks pacing behind the far side, a T-rex stomping beyond one end
    const legs = (g2, sk, pts, len, r) => pts.map(([x, z]) => { const piv = new THREE.Group(); piv.position.set(x, len, z); const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, len, 7), sk); l.position.y = -len / 2; piv.add(l); g2.add(piv); return piv; });
    const longNeck = (s, col) => { const g2 = new THREE.Group(), sk = M(col); const body = new THREE.Mesh(new THREE.IcosahedronGeometry(5 * s, 1), sk); body.scale.set(1.6, 1, 1); body.position.y = 9 * s; g2.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * s, 1.6 * s, 14 * s, 7), sk); neck.rotation.z = 0.6; neck.position.set(-8 * s, 15 * s, 0); g2.add(neck);
      const head = new THREE.Mesh(new THREE.BoxGeometry(3 * s, 1.6 * s, 1.6 * s), sk); head.position.set(-13 * s, 21 * s, 0); g2.add(head);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 14 * s, 7), sk); tail.rotation.z = -1.25; tail.position.set(12 * s, 8 * s, 0); g2.add(tail);
      const L = legs(g2, sk, [[-4 * s, -2 * s], [4 * s, -2 * s], [-4 * s, 2 * s], [4 * s, 2 * s]], 6 * s, 1.1 * s); gr.add(g2); return { g2, L, head, tail, s }; };
    const herd = [longNeck(1, '#7a8a6a'), longNeck(0.55, '#8a9a76')];
    tick(gr, (t) => herd.forEach((d, i) => { const ph = t * 0.035 + i * 0.06, x = Math.sin(ph * 6.28) * 70 - i * 14, dir = Math.cos(ph * 6.28) >= 0 ? 1 : -1;
      d.g2.position.set(x, Math.abs(Math.sin(t * 2.4)) * 0.3 * d.s, -PZ - 26 - i * 4); d.g2.rotation.y = dir > 0 ? Math.PI : 0; const sw = Math.sin(t * 2.4 + i) * 0.35;
      d.L.forEach((l, k) => { l.rotation.z = (k % 2 === (k < 2 ? 0 : 1) ? sw : -sw); }); d.head.position.y = 21 * d.s + Math.sin(t * 1.2 + i) * 0.6; d.tail.rotation.y = Math.sin(t * 1.6) * 0.25; }));
    const rex = new THREE.Group(), tr = M('#5a7a3a'); const tb = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 3.4), tr); tb.position.y = 8; tb.rotation.z = 0.35; rex.add(tb);
    const rh = new THREE.Group(); const hd = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 2.6), tr); const jaw = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 2.2), M('#4a6a2e')); jaw.position.set(0.2, -1.5, 0); const teeth = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 2.3), M('#ffffff')); teeth.position.set(0.6, -1.05, 0); rh.add(hd, jaw, teeth); rh.position.set(4.6, 11.4, 0); rex.add(rh);
    const rt = new THREE.Mesh(new THREE.ConeGeometry(1.8, 8, 7), tr); rt.rotation.z = 1.25; rt.position.set(-6, 6.5, 0); rex.add(rt); const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.4), tr); arm.position.set(3, 8, 1.4); rex.add(arm);
    const RL = legs(rex, tr, [[-0.5, -1.2], [-0.5, 1.2]], 6, 0.7); gr.add(rex);
    tick(gr, (t) => { const ph = t * 0.05, z = Math.sin(ph * 6.28) * 22, dir = Math.cos(ph * 6.28) >= 0 ? 1 : -1; rex.position.set(-PX - 24, Math.abs(Math.sin(t * 3)) * 0.4, z); rex.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      const sw = Math.sin(t * 3) * 0.45; RL[0].rotation.z = sw; RL[1].rotation.z = -sw; rh.rotation.z = Math.sin(t * 1.5) * 0.12; jaw.position.y = -1.5 - Math.max(0, Math.sin(t * 0.7)) * 0.8; rt.rotation.y = Math.sin(t * 3) * 0.2; });
    for (let k = 0; k < 4; k++) { const p = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.4), M('#6a4a3a')); const wl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 2.8), M('#8a5a4a')), wr = wl.clone(); wl.position.z = -1.6; wr.position.z = 1.6; p.add(b, wl, wr); gr.add(p);
      const cx = R(-50, 50), cz = -PZ - R(14, 30), r = R(12, 24); tick(gr, (t) => { const a = t * 0.25 + k * 1.6; p.position.set(cx + Math.cos(a) * r, 22 + Math.sin(t + k) * 2, cz + Math.sin(a) * 6); p.rotation.y = -a; wl.rotation.x = Math.sin(t * 4 + k) * 0.5; wr.rotation.x = -wl.rotation.x; }); } };
  // 14. grand canyon: a red-rock plateau, mesas, chasms and rope bridges
  DEF.kanion = { name: 'WIELKI KANION', sky: '#a8d0f0', fog: '#e8d0b0', near: 90, far: 280, hemi: ['#fff6e4', '#8a4a2a', 2.0], sun: ['#ffe8c0', 2.8], grav: 30, wx: 'dust',
    pal: pal('#c08454', '#c88c5c', '#b87c4e', ['#a86a3e', '#d89a6a', '#9a5e34', '#e0a878'], ['#9a5e34', '#8a5230', '#a86a3e'], '#fff4e0'),
    track: () => tile((g) => { fill(g, '#a05a34'); speck(g, ['#8a4a2a', '#b86a3e', '#7a3e22', '#c87a4a'], 260); g.fillStyle = '#7a3e22'; g.fillRect(0, 20, 64, 1); g.fillRect(0, 44, 64, 1); }) };
  BUILD.kanion = (gr) => { const rocks = ['#b8603a', '#a8502e', '#c87048', '#9a4a2a'];
    const mesa = (x, z, w, h, d) => { for (let k = 0; k < 4; k++) box(gr, w * (1 - k * 0.06), h / 4, d * (1 - k * 0.06), rocks[k % 4], x, h / 8 + k * h / 4, z); };
    far(7, (x, z) => mesa(x, z, R(10, 18), R(14, 30), R(8, 14)), 28, 46); ends(4, (x, z) => mesa(x, z, R(10, 14), R(12, 22), R(10, 14)), 34, 44);
    // chasms beyond both ends and behind the far side, with rope bridges across
    for (const s of [-1, 1]) { const ch = add(gr, new THREE.PlaneGeometry(10, 70), BA('#1a0c06'), s * (PX + 16), 0.03, 0); ch.rotation.x = -Math.PI / 2;
      for (const bz of [-10, 10]) { for (let k = 0; k < 10; k++) box(gr, 1, 0.15, 2.4, '#8a6a3a', s * (PX + 11.5 + k), 0.4 - Math.sin(k / 9 * Math.PI) * 0.5, bz); for (const dz of [-1.3, 1.3]) for (const x0 of [PX + 11, PX + 21]) box(gr, 0.25, 2, 0.25, '#5a3e24', s * x0, 1, bz + dz); } }
    const ch2 = add(gr, new THREE.PlaneGeometry(150, 8), BA('#1a0c06'), 0, 0.03, -PZ - 12); ch2.rotation.x = -Math.PI / 2;
    for (let k = 0; k < 14; k++) box(gr, 2.4, 0.15, 1, '#8a6a3a', -20, 0.4 - Math.sin(k / 13 * Math.PI) * 0.5, -PZ - 7.5 - k * 0.65);
    far(12, (x, z) => rock(gr, x, z, R(0.8, 1.8), pick(rocks)), 4.5, 7); ends(6, (x, z) => { const c = cyl(gr, 0.4, 0.4, R(2, 3.5), '#4a8a3a', x, 1.5, z, 6); }, 6, 9); };
  // 15. sky: floating islands, rainbows, clouds below and around
  DEF.niebo = { name: 'NIEBO', sky: '#8ad0ff', fog: '#c8e8ff', near: 80, far: 260, hemi: ['#ffffff', '#a8d8ff', 2.2], sun: ['#fffbe8', 2.6], grav: 24, wx: 'none',
    pal: pal('#6ac85a', '#74d062', '#62c052', ['#5ab84a', '#82e06a', '#4eac40', '#8ae872'], ['#7ab85a', '#6aa84a', '#8ac86a'], '#ffffff'),
    track: () => tile((g) => { fill(g, '#eef6ff'); for (let i = 0; i < 26; i++) { g.fillStyle = pick(['#ffffff', '#dceeff', '#f6fbff']); const x = R(0, 64), y = R(0, 64), r = R(3, 8); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }) };
  BUILD.niebo = (gr) => { const isl = (x, y, z, s) => { const g2 = new THREE.Group(); const rk = new THREE.Mesh(new THREE.ConeGeometry(4 * s, 6 * s, 7), M('#8a6a4a')); rk.rotation.x = Math.PI; rk.position.y = -3 * s; const top = new THREE.Mesh(new THREE.CylinderGeometry(4.2 * s, 4 * s, 1 * s, 7), M('#6ac85a')); g2.add(rk, top);
      const tr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 * s, 0), M('#3a9a3a')); tr.position.set(R(-1, 1) * s, 2.6 * s, 0); const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 1.6 * s, 5), M('#6a4a2a')); tk.position.copy(tr.position).y -= 1.6 * s; g2.add(tr, tk); g2.position.set(x, y, z); gr.add(g2); const p = R(0, 6); tick(gr, (t) => { g2.position.y = y + Math.sin(t * 0.6 + p) * 0.8; }); };
    far(8, (x, z) => isl(x, R(6, 20), z, R(1, 2)), 12, 30); ends(6, (x, z) => isl(x, R(5, 16), z, R(1, 1.6)), 12, 24);
    const rainbow = (x, z, r) => ['#ff3a3a', '#ff9a1a', '#ffe14a', '#3ae86a', '#3a8aff', '#8a3aff'].forEach((c, k) => add(gr, new THREE.TorusGeometry(r - k * 1.1, 0.55, 4, 28, Math.PI), BA(c, { fog: false }), x, 0, z));
    rainbow(-24, -PZ - 40, 26); rainbow(30, -PZ - 60, 20);
    for (let i = 0; i < 12; i++) { const c = cloud(gr, R(-100, 100), R(2, 30), -PZ - R(10, 80), R(1.2, 2.6)); const sp = R(0.6, 1.4); tick(gr, (t, dt) => { c.position.x += dt * sp; if (c.position.x > 110) c.position.x = -110; }); }
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) cloud(gr, s * (PX + R(8, 16)), R(0.5, 2), R(-20, 20), R(1.2, 2)); };
  // 16. robot world: metal turf, the stands stay, giant robots stand behind them, one waves
  DEF.roboty = { name: 'ŚWIAT ROBOTÓW', sky: '#3a4a5a', fog: '#5a6a7a', near: 80, far: 220, hemi: ['#d8e8ff', '#2a3a4a', 1.9], sun: ['#eef4ff', 2.3], grav: 30, wx: 'none',
    pal: pal('#7a828a', '#7a828a', '#7a828a', [], ['#5a6068', '#4e545c', '#666c74'], '#5af0ff', { blocks: plates(['#7a828a', '#848c94', '#6e767e', '#8a929a'], 'rgba(20,24,30,.55)') }),
    track: () => tile((g) => { fill(g, '#3a3e44'); g.fillStyle = '#54585e'; for (let i = 0; i < 64; i += 4) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); } }) };
  BUILD.roboty = (gr) => { const robot = (x, z, s, wave) => { const c = pick(['#b0b8c2', '#c8a040', '#5a8ac8', '#c85a4a']); for (const dx of [-1.2, 1.2]) box(gr, 1.4 * s, 7 * s, 1.6 * s, '#5a606a', x + dx * s, 3.5 * s, z); box(gr, 5 * s, 6 * s, 3 * s, c, x, 10 * s, z);
      box(gr, 3.4 * s, 2.6 * s, 2.6 * s, c, x, 14.4 * s, z); for (const dx of [-0.8, 0.8]) box(gr, 0.7 * s, 0.5 * s, 0.2, GL(pick(['#ff3a3a', '#5af0ff']), 1.5), x + dx * s, 14.6 * s, z + 1.32 * s); cyl(gr, 0.1 * s, 0.1 * s, 2 * s, '#8a8a94', x, 16.6 * s, z); sph(gr, 0.4 * s, GL('#ffd21a', 1.4), x, 17.7 * s, z, 0);
      box(gr, 1.2 * s, 6 * s, 1.2 * s, '#5a606a', x - 3.2 * s, 9 * s, z); const arm = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(1.2 * s, 6 * s, 1.2 * s), M('#5a606a')); a.position.y = 3 * s; arm.add(a); arm.position.set(x + 3.2 * s, 12 * s, z); arm.rotation.z = Math.PI; gr.add(arm);
      if (wave) tick(gr, (t) => { arm.rotation.z = Math.PI * 0.75 + Math.sin(t * 3) * 0.35; }); };
    robot(-34, -PZ - 30, 2, true); robot(12, -PZ - 36, 2.4, false); robot(48, -PZ - 28, 1.8, true); robot(-PX - 22, 0, 1.6, false); robot(PX + 22, -4, 1.6, true);
    // a metal city of our own behind them: angular towers with glowing seams and spires
    const seam = ['#5af0ff', '#ff3a5a', '#ffd21a'];
    far(12, (x, z, i) => { const w = R(5, 10), h = R(18, 46), c = pick(['#5a6270', '#6a7280', '#4a525e']); box(gr, w, h, w, c, x, h / 2, z); box(gr, w * 0.7, h * 0.25, w * 0.7, c, x, h + h * 0.125, z); cone(gr, w * 0.25, 6, '#8a929e', x, h * 1.25 + 3, z, 4);
      for (let y = 4; y < h; y += 6) box(gr, w + 0.1, 0.3, w + 0.1, GL(seam[i % 3], 1.2), x, y, z); }, 40, 60);
    // a robot walking along behind the far boards
    const walker = new THREE.Group(), wc = M('#c8a040'); const wb = new THREE.Mesh(new THREE.BoxGeometry(3, 3.4, 2), wc); wb.position.y = 6.4; const wh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.6), wc); wh.position.y = 8.9; const we = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.1), BA('#5af0ff')); we.position.set(0, 9, 0.82); walker.add(wb, wh, we);
    const WL = [-0.7, 0.7].map((dx) => { const p = new THREE.Group(); p.position.set(dx, 4.7, 0); const l = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.6, 0.9), M('#5a606a')); l.position.y = -2.3; p.add(l); walker.add(p); return p; });
    const WA = [-1.9, 1.9].map((dx) => { const p = new THREE.Group(); p.position.set(dx, 7.8, 0); const a = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.4, 0.6), M('#5a606a')); a.position.y = -1.7; p.add(a); walker.add(p); return p; }); gr.add(walker);
    tick(gr, (t) => { const ph = t * 0.04, x = Math.sin(ph * 6.28) * 60, dir = Math.cos(ph * 6.28) >= 0 ? 1 : -1; walker.position.set(x, Math.abs(Math.sin(t * 3)) * 0.2, -PZ - 9); walker.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      const sw = Math.sin(t * 3) * 0.5; WL[0].rotation.x = sw; WL[1].rotation.x = -sw; WA[0].rotation.x = -sw; WA[1].rotation.x = sw; });
    // a car that drives up, stops and unfolds into a robot, then folds back and drives on
    const tf = new THREE.Group(), tc = M('#e8361f'); const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.2, 2.2), tc); chassis.position.y = 0.9; const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 2), lam({ color: '#8ad8ff', emissive: '#2a6a9a', emissiveIntensity: 0.4 })); cabin.position.set(-0.2, 2, 0);
    const wheels = []; for (const [dx, dz] of [[-1.4, -1.1], [1.4, -1.1], [-1.4, 1.1], [1.4, 1.1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8), M('#141414')); w.rotation.x = Math.PI / 2; w.position.set(dx, 0.5, dz); tf.add(w); wheels.push(w); }
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), M('#2a6ae8')); const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.1), BA('#5af0ff')); eyes.position.set(0, 0.1, 0.62); head.add(eyes);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.8), M('#5a606a')), legR = legL.clone(), armL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 0.6), tc), armR = armL.clone(); tf.add(chassis, cabin, head, legL, legR, armL, armR); gr.add(tf);
    const ease = (u) => u * u * (3 - 2 * u); tick(gr, (t, dt) => { const cyc = t % 16, x = PX + 20; let k = 0, z;
      if (cyc < 4) { z = -30 + cyc / 4 * 26; } else if (cyc < 12) { z = -4; k = cyc < 6 ? ease((cyc - 4) / 2) : cyc < 10 ? 1 : 1 - ease((cyc - 10) / 2); } else { z = -4 + (cyc - 12) / 4 * 34; }
      tf.position.set(x, 0, z); tf.rotation.y = k > 0.5 ? -Math.PI / 2 * (1 - k) * 0 : -Math.PI / 2; if (k > 0) tf.rotation.y = -Math.PI / 2 + k * Math.PI / 2;
      chassis.rotation.z = k * Math.PI / 2; chassis.position.set(0, 0.9 + k * 4.2, 0); cabin.position.set(-0.2 * (1 - k), 2 * (1 - k) + 4.6 * k, k * 0.6); cabin.visible = k < 0.6;
      head.visible = k > 0.4; head.position.set(0, 7 * k, 0); head.scale.setScalar(Math.max(0.01, k)); for (const [m, dx] of [[legL, -0.6], [legR, 0.6]]) { m.visible = k > 0.2; m.position.set(dx * k, 1.5 * k, 0); m.scale.y = Math.max(0.01, k); }
      for (const [m, dx] of [[armL, -1.6], [armR, 1.6]]) { m.visible = k > 0.3; m.position.set(dx * k, 4.6 * k, 0); m.scale.y = Math.max(0.01, k); m.rotation.z = (1 - k) * Math.PI / 2 * Math.sign(dx); }
      wheels.forEach((w, i) => { w.position.y = 0.5 + k * (i < 2 ? 0 : 3.8); w.position.x = [-1.4, 1.4, -1.4, 1.4][i] * (1 - k * 0.3); if (k === 0) w.rotation.y += dt * 6; }); });
    const gears = []; for (const [x, z] of [[-PX - 10, -12], [PX + 10, 10]]) { const g2 = cyl(gr, 3, 3, 0.6, '#c8a040', x, 4, z, 12); g2.rotation.x = Math.PI / 2; gears.push(g2); } tick(gr, (t, dt) => gears.forEach((g2) => { g2.rotation.y += dt; })); };
  // 17. enchanted circus: striped tents, a turning carousel, a ferris wheel, strings of lights
  DEF.cyrk = { name: 'CYRK', sky: '#1a0a3a', fog: '#2a1a4a', near: 60, far: 200, hemi: ['#ffd8f0', '#3a1a3a', 1.7], sun: ['#ffe0c0', 1.9], grav: 30, wx: 'confetti',
    pal: pal('#4f8a3a', '#5aa043', '#64ad4b', ['#3f7a2e', '#4a8a36', '#7cc25a', '#86c862'], ['#c8a06a', '#b8905a', '#d8b07a'], '#fff6e0'),
    track: () => tile((g) => { fill(g, '#d8b078'); speck(g, ['#c8a068', '#e8c890', '#b89058'], 300); }) };
  BUILD.cyrk = (gr) => { const tent = (x, z, r, h, a, b) => { const t = stripes(a, b, 8); t.repeat.set(4, 1); cyl(gr, r, r, h, lam({ map: t }), x, h / 2, z, 16); const t2 = stripes(a, b, 8); t2.repeat.set(4, 1); cone(gr, r * 1.1, h * 0.9, lam({ map: t2 }), x, h + h * 0.45, z, 16);
      cyl(gr, 0.08, 0.08, 2, '#ffd21a', x, h * 1.9 + 1, z); box(gr, 1, 0.6, 0.05, '#ff2a3a', x + 0.5, h * 1.9 + 1.7, z); };
    tent(-14, -PZ - 20, 11, 8, '#e8202a', '#ffffff'); tent(26, -PZ - 14, 5, 4, '#2a6ae8', '#ffd21a'); tent(-PX - 14, -8, 5, 4, '#8a2ad0', '#ffffff'); tent(PX + 14, 10, 5, 4, '#e8202a', '#ffd21a');
    const car = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.6, 16), M('#e8c040')); car.add(base); const roofT = stripes('#e8202a', '#ffffff', 8); roofT.repeat.set(4, 1); const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.6, 16), lam({ map: roofT })); roof.position.y = 5.4; car.add(roof);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 4), M('#ffd21a')); p.position.set(Math.cos(a) * 4, 2.5, Math.sin(a) * 4); const h = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.5), M(pick(['#ffffff', '#ff8ad8', '#8ad8ff', '#ffe14a']))); h.position.set(Math.cos(a) * 4, 1.8, Math.sin(a) * 4); h.rotation.y = -a; car.add(p, h); }
    car.position.set(PX + 16, 0, -14); gr.add(car); tick(gr, (t, dt) => { car.rotation.y += dt * 0.8; });
    const wheel = new THREE.Group(); wheel.add(new THREE.Mesh(new THREE.TorusGeometry(9, 0.3, 6, 32), M('#e8ecf2'))); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 9, 0.2), M('#e8ecf2')); s.position.set(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 0); s.rotation.z = a + Math.PI / 2; const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), GL(pick(['#ff3a5a', '#ffd21a', '#3ac8ff', '#3ae86a']), 0.6)); c.position.set(Math.cos(a) * 9, Math.sin(a) * 9, 0); wheel.add(s, c); }
    wheel.position.set(40, 12, -PZ - 26); gr.add(wheel); for (const dx of [-3, 3]) { const l = box(gr, 0.5, 13, 0.5, '#e8ecf2', 40 + dx, 6, -PZ - 26); l.rotation.z = dx > 0 ? 0.22 : -0.22; } tick(gr, (t, dt) => { wheel.rotation.z += dt * 0.3; });
    const bulbs = []; for (let k = 0; k < 36; k++) { const x = -60 + k * 3.4; bulbs.push(sph(gr, 0.3, BA(pick(['#ff3a5a', '#ffd21a', '#3ac8ff', '#3ae86a', '#ff8ad8'])), x, 6 - Math.abs(Math.sin(k / 6 * Math.PI)) * 1.6, -PZ - 6, 0)); } for (let x = -60; x <= 62; x += 20.4) cyl(gr, 0.12, 0.12, 6, '#5a3e24', x, 3, -PZ - 6, 5);
    tick(gr, (t) => bulbs.forEach((b, k) => { b.visible = (Math.floor(t * 4) + k) % 3 !== 0; })); stars(gr, 300); };
  // 18. metropolis: streets with taxis, billboards, skyscrapers
  DEF.metropolia = { name: 'METROPOLIA', sky: '#9ab8d8', fog: '#b8c8d8', near: 70, far: 240, hemi: ['#eef4ff', '#5a6066', 2.0], sun: ['#fff4e0', 2.5], grav: 30, wx: 'none',
    pal: pal('#4f8a3a', '#5aa043', '#64ad4b', ['#3f7a2e', '#4a8a36', '#7cc25a', '#86c862'], ['#8a6a3a', '#9a7844', '#7a5c30'], '#f3f6ea'),
    track: () => tile((g) => { fill(g, '#3a3c40'); speck(g, ['#2e3034', '#46484c', '#505256'], 200); g.fillStyle = '#ffffff'; for (let x = 4; x < 64; x += 16) g.fillRect(x, 31, 8, 2); }) };
  BUILD.metropolia = (gr) => { far(14, (x, z) => building(gr, x, z, R(8, 14), R(20, 60), R(8, 12), pick(['#b8a890', '#9aa4b0', '#c8c0b0', '#8a96a4', '#a88a7a']), '#eef6ff', '#4a5866', 0, 0.2), 20, 34); ends(6, (x, z) => building(gr, x, z, R(8, 12), R(16, 40), R(8, 12), pick(['#b8a890', '#9aa4b0']), '#eef6ff', '#4a5866', 0, 0.2), 22, 32);
    const ads = [['GOL!', '#e8202a', '#ffffff'], ['CUIAVIA', '#141414', '#3fbf55'], ['PIZZA', '#ffd21a', '#141414'], ['27', '#2a6ae8', '#ffffff'], ['KINO', '#8a2ad0', '#ffe14a']];
    far(5, (x, z, i) => { const [s, bg, fg] = ads[i % ads.length]; box(gr, 0.4, 8, 0.4, '#5a5e66', x, 4, z); sign(gr, s, bg, fg, x, 9.5, z + 0.3, 9, 3, 0.9); }, 13, 16);
    box(gr, 150, 0.2, 3, '#c8c8c4', 0, 0.1, -PZ - 11.5); for (const s of [-1, 1]) box(gr, 3, 0.2, 60, '#c8c8c4', s * (PX + 18.5), 0.1, 0);
    far(8, (x, z) => { cyl(gr, 0.15, 0.2, 6, '#3a3c40', x, 3, z); box(gr, 1.2, 0.3, 0.5, '#3a3c40', x + 0.5, 6, z); box(gr, 0.6, 0.15, 0.4, GL('#fff6d0', 1), x + 0.9, 5.85, z); }, 10.5, 10.6);
    const taxi = (lane, dir, x0, col) => { const g2 = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.8), M(col)); b.position.y = 0.9; const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1.6), M(col)); top.position.y = 1.9; g2.add(b, top);
      for (const [dx, dz] of [[-1.2, -0.9], [1.2, -0.9], [-1.2, 0.9], [1.2, 0.9]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 8), M('#141414')); w.rotation.x = Math.PI / 2; w.position.set(dx, 0.45, dz); g2.add(w); }
      if (col === '#ffd21a') { const s = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.5), BA('#ffffff')); s.position.y = 2.5; g2.add(s); } g2.rotation.y = dir > 0 ? 0 : Math.PI; gr.add(g2);
      tick(gr, (t) => { g2.position.set((((x0 + t * 9 * dir) + 90) % 180 + 180) % 180 - 90, 0, lane); }); };
    for (let k = 0; k < 7; k++) taxi(-PZ - (k % 2 ? 7.5 : 9.5), k % 2 ? 1 : -1, R(-90, 90), k % 3 ? '#ffd21a' : pick(['#e8202a', '#2a6ae8', '#e8ecf2'])); };
  // 19. viking village: huts, longships with striped sails, snowy mountains
  DEF.wikingowie = { name: 'WIOSKA WIKINGÓW', sky: '#c8d4e0', fog: '#d8e0e8', near: 60, far: 250, hemi: ['#f4f8ff', '#6a7a8a', 2.1], sun: ['#ffffff', 2.2], grav: 30, wx: 'snow',
    pal: pal('#6a8a6a', '#728f72', '#668466', ['#ffffff', '#e8eef4', '#5a7a5a', '#f4f8fc'], ['#8a8a7a', '#7a7a6a', '#9a9a8a'], '#ffffff'),
    track: () => tile((g) => { fill(g, '#eef3f8'); speck(g, ['#d6e0ea', '#ffffff', '#8a9a8a'], 200); }) };
  BUILD.wikingowie = (gr) => { const hut = (x, z, s) => { box(gr, 6 * s, 3 * s, 4 * s, '#6a4a2a', x, 1.5 * s, z); const r = add(gr, new THREE.CylinderGeometry(3 * s, 3 * s, 6.4 * s, 3), M('#e8eef4'), x, 3.9 * s, z); r.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; r.scale.set(1, 1, 0.9);
      box(gr, 1.2 * s, 1.8 * s, 0.1, '#2a1a10', x, 0.9 * s, z + 2 * s + 0.05); for (const dx of [-3.1, 3.1]) { const h = box(gr, 0.3 * s, 2 * s, 0.3 * s, '#4a3018', x + dx * s, 5.6 * s, z); h.rotation.z = dx > 0 ? -0.5 : 0.5; } };
    far(6, (x, z) => hut(x, z, R(1, 1.3)), 8, 16); ends(4, (x, z) => hut(x, z, R(0.9, 1.1)), 10, 18);
    const ship = (x, z, s, ry) => { const g2 = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(14 * s, 2 * s, 3.4 * s), M('#6a4422')); hull.position.y = 1.2 * s; g2.add(hull);
      for (const dx of [-7.4, 7.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 4 * s, 0.8 * s), M('#6a4422')); p.position.set(dx * s, 3 * s, 0); p.rotation.z = dx > 0 ? -0.3 : 0.3; g2.add(p); }
      const hd = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 0.9 * s, 0.7 * s), M('#3a7a3a')); hd.position.set(8.4 * s, 5 * s, 0); g2.add(hd);
      for (let k = 0; k < 6; k++) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.7 * s, 0.7 * s, 0.15, 10), M(pick(['#e8202a', '#ffd21a', '#2a6ae8', '#e8ecf2']))); sh.rotation.x = Math.PI / 2; sh.position.set((-5 + k * 2) * s, 1.6 * s, 1.75 * s); g2.add(sh); }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.25 * s, 9 * s, 6), M('#5a3a1a')); mast.position.y = 6 * s; g2.add(mast); const st = stripes('#e8202a', '#f4ecd6', 6); const sail = new THREE.Mesh(new THREE.BoxGeometry(7 * s, 5 * s, 0.1), lam({ map: st })); sail.position.set(0, 7 * s, 0.3); g2.add(sail);
      g2.position.set(x, 0, z); g2.rotation.y = ry; gr.add(g2); return g2; };
    ship(-20, -PZ - 8, 1, 0); ship(30, -PZ - 10, 0.9, 0.2); ship(-PX - 14, 6, 0.8, Math.PI / 2);
    for (const [x, z, r, h] of [[-50, -PZ - 50, 28, 44], [-10, -PZ - 60, 34, 58], [36, -PZ - 52, 26, 42], [70, -PZ - 58, 30, 50]]) peak(gr, x, z, r, h, '#7c889a');
    for (const [x, z] of [[-6, -PZ - 6.5], [PX + 9, -2]]) { for (let k = 0; k < 5; k++) { const l = box(gr, 0.4, 0.4, 2, '#5a3a1a', x, 0.3, z); l.rotation.y = k * 1.25; } const f = cone(gr, 0.8, 1.8, GL('#ff8a1a', 1.5), x, 1.2, z); tick(gr, (t) => { f.scale.y = 1 + Math.sin(t * 9 + x) * 0.25; }); } };
  // 20. space station: a metal hall with big windows onto a galaxy
  DEF.stacja = { name: 'STACJA KOSMICZNA', sky: '#02020a', fog: '#06061a', near: 100, far: 320, hemi: ['#d0dcff', '#1a1a2a', 1.7], sun: ['#eef4ff', 2.1], grav: 22, wx: 'none',
    pal: pal('#5a6474', '#5a6474', '#5a6474', [], ['#4a5464', '#3e4858', '#56606e'], '#5af0ff', { blocks: plates(['#5a6474', '#606a7a', '#56606e', '#646e7e'], 'rgba(10,14,24,.6)') }),
    track: () => tile((g) => { fill(g, '#2a303c'); g.fillStyle = '#3a4250'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 2, 64); g.fillRect(0, i, 64, 2); } g.fillStyle = '#ffd21a'; g.fillRect(0, 62, 32, 2); g.fillStyle = '#141414'; g.fillRect(32, 62, 32, 2); }) };
  BUILD.stacja = (gr) => { stars(gr, 900);
    const gal = tex(128, 64, (g) => { g.fillStyle = '#02020a'; g.fillRect(0, 0, 128, 64); for (let i = 0; i < 260; i++) { g.fillStyle = pick(['#ffffff', '#c8d8ff', '#ffd8f0']); g.fillRect(Math.random() * 128 | 0, Math.random() * 64 | 0, 1, 1); }
      for (let i = 0; i < 1400; i++) { const a = Math.random() * 12, r = a * 2.6 + R(-2, 2), arm = (i % 2) * Math.PI; const x = 64 + Math.cos(a + arm) * r, y = 32 + Math.sin(a + arm) * r * 0.45; g.fillStyle = r < 6 ? '#fff6d0' : pick(['#b88aff', '#8ac8ff', '#ff8ad8', '#ffffff']); g.fillRect(x | 0, y | 0, 1, 1); } });
    add(gr, new THREE.PlaneGeometry(200, 100), BA('#ffffff', { map: gal, fog: false }), 0, 30, -PZ - 40);
    // the hall: a wall of window frames across the far side and down the ends, a ceiling beam, consoles with blinking lights
    const frame = M('#8a94a4'); for (let x = -80; x <= 80; x += 10) box(gr, 1.2, 30, 1.2, frame, x, 15, -PZ - 10); for (const y of [0.5, 10, 20, 30]) box(gr, 162, 1.2, 1.2, frame, 0, y, -PZ - 10); box(gr, 162, 4, 1.2, '#4a5464', 0, 2, -PZ - 9.4);
    for (const s of [-1, 1]) { for (let z = -30; z <= 30; z += 10) box(gr, 1.2, 30, 1.2, frame, s * (PX + 16), 15, z); for (const y of [10, 20, 30]) box(gr, 1.2, 1.2, 62, frame, s * (PX + 16), y, 0); }
    const leds = []; far(8, (x, z) => { box(gr, 3, 2.2, 1.6, '#3a4250', x, 1.1, z); for (let k = 0; k < 4; k++) leds.push(box(gr, 0.35, 0.35, 0.1, BA(pick(['#3aff6a', '#ff3a3a', '#ffd21a', '#5af0ff'])), x - 1 + k * 0.65, 1.7, z + 0.82)); }, 6.5, 7.5, -60, 60);
    tick(gr, (t) => leds.forEach((l, k) => { l.visible = Math.sin(t * (2 + (k % 5)) + k) > -0.3; }));
    const earth = sph(gr, 14, lam({ color: '#3a7ae8', emissive: '#0a2a6a', flatShading: true, fog: false }), 50, 30, -PZ - 60, 1); tick(gr, (t, dt) => { earth.rotation.y += dt * 0.05; }); };
  // 21. pirate ship: the pitch is the deck, the sea all round, masts, sails, cannons, another ship out there
  DEF.piraci = { name: 'STATEK PIRACKI', sky: '#8ac8f0', fog: '#b0d8f0', near: 80, far: 260, hemi: ['#f4faff', '#4a6a8a', 2.0], sun: ['#fff0d0', 2.6], grav: 30, wx: 'none',
    pal: pal('#9a6a3a', '#a07040', '#94643a', ['#8a5a2e', '#aa7a48', '#7e5228', '#b4844e'], ['#7a5028', '#6e4622', '#865a30'], '#f4ecd6', { extra: planks }),
    track: () => tile((g) => { fill(g, '#2a6aa8'); g.fillStyle = '#3a8ac8'; for (let y = 3; y < 64; y += 8) for (let x = 0; x < 64; x++) if ((x + y) % 16 < 9) g.fillRect(x, y + Math.round(Math.sin(x / 4) * 1.5), 1, 1); speck(g, ['#ffffff', '#5aaae0'], 30); }), flow: 0.012 };
  BUILD.piraci = (gr) => { const wood = M('#6a4422'), dark = M('#4a2e16');
    // the ship round the pitch: gunwale, hull sides dropping into the sea
    box(gr, 2 * PX + 22, 1.6, 1.2, wood, 0, 0.8, -PZ - 5.5); box(gr, 2 * PX + 22, 6, 1.2, dark, 0, -2.4, -PZ - 6.2); for (const s of [-1, 1]) { box(gr, 1.2, 1.6, 2 * PZ + 12, wood, s * (PX + 11), 0.8, 0); }
    const deck = add(gr, new THREE.PlaneGeometry(2 * PX + 22, 2 * PZ + 12), M('#8a5a30'), 0, 0.01, 0); deck.rotation.x = -Math.PI / 2; deck.position.y = -0.01;
    far(7, (x, z) => { const c = cyl(gr, 0.45, 0.55, 3, '#1a1a1e', x, 1.4, z, 8); c.rotation.x = Math.PI / 2; box(gr, 1.4, 0.8, 1.6, '#4a2e16', x, 0.4, z + 0.9); }, 5.6, 5.6, -45, 45);
    const mast = (x, z, h) => { cyl(gr, 0.5, 0.6, h, '#5a3a1a', x, h / 2, z); for (const [y, w] of [[h * 0.45, 12], [h * 0.75, 9]]) { box(gr, w, 0.3, 0.3, '#5a3a1a', x, y + 4, z); const s = box(gr, w - 1, 6, 0.15, '#f4ecd6', x, y + 0.8, z + 0.3); } cyl(gr, 1.4, 1.2, 1.2, '#5a3a1a', x, h - 1, z, 8);
      const fl = tex(16, 10, (g) => { g.fillStyle = '#141414'; g.fillRect(0, 0, 16, 10); g.fillStyle = '#ffffff'; g.fillRect(6, 2, 4, 3); g.fillRect(7, 5, 2, 1); g.fillRect(4, 7, 1, 1); g.fillRect(11, 7, 1, 1); g.fillRect(5, 8, 6, 1); }); add(gr, new THREE.PlaneGeometry(3, 1.9), lam({ map: fl, side: THREE.DoubleSide }), x + 1.6, h + 1.2, z); };
    mast(-PX - 6, -PZ - 8, 26); mast(PX + 6, -PZ - 8, 22); mast(0, -PZ - 12, 30);
    for (const [x, z] of [[-PX - 8, 6], [PX + 8, -4], [-22, -PZ - 4.5], [24, -PZ - 4.5]]) { cyl(gr, 0.9, 0.9, 1.8, '#7a5028', x, 0.9, z, 10); cyl(gr, 0.95, 0.95, 0.15, '#3a3a3e', x, 1.5, z, 10); }
    const other = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(24, 4, 6), M('#3a2414')); h.position.y = 1; other.add(h); for (const dx of [-6, 4]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 22, 6), M('#3a2414')); m.position.set(dx, 12, 0); const s = new THREE.Mesh(new THREE.BoxGeometry(9, 8, 0.2), M('#1a1a1a')); s.position.set(dx, 13, 0.4); other.add(m, s); }
    other.position.set(-40, 0, -PZ - 70); gr.add(other); tick(gr, (t) => { other.position.y = Math.sin(t * 0.8) * 0.6; other.rotation.z = Math.sin(t * 0.6) * 0.03; other.position.x = -40 + Math.sin(t * 0.05) * 20; });
    for (let i = 0; i < 5; i++) cloud(gr, R(-100, 100), R(30, 50), -PZ - R(80, 160), R(1.5, 3)); };
  // 22. toy bricks: a studded baseplate pitch, brick trees and houses, giant bricks (the stands stay)
  DEF.cegielki = { name: 'ZABAWKOWE KLOCKI', sky: '#9ad0ff', fog: '#c0e0ff', near: 90, far: 220, hemi: ['#f4faff', '#5a7a4a', 2.0], sun: ['#fffbe8', 2.6], grav: 30, wx: 'none',
    pal: pal('#3ab83a', '#3ab83a', '#3ab83a', [], ['#30a030', '#2c962c', '#36ac36'], '#ffffff', { blocks: plates(['#3ab83a', '#38b438', '#3cbc3c'], '', true) }),
    track: () => tile((g) => { fill(g, '#a0a4a8'); for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) { g.fillStyle = '#b8bcc0'; g.fillRect(x + 2, y + 2, 4, 1); g.fillStyle = '#80848a'; g.fillRect(x + 2, y + 6, 4, 1); g.fillRect(x + 6, y + 2, 1, 4); } }) };
  BUILD.cegielki = (gr) => { const cols = ['#e8202a', '#2a6ae8', '#ffd21a', '#3ab83a', '#ffffff', '#ff8a1a'];
    // the hall built of bricks: colourful brick walls behind the far side and both ends, studs on top, big brick windows
    const wallTex = (w, h) => { const t = tex(128, 64, (g) => { const bw = 16, bh = 8; for (let y = 0; y < 64; y += bh) for (let x = -((y / bh) % 2) * 8; x < 128; x += bw) { g.fillStyle = pick(cols.concat(['#8a3ac8', '#3ac8e8'])); g.fillRect(x, y, bw, bh);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, bw, 1); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y + bh - 1, bw, 1); g.fillRect(x + bw - 1, y, 1, bh); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 16, h / 8); return t; };
    const wall = (x, z, w, h, ry) => { const m = add(gr, new THREE.BoxGeometry(w, h, 2), lam({ map: wallTex(w, h) }), x, h / 2, z); m.rotation.y = ry; for (let k = -w / 2 + 1; k < w / 2; k += 2) { const c = cyl(gr, 0.45, 0.45, 0.5, pick(cols), 0, h + 0.25, 0, 10); const a2 = ry; c.position.set(x + Math.cos(a2) * k, h + 0.25, z - Math.sin(a2) * k); } return m; };
    wall(0, -PZ - 12, 150, 20, 0); wall(-PX - 16, 0, 70, 18, Math.PI / 2); wall(PX + 16, 0, 70, 18, Math.PI / 2);
    for (let x = -60; x <= 60; x += 20) { box(gr, 8, 6, 0.3, lam({ color: '#bfe8ff', emissive: '#7ac0ff', emissiveIntensity: 0.4 }), x, 13, -PZ - 10.9); box(gr, 0.6, 6, 0.4, '#ffffff', x, 13, -PZ - 10.8); }
    const brick = (x, y, z, w, d, c) => { box(gr, w, 1.2, d, c, x, y + 0.6, z); for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) cyl(gr, 0.3, 0.3, 0.3, c, x - w / 2 + 0.5 + i, y + 1.35, z - d / 2 + 0.5 + j, 8); };
    const btree = (x, z) => { for (let k = 0; k < 3; k++) brick(x, k * 1.2, z, 1, 1, '#8a5a2a'); for (let k = 0; k < 3; k++) brick(x, 3.6 + k * 1.2, z, 3 - k, 3 - k, '#2a8a2a'); };
    far(10, (x, z) => btree(x, z), 5, 9); ends(6, (x, z) => btree(x, z), 6, 12);
    const house = (x, z) => { const c = pick(cols); for (let k = 0; k < 4; k++) brick(x, k * 1.2, z, 4, 3, k === 2 ? '#8ad8ff' : c); brick(x, 4.8, z, 4, 3, '#e8202a'); brick(x, 6, z, 2, 3, '#e8202a'); };
    far(5, (x, z) => house(x, z), 8.5, 9.5); far(8, (x, z) => brick(x, 0, z, pick([2, 4]), 2, pick(cols)), 4.5, 6, -40, 40); };
  // 23. crystal cave: dark stone, glowing crystals, stalagmites, sparkles
  DEF.krysztaly = { name: 'JASKINIA KRYSZTAŁÓW', sky: '#0a0614', fog: '#1a0e2a', near: 40, far: 160, hemi: ['#c09aff', '#0a0a1a', 1.4], sun: ['#d0b8ff', 1.5], grav: 30, wx: 'sparkle',
    pal: pal('#2a2438', '#2e283e', '#262032', ['#3a3250', '#1e1a2a', '#4a3a6a', '#6a5aa0'], ['#3a3250', '#322a46', '#443a5a'], '#8af4ff', { txt: 'rgba(138,244,255,.2)', extra: crack(['#8a5aff', '#8af4ff'], 26) }),
    track: () => tile((g) => { fill(g, '#1e1a2a'); speck(g, ['#2a2438', '#14101e', '#3a3250', '#8af4ff'], 220); }) };
  BUILD.krysztaly = (gr) => { const cc = ['#8af4ff', '#c88aff', '#ff8ad8', '#8affc8'];
    const cluster = (x, z, s) => { const c = pick(cc); for (let k = 0; k < 5; k++) { const m = add(gr, new THREE.OctahedronGeometry(1, 0), GL(c, 1.1), x + R(-1.2, 1.2) * s, 0, z + R(-0.8, 0.8) * s); const h = R(1.5, 3.5) * s; m.scale.set(0.5 * s, h, 0.5 * s); m.position.y = h * 0.6; m.rotation.z = R(-0.4, 0.4); m.rotation.x = R(-0.3, 0.3); } };
    far(16, (x, z) => cluster(x, z, R(0.8, 1.6)), 4.5, 10); ends(12, (x, z) => cluster(x, z, R(0.8, 1.4))); far(5, (x, z) => cluster(x, z, R(3, 5)), 14, 22);
    far(14, (x, z) => cone(gr, R(1, 2), R(4, 10), pick(['#2a2438', '#3a3250']), x, 2.5, z, 6), 8, 16); ends(8, (x, z) => cone(gr, R(1, 1.8), R(3, 8), '#2a2438', x, 2, z, 6));
    for (let k = 0; k < 18; k++) { const m = sph(gr, R(8, 14), '#1a1626', -90 + k * 10.5, R(4, 14), -PZ - R(26, 34), 0); }
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) sph(gr, R(8, 12), '#1a1626', s * (PX + R(26, 32)), R(4, 12), -30 + k * 12, 0); };
  // 24. school gym: parquet floor, light walls, wall bars, windows high under the ceiling, benches, mats, hoops
  DEF.sala = { name: 'SALA GIMNASTYCZNA', sky: '#eee8dc', fog: '#f2ece2', near: 90, far: 220, hemi: ['#fffaf0', '#a07a4a', 2.1], sun: ['#fff6e4', 2.2], grav: 30, wx: 'none',
    pal: pal('#b07a44', '#b8824a', '#aa7440', ['#9a6636', '#c48c52', '#a26c3a', '#ca9458'], ['#9a6a3a', '#8a5e32', '#a87444'], '#ffffff', { extra: (g, W, H, K, X, Z) => { planks(g, W, H, K);
      const rect = (x0, z0, x1, z1, c) => { g.fillStyle = c; g.fillRect(X(x0), Z(z0), X(x1) - X(x0), 2); g.fillRect(X(x0), Z(z1) - 2, X(x1) - X(x0), 2); g.fillRect(X(x0), Z(z0), 2, Z(z1) - Z(z0)); g.fillRect(X(x1) - 2, Z(z0), 2, Z(z1) - Z(z0)); };
      rect(-9, -4.5, 9, 4.5, '#ffd21a'); g.fillStyle = '#ffd21a'; g.fillRect(X(0) - 1, Z(-4.5), 2, Z(4.5) - Z(-4.5)); rect(-14, -7.5, 14, 7.5, '#e8361f'); rect(-28, -16, -20, 16, '#2a6ae8'); rect(20, -16, 28, 16, '#2a6ae8'); } }),
    track: () => tile((g) => { fill(g, '#c08a52'); g.fillStyle = 'rgba(90,50,20,.4)'; for (let y = 0; y < 64; y += 8) { g.fillRect(0, y, 64, 1); for (let x = (y * 3) % 32; x < 64; x += 32) g.fillRect(x, y, 1, 8); } speck(g, ['#b07a44', '#d09a60'], 80); }) };
  BUILD.sala = (gr) => { const wall = M('#f2ede2'), low = M('#c8d8e8'), wood = M('#c89a5a');
    // the walls: far side and both ends, a pale-blue band at the bottom, windows high up
    box(gr, 170, 26, 1, wall, 0, 13, -PZ - 12); box(gr, 170, 3, 1.1, low, 0, 1.5, -PZ - 11.9);
    for (const sx of [-1, 1]) { box(gr, 1, 26, 70, wall, sx * (PX + 18), 13, 0); box(gr, 1.1, 3, 70, low, sx * (PX + 17.9), 1.5, 0); }
    const glass = lam({ color: '#cfe8ff', emissive: '#bfe0ff', emissiveIntensity: 0.8 });
    for (let x = -72; x <= 72; x += 12) { box(gr, 9, 4.5, 0.3, glass, x, 21, -PZ - 11.4); box(gr, 9.6, 0.4, 0.4, '#ffffff', x, 18.8, -PZ - 11.3); for (const dx of [-1.5, 1.5]) box(gr, 0.25, 4.5, 0.35, '#ffffff', x + dx, 21, -PZ - 11.3); }
    for (const sx of [-1, 1]) for (let z = -28; z <= 28; z += 12) { box(gr, 0.3, 4.5, 9, glass, sx * (PX + 17.4), 21, z); for (const dz of [-1.5, 1.5]) box(gr, 0.35, 4.5, 0.25, '#ffffff', sx * (PX + 17.3), 21, z + dz); }
    // wall bars: two posts and a ladder of rungs, a row of them along the far wall and on the ends
    const bars = (x, z, ry) => { const g2 = new THREE.Group(); for (const dx of [-1.1, 1.1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10, 0.3), wood); p.position.set(dx, 5, 0); g2.add(p); }
      for (let y = 0.6; y < 10; y += 0.75) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 5), wood); r.rotation.z = Math.PI / 2; r.position.set(0, y, 0); g2.add(r); } g2.position.set(x, 0, z); g2.rotation.y = ry; gr.add(g2); };
    for (let x = -60; x <= 60; x += 2.6) if (Math.abs(x) > 6) bars(x, -PZ - 11.2, 0);
    for (const sx of [-1, 1]) for (let z = -24; z <= 24; z += 2.6) if (Math.abs(z) > 8) bars(sx * (PX + 17.2), z, Math.PI / 2);
    // a basketball hoop above each goal end, benches, rolled mats, a ball cart
    for (const sx of [-1, 1]) { box(gr, 0.3, 3, 4.4, '#ffffff', sx * (PX + 16.8), 12, 0); box(gr, 0.32, 1.2, 1.6, M('#e8361f'), sx * (PX + 16.75), 11.6, 0); const ring = add(gr, new THREE.TorusGeometry(0.75, 0.08, 6, 14), M('#ff6a1a'), sx * (PX + 15.8), 11, 0); ring.rotation.x = Math.PI / 2; }
    const bench = (x, z, ry) => { const g2 = new THREE.Group(); const top = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.9), wood); top.position.y = 1; g2.add(top); for (const dx of [-3.4, 0, 3.4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.8), wood); l.position.set(dx, 0.5, 0); g2.add(l); } g2.position.set(x, 0, z); g2.rotation.y = ry; gr.add(g2); };
    bench(-22, -PZ - 6, 0); bench(22, -PZ - 6, 0); bench(-PX - 9, -12, Math.PI / 2); bench(PX + 9, 12, Math.PI / 2);
    for (const [x, z] of [[-40, -PZ - 8.5], [40, -PZ - 8.5], [-PX - 12, 10]]) { for (let k = 0; k < 3; k++) box(gr, 4, 0.6, 2.4, M(k % 2 ? '#2a5ad0' : '#3a6ae8'), x, 0.3 + k * 0.6, z); }
    for (const [x, z] of [[0, -PZ - 8], [PX + 12, -14]]) { box(gr, 3, 1.6, 1.6, '#8a8e94', x, 1.2, z); for (let k = 0; k < 6; k++) sph(gr, 0.45, pick(['#e8361f', '#ff8a1a', '#2a6ae8', '#ffffff']), x - 1 + (k % 3), 2.3 + Math.floor(k / 3) * 0.5, z + (k % 2 ? 0.3 : -0.3), 1); } };
  // ======== more arenas ========
  const grassPal = (line = '#f3f6ea') => pal('#4f8a3a', '#5aa043', '#64ad4b', ['#3f7a2e', '#4a8a36', '#7cc25a', '#86c862'], ['#8a6a3a', '#9a7844', '#7a5c30'], line);
  const roof = (gr, x, y, z, w, d, h, c, ry = 0) => { const r = add(gr, new THREE.CylinderGeometry(h, h, d, 3), M(c), x, y, z); r.rotation.set(Math.PI / 2, ry, Math.PI / 2 * 0); r.rotation.z = Math.PI / 2; r.rotation.y = ry + Math.PI / 2; r.scale.set(w / (h * 1.73), 1, 1); return r; };
  const house = (gr, x, z, w, h, d, wallC, roofC, ry = 0) => { const b = box(gr, w, h, d, wallC, x, h / 2, z); b.rotation.y = ry; const r = add(gr, new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.7, 4), M(roofC), x, h + h * 0.35, z); r.rotation.y = Math.PI / 4 + ry; r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); return b; };
  const ferris = (gr, x, z, r, y = r + 2) => { const w = new THREE.Group(); w.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.3, 6, 32), M('#e8ecf2'))); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, r, 0.2), M('#e8ecf2')); sp.position.set(Math.cos(a) * r / 2, Math.sin(a) * r / 2, 0); sp.rotation.z = a + Math.PI / 2;
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), GL(pick(['#ff3a5a', '#ffd21a', '#3ac8ff', '#3ae86a']), 0.5)); c.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); w.add(sp, c); }
    w.position.set(x, y, z); gr.add(w); for (const dx of [-3, 3]) { const l = box(gr, 0.5, y + 1, 0.5, '#e8ecf2', x + dx, y / 2, z); l.rotation.z = dx > 0 ? 0.2 : -0.2; } tick(gr, (t, dt) => { w.rotation.z += dt * 0.25; }); return w; };
  const pylon = (gr, x, z, h, c = '#9aa0a8') => { for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(gr, 0.25, h, 0.25, c, x + dx * 1.2, h / 2, z + dz * 1.2); l.rotation.z = -dx * 0.06; l.rotation.x = dz * 0.06; }
    for (let y = 3; y < h; y += 4) box(gr, 2.6 - y / h, 0.2, 2.6 - y / h, c, x, y, z); box(gr, 8, 0.4, 0.4, c, x, h - 2, z); box(gr, 5, 0.4, 0.4, c, x, h - 5, z); };
  const gear = (gr, x, y, z, r, c, axis = 'z') => { const g2 = new THREE.Group(); const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.8, 16), M(c)); disc.rotation.x = Math.PI / 2; g2.add(disc); const n = Math.max(8, Math.round(r * 3));
    for (let k = 0; k < n; k++) { const a = k / n * 6.28, t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.25, r * 0.3, 0.8), M(c)); t.position.set(Math.cos(a) * (r + r * 0.12), Math.sin(a) * (r + r * 0.12), 0); t.rotation.z = a; g2.add(t); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.25, 1, 10), M('#3a3a3e')); hub.rotation.x = Math.PI / 2; g2.add(hub); g2.position.set(x, y, z); if (axis === 'x') g2.rotation.y = Math.PI / 2; gr.add(g2); return g2; };
  const clockTex = () => tex(64, 64, (g) => { g.fillStyle = '#f6f0dc'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); g.fillStyle = '#2a2018'; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; g.fillRect(32 + Math.cos(a) * 26 - 2, 32 + Math.sin(a) * 26 - 2, k % 3 ? 2 : 4, k % 3 ? 2 : 4); } g.strokeStyle = '#2a2018'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.stroke(); });
  const clock = (gr, x, y, z, r, ry = 0, speed = 1) => { const g2 = new THREE.Group(); const f = new THREE.Mesh(new THREE.CircleGeometry(r, 24), lam({ map: clockTex() })); g2.add(f); const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 6, 24), M('#b08a3a')); g2.add(rim);
    const hh = new THREE.Mesh(new THREE.BoxGeometry(r * 0.08, r * 0.5, 0.1), M('#141414')), mh = new THREE.Mesh(new THREE.BoxGeometry(r * 0.05, r * 0.8, 0.1), M('#141414')); const hp = new THREE.Group(), mp = new THREE.Group(); hh.position.y = r * 0.25; mh.position.y = r * 0.4; hp.add(hh); mp.add(mh); hp.position.z = mp.position.z = 0.1; g2.add(hp, mp);
    g2.position.set(x, y, z); g2.rotation.y = ry; gr.add(g2); tick(gr, (t) => { mp.rotation.z = -t * 0.6 * speed; hp.rotation.z = -t * 0.05 * speed; }); return g2; };
  const water = (gr, x, z, w, d, c = '#4aa8e0', y = 0.05) => { const m = add(gr, new THREE.PlaneGeometry(w, d), M(c), x, y, z); m.rotation.x = -Math.PI / 2; return m; };
  const mover = (gr, obj, path) => tick(gr, (t, dt) => path(obj, t, dt));
  const loopX = (v, a, b) => ((v - a) % (b - a) + (b - a)) % (b - a) + a;
  const crowdFig = (gr, x, z, s, cols) => { const g2 = new THREE.Group(); const c = pick(cols); const b = new THREE.Mesh(new THREE.BoxGeometry(1 * s, 1.2 * s, 0.6 * s), M(c)); b.position.y = 1.7 * s; const h = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.9 * s, 0.9 * s), M(pick(['#f1c9a0', '#c98f62', '#8a5a3a', '#e3b088']))); h.position.y = 2.75 * s;
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 1.1 * s, 0.5 * s), M(pick(['#2a2a3a', '#4a3a2a', '#3a3a3a']))); l.position.y = 0.55 * s; const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 1.1 * s, 0.3 * s), M(c)); a1.position.set(-0.65 * s, 2.2 * s, 0); const a2 = a1.clone(); a2.position.x = 0.65 * s; g2.add(b, h, l, a1, a2); g2.position.set(x, 0, z); gr.add(g2); return { g2, a1, a2 }; };

  // arctic research base
  DEF.arktyka = { name: 'BAZA ARKTYCZNA', sky: '#1a2a4a', fog: '#c8d6e6', near: 70, far: 250, hemi: ['#eef6ff', '#8a9ab0', 2.1], sun: ['#ffffff', 2.0], grav: 30, wx: 'snow',
    pal: pal('#e6edf4', '#f2f6fa', '#e4eaf1', ['#d0dae6', '#ffffff', '#c6d2e0', '#f8fbff'], ['#c4d0de', '#b8c6d6', '#d0dae6'], '#e8505a'), track: () => tile((g) => { fill(g, '#eef3f8'); speck(g, ['#d6e0ea', '#ffffff', '#c8d6e4'], 200); }) };
  BUILD.arktyka = (gr) => { const lab = (x, z, w) => { for (const dx of [-w / 2 + 0.5, w / 2 - 0.5]) box(gr, 0.4, 1.5, 0.4, '#5a606a', x + dx, 0.75, z); box(gr, w, 3.4, 4, '#e8ecf2', x, 3.2, z); for (let k = 0; k < Math.floor(w / 3); k++) box(gr, 1.2, 0.9, 0.1, GL('#ffe8a0', 0.8), x - w / 2 + 1.6 + k * 3, 3.6, z + 2.02); box(gr, w, 0.3, 4.2, '#e8361f', x, 5, z); };
    lab(-26, -PZ - 9, 14); lab(10, -PZ - 11, 10); lab(-PX - 12, 4, 8);
    const cont = ['#e86a1a', '#2a6ae8', '#e8361f', '#3a8a3a'], st = (c) => { const t = stripes(c, '#00000033', 8); return lam({ map: t, color: c }); };
    far(6, (x, z) => { box(gr, 6, 2.6, 2.6, pick(cont), x, 1.3, z); if (Math.random() < 0.5) box(gr, 6, 2.6, 2.6, pick(cont), x + 0.5, 3.9, z); }, 5, 7, -60, 60);
    const dishes = []; for (const [x, z, s] of [[30, -PZ - 10, 1.6], [46, -PZ - 14, 1.2], [PX + 14, -10, 1.2]]) { cyl(gr, 0.4 * s, 0.6 * s, 4 * s, '#c8ccd2', x, 2 * s, z); const d = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(3 * s, 14, 6, 0, 6.28, 0, 1.0), M('#f4f6fa', { side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2.4; d.add(m); d.position.set(x, 4.4 * s, z); gr.add(d); dishes.push(d); }
    tick(gr, (t) => dishes.forEach((d, i) => { d.rotation.y = Math.sin(t * 0.2 + i) * 0.8; }));
    cyl(gr, 0.15, 0.3, 18, '#c8ccd2', -44, 9, -PZ - 8); const bl = sph(gr, 0.4, BA('#ff2a2a'), -44, 18.2, -PZ - 8, 0); tick(gr, (t) => { bl.visible = Math.floor(t * 1.4) % 2 === 0; });
    for (const [x, z, r, h] of [[-50, -PZ - 50, 28, 40], [0, -PZ - 60, 34, 52], [50, -PZ - 52, 26, 38]]) peak(gr, x, z, r, h, '#9aaac0');
    const aur = []; for (let k = 0; k < 3; k++) { const m = add(gr, new THREE.PlaneGeometry(160, 18), BA(['#3affa0', '#5af0ff', '#c86aff'][k], { transparent: true, opacity: 0.22, fog: false, side: THREE.DoubleSide }), 0, 55 + k * 6, -PZ - 120); aur.push(m); }
    tick(gr, (t) => aur.forEach((m, k) => { m.position.x = Math.sin(t * 0.2 + k) * 20; m.rotation.z = Math.sin(t * 0.15 + k) * 0.08; m.material.opacity = 0.16 + Math.sin(t * 0.6 + k * 2) * 0.08; })); };
  // wild west town
  DEF.western = { name: 'DZIKI ZACHÓD', sky: '#f0c890', fog: '#e8c898', near: 80, far: 240, hemi: ['#fff0d8', '#9a6a3a', 2.0], sun: ['#ffe0a8', 2.8], grav: 30, wx: 'dust',
    pal: pal('#a8a050', '#b0a858', '#a09848', ['#988e40', '#c0b868', '#8a8038', '#c8c070'], ['#b08a50', '#a07a40', '#c09a60'], '#fff4e0'), track: () => tile((g) => { fill(g, '#c8a068'); speck(g, ['#b8905a', '#d8b078', '#a8804a'], 300); }) };
  BUILD.western = (gr) => { const shop = (x, z, w, h, label, c) => { box(gr, w, h, 6, c, x, h / 2, z); box(gr, w, 3, 0.4, c, x, h + 1.5, z + 3); sign(gr, label, '#3a2414', '#ffe0a0', x, h + 1.4, z + 3.25, w * 0.8, 1.6, 0.4);
      box(gr, w, 0.3, 2.2, '#6a4422', x, 3.6, z + 4); for (const dx of [-w / 2 + 0.3, 0, w / 2 - 0.3]) box(gr, 0.3, 3.6, 0.3, '#6a4422', x + dx, 1.8, z + 5); box(gr, 1.6, 2.6, 0.1, '#2a1a10', x, 1.3, z + 3.05); };
    shop(-34, -PZ - 12, 10, 6, 'SALOON', '#a8703a'); shop(-18, -PZ - 12, 8, 5, 'SZERYF', '#8a5a2e'); shop(-2, -PZ - 12, 9, 7, 'BANK', '#b88a52'); shop(14, -PZ - 12, 8, 5, 'HOTEL', '#9a6236'); shop(30, -PZ - 12, 10, 6, 'SKLEP', '#a8703a');
    const cactus = (x, z, h) => { const c = M('#3f8a3a'); box(gr, 0.9, h, 0.9, c, x, h / 2, z); box(gr, 0.7, h * 0.35, 0.7, c, x - 1, h * 0.55, z); box(gr, 1.3, 0.6, 0.7, c, x - 0.55, h * 0.4, z); box(gr, 0.7, h * 0.3, 0.7, c, x + 1, h * 0.62, z); box(gr, 1.3, 0.6, 0.7, c, x + 0.55, h * 0.5, z); };
    far(6, (x, z) => cactus(x, z, R(2.6, 4)), 5, 7); ends(8, (x, z) => cactus(x, z, R(2.6, 4)));
    const wt = new THREE.Group(); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 7, 0.25), M('#5a3e24')); l.position.set(dx * 1.6, 3.5, dz * 1.6); wt.add(l); } const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.6, 10), M('#8a5a34')); tank.position.y = 8.8; wt.add(tank); wt.position.set(PX + 14, 0, -10); gr.add(wt);
    for (let k = 0; k < 4; k++) { const tw = sph(gr, 0.8, M('#a08050', { wireframe: true }), 0, 0.8, 0, 1); const z = -PZ - R(5, 8), sp = R(4, 7), x0 = R(-60, 60); mover(gr, tw, (o, t) => { o.position.set(loopX(x0 + t * sp, -70, 70), 0.8 + Math.abs(Math.sin(t * 3 + k)) * 0.8, z); o.rotation.z = -t * sp / 0.8; }); }
    for (let k = 0; k < 6; k++) { const x = -70 + k * 28, z = -PZ - R(40, 60); for (let j = 0; j < 3; j++) box(gr, R(10, 18) - j * 2, 5, R(8, 12) - j * 2, ['#b8603a', '#a8502e', '#c87048'][j], x, 2.5 + j * 5, z); } };
  // power station
  DEF.elektrownia = { name: 'ELEKTROWNIA', sky: '#1a2236', fog: '#2a3246', near: 70, far: 230, hemi: ['#c8d8ff', '#2a2a36', 1.7], sun: ['#e8f0ff', 2.0], grav: 30, wx: 'none',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#5a5e64'); speck(g, ['#4a4e54', '#6a6e74', '#7a7e84'], 320); }) };
  BUILD.elektrownia = (gr) => { pylon(gr, -50, -PZ - 14, 26); pylon(gr, 0, -PZ - 18, 30); pylon(gr, 50, -PZ - 14, 26);
    for (const [a, b] of [[-50, 0], [0, 50]]) for (const dy of [-2, -5]) { const len = Math.abs(b - a); const w = box(gr, len, 0.08, 0.08, '#2a2a2e', (a + b) / 2, (dy === -2 ? 26 : 23) + 1 - 2, -PZ - 16); }
    const gen = (x, z) => { const c = cyl(gr, 2.4, 2.4, 7, '#3a6ac8', x, 3, z, 12); c.rotation.z = Math.PI / 2; box(gr, 8, 1, 4, '#4a4e54', x, 0.5, z); box(gr, 1, 1, 0.1, GL('#3aff6a', 1.4), x + 2, 4.2, z + 2.42); };
    far(4, (x, z) => gen(x, z), 6, 8, -40, 40);
    const trans = (x, z) => { box(gr, 3, 4, 3, '#7a8088', x, 2, z); for (let k = 0; k < 5; k++) box(gr, 0.15, 3, 3.6, '#5a6068', x - 1.2 + k * 0.6, 2, z); for (const dx of [-0.8, 0.8]) { cyl(gr, 0.25, 0.35, 2, '#c8ccd2', x + dx, 5, z, 6); } };
    ends(6, (x, z) => trans(x, z), 8, 14);
    for (const x of [-30, 30]) { cyl(gr, 7, 10, 26, '#b8bcc2', x, 13, -PZ - 40, 16); for (let k = 0; k < 3; k++) { const sm = sph(gr, 5 + k, BA('#d8dce2', { transparent: true, opacity: 0.45 }), x, 28 + k * 5, -PZ - 40, 1); tick(gr, (t) => { sm.position.y = 28 + ((t * 2 + k * 5) % 15); sm.material.opacity = 0.5 - ((t * 2 + k * 5) % 15) / 34; }); } }
    // electric arcs: jagged lines that flicker between two posts
    const arcs = []; for (const [x0, x1, y, z] of [[-PX - 10, -PX - 10, 0, 0], [-6, 6, 7, -PZ - 7], [PX + 10, PX + 10, 0, 0]]) { const n = 10, pos = new Float32Array(n * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const ln = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#bff4ff' })); gr.add(ln); const from = x0 === x1 ? [x0, 7, -8] : [x0, y, z], to = x0 === x1 ? [x0, 7, 8] : [x1, y, z]; for (const p of [from, to]) { cyl(gr, 0.3, 0.4, p[1], '#5a6068', p[0], p[1] / 2, p[2], 6); sph(gr, 0.5, GL('#8af4ff', 1.5), p[0], p[1], p[2], 0); } arcs.push([ln, pos, from, to]); }
    tick(gr, (t) => arcs.forEach(([ln, pos, a, b], i) => { const on = Math.sin(t * 3 + i * 2) > -0.2 && Math.random() < 0.85; ln.visible = on; if (!on) return; for (let k = 0; k < 10; k++) { const f = k / 9, j = k && k < 9 ? 1 : 0; pos[k * 3] = a[0] + (b[0] - a[0]) * f + (Math.random() - 0.5) * j; pos[k * 3 + 1] = a[1] + (b[1] - a[1]) * f + (Math.random() - 0.5) * 1.4 * j; pos[k * 3 + 2] = a[2] + (b[2] - a[2]) * f + (Math.random() - 0.5) * j; } ln.geometry.attributes.position.needsUpdate = true; })); };
  // sea port
  DEF.port = { name: 'PORT MORSKI', sky: '#9ac8e8', fog: '#b8d4e8', near: 80, far: 260, hemi: ['#f0f8ff', '#5a6a7a', 2.0], sun: ['#fff4e0', 2.6], grav: 30, wx: 'none',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#8a8c90'); speck(g, ['#7a7c80', '#9a9ca0'], 260); g.fillStyle = '#ffd21a'; g.fillRect(0, 30, 64, 2); }) };
  BUILD.port = (gr) => { water(gr, 0, -PZ - 70, 400, 90, '#2a6aa8', 0.05); const cols = ['#e8361f', '#2a6ae8', '#3a8a3a', '#e8a01a', '#8a3ac8', '#e86a1a'];
    far(9, (x, z) => { for (let k = 0; k < 1 + (Math.random() * 3 | 0); k++) box(gr, 6, 2.6, 2.6, pick(cols), x, 1.3 + k * 2.6, z); }, 5.5, 8, -60, 60); ends(6, (x, z) => { for (let k = 0; k < 2; k++) box(gr, 2.6, 2.6, 6, pick(cols), x, 1.3 + k * 2.6, z); }, 8, 14);
    const crane = (x, z) => { for (const dx of [-4, 4]) box(gr, 0.8, 22, 0.8, '#e8a01a', x + dx, 11, z); box(gr, 10, 1, 1, '#e8a01a', x, 22, z); const boom = box(gr, 1, 1, 28, '#e8a01a', x, 22, z - 8); const tr = new THREE.Group(); const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), M('#3a3a3e')); tr.add(cab); const cable = new THREE.Mesh(new THREE.BoxGeometry(0.1, 8, 0.1), M('#141414')); cable.position.y = -4.6; tr.add(cable); const ld = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 2.2), M(pick(cols))); ld.position.y = -9.5; tr.add(ld); tr.position.set(x, 21, z); gr.add(tr);
      tick(gr, (t) => { tr.position.z = z - 8 + Math.sin(t * 0.3 + x) * 12; }); };
    crane(-30, -PZ - 18); crane(24, -PZ - 20);
    const ship = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(60, 8, 12), M('#2a3a5a')); hull.position.y = 2; ship.add(hull); const red = new THREE.Mesh(new THREE.BoxGeometry(60.2, 2, 12.2), M('#b02a2a')); red.position.y = -1; ship.add(red);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { const c = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.6, 5.6), M(pick(cols))); c.position.set(-22 + i * 6, 7.3 + j * 2.6, 0); ship.add(c); } const br = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 10), M('#e8ecf2')); br.position.set(25, 10.5, 0); ship.add(br);
    ship.position.set(0, 0, -PZ - 52); gr.add(ship); tick(gr, (t) => { ship.position.x = Math.sin(t * 0.03) * 40; ship.position.y = Math.sin(t * 0.7) * 0.3; });
    far(3, (x, z) => { box(gr, 24, 9, 12, '#9aa4b0', x, 4.5, z); const r = add(gr, new THREE.CylinderGeometry(7, 7, 24, 3), M('#6a7480'), x, 9, z); r.rotation.z = Math.PI / 2; r.scale.set(1, 1, 0.9); }, 30, 34, -70, 70);
    for (let k = 0; k < 6; k++) { const b = new THREE.Group(); const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.4), BA('#ffffff')), w2 = w1.clone(); w1.position.x = -0.55; w2.position.x = 0.55; b.add(w1, w2); gr.add(b); const cx = R(-40, 40), cz = -PZ - R(10, 30), r = R(6, 14);
      tick(gr, (t) => { const a = t * 0.5 + k; b.position.set(cx + Math.cos(a) * r, 14 + Math.sin(t + k) * 2, cz + Math.sin(a) * 4); w1.rotation.z = Math.sin(t * 8 + k) * 0.5; w2.rotation.z = -w1.rotation.z; }); } };
  // airport
  DEF.lotnisko = { name: 'LOTNISKO', sky: '#9ad0f4', fog: '#c0e0f4', near: 90, far: 280, hemi: ['#f4faff', '#5a6a5a', 2.1], sun: ['#fff6e4', 2.6], grav: 30, wx: 'none',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#3a3c40'); speck(g, ['#2e3034', '#46484c'], 200); g.fillStyle = '#ffffff'; for (let x = 2; x < 64; x += 16) g.fillRect(x, 31, 10, 2); }) };
  BUILD.lotnisko = (gr) => { const hangar = (x, z, w) => { const h = add(gr, new THREE.CylinderGeometry(w / 2, w / 2, 16, 16, 1, false, 0, Math.PI), M('#c8ccd2'), x, 0, z); h.rotation.z = Math.PI / 2; h.rotation.y = Math.PI / 2; box(gr, w * 0.7, w * 0.4, 0.2, '#3a3c40', x, w * 0.2, z + 8.05); };
    hangar(-36, -PZ - 22, 18); hangar(-12, -PZ - 24, 16);
    cyl(gr, 1.4, 1.8, 22, '#e8ecf2', 30, 11, -PZ - 18, 10); box(gr, 6, 3, 6, lam({ color: '#5ac8ff', emissive: '#2a8ab0', emissiveIntensity: 0.4 }), 30, 23.5, -PZ - 18); box(gr, 7, 0.6, 7, '#3a3c40', 30, 25.3, -PZ - 18);
    const plane = (s, col) => { const p = new THREE.Group(); const f = new THREE.Mesh(new THREE.CylinderGeometry(1 * s, 0.8 * s, 14 * s, 10), M('#f4f6fa')); f.rotation.z = Math.PI / 2; p.add(f); const nose = new THREE.Mesh(new THREE.ConeGeometry(1 * s, 2 * s, 10), M('#f4f6fa')); nose.rotation.z = -Math.PI / 2; nose.position.x = 8 * s; p.add(nose);
      const w = new THREE.Mesh(new THREE.BoxGeometry(3 * s, 0.25 * s, 14 * s), M('#d8dce2')); p.add(w); const tl = new THREE.Mesh(new THREE.BoxGeometry(2 * s, 3 * s, 0.25 * s), M(col)); tl.position.set(-6.4 * s, 1.8 * s, 0); p.add(tl); const tw = new THREE.Mesh(new THREE.BoxGeometry(1.6 * s, 0.2 * s, 5 * s), M('#d8dce2')); tw.position.set(-6.4 * s, 0.4 * s, 0); p.add(tw);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(14 * s, 0.4 * s, 2.02 * s), M(col)); stripe.position.y = 0.1 * s; p.add(stripe); gr.add(p); return p; };
    const p1 = plane(1, '#e8361f'); p1.position.set(-PX - 18, 1.6, 6); p1.rotation.y = Math.PI / 2; const p2 = plane(0.8, '#2a6ae8'); p2.position.set(PX + 18, 1.3, -6); p2.rotation.y = -Math.PI / 2;
    const p3 = plane(1.2, '#3a8a3a'); tick(gr, (t) => { const c = (t * 0.07) % 1, x = -120 + c * 240, up = Math.max(0, c - 0.45) * 60; p3.position.set(x, 1.8 + up, -PZ - 34); p3.rotation.z = Math.min(0.25, up * 0.02); });
    box(gr, 260, 0.05, 10, '#2e3034', 0, 0.06, -PZ - 34); const lights = []; for (let x = -100; x <= 100; x += 8) lights.push(box(gr, 0.4, 0.3, 0.4, BA('#ffe14a'), x, 0.2, -PZ - 29)); tick(gr, (t) => lights.forEach((l, k) => { l.visible = (Math.floor(t * 6) - k) % 8 !== 0; }));
    cyl(gr, 0.1, 0.1, 6, '#c8ccd2', PX + 10, 3, -PZ - 6); const sock = cone(gr, 0.5, 2.4, M('#ff6a1a'), PX + 11.2, 5.6, -PZ - 6, 8); sock.rotation.z = Math.PI / 2; tick(gr, (t) => { sock.rotation.y = Math.sin(t * 0.7) * 0.4; }); };
  // fun fair: big wheel, a roller coaster with a running car, carousel, balloons
  DEF.lunapark = { name: 'WESOŁE MIASTECZKO', sky: '#8ad0ff', fog: '#c8e4f4', near: 80, far: 240, hemi: ['#fff8f0', '#6a7a4a', 2.0], sun: ['#fff4e0', 2.6], grav: 30, wx: 'confetti',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#c8b898'); speck(g, ['#b8a888', '#d8c8a8'], 220); }) };
  BUILD.lunapark = (gr) => { ferris(gr, -34, -PZ - 22, 12);
    const curve = (u) => [-6 + u * 60, 6 + Math.sin(u * 6.28 * 2) * 4 + Math.sin(u * 6.28 * 5) * 1.5 + (u < 0.15 ? u * 30 : 4.5), -PZ - 14 - Math.sin(u * 6.28) * 4];
    for (let k = 0; k <= 60; k++) { const [x, y, z] = curve(k / 60), [x2, y2, z2] = curve((k + 1) / 60); const seg = box(gr, Math.hypot(x2 - x, y2 - y, z2 - z) + 0.1, 0.3, 1.4, '#e8361f', (x + x2) / 2, (y + y2) / 2, (z + z2) / 2); seg.rotation.y = -Math.atan2(z2 - z, x2 - x); seg.rotation.z = Math.atan2(y2 - y, Math.hypot(x2 - x, z2 - z)); if (k % 4 === 0) box(gr, 0.3, y, 0.3, '#e8ecf2', x, y / 2, z); }
    const cars = []; for (let k = 0; k < 3; k++) cars.push(box(gr, 1.8, 1, 1.2, pick(['#ffd21a', '#3ac8ff']), 0, 0, 0)); tick(gr, (t) => cars.forEach((c, k) => { const u = ((t * 0.08 - k * 0.025) % 1 + 1) % 1, [x, y, z] = curve(u), [x2, y2, z2] = curve(Math.min(1, u + 0.01)); c.position.set(x, y + 0.7, z); c.rotation.y = -Math.atan2(z2 - z, x2 - x); c.rotation.z = Math.atan2(y2 - y, Math.hypot(x2 - x, z2 - z)); }));
    const car = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.6, 16), M('#e8c040')); car.add(base); const rT = stripes('#e8202a', '#ffffff', 8); rT.repeat.set(4, 1); const rf = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.6, 16), lam({ map: rT })); rf.position.y = 5.4; car.add(rf);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 4), M('#ffd21a')); p.position.set(Math.cos(a) * 4, 2.5, Math.sin(a) * 4); const h = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.5), M(pick(['#ffffff', '#ff8ad8', '#8ad8ff']))); h.position.set(Math.cos(a) * 4, 1.8, Math.sin(a) * 4); h.rotation.y = -a; car.add(p, h); }
    car.position.set(PX + 16, 0, 4); gr.add(car); tick(gr, (t, dt) => { car.rotation.y += dt * 0.8; });
    const bal = []; for (let k = 0; k < 10; k++) { const b = sph(gr, 0.7, M(pick(['#ff3a5a', '#ffd21a', '#3ac8ff', '#3ae86a', '#c86aff'])), 0, 0, 0, 1); bal.push([b, R(-60, 60), -PZ - R(6, 20), R(0, 30)]); } tick(gr, (t) => bal.forEach(([b, x, z, o]) => b.position.set(x + Math.sin(t + o) * 1.5, (t * 2 + o) % 34, z)));
    far(5, (x, z) => { const t2 = stripes(pick(['#ff3a7a', '#3ac8ff', '#ffd21a']), '#ffffff', 6); t2.repeat.set(2, 1); box(gr, 3, 2.4, 2, lam({ map: t2 }), x, 1.2, z); cone(gr, 2.4, 1.4, lam({ map: t2 }), x, 3.1, z, 4).rotation.y = Math.PI / 4; }, 5, 7, -50, 50); };
  // abandoned factory
  DEF.ruina = { name: 'OPUSZCZONA FABRYKA', sky: '#8a8e94', fog: '#9a9ea4', near: 50, far: 200, hemi: ['#e0e2e6', '#4a4440', 1.8], sun: ['#f0ece4', 1.9], grav: 30, wx: 'ash',
    pal: pal('#7a7a72', '#82827a', '#76766e', ['#6a6a62', '#5a7a3a', '#8a8a82', '#4a6a30'], ['#5a4a3a', '#4a3e30', '#6a5444'], '#e8e4d8', { extra: crack(['#4a4a44', '#5a7a3a'], 40) }), track: () => tile((g) => { fill(g, '#6a6660'); speck(g, ['#5a5650', '#7a766e', '#4a6a30', '#8a5a3a'], 300); }) };
  BUILD.ruina = (gr) => { const rust = ['#8a4a2a', '#9a5a32', '#7a3e22', '#a86a3e'];
    const hall = (x, z, w, h) => { const t = winTex('#7a6e64', '#1a1a1e', '#3a4a5a', 0.6); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 3, h / 3); add(gr, new THREE.BoxGeometry(w, h, 10), lam({ map: t }), x, h / 2, z); const r = add(gr, new THREE.CylinderGeometry(5.8, 5.8, w, 3), M('#5a504a'), x, h + 2, z); r.rotation.z = Math.PI / 2; r.scale.set(1, 1, 0.9); };
    hall(-30, -PZ - 18, 26, 12); hall(16, -PZ - 22, 30, 14);
    for (const x of [-50, 40, 52]) { cyl(gr, 1.8, 2.4, 32, pick(rust), x, 16, -PZ - 30, 10); box(gr, 4.2, 0.6, 4.2, '#3a3a3a', x, 32, -PZ - 30); }
    far(8, (x, z) => { const m = box(gr, R(3, 6), R(2, 5), R(2, 4), pick(rust), x, 1.5, z); m.rotation.y = R(-0.3, 0.3); m.rotation.z = R(-0.1, 0.1); if (Math.random() < 0.5) { const g2 = cyl(gr, 1.2, 1.2, 0.4, '#6a4a32', x + 1, 3.6, z + 1.6, 10); g2.rotation.x = Math.PI / 2; g2.rotation.y = 0.3; } }, 5, 10);
    ends(8, (x, z) => { const p = cyl(gr, 0.5, 0.5, R(6, 12), pick(rust), x, 0.5, z, 8); p.rotation.z = Math.PI / 2 * R(0.8, 1); p.rotation.y = R(0, 3); });
    far(14, (x, z) => { for (let k = 0; k < 4; k++) box(gr, 0.15, R(0.6, 1.6), 0.15, '#5a8a3a', x + R(-1, 1), 0.5, z + R(-0.6, 0.6)); }, 4.5, 6); water(gr, -8, -PZ - 7, 6, 2.4, '#4a5260', 0.04); water(gr, PX + 10, 8, 4, 6, '#4a5260', 0.04); };
  // mountain village with a cable car
  DEF.gory = { name: 'GÓRSKA WIOSKA', sky: '#9ac8f0', fog: '#c8dcec', near: 80, far: 280, hemi: ['#f4faff', '#4a6a3a', 2.0], sun: ['#fff6e4', 2.6], grav: 30, wx: 'none',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#5a8a3a'); speck(g, ['#4a7a2e', '#6a9a46', '#ffffff', '#ffd21a'], 260); }) };
  BUILD.gory = (gr) => { for (const [x, z, r, h] of [[-60, -PZ - 50, 30, 56], [-12, -PZ - 64, 38, 76], [40, -PZ - 52, 30, 54], [80, -PZ - 60, 30, 50], [-PX - 44, 0, 24, 40], [PX + 46, 4, 24, 44]]) peak(gr, x, z, r, h, '#7c889a');
    const chalet = (x, z, s) => { box(gr, 6 * s, 4 * s, 5 * s, '#8a5a2e', x, 2 * s, z); const r = add(gr, new THREE.CylinderGeometry(3.6 * s, 3.6 * s, 5.6 * s, 3), M('#4a3020'), x, 4 * s + 1.7 * s, z); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI / 2; r.rotation.y = 0; r.rotation.set(0, 0, Math.PI / 2); r.rotation.order = 'YXZ'; r.rotation.set(Math.PI / 2, 0, Math.PI / 6); for (const dx of [-1.6, 1.6]) box(gr, 1.2 * s, 1 * s, 0.1, GL('#ffe0a0', 0.5), x + dx * s, 2.6 * s, z + 2.5 * s + 0.05); box(gr, 1.2 * s, 2 * s, 0.1, '#3a2414', x, 1 * s, z + 2.5 * s + 0.05); };
    far(7, (x, z) => chalet(x, z, R(0.9, 1.3)), 8, 16); ends(4, (x, z) => chalet(x, z, R(0.8, 1)), 10, 18);
    const pine = (x, z, s) => { box(gr, 0.6 * s, 2 * s, 0.6 * s, '#5a3e24', x, s, z); for (let k = 0; k < 3; k++) cone(gr, (2.4 - k * 0.6) * s, 2.6 * s, '#2a5a3a', x, (2.6 + k * 1.6) * s, z, 7); };
    far(12, (x, z) => pine(x, z, R(1, 1.6)), 6, 12); ends(8, (x, z) => pine(x, z, R(1, 1.4)));
    const A = new THREE.Vector3(-50, 6, -PZ - 12), B = new THREE.Vector3(-12, 52, -PZ - 56); const d = B.clone().sub(A), L = d.length(); const cab = box(gr, 0.1, 0.1, L, '#141414', 0, 0, 0); cab.position.copy(A).add(B).multiplyScalar(0.5); cab.lookAt(B);
    for (const p of [A, B]) { box(gr, 1, p.y, 1, '#8a8e94', p.x, p.y / 2, p.z); }
    const gond = new THREE.Group(); const gb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2), M('#e8361f')); gb.position.y = -2.2; const gw = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.8, 2.1), lam({ color: '#cfe8ff', emissive: '#6a9ac8', emissiveIntensity: 0.3 })); gw.position.y = -1.9; const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), M('#3a3a3e')); arm.position.y = -0.6; gond.add(gb, gw, arm); gr.add(gond);
    tick(gr, (t) => { const u = (Math.sin(t * 0.08) + 1) / 2; gond.position.copy(A).lerp(B, 0.05 + u * 0.9); }); };
  // great library
  DEF.biblioteka = { name: 'WIELKA BIBLIOTEKA', sky: '#3a2a20', fog: '#4a3628', near: 60, far: 200, hemi: ['#ffe8c8', '#4a2a1a', 1.8], sun: ['#ffdca8', 2.0], grav: 30, wx: 'none',
    pal: pal('#9a6236', '#a26a3a', '#965e32', ['#8a5428', '#b07440', '#7e4c24', '#b87c46'], ['#8a5a30', '#7e522c', '#966236'], '#f4ecd6', { extra: planks }), track: () => tile((g) => { fill(g, '#6a3a22'); g.fillStyle = 'rgba(30,10,0,.45)'; for (let y = 0; y < 64; y += 8) { g.fillRect(0, y, 64, 1); for (let x = (y * 5) % 24; x < 64; x += 24) g.fillRect(x, y, 1, 8); } }) };
  BUILD.biblioteka = (gr) => { const books = (rows = 6) => { const t = tex(64, 64, (g) => { g.fillStyle = '#4a2a16'; g.fillRect(0, 0, 64, 64); for (let r = 0; r < rows; r++) { let x = 1; const y0 = r * (64 / rows); g.fillStyle = '#2a160a'; g.fillRect(0, y0 + 64 / rows - 2, 64, 2);
      while (x < 63) { const w = 2 + (Math.random() * 3 | 0), h = 64 / rows - 4 - (Math.random() * 3 | 0); g.fillStyle = pick(['#a8302a', '#2a5aa8', '#3a8a4a', '#c8a040', '#6a3a8a', '#e8e0c8', '#8a4a2a', '#1a3a5a']); g.fillRect(x, y0 + 64 / rows - 2 - h, w, h); g.fillStyle = 'rgba(255,230,150,.5)'; g.fillRect(x, y0 + 64 / rows - 2 - h + 2, w, 1); x += w + (Math.random() < 0.1 ? 3 : 0); } } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
    const shelf = (x, z, w, h, ry = 0) => { const t = books(); t.repeat.set(w / 8, h / 8); const s = add(gr, new THREE.BoxGeometry(w, h, 3), [M('#5a3a1e'), M('#5a3a1e'), M('#5a3a1e'), M('#5a3a1e'), lam({ map: t }), M('#5a3a1e')], x, h / 2, z); s.rotation.y = ry; return s; };
    shelf(0, -PZ - 12, 150, 34); for (const sx of [-1, 1]) shelf(sx * (PX + 16), 0, 70, 30, -sx * Math.PI / 2);
    const lad = (x, z) => { const g2 = new THREE.Group(); for (const dx of [-0.8, 0.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 22, 0.25), M('#8a5a2e')); p.position.set(dx, 11, 0); g2.add(p); } for (let y = 1; y < 22; y += 1.2) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.2), M('#8a5a2e')); r.position.y = y; g2.add(r); } g2.position.set(x, 0, z); g2.rotation.x = -0.15; gr.add(g2); return g2; };
    const l1 = lad(-24, -PZ - 8.6), l2 = lad(30, -PZ - 8.6); tick(gr, (t) => { l1.position.x = -24 + Math.sin(t * 0.2) * 14; });
    clock(gr, 0, 24, -PZ - 10.4, 5); clock(gr, -PX - 14.4, 20, 0, 3.5, Math.PI / 2); clock(gr, PX + 14.4, 20, 0, 3.5, -Math.PI / 2, 2);
    far(5, (x, z) => { box(gr, 4, 2.2, 2.4, '#6a3a1e', x, 1.1, z); cyl(gr, 0.1, 0.1, 1.4, '#c8a040', x + 1, 2.9, z, 5); cone(gr, 0.7, 0.8, GL('#3a8a4a', 0.4), x + 1, 3.8, z, 8); box(gr, 1.4, 0.3, 1, '#a8302a', x - 1, 2.35, z); }, 5, 6, -40, 40);
    const globe = sph(gr, 1.4, M('#3a7ac8'), PX + 9, 3, -14, 1); cyl(gr, 0.2, 0.6, 2, '#8a5a2e', PX + 9, 1, -14); tick(gr, (t, dt) => { globe.rotation.y += dt * 0.5; });
    for (let k = 0; k < 7; k++) { const b = new THREE.Group(), c = pick(['#a8302a', '#2a5aa8', '#3a8a4a', '#c8a040']); const p1 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 1.4), M(c)), p2 = p1.clone(); p1.position.x = -0.5; p2.position.x = 0.5; const pg = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.3), M('#f4ecd6')); pg.position.y = 0.1; b.add(pg, p1, p2); gr.add(b);
      const cx = R(-50, 50), cz = -PZ - R(4, 9), cy = R(8, 18), r = R(4, 10); tick(gr, (t) => { const a = t * 0.4 + k; b.position.set(cx + Math.cos(a) * r, cy + Math.sin(t * 0.9 + k), cz + Math.sin(a) * 2); b.rotation.y = -a; p1.rotation.z = 0.4 + Math.sin(t * 6 + k) * 0.4; p2.rotation.z = -p1.rotation.z; }); } };
  // big mine
  DEF.kopalnia = { name: 'KOPALNIA', sky: '#14100e', fog: '#1e1814', near: 40, far: 160, hemi: ['#ffd8a8', '#1a1410', 1.6], sun: ['#ffc888', 1.8], grav: 30, wx: 'ash',
    pal: pal('#5a4a3a', '#604e3e', '#544436', ['#4a3c2e', '#6a5846', '#3e3226', '#74624e'], ['#3a2e22', '#2e241a', '#46382a'], '#f4dca0', { extra: dots(['#ffd24a', '#c8c8c8'], 180, 2) }),
    track: () => tile((g) => { fill(g, '#3a2e24'); speck(g, ['#2e241a', '#4a3c2e', '#ffd24a'], 260); }) };
  BUILD.kopalnia = (gr) => { const rail = (z, x0, x1) => { for (const dz of [-0.7, 0.7]) box(gr, x1 - x0, 0.2, 0.2, '#8a8e94', (x0 + x1) / 2, 0.3, z + dz); for (let x = x0; x <= x1; x += 1.6) box(gr, 0.5, 0.15, 2.2, '#5a3e24', x, 0.12, z); };
    rail(-PZ - 7, -80, 80); for (const sx of [-1, 1]) { for (const dz of [-0.7, 0.7]) box(gr, 0.2, 0.2, 60, '#8a8e94', sx * (PX + 10) + dz, 0.3, 0); }
    const cart = (c) => { const g2 = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 1.8), M('#6a6e74')); b.position.y = 1.2; g2.add(b); const ore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), M(c)); ore.position.y = 2; ore.scale.set(1.3, 0.6, 0.9); g2.add(ore);
      for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 8), M('#2a2a2e')); w.rotation.x = Math.PI / 2; w.position.set(dx, 0.4, dz); g2.add(w); } gr.add(g2); return g2; };
    for (let k = 0; k < 4; k++) { const c = cart(k % 2 ? '#3a3a3e' : '#c8a040'); tick(gr, (t) => c.position.set(loopX(-80 + k * 9 + t * 5, -80, 80), 0, -PZ - 7)); }
    const tunnel = (x, z, ry) => { const g2 = new THREE.Group(); const arch = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.6, 6, 12, Math.PI), M('#6a4a2a')); arch.position.y = 3; g2.add(arch); for (const dx of [-3.4, 3.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1.2), M('#6a4a2a')); p.position.set(dx, 1.5, 0); g2.add(p); } const dark = new THREE.Mesh(new THREE.CircleGeometry(3.2, 12, 0, Math.PI), BA('#050403')); dark.position.set(0, 3, -0.3); g2.add(dark); const dk2 = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3), BA('#050403')); dk2.position.set(0, 1.5, -0.3); g2.add(dk2);
      g2.position.set(x, 0, z); g2.rotation.y = ry; gr.add(g2); };
    tunnel(-82, -PZ - 7, Math.PI / 2); tunnel(-20, -PZ - 14, 0); tunnel(26, -PZ - 14, 0);
    for (let k = 0; k < 16; k++) sph(gr, R(8, 13), '#2a221c', -90 + k * 12, R(4, 14), -PZ - R(22, 30), 0); for (const s of [-1, 1]) for (let k = 0; k < 6; k++) sph(gr, R(8, 12), '#2a221c', s * (PX + R(24, 30)), R(4, 12), -30 + k * 12, 0);
    const hf = 44; for (const dx of [-2.4, 2.4]) { const l = box(gr, 0.5, 22, 0.5, '#5a3e24', hf + dx, 11, -PZ - 16); l.rotation.z = -dx * 0.05; } for (let y = 3; y < 22; y += 4) box(gr, 5, 0.3, 0.3, '#5a3e24', hf, y, -PZ - 16);
    const wheel = add(gr, new THREE.TorusGeometry(2.4, 0.25, 6, 16), M('#3a3a3e'), hf, 22, -PZ - 16); tick(gr, (t, dt) => { wheel.rotation.z += dt; });
    const lamps = []; far(10, (x, z) => { box(gr, 0.2, 3, 0.2, '#5a3e24', x, 1.5, z); lamps.push(sph(gr, 0.4, GL('#ffc860', 1.6), x, 3.1, z, 0)); }, 9, 9.5); tick(gr, (t) => lamps.forEach((l, k) => l.scale.setScalar(0.9 + Math.sin(t * 7 + k * 3) * 0.12)));
    far(10, (x, z) => { const r = rock(gr, x, z, R(0.8, 1.6), '#4a3c2e'); }, 4.5, 6); };
  // swamp: piers, mist, twisted trees, alligators swimming
  DEF.bagna = { name: 'BAGNA', sky: '#4a5a44', fog: '#6a7a5e', near: 25, far: 130, hemi: ['#d8e8c0', '#2a3a20', 1.6], sun: ['#e8f0c8', 1.7], grav: 30, wx: 'fireflies',
    pal: pal('#4a6a32', '#50703a', '#46642e', ['#3e5a2a', '#5a7a3e', '#34502a', '#627e44'], ['#4a3e26', '#3e3420', '#56482e'], '#e8ecd0'), track: () => tile((g) => { fill(g, '#3a4a2a'); speck(g, ['#4a5e32', '#2e3c22', '#5a7a3a', '#6a8a4a'], 300); }) };
  BUILD.bagna = (gr) => { water(gr, 0, -PZ - 30, 260, 44, '#3a5a3a', 0.04); for (const s of [-1, 1]) water(gr, s * (PX + 26), 0, 30, 80, '#3a5a3a', 0.04);
    const pier = (x0, x1, z) => { for (let x = x0; x <= x1; x += 1.2) box(gr, 1, 0.25, 3, '#7a5a34', x, 0.9, z); for (let x = x0; x <= x1; x += 4) for (const dz of [-1.4, 1.4]) box(gr, 0.4, 2, 0.4, '#5a3e24', x, 0.5, z + dz); };
    pier(-50, -10, -PZ - 10); pier(16, 50, -PZ - 14);
    const twisted = (x, z, s) => { for (let k = 0; k < 5; k++) { const b = box(gr, 0.8 * s, 1.8 * s, 0.8 * s, '#3a2e24', x + Math.sin(k * 1.4) * 0.8 * s, (0.9 + k * 1.6) * s, z); b.rotation.z = Math.sin(k * 1.7) * 0.4; } for (let k = 0; k < 3; k++) { const br = box(gr, 0.3 * s, 3.4 * s, 0.3 * s, '#3a2e24', x + (k - 1) * 1.6 * s, 8.4 * s, z); br.rotation.z = (k - 1) * 0.8; }
      for (let k = 0; k < 6; k++) box(gr, 0.12, R(1.5, 3) * s, 0.12, '#6a8a4a', x + R(-2.5, 2.5) * s, 7 * s, z + R(-0.6, 0.6)); };
    far(8, (x, z) => twisted(x, z, R(1, 1.5)), 8, 18); ends(6, (x, z) => twisted(x, z, R(0.9, 1.3)), 10, 24);
    far(16, (x, z) => { for (let k = 0; k < 5; k++) box(gr, 0.1, R(1.5, 3), 0.1, '#8a9a4a', x + R(-0.8, 0.8), 1, z + R(-0.4, 0.4)); }, 5, 7); far(12, (x, z) => { const p = add(gr, new THREE.CircleGeometry(R(0.7, 1.2), 8), M('#4a8a3a'), x, 0.08, z); p.rotation.x = -Math.PI / 2; }, 9, 22);
    const gator = (s) => { const g2 = new THREE.Group(), c = M('#3a5a2a'); const b = new THREE.Mesh(new THREE.BoxGeometry(5 * s, 0.7 * s, 1.4 * s), c); g2.add(b); const sn = new THREE.Mesh(new THREE.BoxGeometry(2 * s, 0.5 * s, 0.9 * s), c); sn.position.x = 3.4 * s; g2.add(sn); const tl = new THREE.Mesh(new THREE.ConeGeometry(0.6 * s, 3.5 * s, 4), c); tl.rotation.z = Math.PI / 2; tl.position.x = -4 * s; g2.add(tl);
      for (const dz of [-0.4, 0.4]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.35 * s, 0.3 * s), M('#e8d84a')); e.position.set(2.3 * s, 0.45 * s, dz * s); g2.add(e); } for (let k = 0; k < 5; k++) { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.25 * s, 0.4 * s), M('#2a4a1e')); sc.position.set(-1.6 * s + k * 0.8 * s, 0.45 * s, 0); g2.add(sc); } gr.add(g2); return g2; };
    for (let k = 0; k < 4; k++) { const g2 = gator(R(0.8, 1.2)), z = k < 3 ? -PZ - R(16, 30) : 0, cx = k < 3 ? R(-50, 50) : PX + 24, r = R(8, 16); tick(gr, (t) => { const a = t * 0.12 + k * 1.7; if (k < 3) { g2.position.set(cx + Math.cos(a) * r, 0.1 + Math.sin(t * 1.3 + k) * 0.08, z + Math.sin(a) * 4); g2.rotation.y = -a - Math.PI / 2; } else { g2.position.set(cx, 0.1, Math.sin(a) * 24); g2.rotation.y = Math.cos(a) > 0 ? -Math.PI / 2 : Math.PI / 2; } }); } };
  // giants' farm
  DEF.farma = { name: 'FARMA GIGANTÓW', sky: '#9ad0f4', fog: '#c8e4f4', near: 80, far: 240, hemi: ['#fffaf0', '#5a7a3a', 2.0], sun: ['#fff4dc', 2.7], grav: 30, wx: 'leaves',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#6a4a2a'); g.fillStyle = '#5a3e22'; for (let y = 2; y < 64; y += 6) g.fillRect(0, y, 64, 2); speck(g, ['#7a5a34', '#4a7a2e'], 120); }) };
  BUILD.farma = (gr) => { const carrot = (x, z, s) => { const c = cone(gr, 2 * s, 9 * s, '#ff7a1a', x, 2 * s, z, 8); c.rotation.z = Math.PI + 0.15; for (let k = 0; k < 4; k++) { const l = box(gr, 0.5 * s, 4 * s, 0.3 * s, '#3a9a3a', x + (k - 1.5) * 0.6 * s, 7.5 * s, z); l.rotation.z = (k - 1.5) * 0.3; } };
    const tomato = (x, z, s) => { const t = sph(gr, 3 * s, '#e8301a', x, 2.6 * s, z, 2); t.scale.y = 0.85; for (let k = 0; k < 5; k++) { const l = box(gr, 1.6 * s, 0.2, 0.4 * s, '#3a8a2a', x + Math.cos(k * 1.26) * 0.7 * s, 5.2 * s, z + Math.sin(k * 1.26) * 0.7 * s); l.rotation.y = -k * 1.26; } };
    const pumpkin = (x, z, s) => { for (let k = 0; k < 6; k++) { const p = sph(gr, 2 * s, '#ff8a1a', x + Math.cos(k * 1.05) * 1 * s, 1.7 * s, z + Math.sin(k * 1.05) * 1 * s, 1); p.scale.y = 0.85; } box(gr, 0.5 * s, 1.4 * s, 0.5 * s, '#4a6a2a', x, 3.6 * s, z); };
    const cabbage = (x, z, s) => { for (let k = 0; k < 4; k++) sph(gr, (2.6 - k * 0.4) * s, ['#8ac85a', '#7ab84a', '#9ad86a', '#6aa83a'][k], x + R(-0.4, 0.4) * s, (1.8 + k * 0.3) * s, z, 1); };
    carrot(-40, -PZ - 10, 1.6); tomato(-16, -PZ - 9, 1.4); pumpkin(10, -PZ - 9, 1.5); cabbage(30, -PZ - 10, 1.4); carrot(48, -PZ - 12, 1.3); tomato(-PX - 12, -8, 1.1); pumpkin(PX + 12, 8, 1.1); cabbage(-PX - 12, 12, 1); carrot(PX + 12, -12, 1.1);
    const bx = -30, bz = -PZ - 30; box(gr, 16, 12, 12, '#b02a2a', bx, 6, bz); const r = add(gr, new THREE.CylinderGeometry(9.6, 9.6, 12.4, 3), M('#5a3e2a'), bx, 15, bz); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI / 6 * 3; box(gr, 6, 7, 0.2, '#ffffff', bx, 3.5, bz + 6.05); box(gr, 5, 6, 0.25, '#8a2020', bx, 3.3, bz + 6.1);
    for (const x of [-12, -6]) { cyl(gr, 3, 3, 22, '#c8ccd2', x, 11, -PZ - 32, 12); add(gr, new THREE.SphereGeometry(3, 12, 6, 0, 6.28, 0, Math.PI / 2), M('#a8acb2'), x, 22, -PZ - 32); }
    const tractor = new THREE.Group(); const tb = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 2.4), M('#2a8a3a')); tb.position.y = 2.2; const cb = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 2.2), M('#2a8a3a')); cb.position.set(-0.8, 4.2, 0); const gl = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.4, 2.3), lam({ color: '#cfe8ff' })); gl.position.set(-0.8, 4.4, 0); tractor.add(tb, cb, gl);
    const wheels = []; for (const [x, z, r2] of [[-1.4, -1.4, 1.6], [-1.4, 1.4, 1.6], [1.6, -1.3, 0.9], [1.6, 1.3, 0.9]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2, 0.7, 12), M('#1a1a1a')); w.rotation.x = Math.PI / 2; w.position.set(x, r2, z); tractor.add(w); wheels.push(w); } const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 6), M('#3a3a3e')); ex.position.set(1.2, 3.8, 0.6); tractor.add(ex); gr.add(tractor);
    tick(gr, (t, dt) => { tractor.position.set(loopX(-90 + t * 4, -90, 90), 0, -PZ - 18); wheels.forEach((w) => { w.rotation.y += dt * 3; }); });
    far(6, (x, z) => { const h = cyl(gr, 1.4, 1.4, 1.8, '#e8c868', x, 1.4, z, 12); h.rotation.x = Math.PI / 2; }, 13, 15); fence(gr, '#8a5a2e', -PZ - 5.5, -70, 70, 1.4); };
  // shopping-mall roof
  DEF.galeria = { name: 'DACH GALERII', sky: '#a8d0f0', fog: '#c8dcec', near: 90, far: 280, hemi: ['#f4faff', '#6a7a8a', 2.0], sun: ['#fff4dc', 2.6], grav: 30, wx: 'none',
    pal: pal('#eef0f2', '#f6f7f8', '#e8eaec', ['#dcdfe2', '#ffffff', '#d4d8dc', '#f2f4f6'], ['#d8dce0', '#ccd0d4', '#e0e4e8'], '#2a5ad0', { wornE: 'rgba(150,160,170,.3)', txt: 'rgba(42,90,208,.12)' }), track: () => tile((g) => { fill(g, '#b0b2b6'); speck(g, ['#9a9ca0', '#c4c6ca'], 300); }) };
  BUILD.galeria = (gr) => { const fans = []; const ac = (x, z) => { box(gr, 3.4, 2.4, 3.4, '#c8ccd2', x, 1.2, z); const f = cyl(gr, 1.2, 1.2, 0.2, '#5a5e64', x, 2.5, z, 10); const bl = box(gr, 2.2, 0.1, 0.4, '#3a3c40', x, 2.65, z); fans.push(bl); };
    far(9, (x, z) => ac(x, z), 6, 9); ends(6, (x, z) => ac(x, z), 7, 12); tick(gr, (t, dt) => fans.forEach((b) => { b.rotation.y += dt * 8; }));
    const ads = [['GALERIA', '#e8202a', '#ffffff'], ['-50%', '#ffd21a', '#e8202a'], ['KINO', '#141414', '#ffd21a'], ['MODA', '#e83a8a', '#ffffff'], ['SPORT', '#2a6ae8', '#ffffff']];
    far(5, (x, z, i) => { const [s, bg, fg] = ads[i]; for (const dx of [-4, 4]) box(gr, 0.4, 10, 0.4, '#5a5e64', x + dx, 5, z); sign(gr, s, bg, fg, x, 11, z, 12, 3.4, 0.9); }, 13, 14);
    far(4, (x, z) => { box(gr, 8, 1.4, 5, lam({ color: '#bfe0ff', emissive: '#6a9ac8', emissiveIntensity: 0.3 }), x, 0.7, z); }, 18, 22, -50, 50);
    for (let i = 0; i < 34; i++) { const a = R(-1.3, 1.3), d = R(70, 160), x = Math.sin(a) * d * 1.3, z = -PZ - Math.cos(a) * d * 0.7 - 10, w = R(8, 16), h = R(30, 100); building(gr, x, z, w, h, w, pick(['#9aa4b0', '#b8c0ca', '#7a8696', '#c8b8a0']), '#dfefff', '#4a5a6a', -60 + R(-10, 20), 0.15); }
    for (const s of [-1, 1]) { box(gr, 0.25, 0.25, 50, '#c8ccd2', s * (PX + 9), 1.2, 0); for (let z = -24; z <= 24; z += 3) box(gr, 0.25, 1.2, 0.25, '#c8ccd2', s * (PX + 9), 0.6, z); } };
  // japanese garden
  DEF.ogrod = { name: 'OGRÓD JAPOŃSKI', sky: '#cfe4f0', fog: '#dce8ee', near: 70, far: 220, hemi: ['#f8fcff', '#4a6a3a', 2.0], sun: ['#fff6e8', 2.4], grav: 30, wx: 'petals',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#d8d0bc'); g.fillStyle = '#c4bca6'; for (let y = 2; y < 64; y += 4) for (let x = 0; x < 64; x++) g.fillRect(x, y + Math.round(Math.sin(x / 7) * 1), 1, 1); }) };
  BUILD.ogrod = (gr) => { water(gr, -10, -PZ - 14, 40, 12, '#4a9ac0', 0.05); water(gr, PX + 18, 0, 12, 30, '#4a9ac0', 0.05);
    const br = add(gr, new THREE.TorusGeometry(6, 0.5, 6, 16, Math.PI), M('#d8301f'), -10, -1.2, -PZ - 14); br.scale.y = 0.45; for (let k = 0; k < 9; k++) { const a = Math.PI * (k + 0.5) / 9; box(gr, 1.2, 0.2, 3, '#8a2a20', -10 + Math.cos(a) * 6, -1.2 + Math.sin(a) * 6 * 0.45 + 0.4, -PZ - 14); }
    const koi = []; for (let k = 0; k < 6; k++) koi.push(box(gr, 0.9, 0.2, 0.4, pick(['#ff7a1a', '#ffffff', '#ffd21a']), 0, 0.12, 0)); tick(gr, (t) => koi.forEach((f, k) => { const a = t * 0.4 + k * 1.05; f.position.set(-10 + Math.cos(a) * (8 + k % 3 * 3), 0.12, -PZ - 14 + Math.sin(a) * 3); f.rotation.y = -a - Math.PI / 2; }));
    const pag = (x, z, s) => { for (let k = 0; k < 3; k++) { const w = (5 - k * 1.2) * s; box(gr, w * 0.7, 2.2 * s, w * 0.7, '#8a2a20', x, (1.1 + k * 3) * s, z); box(gr, w * 1.3, 0.5 * s, w * 1.3, '#2a2a32', x, (2.4 + k * 3) * s, z); } };
    pag(26, -PZ - 18, 1.5); pag(-44, -PZ - 20, 1.2);
    far(6, (x, z) => { for (let k = 0; k < 8; k++) cyl(gr, 0.18, 0.2, R(6, 12), '#6aa04a', x + R(-1.5, 1.5), 4, z + R(-1.5, 1.5), 5); }, 6, 9, -70, -30); ends(4, (x, z) => { for (let k = 0; k < 7; k++) cyl(gr, 0.18, 0.2, R(6, 11), '#6aa04a', x + R(-1.5, 1.5), 4, z + R(-1.5, 1.5), 5); });
    const maple = (x, z, s, c) => { cyl(gr, 0.3 * s, 0.5 * s, 4 * s, '#4a2a24', x, 2 * s, z, 6); for (let k = 0; k < 5; k++) sph(gr, R(1.4, 2.2) * s, c, x + R(-2, 2) * s, R(4, 6) * s, z + R(-1, 1) * s, 0); };
    far(6, (x, z) => maple(x, z, R(1, 1.3), pick(['#ffb6d0', '#e8402a', '#ff9ac0'])), 5, 10, 0, 70); ends(4, (x, z) => maple(x, z, 1, pick(['#e8402a', '#ffb6d0'])));
    far(6, (x, z) => { box(gr, 0.5, 1.6, 0.5, '#9a9a94', x, 0.8, z); box(gr, 1.4, 0.3, 1.4, '#9a9a94', x, 1.7, z); box(gr, 0.9, 0.8, 0.9, GL('#ffd890', 0.7), x, 2.25, z); box(gr, 1.6, 0.35, 1.6, '#8a8a84', x, 2.8, z); }, 4.5, 5.5, -50, 50);
    far(10, (x, z) => rock(gr, x, z, R(0.6, 1.4), '#8a8a84'), 7, 9); };
  // gladiators' arena: stone tiers, arches, torches, sand
  DEF.koloseum = { name: 'ARENA GLADIATORÓW', sky: '#f0d8a8', fog: '#ecd8b0', near: 80, far: 230, hemi: ['#fff4e0', '#8a6a3a', 2.0], sun: ['#ffe8c0', 2.7], grav: 30, wx: 'dust',
    pal: pal('#d8b878', '#dcbe80', '#d2b272', ['#c8a868', '#e8c890', '#bc9c5c', '#ecd09a'], ['#b8985a', '#a88a50', '#c4a466'], '#fff6e0'), track: () => tile((g) => { fill(g, '#d0b070'); speck(g, ['#c0a060', '#e0c080', '#b09050'], 300); }) };
  BUILD.koloseum = (gr) => { const stone = ['#c8b89a', '#bcac8e', '#d4c4a6'];
    const tiers = (len, cx, cz, ry) => { const g2 = new THREE.Group(); for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(len, 2, 2.6), M(stone[k % 3])); t.position.set(0, 1 + k * 2, -k * 2.6); g2.add(t); }
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 18, 2), M('#b8a888')); wall.position.set(0, 9, -17); g2.add(wall); for (let x = -len / 2 + 4; x < len / 2; x += 6) { for (let r = 0; r < 2; r++) { const a = new THREE.Mesh(new THREE.BoxGeometry(3, 4.4, 0.3), M('#5a4a34')); a.position.set(x, 4 + r * 7, -15.9); g2.add(a); } }
      g2.position.set(cx, 0, cz); g2.rotation.y = ry; gr.add(g2); };
    tiers(150, 0, -PZ - 7, 0); tiers(64, -PX - 11, 0, Math.PI / 2); tiers(64, PX + 11, 0, -Math.PI / 2);
    const torches = []; const torch = (x, z) => { cyl(gr, 0.15, 0.2, 3, '#5a3e24', x, 1.5, z, 5); box(gr, 0.6, 0.4, 0.6, '#3a3a3e', x, 3.1, z); const f = cone(gr, 0.45, 1.4, GL('#ff8a1a', 1.6), x, 3.9, z, 6); torches.push(f); };
    far(10, (x, z) => torch(x, z), 5, 5.2, -60, 60); for (const s of [-1, 1]) for (let z = -20; z <= 20; z += 10) torch(s * (PX + 9), z);
    tick(gr, (t) => torches.forEach((f, k) => { f.scale.set(1, 1 + Math.sin(t * 11 + k * 2) * 0.25, 1); }));
    far(6, (x, z) => { const b = box(gr, 2, 5, 0.05, '#a8201a', x, 18, z + 0.1); }, 23, 23.2, -60, 60); far(4, (x, z) => { cyl(gr, 0.9, 1, 12, '#e8dcc4', x, 6, z, 10); box(gr, 2.4, 0.8, 2.4, '#e8dcc4', x, 12.4, z); }, 4.6, 4.8, -40, 40); };
  // land of giants: the pitch on a rug between huge furniture and everyday things
  DEF.giganci = { name: 'KRAINA GIGANTÓW', sky: '#f2e6d4', fog: '#f2e8da', near: 90, far: 260, hemi: ['#fffaf0', '#8a6a4a', 2.0], sun: ['#fff6e4', 2.4], grav: 30, wx: 'none',
    pal: pal('#5a9a5a', '#62a262', '#549454', ['#4a8a4a', '#6aaa6a', '#448244', '#72b272'], ['#4a7a4a', '#447244', '#528252'], '#ffffff', { extra: (g, W, H) => { g.fillStyle = 'rgba(255,255,255,.08)'; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1); } }),
    track: () => tile((g) => { fill(g, '#b07a44'); g.fillStyle = 'rgba(70,40,10,.4)'; for (let y = 0; y < 64; y += 16) { g.fillRect(0, y, 64, 1); for (let x = (y * 2) % 48; x < 64; x += 48) g.fillRect(x, y, 1, 16); } }) };
  BUILD.giganci = (gr) => { const cx = -30, cz = -PZ - 26; for (const [dx, dz] of [[-8, -6], [8, -6], [-8, 6], [8, 6]]) box(gr, 1.6, 16, 1.6, '#8a5a2e', cx + dx, 8, cz + dz); box(gr, 18, 1.6, 14, '#a8703a', cx, 16.8, cz); box(gr, 18, 18, 1.6, '#a8703a', cx, 26, cz - 6.2);
    for (const [dx, dz] of [[-14, -8], [14, -8], [-14, 8], [14, 8]]) box(gr, 2, 30, 2, '#7a4a24', 30 + dx, 15, -PZ - 40 + dz); box(gr, 32, 2, 20, '#8a5a2e', 30, 31, -PZ - 40);
    const pen = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 26, 6), M('#ffd21a')); body.rotation.z = Math.PI / 2; const tip = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.6, 6), M('#e8c898')); tip.rotation.z = -Math.PI / 2; tip.position.x = 14.8; const lead = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 6), M('#2a2a2e')); lead.rotation.z = -Math.PI / 2; lead.position.x = 17; const er = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 8), M('#ff8aa8')); er.rotation.z = Math.PI / 2; er.position.x = -14; pen.add(body, tip, lead, er); pen.position.set(4, 1.2, -PZ - 9); pen.rotation.y = 0.1; gr.add(pen);
    cyl(gr, 4, 3.6, 9, '#e8ecf2', 46, 4.5, -PZ - 12, 16); add(gr, new THREE.TorusGeometry(2.6, 0.7, 6, 12), M('#e8ecf2'), 50, 5, -PZ - 12); cyl(gr, 3.8, 3.8, 0.2, '#6a3a1a', 46, 8.7, -PZ - 12, 16);
    const bk = ['#a8302a', '#2a5aa8', '#3a8a4a', '#c8a040']; for (let k = 0; k < 4; k++) { const b = box(gr, 12, 2.4, 8, bk[k], -PX - 16 + R(-1, 1), 1.2 + k * 2.4, -10 + R(-1, 1)); b.rotation.y = R(-0.3, 0.3); }
    cyl(gr, 3, 3, 9, '#e8202a', PX + 16, 4.5, 10, 16); cyl(gr, 3, 3, 0.4, '#c8ccd2', PX + 16, 9.1, 10, 16);
    const ac = new THREE.Group(); const cb = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2, 20), M('#e8361f')); cb.rotation.x = Math.PI / 2; ac.add(cb); const face = new THREE.Mesh(new THREE.CircleGeometry(3.4, 20), lam({ map: clockTex() })); face.position.z = 1.05; ac.add(face); for (const dx of [-2.6, 2.6]) { const bell = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 5, 0, 6.28, 0, Math.PI / 2), M('#c8ccd2')); bell.position.set(dx, 3.6, 0); bell.rotation.z = -dx * 0.15; ac.add(bell); }
    ac.position.set(PX + 16, 4.5, -12); ac.rotation.y = -0.6; gr.add(ac); tick(gr, (t) => { ac.rotation.z = Math.sin(t * 30) * (Math.sin(t * 0.5) > 0.8 ? 0.06 : 0); });
    far(4, (x, z) => { box(gr, 5, 0.6, 3, pick(['#e8202a', '#2a6ae8', '#ffd21a']), x, 0.3, z); for (let k = 0; k < 4; k++) cyl(gr, 0.5, 0.5, 0.4, pick(['#e8202a', '#2a6ae8']), x - 1.6 + k * 1.1, 0.8, z, 8); }, 6, 8, -50, 50); };
  // railway station: platforms, a train coming and going, a big clock
  DEF.dworzec = { name: 'DWORZEC KOLEJOWY', sky: '#a8b8c8', fog: '#b8c4d0', near: 70, far: 220, hemi: ['#eef4ff', '#5a5e66', 1.9], sun: ['#fff4e4', 2.3], grav: 30, wx: 'none',
    pal: pal('#7a5a3a', '#7e5e3e', '#765636', ['#6a4c30', '#8a6a46', '#5e442a', '#94744e'], ['#6a4a2e', '#5e4228', '#765434'], '#f4ecd6', { extra: (g, W, H, K, X, Z) => { const z0 = Z(-0.75), z1 = Z(0.75); g.fillStyle = '#9a8a76'; g.fillRect(0, Z(-1.6), W, Z(1.6) - Z(-1.6)); for (let i = 0; i < W * 3; i++) { g.fillStyle = pick(['#8a7a66', '#aa9a86', '#7a6a58']); g.fillRect(Math.random() * W | 0, Z(-1.6) + (Math.random() * (Z(1.6) - Z(-1.6)) | 0), 1, 1); }
      for (let x = 0; x < W; x += Math.round(K * 0.9)) { g.fillStyle = '#5a3e24'; g.fillRect(x, Z(-1.15), Math.max(2, K * 0.35 | 0), Z(1.15) - Z(-1.15)); } for (const z of [z0, z1]) { g.fillStyle = '#c8ccd2'; g.fillRect(0, z - 1, W, 2); g.fillStyle = '#6a6e74'; g.fillRect(0, z + 1, W, 1); } } }), track: () => tile((g) => { fill(g, '#8a8c90'); g.fillStyle = '#7a7c80'; for (let i = 0; i < 64; i += 8) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); } }) };
  BUILD.dworzec = (gr) => { box(gr, 170, 1.2, 4, '#a8a8a4', 0, 0.6, -PZ - 7); box(gr, 170, 0.1, 0.4, '#ffd21a', 0, 1.25, -PZ - 5.2);
    for (const z of [-PZ - 11, -PZ - 16]) { for (const dz of [-0.7, 0.7]) box(gr, 200, 0.2, 0.2, '#8a8e94', 0, 0.3, z + dz); for (let x = -100; x <= 100; x += 1.6) box(gr, 0.5, 0.15, 2.2, '#5a3e24', x, 0.12, z); }
    box(gr, 170, 1.2, 4, '#a8a8a4', 0, 0.6, -PZ - 20);
    const train = (n, col) => { const g2 = new THREE.Group(); const loco = new THREE.Mesh(new THREE.BoxGeometry(10, 4.4, 3.2), M(col)); loco.position.set(0, 2.8, 0); g2.add(loco); const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 3.1), lam({ color: '#cfe8ff', emissive: '#6a9ac8', emissiveIntensity: 0.3 })); cab.position.set(3.2, 3.8, 0); g2.add(cab);
      for (let k = 1; k <= n; k++) { const w = new THREE.Mesh(new THREE.BoxGeometry(11, 4, 3.1), M(k % 2 ? '#e8ecf2' : col)); w.position.set(-k * 11.6, 2.6, 0); g2.add(w); const win = new THREE.Mesh(new THREE.BoxGeometry(9, 1, 3.15), lam({ color: '#cfe8ff', emissive: '#6a9ac8', emissiveIntensity: 0.3 })); win.position.set(-k * 11.6, 3.2, 0); g2.add(win); } gr.add(g2); return g2; };
    const t1 = train(4, '#e8361f'), t2 = train(3, '#2a6ae8'); tick(gr, (t) => { const a = (t * 0.05) % 1, x = a < 0.4 ? -150 + a / 0.4 * 150 : a < 0.6 ? 0 : (a - 0.6) / 0.4 * 200; t1.position.set(x, 0.3, -PZ - 11); t2.position.set(loopX(140 - t * 12, -140, 140), 0.3, -PZ - 16); });
    for (let x = -70; x <= 70; x += 14) { cyl(gr, 0.4, 0.4, 14, '#3a5a4a', x, 7, -PZ - 7, 8); } box(gr, 150, 0.6, 18, '#5a6a6a', 0, 14.3, -PZ - 14); for (let x = -70; x <= 70; x += 14) { const a = add(gr, new THREE.TorusGeometry(9, 0.3, 4, 16, Math.PI), M('#3a5a4a'), x, 14.6, -PZ - 14); a.rotation.y = Math.PI / 2; }
    box(gr, 0.6, 5, 0.6, '#3a5a4a', 0, 19, -PZ - 7); clock(gr, 0, 23, -PZ - 6.6, 2.6); sign(gr, 'ODJAZDY', '#141414', '#ffd21a', -24, 10, -PZ - 6.7, 10, 2.4, 1); sign(gr, 'PERON 1', '#2a4ab0', '#ffffff', 24, 10, -PZ - 6.7, 8, 2, 0.8); };
  // lavender land: purple fields, windmills turning, little houses
  DEF.lawenda = { name: 'KRAINA LAWENDOWA', sky: '#c8d8f4', fog: '#dcd4ec', near: 80, far: 260, hemi: ['#fff8ff', '#6a5a8a', 2.0], sun: ['#fff4e8', 2.5], grav: 30, wx: 'petals',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#6a8a3a'); for (let y = 0; y < 64; y += 8) { g.fillStyle = '#8a5ac8'; g.fillRect(0, y, 64, 5); g.fillStyle = '#a87ae0'; for (let x = 0; x < 64; x += 2) g.fillRect(x, y + (x % 4 ? 0 : 1), 1, 1); } }) };
  BUILD.lawenda = (gr) => { const mill = (x, z, s) => { cyl(gr, 1.6 * s, 2.4 * s, 10 * s, '#f4ecd6', x, 5 * s, z, 10); cone(gr, 2 * s, 2.6 * s, '#8a3a2a', x, 11.3 * s, z, 10); const hub = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2 * s, 7 * s, 0.15), M('#f4ecd6')); b.position.y = 3.6 * s; const arm = new THREE.Group(); arm.add(b); arm.rotation.z = k * Math.PI / 2; hub.add(arm); }
      hub.position.set(x, 9 * s, z + 2 * s); gr.add(hub); tick(gr, (t, dt) => { hub.rotation.z -= dt * 0.8; }); };
    mill(-30, -PZ - 18, 1.4); mill(24, -PZ - 24, 1.2); mill(PX + 18, -8, 1);
    far(6, (x, z) => house(gr, x, z, 5, 3.6, 4, '#f4f0e8', pick(['#3a6ac8', '#e86a3a', '#8a3a2a'])), 9, 14); ends(4, (x, z) => house(gr, x, z, 4, 3, 4, '#f4f0e8', pick(['#3a6ac8', '#e86a3a'])), 10, 18);
    far(14, (x, z) => { const r = box(gr, 8, 0.8, 1.2, '#8a5ac8', x, 0.4, z); }, 5, 8); far(14, (x, z) => box(gr, 8, 0.8, 1.2, '#9a6ad8', x, 0.4, z), 16, 22);
    far(5, (x, z) => { cyl(gr, 0.3, 0.5, 5, '#5a3e24', x, 2.5, z, 6); sph(gr, 2.4, '#4a8a3a', x, 6, z, 0); }, 22, 30); for (const [x, z, r, h] of [[-40, -PZ - 70, 40, 24], [30, -PZ - 76, 44, 28]]) { const hl = sph(gr, r, '#7a9a5a', x, 0, z, 1); hl.scale.y = h / r; } };
  // giant insects: huge flowers, ants marching, cobwebs
  DEF.owady = { name: 'ŚWIAT OWADÓW', sky: '#b8e0f4', fog: '#cce8f0', near: 60, far: 220, hemi: ['#f8fff0', '#4a7a2a', 2.0], sun: ['#fff8e0', 2.5], grav: 30, wx: 'leaves',
    pal: grassPal(), track: () => tile((g) => { fill(g, '#4a7a2e'); for (let i = 0; i < 90; i++) { g.fillStyle = pick(['#3a6a22', '#5a8a3a', '#6a9a46']); g.fillRect(R(0, 64) | 0, R(0, 64) | 0, 1, R(2, 5) | 0); } }) };
  BUILD.owady = (gr) => { const flower = (x, z, s, c) => { cyl(gr, 0.4 * s, 0.5 * s, 12 * s, '#3a8a2a', x, 6 * s, z, 6); for (let k = 0; k < 7; k++) { const p = sph(gr, 2 * s, c, x + Math.cos(k * 0.9) * 2.6 * s, 12 * s, z + Math.sin(k * 0.9) * 1.2 * s + 1, 1); p.scale.set(1, 0.5, 1); } sph(gr, 1.6 * s, '#ffd21a', x, 12.2 * s, z + 1.4, 1);
      const lf = box(gr, 4 * s, 0.2, 1.6 * s, '#4aa03a', x + 2 * s, 5 * s, z); lf.rotation.z = -0.4; };
    far(7, (x, z) => flower(x, z, R(1, 1.6), pick(['#ff6a8a', '#ffffff', '#c86aff', '#ff9a3a', '#5ac8ff'])), 10, 18); ends(4, (x, z) => flower(x, z, R(0.8, 1.2), pick(['#ff6a8a', '#ffffff'])), 10, 20);
    const ant = () => { const g2 = new THREE.Group(), c = M('#2a1a14'); for (const [x, r] of [[-1.6, 1], [0, 0.7], [1.3, 0.8]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), c); b.position.set(x, 1.4, 0); b.scale.y = 0.8; g2.add(b); }
      const L = []; for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), c); l.position.set(-0.6 + (k % 3) * 0.6, 0.7, (k < 3 ? 1 : -1) * 0.7); l.rotation.x = (k < 3 ? 1 : -1) * 0.6; g2.add(l); L.push(l); } for (const dz of [-0.3, 0.3]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), c); a.position.set(2, 2.1, dz); a.rotation.z = -0.6; g2.add(a); } gr.add(g2); return [g2, L]; };
    for (let k = 0; k < 7; k++) { const [g2, L] = ant(); tick(gr, (t) => { g2.position.set(loopX(-80 + k * 6 + t * 3.5, -80, 80), 0, -PZ - 7 - (k % 2) * 0.6); L.forEach((l, i) => { l.rotation.z = Math.sin(t * 10 + i * 2) * 0.4; }); }); }
    const web = (x, y, z, r) => { const g2 = new THREE.Group(), m = BA('#ffffff', { transparent: true, opacity: 0.7 }); for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, r, 0.06), m); s.position.set(Math.cos(k * 0.785) * r / 2, Math.sin(k * 0.785) * r / 2, 0); s.rotation.z = k * 0.785 + Math.PI / 2; g2.add(s); } for (let i = 1; i <= 4; i++) g2.add(new THREE.Mesh(new THREE.TorusGeometry(r * i / 4.4, 0.04, 3, 8), m));
      g2.position.set(x, y, z); gr.add(g2); return g2; };
    web(-PX - 10, 8, -6, 6).rotation.y = Math.PI / 2; web(36, 10, -PZ - 10, 7);
    const lb = new THREE.Group(); const sh = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 6, 0, 6.28, 0, Math.PI / 2), M('#e8202a')); lb.add(sh); for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 8), M('#141414')); d.position.set(Math.cos(k) * 1.2, 1.5, Math.sin(k) * 1.2); lb.add(d); } const hd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), M('#141414')); hd.position.set(2, 0.5, 0); lb.add(hd); gr.add(lb);
    tick(gr, (t) => { lb.position.set(PX + 14, 0, Math.sin(t * 0.15) * 20); lb.rotation.y = Math.cos(t * 0.15) > 0 ? -Math.PI / 2 : Math.PI / 2; });
    for (let k = 0; k < 3; k++) { const bf = new THREE.Group(); const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.2), M(pick(['#ffb02a', '#5ac8ff', '#ff6ad8']))), w2 = w1.clone(); w1.position.x = -0.8; w2.position.x = 0.8; bf.add(w1, w2); gr.add(bf); const cx = R(-40, 40); tick(gr, (t) => { bf.position.set(cx + Math.sin(t * 0.3 + k) * 20, 8 + Math.sin(t * 1.3 + k) * 3, -PZ - 10 + Math.cos(t * 0.3 + k) * 4); w1.rotation.z = Math.sin(t * 12) * 0.8; w2.rotation.z = -w1.rotation.z; }); } };
  // underground city: metro tunnels, a train passing, neon
  DEF.metro = { name: 'PODZIEMNE MIASTO', sky: '#0a0a14', fog: '#14141e', near: 40, far: 160, hemi: ['#b8c8ff', '#14141e', 1.6], sun: ['#d8e0ff', 1.8], grav: 30, wx: 'none',
    pal: pal('#4a4e58', '#50545e', '#464a54', ['#3e424c', '#565a64', '#363a44', '#5e626c'], ['#3a3e48', '#323640', '#42464e'], '#ffd21a', { extra: plates(['#4a4e58', '#4e525c', '#464a54'], 'rgba(20,20,30,.5)') }),
    track: () => tile((g) => { fill(g, '#2a2c34'); g.fillStyle = '#ffffff'; for (let i = 0; i < 64; i += 8) for (let j = 0; j < 64; j += 8) { g.fillStyle = (i + j) % 16 ? '#e8ecf2' : '#c8ccd2'; g.fillRect(i, j, 7, 7); } }) };
  BUILD.metro = (gr) => { for (let x = -80; x <= 80; x += 8) { const a = add(gr, new THREE.TorusGeometry(10, 0.8, 4, 16, Math.PI), M('#5a5e68'), x, 0, -PZ - 12); a.rotation.y = 0; } box(gr, 170, 0.4, 20, '#3a3e48', 0, 10.4, -PZ - 12);
    for (const dz of [-0.7, 0.7]) box(gr, 200, 0.2, 0.2, '#8a8e94', 0, 0.3, -PZ - 12 + dz);
    const tr = new THREE.Group(); for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(11, 4, 3.2), M('#c8ccd2')); c.position.set(-k * 11.6, 2.4, 0); const w = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.2, 3.3), BA('#fff6c8')); w.position.set(-k * 11.6, 3, 0); const st = new THREE.Mesh(new THREE.BoxGeometry(11, 0.4, 3.3), M('#2a6ae8')); st.position.set(-k * 11.6, 1.2, 0); tr.add(c, w, st); } gr.add(tr);
    tick(gr, (t) => { const a = (t * 0.06) % 1; tr.position.set(a < 0.35 ? -170 + a / 0.35 * 170 : a < 0.6 ? 0 : (a - 0.6) / 0.4 * 230, 0, -PZ - 12); });
    const neon = ['#ff3ad8', '#5af0ff', '#ffe14a', '#3aff8a']; far(6, (x, z, i) => sign(gr, ['METRO', 'NEON', 'BAR', 'GRY', 'KINO', 'PIZZA'][i], '#0a0a14', neon[i % 4], x, 6, z, 7, 1.8, 1.4), 4.6, 4.8, -60, 60);
    for (let x = -60; x <= 60; x += 12) { box(gr, 1.4, 10, 1.4, '#d8dce2', x, 5, -PZ - 5); box(gr, 1.5, 0.3, 1.5, GL(neon[(x / 12 + 5) % 4 | 0], 1.4), x, 9.6, -PZ - 5); }
    for (const s of [-1, 1]) { box(gr, 1, 12, 70, '#3a3e48', s * (PX + 18), 6, 0); for (let z = -24; z <= 24; z += 12) { box(gr, 2.4, 4, 1.6, GL(pick(neon), 0.6), s * (PX + 16), 2, z); } } };
  // giant mushrooms
  DEF.grzyby = { name: 'KRAINA GRZYBÓW', sky: '#e8c8f4', fog: '#ecd8f4', near: 60, far: 220, hemi: ['#fff4ff', '#6a4a8a', 2.0], sun: ['#fff0f8', 2.4], grav: 30, wx: 'sparkle',
    pal: pal('#5aa05a', '#62aa62', '#549854', ['#4a904a', '#6ab46a', '#448a44', '#72bc72'], ['#6a8a5a', '#5e7e50', '#76966a'], '#fffaf0'), track: () => tile((g) => { fill(g, '#4a7a4a'); speck(g, ['#ff8ad8', '#ffd24a', '#5ae0ff', '#3a6a3a'], 160); }) };
  BUILD.grzyby = (gr) => { const caps = ['#e8402a', '#ff8ad8', '#8a5aff', '#ffb02a', '#3ac8b0'];
    const big = (x, z, s) => { cyl(gr, 0.8 * s, 1.1 * s, 7 * s, '#f4ecdc', x, 3.5 * s, z, 8); const c = pick(caps); add(gr, new THREE.SphereGeometry(4 * s, 14, 6, 0, 6.28, 0, Math.PI / 2), M(c), x, 6.8 * s, z).scale.y = 0.7; for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3; sph(gr, 0.5 * s, '#ffffff', x + Math.cos(a) * 2.6 * s, 8.4 * s, z + Math.sin(a) * 2.6 * s, 0); } };
    far(8, (x, z) => big(x, z, R(1.2, 2.2)), 10, 20); ends(6, (x, z) => big(x, z, R(1, 1.6)), 10, 20); far(16, (x, z) => big(x, z, R(0.25, 0.5)), 4.5, 7);
    const plant = (x, z) => { for (let k = 0; k < 4; k++) { const l = box(gr, 0.3, R(2, 4), 0.8, pick(['#ff6ad8', '#5ae0ff', '#ffd24a', '#8aff6a']), x + R(-0.8, 0.8), 1.4, z + R(-0.4, 0.4)); l.rotation.z = R(-0.5, 0.5); } };
    far(14, (x, z) => plant(x, z), 6, 10); ends(8, (x, z) => plant(x, z));
    const spores = []; for (let k = 0; k < 20; k++) spores.push([sph(gr, 0.2, BA(pick(['#ffffff', '#ffd8ff', '#d8ffff'])), 0, 0, 0, 0), R(-60, 60), -PZ - R(5, 20), R(0, 20)]); tick(gr, (t) => spores.forEach(([s, x, z, o]) => s.position.set(x + Math.sin(t * 0.5 + o) * 2, (t * 0.8 + o) % 16, z))); };
  // the pitch on a great bridge: towers, cables, a deep gorge, cars passing
  DEF.most = { name: 'WIELKI MOST', sky: '#9ac8f0', fog: '#c0d8ec', near: 90, far: 280, hemi: ['#f4faff', '#5a6a7a', 2.0], sun: ['#fff4e0', 2.6], grav: 30, wx: 'none',
    pal: pal('#4a4c52', '#4a4c52', '#4a4c52', [], ['#3e4046', '#44464c', '#525458'], 'rgba(248,248,240,.88)', { txt: 'rgba(255,255,255,0)', blocks: (g, W, H, K, X, Z) => { g.fillStyle = '#4a4c52'; g.fillRect(0, 0, W, H); for (let i = 0; i < W * H / 14; i++) { g.fillStyle = pick(['#3e4046', '#56585e', '#44464c', '#606268']); g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1); }
      for (let i = 0; i < 26; i++) { let x = Math.random() * W, y = Math.random() * H; g.fillStyle = 'rgba(30,30,34,.6)'; for (let k = 0; k < 14; k++) { x += R(-2, 3); y += R(-2, 2); g.fillRect(x | 0, y | 0, 1, 1); } }
      g.fillStyle = 'rgba(240,240,230,.25)'; for (let i = 0; i < 40; i++) { const x = Math.random() * W, y = Math.random() * H; for (let k = 0; k < 6; k++) g.fillRect((x + k * 2) | 0, (y + Math.sin(k + i) * 2) | 0, 2, 1); } } }), track: () => tile((g) => { const gr2 = g.createLinearGradient(0, 0, 0, 64); fill(g, '#4a5a6a'); speck(g, ['#3a4a5a', '#5a6a7a', '#6a8aa0'], 200); g.fillStyle = 'rgba(200,220,240,.25)'; g.fillRect(0, 20, 64, 4); }) };
  BUILD.most = (gr) => { const deck = M('#5a5e66'); box(gr, 300, 1, 2 * PZ + 18, deck, 0, -0.55, 0); for (const s of [-1, 1]) { box(gr, 300, 1.2, 0.3, '#c8302a', 0, 0.8, s * (PZ + 9)); for (let x = -150; x <= 150; x += 4) box(gr, 0.25, 1.2, 0.25, '#c8302a', x, 0.4, s * (PZ + 9)); }
    box(gr, 300, 2.4, 2 * PZ + 16, '#3a3e46', 0, -2.4, 0);
    for (const x of [-60, 60]) { for (const s of [-1, 1]) box(gr, 3, 60, 3, '#c8302a', x, 18, s * (PZ + 10)); for (const y of [28, 44]) box(gr, 3, 3, 2 * PZ + 22, '#c8302a', x, y, 0);
      for (let k = 1; k <= 8; k++) for (const dir of [-1, 1]) for (const s of [-1, 1]) { const x2 = x + dir * k * 7, A = new THREE.Vector3(x, 46, s * (PZ + 10)), B = new THREE.Vector3(x2, 1, s * (PZ + 10)); const c = box(gr, 0.15, 0.15, A.distanceTo(B), '#e8ecf2', (A.x + B.x) / 2, (A.y + B.y) / 2, A.z); c.lookAt(B.x, B.y, B.z); } }
    const gorge = add(gr, new THREE.PlaneGeometry(400, 300), M('#2a3a3a'), 0, -60, 0); gorge.rotation.x = -Math.PI / 2; const river = add(gr, new THREE.PlaneGeometry(400, 14), M('#3a8ac8'), 0, -59.8, -30); river.rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const c = box(gr, R(30, 60), R(40, 70), 30, pick(['#7a6a5a', '#6a5a4a', '#8a7a6a']), s * R(120, 180), -40 + R(0, 20), -60 + k * 24); }
    for (let k = 0; k < 6; k++) { const car = box(gr, 3.6, 1.6, 1.8, pick(['#ffd21a', '#e8202a', '#2a6ae8', '#e8ecf2']), 0, 0.8, 0); const lane = -PZ - (k % 2 ? 5.5 : 7.5), dir = k % 2 ? 1 : -1, x0 = R(-150, 150); tick(gr, (t) => { car.position.set(loopX(x0 + t * 14 * dir, -150, 150), 0.8, lane); }); }
    for (let i = 0; i < 6; i++) cloud(gr, R(-120, 120), R(-20, 40), -PZ - R(60, 140), R(1.5, 3)); };
  // clockwork world
  DEF.zegary = { name: 'ŚWIAT ZEGARÓW', sky: '#3a2a1a', fog: '#4a3624', near: 60, far: 200, hemi: ['#ffe8c0', '#4a2a10', 1.8], sun: ['#ffd8a0', 2.1], grav: 30, wx: 'none',
    pal: pal('#4a7a4a', '#4e824e', '#467446', ['#3e6a3e', '#568a56', '#3a643a', '#5e925e'], ['#6a5a3a', '#5a4a30', '#7a6a44'], '#e8c050'), track: () => tile((g) => { fill(g, '#6a4a2a'); for (let i = 0; i < 64; i += 16) { g.fillStyle = '#b08a3a'; g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); } speck(g, ['#8a6a3a', '#4a3018'], 100); }) };
  BUILD.zegary = (gr) => { const gs = []; for (const [x, y, z, r, c, sp] of [[-40, 14, -PZ - 18, 9, '#c8a040', 0.3], [-24, 8, -PZ - 14, 5, '#b87a3a', -0.55], [-10, 20, -PZ - 22, 8, '#d8b050', 0.35], [14, 10, -PZ - 16, 6, '#a8703a', -0.45], [34, 16, -PZ - 20, 10, '#c8a040', 0.28], [52, 7, -PZ - 14, 4.5, '#b87a3a', -0.6], [-PX - 14, 8, -6, 6, '#c8a040', 0.4], [PX + 14, 9, 6, 7, '#b87a3a', -0.35]])
      { const g2 = gear(gr, x, y, z, r, c); if (Math.abs(x) > PX + 10) g2.rotation.y = Math.PI / 2; gs.push([g2, sp]); } tick(gr, (t, dt) => gs.forEach(([g2, sp]) => { g2.rotation.z += dt * sp; }));
    clock(gr, 0, 30, -PZ - 26, 9, 0, 8); clock(gr, -56, 22, -PZ - 24, 5, 0, 4); clock(gr, PX + 18, 14, -14, 4, -Math.PI / 2, 6);
    const pend = (x, z, L) => { const p = new THREE.Group(); const rod = new THREE.Mesh(new THREE.BoxGeometry(0.3, L, 0.3), M('#c8a040')); rod.position.y = -L / 2; const bob = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.5, 16), M('#d8b050')); bob.rotation.x = Math.PI / 2; bob.position.y = -L; p.add(rod, bob); p.position.set(x, L + 2, z); gr.add(p); tick(gr, (t) => { p.rotation.z = Math.sin(t * Math.sqrt(9.8 / L) * 1.4) * 0.45; }); box(gr, 4, 0.6, 1, '#6a4a2a', x, L + 2.2, z); };
    pend(-14, -PZ - 8, 14); pend(22, -PZ - 8, 12);
    far(6, (x, z) => { const sp = new THREE.Group(); for (let k = 0; k < 10; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.12, 4, 10), M('#c8ccd2')); r.rotation.x = Math.PI / 2; r.position.y = 0.3 + k * 0.35; sp.add(r); } sp.position.set(x, 0, z); gr.add(sp); tick(gr, (t) => { sp.scale.y = 1 + Math.sin(t * 3 + x) * 0.25; }); }, 4.8, 5.4, -50, 50); };
  // great graveyard
  DEF.cmentarz = { name: 'WIELKI CMENTARZ', sky: '#5a6070', fog: '#7a8090', near: 25, far: 140, hemi: ['#d8dce8', '#2a2a30', 1.6], sun: ['#e0e4f0', 1.6], grav: 30, wx: 'leaves',
    pal: pal('#4a5a44', '#50604a', '#465640', ['#3e4e38', '#566650', '#364632', '#5e6e58'], ['#4a4034', '#3e362c', '#56483a'], '#e8e4d8'), track: () => tile((g) => { fill(g, '#5a5a52'); for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 * 4; x < 64; x += 8) { g.fillStyle = pick(['#6a6a62', '#626258', '#727268']); g.fillRect(x + 1, y + 1, 6, 6); } }) };
  BUILD.cmentarz = (gr) => { const grave = (x, z) => { const k = Math.random(); if (k < 0.4) { const s = box(gr, 1.4, 1.8, 0.4, pick(['#8a8a90', '#7a7a80', '#9a9aa0']), x, 0.9, z); s.rotation.z = R(-0.12, 0.12); sph(gr, 0.7, '#8a8a90', x, 1.8, z, 0).scale.z = 0.3; } else if (k < 0.7) { box(gr, 0.3, 2.4, 0.3, '#7a7a80', x, 1.2, z); box(gr, 1.4, 0.3, 0.3, '#7a7a80', x, 1.8, z); } else { box(gr, 1.8, 0.5, 3, '#6a6a70', x, 0.25, z); box(gr, 1.4, 1.4, 0.3, '#8a8a90', x, 1.2, z - 1.4); } };
    far(30, (x, z) => grave(x, z), 5, 14); ends(14, (x, z) => grave(x, z));
    const crypt = (x, z) => { box(gr, 8, 6, 6, '#8a8a84', x, 3, z); for (const dx of [-2.8, 2.8]) cyl(gr, 0.4, 0.4, 5, '#a8a8a0', x + dx, 2.5, z + 3.4, 8); const r = add(gr, new THREE.CylinderGeometry(4.6, 4.6, 7, 3), M('#6a6a64'), x, 7.2, z); r.rotation.set(Math.PI / 2, 0, Math.PI / 2); r.scale.set(0.6, 1, 1); box(gr, 2.4, 3.6, 0.2, '#2a2a2e', x, 1.8, z + 3.05); };
    crypt(-30, -PZ - 18); crypt(18, -PZ - 20); crypt(-PX - 14, 4);
    const angel = (x, z) => { box(gr, 2, 1, 2, '#9a9a94', x, 0.5, z); box(gr, 1, 3, 0.8, '#b8b8b0', x, 2.5, z); sph(gr, 0.5, '#b8b8b0', x, 4.4, z, 1); for (const dx of [-1, 1]) { const w = box(gr, 1.6, 2.4, 0.15, '#b8b8b0', x + dx * 1, 3, z - 0.3); w.rotation.z = dx * 0.4; } };
    angel(-8, -PZ - 9); angel(36, -PZ - 10); angel(PX + 12, -10);
    const lamps = []; far(8, (x, z) => { box(gr, 0.25, 4, 0.25, '#2a2a2e', x, 2, z); lamps.push(box(gr, 0.8, 1, 0.8, GL('#ffc860', 1.3), x, 4.4, z)); }, 4.6, 5); tick(gr, (t) => lamps.forEach((l, k) => { l.material.emissiveIntensity = 1.1 + Math.sin(t * 6 + k * 2.3) * 0.3; }));
    fence(gr, '#2a2a2e', -PZ - 5.6, -70, 70, 1.8); far(8, (x, z) => { const c = cone(gr, 1.2, 9, '#2a3a2a', x, 4.5, z, 7); }, 16, 22); };
  // aquarium: glass tunnel, sharks, rays, fish
  DEF.akwarium = { name: 'AKWARIUM', sky: '#0a3a6a', fog: '#0e4a80', near: 35, far: 150, hemi: ['#9ae8ff', '#0a2a4a', 1.8], sun: ['#c8f4ff', 1.7], grav: 30, wx: 'bubbles',
    pal: pal('#3a7a8a', '#3e8292', '#367484', ['#2e6a7a', '#468a9a', '#2a6070', '#4e92a2'], ['#2e6a7a', '#2a6474', '#347282'], '#ffffff'), track: () => tile((g) => { fill(g, '#c8c49a'); speck(g, ['#b0ac84', '#dcd8b0', '#f4d8c8'], 220); }) };
  BUILD.akwarium = (gr) => { const glass = new THREE.MeshLambertMaterial({ color: '#8ad8ff', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    add(gr, new THREE.PlaneGeometry(170, 30), glass, 0, 15, -PZ - 6); for (const s of [-1, 1]) { const p = add(gr, new THREE.PlaneGeometry(70, 30), glass, s * (PX + 8), 15, 0); p.rotation.y = Math.PI / 2; }
    for (let x = -80; x <= 80; x += 16) box(gr, 0.6, 30, 0.6, '#5a6a7a', x, 15, -PZ - 6);
    const tun = add(gr, new THREE.CylinderGeometry(8, 8, 60, 16, 1, true, 0, Math.PI), glass, 30, 0, -PZ - 24); tun.rotation.z = Math.PI / 2; tun.rotation.y = 0.3;
    const coral = ['#ff6a8a', '#ff9a4a', '#c86aff', '#ffd24a', '#4ae0c8']; far(14, (x, z) => { for (let k = 0; k < 3; k++) sph(gr, R(0.8, 1.6), pick(coral), x + R(-1.5, 1.5), R(0.6, 2), z + R(-1, 1), 1); }, 8, 16);
    const shark = (s) => { const g2 = new THREE.Group(), c = M('#6a7a8a'); const b = new THREE.Mesh(new THREE.ConeGeometry(1.4 * s, 9 * s, 8), c); b.rotation.z = -Math.PI / 2; g2.add(b); const tl = new THREE.Mesh(new THREE.ConeGeometry(1 * s, 3 * s, 4), c); tl.rotation.z = Math.PI / 2; tl.position.x = -5.4 * s; g2.add(tl); const fin = new THREE.Mesh(new THREE.ConeGeometry(0.8 * s, 2.4 * s, 4), c); fin.position.set(0, 1.8 * s, 0); g2.add(fin);
      const tailF = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 3.4 * s, 0.2 * s), c); tailF.position.x = -6.6 * s; g2.add(tailF); const belly = new THREE.Mesh(new THREE.BoxGeometry(5 * s, 0.5 * s, 1.4 * s), M('#e8ecf2')); belly.position.set(0.6 * s, -0.9 * s, 0); g2.add(belly); gr.add(g2); return [g2, tailF]; };
    for (let k = 0; k < 3; k++) { const [g2, tf] = shark(R(0.9, 1.3)), cx = R(-40, 40), cz = -PZ - R(14, 26), cy = R(5, 14), r = R(18, 30), sp = R(0.08, 0.14) * (k % 2 ? 1 : -1); tick(gr, (t) => { const a = t * sp + k * 2; g2.position.set(cx + Math.cos(a) * r, cy + Math.sin(t * 0.4 + k) * 1.5, cz + Math.sin(a) * 6); g2.rotation.y = -a + (sp > 0 ? -Math.PI / 2 : Math.PI / 2); tf.rotation.y = Math.sin(t * 4 + k) * 0.5; }); }
    for (let k = 0; k < 3; k++) { const ray = new THREE.Group(); const b = new THREE.Mesh(new THREE.OctahedronGeometry(3, 0), M('#4a5a6a')); b.scale.set(1, 0.15, 0.8); ray.add(b); const tl = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 0.15), M('#4a5a6a')); tl.position.x = -4.6; ray.add(tl); gr.add(ray);
      const cx = R(-50, 50), cz = -PZ - R(10, 22); tick(gr, (t) => { const a = t * 0.1 + k * 2.1; ray.position.set(cx + Math.cos(a) * 20, 3 + k * 4 + Math.sin(t * 0.8) * 1, cz); ray.rotation.y = Math.sin(a) > 0 ? Math.PI : 0; b.rotation.x = Math.sin(t * 2 + k) * 0.25; }); }
    for (let s = 0; s < 4; s++) { const g2 = new THREE.Group(), col = pick(['#ffb02a', '#ffd24a', '#5ac8ff', '#ff6a4a']); for (let k = 0; k < 14; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.18), M(col)); f.position.set(R(-3, 3), R(-1.5, 1.5), R(-2, 2)); g2.add(f); }
      gr.add(g2); const cx = R(-40, 40), cy = R(6, 16), cz = -PZ - R(10, 22), r = R(10, 20), sp = R(0.15, 0.3) * (s % 2 ? 1 : -1); tick(gr, (t) => { const a = t * sp + s * 2; g2.position.set(cx + Math.cos(a) * r, cy + Math.sin(t * 0.7 + s) * 1.5, cz + Math.sin(a) * 4); g2.rotation.y = -a + (sp > 0 ? -Math.PI / 2 : Math.PI / 2); }); } };
  // a colourful platform-game world of our own: rounded striped hills, floating brick platforms, spinning coins and stars
  DEF.platformy = { name: 'KOLOROWA KRAINA', sky: '#6ab8ff', fog: '#a8d8ff', near: 90, far: 240, hemi: ['#ffffff', '#5a9a4a', 2.1], sun: ['#fffbe8', 2.7], grav: 26, wx: 'none',
    pal: pal('#5ac84a', '#64d254', '#52be42', ['#4ab83a', '#6ade5a', '#44ae36', '#7ae66a'], ['#a8783a', '#987032', '#b88444'], '#ffffff'), track: () => tile((g) => { fill(g, '#c8783a'); g.fillStyle = '#a85a28'; for (let y = 0; y < 64; y += 8) { g.fillRect(0, y, 64, 1); for (let x = (y / 8) % 2 * 8; x < 64; x += 16) g.fillRect(x, y, 1, 8); } }) };
  BUILD.platformy = (gr) => { const hill = (x, z, r, c, c2) => { const h = add(gr, new THREE.SphereGeometry(r, 16, 8, 0, 6.28, 0, Math.PI / 2), M(c), x, 0, z); h.scale.y = 1.2; const band = add(gr, new THREE.TorusGeometry(r * 0.72, r * 0.08, 4, 16), M(c2), x, r * 0.75, z); band.rotation.x = Math.PI / 2; };
    far(6, (x, z) => hill(x, z, R(8, 14), pick(['#5ad04a', '#3ab83a', '#8ae06a']), '#2a8a2a'), 20, 30); ends(4, (x, z) => hill(x, z, R(6, 9), pick(['#5ad04a', '#8ae06a']), '#2a8a2a'), 16, 24);
    const brick = tex(16, 16, (g) => { g.fillStyle = '#d8783a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#7a3a18'; for (const y of [0, 8]) g.fillRect(0, y, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); g.fillStyle = '#f4a868'; g.fillRect(1, 1, 6, 1); g.fillRect(9, 9, 6, 1); });
    const plat = (x, y, z, n) => { for (let k = 0; k < n; k++) add(gr, new THREE.BoxGeometry(2, 2, 2), lam({ map: brick }), x + k * 2, y, z); };
    plat(-40, 8, -PZ - 10, 5); plat(-14, 12, -PZ - 12, 4); plat(12, 9, -PZ - 10, 6); plat(40, 13, -PZ - 14, 4); plat(-PX - 14, 6, -6, 3); plat(PX + 10, 7, 4, 3);
    const coins = []; for (const [x, y, z] of [[-36, 11, -PZ - 10], [-32, 11, -PZ - 10], [-11, 15, -PZ - 12], [-7, 15, -PZ - 12], [16, 12, -PZ - 10], [20, 12, -PZ - 10], [24, 12, -PZ - 10], [43, 16, -PZ - 14]]) { const c = add(gr, new THREE.CylinderGeometry(0.8, 0.8, 0.2, 14), GL('#ffd21a', 0.6), x, y, z); c.rotation.x = Math.PI / 2; coins.push(c); }
    tick(gr, (t) => coins.forEach((c, k) => { c.rotation.z = t * 3 + k; c.position.y += Math.sin(t * 3 + k) * 0.01; }));
    const star = (x, y, z) => { const s = new THREE.Group(); for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.6, 4), GL('#ffe14a', 0.8)); p.position.set(Math.cos(k * 1.257 + 1.57) * 0.8, Math.sin(k * 1.257 + 1.57) * 0.8, 0); p.rotation.z = k * 1.257; s.add(p); } s.position.set(x, y, z); gr.add(s); tick(gr, (t) => { s.rotation.y = t * 2; s.position.y = y + Math.sin(t * 2) * 0.6; }); };
    star(-28, 16, -PZ - 14); star(30, 18, -PZ - 16);
    const spring = (x, z) => { const top = box(gr, 1.6, 0.4, 1.6, '#e8202a', x, 1.4, z); const sp = new THREE.Group(); for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 4, 10), M('#c8ccd2')); r.rotation.x = Math.PI / 2; r.position.y = 0.2 + k * 0.3; sp.add(r); } sp.position.set(x, 0, z); gr.add(sp); tick(gr, (t) => { const k = 1 + Math.abs(Math.sin(t * 3 + x)) * 0.6; sp.scale.y = k; top.position.y = 1.2 * k + 0.2; }); };
    far(4, (x, z) => spring(x, z), 5, 6, -50, 50);
    for (let i = 0; i < 8; i++) { const c = cloud(gr, R(-100, 100), R(24, 40), -PZ - R(30, 90), R(1.5, 2.5)); tick(gr, (t, dt) => { c.position.x += dt; if (c.position.x > 110) c.position.x = -110; }); }
    far(10, (x, z) => { cyl(gr, 0.12, 0.12, 2, '#3a8a2a', x, 1, z, 5); const f = sph(gr, 0.6, pick(['#ff3a5a', '#ffd21a', '#ffffff']), x, 2.2, z, 0); }, 4.6, 6); };
  // beach at sunset: the ocean behind, a low sun, palms, umbrellas, waves
  DEF.plaza = { name: 'PLAŻA', sky: '#ff9a6a', fog: '#ffb88a', near: 80, far: 260, hemi: ['#ffe0c8', '#8a5a6a', 1.9], sun: ['#ffb070', 2.4], grav: 30, wx: 'none',
    pal: pal('#e8d098', '#ecd6a0', '#e2c88e', ['#dcc084', '#f4e0b0', '#d4b878', '#f8e8c0'], ['#d0b070', '#c4a464', '#dcc084'], '#ffffff'), track: () => tile((g) => { fill(g, '#f0d8a0'); speck(g, ['#e0c48a', '#f8e8c0', '#d8b880', '#ffffff'], 300); }) };
  BUILD.plaza = (gr) => { const sea = water(gr, 0, -PZ - 80, 500, 120, '#2a6ab0', 0.04); const shore = water(gr, 0, -PZ - 21, 500, 3, '#e8f4ff', 0.05);
    tick(gr, (t) => { shore.position.z = -PZ - 21 + Math.sin(t * 0.8) * 1.2; shore.scale.y = 1 + Math.sin(t * 0.8) * 0.3; });
    const sun = add(gr, new THREE.CircleGeometry(26, 24), BA('#ffd27a', { fog: false }), 0, 18, -230); const glow = add(gr, new THREE.CircleGeometry(40, 24), BA('#ffb06a', { fog: false, transparent: true, opacity: 0.4 }), 0, 18, -231);
    const path = add(gr, new THREE.PlaneGeometry(26, 110), BA('#ffc878', { transparent: true, opacity: 0.45 }), 0, 0.06, -PZ - 80); path.rotation.x = -Math.PI / 2;
    far(8, (x, z) => palm(gr, x, z, R(1, 1.4)), 6, 14); ends(6, (x, z) => palm(gr, x, z, R(0.9, 1.3)));
    const umb = (x, z) => { cyl(gr, 0.1, 0.1, 4, '#ffffff', x, 2, z, 5); const t2 = stripes(pick(['#e8202a', '#2a6ae8', '#ffd21a', '#3ab83a']), '#ffffff', 8); t2.repeat.set(4, 1); cone(gr, 2.4, 1.2, lam({ map: t2 }), x, 4.3, z, 12);
      const tw = box(gr, 1.2, 0.05, 2.4, pick(['#ff6a8a', '#5ac8ff', '#ffd21a']), x + 1.6, 0.06, z + 0.6); };
    far(6, (x, z) => umb(x, z), 5, 8, -55, 55); ends(4, (x, z) => umb(x, z), 7, 14);
    for (let k = 0; k < 3; k++) { const boat = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 2), M('#f4ecd6')); boat.add(h); const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6, 0.2), M('#8a6a3a')); m.position.y = 3; boat.add(m); const s = new THREE.Mesh(new THREE.BoxGeometry(3, 4.6, 0.1), M('#ffffff')); s.position.set(1.4, 3.4, 0); boat.add(s); gr.add(boat);
      const z = -PZ - R(40, 70), x0 = R(-80, 80); tick(gr, (t) => { boat.position.set(loopX(x0 + t * 1.5, -110, 110), 0.4 + Math.sin(t + k) * 0.2, z); boat.rotation.z = Math.sin(t * 0.9 + k) * 0.05; }); }
    for (let k = 0; k < 5; k++) { const b = new THREE.Group(); const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.4), BA('#3a2a3a')), w2 = w1.clone(); w1.position.x = -0.55; w2.position.x = 0.55; b.add(w1, w2); gr.add(b); const cx = R(-40, 40), r = R(8, 16);
      tick(gr, (t) => { const a = t * 0.4 + k; b.position.set(cx + Math.cos(a) * r, 16 + Math.sin(t + k) * 2, -PZ - 30 + Math.sin(a) * 6); w1.rotation.z = Math.sin(t * 6 + k) * 0.5; w2.rotation.z = -w1.rotation.z; }); }
    far(6, (x, z) => { const c = box(gr, 1.6, 0.8, 1.6, pick(['#ff6a1a', '#ffd21a']), x, 0.4, z); }, 4.5, 5, -30, 30); };
  // construction site: sandy pitch, diggers, a tower crane, mixers, scaffolding, mounds behind
  DEF.budowa = { name: 'PLAC BUDOWY', sky: '#a8c8e8', fog: '#c8d4e0', near: 80, far: 240, hemi: ['#f4f8ff', '#8a7a5a', 2.0], sun: ['#fff4dc', 2.6], grav: 30, wx: 'dust',
    pal: pal('#e4cc94', '#e8d29c', '#dec68a', ['#d4bc84', '#f0dcac', '#ccb27a', '#f4e4b8'], ['#c8a874', '#b89a68', '#d4b47e'], '#ffffff'), track: () => tile((g) => { fill(g, '#b8945e'); speck(g, ['#a8844e', '#c8a46e', '#8a7a6a', '#d8b47e'], 300); }) };
  BUILD.budowa = (gr) => { const Y = '#ffb81a';
    for (const [x, z, r, h] of [[-40, -PZ - 34, 22, 14], [0, -PZ - 44, 28, 18], [44, -PZ - 36, 24, 15], [-PX - 30, 0, 16, 10], [PX + 30, 4, 16, 11]]) { const m = sph(gr, r, pick(['#a8844e', '#b8945e', '#9a7a48']), x, 0, z, 1); m.scale.y = h / r; }
    const digger = (x, z, ry) => { const g2 = new THREE.Group(); const tr = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 3.4), M('#2a2a2e')); tr.position.y = 0.6; const body = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3), M(Y)); body.position.y = 2.4; const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2, 2), lam({ color: '#cfe8ff', emissive: '#4a7aa0', emissiveIntensity: 0.3 })); cab.position.set(1, 4.4, 0.4); g2.add(tr, body, cab);
      const arm = new THREE.Group(); const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 0.8), M(Y)); a1.position.y = 3; arm.add(a1); const fore = new THREE.Group(); fore.position.y = 6; const a2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), M(Y)); a2.position.y = -2; fore.add(a2); const bk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), M('#3a3a3e')); bk.position.y = -4.2; fore.add(bk); arm.add(fore);
      arm.position.set(-1.6, 3, 0); g2.add(arm); g2.position.set(x, 0, z); g2.rotation.y = ry; gr.add(g2); tick(gr, (t) => { const s = Math.sin(t * 0.8 + x); arm.rotation.z = 0.7 + s * 0.25; fore.rotation.z = -1.6 + s * 0.4; g2.rotation.y = ry + Math.sin(t * 0.3 + x) * 0.4; }); };
    digger(-30, -PZ - 12, 0.3); digger(PX + 14, 10, Math.PI / 2);
    const cx = 20, cz = -PZ - 20; for (let y = 0; y < 34; y += 2) { for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(gr, 0.25, 2, 0.25, Y, cx + dx, y + 1, cz + dz); box(gr, 2.2, 0.15, 0.15, Y, cx, y + 2, cz - 1); }
    const jib = new THREE.Group(); const j1 = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 1.2), M(Y)); j1.position.x = 8; const cw = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2), M('#8a8e94')); cw.position.x = -8; const cab2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), M('#e8ecf2')); cab2.position.set(1.6, -1.4, 0); const hook = new THREE.Mesh(new THREE.BoxGeometry(0.1, 10, 0.1), M('#141414')); hook.position.set(18, -5, 0); const load = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1), M('#8a8e94')); load.position.set(18, -10.5, 0); jib.add(j1, cw, cab2, hook, load);
    jib.position.set(cx, 35, cz); gr.add(jib); tick(gr, (t) => { jib.rotation.y = Math.sin(t * 0.15) * 1.2; });
    const mixer = (x, z, s) => { const g2 = new THREE.Group(); const cabm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2.6), M('#e8361f')); cabm.position.set(3, 2, 0); const ch = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 2.6), M('#3a3a3e')); ch.position.y = 1; g2.add(cabm, ch);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.6, 5, 10), lam({ map: stripes('#e8ecf2', '#e8361f', 4) })); drum.rotation.z = Math.PI / 2 + 0.25; drum.position.set(-1, 3, 0); g2.add(drum); for (const dx of [-3, 0.5, 3]) for (const dz of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 8), M('#141414')); w.rotation.x = Math.PI / 2; w.position.set(dx, 0.6, dz); g2.add(w); }
      g2.position.set(x, 0, z); g2.scale.setScalar(s); gr.add(g2); tick(gr, (t, dt) => { drum.rotation.y += dt * 1.5; }); };
    mixer(-8, -PZ - 9, 1); mixer(-PX - 14, -8, 0.9);
    const scaf = (x0, z, w, h) => { for (let x = x0; x <= x0 + w; x += 3) box(gr, 0.2, h, 0.2, '#c8ccd2', x, h / 2, z); for (let y = 2; y <= h; y += 3) { box(gr, w, 0.2, 0.2, '#c8ccd2', x0 + w / 2, y, z); box(gr, w, 0.15, 1.4, '#a87a44', x0 + w / 2, y, z + 0.7); } box(gr, w, h, 0.3, '#9aa0a8', x0 + w / 2, h / 2, z - 2); };
    scaf(36, -PZ - 10, 18, 14); scaf(-62, -PZ - 14, 14, 11);
    far(10, (x, z) => { cone(gr, 0.4, 1.4, '#ff6a1a', x, 0.7, z, 6); box(gr, 0.85, 0.15, 0.85, '#ff6a1a', x, 0.08, z); }, 4.5, 5, -60, 60); far(4, (x, z) => { for (let k = 0; k < 6; k++) cyl(gr, 0.5, 0.5, 6, '#9aa0a8', x, 0.5 + Math.floor(k / 3) * 1, z + (k % 3) * 1, 8).rotation.z = Math.PI / 2; }, 6, 7, -50, 50); };
  // world of cards: a chessboard pitch, giant playing cards, chess pieces, floating geometric shapes
  DEF.karty = { name: 'ŚWIAT KART', sky: '#2a1a4a', fog: '#3a2a5a', near: 70, far: 230, hemi: ['#f0e8ff', '#3a2a5a', 1.9], sun: ['#fff4f0', 2.2], grav: 30, wx: 'none',
    pal: pal('#e8e0d0', '#e8e0d0', '#e8e0d0', [], ['#d8d0c0', '#ccc4b4', '#e0d8c8'], '#e8202a', { txt: 'rgba(0,0,0,.1)', blocks: (g, W, H, K) => { const B = 3 * K; for (let y = 0; y < H; y += B) for (let x = 0; x < W; x += B) { g.fillStyle = ((x + y) / B) % 2 ? '#2a2430' : '#ece4d4'; g.fillRect(x, y, B, B); } } }),
    track: () => tile((g) => { for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) { g.fillStyle = ((x + y) / 16) % 2 ? '#5a2a3a' : '#7a3a4a'; g.fillRect(x, y, 16, 16); } }) };
  BUILD.karty = (gr) => { const suit = (s, red) => tex(32, 48, (g) => { g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, 32, 48); g.strokeStyle = '#2a2430'; g.lineWidth = 2; g.strokeRect(1, 1, 30, 46); g.fillStyle = red ? '#d8202a' : '#1a1420'; g.font = '20px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 16, 25); g.font = '8px "Press Start 2P"'; g.fillText(pick(['A', 'K', 'Q', 'J', '7', '10']), 7, 8); });
    const back = tex(32, 48, (g) => { g.fillStyle = '#c8202a'; g.fillRect(0, 0, 32, 48); g.fillStyle = '#ffffff'; for (let y = 3; y < 46; y += 4) for (let x = 3 + (y % 8 ? 2 : 0); x < 30; x += 4) g.fillRect(x, y, 1, 1); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.strokeRect(2, 2, 28, 44); });
    const card = (x, z, ry, rz = 0, s = 1) => { const sy = pick(['♠', '♥', '♦', '♣']), red = sy === '♥' || sy === '♦'; const m = add(gr, new THREE.BoxGeometry(8 * s, 12 * s, 0.2), [M('#ffffff'), M('#ffffff'), M('#ffffff'), M('#ffffff'), lam({ map: suit(sy, red) }), lam({ map: back })], x, 6 * s, z); m.rotation.y = ry; m.rotation.z = rz; return m; };
    far(9, (x, z, i) => card(x, z, R(-0.3, 0.3), R(-0.15, 0.15), R(1, 1.6)), 10, 18); ends(4, (x, z) => card(x, z, Math.PI / 2 + R(-0.3, 0.3), 0, 1.1), 12, 20);
    for (let k = 0; k < 7; k++) { const a = card(-50 + k * 5.4, -PZ - 32, 0, 0, 1.2); a.position.y = 7.2; a.rotation.z = k % 2 ? 0.35 : -0.35; }
    const piece = (x, z, kind, white, s) => { const c = white ? '#f4ece0' : '#2a2430'; cyl(gr, 1.6 * s, 1.9 * s, 0.8 * s, c, x, 0.4 * s, z, 16); cyl(gr, 0.7 * s, 1.2 * s, 3 * s, c, x, 2.3 * s, z, 12);
      if (kind === 'p') sph(gr, 0.9 * s, c, x, 4.4 * s, z, 2); else if (kind === 'r') { cyl(gr, 1.2 * s, 1.1 * s, 1.4 * s, c, x, 4.4 * s, z, 12); for (let k = 0; k < 4; k++) box(gr, 0.5 * s, 0.6 * s, 0.5 * s, c, x + Math.cos(k * 1.57) * 0.9 * s, 5.3 * s, z + Math.sin(k * 1.57) * 0.9 * s); }
      else if (kind === 'n') { const h = box(gr, 1 * s, 2.4 * s, 2 * s, c, x, 4.6 * s, z); h.rotation.x = -0.3; box(gr, 0.9 * s, 1 * s, 1.4 * s, c, x, 5.2 * s, z + 1.2 * s); } else { cyl(gr, 1 * s, 0.7 * s, 1.6 * s, c, x, 4.4 * s, z, 12); sph(gr, 0.7 * s, c, x, 5.6 * s, z, 1); if (kind === 'k') { box(gr, 0.3 * s, 1.4 * s, 0.3 * s, c, x, 6.8 * s, z); box(gr, 1 * s, 0.3 * s, 0.3 * s, c, x, 6.9 * s, z); } } };
    const kinds = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']; far(8, (x, z, i) => piece(x, z, kinds[i], i % 2 === 0, R(1.2, 1.6)), 5.5, 7, -56, 56); ends(6, (x, z, i) => piece(x, z, 'p', i % 2 === 0, 1.1), 7, 10);
    const shapes = []; for (let k = 0; k < 10; k++) { const geo = [new THREE.OctahedronGeometry(2, 0), new THREE.TetrahedronGeometry(2.4, 0), new THREE.BoxGeometry(2.6, 2.6, 2.6), new THREE.IcosahedronGeometry(2, 0)][k % 4];
      const m = add(gr, geo, GL(pick(['#ff3a5a', '#ffd21a', '#3ac8ff', '#c86aff', '#3ae86a']), 0.4), R(-70, 70), R(12, 26), -PZ - R(14, 40)); shapes.push([m, m.position.y, R(0, 6)]); }
    tick(gr, (t) => shapes.forEach(([m, y, p]) => { m.rotation.x = t * 0.5 + p; m.rotation.y = t * 0.7; m.position.y = y + Math.sin(t + p) * 1.5; }));
    for (let k = 0; k < 4; k++) { const fc = card(0, 0, 0, 0, 0.5); tick(gr, (t) => { const a = t * 0.3 + k * 1.57; fc.position.set(Math.cos(a) * 40, 18 + Math.sin(t + k) * 3, -PZ - 24 + Math.sin(a) * 8); fc.rotation.y = t * 1.5 + k; }); } };
  return { DEF, BUILD };
}
