/* ============================================================
   PAMBAMESA — escena3d.js
   El mesón en 3D (Three.js, cámara fija estilo diorama).

   TRES NIVELES, de atrás hacia adelante:
     1. LA ESTACIÓN — la superficie de trabajo, intercambiable:
        tabla y cuchillo, olla, sartén, pilón o molino. Se cambia
        con las fichas de arriba o deslizándola de lado. Tiene
        dos puestos: lo que pongas ahí es lo que estás cocinando.
     2. LA REPISA — lo que ya preparaste, esperando su turno.
     3. LA CANASTA — solo los ingredientes que trajiste de la
        despensa. Chica a propósito: la despensa guarda todo.

   Los utensilios NO son cartas ni ocupan sitio: son la estación.

   MODELOS: cada id intenta models/<id>.glb (p. ej. de Meshy). Si
   no existe, se arma un modelo lowpoly con primitivas a partir de
   las tablas FORMAS/PREPS — nada de estampas planas.

   app.js habla con esta capa por window.Escena3D:
     init(container)   bind(cbs)   sync({...})
     combinar(cb)      mezclaRara()   setActive(bool)
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ---------- geografía de la escena ---------- */
const COUNTER_Y = 1.0;                    /* cara del mesón */
const EST_Z = -0.45;                      /* nivel 1: la estación */
const REPISA_Z = 1.15;                    /* nivel 2: la repisa */
const CANASTA_Z = 2.55;                   /* nivel 3: la canasta */
const REPISA_Y = 0.62;
const CANASTA_Y = 0.16;
const SLOT_X = [-0.5, 0.5];
const ITEM_SIZE = 0.62;
/* los sitios por fila se adaptan: en un móvil vertical caben 4 y el
   mundo se estrecha, así la cámara no tiene que alejarse tanto (que
   era lo que dejaba media pantalla de piso vacío) */
let FILA_X = [-1.55, -0.775, 0, 0.775, 1.55];
let PER_PAGE = 5;
const FILA_ANCHA = [-1.55, -0.775, 0, 0.775, 1.55];
const FILA_ANGOSTA = [-1.2, -0.4, 0.4, 1.2];
const TACHO = { x: 1.95, y: 0.5, z: 1.95, r: 0.6 };
const DRAG_Y = 1.75;

let renderer, scene, camera, clock, raf = null, active = false;
let cbs = {};
let tweens = [], particles = [], steamPuffs = [], vaporSprites = [];
let slotRoots = [null, null], slotMarkers = [];
let repisaRoots = [], canastaRoots = [];
let estacionGroup = null, estacionActual = null, estacionMesh = null;
let tachoGroup = null;
let mess = null;
let animCocina = null;          /* { t0, dur, items } mientras se cocina */
let datos = { canasta: [], repisa: [], slots: [null, null], estacion: null };
let pagCanasta = 0, pagRepisa = 0;
let ui = {};
const modelCache = {};
const gltfLoader = new GLTFLoader();

/* ---------- utilidades ---------- */

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function tween(obj, prop, to, dur, ease = easeOut, onDone = null) {
  tweens.push({ obj, prop, from: obj[prop].clone ? obj[prop].clone() : obj[prop], to, t0: clock.elapsedTime, dur, ease, onDone });
}
function stepTweens() {
  const now = clock.elapsedTime, done = [];
  tweens = tweens.filter(tw => {
    const t = Math.min(1, (now - tw.t0) / tw.dur), k = tw.ease(t);
    const v = tw.obj[tw.prop];
    if (v && v.lerpVectors) v.lerpVectors(tw.from, tw.to, k);
    else tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * k;
    if (t >= 1) { done.push(tw); return false; }
    return true;
  });
  /* los onDone corren después de reasignar `tweens`: uno que encadena
     otro dentro de su onDone debe caer en el array nuevo */
  done.forEach(tw => { if (tw.onDone) tw.onDone(); });
}

