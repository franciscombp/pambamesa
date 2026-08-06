/* ============================================================
   PAMBAMESA — app.js
   El motor del juego.

   Tres capas de inventario, a propósito:
   - state.discovered → EL RECETARIO. Permanente, nunca se pierde.
   - state.stock      → LA DESPENSA. Todo lo que tienes guardado.
   - state.canasta    → LA CANASTA. Solo lo que elegiste llevar al
                        mesón. Chica (CANASTA_MAX) para que cocinar
                        sea elegir, no bucear en una lista enorme.

   Las preparaciones no ocupan canasta: aparecen solas en la repisa
   del mesón. Los utensilios tampoco: son las estaciones.
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SAVE_KEY = 'pambamesa_save_v3';
const RARITY_LABEL = { semilla: 'Ingrediente', hallazgo: 'Preparación', receta: 'Platillo' };
const CANASTA_MAX = 8;

/* ---------- Economía ---------- */

const SOBRE_TAM = 3;
const SOBRE_INTERVALO_MS = 3 * 60 * 60 * 1000;
const SOBRE_MAX_STASH = 3;
const REGALOS_DIARIOS_MAX = 3;

const SUCRES_POR_COCINAR = 1;
const SUCRES_POR_RAREZA = { semilla: 3, hallazgo: 6, receta: 25 };
const SUCRES_POR_RECETA_REPETIDA = 8;
const MERCADO_COSTO_SEMILLA = 4;
const MERCADO_COSTO_SOBRE = 20;
const PREGON_COOLDOWN_MS = 20 * 60 * 1000;
const PREGON_RECOMPENSA = 15;

const RACHA_RECOMPENSAS = [5, 8, 12, 16, 20, 25, 40];
const COMBO_CADA = 3;
const COMBO_BONO = 5;

function regionesAbiertas() { return state.regionsUnlocked || ['costa']; }

function tablaDeSobre() {
  const abiertas = regionesAbiertas();
  const semillas = GAME_DATA.ingredientes.filter(i => abiertas.includes(i.region)).map(i => i.id);
  const hallazgos = CARTA_ORDEN.filter(id => CARTAS[id].rarity === 'hallazgo' && abiertas.includes(CARTAS[id].region));
  const recetas = CARTA_ORDEN.filter(id => CARTAS[id].rarity === 'receta' && abiertas.includes(CARTAS[id].region));
  return [
    { peso: 62, tipo: 'semilla',  pool: semillas },
    { peso: 28, tipo: 'hallazgo', pool: hallazgos },
    { peso: 10, tipo: 'receta',   pool: recetas },
  ].filter(t => t.pool.length);
}
function sacarCarta() {
  const tabla = tablaDeSobre();
  const total = tabla.reduce((s, t) => s + t.peso, 0);
  let r = Math.random() * total;
  for (const t of tabla) { r -= t.peso; if (r <= 0) return { tipo: t.tipo, id: t.pool[Math.floor(Math.random() * t.pool.length)] }; }
  return { tipo: tabla[0].tipo, id: tabla[0].pool[0] };
}

/* ---------- Estado ---------- */

function newState() {
  return {
    discovered: [],
    stock: {},
    canasta: [],              /* ids al alcance en el mesón */
    tools: {},                /* estaciones abiertas: {id: true} */
    estacion: 'cuchillo',
    regionsUnlocked: ['costa'],
    sobres: 0,
    proximoSobreGratisEn: 0,
    regalosHechos: { fecha: '', usados: 0 },
    regalosCanjeados: [],
    sucres: 0,
    pregonProximoEn: 0,
    racha: { dias: 0, ultimaFecha: '' },
    seenCover: false,
    starterOpened: false,
  };
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s) return null;
    return Object.assign(newState(), s);
  } catch (e) { return null; }
}

let state = null;
let currentScreen = 'cover';
let slots = [null, null];
let feriaTimerId = null;
let escenaOn = false;

const stockOf = (id) => state.stock[id] || 0;
function addStock(id, n) { state.stock[id] = Math.max(0, (state.stock[id] || 0) + n); }
function discoverCard(id) { if (!state.discovered.includes(id)) { state.discovered.push(id); return true; } return false; }

/* ---------- Estaciones ---------- */

const tieneEstacion = (id) => !!(state.tools && state.tools[id]);
function estacionesAbiertas() {
  return UTENSILIOS.filter(u => regionesAbiertas().includes(u.region) && tieneEstacion(u.id)).map(u => u.id);
}
function nombreEstacion(id) { const u = UTENSILIOS.find(x => x.id === id); return u ? u.name : id; }
function verboEstacion(id) { const u = UTENSILIOS.find(x => x.id === id); return u ? u.verbo : ''; }

/* ---------- Regiones ---------- */

let pendingRegionUnlock = null;
function revisarDesbloqueoRegiones() {
  for (const rid of REGION_ORDEN) {
    const r = REGIONES[rid];
    if (!r.desbloqueo_recetas || regionesAbiertas().includes(rid)) continue;
    if (r.desbloqueo_recetas.every(plato => state.discovered.includes(plato))) { pendingRegionUnlock = rid; return; }
  }
}
function iniciarSobreDeRegion(rid) {
  const r = REGIONES[rid];
  if (!state.regionsUnlocked.includes(rid)) state.regionsUnlocked.push(rid);
  const items = [];
  r.kitHerramientas.forEach(id => { const isNew = !tieneEstacion(id); state.tools[id] = true; items.push({ id, tool: true, isNew }); });
  r.kitSemillas.forEach(x => { addStock(x.id, x.n); items.push({ id: x.id, tool: false, isNew: discoverCard(x.id) }); });
  r.kitSemillas.slice(0, 4).forEach(x => {
    if (!state.canasta.includes(x.id) && state.canasta.length < CANASTA_MAX) state.canasta.push(x.id);
  });
  if (!tieneEstacion(state.estacion)) state.estacion = estacionesAbiertas()[0] || 'cuchillo';
  save();
  procesarColeccionables(items, { finalLabel: `¡A cocinar ${r.nombre}! ✦`, finalCb: () => banner(`Nuevo menú: ${r.nombre}`, '🍽') });
}

