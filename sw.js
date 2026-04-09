const CACHE_NAME = 'face2-4b5131da';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      './',
      './index.html',
      './admin.html',
      './analysis.html',
      './manifest.json',
      './icons/icon-192.png',
      './icons/icon-512.png',
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle http/https requests
  if (!url.protocol.startsWith('http')) return;

  // Same-origin requests
  if (url.origin === self.location.origin) {
    // Network-first for face data — always get latest
    if (url.pathname.endsWith('faces.json')) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          try {
            const response = await fetch(event.request);
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          } catch {
            return caches.match(event.request);
          }
        })
      );
      return;
    }

    // Cache-first for app shell, with network fallback + dynamic caching
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok && url.pathname.match(/\.(js|css|html|png|json)$/)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for CDN resources (models, libraries), then cache
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return caches.match(event.request);
      }
    })
  );
});
