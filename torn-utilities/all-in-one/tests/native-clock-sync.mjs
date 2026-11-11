import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createNativeClockSync} from '../src/features/native-clock-sync.js';
import {createHospitalClock} from '../src/features/hospital-clock.js';
import {createLandingAlarm} from '../src/features/landing-alarm.js';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
const w=new JSDOM('<a aria-label="Hospital: Injury"><span>00:01:30</span></a><div id="travel-root"><section aria-label="Flight progress"><time>00:01:30</time></section></div><div id="unrelated"></div>',{pretendToBeVisual:true}).window,d=w.document;d.hasFocus=()=>true;let clock=1800000000350,requests=0,updates=0,hospitalAlarms=0,landingAlarms=0;
const hospital=createHospitalClock({document:d,now:()=>clock}),deadline=clock+91000;hospital.read({state:'Hospital',until:deadline/1000});
const landing=createLandingAlarm({window:w,document:d,now:()=>clock,getFlight:()=>({route:'Torn to Japan',returning:false,timerText:d.querySelector('time').textContent}),getSettings:()=>({enabled:true,seconds:89}),audio:{play(){landingAlarms++;},stop(){}}});
const run={ownerId:'42',country:'jap',stage:'waiting',watchKey:'id:260',watchName:'Dahlia',hospital:true,hospitalizedConfirmed:true,hospitalUntil:deadline,hospitalAlarm:true,hospitalWarningSeconds:89};
const engine=createTravelEnhancements({window:w,document:d,now:()=>clock,restoreRun:run,getItems:()=>[],getContext:()=>{requests++;throw Error('Clock sync must not request profile');},getSnapshot:()=>({ownerId:'42',country:'jap',traveling:true,returning:false,hospitalized:true,quantity:0,hospitalUntil:deadline}),getHospitalCountdown:()=>hospital.displayRemaining(),getDestinationETA:()=>landing.snapshot(),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,hospitalAudio:{play(){hospitalAlarms++;},stop(){}}});
const sync=createNativeClockSync({window:w,document:d,sync:()=>{updates++;landing.tick();engine.syncCountdown();}}),flush=()=>new Promise(r=>w.queueMicrotask(r));
try{
 engine.start();sync.start();const button=d.getElementById('tu-snatch-run');assert.ok(button.textContent.includes('Hosp Time: 01:30'));assert.ok(button.textContent.includes('Dest ETA: 90 seconds'));
 clock+=630;d.querySelector('a span').textContent='00:01:29';d.querySelector('time').textContent='00:01:29';await flush();assert.ok(button.textContent.includes('Hosp Time: 01:29'),'Hospital display mirrors the new native second without waiting for the unrelated 1s interval');assert.ok(button.textContent.includes('Dest ETA: 89 seconds'));assert.equal(hospitalAlarms,1);assert.equal(landingAlarms,1);assert.equal(engine.getState().hospitalUntil,deadline,'Display synchronization does not invent a different hospital deadline');
 clock+=1000;d.querySelector('a span').textContent='00:01:28';d.querySelector('time').textContent='00:01:28';await flush();assert.ok(button.textContent.includes('Hosp Time: 01:28'));assert.equal(hospitalAlarms,1);assert.equal(landingAlarms,1);
 const before=updates;d.getElementById('unrelated').textContent='Unrelated mutation';await flush();assert.equal(updates,before,'Unrelated DOM changes do not scan clocks');button.textContent+=' ';await flush();assert.equal(updates,before,'TU counter paint does not observe itself');
 Object.defineProperty(d,'hidden',{configurable:true,value:true});clock+=500;d.querySelector('time').textContent='00:01:27';await flush();assert.equal(updates,before);Object.defineProperty(d,'hidden',{configurable:true,value:false});d.dispatchEvent(new w.Event('visibilitychange'));assert.ok(button.textContent.includes('Dest ETA: 87 seconds'));assert.equal(requests,0);
 clock+=1000;assert.equal(hospital.displayRemaining(),87,'Static native values count locally without resetting the anchor');sync.stop();const stopped=updates;d.querySelector('time').textContent='00:01:26';await flush();assert.equal(updates,stopped,'Module exit disconnects the native clock observer');
}finally{sync.stop();engine.stop();landing.stop();w.close();}
console.log('Native clock sync passed: immediate same-second flight/hospital display at off-phase updates, no fixed time subtraction, stable deadline, one alarm, local fallback, visibility resume, irrelevant/self mutation isolation, no API requests and observer cleanup');

{
 const doc=new JSDOM('<a aria-label="Hospital: In hospital for 90 seconds"></a>').window.document;let t=1800000000350;const reader=createHospitalClock({document:doc,now:()=>t});const end=reader.read();t+=630;doc.querySelector('a').setAttribute('aria-label','Hospital: In hospital for 89 seconds');assert.equal(reader.read(),end,'Sub-second native tick phase does not create a new hospital deadline on every sample');assert.equal(reader.displayRemaining(),89);t+=1000;doc.querySelector('a').setAttribute('aria-label','Hospital: In hospital for 150 seconds');assert.ok(reader.read()>end+59000,'Real extensions establish a new deadline');doc.defaultView.close();
}

{
 const doc=new JSDOM('<a aria-label="Hospital: Injury">Hospital: 00:01:29</a>').window.document;const t=1800000000000,reader=createHospitalClock({document:doc,now:()=>t});assert.equal(reader.read(),t+89000,'An explicit native hospital counter works without a profile deadline');assert.equal(reader.displayRemaining(),89);doc.defaultView.close();
}
