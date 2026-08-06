# Pambamesa

Tu cocina de autor: un plató de cocina profesional donde combinas los
ingredientes que tienes — al estilo **Little Alchemy** — para descubrir
preparaciones y platillos nuevos y emplatarlos en tu **recetario**.
Sin concurso, sin jueces, sin reloj: solo tú, el fuego y el gusto de
descubrir.

Jugable en: https://franciscombp.github.io/pambamesa/

## Cómo funciona

- **Ingredientes**: empiezas con unos pocos básicos (plátano verde,
  queso, huevo, carne de cerdo) y los utensilios de la estación
  (cuchillo, olla, pilón, sartén). Todos viven en el **cajón** de
  casillas bajo el mesón 3D.
- **Cocina**: arrastra cosas del cajón a la tabla de picar y junta
  una encima de la otra. Si hay una fórmula para esa pareja,
  descubres una **preparación** (paso intermedio) o un **platillo**
  (plato terminado) y se emplata en tu recetario. Si no la hay,
  queda una **mezcla rara** humeante que debes botar al basurero —
  sin perder ingredientes.
- **Recetario**: todos los descubrimientos, por región. Lo que aún no
  descubres se ve como un plato cubierto — con su pista lista,
  esperando que la resuelvas combinando.
- **Despensa**: cocinar da sucres; con ellos repones ingredientes o
  abres cajas del mercado cuando la cocina se queda corta.

## El minijuego: la fanesca

En `fanesca/` vive un minijuego aparte —
https://franciscombp.github.io/pambamesa/fanesca/ — con otra gracia:
en vez de combinar cartas, se **prepara con los dedos**. Desgranas
una mazorca 3D grano por grano, desvainas habas, revientas fréjol,
cortas el zapallo y tiendes el bacalao, un nivel por ingrediente.

El truco es el mismo en todos: lo lento es ir de uno en uno, lo
rápido es arrastrar desde una orilla y que la fila se vaya sola. Y
en cada ingrediente hay un bicho escondido — si lo aplastas o se te
cuela a la batea, se arruina la olla entera y toca empezar de nuevo.

Reusa este juego sin duplicar nada: el mismo `design-system.css`,
los mismos `icons.js` y el mismo `vendor/` de Three.js, un directorio
más arriba. Los detalles, en [`fanesca/README.md`](fanesca/README.md).

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

Todas las pantallas comparten un mismo mundo — pared de azulejo celeste
arriba, filo de madera, muro crema abajo — para que la cocina 3D no se
sienta pegada aparte del resto de la interfaz.

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
