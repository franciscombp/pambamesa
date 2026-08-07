# Pambamesa

Un cuaderno de viaje coleccionable: combina ingredientes sobre la mesa
para descubrir cartas nuevas — al estilo **Little Alchemy** — y
guárdalas en tu álbum, como un **TCG coleccionable**. Sin clientes, sin
arriendo, sin reloj: solo el gusto de combinar y completar la colección.

Jugable en: https://franciscombp.github.io/pambamesa/

## Cómo funciona

- **Semillas**: empiezas con unos pocos ingredientes base (plátano
  verde, queso, huevo, carne de cerdo) — siempre a mano, como las
  herramientas (cuchillo, olla, pilón, sartén).
- **Taller**: pon dos cartas en la mesa y combínalas. Si hay una fórmula
  para esa pareja, descubres un **hallazgo** (una preparación) o una
  **receta** (un plato terminado) y se guarda en tu álbum.
- **Álbum**: todas las cartas, ordenadas por rareza. Las que aún no
  descubres se ven como el reverso de una carta — con su pista ya
  escrita en el cuaderno, esperando que la resuelvas combinando.

## Arquitectura (heredada de Huecas, adaptada)

| Archivo | Rol |
|---|---|
| `recetario.js` | `GAME_DATA` (ingredientes, recetas con pasos "a + b → resultado", pistas, notas) + `buildCartario()`: el adapter que arma el registro de cartas (`CARTAS`), la tabla de fusión (`RECETAS`) y el orden del álbum (`CARTA_ORDEN`). Agregar una carta nueva es trabajo de datos, no de código. |
| `app.js` | El motor: mesa de dos casillas, combinar, revelar, álbum, guardado. Sin economía, sin cola de clientes. |
| `icons.js` | Ilustraciones acuarela + tinta (heredadas de Huecas), reutilizadas como arte de las cartas. |
| `index.html` / `styles.css` | Cuaderno de viaje andino: tapa de cuero con esquinas de latón, páginas de kraft, cartas con marco de rareza y reverso tejido para lo no descubierto. |

## Cómo correrlo localmente

```bash
npx serve .        # o: python3 -m http.server
```
