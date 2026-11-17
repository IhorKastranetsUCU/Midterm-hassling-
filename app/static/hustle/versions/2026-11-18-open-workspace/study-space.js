/* Course-first navigation and date-grouped study views, using existing APIs. */
(() => {
  const {escape:esc,icon}=UI;
  const zone='Europe/Kyiv', filters=new Map(), readingHistory=new Map();
  let knownCourses=[], assignmentsCache=new Map();
  const format=(date,options)=>new Intl.DateTimeFormat('uk-UA',{timeZone:zone,...options}).format(date);
  const dayKey=seconds=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(seconds*1000));
  const dayNumber=key=>Date.parse(key+'T12:00:00Z')/86400000;
  const due=item=>Number.isFinite(Number(item.duedate))&&Number(item.duedate)>0?Number(item.duedate):0;
  const tone=id=>'tone-'+(Math.abs(Number(id)||0)%4);
  const courseTitle=item=>knownCourses.find(c=>String(c.course_id)===String(item.course_id))?.title||item.course_name||'Курс';
  function dateLabel(seconds,now=Date.now()/1000) {
    if(!seconds)return 'Без дати';
    const distance=dayNumber(dayKey(seconds))-dayNumber(dayKey(now));
    return distance===0?'Сьогодні':distance===1?'Завтра':format(new Date(seconds*1000),{day:'numeric',month:'short',...(dayKey(seconds).slice(0,4)!==dayKey(now).slice(0,4)?{year:'numeric'}:{})});
  }
  function sorted(items,past=false) {return items.slice().sort((a,b)=>past?(due(b)-due(a)):((due(a)||Infinity)-(due(b)||Infinity)));}
  function groupDeadlines(items,period='upcoming',course='',now=Date.now()/1000) {
    const visible=items.filter(item=>(!course||String(item.course_id)===String(course))&&(period==='all'||(period==='past'?due(item)>0&&due(item)<now:!due(item)||due(item)>=now)));
    const groups=new Map();
    for(const item of sorted(visible,period==='past')) {
      const key=due(item)?dayKey(due(item)):'undated';
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(item);
    }
    return [...groups].map(([key,items])=>({key,items}));
  }
  function assignmentLink(item,profile) {
    const base=UI.safeLink(profile?.moodle_url);
    return base&&Number(item.cmid)>0?new URL('/mod/assign/view.php?id='+Number(item.cmid),base).href:null;
  }
  async function assignments(courseId) {
    const key=courseId||'all',cached=assignmentsCache.get(key);
    if(cached&&Date.now()-cached.time<30000)return cached.promise;
    const promise=UI.api('/api/assignments'+(courseId?'?course_id='+encodeURIComponent(courseId):'')).then(data=>data.assignments||[]);
    assignmentsCache.set(key,{time:Date.now(),promise});
    try{return await promise;}catch(error){assignmentsCache.delete(key);throw error;}
  }
  const setCourses=courses=>{knownCourses=courses;};
  const imported=items=>items.filter(item=>knownCourses.some(c=>String(c.course_id)===String(item.course_id)));
  const scopeAssignments=(items,courseId)=>courseId?items.filter(item=>String(item.course_id)===String(courseId)):imported(items);
  const count=(n,forms)=>UI.countLabel(n,...forms);
  function home(courses,query,buttons) {
    courses=courses.map(c=>({...c,title:UI.plain(UI.plain(c.title))}));
    setCourses(courses);
    return `<div class="page-heading course-list-heading"><h1>Мої курси</h1><span class="muted">${courses.length}</span><time class="space-date">${esc(format(new Date(),{weekday:'long',day:'numeric',month:'long'}))}</time></div><div class="collection-toolbar course-list-toolbar"><label class="search-field">${icon('search')}<input type="search" data-course-search value="${esc(query)}" placeholder="Знайти курс" aria-label="Пошук курсів"></label><div class="page-actions">${buttons}</div></div><div class="study-home"><section class="course-shelf" aria-label="Мої курси"><div class="notebook-grid">${courses.map(course=>`<a class="course-notebook ${tone(course.course_id)}" href="#course/${course.course_id}/overview" data-course-searchable="${esc(course.title.toLocaleLowerCase('uk'))}" ${course.title.toLocaleLowerCase('uk').includes(query)?'':'hidden'}><div class="notebook-top"><span class="notebook-mark">${icon('courses')}</span>${course.updates_pending?'<span class="notebook-update"><i></i> Є оновлення</span>':''}</div><h2>${esc(course.title)}</h2><div class="notebook-bottom"><span>${esc(count(course.topic_count,['тема','теми','тем']))}</span><span class="notebook-arrow">${icon('arrow')}</span></div></a>`).join('')}</div><p class="search-empty" data-courses-empty ${courses.some(c=>c.title.toLocaleLowerCase('uk').includes(query))?'hidden':''}>Курсів за цим запитом немає.</p></section><aside class="upcoming-note" data-home-agenda aria-label="Найближчі дедлайни"><div class="note-heading"><h2>Найближче</h2><a href="#deadlines" class="icon-button" aria-label="Усі дедлайни">${icon('arrow')}</a></div><div data-agenda-preview><p class="muted" role="status">Завантажуємо…</p></div></aside></div>`;
  }
  async function preview(target,profile,courseId=null) {
    if(!target)return;
    if(!profile.moodle_paired){target.innerHTML='<p class="note-empty">Дедлайни з Moodle з’являться після підключення.</p><a class="text-button" href="connect.html">Підключити LMS →</a>';return;}
    try {
      let items=await assignments(courseId);if(!target.isConnected)return;
      items=scopeAssignments(items,courseId);
      const upcoming=sorted(items.filter(item=>due(item)>=Date.now()/1000)).slice(0,3);
      target.innerHTML=upcoming.length?`<ol class="upcoming-items">${upcoming.map(item=>`<li><time>${esc(dateLabel(due(item)))} <span>${esc(format(new Date(due(item)*1000),{hour:'2-digit',minute:'2-digit'}))}</span></time><a href="${courseId?'#course/'+courseId+'/assignments':'#deadlines?course='+item.course_id}">${esc(item.name)}</a>${!courseId?`<span class="upcoming-course">${esc(courseTitle(item))}</span>`:''}</li>`).join('')}</ol>`:'<div class="note-empty">'+icon('calendar')+'<p>Найближчих дедлайнів немає.</p></div>';
    }catch(error){if(target.isConnected){target.innerHTML='<p class="note-empty">Не вдалося отримати дедлайни.</p><button class="text-button" data-preview-retry>Повторити ↻</button>';target.querySelector('button').onclick=()=>{assignmentsCache.clear();preview(target,profile,courseId);};}}
  }
  function courseHeader(bundle,courses,actions) {
    setCourses(courses);
    const c=bundle.course_map?{...bundle.course,topic_count:bundle.course_map.nodes.filter(n=>n.learnable).length}:bundle.course;
    c.title=UI.plain(UI.plain(c.title));
    const section=['overview','materials','practice','exam','assignments','grades','manage'].includes(UI.route().section)?UI.route().section:'overview';
    return `<div class="course-location"><a href="#courses" class="back-to-courses">← Мої курси</a>${courses.length>1?`<label class="course-switch"><span class="sr-only">Перейти до іншого курсу</span><select data-course-switch aria-label="Перейти до іншого курсу"><option value="" selected disabled>Змінити курс</option>${courses.map(item=>`<option value="#course/${item.course_id}/${section}" ${item.course_id===c.course_id?'disabled':''}>${esc(UI.plain(UI.plain(item.title)))}</option>`).join('')}</select></label>`:''}</div><header class="course-cover ${tone(c.course_id)}"><span class="course-cover-mark" aria-hidden="true">${icon('courses')}</span><div class="course-cover-copy"><h1>${esc(c.title)}</h1><p>${esc(count(c.topic_count,['тема','теми','тем']))}${c.source_type==='manual_upload'?' · Власні матеріали':' · Moodle'}</p></div><div class="page-actions">${actions}</div></header>`;
  }
  function overview(bundle) {
    const topics=bundle.topic_mixes,id=bundle.course.course_id;
    const cards=topics.reduce((n,t)=>n+t.flashcards.length,0),questions=topics.reduce((n,t)=>n+t.quizzes.length,0);
    const recent=topics.find(t=>String(t.topic_index)===readingHistory.get(String(id)));
    return `<div class="course-study-layout"><section class="topic-collection"><div class="section-heading"><h2>Теми курсу</h2>${recent?`<a class="text-button" href="${UI.courseLink(id,'reading',recent.topic_index)}">Продовжити ${icon('arrow')}</a>`:''}</div><div class="topic-path">${topics.map((topic,i)=>`<a class="topic-entry" href="${UI.courseLink(id,'reading',topic.topic_index)}"><span class="topic-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(topic.title)}</h3><span>${[topic.book_sections.length?'Конспект':'',topic.flashcards.length?count(topic.flashcards.length,['картка','картки','карток']):'',topic.quizzes.length?count(topic.quizzes.length,['питання','питання','питань']):''].filter(Boolean).map(esc).join(' · ')}</span></div>${topic.has_upstream_update?'<i class="update-dot" aria-label="Є оновлення"></i>':''}${icon('arrow')}</a>`).join('')||'<div class="space-empty"><h2>Теми ще готуються</h2><a class="secondary" href="'+UI.courseLink(id,'materials')+'">Переглянути матеріали →</a></div>'}</div></section><aside class="study-companion">${cards||questions?`<section class="practice-note"><span class="practice-note-symbol" aria-hidden="true">${icon('practice')}</span><h2>Практика</h2><p>${[cards?count(cards,['картка','картки','карток']):'',questions?count(questions,['питання','питання','питань']):''].filter(Boolean).map(esc).join(' · ')}</p><a class="primary" href="${UI.courseLink(id,'practice')}">Перевірити себе ${icon('arrow')}</a></section>`:''}${bundle.course.source_type!=='manual_upload'?`<section class="upcoming-note"><div class="note-heading"><h2>Дедлайни</h2><a class="icon-button" href="${UI.courseLink(id,'assignments')}" aria-label="Усі дедлайни курсу">${icon('arrow')}</a></div><div data-course-agenda><p class="muted" role="status">Завантажуємо…</p></div></section>`:''}</aside></div>`;
  }
  function topicActions(topic) {
    const id=UI.route().courseId;
    readingHistory.set(String(id),String(topic.topic_index));
    window.HustleDashboard?.remember(topic,id);
    return `<div class="topic-study-actions"><a class="text-button" href="${UI.courseLink(id,'overview')}">← Усі теми</a><div>${topic.flashcards.length?`<button class="secondary" data-study="cards" data-mix="${esc(topic.mix_id)}">Картки</button>`:''}${topic.quizzes.length?`<button class="secondary" data-study="quiz" data-mix="${esc(topic.mix_id)}">Самоперевірка</button>`:''}</div></div>`;
  }
  function taskMarkup(item,profile,showCourse) {
    const timestamp=due(item),link=assignmentLink(item,profile),date=timestamp?new Date(timestamp*1000):null;
    const course=knownCourses.find(c=>String(c.course_id)===String(item.course_id));
    return `<details class="agenda-task ${tone(item.course_id)}" data-assignment="${esc(item.id)}"><summary><span class="agenda-stamp" aria-hidden="true">${date?`<strong>${esc(format(date,{day:'numeric'}))}</strong><span>${esc(format(date,{month:'short'}))}</span>`:icon('calendar')}</span><div class="agenda-task-title"><h3>${esc(item.name)}</h3>${showCourse?`<span class="agenda-course"><i></i>${esc(courseTitle(item))}</span>`:''}</div><time>${date?esc(format(date,{hour:'2-digit',minute:'2-digit'})):'Без дати'}</time><span class="agenda-chevron" aria-hidden="true">⌄</span></summary><div class="agenda-task-detail">${item.intro?`<p>${esc(UI.plain(item.intro))}</p>`:''}<div class="page-actions">${link?`<a class="primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Відкрити в Moodle ↗</a>`:''}${showCourse&&course?`<a class="text-button" href="#course/${item.course_id}/overview">До курсу →</a>`:''}${!link&&!item.intro?'<p class="muted">Деталей завдання немає.</p>':''}</div></div></details>`;
  }
  async function deadlines(target,courseId,profile) {
    if(!target)return;
    if(!profile.moodle_paired){target.innerHTML='<section class="space-empty"><h2>Дедлайни з Moodle</h2><a class="primary" href="connect.html">Підключити LMS →</a></section>';return;}
    target.innerHTML='<p class="muted" role="status">Завантажуємо дедлайни…</p>';
    try {
      const [raw,courses]=await Promise.all([assignments(courseId),UI.api('/api/workspace/courses')]);
      if(!target.isConnected)return;setCourses(courses);
      const items=scopeAssignments(raw,courseId),key=String(courseId||'all');
      const query=new URLSearchParams(location.hash.split('?')[1]||'').get('course');
      const state={period:'upcoming',course:'',...filters.get(key)};
      const periodQuery=new URLSearchParams(location.hash.split('?')[1]||'').get('period');
      if(['past','all','upcoming'].includes(periodQuery))state.period=periodQuery;
      if(!courseId&&query&&courses.some(c=>String(c.course_id)===query))state.course=query;
      target.innerHTML=`<div class="agenda-toolbar"><div class="agenda-periods" role="group" aria-label="Період дедлайнів">${[['upcoming','Найближчі'],['past','Минулі'],['all','Усі']].map(([value,label])=>`<button type="button" data-agenda-period="${value}" aria-pressed="${state.period===value}">${label}</button>`).join('')}</div>${!courseId?`<label class="compact-select agenda-course-select"><span class="sr-only">Курс</span><select data-agenda-course aria-label="Курс"><option value="">Усі мої курси</option>${courses.map(c=>`<option value="${c.course_id}" ${String(c.course_id)===state.course?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label>`:''}</div><div class="agenda-groups" aria-live="polite"></div>`;
      const draw=()=>{
        filters.set(key,{...state});
        target.querySelectorAll('[data-agenda-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.agendaPeriod===state.period)));
        const groups=groupDeadlines(items,state.period,state.course);
        target.querySelector('.agenda-groups').innerHTML=groups.map(group=>{
          const timestamp=due(group.items[0]),label=timestamp?dateLabel(timestamp):'Без терміну';
          const weekday=timestamp?format(new Date(timestamp*1000),{weekday:'long'}):'';
          return `<section class="agenda-group"><div class="agenda-day-heading"><h2>${esc(label)}</h2><span>${esc(weekday)}</span><span class="agenda-count">${group.items.length}</span></div><div class="agenda-day-tasks">${group.items.map(item=>taskMarkup(item,profile,!courseId)).join('')}</div></section>`;
        }).join('')||`<div class="agenda-empty">${icon('calendar')}<h2>${!courseId&&!courses.length?'Спершу додай курс':'Дедлайнів за цим фільтром немає'}</h2>${!courseId&&!courses.length?'<a class="secondary" href="#courses">До курсів →</a>':state.period!=='all'?'<button class="secondary" data-agenda-reset>Показати всі</button>':''}</div>`;
        target.querySelector('[data-agenda-reset]')?.addEventListener('click',()=>{state.period='all';draw();});
      };
      target.querySelectorAll('[data-agenda-period]').forEach(button=>button.onclick=()=>{state.period=button.dataset.agendaPeriod;draw();});
      target.querySelector('[data-agenda-course]')?.addEventListener('change',event=>{state.course=event.target.value;if(!courseId)history.replaceState(null,'','#deadlines'+(state.course?'?course='+encodeURIComponent(state.course):''));draw();});
      draw();
    }catch(error){if(target.isConnected){target.innerHTML=`<div role="alert" class="live-error">${esc(error.message)} <button class="text-button" data-agenda-retry>Повторити</button></div>`;target.querySelector('button').onclick=()=>{assignmentsCache.clear();deadlines(target,courseId,profile);};}}
  }
  document.querySelector('#workspace-main').addEventListener('change',event=>{if(event.target.matches('[data-course-switch]')&&event.target.value)location.hash=event.target.value;});
  window.addEventListener('hustle:refresh',()=>assignmentsCache.clear());
  window.HustleSpace={home,preview,courseHeader,overview,topicActions,deadlines,setCourses,groupDeadlines,dateLabel,tone,scopeAssignments};
})();
