// ========================================================
// Icon system: Lucide icons (https://lucide.dev, ISC license) as inline SVG.
// - JS templates:     ${icon('dices')}  or  ${icon('trophy', 'text-amber-400')}
// - Static markup:    <i data-icon="dices" class="text-amber-400"></i>  (hydrated on load)
// Icons are 1em and use currentColor, so they follow the text size and both themes.
// ========================================================

(function () {
  const cache = new Map();
  const toPascal = name => name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

  // Inline SVG markup for a Lucide icon; extra classes are appended (sizes, colors, spacing)
  function icon(name, extraClass = '') {
    const key = `${name}|${extraClass}`;
    if (cache.has(key)) return cache.get(key);

    const lib = window.lucide;
    const node = lib?.icons?.[toPascal(name)];
    if (!node || typeof lib.createElement !== 'function') {
      // CDN unavailable or unknown name: degrade to no icon rather than broken markup
      if (lib) console.warn(`[icons] unknown icon "${name}"`);
      return '';
    }

    const svg = lib.createElement(node);
    svg.setAttribute('class', `lucide-icon lucide-${name} ${extraClass}`.trim());
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const html = svg.outerHTML;
    cache.set(key, html);
    return html;
  }

  // Replaces <i data-icon="name" class="..."> placeholders (static markup in index.html)
  function hydrateIcons(root = document) {
    root.querySelectorAll('i[data-icon]').forEach(el => {
      const html = icon(el.getAttribute('data-icon'), el.getAttribute('class') || '');
      if (html) el.outerHTML = html;
    });
  }

  window.icon = icon;
  window.hydrateIcons = hydrateIcons;
  document.addEventListener('DOMContentLoaded', () => hydrateIcons());
})();
