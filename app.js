/* ============================================================
   Huecas — saberes y sabores (v7)
   app.js — La hueca abierta: cola continua, servir, sobrevivir.
   ============================================================ */

const SAVE_KEY = 'huecas_save_v14';

/* ---------- Recetario aplanado + reglas ---------- */

const ALL_STEPS = [];
CUADERNO_ORDER.forEach(cid => {
  CUADERNOS[cid].steps.forEach(step => ALL_STEPS.push({ ...step, cuaderno: cid }));
});

const pairMatch = (r, x, y) => (r.a === x && r.b === y) || (r.a === y && r.b === x);
const findStep = (x, y) => ALL_STEPS.find(s => pairMatch(s, x, y));
const findRule = (x, y) => RULES.find(r => pairMatch(r, x, y));

const isTool = (id) => ITEMS[id].type === 'tool';
const isDish = (id) => ITEMS[id].type === 'dish';
const isDone = (id) => ['dish', 'junk'].includes(ITEMS[id].type);
const isHeat = (id) => id === 'olla' || id === 'sarten';

const S = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/* ---------- Estado ---------- */

let state = null;

function newState() {
  const s = {
    coins: INITIAL_COINS,
    owned: [CUADERNO_ORDER[0]],
    inv: {},
    tools: [],
    toolWear: {},
    discovered: [],
    techniques: [],
    revealed: [],
    dishesDone: [],
    active: CUADERNO_ORDER[0],
    region: 'costa',
    regionsUnlocked: ['costa'],
    rating: HUECA.startRating,
    served: 0, missed: 0,
    consecutiveMisses: 0,
    sinceRent: 0, rentCycle: 0,
    fiado: false,
    timesClosed: 0,
    mode: 'servicio',
    milestonesHit: [],
    seenIntro: false,
    seenCarta: false,
    huecaName: '',       /* nombre que el jugador le pone a su hueca */
    visitaIdx: 0,        /* próxima visita de historia por llegar */
    muted: false,        /* silenciar sonido */
    tutDone: false,      /* guía inicial completada (primer plato servido) */
    beatsSeen: [],       /* beats narrativos ya mostrados (motor de temporadas) */
    colored: [],         /* GDD §3.2: ids que ya pasaron de boceto a color */
    junkBorn: {},        /* id -> timestamp, para pudrir mezclas inútiles */
  };
  grantBasket(s, CUADERNOS[CUADERNO_ORDER[0]].grants);
  return s;
}

function grantBasket(s, ids) {
  ids.forEach(id => {
    if (isTool(id)) {
      if (!s.tools.includes(id)) { s.tools.push(id); if (ITEMS[id].wear) s.toolWear[id] = ITEMS[id].wear; }
    } else s.inv[id] = (s.inv[id] || 0) + 1;
  });
}

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.inv || !Array.isArray(s.owned)) return null;
    return { ...newState(), ...s };
  } catch (e) { return null; }
}

const knows = (id) => state.discovered.includes(id);
const owns = (cid) => state.owned.includes(cid);
const count = (id) => isTool(id) ? (state.tools.includes(id) ? 1 : 0) : (state.inv[id] || 0);
const isDull = (id) => ITEMS[id].wear && (state.toolWear[id] ?? ITEMS[id].wear) <= 0;
const realDishes = () => state.dishesDone.filter(d => !ITEMS[d].creative);
const readyDishes = () => Object.keys(state.inv).filter(id => isDish(id) && count(id) > 0);

function addItem(id, n = 1) {
  if (isTool(id)) {
    if (!state.tools.includes(id)) { state.tools.push(id); if (ITEMS[id].wear) state.toolWear[id] = ITEMS[id].wear; }
    return;
  }
  const before = state.inv[id] || 0;
  state.inv[id] = before + n;
  if (state.inv[id] <= 0) { delete state.inv[id]; if (state.junkBorn) delete state.junkBorn[id]; }
  else if (ITEMS[id].rots && before <= 0) { state.junkBorn = state.junkBorn || {}; state.junkBorn[id] = Date.now(); }
}
function wearTool(id) { if (ITEMS[id].wear) state.toolWear[id] = (state.toolWear[id] ?? ITEMS[id].wear) - 1; }

const mainSteps = (cid) => CUADERNOS[cid].steps.filter(s => !s.variant);
const isComplete = (cid) => mainSteps(cid).every(s => knows(s.result));
const stepsDone = (cid) => mainSteps(cid).filter(s => knows(s.result)).length;
const regionCuadernos = (r) => CUADERNO_ORDER.filter(cid => CUADERNOS[cid].region === r);

function marketIngredients() {
  const ids = new Set();
  ALL_STEPS.filter(s => owns(s.cuaderno)).forEach(s => {
    [s.a, s.b].forEach(id => { if (ITEMS[id].type === 'ingredient') ids.add(id); });
  });
  return [...ids].sort((x, y) => (ITEMS[x].price - ITEMS[y].price) || ITEMS[x].name.localeCompare(ITEMS[y].name));
}
function marketTools() {
  const ids = new Set();
  ALL_STEPS.filter(s => owns(s.cuaderno)).forEach(s => {
    [s.a, s.b].forEach(id => { if (isTool(id) && ITEMS[id].buyable && !state.tools.includes(id)) ids.add(id); });
  });
  return [...ids];
}

/* ---------- Utilidades ---------- */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function buzz(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }

/* ============================================================
   JUICE — sonido, monedas que vuelan, confeti y combos
   (para que cada acción se sienta rica, estilo Candy Crush)
   ============================================================ */

let audioCtx = null;
function initAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; } }
  if (audioCtx && audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch (e) {} }
}
const SFX = {
  place: [{ f: 430, d: .07, g: .09, w: 'sine' }],
  cook:  [{ f: 300, d: .12, g: .1, w: 'triangle' }, { f: 600, t: .06, d: .12, g: .08, w: 'triangle' }],
  coin:  [{ f: 900, d: .05, g: .11 }, { f: 1350, t: .05, d: .07, g: .11 }],
  serve: [{ f: 523, d: .1, g: .11 }, { f: 659, t: .08, d: .1, g: .11 }, { f: 784, t: .16, d: .16, g: .12 }],
  win:   [{ f: 523, d: .12, g: .12 }, { f: 659, t: .1, d: .12, g: .12 }, { f: 784, t: .2, d: .12, g: .12 }, { f: 1046, t: .3, d: .22, g: .13 }],
  fail:  [{ f: 196, d: .2, g: .1, w: 'sawtooth' }],
  tab:   [{ f: 660, d: .05, g: .06, w: 'sine' }],
};
function sfx(type) {
  if (state && state.muted) return;
  initAudio(); if (!audioCtx) return;
  const now = audioCtx.currentTime;
  (SFX[type] || []).forEach(n => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = n.w || 'sine'; o.frequency.value = n.f;
    const t0 = now + (n.t || 0), dur = n.d || .1;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(n.g || .1, t0 + .012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur + .03);
  });
}

/* moneda(s) que vuelan hacia el monedero del HUD */
function flyCoins(x, y, n = 1) {
  const pill = $('#hud-coins-pill'); if (!pill) return;
  const r = pill.getBoundingClientRect();
  const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  const k = Math.max(1, Math.min(n, 7));
  for (let i = 0; i < k; i++) {
    const c = el('span', 'fly-coin', iconOf('ficha'));
    const jx = x + (Math.random() * 30 - 15), jy = y + (Math.random() * 20 - 10);
    c.style.left = jx + 'px'; c.style.top = jy + 'px';
    c.style.transitionDelay = (i * 55) + 'ms';
    document.body.appendChild(c);
    requestAnimationFrame(() => { c.style.transform = `translate(${tx - jx}px, ${ty - jy}px) scale(.45)`; c.style.opacity = '.2'; });
    setTimeout(() => c.remove(), 850 + i * 55);
  }
  setTimeout(() => { const p = $('#hud-coins-pill'); p.classList.remove('pulse'); void p.offsetWidth; p.classList.add('pulse'); sfx('coin'); }, 380);
}

/* estallido de confeti en un punto */
function burst(x, y, colors) {
  const wrap = el('div', 'burst'); wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
  const cols = colors || ['#9dbd8a', '#d9a0b0', '#93a7c4', '#e0b45c', '#c96f52'];
  for (let i = 0; i < 16; i++) {
    const p = el('i'); const a = Math.random() * 6.283, d = 26 + Math.random() * 46;
    p.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px');
    p.style.setProperty('--dy', (Math.sin(a) * d - 18).toFixed(1) + 'px');
    p.style.background = cols[i % cols.length];
    p.style.animationDelay = (Math.random() * .08).toFixed(2) + 's';
    if (i % 2) p.style.borderRadius = '50%';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 950);
}
function centerOf(sel) { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

/* combo: servir seguido sube el ánimo (solo brillo y sonido, sin tocar la economía) */
let combo = 0, comboTimer = null;
function bumpCombo() {
  combo++;
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => { combo = 0; }, 5200);
  if (combo >= 2) showCombo(combo);
}
function showCombo(n) {
  const f = el('div', 'combo-pop', `¡Combo ×${n}!`);
  $('#stage').appendChild(f);
  setTimeout(() => f.remove(), 1000);
}
function toggleSound() {
  state.muted = !state.muted; save();
  const b = $('#hud-sound'); b.textContent = state.muted ? '🔇' : '🔊'; b.classList.toggle('off', state.muted);
  if (!state.muted) { initAudio(); sfx('tab'); }
}

/* ============================================================
   BOCETO → COLOR (GDD §3.2) — la mecánica visual del descubrimiento.
   Lo no descubierto se dibuja en boceto B/N; al completar un paso,
   técnica o receta, el elemento se "pinta" con un relleno progresivo.
   ============================================================ */
const recentColored = new Set();
function isColored(id) { return state.colored.includes(id); }
function colorize(ids) {
  let any = false;
  ids.filter(Boolean).forEach(id => {
    if (!state.colored.includes(id)) {
      state.colored.push(id);
      recentColored.add(id);
      setTimeout(() => recentColored.delete(id), 2400);
      any = true;
    }
  });
  return any;
}
/* aplica el estado visual a un nodo que contiene un icono */
function inkState(node, id) {
  if (isColored(id)) { if (recentColored.has(id)) node.classList.add('paint-in'); }
  else node.classList.add('boceto');
  return node;
}

