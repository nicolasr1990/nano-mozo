/**
 * Service worker de Nano Mozo — mismo criterio que nano-panel/sw.js.
 * Dos trabajos:
 *  1) Dejar instalar la app en el celular (ícono propio, sin la barra del navegador) —
 *     Android exige un service worker registrado para eso.
 *  2) Que las actualizaciones lleguen solas: estrategia "red primero" para los archivos
 *     propios, así que con conexión SIEMPRE se pide la versión más nueva antes de mirar el
 *     cache. El cache es solo respaldo para cuando no hay señal.
 */
const CACHE_VERSION = 'nano-mozo-v1';
const ARCHIVOS_BASE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ARCHIVOS_BASE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET del propio origen (documento, manifest, íconos). Los POST/GET al backend de
  // Supabase son de otro origen y no hay que tocarlos — cachear eso rompería pedidos reales.
  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copia));
        return respuesta;
      })
      .catch(() => caches.match(request))
  );
});
