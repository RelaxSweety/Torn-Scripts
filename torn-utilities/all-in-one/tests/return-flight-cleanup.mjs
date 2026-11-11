import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8'),marker='const createTravelEnhancements=',start=code.indexOf(marker)+marker.length;
const generated=vm.runInNewContext('('+code.slice(start,code.indexOf('\n};',start)+2)+')');
for(const factory of [createTravelEnhancements,generated])for(const stage of ['waiting','buy','return','return-pending','departure-choice']){
 const w=new JSDOM('<div></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window,d=w.document;d.hasFocus=()=>true;let canceled=0,saved;const state={ownerId:'42',country:'mex',traveling:false,returning:false,hospitalized:false,quantity:50};
 const run={ownerId:'42',country:'mex',stage,watchKey:'id:260',watchName:'Dahlia',minimumQty:1,purchaseConfirmed:stage==='return'||stage==='return-pending',stepLabel:'Continue to return flight',expiresAt:Number.MAX_SAFE_INTEGER};
 const engine=factory({window:w,document:d,getItems:()=>[{key:'id:260',category:'Foreign',name:'Dahlia'}],getContext:async()=>({...state}),getSnapshot:()=>({...state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,screenAlertEnabled:()=>true,restoreRun:run,storeRun:r=>saved=r,executeAction:{cancel(){canceled++;},inspect:()=>({}),hasPendingStep:()=>true}});
 try{engine.start();assert.ok(d.getElementById('tu-snatch-screen-alert'));state.traveling=true;state.returning=false;engine.check();assert.notEqual(engine.getState().stage,'complete','Outbound flight must remain armed');state.returning=true;state.country='torn';engine.update();assert.equal(engine.getState().stage,'complete');assert.equal(saved.stage,'complete');assert.equal(d.getElementById('tu-snatch-screen-alert'),null);assert.equal(d.getElementById('tu-snatch-run').hidden,true);assert.equal(d.getElementById('tu-snatch-run').style.display,'none');assert.equal(engine.getState().stepLabel,undefined);assert.equal(canceled,1);engine.update();assert.equal(canceled,1,'Cleanup is idempotent');}finally{engine.stop();w.close();}
}
// The report's refresh scenario starts already on a return flight.
{
 const w=new JSDOM('',{pretendToBeVisual:true}).window;const engine=generated({window:w,document:w.document,getItems:()=>[],getSnapshot:()=>({ownerId:'42',country:'mex',traveling:true,returning:true}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,restoreRun:{ownerId:'42',country:'mex',stage:'return',watchKey:'id:260'},executeAction:{cancel(){}}});try{engine.start();assert.equal(engine.getState().stage,'complete');assert.equal(w.document.getElementById('tu-snatch-run').hidden,true);assert.equal(w.document.getElementById('tu-snatch-screen-alert'),null);}finally{engine.stop();w.close();}
}
console.log('Return-flight cleanup passed: source/generated, manual departure, paused Continue step, different stages, changed destination, identity/outbound isolation, refresh and idempotent button/alarm cleanup');
for(const factory of [createTravelEnhancements,generated]){
 const w=new JSDOM('',{pretendToBeVisual:true}).window;w.document.hasFocus=()=>true;let rejectStep;const state={ownerId:'42',country:'mex',traveling:false,returning:false,hospitalized:false,quantity:10};
 const engine=factory({window:w,document:w.document,getItems:()=>[],getSnapshot:()=>({...state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,restoreRun:{ownerId:'42',country:'mex',stage:'return',purchaseConfirmed:true},executeAction:{enabled:()=>true,execute:()=>new Promise((resolve,reject)=>rejectStep=reject),cancel(){rejectStep?.(Error('Canceled native step'));}}});
 try{engine.start();const pending=engine.act({isTrusted:true});state.traveling=true;state.returning=true;engine.check();await pending;assert.equal(engine.getState().stage,'complete','Canceled native promise cannot revive the return button');assert.equal(w.document.getElementById('tu-snatch-run').hidden,true);}finally{engine.stop();w.close();}
}
{
 const w=new JSDOM('',{pretendToBeVisual:true}).window;const engine=generated({window:w,document:w.document,getItems:()=>[],getSnapshot:()=>({ownerId:'43',country:'mex',traveling:true,returning:true}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,restoreRun:{ownerId:'42',country:'mex',stage:'return'},executeAction:{cancel(){}}});try{engine.start();assert.notEqual(engine.getState()?.stage,'complete','A different player cannot establish same-player completion');}finally{engine.stop();w.close();}
}