/* ---------- Beats narrativos declarativos (motor de temporadas) ---------- */
function beatReady(b) {
  if (state.beatsSeen.includes(b.id)) return false;
  if (b.minServed != null && state.served < b.minServed) return false;
  if (b.recipesComplete && !CUADERNO_ORDER.every(cid => isComplete(cid))) return false;
  return true;
}
function checkBeats() {
  const b = BEATS.find(beatReady);
  if (!b) return false;
  state.beatsSeen.push(b.id);
  if (b.id === 'voz') state.rating = Math.min(HUECA.maxRating, state.rating + 1);
  save();
  setTimeout(() => showBeat(b.icon, b.title, b.text), 850);
  return true;
}

/* ---------- Navegación ---------- */

const SCREENS = ['cover', 'shelf', 'receta', 'cocina', 'mercado'];
let currentScreen = 'cover';
let recetaOpen = null;

function show(screen) {
  currentScreen = screen;
  SCREENS.forEach(s => $('#screen-' + s).classList.toggle('active', s === screen));
  const inGame = screen !== 'cover';
  $('#hud').classList.toggle('hidden', !inGame);
  /* botones flotantes: canasta + cuaderno solo en la cocina (GDD §4.2) */
  $('#float-nav').classList.toggle('hidden', screen !== 'cocina');
  $('#float-back').classList.toggle('hidden', !inGame || screen === 'cocina');
  if (screen === 'shelf') renderShelf();
  if (screen === 'receta') renderReceta();
  if (screen === 'cocina') renderCocina();
  if (screen === 'mercado') renderMercado();
  window.scrollTo(0, 0);
}
function openReceta(cid) { if (recetaOpen !== cid) mkIdx = null; recetaOpen = cid; show('receta'); }
function goCook(cid) { state.active = cid; save(); show('cocina'); }

/* ---------- HUD ---------- */

function heartsHtml(rating) {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const v = rating - i * 2;
    out += `<span class="heart ${v >= 2 ? 'full' : v === 1 ? 'half' : 'empty'}">${iconOf('corazon')}</span>`;
  }
  return out;
}
function renderHud() {
  $('#hud-coins').textContent = 'S/ ' + S(state.coins);
  $('#hud-hearts').innerHTML = heartsHtml(state.rating);
  const modeBtn = $('#hud-mode');
  modeBtn.dataset.mode = state.mode;
  modeBtn.innerHTML = state.mode === 'servicio' ? '<span class="mode-dot on"></span>Servicio' : '<span class="mode-dot"></span>Tranquilo';
}
function addCoins(n) {
  state.coins += n;
  renderHud();
  if (n > 0) { const c = $('#hud-coins-pill'); c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); }
}

/* --- microinteracciones --- */
function bumpHearts(dir) {
  const h = $('#hud-hearts'); if (!h) return;
  h.classList.remove('bump', 'lose'); void h.offsetWidth;
  h.classList.add(dir < 0 ? 'lose' : 'bump');
  setTimeout(() => h.classList.remove('bump', 'lose'), 650);
}
/* corazón que sube desde la ficha del cliente servido */
function popServe(id) {
  const card = document.querySelector(`.com-scene[data-id="${id}"]`);
  if (!card) return;
  const r = card.getBoundingClientRect();
  const b = el('span', 'serve-burst', iconOf('corazon'));
  b.style.left = (r.left + r.width / 2) + 'px';
  b.style.top = (r.top + r.height / 2) + 'px';
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 950);
}

function checkRescue() {
  const ing = marketIngredients();
  const cheapest = ing.length ? Math.min(...ing.map(id => ITEMS[id].price)) : 1;
  if (state.coins >= cheapest) return;
  if (Object.keys(state.inv).some(id => ITEMS[id].sell)) return;
  const pool = [...Object.keys(state.inv).filter(id => count(id) > 0), ...state.tools.filter(t => !isDull(t))];
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++) { const s = findStep(pool[i], pool[j]); if (s && owns(s.cuaderno)) return; }
  addCoins(RESCUE_COINS); save(); toast(MICROCOPY.rescue, 'seal');
}

let toastTimer = null;
/* Mensajes en dos niveles (estilo Duolingo):
   - banner: tarjeta grande arriba, para lo que importa (tone 'seal')
   - toast: nota abajo, para lo secundario ('soft' / 'ink') */
let bannerTimer = null;
function banner(msg, icon = '✦') {
  const b = $('#banner');
  b.innerHTML = `<span class="banner-ic" aria-hidden="true">${icon}</span><span class="banner-txt">${msg}</span>`;
  b.classList.remove('visible'); void b.offsetWidth; b.classList.add('visible');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('visible'), 3400);
}
/* ---------- Escenas de diálogo (novela visual) ----------
   La cocina es el pretexto: cuando alguien tiene algo que contar
   (chisme, memoria, historia), el juego se detiene y escucha.
   El reloj se pausa solo (modalOpen congela la paciencia). */
let escenaActual = null;
let escenaCola = [];
function showEscena(e) {
  escenaActual = e;
  $('#escena-avatar').innerHTML = iconOf(e.icon);
  $('#escena-nombre').textContent = e.nombre || '';
  $('#escena-texto').textContent = e.texto;
  const ops = $('#escena-ops'); ops.innerHTML = '';
  const opciones = (e.opciones && e.opciones.length) ? e.opciones : [{ label: e.boton || 'Seguir' }];
  opciones.forEach((op, i) => {
    const b = el('button', (i === 0 ? 'btn-main' : 'btn-ghost') + ' wide', op.label);
    b.type = 'button';
    b.addEventListener('click', () => closeEscena(op));
    ops.appendChild(b);
  });
  $('#modal-escena').classList.add('open');
  sfx('tab');
}
function queueEscena(e) { if (modalOpen()) escenaCola.push(e); else showEscena(e); }
function drainEscena() {
  if (!escenaCola.length) return;
  setTimeout(() => { if (!modalOpen() && escenaCola.length) showEscena(escenaCola.shift()); }, 380);
}
function closeEscena(op) {
  $('#modal-escena').classList.remove('open');
  const e = escenaActual; escenaActual = null;
  if (op && op.onPick) op.onPick();
  if (e && e.onClose) e.onClose();
  drainEscena();
}

function toast(msg, tone = 'ink') {
  if (tone === 'seal') { banner(msg); return; }
  const t = $('#toast');
  t.textContent = msg; t.dataset.tone = tone; t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
}

/* ============================================================
   RELOJ DE LA HUECA — cola continua de clientes
   ============================================================ */

let queue = [];        /* [{ id, name, icon, dish, deadline, total, story? }] */
let custId = 0;
let lastSpawn = 0;
let lastTick = 0;
let gameClock = null;

function storyGuest() { return queue.find(c => c.story); }

function modalOpen() { return !!$('.modal.open'); }

function pressureTier() {
  const n = realDishes().length;
  let tier = HUECA.pressure[0];
  for (const p of HUECA.pressure) if (n >= p.dishes) tier = p;
  return tier;
}

function startClock() {
  if (gameClock) return;
  lastSpawn = lastTick = Date.now();
  gameClock = setInterval(clockTick, 250);
}
function stopClock() { clearInterval(gameClock); gameClock = null; }

function clockTick() {
  const now = Date.now();
  const dt = now - lastTick; lastTick = now;
  /* el tiempo SOLO corre en la cocina: mercado, recetario y cualquier
     diálogo son pausa DE VERDAD — la paciencia también se congela */
  if (currentScreen !== 'cocina' || state.mode !== 'servicio' || modalOpen()) {
    queue.forEach(c => { if (isFinite(c.deadline)) c.deadline += dt; });
    lastSpawn = now;
    return;
  }
  /* pudrir mezclas inútiles que se quedaron en el mesón (aun sin platos) */
  if (state.junkBorn) {
    for (const id in state.junkBorn) {
      if ((state.inv[id] || 0) > 0 && now - state.junkBorn[id] > ROT_MS) {
        const q = state.inv[id];
        addItem(id, -q); addItem('podrido', q);
        toast(MICROCOPY.rotted, 'soft');
        if (currentScreen === 'cocina') renderReady();
        save();
      }
    }
  }
  if (!realDishes().length) return;
  /* una visita de historia CONGELA la fila: nadie más llega ni se va,
     y las barras de paciencia se detienen hasta que la atiendas */
  if (storyGuest()) {
    queue.forEach(c => { if (!c.story && isFinite(c.deadline)) c.deadline += dt; });
    lastSpawn = now;
    if (currentScreen === 'cocina') updateQueueBars();
    return;
  }
  /* barra de sushi: solo el comensal del frente pierde paciencia; los de
     atrás esperan su turno (su reloj arranca cuando llegan al mostrador) */
  const front = queue.find(c => !c.story) || null;
  queue.forEach(c => { if (c !== front && !c.story && isFinite(c.deadline)) c.deadline += dt; });
  let expired = false;
  if (front && isFinite(front.deadline) && now >= front.deadline) { missCustomer(front.id, true); expired = true; }
  /* aparecer */
  const tier = pressureTier();
  if (queue.length < HUECA.queueMax && now - lastSpawn >= tier.spawnMs) spawnCustomer();
  /* el nuevo del frente te saluda: escena con decisión */
  const f2 = queue.find(c => !c.story);
  if (f2 && !f2.greeted) { f2.greeted = true; saludoEscena(f2); return; }
  if (!expired && currentScreen === 'cocina') updateQueueBars();
}

function pickDemandDish() {
  const dishes = realDishes();
  const weights = dishes.map(d => 1 + (ITEMS[d].sell || 0) * (state.rating / HUECA.maxRating) * 0.18);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < dishes.length; i++) { r -= weights[i]; if (r <= 0) return dishes[i]; }
  return dishes[dishes.length - 1];
}

