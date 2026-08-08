/* ============================================================
   FANESCA — modelos/lenteja.js
   Lo que hay regado en la mesa al escoger el grano: la lenteja
   buena, la piedrita y el grano picado.

   Estas tres piezas son el nivel entero, y por eso su forma es
   una decisión de diseño y no de adorno:

     · la buena  — disco liso y parejo
     · la piedra — ANGULOSA (un dodecaedro achatado). No es
                   redonda, y eso es exactamente lo que la delata
                   al ojo antes que el color
     · el picado — del tamaño de la buena pero oscuro y CON UN
                   AGUJERO, que es lo que lo hace descartable

   Si las tres se vieran igual, escoger sería adivinar. Si se
   vieran demasiado distintas, no habría nada que escoger.

   PARTES NOMBRADAS (para que un .glb encaje)
     lenteja / piedra → 'cuerpo'
     lenteja-picada   → 'cuerpo', 'hueco'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';

registrar('lenteja', (THREE) => {
  const g = new THREE.Group();
  g.name = 'lenteja';
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mate(THREE, COMIDA.lenteja));
  m.scale.set(0.058, 0.024, 0.058);
  m.name = 'cuerpo';
  g.add(m);
  return g;
});

registrar('piedra', (THREE) => {
  const g = new THREE.Group();
  g.name = 'piedra';
  /* angulosa: la piedra no es redonda, y eso es lo que la delata */
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.055, 0), mate(THREE, COMIDA.lenteja_piedra));
  m.scale.set(1, 0.62, 0.9);
  m.name = 'cuerpo';
  g.add(m);
  return g;
});

registrar('lenteja-picada', (THREE) => {
  const g = new THREE.Group();
  g.name = 'picado';
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mate(THREE, COMIDA.lenteja_picada));
  m.scale.set(0.058, 0.026, 0.058);
  m.name = 'cuerpo';
  /* el agujero del bicho, que es lo que lo hace descartable */
  const hueco = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mate(THREE, COMIDA.lenteja_hueco));
  hueco.position.set(0.018, 0.02, 0.01);
  hueco.name = 'hueco';
  hueco.userData.ignorar = true;
  g.add(m, hueco);
  return g;
});
