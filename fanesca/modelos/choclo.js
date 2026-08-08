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
import { abollar, achatar, curvar, formaVariada, forma } from './organico.js';

/* ---------- la rejilla: la medida compartida ---------- */

export const A = 14;             /* hileras alrededor de la tusa */
export const P = 9;              /* granos a lo largo de cada hilera */
export const R = 0.46;           /* radio de la mazorca */
export const PASO = 0.208;       /* separación entre granos a lo largo */
export const LARGO = P * PASO;

/* la mazorca es más gorda al medio que en las puntas */
export const perfil = (u) => 0.80 + 0.20 * Math.sin(Math.PI * u);
export const uDe = (p) => (p + 0.5) / P;

/* Dónde va el grano (a, p): ángulo, radio y altura.

   AL TRESBOLILLO. Las hileras impares van media posición más
   arriba. En un choclo de verdad los granos no forman una cuadrícula
   sino un damero encajado —cada grano se mete en el hueco de sus dos
   vecinos— y esa es LA señal que hace que el ojo lea "maíz" y no
   "burbujas en cuadrícula". Es medio renglón de código y cambia todo.

   Ojo: esto mueve el grano en pantalla, no en la rejilla. La lógica
   sigue hablando de (a, p) y la regla del vecino ausente no se
   entera — que es justamente por qué la rejilla es lógica y no
   geométrica. */
export const TRESBOLILLO = 0.5;   /* medio paso de desfase por hilera */

