/* ============================================================
   PAMBAMESA — cuaderno de viaje de sabores
   app.js — motor de álbum coleccionable (Little Alchemy × TCG).

   Dos capas separadas a propósito:
   - state.discovered  → tu ÁLBUM. Permanente. Nunca se pierde.
   - state.stock/tools → tu DESPENSA. Se gasta al combinar y se
     repone abriendo sobres (o con un regalo de alguien más).
   - state.regionsUnlocked → qué colecciones (Costa, Sierra…) ya
     se abrieron. Completar los platos de una región abre la
     siguiente, con su propio sobre de bienvenida.
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SAVE_KEY = 'pambamesa_save_v2';
/* nombres que ve el jugador (los ids internos 'semilla'/'hallazgo'
   se quedan igual en el motor, solo cambia la etiqueta) */
const RARITY_LABEL = { semilla: 'Ingrediente', hallazgo: 'Preparación', receta: 'Platillo' };
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
let escenaOn = false;   /* ¿está corriendo el mesón 3D? (si no, fogón 2D) */

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
  procesarColeccionables(items, { finalLabel: `¡A cocinar ${r.nombre}! ✦`, finalCb: () => banner(`Nuevo menú: ${r.nombre}`, '🍽') });
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

/* en la mesa una carta deja de ser carta: se planta como un ingrediente
   de verdad sobre la tabla, sin marco ni rareza (esos quedan para el
   álbum y el sobre — aquí solo importa lo que estás cocinando) */
function mesaItemInner(id) {
  const name = isUtensilio(id) ? UTENSILIOS.find(u => u.id === id).name : CARTAS[id].name;
  return `<div class="ingrediente-mesa">
      <div class="ing-icono">${iconOf(id)}</div>
      <span class="ing-sombra" aria-hidden="true"></span>
      <span class="ing-nombre hand">${name}</span>
    </div>`;
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
  else btn.addEventListener('click', () => toast(tool ? 'Se gastó. Consigue uno nuevo en la despensa 🛒' : 'Ya no te queda. Repónlo en la despensa 🛒'));
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

/* ---------- El fogón (Taller) ---------- */

function renderTaller() {
  if (escenaOn) {
    Escena3D.setSlots(slots);
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

/* nombres de lo que hay sobre la tabla 3D; tocar la etiqueta lo quita */
function nombreDe(id) { return isUtensilio(id) ? UTENSILIOS.find(u => u.id === id).name : CARTAS[id].name; }
function renderMesaEtiquetas() {
  const wrap = $('#mesa-etiquetas'); wrap.innerHTML = '';
  slots.forEach((id, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mesa-etiqueta' + (id ? '' : ' vacia');
    chip.textContent = id ? `${nombreDe(id)} ✕` : (i === 0 ? 'elige un ingrediente' : '+');
    if (id) chip.addEventListener('click', () => { slots[i] = null; sfx('tab'); renderTaller(); });
    wrap.appendChild(chip);
  });
}

/* lo que ya empezaste a preparar se queda a la vista, sobre la mesa
   —no en un cajón aparte— para que no se te olvide seguir usándolo */
function renderEnPreparacion() {
  const wrap = $('#en-preparacion');
  const ids = state.discovered.filter(id => CARTAS[id] && CARTAS[id].rarity === 'hallazgo' && stockOf(id) > 0);
  if (!ids.length) { wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }
  wrap.classList.remove('hidden');
  wrap.innerHTML = '<span class="en-preparacion-label">En preparación</span>';
  const row = el('div', 'en-preparacion-row');
  ids.forEach(id => row.appendChild(miniChip(id)));
  wrap.appendChild(row);
}
function slotEmptyHTML() { return '<span class="slot-plus" aria-hidden="true">+</span><span class="slot-txt">elige un ingrediente</span>'; }

/* qué acciones rápidas puede hacer un solo ingrediente ya puesto en el
   fogón (p. ej. "verde" solo, sin necesitar poner el cuchillo a mano):
   busca fórmulas donde el otro lado es un utensilio que ya tienes */
function accionesRapidasPara(id) {
  const out = [];
  RECETAS.forEach(r => {
    if (r.a === id && isUtensilio(r.b) && hasTool(r.b)) out.push({ rec: r, tool: r.b });
    else if (r.b === id && isUtensilio(r.a) && hasTool(r.a)) out.push({ rec: r, tool: r.a });
  });
  return out;
}
function ejecutarAccionRapida(accion) {
  slots = [slots[0], accion.tool];
  combinarMesa();
}

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
    limpiar.textContent = 'limpiar la estación';
    limpiar.addEventListener('click', clearSlots);
    zone.appendChild(limpiar);
    return;
  }
  if (slots[0] && !isUtensilio(slots[0])) {
    const rapidas = accionesRapidasPara(slots[0]);
    if (rapidas.length) {
      rapidas.forEach(accion => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'btn-leather combinar-btn quick-action-btn';
        btn.textContent = `${VERBO_LABEL[accion.rec.verbo] || accion.rec.verbo} ✦`;
        btn.addEventListener('click', () => ejecutarAccionRapida(accion));
        zone.appendChild(btn);
      });
      const limpiar = document.createElement('button');
      limpiar.type = 'button'; limpiar.className = 'btn-ghost small';
      limpiar.textContent = 'quitar';
      limpiar.addEventListener('click', clearSlots);
      zone.appendChild(limpiar);
      return;
    }
    zone.innerHTML = `<span class="taller-hint">Añade el segundo ingrediente, o toca algo de lo que tienes en preparación</span>`;
    return;
  }
  zone.innerHTML = `<span class="taller-hint">Abre tus ingredientes 🧺 y elige uno para empezar el plato</span>`;
}

