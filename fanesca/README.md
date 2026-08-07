# fanesca/ — el minijuego de preparación

Un minijuego dentro de Pambamesa: la **preparación de la fanesca**,
hecha con los dedos. Nada de arrastrar cartas — aquí se desgrana, se
desvaina, se aprieta, se corta y se frota, al estilo de esos juegos
de reventar burbujas en los que el gusto está en el gesto.

Jugable en: https://franciscombp.github.io/pambamesa/fanesca/

Vive en un subdirectorio de GitHub Pages y **reusa el juego grande**:
`../design-system.css` (los mismos tokens y componentes),
`../icons.js` (las ilustraciones) y `../vendor/` (Three.js).
No duplica ni un color ni una dependencia.

Eso incluye la escena 3D: `motor3d.js` **lee la paleta de `:root`** con
`getComputedStyle`, igual que `escena3d.js` en el juego grande. Si la
paleta del sistema cambia, esta cocina se repinta sola. No es un
detalle: el minijuego nació sobre la paleta anterior (crema y azulejo
celeste) y cuando el juego grande pasó a la del barrio —talavera,
rosa mexicano, peltre— el `git merge` no vio ningún conflicto y sin
esto habría quedado con los colores de una versión que ya no existe.

## El plato es la historia

La fanesca es una fiesta de cosecha andina —la **uchucuta** del
Mushuk Nina, en el equinoccio de marzo— sobre la que el calendario
católico cayó sin tener que moverla de fecha, porque la Pascua se
calcula desde ese mismo equinoccio. Lleva doce granos de las dos
orillas del océano y un bacalao del Atlántico Norte que subió a los
Andes enterrado en sal porque no había otra forma de que llegara.

Todo eso está en `historia.js` y se reparte por el juego:

- **El cuaderno** (`screen-cuaderno`): seis capítulos —origen, fecha,
  nombre, granos, bacalao, unidad— con sus fuentes al pie. Empiezan
  cerrados: cada ingrediente que preparas abre uno o dos. La historia
  se gana con las manos, igual que en la cocina.
- **La tarjeta** que aparece al terminar un nivel, con lo que ese
  ingrediente concreto cuenta.
- **La voz**: la frase de **Tránsito Amaguaña** —«la unidad es como
  la mazorca: si se va el grano, se va la fila; si se va la fila, se
  acaba la mazorca»— aparece la primera vez que una cascada larga te
  limpia una hilera entera. O sea, en el segundo exacto en que
  acabas de comprobarla con el pulgar. No antes.

  No es que el juego se parezca a la frase: la frase **describe la
  mecánica**. Ella lo sabía porque desgranaba choclo.

Lo que está en disputa se dice que está en disputa: el origen del
nombre (¿*fames*? ¿*faneca*? ¿*juanesca*?) no lo sabe nadie, y el
cuaderno lo dice así.

## La idea

Siete ingredientes, siete gestos, una sola regla compartida.

| Nivel | Gesto lento | Gesto rápido | El bicho |
|---|---|---|---|
| **El choclo** | deshojar, y tocar grano a grano | arrastrar a lo largo → cascada | gusanito bajo un grano |
| **Las habas** | tocar haba por haba | barrer la vaina abierta | gusanito dentro de la vaina |
| **Los chochos** | apretar uno | arrastrar y van saltando en fila | gorgojo del mismo color |
| **El fréjol** | — | mantener el dedo hasta que truene, y barrer | gorgojo entre los granos |
| **El zapallo** | — | cruzar la línea punteada de un trazo | gusano paseando sobre el corte |
| **La lenteja** | tocar cada piedrita | *no hay* — barrer antes de limpiar arruina la olla | gorgojo igualito a una piedra |
| **El bacalao** | frotar la sal | — | mosca posada en la presa |

**El choclo llega con hojas y con genio.** Se deshoja jalando cada
hoja hacia abajo y arrancando los pelos de un jalón — el mismo gesto
que en la cocina. Y van **dos choclos por olla**, nunca iguales: el
**tierno** cede casi solo, pero si pasas el dedo con fuerza el grano
revienta en papilla que se pega, traba la hilera y toca limpiar a
mano; el **duro** no revienta nunca, pero sus granos trabados
aguantan el doble y la cascada corre pesada. Ir rápido en el choclo
equivocado es ir más lento — que es exactamente lo que enseña
desgranar de verdad.

**La lenteja es la excepción a propósito.** Los otros seis premian la
mano rápida; escoger el grano premia la mirada. Ahí el bicho deja de
ser un castigo añadido y se vuelve el nivel entero: el gorgojo tiene
el tamaño y casi el color de una piedrita, y tocar lo que sobra es
justamente el gesto correcto. La única defensa es mirar antes de
tocar. Es también la tarea que en la vida real se hace sentadas y
entre varias — por eso cierra el argumento de que este plato es una
excusa para juntarse.

### El teléfono es la mano

