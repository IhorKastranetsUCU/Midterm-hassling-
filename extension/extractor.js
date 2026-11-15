/**
 * Safe in-browser Moodle DOM extractor (runs only in user's already-authenticated tab).
 * Never touches passwords or MoodleSession cookies.
 */
(function () {
  if (window.__moodleWorkspaceExtract) return;

  async function sha256Hex(text) {
    try {
      const enc = new TextEncoder().encode(text || '');
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      return '';
    }
  }

  function cleanNodeText(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.accesshide, .sr-only').forEach((n) => n.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function detectCourseId() {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam && /^\d+$/.test(idParam)) return parseInt(idParam, 10);

    const bodyClassMatch = (document.body.className || '').match(/\bcourse-(\d+)\b/);
    if (bodyClassMatch) return parseInt(bodyClassMatch[1], 10);
    return null;
  }

  function detectAuthoritySlug(hostname) {
    const host = (hostname || '').toLowerCase();
    if (host.includes('ucu.edu.ua')) return 'ucu';
    if (host.includes('lnu.edu.ua')) return 'lnu';
    if (host.includes('lpnu.ua')) return 'lpnu';
    if (host.includes('nure.ua')) return 'nure';
    if (host.includes('kpi.ua')) return 'kpi';
    if (host.includes('vntu.edu.ua')) return 'vntu';
    if (host.includes('moodledemo.net')) return 'demo';
    return 'custom';
  }

  const _DEEP_SESSION_CACHE = new Map();
  const _DEEP_SAFE_MODS = new Set(['page', 'book', 'folder', 'assign', 'resource']);
  const _RESTRICTED_HINTS = ['іспит', 'екзамен', 'контрольн', 'модульн', 'midterm', 'final', 'exam'];

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    const parts = [];
    for (let i = 0; i < bytes.length; i += chunk) {
      parts.push(String.fromCharCode(...bytes.subarray(i, i + chunk)));
    }
    return btoa(parts.join(''));
  }

  function extractCleanMainText(doc) {
    if (!doc) return '';
    const clone = (
      doc.querySelector('.book_content, #region-main .generalbox, [role="main"] .no-overflow, #region-main') ||
      doc.body
    )?.cloneNode(true);
    if (!clone) return '';
    clone
      .querySelectorAll('nav, header, footer, script, style, .activity-navigation, .modified, .accesshide, .sr-only')
      .forEach((n) => n.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 15000);
  }

  function guessFilenameFromUrl(urlStr, contentDisp) {
    if (contentDisp) {
      const m = contentDisp.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      if (m && m[1]) return decodeURIComponent(m[1].trim());
    }
    try {
      const u = new URL(urlStr, window.location.origin);
      const last = u.pathname.split('/').filter(Boolean).pop() || '';
      if (/\.(pdf|pptx|docx|txt|md|html?)$/i.test(last)) return decodeURIComponent(last);
    } catch (e) {}
    return '';
  }

  async function fetchWithTimeout(url, timeoutMs = 3500) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { credentials: 'include', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchSafeModuleDetail(mod, maxBytes = 1500000) {
    const { moduleId, modname, name, href, textExcerpt } = mod;
    if (!href || modname === 'quiz' || !_DEEP_SAFE_MODS.has(modname)) return null;
    const lowerName = (name || '').toLowerCase();
    if (_RESTRICTED_HINTS.some((kw) => lowerName.includes(kw))) return null;

    let targetOrigin = '';
    try {
      targetOrigin = new URL(href, window.location.origin).origin;
    } catch (e) {
      return null;
    }
    if (targetOrigin !== window.location.origin) return null;

    const cacheKey = `${moduleId}:${href}:${textExcerpt || ''}`;
    if (_DEEP_SESSION_CACHE.has(cacheKey)) {
      return _DEEP_SESSION_CACHE.get(cacheKey);
    }

    try {
      const resp = await fetchWithTimeout(href, 3500);
      if (!resp || !resp.ok) return null;

      const cType = (resp.headers.get('content-type') || '').toLowerCase();
      const cDisp = resp.headers.get('content-disposition') || '';
      const finalUrl = resp.url || href;
      const result = { extraText: '', attachmentFilename: null, attachmentBase64: null };

      if (cType.includes('text/html') || modname === 'page' || modname === 'book' || modname === 'folder' || modname === 'assign') {
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (modname === 'resource') {
          const pluginLink = doc.querySelector('.resourceworkaround a[href*="pluginfile.php"], #region-main a[href*="pluginfile.php"]');
          if (pluginLink && pluginLink.href && new URL(pluginLink.href, window.location.origin).origin === window.location.origin) {
            const subResp = await fetchWithTimeout(pluginLink.href, 4000);
            if (subResp && subResp.ok) {
              const subType = (subResp.headers.get('content-type') || '').toLowerCase();
              const subDisp = subResp.headers.get('content-disposition') || '';
              const buf = await subResp.arrayBuffer();
              if (buf.byteLength > 0 && buf.byteLength <= maxBytes) {
                const fname = guessFilenameFromUrl(subResp.url || pluginLink.href, subDisp) || `${name}.pdf`;
                if (subType.includes('text/plain') || /\.(txt|md)$/i.test(fname)) {
                  result.extraText = new TextDecoder().decode(buf).slice(0, 15000);
                } else if (subType.includes('pdf') || /\.(pdf|docx|pptx)$/i.test(fname)) {
                  result.attachmentFilename = fname;
                  result.attachmentBase64 = arrayBufferToBase64(buf);
                }
              }
            }
          }
        }
        if (!result.extraText && !result.attachmentBase64) {
          result.extraText = extractCleanMainText(doc);
        }
      } else if (cType.includes('text/plain') || /\.(txt|md)$/i.test(finalUrl)) {
        result.extraText = (await resp.text()).slice(0, 15000);
      } else if (cType.includes('pdf') || /\.(pdf|docx|pptx)$/i.test(finalUrl) || /\.(pdf|docx|pptx)$/i.test(cDisp)) {
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > 0 && buf.byteLength <= maxBytes) {
          result.attachmentFilename = guessFilenameFromUrl(finalUrl, cDisp) || `${name}.pdf`;
          result.attachmentBase64 = arrayBufferToBase64(buf);
        }
      }

      if (result.extraText || result.attachmentBase64) {
        _DEEP_SESSION_CACHE.set(cacheKey, result);
        return result;
      }
    } catch (e) {}
    return null;
  }

  async function extractCoursePayload(toolsConfig = null, options = {}) {
    const deepFetch = Boolean(options.deepFetch);
    const maxDeepModules = options.maxDeepModules || 10;
    const concurrency = options.concurrency || 3;
    const maxBytes = options.maxBytes || 1500000;
    const courseId = detectCourseId();
    const isMoodleDom = Boolean(
      courseId ||
        document.querySelector('.course-content, li.section, #page-course-view-topics, #page-course-view-weeks')
    );

    if (!courseId || !isMoodleDom) {
      return {
        ok: false,
        error: 'Open a Moodle course page (e.g. .../course/view.php?id=...) to sync it.',
      };
    }

    const headingEl =
      document.querySelector('.page-header-headings h1') ||
      document.querySelector('#page-header h1') ||
      document.querySelector('h1');
    const courseName = cleanNodeText(headingEl) || document.title || `Course ${courseId}`;
    const moodleUrl = window.location.origin;
    const authority = detectAuthoritySlug(window.location.hostname);

    const sectionNodes = Array.from(
      document.querySelectorAll('.course-content > ul > li.section, .course-content li.section.main, [data-for="section"]')
    );
    const uniqueSections = sectionNodes.filter((el, idx) => sectionNodes.indexOf(el) === idx);

    const sections = [];
    const knownHashes = [];
    const moduleHashes = {};
    let totalModules = 0;
    let quizCount = 0;

    for (let sIdx = 0; sIdx < uniqueSections.length; sIdx++) {
      const secEl = uniqueSections[sIdx];
      const titleEl =
        secEl.querySelector('.sectionname, h3.sectionname, [data-for="section_title"], h3') ||
        secEl.querySelector('a');
      const secTitle = cleanNodeText(titleEl) || `Section ${sIdx + 1}`;

      const summaryEl = secEl.querySelector('.summarytext, .summary');
      const secSummary = cleanNodeText(summaryEl);

      const actNodes = Array.from(secEl.querySelectorAll('li.activity, .activity-item'));
      const modules = [];

      for (let mIdx = 0; mIdx < actNodes.length; mIdx++) {
        const act = actNodes[mIdx];
        const cls = act.className || '';
        const modTypeMatch = cls.match(/\bmodtype_([a-z0-9_]+)\b/i);
        const linkEl = act.querySelector('a.aalink, .activityname a, a[href*="/mod/"]');
        const href = linkEl ? linkEl.href : null;

        let modname = modTypeMatch ? modTypeMatch[1].toLowerCase() : 'resource';
        if (!modTypeMatch && href) {
          const urlMod = href.match(/\/mod\/([a-z0-9_]+)\//i);
          if (urlMod) modname = urlMod[1].toLowerCase();
        }

        let moduleId = sIdx * 1000 + mIdx + 1;
        const idAttrMatch = (act.id || '').match(/module-(\d+)/);
        if (idAttrMatch) {
          moduleId = parseInt(idAttrMatch[1], 10);
        } else if (href) {
          const urlIdMatch = href.match(/[?&]id=(\d+)/);
          if (urlIdMatch) moduleId = parseInt(urlIdMatch[1], 10);
        }

        const nameEl = act.querySelector('.instancename, .activityname, a.aalink');
        const name = cleanNodeText(nameEl) || `${modname} #${moduleId}`;

        const descEl = act.querySelector('.contentafterlink, .activity-altcontent, .description');
        const textExcerpt = cleanNodeText(descEl);

        let dueAt = null;
        if (modname === 'assign') {
          const dateEl = act.querySelector('.activity-dates, [data-region="activity-dates"]');
          const dateTxt = cleanNodeText(dateEl);
          if (dateTxt) {
            dueAt = dateTxt.slice(0, 120);
          }
        }

        let quizMeta = null;
        if (modname === 'quiz') {
          quizCount++;
          const lowerCardText = (act.textContent || '').toLowerCase();
          quizMeta = {
            name,
            requires_seb: lowerCardText.includes('safe exam browser'),
            // Intentionally leave attempts/timelimit null when absent on course overview
            // so backend fail-closed classifier shields restricted/graded quizzes automatically.
            attempts: null,
            timelimit_seconds: null,
          };
        }

        modules.push({
          module_id: moduleId,
          name,
          modname,
          url: href,
          text_excerpt: textExcerpt || null,
          attachment_filename: null,
          attachment_base64: null,
          due_at: dueAt,
          module_hash: null,
          file_hashes: [],
          quiz_meta: quizMeta,
          _rawHref: href,
          _rawExcerpt: textExcerpt,
        });
        totalModules++;
      }

      sections.push({
        section_index: sIdx,
        title: secTitle,
        summary: secSummary || null,
        modules,
      });
    }

    let deepFetchedCount = 0;
    let attachmentsCount = 0;
    if (deepFetch) {
      const queue = [];
      for (const sec of sections) {
        for (const m of sec.modules) {
          if (m.modname !== 'quiz' && _DEEP_SAFE_MODS.has(m.modname) && m._rawHref) {
            queue.push(m);
            if (queue.length >= maxDeepModules) break;
          }
        }
        if (queue.length >= maxDeepModules) break;
      }

      let cursor = 0;
      async function worker() {
        while (cursor < queue.length) {
          const item = queue[cursor++];
          const detail = await fetchSafeModuleDetail(
            {
              moduleId: item.module_id,
              modname: item.modname,
              name: item.name,
              href: item._rawHref,
              textExcerpt: item._rawExcerpt,
            },
            maxBytes
          );
          if (detail) {
            if (detail.extraText) {
              item.text_excerpt = item.text_excerpt
                ? `${item.text_excerpt}\n\n${detail.extraText}`.slice(0, 16000)
                : detail.extraText;
              deepFetchedCount++;
            }
            if (detail.attachmentBase64) {
              item.attachment_filename = detail.attachmentFilename;
              item.attachment_base64 = detail.attachmentBase64;
              attachmentsCount++;
            }
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, queue.length)) }, () => worker()));
    }

    for (const sec of sections) {
      for (const m of sec.modules) {
        delete m._rawHref;
        delete m._rawExcerpt;
        const attSig = m.attachment_base64 ? await sha256Hex(m.attachment_base64.slice(0, 4096)) : '';
        const modHash = await sha256Hex(
          `${m.modname}:${m.name}:${m.text_excerpt || ''}:${m.attachment_filename || ''}:${m.due_at || ''}:${attSig}`
        );
        if (modHash) {
          m.module_hash = modHash;
          m.file_hashes = [modHash];
          knownHashes.push(modHash);
          moduleHashes[m.module_id] = modHash;
        }
      }
    }

    const payload = {
      authority,
      moodle_url: moodleUrl,
      course_id: courseId,
      course_name: courseName,
      course_shortname: `LMS-${courseId}`,
      sections,
      known_hashes: knownHashes,
      module_hashes: moduleHashes,
      tools_config: toolsConfig || undefined,
    };

    return {
      ok: true,
      payload,
      stats: {
        courseId,
        courseName,
        authority,
        sectionsCount: sections.length,
        modulesCount: totalModules,
        quizCount,
        deepFetchedCount,
        attachmentsCount,
      },
    };
  }

  window.__moodleWorkspaceExtract = extractCoursePayload;
})();
