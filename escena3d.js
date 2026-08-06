/* ============================================================
   PAMBAMESA — escena3d.js
   El mesón en 3D (Three.js, cámara fija estilo diorama de
   caricatura), ahora con TODO el juego de manos dentro de la
   escena: un cajón abierto con casillas abajo (como el juego de
   consola de cocina), la tabla de picar al centro y un basurero.

   La interacción es de arrastre puro, sin botones:
   - arrastra un ingrediente o utensilio del cajón a la tabla
   - junta dos cosas (suelta una encima de la otra) → combinan
   - si la pareja no funciona, queda una "mezcla rara" humeante
     que debes botar al basurero, como en MasterChef
   - arrastra algo de vuelta al cajón para guardarlo

   app.js habla con esta capa a través de window.Escena3D:
     init(container)          → true si hay WebGL
     bind(callbacks)          → alColocar / alJuntar / alQuitar /
                                alBotarMezcla (la lógica vive en app.js)
     setSlots([a,b])          → sincroniza lo que hay en la tabla
     setDespensa(items)       → sincroniza el cajón [{id,n,tool}]
     combinar(cb)             → fusión con estrellitas, cb al final
     mezclaRara()             → la pareja fallida se vuelve un engrudo
     setActive(bool)          → pausa el render fuera de la Cocina

   MODELOS: cada id intenta cargar models/<id>.glb (p. ej. hecho
   con Meshy); si no existe usa el icono SVG del juego como sprite.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ---------- geografía de la escena ---------- */
const BOARD_Y = 1.06;                       /* cara superior de la tabla */
const SLOT_POS = [{ x: -0.58, z: 0.15 }, { x: 0.58, z: 0.15 }];
const ITEM_SIZE = 0.78;
const CAJON = {                             /* el cajón abierto de abajo (corrido a la
                                               izquierda para dejarle sitio al basurero) */
  cols: [-1.5, -0.45, 0.6], rows: [1.62, 2.28],
  centroX: -0.45, ancho: 3.14,
  floorY: 0.24, zMin: 1.18,
};
const PER_PAGE = 6;
const TACHO = { x: 1.6, z: 2.1, r: 0.7 };     /* el basurero */
const DRAG_Y = 1.5;                            /* altura "en la mano" */

let renderer, scene, camera, clock, raf = null, active = false;
let slotRoots = [null, null];
let slotMarkers = [];
let steamPuffs = [];
let tweens = [];
let particles = [];
let cbs = {};                    /* callbacks de app.js */
let despensa = [];               /* [{id,n,tool}] */
let pagina = 0;
let cajonGroup = null;           /* casillas + items del cajón */
let cajonItems = [];             /* meshes arrastrables del cajón */
let tablaMesh = null;            /* para raycast de "¿solté sobre la tabla?" */
let tachoGroup = null;           /* para raycast de "¿solté en el basurero?" */
let mess = null;                 /* la mezcla rara pendiente de botar */
let flechas = null;              /* botones DOM de paginación */
const modelCache = {};
const gltfLoader = new GLTFLoader();

/* ---------- utilidades ---------- */

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function tween(obj, prop, to, dur, ease = easeOut, onDone = null) {
  tweens.push({ obj, prop, from: obj[prop].clone ? obj[prop].clone() : obj[prop], to, t0: clock.elapsedTime, dur, ease, onDone });
}
function stepTweens() {
  const now = clock.elapsedTime;
  const done = [];
  tweens = tweens.filter(tw => {
    const t = Math.min(1, (now - tw.t0) / tw.dur);
    const k = tw.ease(t);
    const v = tw.obj[tw.prop];
    if (v && v.lerpVectors) v.lerpVectors(tw.from, tw.to, k);
    else tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * k;
    if (t >= 1) { done.push(tw); return false; }
    return true;
  });
  /* los onDone corren DESPUÉS de reasignar `tweens`: un tween que
     encadena otro dentro de su onDone debe caer en el array nuevo */
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
/* la paleta del mesón NO se escribe aquí: se lee de los tokens de
   design-system.css, para que cambiar el sistema cambie también la
   escena 3D y nunca se desincronicen */
let _rootStyle = null;
function token(name, fallback) {
  if (!_rootStyle) _rootStyle = getComputedStyle(document.documentElement);
  return (_rootStyle.getPropertyValue(name) || '').trim() || fallback;
}
const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
const matT = (name, fallback, opts = {}) => mat(token(name, fallback), opts);

/* ---------- iconos SVG → sprite (mientras no haya .glb) ---------- */

let defsInner = null;
function svgConDefs(svg) {
  if (defsInner === null) {
    const m = (typeof ICON_DEFS === 'string' ? ICON_DEFS : '').match(/<defs>([\s\S]*)<\/defs>/);
    defsInner = m ? `<defs>${m[1]}</defs>` : '';
  }
  return svg.replace(/<svg([^>]*)>/, `<svg$1 width="256" height="256">${defsInner}`);
}
function spriteDeIcono(id, cb) {
  const svg = svgConDefs(iconOf(id));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    c.getContext('2d').drawImage(img, 0, 0, 256, 256);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true }));
    sp.scale.setScalar(ITEM_SIZE);
    sp.position.y = ITEM_SIZE * 0.52;
    const g = new THREE.Group();
    g.add(sp);
    cb(g);
  };
  img.onerror = () => cb(new THREE.Group());
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function normalizarGLB(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const s = ITEM_SIZE / Math.max(size.x, size.y, size.z, 0.0001);
  root.scale.setScalar(s);
  box.setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  const g = new THREE.Group();
  g.add(root);
  return g;
}

