/* ============================================================
   Huecas — icons.js
   Set propio de ilustraciones chubby / flat minimalista
   (inspiración Tsuki Odyssey): formas redondas, pastel,
   caritas tiernas. Todo SVG inline, sin dependencias.
   ============================================================ */

const INK = '#4a4038';
const INKL = '#4a3c29';   /* línea de tinta cálida para contornos (acuarela) */

const _svg = (inner) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

/* Defs globales de acuarela: se inyectan una vez en el documento.
   Gradientes (luz arriba-izquierda) dan volumen; sheen/depth pintan
   cualquier forma sólida sin tocar cada ícono (§3: tinta + acuarela). */
const _grad = (id, a, b, c, cx = 37, cy = 30, r = 74) =>
  `<radialGradient id="${id}" cx="${cx}%" cy="${cy}%" r="${r}%">
     <stop offset="0%" stop-color="${a}"/><stop offset="58%" stop-color="${b}"/><stop offset="100%" stop-color="${c}"/>
   </radialGradient>`;
const ICON_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <radialGradient id="ico-sheen" cx="34%" cy="25%" r="46%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity=".52"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ico-depth" cx="50%" cy="40%" r="63%">
    <stop offset="56%" stop-color="#5a4326" stop-opacity="0"/><stop offset="100%" stop-color="#5a4326" stop-opacity=".19"/>
  </radialGradient>
  ${_grad('g-verde', '#bcd8a4', '#97b781', '#6f8f5c')}
  ${_grad('g-verde2', '#d6e0ac', '#b9c78a', '#93a566')}
  ${_grad('g-majado', '#ccd699', '#a8b877', '#869755')}
  ${_grad('g-oro', '#ecd792', '#cdb46e', '#a2894c')}
  ${_grad('g-oro2', '#ddba75', '#c6a05e', '#987a44')}
  ${_grad('g-queso', '#f9e2a8', '#f0cd8f', '#d3a75f')}
  ${_grad('g-clara', '#ffffff', '#fbf5e6', '#e9d7b2', 40, 34, 66)}
  ${_grad('g-yema', '#ffd982', '#f2b84e', '#d1912c', 38, 34, 62)}
  ${_grad('g-cafe', '#c9a178', '#a97e56', '#6f5238')}
  ${_grad('g-cafeliq', '#7c5d40', '#5d4630', '#3b2a1a', 40, 30, 70)}
  ${_grad('g-caldo', '#f1d489', '#e6c675', '#c39f4d')}
  ${_grad('g-loza', '#fdf7e7', '#f2e8cf', '#dccea6')}
