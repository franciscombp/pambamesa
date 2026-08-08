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

import { nuevoGusano } from './modelos/bichos.js';
import { ARRUINADO } from './arruinado.js';
import { AMAGUANA_MAZORCA } from './historia.js';
import {
  A, P, R, PASO, LARGO, perfil, uDe, posicionDe,
  MADUREZ, HOJAS, LARGO_HOJA, BASE_HOJA, NUDOS,
} from './modelos/choclo.js';

let THREE, raiz, api;

/* ---------- la rejilla ----------
   A, P, R, PASO y posicionDe() vienen de modelos/choclo.js: la
   forma y las posiciones son lo mismo, y tienen que vivir juntas
   o un día dejan de coincidir. */
const CENTRO = [0, 1.78, 0.12];  /* el choclo en alto, relativo al mesón */
/* La cámara está en x=0 mirando de frente: el ángulo que da la cara
   es 0. (El -0.42 heredado del choclo acostado sesgaba el "frente"
   24° a la izquierda, y el auto-giro dejaba las últimas hileras
   colgadas en el borde de la silueta, casi imposibles de tocar.) */
const FRENTE = 0;

const CHOCLOS = 2;         /* choclos por partida */
const GUSANOS_POR = [1, 2];/* bichos escondidos en cada choclo */
const GUSANO_VEL = 0.52;   /* posiciones por segundo que BAJA el bicho */
/* px/s: más rápido que esto es "con fuerza", y el tierno lo cobra */
const FUERZA = 1600;
/* El jalón de la hoja, en píxeles. Los primeros no mueven nada: la
   hoja está pegada y hay que vencerla, y ese arranque duro es la
   mitad de lo que hace que se sienta fibrosa en vez de floja. */
const RESISTE_HOJA = 14;
const SUELTA_HOJA = 105;
/* El bicho sale justo del hueco que acabas de abrir, muchas veces con
   el dedo todavía encima. Sin este respiro, destaparlo sería perder
   sin poder reaccionar. */
const GRACIA = 1.0;

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
let pellizcando = false;
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
let ultimoRasgue = 0;               /* para espaciar el sonido de rasgado */
let transToken = 0;

/* ---------- las piezas ----------
   La forma del grano, la tusa, la hoja y los pelos vive en
   modelos/choclo.js. Aquí solo se piden y se colocan en la
   rejilla — que es lo único que este archivo tiene que saber. */

function nuevoGrano(a, p) {
  const { th, r, h } = posicionDe(a, p);
  const punta = (p === 0 || p === P - 1);
  const g = api.pieza('grano-choclo', {
    madurez: madurez.id, punta, variante: a * 7 + p * 3,
  });
  /* apenas asomados: el grano se sienta EN la tusa, no flota sobre ella */
  g.position.set(Math.sin(th) * (r + 0.03), h, Math.cos(th) * (r + 0.03));
  g.rotation.y = th;
  g.userData = { tipo: 'grano', a, p, golpes: 0 };
  return g;
}

function construirTusa() {
  const m = api.pieza('tusa', { madurez: madurez.id });
  m.userData = { tipo: 'tusa' };
  return m;
}

function nuevaHoja(i) {
  const th = (i / HOJAS) * Math.PI * 2;
  const pivot = new THREE.Group();
  pivot.rotation.y = th;
  pivot.position.y = BASE_HOJA;
  const mesh = api.pieza('hoja-choclo', { indice: i });
  mesh.userData = { tipo: 'hoja', idx: i };
  pivot.add(mesh);
  /* los eslabones de la cadena, de la base a la punta: doblarlos en
     cascada es lo que hace que la hoja se CURVE al pelarse en vez de
     abrirse como una tapa */
  const nudos = [];
  for (let n = 0; n < NUDOS; n++) {
    const nd = api.parte(mesh, 'nudo' + n);
    if (nd) nudos.push(nd);
  }
  return { pivot, mesh, nudos, th, ida: false, abierta: 0 };
}

