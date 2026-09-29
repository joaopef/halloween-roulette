const canvas = document.querySelector('#wheel');
const ctx = canvas.getContext('2d');
const input = document.querySelector('#movies');
const spinButton = document.querySelector('#spin');
const resetButton = document.querySelector('#reset');
const soundButton = document.querySelector('#sound');
const editor = document.querySelector('#movie-editor');
const languageSelect = document.querySelector('#language');
const themeSelect = document.querySelector('#theme');
const watchButton = document.querySelector('#watch-toggle');
const avoidViewedInput = document.querySelector('#avoid-viewed');
const spinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5"/></svg>';
const STORAGE_KEY = 'cinema-roulette-v3';
const PREVIOUS_STORAGE_KEY = 'cinema-roulette-v2';
const HISTORY_LIMIT = 5;
let rotation = 0;
let spinning = false;
let winningIndex = -1;
let showAllHistory = false;
let lastResultMovieId = null;

const COPY = {
  'pt-PT': {
    pageTitleHalloween: 'Halloween Roulette — O teu próximo filme', pageTitleChristmas: 'Christmas Roulette — O teu próximo filme',
    pageDescriptionHalloween: 'Deixa a sorte escolher o filme de terror desta noite. Uma roleta de Halloween com uma lista de filmes personalizável.', pageDescriptionChristmas: 'Deixa a magia escolher o filme de Natal desta noite. Uma roleta com uma lista de filmes personalizável.',
    brandHalloween: 'HALLOWEEN <b>ROULETTE</b>', brandChristmas: 'CHRISTMAS <b>ROULETTE</b>',
    halloween: 'Halloween', christmas: 'Natal',
    eyebrow: 'UMA SESSÃO ESCOLHIDA PELO DESTINO', headline1: 'A noite é tua.', headline2: 'O filme é da sorte.', intro: 'Entre bruxas, fantasmas e pesadelos. Roda e descobre o que te espera.',
    wheelCaption: 'A RODA DOS ARREPIOS', wheelOrbit: '✦ &nbsp; QUE A SORTE TE ASSOMBRE &nbsp; ✦', spin: 'Rodar a roleta', spinAgain: 'Rodar outra vez', spinning: 'A escolher…',
    collectionEyebrow: 'A TUA SESSÃO DE CINEMA', collectionTitle: 'Filmes na roleta', collectionSummary: 'possibilidades para esta noite. A tua coleção, pronta a entrar em cena.', editMovies: 'Editar filmes', editorHelp: 'Um filme por linha. Troca, acrescenta ou elimina títulos.', moviesLabel: 'Filmes a incluir na roleta, um por linha', reset: 'Repor a seleção inicial', finishEdit: 'Concluir edição',
    eligibleMovies: count => `${count} ${count === 1 ? 'filme elegível' : 'filmes elegíveis'}`, avoidViewed: 'Evitar filmes já vistos', exhausted: 'Todos os filmes da lista estão marcados como vistos. Podes incluir os vistos ou reiniciar a lista de vistos deste tema.', includeViewed: 'Incluir filmes vistos', resetViewed: 'Reiniciar lista de vistos',
    markViewed: 'Marcar como visto', undoViewed: 'Desmarcar como visto', viewed: 'Visto',
    historyEyebrow: 'AS SESSÕES PASSADAS', clearHistory: 'Limpar histórico', historyNote: 'Os sorteios ficam guardados apenas neste navegador.',
    historyStats: (movies, draws) => `${movies} ${movies === 1 ? 'filme diferente' : 'filmes diferentes'} · ${draws} ${draws === 1 ? 'sorteio' : 'sorteios'}`,
    historyCount: count => `${count} ${count === 1 ? 'vez' : 'vezes'}`, emptyHistory: 'O teu primeiro filme vai entrar para a história.', more: 'Mostrar mais', less: 'Mostrar menos',
    ready: 'Lista pronta para rodar', maximum: 'Máximo de 60 filmes', atLeastTwo: 'Adiciona pelo menos 1 filme', chooseRange: 'Adiciona até 60 filmes para começar.', hint: count => `${count} filmes elegíveis. Uma escolha. Tens coragem?`,
    resultIdleLabel: 'O DESTINO ESTÁ À ESPERA', resultIdleTitle: 'O próximo filme é uma surpresa.', resultIdleDescription: 'Roda a roleta para descobrir.',
    spinningLabel: 'A RODAR…', spinningTitle: 'Não espreites. Está quase.', spinningDescription: 'Todos os filmes têm a mesma probabilidade.', resultLabel: 'O FILME DESTA NOITE', resultDescription: 'Apaga as luzes e carrega no play. Boa sessão!', resultHint: 'O destino escolheu. Agora só faltam as pipocas.',
    confirmClearHistory: 'Queres limpar o histórico deste tema neste navegador?', soundOn: 'Desativar som', soundOff: 'Ativar som', playArea: 'Roleta de filmes', canvasLabel: 'Roleta com os filmes da lista', languageLabel: 'Idioma da interface', themeLabel: 'Tema da roleta',
    footerLeft: 'FEITO PARA NOITES QUE NÃO TE DEIXAM DORMIR.', footerRight: 'Boa sessão. Vais precisar de pipocas.'
  },
  en: {
    pageTitleHalloween: 'Halloween Roulette — Your next movie', pageTitleChristmas: 'Christmas Roulette — Your next movie',
    pageDescriptionHalloween: 'Let fate pick tonight’s spooky movie. A Halloween roulette with a customizable movie list.', pageDescriptionChristmas: 'Let movie magic pick tonight’s Christmas film. A roulette with a customizable movie list.',
    brandHalloween: 'HALLOWEEN <b>ROULETTE</b>', brandChristmas: 'CHRISTMAS <b>ROULETTE</b>', halloween: 'Halloween', christmas: 'Christmas',
    eyebrow: 'A MOVIE NIGHT CHOSEN BY FATE', headline1: 'Your night.', headline2: 'The film is up to fate.', intro: 'Among witches, ghosts and nightmares. Spin to see what awaits.',
    wheelCaption: 'THE SHIVER SPINNER', wheelOrbit: '✦ &nbsp; LET FATE HAUNT YOU &nbsp; ✦', spin: 'Spin the wheel', spinAgain: 'Spin again', spinning: 'Choosing…',
    collectionEyebrow: 'YOUR MOVIE NIGHT', collectionTitle: 'Movies on the wheel', collectionSummary: 'possibilities for tonight. Your collection is ready for its close-up.', editMovies: 'Edit movies', editorHelp: 'One movie per line. Add, replace or remove titles.', moviesLabel: 'Movies on the wheel, one per line', reset: 'Restore starter selection', finishEdit: 'Done editing',
    eligibleMovies: count => `${count} ${count === 1 ? 'eligible movie' : 'eligible movies'}`, avoidViewed: 'Avoid movies already watched', exhausted: 'Every movie in this collection is marked as watched. Include watched movies or reset this theme’s watched list.', includeViewed: 'Include watched movies', resetViewed: 'Reset watched list',
    markViewed: 'Mark as watched', undoViewed: 'Undo watched status', viewed: 'Watched',
    historyEyebrow: 'PAST MOVIE NIGHTS', clearHistory: 'Clear history', historyNote: 'Draws are stored only in this browser.',
    historyStats: (movies, draws) => `${movies} unique ${movies === 1 ? 'movie' : 'movies'} · ${draws} ${draws === 1 ? 'draw' : 'draws'}`,
    historyCount: count => `${count} ${count === 1 ? 'time' : 'times'}`, emptyHistory: 'Your first movie is waiting to make history.', more: 'Show more', less: 'Show less',
    ready: 'Ready to spin', maximum: 'Maximum of 60 movies', atLeastTwo: 'Add at least 2 movies', chooseRange: 'Choose between 2 and 60 movies to begin.', hint: count => `${count} movies. One choice. Dare to spin?`,
    resultIdleLabel: 'FATE IS WAITING', resultIdleTitle: 'The next movie is a surprise.', resultIdleDescription: 'Spin the wheel to find out.',
    spinningLabel: 'SPINNING…', spinningTitle: 'No peeking. Almost there.', spinningDescription: 'Every movie has an equal chance.', resultLabel: 'TONIGHT’S MOVIE', resultDescription: 'Turn off the lights and press play. Enjoy!', resultHint: 'Fate has chosen. All that’s left is popcorn.',
    confirmClearHistory: 'Clear the history for this theme in this browser?', soundOn: 'Turn sound off', soundOff: 'Turn sound on', playArea: 'Movie roulette', canvasLabel: 'Wheel showing the movies in the list', languageLabel: 'Interface language', themeLabel: 'Roulette theme',
    footerLeft: 'MADE FOR NIGHTS THAT KEEP YOU AWAKE.', footerRight: 'Enjoy the show. Bring popcorn.'
  }
};

