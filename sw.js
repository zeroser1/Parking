const CACHE = 'parking-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Barlow:wght@500;600&family=Barlow+Condensed:wght@700&display=swap',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { hostname } = new URL(event.request.url);

  // Map tiles and routing: try network, cache on success, silently fail offline
  if (hostname.includes('api.mapbox.com') || hostname.includes('openstreetmap.de')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Font files: cache on first load, serve from cache after
  if (hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Everything else: cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
