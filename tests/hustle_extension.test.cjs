const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const root = path.resolve(__dirname, '../extension');
function harness() {
 const data={}, listeners=[], requests=[], opened=[];
 const hooks={cookie:null};
 const chrome={storage:{local:{get:async keys=>Object.fromEntries(keys.map(key=>[key,data[key]])),set:async patch=>Object.assign(data,patch)}},runtime:{onMessage:{addListener:fn=>listeners.push(fn)},onInstalled:{addListener:()=>{}}},cookies:{get:async()=>hooks.cookie,onChanged:{addListener:()=>{}}},tabs:{onUpdated:{addListener:()=>{}},create:async tab=>opened.push(tab),query:async()=>[]},scripting:{executeScript:async()=>{}}};
 const ctx=vm.createContext({chrome,URL,TextEncoder,crypto:webcrypto,console,fetch:async(url,options)=>{
  requests.push({url,options});let result={success:true};
  if(url.endsWith('/session'))result={workspace_token:'test-workspace',auth_mode:'moodle'};
  if(url.endsWith('/extension'))result={workspace_url:'/custom/courses/17',summary:{course_id:17}};
  return {ok:true,status:200,json:async()=>result};
 }});
 ctx.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx));
 vm.runInContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),ctx);
 async function send(message,sender={}) {
  return await new Promise(resolve=>{let handled=false;for(const fn of listeners)handled=fn(message,sender,resolve)||handled;if(!handled)resolve(null);});
 }
 return {ctx,data,hooks,requests,opened,send};
}
test('does not transfer Moodle cookies before explicit connection',async()=>{
 const h=harness();const result=await vm.runInContext("pairMoodleCookie('https://learn.ucu.edu.ua','fake-cookie',null,true)",h.ctx);
 assert.equal(result.success,false);assert.equal(h.requests.length,0);
});
test('bridge rejects untrusted sites and non-Hustle paths',async()=>{
 const h=harness();for(const url of ['https://untrusted.example/hustle/','http://127.0.0.1:8000/other']) {
  assert.equal(await h.send({type:'HUSTLE_CONNECT',moodleOrigin:'https://learn.ucu.edu.ua'},{url,tab:{id:1}}),null);
 }
 assert.equal(h.requests.length,0);assert.equal(h.data.hustleConnections,undefined);
 assert.equal(vm.runInContext("sanitizePortalUrl('https://untrusted.example')",h.ctx),null);
});
test('explicit connection opens Moodle when login is needed',async()=>{
 const h=harness();const result=await h.send({type:'HUSTLE_CONNECT',moodleOrigin:'https://learn.ucu.edu.ua'},{url:'http://127.0.0.1:8000/hustle/connect.html',tab:{id:1}});
 assert.equal(result.requiresLogin,true);assert.equal(result.paired,false);assert.equal(h.opened[0].url,'https://learn.ucu.edu.ua/my/');assert.equal(h.requests.length,0);
});
test('bridge reports connection without exposing session data to page',async()=>{
 const h=harness();h.hooks.cookie={value:'fake-cookie'};
 const result=await h.send({type:'HUSTLE_CONNECT',moodleOrigin:'https://learn.ucu.edu.ua'},{url:'http://localhost:8000/hustle/connect.html',tab:{id:1}});
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{success:true,paired:true});
 assert.equal(h.requests[0].url,'http://localhost:8000/api/auth/extension-pair');
});
test('course sync resolves current owner after pairing and opens Hustle',async()=>{
 const h=harness();h.hooks.cookie={value:'fake-cookie'};h.data.hustleConnections={'https://learn.ucu.edu.ua':'http://127.0.0.1:8000'};
 const result=await h.send({type:'SYNC_COURSE',payload:{moodle_url:'https://learn.ucu.edu.ua',course_id:17,sections:[]}});
 assert.equal(result.success,true);
 assert.deepEqual(h.requests.map(r=>new URL(r.url).pathname),['/api/auth/extension-pair','/api/workspace/session','/api/sync/extension']);
 assert.equal(h.opened[0].url,'http://127.0.0.1:8000/hustle/app.html#course/17');
});
