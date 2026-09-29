import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/movies.js': ['movies.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'], '/slot.wav': ['slot.wav', 'audio/wav'], '/ding.mp3': ['ding.mp3', 'audio/mpeg'] };
http.createServer(async (req, res) => {
  files['/halloween-landscape.svg'] = ['halloween-landscape.svg', 'image/svg+xml'];
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  try { const content = await readFile(new URL(file[0], import.meta.url)); res.writeHead(200, { 'Content-Type': file[1] }); res.end(content); }
  catch { res.writeHead(500); res.end('Unable to load file'); }
}).listen(4173, '127.0.0.1', () => console.log('Halloween Roulette: http://127.0.0.1:4173'));
