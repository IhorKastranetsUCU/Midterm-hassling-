(() => {
  const accountNode = document.getElementById('workspace-account');
  const account = accountNode ? JSON.parse(accountNode.textContent) : null;
  const legacyKey = 'hustle-product-prototype-v1';
  let key = legacyKey;
  if (!account) {
    try {
      const active = sessionStorage.getItem(legacyKey + ':active-owner');
      if (active) key += ':' + active;
    } catch {}
  }
  // Keep an existing paper profile with its original browser workspace.
  if (account) {
    key += ':' + account.owner;
    try {
      sessionStorage.setItem(legacyKey + ':active-owner', account.owner);
      const old = sessionStorage.getItem(legacyKey);
      const owner = sessionStorage.getItem(legacyKey + ':owner');
      if (old && (!owner || owner === account.owner) && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, old);
        sessionStorage.setItem(legacyKey + ':owner', account.owner);
      }
    } catch {}
  }
  const defaults = { registered: false, name: '', school: '', courses: [], minutes: 25, ready: false, completed: {}, bookmarks: [] };
  let state;
  try { state = { ...defaults, ...JSON.parse(sessionStorage.getItem(key) || '{}') }; } catch { state = { ...defaults }; }
  const shapes = {
    plan: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5M8 16h6"/>',
    courses: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z"/><path d="M12 6v15"/>',
    practice: '<rect x="5" y="3" width="15" height="17" rx="3"/><path d="M2 7v13a3 3 0 0 0 3 3M9 11l2 2 5-5"/>',
    files: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    speech: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.2-3A7.5 7.5 0 1 1 20 11.5Z"/><path d="M9 10h7m-7 3h4"/>',
    lab: '<path d="M9 3h6m-5 0v6l-5.3 8.2A2.5 2.5 0 0 0 6.8 21h10.4a2.5 2.5 0 0 0 2.1-3.8L14 9V3M8 15h8"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    play: '<path d="m9 5 11 7-11 7Z"/>',
    pause: '<path d="M9 5v14m6-14v14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    link: '<path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(2 0) scale(.85)"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    logout: '<path d="M9 4H4v16h5M12 12h9m-4-4 4 4-4 4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/>',
  };
  window.Hustle = {
    account,
    get exampleCourses() { return account ? [] : window.HustleCourses || []; },
    get state() { return state; },
    update(patch) { state = { ...state, ...patch }; try { sessionStorage.setItem(key, JSON.stringify(state)); } catch {} return state; },
    escape(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); },
    icon(name) { return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.plan}</svg>`; },
    requireAccount() { if (!state.registered) { location.replace('register.html'); return false; } return true; }
  };
})();
