// ========================================================
// Random Definition Drill (shuffled recall with self-grading)
// UCU Probability & Statistics Midterm 2 & Colloquium 2
// ========================================================

// Pure queue logic — kept free of DOM so it can be unit-tested with `node --test`.
const DrillQueue = {
  // Score written into readiness for each self-grade (best score is kept, so low grades never erase progress)
  GRADE_SCORES: { again: 2, hard: 5, good: 8 },
  // How many cards later an "again" card comes back
  AGAIN_OFFSET: 3,

  shuffle(items, rand = Math.random) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  create(ids, rand = Math.random) {
    return { queue: this.shuffle(ids, rand), total: ids.length, firstGrades: {}, reviews: 0 };
  },

  current(state) {
    return state.queue.length > 0 ? state.queue[0] : null;
  },

  // again → back in AGAIN_OFFSET cards, hard → end of the queue, good → done for this round
  grade(state, grade) {
    const id = state.queue.shift();
    if (id === undefined) return state;
    if (!(id in state.firstGrades)) state.firstGrades[id] = grade;
    state.reviews += 1;

    if (grade === 'again') {
      state.queue.splice(Math.min(this.AGAIN_OFFSET, state.queue.length), 0, id);
    } else if (grade === 'hard') {
      state.queue.push(id);
    }
    return state;
  },

  isFinished(state) {
    return state.queue.length === 0;
  },

  summary(state) {
    const counts = { again: 0, hard: 0, good: 0 };
    Object.values(state.firstGrades).forEach(g => { counts[g] += 1; });
    const done = Object.keys(state.firstGrades).length;
    const weakIds = Object.entries(state.firstGrades)
      .filter(([, g]) => g !== 'good')
      .map(([id]) => Number(id));
    return { ...counts, done, total: state.total, reviews: state.reviews, weakIds };
  },

  // Grade suggested by the key-points checklist: all points → good, at least half → hard, otherwise again
  suggestGrade(checked, total) {
    if (!total) return null;
    if (checked >= total) return 'good';
    return checked / total >= 0.5 ? 'hard' : 'again';
  }
};

class DefinitionDrill {
  constructor() {
    this.scope = 'all';     // 'all' | 'weak' (best score < 6)
    this.state = null;
    this.revealed = false;
    this.hintShown = false;
    this.lastAnswer = '';
    this.checkedPoints = new Set();
  }

  get defs() {
    return window.PS_DATA?.DEFINITIONS_21 || [];
  }

  get container() {
    return document.getElementById('definition-drill-container');
  }

  getDef(id) {
    return this.defs.find(d => d.id === id);
  }

  init() {
    document.addEventListener('keydown', (e) => this.handleKey(e));
  }

  // Called by AppController.setColloquiumMode('drill')
  show() {
    if (!this.state) this.startRound();
    else this.render();
  }

  getBestScore(id) {
    return window.quizManager?.readinessState?.definitionsScores?.[id] || 0;
  }

  idsForScope(scope) {
    const ids = this.defs.map(d => d.id);
    return scope === 'weak' ? ids.filter(id => this.getBestScore(id) < 6) : ids;
  }

  resetCard() {
    this.revealed = false;
    this.hintShown = false;
    this.lastAnswer = '';
    this.checkedPoints = new Set();
  }

  startRound(ids = null) {
    this.state = DrillQueue.create(ids || this.idsForScope(this.scope));
    this.resetCard();
    this.render();
  }

  reveal() {
    if (this.revealed || !this.state || DrillQueue.isFinished(this.state)) return;
    this.lastAnswer = document.getElementById('drill-answer-input')?.value || '';
    this.revealed = true;
    this.render();
  }

  grade(grade) {
    if (!this.revealed || !this.state) return;
    const id = DrillQueue.current(this.state);
    window.quizManager?.recordDefinitionScore(id, DrillQueue.GRADE_SCORES[grade]);
    DrillQueue.grade(this.state, grade);
    this.resetCard();
    this.render();
    window.app?.renderDefinitionsList();
    window.app?.renderAllMath(document.getElementById('definitions-grid-list'));
  }

