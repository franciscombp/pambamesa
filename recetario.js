/* ============================================================
   PAMBAMESA — la cocina de los sabores por descubrir
   recetario.js — CONTENIDO en datos + adapter a cartas de álbum.

   GAME_DATA es JSON puro (heredado de Huecas: ingredientes, recetas
   con pasos "a + b → resultado", pistas y notas), organizado por
   REGIONES — cada una es su propia colección grande, con su propio
   clima de utensilios y semillas. El motor no sabe nada de bolones
   ni de llapingachos: buildCartario() traduce ese contenido a un
   registro de CARTAS coleccionables (semilla/hallazgo/receta) y una
   tabla de RECETAS de fusión (Little Alchemy). Agregar una región o
   una receta nueva es trabajo de contenido aquí, no de reingeniería.
   ============================================================ */

const GAME_DATA = {
  "moneda": { "simbolo": "S/", "inicial": 2000 },

  "acciones": {
    "pelar":     { "utensilio": "cuchillo" },
    "cocer":     { "utensilio": "olla" },
    "majar":     { "utensilio": "pilon" },
    "freir":     { "utensilio": "sarten" },
    "moler":     { "utensilio": "molino" },
    "rellenar":  { "utensilio": null },
    "revolver":  { "utensilio": null },
    "fundir":    { "utensilio": null },
    "envolver":  { "utensilio": null },
    "montar":    { "utensilio": null },
    "acompanar": { "utensilio": null }
  },

  "regiones": [
    { "id": "costa", "nombre": "La Costa", "tagline": "verde, queso y madrugada", "acento": "#8fae7e" },
    { "id": "sierra", "nombre": "La Sierra", "tagline": "papa, choclo y páramo", "acento": "#c9a06c",
      "desbloqueo_recetas": ["bolon", "bolon_mixto", "tigrillo"],
      "extra_semillas": [{ "id": "queso", "n": 2 }] },
    { "id": "oriente", "nombre": "El Oriente", "tagline": "muy pronto en tu recetario…", "acento": "#6f9160",
      "proximamente": true }
  ],

  "utensilios": [
    { "id": "cuchillo", "nombre": "Cuchillo", "region": "costa",  "durabilidad": 6 },
    { "id": "olla",     "nombre": "Olla",     "region": "costa",  "durabilidad": 8 },
    { "id": "pilon",    "nombre": "Pilón",    "region": "costa",  "durabilidad": 8 },
    { "id": "sarten",   "nombre": "Sartén",   "region": "costa",  "durabilidad": 8 },
    { "id": "molino",   "nombre": "Molino",   "region": "sierra", "durabilidad": 6 }
  ],

  "ingredientes": [
    { "id": "verde", "nombre": "Plátano verde", "region": "costa", "cantidad_inicial": 3,
      "nota": "Macho y firme. En la costa, el día empieza aquí." },
    { "id": "queso", "nombre": "Queso fresco",  "region": "costa", "cantidad_inicial": 2,
      "nota": "De mesa, blanco y salado. Viaja bien de región en región." },
    { "id": "huevo", "nombre": "Huevo",         "region": "costa", "cantidad_inicial": 1,
      "nota": "De campo, yema naranja." },
    { "id": "cerdo", "nombre": "Carne de cerdo", "region": "costa", "cantidad_inicial": 1,
      "nota": "Con su grasita, para el chicharrón. Casi te olvidas de comprarla." },
    { "id": "papa", "nombre": "Papa",  "region": "sierra", "cantidad_inicial": 3,
      "nota": "De páramo. Más variedades que apellidos en la familia." },
    { "id": "maiz", "nombre": "Choclo", "region": "sierra", "cantidad_inicial": 3,
      "nota": "Tierno y lechoso, recién cortado. Se acaba la temporada rápido." },
    { "id": "hoja", "nombre": "Hoja de choclo", "region": "sierra", "cantidad_inicial": 2,
      "nota": "Guarda el vapor y el secreto de adentro." }
  ],

  "recetas": [
    {
      "id": "bolon_verde",
      "plato": "bolon",
      "nombre": "Bolón de verde",
      "region": "costa",
      "precio_venta": 1500,
      "ciudad": "Guayaquil",
      "acento": "#9dbd8a",
      "intro": "La primera página del cuaderno. La letra tiembla un poquito, pero el dibujo del bolón está coloreado con cariño.",
      "pasos": [
        { "orden": 1, "accion": "pelar", "ingrediente_objetivo": "verde",
          "acertijo": "La cáscara se va, el fruto se queda.",
          "resultado": "verde_pelado",
          "receta_real": "1. Pela 2 plátanos verdes con cuchillo y córtalos en trozos. Truco de la abuela: úntate las manos con una gota de aceite, que el verde mancha." },
        { "orden": 2, "accion": "cocer", "ingrediente_objetivo": "verde_pelado",
          "acertijo": "Al agua entra duro, sale blando.",
          "resultado": "verde_cocido",
          "receta_real": "2. Cocina los trozos en agua con sal unos 15 minutos, hasta que el tenedor entre sin pelear." },
        { "orden": 3, "accion": "majar", "ingrediente_objetivo": "verde_cocido",
          "acertijo": "Con fuerza y paciencia se vuelve masa.",
          "resultado": "masa_verde",
          "receta_real": "3. Aún caliente, májalo en el pilón con una pizca de sal hasta formar una masa suave. (Guarda este secreto: es también la base del tigrillo.)" },
        { "orden": 4, "accion": "rellenar", "ingrediente_objetivo": "masa_verde", "ingrediente_secundario": "queso",
          "acertijo": "El corazón blanco se esconde en el centro.",
          "resultado": "bolon_crudo",
          "receta_real": "4. Forma bolas del tamaño de un puño y esconde queso fresco desmenuzado en el centro de cada una." },
        { "orden": 5, "accion": "freir", "ingrediente_objetivo": "bolon_crudo",
          "acertijo": "El calor dora lo que el agua no pudo.",
          "resultado": "bolon",
          "receta_real": "5. Dóralas en la sartén con poco aceite, girándolas hasta que la costra cruja. Se sirve caliente, sin esperar a nadie." }
      ],
      "tarjeta": {
        "texto_cultural": "El bolón de verde es uno de los desayunos más queridos de la costa ecuatoriana: plátano verde majado con queso o chicharrón, hecho bola y dorado. Se come recién hecho, con café pasado, antes de que el día empiece a correr."
      }
    },

    {
      "id": "bolon_mixto",
      "plato": "bolon_mixto",
      "nombre": "Bolón mixto",
      "region": "costa",
      "precio_venta": 2500,
      "ciudad": "Guayaquil",
      "acento": "#e0a45c",
      "intro": "Una página con manchas de manteca. El mixto de verdad: la misma bola de verde, pero con queso Y chicharrón adentro. Así lo pedían los de confianza.",
      "pasos": [
        { "orden": 1, "accion": "freir", "ingrediente_objetivo": "cerdo",
          "acertijo": "Canta en su propia grasa hasta volverse crocante.",
          "resultado": "chicharron",
          "receta_real": "1. Troza la carne de cerdo y dórala en la sartén en su propia grasa, sin apuro, hasta que el chicharrón cante y quede crocante." },
        { "orden": 2, "accion": "rellenar", "ingrediente_objetivo": "masa_verde", "ingrediente_secundario": "chicharron",
          "acertijo": "La masa esconde ahora un secreto que cruje.",
          "resultado": "masa_mixta",
          "receta_real": "2. Desmenuza el chicharrón y mézclalo con la masa de verde majado, repartiéndolo bien." },
        { "orden": 3, "accion": "rellenar", "ingrediente_objetivo": "masa_mixta", "ingrediente_secundario": "queso",
          "acertijo": "Y el corazón blanco se suma a la fiesta.",
          "resultado": "bolon_mixto_crudo",
          "receta_real": "3. Forma las bolas y esconde queso fresco en el centro: mixto es eso — queso y chicharrón en la misma bola." },
        { "orden": 4, "accion": "freir", "ingrediente_objetivo": "bolon_mixto_crudo",
          "acertijo": "El calor sella el pacto de los dos corazones.",
          "resultado": "bolon_mixto",
          "receta_real": "4. Dóralas en la sartén girándolas hasta que la costra cruja. Se sirve que queme la mano, decía la abuela." }
      ],
      "tarjeta": {
        "texto_cultural": "El bolón “mixto” de las huecas costeñas lleva los dos rellenos a la vez: queso fresco y chicharrón. Es el favorito de los que madrugan con hambre de verdad — choferes, comerciantes, estibadores — y se paga con gusto porque llena hasta el almuerzo."
      }
    },

    {
      "id": "tigrillo",
      "plato": "tigrillo",
      "nombre": "Tigrillo",
      "region": "costa",
      "precio_venta": 2000,
      "ciudad": "Zaruma",
      "acento": "#c99a5b",
      "intro": "La misma masa del bolón, dice la letra chiquita, pero despeinada con huevo. Un plato de Zaruma que la abuela aprendió de una comadre orense.",
      "pasos": [
        { "orden": 1, "accion": "revolver", "ingrediente_objetivo": "masa_verde", "ingrediente_secundario": "huevo",
          "acertijo": "La masa se despeina y abraza al sol batido.",
          "resultado": "tigrillo_base",
          "receta_real": "1. En la sartén, revuelve la masa de verde majado con huevo a fuego bajo, hasta que cuaje y se despeine." },
        { "orden": 2, "accion": "fundir", "ingrediente_objetivo": "tigrillo_base", "ingrediente_secundario": "queso",
          "acertijo": "Lo blanco se pierde en la montaña tibia.",
          "resultado": "tigrillo",
          "receta_real": "2. Añade queso fresco en trozos y mezcla hasta que se funda. Sírvelo alto, humeante, con café si hay." }
      ],
      "tarjeta": {
        "texto_cultural": "El tigrillo nació en Zaruma, en la provincia de El Oro: verde majado revuelto con huevo y queso. Comparte la base con el bolón, pero es otro carácter — desordenado, tibio y contundente. Quien lo prueba bien hecho, vuelve."
      }
    },

    {
      "id": "llapingacho",
      "plato": "llapingacho",
      "nombre": "Llapingacho",
      "region": "sierra",
      "precio_venta": 2200,
      "ciudad": "Ambato",
      "acento": "#c9a06c",
      "intro": "Una página con olor a páramo. Tortilla de papa rellena de queso, dorada en plancha — la letra dice que se aprendió de un fondín de Ambato.",
      "pasos": [
        { "orden": 1, "accion": "cocer", "ingrediente_objetivo": "papa",
          "acertijo": "Entra dura y sale mansa, lista para que la aplasten.",
          "resultado": "papa_cocida",
          "receta_real": "1. Cocina las papas peladas en agua con sal hasta que se deshagan al pincharlas, unos 20 minutos." },
        { "orden": 2, "accion": "majar", "ingrediente_objetivo": "papa_cocida",
          "acertijo": "El puré se vuelve masa bajo el peso del pilón.",
          "resultado": "masa_llapingacho",
          "receta_real": "2. Aún calientes, májalas en el pilón con sal y achiote si hay, hasta formar una masa lisa y amarilla." },
        { "orden": 3, "accion": "rellenar", "ingrediente_objetivo": "masa_llapingacho", "ingrediente_secundario": "queso",
          "acertijo": "El queso se esconde en el corazón de la tortilla.",
          "resultado": "llapingacho_relleno",
          "receta_real": "3. Forma tortillas y esconde queso fresco desmenuzado en el centro de cada una." },
        { "orden": 4, "accion": "freir", "ingrediente_objetivo": "llapingacho_relleno",
          "acertijo": "La plancha dora los dos lados, sin apuro.",
          "resultado": "llapingacho",
          "receta_real": "4. Dóralas en la sartén o plancha con poco aceite, volteando hasta que los dos lados crujan doraditos." }
      ],
      "tarjeta": {
        "texto_cultural": "El llapingacho es la tortilla de papa rellena de queso más querida de la sierra ecuatoriana, dorada en plancha y servida con chorizo, huevo frito, aguacate y curtido de cebolla. Ambato lo hizo suyo, pero se come de norte a sur."
      }
    },

    {
      "id": "humita",
      "plato": "humita",
      "nombre": "Humita",
      "region": "sierra",
      "precio_venta": 1800,
      "ciudad": "Latacunga",
      "acento": "#e0b45c",
      "intro": "Manchas de choclo en la letra. Se cocina en tandas grandes, entre varias manos, dice la abuela — un ritual de cada cosecha.",
      "pasos": [
        { "orden": 1, "accion": "moler", "ingrediente_objetivo": "maiz",
          "acertijo": "El grano tierno se rinde vuelta a vuelta en la piedra.",
          "resultado": "maiz_preparado",
          "receta_real": "1. Muele los choclos tiernos en el molino hasta obtener una masa húmeda y dulce." },
        { "orden": 2, "accion": "rellenar", "ingrediente_objetivo": "maiz_preparado", "ingrediente_secundario": "queso",
          "acertijo": "Lo dulce del choclo se casa con lo salado del queso.",
          "resultado": "mezcla_humita",
          "receta_real": "2. Mezcla la masa de choclo con queso fresco desmenuzado, un poco de manteca y una pizca de sal." },
        { "orden": 3, "accion": "envolver", "ingrediente_objetivo": "mezcla_humita", "ingrediente_secundario": "hoja",
          "acertijo": "La hoja abraza el secreto y lo cierra bien.",
          "resultado": "humita_envuelta",
          "receta_real": "3. Envuelve porciones de la mezcla en hojas de choclo, doblando las puntas como un tamal." },
        { "orden": 4, "accion": "cocer", "ingrediente_objetivo": "humita_envuelta",
          "acertijo": "El vapor termina lo que la piedra empezó.",
          "resultado": "humita",
          "receta_real": "4. Cocina las humitas al vapor en la olla durante 45 minutos, hasta que la hoja se despegue sola." }
      ],
      "tarjeta": {
        "texto_cultural": "La humita es choclo tierno molido, mezclado con queso y cocido al vapor envuelto en su propia hoja. Se hacen en tandas grandes, entre varias manos, y se comen recién sacadas de la olla, quemando los dedos."
      }
    }
  ],

  "resultados": [
    { "id": "verde_pelado",      "nombre": "Verde pelado",        "tipo": "prep" },
    { "id": "verde_cocido",      "nombre": "Verde cocido",        "tipo": "prep" },
    { "id": "masa_verde",        "nombre": "Masa de verde",       "tipo": "prep" },
    { "id": "bolon_crudo",       "nombre": "Bolón crudo",         "tipo": "prep" },
    { "id": "chicharron",        "nombre": "Chicharrón",          "tipo": "prep" },
    { "id": "masa_mixta",        "nombre": "Masa con chicharrón", "tipo": "prep" },
    { "id": "bolon_mixto_crudo", "nombre": "Mixto crudo",         "tipo": "prep" },
    { "id": "tigrillo_base",     "nombre": "Verde con huevo",     "tipo": "prep" },
    { "id": "papa_cocida",       "nombre": "Papa cocida",         "tipo": "prep" },
    { "id": "masa_llapingacho",  "nombre": "Masa de llapingacho", "tipo": "prep" },
    { "id": "llapingacho_relleno","nombre": "Llapingacho crudo",  "tipo": "prep" },
    { "id": "maiz_preparado",    "nombre": "Choclo molido",       "tipo": "prep" },
    { "id": "mezcla_humita",     "nombre": "Mezcla de humita",    "tipo": "prep" },
    { "id": "humita_envuelta",   "nombre": "Humita envuelta",     "tipo": "prep" }
  ]
};

