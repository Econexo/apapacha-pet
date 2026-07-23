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
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
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
