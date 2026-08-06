/* ============================================================
   PAMBAMESA — cocina cenital coleccionable
   app.js — motor de álbum (Little Alchemy × TCG) sobre una
   encimera que se manipula con el dedo. Ver ESTILO.md.

   Tres capas separadas a propósito:
   - state.discovered  → tu ÁLBUM. Permanente. Nunca se pierde.
   - state.stock/tools → tu DESPENSA, lo que hay sobre la mesa.
     Se gasta al cocinar y se repone abriendo canastas (o con un
     regalo de alguien más).
   - state.regionsUnlocked → qué colecciones (Costa, Sierra…) ya
     se abrieron. Completar los platos de una región abre la
     siguiente, con su propia canasta de bienvenida.
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SAVE_KEY = 'pambamesa_save_v2';
/* nombres que ve el jugador (los ids internos 'semilla'/'hallazgo'
   se quedan igual en el motor, solo cambia la etiqueta) */
const RARITY_LABEL = { semilla: 'Ingrediente', hallazgo: 'Preparación', receta: 'Receta' };
const RARITY_ORDER = ['semilla', 'hallazgo', 'receta'];
const VERBO_LABEL = { pelar: 'Pelar', cocer: 'Cocinar', majar: 'Majar', freir: 'Freír', moler: 'Moler' };

/* ---------- Economía de sobres ---------- */

const SOBRE_TAM = 3;                          /* cartas por sobre */
const SOBRE_INTERVALO_MS = 3 * 60 * 60 * 1000; /* un sobre gratis cada 3h */
const SOBRE_MAX_STASH = 3;                    /* tope de sobres guardados */
const REGALOS_DIARIOS_MAX = 3;

/* ---------- Sucres: la moneda de la feria ---------- */
/* se ganan cocinando (así el mercado nunca compite con el taller,
   lo alimenta); se gastan cuando la despensa se queda corta. */
const SUCRES_POR_COCINAR = 1;
const SUCRES_POR_RAREZA = { semilla: 3, hallazgo: 6, receta: 25 };
const SUCRES_POR_RECETA_REPETIDA = 8;  /* cocinar de nuevo un plato ya terminado también vale: para eso sirve — vender o regalar */
const MERCADO_COSTO_SEMILLA = 4;
const MERCADO_COSTO_SOBRE = 20;
const PREGON_COOLDOWN_MS = 20 * 60 * 1000;   /* cada 20 min hay pregón nuevo */
const PREGON_RECOMPENSA = 15;

/* racha diaria: recompensa creciente por volver cada día (7 días, luego se repite) */
const RACHA_RECOMPENSAS = [5, 8, 12, 16, 20, 25, 40];
/* combo de cocina: cocinar varias veces seguidas sin salir del taller da un extra */
const COMBO_CADA = 3;
const COMBO_BONO = 5;

function regionesAbiertas() { return state.regionsUnlocked || ['costa']; }

