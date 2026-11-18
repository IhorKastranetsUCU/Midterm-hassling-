/* The course picker owns one import at a time, including while its view is detached. */
window.createMoodlePicker = function ({courseListUrl, onProgress, onImported, onLeave}) {
  const element = document.createElement('section');
  element.className = 'moodle-picker';
  const {escape: esc, icon} = UI;
  const selected = new Set();
  let query = '', courses = [], added = new Set(), batch = null, request = 0;

  function searchKey(value) {
    return value.toLocaleLowerCase('uk').replace(/[’ʼ‘`]/g, "'").trim();
  }

  function refreshChoices() {
    const term = searchKey(query);
    let matches = 0, available = 0, checked = 0;
    for (const row of element.querySelectorAll('[data-moodle-row]')) {
      row.hidden = !row.dataset.search.includes(term);
      if (row.hidden) continue;
      matches++;
      const input = row.querySelector('input');
      if (input.disabled) continue;
      available++;
      if (input.checked) checked++;
    }
    const all = element.querySelector('[data-select-visible]');
    all.disabled = !available;
    all.checked = available > 0 && checked === available;
    all.indeterminate = checked > 0 && checked < available;
    element.querySelector('[data-moodle-empty]').hidden = matches > 0;
    element.querySelector('[data-result-count]').textContent = UI.countLabel(matches, 'курс', 'курси', 'курсів');
    const action = element.querySelector('[data-import-moodle]');
    action.disabled = !selected.size;
    action.textContent = selected.size ? 'Додати курси (' + selected.size + ')' : 'Додати курси';
  }

  function option(course) {
    const {id, fullname, shortname} = course;
    const code = shortname && searchKey(shortname) !== searchKey(fullname) ? '<small>' + esc(shortname) + '</small>' : '';
    return `<label class="picker-option" data-moodle-row data-search="${esc(searchKey(fullname + ' ' + shortname))}">
      <input type="checkbox" data-moodle-choice value="${esc(id)}" ${added.has(id) ? 'checked disabled' : selected.has(id) ? 'checked' : ''}>
      <span><strong>${esc(fullname)}</strong>${code}</span>${added.has(id) ? '<small class="picker-added">Додано</small>' : ''}
    </label>`;
  }

  const reconnect = '<a href="/hustle/connect.html">Перепідключити Moodle</a>';
  async function load() {
    if (batch) { drawBatch(); return; }
    const ticket = ++request;
    element.innerHTML = '<p class="picker-message" role="status">Завантажуємо курси…</p>';
    try {
      const [list, existing] = await Promise.all([UI.api('/api/courses'), UI.api(courseListUrl)]);
      if (ticket !== request) return;
      courses = list.map(c => ({id: Number(c.id), fullname: UI.courseName(c.fullname), shortname: UI.courseName(c.shortname)}));
      added = new Set(existing.map(c => Number(c.course_id)));
      const selectable = new Set(courses.filter(c => !added.has(c.id)).map(c => c.id));
      for (const id of selected) if (!selectable.has(id)) selected.delete(id);
      element.innerHTML = `<div class="picker-controls">
        <label class="search-field">${icon('search')}<input type="search" data-moodle-search aria-label="Пошук курсів Moodle" placeholder="Знайти курс у Moodle" value="${esc(query)}"></label>
        <div class="picker-list-heading"><label><input type="checkbox" data-select-visible> Обрати всі видимі</label><span data-result-count role="status"></span></div>
      </div><div class="picker-options" role="group" aria-label="Курси Moodle">${courses.map(option).join('')}
        <p class="picker-message" data-moodle-empty hidden>${courses.length ? 'За цим запитом курсів немає.' : 'У підключеному Moodle курсів немає.'}</p></div>
      <footer class="picker-footer">${reconnect}<button class="primary" data-import-moodle disabled>Додати курси</button></footer>`;
      refreshChoices();
    } catch (err) {
      if (ticket !== request) return;
      element.innerHTML = `<p class="picker-message" role="alert">${esc(err.message)}</p>
        <footer class="picker-footer">${reconnect}<button class="secondary" data-picker-retry>Спробувати знову</button></footer>`;
    }
  }

  function drawBatch() {
    const {chosen, done, failures, running} = batch;
    element.innerHTML = `<div class="picker-batch-heading" role="status" tabindex="-1">Додано ${done.size} із ${chosen.length}</div>
      <div class="picker-options" aria-label="Стан імпорту">${chosen.map(c =>
        `<div class="picker-batch-row"><strong>${esc(c.fullname)}</strong><span class="${failures.has(c.id) ? 'field-error' : ''}">${esc(batch.statuses.get(c.id) || 'Очікує')}</span></div>`).join('')}</div>
      <footer class="picker-footer">${running ? '<button class="secondary" data-import-background>Продовжити у фоні</button>' :
        (failures.size ? '<button class="secondary" data-import-moodle>Повторити невдалі</button>' : '') +
        '<button class="primary" data-import-done>До моїх предметів →</button>'}</footer>`;
  }

  function updateProgress() {
    // Update text in place to retain keyboard focus and list scroll while imports run.
    element.querySelector('.picker-batch-heading').textContent = 'Додано ' + batch.done.size + ' із ' + batch.chosen.length;
    element.querySelectorAll('.picker-batch-row span').forEach((label, i) => {
      const id = batch.chosen[i].id;
      label.textContent = batch.statuses.get(id) || 'Очікує';
      label.classList.toggle('field-error', batch.failures.has(id));
    });
    onProgress(batch);
  }

  async function importMoodle() {
    if (batch?.running || !selected.size) return;
    if (!batch) batch = {chosen: courses.filter(c => selected.has(c.id)), done: new Set(), failures: new Map(), statuses: new Map()};
    batch.running = true;
    drawBatch();
    element.querySelector('.picker-batch-heading').focus({preventScroll: true});
    for (const course of batch.chosen) {
      if (batch.done.has(course.id)) continue;
      batch.statuses.set(course.id, 'Отримуємо матеріали…');
      batch.failures.delete(course.id);
      updateProgress();
      try {
        await UI.post('/api/workspace/courses/' + course.id + '/sync-moodle', {course_title: course.fullname, shortname: course.shortname});
        batch.done.add(course.id);
        batch.statuses.set(course.id, 'Додано');
      } catch (err) {
        batch.failures.set(course.id, err.message);
        batch.statuses.set(course.id, err.message);
      }
      updateProgress();
    }
    batch.running = false;
    const focused = element.contains(document.activeElement);
    drawBatch();
    if (focused) element.querySelector('[data-import-moodle], [data-import-done]').focus({preventScroll: true});
    onProgress(batch);
    if (batch.done.size) onImported();
    if (!element.isConnected && !batch.failures.size) resetBatch();
  }

  function resetBatch() {
    batch = null;
    selected.clear();
    query = '';
    onProgress(null);
  }
  element.addEventListener('input', e => {
    if (!e.target.matches('[data-moodle-search]')) return;
    query = e.target.value;
    refreshChoices();
  });
  element.addEventListener('change', e => {
    const all = e.target.matches('[data-select-visible]');
    if (!all && !e.target.matches('[data-moodle-choice]')) return;
    const inputs = all ? element.querySelectorAll('[data-moodle-row]:not([hidden]) input:enabled') : [e.target];
    for (const input of inputs) {
      input.checked = e.target.checked;
      if (input.checked) selected.add(Number(input.value));
      else selected.delete(Number(input.value));
    }
    refreshChoices();
  });
  element.addEventListener('click', e => {
    if (e.target.closest('[data-picker-retry]')) load();
    if (e.target.closest('[data-import-moodle]')) importMoodle();
    if (e.target.closest('[data-import-background]')) onLeave();
    if (e.target.closest('[data-import-done]')) {
      resetBatch();
      onLeave();
    }
  });
  return {element, load};
};
