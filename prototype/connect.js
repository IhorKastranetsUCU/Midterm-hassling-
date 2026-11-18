(() => {
  const H=window.Hustle;
  if(!H.requireAccount()) return;
  const address=document.querySelector('#lms-address');
  const sections=['connect-step','sync-step','courses-step'];
  let timer;
  function show(id) { sections.forEach(key=>document.getElementById(key).hidden=key!==id); }
  function showCourses() {
    show('courses-step');
    document.querySelectorAll('[data-stage]').forEach(el=>{ if(el.dataset.stage==='plan')el.setAttribute('aria-current','step');else el.removeAttribute('aria-current'); });
    document.querySelector('#courses-step h1').focus();
  }
  const chosen=H.state.courses.length?H.state.courses:['probability','algebra'];
  document.querySelector('#course-options').innerHTML=window.HustleCourses.map(c=>`<label class="course-option"><input type="checkbox" name="course" value="${c.id}" ${chosen.includes(c.id)?'checked':''}><span class="course-avatar ${c.color}">${c.initials}</span><span><strong>${c.name}</strong><small>${c.materials.length} матеріали</small></span></label>`).join('');
  const minutes=document.querySelector(`[name="minutes"][value="${H.state.minutes}"]`);if(minutes)minutes.checked=true;
  address.value=H.state.school;
  document.querySelector('#lms-form').addEventListener('submit',e=>{
    e.preventDefault();const error=document.querySelector('#lms-error');
    let url;try{url=new URL(address.value.trim());}catch{}
    if(!url||url.protocol!=='https:'||!url.hostname.includes('.')||url.username||url.password){error.textContent='Вкажи HTTPS-адресу університетської LMS.';error.hidden=false;address.setAttribute('aria-invalid','true');address.focus();return;}
    error.hidden=true;address.setAttribute('aria-invalid','false');H.update({school:url.origin});show('sync-step');
    // Simulated import; no request is made to the entered university address.
    timer=setTimeout(showCourses,750);
  });
  document.querySelector('#lms-form button').disabled=false;
  document.querySelector('#courses-form').addEventListener('submit',e=>{
    e.preventDefault();const courses=[...document.querySelectorAll('[name="course"]:checked')].map(el=>el.value);
    const error=document.querySelector('#courses-error');error.hidden=!!courses.length;if(!courses.length)return;
    H.update({courses,minutes:Number(new FormData(e.currentTarget).get('minutes')),ready:true});location.href='app.html';
  });
  document.querySelector('#change-lms').addEventListener('click',()=>{show('connect-step');document.querySelector('[data-stage="plan"]').removeAttribute('aria-current');document.querySelector('[data-stage="lms"]').setAttribute('aria-current','step');address.focus();});
  if(new URLSearchParams(location.search).has('edit'))showCourses();
  window.addEventListener('pagehide',()=>clearTimeout(timer));
})();
