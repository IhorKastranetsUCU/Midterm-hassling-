// ========================================================
// Colloquium Exam Ticket: 1 random oral question + 2 random definitions,
// a stopwatch, then the reference answers and a self-grade per item.
// UCU Probability & Statistics Midterm 2 & Colloquium 2
// ========================================================

// Pure picking logic — DOM-free so it can be unit-tested with `node --test`.
const TicketPicker = {
  // k distinct items via a partial Fisher–Yates shuffle
  pickDistinct(items, k, rand = Math.random) {
    const arr = items.slice();
    const n = Math.min(k, arr.length);
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(rand() * (arr.length - i));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
  },

  // Avoids repeating the previous ticket's oral question when there is any other choice
  draw(orals, defs, rand = Math.random, prevOralId = null) {
    const pool = orals.length > 1 ? orals.filter(o => o.id !== prevOralId) : orals;
    const [oral] = this.pickDistinct(pool, 1, rand);
    return { oral: oral || null, defs: this.pickDistinct(defs, 2, rand) };
  },

  // "4-5 minutes" → 5 (upper bound used for the stopwatch warning); null if there is no number
  targetMinutes(timeText = '') {
    const nums = String(timeText).match(/\d+/g);
    return nums ? Number(nums[nums.length - 1]) : null;
  }
};

class ExamTicket {
  constructor() {
    this.ticket = null;     // { oral, defs }
    this.startedAt = 0;
    this.elapsedFinal = null;
    this.revealed = false;
    this.grades = {};       // 'oral' | defId -> 'again' | 'hard' | 'good'
    this.timerId = null;
  }

  get container() {
    return document.getElementById('exam-ticket-container');
  }

  show() {
    if (!this.ticket) {
      this.draw();
      return;
    }
    this.render();
    if (!this.revealed) this.startTimer();
  }

  hide() {
    this.stopTimer();
  }

  draw() {
    const orals = window.PS_DATA?.ORAL_QUESTIONS_12 || [];
    const defs = window.PS_DATA?.DEFINITIONS_21 || [];
    this.ticket = TicketPicker.draw(orals, defs, Math.random, this.ticket?.oral?.id ?? null);
    this.startedAt = Date.now();
    this.elapsedFinal = null;
    this.revealed = false;
    this.grades = {};
    this.render();
    this.startTimer();
  }

  reveal() {
    this.elapsedFinal = Date.now() - this.startedAt;
    this.revealed = true;
    this.stopTimer();
    this.render();
  }

  grade(key, grade) {
    // Same grade → score mapping as the definition drill, so both feed readiness identically
    const score = DrillQueue.GRADE_SCORES[grade];
    // Oral scores use the same `oral_<id>` key as the oral defense simulator
    const scoreKey = key === 'oral' ? `oral_${this.ticket.oral.id}` : Number(key);
    window.quizManager?.recordDefinitionScore(scoreKey, score);
    this.grades[key] = grade;
    this.render();
    window.app?.renderDefinitionsList();
    window.app?.renderOralQuestionsList();
    window.app?.renderAllMath(document.getElementById('definitions-grid-list'));
    window.app?.renderAllMath(document.getElementById('oral-questions-list'));
  }

  startTimer() {
    this.stopTimer();
    this.updateTimer();
    this.timerId = setInterval(() => this.updateTimer(), 1000);
  }

  stopTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
  }

  formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  updateTimer() {
    const el = document.getElementById('ticket-timer');
    if (!el || !this.ticket) return;
    const elapsed = this.elapsedFinal ?? (Date.now() - this.startedAt);
    const target = TicketPicker.targetMinutes(this.ticket.oral?.time);
    const over = target !== null && elapsed > target * 60 * 1000;
    el.innerHTML = `${icon('timer')} ${this.formatElapsed(elapsed)}`;
    el.className = `font-bold tabular-nums ${over ? 'text-amber-400' : 'text-slate-200'}`;
  }

  md(text = '') {
    return window.app?.formatMd ? window.app.formatMd(text) : text;
  }

  renderGradeButtons(key) {
    const current = this.grades[key];
    const options = [
      ['again', `${icon('x')} Не знаю`, 'bg-rose-950/60 hover:bg-rose-900 border-rose-800 text-rose-200'],
      ['hard', `${icon('minus')} Частково`, 'bg-amber-950/60 hover:bg-amber-900 border-amber-800 text-amber-200'],
      ['good', `${icon('check')} Знаю`, 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-700 text-emerald-200']
    ];
    return `
      <div class="grid grid-cols-3 gap-2 mt-3">
        ${options.map(([grade, label, cls]) => `
          <button data-ticket-grade="${key}:${grade}" class="px-2 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${cls} ${current === grade ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : current ? 'opacity-60' : ''}">${label}</button>
        `).join('')}
      </div>
    `;
  }

  renderPrompt() {
    const { oral, defs } = this.ticket;
    return `
      <div class="space-y-3">
        <div class="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60">
          <div class="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">Усне питання №${oral.id}</div>
          <div class="text-base font-bold text-slate-100">${oral.titleUa || oral.title}</div>
          ${oral.titleUa ? `<div class="text-xs text-slate-400 mt-0.5">${oral.title}</div>` : ''}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${defs.map((d, i) => `
            <div class="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/60">
              <div class="text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-1">Визначення ${i + 1} · #${d.id}</div>
              <div class="text-sm font-bold text-slate-100">${d.nameUa}</div>
              <div class="text-xs text-slate-400 mt-0.5">${d.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderReference() {
    const { oral, defs } = this.ticket;
    return `
      <div class="space-y-4 mt-5 pt-5 border-t border-slate-800 text-sm text-slate-300">
        <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div class="font-bold text-amber-300 mb-2">Усне питання №${oral.id}: план відповіді</div>
          <ul class="space-y-1 text-xs">${oral.structure.map(s => `<li>${this.md(s)}</li>`).join('')}</ul>
          <div class="mt-3 text-xs font-bold text-slate-400">Формули на дошку:</div>
          <div class="text-indigo-200 overflow-x-auto">${oral.keyFormulas.map(f => `<div>$$${f}$$</div>`).join('')}</div>
          <div class="mt-2 p-2.5 rounded bg-rose-950/30 border border-rose-800/50 text-rose-200 text-xs">
            <strong>Додаткові питання екзаменатора:</strong>
            <ul class="list-disc pl-5 mt-1 space-y-0.5">${oral.examinerQuestions.map(q => `<li>${this.md(q)}</li>`).join('')}</ul>
          </div>
          <details class="mt-2 text-xs">
            <summary class="cursor-pointer font-semibold text-slate-400 hover:text-indigo-400 transition">Повна модельна відповідь</summary>
            <p class="mt-2 leading-relaxed">${this.md(oral.speech)}</p>
          </details>
          ${this.renderGradeButtons('oral')}
        </div>

        ${defs.map(d => `
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div class="font-bold text-indigo-300 mb-1">#${d.id} ${d.nameUa}</div>
            <div class="text-center text-indigo-200 overflow-x-auto">$$${d.latexFull || d.latex}$$</div>
            <p class="text-xs">${this.md(d.definition)}</p>
            ${d.keyPoints?.length ? `
              <div class="mt-2 text-xs font-bold text-slate-400">${icon('pin')} Обов'язково згадати:</div>
              <ul class="list-disc pl-5 space-y-0.5 text-xs">${d.keyPoints.map(p => `<li>${this.md(p)}</li>`).join('')}</ul>
            ` : ''}
            ${this.renderGradeButtons(String(d.id))}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderFooter() {
    if (!this.revealed) {
      return `
        <div class="flex flex-wrap items-center justify-between gap-3 mt-5">
          <p class="text-xs text-slate-400 max-w-sm">Підготуй відповідь як на колоквіумі — вголос або на папері, — потім відкрий еталон.</p>
          <div class="flex flex-wrap gap-2 ml-auto">
            <button id="ticket-gemini-btn" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer transition">${icon('mic')} Відповісти Gemini</button>
            <button id="ticket-reveal-btn" class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold cursor-pointer transition">Показати еталон</button>
          </div>
        </div>
      `;
    }

    const keys = ['oral', ...this.ticket.defs.map(d => String(d.id))];
    const graded = keys.filter(k => this.grades[k]);
    const count = g => graded.filter(k => this.grades[k] === g).length;
    return `
      <div class="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-800">
        <span class="text-xs ${graded.length === keys.length ? 'text-slate-200 font-semibold' : 'text-slate-400'}">
          ${graded.length === keys.length
            ? `Білет оцінено: <span class="text-emerald-400">${icon('check')} ${count('good')}</span> · <span class="text-amber-400">${icon('minus')} ${count('hard')}</span> · <span class="text-rose-400">${icon('x')} ${count('again')}</span>`
            : `Оціни кожен пункт (${graded.length} з ${keys.length}) — оцінки йдуть у readiness`}
        </span>
        <button id="ticket-next-btn" class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold cursor-pointer transition">${icon('ticket')} Наступний білет</button>
      </div>
    `;
  }

  render() {
    const container = this.container;
    if (!container || !this.ticket?.oral) return;

    container.innerHTML = `
      <div class="w-full max-w-3xl mx-auto rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900 to-amber-950/20 p-6 shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded-full font-extrabold bg-amber-900/60 text-amber-300 border border-amber-700">${icon('ticket')} Білет колоквіуму</span>
            <span id="ticket-timer" class="font-bold tabular-nums text-slate-200"></span>
            <span class="text-slate-500">орієнтир: ${this.ticket.oral.time}</span>
          </div>
          <button id="ticket-redraw-btn" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition">${icon('rotate-cw')} Інший білет</button>
        </div>
        ${this.renderPrompt()}
        ${this.revealed ? this.renderReference() : ''}
        ${this.renderFooter()}
      </div>
    `;

    this.updateTimer();
    this.bindEvents(container);
    window.app?.renderAllMath(container);
  }

  bindEvents(container) {
    container.querySelector('#ticket-redraw-btn')?.addEventListener('click', () => this.draw());
    container.querySelector('#ticket-next-btn')?.addEventListener('click', () => this.draw());
    container.querySelector('#ticket-reveal-btn')?.addEventListener('click', () => this.reveal());
    container.querySelector('#ticket-gemini-btn')?.addEventListener('click', () => {
      const oral = this.ticket.oral;
      window.app?.openOralSimulatorModal(oral.title, oral.structure.join('\n'), `oral_${oral.id}`);
    });
    container.querySelectorAll('[data-ticket-grade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [key, grade] = btn.getAttribute('data-ticket-grade').split(':');
        this.grade(key, grade);
      });
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TicketPicker };
} else {
  window.examTicket = new ExamTicket();
}
