/* ============================================================
   FANESCA — motor3d.js
   El mesón de preparación en 3D: lo único que todos los niveles
   comparten. Aquí viven la cocina de fondo, la cámara fija, la
   luz, los tweens, las chispas y —sobre todo— la lectura de los
   dedos: qué es un toque, qué es un arrastre y sobre qué cayó.

   Un nivel no sabe nada de Three.js más allá de armar sus mallas
   dentro de `ctx.raiz`. Todo lo demás se lo pide al motor por
   `ctx.api`. Ese contrato está descrito abajo y es lo que hace
   que agregar un ingrediente nuevo sea escribir un archivo, no
   tocar el juego.

   ------------------------------------------------------------
   CONTRATO DE NIVEL — un módulo que exporta por defecto:

     {
       id: 'maiz',
       construir(ctx),            arma las mallas dentro de ctx.raiz
       objetivos(),               [Object3D] contra los que raycastea
                                  el motor (el primero que pegue manda)
       actualizar(dt, t),         cada cuadro
       alTocar(info),             dedo abajo y arriba sin moverse
       alArrastrarInicio(info),   pasó el umbral de movimiento
       alArrastrar(info),         cada cuadro con el dedo abajo
       alArrastrarFin(info),      dedo arriba tras arrastrar
       alPellizcarInicio(info),   dos dedos abajo a la vez (opcional)
       alPellizcarMover(info),    cada cuadro con los dos dedos abajo
       alPellizcarFin(info),      se levantó uno de los dos dedos
       controles: [{id, txt, tip}] botones DOM del nivel (opcional)
       alControl(id, fase),       'abajo' | 'arriba'
       destruir(),
     }

   `info` = { objeto, raiz, punto, ndc, cliente, dx, dy, arrastre, pellizco }
     objeto  malla exacta que pegó el rayo
     raiz    su ancestro con userData.tipo (lo que el nivel marcó)
     punto   Vector3 del impacto en el mundo
     dx, dy  desplazamiento en píxeles desde que empezó el gesto
     pellizco true si esto vino del gesto de dos dedos

   EL PELLIZCO. Agarrar un bicho por raycast exacto es pedirle al dedo
   una puntería que un bicho de un par de centímetros no da — sobre
   todo si además camina. Por eso, además del arrastre-desde-el-bicho
   de un dedo (que sigue funcionando, sobre todo para mouse), hay un
   segundo canal: poner DOS dedos a la vez es un gesto tan deliberado
   que se puede juzgar por cercanía EN PANTALLA (`info.cliente`) en
   vez de por acierto exacto de rayo — así "pellizcar" es agarrar de
   verdad, con el margen que un pellizco real tiene. Un nivel que
   quiera esto implementa los tres hooks `alPellizcar*`; el que no,
   simplemente no los declara y el pellizco no hace nada en él.

   `ctx.api` — lo que el nivel le pide al juego:
     progreso(hechos, total)   pinta la barra del HUD
     completar()               nivel superado
     arruinar(motivo)          se dañó la olla: se reinicia
     aviso(msg)                mensaje corto abajo
     sfx(nombre), buzz(patron)
     chispas(v3, color, n), destello(color), sacudir(fuerza)
     tween(obj, prop, a, dur, ease, fin)
     volarA(obj, destino, opts)  parábola hacia la batea/composta
     BATEA, COMPOSTA           Vector3 en el mundo
     MESA_Y                    altura de la superficie de trabajo
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { pieza, parte, cargarGLB, token } from './modelos/index.js';
import { construirCocina } from './modelos/cocina.js';
import { sombraBlob as _sombraBlob, ojitos as _ojitos } from './modelos/utileria.js';

/* ---------- geografía compartida del mesón ---------- */
export const MESA_Y = 0.96;                              /* cara del mesón */
export const BATEA = new THREE.Vector3(0.98, MESA_Y, 1.42);    /* lo bueno va aquí */
export const COMPOSTA = new THREE.Vector3(-1.0, MESA_Y, 1.44);  /* cáscaras y bichos */
export const RADIO_CUENCO = 0.44;

