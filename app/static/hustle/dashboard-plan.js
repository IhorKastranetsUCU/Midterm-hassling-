/* The original study-plan composition, backed by the connected course content. */
(() => {
  const {escape:esc,icon}=UI;
  const zone='Europe/Kyiv';
  const format=(date,options)=>new Intl.DateTimeFormat('uk-UA',{timeZone:zone,...options}).format(date);
  const keyFor=date=>format(date,{year:'numeric',month:'2-digit',day:'2-digit'}).split('.').reverse().join('-');
  const today=()=>keyFor(new Date());
  const dateFor=key=>new Date(key+'T12:00:00Z');
  let owner='',day='',plans={},checks={},bundle=null,topic=null,request=0;
  const read=key=>{try{const value=JSON.parse(sessionStorage.getItem(key));return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}};
  function save() {
    if(!owner)return;
    try {sessionStorage.setItem('hustle:plan:'+owner,JSON.stringify({plans,checks,day}));} catch {}
  }
  function setAccount(account) {
    const next=account.owner_id||'';
    if(next===owner&&day)return;
    owner=next;bundle=null;topic=null;
    const saved=read('hustle:plan:'+owner);
    plans=saved.plans&&typeof saved.plans==='object'?saved.plans:{};
    checks=saved.checks&&typeof saved.checks==='object'?saved.checks:{};
    day=days().some(d=>d.key===saved.day)?saved.day:today();
  }
  function days() {
    const start=dateFor(today());
    return Array.from({length:4},(_,offset)=>{const date=new Date(start);date.setUTCDate(start.getUTCDate()+offset);return {key:keyFor(date),date};});
  }
  function render(courses,buttons) {
    HustleSpace.setCourses(courses);
    if(!days().some(d=>d.key===day))day=today();
    const updated=courses.filter(c=>c.updates_pending>0);
    return `<header class="page-heading plan-heading"><h1>Мій план</h1><time data-plan-date datetime="${day}">${esc(format(dateFor(day),{weekday:'long',day:'numeric',month:'long'}))}</time></header>
      ${courses.length?`<div class="plan-toolbar"><div class="week-tabs plan-days" role="group" aria-label="День навчання">${days().map(d=>`<button type="button" data-plan-day="${d.key}" aria-pressed="${d.key===day}" aria-label="${esc(format(d.date,{weekday:'long',day:'numeric',month:'long'}))}"><span>${esc(format(d.date,{weekday:'short'}))}</span><strong>${esc(format(d.date,{day:'numeric'}))}</strong>${d.key===today()?'<i aria-hidden="true"></i>':''}</button>`).join('')}</div><a class="text-button plan-courses-link" href="#courses">Мої курси ${icon('arrow')}</a></div>
      <div data-plan-session><section class="focus-card plan-focus plan-loading" aria-busy="true"><p role="status">Завантажуємо заняття…</p></section></div>
      <div class="plan-bottom"><section class="progress-card plan-progress" data-plan-progress></section><aside class="upcoming-note plan-deadlines" aria-label="Найближчі дедлайни"><div class="note-heading"><h2>Найближче</h2><a class="icon-button" href="#deadlines" aria-label="Усі дедлайни">${icon('arrow')}</a></div><div data-plan-deadlines><p class="muted" role="status">Завантажуємо…</p></div></aside></div>
      <section class="dashboard-updates plan-activity" data-dashboard-activity ${updated.length?'':'hidden'}><div class="dashboard-section-heading"><h2>Оновлення в курсах</h2><span class="updates-count">${updated.length}</span></div><div class="dashboard-update-list">${updated.slice(0,4).map(c=>`<a href="${UI.courseLink(c.course_id)}"><span class="update-dot" aria-hidden="true"></span><span>${esc(c.title)}</span>${icon('arrow')}</a>`).join('')}</div></section>`:
      `<section class="focus-card plan-focus plan-empty"><div><span class="course-context">${icon('courses')}</span><h2>Додай перший курс</h2><div class="page-actions">${buttons}</div></div>${art('h')}</section>`}`;
  }
  function art(initial) {
    return `<div class="focus-art plan-art" aria-hidden="true"><div class="mini-paper"><span>${esc(initial)}</span><i></i><i></i><i></i></div><div class="mini-note">${icon('check')}</div></div>`;
  }
  function tasks() {
    if(!topic||!bundle)return [];
    const id=bundle.course.course_id;
    return [
      topic.flashcards.length&&{id:'cards',title:'Повторити поняття',meta:UI.countLabel(topic.flashcards.length,'картка','картки','карток'),mode:'cards'},
      topic.book_sections.length&&{id:'reading',title:'Опрацювати конспект',meta:'Конспект',href:UI.courseLink(id,'reading',topic.topic_index)},
      topic.quizzes.length&&{id:'quiz',title:'Перевірити себе',meta:UI.countLabel(topic.quizzes.length,'питання','питання','питань'),mode:'quiz'},
      !topic.book_sections.length&&!topic.flashcards.length&&!topic.quizzes.length&&{id:'materials',title:'Переглянути матеріали',meta:'Матеріали теми',href:UI.courseLink(id,'materials')},
    ].filter(Boolean);
  }
  const taskKey=task=>`${day}:${bundle.course.course_id}:${topic.topic_index}:${task.id}`;
  const completed=()=>tasks().filter(task=>checks[taskKey(task)]===true).length;
  function taskList() {
    const list=tasks();
    return `<section class="task-section plan-tasks" aria-labelledby="plan-tasks-title"><div class="section-heading"><h2 id="plan-tasks-title">Завдання</h2><span data-plan-count aria-live="polite">${completed()} / ${list.length}</span></div><div class="task-list">${list.map(task=>{
      const checked=checks[taskKey(task)]===true;
      const label='Відкрити: '+task.title;
      return `<article class="task-row ${checked?'task-done':''}"><button type="button" class="task-check" data-plan-check="${task.id}" aria-pressed="${checked}" aria-label="Виконано: ${esc(task.title)}">${checked?icon('check'):''}</button><div class="task-copy"><h3>${esc(task.title)}</h3><span>${esc(task.meta)}</span></div>${task.href?`<a class="task-open" href="${task.href}" aria-label="${esc(label)}"><span>Відкрити</span>${icon('arrow')}</a>`:`<button type="button" class="task-open" data-plan-open="${task.mode}" aria-label="${esc(label)}"><span>Відкрити</span>${icon('arrow')}</button>`}</article>`;
    }).join('')}</div></section>`;
  }
  function progress(root) {
    const host=root.querySelector('[data-plan-progress]');if(!host)return;
    const total=tasks().length,done=completed(),percent=total?Math.round(done/total*100):0;
    host.hidden=!total;
    host.innerHTML=`<h2>${day===today()?'Сьогодні':esc(format(dateFor(day),{day:'numeric',month:'long'}))}</h2><div class="plan-progress-body"><div class="progress-ring" style="--progress:${percent}%" role="img" aria-label="Позначено виконаними ${done} з ${total} завдань"><div><strong>${percent}<span>%</span></strong></div></div><p><strong>${done} з ${total}</strong><span>завдань виконано</span></p></div>`;
    const counter=root.querySelector('[data-plan-count]');if(counter)counter.textContent=`${done} / ${total}`;
  }
  async function loadSession(root,courses,selection) {
    const host=root.querySelector('[data-plan-session]');if(!host)return;
    const turn=++request;
    bundle=null;topic=null;progress(root);
    const recent=HustleDashboard.getRecent();
    const saved=selection||plans[day]||(day===today()?recent:null)||recent;
    const course=courses.find(c=>String(c.course_id)===String(saved?.courseId))||courses[0];
    host.setAttribute('aria-busy','true');
    host.innerHTML='<section class="focus-card plan-focus plan-loading"><p role="status">Завантажуємо заняття…</p></section>';
    try {
      const result=await UI.api('/api/workspace/courses/'+encodeURIComponent(course.course_id));
      if(!host.isConnected||turn!==request)return;
      bundle=result;
      topic=result.topic_mixes.find(t=>String(t.topic_index)===String(saved?.topicIndex))||result.topic_mixes[0];
      host.removeAttribute('aria-busy');
      if(!topic){host.innerHTML=`<section class="focus-card plan-focus"><div><span class="course-context">${esc(course.title)}</span><h2>Теми ще готуються</h2><a class="primary" href="${UI.courseLink(course.course_id,'materials')}">До матеріалів ${icon('arrow')}</a></div>${art('h')}</section>`;return;}
      plans[day]={courseId:String(course.course_id),topicIndex:String(topic.topic_index),readingKey:recent?`${recent.courseId}:${recent.topicIndex}`:''};save();
      const letter=(course.title.match(/[\p{L}\p{N}]/u)||['h'])[0].toLocaleUpperCase('uk');
      const returning=recent?.courseId===String(course.course_id)&&recent?.topicIndex===String(topic.topic_index);
      const first=tasks().find(task=>task.id==='reading')||tasks()[0];
      const start=first?.href?`<a class="primary" href="${first.href}">${returning?'Продовжити заняття':'Почати заняття'} ${icon('arrow')}</a>`:`<button type="button" class="primary" data-plan-open="${first?.mode||'cards'}">Почати заняття ${icon('arrow')}</button>`;
      host.innerHTML=`<section class="focus-card plan-focus"><div class="plan-focus-copy"><div class="course-context plan-course-context"><span class="course-avatar" aria-hidden="true">${esc(letter)}</span><select data-plan-course aria-label="Курс заняття">${courses.map(c=>`<option value="${c.course_id}" ${c.course_id===course.course_id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></div><h2>${esc(topic.title)}</h2><a class="plan-topic-link" href="${UI.courseLink(course.course_id)}">${icon('courses')} Тема ${result.topic_mixes.indexOf(topic)+1} <span aria-hidden="true">↗</span></a>${start}</div>${art(letter)}</section>${taskList()}`;
      progress(root);
    } catch(error) {
      if(!host.isConnected||turn!==request)return;
      host.removeAttribute('aria-busy');
      host.innerHTML='<section class="plan-load-error" role="alert"><p>Не вдалося завантажити заняття.</p><button class="secondary" data-plan-retry>Повторити ↻</button></section>';
      host.querySelector('button').onclick=()=>loadSession(root,courses,selection);
    }
  }
  function drawDeadlines(host,items,courses) {
    const now=Date.now()/1000;
    const visible=items.filter(item=>Number(item.duedate)>0&&keyFor(new Date(item.duedate*1000))>=day&&(day>today()||item.duedate>=now))
      .sort((a,b)=>a.duedate-b.duedate).slice(0,3);
    host.innerHTML=visible.length?`<ol class="upcoming-items">${visible.map(item=>`<li><time>${esc(HustleSpace.dateLabel(item.duedate))} <span>${esc(format(new Date(item.duedate*1000),{hour:'2-digit',minute:'2-digit'}))}</span></time><a href="#deadlines?course=${item.course_id}">${esc(item.name)}</a><span class="upcoming-course">${esc(courses.find(c=>String(c.course_id)===String(item.course_id))?.title||item.course_name||'')}</span></li>`).join('')}</ol>`:'<div class="note-empty">'+icon('calendar')+'<p>Найближчих дедлайнів немає.</p></div>';
  }
  async function loadDeadlines(root,account,courses,state) {
    const host=root.querySelector('[data-plan-deadlines]');if(!host)return;
    if(!account.moodle_paired){host.innerHTML='<a class="text-button" href="connect.html">Підключити LMS →</a>';return;}
    try {
      const response=await UI.api('/api/assignments');
      if(!host.isConnected)return;
      state.items=(response.assignments||[]).filter(item=>courses.some(c=>c.source_type!=='manual_upload'&&String(c.course_id)===String(item.course_id)));
      drawDeadlines(host,state.items,courses);
    } catch {
      if(!host.isConnected)return;
      host.innerHTML='<p class="note-empty">Не вдалося отримати дедлайни.</p><button class="text-button">Повторити ↻</button>';
      host.querySelector('button').onclick=()=>loadDeadlines(root,account,courses,state);
    }
  }
  function mount(root,account,courses) {
    if(root.dataset.view!=='dashboard'||!courses.length)return;
    const scope=root.querySelector('[data-plan-session]');if(!scope)return;
    const state={items:null};
    const recent=HustleDashboard.getRecent();
    const readingKey=recent?`${recent.courseId}:${recent.topicIndex}`:'';
    loadSession(root,courses,day===today()&&readingKey!==plans[day]?.readingKey?recent:null);
    loadDeadlines(root,account,courses,state);
    root.querySelectorAll('[data-plan-day]').forEach(button=>button.onclick=()=>{
      day=button.dataset.planDay;save();
      root.querySelectorAll('[data-plan-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.planDay===day)));
      const date=root.querySelector('[data-plan-date]');date.dateTime=day;date.textContent=format(dateFor(day),{weekday:'long',day:'numeric',month:'long'});
      loadSession(root,courses);
      if(state.items)drawDeadlines(root.querySelector('[data-plan-deadlines]'),state.items,courses);
    });
    scope.addEventListener('change',event=>{if(event.target.matches('[data-plan-course]'))loadSession(root,courses,{courseId:event.target.value});});
    scope.addEventListener('click',event=>{
      const check=event.target.closest('[data-plan-check]');
      if(check&&topic){const task=tasks().find(t=>t.id===check.dataset.planCheck);if(!task)return;const key=taskKey(task);checks[key]=checks[key]!==true;save();check.setAttribute('aria-pressed',String(checks[key]));check.innerHTML=checks[key]?icon('check'):'';check.closest('.task-row').classList.toggle('task-done',checks[key]);progress(root);}
      const open=event.target.closest('[data-plan-open]');
      if(open&&topic&&bundle){HustleDashboard.remember(topic,bundle.course.course_id);HustleLearning.openTopicPractice(bundle,open.dataset.planOpen,topic.mix_id);}
    });
  }
  window.HustlePlan={setAccount,render,mount};
})();
