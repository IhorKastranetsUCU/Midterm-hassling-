// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { TicketPicker } = require('../js/exam-ticket.js');

const orals = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, time: '4-5 minutes' }));
const defs = Array.from({ length: 21 }, (_, i) => ({ id: i + 1 }));

function seeded(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

test('a ticket has one oral question and two different definitions', () => {
  for (let s = 1; s <= 50; s++) {
    const t = TicketPicker.draw(orals, defs, seeded(s));
    assert.ok(t.oral && orals.includes(t.oral));
    assert.equal(t.defs.length, 2);
    assert.notEqual(t.defs[0].id, t.defs[1].id);
  }
});

test('the next ticket never repeats the previous oral question', () => {
  const rand = seeded(3);
  let prev = null;
  for (let i = 0; i < 100; i++) {
    const t = TicketPicker.draw(orals, defs, rand, prev);
    assert.notEqual(t.oral.id, prev);
    prev = t.oral.id;
  }
});

test('a single oral question is still drawn when it was the previous one', () => {
  const t = TicketPicker.draw([orals[0]], defs, Math.random, orals[0].id);
  assert.equal(t.oral.id, orals[0].id);
});

test('pickDistinct does not mutate input and caps at the pool size', () => {
  const input = defs.slice(0, 3);
  const out = TicketPicker.pickDistinct(input, 5, seeded(9));
  assert.deepEqual(input, defs.slice(0, 3));
  assert.equal(out.length, 3);
  assert.equal(new Set(out.map(d => d.id)).size, 3);
});

test('targetMinutes reads the upper bound of the time hint', () => {
  assert.equal(TicketPicker.targetMinutes('4-5 minutes'), 5);
  assert.equal(TicketPicker.targetMinutes('3 minutes'), 3);
  assert.equal(TicketPicker.targetMinutes('a few minutes'), null);
});
