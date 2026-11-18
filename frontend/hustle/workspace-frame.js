/* Stable global navigation, contextual course index, and a visible location. */
(() => {
  const {escape:esc,icon}=UI;
  const clean=value=>HustleCurriculum.text(value);
  const labels={dashboard:'Сьогодні',courses:'Мої курси',deadlines:'Дедлайни',settings:'Налаштування',overview:'Карта курсу',materials:'Матеріали',practice:'Практика',exam:'До іспиту',assignments:'Дедлайни',grades:'Оцінки',manage:'Параметри курсу'};
  const expanded=new Map(),positions=new Map();let owner='',currentContext='';
  function ancestors(bundle,node){
    const list=[],seen=new Set();let next=HustleCurriculum.find(bundle,node?.parent_id);
    while(next&&!seen.has(next.id)){seen.add(next.id);list.unshift(next);next=HustleCurriculum.find(bundle,next.parent_id);}return list;
  }
  function index(bundle,node,selected,parents,depth=0){
    const children=node.children.map(id=>HustleCurriculum.find(bundle,id)).filter(Boolean);
    const name=node.title==='Lecture'?'Лекція':node.title==='Lab'?'Практична робота':node.title;
    const route=HustleCurriculum.link(bundle,node),active=selected?.id===node.id;
    if(!children.length)return `<a class="rail-topic" href="${route}" ${active?'aria-current="page"':''} title="${esc(name)}"><span class="rail-node-dot" aria-hidden="true"></span><span>${esc(name)}</span></a>`;
    const stateKey=bundle.course.course_id+':'+node.id;
    const isOpen=active||parents.has(node.id)||expanded.get(stateKey)||false;
    return `<details class="rail-branch" data-rail-key="${esc(stateKey)}" ${isOpen?'open':''}><summary><span class="rail-chevron" aria-hidden="true">›</span><span>${esc(name)}</span></summary><div class="rail-children"><a class="rail-chapter-link" href="${route}" ${active?'aria-current="page"':''}>Огляд розділу</a>${children.map(child=>index(bundle,child,selected,parents,depth+1)).join('')}</div></details>`;
  }
  function mount(main,account,courses,bundle){
    if(owner!==account.owner_id){owner=account.owner_id;expanded.clear();positions.clear();currentContext='';}
    document.body.classList.add('open-workspace');
    const sidebar=document.querySelector('#sidebar'),navigation=document.querySelector('#workspace-nav');
    const settings=navigation.querySelector('[data-nav="settings"]');
    if(settings)document.querySelector('.sidebar-bottom').prepend(settings);
    const today=navigation.querySelector('[data-nav="dashboard"] span');if(today)today.textContent='Сьогодні';
    let rail=sidebar.querySelector('[data-workspace-rail]');
    if(!rail){rail=document.createElement('nav');rail.className='workspace-rail';rail.dataset.workspaceRail='';navigation.after(rail);rail.addEventListener('change',event=>{if(event.target.matches('[data-course-switch]')&&event.target.value)location.hash=event.target.value;});}
    if(currentContext)positions.set(currentContext,rail.scrollTop);
    const route=UI.route(),reading=bundle?.course_map&&route.section==='reading';
    const selected=reading?HustleCurriculum.selected(bundle):null;
    if(selected){
      const heading=main.querySelector('.reader-heading>h2');
      if(heading&&['Lecture','Lab'].includes(selected.title)){
        const parent=HustleCurriculum.find(bundle,selected.parent_id);
        heading.textContent=(selected.title==='Lecture'?'Лекція':'Практична робота')+(parent?' · '+parent.title.replace(/^Module\s+\d+\.\s*/i,''):'');
      }
      const mix=bundle.topic_mixes.find(item=>item.mix_id===selected.mix_id);
      if(mix?.has_upstream_update){
        const banner=document.createElement('div');banner.className='update-banner';
        banner.innerHTML=`<span>Є нові матеріали</span><button class="secondary" data-ack-topic="${esc(mix.mix_id)}">Оновити конспект ↻</button><p role="status"></p>`;
        main.querySelector('.reader-heading')?.append(banner);
      }
      main.querySelectorAll('.reader-block').forEach((element,i)=>{
        const block=selected.book_sections[i],url=UI.safeLink(block?.visual_card_url);
        if(!url&&!block?.visual_card_caption)return;
        const figure=document.createElement(url?'figure':'aside');figure.className=url?'visual-explanation':'concept-card';
        if(url){const img=document.createElement('img');img.src=url;img.alt=block.visual_card_caption||block.heading;img.loading='lazy';img.referrerPolicy='no-referrer';figure.append(img);}
        if(block.visual_card_caption){const caption=document.createElement(url?'figcaption':'p');caption.textContent=block.visual_card_caption;figure.append(caption);}
        element.append(figure);
      });
    }
    currentContext=bundle?'course:'+bundle.course.course_id:'courses';
    if(bundle?.course_map){
      const parents=new Set(ancestors(bundle,selected).map(n=>n.id));
      rail.setAttribute('aria-label','Зміст курсу');
      const roots=bundle.course_map.roots.map(id=>HustleCurriculum.find(bundle,id)).filter(Boolean);
      rail.innerHTML=`<div class="rail-heading"><span>Зміст курсу</span><a href="${UI.courseLink(bundle.course.course_id)}" class="icon-button" aria-label="Відкрити карту курсу">${icon('courses')}</a></div>${roots.map(node=>index(bundle,node,selected,parents)).join('')}`;
      rail.querySelectorAll('[data-rail-key]').forEach(detail=>detail.addEventListener('toggle',()=>expanded.set(detail.dataset.railKey,detail.open)));
      const switcher=main.querySelector('.course-switch');if(switcher)rail.prepend(switcher);
    }else{
      rail.setAttribute('aria-label','Швидкий перехід до курсу');
      rail.innerHTML=`<div class="rail-heading"><span>Курси</span><a href="#courses" class="icon-button" aria-label="Усі курси">${icon('arrow')}</a></div>${courses.map(c=>`<a class="rail-course ${HustleSpace.tone(c.course_id)}" href="${UI.courseLink(c.course_id)}" title="${esc(clean(c.title))}"><span aria-hidden="true"></span><span>${esc(clean(c.title))}</span></a>`).join('')}`;
    }
    rail.scrollTop=positions.get(currentContext)||0;
    if(selected){const target=rail.querySelector('[aria-current="page"]');if(target&&(target.offsetTop<rail.scrollTop||target.offsetTop>rail.scrollTop+rail.clientHeight-60))rail.scrollTop=Math.max(0,target.offsetTop-rail.offsetTop-rail.clientHeight/3);}
    let path=document.querySelector('[data-workspace-path]');
    if(!path){path=document.createElement('nav');path.className='workspace-path';path.dataset.workspacePath='';path.setAttribute('aria-label','Шлях сторінки');document.querySelector('#view-name').after(path);}
    const links=bundle?[['#courses','Мої курси'],[UI.courseLink(bundle.course.course_id),clean(bundle.course.title)],...ancestors(bundle,selected).map(n=>[HustleCurriculum.link(bundle,n),n.title]),[null,selected?.title||labels[route.section]||'Карта курсу']]:[[null,labels[route.view]||'Мої курси']];
    path.innerHTML=links.map(([url,name],i)=>`${i?'<span class="path-separator" aria-hidden="true">/</span>':''}${url?`<a href="${url}" title="${esc(name)}">${esc(name)}</a>`:`<span aria-current="page" title="${esc(name)}">${esc(name)}</span>`}`).join('');
    if(route.view==='dashboard')document.title='Сьогодні — Hustle';
    if(bundle)document.title=clean(bundle.course.title)+' — Hustle';
  }
  window.HustleFrame={mount};
})();
