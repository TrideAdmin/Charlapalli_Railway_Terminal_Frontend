/**
 * serve.js — Charlapalli Terminal · Frontend Static Server
 * ─────────────────────────────────────────────────────────
 * Serves all HTML, CSS, JS, and local images from this folder.
 * In production use Nginx, Netlify, Vercel, or any CDN instead.
 *
 * Usage:  node serve.js
 *         PORT=8080 node serve.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

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

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, '404.html'), (e, d) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(e ? '<h1>404 Not Found</h1>' : d);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext.match(/\.(jpg|jpeg|png|webp|svg|ico)$/) ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('─────────────────────────────────────────────');
  console.log('  Charlapalli Terminal — Frontend');
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Backend API → ${process.env.BACKEND_URL || 'https://charlapalli-railway-terminal-api.tride.live'}`);
  console.log('─────────────────────────────────────────────');
});
