/**
 * campesino.js — Personaje 3D procedural "Don Chepe", campesino colombiano.
 *
 * Todo el personaje se construye con geometrías de Three.js (sin archivos externos):
 * sombrero vueltiao, ruana con rayas y flecos, pañuelo, camisa, pantalón y botas
 * pantaneras. El cuerpo es una jerarquía de "huesos" (THREE.Group) que se animan
 * con AnimationClips por keyframes, por lo que las animaciones se pueden exportar a GLB.
 *
 * Funciona en el navegador (import map → 'three') y en Node (node_modules/three).
 */
import * as THREE from 'three';

/* ----------------------------------------------------------------------------
 * Paleta
 * ------------------------------------------------------------------------- */
export const COLORS = {
  piel: 0xc98b5e,
  pielOscura: 0xb47448,
  mejillas: 0xd9776a,
  pelo: 0x2b1a12,
  ojoBlanco: 0xffffff,
  pupila: 0x1b120c,
  boca: 0x5a1414,
  lengua: 0xd0545a,
  diente: 0xf4f1e8,
  camisa: 0xf3efe4,
  pantalon: 0x6f5a3a,
  bota: 0x1c1c1c,
  suela: 0x0c0c0c,
  ruana: 0x8a2f24,
  ruanaOscura: 0x5e1d16,
  rayaCrema: 0xe9dcc0,
  rayaNegra: 0x1e1612,
  pañuelo: 0xc8202a,
  sombrero: 0xeee2c4,
  sombreroNegro: 0x161210,
};

const matCache = new Map();
function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.0, ...extra }));
  }
  return matCache.get(key);
}

function mesh(name, geo, material, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.position.set(...p);
  m.rotation.set(...r);
  m.scale.set(...s);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function group(name, p = [0, 0, 0], r = [0, 0, 0]) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(...p);
  g.rotation.set(...r);
  return g;
}

const sphere = (rad, w = 24, h = 16) => new THREE.SphereGeometry(rad, w, h);
const capsule = (rad, len) => new THREE.CapsuleGeometry(rad, len, 6, 16);
const cyl = (rt, rb, h, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);

/* ----------------------------------------------------------------------------
 * Piezas
 * ------------------------------------------------------------------------- */
function buildLeg(side) {
  const S = side === 'L' ? 1 : -1;
  const muslo = group(`Muslo_${side}`, [0.095 * S, -0.06, 0]);
  muslo.add(mesh(`Pierna_${side}`, capsule(0.085, 0.28), mat(COLORS.pantalon), { p: [0, -0.19, 0] }));

  const rodilla = group(`Rodilla_${side}`, [0, -0.4, 0]);
  muslo.add(rodilla);
  rodilla.add(mesh(`Espinilla_${side}`, capsule(0.078, 0.12), mat(COLORS.pantalon), { p: [0, -0.06, 0] }));
  // Bota pantanera
  rodilla.add(mesh(`Cana_Bota_${side}`, cyl(0.09, 0.084, 0.28), mat(COLORS.bota, { roughness: 0.35 }), { p: [0, -0.25, 0] }));
  rodilla.add(mesh(`Borde_Bota_${side}`, new THREE.TorusGeometry(0.09, 0.013, 8, 24), mat(COLORS.bota, { roughness: 0.35 }), { p: [0, -0.11, 0], r: [Math.PI / 2, 0, 0] }));
  rodilla.add(mesh(`Pie_${side}`, capsule(0.075, 0.12), mat(COLORS.bota, { roughness: 0.35 }), { p: [0, -0.4, 0.045], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.68] }));
  rodilla.add(mesh(`Suela_${side}`, new THREE.BoxGeometry(0.15, 0.025, 0.28), mat(COLORS.suela), { p: [0, -0.44, 0.045] }));
  return muslo;
}