function cargarItem(id, cb) {
  const hit = modelCache[id];
  if (hit) { cb(hit.obj.clone(true)); return; }
  gltfLoader.load(`models/${id}.glb`,
    (gltf) => {
      const proto = normalizarGLB(gltf.scene);
      modelCache[id] = { kind: 'glb', obj: proto };
      cb(proto.clone(true));
    },
    undefined,
    () => spriteDeIcono(id, (proto) => {
      modelCache[id] = { kind: 'sprite', obj: proto };
      cb(proto.clone(true));
    })
  );
}

/* ---------- texturas dibujadas ---------- */

function texturaAzulejos() {
  return canvasTexture((ctx, S) => {
    const T = S / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      /* loza blanca con flor de talavera pintada */
      ctx.fillStyle = '#f7fafb';
      ctx.fillRect(x * T, y * T, T, T);
      const cx = x * T + T / 2, cy = y * T + T / 2;
      ctx.fillStyle = token('--jade-400', '#12a9a0');
      [[0, -T * .24], [0, T * .24], [-T * .24, 0], [T * .24, 0]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(cx + dx, cy + dy, T * .12, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = token('--talavera-500', '#1b5faa');
      ctx.beginPath(); ctx.arc(cx, cy, T * .16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = token('--talavera-300', '#5f97d8');
      [[0, 0], [T, 0], [0, T], [T, T]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(x * T + dx, y * T + dy, T * .17, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = '#dfe6e8';
      ctx.lineWidth = 4;
      ctx.strokeRect(x * T + 2, y * T + 2, T - 4, T - 4);
    }
  });
}
function texturaMadera(base, veta) {
  return canvasTexture((ctx, S) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = veta; ctx.lineWidth = 3; ctx.globalAlpha = .5;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const y = (i + .5) * S / 9;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(S * .3, y - 8, S * .6, y + 8, S, y);
      ctx.stroke();
    }
  });
}
function texturaMarcaPuesto() {
  return canvasTexture((ctx, S) => {
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 7;
    ctx.setLineDash([16, 13]);
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .40, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(S / 2 - S * .11, S / 2); ctx.lineTo(S / 2 + S * .11, S / 2);
    ctx.moveTo(S / 2, S / 2 - S * .11); ctx.lineTo(S / 2, S / 2 + S * .11);
    ctx.stroke();
  }, 128);
}
const badgeCache = {};
function badgeSprite(n, tool) {
  const key = (tool ? 't' : 'n') + n;
  if (!badgeCache[key]) {
    badgeCache[key] = canvasTexture((ctx, S) => {
      ctx.fillStyle = tool ? token('--metal-600', '#6c7683') : token('--chile-500', '#ce2029');
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${S * .52}px 'Baloo 2', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(n), S / 2, S / 2 + 3);
    }, 64);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeCache[key], transparent: true, depthTest: false }));
  s.scale.setScalar(0.22);
  s.position.set(0.24, 0.58, 0.05);
  return s;
}

