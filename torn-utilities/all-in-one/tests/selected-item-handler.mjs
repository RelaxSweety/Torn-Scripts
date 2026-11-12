import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDirectQuickItems} from '../src/features/direct-items/direct-quick-items.js';
import {createSnatchDirectItems} from '../src/features/direct-items/snatch-direct-items.js';
for(const [id,name,status] of [[66,'Morphine','Abroad'],[67,'First Aid Kit','Hospital'],[68,'Small First Aid Kit','Abroad'],[361,'Neumune Tablet','Hospital'],[732,'Blood Bag : A+','Abroad'],[733,'Blood Bag : A-','Hospital'],[734,'Blood Bag : B+','Abroad'],[735,'Blood Bag : B-','Hospital'],[736,'Blood Bag : AB+','Abroad'],[737,'Blood Bag : AB-','Hospital'],[738,'Blood Bag : O+','Abroad'],[739,'Blood Bag : O-','Hospital'],[123456,'Selected healing fixture','Hospital']]){
 const w=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;
 w.document.hasFocus=()=>true;w.document.cookie='rfc_v=fixture; path=/';
 let current={maxBaseSlots:2,maxSpecialSlots:0,slots:[{ID:'123',item:{ID:String(id),name,UID:'instance-one'}},{ID:'124'}]},posts=0,nativeCalls=0;const calls=[];
 const pilot=createDirectQuickItems({window:w,document:w.document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{const step=new URL(url).searchParams.get('step');calls.push(step);if(step==='useItem'){posts++;assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{slotID:123});current={maxBaseSlots:2,maxSpecialSlots:0,slots:[{ID:'123'},{ID:'124'}]};return {ok:true,text:async()=>JSON.stringify({success:true,itemRemoved:true,message:'Medical item used.'})};}return {ok:true,text:async()=>JSON.stringify(current)};}});
 const native={prepareRun(){},cancel(){},inspect:()=>({}),execute(){nativeCalls++;throw Error('Native item use is forbidden');}};
 const adapter=createSnatchDirectItems({window:w,native,getPilot:()=>pilot,getProfile:async()=>({status:{state:status,until:Math.floor(Date.now()/1000)+3600}})});
 const run={hospital:true,ownerId:'fixture',intentId:'fixture',watchKey:'id:206',minimumQty:1,medicals:[{id:999,name:'Not carried'}, {id,name,...(id===66?{uid:'instance-one'}:{})}],capacityLedger:{valid:true,total:2,initialOccupied:1,freed:0,purchased:0}};
 const options={event:{isTrusted:true},run,getSnapshot:()=>({hospitalized:true,traveling:false,quantity:2500}),guard:()=>true};
 try{
  await assert.rejects(adapter.execute('heal',{...options,event:{isTrusted:false}}));assert.equal(posts,0);
  await adapter.prepareRun(run);const result=await adapter.execute('heal',options);assert.equal(result.medicalUsed,true);assert.equal(result.hospitalReleased,status==='Abroad');assert.equal(run.capacityLedger.freed,1);assert.equal(posts,1);assert.equal(nativeCalls,0);assert.deepEqual(calls,['inventory','useItem','inventory']);
 }finally{adapter.cancel();pilot.stop();w.close();}
}
// Empty bag 731 uses the same handler when explicitly selected; drawing blood
// is consumption evidence, not evidence of healing or hospital release.
{
 const w=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;w.document.hasFocus=()=>true;w.document.cookie='rfc_v=fixture; path=/';let used=false,posts=0;
 const pilot=createDirectQuickItems({window:w,document:w.document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{if(options.method==='POST'){posts++;used=true;return {ok:true,text:async()=>JSON.stringify({success:true,itemRemoved:true,message:'Blood drawn.'})};}return {ok:true,text:async()=>JSON.stringify({maxBaseSlots:1,maxSpecialSlots:0,slots:[used?{ID:'123'}:{ID:'123',item:{ID:'731',name:'Empty Blood Bag'}}]})};}});
 try{const result=await pilot.useRunItem({isTrusted:true},[{id:731,name:'Empty Blood Bag'}],()=>true);assert.equal(result.result,'consumption-confirmed');assert.equal(posts,1);assert.notEqual(result.hospitalRelease,'explicit-release-message-needs-status-check');}finally{pilot.stop();w.close();}
}
// A matching name cannot override a conflicting selected type/instance identity.
{
 const w=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;w.document.hasFocus=()=>true;w.document.cookie='rfc_v=fixture; path=/';let posts=0;
 const pilot=createDirectQuickItems({window:w,document:w.document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{if(options.method==='POST')posts++;return {ok:true,text:async()=>JSON.stringify({maxBaseSlots:1,maxSpecialSlots:0,slots:[{ID:'123',item:{ID:'66',name:'Morphine',UID:'instance-one'}}]})};}});
 try{
  for(const selected of [{id:67,name:'Morphine'},{id:66,name:'Morphine',uid:'instance-two'},{id:66}])assert.equal((await pilot.useRunItem({isTrusted:true},[selected],()=>true)).result,'invalid-item');
  assert.equal(posts,0);
 }finally{pilot.stop();w.close();}
}
console.log('Selected-item handler passed: Morphine, first-aid, Neumune, all eight filled blood bags and arbitrary selected type IDs use one direct handler POST; unavailable selections, identity conflicts, synthetic clicks and native item routing are rejected; partial healing remains hospitalized');
