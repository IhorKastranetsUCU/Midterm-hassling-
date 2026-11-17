const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={Intl,Date,Map,Set,URL,UI:{escape:String,icon:()=>''},window:{}};
vm.createContext(context);vm.runInContext(fs.readFileSync('app/static/hustle/student-home.js','utf8'),context);
const {classify,buckets,dayKey}=context.window.HustleStudentHome;
const now=Date.parse('2026-11-18T12:00:00Z')/1000;
test('a past deadline is not proof of an unsubmitted assignment',()=>{
  assert.equal(classify({duedate:now-30,is_overdue:true},now),'check');
  assert.equal(classify({duedate:now-30,submission_status:'unknown'},now),'check');
});
test('submitted work does not become an urgent task',()=>{
  assert.equal(classify({duedate:now-30,submission_status:'submitted'},now),'done');
  assert.equal(classify({duedate:now+30,submission_status:'submitted'},now),'done');
});
test('only confirmed unfinished past work needs attention',()=>{
  for(const status of ['new','draft','reopened'])assert.equal(classify({duedate:now-30,submission_status:status},now),'late');
  assert.equal(classify({duedate:0,submission_status:'new'},now),'upcoming');
});
test('sorts the next deadlines without mutating the source',()=>{
  const items=[{id:1,duedate:0},{id:2,duedate:now+50},{id:3,duedate:now+10},{id:4,duedate:now-50}];
  const before=JSON.stringify(items),result=buckets(items,now);
  assert.deepEqual(Array.from(result.upcoming,i=>i.id),[3,2,1]);
  assert.equal(result.check[0].id,4);assert.equal(JSON.stringify(items),before);
});
test('week selection uses Kyiv midnight',()=>assert.equal(dayKey('2026-11-17T22:30:00Z'),'2026-11-18'));
test('offline assignments cannot be declared missing from an empty online submission',()=>assert.equal(classify({duedate:now-30,submission_status:'new',nosubmissions:1},now),'check'));
