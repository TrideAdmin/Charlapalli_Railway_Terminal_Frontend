/**
 * serve.js — Charlapalli Terminal · Frontend Static Server
 * ─────────────────────────────────────────────────────────
 * Serves all HTML, CSS, JS, and local images from this folder.
 * Reads .env for VITE_GOOGLE_MAPS_API_KEY and injects it into every
 * HTML response as window.GOOGLE_MAPS_API_KEY so the key lives only
 * in one place (.env) and never needs to be hardcoded in HTML files.
 *
 * Usage:  node serve.js
 *         PORT=8080 node serve.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

// ── Read .env (simple parser — no extra deps needed) ──────────────────────
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const m = line.match(/^\s*([\w]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
})();

const MAPS_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

// Snippet injected into <head> of every HTML page
const KEY_SNIPPET = MAPS_KEY
  ? `<script>window.GOOGLE_MAPS_API_KEY="${MAPS_KEY}";</script>`
  : '';

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext         = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, 'utf8', (err, raw) => {
    if (err) {
      // Try binary for images etc.
      fs.readFile(filePath, (e2, bin) => {
        if (e2) {
          fs.readFile(path.join(ROOT, '404.html'), (e3, d) => {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(e3 ? '<h1>404 Not Found</h1>' : d);
          });
        } else {
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          });
          res.end(bin);
        }
      });
      return;
    }

    // For HTML files: inject the Maps key snippet and strip any hardcoded
    // placeholder so the .env value is always the single source of truth.
    let body = raw;
    if (ext === '.html' && KEY_SNIPPET) {
      // Remove any existing hardcoded window.GOOGLE_MAPS_API_KEY script tags
      body = body.replace(
        /<script>\s*window\.GOOGLE_MAPS_API_KEY\s*=\s*['"][^'"]*['"]\s*;\s*<\/script>\n?/g,
        ''
      );
      // Also strip the placeholder from SDK loader src (key is not needed when using backend proxy)
      body = body.replace(
        /(src="https:\/\/maps\.googleapis\.com\/maps\/api\/js\?key=)[^"&]*/g,
        `$1${MAPS_KEY}`
      );
      // Inject our clean snippet right after <head>
      body = body.replace('<head>', `<head>\n  ${KEY_SNIPPET}`);
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  });
}).listen(PORT, () => {
  console.log('─────────────────────────────────────────────');
  console.log('  Charlapalli Terminal — Frontend');
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Google Maps key: ${MAPS_KEY ? MAPS_KEY.slice(0,12) + '…' : '⚠ NOT SET'}`);
  console.log(`  Backend API → ${process.env.BACKEND_URL || 'http://localhost:3001'}`);
  console.log('─────────────────────────────────────────────');
});
