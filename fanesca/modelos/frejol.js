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

export const POR_VAINA = 6;
export const PASO_GRANO = 0.128;

registrar('vaina-frejol', (THREE) => {
  const v = new THREE.Group();
  v.name = 'vaina';

  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.62, 6, 14), mate(THREE, COMIDA.vaina_frejol));
  cuerpo.rotation.z = Math.PI / 2;
  cuerpo.name = 'cuerpo';
  v.add(cuerpo);

  /* las manchas vinos: la marca del fréjol tierno */
  for (let i = 0; i < 7; i++) {
    const mota = new THREE.Mesh(
      new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 7, 5),
      mate(THREE, COMIDA.frejol_mota)
    );
    const a = Math.random() * Math.PI * 2;
    mota.position.set((Math.random() - 0.5) * 0.68, Math.sin(a) * 0.09, Math.cos(a) * 0.09);
    mota.scale.set(1.4, 0.5, 1);
    mota.name = 'mota' + i;
    mota.userData.ignorar = true;
    v.add(mota);
  }

  /* los bultos de los granos, que se adivinan por fuera */
  for (let i = 0; i < POR_VAINA; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 6), mate(THREE, COMIDA.vaina_frejol));
    b.position.set((i - (POR_VAINA - 1) / 2) * PASO_GRANO, 0.055, 0);
    b.scale.set(0.9, 0.5, 0.9);
    b.name = 'bulto' + i;
    b.userData.ignorar = true;
    v.add(b);
  }

  return v;
});

registrar('grano-frejol', (THREE) => {
  const g = new THREE.Group();
  g.name = 'grano';
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), mate(THREE, COMIDA.frejol));
  cuerpo.scale.set(0.062, 0.05, 0.052);
  cuerpo.name = 'cuerpo';
  const raya = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.008, 0.01), mate(THREE, COMIDA.frejol_mota));
  raya.position.set(0, 0.048, 0.04);
  raya.name = 'raya';
  raya.userData.ignorar = true;
  g.add(cuerpo, raya);
  return g;
});
