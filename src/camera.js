/**
 * PawPlay "Pounce-Cam" Reaction Snapshot Engine & IndexedDB Photo Vault
 *
 * Implements:
 * - Device front-facing camera access via getUserMedia({ video: { facingMode: 'user' } })
 * - Human permission toggle and configurable triggers:
 *   * 'catch': Snapshot upon successful prey swat
 *   * 'near-miss': Snapshot when swat passes close to prey
 *   * 'all': Snapshot on every pounce
 *   * 'disabled': Camera off
 * - Offscreen watermark rendering with retro timestamp and "PawPlay Catch!" badge
 * - Client-side IndexedDB database ('pawplay_photos_v1') preventing localStorage quota limits
 * - Resilient fallback to in-memory transient photo vault on quota or sandbox errors
 * - Human photo gallery inspection and deletion
 */

export const DB_NAME = 'pawplay_photos_v1';
export const DB_VERSION = 1;
export const STORE_NAME = 'photos';

export class PounceCam {
  /**
   * @param {IDBFactory} [idbFactory] - Defaults to global indexedDB
   */
  constructor(idbFactory) {
    this.idb = idbFactory !== undefined ? idbFactory : (typeof indexedDB !== 'undefined' ? indexedDB : null);
    this.stream = null;
    this.videoElement = null;
    this.isEnabled = false;
    this.triggerMode = 'catch'; // 'catch', 'near-miss', 'all', 'disabled'
    this.transientPhotos = [];
    this.simulatedError = null; // For adversarial/unit test mocking
  }

  /**
   * Initializes front camera stream and creates offscreen video element.
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this.simulatedError) {
      this.isEnabled = false;
      throw this.simulatedError;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });

        if (typeof document !== 'undefined') {
          if (!this.videoElement) {
            this.videoElement = document.createElement('video');
            this.videoElement.setAttribute('autoplay', '');
            this.videoElement.setAttribute('muted', '');
            this.videoElement.setAttribute('playsinline', '');
            this.videoElement.style.display = 'none';
          }
          this.videoElement.srcObject = this.stream;
          if (typeof this.videoElement.play === 'function') {
            await this.videoElement.play().catch(() => {});
          }
        }
        this.isEnabled = true;
        return true;
      }
      this.isEnabled = false;
      return false;
    } catch (err) {
      this.isEnabled = false;
      throw err;
    }
  }

  /**
   * Updates trigger mode.
   * @param {string} mode - 'catch' | 'near-miss' | 'all' | 'disabled'
   */
  setTriggerMode(mode) {
    this.triggerMode = mode;
    if (mode === 'disabled') {
      this.isEnabled = false;
      this.stop();
    }
  }

  /**
   * Halts camera stream and releases hardware.
   */
  stop() {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Captures snapshot frame with retro watermark and persists to IndexedDB.
   * @param {string} [trigger='catch'] - 'catch' | 'near-miss' | 'pounce'
   * @returns {Promise<object|null>}
   */
  async captureSnapshot(trigger = 'catch') {
    if (!this.isEnabled || this.triggerMode === 'disabled') {
      return null;
    }

    // Filter by configured trigger policy
    if (this.triggerMode === 'catch' && trigger !== 'catch') return null;
    if (this.triggerMode === 'near-miss' && trigger !== 'near-miss') return null;

    let dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Capture from offscreen video element if available
    if (this.videoElement && this.videoElement.videoWidth > 0 && typeof document !== 'undefined') {
      try {
        const offCanvas = document.createElement('canvas');
        const w = this.videoElement.videoWidth || 640;
        const h = this.videoElement.videoHeight || 480;
        offCanvas.width = w;
        offCanvas.height = h;
        const offCtx = offCanvas.getContext('2d');

        // Draw camera frame mirrored (front camera selfie standard)
        offCtx.save();
        offCtx.translate(w, 0);
        offCtx.scale(-1, 1);
        offCtx.drawImage(this.videoElement, 0, 0, w, h);
        offCtx.restore();

        // Apply Retro Watermark Overlay
        this._applyWatermark(offCtx, w, h, trigger);
        dataUrl = offCanvas.toDataURL('image/jpeg', 0.82);
      } catch (e) {}
    }

    const photoRecord = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      badge: 'PAWPLAY_RETRO_CAM',
      trigger,
      dataUrl
    };

    // Store to IndexedDB with automatic transient array fallback
    try {
      if (this.idb) {
        await this._storeToDb(photoRecord);
      } else {
        this.transientPhotos.push(photoRecord);
      }
    } catch (err) {
      // QuotaExceededError or private browsing IDB blockage
      this.transientPhotos.push(photoRecord);
    }

    return photoRecord;
  }

