/**
 * animator.js — Controla las animaciones del campesino y el lip-sync con audio MP3.
 *
 *  - AnimationMixer con un clip "Reposo" en loop y gestos (Saludo, Brazos, Cabeza)
 *    que se mezclan con crossfade y vuelven solos al reposo.
 *  - Lip-sync: un <audio> se conecta a un AnalyserNode (Web Audio API). Cada frame
 *    se calcula la energía (RMS) y la distribución espectral de la voz para abrir la
 *    boca (escala Y) y redondearla/estirarla (escala X). Sin servicios externos.
 */
import * as THREE from 'three';

export class CampesinoAnimator extends EventTarget {
  constructor(character) {
    super();
    this.root = character.root;
    this.bones = character.bones;
    this.clips = character.clips;
    this.mixer = new THREE.AnimationMixer(this.root);
    this.actions = {};
    for (const [name, clip] of Object.entries(this.clips)) this.actions[name] = this.mixer.clipAction(clip);

    this.idle = this.actions.Reposo;
    this.idle.play();
    this.current = this.idle;

    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.current && e.action !== this.idle) {
        this.idle.reset().play();
        this.idle.crossFadeFrom(e.action, 0.4, false);
        this.current = this.idle;
        this.dispatchEvent(new Event('gesture-end'));
      }
    });

    // Lip-sync
    this.audio = null;
    this.audioCtx = null;
    this.analyser = null;
    this.timeData = null;
    this.freqData = null;
    this.mouthOpen = 0;
    this.mouthWide = 0;
    this.level = 0; // 0..1, para UI
    this._tmpQ = new THREE.Quaternion();
    this._tmpE = new THREE.Euler();
    this.talkLoop = false;
    this.gestureWhileTalking = true;
    this.gestures = true;
  }

  /** Reproduce un gesto: 'Saludo' | 'Brazos' | 'Cabeza' */
  play(name) {
    const a = this.actions[name];
    if (!a || name === 'Hablar') return;
    a.reset();
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.play();
    a.crossFadeFrom(this.current, 0.3, false);
    this.current = a;
  }

  /** Movimiento de boca automático (sin audio). */
  setTalkLoop(on) {
    this.talkLoop = on;
    const a = this.actions.Hablar;
    if (on) a.reset().fadeIn(0.15).play();
    else a.fadeOut(0.15);
  }

  /** Conecta un elemento <audio> al analizador (una sola vez por elemento). */
  attachAudio(audioEl) {
    this.audio = audioEl;
    this._ensureContext();
    if (!audioEl._campesinoSource) {
      audioEl._campesinoSource = this.audioCtx.createMediaElementSource(audioEl);
      audioEl._campesinoSource.connect(this.analyser);
    }
    audioEl.addEventListener('play', () => this.dispatchEvent(new Event('audio-play')));
    audioEl.addEventListener('ended', () => this.dispatchEvent(new Event('audio-end')));
  }

  _ensureContext() {
    if (this.audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new Ctx();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.3;
    this.analyser.connect(this.audioCtx.destination);
    this.timeData = new Float32Array(this.analyser.fftSize);
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /** Debe llamarse dentro de un gesto del usuario (click/tap) en móviles. */
  async unlock() {
    this._ensureContext();
    if (this.audioCtx.state !== 'running') await this.audioCtx.resume();
  }

  async speak({ withGesture = true } = {}) {
    if (!this.audio) return;
    await this.unlock();
    this.audio.currentTime = 0;
    await this.audio.play();
    if (withGesture) this.play('Saludo');
  }

  stopSpeaking() {
    if (this.audio) this.audio.pause();
  }

  get speaking() {
    return !!this.audio && !this.audio.paused && !this.audio.ended;
  }

  _analyse() {
    if (!this.analyser || !this.speaking) return { open: 0, wide: 0 };
    this.analyser.getFloatTimeDomainData(this.timeData);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) sum += this.timeData[i] * this.timeData[i];
    const rms = Math.sqrt(sum / this.timeData.length);

    // Relación de energía agudos/graves en la banda de voz → vocal abierta (a/o) vs estirada (e/i)
    this.analyser.getByteFrequencyData(this.freqData);
    const binHz = this.audioCtx.sampleRate / this.analyser.fftSize;
    let low = 0, high = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      const f = i * binHz;
      if (f >= 150 && f < 900) low += this.freqData[i];
      else if (f >= 1500 && f < 4000) high += this.freqData[i];
    }
    const wide = low + high > 0 ? high / (low + high) : 0;
    const open = THREE.MathUtils.clamp((rms - 0.012) / 0.11, 0, 1);
    return { open, wide };
  }

  update(dt) {
    this.mixer.update(dt);

    const boca = this.bones.Boca;
    if (this.speaking) {
      const { open, wide } = this._analyse();
      // ataque rápido, caída más lenta → movimiento natural
      const k = open > this.mouthOpen ? 0.55 : 0.25;
      this.mouthOpen += (open - this.mouthOpen) * k;
      this.mouthWide += (wide - this.mouthWide) * 0.2;
      this.level = this.mouthOpen;
      boca.scale.set(0.9 + this.mouthWide * 0.5 - this.mouthOpen * 0.1, 0.15 + this.mouthOpen * 0.95, 1);
      // pequeño movimiento de cabeza acompañando la voz
      const cabeza = this.bones.Cabeza;
      this._tmpQ.setFromEuler(this._tmpE.set(this.mouthOpen * 0.06, 0, 0));
      cabeza.quaternion.multiply(this._tmpQ);
    } else if (!this.talkLoop) {
      this.mouthOpen *= 0.8;
      this.level = this.mouthOpen;
      if (this.actions.Hablar.getEffectiveWeight() < 0.01) boca.scale.set(1, 0.15 + this.mouthOpen * 0.95, 1);
    }
  }
}
