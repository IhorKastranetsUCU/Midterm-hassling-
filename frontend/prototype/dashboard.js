(() => {
  const H = window.Hustle, C = window.HustleStudy, esc = H.escape, icon = H.icon;
  if (!H.workspace && !H.liveCalendar?.standalone && (!H.state.registered || !H.state.ready || !H.state.courses.length)) return;
  const fire = window.HustleDeadlineVisuals;
  const originalKey = 'hustle-study-dashboard-v1';
  const storageKey = H.account ? originalKey + ':' + H.account.owner : originalKey;
  if (H.account && H.state.registered && H.state.ready) {
    try {
      const legacy = localStorage.getItem(originalKey);
      const owner = localStorage.getItem(originalKey + ':owner');
      if (legacy && (!owner || owner === H.account.owner) && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, legacy);
        localStorage.setItem(originalKey + ':owner', H.account.owner);
      }
    } catch {}
  }
  const main = document.querySelector('#workspace-main');
  const today = () => C.dateKey();
  const timerPhase = t => t.running ? 'running' : t.id || t.remaining < t.duration ? 'paused' : 'ready';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
  const newTimer = (mode = 'focus', course = (H.account ? H.workspace?.courses[0]?.id : H.state.courses[0]) || '') => ({ mode, course, duration: mode === 'focus' ? 1500 : mode === 'short' ? 300 : 900, remaining: mode === 'focus' ? 1500 : mode === 'short' ? 300 : 900, running: false, endsAt: 0, creditedAt: 0, id: '' });
  let state = { anchor: today(), records: [], completed: {}, sessions: [], awards: {}, timer: newTimer(), ...saved };
  if (!Array.isArray(state.records) || !Array.isArray(state.sessions) || !state.timer || !Number.isFinite(state.timer.remaining)) state = { ...state, records: [], sessions: [], timer: newTimer() };
  // Carry earlier prototype completion forward without changing its saved values.
  if (!saved.anchor) Object.entries(H.state.completed).forEach(([key, done]) => { if (done) { const [course,,kind] = key.split(':'); state.completed[`${course}:${kind}`] = true; } });
  H.calendar?.init(state.anchor);
  let reward = null, lastPracticeCourse;
  let selectedDate = today(), month = today().slice(0, 7) + '-01', activePractice = null, lastActivity = Date.now(), toastTimeout;
  let timerMenu, timerToggle, timerPanel, timerQuick;
  const demoCourses = () => H.exampleCourses.filter(c => H.state.registered && H.state.ready && H.state.courses.includes(c.id));
  const selected = () => H.workspace?.courses || demoCourses();
  const courseById = id => selected().find(c => c.id === id);
  if (H.account && state.timer.course && !/^\d+$/.test(state.timer.course)) state.timer.course = '';
  if (!courseById(state.timer.course) && !state.timer.running && state.timer.remaining === state.timer.duration) state.timer = newTimer();
  const definitions = [ { kind: 'cards', title: 'Повторити означення', label: 'Картки', minutes: 5 }, { kind: 'example', title: 'Розібрати приклад', label: 'Практика', minutes: 10 }, { kind: 'quiz', title: 'Перевірити себе', label: 'Мініквіз', minutes: 10 } ];
  const schedules = { algebra: [1, 16], probability: [2, 12], english: [2, 18] };
  function save() { if (H.liveCalendar?.standalone) return; try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { announce('Не вдалося зберегти дані в браузері.'); } }
  function announce(message) { const el = document.querySelector('.toast'); clearTimeout(toastTimeout); el.textContent = message; el.hidden = false; toastTimeout = setTimeout(() => el.hidden = true, 4500); }
  function tasks(courseId) {
    return selected().filter(c => !courseId || c.id === courseId).flatMap(course => {
      if (course.connected) return H.workspace.tasks(course, state.completed);
      const [offset, hour] = schedules[course.id] || [3, 16], dueDay = C.addDays(state.anchor, offset), due = C.deadline(dueDay, hour);
      return definitions.map((task, i) => ({ ...task, id: `${course.id}:${task.kind}`, course, due, dueDay, scheduled: C.addDays(dueDay, i - 2), done: !!state.completed[`${course.id}:${task.kind}`] }));
    });
  }
  const planDone = id => tasks(id).every(task => task.done);
  const allDone = course => planDone(course.id);
  function deadlineTimeOrder(a, b, now) {
    return Number(a.due <= now) - Number(b.due <= now) || a.due - b.due;
  }
  function deadlineOrder(a, b, now) {
    return Number(a.done) - Number(b.done) || deadlineTimeOrder(a, b, now);
  }
  const progress = id => { const list = tasks(id); return { done: list.filter(t => t.done).length, total: list.length, percent: Math.round(list.filter(t => t.done).length / Math.max(1, list.length) * 100) }; };
  const hot = t => ['urgent', 'overdue'].includes(C.urgency(t.due, t.done));
  function flame() { return '<svg class="flame" viewBox="0 0 24 28" aria-hidden="true"><path class="flame-outer" d="M12 1c2 6-1 7 3 11 1-2 1-4 1-5 5 5 7 9 5 14-3 8-16 8-19 0C0 15 5 10 8 7c-1 5 0 6 1 7 3-3 1-7 3-13Z" fill="#db6639"/><path class="flame-inner" d="M12 14c0 4-5 5-4 9 1 5 9 4 9-1 0-2-1-4-2-5 0 3-2 4-3 4 1-3 0-4 0-7Z" fill="#ffd78c"/></svg>'; }
  function dateText(day, options = { day: 'numeric', month: 'long' }) { return new Intl.DateTimeFormat('uk-UA', { ...options, timeZone: C.zone }).format(new Date(day + 'T12:00:00Z')); }
  function dueLabel(due, relative = true) {
    const day = C.dateKey(due), time = new Intl.DateTimeFormat('uk-UA', { timeZone: C.zone, hour: '2-digit', minute: '2-digit' }).format(due);
    return `${relative && day === today() ? 'Сьогодні' : relative && day === C.addDays(today(), 1) ? 'Завтра' : dateText(day, { day: 'numeric', month: 'short' })} · ${time}`;
  }
  function badge(task) {
    const status = C.urgency(task.due, task.done);
    if (task.done) return `<span class="due-badge done">${icon('check')}Виконано</span>`;
    const time = dueLabel(task.due, false);
    const remaining = C.deadlineRemaining(task.due);
    return `<span class="due-badge ${status}">
      <strong class="deadline-countdown" data-deadline-countdown="${task.due}" ${remaining ? '' : 'hidden'}>${remaining}</strong>
      <time datetime="${new Date(task.due).toISOString()}">${time}</time>
    </span>`;
  }
  function avatar(c) { return `<span class="course-avatar ${c.color}">${esc(c.initials)}</span>`; }
  const deadlineKinds = [
    {words: /(?:^|[^\p{L}])(?:есе|essay)(?!\p{L})/iu, title: 'Есе', icon: 'files', tone: 'lilac'},
    {words: /(?:^|[^\p{L}])(?:тест|квіз|quiz|test)(?!\p{L})/iu, title: 'Тест', icon: 'practice', tone: 'sage'},
    {words: /(?:^|[^\p{L}])(?:дебати|debate)(?!\p{L})/iu, title: 'Дебати', icon: 'speech', tone: 'blush'},
    {words: /(?:^|[^\p{L}])(?:зустріч|meeting)(?!\p{L})/iu, title: 'Зустріч', icon: 'speech', tone: 'lilac'},
    {words: /(?:^|[^\p{L}])(?:семінар|seminar)(?!\p{L})/iu, title: 'Семінар', icon: 'speech', tone: 'lilac'},
    {words: /(?:^|[^\p{L}])(?:лабораторн\p{L}*|lab)(?!\p{L})/iu, title: 'Лабораторна', icon: 'lab', tone: 'sage'},
    {words: /(?:^|[^\p{L}])(?:домашн\p{L}*|homework)(?!\p{L})/iu, title: 'Домашнє завдання', icon: 'plan', tone: 'neutral'},
  ];
  function deadlineIdentity(task, showCourse, showIcon = true) {
    const kind = deadlineKinds.find(item => item.words.test(task.title)) || {title:'Завдання', icon:'plan', tone:'neutral'};
    const details = [kind.title, showCourse && task.course.name].filter(Boolean).map(esc).join(' · ');
    return `${showIcon ? `<span class="deadline-kind" data-kind-tone="${kind.tone}" aria-hidden="true">${icon(kind.icon)}</span>` : ''}
      <span class="queue-title"><strong>${esc(task.title)}</strong><small>${details}</small></span>`;
  }
  function deadlineRow(task, showCourse) {
    const completed = task.submitted ? 'Виконано в Moodle' : task.done ? 'Зняти позначку виконання' : 'Позначити виконаним';
    const date = task.done
      ? `<time class="due-badge deadline-completed-date" datetime="${new Date(task.due).toISOString()}">${dueLabel(task.due, false)}</time>`
      : badge(task);
    return `<article class="deadline-line deadline-surface${task.done ? ' is-done' : ''}" data-course-tone="${esc(task.course.color)}">
      <button type="button" class="task-check deadline-complete" data-dash-complete="${esc(task.id)}" aria-pressed="${task.done}" aria-label="${task.submitted ? 'Виконано в Moodle' : 'Виконання'}: ${esc(task.title)}" title="${completed}"${task.submitted ? ' disabled' : ''}>${task.done ? icon('check') : ''}</button>
      <a class="deadline-task-link" href="${esc(task.href)}"${task.href.startsWith('#') ? '' : ' target="_blank" rel="noopener noreferrer"'}>
        ${deadlineIdentity(task, showCourse, false)}${date}${icon('arrow')}</a>
      ${H.liveCalendar?.deadlineButton(task) || ''}${fire.edge(task.due, task.done)}</article>`;
  }
  function deadlineList(list, showCourse, pendingLimit = Infinity) {
    const pending = list.filter(task => !task.done);
    const completed = list.filter(task => task.done);
    const extra = pending.slice(pendingLimit, pendingLimit + 2);
    const preview = main.querySelector('.deadline-more');
    const showMore = preview?.dataset.scope === location.hash && preview.open;
    const existing = main.querySelector('.deadline-completed');
    const isOpen = existing?.dataset.scope === location.hash && existing.open;
    return `${pending.slice(0, pendingLimit).map(task => deadlineRow(task, showCourse)).join('') ||
      `<p class="agenda-empty">${completed.length ? 'Немає невиконаних дедлайнів' : 'Найближчих дедлайнів немає.'}</p>`}
      ${extra.length ? `<details class="deadline-more" data-scope="${esc(location.hash)}"${showMore ? ' open' : ''}>
        <summary><span class="deadline-more-show">Показати ще ${extra.length}</span><span class="deadline-more-hide">Згорнути</span></summary>
        ${extra.map(task => deadlineRow(task, showCourse)).join('')}
      </details>` : ''}
      ${completed.length ? `<details class="deadline-completed" data-scope="${esc(location.hash)}"${isOpen ? ' open' : ''}>
        <summary>Виконані <span>${completed.length}</span></summary>
        ${completed.map(task => deadlineRow(task, showCourse)).join('')}
      </details>` : ''}`;
  }
  function start(task, label = 'Почати заняття', klass = 'primary') {
    if (task.href) return `<a class="${klass}" href="${esc(task.href)}" ${task.href.startsWith('#') ? '' : 'target="_blank" rel="noopener noreferrer"'}>${label}${icon('arrow')}</a>`;
    return `<button class="${klass}" data-start="${task.kind}" data-course="${task.course.id}" data-focus-id="dash-${task.id}">${label}${icon('arrow')}</button>`; }
  function heading(title, action = '', showDate = true) { return `<div class="page-heading dashboard-heading"><div><h1 tabindex="-1">${esc(title)}</h1>${showDate ? `<p>${dateText(today(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>` : ''}</div>${action}</div>`; }
  function taskRow(t, showFire = true) { return `<article class="dash-task deadline-surface ${t.done ? 'is-done' : ''} ${hot(t) ? 'is-urgent' : ''}"><button class="task-check" data-dash-complete="${t.id}" aria-pressed="${t.done}" aria-label="${t.done ? 'Позначити невиконаним' : 'Позначити виконаним'}: ${esc(t.title)}, ${esc(t.course.short)}">${t.done ? icon('check') : ''}</button><div class="dash-task-copy"><h3>${t.title}</h3><p><a href="#course/${t.course.id}">${esc(t.course.short)}</a><span>· ${esc(t.course.deadline)}</span><span>· ${t.minutes} хв</span></p></div>${badge(t)}${start(t, t.done ? 'Повторити' : 'Відкрити', 'task-open')}${showFire ? fire.edge(t.due, t.done) : ''}</article>`; }
  function practiceRow(task, showCourse) {
    const meta = [showCourse && task.course.short, task.label, task.minutes && task.minutes + ' хв'].filter(Boolean).map(esc).join(' · ');
    return `<article class="practice-line ${task.done ? 'is-done' : ''}">
      <button class="task-check" ${task.submitted ? 'disabled' : ''} data-dash-complete="${task.id}" aria-pressed="${task.done}" aria-label="${task.done ? 'Позначити невиконаним' : 'Позначити виконаним'}: ${esc(task.title)}, ${esc(task.course.short)}">${task.done ? icon('check') : ''}</button>
      <div><h3>${esc(task.title)}</h3><p>${meta}</p></div>
      ${start(task, task.done ? 'Повторити' : 'Відкрити', 'task-open')}
    </article>`;
  }
  function legacyMetrics(course) {
    const id = course?.id, p = progress(id), week = C.addDays(today(), -6), urgent = tasks(id).filter(hot).length;
    return `<div class="metric-grid"><article class="metric-card"><span>${icon('clock')} Сьогодні у фокусі</span><strong data-stat-today>${C.secondsLabel(C.sum(state.records, { course: id, from: today(), to: today() }))}</strong><small>Ціль · ${H.state.minutes} хв на день</small></article><article class="metric-card"><span>${icon('calendar')} За 7 днів</span><strong data-stat-week>${C.secondsLabel(C.sum(state.records, { course: id, from: week, to: today() }))}</strong><small>${state.sessions.filter(s => (!id || s.course === id) && s.day >= week && s.day <= today()).length} Pomodoro завершено</small></article><article class="metric-card"><span>${icon('check')} Прогрес плану</span><strong>${p.done}<em> / ${p.total}</em></strong><div class="small-progress" role="progressbar" aria-label="Прогрес плану" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}"><i style="width:${p.percent}%"></i></div></article><article class="metric-card ${urgent ? 'metric-warm' : ''}"><span>${urgent ? flame() : icon('check')} Потребує уваги</span><strong>${urgent}</strong><small>${urgent ? 'Термінових і прострочених завдань' : 'Термінових завдань немає'}</small></article></div>`;
  }
  function activityDays(course) {
    const days = new Set(state.records.filter(r => (!course || r.course === course) && r.source === 'practice').map(r => r.day));
    Object.values(state.awards).filter(a => !course || a.course === course).forEach(a => days.add(a.day));
    state.records.filter(r => !course || r.course === course).forEach(r => { if (C.sum(state.records, { course, from: r.day, to: r.day }) >= 60) days.add(r.day); });
    return days;
  }
  function metrics(course) {
    const id = course?.id, p = progress(id), days = activityDays(id), week = Array.from({ length: 7 }, (_, i) => C.addDays(today(), i - 6));
    const seconds = C.sum(state.records, { course: id, from: today(), to: today() });
    const xp = Object.values(state.awards).filter(a => !id || a.course === id).reduce((n, a) => n + a.points, 0);
    let streak = 0, cursor = days.has(today()) ? today() : C.addDays(today(), -1);
    while (days.has(cursor)) { streak++; cursor = C.addDays(cursor, -1); }
    return `<section class="learning-strip" aria-label="Навчальна статистика"><div class="daily-focus-stat"><span class="tiny-goal-ring" style="--goal:${Math.min(100, seconds / (H.state.minutes * 60) * 100)}%" aria-hidden="true">${icon('clock')}</span><div><strong data-stat-today>${C.secondsLabel(seconds)}</strong><span>сьогодні / ${H.state.minutes} хв</span></div></div><div class="strip-stat"><strong data-stat-week>${C.secondsLabel(C.sum(state.records, { course: id, from: C.addDays(today(), -6), to: today() }))}</strong><span>за 7 днів</span></div><div class="strip-stat plan-stat"><strong>${p.done}<em> / ${p.total}</em></strong><span>завдань виконано</span><div class="small-progress" role="progressbar" aria-label="Прогрес плану" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}"><i style="width:${p.percent}%"></i></div></div><div class="streak-stat"><div><strong>${streak}</strong><span>днів поспіль</span></div><div class="streak-trail" aria-label="Навчальні дні за тиждень">${week.map(day => `<span class="${days.has(day) ? 'studied' : ''} ${day === today() ? 'trail-today' : ''}" title="${dateText(day)}${days.has(day) ? ': навчався' : ''}">${days.has(day) ? '✓' : '·'}</span>`).join('')}</div></div><div class="xp-stat" title="10 XP за нове завершене завдання · 25 XP за Pomodoro"><span class="xp-star" aria-hidden="true">✦</span><div><strong>${xp} XP</strong><span>Рівень ${Math.floor(xp / 100) + 1}</span></div></div></section>`;
  }
  function focusCard(course, next) {
    if (!next && !tasks(course?.id).length) {
      const c = course || selected()[0];
      const needsMoodle = c?.connected && !H.account?.paired;
      return `<section class="next-session focus-note"><div class="focus-body"><div class="next-session-copy"><h2>${needsMoodle ? 'Підключи Moodle для дедлайнів' : H.workspace?.deadlineError ? 'Дедлайни тимчасово недоступні' : c ? 'Найближчих дедлайнів немає' : 'Додай перший предмет'}</h2></div><div class="next-session-action">${needsMoodle ? '<a class="secondary" href="/hustle/connect.html">Підключити Moodle →</a>' : c ? '<a class="secondary" href="#practice">До практики →</a>' : H.workspace?.add || ''}</div><div class="desk-sticker mascot-sticker" aria-hidden="true"><img src="study-donkey.webp" alt=""><span class="paper-tape"></span></div></div></section>`;
    }
    if (!next) return `<section class="next-session plan-finished"><span class="finish-stamp" aria-hidden="true">✦</span><div><h2>План виконано</h2><p>${progress(course?.id).done} завдань — готово</p></div><a class="secondary" href="#practice">До практики ${icon('arrow')}</a></section>`;
    const note = next.course.materials.findIndex(item => item.type === 'Конспект');
    const reading = course && note >= 0
      ? `<button class="focus-reading" data-material="${note}" data-course="${course.id}" data-focus-id="focus-reading">${icon('files')} Конспект</button>`
      : '';
    return `<section class="next-session focus-note" aria-label="Наступне заняття">
      <div class="focus-body">
        <div class="next-session-copy">
          <a class="focus-course" href="#course/${next.course.id}">${avatar(next.course)} ${esc(next.course.name)}</a>
          <h2>${esc(next.course.connected ? next.title : next.course.topic)}</h2><p>${esc(next.course.connected ? next.label : next.title)} ${next.minutes ? `<span>· ${next.minutes} хв</span>` : ''}</p>
          </div>
        <div class="next-session-action">${start(next)}${reading}</div>
        <div class="desk-sticker mascot-sticker" aria-hidden="true"><img src="study-donkey.webp" alt=""><span class="paper-tape"></span></div>
      </div>
      <div class="focus-deadline deadline-surface">
        <span class="focus-deadline-name">${icon('calendar')}<span>Дедлайн<strong>${esc(next.course.deadline || next.title)}</strong></span></span>
        ${badge(next)}${fire.edge(next.due, next.done)}
      </div>
    </section>`;
  }
  function award(id, points, course) {
    if (state.awards[id]) { reward = null; return; }
    state.awards[id] = { points, course, day: today() };
    reward = { points, id };
  }
  function weeklyChart(course) {
    const days = Array.from({ length: 7 }, (_, i) => C.addDays(today(), i - 6));
    const values = days.map(day => C.sum(state.records, { course: course?.id, from: day, to: day }) / 60), max = Math.max(H.state.minutes, ...values);
    return `<section class="dash-panel activity-panel"><div class="panel-title"><h2>Час навчання</h2><span>Останні 7 днів</span></div><div class="activity-chart" role="img" aria-label="${days.map((day, i) => dateText(day) + ': ' + Math.floor(values[i]) + ' хв').join('; ')}">${days.map((day, i) => `<div class="activity-column ${day === today() ? 'is-today' : ''}"><span class="bar-value">${Math.floor(values[i])}</span><div class="bar-track"><i style="height:${values[i] / max * 100}%"></i></div><span>${dateText(day, { weekday: 'short' })}</span></div>`).join('')}</div><div class="chart-note"><i></i> Час у фокусі, хв</div></section>`;
  }
  function legacyFocusCard(course) {
    const list = tasks(course?.id), next = list.filter(t => !t.done).sort((a, b) => a.due - b.due || definitions.findIndex(d => d.kind === a.kind) - definitions.findIndex(d => d.kind === b.kind))[0];
    if (!next) return `<section class="next-focus completed-focus"><div><span class="focus-label">${icon('check')} План виконано</span><h2>Усі завдання завершено</h2><a href="#practice" class="secondary">До практики ${icon('arrow')}</a></div><span class="focus-check" aria-hidden="true">✓</span></section>`;
    return `<section class="next-focus"><div class="focus-content"><div class="focus-top"><span class="focus-label">${icon('practice')} Що далі</span>${badge(next)}</div><a class="focus-subject" href="#course/${next.course.id}">${esc(next.course.name)} ${icon('arrow')}</a><h2>${esc(next.course.topic)}</h2><p>${next.title} <span>· ${next.minutes} хв</span></p>${start(next)}</div><div class="focus-visual" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="focus-sheet"><span>${esc(next.course.initials)}</span><i></i><i></i><i></i><b>✓</b></div><span class="visual-spark">✳</span></div></section>`;
  }
  function courseCards(showHeading = true, showFire = false) {
    const now = Date.now();
    const ordered = selected().map(course => {
      const p = progress(course.id);
      const nearest = tasks(course.id).sort((a,b) => deadlineOrder(a,b,now))[0];
      return { course, p, nearest, due: nearest?.due ?? Infinity, done: p.total > 0 && p.done === p.total };
    }).sort((a, b) => deadlineOrder(a, b, now));
    const cards = ordered.map(({ course, p, nearest, due, done }) => {
      const seconds = C.sum(state.records, { course: course.id });
      return `<a class="subject-card deadline-surface subject-${course.color}" href="#course/${course.id}">
        <span class="paper-tape" aria-hidden="true"></span>
        <div class="subject-card-top">${avatar(course)}${icon('arrow')}</div>
        <h3>${esc(course.name)}</h3><p>${esc(course.topic)}</p>
        <div class="subject-progress"><span>${p.done} / ${course.connected ? UI.countLabel(p.total,'завдання','завдання','завдань') : p.total + ' вправ'}</span><span class="subject-minutes">${icon('clock')} ${C.secondsLabel(seconds)}</span></div>
        <div class="small-progress" role="progressbar" aria-label="Прогрес плану" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}"><i style="width:${p.percent}%"></i></div>
        ${nearest ? `<div class="subject-deadline deadline-surface">${done ? '' : `<strong>${esc(course.deadline || nearest.title)}</strong>`}${badge({ due, done })}${fire.edge(due, done, showFire)}</div>` : ''}
      </a>`;
    }).join('');
    const title = showHeading ? `<div class="panel-title"><h2>Мої предмети</h2><a href="#courses">Усі предмети ${icon('arrow')}</a></div>` : '';
    return `<div class="subjects-section">${title}<div class="subject-grid">${cards}</div></div>`;
  }
  function timerCard(courseInputId = 'timer-course') {
    const t = state.timer, phase = timerPhase(t);
    return `<section class="dash-panel pomodoro-card" data-timer-state="${phase}" aria-label="Pomodoro">
      <span class="paper-tape" aria-hidden="true"></span><div class="panel-title"><h2>${icon('clock')} Pomodoro</h2><span>${state.sessions.filter(s => s.day === today()).length} сьогодні</span></div>
      <div class="timer-modes" role="group" aria-label="Режим таймера">${[['focus', 'Фокус'], ['short', '5 хв'], ['long', '15 хв']].map(([mode, label]) =>
        `<button data-timer-mode="${mode}" aria-pressed="${t.mode === mode}">${label}</button>`).join('')}</div>
      <div class="timer-ring" data-timer-ring><div><strong data-timer-display role="timer" aria-label="Залишилось часу"></strong>
      <span>${phase === 'running' ? 'Таймер працює' : phase === 'paused' ? 'На паузі' : t.mode === 'focus' ? 'Фокус' : 'Перерва'}</span></div></div>
      <label class="timer-course-label" for="${courseInputId}">Предмет</label><select id="${courseInputId}" data-timer-course ${phase !== 'ready' ? 'disabled' : ''}>
        ${!courseById(t.course) ? '<option value="">Самостійне навчання</option>' : ''}${selected().map(c => `<option value="${c.id}" ${t.course === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <div class="timer-actions"><button class="primary" data-timer-toggle>${phase === 'running' ? 'Пауза' : phase === 'paused' ? 'Продовжити' : 'Старт'}${icon(phase === 'running' ? 'pause' : 'play')}</button>
      <button class="icon-button" data-timer-reset aria-label="Скинути таймер">↻</button></div>
      <p class="timer-feedback" role="status" data-timer-feedback>${t.mode === 'focus' ? '' : 'Перерва не додається до часу навчання'}</p>
    </section>`;
  }
  function paintTimerPanel(focusSelector) {
    if (!timerPanel || timerPanel.hidden) return;
    timerPanel.innerHTML = timerCard('timer-menu-course');
    if (focusSelector) timerPanel.querySelector(focusSelector)?.focus({preventScroll:true});
  }
  function closeTimerMenu(restoreFocus = false) {
    if (!timerPanel || timerPanel.hidden) return;
    timerPanel.hidden = true;
    timerToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) timerToggle.focus({preventScroll:true});
  }
  function positionTimerMenu() {
    if (!timerPanel || timerPanel.hidden) return;
    const {bottom, right} = timerMenu.getBoundingClientRect();
    if (bottom <= 0) { closeTimerMenu(); return; }
    const topbarBottom = timerMenu.closest('.workspace-topbar').getBoundingClientRect().bottom;
    timerPanel.style.setProperty('--timer-menu-top', Math.ceil(Math.max(bottom, topbarBottom) + 8) + 'px');
    timerPanel.style.setProperty('--timer-menu-right', Math.max(16, innerWidth - right) + 'px');
  }
  const pomodoroRoute = 'settings/pomodoro';
  function renderSettings(section, content) {
    let panel = main.querySelector(':scope > [data-settings-panel]');
    if (!panel) {
      main.innerHTML = `<h1 class="visually-hidden" tabindex="-1">Налаштування</h1>
        <nav class="settings-sections" aria-label="Розділи налаштувань">
          <a class="secondary" href="#settings">Загальні</a>
          <a class="secondary" href="#${pomodoroRoute}">Pomodoro</a>
          ${H.workspace ? '<a class="secondary" href="#settings/courses">Предмети</a>' : ''}
        </nav>
        <div data-settings-panel></div>`;
      panel = main.querySelector('[data-settings-panel]');
    }
    const activeHash = section === 'general' ? '#settings' : '#settings/' + section;
    for (const tab of main.querySelectorAll('.settings-sections > a')) {
      if (tab.hash === activeHash) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
    panel.innerHTML = content;
  }
  function refreshTimerControls(trigger, selector) {
    paintTimerPanel(timerPanel?.contains(trigger) ? selector : '');
    if (location.hash === '#' + pomodoroRoute) refresh(main.contains(trigger) ? selector : '');
    paintTimer();
  }
  function calendarGrid(compact = false, course) {
    const monthKey = month.slice(0, 7);
    const gridDays = C.monthDays(month);
    const lastDay = gridDays.findLastIndex(day => day.startsWith(monthKey));
    const days = compact ? gridDays : gridDays.slice(0, Math.ceil((lastDay + 1) / 7) * 7);
    const events = tasks(course?.id).filter(t => !t.course.connected);
    const monthLabel = dateText(month, { month: 'long', year: 'numeric' });
    const monthControls = `<div class="calendar-month-controls">
      <button class="icon-button" data-month-step="-1" aria-label="Попередній місяць"><span aria-hidden="true" class="month-chevron"></span></button>
      <strong>${monthLabel[0].toLocaleUpperCase('uk') + monthLabel.slice(1)}</strong>
      <button class="icon-button" data-month-step="1" aria-label="Наступний місяць"><span aria-hidden="true" class="month-chevron"></span></button></div>`;
    return `<section class="dash-panel calendar-panel ${compact ? 'compact-calendar' : ''}">${compact ? `<div class="panel-title"><h2>Календар</h2><a href="#calendar" aria-label="Відкрити календар">${icon('arrow')}</a></div>${monthControls}` : `<div class="month-heading">${monthControls}<button class="calendar-today" data-calendar-today>Сьогодні</button></div>`}<div class="calendar-weekdays" aria-hidden="true">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => `<span>${d}</span>`).join('')}</div><div class="calendar-grid" role="group" aria-label="Дні місяця">${days.map(day => {
      const due = H.calendar ? H.calendar.events(course?.id).filter(e => e.day === day) : demoCourses().filter(c => (!course || c.id === course.id) && tasks(c.id)[0].dueDay === day), planned = events.filter(t => t.scheduled === day), urgent = due.some(e => { const c = courseById(e.course || e.id); return c && hot(tasks(c.id)[0]) && !allDone(c); });
      return `<div class="calendar-cell" data-drop-day="${day}"><button data-calendar-date="${day}" aria-pressed="${selectedDate === day}" ${day === today() ? 'aria-current="date"' : ''} class="calendar-day ${day.slice(0, 7) !== month.slice(0, 7) ? 'other-month' : ''} ${urgent ? 'has-urgent' : ''}" aria-label="${dateText(day, { weekday: 'long', day: 'numeric', month: 'long' })}${due.length ? ', дедлайнів: ' + due.length : ''}${planned.length ? ', завдань: ' + planned.length : ''}"><span>${Number(day.slice(-2))}</span><div class="calendar-dots" aria-hidden="true">${due.map(() => '<i class="deadline-dot"></i>').join('')}${planned.length ? '<i></i>' : ''}</div></button>${!compact && H.calendar ? H.calendar.chips(day, course?.id) : ''}</div>`;
    }).join('')}</div>${compact ? `<div class="mini-agenda"><strong>${dateText(selectedDate)}</strong>${agendaItems(selectedDate, course, true)}</div>` : '<div class="calendar-legend"><span><i></i> Заняття</span><span><i class="deadline-dot"></i> Дедлайн</span></div>'}</section>`;
  }
  function agendaItems(day, course, compact = false) {
    const list = tasks(course?.id).filter(t => !t.course.connected && t.scheduled === day), deadlines = demoCourses().filter(c => (!course || c.id === course.id) && tasks(c.id)[0].dueDay === day);
    if (H.calendar) { const imported = H.calendar.agenda(day, course?.id, planDone, !compact); return imported + (list.length ? (compact ? list.map(t => `<button class="mini-agenda-task" data-start="${t.kind}" data-course="${t.course.id}" data-focus-id="agenda-${t.id}"><i></i><span>${esc(t.course.short)} · ${t.label}</span>${t.done ? icon('check') : icon('arrow')}</button>`).join('') : list.map(t => practiceRow(t, !course)).join('')) : imported ? '' : '<p class="agenda-empty">На цей день нічого не заплановано</p>'); }
    if (!list.length && !deadlines.length) return `<p class="agenda-empty">На цей день нічого не заплановано</p>`;
    return deadlines.map(c => `<a class="agenda-deadline" href="#course/${c.id}"><span class="agenda-icon">${!allDone(c) && hot(tasks(c.id)[0]) ? flame() : icon('calendar')}</span><div><strong>${esc(c.deadline)}</strong><span>${esc(c.short)} · ${dueLabel(tasks(c.id)[0].due).split(' · ')[1]}</span></div>${icon('arrow')}</a>`).join('') + (compact ? list.map(t => `<button class="mini-agenda-task" data-start="${t.kind}" data-course="${t.course.id}" data-focus-id="agenda-${t.id}"><i class="${t.done ? 'done-dot' : ''}"></i><span>${esc(t.course.short)} · ${t.label}</span>${t.done ? icon('check') : icon('arrow')}</button>`).join('') : list.map(t => practiceRow(t, !course)).join(''));
  }
  function preparationChecklist(course, list) {
    const p = progress(course?.id);
    const plan = [...list].sort((a, b) => a.scheduled.localeCompare(b.scheduled) || a.due - b.due);
    const visibleRows = course ? plan : plan.filter(task => task.scheduled === today());
    const others = plan.filter(task => !visibleRows.includes(task));
    return `<section class="dash-panel task-panel">
      <div class="panel-title"><h2>${course ? 'План підготовки' : 'Заняття на сьогодні'}</h2><span>${course ? p.done + ' / ' + p.total + ' виконано' : dateText(today(), { day: 'numeric', month: 'short' })}</span></div>
      <div class="dash-task-list">${visibleRows.map(t => practiceRow(t, !course)).join('') || '<p class="agenda-empty">На сьогодні занять не заплановано.</p>'}</div>
      ${others.length ? `<details class="remaining-tasks"><summary>Інші заняття <span>${others.length}</span></summary>${others.map(t => practiceRow(t, true)).join('')}</details>` : ''}
    </section>`;
  }
  function studyShortcuts(course) {
    const route = '#course/' + encodeURIComponent(course.id);
    return `<nav class="study-shortcuts" aria-label="Практика предмета">
      <a class="study-shortcut study-shortcut--cards" href="${route}/cards">
        <span class="study-shortcut-icon" aria-hidden="true">${icon('courses')}</span>
        <strong>Картки</strong><span class="study-shortcut-arrow" aria-hidden="true">${icon('arrow')}</span>
      </a>
      <a class="study-shortcut study-shortcut--quiz" href="${route}/quizzes">
        <span class="study-shortcut-icon" aria-hidden="true">${icon('practice')}</span>
        <strong>Самоперевірка</strong><span class="study-shortcut-arrow" aria-hidden="true">${icon('arrow')}</span>
      </a>
      <button type="button" class="study-shortcut study-shortcut--oral" data-paper-oral="${esc(course.id)}">
        <span class="study-shortcut-icon" aria-hidden="true">${icon('speech')}</span>
        <strong>Усний захист</strong><span class="study-shortcut-arrow" aria-hidden="true">${icon('arrow')}</span>
      </button>
    </nav>`;
  }
  function connectedOverview(course, list) {
    const deadlineLink = course ? '#course/' + encodeURIComponent(course.id) + '/assignments' : '#deadlines';
    const header = course ? H.workspace.courseHeader(course) :
      heading('Мій огляд', H.liveCalendar?.inboxButton() || H.calendar.button());
    const addCourse = !course && !selected().length ? H.workspace.add : '';
    return `${header}${H.workspace.notice()}
      <div class="dashboard-layout desk-layout compact-desk-layout study-overview-layout">
        ${metrics(course)}
        <div class="dashboard-main">
          ${addCourse ? `<div>${addCourse}</div>` : ''}
          ${course ? studyShortcuts(course) : ''}
          <section class="dash-panel deadline-queue">
            <div class="deadline-preview-heading">
              <div class="panel-title"><h2>Найближчі дедлайни</h2><a href="${deadlineLink}">Усі дедлайни ${icon('arrow')}</a></div>
              ${list.some(task => !task.done) ? '<span class="mascot-sticker mascot-sticker--deadline" aria-hidden="true"><img src="assets/mascot/deadline.webp" alt="" width="384" height="384" decoding="async"></span>' : ''}
            </div>
            ${deadlineList(list, !course, course ? 3 : Infinity)}
          </section>
          ${course ? window.HustleTopicCards?.overview(course.id) || '' : ''}
        </div>
        <aside class="dashboard-aside">
          ${weeklyChart(course)}
          ${calendarGrid(true, course)}
        </aside>
      </div>`;
  }
  function dashboardView(course) {
    // Keep the original library markup inert in the prototype.
    const now = Date.now();
    const order = H.workspace ? deadlineTimeOrder : deadlineOrder;
    const list = tasks(course?.id).sort((a, b) => order(a, b, now));
    if (H.workspace) return connectedOverview(course, list);
    const active = list.filter(task => !task.done);
    const next = active[0];
    const upcoming = active.filter((task, index) => task !== next && (task.course.connected || task.course.id !== next?.course.id &&
      active.findIndex(other => other.course.id === task.course.id) === index));
    const queue = upcoming.length ? `<section class="dash-panel deadline-queue">
      <div class="panel-title"><h2>Інші дедлайни</h2><a href="#calendar">Календар ${icon('arrow')}</a></div>
      ${upcoming.map(task => `<article class="deadline-line deadline-surface"><a class="deadline-task-link" href="#course/${esc(task.course.id)}">
        ${task.course.connected ? deadlineIdentity(task, true) : `${avatar(task.course)}<span class="queue-title"><strong>${esc(task.course.deadline || task.title)}</strong><small>${esc(task.course.name)}</small></span>`}
        ${badge(task)}${icon('arrow')}</a>${H.liveCalendar?.deadlineButton(task) || ''}${fire.edge(task.due, task.done)}</article>`).join('')}
    </section>` : '';
    const header = `${course ? '<a class="back-to-courses" href="#courses">← Усі предмети</a>' : ''}${heading(course ? course.name : 'Мій огляд', course ? (H.paperOral?.button(course) || '') : (H.liveCalendar?.inboxButton() || H.calendar.button()))}`;
    return `${header}<div class="dashboard-layout desk-layout">${focusCard(course, next)}${metrics(course)}<div class="dashboard-main">${queue}${preparationChecklist(course, list)}${course ? `<template><section class="dash-panel course-material-panel"><div class="panel-title"><h2>Матеріали предмета</h2></div>${course.materials.map((m, i) => `<button class="course-material-link" data-material="${i}" data-course="${course.id}" data-focus-id="dash-material-${course.id}-${i}">${icon('files')}<span><strong>${esc(m.title)}</strong><small>${esc(m.type)}</small></span>${icon('arrow')}</button>`).join('')}</section></template>` : ''}${weeklyChart(course)}</div><aside class="dashboard-aside">${calendarGrid(true, course)}</aside></div>`;
  }
  function deadlinesView(course) {
    const now = Date.now();
    const list = tasks(course?.id).sort((a, b) => deadlineTimeOrder(a, b, now));
    const records = course ? `<a class="secondary" href="#course/${course.id}/submissions">Статус у Moodle →</a>` : '';
    const rows = deadlineList(list, !course);
    const header = course ? H.workspace.courseHeader(course, 'assignments') + `<div class="paper-deadline-actions">${records}</div>` : heading('Дедлайни');
    return header + (H.workspace.notice() || '') +
      '<section class="dash-panel deadline-queue">' + (rows || '<p class="agenda-empty">Найближчих дедлайнів немає.</p>') + '</section>';
  }
  function coursesView() { return heading('Мої предмети', H.workspace?.add || '<a class="secondary" href="connect.html?edit=1">Обрати предмети +</a>') + metrics() + (H.workspace ? H.workspace.notice() : H.liveCalendar?.coursesView() || '') + courseCards(false, true); }
  function calendarView() {
    if (H.liveCalendar?.week) return H.liveCalendar.weekView();

    const dayHeading = dateText(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' });
    const weekStart = C.addDays(selectedDate, -((new Date(selectedDate + 'T12:00:00Z').getUTCDay() + 6) % 7));
    return heading('Календар', H.liveCalendar?.actions() || H.calendar.button(), false) + (H.liveCalendar?.viewSwitch() || '') + `<div class="calendar-layout planner-spread">${calendarGrid()}<section class="dash-panel selected-agenda"><div class="panel-title"><h2>${dayHeading[0].toLocaleUpperCase('uk') + dayHeading.slice(1)}</h2><span>${C.secondsLabel(C.sum(state.records, { from: selectedDate, to: selectedDate }))} у фокусі</span></div><div class="agenda-week" role="group" aria-label="Обрати день тижня">${Array.from({ length: 7 }, (_, i) => C.addDays(weekStart, i)).map(day => `<button data-calendar-date="${day}" aria-pressed="${day === selectedDate}"><span>${dateText(day, { weekday: 'short' })}</span><strong>${Number(day.slice(-2))}</strong></button>`).join('')}</div>${agendaItems(selectedDate)}</section></div>`;
  }
  function closeMobileMenu() { document.body.classList.remove('menu-open'); document.querySelector('.sidebar-shade').hidden = true; document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false'); document.querySelector('#sidebar').inert = matchMedia('(max-width: 52rem)').matches; }
  function render() {
    if (location.hash === '#focus') history.replaceState(null, '', '#' + pomodoroRoute);
    const hash = location.hash.slice(1) || 'plan', course = hash.startsWith('course/') ? courseById(hash.split('/')[1]) : null;
    main.toggleAttribute('data-dashboard-overview', hash === 'plan');
    if (H.workspace && (hash === 'deadlines' || course?.connected && hash === 'course/' + course.id + '/assignments')) {
      document.title = 'Дедлайни — Hustle';
      if (!course) document.querySelector('#view-name').textContent = 'Дедлайни';
      document.querySelectorAll('[data-nav],.sidebar-course').forEach(a => {
        if (course && a.hash === '#course/' + course.id) a.setAttribute('aria-current','page');
        else a.removeAttribute('aria-current');
      });
      main.innerHTML = deadlinesView(course); H.liveCalendar?.mount(hash, month, selectedDate, course); fire.mount(main); return true;
    }
    if (H.workspace?.tools(hash)) { fire.mount(); return true; }
    if (hash === 'oral' && H.paperOral) {
      main.innerHTML = heading('Усний захист') + H.paperOral.shell();
      H.paperOral.mount(main.querySelector('[data-oral-picker]'));
      document.title = 'Усний захист — Hustle';
      document.querySelector('#view-name').textContent = 'Усний захист';
      document.querySelectorAll('[data-nav],.sidebar-course').forEach(a => a.removeAttribute('aria-current'));
      document.querySelector('[data-nav="practice"],[data-nav="oral"]')?.setAttribute('aria-current','page');
      return true;
    }
    const pomodoroSettings = hash === pomodoroRoute;
    const courseSettings = H.workspace && hash === 'settings/courses';
    const settingsPage = pomodoroSettings || courseSettings;
    if (!settingsPage && !['plan', 'courses', 'calendar'].includes(hash) && !hash.startsWith('course/')) return false;
    if (hash.startsWith('course/') && !course) {
      document.querySelector('#view-name').textContent = 'Предмет не знайдено';
      fire.mount();
      main.innerHTML = heading('Предмет не знайдено', '<a class="secondary" href="#courses">До предметів</a>');
      return true;
    }
    if (course && timerPhase(state.timer) === 'ready' && state.timer.course !== course.id) { state.timer.course = course.id; save(); }
    const title = course?.short || ({ plan: 'Мій огляд', courses: 'Мої предмети', calendar: 'Календар', [pomodoroRoute]: 'Налаштування', 'settings/courses': 'Налаштування' })[hash];
    document.querySelectorAll('[data-nav],.sidebar-course').forEach(a => { if (course ? a.hash === '#course/' + course.id : a.dataset.nav === (settingsPage ? 'settings' : hash)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (!course?.connected) document.querySelector('#view-name').textContent = hash === 'plan' ? '' : title;
    document.title = `${title} — Hustle`;
    // The weekly planner manages its own refreshes and open days.
    const mountedWeek = hash === 'calendar' && H.liveCalendar?.week && main.querySelector('[data-paper-week]');
    if (pomodoroSettings) renderSettings('pomodoro', `<div class="dedicated-focus">${timerCard()}${weeklyChart()}</div>`);
    else if (courseSettings) {
      if (!main.querySelector('[data-course-appearance]')) renderSettings('courses', H.workspace.courseAppearanceSettings());
    }
    else if (!mountedWeek) main.innerHTML = hash === 'calendar' ? calendarView() : hash === 'courses' ? coursesView() : dashboardView(course);
    window.HustleTopicCards?.mountOverview(main);
    H.liveCalendar?.mount(hash, month, selectedDate, course);
    fire.mount(main); paintTimer(); return true;
  }
  function refresh(focusSelector) {
    const expanded = main.querySelector('.remaining-tasks')?.open;
    render();
    const moreTasks = main.querySelector('.remaining-tasks');
    if (expanded && moreTasks) moreTasks.open = true;
    const target = focusSelector && main.querySelector(focusSelector);
    target?.focus({ preventScroll: true });
    return target;
  }
  function selectDay(day) {
    selectedDate = day;
    month = day.slice(0, 7) + '-01';
    refresh(`[data-calendar-date="${day}"]`);
    main.querySelector('.selected-agenda, .mini-agenda')?.classList.add('day-changed');
  }
  function record(start, end, course, source, id) {
    if (end <= start) return;
    C.splitInterval(start, end, course, source, id).forEach(item => {
      const last = state.records.at(-1);
      if (last && last.sessionId === id && last.day === item.day && last.course === course && last.source === source) last.seconds = Math.round((last.seconds + item.seconds) * 1000) / 1000;
      else state.records.push({ ...item, sessionId: id });
    });
  }
  function tickTimer() {
    const t = state.timer, now = Date.now();
    if (!t.running) return;
    const stop = Math.min(now, t.endsAt);
    if (t.mode === 'focus') record(t.creditedAt, stop, t.course, 'pomodoro', t.id);
    t.creditedAt = stop; t.remaining = C.remaining(t, now);
    if (!t.remaining) {
      const wasFocus = t.mode === 'focus', course = t.course;
      if (wasFocus && !state.sessions.some(s => s.id === t.id)) { state.sessions.push({ id: t.id, day: C.dateKey(t.endsAt), course }); award('focus:' + t.id, 25, course); }
      state.timer = newTimer(wasFocus ? (state.sessions.length % 4 === 0 ? 'long' : 'short') : 'focus', course);
      if (activePractice) activePractice.since = now;
      save(); if (!document.querySelector('#study-dialog').open) render();
      paintTimerPanel();
      announce(wasFocus ? '+25 XP · Pomodoro завершено. Час для перерви.' : 'Перерва завершена. Можна починати наступне заняття.');
      document.querySelectorAll('[data-timer-feedback]').forEach(el => el.textContent = wasFocus ? 'Фокус завершено. Час для перерви.' : 'Перерва завершена. Почати новий фокус?');
    } else save();
  }
  function paintTimer() {
    const t = state.timer, left = C.remaining(t), label = `${Math.floor(left / 60).toString().padStart(2, '0')}:${(left % 60).toString().padStart(2, '0')}`;
    document.querySelectorAll('[data-timer-display]').forEach(el => el.textContent = label);
    document.querySelectorAll('[data-timer-ring]').forEach(el => el.style.setProperty('--timer-progress', `${(1 - left / t.duration) * 100}%`));
    if (timerToggle) {
      const phase = timerPhase(t);
      timerToggle.querySelector('span').textContent = phase === 'ready' ? 'Pomodoro' : label;
      timerToggle.setAttribute('aria-label', phase === 'ready' ? 'Pomodoro' : `Pomodoro, ${phase === 'paused' ? 'на паузі' : 'залишилось'} ${label}`);
      if (timerToggle.dataset.timerState !== phase) {
        timerToggle.dataset.timerState = phase;
        if (phase === 'ready' && document.activeElement === timerQuick) timerToggle.focus({preventScroll:true});
        timerQuick.hidden = phase === 'ready';
        timerQuick.innerHTML = icon(phase === 'running' ? 'pause' : 'play');
        const action = phase === 'running' ? 'Пауза Pomodoro' : 'Продовжити Pomodoro';
        timerQuick.setAttribute('aria-label', action);
        timerQuick.title = action;
        positionTimerMenu();
      }
    }
    const id = location.hash.startsWith('#course/') ? location.hash.split('/')[1] : undefined;
    const todaySeconds = C.sum(state.records, { course: id, from: today(), to: today() });
    document.querySelectorAll('[data-stat-today]').forEach(el => el.textContent = C.secondsLabel(todaySeconds));
    document.querySelector('.tiny-goal-ring')?.style.setProperty('--goal', Math.min(100, todaySeconds / (H.state.minutes * 60) * 100) + '%');
    document.querySelectorAll('[data-stat-week]').forEach(el => el.textContent = C.secondsLabel(C.sum(state.records, { course: id, from: C.addDays(today(), -6), to: today() })));
  }
  function flushPractice() {
    if (!activePractice) return;
    const now = Date.now(), t = state.timer;
    // An explicit Pomodoro owns its interval. Passive practice never counts it twice.
    if (!document.hidden && document.hasFocus() && !t.running && now - lastActivity < 60000) record(activePractice.since, now, activePractice.course, 'practice', activePractice.id);
    activePractice.since = now; save();
  }
  function beginPractice(course) { lastPracticeCourse = course; flushPractice(); activePractice = { course, since: Date.now(), id: crypto.randomUUID() }; lastActivity = Date.now(); }
  H.dashboardRefresh = () => { if (!document.querySelector('#study-dialog').open) render(); };
  window.HustleDashboard = {
    renderSettings,
    render,
    trackCourseActivity(courseId) {
      lastActivity = Date.now();
      if (activePractice?.course !== courseId) beginPractice(courseId);
    },
    rewardSummary() { return reward ? `<div class="earned-xp"><span aria-hidden="true">✦</span> +${reward.points} XP<i></i><i></i><i></i><i></i></div>` : ''; },
    completePractice(practice) { flushPractice(); award('task:' + practice.course.id + ':' + practice.kind, 10, practice.course.id); state.completed[`${practice.course.id}:${practice.kind}`] = true; activePractice = null; save(); },
  };
  document.addEventListener('click', event => {
    const el = event.target.closest('button,a'); if (!el) { const cell = event.target.closest('.calendar-cell'); cell?.querySelector('[data-calendar-date]')?.click(); return; }
    lastActivity = Date.now();
    if (el.hasAttribute('data-start') || el.hasAttribute('data-material')) beginPractice(el.dataset.course);
    if (el.hasAttribute('data-restart') && lastPracticeCourse) beginPractice(lastPracticeCourse);
    if (el.hasAttribute('data-restart') && !lastPracticeCourse) { const course = document.querySelector('.study-context')?.textContent; const c = selected().find(c => course?.startsWith(c.short)); if (c) beginPractice(c.id); }
    if (el.hasAttribute('data-dash-complete') && !el.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = el.dataset.dashComplete;
      const deadline = el.classList.contains('deadline-complete');
      const sibling = deadline && el.closest('.deadline-line').nextElementSibling;
      const next = sibling && sibling.matches('.deadline-line') ? sibling.querySelector('.deadline-complete') : null;
      state.completed[id] = !state.completed[id];
      save();
      let selector = `[data-dash-complete="${CSS.escape(id)}"]`;
      if (deadline && state.completed[id]) {
        selector = next?.dataset.dashComplete
          ? `[data-dash-complete="${CSS.escape(next.dataset.dashComplete)}"]`
          : '.deadline-completed > summary';
        announce('Дедлайн позначено виконаним.');
      } else if (deadline) announce('Позначку виконання знято.');
      const check = refresh(selector);
      if (deadline) check?.scrollIntoView({block: 'nearest'});
      else if (state.completed[id]) check?.closest('.practice-line')?.classList.add('just-completed');
    }
    if (el.hasAttribute('data-calendar-date')) { selectDay(el.dataset.calendarDate); }
    if (el.hasAttribute('data-month-step')) { const d = new Date(month + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + Number(el.dataset.monthStep)); month = d.toISOString().slice(0, 10); selectedDate = month; refresh(`[data-month-step="${el.dataset.monthStep}"]`); }
    if (el.hasAttribute('data-calendar-today')) { month = today().slice(0, 7) + '-01'; selectedDate = today(); refresh('[data-calendar-today]'); }
    if (el.hasAttribute('data-timer-toggle')) {
      flushPractice(); tickTimer(); const t = state.timer;
      if (t.running) { t.remaining = C.remaining(t); t.running = false; }
      else { t.running = true; t.endsAt = Date.now() + t.remaining * 1000; t.creditedAt = Date.now(); if (!t.id) t.id = crypto.randomUUID(); }
      save(); refreshTimerControls(el, '[data-timer-toggle]');
    }
    if (el.hasAttribute('data-timer-reset')) { tickTimer(); state.timer = newTimer(state.timer.mode, state.timer.course); if (activePractice) activePractice.since = Date.now(); save(); refreshTimerControls(el, '[data-timer-reset]'); }
    if (el.hasAttribute('data-timer-mode')) { tickTimer(); state.timer = newTimer(el.dataset.timerMode, state.timer.course); if (activePractice) activePractice.since = Date.now(); save(); refreshTimerControls(el, `[data-timer-mode="${el.dataset.timerMode}"]`); }
    if (el.closest('#workspace-nav')) closeMobileMenu();
  }, true);
  document.addEventListener('change', e => { if (e.target.matches('[data-timer-course]') && timerPhase(state.timer) === 'ready') {
    state.timer.course = e.target.value; save();
    document.querySelectorAll('[data-timer-course]').forEach(select => select.value = state.timer.course);
  } });
  document.addEventListener('keydown', e => {
    lastActivity = Date.now();
    if (!e.target.matches('[data-calendar-date]')) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return; e.preventDefault(); selectDay(C.addDays(e.target.dataset.calendarDate, step));
  });
  const paperPointer = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  main.addEventListener('pointermove', event => {
    if (!paperPointer.matches || event.pointerType === 'touch') return;
    const paper = event.target.closest('.subject-card');
    if (!paper) return;
    const bounds = paper.getBoundingClientRect();
    paper.style.setProperty('--light-x', (event.clientX - bounds.left) + 'px');
    paper.style.setProperty('--light-y', (event.clientY - bounds.top) + 'px');
  }, { passive: true });
  document.addEventListener('pointerdown', () => lastActivity = Date.now());
  document.addEventListener('visibilitychange', () => { if (activePractice) activePractice.since = Date.now(); tickTimer(); paintTimer(); });
  window.addEventListener('blur', flushPractice);
  window.addEventListener('focus', () => { if (activePractice) activePractice.since = Date.now(); lastActivity = Date.now(); tickTimer(); paintTimer(); });
  window.addEventListener('pagehide', () => { flushPractice(); tickTimer(); save(); });
  document.querySelector('#study-dialog').addEventListener('close', () => { flushPractice(); activePractice = null; });
  window.addEventListener('hashchange', () => { flushPractice(); activePractice = null; closeMobileMenu(); closeTimerMenu(); });
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('#workspace-nav');
    nav.querySelector('[data-nav="plan"] span').textContent = 'Мій огляд';
    nav.querySelector('[data-nav="courses"] span').textContent = 'Мої предмети';
    const settings = nav.querySelector('[data-nav="settings"]');
    settings.insertAdjacentHTML('beforebegin', `<a href="#calendar" data-nav="calendar">${icon('calendar')}<span>Календар</span></a>`);
    document.querySelector('.topbar-account').insertAdjacentHTML('beforebegin', `<div class="timer-menu">
      <button type="button" class="persistent-timer" id="persistent-timer" aria-expanded="false" aria-controls="timer-menu-panel">${icon('clock')}<span>Pomodoro</span></button>
      <button type="button" class="icon-button timer-quick" data-timer-toggle hidden></button>
      <div class="timer-menu-panel" id="timer-menu-panel" hidden></div>
    </div>`);
    timerMenu = document.querySelector('.timer-menu');
    timerToggle = timerMenu.querySelector('#persistent-timer');
    timerQuick = timerMenu.querySelector('.timer-quick');
    timerPanel = timerMenu.querySelector('.timer-menu-panel');
    timerToggle.addEventListener('click', () => {
      if (!timerPanel.hidden) { closeTimerMenu(); return; }
      timerPanel.hidden = false;
      timerToggle.setAttribute('aria-expanded', 'true');
      positionTimerMenu();
      paintTimerPanel();
      paintTimer();
    });
    document.addEventListener('click', e => { if (!e.composedPath().includes(timerMenu)) closeTimerMenu(); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || timerPanel.hidden || document.querySelector('dialog[open]')) return;
      if (CSS.supports('selector(select:open)') && timerPanel.querySelector('select:open')) return;
      e.preventDefault();
      closeTimerMenu(timerMenu.contains(document.activeElement));
    });
    window.addEventListener('resize', positionTimerMenu);
    const topbar = timerMenu.closest('.workspace-topbar');
    const onWorkspaceScroll = () => {
      topbar.classList.toggle('is-scrolled', window.scrollY > 1);
      positionTimerMenu();
    };
    window.addEventListener('scroll', onWorkspaceScroll, {passive:true});
    onWorkspaceScroll();
    settings.insertAdjacentHTML('beforebegin', `<section class="sidebar-subjects" aria-labelledby="sidebar-subjects-title">
      <p class="sidebar-course-label" id="sidebar-subjects-title">Предмети</p>
      <div class="sidebar-subject-links"></div>
    </section>`);
    const subjects = nav.querySelector('.sidebar-subject-links');
    if (H.liveCalendar && !H.workspace) subjects.insertAdjacentHTML('beforeend', `<a href="/hustle/app.html#courses">${icon('link')}<span>Курси Moodle</span></a>`);
    H.refreshCourseNav = () => {
      subjects.querySelectorAll('.sidebar-course').forEach(el => el.remove());
      selected().forEach(c => subjects.insertAdjacentHTML('beforeend', `<a class="sidebar-course" href="#course/${c.id}"><i class="course-dot subject-${c.color}"></i><span>${esc(c.short)}</span></a>`));
    };
    H.refreshCourseNav();
    if (H.liveCalendar?.standalone) {
      nav.innerHTML = `<a href="/hustle/app.html#dashboard">${icon('plan')}<span>Мій огляд</span></a><a href="/hustle/app.html#courses">${icon('courses')}<span>Курси Moodle</span></a><a href="#calendar" data-nav="calendar">${icon('calendar')}<span>Календар</span></a><a href="#oral" data-nav="oral">${icon('practice')}<span>Усний захист</span></a><a href="/hustle/app.html#settings">${icon('settings')}<span>Налаштування</span></a>`;
      document.querySelectorAll('.topbar-account,.sidebar-profile').forEach(a => a.href = '/hustle/app.html#settings');
      timerMenu.hidden = true;
    }
    tickTimer(); render(); paintTimer();
  });
  window.addEventListener('storage', e => {
    if (e.key !== storageKey || !e.newValue) return;
    try {
      const next = JSON.parse(e.newValue);
      const changed = timerPhase(state.timer) !== timerPhase(next.timer) || state.timer.mode !== next.timer.mode ||
        state.timer.course !== next.timer.course || state.sessions.length !== next.sessions.length;
      state = next;
      if (!document.querySelector('#study-dialog').open) render();
      if (changed) paintTimerPanel();
      paintTimer();
    } catch {}
  });
  let urgencySignature = '';
  setInterval(() => {
    tickTimer(); flushPractice(); paintTimer();
    const signature = today() + tasks().map(t => [t.id, C.urgency(t.due, t.done)].join(':')).join('|');
    if (!urgencySignature) urgencySignature = signature;
    if (signature !== urgencySignature && !document.querySelector('dialog[open]') && !main.contains(document.activeElement)) {
      urgencySignature = signature;
      render();
    }
  }, 1000);
  save();
})();
