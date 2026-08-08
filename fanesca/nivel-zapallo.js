/* ============================================================
   FANESCA — nivel-zapallo.js
   CORTAR EL ZAPALLO.

   Aquí el gesto es el trazo largo y decidido: cruzar el zapallo
   siguiendo una línea punteada, de adelante hacia atrás. Un trazo
   torcido no corta nada — el cuchillo resbala y pierdes tiempo.

   Y otra vez la lección del choclo, con otra cara: una tajada
   solo cae a la batea cuando queda suelta por los dos lados. Si
   empiezas por una punta, cada corte te entrega una tajada. Si
   empiezas por el medio, cortas igual pero no cae nada todavía.

   El gusano de este nivel no camina rápido: se pasea encima del
   zapallo. El peligro no es que llegue a la batea, es que lo
   partas en dos sin verlo, porque estaba justo sobre tu línea.
   ============================================================ */

import { nuevoGusano } from './modelos/bichos.js';
import { ARRUINADO } from './arruinado.js';
import { N, GRUESO, R, xDeTajada, xDeFrontera } from './modelos/zapallo.js';

let THREE, raiz, api;

const TABLA_Z = 0.24;
const TOL_X = 0.19;             /* cuánto puede desviarse el corte */
const LARGO_MIN = 0.42;         /* profundidad mínima del trazo, en el mundo */
const GUSANO_VEL = 0.055;       /* se pasea despacio: da tiempo a verlo */

let zapallo = null;             /* grupo con las tajadas */
let tajadas = [];               /* {mesh, i, ida} */
let guias = [];                 /* {grupo, b} — b = frontera 1..N-1 */
let cortes = new Set();         /* fronteras ya cortadas */
let bicho = null;               /* {nodo, gus, x, estado} */
let hechos = 0;
let modo = null, cargado = false, pellizcando = false;
let p0 = null;                  /* dónde empezó el trazo, en el mundo */
let terminado = false;

/* La tajada, la guía punteada y las pepas viven en
   modelos/zapallo.js — junto con las medidas (N, GRUESO, R) que
   este nivel usa para saber dónde cae cada corte. */

/* a qué altura descansa el zapallo: sobre la tabla, no sobre el mesón */
const ALTO = () => api.MESA_Y + 0.1;

function nuevaTajada(i) {
  const g = api.pieza('tajada-zapallo');
  g.position.set(xDeTajada(i), ALTO(), TABLA_Z);
  g.userData = { tipo: 'zapallo', i };
  return g;
}

function nuevaGuia(b) {
  const g = api.pieza('guia-zapallo');
  g.position.set(xDeFrontera(b), ALTO(), TABLA_Z);
  return { grupo: g, b };
}

function libre(b) { return b <= 0 || b >= N || cortes.has(b); }

/* una tajada cae cuando quedó suelta por los dos lados */
function revisarSueltas() {
  tajadas.forEach(t => {
    if (t.ida) return;
    if (!libre(t.i) || !libre(t.i + 1)) return;
    t.ida = true;
    t.mesh.userData.tipo = null;
    hechos++;
    api.chispas(t.mesh.position.clone().setY(ALTO() + 0.3), '#ffd28a', 8, 0.9);
    t.mesh.userData.escalaBase = 1;
    api.volarA(t.mesh, api.BATEA.clone().setY(api.MESA_Y + 0.24), { dur: 0.5, alto: 0.72 });
    api.sfx('pop');
    api.progreso(hechos, N);
  });
  revisarFinal();
}