function parseStored(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function normalizeTitle(title) { return String(title ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US'); }
function manualId(title) { return `manual:${normalizeTitle(title)}`; }
function createMovie(title, source = 'manual', extra = {}) {
  const cleanTitle = String(title ?? '').trim();
  const parsedYear = cleanTitle.match(/\((\d{4})\)\s*$/)?.[1];
  const year = Number.isSafeInteger(extra.year) ? extra.year : parsedYear ? Number(parsedYear) : null;
  return {
    id: typeof extra.id === 'string' && extra.id ? extra.id : manualId(cleanTitle),
    title: cleanTitle, year,
    runtimeMinutes: Number.isSafeInteger(extra.runtimeMinutes) && extra.runtimeMinutes > 0 ? extra.runtimeMinutes : null,
    genres: Array.isArray(extra.genres) ? extra.genres.filter(value => typeof value === 'string') : [],
    moods: Array.isArray(extra.moods) ? extra.moods.filter(value => typeof value === 'string') : [],
    overview: extra.overview && typeof extra.overview === 'object' ? extra.overview : null,
    posterUrl: typeof extra.posterUrl === 'string' ? extra.posterUrl : null,
    tmdbRating: Number.isFinite(extra.tmdbRating) ? extra.tmdbRating : null,
    tmdbId: Number.isSafeInteger(extra.tmdbId) ? extra.tmdbId : null,
    imdbId: typeof extra.imdbId === 'string' ? extra.imdbId : null,
    source: typeof extra.source === 'string' ? extra.source : source
  };
}
function parseMovieLines(value) {
  const seen = new Set();
  return String(value ?? '').split('\n').map(line => line.trim()).filter(title => {
    const key = normalizeTitle(title);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  }).map(title => createMovie(title));
}
function sanitizePlaylist(value, fallback) {
  if (!Array.isArray(value)) return parseMovieLines(fallback);
  const seen = new Set();
  return value.filter(movie => movie && typeof movie.title === 'string' && movie.title.trim()).map(movie => createMovie(movie.title, 'manual', movie)).filter(movie => {
    if (!movie.id || seen.has(movie.id)) return false;
    seen.add(movie.id); return true;
  });
}
function sanitizeHistory(value, playlist) {
  const records = {};
  const byTitle = new Map(playlist.map(movie => [normalizeTitle(movie.title), movie]));
  for (const [key, entry] of Object.entries(value && typeof value === 'object' ? value : {})) {
    const isLegacyCount = Number.isSafeInteger(entry) && entry > 0;
    const title = isLegacyCount ? key : entry && typeof entry.title === 'string' ? entry.title : '';
    const count = isLegacyCount ? entry : entry && Number.isSafeInteger(entry.count) ? entry.count : 0;
    if (!title.trim() || count < 1) continue;
    const movie = byTitle.get(normalizeTitle(title)) ?? createMovie(title);
    const id = !isLegacyCount && typeof entry.id === 'string' ? entry.id : movie.id;
    records[id] = { id, title, count };
  }
  return records;
}
function makeThemeState(playlistInput, historyInput, flags = {}) {
  const playlist = Array.isArray(playlistInput) ? sanitizePlaylist(playlistInput, '') : parseMovieLines(playlistInput);
  const history = sanitizeHistory(historyInput, playlist);
  const viewed = Array.isArray(flags.viewed) ? [...new Set(flags.viewed.filter(id => typeof id === 'string'))] : [];
  return { playlist, history, viewed, avoidViewed: flags.avoidViewed === true };
}
function migrateOldTheme(inputTheme, fallbackMovies, fallbackHistory) {
  const movies = typeof inputTheme?.movies === 'string' ? inputTheme.movies : Array.isArray(inputTheme?.playlist) ? inputTheme.playlist : fallbackMovies;
  const history = inputTheme?.history ?? fallbackHistory;
  return makeThemeState(movies, history, inputTheme ?? {});
}
function initialState() {
  const existing = parseStored(STORAGE_KEY, null);
  if (existing && existing.version === 3 && existing.themes?.halloween && existing.themes?.christmas) {
    return {
      version: 3,
      activeTheme: existing.activeTheme === 'christmas' ? 'christmas' : 'halloween',
      language: existing.language === 'en' ? 'en' : 'pt-PT',
      soundEnabled: existing.soundEnabled !== false,
      themes: {
        halloween: makeThemeState(existing.themes.halloween.playlist, existing.themes.halloween.history, existing.themes.halloween),
        christmas: makeThemeState(existing.themes.christmas.playlist, existing.themes.christmas.history, existing.themes.christmas)
      }
    };
  }
  const previous = parseStored(PREVIOUS_STORAGE_KEY, null);
  if (previous && previous.version === 2 && previous.themes?.halloween && previous.themes?.christmas) {
    return {
      version: 3,
      activeTheme: previous.activeTheme === 'christmas' ? 'christmas' : 'halloween',
      language: previous.language === 'en' ? 'en' : 'pt-PT',
      soundEnabled: typeof previous.soundEnabled === 'boolean' ? previous.soundEnabled : parseStored('halloween-sound-v1', true) === true,
      themes: {
        halloween: migrateOldTheme(previous.themes.halloween, DEFAULT_MOVIES.join('\n'), LEGACY_HISTORY),
        christmas: migrateOldTheme(previous.themes.christmas, CHRISTMAS_MOVIES.join('\n'), {})
      }
    };
  }
  // Import the original v1 values once, keeping the source keys as recovery copies.
  const savedMovies = parseStored('halloween-movies-v1', DEFAULT_MOVIES.join('\n'));
  const savedHistory = parseStored('halloween-history-v1', LEGACY_HISTORY);
  return {
    version: 3,
    activeTheme: parseStored('cinema-theme-v1', 'halloween') === 'christmas' ? 'christmas' : 'halloween',
    language: parseStored('cinema-language-v1', 'pt-PT') === 'en' ? 'en' : 'pt-PT',
    soundEnabled: parseStored('halloween-sound-v1', true) === true,
    themes: {
      halloween: makeThemeState(typeof savedMovies === 'string' ? savedMovies : DEFAULT_MOVIES.join('\n'), savedHistory),
      christmas: makeThemeState(CHRISTMAS_MOVIES.join('\n'), {})
    }
  };
}
const state = initialState();
let activeTheme = state.activeTheme;
let language = state.language;
let soundEnabled = state.soundEnabled;
let themeData = state.themes[activeTheme];
let history = themeData.history;
let viewed = themeData.viewed;
let avoidViewed = themeData.avoidViewed;
input.value = themeData.playlist.map(movie => movie.title).join('\n');

function playlistRecords() { return themeData.playlist; }
function reconcilePlaylist(value) {
  const previous = playlistRecords();
  const byTitle = new Map(previous.map(movie => [normalizeTitle(movie.title), movie]));
  const byId = new Map(previous.map(movie => [movie.id, movie]));
  return parseMovieLines(value).map(parsed => {
    const existingMovie = byTitle.get(normalizeTitle(parsed.title)) ?? byId.get(parsed.id);
    return existingMovie ? createMovie(existingMovie.title, existingMovie.source, existingMovie) : parsed;
  });
}
function persistState() {
  state.version = 3;
  state.activeTheme = activeTheme;
  state.language = language;
  state.soundEnabled = soundEnabled;
  themeData.playlist = reconcilePlaylist(input.value);
  themeData.history = history;
  themeData.viewed = viewed;
  themeData.avoidViewed = avoidViewed;
  return save(STORAGE_KEY, state);
}
function translate(key, ...args) {
  const value = COPY[language][key];
  return typeof value === 'function' ? value(...args) : value;
}
function renderLanguage() {
  document.documentElement.lang = language;
  const pageThemeKey = activeTheme === 'christmas' ? 'Christmas' : 'Halloween';
  document.title = translate(`pageTitle${pageThemeKey}`);
  document.querySelector('meta[name="description"]').setAttribute('content', translate(`pageDescription${pageThemeKey}`));
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key && COPY[language][key]) element.textContent = translate(key);
  });
  document.querySelector('.play-area').setAttribute('aria-label', translate('playArea'));
  canvas.setAttribute('aria-label', translate('canvasLabel'));
  languageSelect.setAttribute('aria-label', translate('languageLabel'));
  themeSelect.setAttribute('aria-label', translate('themeLabel'));
  themeSelect.options[0].textContent = `🎃 ${translate('halloween')}`;
  themeSelect.options[1].textContent = `🎄 ${translate('christmas')}`;
  document.querySelector('[data-i18n="footerLeft"]').textContent = translate('footerLeft');
  document.querySelector('[data-i18n="footerRight"]').textContent = translate('footerRight');
  document.querySelector('#brand-name').innerHTML = activeTheme === 'christmas' ? COPY[language].brandChristmas : COPY[language].brandHalloween;
  document.querySelector('[data-i18n="eyebrow"]').textContent = activeTheme === 'christmas'
    ? (language === 'pt-PT' ? 'UMA SESSÃO ESCOLHIDA PELA SORTE' : 'A MOVIE NIGHT CHOSEN BY CHANCE')
    : translate('eyebrow');
  document.querySelector('[data-i18n="headline2"]').textContent = activeTheme === 'christmas'
    ? (language === 'pt-PT' ? 'A magia escolhe o filme.' : 'Let movie magic choose.')
    : translate('headline2');
  document.querySelector('.wheel-caption').textContent = activeTheme === 'christmas'
    ? (language === 'pt-PT' ? 'A RODA DOS CLÁSSICOS DE NATAL' : 'THE CHRISTMAS CLASSICS WHEEL')
    : translate('wheelCaption');
  document.querySelector('.wheel-orbit').innerHTML = activeTheme === 'christmas'
    ? (language === 'pt-PT' ? '✦ &nbsp; QUE A MAGIA ESCOLHA &nbsp; ✦' : '✦ &nbsp; LET THE MAGIC CHOOSE &nbsp; ✦')
    : translate('wheelOrbit');
  syncSoundButton();
  document.querySelector('#eligible-label').textContent = translate('eligibleMovies', Number(document.querySelector('#eligible-count').textContent) || 0);
  document.querySelector('#avoid-viewed-label').textContent = translate('avoidViewed');
  document.querySelector('#exhausted-message').textContent = translate('exhausted');
  document.querySelector('#include-viewed').textContent = translate('includeViewed');
  document.querySelector('#reset-viewed').textContent = translate('resetViewed');
  renderHistory();
  syncWatchButton();
  renderEligibility(false);
  if (!spinning && winningIndex < 0) {
    document.querySelector('#result-label').textContent = translate('resultIdleLabel');
    document.querySelector('#result-title').textContent = translate('resultIdleTitle');
    document.querySelector('#result-description').textContent = translate('resultIdleDescription');
  } else if (spinning) {
    document.querySelector('#result-label').textContent = translate('spinningLabel');
    document.querySelector('#result-title').textContent = translate('spinningTitle');
    document.querySelector('#result-description').textContent = translate('spinningDescription');
  }
  if (!spinning) spinButton.innerHTML = spinIcon + `<span>${winningIndex < 0 ? translate('spin') : translate('spinAgain')}</span>`;
  if (lastResultMovieId) document.querySelector('#result-description').textContent = translate('resultDescription');
}
function syncTheme() {
  renderLanguage();
  document.body.dataset.theme = activeTheme;
  themeSelect.value = activeTheme;
  document.querySelector('#wheel-theme-label').textContent = activeTheme === 'christmas' ? 'CHRISTMAS' : 'HALLOWEEN';
  document.querySelector('.wheel-center svg').style.color = activeTheme === 'christmas' ? '#f4db92' : '#ffa537';
  document.querySelector('.wheel-center svg').innerHTML = activeTheme === 'christmas'
    ? '<path d="M32 5 37 24 53 14 44 31 62 35 44 40 54 57 37 47 32 66 27 47 10 57 20 40 2 35 20 31 11 14 27 24Z" fill="currentColor"/><circle cx="32" cy="35" r="6" fill="#173126"/>'
    : '<path d="M32 13c-8-5-24 1-25 18-2 18 13 26 25 22 12 4 27-4 25-22-1-17-17-23-25-18Z" fill="currentColor"/><path d="m28 13 3-8 8-2-4 11" fill="none" stroke="currentColor" stroke-width="4"/><path d="m15 31 12-6-3 12Zm34 0-12-6 3 12ZM31 32l-4 8h10ZM16 42l8 3 4-3 4 5 5-5 4 3 7-3-5 8H21Z" fill="#160d07"/>';
  document.querySelector('.intro .eyebrow').firstElementChild.style.background = 'var(--accent)';
}

