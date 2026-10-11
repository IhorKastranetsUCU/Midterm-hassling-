// ========================================================
// Quiz Manager & Readiness Engine (600 Questions / 12 Topics)
// UCU Probability & Statistics Midterm 2 & Colloquium 2
// ========================================================

class QuizManager {
  constructor() {
    this.currentQuiz = [];
    this.currentIndex = 0;
    this.score = 0;
    this.selectedOption = null;
    this.isAnswered = false;
    this.activeTopicId = 1;

    // Load state for the currently active user account
    const currentUserEmail = window.userProfile?.profile?.email;
    const userSavedState = window.userProfile?.profile?.readinessState;
    this.loadUserState(currentUserEmail, userSavedState);
  }

  getDefaultState() {
    return {
      definitionsScores: {},   // defId: score (0-10) -> 1% per score >= 6/10 (max 21%)
      topicTestsSolved: {},    // topicId: { solved: bool, score: int, total: int } -> 1% per topic test
      questionsAnswered: {},   // qId: { correct: bool }
      problemsMastered: {},    // probId: bool -> remaining % for solving problems
      daysCompleted: {},       // dayNumber: bool -> bonus % per day
      overallPercent: 0
    };
  }

  loadUserState(email = null, savedState = null) {
    const defaultState = this.getDefaultState();
    let stateToUse = null;

    if (savedState && typeof savedState === 'object' && Object.keys(savedState).length > 0) {
      stateToUse = savedState;
    } else if (email) {
      const emailKey = email.toLowerCase().trim();
      const fromLocal = localStorage.getItem('stathustle_readiness_' + emailKey);
      if (fromLocal) {
        try { stateToUse = JSON.parse(fromLocal); } catch (e) {}
      }
    }

    if (!stateToUse && !email) {
      const guestState = localStorage.getItem('stathustle_readiness_guest');
      if (guestState) {
        try { stateToUse = JSON.parse(guestState); } catch (e) {}
      }
    }

    if (stateToUse) {
      this.readinessState = Object.assign(defaultState, stateToUse);
      if (!this.readinessState.definitionsScores) this.readinessState.definitionsScores = {};
      if (!this.readinessState.topicTestsSolved) this.readinessState.topicTestsSolved = {};
      if (!this.readinessState.questionsAnswered) this.readinessState.questionsAnswered = {};
      if (!this.readinessState.problemsMastered) this.readinessState.problemsMastered = {};
      if (!this.readinessState.daysCompleted) this.readinessState.daysCompleted = {};
    } else {
      this.readinessState = defaultState;
    }

    this.calculateOverallReadiness();
    this.updateReadinessUI();
    if (window.userProfile) {
      window.userProfile.renderWardrobeList();
    }
  }

  saveReadiness() {
    this.calculateOverallReadiness();

    const currentUser = window.userProfile?.profile;
    const email = currentUser?.email;

    if (email && window.userProfile?.isLoggedIn) {
      const emailKey = email.toLowerCase().trim();
      const stateCopy = JSON.parse(JSON.stringify(this.readinessState));
      // Save directly to user-scoped key
      localStorage.setItem('stathustle_readiness_' + emailKey, JSON.stringify(stateCopy));
      // Save into profile object and sync registry
      currentUser.readinessState = stateCopy;
      window.userProfile.saveProfile();
    } else {
      localStorage.setItem('stathustle_readiness_guest', JSON.stringify(this.readinessState));
    }

    // Also update legacy key for compatibility
    localStorage.setItem('stathustle_readiness_state', JSON.stringify(this.readinessState));
    this.updateReadinessUI();
    if (window.userProfile) {
      window.userProfile.renderWardrobeList();
    }
  }

  // --- DEFINITIONS SCORING: 1% per definition scored >= 6/10 ---
  recordDefinitionScore(defId, score) {
    const currentBest = this.readinessState.definitionsScores[defId] || 0;
    this.readinessState.definitionsScores[defId] = Math.max(score, currentBest);
    this.saveReadiness();
  }

  getPassingDefinitionsCount() {
    return Object.values(this.readinessState.definitionsScores).filter(score => score >= 6).length;
  }

  // --- PROBLEM MASTERING: Earn % by submitting correct final answers ---
  recordProblemSolved(probId, isSolved = true) {
    this.readinessState.problemsMastered[probId] = isSolved;
    this.saveReadiness();
  }

