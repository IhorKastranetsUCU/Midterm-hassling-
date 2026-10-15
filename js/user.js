// ========================================================
// Multi-User Database, Auth Gate, Per-Tab Time Analytics,
// Cloud Cross-Device Synchronization, Mistakes Tracker &
// Faculty of Applied Sciences Avatar Wardrobe Gamification
// UCU Probability & Statistics Midterm 2 Platform
// ========================================================

const CLOUD_SYNC_ENDPOINT = 'https://vkzth64629.execute-api.us-east-1.amazonaws.com';

const WARDROBE_ITEMS = [
  {
    id: 'freshman_tee',
    name: 'Freshman Campus T-Shirt',
    minReadiness: 0,
    icon: 'shirt',
    badge: '0% Required',
    color: '#3b82f6',
    description: 'Класична біло-синя футболка першокурсника УКУ для старту підготовки до колоквіуму та мідтерму.',
    renderSvg: (color) => `
      <g id="outfit-freshman_tee">
        <path d="M30 65 L45 50 L55 58 L65 50 L80 65 L72 75 L65 70 L65 105 L45 105 L45 70 L38 75 Z" fill="${color}" stroke="#1e293b" stroke-width="2"/>
        <path d="M50 58 Q55 64 60 58" fill="none" stroke="#1e293b" stroke-width="2"/>
        <text x="55" y="80" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="bold" fill="#ffffff">UCU</text>
      </g>
    `
  },
  {
    id: 'focus_cap',
    name: 'Focus Cap & Smart Wire Glasses',
    minReadiness: 15,
    icon: 'graduation-cap',
    badge: '15% Required',
    color: '#10b981',
    description: 'Кепка фокусу та антивідблискові окуляри для тривалого вивчення формул і лекцій.',
    renderSvg: (color) => `
      <g id="outfit-focus_cap">
        <path d="M36 32 Q55 18 74 32 L83 34 Q55 24 32 34 Z" fill="${color}" stroke="#065f46" stroke-width="2"/>
        <path d="M36 32 Q55 20 74 32 Q55 35 36 32 Z" fill="${color}"/>
        <circle cx="55" cy="22" r="2" fill="#f59e0b"/>
        <circle cx="46" cy="42" r="6" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <circle cx="64" cy="42" r="6" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <line x1="52" y1="42" x2="58" y2="42" stroke="#38bdf8" stroke-width="2"/>
      </g>
    `
  },
  {
    id: 'apps_cs_hoodie',
    name: 'Official CS@UCU APPS Hoodie',
    minReadiness: 25,
    icon: 'laptop',
    badge: '25% APPS Merch',
    color: '#1e1b4b',
    description: 'Офіційне темне худі Факультету прикладних наук (APPS / CS@UCU) з емблемою факультету та кодом </>. store.ucu.edu.ua',
    renderSvg: (color) => `
      <g id="outfit-apps_cs_hoodie">
        <path d="M28 65 L44 48 L55 56 L66 48 L82 65 L74 76 L66 70 L66 108 L44 108 L44 70 L36 76 Z" fill="#1e1b4b" stroke="#0f172a" stroke-width="2"/>
        <path d="M44 48 Q55 62 66 48 Q55 42 44 48 Z" fill="#312e81"/>
        <line x1="51" y1="56" x2="51" y2="72" stroke="#e0e7ff" stroke-width="1.5"/>
        <line x1="59" y1="56" x2="59" y2="72" stroke="#e0e7ff" stroke-width="1.5"/>
        <rect x="47" y="75" width="16" height="11" rx="2" fill="#312e81" stroke="#4338ca" stroke-width="1"/>
        <text x="55" y="83" text-anchor="middle" font-size="6" font-family="monospace" font-weight="bold" fill="#38bdf8">&lt;/&gt;</text>
        <text x="55" y="99" text-anchor="middle" font-size="5" font-weight="bold" fill="#c7d2fe">APPS CS</text>
      </g>
    `
  },
  {
    id: 'ucu_hoodie',
    name: 'Official UCU Classic Hoodie',
    minReadiness: 35,
    icon: 'shirt',
    badge: '35% Required',
    color: '#4f46e5',
    description: 'Тепле університетське худі насиченого індиго-кольору з гербом УКУ. Зручне для занять у Колегіумі.',
    renderSvg: (color) => `
      <g id="outfit-ucu_hoodie">
        <path d="M28 65 L44 48 L55 56 L66 48 L82 65 L74 76 L66 70 L66 108 L44 108 L44 70 L36 76 Z" fill="${color}" stroke="#312e81" stroke-width="2"/>
        <path d="M44 48 Q55 62 66 48 Q55 42 44 48 Z" fill="#4338ca"/>
        <line x1="51" y1="56" x2="51" y2="72" stroke="#e2e8f0" stroke-width="1.5"/>
        <line x1="59" y1="56" x2="59" y2="72" stroke="#e2e8f0" stroke-width="1.5"/>
        <text x="55" y="86" text-anchor="middle" font-size="7" font-weight="bold" fill="#fbbf24">УКУ CS</text>
      </g>
    `
  },
  {
    id: 'velykogo_raglan',
    name: 'Реглан «Великого бажайте!»',
    minReadiness: 45,
    icon: 'sparkles',
    badge: '45% UCU Icon',
    color: '#18181b',
    description: 'Культовий чорний реглан з духовним гаслом патріарха Йосифа Сліпого «Великого бажайте!». store.ucu.edu.ua',
    renderSvg: (color) => `
      <g id="outfit-velykogo_raglan">
        <path d="M28 65 L44 48 L55 58 L66 48 L82 65 L74 76 L66 70 L66 108 L44 108 L44 70 L36 76 Z" fill="#18181b" stroke="#09090b" stroke-width="2"/>
        <path d="M50 58 Q55 64 60 58" fill="none" stroke="#27272a" stroke-width="2"/>
        <text x="55" y="78" text-anchor="middle" font-size="5" font-family="sans-serif" font-weight="900" fill="#fafafa">ВЕЛИКОГО</text>
        <text x="55" y="86" text-anchor="middle" font-size="5" font-family="sans-serif" font-weight="900" fill="#fafafa">БАЖАЙТЕ!</text>
        <circle cx="55" cy="95" r="2.5" fill="#eab308"/>
      </g>
    `
  },
  {
    id: 'colloquium_suit',
    name: 'Colloquium Formal Defense Suit',
    minReadiness: 55,
    icon: 'briefcase',
    badge: '55% Required',
    color: '#1e293b',
    description: 'Діловий костюм з краваткою для урочистого захисту усних питань на середовому Колоквіумі 2.',
    renderSvg: (color) => `
      <g id="outfit-colloquium_suit">
        <path d="M28 65 L45 48 L55 60 L65 48 L82 65 L74 76 L66 70 L66 108 L44 108 L44 70 L36 76 Z" fill="#0f172a" stroke="#020617" stroke-width="2"/>
        <polygon points="50,48 55,60 60,48" fill="#ffffff"/>
        <polygon points="53,52 57,52 58,74 55,80 52,74" fill="#e11d48"/>
        <path d="M45 48 L52 70 L44 108" fill="none" stroke="#334155" stroke-width="1.5"/>
        <path d="M65 48 L58 70 L66 108" fill="none" stroke="#334155" stroke-width="1.5"/>
      </g>
    `
  },
  {
    id: 'ucu_shmot_sweatshirt',
    name: 'Світшот «Шмот» УКУ',
    minReadiness: 65,
    icon: 'wine',
    badge: '65% Campus Classic',
    color: '#881337',
    description: 'Фірмовий бордовий світшот «Шмот» з автентичної колекції одягу крамнички УКУ. store.ucu.edu.ua',
    renderSvg: (color) => `
      <g id="outfit-ucu_shmot_sweatshirt">
        <path d="M28 65 L44 48 L55 58 L66 48 L82 65 L74 76 L66 70 L66 108 L44 108 L44 70 L36 76 Z" fill="#881337" stroke="#4c0519" stroke-width="2"/>
        <circle cx="55" cy="56" r="6" fill="#be123c"/>
        <text x="55" y="81" text-anchor="middle" font-size="7" font-weight="900" fill="#ffffff">ШМОТ</text>
        <text x="55" y="93" text-anchor="middle" font-size="4.5" font-weight="bold" fill="#fecdd3">store.ucu</text>
      </g>
    `
  },
  {
    id: 'sheptytsky_blanket_socks',
    name: 'Коцик і теплі шкарпетки Шептицького',
    minReadiness: 75,
    icon: 'snowflake',
    badge: '75% Study Gear',
    color: '#065f46',
    description: 'Набір витривалого студента з Центру Шептицького: затишний теплий коцик та в\'язані шкарпетки УКУ.',
    renderSvg: (color) => `
      <g id="outfit-sheptytsky_blanket_socks">
        <path d="M26 62 L44 46 L55 56 L66 46 L84 62 L80 90 L68 85 L68 108 L42 108 L42 85 L30 90 Z" fill="#047857" stroke="#064e3b" stroke-width="2"/>
        <line x1="34" y1="65" x2="76" y2="65" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2"/>
        <line x1="32" y1="78" x2="78" y2="78" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2"/>
        <line x1="48" y1="52" x2="48" y2="105" stroke="#34d399" stroke-width="1"/>
        <line x1="62" y1="52" x2="62" y2="105" stroke="#34d399" stroke-width="1"/>
        <text x="55" y="96" text-anchor="middle" font-size="5" font-weight="bold" fill="#fef08a">ШЕПТИЦЬКИЙ</text>
      </g>
    `
  },
  {
    id: 'tech_lab_vest',
    name: 'Брендована жилетка інженера APPS Lab',
    minReadiness: 85,
    icon: 'wrench',
    badge: '85% Sheptytsky Tech',
    color: '#0f172a',
    description: 'Жилетка розробника та інженера Sheptytsky Tech Lab / APPS з фірмовою нашивкою для лабораторій.',
    renderSvg: (color) => `
      <g id="outfit-tech_lab_vest">
        <path d="M28 65 L44 48 L55 58 L66 48 L82 65 L74 76 L66 70 L66 108 L44 108 L44 70 L36 76 Z" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>
        <path d="M38 52 L50 56 L55 60 L60 56 L72 52 L68 108 L42 108 Z" fill="#0f172a" stroke="#020617" stroke-width="2"/>
        <line x1="55" y1="60" x2="55" y2="108" stroke="#38bdf8" stroke-width="1.5"/>
        <rect x="44" y="68" width="6" height="5" fill="#1e293b" rx="1"/>
        <text x="64" y="72" text-anchor="middle" font-size="4" font-weight="bold" fill="#38bdf8">APPS</text>
      </g>
    `
  },
  {
    id: 'wizard_robe',
    name: 'Markov Master Wizard Robe',
    minReadiness: 95,
    icon: 'wand-sparkles',
    badge: '95% Required',
    color: '#7e22ce',
    description: 'Магічна фіолетова мантія з рунами густини та математичного сподівання для володарів Марковських процесів.',
    renderSvg: (color) => `
      <g id="outfit-wizard_robe">
        <path d="M24 68 L44 46 L55 56 L66 46 L86 68 L76 82 L68 74 L69 112 L41 112 L42 74 L34 82 Z" fill="#581c87" stroke="#3b0764" stroke-width="2"/>
        <polygon points="55,10 40,34 70,34" fill="#6b21a8" stroke="#3b0764" stroke-width="2"/>
        <ellipse cx="55" cy="34" rx="20" ry="4" fill="#7e22ce" stroke="#3b0764" stroke-width="1.5"/>
        <polygon points="55,10 52,24 58,24" fill="#f59e0b"/>
        <path d="M44 46 L55 56 L66 46" fill="none" stroke="#fbbf24" stroke-width="2"/>
        <text x="55" y="85" text-anchor="middle" font-size="8" font-family="serif" font-weight="bold" fill="#fde047">E[X]</text>
      </g>
    `
  },
  {
    id: 'champion_crown',
    name: 'Grand Champion Crown & Trophy',
    minReadiness: 100,
    icon: 'crown',
    badge: '100% Master Grade',
    color: '#eab308',
    description: 'Золота корона та тріумфальний трофей студента, який підкорив 100% готовності до Мідтерму 2 та Колоквіуму 2!',
    renderSvg: (color) => `
      <g id="outfit-champion_crown">
        <path d="M38 32 L40 18 L48 26 L55 14 L62 26 L70 18 L72 32 Z" fill="#eab308" stroke="#a16207" stroke-width="1.5"/>
        <circle cx="40" cy="18" r="2" fill="#ef4444"/>
        <circle cx="55" cy="14" r="2.5" fill="#3b82f6"/>
        <circle cx="70" cy="18" r="2" fill="#10b981"/>
        <ellipse cx="55" cy="32" rx="17" ry="3" fill="#ca8a04"/>
        <circle cx="55" cy="55" r="48" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,3"/>
      </g>
    `
  }
];

