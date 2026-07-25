/* ============================================================
   PAMBAMESA — cuaderno de viaje de sabores
   recetario.js — CONTENIDO en datos + adapter a cartas de álbum.

   GAME_DATA es JSON puro (heredado de Huecas: ingredientes, recetas
   con pasos "a + b → resultado", pistas y notas). El motor no sabe
   nada de bolones: buildCartario() traduce ese contenido a un
   registro de CARTAS coleccionables (semilla/hallazgo/receta) y una
   tabla de RECETAS de fusión (Little Alchemy). Agregar una receta
   nueva es trabajo de contenido aquí, no de reingeniería.
   ============================================================ */

const GAME_DATA = {
  "moneda": { "simbolo": "S/", "inicial": 2000 },

  "acciones": {
    "pelar":     { "utensilio": "cuchillo" },
    "cocer":     { "utensilio": "olla" },
    "majar":     { "utensilio": "pilon" },
    "freir":     { "utensilio": "sarten" },
    "rellenar":  { "utensilio": null },
    "revolver":  { "utensilio": null },
    "fundir":    { "utensilio": null },
    "montar":    { "utensilio": null },
    "acompanar": { "utensilio": null }
  },

  "utensilios_de_la_abuela": ["cuchillo", "olla", "pilon", "sarten"],

  "ingredientes": [
    { "id": "verde", "nombre": "Plátano verde", "estado_inicial": "boceto", "costo_mercado": 300,
      "nota": "Macho y firme. En la costa, el día empieza aquí." },
    { "id": "queso", "nombre": "Queso fresco",  "estado_inicial": "boceto", "costo_mercado": 400,
      "nota": "De mesa, blanco y salado." },
    { "id": "huevo", "nombre": "Huevo",         "estado_inicial": "boceto", "costo_mercado": 200,
      "nota": "De campo, yema naranja." },
    { "id": "cerdo", "nombre": "Carne de cerdo", "estado_inicial": "boceto", "costo_mercado": 500,
      "nota": "Con su grasita, para el chicharrón. Casi te olvidas de comprarla." }
  ],

  "recetas": [
    {
      "id": "bolon_verde",
      "plato": "bolon",
      "nombre": "Bolón de verde",
      "desbloqueada_por_default": true,
      "precio_venta": 1500,
      "ciudad": "Guayaquil",
      "acento": "#9dbd8a",
      "intro": "La primera página del cuaderno. La letra tiembla un poquito, pero el dibujo del bolón está coloreado con cariño.",
      "ingredientes": [
        { "id": "verde", "cantidad": 2 },
        { "id": "queso", "cantidad": 1 }
      ],
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
      "desbloqueada_por_default": false,
      "precio_venta": 2500,
      "ciudad": "Guayaquil",
      "acento": "#e0a45c",
      "intro": "Una página con manchas de manteca. El mixto de verdad: la misma bola de verde, pero con queso Y chicharrón adentro. Así lo pedían los de confianza.",
      "ingredientes": [
        { "id": "verde", "cantidad": 2 },
        { "id": "queso", "cantidad": 1 },
        { "id": "cerdo", "cantidad": 1 }
      ],
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
      "desbloqueada_por_default": false,
      "precio_venta": 2000,
      "ciudad": "Zaruma",
      "acento": "#c99a5b",
      "intro": "La misma masa del bolón, dice la letra chiquita, pero despeinada con huevo. Un plato de Zaruma que la abuela aprendió de una comadre orense.",
      "ingredientes": [
        { "id": "verde", "cantidad": 2 },
        { "id": "queso", "cantidad": 1 },
        { "id": "huevo", "cantidad": 1 }
      ],
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
    }
  ],

  "resultados": [
    { "id": "verde_pelado",      "nombre": "Verde pelado",       "tipo": "prep" },
    { "id": "verde_cocido",      "nombre": "Verde cocido",       "tipo": "prep" },
    { "id": "masa_verde",        "nombre": "Masa de verde",      "tipo": "prep" },
    { "id": "bolon_crudo",       "nombre": "Bolón crudo",        "tipo": "prep" },
    { "id": "chicharron",        "nombre": "Chicharrón",         "tipo": "prep" },
    { "id": "masa_mixta",        "nombre": "Masa con chicharrón","tipo": "prep" },
    { "id": "bolon_mixto_crudo", "nombre": "Mixto crudo",        "tipo": "prep" },
    { "id": "tigrillo_base",     "nombre": "Verde con huevo",    "tipo": "prep" }
  ],

  "tecnicas_nuevas": [
    { "id": "cocer",     "nombre": "Cocer",     "nota": "El agua hace la mitad del trabajo." },
    { "id": "rellenar",  "nombre": "Rellenar",  "nota": "Esconder lo mejor adentro." },
    { "id": "fundir",    "nombre": "Fundir",    "nota": "Que lo blanco se pierda en lo tibio." }
  ]
};

/* ============================================================
   ADAPTER — traduce GAME_DATA a cartas + fórmulas de fusión.
   Corre después de icons.js y antes de app.js.

   CARTAS[id]      → { id, name, rarity, lore, city?, accent? }
   RECETAS         → [{ a, b, result, verbo, pista }]  (Little Alchemy)
   CARTA_ORDEN     → orden de exhibición en el álbum
   UTENSILIOS      → herramientas fijas (no son cartas, no se coleccionan)
   ============================================================ */
const CARTAS = {};
const RECETAS = [];
const CARTA_ORDEN = [];
const UTENSILIOS = [
  { id: 'cuchillo', name: 'Cuchillo' },
  { id: 'olla',     name: 'Olla' },
  { id: 'pilon',    name: 'Pilón' },
  { id: 'sarten',   name: 'Sartén' },
];
const isUtensilio = (id) => UTENSILIOS.some(u => u.id === id);

/* durabilidad: cuántos usos aguanta cada herramienta antes de gastarse
   (se consigue una nueva o se "afila" abriendo otro sobre) */
const DURABILIDAD_HERRAMIENTA = { cuchillo: 6, olla: 8, pilon: 8, sarten: 8 };

function buildCartario() {
  /* lore de cada hallazgo = la instrucción real del paso que lo produce */
  const loreDeResultado = {};
  GAME_DATA.recetas.forEach(r => r.pasos.forEach(p => { loreDeResultado[p.resultado] = p.receta_real; }));

  /* semillas: siempre en tu colección desde el día uno */
  GAME_DATA.ingredientes.forEach(i => {
    CARTAS[i.id] = { id: i.id, name: i.nombre, rarity: 'semilla', lore: i.nota };
    CARTA_ORDEN.push(i.id);
  });
  /* hallazgos: preparaciones intermedias, se descubren combinando */
  GAME_DATA.resultados.forEach(r => {
    CARTAS[r.id] = { id: r.id, name: r.nombre, rarity: 'hallazgo', lore: loreDeResultado[r.id] || '' };
    CARTA_ORDEN.push(r.id);
  });
  /* recetas: el plato terminado, la pieza más rara del álbum */
  GAME_DATA.recetas.forEach(r => {
    CARTAS[r.plato] = {
      id: r.plato, name: r.nombre, rarity: 'receta',
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
                  masa_mixta: 'masa_bolon', bolon_mixto_crudo: 'masa_bolon' };
  Object.entries(alias).forEach(([id, src]) => { if (!ICONS[id] && ICONS[src]) ICONS[id] = ICONS[src]; });
}
buildCartario();
