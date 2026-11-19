/* Connected data and specialist tools for the paper workspace. */
(() => {
  const H = window.Hustle, {account, escape: esc, icon} = H;
  const core = window.HustleStudy;
  document.querySelector('.sidebar .wordmark').href = '#plan';
  let lastTool = '';
  let courses, assignments = [], request, deadlineError = '';
  const appearanceKey = 'hustle.course-appearance:' + account.owner;
  const colorNames = {butter: 'Жовтий', lilac: 'Лавандовий', blush: 'Персиковий', sage: 'Шавлієвий', sky: 'Блакитний'};
  const defaultColors = ['butter', 'lilac', 'blush'];
  let preferences = {};
  try {
    const stored = JSON.parse(localStorage.getItem(appearanceKey));
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) preferences = stored;
  } catch {}

  function applyAppearance(course) {
    const preference = preferences[course.id];
    const name = typeof preference?.alias === 'string' && preference.alias.trim() || course.originalName;
    const color = Object.hasOwn(colorNames, preference?.color) ? preference.color : course.defaultColor;
    return {...course, name, short: name, color, initials: [...name][0] || 'К'};
  }

  function mapCourses(rows) {
    return rows.map(c => applyAppearance({
      id: String(c.course_id), originalName: UI.courseName(c.title),
      defaultColor: defaultColors[Math.abs(Number(c.course_id)) % defaultColors.length] || 'lilac',
      connected: true, topic: UI.countLabel(c.topic_count, 'тема', 'теми', 'тем'), materials: [],
      source: c.source_type,
    }));
  }

  function courseAppearanceSettings() {
    const heading = '<h2>Оформлення предметів</h2>';
    if (!courses.length) return '<section class="dash-panel course-appearance">' + heading +
      '<p>Тут зʼявляться підключені предмети.</p>' + add + '</section>';

    return '<form class="dash-panel course-appearance" data-course-appearance>' + heading + courses.map(course => {
      const {id, originalName, name, color, defaultColor} = course;
      const preferredColor = preferences[id]?.color;
      const options = Object.entries(colorNames).map(([value, label]) =>
        `<option value="${value}"${preferredColor === value ? ' selected' : ''}>${label}</option>`).join('');
      return `<div class="course-appearance-row" data-course-appearance-row="${esc(id)}" data-default-color="${defaultColor}">
        <div class="course-appearance-original"><small>Назва в Moodle</small><strong id="course-original-${esc(id)}">${esc(originalName)}</strong></div>
        <span class="course-appearance-arrow" aria-hidden="true">→</span>
        <label class="course-appearance-field">Назва в Hustle
          <input name="alias" autocomplete="off" aria-describedby="course-original-${esc(id)}" value="${esc(name)}">
        </label>
        <label class="course-appearance-field">Колір
          <span class="course-appearance-color">
            <i class="course-dot subject-${color}" data-course-color-swatch aria-hidden="true"></i>
            <select name="color" aria-describedby="course-original-${esc(id)}">
              <option value="">Стандартний</option>${options}
            </select>
          </span>
        </label>
      </div>`;
    }).join('') + '<div class="course-appearance-actions"><button type="submit" class="primary">Зберегти зміни</button><span role="status"></span></div></form>';
  }

  courses = mapCourses(account.courses);
  function updateCourses(rows) {
    const next = mapCourses(rows);
    if (JSON.stringify(next) === JSON.stringify(courses)) return;
    courses = next;
    H.refreshCourseNav?.();
    loadDeadlines();
  }
  async function loadDeadlines() {
    if (!account.paired || !courses.length) return;
    const ticket = {};
    request = ticket;
    try {
      const items = await HustleToday.fetchAssignments(courses.map(c => ({course_id:c.id})));
      if (ticket !== request) return;
      assignments = items;
      deadlineError = '';
    } catch (err) { if (ticket !== request) return; deadlineError = err.message; }
    if (!document.querySelector('dialog[open]')) H.dashboardRefresh?.();
  }
  function tasks(course, completed) {
    return assignments.filter(a => String(a.course_id) === course.id && Number(a.duedate) > 0)
      .map(a => {
        const due = Number(a.duedate) * 1000, day = core.dateKey(due);
        const status = HustleStudentHome.classify(a);
        const id = course.id + ':assignment:' + Number(a.id);
        const moodle = UI.safeLink(account.moodle);
        const href = moodle && Number(a.cmid) > 0 ? new URL('/mod/assign/view.php?id=' + Number(a.cmid), moodle).href : '#course/' + course.id + '/submissions';
        return {id, course, calendarKey:`${course.id}/${Number(a.id)}`, title:UI.courseName(a.name), label:'Завдання Moodle', due, dueDay:day, scheduled:day,
          href, done:status === 'done' || !!completed[id], submitted:status === 'done', status};
      }).filter(t => t.status !== 'check' || t.done);
  }
  const notice = () => deadlineError ? '<p class="field-error" role="alert">Не вдалося завантажити дедлайни Moodle. <button class="text-button" data-deadline-retry>Повторити</button></p>' : '';
  document.addEventListener('click', e => { if (e.target.closest('[data-deadline-retry]')) loadDeadlines(); });
  const courseListUrl = '/api/workspace/courses?moodle_only=true';
  const importLink = document.createElement('a');
  importLink.className = 'picker-progress-link';
  importLink.href = '#connect';
  importLink.hidden = true;
  document.querySelector('.topbar-account').before(importLink);
  const isPickerRoute = hash => hash === 'connect' || hash === 'import';
  let importJob = null;
  function updateImportLink() {
    importLink.hidden = isPickerRoute(location.hash.slice(1)) || !importJob || (!importJob.running && !importJob.failures.size);
    if (importJob) importLink.textContent = importJob.running
      ? `Додаємо · ${importJob.done.size}/${importJob.chosen.length}`
      : `Не додано: ${importJob.failures.size} ↻`;
  }
  const picker = createMoodlePicker({
    courseListUrl,
    onLeave() { location.hash = 'courses'; },
    onProgress(job) {
      importJob = job;
      updateImportLink();
      if (job && !job.running && !isPickerRoute(location.hash.slice(1))) {
        UI.toast(`Додано ${job.done.size} із ${job.chosen.length} курсів`);
      }
    },
    async onImported() {
      try {
        updateCourses(await UI.api(courseListUrl));
        if (['', '#plan', '#courses'].includes(location.hash)) H.dashboardRefresh?.();
      }
      catch (err) { UI.toast(err.message); }
    },
  });
  function tools(hash) {
    const course = /^course\/(\d+)\/([^/?]+)/.exec(hash);
    const isTool = (course && course[2] !== 'overview') || ['settings','deadlines','connect','import'].includes(hash);
    const previousTool = lastTool;
    lastTool = isTool ? hash : '';
    if (previousTool && !isPickerRoute(previousTool) && previousTool !== hash && !isTool) {
      UI.api('/api/workspace/courses?moodle_only=true').then(rows => {
        updateCourses(rows); H.dashboardRefresh?.();
      }).catch(err => UI.toast(err.message));
    }
    if (course && course[2] === 'overview') return false;
    if (!course && !['settings','deadlines','connect','import'].includes(hash)) return false;
    const currentCourse = course && courses.find(c => c.id === course[1]);
    const title = course ? currentCourse?.name || 'Предмет'
      : ({settings:'Налаштування',deadlines:'Дедлайни',connect:'Додати з Moodle',import:'Додати з Moodle'})[hash];
    const main = document.querySelector('#workspace-main');
    document.title = title + ' — Hustle';
    if (!currentCourse) document.querySelector('#view-name').textContent = isPickerRoute(hash) ? 'Мої предмети' : title;
    const navHash = isPickerRoute(hash) ? 'courses' : hash;
    const activeHash = course ? 'course/' + course[1] : navHash;
    document.querySelectorAll('[data-nav],.sidebar-course').forEach(a => {
      if (a.hash === '#' + activeHash) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    if (isPickerRoute(hash)) {
      if (!account.paired) { location.assign('/hustle/connect.html'); return true; }
      if (main.contains(picker.element)) return true;
      main.innerHTML = '<div class="picker-page"><a class="back-to-courses" href="#courses">← Мої предмети</a>' +
        '<header class="page-heading dashboard-heading"><h1 tabindex="-1">Додати з Moodle</h1></header></div>';
      main.firstElementChild.append(picker.element);
      picker.load();
      return true;
    }
    const previousFrame = main.querySelector('iframe');
    if (previousFrame?.dataset.route === hash) return true;
    const restoreStudyFocus = previousFrame?.dataset.focusRoute === hash;
    const nestedRoute = hash.replace(/^(course\/\d+)\/submissions$/, '$1/assignments');
    const src = '/hustle/tools.html#' + nestedRoute;
    const goal = hash === 'settings' ? '<label class="paper-goal">Ціль навчання на день <select data-paper-goal>' + [25,45,60].map(n => '<option value="' + n + '"' + (n === H.state.minutes ? ' selected' : '') + '>' + n + ' хв</option>').join('') + '</select></label>' : '';
    const header = currentCourse ? courseHeader(currentCourse, UI.route().section, true) : '<h1 class="paper-hidden-heading" tabindex="-1">' + esc(title) + '</h1>';
    const frame = '<iframe class="paper-course-tools" title="' + esc(title) + '" data-route="' + esc(hash) + '"' +
      (restoreStudyFocus ? ' data-focus-study-tab' : '') +
      (currentCourse ? ' data-shared-course-header' : '') + ' src="' + esc(src) + '" allow="microphone"></iframe>';
    if (hash === 'settings') window.HustleDashboard.renderSettings('general', goal + frame);
    else main.innerHTML = header + frame;
    return true;
  }
  const courseSections = {overview: 'Огляд', topics: 'Теми', practice: 'Практика', assignments: 'Дедлайни', manage: 'Параметри'};
  const courseSubsections = {
    reading: ['topics', 'Тема'], topic: ['topics', 'Тема'], materials: ['topics', 'Матеріали'],
    cards: ['practice', 'Картки'], quizzes: ['practice', 'Самоперевірка'], exam: ['practice', 'До іспиту'],
    submissions: ['assignments', 'Здачі'], grades: ['assignments', 'Оцінки'],
  };
  let renderedTrail = '';
  function renderCourseTrail(course, section, topicTrail = []) {
    const courseRoute = '#course/' + course.id;
    const subsection = courseSubsections[section];
    const parent = subsection?.[0] || section;
    const items = [{label: 'Мої предмети', href: '#courses'}, {label: course.name, href: courseRoute}];
    if (parent !== 'overview' && courseSections[parent]) {
      items.push({label: courseSections[parent], href: courseRoute + '/' + parent});
    }
    if (topicTrail.length) items.push(...topicTrail);
    else if (subsection) items.push({label: subsection[1]});

    const slot = document.querySelector('#view-name');
    const signature = JSON.stringify(items);
    if (renderedTrail === signature && slot.querySelector('.course-parent')) return;
    renderedTrail = signature;
    slot.innerHTML = `<nav class="course-parent" aria-label="Шлях сторінки"><ol>${items.map(({label, href}, index) =>
      `<li>${index === items.length - 1
        ? `<h1 tabindex="-1" aria-current="page">${esc(label)}</h1>`
        : `<a class="course-parent-link" href="${esc(href)}">${esc(label)}</a>`}</li>`).join('')}</ol></nav>`;
  }

  function setCourseTrail(route, crumbs) {
    if (location.hash !== route) return false;
    const match = /^#course\/(\d+)\/(reading|topic)(?:[/?]|$)/.exec(route);
    const course = match && courses.find(item => item.id === match[1]);
    if (!course || !crumbs.length) return false;
    renderCourseTrail(course, match[2], crumbs);
    return true;
  }

  function courseHeader(course, section = 'overview', embedded = false) {
    const key = section.split('/')[0];
    const active = courseSubsections[key]?.[0] || key;
    renderCourseTrail(course, key);
    const route = (id, sectionKey) => '#course/' + id + (sectionKey === 'overview' ? '' : '/' + sectionKey);
    queueMicrotask(() => {
      const navigation = document.querySelector('.paper-course-actions');
      const selected = navigation?.querySelector('[aria-current="page"]');
      if (!selected) return;
      const frame = navigation.getBoundingClientRect();
      const tab = selected.getBoundingClientRect();
      if (tab.right > frame.right) navigation.scrollLeft += tab.right - frame.right + 4;
    });
    return `<div class="paper-course-header paper-course-context">
      <nav class="paper-course-actions" aria-label="Розділи предмета">
        ${Object.entries(courseSections).map(([key, label]) => `<a class="paper-course-tab" href="${esc(route(course.id, key))}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
      </nav>
      <div class="paper-course-header-actions">
        ${key === 'overview' ? '' : H.paperOral?.button(course) || ''}
        ${embedded ? '<button type="button" class="secondary paper-add-materials" data-paper-add-materials aria-haspopup="dialog" disabled>Додати матеріали +</button>' : ''}
      </div>
    </div>`;
  }
  document.addEventListener('change', e => {
    if (e.target.matches('[data-paper-goal]')) H.update({minutes:Number(e.target.value)});
    const row = e.target.closest('[data-course-appearance-row]');
    if (row && e.target.name === 'color') {
      row.querySelector('[data-course-color-swatch]').className =
        'course-dot subject-' + (e.target.value || row.dataset.defaultColor);
    }
  });
  document.addEventListener('input', e => {
    const form = e.target.closest('[data-course-appearance]');
    if (form) form.querySelector('[role="status"]').textContent = '';
  });
  document.addEventListener('submit', e => {
    const form = e.target;
    if (!form.matches('[data-course-appearance]')) return;
    e.preventDefault();
    const next = {...preferences};
    const rows = [...form.querySelectorAll('[data-course-appearance-row]')];
    for (const row of rows) {
      const id = row.dataset.courseAppearanceRow;
      const course = courses.find(item => item.id === id);
      if (!course) continue;
      const alias = row.querySelector('[name="alias"]').value.trim();
      const color = row.querySelector('[name="color"]').value;
      next[id] = {
        alias: alias === course.originalName ? '' : alias,
        color: Object.hasOwn(colorNames, color) ? color : '',
      };
    }
    const status = form.querySelector('[role="status"]');
    try {
      localStorage.setItem(appearanceKey, JSON.stringify(next));
    } catch {
      status.textContent = 'Не вдалося зберегти зміни в цьому браузері.';
      return;
    }
    preferences = next;
    courses = courses.map(applyAppearance);
    for (const row of rows) {
      const course = courses.find(item => item.id === row.dataset.courseAppearanceRow);
      if (course) row.querySelector('[name="alias"]').value = course.name;
    }
    H.refreshCourseNav?.();
    status.textContent = 'Зміни збережено.';
  });
  const add = '<a class="secondary" href="#connect">Додати з Moodle +</a>';
  H.workspace = { get deadlineError() {return deadlineError;}, get courses() {return courses;}, tasks, notice, tools, courseHeader, updateCourses, courseAppearanceSettings, setCourseTrail, add };
  if (location.hash === '#dashboard') history.replaceState(null,'','#plan');
  window.addEventListener('hashchange', () => {
    updateImportLink();
    if (location.hash === '#dashboard') { history.replaceState(null,'','#plan'); }
  });
  let checkingAccount = false;
  let verifiedAt = 0;
  async function resumeWorkspace() {
    if (document.hidden || checkingAccount || Date.now() - verifiedAt < 1000) return;
    checkingAccount = true;
    try {
      const current = await UI.api('/api/auth/status');
      if (current.owner_id !== account.owner || current.moodle_paired !== account.paired) {
        location.reload();
        return;
      }
      if (Date.now() - verifiedAt > 60000) {
        const previous = courses;
        updateCourses(await UI.api('/api/workspace/courses?moodle_only=true'));
        if (courses === previous) loadDeadlines();
        else H.dashboardRefresh?.();
      }
      verifiedAt = Date.now();
    } catch (err) { UI.toast(err.message); }
    finally { checkingAccount = false; }
  }
  window.addEventListener('focus', resumeWorkspace);
  window.addEventListener('pageshow', event => { if (event.persisted) resumeWorkspace(); });
  document.addEventListener('visibilitychange', resumeWorkspace);
  document.addEventListener('DOMContentLoaded', () => { verifiedAt = Date.now(); loadDeadlines(); });
})();
