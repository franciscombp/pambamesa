/* ============================================================
   PAMBAMESA — recetario.js
   CONTENIDO en datos + adapter a cartas.

   GAME_DATA es JSON puro, organizado por REGIONES. El motor no
   sabe nada de bolones ni de humitas: buildCartario() lo traduce
   a un registro de CARTAS y una tabla de fusión (RECETAS).

   REGLA DE ORO DEL CONTENIDO: cada pareja (a + b) aparece UNA
   sola vez en todo el archivo. Si dos platos comparten un paso
   (la masa de verde sirve para el bolón, el tigrillo y el
   corviche), ese paso lo define UN solo plato y los demás lo
   toman como ingrediente de entrada.

   Los utensilios son ESTACIONES del mesón: no se gastan y no
   ocupan sitio en la canasta.
   ============================================================ */

const GAME_DATA = {
  "moneda": { "simbolo": "S/", "inicial": 2000 },

  "acciones": {
    "picar":     { "utensilio": "cuchillo" },
    "pelar":     { "utensilio": "cuchillo" },
    "limpiar":   { "utensilio": "cuchillo" },
    "exprimir":  { "utensilio": "cuchillo" },
    "cocer":     { "utensilio": "olla" },
    "majar":     { "utensilio": "pilon" },
    "freir":     { "utensilio": "sarten" },
    "dorar":     { "utensilio": "sarten" },
    "moler":     { "utensilio": "molino" },
    "rellenar":  { "utensilio": null },
    "revolver":  { "utensilio": null },
    "fundir":    { "utensilio": null },
    "envolver":  { "utensilio": null },
    "curtir":    { "utensilio": null },
    "mezclar":   { "utensilio": null },
    "montar":    { "utensilio": null },
    "acompanar": { "utensilio": null }
  },

  "regiones": [
    { "id": "costa", "nombre": "La Costa", "tagline": "verde, mar y madrugada", "acento": "#12a9a0" },
    { "id": "sierra", "nombre": "La Sierra", "tagline": "papa, choclo y páramo", "acento": "#e01b6a",
      "desbloqueo_recetas": ["bolon", "tigrillo", "patacon"],
      "extra_semillas": [{ "id": "queso", "n": 2 }] },
    { "id": "oriente", "nombre": "El Oriente", "tagline": "muy pronto en tu cocina…", "acento": "#6fae2e",
      "proximamente": true }
  ],

  "utensilios": [
    { "id": "cuchillo", "nombre": "Tabla y cuchillo", "region": "costa",  "verbo": "Picar" },
    { "id": "olla",     "nombre": "Olla",             "region": "costa",  "verbo": "Cocinar" },
    { "id": "sarten",   "nombre": "Sartén",           "region": "costa",  "verbo": "Freír" },
    { "id": "pilon",    "nombre": "Pilón",            "region": "costa",  "verbo": "Majar" },
    { "id": "molino",   "nombre": "Molino",           "region": "sierra", "verbo": "Moler" }
  ],

  "ingredientes": [
    { "id": "verde",   "nombre": "Plátano verde", "region": "costa", "cantidad_inicial": 4,
      "nota": "Macho y firme. En la costa, el día empieza aquí." },
    { "id": "queso",   "nombre": "Queso fresco",  "region": "costa", "cantidad_inicial": 4,
      "nota": "De mesa, blanco y salado. Viaja bien de región en región." },
    { "id": "huevo",   "nombre": "Huevo",         "region": "costa", "cantidad_inicial": 3,
      "nota": "De campo, yema naranja." },
    { "id": "cerdo",   "nombre": "Carne de cerdo", "region": "costa", "cantidad_inicial": 2,
      "nota": "Con su grasita, para el chicharrón." },
    { "id": "cebolla", "nombre": "Cebolla paiteña", "region": "costa", "cantidad_inicial": 3,
      "nota": "Morada y brava. Sin ella no hay curtido ni refrito." },
    { "id": "tomate",  "nombre": "Tomate",        "region": "costa", "cantidad_inicial": 3,
      "nota": "Maduro, de los que manchan la tabla." },
    { "id": "limon",   "nombre": "Limón",         "region": "costa", "cantidad_inicial": 3,
      "nota": "Chiquito y ácido. Despierta cualquier plato." },
    { "id": "pescado", "nombre": "Albacora",      "region": "costa", "cantidad_inicial": 2,
      "nota": "Del muelle, fresquísima. La base del encebollado." },
    { "id": "camaron", "nombre": "Camarón",       "region": "costa", "cantidad_inicial": 2,
      "nota": "De la poza, todavía saltando." },
    { "id": "yuca",    "nombre": "Yuca",          "region": "costa", "cantidad_inicial": 3,
      "nota": "Áspera por fuera, mantequilla por dentro." },
    { "id": "maduro",  "nombre": "Plátano maduro", "region": "costa", "cantidad_inicial": 3,
      "nota": "Negrito de tan maduro: así es como debe estar." },
    { "id": "mani",    "nombre": "Maní",          "region": "costa", "cantidad_inicial": 2,
      "nota": "Tostado. Molido espesa todo lo que toca." },
    { "id": "arroz",   "nombre": "Arroz",         "region": "costa", "cantidad_inicial": 3,
      "nota": "Grano largo. En la costa acompaña absolutamente todo." },

    { "id": "papa",    "nombre": "Papa",          "region": "sierra", "cantidad_inicial": 4,
      "nota": "De páramo. Más variedades que apellidos en la familia." },
    { "id": "maiz",    "nombre": "Choclo",        "region": "sierra", "cantidad_inicial": 3,
      "nota": "Tierno y lechoso, recién cortado." },
    { "id": "hoja",    "nombre": "Hoja de choclo", "region": "sierra", "cantidad_inicial": 3,
      "nota": "Guarda el vapor y el secreto de adentro." },
    { "id": "leche",   "nombre": "Leche",         "region": "sierra", "cantidad_inicial": 3,
      "nota": "Recién ordeñada, con su nata encima." },
    { "id": "mote",    "nombre": "Mote",          "region": "sierra", "cantidad_inicial": 3,
      "nota": "Maíz pelado y cocido. El pan de la sierra." },
    { "id": "chochos", "nombre": "Chochos",       "region": "sierra", "cantidad_inicial": 3,
      "nota": "Desamargados en agua de vertiente por días." },
    { "id": "tostado", "nombre": "Maíz tostado",  "region": "sierra", "cantidad_inicial": 3,
      "nota": "Cruje entre los dientes. Nunca falta en la mesa." }
  ],

  "recetas": [
    /* ===================== LA COSTA ===================== */
    {
      "id": "bolon_verde", "plato": "bolon", "nombre": "Bolón de verde",
      "region": "costa", "precio_venta": 1500, "ciudad": "Guayaquil", "acento": "#8cc63f",
      "intro": "La primera página. La letra tiembla un poquito, pero el dibujo del bolón está coloreado con cariño.",
      "pasos": [
        { "orden": 1, "accion": "pelar", "ingrediente_objetivo": "verde",
          "acertijo": "La cáscara se va, el fruto se queda.",
          "resultado": "verde_pelado",
          "receta_real": "Pela los plátanos verdes y córtalos en trozos. Truco de la abuela: úntate las manos con aceite, que el verde mancha." },
        { "orden": 2, "accion": "cocer", "ingrediente_objetivo": "verde_pelado",
          "acertijo": "Al agua entra duro, sale blando.",
          "resultado": "verde_cocido",
          "receta_real": "Cocina los trozos en agua con sal unos 15 minutos, hasta que el tenedor entre sin pelear." },
        { "orden": 3, "accion": "majar", "ingrediente_objetivo": "verde_cocido",
          "acertijo": "Con fuerza y paciencia se vuelve masa.",
          "resultado": "masa_verde",
          "receta_real": "Aún caliente, májalo en el pilón con una pizca de sal hasta formar una masa suave. (Guarda este secreto: es la base de medio recetario.)" },
        { "orden": 4, "accion": "rellenar", "ingrediente_objetivo": "masa_verde", "ingrediente_secundario": "queso",
          "acertijo": "El corazón blanco se esconde en el centro.",
          "resultado": "bolon_crudo",
          "receta_real": "Forma bolas del tamaño de un puño y esconde queso fresco desmenuzado en el centro." },
        { "orden": 5, "accion": "freir", "ingrediente_objetivo": "bolon_crudo",
          "acertijo": "El calor dora lo que el agua no pudo.",
          "resultado": "bolon",
          "receta_real": "Dóralas en la sartén con poco aceite hasta que la costra cruja. Se sirve caliente, sin esperar a nadie." }
      ],
      "tarjeta": { "texto_cultural": "El bolón de verde es uno de los desayunos más queridos de la costa ecuatoriana: plátano verde majado con queso o chicharrón, hecho bola y dorado. Se come recién hecho, con café pasado, antes de que el día empiece a correr." }
    },
    {
      "id": "bolon_mixto_r", "plato": "bolon_mixto", "nombre": "Bolón mixto",
      "region": "costa", "precio_venta": 2500, "ciudad": "Guayaquil", "acento": "#f5a623",
      "intro": "Una página con manchas de manteca. El mixto de verdad: queso Y chicharrón adentro.",
      "pasos": [
        { "orden": 1, "accion": "freir", "ingrediente_objetivo": "cerdo",
          "acertijo": "Canta en su propia grasa hasta volverse crocante.",
          "resultado": "chicharron",
          "receta_real": "Troza la carne de cerdo y dórala en la sartén en su propia grasa, sin apuro, hasta que el chicharrón cante." },
        { "orden": 2, "accion": "mezclar", "ingrediente_objetivo": "masa_verde", "ingrediente_secundario": "chicharron",
          "acertijo": "La masa esconde ahora un secreto que cruje.",
          "resultado": "masa_mixta",
          "receta_real": "Desmenuza el chicharrón y mézclalo con la masa de verde majado, repartiéndolo bien." },
        { "orden": 3, "accion": "rellenar", "ingrediente_objetivo": "masa_mixta", "ingrediente_secundario": "queso",
          "acertijo": "Y el corazón blanco se suma a la fiesta.",
          "resultado": "bolon_mixto_crudo",
          "receta_real": "Forma las bolas y esconde queso fresco en el centro: mixto es eso — queso y chicharrón en la misma bola." },
        { "orden": 4, "accion": "freir", "ingrediente_objetivo": "bolon_mixto_crudo",
          "acertijo": "El calor sella el pacto de los dos corazones.",
          "resultado": "bolon_mixto",
          "receta_real": "Dóralas girándolas hasta que la costra cruja. Se sirve que queme la mano, decía la abuela." }
      ],
      "tarjeta": { "texto_cultural": "El bolón “mixto” lleva los dos rellenos a la vez: queso fresco y chicharrón. Es el favorito de los que madrugan con hambre de verdad — choferes, comerciantes, estibadores — y llena hasta el almuerzo." }
    },
    {
      "id": "tigrillo_r", "plato": "tigrillo", "nombre": "Tigrillo",
      "region": "costa", "precio_venta": 2000, "ciudad": "Zaruma", "acento": "#f5a623",
      "intro": "La misma masa del bolón, pero despeinada con huevo. Un plato de Zaruma.",
      "pasos": [
        { "orden": 1, "accion": "revolver", "ingrediente_objetivo": "masa_verde", "ingrediente_secundario": "huevo",
          "acertijo": "La masa se despeina y abraza al sol batido.",
          "resultado": "tigrillo_base",
          "receta_real": "En la sartén, revuelve la masa de verde majado con huevo a fuego bajo, hasta que cuaje y se despeine." },
        { "orden": 2, "accion": "fundir", "ingrediente_objetivo": "tigrillo_base", "ingrediente_secundario": "queso",
          "acertijo": "Lo blanco se pierde en la montaña tibia.",
          "resultado": "tigrillo",
          "receta_real": "Añade queso fresco en trozos y mezcla hasta que se funda. Sírvelo alto, humeante, con café si hay." }
      ],
      "tarjeta": { "texto_cultural": "El tigrillo nació en Zaruma, en El Oro: verde majado revuelto con huevo y queso. Comparte la base con el bolón, pero es otro carácter — desordenado, tibio y contundente." }
    },
    {
      "id": "patacon_r", "plato": "patacon", "nombre": "Patacones",
      "region": "costa", "precio_venta": 1200, "ciudad": "Esmeraldas", "acento": "#f5a623",
      "intro": "Dos veces al aceite: la primera lo cocina, la segunda lo vuelve crocante.",
      "pasos": [
        { "orden": 1, "accion": "freir", "ingrediente_objetivo": "verde_pelado",
          "acertijo": "Entra crudo al aceite y sale rubio, pero aún no está listo.",
          "resultado": "verde_frito",
          "receta_real": "Fríe las rodajas gruesas de verde a fuego medio hasta que doren apenas, sin dejar que se tuesten." },
        { "orden": 2, "accion": "majar", "ingrediente_objetivo": "verde_frito",
          "acertijo": "Un golpe seco lo deja plano como moneda.",
          "resultado": "patacon_crudo",
          "receta_real": "Aplasta cada rodaja con el pilón (o con una piedra plana) hasta dejarla como una tortilla gruesa." },
        { "orden": 3, "accion": "freir", "ingrediente_objetivo": "patacon_crudo",
          "acertijo": "Vuelve al aceite y ahora sí cruje.",
          "resultado": "patacon",
          "receta_real": "Devuélvelos al aceite caliente hasta que queden dorados y crujientes. Sal al salir y a comer con salsa de ajo." }
      ],
      "tarjeta": { "texto_cultural": "El patacón es verde frito dos veces: una para cocinarlo y otra para hacerlo crujir. Acompaña casi todo en la costa — del encebollado al pescado frito — y en Esmeraldas se come hasta solo, con ají." }
    },
    {
      "id": "corviche_r", "plato": "corviche", "nombre": "Corviche",
      "region": "costa", "precio_venta": 2200, "ciudad": "Manta", "acento": "#b4632c",
      "intro": "Manabí en un bocado: verde con maní por fuera, pescado por dentro.",
      "pasos": [
        { "orden": 1, "accion": "moler", "ingrediente_objetivo": "mani",
          "acertijo": "La piedra lo vuelve pasta y perfume.",
          "resultado": "mani_molido",
          "receta_real": "Muele el maní tostado hasta obtener una pasta espesa y aceitosa." },
        { "orden": 2, "accion": "mezclar", "ingrediente_objetivo": "masa_verde", "ingrediente_secundario": "mani_molido",
          "acertijo": "La masa se vuelve morena y perfumada.",
          "resultado": "masa_corviche",
          "receta_real": "Amasa el verde majado con la pasta de maní hasta que la masa quede suave y aromática." },
        { "orden": 3, "accion": "limpiar", "ingrediente_objetivo": "pescado",
          "acertijo": "Se le quitan las espinas y queda solo lo bueno.",
          "resultado": "pescado_limpio",
          "receta_real": "Limpia el pescado, quítale espinas y piel, y desmenúzalo." },
        { "orden": 4, "accion": "rellenar", "ingrediente_objetivo": "masa_corviche", "ingrediente_secundario": "pescado_limpio",
          "acertijo": "El mar se esconde dentro de la tierra.",
          "resultado": "corviche_crudo",
          "receta_real": "Forma bolas alargadas y rellénalas con el pescado guisado. Ciérralas bien para que no se escapen." },
        { "orden": 5, "accion": "freir", "ingrediente_objetivo": "corviche_crudo",
          "acertijo": "El aceite le pone la coraza.",
          "resultado": "corviche",
          "receta_real": "Fríelos hasta que queden dorados y firmes. Se comen calientes, con café negro." }
      ],
      "tarjeta": { "texto_cultural": "El corviche es de Manabí, tierra del maní: masa de verde con maní molido, rellena de pescado y frita. Se vende en carretillas al filo de la carretera y se come de pie, quemándose los dedos." }
    },
    {
      "id": "encebollado_r", "plato": "encebollado", "nombre": "Encebollado",
      "region": "costa", "precio_venta": 3000, "ciudad": "Guayaquil", "acento": "#12a9a0",
      "intro": "El plato nacional del día siguiente. Caldo, yuca y mucho curtido encima.",
      "pasos": [
        { "orden": 1, "accion": "cocer", "ingrediente_objetivo": "pescado_limpio",
          "acertijo": "El mar se vuelve caldo.",
          "resultado": "caldo_pescado",
          "receta_real": "Cocina la albacora con cebolla, tomate, comino y yuca en trozos hasta que el caldo tome cuerpo." },
        { "orden": 2, "accion": "pelar", "ingrediente_objetivo": "yuca",
          "acertijo": "Áspera afuera, mantequilla adentro.",
          "resultado": "yuca_pelada",
          "receta_real": "Pela la yuca y córtala en trozos grandes, quitándole la fibra del centro." },
        { "orden": 3, "accion": "cocer", "ingrediente_objetivo": "yuca_pelada",
          "acertijo": "Hierve hasta rendirse.",
          "resultado": "yuca_cocida",
          "receta_real": "Cocina la yuca en agua con sal hasta que se abra sola." },
        { "orden": 4, "accion": "montar", "ingrediente_objetivo": "caldo_pescado", "ingrediente_secundario": "yuca_cocida",
          "acertijo": "Lo blando se acuesta en el caldo.",
          "resultado": "base_encebollado",
          "receta_real": "Junta la yuca cocida con el caldo y el pescado desmenuzado. Déjalo reposar unos minutos." },
        { "orden": 5, "accion": "picar", "ingrediente_objetivo": "cebolla",
          "acertijo": "Hace llorar antes de alegrar.",
          "resultado": "cebolla_picada",
          "receta_real": "Corta la cebolla paiteña en plumas finas y lávala con sal para quitarle lo bravo." },
        { "orden": 6, "accion": "exprimir", "ingrediente_objetivo": "limon",
          "acertijo": "Se le saca el alma a la fruta.",
          "resultado": "jugo_limon",
          "receta_real": "Exprime los limones sin apretar la cáscara, que amarga." },
        { "orden": 7, "accion": "curtir", "ingrediente_objetivo": "cebolla_picada", "ingrediente_secundario": "jugo_limon",
          "acertijo": "El ácido la amansa y la vuelve rosada.",
          "resultado": "curtido",
          "receta_real": "Deja la cebolla en el jugo de limón con sal y cilantro picado hasta que se ponga rosada y suave." },
        { "orden": 8, "accion": "montar", "ingrediente_objetivo": "base_encebollado", "ingrediente_secundario": "curtido",
          "acertijo": "La corona rosada lo termina.",
          "resultado": "encebollado",
          "receta_real": "Sirve el caldo con la yuca y corona con bastante curtido. Chifles al lado y ají al gusto." }
      ],
      "tarjeta": { "texto_cultural": "El encebollado es, para muchos, el plato nacional del Ecuador: caldo de albacora con yuca y curtido de cebolla. Se come a cualquier hora, pero tiene fama de resucitar a los que amanecieron mal." }
    },
    {
      "id": "ceviche_r", "plato": "ceviche", "nombre": "Ceviche de camarón",
      "region": "costa", "precio_venta": 3200, "ciudad": "Playas", "acento": "#ce2029",
      "intro": "Frío, ácido y con tostado al lado. El almuerzo de la playa.",
      "pasos": [
        { "orden": 1, "accion": "cocer", "ingrediente_objetivo": "camaron",
          "acertijo": "Del gris pasa al rosado en un suspiro.",
          "resultado": "camaron_cocido",
          "receta_real": "Cocina los camarones apenas dos minutos en agua con sal: si se pasan, se ponen de goma. Guarda el agua." },
        { "orden": 2, "accion": "curtir", "ingrediente_objetivo": "camaron_cocido", "ingrediente_secundario": "jugo_limon",
          "acertijo": "El ácido lo abraza y lo perfuma.",
          "resultado": "ceviche_base",
          "receta_real": "Baña los camarones en jugo de limón con sal y déjalos tomar el ácido unos minutos." },
        { "orden": 3, "accion": "picar", "ingrediente_objetivo": "tomate",
          "acertijo": "Rojo por fuera, agua por dentro.",
          "resultado": "tomate_picado",
          "receta_real": "Pica el tomate en cubos pequeños, sin las semillas si quieres el ceviche menos aguado." },
        { "orden": 4, "accion": "mezclar", "ingrediente_objetivo": "ceviche_base", "ingrediente_secundario": "tomate_picado",
          "acertijo": "Lo rojo y lo rosado se hacen uno.",
          "resultado": "ceviche",
          "receta_real": "Mezcla con tomate, cebolla curtida, cilantro y un chorrito de aceite. Sírvelo bien frío con tostado y chifles." }
      ],
      "tarjeta": { "texto_cultural": "El ceviche ecuatoriano de camarón se sirve con su jugo, más parecido a una sopa fría que al ceviche seco de otros países. Se acompaña siempre de tostado, chifles o canguil." }
    },
    {
      "id": "arroz_marinero_r", "plato": "arroz_marinero", "nombre": "Arroz marinero",
      "region": "costa", "precio_venta": 3500, "ciudad": "Manta", "acento": "#f5a623",
      "intro": "Todo lo que dio el mar ese día, encima del arroz.",
      "pasos": [
        { "orden": 1, "accion": "cocer", "ingrediente_objetivo": "arroz",
          "acertijo": "Se hincha en silencio hasta que el agua se acaba.",
          "resultado": "arroz_cocido",
          "receta_real": "Cocina el arroz con un diente de ajo y sal, a fuego bajo y tapado, hasta que se seque." },
        { "orden": 2, "accion": "mezclar", "ingrediente_objetivo": "arroz_cocido", "ingrediente_secundario": "camaron_cocido",
          "acertijo": "El grano se pinta con el mar.",
          "resultado": "arroz_marinero",
          "receta_real": "Saltea el arroz con los camarones, refrito y un poco del agua de cocción. Cilantro al final." }
      ],
      "tarjeta": { "texto_cultural": "El arroz marinero se hace con lo que trajo la pesca del día. En los comedores del puerto se sirve en plato hondo, con maduro frito al lado y limón para exprimir encima." }
    },
    {
      "id": "maduro_queso_r", "plato": "maduro_con_queso", "nombre": "Maduro con queso",
      "region": "costa", "precio_venta": 1000, "ciudad": "Machala", "acento": "#f5a623",
      "intro": "Lo dulce y lo salado, la merienda más fácil y más querida.",
      "pasos": [
        { "orden": 1, "accion": "pelar", "ingrediente_objetivo": "maduro",
          "acertijo": "Negro por fuera, oro por dentro.",
          "resultado": "maduro_pelado",
          "receta_real": "Pela el maduro — mientras más negra la cáscara, más dulce está — y córtalo a lo largo." },
        { "orden": 2, "accion": "freir", "ingrediente_objetivo": "maduro_pelado",
          "acertijo": "El azúcar se vuelve caramelo en la sartén.",
          "resultado": "maduro_frito",
          "receta_real": "Fríelo a fuego medio hasta que los bordes se caramelicen y queden oscuritos." },
        { "orden": 3, "accion": "fundir", "ingrediente_objetivo": "maduro_frito", "ingrediente_secundario": "queso",
          "acertijo": "Lo dulce y lo salado por fin se encuentran.",
          "resultado": "maduro_con_queso",
          "receta_real": "Pon el queso encima del maduro caliente y tápalo un minuto para que se funda." }
      ],
      "tarjeta": { "texto_cultural": "Maduro con queso es la merienda de después del colegio en media costa ecuatoriana: plátano maduro frito o al horno con queso derretido encima. Dulce y salado a la vez, y listo en cinco minutos." }
    },

    /* ===================== LA SIERRA ===================== */
    {
      "id": "llapingacho_r", "plato": "llapingacho", "nombre": "Llapingacho",
      "region": "sierra", "precio_venta": 2200, "ciudad": "Ambato", "acento": "#f5a623",
      "intro": "Tortilla de papa rellena de queso, dorada en plancha.",
      "pasos": [
        { "orden": 1, "accion": "cocer", "ingrediente_objetivo": "papa",
          "acertijo": "Entra dura y sale mansa, lista para que la aplasten.",
          "resultado": "papa_cocida",
          "receta_real": "Cocina las papas peladas en agua con sal hasta que se deshagan al pincharlas." },
        { "orden": 2, "accion": "majar", "ingrediente_objetivo": "papa_cocida",
          "acertijo": "El puré se vuelve masa bajo el peso del pilón.",
          "resultado": "masa_llapingacho",
          "receta_real": "Aún calientes, májalas con sal y achiote hasta formar una masa lisa y amarilla." },
        { "orden": 3, "accion": "rellenar", "ingrediente_objetivo": "masa_llapingacho", "ingrediente_secundario": "queso",
          "acertijo": "El queso se esconde en el corazón de la tortilla.",
          "resultado": "llapingacho_relleno",
          "receta_real": "Forma tortillas y esconde queso fresco desmenuzado en el centro de cada una." },
        { "orden": 4, "accion": "freir", "ingrediente_objetivo": "llapingacho_relleno",
          "acertijo": "La plancha dora los dos lados, sin apuro.",
          "resultado": "llapingacho",
          "receta_real": "Dóralas en plancha con poco aceite, volteando hasta que los dos lados crujan." }
      ],
      "tarjeta": { "texto_cultural": "El llapingacho es la tortilla de papa rellena de queso más querida de la sierra, dorada en plancha y servida con chorizo, huevo frito, aguacate y curtido. Ambato lo hizo suyo, pero se come de norte a sur." }
    },
    {
      "id": "locro_r", "plato": "locro", "nombre": "Locro de papa",
      "region": "sierra", "precio_venta": 2400, "ciudad": "Quito", "acento": "#f5a623",
      "intro": "La sopa que se hace cuando hace frío, que en la sierra es siempre.",
      "pasos": [
        { "orden": 1, "accion": "mezclar", "ingrediente_objetivo": "papa_cocida", "ingrediente_secundario": "leche",
          "acertijo": "Lo espeso se vuelve suave y blanco.",
          "resultado": "base_locro",
          "receta_real": "Deshaz parte de las papas en su propia agua y añade la leche, moviendo para que no se corte." },
        { "orden": 2, "accion": "fundir", "ingrediente_objetivo": "base_locro", "ingrediente_secundario": "queso",
          "acertijo": "Lo blanco se derrite en lo blanco.",
          "resultado": "locro",
          "receta_real": "Añade el queso en cubos y apaga el fuego para que se funda sin hervir. Aguacate encima al servir." }
      ],
      "tarjeta": { "texto_cultural": "El locro de papa es la sopa de casa de la sierra ecuatoriana: papa deshecha en leche, con queso fundido y aguacate encima. Cada familia jura que la suya es la buena." }
    },
    {
      "id": "papas_queso_r", "plato": "papas_con_queso", "nombre": "Papas con queso",
      "region": "sierra", "precio_venta": 900, "ciudad": "Cuenca", "acento": "#8cc63f",
      "intro": "Lo más simple del recetario, y aun así nadie deja el plato.",
      "pasos": [
        { "orden": 1, "accion": "fundir", "ingrediente_objetivo": "papa_cocida", "ingrediente_secundario": "queso",
          "acertijo": "Dos cosas humildes que juntas valen doble.",
          "resultado": "papas_con_queso",
          "receta_real": "Sirve las papas calientes partidas por la mitad con queso encima, sal gruesa y un poco de ají." }
      ],
      "tarjeta": { "texto_cultural": "Papas cocidas con queso: la comida de las ferias y los caminos de la sierra. Se venden en fundita, calientes, con ají de piedra encima." }
    },
    {
      "id": "humita_r", "plato": "humita", "nombre": "Humita",
      "region": "sierra", "precio_venta": 1800, "ciudad": "Latacunga", "acento": "#f5a623",
      "intro": "Se cocina en tandas grandes, entre varias manos — un ritual de cada cosecha.",
      "pasos": [
        { "orden": 1, "accion": "moler", "ingrediente_objetivo": "maiz",
          "acertijo": "El grano tierno se rinde vuelta a vuelta en la piedra.",
          "resultado": "maiz_preparado",
          "receta_real": "Muele los choclos tiernos hasta obtener una masa húmeda y dulce." },
        { "orden": 2, "accion": "mezclar", "ingrediente_objetivo": "maiz_preparado", "ingrediente_secundario": "queso",
          "acertijo": "Lo dulce del choclo se casa con lo salado del queso.",
          "resultado": "mezcla_humita",
          "receta_real": "Mezcla la masa de choclo con queso desmenuzado, manteca y una pizca de sal." },
        { "orden": 3, "accion": "envolver", "ingrediente_objetivo": "mezcla_humita", "ingrediente_secundario": "hoja",
          "acertijo": "La hoja abraza el secreto y lo cierra bien.",
          "resultado": "humita_envuelta",
          "receta_real": "Envuelve porciones en hojas de choclo, doblando las puntas como un tamal." },
        { "orden": 4, "accion": "cocer", "ingrediente_objetivo": "humita_envuelta",
          "acertijo": "El vapor termina lo que la piedra empezó.",
          "resultado": "humita",
          "receta_real": "Cocínalas al vapor 45 minutos, hasta que la hoja se despegue sola." }
      ],
      "tarjeta": { "texto_cultural": "La humita es choclo tierno molido, mezclado con queso y cocido al vapor en su propia hoja. Se hacen en tandas grandes, entre varias manos, y se comen recién sacadas de la olla." }
    },
    {
      "id": "mote_pillo_r", "plato": "mote_pillo", "nombre": "Mote pillo",
      "region": "sierra", "precio_venta": 1600, "ciudad": "Cuenca", "acento": "#f5a623",
      "intro": "Cuenca en un plato: mote revuelto con huevo, leche y mucha cebolla.",
      "pasos": [
        { "orden": 1, "accion": "revolver", "ingrediente_objetivo": "mote", "ingrediente_secundario": "huevo",
          "acertijo": "El grano se enreda con el sol batido.",
          "resultado": "mote_con_huevo",
          "receta_real": "Saltea el mote en refrito y añade el huevo batido, moviendo hasta que cuaje envolviendo cada grano." },
        { "orden": 2, "accion": "mezclar", "ingrediente_objetivo": "mote_con_huevo", "ingrediente_secundario": "leche",
          "acertijo": "Un chorro blanco lo vuelve cremoso.",
          "resultado": "mote_pillo",
          "receta_real": "Añade un chorro de leche y deja que se absorba a fuego bajo. Cilantro picado al final." }
      ],
      "tarjeta": { "texto_cultural": "El mote pillo es de Cuenca: mote cocido salteado con huevo, leche y cebolla. Se come en el desayuno con café de olla, y en el almuerzo acompañando carne." }
    },
    {
      "id": "ceviche_chochos_r", "plato": "ceviche_chochos", "nombre": "Ceviche de chochos",
      "region": "sierra", "precio_venta": 1400, "ciudad": "Ambato", "acento": "#12a9a0",
      "intro": "El ceviche de la sierra, sin mar: chochos, tomate y mucho tostado.",
      "pasos": [
        { "orden": 1, "accion": "mezclar", "ingrediente_objetivo": "chochos", "ingrediente_secundario": "cebolla_picada",
          "acertijo": "Lo blanco se junta con lo morado.",
          "resultado": "chochos_cebolla",
          "receta_real": "Mezcla los chochos desamargados con cebolla en plumas, tomate picado, limón y sal." },
        { "orden": 2, "accion": "dorar", "ingrediente_objetivo": "tostado",
          "acertijo": "El grano seco despierta y salta en la sartén.",
          "resultado": "tostado_dorado",
          "receta_real": "Tuesta el maíz en la sartén con una gota de manteca, moviendo hasta que salte y dore." },
        { "orden": 3, "accion": "acompanar", "ingrediente_objetivo": "chochos_cebolla", "ingrediente_secundario": "tostado_dorado",
          "acertijo": "Lo blando pide algo que cruja.",
          "resultado": "ceviche_chochos",
          "receta_real": "Sírvelo frío con el tostado encima — se pone al final, para que no se ablande — y ají al gusto." }
      ],
      "tarjeta": { "texto_cultural": "El ceviche de chochos es callejero y serrano: chochos desamargados con tomate, cebolla, limón y tostado. Se vende en carretilla, en vaso plástico, con chifles y salsa de tomate encima." }
    },

    /* ============ preparaciones sueltas que abren camino ============ */
    {
      "id": "extras_costa", "plato": "yuca_frita", "nombre": "Yuca frita",
      "region": "costa", "precio_venta": 800, "ciudad": "Santo Domingo", "acento": "#8cc63f",
      "intro": "El acompañante que nunca sobra.",
      "pasos": [
        { "orden": 1, "accion": "freir", "ingrediente_objetivo": "yuca_pelada",
          "acertijo": "Blanca entra, dorada sale.",
          "resultado": "yuca_frita",
          "receta_real": "Fríe los bastones de yuca (mejor si están precocidos) hasta dorarlos. Sal al salir." },
        { "orden": 2, "accion": "freir", "ingrediente_objetivo": "huevo",
          "acertijo": "El sol se sienta en la sartén.",
          "resultado": "huevo_frito",
          "receta_real": "Fríe el huevo con la yema blandita, que es lo que sirve para mojar." },
        { "orden": 3, "accion": "picar", "ingrediente_objetivo": "cebolla_picada", "ingrediente_secundario": "tomate_picado",
          "acertijo": "Los dos de siempre, juntos otra vez.",
          "resultado": "sofrito",
          "receta_real": "Junta la cebolla y el tomate picados: esta es la base de casi todo guiso ecuatoriano." },
        { "orden": 4, "accion": "freir", "ingrediente_objetivo": "sofrito",
          "acertijo": "El aceite los vuelve una sola cosa.",
          "resultado": "refrito",
          "receta_real": "Sofríe con achiote, ajo y comino hasta que la cebolla se transparente. Guárdalo: sirve para todo." }
      ],
      "tarjeta": { "texto_cultural": "La yuca frita acompaña el ceviche, el encebollado y el pescado. Y el refrito de cebolla con tomate y achiote es el verdadero cimiento de la cocina ecuatoriana: casi ningún plato empieza sin él." }
    }
  ],

  "resultados": [
    { "id": "verde_pelado",       "nombre": "Verde pelado",        "tipo": "prep" },
    { "id": "verde_cocido",       "nombre": "Verde cocido",        "tipo": "prep" },
    { "id": "verde_frito",        "nombre": "Verde frito",         "tipo": "prep" },
    { "id": "masa_verde",         "nombre": "Masa de verde",       "tipo": "prep" },
    { "id": "patacon_crudo",      "nombre": "Verde aplastado",     "tipo": "prep" },
    { "id": "bolon_crudo",        "nombre": "Bolón crudo",         "tipo": "prep" },
    { "id": "chicharron",         "nombre": "Chicharrón",          "tipo": "prep" },
    { "id": "masa_mixta",         "nombre": "Masa con chicharrón", "tipo": "prep" },
    { "id": "bolon_mixto_crudo",  "nombre": "Mixto crudo",         "tipo": "prep" },
    { "id": "tigrillo_base",      "nombre": "Verde con huevo",     "tipo": "prep" },
    { "id": "mani_molido",        "nombre": "Maní molido",         "tipo": "prep" },
    { "id": "masa_corviche",      "nombre": "Masa de corviche",    "tipo": "prep" },
    { "id": "pescado_limpio",     "nombre": "Pescado limpio",      "tipo": "prep" },
    { "id": "corviche_crudo",     "nombre": "Corviche crudo",      "tipo": "prep" },
    { "id": "caldo_pescado",      "nombre": "Caldo de pescado",    "tipo": "prep" },
    { "id": "yuca_pelada",        "nombre": "Yuca pelada",         "tipo": "prep" },
    { "id": "yuca_cocida",        "nombre": "Yuca cocida",         "tipo": "prep" },
    { "id": "base_encebollado",   "nombre": "Caldo con yuca",      "tipo": "prep" },
    { "id": "cebolla_picada",     "nombre": "Cebolla picada",      "tipo": "prep" },
    { "id": "jugo_limon",         "nombre": "Jugo de limón",       "tipo": "prep" },
    { "id": "curtido",            "nombre": "Curtido",             "tipo": "prep" },
    { "id": "tomate_picado",      "nombre": "Tomate picado",       "tipo": "prep" },
    { "id": "sofrito",            "nombre": "Sofrito",             "tipo": "prep" },
    { "id": "refrito",            "nombre": "Refrito",             "tipo": "prep" },
    { "id": "camaron_cocido",     "nombre": "Camarón cocido",      "tipo": "prep" },
    { "id": "ceviche_base",       "nombre": "Camarón curtido",     "tipo": "prep" },
    { "id": "arroz_cocido",       "nombre": "Arroz cocido",        "tipo": "prep" },
    { "id": "maduro_pelado",      "nombre": "Maduro pelado",       "tipo": "prep" },
    { "id": "maduro_frito",       "nombre": "Maduro frito",        "tipo": "prep" },
    { "id": "huevo_frito",        "nombre": "Huevo frito",         "tipo": "prep" },
    { "id": "papa_cocida",        "nombre": "Papa cocida",         "tipo": "prep" },
    { "id": "masa_llapingacho",   "nombre": "Masa de llapingacho", "tipo": "prep" },
    { "id": "llapingacho_relleno","nombre": "Llapingacho crudo",   "tipo": "prep" },
    { "id": "base_locro",         "nombre": "Base de locro",       "tipo": "prep" },
    { "id": "maiz_preparado",     "nombre": "Choclo molido",       "tipo": "prep" },
    { "id": "mezcla_humita",      "nombre": "Mezcla de humita",    "tipo": "prep" },
    { "id": "humita_envuelta",    "nombre": "Humita envuelta",     "tipo": "prep" },
    { "id": "mote_con_huevo",     "nombre": "Mote con huevo",      "tipo": "prep" },
    { "id": "chochos_cebolla",    "nombre": "Chochos con cebolla", "tipo": "prep" },
    { "id": "tostado_dorado",     "nombre": "Tostado",             "tipo": "prep" }
  ]
};

