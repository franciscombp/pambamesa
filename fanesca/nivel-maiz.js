/* ============================================================
   FANESCA — nivel-maiz.js
   DESHOJAR Y DESGRANAR EL CHOCLO.

   El nivel empieza donde empieza de verdad: el choclo llega con
   sus hojas puestas. Se pela jalando cada hoja hacia abajo — el
   mismo gesto con el que se pela de verdad — y al final se le
   arrancan los pelos de un jalón. Recién ahí aparece la rejilla.

   La mazorca es una rejilla cilíndrica: A hileras alrededor × P
   posiciones a lo largo. La regla que hace todo el juego cabe en
   una línea:

       un grano solo sale si tiene un vecino ausente.

   De ahí sale sola la enseñanza: en el centro el grano está
   trabado y hay que forzarlo; en las puntas siempre hay hueco, y
   abierto el primero, arrastrar a lo largo desgrana la hilera en
   cascada.

   Van DOS choclos por olla, y no son iguales — como no lo son en
   el mercado:

     · el TIERNO cede casi solo… pero si pasas el dedo con fuerza
       el grano REVIENTA en papilla. La papilla se queda pegada,
       traba la hilera, y toca limpiarla a mano. Ir rápido aquí
       es ir más lento.
     · el DURO no revienta nunca, pero sus granos trabados
       aguantan el doble de golpes y la cascada corre pesada.

   La mazorca va DE PIE: el teléfono en vertical es la mano.
   Girarla es pasar el dedo de lado, y rueda HACIA el dedo, como
   rodaría de verdad. Y debajo de algún grano hay un gusanito:
   tocarlo lo aplasta (se arruina la olla), dejarlo llegar a la
   batea también. La única salida es cargarlo a la composta.
   ============================================================ */

import { nuevoGusano, ARRUINADO } from './bichos.js';
import { AMAGUANA_MAZORCA } from './historia.js';

let THREE, raiz, api;

/* ---------- la rejilla ---------- */
const A = 14;              /* hileras alrededor de la tusa */
const P = 9;               /* granos a lo largo de cada hilera */
const R = 0.46;            /* radio de la mazorca */
const PASO = 0.208;        /* separación entre granos a lo largo */
const CENTRO = [0, 1.78, 0.12];  /* el choclo en alto, relativo al mesón */
/* La cámara está en x=0 mirando de frente: el ángulo que da la cara
   es 0. (El -0.42 heredado del choclo acostado sesgaba el "frente"
   24° a la izquierda, y el auto-giro dejaba las últimas hileras
   colgadas en el borde de la silueta, casi imposibles de tocar.) */
const FRENTE = 0;

const CHOCLOS = 2;         /* choclos por partida */
const HOJAS = 7;           /* hojas de la envoltura */
const CASCADA_MS = { tierno: 0.038, duro: 0.08 };
const GUSANOS_POR = [1, 2];/* bichos escondidos en cada choclo */
const GUSANO_VEL = 0.52;   /* posiciones por segundo que BAJA el bicho */
/* px/s: más rápido que esto es "con fuerza", y el tierno lo cobra */
const FUERZA = 1600;
/* El bicho sale justo del hueco que acabas de abrir, muchas veces con
   el dedo todavía encima. Sin este respiro, destaparlo sería perder
   sin poder reaccionar. */
const GRACIA = 1.0;

/* los dos temperamentos del choclo */
const MADUREZ = {
  tierno: {
    id: 'tierno', resistencia: 2, escala: 1.06,
    paleta: ['#f8d267', '#f6c94b', '#fae09a', '#f3c352', '#fbe084'],
    punta: '#fbe9b4', tusa: '#f8efd6',
    presenta: 'Está <b>tierno</b>: cede solito, pero con fuerza el grano revienta.',
  },
  duro: {
    id: 'duro', resistencia: 5, escala: 0.94,
    paleta: ['#eaa92e', '#e09d24', '#efb84a', '#d99a20', '#f0c25e'],
    punta: '#f3cf7f', tusa: '#efe3c0',
    presenta: 'Este está <b>duro</b>: no revienta, pero los trabados pelean.',
  },
};

/* la mazorca es más gorda al medio que en las puntas */
const perfil = (u) => 0.80 + 0.20 * Math.sin(Math.PI * u);
const uDe = (p) => (p + 0.5) / P;
const LARGO = P * PASO;
const TOTAL = CHOCLOS * A * P;

let mazorca = null;        /* el choclo de pie: su eje es +Y */
let giro = null;           /* grupo que rota sobre el eje de la mazorca */
let tusa = null;
let granosGrupo = null, gusanosGrupo = null, hojasGrupo = null, pelos = null;
let granos = [];           /* granos[a][p] = Group | null (o papilla) */
let hojas = [];            /* {pivot, mesh, th, ida} */
let gusanos = [];
let cascadas = [];         /* cremalleras corriendo */
let hechos = 0;            /* granos resueltos, acumulado entre choclos */
let choclo = 0;            /* cuál va (0-based) */
let orden = [];            /* madurez de cada choclo, barajada */
let madurez = MADUREZ.tierno;
let fase = 'deshojar';     /* 'deshojar' | 'desgranar' | 'transicion' */