/* ---------- Juice: sonido y vibración ---------- */

let audioCtx = null;
function initAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; } }
  if (audioCtx && audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch (e) {} }
}
const SFX = {
  tab:  [{ f: 620, d: .05, g: .07 }],
  fail: [{ f: 200, d: .18, g: .09, w: 'sawtooth' }],
  win:  [{ f: 523, d: .1, g: .1 }, { f: 659, t: .08, d: .1, g: .1 }, { f: 784, t: .16, d: .18, g: .12 }],
  flip: [{ f: 440, d: .07, g: .08 }, { f: 660, t: .05, d: .08, g: .07 }],
  peel: [{ f: 300, d: .06, g: .05 }],
  swap: [{ f: 380, d: .07, g: .06 }, { f: 520, t: .06, d: .08, g: .06 }],
};
function sfx(type) {
  initAudio(); if (!audioCtx) return;
  const now = audioCtx.currentTime;
  (SFX[type] || []).forEach(n => {
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

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2600);
}
let bannerTimer = null;
function banner(msg, icon = '🍽') {
  const b = $('#banner');
  b.innerHTML = `<span class="banner-ic" aria-hidden="true">${icon}</span><span class="banner-txt">${msg}</span>`;
  b.classList.remove('visible'); void b.offsetWidth; b.classList.add('visible');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('visible'), 3600);
}
function el(tag, cls, text) { const n = document.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; }
const nombreDe = (id) => (isUtensilio(id) ? nombreEstacion(id) : (CARTAS[id] ? CARTAS[id].name : id));

/* ---------- Fichas de carta ---------- */

function cardInner(id, { showName = true } = {}) {
  const c = CARTAS[id];
  return `
    <div class="carta-art">${iconOf(id)}</div>
    <div class="carta-plate">
      ${showName ? `<span class="carta-nombre">${c.name}</span>` : ''}
      <span class="carta-rareza">${RARITY_LABEL[c.rarity]}</span>
    </div>
    ${c.rarity === 'receta' ? '<span class="carta-foil" aria-hidden="true"></span>' : ''}`;
}
function cardBackInner() { return `<div class="carta-textura" aria-hidden="true"></div><span class="carta-interrogante">?</span>`; }
function toolInner(id) {
  return `<div class="carta-art">${iconOf(id)}</div><div class="carta-plate"><span class="carta-nombre">${nombreEstacion(id)}</span><span class="carta-rareza">Estación</span></div>`;
}
function chipDe(id, { n = null, costo = null, activo = false, onClick = null } = {}) {
  const c = CARTAS[id];
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `carta-mini rarity-${c ? c.rarity : 'tool'}` + (activo ? ' activo' : '');
  btn.innerHTML =
    (n != null ? `<span class="mini-cant">${n}</span>` : '') +
    `<span class="mini-icon">${iconOf(id)}</span><span class="mini-name">${nombreDe(id)}</span>` +
    (costo != null ? `<span class="mini-costo">${costo} <span class="icono-sucre">S</span></span>` : '');
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

/* ============================================================
   LA COCINA
   ============================================================ */

function reservado(id) { return slots.filter(s => s === id).length; }
function canastaItems() {
  return state.canasta.map(id => ({ id, n: stockOf(id) - reservado(id) })).filter(x => x.n > 0);
}
function repisaItems() {
  return CARTA_ORDEN
    .filter(id => CARTAS[id].rarity !== 'semilla' && stockOf(id) > 0)
    .map(id => ({ id, n: stockOf(id) - reservado(id) }))
    .filter(x => x.n > 0);
}
function disponible(id) { return stockOf(id) - reservado(id) > 0; }

function syncEscena(extra = {}) {
  if (!escenaOn) return;
  Escena3D.sync(Object.assign({
    canasta: canastaItems(),
    repisa: repisaItems(),
    slots: slots.slice(),
    estacion: state.estacion,
  }, extra));
}

function renderTaller() {
  if (escenaOn) {
    syncEscena();
    renderEstacionFichas();
    renderMesaEtiquetas();
  } else {
    const a = $('#slot-a'), b = $('#slot-b');
    a.innerHTML = slots[0] ? mesaItemInner(slots[0]) : slotEmptyHTML();
    a.className = 'carta-slot' + (slots[0] ? ' filled' : '');
    b.innerHTML = slots[1] ? mesaItemInner(slots[1]) : slotEmptyHTML();
    b.className = 'carta-slot' + (slots[1] ? ' filled' : '');
  }
  renderTallerAction();
  renderComboIndicador();
  renderEnPreparacion();
}
function mesaItemInner(id) {
  return `<div class="ingrediente-mesa">
      <div class="ing-icono">${iconOf(id)}</div>
      <span class="ing-sombra" aria-hidden="true"></span>
      <span class="ing-nombre">${nombreDe(id)}</span>
    </div>`;
}
function slotEmptyHTML() { return '<span class="slot-plus" aria-hidden="true">+</span><span class="slot-txt">pon algo aquí</span>'; }

/* la fila de estaciones sobre el mesón */
function renderEstacionFichas() {
  const wrap = $('#estacion-fichas');
  if (!wrap) return;
  wrap.innerHTML = '';
  estacionesAbiertas().forEach(id => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'estacion-ficha' + (id === state.estacion ? ' activa' : '');
    b.innerHTML = `<span class="estacion-ic">${iconOf(id)}</span><span class="estacion-txt">${verboEstacion(id)}</span>`;
    b.addEventListener('click', () => cambiarEstacion(id));
    wrap.appendChild(b);
  });
}
function cambiarEstacion(id, dir = 0) {
  if (id === state.estacion || !tieneEstacion(id)) return;
  state.estacion = id;
  save();
  sfx('swap'); buzz(12);
  syncEscena({ dir });
  renderEstacionFichas();
  renderTallerAction();
  /* cambiar de estación puede completar lo que ya estaba puesto */
  setTimeout(intentarCocinar, 280);
}
function estacionVecina(dir) {
  const lista = estacionesAbiertas();
  if (lista.length < 2) return null;
  const i = lista.indexOf(state.estacion);
  return lista[(i + dir + lista.length) % lista.length];
}

