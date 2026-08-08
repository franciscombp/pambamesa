/* ============================================================
   FANESCA — modelos/bacalao.js
   La presa de bacalao con su sal encima, y el cordel donde se
   tiende a orear.

   La presa es la única pieza del juego que CAMBIA de material en
   vivo: al quitarle toda la sal, la carne pasa de salada
   (amarillenta) a limpia (casi blanca). Por eso su carne se
   llama 'carne' — el nivel la busca por nombre y le cambia el
   material, y eso funciona igual si la presa viene de Blender.

   PARTES NOMBRADAS (para que un .glb encaje)
     presa-bacalao → 'carne'  (la que se aclara al desalarse)
                     'piel', 'filo', veta0…vetaN
     grano-sal     → una malla suelta
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';

/* el color de la carne ya desalada: lo pide el nivel para el cambio */
export const CARNE_SALADA = COMIDA.bacalao_carne;
export const CARNE_LIMPIA = COMIDA.bacalao_carne_limpia;

registrar('presa-bacalao', (THREE) => {
  const g = new THREE.Group();
  g.name = 'presa';

  const carne = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mate(THREE, CARNE_SALADA));
  carne.scale.set(0.31, 0.07, 0.2);
  carne.name = 'carne';

  const piel = new THREE.Mesh(
    new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    mate(THREE, COMIDA.bacalao_piel)
  );
  piel.scale.set(0.313, 0.072, 0.203);
  piel.name = 'piel';
  piel.userData.ignorar = true;

  /* las vetas del lomo, para que se lea como pescado y no como pan */
  for (let i = 0; i < 4; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.24), mate(THREE, COMIDA.bacalao_veta));
    v.position.set((i - 1.5) * 0.105, 0.066, 0);
    v.name = 'veta' + i;
    v.userData.ignorar = true;
    g.add(v);
  }

  /* el filo de piel oscura por un lado: sin esto es un pan blanco */
  const filo = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10, 0, Math.PI), mate(THREE, COMIDA.bacalao_piel));
  filo.scale.set(0.315, 0.073, 0.075);
  filo.position.z = -0.145;
  filo.rotation.y = Math.PI;
  filo.name = 'filo';
  filo.userData.ignorar = true;

  g.add(carne, piel, filo);
  return g;
});

/* los cristales de sal, que son el trabajo del nivel */
registrar('grano-sal', (THREE) => {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, 0.03), mate(THREE, COMIDA.sal));
  s.name = 'sal';
  s.userData.ignorar = true;
  return s;
});

/* la pinza de ropa que sujeta la presa al cordel */
registrar('pinza', (THREE) => {
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.035), mate(THREE, COMIDA.cuerda));
  p.name = 'pinza';
  p.userData.ignorar = true;
  return p;
});

/* el cordel del fondo, con sus dos postes */
registrar('cordel', (THREE, opts = {}) => {
  const largo = opts.largo || 2.9;
  const g = new THREE.Group();
  g.name = 'cordel';
  const mat = mate(THREE, COMIDA.cuerda);
  const cuerda = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, largo, 8), mat);
  cuerda.rotation.z = Math.PI / 2;
  cuerda.name = 'cuerda';
  g.add(cuerda);
  return g;
});

registrar('poste', (THREE) => {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.05, 8), mate(THREE, COMIDA.cuerda));
  p.name = 'poste';
  return p;
});