let modo = null;           /* 'peinar' | 'girar' | 'cargar' | 'hoja' */
let giro0 = 0, dx0 = 0, dyPrev = 0, dirActual = 1;
let hojaActiva = null;
let cargado = null;        /* gusano en la mano */
let giroObjetivo = null;   /* a dónde lleva la cámara al bicho */
let girando = 0;           /* botones de girar mantenidos */
let tAuto = 0.6;           /* cada cuánto se revisa el giro automático */
let ultimoPop = 0, avisoCentro = 0, terminado = false;
let corridaActual = 0, dichaCita = false, citaPendiente = false;
const CORRIDA_PARA_LA_CITA = 7;
let reventados = 0, avisadoReventon = false;
let compostaN = 0;         /* cuánto ha caído a la composta (para pintarla) */
let velT = 0, velX = 0, velY = 0;   /* medir la fuerza del dedo */
let transToken = 0;

/* ---------- materiales ---------- */
let matGrano = [], matGranoPunta = null, matTusa = null;
let matHoja = [], matPelo = [], matPapilla = null;

function construirMaterialesFijos() {
  matHoja = ['#7fa851', '#6f9c47', '#8bb15f'].map(c =>
    new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
  matPelo = ['#d9b06a', '#c59a55'].map(c => new THREE.MeshLambertMaterial({ color: c }));
  matPapilla = new THREE.MeshLambertMaterial({ color: '#eeddA0' });
}

function construirMaterialesDelChoclo() {
  /* Phong y no Lambert: el grano tierno brilla, y ese brillito es la
     mitad de las ganas de reventarlo */
  matGrano = madurez.paleta.map(c => new THREE.MeshPhongMaterial({ color: c, shininess: 24, specular: '#5c4a12' }));
  matGranoPunta = new THREE.MeshPhongMaterial({ color: madurez.punta, shininess: 18, specular: '#5c4a12' });
  matTusa = new THREE.MeshLambertMaterial({ color: madurez.tusa });
}

/* ---------- geometría de la mazorca ---------- */

const geoGrano = () => new THREE.SphereGeometry(1, 9, 7);

function posicionDe(a, p) {
  const th = (a / A) * Math.PI * 2;
  const r = R * perfil(uDe(p));
  const h = (p - (P - 1) / 2) * PASO;
  return { th, r, h };
}

function nuevoGrano(a, p, geo) {
  const { th, r, h } = posicionDe(a, p);
  const punta = (p === 0 || p === P - 1);
  const g = new THREE.Group();
  /* apenas asomados: el grano se sienta EN la tusa, no flota sobre ella */
  g.position.set(Math.sin(th) * (r + 0.03), h, Math.cos(th) * (r + 0.03));
  g.rotation.y = th;
  g.userData = { tipo: 'grano', a, p, golpes: 0 };
  const m = new THREE.Mesh(geo, punta ? matGranoPunta : matGrano[(a * 7 + p * 3) % matGrano.length]);
  /* un pelo más anchos que el paso de la rejilla, y cada uno con su
     genio: ni dos granos de un choclo real son iguales */
  const e = madurez.escala * (0.96 + Math.random() * 0.08);
  m.scale.set(0.115 * e, (punta ? 0.115 : 0.135) * e, (punta ? 0.09 : 0.108) * e);
  m.rotation.z = (Math.random() - 0.5) * 0.14;
  g.add(m);
  return g;
}

function construirTusa() {
  const pts = [];
  const N = 26;
  const largo = LARGO + PASO * 0.9;
  /* un tallito corto abajo: de choclo, no de mango de escoba */
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
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), matTusa);
  m.userData = { tipo: 'tusa' };
  return m;
}

/* ---------- las hojas ---------- */

const LARGO_HOJA = LARGO + 1.15;
const BASE_HOJA = -LARGO / 2 - 0.42;   /* de dónde nace la hoja (local al giro) */

/* la hoja sigue la panza del choclo, se abre en faldón abajo y se
   cierra en punta arriba: un cilindro parcial con el radio editado */
function geoHoja(arc) {
  const g = new THREE.CylinderGeometry(1, 1, LARGO_HOJA, 7, 12, true, -arc / 2, arc);
  g.translate(0, LARGO_HOJA / 2, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = Math.max(0, Math.min(1, y / LARGO_HOJA));
    const len = Math.hypot(x, z) || 1;
    const r = radioHoja(u);
    pos.setX(i, x / len * r);
    pos.setZ(i, z / len * r);
  }
  g.computeVertexNormals();
  return g;
}

