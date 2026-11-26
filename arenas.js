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
    pal: pal('#3f9a5a', '#46a460', '#3a9054', ['#358a4e', '#52b06a', '#2e7c44', '#5abc72'], ['#3a8a50', '#348048', '#42985a'], '#ffffff'),
    track: () => tile((g) => { fill(g, '#8a8c90'); speck(g, ['#6e7074', '#a4a6aa', '#7a7c80', '#b4b6ba'], 400); }) };
  BUILD.dach = (gr) => { fence(gr, '#c8ccd2', -PZ - 7, -70, 70, 1.3); for (const s of [-1, 1]) { box(gr, 0.25, 0.25, 50, '#c8ccd2', s * (PX + 9), 1.3, 0); for (let z = -24; z <= 24; z += 3) box(gr, 0.25, 1.3, 0.25, '#c8ccd2', s * (PX + 9), 0.65, z); }
    far(6, (x, z) => { box(gr, 3, 2, 2.4, '#b0b4ba', x, 1, z); cyl(gr, 0.8, 0.8, 0.3, '#3a3c40', x, 2.1, z); }, 4.5, 6);
    const wt = new THREE.Group(); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 0.25), M('#5a3e24')); l.position.set(dx * 1.6, 3, dz * 1.6); wt.add(l); }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 4, 10), M('#8a5a34')); tank.position.y = 8; wt.add(tank); const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 10), M('#5a3e24')); top.position.y = 10.8; wt.add(top); wt.position.set(-PX - 14, 0, -8); gr.add(wt);
    const pad = add(gr, new THREE.CylinderGeometry(6, 6, 0.3, 16), M('#3a3c40'), PX + 16, 0.15, 6); sign(gr, 'H', '#3a3c40', '#ffe14a', PX + 16, 0.32, 6, 6, 6, 0.4).rotation.x = -Math.PI / 2;
    cyl(gr, 0.15, 0.25, 14, '#c8ccd2', 30, 7, -PZ - 6); const bl = sph(gr, 0.4, BA('#ff2a2a'), 30, 14.2, -PZ - 6, 0); tick(gr, (t) => { bl.visible = Math.floor(t * 1.4) % 2 === 0; });
    // the city: towers rising from far below; the near ones are lower than us
    for (let i = 0; i < 34; i++) { const a = R(-1.3, 1.3), d = R(70, 160), x = Math.sin(a) * d * 1.3, z = -PZ - Math.cos(a) * d * 0.7 - 10, w = R(8, 16), h = R(40, 140);
      building(gr, x, z, w, h, w, pick(['#9aa4b0', '#b8c0ca', '#7a8696', '#c8b8a0']), '#dfefff', '#4a5a6a', -100 + R(-20, 30) + (d - 70) * 0.5, 0.15); }
    for (let i = 0; i < 6; i++) cloud(gr, R(-120, 120), R(30, 50), -PZ - R(80, 160), R(1.5, 3)); };
  // 6. ninja village: pagodas, a torii gate, cherry trees, stone lanterns, bamboo
  DEF.ninja = { name: 'WIOSKA NINJA', sky: '#ffd8c8', fog: '#f6d2c4', near: 70, far: 220, hemi: ['#fff2ea', '#6a5a3a', 1.9], sun: ['#ffd8b0', 2.4], grav: 30, wx: 'petals',
    pal: pal('#6a9a4a', '#72a252', '#649244', ['#5a8a3a', '#82b25a', '#4e7e34', '#8aba62'], ['#a08a5a', '#8a7a4e', '#b09a68'], '#fff6ee'),
    track: () => tile((g) => { fill(g, '#d8d0bc'); g.fillStyle = '#c4bca6'; for (let y = 2; y < 64; y += 4) g.fillRect(0, y, 64, 1); speck(g, ['#e8e0cc', '#b8b09a'], 80); }) };
  BUILD.ninja = (gr) => { const pagoda = (x, z, s) => { for (let k = 0; k < 4; k++) { const w = (5 - k * 0.9) * s; box(gr, w * 0.7, 2.2 * s, w * 0.7, '#8a2a20', x, (1.1 + k * 3) * s, z); const roof = box(gr, w * 1.25, 0.5 * s, w * 1.25, '#2a2a32', x, (2.4 + k * 3) * s, z); roof.rotation.y = 0; }
      cyl(gr, 0.1 * s, 0.25 * s, 3 * s, '#e8c040', x, 13.6 * s, z); };
    pagoda(-20, -PZ - 14, 1.6); pagoda(34, -PZ - 18, 1.3); pagoda(-PX - 16, 4, 1.1);
    const torii = (x, z, s) => { for (const dx of [-2.4, 2.4]) cyl(gr, 0.3 * s, 0.35 * s, 7 * s, '#d8301f', x + dx * s, 3.5 * s, z, 8); box(gr, 7.4 * s, 0.6 * s, 0.7 * s, '#1a1a1a', x, 7.2 * s, z); box(gr, 6.2 * s, 0.4 * s, 0.5 * s, '#d8301f', x, 6 * s, z); };
    torii(4, -PZ - 7, 1); torii(PX + 12, -6, 0.9);
    const cherry = (x, z, s) => { cyl(gr, 0.3 * s, 0.5 * s, 4 * s, '#4a2a24', x, 2 * s, z, 6); for (let k = 0; k < 5; k++) sph(gr, R(1.4, 2.2) * s, pick(['#ffb6d0', '#ff9ac0', '#ffd0e2']), x + R(-2, 2) * s, R(4, 6) * s, z + R(-1, 1) * s, 0); };
    far(9, (x, z) => cherry(x, z, R(1, 1.4)), 6, 11); ends(8, (x, z) => cherry(x, z, R(0.9, 1.3)));
    const lantern = (x, z) => { box(gr, 0.5, 1.6, 0.5, '#9a9a94', x, 0.8, z); box(gr, 1.4, 0.3, 1.4, '#9a9a94', x, 1.7, z); box(gr, 0.9, 0.8, 0.9, GL('#ffd890', 0.7), x, 2.25, z); box(gr, 1.6, 0.35, 1.6, '#8a8a84', x, 2.8, z); };
    far(8, (x, z) => lantern(x, z), 4.5, 5.5, -40, 40);
    ends(6, (x, z) => { for (let k = 0; k < 7; k++) cyl(gr, 0.18, 0.2, R(6, 11), '#6aa04a', x + R(-1.5, 1.5), 4, z + R(-1.5, 1.5), 5); });
    peak(gr, -10, -PZ - 90, 50, 46, '#7a8aa8', '#ffffff'); };
  // 7. medieval castle: stone walls with battlements, round towers, banners
  DEF.zamek = { name: 'ZAMEK', sky: '#a8c8e8', fog: '#c4d8ea', near: 80, far: 220, hemi: ['#eef6ff', '#5a6a4a', 2.0], sun: ['#fff0d8', 2.5], grav: 30, wx: 'leaves',
    pal: pal('#4f8a3a', '#5a9a43', '#4a8436', ['#3f7a2e', '#62a24a', '#467e34', '#6aaa52'], ['#8a7a5a', '#7a6a4e', '#9a8a68'], '#f6f2e6'),
    track: () => tile((g) => { fill(g, '#7a7a74'); for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 * 4; x < 64; x += 8) { g.fillStyle = pick(['#8a8a84', '#9a9a92', '#828278']); g.fillRect(x + 1, y + 1, 6, 6); } }) };
  BUILD.zamek = (gr) => { const stone = M('#9a968c'), dark = M('#7a766c');
    const wall = (x0, x1, z) => { box(gr, x1 - x0, 7, 2.4, stone, (x0 + x1) / 2, 3.5, z); for (let x = x0; x < x1; x += 2) box(gr, 1, 1, 2.4, dark, x + 0.5, 7.5, z); };
    const towr = (x, z, r, h, roof) => { cyl(gr, r, r * 1.05, h, stone, x, h / 2, z, 10); for (let k = 0; k < 8; k++) box(gr, 0.9, 1, 0.9, dark, x + Math.cos(k * 0.785) * r, h + 0.5, z + Math.sin(k * 0.785) * r); cone(gr, r * 1.15, r * 1.6, roof, x, h + 1 + r * 0.8, z, 10);
      box(gr, 0.7, 1.4, 0.1, '#1a1410', x, h * 0.65, z + r + 0.02); };
    wall(-66, 66, -PZ - 10); for (const x of [-66, -33, 0, 33, 66]) towr(x, -PZ - 10, 3, 12, pick(['#2a4ab0', '#b02a2a'])); box(gr, 6, 5, 2.6, '#2a1e16', 14, 2.5, -PZ - 8.7);
    towr(-8, -PZ - 30, 6, 28, '#2a4ab0'); towr(20, -PZ - 34, 5, 22, '#b02a2a');
    for (const s of [-1, 1]) { box(gr, 2.4, 7, 60, stone, s * (PX + 14), 3.5, 0); for (let z = -28; z < 30; z += 2) box(gr, 2.4, 1, 1, dark, s * (PX + 14), 7.5, z + 0.5); towr(s * (PX + 14), -22, 3, 11, '#b02a2a'); towr(s * (PX + 14), 22, 3, 11, '#2a4ab0'); }
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
  // 12. the retro stadium: 80s colours, old boards and two big pixel scoreboards; the stands stay
  DEF.retro = { name: 'STADION RETRO', sky: '#2a1a5a', fog: '#4a2a6a', near: 90, far: 200, hemi: ['#ffd8f0', '#3a2a5a', 1.9], sun: ['#ffe0f0', 2.3], grav: 30, wx: 'none', stands: true,
    pal: pal('#3a9a3a', '#4ab04a', '#2e8a2e', ['#2a7a2a', '#5ac05a', '#348a34', '#62c862'], ['#8a6a3a', '#9a7844', '#7a5c30'], '#ffffff') };
  BUILD.retro = (gr) => { for (const s of [-1, 1]) { box(gr, 0.8, 16, 0.8, '#8a8a94', s * (PX + 12), 8, -PZ - 4); const sc = sign(gr, s < 0 ? 'GOL!' : '1986', '#0a0a14', s < 0 ? '#ffd21a' : '#ff3ad8', s * (PX + 12), 18, -PZ - 3.4, 12, 4, 1.2); }
    for (let k = 0; k < 4; k++) { const w = ['TURBO', 'VHS', 'ARCADE', 'KASETA'][k]; sign(gr, w, pick(['#ff3ad8', '#3ac8ff', '#ffd21a', '#3ae86a']), '#141414', -30 + k * 20, 0.9, -PZ - 2.6, 7, 1.4, 0.6); }
    stars(gr, 400); moonDisc(gr, '#ff6ad8', 0, 40, -220, 30); };
  // 13. dinosaur valley: volcanoes, ferns, cycads, a long-neck and a T-rex, flying reptiles
  DEF.dino = { name: 'DOLINA DINOZAURÓW', sky: '#f0b888', fog: '#d8a880', near: 60, far: 220, hemi: ['#ffeccc', '#5a4a2a', 1.9], sun: ['#ffe0b0', 2.5], grav: 30, wx: 'ash',
    pal: pal('#5a8a3a', '#62923f', '#548236', ['#4a7a2e', '#6a9a46', '#3e6e28', '#72a24e'], ['#7a5a34', '#6a4c2a', '#86643a'], '#f4f0d8'),
    track: () => tile((g) => { fill(g, '#6a4a2a'); speck(g, ['#5a3e22', '#7a5a34', '#4a7a2e', '#3e6e28'], 260); }) };
  BUILD.dino = (gr) => { volcano(gr, -30, -PZ - 50, 24, 34); volcano(gr, 40, -PZ - 60, 20, 28);
    const fern = (x, z, s) => { for (let k = 0; k < 6; k++) { const l = box(gr, 0.4 * s, 0.15, 2.6 * s, pick(['#3a7a2a', '#4a8a32']), x + Math.cos(k) * 0.9 * s, 0.8 * s, z + Math.sin(k) * 0.9 * s); l.rotation.y = k; l.rotation.x = 0.5; } };
    far(18, (x, z) => fern(x, z, R(1, 1.8)), 4.5, 10); ends(12, (x, z) => fern(x, z, R(1, 1.6)));
    const cycad = (x, z, s) => { cyl(gr, 0.6 * s, 0.9 * s, 6 * s, '#6a5030', x, 3 * s, z, 6); for (let k = 0; k < 7; k++) { const l = box(gr, 0.6 * s, 0.2, 4 * s, '#3a8a2a', x + Math.cos(k * 0.9) * 1.8 * s, 6.4 * s, z + Math.sin(k * 0.9) * 1.8 * s); l.rotation.y = -k * 0.9 + Math.PI / 2; l.rotation.x = 0.35; } };
    far(8, (x, z) => cycad(x, z, R(1.2, 1.8)), 9, 16); ends(6, (x, z) => cycad(x, z, R(1, 1.5)));
    // a long-neck grazing behind the far side, a T-rex beyond one end
    const sx = 26, sz = -PZ - 24, sk = M('#7a8a6a'); const body = sph(gr, 5, sk, sx, 9, sz, 1); body.scale.set(1.6, 1, 1);
    for (const [dx, dz] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) cyl(gr, 1, 1.2, 8, sk, sx + dx, 4, sz + dz, 7);
    const neck = cyl(gr, 0.9, 1.6, 14, sk, sx - 10, 16, sz, 7); neck.rotation.z = 0.6; box(gr, 3, 1.6, 1.6, sk, sx - 15, 22, sz); const tail = cone(gr, 1.8, 14, sk, sx + 12, 8, sz, 7); tail.rotation.z = -1.25;
    const head = box(gr, 3, 1.6, 1.6, sk, sx - 15, 22, sz); tick(gr, (t) => { head.position.y = 22 + Math.sin(t * 0.6) * 0.6; });
    const tx = -PX - 22, tz = 2, tr = M('#5a7a3a'); const tb = box(gr, 6, 4, 3.4, tr, tx, 8, tz); tb.rotation.z = 0.35; box(gr, 4.4, 2.6, 2.6, tr, tx + 4.6, 11.4, tz); box(gr, 2.6, 0.6, 2.2, '#ffffff', tx + 5.4, 10.4, tz);
    for (const dz of [-1.2, 1.2]) { box(gr, 1.4, 5, 1.2, tr, tx - 0.5, 3.5, tz + dz); box(gr, 2, 0.6, 1.2, tr, tx + 0.2, 0.3, tz + dz); } const tt = cone(gr, 1.8, 8, tr, tx - 6, 6.5, tz, 7); tt.rotation.z = 1.25; box(gr, 1.4, 0.4, 0.4, tr, tx + 3, 8, tz + 1.4);
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
  DEF.roboty = { name: 'ŚWIAT ROBOTÓW', sky: '#3a4a5a', fog: '#5a6a7a', near: 80, far: 220, hemi: ['#d8e8ff', '#2a3a4a', 1.9], sun: ['#eef4ff', 2.3], grav: 30, wx: 'none', stands: true,
    pal: pal('#7a828a', '#7a828a', '#7a828a', [], ['#5a6068', '#4e545c', '#666c74'], '#5af0ff', { blocks: plates(['#7a828a', '#848c94', '#6e767e', '#8a929a'], 'rgba(20,24,30,.55)') }),
    track: () => tile((g) => { fill(g, '#3a3e44'); g.fillStyle = '#54585e'; for (let i = 0; i < 64; i += 4) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); } }) };
  BUILD.roboty = (gr) => { const robot = (x, z, s, wave) => { const c = pick(['#b0b8c2', '#c8a040', '#5a8ac8', '#c85a4a']); for (const dx of [-1.2, 1.2]) box(gr, 1.4 * s, 7 * s, 1.6 * s, '#5a606a', x + dx * s, 3.5 * s, z); box(gr, 5 * s, 6 * s, 3 * s, c, x, 10 * s, z);
      box(gr, 3.4 * s, 2.6 * s, 2.6 * s, c, x, 14.4 * s, z); for (const dx of [-0.8, 0.8]) box(gr, 0.7 * s, 0.5 * s, 0.2, GL(pick(['#ff3a3a', '#5af0ff']), 1.5), x + dx * s, 14.6 * s, z + 1.32 * s); cyl(gr, 0.1 * s, 0.1 * s, 2 * s, '#8a8a94', x, 16.6 * s, z); sph(gr, 0.4 * s, GL('#ffd21a', 1.4), x, 17.7 * s, z, 0);
      box(gr, 1.2 * s, 6 * s, 1.2 * s, '#5a606a', x - 3.2 * s, 9 * s, z); const arm = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(1.2 * s, 6 * s, 1.2 * s), M('#5a606a')); a.position.y = 3 * s; arm.add(a); arm.position.set(x + 3.2 * s, 12 * s, z); arm.rotation.z = Math.PI; gr.add(arm);
      if (wave) tick(gr, (t) => { arm.rotation.z = Math.PI * 0.75 + Math.sin(t * 3) * 0.35; }); };
    robot(-34, -PZ - 30, 2, true); robot(12, -PZ - 36, 2.4, false); robot(48, -PZ - 28, 1.8, true); robot(-PX - 22, 0, 1.6, false); robot(PX + 22, -4, 1.6, true);
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
  DEF.cegielki = { name: 'ZABAWKOWE KLOCKI', sky: '#9ad0ff', fog: '#c0e0ff', near: 90, far: 220, hemi: ['#f4faff', '#5a7a4a', 2.0], sun: ['#fffbe8', 2.6], grav: 30, wx: 'none', stands: true,
    pal: pal('#3ab83a', '#3ab83a', '#3ab83a', [], ['#30a030', '#2c962c', '#36ac36'], '#ffffff', { blocks: plates(['#3ab83a', '#38b438', '#3cbc3c'], '', true) }),
    track: () => tile((g) => { fill(g, '#a0a4a8'); for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) { g.fillStyle = '#b8bcc0'; g.fillRect(x + 2, y + 2, 4, 1); g.fillStyle = '#80848a'; g.fillRect(x + 2, y + 6, 4, 1); g.fillRect(x + 6, y + 2, 1, 4); } }) };
  BUILD.cegielki = (gr) => { const cols = ['#e8202a', '#2a6ae8', '#ffd21a', '#3ab83a', '#ffffff', '#ff8a1a'];
    const brick = (x, y, z, w, d, c) => { box(gr, w, 1.2, d, c, x, y + 0.6, z); for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) cyl(gr, 0.3, 0.3, 0.3, c, x - w / 2 + 0.5 + i, y + 1.35, z - d / 2 + 0.5 + j, 8); };
    const btree = (x, z) => { for (let k = 0; k < 3; k++) brick(x, k * 1.2, z, 1, 1, '#8a5a2a'); for (let k = 0; k < 3; k++) brick(x, 3.6 + k * 1.2, z, 3 - k, 3 - k, '#2a8a2a'); };
    far(10, (x, z) => btree(x, z), 5, 9); ends(6, (x, z) => btree(x, z));
    const house = (x, z) => { const c = pick(cols); for (let k = 0; k < 4; k++) brick(x, k * 1.2, z, 4, 3, k === 2 ? '#8ad8ff' : c); brick(x, 4.8, z, 4, 3, '#e8202a'); brick(x, 6, z, 2, 3, '#e8202a'); };
    far(5, (x, z) => house(x, z), 11, 14); far(8, (x, z) => brick(x, 0, z, pick([2, 4]), 2, pick(cols)), 4.5, 6, -40, 40); };
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
  return { DEF, BUILD };
}
