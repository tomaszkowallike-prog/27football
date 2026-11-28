// PIXELS SOCCER: a 5-a-side arcade football game after the old Kunio-kun football games. The pitch and the stadium are
// 3D; the players are the user's pixel-art sprites, standing in it as flat figures that always face the camera, seen
// from high up as in the original. The frame is rendered small and blown up without smoothing (8-bit), then a
// tilt-shift pass blurs its top and bottom. You steer the Pixels player nearest the ball (a yellow arrow over his head).
import * as THREE from 'three';
import extraArenas from './arenas.js?v=15';

// ---- data ------------------------------------------------------------------------------------------------------------
const FR = await (await fetch('./frames.json')).json();
// the new animated boys (cut from the GIFs): one frame map, a green and a red atlas; ?old=1 brings the old pixel boys back
const HD = !/[?&]old=1/.test(location.search);
if (HD) Object.assign(FR, await (await fetch('./frames_hd_g.json?v=4')).json());
const POSE = FR.poses;
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const [IMG_G, IMG_P, IMG_C] = await Promise.all([loadImg('./atlas_green.png'), loadImg('./atlas_purple.png'), loadImg('./creatures.png')]);
const [IMG_WIZ, IMG_ICEK, IMG_GOLEM, IMG_SHARK, IMG_ROCK, IMG_SMOKE, IMG_VOLC] = await Promise.all([loadImg('./moc_wizard.png?v=1'), loadImg('./moc_ice.png?v=1'), loadImg('./moc_golem.png?v=1'), loadImg('./moc_shark.png?v=1'), loadImg('./fx_rock.png?v=1'), loadImg('./fx_smoke.png?v=1'), loadImg('./fx_volcano.jpg?v=1')]);
const [IMG_GORYL, IMG_NINJA, IMG_SMOK, IMG_ROB, IMG_SAT, IMG_EARTH] = await Promise.all([loadImg('./goryl.png?v=1'), loadImg('./ninja.png?v=1'), loadImg('./moc_smok.png?v=1'), loadImg('./moc_robot.png?v=1'), loadImg('./space_sat.png?v=1'), loadImg('./space_earth.png?v=1')]);
const [IMG_HG, IMG_HR] = HD ? await Promise.all([loadImg('./atlas_hd_g.png?v=3'), loadImg('./atlas_hd_p.png?v=2')]) : [null, null];
const HD_MAP = { 0: { 7: 'h7', 10: 'h10', 14: 'h14', 27: 'h27' }, 1: { 21: 'h7', 17: 'h10', 14: 'h14', 11: 'h27' } };
const CR = await (await fetch('./creatures.json')).json();   // wolf and dragon frames [x, y, w, h, anchorX, feet]
const EX = await (await fetch('./extras.json')).json();
const [IMG_FANS, IMG_FRONT, ...IMG_FLAGS] = await Promise.all([loadImg('./fans.png'), loadImg('./crowdfront.png'), ...EX.flags.map((_, i) => loadImg(`./flag${i}.png`))]);
const TIERS = [], FLAGS = [], FANS = {}, CARDS = {}, FLARES = [], SMOKES = [], LIGHTS = { glows: [] }, FRONT = []; let GLOW = null, STANDS_ON = true;

