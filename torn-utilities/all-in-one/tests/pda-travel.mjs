import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createNativeTravelActions} from '../src/features/native-travel-actions.js';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/pda-travel.json',import.meta.url)));
async function fixture(bundle=false,scenario=''){
 const dom=new JSDOM(`<body><a aria-label="Hospital: Fixture injury"></a><div id="travel-root"><h4>Mexico</h4>${f.homeLink}<ul class="inventoryPanel_fixture">${f.closedSlot}</ul><div class="stockTableWrapper_fixture"><div class="itemsHeader_fixture"><span>Name</span><span>Stock</span><span>Cost</span></div><ul class="shop">${f.shopItem}</ul></div></div><aside><button id="unrelated-yes">Yes</button></aside></body>`,{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window,d=w.document,observers=[],NativeObserver=w.MutationObserver;w.MutationObserver=class extends NativeObserver{constructor(fn){super(fn);observers.push(this);}};d.hasFocus=()=>true;
 w.HTMLElement.prototype.getClientRects=function(){return this.hidden||this.disabled||this.closest('[class*=tabletHide]')?[]:[{}]};
 const counters={use:0,heal:0,expand:0,max:0,pdaMax:0,buy:0,purchase:0,home:0,back:0,continue:0,wrong:0,hiddenMax:0};let stock=3895;
 const adapter=createNativeTravelActions({document:d,window:w,enabled:()=>true});
 const root=d.querySelector('#travel-root'),inventory=root.querySelector('ul'),slot=inventory.querySelector('li'),shop=root.querySelector('.shop');
 const delay=fn=>w.setTimeout(fn,20),getPanel=html=>{const wrap=d.createElement('div');wrap.innerHTML=html;return wrap.querySelector('#item-260-buyPanel');};
 d.querySelector('#unrelated-yes').onclick=()=>counters.wrong++;
 slot.querySelector('button').onclick=()=>{const holder=d.createElement('div');holder.innerHTML=f.openSlot;slot.innerHTML=holder.firstElementChild.innerHTML;slot.querySelector('button').setAttribute('aria-expanded','true');[...slot.querySelectorAll('button')].find(e=>e.textContent.trim()==='Use').onclick=()=>{counters.use++;delay(()=>{slot.querySelector('[class*=controls]').innerHTML=f.healConfirmation;slot.querySelector('form').onsubmit=e=>e.preventDefault();[...slot.querySelectorAll('button')].find(e=>e.textContent==='Yes').onclick=e=>{e.preventDefault();counters.heal++;delay(()=>{slot.querySelector('[class*=controls]').innerHTML='<b>You are out of the hospital!</b>';d.querySelector('a[aria-label^="Hospital:"]')?.remove();});};});};};
 const row=shop.querySelector('[class*=row]'),item=shop.querySelector('li');row.querySelector('.wai-btn').onclick=()=>counters.hiddenMax++;
 row.querySelector('.input-money').value='99999';
 row.querySelector('[class*=buyIconButton]').onclick=e=>{e.preventDefault();counters.expand++;delay(()=>{
  const panel=getPanel(f.amountRow);item.append(panel);const amountPanel=panel.querySelector('[class*=amountPanel]');
  if(scenario==='wrong-item')amountPanel.querySelector('strong').textContent='Other item';
  const input=amountPanel.querySelector('.input-money'),buy=[...amountPanel.querySelectorAll('button')].find(e=>e.textContent==='Buy');
  const setMax=()=>delay(()=>{input.value='17';buy.disabled=false;});
  amountPanel.querySelector('.wai-btn').onclick=()=>{counters.max++;setMax();};amountPanel.querySelector('.pda-max-btn').onclick=()=>{counters.pdaMax++;setMax();};
  if(scenario==='fallback-max')amountPanel.querySelector('.wai-btn').remove();
  buy.onclick=e=>{e.preventDefault();counters.buy++;delay(()=>{
   panel.innerHTML=getPanel(f.buyConfirmation).innerHTML;
   if(scenario==='wrong-quantity')panel.querySelector('strong').textContent='18x Dahlia';
   [...panel.querySelectorAll('button')].find(e=>e.textContent==='Yes').onclick=()=>{counters.purchase++;delay(()=>{
    inventory.replaceChildren();const remaining=d.createElement('li');remaining.className='inventorySlot_fixture';remaining.innerHTML='<button aria-label="Morphine slot 3"></button>';inventory.append(remaining);
    for(let n=1;n<=17;n++){const li=d.createElement('li');li.className='inventorySlot_fixture';const b=d.createElement('button');b.setAttribute('aria-label','Dahlia slot '+(n+3));li.append(b);inventory.append(li);}stock-=17;panel.remove();
   });};
  });};
 });};
 root.querySelector('a[aria-controls="travel-home-panel"]').onclick=()=>{counters.home++;delay(()=>{const holder=d.createElement('div');holder.innerHTML=f.returnConfirmation;const panel=holder.firstElementChild;root.append(panel);panel.querySelector('button').onclick=()=>{counters.back++;delay(()=>{const wrap=d.createElement('div');wrap.innerHTML=f.booked;panel.innerHTML=wrap.firstElementChild.innerHTML;panel.querySelector('button').onclick=()=>{counters.continue++;root.innerHTML='<h4>Traveling</h4><section aria-label="Flight progress">Mexico to Torn</section>';};});};});};
 const watch={key:scenario==='name-key-no-hospital'?'name:dahlia':'id:260',name:'Dahlia',category:'Foreign',minQty:1};let engine;
 const snapshot=()=>{const state=adapter.inspect(engine?.getState());return {ownerId:'42',country:'mexico',hospitalized:state.released?false:!!d.querySelector('a[aria-label^="Hospital:"]'),quantity:stock,...state};};
 engine=createTravelEnhancements({document:d,window:w,getItems:()=>[watch],getContext:async()=>({ownerId:'42',country:'mexico',status:scenario==='name-key-no-hospital'?'Abroad':'Hospital'}),getSnapshot:snapshot,getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter});
 if(scenario==='name-key-no-hospital')d.querySelector('a[aria-label^="Hospital:"]')?.remove();
 if(!bundle){engine.start();await engine.arm({watchKey:watch.key,hospital:scenario!=='name-key-no-hospital',medical:scenario==='name-key-no-hospital'?null:{id:206,name:'Morphine',uid:null}});engine.stock(watch,snapshot());}
 return {w,d,engine,adapter,counters,watch,snapshot,close(){w.TornUtilities?.closeActiveModule();engine.stop();for(const observer of observers)observer.disconnect();dom.window.close();}};
}
// Torn's document outside-tap handler must not dismiss the medical popover
// when the player taps TU again while the native Yes question is rendering.
{
 const t=await fixture();try{
  const button=t.d.querySelector('#tu-snatch-run');let dismissed=0,captured=0;
  t.d.addEventListener('click',()=>captured++,true);
  for(const type of ['pointerdown','mousedown','touchstart','click'])t.d.addEventListener(type,event=>{
   if(!event.composedPath().includes(t.d.querySelector('[class*=inventorySlot]'))&&t.d.querySelector('[class*=itemPopover]')){
    dismissed++;t.d.querySelector('[class*=itemPopover]').remove();
   }
  });
  const pending=button.onclick({isTrusted:true,stopPropagation(){}});
  await new Promise(resolve=>t.w.setTimeout(resolve,5));
  for(const type of ['pointerdown','mousedown','touchstart','click'])button.dispatchEvent(new t.w.Event(type,{bubbles:true,cancelable:true}));
  assert.equal(await pending,true,'Repeated TU taps cannot interrupt medical Yes');
  assert.equal(dismissed,0);assert.ok(captured>0,'Passive capture diagnostics still receive clicks');
  assert.equal(t.counters.use,1);assert.equal(t.counters.heal,1);assert.equal(t.counters.purchase,0);
  assert.equal(button.textContent,'Purchase Max');
 }finally{t.close()}
}
for(const scenario of ['', 'fallback-max','wrong-item','wrong-quantity','cancel-panel']){
 const t=await fixture(false,scenario);try{
  assert.equal(await t.engine.act({isTrusted:true}),true);assert.equal(t.engine.getState().stage,'buy');assert.equal(t.counters.purchase,0);
  const pending=t.engine.act({isTrusted:true});assert.equal(t.engine.act({isTrusted:true}),false,'Double click cannot duplicate the buy transaction');
  if(scenario==='cancel-panel')t.engine.disarm();const ok=await pending;
  if(['wrong-item','wrong-quantity','cancel-panel'].includes(scenario)){assert.equal(ok,false);assert.equal(t.counters.purchase,0);assert.equal(t.counters.hiddenMax,0);continue;}
  assert.equal(ok,true);assert.equal(t.engine.getState().stage,'return');assert.equal(t.counters.expand,1);assert.equal(t.counters.hiddenMax,0);assert.equal(t.counters.purchase,1);assert.equal(t.counters.max+t.counters.pdaMax,1);assert.equal(t.counters.back,0);
  assert.equal(await t.engine.act({isTrusted:true}),true);assert.equal(t.engine.getState().stage,'complete');assert.equal(t.counters.back,1);assert.equal(t.counters.continue,1);assert.equal(t.counters.wrong,0);
 }finally{t.close()}
}
for(const scenario of ['', 'name-key-no-hospital']){
 const t=await fixture(true,scenario);try{
  const {w,d}=t,errors=[],requests=[];w.alert=()=>{};w.confirm=()=>true;w.fetch=async()=>{throw Error('Unexpected fetch')};w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});w.HTMLElement.prototype.setPointerCapture=()=>{};
  Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 13; wv) Chrome/156.0.8078.47 Mobile Safari/537.36 com.manuito.tornpda'});
  w.localStorage.setItem('tu:identity:public-only-key:v1','abcdef0123456789');w.localStorage.setItem('tu:agreement:accepted','fixture-v1');w.sessionStorage.setItem('tu:dev:auth:session:v1','fixture-token');w.localStorage.setItem('tu-item-monitor-v1',JSON.stringify([t.watch]));
  w.flutter_inappwebview={callHandler:async(method,url)=>{requests.push({method,url});return {status:200,responseText:JSON.stringify(url.endsWith('/api/auth/agreement')?{accepted:true,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-07'}}:url.includes('/key/info')?{info:{access:{type:scenario==='name-key-no-hospital'?'Public Only':'Limited Access'},user:{id:42}}}:url.includes('/inventory?')?{inventory:{items:[{id:206,name:'Morphine',amount:2,uid:null}]}}:{profile:{name:'Fixture',status:{state:scenario==='name-key-no-hospital'?'Abroad':'Hospital'}}})};}};
  w.eval(fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8'));const pause=ms=>new Promise(r=>setTimeout(r,ms));await pause(100);
  d.querySelector('[data-tab="modules"]').click();const card=name=>[...d.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent===name).querySelector('button').click();card('Business Tools');card('Travel Assistant and Item Monitor');await pause(100);
  const hospital=d.querySelector('[aria-label="Are you hospitalized?"]');hospital.value=scenario==='name-key-no-hospital'?'no':'yes';hospital.dispatchEvent(new w.Event('change'));
  const button=name=>[...d.querySelectorAll('#tuim-panel button')].find(b=>b.textContent===name);if(scenario!=='name-key-no-hospital'){button('Load medical inventory').click();await pause(50);}button('Arm Snatch and Run').click();await pause(900);
  const action=d.querySelector('#tu-snatch-run');assert.equal(d.querySelector('#tuim-panel').hidden,true);if(scenario==='name-key-no-hospital'){assert.equal(action.textContent,'Purchase Max');assert.equal(t.counters.heal,0);}else{assert.equal(action.textContent,'Heal from Hospital');assert.equal(await action.onclick({isTrusted:true}),true);assert.equal(action.textContent,'Purchase Max');}assert.equal(await action.onclick({isTrusted:true}),true);assert.equal(action.textContent,'Return to Torn');assert.equal(await action.onclick({isTrusted:true}),true);assert.equal(action.textContent,'Return flight booked');assert.equal(t.counters.hiddenMax,0);assert.equal(t.counters.wrong,0);assert.equal(requests.some(r=>r.method==='PDA_httpGet'&&r.url.includes('/inventory?')),scenario!=='name-key-no-hospital','No-hospital purchase must not request medical inventory');assert.deepEqual(errors,[]);w.TornUtilities.closeActiveModule();
 }finally{t.close()}
}
console.log('PDA travel passed: captured Morphine/Yes, compact panel expansion, visible Max/Buy/Yes, hidden-field isolation, quantity/item checks, cancellation, inventory proof and full bridge-backed generated bundle');
