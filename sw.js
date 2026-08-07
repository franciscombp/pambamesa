/* ============================================================
   PAMBAMESA — sw.js (service worker)
   La app funciona sin conexión: en la instalación se guarda todo
   el juego (incluida la fanesca y Three.js) en una caché nombrada
   con la versión. Subir APP_VERSION en version.js publica una
   caché nueva; la vieja se borra al activar.

   Estrategia:
   - archivos propios → caché primero (por eso vuela y funciona
     sin internet); la frescura llega por versión, no por red
   - fuentes de Google → red con respaldo en caché (la primera
     visita con internet las deja guardadas para siempre)
   - modelos models/*.glb → red, y si responde se guarda; sus 404
     son parte del juego (significan "usa el modelo procedural")

   La actualización NO es a traición: el worker nuevo espera hasta
   que el jugador toca "Actualizar" (mensaje SKIP_WAITING desde
   actualizador.js) o hasta que cierra todas las pestañas.
   ============================================================ */

importScripts('version.js');

const CACHE = 'pambamesa-' + APP_VERSION;
const RUNTIME = 'pambamesa-runtime';

const PRECACHE = [
  './',
  './index.html',
  './design-system.css',
  './styles.css',
  './app.js',
  './icons.js',
  './recetario.js',
  './escena3d.js',
  './version.js',
  './actualizador.js',
  './manifest.json',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './vendor/three.module.min.js',
  './vendor/three.core.min.js',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './vendor/addons/utils/SkeletonUtils.js',
  './fanesca/',
  './fanesca/index.html',
  './fanesca/fanesca.css',
  './fanesca/main.js',
  './fanesca/motor3d.js',
  './fanesca/historia.js',
  './fanesca/bichos.js',
  './fanesca/plaga.js',
  './fanesca/niveles.js',
  './fanesca/nivel-maiz.js',
  './fanesca/nivel-habas.js',
  './fanesca/nivel-chochos.js',
  './fanesca/nivel-frejol.js',
  './fanesca/nivel-zapallo.js',
  './fanesca/nivel-escoger.js',
  './fanesca/nivel-bacalao.js',
  './fanesca/manifest.json',
  './fanesca/icon.svg',
  './fanesca/icon-180.png',
  './fanesca/icon-192.png',
  './fanesca/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  /* nada de skipWaiting aquí: el jugador decide cuándo actualizar */
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres
      .filter(n => n.startsWith('pambamesa-') && n !== CACHE && n !== RUNTIME)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* fuentes de Google: red primero, respaldo en caché para offline */
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(RUNTIME);
        c.put(req, res.clone());
        return res;
      } catch (err) {
        const guardada = await caches.match(req);
        return guardada || Response.error();
      }
    })());
    return;
  }

  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const guardada = await caches.match(req, { ignoreSearch: url.pathname.endsWith('/') });
    if (guardada) return guardada;
    try {
      const res = await fetch(req);
      /* los .glb que sí existan quedan guardados para offline */
      if (res.ok && url.pathname.includes('/models/')) {
        const c = await caches.open(RUNTIME);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      /* sin red y sin caché: si era navegación, entrega la portada */
      if (req.mode === 'navigate') {
        const inicio = await caches.match(url.pathname.includes('/fanesca') ? './fanesca/index.html' : './index.html');
        if (inicio) return inicio;
      }
      return Response.error();
    }
  })());
});