El juego es vertical, así que cuando el ingrediente es de los que se
sostienen, se sostiene: **el choclo va de pie**, ocupando la pantalla
a lo alto, con su sombra en el mesón. El pulgar baja por una hilera
y la desgrana — que es exactamente el gesto real. Girarlo es pasar
el dedo de lado, y rueda **hacia** el dedo, como rodaría de verdad
entre los dedos.

Lo que no se sostiene, no se sostiene: el zapallo se corta sobre la
tabla y el bacalao se frota en el mesón. Cada nivel declara su propio
encuadre (`camara: { pos, mira }`) y el motor se lo respeta.

### La regla que sostiene todo

**Empezar por el borde.** En el choclo está literal: un grano solo sale
si tiene un vecino ausente, así que en el centro está trabado por los
cuatro lados y hay que forzarlo, mientras que en las puntas siempre hay
hueco. Abierto el primer hueco, arrastrar el dedo a lo largo de la
hilera la desgrana entera en cascada. El zapallo repite la idea con
otra cara: una tajada solo cae cuando quedó suelta por los dos lados.

**Y los bichos, iguales en todos los niveles** (por eso viven en
`bichos.js` y no en cada nivel):

- **tocarlo** → lo aplastas → se arruina la olla y se empieza de nuevo
- **rozarlo barriendo** → lo mismo
- **arrastrar DESDE él, o pellizcarlo con dos dedos** → lo cargas, y lo sueltas en la composta
- **dejarlo llegar a la batea** → se mezcló con lo bueno → también se arruina

Eso es lo que hace que el atajo rápido sea una decisión y no un botón:
barrer la vaina sin mirar es exactamente cómo se te va el gusanito
adentro.

**El pellizco.** Agarrar un bicho por raycast exacto le exige al dedo
una puntería que un bicho de un par de centímetros —y que a veces
camina— no da. Por eso, además de arrastrar desde él (que sigue
funcionando, sobre todo con mouse), poner **dos dedos a la vez** es un
gesto tan deliberado que se puede juzgar por cercanía *en pantalla* en
vez de por acierto exacto de rayo: se agarra el bicho suelto más
cercano al punto medio de los dos dedos, con un margen generoso —un
pellizco de verdad tiene ese margen. El motor lo resuelve solo
(rastrea los dos punteros, calcula el punto medio); cada nivel solo
implementa `alPellizcarInicio/Mover/Fin`, casi siempre delegando en
`plaga.masCercaEnPantalla()`.

## Arquitectura

| Archivo | Rol |
|---|---|
| `motor3d.js` | La escena compartida: cocina de fondo, cámara fija, luces, tweens, chispas, batea y composta, y la lectura de los dedos (qué es toque, qué es arrastre, sobre qué cayó). Define el **contrato de nivel** — está documentado en su cabecera. |
| `main.js` | El juego alrededor: pantallas, reloj, cucharas, guardado (`localStorage`), y el puente entre el motor y el HUD. No sabe nada de granos. |
| `niveles.js` | Los datos: qué ingredientes, en qué orden, con qué copy y en cuántos segundos son 3 cucharas. |
| `historia.js` | Lo que el plato cuenta: capítulos del cuaderno, tarjetas por ingrediente, la cita de Cacuango y las fuentes. Texto, no código. |
| `bichos.js` | Gusanito, gorgojo y mosca: su forma, su aro rojo de alarma y su meneo. Uno solo para todos, para que la regla sea *una* regla. |
| `plaga.js` | El drama compartido de habas/fréjol/chochos/escoger: el bicho camina hacia la batea, se carga (a mano o a pellizco) y se bota a la composta. Zapallo y bacalao llevan su propio bicho (uno solo, o una mosca que se posa) y repiten el mismo patrón a mano. |
| `nivel-*.js` | Un archivo por ingrediente. Solo arma sus mallas y responde gestos; todo lo demás se lo pide a `ctx.api`. |
| `fanesca.css` | Composición de pantallas sobre `../design-system.css`. Aquí no se inventan colores. |

**Agregar un ingrediente** es escribir `nivel-<id>.js` contra el
contrato y agregar su entrada en `niveles.js`. No hay que tocar el
motor ni la app.

## Depurar

En la portada, el botón discreto **🛠 modo dev** desbloquea los siete
niveles de una vez (se guarda en el mismo `localStorage` del progreso).
Sirve para probar la mecánica de un ingrediente sin tener que
completar los anteriores primero — pensado para probar, no para jugar.

`window.Fanesca` queda expuesto, como `window.Escena3D` en la cocina
grande:

```js
Fanesca.jugar('zapallo')      // saltar directo a un nivel
Fanesca.estado.devMode = true // atajo directo, sin tocar el botón
Fanesca.sondear(x, y)         // qué hay bajo ese punto de la pantalla
Fanesca.estado                // progreso guardado
```

`sondear()` es lo que hace que los niveles se puedan probar
automatizados sin adivinar coordenadas a ojo.

## Correrlo localmente

Desde la **raíz del repo** (necesita ver `../vendor/` y `../icons.js`):

```bash
npx serve .        # y abrir /fanesca/
```
