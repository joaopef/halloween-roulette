import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/movies.js': ['movies.js', 'text/javascript; charset=utf-8'], '/catalog.js': ['catalog.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'], '/slot.wav': ['slot.wav', 'audio/wav'], '/ding.mp3': ['ding.mp3', 'audio/mpeg'] };
for (const name of ['translations', 'storage', 'tmdb', 'drawing', 'collection']) files[`/${name}.js`] = [`${name}.js`, 'text/javascript; charset=utf-8'];
for (const name of ['halloween-theme', 'witch-laugh', 'witch-laugh-evil', 'zombie']) files[`/audio/${name}.mp3`] = [`audio/${name}.mp3`, 'audio/mpeg'];
for (const name of ['haunted-door-rotten', 'haunted-door-splintered']) files[`/${name}.svg`] = [`${name}.svg`, 'image/svg+xml'];
http.createServer(async (req, res) => {
  files['/halloween-landscape.svg'] = ['halloween-landscape.svg', 'image/svg+xml'];
  files['/haunted-wheel.svg'] = ['haunted-wheel.svg', 'image/svg+xml'];
  files['/haunted-door.svg'] = ['haunted-door.svg', 'image/svg+xml'];
  for (const creature of ['zombie', 'witch', 'ghost']) files[`/door-${creature}.wav`] = [`door-${creature}.wav`, 'audio/wav'];
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  try { const content = await readFile(new URL(file[0], import.meta.url)); res.writeHead(200, { 'Content-Type': file[1] }); res.end(content); }
  catch { res.writeHead(500); res.end('Unable to load file'); }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Halloween Roulette server ready'));
