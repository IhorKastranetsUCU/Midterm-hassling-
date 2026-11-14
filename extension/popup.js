let lastExtraction = null;

function readToolsSelection() {
  return {
    interactive_book: document.getElementById('ext-book').checked,
    mermaid_diagrams: document.getElementById('ext-mermaid').checked,
    visual_cards: document.getElementById('ext-visuals').checked,
    practice_quizzes: document.getElementById('ext-quizzes').checked,
    flashcards: document.getElementById('ext-flashcards').checked,
    exam_mix: document.getElementById('ext-exam').checked,
    deadline_tracker: true,
  };
}

function showStatus(text, isError = false) {
  const box = document.getElementById('status-box');
  box.textContent = text;
  box.className = `status-msg ${isError ? 'status-err' : 'status-ok'}`;
}

async function initPopup() {
  const portalInput = document.getElementById('portal-url');
  const stored = await chrome.storage.local.get(['portalUrl']);
  if (stored.portalUrl) {
    portalInput.value = stored.portalUrl;
  }

  portalInput.addEventListener('change', () => {
    const cleaned = (portalInput.value || 'http://127.0.0.1:8000').trim().replace(/\/+$/, '');
    portalInput.value = cleaned;
    chrome.storage.local.set({ portalUrl: cleaned });
  });

  document.getElementById('btn-open-portal').addEventListener('click', () => {
    const portalUrl = (portalInput.value || 'http://127.0.0.1:8000').trim().replace(/\/+$/, '');
    chrome.runtime.sendMessage({ type: 'OPEN_PORTAL_HOME', portalUrl });
  });

  document.getElementById('btn-sync').addEventListener('click', handleSyncClick);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url || !tab.url.startsWith('http')) {
      document.getElementById('course-name').textContent = 'Not a Moodle course tab';
      document.getElementById('course-meta').textContent = 'Navigate to any Moodle course page (course/view.php?id=...) to sync.';
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['extractor.js'],
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (typeof window.__moodleWorkspaceExtract === 'function' ? window.__moodleWorkspaceExtract() : null),
    });

    if (!result || !result.ok) {
      document.getElementById('course-name').textContent = 'Course page not detected';
      document.getElementById('course-meta').textContent = result?.error || 'Open a Moodle course page to sync.';
      return;
    }

    lastExtraction = result;
    const stats = result.stats;
    document.getElementById('course-name').textContent = stats.courseName;
    document.getElementById('course-meta').textContent = `Course ID: ${stats.courseId} • Authority: ${stats.authority.toUpperCase()}`;

    document.getElementById('stat-sections').textContent = stats.sectionsCount;
    document.getElementById('stat-modules').textContent = stats.modulesCount;
    document.getElementById('stat-quizzes').textContent = stats.quizCount;

    document.getElementById('stats-grid').style.display = 'grid';
    document.getElementById('tools-card').style.display = 'block';
    if (stats.quizCount > 0) {
      document.getElementById('shield-note').style.display = 'block';
    }

    document.getElementById('btn-sync').disabled = false;
  } catch (err) {
    document.getElementById('course-name').textContent = 'Cannot inspect this page';
    document.getElementById('course-meta').textContent = err.message;
  }
}

async function handleSyncClick() {
  if (!lastExtraction || !lastExtraction.payload) return;

  const btn = document.getElementById('btn-sync');
  const portalUrl = (document.getElementById('portal-url').value || 'http://127.0.0.1:8000').trim().replace(/\/+$/, '');
  await chrome.storage.local.set({ portalUrl });

  btn.disabled = true;
  btn.textContent = 'Syncing course & running safety filter...';

  const payload = {
    ...lastExtraction.payload,
    tools_config: readToolsSelection(),
  };

  chrome.runtime.sendMessage(
    { type: 'SYNC_COURSE', portalUrl, payload, openWorkspace: true },
    (resp) => {
      btn.disabled = false;
      btn.textContent = '⚡ Sync & Open Workspace';

      if (chrome.runtime.lastError || !resp || !resp.success) {
        showStatus(resp?.error || chrome.runtime.lastError?.message || 'Sync failed.', true);
        return;
      }

      const s = resp.data?.summary || {};
      showStatus(
        `Synced! ${s.new_topics || 0} new, ${s.updated_topics || 0} updated, ${s.unchanged_topics || 0} unchanged, ${s.blocked_exams || 0} quizzes shielded.`
      );
    }
  );
}

document.addEventListener('DOMContentLoaded', initPopup);