/* Hasta dónde puede acercarse una tabla de picar sin meterse dentro
   de los cuencos. Se calcula aquí porque los cuencos son del motor:
   así, si mañana la batea se corre, las tablas se corren solas.

   No es una manía: la tabla medía 3.1 × 1.7 y atravesaba los DOS
   cuencos en todos los niveles — se veía la madera clara cruzando
   por dentro del barro, que es exactamente el detalle que delata que
   una escena está armada con cajas y no cocinada. */
export const FRENTE_TABLA = Math.min(BATEA.z, COMPOSTA.z) - RADIO_CUENCO - 0.06;
const UMBRAL_ARRASTRE = 8;                               /* px antes de considerar arrastre */

let renderer, scene, camera, clock, raf = null, activo = false;
let raiz = null;                 /* donde el nivel arma lo suyo */
let nivel = null;                /* módulo de nivel en curso */
let contenedor = null;
let tweens = [];
let particulas = [];
let vuelos = [];
let sacudida = { t: 0, fuerza: 0 };
let camBase = new THREE.Vector3();
let camMira = new THREE.Vector3();
const CAM_POR_DEFECTO = { pos: [0, 3.02, 4.05], mira: [0, 1.12, 0.46] };
let destelloEl = null;
let bateaGrupo = null, compostaGrupo = null;

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

/* ---------- curvas de animación ---------- */

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easePop = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

/* La forma de las cosas vive en modelos/, no aquí. El motor arma la
   escena y lee los dedos; qué aspecto tiene un grano de choclo es
   asunto de modelos/choclo.js — y puede venir de un .glb esculpido
   en Blender sin que este archivo se entere. */

let chispaTex = null;
function texturaChispa() {
  if (!chispaTex) {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.translate(S / 2, S / 2);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? S * .16 : S * .44;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    chispaTex = new THREE.CanvasTexture(c);
    chispaTex.colorSpace = THREE.SRGBColorSpace;
  }
  return chispaTex;
}

/* re-exportadas para los niveles, que las piden por `ctx.api` */
export const sombraBlob = (size, alto) => _sombraBlob(THREE, size, alto);
export const ojitos = (sep, y, z, r) => _ojitos(THREE, sep, y, z, r);

/* ---------- el puesto ---------- */

let vapores = [];
let modelosListos = Promise.resolve();

function armarCocina() {
  const { grupo, vapores: v } = construirCocina(THREE, MESA_Y);
  scene.add(grupo);
  vapores = v;

  bateaGrupo = pieza('cuenco', THREE, {
    radio: 0.44,
    colorA: token('--madera-300', '#d07c3f'),
    colorB: token('--madera-500', '#93491c'),
    relleno: token('--maiz-300', '#ffc93c'),
  });
  bateaGrupo.position.copy(BATEA);

  compostaGrupo = pieza('cuenco', THREE, {
    radio: 0.4,
    colorA: token('--nopal-600', '#4c7c1f'),
    colorB: token('--nopal-600', '#4c7c1f'),
    relleno: token('--nopal-600', '#4c7c1f'),
  });
  compostaGrupo.position.copy(COMPOSTA);

  scene.add(bateaGrupo, compostaGrupo);
}

/* sube el nivel del cuenco: se ve que lo que sacaste fue a algún lado */
export function llenarRecipiente(cual, k) {
  const g = cual === 'composta' ? compostaGrupo : bateaGrupo;
  if (!g) return;
  const r = parte(g, 'relleno');
  if (!r) return;
  const t = Math.max(0, Math.min(1, k));
  if (t <= 0.001) { r.visible = false; return; }
  r.visible = true;
  r.scale.set(1, 1, 1);
  r.position.y = 0.04 + t * (g.userData.r || 0.44) * 0.5;
}

/* ---------- tweens y partículas ---------- */

export function tween(obj, prop, to, dur, ease = easeOut, fin = null) {
  const v = obj[prop];
  tweens.push({ obj, prop, from: v && v.clone ? v.clone() : v, to, t0: clock.elapsedTime, dur, ease, fin });
}
function pasoTweens() {
  const ahora = clock.elapsedTime;
  const listos = [];
  tweens = tweens.filter(tw => {
    const t = Math.min(1, (ahora - tw.t0) / tw.dur);
    const k = tw.ease(t);
    const v = tw.obj[tw.prop];
    if (v && v.lerpVectors) v.lerpVectors(tw.from, tw.to, k);
    else tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * k;
    if (t >= 1) { listos.push(tw); return false; }
    return true;
  });
  listos.forEach(tw => { if (tw.fin) tw.fin(); });
}

