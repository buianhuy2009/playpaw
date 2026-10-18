/**
 * Independent Victory Audit Direct Verification Script
 * Directly tests all production modules in src/ without using any harness reference adapters.
 */

import { Engine, THEMES, SAFE_MARGINS, MARGIN_CONFIG, getSafeBounds, MAX_DPR, MAX_DT } from '../../../src/engine.js';
import { PreyAgent, PreyManager, PREY_TYPES, PREY_STATES, SPEED_MODES, SIZE_MODES, checkRaycastHit, distPointToSegment } from '../../../src/prey.js';
import { InputController, SittingPawFilter, PAW_PAD_TOLERANCE, RESTING_DISPLACEMENT_LIMIT, RESTING_TIME_LIMIT } from '../../../src/input.js';
import { DefenseShield, EXIT_LOCK_DURATION_MS } from '../../../src/defense.js';
import { SoundSynthesizer } from '../../../src/audio.js';
import { AppState, DEFAULT_SETTINGS } from '../../../src/state.js';
import { UIController, ONBOARDING_STEPS } from '../../../src/ui.js';
import { PounceCam, DB_NAME, STORE_NAME } from '../../../src/camera.js';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

console.log('🧪 Starting Independent Direct Audit of PawPlay src/ Modules...\n');

// -------------------------------------------------------------
// 1. Audit R1: Core Engine, Safe Margins, DPR & Themes
// -------------------------------------------------------------
console.log('Testing R1: Core Engine & Margins...');
assert(SAFE_MARGINS.TOP === 72, 'SAFE_MARGINS.TOP must be exactly 72');
assert(SAFE_MARGINS.BOTTOM === 72, 'SAFE_MARGINS.BOTTOM must be exactly 72');
assert(SAFE_MARGINS.SIDES === 48, 'SAFE_MARGINS.SIDES must be exactly 48');

const bounds = getSafeBounds(1000, 800, 30);
assert(bounds.xMin === 78, `xMin should be 48 + 30 = 78, got ${bounds.xMin}`);
assert(bounds.xMax === 922, `xMax should be 1000 - 48 - 30 = 922, got ${bounds.xMax}`);
assert(bounds.yMin === 102, `yMin should be 72 + 30 = 102, got ${bounds.yMin}`);
assert(bounds.yMax === 698, `yMax should be 800 - 72 - 30 = 698, got ${bounds.yMax}`);

// Mock Canvas & Context
class MockCanvasContext {
  constructor() {
    this.transformMatrix = [1, 0, 0, 1, 0, 0];
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.globalAlpha = 1;
  }
  setTransform(a, b, c, d, e, f) { this.transformMatrix = [a, b, c, d, e, f]; }
  scale(x, y) {}
  translate(x, y) {}
  rotate(ang) {}
  save() {}
  restore() {}
  beginPath() {}
  closePath() {}
  arc() {}
  fill() {}
  stroke() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  ellipse() {}
  fillRect() {}
  strokeRect() {}
  clearRect() {}
  fillText() {}
  createLinearGradient() { return { addColorStop: () => {} }; }
  createRadialGradient() { return { addColorStop: () => {} }; }
  drawImage() {}
}

const mockCanvas = {
  clientWidth: 1024,
  clientHeight: 768,
  width: 1024,
  height: 768,
  style: {},
  getContext: () => new MockCanvasContext()
};

const engine = new Engine(mockCanvas);
engine.updateDpi(3.0); // DPR = 3.0 should clamp to 2.0
assert(engine.dpr === 2.0, `DPR clamped to MAX_DPR 2.0, got ${engine.dpr}`);

// Test Margin Repulsion under extreme speed
const agent = new PreyAgent(1, 'mouse', 'ludicrous', 'tiny'); // speed 1100
agent.x = 200;
agent.y = 80; // Heading towards top margin 72
agent.vx = 0;
agent.vy = -1100;

for (let i = 0; i < 60; i++) {
  engine.applySafeMargins(agent, 0.016);
  agent.y += agent.vy * 0.016;
  assert(agent.y >= 72 + agent.radius, `Prey penetrated top margin! y=${agent.y}, min=${72 + agent.radius}`);
}

