/* ============================================================
   FANESCA — modelos/organico.js
   Lo que separa "una esfera amarilla" de "un grano de maíz".

   Ninguna comida es una primitiva. Un ajo tiene lóbulos, un ají se
   curva en S, un pepino se abolla, un tomate se hunde donde va el
   rabito. Cuando todo sale de esferas y cilindros perfectos, el ojo
   lo lee como juguete de plástico por más que el material sea mate
   — la silueta lo delata antes que el brillo.

   Aquí viven tres deformaciones que se le aplican a la geometría
   UNA VEZ, al construirla:

     abollar()  — bollos suaves, como amasado a mano
     curvar()   — la panza de un ají o un pepino
     achatar()  — apoyado en la mesa, no flotando redondo

   Son baratas porque corren al armar la pieza, no por cuadro. Y
   como el ruido es determinista (misma semilla, mismo bollo), se
   pueden precalcular unas cuantas variantes y reusarlas: 126 granos
   de choclo con cinco formas distintas se ven irregulares y cuestan
   cinco geometrías, no ciento veintiséis.
   ============================================================ */

/* Ruido suave y determinista, sin dependencias. No es Perlin: es una
   suma de senos cruzados en 3D. Para abollar comida es de sobra —
   lo que se necesita es que sea continuo (sin saltos que rompan la
   malla) y repetible. */
function ruido(x, y, z, semilla = 0) {
  const s = semilla * 1.37;
  return (
    Math.sin(x * 1.7 + y * 2.3 + s) * Math.cos(y * 1.9 - z * 2.1 + s) * 0.6 +
    Math.sin(z * 2.7 + x * 1.3 - s) * Math.cos(x * 2.9 + y * 1.1 + s) * 0.4
  );
}

/* ---------- abollar ----------
   Empuja cada vértice a lo largo de su NORMAL según el ruido. El
   resultado es una superficie amasada: bollos anchos y suaves, no
   picos. `escala` manda el tamaño del bollo (baja = bollos grandes),
   `fuerza` cuánto sobresalen — en unidades del mundo, no en
   proporción.

   Que sea la normal y no el radio desde el origen importa en todo lo
   que no sea una esfera. En una esfera dan igual; en una vaina de
   fréjol —larga y flaca— escalar desde el origen alarga las puntas
   en vez de abollar los costados, y la vaina sale lisa como una
   salchicha por más fuerza que se le ponga. Era exactamente lo que
   pasaba. */
export function abollar(geo, opts = {}) {
  const fuerza = opts.fuerza != null ? opts.fuerza : 0.06;
  const escala = opts.escala != null ? opts.escala : 2.6;
  const semilla = opts.semilla || 0;

  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const d = ruido(x * escala, y * escala, z * escala, semilla) * fuerza;
    pos.setXYZ(i, x + nor.getX(i) * d, y + nor.getY(i) * d, z + nor.getZ(i) * d);
  }
  pos.needsUpdate = true;
  /* recalcular: si no, la luz sigue creyendo que es una esfera lisa
     y los bollos no se ven — que es el error clásico al deformar */
  geo.computeVertexNormals();
  return geo;
}

/* ---------- curvar ----------
   La panza. Desplaza a lo largo de `hacia` en proporción al cuadrado
   de la posición en `eje`: da un arco parejo, no un codo. Es lo que
   convierte un cilindro en un ají y una cápsula en una vaina que se
   ve arrancada de la mata y no impresa en 3D. */
export function curvar(geo, opts = {}) {
  const eje = opts.eje || 'y';
  const hacia = opts.hacia || 'z';
  const k = opts.k != null ? opts.k : 0.25;
  const pos = geo.attributes.position;
  const leer = { x: pos.getX.bind(pos), y: pos.getY.bind(pos), z: pos.getZ.bind(pos) };

  for (let i = 0; i < pos.count; i++) {
    const t = leer[eje](i);
    const v = leer[hacia](i);
    const nuevo = v + t * t * k;
    if (hacia === 'x') pos.setX(i, nuevo);
    else if (hacia === 'y') pos.setY(i, nuevo);
    else pos.setZ(i, nuevo);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ---------- gajos ----------
   Los lomos que dan la vuelta a una calabaza, a un ajo, a un
   zapallo. No son ruido: son REGULARES, y esa regularidad es la
   firma. Con `abollar` solo, un zapallo sale con bollos al azar y se
   lee como pan; con gajos se lee como zapallo desde la silueta,
   antes de mirarle el color.

   El radio máximo no cambia —los gajos cavan valles, no levantan
   crestas—, así que la pieza sigue midiendo lo que medía y nada de
   lo que el juego calcule con su radio se entera. */
export function gajos(geo, opts = {}) {
  const n = opts.n != null ? opts.n : 8;
  const hondura = opts.hondura != null ? opts.hondura : 0.05;
  const eje = opts.eje || 'y';
  const a = eje === 'y' ? 'x' : 'y';
  const b = eje === 'z' ? 'y' : 'z';
  const pos = geo.attributes.position;
  const leer = { x: (i) => pos.getX(i), y: (i) => pos.getY(i), z: (i) => pos.getZ(i) };
  const poner = { x: (i, v) => pos.setX(i, v), y: (i, v) => pos.setY(i, v), z: (i, v) => pos.setZ(i, v) };

  for (let i = 0; i < pos.count; i++) {
    const u = leer[a](i), v = leer[b](i);
    const r = Math.hypot(u, v);
    if (r < 1e-6) continue;
    const th = Math.atan2(u, v);
    const k = 1 - hondura * (1 - Math.cos(th * n)) / 2;
    poner[a](i, u * k);
    poner[b](i, v * k);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ---------- achatar ----------
   Aplasta la parte de abajo, como se aplasta lo que lleva rato
   apoyado. Sin esto, una lenteja sobre la tabla se ve flotando
   aunque esté tocándola. */
export function achatar(geo, opts = {}) {
  const desde = opts.desde != null ? opts.desde : -0.45;
  const dureza = opts.dureza != null ? opts.dureza : 0.55;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < desde) pos.setY(i, desde + (y - desde) * (1 - dureza));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ---------- el almacén de formas ----------
   Deformar cuesta, y hay piezas que salen por decenas: 126 granos en
   un choclo, 58 lentejas en la mesa. Se precalculan unas pocas
   variantes y se reparten — el ojo no distingue cinco formas
   repartidas al azar de ciento veintiséis distintas, pero la memoria
   y el tiempo de armado sí. */
const almacen = new Map();

export function forma(clave, hacer) {
  let g = almacen.get(clave);
  if (!g) {
    g = hacer();
    /* la marca que le dice al motor "esta no la tires al descargar el
       nivel": es de todos y sobrevive entre partidas */
    g.userData.compartida = true;
    almacen.set(clave, g);
  }
  return g;
}

/* varias variantes de la misma pieza, repartidas por índice */
export function formaVariada(clave, n, i, hacer) {
  const k = ((i % n) + n) % n;
  return forma(clave + ':' + k, () => hacer(k));
}

/* al cambiar de nivel no hace falta tirar esto: las formas son
   inmutables y se reusan entre partidas. Pero si algún día hace
   falta (memoria, pruebas), aquí está la puerta. */
export function olvidarFormas() { almacen.clear(); }
