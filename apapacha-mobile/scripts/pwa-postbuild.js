// Post-build: inyecta el manifest PWA + registro del service worker en el HTML
// generado por `expo export`, y garantiza que los estáticos de public/ estén en dist/.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const INDEX = path.join(DIST, 'index.html');

// 1) Copiar public/ → dist/ (por si el exportador no lo hizo)
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
copyDir(PUBLIC, DIST);

// 2) Inyectar tags en el <head> y el registro del SW antes de </body>
if (!fs.existsSync(INDEX)) {
  console.error('[pwa] dist/index.html no encontrado — ¿corrió expo export?');
  process.exit(0);
}
let html = fs.readFileSync(INDEX, 'utf8');

// Expo emite un viewport sin `viewport-fit=cover`. En iOS instalado (standalone)
// eso deja `env(safe-area-inset-*)` en 0 y el contenido se mete bajo la barra de
// estado y el indicador de inicio.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover, shrink-to-fit=no" />'
);

if (!html.includes('id="pwa-safe-area"')) {
  const safeArea = `
    <style id="pwa-safe-area">
      /* El marco de la app queda fijo: sin esto, en iOS instalado el contenedor
         entero rebota al arrastrar (rubber-band) y la interfaz "se mueve".
         Anclamos html/body al viewport y desactivamos el encadenado del
         scroll; el desplazamiento ocurre solo dentro de las listas de la app. */
      html, body {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        overscroll-behavior: none;
      }
      /* En standalone no hay chrome del navegador: respetamos las safe areas. */
      #root {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        padding-right: env(safe-area-inset-right, 0px);
        box-sizing: border-box;
        overscroll-behavior: none;
      }
    </style>
  `;
  html = html.replace('</head>', `${safeArea}</head>`);
}

// Red de seguridad de arranque. Si la app no monta —el caso clásico es un
// index.html cacheado que pide un bundle con hash viejo, que ya no existe—
// no hay JavaScript de la app vivo para avisar de nada: el usuario ve una
// pantalla en blanco donde ni el botón de retroceso responde. Este script va
// inline en el HTML, así que sobrevive precisamente a ese fallo.
if (!html.includes('id="boot-watchdog"')) {
  const watchdog = `
    <script id="boot-watchdog">
      (function () {
        var YA = 'apapacha_recuperado';
        function recuperar(motivo) {
          var intento = 0;
          try { intento = parseInt(sessionStorage.getItem(YA) || '0', 10) || 0; } catch (e) {}
          if (intento >= 2) return;
          try { sessionStorage.setItem(YA, String(intento + 1)); } catch (e) {}

          var limpiar = [];
          // Primer intento: SOLO vaciar la caché, que es donde vive el HTML viejo.
          // Dar de baja el service worker destruiría la suscripción de push del
          // usuario, y volvería a quedarse sin avisos en el teléfono sin saber
          // por qué. Eso se reserva para el segundo intento.
          if (window.caches && caches.keys) {
            limpiar.push(caches.keys()
              .then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
              .catch(function () {}));
          }
          if (intento >= 1 && 'serviceWorker' in navigator) {
            limpiar.push(navigator.serviceWorker.getRegistrations()
              .then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })
              .catch(function () {}));
          } else if ('serviceWorker' in navigator) {
            limpiar.push(navigator.serviceWorker.getRegistrations()
              .then(function (rs) { return Promise.all(rs.map(function (r) { return r.update(); })); })
              .catch(function () {}));
          }

          Promise.all(limpiar).then(function () {
            location.replace(location.pathname + '?r=' + Date.now());
          });
        }

        // Un <script> que devuelve HTML (o 404) dispara este evento.
        window.addEventListener('error', function (e) {
          if (e && e.target && e.target.tagName === 'SCRIPT') recuperar('script');
        }, true);

        // Y si simplemente nunca montó nada, lo detectamos por el DOM vacío.
        window.addEventListener('load', function () {
          setTimeout(function () {
            var root = document.getElementById('root');
            if (!root || root.childElementCount === 0) recuperar('vacio');
          }, 9000);
        });

        // Arranque correcto: se limpia la marca para que la red siga disponible.
        window.addEventListener('load', function () {
          setTimeout(function () {
            var root = document.getElementById('root');
            if (root && root.childElementCount > 0) { try { sessionStorage.removeItem(YA); } catch (e) {} }
          }, 12000);
        });
      })();
    <\/script>
  `;
  html = html.replace('</head>', `${watchdog}</head>`);
}

if (!html.includes('rel="manifest"')) {
  const head = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#7C4DBB" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="ApapachaPet" />
    <meta name="application-name" content="ApapachaPet" />
    <meta name="description" content="Cuidado premium para gatos: alojamiento y visitas domiciliarias con cuidadores verificados." />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
  `;
  html = html.replace('</head>', `${head}</head>`);
}

if (!html.includes('serviceWorker.register')) {
  const reg = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          // ¿Ya había una versión controlando la página? En la primera visita no,
          // y ahí el cambio de control es normal: recargar sería gratuito.
          var teniaControlador = !!navigator.serviceWorker.controller;
          var recargando = false;

          navigator.serviceWorker.register('/sw.js').then(function (reg) {
            // Buscar actualizaciones al volver a primer plano. Una PWA instalada
            // no se recarga: se suspende y se reanuda, así que sin esto puede
            // quedarse días ejecutando una versión vieja aunque ya esté publicada
            // la nueva (pasó con el arreglo del botón de retroceso).
            document.addEventListener('visibilitychange', function () {
              if (!document.hidden) { try { reg.update(); } catch (e) {} }
            });
            setInterval(function () { try { reg.update(); } catch (e) {} }, 60 * 60 * 1000);
          }).catch(function (e) { console.warn('SW register failed', e); });

          // El service worker nuevo toma el control (usa skipWaiting +
          // clients.claim), pero la página sigue con el JavaScript viejo hasta
          // que se recarga. Esta es esa recarga, una sola vez.
          navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (!teniaControlador || recargando) return;
            recargando = true;
            window.location.reload();
          });
        });
      }
    </script>
  `;
  html = html.replace('</body>', `${reg}</body>`);
}

fs.writeFileSync(INDEX, html);
console.log('[pwa] manifest + service worker inyectados en dist/index.html');