</defs></svg>`;

/* carita kawaii: ojos, sonrisa y chapetes */
function face(x = 32, y = 34, s = 1, mood = 'happy') {
  const mouth = mood === 'dizzy'
    ? `<path d="M-4 5 Q-2 3 0 5 Q2 7 4 5" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    : mood === 'sleepy'
      ? `<path d="M-3 5 H3" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<path d="M-3 4 Q0 6.6 3 4" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const eyes = mood === 'dizzy'
    ? `<path d="M-9 -2 L-5 2 M-5 -2 L-9 2 M5 -2 L9 2 M9 -2 L5 2" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`
    : mood === 'sleepy'
      ? `<path d="M-9.5 0 Q-7 2.2 -4.5 0 M4.5 0 Q7 2.2 9.5 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<circle cx="-7" cy="0" r="2.2" fill="${INK}"/><circle cx="7" cy="0" r="2.2" fill="${INK}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${eyes}${mouth}
    <ellipse cx="-11.5" cy="4" rx="3" ry="1.9" fill="#f2a48d" opacity=".5"/>
    <ellipse cx="11.5" cy="4" rx="3" ry="1.9" fill="#f2a48d" opacity=".5"/></g>`;
}

/* vapor: dos volutas suaves */
const steam = (x = 32, y = 14) =>
  `<g stroke="#c9bda7" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85">
     <path d="M${x - 6} ${y + 6} Q${x - 9} ${y + 1} ${x - 6} ${y - 3}"/>
     <path d="M${x + 6} ${y + 8} Q${x + 3} ${y + 3} ${x + 6} ${y - 1}"/></g>`;

/* tazón chubby con contenido — loza con volumen, tinta y luz de borde */
function bowl(content, { steamOn = false, extra = '', bowlFill = 'url(#g-loza)' } = {}) {
  return `${steamOn ? steam(32, 16) : ''}
    <ellipse cx="33" cy="53.5" rx="19" ry="3.4" fill="#3a2c18" opacity=".16"/>
    <path d="M10 30 Q10 51 32 51 Q54 51 54 30 Z" fill="${bowlFill}"/>
    <path d="M10 30 Q10 51 32 51 Q54 51 54 30 Z" fill="url(#ico-depth)"/>
    <ellipse cx="32" cy="30" rx="22" ry="7.6" fill="${INKL}" opacity=".16"/>
    <ellipse cx="32" cy="29.4" rx="20.5" ry="6.7" fill="${content}"/>
    <ellipse cx="32" cy="29.4" rx="20.5" ry="6.7" fill="url(#ico-sheen)"/>
    ${extra}
    <path d="M13 33 Q14.5 47 30 50.5" fill="none" stroke="#fffaf0" stroke-width="1.9" stroke-opacity=".5" stroke-linecap="round"/>
    <path d="M10 30 Q10 51 32 51 Q54 51 54 30" fill="none" stroke="${INKL}" stroke-width="1.8" stroke-linecap="round"/>`;
}

/* pelotita con carita — volumen de acuarela, brillo especular y tinta */
const ball = (fill, dots = '', mood = 'happy') =>
  `<ellipse cx="33" cy="52.5" rx="15" ry="3.2" fill="#3a2c18" opacity=".16"/>
   <circle cx="32" cy="34" r="19" fill="${fill}"/>
   <circle cx="32" cy="34" r="19" fill="url(#ico-depth)"/>
   <circle cx="32" cy="34" r="19" fill="url(#ico-sheen)"/>
   <ellipse cx="24.5" cy="26" rx="6" ry="4.1" fill="#fff" opacity=".32"/>
   <circle cx="32" cy="34" r="19" fill="none" stroke="${INKL}" stroke-width="1.6" stroke-opacity=".55"/>
   ${dots}${face(32, 34, 1, mood)}`;

const ICONS = {};

/* ============ Ingredientes ============ */

ICONS.verde = _svg(`
  <ellipse cx="33" cy="53" rx="15" ry="3.2" fill="#3a2c18" opacity=".15"/>
  <g stroke="${INKL}" stroke-width="1.5" stroke-opacity=".5">
    <rect x="25" y="12" width="13" height="38" rx="6.5" fill="url(#g-verde)" transform="rotate(-16 32 50)"/>
    <rect x="25" y="12" width="13" height="38" rx="6.5" fill="url(#g-verde)" transform="rotate(16 32 50)"/>
    <rect x="25" y="9" width="13" height="42" rx="6.5" fill="url(#g-verde)"/>
  </g>
  <rect x="28" y="6" width="7" height="7" rx="2.5" fill="#6f8a5f"/>
  <path d="M29.5 15 Q27.5 30 30 46" stroke="#d0e2b8" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
  ${face(31.5, 32, .85)}`);

ICONS.queso = _svg(`
  <ellipse cx="33" cy="52" rx="21" ry="3.2" fill="#3a2c18" opacity=".14"/>
  <path d="M9 45 L29 15 Q32 11 35 15 L55 45 Q57 50 51 50 H13 Q7 50 9 45 Z" fill="url(#g-queso)" stroke="${INKL}" stroke-width="1.6" stroke-opacity=".5"/>
  <path d="M29 15 Q32 11 35 15 L55 45 Q57 50 51 50" fill="none" stroke="#fdf0c8" stroke-width="2" stroke-opacity=".55" stroke-linecap="round"/>
  <circle cx="24" cy="40" r="3.4" fill="#dcae5f"/><circle cx="22.6" cy="38.8" r="1.3" fill="#f7e2a8"/>
  <circle cx="41" cy="36" r="2.6" fill="#dcae5f"/><circle cx="40" cy="35.2" r="1" fill="#f7e2a8"/>
  <circle cx="33" cy="45" r="2.2" fill="#dcae5f"/>
  ${face(32, 30, .8)}`);

ICONS.cerdo = _svg(`
  <ellipse cx="33" cy="51" rx="17" ry="3" fill="#3a2c18" opacity=".13"/>
  <path d="M13 32 Q12 20 28 17 Q47 14 51 26 Q54 38 40 44 Q22 50 15 42 Q11 38 13 32 Z" fill="#e8a29a" stroke="${INKL}" stroke-width="1.5" stroke-opacity=".45"/>
  <path d="M15 27 Q31 19 49 23" stroke="#f7e6da" stroke-width="5.5" fill="none" stroke-linecap="round" opacity=".95"/>
  <ellipse cx="29" cy="35" rx="5.5" ry="3.6" fill="#d98d84" opacity=".65"/>
  <ellipse cx="41" cy="33" rx="3.4" ry="2.4" fill="#f2c8bf" opacity=".8"/>`);

ICONS.chicharron = _svg(`
  <path d="M12 37 Q10 24 22 25 Q27 25 30 30 Q32 24 40 24 Q52 24 51 34 Q51 44 40 43 Q34 42 32 37 Q29 43 21 43 Q13 43 12 37 Z" fill="#c98a5b"/>
  <path d="M18 31 Q22 28 26 31 M36 30 Q40 27 44 30" stroke="#a5744c" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  ${face(32, 36, .72)}`);

ICONS.pescado = _svg(`
  <path d="M50 32 L60 24 Q62 32 60 40 Z" fill="#7e94b5"/>
  <ellipse cx="30" cy="32" rx="21" ry="14" fill="#93a7c4"/>
  <path d="M12 32 Q20 40 34 42 Q20 44 13 38 Z" fill="#7e94b5" opacity=".7"/>
  <path d="M26 20 Q32 14 36 20 Q32 23 26 20 Z" fill="#7e94b5"/>
  <circle cx="20" cy="30" r="2.3" fill="${INK}"/>
  <path d="M15 36 Q17 38 19 36" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="24" cy="37" rx="2.6" ry="1.7" fill="#f2a48d" opacity=".5"/>`);

ICONS.yuca = _svg(`
  <path d="M18 12 Q13 32 22 48 Q27 55 34 50 Q42 44 44 28 Q45 16 38 12 Q28 7 18 12 Z" fill="#a5744c"/>
  <path d="M22 18 Q20 32 26 44 M31 15 Q30 30 35 42" stroke="#8a6240" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="24" cy="12" rx="7" ry="4" fill="#e8dcc0" transform="rotate(-12 24 12)"/>`);

ICONS.cebolla = _svg(`
  <path d="M28 12 Q32 5 36 12" stroke="#8fae7e" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="32" cy="34" r="17" fill="#c093b4"/>
  <path d="M25 20 Q20 32 25 46 M39 20 Q44 32 39 46" stroke="#a97a9d" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${face(32, 34, .82)}`);

ICONS.limon = _svg(`
  <ellipse cx="46" cy="16" rx="7" ry="3.8" fill="#8fae7e" transform="rotate(-24 46 16)"/>
  <circle cx="32" cy="36" r="16" fill="#cfd98a"/>
  <circle cx="32" cy="36" r="16" fill="none" stroke="#b9c470" stroke-width="2"/>
  ${face(32, 36, .8)}`);

ICONS.maiz = _svg(`
  <path d="M12 40 Q8 24 20 14 Q17 32 22 46 Q16 46 12 40 Z" fill="#8fae7e"/>
  <path d="M52 40 Q56 24 44 14 Q47 32 42 46 Q48 46 52 40 Z" fill="#8fae7e"/>
  <ellipse cx="32" cy="32" rx="12" ry="20" fill="#f2d06b"/>
  <g fill="#e3b84e">
    <circle cx="27" cy="20" r="2"/><circle cx="37" cy="20" r="2"/>
    <circle cx="25" cy="28" r="2"/><circle cx="32" cy="26" r="2"/><circle cx="39" cy="28" r="2"/>
    <circle cx="27" cy="44" r="2"/><circle cx="37" cy="44" r="2"/>
  </g>
  ${face(32, 35, .72)}`);

ICONS.papa = _svg(`
  <ellipse cx="32" cy="34" rx="19" ry="15" fill="#c9a06c" transform="rotate(-8 32 34)"/>
  <circle cx="20" cy="28" r="1.7" fill="#a5744c"/>
  <circle cx="44" cy="30" r="1.7" fill="#a5744c"/>
  <circle cx="38" cy="44" r="1.7" fill="#a5744c"/>
  ${face(31, 34, .85)}`);

ICONS.leche = _svg(`
  <rect x="24" y="10" width="16" height="9" rx="3" fill="#93a7c4"/>
  <path d="M23 19 H41 L44 28 V48 Q44 53 39 53 H25 Q20 53 20 48 V28 Z" fill="#fdfbf4" stroke="#e2d5ba" stroke-width="2"/>
  <rect x="20" y="33" width="24" height="9" fill="#dce6f0"/>
  ${face(32, 37.5, .62)}`);

ICONS.zapallo = _svg(`
  <rect x="29.5" y="8" width="5" height="9" rx="2.4" fill="#8a6240"/>
  <ellipse cx="18" cy="36" rx="11" ry="15" fill="#d99a4e"/>
  <ellipse cx="46" cy="36" rx="11" ry="15" fill="#d99a4e"/>
  <ellipse cx="32" cy="36" rx="12" ry="17" fill="#e0a45c"/>
  ${face(32, 36, .85)}`);

ICONS.granos_mixtos = _svg(`
  <path d="M18 24 Q14 18 20 16 H44 Q50 18 46 24 Q54 34 50 45 Q47 54 32 54 Q17 54 14 45 Q10 34 18 24 Z" fill="#e8d9b8"/>
  <path d="M20 16 Q32 22 44 16" stroke="#c9b891" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="24" cy="36" rx="3.4" ry="2.4" fill="#b98aae"/>
  <ellipse cx="34" cy="32" rx="3.4" ry="2.4" fill="#8fae7e"/>
  <ellipse cx="41" cy="39" rx="3.4" ry="2.4" fill="#e0a45c"/>
  <ellipse cx="29" cy="44" rx="3.4" ry="2.4" fill="#a5744c"/>
  <ellipse cx="38" cy="47" rx="3.4" ry="2.4" fill="#c98a5b"/>`);

ICONS.bacalao = _svg(`
  <path d="M8 32 Q8 22 20 20 L48 18 Q52 24 52 32 Q52 40 48 46 L20 44 Q8 42 8 32 Z" fill="#d9cdb8"/>
  <path d="M50 26 L60 20 Q61 32 60 44 L50 38" fill="#c9bda3"/>
  <path d="M20 24 L28 40 M28 24 L36 40 M36 23 L44 39" stroke="#c2b498" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M14 28 Q16.5 30 19 28" stroke="${INK}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
  <path d="M14 36 H19" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`);

ICONS.hoja = _svg(`
  <path d="M32 8 Q52 18 50 36 Q48 52 32 56 Q16 52 14 36 Q12 18 32 8 Z" fill="#9dbd8a"/>
  <path d="M32 12 V52 M32 24 Q24 26 20 32 M32 24 Q40 26 44 32 M32 38 Q26 40 23 44 M32 38 Q38 40 41 44" stroke="#7d9b76" stroke-width="2" fill="none" stroke-linecap="round"/>`);

ICONS.huevo = _svg(`
  <ellipse cx="33" cy="50" rx="18" ry="3" fill="#3a2c18" opacity=".13"/>
  <ellipse cx="32" cy="36" rx="20" ry="15" fill="url(#g-clara)" stroke="${INKL}" stroke-width="1.5" stroke-opacity=".42"/>
  <ellipse cx="24" cy="29" rx="6.5" ry="4" fill="#fff" opacity=".55"/>
  <circle cx="32" cy="36" r="8" fill="url(#g-yema)"/>
  <ellipse cx="29.5" cy="33.5" rx="2.5" ry="1.7" fill="#fff" opacity=".55"/>
  ${face(32, 36, .7)}`);

ICONS.cafe = _svg(`
  <ellipse cx="33" cy="55" rx="19" ry="3" fill="#3a2c18" opacity=".15"/>
  <path d="M18 24 L46 24 L50 50 Q50 54 46 54 H18 Q14 54 14 50 Z" fill="url(#g-cafe)" stroke="${INKL}" stroke-width="1.6" stroke-opacity=".5"/>
  <path d="M18 24 L46 24 L47 30 H17 Z" fill="#8a6240"/>
  <path d="M20 32 Q20 46 22 52" stroke="#d8b78e" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>
  <ellipse cx="26" cy="42" rx="4" ry="2.8" fill="#4d3826" transform="rotate(-18 26 42)"/>
  <ellipse cx="37" cy="45" rx="4" ry="2.8" fill="#4d3826" transform="rotate(14 37 45)"/>
  <ellipse cx="32" cy="17" rx="5" ry="3.4" fill="#5d4630"/>
  <ellipse cx="24" cy="14" rx="4" ry="2.8" fill="#6f543a" transform="rotate(-20 24 14)"/>
  ${face(31, 38, .68)}`);

ICONS.cafe_pasado = _svg(`
  ${steam(30, 14)}
  <ellipse cx="30" cy="52.5" rx="15" ry="2.8" fill="#3a2c18" opacity=".15"/>
  <path d="M12 26 Q12 50 30 50 Q48 50 48 26 Z" fill="url(#g-loza)"/>
  <path d="M12 26 Q12 50 30 50 Q48 50 48 26 Z" fill="url(#ico-depth)"/>
  <ellipse cx="30" cy="26" rx="18" ry="5.5" fill="url(#g-cafeliq)"/>
  <ellipse cx="26" cy="24.5" rx="6" ry="1.9" fill="#8a6a48" opacity=".7"/>
  <path d="M48 29 Q58 29 57 37 Q56 44 46 44" fill="none" stroke="${INKL}" stroke-width="3.4" stroke-opacity=".7" stroke-linecap="round"/>
  <path d="M12 26 Q12 50 30 50 Q48 50 48 26" fill="none" stroke="${INKL}" stroke-width="1.8" stroke-opacity=".6" stroke-linecap="round"/>
  ${face(30, 38, .72)}`);

ICONS.huevo_frito = _svg(`
  <ellipse cx="33" cy="49" rx="18" ry="3" fill="#3a2c18" opacity=".12"/>
  <path d="M14 34 Q12 22 24 20 Q30 12 40 17 Q52 16 52 28 Q56 38 46 44 Q40 52 28 48 Q14 48 14 34 Z" fill="url(#g-clara)" stroke="${INKL}" stroke-width="1.5" stroke-opacity=".42"/>
  <path d="M18 30 Q17 24 24 22" fill="none" stroke="#fff" stroke-width="2.4" stroke-opacity=".55" stroke-linecap="round"/>
  <circle cx="33" cy="33" r="9.5" fill="url(#g-yema)"/>
  <ellipse cx="30" cy="30" rx="2.8" ry="2" fill="#fff" opacity=".55"/>
  ${face(33, 34, .68)}`);

ICONS.bolon_huevo = _svg(`
  <ellipse cx="32" cy="53" rx="14" ry="2.8" fill="#3a2c18" opacity=".15"/>
  <circle cx="32" cy="38" r="16" fill="url(#g-oro)"/>
  <circle cx="32" cy="38" r="16" fill="url(#ico-depth)"/>
  <ellipse cx="25" cy="31" rx="5" ry="3.4" fill="#fff" opacity=".28"/>
  <circle cx="32" cy="38" r="16" fill="none" stroke="${INKL}" stroke-width="1.5" stroke-opacity=".5"/>
  <circle cx="27" cy="43" r="1.8" fill="#a3854e"/><circle cx="38" cy="44" r="1.6" fill="#a3854e"/>
  <path d="M18 27 Q16 17 26 16 Q31 10 39 14 Q48 13 47 23 Q50 29 43 32 Q36 36 27 33 Q18 34 18 27 Z" fill="url(#g-clara)" stroke="${INKL}" stroke-width="1.4" stroke-opacity=".4"/>
  <circle cx="33" cy="24" r="6.5" fill="url(#g-yema)"/>
  <ellipse cx="30.5" cy="22" rx="2" ry="1.4" fill="#fff" opacity=".5"/>
  ${face(32, 44, .72)}`);

/* ============ Utensilios ============ */

ICONS.pilon = _svg(`
  <rect x="38" y="6" width="8" height="26" rx="4" fill="#8a6240" transform="rotate(24 42 19)"/>
  <path d="M14 30 H50 Q50 46 42 50 H22 Q14 46 14 30 Z" fill="#b08a5f"/>
  <ellipse cx="32" cy="30" rx="18" ry="5" fill="#8a6240"/>
  <rect x="24" y="50" width="16" height="5" rx="2.5" fill="#8a6240"/>`);

ICONS.olla = _svg(`
  <ellipse cx="32" cy="20" rx="19" ry="5.5" fill="#8d867a"/>
  <rect x="28.5" y="11" width="7" height="6" rx="3" fill="#6b655b"/>
  <path d="M13 22 Q13 50 32 50 Q51 50 51 22 Q42 26 32 26 Q22 26 13 22 Z" fill="#7a7469"/>
  <rect x="5" y="24" width="9" height="5" rx="2.5" fill="#6b655b"/>
  <rect x="50" y="24" width="9" height="5" rx="2.5" fill="#6b655b"/>
  ${face(32, 38, .78)}`);

ICONS.sarten = _svg(`
  <rect x="42" y="27" width="19" height="7" rx="3.5" fill="#8a6240"/>
  <circle cx="26" cy="32" r="19" fill="#7a7469"/>
  <circle cx="26" cy="32" r="13" fill="#8d867a"/>
  ${face(26, 33, .68)}`);

ICONS.tabla = _svg(`
  <rect x="16" y="10" width="32" height="44" rx="10" fill="#c9a06c"/>
  <circle cx="32" cy="17" r="3.2" fill="#f6eed9"/>
  <path d="M22 28 H42 M22 36 H42 M22 44 H38" stroke="#b08a5f" stroke-width="2" stroke-linecap="round"/>`);

ICONS.cuchillo = _svg(`
  <rect x="27" y="34" width="10" height="22" rx="4" fill="#8a6240"/>
  <path d="M22 34 Q18 20 26 10 Q30 6 34 8 Q42 8 42 20 L42 34 Z" fill="#c9cdd4"/>
  <path d="M42 34 L42 18 Q46 26 44 34 Z" fill="#aab0ba"/>`);

ICONS.molino = _svg(`
  <rect x="18" y="26" width="28" height="24" rx="6" fill="#8d867a"/>
  <path d="M22 26 Q22 14 32 14 Q42 14 42 26 Z" fill="#aab0ba"/>
  <circle cx="49" cy="20" r="5.5" fill="none" stroke="#6b655b" stroke-width="3"/>
  <rect x="47" y="6" width="4" height="10" rx="2" fill="#8a6240" transform="rotate(18 49 11)"/>
  <rect x="24" y="50" width="16" height="5" rx="2.5" fill="#6b655b"/>
  ${face(32, 38, .62)}`);

/* ============ Técnicas (glifos sobre pastilla pastel) ============ */

function glyph(bg, inner) {
  return _svg(`<circle cx="32" cy="32" r="22" fill="${bg}"/>${inner}`);
}
ICONS.hervir = glyph('#dce6f0',
  `<g stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round">
     <path d="M24 42 Q21 35 24 29 Q27 24 24 19"/>
     <path d="M33 44 Q30 37 33 31 Q36 26 33 21"/>
     <path d="M42 42 Q39 35 42 29 Q45 24 42 19"/></g>`);
ICONS.majar = glyph('#e8d9b8',
  `<rect x="36" y="14" width="7" height="20" rx="3.5" fill="${INK}" transform="rotate(26 39 24)"/>
   <path d="M20 34 H46 Q46 45 39 48 H27 Q20 45 20 34 Z" fill="${INK}" opacity=".85"/>`);
ICONS.curtir = glyph('#f2d9e0',
  `<rect x="22" y="14" width="20" height="7" rx="3" fill="${INK}" opacity=".85"/>
   <path d="M23 21 H41 Q46 30 44 40 Q43 48 32 48 Q21 48 20 40 Q18 30 23 21 Z" fill="none" stroke="${INK}" stroke-width="2.6"/>
   <path d="M24 34 H40 M26 40 H38" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`);
ICONS.envolver = glyph('#dfe8d5',
  `<path d="M18 32 Q18 20 32 20 Q46 20 46 32 Q46 44 32 44 Q18 44 18 32 Z" fill="none" stroke="${INK}" stroke-width="2.6"/>
   <path d="M26 20 V44 M38 20 V44" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`);
ICONS.dorar = glyph('#f6dfc0',
  `<path d="M32 14 Q40 24 38 32 Q44 30 44 38 Q44 48 32 48 Q20 48 20 38 Q20 28 27 24 Q25 19 32 14 Z" fill="#e0a45c" stroke="${INK}" stroke-width="2"/>`);
ICONS.mezclar = glyph('#e4ddf0',
  `<path d="M32 18 Q45 18 45 30 Q45 41 34 41 Q25 41 25 33 Q25 26 32 26 Q37 26 37 31" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`);
ICONS.pelar = glyph('#e9e3d2',
  `<path d="M26 14 Q20 30 26 46" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
   <path d="M36 14 Q30 30 36 46 Q42 40 40 30 Q42 20 36 14 Z" fill="${INK}" opacity=".8"/>`);
ICONS.moler = glyph('#e0d5c2',
  `<circle cx="32" cy="32" r="12" fill="none" stroke="${INK}" stroke-width="2.8"/>
   <circle cx="32" cy="32" r="3" fill="${INK}"/>
   <rect x="41" y="14" width="4" height="12" rx="2" fill="${INK}" transform="rotate(32 43 20)"/>`);
ICONS.limpiar = glyph('#dbe7ea',
  `<path d="M18 40 Q14 30 24 24 L40 16 Q46 20 44 26 L28 36 Q22 40 18 40 Z" fill="none" stroke="${INK}" stroke-width="2.6"/>
   <path d="M22 44 Q26 40 30 44 M30 46 Q34 42 38 46" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);
