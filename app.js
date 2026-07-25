/* ============================================================
   PAMBAMESA — cuaderno de viaje de sabores
   app.js — motor de álbum coleccionable (Little Alchemy × TCG).

   Sin clientes, sin arriendo, sin reloj: solo combinar dos cartas
   sobre la mesa para descubrir la siguiente, y guardarla en el
   álbum. Las semillas (ingredientes base) y las herramientas
   siempre están a mano; todo lo demás se gana combinando.
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SAVE_KEY = 'pambamesa_save_v1';
const RARITY_LABEL = { semilla: 'Semilla', hallazgo: 'Hallazgo', receta: 'Receta' };
const RARITY_ORDER = ['semilla', 'hallazgo', 'receta'];

/* ---------- Estado ---------- */

function newState() {
  return {
    discovered: GAME_DATA.ingredientes.map(i => i.id),   /* las semillas ya son tuyas */
    seenCover: false,
  };
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }

let state = null;
let currentScreen = 'cover';
let slots = [null, null];

/* ---------- Juice mínimo: sonido y vibración ---------- */

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
function buzz(pattern) { if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} } }

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
}

/* ---------- Fichas de carta (HTML) ---------- */

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
function cardBackInner() {
  return `<div class="carta-textura" aria-hidden="true"></div><span class="carta-interrogante">?</span>`;
}
function toolInner(id) {
  const t = UTENSILIOS.find(u => u.id === id);
  return `<div class="carta-art">${iconOf(id)}</div><div class="carta-plate"><span class="carta-nombre">${t.name}</span><span class="carta-rareza">Herramienta</span></div>`;
}

function miniChip(id, { tool = false } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  const rarity = tool ? 'tool' : CARTAS[id].rarity;
  const name = tool ? UTENSILIOS.find(u => u.id === id).name : CARTAS[id].name;
  btn.className = `carta-mini rarity-${rarity}`;
  btn.innerHTML = `<span class="mini-icon">${iconOf(id)}</span><span class="mini-name">${name}</span>`;
  btn.addEventListener('click', () => tryPlace(id));
  return btn;
}

/* ---------- Mesa de fusión (Taller) ---------- */

function renderTaller() {
  const a = $('#slot-a'), b = $('#slot-b');
  a.innerHTML = slots[0] ? (isUtensilio(slots[0]) ? toolInner(slots[0]) : cardInner(slots[0])) : slotEmptyHTML();
  a.className = 'carta-slot' + (slots[0] ? ' filled rarity-' + (isUtensilio(slots[0]) ? 'tool' : CARTAS[slots[0]].rarity) : '');
  b.innerHTML = slots[1] ? (isUtensilio(slots[1]) ? toolInner(slots[1]) : cardInner(slots[1])) : slotEmptyHTML();
  b.className = 'carta-slot' + (slots[1] ? ' filled rarity-' + (isUtensilio(slots[1]) ? 'tool' : CARTAS[slots[1]].rarity) : '');
  renderTallerAction();
  renderTrays();
}
function slotEmptyHTML() { return '<span class="slot-plus" aria-hidden="true">+</span><span class="slot-txt">elige una carta</span>'; }

function renderTallerAction() {
  const zone = $('#taller-action'); zone.innerHTML = '';
  if (slots[0] && slots[1]) {
    const combinar = document.createElement('button');
    combinar.type = 'button'; combinar.className = 'btn-leather combinar-btn';
    combinar.textContent = 'Combinar ✦';
    combinar.addEventListener('click', combinarMesa);
    zone.appendChild(combinar);
    const limpiar = document.createElement('button');
    limpiar.type = 'button'; limpiar.className = 'btn-ghost small';
    limpiar.textContent = 'limpiar la mesa';
    limpiar.addEventListener('click', clearSlots);
    zone.appendChild(limpiar);
  } else {
    zone.innerHTML = `<span class="taller-hint">${slots[0] || slots[1] ? 'Elige la segunda carta…' : 'Toca dos cartas para probarlas juntas'}</span>`;
  }
}

function renderTrays() {
  const tools = $('#tray-tools'); tools.innerHTML = '';
  UTENSILIOS.forEach(t => tools.appendChild(miniChip(t.id, { tool: true })));

  const cartas = $('#tray-cartas'); cartas.innerHTML = '';
  state.discovered.forEach(id => { if (CARTAS[id]) cartas.appendChild(miniChip(id)); });
}

function tryPlace(id) {
  const i = slots[0] === null ? 0 : (slots[1] === null ? 1 : null);
  if (i === null) { toast('La mesa ya tiene dos cartas. Combínalas o límpiala.'); return; }
  slots[i] = id;
  sfx('tab'); buzz(10);
  renderTaller();
}
function clearSlots() { slots = [null, null]; renderTaller(); }

function findReceta(x, y) {
  return RECETAS.find(r => (r.a === x && r.b === y) || (r.a === y && r.b === x)) || null;
}
function combinarMesa() {
  const [x, y] = slots;
  if (!x || !y) return;
  const r = findReceta(x, y);
  const surface = $('#mesa-fusion');
  if (!r) {
    surface.classList.remove('shake'); void surface.offsetWidth; surface.classList.add('shake');
    sfx('fail'); buzz(60);
    toast('Estos dos no reaccionan… todavía.');
    return;
  }
  const isNew = !state.discovered.includes(r.result);
  if (isNew) { state.discovered.push(r.result); save(); }
  clearSlots();
  showReveal(r.result, isNew);
}