const PX = 30, PZ = 18, GOAL_W = 10, GOAL_H = 3.4, GOAL_D = 2.2;
const UNIT = 2.5 / 46;                  // world units per sprite pixel (a player ~2.5 tall)
const CAM_EL = 0.5, CAM_YAW = 0.22;     // a broadcast camera: ~29 degrees down, turned a little, the stands in view
const LEAN = 0.3;                       // the sprites lean back a little toward it
const TEAMS = [
  { name: 'PIXELS', short: 'PIX', img: IMG_G, color: '#3fbf55', dir: 1,
    squad: [
      { sheet: '10', num: 1, name: 'MAREK', role: 'gk', pos: 'GK', keeper: true },
      // stats 1-5: st shot, pa pass, dr dribble, ob defence, sp speed; the captain chosen in the locker room plays in the middle
      { sheet: '7', num: 7, name: 'SZYMON', role: 'def', pos: 'DF', home: [9, 0], super: { name: 'SZYMONOWY ZYGZAK', kind: 'zigzag' }, stats: { st: 2, pa: 3, dr: 2, ob: 5, sp: 3 } },
      { sheet: 's14', num: 14, name: 'ADAM', role: 'mid', pos: 'MF', home: [19, -8], super: { name: 'ZAKRĘCONA SPIRALA', kind: 'curve' }, stats: { st: 3, pa: 4, dr: 3, ob: 3, sp: 3 } },
      { sheet: 's10', num: 10, name: 'ROBERT', role: 'mid', pos: 'MF', home: [19, 8], super: { name: 'TRĄBA POWIETRZNA', kind: 'tornado' }, stats: { st: 3, pa: 3, dr: 4, ob: 2, sp: 4 } },
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
  uniforms: { tex: { value: null }, dep: { value: null }, res: { value: new THREE.Vector2(1280, 720) }, focus: { value: 0.42 }, band: { value: 0.16 }, blur: { value: 5 }, flash: { value: 0 } },
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
const blit = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { tex: { value: null }, dep: { value: null } },
  vertexShader: 'out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform sampler2D tex; uniform sampler2D dep; in vec2 vUv; layout(location = 0) out highp vec4 outColor; void main(){ outColor = texture(tex, vUv); gl_FragDepth = texture(dep, vUv).r; }',
  depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth });
const blitScene = new THREE.Scene(); blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blit));
let wld = null;
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
// the final pass: chromatic aberration on hard moments (a shot, a sprint, a big hit), grade, vignette, flash
const fin = new THREE.ShaderMaterial({
  uniforms: { tex: { value: null }, wtex: { value: null }, res: { value: new THREE.Vector2(1280, 720) }, ca: { value: 0 }, flash: { value: 0 }, wet: { value: 0 }, px: { value: 3 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tex; uniform sampler2D wtex; uniform vec2 res; uniform float ca, flash, wet, px; varying vec2 vUv;
    float b2(vec2 p){ p = mod(p, 2.0); return mod(p.x * 3.0 + p.y * 2.0, 4.0); }
    float bayer(vec2 p){ return (4.0 * b2(p) + b2(floor(p / 2.0))) / 16.0; }
    void main(){
      // 8-bit look: the picture is sampled on a coarse grid of big square pixels
      vec2 cell = floor(vUv * res / px); vec2 uv = (cell + 0.5) * px / res;
      vec2 d = (uv - 0.5); vec2 o = d * ca * 0.018 + vec2(ca * 2.0 * px / res.x, 0.0);
      // the world is pixelated; the players (drawn on top of it in the play pass) stay in their own crisp pixel art
      vec3 cw = vec3(texture2D(wtex, uv + o).r, texture2D(wtex, uv).g, texture2D(wtex, uv - o).b);
      vec2 o2 = (vUv - 0.5) * ca * 0.018 + vec2(ca * 2.0 / res.x, 0.0);
      vec3 cp = vec3(texture2D(tex, vUv + o2).r, texture2D(tex, vUv).g, texture2D(tex, vUv - o2).b);
      float pl = step(0.003, length(texture2D(tex, vUv).rgb - texture2D(wtex, vUv).rgb));
      vec3 c = mix(cw, cp, pl);
      c = pow(c, vec3(1.0 / 2.2));
      c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.1 - wet * 0.25);
      c = mix(c, c * vec3(0.82, 0.88, 0.98), wet);
      float v = smoothstep(1.05, 0.4, length(d * vec2(1.0, 0.85)));
      c *= mix(0.84 - wet * 0.1, 1.0, v);
      float L = 24.0; c = mix(floor(c * L + 0.4 + bayer(cell) * 0.2) / L, c, pl); gl_FragColor = vec4(mix(c, vec3(1.0), flash), 1.0);
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
  wld?.dispose(); wld = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, type: THREE.HalfFloatType });
  blit.uniforms.tex.value = wld.texture; blit.uniforms.dep.value = low.depthTexture; fin.uniforms.wtex.value = wld.texture;
  fin.uniforms.tex.value = mid.texture; fin.uniforms.res.value.set(w, h); fin.uniforms.px.value = Math.max(1, Math.round(1.5 * pr));
  const portrait = H > W; camera.aspect = W / H; camera.fov = portrait ? 60 : 46; camera.updateProjectionMatrix();
  post.uniforms.focus.value = portrait ? 0.45 : 0.42; post.uniforms.band.value = portrait ? 0.2 : 0.18;
}
addEventListener('resize', resize); resize();
const toPlay = (o) => o.traverse((m) => m.layers.set(PLAY));
function render() {
  camera.layers.set(0);
  renderer.setRenderTarget(low); renderer.render(scene, camera);
  renderer.setRenderTarget(wld); renderer.autoClear = true; renderer.render(postScene, postCam);
  renderer.setRenderTarget(mid); renderer.render(blitScene, postCam);
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
// pitch palettes for the arenas (the stadium's own grass first)
const PAL = { stadion: { base: '#4f8a3a', s1: '#5aa043', s2: '#64ad4b', noise: ['#3f7a2e', '#4a8a36', '#7cc25a', '#86c862'], worn: ['#8a6a3a', '#9a7844', '#7a5c30'], wornE: 'rgba(140,110,60,.55)', line: '#f3f6ea', txt: 'rgba(255,255,255,.16)' } };
const PITCH = {}, TOWN = [], STANDS = [];
// the pitch: mown stripes and lines painted into one texture, 8 texels a unit
{
  const K = 5, W = (PX + 6) * 2 * K, H = (PZ + 6) * 2 * K;
  const paint = (g, P) => { g.clearRect(0, 0, W, H);
    const X = (x) => Math.round((x + PX + 6) * K), Z = (z) => Math.round((z + PZ + 6) * K);
    g.fillStyle = P.base; g.fillRect(0, 0, W, H);
    if (P.blocks) P.blocks(g, W, H, K); else {
    const n = 12; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? P.s1 : P.s2; g.fillRect(X(-PX - 2 + i * (2 * PX + 4) / n), Z(-PZ - 2), Math.ceil((2 * PX + 4) / n * K), (2 * PZ + 4) * K); }
    // pixel grass: checker dither on the stripe edges, tufts, worn brown patches in the goalmouths and the centre
    for (let i = 0; i <= n; i++) { const x0 = X(-PX - 2 + i * (2 * PX + 4) / n); for (let z = 0; z < H; z++) if (z % 2 === 0) { g.fillStyle = i % 2 ? P.s2 : P.s1; g.fillRect(x0 - 1 + ((z >> 1) % 2), z, 1, 1); } }
    for (let i = 0; i < 1400; i++) { const x = Math.random() * W | 0, z = Math.random() * H | 0; g.fillStyle = P.noise[i % 4]; g.fillRect(x, z, 1, 1); if (i % 3 === 0) g.fillRect(x + 1, z - 1, 1, 1); } }
    if (P.extra) P.extra(g, W, H, K, X, Z);
    const worn = (cx, cz, r) => { for (let i = 0; i < r * r * 9; i++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r, x = X(cx + Math.cos(a) * d * 1.4), z = Z(cz + Math.sin(a) * d);
      g.fillStyle = d > r * 0.7 ? P.wornE : P.worn[i % 3]; g.fillRect(x, z, 1, 1); } };
    worn(-PX + 3, 0, 2.2); worn(PX - 3, 0, 2.2); worn(0, 0, 1.6); worn(-PX + 7, 3, 1.1); worn(PX - 8, -4, 1.2); worn(-9, 8, 0.9); worn(11, 6, 0.9); worn(-14, -7, 0.8);
    g.fillStyle = P.line;
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
      g.fillStyle = P.line;
    }
    g.fillStyle = P.line;

  };
  const t = tex(W, H, (g) => paint(g, PAL.stadion));
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;   // chunky pixel grass, like the old games
  const m = new THREE.Mesh(new THREE.PlaneGeometry((PX + 6) * 2, (PZ + 6) * 2), lam({ map: t }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m);
  // the surround: a red running track and grass
  const track = new THREE.Mesh(new THREE.PlaneGeometry(200, 160), lam({ map: tex(64, 64, (g) => { g.fillStyle = '#b5583c'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { g.fillStyle = Math.random() < .5 ? '#a54d33' : '#c4674a'; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 1, 1); } }, { repeat: [50, 40] }) }));
  track.rotation.x = -Math.PI / 2; track.position.y = -0.02; track.receiveShadow = true; scene.add(track);
  PITCH.t = t; PITCH.paint = paint; PITCH.track = track; PITCH.trackMap = track.material.map;
}
// boards round the pitch, the stand on the far side, the town behind it
const boardTex = (txt, bg, fg) => tex(96, 12, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 96, 12); g.fillStyle = fg; g.font = 'bold 9px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 48, 6.5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 10, 96, 2); });
const BOARDS = [['PIXELS', '#1d1f22', '#3fbf55'], ['INOWROCŁAW', '#3fbf55', '#1d1f22'], ['KUJAWY', '#f4ecd6', '#1d1f22'], ['FIOLETOWI', '#6b3fa8', '#f4ecd6'], ['SOLANKI', '#2b6cc4', '#f4ecd6'], ['GOL!', '#e2a73f', '#1d1f22']];
for (let i = 0; i < 8; i++) { const [t, b, f] = BOARDS[i % BOARDS.length]; const m = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 0.3), [lam({ color: '#333' }), lam({ color: '#333' }), lam({ color: '#333' }), lam({ color: '#333' }), lam({ map: boardTex(t, b, f) }), lam({ color: '#333' })]); m.position.set(-31.5 + i * 9, 0.55, -PZ - 3); m.castShadow = true; scene.add(m); }
{
  // the stands: stepped tiers of seats, each tier's face printed with a row of supporters (Pixels green and black,
  // the visitors in purple, neutrals); a stand on every side, the near one at the bottom of the frame, out of focus
  const nS = scene.children.length;
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
      m.renderOrder = -1; m.visible = false; camera.add(m); FRONT.push({ m, t, side, base: t.offset.x });   // hidden: they covered the play at the bottom
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
  const n0 = scene.children.length; STANDS.push(...scene.children.slice(nS, n0));
  const win = tex(16, 16, (g) => { g.fillStyle = '#e8d9b8'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#6f8fb0'; for (const x of [2, 9]) for (const y of [2, 9]) g.fillRect(x, y, 5, 5); g.fillStyle = '#c9b990'; g.fillRect(0, 15, 16, 1); }, { repeat: [1, 1] });
  for (let i = 0; i < 9; i++) { const w = 10 + Math.random() * 8, h = 8 + Math.random() * 12, t = win.clone(); t.repeat.set(w / 3, h / 3); t.needsUpdate = true;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), lam({ map: t })); b.position.set(-70 + i * 17 + Math.random() * 4, h / 2, -PZ - 24 - Math.random() * 8); scene.add(b); }
  const leaf = lam({ color: '#3f7f3a', flatShading: true }), trunk = lam({ color: '#6b4a2c' });
  for (let i = 0; i < 22; i++) { const x = -70 + i * 6.6 + Math.random() * 3, z = -PZ - 16 - Math.random() * 5, s = 1 + Math.random() * 0.6;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2 * s, 5), trunk); t.position.set(x, s, z); scene.add(t);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 * s, 0), leaf); c.position.set(x, 2.6 * s + 1, z); c.castShadow = true; scene.add(c); }
  for (const x of [-46, 46]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 18, 0.6), lam({ color: '#cfd3d8' })); p.position.set(x, 9, -PZ - 8); scene.add(p);
    const l = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.6), lam({ color: '#f6f2d8', emissive: '#7a7560' })); l.position.set(x, 18, -PZ - 8); scene.add(l); }
  TOWN.push(...scene.children.slice(n0));
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
function makeSprite(img, { lean = LEAN, unit = UNIT } = {}) {
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
      mesh.scale.set(w * unit * (flip ? -1 : 1), h * unit, 1);
      mesh.position.x = (flat ? 0 : (w / 2 - ax)) * unit * (flip ? -1 : 1);
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
TEAMS.forEach((T, ti) => T.squad.forEach((def0) => {
  const hs = HD && !def0.keeper && HD_MAP[ti][def0.num], def = hs ? { ...def0, sheet: hs } : def0;
  const p = { ...def, team: ti, T, anim: FR[def.sheet], pose: { ...FR.poses, ...(FR['poses_' + def.sheet] || {}) }, id: players.length, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, face: T.dir,
    st: 'run', t: 0, act: null, lie: 'lieBack', dizzy: false, walked: 0, hold: 0, dash: false, cool: 0, order: null, autoSuper: false, sta: 1 };
  if (p.keeper) p.home = [1.6, 0];
  p.img = hs ? (ti === 0 ? IMG_HG : IMG_HR) : T.img; p.spr = makeSprite(p.img, hs ? { unit: 2.55 / 128 } : undefined); p.hd = !!hs;
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
  const PAL = { sparkle: ['#8af4ff', '#ffffff', '#d8b0ff', '#fff6a0'], fire: ['#ffd23f', '#ff8a1f', '#e8361f', '#fff3a0'], zigzag: ['#7fe3ff', '#ffffff', '#ffe14a', '#3aa0ff'], tornado: ['#ffffff', '#cde9f5', '#9fd3e8', '#e6f7ff'], curve: ['#ffe14a', '#ff7ac8', '#ffffff', '#7affb0'], goal: ['#3fbf55', '#f4ecd6', '#1d1f22', '#ffe14a'], goal2: ['#a46ee8', '#f4ecd6', '#4a2a78', '#ffe14a'], dust: ['#d9caa0', '#bfae84', '#e8dcc0'], smoke: ['#7ad04a', '#4aa83a', '#b4f08a', '#2e7a2a'] };
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
  const WM = { leaves: { c: LC, s: 1, wv: 1, vk: 1 }, snow: { c: ['#ffffff'], s: 0.55, wv: 0.35, vk: 1 }, dust: { c: ['#e8c88a', '#d4a860', '#f0dcae'], s: 0.4, wv: 2.2, vk: 0.3 },
    embers: { c: ['#ff6a1a', '#ffb02a', '#ff3a10', '#ffd24a'], s: 0.32, wv: 0.4, vk: -1.3 }, bubbles: { c: ['#bfefff', '#ffffff', '#8ad8ff'], s: 0.35, wv: 0.15, vk: -0.9 },
    petals: { c: ['#ffb6d0', '#ff9ac0', '#ffd6e6'], s: 0.6, wv: 0.8, vk: 0.7 }, confetti: { c: ['#ff3a5a', '#ffd21a', '#3ae86a', '#3a8aff', '#ff8a1a', '#e83ac8'], s: 0.45, wv: 0.5, vk: 0.8 },
    ash: { c: ['#8a8a8a', '#5a5a5a', '#b0a8a0'], s: 0.4, wv: 0.6, vk: 0.45 }, fireflies: { c: ['#e8ff6a', '#b8ff4a', '#fff6a0'], s: 0.3, wv: 0.1, vk: 0.12, wander: true }, sparkle: { c: ['#8af4ff', '#d88aff', '#ffffff'], s: 0.3, wv: 0.1, vk: 0.12, wander: true } };
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
      mode = m; const W = WM[m]; leaves.forEach((l, i) => { l.m.visible = !!W; resetLeaf(l, true); if (W) { l.m.material.color.set(W.c[i % W.c.length]); l.m.scale.setScalar(W.s); } }); rain.visible = m === 'rain'; for (const g of ghosts) g.visible = rain.visible; for (const d of drops) resetDrop(d, true);
      scene.background.set(m === 'rain' ? '#7d8b98' : '#9fd3f2'); scene.fog.color.set(m === 'rain' ? '#8f9ba6' : '#c5e3f2'); scene.fog.near = m === 'rain' ? 50 : 90; if (LIGHTS.beam) { LIGHTS.beam.uniforms.k.value = m === 'rain' ? 0.12 : 0.09; LIGHTS.pool.opacity = m === 'rain' ? 0.3 : 0.14; }
      for (const o of scene.children) if (o.isDirectionalLight) o.intensity = m === 'rain' ? 1.1 : 2.6; else if (o.isHemisphereLight) o.intensity = m === 'rain' ? 1.5 : 2.0;
    },
    update(dt, t) {
      if (WM[mode]) for (const l of leaves) { const W = WM[mode], wv = W.wv;
        l.x += (l.vx * wv + Math.sin(t * 0.7 + l.ph) * 1.5 * (W.wander ? 0.6 : 1)) * dt; l.y += (l.vy * W.vk + Math.sin(t * l.sp + l.ph) * 0.8) * dt; if (l.y > 13 || l.x < cam.x - 34) resetLeaf(l, true); l.z += Math.cos(t * 1.3 + l.ph) * 0.6 * dt;
        if (l.y < 0.05) { l.y = 0.05; l.vx *= 0.97; } if (l.x > cam.x + 32 || (l.y <= 0.05 && Math.random() < dt * 0.4)) resetLeaf(l, false);
        l.m.position.set(l.x, l.y, l.z); l.m.quaternion.copy(camera.quaternion); l.m.rotateZ(t * l.sp + l.ph); l.m.rotateY(Math.sin(t * 3 + l.ph));
      }
      if (mode === 'rain') { for (let i = 0; i < N; i++) { const d = drops[i]; d.y -= d.v * dt; d.x += 3 * dt; if (d.y < 0) { if (Math.random() < 0.06) FX.emit('dust', d.x, 0.05, d.z, 1, 0.6, 0.12, 3); resetDrop(d, false); }
          pos.set([d.x, d.y, d.z, d.x - 0.12, d.y + 0.9, d.z], i * 6); } rgeo.attributes.position.needsUpdate = true; }
    },
  };
})();
function setWeather(m) { WX.set(m); ARENA.sky(); ui.weather?.(m); }
// ---- arenas: the stadium, the desert, the moon, the snow, the block world. Each one repaints the pitch and the
// surround, sets the sky, the light, the weather and the gravity, and shows its own scenery; in the desert, on the moon
// and in the snow the stands give way to pyramids, the moon base and the mountains.
const ARENA = (() => {
  const SG = new THREE.Group(); for (const o of STANDS) SG.add(o); scene.add(SG);
  const TG = new THREE.Group(); for (const o of TOWN) TG.add(o); scene.add(TG);
  const M = (c, o = {}) => lam({ color: c, flatShading: true, ...o });
  const box = (gr, w, h, d, c, x, y, z, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c, o) : c); m.position.set(x, y, z); m.castShadow = true; gr.add(m); return m; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const tile = (draw) => tex(64, 64, draw, { repeat: [50, 40] });
  const speck = (g, cols, n) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 1 + (i % 5 === 0), 1); } };
  // block painter: chunky 2x2-unit blocks, each a little different, with pixel grain and a dark seam
  const blocks = (cols, seam) => (g, W, H, K) => { const B = 2 * K;
    for (let y = 0; y < H; y += B) for (let x = 0; x < W; x += B) { const band = Math.floor(x / (B * 6)) % 2, c = cols[(Math.abs(Math.sin(x * 12.9 + y * 78.2)) * 9999 | 0) % cols.length];
      g.fillStyle = c; g.fillRect(x, y, B, B); g.fillStyle = band ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)'; g.fillRect(x, y, B, B);
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.16)'; g.fillRect(x + (Math.random() * B | 0), y + (Math.random() * B | 0), 1, 1); }
      g.fillStyle = seam; g.fillRect(x, y + B - 1, B, 1); g.fillRect(x + B - 1, y, 1, B); } };
  const DEF = {
    stadion: { name: 'STADION', sky: '#9fd3f2', fog: '#c5e3f2', near: 90, far: 190, hemi: ['#dff1ff', '#5f7a3a', 2.0], sun: ['#fff1d6', 2.6], grav: 30, wx: null, stands: true, town: true },
    pustynia: { name: 'PUSTYNIA', sky: '#f4dcb0', fog: '#f2e0c0', near: 80, far: 220, hemi: ['#fff6e4', '#c8b494', 2.0], sun: ['#fff0d0', 2.6], grav: 30, wx: 'dust',
      pal: { base: '#d8bc88', s1: '#dcc292', s2: '#d4b886', noise: ['#c4a470', '#e8d2a4', '#b8986a', '#eedab0'], worn: ['#b89a68', '#a88a5c', '#c4a676'], wornE: 'rgba(150,120,80,.45)', line: '#fffaf0', txt: 'rgba(120,70,20,.2)' },
      track: () => tile((g) => { g.fillStyle = '#dcb06c'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#c99a58'; for (let y = 4; y < 64; y += 9) for (let x = 0; x < 64; x++) g.fillRect(x, y + Math.round(Math.sin(x / 6 + y) * 2), 1, 1); speck(g, ['#e8c888', '#c0904c', '#f0d8a0'], 120); }) },
    kosmos: { name: 'KSIĘŻYC', sky: '#05061a', fog: '#0a0b22', near: 140, far: 320, hemi: ['#d8dcf0', '#3a3a44', 1.5], sun: ['#f4f6ff', 2.4], grav: 15, wx: 'none',
      pal: { base: '#8a8a92', s1: '#94949c', s2: '#86868e', noise: ['#6e6e76', '#a4a4ac', '#5e5e66', '#b4b4bc'], worn: ['#6a6a72', '#5a5a62', '#74747c'], wornE: 'rgba(60,60,70,.45)', line: '#5af0ff', txt: 'rgba(90,240,255,.22)',
        extra: (g, W, H, K) => { for (let i = 0; i < 26; i++) { const x = Math.random() * W, y = Math.random() * H, r = (0.6 + Math.random() * 1.6) * K; // craters
          g.fillStyle = 'rgba(50,50,60,.22)'; g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(230,230,240,.35)'; g.fillRect(Math.round(x - r * 0.3), Math.round(y + r * 0.6), Math.round(r * 0.8), 1); } } },
      track: () => tile((g) => { g.fillStyle = '#7a7a82'; g.fillRect(0, 0, 64, 64); speck(g, ['#606068', '#9a9aa2', '#56565e', '#acacb4'], 260); g.fillStyle = 'rgba(40,40,50,.4)'; g.beginPath(); g.ellipse(20, 30, 9, 7, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(200,200,210,.4)'; g.fillRect(14, 36, 12, 1); }) },
    snieg: { name: 'ŚNIEG', sky: '#d8e2ec', fog: '#e4ebf2', near: 70, far: 260, hemi: ['#ffffff', '#c4d0de', 2.3], sun: ['#ffffff', 2.2], grav: 30, wx: 'snow',
      pal: { base: '#e6edf4', s1: '#f2f6fa', s2: '#e4eaf1', noise: ['#d0dae6', '#ffffff', '#c6d2e0', '#f8fbff'], worn: ['#c4d0de', '#b8c6d6', '#d0dae6'], wornE: 'rgba(170,190,215,.5)', line: '#7aaee8', txt: 'rgba(120,150,190,.22)' },
      track: () => tile((g) => { g.fillStyle = '#eef3f8'; g.fillRect(0, 0, 64, 64); speck(g, ['#d6e0ea', '#ffffff', '#c8d6e4'], 200); }) }
  };
  // ---- scenery for each arena ----
  const BUILD = {
    pustynia(gr) {
      const sand = ['#e0b874', '#d6aa62', '#caa05c'];
      const pyr = (x, z, s) => { const m = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.15, 4, 1), M(sand[Math.random() * 3 | 0])); m.rotation.y = Math.PI / 4; m.position.set(x, s * 0.575, z); m.castShadow = true; gr.add(m);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(s * 0.12, s * 0.14, 4, 1), M('#f4e2a0', { emissive: '#6a5a20' })); cap.rotation.y = Math.PI / 4; cap.position.set(x, s * 1.15 - s * 0.07, z); gr.add(cap); };
      pyr(-22, -PZ - 22, 17); pyr(8, -PZ - 34, 24); pyr(36, -PZ - 20, 13); pyr(-50, -PZ - 30, 15); pyr(60, -PZ - 36, 19);
      pyr(-PX - 22, -6, 11); pyr(PX + 24, 8, 12);
      // dunes, cacti, palms, a few rocks
      for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(rnd(6, 12), 7, 4), M(sand[i % 3])); d.scale.y = 0.22; const side = i % 4;
        d.position.set(side < 2 ? rnd(-70, 70) : (side === 2 ? -1 : 1) * rnd(PX + 9, PX + 30), 0, side === 0 ? rnd(-PZ - 12, -PZ - 6) : side === 1 ? rnd(PZ + 9, PZ + 18) : rnd(-PZ, PZ)); gr.add(d); }
      const cactus = (x, z, h) => { const c = M('#3f8a3a'); box(gr, 0.9, h, 0.9, c, x, h / 2, z); box(gr, 0.7, h * 0.35, 0.7, c, x - 1, h * 0.55, z); box(gr, 1.3, 0.6, 0.7, c, x - 0.55, h * 0.4, z); box(gr, 0.7, h * 0.3, 0.7, c, x + 1, h * 0.62, z); box(gr, 1.3, 0.6, 0.7, c, x + 0.55, h * 0.5, z); };
      for (const [x, z] of [[-44, -PZ - 5], [-12, -PZ - 6], [21, -PZ - 7], [47, -PZ - 5], [-PX - 7, -12], [-PX - 8, 10], [PX + 7, -9], [PX + 8, 13]]) cactus(x, z, rnd(2.6, 4));
      const palm = (x, z) => { for (let i = 0; i < 6; i++) box(gr, 0.6, 1.2, 0.6, '#8a6a3a', x + i * 0.12, 0.6 + i * 1.1, z); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28, l = box(gr, 3.4, 0.25, 0.9, '#3f9a3a', x + 0.7 + Math.cos(a) * 1.5, 7, z + Math.sin(a) * 1.5); l.rotation.y = -a; l.rotation.z = -0.35; } };
      palm(-PX - 12, -PZ - 6); palm(PX + 12, -PZ - 7); palm(-60, -PZ - 10);
      const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 12), new THREE.MeshBasicMaterial({ color: '#fff4c8', fog: false })); sun.position.set(-40, 70, -200); gr.add(sun);
    },
    kosmos(gr) {
      // stars and the Earth
      const N = 900, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2 + 0.05, r = 260; pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gr.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false })));
      const earth = new THREE.Mesh(new THREE.IcosahedronGeometry(22, 1), lam({ color: '#3a7ae8', flatShading: true, emissive: '#0a2a6a', fog: false })); earth.position.set(-60, 75, -230); gr.add(earth);
      for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(4, 8), 0), lam({ color: '#3ac85a', flatShading: true, emissive: '#0a3a14', fog: false })); const a = rnd(0, 6.28), b = rnd(-1, 1); c.position.set(-60 + Math.cos(a) * 17, 75 + b * 15, -230 + Math.sin(a) * 17 + 8); gr.add(c); }
      // moon hills and boulders round the pitch
      const rock = (x, z, s, c = '#8e8e96') => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), M(c)); m.position.set(x, s * 0.3, z); m.rotation.set(rnd(0, 3), rnd(0, 3), 0); m.castShadow = true; gr.add(m); };
      for (let i = 0; i < 14; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(rnd(10, 18), 7, 4), M(['#8a8a92', '#7c7c84', '#96969e'][i % 3])); h.scale.y = rnd(0.3, 0.55); h.position.set(-90 + i * 14 + rnd(-4, 4), 0, -PZ - rnd(30, 44)); gr.add(h); }
      for (let i = 0; i < 22; i++) { const s = i % 2; rock(s ? rnd(-70, 70) : (Math.random() < 0.5 ? -1 : 1) * rnd(PX + 8, PX + 26), s ? rnd(-PZ - 12, -PZ - 6) : rnd(-PZ, PZ), rnd(0.6, 1.8)); }
      // the base: domes with lit windows, tubes between them, a tower, solar panels, a landing pad and a rocket
      const white = M('#e8ecf2'), glass = new THREE.MeshLambertMaterial({ color: '#5af0ff', emissive: '#1a8aa0' });
      const dome = (x, z, r) => { const d = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 6, 0, 6.28, 0, Math.PI / 2), white); d.position.set(x, 0, z); d.castShadow = true; gr.add(d);
        for (let k = 0; k < 5; k++) { const a = -0.9 + k * 0.45, w = box(gr, 0.8, 0.5, 0.2, glass, x + Math.sin(a) * r * 0.86, r * 0.42, z + Math.cos(a) * r * 0.86); w.rotation.y = a; } box(gr, r * 0.2, 0.4, 0.2, '#e8361f', x, r + 0.1, z); };
      dome(-30, -PZ - 14, 7); dome(-14, -PZ - 11, 4.5); dome(10, -PZ - 16, 9); dome(34, -PZ - 12, 5);
      for (const [a, b] of [[-26, -18], [-10, 2], [18, 30]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, b - a, 8), white); t.rotation.z = Math.PI / 2; t.position.set((a + b) / 2, 1.1, -PZ - 13); gr.add(t); }
      box(gr, 2.2, 16, 2.2, '#c8ccd6', -44, 8, -PZ - 12); box(gr, 4, 2, 4, '#5a606a', -44, 16.5, -PZ - 12); box(gr, 0.3, 4, 0.3, '#c8ccd6', -44, 19.5, -PZ - 12);
      const beacon = box(gr, 0.7, 0.7, 0.7, new THREE.MeshBasicMaterial({ color: '#ff3a3a' }), -44, 21.6, -PZ - 12); BUILD.beacon = beacon;
      for (let i = 0; i < 6; i++) { const p = box(gr, 4, 0.15, 2.6, '#2a4ad0', 46 + (i % 3) * 4.6, 2.2, -PZ - 8 - Math.floor(i / 3) * 3.6, { emissive: '#0a1a5a' }); p.rotation.x = -0.5; box(gr, 0.2, 2, 0.2, '#999', 46 + (i % 3) * 4.6, 1, -PZ - 8 - Math.floor(i / 3) * 3.6); }
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.3, 8), M('#3a3a44')); pad.position.set(PX + 18, 0.15, -10); gr.add(pad);
      const rx = PX + 18, rz = -10, body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 12, 8), white); body.position.set(rx, 6.3, rz); body.castShadow = true; gr.add(body);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 8), M('#e8361f')); nose.position.set(rx, 14.3, rz); gr.add(nose);
      for (let k = 0; k < 4; k++) { const f = box(gr, 0.3, 3, 2.4, '#e8361f', rx + Math.cos(k * 1.57) * 1.8, 1.8, rz + Math.sin(k * 1.57) * 1.8); f.rotation.y = -k * 1.57; }
      box(gr, 1.2, 1.2, 0.2, glass, rx, 9, rz + 1.6);
      // a few asteroids drifting above the far side
      BUILD.ast = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(1, 2.6), 0), M('#6e6e76', { fog: false })); m.position.set(rnd(-80, 80), rnd(22, 40), -PZ - rnd(40, 90)); gr.add(m); BUILD.ast.push(m); }
    },
    snieg(gr) {
      // the mountains: low-poly peaks with white caps, a near ridge and a far one
      const peak = (x, z, r, h) => { const rock = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), M(['#8a96a8', '#7c889a', '#9aa6b6'][Math.random() * 3 | 0])); rock.position.set(x, h / 2, z); rock.rotation.y = rnd(0, 3); gr.add(rock);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, h * 0.5, 7, 1), M('#ffffff')); cap.position.set(x, h * 0.75 + 0.05, z); cap.rotation.y = rock.rotation.y; gr.add(cap); };
      peak(-40, -PZ - 40, 26, 44); peak(-6, -PZ - 52, 34, 62); peak(30, -PZ - 42, 24, 40); peak(62, -PZ - 50, 30, 54); peak(-74, -PZ - 52, 28, 50);
      peak(-PX - 40, 0, 22, 36); peak(PX + 40, -4, 24, 40);
      // snow banks, pines with snow on them, snowmen
      for (let i = 0; i < 18; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(rnd(5, 10), 7, 4), M(i % 2 ? '#ffffff' : '#eef3f8')); d.scale.y = 0.3; const side = i % 3;
        d.position.set(side === 0 ? rnd(-70, 70) : (side === 1 ? -1 : 1) * rnd(PX + 9, PX + 26), 0, side === 0 ? rnd(-PZ - 14, -PZ - 6) : rnd(-PZ, PZ)); gr.add(d); }
      const pine = (x, z, s) => { box(gr, 0.6 * s, 2 * s, 0.6 * s, '#5a3e24', x, s, z); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((2.4 - k * 0.6) * s, 2.6 * s, 7), M('#2a5a3a')); c.position.set(x, (2.6 + k * 1.6) * s, z); c.castShadow = true; gr.add(c);
        const w = new THREE.Mesh(new THREE.ConeGeometry((1.3 - k * 0.3) * s, 1.2 * s, 7), M('#ffffff')); w.position.set(x, (3.3 + k * 1.6) * s, z); gr.add(w); } };
      for (let i = 0; i < 16; i++) pine(-72 + i * 9.5 + rnd(-2, 2), -PZ - rnd(7, 16), rnd(1.1, 1.8));
      for (const [x, z] of [[-PX - 9, -14], [-PX - 12, 6], [PX + 9, -12], [PX + 12, 9], [-PX - 16, 16], [PX + 16, -2]]) pine(x, z, rnd(1, 1.5));
      const snowman = (x, z, s) => { const w = M('#ffffff'); for (const [r, y] of [[1.2, 1.1], [0.85, 2.7], [0.6, 3.9]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), w); b.position.set(x, y * s, z); b.castShadow = true; gr.add(b); }
        const n = new THREE.Mesh(new THREE.ConeGeometry(0.14 * s, 0.7 * s, 5), M('#ff8a1a')); n.rotation.x = Math.PI / 2; n.position.set(x, 3.9 * s, z + 0.8 * s); gr.add(n);
        for (const dx of [-0.2, 0.2]) box(gr, 0.12 * s, 0.12 * s, 0.1 * s, '#141414', x + dx * s, 4.05 * s, z + 0.55 * s); box(gr, 1.1 * s, 0.12 * s, 0.9 * s, '#141414', x, 4.45 * s, z); box(gr, 0.7 * s, 0.6 * s, 0.6 * s, '#141414', x, 4.8 * s, z);
        box(gr, 1.4 * s, 0.25 * s, 0.25 * s, '#e8361f', x, 3.35 * s, z + 0.2 * s); };
      snowman(-26, -PZ - 6, 1.2); snowman(24, -PZ - 6.5, 1); snowman(-PX - 8, -2, 1.1); snowman(PX + 8, 2, 1.1);
    },
    klocki(gr) {
      const C = { grass: ['#5aa83c', '#62b244', '#54a036'], dirt: '#7c5838', wood: '#6a4a2a', leaf: ['#3a8a2a', '#4a9a32', '#2f7a24'], stone: '#8a8a8a' };
      const cube = (x, y, z, c, s = 2) => box(gr, s, s, s, c, x, y + s / 2, z);
      // blocky hills behind the far stand and beyond the goals
      for (let x = -84; x <= 84; x += 3) { const h = Math.round(3 + 3 * Math.sin(x * 0.09) + 2 * Math.sin(x * 0.23 + 1)); for (let y = 0; y < h; y++) cube(x, y * 3, -PZ - 16 - (x % 2 ? 3 : 0) - (h > 4 ? 6 : 0), y === h - 1 ? C.grass[(x + y) % 3 < 0 ? 0 : (x + y) % 3] : (y < h - 3 ? C.stone : C.dirt), 3); }
      const tree = (x, z, h) => { for (let y = 0; y < h; y++) cube(x, y * 1.5, z, C.wood, 1.5); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = 0; dy < 2; dy++) if (Math.abs(dx) + Math.abs(dz) < 2 + dy) cube(x + dx * 1.5, h * 1.5 - 1.5 + dy * 1.5, z + dz * 1.5, C.leaf[(dx + dz + dy + 3) % 3], 1.5); cube(x, h * 1.5 + 1.5, z, C.leaf[0], 1.5); };
      for (let i = 0; i < 14; i++) tree(-70 + i * 11 + rnd(-2, 2), -PZ - rnd(8, 12), 3 + (Math.random() * 3 | 0));
      // blocky fans of our own standing round the pitch and cheering: cube heads, block bodies, arms that go up
      const fans = []; const fan = (x, z, ry) => { const g2 = new THREE.Group(), shirt = ['#e8361f', '#ffd21a', '#3a8ae8', '#e83ac8', '#ff8a1a', '#3fbf55', '#ffffff'][Math.random() * 7 | 0], skin = ['#f1c9a0', '#c98f62', '#8a5a3a', '#e3b088'][Math.random() * 4 | 0];
        const add2 = (w, h, d, c, px, py) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(px, py, 0); g2.add(m); return m; };
        add2(0.5, 1, 0.5, '#3a3a4a', -0.27, 0.5); add2(0.5, 1, 0.5, '#3a3a4a', 0.27, 0.5); add2(1.1, 1.2, 0.6, shirt, 0, 1.6); add2(0.9, 0.9, 0.9, skin, 0, 2.65); add2(0.95, 0.3, 0.95, ['#2a1a10', '#d8b040', '#8a3a1a', '#1a1a1a'][Math.random() * 4 | 0], 0, 3.15);
        const a1 = new THREE.Group(), a2 = new THREE.Group(); for (const [a, dx] of [[a1, -0.75], [a2, 0.75]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), M(skin)); m.position.y = -0.5; a.add(m); a.position.set(dx, 2.15, 0); g2.add(a); }
        g2.position.set(x, 0, z); g2.rotation.y = ry; g2.scale.setScalar(1.6); gr.add(g2); fans.push([a1, a2, Math.random() * 6, g2]); };
      for (let x = -64; x <= 64; x += 3.2) if (Math.random() < 0.8) fan(x + rnd(-0.6, 0.6), -PZ - 5.5 - rnd(0, 1.5), 0);
      for (const sx of [-1, 1]) for (let z = -22; z <= 22; z += 3.4) if (Math.random() < 0.7) fan(sx * (PX + 7 + rnd(0, 2)), z, -sx * Math.PI / 2);
      BUILD.fans = fans;
      for (const [x, z] of [[-PX - 14, -10], [-PX - 16, 8], [PX + 14, -6], [PX + 16, 12]]) tree(x, z, 4);
      // block clouds and a square sun
      BUILD.clouds = []; for (let i = 0; i < 9; i++) { const g2 = new THREE.Group(); const w = 3 + (Math.random() * 4 | 0); for (let k = 0; k < w; k++) for (let j = 0; j < 2; j++) if (j === 0 || (k > 0 && k < w - 1)) { const m = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, transparent: true, opacity: 0.92 })); m.position.set(k * 4, j * 1.6, (j ? 0 : (k % 2) * 4)); g2.add(m); }
        g2.position.set(rnd(-120, 120), rnd(38, 55), -PZ - rnd(60, 140)); gr.add(g2); BUILD.clouds.push(g2); }
      const sq = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ color: '#fff6a0', fog: false })); sq.position.set(50, 80, -220); gr.add(sq);
    },
  };
  { const X = extraArenas({ THREE, lam, tex, PX, PZ }); Object.assign(DEF, X.DEF); Object.assign(BUILD, X.BUILD); }
  const groups = {}; let cur = 'stadion';
  const lights = () => { let h = null, s = null; for (const o of scene.children) { if (o.isHemisphereLight) h = o; if (o.isDirectionalLight) s = o; } return [h, s]; };
  return {
    get id() { return cur; }, get list() { return Object.keys(DEF).map((id) => ({ id, name: DEF[id].name || id })); },
    set(id) { if (!DEF[id]) id = 'stadion'; cur = id; const D = DEF[id];
      if (BUILD[id] && !groups[id]) { groups[id] = new THREE.Group(); BUILD[id](groups[id]); scene.add(groups[id]); }
      for (const k in groups) groups[k].visible = k === id;
      SG.visible = STANDS_ON = !!D.stands || id === 'stadion'; TG.visible = id === 'stadion';
      PITCH.paint(PITCH.t.image.getContext('2d'), { ...DEF.stadion.pal, ...(D.pal || PAL.stadion) }); PITCH.t.needsUpdate = true;
      if (!D.trackMap && D.track) D.trackMap = D.track(); PITCH.track.material.map = D.trackMap || PITCH.trackMap; PITCH.track.material.emissive.set(D.trackGlow || '#000000'); PITCH.track.material.emissiveMap = D.trackGlow ? PITCH.track.material.map : null; PITCH.track.material.needsUpdate = true;
      GRAV = D.grav; if (id === 'stadion') { const w = typeof G !== 'undefined' && (G.weather === 'rain' || G.weather === 'leaves') ? G.weather : 'leaves'; WX.set(w); } else WX.set(D.wx || 'leaves'); this.sky(); },
    sky() { if (cur === 'stadion') return; const D = DEF[cur]; scene.background.set(D.sky); scene.fog.color.set(D.fog); scene.fog.near = D.near; scene.fog.far = D.far;
      const [h, s] = lights(); if (h) { h.color.set(D.hemi[0]); h.groundColor.set(D.hemi[1]); h.intensity = D.hemi[2]; } if (s) { s.color.set(D.sun[0]); s.intensity = D.sun[1]; } },
    weather() { return DEF[cur].wx; },
    update(dt, t) { const D = DEF[cur]; if (D.flow && PITCH.track.material.map) PITCH.track.material.map.offset.x += dt * D.flow; groups[cur]?.userData.tick?.forEach((f) => f(t, dt)); if (cur === 'kosmos') { BUILD.ast?.forEach((m, i) => { m.rotation.x += dt * (0.2 + i * 0.03); m.rotation.y += dt * 0.15; m.position.x += Math.sin(t * 0.1 + i) * dt * 0.6; }); if (BUILD.beacon) BUILD.beacon.visible = Math.floor(t * 1.5) % 2 === 0; }
      if (cur === 'klocki') { BUILD.clouds?.forEach((c) => { c.position.x += dt * 1.2; if (c.position.x > 140) c.position.x = -140; }); BUILD.fans?.forEach(([a1, a2, p, g2]) => { const up = Math.max(0, Math.sin(t * 3 + p)); a1.rotation.z = -up * 2.6; a2.rotation.z = up * 2.6; g2.position.y = Math.max(0, Math.sin(t * 6 + p)) * 0.25; }); } },
  };
})();