// Test NaN coordinate recovery
agent.x = NaN;
agent.y = Infinity;
agent.vx = NaN;
engine.applySafeMargins(agent, 0.016);
assert(!Number.isNaN(agent.x) && Number.isFinite(agent.x), 'Engine failed to recover NaN x-coordinate');
assert(!Number.isNaN(agent.y) && Number.isFinite(agent.y), 'Engine failed to recover Infinity y-coordinate');

// Test Themes
assert(THEMES.daylight.id === 'daylight', 'daylight theme defined');
assert(THEMES.night.id === 'night', 'night theme defined');
assert(THEMES.pond.id === 'pond' && THEMES.pond.ripples === true, 'pond theme has ripples');

// -------------------------------------------------------------
// 2. Audit R2: 5-State Prey AI, Sprites & Concurrency
// -------------------------------------------------------------
console.log('Testing R2: Prey AI & Procedural Sprites...');
assert(PREY_TYPES.length === 5, 'Must have 5 prey types');
['laser', 'bug', 'mouse', 'koi', 'bee'].forEach(t => {
  assert(PREY_TYPES.includes(t), `PREY_TYPES includes ${t}`);
});

assert(PREY_STATES.length === 5, 'Must have 5 states');
['FREEZE_TREMOR', 'DART_SPRINT', 'STALK_CREEP', 'EDGE_SKITTER', 'CAUGHT_RESPAWN'].forEach(s => {
  assert(PREY_STATES.includes(s), `PREY_STATES includes ${s}`);
});

const preyManager = new PreyManager().init(4, 'bee', 'apex', 'normal');
assert(preyManager.preyList.length === 4, 'PreyManager must instantiate 4 concurrent agents');

const mockCtx = new MockCanvasContext();
// Verify procedural rendering of each sprite doesn't throw
PREY_TYPES.forEach(type => {
  const p = new PreyAgent(99, type, 'hunter', 'normal');
  try {
    p.draw(mockCtx);
    assert(true, `Rendered ${type} sprite without error`);
  } catch (e) {
    assert(false, `Rendered ${type} threw error: ${e.message}`);
  }
});

// -------------------------------------------------------------
// 3. Audit R3: Input Raycasting, Sitting Paw Filter & Annulus Exit Lock
// -------------------------------------------------------------
console.log('Testing R3: Defense Shield, Raycasting & Exit Lock...');

// Raycast hit detection with +42px tolerance
const hit = checkRaycastHit(100, 100, 200, 200, 150, 150, 32, PAW_PAD_TOLERANCE);
assert(hit === true, 'Raycast along segment must hit circle within tolerance');

const farHit = checkRaycastHit(100, 100, 200, 200, 500, 500, 32, PAW_PAD_TOLERANCE);
assert(farHit === false, 'Raycast far from segment must NOT hit');

// Sitting Paw Filter: <12px movement over 400ms marks paw as resting
const filter = new SittingPawFilter();
filter.touchDown(1, 300, 300, 1000);
filter.touchMove(1, 305, 305, 1200); // 200ms, moved 7px
assert(!filter.isResting(1), 'Touch at 200ms must not yet be resting');

filter.touchMove(1, 306, 306, 1450); // 450ms, moved 8.4px (<12px)
assert(filter.isResting(1) === true, 'Stationary touch (>400ms, <12px) must be marked resting');

// Wake up with dynamic swat (>12px)
filter.touchMove(1, 350, 350, 1500); // moved 50px
assert(filter.isResting(1) === false, 'Dynamic move must wake up resting paw');

// Defense Shield & Annulus Exit Lock
const defense = new DefenseShield();
assert(EXIT_LOCK_DURATION_MS === 8000, 'EXIT_LOCK_DURATION_MS must be exactly 8000ms');

let exitCalled = false;
defense.onExitComplete = () => { exitCalled = true; };

defense.startExitHold(10000);
defense.updateExitHold(14000); // 4000ms elapsed = 50%
assert(Math.abs(defense.getExitProgress() - 0.5) < 0.01, 'Exit progress at 4s must be 50%');

// Early release at 7.9s (7900ms)
defense.updateExitHold(17900);
assert(defense.getExitProgress() > 0.98, 'Exit progress at 7.9s must be ~98.7%');
defense.cancelExitHold();
assert(defense.getExitProgress() === 0.0, 'Early release must immediately reset progress to 0.0');
assert(exitCalled === false, 'Early release must not trigger session completion');

