import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const i18nKeys = ['eyebrow', 'headline1', 'headline2', 'intro', 'wheelCaption', 'spin', 'collectionEyebrow', 'collectionTitle', 'collectionSummary', 'editMovies', 'editorHelp', 'moviesLabel', 'reset', 'finishEdit', 'historyEyebrow', 'clearHistory', 'historyNote', 'footerLeft', 'footerRight'];

async function createApp(seed = {}) {
  const nodes = new Map();
  function node(selector) {
    if (!nodes.has(selector)) {
      const classes = new Set();
      const n = { selector, value: '', textContent: '', innerHTML: '', disabled: false, checked: true, hidden: false, children: [], attributes: {}, listeners: {}, style: {}, dataset: {}, options: selector === '#theme' ? [{ textContent: '' }, { textContent: '' }] : [], classList: { add(...names) { names.forEach(name => classes.add(name)); }, remove(...names) { names.forEach(name => classes.delete(name)); }, toggle(name, force) { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name); }, contains: name => classes.has(name) }, addEventListener(type, fn) { this.listeners[type] = fn; }, dispatch(type) { return this.listeners[type]?.({ target: this }); }, setAttribute(name, value) { this.attributes[name] = value; }, getAttribute(name) { return this.attributes[name] ?? null; }, replaceChildren() { this.children = []; }, append(...items) { this.children.push(...items); } };
      n.firstElementChild = { style: {} };
      nodes.set(selector, n);
    }
    return nodes.get(selector);
  }
  const canvasContext = { createRadialGradient() { return { addColorStop() {} }; }, clearRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, moveTo() {}, arc() {}, closePath() {}, fill() {}, stroke() {}, fillText() {}, measureText: text => ({ width: text.length * 14 }) };
  node('#wheel').getContext = () => canvasContext;
  const storage = new Map(Object.entries(seed).map(([key, value]) => [key, JSON.stringify(value)]));
  const audios = [];
  const animationFrames = [];
  let now = 0;
  let reduceMotion = false;
  let confirmDecision = false;
  const sandbox = vm.createContext({ document: { querySelector: node, querySelectorAll: selector => selector === '[data-i18n]' ? i18nKeys.map(key => { const element = node(`i18n:${key}`); element.setAttribute('data-i18n', key); return element; }) : [], documentElement: {}, body: node('body'), createElement: () => ({ textContent: '', append() {}, children: [] }), fonts: null }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, Audio: class { constructor(src) { this.src = src; this.paused = true; this.playCount = 0; audios.push(this); } play() { this.paused = false; this.playCount++; return Promise.resolve(); } pause() { this.paused = true; } }, crypto: webcrypto, matchMedia: () => ({ matches: reduceMotion }), performance: { now: () => now }, requestAnimationFrame: fn => animationFrames.push(fn), confirm: () => confirmDecision });
  vm.runInContext(await readFile('movies.js', 'utf8'), sandbox);
  vm.runInContext(await readFile('app.js', 'utf8'), sandbox);
  return { node, storage, audios, animationFrames, sandbox, setNow: value => { now = value; }, setReduceMotion: value => { reduceMotion = value; }, setConfirm: value => { confirmDecision = value; } };
}

const app = await createApp();
const { node, storage, audios, animationFrames, sandbox } = app;
const evaluate = expression => vm.runInContext(expression, sandbox);
assert.equal(node('#count').textContent, 19);
assert.equal(node('#movie-summary-count').textContent, 19);
assert.equal(node('#movie-editor').hidden, true);
assert.equal(node('#edit-toggle').getAttribute('aria-expanded'), 'false');
assert.equal(node('#sound').getAttribute('aria-pressed'), 'true');
assert.equal(node('#sound').getAttribute('aria-label'), 'Desativar som');
assert.equal(node('#theme').value, 'halloween');
assert.equal(node('#history-stats').textContent, '17 filmes diferentes · 24 sorteios');
assert.equal(node('#history').children.length, 5);
assert.equal(audios.every(audio => audio.playCount === 0), true, 'page load must not autoplay');

node('#history-toggle').dispatch('click');
assert.equal(node('#history').children.length, 17);
assert.equal(node('#history-toggle').textContent, 'Mostrar menos');
node('#history-toggle').dispatch('click');
assert.equal(node('#history').children.length, 5);

