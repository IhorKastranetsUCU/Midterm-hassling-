/* Deadline first, learning beside it. The earlier dashboards remain available for comparison. */
(() => {
  const {escape:esc,icon}=UI;
  const {classify,buckets,dayKey}=HustleStudentHome;
  const clean=value=>HustleCurriculum.text(value);
  const due=item=>Math.max(0,Number(item.duedate)||0);
  const key=item=>`${item.course_id}:${item.id}`;
  const format=(value,options)=>new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',...options}).format(new Date(value));
  let active=null,owner='',chosenCourse='';
  const live=state=>active===state&&state.root.isConnected&&state.root.dataset.view==='dashboard';
  const external=url=>url.startsWith('http')?'target="_blank" rel="noopener noreferrer"':'';

  function taskTitle(value) {
    return clean(value).replace(/^Строк\s+(.+?)\s+спливає[.!]?$/iu,'$1').replace(/^(.+?)\s+is due[.!]?$/iu,'$1');
  }
  function agenda(items,now=Date.now()/1000) {
    const seen=new Set();
    const unique=items.filter(item=>{if(seen.has(key(item)))return false;seen.add(key(item));return true;});
    const groups=buckets(unique,now);
    // The nearest upcoming deadline leads; confirmed unfinished work stays visible in the queue.
    const focus=groups.upcoming.find(item=>due(item))||groups.late[0]||null;
    const queue=[...groups.late,...groups.upcoming.filter(item=>due(item)&&due(item)<=now+7*86400)]
      .filter(item=>!focus||key(item)!==key(focus));
    return {focus,queue,check:groups.check.filter(item=>due(item)>=now-14*86400)};
  }
  const course=(state,item)=>state.courses.find(c=>String(c.course_id)===String(item.course_id));
  const courseTitle=(state,item)=>clean(course(state,item)?.title||item.course_name);
  function target(state,item) {
    const bundle=state.bundle||state.loadedBundles?.get(String(item.course_id));
    const material=bundle&&HustleCurriculum.map(bundle).flatMap(node=>node.materials||[]).find(material=>String(material.id)===String(item.cmid));
    const source=UI.safeLink(material?.url);if(source)return source;
    const base=UI.safeLink(state.account.moodle_url);
    return base&&Number(item.cmid)>0?new URL('/mod/assign/view.php?id='+Number(item.cmid),base).href:UI.courseLink(item.course_id,'assignments');
  }
  function dueLabel(item) {
    if(!due(item))return 'Без терміну';
    return `${HustleSpace.dateLabel(due(item))} · ${format(due(item)*1000,{hour:'2-digit',minute:'2-digit'})}`;
  }
  function time(item) {
    return `<time datetime="${new Date(due(item)*1000).toISOString()}">${esc(dueLabel(item))}</time>`;
  }
  function taskRow(state,item) {
    const status=classify(item),url=target(state,item);
    return `<a class="today-task ${status==='late'?'is-late':''}" href="${esc(url)}" ${external(url)} data-today-task="${esc(key(item))}">
      <span class="today-task-symbol" aria-hidden="true">${icon(status==='late'?'clock':'files')}</span>
      <span class="today-task-copy"><strong>${esc(taskTitle(item.name))}</strong><span>${esc(courseTitle(state,item))}</span></span>
      <span class="today-task-date">${status==='late'?'<strong>Не здано</strong>':''}${time(item)}</span>
      <span class="today-task-arrow" aria-hidden="true">↗</span>
    </a>`;
  }
  function render(courses,buttons) {
    HustleSpace.setCourses(courses);
    return `<div class="today-dashboard"><header class="today-heading"><h1>Сьогодні</h1><time datetime="${dayKey(Date.now())}">${esc(format(Date.now(),{weekday:'long',day:'numeric',month:'long'}))}</time></header>
      ${courses.length?`<div class="today-grid"><div class="today-main-column"><div data-today-focus><section class="today-focus today-loading" aria-busy="true"><p role="status">Завантажуємо завдання…</p><span class="today-skeleton" aria-hidden="true"></span><span class="today-skeleton short" aria-hidden="true"></span></section></div><section class="today-queue" data-today-queue hidden></section></div><aside class="today-study" data-today-study aria-label="Навчання"><span class="today-study-icon" aria-hidden="true">${icon('bookmark')}</span><h2>До навчання</h2><p role="status">Завантажуємо тему…</p></aside></div><div class="today-review" data-today-review></div>`:
      `<section class="today-focus today-onboarding"><span class="today-empty-icon" aria-hidden="true">${icon('courses')}</span><h2>Додай перший курс</h2><div class="page-actions">${buttons}</div></section>`}
    </div>`;
  }
  function draw(state) {
    const model=agenda(state.items),item=model.focus;
    state.focus=item;
    const host=state.root.querySelector('[data-today-focus]');
    if(item){
      const late=classify(item)==='late',url=target(state,item);
      host.innerHTML=`<article class="today-focus ${late?'is-late':''}" data-today-task="${esc(key(item))}">
        <div class="today-focus-top"><span>${late?'Потребує уваги':'Найближче завдання'}</span><span class="today-deadline">${icon('clock')}${time(item)}</span></div>
        <a class="today-focus-course" href="${UI.courseLink(item.course_id)}">${icon('courses')}<span>${esc(courseTitle(state,item))}</span></a>
        <h2>${esc(taskTitle(item.name))}</h2>
        ${late?'<span class="today-missing">Не здано</span>':''}
        <div class="today-focus-actions"><a class="primary" href="${esc(url)}" ${external(url)}>Відкрити завдання <span aria-hidden="true">↗</span></a><a class="text-button" href="${UI.courseLink(item.course_id)}" data-today-related>Матеріали курсу ${icon('arrow')}</a></div>
      </article>`;
    }else{
      host.innerHTML=`<section class="today-focus today-clear"><span class="today-empty-icon" aria-hidden="true">${icon('calendar')}</span><h2>${state.account.moodle_paired?'Найближчих дедлайнів немає':'Дедлайни з твого Moodle'}</h2>${state.account.moodle_paired?'<a class="text-button" href="#deadlines">Переглянути дедлайни '+icon('arrow')+'</a>':'<a class="primary" href="connect.html">Підключити LMS '+icon('arrow')+'</a>'}</section>`;
    }
    const queue=state.root.querySelector('[data-today-queue]');
    queue.hidden=!model.queue.length;
    queue.innerHTML=model.queue.length?`<div class="today-section-heading"><h2>Далі</h2><a class="text-button" href="#deadlines">Усі дедлайни ${icon('arrow')}</a></div><div class="today-task-list">${model.queue.slice(0,3).map(item=>taskRow(state,item)).join('')}${model.queue.length>3?`<details class="today-more"><summary>Ще ${UI.countLabel(model.queue.length-3,'справа','справи','справ')} <span aria-hidden="true">⌄</span></summary>${model.queue.slice(3).map(item=>taskRow(state,item)).join('')}</details>`:''}</div>`:'';
    const review=state.root.querySelector('[data-today-review]');
    review.innerHTML=model.check.length?`<details><summary><span>Статус минулих робіт <span class="today-review-count">${model.check.length}</span></span><span aria-hidden="true">⌄</span></summary><div class="today-review-content"><p>Moodle ще не передав статус здачі.</p><div class="today-task-list">${model.check.slice(0,5).map(item=>taskRow(state,item)).join('')}</div><a class="text-button" href="#deadlines?period=past">Усі минулі дедлайни ${icon('arrow')}</a></div></details>`:'';
    if(item)related(state,item);
    loadStudy(state);
  }
  function bundleFor(state,id) {
    const idKey=String(id);
    if(!state.bundles.has(idKey))state.bundles.set(idKey,UI.api('/api/workspace/courses/'+encodeURIComponent(id)).then(bundle=>{state.loadedBundles.set(idKey,bundle);return bundle;}));
    return state.bundles.get(idKey);
  }
  function linkedNode(bundle,item) {
    if(!Number(item?.cmid))return null;
    return HustleCurriculum.map(bundle).find(node=>node.materials?.some(material=>String(material.id)===String(item.cmid)))||null;
  }
  async function related(state,item) {
    try{
      const bundle=await bundleFor(state,item.course_id);
      if(!live(state)||key(state.focus)!==key(item))return;
      const node=linkedNode(bundle,item),anchor=state.root.querySelector('[data-today-related]');
      if(node&&anchor){anchor.href=HustleCurriculum.link(bundle,node);anchor.innerHTML='Матеріали теми '+icon('arrow');}
    }catch{/* The original link still opens this course. */}
  }
  function studyTopic(bundle,recent) {
    const nodes=HustleCurriculum.map(bundle);
    if(bundle.course_map){
      const node=nodes.find(node=>node.learnable&&String(node.topic_index)===String(recent.topicIndex));
      if(!node)return null;
      const parent=HustleCurriculum.find(bundle,node.parent_id);
      const title=/^(Lecture|Lab)$/i.test(node.title)?`${node.title.toLowerCase()==='lecture'?'Лекція':'Практична робота'}${parent?' · '+parent.title:''}`:node.title;
      return {title,href:HustleCurriculum.link(bundle,node)};
    }
    // Manual uploads retain their existing reader instead of needing a Moodle course map.
    const topic=bundle.topic_mixes?.find(topic=>String(topic.topic_index)===String(recent.topicIndex));
    return topic?{title:clean(topic.title),href:UI.courseLink(bundle.course.course_id,'reading',topic.topic_index)}:null;
  }
  function studyPicker(state,selected) {
    const host=state.root.querySelector('[data-today-study]');
    host.innerHTML=`<span class="today-study-icon" aria-hidden="true">${icon('courses')}</span><h2>До навчання</h2><label class="today-course-picker">Курс<select data-today-course>${state.courses.map(course=>`<option value="${esc(course.course_id)}" ${String(course.course_id)===String(selected)?'selected':''}>${esc(clean(course.title))}</option>`).join('')}</select></label><a class="today-study-action" href="${UI.courseLink(selected)}" data-today-study-link>Відкрити курс ${icon('arrow')}</a>`;
  }
  async function loadStudy(state) {
    const recent=HustleDashboard.getRecent();
    const current=recent&&state.courses.find(course=>String(course.course_id)===recent.courseId);
    const selected=state.courses.find(course=>String(course.course_id)===chosenCourse)?.course_id||current?.course_id||state.focus?.course_id||state.courses[0].course_id;
    studyPicker(state,selected);
    if(chosenCourse)return;
    const turn=++state.studyTurn;
    try{
      let bundle,topic,label='Продовжити навчання',action='Продовжити';
      if(current){bundle=await bundleFor(state,current.course_id);topic=studyTopic(bundle,recent);}
      if(!topic&&state.focus){
        bundle=await bundleFor(state,state.focus.course_id);
        const node=linkedNode(bundle,state.focus);
        if(node?.learnable){topic={title:node.title,href:HustleCurriculum.link(bundle,node)};label='До цього завдання';action='Відкрити тему';}
      }
      if(!live(state)||turn!==state.studyTurn||chosenCourse||!topic)return;
      state.root.querySelector('[data-today-study]').innerHTML=`<span class="today-study-icon" aria-hidden="true">${icon('bookmark')}</span><h2>${label}</h2><a class="today-study-course" href="${UI.courseLink(bundle.course.course_id)}">${esc(clean(bundle.course.title))}</a><h3>${esc(topic.title)}</h3><a class="today-study-action" href="${esc(topic.href)}">${action} ${icon('arrow')}</a>`;
    }catch{/* The course picker stays available if a saved topic cannot be read. */}
  }
  async function load(state) {
    const turn=++state.loadTurn;
    const host=state.root.querySelector('[data-today-focus]');
    host.setAttribute('aria-busy','true');
    const retry=host.querySelector('[data-today-retry]');if(retry){retry.disabled=true;retry.textContent='Завантажуємо…';}
    try{
      const items=await fetchAssignments(state.courses);
      if(!live(state)||turn!==state.loadTurn)return;
      const model=agenda(items),visible=[model.focus,...model.queue,...model.check.slice(0,5)].filter(Boolean);
      await Promise.allSettled([...new Set(visible.map(item=>item.course_id))].map(id=>bundleFor(state,id)));
      if(!live(state)||turn!==state.loadTurn)return;
      state.items=items;draw(state);
    }catch(error){
      if(!live(state)||turn!==state.loadTurn)return;
      host.innerHTML=`<section class="today-focus today-clear"><span class="today-empty-icon" aria-hidden="true">${icon('calendar')}</span><h2>Не вдалося завантажити дедлайни</h2><button class="secondary" data-today-retry>Спробувати знову ${icon('arrow')}</button></section>`;
      loadStudy(state);
    }finally{if(live(state)&&turn===state.loadTurn)host.removeAttribute('aria-busy');}
  }
  async function fetchAssignments(courses,courseId) {
    const response=await UI.api('/api/assignments'+(courseId?'?course_id='+encodeURIComponent(courseId):''));
    const items=(response.assignments||[]).filter(item=>courses.some(course=>String(course.course_id)===String(item.course_id)));
    const now=Date.now()/1000,groups=buckets(items,now);
    const candidates=[...groups.upcoming.filter(item=>due(item)&&due(item)<=now+14*86400),...groups.late,...groups.check.filter(item=>due(item)>=now-14*86400)];
    const relevant=[...new Set(candidates.map(item=>item.id))].slice(0,24);
    if(relevant.length){
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3500);
      try{
        const status=await UI.api('/api/assignments/submission-status?'+relevant.map(id=>'assignment_ids='+encodeURIComponent(id)).join('&'),{signal:controller.signal});
        for(const item of items)item.submission_status=status.statuses?.[item.id]||item.submission_status||'unknown';
      }catch{/* Unknown is a valid state, never a fabricated overdue warning. */}
      finally{clearTimeout(timeout);}
    }
    return items;
  }
  function mount(root,account,courses) {
    if(root.dataset.view!=='dashboard'||!courses.length)return;
    const state={root,account,courses,items:[],focus:null,bundles:new Map(),loadedBundles:new Map(),loadTurn:0,studyTurn:0};active=state;
    loadStudy(state);
    if(account.moodle_paired)load(state);else draw(state);
    root.querySelector('.today-dashboard').addEventListener('click',event=>{if(event.target.closest('[data-today-retry]'))load(state);});
    root.querySelector('.today-dashboard').addEventListener('change',event=>{
      if(!event.target.matches('[data-today-course]'))return;
      chosenCourse=event.target.value;state.studyTurn++;
      root.querySelector('[data-today-study-link]').href=UI.courseLink(chosenCourse);
    });
  }
  window.HustleToday={agenda,taskTitle,studyTopic,fetchAssignments,linkedNode,target,dueLabel,taskRow};
  window.HustlePlan={setAccount(account){const next=account.owner_id||'';if(next!==owner){owner=next;active=null;chosenCourse='';}},render,mount};
})();
