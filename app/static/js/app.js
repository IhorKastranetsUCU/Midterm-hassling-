// Universal Moodle Connector & Event-Driven Client

let currentUser = null;
let currentAuthMode = 'cookie'; // 'cookie', 'token', 'credentials'
let eventSource = null;
let workspaceEventSource = null;
let totalEventCount = 0;
let unreadEventCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initSystemHealth();
  loadWorkspaceCourses();
  initWorkspaceEventStream();
  initDropzoneHandlers();
});

window.addEventListener('focus', () => {
  loadWorkspaceCourses();
});

async function initApp() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      onLoginSuccess(user);
    } else {
      showGuestView();
    }
  } catch (err) {
    showGuestView();
  }
}

// Target URL handling
function getTargetMoodleUrl() {
  const el = document.getElementById('input-target-moodle-url');
  return el ? el.value.trim() : '';
}

function onTargetUrlChanged() {
  const url = getTargetMoodleUrl();
  const linkMoodle = document.getElementById('link-open-moodle');
  const linkToken = document.getElementById('link-open-token');
  const navTarget = document.getElementById('nav-target-url');
  if (linkMoodle) linkMoodle.href = url || '#';
  if (linkToken) linkToken.href = url ? `${url.replace(/\/+$/, '')}/user/managetoken.php` : '#';
  if (navTarget) navTarget.innerText = url || 'Universal';
}

function resetToUcuUrl() {
  const el = document.getElementById('input-target-moodle-url');
  if (el) {
    el.value = 'https://learn.ucu.edu.ua';
    onTargetUrlChanged();
  }
}

// Authority Switcher dropdown toggle
function toggleAuthorityMenu() {
  const menu = document.getElementById('authority-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('authority-menu');
  const btn = document.getElementById('btn-authority-dropdown');
  if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

// Mode toggle: Cookie vs Token vs Credentials
function setAuthMode(mode) {
  currentAuthMode = mode;
  clearLoginError();

  const tabCookie = document.getElementById('tab-login-cookie');
  const tabToken = document.getElementById('tab-login-token');
  const tabCred = document.getElementById('tab-login-credentials');

  const formCookie = document.getElementById('form-cookie-login');
  const formToken = document.getElementById('form-token-login');
  const formCred = document.getElementById('form-cred-login');

  const activeClass = 'py-2 px-2 rounded-lg bg-blue-600 text-white shadow-sm transition-all flex items-center justify-center gap-1';
  const inactiveClass = 'py-2 px-2 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1';

  if (tabCookie) tabCookie.className = (mode === 'cookie') ? activeClass : inactiveClass;
  if (tabToken) tabToken.className = (mode === 'token') ? activeClass : inactiveClass;
  if (tabCred) tabCred.className = (mode === 'credentials') ? activeClass : inactiveClass;

  if (formCookie) formCookie.classList.toggle('hidden', mode !== 'cookie');
  if (formToken) formToken.classList.toggle('hidden', mode !== 'token');
  if (formCred) formCred.classList.toggle('hidden', mode !== 'credentials');

  const inputCookie = document.getElementById('input-cookie');
  const inputToken = document.getElementById('input-token');
  const inputUsername = document.getElementById('input-username');

  if (mode === 'cookie' && inputCookie) inputCookie.focus();
  else if (mode === 'token' && inputToken) inputToken.focus();
  else if (mode === 'credentials' && inputUsername) inputUsername.focus();
}

// 1. Submit MoodleSession Cookie
async function handleCookieSubmit(event) {
  event.preventDefault();
  clearLoginError();

  const cookieVal = document.getElementById('input-cookie').value.trim();
  const moodleUrl = getTargetMoodleUrl();
  const btnText = document.getElementById('btn-cookie-text');
  const spinner = document.getElementById('btn-cookie-spinner');
  const submitBtn = document.getElementById('btn-cookie-submit');

  if (!cookieVal) {
    showLoginError('Please paste your MoodleSession cookie.');
    return;
  }

  btnText.innerText = 'Connecting to Moodle with Cookie...';
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: cookieVal, moodle_url: moodleUrl })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { detail: `Server error (${res.status}). Check server logs.` };
    }

    if (!res.ok) {
      showLoginError(
        data.detail || 'Invalid or expired MoodleSession cookie.',
        'Please verify that you are currently signed into your Moodle site in your browser, then re-copy the cookie.'
      );
      return;
    }

    onLoginSuccess(data.user);
  } catch (err) {
    showLoginError(`Network error communicating with connector: ${err.message}`);
  } finally {
    btnText.innerText = 'Connect with Moodle Cookie';
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

// Copy Console Snippet to user's clipboard
function copyConsoleSnippet() {
  const snippet = document.getElementById('copy-script-text').innerText;
  navigator.clipboard.writeText(snippet).then(() => {
    const btn = document.getElementById('btn-copy-snippet');
    const orig = btn.innerText;
    btn.innerText = 'Copied!';
    btn.className = 'px-2 py-1 rounded bg-emerald-600 text-white text-[10px] shrink-0';
    setTimeout(() => {
      btn.innerText = orig;
      btn.className = 'px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] shrink-0';
    }, 2000);
  });
}

// 2. Submit Security Token
async function handleTokenSubmit(event) {
  event.preventDefault();
  clearLoginError();

  const token = document.getElementById('input-token').value.trim();
  const moodleUrl = getTargetMoodleUrl();
  const btnText = document.getElementById('btn-token-text');
  const spinner = document.getElementById('btn-token-spinner');
  const submitBtn = document.getElementById('btn-token-submit');

  if (!token) {
    showLoginError('Please paste your Moodle Security Token.');
    return;
  }

  btnText.innerText = 'Verifying Token with Moodle...';
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, moodle_url: moodleUrl })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { detail: `Server error (${res.status}). Check server logs.` };
    }

    if (!res.ok) {
      showLoginError(
        data.detail || 'Invalid Moodle Security Token.',
        'If the Moodle security token page is disabled by your school, please use the "Browser Cookie" tab above.'
      );
      return;
    }

    onLoginSuccess(data.user);
  } catch (err) {
    showLoginError(`Network error communicating with connector: ${err.message}`);
  } finally {
    btnText.innerText = 'Connect with Security Key';
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

// 3. Submit Username & Password
async function handleCredSubmit(event) {
  event.preventDefault();
  clearLoginError();

  const username = document.getElementById('input-username').value.trim();
  const password = document.getElementById('input-password').value;
  const moodleUrl = getTargetMoodleUrl();

  const btnText = document.getElementById('btn-cred-text');
  const spinner = document.getElementById('btn-cred-spinner');
  const submitBtn = document.getElementById('btn-cred-submit');

  btnText.innerText = 'Signing in to Moodle...';
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password, moodle_url: moodleUrl })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { detail: `Server error (${res.status}). Check server logs.` };
    }

    if (!res.ok) {
      showLoginError(
        data.detail || 'Authentication failed. Please verify your credentials.',
        '💡 Tip: Switch to the "Browser Cookie" tab to connect in seconds via your existing browser session.'
      );
      return;
    }

    onLoginSuccess(data.user);
  } catch (err) {
    showLoginError(`Network error communicating with connector: ${err.message}`);
  } finally {
    btnText.innerText = 'Sign In with Password';
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

function showLoginError(msg, hint = '') {
  const alert = document.getElementById('login-error-alert');
  const text = document.getElementById('login-error-text');
  const hintEl = document.getElementById('login-error-hint');
  text.innerText = msg;
  hintEl.innerText = hint;
  alert.classList.remove('hidden');
}

function clearLoginError() {
  const alert = document.getElementById('login-error-alert');
  alert.classList.add('hidden');
}

function fillDemoAndLogin() {
  setAuthMode('cookie');
  const cookieInput = document.getElementById('input-cookie');
  if (cookieInput) {
    cookieInput.value = 'mock_moodle_session_cookie_demo';
  }
  const form = document.getElementById('form-cookie-login');
  if (form) {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      handleCookieSubmit(new Event('submit'));
    }
  }
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  // Clear all device cache for security & privacy
  if (window.LocalCache) {
    await LocalCache.clearAll();
  }
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  currentUser = null;
  showGuestView();
  loadWorkspaceCourses();
});

