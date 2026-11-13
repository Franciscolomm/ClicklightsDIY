// Clicklights 3D section (three.js). Model: assets/models/clicklight_hd.glb
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* =========================================================
   1. Renderer, camera, light, glow (bloom)
   ========================================================= */
const section = document.getElementById('closer');
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 7);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0x8fa2ff, 0.7); rim.position.set(-4, 2, -3); scene.add(rim);

const stage = new THREE.Group(); scene.add(stage);   // moves/scales to fit next to the pills
const world = new THREE.Group(); stage.add(world);   // tilts per scene

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.35, 0.9);   // softer glow so the product stays visible
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* =========================================================
   2. Small generated textures (glow, dots, beam)
   ========================================================= */
function radialTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const haloTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,255,255,.6)'], [0.4, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
const dotTex  = radialTex([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.85)'], [1, 'rgba(255,255,255,0)']]);
const glowTex = radialTex([[0, 'rgba(255,255,255,.9)'], [0.35, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
const beamTex = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

/* =========================================================
   3. Data: colors, caps, scenes
   ========================================================= */
const MM = 1.6 / 57.5;                                   // scene units per millimetre (module = 1.6 units long)
const LENS = new THREE.Vector3(-0.88 * MM, 0, 8.0 * MM);   // centre / top of the cap in clicklight_hd.glb
const WARM = new THREE.Color(1.0, 0.55, 0.2);
const SMOKE = new THREE.Color('#5d6066');   // grey cap tint (smoked acrylic)

const SWATCHES = [
  { name: 'Warm white', css: '#ffc58a', rgb: null,      warm: 1 },
  { name: 'Cool white', css: '#eef4ff', rgb: '#dfe9ff', warm: 0.2 },
  { name: 'Red',        css: '#ff3b30', rgb: '#ff1a1a', warm: 0 },
  { name: 'Orange',     css: '#ff9500', rgb: '#ff6a00', warm: 0 },
  { name: 'Green',      css: '#34c759', rgb: '#00ff3c', warm: 0 },
  { name: 'Blue',       css: '#0a84ff', rgb: '#0a3dff', warm: 0 },
  { name: 'Purple',     css: '#bf5af2', rgb: '#7a1aff', warm: 0 },
  { name: 'Pink',       css: '#ff2d92', rgb: '#ff1a8c', warm: 0 },
];
let chosen = SWATCHES[0];

// Cap = the lens over the LEDs
const CAP_OPTS = [
  { name: 'Clear', css: '#dfe7ee', color: '#d9e0e8', alpha: 0.22, halo: 1.0 },
  { name: 'Grey',  css: '#6e7177', color: '#5e6166', alpha: 0.8,  halo: 0.7 },
];
// Channel = the track the Clicklights mount in
const CHANNELS = [
  { name: 'White',            css: '#e9e9e6' },
  { name: 'Black',            css: '#2a2b2e' },
  { name: 'Muskett Brown',    css: '#7a4a35' },
  { name: 'Dark Bronze',      css: '#5a5047' },
  { name: 'Pebblestone Clay', css: '#d8b993' },
];
// Shared selections: they persist across every feature in the section
const sel = { cap: CAP_OPTS[0], channel: CHANNELS[1] };
const lensColor = new THREE.Color(), lensTarget = new THREE.Color(CAP_OPTS[0].color);
let lensAlpha = CAP_OPTS[0].alpha, haloMul = 1;
const channelMat = new THREE.MeshStandardMaterial({ color: CHANNELS[1].css, roughness: 0.5, metalness: 0.35 });
const channelTarget = new THREE.Color(CHANNELS[1].css);

const SCENES = {
  intro:   { drag: true, auto: true, w: 2.4, h: 2.2, led: 'chosen',
             mods: [{ x: 0, y: 0, rx: 0.3, ry: -0.6, s: 1.25 }] },
  colors:  { drag: true, w: 2.4, h: 2.2, led: 'chosen',
             mods: [{ x: 0, y: 0, rx: 0.12, ry: -0.25, s: 1.35 }] },
  caps:    { drag: true, w: 2.4, h: 2.2, led: 'chosen',
             mods: [{ x: 0, y: 0, rx: 0.35, ry: -0.2, s: 1.4 }] },
  channels:{ drag: true, dragWorld: true, w: 3.9, h: 1.6, tilt: 0.25, yaw: -0.45, led: 'chosen', props: ['chMain'],
             mods: [-1.1, 0, 1.1].map(x => ({ x, y: 0, rx: 0, ry: 0, s: 0.8 })) },
  ice:     { drag: true, w: 4.3, h: 2.4, led: 'chosen', props: ['bdL', 'bdR', 'icicles', 'frost', 'heat'], bd: ['#2f6fd6', '#ff5a1f'],
             mods: [{ x: -1.15, y: 0.1, rx: 0.12, ry: 0.25, s: 0.9 }, { x: 1.15, y: 0.1, rx: 0.12, ry: -0.25, s: 0.9 }],
             labels: ['Ice', 'Heat'], labelAt: [[-1.15, -1.0, 0.3], [1.15, -1.0, 0.3]] },
  rain:    { drag: true, w: 4.3, h: 2.4, led: 'chosen', props: ['bdL', 'bdR', 'rain', 'snow'], bd: ['#3d5a80', '#8fa9c4'],
             mods: [{ x: -1.15, y: 0.1, rx: 0.12, ry: 0.25, s: 0.9 }, { x: 1.15, y: 0.1, rx: 0.12, ry: -0.25, s: 0.9 }],
             labels: ['Rain', 'Snow'], labelAt: [[-1.15, -0.85, 0.3], [1.15, -0.85, 0.3]] },
  install: { drag: false, w: 4.4, h: 3.0, tilt: -0.3, offY: 0.7, led: 'chosen', props: ['houseL', 'houseR', 'chOut', 'chDown', 'beamOut', 'beamDown', 'wash'],
             mods: [{ x: -1.2, y: 0.15, z: 0.155, rx: 0, ry: 0, s: 0.55 }, { x: 1.2, y: -0.215, z: -0.35, rx: Math.PI / 2, ry: 0, s: 0.55 }],
             labels: ['Outward', 'Downward'], labelAt: [[-1.2, -2.0, -0.9], [1.2, -2.0, -0.9]] },
  app:     { drag: true, w: 2.2, h: 2.2, phone: true, led: 'chosen',
             mods: [{ x: 0, y: 0, rx: 0.15, ry: -0.35, s: 1.1 }] },
  patterns:{ drag: false, w: 5.9, h: 1.3, led: 'pattern', props: ['strip', 'chRow'],
             mods: Array.from({ length: 7 }, (_, i) => ({ x: -2.4 + 0.8 * i, y: 0, rx: 0.05, ry: 0, s: 0.48 })) },
};
const ORDER = ['colors', 'caps', 'channels', 'ice', 'rain', 'install', 'app', 'patterns'];
let cur = SCENES.intro, curId = 'intro';

/* =========================================================
   4. Load the model and build the module pool
   ========================================================= */
let template = null;

// Loads glb-embedded textures through data: URLs (works where blob: images are blocked). Model data is untouched.
const GL_WRAP = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
const GL_FILTER = { 9728: THREE.NearestFilter, 9729: THREE.LinearFilter, 9984: THREE.NearestMipmapNearestFilter,
  9985: THREE.LinearMipmapNearestFilter, 9986: THREE.NearestMipmapLinearFilter, 9987: THREE.LinearMipmapLinearFilter };
class DataUrlTextures {
  constructor(parser) { this.parser = parser; this.name = 'DATA_URL_TEXTURES'; }
  loadTexture(index) {
    const json = this.parser.json, def = json.textures[index], img = json.images[def.source];
    if (!img || img.bufferView === undefined) return null;
    const sampler = (json.samplers || [])[def.sampler] || {};
    return this.parser.getDependency('bufferView', img.bufferView).then(buf => new Promise((resolve, reject) => {
      const bytes = new Uint8Array(buf); let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      new THREE.TextureLoader().load('data:' + (img.mimeType || 'image/jpeg') + ';base64,' + btoa(s), tex => {
        tex.flipY = false;
        tex.wrapS = GL_WRAP[sampler.wrapS] || THREE.RepeatWrapping;
        tex.wrapT = GL_WRAP[sampler.wrapT] || THREE.RepeatWrapping;
        tex.magFilter = GL_FILTER[sampler.magFilter] || THREE.LinearFilter;
        tex.minFilter = GL_FILTER[sampler.minFilter] || THREE.LinearMipmapLinearFilter;
        tex.needsUpdate = true; resolve(tex);
      }, undefined, reject);
    }));
  }
}

const pool = [];
// 3D model: assets/models/clicklight_hd.glb (unmodified)
const MODEL_URL = 'assets/models/clicklight_hd.glb';
fetch(MODEL_URL).then(r => { if (!r.ok) throw new Error(r.status + ' ' + MODEL_URL); return r.arrayBuffer(); }).then(bin =>
new GLTFLoader().register(p => new DataUrlTextures(p)).parse(bin, '', gltf => { template = gltf.scene; init(); },
  err => { console.error(err); document.getElementById('hint').textContent = 'The 3D model could not load.'; }))
  .catch(err => { console.error(err); document.getElementById('hint').textContent = 'The 3D model could not load.'; });

function makeModule() {
  const g = new THREE.Group();
  const holder = template.clone(true);
  holder.scale.setScalar(1000 * MM);          // glb is in metres
  holder.position.z = -7.5 * MM;              // centre the module on its thickness
  const mats = {};
  // the HD file carries its own studio lights and a ground shadow: the scene lights the module, so drop them
  const drop = []; holder.traverse(o => { if (o.isLight || o.name === 'shadow') drop.push(o); }); drop.forEach(o => o.parent && o.parent.remove(o));
  holder.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); mats[o.material.name] = o.material; } });
  mats.led_rgb = mats.led_diffuser;     // 4 RGB LEDs
  mats.led_warm = mats.led_phosphor;    // 2 warm white LEDs
  mats.lens = mats.clear_lens;          // the cap
  mats.lensOrig = { color: mats.lens.color.clone(), transmission: mats.lens.transmission, roughness: mats.lens.roughness };
  g.add(holder);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.copy(LENS).add(new THREE.Vector3(0, 0, 0.03)); halo.scale.setScalar(0.8);   // round glow the size of the cap
  g.add(halo);
  const light = new THREE.PointLight(0xffffff, 0, 3, 2);
  light.position.copy(LENS).add(new THREE.Vector3(0, 0, 0.2));
  g.add(light);
  g.visible = false; g.scale.setScalar(0.0001);
  world.add(g);
  return {
    g, mats, halo, light,
    pos: new THREE.Vector3(), tPos: new THREE.Vector3(), rx: 0, tRx: 0, ry: 0, tRy: 0, s: 0, tS: 0,
    rgb: new THREE.Color(0, 0, 0), tRgb: new THREE.Color(0, 0, 0), warm: 0, tWarm: 0,
  };
}

