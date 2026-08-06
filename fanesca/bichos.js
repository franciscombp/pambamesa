/* ============================================================
   FANESCA — bichos.js
   Los invitados que nadie quiere en la olla.

   Todos los niveles comparten la misma gramática, y por eso los
   bichos se arman en un solo sitio: si el gusanito del choclo y el
   del zapallo se vieran distinto, el jugador tendría que aprender
   dos veces la misma regla. Aquí viven su forma, su aro rojo de
   alarma y su meneo.

   La regla, en los cinco niveles:
     · tocarlo        → lo aplastas → se arruina la olla
     · pasarle el dedo por encima → lo mismo
     · arrastrar DESDE él → lo cargas, y lo sueltas en la composta
   ============================================================ */

/* el aro rojo que late: la única señal que el jugador necesita
   para saber "esto no se toca" */
function aroDeAlarma(THREE, r) {
  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(r, r * 0.11, 8, 22),
    new THREE.MeshBasicMaterial({ color: '#e63946', transparent: true, opacity: 0.9 })
  );
  aro.rotation.x = Math.PI / 2;
  aro.userData.ignorar = true;   /* el aro no se raycastea: sería trampa */
  return aro;
}

/* ---------- gusanito: choclo, habas y zapallo ---------- */

/* `eje` dice hacia dónde crece el cuerpo desde la cabeza:
     'z' — tumbado en la mesa, cabeza hacia +Z (el que camina por la tabla)
     'y' — trepando, cabeza hacia +Y y cara hacia +Z (el de la mazorca,
           donde +Y es el eje del choclo y +Z lo que mira la cámara) */
export function nuevoGusano(THREE, api, opts = {}) {
  const k = opts.escala || 1;
  const eje = opts.eje || 'z';
  const segmentos = opts.segmentos || 5;
  const claro = new THREE.MeshLambertMaterial({ color: opts.color || '#a8d05a' });
  const oscuro = new THREE.MeshLambertMaterial({ color: opts.color2 || '#8ab143' });

  const obj = new THREE.Group();
  const seg = [];
  for (let i = 0; i < segmentos; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry((0.062 - i * 0.005) * k, 9, 7),
      i % 2 ? oscuro : claro
    );
    if (eje === 'y') s.position.y = -i * 0.075 * k;
    else s.position.z = -i * 0.075 * k;
    obj.add(s);
    seg.push(s);
  }
  seg[0].add(api.ojitos(0.028 * k, 0.022 * k, 0.05 * k, 0.019 * k));

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
      if (aro.visible) {
        const e = 1 + Math.sin(t * 6) * 0.14;
        aro.scale.set(e, e, 1);
        aro.material.opacity = 0.55 + Math.sin(t * 6) * 0.3;
      }
    },
  };
}

/* ---------- gorgojo: el escarabajito del fréjol ---------- */

