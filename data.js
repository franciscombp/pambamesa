/* ============================================================
   Huecas — saberes y sabores (v4)
   data.js — Todo el contenido y las reglas del juego.

   CÓMO CRECE EL JUEGO (sin tocar app.js):
   - Un objeto nuevo → entrada en ITEMS (+ icono en icons.js).
   - Un plato nuevo  → cuaderno en CUADERNOS + CUADERNO_ORDER.
   - Una condición nueva (invento, fallo explícito, etc.)
     → una fila en RULES. El motor resuelve en este orden:
     paso canon → regla → bloqueo de terminados → mezcla rara.
   ============================================================ */

const TYPES = {
  ingredient: { label: 'Ingrediente' },
  tool:       { label: 'Utensilio' },
  technique:  { label: 'Técnica' },
  prep:       { label: 'Preparación' },
  dish:       { label: 'Plato' },
  junk:       { label: 'Mezcla' },
};

/* ---------- Nodos ----------
   price: costo en la lona (ingredientes y utensilios comprables).
   sell: lo que pagan por él (platos y mezclas; 0 = ni los chanchitos).
   wear/sharpenCost: desgaste de utensilios (cuchillo).
   creative: plato inventado, no pertenece a ningún cuaderno. */
const ITEMS = {
  /* Ingredientes */
  verde:         { name: 'Verde',         type: 'ingredient', price: 100,
                   note: 'Plátano macho, aún firme. En la costa, el día empieza aquí.' },
  queso:         { name: 'Queso',         type: 'ingredient', price: 100,
                   note: 'Fresco, de mesa o de hoja.' },
  chicharron:    { name: 'Chicharrón',    type: 'ingredient', price: 200,
                   note: 'Crocante de cerdo. Un lujo de todos los días.' },
  pescado:       { name: 'Pescado',       type: 'ingredient', price: 200,
                   note: 'Albacora entera, como llega del muelle.' },
  yuca:          { name: 'Yuca',          type: 'ingredient', price: 100,
                   note: 'Raíz paciente. No perdona el apuro.' },
  cebolla:       { name: 'Cebolla',       type: 'ingredient', price: 100,
                   note: 'Colorada, para curtir.' },
  limon:         { name: 'Limón',         type: 'ingredient', price: 100,
                   note: 'Sutil y ácido. Cocina sin fuego.' },
  maiz:          { name: 'Choclo',        type: 'ingredient', price: 100,
                   note: 'Maíz tierno de la sierra.' },
  papa:          { name: 'Papa',          type: 'ingredient', price: 100,
                   note: 'De páramo. Más variedades que apellidos.' },
  leche:         { name: 'Leche',         type: 'ingredient', price: 100,
                   note: 'De la hacienda o del cartón.' },
  zapallo:       { name: 'Zapallo',       type: 'ingredient', price: 200,
                   note: 'Dulce y enorme.' },
  granos_mixtos: { name: 'Granos mixtos', type: 'ingredient', price: 300,
                   note: 'Doce granos, o los que haya.' },
  bacalao:       { name: 'Bacalao',       type: 'ingredient', price: 400,
                   note: 'Salado y viajero. Llega una vez al año.' },
  hoja:          { name: 'Hoja',          type: 'ingredient', price: 100,
                   note: 'De choclo o de achira. Envuelve y perfuma.' },
  huevo:         { name: 'Huevo',         type: 'ingredient', price: 100,
                   note: 'De campo, yema naranja. El alma del tigrillo.' },

  /* Utensilios */
  cuchillo: { name: 'Cuchillo', type: 'tool', wear: 6, sharpenCost: 200,
              note: 'Corta y pela. Se desafila con el uso; el afilador pasa por la lona.' },
  pilon:    { name: 'Pilón',    type: 'tool', note: 'Madera gastada por generaciones de majar.' },
  olla:     { name: 'Olla',     type: 'tool', note: 'Donde las cosas empiezan a ser comida.' },
  sarten:   { name: 'Sartén',   type: 'tool', note: 'Curada con uso. No se presta.' },
  molino:   { name: 'Molino',   type: 'tool', price: 600, buyable: true,
              note: 'De manivela, pesado y fiel. Muele choclo como ninguno.' },

  /* Técnicas */
  pelar:    { name: 'Pelar',    type: 'technique', note: 'Quitar lo que sobra sin llevarse lo que importa.' },
  limpiar:  { name: 'Limpiar',  type: 'technique', note: 'Escamar, quitar piel y espinas. Se hace con calma y buen filo.' },
  hervir:   { name: 'Hervir',   type: 'technique', note: 'El agua hace la mitad del trabajo.' },
  majar:    { name: 'Majar',    type: 'technique', note: 'Aplastar con ritmo, sin deshacer.' },
  curtir:   { name: 'Curtir',   type: 'technique', note: 'El ácido cocina en frío.' },
  envolver: { name: 'Envolver', type: 'technique', note: 'La hoja guarda el vapor y el secreto.' },
  dorar:    { name: 'Dorar',    type: 'technique', note: 'El fuego firma al final.' },
  mezclar:  { name: 'Mezclar',  type: 'technique', note: 'Unir sin apurar.' },
  moler:    { name: 'Moler',    type: 'technique', note: 'Vuelta a vuelta, el grano se rinde.' },
  freir:    { name: 'Freír',    type: 'technique', note: 'Aceite caliente y punto justo, ni un segundo más.' },
  revolver: { name: 'Revolver', type: 'technique', note: 'Con cuchara de palo, sin dejar que se pegue.' },

  /* Preparaciones */
  verde_pelado:     { name: 'Verde pelado',        type: 'prep' },
  verde_frito:      { name: 'Verde frito',         type: 'prep' },
  verde_cocido:     { name: 'Verde cocido',        type: 'prep' },
  verde_majado:     { name: 'Verde majado',        type: 'prep' },
  tigrillo_base:    { name: 'Verde con huevo',     type: 'prep' },
  masa_bolon:       { name: 'Masa de bolón',       type: 'prep' },
  curtido:          { name: 'Curtido',             type: 'prep' },
  pescado_limpio:   { name: 'Pescado limpio',      type: 'prep' },
  yuca_cocida:      { name: 'Yuca cocida',         type: 'prep' },
  caldo_pescado:    { name: 'Caldo de pescado',    type: 'prep' },
  base_encebollado: { name: 'Base de encebollado', type: 'prep' },
  maiz_preparado:   { name: 'Choclo molido',       type: 'prep' },
  mezcla_humita:    { name: 'Mezcla de humita',    type: 'prep' },
  humita_envuelta:  { name: 'Humita envuelta',     type: 'prep' },
  papa_cocida:      { name: 'Papa cocida',         type: 'prep' },
  masa_llapingacho: { name: 'Masa de llapingacho', type: 'prep' },
  base_espesa:      { name: 'Base espesa',         type: 'prep' },
  crema_base:       { name: 'Crema base',          type: 'prep' },
  base_fanesca:     { name: 'Base de fanesca',     type: 'prep' },

  /* Platos */
  bolon:         { name: 'Bolón de verde', type: 'dish', sell: 300 },
  bolon_mixto:   { name: 'Bolón mixto',    type: 'dish', sell: 500, variant: true },
  tigrillo:      { name: 'Tigrillo',       type: 'dish', sell: 700 },
  tigrillo_mixto:{ name: 'Tigrillo mixto', type: 'dish', sell: 900, variant: true },
  encebollado:   { name: 'Encebollado',    type: 'dish', sell: 900 },
  humita:        { name: 'Humita',         type: 'dish', sell: 600 },
  llapingacho:   { name: 'Llapingacho',    type: 'dish', sell: 600 },
  fanesca:       { name: 'Fanesca',        type: 'dish', sell: 1800, meta: true },

  /* Inventos de la casa (nacen de RULES creativas) */
  bolon_doble_queso: { name: 'Bolón doble queso', type: 'dish', sell: 500, creative: true,
                       note: 'No es lo estándar, pero nadie lo devuelve.' },
  humita_con_queso:  { name: 'Humita extra queso', type: 'dish', sell: 700, creative: true,
                       note: 'Invento de la casa. La clientela repite.' },

  /* Mezclas y desastres */
  mezcla_rara:     { name: 'Mezcla rara',     type: 'junk', sell: 100, rots: true,
                     note: 'Nadie sabe qué es. La caserita la compra para los chanchitos.' },
  engrudo:         { name: 'Engrudo',         type: 'junk', sell: 0, rots: true,
                     note: 'Masa pegajosa y sin gracia. Ni para pegar afiches.' },
  podrido:         { name: 'Se pudrió',       type: 'junk', sell: 0,
                     note: 'Se quedó demasiado y se echó a perder. A la basura, ya.' },
  verde_amargo:    { name: 'Verde amargo',    type: 'junk', sell: 0,
                     note: 'Cocido con cáscara. Ni los chanchitos lo quieren.' },
  leche_cortada:   { name: 'Leche cortada',   type: 'junk', sell: 0,
                     note: 'El ácido la cortó al instante. A botar.' },
  hoja_chamuscada: { name: 'Hoja chamuscada', type: 'junk', sell: 0,
                     note: 'Humo y ceniza. Ni para envolver recuerdos.' },
  quemado:         { name: 'Plato quemado',   type: 'junk', sell: 0,
                     note: 'Se recalentó de más y se quemó. La cocina huele a descuido.' },
};