let blobTex = null;
function sombraBlob(size = 0.8) {
  if (!blobTex) blobTex = canvasTexture((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(60,30,10,.4)');
    g.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.015;
  return m;
}

let starTex = null;
function estrellitas(x, y, z, cuantas = 14) {
  if (!starTex) starTex = canvasTexture((ctx, S) => {
    ctx.fillStyle = token('--maiz-300', '#ffc93c');
    ctx.strokeStyle = token('--maiz-600', '#c07610'); ctx.lineWidth = 6;
    ctx.translate(S / 2, S / 2); ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? S * .18 : S * .42;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }, 64);
  for (let i = 0; i < cuantas; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true }));
    s.position.set(x, y, z);
    s.scale.setScalar(0.16 + Math.random() * 0.14);
    const a = Math.random() * Math.PI * 2;
    s.userData.vel = new THREE.Vector3(Math.cos(a) * (0.8 + Math.random()), 1.6 + Math.random() * 1.4, Math.sin(a) * 0.5);
    s.userData.born = clock.elapsedTime;
    scene.add(s);
    particles.push(s);
  }
}

/* ---------- construcción de la cocina ---------- */

function construirCocina() {
  /* pared de azulejos (alta: en pantallas alargadas se ve mucha pared) */
  const tiles = texturaAzulejos();
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(4, 3.4);
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 8), new THREE.MeshLambertMaterial({ map: tiles }));
  pared.position.set(0, 3.2, -1.35);
  scene.add(pared);

  /* piso ajedrezado cálido, para cuando la cámara ve bajo el mesón */
  const pisoTex = canvasTexture((ctx, S) => {
    const T = S / 2;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      ctx.fillStyle = (x + y) % 2 ? token('--chile-500', '#ce2029') : '#f2ece2';
      ctx.fillRect(x * T, y * T, T, T);
    }
  }, 128);
  pisoTex.wrapS = pisoTex.wrapT = THREE.RepeatWrapping;
  pisoTex.repeat.set(7, 5);
  const pisoCocina = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshLambertMaterial({ map: pisoTex }));
  pisoCocina.rotation.x = -Math.PI / 2;
  pisoCocina.position.set(0, -0.02, 2.5);
  scene.add(pisoCocina);

  /* frente del gabinete bajo la mesada: la boca oscura de donde salió
     el cajón abierto, y las gavetas vecinas con sus tiradores */
  const gabinete = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.1, 0.08), matT('--rosa-500', '#e01b6a'));
  gabinete.position.set(0, 0.28, 1.06);
  scene.add(gabinete);
  const boca = new THREE.Mesh(new THREE.BoxGeometry(3.34, 0.8, 0.06), matT('--rosa-700', '#7d0a3b'));
  boca.position.set(CAJON.centroX, 0.28, 1.11);
  scene.add(boca);
  [[-2.96, 1.6], [2.6, 2.3]].forEach(([x, w]) => {
    const cara = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, 0.06), matT('--rosa-400', '#f53d8a'));
    cara.position.set(x, 0.28, 1.11);
    const tir = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.42, 4, 10), matT('--maiz-400', '#f5a623'));
    tir.rotation.z = Math.PI / 2;
    tir.position.set(x, 0.5, 1.17);
    scene.add(cara, tir);
  });

  /* repisa con frascos */
  const repisa = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 0.42), matT('--madera-500', '#93491c'));
  repisa.position.set(-1.9, 2.72, -1.1);
  scene.add(repisa);
  const frascoM = mat('#f4e6c8');
  [[-2.7, '#e2647e'], [-2.15, '#7bc86c'], [-1.55, '#f2b31f'], [-.95, '#93b8e4']].forEach(([x, tapa]) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.11, .12, .3, 14), frascoM);
    f.position.set(x, 2.92, -1.1);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .06, 14), mat(tapa));
    t.position.set(x, 3.09, -1.1);
    scene.add(f, t);
  });

  /* la mesada */
  const woodTop = texturaMadera(token('--madera-300', '#d07c3f'), token('--madera-500', '#93491c'));
  const meson = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.22, 2.4), new THREE.MeshLambertMaterial({ map: woodTop }));
  meson.position.set(0, 0.85, -0.1);
  scene.add(meson);

  /* la tabla de picar */
  const boardTex = texturaMadera(token('--madera-200', '#e8a469'), token('--madera-400', '#b4632c'));
  const tabla = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.5), new THREE.MeshLambertMaterial({ map: boardTex }));
  const borde = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.06, 1.56), matT('--madera-400', '#b4632c'));
  borde.position.y = -0.03;
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 18), new THREE.MeshLambertMaterial({ map: boardTex }));
  mango.position.set(1.42, 0, 0);
  tabla.add(cuerpo, borde, mango);
  tabla.position.set(0, BOARD_Y - 0.05, 0.15);
  scene.add(tabla);
  tablaMesh = cuerpo;

  /* marcas "+" de los dos puestos */
  const marcaTex = texturaMarcaPuesto();
  SLOT_POS.forEach(p => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.72),
      new THREE.MeshBasicMaterial({ map: marcaTex, transparent: true, opacity: 0.85, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, BOARD_Y + 0.012, p.z);
    scene.add(m);
    slotMarkers.push(m);
  });

  /* estufa y olla humeante */
  const estufa = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.7), matT('--pizarra-500', '#2f2733'));
  estufa.position.set(2.5, 0.97, -0.3);
  const quemador = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), matT('--pizarra-700', '#1d1822'));
  quemador.position.set(2.5, 1.04, -0.3);
  scene.add(estufa, quemador);
  const olla = new THREE.Group();
  const cuerpoOlla = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.5, 22), matT('--chile-500', '#ce2029'));
  const tapa = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), mat('#f4f0e6'));
  tapa.position.y = 0.22; tapa.scale.y = 0.55;
  const perilla = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), matT('--maiz-400', '#f5a623'));
  perilla.position.y = 0.44;
  const asaM = mat('#f4f0e6');
  [-1, 1].forEach(s => {
    const asa = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 14, Math.PI), asaM);
    asa.position.set(0.42 * s, 0.1, 0);
    asa.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    olla.add(asa);
  });
  olla.add(cuerpoOlla, tapa, perilla);
  olla.position.set(2.5, 1.32, -0.3);
  scene.add(olla);

  const vaporTex = canvasTexture((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: vaporTex, transparent: true, opacity: 0 }));
    p.position.set(2.5, 1.75, -0.3);
    p.scale.setScalar(0.3);
    p.userData.phase = i / 3;
    scene.add(p);
    steamPuffs.push(p);
  }

  /* utilería izquierda */
  const botella = new THREE.Group();
  const bCuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.62, 16), mat('#eaf4f6'));
  const bCuello = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 12), mat('#eaf4f6'));
  bCuello.position.y = 0.42;
  const bTapa = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 12), mat('#5aa9e6'));
  bTapa.position.y = 0.56;
  botella.add(bCuerpo, bCuello, bTapa);
  botella.position.set(-2.35, 1.27, -0.6);
  scene.add(botella);
  const frutero = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), matT('--maiz-400', '#f5a623'));
  frutero.scale.y = 0.8;
  frutero.position.set(-2.95, 1.28, -0.35);
  scene.add(frutero);
  [[-3.1, 1.32, -0.43, '#ffb54d'], [-2.8, 1.32, -0.29, '#f28c28'], [-2.95, 1.44, -0.35, '#ffc94d']].forEach(([x, y, z, c]) => {
    const fr = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mat(c));
    fr.position.set(x, y, z);
    scene.add(fr);
  });

  /* ---- el cajón abierto de abajo, con sus casillas ---- */
  const cajon = new THREE.Group();
  const rosa = matT('--rosa-500', '#e01b6a'), rosaOscuro = matT('--rosa-600', '#b01254');
  const CX = CAJON.centroX, CW = CAJON.ancho;
  const piso = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.08, 1.56), rosaOscuro);
  piso.position.set(CX, CAJON.floorY - 0.04, 1.95);
  const paredIzq = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 1.56), rosa);
  paredIzq.position.set(CX - CW / 2, CAJON.floorY + 0.17, 1.95);
  const paredDer = paredIzq.clone(); paredDer.position.x = CX + CW / 2;
  const paredFondo = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.46, 0.1), rosa);
  paredFondo.position.set(CX, CAJON.floorY + 0.17, 1.2);
  const paredFrente = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.58, 0.12), rosa);
  paredFrente.position.set(CX, CAJON.floorY + 0.2, 2.7);
  const tirador = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.7, 4, 10), matT('--maiz-400', '#f5a623'));
  tirador.rotation.z = Math.PI / 2;
  tirador.position.set(CX, CAJON.floorY + 0.42, 2.78);
  cajon.add(piso, paredIzq, paredDer, paredFondo, paredFrente, tirador);
  /* divisiones de las casillas */
  [(CAJON.cols[0] + CAJON.cols[1]) / 2, (CAJON.cols[1] + CAJON.cols[2]) / 2].forEach(x => {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 1.44), rosa);
    d.position.set(x, CAJON.floorY + 0.11, 1.95);
    cajon.add(d);
  });
  const divRow = new THREE.Mesh(new THREE.BoxGeometry(CW - 0.1, 0.3, 0.05), rosa);
  divRow.position.set(CX, CAJON.floorY + 0.11, 1.95);
  cajon.add(divRow);
  scene.add(cajon);

  cajonGroup = new THREE.Group();   /* aquí viven los items del cajón */
  scene.add(cajonGroup);

  /* ---- el basurero ---- */
  const tacho = new THREE.Group();
  const cuerpoT = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.33, 0.72, 18), matT('--metal-400', '#9aa3ae'));
  const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 20), matT('--metal-600', '#6c7683'));
  rimT.rotation.x = Math.PI / 2;
  rimT.position.y = 0.36;
  const bolsa = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.06, 18), matT('--pizarra-500', '#2f2733'));
  bolsa.position.y = 0.33;
  tacho.add(cuerpoT, rimT, bolsa);
  tacho.position.set(TACHO.x, CAJON.floorY + 0.32, TACHO.z);
  scene.add(tacho);
  tachoGroup = tacho;

  /* luces */
  scene.add(new THREE.HemisphereLight('#ffffff', token('--peltre-300', '#e3dfd6'), 1.35));
  const sol = new THREE.DirectionalLight('#fff7ec', 1.35);
  sol.position.set(-2.5, 5, 3.5);
  scene.add(sol);
}