const tmpC = new THREE.Color(), tmpW = new THREE.Color();
function applyLED(m, k) {
  m.rgb.lerp(m.tRgb, k); m.warm += (m.tWarm - m.warm) * k;
  const gain = (typeof cur !== 'undefined' && cur && cur.led === 'pattern') ? 0.6 : 1;   // patterns: dimmer so colors and changes read
  m.mats.led_rgb.emissive.copy(m.rgb); m.mats.led_rgb.emissiveIntensity = 1.6 * gain;
  m.mats.led_warm.emissive.copy(WARM).multiplyScalar(m.warm); m.mats.led_warm.emissiveIntensity = 1.6 * gain;
  const c = tmpC.copy(m.rgb).add(tmpW.copy(WARM).multiplyScalar(m.warm));
  const br = Math.max(c.r, c.g, c.b);
  if (br > 0.001) c.multiplyScalar(1 / br);
  // Clear cap: a bit brighter glow. Grey (smoked) cap: much less, so the LEDs show through instead of a lit button
  const clearCap = haloMul >= 0.99, capGlow = clearCap ? 0.42 : 0.04, haloK = clearCap ? 0.42 : 0.16;
  m.halo.material.color.copy(c); m.halo.material.opacity = Math.min(1, br) * haloK * gain;
  m.light.color.copy(c); m.light.intensity = Math.min(1, br) * (clearCap ? 1.4 : 0.7) * gain;
  // the round cap itself glows softly in the light color, so the light reads circular, not as square dies
  if (m.mats.lens.emissive) { m.mats.lens.emissive.copy(c); m.mats.lens.emissiveIntensity = Math.min(1, br) * capGlow * gain; }
}

