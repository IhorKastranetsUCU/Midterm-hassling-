async function approvedConnection(moodleOrigin, portalUrl) {
  const stored=await chrome.storage.local.get(['hustleConnections']);
  return stored.hustleConnections?.[moodleOrigin]===portalUrl;
}
async function resolveCurrentWorkspaceHeaders(portalUrl) {
  const response=await fetch(`${portalUrl}/api/workspace/session`,{credentials:'include'});
  if(!response.ok)throw new Error('Відкрий Hustle та увійди повторно.');
  const session=await response.json();
  if(!session.workspace_token)throw new Error('Не вдалося визначити навчальний простір.');
  return {'Content-Type':'application/json','X-Workspace-Token':session.workspace_token};
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=='HUSTLE_CONNECT')return false;
  let portal;
  try {const url=new URL(sender.url);if(!sender.tab || !HUSTLE_CONFIG.portalOrigins.includes(url.origin) || !url.pathname.startsWith('/hustle/'))return false;portal=url.origin;} catch{return false;}
  const moodle=extractMoodleOrigin(message.moodleOrigin);
  if(!moodle) {sendResponse({success:false,error:'Ця LMS поки не підтримується розширенням.'});return false;}
  (async()=>{
    try {
      const stored=await chrome.storage.local.get(['hustleConnections']);
      await chrome.storage.local.set({portalUrl:portal,hustleConnections:{...stored.hustleConnections,[moodle]:portal}});
      const result=await syncCookieForUrl(moodle,portal,true);
      if(result.success)sendResponse({success:true,paired:true});
      else if (result.needsLogin || result.status === 401) {
        await chrome.tabs.create({url:`${moodle}/my/`});
        sendResponse({success:true,paired:false,requiresLogin:true});
      } else sendResponse({success:false,error:"Не вдалося перевірити сесію Moodle. Спробуй ще раз."});
    } catch {sendResponse({success:false,error:'Не вдалося підключити Moodle. Спробуй ще раз.'});}
  })();
  return true;
});
// Enable detection on Hustle tabs that were already open during installation.
chrome.runtime.onInstalled.addListener(async () => {
  for (const origin of HUSTLE_CONFIG.portalOrigins) {
    const tabs = await chrome.tabs.query({url:origin+'/hustle/*'});
    for (const tab of tabs) {
      try {await chrome.scripting.executeScript({target:{tabId:tab.id},files:['hustle-bridge.js']});} catch {}
    }
  }
});
