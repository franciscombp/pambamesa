/* ============================================================
   FANESCA — modelos/chochos.js
   El chocho: una pepa amarilla dentro de una piel traslúcida.

   La piel va un pelín más grande y semitransparente, para que se
   vea que hay algo adentro esperando salir — que es la mitad de
   las ganas de apretarlo.

   PARTES NOMBRADAS (para que un .glb encaje)
     chocho → 'pepa'    (la que salta a la batea)
              'piel'    (la que se va a la composta)
              'ombligo'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, formaVariada } from './organico.js';

registrar('chocho', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'chocho';

  /* la pepa: amarilla, achatada, con su ombliguito — y con la forma
     de moneda irregular que tiene el chocho de verdad */
  const geoP = formaVariada('chocho-pepa', 4, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 12, 9), { fuerza: 0.1, escala: 2.4, semilla: k + 7 }));
  const pepa = new THREE.Mesh(geoP, mate(THREE, COMIDA.chocho_pepa));
  pepa.scale.set(0.1, 0.062, 0.088);
  pepa.name = 'pepa';

  const ombligo = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mate(THREE, COMIDA.chocho_ombligo));
  ombligo.position.set(0.086, 0.012, 0);
  ombligo.scale.set(0.5, 0.7, 1);
  ombligo.name = 'ombligo';
  ombligo.userData.ignorar = true;

  const piel = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 9),
    mate(THREE, COMIDA.chocho_piel, { transparent: true, opacity: 0.5 })
  );
  piel.scale.set(0.112, 0.072, 0.098);
  piel.name = 'piel';
  piel.userData.ignorar = true;

  g.add(pepa, ombligo, piel);
  return g;
});