/* ---------- el cajón: sincronizar casillas ---------- */

function slotDelCajon(i) {
  return { x: CAJON.cols[i % 3], z: CAJON.rows[Math.floor(i / 3)] };
}
function totalPaginas() { return Math.max(1, Math.ceil(despensa.length / PER_PAGE)); }

function rebuildCajon() {
  cajonItems = [];
  while (cajonGroup.children.length) cajonGroup.remove(cajonGroup.children[0]);
  pagina = Math.min(pagina, totalPaginas() - 1);
  const visibles = despensa.slice(pagina * PER_PAGE, pagina * PER_PAGE + PER_PAGE);
  visibles.forEach((item, i) => {
    const token = new THREE.Group();
    const pos = slotDelCajon(i);
    token.position.set(pos.x, CAJON.floorY, pos.z);
    token.userData = { tipo: 'cajon', id: item.id, n: item.n, tool: item.tool };
    token.add(badgeSprite(item.n, item.tool));
    cajonGroup.add(token);
    cajonItems.push(token);
    cargarItem(item.id, (obj) => {
      obj.scale.multiplyScalar(0.62);
      if (item.n <= 0) obj.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.opacity = 0.35; o.material.transparent = true; } });
      token.add(obj);
    });
  });
  if (flechas) {
    const muchas = totalPaginas() > 1;
    flechas.prev.classList.toggle('hidden', !muchas || pagina === 0);
    flechas.next.classList.toggle('hidden', !muchas || pagina >= totalPaginas() - 1);
  }
}

