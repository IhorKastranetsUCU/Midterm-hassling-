/* Specialist course readers and editors run inside the shared planner shell. */
(() => {
  if (parent === window) { location.replace('/hustle/app.html' + location.hash); return; }
  const frame = window.frameElement;
  if (!frame || frame.ownerDocument.location.origin !== location.origin) return;
  document.documentElement.classList.toggle('shared-course-header', frame.hasAttribute('data-shared-course-header'));
  function parentRoute(hash) {
    return hash === '#new-course' ? '#import' : hash === '#dashboard' ? '#plan' : hash || '#plan';
  }
  function navigate(hash) {
    const route = parentRoute(hash);
    if (parent.location.hash !== route) parent.location.hash = route;
  }
  function placeMaterialsAction(main) {
    const action = frame.previousElementSibling?.querySelector('[data-paper-add-materials]');
    if (!action) return;
    const internalAction = () => main.querySelector('.course-cover [data-add]');
    const sync = () => { action.disabled = main.inert || !internalAction(); };
    const dialog = document.querySelector('#study-dialog');
    document.documentElement.classList.add('paper-materials-action');
    new MutationObserver(sync).observe(main, {childList:true, attributes:true, attributeFilter:['inert']});
    sync();
    action.addEventListener('click', () => {
      internalAction()?.click();
      if (dialog.open) dialog.addEventListener('close', () => action.focus({preventScroll:true}), {once:true});
    });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname || url.pathname === '/hustle/app.html') {
      if (a.closest('.study-mode-tabs')) frame.dataset.focusRoute = url.hash.slice(1);
      e.preventDefault(); navigate(url.hash);
    } else if (!url.pathname.startsWith('/api/')) { a.target = '_top'; }
  });
  window.HustleShareCourseTrail = () => {
    const trail = document.querySelector('.reader-breadcrumbs');
    if (!trail || !frame.hasAttribute('data-shared-course-header')) return;
    const headings = [...trail.querySelectorAll('a, [aria-current="page"]')].slice(1);
    const crumbs = headings.map(el => ({label: el.textContent.trim(), href: el.hash || ''}));
    if (parent.Hustle?.workspace?.setCourseTrail(location.hash, crumbs)) trail.hidden = true;
  };
  window.addEventListener('hashchange', () => navigate(location.hash));
  document.addEventListener('DOMContentLoaded', () => {
    const study = /^#course\/(\d+)\/(practice|cards|quizzes|reading|exam|topic)(?:[/?]|$)/.exec(location.hash);
    if (study) {
      const activity = () => parent.HustleDashboard?.trackCourseActivity(study[1]);
      document.addEventListener('pointerdown', activity, {passive:true});
      document.addEventListener('keydown', activity);
      document.addEventListener('scroll', activity, {capture:true, passive:true});
    }
    const main = document.querySelector('#workspace-main');
    placeMaterialsAction(main);
    const resize = () => { frame.style.height = Math.max(530, main.offsetHeight + 20) + 'px'; };
    new ResizeObserver(resize).observe(main); resize();
  });
})();