  getSolvedProblemsCount() {
    return Object.values(this.readinessState.problemsMastered).filter(Boolean).length;
  }

  recordTopicTestSolved(topicId, score, total) {
    const isSolved = (score / total) >= 0.5; // Solved if score >= 50%
    const existing = this.readinessState.topicTestsSolved[topicId];
    const bestScore = existing ? Math.max(existing.score || 0, score) : score;
    this.readinessState.topicTestsSolved[topicId] = {
      solved: isSolved || (existing?.solved || false),
      score: bestScore,
      total: total,
      lastScore: score,
      attempts: (existing?.attempts || 0) + 1,
      timestamp: Date.now()
    };
    this.saveReadiness();
    if (window.app?.renderTopicsSection) {
      window.app.renderTopicsSection();
    }
  }

  getSolvedTopicTestsCount() {
    return Object.values(this.readinessState.topicTestsSolved).filter(t => t?.solved).length;
  }

  // --- DAY MILESTONES: Non-manual, verified from actual completed activities ---
  evaluateDayMilestones() {
    const passDefs = this.getPassingDefinitionsCount();
    const solvedProbs = this.getSolvedProblemsCount();
    const solvedTests = this.getSolvedTopicTestsCount();
    const studyHours = (window.userProfile?.profile?.studySeconds || 0) / 3600;

    // Day 1: Defs 1-5 scored >= 6, and at least 1 topic test solved
    const d1PassedDefs = [1, 2, 3, 4, 5].filter(id => (this.readinessState.definitionsScores[id] || 0) >= 6).length;
    this.readinessState.daysCompleted[1] = d1PassedDefs >= 3 && solvedTests >= 1;

    // Day 2: Defs 6-12 scored >= 6, and at least 3 problems solved
    const d2PassedDefs = [6, 7, 8, 9, 10, 11, 12].filter(id => (this.readinessState.definitionsScores[id] || 0) >= 6).length;
    this.readinessState.daysCompleted[2] = d2PassedDefs >= 4 && solvedProbs >= 3;

    // Day 3 (Colloquium): Defs 13-21 scored >= 6, and at least 6 problems solved
    const d3PassedDefs = [13, 14, 15, 16, 17, 18, 19, 20, 21].filter(id => (this.readinessState.definitionsScores[id] || 0) >= 6).length;
    this.readinessState.daysCompleted[3] = d3PassedDefs >= 4 && solvedProbs >= 6;

    // Day 4: At least 4 topic tests solved and 10 problems solved
    this.readinessState.daysCompleted[4] = solvedTests >= 4 && solvedProbs >= 10;

    // Day 5 (Midterm 2): At least 8 topic tests and 15 problems solved
    this.readinessState.daysCompleted[5] = solvedTests >= 8 && solvedProbs >= 15;
  }

  // --- CALCULATION FORMULA (Starts at 0% strictly) ---
  calculateOverallReadiness() {
    this.evaluateDayMilestones();

    const totalDefs = 21;
    const passedDefs = this.getPassingDefinitionsCount(); // 1% each -> 21% max
    const defPercentContribution = passedDefs * 1; // 1% per definition scored >= 6/10

    const totalTopicTests = 12;
    const solvedTests = this.getSolvedTopicTestsCount(); // 1% each -> 12% max
    const testPercentContribution = solvedTests * 1;

    // Day milestones: 5 days * 2% = 10% max
    const completedDaysCount = Object.values(this.readinessState.daysCompleted).filter(Boolean).length;
    const dayPercentContribution = completedDaysCount * 2;

    // Exam Problems: Rest of the percentage (57% max across 23 problems ~ 2.48% each)
    const totalProblems = window.PS_DATA?.PROBLEMS_BANK?.length || 23;
    const solvedProblems = this.getSolvedProblemsCount();
    const probPercentContribution = Math.min(Math.round((solvedProblems / totalProblems) * 57), 57);

    // Sum all components (Baseline is 0%)
    let overall = defPercentContribution + testPercentContribution + dayPercentContribution + probPercentContribution;
    overall = Math.min(Math.max(overall, 0), 100);

    this.readinessState.overallPercent = overall;

    return {
      overall,
      defPercent: Math.round((passedDefs / totalDefs) * 100),
      passedDefs,
      totalDefs,
      solvedTests,
      totalTopicTests,
      testPercent: Math.round((solvedTests / totalTopicTests) * 100),
      solvedProblems,
      totalProblems,
      probPercent: Math.round((solvedProblems / totalProblems) * 100),
      completedDaysCount,
      breakdown: {
        fromDefs: defPercentContribution,
        fromTests: testPercentContribution,
        fromDays: dayPercentContribution,
        fromProblems: probPercentContribution
      }
    };
  }