function spawnCustomer() {
  const dish = pickDemandDish();
  if (!dish) return;
  const who = pick(CLIENTES);
  const tier = pressureTier();
  /* el barrio murmura: cada desatendido encoge la paciencia del que sigue */
  const pat = Math.max(10, Math.round(tier.patience * Math.pow(HUECA.patienceDecay || 1, state.consecutiveMisses)));
  /* la paciencia NO corre hasta que lo saludes y aceptes atenderlo */
  queue.push({ id: ++custId, ...who, dish, pat, deadline: Infinity, total: pat,
               greeted: false, accepted: false,
               chismes: HUECA.chismesPorCliente || 2 });
  lastSpawn = Date.now();
  buzz(30);
  if (currentScreen === 'cocina') renderComensal();
}

/* al llegar al frente, el comensal te saluda y TÚ decides */
function saludoEscena(c) {
  const linea = c.line ? `«${c.line}»  ` : '';
  showEscena({
    icon: c.icon, nombre: `Llegó ${c.name}`,
    texto: `${linea}¿Me tienes ${ITEMS[c.dish].name.toLowerCase()}, veci?`,
    opciones: [
      { label: 'Claro veci, ya le atiendo', onPick: () => {
          c.accepted = true;
          c.deadline = Date.now() + c.pat * 1000; c.total = c.pat;
          renderComensal();
        } },
      { label: '“Se me acabó, veci” 👋', onPick: () => {
          toast(`${c.name} se va murmurando…`, 'soft');
          missCustomer(c.id, false);
        } },
    ],
  });
}

/* escuchar el chisme: el comensal se entretiene y te espera más;
   conversar también calma el murmullo del barrio */
function chismear(id) {
  const c = queue.find(q => q.id === id);
  if (!c || c.story || (c.chismes | 0) <= 0) return;
  c.chismes -= 1;
  const extra = (HUECA.chismeExtraS || 14) * 1000;
  c.deadline += extra; c.total += extra / 1000;
  state.consecutiveMisses = 0;
  buzz(15);
  /* el chisme es una escena: el barrio se cuenta, el juego escucha */
  showEscena({
    icon: c.icon, nombre: c.name,
    texto: pick(CHISMES),
    boton: '¡No me diga! 🫢',
    onClose: () => { banner(`${c.name} se entretiene contándote. Te espera con más calma.`, '🗨'); renderComensal(); },
  });
  save(); renderComensal();
}

/* "se me acabó, veci": despachas al del frente sin servirle.
   Te libera la barra, pero el barrio lo nota (pierdes un corazón). */
function despedir(id) {
  const c = queue.find(q => q.id === id);
  if (!c || c.story) return;
  toast(`${c.name} se va murmurando…`, 'soft');
  missCustomer(id, false);
}

function updateQueueBars() {
  /* solo el comensal del frente tiene reloj visible en la barra */
  const front = queue.find(c => !c.story);
  const box = $('#comensal');
  const bar = box && box.querySelector('.com-bar');
  if (!front || !bar || storyGuest() || !isFinite(front.deadline)) return;
  const frac = Math.max(0, (front.deadline - Date.now()) / (front.total * 1000));
  bar.style.transform = `scaleX(${frac})`;
  box.classList.toggle('urgent', frac < 0.35);
}

function serveCustomer(id) {
  const idx = queue.findIndex(c => c.id === id);
  if (idx < 0) return;
  const c = queue[idx];
  if (count(c.dish) < 1) { toast('Todavía no tienes ese plato listo.', 'soft'); return; }
  const at = centerOf(`.com-scene[data-id="${id}"]`) || centerOf('.mesa');
  addItem(c.dish, -1);
  popServe(id);
  if (c.story) { resolveVisita(c, idx, at); return; }
  const tip = rand(0, HUECA.tipMax);
  const pay = customerPay(c.dish) + tip;
  addCoins(pay);
  state.rating = Math.min(HUECA.maxRating, state.rating + 1);
  state.served += 1;
  state.consecutiveMisses = 0;
  state.tutDone = true;
  queue.splice(idx, 1);
  buzz([30, 40, 60]);
  bumpHearts(1);
  sfx('serve'); bumpCombo();
  if (at) { burst(at.x, at.y); flyCoins(at.x, at.y, Math.ceil(pay / 6)); }
  colorize([c.icon]);                       /* el barrio recobra color, vecino a vecino */
  const gracias = c.thanks || MICROCOPY.servedQueue;
  toast(`${gracias}${tip ? ` Propina S/ ${S(tip)}.` : ''}`, 'seal');
  afterResolve();
  checkBeats();
}

/* --- Comensal de historia: llegada, atención y recompensa --- */
function maybeVisita() {
  if (state.visitaIdx >= VISITAS.length || storyGuest()) return;
  const v = VISITAS[state.visitaIdx];
  if (state.served < v.after) return;
  if (v.unlocks && !state.owned.includes(v.unlocks)) {
    state.owned.push(v.unlocks);
    setTimeout(() => toast(`📖 Nueva página del cuaderno: ${CUADERNOS[v.unlocks].title}`, 'seal'), 2600);
  }
  queue.unshift({ id: ++custId, story: true, name: v.name, icon: v.icon, dish: v.dish, total: 0, deadline: Infinity,
                  memorias: v.memorias ? [...v.memorias] : [] });
  lastSpawn = Date.now();
  buzz([50, 40, 50]);
  toast(`★ Llegó ${v.name}: pide ${ITEMS[v.dish].name} y no se irá sin él.`, 'seal');
  if (currentScreen === 'cocina') renderComensal();
  setTimeout(() => showVisita(v), 900);
}

function resolveVisita(c, idx, at) {
  const v = VISITAS[state.visitaIdx] || { reward: 12, beat: `${c.name} quedó feliz.` };
  addCoins(v.reward);
  state.rating = Math.min(HUECA.maxRating, state.rating + 2);
  state.served += 1;
  state.sinceRent += 1;
  state.consecutiveMisses = 0;
  state.visitaIdx += 1;
  queue.splice(idx, 1);
  buzz([40, 60, 90]);
  bumpHearts(1);
  sfx('win');
  const p = at || centerOf('#cocina-surface');
  if (p) { burst(p.x, p.y, ['#e0b45c', '#f0c463', '#fff3d0']); flyCoins(p.x, p.y, Math.ceil(v.reward / 6)); }
  save();
  renderHud();
  if (currentScreen === 'cocina') renderCocina();
  showVisitaBeat(v);
}

function missCustomer(id, expired) {
  const idx = queue.findIndex(c => c.id === id);
  if (idx < 0) return;
  const c = queue[idx];
  queue.splice(idx, 1);
  state.rating = Math.max(0, state.rating - 1);
  state.missed += 1;
  state.consecutiveMisses += 1;
  buzz(90);
  bumpHearts(-1);
  if (expired) toast(c.left || MICROCOPY.missed, 'soft');
  afterResolve(true);
}

function afterResolve(missed) {
  state.sinceRent += 1;
  renderHud();
  save();
  /* sincroniza toda la cocina (mesa incluida) salvo si hay una cocción en curso:
     así el plato servido no queda fantasma en la mesa ni deja botones muertos */
  if (currentScreen === 'cocina') { if (combining) { renderComensal(); renderReady(); } else renderCocina(); }
  if (currentScreen === 'mercado') renderMercado();
  maybeUnlockRegion();
  /* sin corazones, la hueca no aguanta más: se baja la persiana */
  if (missed && state.rating <= 0) { setTimeout(closeHueca, 800); return; }
  if (missed && state.consecutiveMisses >= SALUBRIDAD.missLimit) { setTimeout(salubridadVisit, 700); return; }
  if (!missed) maybeVisita();
  if (!missed && checkMilestone()) return;
  if (state.sinceRent >= HUECA.rentEvery) setTimeout(showRent, 800);
}

function customerPay(dish) { return ITEMS[dish].sell + Math.floor(state.rating / 4) * 100; }

/* ---------- Regiones ---------- */

function maybeUnlockRegion() {
  for (const r of REGION_ORDER) {
    const meta = REGIONS[r];
    if (!meta.unlock || state.regionsUnlocked.includes(r)) continue;
    if (realDishes().length >= meta.unlock.dishes) {
      state.regionsUnlocked.push(r);
      save();
      toast(MICROCOPY.regionUnlock, 'seal');
    }
  }
}

/* ---------- Momentos de historia (beats guionizados) ---------- */
function showBeat(icon, title, text) {
  queueEscena({ icon, nombre: title, texto: text, boton: 'Seguir' });
  sfx('win');
}

/* ---------- Visita de historia: modales ---------- */
function showVisita(v) {
  queueEscena({
    icon: v.icon, nombre: `Llegó ${v.name}`,
    texto: v.ask,
    boton: 'Claro que sí, siga no más',
    onClose: () => banner(v.hintTo, '📖'),
  });
}
function showVisitaBeat(v) {
  queueEscena({
    icon: v.dish, nombre: v.name,
    texto: v.beat,
    boton: '¡Qué orgullo!',
    onClose: () => {
      banner(`+S/ ${S(v.reward)} · +2 de fama`, '★');
      if (state.sinceRent >= HUECA.rentEvery) setTimeout(showRent, 500);
    },
  });
}

/* ---------- Salubridad ---------- */

function salubridadVisit() {
  state.consecutiveMisses = 0;
  const pass = readyDishes().length > 0;
  queueEscena({
    icon: 'arriendo', nombre: 'Inspección de salubridad',
    texto: pass
      ? 'Tres clientes se fueron con hambre y llegó la inspección. Husmea la cocina… y encuentra un plato listo, decente. «Que no se repita, ¿oyó?»'
      : 'Tres clientes se fueron con hambre y llegó la inspección. Ni un plato listo que mostrar. «Esto no puede seguir abierto así.»',
    opciones: [pass
      ? { label: 'Seguir abierta', onPick: () => toast(MICROCOPY.salubridadPass, 'seal') }
      : { label: 'Bajar la persiana…', onPick: () => { toast(MICROCOPY.salubridadClose, 'soft'); closeHueca(); } }],
  });
  save();
}
function resolveSalubridad() { $('#modal-salubridad').classList.remove('open'); }

/* ---------- Milestones ---------- */