/* ---------- Despensa: canasta / utensilios (se abren bajo pedido) ---------- */

let despensaTipo = null;
const DESPENSA_TITULO = { ingredientes: 'Tus ingredientes', utensilios: 'Utensilios' };
const DESPENSA_VACIO = {
  ingredientes: 'Sin ingredientes por ahora — cómpralos o abre una caja en la despensa.',
  utensilios: 'Sin utensilios listos — consíguelos en la despensa.',
};
function abrirDespensa(tipo) {
  despensaTipo = tipo;
  $('#despensa-titulo').textContent = DESPENSA_TITULO[tipo];
  renderDespensaGrid();
  $('#modal-despensa').classList.add('open');
  sfx('tab');
}
function cerrarDespensa() { $('#modal-despensa').classList.remove('open'); }
function renderDespensaGrid() {
  const grid = $('#despensa-grid'); grid.innerHTML = '';
  let ids = [];
  if (despensaTipo === 'ingredientes') ids = CARTA_ORDEN.filter(id => CARTAS[id].rarity === 'semilla' && regionesAbiertas().includes(CARTAS[id].region) && stockOf(id) > 0);
  else if (despensaTipo === 'utensilios') ids = UTENSILIOS.filter(u => regionesAbiertas().includes(u.region) && hasTool(u.id)).map(u => u.id);

  if (!ids.length) { grid.appendChild(el('p', 'despensa-vacio', DESPENSA_VACIO[despensaTipo])); return; }
  ids.forEach(id => {
    const chip = miniChip(id, { tool: despensaTipo === 'utensilios' });
    chip.addEventListener('click', cerrarDespensa);
    grid.appendChild(chip);
  });
}

function tryPlace(id) {
  const i = slots[0] === null ? 0 : (slots[1] === null ? 1 : null);
  if (i === null) { toast('La estación ya tiene dos cosas. Combínalas o límpiala.'); return; }
  slots[i] = id;
  sfx('tab'); buzz(10);
  renderTaller();
}
function clearSlots() { slots = [null, null]; renderTaller(); }

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
  const surface = escenaOn ? $('#cocina3d') : $('#fogon');
  if (!r) {
    if (escenaOn) Escena3D.shake();
    surface.classList.remove('shake'); void surface.offsetWidth; surface.classList.add('shake');
    sfx('fail'); buzz(60);
    toast('Esos dos no combinan… todavía. Prueba otra pareja.');
    return;
  }
  const xOk = isUtensilio(x) ? hasTool(x) : stockOf(x) > 0;
  const yOk = isUtensilio(y) ? hasTool(y) : stockOf(y) > 0;
  if (!xOk || !yOk) { toast('Ya no te queda esto. Repónlo en la despensa 🛒'); return; }

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
  const fin = () => procesarColeccionables([{ id: r.result, tool: false, isNew, sucres, combo: comboBono ? comboCocina : 0 }], { finalLabel: 'Al recetario ✦' });
  if (escenaOn) { Escena3D.combinar(fin); clearSlots(); }   /* poof de estrellitas sobre la tabla, luego la carta */
  else { clearSlots(); fin(); }
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
let revealFinalLabel = 'Al recetario ✦';
let revealFinalCb = null;
let revealIsGift = false;
let revealCurrent = null;
let revealPhase = 'back';   /* 'back' | 'front' */

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
  let msg = revealIsGift ? '¡Te invitaron a probar este plato! 🎁'
    : item.isNew ? '¡Nuevo descubrimiento para tu recetario!'
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
      section.appendChild(el('p', 'region-locked', '🗺 Muy pronto en tu cuaderno de viaje…'));
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
function renderSucres() { $$('.hud-sucres-count').forEach(n => n.textContent = state.sucres || 0); }

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
  if (regalosRestantesHoy() <= 0) { toast('Ya repartiste tus invitaciones de hoy. Vuelve mañana 🍽'); return; }
  const code = codificarRegalo(id);
  const url = `${location.origin}${location.pathname}?regalo=${code}`;
  const nombre = CARTAS[id].name;
  const texto = `¡Te invito a probar mi ${nombre} en Pambamesa! 🍽`;
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
  if (state.regalosCanjeados.includes(marca)) { setTimeout(() => toast('Ya probaste este plato en esta cocina.'), 500); return; }
  state.regalosCanjeados.push(marca);
  const isNew = discoverCard(id);
  addStock(id, 1);
  revisarDesbloqueoRegiones();
  save();
  setTimeout(() => showRevealQueue([{ id, tool: false, isNew }], { finalLabel: '¡Buen provecho!', giftFrom: true }), 500);
}

