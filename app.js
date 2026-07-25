/* ============================================================
   PAMBAMESA — cuaderno de viaje de sabores
   app.js — motor de álbum coleccionable (Little Alchemy × TCG).

   Dos capas separadas a propósito:
   - state.discovered  → tu ÁLBUM. Permanente. Nunca se pierde.
   - state.stock/tools → tu DESPENSA. Se gasta al combinar y se
     repone abriendo sobres (o con un regalo de alguien más).
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SAVE_KEY = 'pambamesa_save_v2';
const RARITY_LABEL = { semilla: 'Semilla', hallazgo: 'Hallazgo', receta: 'Receta' };
const RARITY_ORDER = ['semilla', 'hallazgo', 'receta'];

/* ---------- Economía de sobres ---------- */

const SOBRE_TAM = 3;                          /* cartas por sobre */
const SOBRE_INTERVALO_MS = 3 * 60 * 60 * 1000; /* un sobre gratis cada 3h */
const SOBRE_MAX_STASH = 3;                    /* tope de sobres guardados */
const REGALOS_DIARIOS_MAX = 3;

const SOBRE_INICIAL = [
  { id: 'verde', n: 3 }, { id: 'queso', n: 2 }, { id: 'huevo', n: 1 }, { id: 'cerdo', n: 1 },
];
const HERRAMIENTAS_INICIALES = ['cuchillo', 'olla', 'pilon', 'sarten'];

function tablaDeSobre() {
  return [
    { peso: 45, tipo: 'semilla',    pool: GAME_DATA.ingredientes.map(i => i.id) },
    { peso: 25, tipo: 'herramienta', pool: UTENSILIOS.map(u => u.id) },
    { peso: 22, tipo: 'hallazgo',   pool: GAME_DATA.resultados.map(r => r.id) },
    { peso: 8,  tipo: 'receta',     pool: GAME_DATA.recetas.map(r => r.plato) },
  ];
}
function sacarCarta() {
  const tabla = tablaDeSobre();
  const total = tabla.reduce((s, t) => s + t.peso, 0);
  let r = Math.random() * total;
  for (const t of tabla) { r -= t.peso; if (r <= 0) return { tipo: t.tipo, id: t.pool[Math.floor(Math.random() * t.pool.length)] }; }
  return { tipo: 'semilla', id: tabla[0].pool[0] };
}

/* ---------- Estado ---------- */

function newState() {
  return {
    discovered: [],           /* álbum: permanente */
    stock: {},                /* despensa: copias que tienes ahora */
    tools: {},                /* {id: usos restantes} */
    sobres: 0,
    proximoSobreGratisEn: 0,
    regalosHechos: { fecha: '', usados: 0 },
    regalosCanjeados: [],
    seenCover: false,
    starterOpened: false,
  };
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s) return null;
    /* completa campos si vienen de un guardado anterior */
    return Object.assign(newState(), s);
  } catch (e) { return null; }
}

let state = null;
let currentScreen = 'cover';
let slots = [null, null];
let feriaTimerId = null;

const stockOf = (id) => state.stock[id] || 0;
function addStock(id, n) { state.stock[id] = Math.max(0, (state.stock[id] || 0) + n); }
function discoverCard(id) { if (!state.discovered.includes(id)) { state.discovered.push(id); return true; } return false; }

const toolUses = (id) => state.tools[id] || 0;
const hasTool = (id) => toolUses(id) > 0;
function grantTool(id) { state.tools[id] = DURABILIDAD_HERRAMIENTA[id]; }
function useTool(id) { state.tools[id] = Math.max(0, toolUses(id) - 1); }

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
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2600);
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
  const avail = tool ? hasTool(id) : stockOf(id) > 0;
  const rarity = tool ? 'tool' : CARTAS[id].rarity;
  const name = tool ? UTENSILIOS.find(u => u.id === id).name : CARTAS[id].name;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `carta-mini rarity-${rarity}` + (avail ? '' : ' agotado');
  const badge = tool
    ? `<span class="mini-durab">${'●'.repeat(toolUses(id))}${'○'.repeat(Math.max(0, (DURABILIDAD_HERRAMIENTA[id] || 0) - toolUses(id)))}</span>`
    : `<span class="mini-cant">${stockOf(id)}</span>`;
  btn.innerHTML = `${badge}<span class="mini-icon">${iconOf(id)}</span><span class="mini-name">${name}</span>`;
  if (avail) btn.addEventListener('click', () => tryPlace(id));
  else btn.addEventListener('click', () => toast(tool ? 'Se gastó. Consigue uno nuevo en la feria 🎟' : 'Ya no te queda. Consíguelo en la feria 🎟'));
  return btn;
}