/* ---------- arrastre ---------- */

let dragging = null;   /* { root, id, from: 'cajon' | slotIdx, tool } */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_Y);
const planePoint = new THREE.Vector3();

let lastPtr = { clientX: 0, clientY: 0 };
function pointerNDC(e) {
  lastPtr = { clientX: e.clientX, clientY: e.clientY };
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function raizArrastrable(obj) {
  while (obj && obj !== scene) {
    if (obj.userData && (obj.userData.tipo === 'cajon' || obj.userData.tipo === 'mesa' || obj.userData.tipo === 'mess')) return obj;
    obj = obj.parent;
  }
  return null;
}

function onDown(e) {
  if (dragging) return;
  pointerNDC(e);
  const objetivos = mess ? [mess] : [...cajonItems, ...slotRoots.filter(Boolean)];
  const hits = ray.intersectObjects(objetivos, true);
  if (!hits.length) return;
  const root = raizArrastrable(hits[0].object);
  if (!root) return;
  const ud = root.userData;

  if (ud.tipo === 'cajon') {
    if (ud.n <= 0) { if (cbs.sinStock) cbs.sinStock(ud.id, ud.tool); return; }
    /* se levanta una copia; la casilla se queda con su badge */
    const clone = new THREE.Group();
    clone.userData = { tipo: 'drag', id: ud.id };
    cargarItem(ud.id, (obj) => clone.add(obj));   /* cacheado: llega síncrono */
    clone.position.set(root.position.x, DRAG_Y, root.position.z);
    scene.add(clone);
    dragging = { root: clone, id: ud.id, from: 'cajon', tool: ud.tool, origen: root.position.clone() };
  } else if (ud.tipo === 'mesa') {
    const idx = slotRoots.indexOf(root);
    dragging = { root, id: ud.id, from: idx, origen: root.position.clone() };
    tween(root, 'position', new THREE.Vector3(root.position.x, DRAG_Y, root.position.z), 0.12);
  } else if (ud.tipo === 'mess') {
    dragging = { root, id: 'mess', from: 'mess', origen: root.position.clone() };
    tween(root, 'position', new THREE.Vector3(root.position.x, DRAG_Y, root.position.z), 0.12);
  }
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) {}
  if (cbs.alAgarrar) cbs.alAgarrar();
}

