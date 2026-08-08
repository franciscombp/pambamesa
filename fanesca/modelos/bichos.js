/* ============================================================
   FANESCA — modelos/bichos.js
   Los invitados que nadie quiere en la olla: su forma.

   Todos los niveles comparten la misma gramática, y por eso los
   bichos se arman en un solo sitio: si el gusanito del choclo y
   el del zapallo se vieran distinto, el jugador tendría que
   aprender dos veces la misma regla.

   ------------------------------------------------------------
   PARTES NOMBRADAS

   Estos tres son los únicos modelos que se ANIMAN, así que el
   juego tiene que poder encontrar sus pedazos. Los busca por
   nombre (nunca por índice de hijo), y por eso un .glb esculpido
   en Blender funciona igual mientras respete estos nombres:

     gusano  → seg0, seg1, … segN   (los segmentos que se menean)
               aro                  (el anillo rojo de alarma)
     gorgojo → pata0 … pata5, cuerpo, aro
     mosca   → ala0, ala1, aro

   El aro es aparte: no lo dibuja Blender ni debería. Es interfaz
   —la señal de "esto no se toca"— y por eso lo pone siempre el
   código, con el rojo del sistema de diseño, aunque el cuerpo
   venga de un .glb.
   ============================================================ */

import { registrar, parte, partes } from './registro.js';
import { COMIDA, mate, token } from './paleta.js';
import { ojitos } from './utileria.js';

/* el aro rojo que late: la única señal que el jugador necesita
   para saber "esto no se toca". Interfaz, no comida: por eso sale
   del sistema de diseño y no de la paleta de la olla. */
export function aroDeAlarma(THREE, r) {
  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(r, r * 0.11, 8, 22),
    new THREE.MeshBasicMaterial({ color: token('--chile-500', '#ce2029'), transparent: true, opacity: 0.9 })
  );
  aro.rotation.x = Math.PI / 2;
  aro.name = 'aro';
  aro.userData.ignorar = true;   /* el aro no se raycastea: sería trampa */
  return aro;
}

/* ---------- gusanito: choclo, habas y zapallo ----------
   `eje` dice hacia dónde crece el cuerpo desde la cabeza:
     'z' — tumbado en la mesa, cabeza hacia +Z (el que camina)
     'y' — trepando, cabeza hacia +Y (el de la mazorca, donde +Y
           es el eje del choclo y +Z lo que mira la cámara) */

registrar('gusano', (THREE, opts = {}) => {
  const k = opts.escala || 1;
  const eje = opts.eje || 'z';
  const segmentos = opts.segmentos || 5;
  const claro = mate(THREE, opts.color || COMIDA.gusano);
  const oscuro = mate(THREE, opts.color2 || COMIDA.gusano_oscuro);

  const obj = new THREE.Group();
  obj.name = 'gusano';
  for (let i = 0; i < segmentos; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry((0.062 - i * 0.005) * k, 9, 7),
      i % 2 ? oscuro : claro
    );
    if (eje === 'y') s.position.y = -i * 0.075 * k;
    else s.position.z = -i * 0.075 * k;
    s.name = 'seg' + i;
    obj.add(s);
    if (i === 0) s.add(ojitos(THREE, 0.028 * k, 0.022 * k, 0.05 * k, 0.019 * k));
  }
  return obj;
});

/* ---------- gorgojo: el escarabajito del fréjol ---------- */

registrar('gorgojo', (THREE, opts = {}) => {
  const k = opts.escala || 1;
  const obj = new THREE.Group();
  obj.name = 'gorgojo';

  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.075 * k, 12, 9),
    mate(THREE, COMIDA.gorgojo_cuerpo)
  );
  cuerpo.scale.set(0.8, 0.62, 1.15);
  cuerpo.name = 'cuerpo';

  const caparazon = new THREE.Mesh(
    new THREE.SphereGeometry(0.072 * k, 12, 9, 0, Math.PI * 2, 0, Math.PI / 2),
    mate(THREE, COMIDA.gorgojo_caparazon)
  );
  caparazon.scale.set(0.82, 0.5, 1.1);
  caparazon.position.y = 0.012 * k;
  caparazon.name = 'caparazon';

  const raya = new THREE.Mesh(
    new THREE.BoxGeometry(0.006 * k, 0.05 * k, 0.15 * k),
    mate(THREE, COMIDA.gorgojo_oscuro)
  );
  raya.position.y = 0.03 * k;
  raya.name = 'raya';

  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(0.042 * k, 10, 8),
    mate(THREE, COMIDA.gorgojo_cabeza)
  );
  cabeza.position.set(0, 0.005 * k, 0.078 * k);
  cabeza.name = 'cabeza';
  cabeza.add(ojitos(THREE, 0.022 * k, 0.014 * k, 0.032 * k, 0.014 * k));

  /* la trompita del gorgojo, que es su marca */
  const trompa = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008 * k, 0.012 * k, 0.06 * k, 6),
    mate(THREE, COMIDA.gorgojo_cabeza)
  );
  trompa.rotation.x = Math.PI / 2.2;
  trompa.position.set(0, -0.008 * k, 0.115 * k);
  trompa.name = 'trompa';

  obj.add(cuerpo, caparazon, raya, cabeza, trompa);

  let n = 0;
  [-1, 1].forEach(s => [-0.045, 0, 0.045].forEach(z => {
    const pata = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006 * k, 0.005 * k, 0.06 * k, 5),
      mate(THREE, COMIDA.gorgojo_oscuro)
    );
    pata.position.set(0.06 * k * s, -0.03 * k, z * k);
    pata.rotation.z = s * 0.7;
    pata.name = 'pata' + (n++);
    obj.add(pata);
  }));

  return obj;
});

