const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={Intl,Date,Map,Set,URL,UI:{escape:String,icon:()=>'',courseLink:(id,section,topic)=>`#course/${id}/${section}/${topic}`},HustleCurriculum:{text:value=>String(value||''),map:bundle=>bundle.course_map?.nodes||[],find:(bundle,id)=>bundle.course_map.nodes.find(n=>n.id===id),link:(bundle,node)=>`#course/${bundle.course.course_id}/reading?node=${node.id}`},window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('frontend/hustle/student-home.js','utf8'),context);
context.HustleStudentHome=context.window.HustleStudentHome;
vm.runInContext(fs.readFileSync('frontend/hustle/dashboard-today.js','utf8'),context);
const {agenda,taskTitle,studyTopic,target}=context.window.HustleToday;
const now=Date.parse('2026-11-18T12:00:00Z')/1000;
const task=(id,offset,status='unknown')=>({id,course_id:9400,duedate:now+offset,submission_status:status});
test('the nearest upcoming deadline leads, confirmed missing work stays first in the queue',()=>{
  const result=agenda([task(1,-100,'draft'),task(2,1000),task(3,100)],now);
  assert.equal(result.focus.id,3);
  assert.deepEqual(Array.from(result.queue,item=>item.id),[1,2]);
});
test('each assignment appears once across focus, queue and unknown-status review',()=>{
  const items=[task(1,60),task(1,60),task(2,100),task(2,100),task(3,-100),task(3,-100)];
  const before=JSON.stringify(items),result=agenda(items,now);
  const ids=[result.focus,...result.queue,...result.check].map(item=>item.id);
  assert.equal(ids.length,new Set(ids).size);
  assert.equal(JSON.stringify(items),before);
});
test('submitted work is excluded; elapsed unknown and offline assignments do not become urgent',()=>{
  const result=agenda([task(1,-50),task(2,20,'submitted'),{...task(3,-100,'new'),nosubmissions:1},task(4,1000,'graded')],now);
  assert.equal(result.focus,null);assert.equal(result.queue.length,0);
  assert.deepEqual(Array.from(result.check,item=>item.id),[1,3]);
});
test('known missing work leads when there is no upcoming dated assignment',()=>{
  const result=agenda([task(1,-200,'draft'),task(2,-100,'new'),{...task(3,10),duedate:0}],now);
  assert.equal(result.focus.id,2);assert.deepEqual(Array.from(result.queue,item=>item.id),[1]);
});
test('keeps the queue to seven days while allowing the nearest later deadline as focus',()=>{
  const result=agenda([task(1,20*86400),task(2,22*86400),task(3,-30*86400)],now);
  assert.equal(result.focus.id,1);assert.equal(result.queue.length,0);assert.equal(result.check.length,0);
});
test('assignment identity includes the course',()=>{
  const result=agenda([task(1,10),{...task(1,20),course_id:9458}],now);
  assert.equal(result.focus.course_id,9400);assert.equal(result.queue[0].course_id,9458);
});
test('removes calendar sentence wrappers without changing the assignment title',()=>{
  assert.equal(taskTitle('Строк Seminar 3 спливає'),'Seminar 3');
  assert.equal(taskTitle('Midterm 2 is due.'),'Midterm 2');
  assert.equal(taskTitle('Design patterns'),'Design patterns');
});
test('resumes an actual manual-upload topic without requiring Moodle metadata',()=>{
  const result=studyTopic({course:{course_id:90001},topic_mixes:[{topic_index:4,title:'Середнє та медіана'}]}, {topicIndex:'4'});
  assert.equal(result.title,'Середнє та медіана');assert.equal(result.href,'#course/90001/reading/4');
});
test('does not resume a syllabus as a study topic, and keeps repeated lecture titles in context',()=>{
  const bundle={course:{course_id:9458},course_map:{nodes:[{id:'general',topic_index:0,title:'General',learnable:false},{id:'module-1',title:'Module 1. Classes'},{id:'lecture',topic_index:2,title:'Lecture',parent_id:'module-1',learnable:true}]}};
  assert.equal(studyTopic(bundle,{topicIndex:'0'}),null);
  assert.equal(studyTopic(bundle,{topicIndex:'2'}).title,'Лекція · Module 1. Classes');
});
test('calendar quiz events open the quiz module, not an assignment URL with the same id',()=>{
  context.UI.safeLink=value=>/^https:\/\//.test(value||'')?value:null;
  const state={account:{moodle_url:'https://moodle.example'},bundle:{course_map:{nodes:[{materials:[{id:12,modname:'quiz',url:'https://moodle.example/mod/quiz/view.php?id=12'}]}]}}};
  assert.equal(target(state,{course_id:9400,cmid:12}),'https://moodle.example/mod/quiz/view.php?id=12');
});