function onMove(e) {
  if (!dragging) return;
  pointerNDC(e);
  if (ray.ray.intersectPlane(dragPlane, planePoint)) {
    dragging.root.position.set(
      THREE.MathUtils.clamp(planePoint.x, -3.2, 3.2),
      DRAG_Y,
      THREE.MathUtils.clamp(planePoint.z, -0.9, 2.75)
    );
  }
}

function enTacho(p) { return Math.hypot(p.x - TACHO.x, p.z - TACHO.z) < TACHO.r; }

/* ¿dónde soltó? — se decide con raycast desde el puntero, que es
   exactamente lo que el jugador ve (el plano de arrastre queda más
   alto que la tabla y produce paralaje si se compara en el mundo) */
function onUp() {
  if (!dragging) return;
  const d = dragging; dragging = null;
  pointerNDC(lastPtr);
  const p = d.root.position;

  const soltoEnTacho = ray.intersectObject(tachoGroup, true).length > 0 || enTacho(p);
  const hitsTabla = tablaMesh ? ray.intersectObject(tablaMesh, false) : [];
  const puntoTabla = hitsTabla.length ? hitsTabla[0].point : null;

  /* --- la mezcla rara solo tiene un destino digno: el basurero --- */
  if (d.from === 'mess') {
    if (soltoEnTacho) {
      tween(d.root, 'position', new THREE.Vector3(TACHO.x, CAJON.floorY + 0.75, TACHO.z), 0.22, easeOut, () => {
        tween(d.root, 'scale', new THREE.Vector3(0.01, 0.01, 0.01), 0.18, easeOut, () => {
          scene.remove(d.root); mess = null;
          slotMarkers.forEach(m => m.visible = true);
          if (cbs.alBotarMezcla) cbs.alBotarMezcla();
        });
      });
    } else {
      tween(d.root, 'position', new THREE.Vector3(0, BOARD_Y, 0.15), 0.25);
    }
    return;
  }

  /* --- al basurero: sale de la tabla (desde el cajón no se bota) --- */
  if (soltoEnTacho) {
    if (d.from === 'cajon') { cancelarDrag(d); return; }
    const idx = d.from;
    tween(d.root, 'position', new THREE.Vector3(TACHO.x, CAJON.floorY + 0.75, TACHO.z), 0.2, easeOut, () => {
      tween(d.root, 'scale', new THREE.Vector3(0.01, 0.01, 0.01), 0.16, easeOut, () => quitarDeMesa(idx));
    });
    return;
  }

  /* --- ¿lo soltó encima de otro item? → combinar --- */
  const otros = slotRoots.filter(it => it && it !== d.root);
  const hitItem = otros.length ? ray.intersectObjects(otros, true) : [];
  if (hitItem.length) {
    const target = raizArrastrable(hitItem[0].object);
    const targetIdx = slotRoots.indexOf(target);
    /* adoptar el arrastrado ANTES del callback, para que un
       setSlots() dentro de app.js no cree un mesh duplicado */
    let adoptado = null;
    if (d.from === 'cajon') {
      const free = targetIdx === 0 ? 1 : 0;
      if (slotRoots[free]) { cancelarDrag(d); return; }
      d.root.userData = { tipo: 'mesa', id: d.id };
      slotRoots[free] = d.root;
      adoptado = free;
    }
    const ok = cbs.alJuntar ? cbs.alJuntar(targetIdx, d.id, d.from) : false;
    if (!ok) {
      if (adoptado !== null) { slotRoots[adoptado] = null; d.root.userData = { tipo: 'drag', id: d.id }; }
      cancelarDrag(d);
    }
    return;   /* si ok, app.js decide: combinar() o mezclaRara() */
  }

  /* --- sobre la tabla: al puesto libre más cercano --- */
  if (puntoTabla) {
    const libre = SLOT_POS
      .map((sp, i) => ({ i, dist: Math.hypot(sp.x - puntoTabla.x, sp.z - puntoTabla.z) }))
      .filter(o => !slotRoots[o.i])
      .sort((a, b) => a.dist - b.dist)[0];
    if (!libre) { cancelarDrag(d); return; }
    if (d.from === 'cajon') {
      d.root.userData = { tipo: 'mesa', id: d.id };
      slotRoots[libre.i] = d.root;
      const ok = cbs.alColocar ? cbs.alColocar(d.id, libre.i) : false;
      if (!ok) { slotRoots[libre.i] = null; d.root.userData = { tipo: 'drag', id: d.id }; cancelarDrag(d); return; }
      d.root.add(sombraBlob());
      slotMarkers[libre.i].visible = false;
      tween(d.root, 'position', new THREE.Vector3(SLOT_POS[libre.i].x, BOARD_Y, SLOT_POS[libre.i].z), 0.22);
    } else {
      /* reacomodar un item de la tabla en otro puesto */
      const idx = d.from;
      if (libre.i !== idx && cbs.alMover) cbs.alMover(idx, libre.i);
      slotRoots[idx] = null;
      slotRoots[libre.i] = d.root;
      slotMarkers[idx].visible = true;
      slotMarkers[libre.i].visible = false;
      tween(d.root, 'position', new THREE.Vector3(SLOT_POS[libre.i].x, BOARD_Y, SLOT_POS[libre.i].z), 0.2);
    }
    return;
  }

  /* --- de vuelta al cajón (o a cualquier otro lado): sale de la tabla --- */
  if (d.from !== 'cajon' && p.z >= CAJON.zMin) {
    const idx = d.from;
    tween(d.root, 'scale', new THREE.Vector3(0.4, 0.4, 0.4), 0.18);
    tween(d.root, 'position', new THREE.Vector3(p.x, CAJON.floorY + 0.2, Math.max(p.z, CAJON.rows[0])), 0.2, easeOut, () => quitarDeMesa(idx));
    return;
  }
  cancelarDrag(d);
}

