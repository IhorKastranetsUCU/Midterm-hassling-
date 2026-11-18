// ========================================================
// Pomodoro Timer for Study Hustle (With Prolonged Focus & Per-Topic Tracking)
// Built for UCU Topic 2 & Topic 3 Preparation
// ========================================================

class PomodoroTimer {
  constructor() {
    this.modes = {
      work: 25 * 60,
      work45: 45 * 60,
      work60: 60 * 60,
      work90: 90 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    };
    this.currentMode = 'work45'; // Default to prolonged 45-min focus as requested
    this.timeLeft = this.modes[this.currentMode];
    this.timerId = null;
    this.isRunning = false;

    const defaultStats = {
      sessionsCompleted: 0,
      totalMinutesStudied: 0,
      todaySessions: 0,
      lastDate: new Date().toDateString(),
      perTopic: {
        topic2: { sessions: 0, minutes: 0, seconds: 0 },
        topic3: { sessions: 0, minutes: 0, seconds: 0 }
      }
    };

    // Load persisted stats
    try {
      const raw = localStorage.getItem('stathustle_pomodoro_stats');
      this.stats = raw ? Object.assign({}, defaultStats, JSON.parse(raw)) : defaultStats;
      if (!this.stats.perTopic) {
        this.stats.perTopic = {
          topic2: { sessions: 0, minutes: 0, seconds: 0 },
          topic3: { sessions: 0, minutes: 0, seconds: 0 }
        };
      }
    } catch (e) {
      this.stats = defaultStats;
    }

    // Reset today sessions if day changed
    if (this.stats.lastDate !== new Date().toDateString()) {
      this.stats.todaySessions = 0;
      this.stats.lastDate = new Date().toDateString();
      this.saveStats();
    }

    // Immediately reflect state and stats in UI
    setTimeout(() => this.onStateChange(), 50);
  }

  getActiveTopicStats(topicId = null) {
    const active = topicId || window.currentActiveTopic || 'topic2';
    if (!this.stats.perTopic[active]) {
      this.stats.perTopic[active] = { sessions: 0, minutes: 0, seconds: 0 };
    }
    return this.stats.perTopic[active];
  }

  isWorkMode(mode = this.currentMode) {
    return mode.startsWith('work') || mode === 'custom';
  }

