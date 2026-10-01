function windowHasTmdbConfig() {
  try {
    if (typeof window !== 'object') return false;
    const base = new URL(window.CINEMA_CATALOG_PROXY_URL);
    const logo = new URL(window.CINEMA_TMDB_LOGO_URL, location.href);
    return base.protocol === 'https:' && !base.username && !base.password && logo.protocol === 'https:';
  } catch { return false; }
}
function tmdbConfig() {
  if (!windowHasTmdbConfig()) return null;
  return { base: new URL(window.CINEMA_CATALOG_PROXY_URL), logo: new URL(window.CINEMA_TMDB_LOGO_URL, location.href) };
}
const movieDetailCache = new Map();
const pendingAddControllers = new Set();
let retryAfterUntil = 0;
const ONLINE_TIMEOUT_MS = 8000;
function onlineErrorMessage(error) { return translate(error?.status === 429 ? 'rateLimited' : 'serviceUnavailable'); }
function cancelOnlineContext() {
  catalogRequestController?.abort(); movieDetailRequest?.abort(); relatedController?.abort();
  for (const controller of pendingAddControllers) controller.abort();
  pendingAddControllers.clear();
  relatedCache.loading = false; remoteSearchResults = null; catalogStatusOverride = '';
  if (document.querySelector('#movie-dialog').open) document.querySelector('#movie-dialog').close();
  if (document.querySelector('#title-edit-dialog').open) document.querySelector('#title-edit-dialog').close();
}
async function getMovieDetails(id, signal) {
  const key = `${language}:${id}`;
  if (movieDetailCache.has(key)) return movieDetailCache.get(key);
  const details = await tmdbRequest(`movie/${id}`, { language: language === 'pt-PT' ? 'pt-PT' : 'en-US', append_to_response: 'external_ids,credits' }, signal);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  movieDetailCache.set(key, details);
  return details;
}
async function tmdbRequest(path, params = {}, signal) {
  const config = tmdbConfig();
  if (!config) throw new Error('TMDB proxy is not configured');
  const basePath = `${config.base.href.replace(/\/+$/, '')}/`;
  const url = new URL(String(path).replace(/^\/+/, ''), basePath);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  if (Date.now() < retryAfterUntil) throw Object.assign(new Error('Request limit'), { status: 429 });
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { abort(); reject(new Error('Catalogue timeout')); }, ONLINE_TIMEOUT_MS); });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetch(url, { method: 'GET', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) {
        if (response.status === 429) {
          const value = response.headers?.get('Retry-After');
          const seconds = value && /^\d+(\.\d+)?$/.test(value) ? Number(value) : null;
          retryAfterUntil = Math.max(Date.now(), seconds !== null ? Date.now() + seconds * 1000 : Date.parse(value) || Date.now() + 60000);
        }
        throw Object.assign(new Error(`TMDB proxy returned ${response.status}`), { status: response.status });
      }
      return await response.json();
    })()]);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
