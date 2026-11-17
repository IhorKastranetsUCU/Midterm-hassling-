const DEFAULT_PORTAL_URL = 'http://127.0.0.1:8000';
const ALLOWED_LOCAL_PORTAL_ORIGINS = new Set([
  'http://127.0.0.1:8000',
  'http://localhost:8000',
]);
const SUPPORTED_MOODLE_HOSTS = [
  'learn.ucu.edu.ua',
  'e-learning.lnu.edu.ua',
  'vns.lpnu.ua',
  'dl.nure.ua',
  'do.ipo.kpi.ua',
  'moodle.vntu.edu.ua',
  'school.moodledemo.net',
];
const COOKIE_PAIR_COOLDOWN_MS = 10 * 60 * 1000;
const inFlightPairs = new Map();
const lastTabCheckAt = new Map();

function sanitizePortalUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const u = new URL(rawUrl.trim());
    const origin = `${u.protocol}//${u.host}`.toLowerCase();
    if (ALLOWED_LOCAL_PORTAL_ORIGINS.has(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
      return origin;
    }
    // Remote portals must use HTTPS (never leak MoodleSession over plaintext HTTP)
    if (u.protocol === 'https:' && !u.username && !u.password) {
      return origin;
    }
  } catch (e) {}
  return null;
}

function extractMoodleOrigin(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (SUPPORTED_MOODLE_HOSTS.includes(host) && u.protocol === 'https:') {
      return `https://${host}`;
    }
  } catch (e) {}
  return null;
}

