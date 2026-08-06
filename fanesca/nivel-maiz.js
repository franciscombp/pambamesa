/* ============================================================
   FANESCA — nivel-maiz.js
   DESGRANAR EL CHOCLO.

   La mazorca es una rejilla cilíndrica: A hileras alrededor × P
   posiciones a lo largo. La regla que hace todo el juego cabe en
   una línea:

       un grano solo sale si tiene un vecino ausente.

   De ahí sale sola la enseñanza que queremos: en el centro, con
   los cuatro vecinos puestos, el grano está trabado y hay que
   forzarlo (y eso cuesta tiempo). En las puntas siempre hay
   hueco, así que se saca de una — y una vez abierto el hueco,
   arrastrar el dedo a lo largo de esa hilera la desgrana entera
   en cascada, que es exactamente cómo se desgrana de verdad.

   La mazorca va DE PIE, sostenida en la mano, porque así se
   desgrana de verdad: el choclo en el puño y el pulgar bajando por
   una hilera. El teléfono en vertical es la mano; la pantalla es la
   mazorca. Girar es pasar el dedo de lado, como si la hicieras rodar
   entre los dedos.

   Y debajo de algún grano hay un gusanito. Si lo tocas, lo
   aplastas y se arruina la olla. Si lo dejas caminar hasta la
   batea, se mezcla con los granos buenos y también se arruina.
   La única salida es agarrarlo (arrastrar DESDE él) y llevarlo
   a la composta.
   ============================================================ */

import { nuevoGusano, ARRUINADO } from './bichos.js';
import { CACUANGO } from './historia.js';

let THREE, raiz, api;

/* ---------- la rejilla ---------- */
const A = 16;              /* hileras alrededor de la tusa */
const P = 12;              /* granos a lo largo de cada hilera */
const R = 0.46;            /* radio de la mazorca */
const PASO = 0.208;        /* separación entre granos a lo largo */
const CENTRO = [0, 1.96, 0.12];  /* el choclo en alto, relativo al mesón */
const FRENTE = -0.42;      /* ángulo que mira a la cámara (rad) */

const GUSANOS = 2;         /* cuántos bichos esconde la mazorca */
const RESISTENCIA = 3;     /* toques para arrancar un grano trabado */
const CASCADA_MS = 0.042;  /* qué tan rápido corre la cremallera */
const GUSANO_VEL = 0.52;   /* posiciones por segundo que BAJA el bicho */
/* El bicho sale justo del hueco que acabas de abrir, y muchas veces la
   cascada lo destapa con el dedo todavía encima. Sin este respiro,
   destapar un gusanito sería perder sin poder reaccionar. */
const GRACIA = 1.0;

/* la mazorca es más gorda al medio que en las puntas */
const perfil = (u) => 0.80 + 0.20 * Math.sin(Math.PI * u);
const uDe = (p) => (p + 0.5) / P;

let mazorca = null;        /* el choclo de pie: su eje es +Y */
let giro = null;           /* grupo que rota sobre el eje de la mazorca */
let tusa = null;
let granosGrupo = null, gusanosGrupo = null;
let granos = [];           /* granos[a][p] = Group | null */
let gusanos = [];
let cascadas = [];         /* cremalleras corriendo */
let hechos = 0;
const TOTAL = A * P;

let modo = null;           /* 'peinar' | 'girar' | 'cargar' */
let giro0 = 0, dx0 = 0, dyPrev = 0, dirActual = 1;
let cargado = null;        /* gusano en la mano */
let giroObjetivo = null;   /* a dónde lleva la cámara al bicho */
let girando = 0;           /* botones de girar mantenidos */
let tAuto = 0.6;           /* cada cuánto se revisa el giro automático */
let ultimoPop = 0, avisoCentro = 0, terminado = false;
let corridaActual = 0, dichoCacuango = false, citaPendiente = false;  /* la cita, una sola vez */
const CORRIDA_PARA_LA_CITA = 7;

/* ---------- materiales ---------- */
let matGrano = [], matGranoPunta = null, matTusa = null;

function construirMateriales() {
  matGrano = ['#f6c94b', '#f2bf3c', '#f8d267', '#eeb832'].map(c => new THREE.MeshLambertMaterial({ color: c }));
  matGranoPunta = new THREE.MeshLambertMaterial({ color: '#fae09a' });
  matTusa = new THREE.MeshLambertMaterial({ color: '#f6ecd0' });
}

/* ---------- geometría de la mazorca ---------- */

