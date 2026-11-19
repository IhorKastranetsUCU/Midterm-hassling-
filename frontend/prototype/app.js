(() => {
  const H=window.Hustle, courses=H.exampleCourses, esc=H.escape, icon=H.icon;
  if(!H.workspace && !H.liveCalendar?.standalone && !H.requireAccount())return;
  if(!H.workspace && !H.liveCalendar?.standalone && (!H.state.ready||!H.state.courses.length)){location.replace('connect.html');return;}
  const main=document.querySelector('#workspace-main'), dialog=document.querySelector('#study-dialog'), body=document.querySelector('#dialog-body');
  const nav=[['plan','Мій план','plan'],['courses','Курси','courses'],['practice','Практика','practice'],['materials','Матеріали','files'],['settings','Налаштування','settings']];
  let day=0, courseFilter='all', search='', practice, focusId, toastTimer;
  const dates=[['Вт','17','Вівторок, 17 листопада'],['Ср','18','Середа, 18 листопада'],['Чт','19','Четвер, 19 листопада'],['Пт','20','П’ятниця, 20 листопада']];
  const kinds=[['cards','Повторити означення','Картки','practice'],['example','Розібрати приклад','Приклад','courses'],['quiz','Перевірити себе','Мініквіз','plan']];
  const selected=()=>courses.filter(c=>H.state.courses.includes(c.id));
  const currentView=()=>nav.some(n=>n[0]===location.hash.slice(1))?location.hash.slice(1):'plan';
  const taskKey=(c,k)=>`${c.id}:${day}:${k}`;
  const times=()=>H.state.minutes===60?[15,20,25]:H.state.minutes===45?[10,15,20]:[5,10,10];
  function avatar(c){return `<span class="course-avatar ${c.color}">${c.initials}</span>`;}
  function start(c,kind,label='Почати',klass='secondary'){return `<button class="${klass}" data-start="${kind}" data-course="${c.id}" data-focus-id="${c.id}-${kind}-${day}">${label} ${icon('arrow')}</button>`;}
  function heading(title,action=''){return `<div class="page-heading"><h1 tabindex="-1">${title}</h1>${action}</div>`;}
  function toast(message){const el=document.querySelector('.toast');clearTimeout(toastTimer);el.textContent=message;el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,2600);}
  function profile() {
    const name = (H.account ? H.account.name : H.state.name) || 'Студент';
    const avatars = ['owl', 'cat', 'book', 'coffee', 'backpack', 'pencil'];
    let seed = 0;
    for (const letter of name) seed = (Math.imul(seed, 31) + letter.codePointAt(0)) >>> 0;
    const avatar = avatars[seed % avatars.length];
    document.querySelectorAll('[data-name]').forEach(el => el.textContent = name);
    document.querySelectorAll('[data-initial]').forEach(el => {
      if (el.dataset.avatar === avatar) return;
      el.dataset.avatar = avatar;
      el.innerHTML = `<img src="avatars/${avatar}.svg" alt="" width="36" height="36">`;
    });
  }
  document.querySelector('#workspace-nav').innerHTML=nav.filter(([key])=>key!=='materials' && (key!=='practice' || !H.workspace)).map(([key,label,svg])=>`<a href="#${key}" data-nav="${key}">${icon(svg)}<span>${label}</span></a>`).join('');
  document.querySelector('#menu-toggle').innerHTML=icon('menu');document.querySelector('[data-close-dialog]').innerHTML=icon('close');
  function planView(){
    const course=selected()[day%selected().length], done=kinds.filter(([k])=>H.state.completed[taskKey(course,k)]).length;
    const next=kinds.find(([k])=>!H.state.completed[taskKey(course,k)])||kinds[0];
    return heading('Мій план',`<span class="page-date">${dates[day][2]}</span>`)+`
      <div class="plan-layout"><div class="plan-column">
        <div class="week-tabs" role="group" aria-label="День навчання">${dates.map((d,i)=>`<button data-day="${i}" aria-pressed="${day===i}"><span>${d[0]}</span><strong>${d[1]}</strong>${i===0?'<i aria-hidden="true"></i>':''}</button>`).join('')}</div>
        <section class="focus-card"><div><span class="course-context">${avatar(course)} ${course.name}</span><h2>${done===3?'План виконано':course.topic}</h2><span class="duration">${icon('clock')} ${H.state.minutes} хв</span>${start(course,next[0],done===3?'Повторити':'Почати заняття','primary')}</div><div class="focus-art" aria-hidden="true"><div class="mini-paper"><span>${course.initials}</span><i></i><i></i><i></i></div><div class="mini-note">${icon('check')}</div></div></section>
        <section class="task-section"><div class="section-heading"><h2>Завдання</h2><span>${done} / 3</span></div><div class="task-list">${kinds.map(([kind,title,format,svg],i)=>{const checked=!!H.state.completed[taskKey(course,kind)];return `<article class="task-row ${checked?'task-done':''}"><button class="task-check" data-complete="${kind}" data-course="${course.id}" aria-pressed="${checked}" aria-label="${checked?'Позначити невиконаним':'Позначити виконаним'}: ${title}">${checked?icon('check'):''}</button><div class="task-copy"><h3>${title}</h3><span>${format} · ${times()[i]} хв</span></div>${start(course,kind,checked?'Повторити':'Відкрити','task-open')}</article>`;}).join('')}</div></section>
      </div><aside class="plan-aside"><section class="progress-card"><h2>Сьогодні</h2><div class="progress-ring" style="--progress:${done/3*100}%" role="img" aria-label="Виконано ${done} з 3 завдань"><div><strong>${Math.round(done/3*100)}<span>%</span></strong></div></div><p>${done} з 3 завдань виконано</p></section><section class="deadlines-card"><h2>Найближче</h2>${selected().map(c=>`<div class="deadline-row"><span class="deadline-icon">${icon('calendar')}</span><div><strong>${c.deadline}</strong><span>${c.short}</span><time>${c.date}</time></div></div>`).join('')}</section></aside></div>`;
  }
  function coursesView(){return heading('Курси','<a class="secondary" href="connect.html?edit=1">Обрати курси +</a>')+`<div class="course-grid">${selected().map(c=>`<article class="course-card">${avatar(c)}<h2>${c.name}</h2><p>${c.topic}</p><div class="course-meta"><span>${c.materials.length} матеріали</span><span>${Object.keys(H.state.completed).filter(k=>k.startsWith(c.id+':')&&H.state.completed[k]).length} занять завершено</span></div><div class="course-card-actions">${start(c,'cards','Практикувати','primary')}<button class="secondary" data-course-materials="${c.id}">Матеріали</button></div></article>`).join('')}</div>`;}
  function practiceView(){return heading('Практика')+(H.workspace?.courses || []).map(c=>`<a class="oral-practice-entry" href="#course/${c.id}/practice"><strong>${esc(c.name)}</strong><span>Практика за темами →</span></a>`).join('')+(H.paperOral ? '<a class="oral-practice-entry" href="#oral"><strong>Усний захист</strong><span>Обрати курс і тему →</span></a>' : '')+`<div class="practice-list">${selected().map(c=>`<section class="practice-course"><div class="practice-course-heading">${avatar(c)}<div><h2>${c.name}</h2><p>${c.topic}</p></div></div><div class="practice-modes">${kinds.map(([kind,,label,svg],i)=>`<button class="practice-mode" data-start="${kind}" data-course="${c.id}" data-focus-id="${c.id}-${kind}-${day}">${icon(svg)}<strong>${label}</strong><span>${i===0?c.cards.length+' картки':i===1?'1 задача':c.quiz.length+' запитання'}</span>${icon('arrow')}</button>`).join('')}${H.paperOral?.button(c) || ''}</div></section>`).join('')}</div>`;}
  function filteredMaterials(){return selected().flatMap(c=>c.materials.map((m,i)=>({...m,course:c,index:i}))).filter(m=>(courseFilter==='all'||m.course.id===courseFilter)&&(`${m.title} ${m.type} ${m.course.name}`).toLocaleLowerCase('uk').includes(search.toLocaleLowerCase('uk')));}
  function materialsList(){const items=filteredMaterials();return items.length?items.map(m=>{const id=`${m.course.id}:${m.index}`,saved=H.state.bookmarks.includes(id);return `<article class="material-row"><span class="material-icon">${icon('files')}</span><button class="material-title" data-material="${m.index}" data-course="${m.course.id}" data-focus-id="material-${m.course.id}-${m.index}"><strong>${m.title}</strong><span>${m.course.short} · ${m.type}</span></button><button class="icon-button ${saved?'saved':''}" data-bookmark="${id}" aria-pressed="${saved}" aria-label="${saved?'Прибрати зі збережених':'Зберегти'}: ${m.title}">${icon('bookmark')}</button><button class="icon-button" data-material="${m.index}" data-course="${m.course.id}" aria-label="Відкрити: ${m.title}">${icon('arrow')}</button></article>`;}).join(''):'<div class="empty-state">Нічого не знайдено</div>';}
  function materialsView(){return heading('Матеріали')+`<div class="material-controls"><label class="search-field">${icon('search')}<input type="search" id="material-search" placeholder="Знайти матеріал" aria-label="Знайти матеріал" value="${esc(search)}"></label><select id="material-course" aria-label="Курс"><option value="all">Усі курси</option>${selected().map(c=>`<option value="${c.id}" ${courseFilter===c.id?'selected':''}>${c.name}</option>`).join('')}</select></div><div class="materials-list" id="materials-list">${materialsList()}</div>`;}
  function settingsView(){return `<div class="settings-grid"><section class="settings-card"><h2>Профіль</h2><form id="settings-form"><label for="profile-name">Ім’я</label><input id="profile-name" name="name" value="${esc(H.state.name)}" required maxlength="80"><label for="daily-minutes">Час на день</label><select id="daily-minutes" name="minutes">${[25,45,60].map(m=>`<option value="${m}" ${H.state.minutes===m?'selected':''}>${m} хв</option>`).join('')}</select><button class="primary" type="submit">Зберегти</button></form></section><section class="settings-card"><h2>Підключена LMS</h2><div class="connected-school">${icon('link')}<strong>${esc(H.state.school||'LMS')}</strong></div><a class="secondary" href="connect.html?edit=1">Керувати курсами</a><button class="logout-button" data-logout>${icon('logout')} Вийти</button></section></div>`;}
  function render(){if(location.hash==='#materials')history.replaceState(null,'','#courses');if(window.HustleDashboard?.render()){profile();return;}window.HustleDeadlineVisuals?.mount();const view=currentView();profile();document.querySelectorAll('[data-nav],.sidebar-course').forEach(a=>{if(a.dataset.nav===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});const title=nav.find(n=>n[0]===view)[1];document.querySelector('#view-name').textContent=title;document.title=`${title} — Hustle`;if(view==='settings' && window.HustleDashboard){window.HustleDashboard.renderSettings('general',settingsView());return;}main.innerHTML=({plan:planView,courses:coursesView,practice:practiceView,materials:materialsView,settings:()=>heading('Налаштування')+settingsView()}[view])();}
  const mobile = matchMedia('(max-width: 52rem)');
  function setMenu(open){document.body.classList.toggle('menu-open',open);document.querySelector('.sidebar-shade').hidden=!open;document.querySelector('#menu-toggle').setAttribute('aria-expanded',String(open));document.querySelector('#sidebar').inert=mobile.matches&&!open;if(open)document.querySelector('[data-nav]').focus();}
  mobile.addEventListener('change',()=>setMenu(false));
  setMenu(false);
  document.querySelector('#menu-toggle').addEventListener('click',()=>setMenu(!document.body.classList.contains('menu-open')));
  document.querySelector('.sidebar-shade').addEventListener('click',()=>setMenu(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu-open')){setMenu(false);document.querySelector('#menu-toggle').focus();}});
  document.addEventListener('keydown', e => {
    if(e.key!=='Tab'||!document.body.classList.contains('menu-open'))return;
    const links=[...document.querySelectorAll('#sidebar a')], first=links[0], last=links[links.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  window.addEventListener('hashchange',()=>{
    setMenu(false);
    const fromSettingsTab = !!document.activeElement?.closest('.settings-sections');
    const fromCourseTab = !!document.activeElement?.closest('.paper-course-actions');
    render();
    if (fromSettingsTab && main.querySelector('.settings-sections')) return;
    if (main.querySelector('.paper-course-header')) {
      const target = fromCourseTab && main.querySelector('.paper-course-actions [aria-current="page"]');
      (target || document.querySelector('#view-name h1'))?.focus({preventScroll:true});
      window.scrollTo({top:0, behavior:'instant'});
    } else main.querySelector('h1')?.focus();
  });
  function showDialog(trigger){focusId=trigger.dataset.focusId;dialog.showModal();}
  function finish(){window.HustleDashboard?.completePractice(practice);practice.finished=true;const completed={...H.state.completed,[taskKey(practice.course,practice.kind)]:true};H.update({completed});renderPractice();}
  function renderPractice(){
    const p=practice,c=p.course;
    if(p.finished){body.innerHTML=`<div class="practice-summary"><span class="mascot-sticker mascot-sticker--complete" aria-hidden="true"><img src="assets/mascot/complete.webp" alt="" width="384" height="384"></span><h2 id="dialog-title">${p.kind==='quiz'?`${p.correct} з ${c.quiz.length} правильних`:'Заняття завершено'}</h2>${window.HustleDashboard?.rewardSummary()||''}<button class="primary" data-close-dialog>До плану ${icon('arrow')}</button><button class="text-button" data-restart>Ще раз</button></div>`;return;}
    const type=kinds.find(k=>k[0]===p.kind)[2],total=p.kind==='cards'?c.cards.length:p.kind==='quiz'?c.quiz.length:1;
    let html=`<p class="study-context">${c.short} · ${type}</p><div class="study-position"><span>${p.index+1} / ${total}</span><div><i style="width:${(p.index+1)/total*100}%"></i></div></div>`;
    if(p.kind==='cards'){const [q,a]=c.cards[p.index];html+=`<div class="flashcard"><h2 id="dialog-title">${q}</h2>${p.revealed?`<p>${a}</p>`:''}</div>${p.revealed?'<div class="dialog-actions"><button class="secondary" data-next-card>Ще повторю</button><button class="primary" data-next-card>Знаю ✓</button></div>':'<button class="primary wide" data-reveal>Показати відповідь</button>'}`;}
    if(p.kind==='example')html+=`<h2 id="dialog-title">${c.example[0]}</h2>${p.revealed?`<div class="answer-block">${c.example[1]}</div><button class="primary wide" data-finish>Завершити ${icon('check')}</button>`:'<button class="primary wide" data-reveal>Показати розв’язання</button>'}`;
    if(p.kind==='quiz'){const q=c.quiz[p.index];html+=`<h2 id="dialog-title">${q.q}</h2><div class="quiz-options" role="group" aria-label="Варіанти відповіді">${q.options.map((a,i)=>`<button class="quiz-option ${p.checked&&i===q.answer?'correct':''} ${p.checked&&i===p.choice&&i!==q.answer?'incorrect':''}" data-answer="${i}" aria-pressed="${p.choice===i}" ${p.checked?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${a}${p.checked&&i===q.answer?icon('check'):''}</button>`).join('')}</div>${p.checked?`<div class="answer-block" role="status"><strong>${p.choice===q.answer?'Правильно':'Правильна відповідь: '+q.options[q.answer]}</strong><p>${q.explanation}</p></div><button class="primary wide" data-next-question>${p.index===total-1?'Результат':'Наступне запитання'} ${icon('arrow')}</button>`:`<button class="primary wide" data-check-answer ${p.choice===null?'disabled':''}>Перевірити</button>`}`;}
    body.innerHTML=html;
  }
  function openPractice(trigger){const course=courses.find(c=>c.id===trigger.dataset.course);practice={course,kind:trigger.dataset.start,index:0,revealed:false,choice:null,checked:false,correct:0,finished:false};renderPractice();showDialog(trigger);}
  document.addEventListener('click',event=>{
    const el=event.target.closest('button,a');if(!el)return;
    if(el.hasAttribute('data-start')){openPractice(el);return;}
    if(el.hasAttribute('data-close-dialog')){dialog.close();return;}
    if(el.hasAttribute('data-day')){day=Number(el.dataset.day);render();main.querySelector(`[data-day="${day}"]`).focus();return;}
    if(el.hasAttribute('data-complete')){const course=courses.find(c=>c.id===el.dataset.course),key=taskKey(course,el.dataset.complete);H.update({completed:{...H.state.completed,[key]:!H.state.completed[key]}});render();main.querySelector(`[data-complete="${el.dataset.complete}"]`).focus();return;}
    if(el.hasAttribute('data-course-materials')){courseFilter=el.dataset.courseMaterials;location.hash='materials';return;}
    if(el.hasAttribute('data-bookmark')){const id=el.dataset.bookmark,saved=H.state.bookmarks.includes(id);H.update({bookmarks:saved?H.state.bookmarks.filter(x=>x!==id):[...H.state.bookmarks,id]});document.querySelector('#materials-list').innerHTML=materialsList();document.querySelector(`[data-bookmark="${id}"]`).focus();toast(saved?'Прибрано зі збережених':'Збережено');return;}
    if(el.hasAttribute('data-material')){const c=courses.find(c=>c.id===el.dataset.course),m=c.materials[Number(el.dataset.material)];practice=null;body.innerHTML=`<p class="study-context">${c.name} · ${m.type}</p><h2 id="dialog-title">${m.title}</h2><div class="reading"><p>${m.body}</p><div class="formula-block">${m.formula}</div><p>${m.detail}</p></div><button class="primary" data-close-dialog>Готово ${icon('check')}</button>`;showDialog(el);return;}
    if(el.hasAttribute('data-logout')){H.update({registered:false});location.href='index.html';return;}
    if(!practice)return;
    if(el.hasAttribute('data-reveal')){practice.revealed=true;renderPractice();return;}
    if(el.hasAttribute('data-next-card')){practice.index++;practice.revealed=false;if(practice.index===practice.course.cards.length)finish();else renderPractice();return;}
    if(el.hasAttribute('data-finish')){finish();return;}
    if(el.hasAttribute('data-answer')&&!practice.checked){practice.choice=Number(el.dataset.answer);renderPractice();body.querySelector(`[data-answer="${practice.choice}"]`).focus();return;}
    if(el.hasAttribute('data-check-answer')&&practice.choice!==null&&!practice.checked){practice.checked=true;if(practice.choice===practice.course.quiz[practice.index].answer)practice.correct++;renderPractice();return;}
    if(el.hasAttribute('data-next-question')){practice.index++;practice.choice=null;practice.checked=false;if(practice.index===practice.course.quiz.length)finish();else renderPractice();return;}
    if(el.hasAttribute('data-restart')){practice={...practice,index:0,revealed:false,choice:null,checked:false,correct:0,finished:false};renderPractice();}
  });
  main.addEventListener('input',event=>{if(event.target.id==='material-search'){search=event.target.value;document.querySelector('#materials-list').innerHTML=materialsList();}});
  main.addEventListener('change',event=>{if(event.target.id==='material-course'){courseFilter=event.target.value;document.querySelector('#materials-list').innerHTML=materialsList();}});
  main.addEventListener('submit',event=>{if(event.target.id!=='settings-form')return;event.preventDefault();const name=event.target.elements.name.value.trim();if(!name){event.target.elements.name.setCustomValidity('Вкажи ім’я.');event.target.elements.name.reportValidity();return;}H.update({name,minutes:Number(event.target.elements.minutes.value)});profile();toast('Збережено');});
  main.addEventListener('input',event=>{if(event.target.id==='profile-name')event.target.setCustomValidity('');});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{practice=null;render();const target=focusId?main.querySelector(`[data-focus-id="${focusId}"]`):null;(target||main.querySelector('h1')).focus();});
  render();
})();