/* ---------- Reglas extra (LA base administrable) ----------
   kind: 'fail' → error explícito con resultado y mensaje propios.
         'creative' → invento vendible fuera del recetario.
   Los insumos no-utensilio SIEMPRE se consumen al disparar una regla. */
const RULES = [
  { a: 'verde', b: 'olla', kind: 'fail', result: 'verde_amargo',
    msg: 'Se coció con cáscara: amargó y manchó la olla. Primero se pela.' },
  { a: 'verde', b: 'sarten', kind: 'fail', result: 'verde_amargo',
    msg: 'Con cáscara y a fuego vivo: quemado por fuera, crudo por dentro.' },
  { a: 'verde', b: 'pilon', kind: 'fail', result: 'mezcla_rara',
    msg: 'Majar un verde crudo y con cáscara... el pilón casi se raja.' },
  { a: 'leche', b: 'limon', kind: 'fail', result: 'leche_cortada',
    msg: 'El ácido cortó la leche al instante.' },
  { a: 'hoja', b: 'sarten', kind: 'fail', result: 'hoja_chamuscada',
    msg: 'La hoja se chamuscó en dos segundos.' },
  { a: 'pescado', b: 'sarten', kind: 'fail', result: 'mezcla_rara',
    msg: 'Entero y sin limpiar a la plancha: espinas, escamas y humo.' },
  { a: 'queso', b: 'sarten', kind: 'fail', result: 'mezcla_rara',
    msg: 'El queso solo se derritió y se pegó. Qué desperdicio.' },

  { a: 'bolon_crudo', b: 'queso', kind: 'creative', result: 'bolon_doble_queso',
    msg: 'Doble queso no es lo estándar… pero nadie se queja.' },
  { a: 'bolon', b: 'queso', kind: 'creative', result: 'bolon_doble_queso',
    msg: 'Relleno otra vez, recién hecho. Invento de la casa.' },
  { a: 'humita', b: 'queso', kind: 'creative', result: 'humita_con_queso',
    msg: 'Más queso a la humita. La sierra aprueba.' },
];