node('#language').value = 'en'; node('#language').dispatch('change');
assert.equal(sandbox.document.documentElement.lang, 'en');
assert.equal(JSON.parse(storage.get('cinema-roulette-v3')).language, 'en', 'language preference persists');
assert.equal(node('i18n:collectionTitle').textContent, 'Movies on the wheel');
assert.equal(node('#history-stats').textContent, '17 unique movies · 24 draws');
assert.equal(node('#history').children.length, 5, 'language switch preserves wall of fame view');
assert.equal(node('#theme').value, 'halloween');

node('#edit-toggle').dispatch('click');
assert.equal(node('#movie-editor').hidden, false);
node('#movies').value = 'Only one\nOnly one\n'; node('#movies').dispatch('input');
assert.equal(node('#count').textContent, 1); assert.equal(node('#eligible-count').textContent, 1); assert.equal(node('#spin').disabled, false);
const singleSpin = evaluate('spin()'); app.setNow(5000); animationFrames.shift()(5000);
assert.equal((await singleSpin).movie, 'Only one', 'a single eligible movie can be drawn');
assert.equal(node('#history-stats').textContent, '18 unique movies · 25 draws');
node('#movies').value = 'A\nB'; node('#movies').dispatch('input');
assert.equal(evaluate('movieList().length'), 2, 'duplicates are removed');
const originalMovies = node('#movies').value;
node('#reset').dispatch('click');
assert.equal(node('#count').textContent, 19, 'reset restores the original selection');
node('#movies').value = originalMovies; node('#movies').dispatch('input');
node('#finish-edit').dispatch('click');
assert.equal(node('#movie-editor').hidden, true);

node('#sound').dispatch('click');
assert.equal(node('#sound').getAttribute('aria-pressed'), 'false');
assert.equal(node('#sound').getAttribute('aria-label'), 'Turn sound on');
assert.equal(JSON.parse(storage.get('cinema-roulette-v3')).soundEnabled, false);
node('#sound').dispatch('click');
assert.equal(JSON.parse(storage.get('cinema-roulette-v3')).soundEnabled, true);
const pendingSpin = evaluate('spin()');
assert.equal(animationFrames.length, 1);
assert.equal(audios[0].paused, false, 'roll sound starts during spin when enabled');
assert.equal(node('#movies').disabled, true); assert.equal(node('#reset').disabled, true);
node('#sound').dispatch('click');
assert.equal(audios.every(audio => audio.paused), true, 'disabling sound silences all audio immediately');
assert.equal(JSON.parse(storage.get('cinema-roulette-v3')).soundEnabled, false);
node('#sound').dispatch('click');
assert.equal(audios[0].paused, false, 'reenabling sound resumes the wheel while spinning');
assert.equal(node('#theme').disabled, true, 'theme cannot change in the middle of a spin');
app.setNow(10000); animationFrames.shift()(10000);
const result = await pendingSpin;
assert.ok(['A', 'B'].includes(result.movie));
assert.equal(node('#result-title').textContent, result.movie);
const titleBeforeLanguageChange = node('#result-title').textContent;
node('#language').value = 'pt-PT'; node('#language').dispatch('change');
assert.equal(node('#result-title').textContent, titleBeforeLanguageChange, 'language switch preserves selected movie');
assert.equal(node('#result-description').textContent, 'Apaga as luzes e carrega no play. Boa sessão!', 'language switch translates result instructions without changing the movie');
assert.equal(node('#result').classList.contains('winner'), true);
assert.equal(node('#movies').disabled, false); assert.equal(node('#reset').disabled, false);
assert.equal(audios[0].paused, true);
assert.equal(audios[1].paused, false, 'ending chime plays after the spin when enabled');
const selectedByPointer = evaluate('Math.floor(((Math.PI * 2 - rotation) % (Math.PI * 2)) / (Math.PI * 2 / movieList().length))');
assert.equal(['A', 'B'][selectedByPointer], result.movie);
assert.equal(evaluate('winningIndex'), selectedByPointer, 'highlighted slice matches pointer and announcement');
const historyBeforeViewed = JSON.stringify(JSON.parse(storage.get('cinema-roulette-v3')).themes.halloween.history);
node('#watch-toggle').dispatch('click');
assert.equal(node('#watch-toggle').textContent, 'Desmarcar como visto');
const savedAfterViewed = JSON.parse(storage.get('cinema-roulette-v3'));
assert.equal(savedAfterViewed.themes.halloween.viewed.includes(result.id), true);
assert.equal(JSON.stringify(savedAfterViewed.themes.halloween.history), historyBeforeViewed, 'marking watched does not change draw history');
node('#watch-toggle').dispatch('click');
assert.equal(node('#watch-toggle').textContent, 'Marcar como visto', 'watched status can be undone');
assert.equal(JSON.parse(storage.get('cinema-roulette-v3')).themes.halloween.viewed.includes(result.id), false);
node('#watch-toggle').dispatch('click');
node('#avoid-viewed').checked = true; node('#avoid-viewed').dispatch('change');
assert.equal(node('#eligible-count').textContent, 1, 'the watched result is excluded from the eligible count');
assert.equal(node('#spin').disabled, false, 'one unwatched movie is still enough to spin');
const remainingSpin = evaluate('spin()'); app.setNow(15000); animationFrames.shift()(15000);
const remainingResult = await remainingSpin;
assert.notEqual(remainingResult.id, result.id, 'avoiding watched movies excludes the watched result');
node('#watch-toggle').dispatch('click');
assert.equal(node('#eligible-count').textContent, 0, 'all watched movies exhaust the opt-in pool');
assert.equal(node('#spin').disabled, true);
assert.equal(node('#exhausted-actions').hidden, false);
node('#include-viewed').dispatch('click');
assert.equal(node('#eligible-count').textContent, 2, 'including watched movies restores the full pool');
node('#avoid-viewed').checked = true; node('#avoid-viewed').dispatch('change');
node('#reset-viewed').dispatch('click');
assert.equal(node('#eligible-count').textContent, 2, 'reset watched list leaves the playlist intact');
assert.equal(JSON.stringify(JSON.parse(storage.get('cinema-roulette-v3')).themes.halloween.history) === historyBeforeViewed, false, 'only actual spins add to history');

