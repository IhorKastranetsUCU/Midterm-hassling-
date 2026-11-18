/* Local event review model. External calendar adapters can use these explicit decisions. */
(() => {
  const H = window.Hustle, C = window.HustleStudy, esc = H.escape, icon = H.icon;
  if (!H.state.registered || !H.state.ready) return;
  const key = 'hustle-calendar-events-v1';
  let data;
  try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch { data = {}; }
  data = { events: [], ...data };
  if (!Array.isArray(data.events)) data.events = [];
  let sourceFilter = 'pending', opener, currentEvent;
  const selected = () => window.HustleCourses.filter(c => H.state.courses.includes(c.id));
  const courseFor = event => window.HustleCourses.find(c => c.id === event.course);
  const dateLabel = day => new Intl.DateTimeFormat('uk-UA', { timeZone: C.zone, day: 'numeric', month: 'long' }).format(new Date(day + 'T12:00:00Z'));
  function persist() { try { localStorage.setItem(key, JSON.stringify(data)); } catch { notify('Не вдалося зберегти зміни календаря.'); } }
  function notify(message) { const toast = document.querySelector('.toast'); toast.textContent = message; toast.hidden = false; setTimeout(() => { if (toast.textContent === message) toast.hidden = true; }, 3500); }
  function events(course) { return data.events.filter(e => H.state.courses.includes(e.course) && e.status === 'accepted' && (!course || e.course === course)); }
  const pending = () => data.events.filter(e => H.state.courses.includes(e.course) && e.status === 'pending');
  function init(anchor) {
    const schedules = { algebra: [1, '16:00'], probability: [2, '12:00'], english: [2, '18:00'] };
    selected().forEach(c => {
      const id = `lms-${c.id}-${anchor}`;
      if (data.events.some(e => e.id === id)) return;
      const [days, time] = schedules[c.id] || [3, '16:00'], day = C.addDays(anchor, days);
      data.events.push({ id, course: c.id, title: c.deadline, day, time, originalDay: day, originalTime: time, status: 'pending', source: 'LMS', updatedAt: Date.now(), history: [] });
    });
    persist();
  }
  function showDialog(id, trigger) {
    opener = trigger || document.activeElement;
    document.getElementById(id).showModal();
  }
  function restoreFocus() {
    if (document.querySelector('dialog[open]')) return;
    const id = opener?.dataset?.calendarEvent;
    const target = id ? document.querySelector(`[data-calendar-event="${id}"]`) : opener?.hasAttribute('data-sync-inbox') ? document.querySelector('[data-sync-inbox]') : null;
    (target || document.querySelector('[data-calendar-date][aria-pressed="true"]') || document.querySelector('#workspace-main h1'))?.focus({ preventScroll: true });
  }
  function closeDialog(dialog) { dialog.close(); }
  function reviewRows() {
    const list = data.events.filter(e => H.state.courses.includes(e.course) && (sourceFilter === 'all' || e.status === 'pending'))
      .sort((a, b) => a.originalDay.localeCompare(b.originalDay) || a.originalTime.localeCompare(b.originalTime));
    return list.length ? list.map(e => {
      const course = courseFor(e), status = { accepted: 'Додано', declined: 'Відхилено', removed: 'Прибрано', pending: 'Нова подія' }[e.status];
      return `<article class="sync-event ${e.status === 'accepted' ? 'sync-accepted' : ''}"><span class="course-avatar ${course.color}">${esc(course.initials)}</span><div class="sync-event-copy"><strong>${esc(e.title)}</strong><span>${esc(course.name)}</span><time>${dateLabel(e.originalDay)} · ${e.originalTime}</time></div><div class="sync-event-actions">${e.status === 'pending' ? `<button class="sync-decision sync-yes" data-sync-accept="${e.id}" aria-label="Додати в календар: ${esc(e.title)}, ${esc(course.short)}">${icon('check')}</button><button class="sync-decision sync-no" data-sync-decline="${e.id}" aria-label="Відхилити: ${esc(e.title)}, ${esc(course.short)}">${icon('close')}</button>` : `<span class="sync-status ${e.status}">${status}</span>${e.status !== 'accepted' ? `<button class="sync-restore" data-sync-accept="${e.id}">Додати</button>` : `<button class="icon-button" data-calendar-event="${e.id}" aria-label="Відкрити подію: ${esc(e.title)}">${icon('arrow')}</button>`}`}</div></article>`;
    }).join('') : '<div class="sync-empty"><span>✓</span><h3>Усі події переглянуто</h3><button class="secondary" data-sync-filter="all">Показати всі події</button></div>';
  }
  function updateInbox() {
    const body = document.querySelector('#calendar-sync-body'); if (!body) return;
    body.innerHTML = `<div class="sync-dialog-heading"><span class="sync-source-icon">${icon('link')}</span><div><h2 id="calendar-sync-title">Події з LMS</h2><p>Обери, що додати до свого календаря.</p></div></div><div class="sync-toolbar"><div class="sync-filters" role="group" aria-label="Фільтр подій"><button data-sync-filter="pending" aria-pressed="${sourceFilter === 'pending'}">Нові <b>${pending().length}</b></button><button data-sync-filter="all" aria-pressed="${sourceFilter === 'all'}">Усі події</button></div>${pending().length ? '<button class="sync-add-all" data-sync-all>Додати всі ✓</button>' : ''}</div><div class="sync-events">${reviewRows()}</div><div class="sync-dialog-bottom"><a class="primary" href="#calendar" data-sync-open-calendar>Відкрити календар ${icon('arrow')}</a><span>${events().length} подій у календарі</span></div>`;
  }
  function openInbox(trigger) { sourceFilter = 'pending'; updateInbox(); showDialog('calendar-sync-dialog', trigger); }
  function openEvent(id, trigger) {
    const e = data.events.find(e => e.id === id); if (!e) return;
    if (document.querySelector('#calendar-sync-dialog')?.open) document.querySelector('#calendar-sync-dialog').close();
    currentEvent = id;
    const c = courseFor(e);
    document.querySelector('#calendar-event-body').innerHTML = `<div class="event-course">${icon('link')} ${esc(c.name)}</div><h2 id="calendar-event-title">${esc(e.title)}</h2><p class="event-original">Дедлайн LMS: ${dateLabel(e.originalDay)} · ${e.originalTime}</p><form id="calendar-event-form"><div class="event-date-fields"><label>Дата у календарі<input type="date" name="day" value="${e.day}" min="2000-01-01" max="2100-12-31" required></label><label>Час<input type="time" name="time" value="${e.time}" required></label></div><p class="event-validation" role="alert" hidden></p><div class="event-dialog-actions"><button class="primary" type="submit">Зберегти ${icon('check')}</button><button class="event-remove" type="button" data-event-remove="${e.id}">Прибрати з календаря</button></div></form>`;
    showDialog('calendar-event-dialog', trigger);
  }
  function setStatus(e, status) { e.history.push({ status: e.status, day: e.day, time: e.time, at: e.updatedAt }); e.status = status; e.updatedAt = Date.now(); }
  function button() { return `<button class="sync-inbox-button" data-sync-inbox>${icon('link')} Події з LMS ${pending().length ? `<b>${pending().length}</b>` : icon('check')}</button>`; }
  function chips(day, course) { return events(course).filter(e => e.day === day).map(e => `<button class="calendar-event-chip ${courseFor(e).color}" data-calendar-event="${e.id}" draggable="true" data-event-drag="${e.id}" aria-label="${esc(e.title)}, ${esc(courseFor(e).short)}, ${e.time}. Відкрити подію"><span>${e.time}</span><strong>${esc(e.title)}</strong></button>`).join(''); }
  function agenda(day, course, planDone, showFire) {
    return events(course).filter(e => e.day === day).sort((a, b) => a.time.localeCompare(b.time)).map(e => {
      const [hour, minute] = e.originalTime.split(':').map(Number);
      const due = C.deadline(e.originalDay, hour) + minute * 60000;
      const done = planDone(e.course);
      const fire = showFire ? window.HustleDeadlineVisuals.edge(due, done) : '';
      const remaining = C.deadlineRemaining(due);
      const countdown = showFire && !done ? `<strong class="deadline-countdown" data-deadline-countdown="${due}" ${remaining ? '' : 'hidden'}>${remaining}</strong>` : '';
      const sourceDate = showFire && (e.day !== e.originalDay || e.time !== e.originalTime)
        ? `<small>Дедлайн LMS · ${dateLabel(e.originalDay)} · ${e.originalTime}</small>` : '';
      return `<button class="calendar-agenda-event deadline-surface" data-calendar-event="${e.id}"><span class="calendar-event-time">${e.time}</span><span class="calendar-event-marker ${courseFor(e).color}"></span><span class="calendar-agenda-copy"><strong>${esc(e.title)}</strong><small>${esc(courseFor(e).name)}</small>${sourceDate}${countdown}</span>${icon('arrow')}${fire}</button>`;
    }).join('');
  }
  function moveEvent(id, day) { const e = data.events.find(e => e.id === id && e.status === 'accepted'); if (!e || e.day === day) return; e.history.push({ status: e.status, day: e.day, time: e.time, at: e.updatedAt }); e.day = day; e.updatedAt = Date.now(); persist(); H.dashboardRefresh?.(); notify(`Подію перенесено на ${dateLabel(day)}`); }
  H.calendar = { init, events, pending, button, chips, agenda };
  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', `<dialog id="calendar-sync-dialog" class="calendar-sync-dialog" aria-labelledby="calendar-sync-title"><button class="icon-button dialog-close" data-sync-close aria-label="Закрити події LMS">${icon('close')}</button><div id="calendar-sync-body"></div></dialog><dialog id="calendar-event-dialog" class="calendar-event-dialog" aria-labelledby="calendar-event-title"><button class="icon-button dialog-close" data-sync-close aria-label="Закрити подію">${icon('close')}</button><div id="calendar-event-body"></div></dialog>`);
    document.querySelectorAll('.calendar-sync-dialog,.calendar-event-dialog').forEach(dialog => {
      dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(dialog); });
      dialog.addEventListener('close', () => { H.dashboardRefresh?.(); restoreFocus(); });
    });
  });
  document.addEventListener('click', event => {
    const el = event.target.closest('button,a'); if (!el) return;
    if (el.hasAttribute('data-sync-inbox')) openInbox(el);
    if (el.hasAttribute('data-sync-close')) closeDialog(el.closest('dialog'));
    if (el.hasAttribute('data-sync-filter')) { sourceFilter = el.dataset.syncFilter; updateInbox(); document.querySelector(`[data-sync-filter="${sourceFilter}"]`)?.focus(); }
    if (el.hasAttribute('data-sync-accept') || el.hasAttribute('data-sync-decline')) {
      const id = el.dataset.syncAccept || el.dataset.syncDecline, e = data.events.find(e => e.id === id); if (!e) return;
      setStatus(e, el.hasAttribute('data-sync-accept') ? 'accepted' : 'declined'); persist(); updateInbox();
      document.querySelector('.sync-event-actions button, [data-sync-filter="pending"]')?.focus(); H.dashboardRefresh?.();
      notify(e.status === 'accepted' ? 'Подію додано в календар' : 'Подію відхилено');
    }
    if (el.hasAttribute('data-sync-all')) { pending().forEach(e => setStatus(e, 'accepted')); persist(); updateInbox(); H.dashboardRefresh?.(); document.querySelector('[data-sync-open-calendar]')?.focus(); notify('Нові події додано в календар'); }
    if (el.hasAttribute('data-calendar-event')) openEvent(el.dataset.calendarEvent, el);
    if (el.hasAttribute('data-sync-open-calendar')) closeDialog(document.querySelector('#calendar-sync-dialog'));
    if (el.hasAttribute('data-event-remove')) { const e = data.events.find(e => e.id === el.dataset.eventRemove); if (!e) return; setStatus(e, 'removed'); persist(); closeDialog(document.querySelector('#calendar-event-dialog')); notify('Подію прибрано. Повернути її можна у «Події з LMS».'); }
  });
  document.addEventListener('submit', event => {
    if (event.target.id !== 'calendar-event-form') return;
    event.preventDefault(); const form = event.target, e = data.events.find(e => e.id === currentEvent), day = form.elements.day.value, time = form.elements.time.value;
    if (!form.reportValidity() || !e) return;
    e.history.push({ status: e.status, day: e.day, time: e.time, at: e.updatedAt }); e.day = day; e.time = time; e.updatedAt = Date.now(); persist(); closeDialog(form.closest('dialog')); notify('Подію збережено');
  });
  let draggedId;
  document.addEventListener('dragstart', e => { const el = e.target.closest('[data-event-drag]'); if (!el) return; draggedId = el.dataset.eventDrag; e.dataTransfer.setData('text/plain', draggedId); e.dataTransfer.effectAllowed = 'move'; });
  document.addEventListener('dragover', e => { if (!draggedId) return; const cell = e.target.closest('[data-drop-day]'); if (cell) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; cell.classList.add('drag-over'); } });
  document.addEventListener('dragleave', e => { const cell = e.target.closest('[data-drop-day]'); if (cell && !cell.contains(e.relatedTarget)) cell.classList.remove('drag-over'); });
  document.addEventListener('drop', e => { const cell = e.target.closest('[data-drop-day]'); if (cell && draggedId) { e.preventDefault(); moveEvent(draggedId, cell.dataset.dropDay); } draggedId = null; document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); });
  document.addEventListener('dragend', () => { draggedId = null; document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); });
  window.addEventListener('storage', e => { if (e.key !== key || !e.newValue) return; try { data = JSON.parse(e.newValue); H.dashboardRefresh?.(); } catch {} });
})();
