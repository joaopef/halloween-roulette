// Collection transactions: typing never mutates the committed playlist.
function saveEditor() {
  if (spinning) return;
  const titles = input.value.split('\n').map(line => line.trim()).filter(Boolean);
  const count = new Set(titles.map(normalizeTitle)).size;
  editorError = titles.some(title => title.length > 300 || /[\u0000-\u0008\u000b-\u001f]/.test(title)) ? 'invalidTitle' : count > 60 ? 'maximum' : !count ? 'atLeastTwo' : '';
  document.querySelector('#editor-error').textContent = editorError ? translate(editorError) : '';
  if (editorError) return false;
  themeData.playlist = reconcilePlaylist(input.value);
  editorDrafts.delete(activeTheme);
  setEditorOpen(false); updateList(); document.querySelector('#edit-toggle').focus();
  return true;
}

let titleEditId = null;
let titleEditOpener = null;
function editMovieTitle(id) {
  if (spinning) return;
  const movie = playlistRecords().find(movie => movie.id === id);
  if (!movie) return;
  titleEditId = id; titleEditOpener = document.activeElement;
  document.querySelector('#title-edit-heading').textContent = translate('editTitle');
  document.querySelector('#title-edit-input').value = movie.title;
  document.querySelector('#title-edit-save').textContent = translate('finishEdit');
  document.querySelector('#title-edit-cancel').textContent = translate('cancelEdit');
  document.querySelector('#title-edit-error').textContent = '';
  document.querySelector('#title-edit-dialog').showModal();
}
function renameMovie(id, title) {
  const movie = playlistRecords().find(movie => movie.id === id);
  title = title.trim();
  if (!movie || !title || title.length > 300 || /[\r\n\u0000-\u001f]/.test(title) || playlistRecords().some(other => other.id !== id && normalizeTitle(other.title) === normalizeTitle(title))) return false;
  // Keep historical snapshots and their associations; only the current title changes.
  movie.title = title;
  updateList(); renderHistory(); return true;
}
function removeMovie(id) {
  if (spinning) return;
  const index = playlistRecords().findIndex(movie => movie.id === id);
  if (index < 0) return;
  removedMovie = { theme: activeTheme, movie: playlistRecords()[index], index };
  themeData.playlist.splice(index, 1);
  document.querySelector('#undo-remove').hidden = false;
  updateList();
  document.querySelector('#undo-remove').focus();
}
function undoRemoval() {
  if (!removedMovie || spinning) return;
  const { theme, movie, index } = removedMovie;
  const destination = state.themes[theme].playlist;
  if (destination.length >= 60 || destination.some(other => other.id === movie.id || normalizeTitle(other.title) === normalizeTitle(movie.title))) {
    document.querySelector('#list-status').textContent = translate(destination.length >= 60 ? 'maximum' : 'invalidTitle'); return;
  }
  destination.splice(Math.min(index, destination.length), 0, movie);
  removedMovie = null; document.querySelector('#undo-remove').hidden = true;
  updateList();
}
