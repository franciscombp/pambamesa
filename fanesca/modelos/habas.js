/* ============================================================
   FANESCA — modelos/habas.js
   La vaina que se abre por la costura, y el haba de adentro.

   La vaina es de las pocas piezas de este juego que se ARTICULA:
   la tapa cuelga de una bisagra al fondo y se echa para atrás al
   abrirse, como una vaina de verdad — no se desvanece.

   PARTES NOMBRADAS (para que un .glb encaje)
     vaina-haba → 'bisagra' (el grupo que rota al abrir)
                  'tapa', 'abajo', 'costura', 'rabo'
                  bulto0 … bultoN (los granos que se adivinan afuera)
     haba       → 'cuerpo', 'ombligo'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, curvar, formaVariada, forma } from './organico.js';

export const POR_VAINA = 5;
export const PASO_HABA = 0.168;

/* media cáscara: un casquete alargado, hueco por dentro */
function mediaVaina(THREE, arriba) {
  /* abollada a lo largo: la vaina real se marca donde va cada haba y
     se hunde entre una y otra, nunca es un casquete liso */
  const geoV = forma('media-vaina-haba:' + (arriba ? 'a' : 'b'), () =>
    abollar(
      new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, arriba ? 0 : Math.PI / 2, Math.PI / 2),
      { fuerza: 0.05, escala: 3.4, semilla: arriba ? 1 : 2 },
    ));
  const g = new THREE.Mesh(geoV, mate(THREE, COMIDA.vaina_haba));
  g.scale.set(0.44, 0.13, 0.115);
  /* forro interior: la cáscara es una superficie, y sin esto la vaina
     abierta se vería hueca por dentro (las caras traseras se descartan) */
  const forro = new THREE.Mesh(
    new THREE.SphereGeometry(0.96, 18, 10, 0, Math.PI * 2, arriba ? 0 : Math.PI / 2, Math.PI / 2),
    mate(THREE, COMIDA.vaina_haba_dentro, { side: THREE.DoubleSide })
  );
  forro.name = 'forro';
  forro.userData.ignorar = true;
  g.add(forro);
  return g;
}

registrar('vaina-haba', (THREE) => {
  const v = new THREE.Group();
  v.name = 'vaina';

  const abajo = mediaVaina(THREE, false);
  abajo.name = 'abajo';
  v.add(abajo);

  /* la tapa cuelga de una bisagra al fondo */
  const bisagra = new THREE.Group();
  bisagra.name = 'bisagra';
  bisagra.position.z = -0.1;
  const tapa = mediaVaina(THREE, true);
  tapa.name = 'tapa';
  tapa.position.z = 0.1;

  /* los bultos: se adivina cuántas habas hay antes de abrirla */
  for (let i = 0; i < POR_VAINA; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6), mate(THREE, COMIDA.vaina_haba));
    b.position.set((i - (POR_VAINA - 1) / 2) * PASO_HABA, 0.052, 0.1);
    b.scale.set(1, 0.55, 0.85);
    b.name = 'bulto' + i;
    b.userData.ignorar = true;
    bisagra.add(b);
  }
  bisagra.add(tapa);
  v.add(bisagra);

  /* la costura, que es por donde se pasa el dedo */
  const costura = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.02), mate(THREE, COMIDA.hilo_haba));
  costura.position.set(0, 0.005, 0.112);
  costura.name = 'costura';
  costura.userData.ignorar = true;
  v.add(costura);

  const rabo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.1, 6), mate(THREE, COMIDA.hilo_haba));
  rabo.rotation.z = Math.PI / 2.3;
  rabo.position.set(-0.5, 0.02, 0);
  rabo.name = 'rabo';
  rabo.userData.ignorar = true;
  v.add(rabo);

  return v;
});

registrar('haba', (THREE, opts = {}) => {
  const h = new THREE.Group();
  h.name = 'haba';
  /* el haba es de las más irregulares: arriñonada, con una cara más
     hinchada que la otra y el ombligo hundido */
  const geo = formaVariada('haba', 4, opts.variante || 0, (k) =>
    curvar(
      abollar(new THREE.SphereGeometry(1, 12, 9), { fuerza: 0.13, escala: 1.9, semilla: k + 3 }),
      { eje: 'x', hacia: 'z', k: 0.18 },
    ));
  const cuerpo = new THREE.Mesh(geo, mate(THREE, COMIDA.haba));
  cuerpo.scale.set(0.068, 0.052, 0.06);
  cuerpo.name = 'cuerpo';
  const ombligo = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.012), mate(THREE, COMIDA.haba_ombligo));
  ombligo.position.set(0, 0.05, 0.045);
  ombligo.name = 'ombligo';
  ombligo.userData.ignorar = true;
  h.add(cuerpo, ombligo);
  return h;
});
