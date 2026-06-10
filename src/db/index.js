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

  async open() {
    if (this.ready) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      if (sbInitialized && supabase) {
        this.ready = true
        return
      }
      console.warn('Supabase not configured, using local storage fallback.')
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
    /* Supabase */
    if (this.ready && supabase) {
      try {
        const { data, error } = await supabase.from('elections').select('data').eq('year', year).maybeSingle()
        if (error) throw error
        if (data) return data.data
      } catch (e) {
        console.warn('Supabase get failed, falling back.', e)
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

    /* Supabase */
    if (this.ready && supabase) {
      try {
        const { error } = await supabase.from('elections').upsert(
          { year, data: payload, updated_at: new Date().toISOString() },
          { onConflict: 'year' }
        )
        if (error) throw error
        return
      } catch (e) {
        console.warn('Supabase save failed, falling back.', e)
      }
    }

    /* Fallback: IndexedDB */
    if (this._idbReady) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).put({ ...payload, year, updatedAt: new Date().toISOString() })
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
    /* Supabase */
    if (this.ready && supabase) {
      try {
        const { data, error } = await supabase.from('elections').select('year').order('year', { ascending: true })
        if (error) throw error
        return (data || []).map(d => d.year).sort()
      } catch (e) {
        console.warn('Supabase list failed, falling back.', e)
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
    /* Supabase */
    if (this.ready && supabase) {
      try {
        const { error } = await supabase.from('elections').delete().eq('year', year)
        if (error) throw error
        return
      } catch (e) {
        console.warn('Supabase remove failed, falling back.', e)
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
