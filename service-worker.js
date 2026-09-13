/*
 * SERVICE WORKER - Registro de Compras
 * Estrategia: CACHE-FIRST para todo (HTML, CSS interno, iconos, fuentes, JS externo).
 * Si el recurso está en caché, se sirve de ahí sin tocar la red.
 * Si no está en caché, se busca en la red y, si responde bien, se guarda
 * en caché para la próxima vez (así la app "aprende" a funcionar offline
 * a medida que se usa, incluyendo las fuentes que Google sirve dinámicamente).
 */

const CACHE_NAME = 'registro-compras-cache-v1';

// Recursos que se guardan de una vez al instalar el Service Worker.
const ARCHIVOS_CORE = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap'
];

// ===== INSTALL: precachea los archivos core =====
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // add() individual (no addAll) para que un solo recurso externo
            // caído (ej. sin internet en la instalación) no tumbe todo el SW.
            return Promise.all(
                ARCHIVOS_CORE.map((url) =>
                    cache.add(url).catch((err) => console.warn('[SW] No se pudo precachear:', url, err))
                )
            );
        })
    );
    self.skipWaiting(); // activa el nuevo SW de inmediato, sin esperar a cerrar pestañas
});

// ===== ACTIVATE: borra cachés de versiones anteriores =====
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((nombresCache) =>
            Promise.all(
                nombresCache
                    .filter((nombre) => nombre !== CACHE_NAME)
                    .map((nombre) => caches.delete(nombre))
            )
        )
    );
    self.clients.claim();
});

// ===== FETCH: CACHE-FIRST =====
self.addEventListener('fetch', (event) => {
    // Solo interceptamos peticiones GET (las de escritura no se cachean).
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((respuestaEnCache) => {
            if (respuestaEnCache) {
                return respuestaEnCache; // 1) CACHE-FIRST: si existe, se sirve directo
            }

            // 2) Si no está en caché, se pide a la red y se guarda para la próxima vez
            return fetch(event.request)
                .then((respuestaRed) => {
                    if (respuestaRed && respuestaRed.status === 200) {
                        const copia = respuestaRed.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
                    }
                    return respuestaRed;
                })
                .catch(() => {
                    // 3) Sin red y sin caché: si es una navegación de página,
                    // devolvemos el index.html cacheado como último recurso.
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});