node('#sound').dispatch('click');
assert.equal(audios.every(audio => audio.paused), true, 'turning sound off after the spin silences the chime');
node('#movies').value = Array.from({ length: 61 }, (_, i) => `Film ${i}`).join('\n'); node('#movies').dispatch('input');
assert.equal(node('#spin').disabled, true); assert.match(node('#list-status').textContent, /60/);
node('#movies').value = Array.from({ length: 60 }, (_, i) => `Film ${i}`).join('\n'); node('#movies').dispatch('input');
assert.equal(node('#spin').disabled, false);

// Theme state stays independent, including the curated Christmas starter list.
node('#theme').value = 'christmas'; node('#theme').dispatch('change');
assert.equal(node('#count').textContent, 13);
assert.equal(node('#history-stats').textContent, '0 filmes diferentes · 0 sorteios');
assert.equal(node('body').dataset.theme, 'christmas');
assert.equal(node('#brand-name').innerHTML, 'CHRISTMAS <b>ROULETTE</b>');
assert.equal(node('#movies').value.includes('Klaus (2019)'), true);
node('#movies').value = 'Holiday A (2000)\nHoliday B (2001)'; node('#movies').dispatch('input');
node('#theme').value = 'halloween'; node('#theme').dispatch('change');
assert.equal(node('#count').textContent, 60);
assert.equal(node('#history-stats').textContent, '20 filmes diferentes · 27 sorteios');
node('#theme').value = 'christmas'; node('#theme').dispatch('change');
assert.equal(node('#movies').value, 'Holiday A (2000)\nHoliday B (2001)');
assert.equal(node('#history-stats').textContent, '0 filmes diferentes · 0 sorteios');
assert.equal(JSON.parse(storage.get('cinema-roulette-v3')).activeTheme, 'christmas', 'theme preference persists');
const restoredTheme = await createApp(Object.fromEntries([...storage].map(([key, raw]) => [key, JSON.parse(raw)])));
assert.equal(restoredTheme.node('#theme').value, 'christmas');
assert.equal(restoredTheme.node('#language').value, 'pt-PT');
assert.equal(restoredTheme.node('#movies').value, 'Holiday A (2000)\nHoliday B (2001)');

