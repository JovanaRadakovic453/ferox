// Minimal, versioned service worker — app-shell cache + offline navigation fallback.
// Kept intentionally small so it never serves a stale app shell for long.
const CACHE = 'ferox-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.add('/')).catch(() => {}))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  // Network-first for page navigations; fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put('/', res.clone())).catch(() => {})
          return res
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    )
  }
})
