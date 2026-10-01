function parseStored(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function renderStorageWarning() {
  const warning = document.querySelector('#storage-warning'); warning.hidden = !storageDirty;
  document.querySelector('#storage-warning-text').textContent = translate('memoryOnly');
  document.querySelector('#storage-backup').textContent = translate('exportBackup');
  if (storageDirty) {
    document.querySelector('#list-status').textContent = translate('memoryOnly');
    for (const id of ['metadata-status', 'portability-status', 'shared-preview-status']) document.querySelector(`#${id}`).textContent = translate('memoryOnly');
  }
}
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
    translatedTitle: typeof extra.translatedTitle === 'string' ? extra.translatedTitle : null,
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
function sanitizeSessions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-100).map(session => {
    if (!session || typeof session.id !== 'string' || typeof session.createdAt !== 'string' || !Number.isFinite(Date.parse(session.createdAt)) || !Array.isArray(session.movies)) return null;
    const seen = new Set();
    const movies = session.movies.filter(movie => movie && typeof movie.id === 'string' && typeof movie.title === 'string' && movie.title.trim()).map(movie => ({
      id: movie.id, title: movie.title,
      runtimeMinutes: Number.isSafeInteger(movie.runtimeMinutes) && movie.runtimeMinutes > 0 ? movie.runtimeMinutes : null
    })).filter(movie => { if (seen.has(movie.id)) return false; seen.add(movie.id); return true; }).slice(0, 3);
    if (!movies.length) return null;
    return { id: session.id, createdAt: session.createdAt, kind: session.kind === 'marathon' ? 'marathon' : 'single', movies };
  }).filter(Boolean);
}
function makeThemeState(playlistInput, historyInput, flags = {}) {
  const playlist = Array.isArray(playlistInput) ? sanitizePlaylist(playlistInput, '') : parseMovieLines(playlistInput);
  const history = sanitizeHistory(historyInput, playlist);
  const viewed = Array.isArray(flags.viewed) ? [...new Set(flags.viewed.filter(id => typeof id === 'string'))] : [];
  const moods = Array.isArray(flags.filters?.moods) ? [...new Set(flags.filters.moods.filter(mood => ['light', 'scary', 'nostalgic'].includes(mood)))] : [];
  const maxDuration = [90, 120, 150, 180].includes(flags.filters?.maxDuration) ? flags.filters.maxDuration : null;
  const sessions = sanitizeSessions(flags.sessions);
  return { playlist, history, viewed, avoidViewed: flags.avoidViewed === true, filters: { moods, maxDuration }, sessions,
    drawMode: ['wheel', 'doors', 'shuffle', 'posters'].includes(flags.drawMode) ? flags.drawMode : 'wheel',
    drawPace: flags.drawPace === 'suspense' ? 'suspense' : 'fast' };
}
function addExactEditorialMetadata(theme, themeData) {
  const curatedMovies = CURATED_CATALOG[theme] ?? [];
  themeData.playlist = themeData.playlist.map(movie => {
    const editorialKey = title => normalizeTitle(title).replace(/['’]/g, '');
    const editorial = curatedMovies.find(candidate => editorialKey(candidate.title) === editorialKey(movie.title));
    if (!editorial) return movie;
    return createMovie(movie.title, movie.source, {
      ...movie,
      posterUrl: movie.posterUrl ?? editorial.posterUrl,
      runtimeMinutes: movie.runtimeMinutes ?? editorial.runtimeMinutes,
      genres: movie.genres.length ? movie.genres : editorial.genres,
      moods: movie.moods.length ? movie.moods : editorial.moods,
      overview: movie.overview ?? editorial.overview
    });
  });
  return themeData;
}
function migrateOldTheme(inputTheme, fallbackMovies, fallbackHistory, theme) {
  const movies = typeof inputTheme?.movies === 'string' ? inputTheme.movies : Array.isArray(inputTheme?.playlist) ? inputTheme.playlist : fallbackMovies;
  const history = inputTheme?.history ?? fallbackHistory;
  return addExactEditorialMetadata(theme, makeThemeState(movies, history, inputTheme ?? {}));
}
function initialState() {
  const existing = parseStored(STORAGE_KEY, null);
  if (existing && existing.version === 5 && existing.themes?.halloween && existing.themes?.christmas) {
    return {
      version: 5,
      activeTheme: existing.activeTheme === 'christmas' ? 'christmas' : 'halloween',
      language: existing.language === 'en' ? 'en' : 'pt-PT',
      soundEnabled: existing.soundEnabled !== false,
      musicEnabled: existing.musicPreferenceSet ? existing.musicEnabled !== false : true,
      musicPreferenceSet: existing.musicPreferenceSet === true,
      themes: {
        halloween: makeThemeState(existing.themes.halloween.playlist, existing.themes.halloween.history, existing.themes.halloween),
        christmas: makeThemeState(existing.themes.christmas.playlist, existing.themes.christmas.history, existing.themes.christmas)
      }
    };
  }
  const previous = parseStored(PREVIOUS_STORAGE_KEY, null);
  if (previous && previous.version === 4 && previous.themes?.halloween && previous.themes?.christmas) {
    return {
      version: 5,
      activeTheme: previous.activeTheme === 'christmas' ? 'christmas' : 'halloween',
      language: previous.language === 'en' ? 'en' : 'pt-PT',
      soundEnabled: typeof previous.soundEnabled === 'boolean' ? previous.soundEnabled : parseStored('halloween-sound-v1', true) === true,
      themes: {
        halloween: migrateOldTheme(previous.themes.halloween, DEFAULT_MOVIES.join('\n'), LEGACY_HISTORY, 'halloween'),
        christmas: migrateOldTheme(previous.themes.christmas, CHRISTMAS_MOVIES.join('\n'), {}, 'christmas')
      }
    };
  }
  const previousV3 = parseStored(PREVIOUS_V3_STORAGE_KEY, null);
  if (previousV3 && previousV3.version === 3 && previousV3.themes?.halloween && previousV3.themes?.christmas) {
    return {
      version: 5,
      activeTheme: previousV3.activeTheme === 'christmas' ? 'christmas' : 'halloween',
      language: previousV3.language === 'en' ? 'en' : 'pt-PT',
      soundEnabled: typeof previousV3.soundEnabled === 'boolean' ? previousV3.soundEnabled : parseStored('halloween-sound-v1', true) === true,
      themes: {
        halloween: migrateOldTheme(previousV3.themes.halloween, DEFAULT_MOVIES.join('\n'), LEGACY_HISTORY, 'halloween'),
        christmas: migrateOldTheme(previousV3.themes.christmas, CHRISTMAS_MOVIES.join('\n'), {}, 'christmas')
      }
    };
  }
  const previousV2 = parseStored(LEGACY_STORAGE_KEY, null);
  if (previousV2 && previousV2.version === 2 && previousV2.themes?.halloween && previousV2.themes?.christmas) {
    return {
      version: 5,
      activeTheme: previousV2.activeTheme === 'christmas' ? 'christmas' : 'halloween',
      language: previousV2.language === 'en' ? 'en' : 'pt-PT',
      soundEnabled: typeof previousV2.soundEnabled === 'boolean' ? previousV2.soundEnabled : parseStored('halloween-sound-v1', true) === true,
      themes: {
        halloween: migrateOldTheme(previousV2.themes.halloween, DEFAULT_MOVIES.join('\n'), LEGACY_HISTORY, 'halloween'),
        christmas: migrateOldTheme(previousV2.themes.christmas, CHRISTMAS_MOVIES.join('\n'), {}, 'christmas')
      }
    };
  }
  // Import the original v1 values once, keeping the source keys as recovery copies.
  const savedMovies = parseStored('halloween-movies-v1', DEFAULT_MOVIES.join('\n'));
  const savedHistory = parseStored('halloween-history-v1', LEGACY_HISTORY);
  return {
    version: 5,
    activeTheme: parseStored('cinema-theme-v1', 'halloween') === 'christmas' ? 'christmas' : 'halloween',
    language: parseStored('cinema-language-v1', 'pt-PT') === 'en' ? 'en' : 'pt-PT',
    soundEnabled: parseStored('halloween-sound-v1', true) === true,
    themes: {
      halloween: addExactEditorialMetadata('halloween', makeThemeState(typeof savedMovies === 'string' ? savedMovies : DEFAULT_MOVIES.join('\n'), savedHistory)),
      christmas: addExactEditorialMetadata('christmas', makeThemeState(CHRISTMAS_MOVIES.join('\n'), {}))
    }
  };
}

function persistState() {
  state.version = 5;
  state.activeTheme = activeTheme;
  state.language = language;
  state.soundEnabled = soundEnabled;
  state.musicEnabled = musicEnabled;
  state.musicPreferenceSet = state.musicPreferenceSet === true;
  themeData.drawMode = drawModeSelect.value;
  themeData.drawPace = drawPaceSelect.value;
  themeData.history = history;
  themeData.viewed = viewed;
  themeData.avoidViewed = avoidViewed;
  storageDirty = !save(STORAGE_KEY, state);
  renderStorageWarning();
  return !storageDirty;
}
