/* ============================================================
   PAMBAMESA — actualizador.js
   Registra el service worker y maneja el ciclo de versión de
   cara al jugador:

   1. INSTALAR   — primera visita con internet: el juego entero
                   queda guardado y desde ahí abre sin conexión.
   2. DETECTAR   — al volver a abrir (o cada hora con la app
                   abierta) se revisa si hay versión nueva.
   3. AVISAR     — si la hay, aparece el botón "Actualizar" sobre
                   la barra. Nada se recarga a traición.
   4. ESTRENAR   — tras actualizar (o al abrir una versión nueva)
                   se muestra la nota de versiones una sola vez.

   Requiere version.js cargado antes (APP_VERSION, NOVEDADES).
   La ruta del sw se pasa con data-sw en la etiqueta <script>,
   porque la fanesca vive un directorio más abajo.
   ============================================================ */

(function () {
  const VISTA_KEY = 'pambamesa_version_vista';

  /* ---------- la nota de versiones ---------- */

  function mostrarNovedades() {
    const nota = NOVEDADES[0];
    if (!nota) return;
    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = `
      <div class="sheet">
        <span class="nota-version-ic" aria-hidden="true">🎉</span>
        <p class="sheet-eyebrow">versión ${nota.v} · ${nota.fecha}</p>
        <h3 class="sheet-title">${nota.titulo}</h3>
        <ul class="nota-version-lista">
          ${nota.cambios.map(c => `<li>${c}</li>`).join('')}
        </ul>
        <button type="button" class="btn btn--maiz btn--block">¡A cocinar!</button>
      </div>`;
    const cerrar = () => modal.remove();
    modal.querySelector('button').addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
    document.body.appendChild(modal);
  }

  function revisarEstreno() {
    let vista = null;
    try { vista = localStorage.getItem(VISTA_KEY); } catch (e) {}
    if (vista === APP_VERSION) return;
    try { localStorage.setItem(VISTA_KEY, APP_VERSION); } catch (e) {}
    /* en la primerísima visita no hay "novedades": todo es nuevo */
    if (vista !== null) setTimeout(mostrarNovedades, 900);
  }

  /* etiqueta discreta con la versión, si la página tiene dónde */
  document.addEventListener('DOMContentLoaded', () => {
    const sitio = document.querySelector('[data-version]');
    if (sitio) sitio.textContent = 'v' + APP_VERSION;
    revisarEstreno();
  });

  /* ---------- el service worker y su botón de actualizar ---------- */

  if (!('serviceWorker' in navigator)) return;
  const script = document.currentScript;
  const rutaSW = (script && script.dataset.sw) || 'sw.js';

  let avisoPuesto = false;
  let actualizandoPorBoton = false;
  function avisarActualizacion(reg) {
    if (avisoPuesto || !reg.waiting) return;
    avisoPuesto = true;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--maiz aviso-actualizar';
    btn.innerHTML = '✨ Nueva versión — <b>Actualizar</b>';
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = 'Actualizando…';
      actualizandoPorBoton = true;
      reg.waiting.postMessage('SKIP_WAITING');
    });
    document.body.appendChild(btn);
  }

  window.addEventListener('load', () => {
    /* updateViaCache 'none': el sw y su version.js importado se piden
       frescos en cada chequeo — sin esto, el bump de versión no se ve */
    navigator.serviceWorker.register(rutaSW, { updateViaCache: 'none' }).then((reg) => {
      if (reg.waiting) avisarActualizacion(reg);
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisarActualizacion(reg);
        });
      });
      /* revisar al recuperar el foco y cada hora con la app abierta */
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => { /* sin sw (http plano, navegador viejo): el juego sigue normal */ });

    /* clients.claim() en el sw dispara "controllerchange" incluso en la
       primerísima instalación (una página sin controlador que recién
       queda controlada) — recargar ahí sería una recarga a traición.
       Solo recargamos cuando NOSOTROS pedimos la actualización. */
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargando || !actualizandoPorBoton) return;
      recargando = true;
      location.reload();
    });
  });
})();