function canvasTexture(draw, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

/* la paleta se lee de los tokens del sistema de diseño: cambiar el
   CSS repinta la cocina, nunca se desincronizan */
let _rootStyle = null;
function token(name, fallback) {
  if (!_rootStyle) _rootStyle = getComputedStyle(document.documentElement);
  return (_rootStyle.getPropertyValue(name) || '').trim() || fallback;
}
const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
const matT = (name, fb, opts = {}) => mat(token(name, fb), opts);

/* ============================================================
   MODELOS LOWPOLY — ingredientes
   ============================================================ */

/* Cada ingrediente dice de qué forma es; el motor arma la malla con
   primitivas. Nada de estampas planas paradas sobre la mesa. */
const FORMAS = {
  verde:   { tipo: 'platano', color: '#8cb761', curva: .55 },
  maduro:  { tipo: 'platano', color: '#f0b83c', curva: .6 },
  queso:   { tipo: 'cuna',    color: '#fdf6e0' },
  huevo:   { tipo: 'huevo',   color: '#fdf8f0' },
  cerdo:   { tipo: 'lonja',   color: '#e79a92', veta: '#f6d3cf' },
  cebolla: { tipo: 'bulbo',   color: '#c58fd0' },
  tomate:  { tipo: 'esfera',  color: '#e2554a', tallo: true },
  limon:   { tipo: 'esfera',  color: '#d8e05a', r: .26 },
  pescado: { tipo: 'pez',     color: '#93a7c4' },
  camaron: { tipo: 'camaron', color: '#f2977e' },
  yuca:    { tipo: 'raiz',    color: '#a9865f' },
  mani:    { tipo: 'monton',  color: '#dcb173', n: 7, r: .12 },
  arroz:   { tipo: 'monton',  color: '#f6f1e4', n: 11, r: .09 },
  papa:    { tipo: 'papa',    color: '#e3cf9f' },
  maiz:    { tipo: 'mazorca', color: '#f2d06b' },
  hoja:    { tipo: 'hoja',    color: '#a8c98a' },
  leche:   { tipo: 'jarra',   color: '#fdfbf4' },
  mote:    { tipo: 'monton',  color: '#f2e9d2', n: 9, r: .13 },
  chochos: { tipo: 'monton',  color: '#f7f2e0', n: 9, r: .11 },
  tostado: { tipo: 'monton',  color: '#e0b45c', n: 10, r: .1 },
  tilapia:    { tipo: 'pez',     color: '#8fa9a2' },
  palmito:    { tipo: 'raiz',    color: '#f6f2e2' },
  bijao:      { tipo: 'hoja',    color: '#5f9c52' },
  guayusa:    { tipo: 'mata',    color: '#6ba84f' },
  chontaduro: { tipo: 'esfera',  color: '#e2732f', r: .27 },
};

/* Las preparaciones y platillos: casi siempre "algo servido". */
const PREPS = {
  verde_pelado:   { forma: 'trozos', color: '#e8e0c0' },
  verde_cocido:   { forma: 'cuenco', color: '#b9c78a', vapor: true },
  verde_frito:    { forma: 'rodajas', color: '#e0b45c' },
  masa_verde:     { forma: 'masa',   color: '#a8b877' },
  patacon_crudo:  { forma: 'disco',  color: '#c8d69a' },
  bolon_crudo:    { forma: 'bola',   color: '#a8b877' },
  chicharron:     { forma: 'trozos', color: '#c97a4a' },
  masa_mixta:     { forma: 'masa',   color: '#a08a5e' },
  bolon_mixto_crudo: { forma: 'bola', color: '#a08a5e' },
  tigrillo_base:  { forma: 'cuenco', color: '#e9c877' },
  mani_molido:    { forma: 'cuenco', color: '#d9b47c' },
  masa_corviche:  { forma: 'masa',   color: '#b7a878' },
  pescado_limpio: { forma: 'trozos', color: '#dfe6ee' },
  corviche_crudo: { forma: 'bola',   color: '#a8b877' },
  caldo_pescado:  { forma: 'cuenco', color: '#e8c9a0', vapor: true },
  yuca_pelada:    { forma: 'trozos', color: '#f6f0e4' },
  yuca_cocida:    { forma: 'cuenco', color: '#efe6d2', vapor: true },
  yuca_frita:     { forma: 'rodajas', color: '#e8c078' },
  base_encebollado: { forma: 'cuenco', color: '#dfb98a', vapor: true },
  cebolla_picada: { forma: 'cuenco', color: '#f0e6f2' },
  jugo_limon:     { forma: 'cuenco', color: '#eef2b8' },
  curtido:        { forma: 'cuenco', color: '#f2d9e0' },
  tomate_picado:  { forma: 'cuenco', color: '#e2554a' },
  sofrito:        { forma: 'cuenco', color: '#e08a5c' },
  refrito:        { forma: 'cuenco', color: '#d4783f', vapor: true },
  camaron_cocido: { forma: 'cuenco', color: '#f5a58c', vapor: true },
  ceviche_base:   { forma: 'cuenco', color: '#f7c9b0' },
  arroz_cocido:   { forma: 'cuenco', color: '#fbf6ea', vapor: true },
  maduro_pelado:  { forma: 'trozos', color: '#f6cf72' },
  maduro_frito:   { forma: 'rodajas', color: '#e0a03c' },
  huevo_frito:    { forma: 'disco',  color: '#fdf8f0', yema: true },
  papa_cocida:    { forma: 'trozos', color: '#e3cf9f' },
  masa_llapingacho: { forma: 'masa', color: '#e8d6a8' },
  llapingacho_relleno: { forma: 'disco', color: '#e8d6a8' },
  base_locro:     { forma: 'cuenco', color: '#f2dc9b', vapor: true },
  maiz_preparado: { forma: 'cuenco', color: '#f2d06b' },
  mezcla_humita:  { forma: 'cuenco', color: '#f2dc9b' },
  humita_envuelta:{ forma: 'tamal',  color: '#a8c98a' },
  mote_con_huevo: { forma: 'cuenco', color: '#f5e3b8' },
  chochos_cebolla:{ forma: 'cuenco', color: '#e9e2c8' },
  tostado_dorado: { forma: 'cuenco', color: '#d59a3c' },
  tilapia_limpia:    { forma: 'trozos', color: '#dfe6ee' },
  maito_envuelto:    { forma: 'tamal',  color: '#5f9c52' },
  palmito_picado:    { forma: 'cuenco', color: '#f6f2e2' },
  mezcla_ayampaco:   { forma: 'cuenco', color: '#eeeacc' },
  ayampaco_envuelto: { forma: 'tamal',  color: '#6ba85c' },
  masa_yuca:         { forma: 'masa',   color: '#f2ece0' },
  chontaduro_cocido: { forma: 'cuenco', color: '#e08a4a', vapor: true },
  maito:             { forma: 'tamal',  color: '#4f8a45', vapor: true },
  ayampaco:          { forma: 'tamal',  color: '#5f9c52', vapor: true },
  chicha_yuca:       { forma: 'jarron', color: '#f2ece0' },
  guayusa_hervida:   { forma: 'jarron', color: '#7c6a3c', vapor: true },
  chontaduro_asado:  { forma: 'bola',   color: '#d9682a', vapor: true },
  bolon:          { forma: 'bola',   color: '#c2a86a', vapor: true },
  bolon_mixto:    { forma: 'bola',   color: '#b08d55', vapor: true },
  tigrillo:       { forma: 'cuenco', color: '#e9c877', vapor: true },
  patacon:        { forma: 'disco',  color: '#dfa856' },
  corviche:       { forma: 'bola',   color: '#c2a86a', vapor: true },
  encebollado:    { forma: 'cuenco', color: '#e8b98a', vapor: true },
  ceviche:        { forma: 'cuenco', color: '#f7b9a0' },
  arroz_marinero: { forma: 'cuenco', color: '#f6efdd', vapor: true },
  maduro_con_queso: { forma: 'rodajas', color: '#e0a03c', queso: true },
  llapingacho:    { forma: 'disco',  color: '#e0b45c' },
  locro:          { forma: 'cuenco', color: '#f5d97e', vapor: true },
  papas_con_queso:{ forma: 'trozos', color: '#e3cf9f', queso: true },
  humita:         { forma: 'tamal',  color: '#c8b98a', vapor: true },
  mote_pillo:     { forma: 'cuenco', color: '#f7e6bc', vapor: true },
  ceviche_chochos:{ forma: 'cuenco', color: '#eee7cf' },
  mezcla_rara:    { forma: 'engrudo', color: '#8a8f79' },
};

/* --- generadores de forma --- */
function formaPlatano(f) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.32, 0, 0), new THREE.Vector3(-.1, f.curva * .3, 0),
    new THREE.Vector3(.16, f.curva * .28, 0), new THREE.Vector3(.34, 0, 0),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, .13, 7, false), mat(f.color)));
  const punta = new THREE.Mesh(new THREE.ConeGeometry(.1, .12, 6), mat('#6f5a34'));
  punta.position.set(-.36, 0, 0); punta.rotation.z = Math.PI / 2;
  g.add(punta);
  return g;
}
function formaEsfera(f) {
  const g = new THREE.Group();
  const r = f.r || .3;
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(f.color)));
  if (f.tallo) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(.08, .11, 5), mat('#6cae4f'));
    t.position.y = r * .95;
    g.add(t);
  }
  return g;
}
function formaHuevo(f) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(.23, 12, 9), mat(f.color));
  m.scale.set(1, 1.32, 1);
  return m;
}
function formaCuna(f) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .28, 12, 1, false, 0, Math.PI / 1.8), mat(f.color));
  m.rotation.y = -Math.PI / 3;
  return m;
}
function formaLonja(f) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(.58, .15, .4), mat(f.color)));
  const veta = new THREE.Mesh(new THREE.BoxGeometry(.58, .05, .4), mat(f.veta || '#f6d3cf'));
  veta.position.y = .085;
  g.add(veta);
  return g;
}
function formaBulbo(f) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(.27, 10, 8), mat(f.color));
  b.scale.set(1, 1.1, 1);
  const t = new THREE.Mesh(new THREE.ConeGeometry(.06, .24, 5), mat('#8f9c6a'));
  t.position.y = .3;
  g.add(b, t);
  return g;
}
function formaPez(f) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(.27, 10, 8), mat(f.color));
  cuerpo.scale.set(1.5, .8, .55);
  const cola = new THREE.Mesh(new THREE.ConeGeometry(.18, .24, 4), mat(f.color));
  cola.position.x = -.46; cola.rotation.z = Math.PI / 2; cola.scale.z = .4;
  g.add(cuerpo, cola);
  return g;
}
function formaCamaron(f) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.24, -.08, 0), new THREE.Vector3(.18, .15, 0),
    new THREE.Vector3(-.05, .2, 0), new THREE.Vector3(-.2, .02, 0),
  ]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .1, 6, false), mat(f.color));
}
function formaRaiz(f) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.14, .1, .62, 7), mat(f.color));
  m.rotation.z = Math.PI / 2.3;
  return m;
}
function formaPapa(f) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.27, 1), mat(f.color));
  m.scale.set(1.25, .88, .95);
  return m;
}
function formaMazorca(f) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.16, .13, .62, 9), mat(f.color));
  m.rotation.z = Math.PI / 2.2;
  const hoja = new THREE.Mesh(new THREE.ConeGeometry(.13, .32, 4), mat('#a8c98a'));
  hoja.position.set(-.28, -.1, 0); hoja.rotation.z = Math.PI / 1.7;
  g.add(m, hoja);
  return g;
}
function formaHoja(f) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(.32, 8, 6), mat(f.color));
  m.scale.set(1.1, .12, .5); m.rotation.z = .2;
  return m;
}
function formaJarra(f) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(.22, .25, .46, 12), mat(f.color)));
  const asa = new THREE.Mesh(new THREE.TorusGeometry(.1, .032, 6, 10, Math.PI), mat(f.color));
  asa.position.set(.25, .03, 0); asa.rotation.z = -Math.PI / 2;
  g.add(asa);
  return g;
}
function formaMonton(f) {
  const g = new THREE.Group();
  const m = mat(f.color);
  const n = f.n || 8;
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(f.r || .12, 7, 5), m);
    const a = (i / n) * Math.PI * 2;
    const rad = i === 0 ? 0 : .16;
    s.position.set(Math.cos(a) * rad, (i % 3) * .07, Math.sin(a) * rad * .7);
    s.scale.y = .8;
    g.add(s);
  }
  return g;
}
function formaMata(f) {
  const g = new THREE.Group();
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, .5, 6), mat('#4f7c3a'));
  tallo.position.y = .25;
  g.add(tallo);
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(.17, 7, 5), mat(f.color));
    h.scale.set(1.5, .16, .7);
    const a = (i / 5) * Math.PI * 2;
    h.position.set(Math.cos(a) * .17, .22 + (i % 2) * .16, Math.sin(a) * .13);
    h.rotation.y = a; h.rotation.z = .25;
    g.add(h);
  }
  return g;
}
const GEN = { platano: formaPlatano, mata: formaMata, esfera: formaEsfera, huevo: formaHuevo, cuna: formaCuna,
  lonja: formaLonja, bulbo: formaBulbo, pez: formaPez, camaron: formaCamaron, raiz: formaRaiz,
  papa: formaPapa, mazorca: formaMazorca, hoja: formaHoja, jarra: formaJarra, monton: formaMonton };

