/* ============================================================
   FANESCA — nivel-bacalao.js
   DESALAR Y TENDER EL BACALAO.

   El único nivel donde una misma presa pide dos gestos distintos,
   y en orden: primero frotar hasta sacarle la sal, después
   cargarla al cordel. La presa cambia de comportamiento sola —
   mientras tenga sal, arrastrar sobre ella es frotar; cuando ya
   está limpia, arrastrar es levantarla.

   El bicho de este nivel no camina: vuela y se posa. Las moscas
   van a lo salado, así que aparecen justo donde estás trabajando.
   Aplastar una sobre el pescado arruina todo. Para sacarla se
   arrastra desde ella: se espanta y se va.
   ============================================================ */

import { nuevaMosca } from './modelos/bichos.js';
import { ARRUINADO } from './arruinado.js';
import { CARNE_LIMPIA } from './modelos/bacalao.js';

let THREE, raiz, api;

const PRESAS = 5;
const SAL_POR_PRESA = 7;
const TABLA_Z = 0.42;
const FROTE = 0.14;              /* mundo recorrido por cada grano de sal */
const CORDEL_Z = -0.62;          /* arrastra hacia el fondo para tender */
const CORDEL_Y = () => api.MESA_Y + 0.92;
const MOSCA_CADA = 7.5;          /* segundos entre moscas */
const MOSCA_DURA = 9;            /* cuánto se queda posada */
/* Recién posada, la mosca no mata: el dedo ya venía frotando ahí y
   perder por eso sería castigar un reflejo imposible. En ese respiro,
   rozarla la espanta — que es lo que pasaría de verdad. */
const MOSCA_GRACIA = 1.2;

let presasGrupo = null, moscasGrupo = null;
let presas = [];                 /* {obj, sal:[], limpia, tendida, x, z} */
let moscas = [];                 /* {obj, m, presa, t0, estado} */
let hechos = 0, TOTAL = PRESAS * (SAL_POR_PRESA + 1);
let modo = null, cargada = null, frotando = null, ultimoPunto = null;
let tMosca = 4, huecosCordel = [];
let terminado = false, avisoLimpia = false;

/* La presa con sus vetas y su piel, los cristales de sal y el
   cordel viven en modelos/bacalao.js. La carne se busca POR NOMBRE
   porque es la única pieza del juego que cambia de material en
   vivo: al quedar sin sal, pasa de salada a limpia. */

function nuevaPresa(x, z) {
  const g = api.pieza('presa-bacalao');
  g.position.set(x, api.MESA_Y + 0.14, z);
  g.rotation.y = (Math.random() - 0.5) * 0.5;
  g.userData = { tipo: 'presa' };
  g.add(api.sombraBlob(0.62, -0.13));

  /* los cristales de sal, que son el trabajo del nivel */
  const sal = [];
  for (let i = 0; i < SAL_POR_PRESA; i++) {
    const s = api.pieza('grano-sal');
    const a = Math.random() * Math.PI * 2, d = Math.random();
    s.position.set(Math.cos(a) * d * 0.23, 0.068, Math.sin(a) * d * 0.15);
    s.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(s);
    sal.push(s);
  }

  return { obj: g, carne: api.parte(g, 'carne'), sal, limpia: false, tendida: false, x, z };
}

function quitarSal(rec) {
  const s = rec.sal.pop();
  if (!s) return;
  api.chispas(rec.obj.position.clone().setY(api.MESA_Y + 0.24), '#ffffff', 4, 0.5);
  rec.obj.remove(s);
  hechos++;
  api.progreso(hechos, TOTAL);
  api.sfx('frotar'); api.buzz(5);
  if (!rec.sal.length) {
    rec.limpia = true;
    rec.carne.material.color.set(CARNE_LIMPIA);
    api.sfx('pop2'); api.buzz([10, 20]);
    if (!avisoLimpia) {
      avisoLimpia = true;
      api.pista('Ya está sin sal: ahora <b>arrástrala hacia arriba</b>, hasta el cordel.', 4200);
    }
  }
}

function tender(rec) {
  rec.tendida = true;
  rec.obj.userData.tipo = null;
  hechos++;
  api.progreso(hechos, TOTAL);
  const hueco = huecosCordel.shift();
  const destino = new THREE.Vector3(hueco, CORDEL_Y() - 0.14, CORDEL_Z);
  api.tween(rec.obj, 'position', destino, 0.3);
  rec.obj.rotation.set(-Math.PI / 2.1, 0, (Math.random() - 0.5) * 0.2);
  rec.obj.userData.colgada = { x: hueco, fase: Math.random() * 6 };

  /* la pinza de ropa */
  const pinza = api.pieza('pinza');
  pinza.position.set(0, 0, 0.16);
  rec.obj.add(pinza);

  api.sfx('bien'); api.buzz([15, 25]);
  api.chispas(destino.clone(), '#fff3c9', 8, 0.8);
  revisarFinal();
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  terminado = true;
  api.completar();
}

