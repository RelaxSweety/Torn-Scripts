import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
import {createTravelDomDiagnostic} from '../src/diagnostics/travel-dom.js';
import {createAcceptanceSession} from '../src/diagnostics/acceptance-session.js';
const dom=new JSDOM('<body></body>',{url:'https://www.torn.com/',pretendToBeVisual:true});const w=dom.window,d=w.document;d.hasFocus=()=>true;let clock=1000,purchases=0;
const watch={key:'id:260',name:'Dahlia',category:'Foreign',minQty:1};
const options={document:d,window:w,getItems:()=>[watch],getContext:async()=>({ownerId:'42',country:'mexico',status:'Abroad'}),getSnapshot:()=>({ownerId:'42',country:'mexico',hospitalized:false,quantity:50}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,now:()=>clock,executeAction:{enabled:()=>true,cancel(){},async execute(kind,{onEvent}){purchases++;onEvent({step:'native-click',control:'Buy'});return {purchaseConfirmed:true,amount:5};}}};
const engine=createTravelEnhancements(options),scrub=createAcceptanceSession({targetBuild:'test',checklistVersion:'test',tests:[],platform:'pda'}).scrub;
const diagnosticOptions={document:d,window:w,scrub,storageKey:'fixture:snatch-recording',getMeta:()=>({host:'pda',installedBuild:'fixture'})};
const diagnostic=createTravelDomDiagnostic(diagnosticOptions);
const pointer=(button,type,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',button:0,clientX:x,clientY:y});button.dispatchEvent(e);};
try{
 diagnostic.start();engine.start();await engine.arm({watchKey:watch.key,hospital:false});const button=d.querySelector('#tu-snatch-run');
 assert.equal(button.disabled,false,'Red button must accept pointer gestures');assert.equal(button.getAttribute('aria-disabled'),'true');assert.equal(button.onclick({isTrusted:true}),false);assert.equal(purchases,0);
 pointer(button,'pointerdown',10,10);pointer(button,'pointermove',60,50);pointer(button,'pointerup',60,50);assert.equal(button.style.left,'50px');assert.equal(button.style.top,'40px');assert.ok(w.localStorage.getItem('tu:snatch-run:position:v1'));
 clock+=500;engine.stock(watch,{ownerId:'42',country:'mexico',quantity:50,hospitalized:false});assert.equal(button.getAttribute('aria-disabled'),'false');
 pointer(button,'pointerdown',10,10);pointer(button,'pointermove',90,70);pointer(button,'pointerup',90,70);assert.equal(button.onclick({isTrusted:true}),false,'Drag release cannot purchase');assert.equal(purchases,0);
 clock+=500;assert.equal(await button.onclick({isTrusted:true}),true);assert.equal(purchases,1);assert.equal(engine.getState().stage,'return');
 const records=diagnostic.report().captures.filter(c=>c.kind==='function-event');
 for(const event of ['armed','stock-ready','button-moved','click-blocked','action-start','native-step','action-result'])assert.ok(records.some(r=>r.function.event===event),event);
 assert.equal(diagnostic.report().snatchAndRun.stage,'return');
 d.dispatchEvent(new w.CustomEvent('tu-snatch-run-diagnostic',{detail:JSON.stringify({event:'action-error',message:'ApiKey abcdef0123456789',rawRequest:'private-payload',apiKey:'private-secret'})}));
 const json=JSON.stringify(diagnostic.report());for(const secret of ['abcdef0123456789','private-payload','private-secret'])assert.ok(!json.includes(secret));
 diagnostic.stop();const count=diagnostic.report().captures.length;engine.disarm();assert.equal(diagnostic.report().captures.length,count,'Stop removes function-event recording');
 const restored=createTravelDomDiagnostic(diagnosticOptions);assert.ok(restored.report().captures.some(c=>c.function?.event==='action-result'),'Function timeline survives reload');restored.stop();
 engine.stop();const next=createTravelEnhancements(options);next.start();assert.equal(d.querySelector('#tu-snatch-run').style.left,'80px','Button position restores');next.stop();
}finally{diagnostic.stop();engine.stop();w.close()}
console.log('Snatch diagnostics/drag passed: red and green dragging, persisted coordinates, no drag-release action, function/native-step/error timeline, redaction and Stop cleanup');