function radioHoja(u) {
  /* dónde cae este punto de la hoja sobre el cuerpo del choclo.
     El grano asoma hasta R·perfil + ~0.14: la hoja va POR FUERA de
     eso, o los granos la atraviesan y el choclo nunca se ve cerrado */
  const yLocal = BASE_HOJA + u * LARGO_HOJA;
  const uCob = Math.max(0, Math.min(1, (yLocal + LARGO / 2) / LARGO));
  const cuerpo = R * perfil(uCob) + 0.19;
  const faldon = u < 0.16 ? (0.16 - u) / 0.16 * 0.13 : 0;      /* abierta abajo */
  const cierre = u > 0.76 ? (u - 0.76) / 0.24 : 0;             /* punta arriba */
  return (cuerpo + faldon) * (1 - cierre * 0.92) + 0.05 * cierre;
}

function nuevaHoja(i) {
  const th = (i / HOJAS) * Math.PI * 2;
  const arc = (Math.PI * 2 / HOJAS) * 1.32;   /* con traslape: se tapan entre sí */
  const pivot = new THREE.Group();
  pivot.rotation.y = th;
  pivot.position.y = BASE_HOJA;
  /* la geo nace en la base y rodea el eje central: el pivote solo
     aporta la altura de la base y el ángulo de esta hoja */
  const mesh = new THREE.Mesh(geoHoja(arc), matHoja[i % matHoja.length]);
  mesh.userData = { tipo: 'hoja', idx: i };
  pivot.add(mesh);
  return { pivot, mesh, th, ida: false };
}

function construirPelos() {
  /* largos: nacen del choclo y ASOMAN por la punta del cono de hojas
     (la hoja cierra en BASE_HOJA + LARGO_HOJA ≈ LARGO/2 + 0.7) */
  const g = new THREE.Group();
  g.userData = { tipo: 'pelos' };
  for (let i = 0; i < 20; i++) {
    const largo = 0.7 + Math.random() * 0.25;
    const h = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.014, largo, 4),
      matPelo[i % 2]
    );
    const th = (i / 20) * Math.PI * 2;
    const rr = 0.02 + Math.random() * 0.06;
    h.position.set(Math.sin(th) * rr, LARGO / 2 + 0.4 + Math.random() * 0.08, Math.cos(th) * rr);
    h.rotation.set(Math.cos(th) * (0.14 + Math.random() * 0.2), 0, -Math.sin(th) * (0.14 + Math.random() * 0.2));
    g.add(h);
  }
  return g;
}

/* ---------- el gusanito ---------- */

function nuevoBicho(a, p) {
  const g = nuevoGusano(THREE, api, { eje: 'y' });
  g.obj.userData = { tipo: 'gusano' };
  return { obj: g.obj, bicho: g, aro: g.aro, a, p, estado: 'oculto', t0: 0 };
}

function colocarGusano(w) {
  const { th, r, h } = posicionDe(w.a, Math.max(0, Math.min(P - 1, w.p)));
  w.obj.position.set(Math.sin(th) * (r + 0.11), h, Math.cos(th) * (r + 0.11));
  w.obj.rotation.y = th;
}

/* saca el bicho a la luz y gira la mazorca para que lo veas */
function despertarGusano(w) {
  w.estado = 'fuera';
  w.t0 = api.reloj;
  w.obj.visible = true;
  gusanosGrupo.add(w.obj);
  colocarGusano(w);
  w.obj.scale.setScalar(0.01);
  api.tween(w.obj.scale, 'x', 1, 0.3); api.tween(w.obj.scale, 'y', 1, 0.3); api.tween(w.obj.scale, 'z', 1, 0.3);
  giroObjetivo = acercarAngulo(giro.rotation.y, FRENTE - (w.a / A) * Math.PI * 2);
  api.sfx('crack'); api.buzz([25, 30, 25]);
  api.aviso('🪱 ¡Un gusanito! Arrástralo a la composta — no lo aplastes');
  api.pista('Arrastra <b>desde el gusanito</b> hasta la composta verde de la izquierda.', 4200);
}

/* el giro más corto hacia un ángulo: la mazorca no da vueltas de más */
function acercarAngulo(actual, objetivo) {
  const dosPi = Math.PI * 2;
  let d = (objetivo - actual) % dosPi;
  if (d > Math.PI) d -= dosPi;
  if (d < -Math.PI) d += dosPi;
  return actual + d;
}

/* ¿este ángulo del choclo se ve de frente ahora mismo? */
function anguloAlFrente(th, holgura = 0.62) {
  const dosPi = Math.PI * 2;
  let d = (giro.rotation.y + th - FRENTE) % dosPi;
  if (d > Math.PI) d -= dosPi;
  if (d < -Math.PI) d += dosPi;
  return Math.abs(d) < holgura;
}

/* Si ya limpiaste lo que tenías al frente, la mazorca rueda sola a lo
   que falta. Girar a mano queda como opción, no como peaje. */
