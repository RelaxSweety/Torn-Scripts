import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDirectQuickItems} from '../src/features/direct-items/direct-quick-items.js';
import {createSnatchDirectItems} from '../src/features/direct-items/snatch-direct-items.js';

function fixture(mode='normal'){
 const w=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;
 w.document.hasFocus=()=>true;w.document.cookie='rfc_v=PRIVATE_FIXTURE; path=/';w.confirm=()=>true;
 const slots=[{ID:'11',item:{ID:'732',name:'Blood Bag : A+',isTrashable:true}},{ID:'12',item:{ID:'732',name:'Blood Bag : A+',isTrashable:true}},{ID:'13',item:{ID:'736',name:'Blood Bag : AB+'}},{ID:'14'}];
 const calls=[],nativeCalls=[];let resumeInventory;let stock=2500,hospital=false,traveling=false,allowed=true;
 const inventory=()=>({maxBaseSlots:4,maxSpecialSlots:0,slots:structuredClone(slots)});
 const pilot=createDirectQuickItems({window:w,document:w.document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{
  const u=new URL(url),step=u.searchParams.get('step');calls.push({step,method:options.method,body:options.body});
  if(options.method==='POST'){
   assert.equal(step,'trashItem');assert.equal(u.pathname,'/page.php');assert.equal(u.searchParams.get('sid'),'travelData');assert.equal(options.credentials,'same-origin');
   const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body),['slotID']);assert.equal(typeof body.slotID,'number');
   if(mode==='reject')return {ok:true,text:async()=>JSON.stringify({success:false,message:'Rejected'})};
   if(mode!=='not-removed')slots.find(s=>Number(s.ID)===body.slotID).item=null;
   if(mode==='unrelated-change')slots[2].item=null;
   if(mode==='network')throw Error('Lost response');
   return {ok:true,text:async()=>JSON.stringify({success:true,message:'Item trashed.'})};
  }
  if(mode==='bad-after'&&calls.some(c=>c.method==='POST'))return {ok:true,text:async()=>JSON.stringify({slots:[]})};
  if(mode==='wait')await new Promise(resolve=>{resumeInventory=resolve;});
  return {ok:true,text:async()=>JSON.stringify(inventory())};
 }});
 const native={prepareRun(){},cancel(){},inspect:()=>({}),hasPendingStep:()=>false,execute:async kind=>{nativeCalls.push(kind);if(kind==='destroy')throw Error('Native destruction forbidden');return {purchaseConfirmed:true};}};
 const adapter=createSnatchDirectItems({window:w,native,getPilot:()=>pilot,getProfile:()=>{throw Error('Trash does not use hospital profile confirmation');}});
 const run={ownerId:'7',intentId:'fixture',watchKey:'id:206',minimumQty:1,destroyInventory:true,destroyAccepted:true,destroyItems:[{id:732,name:'Blood Bag : A+'}],capacityLedger:{valid:true,total:4,initialOccupied:3,freed:0,purchased:0}};
 const options=()=>({event:{isTrusted:true},run,guard:()=>allowed,getSnapshot:()=>({hospitalized:hospital,traveling,returning:false,quantity:stock}),onEvent(){}});
 return {w,pilot,adapter,run,slots,calls,nativeCalls,options,resume:()=>resumeInventory?.(),setStock:v=>{stock=v;},setHospital:v=>{hospital=v;},setTravel:v=>{traveling=v;},setAllowed:v=>{allowed=v;},close(){adapter.cancel();pilot.stop();w.close();}};
}
{
 const f=fixture();try{
  const first=await f.adapter.execute('destroy',f.options());assert.equal(first.actionPending,true);assert.match(first.nextLabel,/1 remaining/);assert.equal(f.adapter.hasPendingStep(),true);
  assert.deepEqual(f.calls.map(c=>c.step),['inventory','trashItem','inventory']);assert.equal(JSON.parse(f.calls[1].body).slotID,11);assert.equal(f.run.capacityLedger.freed,1);assert.equal(f.slots[1].item.ID,'732');assert.equal(f.slots[2].item.ID,'736');
  await assert.rejects(f.adapter.execute('buy',f.options()),/Resolve/);assert.deepEqual(f.nativeCalls,[]);
  const final=await f.adapter.execute('destroy',f.options());assert.equal(final.inventoryDestroyed,true);assert.equal(final.amount,2);assert.equal(f.adapter.hasPendingStep(),false);assert.equal(f.run.capacityLedger.freed,2);
  assert.deepEqual(f.calls.filter(c=>c.method==='POST').map(c=>JSON.parse(c.body).slotID),[11,12]);assert.equal(f.slots[2].item.ID,'736','Unselected blood bag survives');assert.deepEqual(f.nativeCalls,[]);
  await f.adapter.execute('return',f.options());assert.deepEqual(f.nativeCalls,['return'],'Return remains a separate user action');assert.equal(f.pilot.hasPendingAttempt(),false);assert.ok(!JSON.stringify(f.pilot.report()).includes('PRIVATE_FIXTURE'));
 }finally{f.close();}
}
for(const scenario of ['untrusted','unaccepted','disabled','empty-selection','hospital','stock','travel','owner','capacity','not-trashable','wrong-id','wrong-instance']){
 const f=fixture();try{
  const options=f.options();
  if(scenario==='untrusted')options.event={isTrusted:false};if(scenario==='unaccepted')f.run.destroyAccepted=false;if(scenario==='disabled')f.run.destroyInventory=false;if(scenario==='empty-selection')f.run.destroyItems=[];
  if(scenario==='hospital')f.setHospital(true);if(scenario==='stock')f.setStock(0);if(scenario==='travel')f.setTravel(true);if(scenario==='owner')f.setAllowed(false);if(scenario==='capacity')f.run.capacityLedger.valid=false;
  if(scenario==='not-trashable')f.slots[0].item.isTrashable=false;if(scenario==='wrong-id')f.run.destroyItems[0].id=66;if(scenario==='wrong-instance')f.run.destroyItems[0].uid='another-instance';
  await assert.rejects(f.adapter.execute('destroy',options));assert.equal(f.calls.filter(c=>c.method==='POST').length,0,scenario);assert.deepEqual(f.nativeCalls,[]);
 }finally{f.close();}
}
for(const change of ['cancel','revoke','selection','owner']){
 const f=fixture('wait');try{
  const pending=f.adapter.execute('destroy',f.options());await assert.rejects(f.adapter.execute('destroy',f.options()));
  if(change==='cancel')f.adapter.cancel();if(change==='revoke')f.run.destroyAccepted=false;if(change==='selection')f.run.destroyItems=[{id:736,name:'Blood Bag : AB+'}];if(change==='owner')f.setAllowed(false);
  f.resume();await assert.rejects(pending);assert.equal(f.calls.filter(c=>c.method==='POST').length,0,'Changed authorization/selection or cancellation prevents the pending trash POST');assert.equal(f.pilot.hasPendingAttempt(),false);
 }finally{f.close();}
}
for(const scenario of ['network','reject','not-removed','bad-after','unrelated-change']){
 const f=fixture(scenario);try{
  await assert.rejects(f.adapter.execute('destroy',f.options()),error=>error.submitted===true);assert.equal(f.pilot.hasPendingAttempt(),true);assert.equal(f.run.directTrashUncertain,true);assert.equal(f.run.capacityLedger.freed,0);assert.equal(f.run.capacityLedger.valid,false);
  const count=f.calls.length;await assert.rejects(f.adapter.execute('destroy',f.options()));await assert.rejects(f.adapter.execute('buy',f.options()));assert.equal(f.calls.length,count,'Unknown destruction is not replayed');assert.equal(f.adapter.inspect(f.run).directItemUncertain,true);
  const reloaded=createDirectQuickItems({window:f.w,document:f.w.document,isAuthorized:()=>true,fetchImpl:()=>{throw Error('Reload must remain locked');}});assert.equal(reloaded.hasPendingAttempt(),true);reloaded.stop();
 }finally{f.close();}
}
{
 const f=fixture();try{
  await f.adapter.execute('destroy',f.options());f.slots[2].item={ID:'66',name:'Morphine'};const count=f.calls.filter(c=>c.method==='POST').length;
  await assert.rejects(f.adapter.execute('destroy',f.options()),/inventory changed/);assert.equal(f.calls.filter(c=>c.method==='POST').length,count);assert.equal(f.slots[1].item.ID,'732','Changed inventory stops the next selected destruction');
 }finally{f.close();}
}
{
 const f=fixture();try{
  f.slots[0].item=null;f.slots[1].item=null;f.run.capacityLedger.initialOccupied=1;
  const result=await f.adapter.execute('destroy',f.options());assert.equal(result.inventoryDestroyed,true);assert.equal(result.amount,0);assert.equal(f.calls.filter(c=>c.method==='POST').length,0,'Fresh absence of selected types is a no-op');assert.equal(f.slots[2].item.ID,'736');
 }finally{f.close();}
}
console.log('Direct Trash passed: captured POST contract, selected-only one-item gestures, continuation, verified capacity, unrelated-item preservation, acceptance/identity/state guards, partial failures, reload locks and no native fallback/retry');