function buildArm(side) {
  const S = side === 'L' ? 1 : -1;
  const hombro = group(`Hombro_${side}`, [0.235 * S, 0.52, 0], [0, 0, 0.17 * S]);
  hombro.add(mesh(`Hombro_Bola_${side}`, sphere(0.052), mat(COLORS.camisa)));
  hombro.add(mesh(`Brazo_${side}`, capsule(0.055, 0.18), mat(COLORS.camisa), { p: [0, -0.13, 0] }));

  const codo = group(`Codo_${side}`, [0, -0.27, 0], [-0.2, 0, 0]);
  hombro.add(codo);
  codo.add(mesh(`Antebrazo_${side}`, capsule(0.05, 0.15), mat(COLORS.camisa), { p: [0, -0.11, 0] }));
  codo.add(mesh(`Puno_${side}`, cyl(0.056, 0.056, 0.035), mat(COLORS.camisa), { p: [0, -0.21, 0] }));

  const mano = group(`Mano_${side}`, [0, -0.24, 0]);
  codo.add(mano);
  mano.add(mesh(`Palma_${side}`, sphere(0.058), mat(COLORS.piel), { p: [0, -0.045, 0], s: [0.85, 1, 0.6] }));
  mano.add(mesh(`Pulgar_${side}`, capsule(0.018, 0.04), mat(COLORS.piel), { p: [-0.012 * S, -0.035, 0.035], r: [0.6, 0, 0] }));
  for (let i = 0; i < 4; i++) {
    const x = (-0.027 + i * 0.018) * S;
    mano.add(mesh(`Dedo_${side}_${i}`, capsule(0.012, 0.035), mat(COLORS.piel), { p: [x, -0.1 + Math.abs(i - 1.5) * 0.006, 0.005] }));
  }
  return hombro;
}

/** Perfil (radio, altura) de la ruana: del cuello, sobre los hombros, hasta el ruedo. */
const RUANA_PROFILE = [[0.085, 0.07], [0.16, 0.06], [0.25, 0.035], [0.325, -0.03], [0.35, -0.14], [0.36, -0.3], [0.385, -0.5]];
const RUANA_DEPTH = 0.72; // escala en Z (la ruana es más ancha que profunda)
function ruanaRadiusAt(y) {
  const P = RUANA_PROFILE;
  for (let i = 0; i < P.length - 1; i++) {
    const [r0, y0] = P[i], [r1, y1] = P[i + 1];
    if (y <= y0 && y >= y1) return r0 + (r1 - r0) * ((y0 - y) / (y0 - y1));
  }
  return P[P.length - 1][0];
}

function buildRuana() {
  const ruana = group('Ruana', [0, 0.55, 0]);
  const pts = RUANA_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(pts, 48);
  ruana.add(mesh('Ruana_Tela', body, mat(COLORS.ruana, { side: THREE.DoubleSide }), { s: [1, 1, RUANA_DEPTH] }));
  ruana.add(mesh('Ruana_Cuello', new THREE.TorusGeometry(0.088, 0.024, 10, 28), mat(COLORS.ruanaOscura), { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0], s: [1, RUANA_DEPTH + 0.15, 1] }));

  // Franjas tejidas (bandas que siguen el perfil)
  const bandas = [
    [-0.36, 0.022, COLORS.rayaCrema], [-0.39, 0.012, COLORS.rayaNegra], [-0.415, 0.022, COLORS.rayaCrema],
    [-0.47, 0.012, COLORS.rayaNegra], [-0.17, 0.012, COLORS.rayaCrema],
  ];
  for (const [y, h, c] of bandas) {
    const rt = ruanaRadiusAt(y + h / 2) + 0.004, rb = ruanaRadiusAt(y - h / 2) + 0.004;
    ruana.add(mesh('Ruana_Franja', new THREE.CylinderGeometry(rt, rb, h, 48, 1, true), mat(c, { side: THREE.DoubleSide }), { p: [0, y, 0], s: [1, 1, RUANA_DEPTH] }));
  }
  // Ribete del ruedo
  ruana.add(mesh('Ruana_Ruedo', new THREE.TorusGeometry(0.385, 0.008, 6, 64), mat(COLORS.ruanaOscura), { p: [0, -0.5, 0], r: [Math.PI / 2, 0, 0], s: [1, RUANA_DEPTH, 1] }));
  // Flecos alrededor del ruedo
  const flecoGeo = cyl(0.0055, 0.004, 0.055, 5);
  const n = 64;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ruana.add(mesh('Fleco', flecoGeo, mat(COLORS.rayaCrema), { p: [Math.cos(a) * 0.385, -0.53, Math.sin(a) * 0.385 * RUANA_DEPTH] }));
  }
  return ruana;
}