/* =========================================================
   5. Props for each scene (weather, house, roofline strip)
   ========================================================= */
const props = {};
const rand = (a, b) => a + Math.random() * (b - a);
function addProp(name, obj, mode = 'opacity') {
  const mats = [];
  obj.traverse(o => { if (o.material) { o.material.transparent = mode === 'opacity'; mats.push([o.material, o.material.opacity]); } });
  obj.visible = false; world.add(obj);
  props[name] = { obj, mats, mode, f: 0, t: 0 };
}
function makePoints(n, box, color, size, additive) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rand(box[0], box[1]); pos[i * 3 + 1] = rand(box[2], box[3]); pos[i * 3 + 2] = rand(box[4], box[5]);
    seed[i] = Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: dotTex, color, size, transparent: true, depthWrite: false, opacity: 1,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const p = new THREE.Points(geo, mat); p.userData = { box, seed }; return p;
}
const LEFT = [-2.05, -0.25, -1.7, 1.7, -0.8, 0.9], RIGHT = [0.25, 2.05, -1.7, 1.7, -0.8, 0.9];

/* A channel section: front plate with round holes for the caps, plus top/bottom lips.
   Built in local space with the plate's front face at z = 0; s = module scale. */
function makeChannel(len, s, holeXs) {
  const g = new THREE.Group();
  const H = 30 * MM * s, T = 1.2 * MM * s, depth = 14 * MM * s, R = 9.7 * MM * s;
  const shape = new THREE.Shape();
  shape.moveTo(-len / 2, -H / 2); shape.lineTo(len / 2, -H / 2); shape.lineTo(len / 2, H / 2); shape.lineTo(-len / 2, H / 2); shape.lineTo(-len / 2, -H / 2);
  holeXs.forEach(x => { const h = new THREE.Path(); h.absarc(x + LENS.x * s, LENS.y * s, R, 0, Math.PI * 2, true); shape.holes.push(h); });
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 40 }), channelMat);
  plate.position.z = -T; g.add(plate);
  [-1, 1].forEach(side => {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(len, T, depth), channelMat);
    lip.position.set(0, side * (H / 2 - T / 2), -depth / 2); g.add(lip);
  });
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8 * MM * s, 0.6 * MM * s), channelMat);
  ridge.position.set(0, -H / 2 + 3 * MM * s, 0.3 * MM * s); g.add(ridge);
  return g;
}
const PLATE_Z = s => (5.5 + 1.3) * MM * s;    // plate front, measured from the module centre

