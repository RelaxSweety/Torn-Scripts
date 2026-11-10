import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const code=fs.readFileSync(new URL(process.argv.includes('--primary')?'../dist/tu-integrated-staging-dev.user.js':'../dist/tu-quick-items-test.user.js',import.meta.url),'utf8');
const marker='const createTravelEnhancements=',start=code.indexOf(marker)+marker.length,end=code.indexOf('\n};',start)+2;
const factory=vm.runInNewContext('('+code.slice(start,end)+')');
const w=new JSDOM('<div id="travel-root"><h4>Travel Agency</h4></div><section id="setup"></section>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;
w.document.hasFocus=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
const watch={key:'id:258',category:'Foreign',name:'Jaguar Plushie'},context={ownerId:'42',country:null,status:'Okay'};
const api=factory({window:w,document:w.document,getItems:()=>[watch],getContext:async()=>context,getSnapshot:()=>({...context}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,onNotice:()=>{}});
try{api.start();api.mount(w.document.getElementById('setup'));const arm=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Arm Snatch and Run');const promise=arm.onclick();assert.equal(arm.disabled,true,'Arming shows a pending state');await promise;const feedback=w.document.getElementById('tuim-arm-feedback');assert.equal(feedback.hidden,false);assert.equal(feedback.getAttribute('role'),'alert');assert.match(feedback.textContent,/Start your outbound flight first/);assert.equal(arm.disabled,false);assert.equal(api.getState(),null,'Pre-departure rejection never creates an armed run');}finally{api.stop();w.close();}
console.log('Experimental arming feedback passed: visible pre-departure explanation, pending state and restored button');
const rw=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;rw.document.hasFocus=()=>true;
const restored={ownerId:'42',country:'mex',watchKey:watch.key,watchName:watch.name,stage:'hospitalize-pending',expiresAt:Number.MAX_SAFE_INTEGER,minimumQty:1,stockAt:0,hospitalizedConfirmed:false};
const snapshot={ownerId:'42',country:'mex',status:'Abroad',hospitalized:false,quantity:0,directItemConsumed:true};let notices=[];
const recovered=factory({window:rw,document:rw.document,getItems:()=>[watch],getContext:async()=>({...snapshot}),getSnapshot:()=>({...snapshot}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,onNotice:text=>notices.push(text),restoreRun:restored});
try{recovered.start();recovered.check();assert.equal(recovered.getState().stage,'waiting','Known non-hospital outcome leaves pending without a user click');assert.ok(rw.document.getElementById('tu-snatch-run').textContent.startsWith('Waiting for available stock'));assert.ok(notices.some(text=>text.includes('not hospitalized')));}finally{recovered.stop();rw.close();}
