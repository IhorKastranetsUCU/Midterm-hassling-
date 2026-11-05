// Dedicated Subject Workspace Application (Local-First Engine)

let currentCourseId = null;
let currentSectionsData = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  currentCourseId = Number(document.body.dataset.courseId);
  initCourseWorkspace();
});

async function initCourseWorkspace() {
  if (!currentCourseId) return;

  loadLocalNotes();

  // 1. STALE-WHILE-REVALIDATE: Try loading instantly from LocalCache (IndexedDB)
  if (window.LocalCache) {
    const cachedContents = await LocalCache.getCourseContents(currentCourseId);
    if (cachedContents && cachedContents.length > 0) {
      renderSections(cachedContents);
      updateCacheBadge(true);
    }
  }

  // 2. Fetch fresh data from backend (relayed to Moodle)
  reloadCourseData();
}

async function reloadCourseData(force = false) {
  const loading = document.getElementById('course-sections-loading');
  const list = document.getElementById('course-sections-list');

  try {
    // A. Fetch Course Summary Metadata
    const courseRes = await fetch(`/api/courses/${currentCourseId}`);
    if (courseRes.ok) {
      const course = await courseRes.json();
      renderCourseHeader(course);
    }

    // B. Fetch Course Syllabus & Modules
    const contentsRes = await fetch(`/api/courses/${currentCourseId}/contents`);
    if (!contentsRes.ok) throw new Error('Failed to load course contents from Moodle');
    const sections = await contentsRes.json();

    currentSectionsData = sections;
    renderSections(sections);

    // Save to local device cache for 0ms loads in future
    if (window.LocalCache) {
      await LocalCache.setCourseContents(currentCourseId, sections);
      updateCacheBadge(true);
    }

    // C. Fetch Subject-Specific Assignments & Deadlines
    loadSubjectAssignments();

    // D. Fetch Subject-Specific Grades & Feedback
    loadSubjectGrades();

    loading.classList.add('hidden');
    list.classList.remove('hidden');
  } catch (err) {
    if (currentSectionsData.length === 0) {
      loading.innerHTML = `<div class="p-6 text-red-400">Failed to load syllabus: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderCourseHeader(course) {
  document.title = `${course.shortname || 'Course'} | Moodle Portal`;
  document.getElementById('header-course-code').innerText = course.shortname || 'COURSE';
  document.getElementById('header-course-title').innerText = course.fullname || 'Course Workspace';

  document.getElementById('banner-course-code').innerText = course.shortname || 'COURSE';
  document.getElementById('banner-course-title').innerText = course.fullname || 'Course Workspace';
  if (course.summary) {
    document.getElementById('banner-course-desc').innerHTML = stripHtml(course.summary);
  }

  const progressVal = course.progress !== null ? Math.round(course.progress) : 0;
  document.getElementById('banner-progress-text').innerText = `${progressVal}%`;
  document.getElementById('banner-progress-bar').style.width = `${progressVal}%`;

  const moodleBase = document.body.dataset.moodleUrl || 'https://learn.ucu.edu.ua';
  const moodleLink = document.getElementById('link-course-moodle');
  if (moodleLink) {
    moodleLink.href = `${moodleBase.replace(/\/+$/, '')}/course/view.php?id=${course.id}`;
  }
}

function renderSections(sections) {
  const container = document.getElementById('course-sections-list');
  const loading = document.getElementById('course-sections-loading');
  if (!container) return;

  container.innerHTML = '';
  loading.classList.add('hidden');
  container.classList.remove('hidden');

  if (!sections || sections.length === 0) {
    container.innerHTML = '<div class="glass-panel p-8 text-center text-slate-400 text-sm rounded-2xl">No sections available in this course.</div>';
    return;
  }

  sections.forEach((sec, idx) => {
    const card = document.createElement('div');
    card.className = 'glass-panel rounded-2xl border border-slate-800/80 overflow-hidden transition-all';

    // Filter modules based on activeFilter
    const filteredModules = (sec.modules || []).filter(m => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'resource') return m.modname === 'resource' || m.modname === 'folder';
      if (activeFilter === 'assign') return m.modname === 'assign';
      if (activeFilter === 'quiz') return m.modname === 'quiz';
      if (activeFilter === 'url') return m.modname === 'url';
      return true;
    });

    let modulesHtml = '';
    if (filteredModules.length > 0) {
      modulesHtml = filteredModules.map(m => {
        const badgeColor = getModuleBadgeColor(m.modname);
        return `
          <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div class="flex items-center gap-3 min-w-0">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${badgeColor} shrink-0">
                ${m.modname.toUpperCase()}
              </span>
              <span class="text-xs text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                ${escapeHtml(m.name)}
              </span>
            </div>
            ${m.url ? `
              <a href="${m.url}" target="_blank" rel="noopener noreferrer"
                class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-[11px] font-medium text-slate-300 hover:text-white transition-all shrink-0 ml-3 flex items-center gap-1">
                <span>Open</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>
            ` : ''}
          </div>
        `;
      }).join('');
    } else {
      if (activeFilter !== 'all') {
        return; // Skip section if no matching items for filter
      }
      modulesHtml = '<p class="text-[11px] text-slate-500 italic py-2">No learning resources published in this section.</p>';
    }

    card.innerHTML = `
      <div class="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between cursor-pointer" onclick="toggleSection(${idx})">
        <div>
          <h3 class="text-xs font-bold text-white uppercase tracking-wider">${escapeHtml(sec.name || 'General')}</h3>
          ${sec.summary ? `<p class="text-[11px] text-slate-400 mt-1">${escapeHtml(stripHtml(sec.summary))}</p>` : ''}
        </div>
        <span class="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">${filteredModules.length} items</span>
      </div>
      <div id="section-body-${idx}" class="p-4 space-y-2">
        ${modulesHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

function filterModules(type) {
  activeFilter = type;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.className = 'filter-btn px-3 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all';
  });

  const activeBtn = document.getElementById(`filter-btn-${type}`);
  if (activeBtn) {
    activeBtn.className = 'filter-btn active px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold transition-all';
  }

  renderSections(currentSectionsData);
}

function getModuleBadgeColor(modname) {
  switch (modname) {
    case 'assign':
      return 'bg-amber-950 text-amber-400 border border-amber-800';
    case 'quiz':
      return 'bg-purple-950 text-purple-400 border border-purple-800';
    case 'resource':
    case 'folder':
      return 'bg-blue-950 text-blue-400 border border-blue-800';
    case 'url':
      return 'bg-indigo-950 text-indigo-400 border border-indigo-800';
    case 'forum':
      return 'bg-emerald-950 text-emerald-400 border border-emerald-800';
    default:
      return 'bg-slate-800 text-slate-300';
  }
}

// Subject Deadlines
async function loadSubjectAssignments() {
  const container = document.getElementById('subject-deadlines-list');
  const countBadge = document.getElementById('subject-deadline-count');

  try {
    const res = await fetch(`/api/assignments?course_id=${currentCourseId}`);
    if (!res.ok) return;
    const data = await res.json();

    countBadge.innerText = data.total_count || 0;
    container.innerHTML = '';

    if (!data.assignments || data.assignments.length === 0) {
      container.innerHTML = '<p class="text-slate-500 py-4 text-center">No pending assignments for this course! 🎉</p>';
      return;
    }

    data.assignments.forEach(a => {
      const item = document.createElement('div');
      item.className = 'p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-2';
      item.innerHTML = `
        <div>
          <strong class="text-xs text-white block">${escapeHtml(a.name)}</strong>
          <span class="text-[10px] text-slate-400 font-mono">Due: ${a.duedate_formatted || 'No deadline'}</span>
        </div>
        <div class="shrink-0 text-right">
          ${a.is_overdue ? '<span class="text-[10px] font-bold text-red-400 block">OVERDUE</span>' : ''}
          ${a.url ? `<a href="${a.url}" target="_blank" class="text-[11px] text-blue-400 hover:text-blue-300">Submit ↗</a>` : ''}
        </div>
      `;
      container.appendChild(item);
    });
  } catch (e) {}
}

// Subject Grades
async function loadSubjectGrades() {
  const container = document.getElementById('subject-grades-list');

  try {
    const res = await fetch(`/api/grades?course_id=${currentCourseId}`);
    if (!res.ok) return;
    const data = await res.json();

    container.innerHTML = '';
    const courseGrades = data.courses && data.courses[0];

    if (!courseGrades || !courseGrades.grade_items || courseGrades.grade_items.length === 0) {
      container.innerHTML = '<p class="text-slate-500 py-4 text-center">No grade evaluations released yet.</p>';
      return;
    }

    courseGrades.grade_items.forEach(g => {
      const row = document.createElement('div');
      row.className = 'p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs';
      row.innerHTML = `
        <span class="text-slate-300 truncate mr-2">${escapeHtml(g.itemname || 'Item')}</span>
        <div class="text-right shrink-0">
          <span class="font-mono font-bold text-white">${escapeHtml(g.gradeformatted || '--')}</span>
          ${g.percentageformatted ? `<span class="text-[10px] text-blue-400 block font-mono">${escapeHtml(g.percentageformatted)}</span>` : ''}
        </div>
      `;
      container.appendChild(row);
    });
  } catch (e) {}
}

// Local Notes Notepad (Stored exclusively in browser on user's device)
function saveLocalNotes() {
  const val = document.getElementById('subject-local-notes').value;
  localStorage.setItem(`notes_course_${currentCourseId}`, val);
}

function loadLocalNotes() {
  const saved = localStorage.getItem(`notes_course_${currentCourseId}`);
  if (saved) {
    document.getElementById('subject-local-notes').value = saved;
  }
}

function copyCourseLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.getElementById('btn-copy-link');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>✓ Copied Link!</span>';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  });
}

function updateCacheBadge(ready) {
  const pill = document.getElementById('cache-status-pill');
  if (pill) {
    pill.classList.remove('hidden');
  }
}

function toggleSection(idx) {
  const body = document.getElementById(`section-body-${idx}`);
  if (body) {
    body.classList.toggle('hidden');
  }
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

function stripHtml(html) {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