/* Cuánto se abre cada eslabón, de 0 (cerrada) a 1 (colgando).
   El de la base abre menos que el de la punta: sumados dan la curva
   de una hoja pelada de verdad, más cerrada abajo y volteada arriba.

   Suman ~2.7 radianes, que son unos 155°: la hoja no se queda
   apuntando hacia afuera —así se acostaba sobre la mesa como una
   lona verde y tapaba media cocina— sino que se voltea y CUELGA
   junto al choclo, que es como queda una hoja jalada hacia abajo. */
const CURVA_HOJA = [1.15, 0.85, 0.70];  /* radianes por nudo, a tope */

function doblarHoja(h, k) {
  h.abierta = k;
  h.nudos.forEach((nd, n) => { nd.rotation.x = (CURVA_HOJA[n] || 0.5) * k; });
}

function construirPelos() {
  const g = api.pieza('pelos-choclo');
  g.userData = { tipo: 'pelos' };
  return g;
}

/* ---------- el gusanito ---------- */

function nuevoBicho(a, p) {
  const g = nuevoGusano(THREE, { eje: 'y' });
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
  api.aviso('🪱 ¡Un gusanito! Llévalo a la composta — no lo aplastes');
  api.pista('<b>Pellízcalo con dos dedos</b> y llévalo a la composta verde de la izquierda (o arrástralo con uno).', 5200);
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
    cascadas.push({ a, p: p + dir, dir, t: api.reloj + madurez.cascada });
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
  g.add(api.pieza('papilla-choclo'));
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

/* la versión pantalla, para el pellizco: el gusanito vive en la
   jerarquía girada de la mazorca, así que su posición de pantalla
   sale de getWorldPosition, no de .position (que es local al giro). */
function gusanoMasCercaEnPantalla(clienteX, clienteY, radioPx = 70) {
  let mejor = null, mejorD = radioPx;
  const mundo = new THREE.Vector3();
  for (const w of gusanos) {
    if (w.estado !== 'fuera') continue;
    w.obj.getWorldPosition(mundo);
    const p = api.proyectar(mundo);
    const d = Math.hypot(p.x - clienteX, p.y - clienteY);
    if (d < mejorD) { mejorD = d; mejor = w; }
  }
  return mejor;
}

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

/* La hoja cedió del todo. NO vuela a la composta: se queda colgando
   abierta, como queda un choclo a medio pelar de verdad — y como se
   ve en cualquier foto de choclo. La envoltura entera se va después,
   de un tirón, junto con los pelos. */
function pelarHoja(h) {
  if (h.ida) return;
  h.ida = true;
  h.mesh.userData.tipo = null;
  /* pelada ya no intercepta el dedo: si no, taparía los granos de
     abajo justo cuando toca empezar a desgranar */
  h.mesh.traverse(o => { o.userData.ignorar = true; });
  api.sfx('crack'); api.buzz(10);
  const mundo = new THREE.Vector3();
  h.mesh.getWorldPosition(mundo);
  api.chispas(mundo.setY(mundo.y + 0.4), '#9dbb70', 5, 0.6);
  /* el último tramo lo termina sola, con un rebotito de hoja fibrosa */
  api.tween({ get v() { return h.abierta; }, set v(x) { doblarHoja(h, x); } }, 'v', 1.12, 0.16,
    undefined, () => api.tween({ get v() { return h.abierta; }, set v(x) { doblarHoja(h, x); } }, 'v', 1, 0.22));
  if (!hojasQuedan()) {
    api.sfx('bien');
    api.pista('Ahora los <b>pelos</b>: un jalón y se va toda la envoltura.', 3600);
  }
}

function intentarPelos() {
  if (fase !== 'deshojar' || !pelos) return;
  if (hojasQuedan()) { api.pista('Primero las hojas de afuera.', 2200); return; }
  pelos.userData.tipo = null;
  api.volarA(pelos, api.COMPOSTA.clone().setY(api.MESA_Y + 0.2), { dur: 0.5, alto: 0.5 });
  pelos = null;
  /* Y con ellos se va la envoltura entera, de un tirón. Las hojas
     peladas se quedaron colgando —así queda un choclo a medio pelar
     de verdad— y este es el momento en que se arrancan todas juntas,
     que es también como se hace. */
  if (hojasGrupo) {
    hojasGrupo.userData.escalaBase = 1;
    api.volarA(hojasGrupo, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.55, alto: 0.45 });
    hojasGrupo = null;
  }
  compostaN += 2; pintarComposta();
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

  tusa = construirTusa();
  granosGrupo = new THREE.Group();
  gusanosGrupo = new THREE.Group();
  hojasGrupo = new THREE.Group();
  giro.add(tusa, granosGrupo, gusanosGrupo, hojasGrupo);

  for (let a = 0; a < A; a++) {
    granos[a] = [];
    for (let p = 0; p < P; p++) {
      const g = nuevoGrano(a, p);
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
    hechos = 0; choclo = 0; compostaN = 0;
    modo = null; cargado = null; giroObjetivo = null; girando = 0; pellizcando = false;
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
      /* de lado, el gesto se vuelve girar: la hoja se vuelve a cerrar */
      if (Math.abs(info.dx) > 55 && Math.abs(info.dx) > Math.abs(info.dy)) {
        api.tween({ get v() { return hojaActiva.abierta; },
                    set v(x) { doblarHoja(hojaActiva, x); } }, 'v', 0, 0.18);
        modo = 'girar';
        giro0 = giro.rotation.y; dx0 = info.dx;
        hojaActiva = null;
        return;
      }
      /* LA HOJA SIGUE AL DEDO. Antes esto era un umbral: 58 px y
         *chas*, la hoja saltaba sola a un ángulo fijo. Se sentía a
         botón. Ahora se va abriendo con el jalón, y hasta que no la
         sueltas del todo puede volver atrás — que es lo que hace una
         hoja de verdad si aflojas a mitad de camino. */
      const k = Math.max(0, Math.min(1, (info.dy - RESISTE_HOJA) / (SUELTA_HOJA - RESISTE_HOJA)));
      doblarHoja(hojaActiva, k);
      /* el rasgado suena mientras avanza, no al final */
      if (k > 0 && k < 1 && api.reloj - ultimoRasgue > 0.075) {
        ultimoRasgue = api.reloj;
        api.sfx('frotar');
      }
      if (k >= 1) {
        pelarHoja(hojaActiva);
        hojaActiva = null;
        modo = null;
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
    /* la soltaste a medio jalar: la hoja se cierra sola, fibrosa */
    if (modo === 'hoja' && hojaActiva && !hojaActiva.ida) {
      const h = hojaActiva;
      api.tween({ get v() { return h.abierta; }, set v(x) { doblarHoja(h, x); } }, 'v', 0, 0.28);
    }
    modo = null;
    hojaActiva = null;
  },

  /* pellizcar con dos dedos: agarra el gusanito más cercano EN
     PANTALLA (no exige que el primer dedo caiga justo en su malla,
     chiquita y a veces girando con la mazorca), y de ahí en más
     reusa el mismo ciclo de "cargar" que el arrastre de un dedo. */
  alPellizcarInicio(info) {
    pellizcando = false;
    modo = null;          /* que un modo viejo no siga vivo bajo el pellizco */
    if (terminado || fase === 'transicion') return;
    const w = gusanoMasCercaEnPantalla(info.cliente.x, info.cliente.y);
    if (!w) return;
    pellizcando = true;
    modo = 'cargar';
    cargado = w;
    w.estado = 'cargado';
    raiz.attach(w.obj);
    w.aro.visible = false;
    api.sfx('tab'); api.buzz(12);
    api.aviso('Llévalo a la composta 🌿');
  },
  /* Solo si el pellizco agarró un gusanito se sigue el ciclo de
     cargar; si no agarró nada, el gesto no hace nada. */
  alPellizcarMover(info) { if (pellizcando) this.alArrastrar(info); },
  alPellizcarFin(info) {
    if (!pellizcando) { modo = null; return; }
    pellizcando = false;
    this.alArrastrarFin(info);
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
    cargado = null; modo = null; hojaActiva = null; pellizcando = false; terminado = false;
  },
};
