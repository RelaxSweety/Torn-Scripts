import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createNativeTravelActions as createDesktopTravelActions} from '../src/features/native-travel-actions.js';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/desktop-travel.json',import.meta.url)));
async function fixture(bundle=false,scenario=''){
 const dom=new JSDOM(`<body><a aria-label="Hospital: Fixture injury"></a><div id="travel-root"><h4>Canada</h4>${f.homeLink}<ul class="inventoryPanel_fixture">${f.closedSlot}</ul><div class="stockTableWrapper_fixture"><div class="itemsHeader_fixture"><span>Name</span><span>Stock</span><span>Cost</span></div><ul class="shop">${f.shopItem}</ul></div></div><aside><button id="unrelated-yes">Yes</button></aside></body>`,{url:'https://www.torn.com/page.php',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window,d=w.document,observers=[],NativeObserver=w.MutationObserver;w.MutationObserver=class extends NativeObserver{constructor(fn){super(fn);observers.push(this);}};d.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=function(){return this.hidden||this.disabled?[]:[{}]};
 const counters={use:0,heal:0,max:0,buy:0,purchase:0,home:0,back:0,continue:0,wrong:0};let guarded=true,stock=611;
 const adapter=createDesktopTravelActions({document:d,window:w,enabled:()=>true});
 const root=d.querySelector('#travel-root'),inventory=root.querySelector('ul'),slot=inventory.querySelector('li'),shop=root.querySelector('.shop');
 const delay=fn=>w.setTimeout(fn,20);
 d.querySelector('#unrelated-yes').onclick=()=>counters.wrong++;
 slot.querySelector('button').onclick=()=>{const holder=d.createElement('div');holder.innerHTML=f.openSlot;slot.innerHTML=holder.firstElementChild.innerHTML;slot.querySelector('button').setAttribute('aria-expanded','true');[...slot.querySelectorAll('button')].find(e=>e.textContent.trim()==='Use').onclick=()=>{counters.use++;delay(()=>{slot.querySelector('[class*=controls]').innerHTML=scenario==='wrong-medical'?f.healConfirmation.replace('Blood Bag : A+','Blood Bag : A-'):f.healConfirmation;slot.querySelector('form').onsubmit=e=>e.preventDefault();[...slot.querySelectorAll('button')].find(e=>e.textContent==='Yes').onclick=e=>{e.preventDefault();counters.heal++;delay(()=>{slot.querySelector('[class*=controls]').innerHTML='<b>You are out of the hospital!</b>';d.querySelector('a[aria-label^="Hospital:"]')?.remove();});};});};};
 const row=shop.querySelector('[class*=row]'),buy=[...row.querySelectorAll('button')].find(e=>e.textContent==='Buy'),input=row.querySelector('.input-money');buy.disabled=true;
 row.querySelector('.wai-btn').onclick=()=>{counters.max++;delay(()=>{input.value='18';buy.disabled=false;});};
 buy.onclick=e=>{e.preventDefault();counters.buy++;delay(()=>{shop.innerHTML=scenario==='wrong-quantity'?f.buyConfirmation.replace('18x Wolverine','19x Wolverine'):f.buyConfirmation;[...shop.querySelectorAll('button')].find(e=>e.textContent==='Yes').onclick=()=>{counters.purchase++;delay(()=>{inventory.replaceChildren();for(let n=1;n<=18;n++){const li=d.createElement('li');li.className='inventorySlot_fixture';const b=d.createElement('button');b.setAttribute('aria-label','Wolverine Plushie slot '+n);li.append(b);inventory.append(li);}stock-=18;shop.innerHTML='';});};});};
 if(scenario==='empty-return-panel'){const empty=d.createElement('div');empty.id='travel-home-panel';root.append(empty);}
 const home=root.querySelector('a[aria-controls="travel-home-panel"]');
 home.onclick=()=>{counters.home++;home.setAttribute('aria-expanded','true');
  const mount=()=>{root.querySelector('#travel-home-panel')?.remove();const holder=d.createElement('div');holder.innerHTML=scenario==='wrong-destination'?f.returnConfirmation.replace('<strong>Torn</strong>','<strong>Canada</strong>'):f.returnConfirmation;const panel=holder.firstElementChild;root.append(panel);panel.querySelector('button').onclick=()=>{counters.back++;delay(()=>{const wrap=d.createElement('div');wrap.innerHTML=f.booked;panel.innerHTML=wrap.firstElementChild.innerHTML;const flight=()=>{root.innerHTML='<h4>Traveling</h4><section aria-label="Flight progress">Canada to Torn</section>';};if(scenario==='auto-flight'){panel.querySelector('button').disabled=true;delay(flight);}else panel.querySelector('button').onclick=()=>{counters.continue++;flight();};});};};
  if(['delayed-return-panel','expanded-pending-panel'].includes(scenario)){const empty=d.createElement('div');empty.id='travel-home-panel';root.append(empty);w.setTimeout(mount,60);}else delay(mount);
 };
 if(scenario==='verified-capacity'){inventory.setAttribute('aria-label','Inventory 18 items');for(let n=1;n<18;n++){const li=d.createElement('li');li.className='inventorySlot_fixture';inventory.append(li);}const money=d.createElement('span');money.id='user-money';money.textContent='$1,000,000';d.body.prepend(money);input.addEventListener('input',()=>{buy.disabled=false;});}
 const watch={key:scenario==='name-key-no-hospital'?'name:wolverine plushie':'id:261',name:'Wolverine Plushie',category:'Foreign',minQty:1};let engine;
 const snapshot=()=>{const state=adapter.inspect(engine?.getState());return {ownerId:'42',country:'canada',hospitalized:state.released?false:!!d.querySelector('a[aria-label^="Hospital:"]'),quantity:stock,...state};};
 engine=createTravelEnhancements({document:d,window:w,getItems:()=>[watch],getContext:async()=>({ownerId:'42',country:'canada',status:scenario==='name-key-no-hospital'?'Abroad':'Hospital'}),getSnapshot:snapshot,getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter});
 if(scenario==='name-key-no-hospital')d.querySelector('a[aria-label^="Hospital:"]')?.remove();
 if(!bundle){engine.start();await engine.arm({watchKey:watch.key,hospital:scenario!=='name-key-no-hospital',medical:scenario==='name-key-no-hospital'?null:{id:1,name:'Blood Bag : A+',uid:null}});engine.stock(watch,snapshot());}
 return {dom,w,d,engine,adapter,counters,snapshot,watch,setStock:value=>{stock=value;},guard:()=>guarded,setGuard:v=>guarded=v,close(){w.TornUtilities?.closeActiveModule();engine.stop();for(const observer of observers)observer.disconnect();dom.window.close();}};
}
{
 const t=await fixture();try{
  assert.equal(t.engine.getState().stage,'heal');assert.equal(t.engine.act({isTrusted:false}),false);
  const healing=t.engine.act({isTrusted:true});assert.equal(t.engine.act({isTrusted:true}),false,'Duplicate click while healing must not start another transaction');assert.equal(await healing,true);assert.equal(t.engine.getState().stage,'buy');assert.equal(t.counters.heal,1);assert.equal(t.counters.purchase,0,'Heal cannot automatically purchase');
  assert.equal(await t.engine.act({isTrusted:true}),true);assert.equal(t.engine.getState().stage,'return');assert.equal(t.counters.max,1);assert.equal(t.counters.purchase,1);assert.equal(t.counters.back,0,'Purchase cannot automatically return');
  assert.equal(await t.engine.act({isTrusted:true}),true);assert.equal(t.engine.getState().stage,'complete');assert.equal(t.counters.back,1);assert.equal(t.counters.continue,1);assert.equal(t.counters.wrong,0);assert.ok(t.d.querySelector('[aria-label="Flight progress"]'));
 }finally{t.close()}
}
{
 const t=await fixture();try{const pending=t.engine.act({isTrusted:true});t.engine.disarm();assert.equal(await pending,false);await new Promise(r=>setTimeout(r,80));assert.equal(t.counters.heal,0,'Cancellation before Yes blocks medical submission');}finally{t.close()}
}
{
 const t=await fixture();try{
  // A different blood type must never be selected merely because its label is similar.
  t.d.querySelector('[class*=inventorySlot] > button').setAttribute('aria-label','Blood Bag : A- slot 1');assert.equal(await t.engine.act({isTrusted:true}),false);assert.equal(t.counters.use,0);assert.equal(t.counters.heal,0);
 }finally{t.close()}
}
console.log('Desktop travel passed: captured slots/popovers, matching Yes controls, native Max/text input, inventory purchase proof, Travel home/Back/Continue, explicit stage clicks, cancellation and blood-type isolation');

for(const scenario of ['', 'name-key-no-hospital','verified-capacity']){
 const t=await fixture(true,scenario);try{
  const {w,d}=t,errors=[];w.alert=()=>{};w.confirm=()=>true;w.fetch=async()=>{throw Error('Unexpected fetch')};w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});w.HTMLElement.prototype.setPointerCapture=()=>{};
  w.GM_info={scriptHandler:'Tampermonkey',version:'5.5.1',script:{version:'fixture'}};
  w.localStorage.setItem('tu:identity:public-only-key:v1','abcdef0123456789');w.localStorage.setItem('tu:agreement:accepted','fixture-v1');w.sessionStorage.setItem('tu:dev:auth:session:v1','fixture-token');w.localStorage.setItem('tu-item-monitor-v1',JSON.stringify([t.watch]));
  w.GM_xmlhttpRequest=o=>queueMicrotask(()=>o.onload?.({status:200,responseText:JSON.stringify(o.url.endsWith('/api/auth/agreement')?{accepted:true,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-07'}}:o.url.includes('/key/info')?{info:{access:{type:scenario==='name-key-no-hospital'?'Public Only':'Limited Access'},user:{id:42}}}:o.url.includes('/inventory?')?{inventory:{items:[{id:1,name:'Blood Bag : A+',amount:1,uid:null}]}}:{profile:{name:'Fixture',status:{state:scenario==='name-key-no-hospital'?'Abroad':'Hospital'}}})}));
  w.eval(fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8'));const pause=ms=>new Promise(r=>setTimeout(r,ms));await pause(100);
  d.querySelector('[data-tab="modules"]').click();const card=name=>[...d.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent===name).querySelector('button').click();card('Business Tools');card('Travel Assistant and Item Monitor');await pause(100);
  const hospital=d.querySelector('[aria-label="Planning to Hospitalize?"]');hospital.value=scenario==='name-key-no-hospital'?'no':'yes';hospital.dispatchEvent(new w.Event('change'));
  const button=name=>[...d.querySelectorAll('#tuim-panel button')].find(b=>b.textContent===name);if(scenario!=='name-key-no-hospital'){button('Load inventory').click();await pause(50);const medical=d.querySelector('[aria-label="Selected medical item"]');medical.value=medical.options[1].value;medical.dispatchEvent(new w.Event('change'));}button('Arm Snatch and Run').click();await pause(900);
  const action=d.querySelector('#tu-snatch-run');assert.equal(d.querySelector('#tuim-panel').hidden,true);if(scenario==='name-key-no-hospital'){assert.equal(action.textContent,'Purchase Max');assert.equal(t.counters.heal,0);}else{assert.equal(action.textContent,'Heal from Hospital');assert.equal(await action.onclick({isTrusted:true}),true);assert.equal(action.textContent,'Purchase Max');}assert.equal(await action.onclick({isTrusted:true}),true);assert.equal(action.textContent,'Return to Torn');assert.equal(await action.onclick({isTrusted:true}),true);assert.equal(action.textContent,'Return flight booked');assert.equal(t.counters.wrong,0);if(scenario==='verified-capacity')assert.equal(t.counters.max,0,'Verified integrated purchase survives removal of the stock row without Max');assert.deepEqual(errors,[]);w.TornUtilities.closeActiveModule();
 }finally{t.close()}
}

for(const scenario of ['wrong-medical','wrong-quantity','wrong-destination']){
 const t=await fixture(false,scenario);try{
  const heal=await t.engine.act({isTrusted:true});if(scenario==='wrong-medical'){assert.equal(heal,false);assert.equal(t.counters.heal,0);continue;}
  assert.equal(heal,true);const buy=await t.engine.act({isTrusted:true});if(scenario==='wrong-quantity'){assert.equal(buy,false);assert.equal(t.counters.purchase,0);continue;}
  assert.equal(buy,true);assert.equal(await t.engine.act({isTrusted:true}),false);assert.equal(t.counters.back,0);
 }finally{t.close()}
}
{
 const t=await fixture();try{assert.equal(await t.engine.act({isTrusted:true}),true);const icon=t.d.createElement('a');icon.setAttribute('aria-label','Hospital: New attack');t.d.body.append(icon);assert.equal(await t.engine.act({isTrusted:true}),false);assert.equal(t.counters.max,0);}finally{t.close()}
}
console.log('Desktop integrated bundle and rejection cases passed: host metadata, arming, exact confirmations, re-hospitalization and clean teardown');

{
 const t=await fixture();try{const pending=t.engine.act({isTrusted:true});t.setStock(NaN);assert.equal(await pending,false);assert.equal(t.counters.heal,0,'Unknown/lost shop stock must block medical Yes');}finally{t.close()}
}

for(const scenario of ['empty-return-panel','delayed-return-panel','expanded-pending-panel','auto-flight']){
 const t=await fixture(false,scenario);try{assert.equal(await t.engine.act({isTrusted:true}),true);assert.equal(await t.engine.act({isTrusted:true}),true);if(scenario==='expanded-pending-panel')t.d.querySelector('a[aria-controls="travel-home-panel"]').click();assert.equal(await t.engine.act({isTrusted:true}),true);assert.equal(t.engine.getState().stage,'complete');assert.equal(t.counters.home,1);assert.equal(t.counters.back,1);assert.equal(t.counters.continue,scenario==='auto-flight'?0:1);}finally{t.close()}
}
console.log('Return regression passed: pre-existing empty panel, delayed question, single home/booking click and automatic flight advance');
