/* Course-level actions: existing workspace APIs, source structure, grades and jobs. */
(() => {
  const {escape:esc,icon}=UI, main=document.querySelector('#workspace-main'),dialog=document.querySelector('#study-dialog'),body=document.querySelector('#dialog-body');
  let bundle, account, version=0, preview, jobTimer, modalVersion=0;
  dialog.addEventListener('close',()=>{modalVersion++;});
  const tools=[['interactive_book','Конспект'],['mermaid_diagrams','Схеми'],['visual_cards','Візуальні пояснення'],['practice_quizzes','Самоперевірка'],['flashcards','Картки'],['exam_mix','Підготовка до іспиту'],['deadline_tracker','Дедлайни']];
  const emit=()=>window.dispatchEvent(new Event('hustle:refresh'));
  function showDialog(title,content) {body.innerHTML=`<h2 id="dialog-title">${esc(title)}</h2>${content}<p role="alert" class="field-error" data-course-error></p>`;if(!dialog.open)dialog.showModal();}
  function controls(value) {return tools.map(([key,label])=>`<label class="tool-choice"><input type="checkbox" name="${key}" ${value[key]?'checked':''}><span>${label}</span></label>`).join('');}
  function manage(value) {
    return `<div class="manage-grid"><section class="topic-card"><h2>Інструменти курсу</h2><form id="course-tools"><div class="tool-grid">${controls(value.tools_config)}</div><button class="primary" type="submit">Зберегти</button><p role="status" data-tools-status></p></form></section><section class="topic-card"><h2>Матеріали й структура</h2><div class="manage-actions"><button class="secondary" data-structure>Впорядкувати за темами ${icon('arrow')}</button>${value.course.source_type!=='manual_upload'?'<button class="secondary" data-sync-course>Оновити з Moodle ↻</button><button class="text-button" data-check-updates>Перевірити зміни</button>':''}<button class="secondary" data-regenerate>Оновити конспекти ↻</button></div><p role="status" data-course-action-status></p><div data-jobs></div></section></div>${value.blocked_quizzes.length?`<details class="source-tree"><summary>Недоступні для опрацювання · ${value.blocked_quizzes.length}</summary><ul>${value.blocked_quizzes.map(q=>`<li>${esc(q.name)}</li>`).join('')}</ul></details>`:''}`;
  }
  async function jobs(target,epoch) {
    try {const result=await UI.api(`/api/workspace/courses/${bundle.course.course_id}/jobs`);if(epoch!==version||!target.isConnected)return;
      const values=Array.isArray(result.jobs)?result.jobs:Object.values(result.jobs||{});
      const states={debouncing:'Підготовку заплановано',running:'Готуємо матеріали…',completed:'Матеріали готові',failed:'Не вдалося підготувати матеріали'};
      target.innerHTML=values.map(job=>`<p class="job-status" role="status">${esc(states[job.status]||job.status)}${job.status==='failed'?'<button class="text-button" data-regenerate>Повторити</button>':''}</p>`).join('');
      if(values.some(job=>['debouncing','running'].includes(job.status)))jobTimer=setTimeout(()=>jobs(target,epoch),5000);
    }catch{if(target.isConnected)target.innerHTML='<p class="muted">Стан генерації недоступний.</p>';}
  }
  async function academic(target,courseId,profile,section='assignments') {
    if(!target)return;
    if(!profile.moodle_paired){target.innerHTML='<section class="connected-empty"><h2>Підключи Moodle</h2><a class="primary" href="connect.html">Підключити LMS →</a></section>';return;}
    const selected=courseId?`?course_id=${encodeURIComponent(courseId)}`:'';
    target.innerHTML='<p role="status">Завантажуємо…</p>';
    try {
      if(section==='grades') {
        const data=await UI.api('/api/grades'+selected);if(!target.isConnected)return;
        target.innerHTML=(data.courses||[]).map(course=>`<section class="topic-card grade-card">${!courseId?`<h2>${esc(course.course_fullname)}</h2>`:''}${course.grade_items.length?`<div class="table-scroll"><table class="grade-table"><thead><tr><th scope="col">Робота</th><th scope="col">Оцінка</th><th scope="col">Відгук</th></tr></thead><tbody>${course.grade_items.map(item=>`<tr><th scope="row">${esc(item.itemname==='Course Total'?'Підсумок курсу':item.itemname)}</th><td>${esc(item.gradeformatted??'—')} ${item.percentageformatted?`<small>${esc(item.percentageformatted)}</small>`:''}</td><td>${item.feedback?esc(UI.plain(item.feedback)):'—'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Оцінок поки немає.</p>'}</section>`).join('') || '<p>Оцінок поки немає.</p>';
      } else {
        const data=await UI.api('/api/assignments'+selected);if(!target.isConnected)return;
        const items=data.assignments||[], now=Date.now()/1000;
        const links=items.map(item=>[item.course_id,item.course_name]);const courseOptions=[...new Map(links)];
        target.innerHTML=`<div class="collection-toolbar"><label class="compact-select">Термін<select data-deadline-period><option value="upcoming">Майбутні</option><option value="all">Усі</option><option value="past">Минулі</option></select></label>${!courseId?`<label class="compact-select">Курс<select data-deadline-course><option value="">Усі курси</option>${courseOptions.map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('')}</select></label>`:''}</div><div class="deadline-list">${items.map(item=>{
          const link=UI.safeLink(profile.moodle_url)&&item.cmid?new URL(`/mod/assign/view.php?id=${Number(item.cmid)}`,profile.moodle_url).href:null;
          return `<article class="deadline-item" data-deadline data-past="${!!item.duedate && item.duedate<now}" data-course="${item.course_id}"><span class="deadline-date">${item.duedate?esc(UI.date(item.duedate,true)):'Без терміну'}</span><div><h3>${esc(item.name)}</h3>${!courseId?`<p>${esc(item.course_name)}</p>`:''}${item.intro?`<details><summary>Деталі</summary><p>${esc(UI.plain(item.intro))}</p></details>`:''}</div>${link?`<a class="text-button" href="${esc(link)}" target="_blank" rel="noopener noreferrer">У Moodle ↗</a>`:''}</article>`;
        }).join('')}</div><p data-deadline-empty hidden>У цьому періоді дедлайнів немає.</p>`;
        const filter=()=>{const period=target.querySelector('[data-deadline-period]').value,course=target.querySelector('[data-deadline-course]')?.value;const rows=[...target.querySelectorAll('[data-deadline]')];rows.forEach(row=>row.hidden=(period==='upcoming'&&row.dataset.past==='true')||(period==='past'&&row.dataset.past==='false')||!!course&&row.dataset.course!==course);target.querySelector('[data-deadline-empty]').hidden=rows.some(row=>!row.hidden);};
        target.addEventListener('change',filter);filter();
      }
    }catch(err){if(target.isConnected)target.innerHTML=`<div role="alert" class="live-error">${esc(err.message)} <button class="text-button" data-academic-retry>Повторити</button><a class="text-button" href="connect.html">Перепідключити LMS</a></div>`;target.querySelector('[data-academic-retry]')?.addEventListener('click',()=>academic(target,courseId,profile,section));}
  }
  function activity(value) {return `<nav class="segment-control" aria-label="Активність курсу"><a href="${UI.courseLink(value.course.course_id,'assignments')}" ${UI.route().section!=='grades'?'aria-current="page"':''}>Дедлайни</a><a href="${UI.courseLink(value.course.course_id,'grades')}" ${UI.route().section==='grades'?'aria-current="page"':''}>Оцінки</a></nav><div id="academic-content"></div>`;}
  async function events(target) {
    try{const list=await UI.api('/api/workspace/events');if(!target.isConnected)return;const types={'workspace.synced':'Матеріали синхронізовано','topic.update_available':'Зміни в матеріалах','mix.ready':'Конспект готовий'};
      target.innerHTML=list.filter(e=>e.type!=='system.connected').slice().reverse().slice(0,12).map(e=>`<div class="event-row"><span>${esc(types[e.type]||e.title)}</span><small>${esc(UI.date(e.timestamp,true))}</small>${e.data?.course_id?`<a class="text-button" href="#course/${Number(e.data.course_id)}">До курсу →</a>`:''}</div>`).join('')||'<p class="muted">Оновлень поки немає.</p>';
    }catch(err){if(target.isConnected)target.textContent=err.message;}
  }
  async function structure() {
    showDialog('Структура матеріалів',`<form class="import-form" id="structure-request"><label>Цільовий бал<input type="number" min="1" max="100" name="target" value="${bundle.organization?.target_score||85}" required></label><details class="source-tree"><summary>Власний силабус</summary><label>Теми й зміст курсу<textarea name="syllabus"></textarea></label></details><button class="primary" type="submit">Переглянути структуру →</button></form>`);
  }
  body.addEventListener('submit',async event=>{
    if(event.target.id!=='structure-request'&&event.target.id!=='structure-confirm')return;event.preventDefault();const form=event.target, button=form.querySelector('[type=submit]'),error=body.querySelector('[data-course-error]');button.disabled=true;error.textContent='';
    const epoch=modalVersion;
    try {
      if(form.id==='structure-request') {
        button.textContent='Визначаємо теми…';
        const payload={course_id:bundle.course.course_id,title:bundle.course.title,authority:bundle.course.authority,target_score:Number(form.elements.target.value),custom_syllabus_text:form.elements.syllabus?.value.trim()||null,tools_config:bundle.tools_config};
        preview=await UI.post('/api/workspace/courses/preview-structure',payload);
        if(!dialog.open||modalVersion!==epoch)return;
        if(!preview.topics?.length)throw new Error('Не вдалося визначити теми. Додай силабус.');
        showDialog('Структура матеріалів',`<form id="structure-confirm" class="import-form"><ol class="structure-preview">${preview.topics.map((t,i)=>`<li><label>Тема ${i+1}<input data-topic-title="${i}" value="${esc(t.title)}" required maxlength="220"></label><p>${esc(t.summary)}</p>${t.key_concepts?.length?`<div class="concept-tags">${t.key_concepts.map(c=>`<span>${esc(c)}</span>`).join('')}</div>`:''}</li>`).join('')}</ol><button class="primary" type="submit">Застосувати структуру →</button></form>`);
      } else {
        const topics=preview.topics.map((t,i)=>({...t,title:form.querySelector(`[data-topic-title="${i}"]`).value.trim()}));
        await UI.post('/api/workspace/courses/confirm-structure',{...preview,topics});dialog.close();UI.toast('Матеріали впорядковано');const url=UI.courseLink(bundle.course.course_id,'materials');if(location.hash===url)emit();else location.hash=url;
      }
    }catch(err){error.textContent=err.message;button.textContent=form.id==='structure-request'?'Переглянути структуру →':'Застосувати структуру →';}finally{button.disabled=false;}
  });
  main.addEventListener('submit',async event=>{
    if(event.target.id!=='course-tools')return;event.preventDefault();const form=event.target,status=form.querySelector('[data-tools-status]'),button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='Оновлюємо інструменти…';
    const config=Object.fromEntries(tools.map(([key])=>[key,form.elements[key].checked]));
    try {await UI.api(`/api/workspace/courses/${bundle.course.course_id}/tools`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});UI.toast('Інструменти збережено');emit();}catch(err){status.textContent=err.message;}finally{button.disabled=false;}
  });
  main.addEventListener('click',async event=>{
    if(event.target.closest('[data-structure]'))structure();
    const action=event.target.closest('[data-sync-course],[data-check-updates],[data-regenerate],[data-ack-topic]');if(!action)return;
    const status=main.querySelector('[data-course-action-status]')||action.parentElement.querySelector('[role=status]');action.disabled=true;if(status)status.textContent='Оновлюємо…';
    try {
      const id=bundle.course.course_id;let response;
      if(action.hasAttribute('data-sync-course'))response=await UI.post(`/api/workspace/courses/${id}/sync-moodle`,{course_title:bundle.course.title,tools_config:bundle.tools_config});
      else if(action.hasAttribute('data-check-updates')) {response=await UI.post(`/api/workspace/courses/${id}/check-updates?force=true`,{});if(!response.checked)throw new Error(response.error||response.message||'Не вдалося перевірити оновлення.');}
      else if(action.hasAttribute('data-ack-topic')) {
        if(bundle.course.source_type!=='manual_upload')await UI.post(`/api/workspace/courses/${id}/sync-moodle`,{course_title:bundle.course.title,tools_config:bundle.tools_config});
        response=await UI.post(`/api/workspace/mixes/${encodeURIComponent(action.dataset.ackTopic)}/ack-update`,{});
      }
      else response=await UI.post(`/api/workspace/courses/${id}/generate`,{});
      UI.toast(response.message||'Матеріали оновлено');emit();
    }catch(err){if(status)status.textContent=err.message;else UI.toast(err.message);}finally{action.disabled=false;}
  });
  main.addEventListener('toggle',async event=>{
    const panel=event.target;if(!panel.matches('[data-source-files]')||!panel.open||panel.dataset.loaded)return;
    panel.dataset.loaded='true';const target=panel.querySelector('[data-file-list]');target.innerHTML='<p role="status">Завантажуємо…</p>';
    try {
      const data=await UI.api(`/api/courses/${bundle.course.course_id}/files`);if(!target.isConnected)return;
      const files=(data.files||[]).filter(f=>f.is_safe);
      target.innerHTML=files.length?`<div class="page-actions"><button class="secondary" data-download-file="/api/courses/${bundle.course.course_id}/files/archive" data-filename="hustle-course-${bundle.course.course_id}.zip">Завантажити всі ↓</button></div><div class="source-file-list">${files.map(f=>`<div class="source-file-row"><span>${esc(f.filename)}</span><button class="icon-button" data-download-file="${esc(f.download_api)}" data-filename="${esc(f.filename)}" aria-label="Завантажити ${esc(f.filename)}">↓</button></div>`).join('')}</div>`:'<p class="muted">Файлів для завантаження немає.</p>';
    }catch(err){panel.dataset.loaded='';target.innerHTML=`<p role="alert">${esc(err.message)}</p>`;}
  },true);
  main.addEventListener('click',async event=>{
    const button=event.target.closest('[data-download-file]');if(!button)return;
    button.disabled=true;const label=button.textContent;button.textContent='…';
    try {
      const response=await fetch(button.dataset.downloadFile,{credentials:'same-origin'});
      if(!response.ok){const error=await response.json().catch(()=>null);throw new Error(error?.detail||'Не вдалося завантажити файл.');}
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;const disposition=response.headers.get('content-disposition')||'';const encoded=disposition.match(/filename\*=UTF-8''([^;]+)/i),plain=disposition.match(/filename="?([^";]+)/i);link.download=encoded?decodeURIComponent(encoded[1]):plain?plain[1]:button.dataset.filename||'hustle.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(err){UI.toast(err.message);}finally{button.disabled=false;button.textContent=label;}
  });
  function mount(value,section,profile) {bundle=value;account=profile;const epoch=++version;clearTimeout(jobTimer);if(section==='manage')jobs(main.querySelector('[data-jobs]'),epoch);if(['assignments','grades'].includes(section))academic(main.querySelector('#academic-content'),bundle.course.course_id,account,section);}
  window.HustleCourse={manage,activity,mount,academic,events};
})();
