const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={Intl,Date,Map,Set,URL,UI:{escape:String,icon:()=>''},window:{},HustleCurriculum:{text:value=>String(value||'')}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('app/static/hustle/student-home.js','utf8'),context);
context.HustleStudentHome=context.window.HustleStudentHome;
vm.runInContext(fs.readFileSync('app/static/hustle/focused-home.js','utf8'),context);
const {agenda,taskTitle}=context.window.HustleFocus;
const now=Date.parse('2026-11-18T12:00:00Z')/1000;
test('a task appears only once across focus, today, and later',()=>{
  const items=[{id:1,course_id:5,duedate:now-60,submission_status:'draft'},{id:2,course_id:5,duedate:now+60},{id:3,course_id:5,duedate:now+86400}];
  const result=agenda(items,now),keys=[result.focus,...result.remaining,...result.later].map(i=>i.id);
  assert.equal(new Set(keys).size,3);assert.deepEqual(keys,[1,2,3]);
});
test('unknown past and submitted work do not displace the next useful action',()=>{
  const result=agenda([{id:1,course_id:1,duedate:now-60},{id:2,course_id:1,duedate:now+20,submission_status:'submitted'},{id:3,course_id:1,duedate:now+86400}],now);
  assert.equal(result.focus.id,3);assert.equal(result.check.length,1);assert.equal(result.later.length,0);
});
test('Moodle ids in different courses are not collapsed',()=>{
  const result=agenda([{id:1,course_id:1,duedate:now+60},{id:1,course_id:2,duedate:now+120}],now);
  assert.equal(result.remaining.length,1);assert.equal(result.remaining[0].course_id,2);
});
test('empty and undated-only workspaces have no invented priority',()=>{
  assert.equal(agenda([],now).focus,null);assert.equal(agenda([{id:1,course_id:1,duedate:0}],now).focus,null);
});
test('calendar wrapper is omitted without truncating the assignment name',()=>{
  assert.equal(taskTitle('Строк Middle exam 2 — Demo site and report спливає'),'Middle exam 2 — Demo site and report');
  assert.equal(taskTitle('Probability: when time is due to chance'),'Probability: when time is due to chance');
});
