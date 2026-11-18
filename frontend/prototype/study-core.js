/* Shared, DOM-free study calculations. Dates follow the student's Kyiv calendar. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HustleStudy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const zone = 'Europe/Kyiv';
  const hour = 3600000;
  const day = 24 * hour;
  const deadlineTiming = Object.freeze({ warmup: 3 * day, fire: day, countdown: day });
  function dateKey(value = Date.now()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
    return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
  }
  function addDays(key, days) {
    const d = new Date(key + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function deadline(day, hour = 16) {
    // Resolve the actual Kyiv offset on this date, including daylight saving.
    const base = new Date(day + 'T' + String(hour).padStart(2, '0') + ':00:00Z');
    const localHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(base));
    return base.getTime() - ((localHour - hour + 24) % 24) * 3600000;
  }
  function urgency(due, done, now = Date.now()) {
    if (done) return 'done';
    if (due <= now) return 'overdue';
    return due - now <= deadlineTiming.fire ? 'urgent' : 'upcoming';
  }
  function deadlineProgress(due, done, now, windowMs, initial = 0) {
    const left = due - now;
    if (done || !Number.isFinite(left) || left <= 0 || left > windowMs) return 0;
    return initial + (1 - initial) * (1 - left / windowMs);
  }
  function deadlineWarmth(due, done, now = Date.now()) {
    return deadlineProgress(due, done, now, deadlineTiming.warmup, 0.38);
  }
  function deadlineHeat(due, done, now = Date.now()) {
    // Ease from a faint glow to active flames as the last day passes.
    return Math.pow(deadlineProgress(due, done, now, deadlineTiming.fire), 1.7);
  }
  function deadlineRemaining(due, now = Date.now()) {
    const ms = due - now;
    if (!Number.isFinite(ms) || ms > deadlineTiming.countdown) return '';
    if (ms <= 0) return 'Прострочено';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (minutes < 1) return 'Менше хвилини';
    const parts = [hours && `${hours} год`, minutes % 60 && `${minutes % 60} хв`];
    return `Лишилось ${parts.filter(Boolean).join(' ')}`;
  }
  function secondsLabel(seconds) {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    return mins >= 60 ? `${Math.floor(mins / 60)} год ${mins % 60} хв` : `${mins} хв`;
  }
  function remaining(timer, now = Date.now()) {
    return Math.max(0, timer.running ? Math.ceil((timer.endsAt - now) / 1000) : timer.remaining);
  }
  function splitInterval(start, end, course, source, id) {
    const records = [];
    let cursor = start;
    while (cursor < end) {
      const day = dateKey(cursor);
      const next = deadline(addDays(day, 1), 0);
      const stop = Math.min(end, next);
      if (stop <= cursor) break;
      records.push({ id: `${id}:${cursor}`, day, course, seconds: (stop - cursor) / 1000, source });
      cursor = stop;
    }
    return records;
  }
  function sum(records, { course, from, to } = {}) {
    return records.filter(r => (!course || r.course === course) && (!from || r.day >= from) && (!to || r.day <= to)).reduce((n, r) => n + Math.round(r.seconds * 1000), 0) / 1000;
  }
  function monthDays(key) {
    const first = key.slice(0, 7) + '-01';
    const day = new Date(first + 'T12:00:00Z').getUTCDay();
    const start = addDays(first, -(day + 6) % 7);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }
  return { zone, dateKey, addDays, deadline, urgency, deadlineTiming, deadlineWarmth, deadlineHeat, deadlineRemaining, secondsLabel, remaining, splitInterval, sum, monthDays };
});
