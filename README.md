# Pambamesa

**Aún por diseñar.** Este repo arranca con el motor de [Huecas](https://github.com/franciscombp/huecas)
importado tal cual, como base para no empezar de cero — el juego que se
juega hoy sigue siendo el de Huecas (una hueca costeña, cliente por
cliente). La idea real de Pambamesa es otra:

> Un álbum de recetas al estilo **Little Alchemy** combinado con un
> **TCG coleccionable**: combinas ingredientes sobre la mesa para
> descubrir páginas/cartas nuevas, sin la presión de atender una fila
> de clientes. Pambamesa — el picnic comunitario andino — como excusa
> para reunir y compartir esas recetas descubiertas.

## Qué se heredó de Huecas y por qué

| Archivo | Se reutiliza porque… |
|---|---|
| `icons.js` | Set de ilustraciones acuarela + tinta, reusable para cualquier ingrediente/plato nuevo. |
| `styles.css` | Dirección de arte "cuaderno blanco" skeumórfico (relieves, blur, Moleskine por hojas) — el look que Pambamesa también quiere. |
| `recetario.js` | El *adapter* que traduce contenido en JSON (`GAME_DATA`) a las estructuras del motor. Agregar una receta es trabajo de datos, no de código — eso es exactamente lo que un álbum tipo Little Alchemy necesita. |
| `app.js` / `data.js` | El motor de combinación (mesa, boceto→color, descubrimiento) sirve de base; todo lo que es servicio de clientes, arriendo, salubridad, comensales de historia, presión de tiempo **se va a retirar o reemplazar** — eso era el juego de Huecas, no el de Pambamesa. |

## Próximo paso

Rediseñar el bucle: quitar la cola de clientes / arriendo / presión de
tiempo, y construir la pantalla de álbum (cartas descubiertas vs. en
silueta, como un binder de TCG) sobre la mesa de combinar que ya
existe.

## Cómo correrlo localmente

```bash
npx serve .        # o: python3 -m http.server
```