/* --- preparaciones: casi todo se sirve en loza --- */
function cuencoDe(color, vapor) {
  const g = new THREE.Group();
  const loza = matT('--peltre-100', '#ffffff');
  const cuenco = new THREE.Mesh(new THREE.SphereGeometry(.34, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), loza);
  cuenco.scale.y = .78; cuenco.position.y = .26;
  const borde = new THREE.Mesh(new THREE.TorusGeometry(.335, .026, 6, 16), loza);
  borde.rotation.x = Math.PI / 2; borde.position.y = .26;
  const relleno = new THREE.Mesh(new THREE.CylinderGeometry(.31, .28, .07, 14), mat(color));
  relleno.position.y = .25;
  g.add(cuenco, borde, relleno);
  if (vapor) g.userData.vapor = true;
  return g;
}
function preparacionMesh(id) {
  const p = PREPS[id] || { forma: 'cuenco', color: '#d9cdb0' };
  const c = p.color;
  if (p.forma === 'cuenco') return cuencoDe(c, p.vapor);
  const g = new THREE.Group();
  switch (p.forma) {
    case 'masa': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 7), mat(c));
      m.scale.set(1.2, .62, 1); m.position.y = .19; g.add(m); break;
    }
    case 'bola': {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.29, 1), mat(c));
      m.position.y = .28; g.add(m); if (p.vapor) g.userData.vapor = true; break;
    }
    case 'disco': {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.34, .32, .12, 14), mat(c));
      m.position.y = .07; g.add(m);
      if (p.yema) { const y = new THREE.Mesh(new THREE.SphereGeometry(.12, 9, 7), mat('#f2b84e')); y.scale.y = .5; y.position.y = .14; g.add(y); }
      break;
    }
    case 'rodajas': {
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(.19, .18, .1, 10), mat(c));
        m.position.set((i - 1) * .19, .06 + i * .02, (i % 2) * .12 - .06);
        m.rotation.z = (i - 1) * .12;
        g.add(m);
      }
      if (p.queso) { const q = new THREE.Mesh(new THREE.BoxGeometry(.32, .07, .19), mat('#fdf6e0')); q.position.y = .17; g.add(q); }
      break;
    }
    case 'trozos': {
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(.18, .14, .14), mat(c));
        const a = (i / 4) * Math.PI * 2;
        m.position.set(Math.cos(a) * .14, .08 + (i % 2) * .11, Math.sin(a) * .11);
        m.rotation.set(a, a * .5, .2);
        g.add(m);
      }
      if (p.queso) { const q = new THREE.Mesh(new THREE.BoxGeometry(.28, .06, .17), mat('#fdf6e0')); q.position.y = .25; g.add(q); }
      break;
    }
    case 'tamal': {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .46, 8), mat(c));
      m.rotation.z = Math.PI / 2; m.position.y = .18; g.add(m);
      [-1, 1].forEach(s => {
        const p2 = new THREE.Mesh(new THREE.ConeGeometry(.16, .19, 5), mat(c));
        p2.position.set(.28 * s, .18, 0); p2.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
        g.add(p2);
      });
      if (p.vapor) g.userData.vapor = true;
      break;
    }
    case 'jarron': {
      const loza = matT('--peltre-100', '#ffffff');
      const j = new THREE.Mesh(new THREE.CylinderGeometry(.22, .26, .5, 14), loza);
      j.position.y = .25;
      const bebida = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .05, 14), mat(c));
      bebida.position.y = .48;
      const asa = new THREE.Mesh(new THREE.TorusGeometry(.1, .03, 6, 10, Math.PI), loza);
      asa.position.set(.26, .28, 0); asa.rotation.z = -Math.PI / 2;
      g.add(j, bebida, asa);
      if (p.vapor) g.userData.vapor = true;
      break;
    }
    case 'engrudo': {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 1), mat(c));
      m.scale.set(1.15, .78, 1.05); m.position.y = .23; g.add(m);
      const gota = new THREE.Mesh(new THREE.SphereGeometry(.11, 7, 5), mat(c));
      gota.position.set(.28, .09, .12); g.add(gota);
      break;
    }
  }
  return g;
}

function construirItem(id) {
  if (FORMAS[id]) {
    const f = FORMAS[id];
    const g = (GEN[f.tipo] || formaEsfera)(f);
    const wrap = new THREE.Group();
    wrap.add(g);
    const box = new THREE.Box3().setFromObject(g);
    g.position.y -= box.min.y;      /* apoyado sobre la superficie */
    return wrap;
  }
  return preparacionMesh(id);
}

function normalizarGLB(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.setScalar(ITEM_SIZE / Math.max(size.x, size.y, size.z, 1e-4));
  box.setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box.min.y;
  const g = new THREE.Group(); g.add(root); return g;
}
function cargarItem(id, cb) {
  if (modelCache[id]) { cb(modelCache[id].clone(true)); return; }
  gltfLoader.load(`models/${id}.glb`,
    (gltf) => { const p = normalizarGLB(gltf.scene); modelCache[id] = p; cb(p.clone(true)); },
    undefined,
    () => { const p = construirItem(id); modelCache[id] = p; cb(p.clone(true)); });
}

/* ============================================================
   ESTACIONES — las herramientas, en lowpoly de verdad
   ============================================================ */