function onLoginSuccess(user) {
  currentUser = user;

  // Header update
  document.getElementById('nav-user-pill').classList.remove('hidden');
  document.getElementById('nav-login-btn').classList.add('hidden');
  document.getElementById('nav-user-name').innerText = user.fullname || user.username;

  // Views switch
  document.getElementById('guest-view').classList.add('hidden');
  document.getElementById('auth-dashboard').classList.remove('hidden');

  // Dashboard header
  document.getElementById('dash-user-fullname').innerText = user.fullname || user.username;
  document.getElementById('dash-user-id').innerText = user.user_id;
  const siteLabel = user.site_name || user.site_url || 'Moodle LMS';
  document.getElementById('dash-site-name').innerText = siteLabel;
  document.getElementById('dash-user-site').innerText = `${siteLabel} • User ID: ${user.user_id}`;

  const avatarImg = document.getElementById('dash-user-avatar');
  const avatarLetter = document.getElementById('dash-avatar-letter');
  if (user.userpictureurl && !user.userpictureurl.includes('f2.png')) {
    avatarImg.src = user.userpictureurl;
    avatarImg.classList.remove('hidden');
    avatarLetter.classList.add('hidden');
  } else {
    avatarImg.classList.add('hidden');
    avatarLetter.classList.remove('hidden');
    avatarLetter.innerText = (user.fullname || user.username || 'U')[0].toUpperCase();
  }

  // Load Initial Academic Data
  loadWorkspaceCourses();
  loadCourses();
  loadAssignments();
  loadGrades();

  // Initialize Real-time Event-Driven Stream & Scan
  initEventStream();
  loadRecentEvents();
  setTimeout(() => scanForEvents(), 1500);
}

function showGuestView() {
  document.getElementById('nav-user-pill').classList.add('hidden');
  document.getElementById('nav-login-btn').classList.remove('hidden');
  document.getElementById('guest-view').classList.remove('hidden');
  document.getElementById('auth-dashboard').classList.add('hidden');
}

function openLoginModal() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// ⚡ EVENT-DRIVEN SSE & NOTIFICATIONS SYSTEM
// ==========================================

function initEventStream() {
  if (eventSource) {
    eventSource.close();
  }

  const sseBadge = document.getElementById('sse-status-badge');
  if (sseBadge) {
    sseBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800';
    sseBadge.innerText = '● SSE Stream Connected';
  }

  eventSource = new EventSource('/api/events/stream');

  eventSource.onopen = () => {
    if (sseBadge) {
      sseBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800';
      sseBadge.innerText = '● SSE Stream Active';
    }
  };

  eventSource.onerror = () => {
    if (sseBadge) {
      sseBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800';
      sseBadge.innerText = '● Reconnecting Stream...';
    }
  };

  // Generic message listener
  eventSource.onmessage = (e) => {
    try {
      const eventData = JSON.parse(e.data);
      handleIncomingEvent(eventData);
    } catch (err) {}
  };

  // Specific event types
  ['assignment.due_soon', 'assignment.urgent', 'grade.new', 'system.connected', 'workspace.synced', 'topic.update_available', 'mix.ready'].forEach(type => {
    eventSource.addEventListener(type, (e) => {
      try {
        const eventData = JSON.parse(e.data);
        handleIncomingEvent(eventData);
        if (type === 'workspace.synced' || type === 'topic.update_available' || type === 'mix.ready') {
          loadWorkspaceCourses();
        }
      } catch (err) {}
    });
  });
}

function initWorkspaceEventStream() {
  if (workspaceEventSource) {
    workspaceEventSource.close();
  }
  try {
    workspaceEventSource = new EventSource('/api/workspace/events/stream');
    ['workspace.synced', 'topic.update_available', 'mix.ready'].forEach(type => {
      workspaceEventSource.addEventListener(type, (e) => {
        try {
          const eventData = JSON.parse(e.data);
          loadWorkspaceCourses();
          if (typeof showToast === 'function' && eventData.title) {
            showToast(eventData.title, eventData.message || '', eventData.severity || 'success');
          }
        } catch (err) {}
      });
    });
  } catch (e) {}
}

function handleIncomingEvent(event) {
  totalEventCount++;
  document.getElementById('stat-events-count').innerText = totalEventCount;

  // Add event to feed list
  prependEventToFeed(event);

  // Show floating toast notification
  showToast(event.title, event.message, event.severity);

  // If tab-events is not active, increment unread badge
  const eventsTab = document.getElementById('tab-events');
  if (eventsTab && eventsTab.classList.contains('hidden')) {
    unreadEventCount++;
    const badge = document.getElementById('badge-events-unread');
    if (badge) {
      badge.innerText = unreadEventCount;
      badge.classList.remove('hidden');
    }
  }
}