ICONS.freir = glyph('#f6dcae',
  `<ellipse cx="30" cy="34" rx="15" ry="9" fill="none" stroke="${INK}" stroke-width="2.6"/>
   <rect x="43" y="31" width="14" height="5" rx="2.5" fill="${INK}"/>
   <circle cx="26" cy="34" r="2" fill="${INK}"/><circle cx="34" cy="32" r="2" fill="${INK}"/><circle cx="31" cy="38" r="2" fill="${INK}"/>`);
ICONS.revolver = glyph('#f3e6c8',
  `<circle cx="30" cy="36" r="13" fill="none" stroke="${INK}" stroke-width="2.6"/>
   <path d="M30 36 Q34 28 40 30" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
   <rect x="38" y="14" width="4" height="20" rx="2" fill="${INK}" transform="rotate(24 40 24)"/>`);

/* ============ Preparaciones ============ */

ICONS.verde_pelado = _svg(`
  <rect x="26" y="10" width="12" height="40" rx="6" fill="#efe3b8"/>
  <path d="M18 44 Q12 34 18 22 Q23 26 23 36 Z" fill="#9dbd8a"/>
  <path d="M46 44 Q52 34 46 22 Q41 26 41 36 Z" fill="#9dbd8a"/>
  ${face(32, 32, .72)}`);
