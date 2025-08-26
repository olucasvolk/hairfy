// Service Worker simples para cache
const CACHE_NAME = 'hairfy-no-refresh-v1';

const urlsToCache = [
  '/',
  '/index.html'
];

// Instalar
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Ativar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições - Cache First para HTML
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'document') {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            // Retorna do cache imediatamente para evitar refresh
            return response;
          }
          // Se não tem cache, busca da rede
          return fetch(event.request).then(fetchResponse => {
            if (fetchResponse.ok) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return fetchResponse;
          });
        })
    );
  }
});

console.log('Service Worker carregado - Cache First ativo');