  isActive() {
    const container = this.container;
    if (!container || container.classList.contains('hidden')) return false;
    if (document.getElementById('tab-colloquium')?.classList.contains('hidden')) return false;
    if (document.querySelector('.fixed.inset-0:not(.hidden)')) return false; // a modal is open
    const rect = container.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  handleKey(e) {
    if (!this.state || DrillQueue.isFinished(this.state) || !this.isActive()) return;
    if (e.altKey || ((e.metaKey || e.ctrlKey) && e.key !== 'Enter')) return;
    const target = e.target;
    const tag = target?.tagName;

    if (tag === 'TEXTAREA') {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.reveal();
      }
      return;
    }

    const grade = { '1': 'again', '2': 'hard', '3': 'good' }[e.key];
    if (this.revealed && grade) {
      // Digits are safe to grab even from a focused checklist checkbox
      if (tag === 'INPUT' && target.type !== 'checkbox') return;
      e.preventDefault();
      this.grade(grade);
      return;
    }

    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
    if (!this.revealed && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      this.reveal();
    }
  }

  escapeHtml(text) {
    return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Dataset strings use **bold** markdown
  md(text = '') {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  render() {
    const container = this.container;
    if (!container || !this.state) return;

    container.innerHTML = DrillQueue.isFinished(this.state) ? this.renderSummary() : this.renderCard();
    this.bindCardEvents(container);
    window.app?.renderAllMath(container);

    if (!this.revealed && this.isActive()) {
      document.getElementById('drill-answer-input')?.focus({ preventScroll: true });
    }
  }

  renderHeader() {
    const s = DrillQueue.summary(this.state);
    const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
    return `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
        <div class="flex items-center gap-2">
          <label for="drill-scope-select" class="text-slate-400">Набір:</label>
          <select id="drill-scope-select" class="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer">
            <option value="all" ${this.scope === 'all' ? 'selected' : ''}>Усі 21 визначення</option>
            <option value="weak" ${this.scope === 'weak' ? 'selected' : ''}>Тільки ще не здані (&lt;6/10)</option>
          </select>
          <button id="drill-restart-btn" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition">↻ Перемішати заново</button>
        </div>
        <div class="flex items-center gap-3 font-semibold">
          <span class="text-slate-300">Пройдено ${s.done} / ${s.total}</span>
          <span class="text-emerald-400">✓ ${s.good}</span>
          <span class="text-amber-400">~ ${s.hard}</span>
          <span class="text-rose-400">✗ ${s.again}</span>
        </div>
      </div>
      <div class="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-4">
        <div class="h-full bg-indigo-500 transition-all duration-300" style="width: ${pct}%"></div>
      </div>
    `;
  }

  renderCard() {
    const def = this.getDef(DrillQueue.current(this.state));
    const seenBefore = def.id in this.state.firstGrades;

    const prompt = `
      <div class="flex justify-between items-center text-xs text-slate-400 mb-2">
        <span class="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-bold">🎲 Визначення #${def.id}</span>
        ${seenBefore ? '<span class="text-amber-400 font-semibold">↺ Повтор — минулого разу не вдалося</span>' : ''}
      </div>
      <h3 class="text-2xl font-extrabold text-slate-100 mb-1">${def.nameUa}</h3>
      <div class="text-sm font-semibold text-indigo-400 mb-4">${def.name}</div>
    `;

    if (!this.revealed) {
      return `
        <div class="w-full max-w-2xl mx-auto">
          ${this.renderHeader()}
          <div class="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-slate-900 to-indigo-950/40 p-6 shadow-2xl">
            ${prompt}
            ${this.hintShown ? `
              <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-indigo-200 mb-4 overflow-x-auto">$$${def.latex}$$</div>
            ` : ''}
            <label for="drill-answer-input" class="block text-xs font-bold text-slate-300 mb-1">Сформулюй визначення (можна й усно — тоді просто відкрий відповідь):</label>
            <textarea id="drill-answer-input" rows="5" placeholder="Напр.: Випадкова величина X: Ω → ℝ називається дискретною, якщо…" class="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${this.escapeHtml(this.lastAnswer)}</textarea>
            <div class="flex flex-wrap items-center justify-between gap-3 mt-4">
              <button id="drill-hint-btn" class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition ${this.hintShown ? 'hidden' : ''}">💡 Підказка: формула</button>
              <div class="flex items-center gap-3 ml-auto">
                <span class="text-[11px] text-slate-500 hidden sm:inline">Ctrl/⌘ + Enter</span>
                <button id="drill-reveal-btn" class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold cursor-pointer transition">Показати відповідь</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const answer = this.lastAnswer.trim();
    const keyPoints = def.keyPoints || [];
    return `
      <div class="w-full max-w-2xl mx-auto">
        ${this.renderHeader()}
        <div class="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-slate-900 to-indigo-950/40 p-6 shadow-2xl">
          ${prompt}
          ${answer ? `
            <div class="mb-4">
              <div class="text-xs font-bold text-slate-400 mb-1">Твоя відповідь:</div>
              <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap">${this.escapeHtml(answer)}</div>
            </div>
          ` : ''}
          <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-indigo-200 mb-4 overflow-x-auto">$$${def.latexFull || def.latex}$$</div>
          <div class="text-sm text-slate-300 space-y-3">
            <p><strong>Еталон:</strong> ${this.md(def.definition)}</p>
            ${keyPoints.length ? `
              <div>
                <div class="text-xs font-bold text-slate-400 mb-1.5">Познач, що вдалося згадати (${keyPoints.length} ключових пунктів):</div>
                <div class="space-y-1.5">
                  ${keyPoints.map((p, i) => `
                    <label class="flex items-start gap-2 p-2 rounded-lg bg-slate-950/40 border border-slate-800 hover:border-slate-600 text-xs cursor-pointer transition">
                      <input type="checkbox" data-kp-index="${i}" class="mt-0.5 accent-emerald-500 cursor-pointer" ${this.checkedPoints.has(i) ? 'checked' : ''}>
                      <span>${this.md(p)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="p-2.5 rounded bg-rose-950/30 border border-rose-800/50 text-rose-200 text-xs">
              <strong>⚠️ Professor Trap:</strong> ${this.md(def.trap)}
            </div>
          </div>

          <div class="pt-4 mt-4 border-t border-slate-800">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-slate-400">Наскільки добре знаєш? <span class="text-slate-500">(клавіші 1 / 2 / 3)</span></span>
              ${answer ? '<button id="drill-gemini-btn" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer transition">🤖 Оцінити Gemini</button>' : ''}
            </div>
            <div id="drill-suggestion" class="text-[11px] text-indigo-300 mb-2 hidden"></div>
            <div class="grid grid-cols-3 gap-2">
              <button data-drill-grade="again" class="px-3 py-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 text-sm font-bold cursor-pointer transition">✗ Не знаю<span class="block text-[10px] font-normal opacity-75">повернеться за ${DrillQueue.AGAIN_OFFSET} картки</span></button>
              <button data-drill-grade="hard" class="px-3 py-2.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-200 text-sm font-bold cursor-pointer transition">~ Частково<span class="block text-[10px] font-normal opacity-75">в кінець черги</span></button>
              <button data-drill-grade="good" class="px-3 py-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 text-sm font-bold cursor-pointer transition">✓ Знаю<span class="block text-[10px] font-normal opacity-75">+8/10 у readiness</span></button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Highlights the grade the checklist points to, without re-rendering (keeps KaTeX and focus intact)
  updateSuggestion(container) {
    const def = this.getDef(DrillQueue.current(this.state));
    const total = def?.keyPoints?.length || 0;
    const suggested = DrillQueue.suggestGrade(this.checkedPoints.size, total);
    const labels = { again: '✗ Не знаю', hard: '~ Частково', good: '✓ Знаю' };

    container.querySelectorAll('[data-drill-grade]').forEach(btn => {
      const isSuggested = btn.getAttribute('data-drill-grade') === suggested;
      ['ring-2', 'ring-indigo-400', 'ring-offset-2', 'ring-offset-slate-900'].forEach(c => btn.classList.toggle(c, isSuggested));
    });

    const hint = container.querySelector('#drill-suggestion');
    if (hint && suggested) {
      hint.textContent = `За чеклістом: ${this.checkedPoints.size}/${total} пунктів → рекомендую «${labels[suggested]}»`;
      hint.classList.remove('hidden');
    }
  }

  renderSummary() {
    const s = DrillQueue.summary(this.state);

    if (s.total === 0) {
      return `
        <div class="w-full max-w-2xl mx-auto">
          ${this.renderHeader()}
          <div class="rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 text-center">
            <div class="text-3xl mb-2">🏆</div>
            <h3 class="text-lg font-bold text-slate-100 mb-1">Усі визначення вже здані на ≥6/10</h3>
            <p class="text-xs text-slate-400 mb-4">У цьому наборі нічого не лишилось. Прогони всі 21 для закріплення.</p>
            <button id="drill-all-btn" class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold cursor-pointer transition">🎲 Усі 21 визначення</button>
          </div>
        </div>
      `;
    }

    const weakList = s.weakIds.map(id => this.getDef(id)).filter(Boolean);
    return `
      <div class="w-full max-w-2xl mx-auto">
        ${this.renderHeader()}
        <div class="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-slate-900 to-indigo-950/40 p-6 shadow-2xl">
          <h3 class="text-xl font-extrabold text-slate-100 mb-1">Раунд завершено 🎉</h3>
          <p class="text-xs text-slate-400 mb-4">${s.total} визначень, ${s.reviews} показів. З першої спроби:</p>
          <div class="grid grid-cols-3 gap-2 mb-5 text-center">
            <div class="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800"><div class="text-2xl font-black text-emerald-300">${s.good}</div><div class="text-[11px] text-emerald-200/80">знаю</div></div>
            <div class="p-3 rounded-xl bg-amber-950/40 border border-amber-800"><div class="text-2xl font-black text-amber-300">${s.hard}</div><div class="text-[11px] text-amber-200/80">частково</div></div>
            <div class="p-3 rounded-xl bg-rose-950/40 border border-rose-800"><div class="text-2xl font-black text-rose-300">${s.again}</div><div class="text-[11px] text-rose-200/80">не знаю</div></div>
          </div>
          ${weakList.length ? `
            <div class="mb-5">
              <div class="text-xs font-bold text-slate-400 mb-2">Варто повторити:</div>
              <div class="flex flex-wrap gap-1.5">
                ${weakList.map(d => `<span class="px-2 py-1 rounded-lg bg-slate-800 text-xs text-slate-200">#${d.id} ${d.nameUa}</span>`).join('')}
              </div>
            </div>
          ` : '<p class="text-sm text-emerald-300 mb-5">Усе з першої спроби — чисто!</p>'}
          <div class="flex flex-wrap justify-end gap-2">
            ${weakList.length ? `<button id="drill-weak-btn" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-700 text-sm font-semibold cursor-pointer transition">↺ Прогнати слабкі (${weakList.length})</button>` : ''}
            <button id="drill-new-round-btn" class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold cursor-pointer transition">🎲 Новий раунд</button>
          </div>
        </div>
      </div>
    `;
  }

  bindCardEvents(container) {
    container.querySelector('#drill-scope-select')?.addEventListener('change', (e) => {
      this.scope = e.target.value;
      this.startRound();
    });
    container.querySelector('#drill-restart-btn')?.addEventListener('click', () => this.startRound());
    container.querySelector('#drill-hint-btn')?.addEventListener('click', () => {
      this.lastAnswer = document.getElementById('drill-answer-input')?.value || '';
      this.hintShown = true;
      this.render();
    });
    container.querySelector('#drill-reveal-btn')?.addEventListener('click', () => this.reveal());
    container.querySelectorAll('[data-kp-index]').forEach(box => {
      box.addEventListener('change', () => {
        const idx = Number(box.getAttribute('data-kp-index'));
        if (box.checked) this.checkedPoints.add(idx);
        else this.checkedPoints.delete(idx);
        this.updateSuggestion(container);
      });
    });
    container.querySelectorAll('[data-drill-grade]').forEach(btn => {
      btn.addEventListener('click', () => this.grade(btn.getAttribute('data-drill-grade')));
    });
    container.querySelector('#drill-gemini-btn')?.addEventListener('click', () => {
      const def = this.getDef(DrillQueue.current(this.state));
      window.app?.openOralSimulatorModal(def.name, `Define ${def.name} rigorously with all measurability, integrability or support conditions and state its key properties.`, def.id);
      const modalInput = document.getElementById('modal-oral-student-answer');
      if (modalInput) modalInput.value = this.lastAnswer;
    });
    container.querySelector('#drill-weak-btn')?.addEventListener('click', () => {
      this.startRound(DrillQueue.summary(this.state).weakIds);
    });
    container.querySelector('#drill-new-round-btn')?.addEventListener('click', () => this.startRound());
    container.querySelector('#drill-all-btn')?.addEventListener('click', () => {
      this.scope = 'all';
      this.startRound();
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DrillQueue };
} else {
  window.definitionDrill = new DefinitionDrill();
}