/* ============================================================
   ADAPTER — traduce GAME_DATA a cartas + fórmulas de fusión.

   CARTAS[id]      → { id, name, rarity, region, lore, city?, accent? }
   RECETAS         → [{ a, b, result, verbo, pista }]
   CARTA_ORDEN     → orden de exhibición en el recetario
   REGIONES[id]    → { id, nombre, tagline, acento, … }
   UTENSILIOS      → las estaciones del mesón (no son cartas)
   ============================================================ */
const CARTAS = {};
const RECETAS = [];
const CARTA_ORDEN = [];
const REGIONES = {};
const REGION_ORDEN = [];
const UTENSILIOS = [];

const isUtensilio = (id) => UTENSILIOS.some(u => u.id === id);

function buildCartario() {
  GAME_DATA.regiones.forEach(r => {
    REGIONES[r.id] = { id: r.id, nombre: r.nombre, tagline: r.tagline, acento: r.acento,
      desbloqueo_recetas: r.desbloqueo_recetas || null, proximamente: !!r.proximamente,
      kitHerramientas: [], kitSemillas: [] };
    REGION_ORDEN.push(r.id);
  });

  GAME_DATA.utensilios.forEach(u => {
    UTENSILIOS.push({ id: u.id, name: u.nombre, region: u.region, verbo: u.verbo });
    if (REGIONES[u.region]) REGIONES[u.region].kitHerramientas.push(u.id);
  });

  /* lore de cada preparación = la instrucción real del paso que la produce */
  const loreDeResultado = {};
  const regionDeResultado = {};
  GAME_DATA.recetas.forEach(r => r.pasos.forEach(p => {
    loreDeResultado[p.resultado] = p.receta_real;
    regionDeResultado[p.resultado] = r.region;
  }));

  GAME_DATA.ingredientes.forEach(i => {
    CARTAS[i.id] = { id: i.id, name: i.nombre, rarity: 'semilla', region: i.region, lore: i.nota };
    CARTA_ORDEN.push(i.id);
    if (REGIONES[i.region]) REGIONES[i.region].kitSemillas.push({ id: i.id, n: i.cantidad_inicial || 2 });
  });
  GAME_DATA.regiones.forEach(r => {
    (r.extra_semillas || []).forEach(x => REGIONES[r.id].kitSemillas.push(x));
  });
  GAME_DATA.resultados.forEach(r => {
    CARTAS[r.id] = { id: r.id, name: r.nombre, rarity: 'hallazgo', region: regionDeResultado[r.id], lore: loreDeResultado[r.id] || '' };
    CARTA_ORDEN.push(r.id);
  });
  GAME_DATA.recetas.forEach(r => {
    CARTAS[r.plato] = {
      id: r.plato, name: r.nombre, rarity: 'receta', region: r.region,
      city: r.ciudad, accent: r.acento,
      lore: (r.tarjeta && r.tarjeta.texto_cultural) || r.intro,
    };
    CARTA_ORDEN.push(r.plato);

    r.pasos.forEach(p => {
      const util = GAME_DATA.acciones[p.accion] && GAME_DATA.acciones[p.accion].utensilio;
      const b = p.ingrediente_secundario || util;
      /* la regla de oro: una pareja, un resultado. Si ya existe, es
         un error de contenido — mejor saberlo en consola que tener
         una receta muerta que nunca se puede descubrir. */
      const dup = RECETAS.find(x => (x.a === p.ingrediente_objetivo && x.b === b) || (x.a === b && x.b === p.ingrediente_objetivo));
      if (dup) { console.warn('[recetario] pareja repetida:', p.ingrediente_objetivo, '+', b, '→', dup.result, 'vs', p.resultado); return; }
      RECETAS.push({
        a: p.ingrediente_objetivo,
        b,
        result: p.resultado,
        verbo: p.accion,
        pista: p.acertijo,
      });
    });
  });

  /* alias de iconos para ids que comparten dibujo con uno existente */
  const alias = { masa_verde: 'verde_majado', bolon_crudo: 'masa_bolon',
                  masa_mixta: 'masa_bolon', bolon_mixto_crudo: 'masa_bolon',
                  llapingacho_relleno: 'masa_llapingacho', chochos: 'granos_mixtos' };
  Object.entries(alias).forEach(([id, src]) => { if (!ICONS[id] && ICONS[src]) ICONS[id] = ICONS[src]; });
}
buildCartario();
