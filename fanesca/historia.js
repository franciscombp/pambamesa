/* ============================================================
   FANESCA — historia.js
   Lo que el plato cuenta, separado del código que lo cocina.

   La fanesca no es solo una sopa: es el país en un plato. Un
   ritual andino de cosecha al que el calendario católico se le
   montó encima sin moverlo de fecha, con granos de dos orillas
   del océano y un pescado del Atlántico Norte metido a 2.800
   metros de altura. Todo eso está en los ingredientes que el
   jugador tiene en las manos, así que aquí vive el texto que se
   los cuenta — en el cuaderno, en los briefs y en las tarjetas
   que se ganan al terminar cada nivel.

   Regla de este archivo: lo que se afirma, se sostiene; lo que
   está en disputa, se dice que está en disputa (el nombre, sin ir
   más lejos, no lo sabe nadie). Las fuentes van al final y se
   muestran en el cuaderno.
   ============================================================ */

/* ============================================================
   LAS VOCES
   Citas de lideresas indígenas ecuatorianas. Todas van textuales,
   con nombre y con datos verificables, y solo se usan donde el
   juego de verdad las sostiene: una cita puesta de adorno donde
   no viene a cuento las gasta.

   La de Amaguaña es la que da sentido a todo el nivel del choclo,
   porque describe LITERALMENTE la mecánica: el grano que se va se
   lleva la fila, y sin filas no queda mazorca.
   ============================================================ */

export const AMAGUANA_MAZORCA = {
  texto: 'Los indígenas que hemos sufrido, que hemos chupado las cuerizas, las garrotizas, tenemos que estar unidos porque la unidad es como la mazorca: si se va el grano, se va la fila; si se va la fila, se acaba la mazorca.',
  corta: 'La unidad es como la mazorca: si se va el grano, se va la fila; si se va la fila, se acaba la mazorca.',
  quien: 'Tránsito Amaguaña',
  datos: 'Pesillo, Cayambe, 10 de septiembre de 1909 – 10 de mayo de 2009. Lideresa kichwa; con Dolores Cacuango encabezó en 1926 la primera huelga de trabajadores de hacienda en Olmedo-Pesillo, y caminó veintiséis marchas a Quito.',
};

export const AMAGUANA_SANGRE = {
  texto: 'Yo he viajado y he caminado por todos los lugares, pero nunca he negociado con la sangre de mis hermanos.',
  quien: 'Tránsito Amaguaña',
  datos: 'Vivió cien años. Estuvo presa, la acusaron de armar escuelas «comunistas», y siguió.',
};

export const CACUANGO_PARAMO = {
  texto: 'Somos como la paja de páramo que se arranca y vuelve a crecer… y de paja de páramo sembraremos el mundo.',
  quien: 'Dolores Cacuango',
  datos: 'Pesillo, Cayambe, 1881 – 1971. Fundó en 1946 la primera escuela bilingüe kichwa-castellano del Ecuador, y fue de las fundadoras de la Federación Ecuatoriana de Indios.',
};

export const CHANCOSO_AGRICULTURA = {
  texto: 'La agricultura es una historia, una identidad: quienes cultivan lo hacen gracias a la herencia que dejaron los ancestros, mantenida por milenios.',
  quien: 'Blanca Chancoso',
  datos: 'Kichwa otavalo, cofundadora de Ecuarunari y de la CONAIE. (Declaración recogida en entrevista, no cita de archivo: por eso va parafraseada y marcada como tal.)',
};

export const VOCES = [AMAGUANA_MAZORCA, CACUANGO_PARAMO, AMAGUANA_SANGRE, CHANCOSO_AGRICULTURA];