function buildSombrero() {
  // Sombrero vueltiao: crema con franjas negras
  const s = group('Sombrero', [0, 0.255, -0.01], [-0.07, 0, 0.04]);
  s.add(mesh('Ala', cyl(0.36, 0.36, 0.018, 56), mat(COLORS.sombrero)));
  for (const [r1, r2] of [[0.165, 0.185], [0.215, 0.232], [0.265, 0.282], [0.315, 0.33], [0.348, 0.36]]) {
    const ring = new THREE.RingGeometry(r1, r2, 56);
    s.add(mesh('Ala_Franja', ring, mat(COLORS.sombreroNegro, { side: THREE.DoubleSide }), { p: [0, 0.0102, 0], r: [-Math.PI / 2, 0, 0] }));
    s.add(mesh('Ala_Franja_Inf', ring, mat(COLORS.sombreroNegro, { side: THREE.DoubleSide }), { p: [0, -0.0102, 0], r: [Math.PI / 2, 0, 0] }));
  }
  s.add(mesh('Copa', cyl(0.12, 0.15, 0.16, 48), mat(COLORS.sombrero), { p: [0, 0.088, 0] }));
  s.add(mesh('Copa_Tapa', sphere(0.12, 32, 10), mat(COLORS.sombrero), { p: [0, 0.168, 0], s: [1, 0.22, 1] }));
  // Franjas en la copa (ligeramente más anchas que la copa en esa altura)
  for (const y of [0.03, 0.07, 0.11, 0.15]) {
    const h = y - 0.008;
    const r = 0.15 - 0.03 * (h / 0.16) + 0.003;
    s.add(mesh('Copa_Franja', cyl(r - 0.0015, r, 0.016, 48), mat(COLORS.sombreroNegro), { p: [0, y, 0] }));
  }
  return s;
}

function buildCabeza() {
  const cabeza = group('Cabeza', [0, 0.06, 0]);
  const piel = mat(COLORS.piel);
  cabeza.add(mesh('Craneo', sphere(0.17, 32, 24), piel, { p: [0, 0.15, 0], s: [1, 1.05, 0.97] }));
  cabeza.add(mesh('Menton', sphere(0.1), piel, { p: [0, 0.055, 0.06], s: [1.1, 0.7, 0.9] }));
  for (const S of [1, -1]) {
    const side = S > 0 ? 'L' : 'R';
    cabeza.add(mesh(`Oreja_${side}`, sphere(0.045), mat(COLORS.pielOscura), { p: [0.165 * S, 0.14, -0.005], s: [0.5, 1, 0.8] }));
    // Ojos (grupo para parpadear)
    const ojo = group(`Ojo_${side}`, [0.062 * S, 0.185, 0.14]);
    cabeza.add(ojo);
    ojo.add(mesh(`Ojo_Blanco_${side}`, sphere(0.043), mat(COLORS.ojoBlanco, { roughness: 0.3 }), { s: [1, 1.15, 0.8] }));
    ojo.add(mesh(`Pupila_${side}`, sphere(0.022), mat(COLORS.pupila, { roughness: 0.2 }), { p: [-0.004 * S, -0.002, 0.03] }));
    ojo.add(mesh(`Brillo_${side}`, sphere(0.007, 8, 6), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), { p: [0.006 - 0.004 * S, 0.01, 0.05] }));
    cabeza.add(mesh(`Ceja_${side}`, capsule(0.012, 0.05), mat(COLORS.pelo), { p: [0.064 * S, 0.245, 0.15], r: [0, 0, Math.PI / 2 - 0.18 * S] }));
    cabeza.add(mesh(`Mejilla_${side}`, sphere(0.035), mat(COLORS.mejillas), { p: [0.105 * S, 0.11, 0.122], s: [1, 0.7, 0.45] }));
    cabeza.add(mesh(`Bigote_${side}`, sphere(0.032), mat(COLORS.pelo), { p: [0.042 * S, 0.085, 0.168], r: [0, 0, -0.35 * S], s: [1.7, 0.62, 0.7] }));
  }
  cabeza.add(mesh('Pelo_Nuca', sphere(0.165, 24, 12), mat(COLORS.pelo), { p: [0, 0.17, -0.025], s: [1.02, 0.85, 0.95] }));
  cabeza.add(mesh('Nariz', sphere(0.045), mat(COLORS.pielOscura), { p: [0, 0.128, 0.175], s: [1, 0.9, 1.1] }));

  // Boca: grupo que se escala en Y para abrir/cerrar (lip-sync)
  const boca = group('Boca', [0, 0.04, 0.15]);
  boca.scale.set(1, 0.15, 1);
  cabeza.add(boca);
  boca.add(mesh('Boca_Interior', sphere(0.04, 24, 16), mat(COLORS.boca, { roughness: 0.5 }), { s: [1.35, 1, 0.38] }));
  boca.add(mesh('Lengua', sphere(0.022), mat(COLORS.lengua), { p: [0, -0.016, 0.002], s: [1.4, 0.6, 0.45] }));
  boca.add(mesh('Dientes', new THREE.BoxGeometry(0.05, 0.012, 0.01), mat(COLORS.diente, { roughness: 0.3 }), { p: [0, 0.026, 0.006] }));

  cabeza.add(buildSombrero());
  return cabeza;
}

