/* Connected data and specialist tools for the paper workspace. */
(() => {
  const H = window.Hustle, {account, escape: esc, icon} = H;
  const core = window.HustleStudy;
  document.querySelector('.sidebar .wordmark').href = '#plan';
  let lastTool = '';
  let courses, assignments = [], request, deadlineError = '';
  function mapCourses(rows) {
    return rows.map(c => {
      const name = UI.courseName(c.title);
      return {
        id: String(c.course_id), name, short: name,
        color: ['butter', 'lilac', 'blush'][Math.abs(Number(c.course_id)) % 3],
        initials: [...name][0] || 'К', connected: true,
        topic: UI.countLabel(c.topic_count, 'тема', 'теми', 'тем'), materials: [],
        source: c.source_type,
      };
    });
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
        return {id, course, title:a.name, label:'Завдання Moodle', due, dueDay:day, scheduled:day,
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
    const course = /^course\/(\d+)\/([^?]+)/.exec(hash);
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
    const title = course ? courses.find(c => c.id === course[1])?.name || 'Предмет'
      : ({settings:'Налаштування',deadlines:'Дедлайни',connect:'Додати з Moodle',import:'Додати з Moodle'})[hash];
    const main = document.querySelector('#workspace-main');
    document.title = title + ' — Hustle';
    document.querySelector('#view-name').textContent = isPickerRoute(hash) ? 'Мої предмети' : title;
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
    if (main.querySelector('iframe')?.dataset.route === hash) return true;
    const nestedRoute = hash.replace(/^(course\/\d+)\/submissions$/, '$1/assignments');
    const src = '/hustle/tools.html#' + nestedRoute;
    const goal = hash === 'settings' ? '<label class="paper-goal">Ціль навчання на день <select data-paper-goal>' + [25,45,60].map(n => '<option value="' + n + '"' + (n === H.state.minutes ? ' selected' : '') + '>' + n + ' хв</option>').join('') + '</select></label>' : '';
    main.innerHTML = '<h1 class="paper-hidden-heading" tabindex="-1">' + esc(title) + '</h1>' + goal + '<iframe class="paper-course-tools" title="' + esc(title) + '" data-route="' + esc(hash) + '" src="' + esc(src) + '" allow="microphone"></iframe>';
    return true;
  }
  function courseActions(c) {
    return '<nav class="paper-course-actions" aria-label="Навчання за предметом">' +
      [['topics','Теми'],['practice','Практика'],['assignments','Дедлайни'],['manage','Параметри']].map(([section,title]) =>
        '<a class="secondary" href="#course/' + c.id + '/' + section + '">' + title + '</a>').join('') + '</nav>';
  }
  document.addEventListener('change', e => {
    if (e.target.matches('[data-paper-goal]')) H.update({minutes:Number(e.target.value)});
  });
  const add = '<a class="secondary" href="#connect">Додати з Moodle +</a>';
  H.workspace = { get deadlineError() {return deadlineError;}, get courses() {return courses;}, tasks, notice, tools, courseActions, updateCourses, add };
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