export function nuevoGorgojo(THREE, api, opts = {}) {
  const k = opts.escala || 1;
  const obj = new THREE.Group();

  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.075 * k, 12, 9),
    new THREE.MeshLambertMaterial({ color: '#5a4630' })
  );
  cuerpo.scale.set(0.8, 0.62, 1.15);
  const caparazon = new THREE.Mesh(
    new THREE.SphereGeometry(0.072 * k, 12, 9, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#7a5c3c' })
  );
  caparazon.scale.set(0.82, 0.5, 1.1);
  caparazon.position.y = 0.012 * k;
  const raya = new THREE.Mesh(
    new THREE.BoxGeometry(0.006 * k, 0.05 * k, 0.15 * k),
    new THREE.MeshLambertMaterial({ color: '#3a2a20' })
  );
  raya.position.y = 0.03 * k;
  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(0.042 * k, 10, 8),
    new THREE.MeshLambertMaterial({ color: '#3f3122' })
  );
  cabeza.position.set(0, 0.005 * k, 0.078 * k);
  cabeza.add(api.ojitos(0.022 * k, 0.014 * k, 0.032 * k, 0.014 * k));
  /* la trompita del gorgojo, que es su marca */
  const trompa = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008 * k, 0.012 * k, 0.06 * k, 6),
    new THREE.MeshLambertMaterial({ color: '#3f3122' })
  );
  trompa.rotation.x = Math.PI / 2.2;
  trompa.position.set(0, -0.008 * k, 0.115 * k);

  const patas = [];
  [-1, 1].forEach(s => [-0.045, 0, 0.045].forEach(z => {
    const pata = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006 * k, 0.005 * k, 0.06 * k, 5),
      new THREE.MeshLambertMaterial({ color: '#3a2a20' })
    );
    pata.position.set(0.06 * k * s, -0.03 * k, z * k);
    pata.rotation.z = s * 0.7;
    patas.push(pata);
    obj.add(pata);
  }));

  obj.add(cuerpo, caparazon, raya, cabeza, trompa);
  const aro = aroDeAlarma(THREE, 0.15 * k);
  aro.position.y = -0.05 * k;
  obj.add(aro);

  const fase = Math.random() * 6;
  return {
    obj, aro,
    animar(t) {
      patas.forEach((pt, i) => { pt.rotation.x = Math.sin(t * 14 + i * 1.4 + fase) * 0.45; });
      obj.children[0].position.y = Math.sin(t * 14 + fase) * 0.004 * k;
      if (aro.visible) {
        const e = 1 + Math.sin(t * 6) * 0.14;
        aro.scale.set(e, e, 1);
        aro.material.opacity = 0.55 + Math.sin(t * 6) * 0.3;
      }
    },
  };
}

/* ---------- mosca: la que ronda el bacalao ---------- */

export function nuevaMosca(THREE, api, opts = {}) {
  const k = opts.escala || 1;
  const obj = new THREE.Group();

  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.055 * k, 10, 8),
    new THREE.MeshLambertMaterial({ color: '#3c3a3f' })
  );
  cuerpo.scale.set(0.75, 0.7, 1.25);
  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(0.038 * k, 10, 8),
    new THREE.MeshLambertMaterial({ color: '#2b2a2e' })
  );
  cabeza.position.z = 0.06 * k;
  /* ojos rojos enormes: se lee de lejos que es una mosca */
  [-1, 1].forEach(s => {
    const o = new THREE.Mesh(
      new THREE.SphereGeometry(0.026 * k, 8, 6),
      new THREE.MeshLambertMaterial({ color: '#c0392b' })
    );
    o.position.set(0.024 * k * s, 0.008 * k, 0.075 * k);
    obj.add(o);
  });

  const matAla = new THREE.MeshBasicMaterial({
    color: '#eaf4f6', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
  });
  const alas = [-1, 1].map(s => {
    const a = new THREE.Mesh(new THREE.CircleGeometry(0.07 * k, 12, 0, Math.PI), matAla);
    a.position.set(0.03 * k * s, 0.03 * k, -0.01 * k);
    a.rotation.set(-Math.PI / 2.4, 0, s * 0.5);
    a.userData.ignorar = true;
    obj.add(a);
    return { m: a, s };
  });

  obj.add(cuerpo, cabeza);
  const aro = aroDeAlarma(THREE, 0.14 * k);
  aro.position.y = -0.05 * k;
  obj.add(aro);

  const fase = Math.random() * 6;
  return {
    obj, alas, aro,
    animar(t) {
      alas.forEach(({ m, s }) => { m.rotation.z = s * (0.5 + Math.sin(t * 42 + fase) * 0.55); });
      if (aro.visible) {
        const e = 1 + Math.sin(t * 7) * 0.16;
        aro.scale.set(e, e, 1);
        aro.material.opacity = 0.5 + Math.sin(t * 7) * 0.32;
      }
    },
  };
}

/* ---------- los motivos de que se arruine, en un solo sitio ---------- */

export const ARRUINADO = {
  aplastado: (bicho = 'gusanito') => ({
    titulo: 'Lo aplastaste',
    texto: `El ${bicho} reventó encima de la comida. Con eso ya no hay nada que hacer: se bota todo y se empieza de nuevo.`,
  }),
  enLaBatea: (bicho = 'gusanito') => ({
    titulo: 'Se te fue a la batea',
    texto: `El ${bicho} llegó hasta la batea y se mezcló con lo bueno. Ya no se puede separar: toca botar todo y empezar de nuevo.`,
  }),
};