/* ----------------------------------------------------------------------------
 * Ensamblaje
 * ------------------------------------------------------------------------- */
export function buildCampesino() {
  matCache.clear();
  const root = group('Campesino');
  const cadera = group('Cadera', [0, 0.92, 0]);
  root.add(cadera);

  cadera.add(mesh('Pelvis', cyl(0.17, 0.18, 0.16), mat(COLORS.pantalon), { p: [0, -0.02, 0], s: [1, 1, 0.8] }));
  cadera.add(buildLeg('L'));
  cadera.add(buildLeg('R'));

  const torso = group('Torso', [0, 0, 0]);
  cadera.add(torso);
  torso.add(mesh('Pecho', capsule(0.17, 0.3), mat(COLORS.camisa), { p: [0, 0.28, 0], s: [1.1, 1, 0.85] }));
  torso.add(mesh('Barriga', sphere(0.17), mat(COLORS.camisa), { p: [0, 0.17, 0.04], s: [1.15, 1, 1] }));
  torso.add(buildRuana());
  // Pañuelo rojo al cuello
  torso.add(mesh('Panuelo', new THREE.TorusGeometry(0.07, 0.028, 10, 24), mat(COLORS.pañuelo), { p: [0, 0.645, 0.008], r: [Math.PI / 2 - 0.15, 0, 0], s: [1, 0.85, 1] }));
  torso.add(mesh('Panuelo_Nudo', new THREE.ConeGeometry(0.04, 0.08, 4), mat(COLORS.pañuelo), { p: [0, 0.6, 0.095], r: [Math.PI + 0.3, Math.PI / 4, 0], s: [1, 0.8, 0.4] }));

  torso.add(buildArm('L'));
  torso.add(buildArm('R'));

  const cuello = group('Cuello', [0, 0.6, 0]);
  torso.add(cuello);
  cuello.add(mesh('Cuello_Piel', cyl(0.06, 0.065, 0.1), mat(COLORS.piel), { p: [0, 0.02, 0] }));
  cuello.add(buildCabeza());

  // Ajustar para que las suelas toquen y = 0
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  cadera.position.y -= box.min.y;
  root.updateMatrixWorld(true);

  // Guardar la pose de reposo de cada hueso animable
  const bones = {};
  root.traverse((o) => { if (o.isGroup) bones[o.name] = o; });
  const rest = {};
  for (const [n, o] of Object.entries(bones)) rest[n] = { r: o.rotation.toArray().slice(0, 3), s: o.scale.toArray() };

  const clips = buildClips(rest);
  root.userData = { height: +new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y.toFixed(3) };
  return { root, bones, clips };
}

