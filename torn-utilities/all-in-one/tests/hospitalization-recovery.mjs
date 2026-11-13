import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
const watch={key:'id:1',name:'Synthetic foreign item',category:'Foreign',minQty:5},item={id:3,name:'Synthetic hospital item'};
function fixture(saved={}){const w=new JSDOM('<body></body>',{url:'https://www.torn.com',pretendToBeVisual:true}).window,d=w.document;d.hasFocus=()=>true;let s={ownerId:'42',country:'jap',hospitalized:false,traveling:false,returning:false,quantity:0},uses=0,result={hospitalized:true};const events=[];d.addEventListener('tu-snatch-run-diagnostic',e=>events.push(JSON.parse(e.detail)));let persisted;const create=restore=>createTravelEnhancements({document:d,window:w,getItems:()=>[watch],getContext:async()=>({...s,status:s.hospitalized?'Hospital':'Abroad'}),getSnapshot:()=>s,getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,storeRun:r=>persisted=r&&structuredClone(r),restoreRun:restore,executeAction:{enabled:()=>true,listInventory:()=>[{...item,amount:1}],cancel(){},async execute(){uses++;return result;}}});let engine=create({ownerId:'42',country:'jap',watchKey:watch.key,watchName:watch.name,stage:'hospitalize',planHospitalize:true,hospital:true,hospitalization:item,hospitalizations:[item],stockAt:0,hospitalizationAttempted:false,hospitalizedConfirmed:false,...saved});engine.start();return {w,d,get engine(){return engine;},events,set:v=>Object.assign(s,v),uses:()=>uses,result:v=>result=v,button:()=>d.querySelector('#tu-snatch-run'),reload(){const retained=structuredClone(persisted);engine.stop();engine=create(retained);engine.start();},close(){engine.stop();w.close();}};}
{
 const f=fixture();try{assert.equal(f.button().getAttribute('aria-disabled'),'false');f.set({hospitalized:true});f.engine.check();assert.equal(f.engine.getState().stage,'waiting');assert.equal(f.engine.getState().hospitalizationResumeEligible,true);f.set({hospitalized:false});f.engine.check();assert.equal(f.engine.getState().stage,'hospitalize');assert.equal(f.button().getAttribute('aria-disabled'),'false');assert.equal(f.uses(),0,'Recovery cannot use an item');assert.ok(f.events.some(e=>e.event==='hospitalize-restored'));await f.engine.act({isTrusted:true});assert.equal(f.uses(),1,'One fresh trusted click uses one item');assert.equal(f.engine.getState().hospitalizationAttempted,true);f.set({hospitalized:false});f.engine.check();assert.equal(f.engine.getState().stage,'waiting','A confirmed attempt cannot recover into another hospitalization');assert.equal(f.uses(),1);}finally{f.close();}
}
for(const guard of [{traveling:true},{returning:true},{country:'canada'},{ownerId:null},{hospitalized:null},{quantity:NaN},{directItemUncertain:true},{directItemConsumed:true}]){
 const f=fixture();try{f.set({hospitalized:true});f.engine.check();f.set({hospitalized:false,...guard});f.engine.check();assert.equal(f.engine.getState().stage,'waiting',JSON.stringify(guard));assert.equal(f.uses(),0);}finally{f.close();}
}
for(const saved of [{hospitalizationAttempted:true},{hospitalizedConfirmed:true},{planHospitalize:false}]){
 const f=fixture(saved);try{f.set({hospitalized:true});f.engine.check();f.set({hospitalized:false});f.engine.check();assert.equal(f.engine.getState().stage,'waiting');assert.equal(f.uses(),0);}finally{f.close();}
}
{
 const f=fixture();try{f.set({hospitalized:true});f.engine.check();f.reload();f.set({hospitalized:false});f.engine.check();assert.equal(f.engine.getState().stage,'hospitalize','Persisted observation retains unattempted recovery intent');assert.equal(f.uses(),0);}finally{f.close();}
}
{
 const f=fixture({stage:'waiting',hospitalizationAttempted:undefined,hospitalizationResumeEligible:undefined});try{f.engine.check();assert.equal(f.engine.getState().stage,'waiting','An old waiting run with unknown consumption history requires re-arming');assert.equal(f.uses(),0);}finally{f.close();}
}
{
 const f=fixture();try{f.set({hospitalized:true});f.engine.check();f.set({hospitalized:false,quantity:10});f.engine.check();assert.equal(f.engine.getState().stage,'buy','Available monitored stock bypasses optional hospitalization');assert.equal(f.uses(),0);}finally{f.close();}
}
{
 const f=fixture({stage:'hospitalize-pending',hospitalizationAttempted:true});try{f.set({hospitalized:true});f.engine.check();f.set({hospitalized:false});f.engine.check();assert.equal(f.engine.getState().stage,'waiting','A pending attempt never becomes a fresh recovery');assert.equal(f.uses(),0);}finally{f.close();}
}
{
 const f=fixture();try{f.set({hospitalized:true});f.engine.check();f.set({hospitalized:false});f.d.hasFocus=()=>false;f.engine.check();assert.equal(f.engine.getState().stage,'waiting');f.d.hasFocus=()=>true;f.engine.check();assert.equal(f.engine.getState().stage,'hospitalize','Recovery waits for the active focused page');assert.equal(f.uses(),0);}finally{f.close();}
}
console.log('Hospitalization recovery passed: transient status, fresh click only, persisted intent, no repeat after attempt/consumption/uncertainty, flight/country/identity guards, old-run safety and stock bypass.');