/* ---------- las moscas ---------- */

function soltarMosca() {
  const candidatas = presas.filter(p => !p.tendida && p.sal.length
    && p !== (frotando || null)                    /* nunca donde está el dedo */
    && !moscas.some(m => m.presa === p && m.estado === 'posada'));
  if (!candidatas.length) return;
  const presa = candidatas[Math.floor(Math.random() * candidatas.length)];
  const m = nuevaMosca(THREE, { escala: 1.1 });
  const nodo = new THREE.Group();
  nodo.userData = { tipo: 'mosca' };
  nodo.add(m.obj);
  nodo.position.copy(presa.obj.position).setY(api.MESA_Y + 0.24);
  nodo.position.x += (Math.random() - 0.5) * 0.2;
  moscasGrupo.add(nodo);
  moscas.push({ obj: nodo, m, presa, t0: api.reloj, estado: 'posada' });
  api.sfx('resist'); api.buzz([12, 12, 12]);
  api.aviso('🪰 ¡Una mosca en el bacalao! Pellízcala o arrastra desde ella para espantarla');
}

function espantar(rec) {
  rec.estado = 'ida';
  rec.obj.userData.tipo = null;
  api.sfx('tab'); api.buzz(10);
  api.chispas(rec.obj.position.clone(), '#cfd8dc', 6, 0.6);
  const lejos = rec.obj.position.clone().add(new THREE.Vector3((Math.random() - .5) * 3, 2.2, -2.2));
  api.volarA(rec.obj, lejos, { dur: 0.55, alto: 0.4 });
  if (!moscas.some(m => m.estado === 'posada')) api.aviso(null);
  api.toast('¡Zape! 🪰');
}

const moscaEn = (presa) => moscas.find(m => m.estado === 'posada' && m.presa === presa);