/* ----------------------------------------------------------------------------
 * Animaciones (keyframes → exportables a glTF)
 * ------------------------------------------------------------------------- */
const ANIM_BONES = ['Torso', 'Cuello', 'Cabeza', 'Hombro_L', 'Hombro_R', 'Codo_L', 'Codo_R', 'Mano_L', 'Mano_R', 'Muslo_L', 'Muslo_R', 'Rodilla_L', 'Rodilla_R'];

/** keys: { Hueso: [[t, [rx,ry,rz]], ...] } — huesos faltantes quedan en reposo. */
function makeClip(name, duration, keys, rest, { blinks = [], extra = [] } = {}) {
  const tracks = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const bone of ANIM_BONES) {
    const k = keys[bone] || [[0, rest[bone].r], [duration, rest[bone].r]];
    const times = [], vals = [];
    for (const [t, rot] of k) {
      times.push(t);
      q.setFromEuler(e.set(rot[0], rot[1], rot[2]));
      vals.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, vals));
  }
  // Parpadeo
  const bt = [0], bv = [1, 1, 1];
  for (const t of blinks) { bt.push(t - 0.06, t, t + 0.07); bv.push(1, 1, 1, 1, 0.1, 1, 1, 1, 1); }
  bt.push(duration); bv.push(1, 1, 1);
  for (const side of ['L', 'R']) tracks.push(new THREE.VectorKeyframeTrack(`Ojo_${side}.scale`, bt, bv));
  tracks.push(...extra);
  return new THREE.AnimationClip(name, duration, tracks);
}

