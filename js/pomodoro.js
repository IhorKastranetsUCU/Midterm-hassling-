// ========================================================
// Pomodoro Timer for Study Hustle
// Built for UCU Midterm 2 & Colloquium 2 Preparation
// ========================================================

class PomodoroTimer {
  constructor() {
    this.modes = {
      work: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    };
    this.currentMode = 'work';
    this.timeLeft = this.modes.work;
    this.timerId = null;
    this.isRunning = false;

    // Load persisted stats
    this.stats = JSON.parse(localStorage.getItem('stathustle_pomodoro_stats') || JSON.stringify({
      sessionsCompleted: 0,
      totalMinutesStudied: 0,
      todaySessions: 0,
      lastDate: new Date().toDateString()
    }));

    // Reset today sessions if day changed
    if (this.stats.lastDate !== new Date().toDateString()) {
      this.stats.todaySessions = 0;
      this.stats.lastDate = new Date().toDateString();
      this.saveStats();
    }

    // Immediately reflect state and stats in UI
    setTimeout(() => this.onStateChange(), 50);
  }

  saveStats() {
    localStorage.setItem('stathustle_pomodoro_stats', JSON.stringify(this.stats));
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
    this.timeLeft = this.modes[this.currentMode];
    this.onStateChange();
  }

  setMode(mode) {
    if (!this.modes[mode]) return;
    this.currentMode = mode;
    this.reset();
  }

  tick() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      this.onTick();
    } else {
      this.completeSession();
    }
  }

  completeSession() {
    this.pause();
    this.playNotificationSound();

    if (this.currentMode === 'work') {
      this.stats.sessionsCompleted++;
      this.stats.todaySessions++;
      this.stats.totalMinutesStudied += Math.round(this.modes.work / 60);
      this.saveStats();

      // Trigger readiness bonus for consistent study!
      if (window.quizManager) {
        window.quizManager.recordPomodoroSession();
      }

      // Switch to break
      if (this.stats.sessionsCompleted % 4 === 0) {
        this.setMode('longBreak');
        alert("Excellent focus hustle! 4 sessions completed. Time for a well-deserved 15-minute Long Break!");
      } else {
        this.setMode('shortBreak');
        alert("Great work session! Time for a 5-minute Short Break.");
      }
    } else {
      this.setMode('work');
      alert("Break is over! Ready for another high-yield study session?");
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
    const el = document.getElementById('header-pomodoro-time');
    if (el) el.textContent = this.formatTime(this.timeLeft);

    const mainEl = document.getElementById('main-pomodoro-time');
    if (mainEl) mainEl.textContent = this.formatTime(this.timeLeft);

    // Update document title for background tracking
    document.title = `(${this.formatTime(this.timeLeft)}) UCU StatHustle`;
  }

  onStateChange() {
    this.onTick();
    const btn = document.getElementById('pomodoro-toggle-btn');
    if (btn) {
      btn.innerHTML = this.isRunning ? `${icon('pause')} Pause` : `${icon('play')} Focus`;
      btn.className = this.isRunning ? 'btn btn-warning' : 'btn btn-primary';
    }

    const mainBtn = document.getElementById('main-pomodoro-toggle');
    if (mainBtn) {
      mainBtn.innerHTML = this.isRunning ? `${icon('pause')} Pause` : `${icon('play')} Start Focus`;
      mainBtn.className = this.isRunning ? 'btn btn-warning' : 'btn btn-primary btn-lg';
    }

    const statsEl = document.getElementById('pomodoro-stats-display');
    if (statsEl) {
      statsEl.textContent = `${this.stats.todaySessions} sessions today (${this.stats.totalMinutesStudied} min total)`;
    }
  }
}

window.pomodoroTimer = new PomodoroTimer();