const rollSound = new Audio('slot.wav'); rollSound.loop = true; rollSound.volume = 0.25;
const endSound = new Audio('ding.mp3'); endSound.volume = 0.4;
function syncSoundButton() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  const label = soundEnabled ? translate('soundOn') : translate('soundOff');
  soundButton.setAttribute('aria-label', label); soundButton.title = label;
  soundButton.classList.toggle('is-muted', !soundEnabled);
}
function setSound(enabled) {
  soundEnabled = enabled; persistState(); syncSoundButton();
  if (!enabled) { rollSound.pause(); rollSound.currentTime = 0; endSound.pause(); endSound.currentTime = 0; }
  else if (spinning) { rollSound.currentTime = 0; rollSound.play().catch(() => {}); }
}
function renderHistory() {
  const list = document.querySelector('#history'); list.replaceChildren();
  const entries = Object.values(history).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  const shown = showAllHistory ? entries : entries.slice(0, HISTORY_LIMIT);
  for (const entry of shown) {
    const row = document.createElement('li'); const name = document.createElement('span'); const badge = document.createElement('b');
    name.textContent = entry.title; badge.textContent = translate('historyCount', entry.count); row.append(name, badge); list.append(row);
  }
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  document.querySelector('#history-stats').textContent = translate('historyStats', entries.length, total);
  if (!entries.length) { const empty = document.createElement('li'); empty.textContent = translate('emptyHistory'); list.append(empty); }
  const toggle = document.querySelector('#history-toggle');
  toggle.hidden = entries.length <= HISTORY_LIMIT;
  toggle.textContent = showAllHistory ? translate('less') : translate('more');
}
document.querySelector('#history-toggle').addEventListener('click', () => { showAllHistory = !showAllHistory; renderHistory(); });
document.querySelector('#clear-history').addEventListener('click', () => {
  if (!spinning && confirm(translate('confirmClearHistory'))) { history = {}; themeData.history = history; showAllHistory = false; persistState(); renderHistory(); }
});
function movieList() { return playlistRecords().map(movie => movie.title); }
function eligibleRecords() { return playlistRecords().filter(movie => !avoidViewed || !viewed.includes(movie.id)); }
function syncWatchButton() {
  const isShown = Boolean(lastResultMovieId);
  watchButton.hidden = !isShown;
  if (!isShown) return;
  const isViewed = viewed.includes(lastResultMovieId);
  watchButton.textContent = translate(isViewed ? 'undoViewed' : 'markViewed');
  watchButton.setAttribute('aria-pressed', String(isViewed));
}
function renderEligibility(redraw = true) {
  const total = playlistRecords().length;
  const eligible = eligibleRecords();
  if (!spinning && lastResultMovieId) winningIndex = eligible.findIndex(movie => movie.id === lastResultMovieId);
  document.querySelector('#count').textContent = total;
  document.querySelector('#movie-summary-count').textContent = total;
  document.querySelector('#eligible-count').textContent = eligible.length;
  document.querySelector('#eligible-label').textContent = translate('eligibleMovies', eligible.length);
  avoidViewedInput.checked = avoidViewed;
  const exhausted = avoidViewed && total > 0 && eligible.length === 0;
  document.querySelector('#exhausted-actions').hidden = !exhausted;
  const valid = eligible.length > 0 && total <= 60;
  spinButton.disabled = !valid || spinning;
  document.querySelector('#list-status').textContent = total > 60 ? translate('maximum') : total === 0 ? translate('atLeastTwo') : translate('ready');
  document.querySelector('#hint').textContent = eligible.length ? translate('hint', eligible.length) : exhausted ? translate('exhausted') : translate('chooseRange');
  if (redraw) drawWheel(eligible);
  return eligible;
}
function setWatched(movieId, isWatched) {
  if (!movieId) return;
  viewed = isWatched ? [...new Set([...viewed, movieId])] : viewed.filter(id => id !== movieId);
  persistState();
  renderEligibility();
  syncWatchButton();
}
watchButton.addEventListener('click', () => setWatched(lastResultMovieId, !viewed.includes(lastResultMovieId)));
avoidViewedInput.addEventListener('change', () => { avoidViewed = avoidViewedInput.checked; persistState(); renderEligibility(); });
document.querySelector('#include-viewed').addEventListener('click', () => { avoidViewed = false; avoidViewedInput.checked = false; persistState(); renderEligibility(); });
document.querySelector('#reset-viewed').addEventListener('click', () => { viewed = []; persistState(); renderEligibility(); syncWatchButton(); });
function randomIndex(length) {
  const range = 4294967296;
  const limit = range - (range % length);
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % length;
}
function drawWheel(movies = eligibleRecords()) {
  const items = movies.length ? movies.map(movie => typeof movie === 'string' ? movie : movie.title) : [language === 'pt-PT' ? 'Adiciona filmes' : 'Add movies'];
  const step = Math.PI * 2 / items.length;
  const halloween = activeTheme === 'halloween';
  ctx.clearRect(0, 0, 1000, 1000);
  ctx.save(); ctx.translate(500, 500); ctx.rotate(rotation);
  items.forEach((movie, index) => {
    const angle = -Math.PI / 2 + index * step;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 495, angle, angle + step); ctx.closePath();
    const bright = index % 2 === 0;
    const gradient = ctx.createRadialGradient(0, 0, 75, 0, 0, 495);
    if (halloween) {
      gradient.addColorStop(0, bright ? '#87300b' : '#080a09');
      gradient.addColorStop(0.48, bright ? '#dd6514' : '#151b18');
      gradient.addColorStop(1, bright ? '#f59b3c' : '#26312a');
    } else {
      gradient.addColorStop(0, bright ? '#2a714f' : '#102b23');
      gradient.addColorStop(0.48, bright ? '#36845c' : '#194638');
      gradient.addColorStop(1, bright ? '#cba85a' : '#246047');
    }
    ctx.fillStyle = gradient; ctx.fill();
    ctx.strokeStyle = index === winningIndex && !spinning ? (halloween ? '#fff2ba' : '#fff3c1') : (halloween ? '#a4743660' : '#dfcf8b70'); ctx.lineWidth = index === winningIndex && !spinning ? 10 : 2; ctx.stroke();
    ctx.save(); ctx.rotate(angle + step / 2); ctx.textAlign = 'right';
    ctx.fillStyle = halloween ? (bright ? '#241204' : '#f9e6c7') : (bright ? '#11271a' : '#f8edc7');
    const size = Math.max(13, Math.min(28, 470 / items.length));
    ctx.font = `700 ${size}px "DM Sans", sans-serif`;
    const year = movie.match(/\((\d{4})\)\s*$/)?.[1];
    let label = movie.replace(/\s*\(\d{4}\)\s*$/, '');
    const fullLabel = label;
    const maxWidth = items.length > 35 ? 210 : 305;
    while (ctx.measureText(label).width > maxWidth && label.length > 1) label = label.slice(0, -1);
    if (label !== fullLabel) label = label.slice(0, -1) + '…';
    if (items.length <= 60) ctx.fillText(label, 453, year && items.length < 28 ? -3 : size / 3);
    if (year && items.length < 28) { ctx.font = '500 16px "Space Grotesk", sans-serif'; ctx.globalAlpha = .75; ctx.fillText(year, 450, 20); }
    ctx.restore();
  });
  for (const radius of [480, 150]) { ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.strokeStyle = halloween ? '#ffc27a80' : '#f6dda880'; ctx.lineWidth = radius === 480 ? 3 : 2; ctx.stroke(); }
  ctx.restore();
}
function updateList() {
  themeData.playlist = reconcilePlaylist(input.value);
  input.value = themeData.playlist.map(movie => movie.title).join('\n');
  lastResultMovieId = null;
  winningIndex = -1;
  document.querySelector('#result').classList.remove('winner', 'reveal');
  document.querySelector('#result-label').textContent = translate('resultIdleLabel');
  document.querySelector('#result-title').textContent = translate('resultIdleTitle');
  document.querySelector('#result-description').textContent = translate('resultIdleDescription');
  syncWatchButton();
  persistState();
  renderEligibility();
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
  const movies = eligibleRecords();
  if (spinning || movies.length < 1 || playlistRecords().length > 60) return;
  spinning = true; spinButton.disabled = true; input.disabled = true; resetButton.disabled = true;
  document.querySelector('#edit-toggle').disabled = true; document.querySelector('#finish-edit').disabled = true;
  document.querySelector('#clear-history').disabled = true; document.querySelector('#history-toggle').disabled = true; themeSelect.disabled = true;
  winningIndex = -1;
  if (soundEnabled) { rollSound.currentTime = 0; rollSound.play().catch(() => {}); }
  spinButton.innerHTML = spinIcon + `<span>${translate('spinning')}</span>`;
  document.querySelector('#result-label').textContent = translate('spinningLabel');
  document.querySelector('#result-title').textContent = translate('spinningTitle');
  document.querySelector('#result-description').textContent = translate('spinningDescription');
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
      rotation %= full; spinning = false; input.disabled = false; resetButton.disabled = false;
      document.querySelector('#edit-toggle').disabled = false; document.querySelector('#finish-edit').disabled = false;
      document.querySelector('#clear-history').disabled = false; document.querySelector('#history-toggle').disabled = false; themeSelect.disabled = false;
      rollSound.pause(); rollSound.currentTime = 0;
      if (soundEnabled) { endSound.currentTime = 0; endSound.play().catch(() => {}); }
      winningIndex = winner; drawWheel(movies);
      const selectedMovie = movies[winner];
      const priorCount = history[selectedMovie.id]?.count ?? 0;
      history[selectedMovie.id] = { id: selectedMovie.id, title: selectedMovie.title, count: priorCount + 1 };
      lastResultMovieId = selectedMovie.id;
      persistState(); renderHistory(); syncWatchButton();
      spinButton.innerHTML = spinIcon + `<span>${translate('spinAgain')}</span>`; spinButton.disabled = false;
      const result = document.querySelector('#result'); result.classList.add('winner', 'reveal');
      document.querySelector('#result-label').textContent = translate('resultLabel');
      document.querySelector('#result-title').textContent = selectedMovie.title;
      document.querySelector('#result-description').textContent = translate('resultDescription');
      document.querySelector('#hint').textContent = translate('resultHint');
      resolve({ movie: selectedMovie.title, id: selectedMovie.id });
    }
    requestAnimationFrame(frame);
  });
}
input.addEventListener('input', updateList);
spinButton.addEventListener('click', spin);
resetButton.addEventListener('click', () => { if (!spinning) { input.value = activeTheme === 'christmas' ? CHRISTMAS_MOVIES.join('\n') : DEFAULT_MOVIES.join('\n'); updateList(); } });
soundButton.addEventListener('click', () => setSound(!soundEnabled));
languageSelect.value = language;
languageSelect.addEventListener('change', () => { language = languageSelect.value === 'en' ? 'en' : 'pt-PT'; state.language = language; persistState(); renderLanguage(); });
themeSelect.value = activeTheme;
themeSelect.addEventListener('change', () => {
  if (spinning) return;
  themeData.playlist = reconcilePlaylist(input.value);
  themeData.history = history;
  themeData.viewed = viewed;
  themeData.avoidViewed = avoidViewed;
  activeTheme = themeSelect.value === 'christmas' ? 'christmas' : 'halloween';
  state.activeTheme = activeTheme;
  themeData = state.themes[activeTheme];
  history = themeData.history;
  viewed = themeData.viewed;
  avoidViewed = themeData.avoidViewed;
  input.value = themeData.playlist.map(movie => movie.title).join('\n');
  lastResultMovieId = null;
  winningIndex = -1;
  showAllHistory = false;
  document.querySelector('#result').classList.remove('winner', 'reveal');
  syncTheme(); persistState(); updateList(); renderHistory();
});
syncTheme();
updateList();
renderHistory();
document.fonts?.ready.then(() => drawWheel());