function prependEventToFeed(event) {
  const feedList = document.getElementById('events-feed-list');
  const emptyState = document.getElementById('events-empty-state');
  if (emptyState) emptyState.classList.add('hidden');
  if (!feedList) return;

  const card = document.createElement('div');
  const severityColors = {
    danger: 'border-red-800/80 bg-red-950/30 text-red-300',
    warning: 'border-amber-800/80 bg-amber-950/30 text-amber-300',
    success: 'border-emerald-800/80 bg-emerald-950/30 text-emerald-300',
    info: 'border-blue-800/80 bg-blue-950/30 text-blue-300'
  };
  const colorClass = severityColors[event.severity] || severityColors.info;

  const timeStr = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

  card.className = `p-3.5 rounded-xl border ${colorClass} flex items-start justify-between gap-3 text-xs transition-all animate-fadeIn`;
  card.innerHTML = `
    <div>
      <span class="font-bold block text-white text-xs mb-0.5">${escapeHtml(event.title)}</span>
      <p class="text-slate-300 text-[11px]">${escapeHtml(event.message)}</p>
    </div>
    <span class="text-[10px] font-mono text-slate-400 shrink-0">${timeStr}</span>
  `;
  feedList.insertBefore(card, feedList.firstChild);
}

async function loadRecentEvents() {
  try {
    const res = await fetch('/api/events');
    if (!res.ok) return;
    const events = await res.json();
    totalEventCount = events.length;
    document.getElementById('stat-events-count').innerText = totalEventCount;
    events.forEach(e => prependEventToFeed(e));
  } catch (err) {}
}

async function scanForEvents() {
  const btn = document.getElementById('btn-scan-events');
  const orig = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span class="animate-spin mr-1">↻</span> Scanning...';

  try {
    const res = await fetch('/api/events/scan', { method: 'POST' });
    if (res.ok) {
      const newEvents = await res.json();
      if (newEvents.length === 0) {
        showToast('All Caught Up! 🎯', 'No approaching deadlines or new unread grades found.', 'info');
      }
    }
  } catch (err) {
    showToast('Scan Error', err.message, 'danger');
  } finally {
    if (btn) btn.innerHTML = orig;
  }
}

async function triggerTestEvent() {
  try {
    const res = await fetch('/api/events/test', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to dispatch test event');
  } catch (err) {
    showToast('Error', err.message, 'danger');
  }
}

async function handleWebhookSubmit(event) {
  event.preventDefault();
  const url = document.getElementById('input-webhook-url').value.trim();
  const statusEl = document.getElementById('webhook-status-msg');
  if (!url) return;

  try {
    const res = await fetch('/api/events/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });
    if (res.ok) {
      statusEl.innerText = `✓ Webhook successfully connected to: ${url}`;
      statusEl.classList.remove('hidden');
      setTimeout(() => statusEl.classList.add('hidden'), 5000);
      document.getElementById('input-webhook-url').value = '';
    }
  } catch (err) {
    alert(`Failed to save webhook: ${err.message}`);
  }
}

function showToast(title, message, severity = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const severityColors = {
    danger: 'bg-red-950/90 border-red-700 text-red-200',
    warning: 'bg-amber-950/90 border-amber-700 text-amber-200',
    success: 'bg-emerald-950/90 border-emerald-700 text-emerald-200',
    info: 'bg-slate-900/95 border-blue-600 text-slate-100'
  };
  const color = severityColors[severity] || severityColors.info;

  toast.className = `p-4 rounded-xl border ${color} shadow-2xl backdrop-blur-md text-xs flex items-start gap-3 pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `
    <div class="flex-1">
      <strong class="block font-bold text-white mb-0.5 text-xs">${escapeHtml(title)}</strong>
      <p class="text-[11px] opacity-90">${escapeHtml(message)}</p>
    </div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white text-sm leading-none">&times;</button>
  `;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// System Health & Latency
async function initSystemHealth() {
  const dot = document.getElementById('conn-status-dot');
  const text = document.getElementById('conn-status-text');

  try {
    const res = await fetch('/api/system/health');
    const data = await res.json();

    if (data.status === 'healthy') {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
      text.innerText = `Connected (${data.latency_ms}ms)`;
    } else if (data.status === 'degraded') {
      dot.className = 'w-2 h-2 rounded-full bg-amber-400';
      text.innerText = `Degraded (${data.latency_ms}ms)`;
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-red-500';
      text.innerText = 'Unreachable';
    }

    const diagLatency = document.getElementById('diag-latency');
    if (diagLatency) diagLatency.innerText = `${data.latency_ms} ms`;
  } catch (err) {
    dot.className = 'w-2 h-2 rounded-full bg-red-500';
    text.innerText = 'Offline';
  }
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-all whitespace-nowrap';
  });

  document.getElementById(tabId).classList.remove('hidden');
  const activeBtn = document.getElementById(`tab-btn-${tabId.replace('tab-', '')}`);
  if (activeBtn) {
    activeBtn.className = 'tab-btn active px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 transition-all whitespace-nowrap';
  }

  // Clear unread event count if switching to events tab
  if (tabId === 'tab-events') {
    unreadEventCount = 0;
    const badge = document.getElementById('badge-events-unread');
    if (badge) badge.classList.add('hidden');
  }
}

let currentWorkspaceCoursesList = [];

// 1. Fetch & Render Courses (with LocalCache support, Cross-referencing DB Workspaces & AI Builder)
async function loadCourses() {
  const loading = document.getElementById('courses-loading');
  const grid = document.getElementById('courses-grid');

  // Try instant rendering from LocalCache in 0ms!
  if (window.LocalCache) {
    const cachedCourses = await LocalCache.getCourses();
    if (cachedCourses && cachedCourses.length > 0) {
      renderCoursesGrid(cachedCourses);
      loading.classList.add('hidden');
      grid.classList.remove('hidden');
    }
  }

  try {
    const [coursesRes, wsRes] = await Promise.all([
      fetch('/api/courses'),
      fetch('/api/workspace/courses').catch(() => null)
    ]);

    if (!coursesRes.ok) throw new Error('Failed to load courses');
    const courses = await coursesRes.json();
    if (wsRes && wsRes.ok) {
      currentWorkspaceCoursesList = await wsRes.json();
    }

    document.getElementById('stat-courses-count').innerText = courses.length;
    renderCoursesGrid(courses);

    // Update LocalCache
    if (window.LocalCache) {
      await LocalCache.setCourses(courses);
    }

    loading.classList.add('hidden');
    grid.classList.remove('hidden');
  } catch (err) {
    if (grid.children.length === 0) {
      loading.innerText = `Error: ${err.message}`;
    }
  }
}

function renderCoursesGrid(courses) {
  const grid = document.getElementById('courses-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (courses.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400 text-sm">No active course enrollments found.</div>';
    return;
  }

  const authSlug = document.body.dataset.authoritySlug || 'ucu';

  courses.forEach(c => {
    const card = document.createElement('div');
    card.className = 'glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-slate-600 transition-all group';
    const progressVal = c.progress !== null ? Math.round(c.progress) : 0;
    
    // Check if this course already exists in the local database workspace
    const existingWs = (currentWorkspaceCoursesList || []).find(w => String(w.course_id) === String(c.id));
    const isCreated = !!existingWs;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-blue-400 border border-slate-700">
            ${escapeHtml(c.shortname || 'COURSE')}
          </span>
          <div class="flex items-center gap-1.5">
            ${isCreated
              ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><span>✅ Вже в базі</span></span>'
              : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><span>⚡ Ще не створено</span></span>'}
            ${c.completed ? '<span class="text-[10px] text-emerald-400 font-semibold">✓ Завершено</span>' : ''}
          </div>
        </div>
        <h3 class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
          ${escapeHtml(c.fullname)}
        </h3>
        <p class="text-xs text-slate-400 line-clamp-3 mb-4">
          ${c.summary ? escapeHtml(stripHtml(c.summary)) : 'Опис курсу не надано.'}
        </p>
      </div>

      <div>
        ${c.progress !== null ? `
          <div class="mb-4">
            <div class="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Прогрес</span>
              <span class="font-mono">${progressVal}%</span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${progressVal}%"></div>
            </div>
          </div>
        ` : ''}

        <div class="space-y-2">
          ${isCreated ? `
            <div class="flex items-center gap-2">
              <a href="/${authSlug}/courses/${c.id}"
                class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20">
                <span>Відкрити Workspace ↗</span>
              </a>
              <button onclick="openAiCourseBuilder(${c.id}, '${escapeQuotes(c.fullname)}', '${escapeQuotes(c.shortname || '')}')"
                title="Реструктуризувати або оновити через AI"
                class="px-2.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-white border border-indigo-800/60 text-xs font-semibold transition-all shrink-0 flex items-center gap-1">
                <span>✨ AI</span>
              </button>
              <button onclick="openCourseDetails(${c.id}, '${escapeQuotes(c.fullname)}', '${escapeQuotes(c.shortname || '')}')"
                title="Перегляд матеріалів Moodle"
                class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
          ` : `
            <div class="flex items-center gap-2">
              <button onclick="openAiCourseBuilder(${c.id}, '${escapeQuotes(c.fullname)}', '${escapeQuotes(c.shortname || '')}')"
                class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20">
                <span>✨ Створити через AI</span>
              </button>
              <button onclick="openCourseDetails(${c.id}, '${escapeQuotes(c.fullname)}', '${escapeQuotes(c.shortname || '')}')"
                title="Перегляд матеріалів Moodle"
                class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
          `}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// 2. Fetch & Render Course Content Modal
async function openCourseDetails(courseId, courseTitle, courseCode) {
  const modal = document.getElementById('course-modal');
  const title = document.getElementById('modal-course-title');
  const code = document.getElementById('modal-course-code');
  const body = document.getElementById('modal-course-body');

  title.innerText = courseTitle;
  code.innerText = courseCode;
  body.innerHTML = '<div class="py-12 text-center text-slate-400">Loading course materials and sections...</div>';
  modal.classList.remove('hidden');

  try {
    const res = await fetch(`/api/courses/${courseId}/contents`);
    if (!res.ok) throw new Error('Failed to load course contents');
    const sections = await res.json();

    body.innerHTML = '';
    if (sections.length === 0) {
      body.innerHTML = '<div class="py-8 text-center text-slate-400">No content or sections in this course.</div>';
    } else {
      sections.forEach(s => {
        const secDiv = document.createElement('div');
        secDiv.className = 'border border-slate-800 rounded-xl p-4 bg-slate-900/50 space-y-3';
        
        let modulesHtml = '';
        if (s.modules && s.modules.length > 0) {
          modulesHtml = s.modules.map(m => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-blue-300">
                  ${m.modname}
                </span>
                <span class="text-xs text-slate-200 truncate">${escapeHtml(m.name)}</span>
              </div>
              ${m.url ? `
                <a href="${m.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-400 hover:text-blue-300 shrink-0 ml-2">
                  Open ↗
                </a>
              ` : ''}
            </div>
          `).join('');
        } else {
          modulesHtml = '<p class="text-[11px] text-slate-500 italic">No resources or activities in this section.</p>';
        }

        secDiv.innerHTML = `
          <h4 class="text-xs font-bold text-white uppercase tracking-wider">${escapeHtml(s.name)}</h4>
          ${s.summary ? `<p class="text-[11px] text-slate-400">${escapeHtml(stripHtml(s.summary))}</p>` : ''}
          <div class="space-y-1.5 pt-1">${modulesHtml}</div>
        `;
        body.appendChild(secDiv);
      });
    }
  } catch (err) {
    body.innerHTML = `<div class="py-8 text-center text-red-400">Failed to load syllabus: ${err.message}</div>`;
  }
}

