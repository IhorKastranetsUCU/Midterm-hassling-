(() => {
  const {escape: esc, icon} = UI;
  const main = document.querySelector('#workspace-main');
  const dialog = document.querySelector('#study-dialog');
  const body = document.querySelector('#dialog-body');
  const drafts = new Map();
  let activeBundle, practice, viewVersion = 0;
  const tabs = [['overview','Карта курсу'],['materials','Матеріали'],['practice','Практика'],['assignments','Дедлайни']];
  let materialRecords = []; const materialFilters = new Map();
  const filterKey=()=>UI.route().courseId||'library';
  const empty = text => `<div class="connected-empty"><p>${esc(text)}</p></div>`;
  const status = text => `<p role="status">${esc(text)}</p>`;
  function safeLink(value) {
    if (!value) return null;
    try { const url = new URL(value, location.origin); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
  }
  const materialTypes={lecture:'Лекції',video:'Відео',audio:'Аудіо',self_test:'Самоперевірка',assignment:'Завдання',resource:'Файли',url:'Посилання'};
  function materialCards(groups,course) {
    return groups.map((group,groupIndex)=>`<details class="material-group" data-material-group ${groupIndex===0?'open':''}><summary class="group-heading"><h2>${esc(group.title)}</h2><span>${group.materials.length}</span><i aria-hidden="true">⌄</i></summary><div class="material-group-list">${group.materials.filter(m=>m.safety_status!=='restricted_exam').map(m=>{
      const index=materialRecords.push({...m,course})-1, type=m.material_type||'resource';
      const search=`${m.name} ${group.title} ${course.title} ${(m.key_items||[]).join(' ')}`.toLocaleLowerCase('uk');
      return `<article class="material-row" data-material-search="${esc(search)}" data-material-type="${esc(type)}" data-material-course="${course.course_id}"><span class="material-icon ${type==='video'?'lilac':'butter'}">${icon(type==='self_test'?'practice':'files')}</span><button class="material-title" data-material="${index}"><strong>${esc(m.name)}</strong><span>${esc(materialTypes[type]||'Матеріал')}${m.timemodified?' · '+esc(UI.date(m.timemodified)):''}</span></button><button class="icon-button" data-material="${index}" aria-label="Відкрити ${esc(m.name)}">${icon('arrow')}</button></article>`;
    }).join('')}</div></details>`).join('');
  }
  function materialToolbar(courses=[]) {const saved=materialFilters.get(filterKey())||{};return `<div class="collection-toolbar"><label class="search-field">${icon('search')}<input type="search" data-search-materials aria-label="Пошук матеріалів" placeholder="Знайти матеріал" value="${esc(saved.term||'')}"></label><label class="compact-select"><span class="sr-only">Тип матеріалу</span><select data-material-filter><option value="">Усі типи</option>${Object.entries(materialTypes).map(([key,label])=>`<option value="${key}" ${saved.type===key?'selected':''}>${label}</option>`).join('')}</select></label>${courses.length?`<label class="compact-select"><span class="sr-only">Курс</span><select data-material-course-filter><option value="">Усі курси</option>${courses.map(c=>`<option value="${c.course_id}" ${String(c.course_id)===saved.course?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label>`:''}</div>`;}
  function groupsFor(bundle) {return bundle.material_groups || bundle.topic_mixes.map(t=>({title:t.title,materials:t.materials||[]}));}
  function filterMaterials() {
    const term=main.querySelector('[data-search-materials]')?.value.trim().toLocaleLowerCase('uk')||'',type=main.querySelector('[data-material-filter]')?.value||'',course=main.querySelector('[data-material-course-filter]')?.value||'';
    if(!main.querySelector('[data-search-materials]'))return;
    materialFilters.set(filterKey(),{term,type,course});
    const rows=[...main.querySelectorAll('[data-material-search]')];
    rows.forEach(row=>row.hidden=!row.dataset.materialSearch.includes(term)||!!type&&row.dataset.materialType!==type||!!course&&row.dataset.materialCourse!==course);
    main.querySelectorAll('[data-material-group],[data-material-course-group]').forEach(group=>group.hidden=![...group.querySelectorAll('[data-material-search]')].some(row=>!row.hidden));
    if(term||type||course)main.querySelectorAll('details[data-material-group]:not([hidden])').forEach(group=>group.open=true);
    const empty=main.querySelector('[data-search-empty]');if(empty)empty.hidden=rows.some(row=>!row.hidden);
  }
  function showMaterial(index) {
    const material=materialRecords[index];if(!material)return;
    const url=safeLink(material.url), download=safeLink(material.download_url);
    const description=UI.plain(material.description);
    body.innerHTML=`<h2 id="dialog-title">${esc(material.name)}</h2><p class="muted">${esc(material.source_section||material.course.title)}</p>${material.key_items?.length?`<ul class="key-items">${material.key_items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}${description?`<div class="material-description">${esc(description)}</div>`:''}<div class="page-actions">${url?`<a class="primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Відкрити джерело ↗</a>`:''}${download&&download!==url?`<a class="secondary" href="${esc(download)}" target="_blank" rel="noopener noreferrer">Завантажити файл ↓</a>`:''}${['video','audio'].includes(material.material_type)&&url?`<button class="secondary" data-transcript="${index}">Транскрипт</button>`:''}</div><div data-transcript-content>${material.transcript_snippet?`<p>${esc(material.transcript_snippet)}</p>`:''}</div>`;
    dialog.showModal();
  }
  function practiceCards(topics) {
    return topics.map(topic => `<section class="practice-course"><div class="practice-course-heading"><span class="course-avatar lilac">${icon('practice')}</span><h2>${esc(topic.title)}</h2></div><div class="practice-modes">${topic.flashcards.length?`<button class="practice-mode" data-study="cards" data-mix="${esc(topic.mix_id)}">${icon('practice')}<strong>Картки</strong><span>${UI.countLabel(topic.flashcards.length,'картка','картки','карток')}</span>${icon('arrow')}</button>`:''}${topic.quizzes.length?`<button class="practice-mode" data-study="quiz" data-mix="${esc(topic.mix_id)}">${icon('check')}<strong>Самоперевірка</strong><span>${UI.countLabel(topic.quizzes.length,'питання','питання','питань')}</span>${icon('arrow')}</button>`:''}${!topic.flashcards.length && !topic.quizzes.length?'<p>Практики для цієї теми поки немає.</p>':''}</div></section>`).join('');
  }
  function notesForm(topic) {
    const value = drafts.has(topic.mix_id) ? drafts.get(topic.mix_id) : topic.user_notes || '';
    return `<form class="notes-form import-form" data-notes="${esc(topic.mix_id)}"><label>Мої нотатки<textarea name="notes">\n${esc(value)}</textarea></label><div class="notes-actions"><button class="secondary" type="submit">Зберегти нотатки</button><span role="status" data-save-status>${drafts.has(topic.mix_id)?'Не збережено':''}</span></div></form>`;
  }
  function readableSection(section) {
    // Hide only the deterministic generator's wrapper; preserve stored course content.
    const heading = `### Overview of ${section.heading}\n\n`;
    const markdown = section.explanation_markdown || '';
    if (!markdown.startsWith(heading)) return section;
    const body = markdown.slice(heading.length);
    const wrapper = /^This interactive unit organizes material from \*\*[^\n]*?\*\* \(`[^\n]*?`\) without modifying or storing restricted exam items\.\n\n/;
    if (!wrapper.test(body)) return section;
    const explanation = body.replace(wrapper, '');
    const bullets = new Set(explanation.split('\n').filter(line => line.startsWith('- ')).map(line => line.slice(2).trim()));
    return {...section,
      explanation_markdown: explanation,
      key_takeaways: (section.key_takeaways || []).filter(point => !bullets.has(point.trim())),
      visual_card_caption: section.visual_card_caption === `Concept Card: ${section.heading}` ? '' : section.visual_card_caption,
    };
  }
  function reading(bundle) {
    if(bundle.course_map&&window.HustleCurriculum)return HustleCurriculum.reading(bundle,notesForm);
    const topics=bundle.topic_mixes;
    if(!topics.length)return empty('Матеріали ще готуються.');
    const selected=Math.max(0,topics.findIndex(t=>String(t.topic_index)===UI.route().topic)),topic=topics[selected];
    const link=t=>UI.courseLink(bundle.course.course_id,'reading',t.topic_index);
    return `${HustleSpace.topicActions(topic)}<div class="reading-layout"><nav class="topic-outline" aria-label="Теми курсу"><h2>Зміст</h2>${topics.map((t,i)=>`<a href="${link(t)}" ${i===selected?'aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(t.title)}${t.has_upstream_update?'<i class="update-dot" aria-label="Є оновлення"></i>':''}</a>`).join('')}</nav><div class="reading-content"><label class="mobile-topic-select">Тема<select data-topic-select>${topics.map((t,i)=>`<option value="${esc(link(t))}" ${i===selected?'selected':''}>${i+1}. ${esc(t.title)}</option>`).join('')}</select></label><article class="topic-card reading-paper"><h2>${esc(topic.title)}</h2>${topic.has_upstream_update?`<div class="update-banner"><span>Матеріали теми змінилися</span><button class="secondary" data-ack-topic="${esc(topic.mix_id)}">Оновити конспект ↻</button><p role="status"></p></div>`:''}${topic.book_sections.map(readableSection).map(section=>`${section.heading!==topic.title?`<h3>${esc(section.heading)}</h3>`:''}${UI.markdown(section.explanation_markdown)}${section.key_takeaways.length?`<ul class="key-items">${section.key_takeaways.map(point=>`<li>${esc(point)}</li>`).join('')}</ul>`:''}${section.mermaid_diagram?`<figure class="diagram" data-diagram="${esc(section.mermaid_diagram)}" aria-label="Схема теми"></figure>`:''}${safeLink(section.visual_card_url)?`<figure class="visual-explanation"><img src="${esc(safeLink(section.visual_card_url))}" alt="${esc(section.visual_card_caption||section.heading)}" loading="lazy" referrerpolicy="no-referrer">${section.visual_card_caption?`<figcaption>${esc(section.visual_card_caption)}</figcaption>`:''}</figure>`:section.visual_card_caption?`<aside class="concept-card">${esc(section.visual_card_caption)}</aside>`:''}`).join('')||'<p class="muted">Конспект вимкнено в параметрах курсу.</p>'}${notesForm(topic)}</article><nav class="topic-pagination" aria-label="Перехід між темами">${selected?`<a class="secondary" href="${link(topics[selected-1])}">← Попередня тема</a>`:'<span></span>'}${selected<topics.length-1?`<a class="secondary" href="${link(topics[selected+1])}">Наступна тема →</a>`:''}</nav></div></div>`;
  }
  function examView(bundle) {
    const exam = bundle.exam_mix;
    const examMarkdown=exam?.master_cheatsheet_markdown.replace(/^# .+ — Exam Prep Master Mix/m,'## Головне з тем')||'';
    const mistakes=(exam?.weak_spots_focus||[]).filter(point=>point.startsWith('Weak Spot:')).map(point=>point.replace(/^Weak Spot: (.+) \((\d+) missed\)$/,(match,topic,count)=>`${topic} · ${UI.countLabel(count,'помилка','помилки','помилок')}`));
    return `<section class="exam-intro"><div><h2>Підготовка до іспиту</h2>${bundle.course.exam_mix_stale?'<p>Є нові матеріали або результати практики.</p>':''}</div><button class="primary" data-build-exam>${exam?'Оновити підготовку':'Підготувати матеріали'} →</button></section><p data-exam-status role="status"></p>${exam?`<article class="topic-card">${UI.markdown(examMarkdown)}${exam.concept_map_mermaid?`<figure class="diagram" data-diagram="${esc(exam.concept_map_mermaid)}" aria-label="Карта понять курсу"></figure>`:''}${mistakes.length?`<h3>Помилки в практиці</h3><ul>${mistakes.map(point=>`<li>${esc(point)}</li>`).join('')}</ul>`:''}${exam.mock_exam_questions.length?'<button class="primary" data-study="exam">Пробний тест →</button>':''}</article>`:empty('Збери головне з тем курсу в одну підготовку.')}`;
  }
  function renderBundle(bundle, section='overview') {
    activeBundle=bundle;materialRecords=[];
    const tab=[...tabs.map(([key])=>key),'reading','exam','grades','manage'].includes(section)?section:'overview';
    const visibleTabs=bundle.course.source_type==='manual_upload'?tabs.filter(([key])=>key!=='assignments'):tabs;
    const active=tab==='reading'?'overview':tab==='exam'?'practice':tab==='grades'?'assignments':tab;
    let content;
    if(tab==='overview')content=HustleSpace.overview(bundle);
    else if(tab==='reading')content=reading(bundle);
    else if(tab==='practice')content=(practiceCards(window.HustleCurriculum?HustleCurriculum.practiceTopics(bundle):bundle.topic_mixes)+(window.HustleCurriculum?.practiceOverview(bundle)||''))||empty('Практики для цього курсу поки немає.');
    else if(tab==='materials')content=materialToolbar()+`<div class="materials-heading"><span class="muted">За темами курсу</span><button class="text-button" data-structure>Уточнити структуру ${icon('settings')}</button></div>`+materialCards(groupsFor(bundle),bundle.course)+(bundle.course.source_type!=='manual_upload'?`<details class="source-tree" data-source-files><summary>Файли з Moodle</summary><div data-file-list></div></details>`:'')+`<p data-search-empty ${materialRecords.length?'hidden':''}>Матеріалів не знайдено.</p>`;
    else if(tab==='exam')content=examView(bundle);
    else if(tab==='manage')content=HustleCourse.manage(bundle);
    else content=HustleCourse.activity(bundle);
    if(['practice','exam'].includes(tab))content=`<nav class="study-mode-tabs" aria-label="Режим практики"><a href="${UI.courseLink(bundle.course.course_id,'practice')}" ${tab==='practice'?'aria-current="page"':''}>За темами</a><a href="${UI.courseLink(bundle.course.course_id,'exam')}" ${tab==='exam'?'aria-current="page"':''}>До іспиту</a></nav>`+content;
    return `<nav class="course-tabs" aria-label="Розділи курсу">${visibleTabs.map(([key,label])=>`<a href="${UI.courseLink(bundle.course.course_id,key)}" ${key===active?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="course-content">${content}</div>`;
  }
  async function library(kind, current) {
    const courses=await UI.api('/api/workspace/courses'),loaded=[];
    for(let start=0;start<courses.length;start+=4) {
      const batch=await Promise.allSettled(courses.slice(start,start+4).map(c=>UI.api(`/api/workspace/courses/${c.course_id}`)));
      loaded.push(...batch.map((result,i)=>({course:courses[start+i],result})));if(!current())return '';
    }
    materialRecords=[];
    if(kind==='materials')return materialToolbar(courses)+loaded.map(({course,result})=>result.status==='rejected'?`<div role="alert" class="live-error">${esc(course.title)}: ${esc(result.reason.message)} <a href="#course/${course.course_id}/materials?from=materials">Повторити</a></div>`:`<section class="library-material-course" data-material-course-group><h2 class="library-course-title"><a href="#course/${course.course_id}/materials?from=materials">${esc(course.title)} ${icon('arrow')}</a></h2>${materialCards(groupsFor(result.value),course)}</section>`).join('')+`<p data-search-empty ${materialRecords.length?'hidden':''}>Матеріалів поки немає. Додай курс, щоб почати.</p>`;
    return `<div class="practice-list">${loaded.map(({course,result})=>result.status==='rejected'?`<section class="topic-card"><h2>${esc(course.title)}</h2><p role="alert">${esc(result.reason.message)}</p><a class="secondary" href="#course/${course.course_id}/practice?from=practice">Спробувати знову</a></section>`:`<section class="practice-course"><div class="practice-course-heading"><span class="course-avatar lilac">${icon('practice')}</span><h2>${esc(course.title)}</h2></div><p class="muted">${UI.countLabel(result.value.topic_mixes.reduce((sum,t)=>sum+t.flashcards.length,0),'картка','картки','карток')} · ${UI.countLabel(result.value.topic_mixes.reduce((sum,t)=>sum+t.quizzes.length,0),'питання','питання','питань')}</p><a class="primary" href="#course/${course.course_id}/practice?from=practice">До практики →</a></section>`).join('')||empty('Додай курс, щоб почати практику.')}</div>`;
  }
  function showPractice(type, mixId) {
    const topic = activeBundle.topic_mixes.find(t=>t.mix_id===mixId);
    const verified = window.HustleCurriculum?HustleCurriculum.practiceTopics(activeBundle).find(t=>t.mix_id===mixId):topic;
    const items = type==='exam'?activeBundle.exam_mix?.mock_exam_questions:type==='cards'?verified?.flashcards:verified?.quizzes;
    if(!items?.length) return;
    practice = {type,items,topic,index:0,score:0,selected:null,checked:false,revealed:false,saving:false,error:'',epoch:++viewVersion};
    drawPractice(); focusPractice(); dialog.showModal(); focusPractice();
  }
  function focusPractice() {
    if(!dialog.open)return;
    const target=body.querySelector('.answer-block') || body.querySelector('[data-option][aria-pressed="true"]') || body.querySelector('[data-next]') || body.querySelector('#dialog-title');
    if(target){if(!target.matches('button'))target.tabIndex=-1;target.focus();}
  }
  function drawPractice() {
    const p=practice;
    if(p.index>=p.items.length) {
      body.innerHTML=`<div class="practice-summary"><span class="summary-icon">${icon('check')}</span><h2 id="dialog-title">${p.type==='cards'?'Картки повторено':`${p.score} із ${p.items.length} правильних`}</h2><button class="primary" data-study-close>${UI.route().view==='dashboard'?'До плану':'До курсу'} →</button></div>`;
      return;
    }
    const item=p.items[p.index];
    body.innerHTML=`<div class="study-position"><span>${p.index+1} / ${p.items.length}</span><div><i style="width:${(p.index+1)/p.items.length*100}%"></i></div></div><h2 id="dialog-title">${esc(p.type==='cards'?item.front:item.question)}</h2>${p.type==='cards'?`<div class="flashcard">${p.revealed?`<p>${esc(item.back)}</p>`:'<button class="secondary" data-reveal>Показати відповідь</button>'}</div>${p.revealed?'<button class="primary wide" data-next>Далі →</button>':''}`:`<div class="quiz-options">${item.options.map((option,i)=>`<button class="quiz-option ${p.checked && i===item.correct_index?'correct':p.checked && i===p.selected?'incorrect':''}" data-option="${i}" aria-pressed="${i===p.selected}" ${p.checked||p.saving?'disabled':''}><span>${i+1}</span>${esc(option)}</button>`).join('')}</div>${p.checked?`<div class="answer-block">${esc(item.explanation)}</div><button class="primary wide" data-next>${p.index===p.items.length-1?'Результат':'Далі →'}</button>`:`<button class="primary wide" data-check ${p.selected===null||p.saving?'disabled':''}>${p.saving?'Зберігаємо…':'Перевірити'}</button>`}`}<p role="alert" class="field-error">${esc(p.error)}</p>`;
  }
  main.addEventListener('input',event=>{
    const notes=event.target.closest('[data-notes]');
    if(notes) { drafts.set(notes.dataset.notes,notes.elements.notes.value); notes.querySelector('[data-save-status]').textContent='Не збережено'; }
    if(event.target.matches('[data-search-materials]')) filterMaterials();
  });
  main.addEventListener('change',event=>{
    if(event.target.matches('[data-topic-select]'))location.hash=event.target.value;
    if(event.target.matches('[data-material-filter],[data-material-course-filter]'))filterMaterials();
  });
  main.addEventListener('submit',async event=>{
    const form=event.target.closest('[data-notes]'); if(!form)return;
    event.preventDefault(); const button=form.querySelector('button'), indicator=form.querySelector('[data-save-status]'), text=form.elements.notes.value;
    button.disabled=true; indicator.textContent='Зберігаємо…';
    try {
      await UI.api(`/api/workspace/mixes/${encodeURIComponent(form.dataset.notes)}/notes`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes:text})});
      if(form.elements.notes.value===text) { drafts.delete(form.dataset.notes); indicator.textContent='Збережено'; } else indicator.textContent='Не збережено';
      const topic=activeBundle?.topic_mixes.find(t=>t.mix_id===form.dataset.notes); if(topic)topic.user_notes=text;
    } catch(err) { indicator.textContent=err.message; }
    finally { button.disabled=false; }
  });
  main.addEventListener('click',async event=>{
    const material=event.target.closest('[data-material]');if(material)showMaterial(Number(material.dataset.material));
    const study=event.target.closest('[data-study]'); if(study)showPractice(study.dataset.study,study.dataset.mix);
    const build=event.target.closest('[data-build-exam]'); if(!build)return;
    const bundle=activeBundle, version=location.hash, indicator=main.querySelector('[data-exam-status]');
    build.disabled=true; indicator.textContent='Готуємо матеріали…';
    try {
      const response=await UI.post(`/api/workspace/courses/${encodeURIComponent(bundle.course.course_id)}/exam-mix`,{});
      bundle.exam_mix=response.exam_mix; bundle.course.exam_mix_stale=false;
      if(location.hash===version) window.dispatchEvent(new Event('hustle:refresh'));
    } catch(err) { indicator.textContent=err.message; }
    finally { build.disabled=false; }
  });
  body.addEventListener('click',async event=>{
    const transcript=event.target.closest('[data-transcript]');
    if(transcript) {
      const material=materialRecords[Number(transcript.dataset.transcript)], target=body.querySelector('[data-transcript-content]');
      transcript.disabled=true;target.textContent='Отримуємо транскрипт…';
      try {const response=await UI.post('/api/courses/transcribe-video',{url:material.url,course_id:material.course.course_id,module_id:material.id});if(!response.success)throw new Error(response.message||'Транскрипт недоступний.');target.innerHTML=`<div class="material-description">${esc(response.full_text)}</div>`;}catch(err){target.textContent=err.message;}finally{transcript.disabled=false;}
    }
    if(!practice)return;
    const p=practice;
    if(event.target.closest('[data-study-close]'))dialog.close();
    if(event.target.closest('[data-reveal]')) {p.revealed=true;drawPractice(); focusPractice();}
    const option=event.target.closest('[data-option]');
    if(option && !p.checked && !p.saving) {p.selected=Number(option.dataset.option);p.error='';drawPractice(); focusPractice();}
    if(event.target.closest('[data-next]') && !p.saving) {p.index++;p.selected=null;p.checked=false;p.revealed=false;p.error='';drawPractice(); focusPractice();}
    if(!event.target.closest('[data-check]') || p.saving || p.checked || p.selected===null)return;
    const item=p.items[p.index]; p.saving=true;p.error='';drawPractice(); focusPractice();
    try {
      if(p.type==='quiz') await UI.post(`/api/workspace/mixes/${encodeURIComponent(p.topic.mix_id)}/quiz-attempt`,{question:item.question,chosen_index:p.selected,correct_index:item.correct_index,topic_ref:item.topic_ref||p.topic.title});
      if(practice!==p)return;
      p.checked=true;if(p.selected===item.correct_index)p.score++;
      activeBundle.course.exam_mix_stale=true;
    } catch(err) {if(practice===p)p.error=err.message;}
    finally {if(practice===p) {p.saving=false;drawPractice(); focusPractice();}}
  });
  dialog.addEventListener('close',()=>{practice=null;});
  window.addEventListener('beforeunload',event=>{if(drafts.size) {event.preventDefault();event.returnValue='';}});
  function afterRender() {
    window.HustleCurriculum?.afterRender();
    const toolbar=main.querySelector('.collection-toolbar:has([data-search-materials])');
    const structure=main.querySelector('.materials-heading');
    if(toolbar&&structure)toolbar.append(structure);
    filterMaterials();
  }
  function openTopicPractice(bundle,type,mixId) {
    if(!['cards','quiz'].includes(type)||!bundle.topic_mixes.some(t=>t.mix_id===mixId))return;
    activeBundle=bundle;
    showPractice(type,mixId);
  }
  window.HustleLearning={renderBundle,library,afterRender,openTopicPractice,hasDrafts:()=>drafts.size>0};
})();
