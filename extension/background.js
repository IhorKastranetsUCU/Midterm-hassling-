const DEFAULT_PORTAL_URL = 'http://127.0.0.1:8000';

async function getPortalUrl(overrideUrl) {
  if (overrideUrl) return overrideUrl.replace(/\/+$/, '');
  const stored = await chrome.storage.local.get(['portalUrl']);
  return (stored.portalUrl || DEFAULT_PORTAL_URL).replace(/\/+$/, '');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'SYNC_COURSE') {
    (async () => {
      try {
        const portalUrl = await getPortalUrl(message.portalUrl);
        const res = await fetch(`${portalUrl}/api/sync/extension`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          sendResponse({
            success: false,
            error: data.detail || `Server responded HTTP ${res.status}`,
          });
          return;
        }

        if (message.openWorkspace !== false && data.workspace_url) {
          chrome.tabs.create({ url: `${portalUrl}${data.workspace_url}` });
        }

        sendResponse({ success: true, portalUrl, data });
      } catch (err) {
        sendResponse({
          success: false,
          error: `Could not reach Portal API (${err.message}). Make sure the FastAPI server is running.`,
        });
      }
    })();
    return true; // keep message channel open for async response
  }

  if (message.type === 'OPEN_PORTAL_HOME') {
    (async () => {
      const portalUrl = await getPortalUrl(message.portalUrl);
      chrome.tabs.create({ url: portalUrl });
      sendResponse({ success: true });
    })();
    return true;
  }

  return false;
});
