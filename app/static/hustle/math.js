/* Safe LaTeX math delimiter parsing and local KaTeX MathML rendering. */
(() => {
  const escAttr = value => String(value ?? '').replace(/[&<>"'\r\n]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '\r': '&#13;', '\n': '&#10;' }[c]));
  const CODE_SEGMENT = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
  const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$(?!\s)([^$\n]+?)(?<![\s\\])\$)/g;
  let katexLoader = null;

  function looksLikeCurrency(inner) {
    return !/[\\^_{}=<>|]/.test(inner) && /^\d/.test(inner.trim());
  }

  function parseMathMatch(match, singleDollarInner) {
    if (match.startsWith('$$') && match.endsWith('$$')) {
      return { tex: match.slice(2, -2).trim(), display: true };
    }
    if (match.startsWith('\\[') && match.endsWith('\\]')) {
      return { tex: match.slice(2, -2).trim(), display: true };
    }
    if (match.startsWith('\\(') && match.endsWith('\\)')) {
      return { tex: match.slice(2, -2).trim(), display: false };
    }
    if (singleDollarInner !== undefined) {
      if (looksLikeCurrency(singleDollarInner)) return null;
      return { tex: singleDollarInner.trim(), display: false };
    }
    return null;
  }

  function replaceSegment(text, onPlain, withFallbackText = false) {
    let out = '';
    let last = 0;
    MATH_PATTERN.lastIndex = 0;
    let m;
    while ((m = MATH_PATTERN.exec(text)) !== null) {
      const idx = m.index;
      const full = m[0];
      const parsed = parseMathMatch(full, m[2]);
      if (!parsed || !parsed.tex) continue;
      if (idx > last) out += onPlain(text.slice(last, idx));
      const cls = parsed.display ? 'math-tex math-display' : 'math-tex';
      const inner = withFallbackText ? escAttr(full) : '';
      out += `<span class="${cls}" data-tex="${escAttr(parsed.tex)}" data-display="${parsed.display ? '1' : '0'}">${inner}</span>`;
      last = idx + full.length;
    }
    if (last < text.length) out += onPlain(text.slice(last));
    return out;
  }

  function protectMarkdown(text) {
    const raw = String(text ?? '');
    return raw.split(CODE_SEGMENT).map((segment, i) => (
      i % 2 === 1 ? segment : replaceSegment(segment, part => part, false)
    )).join('');
  }

  function inlineHtml(text) {
    return replaceSegment(String(text ?? ''), escAttr, true);
  }

  async function enhance(root) {
    if (!root || !root.querySelectorAll) return;
    const nodes = [...root.querySelectorAll('[data-tex]:not([data-math-rendered])')];
    if (!nodes.length) return;
    try {
      katexLoader ||= import('./vendor/katex-OKZ4SJN2.js');
      const katex = await katexLoader;
      const render = katex.render || katex.default?.render;
      if (typeof render !== 'function') return;
      for (const el of nodes) {
        if (!el.isConnected) continue;
        const tex = el.dataset.tex || '';
        const displayMode = el.dataset.display === '1';
        el.dataset.mathRendered = 'true';
        try {
          render(tex, el, {
            displayMode,
            output: 'mathml',
            throwOnError: false,
            strict: false,
            trust: false,
          });
        } catch {
          el.textContent = tex;
        }
      }
    } catch {
      katexLoader = null;
      for (const el of nodes) {
        if (el.isConnected && !el.textContent) {
          el.textContent = el.dataset.tex || '';
        }
      }
    }
  }

  window.HustleMath = { protectMarkdown, inlineHtml, enhance };
})();
