const canvas = document.querySelector('#wheel');
const ctx = canvas.getContext('2d');
const input = document.querySelector('#movies');
const spinButton = document.querySelector('#spin');
const drawModeSelect = document.querySelector('#draw-mode');
const drawPaceSelect = document.querySelector('#draw-pace');
const resetButton = document.querySelector('#reset');
const soundButton = document.querySelector('#sound');
const editor = document.querySelector('#movie-editor');
const languageSelect = document.querySelector('#language');
const themeSelect = document.querySelector('#theme');
const watchButton = document.querySelector('#watch-toggle');
const avoidViewedInput = document.querySelector('#avoid-viewed');
const durationFilter = document.querySelector('#filter-duration');
const filterMoodInputs = ['light', 'scary', 'nostalgic'].map(mood => document.querySelector(`#filter-mood-${mood}`));
const metadataMovieSelect = document.querySelector('#metadata-movie');
const metadataRuntimeInput = document.querySelector('#metadata-runtime');
const metadataMoodInputs = ['light', 'scary', 'nostalgic'].map(mood => document.querySelector(`#metadata-mood-${mood}`));
const surpriseMoodSelect = document.querySelector('#surprise-mood');
const surpriseDurationSelect = document.querySelector('#surprise-duration');
const marathonCountSelect = document.querySelector('#marathon-count');
const catalogSearchForm = document.querySelector('#catalog-search-form');
const catalogSearchInput = document.querySelector('#catalog-search');
const catalogResults = document.querySelector('#catalog-results');
const relatedResults = document.querySelector('#related-results');
const sharedPreviewSection = document.querySelector('#shared-preview');
const sharedPreviewList = document.querySelector('#shared-preview-list');
const portabilityThemeSelect = document.querySelector('#portability-theme');
const playlistImportModeSelect = document.querySelector('#playlist-import-mode');
const playlistFileInput = document.querySelector('#playlist-file-input');
const backupFileInput = document.querySelector('#backup-file-input');
const spinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5"/></svg>';
const STORAGE_KEY = 'cinema-roulette-v5';
const PREVIOUS_STORAGE_KEY = 'cinema-roulette-v4';
const PREVIOUS_V3_STORAGE_KEY = 'cinema-roulette-v3';
const LEGACY_STORAGE_KEY = 'cinema-roulette-v2';
const HISTORY_LIMIT = 5;
let storageDirty = false;
let editorError = '';
let removedMovie = null;
const editorDrafts = new Map();
let rotation = 0;
let spinning = false;
let doorCandidates = [];
let winningIndex = -1;
let showAllHistory = false;
let lastResultMovieId = null;
let selectedCollection = 'all';
let remoteSearchResults = null;
let relatedCache = { key: '', movies: [], seedIndex: 0, visible: 16, loading: false };
let relatedController = null;
let catalogRequestController = null;
let catalogStatusOverride = '';
let metadataStatusKey = '';
let currentSession = null;
let lastResultType = 'single';
let marathonStatusKey = '';
let marathonStatusArgs = [];
let sharedPreviewData = null;
let sharedPreviewInvalid = false;
let shareStatusKey = '';
let playlistImportStatusKey = '';
let playlistImportStatusArgs = [];
let backupImportStatusKey = '';
let portabilityStatusKey = '';
let pendingPlaylistImport = null;
let pendingBackupImport = null;
let playlistImportPreviewData = null;
let backupImportPreviewData = null;

const state = initialState();
let activeTheme = state.activeTheme;
let language = state.language;
let soundEnabled = state.soundEnabled;
let musicEnabled = state.musicEnabled === true;
let themeData = state.themes[activeTheme];
let history = themeData.history;
let viewed = themeData.viewed;
let avoidViewed = themeData.avoidViewed;
currentSession = themeData.sessions.at(-1) ?? null;
input.value = themeData.playlist.map(movie => movie.title).join('\n');

