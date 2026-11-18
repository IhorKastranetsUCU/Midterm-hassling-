/* Next action, honest deadline states, then the course map. No invented mastery. */
(() => {
  const {escape:esc,icon}=UI, zone='Europe/Kyiv';
  const format=(date,options)=>new Intl.DateTimeFormat('uk-UA',{timeZone:zone,...options}).format(date);
  const dayKey=value=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const clean=value=>HustleCurriculum.text(value);
  const due=item=>Number(item.duedate)>0?Number(item.duedate):0;
  let owner='',selectedDay='',epoch=0,active=null;
  const live=state=>active===state&&state.root.isConnected&&state.root.dataset.view==='dashboard';
  function setAccount(account){if(owner!==account.owner_id){owner=account.owner_id;selectedDay='';active=null;epoch++;}}
  const submitted=item=>['submitted','graded'].includes(item.submission_status);
  function classify(item,now=Date.now()/1000) {
    if(submitted(item))return 'done';
    if(due(item)&&due(item)<now)return Number(item.nosubmissions)!==1&&['new','draft','reopened','not_submitted'].includes(item.submission_status)?'late':'check';
    return 'upcoming';
  }
  function buckets(items,now=Date.now()/1000){
    const groups={late:[],check:[],upcoming:[],done:[]};
    for(const item of items)groups[classify(item,now)].push(item);
    groups.upcoming.sort((a,b)=>(due(a)||Infinity)-(due(b)||Infinity));
    groups.late.sort((a,b)=>due(b)-due(a));groups.check.sort((a,b)=>due(b)-due(a));
    return groups;
  }
  function days() {
    const start=new Date(dayKey(Date.now())+'T12:00:00Z');
    return Array.from({length:7},(_,i)=>{const date=new Date(start);date.setUTCDate(start.getUTCDate()+i);return {date,key:dayKey(date)};});
  }
  const course=(state,item)=>state.courses.find(c=>String(c.course_id)===String(item.course_id));
  function target(state,item){
    const base=UI.safeLink(state.account.moodle_url);
    return base&&Number(item.cmid)>0?new URL('/mod/assign/view.php?id='+Number(item.cmid),base).href:'#course/'+item.course_id+'/assignments';
  }
  const dueLabel=item=>due(item)?HustleSpace.dateLabel(due(item))+' · '+format(new Date(due(item)*1000),{hour:'2-digit',minute:'2-digit'}):'Без терміну';
  function task(state,item) {
    const status=classify(item),href=target(state,item);
    return `<a class="action-task action-task-${status}" href="${esc(href)}" ${href.startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}><span class="action-task-icon" aria-hidden="true">${icon(status==='late'?'clock':'calendar')}</span><div><h3>${esc(clean(item.name))}</h3><span>${esc(clean(course(state,item)?.title||item.course_name))}</span></div><div class="action-task-due"><time>${esc(dueLabel(item))}</time>${status==='late'?'<span class="attention-tag">Не здано</span>':status==='check'?'<span>Статус невідомий</span>':status==='done'?'<span>Здано</span>':''}</div>${icon('arrow')}</a>`;
  }
  function render(courses,buttons) {
    HustleSpace.setCourses(courses);if(!days().some(d=>d.key===selectedDay))selectedDay=dayKey(Date.now());
    return `<div class="student-home"><header class="page-heading student-heading"><div><h1>Сьогодні</h1><time>${esc(format(new Date(),{weekday:'long',day:'numeric',month:'long'}))}</time></div><a class="secondary" href="#courses">Мої курси ${icon('courses')}</a></header>${courses.length?`<div class="action-status" data-action-status role="status"><span>Перевіряємо дедлайни…</span></div><div class="student-priority-layout"><div data-next-action><section class="next-action-card" aria-busy="true"><p role="status">Завантажуємо справи…</p></section></div><aside class="upcoming-note student-queue"><div class="note-heading"><h2>На черзі</h2><a class="icon-button" href="#deadlines" aria-label="Усі дедлайни">${icon('arrow')}</a></div><div data-action-queue></div></aside></div><section class="student-week"><div class="section-heading"><h2>Твій тиждень</h2><a class="text-button" href="#deadlines">Усі дедлайни ${icon('arrow')}</a></div><div class="student-days" role="group" aria-label="День дедлайнів">${days().map(d=>`<button type="button" data-student-day="${d.key}" aria-pressed="${d.key===selectedDay}" aria-label="${esc(format(d.date,{weekday:'long',day:'numeric',month:'long'}))}"><span>${esc(format(d.date,{weekday:'short'}))}</span><strong>${esc(format(d.date,{day:'numeric'}))}</strong><small data-day-count="${d.key}">—</small></button>`).join('')}</div><div data-day-tasks role="region" aria-label="Завдання на обраний день"></div></section><div data-review-tasks></div><section class="student-return"><div class="section-heading"><h2>До навчання</h2><a class="text-button" href="#courses">Усі курси ${icon('arrow')}</a></div><div data-resume-study></div><div class="student-course-links">${courses.slice(0,4).map(c=>`<a class="${HustleSpace.tone(c.course_id)}" href="${UI.courseLink(c.course_id)}"><span class="student-course-icon" aria-hidden="true">${icon('courses')}</span><strong>${esc(clean(c.title))}</strong>${icon('arrow')}</a>`).join('')}</div></section>`:`<section class="next-action-card"><h2>Додай перший курс</h2><div class="page-actions">${buttons}</div></section>`}</div>`;
  }
  function visibleBuckets(state) {
    const groups=buckets(state.items),cutoff=Date.now()/1000-14*86400;
    groups.check=groups.check.filter(item=>due(item)>=cutoff);
    return groups;
  }
  function stats(state) {
    const b=visibleBuckets(state),now=Date.now()/1000;
    const soon=b.upcoming.filter(i=>due(i)&&due(i)<=now+7*86400);
    state.root.querySelector('[data-action-status]').innerHTML=`<span><strong>${soon.length}</strong> ${UI.countLabel(soon.length,'дедлайн','дедлайни','дедлайнів').replace(/^\d+ /,'')} на 7 днів</span>${b.late.length?`<button type="button" data-home-scroll="review" class="action-status-alert"><i aria-hidden="true"></i><strong>${b.late.length}</strong> не здано</button>`:''}${b.check.length?`<button type="button" data-home-scroll="review"><strong>${b.check.length}</strong> перевірити здачу ${icon('arrow')}</button>`:''}`;
    state.root.querySelectorAll('[data-day-count]').forEach(el=>{const count=state.items.filter(i=>due(i)&&dayKey(due(i)*1000)===el.dataset.dayCount&&!submitted(i)).length;el.textContent=count?UI.countLabel(count,'справа','справи','справ'):'';});
  }
  function focus(state) {
    const b=visibleBuckets(state),focus=b.late[0]||b.upcoming.find(i=>due(i));
    state.focusId=focus?.id;
    const host=state.root.querySelector('[data-next-action]');
    if(!focus){host.innerHTML=`<section class="next-action-card next-action-clear"><span class="focus-eyebrow">Під рукою</span><h2>${b.check.length?'Перевір здачу минулих робіт':'Час для навчання'}</h2><div class="page-actions">${b.check.length?'<button class="primary" data-home-scroll="review">Перевірити статус →</button>':'<a class="primary" href="#courses">Обрати тему →</a>'}</div><div class="next-action-art" aria-hidden="true"><span>${icon('courses')}</span><i>${icon('check')}</i></div></section>`;}
    else {
      const late=classify(focus)==='late',href=target(state,focus);
      host.innerHTML=`<section class="next-action-card ${late?'next-action-late':''}"><div class="focus-topline"><span class="focus-eyebrow">${late?'Потребує уваги':'Наступна справа'}</span><time class="focus-date">${esc(dueLabel(focus))}</time></div><a class="focus-course" href="${UI.courseLink(focus.course_id)}">${icon('courses')}${esc(clean(course(state,focus)?.title||focus.course_name))}</a><h2>${esc(clean(focus.name))}</h2><div class="page-actions"><a class="primary" href="${esc(href)}" ${href.startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}>До завдання ${icon('arrow')}</a><a class="text-button" href="${UI.courseLink(focus.course_id)}" data-related-materials>Матеріали курсу</a></div></section>`;
    }
    const queue=b.upcoming.filter(i=>i!==focus&&due(i)).slice(0,3);
    state.root.querySelector('[data-action-queue]').innerHTML=queue.length?`<ol class="upcoming-items">${queue.map(item=>`<li><time>${esc(dueLabel(item))}</time><a href="${esc(target(state,item))}" ${target(state,item).startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}>${esc(clean(item.name))}</a><span>${esc(clean(course(state,item)?.title||item.course_name))}</span></li>`).join('')}</ol>`:'<p class="note-empty">Найближчих дедлайнів немає.</p>';
    if(focus&&state.relatedLoaded!==focus.id){state.relatedLoaded=focus.id;loadRelated(state,focus);}
  }
  async function loadRelated(state,item){
    try{const bundle=await UI.api('/api/workspace/courses/'+item.course_id);if(!live(state)||state.focusId!==item.id)return;
      const node=HustleCurriculum.map(bundle).find(n=>n.materials.some(m=>String(m.id)===String(item.cmid)));
      const anchor=state.root.querySelector('[data-related-materials]');if(node&&anchor){anchor.href=HustleCurriculum.link(bundle,node);anchor.textContent='Матеріали теми';}
    }catch{/* The direct course link remains useful when the bundle is unavailable. */}
  }
  function dayTasks(state) {
    const list=state.items.filter(i=>due(i)&&dayKey(due(i)*1000)===selectedDay).sort((a,b)=>due(a)-due(b));
    state.root.querySelector('[data-day-tasks]').innerHTML=list.length?`<div class="action-task-list">${list.map(i=>task(state,i)).join('')}</div>`:'<div class="student-day-empty">'+icon('calendar')+'<p>На цей день дедлайнів немає.</p><a href="#courses" class="text-button">До навчання →</a></div>';
    state.root.querySelectorAll('[data-student-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studentDay===selectedDay)));
  }
  function review(state) {
    const b=visibleBuckets(state),host=state.root.querySelector('[data-review-tasks]');
    host.innerHTML=`${b.late.length?`<section class="student-attention"><div class="section-heading"><h2>Потребує уваги</h2><span>${b.late.length}</span></div><div class="action-task-list">${b.late.slice(0,5).map(i=>task(state,i)).join('')}</div></section>`:''}${b.check.length?`<details class="student-review"><summary><span>${icon('calendar')} Перевірити здачу</span><span>${b.check.length} <i aria-hidden="true">⌄</i></span></summary><div class="review-content"><p>Moodle ще не передав статус здачі цих робіт.</p><div class="action-task-list">${b.check.slice(0,5).map(i=>task(state,i)).join('')}</div>${b.check.length>5?'<a class="text-button" href="#deadlines?period=past">Усі минулі дедлайни →</a>':''}</div></details>`:''}`;
  }
  async function resume(state) {
    const recent=HustleDashboard.getRecent();if(!recent||!state.courses.some(c=>String(c.course_id)===recent.courseId))return;
    try{const bundle=await UI.api('/api/workspace/courses/'+recent.courseId);if(!live(state))return;
      const node=HustleCurriculum.map(bundle).find(n=>String(n.topic_index)===recent.topicIndex&&n.learnable);if(!node)return;
      state.root.querySelector('[data-resume-study]').innerHTML=`<a class="student-resume" href="${HustleCurriculum.link(bundle,node)}"><span>${icon('bookmark')}</span><div><span>Продовжити</span><h3>${esc(node.title)}</h3></div>${icon('arrow')}</a>`;
    }catch{}
  }
  function draw(state){stats(state);focus(state);dayTasks(state);review(state);}
  async function load(state){
    try{
      const response=await UI.api('/api/assignments');if(!live(state))return;
      const seen=new Set();state.items=(response.assignments||[]).filter(item=>{const key=item.course_id+':'+item.id;if(seen.has(key)||!course(state,item))return false;seen.add(key);return true;});draw(state);
      const b=visibleBuckets(state),now=Date.now()/1000;
      const relevant=[...b.upcoming.filter(i=>due(i)&&due(i)<=now+14*86400),...b.check.filter(i=>due(i)>now-14*86400)].slice(0,24);
      if(relevant.length){
        const statuses=await UI.api('/api/assignments/submission-status?'+relevant.map(i=>'assignment_ids='+encodeURIComponent(i.id)).join('&'));
        if(!live(state))return;
        for(const item of state.items)item.submission_status=statuses.statuses?.[item.id]||item.submission_status||'unknown';
        state.relatedLoaded=false;draw(state);
      }
    }catch(error){
      if(!live(state))return;
      if(state.items)return; // A status failure leaves the explicit unknown state in place.
      state.root.querySelector('[data-action-status]').innerHTML='<span>Дедлайни недоступні</span>';
      state.root.querySelector('[data-next-action]').innerHTML=`<section class="next-action-card"><h2>Не вдалося отримати дедлайни</h2><div class="page-actions"><button class="primary" data-home-retry>Спробувати знову ↻</button><a class="text-button" href="#courses">До курсів →</a></div></section>`;
      state.root.querySelector('[data-day-tasks]').innerHTML='<p class="muted">Дані дедлайнів не завантажено.</p>';
    }
  }
  function mount(root,account,courses){
    if(root.dataset.view!=='dashboard'||!courses.length)return;
    const state={root,account,courses,items:null,epoch:++epoch};active=state;
    if(account.moodle_paired)load(state);else{state.items=[];draw(state);root.querySelector('[data-action-status]').innerHTML='<a class="text-button" href="connect.html">Підключити LMS →</a>';}
    resume(state);
    root.querySelector('.student-home').addEventListener('click',event=>{
      const day=event.target.closest('[data-student-day]');if(day){selectedDay=day.dataset.studentDay;if(state.items)dayTasks(state);}
      const jump=event.target.closest('[data-home-scroll]');if(jump){const target=root.querySelector('[data-review-tasks]');const details=target.querySelector('details');if(details)details.open=true;target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
      if(event.target.closest('[data-home-retry]'))load(state);
    });
  }
  window.HustleStudentHome={classify,buckets,dayKey};
  window.HustlePlan={setAccount,render,mount};
})();
