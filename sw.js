/* Drive Judge — service worker (network-first for app files, auto-update) */
const CACHE = 'drive-judge-v9';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Google Maps / Fonts: let the network handle it (never cache)
  if (url.host.includes('googleapis.com') || url.host.includes('gstatic.com') || url.host.includes('google.com')) return;

  // Same-origin app files: NETWORK-FIRST so opening online always gets the latest.
  // Falls back to cache only when offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  // Anything else: cache-first
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
