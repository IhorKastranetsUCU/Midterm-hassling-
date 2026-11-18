const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../frontend/prototype/study-core.js');
test('study days follow Kyiv midnight', () => {
  assert.equal(C.dateKey('2026-11-18T22:30:00Z'), '2026-11-19');
  assert.equal(C.dateKey('2026-07-18T21:30:00Z'), '2026-07-19');
  assert.equal(new Date(C.deadline('2026-11-19', 16)).toISOString(), '2026-11-19T14:00:00.000Z');
});
test('calendar traverses month and year boundaries and starts Monday', () => {
  assert.equal(C.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(C.addDays('2026-03-01', -1), '2026-02-28');
  const days = C.monthDays('2026-11-18');
  assert.equal(days.length, 42); assert.equal(days[0], '2026-10-26'); assert.equal(days.at(-1), '2026-12-06');
});
test('urgency applies only to incomplete tasks, within one day', () => {
  const now = Date.parse('2026-11-18T10:00:00Z');
  assert.equal(C.urgency(now + 24 * 3600000, false, now), 'urgent');
  assert.equal(C.urgency(now + 24 * 3600000 + 1, false, now), 'upcoming');
  assert.equal(C.urgency(now, false, now), 'overdue'); assert.equal(C.urgency(now - 1, true, now), 'done');
});
test('timer survives delayed background ticks and preserves paused time', () => {
  const timer = { running: true, remaining: 1500, endsAt: 100000 };
  assert.equal(C.remaining(timer, 90500), 10); assert.equal(C.remaining(timer, 110000), 0);
  assert.equal(C.remaining({ ...timer, running: false, remaining: 37 }, 110000), 37);
});
test('study intervals split at Kyiv midnight and preserve exact duration', () => {
  const start = Date.parse('2026-11-18T21:59:30Z'), end = start + 90000;
  const rows = C.splitInterval(start, end, 'algebra', 'pomodoro', 'session-1');
  assert.deepEqual(rows.map(r => [r.day, r.seconds]), [['2026-11-18', 30], ['2026-11-19', 60]]);
  assert.equal(C.sum(rows), 90);
  assert.equal(C.sum(rows, { course: 'algebra', from: '2026-11-19', to: '2026-11-19' }), 60);
  assert.equal(C.sum(rows, { course: 'english' }), 0);
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length);
});
test('recorded study time respects daylight saving changes in Kyiv', () => {
  for (const [day, hours] of [['2026-03-29', 23], ['2026-10-25', 25]]) {
    const start = C.deadline(day, 0), end = C.deadline(C.addDays(day, 1), 0);
    assert.equal((end - start) / 3600000, hours);
    const rows = C.splitInterval(start, end, 'probability', 'pomodoro', day);
    assert.equal(C.sum(rows), hours * 3600); assert.equal(rows.length, 1); assert.equal(rows[0].day, day);
  }
});

test('the fire builds towards the source deadline and stays off for completed work', () => {
  const hour = 60 * 60 * 1000;
  const due = 100 * hour;
  const at = hours => due - hours * hour;
  assert.equal(C.deadlineWarmth(due, false, at(73)), 0);
  assert.equal(C.deadlineWarmth(due, false, at(72.001)), 0);
  const firstTint = C.deadlineWarmth(due, false, at(72));
  assert.ok(firstTint > 0 && firstTint < C.deadlineWarmth(due, false, at(48)));
  assert.equal(C.deadlineHeat(due, false, at(72)), 0);
  assert.equal(C.deadlineHeat(due, false, at(24)), 0);
  let previousWarmth = firstTint, previousHeat = 0;
  for (const hours of [71.9, 58.2, 39.7, 24, 23.8, 19.07, 12.36, 5.13, 2.6, .01]) {
    const warmth = C.deadlineWarmth(due, false, at(hours));
    const heat = C.deadlineHeat(due, false, at(hours));
    assert.ok(warmth > previousWarmth && warmth <= 1);
    if (hours >= 24) assert.equal(heat, 0);
    else assert.ok(heat > previousHeat && heat < 1);
    previousWarmth = warmth;
    previousHeat = heat;
  }
  assert.ok(previousHeat > .99);
  assert.equal(C.deadlineWarmth(due, true, at(35)), 0);
  assert.equal(C.deadlineWarmth(due, false, due), 0);
  assert.equal(C.deadlineHeat(due, false, due), 0);
  assert.equal(C.deadlineHeat(due, false, due + hour), 0);
  assert.equal(C.deadlineHeat(due, true, due - hour), 0);
});

test('deadline countdown shows close and overdue deadlines at the correct time', () => {
  const due = Date.parse('2026-11-19T14:00:00Z');
  assert.equal(C.deadlineRemaining(due, due - 25 * 3600000), '');
  assert.equal(C.deadlineRemaining(due, due - 24 * 3600000), 'Лишилось 24 год');
  assert.equal(C.deadlineRemaining(due, due - 77 * 60000), 'Лишилось 1 год 17 хв');
  assert.equal(C.deadlineRemaining(due, due - 500), 'Менше хвилини');
  assert.equal(C.deadlineRemaining(due, due), 'Прострочено');
});
