(function () {
  const BUTTON_ID = 'ai-workspace-floating-sync-btn';
  if (document.getElementById(BUTTON_ID)) return;

  function createFloatingButton() {
    if (typeof window.__moodleWorkspaceExtract !== 'function') return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.textContent = 'До Hustle →';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '22px',
      right: '22px',
      zIndex: '2147483647',
      padding: '10px 16px',
      borderRadius: '12px',
      border: '1px solid #70506c',
      background: '#381b39',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.35)',
      cursor: 'pointer',
      transition: 'transform 0.15s ease, opacity 0.15s ease',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-1px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
    });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Переносимо курс…';

      try {
        const extracted = await window.__moodleWorkspaceExtract();
        if (!extracted || !extracted.ok) {
          btn.textContent = extracted?.error || 'Open a Moodle course page';
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'До Hustle →';
          }, 3000);
          return;
        }

        chrome.runtime.sendMessage(
          { type: 'SYNC_COURSE', payload: extracted.payload, openWorkspace: true },
          (resp) => {
            if (chrome.runtime.lastError || !resp || !resp.success) {
              btn.textContent = 'Sync failed (is server running?)';
            } else {
              const s = resp.data?.summary || {};
              btn.textContent = `✓ Synced (${s.new_topics || 0} new, ${s.updated_topics || 0} upd)`;
            }
            setTimeout(() => {
              btn.disabled = false;
              btn.textContent = 'До Hustle →';
            }, 3500);
          }
        );
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'До Hustle →';
      }
    });

    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }
})();
