// Universal Moodle Connector & Event-Driven Client

let currentUser = null;
let currentAuthMode = 'cookie'; // 'cookie', 'token', 'credentials'
let eventSource = null;
let totalEventCount = 0;
let unreadEventCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initSystemHealth();
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

  tabCookie.className = (mode === 'cookie') ? activeClass : inactiveClass;
  tabToken.className = (mode === 'token') ? activeClass : inactiveClass;
  tabCred.className = (mode === 'credentials') ? activeClass : inactiveClass;

  formCookie.classList.toggle('hidden', mode !== 'cookie');
  formToken.classList.toggle('hidden', mode !== 'token');
  formCred.classList.toggle('hidden', mode !== 'credentials');

  if (mode === 'cookie') document.getElementById('input-cookie').focus();
  else if (mode === 'token') document.getElementById('input-token').focus();
  else if (mode === 'credentials') document.getElementById('input-username').focus();
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
  document.getElementById('input-cookie').value = 'mock_moodle_session_cookie_demo';
  document.getElementById('form-cookie-login').dispatchEvent(new Event('submit', { cancelable: true }));
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
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  currentUser = null;
  showGuestView();
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
  ['assignment.due_soon', 'assignment.urgent', 'grade.new', 'system.connected'].forEach(type => {
    eventSource.addEventListener(type, (e) => {
      try {
        const eventData = JSON.parse(e.data);
        handleIncomingEvent(eventData);
      } catch (err) {}
    });
  });
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

// 1. Fetch & Render Courses
async function loadCourses() {
  const loading = document.getElementById('courses-loading');
  const grid = document.getElementById('courses-grid');
  loading.classList.remove('hidden');
  grid.classList.add('hidden');

  try {
    const res = await fetch('/api/courses');
    if (!res.ok) throw new Error('Failed to load courses');
    const courses = await res.json();

    document.getElementById('stat-courses-count').innerText = courses.length;
    grid.innerHTML = '';

    if (courses.length === 0) {
      grid.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400 text-sm">No active course enrollments found.</div>';
    } else {
      courses.forEach(c => {
        const card = document.createElement('div');
        card.className = 'glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-slate-600 transition-all group';
        const progressVal = c.progress !== null ? Math.round(c.progress) : 0;
        
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-blue-400 border border-slate-700">
                ${escapeHtml(c.shortname || 'COURSE')}
              </span>
              ${c.completed ? '<span class="text-[10px] text-emerald-400 font-semibold">✓ Completed</span>' : ''}
            </div>
            <h3 class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
              ${escapeHtml(c.fullname)}
            </h3>
            <p class="text-xs text-slate-400 line-clamp-3 mb-4">
              ${c.summary ? escapeHtml(stripHtml(c.summary)) : 'No description provided.'}
            </p>
          </div>

          <div>
            ${c.progress !== null ? `
              <div class="mb-4">
                <div class="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Progress</span>
                  <span class="font-mono">${progressVal}%</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${progressVal}%"></div>
                </div>
              </div>
            ` : ''}
            <button onclick="openCourseDetails(${c.id}, '${escapeQuotes(c.fullname)}', '${escapeQuotes(c.shortname || '')}')"
              class="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-blue-600 hover:text-white border border-slate-700/80 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5">
              <span>View Course Syllabus & Modules</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    loading.classList.add('hidden');
    grid.classList.remove('hidden');
  } catch (err) {
    loading.innerText = `Error: ${err.message}`;
  }
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
  loading.classList.remove('hidden');
  list.classList.add('hidden');

  try {
    const res = await fetch('/api/assignments');
    if (!res.ok) throw new Error('Failed to load assignments');
    const data = await res.json();

    badge.innerText = `${data.total_count} tasks`;
    document.getElementById('stat-assignments-count').innerText = data.total_count;
    list.innerHTML = '';

    if (data.assignments.length === 0) {
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

    loading.classList.add('hidden');
    list.classList.remove('hidden');
  } catch (err) {
    loading.innerText = `Error: ${err.message}`;
  }
}

// 4. Fetch & Render Grades
async function loadGrades() {
  const loading = document.getElementById('grades-loading');
  const container = document.getElementById('grades-container');
  loading.classList.remove('hidden');
  container.classList.add('hidden');

  try {
    const res = await fetch('/api/grades');
    if (!res.ok) throw new Error('Failed to load grades');
    const data = await res.json();

    container.innerHTML = '';

    if (data.courses.length === 0) {
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

    loading.classList.add('hidden');
    container.classList.remove('hidden');
  } catch (err) {
    loading.innerText = `Error: ${err.message}`;
  }
}

function refreshDashboardData() {
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