// the stands move: flags ripple, fans bounce (hard after a goal), the card display flips over
function updateStands(dt, t) {
  for (const f of FLAGS) { const pos = f.m.geometry.attributes.position, b = f.base, w = f.w;
    for (let i = 0; i < pos.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], u = Math.max(0, (x + w / 2) / w - 0.1);
      pos.array[i * 3 + 2] = Math.sin(t * f.sp + u * 7 + f.ph) * 0.45 * u; pos.array[i * 3 + 1] = y + Math.sin(t * f.sp * 0.7 + u * 5 + f.ph) * 0.12 * u; }
    pos.needsUpdate = true; }
  G.flares = Math.max(0, (G.flares || 0) - dt * 0.6);
  FLARES.forEach((f, i) => { const on = STANDS_ON && (f.on || i < 4 + Math.ceil(G.flares) - 1 && G.flares > 0.3);
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
    unlock: ctx, get muted() { return muted; }, setSfx(on) { muted = !on; }, toggle() { muted = !muted; MUSIC.mute(muted); return muted; },
    kick() { tone(220, 90, 0.08, 'square', 0.07); noise(0.05, 0.08); }, pass() { tone(440, 330, 0.06, 'square', 0.05); },
    charge(v) { tone(300 + v * 500, 300 + v * 520, 0.04, 'square', 0.025); },
    tick(v = 0) { tone(900 + v * 300, 900 + v * 300, 0.03, 'square', 0.05); }, portal() { tone(120, 900, 0.5, 'triangle', 0.07); tone(900, 200, 0.5, 'sine', 0.05, 0.1); },
    zap() { tone(1800, 80, 0.6, 'sawtooth', 0.08); noise(0.6, 0.16); }, boing() { tone(260, 520, 0.08, 'square', 0.07); noise(0.05, 0.1); },
    super() { tone(180, 1400, 0.35, 'sawtooth', 0.06); noise(0.4, 0.1); }, tackle() { noise(0.12, 0.14); tone(140, 60, 0.12, 'triangle', 0.1); },
    // a referee's pea whistle: a warbling high tone; n blasts, the last one long
    whistle(n = 1) { const a = ctx(); if (!a || muted) return; let t0 = a.currentTime;
      for (let k = 0; k < n; k++) { const long = k === n - 1, dur = long ? 0.7 : 0.25, o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain();
        o.type = 'sine'; o.frequency.value = 2900; lfo.frequency.value = 38; lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.11, t0 + 0.02); g.gain.setValueAtTime(0.11, t0 + dur - 0.05); g.gain.linearRampToValueAtTime(0, t0 + dur);
        o.connect(g); g.connect(a.destination); o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.02); lfo.stop(t0 + dur + 0.02); t0 += dur + 0.12; } },
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
  const TRACKS = ['./mecz1.mp3?v=1', './mecz2.mp3?v=1', './mecz3.mp3?v=1'];   // a random one of the three each match
  const a = new Audio(TRACKS[(Math.random() * 3) | 0]); a.loop = true; if (window.MV) MV.reg(a, 0.45); else a.volume = 0.45; let on = false, muted = false, ok = true;
  a.addEventListener('error', () => { ok = false; });
  return {
    start(ctx) { on = true; ok = true; a._src = TRACKS[(Math.random() * 3) | 0]; if (!ok) { CHIP.start(ctx); return; } a.muted = muted; a.currentTime = 0; a.play().catch(() => { ok = false; CHIP.start(ctx); }); },
    stop() { on = false; a.pause(); CHIP.stop(); },
    mute(m) { muted = m; a.muted = m; CHIP.mute(m); },
  };
})();
window.MATCH_MUSIC = MUSIC;

// ---- game state ----------------------------------------------------------------------------------------------------
const ui = window.UI || {};
const HALF = () => (window.CFG && window.CFG.half) || 120;
const VIB = (ms) => { try { if (!window.CFG || window.CFG.vib !== false) navigator.vibrate?.(ms); } catch (e) {} };
const G = { inv2: {}, inv: { lightning: 0, split: 0, mega: 0, wolf: 0, dragon: 0, robot: 0, portal: 0, pinball: 0, laser: 0, twister: 0, ninja: 0, goryl: 0, wizard: 0, iceking: 0, golem: 0, shark: 0 }, fakes: null, pu: null, ca: 0, weather: 'leaves', state: 'menu', score: [0, 0], clock: 120, half: 1, pause: 0, kickoff: 0, shake: 0, superCool: [0, 5], flash: 0, safe: 0 };
let GRAV = 30; const JUMP_V = 11, APEX = 3.2;                       // a jump peaks ~0.37 s after take-off, ~2 units up
const WALK = 6.4, DASH = 11.8, AI_WALK = 5.8, AI_RUN = 7.6;
// difficulty 0 ŁATWY, 1 NORMALNY, 2 MISTRZ; perks come from the shop (boots, balls, gloves...)
const LV = () => (window.CFG && window.CFG.lvl != null ? window.CFG.lvl : 1);
const DIFF = (a) => a[LV()];
const PERK = () => (window.PERKS ? window.PERKS() : {});
let SIDE = 1;   // +1: we attack the right goal, -1: the left one (chosen at the coin toss)
const goalX = (team) => (team === 0 ? SIDE * PX : -SIDE * PX);               // the goal this team attacks
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
  robot: { name: 'ROBOT', col: '#5af0ff', dark: '#0a3a6a' },
  portal: { name: 'PORTALE', col: '#b46aff', dark: '#3a0a6a' },
  pinball: { name: 'SZALONA PIŁKA', col: '#9aff4a', dark: '#2a5a08' },
  laser: { name: 'LASER Z KOSMOSU', col: '#ff3a4a', dark: '#5a0a14' },
  twister: { name: 'TRĄBA POWIETRZNA', col: '#cfe0ee', dark: '#3a4a5a' },
  ninja: { name: 'NINJA', col: '#3a3a44', dark: '#c81e1e' },
  goryl: { name: 'GORYL', col: '#8a8a96', dark: '#1a1a20' },
  wizard: { name: 'CZARODZIEJ', col: '#5a4ab8', dark: '#1a1250' },
  iceking: { name: 'LODOWY KRÓL', col: '#9ae4ff', dark: '#1a5a8a' },
  golem: { name: 'KAMIENNY GOLEM', col: '#7a7a82', dark: '#2a2a30' },
  shark: { name: 'KRÓL REKIN', col: '#3a7ab8', dark: '#0a2a4a' },
};
// the four summoned heroes: the user's GIFs cut into 10x3 sheets (frame w x h, feet at the bottom, body centre ax);
// 0-9 they appear, 10-19 they stand, 20-29 they cast
const HERO = { wizard: { img: IMG_WIZ, w: 240, h: 230, ax: 154, tall: 4.6 }, iceking: { img: IMG_ICEK, w: 336, h: 230, ax: 120, tall: 4.8 },
  golem: { img: IMG_GOLEM, w: 331, h: 229, ax: 179, tall: 6 }, shark: { img: IMG_SHARK, w: 293, h: 229, ax: 137, tall: 5.2 } };