function renderMesaEtiquetas() {
  const wrap = $('#mesa-etiquetas'); wrap.innerHTML = '';
  if (escenaOn && Escena3D.hayMezclaRara()) {
    wrap.appendChild(el('span', 'pill pill--dark mesa-etiqueta mess', 'mezcla rara 🗑'));
  }
  slots.forEach(id => { if (id) wrap.appendChild(el('span', 'pill pill--dark mesa-etiqueta', nombreDe(id))); });
}

/* la pista de abajo: siempre dice cuál es el siguiente gesto */
function renderTallerAction() {
  const zone = $('#taller-action'); zone.innerHTML = '';
  if (escenaOn) {
    let hint;
    if (Escena3D.hayMezclaRara()) hint = 'Arrastra la mezcla rara al basurero 🗑';
    else if (!slots[0] && !slots[1]) hint = 'Arrastra algo de la canasta a la estación';
    else if (slots[0] && slots[1]) hint = 'Estos dos no combinan — prueba otra pareja';
    else {
      const uno = slots[0] || slots[1];
      if (findReceta(uno, state.estacion)) hint = `${verboEstacion(state.estacion)}…`;
      else {
        const otra = estacionesAbiertas().find(e => e !== state.estacion && findReceta(uno, e));
        hint = otra ? `Cambia de estación: ${verboEstacion(otra)}` : 'Pon algo más encima para combinar';
      }
    }
    zone.innerHTML = `<span class="taller-hint">${hint}</span>`;
    return;
  }
  if (slots[0] && slots[1]) {
    const combinar = document.createElement('button');
    combinar.type = 'button'; combinar.className = 'btn combinar-btn';
    combinar.textContent = 'Combinar ✦';
    combinar.addEventListener('click', intentarCocinar);
    zone.appendChild(combinar);
  }
  const limpiar = document.createElement('button');
  limpiar.type = 'button'; limpiar.className = 'btn btn--peltre btn--sm';
  limpiar.textContent = 'limpiar';
  limpiar.addEventListener('click', () => { slots = [null, null]; renderTaller(); });
  zone.appendChild(limpiar);
}

