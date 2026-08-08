/* ============================================================
   FANESCA — nivel-frejol.js
   REVENTAR EL FRÉJOL.

   El fréjol tierno no se abre con delicadeza: se aprieta hasta
   que truena. Por eso este nivel cambia el toque por la presión —
   mantener el dedo — y el barrido deja de ser un atajo para
   volverse el trabajo mismo: los granos quedan regados por la
   tabla y hay que empujarlos a la batea.

   Y ahí está la trampa. Entre los granos regados anda un gorgojo
   del mismo tamaño y casi del mismo color. Si barres sin mirar,
   lo barres a la batea con todo lo demás.

     · mantener el dedo sobre la vaina → truena y riega los granos
     · barrer con el dedo              → los granos que toque, a la batea
     · arrastrar desde el gorgojo      → a la composta
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { POR_VAINA } from './modelos/frejol.js';

let THREE, raiz, api;

const VAINAS = 5;
/* La tabla no se planta en un z puesto a ojo: `api.FRENTE_TABLA` es
   hasta dónde puede llegar sin meterse dentro de los cuencos, y de
   ahí se resta media tabla. Si mañana la batea se mueve, la tabla se
   corre sola. */
const HONDO_TABLA = 1.7;
let TABLA_Z = 0;                 /* se fija en construir(), desde api */
const APRIETE = 0.62;            /* segundos de presión para que reviente */
const CON_GORGOJO = 2;
const RADIO_BARRIDO = 0.17;      /* qué tan gordo es el dedo, en el mundo */

let vainasGrupo = null, granosGrupo = null;
let vainas = [];
let granos = [];                 /* los que quedaron regados */
let plaga = null;
let hechos = 0, TOTAL = VAINAS * POR_VAINA;
let modo = null;
let apretando = null;            /* { rec, t0 } */
let pellizcando = false;
let terminado = false;

/* La vaina moteada y el grano vino viven en modelos/frejol.js. */

function nuevaVaina(x, z, conGorgojo) {
  const v = api.pieza('vaina-frejol');
  v.position.set(x, api.MESA_Y + 0.2, z);
  v.rotation.y = (Math.random() - 0.5) * 0.8;
  v.userData = { tipo: 'vaina' };
  v.add(api.sombraBlob(0.6, -0.19));
  return { obj: v, conGorgojo, reventada: false, x, z };
}

function nuevoGrano(x, z) {
  const g = api.pieza('grano-frejol', { variante: granos.length });
  g.position.set(x, api.MESA_Y + 0.14, z);
  g.rotation.y = Math.random() * Math.PI;
  g.userData = { tipo: 'grano' };
  granosGrupo.add(g);
  granos.push(g);
  return g;
}

function reventar(rec) {
  if (rec.reventada) return;
  rec.reventada = true;
  rec.obj.userData.tipo = null;
  api.sfx('crack'); api.buzz([30, 20, 40]);
  api.chispas(rec.obj.position.clone(), '#e9d9a0', 10, 0.9);

  /* la cáscara salta y se va sola a la composta */
  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.55, alto: 0.7 });
  api.composta(vainas.filter(v => v.reventada).length / vainas.length);

  /* los granos se riegan alrededor: por eso después hay que barrer */
  for (let i = 0; i < POR_VAINA; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 0.09 + Math.random() * 0.28;
    const gx = Math.max(-1.35, Math.min(1.35, rec.x + Math.cos(a) * d));
    const gz = Math.max(TABLA_Z - 0.62, Math.min(TABLA_Z + 0.62, rec.z + Math.sin(a) * d * 0.7));
    const g = nuevoGrano(rec.x, rec.z);
    g.scale.setScalar(0.4);
    api.tween(g.scale, 'x', 1, 0.22); api.tween(g.scale, 'y', 1, 0.22); api.tween(g.scale, 'z', 1, 0.22);
    api.tween(g.position, 'x', gx, 0.3);
    api.tween(g.position, 'z', gz, 0.3);
  }

  if (rec.conGorgojo) {
    const p = new THREE.Vector3(rec.x, api.MESA_Y, rec.z + 0.14);
    plaga.soltar('gorgojo', p);
  }
}

function recogerGrano(g) {
  if (g.userData.ido) return;
  g.userData.ido = true;
  g.userData.tipo = null;
  hechos++;
  g.userData.escalaBase = 1;
  api.volarA(g, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.4 + Math.random() * 0.1, alto: 0.5 });
  api.sfx(hechos % 2 ? 'pop' : 'pop2');
  api.progreso(hechos, TOTAL);
  revisarFinal();
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