function buildClips(rest) {
  const R = (b) => rest[b].r;
  const add = (b, dx = 0, dy = 0, dz = 0) => [R(b)[0] + dx, R(b)[1] + dy, R(b)[2] + dz];

  // --- Reposo / respiración (loop) ---
  const idle = makeClip('Reposo', 4, {
    Torso: [[0, [0, 0, 0]], [1, [0.02, 0.02, 0.012]], [2, [0, 0, 0]], [3, [0.02, -0.02, -0.012]], [4, [0, 0, 0]]],
    Cabeza: [[0, [0, 0, 0]], [1, [0.03, 0.1, 0.02]], [2, [0, 0, 0]], [3, [0.03, -0.1, -0.02]], [4, [0, 0, 0]]],
    Hombro_L: [[0, R('Hombro_L')], [2, add('Hombro_L', -0.05, 0, 0.04)], [4, R('Hombro_L')]],
    Hombro_R: [[0, R('Hombro_R')], [2, add('Hombro_R', 0.05, 0, -0.04)], [4, R('Hombro_R')]],
    Codo_L: [[0, R('Codo_L')], [2, add('Codo_L', -0.08)], [4, R('Codo_L')]],
    Codo_R: [[0, R('Codo_R')], [2, add('Codo_R', -0.08)], [4, R('Codo_R')]],
  }, rest, { blinks: [1.6, 3.5] });

  // --- Saludo con la mano derecha ---
  const up = [-0.25, 0, -2.55];
  const wave = [];
  wave.push([0, R('Codo_R')], [0.45, [-0.3, 0, -0.35]]);
  let t = 0.45, s = 1;
  while (t < 2.45) { t += 0.3; wave.push([t, [-0.3, 0, s > 0 ? 0.45 : -0.45]]); s = -s; }
  wave.push([2.95, [-0.3, 0, -0.2]], [3.3, R('Codo_R')]);
  const saludo = makeClip('Saludo', 3.3, {
    Hombro_R: [[0, R('Hombro_R')], [0.45, up], [2.75, up], [3.3, R('Hombro_R')]],
    Codo_R: wave,
    Mano_R: [[0, [0, 0, 0]], [0.45, [0, 0.4, 0]], [2.75, [0, 0.4, 0]], [3.3, [0, 0, 0]]],
    Hombro_L: [[0, R('Hombro_L')], [0.5, add('Hombro_L', -0.1, 0, 0.1)], [2.8, add('Hombro_L', -0.1, 0, 0.1)], [3.3, R('Hombro_L')]],
    Cabeza: [[0, [0, 0, 0]], [0.5, [0.05, -0.18, -0.14]], [1.5, [-0.02, -0.12, -0.18]], [2.6, [0.05, -0.18, -0.12]], [3.3, [0, 0, 0]]],
    Torso: [[0, [0, 0, 0]], [0.5, [0, -0.08, 0.05]], [2.8, [0, -0.08, 0.05]], [3.3, [0, 0, 0]]],
  }, rest, { blinks: [1.2, 2.6] });

  // --- Movimiento de brazos (gesticular al hablar) ---
  const brazos = makeClip('Brazos', 3.6, {
    Hombro_L: [[0, R('Hombro_L')], [0.5, [-0.9, 0, 0.55]], [1.0, [-0.5, 0, 0.9]], [1.5, [-1.0, 0, 0.4]], [2.2, [-0.6, 0, 1.2]], [2.9, [-0.8, 0, 0.5]], [3.6, R('Hombro_L')]],
    Hombro_R: [[0, R('Hombro_R')], [0.5, [-0.6, 0, -0.9]], [1.0, [-1.0, 0, -0.45]], [1.5, [-0.5, 0, -1.0]], [2.2, [-1.0, 0, -0.5]], [2.9, [-0.7, 0, -0.8]], [3.6, R('Hombro_R')]],
    Codo_L: [[0, R('Codo_L')], [0.5, [-1.1, 0, 0]], [1.0, [-0.5, 0, 0]], [1.5, [-1.3, 0, 0]], [2.2, [-0.4, 0, 0]], [2.9, [-1.0, 0, 0]], [3.6, R('Codo_L')]],
    Codo_R: [[0, R('Codo_R')], [0.5, [-0.5, 0, 0]], [1.0, [-1.2, 0, 0]], [1.5, [-0.5, 0, 0]], [2.2, [-1.3, 0, 0]], [2.9, [-0.6, 0, 0]], [3.6, R('Codo_R')]],
    Mano_L: [[0, [0, 0, 0]], [1.0, [0, -0.6, 0]], [2.2, [0, 0.3, 0]], [3.6, [0, 0, 0]]],
    Mano_R: [[0, [0, 0, 0]], [1.0, [0, 0.6, 0]], [2.2, [0, -0.3, 0]], [3.6, [0, 0, 0]]],
    Torso: [[0, [0, 0, 0]], [1.0, [0.04, 0.12, 0]], [2.2, [0.04, -0.12, 0]], [3.6, [0, 0, 0]]],
    Cabeza: [[0, [0, 0, 0]], [1.0, [0.05, 0.15, 0.05]], [2.2, [0.05, -0.15, -0.05]], [3.6, [0, 0, 0]]],
  }, rest, { blinks: [1.8] });

  // --- Cabeza: asentir y negar ---
  const cabeza = makeClip('Cabeza', 3.2, {
    Cabeza: [[0, [0, 0, 0]], [0.3, [0.28, 0, 0]], [0.6, [-0.08, 0, 0]], [0.9, [0.28, 0, 0]], [1.25, [0, 0, 0]],
      [1.55, [0, 0.4, 0]], [1.85, [0, -0.4, 0]], [2.15, [0, 0.4, 0]], [2.45, [0, -0.4, 0]], [2.8, [0, 0, 0.06]], [3.2, [0, 0, 0]]],
    Cuello: [[0, [0, 0, 0]], [0.6, [0.06, 0, 0]], [1.25, [0, 0, 0]], [3.2, [0, 0, 0]]],
  }, rest, { blinks: [1.3, 2.9] });

  // --- Hablar (solo boca, loop) — útil en visores GLB sin audio ---
  const hablar = new THREE.AnimationClip('Hablar', 1.2, [
    new THREE.VectorKeyframeTrack('Boca.scale',
      [0, 0.12, 0.24, 0.36, 0.5, 0.62, 0.76, 0.9, 1.05, 1.2],
      [1, 0.15, 1, 0.9, 0.95, 1, 1.05, 0.35, 1, 1.0, 0.85, 1, 0.95, 0.5, 1, 1, 0.9, 1, 0.85, 0.3, 1, 1, 0.7, 1, 1.1, 0.25, 1, 1, 0.15, 1]),
  ]);

  return { Reposo: idle, Saludo: saludo, Brazos: brazos, Cabeza: cabeza, Hablar: hablar };
}