let comboCocina = 0;
function renderComboIndicador() {
  const badge = $('#combo-indicador');
  if (comboCocina > 1) { badge.textContent = `🔥 x${comboCocina}`; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}
function renderEnPreparacion() {
  const wrap = $('#en-preparacion');
  if (!wrap) return;
  const ids = repisaItems();
  if (escenaOn || !ids.length) { wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }
  wrap.classList.remove('hidden');
  wrap.innerHTML = '<span class="en-preparacion-label">En preparación</span>';
  const row = el('div', 'en-preparacion-row');
  ids.forEach(x => row.appendChild(chipDe(x.id, { n: x.n, onClick: () => tryPlace(x.id) })));
  wrap.appendChild(row);
}
function tryPlace(id) {
  const i = slots[0] === null ? 0 : (slots[1] === null ? 1 : null);
  if (i === null) { toast('La estación ya tiene dos cosas.'); return; }
  if (!disponible(id)) { toast('Ya no te queda.'); return; }
  slots[i] = id;
  sfx('tab'); buzz(10);
  renderTaller();
  setTimeout(intentarCocinar, 120);
}

/* ---------- cocinar ---------- */

function findReceta(x, y) {
  if (!x || !y) return null;
  return RECETAS.find(r => (r.a === x && r.b === y) || (r.a === y && r.b === x)) || null;
}

function intentarCocinar() {
  const [x, y] = slots;
  if (x && y) {
    const r = findReceta(x, y);
    if (r) return cocinar(r, [x, y]);
    return noCombina();
  }
  const uno = x || y;
  if (!uno) return;
  const r = findReceta(uno, state.estacion);
  if (r) return cocinar(r, [uno]);
  /* un ingrediente solo en una estación que no le hace nada NO se
     desperdicia: se queda esperando la estación correcta */
  renderTallerAction();
}

function cocinar(r, consumidos) {
  consumidos.forEach(id => addStock(id, -1));
  const isNew = discoverCard(r.result);
  addStock(r.result, 1);
  comboCocina += 1;
  const comboBono = (comboCocina % COMBO_CADA === 0) ? COMBO_BONO : 0;
  const rarity = CARTAS[r.result].rarity;
  const bonoRareza = isNew ? (SUCRES_POR_RAREZA[rarity] || 0) : (rarity === 'receta' ? SUCRES_POR_RECETA_REPETIDA : 0);
  const sucres = SUCRES_POR_COCINAR + bonoRareza + comboBono;
  state.sucres = (state.sucres || 0) + sucres;
  revisarDesbloqueoRegiones();
  slots = [null, null];
  save();
  const fin = () => procesarColeccionables(
    [{ id: r.result, tool: false, isNew, sucres, combo: comboBono ? comboCocina : 0 }],
    { finalLabel: 'Al recetario ✦' });
  if (escenaOn) { Escena3D.combinar(fin); renderMesaEtiquetas(); renderTallerAction(); }
  else fin();
}

/* la pareja no dio nada: queda una mezcla rara que estorba un puesto,
   pero NO gasta ingredientes — experimentar nunca debe castigar */
function noCombina() {
  sfx('fail'); buzz(60);
  slots = [null, null];
  if (escenaOn) {
    Escena3D.mezclaRara(0);
    toast('Eso no combinó. Bótalo y sigue probando 🗑');
    setTimeout(() => { renderTallerAction(); renderMesaEtiquetas(); syncEscena(); }, 320);
  } else {
    const surface = $('#fogon');
    surface.classList.remove('shake'); void surface.offsetWidth; surface.classList.add('shake');
    toast('Eso no combinó… todavía.');
    renderTaller();
  }
}

/* ============================================================
   Revelación de cartas
   ============================================================ */

function necesitaCeremonia(item) {
  if (item.isNew) return true;
  return !item.tool && CARTAS[item.id] && CARTAS[item.id].rarity === 'receta';
}
function procesarColeccionables(items, opts = {}) {
  const ceremonia = items.filter(necesitaCeremonia);
  const silenciosos = items.filter(it => !necesitaCeremonia(it));
  if (silenciosos.length) {
    toast(silenciosos.map(it => `+1 ${nombreDe(it.id)}`).join(' · '));
    sfx('tab');
  }
  if (ceremonia.length) { showRevealQueue(ceremonia, opts); return; }
  if (pendingRegionUnlock) { const rid = pendingRegionUnlock; pendingRegionUnlock = null; iniciarSobreDeRegion(rid); return; }
  if (opts.finalCb) opts.finalCb();
  refrescarPantalla();
}
function refrescarPantalla() {
  if (currentScreen === 'taller') renderTaller();
  if (currentScreen === 'coleccion') renderColeccion();
  if (currentScreen === 'feria') renderFeria();
  renderProgress();
}

let revealQueue = [], revealFinalLabel = 'Al recetario ✦', revealFinalCb = null;
let revealIsGift = false, revealCurrent = null, revealPhase = 'back';

function showRevealQueue(items, opts = {}) {
  revealQueue = items.slice();
  revealFinalLabel = opts.finalLabel || 'Al recetario ✦';
  revealFinalCb = opts.finalCb || null;
  revealIsGift = !!opts.giftFrom;
  $('#modal-reveal').classList.add('open');
  nextRevealCard(true);
}
function terminarRevelacion() {
  $('#modal-reveal').classList.remove('open');
  revealCurrent = null;
  const cb = revealFinalCb; revealFinalCb = null;
  if (cb) cb();
  refrescarPantalla();
}
function nextRevealCard(first) {
  if (!revealQueue.length) {
    if (pendingRegionUnlock) { const rid = pendingRegionUnlock; pendingRegionUnlock = null; iniciarSobreDeRegion(rid); return; }
    terminarRevelacion();
    return;
  }
  revealCurrent = revealQueue.shift();
  revealPhase = 'back';
  const rarity = revealCurrent.tool ? 'tool' : CARTAS[revealCurrent.id].rarity;
  $('#reveal-back').className = 'carta back rarity-' + rarity;
  $('#reveal-front').className = 'carta rarity-' + rarity;
  $('#reveal-front').innerHTML = revealCurrent.tool ? toolInner(revealCurrent.id) : cardInner(revealCurrent.id);
  const flip = $('#reveal-flip');
  flip.classList.remove('is-front');
  flip.style.transition = first ? 'none' : '';
  flip.style.transform = 'rotateY(0deg)';
  void flip.offsetWidth;
  flip.style.transition = '';
  $('#reveal-banner').classList.remove('visible', 'is-new');
  $('#reveal-banner').textContent = '';
  $('#reveal-hint').classList.remove('hidden');
  $('#reveal-ok').textContent = 'Revelar';
  actualizarPilaReveal();
  sfx('peel'); buzz(8);
}
function actualizarPilaReveal() {
  const restantes = revealQueue.length;
  $('#reveal-stack-2').classList.toggle('hidden', restantes < 1);
  $('#reveal-stack-3').classList.toggle('hidden', restantes < 2);
  const badge = $('#reveal-restantes');
  if (restantes > 0) { badge.textContent = `+${restantes} más`; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}
function revealFlip() {
  if (!revealCurrent || revealPhase === 'front') return;
  revealPhase = 'front';
  const flip = $('#reveal-flip');
  flip.style.transform = 'rotateY(180deg)';
  flip.classList.add('is-front');
  const item = revealCurrent;
  const nombre = nombreDe(item.id);
  const rarity = item.tool ? null : CARTAS[item.id].rarity;
  const esRecetaRepetida = !item.isNew && rarity === 'receta';
  const especial = item.isNew || revealIsGift || esRecetaRepetida;
  let msg = revealIsGift ? '¡Te invitaron a probar este plato! 🎁'
    : item.isNew ? (rarity === 'receta' ? '¡Platillo nuevo!' : '¡Nuevo en tu recetario!')
    : esRecetaRepetida ? `¡Otra vez ${nombre}!`
    : `+1 ${nombre}`;
  if (item.sucres) msg += ` · +${item.sucres} <span class="icono-sucre">S</span>`;
  if (item.combo) msg += ` · 🔥 x${item.combo}`;
  $('#reveal-banner').innerHTML = msg;
  $('#reveal-banner').classList.add('visible');
  $('#reveal-banner').classList.toggle('is-new', especial);
  $('#reveal-hint').classList.add('hidden');
  $('#reveal-ok').textContent = revealQueue.length ? 'Siguiente →' : revealFinalLabel;
  sfx(especial ? 'win' : 'flip');
  buzz(especial ? [30, 40, 60] : 15);
  if (especial && rarity === 'receta') burstConfetti($('#reveal-front'));
  if (item.combo) burstConfetti($('#reveal-front'));
}
function revealAdvance() {
  if (!revealCurrent) return;
  if (revealPhase === 'back') { revealFlip(); return; }
  const flip = $('#reveal-flip');
  flip.style.transform = 'translateX(-560px) rotateY(220deg) rotateZ(-16deg)';
  setTimeout(() => nextRevealCard(false), 260);
}
function revealSkipAll() { revealQueue = []; pendingRegionUnlock = null; terminarRevelacion(); }

function burstConfetti(target) {
  const rect = target.getBoundingClientRect();
  const wrap = document.createElement('div');
  wrap.className = 'reveal-burst';
  wrap.style.left = (rect.left + rect.width / 2) + 'px';
  wrap.style.top = (rect.top + rect.height / 2) + 'px';
  const colors = ['#e01b6a', '#f5a623', '#12a9a0', '#ffc93c'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('i');
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
    p.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px');
    p.style.setProperty('--dy', (Math.sin(a) * d - 20).toFixed(1) + 'px');
    p.style.background = colors[i % colors.length];
    if (i % 2) p.style.borderRadius = '50%';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 900);
}

function bindRevealGestures() {
  const stage = $('#reveal-stage'), flip = $('#reveal-flip');
  let dragging = false, moved = false, startX = 0, startY = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (!revealCurrent) return;
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    flip.style.transition = 'none';
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    if (revealPhase === 'back') {
      const lift = Math.max(-80, Math.min(10, dy));
      flip.style.transform = `translateY(${lift}px) rotateX(${Math.max(-16, Math.min(16, -dy * .22))}deg) rotateY(${Math.max(-14, Math.min(14, dx * .12))}deg)`;
    } else {
      flip.style.transform = `translateX(${dx}px) rotateY(${180 + Math.max(-10, Math.min(10, dx * .06))}deg)`;
    }
  });
  const onUp = (e) => {
    if (!dragging) return;
    dragging = false;
    flip.style.transition = '';
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (revealPhase === 'back') {
      if (dy < -46 || !moved) revealFlip();
      else flip.style.transform = 'rotateY(0deg)';
    } else {
      if (Math.abs(dx) > 90) {
        const dir = dx < 0 ? -1 : 1;
        flip.style.transform = `translateX(${dir * 560}px) rotateY(${180 + dir * 40}deg)`;
        setTimeout(() => nextRevealCard(false), 240);
      } else if (!moved) revealAdvance();
      else flip.style.transform = 'rotateY(180deg)';
    }
  };
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', () => { dragging = false; });
}