function buildProps() {
  // channel for the Channels feature (3 lights)
  const chMain = makeChannel(3.5, 0.8, [-1.1, 0, 1.1]); chMain.position.z = PLATE_Z(0.8);
  addProp('chMain', chMain, 'visible');
  // channel along the roofline for Patterns (7 lights)
  const chRow = makeChannel(6.3, 0.48, Array.from({ length: 7 }, (_, i) => -2.4 + 0.8 * i)); chRow.position.z = PLATE_Z(0.48);
  addProp('chRow', chRow, 'visible');
  // install: outward on the fascia, downward under the soffit
  const chOut = makeChannel(1.9, 0.55, [0]); chOut.position.set(-1.2, 0.15, 0.155 + PLATE_Z(0.55));
  addProp('chOut', chOut, 'visible');
  const chDown = makeChannel(1.9, 0.55, [0]); chDown.rotation.x = Math.PI / 2; chDown.position.set(1.2, -0.215 - PLATE_Z(0.55), -0.35);
  addProp('chDown', chDown, 'visible');

  // backdrops behind the two weather slots
  const bd = x => { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.6),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.5, depthWrite: false })); m.position.set(x, 0, -1.3); return m; };
  addProp('bdL', bd(-1.15)); addProp('bdR', bd(1.15));

  // icicles hanging from the ice-side light
  const ic = new THREE.Group();
  const icMat = new THREE.MeshStandardMaterial({ color: 0xdff3ff, roughness: 0.12, metalness: 0, opacity: 0.85 });
  [[-1.62, 0.32], [-1.42, 0.2], [-1.22, 0.38], [-1.02, 0.24], [-0.8, 0.3], [-0.66, 0.16]].forEach(([x, h]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.035, h, 12), icMat);
    cone.rotation.x = Math.PI; cone.position.set(x, -0.24 - h / 2, 0.05); ic.add(cone);
  });
  addProp('icicles', ic);

  addProp('frost', makePoints(160, LEFT, 0xcbeaff, 0.035, true));
  addProp('heat', makePoints(180, RIGHT, 0xff7a2a, 0.05, true));
  addProp('snow', makePoints(320, RIGHT, 0xffffff, 0.06, false));

  // rain: short line segments
  const n = 260, rp = new Float32Array(n * 6), sp = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = rand(LEFT[0], LEFT[1]), y = rand(LEFT[2], LEFT[3]), z = rand(LEFT[4], LEFT[5]);
    rp.set([x, y, z, x + 0.02, y + 0.16, z], i * 6); sp[i] = rand(4, 6);
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaecbff, opacity: 0.5, depthWrite: false }));
  rain.userData = { speed: sp };
  addProp('rain', rain);

  // house edge: roof, fascia, soffit, wall
  const house = x => {
    const g = new THREE.Group();
    const trim = new THREE.MeshStandardMaterial({ color: 0x5b5d63, roughness: 0.85 });
    const wall = new THREE.MeshStandardMaterial({ color: 0x2b2c30, roughness: 0.95 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.9 });
    const box = (w, h, d, m, px, py, pz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); g.add(b); return b; };
    box(1.9, 0.5, 0.08, trim, x, 0.15, 0);          // fascia
    box(1.9, 0.05, 0.9, trim, x, -0.075, -0.45);    // soffit
    box(1.9, 1.7, 0.06, wall, x, -0.95, -0.9);      // wall
    const r = box(1.9, 0.06, 1.1, roof, x, 0.45, -0.45); r.rotation.x = 0.3; // roof
    return g;
  };
  addProp('houseL', house(-1.2), 'visible'); addProp('houseR', house(1.2), 'visible');

  const beamMat = o => new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: o, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const down = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 40, 1, true), beamMat(0.35));
  down.position.set(1.2, -0.98, -0.35);
  addProp('beamDown', down);
  const out = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 40, 1, true), beamMat(0.16));
  out.rotation.x = -Math.PI / 2; out.position.set(-1.2, 0.15, 0.27 + 0.6);
  addProp('beamOut', out);
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.7),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  wash.position.set(1.2, -0.75, -0.865);
  addProp('wash', wash);

  // roofline strip for the pattern scene
  const strip = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.42, 0.06), new THREE.MeshStandardMaterial({ color: 0x2a2b2f, roughness: 0.85 }));
  strip.position.set(0, 0, -0.14);
  addProp('strip', strip, 'visible');
}