  updateReadinessUI() {
    const metrics = this.calculateOverallReadiness();

    // Top Header status pill
    const pill = document.getElementById('header-readiness-percent');
    if (pill) pill.textContent = `${metrics.overall}%`;

    const barHeader = document.getElementById('bar-readiness-header');
    if (barHeader) barHeader.style.width = `${metrics.overall}%`;

    // Dashboard main badge & ring
    const mainBadge = document.getElementById('dashboard-readiness-val');
    if (mainBadge) mainBadge.textContent = `${metrics.overall}%`;

    const circleSvg = document.getElementById('readiness-progress-circle');
    if (circleSvg) {
      const circumference = 2 * Math.PI * 40; // r=40
      const offset = circumference - (metrics.overall / 100) * circumference;
      circleSvg.style.strokeDashoffset = offset;
    }

    // Breakdown bars
    const bDef = document.getElementById('bar-readiness-defs');
    if (bDef) bDef.style.width = `${(metrics.passedDefs / metrics.totalDefs) * 100}%`;
    const tDef = document.getElementById('text-readiness-defs');
    if (tDef) tDef.textContent = `${metrics.passedDefs}/21 (${metrics.breakdown.fromDefs}%)`;

    const bForm = document.getElementById('bar-readiness-quiz');
    if (bForm) bForm.style.width = `${(metrics.solvedTests / metrics.totalTopicTests) * 100}%`;
    const tForm = document.getElementById('text-readiness-quiz');
    if (tForm) tForm.textContent = `${metrics.solvedTests}/12 (${metrics.breakdown.fromTests}%)`;

    const bProb = document.getElementById('bar-readiness-probs');
    if (bProb) bProb.style.width = `${(metrics.solvedProblems / metrics.totalProblems) * 100}%`;
    const tProb = document.getElementById('text-readiness-probs');
    if (tProb) tProb.textContent = `${metrics.solvedProblems}/23 (${metrics.breakdown.fromProblems}%)`;

    const bDays = document.getElementById('bar-readiness-oral');
    if (bDays) bDays.style.width = `${(metrics.completedDaysCount / 5) * 100}%`;
    const tDays = document.getElementById('text-readiness-oral');
    if (tDays) tDays.textContent = `${metrics.completedDaysCount}/5 Days (${metrics.breakdown.fromDays}%)`;

    // Refresh Dashboard study schedule if app is initialized
    if (window.app?.renderDashboard) {
      window.app.renderDashboardScheduleOnly();
    }
  }

  // --- QUIZ EXECUTION ENGINE (600 Questions across 12 Topics) ---
  startQuiz(topicId = 1) {
    this.activeTopicId = topicId;
    let questions = window.PS_DATA?.QUIZ_QUESTIONS || [];

    if (topicId === 'all') {
      this.currentQuiz = [...questions];
    } else {
      const tid = parseInt(topicId, 10);
      this.currentQuiz = questions.filter(q => q.topicId === tid);
    }

    if (this.currentQuiz.length === 0) {
      this.currentQuiz = [...questions.slice(0, 50)];
    }

    this.currentIndex = 0;
    this.score = 0;
    this.renderQuizContainer();
  }

  jumpToQuestion(index) {
    if (index >= 0 && index < this.currentQuiz.length) {
      this.currentIndex = index;
      this.renderCurrentQuestion();
    }
  }