export const HISTORIA = {
  entradilla: 'Se come un solo día al año y casi nadie la cocina solo. Debajo del queso y la leche hay una fiesta de cosecha más vieja que las iglesias que hoy le ponen fecha.',

  capitulos: [
    {
      id: 'origen',
      titulo: 'Antes se llamaba uchucuta',
      icono: 'maiz',
      cuerpo: [
        'Mucho antes de la Semana Santa, en los Andes ya se cocinaba esta olla. Se llamaba <b>uchucuta</b>: en kichwa, granos tiernos cocidos con ají y hierbas. Se hacía con lo primero que daba la tierra —choclo, fréjol, habas, mellocos, zapallo, sambo— y se comía con carne de llama.',
        'No era una comida cualquiera: era la del <b>Mushuk Nina</b>, la fiesta del Fuego Nuevo, y la del <b>Pawkar Raymi</b>, la del florecimiento. Se apagaban los fogones y se encendía fuego nuevo para estrenar el año. Comerse los primeros granos tiernos, todos juntos en una olla, era la manera de decir que la tierra había vuelto a responder.',
      ],
    },
    {
      id: 'fecha',
      titulo: 'Por qué cae justo en Semana Santa',
      icono: 'hoja',
      cuerpo: [
        'No es casualidad, y no es que una tradición haya reemplazado a la otra: es que las dos miran <b>el mismo día del cielo</b>.',
        'El Mushuk Nina se celebraba en el <b>equinoccio de marzo</b>. Y la Pascua cristiana no tiene fecha fija: se calcula como el primer domingo después de la primera luna llena que sigue a ese mismo equinoccio. El calendario que llegó de Europa cayó encima del andino sin tener que moverlo.',
        'Por eso la fanesca es de Viernes Santo y de cosecha a la vez. Son dos calendarios comiendo del mismo plato.',
      ],
    },
    {
      id: 'nombre',
      titulo: 'El nombre no lo sabe nadie',
      icono: 'cuaderno',
      cuerpo: [
        'Hay tres explicaciones y ninguna está probada. Se repiten como si fueran datos, pero son hipótesis:',
        '· Del latín <b>fames</b> (hambre) — de ahí <i>famesco</i>, tener hambre.<br>· De <b>faneca</b>, un pescado corriente para los españoles.<br>· De <b>juanesca</b>, por las mujeres que cocinaban en haciendas y conventos; cuenta la versión más contada que una tal Juana la servía en un convento de Quito.',
        'Que el plato más simbólico del país tenga el origen del nombre en disputa dice bastante: llegó hasta aquí por la cocina y la boca, no por los papeles.',
      ],
    },
    {
      id: 'granos',
      titulo: 'Doce granos de dos orillas',
      icono: 'granos_mixtos',
      cuerpo: [
        'Los españoles le dieron la lectura que hoy todos repiten: los <b>doce granos son los doce apóstoles</b> y el bacalao es Cristo. Pero mira de dónde viene cada grano y el plato cuenta otra cosa encima.',
        'La fanesca no es un plato indígena con añadidos, ni un plato español con adornos. Es literalmente las dos despensas revueltas y hervidas juntas hasta que no se pueden separar.',
      ],
      granos: [
        { n: 'Choclo', de: 'aca' }, { n: 'Fréjol', de: 'aca' },
        { n: 'Chochos', de: 'aca' }, { n: 'Zapallo', de: 'aca' },
        { n: 'Sambo', de: 'aca' }, { n: 'Melloco', de: 'aca' },
        { n: 'Maní', de: 'aca' }, { n: 'Quinua', de: 'aca' },
        { n: 'Habas', de: 'alla' }, { n: 'Arveja', de: 'alla' },
        { n: 'Lenteja', de: 'alla' }, { n: 'Garbanzo', de: 'alla' },
        { n: 'Col', de: 'alla' }, { n: 'Arroz', de: 'alla' },
        { n: 'Leche y queso', de: 'alla' }, { n: 'Bacalao', de: 'alla' },
      ],
    },
    {
      id: 'bacalao',
      titulo: 'Un pescado del Atlántico Norte, a 2.800 metros',
      icono: 'bacalao',
      cuerpo: [
        'Pregunta incómoda: ¿qué hace un bacalao del mar del norte en una sopa de páramo, en un país con costa propia y pescado fresco a un día de camino?',
        'La respuesta es la Cuaresma. La Iglesia prohibía la carne roja en vigilia, así que había que comer pescado. Pero no había hielo ni trenes: el único pescado capaz de cruzar el Atlántico y después <b>subir a los Andes</b> era el que venía seco y enterrado en sal. La sal no era condimento, era el transporte.',
        'Por eso el primer gesto de quien cocina fanesca es <b>quitarle la sal</b>: horas de remojo, aguas que se cambian y se botan. Desalar el bacalao es deshacer un viaje de siglos para poder comérselo.',
      ],
    },
    {
      id: 'unidad',
      titulo: '«Si se va el grano, se va la fila»',
      icono: 'maiz',
      cuerpo: [
        'Cualquiera que haya desgranado un choclo lo sabe con las manos antes que con la cabeza: un grano del centro, apretado por los cuatro lados, no sale. Hay que empezar por una orilla — y en cuanto sale el primero, la hilera entera se va sola.',
        '<b>Tránsito Amaguaña</b> usó exactamente esa imagen, y no como metáfora bonita: la dijo explicando por qué los peones de hacienda tenían que organizarse.',
        'No es que el juego se parezca a la frase. Es que la frase describe la mecánica: aquí un grano solo se suelta cuando le falta un vecino, y en cuanto falta uno se va la hilera completa. Ella lo sabía porque desgranaba choclo.',
      ],
      cita: AMAGUANA_MAZORCA,
    },
    {
      id: 'voces',
      titulo: 'Las que lo dijeron primero',
      icono: 'cuaderno',
      cuerpo: [
        'Las dos nacieron en <b>Pesillo, Cayambe</b>, en haciendas donde sus familias eran huasipungueras: trabajaban la tierra del patrón a cambio de un pedazo para sembrar. En 1926 encabezaron juntas la primera huelga de trabajadores de hacienda del país.',
        '<b>Dolores Cacuango</b> (1881–1971) fundó en 1946 la primera escuela bilingüe kichwa-castellano del Ecuador, cuando enseñar en kichwa era motivo de persecución. Fue de las fundadoras de la Federación Ecuatoriana de Indios.',
        '<b>Tránsito Amaguaña</b> (1909–2009) caminó veintiséis marchas a Quito, estuvo presa, y vivió cien años. Cuando le preguntaban qué había sacado de todo eso:',
        'Y de la generación que siguió, <b>Blanca Chancoso</b>, kichwa otavalo, cofundadora de Ecuarunari y de la CONAIE, insiste en algo que este plato demuestra solo: que sembrar y cocinar son también una manera de acordarse.',
      ],
      citas: [CACUANGO_PARAMO, AMAGUANA_SANGRE, CHANCOSO_AGRICULTURA],
    },
  ],

  fuentes: [
    { t: 'Fanesca — Wikipedia en español', u: 'https://es.wikipedia.org/wiki/Fanesca' },
    { t: 'Origen y permanencia de la Fanesca — Archivo Metropolitano de Historia de Quito', u: 'http://archivoqhistorico.quito.gob.ec/index.php/quito-y-sus-historias/36-origen-y-permanencia-de-la-fanesca' },
    { t: 'El origen de la fanesca, un plato que empezó con carne de llama — Primicias', u: 'https://www.primicias.ec/noticias/entretenimiento/gastronomia/semana-santa-fanesca-origen-historia-ecuador/' },
    { t: 'La historia de la fanesca — Infobae', u: 'https://www.infobae.com/america/america-latina/2022/04/16/la-historia-de-la-fanesca-la-sopa-ecuatoriana-que-recuerda-a-jesus-y-sus-apostoles/' },
    { t: 'Tránsito Amaguaña, la líder indígena que vivió cien años — Infobae', u: 'https://www.infobae.com/america/america-latina/2021/07/11/la-historia-de-transito-amaguana-la-lider-indigena-ecuatoriana-que-vivio-hasta-los-100-anos/' },
    { t: 'Tránsito Amaguaña — biografía y logros (Lifeder)', u: 'https://www.lifeder.com/transito-amaguana/' },
    { t: 'El legado de Dolores Cacuango — Fundación Rosa Luxemburg', u: 'https://www.rosalux.org.ec/pdfs/D-Cacuango.pdf' },
    { t: 'Entrevista a Blanca Chancoso — FLACSO Andes', u: 'https://www.flacsoandes.edu.ec/web/imagesFTP/BLANCA_CHANCOSO.pdf' },
  ],
};