const heroFrame = (k, i) => { const H = HERO[k]; return [(i % 10) * H.w, (i / 10 | 0) * H.h, H.w, H.h, H.ax]; };
const boxTex = (k) => tex(20, 20, (g) => { const P = POWERS[k];
  g.fillStyle = '#111'; g.fillRect(0, 0, 20, 20); g.fillStyle = P.dark; g.fillRect(1, 1, 18, 18); g.fillStyle = P.col; g.fillRect(2, 2, 16, 15);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(2, 2, 16, 2); g.fillRect(2, 2, 2, 14);
  const ink = (c, pts) => { g.fillStyle = c; for (const [x, y, w, h] of pts) g.fillRect(x, y, w, h); };
  if (k === 'lightning') { ink('#111', [[10, 3, 4, 2], [8, 5, 4, 2], [6, 7, 7, 2], [9, 9, 3, 2], [8, 11, 3, 2], [7, 13, 3, 2], [6, 15, 2, 2]]); ink('#fff', [[11, 4, 2, 1], [9, 6, 2, 1], [7, 8, 5, 1], [10, 10, 1, 1], [9, 12, 1, 1], [8, 14, 1, 1]]); }
  if (k === 'split') for (const cx of [6, 13]) { ink('#111', [[cx - 3, 7, 6, 6], [cx - 2, 6, 4, 8], [cx - 4, 8, 8, 4]]); ink('#fff', [[cx - 2, 8, 4, 4], [cx - 3, 9, 6, 2], [cx - 1, 7, 2, 6]]); ink('#111', [[cx - 1, 9, 2, 2]]); }
  // the wolf and dragon boxes show the creature's own head, cut from its frames
  const head = (f, fx, fy, fw, fh) => { g.imageSmoothingEnabled = false; const [x, y, w, h] = f; g.drawImage(IMG_C, x + w * fx, y + h * fy, w * fw, h * fh, 2, 2, 16, 15); };
  if (k === 'wolf') head(CR.wolf[12], 0.52, 0.0, 0.48, 0.5);
  const head2 = (im, i, sx, sy, sw, sh) => { g.imageSmoothingEnabled = false; g.drawImage(im, i * 400 + sx, sy, sw, sh, 2, 2, 16, 15); };
  if (k === 'dragon') head2(IMG_SMOK, 4, 120, 0, 150, 140);
  if (k === 'robot') head2(IMG_ROB, 12, 20, 30, 190, 170);
  if (k === 'laser') { g.fillStyle = '#0a0a24'; g.fillRect(2, 2, 16, 15); g.fillStyle = '#fff'; for (const [x, y] of [[4, 4], [15, 5], [6, 14], [16, 15], [11, 3]]) g.fillRect(x, y, 1, 1);
    g.imageSmoothingEnabled = false; g.drawImage(IMG_SAT, 2, 1, 14, 11); ink('#ff2a3a', [[11, 9, 2, 2], [12, 11, 2, 2], [13, 13, 2, 2], [14, 15, 2, 2]]); ink('#ffd0d0', [[12, 10, 1, 1], [13, 12, 1, 1], [14, 14, 1, 1]]); }
  if (k === 'portal') for (const [cx, c1, c2] of [[6, '#ff9a2a', '#ffe0a0'], [14, '#5a2aff', '#c8b0ff']]) { ink('#111', [[cx - 3, 4, 6, 12], [cx - 4, 6, 8, 8]]); ink(c1, [[cx - 2, 5, 4, 10], [cx - 3, 7, 6, 6]]); ink(c2, [[cx - 1, 7, 2, 6]]); ink('#111', [[cx - 1, 8, 2, 4]]); }
  if (k === 'goryl') { g.imageSmoothingEnabled = false; g.drawImage(IMG_GORYL, 2 * 259 + 60, 86, 140, 125, 2, 2, 16, 15); }
  if (HERO[k]) { const H = HERO[k], f = heroFrame(k, 14), hw = H.h * 0.4; g.imageSmoothingEnabled = false; g.drawImage(H.img, f[0] + H.ax - hw / 2, f[1] + 2, hw, hw * 0.94, 2, 2, 16, 15); }
  if (k === 'ninja') { g.imageSmoothingEnabled = false; g.drawImage(IMG_NINJA, 8 * 229 + 60, 20, 110, 100, 2, 2, 16, 15); }
  if (k === 'twister') { ink('#111', [[3, 3, 14, 3], [5, 6, 11, 3], [7, 9, 8, 3], [8, 12, 6, 2], [9, 14, 4, 2]]); ink('#ffffff', [[4, 4, 12, 1], [6, 7, 9, 1], [8, 10, 6, 1], [9, 12, 4, 1]]); ink('#8a9aae', [[5, 5, 10, 1], [7, 8, 7, 1], [9, 11, 5, 1], [10, 13, 3, 1]]); ink('#ffe14a', [[3, 14, 2, 2], [15, 12, 2, 2]]); }
  if (k === 'pinball') { ink('#111', [[9, 6, 8, 8], [8, 7, 10, 6]]); ink('#fff', [[10, 7, 6, 6], [9, 8, 8, 4]]); ink('#111', [[12, 9, 2, 2]]); ink('#2a5a08', [[2, 7, 5, 1], [3, 10, 4, 1], [2, 13, 5, 1]]); ink('#fff', [[4, 4, 2, 2], [15, 15, 2, 2]]); }
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
      } else if (G.state === 'play' && o && o.team === 1 && Math.hypot(o.x - st.x, o.z - st.z) < 1.6) {   // the rivals can grab one too
        G.inv2[st.kind] = (G.inv2[st.kind] || 0) + 1; st.on = false; st.cool = 7; o.powerT = 0.6 + Math.random() * DIFF([3, 2, 1]);
        SFX.pickup(); ui.banner?.('RYWAL MA: ' + POWERS[st.kind].name + '!', TEAMS[1], 'small'); shout(o, 'Ha! Moje!'); FX.emit('curve', st.x, 1, st.z, 20, 4, 0.3, 6);
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
// a rival fires a card he picked up: the same powers, aimed at us
function rivalPower(c, k) {
  G.inv2[k]--; c.vx = c.vz = 0; ui.banner?.('RYWAL ODPALA: ' + POWERS[k].name, TEAMS[1], 'small');
  if (k === 'lightning') { lightning(c); return; }
  if (k === 'dragon') { beastStart(c, 'smok'); return; }
  if (k === 'robot') { beastStart(c, 'robot'); return; }
  if (k === 'portal' || k === 'pinball' || k === 'laser' || k === 'twister' || k === 'ninja' || k === 'goryl' || HERO[k]) { MAGIC.start(c, k); return; }
  ball.owner = null; shoot(c, 0.9, { name: POWERS[k].name, kind: k === 'wolf' ? 'mega' : k });
}
// the super picker: in the air with the ball, STRZAŁ freezes the moment and you choose which super to fire
const PICK = { open: false, opts: [], sel: 0, t: 0, p: null };
const bagCount = () => { let n = 0; for (const k in G.inv) n += G.inv[k]; return n; };
function openPick(c) {
  // no super shot of your own any more: only the cards found on the pitch, and a way back out
  const opts = [];
  for (const k in POWERS) if (G.inv[k] > 0) opts.push({ id: k, name: POWERS[k].name, n: G.inv[k], col: POWERS[k].col, kind: k });
  if (!opts.length) return false;
  opts.push({ id: 'back', name: window.LANG === 'en' ? 'BACK' : 'WRÓĆ', n: -1, col: '#9aa0b0', kind: 'back' });
  Object.assign(PICK, { open: true, opts, sel: 0, t: 0, p: c }); G.state = 'pick'; c.vy = 0; c.vx *= 0.2; c.vz *= 0.2; ball.owner = c;
  G.ca = Math.max(G.ca, 1); SFX.charge(1); ui.picker?.(PICK); return true;
}
function pickMove(d) { if (!PICK.open) return; const n = PICK.opts.length; let i = PICK.sel; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (PICK.opts[i].n !== 0) break; } PICK.sel = i; SFX.menu(); ui.picker?.(PICK); }
// close the picker without using a card: the player keeps the ball and drops back down
function cancelPick() { if (!PICK.open) return; PICK.open = false; ui.picker?.(null); G.state = 'play'; const c = PICK.p; c.act = null; c.jumpBall = false; c.vy = Math.min(c.vy, 0); ball.owner = c; SFX.menu(); }
function doPick(i = PICK.sel) {
  if (!PICK.open) return; const o = PICK.opts[i]; if (!o || o.n === 0) return;
  if (o.id === 'back') { cancelPick(); return; }
  PICK.open = false; ui.picker?.(null); G.state = 'play'; const c = PICK.p; c.act = 'volley'; c.t = 0; c.vy = Math.min(c.vy, 0);
  G.inv[o.id]--; ui.inv?.(G.inv);
  if (o.id === 'lightning') { lightning(c); return; }
  if (o.id === 'wolf') { wolfStart(c); return; }
  if (o.id === 'dragon') { beastStart(c, 'smok'); return; }
  if (o.id === 'robot') { beastStart(c, 'robot'); return; }
  if (o.id === 'portal' || o.id === 'pinball' || o.id === 'laser' || o.id === 'twister' || o.id === 'ninja' || o.id === 'goryl' || HERO[o.id]) { MAGIC.start(c, o.id); return; }
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
// ---- the new transformations: the boy glitches into the dragon or the robot from the GIFs, the fire or the beam carries the ball, then he glitches back
const BEAST_DEF = { smok: { im: () => IMG_SMOK, n: 15, ax: 190, fy: 212, hit: 9, ey: 104, mx: 250, loop: [10, 14], fps: 9, fx: 'fire', h: 6.2 },
                    robot: { im: () => IMG_ROB, n: 28, ax: 95, fy: 214, hit: 15, ey: 88, mx: 280, loop: [18, 27], fps: 11, fx: 'zigzag', h: 5.2 } };
const BEAST = { on: false, kind: 'smok', t: 0, ph: 'in', c: null, dir: 1, spr: {}, launched: false };
function beastStart(c, kind) {
  const B = BEAST_DEF[kind]; if (!BEAST.spr[kind]) { const s2 = makeSprite(B.im(), { unit: B.h / B.fy }); s2.sgrp.visible = false; s2.holder.visible = s2.blob.visible = false; BEAST.spr[kind] = s2; }
  Object.assign(BEAST, { on: true, kind, t: 0, ph: 'in', c, dir: Math.sign(goalX(c.team)), launched: false });
  c.face = BEAST.dir; ball.owner = c; c.vx = c.vz = 0; c.vy = 0; c.y = 0; c.st = 'run'; c.act = null; c.t = 0; G.state = 'dragon'; G.ca = 1.6; SFX.charge(1);
  ui.banner?.(kind === 'smok' ? 'SMOK!' : 'ROBOT!', c.T, 'super', c); shout(c, kind === 'smok' ? 'Smoku!' : 'Robot, start!');
  for (const q of players) if (q.team !== c.team) { q.vx *= 0.2; q.vz *= 0.2; }
}
function beastUpdate(dt) {
  if (!BEAST.on) return; const b = BEAST, B = BEAST_DEF[b.kind], c = b.c; b.t += dt;
  if (b.ph === 'in' && b.t > 0.8) { b.ph = 'show'; b.t = 0; G.shake = 0.6; G.flash = 0.5; b.kind === 'smok' ? SFX.roar() : SFX.thunder(); }
  else if (b.ph === 'show') {
    const fi = b.t * B.fps; if (fi >= B.hit && !b.launched) {
      b.launched = true; const gx = goalX(c.team), u = B.h / B.fy, mx = c.x + b.dir * (B.mx - B.ax) * u, my = (B.fy - B.ey) * u;
      ball.hidden = false; ball.owner = null; ball.x = mx; ball.y = my; ball.z = c.z;
      const tx = gx + b.dir * 0.8, ty = 1.2, tz = (Math.random() - 0.5) * 3, dx = tx - ball.x, dy = ty - ball.y, dz = tz - ball.z, d = Math.hypot(dx, dy, dz), v = 32;
      ball.vx = dx / d * v; ball.vy = dy / d * v; ball.vz = dz / d * v; ball.sup = { name: b.kind === 'smok' ? 'SMOK' : 'ROBOT', kind: 'dragon', team: c.team, t: 0, ox: b.dir, oz: 0, by: c }; ball.last = c; ball.hot = 1;
      b.mouth = [mx, my, c.z]; G.state = 'play'; G.flash = 1; G.shake = 0.9; G.ca = 2.6; b.kind === 'smok' ? SFX.flame() : SFX.thunder(); SFX.super(); }
    // the fire or the beam: a stream of particles from the mouth / the cannon after the ball
    if (b.launched && b.t < B.hit / B.fps + 1.4) { const [mx, my, mz] = b.mouth; for (let i = 0; i < 6; i++) { const u2 = Math.random(); FX.emit(B.fx, mx + (ball.x - mx) * u2, my + (ball.y - my) * u2 + (Math.random() - 0.5) * 0.4, mz + (ball.z - mz) * u2, 1, 1.2, 0.25, b.kind === 'smok' ? 5 : 3); } }
    if (b.t > B.hit / B.fps + 1.6) { b.ph = 'out'; b.t = 0; }
  }
  else if (b.ph === 'out' && b.t > 1.3) { b.on = false; const s2 = b.spr[b.kind]; s2.holder.visible = s2.blob.visible = false; c.spr.holder.visible = true; }
}
function beastDraw() {
  const b = BEAST; for (const k in b.spr) { if (!b.on || k !== b.kind) { b.spr[k].holder.visible = b.spr[k].blob.visible = false; } }
  if (!b.on) { if (b.c && b.c.spr.mat.color.getHex() !== 0xffffff) b.c.spr.mat.color.set('#ffffff'); return; }   // the glitch must not leave the player tinted red or cyan
  const B = BEAST_DEF[b.kind], c = b.c, s2 = b.spr[b.kind], fw = 400;
  const glitch = (sp, amt) => { sp.mesh.position.x += (Math.random() - 0.5) * amt * 1.2; sp.mat.color.set(Math.random() < 0.5 ? (Math.random() < 0.5 ? '#ff5a7a' : '#5affff') : '#ffffff'); sp.holder.visible = Math.random() > amt * 0.35; };
  const reset = (sp) => sp.mat.color.set('#ffffff');
  const showBeast = (fi) => { const f = [(fi | 0) * fw, 0, fw, 225, B.ax]; s2.show(f, b.dir < 0); s2.holder.visible = s2.blob.visible = true; s2.holder.position.set(c.x, 0, c.z); s2.blob.position.set(c.x, 0.02, c.z); s2.blob.scale.set(b.kind === 'smok' ? 3.2 : 2.2, 1.1, 1); };
  if (b.ph === 'in') { glitch(c.spr, 0.2 + Math.min(1, b.t / 0.8)); return; }
  reset(c.spr);
  if (b.ph === 'show') { c.spr.holder.visible = false; const base = b.t * B.fps, span = B.loop[1] - B.loop[0] + 1, fi = base < B.loop[0] ? base : B.loop[0] + ((base - B.loop[0]) % span); showBeast(Math.min(fi, B.n - 1)); reset(s2); return; }
  if (b.ph === 'out') { const k = Math.min(1, b.t / 1.3); if (k < 0.5) { c.spr.holder.visible = false; showBeast(B.loop[0]); glitch(s2, 0.2 + k * 1.6); } else { s2.holder.visible = s2.blob.visible = false; reset(s2); c.spr.holder.visible = true; glitch(c.spr, Math.max(0, 1 - (k - 0.5) * 2)); } }
}
// ---- three new cards: PORTALE (a draw decides which goal the ball flies into), SZALONA PIŁKA (the ball bounces off every rival), LASER Z KOSMOSU (a satellite fires at the keeper)
const MAGIC = (() => {
  // a 2D overlay canvas for the draw and for the space scene
  const cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:40;image-rendering:pixelated;display:none';
  document.body.appendChild(cv); const g = cv.getContext('2d');
  const fit = () => { cv.height = 270; cv.width = Math.round(270 * innerWidth / innerHeight); g.imageSmoothingEnabled = false; };
  const stars = Array.from({ length: 90 }, () => [Math.random(), Math.random(), Math.random()]);
  const ringTex = (a, b) => tex(48, 64, (q) => { for (let i = 0; i < 8; i++) { q.fillStyle = i % 2 ? a : b; const w = 24 - i * 2.6, h = 30 - i * 3.3; q.beginPath(); q.ellipse(24, 32, Math.max(1, w), Math.max(1, h), 0, 0, Math.PI * 2); q.fill(); }
    q.fillStyle = '#0a0418'; q.beginPath(); q.ellipse(24, 32, 9, 13, 0, 0, Math.PI * 2); q.fill(); q.fillStyle = '#fff'; for (let i = 0; i < 6; i++) q.fillRect(14 + Math.random() * 20, 18 + Math.random() * 28, 2, 2); });
  const pgeo = new THREE.PlaneGeometry(3.2, 4.2); pgeo.translate(0, 2.2, 0);
  const portals = [ringTex('#ff9a2a', '#ffd27a'), ringTex('#5a2aff', '#b49aff')].map((t) => { const m = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3, fog: false })); m.visible = false; scene.add(m); toPlay(m); return m; });
  const lgeo = new THREE.PlaneGeometry(3, 60); lgeo.translate(0, 30, 0);
  const beam = new THREE.Mesh(lgeo, new THREE.MeshBasicMaterial({ map: tex(16, 8, (q) => { q.fillStyle = 'rgba(255,40,60,.55)'; q.fillRect(0, 0, 16, 8); q.fillStyle = '#ff2a3a'; q.fillRect(3, 0, 10, 8); q.fillStyle = '#ffd0d0'; q.fillRect(6, 0, 4, 8); }), transparent: true, depthTest: false, depthWrite: false, fog: false }));
  beam.renderOrder = 7; beam.visible = false; scene.add(beam); toPlay(beam);
  // the twister: a grey pixel funnel, three wobbling frames
  const twTex = [0, 1, 2].map((v) => tex(40, 80, (q) => { for (let y = 0; y < 80; y += 4) { const w = 6 + (80 - y) * 0.42, cx = 20 + Math.sin(y * 0.12 + v * 2.1) * 4;
      q.fillStyle = (y / 4 + v) % 3 === 0 ? '#ffffff' : (y / 4 + v) % 3 === 1 ? '#c8d4e0' : '#8a9aae'; q.fillRect(Math.round(cx - w / 2), y, Math.round(w), 4);
      q.fillStyle = 'rgba(40,50,70,.5)'; q.fillRect(Math.round(cx - w / 2), y + 3, Math.round(w), 1); } }));
  const TWN = 30, twMap = new THREE.TextureLoader().load('./fx_tornado.png?v=1'); twMap.magFilter = twMap.minFilter = THREE.NearestFilter; twMap.colorSpace = THREE.SRGBColorSpace; twMap.repeat.set(1 / TWN, 1);
  const twFrame = (T) => (T < 0.6 ? Math.min(9, T / 0.6 * 10 | 0) : T > 3.45 ? 26 + Math.min(3, (T - 3.45) / 0.45 * 4 | 0) : 10 + ((T - 0.6) * 14 | 0) % 16);
  const tgeo = new THREE.PlaneGeometry(11.5, 11.7); tgeo.translate(0, 5.6, 0);
  const twister = new THREE.Mesh(tgeo, new THREE.MeshBasicMaterial({ map: twMap, alphaTest: 0.5, fog: false }));
  twister.visible = false; scene.add(twister); toPlay(twister);
  // ninja: the user's GIF (30 frames of 229x204, feet at y 198, body centre x 112, faces right)
  const NJ = Array.from({ length: 6 }, () => { const sp = makeSprite(IMG_NINJA, { unit: 4.2 / 198 }); sp.holder.visible = sp.blob.visible = sp.sgrp.visible = false; return sp; });
  const njShow = (sp, f, x, y, z, dir) => { sp.show([f * 229, 0, 229, 204, 112], dir < 0); sp.holder.visible = sp.blob.visible = true; sp.holder.position.set(x, y, z); sp.blob.position.set(x, 0.02, z); sp.blob.scale.set(1.6, 0.6, 1); };
  // gorilla: the user's GIF (30 frames of 259x189, feet at y 182, body centre x 105, faces right); 0-9 crouch, 10-22 leap, 23-29 landing smash
  const GR = makeSprite(IMG_GORYL, { unit: 5.4 / 208 }); GR.holder.visible = GR.blob.visible = GR.sgrp.visible = false;
  const grShow = (f, x, y, z, dir) => { GR.show([f * 259, 0, 259, 215, 105], dir < 0); GR.holder.visible = GR.blob.visible = true; GR.holder.position.set(x, y, z); GR.blob.position.set(x, 0.02, z); GR.blob.scale.set(2.6, 1, 1); };
  const njHide = () => NJ.forEach((sp) => (sp.holder.visible = sp.blob.visible = false));
  // the four heroes: one sprite each, and their props (falling rocks, the wave, the ice rings, the glow under floating rivals)
  const HS = Object.fromEntries(Object.keys(HERO).map((k) => { const H = HERO[k], sp = makeSprite(H.img, { unit: H.tall / H.h }); sp.holder.visible = sp.blob.visible = sp.sgrp.visible = false; return [k, sp]; }));
  const hShow = (k, f, x, z, dir, y = 0) => { const sp = HS[k]; sp.show(heroFrame(k, Math.max(0, Math.min(29, f | 0))), dir < 0); sp.holder.visible = sp.blob.visible = true; sp.holder.position.set(x, y, z); sp.blob.position.set(x, 0.02, z); sp.blob.scale.set(HERO[k].tall * 0.45, 0.8, 1); };
  const hHide = () => { for (const k in HS) HS[k].holder.visible = HS[k].blob.visible = false; };
  const billboard = (img, wd, ht, n) => Array.from({ length: n }, () => { const t = new THREE.Texture(img); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    const geo = new THREE.PlaneGeometry(wd, ht); geo.translate(0, ht / 2, 0); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, fog: false })); m.visible = false; scene.add(m); toPlay(m); return m; });
  const ROCKS = billboard(IMG_ROCK, 1.9, 1.75, 11);
  // the wave: a pixel crest with foam, a few of them side by side across the pitch
  const waveTex = tex(64, 48, (q) => { for (let x = 0; x < 64; x++) { const h = 30 + Math.round(Math.sin(x / 64 * Math.PI) * 14 + Math.sin(x * 0.7) * 2);
      for (let y = 48 - h; y < 48; y++) { const d = y - (48 - h); q.fillStyle = d < 3 ? '#ffffff' : d < 6 ? '#bfefff' : d < 14 ? '#4ab8f0' : d < 26 ? '#2a86d0' : '#1a5aa8'; q.fillRect(x, y, 1, 1); } }
    q.fillStyle = '#ffffff'; for (let i = 0; i < 22; i++) q.fillRect(Math.random() * 64 | 0, 4 + Math.random() * 12 | 0, 2, 2);
    q.fillStyle = '#8ad8ff'; for (let i = 0; i < 30; i++) q.fillRect(Math.random() * 64 | 0, 20 + Math.random() * 26 | 0, 3, 1); });
  const wgeo = new THREE.PlaneGeometry(9, 6.5); wgeo.translate(0, 3.1, 0);
  const WAVES = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(wgeo, new THREE.MeshBasicMaterial({ map: waveTex, transparent: true, alphaTest: 0.5, fog: false })); m.visible = false; scene.add(m); toPlay(m); return m; });
  // the ice rings: flat rings on the grass that grow from the ice ball
  const ringT = tex(64, 64, (q) => { for (let r = 30; r > 20; r -= 2) { q.strokeStyle = r > 26 ? '#ffffff' : r > 23 ? '#bff4ff' : '#5ad0ff'; q.lineWidth = 2; q.beginPath(); q.arc(32, 32, r, 0, Math.PI * 2); q.stroke(); } });
  const ICER = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, opacity: 0.9, depthWrite: false, fog: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); toPlay(m); return m; });
  const orbT = tex(32, 32, (q) => { for (let r = 15; r > 0; r--) { q.fillStyle = r > 12 ? 'rgba(140,230,255,.5)' : r > 8 ? '#8ae8ff' : r > 4 ? '#dff8ff' : '#ffffff'; q.beginPath(); q.arc(16, 16, r, 0, Math.PI * 2); q.fill(); } });
  const ogeo = new THREE.PlaneGeometry(2.4, 2.4); const ORB = new THREE.Mesh(ogeo, new THREE.MeshBasicMaterial({ map: orbT, transparent: true, depthWrite: false, fog: false })); ORB.visible = false; scene.add(ORB); toPlay(ORB);
  const propsHide = () => { ROCKS.forEach((m) => (m.visible = false)); WAVES.forEach((m) => (m.visible = false)); ICER.forEach((m) => (m.visible = false)); ORB.visible = false; };
  const M = { on: false, kind: '', t: 0, ph: '', c: null };
  const txt = (s, x, y, size, col, al = 'center') => { g.font = size + "px 'Press Start 2P', monospace"; g.textAlign = al; g.fillStyle = '#000'; for (const [a, b] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]]) g.fillText(s, x + a, y + b); g.fillStyle = col; g.fillText(s, x, y); };
  const end = () => { hHide(); propsHide(); njHide(); GR.holder.visible = GR.blob.visible = false; M.on = false; cv.style.display = 'none'; portals.forEach((m) => (m.visible = false)); beam.visible = false; twister.visible = false; if (G.state === 'dragon') G.state = 'play'; };
  function start(c, kind) {
    Object.assign(M, { on: true, kind, t: 0, ph: 'a', c, dir: Math.sign(goalX(c.team)), hit: [], spin: 0 });
    c.vx = c.vz = 0; c.vy = 0; c.y = 0; c.st = 'run'; c.act = null; c.t = 0; ball.owner = c; G.state = 'dragon'; fit();
    for (const q of players) if (q.team !== c.team) { q.vx *= 0.2; q.vz *= 0.2; }
    if (kind === 'portal') { ui.banner?.('PORTALE!', c.T, 'super', c); shout(c, 'Losujemy!'); SFX.portal(); ball.owner = null;
      M.px = [goalX(c.team) - M.dir * 7, goalX(1 - c.team) + M.dir * 7]; M.good = Math.random() < 0.6; M.sel = 0; M.nextTick = 0; M.tick = 0.07; }
    if (kind === 'pinball') { ui.banner?.('SZALONA PIŁKA!', c.T, 'super', c); shout(c, 'Leć!'); SFX.super(); ball.owner = null; ball.hidden = false;
      // the ball's route: nearest rival each time, then back to the boy
      const left = players.filter((q) => q.team !== c.team); let at = c; M.route = [];
      while (left.length) { left.sort((a, b) => dist(a, at) - dist(b, at)); at = left.shift(); M.route.push(at); }
      M.route.push(c); M.i = 0; ball.x = c.x; ball.z = c.z; ball.y = 1; }
    if (kind === 'goryl') { ui.banner?.('GORYL!', c.T, 'super', c); shout(c, 'Uga buga!'); SFX.roar(); ball.owner = c;
      const left = players.filter((q) => q.team !== c.team); let at = c; M.route = [];
      while (left.length) { left.sort((a, b) => dist(a, at) - dist(b, at)); at = left.shift(); M.route.push(at); }
      M.gx = c.x; M.gz = c.z; M.i = -1; M.hopT = 0; }
    if (kind === 'ninja') { ui.banner?.('NINJA!', c.T, 'super', c); shout(c, 'Cień!'); SFX.charge(1); ball.owner = null; ball.hidden = true;
      const gx = goalX(c.team), sg = Math.sign(gx); M.fin = [gx - sg * 9, 0]; M.sx = c.x; M.sz = c.z;
      // the ninja's round: every rival, nearest first, keeper last
      const left = players.filter((q) => q.team !== c.team && !q.keeper); let at = c; M.route = [];
      while (left.length) { left.sort((a, b) => dist(a, at) - dist(b, at)); at = left.shift(); M.route.push(at); }
      const gk = players.find((q) => q.team !== c.team && q.keeper); if (gk) M.route.push(gk);
      M.done = new Set(); M.STEP = 0.55; M.T0 = 1.2; M.T1 = M.T0 + M.route.length * M.STEP; }
    if (HERO[kind]) { const nm = { wizard: ['CZARODZIEJ!', 'Abrakadabra!'], iceking: ['LODOWY KRÓL!', 'Zamarznij!'], golem: ['KAMIENNY GOLEM!', 'Ziemia drży!'], shark: ['KRÓL REKIN!', 'Fala!'] }[kind];
      ui.banner?.(nm[0], c.T, 'super', c); shout(c, nm[1]); SFX.charge(1); ball.owner = c;
      M.hx = c.x - M.dir * 2.6; M.hz = Math.max(-PZ + 3, Math.min(PZ - 3, c.z - 1.5)); M.cast = false; M.done = new Set();
      M.vic = players.filter((q) => q.team !== c.team).map((q, i) => ({ q, x0: q.x, z0: q.z, i, ph: Math.random() * 6 }));
      if (kind === 'golem') M.rocks = M.vic.map((v, i) => ({ v, t0: 0.15 * i, x: v.q.x, z: v.q.z }));
      if (kind === 'shark') { M.wx0 = goalX(c.team) + M.dir * 6; M.wx1 = goalX(1 - c.team) - M.dir * 2; } }
    if (kind === 'twister') { ui.banner?.('TRĄBA POWIETRZNA!', c.T, 'super', c); shout(c, 'Wiej!'); SFX.super(); SFX.portal();
      M.tx = c.x + M.dir * 4; M.tz = Math.max(-PZ + 5, Math.min(PZ - 2, c.z + 3)); M.dropX = goalX(1 - c.team) * 0.7;
      M.vic = players.filter((q) => q.team !== c.team).map((q, i) => ({ q, x0: q.x, z0: q.z, a: i * 1.1, r: 1.6 + (i % 3) * 0.6, h: 1 + (i % 4) * 1.6 })); }
    if (kind === 'laser') { ui.banner?.('LASER Z KOSMOSU!', c.T, 'super', c); shout(c, 'Satelita, ognia!'); SFX.charge(1); M.gk = players.find((q) => q.team !== c.team && q.keeper); cv.style.display = 'block'; }
  }
  function update(dt) {
    if (!M.on) return; const c = M.c; M.t += dt;
    if (M.kind === 'portal') {
      if (M.ph === 'a') { // the portals open, the ball is pulled in and vanishes
        portals.forEach((m, i) => { m.visible = true; m.position.set(M.px[i], 0, 0); m.scale.setScalar(Math.min(1, M.t / 0.5)); });
        const k = Math.min(1, M.t / 0.7); ball.y = 1 + k * 2; ball.x = c.x + c.face * 0.6; ball.z = c.z; FX.emit('curve', ball.x, ball.y, ball.z, 2, 1, 0.3);
        if (M.t > 0.7) { ball.hidden = true; FX.emit('curve', ball.x, ball.y, ball.z, 20, 4, 0.4, 6); M.ph = 'draw'; M.t = 0; cv.style.display = 'block'; } }
      else if (M.ph === 'draw') { // the draw: the highlight jumps between the two goals, slows down and stops
        if (M.t >= M.nextTick && M.t < 2.6) { M.sel ^= 1; M.nextTick = M.t + M.tick; M.tick *= 1.13; SFX.tick(M.sel); }
        if (M.t >= 2.6 && !M.done) { M.done = true; M.sel = M.good ? 0 : 1; SFX[M.good ? 'pickup' : 'tackle'](); }
        portals.forEach((m, i) => { m.material.color.set(i === M.sel ? '#ffffff' : '#555566'); m.scale.setScalar(i === M.sel ? 1.15 : 0.9); });
        if (M.t > 3.4) { // out of the chosen portal and into that goal
          cv.style.display = 'none'; const i = M.good ? 0 : 1, gx = goalX(i === 0 ? c.team : 1 - c.team), s = Math.sign(gx);
          ball.hidden = false; ball.owner = null; ball.x = M.px[i]; ball.y = 2.2; ball.z = 0;
          const tz = (Math.random() - 0.5) * 3, dx = gx + s * 0.8 - ball.x, dy = 1.2 - ball.y, dz = tz, d = Math.hypot(dx, dy, dz), v = 24;
          ball.vx = dx / d * v; ball.vy = dy / d * v; ball.vz = dz / d * v; ball.last = c; ball.hot = 1;
          ball.sup = { name: 'PORTAL', kind: 'portal', team: M.good ? c.team : 1 - c.team, t: 0, ox: s, oz: 0, by: c };
          SFX.portal(); SFX.super(); G.flash = 0.8; G.shake = 0.6; FX.emit('curve', ball.x, 2.2, 0, 30, 6, 0.5, 8); M.ph = 'b'; M.t = 0; G.state = 'play'; } }
      else if (M.ph === 'b') { portals.forEach((m) => m.scale.setScalar(Math.max(0.01, 1 - M.t / 0.8))); if (M.t > 0.8) end(); }
    }
    if (M.kind === 'pinball') {
      const tgt = M.route[M.i]; if (!tgt) { end(); return; }
      const dx = tgt.x - ball.x, dz = tgt.z - ball.z, d = Math.hypot(dx, dz), v = 30 * dt;
      ball.spin += dt * 40; ball.hot = 1; ball.y = 1 + Math.abs(Math.sin(M.t * 9)) * 0.8; FX.emit('zigzag', ball.x, ball.y + 0.3, ball.z, 2, 0.8, 0.28);
      if (d <= v + 0.3) {
        if (tgt === c) { ball.owner = c; c.hold = 0; ball.hot = 0; SFX.pickup(); if (c.team === 0) ui.banner?.('STRZELAJ!', c.T, 'small'); shout(c, 'Teraz!'); end(); return; }
        knock(tgt, 7, { lie: Math.random() < 0.5 ? 'lieBack' : 'lieFront', dizzy: true, foul: false, push: [dx / (d || 1) * 6, dz / (d || 1) * 6] });
        SFX.boing(); G.shake = Math.max(G.shake, 0.35); FX.emit('zigzag', ball.x, 1.2, ball.z, 16, 4, 0.35, 6); M.i++;
      } else { ball.x += dx / d * v; ball.z += dz / d * v; }
    }
    if (M.kind === 'goryl') { const T = M.t, HOP = 0.75;
      c.spr.holder.visible = T < 0.4 ? Math.random() < 0.5 : false; ball.owner = c; ball.hidden = true;
      if (T < 0.9) { grShow((T * 12 | 0) % 10, M.gx, 0, M.gz, M.dir); return; }
      // one leap per rival: frames 10-22 in the air, 23-26 the smash where he lands
      const k = T - 0.9, i = Math.floor(k / HOP), u = (k % HOP) / HOP, tgt = M.route[i];
      if (!tgt) { const e = k - M.route.length * HOP; grShow(26 + Math.min(3, e * 8 | 0), M.gx, 0, M.gz, M.dir);
        if (e > 0.7) { c.x = M.gx; c.z = M.gz; c.spr.holder.visible = true; ball.hidden = false; ball.owner = c; c.hold = 0; if (c.team === 0) ui.banner?.('STRZELAJ!', c.T, 'small'); shout(c, 'Teraz!'); end(); } return; }
      if (i !== M.i) { M.i = i; M.fx = M.gx; M.fz = M.gz; M.hit = false; }
      const dir = Math.sign(tgt.x - M.fx) || M.dir, air = u < 0.72, w = Math.min(1, u / 0.72), x = M.fx + (tgt.x - M.fx) * w, z = M.fz + (tgt.z - M.fz) * w;
      if (air) grShow(10 + Math.min(12, w * 13 | 0), x, Math.sin(w * Math.PI) * 7, z, dir);
      else { grShow(23 + Math.min(3, (u - 0.72) / 0.28 * 4 | 0), tgt.x, 0, tgt.z, dir); M.gx = tgt.x; M.gz = tgt.z;
        if (!M.hit) { M.hit = true; knock(tgt, 7, { lie: Math.random() < 0.5 ? 'lieBack' : 'lieFront', dizzy: true, foul: false, push: [dir * 4, (Math.random() - 0.5) * 4] });
          SFX.tackle(); G.shake = 0.7; FX.emit('dust', tgt.x, 0.4, tgt.z, 22, 5, 0.5, 6); } }
      return; }
    if (M.kind === 'ninja') { const T = M.t, sg = M.dir, [fx, fz] = M.fin;
      // 0-0.5 the boy glitches into the kneeling ninja; 0.5-1.2 he leaps up and is gone; then he pops up by every rival in turn,
      // a slash in a puff of green smoke and the rival lies dizzy; at last he lands before the goal and kicks the ball in
      const puff = (x, z, n = 18) => { FX.emit('smoke', x, 0.6, z, n, 3.2, 0.55, -1.2); FX.emit('smoke', x, 1.6, z, n >> 1, 2.2, 0.7, -0.8); };
      c.spr.holder.visible = T < 0.5 ? Math.random() < 0.5 : false; njHide();
      if (T < M.T0) { const k = Math.max(0, (T - 0.5) / 0.7); njShow(NJ[0], T < 0.5 ? (T * 6 | 0) % 3 : 16 + (k * 6 | 0), M.sx, k * k * 14, M.sz, sg); if (T > 0.5 && !M.j) { M.j = true; SFX.tackle(); puff(M.sx, M.sz, 10); } }
      else if (T < M.T1) { const i = Math.min(M.route.length - 1, (T - M.T0) / M.STEP | 0), q = M.route[i], u = (T - M.T0 - i * M.STEP) / M.STEP, side = q.x > fx ? -1 : 1;
        const nx = q.x - sg * 1.5, nz = q.z + 0.2;
        if (!M.done.has('in' + i)) { M.done.add('in' + i); puff(nx, nz, 14); SFX.portal(); }
        njShow(NJ[0], u < 0.35 ? 3 + (u / 0.35 * 6 | 0) : 9 + Math.min(6, ((u - 0.35) / 0.4 * 7) | 0), nx, 0, nz, sg);
        if (u > 0.45 && !M.done.has(i)) { M.done.add(i); knock(q, 6.5, { lie: Math.random() < 0.5 ? 'lieBack' : 'lieFront', dizzy: true, foul: false, push: [sg * 3, (Math.random() - 0.5) * 2] });
          puff(q.x, q.z, 26); SFX.tackle(); G.shake = Math.max(G.shake, 0.35); FX.streak(q.x, 1.4, q.z, sg); }
        if (u > 0.85 && !M.done.has('out' + i)) { M.done.add('out' + i); puff(nx, nz, 10); } }
      else { const k = (T - M.T1) / 1.2, f = Math.min(29, 3 + (k * 27 | 0)); njShow(NJ[0], f, fx, f > 13 ? Math.sin(Math.min(1, (f - 13) / 16) * Math.PI) * 1.6 : 0, fz, sg);
        if (!M.flash) { M.flash = true; G.flash = 0.6; G.shake = 0.5; puff(fx, fz, 24); ball.hidden = false; ball.x = fx + sg * 1.2; ball.z = fz; ball.y = 0.3; ball.vx = ball.vz = ball.vy = 0; }
        if (f >= 22 && !M.kick) { M.kick = true; const gx = goalX(c.team), tz = (Math.random() - 0.5) * 6, dx = gx + sg * 0.8 - ball.x, dz = tz - ball.z, d = Math.hypot(dx, dz);
          ball.owner = null; ball.vx = dx / d * 34; ball.vz = dz / d * 34; ball.vy = 0; ball.y = 1; ball.last = c; ball.hot = 1; ball.sup = { name: 'NINJA', kind: 'fire', team: c.team, t: 0, ox: sg, oz: 0, by: c };
          SFX.kick(); SFX.super(); G.state = 'play'; }
        if (T > M.T1 + 1.2) { c.spr.holder.visible = true; end(); } }
      return; }
    if (HERO[M.kind]) { heroUpdate(c, dt); return; }
    if (M.kind === 'twister') {
      const T = M.t; twister.visible = true; twMap.offset.x = twFrame(T) / TWN; twister.quaternion.copy(camera.quaternion);
      // grows, sucks everyone in (0-1.1 s), spins and carries them towards your goal (1.1-3.1 s), throws them out (3.1-3.8 s)
      const mv = Math.max(0, Math.min(1, (T - 1.1) / 2)), e = mv * mv * (3 - 2 * mv), x = M.tx + (M.dropX - M.tx) * e, z = M.tz * (1 - e);
      twister.position.set(x, 0, z); twister.scale.setScalar(1);
      for (let i = 0; i < 1; i++) { const a = Math.random() * 6.3, h = Math.random() * 2, r = 0.8 + h * 0.35; FX.emit('tornado', x + Math.cos(a) * r, h, z + Math.sin(a) * r, 1, 0.6, 0.3); }
      if (Math.random() < 0.5) FX.emit('dust', x + (Math.random() - 0.5) * 3, 0.2, z + (Math.random() - 0.5) * 3, 1, 2, 0.4, 4);
      G.shake = Math.max(G.shake, 0.12);
      for (const v of M.vic) { const q = v.q;
        if (T < 3.1) { const k = Math.min(1, T / 1.1), ang = v.a + T * 7, ox = Math.cos(ang) * v.r * (1 + v.h * 0.1), oz = Math.sin(ang) * v.r * 0.6;
          q.st = 'down'; q.t = 9; q.lie = (T * 6 + v.a | 0) % 2 ? 'lieBack' : 'lieFront'; q.dizzy = true; q.vx = q.vz = q.vy = 0;
          q.x = v.x0 + (x + ox - v.x0) * k; q.z = v.z0 + (z + oz - v.z0) * k; q.y = v.h * k + Math.sin(T * 5 + v.a) * 0.4; q.face = Math.cos(ang) > 0 ? 1 : -1; }
        else if (!v.thrown) { v.thrown = true; const a = v.a + T * 7; q.vx = Math.cos(a) * 5; q.vz = Math.sin(a) * 4; q.vy = 6; knock(q, 6.5, { lie: Math.random() < 0.5 ? 'lieBack' : 'lieFront', dizzy: true, foul: false, push: [q.vx, q.vz] }); q.vy = 6; } }
      if (T > 3.1 && !M.thud) { M.thud = true; SFX.tackle(); G.shake = 0.7; }
      if (T > 3.9) { ball.owner = c; if (c.team === 0) ui.banner?.('PUSTA BRAMKA!', c.T, 'small'); shout(c, 'Teraz!'); end(); }
    }
    if (M.kind === 'laser') {
      if (M.ph === 'a' && M.t > 3.0) { M.ph = 'b'; M.t = 0; cv.style.display = 'none'; SFX.zap(); G.flash = 1.4; G.shake = 1.2; G.ca = 2.6; }
      if (M.ph === 'b') { const k = M.gk; beam.visible = Math.random() < 0.85; beam.position.set(k.x, 0, k.z); beam.quaternion.copy(camera.quaternion); beam.scale.x = 1 + Math.sin(M.t * 40) * 0.2;
        FX.emit('fire', k.x + (Math.random() - 0.5) * 2, 0.3 + Math.random(), k.z + (Math.random() - 0.5) * 2, 3, 3, 0.4);
        if (!M.zapped) { M.zapped = true; knock(k, 8, { lie: 'lieBack', dizzy: true, foul: false }); for (const q of players) if (q.team !== c.team && q !== k && dist(q, k) < 4) knock(q, 4, { lie: 'lieBack', dizzy: true, foul: false, push: [(q.x - k.x) * 3, (q.z - k.z) * 3] }); }
        if (M.t > 0.9) { ball.owner = c; if (c.team === 0) ui.banner?.('BRAMKARZ LEŻY!', c.T, 'small'); shout(c, 'Pusta bramka!'); end(); } }
    }
  }
  // the heroes: appear (0-1 s), stand (1-1.6 s), cast (1.6-2.6 s), then each does his trick
  const CAST = 2.6;
  const heroFrameAt = (T) => (T < 1 ? T * 10 : T < 1.6 ? 10 + (T - 1) / 0.6 * 9 : Math.min(29, 20 + (T - 1.6) * 10));
  const lieDown = (q, dur, push = [0, 0]) => { q.st = 'run'; knock(q, dur, { lie: Math.random() < 0.5 ? 'lieBack' : 'lieFront', dizzy: true, foul: false, push }); };
  function heroUpdate(c, dt) {
    const T = M.t, k = M.kind, sg = M.dir;
    const finish = (msg) => { ball.owner = c; ball.hidden = false; c.hold = 0; if (c.team === 0) ui.banner?.(msg, c.T, 'small'); shout(c, 'Teraz!'); end(); };
    if (T < CAST + 0.2) hShow(k, heroFrameAt(T), M.hx, M.hz, sg);
    if (T < 1 && Math.random() < 0.5) FX.emit(k === 'golem' ? 'dust' : k === 'shark' || k === 'iceking' ? 'tornado' : 'zigzag', M.hx, 1 + Math.random() * 2, M.hz, 2, 2, 0.3);
    if (T > 1.9 && !M.cast) { M.cast = true; SFX.super(); G.flash = 0.4; }
    if (k === 'wizard') {
      // a bright glow round every rival, then they all float up high, hang there, and drop
      if (T > 2.1 && T < 2.9) for (const v of M.vic) if (Math.random() < 0.4) FX.emit('sparkle', v.q.x + (Math.random() - 0.5) * 1.4, 0.3 + Math.random() * 2.2, v.q.z, 1, 0.6, 0.28);
      if (T > 2.1 && !M.done.has('glow')) { M.done.add('glow'); SFX.portal(); for (const v of M.vic) FX.emit('curve', v.q.x, 1.2, v.q.z, 14, 2.5, 0.3); }
      if (T > 2.6 && T < 5.4) { const u = Math.min(1, (T - 2.6) / 1.2);
        for (const v of M.vic) { const q = v.q; q.st = 'dizzy'; q.t = 9; q.vx = q.vz = q.vy = 0; q.x = v.x0; q.z = v.z0; q.y = u * u * (3 - 2 * u) * (3 + (v.i % 3) * 0.8) + Math.sin(T * 3 + v.ph) * 0.3;
          if (Math.random() < 0.25) FX.emit('sparkle', q.x, q.y + 0.5, q.z, 1, 0.5, 0.25); } }
      if (T > 5.4 && !M.done.has('drop')) { M.done.add('drop'); for (const v of M.vic) { v.q.vy = -2; v.q.st = 'run'; v.q.t = 0; lieDown(v.q, 5); v.q.vy = -4; } }
      if (T > 6.2) { SFX.tackle(); G.shake = 0.5; finish('LATAJĄ! STRZELAJ!'); }
      return; }
    if (k === 'iceking') {
      // ice energy shot forward, a ball of ice that sends rings out and freezes every rival blue
      const ox = M.hx + sg * 5, oz = M.hz;
      if (T > 2.0 && T < 2.6) for (let i = 0; i < 3; i++) FX.emit('tornado', M.hx + sg * (1.5 + Math.random() * 3.5), 2.4 + (Math.random() - 0.5), M.hz, 1, 0.5, 0.35);
      if (T > 2.3 && T < 4.6) { ORB.visible = true; ORB.position.set(ox, 2.4, oz); ORB.quaternion.copy(camera.quaternion); ORB.scale.setScalar(Math.min(1.4, (T - 2.3) * 2) * (1 + Math.sin(T * 20) * 0.08)); }
      else ORB.visible = false;
      if (T > 2.7 && T < 4.6) { const R = (T - 2.7) * 26; ICER.forEach((m, i) => { const r = Math.max(0.1, R - i * 5); m.visible = r < 70; m.position.set(ox, 0.06 + i * 0.01, oz); m.scale.setScalar(r); m.material.opacity = Math.max(0, 0.95 - r / 75); });
        if (!M.done.has('boom')) { M.done.add('boom'); SFX.zap(); G.shake = 0.5; G.flash = 0.5; }
        for (const v of M.vic) { const q = v.q; if (!M.done.has(q) && Math.hypot(q.x - ox, (q.z - oz) * 1.4) < R) { M.done.add(q); q.st = 'dizzy'; q.t = 4.2; q.dizzy = false; q.vx = q.vz = q.vy = 0; q.ice = 4.2; FX.emit('tornado', q.x, 1.2, q.z, 12, 2, 0.3); SFX.pickup(); } } }
      else ICER.forEach((m) => (m.visible = false));
      if (T > 4.6) { hHide(); FX.emit('tornado', M.hx, 2, M.hz, 20, 3, 0.35); finish('ZAMROŻENI! BIEGNIJ!'); }
      return; }
    if (k === 'golem') {
      // the fist goes up, cut to the volcano erupting, then rocks rain down on every rival
      if (T > 2.6 && T < 4.8) { cv.style.display = 'block'; G.shake = Math.max(G.shake, 0.25); if (!M.done.has('volc')) { M.done.add('volc'); SFX.roar(); } }
      if (T > 4.8 && !M.done.has('back')) { M.done.add('back'); cv.style.display = 'none'; hHide(); G.flash = 0.3; }
      if (T > 4.8) { const tt = T - 4.8;
        M.rocks.forEach((r, i) => { const m = ROCKS[i]; if (!m) return; const u = (tt - r.t0) / 0.7;
          if (u < 0) { m.visible = false; r.x = r.v.q.x; r.z = r.v.q.z; return; }
          m.visible = u < 2.2; m.quaternion.copy(camera.quaternion); m.rotation.z = 0;
          const y = Math.max(0, 26 * (1 - Math.min(1, u))); m.position.set(r.x + (1 - Math.min(1, u)) * -sg * 6, y, r.z);
          if (u >= 1 && !M.done.has(r)) { M.done.add(r); lieDown(r.v.q, 5.5, [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3]); SFX.tackle(); G.shake = Math.max(G.shake, 0.55); FX.emit('dust', r.x, 0.4, r.z, 20, 5, 0.45, 6); } });
        if (tt > 0.15 * M.rocks.length + 1.6) finish('KAMIENIE! STRZELAJ!'); }
      return; }
    if (k === 'shark') {
      // a wave rolls over the whole pitch: rivals are washed away, our boys jump over it
      if (T > 2.6) { const u = Math.min(1, (T - 2.6) / 2.4), wx = M.wx0 + (M.wx1 - M.wx0) * u;
        if (T > 2.7) hHide();
        WAVES.forEach((m, i) => { m.visible = u < 1; m.position.set(wx + Math.sin(T * 4 + i) * 0.4, 0, -PZ + 2 + i * (2 * PZ - 4) / 5); m.quaternion.copy(camera.quaternion); m.scale.x = -sg; });
        if (Math.random() < 0.8) FX.emit('tornado', wx, 2 + Math.random() * 3, (Math.random() - 0.5) * 2 * PZ, 2, 2.5, 0.35, 6);
        G.shake = Math.max(G.shake, 0.18);
        for (const p of players) { const ahead = (p.x - wx) * sg;
          if (p.team === c.team) { if (ahead > 0 && ahead < 3.5 && p.y <= 0.01 && p.st !== 'down') { p.vy = 12; p.y = 0.02; p.st = p.st === 'run' ? 'jump' : p.st; } }
          else { const v = M.vic.find((o) => o.q === p); if (ahead < 1.2 && !v.wet) { v.wet = true; SFX.boing(); }
            if (v.wet && u < 1) { p.st = 'down'; p.t = 9; p.lie = 'lieFront'; p.dizzy = true; p.vx = p.vz = 0; p.x = wx + sg * 0.8 + (v.i % 3) * sg * 0.6; p.y = 1.2 + Math.sin(T * 6 + v.ph) * 0.5; p.vy = 0; } } }
        if (u >= 1 && !M.done.has('crash')) { M.done.add('crash'); WAVES.forEach((m) => (m.visible = false)); FX.emit('tornado', M.wx1, 1, 0, 30, 6, 0.4, 6);
          for (const v of M.vic) { v.q.st = 'run'; lieDown(v.q, 4.5, [sg * 3, (Math.random() - 0.5) * 3]); } SFX.tackle(); }
        if (T > 5.4) finish('ZMYCI! STRZELAJ!'); }
      return; }
  }
  function draw() {
    if (!M.on || cv.style.display === 'none') return; const W = cv.width, H = cv.height, t = M.t; g.clearRect(0, 0, W, H);
    if (M.kind === 'portal') {
      g.fillStyle = 'rgba(10,4,24,.55)'; g.fillRect(0, H / 2 - 46, W, 92);
      const opts = [['BRAMKA RYWALA', '#7aff5a'], ['TWOJA BRAMKA', '#ff4a5a']];
      opts.forEach(([s, col], i) => { const x = W / 2 + (i ? 1 : -1) * W * 0.22, on = M.sel === i;
        g.fillStyle = on ? col : '#333344'; g.fillRect(x - 92, H / 2 - 22, 184, 44); g.fillStyle = '#000'; g.fillRect(x - 88, H / 2 - 18, 176, 36);
        txt(s, x, H / 2 + 5, 10, on ? col : '#777788'); });
      txt(M.done ? (M.good ? 'GOL DLA CIEBIE!' : 'OJ... SAMOBÓJ!') : 'LOSOWANIE...', W / 2, H / 2 - 30, 12, '#ffe14a');
      return;
    }
    if (M.kind === 'golem') { const t2 = t - 2.6, W2 = W, H2 = H;
      // the volcano: the user's picture, smoke rising from the crater, rocks shot out, the screen shaking
      const sx = (Math.random() - 0.5) * 6, sy = (Math.random() - 0.5) * 4, s = Math.max(W2 / IMG_VOLC.width, H2 / IMG_VOLC.height) * 1.04, iw = IMG_VOLC.width * s, ih = IMG_VOLC.height * s, ox = (W2 - iw) / 2 + sx, oy = (H2 - ih) / 2 + sy;
      g.drawImage(IMG_VOLC, ox, oy, iw, ih); const cx = ox + iw * 0.615, cy = oy + ih * 0.19;
      const grow = Math.min(1, t2 / 1.2), sh = ih * 0.55 * grow, sw = sh * IMG_SMOKE.width / IMG_SMOKE.height; if (sh > 2) g.drawImage(IMG_SMOKE, cx - sw / 2, cy - sh + ih * 0.03, sw, sh);
      for (let i = 0; i < 9; i++) { const a = (i / 9 - 0.5) * 2.2, u = ((t2 * 0.9 + i * 0.37) % 1.3); if (u > 1) continue; const rx = cx + Math.sin(a) * u * W2 * 0.35, ry = cy - Math.cos(a) * u * H2 * 0.6 + u * u * H2 * 0.55, rs = 10 + (i % 3) * 5;
        g.drawImage(IMG_ROCK, rx - rs / 2, ry - rs / 2, rs, rs); }
      for (let i = 0; i < 14; i++) { g.fillStyle = ['#ffd23f', '#ff8a1f', '#e8361f'][i % 3]; g.fillRect(cx + (Math.random() - 0.5) * 30, cy - Math.random() * 18, 2, 2); }
      txt('WULKAN!', W2 / 2, 26, 14, Math.floor(t * 8) % 2 ? '#ff8a1f' : '#ffe14a'); return; }
    // the laser from space: stars, the Earth, the satellite charges up and fires a red beam
    g.fillStyle = '#05040f'; g.fillRect(0, 0, W, H);
    for (const [x, y, b] of stars) { g.fillStyle = (Math.sin(t * 6 + b * 20) > 0.6) ? '#ffffff' : '#8a8ab0'; g.fillRect((x * W) | 0, (y * H) | 0, b > 0.8 ? 2 : 1, b > 0.8 ? 2 : 1); }
    const ex = W - IMG_EARTH.width, ey = H - IMG_EARTH.height + 20; g.drawImage(IMG_EARTH, ex, ey);
    const sc = 0.62, sx = 34 + t * 6, sy = 26 + Math.sin(t * 2) * 3, sw = IMG_SAT.width * sc, sh = IMG_SAT.height * sc; g.drawImage(IMG_SAT, sx, sy, sw, sh);
    const mx = sx + 228 * sc, my = sy + 110 * sc, tx = ex + 150, ty = ey + 120;
    if (t > 0.6 && t < 1.6) { const r = 2 + (t - 0.6) * 9; g.fillStyle = '#ff2a3a'; g.fillRect(mx - r, my - r, r * 2, r * 2); g.fillStyle = '#ffd0d0'; g.fillRect(mx - r / 2, my - r / 2, r, r);
      for (let i = 0; i < 6; i++) { const a = Math.random() * 6.3, d = 10 + Math.random() * 20; g.fillStyle = '#ff6a7a'; g.fillRect(mx + Math.cos(a) * d, my + Math.sin(a) * d, 2, 2); }
      txt('ŁADOWANIE', W / 2, 24, 10, Math.floor(t * 8) % 2 ? '#ff3a4a' : '#ffffff'); }
    if (t >= 1.6 && t < 2.7) { const f = Math.random() < 0.85; if (f) { const len = Math.min(1, (t - 1.6) / 0.15), bx = mx + (tx - mx) * len, by = my + (ty - my) * len;
        for (const [w, col] of [[12, 'rgba(255,40,60,.35)'], [7, '#ff2a3a'], [3, '#ffe0e0']]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(mx, my); g.lineTo(bx, by); g.stroke(); }
        g.fillStyle = '#ff2a3a'; g.fillRect(mx - 7, my - 7, 14, 14); g.fillStyle = '#fff'; g.fillRect(mx - 3, my - 3, 6, 6);
        if (len >= 1) { const r = 8 + Math.random() * 10; g.fillStyle = '#ff6a2a'; g.fillRect(tx - r, ty - r, r * 2, r * 2); g.fillStyle = '#ffe14a'; g.fillRect(tx - r / 2, ty - r / 2, r, r); } }
      txt('OGNIA!', W / 2, 24, 14, '#ff3a4a'); }
    if (t > 2.6) { g.fillStyle = `rgba(255,255,255,${Math.min(1, (t - 2.6) / 0.4)})`; g.fillRect(0, 0, W, H); }
  }
  return { start, update, draw, get on() { return M.on; } };
})();
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
    ball.vx = dx / d * v; ball.vy = dy / d * v; ball.vz = dz / d * v; ball.sup = { name: 'SMOK', kind: 'dragon', team: c.team, t: 0, ox: D.dir, oz: 0, by: c }; ball.last = c; ball.hot = 1;
    G.state = 'play'; G.flash = 1; G.shake = 0.9; G.ca = 2.6; SFX.flame(); SFX.super();
  }
  if (D.t > 4.2) { D.on = false; D.spr.holder.visible = D.spr.blob.visible = false; }
}
// a goal on fire: flames along the posts, the bar and the net for a few seconds
// the burning goal: flames cut from the user's GIF, billboards standing along the crossbar, the posts and the goal line
const GFIRE = (() => {
  const base = new THREE.TextureLoader().load('./fx_flame.png?v=1'); base.magFilter = base.minFilter = THREE.NearestFilter; base.colorSpace = THREE.SRGBColorSpace;
  const pts = []; const W2 = GOAL_W / 2;
  for (let k = 0; k <= 5; k++) pts.push([0, GOAL_H, -W2 + k * GOAL_W / 5, 1.5]);                 // crossbar
  for (const z of [-W2, W2]) for (const y of [0.1, 1.1, 2.2]) pts.push([0, y, z, 1.25]);         // posts
  for (let k = 1; k < 5; k++) pts.push([0, 0.05, -W2 + k * GOAL_W / 5, 1.1]);                     // goal line
  for (let k = 0; k <= 3; k++) pts.push([1, GOAL_H, -W2 + k * GOAL_W / 3, 1.2]);                 // back of the net
  const spr = pts.map(([back, y, z, sc], i) => { const t = base.clone(); t.repeat.set(1 / 30, 1); t.needsUpdate = true;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.4, depthWrite: false, fog: false })); m.center.set(0.5, 0.12); m.scale.set(sc * 1.6, sc * 1.6, 1);
    m.visible = false; m.renderOrder = 5; scene.add(m); toPlay(m); return { m, t, back, y, z, ph: (i * 7) % 18 }; });
  return { spr, T: 0 }; })();