/* ============================================================
   EL RECETARIO
   ============================================================ */

function renderColeccion() {
  const body = $('#coleccion-body'); body.innerHTML = '';
  REGION_ORDEN.forEach(rid => {
    const r = REGIONES[rid];
    const abierta = regionesAbiertas().includes(rid);
    const idsRegion = CARTA_ORDEN.filter(id => CARTAS[id].region === rid);
    const platos = idsRegion.filter(id => CARTAS[id].rarity === 'receta');
    const gotPlatos = platos.filter(id => state.discovered.includes(id)).length;
    const got = idsRegion.filter(id => state.discovered.includes(id)).length;

    const section = el('section', 'region-seccion');
    const head = document.createElement('header');
    head.className = 'region-head';
    head.style.setProperty('--region-acento', r.acento);
    head.innerHTML = `<div class="region-nombre"><h3>${r.nombre}</h3><p class="region-tagline">${r.tagline}</p></div>` +
      (abierta ? `<span class="region-progress">${got}/${idsRegion.length}</span>` : '<span class="region-progress region-progress--lock">🔒</span>');
    section.appendChild(head);

    if (r.proximamente) {
      section.appendChild(el('p', 'region-locked', '🗺 Muy pronto en tu cocina…'));
    } else if (!abierta) {
      const faltan = (r.desbloqueo_recetas || []).map(id => CARTAS[id] && CARTAS[id].name).filter(Boolean).join(', ');
      section.appendChild(el('p', 'region-locked', `Cocina ${faltan} para abrir esta región.`));
    } else {
      section.appendChild(el('p', 'sub-label', `Platillos · ${gotPlatos}/${platos.length}`));
      const gPlatos = el('div', 'album-grid');
      platos.forEach(id => gPlatos.appendChild(albumCard(id, 'receta')));
      section.appendChild(gPlatos);

      section.appendChild(el('p', 'sub-label', 'Ingredientes y preparaciones'));
      const gResto = el('div', 'album-grid album-grid--sm');
      idsRegion.filter(id => CARTAS[id].rarity !== 'receta')
        .forEach(id => gResto.appendChild(albumCard(id, CARTAS[id].rarity)));
      section.appendChild(gResto);
    }
    body.appendChild(section);
  });
  body.appendChild(el('p', 'coleccion-footnote', 'Toca un plato cubierto: la cocina ya te dejó una pista.'));
  renderProgress();
}
function albumCard(id, rar) {
  const discovered = state.discovered.includes(id);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'carta rarity-' + rar + (discovered ? '' : ' back');
  card.innerHTML = discovered ? cardInner(id) : cardBackInner();
  if (discovered && stockOf(id) > 0) card.innerHTML += `<span class="carta-cant">×${stockOf(id)}</span>`;
  card.addEventListener('click', () => discovered ? showDetalle(id) : showPista(id));
  return card;
}
function renderProgress() {
  const total = CARTA_ORDEN.length;
  const got = state.discovered.filter(id => CARTAS[id]).length;
  $$('.progress-count').forEach(n => n.textContent = `${got} / ${total}`);
  $$('.progress-fill').forEach(n => n.style.width = (total ? (got / total * 100) : 0) + '%');
  renderSucres();
}
function renderSucres() { $$('.hud-sucres-count').forEach(n => n.textContent = state.sucres || 0); }

function showDetalle(id) {
  const c = CARTAS[id];
  $('#detalle-art').innerHTML = iconOf(id);
  $('#detalle-art').className = 'plate detalle-art rarity-' + c.rarity;
  $('#detalle-nombre').textContent = c.name;
  $('#detalle-rareza').textContent = RARITY_LABEL[c.rarity] + (c.city ? ` · ${c.city}` : '') + ` · ×${stockOf(id)}`;
  $('#detalle-lore').textContent = c.lore || '';
  /* cómo se hace: la pareja que lo produce */
  const r = RECETAS.find(x => x.result === id);
  const paso = $('#detalle-paso');
  if (r) {
    paso.classList.remove('hidden');
    paso.innerHTML = `<span class="paso-item">${nombreDe(r.a)}</span><span class="paso-mas">+</span><span class="paso-item">${nombreDe(r.b)}</span>`;
  } else paso.classList.add('hidden');
  $('#modal-detalle').classList.add('open');
  sfx('tab');
}
function showPista(id) {
  const r = RECETAS.find(x => x.result === id);
  $('#pista-texto').textContent = r ? `“${r.pista}”` : 'Este secreto todavía no se ha escrito.';
  $('#modal-pista').classList.add('open');
  sfx('tab');
}

