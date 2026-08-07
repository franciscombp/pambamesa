# Pambamesa

Tu cocina de autor: un plató de cocina profesional donde combinas los
ingredientes que tienes — al estilo **Little Alchemy** — para descubrir
preparaciones y platillos nuevos y emplatarlos en tu **recetario**.
Sin concurso, sin jueces, sin reloj: solo tú, el fuego y el gusto de
descubrir.

Jugable en: https://franciscombp.github.io/pambamesa/

## Cómo funciona

El mesón tiene **tres niveles**, de atrás hacia adelante:

1. **La estación** — la superficie de trabajo, y se cambia: tabla y
   cuchillo, olla, sartén, pilón o molino. Cambiarla es media
   mecánica del juego (el mismo verde pelado da *verde cocido* en la
   olla y *verde frito* en el sartén). Se cambia con las fichas de
   arriba o deslizando la estación de lado.
2. **La repisa** — lo que ya preparaste, esperando su turno.
3. **La canasta** — solo los ingredientes que trajiste de la
   despensa. Chica a propósito: cocinar es elegir qué llevar, no
   bucear en una lista de veinte cosas.

- **Cocinar**: arrastra algo a la estación. Si la estación le hace
  algo, lo hace sola; si no, junta una segunda cosa encima. Cada
  descubrimiento se emplata en el recetario.
- **Los errores no castigan**: una pareja sin receta deja una
  **mezcla rara** que estorba un puesto de la estación hasta que la
  botes al basurero — pero no gasta ni un ingrediente. El otro
  puesto sigue libre mientras tanto.
- **Un ingrediente en la estación equivocada tampoco se pierde**: se
  queda ahí esperando, y la pista de abajo te dice qué estación sí
  le sirve.
- **Recetario**: 21 platillos y 47 preparaciones en tres regiones
  (Costa, Sierra y Oriente). Lo que aún no descubres se ve como un
  plato cubierto, con su pista lista.
- **Cada región trae su estación**: la Sierra el molino, el Oriente
  la parrilla de leña.
- **La estación hace su trabajo a la vista**: el cuchillo pica, la
  olla hierve, la sartén saltea, el pilón maja, el molino muele y la
  brasa late. La carta aparece cuando termina el gesto.
- **Despensa**: todo lo que tienes guardado, más el mercado y las
  cajas. Desde ahí eliges qué va a la canasta.

### Los modelos

Ingredientes, preparaciones y utensilios son **lowpoly de verdad**,
armados con primitivas a partir de las tablas `FORMAS` y `PREPS` de
`escena3d.js` — el plátano es un tubo curvo, el queso una cuña, la
olla un cilindro con asas. Si sueltas un `models/<id>.glb` (por
ejemplo hecho con Meshy), ese modelo reemplaza al procedural sin
tocar código.

## El minijuego: la fanesca

En `fanesca/` vive un minijuego aparte —
https://franciscombp.github.io/pambamesa/fanesca/ — con otra gracia:
en vez de combinar cartas, se **prepara con los dedos**. Deshojas y
desgranas mazorcas 3D (una tierna que revienta si vas con fuerza,
una dura que pelea), desvainas habas, pelas chochos, revientas
fréjol, cortas el zapallo, escoges la lenteja y tiendes el bacalao,
un nivel por ingrediente.

El truco es el mismo en casi todos: lo lento es ir de uno en uno, lo
rápido es arrastrar desde una orilla y que la fila se vaya sola. Y
en cada ingrediente hay un bicho escondido — si lo aplastas o se te
cuela a la batea, se arruina la olla entera y toca empezar de nuevo.

Y cuenta de dónde sale el plato mientras lo preparas: la uchucuta del
Mushuk Nina, por qué la Pascua cae en la misma fecha del equinoccio,
por qué un bacalao del Atlántico Norte terminó en una sopa de páramo,
y la frase de Tránsito Amaguaña sobre la mazorca — «si se va el
grano, se va la fila» — que aparece justo cuando el pulgar acaba de
demostrarla desgranando una hilera entera de un tirón.

Reusa este juego sin duplicar nada: el mismo `design-system.css`,
los mismos `icons.js` y el mismo `vendor/` de Three.js, un directorio
más arriba. Los detalles, en [`fanesca/README.md`](fanesca/README.md).

## Instalable y sin conexión

Las dos cocinas son PWA y comparten un solo service worker de raíz:

