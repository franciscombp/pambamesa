/* ============================================================
   FANESCA — nivel-habas.js
   DESVAINAR LAS HABAS.

   El eco del choclo, con otro gesto: aquí lo lento es sacar haba
   por haba a toquecitos, y lo rápido es pasar el dedo de un tirón
   por la vaina abierta y vaciarla entera.

   Pero el barrido es ciego: si en esa vaina había un gusanito, el
   dedo se lo lleva por delante. Antes de barrer hay que mirar —
   que es justamente lo que uno hace desvainando de verdad.

     · arrastrar sobre la vaina cerrada → se abre por la costura
     · tocar un haba                    → esa haba a la batea
     · arrastrar sobre las habas        → todas de una (a riesgo)
     · arrastrar desde el gusanito      → a la composta
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { POR_VAINA, PASO_HABA } from './modelos/habas.js';

let THREE, raiz, api;

const FILAS = [-0.3, 0.3];                  /* dos hileras de vainas */
const COLS = [-0.96, 0, 0.96];
const TABLA_Z = 0.28;
const CON_GUSANO = 2;                       /* cuántas vainas traen sorpresa */
const ABRIR = 0.16;                         /* mundo que recorre el dedo para abrir la vaina */

let vainasGrupo = null;
let vainas = [];
let plaga = null;
let hechos = 0;
let TOTAL = 0;
let modo = null;                            /* 'barrer' | 'cargar' */
let ultimoPunto = null;
let pellizcando = false;
let terminado = false;

/* La forma de la vaina y del haba vive en modelos/habas.js.
   Aquí solo se pide la pieza y se la pone donde va. */

function nuevaVaina(x, z, conGusano) {
  const v = api.pieza('vaina-haba');
  v.position.set(x, api.MESA_Y + 0.22, z);
  v.rotation.y = (Math.random() - 0.5) * 0.5;
  v.userData = { tipo: 'vaina', abierta: false };

  const bisagra = api.parte(v, 'bisagra');

  /* las habas van DENTRO de la vaina: así se inclinan con ella y,
     cuando la cáscara vacía se va a la composta, no queda nada suelto */
  const habas = [];
  for (let i = 0; i < POR_VAINA; i++) {
    const h = api.pieza('haba');
    h.position.set((i - (POR_VAINA - 1) / 2) * PASO_HABA, -0.008, 0);
    h.userData = { tipo: 'haba' };
    h.visible = false;
    habas.push(h);
    v.add(h);
  }

  return { obj: v, bisagra, habas, conGusano, abierta: false, vaciada: false };
}

function abrirVaina(rec) {
  if (rec.abierta) return;
  rec.abierta = true;
  rec.obj.userData.abierta = true;
  api.tween(rec.bisagra.rotation, 'x', -2.1, 0.34);
  api.sfx('crack'); api.buzz(14);
  rec.habas.forEach((h, i) => {
    h.visible = true;
    h.scale.setScalar(0.01);
    setTimeout(() => {
      api.tween(h.scale, 'x', 1, 0.22); api.tween(h.scale, 'y', 1, 0.22); api.tween(h.scale, 'z', 1, 0.22);
    }, i * 35);
  });
  if (rec.conGusano) {
    const p = rec.obj.position.clone();
    p.z += 0.12;
    plaga.soltar('gusano', p);
  }
}

function sacarHaba(h) {
  if (!h.visible || h.userData.ida) return false;
  h.userData.ida = true;
  h.visible = true;
  hechos++;
  api.chispas(h.position.clone(), '#e4f0b4', 4, 0.7);
  h.userData.escalaBase = 1;
  api.volarA(h, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.44 + Math.random() * 0.1, alto: 0.6 });
  api.sfx(hechos % 2 ? 'pop' : 'pop2');
  api.progreso(hechos, TOTAL);
  revisarVaciadas();
  revisarFinal();
  return true;
}

/* la cáscara vacía se va sola a la composta: nadie quiere un
   minijuego de recoger basura */
function revisarVaciadas() {
  vainas.forEach(rec => {
    if (rec.vaciada || !rec.abierta) return;
    if (rec.habas.some(h => !h.userData.ida)) return;
    rec.vaciada = true;
    setTimeout(() => {
      if (!rec.obj.parent) return;
      rec.obj.userData.tipo = null;
      rec.obj.userData.escalaBase = 1;
      api.volarA(rec.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.5 });
      api.composta(vainas.filter(v => v.vaciada).length / vainas.length);
    }, 260);
  });
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gusanito antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

