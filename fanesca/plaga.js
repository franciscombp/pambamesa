/* ============================================================
   FANESCA — plaga.js
   Los bichos que caminan por la tabla, en un solo sitio.

   Tres niveles (habas, fréjol, zapallo) comparten exactamente el
   mismo drama: aparece un bicho, camina hacia la batea, y el
   jugador tiene que agarrarlo y botarlo a la composta antes de
   que llegue — sin tocarlo, porque tocarlo es aplastarlo.

   Si cada nivel lo reimplementara, tarde o temprano uno caminaría
   más rápido o perdonaría un toque, y la regla dejaría de ser una
   regla. Vive aquí una sola vez.
   ============================================================ */

import { nuevoGusano, nuevoGorgojo, ARRUINADO } from './bichos.js';

export function nuevaPlaga(THREE, api, raiz, opts = {}) {
  const nombre = opts.nombre || 'gusanito';
  const VEL = opts.vel || 0.13;             /* unidades por segundo hacia la batea */
  /* Un bicho que nace pegado a la batea es una derrota sin jugada: la
     vaina de la derecha está a un palmo del cuenco. Nazca donde nazca,
     se lo aparta hasta esta distancia para que siempre haya carrera. */
  const ARRANQUE = opts.arranque || 1.15;
  /* Cuánto levanta al bicho sobre la superficie que pisa: la panza
     del gusano y las patas del gorgojo bajan ~0.06, así que menos
     que esto lo entierra. */
  const ALTO = opts.alto != null ? opts.alto : 0.055;
  /* Y CUÁL es esa superficie. Sin esto el bicho camina a la altura
     del mesón y la tabla de picar —que sobresale un centímetro— se
     lo traga: se le ve media cabeza y el jugador no puede agarrarlo.
     Cada nivel dice dónde está su tabla. */
  const SUELO = opts.superficie || (() => api.MESA_Y);
  const CERCA_BATEA = opts.cercaBatea || 0.42;
  const CERCA_COMPOSTA = opts.cercaComposta || 0.7;
  /* El bicho aparece justo bajo el dedo que lo destapó, y muchas veces
     ese dedo viene barriendo. Sin este respiro, destapar un bicho sería
     perder sin poder reaccionar — que no es dificultad, es injusticia. */
  const GRACIA = opts.gracia != null ? opts.gracia : 1.0;

  const grupo = new THREE.Group();
  raiz.add(grupo);
  const lista = [];
  let cargado = null;
  let avisados = 0;

  const destino = api.BATEA.clone().setY(api.MESA_Y + ALTO);

  function soltar(clase, pos) {
    const bicho = clase === 'gorgojo'
      ? nuevoGorgojo(THREE, api, { escala: 1 })
      : nuevoGusano(THREE, api, { eje: 'z' });
    const nodo = new THREE.Group();
    nodo.userData = { tipo: 'bicho' };
    nodo.add(bicho.obj);
    nodo.position.copy(pos);
    /* apartarlo de la batea sin sacarlo del mesón */
    let dx = pos.x - api.BATEA.x, dz = pos.z - api.BATEA.z;
    let d = Math.hypot(dx, dz);
    if (d < 0.01) { dx = -1; dz = -0.2; d = Math.hypot(dx, dz); }
    if (d < ARRANQUE) {
      nodo.position.x = Math.max(-1.3, Math.min(1.3, api.BATEA.x + (dx / d) * ARRANQUE));
      nodo.position.z = Math.max(-0.45, Math.min(1.05, api.BATEA.z + (dz / d) * ARRANQUE));
    }
    nodo.position.y = SUELO(nodo.position.x, nodo.position.z) + ALTO;
    grupo.add(nodo);
    nodo.scale.setScalar(0.01);
    api.tween(nodo.scale, 'x', 1, 0.28); api.tween(nodo.scale, 'y', 1, 0.28); api.tween(nodo.scale, 'z', 1, 0.28);

    const rec = { nodo, bicho, estado: 'suelto', t0: api.reloj };
    lista.push(rec);
    api.sfx('crack'); api.buzz([25, 30, 25]);
    if (!avisados++) {
      api.pista('<b>Pellízcalo con dos dedos</b> y llévalo a la composta verde (o arrástralo con uno). Si lo tocas, lo aplastas.', 5200);
    }
    api.aviso(`🪱 ¡Un ${nombre}! Llévalo a la composta — no lo aplastes`);
    return rec;
  }

  return {
    soltar,
    grupo,
    objetivos() { return [grupo]; },
    vivos() { return lista.filter(r => r.estado !== 'ido').length; },
    /* para los niveles que barren por área en vez de por rayo */
    lista() { return lista; },
    /* ¿este objeto tocado es uno de los nuestros? */
    de(raizTocada) { return lista.find(r => r.nodo === raizTocada && r.estado !== 'ido') || null; },

    /* tocarlo o rozarlo con el dedo: se acabó — salvo que acabe de
       aparecer, que entonces solo pega el susto */
    aplastar(rec) {
      if (rec && api.reloj - rec.t0 < GRACIA) {
        rec.nodo.position.z += 0.06;
        api.sfx('resist'); api.buzz([20, 20]);
        api.pista('¡Casi! <b>No lo toques</b>: arrastra desde él hasta la composta.', 2800);
        return false;
      }
      api.arruinar(ARRUINADO.aplastado(nombre));
      return true;
    },
    /* ¿hay algún bicho suelto a menos de `r` de este punto? */
    cercaDe(punto, r) {
      return lista.find(x => x.estado === 'suelto'
        && Math.hypot(x.nodo.position.x - punto.x, x.nodo.position.z - punto.z) < r) || null;
    },

    /* la versión pantalla de `cercaDe`, para el pellizco: en vez de
       medir en el mundo (y exigir que el dedo caiga sobre el mesón
       exactamente donde está el bicho), mide en píxeles de pantalla
       contra dónde se VE el bicho — que es justo lo que el pellizco
       puede juzgar con generosidad sin volverse trampa. */
    masCercaEnPantalla(clienteX, clienteY, radioPx = 70) {
      let mejor = null, mejorD = radioPx;
      for (const rec of lista) {
        if (rec.estado !== 'suelto') continue;
        const mundo = rec.nodo.position.clone();
        mundo.y += ALTO + 0.03;
        const p = api.proyectar(mundo);
        const d = Math.hypot(p.x - clienteX, p.y - clienteY);
        if (d < mejorD) { mejorD = d; mejor = rec; }
      }
      return mejor;
    },

    agarrar(rec) {
      if (!rec || rec.estado !== 'suelto') return false;
      rec.estado = 'cargado';
      cargado = rec;
      rec.bicho.aro.visible = false;
      api.sfx('tab'); api.buzz(12);
      api.aviso('Llévalo a la composta 🌿');
      return true;
    },
    llevando() { return !!cargado; },
    /* `punto` es dónde cae el dedo sobre el mesón. El bicho se dibuja
       más alto —se ve cargado en la mano— pero lo que cuenta para
       soltarlo es el punto del mesón: si juzgáramos por dónde flota,
       el jugador tendría que pasarse de largo de la composta para
       que le valiera, y eso se siente roto. */
    mover(punto) {
      if (!cargado || !punto) return;
      cargado.suelo = { x: punto.x, z: punto.z };
      cargado.nodo.position.set(punto.x, api.MESA_Y + 0.45, punto.z);
      cargado.nodo.rotation.z = Math.sin(api.reloj * 12) * 0.3;
    },
    /* devuelve 'composta' si lo botaste bien, 'devuelto' si se te cayó */
    soltarMano() {
      if (!cargado) return null;
      const rec = cargado; cargado = null;
      const p = rec.suelo || rec.nodo.position;
      if (Math.hypot(p.x - api.COMPOSTA.x, p.z - api.COMPOSTA.z) < CERCA_COMPOSTA) {
        rec.estado = 'ido';
        api.volarA(rec.nodo, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.35, alto: 0.35 });
        api.chispas(api.COMPOSTA.clone().setY(api.MESA_Y + 0.4), '#8ab143', 10);
        api.sfx('bien'); api.buzz([15, 25]);
        api.aviso(null);
        api.toast('¡Fuera de la olla! 🌿');
        return 'composta';
      }
      rec.estado = 'suelto';
      rec.bicho.aro.visible = true;
      rec.nodo.position.y = SUELO(rec.nodo.position.x, rec.nodo.position.z) + ALTO;
      rec.nodo.rotation.z = 0;
      api.sfx('resist');
      api.aviso(`🪱 Se te resbaló. Otra vez: hasta la composta`);
      return 'devuelto';
    },

    actualizar(dt, t) {
      for (const rec of lista) {
        if (rec.estado === 'ido') continue;
        rec.bicho.animar(t);
        if (rec.estado !== 'suelto') continue;
        const p = rec.nodo.position;
        const dx = destino.x - p.x, dz = destino.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < CERCA_BATEA) {
          rec.estado = 'ido';
          api.arruinar(ARRUINADO.enLaBatea(nombre));
          return true;
        }
        p.x += (dx / d) * VEL * dt;
        p.z += (dz / d) * VEL * dt;
        p.y = SUELO(p.x, p.z) + ALTO;    /* sube y baja de la tabla */
        rec.nodo.rotation.y = Math.atan2(dx, dz);
      }
      return false;
    },

    destruir() {
      lista.length = 0;
      cargado = null;
      if (grupo.parent) grupo.parent.remove(grupo);
    },
  };
}
