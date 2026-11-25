// CUIAVIA SOCCER: a 5-a-side arcade football game after the old Kunio-kun football games. The pitch and the stadium are
// 3D; the players are the user's pixel-art sprites, standing in it as flat figures that always face the camera, seen
// from high up as in the original. The frame is rendered small and blown up without smoothing (8-bit), then a
// tilt-shift pass blurs its top and bottom. You steer the Cuiavia player nearest the ball (a yellow arrow over his head).
import * as THREE from 'three';

// ---- data ------------------------------------------------------------------------------------------------------------
const FR = await (await fetch('./frames.json')).json();
const POSE = FR.poses;
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const [IMG_G, IMG_P, IMG_C] = await Promise.all([loadImg('./atlas_green.png'), loadImg('./atlas_purple.png'), loadImg('./creatures.png')]);
const CR = await (await fetch('./creatures.json')).json();   // wolf and dragon frames [x, y, w, h, anchorX, feet]
const EX = await (await fetch('./extras.json')).json();
const [IMG_FANS, IMG_FRONT, ...IMG_FLAGS] = await Promise.all([loadImg('./fans.png'), loadImg('./crowdfront.png'), ...EX.flags.map((_, i) => loadImg(`./flag${i}.png`))]);
const TIERS = [], FLAGS = [], FANS = {}, CARDS = {}, FLARES = [], SMOKES = [], LIGHTS = { glows: [] }, FRONT = []; let GLOW = null;

const PX = 30, PZ = 18, GOAL_W = 10, GOAL_H = 3.4, GOAL_D = 2.2;
const UNIT = 2.5 / 46;                  // world units per sprite pixel (a player ~2.5 tall)
const CAM_EL = 0.5, CAM_YAW = 0.22;     // a broadcast camera: ~29 degrees down, turned a little, the stands in view
const LEAN = 0.3;                       // the sprites lean back a little toward it
const TEAMS = [
  { name: 'CUIAVIA', short: 'CUI', img: IMG_G, color: '#3fbf55', dir: 1,
    squad: [
      { sheet: '10', num: 1, name: 'MAREK', role: 'gk', pos: 'GK', keeper: true },
      // stats 1-5: st shot, pa pass, dr dribble, ob defence, sp speed; the captain chosen in the locker room plays in the middle
      { sheet: '7', num: 7, name: 'SZYMON', role: 'def', pos: 'DF', home: [9, 0], super: { name: 'SZYMONOWY ZYGZAK', kind: 'zigzag' }, stats: { st: 2, pa: 3, dr: 2, ob: 5, sp: 3 } },
      { sheet: 's14', num: 14, name: 'SOWA', role: 'mid', pos: 'MF', home: [19, -8], super: { name: 'SOWIA SPIRALA', kind: 'curve' }, stats: { st: 3, pa: 4, dr: 3, ob: 3, sp: 3 } },
      { sheet: 's10', num: 10, name: 'ARTUR', role: 'mid', pos: 'MF', home: [19, 8], super: { name: 'ARTUROWA TRĄBA', kind: 'tornado' }, stats: { st: 3, pa: 3, dr: 4, ob: 2, sp: 4 } },
      { sheet: '27', num: 27, name: 'DOMINIK', role: 'fwd', pos: 'FW', home: [26, 0], super: { name: 'KUJAWSKA PETARDA', kind: 'fire' }, captain: true, stats: { st: 5, pa: 3, dr: 4, ob: 2, sp: 4 } },
    ] },
  { name: 'FIOLETOWI', short: 'FIO', img: IMG_P, color: '#a46ee8', dir: -1,
    squad: [
      { sheet: '19', num: 1, name: 'PIOTREK', role: 'gk', pos: 'GK', keeper: true },
      { sheet: '21', num: 21, name: 'OLEK', role: 'def', pos: 'DF', home: [9, 0], super: { name: 'KRUCZY ŁUK', kind: 'curve' } },
      { sheet: '14', num: 14, name: 'FILIP', role: 'mid', pos: 'MF', home: [19, 8], super: { name: 'ŚLIWKOWA BOMBA', kind: 'fire' } },
      { sheet: '17', num: 17, name: 'SZYMON', role: 'mid', pos: 'MF', home: [19, -8], super: { name: 'LAWENDOWY WIR', kind: 'tornado' } },
      { sheet: '11', num: 11, name: 'IGOR', role: 'fwd', pos: 'FW', home: [26, 0], super: { name: 'FIOLETOWY PIORUN', kind: 'zigzag' } },
    ] },
];

// ---- renderer: the stadium in one pass, blurred by depth of field; the players in a second pass, always sharp ----------
// Layer 0 is the world (pitch, stands, town), layer 1 the play (players, ball, markers, effects). The world is drawn to
// a target with a depth texture; a full-screen pass writes its blurred colour AND its depth to the screen; then the play
// is drawn on top with that depth, so a post in front of a keeper still hides him, but no player is ever blurred.
const PLAY = 1;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fd3f2');
scene.fog = new THREE.Fog('#c5e3f2', 90, 190);
const camera = new THREE.PerspectiveCamera(42, 16 / 9, 1, 400);
let low = null, mid = null;
const post = new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3,
  uniforms: { tex: { value: null }, dep: { value: null }, res: { value: new THREE.Vector2(1280, 720) }, focus: { value: 0.42 }, band: { value: 0.1 }, blur: { value: 9 }, flash: { value: 0 } },
  vertexShader: 'out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tex; uniform sampler2D dep; uniform vec2 res; uniform float focus, band, blur, flash; in vec2 vUv;
    layout(location = 0) out highp vec4 outColor;
    void main(){
      vec2 px = 1.0 / res;
      float d = max(0.0, abs(vUv.y - focus) - band) / (0.55 - band);
      float r = clamp(d, 0.0, 1.0) * blur * res.y / 720.0;
      vec2 ca = (vUv - 0.5) * (0.004 + 0.008 * clamp(d, 0.0, 1.0)) + vec2(0.0012 + 0.002 * clamp(d, 0.0, 1.0), 0.0);
      vec3 acc = vec3(texture(tex, vUv + ca).r, texture(tex, vUv).g, texture(tex, vUv - ca).b); float n = 1.0;
      if (r > 0.3) {
        for (int i = 0; i < 20; i++) {
          float a = float(i) * 2.39996; float k = sqrt((float(i) + 0.5) / 20.0);
          vec2 q = vUv + vec2(cos(a), sin(a)) * k * r * px; acc += vec3(texture(tex, q + ca).r, texture(tex, q).g, texture(tex, q - ca).b); n += 1.0;
        }
      }
      outColor = vec4(acc / n, 1.0);                                // linear; the final pass grades it
      gl_FragDepth = texture(dep, vUv).r;
    }`,
  depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth,
});
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
// the final pass: chromatic aberration on hard moments (a shot, a sprint, a big hit), grade, vignette, flash
const fin = new THREE.ShaderMaterial({
  uniforms: { tex: { value: null }, res: { value: new THREE.Vector2(1280, 720) }, ca: { value: 0 }, flash: { value: 0 }, wet: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tex; uniform vec2 res; uniform float ca, flash, wet; varying vec2 vUv;
    void main(){
      vec2 d = (vUv - 0.5); vec2 o = d * ca * 0.018 + vec2(ca * 2.0 / res.x, 0.0);
      vec3 c = vec3(texture2D(tex, vUv + o).r, texture2D(tex, vUv).g, texture2D(tex, vUv - o).b);
      c = pow(c, vec3(1.0 / 2.2));
      c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.1 - wet * 0.25);
      c = mix(c, c * vec3(0.82, 0.88, 0.98), wet);
      float v = smoothstep(1.05, 0.4, length(d * vec2(1.0, 0.85)));
      c *= mix(0.84 - wet * 0.1, 1.0, v);
      gl_FragColor = vec4(mix(c, vec3(1.0), flash), 1.0);
    }`,
  depthTest: false, depthWrite: false,
});
const finScene = new THREE.Scene(); finScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fin));
function resize() {
  const st = document.getElementById('stage'), W = st.clientWidth || innerWidth, H = st.clientHeight || innerHeight, pr = renderer.getPixelRatio();
  renderer.setSize(W, H);
  low?.dispose();
  const w = Math.round(W * pr), h = Math.round(H * pr);
  low = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  low.depthTexture = new THREE.DepthTexture(w, h); low.depthTexture.type = THREE.UnsignedIntType;
  post.uniforms.tex.value = low.texture; post.uniforms.dep.value = low.depthTexture; post.uniforms.res.value.set(w, h);
  mid?.dispose(); mid = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, type: THREE.HalfFloatType });
  fin.uniforms.tex.value = mid.texture; fin.uniforms.res.value.set(w, h);
  const portrait = H > W; camera.aspect = W / H; camera.fov = portrait ? 60 : 46; camera.updateProjectionMatrix();
  post.uniforms.focus.value = portrait ? 0.45 : 0.42; post.uniforms.band.value = portrait ? 0.14 : 0.12;
}
addEventListener('resize', resize); resize();
const toPlay = (o) => o.traverse((m) => m.layers.set(PLAY));
function render() {
  camera.layers.set(0);
  renderer.setRenderTarget(low); renderer.render(scene, camera);
  renderer.setRenderTarget(mid); renderer.autoClear = true; renderer.render(postScene, postCam);
  const bg = scene.background; scene.background = null;   // the play pass must not paint the sky over the world
  renderer.autoClear = false; camera.layers.set(PLAY); renderer.render(scene, camera); renderer.autoClear = true; scene.background = bg;
  camera.layers.set(0);
  renderer.setRenderTarget(null); renderer.render(finScene, postCam);
}

