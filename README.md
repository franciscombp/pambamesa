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
  (cuchillo, olla, pilón, sartén).
- **Cocina**: pon dos cosas sobre la estación de acero y combínalas.
  Si hay una fórmula para esa pareja, descubres una **preparación**
  (paso intermedio) o un **platillo** (plato terminado) y se emplata
  en tu recetario.
- **Recetario**: todos los descubrimientos, por región. Lo que aún no
  descubres se ve como un plato cubierto — con su pista lista,
  esperando que la resuelvas combinando.
- **Despensa**: cocinar da sucres; con ellos repones ingredientes o
  abres cajas del mercado cuando la cocina se queda corta.

## Arquitectura (heredada de Huecas, adaptada)

| Archivo | Rol |
|---|---|
| `recetario.js` | `GAME_DATA` (ingredientes, recetas con pasos "a + b → resultado", pistas, notas) + `buildCartario()`: el adapter que arma el registro de cartas (`CARTAS`), la tabla de fusión (`RECETAS`) y el orden del recetario (`CARTA_ORDEN`). Agregar una carta nueva es trabajo de datos, no de código. |
| `app.js` | El motor: estación de dos casillas, combinar, revelar, recetario, guardado. |
| `icons.js` | Ilustraciones acuarela + tinta (heredadas de Huecas), reutilizadas como el emplatado de cada carta. |
| `index.html` / `styles.css` | Plató de cocina profesional: escenario oscuro con foco cenital, estación de acero pulido con franja roja, cartas como platos de porcelana con borde según rareza (acero / cobre / oro) y reverso negro-rojo para lo aún no descubierto. |

## Cómo correrlo localmente

```bash
npx serve .        # o: python3 -m http.server
```