/* ---------- Percances con lógica realista ----------
   Combinar sin receta válida SÍ hace algo, pero inútil.
   Clave: ids del par ordenados y unidos con '|'. Si no hay
   entrada específica, se usa un mensaje genérico armado con
   los nombres. Todo esto se muestra a pantalla completa. */
const MISHAPS = {
  'queso|verde':  { result: 'engrudo',     title: 'Eso no se ve bien',
    text: 'Plátano crudo con queso: quedó un engrudo pegajoso, sin cocción ni gracia. No sirve para nada.' },
  'leche|verde':  { result: 'mezcla_rara', title: 'Mezcla inútil',
    text: 'Verde con leche se pueden juntar… pero no sirve de nada. Va a estorbar en la cocina y a pudrirse. Mejor bótalo.' },
  'huevo|verde':  { result: 'mezcla_rara', title: 'Crudo con crudo',
    text: 'Huevo sobre verde crudo: un batido baboso que nadie se comería. Primero hay que cocinar el verde.' },
  'leche|queso':  { result: 'mezcla_rara', title: 'No cuajó',
    text: 'Leche y queso sueltos, sin fuego ni cuajo: solo un charco blanco que se va a cortar.' },
};
const MISHAP_GENERIC = {
  title: 'Eso no se ve bien',
  text: (a, b) => `Mezclaste ${a} con ${b}. Quedó una masa rara que no sirve para nada; en la cocina solo estorba y con el tiempo se pudre. Mejor bótala.`,
};

