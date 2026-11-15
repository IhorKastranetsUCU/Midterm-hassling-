// Dedicated Subject Workspace Application (Extension + File Upload + Moodle Hybrid)

let currentCourseId = null;
let currentCourseMeta = null;
let currentSectionsData = [];
let workspaceBundle = null;
let activeTopicIndex = 0;
let activeFilter = 'all';
let activeWsTab = 'book';
let notesSaveTimer = null;
let courseEventSource = null;
let quizTelemetryLookup = {};

document.addEventListener('DOMContentLoaded', () => {
  currentCourseId = Number(document.body.dataset.courseId);
  initCourseWorkspace();
});

window.addEventListener('beforeunload', () => {
  if (courseEventSource) {
    courseEventSource.close();
    courseEventSource = null;
  }
});

async function initCourseWorkspace() {
  if (!currentCourseId) return;

  initCourseEventStream();

  // Try loading instant local cache for syllabus while fresh data loads
  if (window.LocalCache) {
    try {
      const cachedContents = await LocalCache.getCourseContents(currentCourseId);
      if (cachedContents && cachedContents.length > 0) {
        currentSectionsData = cachedContents;
        renderSections(cachedContents);
        updateCacheBadge(true);
      }
    } catch (e) {}
  }

  await reloadCourseData();
}

async function reloadCourseData(force = false) {
  let hasWorkspace = false;
  let contentsErrorMsg = '';

  // Fetch AI Workspace bundle, Moodle course metadata, and Moodle syllabus concurrently
  const [wsResult, courseResult, contentsResult] = await Promise.allSettled([
    fetch(`/api/workspace/courses/${currentCourseId}`),
    fetch(`/api/courses/${currentCourseId}`),
    fetch(`/api/courses/${currentCourseId}/contents`),
  ]);

  if (wsResult.status === 'fulfilled' && wsResult.value.ok) {
    try {
      workspaceBundle = await wsResult.value.json();
      hasWorkspace = true;
      renderWorkspaceBundle(workspaceBundle);
    } catch (e) {}
  }

  if (courseResult.status === 'fulfilled' && courseResult.value.ok) {
    try {
      currentCourseMeta = await courseResult.value.json();
      renderCourseHeader(currentCourseMeta, !hasWorkspace);
    } catch (e) {}
  }

  if (contentsResult.status === 'fulfilled' && contentsResult.value.ok) {
    try {
      const sections = await contentsResult.value.json();
      currentSectionsData = Array.isArray(sections) ? sections : [];
      renderSections(currentSectionsData);
      if (window.LocalCache) {
        await LocalCache.setCourseContents(currentCourseId, currentSectionsData);
        updateCacheBadge(true);
      }
    } catch (e) {
      contentsErrorMsg = 'Failed to parse course syllabus response.';
    }
  } else if (!hasWorkspace) {
    const status = contentsResult.status === 'fulfilled' ? contentsResult.value.status : 0;
    if (status === 401) {
      contentsErrorMsg = 'Moodle session is not connected. Sign in on the dashboard or sync this course with the Chrome Extension.';
    } else if (status === 404) {
      contentsErrorMsg = 'Course syllabus not found in Moodle enrollments. Sync via Chrome Extension or upload files on the right.';
    } else {
      contentsErrorMsg = 'Connect Moodle or sync this course via Chrome Extension first.';
    }

    if (currentSectionsData.length === 0) {
      const loading = document.getElementById('course-sections-loading');
      if (loading) {
        loading.innerHTML = `<div class="p-6 text-amber-300 text-xs">${escapeHtml(contentsErrorMsg)}</div>`;
      }
    }
  }

  // Load live deadlines & grades asynchronously when Moodle course session is accessible
  let usedMoodleDeadlines = false;
  if ((courseResult.status === 'fulfilled' && courseResult.value.ok) ||
      (contentsResult.status === 'fulfilled' && contentsResult.value.ok)) {
    usedMoodleDeadlines = await loadSubjectAssignments();
    loadSubjectGrades();
  }

  // If Moodle syllabus wasn't loaded (e.g. Extension/Upload-only mode), populate syllabus from synced workspace
  if (hasWorkspace && currentSectionsData.length === 0) {
    currentSectionsData = (workspaceBundle && workspaceBundle.sections) ? workspaceBundle.sections : [];
    renderSections(currentSectionsData);
  }

  if (hasWorkspace && !usedMoodleDeadlines && workspaceBundle?.tools_config?.deadline_tracker !== false) {
    renderExtensionDeadlines(workspaceBundle.sections || []);
  }

  // Ensure Interactive Book, Practice, Exam, and Header never stay stuck on "Loading..." when no workspace exists yet
  if (!hasWorkspace) {
    renderEmptyWorkspaceState(contentsErrorMsg);
  }
}

