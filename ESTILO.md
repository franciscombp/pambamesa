# Guía de estilo — Pambamesa

Documento vivo. Cualquier pantalla nueva se mide contra esto antes de darse
por terminada.

---

## 1. La idea en una frase

**Estás cocinando de verdad sobre una encimera vista desde arriba, no
llenando un formulario.** Todo lo que se puede tocar es un objeto —una
olla, un plátano, un cuchillo— y se manipula directamente: se arrastra,
se suelta, se toca. Los botones son el último recurso, no el primero.

---

## 2. Referencias

Guardadas en `referencias/`. La familia visual es la de los juegos de
cocina contemplativos tipo *Venba* / *Cooking Simulator* ilustrado:
plano cenital, pintado a mano, cálido y saturado.

| Archivo | Qué tomamos de ahí |
|---|---|
| `ref-encimera-cenital.webp` | **La referencia madre.** Plano cenital de la encimera: la olla al centro sobre la hornilla, los ingredientes en cuencos regados alrededor, el recetario abierto a un lado. Nada está "en un panel": todo descansa sobre la mesa. Hay una mano/cursor que agarra las cosas. |
| `ref-fogon-vapor.webp` | La cocción como espectáculo: la hornilla oscura, el calor tiñendo el metal, el vapor. El momento de cocinar merece luz y color propios. |
| `ref-mesa-servida.webp` | La paleta de la comida: rosas, corales, morados profundos, dorados. Los platos son lo más saturado de la pantalla. La mesa es el fondo, la comida es la estrella. |
| `ref-recetario-anotado.jpeg` | El recetario: papel real sobre la escena, dibujos a mano alzada, texto escrito a mano con **palabras clave en color**. No es una tabla de datos, es el cuaderno de alguien. |

---

## 3. Paleta

La mesa es cálida y rosada; la comida es lo saturado; el fogón es lo
oscuro y dramático.

```
--mesa           #e8a596   coral de la encimera (fondo dominante)
--mesa-clara     #f2bfae   veta clara de la madera pintada
--mesa-honda     #cf8172   sombra bajo los objetos
--mantel         #f6d9c8   los paños y superficies claras

--fogon          #4a3550   el morado profundo de la hornilla
--fogon-brasa    #d95f43   el calor cuando algo se está cocinando

--crema          #fdf0e2   el papel del recetario
--tinta          #4a2f3d   el texto escrito a mano
--tinta-suave    #8a6472

  rarezas (heredadas, reafinadas hacia la paleta cálida)
--ingrediente    #d97b5c   coral tostado
--preparacion    #7ba05b   verde hoja
--receta         #e8a33d   dorado de fritura
--utensilio      #6d5a7a   morado de metal
```

**Regla de saturación:** la comida (los iconos) siempre más saturada que
la superficie sobre la que descansa. Si un ingrediente se pierde contra
la mesa, la mesa está muy fuerte, no el ingrediente muy débil.

---

## 4. Tipografía

- **Títulos y nombres de plato:** `Lora` — tiene la calidez de un libro
  de cocina impreso.
- **Voz de la abuela / anotaciones / pistas:** `Caveat` — es la letra a
  mano del recetario. Se usa para todo lo que *alguien escribió*, nunca
  para lo que *el sistema informa*.
- **Datos secos** (cantidades, contadores): `Lora` pequeño, nunca a mano.

---

## 5. Interacción — la regla principal

> **Si es un objeto, se toca o se arrastra. Si es una decisión, se
> confirma con un botón.**

### Lo que se arrastra
- Ingredientes de la encimera → a la olla.
- Utensilios de la repisa → a la olla. **Soltar un utensilio sobre una
  olla que ya tiene algo cocina de una vez**, sin botón de confirmar:
  es el gesto natural, ya dijiste lo que querías hacer.
- Las cartas al revelarse (giro 3D + swipe).

La olla perdona: acepta lo que se suelte hasta ~26 px fuera de su
borde. Apuntar fino no debe ser parte del reto.

### Lo que se toca
- Un objeto en la encimera: un toque lo manda a la olla (atajo para
  quien no quiera arrastrar — **el arrastre nunca es obligatorio**).
- La canasta de la feria: se abre tocándola, sin botón aparte.
- Un plato del álbum: abre su ficha.
- La olla: si tiene algo, lo devuelve a la mesa.

### Lo que sigue siendo botón
- Cocinar dos ingredientes (no hay gesto que lo diga solo).
- Cerrar un modal.
- Comprar en el mercado, escuchar el pregón.

