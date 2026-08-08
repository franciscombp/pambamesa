/* ============================================================
   FANESCA — modelos/paleta.js
   Los colores de las cosas, en un solo sitio.

   Dos reglas:

   1. Lo que existe como token del sistema de diseño se LEE del
      sistema (`token()`), nunca se copia. Así, si mañana cambia la
      paleta del juego, la cocina se repinta sola — que es
      exactamente el error que ya nos costó una vez, cuando el
      minijuego se quedó con los colores de una versión anterior.

   2. Lo que NO existe como token —el amarillo de un grano de
      choclo tierno, el vino de la mota del fréjol— vive aquí y no
      regado por los niveles. Son colores de comida, no de
      interfaz: no tienen por qué estar en design-system.css, pero
      sí tienen que estar juntos.

   Un modelo nunca escribe un `#rrggbb` suelto. Lo pide aquí.
   ============================================================ */

let _raiz = null;

/* un token del sistema de diseño, con respaldo por si se lee antes
   de que el CSS esté puesto */
export function token(nombre, respaldo) {
  if (!_raiz) _raiz = getComputedStyle(document.documentElement);
  return (_raiz.getPropertyValue(nombre) || '').trim() || respaldo;
}

/* Los colores de la comida. No son tokens del sistema porque no son
   interfaz: son el color que tiene un grano de maíz tierno, y ese no
   cambia porque cambie la marca. */
export const COMIDA = {
  /* choclo tierno: amarillo pálido con brillo */
  choclo_tierno: ['#f8d267', '#f6c94b', '#fae09a', '#f3c352', '#fbe084'],
  choclo_tierno_punta: '#fbe9b4',
  choclo_tierno_tusa: '#f8efd6',
  /* choclo duro: más anaranjado y mate */
  choclo_duro: ['#eaa92e', '#e09d24', '#efb84a', '#d99a20', '#f0c25e'],
  choclo_duro_punta: '#f3cf7f',
  choclo_duro_tusa: '#efe3c0',
  choclo_papilla: '#eedda0',
  hoja_choclo: ['#7fa851', '#6f9c47', '#8bb15f'],
  pelo_choclo: ['#d9b06a', '#c59a55'],

  /* habas: la vaina verde y el haba pálida */
  vaina_haba: '#86b45c',
  vaina_haba_dentro: '#e8f0cd',
  haba: '#cfe09b',
  haba_ombligo: '#9bb069',
  hilo_haba: '#5f8a3e',

  /* chochos: piel translúcida, pepa amarilla */
  chocho_piel: '#efe7cd',
  chocho_pepa: '#f5cf58',
  chocho_ombligo: '#c9b184',

  /* fréjol: vaina moteada, grano vino */
  vaina_frejol: '#d9c27a',
  vaina_frejol_dentro: '#f2e7c0',
  frejol: '#c9526a',
  frejol_mota: '#8e3550',

  /* zapallo: piel naranja, pulpa clara, pepas */
  zapallo_piel: '#d98b2b',
  zapallo_pulpa: '#f6b957',
  zapallo_pepa: '#f3e6bc',
  zapallo_guia: '#5b3b1c',

  /* lenteja: la buena, la piedra y la picada */
  lenteja: '#c98a4b',
  lenteja_piedra: '#8d8577',
  lenteja_picada: '#6b543a',
  lenteja_hueco: '#3a2a20',

  /* bacalao: carne salada, carne limpia, piel y sal */
  bacalao_carne: '#ecd8b4',
  bacalao_carne_limpia: '#fbf3e0',
  bacalao_piel: '#6f6a5e',
  bacalao_veta: '#dcc59c',
  sal: '#ffffff',
  cuerda: '#c9a06c',

  /* los bichos */
  gusano: '#a8d05a',
  gusano_oscuro: '#8ab143',
  gusano_zapallo: '#c4e076',
  gusano_zapallo_oscuro: '#9dc24f',
  gorgojo_cuerpo: '#5a4630',
  gorgojo_caparazon: '#7a5c3c',
  gorgojo_oscuro: '#3a2a20',
  gorgojo_cabeza: '#3f3122',
  mosca_cuerpo: '#3c3a3f',
  mosca_cabeza: '#2b2a2e',
  mosca_ojo: '#c0392b',
  mosca_ala: '#eaf4f6',

  /* la utilería del mesón */
  tabla: '#ecc287',
  ojo_blanco: '#fffdf6',
  ojo_negro: '#3a2a20',
};

/* atajos para no repetir `new THREE.MeshLambertMaterial({color})` */
export const mate = (THREE, color, opts = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

/* Apenas satinado: el grano tierno tiene humedad, pero NO es
   plástico.

   Aquí se pasó de rosca una vez y vale dejarlo escrito: buscando que
   se viera jugoso se subió el shininess a 70 con un specular claro, y
   el resultado fue justo lo contrario de apetecible — un reflejo
   chico y duro que grita juguete. La comida en render de arcilla se
   ve rica por la LUZ y la forma, no por el brillo: casi mate
   (shininess 8) y con el specular oscuro y desaturado, que solo
   marca el volumen del grano sin ponerle un punto blanco encima. */
export const brillante = (THREE, color, opts = {}) =>
  new THREE.MeshPhongMaterial({ color, shininess: 8, specular: '#3a3226', ...opts });

/* un material desde un token del sistema */
export const mateToken = (THREE, nombre, respaldo, opts = {}) =>
  mate(THREE, token(nombre, respaldo), opts);
