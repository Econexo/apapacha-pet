// Service worker mínimo para instalación PWA (network-first con fallback a caché
// del app-shell). Se registra desde index.html tras el post-build.
const CACHE = 'apapacha-v5';
// Ojo: los iconos NO se precachean. iOS pide el apple-touch-icon justo al
// "Agregar a inicio", y una respuesta vieja del caché puede hacer que descarte
// el icono y use un fallback propio (captura de la página, fondo oscuro).
const SHELL = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // No interceptar API/Supabase ni websockets: siempre red.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Los iconos siempre desde la red: ver la nota de SHELL.
  if (url.pathname.startsWith('/icons/') || url.pathname.includes('apple-touch-icon')) return;

  // El HTML nunca se sirve desde caché salvo que se caiga la red en una
  // navegación. Un index.html viejo apunta a un bundle con otro hash; ese hash
  // ya no existe y —por el rewrite de vercel.json— devolvía el propio HTML con
  // status 200. El navegador intentaba ejecutar HTML como JavaScript y la app
  // no arrancaba: pantalla en blanco, sin siquiera botón de retroceso.
  const esNavegacion = req.mode === 'navigate';

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Solo cacheamos respuestas buenas y del tipo esperado. Si el servidor
        // devuelve HTML para un .js, no lo guardamos ni lo propagamos.
        const tipo = res.headers.get('content-type') || '';
        const esHtml = tipo.includes('text/html');
        if (!esNavegacion && esHtml) {
          throw new Error('respuesta HTML para un recurso estático');
        }
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          // El shell solo vale como respuesta a una navegación. Devolverlo para
          // un script era justo lo que rompía la app.
          if (esNavegacion) return caches.match('/');
          return Response.error();
        })
      )
  );
});

// ─── Web Push ────────────────────────────────────────────────────────────────
// El sonido lo pone el sistema operativo (el predeterminado del dispositivo):
// la API de Web Push no permite audio propio, y es justo lo que queremos.

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'ApapachaPet', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'ApapachaPet';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Agrupa por conversación/evento: una notificación nueva reemplaza la anterior
    // del mismo tag en vez de apilarse.
    tag: payload.tag || 'apapacha',
    renotify: true,
    data: { url: payload.url || '/' },
  };

  // SIEMPRE hay que mostrar una notificación: si no, el navegador puede
  // revocar el permiso de push.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Abrir la notificación tiene que llevar SIEMPRE a su pantalla. Antes se
// enfocaba la ventana ya abierta y se llamaba a client.navigate(), cuyo rechazo
// se tragaba un .catch() vacío: navigate() lanza en las ventanas que este
// service worker no controla (matchAll iba con includeUncontrolled), así que la
// app quedaba enfocada en la pantalla que ya estuviera —p. ej. las Reservas del
// cliente— y la notificación del cuidador parecía llevar al sitio equivocado.
//
// Ahora hay tres caminos, de mejor a peor: si la ventana SÍ está controlada, se
// le pasa el destino por postMessage y enruta por dentro sin recargar; si no,
// se navega de verdad; y si eso falla, se abre una ventana en el destino.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      // matchAll sin includeUncontrolled devuelve solo ventanas que este SW
      // controla, que son exactamente aquellas a las que postMessage llega.
      const controladas = await self.clients.matchAll({ type: 'window' });
      const controlada = controladas.find((c) => 'postMessage' in c);
      if (controlada) {
        try { await controlada.focus(); } catch (e) {}
        controlada.postMessage({ tipo: 'ir-a', url: target });
        return;
      }

      const todas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const abierta = todas.find((c) => 'focus' in c);
      if (abierta) {
        try { await abierta.focus(); } catch (e) {}
        if ('navigate' in abierta) {
          try {
            await abierta.navigate(target);
            return;
          } catch (e) {
            // Ventana sin controlar: navigate() no está permitido. Seguimos.
          }
        }
      }

      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});
