/* A course map and source-first reader. Legacy routes and notes remain valid. */
(() => {
  const {escape:esc,icon}=UI, filters=new Map();
  const labels={lesson:'Лекція',resource:'Файл',folder:'Читання',page:'Текст',book:'Книга',quiz:'Тест',assign:'Завдання',url:'Посилання',forum:'Обговорення'};
  const kinds={info:'Про курс',resources:'Додатково',archive:'Архів',assessment:'Контрольні роботи'};
  const text=value=>UI.plain(UI.plain(value||'')).replace(/\s+/g,' ').trim();
  const map=bundle=>bundle.course_map?.nodes||[];
  const find=(bundle,id)=>map(bundle).find(n=>n.id===id);
  function link(bundle,node,mode='reading') {
    const url=UI.courseLink(bundle.course.course_id,mode,node.topic_index??undefined);
    return url+(url.includes('?')?'&':'?')+'node='+encodeURIComponent(node.id);
  }
  function selected(bundle) {
    const key=new URLSearchParams(location.hash.split('?')[1]||'').get('node');
    const oldModule=key?.match(/-module-(\d+)$/),oldSection=key?.match(/^section-(\d+)$/);
    const alias=oldModule?map(bundle).find(n=>n.materials.some(m=>String(m.id)===oldModule[1])):oldSection?map(bundle).find(n=>String(n.section_index)===oldSection[1]):null;
    return find(bundle,key)||alias||map(bundle).find(n=>String(n.topic_index)===UI.route().topic)||map(bundle).find(n=>n.learnable)||map(bundle)[0];
  }
  function trail(bundle,node) {
    const items=[],seen=new Set();let parent=find(bundle,node.parent_id);
    while(parent&&!seen.has(parent.id)){items.unshift(parent);seen.add(parent.id);parent=find(bundle,parent.parent_id);}
    return items;
  }
  const materials=node=>(node.materials||[]).filter(m=>!['label','subsection'].includes(m.modname)&&m.uservisible!==false);
  function types(node) {
    const count=new Map();for(const m of materials(node))count.set(labels[m.modname]||'Матеріал',(count.get(labels[m.modname]||'Матеріал')||0)+1);
    return [...count].map(([label,n])=>`<span>${esc(label)}${n>1?' · '+n:''}</span>`).join('');
  }
  function row(bundle,node) {
    const path=trail(bundle,node).map(n=>n.title).join(' / ');
    const subtitle=node.title==='Lecture'?'Лекція':node.title==='Lab'?'Практична робота':node.title;
    const number=node.title.match(/^(?:topic|тема)\s*(\d+)/i)?.[1];
    const search=text([node.title,path,node.summary,...materials(node).map(m=>m.name+' '+(m.description||''))].join(' ')).toLocaleLowerCase('uk');
    return `<a class="map-topic" href="${link(bundle,node)}" data-map-row data-map-search="${esc(search)}" data-node-id="${esc(node.id)}"><span class="map-topic-symbol" aria-hidden="true">${number?esc(number.padStart(2,'0')):icon(node.kind==='assessment'?'calendar':'courses')}</span><div><h3>${esc(subtitle)}</h3><div class="map-material-types">${types(node)||'<span>Матеріали розділу</span>'}</div><span class="map-search-path" hidden>${esc(path)}</span></div>${icon('arrow')}</a>`;
  }
  function branch(bundle,node,depth=0) {
    const children=node.children.map(id=>find(bundle,id)).filter(Boolean);
    if(!children.length)return row(bundle,node);
    return `<details class="map-chapter" data-map-branch data-map-id="${esc(node.id)}" ${depth===0?'open':''}><summary><span class="map-chapter-mark" aria-hidden="true">${icon('courses')}</span><h2>${esc(node.title)}</h2><span class="map-chapter-count">${children.length}</span><span class="map-chevron" aria-hidden="true">⌄</span></summary><div class="map-chapter-body">${materials(node).length?row(bundle,{...node,title:'Матеріали розділу'}):''}${children.map(child=>branch(bundle,child,depth+1)).join('')}</div></details>`;
  }
  function overview(bundle) {
    if(!bundle.course_map)return originalOverview(bundle);
    const nodes=map(bundle),roots=bundle.course_map.roots.map(id=>find(bundle,id)).filter(Boolean);
    const main=roots.filter(n=>!['info','resources','archive'].includes(n.kind));
    const extras=roots.filter(n=>['info','resources','archive'].includes(n.kind));
    const term=filters.get(String(bundle.course.course_id))?.term||'';
    return `<section class="course-map" data-course-map="${bundle.course.course_id}"><div class="map-toolbar"><label class="search-field">${icon('search')}<input type="search" data-map-search-input aria-label="Знайти тему або матеріал у курсі" placeholder="Тема, лекція чи завдання…" value="${esc(term)}"></label><span data-map-result role="status">${UI.countLabel(nodes.filter(n=>n.learnable).length,'тема','теми','тем')}</span></div><div class="map-body"><div class="map-main">${main.map(n=>branch(bundle,n)).join('')}<p class="map-no-results" data-map-empty hidden>Нічого не знайдено. Спробуй іншу назву.</p></div><aside class="map-side">${extras.length?`<section class="map-reference"><h2>Під рукою</h2>${extras.map(n=>`<a href="${link(bundle,n)}"><span>${esc(kinds[n.kind])}</span><strong>${esc(n.title)}</strong>${icon('arrow')}</a>`).join('')}</section>`:''}<section class="upcoming-note"><div class="note-heading"><h2>Дедлайни</h2><a class="icon-button" href="${UI.courseLink(bundle.course.course_id,'assignments')}" aria-label="Дедлайни курсу">${icon('arrow')}</a></div><div data-course-agenda><p role="status">Завантажуємо…</p></div></section></aside></div><div data-map-extra-results hidden>${extras.map(n=>branch(bundle,n)).join('')}</div></section>`;
  }
  function resource(bundle,node,m) {
    const url=UI.safeLink(m.url)||UI.safeLink(m.download_url);
    const description=text(m.description||m.text_excerpt);
    const kind=labels[m.modname]||'Матеріал';
    return `<article class="reader-resource" data-reader-search="${esc((m.name+' '+description).toLocaleLowerCase('uk'))}"><span class="resource-type" aria-hidden="true">${icon(m.modname==='assign'?'calendar':m.modname==='quiz'?'practice':'files')}</span><div><h3>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text(m.name))}<span aria-hidden="true"> ↗</span></a>`:esc(text(m.name))}</h3><span>${esc(kind)}</span>${description&&description!==text(m.name)?`<details class="resource-description"><summary>Опис</summary><div>${UI.markdown(m.description||m.text_excerpt)}</div></details>`:''}</div>${m.isoverallcomplete===true?'<span class="source-complete" aria-label="Завершено в Moodle">'+icon('check')+'</span>':''}</article>`;
  }
  function reading(bundle,notesForm) {
    const node=selected(bundle);if(!node)return '';
    const parents=trail(bundle,node),all=map(bundle);
    const siblings=(find(bundle,node.parent_id)?.children||bundle.course_map.roots).map(id=>find(bundle,id)).filter(n=>n?.kind==='topic');
    const mix=bundle.topic_mixes.find(m=>m.mix_id===node.mix_id);
    if(mix&&node.learnable)HustleDashboard.remember(mix,bundle.course.course_id);
    const blocks=node.book_sections||[],resources=materials(node);
    const learn=resources.filter(m=>!['assign','quiz','forum'].includes(m.modname));
    const practice=resources.filter(m=>['assign','quiz'].includes(m.modname));
    const other=resources.filter(m=>m.modname==='forum');
    const sections=[blocks.length&&['explanation','Конспект'],learn.length&&['sources','Матеріали'],practice.length&&['practice','Практика й завдання'],other.length&&['discussion','Обговорення'],mix&&['notes','Мої нотатки']].filter(Boolean);
    const breadcrumbs=`<nav class="reader-breadcrumbs" aria-label="Шлях теми"><a href="${UI.courseLink(bundle.course.course_id)}">Карта курсу</a>${parents.map(p=>`<span aria-hidden="true">/</span><a href="${link(bundle,p)}">${esc(p.title)}</a>`).join('')}<span aria-hidden="true">/</span><span aria-current="page">${esc(node.title)}</span></nav>`;
    return `${breadcrumbs}<div class="structured-reader" data-structured-reader><aside class="reader-index"><h2>У цій темі</h2>${sections.map(([id,label])=>`<button type="button" data-reader-jump="${id}">${label}</button>`).join('')}${blocks.length>1?`<div class="reader-block-links">${blocks.map((b,i)=>`<button data-reader-jump="block-${i}">${esc(text(b.heading))}</button>`).join('')}</div>`:''}${siblings.length>1?`<details class="reader-neighbors"><summary>Поруч у курсі</summary>${siblings.map(n=>`<a href="${link(bundle,n)}" ${n.id===node.id?'aria-current="page"':''}>${esc(n.title)}</a>`).join('')}</details>`:''}</aside><div class="reader-main"><header class="reader-heading"><h2>${esc(node.title)}</h2>${node.summary_markdown?`<div class="reader-intro">${UI.markdown(node.summary_markdown)}</div>`:node.summary&&node.summary!==node.title?`<p>${esc(node.summary)}</p>`:''}<div class="reader-actions">${node.flashcards.length?`<button class="secondary" data-study="cards" data-mix="${esc(node.mix_id)}">Картки ${icon('practice')}</button>`:''}${node.quizzes.length?`<button class="primary" data-study="quiz" data-mix="${esc(node.mix_id)}">Перевірити себе ${icon('arrow')}</button>`:''}</div></header>${node.children.length?`<div class="reader-subtopics">${node.children.map(id=>row(bundle,find(bundle,id))).join('')}</div>`:''}${blocks.length?`<section class="reader-explanation" data-reader-section="explanation"><h2>Конспект</h2>${blocks.map((b,i)=>`<article class="reader-block" data-reader-section="block-${i}"><h3 tabindex="-1">${esc(text(b.heading))}</h3><div class="reader-prose">${UI.markdown(b.explanation_markdown)}</div>${b.key_takeaways?.length?`<aside class="reader-keypoints"><h4>Головне</h4><ul>${b.key_takeaways.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></aside>`:''}${b.mermaid_diagram?`<figure class="diagram" data-diagram="${esc(b.mermaid_diagram)}" aria-label="Схема теми"></figure>`:''}</article>`).join('')}</section>`:''}${[['sources','Матеріали',learn],['practice','Практика й завдання',practice],['discussion','Обговорення',other]].filter(([, ,list])=>list.length).map(([id,title,list])=>`<section class="reader-source-group" data-reader-section="${id}"><div class="section-heading"><h2 tabindex="-1">${title}</h2><span>${list.length}</span></div><div class="reader-resources">${list.map(m=>resource(bundle,node,m)).join('')}</div></section>`).join('')}${!resources.length&&!blocks.length&&!node.children.length?'<div class="reader-empty"><h3>Матеріалів у цьому розділі поки немає</h3></div>':''}${mix?`<section class="reader-notes" data-reader-section="notes">${notesForm(mix)}</section>`:''}<nav class="reader-bottom-nav" aria-label="Навігація теми"><a class="text-button" href="${UI.courseLink(bundle.course.course_id)}">← Карта курсу</a>${siblings.indexOf(node)>=0&&siblings.indexOf(node)<siblings.length-1?`<a class="secondary" href="${link(bundle,siblings[siblings.indexOf(node)+1])}">Наступна тема ${icon('arrow')}</a>`:''}</nav></div></div>`;
  }
  function practiceTopics(bundle) {
    if(!bundle.course_map)return window.HustleLearningHub?HustleLearningHub.topics(bundle):bundle.topic_mixes;
    return map(bundle).filter(n=>n.mix_id&&(n.quizzes.length||n.flashcards.length)).map(n=>({...bundle.topic_mixes.find(m=>m.mix_id===n.mix_id),quizzes:n.quizzes,flashcards:n.flashcards}));
  }
  function practiceOverview(bundle) {
    if(!bundle.course_map)return '';
    const nodes=map(bundle).filter(n=>materials(n).some(m=>['quiz','assign'].includes(m.modname)));
    return nodes.map(node=>`<details class="material-group"><summary class="group-heading"><h2>${esc([...trail(bundle,node).map(n=>n.title),node.title].join(' / '))}</h2><span>${materials(node).filter(m=>['quiz','assign'].includes(m.modname)).length}</span><i aria-hidden="true">⌄</i></summary><div class="reader-resources">${materials(node).filter(m=>['quiz','assign'].includes(m.modname)).map(m=>resource(bundle,node,m)).join('')}<a class="text-button" href="${link(bundle,node)}">До теми →</a></div></details>`).join('');
  }
  function afterRender() {
    const host=document.querySelector('[data-course-map]');if(!host)return;
    const saved=filters.get(host.dataset.courseMap)||{};
    const input=host.querySelector('[data-map-search-input]');
    const draw=()=>{
      const term=input.value.trim().toLocaleLowerCase('uk');let matches=0;
      host.querySelectorAll('[data-map-row]').forEach(row=>{row.hidden=!!term&&!row.dataset.mapSearch.includes(term);if(!row.hidden)matches++;row.querySelector('.map-search-path').hidden=!term;});
      [...host.querySelectorAll('[data-map-branch]')].reverse().forEach(branch=>{branch.hidden=![...branch.querySelectorAll('[data-map-row]')].some(r=>!r.hidden);branch.open=term?!branch.hidden:saved.open?.[branch.dataset.mapId]??branch===host.querySelector('[data-map-branch]');});
      host.querySelector('[data-map-extra-results]').hidden=!term;
      host.querySelector('[data-map-empty]').hidden=matches>0;
      host.querySelector('[data-map-result]').textContent=term?'Знайдено: '+matches:UI.countLabel(host.querySelectorAll('.map-main [data-map-row]').length,'розділ','розділи','розділів');
      filters.set(host.dataset.courseMap,{...saved,term:input.value});
    };
    host.querySelectorAll('[data-map-branch]').forEach(branch=>branch.addEventListener('toggle',()=>{if(!input.value){saved.open={...saved.open,[branch.dataset.mapId]:branch.open};filters.set(host.dataset.courseMap,{...saved,term:''});}}));
    input.addEventListener('input',draw);draw();
  }
  document.querySelector('#workspace-main').addEventListener('click',event=>{
    const jump=event.target.closest('[data-reader-jump]');if(!jump)return;
    const section=document.querySelector(`[data-reader-section="${jump.dataset.readerJump}"]`);if(!section)return;
    section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    const heading=section.querySelector('h2,h3,textarea');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  });
  const originalOverview=HustleSpace.overview;
  HustleSpace.overview=overview;
  window.HustleCurriculum={map,find,link,selected,reading,overview,afterRender,practiceTopics,practiceOverview,text};
})();
