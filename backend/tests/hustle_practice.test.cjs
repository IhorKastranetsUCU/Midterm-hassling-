const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

function createHarness() {
  const el=()=>({addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){}},dataset:{},innerHTML:''});
  const context={
    Intl,Date,Map,Set,URL,URLSearchParams,
    location:{hash:'#course/9400/practice',origin:'https://hustle.pp.ua'},
    matchMedia:()=>({matches:false}),
    UI:{
      escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
      plain:v=>String(v??''),
      markdown:v=>String(v??''),
      icon:name=>`<svg data-icon="${name}"></svg>`,
      safeLink:v=>/^https?:\/\//.test(v||'')?v:null,
      courseLink:(id,sec='overview',topic)=>`#course/${id}/${sec}${topic!=null?'?topic='+topic:''}`,
      countLabel:(n,one,few,many)=>`${n} ${n%10===1&&n%100!==11?one:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?few:many}`,
      date:()=>''
    },
    document:{querySelector:()=>el(),addEventListener(){}},
    window:{addEventListener(){},dispatchEvent(){}},
    HustleSpace:{overview:()=>'',topicActions:()=>''},
    HustleCourse:{manage:()=>'',activity:()=>''},
    HustleDashboard:{remember(){}},
  };
  context.window.window=context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('frontend/hustle/study-navigation.js','utf8'),context);
  context.HustleCurriculum=context.window.HustleCurriculum;
  vm.runInContext(fs.readFileSync('frontend/hustle/learning.js','utf8'),context);
  return context;
}

const sampleBundle={
  course:{course_id:9400,title:'Probability',source_type:'moodle'},
  topic_mixes:[
    {mix_id:'mix-t2',topic_index:10,title:'Topic 2: Axioms of probability',book_sections:[],flashcards:[{front:'Key Concept #1',back:'stub'}],quizzes:[{question:'How many core study items were indexed?',options:['a','b'],correct_index:0,explanation:'stub'}]},
    {mix_id:'mix-t1',topic_index:13,title:'Topic 1: Introduction',book_sections:[],flashcards:[{front:'Sample space',back:'Set of all outcomes'}],quizzes:[{question:'What is an event?',options:['Subset of sample space','Constant'],correct_index:0,explanation:'An event is a subset.'}]},
  ],
  course_map:{
    roots:['part-1'],
    nodes:[
      {id:'part-1',kind:'chapter',title:'Part I: Basic notions of probability',parent_id:null,children:['t1','t2'],materials:[],quizzes:[],flashcards:[]},
      // Raw DB order places Topic 2 before Topic 1, while part-1.children puts t1 first.
      {id:'t2',kind:'topic',topic_index:10,mix_id:'mix-t2',title:'Topic 2: Axioms of probability',parent_id:'part-1',children:[],materials:[{id:201,modname:'quiz',name:'Quiz 2',url:'https://learn.ucu.edu.ua/mod/quiz/view.php?id=201'}],quizzes:[],flashcards:[]},
      {id:'t1',kind:'topic',topic_index:13,mix_id:'mix-t1',title:'Topic 1: Introduction',parent_id:'part-1',children:[],materials:[{id:101,modname:'quiz',name:'Quiz 1',url:'https://learn.ucu.edu.ua/mod/quiz/view.php?id=101'},{id:102,modname:'assign',name:'Seminar 1',url:'https://learn.ucu.edu.ua/mod/assign/view.php?id=102'}],quizzes:[{question:'What is an event?',options:['Subset of sample space','Constant'],correct_index:0,explanation:'An event is a subset.'}],flashcards:[{front:'Sample space',back:'Set of all outcomes'}]},
    ],
  },
};

test('merges AI flashcards and self-tests inside existing topics in hierarchy order',()=>{
  const ctx=createHarness();
  const html=ctx.window.HustleLearning.renderBundle(sampleBundle,'practice');

  // No standalone duplicate section card outside the topic group.
  assert.equal(html.includes('class="practice-course"'),false);

  // Hierarchy puts Topic 1 before Topic 2 despite raw node array order.
  const t1Pos=html.indexOf('Part I: Basic notions of probability / Topic 1: Introduction');
  const t2Pos=html.indexOf('Part I: Basic notions of probability / Topic 2: Axioms of probability');
  assert.ok(t1Pos>=0&&t2Pos>t1Pos);

  // Topic 1 group links to the practice pages and its Moodle resources.
  const t1Group=html.slice(t1Pos,t2Pos);
  assert.match(t1Group,/href="#course\/9400\/cards\?topic=13"/);
  assert.match(t1Group,/href="#course\/9400\/quizzes\?topic=13"/);
  assert.match(t1Group,/Quiz 1/);
  assert.match(t1Group,/Seminar 1/);
  assert.match(t1Group,/Картки · Самоперевірка/);

  // Placeholder items on Topic 2 remain excluded from practiceTopics and Topic 2 group.
  assert.equal(ctx.window.HustleCurriculum.practiceTopics(sampleBundle).map(t=>t.mix_id).join(','),'mix-t1');
  const t2Group=html.slice(t2Pos);
  assert.equal(t2Group.includes('data-study='),false);
  assert.match(t2Group,/href="#course\/9400\/quizzes\?topic=10"/);
  assert.match(t2Group,/Quiz 2/);
});

test('manual upload courses without course_map retain practiceCards list',()=>{
  const ctx=createHarness();
  const manual={
    course:{course_id:55,title:'Own notes',source_type:'manual_upload'},
    topic_mixes:[{mix_id:'own-1',topic_index:0,title:'Lecture 1',flashcards:[{front:'Q',back:'A'}],quizzes:[]}],
  };
  const html=ctx.window.HustleLearning.renderBundle(manual,'practice');
  assert.match(html,/class="practice-course"/);
  assert.match(html,/data-study="cards" data-mix="own-1"/);
});
