/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDx0UGfBc-5hC539VVksN011N5DImznzEQ',
  authDomain: 'bazarse-d4963.firebaseapp.com',
  projectId: 'bazarse-d4963',
  storageBucket: 'bazarse-d4963.firebasestorage.app',
  messagingSenderId: '1049973675081',
  appId: '1:1049973675081:web:44a9e65e94c375e0ab5b98',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || 'Doorriing';
  const body = payload?.notification?.body || payload?.data?.body || '';
  const orderId = payload?.data?.orderId || payload?.data?.reference_id || '';

  self.registration.showNotification(title, {
    body,
    data: {
      url: orderId ? `/orders/${orderId}` : '/orders',
    },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