/* ---------- Cuadernos ----------
   El contenido de recetas vive en recetario.js (GAME_DATA, esquema
   del GDD). buildRecetario() llena estas estructuras al cargar. */
const CUADERNOS = {};
const CUADERNO_ORDER = [];

/* ---------- Huecas por región ----------
   Empiezas en la costa; la sierra se abre cuando la costa camina. */
const REGIONS = {
  costa: { name: 'La hueca de la abuela', short: 'Costa', accent: '#9dbd8a',
           tagline: 'verde, queso y madrugada' },
};
const REGION_ORDER = ['costa'];

/* ---------- La hueca: clientes y arriendo ---------- */
const CLIENTES = [
  { name: 'Doña Rosa',      icon: 'cliente_rosa',
    line: 'Vengo saliendo de misa, mijo, con un hambre…',
    thanks: '¡Dios le pague! Igualito al de mi finada mamá.',
    left:  'Se me hizo tarde. Ya vuelvo otro día, si Dios quiere.' },
  { name: 'Don Jacinto',    icon: 'cliente_jacinto',
    line: 'Con hambre uno no piensa bien, oiga.',
    thanks: 'Ve, quedó bueno. Esto se cuenta en el barrio.',
    left:  'Nada… me voy con el estómago vacío. Qué pena.' },
  { name: 'La wawa Emilia', icon: 'cliente_wawa',
    line: '¿Ya mismito está? ¿Ya mismito?',
    thanks: '¡Rico! ¿Y la ñapa, casera?',
    left:  'Mi mami dice que ya nos vamos… ni modo.' },
  { name: 'Aníbal',         icon: 'cliente_chofer',
    line: 'Dejé la buseta en doble fila, apúreme.',
    thanks: 'Gracias, maestra. Me voy pitando.',
    left:  'No puedo esperar más, me multan. Chao.' },
  { name: 'La seño Marlene', icon: 'cliente_rosa',
    line: 'Es para llevar, que en la oficina esperan.',
    thanks: 'Le encargo tres para el lunes. ¡Delicia!',
    left:  'Uy, se me acabó la hora del almuerzo. Otro día.' },
  { name: 'El compadre Beto', icon: 'cliente_jacinto',
    line: 'Uno bien servido, casero, sin miseria.',
    thanks: 'Así se hace. Este lugar tiene mano.',
    left:  'Tanto esperar para nada… bueno, será.' },
];

/* ---------- Chismes del barrio ----------
   Escuchar el chisme calma al comensal (le sube la paciencia) y te
   distrae un momento: la hueca también es conversación. */
const CHISMES = [
  '«¿Supiste? La del bazar se ganó una licuadora en la rifa del mercado. Nueva, en su caja.»',
  '«El chofer de la 22 anda enamorado de la señorita de la farmacia. Todo el barrio lo sabe, menos ella.»',
  '«Dizque van a asfaltar la calle antes de las fiestas. Eso mismo dijeron el año pasado.»',
  '«La comadre Chela vio al cura comiendo en la hueca de la competencia. ¡En plena cuaresma!»',
  '«Mi vecina compró una parabólica. Ahora ve novelas mexicanas a toda hora, ni saluda.»',
  '«Dicen que el municipio va a cambiar los sucres por otra moneda… yo no creo, ¿tú sí?»',
  '«El hijo de don Aurelio se fue a España. Manda fotos con nieve, el condenado.»',
  '«En la esquina abrieron un cyber. Cobran por hora, ¡por sentarse frente a un televisor con teclas!»',
  '«La Delfina una vez le negó el bolón al alcalde por sinvergüenza. Así era ella, firme.»',
  '«Doña Piedad vio un ovni sobre el estero. Era el foco nuevo de la cancha, pero no le digas.»',
];