function updateParticles(dt, t) {
  const p = props;
  if (p.rain.obj.visible) {
    const a = p.rain.obj.geometry.attributes.position, sp = p.rain.obj.userData.speed;
    for (let i = 0; i < sp.length; i++) {
      let y = a.array[i * 6 + 1] - sp[i] * dt;
      if (y < LEFT[2]) y = LEFT[3];
      a.array[i * 6 + 1] = y; a.array[i * 6 + 4] = y + 0.16;
    }
    a.needsUpdate = true;
  }
  const drift = (obj, vy, sway, box) => {
    if (!obj.visible) return;
    const a = obj.geometry.attributes.position, s = obj.userData.seed;
    for (let i = 0; i < s.length; i++) {
      let y = a.array[i * 3 + 1] + (vy + s[i] * 0.01) * dt;
      if (y < box[2]) y = box[3]; if (y > box[3]) y = box[2];
      a.array[i * 3 + 1] = y; a.array[i * 3] += Math.sin(t * 1.3 + s[i]) * sway * dt;
    }
    a.needsUpdate = true;
  };
  drift(p.snow.obj, -0.3, 0.15, RIGHT);
  drift(p.heat.obj, 0.4, 0.12, RIGHT);
  drift(p.frost.obj, -0.05, 0.04, LEFT);
}

/* =========================================================
   6. Labels under the lights
   ========================================================= */
const tags = Array.from({ length: 7 }, () => { const d = document.createElement('div'); d.className = 'tag'; section.appendChild(d); return d; });
const v3 = new THREE.Vector3();
function updateTags() {
  const w = section.clientWidth, h = section.clientHeight;
  world.updateMatrixWorld(true);
  tags.forEach((el, i) => {
    const txt = cur.labels && cur.labels[i];
    el.classList.toggle('show', !!txt);
    if (!txt) return;
    el.textContent = txt;
    if (cur.labelAt) v3.fromArray(cur.labelAt[i]);
    else { const m = pool[i]; v3.copy(m.tPos); v3.y -= 0.42 * m.tS + 0.28; }
    world.localToWorld(v3); v3.project(camera);
    el.style.left = ((v3.x * 0.5 + 0.5) * w) + 'px';
    el.style.top = ((-v3.y * 0.5 + 0.5) * h) + 'px';
  });
}