function closeCourseModal() {
  document.getElementById('course-modal').classList.add('hidden');
}

// 3. Fetch & Render Assignments
async function loadAssignments() {
  const loading = document.getElementById('assignments-loading');
  const list = document.getElementById('assignments-list');
  const badge = document.getElementById('assignments-badge-count');

  // Try instant rendering from LocalCache in 0ms!
  if (window.LocalCache) {
    const cached = await LocalCache.getAssignments('all');
    if (cached) {
      renderAssignmentsList(cached);
      loading.classList.add('hidden');
      list.classList.remove('hidden');
    }
  }

  try {
    const res = await fetch('/api/assignments');
    if (!res.ok) throw new Error('Failed to load assignments');
    const data = await res.json();

    renderAssignmentsList(data);

    // Save to LocalCache
    if (window.LocalCache) {
      await LocalCache.setAssignments('all', data);
    }

    loading.classList.add('hidden');
    list.classList.remove('hidden');
  } catch (err) {
    if (list.children.length === 0) {
      loading.innerText = `Error: ${err.message}`;
    }
  }
}

function renderAssignmentsList(data) {
  const list = document.getElementById('assignments-list');
  const badge = document.getElementById('assignments-badge-count');
  if (!list) return;

  if (badge) badge.innerText = `${data.total_count || 0} tasks`;
  const statCount = document.getElementById('stat-assignments-count');
  if (statCount) statCount.innerText = data.total_count || 0;
  list.innerHTML = '';

  if (!data.assignments || data.assignments.length === 0) {
    list.innerHTML = '<div class="glass-panel p-8 text-center text-slate-400 text-sm rounded-2xl">No upcoming assignment deadlines found! 🎉</div>';
  } else {
    data.assignments.forEach(a => {
      const item = document.createElement('div');
      const isOverdue = a.is_overdue;
      const borderClass = isOverdue ? 'border-red-900/50 hover:border-red-800' : 'border-slate-800 hover:border-slate-700';

      item.className = `glass-panel p-4 rounded-xl border ${borderClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all`;
      item.innerHTML = `
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300">
              ${escapeHtml(a.course_shortname)}
            </span>
            ${isOverdue ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">OVERDUE</span>' : ''}
          </div>
          <h4 class="text-xs font-bold text-white">${escapeHtml(a.name)}</h4>
          <p class="text-[11px] text-slate-400">Due: <span class="font-mono text-slate-200">${a.duedate_formatted || 'No deadline'}</span></p>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            ${a.submitted ? '<span class="text-emerald-400 font-semibold">✓ Submitted</span>' : '<span class="text-amber-400 font-semibold">Pending</span>'}
          </span>
          ${a.url ? `
            <a href="${a.url}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all">
              Submit ↗
            </a>
          ` : ''}
        </div>
      `;
      list.appendChild(item);
    });
  }
}

