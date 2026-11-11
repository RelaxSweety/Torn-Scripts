import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDirectQuickItems} from '../src/features/direct-items/direct-quick-items.js';
function setup({state='Okay',fail=false,interfere=false,success=true,ownerChange=false}={}){
 const w=new JSDOM('<div id="travel-root"><h4>Travel Agency</h4></div><script src="/js/travel.js?rfcv=SECRET_QUERY"></script>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;
 w.document.hasFocus=()=>true;w.document.cookie='rfc_v=PRIVATE_RFC;path=/';let calls=[],profiles=0,inv={maxBaseSlots:2,maxSpecialSlots:0,slots:[{ID:'1',item:{ID:736,name:'Blood Bag : AB+'}},{ID:'2'}]};
 const api=createDirectQuickItems({window:w,document:w.document,isAuthorized:()=>true,getProfile:async()=>({profile:{id:ownerChange&&++profiles>1?43:42,status:{state}}}),fetchImpl:async(url,o)=>{const step=new URL(url).searchParams.get('step');calls.push({step,...o});if(step==='addSlotItem'){if(fail)throw Error();inv.slots[1].item={ID:'732',name:'Blood Bag : A+'};if(interfere)inv.slots[0].item=null;return {ok:true,text:async()=>JSON.stringify({success})};}return {ok:true,text:async()=>JSON.stringify(inv)};}});
 return {w,api,calls,inv,close(){api.stop();w.close();}};
}
const trusted={isTrusted:true};
for(const state of ['Traveling','Abroad','Unknown']){const f=setup({state});try{assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>true)).result,'non-travel-status-unconfirmed');assert.equal(f.calls.length,0);}finally{f.close();}}
for(const args of [{fail:true},{interfere:true},{success:false}]){const f=setup(args);try{assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>true)).result,'uncertain');assert.equal(f.api.hasPendingAttempt(),true);assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>true)).result,'blocked');assert.equal(f.calls.filter(c=>c.method==='POST').length,1);f.api.clearLogs();assert.equal(f.api.hasPendingAttempt(),true);}finally{f.close();}}
{
 const f=setup();try{
  assert.equal((await f.api.addDiagnosticBloodBag({isTrusted:false},()=>true)).result,'blocked');assert.equal((await f.api.addDiagnosticBloodBag(trusted)).result,'grounded-travel-agency-required');assert.equal(f.calls.length,0);
  const first=f.api.addDiagnosticBloodBag(trusted,()=>true);assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>true)).result,'blocked');assert.equal((await first).result,'addition-confirmed');assert.deepEqual(f.calls.map(c=>c.step),['inventory','addSlotItem','inventory']);assert.deepEqual(JSON.parse(f.calls[1].body),{itemID:732});assert.equal(f.api.hasPendingAttempt(),false);assert.equal(f.inv.slots[0].item.ID,736);
  let invoked=0;f.w.loadEquippedItems=function(){invoked++;const token='SECRET_TOKEN';return fetch('/page.php?rfcv=SECRET_QUERY');};
  assert.equal(f.api.inspectNativeRefresh(trusted).result,'function-found');assert.equal(invoked,0);const report=JSON.stringify(f.api.report());for(const secret of ['PRIVATE_RFC','SECRET_TOKEN','SECRET_QUERY'])assert.ok(!report.includes(secret));assert.deepEqual(f.api.report().nativeInventoryRefresh.probes[0].assets,['/js/travel.js']);
  Object.defineProperty(f.w,'loadEquippedItems',{get(){throw Error('Accessor must never run');},configurable:true});assert.equal(f.api.inspectNativeRefresh(trusted).result,'accessor-not-read');
  f.w.document.querySelector('#travel-root').innerHTML='<section aria-label="Flight progress"></section>';assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>true)).result,'grounded-travel-agency-required');
 }finally{f.close();}
}
{
 const f=setup({ownerChange:true});try{assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>true)).result,'status-changed');assert.equal(f.calls.some(c=>c.method==='POST'),false);}finally{f.close();}
}
{
 const f=setup();try{f.inv.slots[1].item={ID:66,name:'Morphine'};assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>true)).result,'inventory-full');assert.equal(f.calls.some(c=>c.method==='POST'),false);}finally{f.close();}
}
{
 const f=setup();try{f.inv.maxBaseSlots=3;assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>true)).result,'inventory-unconfirmed');assert.equal(f.calls.some(c=>c.method==='POST'),false);}finally{f.close();}
}
{
 const f=setup();try{let guards=0;assert.equal((await f.api.addDiagnosticBloodBag(trusted,()=>++guards<3)).result,'status-changed');assert.equal(f.calls.some(c=>c.method==='POST'),false);}finally{f.close();}
}
console.log('Native refresh diagnostics: safe non-executing inspection; one numeric itemID POST; ground/status/account guards; AB+ preserved; concurrency, uncertain lock and no retries passed.');