function cancelarDrag(d) {
  if (d.from === 'cajon') {
    tween(d.root, 'position', new THREE.Vector3(d.origen.x, CAJON.floorY + 0.1, d.origen.z), 0.22, easeOut, () => scene.remove(d.root));
  } else if (typeof d.from === 'number') {
    tween(d.root, 'position', new THREE.Vector3(SLOT_POS[d.from].x, BOARD_Y, SLOT_POS[d.from].z), 0.22);
  }
}
function quitarDeMesa(idx) {
  const it = slotRoots[idx];
  if (it) scene.remove(it);
  slotRoots[idx] = null;
  slotMarkers[idx].visible = true;
  if (cbs.alQuitar) cbs.alQuitar(idx);
}

/* ---------- API pública ---------- */

const Escena3D = {
  init(container) {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 8 / 7, 0.1, 30);
    camera.position.set(0, 3.55, 5.1);
    camera.lookAt(0, 0.72, 0.5);
    clock = new THREE.Clock();

    construirCocina();

    /* flechas DOM para pasar de página en el cajón */
    const mkFlecha = (cls, txt, delta) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cajon-flecha ' + cls + ' hidden';
      b.textContent = txt;
      b.addEventListener('click', () => { pagina += delta; rebuildCajon(); });
      container.appendChild(b);
      return b;
    };
    flechas = { prev: mkFlecha('prev', '‹', -1), next: mkFlecha('next', '›', 1) };

    /* el FOV horizontal se mantiene constante: una pantalla más alta
       muestra MÁS cocina (pared y piso), nunca menos ancho de mesada */
    const HFOV = 46;
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(HFOV / 2)) / camera.aspect));
      camera.updateProjectionMatrix();
      /* las flechas del cajón siguen a la fila de casillas */
      const aLocal = (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(camera);
        return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
      };
      const filaY = aLocal(0, CAJON.floorY + 0.2, 1.95).y;
      [flechas.prev, flechas.next].forEach(f => { f.style.top = filaY + 'px'; f.style.bottom = 'auto'; f.style.transform = 'translateY(-50%)'; });
    };
    new ResizeObserver(resize).observe(container);
    resize();

    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    return true;
  },

  bind(callbacks) { cbs = callbacks || {}; },

  /* sincroniza la tabla desde app.js (p. ej. al entrar a la pantalla) */
  setSlots(slots) {
    if (mess) return;   /* mientras haya engrudo, la tabla es suya */
    for (let i = 0; i < 2; i++) {
      const id = slots[i];
      const current = slotRoots[i];
      if (current && current.userData.id === id) continue;
      if (current) { scene.remove(current); slotRoots[i] = null; }
      slotMarkers[i].visible = !id;
      if (!id) continue;
      cargarItem(id, (obj) => {
        if (slotRoots[i] && slotRoots[i].userData.id === id) return;
        if (slotRoots[i]) scene.remove(slotRoots[i]);
        obj.userData = { tipo: 'mesa', id };
        obj.add(sombraBlob());
        obj.position.set(SLOT_POS[i].x, BOARD_Y + 0.9, SLOT_POS[i].z);
        scene.add(obj);
        slotRoots[i] = obj;
        slotMarkers[i].visible = false;
        tween(obj, 'position', new THREE.Vector3(SLOT_POS[i].x, BOARD_Y, SLOT_POS[i].z), 0.34);
      });
    }
  },

  setDespensa(items) {
    despensa = items || [];
    rebuildCajon();
  },

  combinar(cb) {
    const items = slotRoots.filter(Boolean);
    slotRoots = [null, null];
    items.forEach(it => tween(it, 'position', new THREE.Vector3(0, BOARD_Y + 0.25, 0.15), 0.28));
    setTimeout(() => {
      items.forEach(it => scene.remove(it));
      slotMarkers.forEach(m => m.visible = true);
      estrellitas(0, BOARD_Y + 0.3, 0.17);
      if (cb) cb();
    }, 300);
  },

  /* la pareja no combinó: nace el engrudo humeante */
  mezclaRara() {
    const items = slotRoots.filter(Boolean);
    slotRoots = [null, null];
    items.forEach(it => tween(it, 'position', new THREE.Vector3(0, BOARD_Y + 0.2, 0.15), 0.24));
    setTimeout(() => {
      items.forEach(it => scene.remove(it));
      const g = new THREE.Group();
      g.userData = { tipo: 'mess', id: 'mess' };
      cargarItem('mezcla_rara', (obj) => g.add(obj));
      g.add(sombraBlob(0.9));
      g.position.set(0, BOARD_Y, 0.15);
      scene.add(g);
      mess = g;
      slotMarkers.forEach(m => m.visible = false);
      /* humo gris */
      const smokeTex = canvasTexture((ctx, S) => {
        const gr = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
        gr.addColorStop(0, 'rgba(90,90,95,.7)');
        gr.addColorStop(1, 'rgba(90,90,95,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, S, S);
      }, 64);
      g.userData.humo = [];
      for (let i = 0; i < 2; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0 }));
        s.userData.phase = i / 2;
        g.add(s);
        g.userData.humo.push(s);
      }
    }, 260);
  },

  hayMezclaRara() { return !!mess; },

  /* mundo → pantalla (px), útil para pruebas y tutoriales */
  proyectar(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  },

  setActive(on) {
    active = on;
    if (on && raf === null && renderer) loop();
  },
};