function playlistRecords() { return themeData.playlist; }
function reconcilePlaylist(value) {
  const previous = playlistRecords();
  const byTitle = new Map(previous.map(movie => [normalizeTitle(movie.title), movie]));
  const byId = new Map(previous.map(movie => [movie.id, movie]));
  const parsedMovies = parseMovieLines(value);
  const retained = new Set(parsedMovies.map(movie => byTitle.get(normalizeTitle(movie.title))?.id).filter(Boolean));
  return parsedMovies.map((parsed, index) => {
    // Exact matches survive reordering. A changed line at the same position is a
    // title edit when the list size stays the same; explicit row actions handle
    // renames independently of additions/removals.
    const positional = previous.length === parsedMovies.length && !retained.has(previous[index]?.id) ? previous[index] : null;
    const existingMovie = byTitle.get(normalizeTitle(parsed.title)) ?? positional;
    if (!existingMovie && byId.has(parsed.id)) parsed.id += `:${crypto.randomUUID()}`;
    return existingMovie ? createMovie(parsed.title, existingMovie.source, existingMovie) : parsed;
  });
}
function drawActionKey(repeat = Boolean(lastResultMovieId)) {
  const mode = activeTheme === 'halloween' ? drawModeSelect.value : 'wheel';
  if (mode === 'doors') return repeat ? 'doorsAgain' : 'chooseDoor';
  if (mode === 'shuffle' || mode === 'posters') return repeat ? 'shuffleAgain' : 'spinShuffle';
  return repeat ? 'spinAgain' : 'spin';
}
function syncDrawMode() {
  const halloween = activeTheme === 'halloween';
  const mode = halloween ? drawModeSelect.value : 'wheel';
  document.querySelector('#poster-suggestion').hidden = !halloween || eligibleRecords().length < 20 || mode === 'posters';
  document.querySelector('#draw-options').hidden = !halloween;
  document.querySelector('.wheel-stage').hidden = mode !== 'wheel';
  document.querySelector('#doors-stage').hidden = mode !== 'doors';
  document.querySelector('#shuffle-stage').hidden = mode !== 'shuffle';
  document.querySelector('#poster-stage').hidden = mode !== 'posters';
  if (mode === 'posters' && !spinning) {
    const movies = eligibleRecords();
    const previous = playlistRecords().find(movie => movie.id === lastResultMovieId);
    renderPosterShuffle(previous ? [previous] : movies, 0, Boolean(previous));
    const preload = document.querySelector('#poster-preload');
    const urls = [...new Set(movies.map(movie => safePosterUrl(movie.posterUrl)).filter(Boolean))];
    if (preload.dataset.urls !== urls.join('|')) {
      preload.dataset.urls = urls.join('|');
      preload.replaceChildren(...urls.map(url => { const image = document.createElement('img'); image.src = url; image.alt = ''; image.loading = 'eager'; return image; }));
    }
  }
  if (!spinning) spinButton.innerHTML = spinIcon + `<span>${translate(drawActionKey())}</span>`;
}
function renderLanguage() {
  renderStorageWarning();
  document.querySelector("#cancel-edit").textContent = translate("cancelEdit");
  document.querySelector("#undo-remove").textContent = translate("undoRemove");
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
  document.querySelector('#draw-mode-label').textContent = translate('drawModeLabel');
  document.querySelector('#draw-pace-label').textContent = translate('paceLabel');
  document.querySelector('#doors-stage').setAttribute('aria-label', translate('modeDoors'));
  document.querySelector('#doors').setAttribute('aria-label', translate('chooseDoor'));
  document.querySelector('#shuffle-stage').setAttribute('aria-label', translate('modeShuffle'));
  document.querySelector('#poster-stage').setAttribute('aria-label', translate('modePosters'));
  document.querySelector('#poster-caption').textContent = translate('posterCaption');
  for (const [value, key] of [['wheel', 'modeWheel'], ['doors', 'modeDoors'], ['shuffle', 'modeShuffle'], ['posters', 'modePosters']]) drawModeSelect.querySelector(`option[value="${value}"]`).textContent = translate(key);
  for (const [value, key] of [['fast', 'paceFast'], ['suspense', 'paceSuspense']]) drawPaceSelect.querySelector(`option[value="${value}"]`).textContent = translate(key);
  if (doorCandidates.length && !spinning) renderDoors(doorCandidates);
  syncDrawMode();
  document.querySelector('#workspace-tabs').setAttribute('aria-label', translate('workspaceTabs'));
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
  syncMusicButton();
  document.querySelector('#eligible-label').textContent = translate('eligibleMovies', Number(document.querySelector('#eligible-count').textContent) || 0);
  document.querySelector('#avoid-viewed-label').textContent = translate('avoidViewed');
  document.querySelector('#exhausted-message').textContent = translate('exhausted');
  document.querySelector('#include-viewed').textContent = translate('includeViewed');
  document.querySelector('#reset-viewed').textContent = translate('resetViewed');
  document.querySelector('#avoid-viewed-label').textContent = translate('avoidViewed');
  document.querySelector('#filter-help').textContent = translate('filterHelp');
  document.querySelector('#mood-legend').textContent = translate('moodLegend');
  document.querySelector('#mood-light-label').textContent = translate('moodLight');
  document.querySelector('#mood-scary-label').textContent = translate('moodScary');
  document.querySelector('#mood-nostalgic-label').textContent = translate('moodNostalgic');
  document.querySelector('#duration-label').textContent = translate('durationLabel');
  for (const [value, key] of [['any', 'durationAny'], ['90', 'duration90'], ['120', 'duration120'], ['150', 'duration150'], ['180', 'duration180']]) durationFilter.querySelector(`option[value="${value}"]`).textContent = translate(key);
  document.querySelector('#clear-filters').textContent = translate('clearFilters');
  document.querySelector('#surprise-help').textContent = translate('surpriseHelp');
  document.querySelector('#surprise-mood-label').textContent = translate('surpriseMoodLabel');
  document.querySelector('#surprise-duration-label').textContent = translate('surpriseDurationLabel');
  document.querySelector('#surprise-submit').textContent = translate('surpriseRun');
  document.querySelector('#surprise-discover').textContent = translate('surpriseDiscover');
  document.querySelector('#metadata-help').textContent = translate('metadataHelp');
  document.querySelector('#metadata-movie-label').textContent = translate('metadataMovieLabel');
  document.querySelector('#metadata-runtime-label').textContent = translate('metadataRuntimeLabel');
  document.querySelector('#metadata-mood-legend').textContent = translate('metadataMoodLegend');
  document.querySelector('#metadata-light-label').textContent = translate('moodLight');
  document.querySelector('#metadata-scary-label').textContent = translate('moodScary');
  document.querySelector('#metadata-nostalgic-label').textContent = translate('moodNostalgic');
  document.querySelector('#save-metadata').textContent = translate('saveMetadata');
  document.querySelector('#metadata-status').textContent = metadataStatusKey ? translate(metadataStatusKey) : '';
  document.querySelector('#marathon-help').textContent = translate('marathonHelp');
  document.querySelector('#marathon-count-label').textContent = translate('marathonCountLabel');
  document.querySelector('#marathon-submit').textContent = translate('marathonRun');
  document.querySelector('#marathon-order-title').textContent = translate('marathonOrderTitle');
  document.querySelector('#session-history-title').textContent = translate('sessionHistoryTitle');
  document.querySelector('#session-history-empty').textContent = translate('sessionHistoryEmpty');
  document.querySelector('#marathon-status').textContent = marathonStatusKey ? translate(marathonStatusKey, ...marathonStatusArgs) : '';
  const selectedSurpriseMood = surpriseMoodSelect.value || 'any';
  surpriseMoodSelect.replaceChildren();
  for (const [value, key] of [['any', 'surpriseAnyMood'], ['light', 'moodLight'], ['scary', 'moodScary'], ['nostalgic', 'moodNostalgic']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = translate(key); surpriseMoodSelect.append(option);
  }
  surpriseMoodSelect.value = selectedSurpriseMood;
  const selectedSurpriseDuration = surpriseDurationSelect.value || 'any';
  surpriseDurationSelect.replaceChildren();
  for (const [value, key] of [['any', 'durationAny'], ['90', 'duration90'], ['120', 'duration120'], ['150', 'duration150'], ['180', 'duration180']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = translate(key); surpriseDurationSelect.append(option);
  }
  surpriseDurationSelect.value = selectedSurpriseDuration;
  document.querySelector('#discover-intro').textContent = translate('discoverIntro');
  catalogSearchInput.setAttribute('aria-label', translate('searchLabel'));
  catalogSearchInput.placeholder = translate('searchPlaceholder');
  document.querySelector('#catalog-search-button').textContent = translate('searchButton');
  document.querySelector('#catalog-collections').setAttribute('aria-label', translate('collectionLabel'));
  const collectionLabels = { all: 'collectionAll', 'halloween-family': 'collectionHalloweenFamily', horror: 'collectionHorror', mystery: 'collectionMystery', 'christmas-classics': 'collectionChristmasClassics', 'christmas-family': 'collectionChristmasFamily' };
  document.querySelectorAll('[data-collection]').forEach(button => {
    const collection = button.getAttribute('data-collection');
    if (collectionLabels[collection]) button.textContent = translate(collectionLabels[collection]);
    const isForTheme = collection === 'all' || (activeTheme === 'halloween' ? ['halloween-family', 'horror', 'mystery'].includes(collection) : ['christmas-classics', 'christmas-family'].includes(collection));
    button.hidden = !isForTheme;
    button.classList.toggle('is-selected', collection === selectedCollection);
    button.setAttribute('aria-pressed', String(collection === selectedCollection));
  });
  document.querySelector('#related-title').textContent = activeTheme === 'halloween' ? translate('relatedTitle') : (language === 'pt-PT' ? 'Sugestões relacionadas do TMDB' : 'Related TMDB suggestions');
  document.querySelector('#related-more').textContent = translate('relatedMore');
  renderRelatedRecommendations();
  document.querySelector('#share-status').textContent = shareStatusKey ? translate(shareStatusKey) : '';
  renderSharedPreview();
  renderPortability();
  document.querySelector('#sharing-help').textContent = translate('sharingHelp');
  document.querySelector('#generate-share').textContent = translate('generateShare');
  document.querySelector('#generate-share').disabled = playlistRecords().length === 0;
  document.querySelector('#share-link-caption').textContent = translate('shareLinkCaption');
  document.querySelector('#copy-share-link').textContent = translate('copyShare');
  document.querySelector('#share-file-download').textContent = translate('shareFile');
  document.querySelector('#portability-help').textContent = translate('portabilityHelp');
  document.querySelector('#portability-theme-label').textContent = translate('portabilityTheme');
  document.querySelector('#export-playlist').textContent = translate('exportPlaylist');
  document.querySelector('#playlist-import-label').textContent = translate('playlistImportMode');
  document.querySelector('#choose-playlist-file').textContent = translate('choosePlaylistFile');
  document.querySelector('#apply-playlist-import').textContent = translate('applyPlaylistImport');
  portabilityThemeSelect.options[0].textContent = translate('halloween');
  portabilityThemeSelect.options[1].textContent = translate('christmas');
  playlistImportModeSelect.options[0].textContent = translate('playlistMerge');
  playlistImportModeSelect.options[1].textContent = translate('playlistReplace');
  document.querySelector('#backup-help').textContent = translate('backupHelp');
  document.querySelector('#export-backup').textContent = translate('exportBackup');
  document.querySelector('#choose-backup-file').textContent = translate('chooseBackupFile');
  document.querySelector('#apply-backup-import').textContent = translate('applyBackupImport');
  document.querySelector('#history-title').textContent = translate('wallTitle');
  document.querySelector('#tmdb-notice').textContent = translate('tmdbNotice');
  document.querySelector('#tmdb-logo').alt = translate('tmdbLogoAlt');
  renderHistory();
  renderSessionPanel();
  syncWatchButton();
  renderEligibility(false);
  renderCatalog();
  if (!spinning && winningIndex < 0) {
    document.querySelector('#result-label').textContent = translate('resultIdleLabel');
    document.querySelector('#result-title').textContent = translate('resultIdleTitle');
  document.querySelector('#result-title').disabled = true;
    document.querySelector('#result-description').textContent = translate('resultIdleDescription');
  } else if (spinning) {
    document.querySelector('#result-label').textContent = translate('spinningLabel');
    document.querySelector('#result-title').textContent = translate('spinningTitle');
  document.querySelector('#result-title').disabled = true;
    document.querySelector('#result-description').textContent = translate('spinningDescription');
  }
  if (!spinning) spinButton.innerHTML = spinIcon + `<span>${translate(drawActionKey())}</span>`;
  if (lastResultMovieId) {
    document.querySelector('#result-label').textContent = translate('resultLabel');
    document.querySelector('#result-description').textContent = translate('resultDescription');
    document.querySelector('#hint').textContent = translate('resultHint');
  }
}
function syncTheme() {
  syncMusicPlayback();
  stopDoorSounds(); activeDoorSound = null;
  renderLanguage();
  document.body.dataset.theme = activeTheme;
  themeSelect.value = activeTheme;
  document.querySelector('#wheel-theme-label').textContent = activeTheme === 'christmas' ? (language === 'pt-PT' ? 'NATAL' : 'CHRISTMAS') : 'HALLOWEEN';
  document.querySelector('.wheel-center svg').style.color = activeTheme === 'christmas' ? '#f4db92' : '#ffa537';
  document.querySelector('.wheel-center svg').innerHTML = activeTheme === 'christmas'
    ? '<path d="M32 5 37 24 53 14 44 31 62 35 44 40 54 57 37 47 32 66 27 47 10 57 20 40 2 35 20 31 11 14 27 24Z" fill="currentColor"/><circle cx="32" cy="35" r="6" fill="#173126"/>'
    : `<defs>
      <radialGradient id="pumpkin-rind" cx=".35" cy=".25" r=".8"><stop stop-color="#ffbd57"/><stop offset=".5" stop-color="#ed7a1b"/><stop offset="1" stop-color="#9d370b"/></radialGradient>
      <linearGradient id="pumpkin-light" x2="0" y2="1"><stop stop-color="#fff7ba"/><stop offset="1" stop-color="#ffbd35"/></linearGradient>
    </defs>
    <path d="M29 16q-2-8 5-13l6 2q-8 5-6 12" fill="#657139" stroke="#303319" stroke-width="2"/>
    <path d="M32 16C19 8 5 21 5 36c0 18 15 25 27 22 14 3 28-7 27-23C58 20 46 9 32 16Z" fill="url(#pumpkin-rind)" stroke="#6f2b0d" stroke-width="2"/>
    <g fill="none" stroke="#a2440e" stroke-width="1.5" opacity=".55"><path d="M23 17Q11 38 22 55M42 17q13 23 0 39M31 18q-5 20 0 38"/></g>
    <path d="M12 27l15 6-4 8-11-3ZM51 27l-15 6 4 8 11-3ZM32 35l-5 8h10Z" fill="#57220c"/>
    <path d="M14 29l11 5-3 5-8-3ZM49 29l-11 5 3 5 8-3ZM32 37l-3 5h6Z" fill="url(#pumpkin-light)"/>
    <path d="M12 43q20 21 40-1l-3 11q-17 12-34 0Z" fill="#57220c"/>
    <path d="M15 46l7 3 3-4 5 7 5-7 4 5 10-5-3 7-7 3-3-3-5 5-5-5-3 2-6-3Z" fill="url(#pumpkin-light)"/>
    <path d="M13 24q4-7 10-7M44 20q6 3 8 9" fill="none" stroke="#ffe096" stroke-width="2" opacity=".5"/>`;

  document.querySelector('.intro .eyebrow').firstElementChild.style.background = 'var(--accent)';
}

function displayThemeName(theme) { return translate(theme === 'christmas' ? 'christmas' : 'halloween'); }
function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64UrlDecode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 16000) throw new Error('invalid share encoding');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
function validateSharedPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'format,playlist,theme,version') return null;
  if (value.format !== 'halloween-roulette-share' || value.version !== 1 || !['halloween', 'christmas'].includes(value.theme) || !Array.isArray(value.playlist) || value.playlist.length < 1 || value.playlist.length > 60) return null;
  const playlist = [];
  const seen = new Set();
  for (const entry of value.playlist) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !['title', 'id,title'].includes(Object.keys(entry).sort().join(',')) || typeof entry.title !== 'string' || !entry.title.trim() || entry.title.length > 500 || (entry.id !== undefined && (typeof entry.id !== 'string' || entry.id.length > 600))) return null;
    const title = entry.title.trim();
    const tmdbMatch = entry.id?.match(/^tmdb:(\d{1,10})$/);
    const id = tmdbMatch ? `tmdb:${Number(tmdbMatch[1])}` : manualId(title);
    if (tmdbMatch && Number(tmdbMatch[1]) < 1) return null;
    if (entry.id !== undefined && !tmdbMatch && entry.id !== id) return null;
    if (seen.has(id)) return null;
    seen.add(id);
    playlist.push(createMovie(title, tmdbMatch ? 'tmdb' : 'manual', { id, tmdbId: tmdbMatch ? Number(tmdbMatch[1]) : null }));
  }
  return { theme: value.theme, playlist };
}
function readSharedPlaylist() {
  let hash = '';
  try {
    hash = new URL(location.href).hash;
    if (!hash.startsWith('#playlist=')) return;
    const payload = JSON.parse(base64UrlDecode(hash.slice('#playlist='.length)));
    sharedPreviewData = validateSharedPayload(payload);
    sharedPreviewInvalid = !sharedPreviewData;
  } catch {
    if (hash.startsWith('#playlist=')) sharedPreviewInvalid = true;
  }
}
function renderSharedPreview() {
  const found = Boolean(sharedPreviewData || sharedPreviewInvalid);
  sharedPreviewSection.hidden = !found;
  if (!found) return;
  document.querySelector('#shared-preview-title').textContent = translate('sharedPreviewTitle');
  sharedPreviewList.replaceChildren();
  const importButton = document.querySelector('#import-shared');
  importButton.hidden = sharedPreviewInvalid;
  document.querySelector('#dismiss-shared').textContent = translate('dismissShare');
  if (sharedPreviewInvalid) {
    document.querySelector('#shared-preview-summary').textContent = translate('sharedInvalid');
    document.querySelector('#shared-preview-status').textContent = '';
    return;
  }
  document.querySelector('#shared-preview-summary').textContent = translate('sharedPreviewSummary', displayThemeName(sharedPreviewData.theme), sharedPreviewData.playlist.length);
  sharedPreviewData.playlist.forEach(movie => {
    const item = document.createElement('li'); item.textContent = movie.title; sharedPreviewList.append(item);
  });
  importButton.textContent = translate('importShared');
  document.querySelector('#shared-preview-status').textContent = portabilityStatusKey === 'sharedImported' ? translate('sharedImported', ...playlistImportStatusArgs) : portabilityStatusKey === 'sharedLimit' ? translate('sharedLimit') : '';
}
function renderPortability() {
  if (!portabilityThemeSelect.options.length) return;
  portabilityThemeSelect.value ||= activeTheme;
  const playlistPreview = document.querySelector('#playlist-import-preview');
  playlistPreview.hidden = !playlistImportPreviewData;
  if (playlistImportPreviewData) {
    const mode = playlistImportModeSelect.value === 'replace' ? translate('playlistReplace') : translate('playlistMerge');
    document.querySelector('#playlist-import-summary').textContent = translate('playlistImportPreview', displayThemeName(playlistImportPreviewData.theme), playlistImportPreviewData.playlist.length, mode);
  }
  const backupPreview = document.querySelector('#backup-import-preview');
  backupPreview.hidden = !backupImportPreviewData;
  if (backupImportPreviewData) document.querySelector('#backup-import-summary').textContent = backupSummary(backupImportPreviewData);
  if (portabilityStatusKey === 'playlistImportInvalid') document.querySelector('#portability-status').textContent = translate('playlistImportInvalid');
  else if (portabilityStatusKey === 'playlistImportDone') document.querySelector('#portability-status').textContent = translate('playlistImportDone', ...playlistImportStatusArgs);
  else if (portabilityStatusKey === 'playlistImportLimit') document.querySelector('#portability-status').textContent = translate('playlistImportLimit');
  else if (portabilityStatusKey === 'backupInvalid') document.querySelector('#portability-status').textContent = translate('backupInvalid');
  else if (portabilityStatusKey === 'backupImported') document.querySelector('#portability-status').textContent = translate('backupImported');
  else if (portabilityStatusKey === 'portabilityFileTooLarge') document.querySelector('#portability-status').textContent = translate('portabilityFileTooLarge');
  else if (portabilityStatusKey === 'sharedLimit') document.querySelector('#portability-status').textContent = translate('sharedLimit');
  else document.querySelector('#portability-status').textContent = '';
}
function playlistFileRecord(movie) {
  const record = { id: movie.id, title: movie.title, year: movie.year, runtimeMinutes: movie.runtimeMinutes, genres: movie.genres, moods: movie.moods, overview: movie.overview, translatedTitle: movie.translatedTitle, posterUrl: movie.posterUrl, tmdbRating: movie.tmdbRating, tmdbId: movie.tmdbId, imdbId: movie.imdbId, source: movie.source };
  return record;
}
function playlistFilePayload(theme) {
  return { format: 'halloween-roulette-playlist', version: 1, theme, playlist: state.themes[theme].playlist.map(playlistFileRecord) };
}
function sanitizePortableMovie(value) {
  const fields = ['genres', 'id', 'imdbId', 'moods', 'overview', 'posterUrl', 'runtimeMinutes', 'source', 'title', 'tmdbId', 'tmdbRating', 'translatedTitle', 'year'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !fields.includes(key))) return null;
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 500 || typeof value.id !== 'string' || value.id.length > 600) return null;
  const title = value.title.trim();
  const tmdbMatch = value.id.match(/^tmdb:(\d{1,10})$/);
  if (tmdbMatch) {
    const tmdbId = Number(tmdbMatch[1]);
    if (!Number.isSafeInteger(tmdbId) || tmdbId < 1 || (value.tmdbId !== undefined && value.tmdbId !== tmdbId)) return null;
  } else if ((!/^manual:.{1,500}$/.test(value.id) && !/^curated:(halloween|christmas):[a-z0-9-]+$/.test(value.id)) || (value.tmdbId !== undefined && value.tmdbId !== null)) return null;
  const runtime = value.runtimeMinutes === undefined ? null : value.runtimeMinutes;
  if (runtime !== null && (!Number.isSafeInteger(runtime) || runtime < 1 || runtime > 600)) return null;
  if (value.year !== undefined && value.year !== null && (!Number.isSafeInteger(value.year) || value.year < 1880 || value.year > 2200)) return null;
  if (value.genres !== undefined && (!Array.isArray(value.genres) || value.genres.length > 30 || value.genres.some(item => typeof item !== 'string' || item.length > 80))) return null;
  if (value.moods !== undefined && (!Array.isArray(value.moods) || value.moods.some(item => !['light', 'scary', 'nostalgic'].includes(item)))) return null;
  let overview = value.overview ?? null;
  if (overview !== null && (!overview || typeof overview !== 'object' || Array.isArray(overview) || Object.entries(overview).some(([key, text]) => !['en', 'pt-PT'].includes(key) || typeof text !== 'string' || text.length > 2000))) return null;
  let posterUrl = value.posterUrl ?? null;
  if (posterUrl !== null && safePosterUrl(posterUrl) !== posterUrl) return null;
  const tmdbRating = value.tmdbRating ?? null;
  if (tmdbRating !== null && (!Number.isFinite(tmdbRating) || tmdbRating < 0 || tmdbRating > 10 || !tmdbMatch)) return null;
  const imdbId = value.imdbId ?? null;
  if (imdbId !== null && (typeof imdbId !== 'string' || !/^tt\d{7,10}$/.test(imdbId))) return null;
  const translatedTitle = value.translatedTitle ?? null;
  if (translatedTitle !== null && (typeof translatedTitle !== 'string' || translatedTitle.length > 500)) return null;
  const source = value.source ?? (tmdbMatch ? 'tmdb' : 'manual');
  if (!['manual', 'tmdb', 'catalog', 'curated'].includes(source) || (tmdbMatch && source === 'manual')) return null;
  return createMovie(title, source, { id: value.id, year: value.year, runtimeMinutes: runtime, genres: value.genres ?? [], moods: value.moods ?? [], overview, translatedTitle, posterUrl, tmdbRating, tmdbId: tmdbMatch ? Number(tmdbMatch[1]) : null, imdbId });
}
function validatePlaylistPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'format,playlist,theme,version' || value.format !== 'halloween-roulette-playlist' || value.version !== 1 || !['halloween', 'christmas'].includes(value.theme) || !Array.isArray(value.playlist) || value.playlist.length > 60) return null;
  const playlist = [];
  const seen = new Set();
  for (const rawMovie of value.playlist) {
    const movie = sanitizePortableMovie(rawMovie);
    if (!movie || seen.has(movie.id)) return null;
    seen.add(movie.id); playlist.push(movie);
  }
  return { theme: value.theme, playlist };
}
function downloadJSON(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function sharePlaylist() {
  const records = playlistRecords();
  const payload = { format: 'halloween-roulette-share', version: 1, theme: activeTheme, playlist: records.map(movie => movie.tmdbId ? ({ id: movie.id, title: movie.title }) : ({ title: movie.title })) };
  const url = new URL(location.href); url.search = ''; url.hash = `playlist=${base64UrlEncode(JSON.stringify(payload))}`;
  const value = url.href;
  shareStatusKey = value.length <= 1800 ? 'shareReady' : 'shareTooLong';
  document.querySelector('#share-status').textContent = translate(shareStatusKey);
  const shortLink = value.length <= 1800;
  document.querySelector('#share-link-label').hidden = !shortLink;
  document.querySelector('#copy-share-link').hidden = !shortLink;
  document.querySelector('#share-file-download').hidden = shortLink;
  document.querySelector('#share-link').value = shortLink ? value : '';
}
function sameMovieRecord(first, second) { return first.id === second.id || (Number.isSafeInteger(first.tmdbId) && first.tmdbId === second.tmdbId); }
function activateImportedTheme(theme, alreadyPersisted = false) {
  cancelOnlineContext(); setEditorOpen(false);
  if (!alreadyPersisted) persistState();
  activeTheme = theme; themeData = state.themes[theme]; history = themeData.history; viewed = themeData.viewed; avoidViewed = themeData.avoidViewed;
  drawModeSelect.value = themeData.drawMode ?? 'wheel'; drawPaceSelect.value = themeData.drawPace ?? 'fast';
  state.activeTheme = theme; currentSession = themeData.sessions.at(-1) ?? null; lastResultType = 'single'; lastResultMovieId = null; winningIndex = -1;
  marathonStatusKey = ''; marathonStatusArgs = []; showAllHistory = false;
  if (!editor.hidden) editorDrafts.set(activeTheme, input.value);
  input.value = themeData.playlist.map(movie => movie.title).join('\n');
  themeSelect.value = theme; portabilityThemeSelect.value = theme;
  selectedCollection = 'all'; catalogSearchInput.value = '';
  catalogRequestController?.abort(); remoteSearchResults = null; catalogStatusOverride = '';
  syncTheme(); updateList(); renderHistory(); renderStorageWarning();
}
function importSharedPlaylist() {
  if (!sharedPreviewData) return;
  persistState();
  const { theme, playlist } = sharedPreviewData;
  const destination = state.themes[theme].playlist;
  const merged = [...destination]; let added = 0; let skipped = 0;
  for (const movie of playlist) {
    if (merged.some(existing => sameMovieRecord(existing, movie))) { skipped++; continue; }
    merged.push(movie); added++;
  }
  if (merged.length > 60) { portabilityStatusKey = 'sharedLimit'; renderSharedPreview(); return; }
  state.themes[theme].playlist = merged;
  playlistImportStatusArgs = [added, skipped]; portabilityStatusKey = 'sharedImported';
  activateImportedTheme(theme, true);
  renderSharedPreview();
}
function backupPayload() { return { format: 'halloween-roulette-backup', version: 1, savedAt: new Date().toISOString(), data: state }; }
function validateBackupPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.format !== 'halloween-roulette-backup' || value.version !== 1 || !value.data || typeof value.data !== 'object' || value.data.version !== 5 || !['halloween', 'christmas'].includes(value.data.activeTheme) || !['en', 'pt-PT'].includes(value.data.language) || typeof value.data.soundEnabled !== 'boolean' || !value.data.themes) return null;
  const themes = {};
  for (const theme of ['halloween', 'christmas']) {
    const record = value.data.themes[theme];
    if (!record || !Array.isArray(record.playlist) || record.playlist.length > 60 || !record.history || typeof record.history !== 'object' || Array.isArray(record.history) || Object.keys(record.history).length > 5000 || !Array.isArray(record.viewed) || record.viewed.length > 5000 || record.viewed.some(id => typeof id !== 'string' || id.length > 600) || typeof record.avoidViewed !== 'boolean' || !record.filters || !Array.isArray(record.filters.moods) || record.filters.moods.some(mood => !['light', 'scary', 'nostalgic'].includes(mood)) || !(record.filters.maxDuration === null || [90, 120, 150, 180].includes(record.filters.maxDuration)) || !Array.isArray(record.sessions) || record.sessions.length > 100) return null;
    const playlist = [];
    const seen = new Set();
    for (const movie of record.playlist) { const safe = sanitizePortableMovie(movie); if (!safe || seen.has(safe.id)) return null; seen.add(safe.id); playlist.push(safe); }
    for (const [key, entry] of Object.entries(record.history)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || key === '__proto__' || typeof entry.id !== 'string' || entry.id !== key || entry.id.length > 600 || typeof entry.title !== 'string' || !entry.title.trim() || entry.title.length > 500 || !Number.isSafeInteger(entry.count) || entry.count < 1) return null;
    }
    const sessions = sanitizeSessions(record.sessions);
    if (sessions.length !== record.sessions.length || sessions.some((session, index) => session.movies.length !== record.sessions[index].movies.length)) return null;
    themes[theme] = { playlist, history: sanitizeHistory(record.history, playlist), viewed: [...new Set(record.viewed)], avoidViewed: record.avoidViewed, filters: { moods: [...new Set(record.filters.moods)], maxDuration: record.filters.maxDuration }, sessions,
      drawMode: ['wheel', 'doors', 'shuffle', 'posters'].includes(record.drawMode) ? record.drawMode : 'wheel', drawPace: record.drawPace === 'suspense' ? 'suspense' : 'fast' };
  }
  if (value.data.musicEnabled !== undefined && typeof value.data.musicEnabled !== 'boolean') return null;
  return { version: 5, activeTheme: value.data.activeTheme, language: value.data.language, soundEnabled: value.data.soundEnabled, musicEnabled: value.data.musicEnabled === true, themes };
}
function backupStats(data) {
  const halloween = data.themes.halloween; const christmas = data.themes.christmas;
  const draws = [halloween, christmas].reduce((sum, theme) => sum + Object.values(theme.history).reduce((total, entry) => total + entry.count, 0), 0);
  const watched = halloween.viewed.length + christmas.viewed.length;
  const sessions = halloween.sessions.length + christmas.sessions.length;
  return [halloween.playlist.length, christmas.playlist.length, draws, watched, sessions];
}
function backupSummary(data) { return translate('backupPreviewSummary', ...backupStats(data)); }
async function readImportFile(file, maxBytes = 2_000_000) {
  if (!file || !Number.isFinite(file.size) || file.size > maxBytes) throw new RangeError('file too large');
  const text = await file.text();
  if (typeof text !== 'string' || text.length > maxBytes) throw new RangeError('file too large');
  return JSON.parse(text);
}
document.querySelector('#generate-share').addEventListener('click', sharePlaylist);
document.querySelector('#copy-share-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(document.querySelector('#share-link').value); shareStatusKey = 'shareReady'; document.querySelector('#share-status').textContent = translate(shareStatusKey); }
  catch { shareStatusKey = 'shareCopyFailed'; document.querySelector('#share-status').textContent = translate(shareStatusKey); }
});
document.querySelector('#share-file-download').addEventListener('click', () => downloadJSON(playlistFilePayload(activeTheme), `halloween-roulette-${activeTheme}-playlist.json`));
document.querySelector('#import-shared').addEventListener('click', importSharedPlaylist);
document.querySelector('#dismiss-shared').addEventListener('click', () => {
  sharedPreviewData = null; sharedPreviewInvalid = false; portabilityStatusKey = '';
  try { const url = new URL(location.href); url.hash = ''; window.history?.replaceState(null, '', url.href); } catch { /* embedded browser may not expose session history */ }
  renderSharedPreview();
});
portabilityThemeSelect.addEventListener('change', () => { portabilityStatusKey = ''; renderPortability(); });
playlistImportModeSelect.addEventListener('change', () => { portabilityStatusKey = ''; renderPortability(); });
document.querySelector('#export-playlist').addEventListener('click', () => downloadJSON(playlistFilePayload(portabilityThemeSelect.value === 'christmas' ? 'christmas' : 'halloween'), `halloween-roulette-${portabilityThemeSelect.value}-playlist.json`));
document.querySelector('#choose-playlist-file').addEventListener('click', () => playlistFileInput.click());
playlistFileInput.addEventListener('change', async event => {
  const file = event.target.files?.[0]; event.target.value = '';
  portabilityStatusKey = ''; pendingPlaylistImport = null; playlistImportPreviewData = null;
  try { pendingPlaylistImport = validatePlaylistPayload(await readImportFile(file)); }
  catch (error) { portabilityStatusKey = error instanceof RangeError ? 'portabilityFileTooLarge' : 'playlistImportInvalid'; }
  if (!pendingPlaylistImport && !portabilityStatusKey) portabilityStatusKey = 'playlistImportInvalid';
  playlistImportPreviewData = pendingPlaylistImport;
  renderPortability();
});
document.querySelector('#apply-playlist-import').addEventListener('click', () => {
  if (!pendingPlaylistImport) return;
  const theme = pendingPlaylistImport.theme;
  if (playlistImportModeSelect.value === 'replace' && !confirm(translate('confirmReplacePlaylist', displayThemeName(theme), pendingPlaylistImport.playlist.length))) return;
  persistState();
  const current = state.themes[theme].playlist;
  let next; let added = 0; let skipped = 0;
  if (playlistImportModeSelect.value === 'replace') {
    next = [...pendingPlaylistImport.playlist]; added = next.length;
  } else {
    next = [...current];
    for (const movie of pendingPlaylistImport.playlist) { if (next.some(existing => sameMovieRecord(existing, movie))) { skipped++; continue; } next.push(movie); added++; }
  }
  if (next.length > 60) { portabilityStatusKey = 'playlistImportLimit'; renderPortability(); return; }
  state.themes[theme].playlist = next; playlistImportStatusArgs = [added, skipped]; portabilityStatusKey = 'playlistImportDone'; pendingPlaylistImport = null; playlistImportPreviewData = null;
  activateImportedTheme(theme, true); renderPortability();
});
document.querySelector('#export-backup').addEventListener('click', () => downloadJSON(backupPayload(), 'halloween-roulette-backup.json'));
document.querySelector('#choose-backup-file').addEventListener('click', () => backupFileInput.click());
backupFileInput.addEventListener('change', async event => {
  const file = event.target.files?.[0]; event.target.value = '';
  portabilityStatusKey = ''; pendingBackupImport = null; backupImportPreviewData = null;
  try { pendingBackupImport = validateBackupPayload(await readImportFile(file)); }
  catch (error) { portabilityStatusKey = error instanceof RangeError ? 'portabilityFileTooLarge' : 'backupInvalid'; }
  if (!pendingBackupImport && !portabilityStatusKey) portabilityStatusKey = 'backupInvalid';
  backupImportPreviewData = pendingBackupImport;
  renderPortability();
});
document.querySelector('#apply-backup-import').addEventListener('click', () => {
  if (!pendingBackupImport) return;
  const summary = backupStats(pendingBackupImport);
  if (!confirm(translate('confirmReplaceBackup', ...summary))) return;
  cancelOnlineContext(); setEditorOpen(false);
  state.version = 5; state.activeTheme = pendingBackupImport.activeTheme; state.language = pendingBackupImport.language; state.soundEnabled = pendingBackupImport.soundEnabled; state.themes.halloween = pendingBackupImport.themes.halloween; state.themes.christmas = pendingBackupImport.themes.christmas;
  state.musicEnabled = pendingBackupImport.musicEnabled; musicEnabled = state.musicEnabled;
  activeTheme = state.activeTheme; language = state.language; soundEnabled = state.soundEnabled; themeData = state.themes[activeTheme]; history = themeData.history; viewed = themeData.viewed; avoidViewed = themeData.avoidViewed; currentSession = themeData.sessions.at(-1) ?? null;
  drawModeSelect.value = themeData.drawMode ?? 'wheel'; drawPaceSelect.value = themeData.drawPace ?? 'fast';
  input.value = themeData.playlist.map(movie => movie.title).join('\n'); themeSelect.value = activeTheme; languageSelect.value = language; portabilityThemeSelect.value = activeTheme;
  lastResultMovieId = null; lastResultType = 'single'; winningIndex = -1; showAllHistory = false; marathonStatusKey = ''; marathonStatusArgs = []; selectedCollection = 'all'; catalogSearchInput.value = ''; catalogRequestController?.abort(); remoteSearchResults = null; catalogStatusOverride = '';
  pendingBackupImport = null; backupImportPreviewData = null; portabilityStatusKey = 'backupImported';
  syncTheme(); updateList(); renderHistory(); renderStorageWarning();
});
readSharedPlaylist();

