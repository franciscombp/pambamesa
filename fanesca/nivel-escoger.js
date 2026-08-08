/* ============================================================
   FANESCA — nivel-escoger.js
   ESCOGER EL GRANO (lenteja).

   El único nivel que no premia la velocidad. Escoger el grano es
   lo que se hace sentadas, con el grano regado sobre la mesa y
   conversando: sacar las piedritas, los granos picados, los palos.
   No hay atajo — el atajo es justamente el error.

   Y por eso aquí la regla de los bichos deja de ser un castigo
   añadido y pasa a ser el nivel entero: el gorgojo es del mismo
   tamaño y casi del mismo color que una piedrita. Tocar lo que
   sobra es el gesto correcto; tocar al gorgojo es aplastarlo. La
   única forma de no equivocarse es mirar antes de tocar.

     · tocar una piedrita o un grano picado → fuera, a la composta
     · tocar una lenteja buena              → se pierde (cuesta)
     · arrastrar desde el gorgojo           → a la composta
     · con la mesa limpia, barrer           → todo a la batea
   ============================================================ */

import { nuevaPlaga } from './plaga.js';

let THREE, raiz, api;

const BUENAS = 46;
const PIEDRAS = 7;
const PICADOS = 5;
const GORGOJOS = 2;
const TABLA_Z = 0.3;
const ANCHO = 1.36, HONDO = 0.62;
const RADIO_DEDO = 0.1;          /* fino a propósito: aquí se apunta */
const RADIO_BARRIDO = 0.2;

let granosGrupo = null;
let granos = [];                 /* {obj, clase:'buena'|'piedra'|'picado', ido} */
let plaga = null;
let sacados = 0;                 /* impurezas fuera */
let recogidas = 0;               /* lentejas buenas en la batea */
let perdidas = 0;
let fase = 'escoger';            /* 'escoger' | 'barrer' */
let modo = null;
let pellizcando = false;
let terminado = false;

const SUCIAS = () => PIEDRAS + PICADOS;
const TOTAL = () => SUCIAS() + BUENAS;

/* Las tres formas —la buena, la piedra angulosa y la picada con su
   agujero— viven en modelos/lenteja.js. Esa diferencia de forma ES
   el nivel: si se vieran igual, escoger sería adivinar. */

const PIEZA_DE = { buena: 'lenteja', piedra: 'piedra', picado: 'lenteja-picada' };

function nuevoGrano(clase, x, z) {
  const g = api.pieza(PIEZA_DE[clase] || 'lenteja');
  g.position.set(x, api.MESA_Y + 0.13, z);
  g.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
  g.userData = { tipo: 'grano', clase };
  return { obj: g, clase, ido: false };
}

function sacar(rec) {
  if (rec.ido) return;
  rec.ido = true;
  rec.obj.userData.tipo = null;
  const buena = rec.clase === 'buena';

  if (buena) {
    /* tocar una lenteja buena la manda a la composta: no arruina la
       olla, pero se pierde, y eso ya duele lo justo */
    perdidas++;
    api.sfx('resist'); api.buzz(12);
    api.toast('Esa estaba buena 😕');
  } else {
    sacados++;
    api.sfx('pop'); api.buzz(8);
    api.chispas(rec.obj.position.clone().setY(api.MESA_Y + 0.26), '#cfd8dc', 4, 0.5);
  }
  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.44, alto: 0.45 });
  api.composta((sacados + perdidas) / (SUCIAS() + 6));

  api.progreso(sacados + recogidas, TOTAL());
  revisarFase();
}

function recoger(rec) {
  if (rec.ido || rec.clase !== 'buena') return;
  rec.ido = true;
  rec.obj.userData.tipo = null;
  recogidas++;
  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.4, alto: 0.5 });
  api.sfx(recogidas % 2 ? 'pop' : 'pop2');
  api.progreso(sacados + recogidas, TOTAL());
  revisarFinal();
}

/* la mesa está limpia cuando no queda ni una impureza a la vista */
function revisarFase() {
  if (fase !== 'escoger') return;
  const sucio = granos.some(g => !g.ido && g.clase !== 'buena');
  if (sucio || plaga.vivos()) return;
  fase = 'barrer';
  api.sfx('bien');
  api.aviso(null);
  api.pista('Limpio. Ahora <b>barre las lentejas</b> a la batea.', 4200);
  api.toast('Mesa limpia ✦');
}

