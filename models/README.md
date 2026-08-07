# models/ — los modelos 3D del mesón

El mesón 3D (`escena3d.js`) intenta cargar `models/<id>.glb` para cada
cosa que pongas sobre la tabla. Si el archivo no existe, usa el icono
SVG del juego como sprite — así que puedes ir soltando modelos aquí
uno a uno (por ejemplo, generados con **Meshy.ai**) y el juego los
adopta solos, sin tocar código.

## Convención

- Formato: **glTF binario (`.glb`)**, un archivo por id.
- Nombre: exactamente el id interno de la carta, p. ej. `verde.glb`.
- La escena normaliza sola el tamaño y lo apoya sobre la tabla, así
  que no importa la escala con la que exportes.
- Presupuesto sugerido (es un juego móvil): **≤ 15k triángulos y
  textura ≤ 1024px** por modelo. En Meshy usa el preset low-poly /
  game-ready si está disponible.

## Ids esperados

Ingredientes: `verde`, `queso`, `huevo`, `cerdo`, `papa`, `maiz`, `hoja`

Utensilios: `cuchillo`, `olla`, `pilon`, `sarten`, `molino`

Preparaciones: `verde_pelado`, `verde_cocido`, `masa_verde`,
`bolon_crudo`, `chicharron`, `masa_mixta`, `bolon_mixto_crudo`,
`tigrillo_base`, `papa_cocida`, `masa_llapingacho`,
`llapingacho_relleno`, `maiz_preparado`, `mezcla_humita`,
`humita_envuelta`

Platillos: `bolon`, `bolon_mixto`, `tigrillo`, `llapingacho`, `humita`

Extra: `mezcla_rara` — el engrudo humeante que aparece cuando una
combinación falla y que se bota al basurero.

(La lista crece con cada región nueva: cualquier id nuevo en
`recetario.js` busca automáticamente su `.glb` aquí.)
