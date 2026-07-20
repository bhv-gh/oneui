/* eslint-disable no-restricted-globals */

// Precache + offline app-shell service worker (built by CRA's InjectManifest).
// This is what makes Flow load with no connectivity (e.g. underground): the app
// shell and all JS/CSS chunks are precached, and navigations fall back to the
// cached index.html. It also absorbs the notification-click handling that used
// to live in public/notification-sw.js, so there is a single SW per scope.
//
// Note: cross-origin Supabase requests are NOT matched by any route here, so
// they always go straight to the network (never served stale). Offline data
// resilience is handled in the app layer (localStorage cache + retry queue).

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();

// Precache everything the build injects into self.__WB_MANIFEST (html, js, css,
// media). This is the app shell + all code-split chunks.
precacheAndRoute(self.__WB_MANIFEST);

// App-shell navigation fallback: any in-app navigation that isn't a file request
// serves the precached index.html, so cold reopen works offline.
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Runtime cache for same-origin images (icons/logos) not in the precache.
registerRoute(
  ({ url }) => url.origin === self.location.origin && /\.(?:png|svg|jpg|jpeg|gif|webp)$/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// Allow the page to tell a waiting SW to activate immediately (used on update).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Notification click handling (merged from the old notification-sw.js) ──
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const data = event.notification.data || {};
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const message = {
        type: 'NOTIFICATION_ACTION',
        action: action || 'focus',
        taskId: data.taskId,
      };

      for (const client of clientList) {
        client.postMessage(message);
        if ('focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(process.env.PUBLIC_URL + '/');
      }
    })
  );
});
