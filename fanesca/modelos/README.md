# modelos/ — la forma de las cosas

Todo lo que se ve en la mesa de prep vive aquí, **una pieza por
archivo**: el grano de choclo, la hoja, el gusano, la lenteja, la
presa de bacalao. Los niveles ya no dibujan nada — piden sus piezas
por nombre y las colocan.

```js
const g = api.pieza('grano-choclo', { madurez: 'tierno', punta: false });
```

## Por qué una pieza y no una escena

Los modelos de este juego no son decorado: **son la mecánica**. La
mazorca no es "un choclo", es una rejilla de 14×9 granos cuyas
posiciones calcula el juego con una fórmula, y de esas posiciones
dependen la regla del vecino ausente, la cascada y dónde se esconde
el gusanito. Si horneáramos la mazorca entera a un `.glb`, editarla
en Blender rompería el juego.

Por eso el corte es una pieza por archivo: **el modelo dice cómo se
ve una pieza; el juego dice cuántas hay y dónde van.** Así se puede
reesculpir el grano sin tocar una línea de lógica.

La consecuencia es que algunas medidas viven con el modelo y no con
el nivel (`A`, `P`, `PASO` en `choclo.js`; `N`, `GRUESO`, `R` en
`zapallo.js`). Es a propósito: la forma y las posiciones son lo
mismo, y si estuvieran en dos sitios un día dejarían de coincidir.

## Editar en Blender

1. Abre `fanesca/herramientas/exportar-glb.html` en el navegador
   (con el juego servido: `npx serve .` desde la raíz del repo).
   Muestra cada pieza con su miniatura.
2. **Descargar todas** — o solo la que quieras tocar.
3. Ábrela en Blender (`File ▸ Import ▸ glTF 2.0`), esculpe, y
   exporta de vuelta a `.glb` con el mismo nombre de archivo.
4. Ponla en `fanesca/modelos/glb/` y **agrega su nombre a
   `glb/indice.json`**:
   ```json
   ["grano-choclo-tierno", "gusano"]
   ```
5. Recarga. El juego usa tu modelo en lugar del de código.

El índice existe para no disparar veinte 404 en cada arranque
buscando archivos que casi nunca están. Viene vacío a propósito: los
`.glb` de `glb/` son el punto de partida para editar, no el modelo
que se usa — así el juego no descarga medio mega de más para verse
exactamente igual.

### No renombres estas partes

El juego busca por **nombre de objeto** las partes que anima o
modifica en vivo. Si en Blender las renombras, deja de encontrarlas
(no truena: simplemente el gusano no se menea o la carne no se
aclara). Cámbiales la forma todo lo que quieras, pero no el nombre:

| Pieza | Partes que el juego busca | Para qué |
|---|---|---|
| `gusano` | `seg0` … `segN` | el meneo del cuerpo |
| `gorgojo` | `pata0` … `pata5`, `cuerpo` | las patitas y el rebote |
| `mosca` | `ala0`, `ala1` | el aleteo |
| `chocho` | `pepa`, `piel` | la pepa vuela a la batea, la piel a la composta |
| `presa-bacalao` | `carne` | se aclara al quedar sin sal |
| `vaina-haba` | `bisagra` | la tapa que se abre hacia atrás |
| `cuenco` | `relleno` | el disco que sube al llenarse |

El **aro rojo de alarma** de los bichos no lo dibuja Blender ni
debería: es interfaz —la señal de "esto no se toca"— y lo pone
siempre el código con el rojo del sistema de diseño, aunque el
cuerpo venga de un `.glb`.

### Variantes

Algunas piezas se piden de más de una forma. El grano de choclo
tierno y el duro no son el mismo modelo, así que cada uno tiene su
archivo y se puede editar por separado:

- `grano-choclo-tierno.glb` / `grano-choclo-duro.glb`
- `tusa-tierno.glb` / `tusa-duro.glb`

Si solo pones `grano-choclo.glb` (sin sufijo), sirve para los dos.

### Presupuesto

Es un juego móvil y de estas piezas hay **decenas en pantalla a la
vez** (126 granos por choclo). Mantén cada pieza por debajo de
**~500 triángulos** y sin texturas: el juego usa color plano leído
del sistema de diseño. Un grano con 5.000 caras se ve igual a esta
distancia y hunde el cuadro por segundo.

## Los colores

Nadie escribe un `#rrggbb` suelto. Están todos en `paleta.js`, en
dos grupos:

- **Tokens del sistema** (`token('--talavera-500')`) — se leen de
  `design-system.css` en vivo. Si cambia la paleta del juego, esta
  cocina se repinta sola. No es un detalle: el minijuego nació con
  la paleta anterior, y cuando el juego grande cambió, el `git
  merge` no vio ningún conflicto — sin esto habría quedado con los
  colores de una versión que ya no existe.
- **Colores de comida** (`COMIDA.choclo_tierno`) — el amarillo de un
  grano tierno no es interfaz y no tiene por qué estar en el sistema
  de diseño, pero sí tiene que estar junto a los otros colores de
  comida.

## Los archivos

| Archivo | Qué tiene |
|---|---|
| `registro.js` | El catálogo (`registrar`/`pieza`), la búsqueda de partes por nombre (`parte`/`partes`) y el puente que carga los `.glb`. |
| `paleta.js` | Todos los colores: los tokens del sistema y los de comida. |
| `utileria.js` | La tabla de picar, la sombra y los ojitos — lo que sale en casi todos los niveles. |
| `cocina.js` | El puesto: pared, piso, mesón, repisa, la olla grande humeando y los dos cuencos. |
| `bichos.js` | Gusanito, gorgojo y mosca: su forma, su aro de alarma y su meneo. |
| `choclo.js` `habas.js` `chochos.js` `frejol.js` `zapallo.js` `lenteja.js` `bacalao.js` | Un archivo por ingrediente. |
| `index.js` | La puerta única: importarlo registra todo. |
| `glb/` | Donde caen los modelos editados en Blender, con su `indice.json`. |

**Agregar una pieza** es escribir su `registrar('<id>', …)` en el
archivo del ingrediente (o uno nuevo, agregándolo a `index.js`) y
pedirla con `api.pieza('<id>')`. No hay que tocar el motor.
