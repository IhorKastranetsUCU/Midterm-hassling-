/* The paper planner and the weekly workspace share a cookie, calendar API and event editor. */
(() => {
  const H = window.Hustle, core = window.HustleStudy;
  const standalone = !H.workspace && (!H.state.registered || !H.state.ready || !H.state.courses.length);
  if (standalone && !['#calendar', '#oral'].includes(location.hash)) return;
  const {escape: esc, icon} = H;
  const editor = window.HustleCalendar;
  const main = document.querySelector('#workspace-main');
  const dialog = document.querySelector('#study-dialog');
  let calendar, courses = [], context, bootstrap, sessionRequest, week = false, revision = 0;
  let period = '', loading, error = '', weekHost;
  let acceptedDeadlines = new Set(), reviewVersion = 0;
  const pendingDeadlineChanges = new Map();
  const days = () => core.monthDays(context.month);
  const zone = () => calendar?.settings.timezone || core.zone;
  const monthPreviewLimit = 2;
  let formatZone, dateFormat, timeFormat;
  function useTimeZone(tz) {
    if (dateFormat && formatZone === tz) return;
    dateFormat = new Intl.DateTimeFormat('en-CA', {timeZone:tz, year:'numeric', month:'2-digit', day:'2-digit'});
    timeFormat = new Intl.DateTimeFormat('uk-UA', {timeZone:tz, hour:'2-digit', minute:'2-digit'});
    formatZone = tz;
  }
  const dayOf = value => { useTimeZone(zone()); return dateFormat.format(new Date(value)); };
  const timeOf = value => { useTimeZone(zone()); return timeFormat.format(new Date(value)); };
  const label = ev => ev.created_by === 'moodle' ? 'Дедлайн Moodle' : ({google:'Google Calendar', ics:'iCal', ai_study:'Навчання', manual:'Моя подія'})[ev.source_type] || 'Подія';
  const editable = ev => ['ai_study', 'manual'].includes(ev.source_type);
  const refresh = () => H.dashboardRefresh?.();
  const pending = () => calendar?.deadlines.filter(d => d.review === 'pending') || [];
  function session(revalidate = false) {
    // Other tabs can import a course. Serialize the first request that issues a guest cookie.
    if (sessionRequest) return sessionRequest;
    if (bootstrap && !revalidate) return bootstrap;
    bootstrap = UI.api('/api/workspace/session').then(owner => {
      if (H.account && owner.owner_id !== H.account.owner) { location.reload(); return []; }
      return UI.api('/api/workspace/courses?moodle_only=true');
    })
      .then(result => { courses = result; H.workspace?.updateCourses(result); }).catch(err => { bootstrap = null; throw err; });
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
  function deadlineButton(task) {
    if (!task.calendarKey) return '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button deadline-calendar-button';
    button.dataset.deadlineCalendar = task.calendarKey;
    button.dataset.deadlineTitle = task.title;
    paintDeadlineButton(button);
    return button.outerHTML;
  }
  function paintDeadlineButton(button) {
    const key = button.dataset.deadlineCalendar;
    const added = acceptedDeadlines.has(key);
    const saving = pendingDeadlineChanges.has(key);
    const label = saving
      ? pendingDeadlineChanges.get(key) ? 'Додаємо в календар…' : 'Прибираємо з календаря…'
      : added ? 'Прибрати з календаря' : 'Додати в календар';
    button.setAttribute('aria-label', label + ': ' + button.dataset.deadlineTitle);
    button.setAttribute('aria-disabled', String(saving));
    button.setAttribute('aria-busy', String(saving));
    button.toggleAttribute('data-calendar-added', added);
    button.title = label;
    button.innerHTML = icon(added ? 'close' : 'calendar');
  }
  function paintDeadlineButtons() {
    main.querySelectorAll('[data-deadline-calendar]').forEach(paintDeadlineButton);
  }
  async function refreshDeadlineReviews() {
    const ticket = ++reviewVersion;
    try {
      const result = await UI.api('/api/calendar/deadlines/reviews');
      if (ticket !== reviewVersion) return;
      acceptedDeadlines = new Set(result.accepted);
      paintDeadlineButtons();
    } catch {
      // Adding remains safe when the read fails because the API accepts duplicate requests.
    }
  }
  function mount(hash, month, day, course) {
    const previousHash = context?.hash;
    context = {hash, month, day, course};
    if (previousHash !== hash && (hash === 'plan' || hash === 'deadlines' || course?.connected)) refreshDeadlineReviews();
    if (hash === 'courses') {
      if (previousHash !== hash) session(true).then(refresh).catch(err => UI.toast(err.message));
      return;
    }
    if (!['plan', 'calendar'].includes(hash) && !course?.connected) return;
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
    if (!context || (!['calendar','plan'].includes(location.hash.slice(1) || 'plan') && !context.course?.connected) || (context.hash === 'calendar' && week)) return;
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
      if (context.course && String(ev.course_id) !== context.course.id) continue;
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
      if (full) button.tabIndex = cell.dataset.dropDay === context.day ? 0 : -1;
      button.dataset.dayLabel ||= button.getAttribute('aria-label');
      button.setAttribute('aria-label', button.dataset.dayLabel);
      const entries = byDay.get(cell.dataset.dropDay) || [];
      if (!entries.length) return;
      const dots = button.querySelector('.calendar-dots');
      if (entries.some(ev => ev.created_by === 'moodle') && !dots.querySelector('.deadline-dot')) {
        dots.insertAdjacentHTML('beforeend', '<i class="deadline-dot" data-live-mark></i>');
      }
      if (entries.some(ev => ev.created_by !== 'moodle')) dots.insertAdjacentHTML('beforeend', '<i class="live-dot" data-live-mark></i>');
      button.setAttribute('aria-label', button.dataset.dayLabel + ', подій календаря: ' + entries.length);
      if (!full) return;
      dots.insertAdjacentHTML('beforeend', `<span class="month-day-count" data-live-mark>${entries.length}</span>`);
      cell.insertAdjacentHTML('beforeend', entries.slice(0, monthPreviewLimit).map(ev => chip(ev, cell.dataset.dropDay)).join(''));
      const extra = entries.length - monthPreviewLimit;
      if (extra > 0) {
        cell.insertAdjacentHTML('beforeend', `<button class="month-more" data-live-mark data-day-agenda="${cell.dataset.dropDay}" tabindex="${button.tabIndex}"
          aria-label="Показати всі події за ${esc(button.dataset.dayLabel)}">Ще ${extra}</button>`);
      }
    });
    const entries = byDay.get(context.day) || [];
    const empty = agenda.querySelector('.agenda-empty');
    if (empty) empty.hidden = !!entries.length;
    if (entries.length) {
      const items = entries.map(ev => row(ev)).join('');
      const target = agenda.querySelector('.agenda-week, :scope > strong');
      if (full) {
        const summary = UI.countLabel(entries.length, 'подія', 'події', 'подій');
        agenda.querySelector('.panel-title > span')?.insertAdjacentHTML('afterbegin', `<span data-live-mark>${summary} · </span>`);
        target?.insertAdjacentHTML('afterend', `<div class="paper-day-events" data-live-mark role="group" aria-label="Події вибраного дня">${items}</div>`);
      } else target?.insertAdjacentHTML('afterend', items);
    }
    if (full) agenda.querySelector('.panel-title').insertAdjacentHTML('beforeend', '<button class="month-return" data-live-mark data-month-return>↑ До місяця</button>');
    window.HustleDeadlineVisuals.mount(main);
  }
  const eventKind = ev => ev.created_by === 'moodle' ? 'deadline' : ev.source_type;
  const dragAttrs = ev => editable(ev) ? 'draggable="true" data-live-drag' : '';
  function startLabel(ev, day) {
    if (ev.all_day) return 'Весь день';
    return dayOf(ev.start_at) < day ? 'Триває' : timeOf(ev.start_at);
  }
  function chip(ev, day) {
    const start = startLabel(ev, day);
    return `<button class="calendar-event-chip live-chip" tabindex="${day === context.day ? 0 : -1}" data-live-mark data-kind="${esc(eventKind(ev))}" data-cal-event="${esc(ev.event_id)}" ${dragAttrs(ev)} title="${esc(ev.title)}" aria-label="${esc(ev.title)}, ${start}"><span>${ev.all_day ? '•' : start}</span><strong>${esc(ev.title)}</strong></button>`;
  }
  function row(ev) {
    const dl = calendar.deadlines.find(d => ev.created_by === 'moodle' && d.course_id === ev.course_id && String(d.id) === ev.external_id);
    const due = dl?.due_at || ev.moodle_due_at;
    const end = context.hash === 'calendar' && !ev.all_day && dayOf(ev.end_at) === context.day && ev.end_at !== ev.start_at
      ? '<small>до ' + timeOf(ev.end_at) + '</small>' : '';
    return `<button class="calendar-agenda-event deadline-surface" data-live-mark data-kind="${esc(eventKind(ev))}" data-cal-event="${esc(ev.event_id)}" ${dragAttrs(ev)}><span class="calendar-event-time">${startLabel(ev, context.day)}${end}</span><span class="calendar-event-marker lavender"></span><span class="calendar-agenda-copy"><strong>${esc(ev.title)}</strong><small>${esc(label(ev))}</small></span>${icon('arrow')}${due ? window.HustleDeadlineVisuals.edge(Date.parse(due), ev.status === 'done') : ''}</button>`;
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
  let eventFocus;
  dialog.addEventListener('close', () => {
    const origin = eventFocus;
    eventFocus = null;
    if (!origin) return;
    // The planner renders again on close. Restore the position in the new day list.
    requestAnimationFrame(() => {
      if (location.hash !== '#calendar' || dialog.open) return;
      if (origin.week) { origin.trigger.focus(); return; }
      if (week) return;
      const list = main.querySelector('.paper-day-events');
      if (list) list.scrollTop = origin.scroll;
      const target = main.querySelector(origin.selector) || main.querySelector('.calendar-day[aria-pressed="true"]');
      target?.focus();
    });
  });
  document.addEventListener('click', async event => {
    const el = event.target.closest('button'); if (!el) return;
    const deadlineKey = el.dataset.deadlineCalendar;
    if (deadlineKey) {
      if (pendingDeadlineChanges.has(deadlineKey)) return;
      const add = !acceptedDeadlines.has(deadlineKey);
      pendingDeadlineChanges.set(deadlineKey, add);
      paintDeadlineButtons();
      try {
        if (add) {
          await UI.api('/api/calendar/deadlines/' + deadlineKey + '?decision=accepted', {method:'PUT'});
          acceptedDeadlines.add(deadlineKey);
        } else {
          const eventId = 'moodle-' + deadlineKey.replace('/', '-');
          await UI.api('/api/calendar/events/' + encodeURIComponent(eventId), {method:'DELETE'});
          acceptedDeadlines.delete(deadlineKey);
        }
        reviewVersion++;
        UI.toast(add ? 'Дедлайн додано в календар' : 'Дедлайн прибрано з календаря');
        if (main.querySelector('.selected-agenda, .mini-agenda')) load(true);
      } catch (err) {
        UI.toast(err.message);
        refreshDeadlineReviews();
      } finally {
        pendingDeadlineChanges.delete(deadlineKey);
        paintDeadlineButtons();
      }
      return;
    }
    if (el.dataset.calEvent && el.closest('.calendar-week-grid')) eventFocus = {week:true, trigger:el};
    if (el.dataset.calEvent && el.closest('.planner-spread')) {
      const inAgenda = !!el.closest('.paper-day-events');
      const parentSelector = inAgenda ? '.paper-day-events' : `[data-drop-day="${el.closest('[data-drop-day]').dataset.dropDay}"]`;
      eventFocus = {selector: parentSelector + ' [data-cal-event="' + CSS.escape(el.dataset.calEvent) + '"]',
        scroll: main.querySelector('.paper-day-events')?.scrollTop || 0};
    }
    if (el.hasAttribute('data-month-return')) {
      const date = main.querySelector('.calendar-grid .calendar-day[aria-pressed="true"]');
      date?.focus({preventScroll:true}); date?.scrollIntoView({block:'center'});
      return;
    }
    if (el.dataset.dayAgenda) {
      main.querySelector(`[data-drop-day="${el.dataset.dayAgenda}"] .calendar-day`)?.click();
    }
    if (el.dataset.dayAgenda || (el.matches('.calendar-day') && context?.hash === 'calendar' && matchMedia('(max-width:40rem)').matches)) {
      const heading = main.querySelector('.selected-agenda h2');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({preventScroll:true});
        heading.scrollIntoView({block: matchMedia('(max-width:70rem)').matches ? 'start' : 'nearest'});
      }
      return;
    }
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
        refreshDeadlineReviews();
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
  H.liveCalendar = {standalone, get week() {return week;}, mount, actions, inboxButton, weekView, viewSwitch, coursesView, deadlineButton};
})();