const rollSound = new Audio('slot.wav'); rollSound.loop = true; rollSound.volume = 0.25;
const endSound = new Audio('ding.mp3'); endSound.volume = 0.4;
const doorSounds = ['audio/zombie.mp3', 'audio/witch-laugh.mp3', 'door-ghost.wav'].map(src => {
  const audio = new Audio(src); audio.volume = 0.4; return audio;
});
const alternateWitchSound = new Audio('audio/witch-laugh-evil.mp3'); alternateWitchSound.volume = 0.4;
let witchSound = doorSounds[1];
const backgroundMusic = new Audio('audio/halloween-theme.mp3');
backgroundMusic.loop = true; backgroundMusic.volume = 0.18; backgroundMusic.preload = 'none';
let musicPlayVersion = 0;
let musicUnlocked = false;
function syncMusicButton() {
  const button = document.querySelector('#music');
  button.hidden = activeTheme !== 'halloween';
  button.setAttribute('aria-pressed', String(musicEnabled));
  button.textContent = translate(musicEnabled ? 'musicOff' : 'musicOn');
}
function syncMusicPlayback(allowPlay = false) {
  const version = ++musicPlayVersion;
  if (!musicEnabled || activeTheme !== 'halloween' || document.hidden) backgroundMusic.pause();
  else if (allowPlay && musicUnlocked && backgroundMusic.paused) backgroundMusic.play().catch(() => {
    if (version !== musicPlayVersion) return;
    musicEnabled = false; persistState(); syncMusicButton();
    document.querySelector('#music-status').textContent = translate('musicUnavailable');
  });
  syncMusicButton();
}
document.querySelector('#music').addEventListener('click', () => {
  musicUnlocked = true;
  musicEnabled = !musicEnabled; document.querySelector('#music-status').textContent = '';
  persistState(); syncMusicPlayback(true);
});
// A restored preference starts only after a user gesture, respecting autoplay rules.
function unlockMusic() { musicUnlocked = true; syncMusicPlayback(true); }
document.body.addEventListener('pointerdown', unlockMusic);
document.body.addEventListener('keydown', unlockMusic);
document.addEventListener?.('visibilitychange', () => syncMusicPlayback(true));
let activeDoorSound = null;
let doorSoundStartedAt = 0;
let doorSoundOffset = 0;
function stopDoorSounds() {
  [...doorSounds, alternateWitchSound].forEach(audio => { audio.pause(); audio.currentTime = 0; });
}
function syncSoundButton() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  const label = soundEnabled ? translate('soundOn') : translate('soundOff');
  soundButton.setAttribute('aria-label', label); soundButton.title = label;
  soundButton.classList.toggle('is-muted', !soundEnabled);
}
function setSound(enabled) {
  soundEnabled = enabled; persistState(); syncSoundButton();
  if (!enabled) { rollSound.pause(); rollSound.currentTime = 0; endSound.pause(); endSound.currentTime = 0; stopDoorSounds(); }
  else if (spinning && activeDoorSound) {
    const elapsed = (performance.now() - doorSoundStartedAt) / 1000;
    if (elapsed < (Number.isFinite(activeDoorSound.duration) ? activeDoorSound.duration : 2.3)) { activeDoorSound.currentTime = elapsed; activeDoorSound.play().catch(() => {}); }
  } else if (spinning) { rollSound.currentTime = 0; rollSound.play().catch(() => {}); }
}
function renderHistory() {
  const list = document.querySelector('#history'); list.replaceChildren();
  const entries = Object.values(history).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  const shown = showAllHistory ? entries : entries.slice(0, HISTORY_LIMIT);
  for (const entry of shown) {
    const row = document.createElement('li'); const name = movieDetailsButton(playlistRecords().find(movie => movie.id === entry.id) ?? createMovie(entry.title)); const badge = document.createElement('b');
    name.textContent = entry.title; badge.textContent = translate('historyCount', entry.count); row.append(name, badge); list.append(row);
  }
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  document.querySelector('#history-stats').textContent = translate('historyStats', entries.length, total);
  if (!entries.length) { const empty = document.createElement('li'); empty.textContent = translate('emptyHistory'); list.append(empty); }
  const toggle = document.querySelector('#history-toggle');
  toggle.hidden = entries.length <= HISTORY_LIMIT;
  toggle.textContent = showAllHistory ? translate('less') : translate('more');
}
function sessionDateLabel(session) {
  const locale = language === 'pt-PT' ? 'pt-PT' : 'en-US';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.createdAt));
}
function renderMarathonResult(session) {
  const container = document.querySelector('#marathon-result');
  const list = document.querySelector('#marathon-order');
  list.replaceChildren();
  container.hidden = !session;
  if (!session) return;
  session.movies.forEach(movie => {
    const item = document.createElement('li');
    const title = document.createElement('span'); title.textContent = movie.title;
    const isViewed = viewed.includes(movie.id);
    const watched = document.createElement('button'); watched.type = 'button'; watched.className = 'text-button session-watch-button';
    watched.textContent = translate(isViewed ? 'undoViewed' : 'markViewed');
    watched.setAttribute('aria-label', translate(isViewed ? 'sessionMovieUnviewed' : 'sessionMovieViewed', movie.title));
    watched.setAttribute('aria-pressed', String(isViewed));
    watched.addEventListener('click', () => setWatched(movie.id, !viewed.includes(movie.id)));
    item.append(title, watched); list.append(item);
  });
  const known = session.movies.filter(movie => Number.isSafeInteger(movie.runtimeMinutes));
  const total = known.reduce((sum, movie) => sum + movie.runtimeMinutes, 0);
  document.querySelector('#marathon-total').textContent = known.length === session.movies.length
    ? translate('runtimeTotal', total)
    : total > 0 ? translate('runtimeTotalIncomplete', total) : translate('runtimeAllUnknown');
}
function renderSessionHistory() {
  const list = document.querySelector('#session-history');
  const sessions = themeData.sessions ?? [];
  list.replaceChildren();
  document.querySelector('#session-history-empty').hidden = sessions.length > 0;
  for (const session of [...sessions].slice(-10).reverse()) {
    const item = document.createElement('li');
    const titles = session.movies.map(movie => movie.title).join(' → ');
    item.textContent = translate('sessionSummary', sessionDateLabel(session), titles);
    list.append(item);
  }
}
function renderSessionPanel() {
  if (currentSession && !(themeData.sessions ?? []).some(session => session.id === currentSession.id)) currentSession = null;
  if (!currentSession) currentSession = themeData.sessions?.at(-1) ?? null;
  renderMarathonResult(currentSession);
  renderSessionHistory();
}
document.querySelector('#history-toggle').addEventListener('click', () => { showAllHistory = !showAllHistory; renderHistory(); });
document.querySelector('#clear-history').addEventListener('click', () => {
  if (!spinning && confirm(translate('confirmClearHistory'))) { history = {}; themeData.history = history; showAllHistory = false; persistState(); renderHistory(); }
});
function movieList() { return playlistRecords().map(movie => movie.title); }
function eligibleRecords(overrides = {}) {
  const selectedMoods = overrides.moods ?? themeData.filters?.moods ?? [];
  const maxDuration = overrides.maxDuration === undefined ? themeData.filters?.maxDuration ?? null : overrides.maxDuration;
  return playlistRecords().filter(movie => {
    if (avoidViewed && viewed.includes(movie.id)) return false;
    if (selectedMoods.length && !selectedMoods.some(mood => movie.moods.includes(mood))) return false;
    if (maxDuration !== null && (!Number.isSafeInteger(movie.runtimeMinutes) || movie.runtimeMinutes > maxDuration)) return false;
    return true;
  });
}
function syncMetadataEditor() {
  const selectedId = metadataMovieSelect.value;
  metadataMovieSelect.replaceChildren();
  for (const movie of playlistRecords()) {
    const option = document.createElement('option'); option.value = movie.id; option.textContent = movie.title; metadataMovieSelect.append(option);
  }
  const chosen = playlistRecords().find(movie => movie.id === selectedId) ?? playlistRecords()[0] ?? null;
  metadataMovieSelect.value = chosen?.id ?? '';
  metadataMovieSelect.disabled = !chosen;
  metadataRuntimeInput.disabled = !chosen;
  document.querySelector('#save-metadata').disabled = !chosen;
  for (const input of metadataMoodInputs) input.disabled = !chosen;
  if (!chosen) { metadataRuntimeInput.value = ''; for (const input of metadataMoodInputs) input.checked = false; return; }
  metadataRuntimeInput.value = chosen.runtimeMinutes ?? '';
  metadataMoodInputs.forEach(input => { input.checked = chosen.moods.includes(input.value); });
}
function surpriseRecords() {
  const mood = surpriseMoodSelect.value;
  const maxDuration = surpriseDurationSelect.value === 'any' ? null : Number(surpriseDurationSelect.value);
  return eligibleRecords().filter(movie => (!mood || mood === 'any' || movie.moods.includes(mood)) &&
    (maxDuration === null || (Number.isSafeInteger(movie.runtimeMinutes) && movie.runtimeMinutes <= maxDuration)));
}
function updateSurprisePreview() {
  const matching = surpriseRecords();
  const selectedMood = surpriseMoodSelect.value;
  const maxDuration = surpriseDurationSelect.value === 'any' ? null : Number(surpriseDurationSelect.value);
  const moodCandidates = eligibleRecords().filter(movie => !selectedMood || selectedMood === 'any' || movie.moods.includes(selectedMood));
  const unknownRuntime = maxDuration === null ? 0 : moodCandidates.filter(movie => !Number.isSafeInteger(movie.runtimeMinutes)).length;
  const status = matching.length ? translate('surpriseMatches', matching.length) : translate('surpriseNoMatch');
  document.querySelector('#surprise-status').textContent = [status, ...(unknownRuntime ? [translate('filterStatusUnknown', unknownRuntime)] : [])].join(' ');
  document.querySelector('#surprise-discover').hidden = matching.length > 0;
  document.querySelector('#surprise-submit').disabled = matching.length === 0 || spinning || playlistRecords().length > 60;
  return matching;
}
function updateMarathonAvailability() {
  const eligible = eligibleRecords();
  const button = document.querySelector('#marathon-submit');
  button.disabled = !eligible.length || spinning || playlistRecords().length > 60;
  if (!marathonStatusKey) document.querySelector('#marathon-status').textContent = eligible.length ? translate('marathonPoolCount', eligible.length) : translate('marathonNoMatch');
}
function runMarathon() {
  const pool = eligibleRecords();
  const requested = Number(marathonCountSelect.value);
  if (!pool.length || ![1, 2, 3].includes(requested)) {
    marathonStatusKey = 'marathonNoMatch'; marathonStatusArgs = [];
    document.querySelector('#marathon-status').textContent = translate(marathonStatusKey);
    return;
  }
  if (pool.length < requested && !confirm(translate('marathonTooFew', requested, pool.length))) {
    marathonStatusKey = 'marathonCancelled'; marathonStatusArgs = [];
    document.querySelector('#marathon-status').textContent = translate(marathonStatusKey);
    return;
  }
  spin(pool, Math.min(requested, pool.length), 'marathon', requested);
}
function syncWatchButton() {
  const isShown = Boolean(lastResultMovieId) && lastResultType === 'single';
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
  const preview = document.querySelector('#playlist-preview'); preview.replaceChildren();
  for (const movie of playlistRecords()) {
    const item = document.createElement('li'); item.dataset.movieId = movie.id; item.append(movieDetailsButton(movie));
    const actions = document.createElement('div'); actions.className = 'movie-row-actions';
    for (const [key, action] of [
      ['editTitle', () => editMovieTitle(movie.id)],
      ['removeMovie', () => removeMovie(movie.id)],
      [viewed.includes(movie.id) ? 'undoViewed' : 'markViewed', () => setWatched(movie.id, !viewed.includes(movie.id))]
    ]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'text-button';
      button.textContent = translate(key); button.disabled = spinning;
      button.setAttribute('aria-label', `${translate(key)}: ${movie.title}`);
      button.addEventListener('click', action); actions.append(button);
    }
    item.append(actions); preview.append(item);
  }
  document.querySelector('#eligible-list-label').textContent = translate('eligibleList');
  const list = document.querySelector('#eligible-list'); list.replaceChildren();
  for (const movie of eligible) { const item = document.createElement('li'); item.append(movieDetailsButton(movie)); list.append(item); }
  const suggestion = document.querySelector('#poster-suggestion');
  suggestion.textContent = translate('posterSuggestion'); suggestion.hidden = activeTheme !== 'halloween' || eligible.length < 20 || drawModeSelect.value === 'posters';

  document.querySelector('#eligible-count').textContent = eligible.length;
  document.querySelector('#eligible-label').textContent = translate('eligibleMovies', eligible.length);
  document.querySelector('#eligibility-summary').hidden = eligible.length === total;
  avoidViewedInput.checked = avoidViewed;
  const filters = themeData.filters ??= { moods: [], maxDuration: null };
  filterMoodInputs.forEach(input => { input.checked = filters.moods.includes(input.value); });
  durationFilter.value = filters.maxDuration === null ? 'any' : String(filters.maxDuration);
  const filterNotes = [];
  if (filters.maxDuration !== null) {
    const missingRuntime = playlistRecords().filter(movie => (!avoidViewed || !viewed.includes(movie.id)) && (!filters.moods.length || filters.moods.some(mood => movie.moods.includes(mood))) && !Number.isSafeInteger(movie.runtimeMinutes)).length;
    if (missingRuntime) filterNotes.push(translate('filterStatusUnknown', missingRuntime));
  }
  if (filters.moods.length) {
    const missingMood = playlistRecords().filter(movie => !movie.moods.length).length;
    if (missingMood) filterNotes.push(translate('filterStatusNoMood', missingMood));
  }
  document.querySelector('#filter-status').textContent = filterNotes.join(' ');
  syncMetadataEditor();
  const exhausted = avoidViewed && total > 0 && playlistRecords().every(movie => viewed.includes(movie.id));
  document.querySelector('#exhausted-actions').hidden = !exhausted;
  const valid = eligible.length > 0 && total <= 60;
  spinButton.disabled = !valid || spinning;
  document.querySelector('#list-status').textContent = total > 60 ? translate('maximum') : total === 0 ? translate('atLeastTwo') : translate(storageDirty ? 'memoryOnly' : 'ready');
  document.querySelector('#hint').textContent = eligible.length ? translate('hint', eligible.length) : exhausted ? translate('exhausted') : total > 0 ? translate('noFilterMatches') : translate('chooseRange');
  if (!eligible.length && !exhausted && total > 0) filterNotes.push(translate('noFilterMatches'));
  document.querySelector('#filter-status').textContent = filterNotes.join(' ');
  if (redraw) drawWheel(eligible);
  updateSurprisePreview();
  updateMarathonAvailability();
  return eligible;
}
function displayTitle(movie) { return String(movie.title ?? '').replace(/\s*\(\d{4}\)\s*$/, ''); }
function matchesCollection(movie) {
  return selectedCollection === 'all' || movie.collections?.includes(selectedCollection) ||
    (selectedCollection === 'horror' && movie.genres?.includes('Horror')) ||
    (selectedCollection === 'mystery' && movie.genres?.includes('Mystery'));
}
function matchesSearch(movie, query) {
  const cleanQuery = normalizeTitle(query);
  if (!cleanQuery) return true;
  const year = cleanQuery.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/)?.[1];
  const titleQuery = cleanQuery.replace(/\b(18\d{2}|19\d{2}|20\d{2})\b/g, '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const titleMatches = normalizeTitle(movie.title).includes(titleQuery || cleanQuery) || normalizeTitle(movie.translatedTitle ?? '').includes(titleQuery || cleanQuery);
  return year ? movie.year === Number(year) && (!titleQuery || titleMatches) : titleMatches || String(movie.year ?? '').includes(cleanQuery);
}
function localCatalogMatches() {
  return (CURATED_CATALOG[activeTheme] ?? []).filter(movie => matchesCollection(movie) && matchesSearch(movie, catalogSearchInput.value) && (catalogSearchInput.value.trim() || !movieIsAdded(movie)));
}
function safePosterUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'image.tmdb.org' ? url.href : null;
  } catch { return null; }
}
function genreLabel(genre) {
  const translated = {
    'pt-PT': { Action: 'Ação', Adventure: 'Aventura', Animation: 'Animação', Comedy: 'Comédia', Drama: 'Drama', Family: 'Familiar', Fantasy: 'Fantasia', Horror: 'Terror', Musical: 'Musical', Mystery: 'Mistério', Romance: 'Romance', Thriller: 'Suspense' },
    en: {}
  };
  return translated[language][genre] ?? genre;
}
function movieTitleKey(title) {
  return String(title ?? '').replace(/\s*\(\d{4}\)\s*$/, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/^(the|a|an) /, '');
}
function sameMovieTitle(first, second) {
  const year = movie => movie.year ?? (Number(String(movie.title).match(/\((\d{4})\)\s*$/)?.[1]) || null);
  const firstYear = year(first), secondYear = year(second);
  if (firstYear && secondYear && firstYear !== secondYear) return false;
  const firstKeys = [first.title, first.translatedTitle].filter(Boolean).map(movieTitleKey);
  return [second.title, second.translatedTitle].filter(Boolean).some(title => firstKeys.includes(movieTitleKey(title)));
}
function knownTmdbId(movie) {
  if (Number.isSafeInteger(movie.tmdbId)) return movie.tmdbId;
  const title = Object.keys(HALLOWEEN_TMDB_IDS).find(title => sameMovieTitle(movie, { title }));
  return title ? HALLOWEEN_TMDB_IDS[title] : null;
}
function movieIsAdded(movie) {
  const id = knownTmdbId(movie);
  return playlistRecords().some(existing => (id && id === knownTmdbId(existing)) || existing.id === movie.id || sameMovieTitle(existing, movie));
}
let movieDetailOpener = null;
let movieDetailRequest = null;
function movieDetailsButton(movie, label = movie.title) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'movie-title-action'; button.textContent = label;
  button.setAttribute('aria-haspopup', 'dialog');
  button.addEventListener('click', () => openMovieDetails(movie)); return button;
}
function renderMovieDetails(movie, details = null) {
  document.querySelector('#movie-detail-title').textContent = movie.title;
  const body = document.querySelector('#movie-detail-body'); body.replaceChildren();
  const grid = document.createElement('div'); grid.className = 'movie-detail-grid';
  const posterUrl = safePosterUrl(details ? imageUrlFromPath(details.poster_path) || movie.posterUrl : movie.posterUrl);
  if (posterUrl) { const image = document.createElement('img'); image.className = 'movie-detail-poster'; image.src = posterUrl; image.alt = translate('posterAlt', displayTitle(movie)); image.addEventListener('error', () => image.remove()); grid.append(image); }
  const info = document.createElement('div');
  const meta = document.createElement('p'); meta.className = 'movie-detail-meta';
  const runtime = details?.runtime || movie.runtimeMinutes;
  const genres = details?.genres?.map(genre => genre.name) ?? movie.genres;
  meta.textContent = [movie.year, runtime ? `${runtime} min` : null, genres.map(genreLabel).join(' · ')].filter(Boolean).join(' · '); info.append(meta);
  const rating = details?.vote_average ?? movie.tmdbRating;
  if (Number.isFinite(rating) && rating > 0) {
    const badge = document.createElement('p'); badge.className = 'movie-detail-rating';
    badge.textContent = `★ TMDB ${rating.toFixed(1)}/10${details?.vote_count ? ` · ${details.vote_count} ${language === 'pt-PT' ? 'votos' : 'votes'}` : ''}`; info.append(badge);
  }
  const synopsis = document.createElement('p'); synopsis.className = 'movie-detail-overview';
  synopsis.textContent = details?.overview || movie.overview?.[language] || movie.overview?.en || (language === 'pt-PT' ? 'Sinopse indisponível.' : 'Synopsis unavailable.'); info.append(synopsis);
  grid.append(info); body.append(grid);
  const cast = document.createElement('p'); cast.className = 'movie-detail-cast';
  const names = details?.credits?.cast?.slice(0, 6).map(actor => actor.name).filter(Boolean) ?? [];
  cast.textContent = `${language === 'pt-PT' ? 'Elenco' : 'Cast'}: ${names.length ? names.join(' · ') : language === 'pt-PT' ? 'indisponível' : 'unavailable'}`; body.append(cast);
  const director = details?.credits?.crew?.filter(person => person.job === 'Director').map(person => person.name) ?? [];
  if (director.length) { const line = document.createElement('p'); line.className = 'movie-detail-meta'; line.textContent = `${language === 'pt-PT' ? 'Realização' : 'Director'}: ${director.join(', ')}`; body.append(line); }
  const id = details?.id ?? movie.tmdbId ?? knownTmdbId(movie);
  if (id) { const link = document.createElement('a'); link.className = 'imdb-link'; link.href = `https://www.themoviedb.org/movie/${id}`; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = language === 'pt-PT' ? 'Ver no TMDB ↗' : 'View on TMDB ↗'; body.append(link); }
}
async function openMovieDetails(movie) {
  if (spinning) return;
  movieDetailRequest?.abort(); movieDetailRequest = new AbortController();
  const { signal } = movieDetailRequest;
  const dialog = document.querySelector('#movie-dialog');
  renderMovieDetails(movie);
  document.querySelector('#movie-dialog-close').setAttribute('aria-label', language === 'pt-PT' ? 'Fechar detalhes' : 'Close details');
  if (!dialog.open) { movieDetailOpener = document.activeElement; dialog.showModal(); }
  document.body.classList.add('movie-modal-open');
  const status = document.querySelector('#movie-detail-status');
  if (!tmdbConfig()) { status.textContent = language === 'pt-PT' ? 'A mostrar os dados disponíveis na tua lista.' : 'Showing the data available in your list.'; return; }
  status.textContent = language === 'pt-PT' ? 'A carregar detalhes…' : 'Loading details…';
  try {
    let id = knownTmdbId(movie);
    if (!id) {
      const response = await tmdbRequest('search/movie', { query: displayTitle(movie), primary_release_year: movie.year, language: 'en-US' }, signal);
      if (signal.aborted) return;
      const matches = (response.results ?? []).filter(item => sameMovieTitle(movie, normalizeTmdbMovie(item, null) ?? {}));
      if (matches.length === 1) id = matches[0].id;
    }
    if (!id) { status.textContent = language === 'pt-PT' ? 'Não encontrei uma correspondência exata no TMDB.' : 'No exact TMDB match found.'; return; }
    const details = await getMovieDetails(id, signal);
    if (signal.aborted) return;
    renderMovieDetails(movie, details); status.textContent = '';
  } catch (error) {
    if (signal.aborted) return;
    status.textContent = onlineErrorMessage(error);
  }
}
document.querySelector('#movie-dialog-close').addEventListener('click', () => document.querySelector('#movie-dialog').close());
document.querySelector('#movie-dialog').addEventListener('close', () => { movieDetailRequest?.abort(); document.body.classList.remove('movie-modal-open'); movieDetailOpener?.focus(); });
document.querySelector('#movie-dialog').addEventListener('click', event => {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
});
document.querySelector('#result-title').setAttribute('aria-haspopup', 'dialog');
document.querySelector('#result-title').addEventListener('click', () => {
  const movie = playlistRecords().find(movie => movie.id === lastResultMovieId); if (movie) openMovieDetails(movie);
});
function createCatalogCard(movie) {
  const card = document.createElement('article'); card.className = 'movie-card';
  const poster = document.createElement('button'); poster.type = 'button'; poster.className = 'movie-poster'; poster.setAttribute('aria-label', movie.title); poster.setAttribute('aria-haspopup', 'dialog');
  const fallback = document.createElement('div'); fallback.className = 'poster-fallback'; fallback.setAttribute('role', 'img'); fallback.setAttribute('aria-label', translate('posterUnavailable'));
  const posterWords = document.createElement('span'); posterWords.textContent = translate('posterUnavailable');
  const posterTitle = document.createElement('strong'); posterTitle.textContent = displayTitle(movie);
  fallback.append(posterWords, posterTitle); poster.append(fallback);
  const posterUrl = safePosterUrl(movie.posterUrl);
  if (posterUrl) {
    const image = document.createElement('img'); image.src = posterUrl; image.alt = translate('posterAlt', displayTitle(movie)); image.loading = 'lazy';
    image.addEventListener('load', () => { fallback.hidden = true; });
    image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; });
    poster.append(image);
  }
  const body = document.createElement('div'); body.className = 'movie-card-content';
  const heading = document.createElement('h3'); heading.append(movieDetailsButton(movie, displayTitle(movie)));
  poster.addEventListener('click', () => openMovieDetails(movie));
  const meta = document.createElement('p'); meta.className = 'movie-card-meta';
  const year = Number.isSafeInteger(movie.year) ? movie.year : (String(movie.title).match(/\((\d{4})\)\s*$/)?.[1] ?? null);
  const duration = Number.isSafeInteger(movie.runtimeMinutes) && movie.runtimeMinutes > 0 ? translate('durationValue', movie.runtimeMinutes) : translate('durationUnknown');
  meta.textContent = [year, duration].filter(Boolean).join(' · ');
  body.append(heading, meta);
  if (movie.translatedTitle && normalizeTitle(movie.translatedTitle) !== normalizeTitle(displayTitle(movie))) {
    const altTitle = document.createElement('p'); altTitle.className = 'movie-card-alt-title'; altTitle.textContent = movie.translatedTitle; body.append(altTitle);
  }
  const overviewText = movie.overview?.[language] || movie.overview?.['pt-PT'] || movie.overview?.en || '';
  if (overviewText) { const overview = document.createElement('p'); overview.className = 'movie-card-overview'; overview.textContent = overviewText; body.append(overview); }
  if (movie.genres?.length) {
    const genres = document.createElement('ul'); genres.className = 'movie-genres'; genres.setAttribute('aria-label', language === 'pt-PT' ? 'Géneros' : 'Genres');
    for (const genre of movie.genres) { const item = document.createElement('li'); item.textContent = genreLabel(genre); genres.append(item); }
    body.append(genres);
  } else {
    const noGenres = document.createElement('p'); noGenres.className = 'movie-card-note'; noGenres.textContent = translate('noGenres'); body.append(noGenres);
  }
  const tags = document.createElement('div'); tags.className = 'movie-card-tags';
  const source = document.createElement('span'); source.className = `catalog-source source-${movie.source === 'tmdb' ? 'tmdb' : 'curated'}`; source.textContent = translate(movie.source === 'tmdb' ? 'tmdbLabel' : 'curatedLabel'); tags.append(source);
  if (Number.isFinite(movie.tmdbRating)) { const rating = document.createElement('span'); rating.className = 'tmdb-rating'; rating.textContent = translate('tmdbRating', movie.tmdbRating); tags.append(rating); }
  body.append(tags);
  const actions = document.createElement('div'); actions.className = 'movie-card-actions';
  const added = movieIsAdded(movie);
  const add = document.createElement('button'); add.type = 'button'; add.className = 'text-button add-movie'; add.disabled = added;
  add.textContent = translate(added ? 'alreadyOnWheel' : 'addToWheel');
  add.setAttribute('aria-label', translate(added ? 'alreadyOnWheel' : 'addMovie', displayTitle(movie)));
  add.addEventListener('click', () => addCatalogMovie(movie)); actions.append(add);
  if (typeof movie.imdbId === 'string' && /^tt\d{7,}$/.test(movie.imdbId)) {
    const imdb = document.createElement('a'); imdb.className = 'imdb-link'; imdb.href = `https://www.imdb.com/title/${encodeURIComponent(movie.imdbId)}/`; imdb.target = '_blank'; imdb.rel = 'noreferrer'; imdb.textContent = translate('imdbLink'); imdb.setAttribute('aria-label', `${translate('imdbLink')}: ${displayTitle(movie)}`); actions.append(imdb);
  }
  body.append(actions); card.append(poster, body); return card;
}
function renderCatalog() {
  if (typeof CURATED_CATALOG === 'undefined') return;
  const results = remoteSearchResults ?? localCatalogMatches();
  catalogResults.replaceChildren();
  for (const movie of results) catalogResults.append(createCatalogCard(movie));
  const status = catalogStatusOverride || (tmdbConfig() ? (language === 'pt-PT' ? 'Sugestões locais. Pesquisa um título para encontrar filmes e cartazes no TMDB.' : 'Local suggestions. Search a title to find movies and posters on TMDB.') : translate('localCatalogStatus'));
  document.querySelector('#catalog-status').textContent = status;
  if (!results.length) {
    const empty = document.createElement('p'); empty.className = 'catalog-empty';
    empty.textContent = remoteSearchResults ? translate('tmdbNoResults') : translate('noCatalogResults');
    catalogResults.append(empty);
  }
  const attribution = document.querySelector('#tmdb-attribution');
  const logo = document.querySelector('#tmdb-logo');
  const config = tmdbConfig();
  attribution.hidden = !config;
  if (config) { logo.src = config.logo.href; logo.hidden = false; }
  else { logo.removeAttribute('src'); logo.hidden = true; }
}
function halloweenRecommendation(movie) {
  if (movie.genres.some(genre => ['Horror', 'Mystery'].includes(genre))) return true;
  if (!movie.genres.some(genre => ['Family', 'Fantasy'].includes(genre))) return false;
  const words = [movie.title, movie.translatedTitle, ...Object.values(movie.overview ?? {})].join(' ');
  return /halloween|haunt|ghost|witch|vampir|zombi|werewolf|monster|spooky|macabre|undead|supernatural|fantasm|bruxa|assombr|lobisom|monstr|sobrenatural|macabr|mortos.vivos/i.test(words);
}
function recommendationSeeds() {
  // Sleepy Hollow, Odd Thomas, Scream (1996), Monster House: verified TMDB
  // identities from https://www.imdb.com/list/ls052334489/ (movies only).
  const ids = activeTheme === 'halloween' ? [2668, 179826, 4232, 9297] : [];
  ids.push(...playlistRecords().map(movie => movie.tmdbId).filter(Number.isSafeInteger), ...playlistRecords().map(knownTmdbId).filter(Boolean));
  if (activeTheme === 'halloween') ids.push(948, 10439, 4011, 14836, 1933, 138843, 2907, 23202, 10166, 77174, 62214, 927, ...Object.values(HALLOWEEN_TMDB_IDS));
  return [...new Set(ids)];
}
function recommendationKey() { return activeTheme + ':' + language; }
function renderRelatedRecommendations() {
  const more = document.querySelector('#related-more');
  if (relatedCache.key !== recommendationKey()) { relatedResults.replaceChildren(); more.hidden = true; return; }
  const movies = relatedCache.movies.filter(movie => !movieIsAdded(movie) && matchesCollection(movie));
  relatedResults.replaceChildren(...movies.slice(0, relatedCache.visible).map(createCatalogCard));
  more.hidden = relatedCache.visible >= movies.length && relatedCache.seedIndex >= (relatedCache.seeds ?? recommendationSeeds()).length;
  more.disabled = relatedCache.loading;
  more.textContent = translate('relatedMore');
  if (!relatedCache.loading) document.querySelector('#related-status').textContent = movies.length ? (activeTheme === 'halloween' ? translate('relatedCount', Math.min(relatedCache.visible, movies.length)) : '') : translate('relatedEmpty');
}
async function loadRelatedRecommendations(more = false) {
  const key = recommendationKey();
  if (relatedCache.key !== key) {
    relatedController?.abort();
    relatedCache = { key, movies: [], seedIndex: 0, visible: 16, loading: false };
  }
  if (relatedCache.loading) return;
  const cache = relatedCache;
  document.querySelector('#related-section').hidden = false;
  if (!tmdbConfig()) { document.querySelector('#related-status').textContent = translate('relatedOffline'); return; }
  const seeds = cache.seeds ?? (cache.seeds = recommendationSeeds());
  if (!seeds.length) { document.querySelector('#related-status').textContent = translate('relatedNoIds'); return; }
  if (more) cache.visible += 16;
  if (!more && (cache.movies.filter(movie => !movieIsAdded(movie) && matchesCollection(movie)).length >= cache.visible || cache.seedIndex >= seeds.length)) { renderRelatedRecommendations(); return; }
  cache.loading = true;
  relatedController = new AbortController();
  const { signal } = relatedController;
  document.querySelector('#related-status').textContent = translate('relatedLoading');
  document.querySelector('#related-more').disabled = true;
  try {
    let batches = 0;
    while (cache.movies.filter(movie => !movieIsAdded(movie) && matchesCollection(movie)).length < cache.visible && cache.seedIndex < seeds.length && batches++ < 3) {
      const batch = seeds.slice(cache.seedIndex, cache.seedIndex + 2);
      const responses = await Promise.all(batch.map(id => tmdbRequest('movie/' + id + '/recommendations', { language: 'en-US', page: 1 }, signal)));
      if (key !== recommendationKey() || cache !== relatedCache) return;
      cache.seedIndex += batch.length;
      for (const response of responses) for (const item of response.results ?? []) {
        if (!Number.isSafeInteger(item.id) || item.adult === true) continue;
        const movie = normalizeTmdbMovie(item, null);
        if (!movie || movieIsAdded(movie) || (CURATED_CATALOG[activeTheme] ?? []).some(curated => knownTmdbId(curated) === movie.tmdbId || sameMovieTitle(curated, movie)) || (activeTheme === 'halloween' && !halloweenRecommendation(movie))) continue;
        movie.collections = [];
        if (movie.genres.includes('Horror')) movie.collections.push('horror');
        if (movie.genres.includes('Mystery')) movie.collections.push('mystery');
        if (movie.genres.some(genre => ['Family', 'Fantasy'].includes(genre))) movie.collections.push('halloween-family');
        if (!cache.movies.some(existing => existing.tmdbId === movie.tmdbId || sameMovieTitle(existing, movie))) cache.movies.push(movie);
      }
    }
    cache.loading = false; renderRelatedRecommendations();
  } catch (error) {
    if (signal.aborted || key !== recommendationKey() || cache !== relatedCache) return;
    cache.loading = false; renderRelatedRecommendations();
    document.querySelector('#related-status').textContent = translate('relatedError');
    document.querySelector('#related-more').hidden = false;
  }
}
document.querySelector('#related-more').addEventListener('click', () => loadRelatedRecommendations(true));