/* =========================================================
   7. App phone state and patterns
   ========================================================= */
const app = { power: true, sched: true, hour: 19 };
const fmt = h => { const hh = Math.floor(h) % 24, mm = Math.round((h % 1) * 60); const ap = hh >= 12 ? 'PM' : 'AM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; };
const appOn = () => app.power && (!app.sched || (app.hour >= 18.5 && app.hour < 23));
function refreshApp() {
  document.getElementById('tPower').classList.toggle('on', app.power);
  document.getElementById('tPower').setAttribute('aria-checked', app.power);
  document.getElementById('tSched').classList.toggle('on', app.sched);
  document.getElementById('tSched').setAttribute('aria-checked', app.sched);
  document.getElementById('tLabel').textContent = fmt(app.hour);
  let s;
  if (!app.power) s = 'Off';
  else if (!app.sched) s = 'On';
  else s = appOn() ? 'On until 11:00 PM' : (app.hour < 18.5 ? 'Off · turns on at sunset (6:30 PM)' : 'Off · back on at sunset');
  document.getElementById('appStatus').textContent = s;
}

let pattern = 'holiday';
const RED = new THREE.Color('#ff1a1a'), GREEN = new THREE.Color('#00ff3c'), BLUE = new THREE.Color('#0a3dff'), CYAN = new THREE.Color('#9fe8ff');
const custom = [new THREE.Color('#ff6a00'), new THREE.Color('#7a1aff')];
const twinkle = new Array(7).fill(0.5);
let twinkleClock = 0;
function patternLED(m, i, t) {
  if (pattern === 'holiday') {
    const ph = Math.floor(t / 1.2) % 2; m.tRgb.copy((i + ph) % 2 === 0 ? RED : GREEN); m.tWarm = 0;
  } else if (pattern === 'chase') {
    const head = (t * 3) % 9 - 1; const k = Math.max(0, 1 - Math.abs(i - head) / 1.2);
    m.tRgb.copy(BLUE).multiplyScalar(0.12).lerp(CYAN, k); m.tWarm = 0;
  } else if (pattern === 'twinkle') {
    m.tRgb.setRGB(0, 0, 0); m.tWarm = 0.2 + 0.8 * twinkle[i];
  } else {
    const ph = Math.floor(t / 1.0) % 2; m.tRgb.copy((i + ph) % 2 === 0 ? custom[0] : custom[1]); m.tWarm = 0;
  }
}

/* =========================================================
   8. Switching scenes
   ========================================================= */
function setScene(id) {
  cur = SCENES[id]; curId = id;
  pool.forEach((m, i) => {
    const d = cur.mods[i];
    if (d) {
      m.tPos.set(d.x, d.y, d.z || 0); m.tRx = d.rx; m.tRy = d.ry; m.tS = d.s;
    } else m.tS = 0;
  });
  Object.entries(props).forEach(([name, p]) => { p.t = (cur.props || []).includes(name) ? 1 : 0; });
  if (cur.bd) { props.bdL.obj.material.color.set(cur.bd[0]); props.bdR.obj.material.color.set(cur.bd[1]); }
  document.getElementById('phone').classList.toggle('show', !!cur.phone);
  document.getElementById('phone').setAttribute('aria-hidden', !cur.phone);
  document.getElementById('hint').style.opacity = cur.drag ? 1 : 0;
  canvas.classList.toggle('static', !cur.drag);
  userYaw = Math.atan2(Math.sin(userYaw), Math.cos(userYaw));   // unwind, then ease back to the scene's pose
  settle = 0.7; idle = 0;
}

/* =========================================================
   9. Drag to rotate (with inertia)
   ========================================================= */
let dragging = false, lastX = 0, lastY = 0, velYaw = 0, userYaw = 0, userPitch = 0, idle = 0, settle = 0;
canvas.addEventListener('pointerdown', e => {
  if (!cur.drag) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY; velYaw = 0; idle = 0; settle = 0;
  canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
  velYaw = dx * 0.008; userYaw += velYaw;
  userPitch = THREE.MathUtils.clamp(userPitch + dy * 0.006, -0.6, 0.6);
});
const endDrag = () => { dragging = false; canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* =========================================================
   10. Fit the stage next to the pills
   ========================================================= */
const nav = document.getElementById('features');
const phoneEl = document.getElementById('phone');
function fitStage(k) {
  const w = section.clientWidth, h = section.clientHeight, sec = section.getBoundingClientRect();
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const visW = visH * camera.aspect, wpp = visH / h;
  let left = -visW / 2, right = visW / 2, top = visH / 2, bottom = -visH / 2;
  const mobile = w < 820, nr = nav.getBoundingClientRect();
  if (!mobile) {
    left += (nr.right - sec.left + 24) * wpp;
    top -= 90 * wpp;
    if (cur.phone) right -= (sec.right - phoneEl.getBoundingClientRect().left + 24) * wpp;
  } else {
    top -= 70 * wpp;
    bottom += (sec.bottom - nr.top + 12) * wpp;
    if (cur.phone) top -= 340 * wpp;
  }
  const sc = Math.max(0.15, Math.min(1, (right - left) / cur.w, (top - bottom) / cur.h));
  stage.position.x += ((left + right) / 2 - stage.position.x) * k;
  stage.position.y += ((top + bottom) / 2 - stage.position.y) * k;
  stage.scale.setScalar(stage.scale.x + (sc - stage.scale.x) * k);
}
function resize() {
  const w = section.clientWidth, h = section.clientHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

/* =========================================================
   11. UI wiring
   ========================================================= */
const items = [...nav.querySelectorAll('li')];
function openFeature(id) {
  nav.classList.add('open');
  items.forEach(li => {
    const on = li.dataset.id === id;
    li.classList.toggle('active', on);
    li.querySelector('.pill').setAttribute('aria-expanded', on);
  });
  setScene(id);
}
function closeFeature() {
  nav.classList.remove('open');
  items.forEach(li => { li.classList.remove('active'); li.querySelector('.pill').setAttribute('aria-expanded', false); });
  setScene('intro');
}
items.forEach(li => li.querySelector('.pill').addEventListener('click', () => openFeature(li.dataset.id)));
const step = d => openFeature(ORDER[(ORDER.indexOf(curId) + d + ORDER.length) % ORDER.length]);
document.getElementById('prev').addEventListener('click', () => step(-1));
document.getElementById('next').addEventListener('click', () => step(1));
document.getElementById('close').addEventListener('click', closeFeature);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && curId !== 'intro') closeFeature(); });