function checkMilestone() {
  const m = MILESTONES.find(m => state.served >= m.served && !state.milestonesHit.includes(m.served));
  if (!m) return false;
  state.milestonesHit.push(m.served);
  addCoins(m.reward); save();
  $('#milestone-icon').innerHTML = iconOf('corazon');
  $('#milestone-title').textContent = m.title;
  $('#milestone-served').textContent = `${m.served} clientes servidos`;
  $('#milestone-note').textContent = m.note;
  $('#milestone-reward').textContent = `+S/ ${S(m.reward)}`;
  $('#modal-milestone').classList.add('open');
  return true;
}

/* ---------- Arriendo escalado ---------- */

function currentRent() { return HUECA.rentBase + HUECA.rentStep * state.rentCycle; }

/* Don Aurelio en persona: el arriendo es una escena con decisión */
function showRent() {
  if (modalOpen()) { setTimeout(showRent, 900); return; }
  state.sinceRent = 0;
  const rent = currentRent();
  const canPay = state.coins >= rent;
  /* el primer arriendo siempre tiene gracia (aunque gastaste todo en el mercado);
     después ya depende de tu fama */
  const firstGrace = !canPay && !state.fiado && state.rentCycle === 0;
  const canFiar = !canPay && !state.fiado && (state.rating >= 7 || firstGrace);
  const ops = [];
  if (canPay) ops.push({ label: `Pagar S/ ${S(rent)}`, onPick: () => {
    addCoins(-rent); state.rentCycle += 1; save();
    banner(`Arriendo pagado. ${state.rentCycle >= 2 ? 'Y cada mes sube: ofrece platos más caros.' : 'Un mes más de hueca.'}`, '🏠');
  } });
  if (canFiar) ops.push({ label: firstGrace ? 'Prometerle que mañana sí' : 'Pedirle que te fíe', onPick: () => {
    state.fiado = true; save();
    toast('Don Aurelio anota en su libreta y se va sin sonreír.', 'soft');
  } });
  if (!ops.length) ops.push({ label: 'No me alcanza, don Aurelio…', onPick: closeHueca });
  queueEscena({
    icon: 'aurelio', nombre: 'Don Aurelio · el arriendo',
    texto: canPay
      ? `Buenas, mijo. Vengo por lo del mes: S/ ${S(rent)}. ${state.rentCycle >= 1 ? 'Y ya sabes que cada mes sube un poquito.' : 'La Delfina siempre me pagó puntual, que conste.'}`
      : firstGrace
        ? `Son S/ ${S(rent)} del mes… pero te veo cara de recién llegado y la cocina oliendo a verde. Ya que eres hijito de tu mamita: vuelvo mañana, y ojalá vendas mucho.`
        : canFiar
          ? `Son S/ ${S(rent)}. ¿No te alcanza? Mmm… con la fama que está agarrando esto, puedo esperarte. Solo esta vez, ¿oíste?`
          : `Son S/ ${S(rent)}. Sin sucres y sin fama, mijo, no hay hueca que aguante. Ni cariño que alcance.`,
    opciones: ops,
  });
  save();
}
function resolveRent() { $('#modal-arriendo').classList.remove('open'); }

/* ---------- Cierre / reapertura ---------- */

function closeHueca() {
  /* la clientela sigue en la fila; no se borra al cerrar */
  state.timesClosed += 1;
  $('#cierre-veces').textContent = state.timesClosed > 1 ? `Ya van ${state.timesClosed} veces. El barrio te sigue queriendo.` : '';
  $('#modal-cierre').classList.add('open');
  save();
}
function reopenHueca() {
  state.inv = {};
  state.coins = INITIAL_COINS;
  state.rating = HUECA.startRating;
  state.sinceRent = 0; state.rentCycle = 0;
  state.consecutiveMisses = 0; state.fiado = false;
  state.tools.forEach(t => { if (ITEMS[t].wear) state.toolWear[t] = ITEMS[t].wear; });
  /* la fila esperó la reapertura: les renovamos la paciencia */
  const tier = pressureTier();
  queue.forEach(c => { c.deadline = Date.now() + tier.patience * 1000; c.total = tier.patience; });
  lastSpawn = Date.now();
  save(); renderHud();
  $('#modal-cierre').classList.remove('open');
  toast('La hueca vuelve a abrir. Las recetas nunca se fueron.', 'seal');
  show('cocina');
}

/* ---------- Modo ---------- */

function toggleMode() {
  state.mode = state.mode === 'servicio' ? 'tranquilo' : 'servicio';
  if (state.mode === 'tranquilo') { queue = []; toast(MICROCOPY.calmOn, 'seal'); }
  else { lastSpawn = Date.now(); toast(MICROCOPY.calmOff, 'ink'); }
  renderHud(); save();
  if (currentScreen === 'cocina') renderCocina();
}

/* ============================================================
   ESTANTERÍA / RECETARIO
   ============================================================ */

function renderShelf() {
  const rack = $('#shelf-books');
  rack.innerHTML = '';
  REGION_ORDER.filter(r => state.regionsUnlocked.includes(r)).forEach(r => {
    const meta = REGIONS[r];
    /* cada región es UNA REPISA: etiqueta vertical + libros de pie */
    const row = el('section', 'shelf-row');
    row.appendChild(el('h3', 'shelf-region', meta.name));
    const grid = el('div', 'shelf-grid');
    regionCuadernos(r).forEach(cid => grid.appendChild(bookCard(cid)));
    row.appendChild(grid);
    rack.appendChild(row);
  });
  const locked = REGION_ORDER.filter(r => !state.regionsUnlocked.includes(r));
  if (locked.length) {
    const m = REGIONS[locked[0]];
    rack.appendChild(el('p', 'shelf-locked hand', `🔒 ${m.name}: domina ${m.unlock.dishes} platos costeños para abrirla.`));
  }
  const done = CUADERNO_ORDER.filter(cid => owns(cid) && isComplete(cid)).length;
  $('#shelf-recipes').textContent = `${done}/${CUADERNO_ORDER.length}`;
  $('#shelf-served').textContent = state.served;
  const next = MILESTONES.find(m => !state.milestonesHit.includes(m.served));
  $('#shelf-goal').textContent = next ? `Próxima meta: ${next.title} (${state.served}/${next.served})` : `${state.served} platos servidos · el barrio recuerda`;
}

function bookCard(cid) {
  const c = CUADERNOS[cid];
  const owned = owns(cid);
  const done = owned && isComplete(cid);
  const total = mainSteps(cid).length;
  const book = el('button', 'book' + (owned ? '' : ' locked') + (done ? ' done' : ''));
  book.type = 'button';
  book.style.setProperty('--accent', c.accent);
  book.innerHTML = owned ? `
    <span class="book-icon${isColored(c.dish) ? '' : ' boceto'}">${iconOf(done ? c.dish : 'cuaderno')}</span>
    <span class="book-title">${c.title}</span>
    <span class="book-city">${c.city}</span>
    <span class="book-progress">${done ? '<span class="stamp-mini">a color ★</span>' : '<span class="dots">' + '●'.repeat(stepsDone(cid)) + '○'.repeat(total - stepsDone(cid)) + '</span>'}</span>
  ` : c.storyUnlock ? `
    <span class="book-icon dim boceto">${iconOf(c.dish)}</span>
    <span class="book-title">¿ … ?</span>
    <span class="book-city">${c.city}</span>
    <span class="book-progress"><span class="book-locked hand">página en boceto</span></span>` : `
    <span class="book-icon dim">${iconOf('cuaderno')}</span>
    <span class="book-title">¿${c.title}?</span>
    <span class="book-city">${c.city}</span>
    <span class="book-progress"><span class="price-tag">S/ ${S(c.cost)}</span></span>`;
  book.addEventListener('click', () => {
    if (owned) openReceta(cid);
    else if (c.storyUnlock) toast('La abuela escribió esta página… alguien del barrio la despertará.', 'soft');
    else { show('mercado'); toast('Ese cuaderno se consigue en la lona.', 'soft'); }
  });
  return book;
}

function pairIcons(step) {
  return `
    <span class="mini-item">${iconOf(step.a)}<small>${ITEMS[step.a].name}</small></span>
    <span class="op">+</span>
    <span class="mini-item">${iconOf(step.b)}<small>${ITEMS[step.b].name}</small></span>
    <span class="op">→</span>
    <span class="mini-item res">${iconOf(step.result)}<small>${ITEMS[step.result].name}</small></span>`;
}

/* La receta es un MOLESKINE: una hoja por paso. Se pasa de hoja con
   swipe o flechas; la última hoja (si el plato está a color) es la
   memoria cultural de la abuela. */
let mkIdx = null;

function mkPages(c, cid) {
  const pages = c.steps.map(s => ({ type: 'step', s }));
  if (isComplete(cid) && c.cultural) pages.push({ type: 'memoria' });
  return pages;
}

function renderReceta() {
  const cid = recetaOpen || state.active;
  recetaOpen = cid;
  const c = CUADERNOS[cid];
  const complete = isComplete(cid);
  $('#receta-title').textContent = c.title;
  $('#receta-city').textContent = `${c.city} · ${REGIONS[c.region].short}`;
  const dIcon = $('#receta-dish-icon');
  dIcon.innerHTML = iconOf(c.dish);
  dIcon.classList.toggle('boceto', !isColored(c.dish));
  $('#receta-intro').textContent = c.intro;
  $('#receta-stamp').style.display = complete ? '' : 'none';
  /* la cinta marcapáginas: el cuaderno siempre se abre en la hoja de hoy */
  const pages = mkPages(c, cid);
  const curStep = c.steps.findIndex(s => !knows(s.result) && !s.variant);
  mkIdx = curStep === -1 ? pages.length - 1 : curStep;
  renderMkPage(false);
  $('#receta-progress').textContent = complete ? 'Receta recuperada. La clientela la pide.' : `${stepsDone(cid)} de ${mainSteps(cid).length} pasos descifrados`;
  $('#receta-cook-btn').onclick = () => goCook(cid);
}