function construirEstacion(id) {
  const g = new THREE.Group();
  const metal = matT('--metal-400', '#9aa3ae');
  const metalOsc = matT('--metal-600', '#6c7683');
  const maderaM = matT('--madera-400', '#b4632c');
  const maderaClara = matT('--madera-200', '#e8a469');
  const negro = matT('--pizarra-700', '#1d1822');
  const loza = matT('--peltre-100', '#ffffff');

  if (id === 'cuchillo') {
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(2.4, .12, 1.4), maderaClara);
    const canto = new THREE.Mesh(new THREE.BoxGeometry(2.46, .07, 1.46), maderaM);
    canto.position.y = -.05;
    const mango = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .12, 16), maderaClara);
    mango.position.set(1.36, 0, 0);
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(.86, .035, .16), metal);
    hoja.position.set(-.32, .09, .5);
    const punta = new THREE.Mesh(new THREE.ConeGeometry(.08, .28, 4), metal);
    punta.position.set(.25, .09, .5); punta.rotation.z = -Math.PI / 2; punta.scale.z = .45;
    const cabo = new THREE.Mesh(new THREE.BoxGeometry(.4, .09, .11), maderaM);
    cabo.position.set(-.93, .1, .5);
    /* el cuchillo va en su propio grupo: así puede picar solo */
    const filo = new THREE.Group();
    filo.add(hoja, punta, cabo);
    filo.position.set(0, 0, 0);
    g.add(tabla, canto, mango, filo);
    g.userData.alto = .06;
    g.userData.anim = { tipo: 'picar', filo };
  } else if (id === 'olla') {
    const hornilla = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .1, 20), negro);
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(.86, .78, .7, 22), matT('--chile-500', '#ce2029'));
    cuerpo.position.y = .4;
    const interior = new THREE.Mesh(new THREE.CylinderGeometry(.78, .72, .06, 20), matT('--peltre-300', '#e3dfd6'));
    interior.position.y = .7;
    const borde = new THREE.Mesh(new THREE.TorusGeometry(.85, .05, 8, 24), loza);
    borde.rotation.x = Math.PI / 2; borde.position.y = .74;
    g.add(hornilla, cuerpo, interior, borde);
    [-1, 1].forEach(s => {
      const asa = new THREE.Mesh(new THREE.TorusGeometry(.15, .045, 7, 12, Math.PI), loza);
      asa.position.set(.9 * s, .58, 0);
      asa.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.add(asa);
    });
    g.userData.alto = .73;
    g.userData.fuego = true;
    g.userData.anim = { tipo: 'hervir', cuerpo, borde };
  } else if (id === 'sarten') {
    const hornilla = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .1, 20), negro);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.96, .8, .26, 22), metalOsc);
    base.position.y = .2;
    const interior = new THREE.Mesh(new THREE.CylinderGeometry(.88, .8, .05, 20), negro);
    interior.position.y = .32;
    const mango = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 1.1, 8), maderaM);
    mango.rotation.z = Math.PI / 2.6; mango.position.set(1.5, .42, 0);
    /* la sartén entera se inclina para saltear */
    const cazo = new THREE.Group();
    cazo.add(base, interior, mango);
    g.add(hornilla, cazo);
    g.userData.alto = .34;
    g.userData.fuego = true;
    g.userData.anim = { tipo: 'saltear', cazo };
  } else if (id === 'pilon') {
    const piedra = matT('--pizarra-500', '#2f2733');
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(.5, .66, .16, 14), piedra);
    pie.position.y = .08;
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(.82, .6, .6, 14), piedra);
    cuerpo.position.y = .44;
    const hueco = new THREE.Mesh(new THREE.CylinderGeometry(.68, .5, .08, 14), matT('--pizarra-700', '#1d1822'));
    hueco.position.y = .72;
    const mazo = new THREE.Mesh(new THREE.CylinderGeometry(.12, .18, .76, 10), piedra);
    mazo.position.set(.95, .62, .4); mazo.rotation.z = -.5;
    g.add(pie, cuerpo, hueco, mazo);
    g.userData.alto = .74;
    g.userData.anim = { tipo: 'majar', mazo, mazoY: mazo.position.y };
  } else if (id === 'parrilla') {
    const brasero = new THREE.Mesh(new THREE.BoxGeometry(2.1, .34, 1.35), matT('--pizarra-500', '#2f2733'));
    brasero.position.y = .17;
    const patas = [[-.9, -.5], [.9, -.5], [-.9, .5], [.9, .5]];
    patas.forEach(([x, z]) => {
      const pata = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .34, 6), metalOsc);
      pata.position.set(x, .17, z);
      g.add(pata);
    });
    /* las brasas, que laten */
    const brasas = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const br = new THREE.Mesh(new THREE.IcosahedronGeometry(.11, 0), mat('#e2732f'));
      br.position.set(-.8 + (i % 5) * .4, .34, i < 5 ? -.25 : .25);
      brasas.add(br);
    }
    const rejilla = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const barra = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1.3, 6), metal);
      barra.rotation.x = Math.PI / 2;
      barra.position.set(-.9 + i * .3, .5, 0);
      rejilla.add(barra);
    }
    g.add(brasero, brasas, rejilla);
    g.userData.alto = .53;
    g.userData.fuego = true;
    g.userData.anim = { tipo: 'asar', brasas, rejilla };
  } else if (id === 'molino') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, .16, .95), metalOsc);
    base.position.y = .08;
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(.95, .9, .8), metal);
    cuerpo.position.y = .6;
    const tolva = new THREE.Mesh(new THREE.CylinderGeometry(.52, .26, .44, 12, 1, true), metalOsc);
    tolva.position.y = 1.26;
    const salida = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .3, 8), metalOsc);
    salida.rotation.x = Math.PI / 2; salida.position.set(0, .45, .5);
    const eje = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .5, 8), metalOsc);
    eje.rotation.z = Math.PI / 2; eje.position.set(.68, .7, 0);
    const manivela = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .32, 8), maderaM);
    manivela.position.set(.92, .53, 0);
    g.add(base, cuerpo, tolva, salida, eje, manivela);
    g.userData.alto = 1.28;
    g.userData.manivela = manivela;
    g.userData.anim = { tipo: 'moler', manivela, cuerpo };
  }
  return g;
}

/* ============================================================
   LA COCINA
   ============================================================ */

