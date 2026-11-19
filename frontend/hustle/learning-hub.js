/* A visible learning entry point, with a private provider connection. */
(() => {
  const {escape:esc,icon}=UI;
  let current=null;
  const selected=new Map();
  const live=state=>current===state&&state.main.isConnected;
  const placeholder=/Which key concept is explicitly introduced|How many core study items were indexed|AI Engineer will enrich|Which mode builds the cross-topic prep sheet/;
  function topics(bundle) {
    return HustleCourseToday.orderedTopics(bundle).filter(node=>node.mix_id&&node.topic_index!=null).map(node=>({...node,
      quizzes:(node.quizzes||[]).filter(q=>!placeholder.test(q.question+' '+q.explanation)),
      flashcards:(node.flashcards||[]).filter(card=>!/Key Concept #|Core concepts covered/.test(card.front+' '+card.back)),
      book_sections:(node.book_sections||[]).filter(block=>!/This interactive unit organizes material from|Опрацювання матеріалу з \*\*/.test(block.explanation_markdown||''))
    }));
  }
  function keyForm(configured=false) {
    return `<form class="learning-key-form" data-learning-key-form><label>Gemini API key<input name="gemini_key" type="password" required autocomplete="off" spellcheck="false" autocapitalize="none" placeholder="Встав свій API key" aria-describedby="learning-key-error"></label><button class="primary" type="submit">${configured?'Замінити ключ':'Додати свій ключ'} ${icon('arrow')}</button><p id="learning-key-error" class="field-error" role="alert" data-key-error></p></form>`;
  }
  function keyPanel(configured=false,model='',provider=null) {
    const isPersonal = provider?.source === 'personal';
    const hasDefault = Boolean(provider?.server_default_available);
    const subtitle = configured
      ? `${isPersonal ? 'Власний API-ключ' : 'Дефолтний ключ сервера'} · ${model || ''}`.replace(/ · $/, '')
      : 'Додай ключ, щоб створювати конспекти, картки й тести.';
    const controls = configured
      ? `<div class="learning-key-actions" style="display:flex;flex-wrap:wrap;gap:.65rem;align-items:flex-start;margin-top:.65rem;">
          <details><summary>${isPersonal ? 'Замінити свій ключ' : 'Додати свій API-ключ'}</summary>${keyForm(isPersonal)}</details>
          ${isPersonal ? `<button type="button" class="secondary" data-reset-learning-key>${hasDefault ? 'Повернути дефолтний ключ' : 'Видалити свій ключ'}</button>` : ''}
        </div>`
      : keyForm(false);
    return `<section class="learning-connection ${configured?'is-connected':''}" aria-label="Підключення Gemini"><div class="learning-connection-heading"><div><h2>${configured?'Gemini підключено':'Підключи AI для навчання'}</h2><p>${esc(subtitle)}</p></div><a class="text-button" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Отримати ключ ↗</a></div>${controls}</section>`;
  }
  function draw(state) {
    if(!live(state))return;
    const {main,bundle,provider}=state;
    const settings=main.querySelector('[data-learning-settings]');
    if(settings)settings.innerHTML=keyPanel(provider.configured,provider.model,provider);
    const connection=main.querySelector('[data-learning-connection]');
    if(connection)connection.innerHTML=provider.configured?'':keyPanel();
    const buildExam=main.querySelector('[data-build-exam]');
    if(buildExam&&bundle){
      const prepared=topics(bundle).some(node=>node.quizzes.length||node.book_sections.length);
      buildExam.disabled=!provider.configured||!prepared;
      const status=main.querySelector('[data-exam-status]');
      if(status&&!prepared)status.innerHTML=`<a class="text-button" href="${UI.courseLink(bundle.course.course_id)}">Підготувати навчальну тему ${icon('arrow')}</a>`;
    }
    const host=main.querySelector('[data-learning-hub]');
    if(!host||!bundle)return;
    const choices=topics(bundle),key=state.account.owner_id+':'+bundle.course.course_id;
    const node=choices.find(node=>node.id===selected.get(key))||choices[0];
    state.node=node;
    const id=bundle.course.course_id;
    const heading=`<div class="learning-hub-heading"><h2>Навчання</h2>${provider.configured?'<a class="learning-provider-status" href="#settings">Gemini підключено '+icon('check')+'</a>':''}</div>`;
    if(!node){host.innerHTML=heading+`<div class="learning-empty"><p>Додай матеріали теми, щоб підготувати заняття.</p><a class="secondary" href="${UI.courseLink(id,'materials')}">Матеріали курсу ${icon('arrow')}</a></div>`;return;}
    const topicPicker=`<label class="learning-topic-picker">Тема<select data-learning-topic aria-label="Тема навчання">${choices.map(item=>`<option value="${esc(item.id)}" ${node.id===item.id?'selected':''}>${esc(item.title)}</option>`).join('')}</select></label>`;
    const reading=bundle.course_map?HustleCurriculum.link(bundle,node):UI.courseLink(id,'reading',node.topic_index);
    const disabled=!provider.configured||state.busy?'disabled':'';
    function tile(type,label,symbol,count,unit) {
      const ready=count>0;
      const inner=`<span class="learning-tool-icon">${icon(symbol)}</span><strong>${label}</strong><span>${ready?UI.countLabel(count,...unit):'Підготувати'}</span>${icon('arrow')}`;
      if(type==='reading'&&ready)return `<a class="learning-tool" href="${reading}">${inner}</a>`;
      return `<button class="learning-tool" ${ready?`data-study="${type}" data-mix="${esc(node.mix_id)}"`:`data-prepare-learning="${type}" ${disabled}`}>${inner}</button>`;
    }
    const examReady=choices.some(item=>item.quizzes.length||item.book_sections.length);
    const examInner=`<span class="learning-tool-icon">${icon('plan')}</span><strong>До іспиту</strong><span>Підготовка з тем курсу</span>${icon('arrow')}`;
    const exam=examReady?`<a class="learning-tool" href="${UI.courseLink(id,'exam')}">${examInner}</a>`:`<button class="learning-tool" data-prepare-learning="exam" ${disabled}>${examInner}</button>`;
    const hasGenerated=Boolean(node.book_sections.length||node.flashcards.length||node.quizzes.length);
    const canPrepare=provider.configured&&(!node.quizzes.length||!node.flashcards.length||!node.book_sections.length);
    const footerActions=[
      hasGenerated?`<button class="text-button danger-text" data-clear-learning="topic" ${state.busy?'disabled':''}>Очистити згенероване</button>`:'',
      canPrepare?`<button class="text-button" data-prepare-learning="all" ${state.busy?'disabled':''}>Підготувати тему ${icon('arrow')}</button>`:''
    ].filter(Boolean).join('');
    const oralTile=`<button class="learning-tool" data-oral-defense data-course-id="${esc(id)}" data-topic-index="${esc(node.topic_index??1)}" data-node-id="${esc(bundle.course_map ? node.id : '')}" data-topic-title="${esc(node.title)}"><span class="learning-tool-icon">${icon('practice')}</span><strong>Усний захист</strong><span>Жива розмова з AI</span>${icon('arrow')}</button>`;
    host.innerHTML=heading+topicPicker+`<div class="learning-tools">${tile('reading','Конспект','files',node.book_sections.length,['розділ','розділи','розділів'])}${tile('cards','Картки','courses',node.flashcards.length,['картка','картки','карток'])}${tile('quiz','Самоперевірка','practice',node.quizzes.length,['питання','питання','питань'])}${oralTile}${exam}</div><div class="learning-hub-footer"><p role="status" data-learning-progress>${state.busy?esc(state.busyLabel||'Готуємо конспект, картки й запитання…'):''}</p>${footerActions?`<div class="learning-hub-actions">${footerActions}</div>`:''}</div><p class="field-error" role="alert" data-learning-error>${esc(state.error||'')}</p>`;
  }
  async function load(state) {
    try{state.provider=await UI.api('/api/workspace/learning/settings');draw(state);}
    catch(error){
      if(!live(state))return;
      const host=state.main.querySelector('[data-learning-settings],[data-learning-connection]');
      if(host)host.innerHTML=`<p role="alert" class="learning-load-error">${esc(error.message)} <button class="text-button" data-learning-retry>Повторити</button></p>`;
    }
  }
  async function connect(state,form) {
    const input=form.elements.gemini_key,button=form.querySelector('[type=submit]'),error=form.querySelector('[data-key-error]');
    const key=input.value.trim();if(!key||button.disabled)return;
    button.disabled=true;input.disabled=true;error.textContent='';button.textContent='Перевіряємо…';
    try{
      const response=await UI.api('/api/workspace/learning/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:key})});
      input.value='';
      if(!live(state))return;
      state.provider=response;draw(state);UI.toast('Gemini підключено');
      state.main.querySelector('[data-learning-hub] h2')?.setAttribute('tabindex','-1');
      state.main.querySelector('[data-learning-hub] h2')?.focus({preventScroll:true});
    }catch(err){if(form.isConnected)error.textContent=err.message;}
    finally{input.value='';input.disabled=false;button.disabled=false;button.textContent='Підключити';}
  }
  async function prepare(state,destination) {
    if(state.busy||!state.node||!state.provider?.configured)return;
    const node=state.node,bundle=state.bundle;
    state.busy=true;state.busyLabel='Готуємо конспект, картки й запитання…';state.error='';draw(state);
    try{
      await UI.post(`/api/workspace/courses/${bundle.course.course_id}/topics/${node.topic_index}/prepare-learning`,{});
      const fresh=await UI.api(`/api/workspace/courses/${bundle.course.course_id}`);
      if(!live(state))return;
      Object.assign(bundle,fresh);
      state.busy=false;state.busyLabel='';draw(state);
      if(['cards','quiz'].includes(destination))HustleLearning.openTopicPractice(bundle,destination,node.mix_id);
      else if(destination==='exam')location.hash=UI.courseLink(bundle.course.course_id,'exam');
      else if(destination==='reading')location.hash=bundle.course_map?HustleCurriculum.link(bundle,node):UI.courseLink(bundle.course.course_id,'reading',node.topic_index);
      else UI.toast('Тема готова до навчання');
    }catch(error){if(live(state)){state.error=error.message;state.busy=false;state.busyLabel='';draw(state);}}
  }
  async function clearTopic(state) {
    if(state.busy||!state.node)return;
    const node=state.node,bundle=state.bundle;
    state.busy=true;state.busyLabel='Очищуємо згенеровані матеріали…';state.error='';draw(state);
    try{
      await UI.api(`/api/workspace/courses/${bundle.course.course_id}/topics/${node.topic_index}/generated`,{method:'DELETE'});
      const fresh=await UI.api(`/api/workspace/courses/${bundle.course.course_id}`);
      if(!live(state))return;
      Object.assign(bundle,fresh);
      state.busy=false;state.busyLabel='';draw(state);
      UI.toast('Згенеровані матеріали теми очищено');
    }catch(error){if(live(state)){state.error=error.message;state.busy=false;state.busyLabel='';draw(state);}}
  }
  function mount(main,account,bundle) {
    current=null;
    if(!main.querySelector('[data-learning-settings],[data-learning-hub],[data-learning-connection]'))return;
    const state={main,account,bundle,provider:null,busy:false,busyLabel:'',error:''};current=state;
    load(state);
  }
  document.addEventListener('submit',event=>{
    const form=event.target.closest('[data-learning-key-form]');
    if(form&&current){event.preventDefault();connect(current,form);}
  });
  document.addEventListener('change',event=>{
    if(!event.target.matches('[data-learning-topic]')||!current?.bundle)return;
    selected.set(current.account.owner_id+':'+current.bundle.course.course_id,event.target.value);
    current.error='';draw(current);current.main.querySelector('[data-learning-topic]')?.focus({preventScroll:true});
  });
  async function resetKey(state,button) {
    if(state.busy||button.disabled)return;
    button.disabled=true;
    try{
      const response=await UI.api('/api/workspace/learning/settings',{method:'DELETE'});
      if(!live(state))return;
      state.provider=response;draw(state);
      UI.toast(response.configured?'Повернуто дефолтний ключ сервера':'Власний ключ видалено');
    }catch(err){UI.toast(err.message);}
    finally{if(button.isConnected)button.disabled=false;}
  }
  document.addEventListener('click',event=>{
    if(!current)return;
    if(event.target.closest('[data-learning-retry]'))load(current);
    const resetBtn=event.target.closest('[data-reset-learning-key]');if(resetBtn){resetKey(current,resetBtn);return;}
    const clearBtn=event.target.closest('[data-clear-learning]');if(clearBtn&&!clearBtn.disabled){clearTopic(current);return;}
    const button=event.target.closest('[data-prepare-learning]');if(button&&!button.disabled)prepare(current,button.dataset.prepareLearning);
  });
  const originalRender=HustleLearning.renderBundle;
  HustleLearning.renderBundle=(bundle,section)=>{
    let display=bundle;
    if(section==='exam'&&bundle.exam_mix){
      const prepared=topics(bundle).some(node=>node.quizzes.length||node.book_sections.length);
      display={...bundle,exam_mix:prepared?{...bundle.exam_mix,mock_exam_questions:bundle.exam_mix.mock_exam_questions.filter(q=>!placeholder.test(q.question+' '+q.explanation))}:null};
    }
    return originalRender(display,section);
  };
  window.HustleLearningHub={mount,topics,keyPanel};
})();