### Ayudas que reemplazan instrucciones
- Los utensilios que sirven para lo que hay en la olla **brillan
  solos** (`.objeto.sugerido`). Nadie tiene que adivinar ni leer.
- La brasa de la hornilla se enciende cuando la mezcla sí lleva a
  algo. El fogón dice "esto va a funcionar" antes de tocar nada.

### Prohibido
- Un botón que solo sirve para "abrir el cajón donde están las cosas".
  Las cosas ya deben estar sobre la mesa.
- Listas de texto donde podría haber objetos dibujados.
- **Animar el elemento que se toca.** Si algo flota (la canasta), lo
  que se mueve es el dibujo de adentro, nunca el área táctil: un
  blanco móvil se falla con el dedo.
- `justify-content: flex-end` en un contenedor con `overflow` — recorta
  el principio de la lista y lo deja inalcanzable.

---

## 6. Física y peso

Nada aparece de golpe ni se mueve en línea recta.

- **Aterrizar** un objeto: `cubic-bezier(.3, 1.6, .4, 1)` — rebota un
  poco, como algo que cae sobre madera.
- **Levantar** (mientras se arrastra): sube de escala (~1.15), la sombra
  crece y se difumina. El objeto flota sobre la escena.
- **Soltar** en un sitio válido: la olla hace un `scale` corto y suelta
  vapor.
- **Rechazo**: sacudida horizontal corta, nunca un modal de error.
- Todo objeto sobre la mesa tiene **sombra elíptica difusa** debajo. Sin
  sombra, un objeto cenital se ve pegado como sticker.

---

## 7. El fogón

Es el único punto oscuro de la pantalla, y por eso atrae la mirada.

- Hornilla morada profunda (`--fogon`) sobre la mesa coral.
- Cuando hay algo dentro, la olla **respira** (escala lenta) y sale
  vapor.
- Cuando la mezcla es válida y se puede cocinar, la brasa se enciende
  (`--fogon-brasa`) alrededor de la hornilla.
- Cocinar da un fogonazo de luz + vapor antes de revelar el resultado.

---

## 8. Sonido y vibración

Ya existe un motor mínimo (`sfx`/`buzz`). Cada gesto físico tiene su
contraparte sonora:

| Gesto | Sonido | Vibración |
|---|---|---|
| Levantar un objeto | `tab` corto | 8 ms |
| Soltarlo en la olla | `peel` | 12 ms |
| Cocinar bien | `win` | patrón 30/40/60 |
| Mezcla que no reacciona | `fail` | 60 ms |

---

## 9. Texto

- En español ecuatoriano, cálido, sin tecnicismos de juego.
- Nunca "combinar elementos": es **cocinar**, **majar**, **freír**.
- Los errores no regañan: *"Estos dos no reaccionan… todavía"*, no
  *"Combinación inválida"*.
- El sistema informa en corto (toast); la abuela y el recetario hablan
  en `Caveat`.

---

## 10. Dónde vive cada cosa

| Pantalla | Qué es | Piezas clave |
|---|---|---|
| Portada | La mesa servida vista desde arriba, los platos regados y el nombre en el mantel del centro | `.portada`, `.portada-mesa`, `.portada-centro` |
| Cocina | La encimera: hornilla al centro, repisas abajo al alcance del pulgar | `.cocina`, `.hornilla`, `.olla`, `.encimera`, `.repisa`, `.objeto` |
| Álbum | Hojas del recetario apoyadas en la mesa, una por región, con su pestaña de color | `.region-seccion`, `.carta` |
| Feria | El puesto: la canasta de mimbre, el mercado y los regalos | `.canasta`, `.mercado-grid`, `.regalos-grid` |

Las fichas y avisos (`.detalle-panel`, `.pista-panel`, `.banner`) son
siempre **papel crema con la cinta roja arriba**: son páginas del
recetario, no ventanas de sistema.

---

## 11. Lista de verificación antes de dar algo por terminado

- [ ] ¿Se puede hacer arrastrando o tocando, en vez de con un botón?
- [ ] ¿Los objetos tienen sombra y se ven apoyados sobre la mesa?
- [ ] ¿Hay algún botón que solo abre un cajón? (quitarlo)
- [ ] ¿La comida es lo más saturado de la pantalla?
- [ ] ¿El movimiento tiene rebote, o es lineal y seco?
- [ ] ¿Funciona igual con un solo toque, sin arrastrar?
- [ ] ¿El área que se toca se queda quieta?
- [ ] ¿Se alcanza todo sin que el scroll recorte nada? (probar en 360×640)
- [ ] ¿El texto suena a persona o a sistema?