/* ============================================================
   ADAPTER — traduce GAME_DATA a cartas + fórmulas de fusión.
   Corre después de icons.js y antes de app.js.

   CARTAS[id]      → { id, name, rarity, region, lore, city?, accent? }
   RECETAS         → [{ a, b, result, verbo, pista }]  (Little Alchemy)
   CARTA_ORDEN     → orden de exhibición en el álbum
   REGIONES[id]    → { id, nombre, tagline, acento, desbloqueo_recetas?, proximamente? }
   REGION_ORDEN    → orden de las regiones en el álbum
   UTENSILIOS      → herramientas (no son cartas, no se coleccionan; tienen región y durabilidad)
   ============================================================ */
const CARTAS = {};
const RECETAS = [];
const CARTA_ORDEN = [];
const REGIONES = {};
const REGION_ORDEN = [];
const UTENSILIOS = [];
const DURABILIDAD_HERRAMIENTA = {};

const isUtensilio = (id) => UTENSILIOS.some(u => u.id === id);

function buildCartario() {
  GAME_DATA.regiones.forEach(r => {
    REGIONES[r.id] = { id: r.id, nombre: r.nombre, tagline: r.tagline, acento: r.acento,
      desbloqueo_recetas: r.desbloqueo_recetas || null, proximamente: !!r.proximamente,
      kitHerramientas: [], kitSemillas: [] };
    REGION_ORDEN.push(r.id);
  });

  GAME_DATA.utensilios.forEach(u => {
    UTENSILIOS.push({ id: u.id, name: u.nombre, region: u.region });
    DURABILIDAD_HERRAMIENTA[u.id] = u.durabilidad;
    if (REGIONES[u.region]) REGIONES[u.region].kitHerramientas.push(u.id);
  });

  /* lore de cada hallazgo = la instrucción real del paso que lo produce;
     región de cada hallazgo = la región de la receta que lo produce */
  const loreDeResultado = {};
  const regionDeResultado = {};
  GAME_DATA.recetas.forEach(r => r.pasos.forEach(p => {
    loreDeResultado[p.resultado] = p.receta_real;
    regionDeResultado[p.resultado] = r.region;
  }));

  /* semillas: siempre en tu colección de esa región desde que la abres */
  GAME_DATA.ingredientes.forEach(i => {
    CARTAS[i.id] = { id: i.id, name: i.nombre, rarity: 'semilla', region: i.region, lore: i.nota };
    CARTA_ORDEN.push(i.id);
    if (REGIONES[i.region]) REGIONES[i.region].kitSemillas.push({ id: i.id, n: i.cantidad_inicial || 2 });
  });
  /* refuerzos de otra región (p. ej. la Sierra te repone queso al abrirse) */
  GAME_DATA.regiones.forEach(r => {
    (r.extra_semillas || []).forEach(x => REGIONES[r.id].kitSemillas.push(x));
  });
  /* hallazgos: preparaciones intermedias, se descubren combinando */
  GAME_DATA.resultados.forEach(r => {
    CARTAS[r.id] = { id: r.id, name: r.nombre, rarity: 'hallazgo', region: regionDeResultado[r.id], lore: loreDeResultado[r.id] || '' };
    CARTA_ORDEN.push(r.id);
  });
  /* recetas: el plato terminado, la pieza más rara del álbum */
  GAME_DATA.recetas.forEach(r => {
    CARTAS[r.plato] = {
      id: r.plato, name: r.nombre, rarity: 'receta', region: r.region,
      city: r.ciudad, accent: r.acento,
      lore: (r.tarjeta && r.tarjeta.texto_cultural) || r.intro,
    };
    CARTA_ORDEN.push(r.plato);

    /* cada paso es una fórmula de fusión: a + (b o utensilio) → resultado */
    r.pasos.forEach(p => {
      const util = GAME_DATA.acciones[p.accion] && GAME_DATA.acciones[p.accion].utensilio;
      RECETAS.push({
        a: p.ingrediente_objetivo,
        b: p.ingrediente_secundario || util,
        result: p.resultado,
        verbo: p.accion,
        pista: p.acertijo,
      });
    });
  });

  /* alias de iconos para los ids nuevos (comparten dibujo con uno existente) */
  const alias = { masa_verde: 'verde_majado', bolon_crudo: 'masa_bolon',
                  masa_mixta: 'masa_bolon', bolon_mixto_crudo: 'masa_bolon',
                  llapingacho_relleno: 'masa_llapingacho' };
  Object.entries(alias).forEach(([id, src]) => { if (!ICONS[id] && ICONS[src]) ICONS[id] = ICONS[src]; });
}
buildCartario();