  /**
   * Renders retro digital timestamp and PawPlay Catch badge onto offscreen canvas.
   * @private
   */
  _applyWatermark(ctx, w, h, trigger) {
    ctx.save();

    // Semi-transparent bottom badge bar
    ctx.fillStyle = 'rgba(16, 18, 26, 0.75)';
    ctx.fillRect(0, h - 42, w, 42);

    // Retro Digital Timestamp (orange phosphor CRT aesthetic)
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    ctx.fillStyle = '#FFB703';
    ctx.font = 'bold 16px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🕒 ${timeStr}`, 16, h - 21);

    // PawPlay Badge & Trigger tag
    const tag = trigger === 'near-miss' ? '🐾 NEAR MISS!' : '🐾 PAWPLAY CATCH!';
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(tag, w - 16, h - 21);

    ctx.restore();
  }

  _storeToDb(record) {
    return new Promise((resolve, reject) => {
      try {
        const req = this.idb.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (db && typeof db.createObjectStore === 'function') {
            const hasStore = db.objectStoreNames && (
              typeof db.objectStoreNames.contains === 'function'
                ? db.objectStoreNames.contains(STORE_NAME)
                : (Array.isArray(db.objectStoreNames) && db.objectStoreNames.includes(STORE_NAME))
            );
            if (!hasStore) {
              try { db.createObjectStore(STORE_NAME, { keyPath: 'id' }); } catch (err) {}
            }
          }
        };
        req.onsuccess = (e) => {
          try {
            const db = e.target.result;
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const addReq = store.add(record);
            addReq.onsuccess = () => resolve(record);
            addReq.onerror = (err) => reject(addReq.error || err);
          } catch (txErr) {
            reject(txErr);
          }
        };
        req.onerror = (e) => reject(req.error || e);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Retrieves all photos from IndexedDB combined with transient in-memory vault.
   * @returns {Promise<Array>}
   */
  async getPhotos() {
    if (!this.idb) {
      return [...this.transientPhotos];
    }

    return new Promise((resolve) => {
      try {
        const req = this.idb.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (db && typeof db.createObjectStore === 'function') {
            const hasStore = db.objectStoreNames && (
              typeof db.objectStoreNames.contains === 'function'
                ? db.objectStoreNames.contains(STORE_NAME)
                : (Array.isArray(db.objectStoreNames) && db.objectStoreNames.includes(STORE_NAME))
            );
            if (!hasStore) {
              try { db.createObjectStore(STORE_NAME, { keyPath: 'id' }); } catch (err) {}
            }
          }
        };
        req.onsuccess = (e) => {
          try {
            const db = e.target.result;
            const tx = db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.getAll();
            getReq.onsuccess = () => {
              const dbPhotos = getReq.result || [];
              resolve([...dbPhotos, ...this.transientPhotos]);
            };
            getReq.onerror = () => resolve([...this.transientPhotos]);
          } catch (err) {
            resolve([...this.transientPhotos]);
          }
        };
        req.onerror = () => resolve([...this.transientPhotos]);
      } catch (err) {
        resolve([...this.transientPhotos]);
      }
    });
  }

  /**
   * Deletes a photo by ID from both IndexedDB and transient storage.
   * @param {number|string} id
   * @returns {Promise<boolean>}
   */
  async deletePhoto(id) {
    this.transientPhotos = this.transientPhotos.filter(p => p.id !== id);

    if (!this.idb) {
      return true;
    }

    return new Promise((resolve) => {
      try {
        const req = this.idb.open(DB_NAME, DB_VERSION);
        req.onsuccess = (e) => {
          try {
            const db = e.target.result;
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const delReq = store.delete(id);
            delReq.onsuccess = () => resolve(true);
            delReq.onerror = () => resolve(false);
          } catch (err) {
            resolve(false);
          }
        };
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  }
}

export default PounceCam;

// -------------------------------------------------------------
// Universal Global & Module Exports
// -------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  globalThis.PawPlayCamera = PounceCam;
}
if (typeof window !== 'undefined') {
  window.PawPlayCamera = PounceCam;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PounceCam,
    DB_NAME,
    DB_VERSION,
    STORE_NAME
  };
}
