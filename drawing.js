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
    const seam = halloween && items.length > 1 && items.length % 2 === 1 && index === items.length - 1;
    const bright = index % 2 === 0 && !seam;
    const gradient = ctx.createRadialGradient(0, 0, 75, 0, 0, 495);
    if (halloween) {
      gradient.addColorStop(0, seam ? '#211128' : bright ? '#87300b' : '#080a09');
      gradient.addColorStop(0.48, seam ? '#48284f' : bright ? '#dd6514' : '#151b18');
      gradient.addColorStop(1, seam ? '#694171' : bright ? '#f59b3c' : '#26312a');
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
function renderPosterShuffle(movies, index, settled) {
  const strip = document.querySelector('#poster-strip');
  strip.classList.toggle('is-settled', settled);
  strip.setAttribute('aria-hidden', String(spinning));
  strip.replaceChildren();
  if (!movies.length) { document.querySelector('#poster-current').textContent = translate('noFilterMatches'); return; }
  const offsets = settled || movies.length === 1 ? [0] : [-1, 0, 1];
  for (const offset of offsets) {
    const movie = movies[(index + offset + movies.length) % movies.length];
    const tile = document.createElement('div'); tile.className = `poster-slide${offset === 0 ? ' is-current' : ''}`;
    tile.dataset.movieId = movie.id;
    const artwork = document.createElement('button'); artwork.type = 'button'; artwork.className = 'movie-poster'; artwork.disabled = spinning; artwork.setAttribute('aria-label', movie.title); artwork.setAttribute('aria-haspopup', 'dialog');
    const fallback = document.createElement('div'); fallback.className = 'poster-fallback';
    const moon = document.createElement('span'); moon.textContent = '☾';
    const title = document.createElement('strong'); title.textContent = movie.title;
    fallback.append(moon, title); artwork.append(fallback);
    const url = safePosterUrl(movie.posterUrl);
    if (url) {
      const image = document.createElement('img'); image.src = url; image.alt = ''; image.decoding = 'async';
      image.addEventListener('load', () => { fallback.hidden = true; });
      image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; });
      artwork.append(image);
    }
    const caption = movieDetailsButton(movie); caption.disabled = spinning;
    if (!spinning) artwork.addEventListener('click', () => openMovieDetails(movie));
    tile.append(artwork, caption); strip.append(tile);
  }
  document.querySelector('#poster-current').textContent = settled ? translate('resultLabel') : translate('modePosters');
}
function renderDoors(movies) {
  const container = document.querySelector('#doors'); container.replaceChildren();
  movies.forEach((movie, index) => {
    const door = document.createElement('button'); door.type = 'button'; door.className = `mystery-door door-style-${index + 1}`;
    door.setAttribute('aria-label', `${translate('doorLabel', index + 1)}. ${translate('doorOpen')}`);
    const number = document.createElement('span'); number.className = 'door-number'; number.textContent = String(index + 1);
    const knob = document.createElement('span'); knob.className = 'door-knob'; knob.setAttribute('aria-hidden', 'true');
    door.append(number, knob);
    door.addEventListener('click', () => spin(doorCandidates, 1, 'single', 1, movie.id));
    container.append(door);
  });
}
function spin(selectedPool = eligibleRecords(), count = 1, kind = 'single', requestedCount = count, forcedMovieId = null) {
  const movies = selectedPool;
  if (spinning || !Array.isArray(movies) || !movies.length || !Number.isInteger(count) || count < 1 || count > movies.length || playlistRecords().length > 60) return;
  if (movies.some(movie => !movie || typeof movie.title !== 'string' || typeof movie.id !== 'string')) return;
  if (activeTheme === 'halloween' && drawModeSelect.value === 'doors' && kind === 'single' && !forcedMovieId) {
    stopDoorSounds(); activeDoorSound = null; doorSoundOffset = randomIndex(3);
    witchSound = randomIndex(2) ? alternateWitchSound : doorSounds[1];
    const shuffled = [...movies];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = randomIndex(i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    doorCandidates = shuffled.slice(0, Math.min(3, shuffled.length));
    renderDoors(doorCandidates); spinButton.disabled = true;
    return;
  }
  spinning = true; spinButton.disabled = true; input.disabled = true; resetButton.disabled = true; setAdvancedControlsDisabled(true);
  document.querySelector('#collection-shortcut').disabled = true;
  document.querySelector('#edit-toggle').disabled = true; document.querySelector('#finish-edit').disabled = true;
  document.querySelector('#clear-history').disabled = true; document.querySelector('#history-toggle').disabled = true; themeSelect.disabled = true; languageSelect.disabled = true; watchButton.disabled = true;
  drawModeSelect.disabled = true; drawPaceSelect.disabled = true;
  document.querySelectorAll('.mystery-door').forEach(door => { door.disabled = true; door.classList.toggle('is-chosen', door.getAttribute('aria-label') === `${translate('doorLabel', movies.findIndex(movie => movie.id === forcedMovieId) + 1)}. ${translate('doorOpen')}`); });
  winningIndex = -1;
  const mode = kind === 'single' && activeTheme === 'halloween' ? drawModeSelect.value : 'wheel';
  stopDoorSounds(); activeDoorSound = null;
  endSound.pause(); endSound.currentTime = 0;
  rollSound.pause(); rollSound.currentTime = 0;
  if (mode === 'doors') {
    const soundIndex = (movies.findIndex(movie => movie.id === forcedMovieId) + doorSoundOffset) % 3;
    activeDoorSound = soundIndex === 1 ? witchSound : doorSounds[soundIndex];
    doorSoundStartedAt = performance.now();
    if (soundEnabled) activeDoorSound.play().catch(() => {});
  } else if (soundEnabled) { rollSound.currentTime = 0; rollSound.play().catch(() => {}); }
  spinButton.innerHTML = spinIcon + `<span>${translate('spinning')}</span>`;
  document.querySelector('#result-label').textContent = translate('spinningLabel');
  document.querySelector('#result-title').textContent = translate('spinningTitle');
  document.querySelector('#result-description').textContent = translate('spinningDescription');
  document.querySelector('#result').classList.remove('winner', 'reveal');
  const winner = forcedMovieId ? movies.findIndex(movie => movie.id === forcedMovieId) : randomIndex(movies.length);
  const sessionMovies = [movies[winner]];
  const remaining = movies.filter((_, index) => index !== winner);
  while (sessionMovies.length < count) sessionMovies.push(remaining.splice(randomIndex(remaining.length), 1)[0]);
  const full = Math.PI * 2;
  const desired = (full - (winner + 0.5) * full / movies.length) % full;
  const start = rotation;
  const delta = 6 * full + ((desired - (start % full) + full) % full);
  if (mode === 'wheel') document.querySelector('.wheel-stage').hidden = false;
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : drawPaceSelect.value === 'suspense' ? 4000 : 1500;
  const ticker = document.querySelector('#shuffle-ticker');
  const shuffleSteps = Math.max(10, Math.min(45, movies.length * 3));
  const shuffledTitles = Array.from({ length: shuffleSteps }, (_, index) => movies[index % movies.length].title).concat(movies[winner].title);
  const posterSequence = mode === 'posters' ? Array.from({ length: shuffleSteps }, () => movies[randomIndex(movies.length)]).concat(movies[winner]) : [];
  let posterStep = -1;
  if (mode === 'shuffle') {
    ticker.classList.remove('is-settled');
    ticker.replaceChildren(...Array.from({length: 3}, () => document.createElement('span')));
  }
  return new Promise(resolve => {
    const started = performance.now();
    function frame(now) {
      try {
      const progress = duration === 0 ? 1 : Math.min(1, (now - started) / duration);
      if (mode === 'wheel') { rotation = start + delta * (1 - Math.pow(1 - progress, 5)); drawWheel(movies); }
      else if (mode === 'doors') document.querySelector('#doors-stage').classList.toggle('is-rattling', progress < .72 && Math.floor(progress * 25) % 2 === 0);
      else if (mode === 'shuffle') {
        const eased = 1 - Math.pow(1 - progress, 3);
        const offset = eased * shuffleSteps;
        const index = Math.min(shuffleSteps, Math.floor(offset));
        Array.from(ticker.children).forEach((row, position) => { row.textContent = shuffledTitles[Math.max(0, Math.min(shuffleSteps, index + position - 1))]; });
        document.querySelector('#shuffle-current').textContent = shuffledTitles[index];
        ticker.style.transform = `translateY(-${144 + (offset - index) * 96}px)`;
      }
      else if (mode === 'posters') {
        const index = Math.min(shuffleSteps, Math.floor((1 - Math.pow(1 - progress, 3)) * shuffleSteps));
        if (index !== posterStep) { renderPosterShuffle(posterSequence, index, false); posterStep = index; }
      }
      if (progress < 1) { requestAnimationFrame(frame); return; }
      rotation %= full; spinning = false; input.disabled = false; resetButton.disabled = false;
      document.querySelector('#collection-shortcut').disabled = false;
      document.querySelector('#edit-toggle').disabled = false; document.querySelector('#finish-edit').disabled = false;
      document.querySelector('#clear-history').disabled = false; document.querySelector('#history-toggle').disabled = false; themeSelect.disabled = false; languageSelect.disabled = false; watchButton.disabled = false; drawModeSelect.disabled = true; drawPaceSelect.disabled = false;
      setAdvancedControlsDisabled(false);
      rollSound.pause(); rollSound.currentTime = 0;
      winningIndex = winner; if (mode === 'wheel') drawWheel(movies);
      if (mode === 'doors') {
        const opened = document.querySelectorAll('.mystery-door')[winner];
        if (opened) {
          opened.classList.add('is-open'); opened.setAttribute('aria-label', `${translate('doorLabel', winner + 1)}: ${movies[winner].title}`);
          const reveal = document.createElement('span'); reveal.className = 'door-reveal'; reveal.textContent = movies[winner].title; opened.append(reveal);
        }
      }
      if (mode === 'shuffle') {
        const finalTitle = document.createElement('span'); finalTitle.textContent = movies[winner].title;
        ticker.replaceChildren(finalTitle); ticker.classList.add('is-settled'); ticker.style.transform = 'translateY(-50%)';
        document.querySelector('#shuffle-current').textContent = translate('resultLabel');
      }
      if (mode === 'posters') renderPosterShuffle([movies[winner]], 0, true);
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
      spinButton.innerHTML = spinIcon + `<span>${translate(drawActionKey())}</span>`; spinButton.disabled = false;
      const result = document.querySelector('#result'); result.classList.add('winner', 'reveal');
      document.querySelector('#result-label').textContent = translate('resultLabel');
      document.querySelector('#result-title').textContent = selectedMovie.title;
      document.querySelector('#result-title').disabled = false;
      document.querySelector('#result-description').textContent = translate('resultDescription');
      document.querySelector('#hint').textContent = translate('resultHint');
      setTimeout(() => { if (!spinning) drawModeSelect.disabled = false; }, 400);
      updateSurprisePreview();
      updateMarathonAvailability();
      if (soundEnabled && mode !== 'doors') { endSound.currentTime = 0; endSound.play().catch(() => {}); }
      resolve({ movie: selectedMovie.title, id: selectedMovie.id });
      } catch (error) {
        rollSound.pause(); rollSound.currentTime = 0; endSound.pause(); endSound.currentTime = 0;
        stopDoorSounds(); activeDoorSound = null;
        spinning = false; winningIndex = -1;
        document.querySelector('#collection-shortcut').disabled = false;
      input.disabled = false; resetButton.disabled = false; themeSelect.disabled = false; languageSelect.disabled = false; watchButton.disabled = false; drawModeSelect.disabled = false; drawPaceSelect.disabled = false;
        for (const id of ['edit-toggle', 'finish-edit', 'clear-history', 'history-toggle']) document.querySelector(`#${id}`).disabled = false;
        setAdvancedControlsDisabled(false);
        spinButton.disabled = eligibleRecords().length === 0;
        spinButton.innerHTML = spinIcon + `<span>${translate('spin')}</span>`;
        document.querySelector('#result-title').textContent = translate('drawError');
        document.querySelector('#result-title').disabled = true;
        document.querySelector('#result-label').textContent = translate('resultIdleLabel');
        document.querySelector('#result-description').textContent = '';
        console.error('Movie draw failed', error);
        resolve({ error: true });
      }
    }
    requestAnimationFrame(frame);
  });
}