function tablaDeSobre() {
  const abiertas = regionesAbiertas();
  const semillas = GAME_DATA.ingredientes.filter(i => abiertas.includes(i.region)).map(i => i.id);
  const hallazgos = CARTA_ORDEN.filter(id => CARTAS[id].rarity === 'hallazgo' && abiertas.includes(CARTAS[id].region));
  const recetas = CARTA_ORDEN.filter(id => CARTAS[id].rarity === 'receta' && abiertas.includes(CARTAS[id].region));
  const herramientas = UTENSILIOS.filter(u => abiertas.includes(u.region)).map(u => u.id);
  return [
    { peso: 45, tipo: 'semilla',    pool: semillas },
    { peso: 25, tipo: 'herramienta', pool: herramientas },
    { peso: 22, tipo: 'hallazgo',   pool: hallazgos },
    { peso: 8,  tipo: 'receta',     pool: recetas },
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
    discovered: [],           /* álbum: permanente */
    stock: {},                /* despensa: copias que tienes ahora */
    tools: {},                /* {id: usos restantes} */
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
    return Object.assign(newState(), s);   /* completa campos si vienen de un guardado anterior */
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

/* ---------- Regiones: desbloqueo progresivo ---------- */

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
  r.kitHerramientas.forEach(id => { const isNew = !hasTool(id); grantTool(id); items.push({ id, tool: true, isNew }); });
  r.kitSemillas.forEach(x => { addStock(x.id, x.n); items.push({ id: x.id, tool: false, isNew: discoverCard(x.id) }); });
  save();
  procesarColeccionables(items, { finalLabel: `¡A explorar ${r.nombre}! ✦`, finalCb: () => banner(`Se abrió ${r.nombre}`, '🗺') });
}

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
  peel: [{ f: 300, d: .06, g: .05 }],
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

/* mensaje grande para momentos que sí importan (abrir una región nueva) */
let bannerTimer = null;
function banner(msg, icon = '🗺') {
  const b = $('#banner');
  b.innerHTML = `<span class="banner-ic" aria-hidden="true">${icon}</span><span class="banner-txt">${msg}</span>`;
  b.classList.remove('visible'); void b.offsetWidth; b.classList.add('visible');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('visible'), 3600);
}
function el(tag, cls, text) { const n = document.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; }

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
  return `<div class="carta-art">${iconOf(id)}</div><div class="carta-plate"><span class="carta-nombre">${t.name}</span><span class="carta-rareza">Utensilio</span></div>`;
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

/* ============================================================
   LA COCINA — la encimera vista desde arriba.
   Todo lo que tienes está sobre la mesa, a la vista, y se lleva
   a la olla arrastrándolo (o con un toque, que hace lo mismo).
   Ver ESTILO.md §5: si es un objeto, se toca o se arrastra.
   ============================================================ */

function renderTaller() {
  renderOlla();
  renderTallerAction();
  renderComboIndicador();
  renderEncimera();
}

/* ---------- la olla ---------- */

function renderOlla() {
  const olla = $('#olla');
  const dentro = $('#olla-dentro');
  const puestos = slots.filter(Boolean);
  dentro.innerHTML = '';
  if (!puestos.length) {
    dentro.innerHTML = `<span class="olla-vacia-txt">trae algo de la mesa</span>`;
  } else {
    puestos.forEach(id => {
      const ic = el('div', 'olla-item' + (isUtensilio(id) ? ' es-utensilio' : ''));
      ic.innerHTML = iconOf(id);
      dentro.appendChild(ic);
    });
  }
  olla.classList.toggle('tiene-algo', puestos.length > 0);
  /* la brasa se enciende solo cuando lo de adentro sí lleva a algo */
  const lista = slots[0] && slots[1] && !!findReceta(slots[0], slots[1]);
  $('#hornilla').classList.toggle('encendida', lista);
}

/* qué utensilios sirven para lo que hay ahora mismo en la olla: se
   resaltan sobre la mesa para que no haya que adivinar */
function utensiliosSugeridos() {
  if (!slots[0] || slots[1]) return [];
  const id = slots[0];
  const out = [];
  RECETAS.forEach(r => {
    if (r.a === id && isUtensilio(r.b) && hasTool(r.b)) out.push(r.b);
    else if (r.b === id && isUtensilio(r.a) && hasTool(r.a)) out.push(r.a);
  });
  return out;
}

function renderTallerAction() {
  const zone = $('#taller-action'); zone.innerHTML = '';
  const hint = $('#fogon-hint');

  if (slots[0] && slots[1]) {
    hint.textContent = findReceta(slots[0], slots[1]) ? 'el fogón está listo' : 'a ver qué sale de esto…';
    const cocinar = document.createElement('button');
    cocinar.type = 'button'; cocinar.className = 'btn-leather combinar-btn';
    cocinar.textContent = 'Cocinar ✦';
    cocinar.addEventListener('click', combinarMesa);
    zone.appendChild(cocinar);
    return;
  }
  if (slots[0]) {
    const sug = utensiliosSugeridos();
    hint.textContent = sug.length
      ? 'trae el utensilio que brilla, o algo más de la mesa'
      : 'añade algo más de la mesa';
    return;
  }
  hint.textContent = 'arrastra un ingrediente hasta la olla';
}