export function chispas(pos, color = '#ffd24d', cuantas = 10, escala = 1) {
  const tex = texturaChispa();
  for (let i = 0; i < cuantas; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, color }));
    /* todos los Sprite de three comparten UNA geometría interna: si al
       apagarse una chispa la tiráramos, las tirábamos todas */
    s.geometry.userData.compartida = true;
    s.position.copy(pos);
    s.scale.setScalar((0.08 + Math.random() * 0.1) * escala);
    const a = Math.random() * Math.PI * 2;
    s.userData.vel = new THREE.Vector3(Math.cos(a) * (0.6 + Math.random()), 1.1 + Math.random() * 1.2, Math.sin(a) * 0.6 + 0.3);
    s.userData.nace = clock.elapsedTime;
    s.userData.vida = 0.55 + Math.random() * 0.3;
    scene.add(s);
    particulas.push(s);
  }
}

/* parábola de "esto se fue al cuenco": el arco vende el gesto */
export function volarA(obj, destino, opts = {}) {
  const dur = opts.dur || 0.5;
  const alto = opts.alto != null ? opts.alto : 0.9;
  const desde = obj.position.clone();
  if (obj.parent && obj.parent !== scene) {
    obj.parent.updateWorldMatrix(true, false);
    obj.parent.localToWorld(desde);
    scene.attach(obj);
  }
  obj.userData.suelto = true;   /* para que descargar() lo barra si queda a medio vuelo */
  vuelos.push({
    obj, desde, hasta: destino.clone(), alto, dur, t0: clock.elapsedTime,
    giro: new THREE.Vector3((Math.random() - .5) * 9, (Math.random() - .5) * 9, (Math.random() - .5) * 9),
    fin: opts.fin || null, encoge: opts.encoge !== false,
  });
}
function pasoVuelos() {
  const ahora = clock.elapsedTime;
  const listos = [];
  vuelos = vuelos.filter(v => {
    const t = Math.min(1, (ahora - v.t0) / v.dur);
    v.obj.position.lerpVectors(v.desde, v.hasta, t);
    v.obj.position.y += Math.sin(t * Math.PI) * v.alto;
    v.obj.rotation.x += v.giro.x * 0.016;
    v.obj.rotation.z += v.giro.z * 0.016;
    if (v.encoge && t > 0.72) v.obj.scale.setScalar(Math.max(0.001, (1 - (t - 0.72) / 0.28)) * (v.obj.userData.escalaBase || 1));
    if (t >= 1) { listos.push(v); return false; }
    return true;
  });
  listos.forEach(v => {
    scene.remove(v.obj);
    if (v.fin) v.fin();
    /* aterrizó y nadie lo volvió a colgar: se descarta aquí y no al
       cambiar de nivel. Son ciento veintiséis granos por choclo — si
       esperan al final de la partida, esperan de más */
    if (!v.obj.parent) tirar(v.obj);
  });
}

export function sacudir(fuerza = 1) { sacudida = { t: 0, fuerza }; }

export function destello(color = 'rgba(230,57,70,.55)') {
  if (!destelloEl) return;
  destelloEl.style.background = color;
  destelloEl.classList.remove('activo');
  void destelloEl.offsetWidth;
  destelloEl.classList.add('activo');
}

/* ---------- lectura de los dedos ---------- */

let gesto = null;   /* { x0, y0, arrastrando, infoInicial } */
let ultimoPtr = { clientX: 0, clientY: 0 };

/* el pellizco: dos punteros a la vez. `punteros` vive independiente
   de `gesto` porque son dos lenguajes de gesto distintos que pueden
   estar en el aire al mismo tiempo (un dedo bajó primero, solo, y
   todavía no se convierte en arrastre cuando baja el segundo). */
const punteros = new Map();       /* pointerId -> {x, y} */
let pellizco = null;              /* { ids:[id,id], x0, y0 } */

