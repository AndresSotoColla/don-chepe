/**
 * glb-actor.js — Personaje cargado desde un GLB animado (por ejemplo el modelo realista
 * de Tripo con esqueleto). Ofrece la misma interfaz básica que CampesinoAnimator para
 * que ar.html pueda usar cualquiera de los dos personajes.
 *
 *  - Reproduce la primera animación del GLB en loop.
 *  - "Hablar" reinicia animación + audio juntos; mientras suena, la animación sigue
 *    el tiempo del audio (incluye la boca horneada por tools/add-jaw.mjs).
 *  - Ajusta la altura del personaje a `targetHeight` metros y apoya los pies en y = 0.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadGlbActor(url, { targetHeight = 1.72 } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // las mallas con esqueleto pueden salirse de su caja original al animarse
    }
  });

  // Normalizar tamaño y apoyar en el piso (medido en la pose inicial)
  const root = new THREE.Group();
  root.name = 'CampesinoGLB';
  root.add(model);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true);
  const h = box.max.y - box.min.y || 1;
  const s = targetHeight / h;
  model.scale.multiplyScalar(s);
  model.position.y -= box.min.y * s;
  model.position.x -= ((box.min.x + box.max.x) / 2) * s;
  model.position.z -= ((box.min.z + box.max.z) / 2) * s;
  root.userData.height = targetHeight;

  return new GlbActor(root, gltf.animations);
}

export class GlbActor extends EventTarget {
  constructor(root, clips) {
    super();
    this.root = root;
    this.gestures = false; // no tiene gestos sueltos (Saludo/Brazos/Cabeza)
    this.mixer = new THREE.AnimationMixer(root);
    this.clip = clips[0] || null;
    this.action = this.clip ? this.mixer.clipAction(this.clip) : null;
    if (this.action) this.action.play();
    this.audio = null;
    this.audioCtx = null;
    this.level = 0;
  }

  attachAudio(audioEl) {
    this.audio = audioEl;
    audioEl.loop = true; // igual que el visor nativo: voz y animación se repiten juntas
    audioEl.addEventListener('play', () => this.dispatchEvent(new Event('audio-play')));
    audioEl.addEventListener('ended', () => this.dispatchEvent(new Event('audio-end')));
  }

  async unlock() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!this.audioCtx && Ctx) this.audioCtx = new Ctx();
    if (this.audioCtx && this.audioCtx.state !== 'running') await this.audioCtx.resume();
  }

  /** Reinicia animación y audio juntos. */
  async speak() {
    if (this.action) this.action.reset().play();
    if (!this.audio) return;
    this.audio.currentTime = 0;
    await this.audio.play();
  }

  play() {
    if (this.action) this.action.reset().play();
  }

  stopSpeaking() {
    if (this.audio) this.audio.pause();
  }

  get speaking() {
    return !!this.audio && !this.audio.paused && !this.audio.ended;
  }

  update(dt) {
    if (this.action && this.speaking) {
      // La animación sigue al reloj del audio → boca y voz siempre sincronizadas
      this.action.time = Math.min(this.audio.currentTime, this.clip.duration - 1e-3);
      this.mixer.update(0);
    } else {
      this.mixer.update(dt);
    }
  }
}