function texturaMadera(base, veta) {
  return canvasTexture((ctx, S) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = veta; ctx.lineWidth = 3; ctx.globalAlpha = .5;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const y = (i + .5) * S / 9;
      ctx.moveTo(0, y); ctx.bezierCurveTo(S * .3, y - 8, S * .6, y + 8, S, y); ctx.stroke();
    }
  });
}
function texturaTalavera() {
  return canvasTexture((ctx, S) => {
    const T = S / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = '#f9fbfc'; ctx.fillRect(x * T, y * T, T, T);
      const cx = x * T + T / 2, cy = y * T + T / 2;
      ctx.fillStyle = token('--jade-400', '#12a9a0');
      [[0, -T * .24], [0, T * .24], [-T * .24, 0], [T * .24, 0]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(cx + dx, cy + dy, T * .11, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = token('--talavera-500', '#1b5faa');
      ctx.beginPath(); ctx.arc(cx, cy, T * .15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = token('--talavera-300', '#5f97d8');
      [[0, 0], [T, 0], [0, T], [T, T]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(x * T + dx, y * T + dy, T * .16, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = '#e2e8ea'; ctx.lineWidth = 4;
      ctx.strokeRect(x * T + 2, y * T + 2, T - 4, T - 4);
    }
  });
}

let vaporTex = null, humoTex = null, blobTex = null, starTex = null;
function texVapor() {
  if (!vaporTex) vaporTex = canvasTexture((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
  return vaporTex;
}
function texHumo() {
  if (!humoTex) humoTex = canvasTexture((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(96,92,86,.75)'); g.addColorStop(1, 'rgba(96,92,86,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
  return humoTex;
}
function sombraBlob(size = .7) {
  if (!blobTex) blobTex = canvasTexture((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(40,26,20,.45)'); g.addColorStop(1, 'rgba(40,26,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = .012;
  return m;
}
/* migajas o gotitas: el detalle que hace que el gesto se sienta */
let chispaTex = null;
function chispas(x, y, z, n, tk) {
  if (!chispaTex) chispaTex = canvasTexture((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 32);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: chispaTex, transparent: true, color: new THREE.Color(token(tk, '#ffffff')) }));
    s.position.set(x + (Math.random() - .5) * .5, y, z + (Math.random() - .5) * .4);
    s.scale.setScalar(.07 + Math.random() * .06);
    const a = Math.random() * Math.PI * 2;
    s.userData.vel = new THREE.Vector3(Math.cos(a) * .7, 1.1 + Math.random(), Math.sin(a) * .5);
    s.userData.born = clock.elapsedTime;
    scene.add(s); particles.push(s);
  }
}

function estrellitas(x, y, z, n = 16) {
  if (!starTex) starTex = canvasTexture((ctx, S) => {
    ctx.fillStyle = token('--maiz-300', '#ffc93c');
    ctx.strokeStyle = token('--maiz-600', '#c07610'); ctx.lineWidth = 6;
    ctx.translate(S / 2, S / 2); ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? S * .18 : S * .42, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }, 64);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true }));
    s.position.set(x, y, z);
    s.scale.setScalar(.14 + Math.random() * .13);
    const a = Math.random() * Math.PI * 2;
    s.userData.vel = new THREE.Vector3(Math.cos(a) * (.7 + Math.random()), 1.5 + Math.random() * 1.3, Math.sin(a) * .5);
    s.userData.born = clock.elapsedTime;
    scene.add(s); particles.push(s);
  }
}

function construirCocina() {
  const tiles = texturaTalavera();
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(6, 4.5);
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), new THREE.MeshLambertMaterial({ map: tiles }));
  pared.position.set(0, 4.6, -2.3);
  scene.add(pared);

  const repisaAlta = new THREE.Mesh(new THREE.BoxGeometry(3, .1, .45), matT('--madera-500', '#93491c'));
  repisaAlta.position.set(-2.1, 2.9, -1.85);
  scene.add(repisaAlta);
  [[-3.2, '--rosa-500', '#e01b6a'], [-2.6, '--nopal-500', '#6fae2e'], [-2.0, '--maiz-400', '#f5a623'], [-1.4, '--jade-400', '#12a9a0']]
    .forEach(([x, tk, fb]) => {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(.13, .14, .34, 12), matT('--peltre-200', '#f3f1ec'));
      f.position.set(x, 3.12, -1.85);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .07, 12), matT(tk, fb));
      t.position.set(x, 3.32, -1.85);
      scene.add(f, t);
    });

  const woodTex = texturaMadera(token('--madera-300', '#d07c3f'), token('--madera-500', '#93491c'));
  const meson = new THREE.Mesh(new THREE.BoxGeometry(12, .26, 2.4), new THREE.MeshLambertMaterial({ map: woodTex }));
  meson.position.set(0, COUNTER_Y - .13, EST_Z - .05);
  scene.add(meson);
  const frenteMeson = new THREE.Mesh(new THREE.BoxGeometry(12, .8, .1), matT('--talavera-500', '#1b5faa'));
  frenteMeson.position.set(0, COUNTER_Y - .62, EST_Z + 1.05);
  scene.add(frenteMeson);

  /* nivel 2: el estante de las preparaciones */
  const estante = new THREE.Mesh(new THREE.BoxGeometry(4.4, .14, 1.05), new THREE.MeshLambertMaterial({ map: woodTex }));
  estante.position.set(0, REPISA_Y - .07, REPISA_Z);
  const estanteBorde = new THREE.Mesh(new THREE.BoxGeometry(4.4, .17, .08), matT('--madera-600', '#723713'));
  estanteBorde.position.set(0, REPISA_Y + .05, REPISA_Z + .5);
  scene.add(estante, estanteBorde);
  [-2.15, 2.15].forEach(x => {
    const pata = new THREE.Mesh(new THREE.BoxGeometry(.16, REPISA_Y, .16), matT('--madera-600', '#723713'));
    pata.position.set(x, REPISA_Y / 2, REPISA_Z + .3);
    scene.add(pata);
  });

  /* nivel 3: la canasta */
  const mimbre = matT('--madera-300', '#d07c3f');
  const mimbreOsc = matT('--madera-500', '#93491c');
  const piso = new THREE.Mesh(new THREE.BoxGeometry(4.2, .1, 1.2), mimbreOsc);
  piso.position.set(0, CANASTA_Y - .05, CANASTA_Z);
  const paredFrente = new THREE.Mesh(new THREE.BoxGeometry(4.3, .44, .1), mimbre);
  paredFrente.position.set(0, CANASTA_Y + .17, CANASTA_Z + .62);
  const paredFondo = new THREE.Mesh(new THREE.BoxGeometry(4.3, .32, .09), mimbre);
  paredFondo.position.set(0, CANASTA_Y + .11, CANASTA_Z - .62);
  scene.add(piso, paredFrente, paredFondo);
  [-2.1, 2.1].forEach(x => {
    const lado = new THREE.Mesh(new THREE.BoxGeometry(.09, .42, 1.24), mimbre);
    lado.position.set(x, CANASTA_Y + .16, CANASTA_Z);
    scene.add(lado);
  });
  [-.04, .14, .32].forEach((dy, i) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(4.34, .05, .12), i % 2 ? mimbreOsc : mimbre);
    l.position.set(0, CANASTA_Y + dy, CANASTA_Z + .65);
    scene.add(l);
  });

  /* el basurero */
  const tacho = new THREE.Group();
  const cuerpoT = new THREE.Mesh(new THREE.CylinderGeometry(.4, .33, .74, 16), matT('--metal-400', '#9aa3ae'));
  const rimT = new THREE.Mesh(new THREE.TorusGeometry(.4, .05, 7, 18), matT('--metal-600', '#6c7683'));
  rimT.rotation.x = Math.PI / 2; rimT.position.y = .37;
  const bolsa = new THREE.Mesh(new THREE.CylinderGeometry(.36, .34, .06, 16), matT('--pizarra-500', '#2f2733'));
  bolsa.position.y = .34;
  tacho.add(cuerpoT, rimT, bolsa);
  tacho.position.set(TACHO.x, TACHO.y, TACHO.z);
  scene.add(tacho);
  tachoGroup = tacho;

  const pisoTex = canvasTexture((ctx, S) => {
    const T = S / 2;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      ctx.fillStyle = (x + y) % 2 ? token('--chile-500', '#ce2029') : '#f2ece2';
      ctx.fillRect(x * T, y * T, T, T);
    }
  }, 128);
  pisoTex.wrapS = pisoTex.wrapT = THREE.RepeatWrapping;
  pisoTex.repeat.set(11, 9);
  const pisoCocina = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), new THREE.MeshLambertMaterial({ map: pisoTex }));
  pisoCocina.rotation.x = -Math.PI / 2;
  pisoCocina.position.set(0, -.02, 4);
  scene.add(pisoCocina);

  const marcaTex = canvasTexture((ctx, S) => {
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 8;
    ctx.setLineDash([16, 13]);
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .4, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(S / 2 - S * .11, S / 2); ctx.lineTo(S / 2 + S * .11, S / 2);
    ctx.moveTo(S / 2, S / 2 - S * .11); ctx.lineTo(S / 2, S / 2 + S * .11);
    ctx.stroke();
  }, 128);
  SLOT_X.forEach(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.58, .58),
      new THREE.MeshBasicMaterial({ map: marcaTex, transparent: true, opacity: .75, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    scene.add(m);
    slotMarkers.push(m);
  });

  estacionGroup = new THREE.Group();
  estacionGroup.position.set(0, COUNTER_Y, EST_Z);
  scene.add(estacionGroup);

  for (let i = 0; i < 3; i++) {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: texVapor(), transparent: true, opacity: 0 }));
    p.userData.phase = i / 3;
    p.visible = false;
    scene.add(p);
    steamPuffs.push(p);
  }

  scene.add(new THREE.HemisphereLight('#ffffff', token('--peltre-300', '#e3dfd6'), 1.3));
  const sol = new THREE.DirectionalLight('#fff7ec', 1.3);
  sol.position.set(-2.5, 5.5, 4);
  scene.add(sol);
}

