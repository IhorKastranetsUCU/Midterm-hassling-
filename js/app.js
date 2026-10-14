// ========================================================
// Main UI Controller & Application Logic
// UCU Probability & Statistics Midterm 2 & Colloquium 2
// ========================================================

class AppController {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentDefFilter = 'all';
    this.currentProbFilter = 'all';
    this.flashcardIndex = 0;
    this.isCardFlipped = false;
    this.colloquiumMode = 'browse'; // 'browse' | 'drill' | 'ticket'
    this.hintLevels = {};           // probId -> how many hint steps are open
  }

  init() {
    this.setupTheme();
    this.setupNavigation();
    this.setupCountdowns();
    this.renderDashboard();
    this.renderColloquiumSection();
    this.renderProblemsSection();
    this.renderTopicsSection();
    this.renderFormulasSection();
    this.setupGeminiDrawer();
    this.setupGeminiSettingsModal();
    this.setupEventListeners();
    this.setupProfileModal();
    this.setupColloquiumModes();
    window.definitionDrill?.init();

    // Trigger initial KaTeX rendering and readiness update
    window.quizManager?.updateReadinessUI();
    window.userProfile?.initExamScheduleControls?.();
    window.userProfile?.updateUserUI();
    window.userProfile?.renderExamScheduleAndGrades?.();
    window.geminiMentor?.updateKeyStatusUI();
    this.renderAllMath();
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('stathustle_theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const themeToggle = document.getElementById('theme-toggle-btn');
    themeToggle?.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('stathustle_theme', isDark ? 'dark' : 'light');
      if (themeToggle) themeToggle.textContent = isDark ? '🌙' : '☀️';
    });
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('[data-tab-target]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab-target');
        this.switchTab(target);
      });
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Toggle active tab buttons
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      if (btn.getAttribute('data-tab-target') === tabId) {
        btn.classList.add('tab-active');
        btn.classList.remove('tab-inactive');
      } else {
        btn.classList.remove('tab-active');
        btn.classList.add('tab-inactive');
      }
    });

    // Toggle active content section
    document.querySelectorAll('.tab-content-panel').forEach(panel => {
      if (panel.id === `tab-${tabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // If switching to quiz, start default quiz if empty
    if (tabId === 'quizzes' && (!window.quizManager?.currentQuiz || window.quizManager.currentQuiz.length === 0)) {
      window.quizManager?.startQuiz(1);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.renderAllMath();
  }

  setupCountdowns() {
    const parseTargetDate = (dateStr, fallbackDayOfWeek, fallbackHour = 9, fallbackMinute = 0) => {
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
      }
      const now = new Date();
      const target = new Date(now);
      target.setHours(fallbackHour, fallbackMinute, 0, 0);
      let diffDays = (fallbackDayOfWeek - now.getDay() + 7) % 7;
      if (diffDays === 0 && now.getTime() >= target.getTime()) {
        diffDays = 7;
      }
      target.setDate(now.getDate() + diffDays);
      return target;
    };

    const formatCountdown = (diffMs) => {
      if (diffMs <= 0) return 'Сьогодні!';
      const totalSec = Math.floor(diffMs / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (d > 0) {
        return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
      }
      return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    };

    const updateTimer = () => {
      const schedule = window.userProfile?.getExamSchedule?.() || {
        colloquiumDate: '2026-10-14T09:00',
        midtermDate: '2026-10-16T08:30'
      };
      const grades = window.userProfile?.getExamGrades?.() || {
        colloquium: { grade: '' },
        midterm: { grade: '' }
      };

      const colTarget = parseTargetDate(schedule.colloquiumDate, 3, 9, 0);
      // Midterm 2 strictly at 08:30 Kyiv time on Friday
      const midTarget = parseTargetDate(schedule.midtermDate, 5, 8, 30);

      const now = new Date();
      const colDiff = colTarget.getTime() - now.getTime();
      const midDiff = midTarget.getTime() - now.getTime();

      // Top Header Countdown Display
      const colEl = document.getElementById('colloquium-countdown-text');
      const midEl = document.getElementById('midterm-countdown-text');

      if (colEl) {
        if (grades.colloquium?.grade) {
          colEl.innerHTML = `<span class="px-2 py-0.5 rounded font-extrabold bg-amber-950 text-amber-300 border border-amber-700">🎯 Колоквіум: ${grades.colloquium.grade}</span>`;
        } else {
          colEl.innerHTML = `⚡ <span class="font-bold text-amber-400 font-mono">${formatCountdown(colDiff)}</span> to Colloquium`;
        }
      }

      if (midEl) {
        if (grades.midterm?.grade) {
          midEl.innerHTML = `<span class="px-2 py-0.5 rounded font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700">🏆 Мідтерм 2: ${grades.midterm.grade}</span>`;
        } else {
          midEl.innerHTML = `🔥 <span class="font-bold text-rose-400 font-mono">${formatCountdown(midDiff)}</span> to Midterm 2 (Пт 08:30)`;
        }
      }

      // Dashboard Card Countdown Displays
      const colCardTimer = document.getElementById('colloquium-card-countdown');
      const midCardTimer = document.getElementById('midterm-card-countdown');

      if (colCardTimer) {
        if (grades.colloquium?.grade) {
          colCardTimer.innerHTML = `<span class="text-emerald-400 text-lg">🎉 Складено (${grades.colloquium.grade})</span>`;
        } else {
          colCardTimer.textContent = formatCountdown(colDiff);
        }
      }

      if (midCardTimer) {
        if (grades.midterm?.grade) {
          midCardTimer.innerHTML = `<span class="text-emerald-400 text-lg">🏆 Складено (${grades.midterm.grade})</span>`;
        } else {
          midCardTimer.textContent = formatCountdown(midDiff);
        }
      }
    };

    updateTimer();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(updateTimer, 1000);
  }

  renderDashboard() {
    this.renderDashboardScheduleOnly();
  }

  renderDashboardScheduleOnly() {
    const roadmapContainer = document.getElementById('dashboard-schedule-list');
    if (!roadmapContainer || !window.PS_DATA?.SCHEDULE_DAYS) return;

    const daysCompleted = window.quizManager?.readinessState?.daysCompleted || {};
    const defScores = window.quizManager?.readinessState?.definitionsScores || {};
    const solvedTests = window.quizManager?.getSolvedTopicTestsCount() || 0;
    const solvedProbs = window.quizManager?.getSolvedProblemsCount() || 0;

    roadmapContainer.innerHTML = window.PS_DATA.SCHEDULE_DAYS.map(day => {
      const isCompleted = daysCompleted[day.day] || false;
      const isToday = day.day === 1;

      return `
        <div class="day-card p-5 rounded-2xl border ${
          isCompleted 
            ? 'border-emerald-500/50 bg-emerald-950/20 shadow-emerald-500/10' 
            : isToday 
              ? 'border-indigo-500 bg-indigo-950/20 shadow-indigo-500/10' 
              : 'border-slate-800 bg-slate-900/60'
        } shadow-lg mb-5 transition duration-200">
          <div class="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800/80 mb-3 gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isCompleted 
                    ? 'bg-emerald-600 text-white' 
                    : isToday 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-800 text-slate-300'
                }">
                  ${isCompleted ? '✓ COMPLETED (+2%)' : isToday ? '⚡ TODAY' : `DAY ${day.day}`}
                </span>
                <span class="text-xs text-slate-400">${day.date}</span>
                <span class="text-[10px] text-indigo-400 font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                  ⚡ Auto-Verified
                </span>
              </div>
              <h3 class="text-lg font-bold text-slate-100 mt-1">${day.title}</h3>
            </div>
            <div class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-indigo-300">
              🎯 ${day.focus}
            </div>
          </div>
          <p class="text-xs text-slate-300 mb-4 leading-relaxed">${day.description}</p>
          
          <!-- Non-manual tasks: automatically updated by actual performance -->
          <div class="space-y-2 mb-4">
            ${day.tasks.map((task, idx) => {
              let isTaskDone = false;
              const studySec = Math.max(window.userProfile?.profile?.studySeconds || 0, window.userProfile?.profile?.totalSeconds || 0);
              if (day.day === 1) {
                if (idx === 0) isTaskDone = [1,2,3,4,5].filter(id => (defScores[id]||0) >= 6).length >= 3;
                if (idx === 1) isTaskDone = solvedTests >= 1;
                if (idx === 2) isTaskDone = studySec >= 1200;
              } else if (day.day === 2) {
                if (idx === 0) isTaskDone = [6,7,8,9,10,11,12].filter(id => (defScores[id]||0) >= 6).length >= 4;
                if (idx === 1) isTaskDone = solvedProbs >= 3;
                if (idx === 2) isTaskDone = solvedTests >= 2;
              } else if (day.day === 3) {
                if (idx === 0) isTaskDone = [13,14,15,16,17,18,19,20,21].filter(id => (defScores[id]||0) >= 6).length >= 4;
                if (idx === 1) isTaskDone = solvedProbs >= 6;
                if (idx === 2) isTaskDone = solvedTests >= 3;
              } else if (day.day === 4) {
                if (idx === 0) isTaskDone = solvedTests >= 5;
                if (idx === 1) isTaskDone = solvedProbs >= 10;
                if (idx === 2) isTaskDone = studySec >= 3600;
              } else if (day.day === 5) {
                if (idx === 0) isTaskDone = solvedTests >= 8;
                if (idx === 1) isTaskDone = (window.quizManager?.readinessState?.overallPercent || 0) >= 80;
                if (idx === 2) isTaskDone = solvedProbs >= 15;
              }

              return `
                <div class="flex items-center gap-3 p-2.5 rounded-lg bg-slate-850/80 text-xs text-slate-200">
                  <input type="checkbox" disabled class="task-checkbox mt-0.5 w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-700" ${isTaskDone ? 'checked' : ''}>
                  <span class="${isTaskDone ? 'line-through text-emerald-400 font-medium' : 'text-slate-300'} flex-1">
                    ${task.text}
                  </span>
                  <span class="text-[10px] font-mono ${isTaskDone ? 'text-emerald-400 font-bold' : 'text-slate-500'}">
                    ${isTaskDone ? '✓ Achieved' : 'In Progress'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-amber-300/90 flex items-center justify-between">
            <span>🏁 <strong>Milestone:</strong> ${day.colloquiumGoal}</span>
            <span class="font-mono text-[11px] ${isCompleted ? 'text-emerald-400 font-bold' : 'text-slate-400'}">
              ${isCompleted ? '✓ +2% Bonus Active' : '+2% Readiness Bonus when all tasks achieved'}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderColloquiumSection() {
    this.renderFlashcard();
    this.renderDefinitionsList();
    this.renderOralQuestionsList();
  }

  setupColloquiumModes() {
    document.querySelectorAll('[data-fc-mode]').forEach(btn => {
      btn.addEventListener('click', () => this.setColloquiumMode(btn.getAttribute('data-fc-mode')));
    });
  }

  // Flashcard hub has three modes: browse cards, random definition drill, exam ticket
  setColloquiumMode(mode) {
    this.colloquiumMode = mode;
    document.querySelectorAll('[data-fc-mode]').forEach(btn => {
      const active = btn.getAttribute('data-fc-mode') === mode;
      btn.classList.toggle('tab-active', active);
      btn.classList.toggle('tab-inactive', !active);
    });

    const panels = { browse: 'flashcard-container', drill: 'definition-drill-container', ticket: 'exam-ticket-container' };
    Object.entries(panels).forEach(([m, id]) => {
      document.getElementById(id)?.classList.toggle('hidden', m !== mode);
    });

    if (mode !== 'ticket') window.examTicket?.hide();

    if (mode === 'drill') {
      window.definitionDrill?.show();
    } else if (mode === 'ticket') {
      window.examTicket?.show();
    } else {
      this.renderFlashcard();
      this.renderAllMath(document.getElementById('flashcard-container'));
    }
  }

  renderFlashcard() {
    const cardContainer = document.getElementById('flashcard-container');
    if (!cardContainer || !window.PS_DATA?.DEFINITIONS_21) return;

    const defs = window.PS_DATA.DEFINITIONS_21;
    const def = defs[this.flashcardIndex];
    const score = window.quizManager?.readinessState?.definitionsScores?.[def.id] || 0;
    const isMastered = score >= 6;

    cardContainer.innerHTML = `
      <div class="flashcard-wrapper w-full max-w-2xl mx-auto perspective cursor-pointer" id="active-flashcard">
        <div class="flashcard-inner relative w-full min-h-[320px] rounded-2xl border ${isMastered ? 'border-emerald-500/50 bg-gradient-to-br from-slate-900 to-emerald-950/30' : 'border-indigo-500/40 bg-gradient-to-br from-slate-900 to-indigo-950/40'} p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span class="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-bold">Definition ${def.id} of 21</span>
              <span class="font-bold ${isMastered ? 'text-emerald-400' : 'text-amber-400'}">
                ${isMastered ? `⭐ Mastered (${score}/10) +1%` : score > 0 ? `Score: ${score}/10 (Need ≥6 for 1%)` : '⏳ Not Yet Tested'}
              </span>
            </div>
            <h3 class="text-2xl font-extrabold text-slate-100 mb-1">${def.name}</h3>
            <div class="text-sm font-semibold text-indigo-400 mb-4">${def.nameUa}</div>

            <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-lg font-mono text-indigo-200 mb-4 overflow-x-auto">
              $$${def.latex}$$
            </div>

            <div id="flashcard-revealed-details" class="${this.isCardFlipped ? '' : 'hidden'} text-xs text-slate-300 space-y-3 mt-4 border-t border-slate-800 pt-4">
              <p><strong>Formal Definition:</strong> ${this.formatMd(def.definition)}</p>
              ${def.keyPoints?.length ? `
                <div class="p-3 rounded-lg bg-indigo-950/40 border border-indigo-600/60">
                  <div class="font-bold text-indigo-200 mb-1.5">📌 Обов'язково знати (${def.keyPoints.length})</div>
                  <ul class="list-disc pl-4 space-y-1 text-slate-200">
                    ${def.keyPoints.map(p => `<li>${this.formatMd(p)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              ${def.example ? `<p><strong>💡 Приклад:</strong> ${this.formatMd(def.example)}</p>` : ''}
              <div class="p-2.5 rounded bg-amber-950/30 border border-amber-800/50 text-amber-200">
                <strong>🎯 Colloquium Oral Tip:</strong> ${this.formatMd(def.colloquiumTip)}
              </div>
              <div class="p-2.5 rounded bg-rose-950/30 border border-rose-800/50 text-rose-200">
                <strong>⚠️ Professor Trap:</strong> ${this.formatMd(def.trap)}
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>${this.isCardFlipped ? 'Click card to minimize' : '💡 Click card to reveal definition & traps'}</span>
            <button id="card-ai-test-btn" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition">
              🤖 Test with Gemini (Grade ≥6 for 1%)
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-center items-center gap-4 mt-6">
        <button id="fc-prev-btn" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition">
          ◀ Previous
        </button>
        <button id="fc-self-pass-btn" class="px-5 py-2 rounded-lg ${isMastered ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400 border border-emerald-600'} text-sm font-semibold transition">
          ${isMastered ? `✓ Scored ${score}/10 (+1% Readiness)` : 'Self-Check: Score 8/10 (+1%)'}
        </button>
        <button id="fc-next-btn" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition">
          Next ▶
        </button>
      </div>
    `;

    document.getElementById('active-flashcard')?.addEventListener('click', (e) => {
      if (e.target.closest('#card-ai-test-btn')) return;
      this.isCardFlipped = !this.isCardFlipped;
      this.renderFlashcard();
      this.renderAllMath();
    });

    document.getElementById('card-ai-test-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openOralSimulatorModal(def.name, `Define ${def.name} rigorously with all measurability, integrability or support conditions and state its key properties.`, def.id);
    });

    document.getElementById('fc-self-pass-btn')?.addEventListener('click', () => {
      window.quizManager?.recordDefinitionScore(def.id, 8);
      this.renderFlashcard();
      this.renderDefinitionsList();
    });

    document.getElementById('fc-prev-btn')?.addEventListener('click', () => {
      this.flashcardIndex = (this.flashcardIndex - 1 + defs.length) % defs.length;
      this.isCardFlipped = false;
      this.renderFlashcard();
      this.renderAllMath();
    });

    document.getElementById('fc-next-btn')?.addEventListener('click', () => {
      this.flashcardIndex = (this.flashcardIndex + 1) % defs.length;
      this.isCardFlipped = false;
      this.renderFlashcard();
      this.renderAllMath();
    });
  }

  renderDefinitionsList() {
    const listContainer = document.getElementById('definitions-grid-list');
    if (!listContainer || !window.PS_DATA?.DEFINITIONS_21) return;

    listContainer.innerHTML = window.PS_DATA.DEFINITIONS_21.map(def => {
      const score = window.quizManager?.readinessState?.definitionsScores?.[def.id] || 0;
      const isMastered = score >= 6;

      return `
        <div class="def-card p-4 rounded-xl border ${isMastered ? 'border-emerald-600/50 bg-emerald-950/10' : 'border-slate-800 bg-slate-900/60'} hover:border-indigo-500 transition duration-150">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-bold px-2 py-0.5 rounded ${isMastered ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-indigo-300'}">#${def.id}</span>
            <span class="text-xs font-bold ${isMastered ? 'text-emerald-400' : 'text-slate-400'}">
              ${isMastered ? `✓ ${score}/10 (+1%)` : score > 0 ? `${score}/10` : 'Not Tested'}
            </span>
          </div>
          <h4 class="font-bold text-slate-100 text-sm mb-1">${def.name}</h4>
          <div class="text-xs text-slate-400 font-mono mb-2">$${def.latex}$</div>
          <p class="text-xs text-slate-300 line-clamp-3 mb-2">${this.formatMd(def.definition)}</p>
          ${def.keyPoints?.length ? `<div class="text-[11px] font-semibold text-indigo-300 mb-3">📌 Обов'язково знати: ${def.keyPoints.length}</div>` : ''}
          <div class="flex justify-between items-center text-[11px] pt-2 border-t border-slate-800/80">
            <span class="text-amber-400/90 font-medium truncate max-w-[160px]">⚠️ ${this.formatMd(def.trap)}</span>
            <button class="def-jump-btn text-indigo-400 hover:text-indigo-300 font-semibold" data-def-index="${def.id - 1}">Test / Practice ➔</button>
          </div>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.def-jump-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.flashcardIndex = parseInt(btn.getAttribute('data-def-index'), 10);
        this.isCardFlipped = true;
        if (this.colloquiumMode !== 'browse') this.setColloquiumMode('browse');
        this.renderFlashcard();
        this.renderAllMath();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      });
    });
  }

  renderOralQuestionsList() {
    const container = document.getElementById('oral-questions-list');
    if (!container || !window.PS_DATA?.ORAL_QUESTIONS_12) return;

    container.innerHTML = window.PS_DATA.ORAL_QUESTIONS_12.map(oq => {
      const score = window.quizManager?.readinessState?.definitionsScores?.[`oral_${oq.id}`] || null;
      return `
        <div class="oral-card p-5 rounded-2xl border border-slate-800 bg-slate-900/70 mb-4 hover:border-slate-700 transition">
          <div class="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  Colloquium Question ${oq.id}
                </span>
                <span class="text-xs text-slate-400 font-mono">⏱️ ${oq.time} presentation</span>
              </div>
              <h3 class="text-base font-bold text-slate-100 mt-1">${oq.title}</h3>
            </div>
            <div class="flex items-center gap-3">
              ${score !== null ? `<span class="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 font-bold text-xs border border-indigo-800">Score: ${score}/10</span>` : ''}
              <button class="oral-simulate-btn px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition" data-oq-id="${oq.id}">
                🎙️ Simulate Oral Defense
              </button>
            </div>
          </div>

          <div class="text-xs text-slate-300 space-y-2 mb-4">
            <div class="font-bold text-indigo-300">Recommended 4-Step Answer Flow:</div>
            <ul class="list-disc list-inside space-y-1 text-slate-300">
              ${oq.structure.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>

          <details class="text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <summary class="font-semibold text-slate-300 cursor-pointer hover:text-indigo-400">📖 View Full Model Spoken Answer & Examiner Follow-Up Questions</summary>
            <div class="mt-3 space-y-3 pt-3 border-t border-slate-800 text-slate-300 leading-relaxed">
              <p><strong>Spoken Model Answer:</strong><br>${oq.speech}</p>
              <div>
                <strong>Key Formulas to Write on Board:</strong>
                <div class="p-2 rounded bg-slate-900 font-mono text-indigo-200 my-1 overflow-x-auto">
                  ${oq.keyFormulas.map(f => `<div>$$${f}$$</div>`).join('')}
                </div>
              </div>
              <div class="p-2.5 rounded bg-rose-950/30 border border-rose-800 text-rose-200">
                <strong>Tricky Follow-Up Questions:</strong>
                <ul class="list-disc list-inside mt-1">
                  ${oq.examinerQuestions.map(q => `<li>${q}</li>`).join('')}
                </ul>
              </div>
            </div>
          </details>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.oral-simulate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-oq-id'), 10);
        const oq = window.PS_DATA.ORAL_QUESTIONS_12.find(q => q.id === id);
        if (oq) {
          this.openOralSimulatorModal(oq.title, oq.structure.join('\n'), `oral_${id}`);
        }
      });
    });
  }

  // Hint ladder: first a direction (which approach, no computations), then the dataset's step hints
  getHintSteps(prob) {
    const steps = [];
    const direction = window.PS_DATA?.PROBLEM_DIRECTIONS?.[prob.id];
    if (direction) {
      steps.push({
        label: '🧭 Куди рухатись?',
        html: `<strong>🧭 Напрямок:</strong> ${direction}`,
        cls: 'p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-100'
      });
    }
    const hints = prob.hints || [];
    hints.forEach((h, i) => steps.push({
      label: `💡 Підказка ${i + 1} з ${hints.length}`,
      html: h,
      cls: 'text-slate-300'
    }));
    return steps;
  }

  renderHintLadder(prob) {
    const steps = this.getHintSteps(prob);
    if (!steps.length) return '';
    const shown = Math.min(this.hintLevels[prob.id] || 0, steps.length);
    const next = steps[shown];

    return `
      <div class="text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-semibold text-amber-300">💡 Підказки${shown ? ` · відкрито ${shown} з ${steps.length}` : ' — не розв\'язок, а поштовх'}</span>
          ${next
            ? `<button class="hint-next-btn px-3 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-200 font-semibold cursor-pointer transition" data-prob-id="${prob.id}">${next.label}</button>`
            : '<span class="text-[11px] text-slate-500">Підказки закінчились — далі тільки повний розв\'язок нижче</span>'}
        </div>
        ${shown ? `
          <div class="mt-2.5 pt-2.5 border-t border-slate-800 space-y-2">
            ${steps.slice(0, shown).map(s => `<div class="${s.cls}">${s.html}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Jump to a problem card from elsewhere (e.g. the dashboard mistakes panel)
  openProblem(probId) {
    this.switchTab('problems');
    if (!document.getElementById(`prob-card-${probId}`)) {
      document.querySelector('[data-prob-filter="all"]')?.click(); // card is hidden by the active filter
    }
    requestAnimationFrame(() => {
      document.getElementById(`prob-card-${probId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --- PROBLEM BANK WITH INTERACTIVE FINAL ANSWER SUBMISSION ---
  renderProblemsSection() {
    const container = document.getElementById('problems-list-container');
    if (!container || !window.PS_DATA?.PROBLEMS_BANK) return;

    let problems = window.PS_DATA.PROBLEMS_BANK;
    if (this.currentProbFilter !== 'all') {
      problems = problems.filter(p => 
        p.source.toLowerCase().includes(this.currentProbFilter.toLowerCase()) || 
        p.topic.toLowerCase().includes(this.currentProbFilter.toLowerCase())
      );
    }

    container.innerHTML = problems.map(prob => {
      const isSolved = window.quizManager?.readinessState?.problemsMastered?.[prob.id] || false;

      return `
        <div class="problem-card p-5 rounded-2xl border ${isSolved ? 'border-emerald-600/50 bg-emerald-950/15 shadow-emerald-900/10' : 'border-slate-800 bg-slate-900/70'} mb-6 shadow-xl" id="prob-card-${prob.id}">
          <div class="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-900/60 text-indigo-300">${prob.source}</span>
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">${prob.topic}</span>
                <span class="text-xs font-semibold ${prob.difficulty === 'Easy' ? 'text-emerald-400' : prob.difficulty === 'Medium' ? 'text-amber-400' : 'text-rose-400'}">
                  ● ${prob.difficulty}
                </span>
              </div>
              <h3 class="text-lg font-bold text-slate-100 mt-1">${prob.title}</h3>
            </div>
            <div>
              <span class="px-3 py-1 rounded-full text-xs font-bold ${isSolved ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                ${isSolved ? '✓ Solved (+2.5% Readiness)' : 'Unsolved (+2.5% on Submit)'}
              </span>
            </div>
          </div>

          <!-- Problem Statement -->
          <div class="text-sm text-slate-200 mb-4 whitespace-pre-line leading-relaxed">
            ${prob.statement}
          </div>

          <!-- Interactive Final Answer Submission Box -->
          <div class="mb-5 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
            <div class="text-xs font-bold text-indigo-400 mb-1.5 flex items-center justify-between">
              <span>✍️ Submit Final Answer for Readiness Credit:</span>
              <span class="text-[11px] font-mono text-emerald-400">+2.5% Readiness</span>
            </div>
            <p class="text-xs text-slate-300 mb-2">${prob.inputPrompt || 'Enter final answer:'}</p>
            <div class="flex flex-col sm:flex-row gap-2">
              <input type="text" id="prob-input-${prob.id}" placeholder="Твоя відповідь…"
                     value="${isSolved ? prob.expectedAnswer : ''}" ${isSolved ? 'disabled' : ''}
                     class="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500">
              <button class="prob-submit-btn px-5 py-2 rounded-lg ${isSolved ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-500'} text-white font-bold text-xs transition" 
                      data-prob-id="${prob.id}">
                ${isSolved ? '✓ Verified Correct' : 'Submit & Check ➔'}
              </button>
            </div>
            <div id="prob-feedback-${prob.id}" class="${isSolved ? '' : 'hidden'} mt-2 text-xs font-semibold ${isSolved ? 'text-emerald-400' : ''}">
              ${isSolved ? `✅ Verified! Correct Canonical Answer: ${prob.expectedAnswer}` : ''}
            </div>
          </div>

          <!-- Hints open one at a time; the full derivation stays collapsed until asked for -->
          <div class="space-y-3">
            <div id="hint-ladder-${prob.id}">${this.renderHintLadder(prob)}</div>

            <details class="text-xs bg-slate-950/80 p-4 rounded-xl border border-indigo-900/50">
              <summary class="font-bold text-indigo-400 cursor-pointer hover:underline text-sm">📝 Complete Rigorous Step-by-Step Solution & Working</summary>
              <div class="mt-3 pt-3 border-t border-slate-800 text-slate-200 leading-relaxed space-y-2 whitespace-pre-line">
                ${prob.solution}
              </div>
            </details>
          </div>
        </div>
      `;
    }).join('');

    // One delegated listener survives the innerHTML re-renders of the problem list
    if (!container.dataset.hintsBound) {
      container.dataset.hintsBound = 'true';
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.hint-next-btn');
        if (!btn) return;
        const pid = parseInt(btn.getAttribute('data-prob-id'), 10);
        this.hintLevels[pid] = (this.hintLevels[pid] || 0) + 1;
        const ladder = document.getElementById(`hint-ladder-${pid}`);
        const prob = window.PS_DATA.PROBLEMS_BANK.find(p => p.id === pid);
        if (ladder && prob) {
          ladder.innerHTML = this.renderHintLadder(prob);
          this.renderAllMath(ladder);
        }
      });
    }

    // Attach answer submission handlers
    container.querySelectorAll('.prob-submit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = parseInt(btn.getAttribute('data-prob-id'), 10);
        this.verifyProblemAnswer(pid);
      });
    });

    this.renderAllMath();
  }

  verifyProblemAnswer(probId) {
    const prob = window.PS_DATA?.PROBLEMS_BANK?.find(p => p.id === probId);
    if (!prob) return;

    const inputEl = document.getElementById(`prob-input-${probId}`);
    const feedbackEl = document.getElementById(`prob-feedback-${probId}`);
    if (!inputEl || !feedbackEl) return;

    const userVal = inputEl.value.trim().toLowerCase();
    if (!userVal) {
      alert("Please enter your final answer before submitting!");
      return;
    }

    const acceptable = (prob.acceptableAnswers || [prob.expectedAnswer]).map(a => a.toLowerCase().trim());
    
    // Check match directly or numeric closeness
    let isCorrect = acceptable.includes(userVal);
    if (!isCorrect) {
      const parsedUser = parseFloat(userVal);
      if (!isNaN(parsedUser)) {
        for (const a of acceptable) {
          const parsedAns = parseFloat(a);
          if (!isNaN(parsedAns) && Math.abs(parsedUser - parsedAns) < 0.02) {
            isCorrect = true;
            break;
          }
        }
      }
    }

    feedbackEl.classList.remove('hidden');
    if (isCorrect) {
      feedbackEl.className = 'mt-2 text-xs font-semibold text-emerald-400';
      feedbackEl.innerHTML = `✅ Correct! Canonical answer: <strong>${prob.expectedAnswer}</strong>. (+2.5% Readiness awarded!)`;
      inputEl.disabled = true;
      const submitBtn = document.querySelector(`.prob-submit-btn[data-prob-id="${probId}"]`);
      if (submitBtn) {
        submitBtn.className = 'prob-submit-btn px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs';
        submitBtn.textContent = '✓ Verified Correct';
      }
      window.quizManager?.recordProblemSolved(probId, true);
      window.userProfile?.recordSuccess(`prob_${probId}`);
    } else {
      feedbackEl.className = 'mt-2 text-xs font-semibold text-rose-400';
      feedbackEl.innerHTML = `❌ Not quite. Compare with the hint or step-by-step solution below and try again!`;
      window.userProfile?.recordMistake(`prob_${probId}`, prob.title, prob.topic, 'problem');
    }
  }

  renderTopicsSection() {
    const container = document.getElementById('topics-notes-container');
    if (!container || !window.PS_DATA?.TOPICS_NOTES) return;

    container.innerHTML = window.PS_DATA.TOPICS_NOTES.map(t => {
      const testRecord = window.quizManager?.readinessState?.topicTestsSolved?.[t.id];
      const isSolved = testRecord?.solved;
      const score = testRecord?.score;
      const total = testRecord?.total || 50;
      const pct = score !== undefined ? Math.round((score / total) * 100) : null;

      return `
        <div class="topic-note-card p-6 rounded-2xl border ${isSolved ? 'border-emerald-800/80 bg-slate-900/80 shadow-emerald-950/20' : 'border-slate-800 bg-slate-900/60'} mb-6 shadow-xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <h3 class="text-xl font-extrabold text-slate-100">${t.title}</h3>
            ${isSolved ? `
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700 shrink-0 self-start sm:self-center">
                <span>✓</span> Пройдено: ${score}/${total} (${pct}%)
              </span>
            ` : `
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 shrink-0 self-start sm:self-center">
                Не пройдено (50 Q)
              </span>
            `}
          </div>
          <p class="text-xs text-slate-400 mb-4 italic">${t.summary}</p>
          <div class="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed space-y-2 whitespace-pre-line border-t border-slate-800 pt-4">
            ${t.content}
          </div>
          <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <div class="text-xs text-slate-400">
              ${isSolved ? `<span class="text-emerald-400 font-semibold">✓ Зараховано до прогресу підготовки (+1%)</span>` : 'Пройдіть тест для зарахування +1% до готовності'}
            </div>
            <button class="topic-quiz-btn px-4 py-2 rounded-lg ${isSolved ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-indigo-600 hover:bg-indigo-500'} text-white font-semibold text-xs transition flex items-center gap-1.5" data-topic-id="${t.id}">
              ${isSolved ? '<span>🔄</span> Пройти повторно (50 Q)' : '<span>🧠</span> Quiz on this Topic (50 Q)'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.topic-quiz-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const topicId = parseInt(btn.getAttribute('data-topic-id'), 10);
        this.switchTab('quizzes');
        window.quizManager?.startQuiz(topicId);
      });
    });

    this.renderAllMath(container);
  }

  renderFormulasSection() {
    const tbody = document.getElementById('distributions-table-body');
    if (!tbody || !window.PS_DATA?.DISTRIBUTIONS_DATA) return;

    const wrapMath = (val) => {
      if (!val) return '';
      const str = String(val).trim();
      if (str.startsWith('$') || str.startsWith('\\[')) return str;
      return `$${str}$`;
    };

    const formatNuance = (text) => {
      if (!text) return '';
      if (text.includes('$')) return text;
      // Auto-wrap common LaTeX formulas and symbols if not already wrapped
      return text.replace(/(\\[a-zA-Z]+(?:\{[^}]*\})*|[NEPBGU]\([^)]+\)|\b[a-z]\s*~|\bX_[1-2]\b|\b\w+\^2\b)/g, m => `$${m}$`);
    };

    tbody.innerHTML = window.PS_DATA.DISTRIBUTIONS_DATA.map(d => {
      const pmf = d.pmf_pdf || d.pmf_or_pdf || '';
      const nuance = d.keyProperty || d.nuance || '';

      return `
      <tr class="hover:bg-slate-850/50 transition text-xs border-b border-slate-800/60">
        <td class="p-3 font-bold text-indigo-300 whitespace-nowrap">${d.name}</td>
        <td class="p-3 text-slate-300 font-mono">${wrapMath(d.support)}</td>
        <td class="p-3 text-slate-200 font-mono">${wrapMath(pmf)}</td>
        <td class="p-3 text-emerald-400 font-mono">${wrapMath(d.mean)}</td>
        <td class="p-3 text-amber-400 font-mono">${wrapMath(d.variance)}</td>
        <td class="p-3 text-cyan-300 font-mono">${wrapMath(d.pgf)}</td>
        <td class="p-3 text-violet-300 font-mono">${wrapMath(d.mgf)}</td>
        <td class="p-3 text-slate-400 text-[11px] leading-tight">${formatNuance(nuance)}</td>
      </tr>
    `}).join('');

    this.renderAllMath(tbody);
  }

  setupGeminiDrawer() {
    const drawer = document.getElementById('gemini-drawer');
    const openBtn = document.getElementById('gemini-open-drawer-btn');
    const closeBtn = document.getElementById('gemini-close-drawer-btn');
    const sendBtn = document.getElementById('gemini-chat-send-btn');
    const input = document.getElementById('gemini-chat-input');
    const messages = document.getElementById('gemini-chat-messages');

    openBtn?.addEventListener('click', () => {
      drawer?.classList.remove('translate-x-full');
      window.geminiMentor?.updateKeyStatusUI();
    });
    closeBtn?.addEventListener('click', () => drawer?.classList.add('translate-x-full'));

    const handleSend = async () => {
      const text = input?.value?.trim();
      if (!text) return;

      if (!window.geminiMentor?.hasValidApiKey()) {
        const botBubble = document.createElement('div');
        botBubble.className = 'p-3.5 rounded-xl bg-amber-950/80 text-amber-200 self-start max-w-[90%] text-xs border border-amber-800 leading-relaxed';
        botBubble.innerHTML = `
          <div class="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
            <span>⚠️</span> <span>Потрібен Gemini API Key:</span>
          </div>
          <div>Для спілкування з Gemini AI Ментором введіть ваш персональний ключ Google AI Studio. Це безкоштовно та займає 10 секунд!</div>
          <button id="chat-need-key-btn" class="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition">
            🔑 Налаштувати API Key
          </button>
        `;
        messages?.appendChild(botBubble);
        messages.scrollTop = messages.scrollHeight;
        document.getElementById('chat-need-key-btn')?.addEventListener('click', () => {
          document.getElementById('gemini-settings-modal')?.classList.remove('hidden');
        });
        return;
      }

      input.value = '';

      // User Message
      const userBubble = document.createElement('div');
      userBubble.className = 'p-3 rounded-xl bg-indigo-600 text-white self-end max-w-[85%] text-xs shadow-md';
      userBubble.textContent = text;
      messages?.appendChild(userBubble);
      messages.scrollTop = messages.scrollHeight;

      // Loading Bubble
      const botBubble = document.createElement('div');
      botBubble.className = 'p-3 rounded-xl bg-slate-800 text-slate-200 self-start max-w-[85%] text-xs border border-slate-700/80 leading-relaxed';
      botBubble.textContent = 'Thinking mathematically...';
      messages?.appendChild(botBubble);
      messages.scrollTop = messages.scrollHeight;

      const reply = await window.geminiMentor?.chat(text);
      botBubble.innerHTML = reply;
      this.renderAllMath(botBubble);
      messages.scrollTop = messages.scrollHeight;
    };

    sendBtn?.addEventListener('click', handleSend);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }

  setupGeminiSettingsModal() {
    const modal = document.getElementById('gemini-settings-modal');
    const headerGearBtn = document.getElementById('open-api-key-settings');
    const drawerKeyBtn = document.getElementById('drawer-api-key-btn');
    const closeBtn = document.getElementById('close-gemini-settings-btn');
    const keyInput = document.getElementById('settings-api-key-input');
    const modelSelect = document.getElementById('settings-model-select');
    const testBtn = document.getElementById('settings-test-connection-btn');
    const saveBtn = document.getElementById('settings-save-btn');
    const clearBtn = document.getElementById('settings-clear-key-btn');
    const toggleVisBtn = document.getElementById('toggle-key-visibility-btn');
    const statusBox = document.getElementById('settings-test-status');

    const openSettings = () => {
      if (keyInput) keyInput.value = window.geminiMentor?.apiKey || '';
      if (modelSelect) modelSelect.value = window.geminiMentor?.selectedModel || 'gemini-3.8-flash';
      if (statusBox) statusBox.classList.add('hidden');
      modal?.classList.remove('hidden');
    };

    headerGearBtn?.addEventListener('click', openSettings);
    drawerKeyBtn?.addEventListener('click', openSettings);
    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    toggleVisBtn?.addEventListener('click', () => {
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
        toggleVisBtn.textContent = 'Hide';
      } else {
        keyInput.type = 'password';
        toggleVisBtn.textContent = 'Show';
      }
    });

    testBtn?.addEventListener('click', async () => {
      const candidate = keyInput?.value?.trim();
      if (!candidate) {
        if (statusBox) {
          statusBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-950/80 border border-rose-800 text-rose-300';
          statusBox.textContent = 'Будь ласка, введіть API ключ перед тестуванням!';
          statusBox.classList.remove('hidden');
        }
        return;
      }
      testBtn.textContent = '⏳ Перевірка...';
      const res = await window.geminiMentor?.testConnection(candidate);
      testBtn.textContent = '⚡ Test Connection';
      if (statusBox) {
        statusBox.classList.remove('hidden');
        if (res.success) {
          if (res.warning) {
            statusBox.className = 'p-3 rounded-xl text-xs font-semibold bg-amber-950/80 border border-amber-800 text-amber-300 leading-relaxed';
            statusBox.innerHTML = `⚠️ ${res.message}`;
          } else {
            statusBox.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300 leading-relaxed';
            statusBox.innerHTML = `✅ ${res.message}`;
          }
        } else {
          statusBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-950/80 border border-rose-800 text-rose-300 leading-relaxed';
          statusBox.innerHTML = `❌ ${res.message}`;
        }
      }
    });

    saveBtn?.addEventListener('click', () => {
      const key = keyInput?.value?.trim();
      const model = modelSelect?.value;
      if (model) window.geminiMentor?.setModel(model);
      window.geminiMentor?.setApiKey(key);
      modal?.classList.add('hidden');
      window.geminiMentor?.updateKeyStatusUI();
      alert('✅ Налаштування Gemini AI збережено!');
    });

    clearBtn?.addEventListener('click', () => {
      if (confirm('Очистити збережений API ключ?')) {
        window.geminiMentor?.setApiKey('');
        if (keyInput) keyInput.value = '';
        if (statusBox) {
          statusBox.className = 'p-3 rounded-xl text-xs font-semibold bg-amber-950/80 border border-amber-800 text-amber-300';
          statusBox.textContent = 'Ключ очищено.';
          statusBox.classList.remove('hidden');
        }
      }
    });
  }

  openOralSimulatorModal(title, rubric, defId = null) {
    const modal = document.getElementById('oral-simulator-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.getElementById('modal-oral-title').textContent = title;
    document.getElementById('modal-oral-rubric').textContent = rubric;
    const answerInput = document.getElementById('modal-oral-student-answer');
    const feedbackBox = document.getElementById('modal-oral-feedback-box');
    answerInput.value = '';
    feedbackBox.classList.add('hidden');

    const submitBtn = document.getElementById('modal-oral-submit-btn');
    submitBtn.onclick = async () => {
      const studentText = answerInput.value.trim();
      if (!studentText) {
        alert("Please speak or write your definition / proof first!");
        return;
      }

      if (!window.geminiMentor?.hasValidApiKey()) {
        const wantsKey = confirm("Для строгої перевірки нейромережею Gemini підключіть ваш безкоштовний API Key.\nНатисніть 'OK' щоб ввести ключ, або 'Скасувати' для офлайн-оцінки.");
        if (wantsKey) {
          document.getElementById('gemini-settings-modal')?.classList.remove('hidden');
          return;
        }
      }

      feedbackBox.classList.remove('hidden');
      feedbackBox.innerHTML = '<div class="p-4 text-center text-xs text-indigo-400">Evaluating against UCU Colloquium standards...</div>';

      const evalResult = await window.geminiMentor?.evaluateOralAnswer(title, studentText, rubric);
      feedbackBox.innerHTML = evalResult;
      this.renderAllMath(feedbackBox);

      // Extract score (e.g. Score: 8/10)
      const match = evalResult.match(/Score:\s*(\d+)\/10/i);
      const score = match ? parseInt(match[1], 10) : 7;
      
      if (defId) {
        window.quizManager?.recordDefinitionScore(defId, score);
        this.renderColloquiumSection();
      }
    };

    document.getElementById('modal-oral-close-btn').onclick = () => {
      modal.classList.add('hidden');
    };
  }

  setupProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    const openBtn = document.getElementById('header-user-profile-btn');
    const closeBtn = document.getElementById('close-profile-modal-btn');
    const saveNameBtn = document.getElementById('profile-save-name-btn');
    const nameInput = document.getElementById('profile-name-input');
    const photoUploadInput = document.getElementById('profile-photo-upload');

    openBtn?.addEventListener('click', () => {
      if (nameInput && window.userProfile) {
        nameInput.value = window.userProfile.profile.name;
      }
      modal?.classList.remove('hidden');
      window.userProfile?.renderAvatar('modal-avatar-preview');
      window.userProfile?.renderWardrobeList();
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    saveNameBtn?.addEventListener('click', () => {
      const newName = nameInput?.value?.trim();
      if (newName && window.userProfile) {
        window.userProfile.updateProfileDetails(newName, null);
        alert("✅ Profile name updated!");
      }
    });

    photoUploadInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && window.userProfile) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          window.userProfile.updateProfileDetails(null, evt.target.result);
          alert("✅ Custom profile photo uploaded!");
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('profile-reset-timer-btn')?.addEventListener('click', () => {
      if (confirm("Reset your study session timer back to 0:00?")) {
        window.userProfile?.resetStudyTimer();
      }
    });
  }

  setupEventListeners() {
    // Problem filter buttons
    document.querySelectorAll('[data-prob-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-prob-filter]').forEach(b => b.classList.remove('bg-indigo-600', 'text-white'));
        btn.classList.add('bg-indigo-600', 'text-white');
        this.currentProbFilter = btn.getAttribute('data-prob-filter');
        this.renderProblemsSection();
      });
    });

    // Pomodoro main controller
    document.getElementById('main-pomodoro-toggle')?.addEventListener('click', () => {
      if (window.pomodoroTimer?.isRunning) window.pomodoroTimer.pause();
      else window.pomodoroTimer.start();
    });

    document.getElementById('main-pomodoro-reset')?.addEventListener('click', () => {
      window.pomodoroTimer?.reset();
    });

    document.getElementById('pomodoro-toggle-btn')?.addEventListener('click', () => {
      if (window.pomodoroTimer?.isRunning) window.pomodoroTimer.pause();
      else window.pomodoroTimer.start();
    });
  }

  // Dataset strings mark the must-know terms with **bold** markdown
  formatMd(text = '') {
    return String(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  renderAllMath(targetElem = null) {
    const doRender = () => {
      if (typeof window.renderMathInElement === 'function') {
        try {
          window.renderMathInElement(targetElem || document.body, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false },
              { left: "\\[", right: "\\]", display: true },
              { left: "\\(", right: "\\)", display: false }
            ],
            ignoredTags: ["script", "noscript", "style", "textarea", "option"],
            throwOnError: false
          });
        } catch (e) {
          console.warn('KaTeX render notice:', e);
        }
      } else {
        setTimeout(doRender, 100);
      }
    };
    doRender();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
