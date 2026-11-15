const DEFAULT_PORTAL_URL = 'http://127.0.0.1:8000';

async function getPortalUrl(overrideUrl) {
  if (overrideUrl) return overrideUrl.replace(/\/+$/, '');
  const stored = await chrome.storage.local.get(['portalUrl']);
  return (stored.portalUrl || DEFAULT_PORTAL_URL).replace(/\/+$/, '');
}

async function resolveWorkspaceHeaders(portalUrl) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const sessRes = await fetch(`${portalUrl}/api/workspace/session`, {
      method: 'GET',
      credentials: 'include',
    });
    if (sessRes.ok) {
      const sessData = await sessRes.json().catch(() => ({}));
      if (sessData.workspace_token) {
        if (sessData.auth_mode === 'new_guest') {
          const storeData = await chrome.storage.local.get(['workspaceTokens']);
          const tokens = storeData.workspaceTokens || {};
          if (tokens[portalUrl]) {
            headers['X-Workspace-Token'] = tokens[portalUrl];
            return headers;
          }
          tokens[portalUrl] = sessData.workspace_token;
          await chrome.storage.local.set({ workspaceTokens: tokens });
        }
        headers['X-Workspace-Token'] = sessData.workspace_token;
        return headers;
      }
    }
  } catch (e) {}

  const storeData = await chrome.storage.local.get(['workspaceTokens']);
  const cached = (storeData.workspaceTokens || {})[portalUrl];
  if (cached) {
    headers['X-Workspace-Token'] = cached;
  }
  return headers;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'SYNC_COURSE') {
    (async () => {
      try {
        const portalUrl = await getPortalUrl(message.portalUrl);
        const headers = await resolveWorkspaceHeaders(portalUrl);

        let uploadPayload = message.payload;
        let diffSkipped = 0;
        try {
          const probes = [];
          (message.payload.sections || []).forEach((sec) => {
            (sec.modules || []).forEach((m) => {
              if (m.module_hash) {
                probes.push({
                  module_id: m.module_id,
                  section_index: sec.section_index,
                  module_hash: m.module_hash,
                  modname: m.modname || 'resource',
                  name: m.name || '',
                });
              }
            });
          });
          if (probes.length > 0) {
            const diffRes = await fetch(`${portalUrl}/api/sync/diff`, {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({
                authority: message.payload.authority || 'ucu',
                course_id: message.payload.course_id,
                modules: probes,
              }),
            });
            if (diffRes.ok) {
              const diffData = await diffRes.json();
              const unchangedSet = new Set(diffData.unchanged_module_ids || []);
              diffSkipped = unchangedSet.size;
              if (diffSkipped > 0) {
                uploadPayload = {
                  ...message.payload,
                  sections: (message.payload.sections || []).map((sec) => ({
                    ...sec,
                    modules: (sec.modules || []).map((m) =>
                      unchangedSet.has(m.module_id)
                        ? { ...m, text_excerpt: null, attachment_base64: null }
                        : m
                    ),
                  })),
                };
              }
            }
          }
        } catch (diffErr) {}

        const res = await fetch(`${portalUrl}/api/sync/extension`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(uploadPayload),
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

        sendResponse({ success: true, portalUrl, diffSkipped, data });
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