/* ---------- la encimera: todo a la vista, nada en cajones ---------- */

function renderEncimera() {
  const abiertas = regionesAbiertas();
  const sugeridos = utensiliosSugeridos();

  const tools = UTENSILIOS.filter(u => abiertas.includes(u.region) && hasTool(u.id)).map(u => u.id);
  pintarRepisa($('#repisa-utensilios'), tools, 'a la mano', { tool: true, sugeridos });

  const preps = state.discovered.filter(id => CARTAS[id] && CARTAS[id].rarity === 'hallazgo' && stockOf(id) > 0);
  pintarRepisa($('#repisa-prep'), preps, 'en preparación', {});

  const ings = CARTA_ORDEN.filter(id => CARTAS[id].rarity === 'semilla' && abiertas.includes(CARTAS[id].region) && stockOf(id) > 0);
  const platos = state.discovered.filter(id => CARTAS[id] && CARTAS[id].rarity === 'receta' && stockOf(id) > 0);
  const vacio = !ings.length && !platos.length && !preps.length
    ? 'La mesa está vacía. Pásate por la feria a conseguir ingredientes.' : null;
  pintarRepisa($('#repisa-ingredientes'), ings.concat(platos), 'en la mesa', { vacio });
}

function pintarRepisa(wrap, ids, titulo, { tool = false, sugeridos = [], vacio = null } = {}) {
  wrap.innerHTML = '';
  if (!ids.length) {
    if (vacio) wrap.appendChild(el('p', 'encimera-vacio', vacio));
    return;
  }
  wrap.appendChild(el('span', 'repisa-label hand', titulo));
  const fila = el('div', 'repisa-fila');
  ids.forEach(id => fila.appendChild(objetoDeMesa(id, { tool, sugerido: sugeridos.includes(id) })));
  wrap.appendChild(fila);
}

/* un objeto real apoyado en la encimera: icono, sombra y su cuenta */
function objetoDeMesa(id, { tool = false, sugerido = false } = {}) {
  const nombre = tool ? UTENSILIOS.find(u => u.id === id).name : CARTAS[id].name;
  const rarity = tool ? 'tool' : CARTAS[id].rarity;
  const nodo = document.createElement('div');
  nodo.className = `objeto rarity-${rarity}` + (sugerido ? ' sugerido' : '');
  nodo.setAttribute('role', 'button');
  nodo.setAttribute('tabindex', '0');
  nodo.setAttribute('aria-label', nombre);

  const insignia = tool
    ? `<span class="objeto-durab">${dotsDurabilidad(id)}</span>`
    : `<span class="objeto-cant">${stockOf(id)}</span>`;
  nodo.innerHTML = `
    ${tool ? '' : insignia}
    <div class="objeto-icono">${iconOf(id)}</div>
    <span class="objeto-sombra" aria-hidden="true"></span>
    <span class="objeto-nombre">${nombre}</span>
    ${tool ? insignia : ''}`;

  hacerArrastrable(nodo, id, tool);
  nodo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tryPlace(id); }
  });
  return nodo;
}
function dotsDurabilidad(id) {
  const max = DURABILIDAD_HERRAMIENTA[id] || 0, quedan = toolUses(id);
  let out = '';
  for (let i = 0; i < max; i++) out += `<i class="${i < quedan ? '' : 'gastado'}"></i>`;
  return out;
}

/* ---------- arrastrar de la mesa a la olla ---------- */

