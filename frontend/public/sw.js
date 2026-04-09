/**
 * Cache-first for hashed build assets (/assets/*) after first fetch — speeds repeat visits.
 * HTML navigations stay uncached (network default) so SPA updates apply.
 */
const CACHE = 'echo-assets-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith('/assets/')) return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) return cached
      const response = await fetch(event.request)
      if (response.ok) {
        cache.put(event.request, response.clone())
      }
      return response
    })
  )
})
