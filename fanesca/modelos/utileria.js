/* ============================================================
   FANESCA — modelos/utileria.js
   Las piezas que no son de ningún ingrediente pero salen en casi
   todos: la tabla de picar, la sombra bajo las cosas y los ojitos
   de los bichos.

   La tabla estaba copiada en seis niveles con medidas apenas
   distintas — el clásico duplicado que nadie nota hasta que hay
   que cambiar el color de la madera en seis sitios.
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';

/* ---------- la tabla de picar ----------
   Cada nivel la pide de su medida; el grosor y el color son los
   mismos para todos, que es lo que hace que se lea como la misma
   cocina. Sobresale 0.10 del mesón: por eso los bichos que caminan
   encima necesitan la función `superficie` de plaga.js. */

export const GROSOR_TABLA = 0.1;
export const ALTO_TABLA = 0.10;   /* cuánto sobresale del mesón */

registrar('tabla', (THREE, opts = {}) => {
  const ancho = opts.ancho || 3.1;
  const hondo = opts.hondo || 1.7;
  const t = new THREE.Mesh(
    new THREE.BoxGeometry(ancho, GROSOR_TABLA, hondo),
    mate(THREE, COMIDA.tabla)
  );
  t.name = 'tabla';
  return t;
});

/* ---------- la sombra ----------
   Un disco borroso pintado a canvas. Sin esto las cosas flotan;
   con esto se apoyan. La textura se hace una sola vez. */

let sombraTex = null;

export function texturaSombra(THREE) {
  if (sombraTex) return sombraTex;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(60,30,10,.42)');
  g.addColorStop(1, 'rgba(60,30,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  sombraTex = new THREE.CanvasTexture(c);
  sombraTex.colorSpace = THREE.SRGBColorSpace;
  return sombraTex;
}

export function sombraBlob(THREE, size = 0.8, alto = 0.012) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: texturaSombra(THREE), transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = alto;
  m.name = 'sombra';
  m.userData.ignorar = true;
  return m;
}

/* ---------- los ojitos ----------
   Dos bolitas con pupila. Los llevan todos los bichos: es lo que
   los vuelve personajes en vez de obstáculos, y lo que hace que
   aplastar a uno se sienta mal — que es exactamente el punto. */

export function ojitos(THREE, sep = 0.06, y = 0.05, z = 0.09, r = 0.028) {
  const g = new THREE.Group();
  g.name = 'ojitos';
  const blanco = new THREE.MeshBasicMaterial({ color: COMIDA.ojo_blanco });
  const negro = new THREE.MeshBasicMaterial({ color: COMIDA.ojo_negro });
  [-1, 1].forEach((s, i) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), blanco);
    o.position.set(sep * s, y, z);
    o.name = 'ojo' + i;
    const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 8, 6), negro);
    p.position.set(sep * s, y, z + r * 0.62);
    p.name = 'pupila' + i;
    g.add(o, p);
  });
  return g;
}