function autoGirar() {
  if (girando || cargado) return;
  if (fase === 'deshojar') {
    const vivas = hojas.filter(h => !h.ida);
    if (!vivas.length || vivas.some(h => anguloAlFrente(h.th, 0.8))) return;
    let mejor = null, mejorD = Infinity;
    vivas.forEach(h => {
      const obj = acercarAngulo(giro.rotation.y, FRENTE - h.th);
      const d = Math.abs(obj - giro.rotation.y);
      if (d < mejorD) { mejorD = d; mejor = obj; }
    });
    giroObjetivo = mejor;
    return;
  }
  const conGrano = [];
  for (let a = 0; a < A; a++) if (granos[a] && granos[a].some(Boolean)) conGrano.push(a);
  if (!conGrano.length) return;
  if (conGrano.some(a => anguloAlFrente((a / A) * Math.PI * 2))) return;
  let mejor = null, mejorD = Infinity;
  conGrano.forEach(a => {
    const obj = acercarAngulo(giro.rotation.y, FRENTE - (a / A) * Math.PI * 2);
    const d = Math.abs(obj - giro.rotation.y);
    if (d < mejorD) { mejorD = d; mejor = obj; }
  });
  giroObjetivo = mejor;
}

/* ---------- reglas ---------- */

const existe = (a, p) => p >= 0 && p < P && !!granos[a][p];
const esPapilla = (a, p) => existe(a, p) && granos[a][p].userData.tipo === 'papilla';

function suelto(a, p) {
  if (!existe(a, p)) return false;
  if (p === 0 || p === P - 1) return true;          /* las puntas siempre ceden */
  return !existe(a, p - 1) || !existe(a, p + 1)
      || !existe((a + 1) % A, p) || !existe((a - 1 + A) % A, p);
}

function cobLimpio() {
  return granos.length && granos.every(fila => fila.every(g => !g));
}

function pintarComposta() { api.composta(Math.min(1, compostaN / 20)); }

function sacarGrano(a, p, conCascada, dir) {
  const g = granos[a][p];
  if (!g || g.userData.tipo !== 'grano') return false;
  granos[a][p] = null;
  hechos++;
  ultimoPop = api.reloj;

  const mundo = new THREE.Vector3();
  g.getWorldPosition(mundo);
  api.chispas(mundo, '#ffe08a', 4, 0.7);
  g.userData.escalaBase = 1;
  api.volarA(g, api.BATEA.clone().setY(api.MESA_Y + 0.22), { dur: 0.46 + Math.random() * 0.12, alto: 0.75 });
  api.sfx(hechos % 2 ? 'pop' : 'pop2');

  /* ¿había un bicho debajo? */
  const w = gusanos.find(x => x.estado === 'oculto' && x.a === a && x.p === p);
  if (w) despertarGusano(w);

  api.progreso(hechos, TOTAL);

  if (conCascada && dir) {
    cascadas.push({ a, p: p + dir, dir, t: api.reloj + CASCADA_MS[madurez.id] });
    /* La cita llega justo cuando el jugador acaba de comprobarlo con
       los dedos: se soltó uno de la orilla y se fue la hilera entera. */
    corridaActual++;
    if (!dichaCita && corridaActual >= CORRIDA_PARA_LA_CITA) {
      dichaCita = true;
      citaPendiente = true;   /* se dice cuando la hilera TERMINE de caer */
    }
  } else corridaActual = 0;
  revisarCob();
  return true;
}

/* el grano tierno bajo un dedo con fuerza: papilla. Se queda pegada a
   la tusa, traba la hilera y hay que limpiarla aparte — reventar no
   es un atajo, es el desvío. */
function reventarGrano(a, p) {
  const g = granos[a][p];
  if (!g || g.userData.tipo !== 'grano') return;
  reventados++;
  g.userData.tipo = 'papilla';
  while (g.children.length) g.remove(g.children[0]);
  /* el splat SÍ recibe el dedo: limpiarlo es tocarlo */
  const splat = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), matPapilla);
  splat.scale.set(0.135, 0.04, 0.115);
  g.add(splat);
  const mundo = new THREE.Vector3();
  g.getWorldPosition(mundo);
  api.chispas(mundo, '#f3e2a0', 9, 0.8);
  api.sfx('crack'); api.buzz([18, 12, 18]);
  api.sacudir(0.25);
  if (!avisadoReventon) {
    avisadoReventon = true;
    api.pista('¡Reventaste el grano! Está <b>tierno</b>: más despacio. Toca la papilla para limpiarla.', 4600);
    api.toast('Papilla 😖 — el tierno se trata con cariño');
  }
}

function limpiarPapilla(a, p) {
  const g = granos[a][p];
  if (!g || g.userData.tipo !== 'papilla') return;
  granos[a][p] = null;
  hechos++;                       /* limpiarla también es avanzar… tarde */
  g.userData.escalaBase = 1;
  api.volarA(g, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.45, alto: 0.4 });
  compostaN++; pintarComposta();
  api.sfx('frotar'); api.buzz(6);
  api.progreso(hechos, TOTAL);
  revisarCob();
}

