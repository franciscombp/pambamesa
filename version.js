/* ============================================================
   PAMBAMESA — version.js
   La versión de la app y su nota de versiones, en UN solo sitio.

   Lo cargan dos mundos:
   - las páginas (index.html y fanesca/index.html), para mostrar la
     versión y las novedades;
   - el service worker (sw.js) vía importScripts, para nombrar su
     caché: subir la versión aquí ES publicar una actualización.

   REGLA DE RELEASE: todo cambio que deba llegar a los jugadores
   sube APP_VERSION y añade su entrada arriba de NOVEDADES. Sin
   ese bump, los que ya instalaron la app se quedan con la copia
   guardada — que es justo lo que hace que funcione sin conexión.
   ============================================================ */

const APP_VERSION = '1.0.0';

/* la más reciente primero */
const NOVEDADES = [
  {
    v: '1.0.0',
    fecha: '2026-08-07',
    titulo: 'La cocina abre sus puertas',
    cambios: [
      'Mesón 3D con tres niveles: estación, repisa y canasta.',
      'Tres regiones: la Costa, la Sierra y el Oriente — 21 platillos y 93 cartas.',
      'Seis estaciones que trabajan a la vista: picar, cocinar, freír, majar, moler y asar.',
      'El minijuego de la fanesca: desgrana, desvaina y pica con los dedos.',
      'La app se instala y ahora funciona sin conexión; se actualiza sola al volver el internet.',
    ],
  },
];
