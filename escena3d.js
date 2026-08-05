/* ============================================================
   PAMBAMESA — escena3d.js
   El mesón en 3D (Three.js, cámara fija estilo diorama de
   caricatura): pared de azulejos, mesada de madera, tabla de
   picar con dos puestos, estufa con olla humeante.

   La UI sigue siendo 2D (cartas, botones, recetario); esta capa
   solo dibuja lo que hay sobre la tabla. app.js habla con ella
   a través de window.Escena3D:

     init(container)        → true si hay WebGL (si no, app.js
                              se queda con el fogón 2D de siempre)
     setSlots([a, b])       → ids (o null) en cada puesto
     combinar(cb)           → animación de fusión, cb al terminar
     shake()                → sacudida cuando la mezcla falla
     onItemTap(cb)          → tocar un ingrediente lo devuelve
     setActive(bool)        → pausa el render fuera de la Cocina

   MODELOS: para cada id intenta cargar models/<id>.glb (p. ej.
   generado con Meshy). Si no existe, usa el icono SVG del juego
   como sprite emplatado — así el mesón funciona desde hoy y va
   mejorando a medida que sueltes .glb en la carpeta models/.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SLOT_X = [-0.62, 0.62];        /* puestos sobre la tabla */
const BOARD_Y = 1.06;                /* altura de la cara superior de la tabla */
const ITEM_SIZE = 0.78;              /* tamaño objetivo de cada ingrediente */

let renderer, scene, camera, clock, raf = null, active = false;
let slotRoots = [null, null];        /* Object3D del ingrediente en cada puesto */
let slotMarkers = [];                /* círculos "+" cuando el puesto está vacío */
let steamPuffs = [];
let tweens = [];
let particles = [];
let tapCb = null;
const modelCache = {};               /* id → { kind:'glb'|'sprite', obj } prototipo clonable */
const gltfLoader = new GLTFLoader();

/* ---------- pequeñas utilidades ---------- */

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function tween(obj, prop, to, dur, ease = easeOut, onDone = null) {
  tweens.push({ obj, prop, from: obj[prop].clone ? obj[prop].clone() : obj[prop], to, t0: clock.elapsedTime, dur, ease, onDone });
}
function stepTweens() {
  const now = clock.elapsedTime;
  tweens = tweens.filter(tw => {
    const t = Math.min(1, (now - tw.t0) / tw.dur);
    const k = tw.ease(t);
    const v = tw.obj[tw.prop];
    if (v && v.lerpVectors) v.lerpVectors(tw.from, tw.to, k);
    else tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * k;
    if (t >= 1) { if (tw.onDone) tw.onDone(); return false; }
    return true;
  });
}

function canvasTexture(draw, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

/* ---------- iconos SVG → sprite (mientras no haya .glb) ---------- */

/* los iconos usan gradientes definidos en ICON_DEFS (documento);
   para rasterizar un svg suelto hay que incrustarle esos defs */
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

/* normaliza un glb: tamaño ITEM_SIZE, apoyado sobre la tabla */
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
  if (hit) { cb(hit.obj.clone()); return; }
  gltfLoader.load(`models/${id}.glb`,
    (gltf) => {
      const proto = normalizarGLB(gltf.scene);
      modelCache[id] = { kind: 'glb', obj: proto };
      cb(proto.clone());
    },
    undefined,
    () => spriteDeIcono(id, (proto) => {   /* no hay glb: sprite del icono */
      modelCache[id] = { kind: 'sprite', obj: proto };
      cb(proto.clone(true));
    })
  );
}

/* ---------- construcción de la cocina ---------- */

