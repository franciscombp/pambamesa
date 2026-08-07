/* ============================================================
   FANESCA — main.js
   El juego alrededor de los niveles: pantallas, progreso, reloj,
   cucharas, guardado y el puente entre el motor 3D y el HUD.

   Aquí no hay ni un grano de maíz: cada ingrediente vive en su
   propio `nivel-<id>.js`. Este archivo solo sabe montarlos,
   cronometrarlos y celebrarlos.
   ============================================================ */

import Motor, { MESA_Y, BATEA, COMPOSTA } from './motor3d.js';
import { NIVELES, porId, cucharasDe, tiempoBonito } from './niveles.js';
import { HISTORIA, TARJETAS, CIERRE, CACUANGO_PARAMO } from './historia.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const SAVE_KEY = 'pambamesa_fanesca_v1';

/* ---------- estado ---------- */

function nuevoEstado() {
  return { mejores: {}, vistoPortada: false, intentos: 0, arruinadas: 0, leidos: [], cuadernoVisto: true };
}
let estado = nuevoEstado();
function guardar() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(estado)); } catch (e) {} }
function cargar() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return (s && typeof s === 'object') ? Object.assign(nuevoEstado(), s) : null;
  } catch (e) { return null; }
}

const estaListo = (id) => !!estado.mejores[id];
const listos = () => NIVELES.filter(n => estaListo(n.id)).length;

/* el siguiente se abre cuando el anterior ya fue a la olla; los
   ya hechos quedan siempre abiertos para bajarse el tiempo */
function desbloqueado(i) { return i === 0 || estaListo(NIVELES[i - 1].id); }

/* ---------- sonido y vibración (mismo lenguaje que el juego grande) ---------- */

let audioCtx = null;
function initAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; } }
  if (audioCtx && audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch (e) {} }
}
const SFX = {
  pop:   [{ f: 720, d: .05, g: .07 }],
  pop2:  [{ f: 840, d: .05, g: .07 }],
  crack: [{ f: 260, d: .07, g: .06, w: 'square' }],
  resist:[{ f: 150, d: .08, g: .05, w: 'sawtooth' }],
  corte: [{ f: 950, d: .1, g: .06, w: 'triangle' }, { f: 520, t: .05, d: .12, g: .05, w: 'triangle' }],
  frotar:[{ f: 320, d: .06, g: .035, w: 'sawtooth' }],
  tab:   [{ f: 620, d: .05, g: .07 }],
  mal:   [{ f: 190, d: .3, g: .11, w: 'sawtooth' }, { f: 120, t: .12, d: .35, g: .1, w: 'sawtooth' }],
  bien:  [{ f: 523, d: .1, g: .1 }, { f: 659, t: .08, d: .1, g: .1 }, { f: 784, t: .16, d: .22, g: .12 }],
  fiesta:[{ f: 523, d: .12, g: .1 }, { f: 659, t: .1, d: .12, g: .1 }, { f: 784, t: .2, d: .12, g: .1 }, { f: 1046, t: .3, d: .3, g: .12 }],
};
function sfx(tipo) {
  initAudio(); if (!audioCtx) return;
  const now = audioCtx.currentTime;
  (SFX[tipo] || []).forEach(n => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = n.w || 'sine'; o.frequency.value = n.f;
    const t0 = now + (n.t || 0), dur = n.d || .1;
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(n.g || .1, t0 + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur + .03);
  });
}
function buzz(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

let toastId = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastId);
  toastId = setTimeout(() => t.classList.remove('visible'), 2400);
}

/* ---------- piezas de interfaz ---------- */

const CUCHARA_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <ellipse cx="12" cy="7" rx="5.2" ry="6.4" fill="#f2b31f" stroke="#96622b" stroke-width="1.6"/>
  <ellipse cx="10.4" cy="5" rx="2" ry="2.6" fill="#ffd24d" opacity=".8"/>
  <path d="M12 13.2 V21" stroke="#96622b" stroke-width="3.4" stroke-linecap="round"/>
