/* The working view: each task appears once; the rest of the workspace stays in navigation.
   The earlier dashboard is retained in student-home.js. */
(() => {
  const {escape:esc,icon}=UI;
  const {classify,buckets,dayKey}=HustleStudentHome;
  const clean=value=>HustleCurriculum.text(value);
  const format=(value,options)=>new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',...options}).format(new Date(value));
  const due=item=>Number(item.duedate)||0;
  const key=item=>item.course_id+':'+item.id;
  let active=null,owner='';
  const live=state=>active===state&&state.root.isConnected&&state.root.dataset.view==='dashboard';
  function taskTitle(value){
    const title=clean(value);
    return title.replace(/^Строк\s+(.+?)\s+спливає[.!]?$/iu,'$1').replace(/^(.+?)\s+is due[.!]?$/iu,'$1');
  }
  function agenda(items,now=Date.now()/1000){
    const groups=buckets(items,now),today=dayKey(now*1000);
    const current=groups.upcoming.filter(item=>due(item)&&dayKey(due(item)*1000)===today);
    const later=groups.upcoming.filter(item=>due(item)&&dayKey(due(item)*1000)!==today);
    // Known missing work is explicit; elapsed dates with unknown status are never promoted.
    const priorities=[...groups.late,...current];
    const focus=priorities[0]||later[0]||null;
    return {focus,remaining:priorities.filter(item=>key(item)!==key(focus)),
      later:later.filter(item=>key(item)!==key(focus)&&due(item)<=now+7*86400),
      check:groups.check.filter(item=>due(item)>now-14*86400)};
  }
  const course=(state,item)=>state.courses.find(c=>String(c.course_id)===String(item.course_id));
  function href(state,item){
    const base=UI.safeLink(state.account.moodle_url);
    return base&&Number(item.cmid)>0?new URL('/mod/assign/view.php?id='+Number(item.cmid),base).href:UI.courseLink(item.course_id,'assignments');
  }
  const external=url=>url.startsWith('http')?'target="_blank" rel="noopener noreferrer"':'';
  const dateLabel=item=>HustleSpace.dateLabel(due(item))+' · '+format(due(item)*1000,{hour:'2-digit',minute:'2-digit'});
  function row(state,item){
    const url=href(state,item),late=classify(item)==='late';
    return `<a class="desk-task deadline-surface" href="${esc(url)}" ${external(url)} data-agenda-task="${esc(key(item))}"><span class="desk-task-mark ${late?'is-late':''}" aria-hidden="true">${icon(late?'clock':'files')}</span><span class="desk-task-copy"><strong>${esc(taskTitle(item.name))}</strong><span>${esc(clean(course(state,item)?.title||item.course_name))}</span></span><span class="desk-task-date">${late?'<strong>Не здано</strong>':''}<time>${esc(dateLabel(item))}</time></span><span class="desk-task-open" aria-hidden="true">↗</span>${window.HustleDeadlineVisuals?.edge(due(item)*1000,false) || ''}</a>`;
  }
  function render(courses,buttons){
    HustleSpace.setCourses(courses);
    return `<div class="study-desk"><header class="desk-heading"><h1>Сьогодні</h1><time>${esc(format(Date.now(),{weekday:'long',day:'numeric',month:'long'}))}</time></header>${courses.length?'<div data-desk-agenda><p class="desk-loading" role="status">Завантажуємо завдання…</p></div><div data-desk-resume></div>':`<section class="desk-empty"><h2>Додай перший курс</h2><div class="page-actions">${buttons}</div></section>`}</div>`;
  }
  function draw(state){
    const model=agenda(state.items),item=model.focus,host=state.root.querySelector('[data-desk-agenda]');
    const laterOpen=host.querySelector('.desk-later')?.open||false;
    if(!item){
      host.innerHTML=`<section class="desk-empty"><span class="desk-empty-symbol" aria-hidden="true">${icon('calendar')}</span><h2>${state.account.moodle_paired?'Найближчих завдань немає':'Підключи свої курси'}</h2><a class="secondary" href="${state.account.moodle_paired?'#courses':'connect.html'}">${state.account.moodle_paired?'Обрати курс':'Підключити LMS'} ${icon('arrow')}</a></section>${model.check.length?reviewLink(model.check.length):''}`;
      return;
    }
    state.focusKey=key(item);
    const late=classify(item)==='late',url=href(state,item);
    host.innerHTML=`<section class="desk-priorities" aria-labelledby="desk-priority-title"><div class="desk-section-heading"><h2 id="desk-priority-title">${late?'Потребує уваги':dayKey(due(item)*1000)===dayKey(Date.now())?'Здати сьогодні':'Найближче завдання'}</h2><a href="#deadlines" class="text-button">Усі дедлайни ${icon('arrow')}</a></div><article class="desk-focus deadline-surface ${late?'is-late':''}" data-agenda-task="${esc(key(item))}"><div class="desk-focus-main"><a class="desk-focus-course" href="${UI.courseLink(item.course_id)}">${icon('courses')}${esc(clean(course(state,item)?.title||item.course_name))}</a><h3>${esc(taskTitle(item.name))}</h3><div class="desk-focus-meta">${late?'<span class="desk-missing">Не здано</span>':''}<time>${icon('clock')}${esc(dateLabel(item))}</time></div></div><div class="desk-focus-actions"><a class="primary" href="${esc(url)}" ${external(url)}>Відкрити завдання <span aria-hidden="true">↗</span></a><a class="text-button" href="${UI.courseLink(item.course_id)}" data-desk-related>Матеріали курсу ${icon('arrow')}</a></div>${window.HustleDeadlineVisuals?.edge(due(item)*1000,false) || ''}</article>${model.remaining.length?`<div class="desk-rest"><h3>Також потребують уваги <span>${model.remaining.length}</span></h3>${model.remaining.slice(0,3).map(item=>row(state,item)).join('')}${model.remaining.length>3?`<details class="desk-more"><summary>Ще ${model.remaining.length-3} ${icon('arrow')}</summary>${model.remaining.slice(3).map(item=>row(state,item)).join('')}</details>`:''}</div>`:''}</section>${model.later.length?`<details class="desk-later" ${laterOpen?'open':''}><summary><span>Далі цього тижня <span class="desk-count">${model.later.length}</span></span><span>${esc(HustleSpace.dateLabel(due(model.later[0])))} <i aria-hidden="true">⌄</i></span></summary><div>${model.later.map(item=>row(state,item)).join('')}</div></details>`:''}${model.check.length?reviewLink(model.check.length):''}`;
    window.HustleDeadlineVisuals?.mount(host);
    related(state,item);
  }
  const reviewLink=count=>`<a class="desk-status-link" href="#deadlines?period=past">Статус минулих робіт <span>${count}</span> ${icon('arrow')}</a>`;
  async function related(state,item){
    try{
      const bundle=await UI.api('/api/workspace/courses/'+item.course_id);
      if(!live(state)||state.focusKey!==key(item))return;
      const node=HustleCurriculum.map(bundle).find(n=>n.materials.some(m=>String(m.id)===String(item.cmid)));
      const anchor=state.root.querySelector('[data-desk-related]');
      if(node&&anchor){anchor.href=HustleCurriculum.link(bundle,node);anchor.innerHTML='Матеріали теми '+icon('arrow');}
    }catch{/* The course link remains valid when its map cannot load. */}
  }
  async function resume(state){
    const recent=HustleDashboard.getRecent();if(!recent||!state.courses.some(c=>String(c.course_id)===recent.courseId))return;
    try{
      const bundle=await UI.api('/api/workspace/courses/'+recent.courseId);if(!live(state))return;
      const node=HustleCurriculum.map(bundle).find(n=>String(n.topic_index)===recent.topicIndex&&n.learnable);if(!node)return;
      const parent=HustleCurriculum.find(bundle,node.parent_id);
      const title=['Lecture','Lab'].includes(node.title)?(node.title==='Lecture'?'Лекція':'Практична робота')+(parent?' · '+parent.title.replace(/^Module\s+\d+\.\s*/i,''):''):node.title;
      state.root.querySelector('[data-desk-resume]').innerHTML=`<a class="desk-resume" href="${HustleCurriculum.link(bundle,node)}"><span class="desk-resume-mark" aria-hidden="true">${icon('bookmark')}</span><span><small>Продовжити тему</small><strong>${esc(title)}</strong><span>${esc(clean(bundle.course.title))}</span></span>${icon('arrow')}</a>`;
    }catch{}
  }
  async function load(state){
    try{
      const response=await UI.api('/api/assignments');if(!live(state))return;
      const seen=new Set();state.items=(response.assignments||[]).filter(item=>{if(seen.has(key(item))||!course(state,item))return false;seen.add(key(item));return true;});
      const now=Date.now()/1000,groups=buckets(state.items);
      const relevant=[...groups.upcoming.filter(i=>due(i)&&due(i)<now+14*86400),...groups.check.filter(i=>due(i)>now-14*86400)].slice(0,24);
      // A single draw after status lookup prevents the primary action moving under the pointer.
      if(relevant.length){
        const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3500);
        try{
          const statuses=await UI.api('/api/assignments/submission-status?'+relevant.map(i=>'assignment_ids='+encodeURIComponent(i.id)).join('&'),{signal:controller.signal});
          if(!live(state))return;
          for(const item of state.items)item.submission_status=statuses.statuses?.[item.id]||item.submission_status||'unknown';
        }catch{/* Unknown is a valid state; dates alone do not prove missing work. */}
        finally{clearTimeout(timeout);}
      }
      if(live(state))draw(state);
    }catch(error){
      if(live(state))state.root.querySelector('[data-desk-agenda]').innerHTML=`<section class="desk-empty"><h2>Дедлайни недоступні</h2><p>${esc(error.message)}</p><button class="secondary" data-desk-retry>Спробувати знову ↻</button></section>`;
    }
  }
  function mount(root,account,courses){
    if(root.dataset.view!=='dashboard'||!courses.length)return;
    const state={root,account,courses,items:[]};active=state;
    if(account.moodle_paired)load(state);else draw(state);
    resume(state);
    root.querySelector('.study-desk').addEventListener('click',event=>{if(event.target.closest('[data-desk-retry]'))load(state);});
  }
  window.HustleFocus={agenda,taskTitle};
  window.HustlePlan={setAccount(account){if(owner!==account.owner_id){owner=account.owner_id;active=null;}},render,mount};
})();
