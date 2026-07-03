import { supabase, sbInitialized } from '../supabase.js'

const DB_NAME = 'SBO_Votation';
const STORE_NAME = 'elections';
const LS_PREFIX = 'sbo_';
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const API_BASE = 'http://' + host + ':3001/api';

function lsKey(year) { return LS_PREFIX + year }

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

async function _api(method, path, body) {
  const opts = { method, headers: {} }
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  const res = await fetch(API_BASE + path, opts)
  if (!res.ok) throw new Error('API ' + res.status + ' ' + res.statusText)
  return res.json()
}

export const DB = {
  ready: false,
  initPromise: null,
  syncStatus: 'unknown',
  syncError: '',
  _localApi: false,

  async open() {
    if (this.ready) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      try {
        await _api('GET', '/health')
        this._localApi = true
        this.ready = true
      } catch {
        console.warn('Local backend not available, falling back to Supabase.')
        if (sbInitialized && supabase) {
          this.ready = true
        } else {
          console.warn('Supabase not configured either, using local storage fallback.')
        }
      }
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

    if (this._localApi) {
      try {
        const data = await _api('GET', '/elections/' + year)
        if (data) { result = data; this.syncStatus = 'sqlite'; this.syncError = '' }
      } catch (e) {
        this.syncStatus = 'error'; this.syncError = e.message || String(e)
      }
    }

    if (!result && this.ready && supabase) {
      try {
        const { data, error } = await supabase.from('elections').select('data').eq('year', year).maybeSingle()
        if (!error) { result = data ? data.data : null; this.syncStatus = 'cloud'; this.syncError = '' }
        else { this.syncStatus = 'error'; this.syncError = error.message }
      } catch (e) {
        this.syncStatus = 'error'; this.syncError = e.message || String(e)
      }
    }

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

    if (this._localApi) {
      try {
        await _api('PUT', '/elections/' + year, payload)
        saved = true; this.syncStatus = 'sqlite'; this.syncError = ''
      } catch (e) {
        this.syncStatus = 'error'; this.syncError = e.message || String(e)
        console.warn('Local API save failed.', e)
      }
    }

    if (!saved && this.ready && supabase) {
      try {
        const { error } = await supabase.from('elections').upsert({ year, data: payload })
        if (!error) { saved = true; this.syncStatus = 'cloud'; this.syncError = '' }
        else { this.syncStatus = 'error'; this.syncError = error.message }
      } catch (e) {
        this.syncStatus = 'error'; this.syncError = e.message || String(e)
        console.warn('Supabase save failed.', e)
      }
    }

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

    if (!saved && this._fallback) {
      try {
        localStorage.setItem(lsKey(year), JSON.stringify(payload))
      } catch (e) { console.error('localStorage save failed:', e) }
    }
  },

  async testConnection() {
    if (this._localApi) {
      try {
        await _api('PUT', '/elections/_test_', { test: true })
        await _api('DELETE', '/elections/_test_')
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e.message || String(e) }
      }
    }
    if (!this.ready || !supabase) return { ok: false, error: 'No backend available' }
    try {
      const { error: selErr } = await supabase.from('elections').select('year', { count: 'exact', head: true })
      if (selErr) return { ok: false, error: 'SELECT: ' + selErr.message }
      const testPayload = { year: '_test_', data: { test: true } }
      const { error: upsertErr } = await supabase.from('elections').upsert(testPayload)
      if (upsertErr) return { ok: false, error: 'UPSERT: ' + upsertErr.message }
      await supabase.from('elections').delete().eq('year', '_test_')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message || String(e) }
    }
  },

  async list() {
    let years = []

    if (this._localApi) {
      try {
        years = await _api('GET', '/elections')
      } catch (e) {
        console.warn('Local API list failed.', e)
      }
    }

    if (!years.length && this.ready && supabase) {
      try {
        const { data, error } = await supabase.from('elections').select('year').order('year', { ascending: true })
        if (!error) years = (data || []).map(d => d.year)
      } catch (e) {
        console.warn('Supabase list failed.', e)
      }
    }

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

    if (!years.length && this._fallback) {
      try {
        years = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX)).map(k => k.slice(LS_PREFIX.length))
      } catch {}
    }

    return years.sort()
  },

  async remove(year) {
    let removed = false

    if (this._localApi) {
      try {
        await _api('DELETE', '/elections/' + year)
        removed = true
      } catch (e) {
        console.warn('Local API remove failed.', e)
      }
    }

    if (!removed && this.ready && supabase) {
      try {
        const { error } = await supabase.from('elections').delete().eq('year', year)
        if (!error) removed = true
      } catch (e) {
        console.warn('Supabase remove failed.', e)
      }
    }

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

    if (this._fallback) {
      try { localStorage.removeItem(lsKey(year)); removed = true } catch {}
    }
  }
}
