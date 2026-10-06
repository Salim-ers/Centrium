// =========================================================================
// Service worker Centrium : installation sur l'écran d'accueil et repli
// hors ligne.
// Règle de sécurité : AUCUNE donnée personnelle en cache. Seuls les
// fichiers statiques versionnés de Next (/_next/static, immuables), les
// icônes et la page hors ligne sont gardés. Jamais : les pages HTML
// (rendues pour un utilisateur), /api, /auth, Supabase ni aucun autre
// domaine — ces requêtes ne sont même pas interceptées.
// =========================================================================

const VERSION = 'centrium-v1';
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = '/offline.html';
const MAX_STATIC_ENTRIES = 300;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/192', '/icons/512']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === OFFLINE_URL;
}

/** Les anciens fichiers des déploiements précédents sortent du cache. */
async function trim(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MAX_STATIC_ENTRIES;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Supabase, paiement, mesure d'audience : jamais interceptés.
  if (url.origin !== self.location.origin) return;

  // Pages : toujours le réseau ; hors ligne, la page de repli (jamais une page mise en cache).
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // /api, /auth et tout le reste : le navigateur procède comme sans service worker.
  if (!isStaticAsset(url)) return;

  // Fichiers statiques versionnés : le cache d'abord, le réseau sinon.
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
        void trim(cache);
      }
      return response;
    }),
  );
});
