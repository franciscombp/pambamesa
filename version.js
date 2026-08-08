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

const APP_VERSION = '1.2.0';

/* la más reciente primero */
const NOVEDADES = [
  {
    v: '1.2.0',
    fecha: '2026-08-08',
    titulo: 'Los modelos, en archivos que se pueden esculpir',
    cambios: [
      'Cada cosa que se ve en la mesa de prep —el grano, la hoja, el gusano, la lenteja— pasó a tener su propio archivo en fanesca/modelos/. Los niveles ya no dibujan: piden sus piezas y las colocan.',
      'Se pueden editar en Blender: la herramienta en fanesca/herramientas/ exporta las 28 piezas a .glb, y el juego usa tu versión en cuanto la devuelvas.',
      'Todos los colores en un solo sitio, y los del sistema de diseño se leen en vivo: si cambia la paleta del juego, esta cocina se repinta sola.',
    ],
  },
  {
    v: '1.1.2',
    fecha: '2026-08-07',
    titulo: 'La cabecera ya no se esconde tras el notch',
    cambios: [
      'Arreglado: en iPhone con notch o Dynamic Island, la barra de arriba (progreso, título del nivel, reloj) quedaba parcialmente tapada. Ahora respeta el área segura en las dos cocinas.',
    ],
  },
  {
    v: '1.1.1',
    fecha: '2026-08-07',
    titulo: 'Pellízcalos: cuesta menos atrapar al bicho',
    cambios: [
      'Nuevo gesto en la fanesca: pellizca el bicho con dos dedos (o arrástralo con uno, como antes) para cargarlo hasta la composta. El pellizco perdona más: agarra al más cercano aunque el dedo no caiga justo encima.',
      'Botón de modo dev en la portada de la fanesca, para abrir los siete niveles de una vez y probar cualquier mecánica sin jugarse los anteriores.',
    ],
  },
  {
    v: '1.1.0',
    fecha: '2026-08-07',
    titulo: 'El choclo entero (y dos manos más en la mesa)',
    cambios: [
      'El choclo llega con hojas: se deshoja jalando hacia abajo, y van dos por olla — el tierno revienta si pasas el dedo con fuerza; el duro pelea grano a grano.',
      'Dos niveles nuevos en la fanesca: pelar chochos y escoger la lenteja.',
      'Más voces en el cuaderno: Tránsito Amaguaña, Dolores Cacuango y Blanca Chancoso.',
      'La fanesca estrena icono propio: su choclo a medio deshojar.',
      'Los gusanos ya caminan SOBRE la tabla de picar, no medio hundidos.',
    ],
  },
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