// 4. Fetch & Render Grades
async function loadGrades() {
  const loading = document.getElementById('grades-loading');
  const container = document.getElementById('grades-container');

  // Try instant rendering from LocalCache in 0ms!
  if (window.LocalCache) {
    const cached = await LocalCache.getGrades('all');
    if (cached) {
      renderGradesContainer(cached);
      loading.classList.add('hidden');
      container.classList.remove('hidden');
    }
  }

  try {
    const res = await fetch('/api/grades');
    if (!res.ok) throw new Error('Failed to load grades');
    const data = await res.json();

    renderGradesContainer(data);

    // Save to LocalCache
    if (window.LocalCache) {
      await LocalCache.setGrades('all', data);
    }

    loading.classList.add('hidden');
    container.classList.remove('hidden');
  } catch (err) {
    if (container.children.length === 0) {
      loading.innerText = `Error: ${err.message}`;
    }
  }
}

function renderGradesContainer(data) {
  const container = document.getElementById('grades-container');
  if (!container) return;
  container.innerHTML = '';

  if (!data.courses || data.courses.length === 0) {
    container.innerHTML = '<div class="glass-panel p-8 text-center text-slate-400 text-sm rounded-2xl">No grade reports available.</div>';
  } else {
    data.courses.forEach(c => {
      const block = document.createElement('div');
      block.className = 'glass-panel p-6 rounded-2xl space-y-3';

      let rowsHtml = '';
      if (c.grade_items && c.grade_items.length > 0) {
        rowsHtml = c.grade_items.map(g => `
          <tr class="border-b border-slate-800/80 hover:bg-slate-900/40">
            <td class="py-3 px-4 font-medium text-slate-200">${escapeHtml(g.itemname || 'Item')}</td>
            <td class="py-3 px-4 text-right font-mono font-semibold text-white">${escapeHtml(g.gradeformatted || '--')}</td>
            <td class="py-3 px-4 text-right font-mono text-blue-400">${escapeHtml(g.percentageformatted || '--')}</td>
            <td class="py-3 px-4 text-slate-400 italic">${g.feedback ? escapeHtml(g.feedback) : '--'}</td>
          </tr>
        `).join('');
      } else {
        rowsHtml = '<tr><td colspan="4" class="py-4 text-center text-slate-500 italic">No evaluated items published yet.</td></tr>';
      }

      block.innerHTML = `
        <h4 class="text-sm font-bold text-white border-b border-slate-800 pb-2">${escapeHtml(c.course_fullname)}</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-2 px-4">Evaluation Item</th>
                <th class="py-2 px-4 text-right">Score</th>
                <th class="py-2 px-4 text-right">Percentage</th>
                <th class="py-2 px-4">Feedback</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
      container.appendChild(block);
    });
  }
}

function refreshDashboardData() {
  loadWorkspaceCourses();
  loadCourses();
  loadAssignments();
  loadGrades();
  initSystemHealth();
  scanForEvents();
}

async function runDiagnosticsCheck() {
  const diagLatency = document.getElementById('diag-latency');
  diagLatency.innerText = 'Testing...';
  await initSystemHealth();
}

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeQuotes(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function stripHtml(html) {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Universal Moodle Compatibility Prober
async function testUrlCompatibility() {
  const url = getTargetMoodleUrl();
  const resultBox = document.getElementById('url-inspect-result');
  const btn = document.getElementById('btn-quick-inspect');

  if (!url) {
    if (resultBox) {
      resultBox.classList.remove('hidden');
      resultBox.className = 'text-xs rounded-xl p-3 border border-amber-800 bg-amber-950/40 text-amber-300';
      resultBox.innerHTML = '⚠️ Please enter a URL first.';
    }
    return;
  }

  if (btn) btn.disabled = true;
  if (resultBox) {
    resultBox.classList.remove('hidden');
    resultBox.className = 'text-xs rounded-xl p-3 border border-blue-800 bg-blue-950/40 text-blue-300 flex items-center gap-2';
    resultBox.innerHTML = '<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"></span> Probing ' + escapeHtml(url) + '...';
  }

  try {
    const res = await fetch(`/api/system/inspect?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (data.is_moodle) {
      resultBox.className = 'text-xs rounded-xl p-3 border border-emerald-800 bg-emerald-950/40 text-emerald-200 space-y-1.5';
      resultBox.innerHTML = `
        <div class="flex items-center justify-between font-semibold">
          <span class="flex items-center gap-1.5">✅ Moodle LMS Verified (${escapeHtml(data.engine_detected)})</span>
          <span class="font-mono text-[11px] text-emerald-400">${data.latency_ms} ms</span>
        </div>
        <p class="text-[11px] text-emerald-300/90">${escapeHtml(data.recommendation)}</p>
        <div class="flex flex-wrap gap-2 pt-1 text-[10px]">
          <span class="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-700">Cookie Login: ${data.has_moodle_session_cookie || data.has_login_php ? 'Supported ✓' : 'Partial'}</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-700">REST API: ${data.has_rest_webservice ? 'Ready ✓' : 'Standard'}</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-700">Mobile Token: ${data.has_token_service ? 'Active ✓' : 'Protected'}</span>
        </div>
      `;
    } else {
      resultBox.className = 'text-xs rounded-xl p-3 border border-rose-800 bg-rose-950/40 text-rose-200 space-y-1';
      resultBox.innerHTML = `
        <div class="flex items-center justify-between font-semibold">
          <span>❌ Non-Moodle System Detected</span>
          <span class="font-mono text-[11px] text-rose-400">${data.latency_ms} ms</span>
        </div>
        <p class="text-[11px] text-rose-300/90">${escapeHtml(data.recommendation)}</p>
        <p class="text-[10px] text-slate-400 pt-1">
          Detected: <strong class="text-white">${escapeHtml(data.engine_detected)}</strong>.
          This portal does not provide Moodle REST APIs or MoodleSession cookies.
        </p>
      `;
    }
  } catch (err) {
    if (resultBox) {
      resultBox.className = 'text-xs rounded-xl p-3 border border-rose-800 bg-rose-950/40 text-rose-300';
      resultBox.innerHTML = `❌ Inspection error: ${escapeHtml(err.message)}`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

function probePreset(url) {
  const input = document.getElementById('input-probe-url');
  if (input) {
    input.value = url;
    runLmsProbe();
  }
}

async function runLmsProbe() {
  const input = document.getElementById('input-probe-url');
  const resultsDiv = document.getElementById('probe-results');
  const spinner = document.getElementById('probe-spinner');
  const btn = document.getElementById('btn-run-probe');

  if (!input || !resultsDiv) return;
  const url = input.value.trim();
  if (!url) {
    alert('Please enter or select a university URL to probe.');
    return;
  }

  if (spinner) spinner.classList.remove('hidden');
  if (btn) btn.disabled = true;
  resultsDiv.classList.remove('hidden');
  resultsDiv.innerHTML = `<div class="text-slate-400 text-xs py-2 flex items-center gap-2"><span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full"></span> Probing ${escapeHtml(url)} across 4 endpoints...</div>`;

  try {
    const res = await fetch(`/api/system/inspect?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    const isSuccess = data.is_moodle;
    const badgeColor = isSuccess ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    const statusText = isSuccess ? 'MOODLE LMS DETECTED' : 'NON-MOODLE / PROPRIETARY';

    resultsDiv.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}">${statusText}</span>
            <span class="font-bold text-white text-sm">${escapeHtml(data.engine_detected)}</span>
          </div>
          <span class="text-[11px] font-mono text-slate-400 break-all">${escapeHtml(data.target_url)}</span>
        </div>
        <div class="text-right">
          <span class="text-slate-500 text-[10px] block uppercase font-mono">Latency</span>
          <span class="font-mono font-semibold text-emerald-400 text-xs">${data.latency_ms} ms</span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
        <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <span class="block text-[10px] text-slate-500 uppercase">MoodleSession</span>
          <span class="${data.has_moodle_session_cookie ? 'text-emerald-400 font-semibold' : 'text-slate-400'}">
            ${data.has_moodle_session_cookie ? '✓ Detected' : 'Not Set in Root'}
          </span>
        </div>
        <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <span class="block text-[10px] text-slate-500 uppercase">/login/index.php</span>
          <span class="${data.has_login_php ? 'text-emerald-400 font-semibold' : 'text-rose-400'}">
            ${data.has_login_php ? '✓ 200 OK' : '✗ 404 / Missing'}
          </span>
        </div>
        <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <span class="block text-[10px] text-slate-500 uppercase">/login/token.php</span>
          <span class="${data.has_token_service ? 'text-emerald-400 font-semibold' : 'text-amber-400'}">
            ${data.has_token_service ? '✓ Active' : 'Restricted'}
          </span>
        </div>
        <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <span class="block text-[10px] text-slate-500 uppercase">Webservice REST</span>
          <span class="${data.has_rest_webservice ? 'text-emerald-400 font-semibold' : 'text-amber-400'}">
            ${data.has_rest_webservice ? '✓ Available' : 'Disabled'}
          </span>
        </div>
      </div>

      <div class="p-3 rounded-lg ${isSuccess ? 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-300' : 'bg-rose-950/30 border border-rose-900/40 text-rose-300'} text-xs">
        ${escapeHtml(data.recommendation)}
      </div>
    `;
  } catch (err) {
    resultsDiv.innerHTML = `<div class="text-rose-400 text-xs">Probe failed: ${escapeHtml(err.message)}</div>`;
  } finally {
    if (spinner) spinner.classList.add('hidden');
    if (btn) btn.disabled = false;
  }
}

// ==========================================
// 📚 AI STUDY WORKSPACES & COURSE CREATOR
// ==========================================

let createCourseMode = 'file';
let selectedUploadFile = null;

async function loadWorkspaceCourses() {
  const guestContainer = document.getElementById('guest-workspace-courses');
  const authContainer = document.getElementById('auth-workspace-courses');
  const guestBadge = document.getElementById('guest-workspace-count');
  const authBadge = document.getElementById('auth-workspace-count');

  try {
    const res = await fetch('/api/workspace/courses');
    if (!res.ok) return;
    const courses = await res.json();
    currentWorkspaceCoursesList = courses;

    if (guestBadge) guestBadge.innerText = courses.length;
    if (authBadge) authBadge.innerText = courses.length;

    renderWorkspaceCards(guestContainer, courses, false);
    renderWorkspaceCards(authContainer, courses, true);
  } catch (err) {
    if (guestContainer) {
      guestContainer.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">Unable to reach workspace store right now.</div>`;
    }
  }
}

function renderWorkspaceCards(container, courses, compactGrid) {
  if (!container) return;
  if (!courses || courses.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-2">
        <p class="text-xs font-semibold text-slate-300">No courses in your workspace yet</p>
        <p class="text-[11px] text-slate-500">Sync a course using the Chrome Extension from Moodle, or click <strong>+ Import / Create Course</strong> above to upload PDFs/slides/notes.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  courses.forEach(c => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-3';

    const sourceBadge = c.source_type === 'moodle_extension'
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">EXTENSION SYNC</span>'
      : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">FILE IMPORT</span>';

    const updateBadge = c.updates_pending > 0
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">${c.updates_pending} update(s)</span>`
      : '';

    const shieldBadge = c.blocked_quizzes_count > 0
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/70 text-purple-300 border border-purple-800/60" title="Restricted exams shielded">🛡️ ${c.blocked_quizzes_count} shielded</span>`
      : '';

    card.innerHTML = `
      <div class="${compactGrid ? '' : 'flex flex-col sm:flex-row sm:items-center justify-between gap-3'}">
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-blue-300">${escapeHtml(c.shortname || 'COURSE')}</span>
            ${sourceBadge}
            ${updateBadge}
            ${shieldBadge}
          </div>
          <h4 class="text-sm font-bold text-white truncate">${escapeHtml(c.title)}</h4>
          <p class="text-[11px] text-slate-400">
            ${c.topic_count} topics • ${c.has_exam_mix ? '🎯 Exam Mix Ready' : 'Study Pack'} • 🔒 ${escapeHtml(c.visibility)}
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0 ${compactGrid ? 'pt-2' : ''}">
          <a href="/${encodeURIComponent(c.authority || 'custom')}/courses/${c.course_id}"
            class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 whitespace-nowrap">
            Open Study Workspace ↗
          </a>
          <button type="button" onclick="deleteWorkspaceCourse(${c.course_id})" title="Delete Workspace"
            class="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function toggleExtensionGuide() {
  const el = document.getElementById('extension-install-guide');
  if (el) el.classList.toggle('hidden');
}

function openCreateCourseModal() {
  const modal = document.getElementById('create-course-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeCreateCourseModal() {
  const modal = document.getElementById('create-course-modal');
  if (modal) modal.classList.add('hidden');
}

function setCreateMode(mode) {
  createCourseMode = mode;
  const fileBtn = document.getElementById('btn-import-file');
  const textBtn = document.getElementById('btn-import-text');
  const fileZone = document.getElementById('create-mode-file');
  const textZone = document.getElementById('create-mode-text');

  if (fileBtn) fileBtn.className = mode === 'file' ? 'py-2 rounded-lg bg-blue-600 text-white transition-all' : 'py-2 rounded-lg text-slate-400 hover:text-white transition-all';
  if (textBtn) textBtn.className = mode === 'text' ? 'py-2 rounded-lg bg-blue-600 text-white transition-all' : 'py-2 rounded-lg text-slate-400 hover:text-white transition-all';
  if (fileZone) fileZone.classList.toggle('hidden', mode !== 'file');
  if (textZone) textZone.classList.toggle('hidden', mode !== 'text');
}

function initDropzoneHandlers() {
  const dropzone = document.getElementById('upload-dropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach(evName => {
    dropzone.addEventListener(evName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('border-blue-500', 'bg-blue-950/20');
    });
  });

  ['dragleave', 'drop'].forEach(evName => {
    dropzone.addEventListener(evName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('border-blue-500', 'bg-blue-950/20');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      selectedUploadFile = files[0];
      const lbl = document.getElementById('upload-file-label');
      if (lbl) lbl.innerText = `Selected: ${selectedUploadFile.name} (${Math.round(selectedUploadFile.size / 1024)} KB)`;
    }
  });
}

function onCourseFileSelected(input) {
  if (input.files && input.files.length > 0) {
    selectedUploadFile = input.files[0];
    const lbl = document.getElementById('upload-file-label');
    if (lbl) lbl.innerText = `Selected: ${selectedUploadFile.name} (${Math.round(selectedUploadFile.size / 1024)} KB)`;
  }
}

function readCourseToolCheckboxes() {
  const readBool = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.checked : fallback;
  };
  return {
    interactive_book: readBool('tool-interactive_book', true),
    mermaid_diagrams: readBool('tool-mermaid_diagrams', true),
    visual_cards: readBool('tool-visual_cards', true),
    practice_quizzes: readBool('tool-practice_quizzes', true),
    flashcards: readBool('tool-flashcards', false),
    exam_mix: readBool('tool-exam_mix', true),
    deadline_tracker: true,
  };
}

async function handleCreateCourseSubmit(event) {
  event.preventDefault();
  const title = (document.getElementById('create-course-title')?.value || '').trim();
  const shortname = (document.getElementById('create-course-short')?.value || 'STUDY').trim();
  const authSlug = document.body.dataset.authoritySlug || 'custom';
  const tools = readCourseToolCheckboxes();
  const btn = document.getElementById('btn-create-course-submit');

  if (!title) return;
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Building Study Workspace...';
  }

  try {
    let res;
    if (createCourseMode === 'file') {
      if (!selectedUploadFile) {
        alert('Please drop or select a file (or switch to Paste Notes).');
        return;
      }
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      formData.append('course_title', title);
      formData.append('shortname', shortname);
      formData.append('authority', authSlug);
      formData.append('tools_json', JSON.stringify(tools));
      res = await fetch('/api/workspace/courses/upload', { method: 'POST', body: formData });
    } else {
      const contentText = (document.getElementById('input-course-notes-text')?.value || '').trim();
      if (!contentText) {
        alert('Please paste some study notes or syllabus text.');
        return;
      }
      res = await fetch('/api/workspace/courses/create-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          shortname,
          authority: authSlug,
          content_text: contentText,
          tools_config: tools,
        }),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create workspace');

    closeCreateCourseModal();
    selectedUploadFile = null;
    await loadWorkspaceCourses();
    if (data.workspace_url) {
      window.location.href = data.workspace_url;
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Build Study Workspace';
    }
  }
}

async function deleteWorkspaceCourse(courseId) {
  if (!confirm('Delete this private workspace and its generated mixes?')) return;
  try {
    const res = await fetch(`/api/workspace/courses/${courseId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadWorkspaceCourses();
      await loadCourses();
    }
  } catch (err) {}
}

// ========================================================
// AI COURSE ARCHITECT & SYLLABUS BUILDER (PREVIEW & CONFIRM)
// ========================================================

let currentAiCourse = null;
let currentAiTargetScore = 85;
let currentAiGeneratedStructure = null;

function setAiTargetScore(score) {
  currentAiTargetScore = score;
  const btns = document.querySelectorAll('#ai-target-score-btns .score-btn');
  btns.forEach(btn => {
    const btnScore = parseInt(btn.dataset.score, 10);
    if (btnScore === score) {
      btn.className = 'score-btn active px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-600 text-white border border-blue-500 shadow transition-all';
    } else {
      btn.className = 'score-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-all';
    }
  });
}

function toggleAiCustomSyllabus() {
  const panel = document.getElementById('ai-custom-syllabus-panel');
  if (panel) {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      const input = document.getElementById('ai-custom-syllabus-input');
      if (input) input.focus();
    }
  }
}

function saveGeminiApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem('gemini_api_key', key.trim());
    showToast('✨ Gemini API ключ збережено');
  } else {
    localStorage.removeItem('gemini_api_key');
  }
}

function getGeminiApiKey() {
  const input = document.getElementById('ai-gemini-api-key');
  if (input && input.value.trim()) {
    return input.value.trim();
  }
  return localStorage.getItem('gemini_api_key') || null;
}

function openAiCourseBuilder(courseId, courseTitle, courseShortname) {
  const authSlug = document.body.dataset.authoritySlug || 'ucu';
  currentAiCourse = {
    course_id: courseId,
    title: courseTitle,
    shortname: courseShortname || 'COURSE',
    authority: authSlug
  };
  currentAiGeneratedStructure = null;

  const titleEl = document.getElementById('ai-modal-course-title');
  const codeEl = document.getElementById('ai-modal-course-code');
  if (titleEl) titleEl.innerText = courseTitle;
  if (codeEl) codeEl.innerText = courseShortname || 'COURSE';

  // Restore Gemini API key from localStorage
  const geminiInput = document.getElementById('ai-gemini-api-key');
  if (geminiInput) {
    geminiInput.value = localStorage.getItem('gemini_api_key') || '';
  }

  // Reset custom syllabus input & panel
  const customInput = document.getElementById('ai-custom-syllabus-input');
  if (customInput) customInput.value = '';
  const customPanel = document.getElementById('ai-custom-syllabus-panel');
  if (customPanel) customPanel.classList.add('hidden');

  setAiTargetScore(85);

  const modal = document.getElementById('ai-course-preview-modal');
  if (modal) modal.classList.remove('hidden');

  refreshAiStructurePreview();
}

function closeAiCoursePreviewModal() {
  const modal = document.getElementById('ai-course-preview-modal');
  if (modal) modal.classList.add('hidden');
  currentAiCourse = null;
  currentAiGeneratedStructure = null;
}

function getAiToolsConfig() {
  return {
    interactive_book: !!document.getElementById('ai-tool-interactive_book')?.checked,
    mermaid_diagrams: !!document.getElementById('ai-tool-mermaid_diagrams')?.checked,
    practice_quizzes: !!document.getElementById('ai-tool-practice_quizzes')?.checked,
    flashcards: !!document.getElementById('ai-tool-flashcards')?.checked,
    exam_mix: !!document.getElementById('ai-tool-exam_mix')?.checked,
    visual_cards: true
  };
}

async function refreshAiStructurePreview() {
  if (!currentAiCourse) return;

  const loading = document.getElementById('ai-preview-loading');
  const errorBox = document.getElementById('ai-preview-error');
  const errorMsg = document.getElementById('ai-preview-error-msg');
  const content = document.getElementById('ai-preview-content');
  const confirmBtn = document.getElementById('btn-confirm-ai-course');

  if (loading) loading.classList.remove('hidden');
  if (errorBox) errorBox.classList.add('hidden');
  if (content) content.classList.add('hidden');
  if (confirmBtn) confirmBtn.disabled = true;

  const customText = document.getElementById('ai-custom-syllabus-input')?.value.trim() || null;
  const tools = getAiToolsConfig();
  const geminiApiKey = getGeminiApiKey();

  try {
    const res = await fetch('/api/workspace/courses/preview-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: currentAiCourse.course_id,
        title: currentAiCourse.title,
        shortname: currentAiCourse.shortname,
        authority: currentAiCourse.authority,
        target_score: currentAiTargetScore,
        custom_syllabus_text: customText,
        tools: tools,
        gemini_api_key: geminiApiKey
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Помилка сервера' }));
      throw new Error(errData.detail || 'Не вдалося побудувати структуру');
    }

    const preview = await res.json();
    currentAiGeneratedStructure = preview;

    // Render Stats
    const topicsCountEl = document.getElementById('ai-stat-topics-count');
    const hoursCountEl = document.getElementById('ai-stat-hours-count');
    const targetScoreEl = document.getElementById('ai-stat-target-score');

    if (topicsCountEl) topicsCountEl.innerText = preview.topics.length;
    if (hoursCountEl) hoursCountEl.innerText = `${preview.estimated_total_hours} год`;
    if (targetScoreEl) targetScoreEl.innerText = `${preview.target_score}%`;

    // Render Topics Cards
    const topicsContainer = document.getElementById('ai-topics-container');
    if (topicsContainer) {
      topicsContainer.innerHTML = '';

      if (preview.topics.length === 0) {
        topicsContainer.innerHTML = `
          <div class="p-6 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-center text-xs text-slate-400">
            Теми не знайдено автоматично. Будь ласка, натисніть "📝 Текст силабусу" та вставте назви лекцій вручну.
          </div>
        `;
      } else {
        preview.topics.forEach((t, idx) => {
          const diffBadge = t.difficulty === 'advanced'
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">Advanced</span>'
            : t.difficulty === 'intermediate'
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">Intermediate</span>'
            : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">Beginner</span>';

          const conceptsBadges = (t.keywords || t.key_concepts || []).map(c => 
            `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-indigo-300 border border-slate-700/80">#${escapeHtml(c)}</span>`
          ).join(' ');

          const card = document.createElement('div');
          card.className = 'p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2';
          card.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                  ${t.topic_index || (idx + 1)}
                </span>
                <h5 class="text-sm font-bold text-white">${escapeHtml(t.title)}</h5>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                ${diffBadge}
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">⏱ ${t.estimated_hours} год</span>
              </div>
            </div>
            <p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(t.summary)}</p>
            ${conceptsBadges ? `
              <div class="pt-1 flex flex-wrap items-center gap-1">
                <span class="text-[10px] font-semibold text-slate-500 uppercase">Ключові концепти:</span>
                ${conceptsBadges}
              </div>
            ` : ''}
          `;
          topicsContainer.appendChild(card);
        });
      }
    }

    if (loading) loading.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    if (confirmBtn) confirmBtn.disabled = false;
  } catch (err) {
    if (loading) loading.classList.add('hidden');
    if (errorMsg) errorMsg.innerText = err.message || 'Сталася помилка при зверненні до сервера.';
    if (errorBox) errorBox.classList.remove('hidden');
    if (confirmBtn) confirmBtn.disabled = true;
  }
}

async function confirmAndBuildAiCourse() {
  if (!currentAiCourse || !currentAiGeneratedStructure) return;

  const btn = document.getElementById('btn-confirm-ai-course');
  const text = document.getElementById('btn-confirm-ai-text');
  const spinner = document.getElementById('btn-confirm-ai-spinner');

  if (btn) btn.disabled = true;
  if (text) text.innerText = 'Створюємо курс та генеруємо мікси...';
  if (spinner) spinner.classList.remove('hidden');

  try {
    const geminiApiKey = getGeminiApiKey();
    const payload = {
      course_id: currentAiCourse.course_id,
      title: currentAiCourse.title,
      shortname: currentAiCourse.shortname,
      authority: currentAiCourse.authority,
      target_score: currentAiTargetScore,
      topics: currentAiGeneratedStructure.topics,
      tools: getAiToolsConfig(),
      gemini_api_key: geminiApiKey
    };

    const res = await fetch('/api/workspace/courses/confirm-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Помилка збереження курсу' }));
      throw new Error(err.detail || 'Не вдалося створити курс');
    }

    const data = await res.json();
    showToast(`🎉 Курс "${escapeHtml(currentAiCourse.title)}" успішно створено! (${data.topics_created} тем)`);

    closeAiCoursePreviewModal();

    // Reload courses and workspace cards
    await Promise.all([
      loadWorkspaceCourses(),
      loadCourses()
    ]);

    // Redirect to newly created workspace
    if (data.workspace_url) {
      setTimeout(() => {
        window.location.href = data.workspace_url;
      }, 700);
    }
  } catch (err) {
    showToast(`Помилка: ${err.message}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (text) text.innerText = '🚀 Підтвердити та побудувати курс';
    if (spinner) spinner.classList.add('hidden');
  }
}