function medioDePellizco() {
  if (!pellizco) return null;
  const a = punteros.get(pellizco.ids[0]), b = punteros.get(pellizco.ids[1]);
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function actualizarRayo(e) {
  ultimoPtr = { clientX: e.clientX, clientY: e.clientY };
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}

/* Three no descarta lo invisible al raycastear, y solo mirar el
   `visible` de la malla no basta: un nivel puede esconder un grupo
   entero (las habas dentro de la vaina cerrada) dejando sus mallas
   visibles. Sin esta cadena, lo escondido intercepta el dedo y el
   jugador toca cosas que todavía no existen para él. */
function seVe(obj) {
  while (obj && obj !== scene) {
    if (obj.visible === false) return false;
    obj = obj.parent;
  }
  return true;
}

function raizMarcada(obj) {
  while (obj && obj !== scene) {
    if (obj.userData && obj.userData.tipo) return obj;
    obj = obj.parent;
  }
  return null;
}

function leerInfo(e) {
  const objetivos = (nivel && nivel.objetivos) ? nivel.objetivos() : [];
  const hits = objetivos.length ? ray.intersectObjects(objetivos, true) : [];
  const hit = hits.find(h => !h.object.userData.ignorar && seVe(h.object)) || null;
  return {
    objeto: hit ? hit.object : null,
    raiz: hit ? raizMarcada(hit.object) : null,
    punto: hit ? hit.point.clone() : null,
    distancia: hit ? hit.distance : Infinity,
    ndc: ndc.clone(),
    cliente: { x: e.clientX, y: e.clientY },
    dx: gesto ? e.clientX - gesto.x0 : 0,
    dy: gesto ? e.clientY - gesto.y0 : 0,
    arrastre: !!(gesto && gesto.arrastrando),
    pellizco: false,
  };
}

/* la misma forma de `info`, pero para el punto medio de dos dedos.
   Llama primero a `actualizarRayo({clientX, clientY})` con ese medio:
   el rayo (y por tanto `raiz`/`punto`) queda centrado ahí. */
function leerInfoPellizco(midX, midY) {
  const objetivos = (nivel && nivel.objetivos) ? nivel.objetivos() : [];
  const hits = objetivos.length ? ray.intersectObjects(objetivos, true) : [];
  const hit = hits.find(h => !h.object.userData.ignorar && seVe(h.object)) || null;
  return {
    objeto: hit ? hit.object : null,
    raiz: hit ? raizMarcada(hit.object) : null,
    punto: hit ? hit.point.clone() : null,
    distancia: hit ? hit.distance : Infinity,
    ndc: ndc.clone(),
    cliente: { x: midX, y: midY },
    dx: pellizco ? midX - pellizco.x0 : 0,
    dy: pellizco ? midY - pellizco.y0 : 0,
    arrastre: true,
    pellizco: true,
  };
}

/* dónde cruza el rayo un plano horizontal: para llevar cosas "en la mano" */
const planoAux = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const puntoAux = new THREE.Vector3();
export function puntoEnPlano(y) {
  planoAux.constant = -y;
  return ray.ray.intersectPlane(planoAux, puntoAux) ? puntoAux.clone() : null;
}

/* raycast a voluntad del nivel, con el rayo del último evento.
   Devuelve solo lo que el jugador realmente puede ver y tocar. */
export function raycast(objetos, recursivo = true) {
  if (!objetos || !objetos.length) return [];
  return ray.intersectObjects(objetos, recursivo)
    .filter(h => !h.object.userData.ignorar && seVe(h.object));
}

/* dos dedos a la vez: se acaba cualquier gesto de uno solo a medias
   (nunca dragueó, así que no hay nada que cerrarle) y arranca el
   pellizco centrado en el punto medio de los dos. */
function iniciarPellizco() {
  gesto = null;
  const ids = [...punteros.keys()];
  const a = punteros.get(ids[0]), b = punteros.get(ids[1]);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  pellizco = { ids, x0: mx, y0: my };
  actualizarRayo({ clientX: mx, clientY: my });
  const info = leerInfoPellizco(mx, my);
  if (nivel.alPellizcarInicio) nivel.alPellizcarInicio(info);
}

function onDown(e) {
  if (!nivel) return;
  e.preventDefault();
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) {}
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });

  /* el pellizco solo arranca si el primer dedo TODAVÍA no se convirtió
     en arrastre: dos dedos que llegan juntos, como un pellizco de
     verdad. Si ya venías arrastrando algo (a mitad de un corte, de una
     cascada), un segundo dedo — palma, descuido — no te lo interrumpe. */
  if (punteros.size === 2 && !pellizco && !(gesto && gesto.arrastrando)) { iniciarPellizco(); return; }
  if (punteros.size >= 2) return;   /* tercer dedo, o segundo con algo ya en curso: no hace nada */

  actualizarRayo(e);
  gesto = { x0: e.clientX, y0: e.clientY, arrastrando: false, info: null };
  gesto.info = leerInfo(e);
  if (nivel.alPresionar) nivel.alPresionar(gesto.info);
}
function onMove(e) {
  if (!nivel) return;
  if (punteros.has(e.pointerId)) punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pellizco) {
    if (!pellizco.ids.includes(e.pointerId)) return;
    e.preventDefault();
    const medio = medioDePellizco();
    if (!medio) return;
    actualizarRayo({ clientX: medio.x, clientY: medio.y });
    const info = leerInfoPellizco(medio.x, medio.y);
    if (nivel.alPellizcarMover) nivel.alPellizcarMover(info);
    return;   /* con el pellizco activo, el gesto de un dedo no corre */
  }

  if (!gesto) return;
  e.preventDefault();
  actualizarRayo(e);
  const info = leerInfo(e);
  if (!gesto.arrastrando && Math.hypot(info.dx, info.dy) > UMBRAL_ARRASTRE) {
    gesto.arrastrando = true;
    info.arrastre = true;
    if (nivel.alArrastrarInicio) nivel.alArrastrarInicio(gesto.info);
  }
  if (gesto.arrastrando && nivel.alArrastrar) nivel.alArrastrar(info);
  else if (nivel.alMover) nivel.alMover(info);
}
function onUp(e) {
  const id = e ? e.pointerId : null;
  if (id !== null) punteros.delete(id);

  if (pellizco && id !== null && pellizco.ids.includes(id)) {
    const otroId = pellizco.ids.find(x => x !== id);
    const otro = punteros.get(otroId);
    const mx = otro ? otro.x : pellizco.x0, my = otro ? otro.y : pellizco.y0;
    pellizco = null;
    if (!nivel) return;
    actualizarRayo({ clientX: mx, clientY: my });
    const info = leerInfoPellizco(mx, my);
    if (nivel.alPellizcarFin) nivel.alPellizcarFin(info);
    return;
  }

  if (!gesto || !nivel) { gesto = null; return; }
  actualizarRayo(e || ultimoPtr);
  const info = leerInfo(e || ultimoPtr);
  const arrastraba = gesto.arrastrando;
  const inicial = gesto.info;
  gesto = null;
  if (arrastraba) { if (nivel.alArrastrarFin) nivel.alArrastrarFin(info); }
  else { if (nivel.alTocar) nivel.alTocar(inicial); }
}

