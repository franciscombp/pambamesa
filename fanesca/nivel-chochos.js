/* ============================================================
   FANESCA — nivel-chochos.js
   PELAR LOS CHOCHOS.

   Este es el nivel que más se parece a la idea que originó todo el
   minijuego: reventar. El chocho ya vino desamargado —eso son días
   de agua corriente, no un minijuego— y lo que queda es lo bueno:
   apretarlo entre los dedos hasta que la pepa salta fuera de su
   piel, que es un gesto que engancha por lo mismo que enganchan
   los juegos de reventar: sale entero, hace clic, y se ve el antes
   y el después.

     · tocar un chocho      → salta la pepa; la piel a la composta
     · arrastrar por encima → van saltando en fila
     · arrastrar desde el gorgojo → a la composta

   El truco del nivel es de vista, no de dedo: el gorgojo tiene el
   tamaño y el color del chocho. Barrer rápido es la forma más
   fácil de mandarlo a la batea sin haberlo visto.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';

let THREE, raiz, api;

const FILAS = 4;
const COLS = 6;
const TOTAL = FILAS * COLS;
const TABLA_Z = 0.3;
const PASO_X = 0.44, PASO_Z = 0.34;
const CON_GORGOJO = 2;
const RADIO_DEDO = 0.16;         /* el dedo tapa más que un píxel */

let chochosGrupo = null;
let chochos = [];                /* {obj, piel, pepa, ido} */
let plaga = null;
let hechos = 0;
let modo = null;
let pellizcando = false;
let terminado = false;

let matPiel, matPepa, matOjo;

function construirMateriales() {
  matPiel = new THREE.MeshLambertMaterial({ color: '#efe7cd', transparent: true, opacity: 0.5 });
  matPepa = new THREE.MeshLambertMaterial({ color: '#f5cf58' });
  matOjo = new THREE.MeshLambertMaterial({ color: '#c9b184' });
}

function nuevoChocho(x, z) {
  const g = new THREE.Group();
  g.position.set(x, api.MESA_Y + 0.16, z);
  g.rotation.y = Math.random() * Math.PI;
  g.userData = { tipo: 'chocho' };

  /* la pepa: amarilla, achatada, con su ombliguito */
  const pepa = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), matPepa);
  pepa.scale.set(0.1, 0.062, 0.088);
  const ombligo = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), matOjo);
  ombligo.position.set(0.086, 0.012, 0);
  ombligo.scale.set(0.5, 0.7, 1);
  ombligo.userData.ignorar = true;

  /* la piel: un pelín más grande y traslúcida, para que se vea que
     hay algo adentro esperando salir */
  const piel = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), matPiel);
  piel.scale.set(0.112, 0.072, 0.098);
  piel.userData.ignorar = true;

  g.add(pepa, ombligo, piel);
  g.add(api.sombraBlob(0.3, -0.15));
  return { obj: g, piel, pepa, ido: false, x, z };
}

function reventar(rec) {
  if (rec.ido) return false;
  rec.ido = true;
  rec.obj.userData.tipo = null;
  hechos++;

  const donde = rec.obj.position.clone();
  api.chispas(donde.clone().setY(api.MESA_Y + 0.3), '#fdf3c8', 6, 0.7);
  api.sfx(hechos % 2 ? 'pop' : 'pop2');
  api.buzz(9);

  /* la pepa salta a la batea y la piel se va a la composta:
     dos destinos distintos, que es justo lo que pasa al pelarlos */
  const pepa = rec.pepa;
  rec.obj.remove(pepa);
  pepa.position.copy(donde);
  raiz.add(pepa);
  pepa.userData.escalaBase = 1;
  api.volarA(pepa, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.42 + Math.random() * 0.12, alto: 0.62 });

  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.4 });
  api.composta(hechos / TOTAL);

  api.progreso(hechos, TOTAL);
  revisarFinal();
  return true;
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

/* el dedo es gordo: se resuelve por área, no por rayo */
function apretarEn(punto) {
  if (!punto) return;
  const bicho = plaga.cercaDe(punto, RADIO_DEDO);
  if (bicho) { plaga.aplastar(bicho); return; }
  for (const c of chochos) {
    if (c.ido) continue;
    if (Math.hypot(c.obj.position.x - punto.x, c.obj.position.z - punto.z) < RADIO_DEDO) reventar(c);
  }
}

export default {
  id: 'chochos',
  /* trabajo de detalle: la cámara se acerca para que el chocho se vea */
  /* acercada, pero no tanto: la composta y la batea TIENEN que caber
     en cuadro, porque llevar el bicho hasta allá es una regla del juego */
  camara: { pos: [0, 2.86, 3.55], mira: [0, 1.08, 0.4] },

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    construirMateriales();
    chochos = []; hechos = 0; terminado = false; modo = null; pellizcando = false;

    const tabla = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.1, 1.7),
      new THREE.MeshLambertMaterial({ color: '#ecc287' })
    );
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    chochosGrupo = new THREE.Group();
    raiz.add(chochosGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gorgojo', vel: 0.14,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c - (COLS - 1) / 2) * PASO_X + (f % 2 ? PASO_X * 0.22 : 0);
        const z = TABLA_Z + (f - (FILAS - 1) / 2) * PASO_Z;
        const rec = nuevoChocho(x, z);
        chochosGrupo.add(rec.obj);
        chochos.push(rec);
      }
    }

    /* los gorgojos salen a mitad de faena, cuando ya agarraste ritmo:
       es cuando de verdad duele tener que frenar y mirar */
    this._sueltos = 0;
    api.progreso(0, TOTAL);
  },

  objetivos() { return [chochosGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.aplastar(plaga.de(info.raiz)); return; }
    apretarEn(api.puntoEnPlano(api.MESA_Y + 0.16));
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    if (r && r.userData.tipo === 'bicho') {
      const rec = plaga.de(r);
      if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    }
    modo = 'apretar';
    apretarEn(api.puntoEnPlano(api.MESA_Y + 0.16));
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo === 'apretar') apretarEn(api.puntoEnPlano(api.MESA_Y + 0.16));
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
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
    revisarFinal();
  },

  actualizar(dt, t) {
    if (plaga && plaga.actualizar(dt, t)) return;

    /* que aparezcan cuando ya vas lanzado, no al principio */
    if (this._sueltos < CON_GORGOJO) {
      const umbral = this._sueltos === 0 ? TOTAL * 0.25 : TOTAL * 0.6;
      if (hechos >= umbral) {
        this._sueltos++;
        const vivos = chochos.filter(c => !c.ido);
        const donde = vivos.length ? vivos[Math.floor(Math.random() * vivos.length)].obj.position.clone()
                                   : new THREE.Vector3(0, api.MESA_Y, TABLA_Z);
        plaga.soltar('gorgojo', donde);
      }
    }

    /* los que quedan tiemblan un pelo: la mesa está viva */
    chochos.forEach((c, i) => {
      if (c.ido) return;
      c.obj.position.y = api.MESA_Y + 0.16 + Math.sin(t * 2 + i) * 0.004;
    });
  },

  destruir() {
    if (plaga) plaga.destruir();
    chochos = []; plaga = null; chochosGrupo = null;
    modo = null; pellizcando = false; terminado = false;
  },
};
