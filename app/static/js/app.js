// Moodle Connector Client-Side Application (UCU Edition)

let currentUser = null;
let currentAuthMode = 'cookie'; // 'cookie' (default for Google SSO), 'token', 'credentials'

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
  const btnText = document.getElementById('btn-cookie-text');
  const spinner = document.getElementById('btn-cookie-spinner');
  const submitBtn = document.getElementById('btn-cookie-submit');

  if (!cookieVal) {
    showLoginError('Please paste your MoodleSession cookie.');
    return;
  }

  btnText.innerText = 'Connecting to UCU with Cookie...';
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: cookieVal })
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
        'Please make sure you are currently signed into learn.ucu.edu.ua in your browser, then re-copy the cookie.'
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
  const btnText = document.getElementById('btn-token-text');
  const spinner = document.getElementById('btn-token-spinner');
  const submitBtn = document.getElementById('btn-token-submit');

  if (!token) {
    showLoginError('Please paste your Moodle Security Token.');
    return;
  }

  btnText.innerText = 'Verifying Token with UCU...';
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token })
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
        'If the UCU token page is empty in your account, please use the "Browser Cookie" tab above.'
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
      body: JSON.stringify({ username: username, password: password })
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
        '💡 Tip: Switch to the "Browser Cookie" tab above to connect in seconds via your browser session.'
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
  document.getElementById('dash-user-site').innerText = `${user.site_url || 'learn.ucu.edu.ua'} • User ID: ${user.user_id}`;

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

  // Load Data
  loadCourses();
  loadAssignments();
  loadGrades();
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

