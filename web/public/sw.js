const CACHE_VERSION = 'mali-audio-shell-v1.2.0';
const PUBLIC_CACHE = 'mali-audio-public-v1.2.0';
const APP_BASE = new URL('./', self.location).pathname;

const SHELL_ASSETS = [
  APP_BASE,
  `${APP_BASE}index.html`,
  `${APP_BASE}manifest.webmanifest`,
  `${APP_BASE}favicon.png`,
  `${APP_BASE}icons/icon-192.png`,
  `${APP_BASE}icons/icon-512.png`,
  `${APP_BASE}icons/apple-touch-icon.png`,
];

const EXCLUDED_API_PREFIXES = [
  '/api/stream',
  '/api/auth',
  '/api/users',
  '/api/favorites',
  '/api/history',
  '/api/playlists',
  '/api/admin',
  '/api/videos/',
];

function isCacheablePublicApi(pathname) {
  if (!pathname.startsWith('/api/')) return false;
  if (EXCLUDED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  return (
    pathname.startsWith('/api/songs') ||
    pathname.startsWith('/api/artists') ||
    pathname.startsWith('/api/albums') ||
    pathname.startsWith('/api/playlists/public') ||
    pathname.startsWith('/api/news') ||
    pathname.startsWith('/api/videos') ||
    pathname.startsWith('/api/categories') ||
    pathname.startsWith('/api/languages') ||
    pathname.startsWith('/api/settings/public')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION && key !== PUBLIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Règle impérative : ne jamais intercepter ni mettre en cache les flux audio,
  // les requêtes Range ou les endpoints privés/d'authentification.
  if (
    request.headers.has('range') ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    url.pathname.startsWith('/api/stream') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/users') ||
    url.pathname.startsWith('/api/favorites') ||
    url.pathname.startsWith('/api/history') ||
    url.pathname.startsWith('/api/admin')
  ) {
    return;
  }

  // Navigation SPA : Network-first avec repli vers la coquille mise en cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(`${APP_BASE}index.html`, copy));
          }
          return response;
        })
        .catch(() => caches.match(`${APP_BASE}index.html`))
    );
    return;
  }

  // Données publiques de catalogue (hors audio) : Network-first avec repli cache
  if (isCacheablePublicApi(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PUBLIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets statiques non sensibles (JS, CSS, icônes, images publiques)
  if (!url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
  }
});
