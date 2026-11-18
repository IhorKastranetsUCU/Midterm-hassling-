/* Calendar workspace: Google Calendar / .ics sync, sleep & forbidden hours, AI scheduling. */
(() => {
  const {escape: esc, icon} = UI;
  const dialog = document.querySelector('#study-dialog');
  const body = document.querySelector('#dialog-body');
  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  let state = null;
  let weekOffset = 0;
  function selectWeek(day) {
    weekOffset = Math.floor((Date.parse(day + 'T12:00:00Z') - Date.parse(mondayKey(0) + 'T12:00:00Z')) / 604800000);
  }
  let requestNumber = 0;

  function courseBase() { return window.Hustle?.liveCalendar ? '/hustle/app.html' : ''; }

  function tz() {
    return state?.data?.settings?.timezone || 'Europe/Kyiv';
  }

  function dayKey(isoOrDate) {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    return new Intl.DateTimeFormat('en-CA', {timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit'}).format(d);
  }

  function fmtTime(iso) {
    return new Intl.DateTimeFormat('uk-UA', {timeZone: tz(), hour: '2-digit', minute: '2-digit'}).format(new Date(iso));
  }

  function fmtDayHead(ymd) {
    const d = new Date(ymd + 'T12:00:00Z');
    return new Intl.DateTimeFormat('uk-UA', {timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short'}).format(d);
  }

  function toLocalInput(iso) {
    const d = new Date(iso);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
  }

  function localInputToUtcIso(value) {
    // Interpret naive YYYY-MM-DDTHH:MM in Europe/Kyiv or browser timezone cleanly via offset probe.
    const raw = String(value || '').trim();
    if (!raw) return null;
    const probe = new Date(raw + ':00Z');
    const inTz = new Date(probe.toLocaleString('en-US', {timeZone: tz()}));
    const inUtc = new Date(probe.toLocaleString('en-US', {timeZone: 'UTC'}));
    const offsetMs = inTz.getTime() - inUtc.getTime();
    return new Date(probe.getTime() - offsetMs).toISOString();
  }

  function mondayKey(offsetWeeks = 0) {
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', {timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
    const noon = new Date(todayStr + 'T12:00:00Z');
    const wd = (noon.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    noon.setUTCDate(noon.getUTCDate() - wd + offsetWeeks * 7);
    return noon.toISOString().slice(0, 10);
  }

  function weekDates(startYmd) {
    const base = new Date(startYmd + 'T12:00:00Z');
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  function showModal(title, html) {
    body.innerHTML = `<h2 id="dialog-title">${esc(title)}</h2>${html}<p id="dialog-error" class="field-error" role="alert" hidden></p>`;
    if (!dialog.open) dialog.showModal();
  }

  function modalError(message) {
    const el = body.querySelector('#dialog-error');
    if (el) { el.textContent = message; el.hidden = !message; }
  }

  function shell(courses = []) {
    const mon = mondayKey(weekOffset);
    const days = weekDates(mon);
    const rangeLabel = `${fmtDayHead(days[0])} — ${fmtDayHead(days[6])}`;
    const courseOptions = courses.map(c => `<option value="${c.course_id}">${esc(c.title)}</option>`).join('');
    return `<div class="calendar-page" data-calendar-root>
      <header class="calendar-header">
        <div>
          <h1>Календар</h1>
          <p class="calendar-range-label" data-cal-range>${esc(rangeLabel)}</p>
        </div>
        <div class="calendar-actions">
          <button type="button" class="secondary" data-cal-open-rules>${icon('clock')} Сон і правила</button>
          <button type="button" class="secondary" data-cal-open-sync>${icon('link')} Синхронізація</button>
          <button type="button" class="primary" data-cal-new-event>+ Подія</button>
        </div>
      </header>

      <div class="calendar-toolbar">
        <div class="calendar-nav-group">
          ${window.Hustle?.liveCalendar ? '' : '<a class="secondary" href="/prototype/app.html#calendar">Місяць</a>'}
          <button type="button" class="secondary" data-cal-week="-1" aria-label="Попередній тиждень">←</button>
          <button type="button" class="secondary" data-cal-today>Сьогодні</button>
          <button type="button" class="secondary" data-cal-week="1" aria-label="Наступний тиждень">→</button>
          <button type="button" class="text-button" data-cal-sync-now>Оновити ↻</button>
        </div>
        <div class="calendar-legend" aria-label="Позначення">
          <span class="legend-chip"><i class="legend-dot ai"></i> Навчання (ШІ)</span>
          <span class="legend-chip"><i class="legend-dot sync"></i> Синхронізовано</span>
          <span class="legend-chip"><i class="legend-dot deadline"></i> Дедлайн Moodle</span>
          <span class="legend-chip"><i class="legend-dot forbidden"></i> Сон / заборонено</span>
        </div>
      </div>

      <section class="calendar-ai-card" aria-label="ШІ-планувальник календаря">
        <div class="calendar-ai-top">
          <h2>Запланувати навчання з ШІ</h2>
          <button type="button" class="text-button" data-cal-auto-week>Розпланувати підготовку на тиждень →</button>
        </div>
        <form class="calendar-ai-form" data-cal-ai-form>
          <input type="text" name="prompt" maxlength="400" placeholder="Наприклад: Приділи 1 годину курсу Основи національного спротиву завтра ввечері">
          <button type="submit" class="primary">Додати в календар →</button>
        </form>
        ${courses.length ? `<form class="calendar-quick-row" data-cal-quick-form>
          <span>Швидке бронювання вільного вікна:</span>
          <select name="duration" aria-label="Тривалість">
            <option value="30">30 хв</option>
            <option value="60" selected>1 година</option>
            <option value="90">1.5 години</option>
            <option value="120">2 години</option>
          </select>
          <select name="course_id" aria-label="Курс">${courseOptions}</select>
          <select name="part" aria-label="Час доби">
            <option value="">Найближче вільне</option>
            <option value="morning">Ранок</option>
            <option value="afternoon">День</option>
            <option value="evening">Вечір</option>
          </select>
          <button type="submit" class="secondary">Приділити час</button>
        </form>` : ''}
        <div class="calendar-ai-feedback" data-cal-ai-feedback hidden></div>
      </section>

      <div data-cal-grid role="region" aria-live="polite">
        <p class="muted" role="status">Завантажуємо календар…</p>
      </div>
    </div>`;
  }

  function renderGrid() {
    if (!state?.root?.isConnected || !state.data) return;
    const {data, courses} = state;
    const days = weekDates(state.startYmd);
    state.root.querySelector('[data-cal-range]').textContent = `${fmtDayHead(days[0])} — ${fmtDayHead(days[6])}`;
    const todayYmd = dayKey(new Date());
    const courseMap = new Map(courses.map(c => [String(c.course_id), c.title]));

    const expandedDays = new Set([...state.root.querySelectorAll('[data-week-overflow][open]')].map(el => el.dataset.weekOverflow));
    const previewLimit = 3;
    const gridHtml = `<div class="calendar-week-grid">${days.map(ymd => {
      const dayEvents = (data.events || []).filter(ev => dayKey(ev.start_at) <= ymd && dayKey(new Date(Date.parse(ev.end_at) - 1)) >= ymd);
      const dayDeadlines = (data.deadlines || []).filter(dl => (dl.review || 'pending') === 'pending' && !window.Hustle?.liveCalendar && dayKey(dl.due_at) === ymd);
      const dayForbidden = (data.forbidden_blocks || []).filter(fb => dayKey(fb.start_at) === ymd || dayKey(fb.end_at) === ymd);

      const forbiddenNote = dayForbidden.length
        ? `<div class="calendar-day-forbidden" title="ШІ не планує навчання на цей час">${dayForbidden.slice(0, 2).map(fb => `${esc(fb.label)}: ${dayKey(fb.start_at) === ymd ? fmtTime(fb.start_at) : '00:00'}–${dayKey(fb.end_at) === ymd ? fmtTime(fb.end_at) : '24:00'}`).join('; ')}</div>`
        : '';

      const items = [
        ...dayEvents.map(ev => ({sort: ev.start_at, kind: 'event', ev})),
        ...dayDeadlines.map(dl => ({sort: dl.due_at, kind: 'deadline', dl})),
      ].sort((a, b) => a.sort.localeCompare(b.sort));

      const cards = items.map(entry => {
        if (entry.kind === 'deadline') {
          const dl = entry.dl;
          return `<article class="cal-item type-deadline">
            <div class="cal-item-top"><span>до ${esc(fmtTime(dl.due_at))}</span><span class="cal-item-badge">Дедлайн</span></div>
            <a class="cal-item-title" href="${courseBase()}#course/${encodeURIComponent(dl.course_id)}/assignments">${esc(dl.name)}</a>
            ${dl.course_name ? `<div class="cal-item-desc">${esc(dl.course_name)}</div>` : ''}
          </article>`;
        }
        const ev = entry.ev;
        const label = ev.created_by === 'moodle' ? 'Дедлайн Moodle' : ev.source_type === 'ai_study' ? 'ШІ · Навчання' : ev.source_type === 'google' ? 'Google' : ev.source_type === 'ics' ? 'iCal' : 'Подія';
        const isEditable = ev.source_type === 'ai_study' || ev.source_type === 'manual';
        const courseHref = ev.course_id ? `${courseBase()}#course/${encodeURIComponent(ev.course_id)}/overview` : '';
        const cTitle = ev.course_id ? courseMap.get(String(ev.course_id)) : '';
        return `<article class="cal-item ${ev.created_by === 'moodle' ? 'type-deadline deadline-surface' : ''} type-${esc(ev.source_type)} ${ev.status === 'done' ? 'is-done' : ''}" data-event-id="${esc(ev.event_id)}">
          <div class="cal-item-top"><span>${ev.all_day ? 'Весь день' : `${esc(fmtTime(ev.start_at))}–${esc(fmtTime(ev.end_at))}`}</span><button type="button" class="cal-item-badge cal-detail-button" data-cal-event="${esc(ev.event_id)}" aria-label="Деталі події «${esc(ev.title)}»">${esc(label)}</button></div>
          ${courseHref ? `<a class="cal-item-title" href="${courseHref}">${esc(ev.title)}</a>` : `<div class="cal-item-title">${esc(ev.title)}</div>`}
          ${cTitle && !ev.title.includes(cTitle) ? `<div class="cal-item-desc">${esc(cTitle)}</div>` : ''}
          ${ev.description && ev.description.trim() !== ev.title.trim() ? `<div class="cal-item-desc">${esc(ev.description)}</div>` : ''}
          ${isEditable ? `<div class="cal-item-controls">
            <button type="button" class="cal-mini-btn" data-cal-event="${esc(ev.event_id)}">Редагувати</button>
            <button type="button" class="cal-mini-btn" data-ev-toggle="${esc(ev.event_id)}" data-status="${ev.status === 'done' ? 'planned' : 'done'}">${ev.status === 'done' ? '↩ Повернути' : '✓ Виконано'}</button>
            <button type="button" class="cal-mini-btn" data-ev-delete="${esc(ev.event_id)}" aria-label="Видалити">✕</button>
          </div>` : ''}
          ${ev.moodle_due_at && window.HustleDeadlineVisuals ? HustleDeadlineVisuals.edge(Date.parse(ev.moodle_due_at),ev.status === 'done') : ''}
        </article>`;
      });
      const extra = cards.length - previewLimit;
      const cardsHtml = extra > 0 ? cards.slice(0, previewLimit).join('') +
        `<details class="week-overflow" data-week-overflow="${ymd}" ${expandedDays.has(ymd) ? 'open' : ''}>
          <summary><span class="week-show">Ще ${UI.countLabel(extra, 'подія', 'події', 'подій')}</span><span class="week-hide">Згорнути</span></summary>
          <div class="week-extra-list">${cards.slice(previewLimit).join('')}</div>
        </details>` : cards.join('');

      return `<section class="calendar-day-col ${ymd === todayYmd ? 'is-today' : ''}">
        <header class="calendar-day-head"><strong>${esc(fmtDayHead(ymd))}</strong><span>${items.length ? UI.countLabel(items.length, 'подія', 'події', 'подій') : 'Вільно'}</span></header>
        ${forbiddenNote}
        <div class="calendar-day-items">${cardsHtml || '<p class="calendar-empty-day">Подій немає</p>'}</div>
      </section>`;
    }).join('')}</div>`;

    state.root.querySelector('[data-cal-grid]').innerHTML = gridHtml;
    window.HustleDeadlineVisuals?.mount(state.root);
  }

  async function loadOverview() {
    if (!state?.root?.isConnected) return;
    if (state.paperReload) return state.paperReload();
    const request = ++requestNumber, active = state;
    const startYmd = mondayKey(weekOffset);
    state.startYmd = startYmd;
    const startUtc = localInputToUtcIso(startYmd + 'T00:00');
    const endDate = new Date(startYmd + 'T12:00:00Z');
    endDate.setUTCDate(endDate.getUTCDate() + 7);
    const endUtc = localInputToUtcIso(endDate.toISOString().slice(0, 10) + 'T00:00');

    const grid = state.root.querySelector('[data-cal-grid]');
    try {
      const data = await UI.api(`/api/calendar/overview?start=${encodeURIComponent(startUtc)}&end=${encodeURIComponent(endUtc)}`);
      if (state !== active || request !== requestNumber || !active.root.isConnected) return;
      state.data = data;
      renderGrid();
    } catch (err) {
      if (grid?.isConnected && request === requestNumber) {
        grid.innerHTML = `<div role="alert" class="live-error">${esc(err.message)} <button type="button" class="text-button" data-cal-reload>Повторити</button></div>`;
      }
    }
  }

  function openEventDialog(ev = null) {
    const courses = state?.courses || [];
    const free = state?.data?.free_slots?.[0];
    const chosen = state?.selectedDay;
    const startDef = ev ? toLocalInput(ev.start_at) : chosen ? chosen + 'T12:00' : free ? toLocalInput(free.start_at) : toLocalInput(new Date(Date.now() + 3600000).toISOString());
    const endDef = ev ? toLocalInput(ev.end_at) : chosen ? chosen + 'T13:00' : free ? toLocalInput(new Date(new Date(free.start_at).getTime() + 3600000).toISOString()) : toLocalInput(new Date(Date.now() + 7200000).toISOString());

    showModal(ev ? 'Редагувати подію' : 'Нова подія', `<form class="cal-form" id="cal-event-form" data-id="${esc(ev?.event_id || '')}">
      <label>Назва<input name="title" value="${esc(ev?.title || '')}" required maxlength="200" placeholder="Наприклад: Підготовка до контрольної"></label>
      <div class="cal-form-row">
        <label>Початок<input type="datetime-local" name="start" value="${esc(startDef)}" required></label>
        <label>Кінець<input type="datetime-local" name="end" value="${esc(endDef)}" required></label>
      </div>
      ${courses.length && !ev ? `<label>Прив’язати до курсу (необов’язково)<select name="course_id"><option value="">Без курсу</option>${courses.map(c => `<option value="${c.course_id}">${esc(c.title)}</option>`).join('')}</select></label>` : ''}
      <label>Опис<textarea name="description" rows="2" placeholder="Короткі нотатки">${esc(ev?.description || '')}</textarea></label>
      <div data-cal-override-wrap hidden>
        <label class="cal-checkbox"><input type="checkbox" name="allow_conflict"> Додати попри перетин із забороненим часом або іншою подією</label>
      </div>
      <button class="primary" type="submit">Зберегти подію</button>
      ${ev ? `<button type="button" class="text-button" data-ev-delete="${esc(ev.event_id)}">Прибрати з календаря</button>` : ''}
    </form>`);
  }

  function renderWindowRows(windows) {
    return windows.map((w, i) => `<div class="cal-window-row" data-win-idx="${i}">
            <span><strong>${esc(w.label)}</strong> · ${esc(w.start_time)}–${esc(w.end_time)} ${w.weekdays?.length ? `(${w.weekdays.map(d => WEEKDAYS[d]).join(', ')})` : '(Щодня)'}</span>
            <button type="button" class="text-button" data-del-win="${i}">Видалити</button>
          </div>`).join('') || '<p class="muted">Додаткових заборонених вікон немає.</p>';
  }

  function openRulesDialog() {
    const cfg = state?.data?.settings;
    if (!cfg) return;
    const windows = cfg.forbidden_windows || [];
    showModal('Заборонені години та правила', `<form class="cal-form" id="cal-rules-form">
      <label class="cal-checkbox"><input type="checkbox" name="sleep_enabled" ${cfg.sleep_enabled ? 'checked' : ''}> Увімкнути заборонені години для сну</label>
      <div class="cal-form-row">
        <label>Сон з<input type="time" name="sleep_start" value="${esc(cfg.sleep_start || '23:00')}" required></label>
        <label>Сон до<input type="time" name="sleep_end" value="${esc(cfg.sleep_end || '08:00')}" required></label>
      </div>
      <label class="cal-checkbox"><input type="checkbox" name="avoid_conflicts" ${cfg.avoid_conflicts ? 'checked' : ''}> Не додавати навчання, коли в цей час вже є інша подія</label>
      <label class="cal-checkbox"><input type="checkbox" name="sync_deadlines" ${cfg.sync_deadlines ? 'checked' : ''}> Показувати дедлайни Moodle у календарі</label>
      <div class="cal-form-row">
        <label>Буфер між подіями (хв)<input type="number" name="buffer_minutes" min="0" max="60" value="${Number(cfg.buffer_minutes ?? 10)}"></label>
        <label>Типова сесія (хв)<input type="number" name="default_session_minutes" min="15" max="240" value="${Number(cfg.default_session_minutes ?? 60)}"></label>
      </div>
      <label>Макс. навчання на день (хв)<input type="number" name="max_daily_study_minutes" min="30" max="720" value="${Number(cfg.max_daily_study_minutes ?? 240)}"></label>
      <div>
        <strong>Додаткові заборонені вікна (напр. пари, робота)</strong>
        <div class="cal-window-list" data-cal-windows>${renderWindowRows(windows)}</div>
      </div>
      <fieldset style="border:1px solid #e2d8d0;border-radius:.65rem;padding:.7rem;display:flex;flex-direction:column;gap:.55rem;">
        <legend style="font-size:.82rem;font-weight:700;">Додати інтервал</legend>
        <input type="text" name="new_label" placeholder="Назва (напр. Пари в університеті)" maxlength="60">
        <div class="cal-form-row">
          <label>З<input type="time" name="new_start" value="09:00"></label>
          <label>До<input type="time" name="new_end" value="13:30"></label>
        </div>
        <div class="cal-weekday-pills">${WEEKDAYS.map((d, idx) => `<label><input type="checkbox" name="new_wd" value="${idx}">${d}</label>`).join('')}</div>
        <button type="button" class="secondary" data-add-window>+ Додати заборонений інтервал</button>
      </fieldset>
      <button class="primary" type="submit">Зберегти правила</button>
    </form>`);
    state.draftWindows = windows.map(w => ({...w}));
  }

  function openSyncDialog() {
    const cfg = state?.data?.settings || {};
    const sources = state?.data?.sources || [];
    const googleSource = sources.find(s => s.provider === 'google');

    showModal('Синхронізація календаря', `<div class="cal-form">
      <section style="padding:.8rem;border:1px solid #e2d8d0;border-radius:.75rem;background:#faf6ef;display:flex;flex-direction:column;gap:.5rem;">
        <strong>Google Календар (двостороння синхронізація)</strong>
        ${googleSource
          ? `<p class="muted" style="margin:0;">Підключено: ${esc(googleSource.title)}${googleSource.last_error ? ` · Помилка: ${esc(googleSource.last_error)}` : ''}</p>
             <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
               <button type="button" class="secondary" data-sync-src="${esc(googleSource.source_id)}">Синхронізувати зараз ↻</button>
               <button type="button" class="text-button" data-del-src="${esc(googleSource.source_id)}">Відключити</button>
             </div>
             <form class="cal-form" id="cal-google-cals-form" style="margin-top:.35rem;padding-top:.55rem;border-top:1px dashed #d8cdc5;" data-google-cal-list>
               <p class="muted" style="margin:0;">Завантажуємо список твоїх Google-календарів…</p>
             </form>`
          : (cfg.google_oauth_available
              ? `<p class="muted" style="margin:0;">Події з Google Календаря блокуватимуть вільний час, а заплановані ШІ сесії автоматично з’являтимуться в Google.</p>
                 <a class="primary" href="/api/calendar/google/connect${window.Hustle?.liveCalendar ? '?view=paper' : ''}" style="align-self:flex-start;text-decoration:none;display:inline-flex;align-items:center;gap:.4rem;padding:.55rem .95rem;">Підключити Google Календар →</a>`
              : `<p class="muted" style="margin:0;">Google OAuth не налаштований на сервері — використовуй iCal (.ics) підписку нижче (підтримується в Google, Apple і Outlook).</p>`)}
      </section>

      <form class="cal-form" id="cal-ics-url-form" style="padding:.8rem;border:1px solid #e2d8d0;border-radius:.75rem;">
        <strong>Підключити iCal (.ics) за посиланням</strong>
        <input type="text" name="title" placeholder="Назва (напр. Особистий Google або Розклад пар)" value="Зовнішній календар">
        <input type="url" name="url" required placeholder="https://calendar.google.com/calendar/ical/.../basic.ics">
        <button class="secondary" type="submit">Додати календар (.ics)</button>
      </form>

      <form class="cal-form" id="cal-ics-file-form" style="padding:.8rem;border:1px solid #e2d8d0;border-radius:.75rem;">
        <strong>Імпортувати файл .ics</strong>
        <input type="file" name="file" accept=".ics,text/calendar" required>
        <button class="secondary" type="submit">Імпортувати файл</button>
      </form>

      <div class="cal-source-list">
        <strong>Підключені джерела</strong>
        ${sources.length ? sources.map(s => `<div class="cal-source-row">
          <div><strong>${esc(s.title)}</strong><div class="muted">${esc(s.calendar_ref)}${s.last_error ? ` · ${esc(s.last_error)}` : ''}</div></div>
          <div style="display:flex;gap:.35rem;">
            ${s.provider !== 'ics_file' ? `<button type="button" class="text-button" data-sync-src="${esc(s.source_id)}">↻</button>` : ''}
            <button type="button" class="text-button" data-del-src="${esc(s.source_id)}">Видалити</button>
          </div>
        </div>`).join('') : '<p class="muted">Зовнішніх календарів ще не підключено.</p>'}
      </div>

      <section style="padding:.8rem;border:1px solid #e2d8d0;border-radius:.75rem;background:#fffdf9;display:flex;flex-direction:column;gap:.45rem;">
        <strong>Підписка на календар Hustle з інших програм</strong>
        <div class="cal-feed-box">
          <input type="text" readonly value="${esc(cfg.ics_feed_url || '')}" aria-label="Приватне посилання .ics">
          <button type="button" class="secondary" data-copy-feed="${esc(cfg.ics_feed_url || '')}">Копіювати</button>
        </div>
        <div style="display:flex;gap:.75rem;align-items:center;">
          <a class="text-button" href="/api/calendar/export.ics">Завантажити .ics файл ↓</a>
          <button type="button" class="text-button" data-rotate-feed>Оновити секретне посилання</button>
        </div>
      </section>
    </div>`);
    if (googleSource) loadGoogleCalendarChoices();
  }

  async function loadGoogleCalendarChoices() {
    const host = body.querySelector('[data-google-cal-list]');
    if (!host) return;
    try {
      const data = await UI.api('/api/calendar/google/calendars');
      if (!host.isConnected) return;
      const list = data.calendars || [];
      host.innerHTML = list.length
        ? `<strong>Які календарі імпортувати (напр. розклад групи):</strong>
           <div style="display:flex;flex-direction:column;gap:.35rem;max-height:11rem;overflow:auto;">
             ${list.map(c => `<label class="cal-checkbox" style="font-weight:500;font-size:.82rem;">
               <input type="checkbox" name="gcal" value="${esc(c.id)}" data-summary="${esc(c.summary)}" ${c.selected ? 'checked' : ''}>
               <span>${esc(c.summary)}${c.primary ? ' · основний' : ''}</span>
             </label>`).join('')}
           </div>
           <button type="submit" class="secondary" style="align-self:flex-start;">Зберегти вибір і оновити</button>`
        : '<p class="muted" style="margin:0;">Доступних календарів не знайдено.</p>';
    } catch (err) {
      if (host.isConnected) host.innerHTML = `<p class="field-error" style="margin:0;">${esc(err.message)}</p>`;
    }
  }

  function showAiResult(result) {
    const box = state?.root?.querySelector('[data-cal-ai-feedback]');
    if (!box) return;
    const scheduled = result.scheduled || [];
    const unscheduled = result.unscheduled || [];
    const warnings = result.sync_warnings || [];
    box.hidden = false;
    box.innerHTML = `<strong>${esc(result.assistant_message || 'Готово')}</strong>
      ${scheduled.length ? `<ul>${scheduled.map(ev => `<li>${esc(fmtDayHead(dayKey(ev.start_at)))} ${esc(fmtTime(ev.start_at))}–${esc(fmtTime(ev.end_at))}: <strong>${esc(ev.title)}</strong></li>`).join('')}</ul>` : ''}
      ${unscheduled.length ? `<p class="field-error" style="margin:0;">Не вдалося розмістити: ${esc(unscheduled.map(u => u.reason || u.title).join('; '))}</p>` : ''}
      ${warnings.length ? `<p class="muted" style="margin:0;">Попередження синхронізації: ${esc(warnings.join('; '))}</p>` : ''}`;
  }

  async function mountSettingsSummary(root) {
    const host = root.querySelector('[data-calendar-settings-summary]');
    if (!host) return;
    try {
      const [cfg, list] = await Promise.all([
        UI.api('/api/calendar/settings'),
        UI.api('/api/calendar/overview').then(o => o.sources || []).catch(() => []),
      ]);
      if (!host.isConnected) return;
      host.innerHTML = `<h2>Календар і сон</h2>
        <p>${cfg.sleep_enabled ? `Заборонені години сну: ${esc(cfg.sleep_start)}–${esc(cfg.sleep_end)}` : 'Сон не обмежено'} · ${cfg.avoid_conflicts ? 'Захист від накладок увімкнено' : 'Перетини дозволено'}</p>
        <p class="muted">Синхронізованих календарів: ${list.length}</p>
        <div class="page-actions"><a class="secondary" href="#calendar">Налаштувати календар →</a></div>`;
    } catch {
      if (host.isConnected) host.innerHTML = '<h2>Календар і сон</h2><p class="muted">Налаштуй синхронізацію та заборонені години.</p><a class="secondary" href="#calendar">Відкрити календар →</a>';
    }
  }

  function mount(main, account, courses = []) {
    mountSettingsSummary(main);
    const root = main.querySelector('[data-calendar-root]');
    if (!root) { state = null; return; }
    state = {root, account, courses, data: null, startYmd: mondayKey(weekOffset), draftWindows: []};
    const qCourse = new URLSearchParams((location.hash.split('?')[1] || '')).get('course');
    if (qCourse) {
      const quickSelect = root.querySelector('[data-cal-quick-form] [name="course_id"]');
      if (quickSelect) quickSelect.value = qCourse;
    }
    loadOverview();
  }

  document.addEventListener('click', async event => {
    if (!state?.root?.isConnected) return;
    const t = event.target;
    if (t.closest('[data-cal-reload]')) return loadOverview();
    const wk = t.closest('[data-cal-week]');
    if (wk) { weekOffset += Number(wk.dataset.calWeek); return loadOverview(); }
    if (t.closest('[data-cal-today]')) { weekOffset = 0; return loadOverview(); }
    if (t.closest('[data-cal-open-rules]')) return openRulesDialog();
    if (t.closest('[data-cal-open-sync]')) return openSyncDialog();
    if (t.closest('[data-cal-new-event]')) return openEventDialog();
    const open = t.closest('[data-cal-event]');
    if (open) {
      const ev = state.data?.events?.find(item => item.event_id === open.dataset.calEvent);
      if (!ev) return;
      if (['manual', 'ai_study'].includes(ev.source_type)) return openEventDialog(ev);
      showModal(ev.title, `<p>${esc(fmtDayHead(dayKey(ev.start_at)))} · ${ev.all_day ? 'Весь день' : esc(fmtTime(ev.start_at))}</p><p>${esc(ev.description)}</p>`);
      return;
    }
    if (t.closest('[data-cal-sync-now]')) {
      const btn = t.closest('[data-cal-sync-now]'); btn.disabled = true;
      try {
        const res = await UI.post('/api/calendar/sync', {});
        UI.toast(res.warnings?.length ? 'Синхронізовано з попередженнями' : 'Календар синхронізовано');
        await loadOverview();
      } catch (err) { UI.toast(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (t.closest('[data-cal-auto-week]')) {
      const btn = t.closest('[data-cal-auto-week]'); btn.disabled = true;
      try {
        const res = await UI.post('/api/calendar/ai/plan', {prompt: '', days: 7, sync_external: true});
        showAiResult(res);
        await loadOverview();
      } catch (err) { UI.toast(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    const tog = t.closest('[data-ev-toggle]');
    if (tog) {
      await UI.api(`/api/calendar/events/${encodeURIComponent(tog.dataset.evToggle)}`, {
        method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: tog.dataset.status}),
      });
      return loadOverview();
    }
    const del = t.closest('[data-ev-delete]');
    if (del) {
      try {
        await UI.api(`/api/calendar/events/${encodeURIComponent(del.dataset.evDelete)}`, {method: 'DELETE'});
      } catch (error) { UI.toast(error.message); return; }
      if (dialog.open) dialog.close();
      UI.toast('Подію видалено');
      return loadOverview();
    }
    if (t.closest('[data-add-window]') && body.querySelector('#cal-rules-form')) {
      const f = body.querySelector('#cal-rules-form');
      const start = f.elements.new_start.value, end = f.elements.new_end.value;
      if (!start || !end || start === end) { modalError('Обери різний час початку й кінця.'); return; }
      const weekdays = [...f.querySelectorAll('[name="new_wd"]:checked')].map(el => Number(el.value));
      state.draftWindows.push({label: f.elements.new_label.value.trim() || 'Заборонений час', start_time: start, end_time: end, weekdays, enabled: true});
      body.querySelector('[data-cal-windows]').innerHTML = renderWindowRows(state.draftWindows);
      f.elements.new_label.value = '';
      modalError('');
      return;
    }
    const delWin = t.closest('[data-del-win]');
    if (delWin && body.querySelector('#cal-rules-form')) {
      state.draftWindows.splice(Number(delWin.dataset.delWin), 1);
      body.querySelector('[data-cal-windows]').innerHTML = renderWindowRows(state.draftWindows);
      return;
    }
    const syncSrc = t.closest('[data-sync-src]');
    if (syncSrc) {
      syncSrc.disabled = true;
      try {
        await UI.post(`/api/calendar/sources/${encodeURIComponent(syncSrc.dataset.syncSrc)}/sync`, {});
        await loadOverview();
        openSyncDialog();
        UI.toast('Джерело синхронізовано');
      } catch (err) { modalError(err.message); }
      finally { syncSrc.disabled = false; }
      return;
    }
    const delSrc = t.closest('[data-del-src]');
    if (delSrc) {
      await UI.api(`/api/calendar/sources/${encodeURIComponent(delSrc.dataset.delSrc)}`, {method: 'DELETE'});
      await loadOverview();
      openSyncDialog();
      UI.toast('Джерело відключено');
      return;
    }
    const copyFeed = t.closest('[data-copy-feed]');
    if (copyFeed) {
      try { await navigator.clipboard.writeText(copyFeed.dataset.copyFeed); UI.toast('Посилання скопійовано'); } catch { UI.toast('Скопіюй посилання з поля'); }
      return;
    }
    if (t.closest('[data-rotate-feed]')) {
      await UI.post('/api/calendar/settings/feed-token/rotate', {});
      await loadOverview();
      openSyncDialog();
      UI.toast('Секретне посилання оновлено');
    }
  });

  document.addEventListener('submit', async event => {
    if (!state?.root?.isConnected) return;
    const form = event.target;
    if (form.matches('[data-cal-ai-form]')) {
      event.preventDefault();
      const prompt = form.elements.prompt.value.trim();
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        const res = await UI.post('/api/calendar/ai/plan', {prompt, days: 7, sync_external: true});
        showAiResult(res);
        form.elements.prompt.value = '';
        await loadOverview();
      } catch (err) { UI.toast(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (form.matches('[data-cal-quick-form]')) {
      event.preventDefault();
      const btn = form.querySelector('[type="submit"]'); btn.disabled = true;
      try {
        const res = await UI.post('/api/calendar/ai/schedule-block', {
          course_id: Number(form.elements.course_id.value),
          duration_minutes: Number(form.elements.duration.value),
          preferred_part_of_day: form.elements.part.value || null,
          horizon_days: 7,
        });
        showAiResult({assistant_message: 'Додано в найближче вільне вікно:', scheduled: [res.event], unscheduled: []});
        await loadOverview();
      } catch (err) { UI.toast(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (form.id === 'cal-event-form') {
      event.preventDefault();
      const btn = form.querySelector('[type="submit"]'); btn.disabled = true; modalError('');
      try {
        const id = form.dataset.id;
        const payload = {
          title: form.elements.title.value.trim(),
          start_at: localInputToUtcIso(form.elements.start.value),
          end_at: localInputToUtcIso(form.elements.end.value),
          course_id: form.elements.course_id?.value ? Number(form.elements.course_id.value) : null,
          description: form.elements.description.value.trim(),
          allow_conflict: Boolean(form.elements.allow_conflict?.checked),
        };
        if (id) await UI.api('/api/calendar/events/' + encodeURIComponent(id), {
          method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
        });
        else await UI.post('/api/calendar/events', payload);
        dialog.close();
        UI.toast(id ? 'Подію збережено' : 'Подію додано');
        await loadOverview();
      } catch (err) {
        modalError(err.message);
        const ov = form.querySelector('[data-cal-override-wrap]');
        if (ov && /уже є подія|заборонений/i.test(err.message)) ov.hidden = false;
      } finally { btn.disabled = false; }
      return;
    }
    if (form.id === 'cal-rules-form') {
      event.preventDefault();
      const btn = form.querySelector('[type="submit"]'); btn.disabled = true; modalError('');
      try {
        await UI.api('/api/calendar/settings', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            sleep_enabled: form.elements.sleep_enabled.checked,
            sleep_start: form.elements.sleep_start.value,
            sleep_end: form.elements.sleep_end.value,
            avoid_conflicts: form.elements.avoid_conflicts.checked,
            sync_deadlines: form.elements.sync_deadlines.checked,
            buffer_minutes: Number(form.elements.buffer_minutes.value),
            default_session_minutes: Number(form.elements.default_session_minutes.value),
            max_daily_study_minutes: Number(form.elements.max_daily_study_minutes.value),
            forbidden_windows: state.draftWindows || [],
          }),
        });
        dialog.close();
        UI.toast('Правила календаря збережено');
        await loadOverview();
      } catch (err) { modalError(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (form.id === 'cal-ics-url-form') {
      event.preventDefault();
      const btn = form.querySelector('[type="submit"]'); btn.disabled = true; modalError('');
      try {
        await UI.post('/api/calendar/sources/ics', {title: form.elements.title.value.trim(), url: form.elements.url.value.trim()});
        await loadOverview();
        openSyncDialog();
        UI.toast('iCal календар підключено');
      } catch (err) { modalError(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (form.id === 'cal-google-cals-form') {
      event.preventDefault();
      const checked = [...form.querySelectorAll('input[name="gcal"]:checked')].map(el => ({
        id: el.value,
        summary: el.dataset.summary || el.value,
      }));
      if (!checked.length) { modalError('Обери хоча б один календар.'); return; }
      const btn = form.querySelector('[type="submit"]'); btn.disabled = true; modalError('');
      try {
        await UI.api('/api/calendar/google/calendars', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({calendars: checked}),
        });
        await loadOverview();
        openSyncDialog();
        UI.toast('Вибрані календарі синхронізовано');
      } catch (err) { modalError(err.message); }
      finally { btn.disabled = false; }
      return;
    }
    if (form.id === 'cal-ics-file-form') {
      event.preventDefault();
      const file = form.elements.file.files[0]; if (!file) return;
      const btn = form.querySelector('[type="submit"]'); btn.disabled = true; modalError('');
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', file.name.replace(/\.ics$/i, ''));
        await UI.api('/api/calendar/sources/ics-upload', {method: 'POST', body: fd});
        await loadOverview();
        openSyncDialog();
        UI.toast('Файл .ics імпортовано');
      } catch (err) { modalError(err.message); }
      finally { btn.disabled = false; }
    }
  });

  function bindMonth(root, data, courses, selectedDay, paperReload) {
    state = {root, data, courses, selectedDay, paperReload, draftWindows: []};
  }
  window.HustleCalendar = {shell, mount, bindMonth, selectWeek, localInputToUtcIso, toLocalInput};
})();