export function posicionDe(a, p) {
  const th = (a / A) * Math.PI * 2;
  const r = R * perfil(uDe(p));
  const h = (p - (P - 1) / 2) * PASO + (a % 2 ? PASO * TRESBOLILLO : 0);
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
  /* Seis formas amasadas, repartidas entre los 126 granos del
     choclo. Cada una es una esfera abollada y con la base achatada
     —como el grano que se aprieta contra la tusa y sus vecinos— y
     ninguna es la misma esfera perfecta que delataría el plástico.
     Se precalculan: seis geometrías para ciento veintiséis granos.
     12×9 y no 9×7 de resolución, porque a este tamaño el grano es
     lo que más se mira y el contorno poligonal se acusa. */
  const geo = formaVariada('grano-choclo', 6, variante, (k) =>
    achatar(
      abollar(new THREE.SphereGeometry(1, 12, 9), { fuerza: 0.09, escala: 2.2, semilla: k }),
      { desde: -0.55, dureza: 0.4 },
    ));
  const cuerpo = new THREE.Mesh(geo, brillante(THREE, color));
  /* Gordo y asomado. En el eje local del grano: X es el ancho a lo
     largo de la hilera, Y lo alto del choclo, Z lo que sobresale.
     Se pasan del paso de la rejilla a propósito — los granos de un
     choclo se aprietan entre sí, no se rozan. Y cada uno con su
     genio: ni dos granos reales son iguales. */
  const e = m.escala * (0.96 + Math.random() * 0.08);
  cuerpo.scale.set(
    (punta ? 0.108 : 0.124) * e,
    (punta ? 0.112 : 0.132) * e,
    (punta ? 0.10 : 0.126) * e,
  );
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

/* Cinco y no siete. Con siete la envoltura abierta se veía una
   lechuga —y tapaba la batea y la composta al desplegarse—; con
   cinco quedan hojas anchas y separadas, que es como se ve un
   choclo pelado de verdad. De paso, deshojar son cinco jalones y
   no siete: lo mismo contado, sin la repetición de más. */
export const HOJAS = 5;
/* Sobresale del choclo lo justo para taparlo con margen. Más larga
   y, al abrirse, la punta se acuesta encima de los cuencos. */
export const LARGO_HOJA = LARGO + 0.8;
export const BASE_HOJA = -LARGO / 2 - 0.42;   /* de dónde nace la hoja */

/* Dónde deja la hoja de tapar choclo y empieza a ser solo punta.
   Se calcula, no se elige a ojo: es la altura de la punta de la
   mazorca traducida a la coordenada de la hoja. De aquí depende que
   no se vea un grano antes de tiempo — el cierre en punta NO puede
   empezar antes, o la hoja se mete por dentro de los granos de
   arriba y los deja asomando con el choclo todavía cerrado. Que es
   exactamente lo que pasaba cuando el umbral era un 0.76 puesto a
   mano. */
export const U_PUNTA = (LARGO / 2 - BASE_HOJA) / LARGO_HOJA;

export function radioHoja(u) {
  /* de la punta para arriba: ya no hay choclo debajo, la hoja se
     cierra en pico. Cuadrático, para que salga un pico afilado y no
     un cono de fiesta. */
  if (u >= U_PUNTA) {
    const t = (u - U_PUNTA) / (1 - U_PUNTA);
    const r0 = R * perfil(1) + 0.19;
    return r0 * (1 - Math.pow(t, 1.7) * 0.93) + 0.02;
  }
  const yLocal = BASE_HOJA + u * LARGO_HOJA;
  const uCob = Math.max(0, Math.min(1, (yLocal + LARGO / 2) / LARGO));
  /* pegada a la panza del choclo, siempre por fuera del grano */
  const cuerpo = R * perfil(uCob) + 0.19;
  /* la culata: por debajo del primer grano las hojas se recogen
     hacia el tallo. Sin esto el choclo se apoya en un faldón acampanado
     —más ancho abajo que al medio— que es la silueta de un jarrón, no
     la de una mazorca. */
  if (yLocal < -LARGO / 2) {
    const t = Math.min(1, (-LARGO / 2 - yLocal) / 0.42);
    return cuerpo * (1 - 0.46 * t * t);
  }
  return cuerpo;
}

/* Cuántos NUDOS tiene la hoja. Una hoja de choclo no se abre como
   una tapa con bisagra: se va curvando, y la punta siempre va más
   abierta que la base. Con un solo pivote eso es imposible — sale
   una aleta rígida. Con tres eslabones encadenados, cada uno girando
   un poco menos que el anterior, la hoja se enrolla hacia afuera y
   el gesto pasa de "se abrió una compuerta" a "la estoy pelando". */
export const NUDOS = 3;

/* una banda de la hoja, de u0 a u1 del largo total */
function geoBandaDeHoja(THREE, n, u0, u1, arc) {
  const alto = (u1 - u0) * LARGO_HOJA;
  const g = new THREE.CylinderGeometry(1, 1, alto, 9, 6, true, -arc / 2, arc);
  g.translate(0, alto / 2, 0);   /* nace en y=0, crece hacia +Y */
  const pos = g.attributes.position;
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
    /* u global dentro de la hoja entera, para que el perfil sea
       continuo entre bandas y no se vea el corte */
    const u = Math.max(0, Math.min(1, u0 + (y / alto) * (u1 - u0)));
    /* la nervadura: la hoja no es un casquete liso, tiene costillas
       a lo largo. Ondular el radio según el ángulo las dibuja sin
       costar un solo triángulo de más. */
    const ang = Math.atan2(x, z);
    /* La nervadura central levantada es lo que separa una hoja de la
       siguiente. Sin ella las cinco hojas se funden en una vaina lisa
       —se veía un pod verde, no un choclo envuelto— porque el traslape
       es tan generoso que los bordes no se leen. Con el lomo al medio,
       cada hoja tiene su propia luz y el ojo cuenta cinco. */
    const borde = Math.min(1, Math.abs(ang) / (arc / 2));
    const lomo = Math.cos(borde * Math.PI / 2);      /* 1 al centro, 0 al borde */
    const nervio = 1 + lomo * 0.050 + Math.cos(ang * 11) * 0.009;
    const r = radioHoja(u) * nervio;
    /* Y SE AFINA HACIA LA PUNTA. Sin esto la hoja mantiene el mismo
       ancho de arriba abajo y, una vez abierta, se lee como una
       placa — que es exactamente lo que la delataba.

       Pero mientras la hoja tape choclo hay un piso que no puede
       cruzar: las cinco tienen que solaparse entre sí, y con el
       traslape de 1.46 eso es 1/1.46 ≈ 0.69 del arco. Por debajo de
       ahí se abren rendijas y se ven los granos con el choclo
       todavía cerrado — se regala el descubrimiento antes de que el
       jugador jale nada. Pasada la punta ya no tapa nada y puede
       adelgazar libre hasta terminar en hoja de verdad. */
    const t = Math.max(0, (u - 0.42) / (1 - 0.42));
    /* el piso baja EN RAMPA, no de un escalón: cortarlo de golpe en
       la punta abría dos muescas oscuras en los hombros del choclo */
    const tp = u < U_PUNTA ? 0 : (u - U_PUNTA) / (1 - U_PUNTA);
    const piso = 0.80 - 0.50 * tp * tp;
    const afila = Math.max(piso, 1 - 0.72 * t * t);
    const a2 = ang * afila;
    pos.setX(k, Math.sin(a2) * r);
    pos.setZ(k, Math.cos(a2) * r);
  }
  g.computeVertexNormals();
  return g;
}

/* Las cinco hojas tienen exactamente la misma geometría —solo cambian
   de color y de ángulo—, así que la banda se calcula una vez por
   tramo y se reparte: tres geometrías en vez de quince, y el vuelto
   es medio segundo menos armando cada choclo. */
