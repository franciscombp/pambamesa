/* ============================================================
   FANESCA — modelos/choclo.js
   Las piezas del choclo: el grano, la tusa, la hoja y los pelos.

   ------------------------------------------------------------
   LA MEDIDA MANDA, Y ESTÁ AQUÍ

   Este archivo define la GEOMETRÍA del choclo: cuántas hileras
   tiene, qué tan gordo es al medio, dónde cae cada grano. El
   nivel importa esas medidas y las usa para su lógica (la regla
   del vecino ausente, la cascada, dónde se esconde el gusanito).

   Está así a propósito: la forma y las posiciones son lo mismo.
   Si en Blender esculpes un grano más gordo, cambias PASO aquí y
   todo —el modelo, la rejilla y la lógica— se entera a la vez.
   Si estuvieran en dos sitios, un día no coincidirían y los
   granos se encimarían sin que nadie supiera por qué.

   ------------------------------------------------------------
   PARTES NOMBRADAS (para que un .glb encaje)

     grano-choclo → 'cuerpo'  (la que cambia de color y de escala)
     tusa         → una malla suelta, sin partes
     hoja-choclo  → 'lamina'
     pelos-choclo → pelo0 … peloN
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';

/* ---------- la rejilla: la medida compartida ---------- */

export const A = 14;             /* hileras alrededor de la tusa */
export const P = 9;              /* granos a lo largo de cada hilera */
export const R = 0.46;           /* radio de la mazorca */
export const PASO = 0.208;       /* separación entre granos a lo largo */
export const LARGO = P * PASO;

/* la mazorca es más gorda al medio que en las puntas */
export const perfil = (u) => 0.80 + 0.20 * Math.sin(Math.PI * u);
export const uDe = (p) => (p + 0.5) / P;

/* dónde va el grano (a, p): ángulo, radio y altura */
export function posicionDe(a, p) {
  const th = (a / A) * Math.PI * 2;
  const r = R * perfil(uDe(p));
  const h = (p - (P - 1) / 2) * PASO;
  return { th, r, h };
}

/* ---------- los dos temperamentos del choclo ----------
   No es solo color: el tierno cede casi solo pero revienta si
   pasas el dedo con fuerza; el duro no revienta nunca pero sus
   granos trabados aguantan el doble. La diferencia se ve —por eso
   vive con el modelo— y se juega —por eso el nivel la lee. */

export const MADUREZ = {
  tierno: {
    id: 'tierno', resistencia: 2, escala: 1.06,
    paleta: COMIDA.choclo_tierno,
    punta: COMIDA.choclo_tierno_punta,
    tusa: COMIDA.choclo_tierno_tusa,
    cascada: 0.038,
    presenta: 'Está <b>tierno</b>: cede solito, pero con fuerza el grano revienta.',
  },
  duro: {
    id: 'duro', resistencia: 5, escala: 0.94,
    paleta: COMIDA.choclo_duro,
    punta: COMIDA.choclo_duro_punta,
    tusa: COMIDA.choclo_duro_tusa,
    cascada: 0.08,
    presenta: 'Este está <b>duro</b>: no revienta, pero los trabados pelean.',
  },
};

/* ---------- el grano ----------
   Se pide con su madurez y si es de punta. Un pelo más ancho que
   el paso de la rejilla: así se aprietan entre sí como en la
   mazorca de verdad y no se ve la tusa entre medio. */

registrar('grano-choclo', (THREE, opts = {}) => {
  const m = MADUREZ[opts.madurez] || MADUREZ.tierno;
  const punta = !!opts.punta;
  const variante = opts.variante || 0;

  const g = new THREE.Group();
  g.name = 'grano';
  const color = punta ? m.punta : m.paleta[variante % m.paleta.length];
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), brillante(THREE, color));
  /* cada grano con su genio: ni dos granos de un choclo real son iguales */
  const e = m.escala * (0.96 + Math.random() * 0.08);
  cuerpo.scale.set(0.115 * e, (punta ? 0.115 : 0.135) * e, (punta ? 0.09 : 0.108) * e);
  cuerpo.rotation.z = (Math.random() - 0.5) * 0.14;
  cuerpo.name = 'cuerpo';
  g.add(cuerpo);
  return g;
}, { variante: (o) => '-' + (MADUREZ[o.madurez] ? o.madurez : 'tierno') });

/* ---------- la papilla ----------
   El grano tierno reventado. Se queda pegado a la tusa, traba la
   hilera y hay que limpiarlo aparte: reventar no es un atajo, es
   el desvío. */

