// Service worker — app-shell caching (SPEC §13).
//
// Strategy:
//   - Navigations (the HTML shell): NETWORK-FIRST, falling back to the cached
//     shell when offline. Keeps deploys fresh online; loads instantly + works
//     offline on repeat visits.
//   - Hashed build assets (/assets/*): CACHE-FIRST — filenames are
//     content-hashed, so a new deploy ships new names; old entries just go stale.
//   - Other same-origin GETs (manifest, icons): cache-first with network fill.
//   - Cross-origin (the Function App API) and non-GET: NOT touched — the API
//     must always hit the network; offline writes are handled by the in-app
//     IndexedDB queue, not the service worker.
//
// Background Sync API is deliberately not used: iOS Safari doesn't support it,
// so the queue is replayed in-app on the `online` event instead.

const CACHE = 'engineering-shell-v1';
const SHELL_KEY = '/index.html';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never cache writes

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave the API alone

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstShell(req));
    return;
  }
  event.respondWith(cacheFirst(req));
});

// Always try the network for the shell so new deploys land; cache the latest
// good copy under a stable key for offline fallback.
async function networkFirstShell(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    cache.put(SHELL_KEY, res.clone());
    return res;
  } catch {
    const cached = await cache.match(SHELL_KEY);
    if (cached) return cached;
    return Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return Response.error();
  }
}