</svg>`;

function cucharasHTML(n) {
  return [0, 1, 2].map(i => `<span class="cuchara${i < n ? ' llena' : ''}">${CUCHARA_SVG}</span>`).join('');
}
function icono(id) { return (typeof iconOf === 'function') ? iconOf(id) : ''; }

function mostrar(pantalla) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + pantalla));
  Motor.setActive(pantalla === 'juego');
  if (pantalla === 'mesa') { renderMesa(); marcaCuaderno(); }
  if (pantalla === 'cuaderno') { renderCuaderno(); estado.cuadernoVisto = true; guardar(); }
}

/* ---------- la mesa de prep ---------- */

const FRASES_OLLA = [
  'Todavía está el agua sola. Prepara un ingrediente.',
  'Ya hay algo adentro. Huele a que empieza.',
  'Va tomando cuerpo. Sigue con el siguiente.',
  'Media fanesca. La cocina ya huele a jueves santo.',
  'Falta poquito. No aflojes ahora.',
  '¡Los doce granos completos! Que hierva despacio.',
];

function renderMesa() {
  const hechos = listos();
  $('#mesa-progreso').textContent = `${hechos} / ${NIVELES.length}`;
  $('#olla-nivel').style.height = Math.round(hechos / NIVELES.length * 100) + '%';
  $('#olla-frase').textContent = FRASES_OLLA[Math.min(hechos, FRASES_OLLA.length - 1)];

  const lista = $('#mesa-lista');
  lista.innerHTML = '';
  NIVELES.forEach((n, i) => {
    const abierto = desbloqueado(i);
    const mejor = estado.mejores[n.id];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'ingrediente' + (abierto ? '' : ' bloqueado');
    card.innerHTML = `
      <span class="plate">${icono(n.icono)}</span>
      <span class="ing-datos">
        <span class="ing-tarea">${n.tarea}</span>
        <span class="ing-nombre">${n.nombre}</span>
        <span class="ing-marca">${mejor ? 'tu mejor: ' + tiempoBonito(mejor.ms) : (abierto ? 'sin preparar' : 'se abre con el anterior')}</span>
      </span>
      <span class="ing-estado">
        ${abierto
          ? (mejor ? `<span class="ing-listo">✓</span><span class="cucharas">${cucharasHTML(mejor.cucharas)}</span>`
                   : `<span class="cucharas">${cucharasHTML(0)}</span>`)
          : '<span class="ing-candado">🔒</span>'}
      </span>`;
    card.addEventListener('click', () => {
      sfx('tab');
      if (!abierto) { toast('Primero termina ' + NIVELES[i - 1].nombre.toLowerCase()); return; }
      abrirBrief(n.id);
    });
    lista.appendChild(card);
  });
}

/* ---------- el cuaderno ---------- */

/* Un capítulo se abre cuando lo desbloqueó un ingrediente. La
   historia no se regala de entrada: se gana con las manos, igual
   que en la cocina. */
const capituloAbierto = (id) => (estado.leidos || []).includes(id);

function abrirCapitulo(id) {
  if (!id || capituloAbierto(id)) return false;
  estado.leidos = [...(estado.leidos || []), id];
  estado.cuadernoVisto = false;
  guardar();
  return true;
}

function renderCuaderno() {
  $('#cuaderno-entradilla').textContent = HISTORIA.entradilla;
  const cont = $('#cuaderno-capitulos');
  cont.innerHTML = '';

  HISTORIA.capitulos.forEach(cap => {
    const art = document.createElement('article');
    art.className = 'capitulo' + (capituloAbierto(cap.id) ? '' : ' cerrado');
    const cabeza = `<div class="capitulo-head">
        <span class="plate">${icono(cap.icono)}</span>
        <h3 class="capitulo-titulo">${cap.titulo}</h3>
      </div>`;
    if (!capituloAbierto(cap.id)) {
      art.innerHTML = cabeza + '<p class="capitulo-cerrojo">Todavía no. Prepara ingredientes y esta página se abre sola.</p>';
      cont.appendChild(art);
      return;
    }
    let html = cabeza + cap.cuerpo.map(p => `<p>${p}</p>`).join('');
    if (cap.granos) {
      html += `<div class="granos-mapa">${cap.granos.map(g =>
        `<span class="grano-chip ${g.de}">${g.n}</span>`).join('')}</div>
        <div class="granos-leyenda">
          <span class="grano-chip aca">de este lado del mar</span>
          <span class="grano-chip alla">del otro</span>
        </div>`;
    }
    const citas = cap.citas || (cap.cita ? [cap.cita] : []);
    citas.forEach(c => {
      html += `<blockquote class="cita"><p>«${c.texto}»</p>
        <footer>${c.quien}<span>${c.datos}</span></footer></blockquote>`;
    });
    art.innerHTML = html;
    cont.appendChild(art);
  });

  $('#cuaderno-fuentes-lista').innerHTML = HISTORIA.fuentes
    .map(f => `<li><a href="${f.u}" target="_blank" rel="noopener">${f.t}</a></li>`).join('');
}

function marcaCuaderno() {
  const hayNuevo = !estado.cuadernoVisto && (estado.leidos || []).length > 0;
  $('#cuaderno-nuevo').classList.toggle('hidden', !hayNuevo);
}

/* ---------- el brief antes de cada nivel ---------- */

let nivelPendiente = null;

function abrirBrief(id) {
  const n = porId(id);
  nivelPendiente = id;
  const mejor = estado.mejores[id];
  $('#brief-art').innerHTML = `<span class="plate">${icono(n.icono)}</span>`;
  $('#brief-tarea').textContent = n.tarea;
  $('#brief-nombre').textContent = n.nombre;
  $('#brief-gesto').innerHTML = n.gesto;
  $('#brief-bicho').innerHTML = `⚠️ Ojo con <b>${n.bicho}</b>: si lo aplastas o se te cuela a la batea, se arruina todo y empiezas de nuevo.`;
  $('#brief-nota').textContent = n.nota || '';
  $('#brief-mejor').textContent = mejor
    ? `Tu mejor tiempo: ${tiempoBonito(mejor.ms)} · ${mejor.cucharas} cuchara${mejor.cucharas > 1 ? 's' : ''}`
    : `3 cucharas si bajas de ${n.cucharas[0]}s`;
  $('#modal-brief').classList.add('open');
}

/* ---------- el nivel en curso ---------- */

let nivelActual = null;      /* datos de niveles.js */
let modActual = null;        /* el módulo cargado */
let t0 = 0, tiempoMs = 0, corriendo = false, relojId = null;
let hechosAhora = 0, totalAhora = 1;

function pintarReloj() {
  const el = $('#hud-tiempo');
  el.textContent = tiempoBonito(tiempoMs);
  const limite = nivelActual ? nivelActual.cucharas[0] * 1000 : Infinity;
  el.classList.toggle('apurado', tiempoMs > limite);
}

function arrancarReloj() {
  t0 = performance.now() - tiempoMs;
  corriendo = true;
  clearInterval(relojId);
  relojId = setInterval(() => {
    if (!corriendo) return;
    tiempoMs = performance.now() - t0;
    pintarReloj();
  }, 83);
}
function pararReloj() { corriendo = false; clearInterval(relojId); relojId = null; }

let pistaId = null;
function pista(msg, ms = 3200) {
  const p = $('#juego-pista');
  if (!msg) { p.classList.remove('visible'); return; }
  p.innerHTML = msg;
  p.classList.add('visible');
  clearTimeout(pistaId);
  if (ms) pistaId = setTimeout(() => p.classList.remove('visible'), ms);
}

let vozId = null;
/* Una cita no es un toast: se queda el tiempo suficiente para leerla
   y no interrumpe el juego, porque llega justo cuando el jugador
   acaba de HACER lo que la cita dice. */
function voz(cita, ms = 9000, opts = {}) {
  const v = $('#voz');
  if (!cita) { v.classList.remove('visible'); return; }
  /* sobre la escena va la versión corta si la hay: la cita entera se
     lee en el cuaderno, con su contexto y su fuente */
  $('#voz-texto').textContent = '«' + ((opts.corta && cita.corta) || cita.texto) + '»';
  $('#voz-quien').textContent = cita.quien;
  v.classList.add('visible');
  clearTimeout(vozId);
  vozId = setTimeout(() => v.classList.remove('visible'), ms);
}

let alertaId = null;
function alerta(msg) {
  const a = $('#hud-alerta');
  clearTimeout(alertaId);
  if (!msg) { a.classList.remove('visible'); return; }
  a.textContent = msg;
  a.classList.add('visible');
  alertaId = setTimeout(() => a.classList.remove('visible'), 4200);
}

/* lo que un nivel puede pedirle al juego */
const api = {
  MESA_Y, BATEA, COMPOSTA,
  progreso(hechos, total) {
    hechosAhora = hechos; totalAhora = total || 1;
    const k = Math.max(0, Math.min(1, hechos / totalAhora));
    $('#hud-barra').style.width = (k * 100) + '%';
    Motor.llenarRecipiente('batea', k);
  },
  composta(k) { Motor.llenarRecipiente('composta', Math.max(0, Math.min(1, k))); },
  completar() { if (corriendo) terminarNivel(); },
  arruinar(motivo) { if (corriendo) arruinarNivel(motivo); },
  aviso: alerta,
  pista,
  voz,
  /* un nivel puede abrir una página del cuaderno desde adentro */
  abrirCapitulo,
  toast,
  sfx, buzz,
  chispas: (...a) => Motor.chispas(...a),
  destello: (...a) => Motor.destello(...a),
  sacudir: (...a) => Motor.sacudir(...a),
  tween: (...a) => Motor.tween(...a),
  volarA: (...a) => Motor.volarA(...a),
  raycast: (...a) => Motor.raycast(...a),
  puntoEnPlano: (...a) => Motor.puntoEnPlano(...a),
  proyectar: (...a) => Motor.proyectar(...a),
  sombraBlob: (...a) => Motor.sombraBlob(...a),
  ojitos: (...a) => Motor.ojitos(...a),
  get reloj() { return Motor.reloj; },
};

function renderControles(mod) {
  const cont = $('#juego-controles');
  cont.innerHTML = '';
  const ctrls = (mod && mod.controles) || [];
  ctrls.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ctrl';
    b.innerHTML = `<span>${c.txt}</span>${c.tip ? `<span class="ctrl-tip">${c.tip}</span>` : ''}`;
    const abajo = (e) => { e.preventDefault(); b.classList.add('presionado'); if (mod.alControl) mod.alControl(c.id, 'abajo'); };
    const arriba = () => { b.classList.remove('presionado'); if (mod.alControl) mod.alControl(c.id, 'arriba'); };
    b.addEventListener('pointerdown', abajo);
    b.addEventListener('pointerup', arriba);
    b.addEventListener('pointerleave', arriba);
    b.addEventListener('pointercancel', arriba);
    cont.appendChild(b);
  });
  cont.classList.toggle('hidden', ctrls.length === 0);
  /* la pista se sube si no hay botones que esquivar */
  $('#juego-pista').style.bottom = ctrls.length
    ? '' : 'calc(env(safe-area-inset-bottom) + var(--sp-4))';
}

async function jugar(id) {
  const n = porId(id);
  if (!n) return;
  nivelActual = n;
  initAudio();
  $('#hud-tarea').textContent = `${n.tarea} · ${n.nombre.toLowerCase()}`;
  $('#hud-barra').style.width = '0%';
  tiempoMs = 0; hechosAhora = 0; totalAhora = 1;
  pintarReloj();
  alerta(null);
  mostrar('juego');

  try {
    const m = await n.modulo();
    modActual = m.default || m;
  } catch (e) {
    console.error(e);
    toast('No se pudo abrir ese ingrediente 😔');
    mostrar('mesa');
    return;
  }
  Motor.cargar(modActual, api);
  renderControles(modActual);
  pista(n.gesto, 5200);
  arrancarReloj();
  estado.intentos++;
  guardar();
}

function terminarNivel() {
  pararReloj();
  sfx('bien'); buzz([20, 40, 60]);
  Motor.destello('rgba(108,191,90,.45)');
  const n = nivelActual;
  const cuch = cucharasDe(n, tiempoMs);
  const previo = estado.mejores[n.id];
  const esRecord = !previo || tiempoMs < previo.ms;
  if (esRecord) estado.mejores[n.id] = { ms: Math.round(tiempoMs), cucharas: cuch };
  else estado.mejores[n.id].cucharas = Math.max(estado.mejores[n.id].cucharas, cuch);
  guardar();

  setTimeout(() => {
    Motor.setActive(false);
    $('#listo-nombre').textContent = n.nombre + ' a la olla';
    $('#listo-cucharas').innerHTML = cucharasHTML(cuch);
    $('#listo-tiempo').textContent = tiempoBonito(tiempoMs);
    $('#listo-mejor').textContent = esRecord
      ? (previo ? '¡Nuevo récord! antes: ' + tiempoBonito(previo.ms) : 'Primera vez que lo preparas')
      : 'Tu mejor sigue siendo ' + tiempoBonito(previo.ms);
    const tarjeta = TARJETAS[n.id];
    const caja = $('#listo-tarjeta');
    if (tarjeta) {
      caja.classList.remove('hidden');
      $('#tarjeta-titulo').textContent = tarjeta.titulo;
      $('#tarjeta-texto').textContent = tarjeta.texto;
      const cita = $('#tarjeta-cita');
      if (tarjeta.cita) {
        cita.classList.remove('hidden');
        $('#tarjeta-cita-texto').textContent = '«' + tarjeta.cita.texto + '»';
        $('#tarjeta-cita-quien').textContent = tarjeta.cita.quien;
      } else cita.classList.add('hidden');
      [].concat(tarjeta.abre || []).forEach(abrirCapitulo);
    } else caja.classList.add('hidden');

    const quedan = NIVELES.some(x => !estaListo(x.id));
    $('#listo-seguir').textContent = quedan ? 'Siguiente ingrediente' : 'Servir la fanesca';
    $('#modal-listo').classList.add('open');
    sfx('fiesta');
  }, 620);
}

function arruinarNivel(motivo) {
  pararReloj();
  sfx('mal'); buzz([60, 50, 120]);
  Motor.destello('rgba(230,57,70,.55)');
  Motor.sacudir(1.2);
  estado.arruinadas++;
  guardar();
  setTimeout(() => {
    Motor.setActive(false);
    $('#arruinado-titulo').textContent = motivo && motivo.titulo ? motivo.titulo : 'Se arruinó la olla';
    $('#arruinado-motivo').textContent = motivo && motivo.texto
      ? motivo.texto
      : 'Un bicho llegó a la comida. Toca botar todo y volver a empezar.';
    $('#modal-arruinado').classList.add('open');
  }, 900);
}

function salirDelNivel() {
  pararReloj();
  Motor.descargar();
  Motor.setActive(false);
  nivelActual = null; modActual = null;
  alerta(null); pista(null); voz(null);
  mostrar('mesa');
}

/* ---------- eventos ---------- */

function cerrarModales() { $$('.modal').forEach(m => m.classList.remove('open')); }

function bindEventos() {
  $('#btn-empezar').addEventListener('click', () => {
    initAudio(); sfx('tab');
    estado.vistoPortada = true; guardar();
    mostrar('mesa');
  });

  $('#brief-ok').addEventListener('click', () => {
    cerrarModales();
    if (nivelPendiente) jugar(nivelPendiente);
  });
  $('#brief-cancelar').addEventListener('click', cerrarModales);
  $('#modal-brief').addEventListener('click', (e) => { if (e.target === $('#modal-brief')) cerrarModales(); });

  $('#voz').addEventListener('click', () => voz(null));
  $('#btn-cuaderno').addEventListener('click', () => { sfx('tab'); mostrar('cuaderno'); });
  $('#cuaderno-volver').addEventListener('click', () => { sfx('tab'); mostrar('mesa'); });
  $('#final-cuaderno').addEventListener('click', () => { cerrarModales(); mostrar('cuaderno'); });

  $('#btn-salir').addEventListener('click', () => { sfx('tab'); salirDelNivel(); });

  $('#listo-seguir').addEventListener('click', () => {
    cerrarModales();
    const quedan = NIVELES.find(x => !estaListo(x.id));
    Motor.descargar();
    nivelActual = null; modActual = null;
    if (quedan) { mostrar('mesa'); setTimeout(() => abrirBrief(quedan.id), 260); }
    else { mostrar('mesa'); setTimeout(mostrarFinal, 300); }
  });
  $('#listo-repetir').addEventListener('click', () => {
    const id = nivelActual ? nivelActual.id : null;
    cerrarModales();
    Motor.descargar();
    if (id) jugar(id);
  });

  $('#arruinado-reintentar').addEventListener('click', () => {
    const id = nivelActual ? nivelActual.id : null;
    cerrarModales();
    Motor.descargar();
    if (id) jugar(id);
  });
  $('#arruinado-salir').addEventListener('click', () => { cerrarModales(); salirDelNivel(); });

  $('#final-ok').addEventListener('click', () => { cerrarModales(); mostrar('mesa'); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($$('.modal.open').length) { cerrarModales(); return; }
      if ($('#screen-juego').classList.contains('active')) salirDelNivel();
      else if ($('#screen-cuaderno').classList.contains('active')) mostrar('mesa');
    }
  });

  /* el navegador se fue a otra pestaña: no correr el reloj de gratis */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && corriendo) { corriendo = false; }
    else if (!document.hidden && relojId && !corriendo) { arrancarReloj(); }
  });
}

function mostrarFinal() {
  const total = NIVELES.reduce((a, n) => a + (estado.mejores[n.id] ? estado.mejores[n.id].ms : 0), 0);
  const cuch = NIVELES.reduce((a, n) => a + (estado.mejores[n.id] ? estado.mejores[n.id].cucharas : 0), 0);
  $('#final-cierre').textContent = CIERRE;
  $('#final-voz').innerHTML = `«${CACUANGO_PARAMO.texto}»<span>${CACUANGO_PARAMO.quien}</span>`;
  $('#final-total').textContent = `${cuch} de ${NIVELES.length * 3} cucharas · ${tiempoBonito(total)} en total`;
  HISTORIA.capitulos.forEach(c => abrirCapitulo(c.id));
  $('#modal-final').classList.add('open');
  sfx('fiesta');
}

/* ---------- arranque ---------- */

function init() {
  estado = cargar() || nuevoEstado();

  /* los gradientes de acuarela de los iconos del juego grande */
  if (typeof ICON_DEFS === 'string') document.body.insertAdjacentHTML('beforeend', ICON_DEFS);
  $$('[data-icon]').forEach(n => { n.innerHTML = icono(n.dataset.icon); });

  const cont = $('#escena');
  let ok = false;
  try { ok = Motor.init(cont, $('#destello')); } catch (e) { ok = false; }
  if (!ok) {
    cont.innerHTML = `<div class="panel" style="margin:var(--sp-8) var(--sp-5)">
      <p><b>Este minijuego necesita WebGL.</b></p>
      <p class="muted">Tu navegador no lo tiene activado, así que la mesa de prep no puede armarse.
      La cocina de Pambamesa sí funciona: <a href="../">volver</a>.</p></div>`;
  }

  bindEventos();
  mostrar(estado.vistoPortada ? 'mesa' : 'portada');
}

/* una ventanita al juego, como `window.Escena3D` en la cocina grande:
   sirve para depurar en la consola y para probarlo automatizado */
window.Fanesca = {
  Motor, NIVELES,
  get estado() { return estado; },
  get nivel() { return nivelActual; },
  jugar,
  sondear: (x, y) => Motor.sondear(x, y),
  puntos: () => ({ batea: Motor.proyectar(BATEA), composta: Motor.proyectar(COMPOSTA) }),
};

document.addEventListener('DOMContentLoaded', init);
