/**
 * PawPlay Headless Environment Polyfill & Hardware Mocks
 * Sets up synthetic DOM, Web Audio, MediaDevices, WakeLock, and IndexedDB for Node.js / Headless tests.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PawPlayEnvironmentMock = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class MockAudioNode {
    constructor(context) {
      this.context = context;
      this.connections = [];
    }
    connect(dest) {
      this.connections.push(dest);
      return dest;
    }
    disconnect() {
      this.connections = [];
    }
  }

  class MockAudioParam {
    constructor(defaultValue = 1) {
      this.value = defaultValue;
      this.events = [];
    }
    setValueAtTime(val, time) {
      this.value = val;
      this.events.push({ type: 'setValueAtTime', val, time });
    }
    linearRampToValueAtTime(val, time) {
      this.value = val;
      this.events.push({ type: 'linearRampToValueAtTime', val, time });
    }
    exponentialRampToValueAtTime(val, time) {
      this.value = val;
      this.events.push({ type: 'exponentialRampToValueAtTime', val, time });
    }
  }

  class MockGainNode extends MockAudioNode {
    constructor(context) {
      super(context);
      this.gain = new MockAudioParam(1);
    }
  }

  class MockOscillatorNode extends MockAudioNode {
    constructor(context) {
      super(context);
      this.type = 'sine';
      this.frequency = new MockAudioParam(440);
      this.started = false;
      this.stopped = false;
    }
    start(time = 0) {
      this.started = true;
    }
    stop(time = 0) {
      this.stopped = true;
    }
  }

  class MockBiquadFilterNode extends MockAudioNode {
    constructor(context) {
      super(context);
      this.type = 'lowpass';
      this.frequency = new MockAudioParam(350);
      this.Q = new MockAudioParam(1);
    }
  }

  class MockAudioContext {
    constructor() {
      this.state = 'suspended';
      this.destination = new MockAudioNode(this);
      this.currentTime = 0;
      this.createdNodes = [];
    }

    async resume() {
      this.state = 'running';
      return Promise.resolve();
    }

    async suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    }

    async close() {
      this.state = 'closed';
      return Promise.resolve();
    }

    createGain() {
      const node = new MockGainNode(this);
      this.createdNodes.push(node);
      return node;
    }

    createOscillator() {
      const node = new MockOscillatorNode(this);
      this.createdNodes.push(node);
      return node;
    }

    createBiquadFilter() {
      const node = new MockBiquadFilterNode(this);
      this.createdNodes.push(node);
      return node;
    }

    createBufferSource() {
      const node = new MockOscillatorNode(this);
      this.createdNodes.push(node);
      return node;
    }
  }

  class MockLocalStorage {
    constructor() {
      this.store = new Map();
    }
    getItem(key) {
      return this.store.has(key) ? this.store.get(key) : null;
    }
    setItem(key, value) {
      this.store.set(key, String(value));
    }
    removeItem(key) {
      this.store.delete(key);
    }
    clear() {
      this.store.clear();
    }
    get length() {
      return this.store.size;
    }
  }

  class MockIDBRequest {
    constructor() {
      this.result = null;
      this.error = null;
      this.onsuccess = null;
      this.onerror = null;
      this.onupgradeneeded = null;
    }
    _triggerSuccess(result) {
      this.result = result;
      if (this.onsuccess) this.onsuccess({ target: this });
    }
    _triggerError(err) {
      this.error = err;
      if (this.onerror) this.onerror({ target: this });
    }
  }

  class MockIndexedDB {
    constructor() {
      this.databases = new Map();
      this.simulateQuotaError = false;
    }

    open(dbName, version = 1) {
      const req = new MockIDBRequest();
      setTimeout(() => {
        if (!this.databases.has(dbName)) {
          const dbInstance = {
            name: dbName,
            version,
            objectStoreNames: ['photos'],
            stores: new Map(),
            createObjectStore(name, opts) {
              const storeData = new Map();
              this.stores.set(name, storeData);
              return {
                createIndex() {},
                name
              };
            },
            transaction: (storeNames, mode) => {
              return {
                objectStore: (storeName) => {
                  let store = dbInstance.stores.get(storeName);
                  if (!store) {
                    store = new Map();
                    dbInstance.stores.set(storeName, store);
                  }
                  return {
                    add: (item) => {
                      const addReq = new MockIDBRequest();
                      setTimeout(() => {
                        if (this.simulateQuotaError) {
                          const err = new Error('The quota has been exceeded.');
                          err.name = 'QuotaExceededError';
                          addReq._triggerError(err);
                          return;
                        }
                        const id = item.id || Date.now() + Math.random();
                        store.set(id, { ...item, id });
                        addReq._triggerSuccess(id);
                      }, 0);
                      return addReq;
                    },
                    getAll: () => {
                      const getReq = new MockIDBRequest();
                      setTimeout(() => {
                        getReq._triggerSuccess(Array.from(store.values()));
                      }, 0);
                      return getReq;
                    },
                    delete: (id) => {
                      const delReq = new MockIDBRequest();
                      setTimeout(() => {
                        store.delete(id);
                        delReq._triggerSuccess(true);
                      }, 0);
                      return delReq;
                    }
                  };
                }
              };
            }
          };
          this.databases.set(dbName, dbInstance);
          if (req.onupgradeneeded) {
            req.result = dbInstance;
            req.onupgradeneeded({ target: req });
          }
        }
        req._triggerSuccess(this.databases.get(dbName));
      }, 0);
      return req;
    }
  }

  class MockCanvasContext2D {
    constructor(canvas) {
      this.canvas = canvas;
      this.fillStyle = '#000000';
      this.strokeStyle = '#000000';
      this.lineWidth = 1;
      this.globalAlpha = 1.0;
      this.commands = [];
    }
    clearRect(x, y, w, h) { this.commands.push(['clearRect', x, y, w, h]); }
    fillRect(x, y, w, h) { this.commands.push(['fillRect', x, y, w, h]); }
    beginPath() { this.commands.push(['beginPath']); }
    arc(x, y, r, sa, ea) { this.commands.push(['arc', x, y, r, sa, ea]); }
    fill() { this.commands.push(['fill']); }
    stroke() { this.commands.push(['stroke']); }
    save() { this.commands.push(['save']); }
    restore() { this.commands.push(['restore']); }
    translate(x, y) { this.commands.push(['translate', x, y]); }
    rotate(a) { this.commands.push(['rotate', a]); }
    scale(x, y) { this.commands.push(['scale', x, y]); }
    moveTo(x, y) { this.commands.push(['moveTo', x, y]); }
    lineTo(x, y) { this.commands.push(['lineTo', x, y]); }
    closePath() { this.commands.push(['closePath']); }
    drawImage() { this.commands.push(['drawImage']); }
    fillText(text, x, y) { this.commands.push(['fillText', text, x, y]); }
  }

  class MockHTMLElement {
    constructor(tagName = 'div', id = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this.className = '';
      this.style = {};
      this.children = [];
      this.listeners = new Map();
      this.attributes = new Map();
      this.width = 1024;
      this.height = 768;
      this.clientWidth = 1024;
      this.clientHeight = 768;
    }

    addEventListener(event, fn) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event).push(fn);
    }

    removeEventListener(event, fn) {
      if (!this.listeners.has(event)) return;
      const list = this.listeners.get(event).filter(f => f !== fn);
      this.listeners.set(event, list);
    }

    dispatchEvent(evt) {
      const list = this.listeners.get(evt.type) || [];
      for (const fn of list) {
        fn.call(this, evt);
      }
      return !evt.defaultPrevented;
    }

    click() {
      this.dispatchEvent({ type: 'click', target: this, defaultPrevented: false });
    }

    setAttribute(key, val) {
      this.attributes.set(key, String(val));
    }

    getAttribute(key) {
      return this.attributes.has(key) ? this.attributes.get(key) : null;
    }

    getContext(type) {
      if (type === '2d') {
        if (!this._ctx2d) this._ctx2d = new MockCanvasContext2D(this);
        return this._ctx2d;
      }
      return null;
    }

    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        right: this.clientWidth,
        bottom: this.clientHeight,
        width: this.clientWidth,
        height: this.clientHeight,
        x: 0,
        y: 0
      };
    }
  }

  class MockDocument {
    constructor() {
      this.elements = new Map();
      this.listeners = new Map();
      this.visibilityState = 'visible';
      this.hidden = false;
      this.body = this.createElement('body');
    }

    createElement(tagName) {
      return new MockHTMLElement(tagName);
    }

    getElementById(id) {
      return this.elements.get(id) || null;
    }

    querySelectorAll(selector) {
      return Array.from(this.elements.values()).filter(el => {
        if (selector.startsWith('.')) {
          return el.className.includes(selector.slice(1));
        }
        return el.tagName.toLowerCase() === selector.toLowerCase();
      });
    }

    querySelector(selector) {
      const all = this.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    }

    registerElement(element) {
      if (element.id) {
        this.elements.set(element.id, element);
      }
      return element;
    }

    addEventListener(event, fn) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event).push(fn);
    }

    dispatchEvent(evt) {
      const list = this.listeners.get(evt.type) || [];
      for (const fn of list) fn.call(this, evt);
      return !evt.defaultPrevented;
    }
  }

  function setupMockEnvironment(target = typeof globalThis !== 'undefined' ? globalThis : window) {
    const doc = new MockDocument();
    const storage = new MockLocalStorage();
    const idb = new MockIndexedDB();

    target.document = doc;
    target.window = target;
    target.localStorage = storage;
    target.indexedDB = idb;
    target.devicePixelRatio = 2.0;
    target.innerWidth = 1024;
    target.innerHeight = 768;

    if (!target.AudioContext && !target.webkitAudioContext) {
      target.AudioContext = MockAudioContext;
      target.webkitAudioContext = MockAudioContext;
    }

    if (!target.navigator) target.navigator = {};
    target.navigator.mediaDevices = {
      getUserMedia: async (constraints) => {
        return {
          getVideoTracks: () => [{
            stop() {},
            getSettings: () => ({ facingMode: 'user', width: 640, height: 480 })
          }]
        };
      }
    };
    target.navigator.wakeLock = {
      request: async () => ({
        release: async () => {},
        released: false
      })
    };

    // Pre-create UI elements expected by PawPlay
    const canvas = doc.registerElement(new MockHTMLElement('canvas', 'gameCanvas'));
    canvas.width = 1024;
    canvas.height = 768;

    doc.registerElement(new MockHTMLElement('div', 'menuOverlay'));
    doc.registerElement(new MockHTMLElement('div', 'onboardingModal'));
    doc.registerElement(new MockHTMLElement('button', 'startBtn'));
    doc.registerElement(new MockHTMLElement('button', 'exitLockBtn'));
    doc.registerElement(new MockHTMLElement('button', 'onboardingNextBtn'));
    doc.registerElement(new MockHTMLElement('button', 'onboardingFinishBtn'));
    doc.registerElement(new MockHTMLElement('div', 'pauseOverlay'));
    doc.registerElement(new MockHTMLElement('div', 'treatModal'));

    // Create 5 slides for onboarding carousel
    for (let i = 0; i < 5; i++) {
      const slide = new MockHTMLElement('div', `onboardingSlide${i}`);
      slide.className = 'onboarding-slide';
      doc.registerElement(slide);
    }

    return {
      document: doc,
      localStorage: storage,
      indexedDB: idb,
      canvas,
      MockAudioContext
    };
  }

  return {
    MockAudioContext,
    MockLocalStorage,
    MockIndexedDB,
    MockHTMLElement,
    MockDocument,
    setupMockEnvironment
  };
});