let arrastre = null;
function hacerArrastrable(nodo, id, tool) {
  nodo.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    arrastre = { id, tool, x0: e.clientX, y0: e.clientY, movido: false, fantasma: null };
    try { nodo.setPointerCapture(e.pointerId); } catch (err) {}
    sfx('tab'); buzz(8);
  });

  nodo.addEventListener('pointermove', (e) => {
    if (!arrastre || arrastre.id !== id) return;
    const dx = e.clientX - arrastre.x0, dy = e.clientY - arrastre.y0;
    if (!arrastre.movido && Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
    if (!arrastre.movido) {
      arrastre.movido = true;
      const f = el('div', 'objeto-fantasma');
      f.innerHTML = iconOf(id);
      document.body.appendChild(f);
      arrastre.fantasma = f;
    }
    arrastre.fantasma.style.left = e.clientX + 'px';
    arrastre.fantasma.style.top = e.clientY + 'px';
    $('#olla').classList.toggle('encima', sobreLaOlla(e.clientX, e.clientY));
  });

  const soltar = (e) => {
    if (!arrastre || arrastre.id !== id) return;
    const { movido, fantasma } = arrastre;
    if (fantasma) fantasma.remove();
    $('#olla').classList.remove('encima');
    const enOlla = movido ? sobreLaOlla(e.clientX, e.clientY) : true;  /* un toque también sirve */
    arrastre = null;
    if (enOlla) tryPlace(id);
  };
  nodo.addEventListener('pointerup', soltar);
  nodo.addEventListener('pointercancel', () => {
    if (arrastre && arrastre.fantasma) arrastre.fantasma.remove();
    $('#olla').classList.remove('encima');
    arrastre = null;
  });
}
function sobreLaOlla(x, y) {
  const r = $('#olla').getBoundingClientRect();
  const margen = 26;   /* la olla perdona: no hay que apuntar fino */
  return x >= r.left - margen && x <= r.right + margen && y >= r.top - margen && y <= r.bottom + margen;
}

function tryPlace(id) {
  const disponible = isUtensilio(id) ? hasTool(id) : stockOf(id) > 0;
  if (!disponible) { toast(isUtensilio(id) ? 'Se gastó. Consigue otro en la feria 🎟' : 'Ya no te queda. Consíguelo en la feria 🎟'); return; }

  /* soltar un utensilio en una olla con algo dentro cocina de una vez:
     es el gesto natural, no hace falta confirmar con un botón */
  if (isUtensilio(id) && slots[0] && !slots[1]) {
    slots[1] = id;
    plopEnOlla();
    renderOlla();
    setTimeout(combinarMesa, 180);
    return;
  }
  const i = slots[0] === null ? 0 : (slots[1] === null ? 1 : null);
  if (i === null) { toast('La olla está llena. Cocínala o vacíala tocándola.'); return; }
  slots[i] = id;
  plopEnOlla();
  renderTaller();
}
function plopEnOlla() {
  const olla = $('#olla');
  olla.classList.remove('recibe'); void olla.offsetWidth; olla.classList.add('recibe');
  sfx('peel'); buzz(12);
}
function clearSlots() { slots = [null, null]; renderTaller(); }
function vaciarOlla() {
  if (!slots[0] && !slots[1]) return;
  sfx('tab'); buzz(10);
  clearSlots();
}

/* combo de cocina: cocinar seguido sin salir del taller da un extra;
   se reinicia cada vez que entras de nuevo a la pantalla */
