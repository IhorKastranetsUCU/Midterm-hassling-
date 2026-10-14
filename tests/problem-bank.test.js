// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const katex = require('../vendor/katex/katex.min.js');

global.window = {};
require('../js/data.js');
require('../js/problem-directions.js');
const { PROBLEMS_BANK, PROBLEM_DIRECTIONS } = global.window.PS_DATA;

test('every problem in the bank has a direction hint', () => {
  const missing = PROBLEMS_BANK.filter(p => !PROBLEM_DIRECTIONS[p.id]).map(p => p.id);
  assert.deepEqual(missing, []);
});

test('no direction hint points at a problem that does not exist', () => {
  const ids = new Set(PROBLEMS_BANK.map(p => String(p.id)));
  const orphans = Object.keys(PROBLEM_DIRECTIONS).filter(id => !ids.has(id));
  assert.deepEqual(orphans, []);
});

test('all inline LaTeX in direction hints parses', () => {
  for (const [id, text] of Object.entries(PROBLEM_DIRECTIONS)) {
    const segments = text.split('$');
    assert.equal(segments.length % 2, 1, `unbalanced $ in direction ${id}`);
    for (let i = 1; i < segments.length; i += 2) {
      assert.doesNotThrow(() => katex.renderToString(segments[i], { throwOnError: true }), `direction ${id}: ${segments[i]}`);
    }
  }
});

test('answer prompts do not show a worked value as an "e.g." example', () => {
  // A prompt like "(e.g. 5/18)" printed the expected answer right above the input
  const leaking = PROBLEMS_BANK.filter(p => /e\.g\.\s*-?\d/.test(p.inputPrompt || '')).map(p => p.id);
  assert.deepEqual(leaking, []);
});