function revisarFinal() {
  if (terminado || hechos < N) return;
  if (bicho && bicho.estado !== 'ido') { api.aviso('Falta sacar el gusano antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

function cortar(b) {
  if (cortes.has(b)) return false;

  /* ¿estaba el gusano justo ahí? entonces lo partiste */
  if (bicho && bicho.estado === 'suelto' && Math.abs(bicho.x - xDeFrontera(b)) < 0.19) {
    api.destello('rgba(230,57,70,.55)');
    api.arruinar({
      titulo: 'Lo partiste en dos',
      texto: 'El cuchillo pasó justo por encima del gusano. Medio gusano se quedó en la tajada y ese zapallo ya no va a la olla: hay que empezar de nuevo.',
    });
    return true;
  }

  cortes.add(b);
  const g = guias.find(x => x.b === b);
  if (g) {
    api.tween(g.grupo.scale, 'y', 0.01, 0.18, undefined, () => { g.grupo.visible = false; });
  }
  api.sfx('corte'); api.buzz([12, 18]);
  api.chispas(new THREE.Vector3(xDeFrontera(b), ALTO() + R, TABLA_Z), '#fff3c9', 9, 0.8);
  revisarSueltas();
  return true;
}

/* ---------- el gusano paseandero ---------- */

function nacerBicho() {
  const gus = nuevoGusano(THREE, { eje: 'z', escala: 1.9, color: '#c4e076', color2: '#9dc24f', segmentos: 6 });
  const nodo = new THREE.Group();
  nodo.userData = { tipo: 'bicho' };
  nodo.add(gus.obj);
  const x = xDeFrontera(2 + Math.floor(Math.random() * (N - 3)));
  nodo.position.set(x, ALTO() + R + 0.1, TABLA_Z + 0.02);
  nodo.rotation.y = Math.PI / 2;
  raiz.add(nodo);
  bicho = { nodo, gus, x, dir: 1, estado: 'suelto' };
}

function bichoEncima() {
  if (!bicho || bicho.estado !== 'suelto') return;
  bicho.nodo.position.set(bicho.x, ALTO() + R + 0.1, TABLA_Z + 0.02);
}

export default {
  id: 'zapallo',

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    tajadas = []; guias = []; cortes = new Set(); hechos = 0;
    terminado = false; modo = null; cargado = false; pellizcando = false; bicho = null;

    const tabla = api.pieza('tabla', { ancho: 3.2, hondo: 1.5 });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    zapallo = new THREE.Group();
    raiz.add(zapallo);

    for (let i = 0; i < N; i++) {
      const m = nuevaTajada(i);
      zapallo.add(m);
      tajadas.push({ mesh: m, i, ida: false });
    }
    /* las pepas asomando por la cara abierta de las puntas */
    [-1, 1].forEach(s => {
      for (let i = 0; i < 5; i++) {
        const p = api.pieza('pepa-zapallo');
        const a = 0.4 + Math.random() * 2.3;
        p.position.set(s * (N * GRUESO / 2 - 0.01), ALTO() + Math.sin(a) * R * 0.45, TABLA_Z - Math.cos(a) * R * 0.45);
        p.rotation.set(Math.random(), Math.random(), Math.random());
        zapallo.add(p);
      }
    });

    for (let b = 1; b < N; b++) {
      const g = nuevaGuia(b);
      zapallo.add(g.grupo);
      guias.push(g);
    }

    nacerBicho();
    api.aviso('🪱 Hay un gusano encima. Sácalo antes de cortar por ahí');
    api.progreso(0, N);
  },

  objetivos() { return (bicho && bicho.estado !== 'ido') ? [zapallo, bicho.nodo] : [zapallo]; },

  alTocar(info) {
    if (terminado || !info.raiz) return;
    if (info.raiz.userData.tipo === 'bicho') {
      api.arruinar(ARRUINADO.aplastado('gusano'));
      return;
    }
    api.sfx('resist');
    api.pista('El zapallo no se abre a toquecitos: <b>cruza la línea punteada</b> de un trazo.', 3200);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho' && bicho && bicho.estado === 'suelto') {
      modo = 'cargar'; cargado = true;
      bicho.estado = 'cargado';
      bicho.gus.aro.visible = false;
      api.sfx('tab'); api.buzz(12);
      api.aviso('Llévalo a la composta 🌿');
      return;
    }
    modo = 'cortar';
    p0 = api.puntoEnPlano(ALTO() + R * 0.55);
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar' && bicho) {
      const p = api.puntoEnPlano(api.MESA_Y);
      if (p) {
        bicho.suelo = { x: p.x, z: p.z };
        bicho.nodo.position.set(p.x, api.MESA_Y + 0.45, p.z);
      }
      bicho.nodo.rotation.z = Math.sin(api.reloj * 12) * 0.3;
    }
  },

  /* pellizcar con dos dedos: el gusano se pasea encima del zapallo y
     un raycast exacto de un dedo solo lo pierde fácil; en pantalla,
     con un radio generoso, es mucho más fácil de agarrar. */
  alPellizcarInicio(info) {
    pellizcando = false;
    modo = null;          /* que un modo viejo no siga vivo bajo el pellizco */
    if (terminado || !bicho || bicho.estado !== 'suelto') return;
    const mundo = new THREE.Vector3();
    bicho.nodo.getWorldPosition(mundo);
    const p = api.proyectar(mundo);
    if (Math.hypot(p.x - info.cliente.x, p.y - info.cliente.y) > 70) return;
    pellizcando = true;
    modo = 'cargar'; cargado = true;
    bicho.estado = 'cargado';
    bicho.gus.aro.visible = false;
    api.sfx('tab'); api.buzz(12);
    api.aviso('Llévalo a la composta 🌿');
  },
  /* Solo si el pellizco DE VERDAD agarró el gusano se sigue el ciclo
     de cargar. Si no agarró nada, el gesto no hace nada — antes
     delegaba igual y podía ejecutar un corte con el `modo` que había
     quedado de un gesto anterior, partiendo al gusano sin que el
     jugador hubiera cortado nada. */
  alPellizcarMover(info) { if (pellizcando) this.alArrastrar(info); },
  alPellizcarFin(info) {
    if (!pellizcando) { modo = null; return; }
    pellizcando = false;
    this.alArrastrarFin(info);
  },

  alArrastrarFin() {
    if (terminado) { modo = null; return; }

    if (modo === 'cargar' && bicho) {
      const p = bicho.suelo || bicho.nodo.position;
      if (Math.hypot(p.x - api.COMPOSTA.x, p.z - api.COMPOSTA.z) < 0.75) {
        bicho.estado = 'ido';
        api.volarA(bicho.nodo, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.35, alto: 0.35 });
        api.chispas(api.COMPOSTA.clone().setY(api.MESA_Y + 0.4), '#8ab143', 10);
        api.sfx('bien'); api.buzz([15, 25]);
        api.aviso(null); api.toast('¡Fuera de la olla! 🌿');
        api.composta(1);
        revisarFinal();
      } else {
        bicho.estado = 'suelto';
        bicho.gus.aro.visible = true;
        bicho.nodo.rotation.z = 0;
        bichoEncima();
        api.sfx('resist');
        api.aviso('🪱 Se te resbaló, y volvió al zapallo');
      }
      modo = null; cargado = false;
      return;
    }

    if (modo === 'cortar' && p0) {
      const p1 = api.puntoEnPlano(ALTO() + R * 0.55);
      modo = null;
      if (!p1) return;
      const largo = Math.abs(p1.z - p0.z);
      const xMedio = (p0.x + p1.x) / 2;
      const torcido = Math.abs(p1.x - p0.x);

      /* ¿a qué línea le apuntaba el trazo? */
      let mejor = null, mejorD = Infinity;
      guias.forEach(g => {
        if (cortes.has(g.b)) return;
        const d = Math.abs(xDeFrontera(g.b) - xMedio);
        if (d < mejorD) { mejorD = d; mejor = g.b; }
      });

      if (mejor === null) return;
      if (largo < LARGO_MIN) {
        api.sfx('resist');
        api.pista('Trazo corto: <b>cruza el zapallo entero</b>, de adelante hacia atrás.', 2800);
        return;
      }
      if (mejorD > TOL_X || torcido > 0.5) {
        api.sfx('resist'); api.buzz(20);
        api.pista('Corte chueco — el cuchillo resbaló. Sigue la línea punteada.', 2800);
        return;
      }
      cortar(mejor);
    }
    modo = null;
  },

  actualizar(dt, t) {
    if (!bicho) return;
    bicho.gus.animar(t);
    if (bicho.estado !== 'suelto') return;

    /* se pasea de un lado a otro sobre lo que queda del zapallo */
    const izq = -N * GRUESO / 2 + 0.12, der = N * GRUESO / 2 - 0.12;
    bicho.x += bicho.dir * GUSANO_VEL * dt;
    if (bicho.x > der) { bicho.x = der; bicho.dir = -1; }
    if (bicho.x < izq) { bicho.x = izq; bicho.dir = 1; }
    bicho.nodo.rotation.y = bicho.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    bichoEncima();
  },

  destruir() {
    tajadas = []; guias = []; cortes = new Set();
    zapallo = null; bicho = null; p0 = null;
    modo = null; cargado = false; pellizcando = false; terminado = false;
  },
};