  renderQuizContainer() {
    const mainContainer = document.getElementById('quiz-question-container');
    if (!mainContainer) return;

    const topics = window.PS_DATA?.TOPICS_LIST || [];

    mainContainer.innerHTML = `
      <!-- Topic Selector Bar -->
      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Select Exam Topic (50 Questions Each)</span>
            <h3 class="text-lg font-bold text-slate-100">Topic Quiz Drill</h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Total in Pool:</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-700">600 Questions</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          ${topics.map(t => {
            const testRecord = this.readinessState.topicTestsSolved[t.id];
            const isSolved = testRecord?.solved;
            const isSelected = this.activeTopicId === t.id;
            const scoreLabel = testRecord ? `✓ ${testRecord.score}/${testRecord.total || 50} (${Math.round((testRecord.score / (testRecord.total || 50)) * 100)}%)` : '50 Q';
            return `
              <button class="topic-select-btn p-2.5 rounded-xl border text-left text-xs font-semibold transition flex items-center justify-between gap-2 ${
                isSelected 
                  ? 'border-indigo-500 bg-indigo-950/60 text-white shadow-sm ring-1 ring-indigo-500/50' 
                  : isSolved
                  ? 'border-emerald-800/80 bg-emerald-950/20 text-slate-200 hover:border-emerald-600'
                  : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:text-white'
              }" data-topic-id="${t.id}">
                <div class="truncate flex items-center gap-1.5">
                  ${isSolved ? '<span class="text-emerald-400 font-bold">✓</span>' : '<span class="text-slate-500">•</span>'}
                  <span class="truncate">${t.title}</span>
                </div>
                <span class="shrink-0 text-[10px] px-2 py-0.5 rounded font-bold ${isSolved ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'}">
                  ${scoreLabel}
                </span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Question Card Host -->
      <div id="active-quiz-card-wrapper"></div>
    `;

    // Attach click listeners to topic buttons
    mainContainer.querySelectorAll('.topic-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tid = parseInt(btn.getAttribute('data-topic-id'), 10);
        this.startQuiz(tid);
      });
    });

    this.renderCurrentQuestion();
  }

  formatOptionContent(opt) {
    if (!opt) return '';
    if (opt.includes('$')) return opt;
    if (/(\\[a-zA-Z]+|\^|_|[0-9]\/[0-9]|\b[NEPBGU]\([^)]+\))/.test(opt)) {
      if (opt.startsWith('\\') || !/[a-zA-Z]{4,}\s+[a-zA-Z]{4,}/.test(opt)) {
        return `$${opt}$`;
      }
    }
    return opt;
  }

  renderCurrentQuestion() {
    const host = document.getElementById('active-quiz-card-wrapper');
    if (!host) return;

    if (this.currentQuiz.length === 0) {
      host.innerHTML = `<div class="p-6 text-center text-slate-400">No questions found for this topic.</div>`;
      return;
    }

    if (this.currentIndex >= this.currentQuiz.length) {
      this.renderQuizResults();
      return;
    }

    const q = this.currentQuiz[this.currentIndex];
    const previousAnswer = this.readinessState.questionsAnswered[q.id];
    this.isAnswered = !!previousAnswer;

    host.innerHTML = `
      <div class="quiz-card p-6 rounded-2xl shadow-xl border border-slate-800 bg-slate-900/90">
        
        ${this.activeTopicId !== 'all' && this.readinessState.topicTestsSolved[this.activeTopicId] ? `
          <div class="mb-4 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-600/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 text-emerald-200">
              <span class="text-base">✅</span>
              <span><strong>Тест з цієї теми вже пройдено!</strong> Результат: <strong>${this.readinessState.topicTestsSolved[this.activeTopicId].score}/${this.readinessState.topicTestsSolved[this.activeTopicId].total || 50} (${Math.round((this.readinessState.topicTestsSolved[this.activeTopicId].score / (this.readinessState.topicTestsSolved[this.activeTopicId].total || 50)) * 100)}%)</strong>. Зараховано до прогресу.</span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-800 text-white shrink-0 self-start sm:self-center">
              ПРОЙДЕНО ✓
            </span>
          </div>
        ` : ''}

        <!-- Header Info -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-4">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
              ${q.topic}
            </span>
            <span class="text-xs text-slate-400">
              Question <strong>${this.currentIndex + 1}</strong> of ${this.currentQuiz.length}
            </span>
          </div>
          <div class="text-xs font-mono text-slate-400">
            Current Score: <strong class="text-indigo-400">${this.score}</strong> / ${this.currentIndex + (this.isAnswered ? 1 : 0)}
          </div>
        </div>

        <!-- Question Body -->
        <h3 class="text-base sm:text-lg font-bold text-slate-100 mb-6 leading-relaxed">
          ${q.question}
        </h3>