registrar('papilla-choclo', (THREE) => {
  const splat = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 6),
    mate(THREE, COMIDA.choclo_papilla)
  );
  splat.scale.set(0.135, 0.04, 0.115);
  splat.name = 'papilla';
  return splat;
});

/* ---------- la tusa ----------
   El corazón de la mazorca, con su tallito corto abajo para que
   se lea como choclo y no como mango de escoba. */

registrar('tusa', (THREE, opts = {}) => {
  const m = MADUREZ[opts.madurez] || MADUREZ.tierno;
  const pts = [];
  const N = 26;
  const largo = LARGO + PASO * 0.9;
  pts.push(new THREE.Vector2(0.004, -largo / 2 - 0.5));
  pts.push(new THREE.Vector2(0.1, -largo / 2 - 0.46));
  pts.push(new THREE.Vector2(0.125, -largo / 2 - 0.12));
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let r = R * perfil(u) * 0.90;
    if (u < 0.07) r = 0.125 + (r - 0.125) * (u / 0.07);
    if (u > 0.93) r *= (1 - u) / 0.07;
    pts.push(new THREE.Vector2(Math.max(0.004, r), (u - 0.5) * largo));
  }
  const t = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), mate(THREE, m.tusa));
  t.name = 'tusa';
  return t;
}, { variante: (o) => '-' + (MADUREZ[o.madurez] ? o.madurez : 'tierno') });

/* ---------- las hojas ----------
   Siguen la panza del choclo, se abren en faldón abajo y cierran
   en punta arriba. Van POR FUERA del grano (que asoma hasta
   R·perfil + ~0.14): si no, los granos las atraviesan y el choclo
   nunca se ve cerrado. */

export const HOJAS = 7;
export const LARGO_HOJA = LARGO + 1.15;
export const BASE_HOJA = -LARGO / 2 - 0.42;   /* de dónde nace la hoja */

export function radioHoja(u) {
  const yLocal = BASE_HOJA + u * LARGO_HOJA;
  const uCob = Math.max(0, Math.min(1, (yLocal + LARGO / 2) / LARGO));
  const cuerpo = R * perfil(uCob) + 0.19;
  const faldon = u < 0.16 ? (0.16 - u) / 0.16 * 0.13 : 0;      /* abierta abajo */
  const cierre = u > 0.76 ? (u - 0.76) / 0.24 : 0;             /* punta arriba */
  return (cuerpo + faldon) * (1 - cierre * 0.92) + 0.05 * cierre;
}

registrar('hoja-choclo', (THREE, opts = {}) => {
  const i = opts.indice || 0;
  /* con traslape: las hojas se tapan entre sí como en el choclo real */
  const arc = (Math.PI * 2 / HOJAS) * 1.32;
  const g = new THREE.CylinderGeometry(1, 1, LARGO_HOJA, 7, 12, true, -arc / 2, arc);
  g.translate(0, LARGO_HOJA / 2, 0);
  const pos = g.attributes.position;
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
    const u = Math.max(0, Math.min(1, y / LARGO_HOJA));
    const len = Math.hypot(x, z) || 1;
    const r = radioHoja(u);
    pos.setX(k, x / len * r);
    pos.setZ(k, z / len * r);
  }
  g.computeVertexNormals();

  const paleta = COMIDA.hoja_choclo;
  const malla = new THREE.Mesh(g, mate(THREE, paleta[i % paleta.length], { side: THREE.DoubleSide }));
  malla.name = 'lamina';
  return malla;
});

/* ---------- los pelos ----------
   Largos: nacen del choclo y ASOMAN por la punta del cono de
   hojas, para que se vean antes de deshojar y se puedan arrancar
   de un jalón al final. */

registrar('pelos-choclo', (THREE) => {
  const g = new THREE.Group();
  g.name = 'pelos';
  const paleta = COMIDA.pelo_choclo;
  for (let i = 0; i < 20; i++) {
    const largo = 0.7 + Math.random() * 0.25;
    const h = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.014, largo, 4),
      mate(THREE, paleta[i % paleta.length])
    );
    const th = (i / 20) * Math.PI * 2;
    const rr = 0.02 + Math.random() * 0.06;
    h.position.set(Math.sin(th) * rr, LARGO / 2 + 0.4 + Math.random() * 0.08, Math.cos(th) * rr);
    h.rotation.set(Math.cos(th) * (0.14 + Math.random() * 0.2), 0, -Math.sin(th) * (0.14 + Math.random() * 0.2));
    h.name = 'pelo' + i;
    g.add(h);
  }
  return g;
});