/* ---------- lo que se gana al terminar cada ingrediente ---------- */

export const TARJETAS = {
  maiz: {
    titulo: 'El choclo, y la fila que se va sola',
    texto: 'El choclo es de aquí: llevaba miles de años en estos valles cuando llegó todo lo demás. Se desgrana empezando por una orilla, porque el grano del centro está trabado por sus cuatro vecinos — que es exactamente la imagen que usó Tránsito Amaguaña para explicar por qué había que organizarse.',
    cita: AMAGUANA_MAZORCA,
    abre: ['unidad'],
  },
  habas: {
    titulo: 'El haba cruzó el mar',
    texto: 'El haba no es americana: llegó del Mediterráneo y se quedó a vivir en el páramo, donde el frío no la mata. Hoy nadie la siente ajena. En la misma olla van habas de allá y choclo de aquí, y ya no hay manera de separarlos.',
    abre: ['granos'],
  },
  frejol: {
    titulo: 'El fréjol, de este lado',
    texto: 'El fréjol sí es de acá, domesticado en América mucho antes de que existiera la Cuaresma. Iba en la uchucuta, la olla de granos tiernos que se comía en el Mushuk Nina para estrenar el año agrícola. La fanesca es esa olla, con otro nombre y otra fecha encima.',
    abre: ['origen', 'fecha'],
  },
  chochos: {
    titulo: 'Lo amargo se quita con paciencia',
    texto: 'El chocho crudo es tóxico y amarguísimo: no se come sin antes pasar días en agua corriente, cambiándola. Nadie descubrió eso en una tarde. Es conocimiento acumulado por generaciones y transmitido casi siempre entre mujeres, de una cocina a otra, sin escribirse en ninguna parte.',
    abre: ['origen'],
  },
  escoger: {
    titulo: 'Escoger el grano, que se hace entre varias',
    texto: 'Escoger el grano —sacarle las piedritas y lo picado— es de las pocas tareas que se hacen sentadas y en conjunto. Por eso la fanesca casi nunca se cocina sola: no es que sea difícil, es que da para conversar. La olla más simbólica del país es, en la práctica, una excusa para juntarse.',
    cita: CHANCOSO_AGRICULTURA,
    abre: ['voces'],
  },
  zapallo: {
    titulo: 'Zapallo y sambo, los dos hermanos',
    texto: 'Zapallo y sambo son americanos y son la base: molidos y hervidos con leche, son lo que le da cuerpo a la fanesca. Lo dulce de abajo, que sostiene los doce granos sin que se note. Casi nunca se los nombra, y sin ellos no hay plato.',
    abre: ['nombre'],
  },
  bacalao: {
    titulo: 'La sal era el barco',
    texto: 'El bacalao llegó por una regla religiosa —nada de carne en vigilia— y se quedó por una razón física: sin frío, el único pescado que podía cruzar el Atlántico y subir a los Andes era el que venía seco y enterrado en sal. Desalarlo, como acabas de hacer, es deshacerle el viaje.',
    abre: ['bacalao'],
  },
};

export const CIERRE = 'Doce granos de dos orillas, un pescado del norte y una fiesta de cosecha con fecha de Semana Santa. Nada de eso se puede separar ya: por eso se sirve en un solo plato, y por eso se come entre varios.';