        <!-- Options List -->
        <div class="space-y-3 mb-6" id="quiz-options-list">
          ${q.options.map((opt, idx) => `
            <button class="quiz-option w-full text-left p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-850 hover:border-indigo-500 transition duration-150 text-slate-200 text-sm font-medium flex items-center gap-3" data-index="${idx}">
              <span class="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                ${String.fromCharCode(65 + idx)}
              </span>
              <span class="flex-1">${this.formatOptionContent(opt)}</span>
            </button>
          `).join('')}
        </div>

        <!-- Feedback & Rigorous LaTeX Explanation -->
        <div id="quiz-explanation-box" class="hidden p-4 rounded-xl mb-5 text-xs sm:text-sm leading-relaxed"></div>

        <!-- Question Navigation Bar & Quick-Jump Palette -->
        <div class="pt-4 border-t border-slate-800 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <button id="quiz-prev-btn" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition ${this.currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
              ◀ Previous
            </button>
            <div class="text-xs text-slate-400 font-medium">
              Click any circle below to jump to a question
            </div>
            <button id="quiz-next-btn" class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition">
              ${this.currentIndex === this.currentQuiz.length - 1 ? 'Finish Topic Test 🏁' : 'Next Question ▶'}
            </button>
          </div>

          <!-- 50-Question Quick Jump Palette -->
          <div class="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 max-h-28 overflow-y-auto">
            ${this.currentQuiz.map((item, idx) => {
              const state = this.readinessState.questionsAnswered[item.id];
              let color = 'bg-slate-800 text-slate-400 border-slate-700';
              if (state) {
                color = state.correct ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-rose-950 text-rose-300 border-rose-600';
              }
              const isCurrent = idx === this.currentIndex;
              return `
                <button class="palette-q-btn w-6 h-6 rounded text-[10px] font-bold border transition ${color} ${isCurrent ? 'ring-2 ring-indigo-400' : ''}" data-q-index="${idx}">
                  ${idx + 1}
                </button>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    // Attach click events
    const optionButtons = host.querySelectorAll('.quiz-option');
    optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isAnswered) return;
        const index = parseInt(btn.getAttribute('data-index'), 10);
        this.submitAnswer(index);
      });
    });

    host.querySelector('#quiz-prev-btn')?.addEventListener('click', () => {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.renderCurrentQuestion();
      }
    });

    host.querySelector('#quiz-next-btn')?.addEventListener('click', () => {
      this.currentIndex++;
      this.renderCurrentQuestion();
    });

    host.querySelectorAll('.palette-q-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.getAttribute('data-q-index'), 10);
        this.jumpToQuestion(qIdx);
      });
    });

    // If previously answered, highlight options
    if (previousAnswer) {
      const buttons = host.querySelectorAll('.quiz-option');
      buttons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correctIndex) {
          btn.classList.add('bg-emerald-950/80', 'border-emerald-500', 'text-emerald-200');
          btn.querySelector('span:first-child')?.classList.add('bg-emerald-600', 'text-white');
        }
      });
      const expBox = host.querySelector('#quiz-explanation-box');
      if (expBox) {
        expBox.classList.remove('hidden');
        expBox.className = previousAnswer.correct
          ? 'p-4 rounded-xl mb-5 text-xs sm:text-sm bg-emerald-950/50 border border-emerald-800 text-emerald-200'
          : 'p-4 rounded-xl mb-5 text-xs sm:text-sm bg-rose-950/50 border border-rose-800 text-rose-200';
        expBox.innerHTML = `
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${previousAnswer.correct ? 'bg-emerald-800 text-white' : 'bg-rose-800 text-white'}">
              ${previousAnswer.correct ? '✓ ВІДПОВІДЬ ПРАВИЛЬНА' : '✗ ВІДПОВІДЬ ПОМИЛКОВА'}
            </span>
            <span class="text-xs text-slate-400">Питання вже розв'язано раніше</span>
          </div>
          <div><strong>Пояснення:</strong> ${q.explanation}</div>
        `;
        this.renderMath(expBox);
      }
    }

    this.renderMath(host);
  }

  submitAnswer(chosenIndex) {
    this.isAnswered = true;
    const q = this.currentQuiz[this.currentIndex];
    const isCorrect = chosenIndex === q.correctIndex;

    if (isCorrect) {
      this.score++;
      window.userProfile?.recordSuccess(q.id);
    } else {
      window.userProfile?.recordMistake(q.id, q.question, q.topic, 'quiz');
    }

    // Save question answer
    this.readinessState.questionsAnswered[q.id] = { correct: isCorrect, timestamp: Date.now() };

    const host = document.getElementById('active-quiz-card-wrapper');
    if (!host) return;

    const buttons = host.querySelectorAll('.quiz-option');
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correctIndex) {
        btn.classList.add('bg-emerald-950/80', 'border-emerald-500', 'text-emerald-200');
        btn.querySelector('span:first-child').classList.add('bg-emerald-600', 'text-white');
      } else if (idx === chosenIndex) {
        btn.classList.add('bg-rose-950/80', 'border-rose-500', 'text-rose-200');
        btn.querySelector('span:first-child').classList.add('bg-rose-600', 'text-white');
      }
    });

    // Explanation Box
    const expBox = host.querySelector('#quiz-explanation-box');
    if (expBox) {
      expBox.classList.remove('hidden');
      expBox.className = isCorrect 
        ? 'p-4 rounded-xl mb-5 text-xs sm:text-sm bg-emerald-950/50 border border-emerald-800 text-emerald-200' 
        : 'p-4 rounded-xl mb-5 text-xs sm:text-sm bg-rose-950/50 border border-rose-800 text-rose-200';
      expBox.innerHTML = `
        <div class="font-bold mb-1">${isCorrect ? '✅ Correct!' : '❌ Incorrect. Rigorous Derivation:'}</div>
        <div>${q.explanation}</div>
      `;
      this.renderMath(expBox);
    }

    // Update palette button color
    const paletteBtn = host.querySelector(`.palette-q-btn[data-q-index="${this.currentIndex}"]`);
    if (paletteBtn) {
      paletteBtn.className = `palette-q-btn w-6 h-6 rounded text-[10px] font-bold border transition ring-2 ring-indigo-400 ${
        isCorrect ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-rose-950 text-rose-300 border-rose-600'
      }`;
    }

    this.saveReadiness();
  }

  renderQuizResults() {
    const host = document.getElementById('active-quiz-card-wrapper');
    if (!host) return;

    const percentage = Math.round((this.score / this.currentQuiz.length) * 100);
    const passed = percentage >= 50;

    // Record Topic Test Solved (+1% to readiness)
    if (this.activeTopicId !== 'all') {
      this.recordTopicTestSolved(this.activeTopicId, this.score, this.currentQuiz.length);
    }

    host.innerHTML = `
      <div class="quiz-results p-8 rounded-2xl shadow-2xl border border-slate-700 bg-slate-900 text-center">
        <div class="text-5xl mb-3">${passed ? '🎉' : '📖'}</div>
        <h2 class="text-2xl font-black text-slate-100 mb-2">Topic Test Completed!</h2>
        <p class="text-slate-400 mb-6 text-sm">
          ${passed 
            ? '🏆 Outstanding work! You have passed this topic test and earned <strong>+1% Readiness</strong>.' 
            : 'Review the lecture notes and try this topic test again to secure your readiness %.'}
        </p>

        <div class="inline-block px-8 py-5 rounded-2xl bg-indigo-950/70 border border-indigo-700 mb-6">
          <div class="text-4xl font-black text-indigo-400">${this.score} / ${this.currentQuiz.length}</div>
          <div class="text-xs uppercase font-extrabold text-slate-300 mt-1">${percentage}% Score ${passed ? '(PASSED ✓)' : '(NEEDS REVIEW)'}</div>
        </div>

        <div class="flex justify-center gap-4">
          <button id="retry-topic-quiz-btn" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition">
            🔄 Retake Topic Test
          </button>
          <button id="next-topic-quiz-btn" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition">
            Next Topic ➔
          </button>
        </div>
      </div>
    `;

    host.querySelector('#retry-topic-quiz-btn')?.addEventListener('click', () => {
      this.startQuiz(this.activeTopicId);
    });

    host.querySelector('#next-topic-quiz-btn')?.addEventListener('click', () => {
      const nextId = typeof this.activeTopicId === 'number' ? (this.activeTopicId % 12) + 1 : 1;
      this.startQuiz(nextId);
    });
  }

  renderMath(elem) {
    if (!elem) return;
    const render = () => {
      if (typeof window.renderMathInElement === 'function') {
        window.renderMathInElement(elem, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false }
          ],
          throwOnError: false
        });
      } else {
        setTimeout(render, 100);
      }
    };
    render();
    setTimeout(render, 50);
  }
}

window.quizManager = new QuizManager();
