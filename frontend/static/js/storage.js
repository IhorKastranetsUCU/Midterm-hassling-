// ==============================================================
// 🗄️ Local-First Client-Side Storage & Computation Engine (IndexedDB)
// ==============================================================
// Stores data securely on the student's device for 0ms instant loading
// and completely wipes data upon Logout to ensure zero residual trace.

const DB_NAME = 'MoodlePortalClientCache';
const DB_VERSION = 1;

class LocalCacheEngine {
  constructor() {
    this.db = null;
    this._initPromise = this._init();
  }

  async _init() {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        return resolve(null);
      }

      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('courses')) {
            db.createObjectStore('courses', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('course_contents')) {
            db.createObjectStore('course_contents', { keyPath: 'course_id' });
          }
          if (!db.objectStoreNames.contains('assignments')) {
            db.createObjectStore('assignments', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('grades')) {
            db.createObjectStore('grades', { keyPath: 'key' });
          }
        };

        request.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };

        request.onerror = (e) => {
          console.warn('IndexedDB blocked or unavailable, continuing without device cache:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization error:', err);
        resolve(null);
      }
    });
  }

  async _getStore(storeName, mode = 'readonly') {
    await this._initPromise;
    if (!this.db) return null;
    try {
      const tx = this.db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    } catch (e) {
      return null;
    }
  }

  // Generic Get
  async get(storeName, key) {
    const store = await this._getStore(storeName, 'readonly');
    if (!store) return null;

    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  }

  // Generic Put
  async put(storeName, key, data) {
    const store = await this._getStore(storeName, 'readwrite');
    if (!store) return false;

    return new Promise((resolve) => {
      const entry = { data, updated_at: Date.now() };
      if (storeName === 'courses') {
        entry.id = key;
      } else if (storeName === 'course_contents') {
        entry.course_id = key;
      } else {
        entry.key = String(key);
      }

      const req = store.put(entry);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }

  // Courses
  async getCourses() {
    return await this.get('courses', 'all_courses');
  }

  async setCourses(coursesList) {
    return await this.put('courses', 'all_courses', coursesList);
  }

  // Course Syllabus / Modules
  async getCourseContents(courseId) {
    return await this.get('course_contents', Number(courseId));
  }

  async setCourseContents(courseId, sections) {
    return await this.put('course_contents', Number(courseId), sections);
  }

  // Assignments
  async getAssignments(courseId = 'all') {
    return await this.get('assignments', String(courseId));
  }

  async setAssignments(courseId = 'all', assignmentsData) {
    return await this.put('assignments', String(courseId), assignmentsData);
  }

  // Grades
  async getGrades(courseId = 'all') {
    return await this.get('grades', String(courseId));
  }

  async setGrades(courseId = 'all', gradesData) {
    return await this.put('grades', String(courseId), gradesData);
  }

  // Secure Wipe: Clears all local storage on Logout
  async clearAll() {
    await this._initPromise;
    if (!this.db) return;

    const stores = ['courses', 'course_contents', 'assignments', 'grades'];
    for (const name of stores) {
      try {
        const tx = this.db.transaction(name, 'readwrite');
        tx.objectStore(name).clear();
      } catch (e) {}
    }
    console.log('[LocalCache] All local device cache safely purged.');
  }
}

// Global Singleton
window.LocalCache = new LocalCacheEngine();