function bajoElDedo() {
  const hits = api.raycast([vainasGrupo, plaga.grupo], true);
  for (const h of hits) {
    let o = h.object;
    while (o && !(o.userData && o.userData.tipo)) o = o.parent;
    if (o) return o;
  }
  return null;
}

export default {
  id: 'habas',

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    vainas = []; hechos = 0; terminado = false; modo = null; ultimoPunto = null; pellizcando = false;

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: 1.7 });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    vainasGrupo = new THREE.Group();
    raiz.add(vainasGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gusanito', vel: 0.13,
      /* la tabla sobresale del mesón: el bicho tiene que caminar
         ENCIMA de ella, no dentro */
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    /* qué vainas traen bicho: se decide al armar, nunca a mitad de partida */
    const conBicho = new Set();
    while (conBicho.size < CON_GUSANO) conBicho.add(Math.floor(Math.random() * (FILAS.length * COLS.length)));

    let i = 0;
    FILAS.forEach(dz => COLS.forEach(dx => {
      const rec = nuevaVaina(dx, TABLA_Z + dz, conBicho.has(i));
      vainasGrupo.add(rec.obj);
      vainas.push(rec);
      i++;
    }));

    TOTAL = vainas.length * POR_VAINA;
    api.progreso(0, TOTAL);
  },

  objetivos() { return [vainasGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado || !info.raiz) return;
    const t = info.raiz.userData.tipo;
    if (t === 'bicho') { plaga.aplastar(plaga.de(info.raiz)); return; }
    if (t === 'haba') { sacarHaba(info.raiz); return; }
    if (t === 'vaina') {
      const rec = vainas.find(v => v.obj === info.raiz);
      if (rec && !rec.abierta) {
        api.sfx('resist');
        api.tween(rec.obj.rotation, 'z', 0.12, 0.07, undefined, () => api.tween(rec.obj.rotation, 'z', 0, 0.14));
        api.pista('Pásale el dedo <b>a lo largo de la costura</b> para abrirla.', 3000);
      }
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    if (r && r.userData.tipo === 'bicho') {
      const rec = plaga.de(r);
      if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    }
    modo = 'barrer';
    ultimoPunto = api.puntoEnPlano(api.MESA_Y + 0.24);
    if (r && r.userData.tipo === 'haba') sacarHaba(r);
  },

  alArrastrar(info) {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo !== 'barrer') return;

    /* cuánto recorrió el dedo por la mesa desde el cuadro anterior */
    const p = api.puntoEnPlano(api.MESA_Y + 0.24);
    const prev = ultimoPunto;
    ultimoPunto = p;
    const paso = (p && prev) ? Math.hypot(p.x - prev.x, p.z - prev.z) : 0;

    const bajo = bajoElDedo();
    if (!bajo) return;
    if (bajo.userData.tipo === 'bicho') { plaga.aplastar(plaga.de(bajo)); return; }
    if (bajo.userData.tipo === 'haba') { sacarHaba(bajo); return; }
    if (bajo.userData.tipo === 'vaina') {
      const rec = vainas.find(v => v.obj === bajo);
      if (!rec || rec.abierta) return;
      /* la costura cede a medida que el dedo la recorre: la tapa se va
         levantando sola y el jugador ve que va por buen camino */
      rec.frote = (rec.frote || 0) + paso;
      const k = Math.min(1, rec.frote / ABRIR);
      rec.bisagra.rotation.x = -0.55 * k;
      if (rec.frote >= ABRIR) abrirVaina(rec);
    }
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
    modo = null; ultimoPunto = null;
  },

  /* pellizcar con dos dedos: agarra el bicho más cercano EN PANTALLA,
     sin exigirle al primer dedo que caiga justo sobre su malla */
  alPellizcarInicio(info) {
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
    if (plaga) plaga.actualizar(dt, t);
  },

  destruir() {
    if (plaga) plaga.destruir();
    vainas = []; plaga = null; vainasGrupo = null;
    modo = null; ultimoPunto = null; pellizcando = false; terminado = false;
  },
};
