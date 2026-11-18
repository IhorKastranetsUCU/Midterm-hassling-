/* Specialist course readers and editors run inside the shared planner shell. */
(() => {
  if (parent === window) { location.replace('/hustle/app.html' + location.hash); return; }
  const frame = window.frameElement;
  if (!frame || frame.ownerDocument.location.origin !== location.origin) return;
  function parentRoute(hash) {
    return hash === '#new-course' ? '#import' : hash === '#dashboard' ? '#plan' : hash || '#plan';
  }
  function navigate(hash) {
    const route = parentRoute(hash);
    if (parent.location.hash !== route) parent.location.hash = route;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname || url.pathname === '/hustle/app.html') {
      e.preventDefault(); navigate(url.hash);
    } else if (!url.pathname.startsWith('/api/')) { a.target = '_top'; }
  });
  window.addEventListener('hashchange', () => navigate(location.hash));
  document.addEventListener('DOMContentLoaded', () => {
    const study = /^#course\/(\d+)\/(practice|reading|exam|topic)(?:[/?]|$)/.exec(location.hash);
    if (study) {
      const activity = () => parent.HustleDashboard?.trackCourseActivity(study[1]);
      document.addEventListener('pointerdown', activity, {passive:true});
      document.addEventListener('keydown', activity);
      document.addEventListener('scroll', activity, {capture:true, passive:true});
    }
    const main = document.querySelector('#workspace-main');
    const resize = () => { frame.style.height = Math.max(530, main.offsetHeight + 20) + 'px'; };
    new ResizeObserver(resize).observe(main); resize();
  });
})();