| Archivo | Rol |
|---|---|
| `version.js` | **La única fuente de verdad de la versión** (`APP_VERSION`) y su nota de versiones (`NOVEDADES`). La entrada de arriba es la vigente. |
| `sw.js` | Caché versionada con todo lo necesario para jugar sin conexión (la cocina, la fanesca y Three.js). Importa `version.js` para nombrar su caché: subir `APP_VERSION` **es** publicar. La versión nueva queda en espera hasta que el jugador acepte. |
| `actualizador.js` | El mismo script en las dos páginas (con `data-sw` para la ruta): registra el worker, revisa si hay versión nueva al volver el foco, **al volver el internet** y cada hora, muestra el botón de **Actualizar** cuando la hay, y estrena la nota de versiones una sola vez por versión. |

**Publicar una actualización** = subir `APP_VERSION` en `version.js`
con su entrada de `NOVEDADES`, y hacer push. Nada más: la caché se
renombra, los clientes ven el botón al reconectarse y el que acepta
queda en la última versión. A nadie se le cambia el juego a mitad de
partida.

## Arquitectura (heredada de Huecas, adaptada)

| Archivo | Rol |
|---|---|
| `recetario.js` | `GAME_DATA` (ingredientes, recetas con pasos "a + b → resultado", pistas, notas) + `buildCartario()`: el adapter que arma el registro de cartas (`CARTAS`), la tabla de fusión (`RECETAS`) y el orden del recetario (`CARTA_ORDEN`). Agregar una carta nueva es trabajo de datos, no de código. |
| `design-system.css` | **El lenguaje visual.** Capa 1: tokens (rampas de color, elevación, radios, espaciado 4pt, escala tipográfica, movimiento, capas z). Capa 2: componentes construidos solo con tokens (`.btn` + variantes, `.panel`, `.sign`, `.plate`, `.badge`, `.pill`, `.meter`, `.sheet`, `.tabbar`, `.hud`, `.scroll`, `.hoja`). Ningún color ni sombra suelta vive fuera de aquí. |
| `styles.css` | Composición de pantallas sobre el sistema. Si algo se repite en dos pantallas, su lugar es el sistema, no este archivo. |
| `app.js` | El motor: estado, combinar, revelar, recetario, guardado. |
| `escena3d.js` | El mesón 3D (Three.js, cámara fija): cajón con casillas, tabla de picar, basurero, arrastre de ingredientes y utensilios. Carga `models/<id>.glb` si existe (p. ej. de Meshy) o usa el icono SVG como sprite. Con navegadores sin WebGL, el fogón 2D clásico sigue funcionando. |
| `icons.js` | Ilustraciones acuarela + tinta (heredadas de Huecas), reutilizadas como el emplatado de cada carta. |
| `index.html` | Una `.hoja` por pantalla: rótulo de madera fijo arriba + `.scroll` interno, para que el contenido nunca pase bajo la barra de navegación. |

## El sistema de diseño

La paleta es de comida popular latinoamericana — puesto de mercado y
taquería de barrio: azulejo de **talavera**, **rosa mexicano**, amarillo
**cempasúchil**, verde **nopal**, rojo **guajillo**, madera pintada y
blanco de **peltre**. Nada de cremas de cuaderno.

Cada pantalla trae **su propio fondo**, para que nunca se vea una
escena encima de otra:

- **Cocina**: el fondo *es* el mesón 3D, a sangre de borde a borde. No
  lleva decoración CSS — el HUD y la barra flotan encima con un velo.
- **Recetario**: pared de cal con rayado de libreta.
- **Despensa**: tablones de alacena.
- **Portada**: el puesto completo, con papel picado y zócalo de
  talavera.

El elemento `.mundo-puesto` es el que pinta ese decorado; la Cocina
simplemente no lo incluye.

La escena 3D **no** tiene colores propios: `escena3d.js` lee los tokens
con `getComputedStyle` sobre `:root`, así que cambiar la paleta del
sistema repinta también el mesón, el cajón y el piso.

Para agregar o cambiar algo visual:

1. **¿Es un color, sombra, radio o tamaño nuevo?** Va como token en
   `design-system.css`. Nunca en línea ni en `styles.css`.
2. **¿Es una pieza que aparece en más de una pantalla?** Va como
   componente en `design-system.css`, construido solo con tokens.
3. **¿Es la disposición de una pantalla concreta?** Va en `styles.css`,
   componiendo las piezas anteriores.

Cambiar la variante de un botón es cambiar dos tokens
(`--btn-face` / `--btn-edge`), no reescribir sombras.

**Cuidado con los porcentajes**: un `padding` en `%` se mide contra el
*contenedor padre*, no contra el propio elemento — en un `.plate` de
68px llegó a comerse los 68px enteros. Los márgenes internos de los
iconos se dan con el ancho del icono, no con padding porcentual.

## Cómo correrlo localmente

```bash
npx serve .        # o: python3 -m http.server
```