function loop() {
  if (!active) { raf = null; return; }
  raf = requestAnimationFrame(loop);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  stepTweens();

  steamPuffs.forEach(p => {
    const k = ((t * 0.35) + p.userData.phase) % 1;
    p.position.y = 1.7 + k * 0.75;
    p.position.x = 2.5 + Math.sin(k * 6 + p.userData.phase * 9) * 0.07;
    p.material.opacity = k < 0.15 ? k / 0.15 * 0.7 : (1 - k) * 0.8;
    p.scale.setScalar(0.22 + k * 0.3);
  });

  slotRoots.forEach((it, i) => {
    if (it && (!dragging || dragging.root !== it)) it.rotation.y = Math.sin(t * 1.4 + i * 2) * 0.12;
  });

  if (mess) {
    mess.rotation.y = Math.sin(t * 2.2) * 0.08;
    (mess.userData.humo || []).forEach(s => {
      const k = ((t * 0.5) + s.userData.phase) % 1;
      s.position.set(Math.sin(k * 9) * 0.06, 0.55 + k * 0.55, 0);
      s.material.opacity = k < 0.2 ? k / 0.2 * 0.6 : (1 - k) * 0.7;
      s.scale.setScalar(0.24 + k * 0.26);
    });
  }

  particles = particles.filter(s => {
    const age = t - s.userData.born;
    if (age > 0.8) { scene.remove(s); return false; }
    s.userData.vel.y -= 4.5 * dt;
    s.position.addScaledVector(s.userData.vel, dt);
    s.material.opacity = 1 - age / 0.8;
    return true;
  });

  renderer.render(scene, camera);
}

window.Escena3D = Escena3D;