ICONS.pescado_limpio = _svg(`
  <path d="M14 32 Q14 22 26 20 L46 20 Q52 26 52 32 Q52 38 46 44 L26 44 Q14 42 14 32 Z" fill="#f0dfd2"/>
  <path d="M24 22 Q28 32 24 42 M33 21 Q37 32 33 43 M42 21 Q46 32 42 43" stroke="#dfc4b0" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
ICONS.verde_frito = _svg(`
  <rect x="24" y="12" width="16" height="40" rx="8" fill="#d9a24e"/>
  <path d="M27 18 Q25 32 29 46" stroke="#c08736" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M36 18 Q38 32 34 46" stroke="#c08736" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  ${face(32, 32, .72)}`);
ICONS.tigrillo_base = _svg(bowl('#e9c877', { steamOn: true, extra: `<circle cx="28" cy="27" r="3.4" fill="#f2b84e"/><ellipse cx="38" cy="29" rx="4" ry="2.4" fill="#f6e2b0"/>` }));
ICONS.verde_cocido    = _svg(bowl('#b9c78a', { steamOn: true }));
ICONS.verde_majado    = _svg(bowl('#a8b877', { extra: `<ellipse cx="32" cy="27" rx="12" ry="6" fill="#b9c78a"/>` }));
ICONS.masa_bolon      = _svg(ball('#b9c78a', `<circle cx="24" cy="26" r="1.8" fill="#a3b26a"/><circle cx="41" cy="30" r="1.8" fill="#a3b26a"/><circle cx="36" cy="45" r="1.8" fill="#a3b26a"/>`));
ICONS.curtido = _svg(`
  <rect x="22" y="10" width="20" height="7" rx="3" fill="#8d867a"/>
  <path d="M22 17 H42 Q48 28 46 40 Q45 52 32 52 Q19 52 18 40 Q16 28 22 17 Z" fill="#f6e8ec" stroke="#e2d5ba" stroke-width="2"/>
  <path d="M22 30 Q32 26 42 30 M21 38 Q32 34 43 38 M23 45 Q32 42 41 45" stroke="#d9a0b0" stroke-width="3" fill="none" stroke-linecap="round"/>`);
ICONS.yuca_cocida     = _svg(bowl('#efe6d2', { steamOn: true, extra: `<ellipse cx="26" cy="28" rx="5" ry="2.6" fill="#fdfbf4"/><ellipse cx="38" cy="29" rx="5" ry="2.6" fill="#fdfbf4"/>` }));
ICONS.caldo_pescado   = _svg(bowl('#e8c9a0', { steamOn: true, extra: `<path d="M38 24 L45 20 Q46 25 44 28 Z" fill="#93a7c4"/>` }));
ICONS.base_encebollado= _svg(bowl('#dfb98a', { steamOn: true, extra: `<ellipse cx="27" cy="28" rx="4" ry="2.2" fill="#efe6d2"/><ellipse cx="38" cy="29" rx="4" ry="2.2" fill="#c9a06c"/>` }));
ICONS.maiz_preparado  = _svg(bowl('#f2d06b', { extra: `<circle cx="27" cy="28" r="1.6" fill="#e3b84e"/><circle cx="36" cy="27" r="1.6" fill="#e3b84e"/><circle cx="32" cy="31" r="1.6" fill="#e3b84e"/>` }));
ICONS.mezcla_humita   = _svg(bowl('#f2dc9b', { extra: `<path d="M24 28 Q32 24 40 28" stroke="#e3c46e" stroke-width="2.4" fill="none" stroke-linecap="round"/>` }));
ICONS.humita_envuelta = _svg(`
  <path d="M14 32 Q14 20 32 20 Q50 20 50 32 Q50 44 32 44 Q14 44 14 32 Z" fill="#a8b877"/>
  <path d="M14 32 Q10 26 12 20 Q18 22 20 27 M50 32 Q54 26 52 20 Q46 22 44 27" fill="#8fae7e"/>
  <path d="M26 21 V43 M38 21 V43" stroke="#8fae7e" stroke-width="2.4" stroke-linecap="round"/>
  ${face(32, 32, .68)}`);
ICONS.papa_cocida     = _svg(`${steam(32, 14)}<ellipse cx="32" cy="36" rx="17" ry="13.5" fill="#e3cf9f"/>${face(32, 36, .8)}`);
ICONS.masa_llapingacho= _svg(`
  <ellipse cx="32" cy="42" rx="18" ry="8" fill="#d9c48e"/>
  <ellipse cx="32" cy="32" rx="15" ry="7.5" fill="#e3cf9f"/>
  ${face(32, 32, .62)}`);
ICONS.base_espesa     = _svg(bowl('#c9a06c', { steamOn: true }));
ICONS.crema_base      = _svg(bowl('#efe0c8', { extra: `<path d="M24 28 Q32 25 40 28" stroke="#e0cfa8" stroke-width="2.6" fill="none" stroke-linecap="round"/>` }));
ICONS.base_fanesca    = _svg(bowl('#e0b45c', { steamOn: true, extra: `<circle cx="26" cy="28" r="1.8" fill="#c98a5b"/><circle cx="37" cy="29" r="1.8" fill="#8fae7e"/>` }));

/* ============ Platos ============ */

ICONS.bolon = _svg(`${steam(32, 12)}
  ${ball('#c9b06a', `<circle cx="23" cy="25" r="2" fill="#a89052"/><circle cx="42" cy="28" r="2" fill="#a89052"/><circle cx="37" cy="46" r="2" fill="#a89052"/><circle cx="24" cy="43" r="2" fill="#a89052"/>`)}`);

ICONS.bolon_mixto = _svg(`${steam(32, 12)}
  ${ball('#c9a05e', `<ellipse cx="23" cy="26" rx="3" ry="2" fill="#a5744c"/><ellipse cx="42" cy="29" rx="3" ry="2" fill="#a5744c"/><ellipse cx="36" cy="46" rx="3" ry="2" fill="#a5744c"/>`)}`);

ICONS.tigrillo = _svg(bowl('url(#g-caldo)', { steamOn: true, extra:
  `<circle cx="24" cy="27" r="2.6" fill="#f2b84e"/><ellipse cx="36" cy="28.5" rx="4" ry="2" fill="#f6e2b0"/><circle cx="41" cy="27" r="2.2" fill="#c98a5b"/>` })
  + face(32, 40, .74));

ICONS.tigrillo_mixto = _svg(bowl('url(#g-oro2)', { steamOn: true, extra:
  `<ellipse cx="24" cy="27.5" rx="3" ry="2" fill="#a5744c"/><circle cx="35" cy="28.5" r="2.4" fill="#f2b84e"/><ellipse cx="41" cy="27" rx="3" ry="2" fill="#a5744c"/>` })
  + face(32, 40, .74));

ICONS.quemado = _svg(`${steam(30, 12)}
  <ellipse cx="32" cy="30" rx="21" ry="7" fill="#5c5040"/>
  <ellipse cx="27" cy="29" rx="3" ry="1.8" fill="#3a332a"/>
  <ellipse cx="38" cy="30" rx="3" ry="1.8" fill="#3a332a"/>
  <path d="M11 30 Q11 50 32 50 Q53 50 53 30 Z" fill="#efe6d2"/>
  <path d="M11 30 Q11 50 32 50 Q53 50 53 30" fill="none" stroke="#e2d5ba" stroke-width="2"/>
  <ellipse cx="32" cy="52" rx="9" ry="2.5" fill="#e2d5ba"/>
  ${face(32, 39, .8, 'dizzy')}`);

ICONS.encebollado = _svg(`${steam(32, 12)}
  <ellipse cx="32" cy="28" rx="21" ry="7" fill="#e8c9a0"/>
  <path d="M40 22 L48 17 Q49 23 46 26 Z" fill="#93a7c4"/>
  <path d="M20 24 Q24 20 28 24 M27 22 Q31 18 35 22" stroke="#d9a0b0" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M11 28 Q11 48 32 48 Q53 48 53 28 Z" fill="#f6eed9"/>
  <path d="M11 28 Q11 48 32 48 Q53 48 53 28" fill="none" stroke="#e2d5ba" stroke-width="2"/>
  <ellipse cx="32" cy="50" rx="9" ry="2.5" fill="#e2d5ba"/>
  ${face(32, 38, .72)}`);

ICONS.humita = _svg(`
  <path d="M12 36 Q6 28 10 16 Q20 18 23 27 Z" fill="#9dbd8a"/>
  <path d="M52 36 Q58 28 54 16 Q44 18 41 27 Z" fill="#9dbd8a"/>
  <path d="M15 34 Q15 22 32 22 Q49 22 49 34 Q49 47 32 47 Q15 47 15 34 Z" fill="#f2d06b"/>
  <path d="M15 34 Q15 46 32 46" fill="none" stroke="#e3b84e" stroke-width="2"/>
  ${face(32, 34, .78)}`);

ICONS.llapingacho = _svg(`${steam(32, 12)}
  <ellipse cx="32" cy="44" rx="19" ry="8.5" fill="#d3a457"/>
  <ellipse cx="32" cy="43" rx="19" ry="8" fill="#e0b45c"/>
  <ellipse cx="32" cy="32" rx="15.5" ry="7.5" fill="#e8c684"/>
  <ellipse cx="32" cy="27.5" rx="8" ry="2.6" fill="#f6e2b0"/>
  ${face(32, 33, .66)}`);

ICONS.fanesca = _svg(`${steam(32, 10)}
  <ellipse cx="32" cy="26" rx="22" ry="7.5" fill="#e0b45c"/>
  <circle cx="22" cy="24" r="2.2" fill="#8fae7e"/>
  <circle cx="32" cy="26" r="2.2" fill="#c98a5b"/>
  <circle cx="42" cy="24" r="2.2" fill="#b98aae"/>
  <ellipse cx="36" cy="22" rx="4.5" ry="2" fill="#efe6d2"/>
  <path d="M9 26 Q9 50 32 50 Q55 50 55 26 Z" fill="#f6eed9"/>
  <path d="M9 26 Q9 50 32 50 Q55 50 55 26" fill="none" stroke="#e2d5ba" stroke-width="2"/>
  <ellipse cx="32" cy="52" rx="10" ry="2.5" fill="#e2d5ba"/>
  ${face(32, 38, .78)}`);

/* ============ Otros ============ */

ICONS.mezcla_rara = _svg(`
  <path d="M14 38 Q10 26 20 22 Q22 14 32 16 Q42 12 46 22 Q56 26 50 38 Q54 48 42 50 Q36 54 28 50 Q16 52 14 38 Z" fill="#9aa88f"/>
  <circle cx="22" cy="24" r="3" fill="#b3bfa6"/>
  <circle cx="44" cy="42" r="2.4" fill="#b3bfa6"/>
  <circle cx="40" cy="18" r="2" fill="#b3bfa6"/>
  ${face(32, 34, .9, 'dizzy')}`);

ICONS.bolon_doble_queso = _svg(`${steam(32, 12)}
  <circle cx="32" cy="34" r="19" fill="#c9b06a"/>
  <path d="M20 42 Q24 50 32 48 Q28 44 28 40 Z" fill="#f6e2b0"/>
  <path d="M44 40 Q44 48 36 49 Q38 44 40 40 Z" fill="#f6e2b0"/>
  ${face(32, 32, 1)}`);

ICONS.humita_con_queso = _svg(`
  <path d="M12 36 Q6 28 10 16 Q20 18 23 27 Z" fill="#9dbd8a"/>
  <path d="M52 36 Q58 28 54 16 Q44 18 41 27 Z" fill="#9dbd8a"/>
  <path d="M15 34 Q15 22 32 22 Q49 22 49 34 Q49 47 32 47 Q15 47 15 34 Z" fill="#f2d06b"/>
  <path d="M24 24 Q28 32 24 38 M36 23 Q40 31 38 39" stroke="#fdfbf4" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  ${face(32, 34, .74)}`);

ICONS.verde_amargo = _svg(`
  <rect x="24" y="12" width="16" height="38" rx="8" fill="#6e7a58"/>
  <path d="M27 18 Q25 32 29 44" stroke="#59644a" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${face(32, 32, .78, 'dizzy')}`);

ICONS.leche_cortada = _svg(`
  <rect x="24" y="10" width="16" height="9" rx="3" fill="#8d867a"/>
  <path d="M23 19 H41 L44 28 V48 Q44 53 39 53 H25 Q20 53 20 48 V28 Z" fill="#f2ecdc" stroke="#d8ccb0" stroke-width="2"/>
  <circle cx="28" cy="40" r="2.6" fill="#d8ccb0"/>
  <circle cx="36" cy="45" r="2.2" fill="#d8ccb0"/>
  ${face(32, 33, .6, 'dizzy')}`);

ICONS.hoja_chamuscada = _svg(`
  <path d="M32 10 Q50 20 48 36 Q46 50 32 54 Q18 50 16 36 Q14 20 32 10 Z" fill="#7a6a55"/>
  <path d="M40 14 Q52 24 48 40 Q42 34 40 26 Z" fill="#4a4038" opacity=".55"/>
  <path d="M32 16 V50" stroke="#5c5040" stroke-width="2" stroke-linecap="round"/>
  ${steam(40, 12)}`);

/* clientes de la hueca */
function head(skin, hair, extra = '') {
  return _svg(`
    <circle cx="32" cy="34" r="19" fill="${skin}"/>
    ${hair}
    ${face(32, 37, .95)}
    ${extra}`);
}
ICONS.cliente_rosa = head('#e8b98f',
  `<path d="M13 34 Q10 12 32 13 Q54 12 51 34 Q51 22 32 22 Q13 22 13 34 Z" fill="#8d867a"/>
   <circle cx="14" cy="36" r="4" fill="#8d867a"/><circle cx="50" cy="36" r="4" fill="#8d867a"/>`);
ICONS.cliente_jacinto = head('#c98a5b',
  `<path d="M15 30 Q16 15 32 15 Q48 15 49 30 L49 26 Q46 20 32 20 Q18 20 15 26 Z" fill="#6b655b"/>
   <rect x="24" y="10" width="16" height="7" rx="3" fill="#6b655b"/>
   <path d="M24 47 Q32 51 40 47" stroke="#6b655b" stroke-width="3" fill="none" stroke-linecap="round"/>`);
ICONS.cliente_wawa = head('#e8b98f',
  `<path d="M22 16 Q32 8 42 16 Q38 12 32 12 Q26 12 22 16 Z" fill="#4a4038"/>
   <path d="M26 15 Q32 10 38 15" stroke="#4a4038" stroke-width="4" fill="none" stroke-linecap="round"/>
   <circle cx="20" cy="18" r="3.4" fill="#d9a0b0"/>`);
/* Don Aurelio, el del arriendo: sombrero, bigote y libreta */
ICONS.aurelio = head('#d9a878',
  `<path d="M13 30 Q13 14 32 14 Q51 14 51 30 L51 25 Q47 18 32 18 Q17 18 13 25 Z" fill="#8d867a"/>
   <rect x="19" y="8" width="26" height="8" rx="3.5" fill="#6b655b"/>
   <path d="M24 45 Q32 49 40 45" stroke="#8d867a" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
  `<g transform="rotate(-8 46 52)">
     <rect x="39" y="47" width="15" height="11" rx="2" fill="#a5744c"/>
     <path d="M42 50 H51 M42 53 H49" stroke="#f6eed9" stroke-width="1.6" stroke-linecap="round"/>
   </g>`);

ICONS.cliente_chofer = head('#b98a66',
  `<path d="M14 28 Q14 14 32 14 Q50 14 50 28 L50 24 H14 Z" fill="#4d5f80"/>
   <path d="M12 27 H52 L50 31 H14 Z" fill="#3d4c66"/>`);

ICONS.arriendo = _svg(`
  <rect x="16" y="18" width="32" height="34" rx="4" fill="#f6eed9" stroke="#d8ccb0" stroke-width="2"/>
  <path d="M22 28 H42 M22 35 H42 M22 42 H34" stroke="#8a7f70" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="42" cy="44" r="7" fill="#c96f52" opacity=".85"/>`);

ICONS.corazon = _svg(`
  <path d="M32 50 Q12 38 12 25 Q12 14 22 14 Q29 14 32 21 Q35 14 42 14 Q52 14 52 25 Q52 38 32 50 Z" fill="#d9a0b0"/>`);

ICONS.usar = _svg(`
  <path d="M40 12 L44 22 L54 26 L44 30 L40 40 L36 30 L26 26 L36 22 Z" fill="#f6eccf"/>
  <circle cx="22" cy="42" r="4" fill="#f6eccf"/><circle cx="46" cy="46" r="3" fill="#f6eccf"/>
  <path d="M40 12 L44 22 L54 26 L44 30 L40 40 L36 30 L26 26 L36 22 Z" fill="none" stroke="#fff" stroke-width="1.5" opacity=".6"/>`);

ICONS.ficha = _svg(`
  <circle cx="32" cy="32" r="17" fill="#e6c37a"/>
  <circle cx="32" cy="32" r="11.5" fill="none" stroke="#c9a052" stroke-width="2.4"/>
  <circle cx="32" cy="32" r="4" fill="#c9a052"/>`);

ICONS.cuaderno = _svg(`
  <rect x="14" y="10" width="36" height="44" rx="6" fill="#c9a06c"/>
  <rect x="14" y="10" width="8" height="44" rx="4" fill="#a5744c"/>
  <rect x="28" y="24" width="18" height="3.4" rx="1.7" fill="#f6eed9" opacity=".85"/>
  <rect x="28" y="32" width="14" height="3.4" rx="1.7" fill="#f6eed9" opacity=".6"/>
  ${face(35, 44, .55)}`);

/* ============ Ingredientes nuevos (expansión del recetario) ============ */

ICONS.tomate = _svg(ball('#e2554a', `
  <path d="M32 17 q-5 -3 -9 -1 q3 4 9 4 q6 0 9 -4 q-4 -2 -9 1z" fill="#6cae4f"/>
  <path d="M32 15 v5" stroke="#4f8a37" stroke-width="2.4" stroke-linecap="round"/>`));

ICONS.cilantro = _svg(`
  <ellipse cx="33" cy="53" rx="13" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M32 50 V26" stroke="#4f8a37" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M32 30 q-11 -4 -13 -12 q10 -1 13 8z" fill="#7cb85e"/>
  <path d="M32 30 q11 -4 13 -12 q-10 -1 -13 8z" fill="#8fc76e"/>
  <path d="M32 40 q-9 -3 -11 -10 q8 -1 11 7z" fill="#6ca84f"/>
  <path d="M32 40 q9 -3 11 -10 q-8 -1 -11 7z" fill="#7cb85e"/>
  ${face(32, 27, .72)}`);

ICONS.mani = _svg(`
  <ellipse cx="33" cy="52" rx="14" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M22 26 q-6 6 -1 12 q4 5 10 4 q6 -1 10 -6 q5 -6 0 -11 q-4 -4 -9 -3 q-6 1 -10 4z" fill="#dcb173"/>
  <path d="M22 26 q-6 6 -1 12 q4 5 10 4 q6 -1 10 -6 q5 -6 0 -11 q-4 -4 -9 -3 q-6 1 -10 4z" fill="url(#ico-depth)"/>
  <path d="M27 30 q4 3 9 1 M26 37 q5 3 11 0" stroke="#bd9155" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  ${face(31, 33, .8)}`);

ICONS.maduro = _svg(`
  <ellipse cx="33" cy="52" rx="14" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M18 22 q-4 16 6 24 q11 8 21 -2 q-12 1 -18 -7 q-6 -8 -4 -16z" fill="#f0b83c"/>
  <path d="M18 22 q-4 16 6 24 q11 8 21 -2 q-12 1 -18 -7 q-6 -8 -4 -16z" fill="url(#ico-depth)"/>
  <path d="M18 22 q3 -4 6 -2" stroke="#8a6a3a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M23 30 q3 11 12 15" stroke="#d99f28" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  ${face(29, 34, .82)}`);

ICONS.arroz = _svg(`
  <ellipse cx="33" cy="52" rx="16" ry="3.2" fill="#3a2c18" opacity=".16"/>
  <path d="M16 48 q0 -16 16 -16 q16 0 16 16z" fill="#f6f1e4"/>
  <path d="M16 48 q0 -16 16 -16 q16 0 16 16z" fill="url(#ico-depth)"/>
  <g fill="#e4dcc6">
    <ellipse cx="25" cy="41" rx="2.6" ry="1.5" transform="rotate(-20 25 41)"/>
    <ellipse cx="34" cy="38" rx="2.6" ry="1.5" transform="rotate(15 34 38)"/>
    <ellipse cx="40" cy="44" rx="2.6" ry="1.5" transform="rotate(-8 40 44)"/>
  </g>
  <path d="M16 48 q0 -16 16 -16 q16 0 16 16" fill="none" stroke="${INKL}" stroke-width="1.6"/>
  ${face(32, 43, .8)}`);

ICONS.camaron = _svg(`
  <ellipse cx="33" cy="52" rx="13" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M42 22 q-16 -2 -20 12 q-3 12 8 14 q10 2 13 -7 q-8 4 -12 -2 q-4 -7 4 -11 q4 -2 7 -6z" fill="#f2977e"/>
  <path d="M42 22 q-16 -2 -20 12 q-3 12 8 14 q10 2 13 -7 q-8 4 -12 -2 q-4 -7 4 -11 q4 -2 7 -6z" fill="url(#ico-depth)"/>
  <path d="M42 22 q4 -3 6 -1 M42 24 q5 0 6 3" stroke="#d97a5f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M27 30 q6 2 10 0 M25 37 q6 3 11 1" stroke="#e07f63" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  ${face(33, 30, .72)}`);

ICONS.mote = _svg(bowl('#f2e9d2', { extra: `
  <circle cx="26" cy="28" r="3.2" fill="#fdf8ec"/><circle cx="34" cy="27" r="3.2" fill="#fdf8ec"/>
  <circle cx="40" cy="31" r="3" fill="#f0e5cc"/><circle cx="30" cy="32" r="3" fill="#f7efdc"/>` }));

ICONS.tostado = _svg(bowl('#e0b45c', { extra: `
  <circle cx="26" cy="28" r="2.6" fill="#f2cd80"/><circle cx="33" cy="27" r="2.6" fill="#f2cd80"/>
  <circle cx="39" cy="30" r="2.4" fill="#d8a648"/><circle cx="29" cy="32" r="2.4" fill="#e8bd6a"/>` }));

/* ============ Preparaciones nuevas ============ */

ICONS.cebolla_picada  = _svg(bowl('#f0e6f2', { extra: `<path d="M24 28 h5 M32 27 h5 M28 32 h6" stroke="#c9a8cf" stroke-width="2" stroke-linecap="round"/>` }));
ICONS.tomate_picado   = _svg(bowl('#e2554a', { extra: `<rect x="24" y="26" width="5" height="4" rx="1" fill="#ef7368"/><rect x="33" y="28" width="5" height="4" rx="1" fill="#ef7368"/>` }));
ICONS.jugo_limon      = _svg(bowl('#eef2b8', { extra: `<ellipse cx="32" cy="29" rx="12" ry="4" fill="#f5f8cf"/>` }));
ICONS.yuca_pelada     = _svg(`${face(32, 34, .9)}<path d="M20 24 q12 -6 24 4 q-10 16 -22 12 q-6 -8 -2 -16z" fill="#f3ece0" opacity="0"/>
  <ellipse cx="33" cy="52" rx="14" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M18 30 q14 -12 28 -2 q-6 18 -20 18 q-10 -4 -8 -16z" fill="#f6f0e4"/>
  <path d="M18 30 q14 -12 28 -2 q-6 18 -20 18 q-10 -4 -8 -16z" fill="url(#ico-depth)"/>
  ${face(31, 34, .85)}`);
ICONS.yuca_frita      = _svg(`<ellipse cx="33" cy="52" rx="15" ry="3" fill="#3a2c18" opacity=".16"/>
  <g fill="#e8c078" stroke="${INKL}" stroke-width="1.3">
    <rect x="18" y="34" width="26" height="7" rx="3" transform="rotate(-12 31 37)"/>
    <rect x="20" y="40" width="26" height="7" rx="3" transform="rotate(7 33 43)"/>
  </g>${face(32, 38, .78)}`);
ICONS.maduro_pelado   = _svg(`<ellipse cx="33" cy="52" rx="13" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M20 24 q-3 14 5 21 q10 7 19 -2 q-11 1 -16 -7 q-5 -7 -3 -13z" fill="#f6cf72"/>
  <path d="M20 24 q-3 14 5 21 q10 7 19 -2 q-11 1 -16 -7 q-5 -7 -3 -13z" fill="url(#ico-depth)"/>
  ${face(30, 35, .8)}`);
ICONS.maduro_frito    = _svg(`<ellipse cx="33" cy="52" rx="15" ry="3" fill="#3a2c18" opacity=".16"/>
  <g fill="#e0a03c" stroke="${INKL}" stroke-width="1.4">
    <ellipse cx="26" cy="38" rx="9" ry="6" transform="rotate(-14 26 38)"/>
    <ellipse cx="39" cy="41" rx="9" ry="6" transform="rotate(10 39 41)"/>
  </g>${face(32, 38, .75)}`);
ICONS.mani_molido     = _svg(bowl('#d9b47c', { extra: `<ellipse cx="32" cy="28" rx="13" ry="4.5" fill="#e5c495"/>` }));
ICONS.arroz_cocido    = _svg(bowl('#fbf6ea', { steamOn: true, extra: `<ellipse cx="30" cy="28" rx="4" ry="2" fill="#fff"/><ellipse cx="38" cy="30" rx="4" ry="2" fill="#fff"/>` }));
ICONS.camaron_cocido  = _svg(bowl('#f5a58c', { steamOn: true, extra: `<path d="M25 29 q4 -4 8 0 q4 4 8 0" stroke="#e07f63" stroke-width="2.2" fill="none" stroke-linecap="round"/>` }));
ICONS.sofrito         = _svg(bowl('#e08a5c', { extra: `<circle cx="27" cy="28" r="2.2" fill="#f0e6f2"/><circle cx="36" cy="29" r="2.2" fill="#e2554a"/><circle cx="32" cy="31" r="2" fill="#7cb85e"/>` }));
ICONS.refrito         = _svg(bowl('#d4783f', { steamOn: true, extra: `<circle cx="28" cy="28" r="2.2" fill="#f2cd80"/><circle cx="37" cy="30" r="2.2" fill="#c94f3a"/>` }));
ICONS.patacon_crudo   = _svg(`<ellipse cx="33" cy="52" rx="15" ry="3" fill="#3a2c18" opacity=".16"/>
  <ellipse cx="32" cy="38" rx="17" ry="11" fill="#c8d69a"/>
  <ellipse cx="32" cy="38" rx="17" ry="11" fill="url(#ico-depth)"/>
  <ellipse cx="32" cy="38" rx="17" ry="11" fill="none" stroke="${INKL}" stroke-width="1.5"/>${face(32, 38, .85)}`);
ICONS.masa_corviche   = _svg(ball('#b7a878', `<circle cx="26" cy="30" r="1.8" fill="#9c8d60"/><circle cx="38" cy="33" r="1.8" fill="#9c8d60"/>`));
ICONS.corviche_crudo  = _svg(ball('#a8b877', `<ellipse cx="32" cy="30" rx="7" ry="3" fill="#93a7c4"/>`));
ICONS.ceviche_base    = _svg(bowl('#f7c9b0', { extra: `<ellipse cx="32" cy="28" rx="12" ry="4" fill="#fadfcb"/><circle cx="28" cy="29" r="2" fill="#f2977e"/>` }));
ICONS.mote_con_huevo  = _svg(bowl('#f5e3b8', { extra: `<circle cx="28" cy="28" r="3" fill="#fdf8ec"/><ellipse cx="37" cy="29" rx="4" ry="2.6" fill="#f2b84e"/>` }));
ICONS.chochos_cebolla = _svg(bowl('#e9e2c8', { extra: `<circle cx="27" cy="28" r="2.8" fill="#f7f2e0"/><circle cx="35" cy="27" r="2.8" fill="#f7f2e0"/><path d="M30 32 h7" stroke="#c9a8cf" stroke-width="2" stroke-linecap="round"/>` }));
ICONS.base_locro      = _svg(bowl('#f2dc9b', { steamOn: true, extra: `<ellipse cx="32" cy="28" rx="12" ry="4" fill="#f7e8b8"/>` }));
ICONS.tostado_dorado  = _svg(bowl('#d59a3c', { extra: `<circle cx="27" cy="28" r="2.6" fill="#eab863"/><circle cx="35" cy="29" r="2.6" fill="#eab863"/>` }));

/* ============ Platillos nuevos ============ */

ICONS.patacon = _svg(`${steam(32, 13)}
  <ellipse cx="33" cy="52" rx="16" ry="3.2" fill="#3a2c18" opacity=".16"/>
  <ellipse cx="32" cy="38" rx="18" ry="12" fill="#dfa856"/>
  <ellipse cx="32" cy="38" rx="18" ry="12" fill="url(#ico-depth)"/>
  <ellipse cx="26" cy="34" rx="5" ry="3" fill="#efc684" opacity=".7"/>
  <ellipse cx="32" cy="38" rx="18" ry="12" fill="none" stroke="${INKL}" stroke-width="1.6"/>${face(32, 38, .9)}`);
ICONS.corviche = _svg(`${steam(32, 12)}${ball('#c2a86a', `<path d="M24 40 q8 4 16 0" stroke="#a58e55" stroke-width="1.8" fill="none" stroke-linecap="round"/>`)}`);
ICONS.ceviche = _svg(bowl('url(#g-caldo)', { steamOn: false, extra: `
  <ellipse cx="32" cy="28" rx="14" ry="5" fill="#f7b9a0"/>
  <circle cx="27" cy="28" r="2.4" fill="#f2977e"/><circle cx="36" cy="29" r="2.4" fill="#f2977e"/>
  <circle cx="32" cy="31" r="2" fill="#e2554a"/><path d="M22 26 q4 -2 7 0" stroke="#f0e6f2" stroke-width="2" fill="none" stroke-linecap="round"/>` }));
ICONS.arroz_marinero = _svg(bowl('#f6efdd', { steamOn: true, extra: `
  <circle cx="27" cy="28" r="2.6" fill="#f2977e"/><circle cx="36" cy="29" r="2.6" fill="#f2977e"/>
  <path d="M30 32 q3 -2 6 0" stroke="#7cb85e" stroke-width="1.8" fill="none" stroke-linecap="round"/>` }));
ICONS.maduro_con_queso = _svg(`${steam(32, 13)}
  <ellipse cx="33" cy="52" rx="15" ry="3" fill="#3a2c18" opacity=".16"/>
  <g fill="#e0a03c" stroke="${INKL}" stroke-width="1.4">
    <ellipse cx="27" cy="40" rx="10" ry="6.5" transform="rotate(-12 27 40)"/>
    <ellipse cx="39" cy="42" rx="10" ry="6.5" transform="rotate(9 39 42)"/>
  </g>
  <path d="M22 34 q10 -6 20 -1 q-4 6 -10 5 q-7 -1 -10 -4z" fill="#fdf6e0" stroke="${INKL}" stroke-width="1.3"/>
  ${face(32, 40, .78)}`);
ICONS.locro = _svg(bowl('#f5d97e', { steamOn: true, extra: `
  <ellipse cx="32" cy="28" rx="13" ry="4.5" fill="#f9e6a8"/>
  <path d="M25 27 q4 -3 8 0" stroke="#fdf6e0" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <circle cx="38" cy="30" r="2.2" fill="#a8c98a"/>` }));
ICONS.mote_pillo = _svg(bowl('#f7e6bc', { steamOn: true, extra: `
  <circle cx="27" cy="28" r="3.2" fill="#fdf8ec"/><circle cx="35" cy="27" r="3.2" fill="#fdf8ec"/>
  <ellipse cx="32" cy="31" rx="6" ry="3" fill="#f2b84e"/>` }));
ICONS.ceviche_chochos = _svg(bowl('#eee7cf', { extra: `
  <circle cx="26" cy="28" r="3" fill="#f9f4e4"/><circle cx="34" cy="27" r="3" fill="#f9f4e4"/>
  <circle cx="39" cy="31" r="2.4" fill="#e0b45c"/><circle cx="30" cy="32" r="2.2" fill="#e2554a"/>` }));
ICONS.papas_con_queso = _svg(`${steam(32, 13)}
  <ellipse cx="33" cy="52" rx="15" ry="3" fill="#3a2c18" opacity=".16"/>
  <ellipse cx="26" cy="40" rx="10" ry="8" fill="#e3cf9f"/>
  <ellipse cx="39" cy="42" rx="9" ry="7" fill="#e8d6a8"/>
  <path d="M20 34 q12 -7 23 -1 q-5 6 -12 5 q-8 -1 -11 -4z" fill="#fdf6e0" stroke="${INKL}" stroke-width="1.3"/>
  ${face(31, 40, .8)}`);


/* ============ El Oriente ============ */

ICONS.tilapia = _svg(`
  <ellipse cx="33" cy="52" rx="15" ry="3" fill="#3a2c18" opacity=".16"/>
  <ellipse cx="34" cy="35" rx="18" ry="11" fill="#8fa9a2"/>
  <ellipse cx="34" cy="35" rx="18" ry="11" fill="url(#ico-depth)"/>
  <path d="M16 35 L6 27 Q4 35 6 43 Z" fill="#7d968f"/>
  <path d="M32 24 Q36 19 42 24" fill="#7d968f"/>
  <circle cx="43" cy="32" r="2.1" fill="${INK}"/>
  <circle cx="43.8" cy="31.3" r=".7" fill="#fff"/>
  <path d="M24 33 q4 3 0 6 M31 32 q4 4 0 7" stroke="#6f8880" stroke-width="1.5" fill="none" stroke-linecap="round"/>`);

ICONS.palmito = _svg(`
  <ellipse cx="33" cy="52" rx="12" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M26 50 q-2 -26 6 -34 q8 8 6 34z" fill="#f6f2e2"/>
  <path d="M26 50 q-2 -26 6 -34 q8 8 6 34z" fill="url(#ico-depth)"/>
  <path d="M30 44 v-24 M34 44 v-24" stroke="#e4dcc4" stroke-width="1.4" stroke-linecap="round"/>
  ${face(32, 38, .82)}`);

ICONS.bijao = _svg(`
  <ellipse cx="33" cy="52" rx="14" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M32 50 q-18 -8 -16 -24 q16 -4 16 10 q0 -14 16 -10 q2 16 -16 24z" fill="#5f9c52"/>
  <path d="M32 50 q-18 -8 -16 -24 q16 -4 16 10 q0 -14 16 -10 q2 16 -16 24z" fill="url(#ico-depth)"/>
  <path d="M32 50 V22" stroke="#3f7436" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M32 30 l-9 -4 M32 36 l-9 -3 M32 30 l9 -4 M32 36 l9 -3" stroke="#4c8843" stroke-width="1.3" stroke-linecap="round"/>`);

ICONS.guayusa = _svg(`
  <ellipse cx="33" cy="52" rx="13" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M32 50 V26" stroke="#4f7c3a" stroke-width="2.4" stroke-linecap="round"/>
  <ellipse cx="23" cy="30" rx="9" ry="5" transform="rotate(-28 23 30)" fill="#6ba84f"/>
  <ellipse cx="41" cy="28" rx="9" ry="5" transform="rotate(24 41 28)" fill="#7cb85e"/>
  <ellipse cx="25" cy="40" rx="8" ry="4.4" transform="rotate(-18 25 40)" fill="#5f9c46"/>
  <ellipse cx="39" cy="39" rx="8" ry="4.4" transform="rotate(16 39 39)" fill="#6ba84f"/>
  ${face(32, 27, .68)}`);

ICONS.chontaduro = _svg(ball('#e2732f', `
  <path d="M32 16 q-3 -3 -6 -2 q2 3 6 3 q4 0 6 -3 q-3 -1 -6 2z" fill="#7c9c4a"/>`));

ICONS.parrilla = _svg(`
  <ellipse cx="33" cy="52" rx="19" ry="3.4" fill="#3a2c18" opacity=".18"/>
  <path d="M12 40 h40 v4 q0 6 -8 6 H20 q-8 0 -8 -6z" fill="#5a5158"/>
  <g stroke="#8a8088" stroke-width="2.6" stroke-linecap="round">
    <path d="M14 36 h36"/><path d="M14 31 h36"/><path d="M14 26 h36"/>
  </g>
  <g stroke="#e2732f" stroke-width="2" stroke-linecap="round" opacity=".85">
    <path d="M22 44 q-2 -4 1 -6"/><path d="M32 45 q-2 -4 1 -6"/><path d="M42 44 q-2 -4 1 -6"/>
  </g>`);

/* preparaciones del Oriente */
ICONS.tilapia_limpia   = _svg(bowl('#dfe6ee', { extra: `<path d="M24 28 q8 -3 15 1" stroke="#c2ccd6" stroke-width="2.4" fill="none" stroke-linecap="round"/>` }));
ICONS.maito_envuelto   = _svg(`
  <ellipse cx="33" cy="52" rx="16" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M14 34 q18 -10 36 0 q-4 14 -18 14 q-14 0 -18 -14z" fill="#5f9c52"/>
  <path d="M14 34 q18 -10 36 0 q-4 14 -18 14 q-14 0 -18 -14z" fill="url(#ico-depth)"/>
  <path d="M22 32 q10 16 20 0" stroke="#3f7436" stroke-width="1.8" fill="none"/>
  <path d="M20 30 h24" stroke="#e0b45c" stroke-width="2.4" stroke-linecap="round"/>
  ${face(32, 40, .8)}`);
ICONS.palmito_picado   = _svg(bowl('#f6f2e2', { extra: `<rect x="25" y="27" width="4" height="4" rx="1" fill="#fdfbf2"/><rect x="33" y="28" width="4" height="4" rx="1" fill="#fdfbf2"/>` }));
ICONS.mezcla_ayampaco  = _svg(bowl('#eeeacc', { extra: `<ellipse cx="32" cy="28" rx="11" ry="4" fill="#f7f2d8"/><circle cx="36" cy="30" r="2.2" fill="#f2b84e"/>` }));
ICONS.ayampaco_envuelto = _svg(`
  <ellipse cx="33" cy="52" rx="15" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M16 32 q16 -12 32 0 q-2 16 -16 16 q-14 0 -16 -16z" fill="#6ba85c"/>
  <path d="M16 32 q16 -12 32 0 q-2 16 -16 16 q-14 0 -16 -16z" fill="url(#ico-depth)"/>
  <path d="M32 20 v28" stroke="#4c8843" stroke-width="1.8"/>
  ${face(32, 38, .78)}`);
ICONS.masa_yuca        = _svg(ball('#f2ece0'));
ICONS.chontaduro_cocido = _svg(bowl('#e08a4a', { steamOn: true, extra: `<circle cx="27" cy="28" r="3.4" fill="#ea9a5c"/><circle cx="36" cy="29" r="3.4" fill="#ea9a5c"/>` }));

/* platillos del Oriente */
ICONS.maito = _svg(`${steam(32, 12)}
  <ellipse cx="33" cy="52" rx="17" ry="3.2" fill="#3a2c18" opacity=".16"/>
  <path d="M12 36 q20 -12 40 0 q-5 14 -20 14 q-15 0 -20 -14z" fill="#5f9c52"/>
  <path d="M18 34 q14 -6 28 0 q-4 -10 -14 -10 q-10 0 -14 10z" fill="#8fa9a2"/>
  <path d="M20 33 q12 -5 24 0" stroke="#7d968f" stroke-width="1.6" fill="none"/>
  ${face(32, 41, .82)}`);
ICONS.ayampaco = _svg(`${steam(32, 12)}
  <ellipse cx="33" cy="52" rx="16" ry="3.2" fill="#3a2c18" opacity=".16"/>
  <path d="M14 34 q18 -12 36 0 q-3 15 -18 15 q-15 0 -18 -15z" fill="#6ba85c"/>
  <path d="M22 32 q10 -6 20 0 q-3 -8 -10 -8 q-7 0 -10 8z" fill="#f2dfae"/>
  ${face(32, 40, .82)}`);
ICONS.chicha_yuca = _svg(`${steam(32, 13)}
  <ellipse cx="33" cy="53" rx="13" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M21 24 h22 l-3 24 q-1 4 -8 4 q-7 0 -8 -4z" fill="#f2ece0"/>
  <path d="M21 24 h22 l-3 24 q-1 4 -8 4 q-7 0 -8 -4z" fill="url(#ico-depth)"/>
  <ellipse cx="32" cy="25" rx="11" ry="3.4" fill="#fdfbf4"/>
  ${face(32, 38, .82)}`);
ICONS.chontaduro_asado = _svg(`${steam(32, 12)}${ball('#d9682a', `
  <path d="M22 32 q10 5 20 0" stroke="#a84f1c" stroke-width="1.8" fill="none" stroke-linecap="round"/>`)}`);
ICONS.guayusa_hervida = _svg(`${steam(32, 11)}
  <ellipse cx="33" cy="53" rx="13" ry="3" fill="#3a2c18" opacity=".16"/>
  <path d="M18 30 h26 l-3 18 q-1 4 -10 4 q-9 0 -10 -4z" fill="#f7f2e6"/>
  <ellipse cx="31" cy="31" rx="12.5" ry="4" fill="#7c6a3c"/>
  <path d="M44 34 q7 1 6 6 q-1 5 -7 4" fill="none" stroke="#f7f2e6" stroke-width="2.6"/>
  ${face(31, 40, .8)}`);

/* iconos de pestañas */
ICONS.tab_libros = _svg(`
  <rect x="12" y="14" width="12" height="38" rx="3" fill="#9dbd8a"/>
  <rect x="26" y="10" width="12" height="42" rx="3" fill="#d9a0b0"/>
  <rect x="40" y="17" width="12" height="35" rx="3" fill="#93a7c4"/>`);
ICONS.tab_cocina = ICONS.olla;
ICONS.tab_mercado = _svg(`
  <path d="M14 26 H50 L46 50 Q45 54 40 54 H24 Q19 54 18 50 Z" fill="#c9a06c"/>
  <path d="M22 26 Q22 12 32 12 Q42 12 42 26" fill="none" stroke="#8a6240" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M22 34 H42 M24 42 H40" stroke="#b08a5f" stroke-width="2.4" stroke-linecap="round"/>`);

/* API pública */
function iconOf(id) {
  return ICONS[id] || ICONS.mezcla_rara;
}