// System Health & Latency
async function initSystemHealth() {
  const dot = document.getElementById('conn-status-dot');
  const text = document.getElementById('conn-status-text');

  try {
    const res = await fetch('/api/system/health');
    const data = await res.json();

    if (data.status === 'healthy') {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
      text.innerText = `UCU Connected (${data.latency_ms}ms)`;
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
    btn.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-all';
  });

  document.getElementById(tabId).classList.remove('hidden');
  const activeBtn = document.getElementById(`tab-btn-${tabId.replace('tab-', '')}`);
  if (activeBtn) {
    activeBtn.className = 'tab-btn active px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 transition-all';
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
      grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 text-sm">No courses enrolled currently.</div>';
    } else {
      courses.forEach(c => {
        const progressVal = Math.round(c.progress || 0);
        const card = document.createElement('div');
        card.className = 'glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 transition-all group';
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">${escapeHtml(c.shortname || 'COURSE')}</span>
              ${c.completed ? '<span class="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">✓ Completed</span>' : ''}
            </div>
            <h4 class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">${escapeHtml(c.fullname)}</h4>
            <div class="text-xs text-slate-400 line-clamp-3 mb-4">${c.summary ? stripHtml(c.summary) : 'No summary provided.'}</div>
          </div>
          <div>
            ${c.progress !== null && c.progress !== undefined ? `
              <div class="mb-4">
                <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Progress</span>
                  <span class="font-bold text-slate-200">${progressVal}%</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div class="bg-blue-500 h-1.5 rounded-full transition-all" style="width: ${progressVal}%"></div>
                </div>
              </div>
            ` : ''}
            <button onclick="openCourseDetails(${c.id}, '${escapeQuotes(c.fullname)}', '${escapeQuotes(c.shortname)}')"
              class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-slate-800 hover:border-blue-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5">
              <span>View Syllabus & Modules</span>
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

// 2. Fetch Course Details Modal
async function openCourseDetails(courseId, courseTitle, courseCode) {
  const modal = document.getElementById('course-modal');
  const titleEl = document.getElementById('modal-course-title');
  const codeEl = document.getElementById('modal-course-code');
  const bodyEl = document.getElementById('modal-course-body');

  titleEl.innerText = courseTitle;
  codeEl.innerText = courseCode;
  bodyEl.innerHTML = '<div class="py-12 text-center text-slate-400 text-sm">Fetching sections and syllabus from Moodle...</div>';
  modal.classList.remove('hidden');

  try {
    const res = await fetch(`/api/courses/${courseId}/contents`);
    if (!res.ok) throw new Error('Could not load course contents');
    const sections = await res.json();

    if (!sections || sections.length === 0) {
      bodyEl.innerHTML = '<div class="py-12 text-center text-slate-400 text-sm">No course contents found.</div>';
      return;
    }

    bodyEl.innerHTML = '';
    sections.forEach((sec, idx) => {
      const secDiv = document.createElement('div');
      secDiv.className = 'p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3';

      let modulesHtml = '';
      if (sec.modules && sec.modules.length > 0) {
        modulesHtml = sec.modules.map(mod => {
          let badgeColor = 'bg-slate-800 text-slate-300';
          let icon = '📄';
          if (mod.modname === 'assign') { badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30'; icon = '📝'; }
          else if (mod.modname === 'quiz') { badgeColor = 'bg-purple-500/20 text-purple-300 border border-purple-500/30'; icon = '❓'; }
          else if (mod.modname === 'forum') { badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'; icon = '💬'; }
          else if (mod.modname === 'resource') { badgeColor = 'bg-blue-500/20 text-blue-300 border border-blue-500/30'; icon = '📁'; }

          return `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div class="flex items-center gap-2.5">
                <span class="text-base">${icon}</span>
                <div>
                  <span class="font-medium text-slate-200 block">${escapeHtml(mod.name)}</span>
                  ${mod.description ? `<p class="text-[11px] text-slate-400">${stripHtml(mod.description)}</p>` : ''}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono px-2 py-0.5 rounded ${badgeColor} uppercase">${mod.modname}</span>
                ${mod.url ? `
                  <a href="${mod.url}" target="_blank" rel="noopener noreferrer" class="p-1 rounded text-slate-400 hover:text-white" title="Open in Moodle">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke_linecap="round" stroke_linejoin="round" stroke_width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      } else {
        modulesHtml = '<p class="text-xs text-slate-500 italic">No resources or activities in this section.</p>';
      }

      secDiv.innerHTML = `
        <div class="border-b border-slate-800 pb-2">
          <h4 class="font-bold text-sm text-white">${escapeHtml(sec.name || `Section ${idx + 1}`)}</h4>
          ${sec.summary ? `<div class="text-xs text-slate-400 mt-1">${stripHtml(sec.summary)}</div>` : ''}
        </div>
        <div class="space-y-2 mt-2">
          ${modulesHtml}
        </div>
      `;
      bodyEl.appendChild(secDiv);
    });

  } catch (err) {
    bodyEl.innerHTML = `<div class="py-12 text-center text-red-400 text-sm">Error: ${err.message}</div>`;
  }
}

function closeCourseModal() {
  document.getElementById('course-modal').classList.add('hidden');
}

// 3. Fetch & Render Assignments
async function loadAssignments() {
  const loading = document.getElementById('assignments-loading');
  const list = document.getElementById('assignments-list');
  loading.classList.remove('hidden');
  list.classList.add('hidden');

  try {
    const res = await fetch('/api/assignments');
    if (!res.ok) throw new Error('Failed to load assignments');

    const data = await res.json();
    document.getElementById('stat-assignments-count').innerText = data.total;
    document.getElementById('assignments-badge-count').innerText = `${data.total} tasks`;

    list.innerHTML = '';
    if (data.assignments.length === 0) {
      list.innerHTML = '<div class="glass-panel p-8 text-center text-slate-400 text-sm rounded-2xl">No upcoming assignments due. Great job!</div>';
    } else {
      data.assignments.forEach(a => {
        const item = document.createElement('div');
        item.className = 'glass-panel p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-700 transition-all';
        
        const dueTag = a.is_overdue
          ? '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">OVERDUE</span>'
          : '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">UPCOMING</span>';

        item.innerHTML = `
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-semibold text-blue-400">${escapeHtml(a.course_name || 'Course')}</span>
              ${dueTag}
            </div>
            <h4 class="text-sm font-bold text-white">${escapeHtml(a.name)}</h4>
            ${a.intro ? `<div class="text-xs text-slate-400 mt-1 line-clamp-1">${stripHtml(a.intro)}</div>` : ''}
          </div>
          <div class="flex items-center gap-4 text-xs shrink-0">
            <div class="text-right">
              <span class="block text-slate-400 text-[11px]">Due Date</span>
              <span class="font-mono text-slate-200 font-semibold">${a.duedate_formatted || 'No deadline'}</span>
            </div>
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
