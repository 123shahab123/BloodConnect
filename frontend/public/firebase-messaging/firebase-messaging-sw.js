// firebase-messaging-sw.js
//
// Handles BACKGROUND push notifications (tab closed / not focused).
// Foreground (app open) is handled in usePushNotifications.tsx via onMessage().
//
// Firebase config is passed as URL query params at registration time — these
// are public Web App identifiers, not secrets (see src/lib/firebase.ts).

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

const params = new URLSearchParams(self.location.search)

const firebaseConfig = {
  apiKey:            params.get('apiKey'),
  authDomain:        params.get('authDomain'),
  projectId:         params.get('projectId'),
  storageBucket:     params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId:             params.get('appId'),
}

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const title  = payload.data?.title || 'BloodConnect'
    const body   = payload.data?.body  || ''
    const type   = payload.data?.type  || 'bloodconnect-notification'

    // For new_blood_request: navigate to /donate/:notifId (DonorNotification PK)
    // For donor_accepted:    navigate to /requests/:requestId (requester sees their request)
    // notification_id is the DonorNotification.id — the /donate/:notifId route param.
    const notifId   = payload.data?.notification_id
    const requestId = payload.data?.request_id

    let targetUrl = '/home'
    if (type === 'new_blood_request' && notifId) {
      targetUrl = `/donate/${notifId}`
    } else if ((type === 'donor_accepted' || type === 'donor_found') && requestId) {
      targetUrl = `/requests/${requestId}`
    }

    self.registration.showNotification(title, {
      body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir:   'auto',
      data:  { url: targetUrl },
      tag:   type,
      renotify: true,
    })
  })
}

// Tapping a notification: focus an existing BloodConnect tab or open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/home'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Try to find an existing tab on the same origin
        for (const client of clients) {
          try {
            client.navigate(targetUrl)
            return client.focus()
          } catch (_) { /* cross-origin or restricted */ }
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})

// Offline fallback: serve /offline.html for navigate requests that fail
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    )
  }
})
