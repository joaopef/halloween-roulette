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
const spinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5"/></svg>';
const STORAGE_KEY = 'cinema-roulette-v5';
const PREVIOUS_STORAGE_KEY = 'cinema-roulette-v4';
const PREVIOUS_V3_STORAGE_KEY = 'cinema-roulette-v3';
const LEGACY_STORAGE_KEY = 'cinema-roulette-v2';
const HISTORY_LIMIT = 5;
let rotation = 0;
let spinning = false;
let winningIndex = -1;
let showAllHistory = false;
let lastResultMovieId = null;
let selectedCollection = 'all';
let remoteSearchResults = null;
let catalogRequestController = null;
let catalogStatusOverride = '';
let metadataStatusKey = '';
let currentSession = null;
let lastResultType = 'single';
let marathonStatusKey = '';
let marathonStatusArgs = [];

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
    filterTitle: 'Filtros da roleta', filterHelp: 'Os filtros aplicam-se apenas aos filmes da tua lista. Se escolheres mais do que uma disposição, basta corresponder a uma.', moodLegend: 'Disposição', moodLight: 'Leve, com ambiente familiar', moodScary: 'Assustador', moodNostalgic: 'Nostálgico',
    durationLabel: 'Duração máxima', durationAny: 'Qualquer duração', duration90: 'Até 90 min', duration120: 'Até 120 min', duration150: 'Até 150 min', duration180: 'Até 180 min',
    filterStatusUnknown: count => `${count} ${count === 1 ? 'filme' : 'filmes'} sem duração conhecida ficam excluídos pelo limite de tempo. Podes preencher a duração em Metadados dos filmes.`, filterStatusNoMood: count => `${count} ${count === 1 ? 'filme' : 'filmes'} sem disposição ficam excluídos pela seleção atual.`, noFilterMatches: 'Nenhum filme corresponde aos filtros. Limpa ou ajusta os filtros.', clearFilters: 'Limpar filtros',
    surpriseTitle: 'Sessão surpresa', surpriseHelp: 'Sorteia apenas entre os filmes da tua lista que correspondem à disposição e ao tempo escolhidos. Não adiciona nem remove filmes.', surpriseMoodLabel: 'Disposição', surpriseDurationLabel: 'Tempo disponível', surpriseAnyMood: 'Qualquer disposição', surpriseRun: 'Sortear sessão surpresa', surpriseMatches: count => `${count} ${count === 1 ? 'filme corresponde' : 'filmes correspondem'} a estes critérios.`, surpriseNoMatch: 'Não há filmes na tua lista que correspondam a estes critérios. Ajusta os filtros ou descobre filmes.', surpriseDiscover: 'Descobrir filmes',
    marathonTitle: 'Maratona de filmes', marathonHelp: 'Escolhe uma sessão de um, dois ou três filmes. O sorteio respeita os filtros e os filmes já vistos que excluíste; não repete filmes na mesma sessão.', marathonCountLabel: 'Filmes nesta sessão', marathonRun: 'Sortear maratona', marathonPoolCount: count => `${count} ${count === 1 ? 'filme elegível' : 'filmes elegíveis'} com os filtros atuais.`, marathonNoMatch: 'Não há filmes elegíveis. Ajusta os filtros ou descobre filmes.', marathonTooFew: (requested, available) => `Pediste ${requested} filmes, mas só há ${available} elegíveis. Sortear os ${available} disponíveis?`, marathonRecordedLimited: (actual, requested) => `Sessão registada com ${actual} filmes elegíveis, em vez dos ${requested} pedidos.`, marathonCancelled: 'Sessão cancelada. Podes ajustar os filtros ou o número de filmes.', marathonRecorded: count => `Sessão registada com ${count} ${count === 1 ? 'filme' : 'filmes'}.`, marathonOrderTitle: 'Ordem de visualização', sessionHistoryTitle: 'Sessões recentes', sessionHistoryEmpty: 'Ainda não há sessões sorteadas neste tema.', sessionSummary: (date, titles) => `${date} · ${titles}`, sessionMovieViewed: title => `Marcar ${title} como visto`, sessionMovieUnviewed: title => `Desmarcar ${title} como visto`, runtimeTotal: total => `Duração total: ${total} min.`, runtimeTotalIncomplete: total => `Duração conhecida: ${total} min; total incompleto porque há filmes sem duração.`, runtimeAllUnknown: 'Duração total incompleta: faltam durações conhecidas.',
    metadataTitle: 'Metadados dos filmes', metadataHelp: 'Completa a duração e a disposição de filmes da tua lista. “Leve, com ambiente familiar” descreve o tom editorial e não garante adequação etária.', metadataMovieLabel: 'Filme', metadataRuntimeLabel: 'Duração em minutos', metadataMoodLegend: 'Disposições', saveMetadata: 'Guardar metadados', metadataSaved: 'Metadados guardados.', metadataInvalid: 'Indica uma duração entre 1 e 600 minutos ou deixa o campo vazio.', metadataNoMovies: 'Não há filmes na lista para editar.',
    discoverTitle: 'Descobrir filmes', discoverIntro: 'Sugestões temáticas curadas. Não são recomendações personalizadas por IA.', searchLabel: 'Pesquisar filmes por título', searchPlaceholder: 'Título do filme', searchButton: 'Pesquisar',
    collectionLabel: 'Coleções temáticas', collectionAll: 'Todas as sugestões', collectionHalloweenFamily: 'Halloween em família', collectionHorror: 'Terror a sério', collectionChristmasClassics: 'Clássicos de Natal', collectionChristmasFamily: 'Natal em família',
    localCatalogStatus: 'Catálogo local curado. A pesquisa online TMDB não está ativa.', noCatalogResults: 'Não foram encontradas sugestões nesta coleção.', searchWorking: 'A pesquisar no catálogo TMDB…', tmdbSearchResults: count => `${count} resultados de pesquisa TMDB.`, tmdbNoResults: 'A pesquisa TMDB não encontrou filmes.', tmdbSearchError: 'Não foi possível contactar o catálogo TMDB. A mostrar as sugestões locais.',
    addMovie: title => `Adicionar ${title} à roleta`, alreadyAdded: 'Já adicionado', addToWheel: 'Adicionar à roleta', alreadyOnWheel: 'Já está na roleta', curatedLabel: 'Sugestão curada', tmdbLabel: 'Dados TMDB', posterUnavailable: 'Cartaz indisponível', posterAlt: title => `Cartaz de ${title}`,
    durationValue: minutes => `${minutes} min`, durationUnknown: 'Duração desconhecida', tmdbRating: rating => `TMDB ${rating.toFixed(1)}`, imdbLink: 'IMDb', noGenres: 'Géneros indisponíveis',
    relatedTitle: 'Sugestões relacionadas do TMDB', relatedNoIds: 'A tua playlist ainda não tem IDs TMDB para pedir recomendações relacionadas.', relatedOffline: 'As recomendações relacionadas ficam disponíveis quando o serviço TMDB estiver configurado.', relatedLoading: 'A carregar sugestões relacionadas…', relatedEmpty: 'O TMDB não devolveu sugestões relacionadas.', relatedError: 'Não foi possível carregar sugestões relacionadas.',
    tmdbNotice: 'Este produto utiliza a API TMDB, mas não é aprovado nem certificado pelo TMDB.', tmdbLogoAlt: 'The Movie Database (TMDB)',
    historyEyebrow: 'AS SESSÕES PASSADAS', wallTitle: 'Mural da Fama', clearHistory: 'Limpar histórico', historyNote: 'Os sorteios ficam guardados apenas neste navegador.',
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
    filterTitle: 'Roulette filters', filterHelp: 'Filters apply only to movies in your list. If you choose more than one mood, a movie can match any of them.', moodLegend: 'Mood', moodLight: 'Light, family-oriented tone', moodScary: 'Scary', moodNostalgic: 'Nostalgic',
    durationLabel: 'Maximum runtime', durationAny: 'Any runtime', duration90: 'Up to 90 min', duration120: 'Up to 120 min', duration150: 'Up to 150 min', duration180: 'Up to 180 min',
    filterStatusUnknown: count => `${count} ${count === 1 ? 'movie has' : 'movies have'} no known runtime and are excluded by the time limit. Add a runtime under Movie metadata.`, filterStatusNoMood: count => `${count} ${count === 1 ? 'movie has' : 'movies have'} no mood label and is excluded by the current selection.`, noFilterMatches: 'No movies match these filters. Clear or adjust the filters.', clearFilters: 'Clear filters',
    surpriseTitle: 'Surprise session', surpriseHelp: 'Draw only from movies in your list that match the selected mood and time. This does not add or remove movies.', surpriseMoodLabel: 'Mood', surpriseDurationLabel: 'Time available', surpriseAnyMood: 'Any mood', surpriseRun: 'Draw a surprise session', surpriseMatches: count => `${count} ${count === 1 ? 'movie matches' : 'movies match'} these criteria.`, surpriseNoMatch: 'No movies in your list match these criteria. Adjust the filters or discover movies.', surpriseDiscover: 'Discover movies',
    marathonTitle: 'Movie marathon', marathonHelp: 'Choose a one-, two-, or three-film session. The draw respects filters and any watched movies you have excluded; it never repeats a movie within one session.', marathonCountLabel: 'Movies in this session', marathonRun: 'Draw a marathon', marathonPoolCount: count => `${count} ${count === 1 ? 'eligible movie' : 'eligible movies'} with the current filters.`, marathonNoMatch: 'There are no eligible movies. Adjust the filters or discover movies.', marathonTooFew: (requested, available) => `You requested ${requested} movies, but only ${available} are eligible. Draw the ${available} available movies?`, marathonRecordedLimited: (actual, requested) => `Session recorded with ${actual} eligible movies instead of the requested ${requested}.`, marathonCancelled: 'Session cancelled. You can adjust the filters or movie count.', marathonRecorded: count => `Session recorded with ${count} ${count === 1 ? 'movie' : 'movies'}.`, marathonOrderTitle: 'Viewing order', sessionHistoryTitle: 'Recent sessions', sessionHistoryEmpty: 'No sessions have been drawn for this theme yet.', sessionSummary: (date, titles) => `${date} · ${titles}`, sessionMovieViewed: title => `Mark ${title} as watched`, sessionMovieUnviewed: title => `Undo watched status for ${title}`, runtimeTotal: total => `Total runtime: ${total} min.`, runtimeTotalIncomplete: total => `Known runtime: ${total} min; total is incomplete because some runtimes are unknown.`, runtimeAllUnknown: 'Total runtime is incomplete because runtimes are unknown.',
    metadataTitle: 'Movie metadata', metadataHelp: 'Fill in runtime and mood for movies on your list. “Light, family-oriented” describes editorial tone and does not guarantee age suitability.', metadataMovieLabel: 'Movie', metadataRuntimeLabel: 'Runtime in minutes', metadataMoodLegend: 'Moods', saveMetadata: 'Save metadata', metadataSaved: 'Metadata saved.', metadataInvalid: 'Enter a runtime from 1 to 600 minutes or leave it blank.', metadataNoMovies: 'There are no movies on the list to edit.',
    discoverTitle: 'Discover movies', discoverIntro: 'Curated theme suggestions. These are not AI-personalized recommendations.', searchLabel: 'Search movies by title', searchPlaceholder: 'Movie title', searchButton: 'Search',
    collectionLabel: 'Themed collections', collectionAll: 'All suggestions', collectionHalloweenFamily: 'Halloween for families', collectionHorror: 'Proper scares', collectionChristmasClassics: 'Christmas classics', collectionChristmasFamily: 'Christmas for families',
    localCatalogStatus: 'Curated local catalogue. TMDB online search is not active.', noCatalogResults: 'No suggestions were found in this collection.', searchWorking: 'Searching the TMDB catalogue…', tmdbSearchResults: count => `${count} TMDB search results.`, tmdbNoResults: 'TMDB search found no movies.', tmdbSearchError: 'Could not reach the TMDB catalogue. Showing local suggestions.',
    addMovie: title => `Add ${title} to the wheel`, alreadyAdded: 'Already added', addToWheel: 'Add to the wheel', alreadyOnWheel: 'Already on the wheel', curatedLabel: 'Curated suggestion', tmdbLabel: 'TMDB data', posterUnavailable: 'Poster unavailable', posterAlt: title => `Poster for ${title}`,
    durationValue: minutes => `${minutes} min`, durationUnknown: 'Duration unknown', tmdbRating: rating => `TMDB ${rating.toFixed(1)}`, imdbLink: 'IMDb', noGenres: 'Genres unavailable',
    relatedTitle: 'Related TMDB suggestions', relatedNoIds: 'Your playlist has no TMDB IDs yet, so related recommendations are unavailable.', relatedOffline: 'Related recommendations will be available when the TMDB service is configured.', relatedLoading: 'Loading related suggestions…', relatedEmpty: 'TMDB returned no related suggestions.', relatedError: 'Related suggestions could not be loaded.',
    tmdbNotice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.', tmdbLogoAlt: 'The Movie Database (TMDB)',
    historyEyebrow: 'PAST MOVIE NIGHTS', wallTitle: 'Wall of Fame', clearHistory: 'Clear history', historyNote: 'Draws are stored only in this browser.',
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
  return { playlist, history, viewed, avoidViewed: flags.avoidViewed === true, filters: { moods, maxDuration }, sessions };
}
function addExactEditorialMetadata(theme, themeData) {
  const curatedMovies = CURATED_CATALOG[theme] ?? [];
  themeData.playlist = themeData.playlist.map(movie => {
    const editorial = curatedMovies.find(candidate => normalizeTitle(candidate.title) === normalizeTitle(movie.title));
    if (!editorial) return movie;
    return createMovie(movie.title, movie.source, {
      ...movie,
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
const state = initialState();
let activeTheme = state.activeTheme;
let language = state.language;
let soundEnabled = state.soundEnabled;
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
  return parseMovieLines(value).map(parsed => {
    const existingMovie = byTitle.get(normalizeTitle(parsed.title)) ?? byId.get(parsed.id);
    return existingMovie ? createMovie(existingMovie.title, existingMovie.source, existingMovie) : parsed;
  });
}
function persistState() {
  state.version = 5;
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
  const collectionLabels = { all: 'collectionAll', 'halloween-family': 'collectionHalloweenFamily', horror: 'collectionHorror', 'christmas-classics': 'collectionChristmasClassics', 'christmas-family': 'collectionChristmasFamily' };
  document.querySelectorAll('[data-collection]').forEach(button => {
    const collection = button.getAttribute('data-collection');
    if (collectionLabels[collection]) button.textContent = translate(collectionLabels[collection]);
    const isForTheme = collection === 'all' || (activeTheme === 'halloween' ? ['halloween-family', 'horror'].includes(collection) : ['christmas-classics', 'christmas-family'].includes(collection));
    button.hidden = !isForTheme;
    button.classList.toggle('is-selected', collection === selectedCollection);
    button.setAttribute('aria-pressed', String(collection === selectedCollection));
  });
  document.querySelector('#related-title').textContent = translate('relatedTitle');
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
    document.querySelector('#result-description').textContent = translate('resultIdleDescription');
  } else if (spinning) {
    document.querySelector('#result-label').textContent = translate('spinningLabel');
    document.querySelector('#result-title').textContent = translate('spinningTitle');
    document.querySelector('#result-description').textContent = translate('spinningDescription');
  }
  if (!spinning) spinButton.innerHTML = spinIcon + `<span>${winningIndex < 0 ? translate('spin') : translate('spinAgain')}</span>`;
  if (lastResultMovieId) {
    document.querySelector('#result-label').textContent = translate('resultLabel');
    document.querySelector('#result-description').textContent = translate('resultDescription');
    document.querySelector('#hint').textContent = translate('resultHint');
  }
}
function syncTheme() {
  renderLanguage();
  document.body.dataset.theme = activeTheme;
  themeSelect.value = activeTheme;
  document.querySelector('#wheel-theme-label').textContent = activeTheme === 'christmas' ? (language === 'pt-PT' ? 'NATAL' : 'CHRISTMAS') : 'HALLOWEEN';
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
  document.querySelector('#movie-summary-count').textContent = total;
  document.querySelector('#eligible-count').textContent = eligible.length;
  document.querySelector('#eligible-label').textContent = translate('eligibleMovies', eligible.length);
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
  document.querySelector('#list-status').textContent = total > 60 ? translate('maximum') : total === 0 ? translate('atLeastTwo') : translate('ready');
  document.querySelector('#hint').textContent = eligible.length ? translate('hint', eligible.length) : exhausted ? translate('exhausted') : total > 0 ? translate('noFilterMatches') : translate('chooseRange');
  if (!eligible.length && !exhausted && total > 0) filterNotes.push(translate('noFilterMatches'));
  document.querySelector('#filter-status').textContent = filterNotes.join(' ');
  if (redraw) drawWheel(eligible);
  updateSurprisePreview();
  updateMarathonAvailability();
  return eligible;
}
function displayTitle(movie) { return String(movie.title ?? '').replace(/\s*\(\d{4}\)\s*$/, ''); }
function matchesCollection(movie) { return selectedCollection === 'all' || (Array.isArray(movie.collections) && movie.collections.includes(selectedCollection)); }
function matchesSearch(movie, query) {
  const cleanQuery = normalizeTitle(query);
  if (!cleanQuery) return true;
  const year = cleanQuery.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/)?.[1];
  const titleQuery = cleanQuery.replace(/\b(18\d{2}|19\d{2}|20\d{2})\b/g, '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const titleMatches = normalizeTitle(movie.title).includes(titleQuery || cleanQuery) || normalizeTitle(movie.translatedTitle ?? '').includes(titleQuery || cleanQuery);
  return year ? movie.year === Number(year) && (!titleQuery || titleMatches) : titleMatches || String(movie.year ?? '').includes(cleanQuery);
}
function localCatalogMatches() {
  return (CURATED_CATALOG[activeTheme] ?? []).filter(movie => matchesCollection(movie) && matchesSearch(movie, catalogSearchInput.value));
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
function movieIsAdded(movie) {
  return playlistRecords().some(existing => (movie.tmdbId && existing.tmdbId === movie.tmdbId) || existing.id === movie.id || normalizeTitle(existing.title) === normalizeTitle(movie.title));
}
function createCatalogCard(movie) {
  const card = document.createElement('article'); card.className = 'movie-card';
  const poster = document.createElement('div'); poster.className = 'movie-poster';
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
  const heading = document.createElement('h3'); heading.textContent = displayTitle(movie);
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
  const status = catalogStatusOverride || translate('localCatalogStatus');
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
async function tmdbRequest(path, params = {}, signal) {
  const config = tmdbConfig();
  if (!config) throw new Error('TMDB proxy is not configured');
  const basePath = `${config.base.href.replace(/\/+$/, '')}/`;
  const url = new URL(String(path).replace(/^\/+/, ''), basePath);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  const response = await fetch(url, { method: 'GET', credentials: 'omit', headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error(`TMDB proxy returned ${response.status}`);
  return response.json();
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
    genres: Array.isArray(source.genres) ? source.genres.map(genre => genre.name).filter(Boolean) : [],
    overview: { [language]: source.overview || searchMovie.overview || '' },
    translatedTitle: translatedTitle && normalizeTitle(translatedTitle) !== normalizeTitle(originalTitle) ? translatedTitle : null,
    posterUrl: imageUrlFromPath(source.poster_path || searchMovie.poster_path),
    tmdbRating: Number.isFinite(source.vote_average) ? source.vote_average : Number.isFinite(searchMovie.vote_average) ? searchMovie.vote_average : null,
    imdbId: typeof externalId === 'string' && /^tt\d{7,}$/.test(externalId) ? externalId : null
  });
}
async function searchOnline(query) {
  if (!tmdbConfig() || !query.trim()) { remoteSearchResults = null; catalogStatusOverride = ''; renderCatalog(); return; }
  catalogRequestController?.abort();
  catalogRequestController = new AbortController();
  const { signal } = catalogRequestController;
  const titleQuery = query.replace(/\b(18\d{2}|19\d{2}|20\d{2})\b/g, '').trim() || query;
  const releaseYear = query.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/)?.[1];
  remoteSearchResults = [];
  catalogStatusOverride = translate('searchWorking'); renderCatalog();
  try {
    const response = await tmdbRequest('search/movie', { query: titleQuery, language: language === 'pt-PT' ? 'pt-PT' : 'en-US', include_adult: false, primary_release_year: releaseYear, page: 1 }, signal);
    const raw = Array.isArray(response.results) ? response.results.slice(0, 10) : [];
    const enriched = await Promise.all(raw.map(async movie => {
      if (!Number.isSafeInteger(movie.id)) return normalizeTmdbMovie(movie, null);
      try {
        const details = await tmdbRequest(`movie/${movie.id}`, { language: language === 'pt-PT' ? 'pt-PT' : 'en-US', append_to_response: 'external_ids' }, signal);
        return normalizeTmdbMovie(movie, details);
      } catch { return normalizeTmdbMovie(movie, null); }
    }));
    remoteSearchResults = enriched.filter(Boolean);
    catalogStatusOverride = translate('tmdbSearchResults', remoteSearchResults.length);
    const logo = document.querySelector('#tmdb-logo'); logo.src = tmdbConfig().logo.href; logo.hidden = false;
  } catch (error) {
    if (error?.name === 'AbortError') return;
    remoteSearchResults = null;
    catalogStatusOverride = translate('tmdbSearchError');
  }
  renderCatalog();
}
function addCatalogMovie(movie) {
  if (movieIsAdded(movie)) return;
  const added = createMovie(movie.title, movie.source, movie);
  themeData.playlist = [...playlistRecords(), added];
  input.value = themeData.playlist.map(item => item.title).join('\n');
  updateList();
  catalogStatusOverride = language === 'pt-PT' ? `${displayTitle(movie)} foi adicionado à roleta.` : `${displayTitle(movie)} was added to the wheel.`;
  renderCatalog();
}
async function loadRelatedRecommendations() {
  const section = document.querySelector('#related-section');
  section.hidden = false; relatedResults.replaceChildren();
  const tmdbIds = [...new Set(playlistRecords().map(movie => movie.tmdbId).filter(Number.isSafeInteger))].slice(0, 3);
  if (!tmdbIds.length) { document.querySelector('#related-status').textContent = translate('relatedNoIds'); return; }
  if (!tmdbConfig()) { document.querySelector('#related-status').textContent = translate('relatedOffline'); return; }
  document.querySelector('#related-status').textContent = translate('relatedLoading');
  try {
    const responses = await Promise.all(tmdbIds.map(id => tmdbRequest(`movie/${id}/recommendations`, { language: language === 'pt-PT' ? 'pt-PT' : 'en-US', page: 1 })));
    const seen = new Set(); const recommendations = [];
    for (const response of responses) for (const item of response.results ?? []) {
      if (!Number.isSafeInteger(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      const candidate = normalizeTmdbMovie(item, null);
      if (candidate && !movieIsAdded(candidate)) recommendations.push(candidate);
    }
    for (const movie of recommendations.slice(0, 8)) relatedResults.append(createCatalogCard(movie));
    document.querySelector('#related-status').textContent = recommendations.length ? '' : translate('relatedEmpty');
    const logo = document.querySelector('#tmdb-logo'); logo.src = tmdbConfig().logo.href; logo.hidden = false;
  } catch {
    document.querySelector('#related-status').textContent = translate('relatedError');
  }
}
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
  input.value = playlistRecords().map(item => item.title).join('\n');
  marathonStatusKey = ''; marathonStatusArgs = [];
  persistState(); renderEligibility();
  metadataStatusKey = 'metadataSaved';
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
}));
document.querySelector('#discover-panel').addEventListener('toggle', event => { if (event.target.open) loadRelatedRecommendations(); });
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
function setAdvancedControlsDisabled(disabled) {
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
function spin(selectedPool = eligibleRecords(), count = 1, kind = 'single', requestedCount = count) {
  const movies = selectedPool;
  if (spinning || movies.length < 1 || count < 1 || count > movies.length || playlistRecords().length > 60) return;
  spinning = true; spinButton.disabled = true; input.disabled = true; resetButton.disabled = true; setAdvancedControlsDisabled(true);
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
  const sessionMovies = [movies[winner]];
  const remaining = movies.filter((_, index) => index !== winner);
  while (sessionMovies.length < count) sessionMovies.push(remaining.splice(randomIndex(remaining.length), 1)[0]);
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
      setAdvancedControlsDisabled(false);
      rollSound.pause(); rollSound.currentTime = 0;
      if (soundEnabled) { endSound.currentTime = 0; endSound.play().catch(() => {}); }
      winningIndex = winner; drawWheel(movies);
      const selectedMovie = movies[winner];
      for (const movie of sessionMovies) {
        const priorCount = history[movie.id]?.count ?? 0;
        history[movie.id] = { id: movie.id, title: movie.title, count: priorCount + 1 };
      }
      lastResultMovieId = selectedMovie.id;
      lastResultType = kind;
      recordSession(sessionMovies, kind);
      if (kind === 'marathon') {
        marathonStatusKey = sessionMovies.length < requestedCount ? 'marathonRecordedLimited' : 'marathonRecorded';
        marathonStatusArgs = sessionMovies.length < requestedCount ? [sessionMovies.length, requestedCount] : [sessionMovies.length];
        document.querySelector('#marathon-status').textContent = translate(marathonStatusKey, ...marathonStatusArgs);
      } else { marathonStatusKey = ''; marathonStatusArgs = []; }
      persistState(); renderHistory(); syncWatchButton();
      renderSessionPanel();
      spinButton.innerHTML = spinIcon + `<span>${translate('spinAgain')}</span>`; spinButton.disabled = false;
      const result = document.querySelector('#result'); result.classList.add('winner', 'reveal');
      document.querySelector('#result-label').textContent = translate('resultLabel');
      document.querySelector('#result-title').textContent = selectedMovie.title;
      document.querySelector('#result-description').textContent = translate('resultDescription');
      document.querySelector('#hint').textContent = translate('resultHint');
      updateSurprisePreview();
      updateMarathonAvailability();
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
  syncTheme(); persistState(); updateList(); renderHistory();
});
syncTheme();
updateList();
renderHistory();
document.fonts?.ready.then(() => drawWheel());
