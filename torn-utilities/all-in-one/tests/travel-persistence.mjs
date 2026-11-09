import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const pause=()=>new Promise(r=>setTimeout(r,150));
async function boot(saved){
const dom=new JSDOM('<title>Canada</title><body><main><table><tr><th>Name</th><th>Stock</th><th>Cost</th></tr><tr data-item-id="258"><td class="itemName">Fixture Flower</td><td>0</td><td>$100</td></tr></table></main></body>',{url:'https://www.torn.com/travelagency.php',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,observers=[],errors=[],events=[],Native=w.MutationObserver;w.MutationObserver=class extends Native{constructor(fn){super(fn);observers.push(this);}};d.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};w.HTMLElement.prototype.setPointerCapture=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=()=>{};w.confirm=()=>true;w.fetch=async()=>{throw Error('Unexpected fetch')};w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});d.addEventListener('tu-snatch-run-diagnostic',e=>events.push(JSON.parse(e.detail)));
w.localStorage.setItem('tu:identity:public-only-key:v1','abcdef0123456789');w.localStorage.setItem('tu:agreement:accepted','fixture-v1');w.sessionStorage.setItem('tu:dev:auth:session:v1','fixture-token');w.localStorage.setItem('tu-item-monitor-v1',JSON.stringify([{key:'id:258',name:'Fixture Flower',category:'Foreign',minQty:1}]));
w.localStorage.setItem('tuim-catalog-v2',JSON.stringify({time:Date.now(),items:[{id:'260',name:'Canada Flower',locations:['Canada'],country:'Canada'},{id:'261',name:'Mexico Flower',locations:['Mexico'],country:'Mexico'},{id:'262',name:'Torn Item',locations:['Torn'],country:'Torn'}]}));
w.GM_xmlhttpRequest=o=>queueMicrotask(()=>o.onload?.({status:200,responseText:JSON.stringify(o.url.endsWith('/api/auth/agreement')?{accepted:true,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-07'}}:o.url.includes('/key/info')?{info:{access:{type:'Public Only'},user:{id:42}}}:{name:'Fixture',status:{state:'Abroad'}})}));

w.localStorage.setItem('tuim-selection-v1',JSON.stringify({key:'id:258',name:'Fixture Flower',category:'Foreign'}));w.localStorage.setItem('tuac-settings',JSON.stringify({snatchSetup:{watchKey:'id:258',hospital:false,medical:{id:206,name:'Morphine',uid:null}}}));
if(saved)for(const [store,values] of Object.entries(saved))for(const [key,value] of Object.entries(values))w[store].setItem(key,value);
w.eval(fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8'));await pause();return {w,d,errors,close(){for(const observer of observers)observer.disconnect();w.close();}};
}

const button=(root,name)=>[...root.querySelectorAll('button')].find(e=>e.textContent===name);
let t=await boot();
try{
 t.d.querySelector('[data-tab="modules"]').click();const card=name=>[...t.d.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent===name).querySelector('button').click();card('Business Tools');card('Travel Assistant and Item Monitor');await pause();button(t.d.querySelector('#tuim-menu'),'Open Item Monitor').click();await pause();
 const panel=t.d.querySelector('#tuim-panel'),hospital=panel.querySelector('[aria-label="Planning to Hospitalize?"]');hospital.value='yes';hospital.dispatchEvent(new t.w.Event('change'));
 const quantity=panel.querySelector('input[type=number]');quantity.value='7';quantity.dispatchEvent(new t.w.Event('input'));
 assert.equal(t.w.sessionStorage.getItem('tu:monitor:resume:v1'),'42');
 const saved=Object.fromEntries(['localStorage','sessionStorage'].map(store=>[store,Object.fromEntries(Object.keys(t.w[store]).map(k=>[k,t.w[store].getItem(k)]))]));t.close();t=await boot(saved);
 assert.equal(t.w.TornUtilities.isActive('item-monitor'),true,'Refresh resumes the previously active monitor');
 assert.equal(t.d.querySelector('#tuim-panel').hidden,true,'Refresh keeps the resumed monitor minimized');
 assert.equal(t.d.querySelector('[aria-label="Planning to Hospitalize?"]').value,'yes');assert.equal(JSON.parse(t.d.querySelector('[aria-label="Selected medical item"]').value).name,'Morphine');assert.ok(t.d.querySelector('#tuim-panel').textContent.includes('Current selection: Foreign / Fixture Flower'));assert.equal(t.d.querySelector('#tuim-panel input[type=number]').value,'7');
 assert.equal(JSON.parse(t.w.localStorage.getItem('tu-item-monitor-v1')).length,1);
 assert.equal(t.d.querySelector('#tu-snatch-run').hidden,true,'Restoring preferences does not arm gameplay');
 const hospitalAgain=t.d.querySelector('[aria-label="Planning to Hospitalize?"]');hospitalAgain.value='no';hospitalAgain.dispatchEvent(new t.w.Event('change'));button(t.d.querySelector('#tuim-panel'),'Arm Snatch and Run').click();await pause();const armed=t.w.sessionStorage.getItem('tu:snatch-run:v1');assert.ok(armed);
 const armedStorage=Object.fromEntries(['localStorage','sessionStorage'].map(store=>[store,Object.fromEntries(Object.keys(t.w[store]).map(k=>[k,t.w[store].getItem(k)]))]));t.close();t=await boot(armedStorage);assert.equal(t.w.TornUtilities.isActive('item-monitor'),true);assert.equal(JSON.parse(t.w.sessionStorage.getItem('tu:snatch-run:v1')).intentId,JSON.parse(armed).intentId,'Refresh preserves this exact armed intent');assert.equal(t.d.querySelector('#tu-snatch-run').hidden,false,'Waiting button returns after authorized refresh');
 t.w.TornUtilities.closeActiveModule();assert.equal(t.w.sessionStorage.getItem('tu:monitor:resume:v1'),null,'Explicit exit prevents automatic restart');
 assert.deepEqual(t.errors,[]);
}finally{t.close()}
console.log('Travel persistence passed: full document reload, monitor resume after authorization, minimized UI, selections/drafts retained, no auto-arm and explicit exit');