const geoGrano = () => new THREE.SphereGeometry(1, 8, 6);

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
  /* un pelo más anchos que el paso de la rejilla: así se aprietan
     entre sí como en la mazorca de verdad y no se ve la tusa */
  m.scale.set(0.108, punta ? 0.112 : 0.131, punta ? 0.09 : 0.106);
  g.add(m);
  return g;
}

const ALTO_GRANOS = () => (P - 1) / 2 * PASO;
const Y_MANO = () => -ALTO_GRANOS() - 0.46;     /* dónde agarra el puño */

function construirTusa() {
  const pts = [];
  const N = 26;
  const largo = P * PASO + PASO * 0.9;
  /* el tallo pelado de abajo: la mazorca necesita de dónde ser
     agarrada sin que el puño tape granos que aún se pueden sacar */
  pts.push(new THREE.Vector2(0.004, -largo / 2 - 0.78));
  pts.push(new THREE.Vector2(0.115, -largo / 2 - 0.74));
  pts.push(new THREE.Vector2(0.135, -largo / 2 - 0.2));
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let r = R * perfil(u) * 0.90;
    if (u < 0.07) r = 0.135 + (r - 0.135) * (u / 0.07);
    if (u > 0.93) r *= (1 - u) / 0.07;
    pts.push(new THREE.Vector2(Math.max(0.004, r), (u - 0.5) * largo));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), matTusa);
  m.userData = { tipo: 'tusa' };
  return m;
}

/* ---------- el gusanito ---------- */

/* el bicho es el mismo de todos los niveles (bichos.js); aquí solo
   se lo acuesta sobre el eje de la mazorca: +Y avanza hacia la punta
   de la batea y +Z es lo que mira la cámara */
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
  /* que la hilera del bicho quede de frente: la amenaza se mira */
  giroObjetivo = acercarAngulo(giro.rotation.y, giroParaHilera(w.a));
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

/* qué rotación deja la hilera `a` mirando a la cámara */
function giroParaHilera(a) { return FRENTE - (a / A) * Math.PI * 2; }

/* ¿esta hilera se ve de frente ahora mismo? */
function alFrente(a, holgura = 0.62) {
  const dosPi = Math.PI * 2;
  let d = (giro.rotation.y + (a / A) * dosPi - FRENTE) % dosPi;
  if (d > Math.PI) d -= dosPi;
  if (d < -Math.PI) d += dosPi;
  return Math.abs(d) < holgura;
}

/* Si ya limpiaste todo lo que tenías al frente, la mazorca rueda sola
   hasta la hilera con granos más cercana. Girar a mano queda como
   opción, no como peaje: el juego es desgranar, no pelear la cámara. */
function autoGirar() {
  if (girando || cargado) return;
  const conGrano = [];
  for (let a = 0; a < A; a++) {
    if (granos[a].some(Boolean)) conGrano.push(a);
  }
  if (!conGrano.length) return;
  if (conGrano.some(a => alFrente(a))) return;
  let mejor = conGrano[0], mejorD = Infinity;
  conGrano.forEach(a => {
    const d = Math.abs(acercarAngulo(giro.rotation.y, giroParaHilera(a)) - giro.rotation.y);
    if (d < mejorD) { mejorD = d; mejor = a; }
  });
  giroObjetivo = acercarAngulo(giro.rotation.y, giroParaHilera(mejor));
}

/* La mano. No hace nada mecánicamente, y por eso mismo importa: sin
   ella la mazorca flota y el gesto no se entiende. Con ella, el
   teléfono en vertical ES la mano y la pantalla es el choclo.
   Agarra el TALLO, nunca los granos: si tapara granos habría
   posiciones imposibles de alcanzar por más que gires. */
