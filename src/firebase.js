import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

let config
try {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG
  config = raw ? JSON.parse(raw) : null
} catch {
  config = null
}

const app = config ? initializeApp(config) : null
export const db = app ? getFirestore(app) : null
export const auth = app ? getAuth(app) : null
export const fbInitialized = !!app