function imageUrlFromPath(path) { return typeof path === 'string' && path.startsWith('/') ? `https://image.tmdb.org/t/p/w342${path}` : null; }
function normalizeTmdbMovie(searchMovie, details) {
  const source = details ?? searchMovie;
  const originalTitle = source.original_title || searchMovie.original_title || source.title || searchMovie.title || '';
  if (!originalTitle) return null;
  const translatedTitle = (source.title || searchMovie.title || '').trim();
  const rawYear = String(source.release_date || searchMovie.release_date || '').slice(0, 4);
  const year = /^\d{4}$/.test(rawYear) ? Number(rawYear) : null;
  const title = year && !/\(\d{4}\)\s*$/.test(originalTitle) ? `${originalTitle} (${year})` : originalTitle;
  const externalId = source.external_ids?.imdb_id;
  return createMovie(title, 'tmdb', {
    id: `tmdb:${source.id ?? searchMovie.id}`, tmdbId: Number(source.id ?? searchMovie.id),
    year, runtimeMinutes: Number.isSafeInteger(source.runtime) && source.runtime > 0 ? source.runtime : null,
    genres: Array.isArray(source.genres) ? source.genres.map(genre => genre.name).filter(Boolean) : (source.genre_ids ?? []).map(id => ({27:'Horror',14:'Fantasy',10751:'Family',16:'Animation',35:'Comedy',53:'Thriller',9648:'Mystery'}[id])).filter(Boolean),
    overview: { [language]: source.overview || searchMovie.overview || '' },
    translatedTitle: translatedTitle && normalizeTitle(translatedTitle) !== normalizeTitle(originalTitle) ? translatedTitle : null,
    posterUrl: imageUrlFromPath(source.poster_path || searchMovie.poster_path),
    tmdbRating: Number.isFinite(source.vote_average) ? source.vote_average : Number.isFinite(searchMovie.vote_average) ? searchMovie.vote_average : null,
    imdbId: typeof externalId === 'string' && /^tt\d{7,}$/.test(externalId) ? externalId : null
  });
}

async function searchOnline(query) {
  catalogRequestController?.abort();
  if (!tmdbConfig() || !query.trim()) { remoteSearchResults = null; catalogStatusOverride = ''; renderCatalog(); return; }
  catalogRequestController = new AbortController();
  const { signal } = catalogRequestController;
  const titleQuery = query.replace(/\b(18\d{2}|19\d{2}|20\d{2})\b/g, '').trim() || query;
  const releaseYear = query.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/)?.[1];
  remoteSearchResults = [];
  catalogStatusOverride = translate('searchWorking'); renderCatalog();
  try {
    const response = await tmdbRequest('search/movie', { query: titleQuery, language: language === 'pt-PT' ? 'pt-PT' : 'en-US', include_adult: false, primary_release_year: releaseYear, page: 1 }, signal);
    const raw = Array.isArray(response.results) ? response.results.slice(0, 10) : [];
    if (signal.aborted) return;
    remoteSearchResults = raw.map(movie => normalizeTmdbMovie(movie, null)).filter(Boolean);
    catalogStatusOverride = translate('tmdbSearchResults', remoteSearchResults.length);
    const logo = document.querySelector('#tmdb-logo'); logo.src = tmdbConfig().logo.href; logo.hidden = false;
  } catch (error) {
    if (signal.aborted) return;
    remoteSearchResults = null;
    catalogStatusOverride = onlineErrorMessage(error);
  }
  renderCatalog();
}
async function addCatalogMovie(movie) {
  if (movieIsAdded(movie) || playlistRecords().length >= 60 || spinning) return;
  const contextTheme = activeTheme, contextLanguage = language;
  let detailError = null;
  const controller = new AbortController(); pendingAddControllers.add(controller);
  if (movie.source === 'tmdb' && movie.tmdbId && tmdbConfig()) {
    try { movie = normalizeTmdbMovie({ id: movie.tmdbId, original_title: displayTitle(movie), release_date: movie.year ? `${movie.year}-01-01` : '' }, await getMovieDetails(movie.tmdbId, controller.signal)); }
    catch (error) { detailError = error; }
  }
  pendingAddControllers.delete(controller);
  if (controller.signal.aborted || contextTheme !== activeTheme || contextLanguage !== language || spinning || movieIsAdded(movie) || playlistRecords().length >= 60) return;
  const added = createMovie(movie.title, movie.source, movie);
  themeData.playlist = [...playlistRecords(), added];
  updateList();
  catalogStatusOverride = language === 'pt-PT' ? `${displayTitle(movie)} foi adicionado à roleta.` : `${displayTitle(movie)} was added to the wheel.`;
  if (detailError) catalogStatusOverride += ' ' + onlineErrorMessage(detailError);
  renderCatalog(); renderRelatedRecommendations();
}
