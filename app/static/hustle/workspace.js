(() => {
  const {escape: esc, icon} = UI;
  const main = document.querySelector('#workspace-main');
  const dialog = document.querySelector('#study-dialog');
  const body = document.querySelector('#dialog-body');
  const close = document.querySelector('[data-close-dialog]');
  document.querySelector('.skip-link').onclick=event=>{event.preventDefault();main.focus();};
  const nav = [['dashboard','Дашборд','dashboard'],['courses','Мої курси','courses'],['deadlines','Дедлайни','calendar'],['settings','Налаштування','settings']];
  let account, courses = [], currentBundle, generation = 0, busy = false, selection, importState, courseQuery='';
  let stream, refreshAvailable = false, connectVersion=0;
  dialog.addEventListener('close',()=>{connectVersion++;});
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
      const name=account.fullname || 'Гість';
      document.querySelectorAll('[data-name]').forEach(el=>el.textContent=name);
      document.querySelectorAll('[data-initial]').forEach(el=>el.textContent=name[0]);
      HustleBrand.applyProfile(account);
      HustleDashboard.setAccount(account);
      HustlePlan.setAccount(account);
      if(!route.courseId&&['deadlines','settings'].includes(route.view)){
        courses=await UI.api('/api/workspace/courses');if(turn!==generation)return;
        HustleSpace.setCourses(courses);
      }
      let title;
      if(route.courseId) {
        const [bundle,available]=await Promise.all([UI.api(`/api/workspace/courses/${route.courseId}`),UI.api('/api/workspace/courses').catch(()=>courses)]); if(turn!==generation)return;
        courses=available;
        currentBundle=bundle; title=bundle.course.title;
        const back=route.from || 'courses', backLabel=nav.find(([key])=>key===back)?.[1] || 'Курси';
        if(window.HustleSpace)main.innerHTML=HustleSpace.courseHeader(bundle,courses,`<button class="secondary" data-add>Додати матеріали +</button><a class="icon-button course-options" href="${UI.courseLink(route.courseId,'manage')}" aria-label="Параметри курсу" title="Параметри курсу">${icon('settings')}</a>`)+HustleLearning.renderBundle(bundle,route.section);
        else main.innerHTML=`<nav class="breadcrumbs" aria-label="Шлях сторінки"><a href="#${back}">${esc(backLabel)}</a><span aria-hidden="true">/</span><span>${esc(title)}</span></nav>` + heading(title,`<button class="secondary" data-add>Додати матеріали +</button><a class="icon-button course-options" href="${UI.courseLink(route.courseId,'manage')}" aria-label="Параметри курсу" title="Параметри курсу">${icon('settings')}</a>`) + HustleLearning.renderBundle(bundle,route.section);
        HustleCourse.mount(bundle,route.section,account);
      } else if(route.view==='dashboard') {
        courses=await UI.api('/api/workspace/courses'); if(turn!==generation)return;
        title='Мій план';
        main.innerHTML=HustlePlan.render(courses,addButtons);
      } else if(route.view==='settings') {
        title='Налаштування';
        main.innerHTML=heading(title)+`<div data-learning-settings></div><div class="settings-grid"><section class="settings-card"><h2>${esc(name)}</h2><p>${esc(account.email || 'Гостьовий простір')}</p>${!account.google_linked?'<a class="secondary" href="signin.html">Увійти через Google</a>':''}<button class="logout-button" data-logout>${icon('logout')} Вийти</button></section><section class="settings-card"><h2>Moodle</h2><p>${esc(account.moodle_url || 'Не підключено')}</p><div class="page-actions"><button class="primary" data-connect>${account.moodle_paired?'Додати курси':'Підключити LMS'} →</button>${account.moodle_paired?'<a class="text-button" href="connect.html">Перепідключити</a>':''}</div></section></div><section class="topic-card settings-events"><h2>Останні оновлення</h2><div data-events role="status">Завантажуємо…</div></section>`;
        HustleCourse.events(main.querySelector('[data-events]'));
      } else if(route.view==='deadlines') {
        title='Дедлайни'; main.innerHTML=heading(title)+'<div id="academic-content"></div>';
        HustleCourse.academic(main.querySelector('#academic-content'),null,account,'assignments');
      } else if(['practice','materials'].includes(route.view)) {
        title=nav.find(([key])=>key===route.view)[1];
        const content=await HustleLearning.library(route.view,()=>turn===generation); if(turn!==generation)return;
        main.innerHTML=heading(title)+content;
      } else {
        courses=await UI.api('/api/workspace/courses'); if(turn!==generation)return;
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
      window.HustleFrame?.mount(main,account,courses,currentBundle);
      if(navigate) {main.focus({preventScroll:true});window.scrollTo(0,scrolls.get(location.hash)||0);}
      if(route.view==='connect')await showConnect();
    } catch(err) {if(turn===generation){main.innerHTML=errorMarkup(err.message);main.removeAttribute('aria-busy');main.inert=false;}}
  }
  function selectionRows() {
    const term=body.querySelector('[data-moodle-search]').value.trim().toLocaleLowerCase('uk');
    for(const row of body.querySelectorAll('[data-moodle-row]'))row.hidden=!row.dataset.search.includes(term);
    body.querySelector('[data-moodle-empty]').hidden=[...body.querySelectorAll('[data-moodle-row]')].some(row=>!row.hidden);
    const count=selection.selected.size;
    const button=body.querySelector('[data-import-moodle]');button.disabled=!count;button.textContent=count?`Додати курси (${count}) →`:'Обери курси';
    const visible=[...body.querySelectorAll('[data-moodle-row]:not([hidden]) input:not(:disabled)')];
    const all=body.querySelector('[data-select-visible]');all.disabled=!visible.length;all.checked=!!visible.length && visible.every(el=>el.checked);all.indeterminate=visible.some(el=>el.checked)&&!all.checked;
  }
  async function showConnect() {
    if(!account?.moodle_paired){location.assign('connect.html');return;}
    const operation=++connectVersion;
    showDialog('Додати з Moodle','<p role="status">Завантажуємо курси…</p>');
    try {
      const [list,added]=await Promise.all([UI.api('/api/courses'),UI.api('/api/workspace/courses')]);
      if(operation!==connectVersion||!dialog.open)return;
      selection={list,added:new Set(added.map(c=>c.course_id)),selected:new Set(),done:new Set(),failures:new Map()};
      showDialog('Додати з Moodle',`<label class="search-field">${icon('search')}<input type="search" data-moodle-search aria-label="Пошук курсів Moodle" placeholder="Знайти курс у Moodle"></label><label class="select-all"><input type="checkbox" data-select-visible> Обрати всі видимі</label><div class="moodle-options">${list.map(c=>`<label class="moodle-option" data-moodle-row data-search="${esc((c.fullname+' '+c.shortname).toLocaleLowerCase('uk'))}"><input type="checkbox" value="${c.id}" data-moodle-choice ${selection.added.has(c.id)?'disabled':''}><span><strong>${esc(c.fullname)}</strong><small>${esc(c.shortname)}</small></span>${selection.added.has(c.id)?'<span class="status-pill">Додано</span>':''}</label>`).join('')}</div><p data-moodle-empty hidden>Нічого не знайдено.</p><div class="dialog-footer"><a class="text-button" href="connect.html">Перепідключити Moodle</a><button class="primary" data-import-moodle disabled>Обери курси</button></div>`);
      selectionRows();
    } catch(err){if(operation!==connectVersion||!dialog.open)return;showDialog('Курси Moodle',errorMarkup(err.message)+'<a class="secondary" href="connect.html">Увійти в Moodle повторно →</a>');}
  }
  async function importMoodle() {
    if(busy || !selection?.selected.size)return;
    setBusy(true);
    const chosen=selection.list.filter(c=>selection.selected.has(c.id));
    showDialog('Додавання курсів',`<div class="batch-progress" role="status" aria-live="polite"></div><div class="batch-list">${chosen.map(c=>`<div class="batch-row" data-batch="${c.id}"><strong>${esc(c.fullname)}</strong><span>Очікує</span></div>`).join('')}</div><div class="dialog-footer" data-batch-footer></div>`);
    for(const course of chosen) {
      const row=body.querySelector(`[data-batch="${course.id}"] span`);
      if(selection.done.has(course.id)){row.textContent='Додано';continue;}
      body.querySelector('.batch-progress').textContent=`${selection.done.size} із ${chosen.length} додано`;
      row.textContent='Отримуємо матеріали…';
      try {
        await UI.post(`/api/workspace/courses/${course.id}/sync-moodle`,{course_title:course.fullname,shortname:course.shortname});
        row.textContent='Групуємо за темами…';
        try {
          const preview=await UI.post('/api/workspace/courses/preview-structure',{course_id:course.id,title:course.fullname,authority:course.authority || 'ucu'});
          if(preview.topics?.length)await UI.post('/api/workspace/courses/confirm-structure',preview);
          row.textContent='Додано';
        } catch {row.textContent='Додано · структуру можна уточнити в курсі';}
        selection.done.add(course.id);selection.failures.delete(course.id);
      } catch(err) {selection.failures.set(course.id,err.message);row.textContent=err.message;row.classList.add('field-error');}
    }
    setBusy(false);
    body.querySelector('.batch-progress').textContent=`Додано ${selection.done.size} із ${chosen.length}`;
    body.querySelector('[data-batch-footer]').innerHTML=`${selection.failures.size?'<button class="secondary" data-import-moodle>Повторити невдалі</button>':''}<button class="primary" data-import-done>До моїх курсів →</button>`;
  }
  function showImport() {
    const bundle=currentBundle;
    importState={bundle,courseId:bundle?.course.course_id,completed:new Set(),textDone:false};
    showDialog(bundle?'Додати до курсу':'Новий курс',`<form class="import-form" id="import-form">${bundle?`<p class="muted">${esc(bundle.course.title)}</p>`:'<label>Назва курсу<input name="title" required maxlength="180"></label>'}<label class="file-drop">${icon('files')}<span>Обрати файли</span><input type="file" name="files" multiple accept=".pdf,.txt,.md,.docx,.pptx,.html,.csv,.json"></label><label>Або текст<textarea name="content" placeholder="Встав матеріал лекції"></textarea></label><label>Назва матеріалу<input name="topic" placeholder="Наприклад, лекція 4"></label>${!bundle?'<fieldset class="import-tools"><legend>Практика</legend><label><input type="checkbox" name="cards" checked> Картки</label><label><input type="checkbox" name="quiz" checked> Самоперевірка</label></fieldset>':''}<div data-upload-results role="status"></div><button class="primary" type="submit">${bundle?'Додати матеріали':'Створити курс'} →</button></form>`);
  }
  main.addEventListener('input',event=>{if(!event.target.matches('[data-course-search]'))return;const term=event.target.value.trim().toLocaleLowerCase('uk');courseQuery=term;const rows=[...main.querySelectorAll('[data-course-searchable]')];rows.forEach(row=>row.hidden=!row.dataset.courseSearchable.includes(term));main.querySelector('[data-courses-empty]').hidden=rows.some(row=>!row.hidden);});
  main.addEventListener('click',async event=>{
    if(event.target.closest('[data-add]'))showImport();
    if(event.target.closest('[data-connect]'))showConnect();
    if(event.target.closest('[data-retry]'))render();
    const logout=event.target.closest('[data-logout]');
    if(logout){logout.disabled=true;try{await UI.post('/api/auth/logout',{});location.assign('index.html');}catch(err){UI.toast(err.message);logout.disabled=false;}}
  });
  body.addEventListener('input',event=>{if(event.target.matches('[data-moodle-search]'))selectionRows();});
  body.addEventListener('change',event=>{
    if(event.target.matches('[data-select-visible]')) {body.querySelectorAll('[data-moodle-row]:not([hidden]) input:not(:disabled)').forEach(el=>{el.checked=event.target.checked;el.checked?selection.selected.add(Number(el.value)):selection.selected.delete(Number(el.value));});selectionRows();}
    if(event.target.matches('[data-moodle-choice]')) {event.target.checked?selection.selected.add(Number(event.target.value)):selection.selected.delete(Number(event.target.value));selectionRows();}
  });
  body.addEventListener('click',async event=>{
    if(event.target.closest('[data-import-moodle]'))await importMoodle();
    if(event.target.closest('[data-import-done]')) {dialog.close();if(location.hash==='#courses')render();else location.hash='courses';}
    if(event.target.closest('[data-retry]'))showConnect();
  });
  body.addEventListener('submit',async event=>{
    if(event.target.id!=='import-form')return;event.preventDefault();if(busy)return;
    const form=event.target, state=importState, button=form.querySelector('[type=submit]'), error=body.querySelector('#dialog-error');
    const title=state.bundle?.course.title || form.elements.title.value.trim(), files=[...form.elements.files.files], content=form.elements.content.value.trim();
    if(!files.length&&!content){fail(new Error('Обери файли або встав текст.'));return;}
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
    if(content&&!state.textDone)try {const result=await UI.post('/api/workspace/courses/create-text',{title,topic_title:form.elements.topic.value.trim()||title,content_text:content,course_id:state.courseId,authority:state.bundle?.course.authority||'custom',tools_config:tools});state.courseId=result.course_id;state.textDone=true;}catch(err){errors.push(err.message);}
    setBusy(false);button.disabled=false;fields.forEach(el=>el.disabled=false);
    if(errors.length){form.querySelector('[data-upload-results]').textContent=`Додано: ${state.completed.size+(state.textDone?1:0)}`;button.textContent='Повторити невдалі';fail(new Error(errors.join('\n')));return;}
    dialog.close();const target=UI.courseLink(state.courseId,'materials');if(location.hash===target)render();else location.hash=target;
  });
  document.querySelector('#workspace-update').onclick=()=>{refreshAvailable=false;refreshNotice();render();};
  window.addEventListener('hashchange',()=>{scrolls.set(lastHash,window.scrollY);lastHash=location.hash;menuState(false);render({navigate:true});});
  window.addEventListener('hustle:refresh',()=>render());
  lastHash=location.hash;render();
})();