function renderMkPage(animate = true, dir = 1) {
  const cid = recetaOpen;
  const c = CUADERNOS[cid];
  const pages = mkPages(c, cid);
  const page = $('#mk-page');

  const paint = () => {
    const p = pages[mkIdx];
    if (p.type === 'memoria') {
      page.dataset.ghost = '❦';
      page.innerHTML = `
        <p class="mk-state mem">la memoria de la abuela</p>
        <p class="mk-memoria">${c.cultural}</p>
        <p class="mk-firma hand">— Delfina</p>`;
    } else {
      const step = p.s;
      const i = c.steps.indexOf(step);
      const done = knows(step.result);
      const revealed = state.revealed.includes(step.result);
      const isCurrent = i === c.steps.findIndex(s => !knows(s.result) && !s.variant);
      page.dataset.ghost = step.variant ? '✳' : String(i + 1);
      if (done) {
        page.innerHTML = `
          <p class="mk-state done">✓ descifrado</p>
          <p class="step-line">${step.line}</p>
          <div class="step-icons">${pairIcons(step)}</div>`;
      } else {
        page.innerHTML = `
          <p class="mk-state">${isCurrent ? 'la hoja de hoy' : 'aún en tinta invisible'}</p>
          <p class="step-hint hand">“${step.hint}”</p>
          ${step.shopNote ? `<p class="step-shopnote">${step.shopNote}</p>` : ''}
          ${revealed ? `<div class="step-icons">${pairIcons(step)}</div>` : ''}
          <div class="step-actions">
            <button type="button" class="btn-main small try-btn">Intentar en la mesa</button>
            ${!revealed ? `<button type="button" class="btn-ghost small reveal">Espiar <small>S/ ${S(REVEAL_COST)}</small></button>` : ''}
          </div>`;
        page.querySelector('.try-btn').addEventListener('click', () => goCook(cid));
        const rev = page.querySelector('.reveal');
        if (rev) rev.addEventListener('click', () => {
          if (state.coins < REVEAL_COST) { toast(MICROCOPY.noCoins, 'soft'); return; }
          addCoins(-REVEAL_COST); state.revealed.push(step.result); save(); renderMkPage(false);
        });
      }
    }
    const dots = $('#mk-dots'); dots.innerHTML = '';
    pages.forEach((pp, i) => {
      const d = el('button', 'mk-dot'
        + (i === mkIdx ? ' on' : '')
        + (pp.type === 'step' && knows(pp.s.result) ? ' done' : '')
        + (pp.type === 'memoria' ? ' mem' : ''));
      d.type = 'button';
      d.setAttribute('aria-label', pp.type === 'memoria' ? 'La memoria' : `Hoja ${i + 1}`);
      d.addEventListener('click', () => mkGo(i - mkIdx));
      dots.appendChild(d);
    });
    $('#mk-prev').disabled = mkIdx === 0;
    $('#mk-next').disabled = mkIdx === pages.length - 1;
  };

  if (!animate) { page.classList.remove('turn-l', 'turn-r'); paint(); return; }
  page.classList.remove('turn-l', 'turn-r'); void page.offsetWidth;
  page.classList.add(dir > 0 ? 'turn-r' : 'turn-l');
  setTimeout(paint, 150);          /* el contenido cambia a mitad del giro */
}

function mkGo(d) {
  if (!d || !recetaOpen) return;
  const pages = mkPages(CUADERNOS[recetaOpen], recetaOpen);
  const n = Math.min(Math.max(mkIdx + d, 0), pages.length - 1);
  if (n === mkIdx) return;
  mkIdx = n;
  sfx('tab'); buzz(10);
  renderMkPage(true, d);
}

/* ============================================================
   COCINA
   ============================================================ */

const slots = [null, null];
let combining = false;
let pickerSlot = 0;

function renderCocina() {
  renderComensal();
  renderSlots();
  renderMesaAction();
  renderRiddle();
  renderReady();
  updateCoach();
}

/* --- El comensal al otro lado del mostrador (barra de sushi):
       uno al frente, grande; el resto espera su turno detrás --- */
function renderComensal() {
  const box = $('#comensal');
  box.innerHTML = '';

  /* estados de calma: sin recetas o modo tranquilo → mostrador sereno */
  if (!realDishes().length) { box.className = 'comensal calm'; box.appendChild(el('p', 'mostrador-note hand', 'Descubre tu primer plato en la mesa y llegará la clientela.')); return; }
  if (state.mode === 'tranquilo') { box.className = 'comensal calm'; box.appendChild(el('p', 'mostrador-note hand', 'Modo tranquilo · cocina sin prisa 🌙')); return; }

  const guest = storyGuest();
  const front = guest || queue.find(c => !c.story) || null;
  if (!front) { box.className = 'comensal calm'; box.appendChild(el('p', 'mostrador-note hand', 'El mostrador está libre… ya vendrá alguien ☕')); return; }

  const waiting = queue.filter(c => c !== front).length;
  const have = count(front.dish) >= 1;
  box.className = 'comensal' + (front.story ? ' story' : '') + (have ? ' ready' : '');

  /* el comensal es un PERSONAJE en la barra: avatar grande con globo
     de pedido (como ordenar de verdad), no una tarjeta de lista */
  const scene = el('div', 'com-scene');
  scene.dataset.id = front.id;
  const sinReloj = front.story || !isFinite(front.deadline);
  const frac = sinReloj ? 1 : Math.max(0, (front.deadline - Date.now()) / (front.total * 1000));
  scene.innerHTML = `
    <div class="com-who">
      ${front.story ? '<span class="com-crown" aria-hidden="true">★</span>' : ''}
      ${waiting > 0 ? `<span class="com-waiting" title="${waiting} esperando su turno">+${waiting}</span>` : ''}
      <span class="com-avatar">${iconOf(front.icon)}</span>
      <span class="com-name">${front.name}</span>
    </div>
    <div class="com-order">
      <div class="com-bubble">
        <span class="com-dish">${iconOf(front.dish)}</span>
        <span class="com-ask">${ITEMS[front.dish].name}<small>${front.story ? 'no se irá sin probarlo' : front.accepted ? 'por favorcito' : 'acaba de llegar…'}</small></span>
      </div>
      ${sinReloj
        ? ''
        : `<span class="com-bar-wrap"><span class="com-bar" style="transform:scaleX(${frac})"></span></span>`}
      ${front.story ? '' : `
      <div class="com-chat">
        <button type="button" class="chat-btn chisme" ${(front.chismes | 0) > 0 ? '' : 'disabled'}>🗨 chismear</button>
        <button type="button" class="chat-btn adios">“se me acabó, veci”</button>
      </div>`}
    </div>
    <button type="button" class="com-serve" ${have ? '' : 'disabled'}>${have ? 'Servir' : '· · ·'}</button>`;
  if (!front.story) inkState(scene.querySelector('.com-avatar'), front.icon);
  inkState(scene.querySelector('.com-dish'), front.dish);
  scene.querySelector('.com-serve').addEventListener('click', () => { if (have) serveCustomer(front.id); });
  const chBtn = scene.querySelector('.chat-btn.chisme');
  if (chBtn) chBtn.addEventListener('click', () => chismear(front.id));
  const adBtn = scene.querySelector('.chat-btn.adios');
  if (adBtn) adBtn.addEventListener('click', () => despedir(front.id));
  box.appendChild(scene);
}

function itemCard(id) {
  const item = ITEMS[id];
  const card = el('button', 'item-card type-' + item.type);
  card.type = 'button'; card.dataset.id = id;
  card.innerHTML = `<span class="icon">${iconOf(id)}</span><span class="name">${item.name}</span>`;
  card.setAttribute('aria-label', `${item.name}, ${TYPES[item.type].label}`);
  inkState(card, id);                       /* boceto hasta descubrirse (GDD §3.2) */
  return card;
}

/* mesa de UN solo espacio: lo que está en la mesa es la base; todo lo
   demás (agregar, pelar, freír…) son botones de acción debajo */
function renderSlots() {
  if (slots[0] && !isTool(slots[0]) && count(slots[0]) <= 0) slots[0] = null;
  slots[1] = null;
  const zone = $('#slot-0');
  zone.innerHTML = '';
  zone.classList.toggle('filled', !!slots[0]);
  if (slots[0]) { const card = itemCard(slots[0]); card.tabIndex = -1; card.style.pointerEvents = 'none'; zone.appendChild(card); }
  else zone.innerHTML = `<span class="slot-plus" aria-hidden="true">+</span><span class="slot-add hand">agregar a la mesa</span>`;
  $('#mesa-clear').style.display = slots[0] ? '' : 'none';
}

function verbOf(sr) {
  if (sr.tech) return { label: ITEMS[sr.tech].name, icon: sr.tech };
  const tool = [sr.a, sr.b].find(id => isTool(id));
  const map = { olla: 'hervir', sarten: 'dorar', pilon: 'majar', molino: 'moler', cuchillo: 'pelar', tabla: 'mezclar' };
  if (tool && map[tool]) return { label: ITEMS[map[tool]].name, icon: map[tool] };
  if (isDish(sr.result)) return { label: 'Servir', icon: 'mezclar' };
  return { label: 'Mezclar', icon: 'mezclar' };
}

function mishapFor(x, y) {
  const key = [x, y].sort().join('|');
  if (MISHAPS[key]) return MISHAPS[key];
  return { result: 'mezcla_rara', title: MISHAP_GENERIC.title, text: MISHAP_GENERIC.text(ITEMS[x].name.toLowerCase(), ITEMS[y].name.toLowerCase()) };
}

/* Devuelve la acción posible. Siempre "pasa algo" salvo dos utensilios. */
function actionFor(x, y) {
  const step = findStep(x, y);
  if (step && owns(step.cuaderno)) return { kind: 'step', source: step, result: step.result, good: true };
  const rule = findRule(x, y);
  if (rule) {
    if (rule.kind === 'creative') return { kind: 'creative', source: rule, result: rule.result, good: true };
    return { kind: 'fail', result: rule.result, good: false, full: { title: 'Eso no salió', text: rule.msg } };
  }
  if ((isDone(x) && isHeat(y)) || (isDone(y) && isHeat(x)))
    return { kind: 'burn', result: 'quemado', good: false, full: { title: 'Se quemó', text: MICROCOPY.burned } };
  if (isTool(x) && isTool(y)) return null;               /* dos utensilios: nada */
  const m = mishapFor(x, y);                              /* combinación rara: igual se hace, inútil */
  return { kind: 'weird', result: m.result, good: false, full: { title: m.title, text: m.text } };
}

