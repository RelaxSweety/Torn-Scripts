import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8'),marker='const createTravelEnhancements=',start=code.indexOf(marker)+marker.length,factory=vm.runInNewContext('('+code.slice(start,code.indexOf('\n};',start)+2)+')');
for(const mode of ['full','partial','exhausted','uncertain','intermediate','depart','exit']){
 const w=new JSDOM('',{pretendToBeVisual:true}).window;w.document.hasFocus=()=>true;const timers=new Map();let next=100000,reloads=0,calls=0,saved;const originalSet=w.setTimeout.bind(w),originalClear=w.clearTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>{if(ms===3000){timers.set(++next,fn);return next;}return originalSet(fn,ms,...args);};w.clearTimeout=id=>{timers.delete(id);originalClear(id);};const watch={key:'id:260',name:'Dahlia',category:'Foreign',minQty:1},state={ownerId:'42',country:'mex',status:'Abroad',hospitalized:false,traveling:false,returning:false,quantity:100};
 const adapter={enabled:()=>true,cancel(){},hasPendingStep:()=>mode==='intermediate',remainingCapacity:()=>({total:18,occupied:mode==='full'?18:16,free:mode==='full'?0:2}),execute:async()=>{calls++;if(mode==='uncertain'){const e=Error('Unknown purchase');e.submitted=true;throw e;}return mode==='intermediate'?{actionPending:true,nextLabel:'Buy remaining 2'}:{purchaseConfirmed:true,directPurchaseVerified:true,amount:mode==='full'?18:16};}};
 const engine=factory({window:w,document:w.document,getItems:()=>[watch],getContext:async()=>({...state}),getSnapshot:()=>({...state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter,storeRun:run=>saved=run?JSON.parse(JSON.stringify(run)):null,reloadPage:()=>{assert.equal(saved.purchaseConfirmed,true);assert.equal(saved.purchaseRefreshPending,false);assert.equal(saved.purchaseDisplayRefreshDone,true);reloads++;}});
 try{engine.start();await engine.arm({watchKey:watch.key});engine.stock(watch,state);await engine.act({isTrusted:true});assert.equal(calls,1);assert.equal(reloads,0);
  if(['intermediate','uncertain'].includes(mode)){assert.equal(timers.size,0);continue;}
  assert.equal(timers.size,1);assert.equal(engine.getState().purchaseRefreshPending,true);assert.equal(await engine.act({isTrusted:true}),false);assert.equal(w.document.getElementById('tu-snatch-departure-choice'),null,'No input dialog interrupts the impending reload');
  if(mode==='depart'){state.traveling=true;state.returning=true;engine.check();assert.equal(timers.size,0);continue;}
  if(mode==='exit'){engine.disarm();assert.equal(timers.size,0);continue;}
  const callback=[...timers.values()][0];timers.clear();callback();assert.equal(reloads,1);const restored=JSON.parse(JSON.stringify(saved));engine.stop();
  const restoredEngine=factory({window:w,document:w.document,getItems:()=>[watch],getSnapshot:()=>({...state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter,restoreRun:restored,reloadPage:()=>reloads++});
  try{restoredEngine.start();assert.equal(restoredEngine.getState().purchaseRefreshPending,false);assert.equal(restoredEngine.getState().purchaseConfirmed,true);assert.equal(timers.size,0,'Restoring completion does not loop the reload');assert.equal(calls,1,'Restoring completion does not replay purchase');assert.equal(!!w.document.getElementById('tu-snatch-departure-choice'),mode!=='full');}finally{restoredEngine.stop();}
 }finally{engine.stop();w.close();}
}
console.log('Purchase display refresh passed: terminal-only three-second refresh, saved completion before reload, input/duplicate guard, restored departure choice, no replay/loop, no intermediate/uncertain refresh and exit/flight cancellation');