const migrated = await createApp({ 'halloween-movies-v1': 'Persisted One\nPersisted Two', 'halloween-history-v1': { 'Persisted One': 9 }, 'halloween-sound-v1': false });
assert.equal(migrated.node('#movies').value, 'Persisted One\nPersisted Two');
assert.equal(migrated.node('#history-stats').textContent, '1 filme diferente · 9 sorteios');
assert.equal(migrated.node('#sound').getAttribute('aria-pressed'), 'false');
assert.equal(migrated.storage.has('halloween-movies-v1'), true, 'legacy data remains as a recoverable backup');
const migratedAgain = await createApp(Object.fromEntries([...migrated.storage].map(([key, raw]) => [key, JSON.parse(raw)])));
assert.equal(migratedAgain.node('#history-stats').textContent, '1 filme diferente · 9 sorteios', 'repeated migration does not duplicate counts');
assert.equal(migratedAgain.node('#movies').value, 'Persisted One\nPersisted Two');
const migratedV2 = await createApp({ 'cinema-roulette-v2': { version: 2, activeTheme: 'halloween', language: 'pt-PT', soundEnabled: true, themes: { halloween: { movies: 'Old A (1990)\nOld B (1991)', history: { 'Old A (1990)': 3 } }, christmas: { movies: 'New Year Film (2000)', history: {} } } } });
assert.equal(migratedV2.node('#history-stats').textContent, '1 filme diferente · 3 sorteios');
assert.deepEqual(JSON.parse(migratedV2.storage.get('cinema-roulette-v3')).themes.halloween.playlist.map(movie => movie.id), ['manual:old a (1990)', 'manual:old b (1991)']);
assert.equal(migratedV2.storage.has('cinema-roulette-v2'), true, 'version 2 remains recoverable after migration');

const emptyHistory = await createApp({ 'cinema-roulette-v2': { version: 2, activeTheme: 'halloween', language: 'pt-PT', soundEnabled: true, themes: { halloween: { movies: 'A\nB', history: {} }, christmas: { movies: 'C\nD', history: {} } } } });
assert.equal(emptyHistory.node('#history-stats').textContent, '0 filmes diferentes · 0 sorteios');
assert.equal(emptyHistory.node('#history').children.length, 1);
assert.equal(emptyHistory.node('#history-toggle').hidden, true);
const clearHistory = await createApp({ 'cinema-roulette-v2': { version: 2, activeTheme: 'halloween', language: 'pt-PT', soundEnabled: true, themes: { halloween: { movies: 'A\nB', history: { 'Film A': 2 } }, christmas: { movies: 'C\nD', history: {} } } } });
clearHistory.node('#clear-history').dispatch('click');
assert.equal(clearHistory.node('#history-stats').textContent, '1 filme diferente · 2 sorteios', 'declining confirmation preserves history');
clearHistory.setConfirm(true); clearHistory.node('#clear-history').dispatch('click');
assert.equal(clearHistory.node('#history-stats').textContent, '0 filmes diferentes · 0 sorteios', 'history clears only after confirmation');

const reducedMotion = await createApp();
reducedMotion.setReduceMotion(true);
const reducedSpin = vm.runInContext('spin()', reducedMotion.sandbox);
assert.equal(reducedMotion.animationFrames.length, 1);
reducedMotion.animationFrames.shift()(0);
assert.ok((await reducedSpin).movie);
assert.equal(reducedMotion.animationFrames.length, 0, 'reduced motion completes without animation frames');
const longTitles = ['A Very Long Full Movie Title That Must Remain Intact (2026)', 'Another Complete Movie Title (2025)'];
const longTitleApp = await createApp({ 'halloween-movies-v1': longTitles.join('\n') });
const longTitleSpin = vm.runInContext('spin()', longTitleApp.sandbox);
longTitleApp.setNow(5000); longTitleApp.animationFrames.shift()(5000);
const longTitleResult = await longTitleSpin;
assert.ok(longTitles.includes(longTitleResult.movie));
assert.equal(longTitleApp.node('#result-title').textContent, longTitleResult.movie, 'long selected title remains complete in the result');
assert.equal(longTitleApp.node('#movies').value, longTitles.join('\n'), 'editor keeps the complete movie titles');

const html = await readFile('index.html', 'utf8');
const css = await readFile('style.css', 'utf8');
assert.match(html, /Wall of Fame/); assert.match(html, /aria-live="polite"/); assert.match(html, /<svg/);
assert.match(css, /:focus-visible/); assert.match(css, /prefers-reduced-motion:reduce/); assert.match(css, /min-width:44px/);
console.log('Passed: original 19-film collection, PT/EN language persistence, Halloween/Christmas isolation, idempotent legacy migration, audio before/during/after spin, pointer/result/highlight alignment, compact top-five Wall of Fame, list editing, keyboard focus hooks and reduced motion.');