/* ---------- API pública ---------- */

/* ---------- tirar lo que ya no se usa ----------
   Quitar una malla de la escena NO libera nada: la geometría y el
   material siguen ocupando memoria de video hasta que alguien los
   tira a mano. Como cada nivel arma sus mallas nuevas, sin esto la
   cuenta sube cada vez que se cambia de ingrediente y nunca baja —
   se nota en un teléfono a los pocos niveles.

   Dos cosas NO se tiran:
     · lo marcado `userData.compartida` — las formas del almacén de
       organico.js y las plantillas .glb, que son de todos y viven
       más que la partida;
     · las texturas — las tres que hay (la sombra, la chispa, el
       azulejo) se hacen una vez y se reparten. */
function tirar(obj) {
  obj.traverse(o => {
    const g = o.geometry;
    if (g && !(g.userData && g.userData.compartida)) g.dispose();
    const m = o.material;
    if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach(x => {
      if (x && !(x.userData && x.userData.compartida)) x.dispose();
    });
  });
}

export const Motor = {
  init(cont, capaDestello) {
    contenedor = cont;
    destelloEl = capaDestello || null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    /* El mapeo de tonos es la mitad del "render de arcilla". Sin él
       (NoToneMapping, el de fábrica) los claros se recortan de golpe
       en blanco puro y los colores saturados se van a neón: eso es
       lo que hace que un modelo se vea de plástico por más mate que
       sea el material. ACES comprime los altos con una curva suave,
       así el grano iluminado se apaga en un amarillo cremoso en vez
       de reventarse, y el conjunto se lee como plastilina bien
       fotografiada.

       La exposición se calibró a ojo comparando cuatro combinaciones
       de exposición y luces sobre la misma escena: por encima de ~1.1
       los colores se lavan (el azulejo pierde el azul y la madera se
       vuelve beige) y por debajo de ~0.9 el fondo se apaga. */
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.domElement.style.touchAction = 'none';
    cont.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(44, 1, 0.1, 40);
    camera.position.set(...CAM_POR_DEFECTO.pos);
    camMira.set(...CAM_POR_DEFECTO.mira);
    camera.lookAt(camMira);
    camBase.copy(camera.position);
    clock = new THREE.Clock();

    armarCocina();
    raiz = new THREE.Group();
    scene.add(raiz);

    /* Se buscan los .glb de modelos/glb/ mientras el jugador todavía
       está en la portada: para cuando arranque un nivel ya están. Si
       no hay ninguno (el caso normal), esto es un solo 404 y el juego
       usa sus modelos de código. `jugar()` espera esta promesa antes
       de montar el primer nivel, así nunca se arma medio a medias. */
    modelosListos = cargarGLB(THREE, GLTFLoader, './modelos/glb/')
      .then(n => { if (n) console.info('[fanesca] modelos .glb cargados:', n); })
      .catch(() => {});

    /* el FOV horizontal se mantiene: una pantalla más alta muestra
       más cocina, nunca menos ancho de mesón (igual que el juego grande) */
    const HFOV = 47;
    const ajustar = () => {
      const w = cont.clientWidth, h = cont.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(HFOV / 2)) / camera.aspect));
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(ajustar).observe(cont);
    ajustar();

    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    return true;
  },

  /* Cada ingrediente se mira distinto. El zapallo se corta sobre el
     mesón y pide una cámara de mesa; el choclo se sostiene en la mano
     y pide una cámara de frente, vertical, como el teléfono. Por eso
     el encuadre es del nivel, no del motor. */
  encuadre(pos, mira) {
    if (!camera) return;
    camera.position.set(...(pos || CAM_POR_DEFECTO.pos));
    camMira.set(...(mira || CAM_POR_DEFECTO.mira));
    camera.lookAt(camMira);
    camBase.copy(camera.position);
  },

  /* monta un nivel: limpia lo anterior y le entrega el contexto */
  cargar(mod, api) {
    this.descargar();
    this.encuadre(mod.camara && mod.camara.pos, mod.camara && mod.camara.mira);
    nivel = mod;
    const ctx = {
      THREE, raiz, api,
      MESA_Y, BATEA: BATEA.clone(), COMPOSTA: COMPOSTA.clone(),
      escena: scene, camara: camera,
    };
    llenarRecipiente('batea', 0);
    llenarRecipiente('composta', 0);
    nivel.construir(ctx);
    return nivel;
  },

  /* El orden importa: PRIMERO se barre y se tira lo que hay colgado,
     DESPUÉS se avisa al nivel. Al revés, un nivel que en su destruir()
     descuelga algo suyo (la plaga descuelga su grupo de bichos) lo
     saca de la escena antes de que el motor pase a tirarlo, y esas
     geometrías se quedan en la memoria de video sin dueño ni forma de
     alcanzarlas. Como todos los destruir() de aquí solo sueltan
     referencias, barrer antes no le quita nada a nadie. */
  descargar() {
    gesto = null;
    pellizco = null;
    punteros.clear();
    tweens = [];
    vuelos.forEach(v => { scene.remove(v.obj); tirar(v.obj); });
    vuelos = [];
    particulas.forEach(p => { scene.remove(p); tirar(p); });
    particulas = [];
    if (raiz) {
      while (raiz.children.length) {
        const o = raiz.children[0];
        raiz.remove(o);
        tirar(o);
      }
    }
    /* los vuelos reparentan al mundo: barre lo que quedó suelto */
    scene.children.slice().forEach(o => {
      if (o.userData && o.userData.suelto) { scene.remove(o); tirar(o); }
    });
    if (nivel && nivel.destruir) { try { nivel.destruir(); } catch (e) {} }
    nivel = null;
  },

  /* ¿qué hay bajo este punto de la pantalla? Devuelve el userData de
     lo que marcó el nivel. Sirve para pistas dirigidas y para poder
     probar los niveles sin adivinar coordenadas a ojo. */
  sondear(clienteX, clienteY) {
    if (!renderer || !nivel || !nivel.objetivos) return null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clienteX - r.left) / r.width) * 2 - 1, -((clienteY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const objetivos = nivel.objetivos() || [];
    const hits = objetivos.length ? ray.intersectObjects(objetivos, true) : [];
    const h = hits.find(x => !x.object.userData.ignorar && seVe(x.object));
    if (!h) return null;
    let o = h.object;
    while (o && !(o.userData && o.userData.tipo)) o = o.parent;
    return o ? Object.assign({}, o.userData) : null;
  },

  /* mundo → pantalla, para colgar pistas DOM sobre la escena */
  proyectar(v3) {
    const v = v3.clone().project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  },

  setActive(on) {
    activo = on;
    if (on && raf === null && renderer) { clock.getDelta(); bucle(); }
  },
  get reloj() { return clock ? clock.elapsedTime : 0; },
  get escena() { return scene; },
  get camara() { return camera; },
  get lienzo() { return renderer ? renderer.domElement : null; },
  /* el pintor, para calibrar luz y exposición desde la consola sin
     recargar: `Fanesca.Motor.pintor.toneMappingExposure = 0.9` */
  get pintor() { return renderer; },
  tween, chispas, volarA, sacudir, destello, raycast, puntoEnPlano,
  llenarRecipiente, sombraBlob, ojitos,
  /* el catálogo de modelos, para que un nivel pida sus piezas sin
     saber si vienen de código o de un .glb hecho en Blender */
  pieza: (id, opts) => pieza(id, THREE, opts),
  parte,
  /* la espera de los .glb, para que nadie monte un nivel a medias */
  modelosListos: () => modelosListos,
  MESA_Y, BATEA, COMPOSTA, FRENTE_TABLA,
};

