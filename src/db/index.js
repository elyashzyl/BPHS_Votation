import { supabase, sbInitialized } from '../supabase.js'

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
  syncStatus: 'unknown', /* 'cloud' | 'local' | 'error' */
  syncError: '',

  async open() {
    if (this.ready) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      if (sbInitialized && supabase) {
        this.ready = true
      } else {
        console.warn('Supabase not configured, using local storage fallback.')
      }
      /* Always initialize IndexedDB as fallback */
      await this._openIDB()
    })()

    return this.initPromise
  },

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
    let result = null

    /* Try Supabase first */
    if (this.ready && supabase) {
      try {
        const { data, error } = await supabase.from('elections').select('data').eq('year', year).maybeSingle()
        if (!error) { result = data ? data.data : null; this.syncStatus = 'cloud'; this.syncError = '' }
        else { this.syncStatus = 'error'; this.syncError = error.message }
      } catch (e) {
        this.syncStatus = 'error'; this.syncError = e.message || String(e)
      }
    }

    /* Fallback: IndexedDB (if Supabase returned nothing or failed) */
    if (!result && this._idbReady) {
      try {
        result = await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readonly')
          const r = tx.objectStore(STORE_NAME).get(year)
          r.onsuccess = () => resolve(r.result || null)
          r.onerror = e => reject(e.target.error)
        })
      } catch {}
    }

    /* Last fallback: localStorage */
    if (!result && this._fallback) {
      try {
        const raw = localStorage.getItem(lsKey(year))
        result = raw ? JSON.parse(raw) : null
      } catch {}
    }

    return result
  },

  async save(year, data) {
    const payload = clone(data)
    let saved = false

    /* Try Supabase first */
    if (this.ready && supabase) {
      try {
        const { error } = await supabase.from('elections').upsert(
          { year, data: payload }
        )
        if (!error) { saved = true; this.syncStatus = 'cloud'; this.syncError = '' }
        else { this.syncStatus = 'error'; this.syncError = error.message }
      } catch (e) {
        this.syncStatus = 'error'; this.syncError = e.message || String(e)
        console.warn('Supabase save failed.', e)
      }
    }

    /* Always save to IndexedDB as local cache */
    if (this._idbReady) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).put({ ...payload, year, updatedAt: new Date().toISOString() })
          tx.oncomplete = () => resolve()
          tx.onerror = e => reject(e.target.error)
        })
        saved = true
      } catch {}
    }

    /* Last fallback: localStorage */
    if (!saved && this._fallback) {
      try {
        localStorage.setItem(lsKey(year), JSON.stringify(payload))
      } catch (e) { console.error('localStorage save failed:', e) }
    }
  },

  async testConnection() {
    if (!this.ready || !supabase) return { ok: false, error: 'Supabase not configured' }
    try {
      /* Check table structure */
      const { error: selErr } = await supabase.from('elections').select('year', { count: 'exact', head: true })
      if (selErr) return { ok: false, error: 'SELECT: ' + selErr.message }
      /* Try a write */
      const testPayload = { year: '_test_', data: { test: true } }
      const { error: upsertErr } = await supabase.from('elections').upsert(testPayload)
      if (upsertErr) return { ok: false, error: 'UPSERT: ' + upsertErr.message }
      /* Clean up test row */
      await supabase.from('elections').delete().eq('year', '_test_')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message || String(e) }
    }
  },

  async list() {
    let years = []

    /* Try Supabase first */
    if (this.ready && supabase) {
      try {
        const { data, error } = await supabase.from('elections').select('year').order('year', { ascending: true })
        if (!error) years = (data || []).map(d => d.year)
      } catch (e) {
        console.warn('Supabase list failed.', e)
      }
    }

    /* Fallback: IndexedDB */
    if (!years.length && this._idbReady) {
      try {
        years = await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readonly')
          const r = tx.objectStore(STORE_NAME).getAllKeys()
          r.onsuccess = () => resolve(r.result.map(String))
          r.onerror = e => reject(e.target.error)
        })
      } catch {}
    }

    /* Last fallback: localStorage */
    if (!years.length && this._fallback) {
      try {
        years = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX)).map(k => k.slice(LS_PREFIX.length))
      } catch {}
    }

    return years.sort()
  },

  async remove(year) {
    let removed = false

    /* Try Supabase first */
    if (this.ready && supabase) {
      try {
        const { error } = await supabase.from('elections').delete().eq('year', year)
        if (!error) removed = true
      } catch (e) {
        console.warn('Supabase remove failed.', e)
      }
    }

    /* Also remove from IndexedDB */
    if (this._idbReady) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).delete(year)
          tx.oncomplete = () => resolve()
          tx.onerror = e => reject(e.target.error)
        })
        removed = true
      } catch {}
    }

    /* Also remove from localStorage */
    if (this._fallback) {
      try { localStorage.removeItem(lsKey(year)); removed = true } catch {}
    }
  }
}
