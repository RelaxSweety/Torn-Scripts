import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
import {createDirectQuickItems} from '../src/features/direct-items/direct-quick-items.js';
const w=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;w.document.hasFocus=()=>true;w.document.cookie='rfc_v=fixture;path=/';
let calls=[],failAfter=false;let slots=[{ID:1,item:{ID:736,name:'Blood Bag : AB+'}},{ID:2,item:{ID:732,name:'Blood Bag : A+'}}];
const api=createDirectQuickItems({window:w,document:w.document,build:'0.5.42.102-dev',isAuthorized:()=>true,fetchImpl:async(url,options)=>{const step=new URL(url).searchParams.get('step');calls.push(step);if(step==='useItem'){const id=JSON.parse(options.body).slotID;slots.find(slot=>slot.ID===id).item=null;return {ok:true,text:async()=>JSON.stringify({success:true,itemRemoved:true,message:'You are out of the hospital!'})};}if(failAfter&&calls.includes('useItem'))throw Error();return {ok:true,text:async()=>JSON.stringify({slots,maxBaseSlots:2,maxSpecialSlots:0})};}});
const run={ownerId:'42',intentId:'one',watchKey:'id:206',country:'mex'};const event={isTrusted:true},heal=[{id:732,name:'Blood Bag : A+'}],hosp=[{id:736,name:'Blood Bag : AB+'}];
try{
 assert.equal((await api.prepareRunInventory(run)).result,'inventory-prepared');assert.deepEqual(calls,['inventory']);calls=[];
 assert.equal((await api.useRunItem(event,hosp,()=>true,{run})).result,'consumption-confirmed');assert.deepEqual(calls,['inventory','useItem','inventory']);assert.equal(run.directItemInventory.source,'hospitalization');
 // Persist/restore carries the verified post-hospitalization slots across navigation.
 const restored=JSON.parse(JSON.stringify(run));calls=[];assert.equal((await api.useRunItem(event,heal,()=>true,{run:restored,useArmedInventory:true})).result,'consumption-confirmed');assert.deepEqual(calls,['useItem','inventory'],'Heal must not issue a pre-use GET');assert.equal(restored.directItemInventory.source,'healing');
 calls=[];assert.equal((await api.useRunItem(event,heal,()=>true,{run:restored,useArmedInventory:true})).result,'invalid-item');assert.deepEqual(calls,[],'Consumed selected item cannot be reused');
 calls=[];assert.equal((await api.useRunItem(event,heal,()=>true,{run:{...run,intentId:'different'},useArmedInventory:true})).result,'armed-inventory-unavailable');assert.deepEqual(calls,[]);
 delete run.directItemInventory;assert.equal((await api.useRunItem(event,heal,()=>true,{run,useArmedInventory:true})).result,'armed-inventory-unavailable');assert.deepEqual(calls,[],'Missing snapshot never falls back to a pre-heal GET');
 slots[1].item={ID:732,name:'Blood Bag : A+'};await api.prepareRunInventory(run);calls=[];failAfter=true;assert.equal((await api.useRunItem(event,heal,()=>true,{run,useArmedInventory:true})).result,'uncertain');assert.deepEqual(calls,['useItem','inventory']);assert.equal(api.hasPendingAttempt(),true);assert.equal(run.directItemInventory,undefined);assert.equal((await api.useRunItem(event,heal,()=>true,{run,useArmedInventory:true})).result,'blocked');
}finally{api.stop();w.close();}
console.log('Armed healing inventory: arm check; post-hospital refresh; persisted run binding; heal POST then verification GET only; missing/changed run and consumed-item rejection; failed post-heal verification stays locked.');
for(const change of ['native-mutation','native-inventory','stop','clear']){
 const page=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;page.document.hasFocus=()=>true;page.document.cookie='rfc_v=fixture;path=/';let posts=0;
 const original={maxBaseSlots:1,maxSpecialSlots:0,slots:[{ID:123,item:{ID:732,name:'Blood Bag : A+'}}]};
 page.fetch=async()=>({status:200,clone:()=>({text:async()=>JSON.stringify(change==='native-inventory'?{...original,slots:[{ID:123,item:{ID:66,name:'Morphine'}}]}:{success:true})})});
 const pilot=createDirectQuickItems({window:page,document:page.document,build:'0.5.42.102-dev',isAuthorized:()=>true,fetchImpl:async(url,o)=>{if(o.method==='POST')posts++;return {ok:true,text:async()=>JSON.stringify(original)};}});const target={ownerId:'42',intentId:'guarded',watchKey:'id:206'};
 try{await pilot.prepareRunInventory(target);if(change==='stop')pilot.captureStop();else if(change==='clear')pilot.clearLogs();else{await page.fetch('/page.php?sid=travelData&step='+(change==='native-mutation'?'addSlotItem':'inventory'),{method:change==='native-mutation'?'POST':'GET'});await new Promise(r=>setTimeout(r,5));}const result=await pilot.useRunItem({isTrusted:true},[{id:732,name:'Blood Bag : A+'}],()=>true,{run:target,useArmedInventory:true});assert.equal(result.result,'armed-inventory-unavailable',change);assert.equal(posts,0,change+' must not submit or fetch a replacement baseline');}finally{pilot.stop();page.close();}
}
console.log('Armed snapshot invalidation passed: observed native mutations, conflicting passive inventory, diagnostic stop and cleared history require re-arming, without a pre-heal GET.');

{
 const page=new JSDOM('',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;page.document.hasFocus=()=>true;let resolvePreparation,executed=0;
 const watch={key:'id:206',name:'Xanax',category:'Foreign',minQty:1};const state={ownerId:'42',country:'mex',status:'Hospital',hospitalized:true,quantity:100};
 const engine=createTravelEnhancements({window:page,document:page.document,getItems:()=>[watch],getContext:async()=>state,getSnapshot:()=>state,getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:{enabled:()=>true,prepareRun:()=>new Promise(resolve=>resolvePreparation=resolve),execute:()=>executed++,cancel(){},forget(){}}});
 try{engine.start();const preparing=engine.arm({watchKey:watch.key,hospital:true,medical:{id:732,name:'Blood Bag : A+'}});await new Promise(r=>setTimeout(r,0));assert.equal(engine.act({isTrusted:true}),false,'No action while arm inventory is pending');engine.disarm();resolvePreparation();await assert.rejects(preparing,/Arming changed/);assert.equal(engine.getState(),null,'Canceled preparation cannot resurrect a run');assert.equal(executed,0);}finally{engine.stop();page.close();}
}
console.log('Async arming race passed: pending inventory blocks actions and canceled preparation cannot resurrect an armed run.');