// ---- the stadium -----------------------------------------------------------------------------------------------------
const tex = (w, h, draw, { repeat = null } = {}) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
const lam = (o) => new THREE.MeshLambertMaterial(o);
scene.add(new THREE.HemisphereLight('#dff1ff', '#5f7a3a', 1.6));
const sun = new THREE.DirectionalLight('#fff1d6', 2.2); sun.position.set(-30, 50, 25); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 40, bottom: -40, near: 1, far: 140 }); scene.add(sun);
// the pitch: mown stripes and lines painted into one texture, 8 texels a unit
{
  const K = 14, W = (PX + 6) * 2 * K, H = (PZ + 6) * 2 * K;
  const t = tex(W, H, (g) => {
    const X = (x) => Math.round((x + PX + 6) * K), Z = (z) => Math.round((z + PZ + 6) * K);
    g.fillStyle = '#4f8a3a'; g.fillRect(0, 0, W, H);
    const n = 12; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#5aa043' : '#64ad4b'; g.fillRect(X(-PX - 2 + i * (2 * PX + 4) / n), Z(-PZ - 2), Math.ceil((2 * PX + 4) / n * K), (2 * PZ + 4) * K); }
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(30,70,25,.25)' : 'rgba(170,220,120,.18)'; g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1); }
    g.fillStyle = '#f3f6ea';
    const L = (x0, z0, x1, z1) => g.fillRect(Math.min(X(x0), X(x1)), Math.min(Z(z0), Z(z1)), Math.max(2, Math.abs(X(x1) - X(x0))), Math.max(2, Math.abs(Z(z1) - Z(z0))));
    L(-PX, -PZ, PX, -PZ + 0.2); L(-PX, PZ - 0.2, PX, PZ); L(-PX, -PZ, -PX + 0.2, PZ); L(PX - 0.2, -PZ, PX, PZ); L(-0.1, -PZ, 0.1, PZ);
    const ring = (cx, cz, r, a0 = 0, a1 = 6.284) => { for (let a = a0; a < a1; a += 0.01) g.fillRect(X(cx + Math.cos(a) * r), Z(cz + Math.sin(a) * r), 2, 2); };
    ring(0, 0, 5.5); g.fillRect(X(0) - 2, Z(0) - 2, 4, 4);
    for (const s of [-1, 1]) {
      const gx = s * PX;
      L(gx, -11, gx - s * 9, -10.8); L(gx, 10.8, gx - s * 9, 11); L(gx - s * 9, -11, gx - s * 8.8, 11);
      L(gx, -5.5, gx - s * 3.5, -5.3); L(gx, 5.3, gx - s * 3.5, 5.5); L(gx - s * 3.5, -5.5, gx - s * 3.3, 5.5);
      g.fillRect(X(gx - s * 6.5) - 2, Z(0) - 2, 4, 4);
      ring(gx - s * 6.5, 0, 4.2, s > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, s > 0 ? Math.PI * 1.38 : Math.PI * 0.38);
      g.fillStyle = s > 0 ? '#5aa043' : '#64ad4b';
    }
    g.fillStyle = '#f3f6ea';
    // the club name mown into the grass behind the centre circle
    g.font = `bold ${3.2 * K}px "Pixelify Sans", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.16)'; g.fillText('CUIAVIA', X(0), Z(-11));
  });
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true;   // the pitch is HD; only the players are pixel art
  const m = new THREE.Mesh(new THREE.PlaneGeometry((PX + 6) * 2, (PZ + 6) * 2), lam({ map: t }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m);
  // the surround: a red running track and grass
  const track = new THREE.Mesh(new THREE.PlaneGeometry(200, 160), lam({ map: tex(64, 64, (g) => { g.fillStyle = '#b5583c'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { g.fillStyle = Math.random() < .5 ? '#a54d33' : '#c4674a'; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 1, 1); } }, { repeat: [50, 40] }) }));
  track.rotation.x = -Math.PI / 2; track.position.y = -0.02; track.receiveShadow = true; scene.add(track);
}
// boards round the pitch, the stand on the far side, the town behind it
const boardTex = (txt, bg, fg) => tex(96, 12, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 96, 12); g.fillStyle = fg; g.font = 'bold 9px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 48, 6.5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 10, 96, 2); });
const BOARDS = [['CUIAVIA', '#1d1f22', '#3fbf55'], ['INOWROCŁAW', '#3fbf55', '#1d1f22'], ['KUJAWY', '#f4ecd6', '#1d1f22'], ['FIOLETOWI', '#6b3fa8', '#f4ecd6'], ['SOLANKI', '#2b6cc4', '#f4ecd6'], ['GOL!', '#e2a73f', '#1d1f22']];
for (let i = 0; i < 8; i++) { const [t, b, f] = BOARDS[i % BOARDS.length]; const m = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 0.3), [lam({ color: '#333' }), lam({ color: '#333' }), lam({ color: '#333' }), lam({ color: '#333' }), lam({ map: boardTex(t, b, f) }), lam({ color: '#333' })]); m.position.set(-31.5 + i * 9, 0.55, -PZ - 3); m.castShadow = true; scene.add(m); }
{
  // the stands: stepped tiers of seats, each tier's face printed with a row of supporters (Cuiavia green and black,
  // the visitors in purple, neutrals); a stand on every side, the near one at the bottom of the frame, out of focus
  const SKINS = ['#f1c9a0', '#e3b088', '#c98f62', '#8a5a3a', '#f6d7b8'], SHIRTS = ['#1d1f22', '#3fbf55', '#1d1f22', '#3fbf55', '#6b3fa8', '#a46ee8', '#f4ecd6', '#c84b3a', '#2b6cc4', '#e2a73f', '#7a7f88'];
  const crowdTex = (seed) => tex(192, 24, (g) => {
    let r = seed; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    g.fillStyle = '#6d727c'; g.fillRect(0, 0, 192, 24); g.fillStyle = '#5a5f68'; g.fillRect(0, 20, 192, 4);
    for (let x = 1; x < 190; x += 4 + (rnd() * 2 | 0)) { if (rnd() < 0.08) continue;
      const y = 6 + (rnd() * 3 | 0), up = rnd() < 0.18, shirt = SHIRTS[rnd() * SHIRTS.length | 0];
      g.fillStyle = shirt; g.fillRect(x - 1, y + 4, 5, 10);
      g.fillStyle = SKINS[rnd() * SKINS.length | 0]; g.fillRect(x, y, 3, 4); if (up) { g.fillRect(x - 2, y - 3, 1, 5); g.fillRect(x + 4, y - 3, 1, 5); }
      g.fillStyle = ['#2a1a10', '#4a2e18', '#c9a060', '#111', '#6b4224'][rnd() * 5 | 0]; g.fillRect(x, y - 1, 3, 1);
      if (rnd() < 0.12) { g.fillStyle = rnd() < 0.6 ? '#3fbf55' : '#f4ecd6'; g.fillRect(x - 3, y + 1, 9, 2); }   // a scarf held up
    }
  }, { repeat: [5, 1] });
  const CROWDS = [crowdTex(7), crowdTex(19), crowdTex(41)];
  const seat = lam({ color: '#80858f' }), top = lam({ color: '#2f5fae' }), seatFront = lam({ map: tex(16, 8, (g) => { g.fillStyle = '#6b7280'; g.fillRect(0, 0, 16, 8); g.fillStyle = '#2f5fae'; for (let x = 1; x < 16; x += 4) g.fillRect(x, 1, 3, 4); }, { repeat: [60, 1] }) });
  function stand(cx, cz, rotY, len, rows, { rise = 1.25, depth = 1.7, roof = true, from = 0 } = {}) {
    const g = new THREE.Group();
    for (let r = 0; r < rows; r++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, rise, depth), [seat, seat, top, seat, seatFront, seat]); TIERS.push({ g, r, len, rise, depth, from });
      m.position.set(0, from + rise / 2 + r * rise, -r * depth); m.receiveShadow = true; g.add(m);
    }
    if (roof) { const rf = new THREE.Mesh(new THREE.BoxGeometry(len + 2, 0.5, rows * depth + 3), lam({ color: '#2b6cc4' })); rf.position.set(0, from + rows * rise + 3.2, -(rows - 1) * depth / 2 - 0.5); rf.castShadow = true; g.add(rf);
      for (const x of [-len / 2 + 1, -len / 6, len / 6, len / 2 - 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, rows * rise + 3.2, 0.4), lam({ color: '#ddd' })); p.position.set(x, from + (rows * rise + 3.2) / 2, -(rows - 1) * depth); g.add(p); } }
    g.position.set(cx, 0, cz); g.rotation.y = rotY; scene.add(g);
  }
  stand(0, -PZ - 6, 0, 96, 9);                                         // the main stand across the pitch
  stand(PX + 8, 0, -Math.PI / 2, 56, 7, { roof: false });             // behind each goal
  stand(-PX - 8, 0, Math.PI / 2, 56, 7, { roof: false });
  stand(0, PZ + 6.5, Math.PI, 110, 4, { roof: false, rise: 1.1 });    // the near side
  // ---- the crowd: the user's fans as sprites on every tier, fixed in the stands, bouncing (harder after a goal) ----
  {
    const fanTex = new THREE.Texture(IMG_FANS); fanTex.magFilter = THREE.NearestFilter; fanTex.minFilter = THREE.NearestFilter; fanTex.generateMipmaps = false; fanTex.colorSpace = THREE.SRGBColorSpace; fanTex.needsUpdate = true;
    const spots = [];
    for (const T of TIERS) {
      const { g, r, len, rise, depth, from } = T; g.updateMatrixWorld(true);
      for (let x = -len / 2 + 0.5; x < len / 2 - 0.4; x += 0.62 + Math.random() * 0.12) {
        if (Math.random() < 0.07) continue;
        const v = new THREE.Vector3(x + (Math.random() - 0.5) * 0.15, from + (r + 1) * rise, -r * depth + 0.15 + Math.random() * 0.25); g.localToWorld(v);
        spots.push({ v, yaw: CAM_YAW });   // turned to the camera, like the players
      }
    }
    const N = spots.length, geo = new THREE.InstancedBufferGeometry(), base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
    geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
    const ipos = new Float32Array(N * 3), rect = new Float32Array(N * 4), size = new Float32Array(N * 2), phase = new Float32Array(N), yaw = new Float32Array(N);
    const FW = EX.fansW, FH = EX.fansH, K = 1.45 / 30;
    spots.forEach((s, i) => { const f = EX.fans[Math.random() * EX.fans.length | 0];
      ipos.set([s.v.x, s.v.y, s.v.z], i * 3); rect.set([f[0] / FW, 1 - (f[1] + f[3]) / FH, f[2] / FW, f[3] / FH], i * 4); size.set([f[2] * K, f[3] * K], i * 2); phase[i] = Math.random(); yaw[i] = s.yaw; });
    geo.setAttribute('ipos', new THREE.InstancedBufferAttribute(ipos, 3)); geo.setAttribute('rect', new THREE.InstancedBufferAttribute(rect, 4));
    geo.setAttribute('isize', new THREE.InstancedBufferAttribute(size, 2)); geo.setAttribute('phase', new THREE.InstancedBufferAttribute(phase, 1)); geo.setAttribute('iyaw', new THREE.InstancedBufferAttribute(yaw, 1));
    geo.instanceCount = N;
    FANS.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: fanTex }, time: { value: 0 }, cheer: { value: 0 } },
      vertexShader: `
        attribute vec3 ipos; attribute vec4 rect; attribute vec2 isize; attribute float phase; attribute float iyaw; uniform float time, cheer; varying vec2 vUv; varying float vShade;
        void main(){
          float hop = max(0.0, sin(time * (2.5 + phase * 3.0 + cheer * 4.0) + phase * 40.0));
          float bob = hop * (0.05 + phase * 0.06 + cheer * 0.45);
          vec3 p = vec3(position.x * isize.x, position.y * isize.y + bob, 0.0);
          float c = cos(iyaw), s = sin(iyaw); p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
          vUv = rect.xy + uv * rect.zw; vShade = 0.78 + phase * 0.22;
          gl_Position = projectionMatrix * viewMatrix * vec4(ipos + p, 1.0);
        }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vShade; void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard; gl_FragColor = vec4(c.rgb * vShade, 1.0); }`,
    });
    const crowd = new THREE.Mesh(geo, FANS.mat); crowd.frustumCulled = false; scene.add(crowd);
  }
  // ---- flags waving in the stands; two of them up front, always sharp ----------------------------------------------
  {
    const mk = (i, x, y, z, w, sharp) => {
      const img = IMG_FLAGS[i % IMG_FLAGS.length], t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
      const h = w * img.height / img.width, geo = new THREE.PlaneGeometry(w, h, 18, 8);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, fog: false }));
      m.position.set(x, y + h / 2, z); scene.add(m);
      FLAGS.push({ m, base: Float32Array.from(geo.attributes.position.array), w, ph: Math.random() * 6, sp: 3 + Math.random() * 2 });
    };
    for (let k = 0; k < 9; k++) { const r = 1 + (k * 3) % 8; mk(k, -40 + k * 10 + Math.random() * 3, r * 1.25 + 1.2, -PZ - 6 - r * 1.7 + 0.3, 4.2, false); }
    for (const [x, z, a] of [[PX + 8, -10, 1], [PX + 8, 12, 4], [-PX - 8, -6, 2], [-PX - 8, 9, 5]]) mk(a, x, 3.5, z, 3.6, false);
    mk(4, -15, 1.3, -PZ - 5.2, 5.2, true); mk(0, 17, 1.3, -PZ - 5.2, 4.6, true);
  }
  // ---- flares in the stands: a burning red core, sparks and a slow drift of smoke (more of them after a goal) ------
  {
    const gt = document.createElement('canvas'); gt.width = gt.height = 64; const gg = gt.getContext('2d'), gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
    GLOW = new THREE.CanvasTexture(gt); GLOW.colorSpace = THREE.SRGBColorSpace;
    const st = document.createElement('canvas'); st.width = st.height = 64; const sg = st.getContext('2d'), sr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    sr.addColorStop(0, 'rgba(255,255,255,.9)'); sr.addColorStop(0.6, 'rgba(255,255,255,.35)'); sr.addColorStop(1, 'rgba(255,255,255,0)'); sg.fillStyle = sr; sg.fillRect(0, 0, 64, 64);
    const SMOKE = new THREE.CanvasTexture(st);
    const spots = [[-30, 3], [-8, 6], [12, 2], [34, 5], [-20, 8], [24, 8]].map(([x, r]) => new THREE.Vector3(x, (r + 1) * 1.25 + 1.0, -PZ - 6 - r * 1.7 + 0.2))
      .concat([[PX + 8 + 4 * 1.7, 4, -6], [-PX - 8 - 3 * 1.7, 3, 7]].map(([x, r, z]) => new THREE.Vector3(x, (r + 1) * 1.25 + 1.0, z)));
    const add = (blend) => new THREE.MeshBasicMaterial({ map: GLOW, color: '#ff3a1a', transparent: true, depthWrite: false, blending: blend, fog: false });
    for (const [i, v] of spots.entries()) {
      const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add(THREE.AdditiveBlending)); core.position.copy(v); scene.add(core);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add(THREE.AdditiveBlending)); halo.material.color.set('#ff5a2a'); halo.position.copy(v); scene.add(halo);
      FLARES.push({ v, core, halo, on: i < 4, ph: Math.random() * 9, light: null, smokeT: 0 });
    }
    for (const f of FLARES.slice(0, 3)) { f.light = new THREE.PointLight('#ff4a20', 8, 14, 1.6); f.light.position.copy(f.v).add(new THREE.Vector3(0, 0.5, 1)); scene.add(f.light); }
    for (let i = 0; i < 140; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: SMOKE, color: '#d9d4d0', transparent: true, depthWrite: false, opacity: 0, fog: false }));
      m.visible = false; scene.add(m); SMOKES.push({ m, life: 0, max: 1, vx: 0, vy: 0, s: 1 }); }
  }
  // ---- floodlights: two masts in the far corners and a row of lamps under the main roof, each throwing a shaft of light ----
  {
    const beamMat = new THREE.ShaderMaterial({
      uniforms: { k: { value: 0.09 }, col: { value: new THREE.Color('#fff4d6') } },
      vertexShader: 'varying float vY; varying float vF; void main(){ vY = uv.y; vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; uniform vec3 col; varying float vY; varying float vF; void main(){ float a = k * (0.35 + 0.65 * vY) * pow(vF, 0.9); gl_FragColor = vec4(col, a); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const poolMat = new THREE.MeshBasicMaterial({ map: GLOW, color: '#fff2cc', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.12, fog: false });
    LIGHTS.beam = beamMat; LIGHTS.pool = poolMat;
    const lampMat = new THREE.MeshBasicMaterial({ color: '#fffbe8' }), glowMat = new THREE.MeshBasicMaterial({ map: GLOW, color: '#fff3c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const beam = (from, to, r) => {
      const d = new THREE.Vector3().subVectors(from, to), L = d.length(), cone = new THREE.Mesh(new THREE.ConeGeometry(r, L, 28, 1, true), beamMat);
      cone.position.copy(from).add(to).multiplyScalar(0.5); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); scene.add(cone);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 28), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(to.x, 0.04, to.z); scene.add(pool);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), glowMat); g.position.copy(from); scene.add(g); LIGHTS.glows.push(g);
    };
    for (const s of [-1, 1]) {
      const x = s * (PX + 15), z = -PZ - 17, h = 27;
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), lam({ color: '#c9ced6' })); mast.position.set(x, h / 2, z); scene.add(mast);
      const head = new THREE.Group(); head.position.set(x, h + 1.4, z);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 0.6), lam({ color: '#5a606a' })); head.add(frame);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), lampMat); l.position.set(-2.4 + i * 1.6, -0.7 + j * 1.4, 0.31); head.add(l); }
      head.lookAt(0, 0, 0); scene.add(head);
      const from = new THREE.Vector3(x, h + 1.4, z);
      beam(from, new THREE.Vector3(s * 14, 0, -4), 7); beam(from, new THREE.Vector3(s * 4, 0, 6), 6.5);
    }
    const roofY = 9 * 1.25 + 3.2 - 0.4, roofZ = -PZ - 6 + 1.4;
    for (const x of [-36, -18, 0, 18, 36]) { const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.8), lampMat); box.position.set(x, roofY, roofZ); scene.add(box);
      beam(new THREE.Vector3(x, roofY - 0.2, roofZ + 0.3), new THREE.Vector3(x * 0.9, 0, -9), 4.6); }
  }
  // ---- the crowd in front of the camera: heads and shoulders in the bottom corners. They ride with the camera only
  // so that they stay in front of it; the picture slides the other way as the camera pans, so they hold their place
  // in the stand like the rest of the crowd
  {
    scene.add(camera);
    for (const side of [-1, 1]) {
      const t = new THREE.Texture(IMG_FRONT); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(1.3, 1); t.offset.x = side > 0 ? 0.37 : 0; t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, fog: false, depthTest: false }));
      m.renderOrder = -1; camera.add(m); FRONT.push({ m, t, side, base: t.offset.x });
    }
  }
  // ---- the card display: after a goal the main stand turns white cards over to spell GOAL! ------------------------
  {
    const FONT = { G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
      A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'], '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'] };
    const word = 'GOAL!', cols = word.length * 6 + 3, rows = 9, on = [];
    for (let r = 0; r < rows; r++) { on.push([]); for (let c = 0; c < cols; c++) { const lr = rows - 1 - r - 1, lc = c - 2, li = Math.floor(lc / 6), lx = lc % 6;
      on[r].push(lr >= 0 && lr < 7 && li >= 0 && li < word.length && lx < 5 && FONT[word[li]][lr][lx] === '1'); } }
    const N = rows * cols, mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.98, 1.0), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: false }), N);
    mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh); toPlay(mesh);
    const cells = []; const sx = -cols * 1.0 / 2 + 0.5;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c, x: sx + c * 1.0, y: (r + 1) * 1.25 + 0.75, z: -PZ - 6 - r * 1.7 + 0.55, white: on[r][c] });
    CARDS.mesh = mesh; CARDS.cells = cells;
  }

  // the dugouts beside the stand
  for (const x of []) { const d = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 2), [lam({ color: '#cfd7e0' }), lam({ color: '#cfd7e0' }), lam({ color: '#2b6cc4' }), lam({ color: '#cfd7e0' }), lam({ color: '#3a4450' }), lam({ color: '#cfd7e0' })]); d.position.set(x, 1.2, -PZ - 1.8); d.castShadow = true; scene.add(d); }
  // the town: blocks with windows, trees, floodlights
  const win = tex(16, 16, (g) => { g.fillStyle = '#e8d9b8'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#6f8fb0'; for (const x of [2, 9]) for (const y of [2, 9]) g.fillRect(x, y, 5, 5); g.fillStyle = '#c9b990'; g.fillRect(0, 15, 16, 1); }, { repeat: [1, 1] });
  for (let i = 0; i < 9; i++) { const w = 10 + Math.random() * 8, h = 8 + Math.random() * 12, t = win.clone(); t.repeat.set(w / 3, h / 3); t.needsUpdate = true;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), lam({ map: t })); b.position.set(-70 + i * 17 + Math.random() * 4, h / 2, -PZ - 24 - Math.random() * 8); scene.add(b); }
  const leaf = lam({ color: '#3f7f3a', flatShading: true }), trunk = lam({ color: '#6b4a2c' });
  for (let i = 0; i < 22; i++) { const x = -70 + i * 6.6 + Math.random() * 3, z = -PZ - 16 - Math.random() * 5, s = 1 + Math.random() * 0.6;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2 * s, 5), trunk); t.position.set(x, s, z); scene.add(t);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 * s, 0), leaf); c.position.set(x, 2.6 * s + 1, z); c.castShadow = true; scene.add(c); }
  for (const x of [-46, 46]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 18, 0.6), lam({ color: '#cfd3d8' })); p.position.set(x, 9, -PZ - 8); scene.add(p);
    const l = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.6), lam({ color: '#f6f2d8', emissive: '#7a7560' })); l.position.set(x, 18, -PZ - 8); scene.add(l); }
  // near-side trees and a fence: big, blurred, at the bottom edge of the frame
  for (let i = 0; i < 0; i++) { const x = -60 + i * 9 + Math.random() * 3, z = PZ + 9 + Math.random() * 3; const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 0), leaf); c.position.set(x, 3, z); scene.add(c); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 5), trunk); t.position.set(x, 1, z); scene.add(t); }
  const fence = tex(8, 8, (g) => { g.fillStyle = '#9aa3ab'; for (let i = 0; i < 8; i++) { g.fillRect(i, i, 1, 1); g.fillRect(7 - i, i, 1, 1); } }, { repeat: [60, 1.2] });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(130, 3), new THREE.MeshLambertMaterial({ map: fence, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })); f.position.set(0, 1.5, PZ + 6);
}
// the goals: white posts and a net of a grid texture on four sides
const netTex = tex(16, 16, (g) => { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); }, { repeat: [1, 1] });
function goal(s) {
  const grp = new THREE.Group(), post = lam({ color: '#f7f7f2' });
  const bar = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), post); m.position.set(x, y, z); m.castShadow = true; grp.add(m); };
  bar(0.3, GOAL_H, 0.3, 0, GOAL_H / 2, -GOAL_W / 2); bar(0.3, GOAL_H, 0.3, 0, GOAL_H / 2, GOAL_W / 2); bar(0.3, 0.3, GOAL_W + 0.3, 0, GOAL_H, 0);
  const net = (w, h, rep) => { const t = netTex.clone(); t.repeat.set(...rep); t.needsUpdate = true; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })); };
  const back = net(GOAL_W, GOAL_H, [GOAL_W * 2, GOAL_H * 2]); back.rotation.y = Math.PI / 2; back.position.set(s * GOAL_D, GOAL_H / 2, 0); grp.add(back);
  const top = net(GOAL_D, GOAL_W, [GOAL_D * 2, GOAL_W * 2]); top.rotation.x = -Math.PI / 2; top.position.set(s * GOAL_D / 2, GOAL_H, 0); grp.add(top);
  for (const z of [-GOAL_W / 2, GOAL_W / 2]) { const side = net(GOAL_D, GOAL_H, [GOAL_D * 2, GOAL_H * 2]); side.position.set(s * GOAL_D / 2, GOAL_H / 2, z); grp.add(side); }
  grp.position.x = s * PX; scene.add(grp);
}
goal(-1); goal(1);
for (const [x, z] of [[-PX, -PZ], [PX, -PZ], [-PX, PZ], [PX, PZ]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2, 0.12), lam({ color: '#eee' })); p.position.set(x, 1, z); scene.add(p); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), lam({ color: '#3fbf55', side: THREE.DoubleSide })); f.position.set(x + 0.4, 1.75, z); scene.add(f); }

// ---- sprites: flat figures standing on the pitch, turned to face the camera -------------------------------------------
function makeSprite(img, { lean = LEAN } = {}) {
  const t = new THREE.Texture(img); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, fog: false });
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);    // the origin at the feet
  const mesh = new THREE.Mesh(geo, mat);
  const root = new THREE.Group(); root.add(mesh); root.rotation.x = -lean;   // square to the camera's view
  const holder = new THREE.Group(); holder.add(root); holder.rotation.y = CAM_YAW; scene.add(holder); toPlay(holder);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.62, 12), new THREE.MeshBasicMaterial({ color: '#163a12', transparent: true, opacity: 0.42, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.scale.y = 0.55; scene.add(blob); toPlay(blob);
  const smat = new THREE.MeshBasicMaterial({ map: t, color: '#0b2a08', transparent: true, opacity: 0.32, alphaTest: 0.5, depthWrite: false, fog: false });
  const shadow = new THREE.Mesh(geo, smat); const sgrp = new THREE.Group(), sarm = new THREE.Group(); sarm.rotation.x = -Math.PI / 2; sarm.add(shadow); sgrp.add(sarm); sgrp.rotation.y = -0.8; scene.add(sgrp); toPlay(sgrp);
  const W = img.width, H = img.height;
  return {
    holder, root, mesh, blob, mat, sgrp, shadow, cur: null, flip: false,
    show(f, flip = false, flat = false) {    // f = [x, y, w, h, anchorX]; flat: a lying frame, anchored at its centre
      if (this.cur === f && this.flip === flip && this.flat === flat) return;
      const [x, y, w, h, ax] = f; t.repeat.set(w / W, h / H); t.offset.set(x / W, 1 - (y + h) / H);
      mesh.scale.set(w * UNIT * (flip ? -1 : 1), h * UNIT, 1);
      mesh.position.x = (flat ? 0 : (w / 2 - ax)) * UNIT * (flip ? -1 : 1);
      shadow.scale.set(mesh.scale.x, mesh.scale.y * (flat ? 0.35 : 0.62), 1); shadow.position.x = mesh.position.x;
      this.cur = f; this.flip = flip; this.flat = flat;
    },
  };
}
// a small pixel label over a sprite: the captain's "1", the dizzy stars
const pixTex = (rows, colors) => tex(rows[0].length, rows.length, (g) => rows.forEach((r, y) => [...r].forEach((c, x) => { if (colors[c]) { g.fillStyle = colors[c]; g.fillRect(x, y, 1, 1); } })));
const ONE = pixTex(['.kkk.', 'kwwk.', '.kwk.', '.kwk.', '.kwk.', 'kwwwk', 'kkkkk'], { k: '#111', w: '#fff' });
const STAR = pixTex(['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'], { y: '#ffe14a' });
const label = (t, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, fog: false, depthTest: false })); m.renderOrder = 5; scene.add(m); toPlay(m); return m; };

// ---- players and the ball ------------------------------------------------------------------------------------------
const players = [];
TEAMS.forEach((T, ti) => T.squad.forEach((def) => {
  const p = { ...def, team: ti, T, anim: FR[def.sheet], pose: { ...FR.poses, ...(FR['poses_' + def.sheet] || {}) }, id: players.length, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, face: T.dir,
    st: 'run', t: 0, act: null, lie: 'lieBack', dizzy: false, walked: 0, hold: 0, dash: false, cool: 0, order: null, autoSuper: false, sta: 1 };
  if (p.keeper) p.home = [1.6, 0];
  p.spr = makeSprite(T.img);
  p.stars = [0, 1, 2].map(() => { const m = label(STAR, 0.34, 0.34); m.visible = false; return m; });
  players.push(p);
}));
for (const p of players) p.spd = p.stats ? 0.9 + p.stats.sp * 0.035 : 1;
let captain = players.find((p) => p.captain);
// the captain picked in the locker room: he takes the middle (FW slot, kick-offs, penalties); the rest fill the others,
// the best defender at the back
function setCaptain(num) {
  const sq = players.filter((p) => p.team === 0 && !p.keeper), c = sq.find((p) => p.num === num) || sq.find((p) => p.num === 27);
  for (const p of sq) p.captain = false; Object.assign(c, { captain: true, role: 'fwd', pos: 'FW', home: [26, 0] });
  const rest = sq.filter((p) => p !== c).sort((a, b) => b.stats.ob - a.stats.ob);
  Object.assign(rest[0], { role: 'def', pos: 'DF', home: [9, 0] }); Object.assign(rest[1], { role: 'mid', pos: 'MF', home: [19, -8] }); Object.assign(rest[2], { role: 'mid', pos: 'MF', home: [19, 8] });
  captain = c;
}   // the player you steer now: switches itself to the team-mate nearest the ball
let switchT = 0;
const ARROW = pixTex(['kkkkkkkkk', 'kyyyyyyyk', 'kyyyyyyyk', '.kyyyyyk.', '..kyyyk..', '...kyk...', '....k....'], { k: '#111', y: '#ffe14a' });
const capMark = label(ARROW, 0.95, 0.74);
const capRing = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.95, 24), new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0.9, depthWrite: false }));
capRing.rotation.x = -Math.PI / 2; capRing.scale.y = 0.6; scene.add(capRing); toPlay(capRing);
// the ball's marker: a dashed pixel ring that spins on the grass under the ball; it widens as the ball flies higher
const BRING = tex(32, 32, (g) => { for (let a = 0; a < 6.283; a += 0.02) { const seg = Math.floor(a / (6.283 / 8)); if (seg % 2) continue;
  const x = Math.round(16 + Math.cos(a) * 12), y = Math.round(16 + Math.sin(a) * 12); g.fillStyle = '#111'; g.fillRect(x - 3, y - 3, 6, 6); }
  for (let a = 0; a < 6.283; a += 0.02) { const seg = Math.floor(a / (6.283 / 8)); if (seg % 2) continue; const x = Math.round(16 + Math.cos(a) * 12), y = Math.round(16 + Math.sin(a) * 12); g.fillStyle = '#fff'; g.fillRect(x - 2, y - 2, 4, 4); } });
const ballRing = new THREE.Group(); { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: BRING, transparent: true, alphaTest: 0.4, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; ballRing.add(m); ballRing.mat = m.material; scene.add(ballRing); toPlay(ballRing); toPlay(m); }
const ballSpr = (() => { const s = makeSprite(IMG_G); s.sgrp.visible = false; const b = FR.ball; s.show([b[0], b[1], b[2], b[3], b[2] / 2]); s.blob.scale.set(0.45, 0.25, 1); return s; })();
const ball = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, owner: null, last: null, lastT: 0, sup: null, spin: 0, hot: 0 };

// effects: little square pixels that fly, fade and fall
const FX = (() => {
  const pool = [], geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 160; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#fff', fog: false })); m.visible = false; scene.add(m); toPlay(m); pool.push({ m, life: 0, vx: 0, vy: 0, vz: 0, g: 0 }); }
  let k = 0;
  const PAL = { fire: ['#ffd23f', '#ff8a1f', '#e8361f', '#fff3a0'], zigzag: ['#7fe3ff', '#ffffff', '#ffe14a', '#3aa0ff'], tornado: ['#ffffff', '#cde9f5', '#9fd3e8', '#e6f7ff'], curve: ['#ffe14a', '#ff7ac8', '#ffffff', '#7affb0'], goal: ['#3fbf55', '#f4ecd6', '#1d1f22', '#ffe14a'], goal2: ['#a46ee8', '#f4ecd6', '#4a2a78', '#ffe14a'], dust: ['#d9caa0', '#bfae84', '#e8dcc0'] };
  return {
    emit(kind, x, y, z, n = 1, sp = 1.5, size = 0.22, grav = 0) {
      for (let i = 0; i < n; i++) { const p = pool[k++ % pool.length]; const c = PAL[kind] || PAL.dust;
        p.m.material.color.set(c[(Math.random() * c.length) | 0]); p.m.visible = true; p.m.position.set(x, y, z); p.m.scale.setScalar(size * (0.6 + Math.random() * 0.8));
        p.life = 0.35 + Math.random() * 0.4; p.vx = (Math.random() - 0.5) * sp * 2; p.vy = Math.random() * sp * 1.5; p.vz = (Math.random() - 0.5) * sp * 2; p.g = grav; }
    },
    update(dt) { for (const p of pool) { if (!p.m.visible) continue; p.life -= dt; if (p.life <= 0) { p.m.visible = false; continue; } p.vy -= p.g * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; } },
    clear() { for (const p of pool) p.m.visible = false; for (const q of lines) q.m.visible = false; },
    streak(x, y, z, dir) { const q = lines[li++ % lines.length]; q.m.visible = true; q.m.position.set(x - dir * 0.4, y, z); q.m.quaternion.copy(camera.quaternion); q.m.scale.set(0.6 + Math.random() * 0.8, 1, 1); q.life = 0.22; q.dir = dir; q.m.material.opacity = 0.85; },
    lines: () => lines,
  };
})();
const lines = [], lineGeo = new THREE.PlaneGeometry(1, 0.055); let li = 0;
for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false, fog: false })); m.visible = false; scene.add(m); toPlay(m); lines.push({ m, life: 0, dir: 1 }); }

// ---- weather: autumn leaves blowing across, or rain (darker sky, wet colours, splashes) ----------------------------
const WX = (() => {
  const leaves = [], LC = ['#d9822b', '#c4562a', '#e6b43a', '#9a5a2a', '#b9c24a'];
  const leafTex = pixTex(['..gg..', '.gggg.', 'gggggg', '.gggg.', '..k...'], { g: '#fff', k: '#fff' });
  for (let i = 0; i < 46; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), new THREE.MeshBasicMaterial({ map: leafTex, color: LC[i % LC.length], transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, fog: false }));
    m.visible = false; scene.add(m); toPlay(m); leaves.push({ m, x: 0, y: 0, z: 0, vx: 0, vy: 0, ph: Math.random() * 6, sp: 2 + Math.random() * 4 }); }
  const N = 420, pos = new Float32Array(N * 6), drops = [];
  const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({ color: '#cfe3f5', transparent: true, opacity: 0.55, fog: false })); rain.frustumCulled = false; rain.visible = false; scene.add(rain); toPlay(rain);
  // a faint red and blue ghost of every drop, a little to each side: the same chromatic split as the stadium
  const ghosts = [['#ff5a6a', -0.07], ['#4ab8ff', 0.07]].map(([c, dx]) => { const g = new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.28, fog: false, depthWrite: false }));
    g.frustumCulled = false; g.visible = false; g.position.x = dx; scene.add(g); toPlay(g); return g; });
  for (let i = 0; i < N; i++) drops.push({ x: 0, y: 0, z: 0, v: 22 + Math.random() * 10 });
  let mode = 'leaves';
  const box = () => ({ x: cam.x, z: cam.z });
  const resetLeaf = (l, any) => { const b = box(); l.x = b.x - 30 + (any ? Math.random() * 60 : 0); l.z = b.z - 16 + Math.random() * 30; l.y = 1 + Math.random() * 9; l.vx = 3 + Math.random() * 3; l.vy = -0.6 - Math.random() * 0.8; };
  const resetDrop = (d, any) => { const b = box(); d.x = b.x - 30 + Math.random() * 60; d.z = b.z - 18 + Math.random() * 34; d.y = any ? Math.random() * 16 : 14 + Math.random() * 4; };
  return {
    set(m) {
      mode = m; for (const l of leaves) { l.m.visible = m === 'leaves'; resetLeaf(l, true); } rain.visible = m === 'rain'; for (const g of ghosts) g.visible = rain.visible; for (const d of drops) resetDrop(d, true);
      scene.background.set(m === 'rain' ? '#7d8b98' : '#9fd3f2'); scene.fog.color.set(m === 'rain' ? '#8f9ba6' : '#c5e3f2'); scene.fog.near = m === 'rain' ? 50 : 90; if (LIGHTS.beam) { LIGHTS.beam.uniforms.k.value = m === 'rain' ? 0.12 : 0.09; LIGHTS.pool.opacity = m === 'rain' ? 0.3 : 0.14; }
      for (const o of scene.children) if (o.isDirectionalLight) o.intensity = m === 'rain' ? 1.1 : 2.6; else if (o.isHemisphereLight) o.intensity = m === 'rain' ? 1.5 : 2.0;
    },
    update(dt, t) {
      if (mode === 'leaves') for (const l of leaves) {
        l.x += (l.vx + Math.sin(t * 0.7 + l.ph) * 1.5) * dt; l.y += (l.vy + Math.sin(t * l.sp + l.ph) * 0.8) * dt; l.z += Math.cos(t * 1.3 + l.ph) * 0.6 * dt;
        if (l.y < 0.05) { l.y = 0.05; l.vx *= 0.97; } if (l.x > cam.x + 32 || (l.y <= 0.05 && Math.random() < dt * 0.4)) resetLeaf(l, false);
        l.m.position.set(l.x, l.y, l.z); l.m.quaternion.copy(camera.quaternion); l.m.rotateZ(t * l.sp + l.ph); l.m.rotateY(Math.sin(t * 3 + l.ph));
      }
      if (mode === 'rain') { for (let i = 0; i < N; i++) { const d = drops[i]; d.y -= d.v * dt; d.x += 3 * dt; if (d.y < 0) { if (Math.random() < 0.06) FX.emit('dust', d.x, 0.05, d.z, 1, 0.6, 0.12, 3); resetDrop(d, false); }
          pos.set([d.x, d.y, d.z, d.x - 0.12, d.y + 0.9, d.z], i * 6); } rgeo.attributes.position.needsUpdate = true; }
    },
  };
})();
function setWeather(m) { WX.set(m); ui.weather?.(m); }
// the stands move: flags ripple, fans bounce (hard after a goal), the card display flips over
function updateStands(dt, t) {
  for (const f of FLAGS) { const pos = f.m.geometry.attributes.position, b = f.base, w = f.w;
    for (let i = 0; i < pos.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], u = Math.max(0, (x + w / 2) / w - 0.1);
      pos.array[i * 3 + 2] = Math.sin(t * f.sp + u * 7 + f.ph) * 0.45 * u; pos.array[i * 3 + 1] = y + Math.sin(t * f.sp * 0.7 + u * 5 + f.ph) * 0.12 * u; }
    pos.needsUpdate = true; }
  G.flares = Math.max(0, (G.flares || 0) - dt * 0.6);
  FLARES.forEach((f, i) => { const on = f.on || i < 4 + Math.ceil(G.flares) - 1 && G.flares > 0.3;
    f.core.visible = f.halo.visible = on; if (f.light) f.light.intensity = on ? 6 + Math.sin(t * 23 + f.ph) * 2 + Math.random() * 2 : 0;
    if (!on) return; const fl = 0.85 + Math.sin(t * 31 + f.ph) * 0.1 + Math.random() * 0.12;
    f.core.scale.setScalar(1.3 * fl); f.halo.scale.setScalar(5 * fl); if (Math.random() < 0.5) FX.emit('fire', f.v.x + (Math.random() - 0.5) * 0.4, f.v.y + 0.2, f.v.z, 1, 1.2, 0.14, 2); f.core.quaternion.copy(camera.quaternion); f.halo.quaternion.copy(camera.quaternion);
    f.smokeT -= dt; if (f.smokeT <= 0) { f.smokeT = 0.12; const sm = SMOKES.find((q) => !q.m.visible); if (sm) { sm.m.visible = true; sm.m.position.copy(f.v).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.4, 0)); sm.life = 0; sm.max = 2.6 + Math.random() * 1.4; sm.vx = 0.5 + Math.random() * 0.5; sm.vy = 1.0 + Math.random() * 0.6; sm.s = 0.8; } } });
  for (const q of SMOKES) { if (!q.m.visible) continue; q.life += dt; const u = q.life / q.max; if (u >= 1) { q.m.visible = false; continue; }
    q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt * (1 - u * 0.5); const sc = q.s + u * 3.2; q.m.scale.setScalar(sc); q.m.quaternion.copy(camera.quaternion); q.m.material.opacity = Math.sin(u * Math.PI) * 0.33; }
  for (const g of LIGHTS.glows) g.quaternion.copy(camera.quaternion);
  { const d = 4, hh = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), hw = hh * camera.aspect, w = hw * 0.78, h = w * 0.42;
    for (const f of FRONT) { f.m.scale.set(w, h, 1); f.m.position.set(f.side * (hw - w / 2 + 0.05 * hw), -hh + h * 0.36, -d); f.t.offset.x = f.base + cam.x * 0.035; } }
  G.cheer = Math.max(0, (G.cheer || 0) - dt * 0.25); if (FANS.mat) { FANS.mat.uniforms.time.value = t; FANS.mat.uniforms.cheer.value = Math.min(1, G.cheer); }
  if (CARDS.mesh && CARDS.t !== undefined) {
    const k = t - CARDS.t, m = CARDS.mesh, o = new THREE.Object3D(), col = new THREE.Color();
    if (k > 4.6) { m.visible = false; CARDS.t = undefined; }
    else { m.visible = true; CARDS.cells.forEach((c, i) => {
        const d = c.c * 0.03 + c.r * 0.02, pin = Math.min(1, Math.max(0, (k - d) / 0.22)), pout = Math.min(1, Math.max(0, (k - 3.4 - d) / 0.22));
        const a = (1 - pin + pout) * Math.PI / 2; o.position.set(c.x, c.y, c.z); o.rotation.set(0, a, 0); o.scale.setScalar(pin > 0 && pout < 1 ? 1 : 0.001); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
        m.setColorAt(i, col.set(c.white ? '#ffffff' : CARDS.color)); });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
}
function updateLines(dt) { for (const q of lines) { if (!q.m.visible) continue; q.life -= dt; if (q.life <= 0) { q.m.visible = false; continue; } q.m.position.x -= q.dir * dt * 3; q.m.material.opacity = q.life / 0.22 * 0.85; } }

// ---- sound: tiny square-wave blips -----------------------------------------------------------------------------------
const SFX = (() => {
  let ac = null, muted = false;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } } if (ac?.state === 'suspended') ac.resume(); return ac; };
  const tone = (f0, f1, dur, type = 'square', vol = 0.08, delay = 0) => { const a = ctx(); if (!a || muted) return; const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02); };
  const noise = (dur, vol = 0.12) => { const a = ctx(); if (!a || muted) return; const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(), g = a.createGain(); g.gain.value = vol; s.buffer = b; s.connect(g).connect(a.destination); s.start(); };
  return {
    unlock: ctx, get muted() { return muted; }, toggle() { muted = !muted; MUSIC.mute(muted); return muted; },
    kick() { tone(220, 90, 0.08, 'square', 0.07); noise(0.05, 0.08); }, pass() { tone(440, 330, 0.06, 'square', 0.05); },
    charge(v) { tone(300 + v * 500, 300 + v * 520, 0.04, 'square', 0.025); },
    super() { tone(180, 1400, 0.35, 'sawtooth', 0.06); noise(0.4, 0.1); }, tackle() { noise(0.12, 0.14); tone(140, 60, 0.12, 'triangle', 0.1); },
    whistle() { tone(1800, 1750, 0.18, 'sine', 0.06); tone(1800, 1760, 0.3, 'sine', 0.06, 0.22); },
    goal() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 'square', 0.06, i * 0.12)); noise(1.2, 0.05); },
    save() { tone(660, 880, 0.12, 'square', 0.05); },
    pickup() { [660, 880, 1320, 1760].forEach((f, i) => tone(f, f, 0.09, 'square', 0.05, i * 0.06)); },
    menu() { tone(990, 990, 0.04, 'square', 0.04); },
    howl() { tone(320, 720, 0.5, 'sawtooth', 0.07); tone(720, 520, 0.9, 'sawtooth', 0.06, 0.5); tone(330, 740, 0.5, 'square', 0.03, 0.02); },
    roar() { noise(1.1, 0.3); tone(140, 55, 1.1, 'sawtooth', 0.14); tone(95, 40, 1.2, 'square', 0.08); },
    flame() { noise(0.7, 0.22); tone(300, 80, 0.6, 'sawtooth', 0.07); },
    thunder() { noise(1.4, 0.32); tone(90, 30, 1.0, 'sawtooth', 0.12); tone(1200, 200, 0.25, 'square', 0.05); },
  };
})();


// ---- voices: the user's recorded shouts, cut into five clips; a rival's shout is played a little lower ---------------
const VOICE = (() => {
  const raw = [];
  let bufs = null, last = -1, nextT = 0;
  const load = async (a) => { if (bufs) return; bufs = []; const ab = await Promise.all(raw); for (const b of ab) bufs.push(b ? await a.decodeAudioData(b.slice(0)).catch(() => null) : null); };
  return {
    // kind: 'super' | 'shot' | 'hit' | 'goal'; chance thins out the common ones so the shouts stay special
    say(p, kind, chance = 1) { return; const a = SFX.unlock(); if (!a || SFX.muted) return; if (!bufs) { load(a); return; }
      const now = a.currentTime; if (now < nextT && kind !== 'goal') return; if (Math.random() > chance) return;
      const pool = bufs.map((b, i) => (b && i !== last ? i : -1)).filter((i) => i >= 0); if (!pool.length) return;
      const i = kind === 'goal' && bufs[0] && last !== 0 ? 0 : pool[Math.floor(Math.random() * pool.length)]; last = i;
      const s = a.createBufferSource(), g = a.createGain(); s.buffer = bufs[i]; s.playbackRate.value = (p && p.team ? 0.86 : 1) * (0.97 + Math.random() * 0.06);
      g.gain.value = kind === 'shot' ? 0.55 : 0.75; let out = g;
      if (a.createStereoPanner && p) { const pan = a.createStereoPanner(); pan.pan.value = Math.max(-0.6, Math.min(0.6, (p.x - cam.x) / 25)); g.connect(pan); out = pan; }
      s.connect(g); out.connect(a.destination); s.start(); nextT = now + bufs[i].duration * 0.8 + 0.4; },
    prime() {},
  };
})();

// ---- music: an original chiptune loop, played live (pulse lead, pulse arpeggio, triangle bass, noise drums) -----------
const CHIP = (() => {   // the old chiptune loop, kept as a fallback

  let ac = null, on = false, muted = false, timer = 0, step = 0, next = 0, out = null, noiseBuf = null;
  const BPM = 152, STEP = 60 / BPM / 4;                                    // 16th notes
  const f = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // 8 bars, one entry per 8th note; 0 = hold the previous note, -1 = rest
  const LEAD = [76, 0, 81, 0, 84, 83, 81, 76,   77, 0, 81, 84, 0, 81, 79, 77,   76, 0, 79, 84, 0, 79, 76, 72,   74, 0, 79, 83, 86, 83, 79, 0,
                81, 0, 76, 81, 84, 0, 88, 0,    86, 84, 81, 77, 0, 81, 84, 0,   83, 0, 86, 0, 79, 0, 83, 86,    88, 0, 83, 80, 76, 0, 0, -1];
  const ROOTS = [45, 41, 48, 43, 45, 41, 43, 40];
  const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62], [57, 60, 64], [53, 57, 62], [55, 59, 62], [56, 59, 64]];
  const pulse = (a, duty) => { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); return a.createPeriodicWave(re, im); };
  let P25, P12;
  function note(type, freq, t, dur, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    if (type === 'p25') o.setPeriodicWave(P25); else if (type === 'p12') o.setPeriodicWave(P12); else o.type = type;
    o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function hit(t, dur, vol, hp) { const s = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = hp;
    s.buffer = noiseBuf; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl).connect(g).connect(out); s.start(t); s.stop(t + dur); }
  function schedule() {
    while (next < ac.currentTime + 0.25) {
      const s = step % 128, bar = s >> 4, i8 = s >> 1, t = next;
      if (s % 2 === 0) {                                                  // the lead, on 8ths, with holds
        const m = LEAD[i8]; if (m > 0) { let len = 1; while (LEAD[(i8 + len) % 64] === 0 && len < 8) len++; note('p25', f(m), t, len * STEP * 2 * 0.95, 0.035); }
        const r = ROOTS[bar], b = [r, r + 12, r, r + 12, r, r + 12, r + 7, r + 12][(s >> 1) % 8]; note('triangle', f(b), t, STEP * 1.8, 0.11);
      }
      const ch = CHORDS[bar]; note('p12', f(ch[s % 3] + 12), t, STEP * 0.9, 0.012);   // the arpeggio
      if (s % 16 === 0 || s % 16 === 10) note('triangle', 110, t, 0.09, 0.16);           // kick
      if (s % 8 === 4) hit(t, 0.12, 0.09, 1200);                                         // snare
      if (s % 2 === 0) hit(t, 0.03, 0.035, 7000);                                        // hat
      next += STEP; step++;
    }
  }
  return {
    start(context) {
      ac = context; if (!ac || on) return; on = true;
      if (!out) { out = ac.createGain(); out.gain.value = muted ? 0 : 0.9; out.connect(ac.destination); P25 = pulse(ac, 0.25); P12 = pulse(ac, 0.125);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      step = 0; next = ac.currentTime + 0.1; timer = setInterval(schedule, 60);
    },
    stop() { on = false; clearInterval(timer); },
    mute(m) { muted = m; if (out) out.gain.value = m ? 0 : 0.9; },
  };
})();
// the match music: the user's track, looped; the chiptune plays if the file cannot
const MUSIC = (() => {
  const a = new Audio('./mecz.mp3'); a.loop = true; if (window.MV) MV.reg(a, 0.45); else a.volume = 0.45; let on = false, muted = false, ok = true;
  a.addEventListener('error', () => { ok = false; });
  return {
    start(ctx) { on = true; if (!ok) { CHIP.start(ctx); return; } a.muted = muted; a.currentTime = 0; a.play().catch(() => { ok = false; CHIP.start(ctx); }); },
    stop() { on = false; a.pause(); CHIP.stop(); },
    mute(m) { muted = m; a.muted = m; CHIP.mute(m); },
  };
})();
window.MATCH_MUSIC = MUSIC;

// ---- game state ----------------------------------------------------------------------------------------------------
const ui = window.UI || {};
const G = { inv: { lightning: 0, split: 0, mega: 0, wolf: 0, dragon: 0 }, fakes: null, pu: null, ca: 0, weather: 'leaves', state: 'menu', score: [0, 0], clock: 120, half: 1, pause: 0, kickoff: 0, shake: 0, superCool: [0, 5], flash: 0, safe: 0 };
const GRAV = 30, JUMP_V = 11, APEX = 3.2;                       // a jump peaks ~0.37 s after take-off, ~2 units up
const WALK = 6.4, DASH = 11.8, AI_WALK = 5.8, AI_RUN = 7.6;
const goalX = (team) => (team === 0 ? PX : -PX);               // the goal this team attacks
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const mates = (p) => players.filter((q) => q.team === p.team && q !== p);
const grounded = (p) => p.y <= 0.001 && (p.st === 'run' || p.st === 'kick');

// ---- power-ups: a spinning pixel box on the pitch; run over it with the ball and its super shot goes into your bag ----
const POWERS = {
  lightning: { name: 'BŁYSKAWICA', col: '#ffe14a', dark: '#8a6200' },
  split: { name: 'ROZDWOJENIE', col: '#5fd8ff', dark: '#0a4a6a' },
  mega: { name: 'MEGA PIŁKA', col: '#ff6ab8', dark: '#6a0a3a' },
  wolf: { name: 'WILK', col: '#aab4c8', dark: '#252a36' },
  dragon: { name: 'SMOK', col: '#ff6a2a', dark: '#5a1408' },
};
const boxTex = (k) => tex(20, 20, (g) => { const P = POWERS[k];
  g.fillStyle = '#111'; g.fillRect(0, 0, 20, 20); g.fillStyle = P.dark; g.fillRect(1, 1, 18, 18); g.fillStyle = P.col; g.fillRect(2, 2, 16, 15);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(2, 2, 16, 2); g.fillRect(2, 2, 2, 14);
  const ink = (c, pts) => { g.fillStyle = c; for (const [x, y, w, h] of pts) g.fillRect(x, y, w, h); };
  if (k === 'lightning') { ink('#111', [[10, 3, 4, 2], [8, 5, 4, 2], [6, 7, 7, 2], [9, 9, 3, 2], [8, 11, 3, 2], [7, 13, 3, 2], [6, 15, 2, 2]]); ink('#fff', [[11, 4, 2, 1], [9, 6, 2, 1], [7, 8, 5, 1], [10, 10, 1, 1], [9, 12, 1, 1], [8, 14, 1, 1]]); }
  if (k === 'split') for (const cx of [6, 13]) { ink('#111', [[cx - 3, 7, 6, 6], [cx - 2, 6, 4, 8], [cx - 4, 8, 8, 4]]); ink('#fff', [[cx - 2, 8, 4, 4], [cx - 3, 9, 6, 2], [cx - 1, 7, 2, 6]]); ink('#111', [[cx - 1, 9, 2, 2]]); }
  // the wolf and dragon boxes show the creature's own head, cut from its frames
  const head = (f, fx, fy, fw, fh) => { g.imageSmoothingEnabled = false; const [x, y, w, h] = f; g.drawImage(IMG_C, x + w * fx, y + h * fy, w * fw, h * fh, 2, 2, 16, 15); };
  if (k === 'wolf') head(CR.wolf[12], 0.52, 0.0, 0.48, 0.5);
  if (k === 'dragon') head(CR.dragon[0], 0.48, 0.0, 0.52, 0.42);
  if (k === 'mega') { ink('#111', [[5, 4, 10, 12], [4, 5, 12, 10], [3, 7, 14, 6]]); ink('#fff', [[6, 5, 8, 10], [5, 6, 10, 8], [4, 8, 12, 4]]); ink('#111', [[9, 8, 3, 3], [6, 11, 2, 2], [12, 11, 2, 2], [7, 6, 2, 1], [12, 6, 2, 1]]); }
});
const PU = (() => {
  const T = Object.fromEntries(Object.keys(POWERS).map((k) => [k, boxTex(k)]));
  const mat = new THREE.MeshBasicMaterial({ map: T.lightning, transparent: true, alphaTest: 0.5, fog: false });
  const geo = new THREE.PlaneGeometry(1.2, 1.2); geo.translate(0, 0.6, 0);
  const box = new THREE.Mesh(geo, mat), holder = new THREE.Group(); holder.add(box); scene.add(holder); toPlay(holder);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, depthWrite: false, fog: false }));
  ring.rotation.x = -Math.PI / 2; scene.add(ring); toPlay(ring);
  const st = { kind: 'lightning', x: 0, z: 0, on: false, cool: 2.5 };
  const place = () => { const ks = Object.keys(POWERS); st.kind = ks[(Math.random() * ks.length) | 0]; mat.map = T[st.kind]; mat.needsUpdate = true;
    const s = Math.sign(goalX(0));
    for (let i = 0; i < 20; i++) { st.x = s * (2 + Math.random() * (PX - 11)); st.z = (Math.random() - 0.5) * 2 * (PZ - 5); if (Math.hypot(st.x - ball.x, st.z - ball.z) > 7) break; }
    st.on = true; };
  return { st, icons: Object.fromEntries(Object.entries(T).map(([k, x]) => [k, x.image.toDataURL()])),
    reset() { st.on = false; st.cool = 2.5; },
    update(dt, t) {
      if (!ring.material.map) { ring.material.map = BRING; ring.material.needsUpdate = true; }
      if (!st.on) { if (G.state === 'play') st.cool -= dt; if (st.cool <= 0) place(); }
      holder.visible = ring.visible = st.on; G.pu = st; if (!st.on) return;
      holder.position.set(st.x, 0.25 + Math.abs(Math.sin(t * 3)) * 0.35, st.z); holder.quaternion.copy(camera.quaternion);
      box.scale.x = Math.max(0.12, Math.abs(Math.cos(t * 3.2)));
      ring.material.color.set(POWERS[st.kind].col); ring.position.set(st.x, 0.035, st.z); ring.scale.setScalar(2.1 + Math.sin(t * 6) * 0.15); ring.rotation.z = t * 2;
      const o = ball.owner;
      if (G.state === 'play' && o && o.team === 0 && Math.hypot(o.x - st.x, o.z - st.z) < 1.5) {
        G.inv[st.kind] = Math.min(3, G.inv[st.kind] + 1); st.on = false; st.cool = 7;
        SFX.pickup(); ui.banner?.(POWERS[st.kind].name + ' +1', TEAMS[0], 'small'); ui.inv?.(G.inv); shout(o, 'Mam to!');
        FX.emit('curve', st.x, 1, st.z, 20, 4, 0.3, 6); G.ca = Math.max(G.ca, 0.9);
      }
    } };
})();
// lightning bolts from the sky: jagged pixel strokes, flickering for half a second
const BOLTS = (() => {
  const mk = () => tex(24, 128, (g) => { let x = 12; const pts = [[x, 0]]; for (let y = 8; y <= 128; y += 8) { x = Math.max(4, Math.min(20, x + (Math.random() - 0.5) * 12)); pts.push([x, y]); }
    for (const [w, c] of [[7, 'rgba(255,225,74,.55)'], [4, '#ffe14a'], [2, '#ffffff']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke(); } });
  const texs = [mk(), mk(), mk()], geo = new THREE.PlaneGeometry(2.2, 18); geo.translate(0, 9, 0);
  const pool = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texs[i % 3], transparent: true, depthTest: false, depthWrite: false, fog: false })); m.renderOrder = 6; m.visible = false; m.rotation.y = CAM_YAW; scene.add(m); toPlay(m); pool.push({ m, life: 0 }); }
  let k = 0;
  return { hit(x, z, delay = 0) { const b = pool[k++ % pool.length]; b.m.position.set(x, 0, z); b.life = 0.55 + delay; b.delay = delay; },
    update(dt) { for (const b of pool) { if (b.life <= 0) { b.m.visible = false; continue; } b.life -= dt;
      const on = b.life < 0.55; b.m.visible = on && Math.random() < 0.8; if (on && !b.fx) { b.fx = true; FX.emit('zigzag', b.m.position.x, 0.4, b.m.position.z, 14, 4, 0.3, 6); }
      if (b.life <= 0) b.fx = false; b.m.material.map = texs[(Math.random() * 3) | 0]; } } };
})();
function lightning(c) {
  ball.owner = c; c.hold = 0; G.flash = 1.5; G.shake = 0.8; G.ca = 2.4; SFX.thunder(); SFX.super();
  ui.banner?.('BŁYSKAWICA!', c.T, 'super', c); shout(c, 'Piorun!'); VOICE.say(c, 'super');
  let i = 0; for (const q of players) if (q.team !== c.team) { BOLTS.hit(q.x, q.z, i++ * 0.06); knock(q, 4.2, { lie: Math.random() < 0.5 ? 'lieBack' : 'lieFront', dizzy: true, foul: false }); }
}
// the super picker: in the air with the ball, STRZAŁ freezes the moment and you choose which super to fire
const PICK = { open: false, opts: [], sel: 0, t: 0, p: null };
function openPick(c) {
  const opts = [{ id: 'own', name: c.super.name, n: -1, col: '#ff8a1f', kind: c.super.kind }];
  for (const k in POWERS) opts.push({ id: k, name: POWERS[k].name, n: G.inv[k], col: POWERS[k].col, kind: k });
  Object.assign(PICK, { open: true, opts, sel: 0, t: 0, p: c }); G.state = 'pick'; c.vy = 0; c.vx *= 0.2; c.vz *= 0.2; ball.owner = c;
  G.ca = Math.max(G.ca, 1); SFX.charge(1); ui.picker?.(PICK);
}
function pickMove(d) { if (!PICK.open) return; const n = PICK.opts.length; let i = PICK.sel; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (PICK.opts[i].n !== 0) break; } PICK.sel = i; SFX.menu(); ui.picker?.(PICK); }
function doPick(i = PICK.sel) {
  if (!PICK.open) return; const o = PICK.opts[i]; if (!o || o.n === 0) return;
  PICK.open = false; ui.picker?.(null); G.state = 'play'; const c = PICK.p; c.act = 'volley'; c.t = 0; c.vy = Math.min(c.vy, 0);
  if (o.id === 'own') { ball.owner = null; shoot(c, 0.9, c.super); return; }
  G.inv[o.id]--; ui.inv?.(G.inv);
  if (o.id === 'lightning') { lightning(c); return; }
  if (o.id === 'wolf') { wolfStart(c); return; }
  if (o.id === 'dragon') { dragonStart(c); return; }
  ball.owner = null; shoot(c, 0.9, { name: POWERS[o.id].name, kind: o.id });
}
// a sprinter leaves a trail of fading copies of himself
const TRAIL = (() => {
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0); const pool = [];
  for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, alphaTest: 0.02, fog: false })); m.matrixAutoUpdate = false; m.visible = false; scene.add(m); toPlay(m); pool.push({ m, life: 0, maps: {} }); }
  let k = 0;
  return { spawn(p) { const g = pool[k++ % pool.length], src = p.spr.mat.map;
      const map = g.maps[p.id] || (g.maps[p.id] = src.clone()); map.offset.copy(src.offset); map.repeat.copy(src.repeat);
      g.m.material.map = map; g.m.material.color.set(p.team ? '#c08cff' : '#7dff9a'); g.m.matrix.copy(p.spr.mesh.matrixWorld); g.m.visible = true; g.life = 0.24; },
    update(dt) { for (const g of pool) { if (g.life <= 0) { g.m.visible = false; continue; } g.life -= dt; g.m.material.opacity = Math.max(0, g.life / 0.24) * 0.55; } } };
})();
// two decoy balls for ROZDWOJENIE
// ---- WILK: the captain turns into a wolf, runs at the goal with the ball, and every rival runs for his life ----
const WOLF = { on: false, p: null, t: 0, phase: '', shot: false, spr: null };
const WF = CR.wolf, WOLF_MORPH = [1, 2, 3, 4, 5, 6, 7, 8], WOLF_RUN = [8, 11, 12, 11];
function wolfStart(c) {
  if (!WOLF.spr) { WOLF.spr = makeSprite(IMG_C); }
  Object.assign(WOLF, { on: true, p: c, t: 0, phase: 'morph', shot: false }); c.wolf = true; ball.owner = c; c.hold = 0; c.vx = c.vz = 0;
  G.ca = 2.2; G.shake = 0.5; G.flash = 0.6; SFX.howl(); ui.banner?.('WILK!', c.T, 'super', c); shout(c, 'Auuuu!');
}
function wolfStep(p, dt) {    // instead of the captain's own physics while the wolf is out
  WOLF.t += dt; const gx = goalX(p.team), dir = Math.sign(gx);
  if (WOLF.phase === 'morph') { p.vx = p.vz = 0; if (WOLF.t > 0.85) { WOLF.phase = 'run'; WOLF.t = 0; G.ca = Math.max(G.ca, 1.2); } }
  else if (WOLF.phase === 'run') {
    let dx = gx - p.x, dz = (0 - p.z) * 0.7; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d; dz += input.z * 0.7;
    const l = Math.hypot(dx, dz); p.vx = dx / l * 17; p.vz = dz / l * 17; p.face = dir; ball.owner = p;
    if (Math.random() < 0.7) FX.emit('dust', p.x - dir * 0.8, 0.2, p.z, 2, 2, 0.3, 4);
    for (const q of players) if (q.team !== p.team && q.st !== 'down' && dist(q, p) < 1.5) knock(q, 2.2, { lie: 'lieBack', dizzy: true, push: [p.vx * 0.5, (q.z - p.z) * 4], by: null });
    if (Math.abs(gx - p.x) < 8 || WOLF.t > 5) { WOLF.phase = 'shot'; WOLF.t = 0; ball.owner = null; shoot(p, 1, { name: 'WILK', kind: 'fire' }); p.vx *= 0.3; p.vz *= 0.3; }
  }
  else if (WOLF.phase === 'shot') { p.vx *= 0.9; p.vz *= 0.9; if (WOLF.t > 0.9) { WOLF.phase = 'back'; WOLF.t = 0; } }
  else if (WOLF.phase === 'back') { p.vx = p.vz = 0; if (WOLF.t > 0.6) wolfEnd(); }
  p.x += p.vx * dt; p.z += p.vz * dt; p.st = 'run'; p.y = 0;
}
function wolfEnd() { if (!WOLF.on) return; WOLF.on = false; if (WOLF.p) WOLF.p.wolf = false; if (WOLF.spr) WOLF.spr.holder.visible = WOLF.spr.blob.visible = WOLF.spr.sgrp.visible = false; }
function wolfFlee(q, dt) {   // rivals scatter away from the wolf; the keeper leaves his goal too
  const w = WOLF.p, dx = q.x - w.x, dz = q.z - w.z, d = Math.hypot(dx, dz) || 1;
  if (d > 16 && !q.keeper) { ai(q, dt); return; }
  const side = Math.abs(dz) < 1.5 ? (q.id % 2 ? 1 : -1) : Math.sign(dz);
  steer(q, q.x + dx / d * 6, q.z + side * 8, dt, q.keeper ? 8 : 9.5); q.face = Math.sign(q.vx) || q.face;
  if (q.flee !== true) { q.flee = true; if (Math.random() < 0.5) shout(q, ['Aaa!', 'Ratunku!', 'Wilk!'][q.id % 3]); }
}
// ---- SMOK: a dragon swoops down holding the ball, breathes fire and the burning ball flies into a goal that catches fire ----
const DRAGON = { on: false, t: 0, c: null, x: 0, z: 0, y: 0, dir: 1, spr: null, launched: false };
const DF = CR.dragon, DR_FLY = [0, 1, 2, 3, 4, 5, 6, 7], DR_S = 1.45;
function dragonStart(c) {
  if (!DRAGON.spr) { DRAGON.spr = makeSprite(IMG_C); DRAGON.spr.sgrp.visible = false; }
  const dir = Math.sign(goalX(c.team));
  Object.assign(DRAGON, { on: true, t: 0, c, dir, x: c.x - dir * 3, z: Math.max(-PZ + 4, Math.min(PZ - 4, c.z + 5)), y: 16, launched: false });
  ball.owner = null; ball.vx = ball.vz = ball.vy = 0; ball.hidden = true; G.state = 'dragon';
  G.ca = 2; G.shake = 0.6; SFX.roar(); ui.banner?.('SMOK!', c.T, 'super', c); shout(c, 'Smoku, leć!');
  for (const q of players) if (q.team !== c.team && q.st === 'run') { q.vx *= 0.2; q.vz *= 0.2; }
}
function dragonUpdate(dt) {
  if (!DRAGON.on) return; const D = DRAGON; D.t += dt;
  if (D.t < 0.7) D.y = 16 - (16 - 0.6) * (1 - Math.pow(1 - D.t / 0.7, 3));      // swoops down from the sky
  else if (D.t > 3.0) D.y += dt * (6 + (D.t - 3) * 14);                            // and flies off
  if (D.t > 1.0 && D.t < 2.4 && Math.random() < 0.5) FX.emit('fire', D.x + D.dir * DF[11][2] * UNIT * DR_S * 0.42, D.y + DF[11][3] * UNIT * DR_S * 0.72, D.z, 2, 1.5, 0.3);
  if (!D.launched && D.t >= 2.15) {   // the fireball leaves the dragon's mouth
    D.launched = true; const c = D.c, gx = goalX(c.team);
    ball.hidden = false; ball.owner = null; const f = DF[13]; ball.x = D.x + D.dir * f[2] * UNIT * DR_S * 0.3; ball.y = D.y + f[3] * UNIT * DR_S * 0.62; ball.z = D.z;
    const tx = gx + D.dir * 0.8, ty = 1.2, tz = (Math.random() - 0.5) * 3, dx = tx - ball.x, dy = ty - ball.y, dz = tz - ball.z, d = Math.hypot(dx, dy, dz), v = 30;
    ball.vx = dx / d * v; ball.vy = dy / d * v; ball.vz = dz / d * v; ball.sup = { name: 'SMOK', kind: 'dragon', team: c.team, t: 0, ox: D.dir, by: c }; ball.last = c; ball.hot = 1;
    G.state = 'play'; G.flash = 1; G.shake = 0.9; G.ca = 2.6; SFX.flame(); SFX.super();
  }
  if (D.t > 4.2) { D.on = false; D.spr.holder.visible = D.spr.blob.visible = false; }
}
// a goal on fire: flames along the posts, the bar and the net for a few seconds
function goalFireUpdate(dt) {
  const F = G.goalFire; if (!F || F.t <= 0) return; F.t -= dt; const s = Math.sign(F.x), n = F.t > 1 ? 7 : 3;
  for (let i = 0; i < n; i++) { const r = Math.random(); let x = F.x, y, z;
    if (r < 0.3) { z = (Math.random() < 0.5 ? -1 : 1) * GOAL_W / 2; y = Math.random() * GOAL_H; }
    else if (r < 0.55) { z = (Math.random() - 0.5) * GOAL_W; y = GOAL_H; }
    else { z = (Math.random() - 0.5) * GOAL_W; y = Math.random() * GOAL_H; x = F.x + s * Math.random() * GOAL_D; }
    FX.emit('fire', x, y, z, 1, 1.6, 0.5); }
  if (Math.random() < 0.3) FX.emit('dust', F.x + s * GOAL_D * 0.5, GOAL_H + 0.5, (Math.random() - 0.5) * GOAL_W, 1, 1, 0.9, 3);
  G.ca = Math.max(G.ca, 0.35);
}
const decoySpr = [0, 1].map(() => { const s = makeSprite(IMG_G); s.sgrp.visible = false; const b = FR.ball; s.show([b[0], b[1], b[2], b[3], b[2] / 2]); s.blob.scale.set(0.45, 0.25, 1); s.holder.visible = s.blob.visible = false; return s; });
const free = (p) => p.st === 'run' || p.st === 'kick';
const shout = (p, text) => ui.shout?.(p, text);

// ---- input: a stick (keys or touch), A = pass, B = shoot, jump; a double tap or a full stick = dash -------------------
const input = { x: 0, z: 0, dash: false };
const keys = new Set(), lastTap = {};
const KEYMAP = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
let keyDash = false, padDash = false, stick = null, stickFull = 0, abT = { a: -9, b: -9 };
addEventListener('keydown', (e) => {
  if (G.state === 'pick') { e.preventDefault(); if (e.repeat) return; const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA' || c === 'ArrowUp' || c === 'KeyW') pickMove(-1); else if (c === 'ArrowRight' || c === 'KeyD' || c === 'ArrowDown' || c === 'KeyS') pickMove(1);
    else if (/^Digit[1-6]$/.test(c)) doPick(+c.slice(5) - 1); else if (['KeyK', 'KeyX', 'KeyJ', 'KeyZ', 'Space', 'Enter'].includes(c)) doPick(); return; }
  if (KEYMAP[e.code]) {
    e.preventDefault(); if (e.repeat) return;
    const d = KEYMAP[e.code].join(), now = performance.now();
    if (now - (lastTap[d] || -1e9) < 280) keyDash = true;   // the same way twice: dash
    lastTap[d] = now; keys.add(e.code); return;
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { padDash = true; return; }
  if (e.repeat) return;
  if (e.code === 'KeyJ' || e.code === 'KeyZ') { press('A'); e.preventDefault(); }
  if (e.code === 'KeyK' || e.code === 'KeyX') { press('Bdown'); e.preventDefault(); }
  if (e.code === 'Space') { press('jump'); e.preventDefault(); }
  if (e.code === 'KeyL' || e.code === 'KeyC') { press('star'); e.preventDefault(); }
  if (e.code === 'KeyQ' || e.code === 'KeyE') { press('swap'); e.preventDefault(); }
});
addEventListener('keyup', (e) => { if (e.code === 'KeyK' || e.code === 'KeyX') press('Bup'); if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') padDash = false; if (KEYMAP[e.code]) { keys.delete(e.code); if (!keys.size) keyDash = false; } });
addEventListener('blur', () => { keys.clear(); keyDash = false; });
const SPRINT_ZONE = 0.68;
function readInput(dt) {
  let x = 0, z = 0; for (const k of keys) { x += KEYMAP[k][0]; z += KEYMAP[k][1]; }
  let full = false;
  if (stick) { [x, z] = stick; full = Math.hypot(x, z) > 0.93; }
  stickFull = full ? stickFull + dt : 0;
  // the stick: anywhere in the blue zone is a normal run, the red ring round it is a sprint
  const l = Math.hypot(x, z); input.x = l > 0.15 ? x / l : 0; input.z = l > 0.15 ? z / l : 0;
  input.dash = ((keyDash || padDash) && l > 0.15) || (!!stick && l > SPRINT_ZONE);
}

// ---- moves -----------------------------------------------------------------------------------------------------------
function kick(p, tx, tz, speed, vy = 0, sup = null) {
  const dx = tx - ball.x, dz = tz - ball.z, d = Math.hypot(dx, dz) || 1;
  ball.owner = null; ball.vx = dx / d * speed; ball.vz = dz / d * speed; ball.vy = vy; ball.y = Math.max(ball.y, 0.25);
  ball.last = p; ball.lastT = 0.3; p.face = Math.sign(dx) || p.face;
  if (p.y <= 0.01 && free(p)) { p.st = 'kick'; p.t = 0.25; }
  ball.sup = sup ? { ...sup, t: 0, team: p.team, ox: dx / d, oz: dz / d, base: [ball.x, ball.z], baseY: ball.y, speed, tx, tz } : null;
  G.ca = Math.max(G.ca, sup ? 1.6 : speed > 22 ? 0.8 : 0.35);
  if (sup) { SFX.super(); G.shake = 0.35; G.flash = 0.6; ball.hot = 3; ui.banner?.(sup.name, p.T, 'super', p); shout(p, 'Hya-!'); VOICE.say(p, 'super'); } else SFX.kick();
}
// a shot at goal: aim with the stick (up/down = the far or near post), harder when dashing
function shoot(p, power, sup = null, { header = false } = {}) {
  const gx = goalX(p.team);
  const aimZ = p === captain && input.z ? input.z * 4 : p === captain ? Math.max(-4, Math.min(4, -p.z * 0.25)) : (Math.random() - 0.5) * 7.5;
  if (sup && sup.kind === 'split') { const lanes = [-3.3, 0, 3.3].sort(() => Math.random() - 0.5); kick(p, gx, lanes[0], 23, 0, sup); const S = ball.sup;
    S.decoys = lanes.slice(1).map((z) => { const dx = gx - ball.x, dz = z - ball.z, d = Math.hypot(dx, dz) || 1; return { x: ball.x, z: ball.z, vx: dx / d * 23, vz: dz / d * 23, on: true }; });
    S.fakeZ = lanes[(Math.random() * 3) | 0]; return; }
  if (sup) kick(p, gx, aimZ * 0.5, sup.kind === 'tornado' ? 15 : sup.kind === 'fire' ? 34 : sup.kind === 'mega' ? 19 : 25, sup.kind === 'tornado' ? 10 : 0, sup);
  else { const st = p.stats ? p.stats.st : 3; kick(p, gx, aimZ * (st >= 5 ? 1.1 : 1), (header ? 15 : 17) + power * (13 + (st - 3) * 2.6) + (st - 3) * 1.2, header ? 1 : 1.6 + power * 3.2); VOICE.say(p, 'shot', p === captain ? 0.45 : 0.2); }
}
function pass(p, to) {
  const tx = to.x + to.vx * 0.35, tz = to.z + to.vz * 0.35, d = Math.hypot(tx - ball.x, tz - ball.z);
  kick(p, tx, tz, Math.min(24, 10 + d * 0.72) * (1 + ((p.stats ? p.stats.pa : 3) - 3) * 0.05), d > 12 ? 4.5 : 1.2); SFX.pass();
}
function bestMate(p, dx = 0, dz = 0) {
  let best = null, bs = -1e9;
  for (const q of mates(p)) { if (!free(q) || q.y > 0) continue;
    const ex = q.x - p.x, ez = q.z - p.z, d = Math.hypot(ex, ez) || 1;
    let s = -d * 0.04 + ex * p.T.dir * 0.05 - (q.keeper ? 2.5 : 0) + (q.captain ? 0.8 : 0);
    if (dx || dz) s += (ex * dx + ez * dz) / d * 3;
    for (const o of players) if (o.team !== p.team && Math.hypot(o.x - (p.x + ex / 2), o.z - (p.z + ez / 2)) < 2.3) s -= 1.4;
    if (s > bs) { bs = s; best = q; } }
  return best;
}
const inBox = (x, z, defTeam) => Math.abs(x + goalX(defTeam)) < 9 && Math.abs(z) < 11;
function knock(p, dur = 1.5, { lie = 'lieBack', dizzy = false, push = [0, 0], by = null, foul = true } = {}) {
  if (p.wolf) return;
  if (p.st === 'down' || p.st === 'getup') return;
  const hadBall = ball.owner === p || dist(ball, p) < 2.2;
  p.st = 'down'; p.t = dur; p.lie = lie; p.dizzy = dizzy; p.vx = push[0]; p.vz = push[1]; p.vy = Math.max(p.vy, 4);
  SFX.tackle(); FX.emit('dust', p.x, 0.4, p.z, 8, 2.5, 0.25, 6); G.ca = Math.max(G.ca, 0.9); G.shake = Math.max(G.shake, 0.18);
  if (ball.owner === p) { ball.owner = null; ball.vx = (Math.random() - 0.5) * 8; ball.vz = (Math.random() - 0.5) * 8; ball.vy = 5; ball.y = 0.6; ball.last = p; ball.lastT = 0.4; }
  if (p.team === 0 || Math.random() < 0.5) shout(p, ['Oh-!!', 'Ugh-!', 'Aa--!'][Math.random() * 3 | 0]);
  // a foul on a man with the ball inside the box: penalty
  VOICE.say(p, 'hit', p.team === 0 ? 0.6 : 0.35);
  if (by && foul && G.state === 'play' && by.team !== p.team && !p.keeper && !by.keeper && hadBall && inBox(p.x, p.z, by.team)) penaltyFor(p.team, p);
}
function penaltyFor(team, fouled) {
  G.state = 'penalty'; G.pause = 1.9; G.pen = { team, taker: fouled, gkSide: 0 }; SFX.whistle(); ui.banner?.('KARNY!', TEAMS[team], 'big'); G.ca = Math.max(G.ca, 0.8);
}
function setupPenalty() {
  const P = G.pen, s = P.team === 0 ? 1 : -1, spot = s * (PX - 6.5), def = 1 - P.team;
  Object.assign(ball, { x: spot, z: 0, y: 0, vx: 0, vz: 0, vy: 0, owner: null, last: null, sup: null, hot: 0 });
  let k = 0;
  for (const q of players) {
    Object.assign(q, { vx: 0, vz: 0, vy: 0, y: 0, st: 'run', t: 0, act: null, dizzy: false, order: null, autoSuper: false });
    if (q === P.taker) { q.x = spot - s * 1.6; q.z = 0; q.face = s; }
    else if (q.keeper && q.team === def) { q.x = s * (PX - 0.7); q.z = 0; }
    else if (q.keeper) { q.x = -s * (PX - 1.6); q.z = 0; }
    else { q.x = s * (PX - 12.5) - s * (k % 3) * 2.2; q.z = -9 + (k * 4.5) % 18; k++; }
  }
  if (P.team === 0) captain = P.taker;
  G.state = 'penAim'; G.penT = 0; FX.clear();
  // Cuiavia's own penalties are taken in the behind-the-taker view (pen.js); the match waits for the result
  if (P.team === 0 && window.PEN) { G.state = 'penExt'; window.PEN.single((goal) => {
    const kp = players.find((q) => q.keeper && q.team === 1);
    if (goal) { Object.assign(ball, { x: goalX(0) + 0.8, z: (Math.random() - 0.5) * 6, y: 0.6, vx: 0, vz: 0, vy: 0, owner: null, last: P.taker }); G.state = 'play'; goalScored(0); }
    else { G.state = 'play'; ball.owner = kp; kp.hold = 0; G.safe = 1.2; } }); }
}
function penShoot(aim) {
  const P = G.pen, def = 1 - P.team, kp = players.find((q) => q.keeper && q.team === def);
  const tz = Math.max(-4.3, Math.min(4.3, aim ? aim * 3.7 + (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 2.5));
  kick(P.taker, goalX(P.team), tz, 28, 1.1); VOICE.say(P.taker, 'shot'); G.state = 'play'; G.safe = 1.2;
  let side = def === 0 ? P.gkSide : 0; if (!side) side = Math.random() < 0.5 ? -1 : 1;
  if (def === 1 && Math.random() < 0.15) side = 0;
  if (side) { kp.st = 'gkdive'; kp.t = 0.75; kp.vz = side * 8.5; kp.vx = 0; kp.vy = 3; kp.y = 0.01; kp.diveDir = side; }
}
// the flying kick: from the ground a hop, in the air a dive with the boots first; whoever it meets goes down seeing stars
function dropkick(p) {
  const sx = p === captain && input.x ? input.x : p.face, sz = p === captain ? input.z : 0;
  p.st = 'dropkick'; p.t = 0.55; p.hit = false; p.face = Math.sign(sx) || p.face;
  p.vx = sx * 12; p.vz = sz * 8; if (p.y < 0.3) { p.y = 0.05; p.vy = 6; } else p.vy = Math.max(p.vy, 2);
  if (ball.owner === p) ball.owner = null; shout(p, 'Hya-!'); VOICE.say(p, 'hit', 0.7); SFX.tackle(); G.ca = Math.max(G.ca, 0.5);
}
function jump(p) { if (!grounded(p)) return; p.jumpBall = ball.owner === p; p.st = 'jump'; p.act = null; p.vy = JUMP_V; p.y = 0.01; p.t = 0; SFX.pass(); }
function dive(p, tx, tz) { const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1; p.st = 'dive'; p.t = 0.75; p.vx = dx / d * 12; p.vz = dz / d * 12; p.vy = 4; p.y = 0.01; p.face = Math.sign(dx) || p.face; p.hit = false; }
function tackle(p, kind) {   // 'slide' takes the ball; 'shoulder' knocks the man over
  p.st = kind; p.t = kind === 'slide' ? 0.5 : 0.3; p.hit = false;
  const sx = input.x || p.face, sz = input.z, l = Math.hypot(sx, sz) || 1, ai = p !== captain;
  let dx = sx / l, dz = sz / l;
  if (ai && ball.owner) { const d = dist(ball.owner, p) || 1; dx = (ball.owner.x - p.x) / d; dz = (ball.owner.z - p.z) / d; }
  const s = kind === 'slide' ? 12 : 10; p.vx = dx * s; p.vz = dz * s; p.face = Math.sign(dx) || p.face;
  FX.emit('dust', p.x, 0.3, p.z, 5, 1.5, 0.25, 5);
}
// a ball near enough to play from where he is (in the air, or for a diving header)
const reach = (p, r = 1.5) => !ball.owner && Math.hypot(ball.x - p.x, ball.z - p.z) < r && Math.abs(ball.y - (p.y + 1.3)) < 1.6;

// the captain's buttons
function press(btn) {
  SFX.unlock();
  if (G.state === 'penAim') { readInput(0); if (G.pen.team === 0 && (btn === 'b' || btn === 'a')) penShoot(input.z); else if (G.pen.team === 1 && input.z) G.pen.gkSide = Math.sign(input.z); return; }
  if (G.state !== 'play') return;
  const c = captain;
  if (btn === 'swap') { if (ball.owner === c) return; const n = players.filter((q) => q.team === 0 && !q.keeper && q !== c && q.st !== 'down').sort((a, b) => dist(a, ball) - dist(b, ball))[0];
    if (n) { captain = n; switchT = 1.6; SFX.menu(); G.ca = Math.max(G.ca, 0.3); } return; }
  // ---- the simple scheme: A passes (or switches when you have no ball), B shoots (hold for power) or tackles, ★ fires a super
  if (btn === 'A') { if (ball.owner === c || (c.y > 0 && reach(c))) { press('a'); return; } press('swap'); return; }
  if (btn === 'Bdown') {
    if (c.st === 'down') { c.t -= 0.22; return; }
    if (ball.owner === c && free(c) && c.y <= 0) { G.charge = 0.0001; G.chargeP = c; SFX.charge?.(0.3); return; }
    if (c.y > 0 || (!ball.owner && Math.hypot(ball.x - c.x, ball.z - c.z) < 4.5 && ball.y > 0.5 && ball.y < 2.6)) { press('b'); return; }   // headers and volleys
    if (free(c)) tackle(c, 'slide'); return; }
  if (btn === 'Bup') { if (!G.charge) return; const k = Math.min(1, G.charge / 0.75); G.charge = 0;
    if (ball.owner === c && free(c)) shoot(c, 0.3 + 0.7 * k); return; }
  if (btn === 'shot') {   // the red button: a plain shot straight away, no charging; in the air it heads or volleys
    if (c.y > 0) { press('b'); return; }
    if (ball.owner === c && free(c)) { G.charge = 0; shoot(c, c.dash ? 0.8 : 0.6); } return; }
  if (btn === 'star') { if (ball.owner !== c || !free(c) || c.y > 0) return; G.charge = 0; c.st = 'jump'; c.jumpBall = true; c.y = 1.4; c.vy = 0; openPick(c); return; }
  if (c.st === 'down') { c.t -= 0.22; return; }                  // mash to get up sooner
  if (btn === 'jump') { jump(c); return; }
  if (btn === 'slide') { if (c.st === 'jump' && c.y > 0.3) dropkick(c); else if (free(c) && ball.owner !== c) tackle(c, 'slide'); else if (free(c)) dropkick(c); return; }
  if (btn === 'a') {
    if (c.y > 0 && (ball.owner === c || reach(c))) { const m = bestMate(c, input.x, input.z); if (m) { ball.owner = null; pass(c, m); c.act = 'volley'; } return; }
    if (!free(c)) return;
    if (ball.owner === c) { const m = bestMate(c, input.x, input.z); if (m) pass(c, m); return; }
    tackle(c, 'slide'); return;
  }
  if (btn === 'b') {
    if (c.y > 0 && c.st === 'jump' && (ball.owner === c || reach(c, 1.7))) {   // in the air: a header, a volley, a bicycle kick; at the peak a super shot
      const peak = Math.abs(c.vy) < APEX, high = ball.y > c.y + 1.5, back = Math.sign(input.x || c.face) !== c.T.dir;
      if (peak || (c.jumpBall && ball.owner === c)) { openPick(c); return; }
      c.act = back && !high ? 'bike' : high ? 'header' : 'volley'; c.t = 0;
      ball.owner = null; shoot(c, 0.9, peak ? c.super : null, { header: c.act === 'header' }); return;
    }
    if (!free(c)) return;
    if (ball.owner === c) { shoot(c, c.dash ? 1 : 0.55); return; }
    if (!ball.owner && Math.hypot(ball.x - c.x, ball.z - c.z) < 4.5 && ball.y > 0.5 && ball.y < 2.6) { dive(c, ball.x, ball.z); return; }
    tackle(c, 'shoulder');
  }
}

// ---- the AI ----------------------------------------------------------------------------------------------------------
function steer(p, tx, tz, dt, speed) {
  speed *= p.spd || 1;
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), s = d < 0.25 ? 0 : Math.min(speed, d * 5);
  const wx = d ? dx / d * s : 0, wz = d ? dz / d * s : 0, a = Math.min(1, dt * 9);
  p.vx += (wx - p.vx) * a; p.vz += (wz - p.vz) * a;
}
function keeperAI(p, dt) {
  const dir = p.T.dir, own = -goalX(p.team);
  if (ball.owner === p) { p.hold += dt; p.vx = p.vz = 0; if (p.hold > 1.1) { const m = bestMate(p); if (m) { pass(p, m); shout(p, 'Throw OK!'); } p.hold = 0; } return; }
  if (!free(p)) return;
  // a shot coming: where will it cross the line?
  const coming = !ball.owner && Math.sign(ball.vx) === -dir && Math.abs(ball.vx) > 6;
  const tt = coming ? (own - ball.x) / ball.vx : 9, cz = ball.z + ball.vz * tt, cy = ball.y + ball.vy * tt - GRAV * 0.5 * tt * tt * (ball.sup ? 0 : 1);
  const fz = ball.sup && ball.sup.kind === 'split' ? ball.sup.fakeZ : cz;
  if (coming && tt > 0 && tt < 0.45 && Math.abs(cz) < GOAL_W / 2 + 1) {
    if (cy > 2.6 && p.y <= 0) { p.st = 'jump'; p.vy = 9; p.y = 0.01; p.act = 'gk'; return; }
    if (Math.abs(fz - p.z) > 1.3) { p.st = 'gkdive'; p.t = 0.7; p.vz = Math.sign(fz - p.z) * Math.min(12, Math.abs(fz - p.z) / 0.3); p.vx = 0; p.vy = 3; p.y = 0.01; p.diveDir = Math.sign(fz - p.z); return; }
  }
  const tz = Math.max(-GOAL_W / 2 + 0.8, Math.min(GOAL_W / 2 - 0.8, ball.z * 0.55));
  const loose = !ball.owner && Math.abs(ball.x - own) < 9 && Math.abs(ball.z) < 10 && Math.hypot(ball.vx, ball.vz) < 7 && ball.y < 1.5;
  if (loose) steer(p, ball.x, ball.z, dt, 7); else steer(p, own + dir * 1.4, tz, dt, 9);
}
function ai(p, dt) {
  if (p.keeper) return keeperAI(p, dt);
  const dir = p.T.dir, own = -goalX(p.team), opp = goalX(p.team), ours = ball.owner && ball.owner.team === p.team;
  if (p.st === 'jump') {   // in the air: a header, or the super shot at the peak
    if ((ball.owner === p && Math.abs(p.vy) < APEX && p.autoSuper) || (reach(p, 1.6) && p.vy < 2)) { ball.owner = null; p.act = ball.y > p.y + 1.5 ? 'header' : 'volley'; shoot(p, 0.8, p.autoSuper ? p.super : null, { header: p.act === 'header' }); p.autoSuper = false; }
    return;
  }
  if (!free(p)) return;
  if (ball.owner === p) {
    p.hold += dt;
    if (p.order === 'shoot') { p.order = null; shoot(p, 0.8); return; }
    const toGoal = Math.hypot(opp - p.x, p.z), pressed = players.some((o) => o.team !== p.team && !o.keeper && free(o) && dist(o, p) < 2.6);
    if (toGoal < 15 && p.hold > 0.35) {
      if (G.superCool[p.team] <= 0 && Math.random() < (p.team === 1 ? 0.55 : 0.35)) { G.superCool[p.team] = 11; p.autoSuper = true; jump(p); return; }
      shoot(p, 0.5 + Math.random() * 0.5); return;
    }
    if (pressed && p.hold > 0.45 && Math.random() < dt * 2.5) { const m = bestMate(p); if (m) { pass(p, m); return; } }
    const wob = Math.sin(performance.now() / 700 + p.id * 2) * 5;
    steer(p, opp - dir * 3, Math.max(-PZ + 3, Math.min(PZ - 3, p.z * 0.7 + wob)), dt, AI_WALK);
    return;
  }
  p.order = null;
  // a high ball nearby: go up for it
  if (!ball.owner && ball.y > 1.6 && ball.y < 3.6 && dist(ball, p) < 2.2 && ball.vy < 2 && Math.random() < dt * 6) { jump(p); return; }
  const chasers = players.filter((q) => q.team === p.team && !q.keeper && !(q === captain) && free(q)).sort((a, b) => dist(a, ball) - dist(b, ball));
  const chase = !ours && (chasers[0] === p || (chasers[1] === p && ball.owner && p.team === 1));
  if (chase) {
    const lead = ball.owner ? 0.1 : 0.3, far = dist(p, ball) > 6 && p.sta > 0.15;
    steer(p, ball.x + ball.vx * lead, ball.z + ball.vz * lead, dt, far ? AI_RUN : AI_WALK);
    const o = ball.owner;
    if (o && o.team !== p.team && !o.keeper && dist(o, p) < 1.7 && G.safe <= 0 && o.hold > 0.5 && Math.random() < dt * (o === captain ? 1.0 : 1.4)) { const r = Math.random(); if (r < 0.2) dropkick(p); else tackle(p, r < 0.6 ? 'slide' : 'shoulder'); }
    return;
  }
  const shift = ball.x * 0.55, base = own + dir * p.home[0];
  let tx = base + shift + (ours ? dir * 6 : 0), tz = p.home[1] + ball.z * 0.3;
  tx = Math.max(-PX + 2, Math.min(PX - 2, tx));
  steer(p, tx, tz, dt, AI_WALK * 0.9);
}

// ---- the ball ------------------------------------------------------------------------------------------------------
function catchable(k, sp) { return k.keeper && k.team !== (ball.last ? ball.last.team : -1) && (free(k) || k.st === 'gkdive' || (k.st === 'jump' && k.act === 'gk')); }
function stepBall(dt) {
  ball.lastT -= dt; ball.hot = Math.max(0, ball.hot - dt);
  if (ball.owner) {
    const o = ball.owner, sp = Math.hypot(o.vx, o.vz);
    if (o.keeper) { ball.x = o.x + o.T.dir * 0.3; ball.z = o.z + 0.1; ball.y = o.y + 1.3; ball.vx = ball.vz = 0; return; }
    const fx = sp > 0.5 ? o.vx / sp : o.face, fz = sp > 0.5 ? o.vz / sp : 0;
    const tx = o.x + fx * 0.9, tz = o.z + fz * 0.55 + 0.12;
    ball.x += (tx - ball.x) * Math.min(1, dt * 16); ball.z += (tz - ball.z) * Math.min(1, dt * 16);
    ball.y = o.y > 0 ? o.y + 0.35 : Math.abs(Math.sin(o.walked * 1.4)) * 0.22;
    ball.vx = o.vx; ball.vz = o.vz; ball.vy = 0; ball.spin += sp * dt * 2; return;
  }
  const S = ball.sup, px = ball.x;
  if (S) {
    S.t += dt; const k = S.kind;
    if (k === 'fire') { ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.y += (1.0 - ball.y) * Math.min(1, dt * 6); FX.emit('fire', ball.x, ball.y + 0.3, ball.z, 3, 1.2, 0.3); }
    else if (k === 'zigzag') { const along = S.t * S.speed, ph = Math.sin(S.t * 10), side = Math.sign(ph) * Math.min(1, Math.abs(ph) * 3) * 3;
      ball.x = S.base[0] + S.ox * along - S.oz * side; ball.z = S.base[1] + S.oz * along + S.ox * side; ball.y = 0.9 + Math.abs(ph) * 0.9; FX.emit('zigzag', ball.x, ball.y + 0.3, ball.z, 2, 0.8, 0.28); }
    else if (k === 'tornado') {
      if (S.t < 0.6) { ball.y += ball.vy * dt; ball.x += ball.vx * 0.2 * dt; ball.z += ball.vz * 0.2 * dt; }
      else { const dx = S.tx - ball.x, dz = S.tz - ball.z, d = Math.hypot(dx, dz) || 1; ball.x += dx / d * 30 * dt; ball.z += dz / d * 30 * dt + Math.sin(S.t * 18) * 0.3; ball.y = Math.max(0.9, ball.y - 7 * dt); ball.vx = dx / d * 30; ball.vz = dz / d * 30; }
      for (let i = 0; i < 3; i++) { const a = S.t * 16 + i * 2.1; FX.emit('tornado', ball.x + Math.cos(a) * 0.9, ball.y - 0.4 + i * 0.3, ball.z + Math.sin(a) * 0.9, 1, 0.5, 0.25); } }
    else if (k === 'curve') { const u = Math.min(1, S.t * 1.3), side = Math.sin(u * Math.PI) * 6, along = S.t * S.speed;
      ball.x = S.base[0] + S.ox * along - S.oz * side; ball.z = S.base[1] + S.oz * along + S.ox * side; ball.y = 1 + Math.sin(u * Math.PI) * 1.8; FX.emit('curve', ball.x, ball.y + 0.3, ball.z, 2, 1, 0.26); }
    else if (k === 'dragon') { ball.x += ball.vx * dt; ball.y = Math.max(0.6, ball.y + ball.vy * dt); ball.z += ball.vz * dt;
      FX.emit('fire', ball.x, ball.y + 0.3, ball.z, 6, 2.2, 0.4); if (Math.random() < 0.4) FX.emit('dust', ball.x, ball.y + 0.4, ball.z, 1, 1, 0.6, 4);
      if (Math.abs(ball.x) > PX - 0.6 && !G.goalFire?.t) G.goalFire = { x: Math.sign(ball.x) * PX, t: 5.5 }; }
    else if (k === 'split') { ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.y += (1.1 + Math.sin(S.t * 14) * 0.25 - ball.y) * Math.min(1, dt * 8);
      FX.emit('zigzag', ball.x, ball.y + 0.3, ball.z, 1, 0.6, 0.22);
      for (const d of S.decoys) if (d.on) { d.x += d.vx * dt; d.z += d.vz * dt; FX.emit('zigzag', d.x, ball.y + 0.3, d.z, 1, 0.6, 0.22);
        if (Math.abs(d.x) > PX + 0.6) { d.on = false; FX.emit('tornado', d.x, 1.2, d.z, 16, 3, 0.32, 4); SFX.pass(); } } }
    else if (k === 'mega') { ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.y = Math.abs(Math.sin(S.t * 6)) * 0.3; G.shake = Math.max(G.shake, 0.1);
      if (Math.random() < 0.6) FX.emit('dust', ball.x - S.ox * 1.4, 0.3, ball.z + (Math.random() - 0.5) * 1.5, 2, 2, 0.45, 4); }
    ball.spin += dt * (k === 'mega' ? 12 : 40); ball.hot = k === 'split' ? 0 : 1;
    // a super shot flattens every opponent in its way; keepers seldom hold it and are carried into the net
    const mega = S.kind === 'mega' || S.kind === 'dragon';
    for (const p of players) if (p.team !== S.team && p.st !== 'down' && Math.hypot(p.x - ball.x, p.z - ball.z) < (mega ? 2.6 : p.keeper ? 1.8 : 1.2) && (mega || Math.abs(ball.y - (p.y + 1.2)) < 1.8)) {
      if (p.keeper && !mega && Math.random() < 0.22) { ball.owner = p; ball.sup = null; p.hold = 0; p.st = 'run'; SFX.save(); ui.banner?.('OBRONA!', p.T, 'small'); return; }
      knock(p, p.keeper ? 1.8 : 2.0, { lie: 'lieBack', dizzy: true, push: [S.ox * (p.keeper ? 11 : 6), S.oz * 3] });
    }
    if (S.t > (S.kind === 'mega' ? 4.5 : 3) && S.kind !== 'dragon') ball.sup = null;
  } else {
    ball.vy -= GRAV * dt; ball.y += ball.vy * dt;
    if (ball.y < 0) { ball.y = 0; ball.vy = Math.abs(ball.vy) > 2.5 ? -ball.vy * 0.5 : 0; }
    const f = Math.exp(-(ball.y > 0.05 ? 0.1 : 1.0) * dt); ball.vx *= f; ball.vz *= f;
    ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.spin += Math.hypot(ball.vx, ball.vz) * dt * 1.5;
    for (const p of players) {
      if (p === ball.last && ball.lastT > 0) continue;
      const d = Math.hypot(p.x - ball.x, p.z - ball.z), sp = Math.hypot(ball.vx, ball.vz), dy = ball.y - p.y;
      if (catchable(p) && d < (p.st === 'gkdive' ? 2.0 : 1.5) && dy < 3.4 && dy > -0.5 && sp > 5) {
        if (Math.random() < Math.max(0.35, Math.min(0.92, 1.55 - sp / 30))) { ball.owner = p; p.hold = 0; SFX.save(); ui.banner?.('OBRONA!', p.T, 'small'); break; }
        ball.lastT = 0.4; ball.last = p; ball.vx *= -0.4; ball.vz += (Math.random() - 0.5) * 8; ball.vy = 5; continue;   // parried
      }
      // a diving header connects
      if (p.st === 'dive' && !p.hit && d < 1.6 && dy < 2.2) { p.hit = true; ball.last = null; shoot(p, 0.8, null, { header: true }); break; }
      if (!free(p) || p.y > 0) continue;
      if (d < 1.05 && ball.y < 1.2) { ball.owner = p; p.hold = 0; break; }
    }
  }
  // goals, then the boards: the ball bounces back in
  for (const s of [-1, 1]) {
    const line = s * PX;
    if ((px - line) * (ball.x - line) <= 0 && px !== line) {
      if (Math.abs(ball.z) < GOAL_W / 2 - 0.2 && ball.y < GOAL_H - 0.2) { goalScored(s > 0 ? 0 : 1); return; }
      ball.x = line - s * 0.3; ball.vx = -ball.vx * 0.55; if (ball.sup) { ball.sup = null; ball.vz *= 0.5; }
    }
  }
  if (Math.abs(ball.z) > PZ - 0.2) { ball.z = Math.sign(ball.z) * (PZ - 0.25); ball.vz = -ball.vz * 0.55; if (ball.sup && ball.sup.kind !== 'zigzag') ball.sup = null; }
}
function goalScored(team) {
  if (WOLF.on) { WOLF.phase = 'back'; WOLF.t = 0; }
  G.score[team]++; G.state = 'goal'; G.pause = 3.2; const shooter = ball.last; ball.sup = null; ball.vx *= 0.15; ball.vz *= 0.15; ball.x = Math.sign(ball.x) * (PX + 1.2);
  SFX.goal(); G.shake = 0.5; G.cheer = team === 0 ? 2.5 : 1.2; G.flares = team === 0 ? 9 : 4; ui.score?.(G); ui.banner?.('GOAL!', TEAMS[team], 'goal');
  for (let i = 0; i < 4; i++) FX.emit(team === 0 ? 'goal' : 'goal2', ball.x, 1.5, ball.z, 14, 5, 0.3, 8);
  for (const p of players) if (p.team === team && !p.keeper && p.st !== 'down') { p.st = 'cheer'; p.t = 3; p.vx = p.vz = 0; }
  const who = shooter && shooter.team === team ? shooter : players.find((p) => p.team === team && p.role === 'fwd'); shout(who, 'Yeah!'); VOICE.say(who, 'goal');
  G.kickoff = 1 - team;
}
function placeKickoff(team) {
  wolfEnd(); ball.hidden = false;
  for (const p of players) {
    const own = -goalX(p.team);
    Object.assign(p, { sta: 1, x: own + p.T.dir * Math.min(p.home[0], PX - 2.5), z: p.home[1], y: 0, vx: 0, vz: 0, vy: 0, st: 'run', t: 0, act: null, hold: 0, face: p.T.dir, order: null, autoSuper: false, dizzy: false });
  }
  const k = players.find((p) => p.team === team && p.role === 'fwd'); k.x = -k.T.dir * 1.2; k.z = 0;
  captain = players.find((p) => p.team === 0 && p.role === 'fwd'); switchT = 0;
  Object.assign(ball, { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, owner: null, last: null, sup: null, hot: 0 });
  FX.clear(); G.kickoff = team;
}

// ---- the step --------------------------------------------------------------------------------------------------------
function physics(p, dt, control) {
  // states with their own clock
  p.t -= dt;
  if (p.st === 'down') { p.vx *= Math.exp(-dt * 3); p.vz *= Math.exp(-dt * 3); if (p.t <= 0) { p.st = 'getup'; p.t = 0.45; } }
  else if (p.st === 'getup') { p.vx = p.vz = 0; if (p.t <= 0) { if (p.dizzy) { p.st = 'dizzy'; p.t = 0.9; p.dizzy = false; } else p.st = 'run'; } }
  else if (p.st === 'dizzy') { p.vx = p.vz = 0; if (p.t <= 0) p.st = 'run'; }
  else if (p.st === 'cheer') { p.vx = p.vz = 0; if (p.t <= 0) p.st = 'run'; }
  else if (p.st === 'kick') { if (p.t <= 0) p.st = 'run'; }
  else if (p.st === 'slide' || p.st === 'shoulder') {
    const k = p.st === 'slide' ? 0.94 : 0.9; p.vx *= Math.pow(k, dt * 60); p.vz *= Math.pow(k, dt * 60);
    if (Math.random() < 0.5) FX.emit('dust', p.x, 0.2, p.z, 1, 1, 0.2, 4);
    if (!p.hit) for (const o of players) if (o.team !== p.team && o.st !== 'down' && o.y < 1.2 && dist(o, p) < 1.15) {
      p.hit = true;
      if (o.keeper) { knock(p, 1.2, { lie: 'lieBack', push: [-p.vx * 0.4, -p.vz * 0.4] }); break; }   // keepers send attackers flying
      if (p.st === 'slide') { knock(o, 1.3, { lie: 'lieFront', by: p, foul: Math.random() < 0.35 }); if (!ball.owner || ball.owner === p) { ball.owner = p; ball.sup = null; } }
      else knock(o, 1.5, { lie: 'lieBack', push: [p.vx * 0.5, p.vz * 0.5], by: p });
      break;
    }
    if (p.st === 'slide' && !ball.owner && dist(ball, p) < 1.2 && ball.y < 1) { ball.owner = p; p.hold = 0; }
    if (p.t <= 0) { p.st = 'run'; if (p.slideRest) p.slideRest = 0; }
  }
  else if (p.st === 'dropkick') {
    if (!p.hit) for (const o of players) if (o.team !== p.team && o.st !== 'down' && Math.abs(o.y - p.y) < 1.8 && dist(o, p) < 1.3) {
      p.hit = true; if (o.keeper) { knock(p, 1.2, { lie: 'lieBack', push: [-p.vx * 0.3, 0] }); break; }
      knock(o, 1.8, { lie: 'lieBack', dizzy: true, push: [p.vx * 0.6, p.vz * 0.5], by: p }); FX.emit('curve', o.x, 1.5, o.z, 10, 3, 0.3, 4); break; }
    if (p.y <= 0 && p.t < 0.45) { p.st = 'getup'; p.t = 0.3; p.vx *= 0.3; p.vz *= 0.3; }
  }
  else if (p.st === 'dive') { if (p.y <= 0 && p.t < 0.45) { p.vx *= Math.pow(0.9, dt * 60); p.vz *= Math.pow(0.9, dt * 60); } if (p.t <= 0) { p.st = 'getup'; p.t = 0.35; } }
  else if (p.st === 'gkdive') { if (p.y <= 0) { p.vz *= Math.pow(0.85, dt * 60); } if (p.t <= 0) { p.st = 'getup'; p.t = 0.3; } }
  // running: the captain from the stick, everyone else from the AI
  if (p.st === 'run' || (p.st === 'jump' && p.y > 0 && control)) {
    if (control) {
      if (p.sta < 0.06) input.dash = false;
      const sp = (input.dash ? DASH : WALK) * (p.spd || 1), a = Math.min(1, dt * (p.y > 0 ? 2 : 12));
      p.dash = input.dash;
      p.vx += (input.x * sp * (ball.owner === p ? 0.92 : 1) - p.vx) * a; p.vz += (input.z * sp - p.vz) * a;
      if (input.x && p.y <= 0) p.face = Math.sign(input.x);
    }
  }
  // gravity
  if (p.y > 0 || p.vy > 0) { p.vy -= GRAV * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; if (p.st === 'jump') { p.st = 'run'; p.act = null; } } }
  p.x += p.vx * dt; p.z += p.vz * dt;
  // stamina: sprinting spends it, everything else gives it back
  const spd = Math.hypot(p.vx, p.vz), running = spd > WALK + 0.5 || (p !== captain && spd > AI_WALK + 0.4);
  p.sta = Math.max(0, Math.min(1, p.sta + (running ? -0.32 : 0.14) * dt));
  if (control) { if (input.dash && spd > 1 && !p.dash) G.ca = Math.max(G.ca, 0.6); p.dash = input.dash && spd > 1; if (p.dash) G.ca = Math.max(G.ca, 0.18); }
  // speed lines behind a sprinter
  if (spd > 7.2 && p.y < 0.5 && free(p) && Math.random() < 0.7) FX.streak(p.x - p.vx * 0.06, 0.5 + Math.random() * 1.3, p.z + (Math.random() - 0.5) * 0.4, Math.sign(p.vx) || p.face);
}
function step(dt) {
  FX.update(dt); BOLTS.update(dt); TRAIL.update(dt); dragonUpdate(dt); goalFireUpdate(dt);
  if (WOLF.on && G.state !== 'play') { WOLF.t += dt; if (WOLF.phase !== 'back') { WOLF.phase = 'back'; WOLF.t = 0; } else if (WOLF.t > 0.6) wolfEnd(); } PU.update(dt, performance.now() / 1000); updateLines(dt); updateStands(dt, performance.now() / 1000); WX.update(dt, performance.now() / 1000); G.shake = Math.max(0, G.shake - dt); G.flash = Math.max(0, G.flash - dt * 2.5);
  if (G.charge) { if (ball.owner !== captain || G.state !== 'play') G.charge = 0; else { G.charge += dt; if (G.charge > 1.1) press('Bup'); } }
  if (G.state === 'penExt') { draw(dt); return; }
  if (G.state === 'dragon') { for (const p of players) physics(p, dt, false); draw(dt); return; }
  if (G.state === 'pick') { PICK.t += dt; if (PICK.t > 5) doPick(); draw(dt); return; }
  if (G.state === 'penalty') { G.pause -= dt; for (const p of players) physics(p, dt, false); if (G.pause <= 0) setupPenalty(); draw(dt); return; }
  if (G.state === 'penAim') {
    G.penT += dt; readInput(dt); const P = G.pen;
    if (P.team === 1 && input.z) P.gkSide = Math.sign(input.z);
    if (P.team === 1 && G.penT > 1.6) penShoot((Math.random() - 0.5) * 2.4);
    else if (P.team === 0 && G.penT > 8) penShoot(0);
    ui.pen?.(P, G.penT); draw(dt); return;
  }
  if (G.state === 'goal' || G.state === 'kickoff' || G.state === 'half') {
    G.pause -= dt;
    if (G.state === 'goal') { ball.x += ball.vx * dt; ball.z += ball.vz * dt; for (const p of players) physics(p, dt, false); }
    if (G.pause <= 0) {
      if (G.state === 'goal' || G.state === 'half') { placeKickoff(G.kickoff); G.state = 'kickoff'; G.pause = 1.2; }
      else { G.state = 'play'; SFX.whistle(); G.safe = 1.5; const k = players.find((p) => p.team === G.kickoff && p.role === 'fwd'); ball.owner = k; k.hold = 0; }
    }
    draw(dt); return;
  }
  if (G.state !== 'play') { draw(dt); return; }
  G.clock -= dt; G.superCool[0] -= dt; G.superCool[1] -= dt; G.safe -= dt;
  if (G.clock <= 0) {
    if (G.half === 1) { G.half = 2; G.clock = 120; G.state = 'half'; G.pause = 2.4; G.kickoff = 1; SFX.whistle(); ui.banner?.('2. POŁOWA', TEAMS[0], 'big'); }
    else { G.clock = 0; G.state = 'end'; SFX.whistle(); MUSIC.stop(); ui.end?.(G); }
    ui.score?.(G); draw(dt); return;
  }
  ui.score?.(G);
  readInput(dt);
  // who you steer: the man on the ball when it is ours, otherwise the team-mate nearest it (not too eagerly, never mid-move)
  switchT -= dt;
  { const o = ball.owner;
    if (o && o.team === 0 && !o.keeper) { if (o !== captain) { captain = o; switchT = 0.4; } }
    else if (!(o && o.team === 0) && switchT <= 0 && (free(captain) || captain.st === 'down' || captain.st === 'getup' || captain.st === 'dizzy')) {
      const n = players.filter((q) => q.team === 0 && !q.keeper && q.st !== 'down').sort((a, b) => dist(a, ball) - dist(b, ball))[0];
      if (n && n !== captain && (dist(n, ball) + 2 < dist(captain, ball) || captain.st === 'down')) { captain = n; switchT = 0.5; SFX.pass(); }
    } }
  if (ball.owner === captain) captain.hold += dt;
  for (const p of players) {
    if (WOLF.on && p === WOLF.p) { wolfStep(p, dt); continue; }
    if (WOLF.on && WOLF.phase !== 'back' && p.team !== WOLF.p.team && p.st === 'run') { wolfFlee(p, dt); physics(p, dt, false); continue; }
    p.flee = false; if (p !== captain && (p.st === 'run' || p.st === 'jump')) ai(p, dt); physics(p, dt, p === captain); }
  // keep apart a little, keep on the pitch
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) { const a = players[i], b = players[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d > 0 && d < 0.8 && a.y < 1 && b.y < 1) { const k = (0.8 - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; } }
  for (const p of players) { const lim = p.keeper && p.st === 'down' ? PX + GOAL_D - 0.3 : PX - 0.4; p.x = Math.max(-lim, Math.min(lim, p.x)); p.z = Math.max(-PZ + 0.4, Math.min(PZ - 0.4, p.z));
    if (Math.abs(p.vx) > 0.4 && free(p)) p.face = Math.sign(p.vx); if (p.y <= 0) p.walked += Math.hypot(p.vx, p.vz) * dt; }
  stepBall(dt);
  draw(dt);
}

// ---- drawing ---------------------------------------------------------------------------------------------------------
const cam = { x: 0, z: 0 };
const pick = (arr, u) => arr[Math.max(0, Math.min(arr.length - 1, Math.floor(u * arr.length)))];
function frameOf(p) {
  const A = p.anim, t = performance.now() / 1000, sp = Math.hypot(p.vx, p.vz), flip = p.face < 0;
  if (p.st === 'down') return { f: p.pose[p.lie][0], flip, flat: true };
  if (p.st === 'getup') return { f: pick(p.pose.getup, 1 - p.t / 0.45), flip };
  if (p.st === 'dizzy') return { f: p.pose.dizzy[(t * 4 | 0) % 2], flip };
  if (p.st === 'cheer') return { f: p.pose.cheer[(t * 5 + p.id | 0) % 3], flip };
  if (p.keeper) {
    const kf = p.T.dir < 0;
    if (p.st === 'gkdive') return { f: p.pose.gkDive[ball.owner === p ? 0 : 1], flip: kf, flat: true };
    if (p.st === 'jump') return { f: p.pose.gkJump[0], flip: kf };
    if (ball.owner === p) return { f: p.pose.gkHold[0], flip: kf };
    return { f: p.pose.gkReady[0], flip: kf, hop: sp > 0.5 ? Math.abs(Math.sin(t * 14)) * 0.12 : 0 };
  }
  if (p.st === 'dive') return { f: p.y > 0.2 ? p.pose.dive[1] : p.t > 0.5 ? p.pose.dive[0] : p.pose.dive[2], flip, flat: p.y > 0.2 || p.t <= 0.5 };
  if (p.st === 'slide') return { f: A.slide ? A.slide[0] : p.pose.dive[2], flip, flat: !A.slide };
  if (p.st === 'shoulder') return { f: p.pose.dive[0], flip };
  if (p.st === 'dropkick') return { f: p.pose.dive[1], flip, flat: true };
  if (p.st === 'jump') {
    if (p.act === 'header') return { f: pick(p.pose.header, 0.4 + Math.min(0.6, (JUMP_V - p.vy) / (2 * JUMP_V))), flip };
    if (p.act === 'bike') return { f: pick(p.pose.bike, (JUMP_V - p.vy) / (2 * JUMP_V)), flip };
    if (p.act === 'volley') return { f: (A.kick || p.pose.jump)[A.kick ? A.kick.length - 1 : 2], flip };
    return { f: p.vy > APEX ? p.pose.jump[0] : p.vy > -APEX ? p.pose.jump[2] : p.pose.jump[1], flip };
  }
  if (p.st === 'kick') { const k = A.kick; return { f: pick(k, 1 - p.t / 0.25), flip }; }
  if (sp > 0.6) {
    const rate = p.dash ? 0.5 : 0.85, mostlyZ = Math.abs(p.vz) > Math.abs(p.vx) * 1.7;
    if (mostlyZ && p.vz < 0) { if (A.runUp) return { f: A.runUp[(p.walked / rate | 0) % A.runUp.length], flip }; return { f: A.back[0], flip: (p.walked / 0.8 | 0) % 2 === 1, hop: Math.abs(Math.sin(p.walked * 2)) * 0.12 }; }
    if (mostlyZ && p.vz > 0) return { f: A.front[0], flip: (p.walked / 0.8 | 0) % 2 === 1, hop: Math.abs(Math.sin(p.walked * 2)) * 0.12 };
    return { f: A.run[(p.walked / rate | 0) % A.run.length], flip };
  }
  const lookX = ball.x - p.x; return { f: A.side[0], flip: (Math.abs(lookX) > 0.5 ? Math.sign(lookX) : p.face) < 0 };
}
function draw(dt) {
  const t = performance.now() / 1000;
  for (const p of players) {
    const fr = frameOf(p); p.spr.show(fr.f, fr.flip, !!fr.flat);
    p.spr.holder.position.set(p.x, p.y + (fr.hop || 0), p.z);
    const sprint = p.dash && p.st === 'run' && p.y <= 0.01 && !fr.flat && Math.hypot(p.vx, p.vz) > 8;
    p.spr.mesh.rotation.z = sprint ? -(Math.sign(p.vx) || p.face) * 0.17 : 0;
    if (sprint) { p.trailT = (p.trailT || 0) - dt; if (p.trailT <= 0) { p.trailT = 0.05; TRAIL.spawn(p); } if (Math.random() < 0.35) FX.emit('dust', p.x - p.vx * 0.05, 0.15, p.z, 1, 1.2, 0.22, 4); }
    p.spr.root.position.y = fr.flat ? 0.15 : 0;
    p.spr.sgrp.position.set(p.x + p.y * 0.45, 0.025, p.z - p.y * 0.45); p.spr.shadow.material.opacity = G.weather === 'rain' ? 0.12 : 0.3;
    p.spr.blob.position.set(p.x, 0.02, p.z); const bw = fr.flat ? 1.6 : 1; p.spr.blob.scale.set(bw * Math.max(0.5, 1 - p.y * 0.12), 0.55 * Math.max(0.5, 1 - p.y * 0.12), 1);
    const showStars = p.st === 'dizzy' || (p.st === 'down' && p.t < 0.9 && p.dizzy);
    p.stars.forEach((s, i) => { s.visible = showStars; if (showStars) { const a = t * 5 + i * 2.09; const h = (p.st === 'down' ? 0.9 : 2.6) + Math.sin(a * 2) * 0.08; s.position.set(p.x + Math.cos(a) * 0.55 - Math.sin(CAM_YAW) * h * Math.sin(LEAN), p.y + h * Math.cos(LEAN), p.z - Math.cos(CAM_YAW) * h * Math.sin(LEAN) + Math.sin(a) * 0.3); s.quaternion.copy(camera.quaternion); } });
  }
  // the wolf stands in for his player; the dragon hangs over the pitch
  for (const p of players) if (p.wolf !== p._wolfShown) { p._wolfShown = p.wolf; p.spr.holder.visible = !p.wolf; p.spr.sgrp.visible = !p.wolf; p.spr.blob.visible = !p.wolf; }
  if (WOLF.on && WOLF.spr) { const w = WOLF.spr, p = WOLF.p, T = WOLF.t; let f;
    if (WOLF.phase === 'morph') f = WF[WOLF_MORPH[Math.min(WOLF_MORPH.length - 1, (T / 0.85 * WOLF_MORPH.length) | 0)]];
    else if (WOLF.phase === 'back') f = WF[WOLF_MORPH[Math.max(0, WOLF_MORPH.length - 1 - ((T / 0.6 * WOLF_MORPH.length) | 0))]];
    else f = WF[WOLF_RUN[(performance.now() / 70 | 0) % WOLF_RUN.length]];
    w.holder.visible = w.blob.visible = w.sgrp.visible = true; w.show(f, p.face < 0); w.holder.position.set(p.x, 0, p.z); w.blob.position.set(p.x, 0.02, p.z); w.blob.scale.set(1.3, 0.7, 1);
    w.sgrp.position.set(p.x, 0.02, p.z); }
  if (DRAGON.on && DRAGON.spr) { const D = DRAGON, d = D.spr, T = D.t; let f;
    if (T < 1.4) f = DF[DR_FLY[(T * 12 | 0) % DR_FLY.length]]; else if (T < 1.75) f = DF[8]; else if (T < 1.95) f = DF[9]; else if (T < 2.1) f = DF[11]; else if (T < 2.35) f = DF[12]; else if (T < 2.6) f = DF[13]; else f = DF[(T * 12 | 0) % 2 ? 14 : 4];
    d.holder.visible = d.blob.visible = true; d.show(f, D.dir < 0); d.holder.scale.setScalar(DR_S); d.holder.position.set(D.x, D.y, D.z); d.blob.position.set(D.x, 0.02, D.z); const k = Math.max(0.3, 2.6 - D.y * 0.12); d.blob.scale.set(k, k * 0.5, 1); }
  ballSpr.holder.visible = !ball.hidden;
  const big = ball.sup && ball.sup.kind === 'mega' ? 3.4 : 1, split = ball.sup && ball.sup.kind === 'split' ? ball.sup : null;
  ballSpr.holder.scale.setScalar(big); ballSpr.holder.position.set(ball.x, ball.y, ball.z); ballSpr.mesh.rotation.z = -ball.spin;
  G.fakes = split ? split.decoys.filter((d) => d.on) : null;
  decoySpr.forEach((s, i) => { const d = split && split.decoys[i]; const on = !!(d && d.on); s.holder.visible = s.blob.visible = on; if (!on) return;
    s.holder.position.set(d.x, ball.y, d.z); s.mesh.rotation.z = -ball.spin; s.blob.position.set(d.x, 0.025, d.z); const q = Math.max(0.35, 1 - ball.y * 0.1); s.blob.scale.set(0.45 * q, 0.25 * q, 1); });
  ballSpr.mat.color.set(big > 1 ? (Math.floor(t * 8) % 2 ? '#ffffff' : '#ffb0da') : ball.hot > 0 ? (Math.floor(t * 12) % 2 ? '#ff5a3a' : '#ffb03a') : '#ffffff');
  for (const s of decoySpr) s.mat.color.copy(ballSpr.mat.color);
  ballSpr.blob.position.set(ball.x, 0.025, ball.z); const bs = Math.max(0.35, 1 - ball.y * 0.1); ballSpr.blob.scale.set(0.45 * bs * big, 0.25 * bs * big, 1);
  const c = captain; capMark.visible = G.state !== 'menu';
  { const h = 3.15 + Math.abs(Math.sin(t * 6)) * 0.3; capMark.position.set(c.x - Math.sin(CAM_YAW) * h * Math.sin(LEAN), c.y + h * Math.cos(LEAN), c.z - Math.cos(CAM_YAW) * h * Math.sin(LEAN)); capMark.quaternion.copy(camera.quaternion); capRing.visible = capMark.visible; capRing.position.set(c.x, 0.03, c.z); }
  { const k = 1.9 + Math.min(1.8, ball.y * 0.25) + Math.sin(t * 7) * 0.08; ballRing.position.set(ball.x, 0.04, ball.z); ballRing.scale.setScalar(k * (big > 1 ? 1.45 : 1)); ballRing.visible = !split && !ball.hidden; ballRing.rotation.y = -t * 2.6;
    ballRing.mat.color.set(ball.sup || ball.hot > 0 ? '#ff6a3a' : ball.owner ? (ball.owner.team ? '#d9b8ff' : '#9cf0a8') : '#ffe14a'); } 
  // the camera: high up, following the ball, never past the ends
  const portrait = innerHeight > innerWidth;
  const tx = Math.max(-PX + (portrait ? 5 : 10), Math.min(PX - (portrait ? 5 : 10), ball.x + ball.vx * 0.12)), tz = Math.max(-7, Math.min(7, ball.z * 0.6));
  const k = 1 - Math.exp(-dt * 4.5); cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k;
  const sh = G.shake > 0 ? G.shake * 0.8 : 0, D = portrait ? 33 : 24, lx = cam.x, lz = cam.z + 3;
  camera.position.set(lx + Math.sin(CAM_YAW) * Math.cos(CAM_EL) * D + (Math.random() - 0.5) * sh, Math.sin(CAM_EL) * D + (Math.random() - 0.5) * sh, lz + Math.cos(CAM_YAW) * Math.cos(CAM_EL) * D);
  camera.lookAt(lx, 0.6, lz);
  fin.uniforms.flash.value = G.flash * 0.5; G.ca = Math.max(0, G.ca - dt * 2.2); fin.uniforms.ca.value = G.ca; fin.uniforms.wet.value = G.weather === 'rain' ? 1 : 0;
  render();
  ui.minimap?.(players, ball, G); if (G.state !== 'menu') ui.hud?.(G);
}

// ---- the loop and the page's handle --------------------------------------------------------------------------------
let last = performance.now(), auto = true, frozen = false;
// the 3D pitch sleeps while a full-screen mode (penalties, keepy-uppy, lacing) covers it
const covered = () => ['pen', 'kapki', 'lace', 'caps'].some((id) => { const e = document.getElementById(id); return e && !e.hidden; });
renderer.setAnimationLoop((now) => { if (!auto) return; if (covered()) { last = now; return; } const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; step(frozen ? 0 : dt); });
placeKickoff(0); G.state = 'menu'; WX.set('leaves');
window.GAME = {
  start() { G.inv = { lightning: 0, split: 0, mega: 0, wolf: 0, dragon: 0 }; PU.reset(); PICK.open = false; ui.picker?.(null); ui.inv?.(G.inv); G.score = [0, 0]; G.clock = 120; G.half = 1; placeKickoff(0); G.state = 'kickoff'; G.pause = 1.6; MUSIC.start(SFX.unlock()); VOICE.prime(); G.weather = Math.random() < 0.5 ? 'rain' : 'leaves'; setWeather(G.weather); ui.score?.(G); ui.banner?.('KICK OFF!', TEAMS[0], 'big'); },
  press, setCaptain, pick: (i) => doPick(i), pickMove,
  // a finger on a teammate takes control of him (not while you are the one with the ball)
  ctx() { const c = captain, has = ball.owner === c, air = !has && !ball.owner && Math.hypot(ball.x - c.x, ball.z - c.z) < 4.5 && ball.y > 0.5 && ball.y < 2.6;
    let n = 0; for (const k in G.inv) n += G.inv[k];
    return { has, air, charge: G.charge ? Math.min(1, G.charge / 0.75) : 0, dash: !!c.dash, bag: n, state: G.state }; },
  tapAt(cx, cy) { if (G.state !== 'play' && G.state !== 'kickoff') return false; if (ball.owner === captain) return false;
    const r = renderer.domElement.getBoundingClientRect(); let best = null, bd = 64; const v = new THREE.Vector3();
    for (const q of players) { if (q.team !== 0 || q.keeper || q.st === 'down') continue; v.set(q.x, q.y + 1.1, q.z).project(camera);
      const d = Math.hypot(r.left + (v.x + 1) / 2 * r.width - cx, r.top + (1 - v.y) / 2 * r.height - cy); if (d < bd) { bd = d; best = q; } }
    if (!best || best === captain) return false; captain = best; switchT = 2.2; SFX.menu(); G.ca = Math.max(G.ca, 0.3); FX.emit('curve', best.x, 0.4, best.z, 10, 3, 0.25, 4); return true; }, powers: POWERS, icons: PU.icons, setStick(v) { stick = v; }, setDash(v) { padDash = v; }, freeze(v) { frozen = !!v; if (v) { keys.clear(); keyDash = false; } }, mute: () => SFX.toggle(),
  teams: TEAMS, frames: FR, images: [IMG_G, IMG_P], players, get captain() { return captain; }, get ball() { return ball; }, G,
};
window.__game = { goal: (t) => goalScored(t), pen: (t) => penaltyFor(t, players.find((q) => q.team === t && q.role === 'fwd')), G, ball, players, input, weather: (m) => { G.weather = m; setWeather(m); }, step(sec, fps = 30) { auto = false; for (let i = 0; i < Math.round(sec * fps); i++) step(1 / fps); }, resume() { last = performance.now(); auto = true; }, keys };
window.GAME_READY?.();
