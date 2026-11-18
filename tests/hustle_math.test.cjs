const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function loadMath() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('app/static/hustle/math.js', 'utf8'), context);
  return context.window.HustleMath;
}

test('protects inline, display, and multiline LaTeX in markdown without touching code or currency', () => {
  const math = loadMath();
  const input = [
    'Formula $P(A_1 \\mid B) = \\frac{P(A_1 \\cap B)}{P(B)}$ and \\(\\alpha_2 + \\beta_3\\).',
    '',
    '$$',
    '\\sum_{i=1}^n x_i',
    '+ y_i',
    '$$',
    '',
    'Cost is $10-$20 or \\$5, code is `$not_math$` and:',
    '```js',
    'const price = "$x_1$";',
    '```',
  ].join('\n');

  const out = math.protectMarkdown(input);
  assert.match(out, /<span class="math-tex" data-tex="P\(A_1 \\mid B\) = \\frac\{P\(A_1 \\cap B\)\}\{P\(B\)\}" data-display="0"><\/span>/);
  assert.match(out, /<span class="math-tex" data-tex="\\alpha_2 \+ \\beta_3" data-display="0"><\/span>/);
  assert.match(out, /<span class="math-tex math-display" data-tex="\\sum_\{i=1\}\^n x_i&#10;\+ y_i" data-display="1"><\/span>/);
  assert.ok(out.includes('Cost is $10-$20 or \\$5'));
  assert.ok(out.includes('`$not_math$`'));
  assert.ok(out.includes('const price = "$x_1$";'));
});

test('inlineHtml escapes HTML safely while wrapping LaTeX spans', () => {
  const math = loadMath();
  const out = math.inlineHtml('Let $X \\sim \\mathcal{N}(\\mu, \\sigma^2)$ & <script>alert(1)</script>');
  assert.ok(!out.includes('<script>'));
  assert.ok(out.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.match(out, /data-tex="X \\sim \\mathcal\{N\}\(\\mu, \\sigma\^2\)" data-display="0"/);
});

test('bundled KaTeX renders MathML cleanly for extracted TeX', async () => {
  const katex = await import('../app/static/hustle/vendor/katex-OKZ4SJN2.js');
  const html = katex.renderToString('P(A\\mid B) = \\frac{P(A\\cap B)}{P(B)}', {
    output: 'mathml',
    displayMode: true,
    throwOnError: false,
    strict: false,
    trust: false,
  });
  assert.match(html, /<math[^>]*display="block"/);
  assert.match(html, /<mfrac>/);
});