async function hashCookieValue(cookieValue) {
  const bytes = new TextEncoder().encode(String(cookieValue || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function pairMoodleCookie(moodleOrigin, cookieValue, portalUrlOverride, force = false) {
  if (!moodleOrigin || !cookieValue) return { success: false, skipped: true };
  const portalUrl = await getPortalUrl(portalUrlOverride);
  const cookieHash = await hashCookieValue(cookieValue);
  const dedupKey = `${portalUrl}|${moodleOrigin}|${cookieHash}`;

  if (inFlightPairs.has(dedupKey)) {
    return inFlightPairs.get(dedupKey);
  }

  const runPromise = (async () => {
    const cacheStore = await chrome.storage.local.get(['pairedCookieCache']);
    const existingMap = cacheStore.pairedCookieCache || {};
    const cache = existingMap[moodleOrigin];
    const cacheFresh =
      cache &&
      cache.cookieHash === cookieHash &&
      Date.now() - (cache.pairedAt || 0) < COOKIE_PAIR_COOLDOWN_MS;

    // Even inside cooldown, allow explicit SYNC_COURSE to upgrade linkage if google_linked was false
    if (!force && cacheFresh && cache.google_linked) {
      return { success: true, cached: true, moodleOrigin };
    }
    if (!force && cacheFresh && cache._autoAttempted) {
      return { success: true, cached: true, moodleOrigin };
    }

    try {
      const res = await fetch(`${portalUrl}/api/auth/extension-pair`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodle_url: moodleOrigin, cookie: cookieValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.detail || `HTTP ${res.status}` };
      }

      const freshStore = await chrome.storage.local.get(['pairedCookieCache']);
      const nextCache = freshStore.pairedCookieCache || {};
      nextCache[moodleOrigin] = {
        cookieHash,
        pairedAt: Date.now(),
        owner_id: data.owner_id,
        google_linked: Boolean(data.google_linked),
        _autoAttempted: true,
      };
      await chrome.storage.local.set({ pairedCookieCache: nextCache });
      return { success: true, moodleOrigin, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  })().finally(() => {
    inFlightPairs.delete(dedupKey);
  });

  inFlightPairs.set(dedupKey, runPromise);
  return runPromise;
}

async function syncCookieForUrl(tabUrl, portalUrlOverride, force = false) {
  const origin = extractMoodleOrigin(tabUrl);
  if (!origin || !chrome.cookies) return { success: false, error: 'Unsupported URL or cookies API unavailable' };
  try {
    const cookieObj = await chrome.cookies.get({ url: origin, name: 'MoodleSession' });
    if (!cookieObj || !cookieObj.value) {
      return { success: false, error: 'No active MoodleSession cookie found in browser' };
    }
    return await pairMoodleCookie(origin, cookieObj.value, portalUrlOverride, force);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

if (chrome.cookies && chrome.cookies.onChanged) {
  chrome.cookies.onChanged.addListener((changeInfo) => {
    const cookie = changeInfo && changeInfo.cookie;
    if (!cookie || changeInfo.removed || cookie.name !== 'MoodleSession') return;
    const host = (cookie.domain || '').replace(/^\./, '').toLowerCase();
    if (!SUPPORTED_MOODLE_HOSTS.includes(host)) return;
    pairMoodleCookie(`https://${host}`, cookie.value, null, false);
  });
}

if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab || !tab.url) return;
    const origin = extractMoodleOrigin(tab.url);
    if (!origin) return;
    const lastCheck = lastTabCheckAt.get(origin) || 0;
    if (Date.now() - lastCheck < COOKIE_PAIR_COOLDOWN_MS) return;
    lastTabCheckAt.set(origin, Date.now());
    syncCookieForUrl(tab.url, null, false);
  });
}

async function getPortalUrl(overrideUrl) {
  if (overrideUrl) {
    return sanitizePortalUrl(overrideUrl) || DEFAULT_PORTAL_URL;
  }
  const stored = await chrome.storage.local.get(['portalUrl']);
  return sanitizePortalUrl(stored.portalUrl) || DEFAULT_PORTAL_URL;
}

async function resolveWorkspaceHeaders(portalUrl) {
  const headers = { 'Content-Type': 'application/json' };
  const storeData = await chrome.storage.local.get(['workspaceTokens']);
  const tokens = storeData.workspaceTokens || {};
  const cached = tokens[portalUrl];
  if (cached && cached.token && Date.now() - (cached.fetchedAt || 0) < COOKIE_PAIR_COOLDOWN_MS) {
    headers['X-Workspace-Token'] = cached.token;
    return headers;
  }

  try {
    const sessRes = await fetch(`${portalUrl}/api/workspace/session`, {
      method: 'GET',
      credentials: 'include',
    });
    if (sessRes.ok) {
      const sessData = await sessRes.json().catch(() => ({}));
      if (sessData.workspace_token) {
        const legacyStr = typeof cached === 'string' ? cached : null;
        if (sessData.auth_mode === 'new_guest' && (cached?.token || legacyStr)) {
          const existingToken = cached?.token || legacyStr;
          headers['X-Workspace-Token'] = existingToken;
          return headers;
        }
        tokens[portalUrl] = { token: sessData.workspace_token, fetchedAt: Date.now() };
        await chrome.storage.local.set({ workspaceTokens: tokens });
        headers['X-Workspace-Token'] = sessData.workspace_token;
        return headers;
      }
    }
  } catch (e) {}

  const fallbackToken = typeof cached === 'string' ? cached : cached?.token;
  if (fallbackToken) {
    headers['X-Workspace-Token'] = fallbackToken;
  }
  return headers;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'SYNC_COURSE') {
    (async () => {
      try {
        const portalUrl = await getPortalUrl(message.portalUrl);
        const [, headers] = await Promise.all([
          message.payload && message.payload.moodle_url
            ? syncCookieForUrl(message.payload.moodle_url, portalUrl, false).catch(() => {})
            : Promise.resolve(),
          resolveWorkspaceHeaders(portalUrl),
        ]);

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

        if (
          message.openWorkspace !== false &&
          typeof data.workspace_url === 'string' &&
          data.workspace_url.startsWith('/') &&
          !data.workspace_url.startsWith('//')
        ) {
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

  if (message.type === 'PAIR_MOODLE_COOKIE') {
    (async () => {
      const res = await syncCookieForUrl(message.moodleUrl, message.portalUrl, true);
      sendResponse(res);
    })();
    return true;
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
