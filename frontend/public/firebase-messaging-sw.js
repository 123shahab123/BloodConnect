// firebase-messaging-sw.js
//
// This service worker handles BACKGROUND push notifications (i.e. when the
// BloodConnect tab is closed or not focused). Foreground messages (app open
// and focused) are handled separately in src/hooks/usePushNotifications.ts
// via onMessage(), which shows an in-app toast instead.
//
// Firebase config is passed as URL query params when this worker is
// registered (see usePushNotifications.ts) rather than hardcoded here,
// because files under /public are served as-is and don't go through Vite's
// import.meta.env replacement. These values are public Firebase Web App
// identifiers, not secrets, so passing them this way is safe.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

const params = new URLSearchParams(self.location.search)

const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
}

// Only initialize if we actually received config — avoids a noisy console
// error if this file is ever fetched directly without query params.
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const title = payload.data?.title || 'BloodConnect'
    const body = payload.data?.body || ''
    const requestId = payload.data?.request_id

    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir: 'auto',
      data: { url: requestId ? `/donate/${requestId}` : '/home' },
      tag: payload.data?.type || 'bloodconnect-notification',
    })
  })
}

// Clicking the notification focuses an existing tab or opens a new one,
// navigating to the relevant request.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/home'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