function manoQueSostiene() {
  const piel = new THREE.MeshLambertMaterial({ color: '#c98d5f' });
  const pielOsc = new THREE.MeshLambertMaterial({ color: '#b07248' });
  const mano = new THREE.Group();
  mano.position.set(CENTRO[0], api.MESA_Y + CENTRO[1] + Y_MANO(), CENTRO[2]);

  /* el dorso, detrás del tallo */
  const dorso = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), piel);
  dorso.scale.set(0.92, 1.15, 0.6);
  dorso.position.set(0.02, -0.06, -0.05);
  mano.add(dorso);

  /* cuatro dedos cruzando por delante, escalonados como un puño */
  [0.2, 0.04, -0.12, -0.28].forEach((dy, i) => {
    const dedo = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.34, 6, 12), i % 2 ? pielOsc : piel);
    dedo.rotation.z = Math.PI / 2;
    dedo.rotation.y = 0.16 - i * 0.03;
    dedo.position.set(-0.02, dy, 0.2 - Math.abs(i - 1.2) * 0.02);
    mano.add(dedo);
    /* la yema, asomando al otro lado */
    const yema = new THREE.Mesh(new THREE.SphereGeometry(0.078, 10, 8), piel);
    yema.position.set(0.19, dy, 0.2);
    mano.add(yema);
  });

  /* el pulgar, que es el que de verdad desgrana */
  const pulgar = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.26, 6, 12), piel);
  pulgar.rotation.set(0.35, 0, 0.62);
  pulgar.position.set(-0.24, 0.24, 0.16);
  mano.add(pulgar);

  /* la muñeca se va por el borde de abajo, como tu propio brazo */
  const muneca = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.9, 16), pielOsc);
  muneca.rotation.x = 0.22;
  muneca.position.set(0.02, -0.72, 0.02);
  mano.add(muneca);

  /* una mano de verdad es casi tan ancha como el choclo: si se ve
     chiquita, deja de leerse como mano y parece un adorno */
  mano.scale.setScalar(1.45);
  mano.traverse(o => { o.userData.ignorar = true; });
  return mano;
}

/* ---------- reglas ---------- */

const existe = (a, p) => p >= 0 && p < P && !!granos[a][p];

function suelto(a, p) {
  if (!existe(a, p)) return false;
  if (p === 0 || p === P - 1) return true;          /* las puntas siempre ceden */
  return !existe(a, p - 1) || !existe(a, p + 1)
      || !existe((a + 1) % A, p) || !existe((a - 1 + A) % A, p);
}

function sacarGrano(a, p, conCascada, dir) {
  const g = granos[a][p];
  if (!g) return false;
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
    cascadas.push({ a, p: p + dir, dir, t: api.reloj + CASCADA_MS });
    /* La cita llega justo cuando el jugador acaba de comprobarlo con
       los dedos: se soltó uno de la orilla y se fue la hilera entera.
       Dicha antes sería una lección; dicha aquí es un reconocimiento. */
    corridaActual++;
    if (!dichoCacuango && corridaActual >= CORRIDA_PARA_LA_CITA) {
      dichoCacuango = true;
      citaPendiente = true;   /* se dice cuando la hilera TERMINE de caer */
    }
  } else corridaActual = 0;
  revisarFinal();
  return true;
}

function revisarFinal() {
  if (terminado) return;
  if (hechos < TOTAL) return;
  const quedan = gusanos.filter(w => w.estado === 'fuera' || w.estado === 'cargado').length;
  if (quedan) { api.aviso('Falta sacar el gusanito antes de llevar la batea'); return; }
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
  if (suelto(a, p)) {
    sacarGrano(a, p, esArrastre, esArrastre ? dirActual : 0);
    return;
  }
  /* trabado: hay que forzarlo, y eso se siente */
  raizGrano.userData.golpes++;
  api.sfx('resist'); api.buzz(8);
  const base = raizGrano.rotation.z;
  api.tween(raizGrano.rotation, 'z', base + 0.25, 0.06, undefined, () => api.tween(raizGrano.rotation, 'z', base, 0.12));
  if (raizGrano.userData.golpes >= RESISTENCIA) {
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
    revisarFinal();
  } else if (api.reloj - avisoCentro > 6) {
    avisoCentro = api.reloj;
    api.pista('Ese está trabado por los cuatro lados. Empieza por una <b>punta</b> y arrastra a lo largo.', 4000);
  }
}

/* ---------- contrato del nivel ---------- */