/* ---------- mosca: la que ronda el bacalao ---------- */

registrar('mosca', (THREE, opts = {}) => {
  const k = opts.escala || 1;
  const obj = new THREE.Group();
  obj.name = 'mosca';

  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.055 * k, 10, 8),
    mate(THREE, COMIDA.mosca_cuerpo)
  );
  cuerpo.scale.set(0.75, 0.7, 1.25);
  cuerpo.name = 'cuerpo';

  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(0.038 * k, 10, 8),
    mate(THREE, COMIDA.mosca_cabeza)
  );
  cabeza.position.z = 0.06 * k;
  cabeza.name = 'cabeza';

  obj.add(cuerpo, cabeza);

  /* ojos rojos enormes: se lee de lejos que es una mosca */
  [-1, 1].forEach((s, i) => {
    const o = new THREE.Mesh(
      new THREE.SphereGeometry(0.026 * k, 8, 6),
      mate(THREE, COMIDA.mosca_ojo)
    );
    o.position.set(0.024 * k * s, 0.008 * k, 0.075 * k);
    o.name = 'ojoRojo' + i;
    obj.add(o);
  });

  const matAla = new THREE.MeshBasicMaterial({
    color: COMIDA.mosca_ala, transparent: true, opacity: 0.5,
    side: THREE.DoubleSide, depthWrite: false,
  });
  [-1, 1].forEach((s, i) => {
    const a = new THREE.Mesh(new THREE.CircleGeometry(0.07 * k, 12, 0, Math.PI), matAla);
    a.position.set(0.03 * k * s, 0.03 * k, -0.01 * k);
    a.rotation.set(-Math.PI / 2.4, 0, s * 0.5);
    a.name = 'ala' + i;
    a.userData.ignorar = true;
    a.userData.lado = s;
    obj.add(a);
  });

  return obj;
});

/* ============================================================
   LOS BICHOS VIVOS
   El modelo es la forma; esto es la forma + su meneo + su aro.
   Devuelve siempre { obj, aro, animar(t) }, venga el cuerpo de
   código o de un .glb — por eso busca las partes por nombre.
   ============================================================ */

import { pieza } from './registro.js';

function latirAro(aro, t, vel = 6, amp = 0.14, base = 0.55, ampOp = 0.3) {
  if (!aro || !aro.visible) return;
  const e = 1 + Math.sin(t * vel) * amp;
  aro.scale.set(e, e, 1);
  aro.material.opacity = base + Math.sin(t * vel) * ampOp;
}

export function nuevoGusano(THREE, opts = {}) {
  const k = opts.escala || 1;
  const eje = opts.eje || 'z';
  const obj = pieza('gusano', THREE, opts);
  const seg = partes(obj, 'seg');

  const aro = aroDeAlarma(THREE, 0.16 * k);
  if (eje === 'y') { aro.rotation.x = Math.PI / 2; aro.position.y = -0.15 * k; }
  else { aro.rotation.x = -Math.PI / 2; aro.position.set(0, -0.045 * k, -0.15 * k); }
  obj.add(aro);

  const fase = Math.random() * 6;
  return {
    obj, seg, aro,
    /* el meneo, y el aro latiendo */
    animar(t) {
      seg.forEach((s, i) => { s.position.x = Math.sin(t * 9 - i * 0.9 + fase) * 0.022 * k; });
      latirAro(aro, t);
    },
  };
}

export function nuevoGorgojo(THREE, opts = {}) {
  const k = opts.escala || 1;
  const obj = pieza('gorgojo', THREE, opts);
  const patas = partes(obj, 'pata');
  const cuerpo = parte(obj, 'cuerpo');

  const aro = aroDeAlarma(THREE, 0.15 * k);
  aro.position.y = -0.05 * k;
  obj.add(aro);

  const fase = Math.random() * 6;
  return {
    obj, aro,
    animar(t) {
      patas.forEach((pt, i) => { pt.rotation.x = Math.sin(t * 14 + i * 1.4 + fase) * 0.45; });
      if (cuerpo) cuerpo.position.y = Math.sin(t * 14 + fase) * 0.004 * k;
      latirAro(aro, t);
    },
  };
}

export function nuevaMosca(THREE, opts = {}) {
  const k = opts.escala || 1;
  const obj = pieza('mosca', THREE, opts);
  const alas = partes(obj, 'ala').map(m => ({ m, s: m.userData.lado || 1 }));

  const aro = aroDeAlarma(THREE, 0.14 * k);
  aro.position.y = -0.05 * k;
  obj.add(aro);

  const fase = Math.random() * 6;
  return {
    obj, alas, aro,
    animar(t) {
      alas.forEach(({ m, s }) => { m.rotation.z = s * (0.5 + Math.sin(t * 42 + fase) * 0.55); });
      latirAro(aro, t, 7, 0.16, 0.5, 0.32);
    },
  };
}