function initCourseEventStream() {
  if (courseEventSource) courseEventSource.close();
  try {
    courseEventSource = new EventSource('/api/workspace/events/stream');
    ['mix.ready', 'workspace.synced', 'topic.update_available'].forEach(evtName => {
      courseEventSource.addEventListener(evtName, (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (Number(parsed?.data?.course_id) === currentCourseId) {
            const pill = document.getElementById('cache-status-pill');
            if (pill) {
              pill.classList.remove('hidden');
              pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ${escapeHtml(evtName === 'mix.ready' ? 'Mix Ready' : 'Live Sync')}`;
            }
            reloadCourseData();
          }
        } catch (err) {}
      });
    });
  } catch (e) {}
}

function renderExtensionDeadlines(sections) {
  const container = document.getElementById('subject-deadlines-list');
  const countBadge = document.getElementById('subject-deadline-count');
  if (!container) return;

  const extracted = [];
  (sections || []).forEach((sec) => {
    (sec.modules || []).forEach((m) => {
      if ((m.modname || '').toLowerCase() === 'assign' && m.due_at) {
        extracted.push({ name: m.name, due_at: m.due_at, url: m.url, section: sec.name });
      }
    });
  });
  if (countBadge) countBadge.innerText = extracted.length;
  if (extracted.length === 0) return;

  container.innerHTML = '';
  extracted.forEach((a) => {
    const item = document.createElement('div');
    item.className = 'p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-2';
    item.innerHTML = `
      <div>
        <strong class="text-xs text-white block">${escapeHtml(a.name)}</strong>
        <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(a.due_at)}</span>
      </div>
      <div class="shrink-0 text-right">
        ${a.url ? `<a href="${a.url}" target="_blank" class="text-[11px] text-blue-400 hover:text-blue-300">Open ↗</a>` : ''}
      </div>
    `;
    container.appendChild(item);
  });
}

function renderEmptyWorkspaceState(errorMsg = '') {
  if (!currentCourseMeta) {
    const headerTitle = document.getElementById('header-course-title');
    if (headerTitle && headerTitle.innerText === 'Loading Course...') {
      headerTitle.innerText = `Course #${currentCourseId}`;
    }
    const bannerTitle = document.getElementById('banner-course-title');
    if (bannerTitle && bannerTitle.innerText === 'Course Title') {
      bannerTitle.innerText = `Course #${currentCourseId}`;
    }
  }

  const bookPanel = document.getElementById('book-content-panel');
  if (bookPanel) {
    if (currentSectionsData && currentSectionsData.length > 0) {
      const totalItems = currentSectionsData.reduce((acc, s) => acc + ((s.modules || []).length), 0);
      bookPanel.innerHTML = `
        <div class="glass-panel p-8 rounded-2xl border border-blue-500/30 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700/60">
              ✅ Moodle Syllabus Loaded (${currentSectionsData.length} sections • ${totalItems} items)
            </span>
          </div>
          <div class="space-y-1.5">
            <h3 class="text-base font-bold text-white">Ready to Build Interactive Book & Study Mixes</h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              This course has raw Moodle sections loaded, but no Interactive Topic Mixes have been generated yet.
              You can browse the raw syllabus right away or generate your structured Interactive Book, flowcharts, and Exam Mix (restricted quizzes stay automatically shielded).
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" id="btn-build-from-syllabus" onclick="buildWorkspaceFromLoadedSyllabus()"
              class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all">
              ⚡ Build Interactive Book from Syllabus
            </button>
            <button type="button" onclick="switchWorkspaceTab('syllabus')"
              class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all">
              📋 Open Course Syllabus
            </button>
          </div>
        </div>
      `;
    } else {
      bookPanel.innerHTML = `
        <div class="glass-panel p-8 rounded-2xl text-center space-y-3">
          <p class="text-sm font-bold text-white">No Interactive Mixes Yet</p>
          <p class="text-xs text-slate-400">
            ${escapeHtml(errorMsg || 'Sync this course from Moodle using the Chrome Extension or upload lecture files on the right to build your Interactive Book.')}
          </p>
        </div>
      `;
    }
  }

  const qContainer = document.getElementById('practice-quiz-container');
  if (qContainer) {
    qContainer.innerHTML = '<p class="text-slate-400">Build Interactive Mixes from the Syllabus tab or upload a lecture file to unlock practice quizzes.</p>';
  }
  const fContainer = document.getElementById('flashcards-container');
  if (fContainer) {
    fContainer.innerHTML = '<p class="col-span-full text-slate-400">No flashcards generated yet.</p>';
  }
  const examContainer = document.getElementById('exam-mix-container');
  if (examContainer) {
    examContainer.innerHTML = '<p class="text-slate-400 py-4">Sync or upload at least one topic first, then click <strong>Generate / Refresh Exam Mix</strong>.</p>';
  }
}

async function buildWorkspaceFromLoadedSyllabus() {
  if (!currentSectionsData || currentSectionsData.length === 0) return;
  const btn = document.getElementById('btn-build-from-syllabus');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⚡ Building Interactive Mixes...';
  }

  try {
    const sections = currentSectionsData.map((sec, idx) => ({
      section_index: idx,
      title: sec.name || `Topic ${idx + 1}`,
      summary: stripHtml(sec.summary || ''),
      modules: (sec.modules || []).map((m, mIdx) => {
        const modname = (m.modname || 'resource').toLowerCase();
        const isQuiz = modname === 'quiz';
        const modPayload = {
          module_id: Number(m.id) || (idx * 1000 + mIdx + 1),
          name: m.name || 'Learning Item',
          modname: modname,
          url: m.url || null,
          text_excerpt: isQuiz ? '' : stripHtml(m.description || '').trim().slice(0, 1500),
        };
        if (isQuiz) {
          modPayload.quiz_meta = {
            name: m.name || 'Quiz',
            attempts: null,
            timelimit_seconds: null,
          };
        }
        return modPayload;
      }),
    }));

    const titleEl = document.getElementById('banner-course-title');
    const codeEl = document.getElementById('banner-course-code');
    const payload = {
      authority: document.body.dataset.authoritySlug || 'custom',
      moodle_url: document.body.dataset.moodleUrl || window.location.origin,
      course_id: currentCourseId,
      course_name: (currentCourseMeta && currentCourseMeta.fullname) || (titleEl ? titleEl.innerText : `Course ${currentCourseId}`),
      course_shortname: (currentCourseMeta && currentCourseMeta.shortname) || (codeEl ? codeEl.innerText : `CRS-${currentCourseId}`),
      sections: sections,
    };

    const res = await fetch('/api/sync/extension', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Could not build workspace mixes');
    }
    await reloadCourseData(true);
  } catch (err) {
    alert(err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerText = '⚡ Build Interactive Book from Syllabus';
    }
  }
}

function renderWorkspaceBundle(bundle) {
  const course = bundle.course;
  renderCourseHeader({
    id: course.course_id,
    shortname: course.shortname,
    fullname: course.title,
    summary: `Source: ${course.source_type === 'moodle_extension' ? 'Chrome Extension Sync' : 'File Upload'} • ${course.topic_count} structured topic(s)`,
    progress: 100,
    moodle_url: course.moodle_url,
  }, true);

  const badgeTopics = document.getElementById('badge-topics-count');
  if (badgeTopics) badgeTopics.innerText = (bundle.topic_mixes || []).length;

  const progressText = document.getElementById('banner-progress-text');
  if (progressText) progressText.innerText = `${(bundle.topic_mixes || []).length}`;

  renderToolsSidebar(bundle.tools_config);
  renderBlockedQuizzesAudit(bundle.blocked_quizzes || []);
  renderTopicsBar(bundle.topic_mixes || []);

  if (activeTopicIndex >= (bundle.topic_mixes || []).length) {
    activeTopicIndex = 0;
  }
  renderActiveTopic();
  renderExamMix(bundle.exam_mix);
  updateExamTabBadge();
}

function updateExamTabBadge() {
  const tabBtn = document.getElementById('ws-tab-exam');
  if (!tabBtn) return;
  const stale = Boolean(workspaceBundle?.course?.exam_mix_stale);
  tabBtn.innerHTML = stale
    ? 'Exam Prep <span class="ml-1 w-2 h-2 rounded-full bg-amber-400 inline-block" title="New topic changes ready to merge"></span>'
    : 'Exam Prep';
}

function renderCourseHeader(course, allowUrlUpdate) {
  document.title = `${course.shortname || 'Course'} | Study Workspace`;
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  setTxt('header-course-code', course.shortname || 'COURSE');
  setTxt('header-course-title', course.fullname || 'Course Workspace');
  setTxt('banner-course-code', course.shortname || 'COURSE');
  setTxt('banner-course-title', course.fullname || 'Course Workspace');
  if (course.summary) {
    setTxt('banner-course-desc', stripHtml(course.summary));
  }

  if (allowUrlUpdate) {
    const moodleUrl = course.moodle_url || document.body.dataset.moodleUrl || '';
    const moodleLink = document.getElementById('link-course-moodle');
    if (moodleLink && moodleUrl) {
      const target = moodleUrl.includes('course/view.php')
        ? moodleUrl
        : `${moodleUrl.replace(/\/+$/, '')}/course/view.php?id=${course.id}`;
      moodleLink.href = target;
      moodleLink.classList.remove('hidden');
    }
  }
}

function renderToolsSidebar(cfg) {
  const card = document.getElementById('sidebar-tools-card');
  if (!card || !cfg) return;
  card.classList.remove('hidden');
  ['interactive_book', 'mermaid_diagrams', 'visual_cards', 'practice_quizzes', 'flashcards', 'exam_mix'].forEach(k => {
    const el = document.getElementById(`cfg-${k}`);
    if (el) el.checked = Boolean(cfg[k]);
  });
}

function renderBlockedQuizzesAudit(blocked) {
  const card = document.getElementById('blocked-quizzes-card');
  const list = document.getElementById('blocked-quizzes-list');
  const badge = document.getElementById('badge-blocked-count');
  if (!card || !list) return;

  if (!blocked || blocked.length === 0) {
    card.classList.add('hidden');
    if (badge) badge.classList.add('hidden');
    return;
  }

  card.classList.remove('hidden');
  if (badge) {
    badge.innerText = blocked.length;
    badge.classList.remove('hidden');
  }
  list.innerHTML = blocked.map(b => `
    <div class="p-2.5 rounded-xl bg-slate-950/70 border border-purple-900/50 flex items-center justify-between gap-2">
      <span class="font-semibold text-purple-200">${escapeHtml(b.name)}</span>
      <span class="text-[10px] font-mono text-purple-400">EXCLUDED FROM AI</span>
    </div>
  `).join('');
}

function renderTopicsBar(mixes) {
  const bar = document.getElementById('topics-pill-bar');
  if (!bar) return;
  bar.innerHTML = '';

  if (!mixes || mixes.length === 0) return;

  mixes.forEach((mix, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = idx === activeTopicIndex;
    btn.className = isActive
      ? 'px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shrink-0 flex items-center gap-1.5 transition-all'
      : 'px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 flex items-center gap-1.5 transition-all';
    btn.onclick = () => {
      activeTopicIndex = idx;
      renderTopicsBar(mixes);
      renderActiveTopic();
    };
    const dot = mix.has_upstream_update ? '<span class="w-2 h-2 rounded-full bg-amber-400" title="Update available"></span>' : '';
    btn.innerHTML = `${dot}<span>${escapeHtml(mix.title)}</span>`;
    bar.appendChild(btn);
  });
}

function getActiveMix() {
  if (!workspaceBundle || !workspaceBundle.topic_mixes || workspaceBundle.topic_mixes.length === 0) {
    return null;
  }
  return workspaceBundle.topic_mixes[activeTopicIndex] || workspaceBundle.topic_mixes[0];
}

function renderActiveTopic() {
  const mix = getActiveMix();
  const bookPanel = document.getElementById('book-content-panel');
  const updateBanner = document.getElementById('topic-update-banner');
  const notesInput = document.getElementById('subject-local-notes');

  if (!mix) {
    if (bookPanel) {
      bookPanel.innerHTML = '<div class="glass-panel p-8 rounded-2xl text-center text-xs text-slate-400">No TopicMixes generated yet. Sync from Moodle or upload a file to build interactive topics.</div>';
    }
    return;
  }

  if (updateBanner) {
    updateBanner.classList.toggle('hidden', !mix.has_upstream_update);
  }

  if (notesInput) {
    notesInput.value = mix.user_notes || localStorage.getItem(`notes_course_${currentCourseId}_${mix.mix_id}`) || '';
  }

  // Render Interactive Book Sections
  if (bookPanel) {
    if (!mix.book_sections || mix.book_sections.length === 0) {
      bookPanel.innerHTML = `
        <div class="glass-panel p-6 rounded-2xl text-xs text-slate-400">
          Interactive Book is disabled in Course Tools for this topic. Toggle <strong>Book</strong> in the right sidebar to enable it.
        </div>
      `;
    } else {
      bookPanel.innerHTML = '';
      mix.book_sections.forEach((sec, sIdx) => {
        const card = document.createElement('div');
        card.className = 'glass-panel p-6 rounded-2xl space-y-4';

        const takeawaysHtml = (sec.key_takeaways || []).length > 0
          ? `<div class="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40 space-y-1.5">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300">Key Takeaways</span>
              <ul class="list-disc list-inside text-xs text-slate-200 space-y-1">
                ${sec.key_takeaways.map(tk => `<li>${escapeHtml(tk)}</li>`).join('')}
              </ul>
            </div>`
          : '';

        const visualHtml = sec.visual_card_caption
          ? `<div class="p-4 rounded-xl bg-indigo-950/25 border border-indigo-800/40 flex items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-mono uppercase text-indigo-300 block">🖼️ Visual Concept Card</span>
                <strong class="text-xs text-white">${escapeHtml(sec.visual_card_caption)}</strong>
                ${sec.visual_card_prompt ? `<p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(sec.visual_card_prompt)}</p>` : ''}
              </div>
              <span class="px-2 py-1 rounded bg-slate-900 text-[10px] font-mono text-indigo-300 border border-indigo-900/60 shrink-0">VISUAL READY</span>
            </div>`
          : '';

        card.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span class="text-[10px] font-mono text-indigo-400 uppercase">Topic Mix v${mix.version} • 🔒 ${escapeHtml(mix.visibility)}</span>
              <h2 class="text-base font-bold text-white mt-0.5">${escapeHtml(sec.heading)}</h2>
            </div>
            <span class="text-[10px] font-mono text-slate-500">#${mix.source_hash.slice(0, 8)}</span>
          </div>
          <div class="text-xs text-slate-200 leading-relaxed whitespace-pre-line">${escapeHtml(sec.explanation_markdown)}</div>
          ${takeawaysHtml}
          <div id="mermaid-slot-${sIdx}"></div>
          ${visualHtml}
        `;
        bookPanel.appendChild(card);

        if (sec.mermaid_diagram) {
          renderMermaidInto(`mermaid-slot-${sIdx}`, sec.mermaid_diagram, 'Concept Flowchart');
        }
      });
    }
  }

  renderPracticeAndFlashcards(mix);
}

function renderMermaidInto(slotId, code, label) {
  const slot = document.getElementById(slotId);
  if (!slot || !code) return;

  slot.innerHTML = `
    <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
      <span class="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">🔀 ${escapeHtml(label)}</span>
      <div class="overflow-x-auto flex justify-center py-2" id="${slotId}-svg-wrap"></div>
    </div>
  `;

  const wrap = document.getElementById(`${slotId}-svg-wrap`);
  const diagNode = document.createElement('pre');
  diagNode.className = 'mermaid text-xs text-slate-200';
  diagNode.textContent = code;
  wrap.appendChild(diagNode);

  if (window.mermaid && typeof window.mermaid.run === 'function') {
    try {
      Promise.resolve(window.mermaid.run({ nodes: [diagNode] })).catch(() => {});
    } catch (e) {}
  }
}

function renderPracticeAndFlashcards(mix) {
  const label = document.getElementById('practice-topic-label');
  if (label) label.innerText = mix.title;

  const qContainer = document.getElementById('practice-quiz-container');
  if (qContainer) {
    if (!mix.quizzes || mix.quizzes.length === 0) {
      qContainer.innerHTML = '<p class="text-slate-400">No practice questions generated for this topic (or Quizzes checkbox is off).</p>';
    } else {
      qContainer.innerHTML = '';
      mix.quizzes.forEach((q, qIdx) => {
        quizTelemetryLookup[qIdx] = {
          mixId: mix.mix_id,
          question: q.question,
          topicRef: q.topic_ref || mix.title,
        };
        const card = document.createElement('div');
        card.className = 'p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3';
        const optionsHtml = q.options.map((opt, oIdx) => `
          <button type="button" onclick="checkQuizOption(this, ${qIdx}, ${oIdx}, ${q.correct_index})"
            class="quiz-opt-${qIdx} w-full text-left px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all">
            ${escapeHtml(opt)}
          </button>
        `).join('');

        card.innerHTML = `
          <p class="font-semibold text-white">${qIdx + 1}. ${escapeHtml(q.question)}</p>
          <div class="space-y-1.5">${optionsHtml}</div>
          <div id="quiz-exp-${qIdx}" class="hidden p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-emerald-300">
            ${escapeHtml(q.explanation)}
          </div>
        `;
        qContainer.appendChild(card);
      });
    }
  }

  const fContainer = document.getElementById('flashcards-container');
  if (fContainer) {
    if (!mix.flashcards || mix.flashcards.length === 0) {
      fContainer.innerHTML = '<p class="col-span-full text-slate-400">Flashcards are currently disabled or empty for this topic. Enable <strong>Flashcards</strong> in Course Tools to generate them.</p>';
    } else {
      fContainer.innerHTML = '';
      mix.flashcards.forEach((fc) => {
        const card = document.createElement('div');
        card.className = 'p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/60 cursor-pointer transition-all min-h-[100px] flex flex-col justify-between';
        card.dataset.flipped = '0';
        card.innerHTML = `
          <span class="text-[10px] font-mono text-blue-400 uppercase">FRONT</span>
          <p class="text-xs font-semibold text-white my-2">${escapeHtml(fc.front)}</p>
          <span class="text-[10px] text-slate-500">Click to reveal answer</span>
        `;
        card.onclick = () => {
          const flipped = card.dataset.flipped === '1';
          card.dataset.flipped = flipped ? '0' : '1';
          card.innerHTML = flipped
            ? `<span class="text-[10px] font-mono text-blue-400 uppercase">FRONT</span><p class="text-xs font-semibold text-white my-2">${escapeHtml(fc.front)}</p><span class="text-[10px] text-slate-500">Click to reveal answer</span>`
            : `<span class="text-[10px] font-mono text-emerald-400 uppercase">BACK</span><p class="text-xs text-emerald-200 my-2">${escapeHtml(fc.back)}</p><span class="text-[10px] text-slate-500">Click to flip back</span>`;
        };
        fContainer.appendChild(card);
      });
    }
  }
}

function checkQuizOption(btn, qIdx, chosenIdx, correctIdx) {
  document.querySelectorAll(`.quiz-opt-${qIdx}`).forEach((el, idx) => {
    el.disabled = true;
    if (idx === correctIdx) {
      el.className = `quiz-opt-${qIdx} w-full text-left px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-600 text-emerald-200 font-semibold`;
    } else if (idx === chosenIdx && chosenIdx !== correctIdx) {
      el.className = `quiz-opt-${qIdx} w-full text-left px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-600 text-rose-200`;
    }
  });
  const exp = document.getElementById(`quiz-exp-${qIdx}`);
  if (exp) exp.classList.remove('hidden');

  const meta = quizTelemetryLookup[qIdx];
  if (meta && meta.mixId) {
    fetch(`/api/workspace/mixes/${encodeURIComponent(meta.mixId)}/quiz-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: meta.question,
        chosen_index: chosenIdx,
        correct_index: correctIdx,
        topic_ref: meta.topicRef || '',
      }),
    }).then((res) => {
      if (res.ok && chosenIdx !== correctIdx && workspaceBundle?.exam_mix && workspaceBundle.course) {
        workspaceBundle.course.exam_mix_stale = true;
        updateExamTabBadge();
      }
    }).catch(() => {});
  }
}

function renderExamMix(examMix) {
  const container = document.getElementById('exam-mix-container');
  if (!container) return;

  const isStale = Boolean(workspaceBundle?.course?.exam_mix_stale);

  if (!examMix) {
    container.innerHTML = isStale
      ? '<p class="text-amber-300 py-6 text-center">Topics synced! Building incremental Exam Mix on demand — click <strong>Generate / Refresh Exam Mix</strong> or wait a moment.</p>'
      : '<p class="text-slate-400 py-6 text-center">No Exam Mix generated yet. Click <strong>Generate / Refresh Exam Mix</strong> above once topics are loaded.</p>';
    return;
  }

  const staleNotice = isStale
    ? `<div class="p-3 rounded-xl bg-amber-950/50 border border-amber-800/70 text-xs text-amber-200 flex items-center justify-between gap-3">
         <span><strong>Stale Exam Mix:</strong> One or more topics changed. Only dirty topic digests will rebuild on refresh.</span>
         <button type="button" onclick="rebuildExamMix()" class="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400">Merge Updates</button>
       </div>`
    : '';
  const incrementalMeta = (examMix.cached_topics_reused || examMix.incremental_updates)
    ? `<div class="text-[11px] font-mono text-slate-400">Incremental Mix-of-Mixes: reused ${examMix.cached_topics_reused || 0} cached topic digest(s), updated ${examMix.incremental_updates || 0} topic(s).</div>`
    : '';

  const focusChips = (examMix.weak_spots_focus || []).map(f =>
    `<span class="px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-[11px]">${escapeHtml(f)}</span>`
  ).join('');

  container.innerHTML = `
    ${staleNotice}
    ${incrementalMeta}
    <div class="flex flex-wrap gap-2">${focusChips}</div>
    <div id="exam-mermaid-slot"></div>
    <div class="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
      <span class="text-[10px] font-mono uppercase text-blue-400 block">Combined Master Cheatsheet</span>
      <div class="text-xs text-slate-200 whitespace-pre-line leading-relaxed">${escapeHtml(examMix.master_cheatsheet_markdown)}</div>
    </div>
    <div class="space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">Combined Mock Exam (${(examMix.mock_exam_questions || []).length} Questions)</h3>
      <div id="exam-questions-slot" class="space-y-3"></div>
    </div>
  `;

  if (examMix.concept_map_mermaid) {
    renderMermaidInto('exam-mermaid-slot', examMix.concept_map_mermaid, 'Master Exam Concept Map');
  }

  const qSlot = document.getElementById('exam-questions-slot');
  if (qSlot) {
    const fallbackMixId = workspaceBundle?.topic_mixes?.[0]?.mix_id || '';
    (examMix.mock_exam_questions || []).forEach((q, idx) => {
      const matchedMix = (workspaceBundle?.topic_mixes || []).find((m) => m.title === q.topic_ref);
      quizTelemetryLookup[1000 + idx] = {
        mixId: matchedMix?.mix_id || fallbackMixId,
        question: q.question,
        topicRef: q.topic_ref || 'Exam Mock',
      };
      const card = document.createElement('div');
      card.className = 'p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2';
      card.innerHTML = `
        <p class="font-semibold text-white">${idx + 1}. ${escapeHtml(q.question)}</p>
        <div class="space-y-1.5">
          ${q.options.map((o, oIdx) => `
            <button type="button" onclick="checkQuizOption(this, 1000 + ${idx}, ${oIdx}, ${q.correct_index})"
              class="quiz-opt-${1000 + idx} w-full text-left px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200">
              ${escapeHtml(o)}
            </button>
          `).join('')}
        </div>
        <div id="quiz-exp-${1000 + idx}" class="hidden text-[11px] text-emerald-300 pt-1">${escapeHtml(q.explanation)}</div>
      `;
      qSlot.appendChild(card);
    });
  }
}

let isBuildingExamMix = false;
async function rebuildExamMix() {
  if (isBuildingExamMix) return;
  isBuildingExamMix = true;
  const btn = document.getElementById('btn-rebuild-exam-mix');
  if (btn) { btn.disabled = true; btn.innerText = 'Synthesizing Exam Mix...'; }
  try {
    const res = await fetch(`/api/workspace/courses/${currentCourseId}/exam-mix`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Could not build Exam Mix');
    if (workspaceBundle) {
      workspaceBundle.exam_mix = data.exam_mix;
      if (workspaceBundle.course) workspaceBundle.course.exam_mix_stale = false;
    }
    updateExamTabBadge();
    renderExamMix(data.exam_mix);
  } catch (err) {
    alert(err.message);
  } finally {
    isBuildingExamMix = false;
    if (btn) { btn.disabled = false; btn.innerText = 'Generate / Refresh Exam Mix'; }
  }
}

async function saveCourseTools() {
  const btn = document.getElementById('btn-save-tools');
  if (btn) { btn.disabled = true; btn.innerText = 'Rebuilding...'; }
  const readBool = (id) => Boolean(document.getElementById(id)?.checked);
  const tools = {
    interactive_book: readBool('cfg-interactive_book'),
    mermaid_diagrams: readBool('cfg-mermaid_diagrams'),
    visual_cards: readBool('cfg-visual_cards'),
    practice_quizzes: readBool('cfg-practice_quizzes'),
    flashcards: readBool('cfg-flashcards'),
    exam_mix: readBool('cfg-exam_mix'),
    deadline_tracker: true,
  };
  try {
    const res = await fetch(`/api/workspace/courses/${currentCourseId}/tools`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tools),
    });
    if (res.ok) {
      await reloadCourseData();
    }
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'Apply & Rebuild Mixes'; }
  }
}

