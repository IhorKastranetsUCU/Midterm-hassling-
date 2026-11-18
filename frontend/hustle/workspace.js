(() => {
  const {escape: esc, icon} = UI;
  const main = document.querySelector('#workspace-main');
  const dialog = document.querySelector('#study-dialog');
  const body = document.querySelector('#dialog-body');
  const close = document.querySelector('[data-close-dialog]');
  document.querySelector('.skip-link').onclick=event=>{event.preventDefault();main.focus();};
  const nav = [['dashboard','Дашборд','dashboard'],['courses','Мої курси','courses'],['calendar','Календар','calendar'],['deadlines','Дедлайни','clock'],['settings','Налаштування','settings']];
  let account, courses = [], currentBundle, generation = 0, busy = false, importState, courseQuery='';
  let stream, refreshAvailable = false;

  const scrolls = new Map(); let lastHash = '';
  document.querySelector('#workspace-nav').innerHTML = nav.map(([id,label,svg]) => `<a href="#${id}" data-nav="${id}">${icon(svg)}<span>${label}</span></a>`).join('');
  close.innerHTML = icon('close'); close.onclick = () => { if (!busy) dialog.close(); };
  dialog.addEventListener('cancel',event => { if(busy)event.preventDefault(); });
  const menu = document.querySelector('#menu-toggle'), shade = document.querySelector('.sidebar-shade'), sidebar = document.querySelector('.sidebar');
  menu.innerHTML = icon('menu');
  function menuState(open) { document.body.classList.toggle('menu-open',open); menu.setAttribute('aria-expanded',String(open)); shade.hidden = !open; sidebar.inert = matchMedia('(max-width:52rem)').matches && !open; }
  menu.onclick = () => {menuState(!document.body.classList.contains('menu-open'));if(document.body.classList.contains('menu-open'))sidebar.querySelector('[aria-current=page]')?.focus();};
  shade.onclick = () => { menuState(false); menu.focus(); };
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape' && document.body.classList.contains('menu-open')) { menuState(false); menu.focus(); }
    if(event.key === 'Tab' && document.body.classList.contains('menu-open')) {
      const links = [...sidebar.querySelectorAll('a,button')], first = links[0], last = links.at(-1);
      if(event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
    }
  });
  matchMedia('(max-width:52rem)').addEventListener('change', () => menuState(false)); menuState(false);
  const heading = (title, action='') => `<div class="page-heading"><h1>${esc(title)}</h1><div class="page-actions">${action}</div></div>`;
  const courseListUrl = location.pathname.endsWith('/tools.html') ? '/api/workspace/courses?moodle_only=true' : '/api/workspace/courses';
  const addButtons = '<button class="secondary" data-add>Додати файли</button><button class="primary" data-connect>Додати з Moodle +</button>';
  const errorMarkup = message => `<div role="alert" class="live-error">${esc(message)} <button class="text-button" data-retry>Спробувати знову</button></div>`;
  function showDialog(title,content) { body.innerHTML = `<h2 id="dialog-title">${esc(title)}</h2>${content}<p id="dialog-error" class="field-error" role="alert" hidden></p>`; if(!dialog.open)dialog.showModal(); }
  function setBusy(value) { busy = value; close.disabled=value; dialog.setAttribute('aria-busy',String(value)); }
  function fail(error) { const el=body.querySelector('#dialog-error'); if(el) {el.textContent=error.message;el.hidden=false;} }
  function refreshNotice() {
    const notice=document.querySelector('#workspace-update');
    notice.hidden=!refreshAvailable;
  }
  function connectEvents() {
    if(stream || !window.EventSource)return;
    stream=new EventSource('/api/workspace/events/stream');
    for(const name of ['workspace.synced','topic.update_available','mix.ready'])stream.addEventListener(name,()=>{refreshAvailable=true;refreshNotice();});
    // EventSource reconnects without discarding the current page or unsaved inputs.
    window.addEventListener('pagehide',()=>stream?.close(),{once:true});
  }
  function compactCourseHeader() {
    const search = main.querySelector('[data-course-search]');
    if (!search) return;
    const toolbar = search.closest('.collection-toolbar');
    const pageHeading = main.querySelector('.page-heading');
    const actions = pageHeading.querySelector('.page-actions');
    if (!actions) return;
    const count = toolbar.querySelector(':scope > .muted');
    pageHeading.classList.add('course-list-heading');
    toolbar.classList.add('course-list-toolbar');
    if (count) pageHeading.append(count);
    toolbar.append(actions);
  }
  async function render({navigate=false}={}) {
    const turn=++generation, route=UI.route(); currentBundle=null;
    if(['materials','practice'].includes(route.view)){history.replaceState(null,'','#courses');return render({navigate});}
    const active=route.courseId ? 'courses' : (nav.some(([key])=>key===route.view)?route.view:'courses');
    main.dataset.view=route.courseId?'course':active;
    document.querySelectorAll('[data-nav]').forEach(a=>a.setAttribute('aria-current',a.dataset.nav===active?'page':'false'));
    document.querySelector('#view-name').textContent=nav.find(([key])=>key===active)?.[1] || 'Курси';
    main.setAttribute('aria-busy','true');main.inert=true;
    if(!main.children.length || navigate)main.innerHTML='<div class="loading-state" role="status">Завантажуємо…</div>';
    try {
      account=await UI.api('/api/auth/status'); if(turn!==generation)return;
      const name=account.fullname || account.email || account.moodle_username || 'Гість';
      document.querySelectorAll('[data-name]').forEach(el=>el.textContent=name);
      document.querySelectorAll('[data-initial]').forEach(el=>el.textContent=name[0]);
      HustleBrand.applyProfile({...account, fullname: name});
      HustleDashboard.setAccount(account);
      HustlePlan.setAccount(account);
      if(!route.courseId&&['calendar','deadlines','settings'].includes(route.view)){
        courses=await UI.api(courseListUrl);if(turn!==generation)return;
        HustleSpace.setCourses(courses);
      }
      let title;
      if(route.courseId) {
        const [bundle,available]=await Promise.all([UI.api(`/api/workspace/courses/${route.courseId}`),UI.api(courseListUrl).catch(()=>courses)]); if(turn!==generation)return;
        courses=available;
        currentBundle=bundle; title=bundle.course.title;
        const back=route.from || 'courses', backLabel=nav.find(([key])=>key===back)?.[1] || 'Курси';
        if(window.HustleSpace)main.innerHTML=HustleSpace.courseHeader(bundle,courses,`<button class="secondary" data-add>Додати матеріали +</button><a class="icon-button course-options" href="${UI.courseLink(route.courseId,'manage')}" aria-label="Параметри курсу" title="Параметри курсу">${icon('settings')}</a>`)+HustleLearning.renderBundle(bundle,route.section);
        else main.innerHTML=`<nav class="breadcrumbs" aria-label="Шлях сторінки"><a href="#${back}">${esc(backLabel)}</a><span aria-hidden="true">/</span><span>${esc(title)}</span></nav>` + heading(title,`<button class="secondary" data-add>Додати матеріали +</button><a class="icon-button course-options" href="${UI.courseLink(route.courseId,'manage')}" aria-label="Параметри курсу" title="Параметри курсу">${icon('settings')}</a>`) + HustleLearning.renderBundle(bundle,route.section);
        HustleCourse.mount(bundle,route.section,account);
      } else if (['new-course','connect'].includes(route.view) && location.pathname.endsWith('/tools.html')) {
        title = 'Додати предмет';
        main.innerHTML = heading(title) + '<section class="settings-card"><button class="primary" data-connect>Обрати курси Moodle →</button></section>';
      } else if(route.view==='dashboard') {
        courses=await UI.api(courseListUrl); if(turn!==generation)return;
        title='Мій план';
        main.innerHTML=HustlePlan.render(courses,addButtons);
      } else if(route.view==='calendar') {
        title='Календар';
        main.innerHTML=window.HustleCalendar ? HustleCalendar.shell(courses) : heading(title);
      } else if(route.view==='settings') {
        title='Налаштування';
        main.innerHTML=heading(title)+`<div data-learning-settings></div><div class="settings-grid"><section class="settings-card"><h2>${esc(name)}</h2><p>${esc(account.email || (account.moodle_paired ? (account.moodle_username ? `@${account.moodle_username}` : `Moodle ID ${account.moodle_user_id}`) : 'Гостьовий простір'))}</p>${!account.google_linked?'<a class="secondary" href="signin.html">Увійти через Google</a>':''}<button class="logout-button" data-logout>${icon('logout')} Вийти</button></section><section class="settings-card"><h2>Moodle</h2><p>${esc(account.moodle_url || 'Не підключено')}</p><div class="page-actions"><button class="primary" data-connect>${account.moodle_paired?'Додати курси':'Підключити LMS'} →</button>${account.moodle_paired?'<a class="text-button" href="connect.html">Перепідключити</a>':''}</div></section><section class="settings-card" data-calendar-settings-summary><h2>Календар і сон</h2><p class="muted">Завантажуємо…</p></section></div><section class="topic-card settings-events"><h2>Останні оновлення</h2><div data-events role="status">Завантажуємо…</div></section>`;
        HustleCourse.events(main.querySelector('[data-events]'));
      } else if(route.view==='deadlines') {
        title='Дедлайни'; main.innerHTML=heading(title)+'<div id="academic-content"></div>';
        HustleCourse.academic(main.querySelector('#academic-content'),null,account,'assignments');
      } else if(['practice','materials'].includes(route.view)) {
        title=nav.find(([key])=>key===route.view)[1];
        const content=await HustleLearning.library(route.view,()=>turn===generation); if(turn!==generation)return;
        main.innerHTML=heading(title)+content;
      } else {
        courses=await UI.api(courseListUrl); if(turn!==generation)return;
        title='Мої курси';
        main.innerHTML=courses.length&&window.HustleSpace?HustleSpace.home(courses,courseQuery,addButtons):heading(title,addButtons)+(courses.length?`<div class="collection-toolbar"><label class="search-field">${icon('search')}<input type="search" data-course-search value="${esc(courseQuery)}" placeholder="Знайти курс" aria-label="Пошук курсів"></label><span class="muted">${UI.countLabel(courses.length,'курс','курси','курсів')}</span></div><div class="course-grid">${courses.map((course,i)=>`<article class="course-card" data-course-searchable="${esc(course.title.toLocaleLowerCase('uk'))}" ${course.title.toLocaleLowerCase('uk').includes(courseQuery)?'':'hidden'}><div class="course-card-top"><span class="course-avatar ${['butter','lilac','blush'][i%3]}">${icon('courses')}</span>${course.updates_pending?'<span class="status-pill">Є оновлення</span>':''}</div><h2><a href="#course/${course.course_id}">${esc(course.title)}</a></h2><div class="course-meta"><span>${UI.countLabel(course.topic_count,'тема','теми','тем')}</span><span>${course.source_type==='manual_upload'?'Власні матеріали':'Moodle'}</span></div><div class="course-shortcuts"><a href="#course/${course.course_id}/materials">Матеріали ${icon('arrow')}</a><a href="#course/${course.course_id}/practice">Практика ${icon('arrow')}</a></div></article>`).join('')}</div><p data-courses-empty hidden>Курсів за цим запитом немає.</p>`:`<section class="connected-empty"><span class="course-avatar butter">${icon('courses')}</span><h2>Додай перший курс</h2><p>Обери курси з Moodle або завантаж власні матеріали.</p></section>`);
      }
      if(turn!==generation)return;
      compactCourseHeader();
      document.title=`${title} — Hustle`; main.removeAttribute('aria-busy');main.inert=false; UI.enhance(main);HustleLearning.afterRender();connectEvents();
      if(window.HustleSpace){HustleSpace.preview(main.querySelector('[data-agenda-preview]'),account);HustleSpace.preview(main.querySelector('[data-course-agenda]'),account,route.courseId);}
      HustleDashboard.loadActivity(main.querySelector('[data-dashboard-activity]'),courses);
      HustlePlan.mount(main,account,courses);
      window.HustleLearningHub?.mount(main,account,currentBundle);
      window.HustleCalendar?.mount(main,account,courses);
      window.HustleFrame?.mount(main,account,courses,currentBundle);
      window.HustleDeadlineVisuals?.mount(main);
      if(navigate) {main.focus({preventScroll:true});window.scrollTo(0,scrolls.get(location.hash)||0);}
      if(route.view==='connect')await showConnect();
    } catch(err) {if(turn===generation){main.innerHTML=errorMarkup(err.message);main.removeAttribute('aria-busy');main.inert=false;}}
  }
  const importPill = document.querySelector('#workspace-importing');
  let batch = null;
  function renderImportPill() {
    importPill.hidden = !batch || (dialog.open && body.contains(picker.element)) || (!batch.running && !batch.failures.size);
    if (batch) importPill.textContent = batch.running
      ? `Додаємо курси · ${batch.done.size}/${batch.chosen.length}`
      : `Не додано курсів: ${batch.failures.size} ↻`;
  }
  const picker = createMoodlePicker({
    courseListUrl,
    onProgress(job) { batch = job; renderImportPill(); },
    onImported() { if (UI.route().view === 'courses') render(); },
    onLeave() { dialog.close(); if (!batch?.running) location.hash = 'courses'; },
  });
  function showConnect() {
    if (window.frameElement && parent.Hustle?.workspace) { parent.location.hash = 'connect'; return; }
    if (!account?.moodle_paired) { window.top.location.assign('/hustle/connect.html'); return; }
    showDialog('Додати з Moodle', '');
    body.querySelector('h2').after(picker.element);
    picker.load();
    renderImportPill();
  }
  dialog.addEventListener('close', renderImportPill);
  function showImport() {
    const bundle=currentBundle;
    importState={bundle,courseId:bundle?.course.course_id,completed:new Set(),textDone:false,youtubeDone:false};
    showDialog(bundle?'Додати до курсу':'Новий курс',`<form class="import-form" id="import-form">${bundle?`<p class="muted">${esc(bundle.course.title)}</p>`:'<label>Назва курсу<input name="title" required maxlength="180"></label>'}<label class="file-drop">${icon('files')}<span>Обрати файли</span><input type="file" name="files" multiple accept=".pdf,.txt,.md,.docx,.pptx,.html,.csv,.json"></label><label>Або посилання на YouTube<input type="url" name="youtube_url" placeholder="https://www.youtube.com/watch?v=..."></label><label>Або текст<textarea name="content" placeholder="Встав матеріал лекції"></textarea></label><label>Назва матеріалу<input name="topic" placeholder="Наприклад, лекція 4"></label>${!bundle?'<fieldset class="import-tools"><legend>Практика</legend><label><input type="checkbox" name="cards" checked> Картки</label><label><input type="checkbox" name="quiz" checked> Самоперевірка</label></fieldset>':''}<div data-upload-results role="status"></div><button class="primary" type="submit">${bundle?'Додати матеріали':'Створити курс'} →</button></form>`);
  }
  main.addEventListener('input',event=>{if(!event.target.matches('[data-course-search]'))return;const term=event.target.value.trim().toLocaleLowerCase('uk');courseQuery=term;const rows=[...main.querySelectorAll('[data-course-searchable]')];rows.forEach(row=>row.hidden=!row.dataset.courseSearchable.includes(term));main.querySelector('[data-courses-empty]').hidden=rows.some(row=>!row.hidden);});
  main.addEventListener('click',async event=>{
    if(event.target.closest('[data-add]'))showImport();
    if(event.target.closest('[data-connect]'))showConnect();
    if(event.target.closest('[data-retry]'))render();
    const logout=event.target.closest('[data-logout]');
    if(logout){logout.disabled=true;try{await UI.post('/api/auth/logout',{});window.top.location.assign('/hustle/');}catch(err){UI.toast(err.message);logout.disabled=false;}}
  });
  body.addEventListener('submit',async event=>{
    if(event.target.id!=='import-form')return;event.preventDefault();if(busy)return;
    const form=event.target, state=importState, button=form.querySelector('[type=submit]'), error=body.querySelector('#dialog-error');
    const title=state.bundle?.course.title || form.elements.title.value.trim(), files=[...form.elements.files.files], youtube=form.elements.youtube_url?.value.trim()||'', content=form.elements.content.value.trim();
    if(!files.length&&!content&&!youtube){fail(new Error('Обери файли, встав посилання на YouTube або текст.'));return;}
    const tools=state.bundle?.tools_config || {flashcards:form.elements.cards.checked,practice_quizzes:form.elements.quiz.checked};
    setBusy(true);button.disabled=true;error.hidden=true;let errors=[];
    const fields=[...form.querySelectorAll('input,textarea')];fields.forEach(el=>el.disabled=true);
    for(let i=0;i<files.length;i++) {
      const fileKey=`${files[i].name}|${files[i].size}|${files[i].lastModified}`;
      if(state.completed.has(fileKey))continue;
      form.querySelector('[data-upload-results]').textContent=`Завантажуємо ${i+1} із ${files.length}: ${files[i].name}`;
      const data=new FormData();data.append('file',files[i]);data.append('course_title',title);data.append('tools_json',JSON.stringify(tools));if(state.courseId)data.append('course_id',state.courseId);if(state.bundle)data.append('authority',state.bundle.course.authority);
      try {const result=await UI.api('/api/workspace/courses/upload',{method:'POST',body:data});state.courseId=result.course_id;state.completed.add(fileKey);} catch(err){errors.push(`${files[i].name}: ${err.message}`);}
    }
    if((content||youtube)&&!state.textDone)try {if(youtube)form.querySelector('[data-upload-results]').textContent='Опрацьовуємо YouTube-відео…';const result=await UI.post('/api/workspace/courses/create-text',{title,topic_title:form.elements.topic.value.trim()||(youtube?title:'')||title,content_text:content,youtube_url:youtube||null,course_id:state.courseId,authority:state.bundle?.course.authority||'custom',tools_config:tools});state.courseId=result.course_id;state.textDone=true;}catch(err){errors.push(err.message);}
    setBusy(false);button.disabled=false;fields.forEach(el=>el.disabled=false);
    if(errors.length){form.querySelector('[data-upload-results]').textContent=`Додано: ${state.completed.size+(state.textDone?1:0)}`;button.textContent='Повторити невдалі';fail(new Error(errors.join('\n')));return;}
    dialog.close();const target=UI.courseLink(state.courseId,'materials');if(location.hash===target)render();else location.hash=target;
  });
  importPill.onclick = showConnect;
  document.querySelector('#workspace-update').onclick=()=>{refreshAvailable=false;refreshNotice();render();};
  window.addEventListener('hashchange',()=>{scrolls.set(lastHash,window.scrollY);lastHash=location.hash;menuState(false);render({navigate:true});});
  window.addEventListener('hustle:refresh',()=>render());
  lastHash=location.hash;render();
})();
