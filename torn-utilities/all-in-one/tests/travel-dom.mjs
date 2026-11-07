import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTravelDomDiagnostic} from '../src/diagnostics/travel-dom.js';
import {createAcceptanceSession} from '../src/diagnostics/acceptance-session.js';
const dom=new JSDOM(`<body><div role=dialog class="heal-confirm" data-token="private-token"><p>Use First Aid Kit? ApiKey abcdef0123456789</p><input type=hidden value="csrf-secret"><input value="input-secret"><textarea>textarea-secret</textarea><script>script-secret</script><a href="https://www.torn.com/use?token=url-secret" onclick="submitSecret()">Yes</a><button>No</button></div></body>`,{url:'https://www.torn.com/travelagency.php?token=query-secret',pretendToBeVisual:true});
const {window:w}=dom,d=w.document;
const scrub=createAcceptanceSession({targetBuild:'fixture',checklistVersion:'fixture',tests:[],platform:'pda'}).scrub;
const options={document:d,window:w,scrub,storageKey:'test-dom-only',getMeta:()=>({host:'pda'})};
const tool=createTravelDomDiagnostic(options),yes=d.querySelector('a');let clicks=0;yes.onclick=event=>{event.preventDefault();clicks++;};
try{
 tool.pick(tool.stages[2]);yes.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(clicks,0,'Selection must block native Yes action');
 const report=tool.report(),json=JSON.stringify(report);assert.equal(report.captures.length,1);assert.ok(json.includes('First Aid Kit'));assert.ok(json.includes('heal-confirm'));assert.ok(json.includes('Yes'));assert.ok(json.includes('No'));
 for(const secret of ['abcdef0123456789','private-token','csrf-secret','input-secret','textarea-secret','script-secret','url-secret','query-secret','onclick','href='])assert.ok(!json.includes(secret),secret);
 assert.equal(report.captures[0].path,'/travelagency.php');assert.equal(report.captures[0].host,'pda');assert.equal(createTravelDomDiagnostic(options).report().captures.length,1,'Capture survives same-tab navigation/reload');
 assert.throws(()=>tool.capture(tool.stages[0],d.body),/full page/);
 tool.pick(tool.stages[0]);d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(tool.report().captures.length,1);yes.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(clicks,1,'After cancellation native behavior is restored');
 for(let i=0;i<25;i++)tool.capture(tool.stages[1],yes);assert.equal(tool.report().captures.length,26);
 const large=d.createElement('div');large.innerHTML='<span>text</span>'.repeat(500);assert.equal(tool.markup(large).truncated,true);
 tool.pick(tool.stages[2]);yes.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true}));yes.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,cancelable:true}));yes.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(clicks,1,'Pointer gesture and trailing click cannot submit Yes');tool.stop();
 tool.clear();assert.equal(tool.report().captures.length,0);
 tool.start();yes.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(clicks,2,'Monitoring must let the real Yes click proceed');assert.equal(tool.report().captures.length,1);assert.equal(tool.report().captures[0].kind,'click');assert.equal(tool.report().captures[0].target.label,'Yes');
 const popup=d.createElement('div');popup.setAttribute('role','dialog');popup.innerHTML='<p>Would you like to use the Blood Bag?</p><button>Yes</button><button>No</button>';d.body.append(popup);await new Promise(r=>w.setTimeout(r,250));assert.ok(tool.report().captures.some(c=>c.kind==='dom-change'&&c.html.includes('Blood Bag')),'Later confirmation popup must be recorded');
 popup.querySelector('button').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(tool.report().monitoring,true,'Recording continues past subsequent clicks');
 tool.stop();const stopped=tool.report().captures.length;yes.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));popup.append(d.createTextNode('Purchase complete'));await new Promise(r=>w.setTimeout(r,250));assert.equal(tool.report().captures.length,stopped,'Stop removes listeners and observer');
 tool.start();const restored=createTravelDomDiagnostic(options);restored.resume();assert.equal(restored.report().monitoring,true,'Explicit monitoring resumes in the same tab');restored.stop();tool.stop();
 for(let i=0;i<220;i++)tool.capture(tool.stages[1],yes);assert.equal(tool.report().captures.length,200);assert.ok(tool.report().droppedCaptures>0);tool.clear();assert.equal(w.sessionStorage.getItem('test-dom-only'),null);
}finally{tool.stop();w.close()}
console.log('Travel DOM diagnostics passed: passive multi-click monitoring, async popup DOM, Stop cleanup, resume, ring buffer; blocked gameplay clicks, confirmation context, redaction, limits, same-tab persistence, Escape and clear');
