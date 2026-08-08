/* ============================================================
   FANESCA — modelos/frejol.js
   La vaina moteada que truena, y el grano vino de adentro.

   El fréjol tierno no se abre con delicadeza: se aprieta hasta
   que revienta. Por eso la vaina se dibuja hinchable —el nivel le
   sube la escala mientras la aprietas— y las motas son parte del
   cuerpo, no un detalle: son lo que la distingue de la vaina de
   habas de un vistazo.

   PARTES NOMBRADAS (para que un .glb encaje)
     vaina-frejol → 'cuerpo', mota0…motaN, bulto0…bultoN
     grano-frejol → 'cuerpo', 'raya'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, curvar, formaVariada, forma } from './organico.js';

export const POR_VAINA = 6;
export const PASO_GRANO = 0.128;

registrar('vaina-frejol', (THREE) => {
  const v = new THREE.Group();
  v.name = 'vaina';

  /* la vaina se arquea y se marca donde va cada grano: recta y lisa
     se ve una salchicha. El arco va hacia Z porque el cuerpo se gira
     90° para acostarse — si se arqueara en X quedaría curvado hacia
     arriba, o sea invisible desde la cámara de mesa. */
  const geoC = forma('vaina-frejol-cuerpo', () =>
    curvar(
      abollar(new THREE.CapsuleGeometry(0.1, 0.62, 6, 16), { fuerza: 0.016, escala: 5.5, semilla: 4 }),
      { eje: 'y', hacia: 'z', k: 0.55 },
    ));
  const cuerpo = new THREE.Mesh(geoC, mate(THREE, COMIDA.vaina_frejol));
  cuerpo.rotation.z = Math.PI / 2;
  cuerpo.name = 'cuerpo';
  v.add(cuerpo);

  /* las manchas vinos: la marca del fréjol tierno. Van SOBRE la piel
     (radio 0.1), no a 0.09 —ahí quedaban medio enterradas y la vaina
     se veía lisa y pálida, sin lo único que la distingue de la de
     habas de un vistazo. */
  for (let i = 0; i < 8; i++) {
    const mota = new THREE.Mesh(
      new THREE.SphereGeometry(0.028 + Math.random() * 0.018, 7, 5),
      mate(THREE, COMIDA.frejol_mota)
    );
    const a = Math.random() * Math.PI * 2;
    mota.position.set((Math.random() - 0.5) * 0.68, Math.sin(a) * 0.098, Math.cos(a) * 0.098);
    mota.scale.set(1.5, 0.85, 1);
    mota.name = 'mota' + i;
    mota.userData.ignorar = true;
    v.add(mota);
  }

  /* los bultos de los granos, que se adivinan por fuera. Tienen que
     ASOMAR: el cuerpo de la vaina tiene 0.1 de radio, así que un
     bulto centrado a 0.055 y de 0.031 de alto se queda entero por
     dentro y no se ve nada — la vaina se leía como un tubo liso. */
  for (let i = 0; i < POR_VAINA; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 6), mate(THREE, COMIDA.vaina_frejol));
    b.position.set((i - (POR_VAINA - 1) / 2) * PASO_GRANO, 0.082, 0);
    b.scale.set(0.95, 0.62, 0.95);
    b.name = 'bulto' + i;
    b.userData.ignorar = true;
    v.add(b);
  }

  return v;
});

registrar('grano-frejol', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'grano';
  /* arriñonado, como el fréjol: una cara hundida y la otra hinchada */
  const geo = formaVariada('grano-frejol', 4, opts.variante || 0, (k) =>
    curvar(
      abollar(new THREE.SphereGeometry(1, 12, 9), { fuerza: 0.1, escala: 2.1, semilla: k + 11 }),
      { eje: 'x', hacia: 'z', k: 0.2 },
    ));
  const cuerpo = new THREE.Mesh(geo, mate(THREE, COMIDA.frejol));
  cuerpo.scale.set(0.062, 0.05, 0.052);
  cuerpo.name = 'cuerpo';
  const raya = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.008, 0.01), mate(THREE, COMIDA.frejol_mota));
  raya.position.set(0, 0.048, 0.04);
  raya.name = 'raya';
  raya.userData.ignorar = true;
  g.add(cuerpo, raya);
  return g;
});