/* habilidades ya aprendidas donde el 2º insumo es un utensilio tuyo:
   permite disparar la acción con solo el ingrediente en la mesa */
function learnedToolSteps(item) {
  if (isTool(item) || isDone(item)) return [];
  const seen = new Set();
  const out = [];
  for (const s of ALL_STEPS) {
    if (!owns(s.cuaderno) || !knows(s.result) || seen.has(s.result)) continue;
    let tool = null;
    if (s.a === item && isTool(s.b)) tool = s.b;
    else if (s.b === item && isTool(s.a)) tool = s.a;
    else continue;
    if (state.tools.includes(tool) && !isDull(tool)) { out.push({ step: s, tool }); seen.add(s.result); }
  }
  return out;
}

function actionBtn(cls, label, icon, onClick) {
  const btn = el('button', 'cook-btn' + cls, `<span class="cook-ic">${iconOf(icon)}</span> ${label}`);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

/* con algo en la mesa, TODO son botones de acción: "+ agregar" (abre la
   despensa y lo elegido se usa encima) + las habilidades aprendidas */
function renderMesaAction() {
  const zone = $('#mesa-action');
  zone.innerHTML = '';
  if (combining) return;
  const x = slots[0];
  if (!x) return;                        /* la casilla vacía ya es el agregar */

  zone.appendChild(actionBtn(' add', '＋ Agregar', 'usar', () => openPicker(0)));

  if (isDish(x)) {
    const wanted = queue.find(c => c.dish === x);
    if (wanted) zone.appendChild(actionBtn(' known', 'Servir', 'corazon', () => serveCustomer(wanted.id)));
    zone.appendChild(actionBtn(' guardar', 'Guardar', 'usar', clearMesa));
  }
  /* habilidades aprendidas para lo que está en la mesa (el utensilio va solo) */
  learnedToolSteps(x).forEach(({ step, tool }) => {
    const v = verbOf(step);
    zone.appendChild(actionBtn(' known', v.label, v.icon, () => performCook(x, tool)));
  });
}

function renderRiddle() {
  const note = $('#cocina-riddle');
  const dish = ITEMS[CUADERNOS[state.active].dish].name;
  const step = CUADERNOS[state.active].steps.find(s => !knows(s.result) && !s.variant);
  if (!step) { note.className = 'cocina-riddle done'; note.innerHTML = `<span class="riddle-label">${dish}</span><span class="riddle-hint hand">✓ te lo sabes de memoria</span>`; return; }
  note.className = 'cocina-riddle';
  note.innerHTML = `<span class="riddle-label">${dish} · el cuaderno murmura (toca)</span><span class="riddle-hint hand">“${step.hint}”</span>`;
}

/* tocar el acertijo = abrir la conversación con el cuaderno */
function riddleEscena() {
  const c = CUADERNOS[state.active];
  if (!c || combining) return;
  const step = currentStep();
  if (!step) {
    showEscena({ icon: c.dish, nombre: c.title, texto: 'Esta página ya respira a color. Te la sabes de memoria, como ella quería.', boton: 'A cocinar' });
    return;
  }
  const revealed = state.revealed.includes(step.result);
  const leerPaso = () => showEscena({
    icon: step.result, nombre: 'El cuaderno de la abuela',
    texto: step.line, boton: 'Ya entendí ✍',
    onClose: () => { if (currentScreen === 'cocina') renderCocina(); },
  });
  const ops = [{ label: 'Déjame intentarlo yo' }];
  if (revealed) ops.push({ label: 'Léemelo otra vez', onPick: leerPaso });
  else ops.push({ label: `Espiar la respuesta · S/ ${S(REVEAL_COST)}`, onPick: () => {
    if (state.coins < REVEAL_COST) { toast(MICROCOPY.noCoins, 'soft'); return; }
    addCoins(-REVEAL_COST); state.revealed.push(step.result); save();
    leerPaso();
  } });
  showEscena({ icon: 'cuaderno', nombre: `${c.title} · el acertijo`, texto: `«${step.hint}»`, opciones: ops });
}

/* --- repisa de platos listos: tira compacta, se oculta si no hay --- */
function renderReady() {
  const shelf = $('#ready-shelf'); shelf.innerHTML = '';
  const done = Object.keys(state.inv).filter(id => isDone(id) && count(id) > 0);
  shelf.classList.toggle('has', done.length > 0);
  if (!done.length) return;
  shelf.appendChild(el('span', 'ready-label hand', 'listos'));
  done.forEach(id => {
    const worth = ITEMS[id].sell;
    const wanted = queue.find(c => c.dish === id);
    const chip = el('div', 'ready-chip' + (wanted ? ' wanted' : ''));
    const card = itemCard(id);
    card.append(el('span', 'badge ready-n', String(count(id))));
    card.draggable = true;
    card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', id); });
    card.addEventListener('click', () => placeInSlot(id));   /* recalentar / combos */
    chip.appendChild(card);
    const acts = el('div', 'chip-acts');
    if (wanted) {
      const sv = el('button', 'chip-btn serve', 'servir');
      sv.addEventListener('click', () => serveCustomer(wanted.id));
      acts.appendChild(sv);
    }
    const sell = el('button', 'chip-btn ' + (worth ? 'sell' : 'toss'), worth ? `S/ ${S(worth)}` : 'botar');
    sell.title = worth ? `Vender por S/ ${S(worth)}` : 'Botar';
    sell.addEventListener('click', (e) => {
      addItem(id, -1);
      if (worth) { const p = e.currentTarget.getBoundingClientRect(); addCoins(worth); flyCoins(p.left + p.width / 2, p.top, Math.ceil(worth / 6)); toast(MICROCOPY.sellFromKitchen, 'seal'); }
      else { sfx('fail'); toast(MICROCOPY.tossed, 'soft'); }
      buzz(25); save(); renderCocina();
    });
    acts.appendChild(sell);
    chip.appendChild(acts);
    shelf.appendChild(chip);
  });
}

/* --- el paso del cuaderno que toca ahora (para guiar) --- */
function currentStep() {
  const c = CUADERNOS[state.active]; if (!c) return null;
  return c.steps.find(s => !knows(s.result) && !s.variant) || null;
}
function stepNeeds(id) {
  const s = currentStep(); if (!s) return false;
  return s.a === id || s.b === id;
}

/* --- despensa como hoja inferior: se abre al tocar el + de la mesa --- */
function openPicker(index) {
  if (combining) return;
  pickerSlot = index;
  renderPicker();
  $('#modal-despensa').classList.add('open');
  sfx('tab');
}
function closePicker() { $('#modal-despensa').classList.remove('open'); }

function pickCard(id) {
  const card = itemCard(id);
  card.classList.add('pick-card');
  const inSlots = slots.filter(s => s === id).length;
  if (!isTool(id)) card.append(el('span', 'badge', String(count(id))));
  const spent = !isTool(id) && count(id) - inSlots <= 0;
  if (spent) card.classList.add('spent');
  if (isTool(id) && ITEMS[id].wear) {
    const left = state.toolWear[id] ?? ITEMS[id].wear;
    card.append(el('span', 'wear' + (left <= 0 ? ' dull' : left <= 2 ? ' low' : ''), left <= 0 ? '✕' : '▮'.repeat(left)));
    if (left <= 0) card.classList.add('dull-tool');
  }
  if (stepNeeds(id) && !spent) card.classList.add('needed');
  card.addEventListener('click', () => {
    if (spent) { toast('No te queda. Cómpralo abajo 👇', 'soft'); return; }
    placeInSlot(id, pickerSlot);
    closePicker();
  });
  return card;
}
function buyCard(id) {
  const item = ITEMS[id];
  const card = el('button', 'item-card pick-card buy-card type-' + item.type);
  card.type = 'button'; card.dataset.buy = id;
  card.innerHTML = `<span class="icon">${iconOf(id)}</span><span class="name">${item.name}</span><span class="buy-price">S/ ${S(item.price)}</span>`;
  if (stepNeeds(id) && count(id) <= 0) card.classList.add('needed');
  card.addEventListener('click', () => {
    if (state.coins < item.price) { toast(MICROCOPY.noCoins, 'soft'); sfx('fail'); card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 450); return; }
    const r = card.getBoundingClientRect();
    addCoins(-item.price); addItem(id, 1); save();
    flyCoins(r.left + r.width / 2, r.top, 1);
    toast(`¡Compraste ${item.name.toLowerCase()}! Ya está en tu despensa.`, 'seal');
    buzz(20);
    renderPicker();
    /* resalta lo recién comprado en la despensa */
    setTimeout(() => { const nc = document.querySelector(`#despensa-body .pick-card[data-id="${id}"]:not(.buy-card)`); if (nc) { nc.classList.add('just-bought'); setTimeout(() => nc.classList.remove('just-bought'), 1200); } }, 30);
  });
  return card;
}
function sheetSection(title, cards) {
  const sec = el('div', 'sheet-sec');
  sec.appendChild(el('h4', 'sheet-sec-title', title));
  const grid = el('div', 'sheet-grid');
  if (!cards.length) grid.appendChild(el('span', 'sheet-empty hand', '—'));
  cards.forEach(c => grid.appendChild(c));
  sec.appendChild(grid);
  return sec;
}
function renderPicker() {
  const step = currentStep();
  const need = $('#despensa-need');
  const base = slots[0];
  if (base) {
    need.innerHTML = `En la mesa: <b>${ITEMS[base].name}</b>. Lo que elijas se usará encima. ${step ? 'Lo que sirve brilla ✨' : ''}`;
  } else if (step) {
    need.innerHTML = `El cuaderno pide: <b>${ITEMS[step.a].name}</b> + <b>${ITEMS[step.b].name}</b>. Lo que sirve brilla ✨`;
  } else { need.textContent = 'Elige qué poner en la mesa.'; }

  const body = $('#despensa-body'); body.innerHTML = '';
  const ing = Object.keys(state.inv).filter(id => ITEMS[id].type === 'ingredient' && count(id) > 0).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  const preps = Object.keys(state.inv).filter(id => ITEMS[id].type === 'prep' && count(id) > 0).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  /* los platos listos también son insumo (recalentar, bases, combos) */
  const listos = Object.keys(state.inv).filter(id => isDone(id) && count(id) > 0).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  const mine = [...listos, ...preps, ...ing];
  body.appendChild(sheetSection('Tu despensa', mine.map(id => pickCard(id))));
  body.appendChild(sheetSection('Utensilios', state.tools.map(id => pickCard(id))));
  const buyable = marketIngredients().filter(id => ITEMS[id].price != null);
  body.appendChild(sheetSection('En la lona · comprar', buyable.map(id => buyCard(id))));
}