function texturaAzulejos() {
  return canvasTexture((ctx, S) => {
    const T = S / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#8fd2dc' : '#9cdae4';
      ctx.fillRect(x * T, y * T, T, T);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(x * T + 4, y * T + 4, T - 8, T * 0.28);
      ctx.strokeStyle = '#6db4c0';
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

function construirCocina() {
  /* pared de azulejos */
  const tiles = texturaAzulejos();
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(4, 2);
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.6), new THREE.MeshLambertMaterial({ map: tiles }));
  pared.position.set(0, 2.6, -1.35);
  scene.add(pared);

  /* repisa con frascos, para vestir la pared */
  const repisa = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 0.42), mat('#b5793f'));
  repisa.position.set(-1.9, 2.62, -1.1);
  scene.add(repisa);
  const frascoM = mat('#f4e6c8');
  [[-2.7, '#e2647e'], [-2.15, '#7bc86c'], [-1.55, '#f2b31f'], [-.95, '#93b8e4']].forEach(([x, tapa]) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.11, .12, .3, 14), frascoM);
    f.position.set(x, 2.82, -1.1);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .06, 14), mat(tapa));
    t.position.set(x, 2.99, -1.1);
    scene.add(f, t);
  });

  /* la mesada de madera */
  const woodTop = texturaMadera('#d59a55', '#b97e3c');
  const meson = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.22, 2.6), new THREE.MeshLambertMaterial({ map: woodTop }));
  meson.position.set(0, 0.85, 0);
  scene.add(meson);

  /* frente de cajones rosados con tiradores, como el cajón del juego */
  const frente = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.5, 0.14), mat('#d94f72'));
  frente.position.set(0, 0.02, 1.24);
  scene.add(frente);
  [-2.4, 0, 2.4].forEach(x => {
    const marco = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.02, 0.05), mat('#c23e60'));
    marco.position.set(x, 0.0, 1.33);
    const tirador = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.5, 4, 10), mat('#f2b31f'));
    tirador.rotation.z = Math.PI / 2;
    tirador.position.set(x, 0.3, 1.4);
    scene.add(marco, tirador);
  });

  /* la tabla de picar, protagonista */
  const boardTex = texturaMadera('#ecc287', '#d3a15e');
  const tabla = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.5), new THREE.MeshLambertMaterial({ map: boardTex }));
  const borde = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.06, 1.56), mat('#c89357'));
  borde.position.y = -0.03;
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 18), new THREE.MeshLambertMaterial({ map: boardTex }));
  mango.position.set(1.42, 0, 0);
  tabla.add(cuerpo, borde, mango);
  tabla.position.set(0, BOARD_Y - 0.05, 0.14);
  scene.add(tabla);

  /* marcas "+" de los dos puestos */
  const marcaTex = texturaMarcaPuesto();
  SLOT_X.forEach(x => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.72),
      new THREE.MeshBasicMaterial({ map: marcaTex, transparent: true, opacity: 0.85, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, BOARD_Y + 0.012, 0.14);
    scene.add(m);
    slotMarkers.push(m);
  });

  /* la estufa a la derecha, con su olla humeante */
  const estufa = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.7), mat('#3c4350'));
  estufa.position.set(2.2, 0.97, -0.1);
  const quemador = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), mat('#20242c'));
  quemador.position.set(2.2, 1.04, -0.1);
  scene.add(estufa, quemador);
  const olla = new THREE.Group();
  const cuerpoOlla = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.5, 22), mat('#e63946'));
  const tapa = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), mat('#f4f0e6'));
  tapa.position.y = 0.22; tapa.scale.y = 0.55;
  const perilla = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat('#f2b31f'));
  perilla.position.y = 0.44;
  const asaM = mat('#f4f0e6');
  [-1, 1].forEach(s => {
    const asa = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 14, Math.PI), asaM);
    asa.position.set(0.42 * s, 0.1, 0);
    asa.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    olla.add(asa);
  });
  olla.add(cuerpoOlla, tapa, perilla);
  olla.position.set(2.2, 1.32, -0.1);
  scene.add(olla);

  /* vapor: tres nubecitas que suben en bucle */
  const vaporTex = canvasTexture((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: vaporTex, transparent: true, opacity: 0 }));
    p.position.set(2.2, 1.75, -0.1);
    p.scale.setScalar(0.3);
    p.userData.phase = i / 3;
    scene.add(p);
    steamPuffs.push(p);
  }

  /* utilería a la izquierda: botella y frutero */
  const botella = new THREE.Group();
  const bCuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.62, 16), mat('#eaf4f6'));
  const bCuello = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 12), mat('#eaf4f6'));
  bCuello.position.y = 0.42;
  const bTapa = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 12), mat('#5aa9e6'));
  bTapa.position.y = 0.56;
  botella.add(bCuerpo, bCuello, bTapa);
  botella.position.set(-2.15, 1.27, -0.5);
  scene.add(botella);
  const frutero = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#f4a23c'));
  frutero.scale.y = 0.8;
  frutero.position.set(-2.75, 1.28, -0.2);
  scene.add(frutero);
  [[-2.9, 1.32, -0.28, '#ffb54d'], [-2.6, 1.32, -0.14, '#f28c28'], [-2.75, 1.44, -0.2, '#ffc94d']].forEach(([x, y, z, c]) => {
    const fr = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mat(c));
    fr.position.set(x, y, z);
    scene.add(fr);
  });

  /* luces: día alegre, sin sombras costosas (usamos sombras "blob") */
  scene.add(new THREE.HemisphereLight('#fff6e6', '#d9926c', 1.15));
  const sol = new THREE.DirectionalLight('#fff2d8', 1.5);
  sol.position.set(-2.5, 5, 3.5);
  scene.add(sol);
}

