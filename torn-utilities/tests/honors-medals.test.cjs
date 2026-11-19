const {test}=require('node:test');
const assert=require('node:assert/strict');
const {tracking,awardList,buildRows,recommendations,selectRows}=require('../modules/honors-medals.user.js');
const award=(id,name,description,type=2)=>({id,name,description,type:{id:type,title:type===1?'default':'attacking'}});
const stats={attacking:{attacks:{won:49},defends:{won:20}},travel:{total:23,mexico:40},jail:{busts:{success:125}},finishing_hits:{rifles:90}};
test('v2 nested stats produce progress without coercing missing, null or private stats to zero',()=>{
  assert.equal(tracking(award(1,'A','Win 50 attacks'),stats).percent,98);
  assert.equal(tracking(award(1,'A','Win 50 attacks'),{}),null);
  assert.equal(tracking(award(1,'A','Win 50 attacks'),{attacking:{attacks:{won:null}}}),null);
  assert.equal(tracking(award(1,'A','Win 50 attacks'),{attacking:{attacks:{won:'49'}}}),null);
  assert.equal(tracking(award(1,'A','Win 50 attacks'),{attacking:{attacks:{won:0}}}).current,0);
});
test('compound, timed, crimes and unknown requirements are untracked',()=>{
  for(const description of ['Win 1,000 attacks and 1,000 defends','Win 50 attacks in a day','Earn $100,000 for 3 days','Own every item'])assert.equal(tracking(award(1,'A',description),stats),null);
  assert.equal(tracking({...award(1,'A','Win 50 attacks'),crimes_version:'1.0'},stats),null);
});
test('supported public milestones include jail, destination travel and weapon honors',()=>{
  assert.equal(tracking(award(1,'A','Bust 250 people from the Torn City jail'),stats).remaining,125);
  assert.equal(tracking(award(1,'A','Win 50 defends'),stats).remaining,30);
  assert.equal(tracking(award(1,'A','Travel to Mexico 50 times'),stats).percent,80);
  assert.equal(tracking(award(1,'A','Achieve 100 finishing hits with rifles'),stats).remaining,10);
});
test('earned IDs are namespaced; defaults and unavailable honor ownership stay distinct',()=>{
  const rows=buildRows({honors:[award(1,'H','Win 50 attacks'),award(2,'Flag','',1)],medals:[award(1,'M','Win 50 attacks')]},{honors:null,medals:[{id:1,timestamp:123}]},stats);
  assert.deepEqual(rows.map(r=>r.status),['unknown','default','earned']);
  assert.equal(rows[2].timestamp,123);assert.deepEqual(recommendations(rows),[]);
  assert.equal(new Set(rows.map(r=>r.key)).size,3);
});
test('nearby recommendations exclude earned, unknown and unsupported awards',()=>{
  const rows=buildRows({honors:[],medals:[award(1,'Attack','Win 50 attacks'),award(2,'Travel','Travel abroad 25 times'),award(3,'Unknown','Own every item')]},{honors:[],medals:[]},stats);
  assert.deepEqual(recommendations(rows).map(r=>r.id),[1,2]);
  assert.deepEqual(selectRows(rows,{status:'trackable',sort:'progress',ascending:false}).map(r=>r.id),[1,2]);
  assert.deepEqual(selectRows(rows,{query:'travel'}).map(r=>r.id),[2]);
  assert.equal(selectRows(rows,{sort:'progress',ascending:true}).at(-1).id,3);
});
test('met target clamps to 100% without falsely awarding achievement',()=>{
  const rows=buildRows({honors:[],medals:[award(1,'A','Win 25 attacks')]},{honors:[],medals:[]},stats);
  assert.equal(rows[0].progress.percent,100);assert.equal(rows[0].progress.remaining,0);assert.equal(rows[0].status,'unearned');
});
test('malformed API data never masquerades as an empty earned list',()=>{
  for(const data of [{},{honors:null},{honors:[{id:'1'}]},{honors:[{id:1},{id:1}]}])assert.throws(()=>awardList(data,'honors'));
  assert.deepEqual(awardList({honors:[]},'honors'),[]);
});