/* ============================================================
   LA DESPENSA
   ============================================================ */

function formatDuracion(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function actualizarSobresGratis() {
  const now = Date.now();
  if (!state.proximoSobreGratisEn) state.proximoSobreGratisEn = now + SOBRE_INTERVALO_MS;
  if (state.sobres < SOBRE_MAX_STASH && now >= state.proximoSobreGratisEn) {
    state.sobres += 1;
    state.proximoSobreGratisEn = now + SOBRE_INTERVALO_MS;
    save();
  }
}
function abrirSobre() {
  if (state.sobres <= 0) return;
  state.sobres -= 1;
  const pulls = [];
  for (let i = 0; i < SOBRE_TAM; i++) {
    const p = sacarCarta();
    addStock(p.id, p.tipo === 'semilla' ? 2 : 1);
    pulls.push({ id: p.id, tool: false, isNew: discoverCard(p.id) });
  }
  revisarDesbloqueoRegiones();
  save();
  procesarColeccionables(pulls, { finalLabel: '¡Genial!' });
}

/* --- la canasta: qué me llevo al mesón --- */
function enCanasta(id) { return state.canasta.includes(id); }
function alternarCanasta(id) {
  const i = state.canasta.indexOf(id);
  if (i >= 0) { state.canasta.splice(i, 1); sfx('tab'); }
  else {
    if (state.canasta.length >= CANASTA_MAX) { toast(`La canasta lleva ${CANASTA_MAX} cosas. Saca alguna primero.`); return; }
    if (stockOf(id) <= 0) { toast('No te queda de eso.'); return; }
    state.canasta.push(id);
    sfx('win'); buzz(10);
  }
  save();
  renderFeria();
  syncEscena();
}

function renderFeria() {
  actualizarSobresGratis();
  $$('.sobre-count').forEach(n => n.textContent = state.sobres);
  $('#feria-abrir-btn').disabled = state.sobres <= 0;
  const rest = Math.max(0, state.proximoSobreGratisEn - Date.now());
  $('#feria-timer').textContent = state.sobres >= SOBRE_MAX_STASH
    ? 'No te caben más cajas por ahora.'
    : rest <= 0 ? '¡Llegó una caja del mercado!' : `Próxima caja gratis en ${formatDuracion(rest)}`;

  renderCanastaPanel();
  renderDespensaPanel();
  renderMercado();

  $('#regalos-restantes').textContent = regalosRestantesHoy();
  const grid = $('#regalos-grid'); grid.innerHTML = '';
  const disponibles = state.discovered.filter(id => CARTAS[id] && CARTAS[id].rarity === 'receta');
  if (!disponibles.length) grid.appendChild(el('span', 'regalos-empty', 'Descubre un platillo para poder invitarlo.'));
  else disponibles.forEach(id => grid.appendChild(regaloCard(id)));
}

function renderCanastaPanel() {
  const grid = $('#canasta-grid'); grid.innerHTML = '';
  $('#canasta-cuenta').textContent = `${state.canasta.length}/${CANASTA_MAX}`;
  if (!state.canasta.length) {
    grid.appendChild(el('span', 'despensa-vacio', 'Canasta vacía. Toca abajo lo que quieras llevar al mesón.'));
    return;
  }
  state.canasta.forEach(id => grid.appendChild(chipDe(id, { n: stockOf(id), activo: true, onClick: () => alternarCanasta(id) })));
}
function renderDespensaPanel() {
  const grid = $('#despensa-grid'); grid.innerHTML = '';
  const abiertas = regionesAbiertas();
  const ids = CARTA_ORDEN.filter(id =>
    CARTAS[id].rarity === 'semilla' && abiertas.includes(CARTAS[id].region) && stockOf(id) > 0);
  if (!ids.length) { grid.appendChild(el('span', 'despensa-vacio', 'Sin ingredientes. Abre una caja o compra en el mercado.')); return; }
  ids.forEach(id => grid.appendChild(chipDe(id, { n: stockOf(id), activo: enCanasta(id), onClick: () => alternarCanasta(id) })));
}

function mercadoChip(id) {
  const costo = MERCADO_COSTO_SEMILLA;
  const btn = chipDe(id, { n: stockOf(id), costo, onClick: () => comprarSemilla(id, costo) });
  if ((state.sucres || 0) < costo) btn.classList.add('agotado');
  return btn;
}
function comprarSemilla(id, costo) {
  if ((state.sucres || 0) < costo) { toast('No te alcanzan los sucres. Cocina algo o escucha el pregón 📣'); return; }
  state.sucres -= costo;
  addStock(id, 1);
  save(); sfx('win'); buzz(15);
  toast(`+1 ${nombreDe(id)}`);
  renderFeria(); renderSucres(); syncEscena();
}
function comprarSobreConSucres() {
  if (state.sobres >= SOBRE_MAX_STASH) { toast('No te caben más cajas por ahora.'); return; }
  if ((state.sucres || 0) < MERCADO_COSTO_SOBRE) { toast('Te faltan sucres para una caja.'); return; }
  state.sucres -= MERCADO_COSTO_SOBRE;
  state.sobres += 1;
  save(); sfx('win'); buzz([20, 30, 20]);
  toast('¡Caja nueva en tu despensa!');
  renderFeria(); renderSucres();
}
function escucharPregon() {
  if (Math.max(0, (state.pregonProximoEn || 0) - Date.now()) > 0) return;
  const btn = $('#pregon-btn');
  btn.disabled = true; btn.textContent = '📣 Escuchando…';
  sfx('tab');
  setTimeout(() => {
    state.sucres = (state.sucres || 0) + PREGON_RECOMPENSA;
    state.pregonProximoEn = Date.now() + PREGON_COOLDOWN_MS;
    save(); sfx('win'); buzz([30, 40, 60]);
    toast(`¡+${PREGON_RECOMPENSA} sucres de propina!`);
    renderFeria(); renderSucres();
  }, 3200);
}
function renderMercado() {
  const grid = $('#mercado-semillas'); grid.innerHTML = '';
  GAME_DATA.ingredientes.filter(i => regionesAbiertas().includes(i.region)).forEach(i => grid.appendChild(mercadoChip(i.id)));
  const sobreBtn = $('#mercado-sobre-btn');
  sobreBtn.disabled = (state.sucres || 0) < MERCADO_COSTO_SOBRE || state.sobres >= SOBRE_MAX_STASH;
  const rest = Math.max(0, (state.pregonProximoEn || 0) - Date.now());
  const pregonBtn = $('#pregon-btn');
  if (rest <= 0) pregonBtn.textContent = '📣 El pregón';
  pregonBtn.disabled = rest > 0;
  $('#pregon-timer').innerHTML = rest > 0 ? `El pregonero vuelve en ${formatDuracion(rest)}` : `Gana ${PREGON_RECOMPENSA} <span class="icono-sucre">S</span> de propina`;
}

/* ---------- regalos ---------- */

function regaloCard(id) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'carta rarity-' + CARTAS[id].rarity + ' regalo-mini';
  card.innerHTML = cardInner(id);
  card.addEventListener('click', () => generarRegalo(id));
  return card;
}
function hoyISO() { return new Date().toISOString().slice(0, 10); }
function regalosRestantesHoy() {
  if (!state.regalosHechos || state.regalosHechos.fecha !== hoyISO()) return REGALOS_DIARIOS_MAX;
  return Math.max(0, REGALOS_DIARIOS_MAX - state.regalosHechos.usados);
}
function registrarRegaloHecho() {
  const hoy = hoyISO();
  if (!state.regalosHechos || state.regalosHechos.fecha !== hoy) state.regalosHechos = { fecha: hoy, usados: 0 };
  state.regalosHechos.usados += 1;
  save();
}
function codificarRegalo(id) {
  const nonce = Math.random().toString(36).slice(2, 8);
  return btoa(`${id}:${nonce}`).replace(/=+$/, '');
}
async function generarRegalo(id) {
  if (regalosRestantesHoy() <= 0) { toast('Ya repartiste tus invitaciones de hoy 🍽'); return; }
  const code = codificarRegalo(id);
  const url = `${location.origin}${location.pathname}?regalo=${code}`;
  const texto = `¡Te invito a probar mi ${CARTAS[id].name} en Pambamesa! 🍽`;
  registrarRegaloHecho();
  renderFeria();
  if (navigator.share) {
    try { await navigator.share({ title: 'Pambamesa', text: texto, url }); return; } catch (e) {}
  }
  try {
    await navigator.clipboard.writeText(`${texto}\n${url}`);
    toast('Enlace copiado. ¡Pégalo donde quieras! 📋');
  } catch (e) { toast(url); }
}
function intentarCanjearRegalo() {
  const params = new URLSearchParams(location.search);
  const code = params.get('regalo');
  if (!code) return;
  history.replaceState({}, '', location.pathname);
  let decoded;
  try { decoded = atob(code); } catch (e) { return; }
  const [id, nonce] = decoded.split(':');
  if (!id || !CARTAS[id] || !nonce) return;
  const marca = `${id}:${nonce}`;
  if (!state.regalosCanjeados) state.regalosCanjeados = [];
  if (state.regalosCanjeados.includes(marca)) { setTimeout(() => toast('Ya probaste este plato en esta cocina.'), 500); return; }
  state.regalosCanjeados.push(marca);
  const isNew = discoverCard(id);
  addStock(id, 1);
  revisarDesbloqueoRegiones();
  save();
  setTimeout(() => showRevealQueue([{ id, tool: false, isNew }], { finalLabel: '¡Buen provecho!', giftFrom: true }), 500);
}

