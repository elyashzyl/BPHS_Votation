import { doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { db, auth, fbInitialized } from '../firebase.js'

/* ------------------------------------------------------------------ */
/*  Firestore-backed persistence layer                                 */
/* ------------------------------------------------------------------ */

const DB_NAME = 'SBO_Votation';
const STORE_NAME = 'elections';
const LS_PREFIX = 'sbo_';

function lsKey(year) { return LS_PREFIX + year }

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export const DB = {
  ready: false,
  initPromise: null,

  async open() {
    if (this.ready) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      if (fbInitialized && db && auth) {
        try {
          await signInAnonymously(auth)
          this.ready = true
          return
        } catch (e) {
          console.warn('Firebase auth failed, falling back to IndexedDB.', e)
        }
      } else {
        console.warn('Firebase not configured, falling back to IndexedDB.')
      }
      await this._openIDB()
    })()

    return this.initPromise
  },

  /* IndexedDB fallback open */
  async _openIDB() {
    try {
      this._idb = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = e => {
          const d = e.target.result
          if (!d.objectStoreNames.contains(STORE_NAME))
            d.createObjectStore(STORE_NAME, { keyPath: 'year' })
        }
        req.onsuccess = e => resolve(e.target.result)
        req.onerror = e => reject(e.target.error)
      })
      this._idbReady = true
      this._fallback = false
    } catch (e) {
      console.warn('IndexedDB unavailable, using localStorage fallback.', e)
      this._fallback = true
    }
  },

  async get(year) {
    /* Try Firestore first */
    if (this.ready && db) {
      try {
        const snap = await getDoc(doc(db, STORE_NAME, year))
        if (snap.exists()) return snap.data()
      } catch (e) {
        console.warn('Firestore get failed, falling back.', e)
      }
    }

    /* Fallback: IndexedDB */
    if (this._idbReady) {
      try {
        return await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readonly')
          const r = tx.objectStore(STORE_NAME).get(year)
          r.onsuccess = () => resolve(r.result || null)
          r.onerror = e => reject(e.target.error)
        })
      } catch {}
    }

    /* Last fallback: localStorage */
    if (this._fallback) {
      try {
        const raw = localStorage.getItem(lsKey(year))
        return raw ? JSON.parse(raw) : null
      } catch {}
    }
    return null
  },

  async save(year, data) {
    const payload = clone(data)
    payload.year = year

    /* Firestore */
    if (this.ready && db) {
      try {
        await setDoc(doc(db, STORE_NAME, year), payload)
        return
      } catch (e) {
        console.warn('Firestore save failed, falling back.', e)
      }
    }

    /* Fallback: IndexedDB */
    if (this._idbReady) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).put({ ...payload, updatedAt: new Date().toISOString() })
          tx.oncomplete = () => resolve()
          tx.onerror = e => reject(e.target.error)
        })
        return
      } catch {}
    }

    /* Last fallback: localStorage */
    if (this._fallback) {
      try {
        localStorage.setItem(lsKey(year), JSON.stringify(payload))
      } catch (e) { console.error('localStorage save failed:', e) }
    }
  },

  async list() {
    /* Firestore */
    if (this.ready && db) {
      try {
        const snap = await getDocs(collection(db, STORE_NAME))
        return snap.docs.map(d => d.id).sort()
      } catch (e) {
        console.warn('Firestore list failed, falling back.', e)
      }
    }

    /* Fallback: IndexedDB */
    if (this._idbReady) {
      try {
        return await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readonly')
          const r = tx.objectStore(STORE_NAME).getAllKeys()
          r.onsuccess = () => resolve(r.result.map(String).sort())
          r.onerror = e => reject(e.target.error)
        })
      } catch {}
    }

    /* Last fallback: localStorage */
    if (this._fallback) {
      try {
        return Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX)).map(k => k.slice(LS_PREFIX.length)).sort()
      } catch {}
    }
    return []
  },

  async remove(year) {
    /* Firestore */
    if (this.ready && db) {
      try {
        await deleteDoc(doc(db, STORE_NAME, year))
        return
      } catch (e) {
        console.warn('Firestore remove failed, falling back.', e)
      }
    }

    /* Fallback: IndexedDB */
    if (this._idbReady) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).delete(year)
          tx.oncomplete = () => resolve()
          tx.onerror = e => reject(e.target.error)
        })
        return
      } catch {}
    }

    /* Last fallback: localStorage */
    if (this._fallback) {
      try { localStorage.removeItem(lsKey(year)) } catch {}
    }
  }
}