function setWatched(movieId, isWatched) {
  if (!movieId) return;
  viewed = isWatched ? [...new Set([...viewed, movieId])] : viewed.filter(id => id !== movieId);
  persistState();
  renderEligibility();
  syncWatchButton();
  renderSessionPanel();
}
watchButton.addEventListener('click', () => setWatched(lastResultMovieId, !viewed.includes(lastResultMovieId)));
function applyFiltersFromControls() {
  themeData.filters = {
    moods: filterMoodInputs.filter(input => input.checked).map(input => input.value),
    maxDuration: durationFilter.value === 'any' ? null : Number(durationFilter.value)
  };
  avoidViewed = avoidViewedInput.checked;
  themeData.avoidViewed = avoidViewed;
  marathonStatusKey = ''; marathonStatusArgs = [];
  persistState(); renderEligibility();
}
avoidViewedInput.addEventListener('change', applyFiltersFromControls);
filterMoodInputs.forEach(input => input.addEventListener('change', applyFiltersFromControls));
durationFilter.addEventListener('change', applyFiltersFromControls);
document.querySelector('#clear-filters').addEventListener('click', () => {
  themeData.filters = { moods: [], maxDuration: null };
  avoidViewed = false; themeData.avoidViewed = false;
  marathonStatusKey = ''; marathonStatusArgs = [];
  persistState(); renderEligibility();
});
metadataMovieSelect.addEventListener('change', syncMetadataEditor);
document.querySelector('#save-metadata').addEventListener('click', () => {
  const id = metadataMovieSelect.value;
  const movie = playlistRecords().find(item => item.id === id);
  if (!movie) { metadataStatusKey = 'metadataNoMovies'; document.querySelector('#metadata-status').textContent = translate(metadataStatusKey); return; }
  const rawRuntime = metadataRuntimeInput.value.trim();
  const runtime = rawRuntime === '' ? null : Number(rawRuntime);
  if (runtime !== null && (!Number.isSafeInteger(runtime) || runtime < 1 || runtime > 600)) { metadataStatusKey = 'metadataInvalid'; document.querySelector('#metadata-status').textContent = translate(metadataStatusKey); return; }
  const moods = metadataMoodInputs.filter(input => input.checked).map(input => input.value);
  themeData.playlist = playlistRecords().map(item => item.id === id ? createMovie(item.title, item.source, { ...item, runtimeMinutes: runtime, moods }) : item);
  marathonStatusKey = ''; marathonStatusArgs = [];
  persistState(); renderEligibility();
  metadataStatusKey = storageDirty ? 'memoryOnly' : 'metadataSaved';
  document.querySelector('#metadata-status').textContent = translate(metadataStatusKey);
});
surpriseMoodSelect.addEventListener('change', updateSurprisePreview);
surpriseDurationSelect.addEventListener('change', updateSurprisePreview);
document.querySelector('#surprise-submit').addEventListener('click', () => {
  const matching = updateSurprisePreview();
  if (matching.length) { document.querySelector('#surprise-status').textContent = translate('surpriseMatches', matching.length); spin(matching); }
});
marathonCountSelect.addEventListener('change', () => { marathonStatusKey = ''; marathonStatusArgs = []; updateMarathonAvailability(); });
document.querySelector('#marathon-submit').addEventListener('click', runMarathon);
document.querySelector('#surprise-discover').addEventListener('click', () => {
  const discovery = document.querySelector('#discover-panel'); discovery.open = true;
  catalogSearchInput.focus();
});
document.querySelector('#include-viewed').addEventListener('click', () => { avoidViewed = false; avoidViewedInput.checked = false; persistState(); renderEligibility(); });
document.querySelector('#reset-viewed').addEventListener('click', () => { viewed = []; persistState(); renderEligibility(); syncWatchButton(); });
catalogSearchInput.addEventListener('input', () => { catalogRequestController?.abort(); remoteSearchResults = null; catalogStatusOverride = ''; renderCatalog(); });
catalogSearchForm.addEventListener('submit', event => { event.preventDefault(); return searchOnline(catalogSearchInput.value); });
document.querySelectorAll('[data-collection]').forEach(button => button.addEventListener('click', () => {
  selectedCollection = button.getAttribute('data-collection') || 'all';
  remoteSearchResults = null; catalogStatusOverride = '';
  renderLanguage();
  if (document.querySelector('#discover-panel').open) return loadRelatedRecommendations();
}));
document.querySelector('#discover-panel').addEventListener('toggle', event => { if (event.target.open) loadRelatedRecommendations(); });
canvas.addEventListener('click', event => {
  if (spinning) return;
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width * 1000 - 500;
  const y = (event.clientY - bounds.top) / bounds.height * 1000 - 500;
  if (Math.hypot(x, y) < 150 || Math.hypot(x, y) > 495) return;
  const movies = eligibleRecords();
  const angle = ((Math.atan2(y, x) - rotation + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const movie = movies[Math.floor(angle / (Math.PI * 2) * movies.length)];
  if (movie) openMovieDetails(movie);
});
function updateList() {
  addExactEditorialMetadata(activeTheme, themeData);
  if (editor.hidden) input.value = themeData.playlist.map(movie => movie.title).join('\n');
  document.querySelector('#generate-share').disabled = themeData.playlist.length === 0;
  lastResultMovieId = null;
  winningIndex = -1;
  document.querySelector('#result').classList.remove('winner', 'reveal');
  document.querySelector('#result-label').textContent = translate('resultIdleLabel');
  document.querySelector('#result-title').textContent = translate('resultIdleTitle');
  document.querySelector('#result-description').textContent = translate('resultIdleDescription');
  syncWatchButton();
  persistState();
  renderEligibility();
  renderCatalog(); renderRelatedRecommendations();
}
function setEditorOpen(open) {
  if (open) { setWorkspace('collection'); input.value = editorDrafts.get(activeTheme) ?? playlistRecords().map(movie => movie.title).join('\n'); }
  editorError = ''; document.querySelector('#editor-error').textContent = '';
  document.querySelector('#cancel-edit').hidden = !open;
  document.querySelector('#playlist-preview').hidden = open;
  editor.hidden = !open;
  document.querySelector('#edit-toggle').hidden = open;
  document.querySelector('#edit-toggle').setAttribute('aria-expanded', String(open));
  document.querySelector('#finish-edit').hidden = !open;
}
document.querySelector('#edit-toggle').addEventListener('click', () => setEditorOpen(true));
document.querySelector('#finish-edit').addEventListener('click', saveEditor);
document.querySelector('#cancel-edit').addEventListener('click', () => { editorDrafts.delete(activeTheme); setEditorOpen(false); input.value = playlistRecords().map(movie => movie.title).join('\n'); document.querySelector('#edit-toggle').focus(); });
setEditorOpen(false);
const workspaceNames = ['session', 'collection', 'history'];
function setWorkspace(name, focus = false) {
  for (const current of ['session', 'collection', 'history']) {
    const selected = name === current;
    const tab = document.querySelector(`#tab-${current}`);
    tab.setAttribute('aria-selected', String(selected));
    tab.setAttribute('tabindex', selected ? '0' : '-1');
    document.querySelector(`#pane-${current}`).hidden = !selected;
    if (selected && focus) tab.focus();
  }
}
workspaceNames.forEach((name, index) => {
  const tab = document.querySelector(`#tab-${name}`);
  tab.addEventListener('click', () => setWorkspace(name));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % workspaceNames.length;
    else if (event.key === 'ArrowLeft') next = (index + workspaceNames.length - 1) % workspaceNames.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = workspaceNames.length - 1;
    else return;
    event.preventDefault(); setWorkspace(workspaceNames[next], true);
  });
});
document.querySelector('#collection-shortcut').addEventListener('click', () => setEditorOpen(true));
document.querySelector('#find-movies').addEventListener('click', () => {
  const discovery = document.querySelector('#discover-panel'); discovery.open = true;
  discovery.scrollIntoView?.({ behavior: 'auto', block: 'start' }); catalogSearchInput.focus();
});
function setAdvancedControlsDisabled(disabled) {
  for (const id of ['apply-playlist-import', 'apply-backup-import', 'import-shared', 'reset-viewed', 'include-viewed']) document.querySelector(`#${id}`).disabled = disabled;
  document.querySelectorAll('.catalog-card button, .session-watch-button').forEach(button => { button.disabled = disabled; });
  avoidViewedInput.disabled = disabled;
  filterMoodInputs.forEach(input => { input.disabled = disabled; });
  durationFilter.disabled = disabled;
  document.querySelector('#clear-filters').disabled = disabled;
  surpriseMoodSelect.disabled = disabled;
  surpriseDurationSelect.disabled = disabled;
  document.querySelector('#surprise-submit').disabled = disabled;
  marathonCountSelect.disabled = disabled;
  document.querySelector('#marathon-submit').disabled = disabled || !eligibleRecords().length || playlistRecords().length > 60;
  metadataMovieSelect.disabled = disabled || playlistRecords().length === 0;
  metadataRuntimeInput.disabled = disabled || playlistRecords().length === 0;
  metadataMoodInputs.forEach(input => { input.disabled = disabled || playlistRecords().length === 0; });
  document.querySelector('#save-metadata').disabled = disabled || playlistRecords().length === 0;
}
function recordSession(movies, kind) {
  const session = {
    id: `session:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(), kind,
    movies: movies.map(movie => ({ id: movie.id, title: movie.title, runtimeMinutes: movie.runtimeMinutes }))
  };
  themeData.sessions = [...(themeData.sessions ?? []), session].slice(-100);
  currentSession = session;
  return session;
}
input.addEventListener('input', () => { editorDrafts.set(activeTheme, input.value); document.querySelector('#editor-error').textContent = ''; });
spinButton.addEventListener('click', () => spin());
drawModeSelect.value = themeData.drawMode ?? 'wheel'; drawPaceSelect.value = themeData.drawPace ?? 'fast';
drawModeSelect.addEventListener('change', () => { stopDoorSounds(); activeDoorSound = null; doorCandidates = []; spinButton.disabled = !eligibleRecords().length; document.querySelector('#doors').replaceChildren(); syncDrawMode(); persistState(); });
drawPaceSelect.addEventListener('change', () => persistState());
resetButton.addEventListener('click', () => { if (!spinning) { input.value = activeTheme === 'christmas' ? CHRISTMAS_MOVIES.join('\n') : DEFAULT_MOVIES.join('\n'); editorDrafts.set(activeTheme, input.value); } });
soundButton.addEventListener('click', () => setSound(!soundEnabled));
languageSelect.value = language;
languageSelect.addEventListener('change', () => { cancelOnlineContext(); language = languageSelect.value === 'en' ? 'en' : 'pt-PT'; state.language = language; persistState(); renderLanguage(); if (document.querySelector('#discover-panel').open) loadRelatedRecommendations(); });
themeSelect.value = activeTheme;
themeSelect.addEventListener('change', () => {
  if (spinning) return;
  themeData.history = history;
  themeData.viewed = viewed;
  themeData.avoidViewed = avoidViewed;
  if (!editor.hidden) editorDrafts.set(activeTheme, input.value);
  setEditorOpen(false); cancelOnlineContext();
  activeTheme = themeSelect.value === 'christmas' ? 'christmas' : 'halloween';
  state.activeTheme = activeTheme;
  themeData = state.themes[activeTheme];
  drawModeSelect.value = themeData.drawMode ?? 'wheel'; drawPaceSelect.value = themeData.drawPace ?? 'fast';
  history = themeData.history;
  viewed = themeData.viewed;
  avoidViewed = themeData.avoidViewed;
  currentSession = themeData.sessions.at(-1) ?? null;
  lastResultType = 'single'; marathonStatusKey = ''; marathonStatusArgs = [];
  input.value = themeData.playlist.map(movie => movie.title).join('\n');
  selectedCollection = 'all';
  catalogSearchInput.value = '';
  catalogRequestController?.abort();
  remoteSearchResults = null;
  catalogStatusOverride = '';
  lastResultMovieId = null;
  winningIndex = -1;
  showAllHistory = false;
  document.querySelector('#result').classList.remove('winner', 'reveal');
  syncTheme(); syncMusicPlayback(true); syncDrawMode(); persistState(); updateList(); renderHistory();
});
syncTheme();
updateList();
renderHistory();
document.fonts?.ready.then(() => drawWheel());

document.querySelector('#storage-backup').addEventListener('click', () => downloadJSON(backupPayload(), 'halloween-roulette-backup.json'));
document.querySelector('#undo-remove').addEventListener('click', undoRemoval);
document.querySelector('#title-edit-form').addEventListener('submit', event => {
  event.preventDefault();
  if (renameMovie(titleEditId, document.querySelector('#title-edit-input').value)) document.querySelector('#title-edit-dialog').close();
  else document.querySelector('#title-edit-error').textContent = translate('invalidTitle');
});
document.querySelector('#title-edit-cancel').addEventListener('click', () => document.querySelector('#title-edit-dialog').close());
document.querySelector('#title-edit-dialog').addEventListener('close', () => {
  if (titleEditOpener?.isConnected) titleEditOpener.focus();
  else {
    const row = [...document.querySelectorAll('#playlist-preview li')].find(item => item.dataset.movieId === titleEditId);
    (row?.children[1]?.children[0] ?? document.querySelector('#edit-toggle')).focus();
  }
});
