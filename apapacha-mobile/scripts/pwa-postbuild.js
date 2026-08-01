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
          navigator.serviceWorker.register('/sw.js').catch(function (e) { console.warn('SW register failed', e); });
        });
      }
    </script>
  `;
  html = html.replace('</body>', `${reg}</body>`);
}

fs.writeFileSync(INDEX, html);
console.log('[pwa] manifest + service worker inyectados en dist/index.html');