// Full 8s hold
defense.startExitHold(20000);
defense.updateExitHold(28000); // exactly 8000ms
assert(exitCalled === true, 'Completing 8.0s hold must call onExitComplete');

// beforeunload guard
defense.enableBeforeUnload(() => true);
const unloadPrompt = defense.handleBeforeUnload({});
assert(typeof unloadPrompt === 'string' && unloadPrompt.length > 0, 'beforeunload must return confirmation prompt while playing');

// -------------------------------------------------------------
// 4. Audit R4: Procedural Web Audio API Synthesizer & Lures
// -------------------------------------------------------------
console.log('Testing R4: Procedural Web Audio...');

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'suspended';
    this.destination = {};
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
}

const mockAudioCtx = new MockAudioContext();
const audio = new SoundSynthesizer(mockAudioCtx);

// Test audio unlock
await audio.unlock();
assert(mockAudioCtx.state === 'running', 'AudioContext must resume to running upon unlock()');

// Test prey catch sound generation
['mouse', 'bug', 'koi', 'bee', 'laser'].forEach(p => {
  audio.playPreyCatch(p);
  assert(audio.lastCatchPlayed === p, `playPreyCatch played sound for ${p}`);
});

// Test 12s idle acoustic lure
audio.triggerAcousticLure();
assert(audio.wasLureTriggeredRecently() === true, 'triggerAcousticLure must record trigger');

// Test treat chime
audio.playTreatChime();
assert(audio.chimePlayed === true, 'playTreatChime must record chimePlayed');

// -------------------------------------------------------------
// 5. Audit R5: State Management & UI Onboarding Carousel
// -------------------------------------------------------------
console.log('Testing R5: State & UI Onboarding...');

const mockStorage = new Map();
const storageShim = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k)
};

const state = new AppState(storageShim);
assert(state.isOnboarded() === false, 'Initial state must be un-onboarded');
assert(state.get('prey') === DEFAULT_SETTINGS.prey, 'Default prey matches');

state.update({ prey: 'bee', speed: 'ludicrous' });
assert(state.get('prey') === 'bee', 'State update prey to bee');
assert(state.get('speed') === 'ludicrous', 'State update speed to ludicrous');

const ui = new UIController(state, {});
assert(ONBOARDING_STEPS.length === 5, 'Must have exactly 5 onboarding carousel steps');
assert(ui.currentSlide === 0, 'Onboarding starts at slide 0');

ui.nextSlide();
assert(ui.currentSlide === 1, 'nextSlide moves to slide 1');
ui.prevSlide();
assert(ui.currentSlide === 0, 'prevSlide moves back to slide 0');

ui.finishOnboarding();
assert(state.isOnboarded() === true, 'finishOnboarding marks state as onboarded');
assert(storageShim.getItem('pawplay_onboarded_v1') === 'true', 'pawplay_onboarded_v1 persisted in storage');

// Session Timer (1m, 3m, 5m, unlimited)
ui.startSession('1m');
assert(ui.remainingSeconds === 60, '1m session initializes 60 seconds');
const expired = ui.tickSession(60);
assert(expired === true && ui.remainingSeconds === 0, 'Session expires after 60s');

ui.startSession('unlimited');
assert(ui.sessionDurationMinutes === 0, 'unlimited mode duration is 0');

// -------------------------------------------------------------
// 6. Audit R6: Pounce-Cam Reaction Engine
// -------------------------------------------------------------
console.log('Testing R6: Pounce-Cam & Storage...');

const cam = new PounceCam(null); // in-memory fallback
cam.setTriggerMode('catch');
cam.isEnabled = true;

const photo = await cam.captureSnapshot('catch');
assert(photo !== null, 'Snapshot captured');
assert(photo.badge === 'PAWPLAY_RETRO_CAM', 'Snapshot includes retro badge');
assert(typeof photo.timestamp === 'string', 'Snapshot includes ISO timestamp');

const photos = await cam.getPhotos();
assert(photos.length === 1, 'Photos array has 1 item');

const deleted = await cam.deletePhoto(photo.id);
assert(deleted === true, 'Photo deletion succeeded');

const afterDelete = await cam.getPhotos();
assert(afterDelete.length === 0, 'Photos array empty after deletion');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n============================================================');
console.log(`Direct Audit Result: Passed: ${passed}, Failed: ${failed}`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
