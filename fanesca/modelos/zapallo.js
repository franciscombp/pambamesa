/* ============================================================
   FANESCA — modelos/zapallo.js
   El zapallo partido a lo largo: tajadas, guías y pepas.

   Como en el choclo, la medida manda y vive aquí: el nivel usa
   GRUESO y R para saber dónde cae cada tajada y cada línea de
   corte. La tajada es medio cilindro tumbado — el zapallo cara
   abajo sobre la tabla, listo para cruzarlo de un trazo.

   PARTES NOMBRADAS (para que un .glb encaje)
     tajada-zapallo → una malla suelta (tres materiales: piel,
                      pulpa, pulpa — en ese orden de grupo)
     guia-zapallo   → raya0 … rayaN (la línea punteada del corte)
     pepa-zapallo   → una malla suelta
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, gajos, forma } from './organico.js';

export const N = 8;              /* tajadas */
export const GRUESO = 0.29;      /* ancho de cada tajada */
export const R = 0.44;           /* radio del zapallo */

export const xDeTajada = (i) => (i - (N - 1) / 2) * GRUESO;
export const xDeFrontera = (b) => (b - N / 2) * GRUESO;

registrar('tajada-zapallo', (THREE) => {
  /* medio cilindro tumbado: el zapallo partido a lo largo, cara abajo.
     Tres materiales porque el cilindro trae tres grupos: costado,
     tapa y fondo — el costado es la piel, las caras son pulpa. */
  /* Los gajos del zapallo: la piel no es un cilindro liso, tiene
     lomos que le dan la vuelta. Solo con ruido salía un pan; con
     gajos regulares —ocho, para que la mitad de cilindro contenga
     cuatro enteros y las caras de corte queden en cresta— se lee
     zapallo desde la silueta. El ruido se queda encima, flojito,
     para que ningún gajo sea idéntico al de al lado. */
  const geo = forma('tajada-zapallo', () =>
    abollar(
      gajos(new THREE.CylinderGeometry(R, R, GRUESO * 0.97, 40, 2, false, 0, Math.PI),
        { eje: 'y', n: 8, hondura: 0.14 }),
      { fuerza: 0.012, escala: 4.2, semilla: 41 },
    ));
  const g = new THREE.Mesh(
    geo,
    [
      mate(THREE, COMIDA.zapallo_piel),
      mate(THREE, COMIDA.zapallo_pulpa),
      mate(THREE, COMIDA.zapallo_pulpa),
    ]
  );
  g.rotation.z = Math.PI / 2;      /* eje a lo largo de X, panza arriba */
  g.name = 'tajada';
  return g;
});

/* la línea punteada por donde va el cuchillo */
registrar('guia-zapallo', (THREE) => {
  const g = new THREE.Group();
  g.name = 'guia';
  const trozos = 9;
  const mat = mate(THREE, COMIDA.zapallo_guia);
  for (let i = 0; i <= trozos; i++) {
    if (i % 2) continue;
    const a = (i / trozos) * Math.PI;
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.03, 0.055), mat);
    d.position.set(0, Math.sin(a) * (R + 0.012), -Math.cos(a) * (R + 0.012));
    d.rotation.x = -a;
    d.name = 'raya' + i;
    d.userData.ignorar = true;
    g.add(d);
  }
  return g;
});

/* las pepas asomando por la cara abierta de las puntas */
registrar('pepa-zapallo', (THREE) => {
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mate(THREE, COMIDA.zapallo_pepa));
  p.scale.set(1, 0.45, 1.3);
  p.name = 'pepa';
  p.userData.ignorar = true;
  return p;
});