/* el barrido es de área, no de rayo: el dedo tapa varios granos a la
   vez y sería tramposo exigir precisión de puntero */
function barrerEn(punto) {
  if (!punto) return;
  /* el gorgojo también cae bajo el dedo: por eso hay que mirar antes */
  const bicho = plaga.cercaDe(punto, RADIO_BARRIDO);
  if (bicho) { plaga.aplastar(bicho); return; }
  for (const g of granos) {
    if (g.userData.ido) continue;
    if (Math.hypot(g.position.x - punto.x, g.position.z - punto.z) < RADIO_BARRIDO) recogerGrano(g);
  }
}

export default {
  id: 'frejol',

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    vainas = []; granos = []; hechos = 0; terminado = false; modo = null; apretando = null; pellizcando = false;

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    vainasGrupo = new THREE.Group();
    granosGrupo = new THREE.Group();
    raiz.add(vainasGrupo, granosGrupo);
    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gorgojo', vel: 0.15,
      /* la tabla sobresale del mesón: el bicho tiene que caminar
         ENCIMA de ella, no dentro */
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    const conBicho = new Set();
    while (conBicho.size < CON_GORGOJO) conBicho.add(Math.floor(Math.random() * VAINAS));

    const xs = [-1.05, -0.52, 0, 0.52, 1.05];
    xs.forEach((x, i) => {
      const rec = nuevaVaina(x, TABLA_Z + (i % 2 ? 0.3 : -0.26), conBicho.has(i));
      vainasGrupo.add(rec.obj);
      vainas.push(rec);
    });

    api.progreso(0, TOTAL);
  },

  objetivos() { return [vainasGrupo, granosGrupo, plaga.grupo]; },

  /* la presión empieza en cuanto baja el dedo, no al soltarlo */
  alPresionar(info) {
    if (terminado || !info.raiz) return;
    if (info.raiz.userData.tipo === 'vaina') {
      const rec = vainas.find(v => v.obj === info.raiz);
      if (rec && !rec.reventada) apretando = { rec, t0: api.reloj };
    }
  },

  alTocar(info) {
    apretando = null;
    if (terminado || !info.raiz) return;
    const t = info.raiz.userData.tipo;
    if (t === 'bicho') { plaga.aplastar(plaga.de(info.raiz)); return; }
    if (t === 'vaina') {
      api.sfx('resist');
      api.pista('No basta un toquecito: <b>mantén el dedo</b> apretado hasta que truene.', 3200);
      return;
    }
    if (t === 'grano') { recogerGrano(info.raiz); return; }
  },

  alArrastrarInicio(info) {
    apretando = null;
    if (terminado) return;
    const r = info.raiz;
    if (r && r.userData.tipo === 'bicho') {
      const rec = plaga.de(r);
      if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    }
    modo = 'barrer';
    barrerEn(api.puntoEnPlano(api.MESA_Y + 0.14));
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo === 'barrer') barrerEn(api.puntoEnPlano(api.MESA_Y + 0.14));
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
    modo = null; apretando = null;
  },

  alPellizcarInicio(info) {
    apretando = null;
    if (terminado) return;
    const rec = plaga.masCercaEnPantalla(info.cliente.x, info.cliente.y);
    if (rec && plaga.agarrar(rec)) pellizcando = true;
  },
  alPellizcarMover() {
    if (!pellizcando) return;
    plaga.mover(api.puntoEnPlano(api.MESA_Y));
  },
  alPellizcarFin() {
    if (!pellizcando) return;
    pellizcando = false;
    plaga.soltarMano();
    revisarFinal();
  },

  actualizar(dt, t) {
    if (plaga && plaga.actualizar(dt, t)) return;

    /* la vaina se hincha mientras la aprietas: el aviso de que va a tronar */
    if (apretando) {
      const k = Math.min(1, (t - apretando.t0) / APRIETE);
      const e = 1 + k * 0.22;
      apretando.rec.obj.scale.set(e, e, e);
      apretando.rec.obj.rotation.z = Math.sin(t * 40) * 0.03 * k;
      if (k >= 1) {
        const rec = apretando.rec;
        apretando = null;
        rec.obj.scale.setScalar(1);
        reventar(rec);
      }
    } else {
      vainas.forEach(v => { if (!v.reventada && v.obj.scale.x !== 1) { v.obj.scale.setScalar(1); v.obj.rotation.z = 0; } });
    }
  },

  destruir() {
    if (plaga) plaga.destruir();
    vainas = []; granos = []; plaga = null;
    vainasGrupo = granosGrupo = null;
    modo = null; apretando = null; pellizcando = false; terminado = false;
  },
};
