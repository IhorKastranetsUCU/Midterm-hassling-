const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={Date,Intl,Set,Map,window:{},UI:{escape:String,icon:()=>'',safeLink:value=>/^https:\/\//.test(value||'')?value:null},HustleCurriculum:{text:String,map:bundle=>bundle.course_map?.nodes||[],find:(bundle,id)=>bundle.course_map.nodes.find(node=>node.id===id)},HustleToday:{linkedNode:(bundle,item)=>bundle.course_map?.nodes.find(node=>node.materials?.some(m=>String(m.id)===String(item.cmid)))},HustleSpace:{overview(){}},HustleLearning:{renderBundle(){}},HustleCourse:{mount(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('frontend/hustle/course-today.js','utf8'),context);
const {orderedTopics,chooseTopic,quizFor}=context.window.HustleCourseToday;
const bundle={course_map:{roots:['general','part','archive'],nodes:[
  {id:'t2',kind:'topic',topic_index:2,title:'Topic 2',learnable:true,materials:[{id:22,modname:'assign'}]},
  {id:'general',kind:'info',topic_index:0,title:'General',learnable:false},
  {id:'part',kind:'part',children:['t1','t2','assessment']},
  {id:'t1',kind:'topic',topic_index:1,title:'Topic 1',learnable:true,materials:[]},
  {id:'assessment',kind:'assessment',learnable:false,materials:[{id:33,modname:'assign'},{id:34,modname:'quiz',url:'https://moodle.example/quiz'}]},
  {id:'archive',kind:'archive',learnable:false}
]}};
test('starts with the first topic in the course hierarchy, not the first database row or syllabus',()=>{
  assert.deepEqual(Array.from(orderedTopics(bundle),n=>n.id),['t1','t2']);
  assert.equal(chooseTopic(bundle,null,null).node.id,'t1');
});
test('a real assignment determines its related topic before an unrelated recent reading',()=>{
  const selected=chooseTopic(bundle,{cmid:22},{nodeId:'t1'});
  assert.equal(selected.node.id,'t2');assert.equal(selected.reason,'assignment');
});
test('keeps a midterm with its assessment self-test, instead of recommending an unrelated Quiz 1',()=>{
  const selected=chooseTopic(bundle,{cmid:33},{nodeId:'t1'});
  assert.equal(selected.node.id,'assessment');assert.equal(quizFor(selected.node).id,34);
});
test('resumes a stable topic identifier, including topics without a legacy mix',()=>{
  const selected=chooseTopic(bundle,null,{nodeId:'t2'});
  assert.equal(selected.node.id,'t2');assert.equal(selected.reason,'recent');
});
test('ignores stale course history and handles empty courses',()=>{
  assert.equal(chooseTopic(bundle,null,{nodeId:'gone',topicIndex:50}).node.id,'t1');
  assert.equal(chooseTopic({topic_mixes:[]},null,null).node,null);
});
test('manual topics retain their saved reader identities',()=>{
  const manual={topic_mixes:[{mix_id:'own',topic_index:7,title:'Медіана'}]};
  assert.equal(chooseTopic(manual,null,{topicIndex:7}).node.id,'mix-own');
});
test('archived descendants cannot reappear as orphan learning suggestions',()=>{
  const archived={course_map:{roots:['archive'],nodes:[{id:'archive',kind:'archive',children:['old']},{id:'old',learnable:true,title:'Old lecture'}]}};
  assert.equal(orderedTopics(archived).length,0);
});
test('does not feature hidden, completed, closed, future or unsafe quiz links',()=>{
  const now=2000,quiz={modname:'quiz',url:'https://moodle.example/quiz'};
  const node={materials:[{...quiz,id:1,uservisible:false},{...quiz,id:2,visible:0},{...quiz,id:3,isoverallcomplete:true},{...quiz,id:4,timeopen:3000},{...quiz,id:5,timeclose:1000},{...quiz,id:6,completiondata:{state:2}},{...quiz,id:7,url:'javascript:alert(1)'},{...quiz,id:8}]};
  assert.equal(quizFor(node,now).id,8);
  assert.equal(quizFor({materials:node.materials.slice(0,-1)},now),null);
});