/* ---------- montar / cambiar la estación ---------- */

function montarEstacion(id, dir = 0) {
  if (estacionActual === id) return;
  const anterior = estacionMesh;
  estacionActual = id;
  const nueva = construirEstacion(id);
  estacionMesh = nueva;
  estacionGroup.add(nueva);
  nueva.position.x = dir === 0 ? 0 : dir * 4;
  if (dir !== 0) tween(nueva, 'position', new THREE.Vector3(0, 0, 0), .3);
  if (anterior) {
    if (dir === 0) estacionGroup.remove(anterior);
    else tween(anterior, 'position', new THREE.Vector3(-dir * 4, 0, 0), .3, easeOut, () => estacionGroup.remove(anterior));
  }
  steamPuffs.forEach(p => { p.visible = !!nueva.userData.fuego; });
  colocarSlots();
}
function alturaEstacion() { return estacionMesh ? (estacionMesh.userData.alto || 0) : 0; }
function restaurarEstacion() {
  const a = estacionMesh && estacionMesh.userData.anim;
  if (!a) return;
  if (a.filo) { a.filo.position.y = 0; a.filo.rotation.z = 0; }
  if (a.cazo) { a.cazo.rotation.z = 0; a.cazo.position.y = 0; }
  if (a.mazo) { a.mazo.position.y = a.mazoY; a.mazo.rotation.z = -.5; }
  if (a.cuerpo) a.cuerpo.scale.set(1, 1, 1);
  if (a.rejilla) a.rejilla.position.y = .5;
}
function posSlot(i) { return new THREE.Vector3(SLOT_X[i], COUNTER_Y + alturaEstacion(), EST_Z); }

/* ---------- filas: repisa y canasta ---------- */

function posFila(i, nivel) {
  const x = FILA_X[i % PER_PAGE] * (PER_PAGE === 4 ? 1 : .82);
  return nivel === 'repisa'
    ? new THREE.Vector3(x, REPISA_Y, REPISA_Z)
    : new THREE.Vector3(x, CANASTA_Y, CANASTA_Z);
}

const badgeCache = {};
function badge(n) {
  if (!badgeCache[n]) badgeCache[n] = canvasTexture((ctx, S) => {
    ctx.fillStyle = token('--chile-500', '#ce2029');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${S * .54}px 'Baloo 2', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), S / 2, S / 2 + 3);
  }, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeCache[n], transparent: true, depthTest: false }));
  s.scale.setScalar(.24);
  s.position.set(.23, .5, .06);
  return s;
}

function poblarFila(lista, nivel) {
  const viejos = nivel === 'repisa' ? repisaRoots : canastaRoots;
  viejos.forEach(o => scene.remove(o));
  const nuevos = [];
  const pag = nivel === 'repisa' ? pagRepisa : pagCanasta;
  lista.slice(pag * PER_PAGE, pag * PER_PAGE + PER_PAGE).forEach((item, i) => {
    const holder = new THREE.Group();
    holder.position.copy(posFila(i, nivel));
    holder.userData = { tipo: nivel, id: item.id, n: item.n };
    holder.add(badge(item.n));
    holder.add(sombraBlob(.58));
    scene.add(holder);
    nuevos.push(holder);
    cargarItem(item.id, (obj) => { obj.scale.multiplyScalar(.85); holder.add(obj); });
  });
  if (nivel === 'repisa') repisaRoots = nuevos; else canastaRoots = nuevos;
  actualizarFlechas();
}

function totalPag(lista) { return Math.max(1, Math.ceil(lista.length / PER_PAGE)); }
function actualizarFlechas() {
  if (!ui.canastaPrev) return;
  const tc = totalPag(datos.canasta), tr = totalPag(datos.repisa);
  ui.canastaPrev.classList.toggle('hidden', tc <= 1 || pagCanasta === 0);
  ui.canastaNext.classList.toggle('hidden', tc <= 1 || pagCanasta >= tc - 1);
  ui.repisaPrev.classList.toggle('hidden', tr <= 1 || pagRepisa === 0);
  ui.repisaNext.classList.toggle('hidden', tr <= 1 || pagRepisa >= tr - 1);
}

/* ---------- los puestos de la estación ---------- */

function ocupado(i) { return !!slotRoots[i] || (mess && mess.userData.slot === i); }
function colocarSlots() {
  slotRoots.forEach((it, i) => { if (it) it.position.copy(posSlot(i)); });
  if (mess) mess.position.copy(posSlot(mess.userData.slot));
  slotMarkers.forEach((m, i) => {
    m.position.set(SLOT_X[i], COUNTER_Y + alturaEstacion() + .02, EST_Z);
    m.visible = !ocupado(i);
  });
}
function ponerEnSlot(id, i, desde) {
  const holder = new THREE.Group();
  holder.userData = { tipo: 'slot', id, slot: i };
  const destino = posSlot(i);
  holder.position.copy(desde || destino.clone().setY(destino.y + .8));
  holder.add(sombraBlob(.62));
  scene.add(holder);
  slotRoots[i] = holder;
  cargarItem(id, (obj) => holder.add(obj));
  tween(holder, 'position', destino, .26);
  slotMarkers[i].visible = false;
}

/* ============================================================
   ARRASTRE
   ============================================================ */

let dragging = null, swipeEstacion = null;
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_Y);
const pt = new THREE.Vector3();
let lastPtr = { clientX: 0, clientY: 0 };

function pointerNDC(e) {
  lastPtr = { clientX: e.clientX, clientY: e.clientY };
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function raiz(obj) {
  while (obj && obj !== scene) {
    if (obj.userData && obj.userData.tipo) return obj;
    obj = obj.parent;
  }
  return null;
}

function onDown(e) {
  if (dragging || swipeEstacion) return;
  pointerNDC(e);
  const objetivos = [];
  if (mess) objetivos.push(mess);
  objetivos.push(...canastaRoots, ...repisaRoots, ...slotRoots.filter(Boolean));
  const hits = objetivos.length ? ray.intersectObjects(objetivos, true) : [];
  if (hits.length) {
    const root = raiz(hits[0].object);
    if (!root) return;
    const ud = root.userData;
    if (ud.tipo === 'canasta' || ud.tipo === 'repisa') {
      if (ud.n <= 0) { if (cbs.sinStock) cbs.sinStock(ud.id); return; }
      const clone = new THREE.Group();
      clone.userData = { tipo: 'arrastre', id: ud.id };
      clone.position.copy(root.position).setY(DRAG_Y);
      scene.add(clone);
      cargarItem(ud.id, (o) => clone.add(o));
      dragging = { root: clone, id: ud.id, from: ud.tipo, origen: root.position.clone() };
    } else if (ud.tipo === 'slot') {
      dragging = { root, id: ud.id, from: 'slot', slot: slotRoots.indexOf(root), origen: root.position.clone() };
      tween(root, 'position', root.position.clone().setY(DRAG_Y), .1);
    } else if (ud.tipo === 'mess') {
      dragging = { root, id: 'mezcla_rara', from: 'mess', origen: root.position.clone() };
      tween(root, 'position', root.position.clone().setY(DRAG_Y), .1);
    }
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) {}
    if (cbs.alAgarrar) cbs.alAgarrar();
    return;
  }
  /* no agarró nada: si tocó la estación, prepara el deslizamiento */
  if (estacionMesh && ray.intersectObject(estacionMesh, true).length) {
    swipeEstacion = { x0: e.clientX, movido: false };
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) {}
  }
}

function onMove(e) {
  if (dragging) {
    pointerNDC(e);
    if (ray.ray.intersectPlane(dragPlane, pt)) {
      dragging.root.position.set(
        THREE.MathUtils.clamp(pt.x, -3.4, 3.4), DRAG_Y,
        THREE.MathUtils.clamp(pt.z, -1.4, 3)
      );
    }
    return;
  }
  if (swipeEstacion) {
    const dx = e.clientX - swipeEstacion.x0;
    if (Math.abs(dx) > 10) swipeEstacion.movido = true;
    if (estacionMesh) estacionMesh.position.x = THREE.MathUtils.clamp(dx * .012, -.5, .5);
  }
}