function bandaDeHoja(THREE, n, u0, u1, arc, material) {
  const geo = forma('hoja-choclo-banda:' + n, () => geoBandaDeHoja(THREE, n, u0, u1, arc));
  return new THREE.Mesh(geo, material);
}

registrar('hoja-choclo', (THREE, opts = {}) => {
  const i = opts.indice || 0;
  /* con traslape holgado: las hojas se tapan entre sí como en el
     choclo real, y de paso cubren lo que el afinado les quita */
  const arc = (Math.PI * 2 / HOJAS) * 1.46;
  const paleta = COMIDA.hoja_choclo;
  const material = mate(THREE, paleta[i % paleta.length], { side: THREE.DoubleSide });

  /* la cadena: nudo0 en la base, y cada nudo cuelga del anterior */
  const raizHoja = new THREE.Group();
  raizHoja.name = 'lamina';
  let padre = raizHoja;
  for (let n = 0; n < NUDOS; n++) {
    const u0 = n / NUDOS, u1 = (n + 1) / NUDOS;
    const nudo = new THREE.Group();
    nudo.name = 'nudo' + n;
    /* el primero nace en la base; los demás, donde acabó el anterior */
    if (n > 0) nudo.position.y = LARGO_HOJA / NUDOS;
    const banda = bandaDeHoja(THREE, n, u0, u1, arc, material);
    banda.name = 'banda' + n;
    nudo.add(banda);
    padre.add(nudo);
    padre = nudo;
  }
  return raizHoja;
});

/* ---------- los pelos ----------
   Largos: nacen del choclo y ASOMAN por la punta del cono de
   hojas, para que se vean antes de deshojar y se puedan arrancar
   de un jalón al final. */

const PELOS = 26;

registrar('pelos-choclo', (THREE) => {
  const g = new THREE.Group();
  g.name = 'pelos';
  const paleta = COMIDA.pelo_choclo;

  for (let i = 0; i < PELOS; i++) {
    /* Cinco hebras precalculadas, repartidas. El pelo del choclo NO
       es una púa: sale del choclo, se levanta y se vence por su
       propio peso. Con cilindros rectos el penacho se lee como un
       manojo de palillos —era exactamente lo que se veía—; con la
       curva se lee como pelo. */
    const geo = formaVariada('pelo-choclo', 5, i, (k) => {
      /* Ni palillos largos ni un mechón diminuto: el penacho es lo
         que hay que agarrar para arrancarlo, así que tiene que dar
         blanco cómodo para un dedo. Con 0.34 el manojo entero cabía
         en una franja de 40px y había que apuntarle. */
      const largo = 0.46 + k * 0.06;
      const c = new THREE.CylinderGeometry(0.0035, 0.010, largo, 5, 9);
      c.translate(0, largo / 2, 0);          /* nace en y=0 */
      /* el desvío crece con el CUADRADO de la altura: abajo sale casi
         recto y arriba se vence. Con k bajo el pelo apenas se inclina
         y sigue leyéndose como palillo — hace falta que la punta se
         caiga de verdad, del orden de medio largo. */
      return curvar(c, { eje: 'y', hacia: 'z', k: 1.5 + k * 0.3 });
    });

    /* cada hebra cuelga de su propio nodo girado: así la curva
       (que va hacia +Z) se vence siempre hacia afuera */
    const nodo = new THREE.Group();
    /* el ángulo áureo: reparte sin alinearse nunca, que es lo que
       hace que un penacho se vea enredado y no peinado */
    const th = i * 2.39996;
    nodo.rotation.y = th;
    nodo.position.y = LARGO / 2 + 0.26 + Math.random() * 0.12;

    const h = new THREE.Mesh(geo, mate(THREE, paleta[i % paleta.length]));
    h.position.z = 0.012 + Math.random() * 0.055;
    h.rotation.x = 0.06 + Math.random() * 0.34;
    h.name = 'pelo' + i;
    nodo.add(h);
    g.add(nodo);
  }

  /* ---- el agarre ----
     Veintiséis hebras de tres milímetros dejan más aire que pelo: el
     dedo cae entre dos y no pasa nada. Esta campana invisible le da
     al penacho el blanco que su silueta promete. No se pinta (opacidad
     cero) pero SÍ la ve el rayo — que es justo lo que hace falta.
     Sin `ignorar`, a propósito: es el objetivo, no decoración. */
  const agarre = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  agarre.position.y = LARGO / 2 + 0.5;
  agarre.scale.set(1, 0.85, 1);
  agarre.name = 'agarre';
  g.add(agarre);

  return g;
});
