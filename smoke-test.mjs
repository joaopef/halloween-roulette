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
assert.equal(node('i18n:collectionTitle').textContent, 'Movies on the wheel');
assert.equal(node('#history-stats').textContent, '17 unique movies · 24 draws');
assert.equal(node('#history').children.length, 5, 'language switch preserves wall of fame view');
assert.equal(node('#theme').value, 'halloween');

node('#edit-toggle').dispatch('click');
assert.equal(node('#movie-editor').hidden, false);
node('#movies').value = 'Only one\nOnly one\n'; node('#movies').dispatch('input');
assert.equal(node('#count').textContent, 1); assert.equal(node('#spin').disabled, true);
assert.match(node('#list-status').textContent, /at least 2/);
assert.equal(evaluate('spin()'), undefined);
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
assert.equal(JSON.parse(storage.get('cinema-roulette-v2')).soundEnabled, false);
node('#sound').dispatch('click');
assert.equal(JSON.parse(storage.get('cinema-roulette-v2')).soundEnabled, true);
const pendingSpin = evaluate('spin()');
assert.equal(animationFrames.length, 1);
assert.equal(audios[0].paused, false, 'roll sound starts during spin when enabled');
assert.equal(node('#movies').disabled, true); assert.equal(node('#reset').disabled, true);
node('#sound').dispatch('click');
assert.equal(audios.every(audio => audio.paused), true, 'disabling sound silences all audio immediately');
assert.equal(JSON.parse(storage.get('cinema-roulette-v2')).soundEnabled, false);
node('#sound').dispatch('click');
assert.equal(audios[0].paused, false, 'reenabling sound resumes the wheel while spinning');
assert.equal(node('#theme').disabled, true, 'theme cannot change in the middle of a spin');
app.setNow(5000); animationFrames.shift()(5000);
const result = await pendingSpin;
assert.ok(['A', 'B'].includes(result.movie));
assert.equal(node('#result-title').textContent, result.movie);
const titleBeforeLanguageChange = node('#result-title').textContent;
const descriptionBeforeLanguageChange = node('#result-description').textContent;
node('#language').value = 'pt-PT'; node('#language').dispatch('change');
assert.equal(node('#result-title').textContent, titleBeforeLanguageChange, 'language switch preserves selected movie');
assert.equal(node('#result-description').textContent, descriptionBeforeLanguageChange, 'language switch preserves current result');
assert.equal(node('#result').classList.contains('winner'), true);
assert.equal(node('#movies').disabled, false); assert.equal(node('#reset').disabled, false);
assert.equal(audios[0].paused, true);
assert.equal(audios[1].paused, false, 'ending chime plays after the spin when enabled');
const selectedByPointer = evaluate('Math.floor(((Math.PI * 2 - rotation) % (Math.PI * 2)) / (Math.PI * 2 / movieList().length))');
assert.equal(['A', 'B'][selectedByPointer], result.movie);
assert.equal(evaluate('winningIndex'), selectedByPointer, 'highlighted slice matches pointer and announcement');
assert.equal(JSON.parse(storage.get('cinema-roulette-v2')).themes.halloween.history[result.movie], 1);

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
assert.equal(node('#history-stats').textContent, '18 filmes diferentes · 25 sorteios');
node('#theme').value = 'christmas'; node('#theme').dispatch('change');
assert.equal(node('#movies').value, 'Holiday A (2000)\nHoliday B (2001)');
assert.equal(node('#history-stats').textContent, '0 filmes diferentes · 0 sorteios');

const migrated = await createApp({ 'halloween-movies-v1': 'Persisted One\nPersisted Two', 'halloween-history-v1': { 'Persisted One': 9 }, 'halloween-sound-v1': false });
assert.equal(migrated.node('#movies').value, 'Persisted One\nPersisted Two');
assert.equal(migrated.node('#history-stats').textContent, '1 filme diferente · 9 sorteios');
assert.equal(migrated.node('#sound').getAttribute('aria-pressed'), 'false');
assert.equal(migrated.storage.has('halloween-movies-v1'), true, 'legacy data remains as a recoverable backup');
const migratedAgain = await createApp(Object.fromEntries([...migrated.storage].map(([key, raw]) => [key, JSON.parse(raw)])));
assert.equal(migratedAgain.node('#history-stats').textContent, '1 filme diferente · 9 sorteios', 'repeated migration does not duplicate counts');
assert.equal(migratedAgain.node('#movies').value, 'Persisted One\nPersisted Two');

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