class UserProfileManager {
  constructor() {
    this.dbName = 'StatHustleUsersDB';
    this.sessionKey = 'stathustle_active_session_email';
    this.registryStorageKey = 'stathustle_users_registry';
    this.googleClientId = '794609556919-4ac9ftru7l363jbqcjpgovn9kb3vbkjm.apps.googleusercontent.com';

    this.isLoggedIn = false;
    this.profile = this.createDefaultProfile();
    this.lastCloudSyncTime = 0;
    this.cloudSyncTimer = null;

    // Synchronous local session restoration
    this.checkSessionSync();
    this.initDatabase();
    this.initTabTimeTracker();
    this.initGoogleAuth();
    this.syncWithServer();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initExamScheduleControls();
        this.renderExamScheduleAndGrades();
      });
    } else {
      setTimeout(() => {
        this.initExamScheduleControls();
        this.renderExamScheduleAndGrades();
      }, 50);
    }
  }

  createDefaultProfile(email = '', name = 'UCU Student') {
    return {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: email,
      name: name,
      passwordHash: '',
      photoUrl: '',
      authProvider: 'local',
      equippedOutfit: 'freshman_tee',
      totalSeconds: 0,
      studySeconds: 0,
      timePerTab: {
        dashboard: 0,
        colloquium: 0,
        problems: 0,
        quizzes: 0,
        topics: 0,
        formulas: 0
      },
      examSchedule: {
        colloquiumDate: '2026-10-14T09:00',
        midtermDate: '2026-10-16T08:30'
      },
      examGrades: {
        colloquium: { grade: '', notes: '', updatedAt: null },
        midterm: { grade: '', notes: '', updatedAt: null }
      },
      mistakesHistory: {},
      readinessState: null,
      geminiApiKey: '',
      createdAt: Date.now(),
      lastLogin: Date.now()
    };
  }

  // --- DATABASE & PERSISTENCE ---
  initDatabase() {
    if (!window.indexedDB) {
      this.checkSession();
      return;
    }

    const req = indexedDB.open(this.dbName, 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'email' });
      }
    };
    req.onsuccess = () => {
      this.checkSession();
    };
    req.onerror = () => {
      this.checkSession();
    };
  }

  getAllUsersFromStorage() {
    try {
      return JSON.parse(localStorage.getItem(this.registryStorageKey) || '{}');
    } catch (e) {
      return {};
    }
  }

  // --- AWS CLOUD CROSS-DEVICE SYNC ENGINE ---
  async fetchUserFromCloud(email) {
    if (!email) return null;
    try {
      const url = `${CLOUD_SYNC_ENDPOINT}/?email=${encodeURIComponent(email.toLowerCase().trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.found !== false && data.email) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Notice: AWS Cloud fetch unavailable:', err);
    }
    return null;
  }

  async syncUserToCloud(userObj) {
    if (!userObj || !userObj.email) return;
    try {
      const payload = JSON.stringify(userObj);
      const res = await fetch(`${CLOUD_SYNC_ENDPOINT}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (res.ok) {
        this.lastCloudSyncTime = Date.now();
        this.updateCloudStatusUI('synced');
      } else {
        this.updateCloudStatusUI('pending');
      }
    } catch (err) {
      console.warn('Notice: AWS Cloud sync deferred:', err);
      this.updateCloudStatusUI('offline');
    }
  }

  scheduleCloudSync(userObj) {
    if (!userObj || !userObj.email) return;
    clearTimeout(this.cloudSyncTimer);
    this.cloudSyncTimer = setTimeout(() => {
      this.syncUserToCloud(userObj);
    }, 2000);
  }

  updateCloudStatusUI(status = 'synced') {
    const el = document.getElementById('cloud-sync-status-indicator');
    if (!el) return;

    if (status === 'synced') {
      el.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span class="text-emerald-400 font-semibold">Хмара синхронізована</span>`;
    } else if (status === 'syncing') {
      el.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span class="text-amber-400 font-semibold">Синхронізація...</span>`;
    } else {
      el.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-500"></span><span class="text-slate-400 font-semibold">Офлайн-режим</span>`;
    }
  }

  mergeUserProfiles(local, cloud) {
    if (!cloud) return local;
    if (!local) return cloud;

    const merged = Object.assign({}, local, cloud);

    // Keep highest total seconds spent
    const maxSec = Math.max(
      Number(local.totalSeconds) || 0,
      Number(local.studySeconds) || 0,
      Number(cloud.totalSeconds) || 0,
      Number(cloud.studySeconds) || 0
    );
    merged.totalSeconds = maxSec;
    merged.studySeconds = maxSec;

    // Tab analytics: take max for each tab
    merged.timePerTab = {};
    const tabs = ['dashboard', 'colloquium', 'problems', 'quizzes', 'topics', 'formulas'];
    for (const t of tabs) {
      merged.timePerTab[t] = Math.max((local.timePerTab?.[t] || 0), (cloud.timePerTab?.[t] || 0));
    }

    // Merge mistakes history
    merged.mistakesHistory = Object.assign({}, local.mistakesHistory || {}, cloud.mistakesHistory || {});

    // Merge readinessState intelligently
    const lR = local.readinessState || {};
    const cR = cloud.readinessState || {};
    merged.readinessState = {
      definitionsScores: Object.assign({}, lR.definitionsScores || {}),
      topicTestsSolved: Object.assign({}, lR.topicTestsSolved || {}),
      questionsAnswered: Object.assign({}, lR.questionsAnswered || {}),
      problemsMastered: Object.assign({}, lR.problemsMastered || {}),
      daysCompleted: Object.assign({}, lR.daysCompleted || {}),
      overallPercent: Math.max(lR.overallPercent || 0, cR.overallPercent || 0)
    };

    // For definitions, take highest score
    if (cR.definitionsScores) {
      for (const [defId, score] of Object.entries(cR.definitionsScores)) {
        merged.readinessState.definitionsScores[defId] = Math.max(
          merged.readinessState.definitionsScores[defId] || 0,
          score
        );
      }
    }

    // For topic tests, take best score
    if (cR.topicTestsSolved) {
      for (const [tId, testObj] of Object.entries(cR.topicTestsSolved)) {
        const existing = merged.readinessState.topicTestsSolved[tId];
        if (!existing || (testObj.score || 0) > (existing.score || 0)) {
          merged.readinessState.topicTestsSolved[tId] = testObj;
        }
      }
    }

    // For questions answered
    if (cR.questionsAnswered) {
      Object.assign(merged.readinessState.questionsAnswered, cR.questionsAnswered);
    }

    // For problems mastered
    if (cR.problemsMastered) {
      for (const [pId, solved] of Object.entries(cR.problemsMastered)) {
        if (solved) merged.readinessState.problemsMastered[pId] = true;
      }
    }

    // For days completed
    if (cR.daysCompleted) {
      for (const [dNum, done] of Object.entries(cR.daysCompleted)) {
        if (done) merged.readinessState.daysCompleted[dNum] = true;
      }
    }

    // Preserve Gemini API Key if available in either
    merged.geminiApiKey = local.geminiApiKey || cloud.geminiApiKey || '';

    // Merge examSchedule
    merged.examSchedule = Object.assign(
      { colloquiumDate: '2026-10-14T09:00', midtermDate: '2026-10-16T08:30' },
      local.examSchedule || {},
      cloud.examSchedule || {}
    );

    // Merge examGrades
    merged.examGrades = {
      colloquium: Object.assign({}, local.examGrades?.colloquium || {}, cloud.examGrades?.colloquium || {}),
      midterm: Object.assign({}, local.examGrades?.midterm || {}, cloud.examGrades?.midterm || {})
    };

    return merged;
  }

  saveUserToRegistry(userObj) {
    if (!userObj || !userObj.email) return;
    const emailKey = userObj.email.toLowerCase().trim();
    userObj.email = emailKey;

    // 1. LocalStorage registry map
    const registry = this.getAllUsersFromStorage();
    registry[emailKey] = userObj;
    localStorage.setItem(this.registryStorageKey, JSON.stringify(registry));

    // 1b. Direct dedicated key per user
    try {
      localStorage.setItem('stathustle_user_' + emailKey, JSON.stringify(userObj));
    } catch (e) {}

    // 2. IndexedDB store
    if (window.indexedDB) {
      try {
        const req = indexedDB.open(this.dbName, 2);
        req.onsuccess = (e) => {
          const db = e.target.result;
          if (db.objectStoreNames.contains('users')) {
            const tx = db.transaction('users', 'readwrite');
            tx.objectStore('users').put(userObj);
          }
        };
      } catch (err) {}
    }

    // 3. AWS Cloud Sync (Cross-Device API)
    this.scheduleCloudSync(userObj);

    // 4. Server sync if running locally
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      fetch('/api/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userObj)
      }).catch(() => {});
    }
  }

  getUserFromRegistry(email) {
    if (!email) return null;
    const emailKey = email.toLowerCase().trim();
    const registry = this.getAllUsersFromStorage();
    if (registry[emailKey]) return registry[emailKey];

    // Fallback to direct key
    try {
      const direct = localStorage.getItem('stathustle_user_' + emailKey);
      if (direct) {
        const parsed = JSON.parse(direct);
        registry[emailKey] = parsed;
        localStorage.setItem(this.registryStorageKey, JSON.stringify(registry));
        return parsed;
      }
    } catch (e) {}

    return null;
  }

  recoverStudyTimeIfZero() {
    if (!this.profile) return;
    let currentSec = Math.max(
      Number(this.profile.totalSeconds) || 0,
      Number(this.profile.studySeconds) || 0
    );
    if (currentSec > 0) return;

    let highestSec = 0;
    try {
      const pomo = JSON.parse(localStorage.getItem('stathustle_pomodoro_stats') || '{}');
      if (pomo.totalMinutesStudied) {
        highestSec = Math.max(highestSec, (Number(pomo.totalMinutesStudied) || 0) * 60);
      }
    } catch (e) {}

    try {
      const reg = this.getAllUsersFromStorage();
      for (const u of Object.values(reg)) {
        highestSec = Math.max(highestSec, Number(u?.totalSeconds) || 0, Number(u?.studySeconds) || 0);
      }
    } catch (e) {}

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('stathustle_user_')) {
          const u = JSON.parse(localStorage.getItem(k) || '{}');
          highestSec = Math.max(highestSec, Number(u?.totalSeconds) || 0, Number(u?.studySeconds) || 0);
        }
      }
    } catch (e) {}

    if (highestSec > 0) {
      console.log(`[StatHustle] Automatically recovered ${highestSec}s study time!`);
      this.profile.totalSeconds = highestSec;
      this.profile.studySeconds = highestSec;
      this.saveProfile();
      this.renderStudyTimeElements();
    }
  }

  checkSessionSync() {
    const activeEmail = localStorage.getItem(this.sessionKey);
    if (activeEmail) {
      const found = this.getUserFromRegistry(activeEmail);
      if (found) {
        this.profile = found;
        this.isLoggedIn = true;
        this.recoverStudyTimeIfZero();
        return;
      }
    }
    this.isLoggedIn = false;
    this.recoverStudyTimeIfZero();
  }

  async checkSession() {
    const activeEmail = localStorage.getItem(this.sessionKey);
    if (activeEmail) {
      let found = this.getUserFromRegistry(activeEmail);
      // Fetch latest cloud profile in background to merge any progress from other devices
      const cloudUser = await this.fetchUserFromCloud(activeEmail);
      if (cloudUser) {
        found = this.mergeUserProfiles(found, cloudUser);
        this.saveUserToRegistry(found);
      }
      if (found) {
        this.loadExistingUser(found);
        return;
      }
    }

    // Not logged in -> Show mandatory Auth & Onboarding Gate Modal
    this.isLoggedIn = false;
    this.showAuthGate();
  }

  async syncWithServer() {
    // 1. AWS Cloud sync for active user
    const activeEmail = localStorage.getItem(this.sessionKey);
    if (activeEmail && this.isLoggedIn) {
      const cloudUser = await this.fetchUserFromCloud(activeEmail);
      if (cloudUser) {
        const merged = this.mergeUserProfiles(this.profile, cloudUser);
        this.profile = merged;
        this.saveUserToRegistry(merged);
        if (window.quizManager && this.profile.readinessState) {
          window.quizManager.loadUserState(activeEmail, this.profile.readinessState);
        }
        this.updateUserUI();
      }
    }

    // 2. Local backend fallback if running locally
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const res = await fetch('/api/users/list');
        if (res.ok) {
          const serverUsers = await res.json();
          if (serverUsers && typeof serverUsers === 'object') {
            const localRegistry = this.getAllUsersFromStorage();
            let changed = false;
            for (const [email, sUser] of Object.entries(serverUsers)) {
              const lUser = localRegistry[email];
              if (!lUser || (sUser.lastLogin || 0) > (lUser.lastLogin || 0)) {
                localRegistry[email] = sUser;
                changed = true;
              }
            }
            if (changed) {
              localStorage.setItem(this.registryStorageKey, JSON.stringify(localRegistry));
            }
          }
        }
      } catch (err) {}
    }
  }

  loadExistingUser(userObj) {
    this.profile = userObj;
    this.isLoggedIn = true;
    localStorage.setItem(this.sessionKey, userObj.email);

    // Sync API key to geminiMentor if saved in profile
    if (userObj.geminiApiKey && window.geminiMentor && !window.geminiMentor.apiKey) {
      window.geminiMentor.setApiKey(userObj.geminiApiKey);
    }

    // Sync readiness state strictly for THIS specific user account
    if (window.quizManager) {
      window.quizManager.loadUserState(userObj.email, userObj.readinessState);
    }

    this.recoverStudyTimeIfZero();
    this.hideAuthGate();
    this.updateUserUI();
    this.updateCloudStatusUI('synced');

    // Re-render UI sections so that problem checkboxes, test scores, etc. reflect this user
    if (window.app) {
      window.app.renderDashboard();
      window.app.renderColloquiumSection();
      window.app.renderProblemsSection();
      window.app.renderTopicsSection();
      window.app.renderAllMath();
    }
  }

  // --- AUTHENTICATION ACTIONS ---
  async register(name, email, password, photoUrl = '') {
    if (!email || !email.includes('@')) {
      alert('Будь ласка, введіть коректну електронну пошту!');
      return false;
    }
    if (!password || password.length < 4) {
      alert('Пароль має містити щонайменше 4 символи!');
      return false;
    }

    const emailKey = email.toLowerCase().trim();
    const existing = this.getUserFromRegistry(emailKey) || await this.fetchUserFromCloud(emailKey);
    if (existing) {
      alert('Користувач із цією поштою вже зареєстрований! Будь ласка, увійдіть.');
      this.switchAuthTab('login');
      return false;
    }

    const newUser = this.createDefaultProfile(emailKey, name || 'UCU Student');
    newUser.passwordHash = btoa(password);
    newUser.photoUrl = photoUrl;
    newUser.authProvider = 'local';
    newUser.createdAt = Date.now();
    newUser.lastLogin = Date.now();

    this.saveUserToRegistry(newUser);
    this.loadExistingUser(newUser);
    await this.syncUserToCloud(newUser);

    alert(`Вітаємо, ${newUser.name}! Ваш акаунт успішно створено. Усі ваші досягнення та час зберігатимуться в хмарі.`);
    return true;
  }

  async login(email, password) {
    if (!email || !password) {
      alert('Введіть пошту та пароль!');
      return false;
    }

    const emailKey = email.toLowerCase().trim();
    let user = this.getUserFromRegistry(emailKey);
    // Check cloud if not in local storage on new device
    if (!user) {
      const cloudUser = await this.fetchUserFromCloud(emailKey);
      if (cloudUser) {
        user = cloudUser;
      }
    }

    if (!user) {
      alert('Користувача з такою поштою не знайдено. Будь ласка, зареєструйтесь!');
      this.switchAuthTab('register');
      return false;
    }

    if (user.passwordHash && user.passwordHash !== btoa(password)) {
      alert('Невірний пароль! Спробуйте ще раз.');
      return false;
    }

    user.lastLogin = Date.now();
    this.saveUserToRegistry(user);
    this.loadExistingUser(user);
    await this.syncUserToCloud(user);

    alert(`З поверненням, ${user.name}! Ваш прогрес успішно синхронізовано з хмари.`);
    return true;
  }

  async loginWithGoogle(payload) {
    if (!payload || !payload.email) return;
    const emailKey = payload.email.toLowerCase().trim();

    this.updateCloudStatusUI('syncing');

    // Fetch from AWS Cloud first to guarantee cross-device transfer!
    const cloudUser = await this.fetchUserFromCloud(emailKey);
    let localUser = this.getUserFromRegistry(emailKey);

    let user = null;
    if (cloudUser) {
      user = this.mergeUserProfiles(localUser, cloudUser);
    } else {
      user = localUser;
    }

    if (!user) {
      user = this.createDefaultProfile(emailKey, payload.name || 'UCU Student');
      user.photoUrl = payload.picture || '';
      user.authProvider = 'google';
      user.createdAt = Date.now();
    } else {
      user.name = payload.name || user.name;
      if (payload.picture) user.photoUrl = payload.picture;
    }

    user.lastLogin = Date.now();
    this.saveUserToRegistry(user);
    this.loadExistingUser(user);
    await this.syncUserToCloud(user);

    alert(`Авторизація через Google успішна! Вітаємо, ${user.name}. Усі ваші дані синхронізовано між вашими пристроями!`);
  }

  loginAsGuest() {
    const guestEmail = 'guest_student@ucu.edu.ua';
    let user = this.getUserFromRegistry(guestEmail);
    if (!user) {
      user = this.createDefaultProfile(guestEmail, 'Ihor (UCU Guest)');
      user.authProvider = 'guest';
    }
    user.lastLogin = Date.now();
    this.saveUserToRegistry(user);
    this.loadExistingUser(user);
  }

  logout() {
    if (confirm('Ви впевнені, що хочете вийти з акаунту? Ваші досягнення збережені в хмарі.')) {
      this.saveProfile();
      localStorage.removeItem(this.sessionKey);
      this.isLoggedIn = false;
      this.profile = this.createDefaultProfile();
      if (window.quizManager) {
        window.quizManager.loadUserState(null, null);
      }
      this.updateUserUI();
      if (window.app) {
        window.app.renderDashboard();
        window.app.renderColloquiumSection();
        window.app.renderProblemsSection();
        window.app.renderTopicsSection();
        window.app.renderAllMath();
      }
      this.showAuthGate();
    }
  }

  // --- TIME & TAB TRACKING (Per Account) ---
  initTabTimeTracker() {
    setInterval(() => {
      if (!this.profile) return;

      if (!document.hidden) {
        const activeTab = window.app?.currentTab || 'dashboard';

        if (!this.profile.timePerTab) {
          this.profile.timePerTab = { dashboard: 0, colloquium: 0, problems: 0, quizzes: 0, topics: 0, formulas: 0 };
        }

        this.profile.timePerTab[activeTab] = (this.profile.timePerTab[activeTab] || 0) + 1;
        this.profile.totalSeconds = (Number(this.profile.totalSeconds) || 0) + 1;
        this.profile.studySeconds = this.profile.totalSeconds;

        // Auto-save every 3 seconds to guarantee progress persistence
        if (this.profile.totalSeconds % 3 === 0) {
          this.saveProfile();
        }

        this.renderStudyTimeElements();
        this.renderTabTimeAnalytics();
      }
    }, 1000);

    document.addEventListener('visibilitychange', () => {
      if (this.isLoggedIn) this.saveProfile();
    });

    window.addEventListener('beforeunload', () => {
      if (this.isLoggedIn) this.saveProfile();
    });
  }

  saveProfile() {
    if (!this.profile?.email) return;

    if (window.quizManager?.readinessState) {
      this.profile.readinessState = JSON.parse(JSON.stringify(window.quizManager.readinessState));
    }

    this.saveUserToRegistry(this.profile);
    this.renderStudyTimeElements();
  }

  // --- MISTAKES ANALYTICS ---
  recordMistake(id, title, topic, type) {
    if (!this.profile) return;
    if (!this.profile.mistakesHistory) this.profile.mistakesHistory = {};

    if (!this.profile.mistakesHistory[id]) {
      this.profile.mistakesHistory[id] = {
        id,
        title,
        topic,
        type,
        count: 1,
        lastErrorAt: Date.now()
      };
    } else {
      this.profile.mistakesHistory[id].count += 1;
      this.profile.mistakesHistory[id].lastErrorAt = Date.now();
    }
    this.saveProfile();
    this.renderMistakesAnalytics();
  }

  recordSuccess(id) {
    if (this.profile?.mistakesHistory?.[id]) {
      delete this.profile.mistakesHistory[id];
      this.saveProfile();
      this.renderMistakesAnalytics();
    }
  }

  // --- TIME DISPLAY HELPERS ---
  formatDuration(seconds) {
    const s = Math.floor(seconds || 0);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  }

  renderStudyTimeElements() {
    const totalSec = Math.max(
      Number(this.profile?.totalSeconds) || 0,
      Number(this.profile?.studySeconds) || 0
    );
    const formatted = this.formatDuration(totalSec);

    // Header badges
    const userHeaderBadge = document.getElementById('user-header-study-time');
    if (userHeaderBadge) userHeaderBadge.textContent = formatted;
    const headerBadge = document.getElementById('header-study-time');
    if (headerBadge) headerBadge.textContent = formatted;

    // Dashboard card timer & total focus hours
    const userDashTime = document.getElementById('user-dash-study-time');
    if (userDashTime) userDashTime.textContent = formatted;
    const dashTime = document.getElementById('dashboard-study-time-val');
    if (dashTime) dashTime.textContent = formatted;

    const dashHours = document.getElementById('user-dash-study-hours');
    if (dashHours) {
      dashHours.textContent = `${(totalSec / 3600).toFixed(1)} hrs`;
    }

    const modalTotal = document.getElementById('user-modal-total-time');
    if (modalTotal) modalTotal.textContent = formatted;
  }

  renderTabTimeAnalytics() {
    const container = document.getElementById('tab-time-analytics-grid') || document.getElementById('user-tab-time-list');
    if (!container || !this.profile) return;

    const tabsMap = [
      { key: 'dashboard', label: 'Dashboard & Countdown', icon: 'layout-dashboard' },
      { key: 'colloquium', label: 'Colloquium 2 Questions', icon: 'target' },
      { key: 'problems', label: 'Problems Bank', icon: 'notebook-pen' },
      { key: 'quizzes', label: '600 Practice Quizzes', icon: 'brain' },
      { key: 'topics', label: '12 Theory Topics', icon: 'book-open' },
      { key: 'formulas', label: 'Formulas & Distributions', icon: 'ruler' }
    ];

    const total = Math.max(this.profile.totalSeconds || 1, 1);
    const perTab = this.profile.timePerTab || {};

    container.innerHTML = tabsMap.map(t => {
      const sec = perTab[t.key] || 0;
      const pct = Math.min(Math.round((sec / total) * 100), 100);
      return `
        <div class="space-y-1">
          <div class="flex justify-between text-xs font-semibold text-slate-300">
            <span class="flex items-center gap-1.5">${icon(t.icon)} ${t.label}</span>
            <span class="font-mono text-indigo-400">${this.formatDuration(sec)} (${pct}%)</span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div class="h-full bg-indigo-500 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderMistakesAnalytics() {
    const container = document.getElementById('mistakes-analytics-list');
    const badge = document.getElementById('user-mistakes-badge');
    if (!container || !this.profile) return;

    // Most frequent first, as the panel footer promises
    const mistakes = Object.values(this.profile.mistakesHistory || {})
      .sort((a, b) => (b.count - a.count) || ((b.lastErrorAt || 0) - (a.lastErrorAt || 0)));
    if (badge) badge.textContent = `Помилок: ${mistakes.length}`;

    if (mistakes.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
          ${icon('party-popper', 'text-emerald-400')} Жодної помилки в реєстрі! Ви розв'язали всі поточні завдання безпомилково.
        </div>
      `;
      return;
    }

    const quizMistakes = mistakes.filter(m => m.type === 'quiz').length;
    container.innerHTML = (quizMistakes ? `
      <button id="mistakes-practice-btn" class="w-full px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition">
        ${icon('repeat')} Прорішати помилки з тестів (${quizMistakes})
      </button>
    ` : '') + mistakes.map(m => `
      <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div class="flex-1 truncate">
          <div class="font-bold text-slate-200 truncate">${m.title}</div>
          <div class="text-[11px] text-slate-400">${m.topic} • Тип: <span class="text-indigo-400 font-semibold">${m.type}</span></div>
        </div>
        <div class="text-right shrink-0 flex items-center gap-2">
          ${m.type === 'problem' ? `<button class="mistake-open-problem-btn text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer transition" data-prob-id="${String(m.id).replace('prob_', '')}">До задачі ${icon('arrow-right')}</button>` : ''}
          <span class="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
            ${m.count} ${m.count === 1 ? 'error' : 'errors'}
          </span>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.mistake-open-problem-btn').forEach(btn => {
      btn.addEventListener('click', () => window.app?.openProblem(btn.getAttribute('data-prob-id')));
    });
    container.querySelector('#mistakes-practice-btn')?.addEventListener('click', () => window.app?.openMistakesPractice());
    window.app?.renderAllMath(container);
  }

  // --- AVATAR & WARDROBE GAMIFICATION ---
  renderWardrobeList() {
    const container = document.getElementById('wardrobe-items-list') || document.getElementById('user-wardrobe-grid');
    if (!container) return;

    const currentReadiness = window.quizManager?.readinessState?.overallPercent || 0;
    const equipped = this.profile?.equippedOutfit || 'freshman_tee';

    container.innerHTML = WARDROBE_ITEMS.map(item => {
      const isUnlocked = currentReadiness >= item.minReadiness;
      const isEquipped = equipped === item.id;

      let btnLabel = `${icon('lock')} Заблоковано`;
      let btnClass = 'bg-slate-800 text-slate-500 cursor-not-allowed';

      if (isEquipped) {
        btnLabel = `${icon('check')} Одягнено`;
        btnClass = 'bg-emerald-600 text-white font-bold shadow-sm';
      } else if (isUnlocked) {
        btnLabel = 'Одягнути';
        btnClass = 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition';
      }

      return `
        <div class="p-4 rounded-2xl border ${isEquipped ? 'border-indigo-500 bg-indigo-950/30' : 'border-slate-800 bg-slate-950/60'} flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-2xl">${icon(item.icon)}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isUnlocked ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' : 'bg-slate-800 text-slate-400'}">
                ${item.badge}
              </span>
            </div>
            <h4 class="font-bold text-slate-200 text-xs mb-1">${item.name}</h4>
            <p class="text-[11px] text-slate-400 leading-relaxed mb-3">${item.description}</p>
          </div>
          <button class="wardrobe-equip-btn w-full py-1.5 rounded-lg text-xs font-semibold ${btnClass}" data-outfit-id="${item.id}" ${!isUnlocked || isEquipped ? 'disabled' : ''}>
            ${btnLabel}
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.wardrobe-equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-outfit-id');
        this.equipOutfit(id);
      });
    });
  }

  getEquippedOutfit() {
    return WARDROBE_ITEMS.find(w => w.id === this.profile.equippedOutfit) || WARDROBE_ITEMS[0];
  }

  equipOutfit(outfitId) {
    const outfit = WARDROBE_ITEMS.find(w => w.id === outfitId);
    if (!outfit) return false;

    const currentReadiness = window.quizManager?.readinessState?.overallPercent || 0;
    if (currentReadiness < outfit.minReadiness) {
      alert(`Цей одяг вимагає ${outfit.minReadiness}% готовності! Ваш поточний рівень: ${currentReadiness}%.`);
      return false;
    }

    this.profile.equippedOutfit = outfitId;
    this.saveProfile();
    this.renderAvatar();
    this.renderWardrobeList();
    return true;
  }

  renderAvatar(targetContainerId = 'user-avatar-display') {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    const outfit = this.getEquippedOutfit();

    container.innerHTML = `
      <svg viewBox="0 0 110 120" class="w-full h-full drop-shadow-lg transition-transform duration-300 hover:scale-105">
        <defs>
          <radialGradient id="avatarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="55" cy="60" r="50" fill="url(#avatarGlow)" />
        
        <!-- Base Body / Head -->
        <rect x="50" y="50" width="10" height="12" fill="#fbd38d"/>
        <circle cx="55" cy="42" r="16" fill="#fbd38d"/>
        <path d="M40 38 Q55 22 70 38 Q55 30 40 38 Z" fill="#2d3748"/>
        <circle cx="49" cy="42" r="2" fill="#1a202c"/>
        <circle cx="61" cy="42" r="2" fill="#1a202c"/>
        <path d="M52 48 Q55 52 58 48" fill="none" stroke="#e53e3e" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Render Equipped Outfit -->
        ${outfit.renderSvg(outfit.color)}
      </svg>
    `;
  }

  updateUserUI() {
    const userNameEl = document.getElementById('user-header-name');
    if (userNameEl) userNameEl.textContent = this.profile.name || 'UCU Student';

    const userEmailEl = document.getElementById('user-header-email');
    if (userEmailEl) userEmailEl.textContent = this.profile.email || 'UCU Student';

    const userPhotoEl = document.getElementById('user-header-photo');
    if (userPhotoEl) {
      if (this.profile.photoUrl) {
        userPhotoEl.src = this.profile.photoUrl;
        userPhotoEl.classList.remove('hidden');
        document.getElementById('user-header-default-avatar')?.classList.add('hidden');
      } else {
        userPhotoEl.classList.add('hidden');
        document.getElementById('user-header-default-avatar')?.classList.remove('hidden');
      }
    }

    this.renderStudyTimeElements();
    this.renderTabTimeAnalytics();
    this.renderMistakesAnalytics();
    this.renderAvatar();
    this.renderWardrobeList();
    this.renderExamScheduleAndGrades();
    this.updateCloudStatusUI('synced');

    // Google Account status in profile modal
    const gStatusEl = document.getElementById('google-account-status');
    if (gStatusEl) {
      if (this.profile.email) {
        gStatusEl.innerHTML = `
          <div class="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
            <div class="flex items-center gap-2 truncate">
              ${icon('cloud', 'text-emerald-400')}
              <span class="truncate">Синхронізовано: <strong>${this.profile.email}</strong></span>
            </div>
            <div class="flex items-center gap-2 shrink-0 ml-2">
              <button id="auth-manual-sync-btn" class="px-2 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 text-[10px] text-indigo-200 font-bold border border-indigo-700">${icon('refresh-cw')} Синхр</button>
              <button id="auth-logout-btn-modal" class="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline">Вийти</button>
            </div>
          </div>
        `;
        document.getElementById('auth-logout-btn-modal')?.addEventListener('click', () => {
          this.logout();
        });
        document.getElementById('auth-manual-sync-btn')?.addEventListener('click', async () => {
          const btn = document.getElementById('auth-manual-sync-btn');
          if (btn) btn.textContent = '...';
          await this.syncUserToCloud(this.profile);
          if (btn) btn.innerHTML = `${icon('check')} Збережено`;
          setTimeout(() => { if (btn) btn.innerHTML = `${icon('refresh-cw')} Синхр`; }, 2000);
        });
      } else {
        gStatusEl.innerHTML = '';
      }
    }
  }

  // --- MANDATORY AUTH & ONBOARDING GATE MODAL ---
  showAuthGate() {
    const modal = document.getElementById('auth-gate-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.setupGoogleButton('auth-gate-google-btn-container');
    }
  }

  hideAuthGate() {
    const modal = document.getElementById('auth-gate-modal');
    if (modal) modal.classList.add('hidden');
  }

  switchAuthTab(tab) {
    const loginForm = document.getElementById('auth-gate-login-form');
    const registerForm = document.getElementById('auth-gate-register-form');
    const loginTabBtn = document.getElementById('auth-tab-btn-login');
    const regTabBtn = document.getElementById('auth-tab-btn-register');

    if (tab === 'login') {
      loginForm?.classList.remove('hidden');
      registerForm?.classList.add('hidden');
      loginTabBtn?.classList.add('border-indigo-500', 'text-white', 'bg-indigo-950/50');
      loginTabBtn?.classList.remove('text-slate-400');
      regTabBtn?.classList.remove('border-indigo-500', 'text-white', 'bg-indigo-950/50');
      regTabBtn?.classList.add('text-slate-400');
    } else {
      registerForm?.classList.remove('hidden');
      loginForm?.classList.add('hidden');
      regTabBtn?.classList.add('border-indigo-500', 'text-white', 'bg-indigo-950/50');
      regTabBtn?.classList.remove('text-slate-400');
      loginTabBtn?.classList.remove('border-indigo-500', 'text-white', 'bg-indigo-950/50');
      loginTabBtn?.classList.add('text-slate-400');
    }
  }

  initGoogleAuth() {
    window.handleGoogleCredentialResponse = (response) => {
      try {
        const payload = this.decodeJwtResponse(response.credential);
        if (payload) {
          this.loginWithGoogle(payload);
        }
      } catch (err) {
        console.error('Failed to parse Google JWT credential', err);
      }
    };

    this.setupGoogleButton('google-signin-btn-container');
    this.setupGoogleButton('auth-gate-google-btn-container');
  }

  setupGoogleButton(containerId) {
    const checkAndInit = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: window.handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          const gBtnContainer = document.getElementById(containerId);
          if (gBtnContainer) {
            gBtnContainer.innerHTML = '';
            window.google.accounts.id.renderButton(gBtnContainer, {
              theme: 'filled_blue',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              width: 320
            });
          }
        } catch (e) {
          console.warn('Google GSI init notice', e);
        }
      } else {
        setTimeout(checkAndInit, 300);
      }
    };
    checkAndInit();
  }

  decodeJwtResponse(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // --- EXAM SCHEDULE & GRADES ENGINE ---
  getExamSchedule() {
    if (this.profile?.examSchedule?.colloquiumDate) {
      return this.profile.examSchedule;
    }
    try {
      const raw = localStorage.getItem('stathustle_exam_schedule');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.colloquiumDate) {
          if (this.profile) this.profile.examSchedule = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    const def = {
      colloquiumDate: '2026-10-14T09:00',
      midtermDate: '2026-10-16T08:30'
    };
    if (this.profile) this.profile.examSchedule = def;
    return def;
  }

  saveExamSchedule(colloquiumDate, midtermDate) {
    if (!this.profile) this.profile = this.createDefaultProfile();
    if (!this.profile.examSchedule) this.profile.examSchedule = {};
    if (colloquiumDate) this.profile.examSchedule.colloquiumDate = colloquiumDate;
    if (midtermDate) this.profile.examSchedule.midtermDate = midtermDate;

    try {
      localStorage.setItem('stathustle_exam_schedule', JSON.stringify(this.profile.examSchedule));
    } catch (e) {}
    this.saveProfile();
    this.renderExamScheduleAndGrades();
    if (window.app?.setupCountdowns) {
      window.app.setupCountdowns();
    }
  }

  getExamGrades() {
    if (this.profile?.examGrades) {
      return this.profile.examGrades;
    }
    try {
      const raw = localStorage.getItem('stathustle_exam_grades');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (this.profile) this.profile.examGrades = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    const def = {
      colloquium: { grade: '', notes: '', updatedAt: null },
      midterm: { grade: '', notes: '', updatedAt: null }
    };
    if (this.profile) this.profile.examGrades = def;
    return def;
  }

  saveExamGrade(type, grade, notes = '') {
    if (!this.profile) this.profile = this.createDefaultProfile();
    if (!this.profile.examGrades) {
      this.profile.examGrades = {
        colloquium: { grade: '', notes: '', updatedAt: null },
        midterm: { grade: '', notes: '', updatedAt: null }
      };
    }
    this.profile.examGrades[type] = {
      grade: (grade || '').trim(),
      notes: (notes || '').trim(),
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem('stathustle_exam_grades', JSON.stringify(this.profile.examGrades));
    } catch (e) {}
    this.saveProfile();
    this.renderExamScheduleAndGrades();
    if (window.app?.setupCountdowns) {
      window.app.setupCountdowns();
    }
  }

  renderExamScheduleAndGrades() {
    const schedule = this.getExamSchedule();
    const grades = this.getExamGrades();

    // 1. Populate Colloquium Date Picker
    const colInput = document.getElementById('colloquium-datetime-input');
    if (colInput && schedule.colloquiumDate) {
      colInput.value = schedule.colloquiumDate;
    }

    // 2. Populate Midterm Date Picker
    const midInput = document.getElementById('midterm-datetime-input');
    if (midInput && schedule.midtermDate) {
      midInput.value = schedule.midtermDate;
    }

    // 3. Render Colloquium Grade
    const colGradeForm = document.getElementById('colloquium-grade-form');
    const colGradeDisplay = document.getElementById('colloquium-grade-display');
    const colStatusBadge = document.getElementById('colloquium-status-badge');
    const colDateLabel = document.getElementById('colloquium-grade-saved-date');

    const colG = grades.colloquium;
    if (colG && colG.grade) {
      if (colGradeForm) colGradeForm.classList.add('hidden');
      if (colGradeDisplay) {
        colGradeDisplay.classList.remove('hidden');
        const badgeVal = document.getElementById('colloquium-grade-badge-val');
        const notesVal = document.getElementById('colloquium-grade-notes-val');
        if (badgeVal) badgeVal.textContent = colG.grade;
        if (notesVal) notesVal.textContent = colG.notes || 'Без додаткового коментаря';
      }
      if (colStatusBadge) {
        colStatusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 shrink-0';
        colStatusBadge.innerHTML = `${icon('circle-check')} Складено: `;
        colStatusBadge.append(colG.grade); // user input: added as text, never as HTML
      }
      if (colDateLabel && colG.updatedAt) {
        const d = new Date(colG.updatedAt);
        colDateLabel.textContent = `Збережено: ${d.toLocaleDateString('uk-UA')} ${d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } else {
      if (colGradeDisplay) colGradeDisplay.classList.add('hidden');
      if (colGradeForm) colGradeForm.classList.remove('hidden');
      if (colStatusBadge) {
        colStatusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800 shrink-0';
        colStatusBadge.innerHTML = `${icon('zap')} Очікується`;
      }
      if (colDateLabel) colDateLabel.textContent = '';
    }

    // 4. Render Midterm Grade
    const midGradeForm = document.getElementById('midterm-grade-form');
    const midGradeDisplay = document.getElementById('midterm-grade-display');
    const midStatusBadge = document.getElementById('midterm-status-badge');
    const midDateLabel = document.getElementById('midterm-grade-saved-date');

    const midG = grades.midterm;
    if (midG && midG.grade) {
      if (midGradeForm) midGradeForm.classList.add('hidden');
      if (midGradeDisplay) {
        midGradeDisplay.classList.remove('hidden');
        const badgeVal = document.getElementById('midterm-grade-badge-val');
        const notesVal = document.getElementById('midterm-grade-notes-val');
        if (badgeVal) badgeVal.textContent = midG.grade;
        if (notesVal) notesVal.textContent = midG.notes || 'Без додаткового коментаря';
      }
      if (midStatusBadge) {
        midStatusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 shrink-0';
        midStatusBadge.innerHTML = `${icon('trophy')} Оцінка: `;
        midStatusBadge.append(midG.grade); // user input: added as text, never as HTML
      }
      if (midDateLabel && midG.updatedAt) {
        const d = new Date(midG.updatedAt);
        midDateLabel.textContent = `Збережено: ${d.toLocaleDateString('uk-UA')} ${d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } else {
      if (midGradeDisplay) midGradeDisplay.classList.add('hidden');
      if (midGradeForm) midGradeForm.classList.remove('hidden');
      if (midStatusBadge) {
        midStatusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0';
        midStatusBadge.innerHTML = `${icon('flame')} Пт, 08:30 Київ`;
      }
      if (midDateLabel) midDateLabel.textContent = '';
    }
  }

  initExamScheduleControls() {
    if (this._examControlsBound) return;
    this._examControlsBound = true;

    // Colloquium save time
    document.getElementById('save-colloquium-datetime-btn')?.addEventListener('click', () => {
      const input = document.getElementById('colloquium-datetime-input');
      if (!input || !input.value) {
        alert('Будь ласка, оберіть дату та час для колоквіуму!');
        return;
      }
      this.saveExamSchedule(input.value, null);
      alert(`Час колоквіуму успішно збережено: ${input.value.replace('T', ' ')}! Таймер оновлено.`);
    });

    // Midterm save time
    document.getElementById('save-midterm-datetime-btn')?.addEventListener('click', () => {
      const input = document.getElementById('midterm-datetime-input');
      if (!input || !input.value) {
        alert('Будь ласка, оберіть дату та час для мідтерму!');
        return;
      }
      this.saveExamSchedule(null, input.value);
      alert(`Час мідтерму успішно збережено: ${input.value.replace('T', ' ')}! Таймер оновлено.`);
    });

    // Colloquium preset buttons
    document.querySelectorAll('.col-slot-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dt = btn.getAttribute('data-dt');
        const input = document.getElementById('colloquium-datetime-input');
        if (input && dt) {
          input.value = dt;
          this.saveExamSchedule(dt, null);
        }
      });
    });

    // Midterm preset buttons
    document.querySelectorAll('.mid-slot-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dt = btn.getAttribute('data-dt');
        const input = document.getElementById('midterm-datetime-input');
        if (input && dt) {
          input.value = dt;
          this.saveExamSchedule(null, dt);
        }
      });
    });

    // Colloquium save grade
    document.getElementById('save-colloquium-grade-btn')?.addEventListener('click', () => {
      const gradeInput = document.getElementById('colloquium-grade-input');
      const notesInput = document.getElementById('colloquium-notes-input');
      const val = gradeInput?.value?.trim();
      if (!val) {
        alert('Будь ласка, введіть отриману оцінку за колоквіум (наприклад, 10/10 або 9.5)!');
        return;
      }
      this.saveExamGrade('colloquium', val, notesInput?.value || '');
      alert(`Оцінку за колоквіум збережено: ${val}! Вітаємо зі складанням!`);
    });

    // Colloquium edit grade
    document.getElementById('edit-colloquium-grade-btn')?.addEventListener('click', () => {
      const grades = this.getExamGrades();
      const gradeInput = document.getElementById('colloquium-grade-input');
      const notesInput = document.getElementById('colloquium-notes-input');
      if (gradeInput && grades.colloquium?.grade) gradeInput.value = grades.colloquium.grade;
      if (notesInput && grades.colloquium?.notes) notesInput.value = grades.colloquium.notes;

      document.getElementById('colloquium-grade-display')?.classList.add('hidden');
      document.getElementById('colloquium-grade-form')?.classList.remove('hidden');
    });

    // Midterm save grade
    document.getElementById('save-midterm-grade-btn')?.addEventListener('click', () => {
      const gradeInput = document.getElementById('midterm-grade-input');
      const notesInput = document.getElementById('midterm-notes-input');
      const val = gradeInput?.value?.trim();
      if (!val) {
        alert('Будь ласка, введіть отриману оцінку за мідтерм (наприклад, 95/100 або 24/25)!');
        return;
      }
      this.saveExamGrade('midterm', val, notesInput?.value || '');
      alert(`Оцінку за мідтерм збережено: ${val}! Чудовий результат!`);
    });

    // Midterm edit grade
    document.getElementById('edit-midterm-grade-btn')?.addEventListener('click', () => {
      const grades = this.getExamGrades();
      const gradeInput = document.getElementById('midterm-grade-input');
      const notesInput = document.getElementById('midterm-notes-input');
      if (gradeInput && grades.midterm?.grade) gradeInput.value = grades.midterm.grade;
      if (notesInput && grades.midterm?.notes) notesInput.value = grades.midterm.notes;

      document.getElementById('midterm-grade-display')?.classList.add('hidden');
      document.getElementById('midterm-grade-form')?.classList.remove('hidden');
    });

    // Make header countdowns jump to schedule card on click
    const colHeader = document.getElementById('colloquium-countdown-text');
    if (colHeader) {
      colHeader.style.cursor = 'pointer';
      colHeader.setAttribute('title', 'Натисніть, щоб налаштувати дату або внести оцінку за колоквіум');
      colHeader.onclick = () => {
        window.app?.switchTab('dashboard');
        setTimeout(() => {
          document.getElementById('exam-schedule-grades-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      };
    }
    const midHeader = document.getElementById('midterm-countdown-text');
    if (midHeader) {
      midHeader.style.cursor = 'pointer';
      midHeader.setAttribute('title', 'Натисніть, щоб переглянути розклад або внести оцінку за мідтерм');
      midHeader.onclick = () => {
        window.app?.switchTab('dashboard');
        setTimeout(() => {
          document.getElementById('exam-schedule-grades-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      };
    }
  }

  resetStudyTimer() {
    if (!this.profile) return;
    this.profile.totalSeconds = 0;
    this.profile.studySeconds = 0;
    this.profile.timePerTab = { dashboard: 0, colloquium: 0, problems: 0, quizzes: 0, topics: 0, formulas: 0 };
    this.saveProfile();
    this.renderStudyTimeElements();
    this.renderTabTimeAnalytics();
  }
}

window.userProfile = new UserProfileManager();