async function uploadFileToCurrentCourse(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const btn = document.getElementById('btn-upload-topic-file');
  if (btn) { btn.disabled = true; btn.innerText = `Uploading ${file.name}...`; }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', String(currentCourseId));
    formData.append('course_title', document.getElementById('banner-course-title')?.innerText || `Course ${currentCourseId}`);
    formData.append('authority', document.body.dataset.authoritySlug || 'custom');
    const res = await fetch('/api/workspace/courses/upload', { method: 'POST', body: formData });
    if (res.ok) {
      await reloadCourseData();
    }
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = '+ Upload PDF / PPTX / DOCX / MD Topic'; }
    input.value = '';
  }
}

async function applyUpstreamTopicUpdate() {
  const mix = getActiveMix();
  if (!mix) return;
  const btn = document.getElementById('btn-apply-topic-update');
  if (btn) { btn.disabled = true; btn.innerText = 'Updating...'; }
  try {
    const res = await fetch(`/api/workspace/mixes/${encodeURIComponent(mix.mix_id)}/ack-update`, { method: 'POST' });
    if (res.ok) {
      await reloadCourseData();
    }
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'Apply Update (Keep Notes)'; }
  }
}

function scheduleNotesSave() {
  const mix = getActiveMix();
  const notes = document.getElementById('subject-local-notes')?.value || '';
  const statusEl = document.getElementById('notes-save-status');
  if (statusEl) statusEl.innerText = 'Saving...';

  if (mix) {
    mix.user_notes = notes;
    localStorage.setItem(`notes_course_${currentCourseId}_${mix.mix_id}`, notes);
  } else {
    localStorage.setItem(`notes_course_${currentCourseId}`, notes);
  }

  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(async () => {
    if (mix) {
      try {
        await fetch(`/api/workspace/mixes/${encodeURIComponent(mix.mix_id)}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
      } catch (e) {}
    }
    if (statusEl) statusEl.innerText = 'Saved (protected from updates)';
  }, 450);
}

function switchWorkspaceTab(tabName) {
  activeWsTab = tabName;
  document.querySelectorAll('.ws-view').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.ws-tab-btn').forEach(btn => {
    btn.className = 'ws-tab-btn px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all whitespace-nowrap flex items-center gap-1.5';
  });

  const targetView = document.getElementById(`ws-view-${tabName}`);
  const activeBtn = document.getElementById(`ws-tab-${tabName}`);
  if (targetView) targetView.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.className = 'ws-tab-btn px-4 py-2 rounded-xl bg-blue-600 text-white transition-all whitespace-nowrap flex items-center gap-1.5';
  }
  if (
    tabName === 'exam' &&
    workspaceBundle &&
    workspaceBundle.tools_config?.exam_mix !== false &&
    (!workspaceBundle.exam_mix || workspaceBundle.course?.exam_mix_stale)
  ) {
    rebuildExamMix();
  }
}

function renderSections(sections) {
  const container = document.getElementById('course-sections-list');
  const loading = document.getElementById('course-sections-loading');
  if (!container) return;

  container.innerHTML = '';
  if (loading) loading.classList.add('hidden');
  container.classList.remove('hidden');

  if (!sections || sections.length === 0) {
    container.innerHTML = '<div class="glass-panel p-8 text-center text-slate-400 text-sm rounded-2xl">No sections available in this course.</div>';
    return;
  }

  sections.forEach((sec, idx) => {
    const card = document.createElement('div');
    card.className = 'glass-panel rounded-2xl border border-slate-800/80 overflow-hidden transition-all';

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
        const safetyBadge = m.safety_status === 'restricted_exam'
          ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-800">SHIELDED</span>'
          : '';

        const hasFile = Boolean(m.download_url || (m.files && m.files.length > 0));
        const fileBadges = (m.files || []).map(f => `
          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            ${escapeHtml(f.filename)}
          </span>
        `).join('');

        return `
          <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${badgeColor} shrink-0">
                ${(m.modname || 'item').toUpperCase()}
              </span>
              ${safetyBadge}
              <span class="text-xs text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                ${escapeHtml(m.name)}
              </span>
              ${fileBadges}
            </div>
            <div class="flex items-center gap-1.5 shrink-0 ml-3">
              ${hasFile ? `
                <a href="/api/courses/${currentCourseId}/files/download/${m.id}" target="_blank"
                  class="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800/80 text-[11px] font-medium transition-all flex items-center gap-1 shadow-sm" title="Download File">
                  <span>📥 File</span>
                </a>
              ` : ''}
              ${m.url ? `
                <a href="${m.url}" target="_blank" rel="noopener noreferrer"
                  class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-[11px] font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1">
                  <span>Open ↗</span>
                </a>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      if (activeFilter !== 'all') return;
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
      <div id="section-body-${idx}" class="p-4 space-y-2">${modulesHtml}</div>
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
    case 'assign': return 'bg-amber-950 text-amber-400 border border-amber-800';
    case 'quiz': return 'bg-purple-950 text-purple-400 border border-purple-800';
    case 'resource':
    case 'folder': return 'bg-blue-950 text-blue-400 border border-blue-800';
    case 'url': return 'bg-indigo-950 text-indigo-400 border border-indigo-800';
    case 'forum': return 'bg-emerald-950 text-emerald-400 border border-emerald-800';
    default: return 'bg-slate-800 text-slate-300';
  }
}

async function loadSubjectAssignments() {
  const container = document.getElementById('subject-deadlines-list');
  const countBadge = document.getElementById('subject-deadline-count');
  try {
    const res = await fetch(`/api/assignments?course_id=${currentCourseId}`);
    if (!res.ok) return false;
    const data = await res.json();
    countBadge.innerText = data.total_count || 0;
    container.innerHTML = '';
    if (!data.assignments || data.assignments.length === 0) {
      container.innerHTML = '<p class="text-slate-500 py-4 text-center">No pending assignments for this course.</p>';
      return false;
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
    return true;
  } catch (e) {
    return false;
  }
}

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

function copyCourseLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.getElementById('btn-copy-link');
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>✓ Copied</span>';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  });
}

function updateCacheBadge() {
  const pill = document.getElementById('cache-status-pill');
  if (pill) pill.classList.remove('hidden');
}

function toggleSection(idx) {
  const body = document.getElementById(`section-body-${idx}`);
  if (body) body.classList.toggle('hidden');
}

async function pullAllCourseFiles() {
  const btn = document.getElementById('btn-pull-all-files');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Pulling files...</span>';
  }

  try {
    const res = await fetch(`/api/courses/${currentCourseId}/files/pull-all`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const downloaded = data.total_downloaded || 0;
    const skipped = data.total_skipped || 0;
    const mb = (data.total_bytes / (1024 * 1024)).toFixed(1);

    alert(`✅ Pull Complete!\n\n• Downloaded: ${downloaded} files (${mb} MB)\n• Shielded/Skipped: ${skipped} items\n\nAll safe course files cached in local workspace.`);
    await reloadCourseData(true);
  } catch (err) {
    alert(`Could not pull files: ${err.message}. Ensure your Moodle session is active.`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>📥 Pull All Files</span>';
    }
  }
}


function escapeHtml(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html) {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}
