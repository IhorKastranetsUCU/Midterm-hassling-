/* A small overview of actual courses, deadlines and the last opened topic. */
(() => {
  const {escape:esc,icon}=UI;
  let owner='',recent=null;
  function setAccount(account) {
    const next=account.owner_id || '';
    if(next===owner)return;
    owner=next;recent=null;
    try {
      const saved=JSON.parse(sessionStorage.getItem('hustle:reading:'+owner));
      if(saved && /^\d+$/.test(saved.courseId) && /^\d+$/.test(saved.topicIndex) && typeof saved.title==='string')recent=saved;
    } catch {}
  }
  function remember(topic,courseId) {
    if(!owner || !courseId)return;
    recent={courseId:String(courseId),topicIndex:String(topic.topic_index),title:topic.title};
    try {sessionStorage.setItem('hustle:reading:'+owner,JSON.stringify(recent));} catch {}
  }
  function render(courses,buttons) {
    HustleSpace.setCourses(courses);
    const current=recent && courses.find(c=>String(c.course_id)===recent.courseId);
    const ordered=current?[current,...courses.filter(c=>c!==current)]:courses;
    const updated=courses.filter(c=>c.updates_pending>0);
    const today=new Date();
    const date=new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'long'}).format(today);
    const weekday=new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',weekday:'long'}).format(today);
    return `<header class="page-heading dashboard-heading"><div><h1>Дашборд</h1><time datetime="${today.toISOString()}">${esc(weekday)}, ${esc(date)}</time></div><div class="page-actions">${courses.length?buttons:''}</div></header>
      <div class="dashboard-desk"><div class="dashboard-main">
        ${current?`<a class="dashboard-resume ${HustleSpace.tone(current.course_id)}" href="${UI.courseLink(current.course_id,'reading',recent.topicIndex)}"><span class="resume-book" aria-hidden="true">${icon('bookmark')}</span><div><span class="resume-label">Продовжити</span><h2>${esc(recent.title)}</h2><p>${esc(current.title)}</p></div><span class="resume-arrow" aria-hidden="true">${icon('arrow')}</span></a>`:''}
        <section class="dashboard-courses"><div class="dashboard-section-heading"><h2>Курси <span>${courses.length}</span></h2>${courses.length?'<a class="text-button" href="#courses">Усі курси →</a>':''}</div>
          ${courses.length?`<div class="desk-course-list">${ordered.slice(0,4).map(c=>`<a class="desk-course ${HustleSpace.tone(c.course_id)}" href="${UI.courseLink(c.course_id)}"><span class="desk-course-spine" aria-hidden="true">${icon('courses')}</span><div><h3>${esc(c.title)}</h3><span>${esc(UI.countLabel(c.topic_count,'тема','теми','тем'))}</span></div>${c.updates_pending?'<i class="update-dot" aria-label="Є оновлення"></i>':''}${icon('arrow')}</a>`).join('')}</div>`:'<div class="dashboard-empty"><span class="desk-course-spine" aria-hidden="true">'+icon('courses')+'</span><h3>Додай перший курс</h3><div class="page-actions">'+buttons+'</div></div>'}
        </section>
        <section class="dashboard-updates" data-dashboard-activity ${updated.length?'':'hidden'}><div class="dashboard-section-heading"><h2>Оновлення в курсах</h2><span class="updates-count">${updated.length}</span></div><div class="dashboard-update-list">${updated.slice(0,4).map(c=>`<a href="${UI.courseLink(c.course_id)}"><span class="update-dot" aria-hidden="true"></span><span>${esc(c.title)}</span>${icon('arrow')}</a>`).join('')}</div></section>
      </div><aside class="upcoming-note dashboard-agenda" aria-label="Найближчі дедлайни"><div class="note-heading"><h2>Найближче</h2><a class="icon-button" href="#deadlines" aria-label="Усі дедлайни">${icon('arrow')}</a></div><div data-agenda-preview><p class="muted" role="status">Завантажуємо…</p></div></aside></div>`;
  }
  async function loadActivity(target,courses) {
    if(!target)return;
    const labels={'workspace.synced':'Матеріали синхронізовано','topic.update_available':'Зміни в матеріалах','mix.ready':'Конспект готовий'};
    try {
      const events=await UI.api('/api/workspace/events');
      if(!target.isConnected)return;
      const visible=events.filter(e=>labels[e.type] && courses.some(c=>String(c.course_id)===String(e.data?.course_id)))
        .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,4);
      if(!visible.length){target.hidden=!courses.some(c=>c.updates_pending>0);return;}
      target.hidden=false;
      target.innerHTML=`<div class="dashboard-section-heading"><h2>Останні події</h2></div><div class="dashboard-update-list">${visible.map(e=>{
        const c=courses.find(c=>String(c.course_id)===String(e.data.course_id));
        return `<div class="dashboard-event"><div><strong>${esc(labels[e.type])}</strong><p>${esc(c.title)}</p></div><time datetime="${esc(e.timestamp)}">${esc(UI.date(e.timestamp,true))}</time><a class="icon-button" href="${UI.courseLink(c.course_id)}" aria-label="${esc('Відкрити курс '+c.title)}">${icon('arrow')}</a></div>`;
      }).join('')}</div>`;
    } catch {
      if(!target.isConnected)return;
      target.hidden=false;
      const message=document.createElement('div');
      message.className='dashboard-event-error';
      message.innerHTML='<span>Не вдалося завантажити події.</span> <button class="text-button">Повторити ↻</button>';
      target.append(message);
      message.querySelector('button').onclick=()=>{message.hidden=true;loadActivity(target,courses);};
    }
  }
  window.HustleDashboard={setAccount,remember,render,loadActivity,getRecent:()=>recent};
})();