/* ---------- Revelación (apertura tipo sobre de cartas) ---------- */

function showReveal(id, isNew) {
  const c = CARTAS[id];
  const wrap = $('#reveal-card');
  wrap.className = 'carta rarity-' + c.rarity + ' carta-flip-anim';
  wrap.innerHTML = cardInner(id);
  $('#reveal-banner').textContent = isNew ? '¡Nueva carta para tu álbum!' : 'Ya la tenías — pero bien combinado.';
  $('#reveal-banner').classList.toggle('is-new', isNew);
  $('#modal-reveal').classList.add('open');
  sfx(isNew ? 'win' : 'flip');
  buzz(isNew ? [30, 40, 60] : 15);
}
function closeReveal() {
  $('#modal-reveal').classList.remove('open');
  if (currentScreen === 'taller') renderTaller();
  if (currentScreen === 'coleccion') renderColeccion();
  renderProgress();
}

/* ---------- El álbum (Colección) ---------- */

function renderColeccion() {
  const body = $('#coleccion-body'); body.innerHTML = '';
  RARITY_ORDER.forEach(rar => {
    const ids = CARTA_ORDEN.filter(id => CARTAS[id].rarity === rar);
    if (!ids.length) return;
    const section = document.createElement('section'); section.className = 'album-seccion';
    section.innerHTML = `<h3 class="album-seccion-title">${RARITY_LABEL[rar]}s</h3>`;
    const grid = document.createElement('div'); grid.className = 'album-grid';
    ids.forEach(id => grid.appendChild(albumCard(id, rar)));
    section.appendChild(grid);
    body.appendChild(section);
  });
  renderProgress();
}
function albumCard(id, rar) {
  const discovered = state.discovered.includes(id);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'carta rarity-' + rar + (discovered ? '' : ' back');
  card.innerHTML = discovered ? cardInner(id) : cardBackInner();
  card.addEventListener('click', () => discovered ? showDetalle(id) : showPista(id));
  return card;
}
function renderProgress() {
  const total = CARTA_ORDEN.length;
  const got = state.discovered.filter(id => CARTAS[id]).length;
  $$('.progress-count').forEach(n => n.textContent = `${got} / ${total}`);
  $$('.progress-fill').forEach(n => n.style.width = (total ? (got / total * 100) : 0) + '%');
}

function showDetalle(id) {
  const c = CARTAS[id];
  $('#detalle-art').innerHTML = cardInner(id, { showName: false });
  $('#detalle-art').className = 'detalle-art rarity-' + c.rarity;
  $('#detalle-nombre').textContent = c.name;
  $('#detalle-rareza').textContent = RARITY_LABEL[c.rarity] + (c.city ? ` · ${c.city}` : '');
  $('#detalle-lore').textContent = c.lore || '';
  $('#modal-detalle').classList.add('open');
  sfx('tab');
}
function showPista(id) {
  const r = RECETAS.find(x => x.result === id);
  $('#pista-texto').textContent = r ? `“${r.pista}”` : 'Este secreto todavía no se ha escrito.';
  $('#modal-pista').classList.add('open');
  sfx('tab');
}

/* ---------- Navegación ---------- */

function show(screen) {
  currentScreen = screen;
  ['cover', 'taller', 'coleccion'].forEach(s => $('#screen-' + s).classList.toggle('active', s === screen));
  $('#hud').classList.toggle('hidden', screen === 'cover');
  $('#tabs').classList.toggle('hidden', screen === 'cover');
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === screen));
  if (screen === 'taller') renderTaller();
  if (screen === 'coleccion') renderColeccion();
  renderProgress();
  window.scrollTo(0, 0);
}

/* ---------- Arranque ---------- */

function bindEvents() {
  $('#btn-abrir').addEventListener('click', () => { initAudio(); state.seenCover = true; save(); show('taller'); });
  $('#slot-a').addEventListener('click', () => { if (slots[0]) { slots[0] = null; sfx('tab'); renderTaller(); } });
  $('#slot-b').addEventListener('click', () => { if (slots[1]) { slots[1] = null; sfx('tab'); renderTaller(); } });
  $$('.tab-btn').forEach(b => b.addEventListener('click', () => { sfx('tab'); show(b.dataset.tab); }));

  $('#reveal-ok').addEventListener('click', closeReveal);
  $('#modal-reveal').addEventListener('click', (e) => { if (e.target === $('#modal-reveal')) closeReveal(); });

  $('#detalle-close').addEventListener('click', () => $('#modal-detalle').classList.remove('open'));
  $('#modal-detalle').addEventListener('click', (e) => { if (e.target === $('#modal-detalle')) $('#modal-detalle').classList.remove('open'); });

  $('#pista-close').addEventListener('click', () => $('#modal-pista').classList.remove('open'));
  $('#modal-pista').addEventListener('click', (e) => { if (e.target === $('#modal-pista')) $('#modal-pista').classList.remove('open'); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $('#modal-reveal').classList.contains('open') ? closeReveal() : null;
    $('#modal-detalle').classList.remove('open');
    $('#modal-pista').classList.remove('open');
  });
}

function init() {
  state = load() || newState();
  $$('[data-icon]').forEach(n => { n.innerHTML = iconOf(n.dataset.icon); });
  bindEvents();
  show(state.seenCover ? 'taller' : 'cover');
}
document.addEventListener('DOMContentLoaded', init);