function revisarFinal() {
  if (terminado) return;
  if (granos.some(g => !g.ido && g.clase === 'buena')) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

function bajoElDedo(punto, radio) {
  if (!punto) return null;
  let mejor = null, mejorD = radio;
  for (const g of granos) {
    if (g.ido) continue;
    const d = Math.hypot(g.obj.position.x - punto.x, g.obj.position.z - punto.z);
    if (d < mejorD) { mejorD = d; mejor = g; }
  }
  return mejor;
}

function barrerEn(punto) {
  if (!punto) return;
  const bicho = plaga.cercaDe(punto, RADIO_BARRIDO);
  if (bicho) { plaga.aplastar(bicho); return; }
  for (const g of granos) {
    if (g.ido) continue;
    if (Math.hypot(g.obj.position.x - punto.x, g.obj.position.z - punto.z) > RADIO_BARRIDO) continue;
    if (g.clase === 'buena') recoger(g);
    else {
      /* barrer con basura todavía puesta la manda a la batea: es el
         error que este nivel entero existe para enseñar */
      api.arruinar({
        titulo: 'Barriste con todo',
        texto: 'Te llevaste una piedra a la batea junto con las lentejas. Eso se siente al primer bocado y no hay cómo sacarlo después: toca escoger de nuevo.',
      });
      return;
    }
  }
}

export default {
  id: 'escoger',
  /* el nivel entero es mirar de cerca: la cámara acompaña */
  /* acercada, pero con los dos cuencos dentro del encuadre: sin eso
     no hay dónde soltar el gorgojo */
  camara: { pos: [0, 2.9, 3.75], mira: [0, 1.08, 0.42] },

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    granos = []; sacados = 0; recogidas = 0; perdidas = 0;
    fase = 'escoger'; modo = null; pellizcando = false; terminado = false;

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: 1.7 });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    granosGrupo = new THREE.Group();
    raiz.add(granosGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gorgojo', vel: 0.1,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    /* regadas de verdad, no en rejilla: si estuvieran alineadas se
       verían de un golpe y no habría nada que escoger */
    const puestos = [];
    const meter = (clase) => {
      let x, z, k = 0;
      do {
        x = (Math.random() - 0.5) * 2 * ANCHO;
        z = TABLA_Z + (Math.random() - 0.5) * 2 * HONDO;
        k++;
      } while (k < 60 && puestos.some(p => Math.hypot(p.x - x, p.z - z) < 0.115));
      puestos.push({ x, z });
      const rec = nuevoGrano(clase, x, z);
      granosGrupo.add(rec.obj);
      granos.push(rec);
    };
    for (let i = 0; i < BUENAS; i++) meter('buena');
    for (let i = 0; i < PIEDRAS; i++) meter('piedra');
    for (let i = 0; i < PICADOS; i++) meter('picado');

    /* los gorgojos están desde el principio: son parte de lo que hay
       que encontrar, no una sorpresa a mitad de camino */
    for (let i = 0; i < GORGOJOS; i++) {
      const x = (Math.random() - 0.5) * 2 * ANCHO * 0.8;
      const z = TABLA_Z + (Math.random() - 0.5) * 2 * HONDO * 0.8;
      plaga.soltar('gorgojo', new THREE.Vector3(x, api.MESA_Y, z));
    }
    api.aviso('Saca piedritas y granos picados. Ojo: hay gorgojos');
    api.progreso(0, TOTAL());
  },

  objetivos() { return [granosGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.aplastar(plaga.de(info.raiz)); return; }
    const punto = api.puntoEnPlano(api.MESA_Y + 0.13);
    const bicho = plaga.cercaDe(punto, RADIO_DEDO);
    if (bicho) { plaga.aplastar(bicho); return; }
    const g = bajoElDedo(punto, RADIO_DEDO);
    if (!g) return;
    if (fase === 'barrer' && g.clase === 'buena') { recoger(g); return; }
    sacar(g);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    if (r && r.userData.tipo === 'bicho') {
      const rec = plaga.de(r);
      if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    }
    if (fase === 'barrer') { modo = 'barrer'; barrerEn(api.puntoEnPlano(api.MESA_Y + 0.13)); return; }
    /* mientras haya basura, arrastrar no barre: obligaría a mirar menos */
    modo = null;
    api.pista('Todavía no. <b>Toca</b> las piedritas y los granos picados uno por uno.', 3000);
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo === 'barrer') barrerEn(api.puntoEnPlano(api.MESA_Y + 0.13));
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFase(); revisarFinal(); }
    modo = null;
  },

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
    revisarFase();
    revisarFinal();
  },

  actualizar(dt, t) {
    if (plaga) plaga.actualizar(dt, t);
  },

  destruir() {
    if (plaga) plaga.destruir();
    granos = []; plaga = null; granosGrupo = null;
    modo = null; pellizcando = false; terminado = false;
  },
};