let comboCocina = 0;
function renderComboIndicador() {
  const badge = $('#combo-indicador');
  if (comboCocina > 1) { badge.textContent = `🔥 x${comboCocina}`; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

function findReceta(x, y) {
  return RECETAS.find(r => (r.a === x && r.b === y) || (r.a === y && r.b === x)) || null;
}
function combinarMesa() {
  const [x, y] = slots;
  if (!x || !y) return;
  const r = findReceta(x, y);
  const surface = $('#hornilla');
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
  comboCocina += 1;
  const comboBono = (comboCocina % COMBO_CADA === 0) ? COMBO_BONO : 0;
  const rarity = CARTAS[r.result].rarity;
  /* un plato ya conocido no se descubre de nuevo, pero sí sirve para
     vender o regalar — por eso repetirlo también da sucres */
  const bonoRareza = isNew ? (SUCRES_POR_RAREZA[rarity] || 0) : (rarity === 'receta' ? SUCRES_POR_RECETA_REPETIDA : 0);
  const sucres = SUCRES_POR_COCINAR + bonoRareza + comboBono;
  state.sucres = (state.sucres || 0) + sucres;
  revisarDesbloqueoRegiones();
  save();
  fogonazo();
  clearSlots();
  procesarColeccionables([{ id: r.result, tool: false, isNew, sucres, combo: comboBono ? comboCocina : 0 }], { finalLabel: 'Guardar en el álbum' });
}

/* el destello de calor cuando algo sale bien del fogón */
function fogonazo() {
  const hornilla = $('#hornilla');
  if (!hornilla) return;
  const flash = el('div', 'fogonazo');
  hornilla.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}

/* ============================================================
   Ceremonia de revelación vs. resultado silencioso: una preparación
   que ya tienes en el álbum no necesita mostrarse en grande otra vez
   (rompe el ritmo de cocinar); un plato terminado o algo nuevo sí.
   ============================================================ */
function necesitaCeremonia(item) {
  if (item.isNew) return true;
  return !item.tool && CARTAS[item.id].rarity === 'receta';
}
function procesarColeccionables(items, opts = {}) {
  const ceremonia = items.filter(necesitaCeremonia);
  const silenciosos = items.filter(it => !necesitaCeremonia(it));
  if (silenciosos.length) {
    const resumen = silenciosos.map(it => `+1 ${it.tool ? UTENSILIOS.find(u => u.id === it.id).name : CARTAS[it.id].name}`).join(' · ');
    toast(resumen);
    sfx('tab');
  }
  if (ceremonia.length) { showRevealQueue(ceremonia, opts); return; }
  if (pendingRegionUnlock) { const rid = pendingRegionUnlock; pendingRegionUnlock = null; iniciarSobreDeRegion(rid); return; }
  if (opts.finalCb) opts.finalCb();
}

/* ============================================================
   REVELACIÓN — al estilo de un sobre de cartas coleccionables:
   giro 3D para voltear la carta, desliza para pasar a la
   siguiente. El botón sigue ahí como respaldo (teclado/escritorio).
   ============================================================ */

let revealQueue = [];
let revealFinalLabel = 'Guardar en el álbum';
let revealFinalCb = null;
let revealIsGift = false;
let revealCurrent = null;
let revealPhase = 'back';   /* 'back' | 'front' */

function showRevealQueue(items, opts = {}) {
  revealQueue = items.slice();
  revealFinalLabel = opts.finalLabel || 'Guardar en el álbum';
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
  if (currentScreen === 'taller') renderTaller();
  if (currentScreen === 'coleccion') renderColeccion();
  if (currentScreen === 'feria') renderFeria();
  renderProgress();
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
/* pila detrás de la carta actual: deja ver que hay más esperando */
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
  const nombre = item.tool ? UTENSILIOS.find(u => u.id === item.id).name : CARTAS[item.id].name;
  const rarity = item.tool ? null : CARTAS[item.id].rarity;
  const esRecetaRepetida = !item.isNew && rarity === 'receta';
  const especial = item.isNew || revealIsGift || esRecetaRepetida;
  let msg = revealIsGift ? '¡Te compartieron esta carta! 🎁'
    : item.isNew ? '¡Nueva carta para tu álbum!'
    : esRecetaRepetida ? `¡Otra vez ${nombre}! Sirve para vender o compartir`
    : `+1 ${nombre}`;
  if (item.sucres) msg += ` · +${item.sucres} <span class="icono-sucre">S</span>`;
  if (item.combo) msg += ` · 🔥 Racha de cocina x${item.combo}`;
  $('#reveal-banner').innerHTML = msg;
  $('#reveal-banner').classList.add('visible');
  $('#reveal-banner').classList.toggle('is-new', especial);
  $('#reveal-hint').classList.add('hidden');
  $('#reveal-ok').textContent = revealQueue.length ? 'Siguiente carta →' : revealFinalLabel;
  sfx(especial ? 'win' : 'flip');
  buzz(especial ? [30, 40, 60] : 15);
  if (especial && !item.tool && rarity === 'receta') burstConfetti($('#reveal-front'));
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
  const colors = ['#c9982f', '#e8c877', '#fff3d0', '#f6dcae'];
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

/* gestos: desliza arriba para revelar, desliza a los lados para pasar
   a la siguiente; el giro 3D sigue al dedo mientras tanto */
function bindRevealGestures() {
  const stage = $('#reveal-stage');
  const flip = $('#reveal-flip');
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
      const tiltX = Math.max(-16, Math.min(16, -dy * .22));
      const tiltY = Math.max(-14, Math.min(14, dx * .12));
      flip.style.transform = `translateY(${lift}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    } else {
      const tiltX = Math.max(-10, Math.min(10, -dy * .08));
      const tiltY = Math.max(-10, Math.min(10, dx * .06));
      flip.style.transform = `translateX(${dx}px) rotateY(${180 + tiltY}deg) rotateX(${tiltX}deg) rotateZ(${(dx * .04).toFixed(2)}deg)`;
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
        flip.style.transform = `translateX(${dir * 560}px) rotateY(${180 + dir * 40}deg) rotateZ(${dir * 16}deg)`;
        setTimeout(() => nextRevealCard(false), 240);
      } else if (!moved) revealAdvance();
      else flip.style.transform = 'rotateY(180deg)';
    }
  };
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', () => { dragging = false; });
}

/* ---------- El álbum (Colección), organizado por región ---------- */

function renderColeccion() {
  const body = $('#coleccion-body'); body.innerHTML = '';
  REGION_ORDEN.forEach(rid => {
    const r = REGIONES[rid];
    const abierta = regionesAbiertas().includes(rid);
    const idsRegion = CARTA_ORDEN.filter(id => CARTAS[id].region === rid);
    const gotRegion = idsRegion.filter(id => state.discovered.includes(id)).length;

    const section = el('section', 'region-seccion');
    const head = document.createElement('header');
    head.className = 'region-head';
    head.style.setProperty('--region-acento', r.acento);
    head.innerHTML = `<h3>${r.nombre}</h3><p class="region-tagline hand">${r.tagline}</p>` +
      (abierta ? `<p class="region-progress">${gotRegion} / ${idsRegion.length}</p>` : '');
    section.appendChild(head);

    if (r.proximamente) {
      section.appendChild(el('p', 'region-locked', '🗺 Muy pronto en tu recetario…'));
    } else if (!abierta) {
      const faltan = (r.desbloqueo_recetas || []).map(id => CARTAS[id] && CARTAS[id].name).filter(Boolean).join(', ');
      section.appendChild(el('p', 'region-locked', `🔒 Completa ${faltan} para abrir esta región.`));
    } else {
      const grid = document.createElement('div'); grid.className = 'album-grid';
      idsRegion.forEach(id => grid.appendChild(albumCard(id, CARTAS[id].rarity)));
      section.appendChild(grid);
    }
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
  renderSucres();
}
let sucresPintados = null;
function renderSucres() {
  const v = state.sucres || 0;
  $$('.hud-sucres-count').forEach(n => n.textContent = v);
  /* que se note cuando entra plata: la moneda da un brinco */
  if (sucresPintados !== null && v > sucresPintados) {
    const chip = $('.hud-sucres');
    if (chip) { chip.classList.remove('gana'); void chip.offsetWidth; chip.classList.add('gana'); }
  }
  sucresPintados = v;
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
  revisarDesbloqueoRegiones();
  save();
  procesarColeccionables(pulls, { finalLabel: '¡Genial!' });
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
  if (state.regalosCanjeados.includes(marca)) { setTimeout(() => toast('Ya abriste este regalo en esta cocina.'), 500); return; }
  state.regalosCanjeados.push(marca);
  const isNew = discoverCard(id);
  addStock(id, 1);
  revisarDesbloqueoRegiones();
  save();
  setTimeout(() => showRevealQueue([{ id, tool: false, isNew }], { finalLabel: '¡Qué lindo detalle!', giftFrom: true }), 500);
}

function renderFeria() {
  actualizarSobresGratis();
  $$('.sobre-count').forEach(n => n.textContent = state.sobres);
  const abrirBtn = $('#feria-abrir-btn');
  abrirBtn.disabled = state.sobres <= 0;
  const rest = Math.max(0, state.proximoSobreGratisEn - Date.now());
  $('#feria-timer').textContent =
    state.sobres > 0 ? 'toca la canasta para abrirla'
    : state.sobres >= SOBRE_MAX_STASH ? 'Tu bolsa de canastas está llena.'
    : rest <= 0 ? '¡Ya tienes una canasta nueva!'
    : `Próxima canasta gratis en ${formatDuracion(rest)}`;

  renderMercado();

  $('#regalos-restantes').textContent = regalosRestantesHoy();
  const grid = $('#regalos-grid'); grid.innerHTML = '';
  const disponibles = state.discovered.filter(id => CARTAS[id]);
  if (!disponibles.length) grid.appendChild(el('span', 'regalos-empty', 'Descubre una carta primero para poder compartirla.'));
  else disponibles.forEach(id => grid.appendChild(regaloCard(id)));
}

/* ---------- El mercado: cambia sucres (ganados al cocinar) por despensa ---------- */

function mercadoChip(id) {
  const c = CARTAS[id];
  const costo = MERCADO_COSTO_SEMILLA;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'objeto rarity-' + c.rarity + ' mercado-chip' + ((state.sucres || 0) < costo ? ' agotado' : '');
  btn.innerHTML = `
    <span class="objeto-cant">${stockOf(id)}</span>
    <div class="objeto-icono">${iconOf(id)}</div>
    <span class="objeto-sombra" aria-hidden="true"></span>
    <span class="objeto-nombre">${c.name}</span>
    <span class="objeto-precio">${costo} <span class="icono-sucre">S</span></span>`;
  btn.addEventListener('click', () => comprarSemilla(id, costo));
  return btn;
}
function comprarSemilla(id, costo) {
  if ((state.sucres || 0) < costo) { toast('No te alcanzan los sucres. Cocina algo o escucha el pregón 📣'); return; }
  state.sucres -= costo;
  addStock(id, 1);
  save(); sfx('win'); buzz(15);
  toast(`+1 ${CARTAS[id].name}`);
  renderFeria();
  if (currentScreen === 'taller') renderTaller();
  renderSucres();
}
function comprarSobreConSucres() {
  if (state.sobres >= SOBRE_MAX_STASH) { toast('Tu bolsa de canastas está llena.'); return; }
  if ((state.sucres || 0) < MERCADO_COSTO_SOBRE) { toast('Te faltan sucres para una canasta.'); return; }
  state.sucres -= MERCADO_COSTO_SOBRE;
  state.sobres += 1;
  save(); sfx('win'); buzz([20, 30, 20]);
  toast('¡Canasta nueva en tu bolsa!');
  renderFeria(); renderSucres();
}
function escucharPregon() {
  const rest = Math.max(0, (state.pregonProximoEn || 0) - Date.now());
  if (rest > 0) return;
  const btn = $('#pregon-btn');
  btn.disabled = true; btn.textContent = '📣 Escuchando…';
  sfx('tab');
  setTimeout(() => {
    state.sucres = (state.sucres || 0) + PREGON_RECOMPENSA;
    state.pregonProximoEn = Date.now() + PREGON_COOLDOWN_MS;
    save();
    sfx('win'); buzz([30, 40, 60]);
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
  if (rest <= 0) pregonBtn.textContent = '📣 Escuchar el pregón';
  pregonBtn.disabled = rest > 0;
  $('#pregon-timer').innerHTML = rest > 0 ? `El pregonero vuelve en ${formatDuracion(rest)}` : `Escúchalo y gana ${PREGON_RECOMPENSA} <span class="icono-sucre">S</span> de propina`;
}

/* ---------- Racha diaria: recompensa creciente por volver cada día ---------- */

let rachaPendiente = false;
function revisarRachaDiaria() {
  const hoy = hoyISO();
  if (!state.racha) state.racha = { dias: 0, ultimaFecha: '' };
  if (state.racha.ultimaFecha === hoy) { rachaPendiente = false; return; }
  if (!state.racha.ultimaFecha) {
    /* primera vez que entra a la cocina: arranca la racha sin modal,
       para no saturar el onboarding con otro premio más */
    state.racha = { dias: 1, ultimaFecha: hoy };
    save();
    return;
  }
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  state.racha.diasCandidato = state.racha.ultimaFecha === ayer ? state.racha.dias + 1 : 1;
  rachaPendiente = true;
}
function mostrarModalRacha() {
  const dias = state.racha.diasCandidato || 1;
  const recompensa = RACHA_RECOMPENSAS[(dias - 1) % RACHA_RECOMPENSAS.length];
  $('#racha-dias').textContent = dias;
  $('#racha-recompensa').innerHTML = `+${recompensa} <span class="icono-sucre">S</span>`;
  $('#modal-racha').classList.add('open');
  sfx('peel');
}
function reclamarRacha() {
  const dias = state.racha.diasCandidato || 1;
  const recompensa = RACHA_RECOMPENSAS[(dias - 1) % RACHA_RECOMPENSAS.length];
  state.sucres = (state.sucres || 0) + recompensa;
  state.racha.dias = dias;
  state.racha.ultimaFecha = hoyISO();
  rachaPendiente = false;
  save();
  $('#modal-racha').classList.remove('open');
  sfx('win'); buzz([30, 40, 60]);
  toast(`¡+${recompensa} sucres de racha!`);
  renderSucres();
}

/* ---------- El sobre de bienvenida ---------- */

function abrirSobreInicial() {
  iniciarSobreDeRegion('costa');
  state.starterOpened = true;
  state.sobres += 1;   /* un sobre de propina, para que abran uno "de verdad" enseguida */
  state.proximoSobreGratisEn = Date.now() + SOBRE_INTERVALO_MS;
  save();
  /* iniciarSobreDeRegion ya llama a showRevealQueue; le cambiamos el cierre
     para que aterrice en el taller en vez de solo mostrar el banner */
  revealFinalLabel = 'A la mesa ✦';
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
  clearInterval(feriaTimerId);
  if (screen === 'feria') feriaTimerId = setInterval(renderFeria, 30000);
  window.scrollTo(0, 0);
}

/* ---------- Arranque ---------- */

function bindEvents() {
  $('#btn-abrir').addEventListener('click', () => { initAudio(); state.seenCover = true; save(); abrirSobreInicial(); });
  $$('.tab-btn').forEach(b => b.addEventListener('click', () => { sfx('tab'); show(b.dataset.tab); }));

  $('#feria-abrir-btn').addEventListener('click', () => { initAudio(); abrirSobre(); });
  $('#mercado-sobre-btn').addEventListener('click', () => { initAudio(); comprarSobreConSucres(); });
  $('#pregon-btn').addEventListener('click', () => { initAudio(); escucharPregon(); });

  /* tocar la olla la vacía: devuelve todo a la mesa */
  $('#olla').addEventListener('click', vaciarOlla);
  $('#olla').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); vaciarOlla(); }
  });

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
  $$('[data-icon]').forEach(n => { n.innerHTML = iconOf(n.dataset.icon); });
  revisarRachaDiaria();
  bindEvents();
  show(state.seenCover ? 'taller' : 'cover');
  intentarCanjearRegalo();
}
document.addEventListener('DOMContentLoaded', init);