function onUp(e) {
  if (swipeEstacion) {
    const dx = (e.clientX != null ? e.clientX : lastPtr.clientX) - swipeEstacion.x0;
    const s = swipeEstacion; swipeEstacion = null;
    if (estacionMesh) tween(estacionMesh, 'position', new THREE.Vector3(0, 0, 0), .2);
    if (s.movido && Math.abs(dx) > 55 && cbs.alDeslizarEstacion) cbs.alDeslizarEstacion(dx < 0 ? 1 : -1);
    return;
  }
  if (!dragging) return;
  const d = dragging; dragging = null;
  pointerNDC(lastPtr);

  const enTacho = ray.intersectObject(tachoGroup, true).length > 0;
  const sobreEstacion = estacionMesh ? ray.intersectObject(estacionMesh, true).length > 0 : false;
  const p = d.root.position;
  const haciaEstacion = sobreEstacion || p.z < REPISA_Z - .4;

  /* la mezcla rara: su único destino digno es el basurero */
  if (d.from === 'mess') {
    if (enTacho) {
      tween(d.root, 'position', new THREE.Vector3(TACHO.x, TACHO.y + .8, TACHO.z), .22, easeOut, () => {
        tween(d.root, 'scale', new THREE.Vector3(.01, .01, .01), .16, easeOut, () => {
          scene.remove(d.root); mess = null; colocarSlots();
          if (cbs.alBotarMezcla) cbs.alBotarMezcla();
        });
      });
    } else tween(d.root, 'position', d.origen, .24);
    return;
  }

  if (haciaEstacion && !enTacho) {
    let destino = -1;
    if (d.from === 'slot') destino = d.slot;
    else destino = !ocupado(0) ? 0 : (!ocupado(1) ? 1 : -1);
    if (destino < 0) { if (cbs.estacionLlena) cbs.estacionLlena(); volver(d); return; }
    if (d.from === 'slot') { tween(d.root, 'position', posSlot(destino), .2); return; }
    scene.remove(d.root);
    ponerEnSlot(d.id, destino, d.root.position.clone());
    colocarSlots();
    if (cbs.alColocar) cbs.alColocar(d.id, destino, d.from);
    return;
  }

  /* sacar de la estación: vuelve a su nivel */
  if (d.from === 'slot') {
    const i = d.slot;
    scene.remove(d.root);
    slotRoots[i] = null;
    colocarSlots();
    if (cbs.alQuitar) cbs.alQuitar(i);
    return;
  }
  volver(d);
}
function volver(d) {
  if (d.from === 'slot') { tween(d.root, 'position', posSlot(d.slot), .22); return; }
  tween(d.root, 'position', d.origen, .22, easeOut, () => scene.remove(d.root));
}

/* ---------- Encuadre automático ----------
   La caja de juego (los tres niveles + el basurero) tiene que caber
   siempre, en cualquier pantalla. En vez de fijar el campo de visión
   —que en un móvil vertical dejaba media pared vacía— se acerca o
   aleja la cámara hasta que la caja llena el cuadro con un margen. */
const FOCO = new THREE.Vector3(0, .58, 1.12);
const DIR = new THREE.Vector3(0, .76, .65).normalize();
const CAJA = new THREE.Box3();
function ajustarMundo(aspect) {
  const angosta = aspect < .66;
  const per = angosta ? 4 : 5;
  const cambio = per !== PER_PAGE;
  PER_PAGE = per;
  FILA_X = angosta ? FILA_ANGOSTA : FILA_ANCHA;
  const bx = angosta ? 1.82 : 2.55;
  CAJA.min.set(-bx, .05, -1.1);
  CAJA.max.set(bx + .45, 1.55, 3.15);
  return cambio;
}
const _esq = new THREE.Vector3();
function extremoNDC() {
  let max = 0;
  for (let i = 0; i < 8; i++) {
    _esq.set(i & 1 ? CAJA.max.x : CAJA.min.x, i & 2 ? CAJA.max.y : CAJA.min.y, i & 4 ? CAJA.max.z : CAJA.min.z);
    _esq.project(camera);
    max = Math.max(max, Math.abs(_esq.x), Math.abs(_esq.y));
  }
  return max;
}
function encuadrar() {
  let dist = 5;
  for (let i = 0; i < 34; i++) {
    camera.position.copy(FOCO).addScaledVector(DIR, dist);
    camera.lookAt(FOCO);
    camera.updateMatrixWorld();
    const m = extremoNDC();
    if (m > 1.0) dist *= 1.04;
    else if (m < .94) dist *= .98;
    else break;
  }
}

/* ============================================================
   API
   ============================================================ */

const Escena3D = {
  init(container) {
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch (e) { return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(44, 8 / 7, .1, 60);
    ajustarMundo(8 / 7);
    clock = new THREE.Clock();

    construirCocina();

    const flecha = (cls, txt, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'nivel-flecha ' + cls + ' hidden'; b.textContent = txt;
      b.addEventListener('click', fn);
      container.appendChild(b);
      return b;
    };
    ui.canastaPrev = flecha('prev', '‹', () => { pagCanasta--; poblarFila(datos.canasta, 'canasta'); });
    ui.canastaNext = flecha('next', '›', () => { pagCanasta++; poblarFila(datos.canasta, 'canasta'); });
    ui.repisaPrev = flecha('prev', '‹', () => { pagRepisa--; poblarFila(datos.repisa, 'repisa'); });
    ui.repisaNext = flecha('next', '›', () => { pagRepisa++; poblarFila(datos.repisa, 'repisa'); });

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (ajustarMundo(camera.aspect)) {
        poblarFila(datos.canasta, 'canasta');
        poblarFila(datos.repisa, 'repisa');
      }
      encuadrar();
      const aPx = (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(camera);
        return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
      };
      const yCan = aPx(0, CANASTA_Y + .3, CANASTA_Z).y;
      const yRep = aPx(0, REPISA_Y + .3, REPISA_Z).y;
      [[ui.canastaPrev, ui.canastaNext, yCan], [ui.repisaPrev, ui.repisaNext, yRep]].forEach(([a, b, y]) => {
        a.style.top = y + 'px'; b.style.top = y + 'px';
      });
    };
    new ResizeObserver(resize).observe(container);
    resize();
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));

    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    return true;
  },

  bind(callbacks) { cbs = callbacks || {}; },

  /* única entrada de datos desde app.js */
  sync(d) {
    const antesC = JSON.stringify(datos.canasta), antesR = JSON.stringify(datos.repisa);
    Object.assign(datos, d);
    if (d.estacion) montarEstacion(d.estacion, d.dir || 0);
    if (d.canasta && JSON.stringify(d.canasta) !== antesC) {
      pagCanasta = Math.max(0, Math.min(pagCanasta, totalPag(datos.canasta) - 1));
      poblarFila(datos.canasta, 'canasta');
    }
    if (d.repisa && JSON.stringify(d.repisa) !== antesR) {
      pagRepisa = Math.max(0, Math.min(pagRepisa, totalPag(datos.repisa) - 1));
      poblarFila(datos.repisa, 'repisa');
    }
    if (d.slots) {
      for (let i = 0; i < 2; i++) {
        const id = d.slots[i], cur = slotRoots[i];
        if (cur && cur.userData.id === id) continue;
        if (cur) { scene.remove(cur); slotRoots[i] = null; }
        if (id) ponerEnSlot(id, i);
      }
    }
    colocarSlots();
    actualizarFlechas();
  },

  /* La estación hace su trabajo a la vista: el cuchillo pica, la olla
     hierve, la sartén saltea, el pilón maja, el molino muele. Solo
     cuando termina el gesto aparece la carta. */
  combinar(cb) {
    const items = slotRoots.filter(Boolean);
    slotRoots = [null, null];
    const alto = COUNTER_Y + alturaEstacion();
    const centro = new THREE.Vector3(0, alto + .12, EST_Z);
    items.forEach(it => tween(it, 'position', centro, .22));
    const dur = 1.05;
    animCocina = { t0: clock.elapsedTime + .2, dur, items, alto };
    setTimeout(() => {
      animCocina = null;
      restaurarEstacion();
      items.forEach(it => scene.remove(it));
      colocarSlots();
      estrellitas(0, alto + .4, EST_Z);
      if (cb) cb();
    }, (dur + .2) * 1000);
  },

  /* la pareja no combinó: queda un engrudo en UN puesto — estorba,
     pero el otro puesto sigue libre y no se gastó ningún ingrediente */
  mezclaRara(slot = 0) {
    const items = slotRoots.filter(Boolean);
    slotRoots = [null, null];
    items.forEach(it => tween(it, 'position', posSlot(slot), .22));
    setTimeout(() => {
      items.forEach(it => scene.remove(it));
      const g = new THREE.Group();
      g.userData = { tipo: 'mess', id: 'mezcla_rara', slot, humo: [] };
      g.add(sombraBlob(.7));
      g.add(preparacionMesh('mezcla_rara'));
      g.position.copy(posSlot(slot));
      scene.add(g);
      mess = g;
      for (let i = 0; i < 2; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHumo(), transparent: true, opacity: 0 }));
        s.userData.phase = i / 2;
        g.add(s); g.userData.humo.push(s);
      }
      colocarSlots();
    }, 240);
  },

  hayMezclaRara() { return !!mess; },
  slotDeMezcla() { return mess ? mess.userData.slot : -1; },

  proyectar(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  },

  setActive(on) { active = on; if (on && raf === null && renderer) loop(); },
};

