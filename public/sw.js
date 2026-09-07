const CACHE_PREFIX = 'mungwele-ia-';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

// Intentionally no fetch interception.
// MUNGWELE is a frequently deployed App Hosting application and must always
// load the current HTML/JS/CSS from the network. The service worker remains
// registered only to preserve installability as a PWA.
