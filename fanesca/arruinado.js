/* ============================================================
   FANESCA — arruinado.js
   Por qué se arruinó la olla, dicho en palabras.

   Esto es copy, no código de juego: vive aparte de bichos.js
   (que ahora es solo forma, en modelos/) por la misma razón que
   historia.js vive aparte de los niveles. El texto se lee, se
   corrige y se traduce sin abrir un archivo de geometría.

   Y hay un motivo de diseño para que sea UN solo sitio: el
   jugador tiene que entender que perdió por la MISMA regla en los
   siete niveles. Si cada nivel escribiera su propio mensaje, la
   regla se sentiría como siete reglas parecidas.
   ============================================================ */

export const ARRUINADO = {
  aplastado: (bicho = 'gusanito') => ({
    titulo: 'Lo aplastaste',
    texto: `El ${bicho} reventó encima de la comida. Con eso ya no hay nada que hacer: se bota todo y se empieza de nuevo.`,
  }),
  enLaBatea: (bicho = 'gusanito') => ({
    titulo: 'Se te fue a la batea',
    texto: `El ${bicho} llegó hasta la batea y se mezcló con lo bueno. Ya no se puede separar: toca botar todo y empezar de nuevo.`,
  }),
};
