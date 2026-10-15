// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { DrillQueue } = require('../js/definition-drill.js');

const ids = Array.from({ length: 21 }, (_, i) => i + 1);

// Deterministic PRNG so shuffles are reproducible
function seeded(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

test('shuffle keeps every id exactly once and does not mutate input', () => {
  const input = ids.slice();
  const out = DrillQueue.shuffle(input, seeded(7));
  assert.deepEqual(input, ids);
  assert.deepEqual(out.slice().sort((a, b) => a - b), ids);
  assert.notDeepEqual(out, ids);
});

test('grading every card "good" finishes the round in exactly N reviews', () => {
  const s = DrillQueue.create(ids, seeded(1));
  while (!DrillQueue.isFinished(s)) DrillQueue.grade(s, 'good');
  const sum = DrillQueue.summary(s);
  assert.equal(sum.reviews, 21);
  assert.equal(sum.good, 21);
  assert.equal(sum.done, 21);
  assert.deepEqual(sum.weakIds, []);
});

test('"again" brings the card back after AGAIN_OFFSET other cards', () => {
  const s = DrillQueue.create([1, 2, 3, 4, 5, 6], () => 0.999); // identity-ish order
  const first = DrillQueue.current(s);
  DrillQueue.grade(s, 'again');
  assert.equal(s.queue.indexOf(first), DrillQueue.AGAIN_OFFSET);
  assert.equal(s.queue.length, 6);
});

test('"again" on the last card shows it again immediately', () => {
  const s = DrillQueue.create([9]);
  DrillQueue.grade(s, 'again');
  assert.equal(DrillQueue.current(s), 9);
  DrillQueue.grade(s, 'good');
  assert.ok(DrillQueue.isFinished(s));
});

test('"hard" moves the card to the end of the queue', () => {
  const s = DrillQueue.create([1, 2, 3]);
  const first = DrillQueue.current(s);
  DrillQueue.grade(s, 'hard');
  assert.equal(s.queue[s.queue.length - 1], first);
});

test('summary counts first-attempt grades only and lists weak ids', () => {
  const s = DrillQueue.create([1, 2, 3], () => 0.999);
  const order = s.queue.slice();
  DrillQueue.grade(s, 'again'); // order[0] → back in queue
  DrillQueue.grade(s, 'hard');  // order[1] → end
  DrillQueue.grade(s, 'good');  // order[2]
  while (!DrillQueue.isFinished(s)) DrillQueue.grade(s, 'good');

  const sum = DrillQueue.summary(s);
  assert.equal(sum.again, 1);
  assert.equal(sum.hard, 1);
  assert.equal(sum.good, 1);
  assert.equal(sum.reviews, 5);
  assert.deepEqual(sum.weakIds.sort(), [order[0], order[1]].sort());
});

test('empty set is immediately finished', () => {
  const s = DrillQueue.create([]);
  assert.ok(DrillQueue.isFinished(s));
  assert.equal(DrillQueue.current(s), null);
  DrillQueue.grade(s, 'good'); // no-op, must not throw
  assert.equal(DrillQueue.summary(s).total, 0);
});

test('suggestGrade maps checklist coverage to a grade', () => {
  assert.equal(DrillQueue.suggestGrade(0, 0), null);
  assert.equal(DrillQueue.suggestGrade(5, 5), 'good');
  assert.equal(DrillQueue.suggestGrade(3, 6), 'hard');
  assert.equal(DrillQueue.suggestGrade(4, 7), 'hard');
  assert.equal(DrillQueue.suggestGrade(1, 3), 'again');
  assert.equal(DrillQueue.suggestGrade(0, 4), 'again');
});

test('readiness scores: only "good" passes the 6/10 threshold', () => {
  assert.ok(DrillQueue.GRADE_SCORES.good >= 6);
  assert.ok(DrillQueue.GRADE_SCORES.hard < 6);
  assert.ok(DrillQueue.GRADE_SCORES.again < 6);
});
