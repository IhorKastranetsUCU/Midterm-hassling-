(() => {
  if (window.__hustleBridgeReady) return;
  window.__hustleBridgeReady = true;
  const respond = (id, data) => window.postMessage({source:'hustle-extension',id,...data},location.origin);
  window.addEventListener('message', event => {
    const message=event.data;
    if(event.source!==window || event.origin!==location.origin || message?.source!=='hustle-page' || typeof message.id!=='string')return;
    if(message.type==='PING') {respond(message.id,{success:true,version:chrome.runtime.getManifest().version});return;}
    if(message.type!=='CONNECT')return;
    chrome.runtime.sendMessage({type:'HUSTLE_CONNECT',moodleOrigin:message.moodleOrigin}, result => {
      if(chrome.runtime.lastError)respond(message.id,{success:false,error:'Онови сторінку після встановлення розширення.'});
      else respond(message.id,result || {success:false,error:'Не вдалося підключитися.'});
    });
  });
})();