/* ---------- racha diaria ---------- */

let rachaPendiente = false;
function revisarRachaDiaria() {
  const hoy = hoyISO();
  if (!state.racha) state.racha = { dias: 0, ultimaFecha: '' };
  if (state.racha.ultimaFecha === hoy) { rachaPendiente = false; return; }
  if (!state.racha.ultimaFecha) { state.racha = { dias: 1, ultimaFecha: hoy }; save(); return; }
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  state.racha.diasCandidato = state.racha.ultimaFecha === ayer ? state.racha.dias + 1 : 1;
  rachaPendiente = true;
}
function mostrarModalRacha() {
  const dias = state.racha.diasCandidato || 1;
  $('#racha-dias').textContent = dias;
  $('#racha-recompensa').innerHTML = `+${RACHA_RECOMPENSAS[(dias - 1) % RACHA_RECOMPENSAS.length]} <span class="icono-sucre">S</span>`;
  $('#modal-racha').classList.add('open');
  sfx('peel');
}
function reclamarRacha() {
  const dias = state.racha.diasCandidato || 1;
  state.sucres = (state.sucres || 0) + RACHA_RECOMPENSAS[(dias - 1) % RACHA_RECOMPENSAS.length];
  state.racha.dias = dias;
  state.racha.ultimaFecha = hoyISO();
  rachaPendiente = false;
  save();
  $('#modal-racha').classList.remove('open');
  sfx('win'); buzz([30, 40, 60]);
  renderSucres();
}

/* ---------- arranque de partida ---------- */

function abrirSobreInicial() {
  iniciarSobreDeRegion('costa');
  state.starterOpened = true;
  state.sobres += 1;
  state.proximoSobreGratisEn = Date.now() + SOBRE_INTERVALO_MS;
  save();
  revealFinalLabel = 'A cocinar ✦';
  revealFinalCb = () => show('taller');
}

/* ---------- Navegación ---------- */

