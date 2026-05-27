// Service worker stub. Implementation deferred — see SPEC.md section 13.
// Responsibilities: offline detection, request queuing (IndexedDB), app shell caching.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