function revisarCob() {
  if (terminado || fase !== 'desgranar') return;
  if (!cobLimpio()) return;
  const vivos = gusanos.some(w => w.estado === 'fuera' || w.estado === 'cargado');
  if (vivos) { api.aviso('Falta sacar el gusanito antes de seguir'); return; }
  if (choclo < CHOCLOS - 1) {
    fase = 'transicion';
    api.sfx('bien'); api.buzz([15, 25]);
    api.toast('¡Choclo listo! 🌽 Va el siguiente');
    /* la tusa pelada, a la composta: así se hace en la cocina */
    tusa.userData.tipo = null;
    api.volarA(tusa, api.COMPOSTA.clone().setY(api.MESA_Y + 0.18), { dur: 0.55, alto: 0.6 });
    compostaN += 2; pintarComposta();
    const token = ++transToken;
    setTimeout(() => {
      if (token !== transToken || !giro) return;
      choclo++;
      armarChoclo();
    }, 680);
    return;
  }
  terminado = true;
  api.completar();
}

/* ---------- gestos ---------- */

function granoBajoElDedo() {
  const hits = api.raycast([tusa, granosGrupo, gusanosGrupo], true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.tipo) o = o.parent;
    return o || null;
  }
  return null;
}

function aplastado(w) {
  if (w && api.reloj - w.t0 < GRACIA) {
    api.sfx('resist'); api.buzz([20, 20]);
    api.pista('¡Casi! <b>No lo toques</b>: arrastra desde él hasta la composta.', 2800);
    return false;
  }
  api.arruinar(ARRUINADO.aplastado('gusanito'));
  return true;
}
const gusanoDe = (raizTocada) => gusanos.find(x => x.obj === raizTocada && x.estado !== 'ido') || null;

function intentarGrano(raizGrano, esArrastre) {
  const { a, p } = raizGrano.userData;
  if (raizGrano.userData.tipo === 'papilla') { limpiarPapilla(a, p); return; }
  if (suelto(a, p)) {
    sacarGrano(a, p, esArrastre, esArrastre ? dirActual : 0);
    return;
  }
  /* trabado: hay que forzarlo, y eso se siente */
  raizGrano.userData.golpes++;
  api.sfx('resist'); api.buzz(8);
  const base = raizGrano.rotation.z;
  api.tween(raizGrano.rotation, 'z', base + 0.25, 0.06, undefined, () => api.tween(raizGrano.rotation, 'z', base, 0.12));
  if (raizGrano.userData.golpes >= madurez.resistencia) {
    granos[a][p] = null;
    hechos++;
    ultimoPop = api.reloj;
    const mundo = new THREE.Vector3();
    raizGrano.getWorldPosition(mundo);
    api.chispas(mundo, '#ffd24d', 6, 0.8);
    raizGrano.userData.escalaBase = 1;
    api.volarA(raizGrano, api.BATEA.clone().setY(api.MESA_Y + 0.22), { dur: 0.5, alto: 0.8 });
    api.sfx('pop');
    const w = gusanos.find(x => x.estado === 'oculto' && x.a === a && x.p === p);
    if (w) despertarGusano(w);
    api.progreso(hechos, TOTAL);
    revisarCob();
  } else if (api.reloj - avisoCentro > 6) {
    avisoCentro = api.reloj;
    const cuanto = madurez.id === 'duro' ? ' Y este choclo está duro.' : '';
    api.pista('Ese está trabado por los cuatro lados. Empieza por una <b>punta</b> y arrastra a lo largo.' + cuanto, 4000);
  }
}

/* ---------- las hojas: pelar ---------- */

function hojasQuedan() { return hojas.some(h => !h.ida); }

function pelarHoja(h) {
  if (h.ida) return;
  h.ida = true;
  h.mesh.userData.tipo = null;
  api.sfx('crack'); api.buzz(10);
  const mundo = new THREE.Vector3();
  h.mesh.getWorldPosition(mundo);
  api.chispas(mundo.setY(mundo.y + 0.4), '#9dbb70', 5, 0.6);
  /* la hoja se dobla hacia afuera desde la base, y de ahí vuela */
  api.tween(h.pivot.rotation, 'x', 2.15, 0.26, undefined, () => {
    api.volarA(h.pivot, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.35 });
    compostaN++; pintarComposta();
  });
  if (!hojasQuedan()) {
    api.sfx('bien');
    api.pista('Ahora los <b>pelos</b>: un jalón y fuera.', 3600);
  }
}

function intentarPelos() {
  if (fase !== 'deshojar' || !pelos) return;
  if (hojasQuedan()) { api.pista('Primero las hojas de afuera.', 2200); return; }
  pelos.userData.tipo = null;
  api.volarA(pelos, api.COMPOSTA.clone().setY(api.MESA_Y + 0.2), { dur: 0.5, alto: 0.5 });
  compostaN++; pintarComposta();
  pelos = null;
  api.sfx('pop2'); api.buzz([8, 10]);
  fase = 'desgranar';
  if (api.rotulo) api.rotulo(`Desgranar · choclo ${choclo + 1} de ${CHOCLOS}`);
  api.pista(`${madurez.presenta} Empieza por una <b>punta</b>.`, 4600);
}

