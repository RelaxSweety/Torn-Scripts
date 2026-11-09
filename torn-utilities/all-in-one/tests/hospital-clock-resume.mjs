import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
import {createTravelDomDiagnostic} from '../src/diagnostics/travel-dom.js';
for(const available of [true,false]){
 const w=new JSDOM('<body></body>',{url:'https://www.torn.com/',pretendToBeVisual:true}).window,d=w.document;d.hasFocus=()=>true;let calls=0;const end=Date.now()+9000;
 const run={ownerId:'42',country:'canada',watchKey:'id:1',watchName:'Orchid',minimumQty:1,stage:'waiting',expiresAt:Number.MAX_SAFE_INTEGER,hospital:true};
 const engine=createTravelEnhancements({document:d,window:w,restoreRun:run,getItems:()=>[{key:'id:1',name:'Orchid',category:'Foreign'}],getContext:async()=>{calls++;return {hospitalUntil:available?end:null,hospitalClock:{source:available?'profile-hospital-until':'unavailable',profileState:'Hospital',profileUntilPresent:available,reason:available?'':'native-hospital-has-no-readable-time'}};},getSnapshot:()=>({ownerId:'42',country:'canada',hospitalized:true,quantity:0}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false});
 const diagnostic=createTravelDomDiagnostic({document:d,window:w,scrub:s=>s,storageKey:'clock-test',getMeta:()=>({host:'pda',installedBuild:'fixture'})});
 try{engine.start();await new Promise(r=>setTimeout(r,0));assert.equal(calls,1,'Restored waiting hospital state gets one deadline lookup');for(let i=0;i<20;i++)engine.update();assert.equal(calls,1,'Refreshes cannot flood API reads');const button=d.querySelector('#tu-snatch-run');assert.ok(button.textContent.includes(available?'Hosp Time: 00:':'time unavailable'));
  const report=diagnostic.report();assert.equal(report.monitoring,false);assert.equal(report.snatchAndRun.hospitalClock.available,available);assert.equal(report.snatchAndRun.hospitalClock.lookup,available?'available':'unavailable');assert.equal(report.snatchAndRun.hospitalClock.profileState,'Hospital');assert.equal(report.snatchAndRun.hospitalClock.profileUntilPresent,available);assert.equal(report.snatchAndRun.hospitalClock.until,available?end:null);assert.equal(report.captures.length,0,'Structured clock evidence needs no gameplay recording');
 }finally{diagnostic.stop();engine.stop();w.close()}
}
console.log('Hospital clock resume passed: one bounded lookup restores missing deadline, unknown does not poll, and safe structured evidence exports without recording');