// light color: same selection in the card and in the phone
function renderSwatches() {
  ['swatches', 'appColors'].forEach(id => {
    const box = document.getElementById(id); box.innerHTML = '';
    SWATCHES.forEach(s => {
      const b = document.createElement('button'); b.className = 'sw' + (s === chosen ? ' on' : '');
      b.style.background = s.css; b.setAttribute('aria-label', s.name); b.title = s.name;
      b.addEventListener('click', () => { chosen = s; renderSwatches(); });
      box.appendChild(b);
    });
  });
  document.getElementById('swName').textContent = chosen.name;
}
renderSwatches();

// cap and channel: chips with a color dot
function renderOptions(id, list, key, onPick) {
  const box = document.getElementById(id); box.innerHTML = '';
  list.forEach(o => {
    const b = document.createElement('button'); b.className = 'chip opt' + (sel[key] === o ? ' on' : '');
    b.innerHTML = `<i style="background:${o.css}"></i>${o.name}`;
    b.addEventListener('click', () => { sel[key] = o; onPick(o); renderOptions(id, list, key, onPick); });
    box.appendChild(b);
  });
}
renderOptions('capOpts', CAP_OPTS, 'cap', o => { lensTarget.set(o.color); lensAlpha = o.alpha; haloMul = o.halo; });
renderOptions('chOpts', CHANNELS, 'channel', o => channelTarget.set(o.css));

document.getElementById('chips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  pattern = b.dataset.p;
  document.querySelectorAll('#chips .chip').forEach(c => c.classList.toggle('on', c === b));
  document.getElementById('custom').classList.toggle('show', pattern === 'custom');
});
document.getElementById('c1').addEventListener('input', e => custom[0].set(e.target.value));
document.getElementById('c2').addEventListener('input', e => custom[1].set(e.target.value));
document.getElementById('tPower').addEventListener('click', () => { app.power = !app.power; refreshApp(); });
document.getElementById('tSched').addEventListener('click', () => { app.sched = !app.sched; refreshApp(); });
document.getElementById('tSlider').addEventListener('input', e => { app.hour = parseFloat(e.target.value); refreshApp(); });

/* =========================================================
   12. Main loop
   ========================================================= */