export default {
  id: 'maiz',
  /* de frente y en vertical: el encuadre del teléfono en la mano */
  camara: { pos: [0, 2.98, 3.4], mira: [0, 2.38, 0.12] },
  controles: [
    { id: 'izq', txt: '⟲', tip: 'girar' },
    { id: 'der', txt: '⟳', tip: 'girar' },
  ],

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    construirMateriales();
    granos = []; gusanos = []; cascadas = []; hechos = 0;
    modo = null; cargado = null; giroObjetivo = null; girando = 0;
    terminado = false; ultimoPop = api.reloj; avisoCentro = 0;
    corridaActual = 0; dichoCacuango = false; citaPendiente = false;

    mazorca = new THREE.Group();
    mazorca.position.set(CENTRO[0], api.MESA_Y + CENTRO[1], CENTRO[2]);
    /* de pie, apenas inclinada hacia quien la sostiene */
    mazorca.rotation.x = 0.1;
    raiz.add(mazorca);

    giro = new THREE.Group();
    giro.rotation.y = FRENTE;
    mazorca.add(giro);

    tusa = construirTusa();
    giro.add(tusa);

    granosGrupo = new THREE.Group();
    gusanosGrupo = new THREE.Group();
    giro.add(granosGrupo, gusanosGrupo);

    const geo = geoGrano();
    for (let a = 0; a < A; a++) {
      granos[a] = [];
      for (let p = 0; p < P; p++) {
        const g = nuevoGrano(a, p, geo);
        granos[a][p] = g;
        granosGrupo.add(g);
      }
    }

    /* las barbas del choclo, en la punta de arriba */
    const barbas = new THREE.Group();
    const matBarba = [new THREE.MeshLambertMaterial({ color: '#d9b06a' }), new THREE.MeshLambertMaterial({ color: '#caa15e' })];
    for (let i = 0; i < 14; i++) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.34, 4), matBarba[i % 2]);
      const th = (i / 14) * Math.PI * 2;
      h.position.set(Math.sin(th) * 0.07, P * PASO / 2 + 0.16, Math.cos(th) * 0.07);
      h.rotation.set(Math.cos(th) * 0.4, 0, -Math.sin(th) * 0.4);
      barbas.add(h);
    }
    giro.add(barbas);

    raiz.add(manoQueSostiene());

    /* los bichos: nunca en las puntas (ahí sería regalado encontrarlos) */
    const usados = new Set();
    for (let i = 0; i < GUSANOS; i++) {
      let a, p, k = 0;
      do {
        a = Math.floor(Math.random() * A);
        p = 3 + Math.floor(Math.random() * (P - 6));
        k++;
      } while (usados.has(a + ':' + p) && k < 40);
      usados.add(a + ':' + p);
      const w = nuevoBicho(a, p);
      w.obj.visible = false;
      gusanos.push(w);
    }

    api.progreso(0, TOTAL);
  },

  objetivos() { return [tusa, granosGrupo, gusanosGrupo]; },

  alTocar(info) {
    if (terminado) return;
    const r = info.raiz;
    if (!r) return;
    if (r.userData.tipo === 'gusano') { aplastado(gusanoDe(r)); return; }
    if (r.userData.tipo === 'grano') { intentarGrano(r, false); return; }
    if (r.userData.tipo === 'tusa') api.pista('Ahí ya no hay grano. Busca uno que tenga un hueco al lado.', 2600);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    dyPrev = 0;
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
    if (r && r.userData.tipo === 'grano') {
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
    if (terminado) return;
    if (modo === 'girar') {
      /* de pie, la mazorca rueda con el dedo de lado */
      giro.rotation.y = giro0 - (info.dx - dx0) * 0.013;
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
    if (modo === 'peinar') {
      /* la hilera va de abajo (p=0) a arriba (p=P-1): en pantalla,
         bajar el dedo es ir hacia p menor */
      const d = info.dy - dyPrev;
      dyPrev = info.dy;
      if (Math.abs(d) > 0.6) dirActual = d > 0 ? -1 : 1;
      const r = granoBajoElDedo();
      if (!r) return;
      if (r.userData.tipo === 'gusano') { aplastado(gusanoDe(r)); return; }
      if (r.userData.tipo !== 'grano') return;
      const { a, p } = r.userData;
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
        api.composta(gusanos.filter(x => x.estado === 'ido').length / GUSANOS);
        revisarFinal();
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
  },

  alControl(id, fase) {
    if (fase === 'abajo') { girando = id === 'izq' ? -1 : 1; giroObjetivo = null; }
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
      api.voz(CACUANGO, 9500);
      api.abrirCapitulo('unidad');
      api.sfx('bien');
    }

    /* la mazorca rueda sola cuando ya no queda nada al frente */
    tAuto -= dt;
    if (tAuto <= 0) { tAuto = 0.35; autoGirar(); }

    /* si te trabaste un rato, la cocina te sopla la respuesta */
    if (!terminado && hechos < TOTAL && ultimoPop && t - ultimoPop > 11) {
      ultimoPop = t;
      api.pista('Prueba por las <b>puntas</b> de la mazorca: ahí siempre hay un grano suelto.', 3600);
    }
  },

  destruir() {
    mazorca = giro = tusa = granosGrupo = gusanosGrupo = null;
    granos = []; gusanos = []; cascadas = [];
    cargado = null; modo = null; terminado = false;
  },
};