export default {
  id: 'bacalao',

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    presas = []; moscas = []; hechos = 0; terminado = false;
    modo = null; cargada = null; frotando = null; ultimoPunto = null;
    tMosca = 4.5; avisoLimpia = false;
    huecosCordel = [-1.0, -0.5, 0, 0.5, 1.0];

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: 1.4 });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    /* el cordel donde se tiende, al fondo: arrastrar "hacia arriba"
       en la pantalla es ir hacia allá en el mundo */
    const cuerda = api.pieza('cordel', { largo: 2.9 });
    cuerda.position.set(0, CORDEL_Y(), CORDEL_Z);
    raiz.add(cuerda);
    [-1.45, 1.45].forEach(x => {
      const poste = api.pieza('poste');
      poste.position.set(x, api.MESA_Y + 0.52, CORDEL_Z);
      raiz.add(poste);
    });

    presasGrupo = new THREE.Group();
    moscasGrupo = new THREE.Group();
    raiz.add(presasGrupo, moscasGrupo);

    const xs = [-1.05, -0.52, 0, 0.52, 1.05];
    xs.forEach((x, i) => {
      const rec = nuevaPresa(x, TABLA_Z + (i % 2 ? 0.24 : -0.2));
      presasGrupo.add(rec.obj);
      presas.push(rec);
    });

    api.progreso(0, TOTAL);
  },

  objetivos() { return [presasGrupo, moscasGrupo]; },

  alTocar(info) {
    if (terminado || !info.raiz) return;
    if (info.raiz.userData.tipo === 'mosca') {
      const rec = moscas.find(m => m.obj === info.raiz && m.estado === 'posada');
      if (rec && api.reloj - rec.t0 < MOSCA_GRACIA) { espantar(rec); return; }
      api.arruinar(ARRUINADO.aplastado('mosca'));
      return;
    }
    if (info.raiz.userData.tipo === 'presa') {
      const rec = presas.find(p => p.obj === info.raiz);
      if (!rec || rec.tendida) return;
      api.sfx('resist');
      api.pista(rec.limpia
        ? 'Está lista: <b>arrástrala hacia el cordel</b> del fondo.'
        : '<b>Frota</b> pasando el dedo de un lado a otro hasta sacarle la sal.', 3200);
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    ultimoPunto = api.puntoEnPlano(api.MESA_Y + 0.2);
    if (r && r.userData.tipo === 'mosca') {
      const rec = moscas.find(m => m.obj === r && m.estado === 'posada');
      if (rec) espantar(rec);
      modo = null;
      return;
    }
    if (r && r.userData.tipo === 'presa') {
      const rec = presas.find(p => p.obj === r);
      if (!rec || rec.tendida) { modo = null; return; }
      if (rec.limpia) {
        modo = 'cargar'; cargada = rec;
        api.sfx('tab'); api.buzz(10);
      } else {
        modo = 'frotar'; frotando = rec;
      }
      return;
    }
    modo = 'frotar'; frotando = null;
  },

  alArrastrar(info) {
    if (terminado) return;

    if (modo === 'cargar' && cargada) {
      const p = api.puntoEnPlano(api.MESA_Y);
      if (!p) return;
      cargada.suelo = { x: p.x, z: p.z };
      /* al ir hacia el fondo la presa se levanta sola hacia el cordel */
      const subida = Math.max(0, -(p.z - 0.05)) * 1.05;
      cargada.obj.position.set(p.x, api.MESA_Y + 0.24 + subida, p.z);
      cargada.obj.rotation.x = -Math.min(1.35, subida * 1.6);
      return;
    }

    if (modo === 'frotar') {
      const p = api.puntoEnPlano(api.MESA_Y + 0.2);
      if (!p) return;
      const prev = ultimoPunto;
      ultimoPunto = p;
      if (!prev) return;
      const paso = Math.hypot(p.x - prev.x, p.z - prev.z);
      /* ¿sobre qué presa está el dedo ahora? */
      const rec = presas.find(x => !x.tendida && Math.abs(x.obj.position.x - p.x) < 0.32 && Math.abs(x.obj.position.z - p.z) < 0.23);
      if (!rec) return;
      const mosca = moscaEn(rec);
      if (mosca) {
        if (api.reloj - mosca.t0 < MOSCA_GRACIA) { espantar(mosca); api.pista('La espantaste a tiempo. <b>No las toques</b>: arrastra desde ellas.', 2800); }
        else api.arruinar(ARRUINADO.aplastado('mosca'));
        return;
      }
      if (!rec.sal.length) return;
      rec.frote = (rec.frote || 0) + paso;
      rec.obj.rotation.z = Math.sin(api.reloj * 22) * 0.04;
      while (rec.frote >= FROTE && rec.sal.length) { rec.frote -= FROTE; quitarSal(rec); }
    }
  },

  /* pellizcar con dos dedos: espanta la mosca más cercana en pantalla.
     Igual que el arrastre-desde-ella, nunca aplasta — el pellizco es
     la forma sin riesgo de sacarla de encima. */
  alPellizcarInicio(info) {
    if (terminado) return;
    let mejor = null, mejorD = 70;
    const mundo = new THREE.Vector3();
    for (const rec of moscas) {
      if (rec.estado !== 'posada') continue;
      rec.obj.getWorldPosition(mundo);
      const p = api.proyectar(mundo);
      const d = Math.hypot(p.x - info.cliente.x, p.y - info.cliente.y);
      if (d < mejorD) { mejorD = d; mejor = rec; }
    }
    if (mejor) espantar(mejor);
  },
  alPellizcarMover() {},
  alPellizcarFin() {},

  alArrastrarFin() {
    if (terminado) { modo = null; return; }
    if (modo === 'cargar' && cargada) {
      const rec = cargada; cargada = null; modo = null;
      const p = rec.suelo || rec.obj.position;
      if (p.z < -0.3) tender(rec);
      else {
        api.tween(rec.obj, 'position', new THREE.Vector3(rec.x, api.MESA_Y + 0.14, rec.z), 0.24);
        rec.obj.rotation.x = 0;
        api.sfx('resist');
        api.pista('Más arriba: hasta el <b>cordel</b> del fondo.', 2600);
      }
      return;
    }
    if (frotando) frotando.obj.rotation.z = 0;
    modo = null; frotando = null; ultimoPunto = null;
  },

  actualizar(dt, t) {
    /* las moscas: llegan, se quedan un rato y se van solas */
    tMosca -= dt;
    if (tMosca <= 0) { tMosca = MOSCA_CADA; soltarMosca(); }
    moscas.forEach(rec => {
      if (rec.estado !== 'posada') return;
      rec.m.animar(t);
      rec.obj.position.y = api.MESA_Y + 0.24 + Math.abs(Math.sin(t * 3.2)) * 0.012;
      if (t - rec.t0 > MOSCA_DURA) {
        rec.estado = 'ida';
        rec.obj.userData.tipo = null;
        api.volarA(rec.obj, rec.obj.position.clone().add(new THREE.Vector3(1.2, 1.8, -1.6)), { dur: 0.7, alto: 0.3 });
        if (!moscas.some(m => m.estado === 'posada')) api.aviso(null);
      }
    });

    /* lo tendido se mece en el cordel */
    presas.forEach(rec => {
      const c = rec.obj.userData.colgada;
      if (!c) return;
      rec.obj.rotation.z = Math.sin(t * 1.6 + c.fase) * 0.09;
    });
  },

  destruir() {
    presas = []; moscas = [];
    presasGrupo = moscasGrupo = null;
    cargada = null; frotando = null; modo = null; terminado = false;
  },
};
