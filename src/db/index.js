const DB_NAME = 'SBO_Votation';
const STORE_NAME = 'elections';
const LS_PREFIX = 'sbo_';

function lsKey(year) { return LS_PREFIX + year }

/* deep-clone so Vue reactive proxies don't leak into IndexedDB */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export const DB = {
  db: null,
  fallback: false,

  async open() {
    if (this.db) return;
    try {
      this.db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = e => {
          const d = e.target.result;
          if (!d.objectStoreNames.contains(STORE_NAME))
            d.createObjectStore(STORE_NAME, { keyPath: 'year' });
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
      });
    } catch (e) {
      console.warn('IndexedDB unavailable, using localStorage fallback.', e);
      this.fallback = true;
    }
  },

  async get(year) {
    if (this.fallback) {
      try {
        const raw = localStorage.getItem(lsKey(year));
        return raw ? JSON.parse(raw) : null;
      } catch { return null }
    }
    try {
      return await new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, 'readonly');
        const r = tx.objectStore(STORE_NAME).get(year);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = e => reject(e.target.error);
      });
    } catch (e) {
      console.warn('IndexedDB get failed, fallback.', e);
      this.fallback = true;
      return this.get(year);
    }
  },

  async save(year, data) {
    const payload = clone(data)
    payload.year = year
    if (this.fallback) {
      try {
        localStorage.setItem(lsKey(year), JSON.stringify(payload));
        return;
      } catch (e) { console.error('localStorage save failed:', e) }
      return;
    }
    try {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ ...payload, updatedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
      });
    } catch (e) {
      console.warn('IndexedDB save failed, fallback.', e);
      this.fallback = true;
      await this.save(year, data);
    }
  },

  async list() {
    if (this.fallback) {
      try {
        return Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX)).map(k => k.slice(LS_PREFIX.length)).sort();
      } catch { return [] }
    }
    try {
      return await new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, 'readonly');
        const r = tx.objectStore(STORE_NAME).getAllKeys();
        r.onsuccess = () => resolve(r.result.map(String).sort());
        r.onerror = e => reject(e.target.error);
      });
    } catch (e) {
      console.warn('IndexedDB list failed, fallback.', e);
      this.fallback = true;
      return this.list();
    }
  },

  async remove(year) {
    if (this.fallback) {
      try { localStorage.removeItem(lsKey(year)) } catch {}
      return;
    }
    try {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(year);
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
      });
    } catch (e) {
      console.warn('IndexedDB remove failed, fallback.', e);
      this.fallback = true;
      await this.remove(year);
    }
  }
};