/* el vapor de un cuenco caliente se engancha una sola vez por malla */
function engancharVapor(holder) {
  if (!holder) return;
  holder.children.forEach(ch => {
    if (ch.userData && ch.userData.vapor && !ch.userData.puff) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texVapor(), transparent: true, opacity: 0 }));
      s.userData.phase = Math.random();
      ch.add(s);
      ch.userData.puff = s;
      vaporSprites.push(s);
    }
  });
}

function loop() {
  if (!active) { raf = null; return; }
  raf = requestAnimationFrame(loop);
  const dt = clock.getDelta(), t = clock.elapsedTime;
  stepTweens();

  if (estacionMesh && estacionMesh.userData.fuego) {
    const alto = COUNTER_Y + alturaEstacion();
    steamPuffs.forEach(p => {
      const k = ((t * .35) + p.userData.phase) % 1;
      p.position.set(Math.sin(k * 6 + p.userData.phase * 9) * .1, alto + .1 + k * .8, EST_Z);
      p.material.opacity = k < .15 ? k / .15 * .5 : (1 - k) * .55;
      p.scale.setScalar(.24 + k * .34);
    });
  }
  /* la manivela del molino gira sola en reposo */
  if (estacionMesh && estacionMesh.userData.manivela && !animCocina) {
    const m = estacionMesh.userData.manivela;
    m.position.y = .53 + Math.sin(t * 2) * .18;
    m.position.z = Math.cos(t * 2) * .18;
  }

  /* el gesto de cocinar, según la estación */
  if (animCocina) {
    const k = THREE.MathUtils.clamp((t - animCocina.t0) / animCocina.dur, 0, 1);
    const a = estacionMesh && estacionMesh.userData.anim;
    const golpes = Math.sin(k * Math.PI * 6);          /* tres idas y venidas */
    const sube = Math.max(0, golpes);
    if (a && k > 0) {
      if (a.tipo === 'picar') {
        a.filo.position.y = sube * .42;
        a.filo.rotation.z = -sube * .5;
        if (golpes < -.9) chispas(0, animCocina.alto + .05, EST_Z, 1, '--peltre-100');
      } else if (a.tipo === 'majar') {
        a.mazo.position.y = a.mazoY + sube * .5;
        a.mazo.rotation.z = -.5 + sube * .35;
      } else if (a.tipo === 'saltear') {
        a.cazo.rotation.z = Math.sin(k * Math.PI * 4) * .28;
        a.cazo.position.y = Math.abs(Math.sin(k * Math.PI * 4)) * .12;
      } else if (a.tipo === 'hervir') {
        const p = 1 + Math.sin(k * Math.PI * 10) * .025;
        a.cuerpo.scale.set(p, 1, p);
        if (Math.sin(k * Math.PI * 10) > .9) chispas(0, animCocina.alto + .1, EST_Z, 1, '--peltre-200');
      } else if (a.tipo === 'asar') {
        a.brasas.children.forEach((br, i) => {
          const f = .5 + .5 * Math.sin(k * Math.PI * 14 + i);
          br.material = br.material;
          br.scale.setScalar(.85 + f * .35);
        });
        a.rejilla.position.y = .5 + Math.sin(k * Math.PI * 8) * .02;
        if (Math.sin(k * Math.PI * 12) > .93) chispas(0, animCocina.alto + .05, EST_Z, 1, '--maiz-300');
      } else if (a.tipo === 'moler') {
        a.manivela.position.y = .53 + Math.sin(k * Math.PI * 12) * .18;
        a.manivela.position.z = Math.cos(k * Math.PI * 12) * .18;
        a.cuerpo.scale.set(1 + Math.sin(k * Math.PI * 24) * .012, 1, 1);
      }
    }
    /* lo que se cocina salta, se sacude o se hunde según el gesto */
    animCocina.items.forEach((it, i) => {
      if (!it.parent) return;
      const tipo = a ? a.tipo : '';
      if (tipo === 'saltear') it.position.y = animCocina.alto + .12 + Math.abs(Math.sin(k * Math.PI * 4)) * .5;
      else if (tipo === 'hervir') it.position.y = animCocina.alto + .12 - k * .3;
      else it.position.y = animCocina.alto + .12 + Math.abs(Math.sin(k * Math.PI * 6)) * .06;
      it.rotation.y += dt * (2 + i);
      it.rotation.z = Math.sin(k * Math.PI * 6) * .12;
      const desvanece = Math.max(0, (k - .7) / .3);
      it.scale.setScalar(1 - desvanece * .85);
    });
  }

  slotRoots.forEach((it, i) => { if (it && (!dragging || dragging.root !== it)) it.rotation.y = Math.sin(t * 1.3 + i * 2) * .1; });
  if (mess) {
    mess.rotation.y = Math.sin(t * 2.2) * .07;
    mess.userData.humo.forEach(s => {
      const k = ((t * .5) + s.userData.phase) % 1;
      s.position.set(Math.sin(k * 9) * .07, .5 + k * .55, 0);
      s.material.opacity = k < .2 ? k / .2 * .55 : (1 - k) * .6;
      s.scale.setScalar(.22 + k * .26);
    });
  }
  [...repisaRoots, ...slotRoots].forEach(engancharVapor);
  vaporSprites.forEach(s => {
    const k = ((t * .3) + s.userData.phase) % 1;
    s.position.set(0, .45 + k * .5, 0);
    s.material.opacity = (k < .2 ? k / .2 : (1 - k)) * .38;
    s.scale.setScalar(.16 + k * .22);
  });

  particles = particles.filter(s => {
    const age = t - s.userData.born;
    if (age > .8) { scene.remove(s); return false; }
    s.userData.vel.y -= 4.5 * dt;
    s.position.addScaledVector(s.userData.vel, dt);
    s.material.opacity = 1 - age / .8;
    return true;
  });

  renderer.render(scene, camera);
}

window.Escena3D = Escena3D;