const HUECA = {
  startRating: 5, maxRating: 10,
  queueMax: 4,               /* la vida de la hueca es que siempre está llena */
  tipMax: 200,
  /* entrada continua: en cuanto hay un plato, la gente no para de llegar.
     La paciencia es del que está AL FRENTE; los demás esperan turno. */
  pressure: [
    { dishes: 1, spawnMs: 6500, patience: 75 },
    { dishes: 2, spawnMs: 5200, patience: 65 },
    { dishes: 3, spawnMs: 4200, patience: 58 },
  ],
  /* cada desatendido encoge la paciencia del siguiente (el barrio murmura) */
  patienceDecay: 0.8,
  /* escuchar el chisme del comensal le regala paciencia */
  chismeExtraS: 14,
  chismesPorCliente: 2,
  /* Don Aurelio pasa por el arriendo cada tantos clientes resueltos:
     el costo debe poner en peligro la economía si no cocinas con constancia */
  rentEvery: 14,
  rentBase: 1000, rentStep: 600,
  richPref: 0.5,
};

/* La autoridad de salubridad: 3 clientes seguidos sin servir
   y viene a revisar. Sin comida lista → clausura. */
const SALUBRIDAD = { missLimit: 3 };

/* Metas de largo plazo: la hueca nunca "se acaba". */
const MILESTONES = [];   /* GDD §8: metas de largo plazo, fase futura */

/* ---------- Comensales de historia (empujan el progreso) ----------
   Al llegar a `after` clientes servidos, aparece esta visita pidiendo un
   plato que (probablemente) todavía NO sabes hacer. Se planta al frente de
   la fila, CONGELA a los demás y no se va hasta que se lo sirvas. Sirve de
   guía natural: te dice qué aprender para seguir creciendo.
   Inspiración: los VIP de Diner Dash y los pedidos especiales de Stardew. */
const VISITAS = [
  { after: 2, name: 'Don Segundo', icon: 'cliente_jacinto', dish: 'bolon_mixto',
    unlocks: 'bolon_mixto',
    ask: 'Tú debes ser la sangre de la Delfina. Yo venía cada domingo por su MIXTO: la bola de verde con queso Y chicharrón, de las que llenan hasta el almuerzo. Aquí me siento, sin apuro… mientras, te converso.',
    hintTo: 'Se abrió una página nueva del cuaderno: “Bolón mixto”. Te faltará carne de cerdo para el chicharrón — la canasta del mercado está a la derecha.',
    reward: 800,
    memorias: [
      '«Tu abuela hacía el chicharrón en su propia grasa, sin apuro. Decía que el apuro le quita el dulce a todo.»',
      '«Una vez llovió tan fuerte que el barrio entero desayunó aquí, apretado y feliz. Nadie pagó ese día.»',
      '«Ella no regalaba las recetas, ¿sabes? Decía que había cosas que solo se aprenden con las manos.»',
    ],
    beat: 'Don Segundo prueba, cierra los ojos y se queda callado un rato. «Igualito. Igualito a los domingos.» Deja los billetes bajo el plato y sale despacito, sonriendo.' },
  { after: 7, name: 'Doña Carmen', icon: 'cliente_rosa', dish: 'tigrillo',
    unlocks: 'tigrillo',
    ask: '¿Y no me tienes un tigrillito, mija? Tu abuela lo aprendió de mi comadre de Zaruma: la misma masa del bolón, pero revuelta con huevo. Aquí espero, no me corras.',
    hintTo: 'Nueva página del cuaderno: “Tigrillo”. Usa la misma masa de verde del bolón.',
    reward: 1000,
    memorias: [
      '«La Delfina y yo nos peleamos una vez por este plato. Dos días sin hablarnos… nos contentamos comiéndolo.»',
      '«Si te sale bien, vas a oler exactamente su cocina. Vas a ver que sí.»',
    ],
    beat: '«¡Ese es! ¡Ese es el olor!» Doña Carmen se ríe y llora al mismo tiempo. Se lleva la mitad envuelta “para enseñársela a la Delfina cuando la visite”.' },
];