/* --- guía paso a paso (coach) --- */
function updateCoach() {
  const coach = $('#coach');
  if (!coach) return;
  const c = CUADERNOS[state.active];
  /* la guía solo acompaña hasta cocinar el primer plato; luego los botones
     “Servir” son evidentes y dejamos ver el estante de platos listos */
  const hide = state.tutDone || currentScreen !== 'cocina' || state.mode !== 'servicio' || !c || count(c.dish) > 0;
  if (hide) { coach.classList.add('hidden'); return; }
  $('#coach-text').textContent = slots[0]
    ? 'Elige una acción, o ＋ Agrega lo que pide el cuaderno 👆'
    : 'Toca ➕ y pon lo que pide el cuaderno';
  coach.classList.remove('hidden');
}

/* Un solo espacio: si la mesa está vacía, lo colocas; si ya hay algo,
   lo nuevo SE USA sobre lo que está en la mesa (combina al instante). */
function placeInSlot(id, index = null) {
  if (combining) return;
  if (isTool(id) && isDull(id)) { toast(MICROCOPY.dullKnife, 'soft'); return; }
  const base = slots[0];
  if (!base) {
    if (isTool(id)) { toast('Primero pon un ingrediente; el utensilio se usa encima.', 'soft'); return; }
    if (count(id) <= 0) { toast('No te queda más. La lona tiene.', 'soft'); return; }
    slots[0] = id;
    sfx('place'); buzz(12);
    renderCocina();
    return;
  }
  if (!isTool(id) && count(id) - (base === id ? 1 : 0) <= 0) { toast('No te queda más. La lona tiene.', 'soft'); return; }
  const act = actionFor(base, id);
  if (!act) { toast(MICROCOPY.toolsClank, 'soft'); return; }
  performCook(base, id);
}
function clearMesa() { if (combining) return; slots[0] = slots[1] = null; renderCocina(); }

/* x = base que queda en la mesa; y = 2º insumo (puede venir de un botón
   de habilidad aprendida, sin estar colocado en una casilla). */
function performCook(x, y) {
  if (combining || !x || !y) return;
  const act = actionFor(x, y);
  if (!act) return;
  combining = true;
  const surface = $('#cocina-surface');
  $('#mesa-action').innerHTML = '';
  const consume = () => [x, y].forEach(id => { if (isTool(id)) wearTool(id); else addItem(id, -1); });

  if (act.good) {
    consume(); addItem(act.result, 1);
    colorize([x, y, act.source && act.source.tech, act.result]);   /* GDD §3.2 */
    const guest = storyGuest();
    if (guest && guest.memorias && guest.memorias.length) {
      const linea = guest.memorias.shift();
      /* la memoria es una escena: la visita habla mientras cocinas,
         y el juego se detiene a escucharla */
      setTimeout(() => queueEscena({
        icon: guest.icon, nombre: guest.name, texto: linea, boton: '…',
      }), 1000);
    }
    surface.classList.add('success'); buzz([30, 40, 60]); sfx('cook');
    const p = centerOf('#cocina-surface'); if (p) burst(p.x, p.y - 10, ['#e0b45c', '#9dbd8a', '#fff3d0']);
    setTimeout(() => {
      surface.classList.remove('success');
      slots[0] = act.result; slots[1] = null; combining = false;
      if (!knows(act.result)) discover(act.result, act.source, act.kind === 'step' ? 'canon' : 'creative');
      else { floaty(`+1 ${ITEMS[act.result].name}`); renderCocina(); }
      checkRescue(); save();
    }, 540);
    return;
  }
  /* percance: igual se hace algo inútil, y se explica a pantalla completa */
  consume(); addItem(act.result, 1);
  surface.classList.add('shake'); buzz(90); sfx('fail');
  setTimeout(() => {
    surface.classList.remove('shake');
    slots[0] = slots[1] = null; combining = false;
    renderCocina(); checkRescue(); save();
    showMishap(act.result, act.full.title, act.full.text);
  }, 480);
}

/* el percance también es una escena, con su decisión */
function showMishap(id, title, text) {
  const worth = ITEMS[id].sell;
  queueEscena({
    icon: id, nombre: title,
    texto: text,
    opciones: [
      { label: 'Botar nomás', onPick: () => {
          if (count(id) > 0) addItem(id, -1);
          toast(MICROCOPY.tossed, 'soft'); save();
          if (currentScreen === 'cocina') renderCocina();
        } },
      { label: worth ? `Guardar (vale S/ ${S(worth)})` : 'Guardar igual', onPick: () => {
          if (currentScreen === 'cocina') renderCocina();
        } },
    ],
  });
}
function tossMishap() {
  const id = $('#mishap-toss').dataset.id;
  if (count(id) > 0) addItem(id, -1);
  $('#modal-mishap').classList.remove('open');
  toast(MICROCOPY.tossed, 'soft');
  if (currentScreen === 'cocina') renderCocina();
  save();
}
function keepMishap() {
  $('#modal-mishap').classList.remove('open');
  if (currentScreen === 'cocina') renderCocina();
}

function floaty(text) { const f = el('span', 'floaty hand', text); $('#cocina-surface').appendChild(f); setTimeout(() => f.remove(), 1100); }

function discover(id, source, kind) {
  const wasFirstDish = isDish(id) && !realDishes().length && !ITEMS[id].creative;
  state.discovered.push(id);
  const item = ITEMS[id];
  let reward = kind === 'creative' ? REWARDS.creative
    : item.type === 'dish' ? (item.meta ? REWARDS.dishMeta : item.variant ? REWARDS.dishVariant : REWARDS.dish) : REWARDS.step;
  let newTech = null;
  if (source.tech && !state.techniques.includes(source.tech)) { state.techniques.push(source.tech); newTech = source.tech; reward += REWARDS.technique; }
  addCoins(reward);
  sfx(item.type === 'dish' ? 'win' : 'coin');
  const p = centerOf('#cocina-surface'); if (p && reward) flyCoins(p.x, p.y, Math.ceil(reward / 6));
  if (item.type === 'dish') {
    colorize([id]);
    if (!state.dishesDone.includes(id)) state.dishesDone.push(id);
    state.firstDishPending = wasFirstDish;
    save(); maybeUnlockRegion();
    showCelebration(id, source, reward, kind);
  } else { save(); showPaso(id, source, reward, newTech); }
}

/* el paso descifrado es una ESCENA: el cuaderno de la abuela te habla */
function showPaso(id, source, reward, newTech) {
  const dicho = source.hint ? `«${source.hint}»… ¡era esto! ` : '';
  queueEscena({
    icon: id, nombre: 'El cuaderno de la abuela',
    texto: `${dicho}${source.line || source.msg || ''}`,
    boton: 'Seguir cocinando ✍',
    onClose: () => {
      banner(`${ITEMS[id].name} · +S/ ${S(reward)}${newTech ? ` · nuevo saber: ${ITEMS[newTech].name}` : ''}`, '✍');
      if (currentScreen === 'cocina') renderCocina();
      if (currentScreen === 'receta') renderReceta();
    },
  });
}
function closePaso() {
  $('#modal-paso').classList.remove('open');
  if (currentScreen === 'cocina') renderCocina();
  if (currentScreen === 'receta') renderReceta();
  drainEscena();
}

let celebratedCuaderno = null;
function showCelebration(id, source, reward, kind) {
  celebratedCuaderno = source.cuaderno || null;
  const item = ITEMS[id];
  const c = source.cuaderno ? CUADERNOS[source.cuaderno] : null;
  $('#celebra-icon').innerHTML = iconOf(id);
  $('#celebra-stamp').innerHTML = kind === 'creative' ? 'invento<br>de la casa' : 'plato<br>recuperado';
  $('#celebra-name').textContent = item.name;
  $('#celebra-city').textContent = c ? `${c.city} · ${REGIONS[c.region].short}` : 'creación propia';
  $('#celebra-line').textContent = source.line || source.msg || '';
  $('#celebra-reward').textContent = `+S/ ${S(reward)}`;
  $('#celebra-sell').textContent = item.sell ? `Se vende a S/ ${S(item.sell)}. La clientela ya puede pedirlo.` : '';
  const confetti = $('#confetti'); confetti.innerHTML = '';
  for (let i = 0; i < 24; i++) { const p = el('i'); p.style.left = Math.random() * 100 + '%'; p.style.animationDelay = Math.random() * 0.5 + 's'; p.style.setProperty('--tone', ['#9dbd8a', '#d9a0b0', '#93a7c4', '#e0b45c'][i % 4]); confetti.appendChild(p); }
  $('#modal-celebra').classList.add('open');
}
function closeCelebration() {
  setTimeout(checkBeats, 300);
  $('#modal-celebra').classList.remove('open');
  if (state.firstDishPending) { state.firstDishPending = false; save(); toast(MICROCOPY.firstDish, 'seal'); lastSpawn = Date.now(); }
  if (celebratedCuaderno) openReceta(celebratedCuaderno); else show('cocina');
  drainEscena();
}

/* ============================================================
   MERCADO
   ============================================================ */

