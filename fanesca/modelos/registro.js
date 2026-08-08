/* ============================================================
   FANESCA — modelos/registro.js
   El catálogo de piezas, y el puente hacia Blender.

   ------------------------------------------------------------
   POR QUÉ UNA PIEZA Y NO UNA ESCENA

   Los modelos de este juego no son decorado: son la mecánica. La
   mazorca no es "un choclo", es una rejilla de 14×9 granos cuyas
   posiciones calcula el juego con una fórmula, y de esas
   posiciones dependen la regla del vecino ausente, la cascada y
   dónde se esconde el gusanito. Si horneáramos la mazorca entera
   a un .glb, editarla en Blender rompería el juego.

   Por eso el corte es **una pieza por archivo**: un grano, una
   hoja, un gusano. El modelo dice cómo se ve una pieza; el juego
   dice cuántas hay y dónde van. Así se puede reesculpir el grano
   en Blender sin tocar una línea de lógica.

   ------------------------------------------------------------
   CÓMO SE USA

     import { registrar, pieza } from './registro.js';

     registrar('grano-choclo', (THREE, opts) => { ...; return obj; });
     const g = pieza('grano-choclo', THREE, { madurez: 'tierno' });

   ------------------------------------------------------------
   EL PUENTE .GLB

   Si existe `modelos/glb/<id>.glb`, se usa ESE en vez del código.
   El juego lo clona por cada copia que necesite. Para saber qué
   hay sin disparar veinte 404 en cada arranque, la carpeta lleva
   un `indice.json` con la lista — lo escribe la herramienta de
   exportación, y se edita a mano al agregar un modelo nuevo.

   Las piezas que el juego manipula por dentro (el grano que
   cambia de color según la madurez, la carne del bacalao que se
   aclara al desalarse, los segmentos del gusano que se menean)
   encuentran sus partes POR NOMBRE, con `parte(obj, 'carne')`.
   Un .glb funciona igual siempre que sus objetos se llamen igual
   en Blender. Eso está documentado en modelos/README.md, y cada
   constructor de aquí nombra lo suyo.
   ============================================================ */

const constructores = new Map();
const variantes = new Map();    /* id -> (opts) => sufijo */
const glb = new Map();          /* id -> Object3D plantilla ya cargada */
let indiceCargado = false;

/* ---------- registro ----------
   `variante` es para las piezas que se piden de más de una forma: el
   grano de choclo tierno y el duro no son el mismo modelo, así que
   cada uno puede tener su propio .glb (`grano-choclo-tierno.glb`).
   Sin esto, editar el tierno en Blender le cambiaría también al duro. */

export function registrar(id, hace, opts = {}) {
  constructores.set(id, hace);
  if (opts.variante) variantes.set(id, opts.variante);
}

/* todos los nombres de archivo que esta pieza puede tener */
export function nombresDe(id, opts = {}) {
  const v = variantes.get(id);
  const suf = v ? v(opts) : '';
  return suf ? [id + suf, id] : [id];
}

export function pieza(id, THREE, opts = {}) {
  const plantilla = nombresDe(id, opts).map(n => glb.get(n)).find(Boolean);
  if (plantilla) {
    const copia = plantilla.clone(true);
    /* el clon comparte materiales con la plantilla: si el juego va a
       cambiarle el color a una parte (el bacalao al desalarse), tiene
       que ser SU material, no el de todas las copias */
    const propios = opts.materialesPropios !== false;
    copia.traverse(o => {
      /* la geometría SÍ se comparte con la plantilla, siempre: hay que
         marcarla para que al descargar el nivel el motor no la tire y
         deje al .glb sin malla en la siguiente partida */
      if (o.geometry) o.geometry.userData.compartida = true;
      if (!o.material) return;
      if (propios) o.material = o.material.clone();
      else o.material.userData.compartida = true;
    });
    return copia;
  }
  const hace = constructores.get(id);
  if (!hace) {
    console.warn('[fanesca] pieza desconocida:', id);
    return new THREE.Group();
  }
  return hace(THREE, opts);
}

export const tieneGLB = (id) => glb.has(id);
export const registradas = () => [...constructores.keys()].sort();

/* ---------- buscar partes por nombre ----------
   El juego le habla a sus modelos por nombre, nunca por índice de
   hijo: `parte(chocho, 'pepa')`. Así el mismo código sirve para el
   modelo de código y para uno esculpido en Blender, mientras el
   objeto se llame igual en los dos. */

export function parte(obj, nombre) {
  let hallada = null;
  obj.traverse(o => { if (!hallada && o.name === nombre) hallada = o; });
  return hallada;
}

export function partes(obj, prefijo) {
  const lista = [];
  obj.traverse(o => { if (o.name && o.name.startsWith(prefijo)) lista.push(o); });
  /* en orden: seg0, seg1, seg2… y no el que Blender quiera */
  lista.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return lista;
}

/* ---------- el puente a Blender ---------- */

/* Se llama una vez al arrancar el juego. Si no hay carpeta glb/, o
   no hay índice, o falla la red: no pasa nada y el juego usa sus
   modelos de código. Nunca bloquea el arranque. */
export async function cargarGLB(THREE, GLTFLoader, base = './modelos/glb/') {
  if (indiceCargado) return glb.size;
  indiceCargado = true;
  let lista = [];
  try {
    const res = await fetch(base + 'indice.json', { cache: 'no-cache' });
    if (!res.ok) return 0;
    lista = await res.json();
    if (!Array.isArray(lista)) return 0;
  } catch (e) { return 0; }

  const loader = new GLTFLoader();
  await Promise.all(lista.map(id => new Promise(listo => {
    loader.load(base + id + '.glb',
      (gltf) => {
        const raiz = gltf.scene || gltf.scenes[0];
        if (raiz) {
          /* Blender exporta con una raíz de escena: si adentro hay un
             solo objeto, se usa ese — así el .glb queda al mismo nivel
             que el modelo de código y no gana un grupo de más */
          const util = raiz.children.length === 1 ? raiz.children[0] : raiz;
          util.position.set(0, 0, 0);
          util.updateMatrixWorld(true);
          glb.set(id, util);
        }
        listo();
      },
      undefined,
      () => listo(),   /* no está o está roto: se sigue con el de código */
    );
  })));
  return glb.size;
}
