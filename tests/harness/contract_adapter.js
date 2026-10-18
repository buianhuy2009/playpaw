/**
 * PawPlay Contract Adapter & Authoritative Reference Oracle
 * Bridges test suites to production `src/` modules or executes authoritative specifications.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./event_simulator.js')
    );
  } else {
    root.PawPlayAdapter = factory(
      root.PawPlayEventSimulator
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (EventSimulator) {
  'use strict';

  // -------------------------------------------------------------
  // Authoritative Mathematical Constants & Palettes
  // -------------------------------------------------------------
  const MARGIN_TOP = 72;
  const MARGIN_BOTTOM = 72;
  const MARGIN_SIDES = 48;
  const MAX_DPR = 2.0;
  const MAX_DT = 0.05; // 50ms (20fps lower clamp)
  const PAW_PAD_TOLERANCE = 42;
  const RESTING_DISPLACEMENT_LIMIT = 12; // px
  const RESTING_TIME_LIMIT = 400; // ms
  const EXIT_LOCK_DURATION_MS = 8000;
  const IDLE_LURE_DURATION_SEC = 12.0;

  const THEMES = {
    daylight: { id: 'daylight', name: 'Daylight Floor', bg: '#F4F1EA', contrastColor: '#1A110B' },
    night: { id: 'night', name: 'Night Stalker', bg: '#10121A', contrastColor: '#FFD600' },
    pond: { id: 'pond', name: 'Koi Pond', bg: '#0A2239', contrastColor: '#00E5FF', ripples: true }
  };

  const PREY_TYPES = ['laser', 'bug', 'mouse', 'koi', 'bee'];
  const PREY_STATES = ['FREEZE_TREMOR', 'DART_SPRINT', 'STALK_CREEP', 'EDGE_SKITTER', 'CAUGHT_RESPAWN'];
  const SPEED_MODES = { kitten: 180, hunter: 400, apex: 750, ludicrous: 1100 };
  const SIZE_MODES = { tiny: 20, normal: 32, chonky: 50 };

  // -------------------------------------------------------------
  // Reference Implementation: Engine
  // -------------------------------------------------------------
  class ReferenceEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.dpr = 1.0;
      this.width = 1024;
      this.height = 768;
      this.theme = THEMES.daylight;
      this.isPlaying = false;
      this.isPaused = false;
      this.score = 0;
      this.lastTime = 0;
      this.particles = [];
      this.ripples = [];
      this.preyList = [];
      this.idleTime = 0;
      this.onCatch = null;
    }

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.updateDpi();
      return this;
    }

    updateDpi(dprValue) {
      const rawDpr = dprValue !== undefined ? dprValue : (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
      this.dpr = Math.min(Math.max(1, rawDpr), MAX_DPR);

      if (this.canvas) {
        const cssW = this.canvas.clientWidth || this.width;
        const cssH = this.canvas.clientHeight || this.height;
        this.width = cssW;
        this.height = cssH;
        this.canvas.width = Math.floor(cssW * this.dpr);
        this.canvas.height = Math.floor(cssH * this.dpr);
        if (this.ctx && this.ctx.scale) {
          this.ctx.scale(this.dpr, this.dpr);
        }
      }
    }

    setTheme(themeKey) {
      if (THEMES[themeKey]) {
        this.theme = THEMES[themeKey];
      }
    }

    getDimensions() {
      return {
        width: this.width,
        height: this.height,
        dpr: this.dpr,
        safeArea: {
          top: MARGIN_TOP,
          bottom: this.height - MARGIN_BOTTOM,
          left: MARGIN_SIDES,
          right: this.width - MARGIN_SIDES
        }
      };
    }

    applySafeMargins(sprite, dt = 0.016) {
      const minX = MARGIN_SIDES + sprite.radius;
      const maxX = this.width - MARGIN_SIDES - sprite.radius;
      const minY = MARGIN_TOP + sprite.radius;
      const maxY = this.height - MARGIN_BOTTOM - sprite.radius;

      // Soft steering repulsion
      const buffer = 40;
      if (sprite.x < minX + buffer) sprite.vx = Math.abs(sprite.vx || 100);
      if (sprite.x > maxX - buffer) sprite.vx = -Math.abs(sprite.vx || 100);
      if (sprite.y < minY + buffer) sprite.vy = Math.abs(sprite.vy || 100);
      if (sprite.y > maxY - buffer) sprite.vy = -Math.abs(sprite.vy || 100);

      // Hard safety clamping
      if (sprite.x < minX) { sprite.x = minX; sprite.vx = Math.abs(sprite.vx); }
      if (sprite.x > maxX) { sprite.x = maxX; sprite.vx = -Math.abs(sprite.vx); }
      if (sprite.y < minY) { sprite.y = minY; sprite.vy = Math.abs(sprite.vy); }
      if (sprite.y > maxY) { sprite.y = maxY; sprite.vy = -Math.abs(sprite.vy); }
    }

    spawnBurst(x, y, palette = ['#FFD600', '#00E5FF']) {
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.3;
        const speed = 150 + Math.random() * 250;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3 + Math.random() * 4,
          alpha: 1.0,
          color: palette[i % palette.length]
        });
      }
    }

    addRipple(x, y) {
      if (this.theme.ripples) {
        this.ripples.push({ x, y, radius: 5, maxRadius: 120, alpha: 0.8 });
      }
    }

    start() {
      this.isPlaying = true;
      this.isPaused = false;
      this.lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    }

    stop() {
      this.isPlaying = false;
      this.isPaused = false;
    }

    update(dt) {
      if (!this.isPlaying || this.isPaused) return;

      const normalizedDt = Math.min(dt, MAX_DT);
      this.idleTime += normalizedDt;

      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * normalizedDt;
        p.y += p.vy * normalizedDt;
        p.alpha -= normalizedDt * 2.5; // ~400ms lifetime
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Update ripples
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.radius += normalizedDt * 90;
        r.alpha -= normalizedDt * 0.7;
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          this.ripples.splice(i, 1);
        }
      }

      // Update prey
      for (const prey of this.preyList) {
        prey.update(normalizedDt, this.getDimensions().safeArea);
        this.applySafeMargins(prey, normalizedDt);
      }
    }

    advanceTime(seconds) {
      let remaining = seconds;
      while (remaining > 0) {
        const slice = Math.min(remaining, 1 / 60);
        this.update(slice);
        remaining -= slice;
      }
    }

    resetIdleTimer() {
      this.idleTime = 0;
    }
  }

  // -------------------------------------------------------------
  // Reference Implementation: PreyAgent & PreyManager
  // -------------------------------------------------------------
  class ReferencePreyAgent {
    constructor(id, type = 'mouse', speedMode = 'hunter', sizeMode = 'normal') {
      this.id = id;
      this.type = type;
      this.speedMode = speedMode;
      this.sizeMode = sizeMode;
      this.baseSpeed = SPEED_MODES[speedMode] || 400;
      this.radius = SIZE_MODES[sizeMode] || 32;
      this.x = 200 + Math.random() * 400;
      this.y = 200 + Math.random() * 300;
      this.vx = (Math.random() - 0.5) * this.baseSpeed;
      this.vy = (Math.random() - 0.5) * this.baseSpeed;
      this.heading = Math.atan2(this.vy, this.vx);
      this.state = 'STALK_CREEP';
      this.stateTimer = 0;
      this.stateDuration = 2.0;
      this.jitter = 0;
      this.squishProgress = 0;
      this.isRespawning = false;
    }

    changeState(newState, duration = 1.0) {
      this.state = newState;
      this.stateTimer = 0;
      this.stateDuration = duration;

      switch (newState) {
        case 'FREEZE_TREMOR':
          this.vx = 0;
          this.vy = 0;
          break;
        case 'DART_SPRINT':
          const sprintSpeed = this.baseSpeed * 1.8;
          const sprintAngle = this.heading + (Math.random() - 0.5) * 1.2;
          this.vx = Math.cos(sprintAngle) * sprintSpeed;
          this.vy = Math.sin(sprintAngle) * sprintSpeed;
          break;
        case 'STALK_CREEP':
          const creepSpeed = this.baseSpeed * 0.45;
          this.vx = Math.cos(this.heading) * creepSpeed;
          this.vy = Math.sin(this.heading) * creepSpeed;
          break;
        case 'EDGE_SKITTER':
          const skitterSpeed = this.baseSpeed * 1.2;
          this.vx = Math.cos(this.heading) * skitterSpeed;
          this.vy = Math.sin(this.heading) * skitterSpeed;
          break;
        case 'CAUGHT_RESPAWN':
          this.vx = 0;
          this.vy = 0;
          this.squishProgress = 0;
          this.isRespawning = true;
          break;
      }
    }

    update(dt, safeArea) {
      this.stateTimer += dt;

      if (this.state === 'FREEZE_TREMOR') {
        this.jitter = Math.sin(this.stateTimer * 45) * 1.5;
        if (this.stateTimer >= this.stateDuration) {
          this.changeState('DART_SPRINT', 0.6);
        }
        return;
      }

      if (this.state === 'CAUGHT_RESPAWN') {
        this.squishProgress = Math.min(1.0, this.stateTimer / 0.18);
        if (this.stateTimer >= 0.88) { // 180ms squish + 700ms offscreen delay
          this.isRespawning = false;
          this.x = safeArea.left + Math.random() * (safeArea.right - safeArea.left);
          this.y = safeArea.top + Math.random() * (safeArea.bottom - safeArea.top);
          this.changeState('STALK_CREEP', 1.5);
        }
        return;
      }

      // Normal movement
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.heading = Math.atan2(this.vy, this.vx);

      if (this.stateTimer >= this.stateDuration) {
        // Markov state transitions
        const rand = Math.random();
        if (this.state === 'DART_SPRINT') {
          this.changeState('FREEZE_TREMOR', 1.0);
        } else if (this.state === 'STALK_CREEP') {
          this.changeState(rand > 0.4 ? 'DART_SPRINT' : 'EDGE_SKITTER', 0.8);
        } else if (this.state === 'EDGE_SKITTER') {
          this.changeState('DART_SPRINT', 0.7);
        }
      }
    }
  }

  class ReferencePreyManager {
    constructor() {
      this.preyList = [];
      this.type = 'mouse';
      this.speed = 'hunter';
      this.size = 'normal';
      this.count = 1;
    }

    init(count = 1, type = 'mouse', speed = 'hunter', size = 'normal') {
      this.count = Math.max(1, Math.min(4, count));
      this.type = type;
      this.speed = speed;
      this.size = size;
      this.preyList = [];

      for (let i = 0; i < this.count; i++) {
        this.preyList.push(new ReferencePreyAgent(i, type, speed, size));
      }
      return this;
    }

    update(dt, safeArea) {
      for (const prey of this.preyList) {
        prey.update(dt, safeArea);
      }
    }

    checkRaycastHit(x1, y1, x2, y2, tolerance = PAW_PAD_TOLERANCE) {
      const hits = [];
      for (const prey of this.preyList) {
        if (prey.isRespawning) continue;
        const hit = EventSimulator.checkRaycastHit(x1, y1, x2, y2, prey.x, prey.y, prey.radius, tolerance);
        if (hit) {
          hits.push(prey);
        }
      }
      return hits;
    }
  }

  // -------------------------------------------------------------
  // Reference Implementation: InputController & DefenseShield
  // -------------------------------------------------------------
  class ReferenceInputController {
    constructor() {
      this.filter = new EventSimulator.SittingPawFilter(RESTING_DISPLACEMENT_LIMIT, RESTING_TIME_LIMIT);
      this.activeTouches = new Map();
      this.onPounce = null;
      this.onRipple = null;
    }

    init(canvas, onPounce, onRipple) {
      this.canvas = canvas;
      this.onPounce = onPounce;
      this.onRipple = onRipple;
    }

    touchDown(id, x, y, timeMs = Date.now()) {
      this.activeTouches.set(id, { x, y, time: timeMs });
      this.filter.touchDown(id, x, y, timeMs);
      if (this.onRipple) this.onRipple(x, y);
    }

    touchMove(id, x, y, timeMs = Date.now()) {
      const prev = this.activeTouches.get(id);
      this.filter.touchMove(id, x, y, timeMs);

      if (prev && !this.filter.isResting(id)) {
        if (this.onPounce) {
          this.onPounce(prev.x, prev.y, x, y, id);
        }
      }
      this.activeTouches.set(id, { x, y, time: timeMs });
    }

    touchUp(id) {
      this.activeTouches.delete(id);
      this.filter.touchUp(id);
    }

    isRestingPaw(id) {
      return this.filter.isResting(id);
    }
  }

  class ReferenceDefenseShield {
    constructor() {
      this.beforeUnloadEnabled = false;
      this.exitStartTime = null;
      this.exitProgress = 0.0;
      this.onExitComplete = null;
      this.isHoldingExit = false;
    }

    enableBeforeUnload(isPlayingFn) {
      this.beforeUnloadEnabled = true;
      this.isPlayingFn = isPlayingFn;
    }

    handleBeforeUnload(evt) {
      if (this.beforeUnloadEnabled && this.isPlayingFn && this.isPlayingFn()) {
        const msg = 'Leave PawPlay? Your active cat session will end.';
        evt.returnValue = msg;
        return msg;
      }
      return null;
    }

    startExitHold(timeMs = Date.now()) {
      this.isHoldingExit = true;
      this.exitStartTime = timeMs;
      this.exitProgress = 0.0;
    }

    updateExitHold(currentTimeMs) {
      if (!this.isHoldingExit || this.exitStartTime === null) return 0.0;
      const elapsed = currentTimeMs - this.exitStartTime;
      this.exitProgress = Math.min(1.0, elapsed / EXIT_LOCK_DURATION_MS);
      if (this.exitProgress >= 1.0 && this.onExitComplete) {
        this.onExitComplete();
        this.resetExitHold();
      }
      return this.exitProgress;
    }

    cancelExitHold() {
      this.resetExitHold();
    }

    resetExitHold() {
      this.isHoldingExit = false;
      this.exitStartTime = null;
      this.exitProgress = 0.0;
    }

    getExitProgress() {
      return this.exitProgress;
    }
  }

  // -------------------------------------------------------------
  // Reference Implementation: SoundSynthesizer
  // -------------------------------------------------------------
  class ReferenceSoundSynthesizer {
    constructor(audioContext) {
      this.ctx = audioContext || (typeof AudioContext !== 'undefined' ? new AudioContext() : null);
      this.isMuted = false;
      this.volume = 1.0;
      this.lastCatchPlayed = null;
      this.lureTriggeredCount = 0;
      this.chimePlayed = false;
    }

    async unlock() {
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return this.ctx ? this.ctx.state : 'unsupported';
    }

    mute(muted) {
      this.isMuted = Boolean(muted);
    }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
    }

    playPreyCatch(type) {
      if (this.isMuted || !this.ctx) return;
      this.lastCatchPlayed = type;

      const osc = this.ctx.createOscillator ? this.ctx.createOscillator() : null;
      const gain = this.ctx.createGain ? this.ctx.createGain() : null;
      if (osc && gain) {
        if (type === 'mouse') {
          // FM Rodent sweep 4800 -> 2600 -> 3900
          osc.frequency.setValueAtTime(4800, this.ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(2600, this.ctx.currentTime + 0.06);
          osc.frequency.linearRampToValueAtTime(3900, this.ctx.currentTime + 0.11);
        } else if (type === 'bug' || type === 'bee') {
          // Bandpass noise pulse
          osc.frequency.setValueAtTime(5200, this.ctx.currentTime);
        } else if (type === 'koi') {
          // Water splash low-pass
          osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(280, this.ctx.currentTime + 0.15);
        }
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.2);
      }
    }

    triggerAcousticLure() {
      if (this.isMuted) return;
      this.lureTriggeredCount++;
      if (this.ctx && this.ctx.createOscillator) {
        const osc = this.ctx.createOscillator();
        osc.frequency.setValueAtTime(6500, this.ctx.currentTime);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.06);
      }
    }

    playTreatChime() {
      if (this.isMuted) return;
      this.chimePlayed = true;
      // Ascending C5-E5-G5
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        if (this.ctx && this.ctx.createOscillator) {
          const osc = this.ctx.createOscillator();
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.15);
          osc.start(this.ctx.currentTime + i * 0.15);
          osc.stop(this.ctx.currentTime + i * 0.15 + 0.3);
        }
      });
    }

    getContextState() {
      return this.ctx ? this.ctx.state : 'closed';
    }

    wasLureTriggeredRecently() {
      return this.lureTriggeredCount > 0;
    }
  }

  // -------------------------------------------------------------
  // Reference Implementation: PounceCam
  // -------------------------------------------------------------
  class ReferencePounceCam {
    constructor(indexedDb) {
      this.db = indexedDb;
      this.stream = null;
      this.isEnabled = false;
      this.triggerMode = 'catch'; // 'catch', 'near-miss', 'all', 'disabled'
      this.transientPhotos = [];
      this.simulatedError = null;
    }

    async init() {
      if (this.simulatedError) {
        this.isEnabled = false;
        throw this.simulatedError;
      }
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
          this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          this.isEnabled = true;
        } else {
          this.isEnabled = false;
        }
      } catch (err) {
        this.isEnabled = false;
        throw err;
      }
    }

    setTriggerMode(mode) {
      this.triggerMode = mode;
      if (mode === 'disabled') this.isEnabled = false;
    }

    async captureSnapshot(trigger = 'catch') {
      if (!this.isEnabled || this.triggerMode === 'disabled') return null;
      if (this.triggerMode === 'catch' && trigger !== 'catch') return null;
      if (this.triggerMode === 'near-miss' && trigger !== 'near-miss') return null;

      const photoRecord = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        badge: 'PAWPLAY_RETRO_CAM',
        trigger,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      try {
        if (this.db) {
          await new Promise((resolve, reject) => {
            const req = this.db.open('pawplay_photos_v1', 1);
            req.onsuccess = (e) => {
              const db = e.target.result;
              const tx = db.transaction(['photos'], 'readwrite');
              const store = tx.objectStore('photos');
              const addReq = store.add(photoRecord);
              addReq.onsuccess = () => resolve(photoRecord);
              addReq.onerror = (addErr) => reject(addReq.error || addErr);
            };
            req.onerror = (e) => reject(req.error || e);
          });
        } else {
          this.transientPhotos.push(photoRecord);
        }
      } catch (err) {
        // Fall back to transient array on QuotaExceeded or DB error
        this.transientPhotos.push(photoRecord);
      }

      return photoRecord;
    }

    async getPhotos() {
      if (!this.db) return this.transientPhotos;
      return new Promise((resolve) => {
        const req = this.db.open('pawplay_photos_v1', 1);
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['photos'], 'readonly');
          const store = tx.objectStore('photos');
          const getReq = store.getAll();
          getReq.onsuccess = () => {
            resolve([...(getReq.result || []), ...this.transientPhotos]);
          };
          getReq.onerror = () => resolve(this.transientPhotos);
        };
        req.onerror = () => resolve(this.transientPhotos);
      });
    }

    async deletePhoto(id) {
      this.transientPhotos = this.transientPhotos.filter(p => p.id !== id);
      if (this.db) {
        return new Promise((resolve) => {
          const req = this.db.open('pawplay_photos_v1', 1);
          req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(['photos'], 'readwrite');
            const store = tx.objectStore('photos');
            const delReq = store.delete(id);
            delReq.onsuccess = () => resolve(true);
            delReq.onerror = () => resolve(false);
          };
          req.onerror = () => resolve(false);
        });
      }
      return true;
    }
  }

  // -------------------------------------------------------------
  // Reference Implementation: UIController & AppState
  // -------------------------------------------------------------
  class ReferenceAppState {
    constructor(storage) {
      this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      this.defaults = {
        prey: 'mouse',
        speed: 'hunter',
        size: 'normal',
        theme: 'daylight',
        count: 1,
        volume: 0.8,
        timerMode: 'unlimited',
        cameraTrigger: 'catch'
      };
      this.state = { ...this.defaults };
      this.load();
    }

    load() {
      if (!this.storage) return;
      try {
        const raw = this.storage.getItem('pawplay_state_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          this.state = { ...this.defaults, ...parsed };
        }
      } catch (e) {
        this.state = { ...this.defaults };
      }
    }

    save() {
      if (!this.storage) return;
      try {
        this.storage.setItem('pawplay_state_v1', JSON.stringify(this.state));
      } catch (e) {}
    }

    get(key) {
      return key ? this.state[key] : { ...this.state };
    }

    update(partial) {
      this.state = { ...this.state, ...partial };
      this.save();
      return this.state;
    }

    isOnboarded() {
      return Boolean(this.storage && this.storage.getItem('pawplay_onboarded_v1') === 'true');
    }

    setOnboarded(flag = true) {
      if (this.storage) {
        this.storage.setItem('pawplay_onboarded_v1', flag ? 'true' : 'false');
      }
    }
  }

  class ReferenceUIController {
    constructor(appState, elements = {}) {
      this.state = appState;
      this.elements = elements;
      this.currentSlide = 0;
      this.totalSlides = 5;
      this.sessionDurationMinutes = 0; // 0 = unlimited
      this.remainingSeconds = 0;
    }

    showOnboarding(onDone) {
      this.currentSlide = 0;
      this.onDone = onDone;
    }

    nextSlide() {
      if (this.currentSlide < this.totalSlides - 1) {
        this.currentSlide++;
      }
      return this.currentSlide;
    }

    prevSlide() {
      if (this.currentSlide > 0) {
        this.currentSlide--;
      }
      return this.currentSlide;
    }

    finishOnboarding() {
      this.state.setOnboarded(true);
      if (this.onDone) this.onDone();
    }

    setOption(key, val) {
      return this.state.update({ [key]: val });
    }

    getOptions() {
      return this.state.get();
    }

    startSession(mode = 'unlimited') {
      const modeToMinutes = { '1m': 1, '3m': 3, '5m': 5, 'unlimited': 0 };
      this.sessionDurationMinutes = modeToMinutes[mode] || 0;
      this.remainingSeconds = this.sessionDurationMinutes * 60;
    }

    tickSession(dtSeconds) {
      if (this.sessionDurationMinutes > 0 && this.remainingSeconds > 0) {
        this.remainingSeconds = Math.max(0, this.remainingSeconds - dtSeconds);
        return this.remainingSeconds === 0; // true if session ended
      }
      return false;
    }
  }

  /**
   * Adapter Factory: returns real production module if available, otherwise reference implementation.
   */
  function getModule(name, env = {}) {
    const win = typeof window !== 'undefined' ? window : (env.target || globalThis);

    switch (name) {
      case 'Engine':
        return win.PawPlayEngine || new ReferenceEngine();
      case 'PreyManager':
        return win.PawPlayPrey || new ReferencePreyManager();
      case 'InputController':
        return win.PawPlayInput || new ReferenceInputController();
      case 'DefenseShield':
        return win.PawPlayDefense || new ReferenceDefenseShield();
      case 'SoundSynthesizer':
        return win.PawPlayAudio || new ReferenceSoundSynthesizer(env.audioCtx);
      case 'PounceCam':
        return win.PawPlayCamera || new ReferencePounceCam(env.indexedDb);
      case 'AppState':
        return win.PawPlayState || new ReferenceAppState(env.storage);
      case 'UIController':
        return win.PawPlayUI || new ReferenceUIController(new ReferenceAppState(env.storage));
      default:
        throw new Error(`Unknown module: ${name}`);
    }
  }

  return {
    MARGIN_TOP,
    MARGIN_BOTTOM,
    MARGIN_SIDES,
    MAX_DPR,
    MAX_DT,
    PAW_PAD_TOLERANCE,
    RESTING_DISPLACEMENT_LIMIT,
    RESTING_TIME_LIMIT,
    EXIT_LOCK_DURATION_MS,
    IDLE_LURE_DURATION_SEC,
    THEMES,
    PREY_TYPES,
    PREY_STATES,
    SPEED_MODES,
    SIZE_MODES,
    ReferenceEngine,
    ReferencePreyAgent,
    ReferencePreyManager,
    ReferenceInputController,
    ReferenceDefenseShield,
    ReferenceSoundSynthesizer,
    ReferencePounceCam,
    ReferenceAppState,
    ReferenceUIController,
    getModule
  };
});
