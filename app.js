const canvas = document.querySelector('#wheel');
const ctx = canvas.getContext('2d');
const input = document.querySelector('#movies');
const spinButton = document.querySelector('#spin');
const resetButton = document.querySelector('#reset');
const soundButton = document.querySelector('#sound');
const editor = document.querySelector('#movie-editor');
const palette = ['#ed771c', '#191512', '#bd4c0d', '#292019', '#fa912e', '#0e0d0c'];
let rotation = 0;
let spinning = false;
let winningIndex = -1;
let showAllHistory = false;
function loadSaved(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
const savedMovies = loadSaved('halloween-movies-v1', DEFAULT_MOVIES.join('\n'));
input.value = typeof savedMovies === 'string' ? savedMovies : DEFAULT_MOVIES.join('\n');
const savedHistory = loadSaved('halloween-history-v1', LEGACY_HISTORY);
let history = Object.fromEntries(Object.entries(savedHistory && typeof savedHistory === 'object' ? savedHistory : LEGACY_HISTORY).filter(([name, count]) => name && Number.isSafeInteger(count) && count > 0));
let soundEnabled = loadSaved('halloween-sound-v1', true) === true;
const rollSound = new Audio('slot.wav'); rollSound.loop = true; rollSound.volume = 0.25;
const endSound = new Audio('ding.mp3'); endSound.volume = 0.4;
function syncSoundButton() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  const label = soundEnabled ? 'Desativar som' : 'Ativar som';
  soundButton.setAttribute('aria-label', label); soundButton.title = label;
  soundButton.classList.toggle('is-muted', !soundEnabled);
}
function setSound(enabled) {
  soundEnabled = enabled; save('halloween-sound-v1', enabled); syncSoundButton();
  if (!enabled) { rollSound.pause(); rollSound.currentTime = 0; endSound.pause(); endSound.currentTime = 0; }
  else if (spinning) { rollSound.currentTime = 0; rollSound.play().catch(() => {}); }
}
syncSoundButton();
soundButton.addEventListener('click', () => setSound(!soundEnabled));
function renderHistory() {
  const list = document.querySelector('#history'); list.replaceChildren();
  const entries = Object.entries(history).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shown = showAllHistory ? entries : entries.slice(0, 5);
  for (const [title, count] of shown) {
    const row = document.createElement('li'); const name = document.createElement('span'); const badge = document.createElement('b');
    name.textContent = title; badge.textContent = `${count} ${count === 1 ? 'vez' : 'vezes'}`; row.append(name, badge); list.append(row);
  }
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  document.querySelector('#history-stats').textContent = `${entries.length} filmes diferentes · ${total} sorteios`;
  if (!entries.length) { const empty = document.createElement('li'); empty.textContent = 'O teu primeiro filme vai entrar para a história.'; list.append(empty); }
  const toggle = document.querySelector('#history-toggle');
  toggle.hidden = entries.length <= 5;
  toggle.textContent = showAllHistory ? 'Mostrar menos' : 'Mostrar mais';
}
document.querySelector('#history-toggle').addEventListener('click', () => { showAllHistory = !showAllHistory; renderHistory(); });
document.querySelector('#clear-history').addEventListener('click', () => {
  if (!spinning && confirm('Queres limpar o histórico deste navegador?')) { history = {}; showAllHistory = false; save('halloween-history-v1', history); renderHistory(); }
});
function movieList() { return [...new Set(input.value.split('\n').map(s => s.trim()).filter(Boolean))]; }
function randomIndex(length) {
  const range = 4294967296;
  const limit = range - (range % length);
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % length;
}
function drawWheel(movies = movieList()) {
  const items = movies.length ? movies : ['Adiciona filmes'];
  const step = Math.PI * 2 / items.length;
  ctx.clearRect(0, 0, 1000, 1000);
  ctx.save(); ctx.translate(500, 500); ctx.rotate(rotation);
  items.forEach((movie, index) => {
    const angle = -Math.PI / 2 + index * step;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 495, angle, angle + step); ctx.closePath();
    ctx.fillStyle = palette[index % palette.length]; ctx.fill();
    ctx.strokeStyle = index === winningIndex && !spinning ? '#fff1bf' : '#080706'; ctx.lineWidth = index === winningIndex && !spinning ? 12 : 3; ctx.stroke();
    ctx.save(); ctx.rotate(angle + step / 2); ctx.textAlign = 'right';
    ctx.fillStyle = '#fff0df';
    const size = Math.max(12, Math.min(27, 400 / items.length));
    ctx.font = `500 ${size}px "DM Sans", sans-serif`;
    let label = movie;
    const maxWidth = items.length > 35 ? 185 : 290;
    while (ctx.measureText(label).width > maxWidth && label.length > 1) label = label.slice(0, -1);
    if (label !== movie) label = label.slice(0, -1) + '…';
    if (items.length <= 60) ctx.fillText(label, 455, size / 3);
    ctx.restore();
  });
  ctx.restore();
}
function updateList() {
  save('halloween-movies-v1', input.value);
  const movies = movieList();
  document.querySelector('#count').textContent = movies.length;
  document.querySelector('#movie-summary-count').textContent = movies.length;
  const valid = movies.length >= 2 && movies.length <= 60;
  spinButton.disabled = !valid || spinning;
  document.querySelector('#list-status').textContent = movies.length > 60 ? 'Máximo de 60 filmes' : movies.length < 2 ? 'Adiciona pelo menos 2 filmes' : 'Lista pronta para rodar';
  document.querySelector('#hint').textContent = valid ? `${movies.length} filmes. Uma escolha. Tens coragem?` : 'Escolhe entre 2 e 60 filmes para começar.';
  winningIndex = -1;
  document.querySelector('#result').classList.remove('winner', 'reveal');
  document.querySelector('#result-label').textContent = 'O DESTINO ESTÁ À ESPERA';
  document.querySelector('#result-title').textContent = 'O próximo susto é uma surpresa.';
  document.querySelector('#result-description').textContent = 'Roda a roleta para descobrir.';
  drawWheel(movies);
}
function setEditorOpen(open) {
  editor.hidden = !open;
  document.querySelector('#edit-toggle').hidden = open;
  document.querySelector('#edit-toggle').setAttribute('aria-expanded', String(open));
  document.querySelector('#finish-edit').hidden = !open;
}
document.querySelector('#edit-toggle').addEventListener('click', () => setEditorOpen(true));
document.querySelector('#finish-edit').addEventListener('click', () => setEditorOpen(false));
setEditorOpen(false);
function spin() {
  const movies = movieList();
  if (spinning || movies.length < 2 || movies.length > 60) return;
  spinning = true; spinButton.disabled = true; input.disabled = true; resetButton.disabled = true;
  document.querySelector('#edit-toggle').disabled = true; document.querySelector('#finish-edit').disabled = true;
  document.querySelector('#clear-history').disabled = true; document.querySelector('#history-toggle').disabled = true;
  winningIndex = -1;
  if (soundEnabled) { rollSound.currentTime = 0; rollSound.play().catch(() => {}); }
  spinButton.innerHTML = '<span aria-hidden="true">↻</span> O destino está a escolher…';
  document.querySelector('#result-label').textContent = 'A RODAR…';
  document.querySelector('#result-title').textContent = 'Não espreites. Está quase.';
  document.querySelector('#result-description').textContent = 'Todos os filmes têm a mesma probabilidade.';
  document.querySelector('#result').classList.remove('winner', 'reveal');
  const winner = randomIndex(movies.length);
  const full = Math.PI * 2;
  const desired = (full - (winner + 0.5) * full / movies.length) % full;
  const start = rotation;
  const delta = 6 * full + ((desired - (start % full) + full) % full);
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 4600;
  return new Promise(resolve => {
    const started = performance.now();
    function frame(now) {
      const progress = duration === 0 ? 1 : Math.min(1, (now - started) / duration);
      rotation = start + delta * (1 - Math.pow(1 - progress, 5)); drawWheel(movies);
      if (progress < 1) { requestAnimationFrame(frame); return; }
      rotation %= full; spinning = false; input.disabled = false; resetButton.disabled = false; spinButton.disabled = false;
      document.querySelector('#edit-toggle').disabled = false; document.querySelector('#finish-edit').disabled = false;
      document.querySelector('#clear-history').disabled = false; document.querySelector('#history-toggle').disabled = false;
      rollSound.pause(); rollSound.currentTime = 0;
      if (soundEnabled) { endSound.currentTime = 0; endSound.play().catch(() => {}); }
      winningIndex = winner; drawWheel(movies);
      history[movies[winner]] = (history[movies[winner]] || 0) + 1; save('halloween-history-v1', history); renderHistory();
      spinButton.innerHTML = '<span aria-hidden="true">↻</span> Rodar outra vez <span class="arrow" aria-hidden="true">↗</span>';
      const result = document.querySelector('#result'); result.classList.add('winner', 'reveal');
      document.querySelector('#result-label').textContent = 'O FILME DESTA NOITE';
      document.querySelector('#result-title').textContent = movies[winner];
      document.querySelector('#result-description').textContent = 'Apaga as luzes e carrega no play. Boa sessão!';
      document.querySelector('#hint').textContent = 'O destino escolheu. Agora só faltam as pipocas.';
      resolve({ movie: movies[winner] });
    }
    requestAnimationFrame(frame);
  });
}
input.addEventListener('input', updateList);
spinButton.addEventListener('click', spin);
resetButton.addEventListener('click', () => { if (!spinning) { input.value = DEFAULT_MOVIES.join('\n'); updateList(); } });
updateList();
renderHistory();
document.fonts?.ready.then(() => drawWheel());