/* pequeña carta de la colección, para elegir qué regalar (no gasta despensa) */
function regaloCard(id) {
  const c = CARTAS[id];
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'carta rarity-' + c.rarity + ' regalo-mini';
  card.innerHTML = cardInner(id);
  card.addEventListener('click', () => generarRegalo(id));
  return card;
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
  const xOk = isUtensilio(x) ? hasTool(x) : stockOf(x) > 0;
  const yOk = isUtensilio(y) ? hasTool(y) : stockOf(y) > 0;
  if (!xOk || !yOk) { toast('Ya no te queda esto. Consíguelo en la feria 🎟'); return; }

  isUtensilio(x) ? useTool(x) : addStock(x, -1);
  isUtensilio(y) ? useTool(y) : addStock(y, -1);
  const isNew = discoverCard(r.result);
  addStock(r.result, 1);
  save();
  clearSlots();
  showRevealQueue([{ id: r.result, tool: false, isNew }], { finalLabel: 'Guardar en el álbum' });
}

/* ---------- Revelación (apertura tipo sobre de cartas) ----------
   Soporta una cola: sobres/regalos revelan varias cartas seguidas,
   una por una, sin cerrar el modal entre medio. */

let revealQueue = [];
let revealFinalLabel = 'Guardar en el álbum';
let revealFinalCb = null;
let revealIsGift = false;

function showRevealQueue(items, opts = {}) {
  revealQueue = items.slice();
  revealFinalLabel = opts.finalLabel || 'Guardar en el álbum';
  revealFinalCb = opts.finalCb || null;
  revealIsGift = !!opts.giftFrom;
  advanceReveal();
}
function advanceReveal() {
  if (!revealQueue.length) {
    $('#modal-reveal').classList.remove('open');
    const cb = revealFinalCb; revealFinalCb = null;
    if (cb) cb();
    if (currentScreen === 'taller') renderTaller();
    if (currentScreen === 'coleccion') renderColeccion();
    if (currentScreen === 'feria') renderFeria();
    renderProgress();
    return;
  }
  const item = revealQueue.shift();
  const rarity = item.tool ? 'tool' : CARTAS[item.id].rarity;
  const name = item.tool ? UTENSILIOS.find(u => u.id === item.id).name : CARTAS[item.id].name;
  const wrap = $('#reveal-card');
  wrap.className = 'carta rarity-' + rarity + ' carta-flip-anim';
  wrap.innerHTML = item.tool ? toolInner(item.id) : cardInner(item.id);
  $('#reveal-banner').textContent = revealIsGift ? '¡Te compartieron esta carta! 🎁'
    : item.isNew ? '¡Nueva carta para tu álbum!'
    : `+1 ${name}`;
  $('#reveal-banner').classList.toggle('is-new', !!item.isNew || revealIsGift);
  $('#reveal-ok').textContent = revealQueue.length ? 'Siguiente carta →' : revealFinalLabel;
  $('#modal-reveal').classList.add('open');
  sfx(item.isNew || revealIsGift ? 'win' : 'flip');
  buzz(item.isNew || revealIsGift ? [30, 40, 60] : 15);
}
function skipReveal() { revealQueue = []; advanceReveal(); }

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
  if (discovered && stockOf(id) > 0) card.innerHTML += `<span class="carta-cant">×${stockOf(id)}</span>`;
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
  $('#detalle-rareza').textContent = RARITY_LABEL[c.rarity] + (c.city ? ` · ${c.city}` : '') + ` · tienes ×${stockOf(id)}`;
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

/* ---------- La feria: sobres y regalos ---------- */

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
    if (p.tipo === 'herramienta') {
      const isNew = !hasTool(p.id);
      grantTool(p.id);
      pulls.push({ id: p.id, tool: true, isNew });
    } else {
      addStock(p.id, p.tipo === 'semilla' ? 2 : 1);
      const isNew = discoverCard(p.id);
      pulls.push({ id: p.id, tool: false, isNew });
    }
  }
  save();
  showRevealQueue(pulls, { finalLabel: '¡Genial!' });
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
  if (regalosRestantesHoy() <= 0) { toast('Ya compartiste tus regalos de hoy. Vuelve mañana 🎟'); return; }
  const code = codificarRegalo(id);
  const url = `${location.origin}${location.pathname}?regalo=${code}`;
  const nombre = CARTAS[id].name;
  const texto = `¡Te regalo mi carta de ${nombre} en Pambamesa! 🎁`;
  registrarRegaloHecho();
  renderFeria();
  if (navigator.share) {
    try { await navigator.share({ title: 'Pambamesa', text: texto, url }); return; } catch (e) { /* canceló, no pasa nada */ }
  }
  try {
    await navigator.clipboard.writeText(`${texto}\n${url}`);
    toast('Enlace de regalo copiado. ¡Pégalo donde quieras! 📋');
  } catch (e) {
    toast(url);
  }
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
  if (state.regalosCanjeados.includes(marca)) { setTimeout(() => toast('Ya abriste este regalo en este cuaderno.'), 500); return; }
  state.regalosCanjeados.push(marca);
  const isNew = discoverCard(id);
  addStock(id, 1);
  save();
  setTimeout(() => showRevealQueue([{ id, tool: false, isNew }], { finalLabel: '¡Qué lindo detalle!', giftFrom: true }), 500);
}