/* ---------- Beats narrativos (motor de temporadas, GDD §2.3) ----------
   Momentos guionizados declarativos: el motor los evalúa en orden y
   muestra el primero pendiente cuya condición se cumpla. Agregar
   temporadas = agregar filas, no código. */
const BEATS = [
  { id: 'voz', minServed: 1, icon: 'corazon', title: '¡Corrió la voz!',
    text: '«¡Volvió a abrir la hueca de doña Delfina!» El primer vecino salió contento y ya se lo cuenta a medio barrio. Empiezan a asomarse más caras.' },
  { id: 'cierre', recipesComplete: true, icon: 'cuaderno', title: 'Las primeras páginas a color',
    text: 'Guardas el cuaderno. Entre tanto boceto en blanco y negro, ya hay páginas que respiran color — las tuyas. La abuela querrá verlas cuando la visites. Continúa en la temporada completa…' },
];

/* ---------- Economía ---------- */
const REWARDS = { step: 100, technique: 50, dish: 500, dishVariant: 300, dishMeta: 800, creative: 200 };
const REVEAL_COST = 200;
const INITIAL_COINS = 2000;
const RESCUE_COINS = 500;

/* ---------- Microcopy ---------- */
const MICROCOPY = {
  junk: [
    'Eso no era. Quedó una mezcla rara.',
    'Mmm... mejor no probarla.',
    'La página no decía eso. Mezcla rara.',
  ],
  noCombo: [
    'Así no combinan. Prepáralos primero.',
    'Todavía no. Prueba cocinarlos o cortarlos antes.',
    'Estos dos no se llevan… por ahora.',
  ],
  keepOnMesa: 'Lo dejaste servido en la mesa. Sigue desde ahí.',
  crafted: 'Otra vez, de memoria.',
  bought: 'En la lona siempre aparece algo útil.',
  sold: 'La caserita paga sin regatear.',
  tossed: 'A la basura, sin pena.',
  noCoins: 'Faltan sucres. Vende algo o atiende la hueca.',
  rescue: 'La vecina dejó unos sucres en la puerta. Buena gente.',
  allDone: 'El recetario respira completo. La hueca sigue abierta.',
  toolsClank: 'Dos utensilios solo hacen ruido.',
  dullKnife: 'El cuchillo no corta ni mantequilla. El afilador está en la lona.',
  served: '¡Servido caliente! La hueca suena a cucharas.',
  missed: 'Se fue con hambre. Eso se comenta en el barrio…',
  salubridadPass: 'Revisaron todo. Había comida lista: te dejan seguir.',
  salubridadClose: 'Llegó salubridad y no había ni un plato listo. Clausurada.',
  calmOn: 'Modo tranquilo: cocina y descubre sin apuros.',
  calmOff: 'Modo servicio: la clientela vuelve a llegar.',
  firstDish: 'Recuperaste tu primer plato. Ahora la clientela empieza a llegar…',
  burned: 'Lo recalentaste y se quemó. A la basura.',
  rentHint: 'El arriendo sube cada mes. Solo con bolón no vas a alcanzar: aprende platos más caros.',
  regionUnlock: 'Corrió la voz: puedes abrir una hueca serrana. Los cuadernos de la sierra están en la lona.',
  sellFromKitchen: 'Vendido desde la cocina.',
  servedQueue: '¡Servido! Otro cliente contento.',
  rotted: 'Una mezcla se pudrió en el mesón. Bótala antes de que llegue salubridad.',
  toolsClank: 'Dos utensilios solos no hacen nada.',
};

/* Cuánto tarda una mezcla inútil en pudrirse (ms, solo en servicio). */
const ROT_MS = 45000;