  saveStats() {
    try {
      localStorage.setItem('stathustle_pomodoro_stats', JSON.stringify(this.stats));
    } catch (e) {}
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerId = setInterval(() => {
      this.tick();
    }, 1000);
    this.onStateChange();
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.timerId);
    this.timerId = null;
    this.onStateChange();
  }

  reset() {
    this.pause();
    this.timeLeft = this.modes[this.currentMode] || 45 * 60;
    this.onStateChange();
  }

  setMode(mode) {
    if (!this.modes[mode]) return;
    this.currentMode = mode;
    this.reset();
    this.updateModeButtonsUI();
  }

  setCustomMinutes(minutes) {
    const mins = Math.max(1, Math.min(240, parseInt(minutes, 10) || 45));
    this.modes.custom = mins * 60;
    this.currentMode = 'custom';
    this.reset();
    this.updateModeButtonsUI();
  }

  updateModeButtonsUI() {
    document.querySelectorAll('.pomodoro-mode-btn').forEach(btn => {
      const m = btn.getAttribute('data-pomo-mode');
      if (m === this.currentMode) {
        btn.className = 'pomodoro-mode-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 shadow transition';
      } else {
        btn.className = 'pomodoro-mode-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition';
      }
    });
    const badge = document.getElementById('pomodoro-mode-badge');
    if (badge) {
      const mins = Math.round((this.modes[this.currentMode] || 2700) / 60);
      badge.textContent = this.isWorkMode() ? `${mins}m Focus / 5m Rest` : `${mins}m Break`;
    }
  }

  tick() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      if (this.isWorkMode()) {
        const activeTopic = window.currentActiveTopic || 'topic2';
        if (!this.stats.perTopic[activeTopic]) {
          this.stats.perTopic[activeTopic] = { sessions: 0, minutes: 0, seconds: 0 };
        }
        this.stats.perTopic[activeTopic].seconds = (this.stats.perTopic[activeTopic].seconds || 0) + 1;
        if (this.timeLeft % 10 === 0) this.saveStats();
      }
      this.onTick();
    } else {
      this.completeSession();
    }
  }

  completeSession() {
    this.pause();
    this.playNotificationSound();

    const activeTopic = window.currentActiveTopic || 'topic2';
    const topicLabel = activeTopic === 'topic3' ? 'Тема 3 (Midterm 3)' : 'Тема 2 (Midterm 2)';

    if (this.isWorkMode()) {
      const sessionMins = Math.round((this.modes[this.currentMode] || 2700) / 60);
      this.stats.sessionsCompleted++;
      this.stats.todaySessions++;
      this.stats.totalMinutesStudied += sessionMins;

      if (!this.stats.perTopic[activeTopic]) {
        this.stats.perTopic[activeTopic] = { sessions: 0, minutes: 0, seconds: 0 };
      }
      this.stats.perTopic[activeTopic].sessions++;
      this.stats.perTopic[activeTopic].minutes += sessionMins;

      this.saveStats();

      if (window.quizManager) {
        window.quizManager.recordPomodoroSession();
      }

      if (this.stats.sessionsCompleted % 4 === 0) {
        this.setMode('longBreak');
        alert(`🎉 Чудовий подовжений фокус (${topicLabel})! 4 сесії завершено. Час на 15-хвилинну перерву!`);
      } else {
        this.setMode('shortBreak');
        alert(`⏱️ Сесію (${sessionMins} хв) для "${topicLabel}" завершено! Час на 5-хвилинний перепочинок.`);
      }
    } else {
      this.setMode('work45');
      alert(`⚡ Перерва закінчилась! Готові до нового подовженого фокус-сеансу (${topicLabel})?`);
    }
  }

  playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.35); // D6

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.log("Audio not supported or blocked by browser policy");
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  onTick() {
    const formatted = this.formatTime(this.timeLeft);
    const el = document.getElementById('header-pomodoro-time');
    if (el) el.textContent = formatted;

    const mainEl = document.getElementById('main-pomodoro-time');
    if (mainEl) mainEl.textContent = formatted;
  }

  onStateChange() {
    this.onTick();
    this.updateModeButtonsUI();

    const btn = document.getElementById('pomodoro-toggle-btn');
    if (btn) {
      btn.textContent = this.isRunning ? 'Pause' : 'Focus';
      btn.className = this.isRunning
        ? 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white transition'
        : 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition';
    }

    const mainBtn = document.getElementById('main-pomodoro-toggle');
    if (mainBtn) {
      mainBtn.innerHTML = this.isRunning ? '⏸️ Пауза' : '▶️ Старт подовженого фокусу';
    }

    const statsEl = document.getElementById('pomodoro-stats-display');
    if (statsEl) {
      const t2 = this.stats.perTopic?.topic2 || { sessions: 0, minutes: 0 };
      const t3 = this.stats.perTopic?.topic3 || { sessions: 0, minutes: 0 };
      statsEl.innerHTML = `
        <div>Сьогодні: <strong>${this.stats.todaySessions}</strong> сесій (${this.stats.totalMinutesStudied} хв загалом)</div>
        <div class="flex items-center justify-center gap-3 mt-1 text-[11px]">
          <span class="text-indigo-400 font-semibold">⚡ Тема 2: ${t2.sessions} сесій (${t2.minutes} хв)</span>
          <span>•</span>
          <span class="text-emerald-400 font-semibold">🎯 Тема 3: ${t3.sessions} сесій (${t3.minutes} хв)</span>
        </div>
      `;
    }
  }
}

window.pomodoroTimer = new PomodoroTimer();