/* ---------- armar un choclo ---------- */

function armarChoclo() {
  madurez = MADUREZ[orden[choclo]];
  fase = 'deshojar';
  granos = []; gusanos = []; cascadas = []; hojas = [];
  corridaActual = 0; modo = null; hojaActiva = null; giroObjetivo = null;

  while (giro.children.length) giro.remove(giro.children[0]);
  giro.rotation.y = FRENTE;

  construirMaterialesDelChoclo();
  tusa = construirTusa();
  granosGrupo = new THREE.Group();
  gusanosGrupo = new THREE.Group();
  hojasGrupo = new THREE.Group();
  giro.add(tusa, granosGrupo, gusanosGrupo, hojasGrupo);

  const geo = geoGrano();
  for (let a = 0; a < A; a++) {
    granos[a] = [];
    for (let p = 0; p < P; p++) {
      const g = nuevoGrano(a, p, geo);
      granos[a][p] = g;
      granosGrupo.add(g);
    }
  }

  for (let i = 0; i < HOJAS; i++) {
    const h = nuevaHoja(i);
    hojas.push(h);
    hojasGrupo.add(h.pivot);
  }

  pelos = construirPelos();
  giro.add(pelos);

  /* los bichos: nunca en las puntas (ahí sería regalado encontrarlos) */
  const usados = new Set();
  const cuantos = GUSANOS_POR[Math.min(choclo, GUSANOS_POR.length - 1)];
  for (let i = 0; i < cuantos; i++) {
    let a, p, k = 0;
    do {
      a = Math.floor(Math.random() * A);
      p = 2 + Math.floor(Math.random() * (P - 4));
      k++;
    } while (usados.has(a + ':' + p) && k < 40);
    usados.add(a + ':' + p);
    const w = nuevoBicho(a, p);
    w.obj.visible = false;
    gusanos.push(w);
  }

  /* entra creciendo: se nota que llegó un choclo nuevo */
  mazorca.scale.setScalar(0.01);
  api.tween(mazorca.scale, 'x', 1, 0.4); api.tween(mazorca.scale, 'y', 1, 0.4); api.tween(mazorca.scale, 'z', 1, 0.4);

  if (api.rotulo) api.rotulo(`Deshojar · choclo ${choclo + 1} de ${CHOCLOS}`);
  api.pista('Pela las hojas: agarra una y <b>jala hacia abajo</b>.', 4200);
}

/* ---------- contrato del nivel ---------- */

