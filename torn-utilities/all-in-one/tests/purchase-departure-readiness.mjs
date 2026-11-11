import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8'),marker='const createTravelEnhancements=',start=code.indexOf(marker)+marker.length,source=code.slice(start,code.indexOf('\n};',start)+2),factory=vm.runInNewContext('('+source+')');
assert.ok(!source.includes('reloadPage'));assert.ok(!source.includes('schedulePurchaseRefresh'));assert.ok(!source.includes('purchase-inventory-refresh'));
for(const mode of ['full','partial','exhausted','uncertain','intermediate','legacy-restored']){
 const w=new JSDOM('',{pretendToBeVisual:true}).window;w.document.hasFocus=()=>true;const timers=new Map();let next=100000,calls=[],saved;const originalSet=w.setTimeout.bind(w),originalClear=w.clearTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>{if(ms===3000){timers.set(++next,fn);return next;}return originalSet(fn,ms,...args);};w.clearTimeout=id=>{timers.delete(id);originalClear(id);};const watch={key:'id:260',name:'Dahlia',category:'Foreign',minQty:1},state={ownerId:'42',country:'mex',status:'Abroad',hospitalized:false,traveling:false,returning:false,quantity:100};
 const adapter={enabled:()=>true,cancel(){},hasPendingStep:()=>mode==='intermediate',remainingCapacity:()=>({total:18,occupied:mode==='full'?18:16,free:mode==='full'?0:2}),execute:async kind=>{calls.push(kind);if(kind==='return')return {returnBooked:true};if(mode==='uncertain'){const e=Error('Unknown purchase');e.submitted=true;throw e;}return mode==='intermediate'?{actionPending:true,nextLabel:'Buy remaining 2'}:{purchaseConfirmed:true,directPurchaseVerified:true,amount:mode==='full'?18:16};}};
 const legacy=mode==='legacy-restored'?{ownerId:'42',country:'mex',stage:'return',purchaseConfirmed:true,watchKey:watch.key,watchName:watch.name,purchaseRefreshPending:true,purchaseDisplayRefreshDone:true}:null;
 const engine=factory({window:w,document:w.document,getItems:()=>[watch],getContext:async()=>({...state}),getSnapshot:()=>({...state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter,restoreRun:legacy,storeRun:run=>saved=run?JSON.parse(JSON.stringify(run)):null});
 try{engine.start();if(legacy){assert.equal(engine.getState().purchaseRefreshPending,undefined);assert.equal(engine.getState().purchaseDisplayRefreshDone,undefined);assert.equal(w.document.getElementById('tu-snatch-run').getAttribute('aria-disabled'),'false');await engine.act({isTrusted:true});assert.deepEqual(calls,['return']);continue;}
  await engine.arm({watchKey:watch.key});engine.stock(watch,state);await engine.act({isTrusted:true});assert.deepEqual(calls,['buy']);assert.equal(timers.size,0,'Purchase completion never schedules a reload or a three-second action lock');
  if(mode==='uncertain'){assert.equal(engine.getState().purchaseConfirmed,undefined);assert.equal(engine.getState().stage,'buy-pending');continue;}
  if(mode==='intermediate'){assert.equal(engine.getState().stage,'buy');assert.equal(w.document.getElementById('tu-snatch-departure-choice'),null);continue;}
  assert.equal(saved.purchaseConfirmed,true);assert.equal(engine.getState().purchaseRefreshPending,undefined);
  if(mode==='full'){assert.equal(engine.getState().stage,'return');assert.equal(w.document.getElementById('tu-snatch-run').getAttribute('aria-disabled'),'false');await engine.act({isTrusted:true});assert.deepEqual(calls,['buy','return'],'Return can begin immediately after verification');}
  else{const dialog=w.document.getElementById('tu-snatch-departure-choice');assert.ok(dialog,'Departure choice is immediately available when space remains');await [...dialog.querySelectorAll('button')].find(b=>b.textContent==='Depart now').onclick({isTrusted:true});assert.deepEqual(calls,['buy','return'],'Departure choice does not wait for notification expiry');}
 }finally{engine.stop();w.close();}
}
console.log('Purchase departure readiness passed: no automatic reload/timer/lock, immediate full-inventory return and partial/exhausted departure choices, unchanged intermediate/uncertain behavior and legacy refresh-state cleanup');
