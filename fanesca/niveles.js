/* ============================================================
   FANESCA — niveles.js
   Los datos, separados del código: qué ingredientes se preparan,
   en qué orden, con qué gesto y en cuánto tiempo son 3 cucharas.

   Agregar un ingrediente nuevo es agregar una entrada aquí y un
   archivo `nivel-<id>.js` que cumpla el contrato del motor.
   ============================================================ */

export const NIVELES = [
  {
    id: 'maiz',
    nombre: 'El choclo',
    tarea: 'Desgranar',
    icono: 'maiz',
    modulo: () => import('./nivel-maiz.js'),
    gesto: 'Toca un grano del borde y <b>arrastra</b> a lo largo: la fila entera se va sola. Del centro, ni te molestes.',
    nota: 'Doce granos, doce apóstoles. El choclo tierno se desgrana con el pulgar, empezando siempre por una orilla.',
    bicho: 'el gusanito',
    /* segundos para 3, 2 y 1 cuchara */
    cucharas: [55, 85, 130],
  },
  {
    id: 'habas',
    nombre: 'Las habas',
    tarea: 'Desvainar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-habas.js'),
    gesto: 'Pasa el dedo por la <b>costura</b> de la vaina para abrirla, y toca cada haba para echarla a la batea.',
    nota: 'La haba tierna es de la sierra alta. Se abre la vaina por el filo y salen acomodadas como en su cama.',
    bicho: 'el gusanito',
    cucharas: [50, 80, 120],
  },
  {
    id: 'chochos',
    nombre: 'Los chochos',
    tarea: 'Pelar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-chochos.js'),
    gesto: '<b>Aprieta</b> cada chocho y la pepa salta fuera de su piel. Arrastra el dedo por encima y van saltando en fila.',
    nota: 'El chocho llega ya desamargado: son días de agua corriente para quitarle lo amargo. Pelarlo es lo último y lo más fácil.',
    bicho: 'el gorgojo',
    cucharas: [40, 65, 100],
  },
  {
    id: 'frejol',
    nombre: 'El fréjol',
    tarea: 'Reventar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-frejol.js'),
    gesto: '<b>Mantén el dedo</b> sobre la vaina hasta que reviente, y luego <b>barre</b> los granos hacia la batea.',
    nota: 'Fréjol tierno, el de la vaina moteada. Se aprieta hasta que truena y los granos saltan solos.',
    bicho: 'el gorgojo',
    cucharas: [50, 80, 120],
  },
  {
    id: 'zapallo',
    nombre: 'El zapallo',
    tarea: 'Cortar',
    icono: 'zapallo',
    modulo: () => import('./nivel-zapallo.js'),
    gesto: '<b>Corta</b> siguiendo las líneas punteadas, sin desviarte. Si hay un gusano en la línea, sácalo antes.',
    nota: 'Zapallo y sambo, los dos hermanos dulces de la fanesca. Se cortan en cubos parejos para que se deshagan igual.',
    bicho: 'el gusano gordo',
    cucharas: [45, 70, 105],
  },
  {
    id: 'escoger',
    nombre: 'La lenteja',
    tarea: 'Escoger el grano',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-escoger.js'),
    gesto: '<b>Toca</b> las piedritas y los granos picados para botarlos. Cuando la mesa esté limpia, <b>barre</b> las lentejas a la batea. Aquí no gana el rápido: gana el que mira.',
    nota: 'Escoger el grano se hace sentadas y conversando, con el grano regado sobre la mesa. Es de las pocas tareas de cocina que se hacen entre varias porque sí, no porque falte tiempo.',
    bicho: 'el gorgojo',
    cucharas: [70, 110, 160],
  },
  {
    id: 'bacalao',
    nombre: 'El bacalao',
    tarea: 'Desalar y tender',
    icono: 'bacalao',
    modulo: () => import('./nivel-bacalao.js'),
    gesto: '<b>Frota</b> cada presa hasta sacarle la sal y <b>arrástrala</b> al cordel. Si se te posa una mosca, <b>espántala</b> de un roce — no la aplastes.',
    nota: 'El bacalao llega seco y salado desde el norte. Se le saca la sal frotando y se tiende a orear antes de la leche.',
    bicho: 'la mosca',
    cucharas: [55, 85, 130],
  },
];

export const porId = (id) => NIVELES.find(n => n.id === id);

/* cuántas cucharas merece un tiempo */
export function cucharasDe(nivel, ms) {
  const s = ms / 1000;
  const [a, b, c] = nivel.cucharas;
  if (s <= a) return 3;
  if (s <= b) return 2;
  if (s <= c) return 1;
  return 1;   /* terminarlo siempre vale al menos una */
}

export function tiempoBonito(ms) {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m > 0 ? `${m}:${r.toFixed(1).padStart(4, '0')}` : `${r.toFixed(1)}s`;
}
