// Service worker mínimo para instalación PWA (network-first con fallback a caché
// del app-shell). Se registra desde index.html tras el post-build.
const CACHE = 'apapacha-v4';
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

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) return client.navigate(target).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