export default {
  id: 'maiz',
  /* De pie y grande, con la batea y la composta dentro del encuadre:
     el gusanito se lleva a la composta, y un cuenco fuera de pantalla
     convierte esa regla en algo imposible. */
  camara: { pos: [0, 2.95, 3.9], mira: [0, 1.82, 0.14] },
  controles: [
    { id: 'izq', txt: '⟲', tip: 'girar' },
    { id: 'der', txt: '⟳', tip: 'girar' },
  ],

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    construirMaterialesFijos();
    hechos = 0; choclo = 0; compostaN = 0;
    modo = null; cargado = null; giroObjetivo = null; girando = 0;
    terminado = false; ultimoPop = api.reloj; avisoCentro = 0;
    dichaCita = false; citaPendiente = false;
    reventados = 0; avisadoReventon = false;
    transToken++;

    /* uno tierno y uno duro, en el orden que salga del costal */
    orden = Math.random() < 0.5 ? ['tierno', 'duro'] : ['duro', 'tierno'];

    mazorca = new THREE.Group();
    mazorca.position.set(CENTRO[0], api.MESA_Y + CENTRO[1], CENTRO[2]);
    /* de pie, apenas inclinada hacia quien la sostiene */
    mazorca.rotation.x = 0.1;
    raiz.add(mazorca);

    giro = new THREE.Group();
    mazorca.add(giro);

    /* la sombra en el mesón, para que "flotar" se lea como "en alto" */
    const sombra = api.sombraBlob(1.15, 0);
    sombra.position.set(CENTRO[0], api.MESA_Y + 0.02, CENTRO[2] + 0.15);
    raiz.add(sombra);

    armarChoclo();
    api.progreso(0, TOTAL);

    /* mirilla de depuración, como window.Fanesca pero del nivel */
    if (typeof window !== 'undefined') {
      window.__maiz = {
        get fase() { return fase; },
        get giro() { return giro ? +giro.rotation.y.toFixed(3) : null; },
        get objetivo() { return giroObjetivo === null ? null : +giroObjetivo.toFixed(3); },
        get quedan() { return granos.reduce((n, f) => n + f.filter(Boolean).length, 0); },
        filas() {
          const f = [];
          for (let a = 0; a < A; a++) if (granos[a] && granos[a].some(Boolean)) f.push(a);
          return f;
        },
        get gusanos() { return gusanos.map(w => w.estado); },
      };
    }
  },

  objetivos() {
    return [hojasGrupo, pelos, tusa, granosGrupo, gusanosGrupo].filter(Boolean);
  },

  alTocar(info) {
    if (terminado || fase === 'transicion') return;
    const r = info.raiz;
    if (!r) return;
    if (r.userData.tipo === 'gusano') { aplastado(gusanoDe(r)); return; }
    if (fase === 'deshojar') {
      if (r.userData.tipo === 'hoja') {
        const h = hojas[r.userData.idx];
        if (h && !h.ida) {
          const base = h.pivot.rotation.x;
          api.tween(h.pivot.rotation, 'x', base + 0.12, 0.07, undefined, () => api.tween(h.pivot.rotation, 'x', base, 0.12));
          api.sfx('resist');
          api.pista('Así no: agarra la hoja y <b>jala hacia abajo</b>.', 2600);
        }
        return;
      }
      if (r.userData.tipo === 'pelos') { intentarPelos(); return; }
      return;
    }
    if (r.userData.tipo === 'grano' || r.userData.tipo === 'papilla') { intentarGrano(r, false); return; }
    if (r.userData.tipo === 'tusa') api.pista('Ahí ya no hay grano. Busca uno que tenga un hueco al lado.', 2600);
  },

  alArrastrarInicio(info) {
    if (terminado || fase === 'transicion') return;
    const r = info.raiz;
    dyPrev = info.dy;
    velT = api.reloj; velX = info.dx; velY = info.dy;
    if (r && r.userData.tipo === 'gusano') {
      const w = gusanos.find(x => x.obj === r);
      if (w && w.estado === 'fuera') {
        modo = 'cargar';
        cargado = w;
        w.estado = 'cargado';
        /* pasa a manos del mundo: así el giro de la mazorca no se lo lleva */
        raiz.attach(r);
        w.aro.visible = false;
        api.sfx('tab'); api.buzz(12);
        api.aviso('Llévalo a la composta 🌿');
      }
      return;
    }
    if (fase === 'deshojar') {
      if (r && r.userData.tipo === 'hoja') {
        const h = hojas[r.userData.idx];
        if (h && !h.ida) { modo = 'hoja'; hojaActiva = h; return; }
      }
      if (r && r.userData.tipo === 'pelos') { intentarPelos(); modo = null; return; }
      modo = 'girar';
      giro0 = giro.rotation.y; dx0 = info.dx; giroObjetivo = null;
      return;
    }
    if (r && (r.userData.tipo === 'grano' || r.userData.tipo === 'papilla')) {
      modo = 'peinar';
      dirActual = 0;
      intentarGrano(r, false);   /* el primero es a pulso; la cascada nace del movimiento */
      return;
    }
    modo = 'girar';
    giro0 = giro.rotation.y;
    dx0 = info.dx;
    giroObjetivo = null;
  },

  alArrastrar(info) {
    if (terminado || fase === 'transicion') return;
    if (modo === 'girar') {
      /* la mazorca rueda HACIA el dedo: la superficie sigue al pulgar,
         como si la hicieras rodar de verdad */
      giro.rotation.y = giro0 + (info.dx - dx0) * 0.013;
      return;
    }
    if (modo === 'cargar' && cargado) {
      /* el punto que manda es el del mesón, no el de la mano en alto */
      const p = api.puntoEnPlano(api.MESA_Y);
      if (p) { cargado.suelo = { x: p.x, z: p.z }; cargado.obj.position.set(p.x, api.MESA_Y + 0.45, p.z); }
      const cerca = p && Math.hypot(p.x - api.COMPOSTA.x, p.z - api.COMPOSTA.z) < 0.75;
      cargado.obj.rotation.z = Math.sin(api.reloj * 12) * 0.3;
      if (cerca !== cargado.cerca) {
        cargado.cerca = cerca;
        if (cerca) api.pista('Suéltalo ahí 👌', 1400);
      }
      return;
    }
    if (modo === 'hoja') {
      if (!hojaActiva || hojaActiva.ida) return;
      /* jalar hacia abajo pela; de lado, el gesto se vuelve girar */
      if (info.dy > 58 && info.dy > Math.abs(info.dx) * 0.8) {
        pelarHoja(hojaActiva);
        hojaActiva = null;
        modo = null;
      } else if (Math.abs(info.dx) > 55 && Math.abs(info.dx) > Math.abs(info.dy)) {
        modo = 'girar';
        giro0 = giro.rotation.y; dx0 = info.dx;
        hojaActiva = null;
      }
      return;
    }
    if (modo === 'peinar') {
      /* la fuerza del dedo, en píxeles por segundo */
      const ahora = api.reloj;
      const dtv = Math.max(0.008, ahora - velT);
      const vel = Math.hypot(info.dx - velX, info.dy - velY) / dtv;
      velT = ahora; velX = info.dx; velY = info.dy;

      /* la hilera va de abajo (p=0) a arriba (p=P-1): en pantalla,
         bajar el dedo es ir hacia p menor */
      const d = info.dy - dyPrev;
      dyPrev = info.dy;
      if (Math.abs(d) > 0.6) dirActual = d > 0 ? -1 : 1;
      const r = granoBajoElDedo();
      if (!r) return;
      if (r.userData.tipo === 'gusano') { aplastado(gusanoDe(r)); return; }
      if (r.userData.tipo === 'papilla') { limpiarPapilla(r.userData.a, r.userData.p); return; }
      if (r.userData.tipo !== 'grano') return;
      const { a, p } = r.userData;
      /* el tierno cobra la fuerza: el grano revienta en vez de salir */
      if (madurez.id === 'tierno' && vel > FUERZA) { reventarGrano(a, p); return; }
      if (suelto(a, p)) sacarGrano(a, p, true, dirActual);
    }
  },

  alArrastrarFin() {
    if (modo === 'cargar' && cargado) {
      const w = cargado;
      cargado = null; modo = null;
      const p = w.suelo || w.obj.position;
      if (Math.hypot(p.x - api.COMPOSTA.x, p.z - api.COMPOSTA.z) < 0.75) {
        w.estado = 'ido';
        api.volarA(w.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.35, alto: 0.35 });
        api.chispas(api.COMPOSTA.clone().setY(api.MESA_Y + 0.4), '#8ab143', 10);
        api.sfx('bien'); api.buzz([15, 25]);
        api.aviso(null);
        api.toast('¡Fuera de la olla! 🌿');
        compostaN++; pintarComposta();
        revisarCob();
      } else {
        /* se te cayó: vuelve a la mazorca y sigue caminando */
        w.estado = 'fuera';
        w.aro.visible = true;
        gusanosGrupo.add(w.obj);
        colocarGusano(w);
        api.sfx('resist');
        api.aviso('🪱 Se te resbaló. Otra vez: arrástralo hasta la composta');
      }
      return;
    }
    modo = null;
    hojaActiva = null;
  },

  alControl(id, fase2) {
    if (fase2 === 'abajo') { girando = id === 'izq' ? -1 : 1; giroObjetivo = null; }
    else girando = 0;
  },

  actualizar(dt, t) {
    if (!giro) return;

    if (girando) giro.rotation.y += girando * 1.7 * dt;
    else if (giroObjetivo !== null) {
      const d = giroObjetivo - giro.rotation.y;
      if (Math.abs(d) < 0.01) giroObjetivo = null;
      else giro.rotation.y += d * Math.min(1, dt * 6);
    }

    /* la cremallera: cada grano que sale destraba al siguiente */
    if (cascadas.length) {
      const vivas = [];
      for (const c of cascadas) {
        if (t < c.t) { vivas.push(c); continue; }
        if (c.p < 0 || c.p >= P) continue;
        if (!existe(c.a, c.p)) continue;
        if (esPapilla(c.a, c.p)) continue;   /* la papilla traba la hilera */
        if (!suelto(c.a, c.p)) continue;
        sacarGrano(c.a, c.p, true, c.dir);
      }
      cascadas = vivas;
    }

    /* los bichos caminan hacia la batea */
    for (const w of gusanos) {
      if (w.estado === 'fuera') {
        w.p -= GUSANO_VEL * dt;      /* se descuelga hacia la batea */
        colocarGusano(w);
        if (w.p <= -0.35) {
          w.estado = 'ido';
          api.arruinar(ARRUINADO.enLaBatea('gusanito'));
          return;
        }
      }
      if (w.estado === 'fuera' || w.estado === 'cargado') w.bicho.animar(t);
    }

    /* La cita espera a que la cremallera termine y el dedo se levante:
       dicha en mitad del gesto nadie la lee, y el gesto es justamente
       la prueba de lo que dice. */
    if (citaPendiente && !cascadas.length && !modo) {
      citaPendiente = false;
      api.voz(AMAGUANA_MAZORCA, 9500, { corta: true });
      api.abrirCapitulo('unidad');
      api.sfx('bien');
    }

    /* la mazorca rueda sola cuando ya no queda nada al frente */
    tAuto -= dt;
    if (tAuto <= 0) { tAuto = 0.35; autoGirar(); }

    /* si te trabaste un rato, la cocina te sopla la respuesta */
    if (!terminado && fase === 'desgranar' && hechos < TOTAL && ultimoPop && t - ultimoPop > 11) {
      ultimoPop = t;
      api.pista('Prueba por las <b>puntas</b> de la mazorca: ahí siempre hay un grano suelto.', 3600);
    }
  },

  destruir() {
    transToken++;
    mazorca = giro = tusa = granosGrupo = gusanosGrupo = hojasGrupo = pelos = null;
    granos = []; gusanos = []; cascadas = []; hojas = [];
    cargado = null; modo = null; hojaActiva = null; terminado = false;
  },
};