function renderMercado() {
  const grid = $('#market-books');
  const pendientes = REGION_ORDER.filter(r => state.regionsUnlocked.includes(r)).flatMap(regionCuadernos).filter(cid => !owns(cid) && !CUADERNOS[cid].storyUnlock);
  $('#market-books-section').style.display = pendientes.length ? '' : 'none';
  grid.innerHTML = '';
  pendientes.forEach(cid => {
    const c = CUADERNOS[cid];
    const card = el('div', 'market-book');
    card.style.setProperty('--accent', c.accent);
    card.innerHTML = `
      <span class="mb-icon">${iconOf('cuaderno')}</span>
      <span class="mb-title">${c.title}</span>
      <span class="mb-city">${c.city} · ${REGIONS[c.region].short}</span>
      <span class="mb-blurb hand">“${c.blurb}”</span>
      <button type="button" class="price buy-btn">S/ ${S(c.cost)}</button>`;
    card.querySelector('.buy-btn').addEventListener('click', () => buyCuaderno(cid, card));
    grid.appendChild(card);
  });

  const ing = $('#market-ingredients');
  ing.innerHTML = '';
  marketIngredients().forEach(id => {
    const item = ITEMS[id];
    const card = el('button', 'market-item');
    card.type = 'button';
    card.innerHTML = `<span class="icon">${iconOf(id)}</span><span class="name">${item.name}${count(id) ? ` <small class="have">×${count(id)}</small>` : ''}</span><span class="price tag">S/ ${S(item.price)}</span>`;
    card.addEventListener('click', () => {
      if (state.coins < item.price) { toast(MICROCOPY.noCoins, 'soft'); shakeCard(card); return; }
      addCoins(-item.price); addItem(id, 1); save(); buzz(25); renderMercado();
    });
    ing.appendChild(card);
  });

  const tools = $('#market-tools');
  tools.innerHTML = '';
  marketTools().forEach(id => {
    const item = ITEMS[id];
    const card = el('button', 'market-item'); card.type = 'button';
    card.innerHTML = `<span class="icon">${iconOf(id)}</span><span class="name">${item.name}</span><span class="price tag">S/ ${S(item.price)}</span>`;
    card.addEventListener('click', () => {
      if (state.coins < item.price) { toast(MICROCOPY.noCoins, 'soft'); shakeCard(card); return; }
      addCoins(-item.price); addItem(id, 1); save(); toast('Pesa, pero vale cada sucre.', 'seal'); renderMercado();
    });
    tools.appendChild(card);
  });
  state.tools.filter(id => ITEMS[id].wear).forEach(id => {
    const left = state.toolWear[id] ?? ITEMS[id].wear;
    if (left >= ITEMS[id].wear) return;
    const cost = ITEMS[id].sharpenCost;
    const card = el('button', 'market-item service'); card.type = 'button';
    card.innerHTML = `<span class="icon">${iconOf(id)}</span><span class="name">Afilar ${ITEMS[id].name.toLowerCase()}${left <= 0 ? ' <small class="have">(sin filo)</small>' : ''}</span><span class="price tag">S/ ${S(cost)}</span>`;
    card.addEventListener('click', () => {
      if (state.coins < cost) { toast(MICROCOPY.noCoins, 'soft'); shakeCard(card); return; }
      addCoins(-cost); state.toolWear[id] = ITEMS[id].wear; save(); toast('El afilador le devuelve el canto al cuchillo.', 'seal'); renderMercado();
    });
    tools.appendChild(card);
  });
  $('#market-tools-section').style.display = tools.children.length ? '' : 'none';

  const sell = $('#market-sell');
  sell.innerHTML = '';
  const sellables = Object.keys(state.inv).filter(id => (ITEMS[id].sell || ITEMS[id].type === 'junk') && count(id) > 0);
  if (!sellables.length) sell.appendChild(el('p', 'sell-empty hand', 'Cocina algo rico y la caserita te lo compra.'));
  else sellables.forEach(id => {
    const item = ITEMS[id];
    const worthless = !item.sell;
    const card = el('button', 'market-item sellable'); card.type = 'button';
    card.innerHTML = `<span class="icon">${iconOf(id)}</span><span class="name">${item.name} <small class="have">×${count(id)}</small></span><span class="price tag ${worthless ? 'toss-tag' : 'sell-tag'}">${worthless ? 'botar' : `+S/ ${S(item.sell)}`}</span>`;
    card.addEventListener('click', () => {
      addItem(id, -1);
      if (!worthless) { addCoins(item.sell); toast(MICROCOPY.sold, 'seal'); } else toast(MICROCOPY.tossed, 'soft');
      save(); buzz(25); renderMercado();
    });
    sell.appendChild(card);
  });
}

function buyCuaderno(cid, card) {
  const c = CUADERNOS[cid];
  if (state.coins < c.cost) { toast(MICROCOPY.noCoins, 'soft'); shakeCard(card); return; }
  addCoins(-c.cost);
  state.owned.push(cid);
  grantBasket(state, c.grants);
  state.active = cid;
  if (c.region !== state.region && state.regionsUnlocked.includes(c.region)) state.region = c.region;
  save();
  toast('La caserita te fía la primera canasta.', 'seal');
  openReceta(cid);
}
function shakeCard(card) { card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 450); }

/* ---------- Onboarding ---------- */
function maybeIntro() { if (!state.seenIntro) $('#modal-intro').classList.add('open'); }
function closeIntro() { state.seenIntro = true; save(); $('#modal-intro').classList.remove('open'); }

/* La carta de la abuela: apertura + ponerle nombre a la hueca */
function openCarta() {
  const input = $('#carta-input');
  input.value = state.huecaName || '';
  $('#modal-carta').classList.add('open');
  setTimeout(() => { try { input.focus(); } catch (e) {} }, 250);
}
function closeCarta() {
  const name = $('#carta-input').value.trim().slice(0, 26) || 'La hueca de la abuela';
  state.huecaName = name;
  state.seenCarta = true;
  save();
  $('#modal-carta').classList.remove('open');
  /* primera vez: te muestra la receta del bolón con el botón Intentar */
  if (!state.seenIntro) { state.seenIntro = true; save(); openReceta(CUADERNO_ORDER[0]); }
  else show('cocina');
}

/* Pantalla completa (donde el navegador lo permite; iOS usa "añadir a inicio") */
function fsSupported() { return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen); }
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  } catch (e) {}
}
function tryFullscreen() { if (fsSupported() && !(document.fullscreenElement || document.webkitFullscreenElement)) toggleFullscreen(); }

/* ============================================================
   ARRANQUE
   ============================================================ */

function bindEvents() {
  $('#btn-continue').addEventListener('click', () => { initAudio(); tryFullscreen(); show('cocina'); maybeIntro(); });
  $('#btn-new').addEventListener('click', () => {
    const fresh = !load();
    if (fresh || confirm('¿Empezar una hueca nueva? La actual se perderá.')) {
      initAudio(); tryFullscreen();
      state = newState(); queue = []; save(); renderHud(); openCarta();
    }
  });
  $('#carta-open').addEventListener('click', () => { initAudio(); closeCarta(); });
  $('#carta-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') closeCarta(); });
  $('#cover-fs').addEventListener('click', toggleFullscreen);
  $('#hud-sound').addEventListener('click', toggleSound);
  $('#fab-mercado').addEventListener('click', () => { sfx('tab'); show('mercado'); });
  $('#fab-cuaderno').addEventListener('click', () => { sfx('tab'); show('shelf'); });
  $('#float-back').addEventListener('click', () => { sfx('tab'); show(currentScreen === 'receta' ? 'shelf' : 'cocina'); });
  $('#receta-back').addEventListener('click', () => show('shelf'));
  /* Moleskine: pasar de hoja con flechas o con el dedo */
  $('#mk-prev').addEventListener('click', () => mkGo(-1));
  $('#mk-next').addEventListener('click', () => mkGo(1));
  const mkBook = $('#mk-book');
  let mkSwipeX = null;
  mkBook.addEventListener('touchstart', (e) => { mkSwipeX = e.touches[0].clientX; }, { passive: true });
  mkBook.addEventListener('touchend', (e) => {
    if (mkSwipeX === null) return;
    const dx = e.changedTouches[0].clientX - mkSwipeX; mkSwipeX = null;
    if (Math.abs(dx) > 42) mkGo(dx < 0 ? 1 : -1);
  }, { passive: true });
  $('#hud-mode').addEventListener('click', toggleMode);
  $('#quick-cocina').addEventListener('click', () => show('cocina'));
  $('#mesa-clear').addEventListener('click', clearMesa);
  $('#despensa-close').addEventListener('click', closePicker);
  $('#modal-despensa').addEventListener('click', (e) => { if (e.target === $('#modal-despensa')) closePicker(); });

  {
    const zone = $('#slot-0');
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'); if (id && ITEMS[id]) placeInSlot(id); });
    zone.addEventListener('click', () => { if (combining) return; if (!slots[0]) openPicker(0); });
  }

  $('#cocina-riddle').addEventListener('click', riddleEscena);
  $('#arriendo-pay').addEventListener('click', resolveRent);
  $('#cierre-reopen').addEventListener('click', reopenHueca);
  $('#salubridad-ok').addEventListener('click', resolveSalubridad);
  $('#mishap-toss').addEventListener('click', tossMishap);
  $('#mishap-keep').addEventListener('click', keepMishap);
  $('#milestone-close').addEventListener('click', () => { $('#modal-milestone').classList.remove('open'); if (state.sinceRent >= HUECA.rentEvery) setTimeout(showRent, 400); });
  $('#intro-close').addEventListener('click', closeIntro);
  $('#paso-close').addEventListener('click', closePaso);
  $('#modal-paso').addEventListener('click', (e) => { if (e.target === $('#modal-paso')) closePaso(); });
  $('#celebra-close').addEventListener('click', closeCelebration);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePaso(); if ($('#modal-celebra').classList.contains('open')) closeCelebration(); } });
}

function init() {
  const saved = load();
  state = saved || newState();
  if (state.served > 0) state.tutDone = true;   /* jugadores existentes ya no necesitan la guía */
  $('#btn-continue').style.display = saved ? '' : 'none';
  $('#btn-new').textContent = saved ? 'Hueca nueva' : 'Abrir la hueca';
  const sb = $('#hud-sound'); sb.textContent = state.muted ? '🔇' : '🔊'; sb.classList.toggle('off', !!state.muted);
  if (!fsSupported()) document.body.classList.add('no-fs');
  /* defs de acuarela para los íconos (gradientes compartidos) */
  if (typeof ICON_DEFS === 'string') document.body.insertAdjacentHTML('afterbegin', ICON_DEFS);
  $$('[data-icon]').forEach(n => { n.innerHTML = iconOf(n.dataset.icon); });
  bindEvents();
  renderHud();
  show('cover');
  startClock();
}

document.addEventListener('DOMContentLoaded', init);
