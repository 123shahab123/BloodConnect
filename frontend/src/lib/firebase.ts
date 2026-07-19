import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

/**
 * Firebase Web App config — these are NOT secrets. They identify which
 * Firebase project to talk to and are safe to ship in the client bundle;
 * actual access control happens via Firebase security rules / API key
 * restrictions in the Firebase Console, not by hiding this object.
 *
 * Get these from: Firebase Console → Project Settings → General →
 * "Your apps" → Web app (create one with </> if you don't have one yet).
 *
 * This is DIFFERENT from the backend's service-account JSON
 * (storage/app/firebase-credentials.json) — that one is a secret and
 * must never be exposed client-side.
 */
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

/**
 * VAPID "Web Push certificate" public key, used to authorize this web app
 * to request push subscriptions on behalf of the Firebase project.
 *
 * Get this from: Firebase Console → Project Settings → Cloud Messaging →
 * "Web configuration" → Web Push certificates → Generate key pair.
 */
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? ''

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && vapidKey
)

let app: FirebaseApp | null = null
let messagingPromise: Promise<Messaging | null> | null = null

/**
 * Lazily initializes Firebase + Messaging. Returns null (instead of
 * throwing) if config is missing or the browser doesn't support the
 * Messaging APIs (e.g. Safari without proper service worker support,
 * or any non-HTTPS/non-localhost origin) — callers should treat that
 * as "push notifications unavailable here" and degrade gracefully.
 */
export function getMessagingInstance(): Promise<Messaging | null> {
  if (!isFirebaseConfigured) return Promise.resolve(null)

  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => {
      if (!supported) return null
      if (!app) app = initializeApp(firebaseConfig)
      return getMessaging(app)
    }).catch(() => null)
  }

  return messagingPromise
}