function setLED(m, sw) {
  if (!sw) { m.tRgb.setRGB(0, 0, 0); m.tWarm = 0; return; }
  if (sw.rgb) m.tRgb.set(sw.rgb); else m.tRgb.setRGB(0, 0, 0);
  m.tWarm = sw.warm;
}

let t = 0, last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;

  if (settle > 0) { settle -= dt; userYaw *= 0.86; userPitch *= 0.86; velYaw = 0; }
  else if (cur.drag) {
    if (!dragging) {
      userYaw += velYaw; velYaw *= 0.92; userPitch *= 0.96;
      idle += dt; if (cur.auto && idle > 3) userYaw += 0.3 * dt;
    }
  } else { userYaw *= 0.9; userPitch *= 0.9; velYaw = 0; }

  const wYaw = (cur.yaw || 0) + (cur.dragWorld ? userYaw : 0), wPitch = (cur.tilt || 0) + (cur.dragWorld ? userPitch : 0);
  world.rotation.x += (wPitch - world.rotation.x) * 0.1;
  world.rotation.y += (wYaw - world.rotation.y) * 0.1;
  world.position.y += ((cur.offY || 0) - world.position.y) * 0.08;
  fitStage(0.1);

  twinkleClock += dt;
  if (twinkleClock > 0.12) { twinkleClock = 0; for (let i = 0; i < 7; i++) if (Math.random() < 0.3) twinkle[i] = Math.random(); }

  const lightsOn = appOn();
  lensColor.lerp(lensTarget, 0.12);
  channelMat.color.lerp(channelTarget, 0.12);
  document.getElementById('notice').classList.toggle('show', !lightsOn && curId !== 'app' && cur.led !== 'off');

  pool.forEach((m, i) => {
    m.pos.lerp(m.tPos, 0.1); m.rx += (m.tRx - m.rx) * 0.1; m.ry += (m.tRy - m.ry) * 0.1; m.s += (m.tS - m.s) * 0.12;
    m.g.visible = m.s > 0.005;
    m.g.position.copy(m.pos);
    const own = cur.dragWorld ? 0 : 1;
    m.g.rotation.set(m.rx + userPitch * own, m.ry + userYaw * own, 0, 'YXZ');
    m.g.scale.setScalar(Math.max(m.s, 0.0001));

    if (!cur.mods[i] || cur.led === 'off' || !lightsOn) setLED(m, null);
    else if (cur.led === 'pattern') patternLED(m, i, t);
    else setLED(m, chosen);
    applyLED(m, cur.led === 'pattern' ? 0.3 : 0.1);

    // Clear = the cap exactly as modelled; Grey = smoked: tinted but still see-through, so the LEDs show inside
    const o = m.mats.lensOrig, gk = THREE.MathUtils.clamp((lensAlpha - 0.22) / (0.8 - 0.22), 0, 1);
    m.mats.lens.color.copy(o.color).lerp(SMOKE, gk);
    m.mats.lens.transmission = THREE.MathUtils.lerp(o.transmission, 0.9, gk);
    m.mats.lens.roughness = THREE.MathUtils.lerp(o.roughness, 0.1, gk);
  });

  // beams and wall wash follow the chosen color
  const lit = tmpC.copy(chosen.rgb ? new THREE.Color(chosen.rgb) : WARM);
  ['beamDown', 'beamOut', 'wash'].forEach(n => props[n].obj.material.color.copy(lit));

  Object.entries(props).forEach(([name, p]) => {
    const target = (name === 'beamDown' || name === 'beamOut' || name === 'wash') ? p.t * (lightsOn ? 1 : 0) : p.t;
    p.f += (target - p.f) * 0.08;
    if (p.mode === 'visible') p.obj.visible = p.t > 0.5;
    else { p.obj.visible = p.f > 0.01; p.mats.forEach(([mt, base]) => { mt.opacity = base * p.f; }); }
  });
  updateParticles(dt, t);
  updateTags();

  composer.render();
  requestAnimationFrame(tick);
}

function init() {
  lensColor.copy(lensTarget);
  for (let i = 0; i < 7; i++) pool.push(makeModule());
  buildProps();
  resize();
  refreshApp();
  setScene('intro');
  // snap the first module into place
  const m = pool[0]; m.pos.copy(m.tPos); m.rx = m.tRx; m.ry = m.tRy; m.s = m.tS * 0.9;
  requestAnimationFrame(tick);
}
