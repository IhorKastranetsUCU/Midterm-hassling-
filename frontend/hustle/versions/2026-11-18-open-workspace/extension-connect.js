(() => {
 const $=s=>document.querySelector(s);
 const pending=new Map(); let installed=false, config, checking=false, waiting=false, busy=false;
 const browserAddress=navigator.userAgent.includes('Edg/')?'edge://extensions':'chrome://extensions';
 $('#extensions-address').textContent=browserAddress;
 function extension(type, extra={}) {
  return new Promise((resolve,reject)=>{
   const id=crypto.randomUUID(); const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Онови сторінку після встановлення розширення.'));},type==='PING'?1200:25000);
   pending.set(id,{resolve,reject,timer});window.postMessage({source:'hustle-page',type,id,...extra},location.origin);
  });
 }
 window.addEventListener('message',event=>{
  if(event.source!==window || event.origin!==location.origin || event.data?.source!=='hustle-extension')return;
  const request=pending.get(event.data.id);if(!request)return;
  clearTimeout(request.timer);pending.delete(event.data.id);
  if(event.data.success)request.resolve(event.data);else request.reject(new Error(event.data.error||'Не вдалося підключитися.'));
 });
 function error(err) {$('#extension-error').textContent=err.message;$('#extension-error').hidden=false;}
 function success() {waiting=false;$('#extension-success').hidden=false;$('#extension-connect-form').hidden=true;$('#extension-install').hidden=true;$('#extension-status').textContent='';$('#extension-error').hidden=true;}
 async function detect() {
  if(checking || document.hidden)return;checking=true;
  try {await extension('PING');installed=true;$('#extension-install').hidden=true;if(!waiting && !busy)$('#extension-status').textContent='Розширення встановлено';}
  catch {installed=false;$('#extension-install').hidden=false;if(!waiting && !busy)$('#extension-status').textContent='Встанови розширення один раз — далі без токенів.';}
  finally {$('#connect-moodle').disabled=!installed||busy;checking=false;}
 }
 async function pollConnection() {
  if(!waiting || document.hidden)return;
  try {
   const account=await UI.api('/api/auth/status');
   if(account.moodle_paired && account.moodle_url?.replace(/\/$/,'')===$('#moodle-origin').value) {
    // Validate the upstream session instead of treating a signed but stale cookie as connected.
    await UI.api('/api/courses'); success();
   }
  } catch { /* Keep waiting for explicit login; never fake a successful pairing. */ }
 }
 $('#extension-connect-form').addEventListener('submit',async event=>{
  event.preventDefault();busy=true;$('#connect-moodle').disabled=true;$('#extension-error').hidden=true;$('#extension-status').textContent='Підключаємо Moodle…';
  try {
   const result=await extension('CONNECT',{moodleOrigin:$('#moodle-origin').value});
   if(result.paired)success();
   else {waiting=true;$('#extension-status').textContent='Увійди у відкритій вкладці Moodle. Підключення з’явиться тут.';$('#connect-moodle').textContent='Увійти в Moodle повторно →';}
  } catch(err) {error(err);$('#extension-status').textContent='Підключення не завершено';}
  finally {busy=false;$('#connect-moodle').disabled=!installed;}
 });
 $('#extension-download').addEventListener('click',()=>{$('#install-guide').open=true;});
 $('#extension-recheck').onclick=()=>location.reload();
 $('#copy-extensions').onclick=async()=>{try {await navigator.clipboard.writeText(browserAddress);$('#copy-extensions').textContent='Скопійовано';}catch {$('#extensions-address').tabIndex=0;$('#extensions-address').focus();}};
 $('#manual-connect-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;$('#extension-error').hidden=true;
  try {
   const url=new URL(form.elements.url.value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Вкажи HTTPS-адресу LMS.');
   await UI.post('/api/auth/login',{moodle_url:url.origin,token:form.elements.token.value.trim()});form.elements.token.value='';success();
  }catch(err){error(err);}finally{button.disabled=false;}
 });
 async function init() {
  try {
   config=await UI.api('/api/hustle/extension');
   $('#moodle-origin').innerHTML=config.moodle_origins.map(origin=>`<option value="${UI.escape(origin)}">${UI.escape(new URL(origin).hostname)}</option>`).join('');
   if(config.store_url) {$('#extension-download').href=config.store_url;$('#extension-download').removeAttribute('download');$('#extension-download').target='_blank';$('#extension-download').rel='noopener noreferrer';$('#extension-download').textContent='Додати в Chrome →';$('#install-guide').hidden=true;}
   await detect();
   const interval=setInterval(()=>{if(!installed)detect();pollConnection();},4000);window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
  }catch(err){error(err);$('#extension-status').textContent='Не вдалося завантажити налаштування розширення.';}
 }
 window.addEventListener('focus',()=>{detect();pollConnection();});init();
})();