function renderFeria() {
  actualizarSobresGratis();
  $$('.sobre-count').forEach(n => n.textContent = state.sobres);
  const abrirBtn = $('#feria-abrir-btn');
  abrirBtn.disabled = state.sobres <= 0;
  const rest = Math.max(0, state.proximoSobreGratisEn - Date.now());
  $('#feria-timer').textContent = state.sobres >= SOBRE_MAX_STASH
    ? 'Tu bolsa de sobres está llena.'
    : rest <= 0 ? '¡Ya tienes un sobre nuevo!' : `Próximo sobre gratis en ${formatDuracion(rest)}`;

  $('#regalos-restantes').textContent = regalosRestantesHoy();
  const grid = $('#regalos-grid'); grid.innerHTML = '';
  const disponibles = state.discovered.filter(id => CARTAS[id]);
  if (!disponibles.length) grid.appendChild(el('span', 'regalos-empty', 'Descubre una carta primero para poder compartirla.'));
  else disponibles.forEach(id => grid.appendChild(regaloCard(id)));
}
function el(tag, cls, text) { const n = document.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; }

/* ---------- El sobre de bienvenida ---------- */

function abrirSobreInicial() {
  const items = [];
  SOBRE_INICIAL.forEach(x => { addStock(x.id, x.n); items.push({ id: x.id, tool: false, isNew: discoverCard(x.id) }); });
  HERRAMIENTAS_INICIALES.forEach(id => { const isNew = !hasTool(id); grantTool(id); items.push({ id, tool: true, isNew }); });
  state.starterOpened = true;
  state.sobres += 1;   /* un sobre de propina, para que abran uno "de verdad" enseguida */
  state.proximoSobreGratisEn = Date.now() + SOBRE_INTERVALO_MS;
  save();
  showRevealQueue(items, { finalLabel: 'A la mesa ✦', finalCb: () => show('taller') });
}

/* ---------- Navegación ---------- */

function show(screen) {
  currentScreen = screen;
  ['cover', 'taller', 'coleccion', 'feria'].forEach(s => $('#screen-' + s).classList.toggle('active', s === screen));
  $('#hud').classList.toggle('hidden', screen === 'cover');
  $('#tabs').classList.toggle('hidden', screen === 'cover');
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === screen));
  if (screen === 'taller') renderTaller();
  if (screen === 'coleccion') renderColeccion();
  if (screen === 'feria') renderFeria();
  renderProgress();
  clearInterval(feriaTimerId);
  if (screen === 'feria') feriaTimerId = setInterval(renderFeria, 30000);
  window.scrollTo(0, 0);
}

/* ---------- Arranque ---------- */

function bindEvents() {
  $('#btn-abrir').addEventListener('click', () => { initAudio(); state.seenCover = true; save(); abrirSobreInicial(); });
  $('#slot-a').addEventListener('click', () => { if (slots[0]) { slots[0] = null; sfx('tab'); renderTaller(); } });
  $('#slot-b').addEventListener('click', () => { if (slots[1]) { slots[1] = null; sfx('tab'); renderTaller(); } });
  $$('.tab-btn').forEach(b => b.addEventListener('click', () => { sfx('tab'); show(b.dataset.tab); }));

  $('#feria-abrir-btn').addEventListener('click', () => { initAudio(); abrirSobre(); });

  $('#reveal-ok').addEventListener('click', advanceReveal);
  $('#modal-reveal').addEventListener('click', (e) => { if (e.target === $('#modal-reveal')) skipReveal(); });

  $('#detalle-close').addEventListener('click', () => $('#modal-detalle').classList.remove('open'));
  $('#modal-detalle').addEventListener('click', (e) => { if (e.target === $('#modal-detalle')) $('#modal-detalle').classList.remove('open'); });

  $('#pista-close').addEventListener('click', () => $('#modal-pista').classList.remove('open'));
  $('#modal-pista').addEventListener('click', (e) => { if (e.target === $('#modal-pista')) $('#modal-pista').classList.remove('open'); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#modal-reveal').classList.contains('open')) skipReveal();
    $('#modal-detalle').classList.remove('open');
    $('#modal-pista').classList.remove('open');
  });
}

function init() {
  state = load() || newState();
  $$('[data-icon]').forEach(n => { n.innerHTML = iconOf(n.dataset.icon); });
  bindEvents();
  show(state.seenCover ? 'taller' : 'cover');
  intentarCanjearRegalo();
}
document.addEventListener('DOMContentLoaded', init);
