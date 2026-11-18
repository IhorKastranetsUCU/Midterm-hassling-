/* The paper planner and the weekly workspace share a cookie, calendar API and event editor. */
(() => {
  const H = window.Hustle, core = window.HustleStudy;
  const standalone = !H.state.registered || !H.state.ready || !H.state.courses.length;
  if (standalone && !['#calendar', '#oral'].includes(location.hash)) return;
  const {escape: esc, icon} = H;
  const editor = window.HustleCalendar;
  const main = document.querySelector('#workspace-main');
  const dialog = document.querySelector('#study-dialog');
  let calendar, courses = [], context, bootstrap, sessionRequest, week = false, revision = 0;
  let period = '', loading, error = '', weekHost;
  const days = () => core.monthDays(context.month);
  const zone = () => calendar?.settings.timezone || core.zone;
  const dayOf = value => new Intl.DateTimeFormat('en-CA', {
    timeZone: zone(), year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value));
  const timeOf = value => new Intl.DateTimeFormat('uk-UA', {timeZone: zone(), hour:'2-digit', minute:'2-digit'}).format(new Date(value));
  const label = ev => ev.created_by === 'moodle' ? 'Дедлайн Moodle' : ({google:'Google Calendar', ics:'iCal', ai_study:'Навчання', manual:'Моя подія'})[ev.source_type] || 'Подія';
  const editable = ev => ['ai_study', 'manual'].includes(ev.source_type);
  const refresh = () => H.dashboardRefresh?.();
  const pending = () => calendar?.deadlines.filter(d => d.review === 'pending') || [];
  function session(revalidate = false) {
    // Other tabs can import a course. Serialize the first request that issues a guest cookie.
    if (sessionRequest) return sessionRequest;
    if (bootstrap && !revalidate) return bootstrap;
    bootstrap = UI.api('/api/workspace/session').then(() => UI.api('/api/workspace/courses'))
      .then(result => { courses = result; }).catch(err => { bootstrap = null; throw err; });
    sessionRequest = bootstrap.finally(() => { sessionRequest = null; });
    return sessionRequest;
  }
  function coursesView() {
    if (!courses.length) return '';
    return `<section class="subjects-section"><div class="panel-title"><h2>Курси Moodle</h2></div><div class="subject-grid">${courses.map(c =>
      `<a class="subject-card deadline-surface subject-lilac" href="/hustle/app.html#course/${encodeURIComponent(c.course_id)}/overview"><span class="paper-tape" aria-hidden="true"></span><div class="subject-card-top"><span class="course-avatar lilac">${icon('courses')}</span>${icon('arrow')}</div><h3>${esc(c.title)}</h3><p>${UI.countLabel(c.topic_count, 'тема', 'теми', 'тем')}</p></a>`).join('')}</div></section>`;
  }
  function viewSwitch() {
    return `<div class="paper-view-switch" role="group" aria-label="Вигляд календаря"><button data-planner-week="0" aria-pressed="${!week}">Місяць</button><button data-planner-week="1" aria-pressed="${week}">Тиждень і планування</button></div>`;
  }
  function inboxButton() {
    return `<button class="sync-inbox-button" data-live-inbox>${icon('link')} Події з Moodle <b data-live-count hidden></b></button>`;
  }
  function actions() {
    return `<div class="calendar-actions">${inboxButton()}<button class="secondary" data-cal-open-sync>${icon('link')} Синхронізація</button><button class="primary" data-cal-new-event>+ Подія</button></div>`;
  }
  function weekView() {
    return `<div data-paper-week>${editor.shell(courses)}</div>`;
  }
  function mount(hash, month, day, course) {
    const previousHash = context?.hash;
    context = {hash, month, day, course};
    if (hash === 'courses') {
      if (previousHash !== hash) session(true).then(refresh).catch(err => UI.toast(err.message));
      return;
    }
    if (!['plan', 'calendar'].includes(hash) || course) return;
    if (week && hash === 'calendar') {
      const host = main.querySelector('[data-paper-week]');
      if (!host || weekHost === host) return;
      weekHost = host;
      session(true).then(() => {
        if (!host.isConnected) return;
        host.innerHTML = editor.shell(courses);
        host.querySelector('h1').tabIndex = -1;
        host.querySelector('.calendar-header').insertAdjacentHTML('afterend', viewSwitch());
        editor.mount(host, null, courses);
      }).catch(err => showError(err, host));
      return;
    }
    if (period !== month) { calendar = null; loading = null; error = ''; period = month; revision++; }
    paint();
    if (!calendar && !loading && !error) load();
  }
  function showError(err, host) {
    const box = document.createElement('p');
    box.className = 'paper-calendar-status'; box.setAttribute('role', 'alert');
    box.textContent = err.message + ' ';
    const btn = document.createElement('button');
    btn.className = 'text-button'; btn.dataset.liveRetry = ''; btn.textContent = 'Повторити';
    box.append(btn); host.prepend(box);
  }
  async function load(force = false) {
    if (loading && !force) return loading;
    const ticket = ++revision, visibleDays = days(), first = visibleDays[0], last = visibleDays.at(-1);
    error = '';
    const query = new URLSearchParams({start:core.addDays(first,-1)+'T00:00:00Z', end:core.addDays(last,2)+'T00:00:00Z', planner:'month'});
    loading = (async () => {
      try {
        await session();
        const result = await UI.api('/api/calendar/overview?' + query);
        if (ticket !== revision) return;
        result.deadlines = result.deadlines.filter(d => {
          const ymd = dayOf(d.due_at); return ymd >= first && ymd <= last;
        });
        calendar = result;
      } catch (err) { if (ticket === revision) error = err.message; }
      finally { if (ticket === revision) { loading = null; paint(); } }
    })();
    return loading;
  }
  function paint() {
    if (!context || !['calendar','plan'].includes(location.hash.slice(1) || 'plan') || (context.hash === 'calendar' && week)) return;
    const agenda = main.querySelector('.selected-agenda, .mini-agenda');
    if (!agenda) return;
    main.querySelectorAll('[data-live-mark], .paper-calendar-status').forEach(el => el.remove());
    const ready = !!calendar && !error;
    main.querySelectorAll('[data-live-inbox], [data-cal-new-event], [data-cal-open-sync]').forEach(el => { el.disabled = !ready; });
    const count = main.querySelector('[data-live-count]');
    if (count) { count.textContent = pending().length; count.hidden = !pending().length; }
    if (error) { showError(new Error(error), agenda); return; }
    if (!ready) {
      agenda.insertAdjacentHTML('beforeend', '<p class="paper-calendar-status" role="status">Завантажуємо події…</p>');
      return;
    }
    editor.bindMonth(agenda, calendar, courses, context.day, () => load(true));
    const legend = main.querySelector('.calendar-legend');
    if (legend) legend.insertAdjacentHTML('beforeend', '<span data-live-mark><i class="live-dot"></i> Подія календаря</span>');
    const full = context.hash === 'calendar';
    const byDay = new Map(), visibleDays = days();
    for (const ev of calendar.events) {
      const first = dayOf(ev.start_at);
      // Calendar intervals are half-open, including all-day and overnight entries.
      const lastInstant = new Date(Date.parse(ev.end_at) - 1);
      const last = dayOf(lastInstant);
      for (const day of visibleDays) {
        if (first <= day && day <= last) {
          const list = byDay.get(day) || []; list.push(ev); byDay.set(day,list);
        }
      }
    }
    main.querySelectorAll('[data-drop-day]').forEach(cell => {
      const button = cell.querySelector('[data-calendar-date]');
      button.dataset.dayLabel ||= button.getAttribute('aria-label');
      button.setAttribute('aria-label', button.dataset.dayLabel);
      const entries = byDay.get(cell.dataset.dropDay) || [];
      if (!entries.length) return;
      button.querySelector('.calendar-dots').insertAdjacentHTML('beforeend', '<i class="live-dot" data-live-mark></i>');
      button.setAttribute('aria-label', button.dataset.dayLabel + ', подій календаря: ' + entries.length);
      if (full) cell.insertAdjacentHTML('beforeend',entries.map(ev => chip(ev)).join(''));
    });
    const entries = byDay.get(context.day) || [];
    const empty = agenda.querySelector('.agenda-empty');
    if (empty) empty.hidden = !!entries.length;
    if (entries.length) {
      const items = entries.map(ev => row(ev)).join('');
      const target = agenda.querySelector('.agenda-week, :scope > strong');
      target?.insertAdjacentHTML('afterend', items);
    }
    window.HustleDeadlineVisuals.mount(main);
  }
  function chip(ev) {
    return `<button class="calendar-event-chip live-chip" data-live-mark data-cal-event="${esc(ev.event_id)}" ${editable(ev) ? 'draggable="true" data-live-drag' : ''} aria-label="${esc(ev.title)}, ${ev.all_day ? 'весь день' : timeOf(ev.start_at)}"><span>${ev.all_day ? '•' : timeOf(ev.start_at)}</span><strong>${esc(ev.title)}</strong></button>`;
  }
  function row(ev) {
    const dl = calendar.deadlines.find(d => ev.created_by === 'moodle' && d.course_id === ev.course_id && String(d.id) === ev.external_id);
    const due = dl?.due_at || ev.moodle_due_at;
    return `<button class="calendar-agenda-event deadline-surface" data-live-mark data-cal-event="${esc(ev.event_id)}"><span class="calendar-event-time">${ev.all_day ? 'Весь день' : timeOf(ev.start_at)}</span><span class="calendar-event-marker lavender"></span><span class="calendar-agenda-copy"><strong>${esc(ev.title)}</strong><small>${esc(label(ev))}</small></span>${icon('arrow')}${due ? window.HustleDeadlineVisuals.edge(Date.parse(due), ev.status === 'done') : ''}</button>`;
  }
  function review() {
    const list = [...(calendar?.deadlines || [])].sort((a,b) => a.duedate - b.duedate);
    const rows = list.map(d => {
      const key = `${Number(d.course_id)}/${Number(d.id)}`;
      return `<article class="sync-event"><div class="sync-event-copy"><strong>${esc(d.name)}</strong><span>${esc(d.course_name)}</span><time>${esc(UI.date(d.due_at,true))}</time></div><div class="sync-event-actions">${d.review === 'accepted' ? '<span class="sync-status accepted">У календарі</span>' : `<button class="sync-decision sync-yes" data-review-key="${key}" data-choice="accepted" aria-label="Додати: ${esc(d.name)}">${icon('check')}</button>${d.review === 'pending' ? `<button class="sync-decision sync-no" data-review-key="${key}" data-choice="declined" aria-label="Відхилити: ${esc(d.name)}">${icon('close')}</button>` : '<span class="sync-status">Пропущено</span>'}`}</div></article>`;
    }).join('');
    document.querySelector('#dialog-body').innerHTML = `<h2 id="dialog-title">Події з Moodle</h2><div class="sync-events">${rows || '<p>На вибраний період нових дедлайнів немає.</p>'}</div><div class="paper-inbox-footer"><a class="text-button" href="/hustle/connect.html">Підключення Moodle →</a>${H.calendar ? '<button class="text-button" data-open-example-inbox>Події демопростору →</button>' : ''}</div><p class="field-error" role="alert"></p>`;
    if (!dialog.open) dialog.showModal();
  }
  document.addEventListener('click', async event => {
    const el = event.target.closest('button'); if (!el) return;
    if (el.hasAttribute('data-planner-week')) {
      week = el.dataset.plannerWeek === '1';
      if (week) editor.selectWeek(context.day);
      period = ''; revision++; refresh();
    }
    if (el.hasAttribute('data-live-retry')) {
      if (week) { weekHost = null; refresh(); } else await load(true);
    }
    if (el.hasAttribute('data-live-inbox')) review();
    if (el.hasAttribute('data-open-example-inbox')) {
      dialog.close(); H.calendar.openInbox(el);
    }
    if (el.dataset.reviewKey) {
      el.disabled = true;
      try {
        await UI.api('/api/calendar/deadlines/'+el.dataset.reviewKey+'?decision='+el.dataset.choice,{method:'PUT'});
        await load(true);
        if (dialog.open && el.isConnected) review();
      } catch (err) { el.disabled = false; dialog.querySelector('[role="alert"]').textContent = err.message; }
    }
  });
  const dragType = 'application/x-hustle-calendar-event';
  main.addEventListener('dragstart', e => {
    const chip = e.target.closest('[data-live-drag]'); if (chip) e.dataTransfer.setData(dragType,chip.dataset.calEvent);
  });
  main.addEventListener('dragover', e => {
    if (e.dataTransfer.types.includes(dragType) && e.target.closest('[data-drop-day]')) e.preventDefault();
  });
  main.addEventListener('drop', async e => {
    const id = e.dataTransfer.getData(dragType), day = e.target.closest('[data-drop-day]')?.dataset.dropDay;
    const ev = calendar?.events.find(item => item.event_id === id);
    if (!ev || !day || !editable(ev)) return;
    e.preventDefault();
    const start = editor.localInputToUtcIso(day + 'T' + editor.toLocalInput(ev.start_at).slice(-5));
    const end = new Date(Date.parse(start) + Date.parse(ev.end_at) - Date.parse(ev.start_at)).toISOString();
    try {
      await UI.api('/api/calendar/events/' + encodeURIComponent(id), {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({start_at:start,end_at:end})});
      await load(true); UI.toast('Подію перенесено');
    } catch (err) { UI.toast(err.message); }
  });
  window.addEventListener('hashchange', () => { period = ''; });
  window.addEventListener('pageshow', e => { if (e.persisted) { bootstrap = null; period = ''; refresh(); } });
  H.liveCalendar = {standalone, get week() {return week;}, mount, actions, inboxButton, weekView, viewSwitch, coursesView};
})();