/* ----------------------------------------------------------------------------
 * "Presentación": una sola animación horneada con el audio
 * ----------------------------------------------------------------------------
 * Visores nativos como Scene Viewer (ARCore) solo reproducen la PRIMERA animación
 * del GLB y la sincronizan con un audio en loop. Por eso se crea un clip único del
 * mismo largo que el MP3, con gestos encadenados + boca horneada desde el audio.
 */

/** Envolvente de apertura de boca (0..1) a partir de PCM mono. */
export function mouthEnvelope(pcm, sampleRate, fps = 30) {
  const hop = sampleRate / fps;
  const win = Math.round(hop * 1.5);
  const n = Math.ceil(pcm.length / hop);
  const values = new Float32Array(n);
  let cur = 0;
  for (let i = 0; i < n; i++) {
    const c = Math.round(i * hop);
    const a = Math.max(0, c - (win >> 1)), b = Math.min(pcm.length, c + (win >> 1));
    let sum = 0;
    for (let j = a; j < b; j++) sum += pcm[j] * pcm[j];
    const rms = Math.sqrt(sum / Math.max(1, b - a));
    const open = Math.min(1, Math.max(0, (rms - 0.012) / 0.11));
    cur += (open - cur) * (open > cur ? 0.6 : 0.3);
    values[i] = cur;
  }
  return { fps, values, duration: pcm.length / sampleRate };
}

/** Encadena Saludo → gestos/reposo → Saludo (despedida) y agrega la boca horneada. */
export function buildPresentacion(clips, envelope) {
  const D = envelope.duration;
  const S = clips.Saludo.duration;
  const segs = []; // [clip, inicio, escalaTiempo]
  if (D <= S) {
    segs.push([clips.Saludo, 0, D / S]);
  } else {
    segs.push([clips.Saludo, 0, 1]);
    const despedida = D >= 2 * S + 1;
    const endMid = despedida ? D - S : D;
    const mid = ['Brazos', 'Reposo', 'Cabeza', 'Reposo'];
    let t = S;
    for (let i = 0; ; i++) {
      const c = clips[mid[i % mid.length]];
      if (t + c.duration > endMid - 0.5) break;
      segs.push([c, t, 1]);
      t += c.duration;
    }
    if (endMid - t > 0.01) segs.push([clips.Reposo, t, (endMid - t) / clips.Reposo.duration]);
    if (despedida) segs.push([clips.Saludo, D - S, 1]);
  }

  const tracks = [];
  for (const proto of clips.Saludo.tracks) {
    const size = proto.getValueSize();
    const times = [], vals = [];
    for (const [clip, start, ts] of segs) {
      const tr = clip.tracks.find((x) => x.name === proto.name);
      for (let k = 0; k < tr.times.length; k++) {
        const tt = start + tr.times[k] * ts;
        if (times.length && tt <= times[times.length - 1] + 1e-4) continue; // tiempos estrictamente crecientes
        times.push(tt);
        for (let v = 0; v < size; v++) vals.push(tr.values[k * size + v]);
      }
    }
    tracks.push(new proto.constructor(proto.name, times, vals));
  }

  // Boca (escala Y) a partir del audio
  const bt = [], bv = [];
  const { fps, values } = envelope;
  for (let i = 0; i < values.length; i++) {
    const t = i / fps;
    if (t >= D) break;
    bt.push(t);
    bv.push(1, 0.15 + values[i] * 0.95, 1);
  }
  bt.push(D); bv.push(1, 0.15, 1);
  tracks.push(new THREE.VectorKeyframeTrack('Boca.scale', bt, bv));
  return new THREE.AnimationClip('Presentacion', D, tracks);
}