/* sombra blob bajo cada ingrediente */
let blobTex = null;
function sombraBlob() {
  if (!blobTex) blobTex = canvasTexture((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(60,30,10,.4)');
    g.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.015;
  return m;
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
    camera = new THREE.PerspectiveCamera(36, 16 / 10, 0.1, 30);
    camera.position.set(0, 2.75, 3.9);
    camera.lookAt(0, 1.05, 0);
    clock = new THREE.Clock();

    construirCocina();

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(container);
    resize();

    /* tocar un ingrediente sobre la tabla lo devuelve a la despensa */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (!tapCb) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      for (let i = 0; i < 2; i++) {
        if (slotRoots[i] && ray.intersectObject(slotRoots[i], true).length) { tapCb(i); return; }
      }
    });
    return true;
  },

  setSlots(slots) {
    for (let i = 0; i < 2; i++) {
      const id = slots[i];
      const current = slotRoots[i];
      if (current && current.userData.id === id) continue;
      if (current) { scene.remove(current); slotRoots[i] = null; }
      slotMarkers[i].visible = !id;
      if (!id) continue;
      cargarItem(id, (obj) => {
        /* si mientras cargaba cambió el puesto, descartar */
        if (slotRoots[i] && slotRoots[i].userData.id === id) return;
        if (slotRoots[i]) scene.remove(slotRoots[i]);
        obj.userData.id = id;
        obj.add(sombraBlob());
        obj.position.set(SLOT_X[i], BOARD_Y + 0.9, 0.14);
        scene.add(obj);
        slotRoots[i] = obj;
        slotMarkers[i].visible = false;
        tween(obj, 'position', new THREE.Vector3(SLOT_X[i], BOARD_Y, 0.14), 0.34);
      });
    }
  },

  combinar(cb) {
    const items = slotRoots.filter(Boolean);
    slotRoots = [null, null];   /* se sueltan ya: un setSlots durante la animación no los toca */
    items.forEach(it => tween(it, 'position', new THREE.Vector3(0, BOARD_Y + 0.25, 0.14), 0.28));
    setTimeout(() => {
      items.forEach(it => scene.remove(it));
      slotMarkers.forEach(m => m.visible = true);
      /* estallido de estrellitas doradas */
      const starTex = canvasTexture((ctx, S) => {
        ctx.fillStyle = '#ffd24d';
        ctx.strokeStyle = '#e09b12'; ctx.lineWidth = 6;
        ctx.translate(S / 2, S / 2); ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? S * .18 : S * .42;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }, 64);
      for (let i = 0; i < 14; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true }));
        s.position.set(0, BOARD_Y + 0.3, 0.16);
        s.scale.setScalar(0.16 + Math.random() * 0.14);
        const a = Math.random() * Math.PI * 2;
        s.userData.vel = new THREE.Vector3(Math.cos(a) * (0.8 + Math.random()), 1.6 + Math.random() * 1.4, Math.sin(a) * 0.5);
        s.userData.born = clock.elapsedTime;
        scene.add(s);
        particles.push(s);
      }
      if (cb) cb();
    }, 300);
  },

  shake() {
    const t0 = camera.position.clone();
    let n = 0;
    const iv = setInterval(() => {
      camera.position.x = t0.x + (Math.random() - 0.5) * 0.12;
      if (++n > 7) { clearInterval(iv); camera.position.copy(t0); }
    }, 40);
  },

  onItemTap(cb) { tapCb = cb; },

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

  /* vapor de la olla */
  steamPuffs.forEach(p => {
    const k = ((t * 0.35) + p.userData.phase) % 1;
    p.position.y = 1.7 + k * 0.75;
    p.position.x = 2.2 + Math.sin(k * 6 + p.userData.phase * 9) * 0.07;
    p.material.opacity = k < 0.15 ? k / 0.15 * 0.7 : (1 - k) * 0.8;
    p.scale.setScalar(0.22 + k * 0.3);
  });

  /* balanceo suave de los ingredientes en su puesto */
  slotRoots.forEach((it, i) => {
    if (it) it.rotation.y = Math.sin(t * 1.4 + i * 2) * 0.12;
  });

  /* partículas de la fusión */
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
