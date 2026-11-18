/* A working overview for each course. The complete course map remains in Topics. */
(() => {
  const {escape:esc,icon}=UI;
  const clean=value=>HustleCurriculum.text(value);
  const {agenda,taskTitle,fetchAssignments,linkedNode,target,dueLabel,taskRow}=HustleToday;
  const originalOverview=HustleSpace.overview,originalRender=HustleLearning.renderBundle,originalMount=HustleCourse.mount;
  let owner='',history={},active=null;
  const live=state=>active===state&&state.root.isConnected;
  const external=url=>url.startsWith('http')?'target="_blank" rel="noopener noreferrer"':'';
  const topicsLink=bundle=>UI.courseLink(bundle.course.course_id,'topics');
  const nodeLink=(bundle,node)=>bundle.course_map?HustleCurriculum.link(bundle,node):UI.courseLink(bundle.course.course_id,'reading',node.topic_index);

  function orderedTopics(bundle) {
    if(!bundle.course_map)return (bundle.topic_mixes||[]).map(topic=>({...topic,id:'mix-'+topic.mix_id,learnable:true,materials:[]}));
    const nodes=HustleCurriculum.map(bundle),seen=new Set(),result=[];
    function walk(id,hidden=false){
      const node=nodes.find(node=>node.id===id);if(!node||seen.has(id))return;
      seen.add(id);hidden=hidden||['info','resources','archive'].includes(node.kind);
      if(node.learnable&&!hidden)result.push(node);
      for(const child of node.children||[])walk(child,hidden);
    }
    for(const id of bundle.course_map.roots||[])walk(id);
    for(const node of nodes)walk(node.id);
    return result;
  }
  function chooseTopic(bundle,focus,saved) {
    const topics=orderedTopics(bundle),linked=focus&&linkedNode(bundle,focus);
    if(linked&&(linked.learnable||linked.kind==='assessment'))return {node:linked,reason:'assignment'};
    const recent=topics.find(node=>saved&&(node.id===saved.nodeId||(saved.topicIndex!=null&&node.topic_index!=null&&String(node.topic_index)===String(saved.topicIndex))));
    if(recent)return {node:recent,reason:'recent'};
    return {node:topics[0]||null,reason:'first'};
  }
  function quizFor(node,now=Date.now()/1000) {
    const visible=(node?.materials||[]).filter(material=>material.modname==='quiz'&&![false,0,'0'].includes(material.uservisible)&&![false,0,'0'].includes(material.visible)&&material.isoverallcomplete!==true&&![1,2].includes(Number(material.completiondata?.state)));
    const available=visible.filter(material=>(!Number(material.timeopen)||Number(material.timeopen)<=now)&&(!Number(material.timeclose)||Number(material.timeclose)>now));
    return available.find(material=>UI.safeLink(material.url))||null;
  }
  function titleFor(bundle,node) {
    if(!node)return '';
    const parent=bundle.course_map&&HustleCurriculum.find(bundle,node.parent_id);
    return /^(Lecture|Lab)$/i.test(node.title)&&parent?`${node.title.toLowerCase()==='lecture'?'Лекція':'Практична робота'} · ${parent.title}`:node.title;
  }
  function setAccount(account) {
    const next=account.owner_id||'';if(next===owner)return;
    owner=next;active=null;history={};
    try{const saved=JSON.parse(sessionStorage.getItem('hustle:course-reading:'+owner));if(saved&&typeof saved==='object'&&!Array.isArray(saved))history=saved;}catch{}
  }
  function remember(bundle) {
    const node=bundle.course_map?HustleCurriculum.selected(bundle):orderedTopics(bundle).find(node=>String(node.topic_index)===UI.route().topic);
    if(!owner||!node?.learnable)return;
    history[bundle.course.course_id]={nodeId:node.id,topicIndex:node.topic_index};
    try{sessionStorage.setItem('hustle:course-reading:'+owner,JSON.stringify(history));}catch{}
  }
  function render(bundle) {
    return `<div class="course-dashboard" data-course-dashboard="${bundle.course.course_id}"><div class="course-now-heading"><h2>Зараз у курсі</h2><a class="text-button" href="${topicsLink(bundle)}">Усі теми ${icon('arrow')}</a></div><div data-learning-connection></div><div class="course-now-grid"><div data-course-focus><section class="today-focus today-loading" aria-busy="true"><p role="status">Завантажуємо справи курсу…</p><span class="today-skeleton" aria-hidden="true"></span></section></div><aside class="today-study course-now-study" data-course-study aria-label="Навчання в курсі"></aside></div><section data-learning-hub aria-label="Навчальні інструменти"></section><section class="course-now-queue" data-course-queue hidden></section><div class="course-now-review" data-course-review></div></div>`;
  }
  function drawFocus(state) {
    const {bundle,model,selection}=state,item=model.focus,node=selection.node,id=bundle.course.course_id;
    const host=state.root.querySelector('[data-course-focus]');
    if(item){
      const late=HustleStudentHome.classify(item)==='late',url=target(state,item),related=linkedNode(bundle,item);
      host.innerHTML=`<article class="today-focus deadline-surface ${late?'is-late':''}" data-course-task="${item.id}"><div class="today-focus-top"><span>${late?'Потребує уваги':'Найближче завдання'}</span><span class="today-deadline">${icon('clock')}<time datetime="${new Date(item.duedate*1000).toISOString()}">${esc(dueLabel(item))}</time></span></div><h2>${esc(taskTitle(item.name))}</h2>${related?`<a class="course-task-context" href="${nodeLink(bundle,related)}">${icon('courses')}${esc(titleFor(bundle,related))}</a>`:''}${late?'<span class="today-missing">Не здано</span>':''}<div class="today-focus-actions"><a class="primary" href="${esc(url)}" ${external(url)}>Відкрити завдання <span aria-hidden="true">↗</span></a><a class="text-button" href="${related?nodeLink(bundle,related):topicsLink(bundle)}">${related?'Матеріали теми':'Теми курсу'} ${icon('arrow')}</a></div>${window.HustleDeadlineVisuals?.edge(item.duedate*1000,false) || ''}</article>`;
    }else if(node){
      const label=selection.reason==='recent'?'Продовжити тему':'Почати з теми';
      host.innerHTML=`<section class="today-focus"><div class="today-focus-top"><span>${label}</span>${state.deadlinesError?'<button class="course-status-retry" data-course-deadline-retry>Дедлайни не завантажено ↻</button>':state.account.moodle_paired&&bundle.course.source_type!=='manual_upload'?'<span class="course-clear-status">Найближчих дедлайнів немає</span>':''}</div><h2>${esc(titleFor(bundle,node))}</h2><div class="today-focus-actions"><a class="primary" href="${nodeLink(bundle,node)}">${selection.reason==='recent'?'Продовжити':'Відкрити тему'} ${icon('arrow')}</a></div></section>`;
    }else{
      host.innerHTML=`<section class="today-focus today-clear"><h2>Матеріали курсу</h2>${state.deadlinesError?'<button class="course-status-retry" data-course-deadline-retry>Повторити завантаження дедлайнів ↻</button>':''}<a class="primary" href="${UI.courseLink(id,'materials')}">Відкрити матеріали ${icon('arrow')}</a></section>`;
    }
  }
  function drawStudy(state,selectedId) {
    const {bundle}=state,topics=orderedTopics(bundle);
    if(state.selection.node&&!topics.some(node=>node.id===state.selection.node.id))topics.unshift(state.selection.node);
    const node=topics.find(node=>node.id===selectedId)||state.selection.node;
    const host=state.root.querySelector('[data-course-study]');
    if(!node){host.hidden=true;state.root.querySelector('.course-now-grid').classList.add('without-study');return;}
    const practiceNode=window.HustleLearningHub?(HustleLearningHub.topics(bundle).find(topic=>topic.mix_id===node.mix_id)||{}):node;
    const quiz=quizFor(node),internalQuiz=practiceNode.quizzes?.length&&node.mix_id,flashcards=practiceNode.flashcards?.length&&node.mix_id;
    const picker=!window.HustleLearningHub&&topics.length>1?`<label class="course-practice-topic">Тема<select data-course-study-topic aria-label="Тема для навчання">${topics.map(topic=>`<option value="${esc(topic.id)}" ${topic.id===node.id?'selected':''}>${esc(titleFor(bundle,topic))}</option>`).join('')}</select></label>`:'';
    let content;
    if(quiz){
      content=`<h2>Квіз до теми</h2>${picker}<h3>${esc(clean(quiz.name))}</h3><a class="today-study-action" href="${esc(UI.safeLink(quiz.url))}" target="_blank" rel="noopener noreferrer">Відкрити квіз <span aria-hidden="true">↗</span></a>`;
    }else if(internalQuiz||flashcards){
      const type=internalQuiz?'quiz':'cards',label=internalQuiz?'Самоперевірка':'Картки';
      content=`<h2>${label}</h2>${picker}<h3>${esc(internalQuiz?UI.countLabel(practiceNode.quizzes.length,'питання','питання','питань'):UI.countLabel(practiceNode.flashcards.length,'картка','картки','карток'))}</h3><button class="today-study-action" data-study="${type}" data-mix="${esc(node.mix_id)}">${internalQuiz?'Почати квіз':'Повторити поняття'} ${icon('arrow')}</button>`;
    }else{
      const resources=(node.materials||[]).filter(m=>!['assign','quiz','label','forum','subsection'].includes(m.modname)&&m.visible!==false&&m.uservisible!==false&&UI.safeLink(m.url||m.download_url)).slice(0,2);
      content=`<h2>Матеріали теми</h2>${picker}${resources.length?`<div class="course-ready-resources">${resources.map(material=>`<a href="${esc(UI.safeLink(material.url||material.download_url))}" target="_blank" rel="noopener noreferrer">${icon('files')}<span>${esc(clean(material.name))}</span><span aria-hidden="true">↗</span></a>`).join('')}</div>`:`<h3>${esc(titleFor(bundle,node))}</h3>`}<a class="today-study-action" href="${nodeLink(bundle,node)}">До матеріалів ${icon('arrow')}</a>`;
    }
    host.innerHTML=`<span class="today-study-icon" aria-hidden="true">${icon(quiz||internalQuiz||flashcards?'practice':'files')}</span>${content}`;
  }
  function drawQueue(state) {
    const {model,bundle}=state,host=state.root.querySelector('[data-course-queue]'),id=bundle.course.course_id;
    host.hidden=!model.queue.length;
    host.innerHTML=model.queue.length?`<div class="today-section-heading"><h2>Далі в курсі</h2><a class="text-button" href="${UI.courseLink(id,'assignments')}">Усі дедлайни ${icon('arrow')}</a></div><div class="today-task-list">${model.queue.slice(0,3).map(item=>taskRow(state,item)).join('')}${model.queue.length>3?`<details class="today-more"><summary>Ще ${UI.countLabel(model.queue.length-3,'справа','справи','справ')} <span aria-hidden="true">⌄</span></summary>${model.queue.slice(3).map(item=>taskRow(state,item)).join('')}</details>`:''}</div>`:'';
    const past=UI.courseLink(id,'assignments'),pastLink=past+(past.includes('?')?'&':'?')+'period=past';
    state.root.querySelector('[data-course-review]').innerHTML=model.check.length?`<a class="text-button" href="${esc(pastLink)}">Статус минулих робіт · ${model.check.length} ${icon('arrow')}</a>`:'';
  }
  async function load(state) {
    const turn=++state.turn;
    const retry=state.root.querySelector('[data-course-deadline-retry]');if(retry){retry.disabled=true;retry.textContent='Перевіряємо…';}
    state.deadlinesError=false;
    let items=[];
    if(state.account.moodle_paired&&state.bundle.course.source_type!=='manual_upload'){
      try{items=await fetchAssignments([state.bundle.course],state.bundle.course.course_id);}
      catch{state.deadlinesError=true;}
    }
    if(!live(state)||turn!==state.turn)return;
    state.model=agenda(items);
    const recent=HustleDashboard.getRecent();
    const saved=history[state.bundle.course.course_id]||(recent?.courseId===String(state.bundle.course.course_id)?{topicIndex:recent.topicIndex}:null);
    state.selection=chooseTopic(state.bundle,state.model.focus,saved);
    drawFocus(state);drawStudy(state);drawQueue(state);
    window.HustleDeadlineVisuals?.mount(state.root);
  }
  function mount(bundle,section,account) {
    originalMount(bundle,section,account);setAccount(account);
    if(section==='reading')remember(bundle);
    const root=document.querySelector(`[data-course-dashboard="${bundle.course.course_id}"]`);
    if(!root)return;
    const state={root,bundle,account,courses:[bundle.course],turn:0};active=state;
    load(state);
    root.addEventListener('change',event=>{if(event.target.matches('[data-course-study-topic]')){drawStudy(state,event.target.value);root.querySelector('[data-course-study-topic]')?.focus({preventScroll:true});}});
    root.addEventListener('click',event=>{if(event.target.closest('[data-course-deadline-retry]'))load(state);});
  }
  HustleSpace.overview=bundle=>UI.route().section==='topics'?originalOverview(bundle):render(bundle);
  HustleLearning.renderBundle=(bundle,section='overview')=>{
    const markup=originalRender(bundle,section==='topics'?'overview':section);
    const template=document.createElement('template');template.innerHTML=markup;
    const tabs=template.content.querySelector('.course-tabs');
    const overview=tabs?.querySelector('a');
    if(overview){
      overview.textContent='Огляд';
      const topics=document.createElement('a');topics.href=topicsLink(bundle);topics.textContent='Теми';overview.after(topics);
      if(['topics','reading'].includes(section)){overview.removeAttribute('aria-current');topics.setAttribute('aria-current','page');}
    }
    // Existing reader links still mean "course map", now reached through Topics.
    template.content.querySelectorAll('.reader-breadcrumbs a,.reader-bottom-nav a,.topic-study-actions>a').forEach(anchor=>{
      if(/Карта курсу|Усі теми/.test(anchor.textContent))anchor.href=topicsLink(bundle);
    });
    return template.innerHTML;
  };
  HustleCourse.mount=mount;
  window.HustleCourseToday={orderedTopics,chooseTopic,quizFor};
})();