function renderFeria() {
  actualizarSobresGratis();
  $$('.sobre-count').forEach(n => n.textContent = state.sobres);
  const abrirBtn = $('#feria-abrir-btn');
  abrirBtn.disabled = state.sobres <= 0;
  const rest = Math.max(0, state.proximoSobreGratisEn - Date.now());
  $('#feria-timer').textContent = state.sobres >= SOBRE_MAX_STASH
    ? 'Tu despensa no acepta más cajas por ahora.'
    : rest <= 0 ? '¡Llegó una caja nueva del mercado!' : `Próxima caja gratis en ${formatDuracion(rest)}`;

  renderMercado();

  $('#regalos-restantes').textContent = regalosRestantesHoy();
  const grid = $('#regalos-grid'); grid.innerHTML = '';
  const disponibles = state.discovered.filter(id => CARTAS[id]);
  if (!disponibles.length) grid.appendChild(el('span', 'regalos-empty', 'Descubre un plato primero para poder invitarlo.'));
  else disponibles.forEach(id => grid.appendChild(regaloCard(id)));
}

/* ---------- El mercado: cambia sucres (ganados al cocinar) por despensa ---------- */

function mercadoChip(id) {
  const c = CARTAS[id];
  const costo = MERCADO_COSTO_SEMILLA;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'carta-mini rarity-' + c.rarity + ' mercado-chip' + ((state.sucres || 0) < costo ? ' agotado' : '');
  btn.innerHTML = `<span class="mini-cant">${stockOf(id)}</span><span class="mini-icon">${iconOf(id)}</span><span class="mini-name">${c.name}</span><span class="mini-costo">${costo} <span class="icono-sucre">S</span></span>`;
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
  if (state.sobres >= SOBRE_MAX_STASH) { toast('Tu despensa no acepta más cajas por ahora.'); return; }
  if ((state.sucres || 0) < MERCADO_COSTO_SOBRE) { toast('Te faltan sucres para una caja.'); return; }
  state.sucres -= MERCADO_COSTO_SOBRE;
  state.sobres += 1;
  save(); sfx('win'); buzz([20, 30, 20]);
  toast('¡Caja nueva en tu despensa!');
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
    /* primera vez que abre el cuaderno: arranca la racha sin modal,
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
  if (escenaOn) Escena3D.setActive(screen === 'taller');   /* no gastar batería fuera de la cocina */
  clearInterval(feriaTimerId);
  if (screen === 'feria') feriaTimerId = setInterval(renderFeria, 30000);
  window.scrollTo(0, 0);
}

/* ---------- El mesón 3D (si hay WebGL; si no, fogón 2D de siempre) ---------- */

function initEscena3D() {
  const cont = $('#cocina3d');
  if (!window.Escena3D || !cont) return;
  try { escenaOn = Escena3D.init(cont); } catch (e) { escenaOn = false; }
  if (!escenaOn) return;
  cont.classList.remove('hidden');
  $('#fogon').classList.add('hidden');
  $('#mesa-etiquetas').classList.remove('hidden');
  Escena3D.onItemTap(i => { if (slots[i]) { slots[i] = null; sfx('tab'); renderTaller(); } });
}

/* ---------- Arranque ---------- */

function bindEvents() {
  $('#btn-abrir').addEventListener('click', () => { initAudio(); state.seenCover = true; save(); abrirSobreInicial(); });
  $('#slot-a').addEventListener('click', () => { if (slots[0]) { slots[0] = null; sfx('tab'); renderTaller(); } });
  $('#slot-b').addEventListener('click', () => { if (slots[1]) { slots[1] = null; sfx('tab'); renderTaller(); } });
  $$('.tab-btn').forEach(b => b.addEventListener('click', () => { sfx('tab'); show(b.dataset.tab); }));

  $('#feria-abrir-btn').addEventListener('click', () => { initAudio(); abrirSobre(); });
  $('#mercado-sobre-btn').addEventListener('click', () => { initAudio(); comprarSobreConSucres(); });
  $('#pregon-btn').addEventListener('click', () => { initAudio(); escucharPregon(); });

  $('#acceso-canasta').addEventListener('click', () => abrirDespensa('ingredientes'));
  $('#acceso-utensilios').addEventListener('click', () => abrirDespensa('utensilios'));
  $('#despensa-close').addEventListener('click', cerrarDespensa);
  $('#modal-despensa').addEventListener('click', (e) => { if (e.target === $('#modal-despensa')) cerrarDespensa(); });

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
    cerrarDespensa();
  });
}

function init() {
  state = load() || newState();
  /* los gradientes de acuarela de los iconos viven en ICON_DEFS y
     deben estar en el documento para que url(#...) resuelva */
  document.body.insertAdjacentHTML('beforeend', ICON_DEFS);
  $$('[data-icon]').forEach(n => { n.innerHTML = iconOf(n.dataset.icon); });
  revisarRachaDiaria();
  initEscena3D();
  bindEvents();
  show(state.seenCover ? 'taller' : 'cover');
  intentarCanjearRegalo();
}
document.addEventListener('DOMContentLoaded', init);