function goalFireUpdate(dt) {
  const F = G.goalFire; if (!F || F.t <= 0) { for (const q of GFIRE.spr) q.m.visible = false; return; } if (F.t >= 5.5) GFIRE.T = 0; F.t -= dt; GFIRE.T += dt;
  { const T = GFIRE.T, sg = Math.sign(F.x);
    for (const q of GFIRE.spr) { const f = T < 0.8 ? 4 + (T / 0.8 * 8 | 0) : F.t < 0.6 ? 29 : 12 + (((T - 0.8) * 10 | 0) + q.ph) % 18; q.t.offset.x = f / 30;
      q.m.visible = true; q.m.position.set(F.x + sg * q.back * GOAL_D, q.y, q.z); } }
  const s = Math.sign(F.x), n = F.t > 1 ? 2 : 1;
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
    else if (c === 'Escape' || c === 'Backspace') cancelPick(); else if (/^Digit[1-9]$/.test(c)) doPick(+c.slice(5) - 1); else if (['KeyK', 'KeyX', 'KeyJ', 'KeyZ', 'Space', 'Enter'].includes(c)) doPick(); return; }
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
  if (p.team === 0 && PERK().shot) power *= PERK().shot;
  const gx = goalX(p.team);
  const aimZ = p === captain && input.z ? input.z * 4 : p === captain ? Math.max(-4, Math.min(4, -p.z * 0.25)) : (Math.random() - 0.5) * 7.5;
  // the captain facing his own goal (stick or last direction) kicks that way: to his keeper if he is in front, else a clearance back
  if (p === captain && !sup && !header) { const dir = input.x ? Math.sign(input.x) : p.face, s = Math.sign(gx);
    if (dir && dir === -s) { const k = players.find((q) => q.team === p.team && q.keeper), ahead = k && Math.sign(k.x - p.x) === dir && Math.abs(k.z - p.z) < Math.abs(k.x - p.x) * 0.6;
      if (ahead && power < 0.6) { pass(p, k); return; }
      const tx = p.x + dir * (14 + power * 16), tz = p.z + (input.z || 0) * 8; kick(p, tx, tz, 14 + power * 14, 1.4 + power * 3); SFX.kick(); return; } }
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
  p.st = 'down'; p.t = dur; p.lie = lie; p.dizzy = dizzy; p.vx = +push[0] || 0; p.vz = +push[1] || 0; p.vy = Math.max(p.vy, 4);
  SFX.tackle(); VIB(35); FX.emit('dust', p.x, 0.4, p.z, 8, 2.5, 0.25, 6); G.ca = Math.max(G.ca, 0.9); G.shake = Math.max(G.shake, 0.18);
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
  const P = G.pen, s = Math.sign(goalX(P.team)), spot = s * (PX - 6.5), def = 1 - P.team;
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
  // Pixels's own penalties are taken in the behind-the-taker view (pen.js); the match waits for the result
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
  const ai = p !== captain, sx = ai ? p.face : (input.x || p.face), sz = ai ? 0 : input.z, l = Math.hypot(sx, sz) || 1;
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
  if (btn === 'star') { if (ball.owner !== c || !free(c) || c.y > 0) return; if (!bagCount()) { SFX.menu(); ui.banner?.(window.LANG === 'en' ? 'NO CARDS' : 'BRAK KART', TEAMS[0], 'small'); return; } G.charge = 0; c.st = 'jump'; c.jumpBall = true; c.y = 1.4; c.vy = 0; openPick(c); return; }
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
      if ((peak || (c.jumpBall && ball.owner === c)) && bagCount() && openPick(c)) return;
      c.act = back && !high ? 'bike' : high ? 'header' : 'volley'; c.t = 0;
      ball.owner = null; shoot(c, 0.9, null, { header: c.act === 'header' }); return;
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
  if (p.team === 1) speed *= DIFF([0.82, 1, 1.14]);
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
    if (p.team === 1 && G.state === 'play') {
      const ks = Object.keys(G.inv2).filter((k) => G.inv2[k] > 0);
      if (ks.length) { p.powerT = (p.powerT ?? 1) - dt; if (p.powerT <= 0 && p.hold > 0.3) { p.powerT = 1; rivalPower(p, ks[(Math.random() * ks.length) | 0]); return; } }
      const pu = G.pu; if (pu && pu.on && Math.hypot(pu.x - p.x, pu.z - p.z) < DIFF([6, 10, 14])) { steer(p, pu.x, pu.z, dt, AI_WALK); return; }
    }
    const toGoal = Math.hypot(opp - p.x, p.z), pressed = players.some((o) => o.team !== p.team && !o.keeper && free(o) && dist(o, p) < 2.6);
    if (toGoal < 15 && p.hold > 0.35) {
      if (false && G.superCool[p.team] <= 0 && Math.random() < (p.team === 1 ? DIFF([0.3, 0.55, 0.8]) : 0.35)) { G.superCool[p.team] = p.team === 1 ? DIFF([16, 11, 7]) : 11; p.autoSuper = true; jump(p); return; }
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
    if (o && o.team !== p.team && !o.keeper && dist(o, p) < 1.7 && G.safe <= 0 && o.hold > 0.5 && Math.random() < dt * (o === captain ? 1.0 : 1.4) * (p.team === 1 ? DIFF([0.55, 1, 1.5]) : 1)) { const r = Math.random(); if (r < 0.2) dropkick(p); else tackle(p, r < 0.6 ? 'slide' : 'shoulder'); }
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
    else if (k === 'portal') { ball.x += ball.vx * dt; ball.y = Math.max(0.6, ball.y + ball.vy * dt); ball.z += ball.vz * dt; FX.emit('curve', ball.x, ball.y + 0.3, ball.z, 4, 1.6, 0.35); }
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
    const mega = S.kind === 'mega' || S.kind === 'dragon' || S.kind === 'portal';
    for (const p of players) if (p.team !== S.team && p.st !== 'down' && Math.hypot(p.x - ball.x, p.z - ball.z) < (mega ? 2.6 : p.keeper ? 1.8 : 1.2) && (mega || Math.abs(ball.y - (p.y + 1.2)) < 1.8)) {
      if (p.keeper && !mega && Math.random() < (p.team === 0 ? (PERK().gloves ? 0.42 : 0.22) : DIFF([0.12, 0.22, 0.34]))) { ball.owner = p; ball.sup = null; p.hold = 0; p.st = 'run'; SFX.save(); ui.banner?.('OBRONA!', p.T, 'small'); return; }
      knock(p, p.keeper ? 1.8 : 2.0, { lie: 'lieBack', dizzy: true, push: [S.ox * (p.keeper ? 11 : 6), S.oz * 3] });
    }
    if (S.t > (S.kind === 'mega' ? 4.5 : 3) && S.kind !== 'dragon' && S.kind !== 'portal') ball.sup = null;
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
      if (Math.abs(ball.z) < GOAL_W / 2 - 0.2 && ball.y < GOAL_H - 0.2) { goalScored(s === Math.sign(goalX(0)) ? 0 : 1); return; }
      ball.x = line - s * 0.3; ball.vx = -ball.vx * 0.55; if (ball.sup) { ball.sup = null; ball.vz *= 0.5; }
    }
  }
  if (Math.abs(ball.z) > PZ - 0.2) { ball.z = Math.sign(ball.z) * (PZ - 0.25); ball.vz = -ball.vz * 0.55; if (ball.sup && ball.sup.kind !== 'zigzag') ball.sup = null; }
}
function goalScored(team) {
  if (WOLF.on) { WOLF.phase = 'back'; WOLF.t = 0; }
  G.score[team]++; if (team === 0 && ball.sup) G.supGoals = (G.supGoals || 0) + 1; G.state = 'goal'; G.pause = 3.2; const shooter = ball.last; ball.sup = null; ball.vx *= 0.15; ball.vz *= 0.15; ball.x = Math.sign(ball.x) * (PX + 1.2);
  SFX.goal(); VIB(team === 0 ? [60, 40, 120] : 200); G.shake = 0.5; G.cheer = team === 0 ? 2.5 : 1.2; G.flares = team === 0 ? 9 : 4; ui.score?.(G); ui.banner?.('GOAL!', TEAMS[team], 'goal');
  for (let i = 0; i < 4; i++) FX.emit(team === 0 ? 'goal' : 'goal2', ball.x, 1.5, ball.z, 14, 5, 0.3, 8);
  // after a goal nobody runs on into the stands: the scorers cheer and hop, the others stand, turn round or walk back to the middle
  for (const p of players) { if (p.st === 'down') { p.vx *= 0.3; p.vz *= 0.3; continue; }
    p.vx = p.vz = 0; p.act = null; if (p.st !== 'jump') p.st = 'run';
    if (p.team === team && !p.keeper) { p.st = 'cheer'; p.t = 3.4; p.goalMode = 'hop'; }
    else p.goalMode = p.keeper ? 'stand' : ['stand', 'turn', 'walk'][(Math.random() * 3) | 0]; }
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
  p.sta = Math.max(0, Math.min(1, p.sta + (running ? -0.32 : 0.14 * (p.team === 0 && PERK().sta ? PERK().sta : 1)) * dt));
  if (control) { if (input.dash && spd > 1 && !p.dash) G.ca = Math.max(G.ca, 0.6); p.dash = input.dash && spd > 1; if (p.dash) G.ca = Math.max(G.ca, 0.18); }
  // speed lines behind a sprinter
  if (spd > 7.2 && p.y < 0.5 && free(p) && Math.random() < 0.7) FX.streak(p.x - p.vx * 0.06, 0.5 + Math.random() * 1.3, p.z + (Math.random() - 0.5) * 0.4, Math.sign(p.vx) || p.face);
}
function step(dt) {
  FX.update(dt); BOLTS.update(dt); TRAIL.update(dt); dragonUpdate(dt); beastUpdate(dt); MAGIC.update(dt); goalFireUpdate(dt);
  if (WOLF.on && G.state !== 'play') { WOLF.t += dt; if (WOLF.phase !== 'back') { WOLF.phase = 'back'; WOLF.t = 0; } else if (WOLF.t > 0.6) wolfEnd(); } PU.update(dt, performance.now() / 1000); updateLines(dt); updateStands(dt, performance.now() / 1000); WX.update(dt, performance.now() / 1000); ARENA.update(dt, performance.now() / 1000); G.shake = Math.max(0, G.shake - dt); G.flash = Math.max(0, G.flash - dt * 2.5);
  if (G.charge) { if (ball.owner !== captain || G.state !== 'play') G.charge = 0; else { G.charge += dt; if (G.charge > 1.1) press('Bup'); } }
  if (G.state === 'penExt') { draw(dt); return; }
  if (G.state === 'dragon') { for (const p of players) physics(p, dt, false); draw(dt); return; }
  if (G.state === 'pick') { PICK.t += dt; if (PICK.t > 6) cancelPick(); draw(dt); return; }
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
    if (G.state === 'goal') { ball.x += ball.vx * dt; ball.z += ball.vz * dt;
      for (const p of players) {
        if (p.goalMode === 'hop' && p.st === 'cheer' && p.y <= 0 && Math.random() < dt * 1.8) { p.vy = 7.5; p.y = 0.01; }
        else if (p.goalMode === 'turn' && p.st === 'run' && Math.random() < dt * 2) p.face = -p.face;
        else if (p.goalMode === 'walk' && p.st === 'run') { steer(p, 0, p.z * 0.6, dt, 2.6); p.face = Math.sign(p.vx) || p.face; }
        else if (p.st === 'run') { p.vx *= 0.8; p.vz *= 0.8; }
        physics(p, dt, false); } }
    if (G.pause <= 0) {
      if (G.state === 'goal' || G.state === 'half') { placeKickoff(G.kickoff); G.state = 'kickoff'; G.pause = 1.2; }
      else { G.state = 'play'; SFX.whistle(); G.safe = 1.5; const k = players.find((p) => p.team === G.kickoff && p.role === 'fwd'); ball.owner = k; k.hold = 0; }
    }
    draw(dt); return;
  }
  if (G.state !== 'play') { draw(dt); return; }
  G.clock -= dt; G.superCool[0] -= dt; G.superCool[1] -= dt; G.safe -= dt;
  if (G.clock <= 0) {
    if (G.half === 1) { G.half = 2; G.clock = HALF(); G.state = 'half'; G.pause = 2.4; G.kickoff = 1 - (window.FIRST_KICK || 0); SFX.whistle(2); ui.banner?.('2. POŁOWA', TEAMS[0], 'big'); }
    else { G.clock = 0; G.state = 'end'; SFX.whistle(3); MUSIC.stop(); ui.end?.(G); }
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
  // safety net: a bad number must never freeze a runner's legs or swallow the ball
  for (const p of players) { for (const k of ['vx', 'vz', 'vy', 'x', 'z', 'y']) if (!Number.isFinite(p[k])) p[k] = 0; if (!Number.isFinite(p.walked)) p.walked = 0; }
  for (const k of ['vx', 'vz', 'vy', 'x', 'z', 'y']) if (!Number.isFinite(ball[k])) ball[k] = 0;
  if (ball.hidden && G.state === 'play' && !MAGIC.on && !BEAST.on && !DRAGON.on) ball.hidden = false;
  for (const p of players) { const lim = p.keeper && p.st === 'down' ? PX + GOAL_D - 0.3 : PX - 0.4; p.x = Math.max(-lim, Math.min(lim, p.x)); p.z = Math.max(-PZ + 0.4, Math.min(PZ - 0.4, p.z));
    if (Math.abs(p.vx) > (p.hd ? 1.5 : 0.4) && free(p)) p.face = Math.sign(p.vx); if (p.y <= 0) p.walked += Math.hypot(p.vx, p.vz) * dt; }
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
  if (p.st === 'cheer') return p.y > 0.05 ? { f: p.pose.jump[Math.min(p.pose.jump.length - 1, 1)], flip } : { f: p.pose.cheer[(t * 5 + p.id | 0) % 3], flip };
  if (p.keeper) {
    const kf = p.T.dir < 0;
    if (p.st === 'gkdive') return { f: p.pose.gkDive[ball.owner === p ? 0 : 1], flip: kf, flat: true };
    if (p.st === 'jump') return { f: p.pose.gkJump[0], flip: kf };
    if (ball.owner === p) return { f: p.pose.gkHold[0], flip: kf };
    return { f: p.pose.gkReady[0], flip: kf, hop: sp > 0.5 ? Math.abs(Math.sin(t * 14)) * 0.12 : 0 };
  }
  if (p.st === 'dive') return { f: p.y > 0.2 ? p.pose.dive[1] : p.t > 0.5 ? p.pose.dive[0] : p.pose.dive[2], flip, flat: p.y > 0.2 || p.t <= 0.5 };
  if (p.st === 'slide') return A.hd ? { f: pick(A.slide, Math.min(0.999, 1 - p.t / 0.5)), flip: A.slideFlip ? !flip : flip } : { f: A.slide ? A.slide[0] : p.pose.dive[2], flip, flat: !A.slide };
  if (p.st === 'shoulder') return { f: p.pose.dive[0], flip };
  if (p.st === 'dropkick') return { f: p.pose.dive[1], flip, flat: true };
  if (p.st === 'jump') {
    if (p.act === 'header') return { f: pick(p.pose.header, 0.4 + Math.min(0.6, (JUMP_V - p.vy) / (2 * JUMP_V))), flip };
    if (p.act === 'bike') return { f: pick(p.pose.bike, (JUMP_V - p.vy) / (2 * JUMP_V)), flip };
    if (p.act === 'volley') return { f: (A.kick || p.pose.jump)[A.kick ? A.kick.length - 1 : 2], flip: A.kickFlip ? !flip : flip };
    return { f: p.vy > APEX ? p.pose.jump[0] : p.vy > -APEX ? p.pose.jump[2] : p.pose.jump[1], flip };
  }
  if (p.st === 'kick') { const k = A.kick; return { f: pick(k, 1 - p.t / 0.25), flip: A.kickFlip ? !flip : flip }; }
  if (sp > (A.hd ? (p.wasRun ? 0.8 : 1.6) : 0.6)) { p.wasRun = true;
    const rate = p.dash ? 0.5 : 0.85, mostlyZ = Math.abs(p.vz) > Math.abs(p.vx) * 1.7;
    if (A.hd) { const r = p.dash ? 0.3 : 0.42, i = (p.walked / r | 0); if (mostlyZ && p.vz < 0 && A.runUp) return { f: A.runUp[i % A.runUp.length], flip }; if (mostlyZ && p.vz > 0 && A.runDown) return { f: A.runDown[i % A.runDown.length], flip }; return { f: A.run[i % A.run.length], flip }; }
    if (mostlyZ && p.vz < 0) { if (A.runUp) return { f: A.runUp[(p.walked / rate | 0) % A.runUp.length], flip }; return { f: A.back[0], flip: (p.walked / 0.8 | 0) % 2 === 1, hop: Math.abs(Math.sin(p.walked * 2)) * 0.12 }; }
    if (mostlyZ && p.vz > 0) return { f: A.front[0], flip: (p.walked / 0.8 | 0) % 2 === 1, hop: Math.abs(Math.sin(p.walked * 2)) * 0.12 };
    return { f: A.run[(p.walked / rate | 0) % A.run.length], flip };
  }
  p.wasRun = false; const lookX = ball.x - p.x; if (A.hd) { if (Math.abs(lookX) > 2.5) p.face = Math.sign(lookX); return { f: A.side[0], flip: p.face < 0 }; } return { f: A.side[0], flip: (Math.abs(lookX) > 0.5 ? Math.sign(lookX) : p.face) < 0 };
}
function draw(dt) {
  const t = performance.now() / 1000;
  for (const p of players) {
    const fr = frameOf(p); if (p.hd) fr.flat = false; p.spr.show(fr.f, fr.flip, !!fr.flat);
    p.spr.holder.position.set(p.x, p.y + (fr.hop || 0), p.z);
    if (p.ice > 0) { p.ice -= dt; p.spr.mat.color.set(p.ice < 0.6 && Math.floor(p.ice * 10) % 2 ? '#ffffff' : '#9ae0ff'); p.iceOn = true; if (p.st === 'dizzy') p.t = Math.max(p.t, 0.05); else if (p.st === 'run') { p.vx = p.vz = 0; } if (p.ice <= 0) p.st = 'run'; }
    else if (p.iceOn) { p.iceOn = false; p.spr.mat.color.set('#ffffff'); }
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
  beastDraw(); MAGIC.draw();
  if (DRAGON.on && DRAGON.spr) { const D = DRAGON, d = D.spr, T = D.t; let f;
    if (T < 1.4) f = DF[DR_FLY[(T * 12 | 0) % DR_FLY.length]]; else if (T < 1.75) f = DF[8]; else if (T < 1.95) f = DF[9]; else if (T < 2.1) f = DF[11]; else if (T < 2.35) f = DF[12]; else if (T < 2.6) f = DF[13]; else f = DF[(T * 12 | 0) % 2 ? 14 : 4];
    d.holder.visible = d.blob.visible = true; d.show(f, D.dir < 0); d.holder.scale.setScalar(DR_S); d.holder.position.set(D.x, D.y, D.z); d.blob.position.set(D.x, 0.02, D.z); const k = Math.max(0.3, 2.6 - D.y * 0.12); d.blob.scale.set(k, k * 0.5, 1); }
  ballSpr.holder.visible = !ball.hidden;
  const big = ball.sup && ball.sup.kind === 'mega' ? 3.4 : 1, split = ball.sup && ball.sup.kind === 'split' ? ball.sup : null;
  ballSpr.holder.scale.setScalar(big); ballSpr.holder.position.set(ball.x, ball.y, ball.z); ballSpr.mesh.rotation.z = -ball.spin;
  G.fakes = split ? split.decoys.filter((d) => d.on) : null;
  decoySpr.forEach((s, i) => { const d = split && split.decoys[i]; const on = !!(d && d.on); s.holder.visible = s.blob.visible = on; if (!on) return;
    s.holder.position.set(d.x, ball.y, d.z); s.mesh.rotation.z = -ball.spin; s.blob.position.set(d.x, 0.025, d.z); const q = Math.max(0.35, 1 - ball.y * 0.1); s.blob.scale.set(0.45 * q, 0.25 * q, 1); });
  ballSpr.mat.color.set(big > 1 ? (Math.floor(t * 8) % 2 ? '#ffffff' : '#ffb0da') : ball.hot > 0 ? (Math.floor(t * 12) % 2 ? '#ff5a3a' : '#ffb03a') : (PERK().ball || '#ffffff'));
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
const covered = () => ['pen', 'kapki', 'lace', 'caps', 'flip', 'bieg'].some((id) => { const e = document.getElementById(id); return e && !e.hidden; });
renderer.setAnimationLoop((now) => { if (!auto) return; if (covered()) { last = now; return; } const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; step(frozen ? 0 : dt); });
placeKickoff(0); G.state = 'menu'; WX.set('leaves'); try { ARENA.set(localStorage.getItem('arena') || 'stadion'); } catch (e) { ARENA.set('stadion'); }
window.GAME = {
  setSide(s) { SIDE = s; TEAMS[0].dir = s; TEAMS[1].dir = -s; },
  whistle() { SFX.unlock(); SFX.whistle(1); },
  start() { G.inv = { lightning: 0, split: 0, mega: 0, wolf: 0, dragon: 0, robot: 0, portal: 0, pinball: 0, laser: 0, twister: 0, ninja: 0, goryl: 0, wizard: 0, iceking: 0, golem: 0, shark: 0 }; G.inv2 = {}; G.supGoals = 0;
    { const pk = PERK(); for (const p of players) { if (p.spd0 == null) p.spd0 = p.spd;
        if (p.team === 0 && p.stats && window.LEVELS) { const l = window.LEVELS(p.num), bb = p === captain && window.BOOT_BONUS ? window.BOOT_BONUS() : [0, 0, 0, 0, 0], v = (i) => Math.min(5.6, 2 + (l[i] + bb[i]) * 0.6);   // level 0 plays like a 2, level 5 like a 5
          p.stats = { st: v(0), pa: v(1), dr: v(2), ob: v(3), sp: v(4) }; p.spd0 = 0.9 + p.stats.sp * 0.035; } p.spd = p.spd0 * (p.team === 0 && pk.speed ? pk.speed : 1); }
      if (pk.card) { const ks = Object.keys(G.inv); G.inv[ks[(Math.random() * ks.length) | 0]] = 1; } } PU.reset(); PICK.open = false; ui.picker?.(null); ui.inv?.(G.inv); G.score = [0, 0]; G.clock = HALF(); SFX.setSfx(!window.CFG || window.CFG.sfx !== false); G.half = 1; G.kickoff = window.FIRST_KICK != null ? window.FIRST_KICK : 0; placeKickoff(G.kickoff); G.state = 'kickoff'; G.pause = 1.6; MUSIC.start(SFX.unlock()); VOICE.prime(); G.weather = ARENA.weather() || (Math.random() < 0.5 ? 'rain' : 'leaves'); setWeather(G.weather); ui.score?.(G); ui.banner?.('KICK OFF!', TEAMS[0], 'big'); },
  press, setCaptain, pick: (i) => doPick(i), pickMove,
  // a finger on a teammate takes control of him (not while you are the one with the ball)
  ctx() { const c = captain, has = ball.owner === c, air = !has && !ball.owner && Math.hypot(ball.x - c.x, ball.z - c.z) < 4.5 && ball.y > 0.5 && ball.y < 2.6;
    let n = 0; for (const k in G.inv) n += G.inv[k];
    return { has, air, charge: G.charge ? Math.min(1, G.charge / 0.75) : 0, dash: !!c.dash, bag: n, state: G.state }; },
  tapAt(cx, cy) { if (G.state !== 'play' && G.state !== 'kickoff') return false; if (ball.owner === captain) return false;
    const r = renderer.domElement.getBoundingClientRect(); let best = null, bd = 64; const v = new THREE.Vector3();
    for (const q of players) { if (q.team !== 0 || q.keeper || q.st === 'down') continue; v.set(q.x, q.y + 1.1, q.z).project(camera);
      const d = Math.hypot(r.left + (v.x + 1) / 2 * r.width - cx, r.top + (1 - v.y) / 2 * r.height - cy); if (d < bd) { bd = d; best = q; } }
    if (!best || best === captain) return false; captain = best; switchT = 2.2; SFX.menu(); G.ca = Math.max(G.ca, 0.3); FX.emit('curve', best.x, 0.4, best.z, 10, 3, 0.25, 4); return true; }, powers: POWERS, icons: PU.icons, arena(id) { ARENA.set(id); try { localStorage.setItem('arena', ARENA.id); } catch (e) {} }, get arenaId() { return ARENA.id; }, get arenas() { return ARENA.list; }, setStick(v) { stick = v; }, setDash(v) { padDash = v; }, quit() { frozen = false; G.state = 'menu'; MUSIC.stop(); PICK.open = false; ui.picker?.(null); }, sfx(on) { SFX.setSfx(on); }, freeze(v) { frozen = !!v; if (v) { keys.clear(); keyDash = false; } }, mute: () => SFX.toggle(),
  teams: TEAMS, frames: FR, images: [IMG_G, IMG_P], players, get captain() { return captain; }, get ball() { return ball; }, G,
};
window.__game = { goal: (t) => goalScored(t), pen: (t) => penaltyFor(t, players.find((q) => q.team === t && q.role === 'fwd')), G, ball, players, input, beast: (k) => beastStart(captain, k), magic: (k) => MAGIC.start(captain, k), shoot: (pw) => shoot(captain, pw), weather: (m) => { G.weather = m; setWeather(m); }, step(sec, fps = 30) { auto = false; for (let i = 0; i < Math.round(sec * fps); i++) step(1 / fps); }, resume() { last = performance.now(); auto = true; }, keys };
window.GAME_READY?.();