function show(screen) {
  const prev = currentScreen;
  currentScreen = screen;
  ['cover', 'taller', 'coleccion', 'feria'].forEach(s => $('#screen-' + s).classList.toggle('active', s === screen));
  $('#hud').classList.toggle('hidden', screen === 'cover');
  $('#tabs').classList.toggle('hidden', screen === 'cover');
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === screen));
  if (screen === 'taller') {
    if (prev !== 'taller') comboCocina = 0;
    renderTaller();
    if (state.starterOpened && rachaPendiente) mostrarModalRacha();
  }
  if (screen === 'coleccion') renderColeccion();
  if (screen === 'feria') renderFeria();
  renderProgress();
  $('#stage').classList.toggle('en-cocina', screen === 'taller');
  if (escenaOn) Escena3D.setActive(screen === 'taller');
  clearInterval(feriaTimerId);
  if (screen === 'feria') feriaTimerId = setInterval(renderFeria, 30000);
}

/* ---------- El mesón 3D ---------- */

function initEscena3D() {
  const cont = $('#cocina3d');
  if (!window.Escena3D || !cont) return;
  try { escenaOn = Escena3D.init(cont); } catch (e) { escenaOn = false; }
  if (!escenaOn) return;
  cont.classList.remove('hidden');
  $('#fogon').classList.add('hidden');
  $('#mesa-etiquetas').classList.remove('hidden');
  $('#stage').classList.add('mesa3d');

  Escena3D.bind({
    alAgarrar: () => initAudio(),
    sinStock: () => toast('Ya no te queda de eso.'),
    estacionLlena: () => toast('La estación está ocupada.'),

    alColocar: (id, idx) => {
      slots[idx] = id;
      sfx('tab'); buzz(10);
      renderMesaEtiquetas(); renderTallerAction();
      syncEscena();
      setTimeout(intentarCocinar, 170);
    },
    alQuitar: (idx) => {
      slots[idx] = null;
      sfx('tab');
      renderMesaEtiquetas(); renderTallerAction();
      syncEscena();
    },
    alDeslizarEstacion: (dir) => {
      const otra = estacionVecina(dir);
      if (otra) cambiarEstacion(otra, dir);
    },
    alBotarMezcla: () => {
      sfx('tab'); buzz(20);
      toast('Al basurero. ¡No perdiste nada!');
      renderTaller();
    },
  });
}

/* ---------- Migración de partidas anteriores ---------- */

function migrar() {
  /* las estaciones pasaron de gastarse a estar siempre listas */
  Object.keys(state.tools || {}).forEach(k => { state.tools[k] = true; });
  /* el recetario creció: repone lo básico de las regiones ya abiertas
     para que nadie se quede sin los ingredientes nuevos */
  if (!state.migradoV3 && state.starterOpened) {
    regionesAbiertas().forEach(rid => {
      (REGIONES[rid].kitHerramientas || []).forEach(id => { state.tools[id] = true; });
      (REGIONES[rid].kitSemillas || []).forEach(x => { if (stockOf(x.id) === 0) addStock(x.id, x.n); });
    });
    state.migradoV3 = true;
  }
  if (!tieneEstacion(state.estacion)) state.estacion = estacionesAbiertas()[0] || 'cuchillo';
  /* nunca dejar en la canasta algo que ya no existe */
  state.canasta = state.canasta.filter(id => CARTAS[id] && CARTAS[id].rarity === 'semilla');
  if (!state.canasta.length) {
    CARTA_ORDEN.filter(id => CARTAS[id].rarity === 'semilla' && stockOf(id) > 0)
      .slice(0, 5).forEach(id => state.canasta.push(id));
  }
}

/* ---------- Eventos ---------- */

function bindEvents() {
  $('#btn-abrir').addEventListener('click', () => { initAudio(); state.seenCover = true; save(); abrirSobreInicial(); });
  $('#slot-a').addEventListener('click', () => { if (slots[0]) { slots[0] = null; sfx('tab'); renderTaller(); } });
  $('#slot-b').addEventListener('click', () => { if (slots[1]) { slots[1] = null; sfx('tab'); renderTaller(); } });
  $$('.tab-btn').forEach(b => b.addEventListener('click', () => { sfx('tab'); show(b.dataset.tab); }));

  $('#feria-abrir-btn').addEventListener('click', () => { initAudio(); abrirSobre(); });
  $('#mercado-sobre-btn').addEventListener('click', () => { initAudio(); comprarSobreConSucres(); });
  $('#pregon-btn').addEventListener('click', () => { initAudio(); escucharPregon(); });
  $('#racha-reclamar-btn').addEventListener('click', reclamarRacha);

  $('#reveal-ok').addEventListener('click', revealAdvance);
  $('#modal-reveal').addEventListener('click', (e) => { if (e.target === $('#modal-reveal')) revealSkipAll(); });
  bindRevealGestures();

  $('#detalle-close').addEventListener('click', () => $('#modal-detalle').classList.remove('open'));
  $('#modal-detalle').addEventListener('click', (e) => { if (e.target === $('#modal-detalle')) $('#modal-detalle').classList.remove('open'); });
  $('#pista-close').addEventListener('click', () => $('#modal-pista').classList.remove('open'));
  $('#modal-pista').addEventListener('click', (e) => { if (e.target === $('#modal-pista')) $('#modal-pista').classList.remove('open'); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#modal-reveal').classList.contains('open')) revealSkipAll();
    $('#modal-detalle').classList.remove('open');
    $('#modal-pista').classList.remove('open');
  });
}

function init() {
  state = load() || newState();
  document.body.insertAdjacentHTML('beforeend', ICON_DEFS);
  $$('[data-icon]').forEach(n => { n.innerHTML = iconOf(n.dataset.icon); });
  migrar();
  revisarRachaDiaria();
  initEscena3D();
  bindEvents();
  show(state.seenCover ? 'taller' : 'cover');
  intentarCanjearRegalo();
}
document.addEventListener('DOMContentLoaded', init);
