const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const context={Intl,Date,Map,URL,URLSearchParams,UI:{escape:v=>String(v??''),icon:()=>''},document:{querySelector:()=>({addEventListener(){}})},window:{addEventListener(){}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('frontend/hustle/study-space.js','utf8'),context);
const {groupDeadlines,dateLabel}=context.window.HustleSpace;
const seconds=value=>Date.parse(value)/1000;
const now=seconds('2026-11-17T12:00:00Z');
const data=[
 {id:1,course_id:101,duedate:seconds('2026-11-18T15:00:00Z')},
 {id:2,course_id:102,duedate:0},
 {id:3,course_id:101,duedate:seconds('2026-11-17T13:00:00Z')},
 {id:4,course_id:102,duedate:seconds('2026-11-17T14:00:00Z')},
 {id:5,course_id:101,duedate:seconds('2026-11-16T12:00:00Z')},
];
const ids=groups=>Array.from(groups.flatMap(g=>g.items.map(i=>i.id)));
test('upcoming tasks group by Kyiv day and place undated tasks last',()=>{
 const groups=groupDeadlines(data,'upcoming','',now);
 assert.deepEqual(Array.from(groups,g=>g.key),['2026-11-17','2026-11-18','undated']);
 assert.deepEqual(ids(groups),[3,4,1,2]);
});
test('past filter does not treat undated assignments as missed',()=>assert.deepEqual(ids(groupDeadlines(data,'past','',now)),[5]));
test('course filter accepts URL string ids without leaking other courses',()=>assert.deepEqual(ids(groupDeadlines(data,'all','101',now)),[5,3,1]));
test('unknown course and an empty list produce empty groups',()=>{
 assert.equal(groupDeadlines(data,'all','999',now).length,0);
 assert.equal(groupDeadlines([],'upcoming','',now).length,0);
});
test('date labels respect Kyiv midnight, not UTC midnight',()=>{
 assert.equal(dateLabel(seconds('2026-11-17T22:30:00Z'),now),'Завтра');
 assert.equal(dateLabel(seconds('2026-11-17T20:30:00Z'),now),'Сьогодні');
});
test('historic dates include the year and inputs stay unchanged',()=>{
 const original=JSON.stringify(data);
 assert.match(dateLabel(seconds('2025-11-17T12:00:00Z'),now),/2025/);
 groupDeadlines(data,'past','',now);
 assert.equal(JSON.stringify(data),original);
});
test('course deadlines remain scoped even if the API returns other courses',()=>{
 assert.deepEqual(Array.from(context.window.HustleSpace.scopeAssignments(data,'101'),item=>item.id),[1,3,5]);
});
test('global agenda only shows imported courses',()=>{
 context.window.HustleSpace.setCourses([{course_id:102}]);
 assert.deepEqual(Array.from(context.window.HustleSpace.scopeAssignments(data,null),item=>item.id),[2,4]);
});
