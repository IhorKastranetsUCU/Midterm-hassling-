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

  async function extractCoursePayload(toolsConfig = null) {
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

        const modHash = await sha256Hex(`${modname}:${name}:${textExcerpt}`);
        if (modHash) knownHashes.push(modHash);

        modules.push({
          module_id: moduleId,
          name,
          modname,
          url: href,
          text_excerpt: textExcerpt || null,
          file_hashes: modHash ? [modHash] : [],
          quiz_meta: quizMeta,
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

    const payload = {
      authority,
      moodle_url: moodleUrl,
      course_id: courseId,
      course_name: courseName,
      course_shortname: `LMS-${courseId}`,
      sections,
      known_hashes: knownHashes,
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
      },
    };
  }

  window.__moodleWorkspaceExtract = extractCoursePayload;
})();
