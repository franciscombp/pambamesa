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

/* La cita es real y verificable; la usamos textual y con nombre.
   No es adorno: es la misma idea que sostiene la mecánica del
   choclo, dicha cuarenta años antes y en serio. */
export const CACUANGO = {
  texto: 'Nosotros somos como los granos de quinua: si estamos solos, el viento lleva lejos. Pero si estamos unidos en un costal, nada hace el viento. Bamboleará, pero no nos hará caer.',
  quien: 'Dolores Cacuango',
  datos: 'Pesillo, Cayambe, 1881 – 1971. Lideresa kichwa, precursora de la lucha por los derechos indígenas y campesinos; impulsó las primeras escuelas bilingües kichwa-castellano del Ecuador.',
};

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
      titulo: '«Como los granos de quinua»',
      icono: 'maiz',
      cuerpo: [
        'Cualquiera que haya desgranado un choclo lo sabe con las manos antes que con la cabeza: un grano en el centro, apretado por los cuatro lados, no sale. Hay que empezar por una orilla — y en cuanto sale el primero, la hilera entera se va sola.',
        '<b>Dolores Cacuango</b> (Pesillo, Cayambe, 1881–1971) usó esa misma imagen para explicar por qué había que organizarse. Lideresa kichwa, precursora de la lucha por los derechos indígenas y campesinos, impulsora de las primeras escuelas bilingües kichwa-castellano del país, lo dijo así:',
        'La mecánica de este juego llegó a lo mismo desde el otro lado: aquí un grano solo se suelta cuando le falta un vecino. Suelto, se va. Apretado con los demás, no hay dedo que lo mueva.',
      ],
      cita: CACUANGO,
    },
  ],

  fuentes: [
    { t: 'Fanesca — Wikipedia en español', u: 'https://es.wikipedia.org/wiki/Fanesca' },
    { t: 'Origen y permanencia de la Fanesca — Archivo Metropolitano de Historia de Quito', u: 'http://archivoqhistorico.quito.gob.ec/index.php/quito-y-sus-historias/36-origen-y-permanencia-de-la-fanesca' },
    { t: 'El origen de la fanesca, un plato que empezó con carne de llama — Primicias', u: 'https://www.primicias.ec/noticias/entretenimiento/gastronomia/semana-santa-fanesca-origen-historia-ecuador/' },
    { t: 'La historia de la fanesca — Infobae', u: 'https://www.infobae.com/america/america-latina/2022/04/16/la-historia-de-la-fanesca-la-sopa-ecuatoriana-que-recuerda-a-jesus-y-sus-apostoles/' },
    { t: 'Dolores Cacuango — CONAIE', u: 'https://conaie.org/' },
  ],
};

/* ---------- lo que se gana al terminar cada ingrediente ---------- */

export const TARJETAS = {
  maiz: {
    titulo: 'El choclo, y la fila que se va sola',
    texto: 'El choclo es de aquí: llevaba miles de años en estos valles cuando llegó todo lo demás. Se desgrana empezando por una orilla, porque el grano del centro está trabado por sus cuatro vecinos — que es exactamente la imagen que usó Dolores Cacuango para hablar de organizarse.',
    cita: CACUANGO,
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