function bucle() {
  if (!activo) { raf = null; return; }
  raf = requestAnimationFrame(bucle);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  pasoTweens();
  pasoVuelos();

  vapores.forEach(p => {
    const k = ((t * 0.3) + p.userData.fase) % 1;
    p.position.y = MESA_Y + 0.68 + k * 0.8;
    p.position.x = -1.55 + Math.sin(k * 6 + p.userData.fase * 9) * 0.09;
    p.material.opacity = k < 0.15 ? k / 0.15 * 0.6 : (1 - k) * 0.7;
    p.scale.setScalar(0.3 + k * 0.45);
  });

  particulas = particulas.filter(s => {
    const edad = t - s.userData.nace;
    if (edad > s.userData.vida) { scene.remove(s); s.material.dispose(); return false; }
    s.userData.vel.y -= 4.2 * dt;
    s.position.addScaledVector(s.userData.vel, dt);
    s.material.opacity = 1 - edad / s.userData.vida;
    return true;
  });

  if (sacudida.fuerza > 0) {
    sacudida.t += dt;
    const k = Math.max(0, 1 - sacudida.t / 0.45);
    if (k <= 0) { sacudida.fuerza = 0; camera.position.copy(camBase); }
    else {
      camera.position.set(
        camBase.x + Math.sin(sacudida.t * 62) * 0.09 * k * sacudida.fuerza,
        camBase.y + Math.sin(sacudida.t * 51) * 0.06 * k * sacudida.fuerza,
        camBase.z
      );
    }
    camera.lookAt(camMira);
  }

  if (nivel && nivel.actualizar) { try { nivel.actualizar(dt, t); } catch (e) { console.error(e); } }

  renderer.render(scene, camera);
}

export default Motor;
