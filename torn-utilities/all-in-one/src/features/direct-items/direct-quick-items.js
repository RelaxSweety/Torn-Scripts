import {createTravelRequestCapture} from './travel-request-capture.js';
// Experimental user-triggered website POST. Never uses API keys or sends via TU services.
export function createDirectQuickItems({window,document,fetchImpl,isAuthorized=()=>false,onEvent=()=>{},now=()=>Date.now(),timeoutMs=12000,build='unknown',capturePage=window}){
 const capture=capturePage.__TU_QUICKITEMS_CAPTURE__||createTravelRequestCapture({window,document,pageWindow:capturePage,build});
 const KEY='tu:quickitems-test:attempt:v1',LOG='tu:quickitems-test:log:v1';
 let panel=null,controller=null,busy=false,records=[],travelInspection=null,inspecting=false,travelOutcome=null;
 try{const saved=JSON.parse(window.sessionStorage.getItem(LOG)||'[]');if(Array.isArray(saved))records=saved.slice(-100).map(clean);}catch{}
 function clean(value){return {build:/^\d+(?:\.\d+){3}-[a-z0-9.-]+$/.test(String(value?.build||build))?String(value?.build||build):'unknown',at:/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(String(value?.at||''))?String(value.at):'',event:['requested','response','uncertain','blocked','reviewed'].includes(value?.event)?value.event:'blocked',itemId:/^\d+$/.test(String(value?.itemId))?String(value.itemId):'',elapsedMs:Number.isFinite(value?.elapsedMs)?value.elapsedMs:null,result:['success-response','error-response','further-choice','response-received','network-or-timeout','previous-attempt','invalid-context','missing-token','invalid-item','reviewed'].includes(value?.result)?value.result:'response-received'};}
 function record(event,itemId,result,started){const entry=clean({at:new Date(now()).toISOString(),event,itemId,result,elapsedMs:started===undefined?null:Math.max(0,now()-started)});records.push(entry);records=records.slice(-100);try{window.sessionStorage.setItem(LOG,JSON.stringify(records));}catch{}try{onEvent(entry);}catch{}return entry;}
 function pending(){try{return !!window.sessionStorage.getItem(KEY);}catch{return true;}}
 function contextOK(){const loc=window.location;return isAuthorized()&&loc.protocol==='https:'&&['www.torn.com','torn.com'].includes(loc.hostname)&&(loc.pathname==='/item.php'||loc.pathname==='/page.php'&&new URLSearchParams(loc.search).get('sid')==='items')&&!document.querySelector('#travel-root,[aria-label="Flight progress"]');}
 function inventory(){if(!contextOK())return [];const found=new Map();for(const row of document.querySelectorAll('li[data-item][data-category="Medical"]')){if(row.closest('#tuim-quickitems-test'))continue;const id=row.getAttribute('data-item'),qty=Number(row.getAttribute('data-qty')),name=(row.getAttribute('data-sort')||row.querySelector('.name')?.textContent||'').trim();if(/^\d+$/.test(id||'')&&Number(id)>0&&Number.isSafeInteger(qty)&&qty>0&&name)found.set(id,{id,name:name.slice(0,120),quantity:qty});}return [...found.values()];}
 function token(){for(const part of document.cookie.split(';')){const [name,...values]=part.trim().split('=');if(name==='rfc_v'){const value=values.join('=');return /^[A-Za-z0-9_-]{1,256}$/.test(value)?value:null;}}return null;}
 function plain(raw){const doc=new window.DOMParser().parseFromString(String(raw).slice(0,32000),'text/html');for(const node of doc.querySelectorAll('script,style,iframe'))node.remove();return (doc.body.textContent||'').replace(/https?:\/\/\S+/g,'[URL omitted]').replace(/\b[A-Za-z0-9_-]{24,}\b/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,2000);}
 async function use(event,id,consented=false){
  if(!event?.isTrusted||busy)return {result:'blocked'};
  if(pending()){record('blocked',id,'previous-attempt');return {result:'previous-attempt'};}
  if(!consented||!contextOK()||document.hidden||!document.hasFocus()){record('blocked',id,'invalid-context');return {result:'invalid-context'};}
  const item=inventory().find(item=>item.id===String(id));if(!item){record('blocked',id,'invalid-item');return {result:'invalid-item'};}
  const rfc=token();if(!rfc){record('blocked',id,'missing-token');return {result:'missing-token'};}
  // Reserve synchronously before the first await; one submission per gesture.
  try{window.sessionStorage.setItem(KEY,JSON.stringify({itemId:item.id,at:new Date(now()).toISOString()}));}catch{return {result:'storage-unavailable'};}
  busy=true;controller=new window.AbortController();const active=controller,started=now();record('requested',item.id,'response-received',started);renderState();
  const abort=()=>active.abort();window.addEventListener('pagehide',abort,{once:true});const timer=window.setTimeout(abort,timeoutMs);
  try{
   const url=new URL('/item.php',window.location.origin);url.searchParams.set('rfcv',rfc);const body=new URLSearchParams({step:'useItem',itemID:item.id,item:item.id});
   const response=await fetchImpl(url.href,{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},body:body.toString(),signal:active.signal});
   if(!response.ok||response.redirected)throw Error('Unconfirmed response');const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{throw Error('Unconfirmed response');}if(!data||typeof data!=='object'||Array.isArray(data)||raw.length>512000)throw Error('Unconfirmed response');
   const text=plain(typeof data.text==='string'?data.text:typeof data.message==='string'?data.message:'');if(!text)throw Error('Unconfirmed response');
   const result=data.success===false||data.error?'error-response':Array.isArray(data.links)&&data.links.length?'further-choice':data.success===true?'success-response':'response-received';
   window.sessionStorage.removeItem(KEY);record('response',item.id,result,started);return {result,text,elapsedMs:now()-started};
  }catch{record('uncertain',item.id,'network-or-timeout',started);return {result:'uncertain',text:'The outcome is unconfirmed. Check Torn inventory before clearing this attempt. Nothing will retry automatically.'};}
  finally{window.clearTimeout(timer);window.removeEventListener('pagehide',abort);if(controller===active)controller=null;busy=false;renderState();}
 }
 function travelContext(){return isAuthorized()&&!document.hidden&&document.hasFocus()&&window.location.protocol==='https:'&&['torn.com','www.torn.com'].includes(window.location.hostname)&&!!document.querySelector('#travel-root');}
 async function travelRequest(step,signal,slotId){
  const rfc=token();if(!rfc)throw Error('missing-token');
  const url=new URL('/page.php',window.location.origin);url.search=new URLSearchParams({sid:'travelData',step,rfcv:rfc}).toString();
  const options={method:slotId===undefined?'GET':'POST',credentials:'same-origin',redirect:'error',cache:'no-store',signal};
  if(slotId!==undefined){options.headers={'Content-Type':'application/json','Accept':'application/json'};options.body=JSON.stringify({slotID:Number(slotId)});}
  const response=await fetchImpl(url.href,options);if(!response.ok||response.redirected)throw Error('unconfirmed-response');
  const raw=await response.text();if(raw.length>512000)throw Error('oversized-response');const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid-response');return data;
 }
 function validTravelInventory(data){
  // An empty mapping alone is never proof of an empty inventory.
  if(!Array.isArray(data?.slots)||!Number.isSafeInteger(data.maxBaseSlots)||!Number.isSafeInteger(data.maxSpecialSlots)||data.maxBaseSlots<0||data.maxSpecialSlots<0||data.slots.length!==data.maxBaseSlots+data.maxSpecialSlots||data.slots.length>100)return false;
  const positiveId=value=>/^[1-9][0-9]{0,14}$/.test(String(value))&&Number.isSafeInteger(Number(value));
  const ids=new Set();for(const slot of data.slots){const id=String(slot?.ID);if(!slot||!positiveId(slot.ID)||ids.has(id)||!(slot.item==null||slot.item&&positiveId(slot.item.ID)))return false;ids.add(id);}return true;
 }
 // One captured foreign-shop transaction per trusted gesture. Remainders are scheduled by the facade.
 async function buyRunItem(event,quote,guard,expectedFingerprint){
  if(!event?.isTrusted||busy||inspecting||pending()||!travelContext()||!token())return {result:'blocked'};
  busy=true;const active=new window.AbortController();controller=active;const abort=()=>active.abort(),timer=window.setTimeout(abort,timeoutMs);window.addEventListener('pagehide',abort,{once:true});let posted=false;
  try{
   capture.start();const before=await travelRequest('inventory',active.signal);
   if(!validTravelInventory(before)||!guard())return {result:'inventory-unconfirmed'};
   if(expectedFingerprint&&inventoryFingerprint(before)!==expectedFingerprint)return {result:'inventory-changed',text:'Inventory changed between purchases. Review and re-arm.'};
   const capacity=inventoryCapacity(before),plan=quote(capacity);
   if(!plan||!/^\d{1,15}$/.test(String(plan.id))||!Number.isSafeInteger(plan.amount)||plan.amount<1||plan.amount>capacity.total-capacity.occupied||!Number.isSafeInteger(plan.price)||plan.price<=0||!Number.isSafeInteger(plan.cash)||plan.cash<plan.amount*plan.price||typeof plan.name!=='string'||!plan.name.trim())return {result:'invalid-quote'};
   const final=quote(capacity);
   if(!guard()||!travelContext()||active.signal.aborted||JSON.stringify(final)!==JSON.stringify(plan))return {result:'quote-changed'};
   // The captured endpoint mutates via GET. Disable caching and redirects; never retry this request.
   const rfc=token();if(!rfc)return {result:'blocked'};
   const url=new URL('/page.php',window.location.origin);url.search=new URLSearchParams({sid:'travelData',step:'buy',itemID:String(plan.id),amount:String(plan.amount),rfcv:rfc}).toString();
   window.sessionStorage.setItem(KEY,JSON.stringify({scope:'travel',operation:'buy',itemId:String(plan.id),amount:plan.amount,at:new Date(now()).toISOString()}));posted=true;record('requested',plan.id,'response-received');
   const response=await fetchImpl(url.href,{method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',signal:active.signal});
   if(!response.ok||response.redirected)throw Error('unconfirmed-purchase');const raw=await response.text();if(raw.length>512000)throw Error('oversized-response');const data=JSON.parse(raw);
   const actual=['number','string'].includes(typeof data?.amount)&&/^[1-9][0-9]*$/.test(String(data.amount))?Number(data.amount):NaN,total=typeof data?.total==='number'?data.total:typeof data?.total==='string'&&/^\$?[\d,]+$/.test(data.total)?Number(String(data.total).replace(/[$,]/g,'')):NaN;
   if(data?.success!==true||!Number.isSafeInteger(actual)||actual<1||actual>plan.amount||!Number.isSafeInteger(total)||total!==actual*plan.price)throw Error('purchase-response-unconfirmed');
   const after=await travelRequest('inventory',active.signal);
   if(!validTravelInventory(after)||after.maxBaseSlots!==before.maxBaseSlots||after.maxSpecialSlots!==before.maxSpecialSlots)throw Error('inventory-unconfirmed');
   let added=0;
   for(const prior of before.slots){const current=after.slots.find(s=>String(s.ID)===String(prior.ID));if(!current)throw Error('slot-changed');if(prior.item!=null){if(JSON.stringify(slotIdentity(prior))!==JSON.stringify(slotIdentity(current)))throw Error('unrelated-change');}else if(current.item!=null){if(String(current.item.ID)!==String(plan.id)||current.item.name!==plan.name)throw Error('wrong-item');added++;}}
   if(added!==actual)throw Error('purchase-count-unconfirmed');
   travelInspection={at:new Date(now()).toISOString(),build,...capture.inventoryInfo(after)};
   travelOutcome={at:new Date(now()).toISOString(),build,operation:'buy',itemId:String(plan.id),amount:actual,requested:plan.amount,verification:'response-and-fresh-inventory'};
   // Keep the lock if the run was canceled after submission, even if the inventory read succeeded.
   if(!guard()||active.signal.aborted)throw Error('run-changed');
   window.sessionStorage.removeItem(KEY);record('response',plan.id,'success-response');
   return {result:'purchase-confirmed',amount:actual,spent:total,requested:plan.amount,price:plan.price,cash:plan.cash,slots:before.slots.map((slot,index)=>{const current=after.slots.find(s=>String(s.ID)===String(slot.ID));return {number:index+1,id:String(slot.ID),added:slot.item==null&&current.item!=null,empty:current.item==null};}),inventoryCapacity:inventoryCapacity(after),inventoryFingerprint:inventoryFingerprint(after)};
  }catch{return {result:posted?'uncertain':'inventory-unconfirmed',text:posted?'Purchase outcome is unconfirmed. Review Torn inventory before re-arming; no retry will occur.':'Purchase checks failed. No purchase request was sent.'};}
  finally{window.clearTimeout(timer);window.removeEventListener('pagehide',abort);if(controller===active)controller=null;busy=false;renderState();}
 }
 const slotIdentity=slot=>[String(slot.ID),slot.item==null?null:[String(slot.item.ID),slot.item.name||'',String(slot.item.UID??slot.item.uid??'')]];
 const inventoryFingerprint=data=>JSON.stringify(data.slots.map(slotIdentity).sort((a,b)=>a[0].localeCompare(b[0])));
 const selectedSlot=(slot,items)=>!!slot.item&&(items||[]).some(item=>typeof item?.name==='string'&&!!item.name.trim()&&slot.item.name===item.name&&(!item.id||String(item.id)===String(slot.item.ID))&&(!item.uid||String(slot.item.UID??slot.item.uid??'')===String(item.uid)));
 const inventoryCapacity=data=>({total:data.slots.length,occupied:data.slots.filter(slot=>slot.item!=null).length});
 async function useTravel(event,selection,consented=false,workflow=null){
  if(!event?.isTrusted||busy||inspecting||pending()||!consented||!travelContext())return {result:'blocked'};
  const trashing=workflow?.operation==='trash';
  let expected=workflow?null:travelInspection?.mappings.find(row=>row.slotId===String(selection));
  // Every use is explicitly selected and matched against fresh complete inventory.
  if(!workflow&&(!expected||!/^\d{1,15}$/.test(expected.slotId))||!token())return {result:'invalid-item'};
  busy=true;travelOutcome=null;controller=new window.AbortController();const active=controller,started=now();let posted=false;
  const abort=()=>active.abort(),timer=window.setTimeout(abort,timeoutMs);window.addEventListener('pagehide',abort,{once:true});renderState();
  try{
   capture.start();const before=await travelRequest('inventory',active.signal);
   if(!validTravelInventory(before))return {result:'inventory-unconfirmed'};
   if(workflow){
    if(!workflow.guard())return {result:'blocked'};
    if(trashing&&workflow.expectedFingerprint&&inventoryFingerprint(before)!==workflow.expectedFingerprint)return {result:'inventory-changed',text:'Travel inventory changed between destruction steps. Re-arm and review the selected items.'};
    expected=null;
    for(const selected of workflow.items||[]){const slot=before.slots.find(slot=>selectedSlot(slot,[selected]));if(slot){expected={slotId:String(slot.ID),itemId:String(slot.item.ID),name:slot.item.name};break;}}
    if(!expected){
     const conflict=before.slots.some(slot=>slot.item&&(workflow.items||[]).some(item=>item?.name===slot.item.name));
     if(trashing&&!conflict)return {result:'nothing-selected-carried',remaining:0,inventoryCapacity:inventoryCapacity(before),inventoryFingerprint:inventoryFingerprint(before)};
     return {result:'invalid-item',text:'No selected item is currently carried with a verified matching identity. No item request was sent.'};
    }
   }
   const current=before.slots.find(slot=>String(slot.ID)===expected.slotId);
   if(!current?.item||String(current.item.ID)!==expected.itemId||current.item.name!==expected.name||!travelContext()||active.signal.aborted||workflow&&!workflow.guard())return {result:'slot-changed',text:'Inventory changed. Inspect again before selecting an item.'};
   if(trashing&&current.item.isTrashable===false)return {result:'not-trashable',text:'Torn marks the selected item as not trashable. No request was sent.'};
   // Reserve before the sole state-changing request; reloads and uncertain outcomes stay locked.
   window.sessionStorage.setItem(KEY,JSON.stringify({scope:'travel',operation:trashing?'trash':'use',itemId:expected.itemId,slotId:expected.slotId,at:new Date(now()).toISOString()}));
   posted=true;record('requested',expected.itemId,'response-received',started);
   const data=await travelRequest(trashing?'trashItem':'useItem',active.signal,expected.slotId),evidence=capture.useInfo(data);
   travelOutcome={at:new Date(now()).toISOString(),build,operation:trashing?'trash':'use',slotId:expected.slotId,itemId:expected.itemId,evidence,consumption:'unconfirmed',hospitalRelease:evidence.hospitalRelease};
   if(data.success!==true||(!trashing&&data.itemRemoved!==true)||trashing&&data.itemRemoved===false)throw Error('unconfirmed-use');
   const after=await travelRequest('inventory',active.signal);
   if(!validTravelInventory(after)||!after.slots.some(slot=>String(slot.ID)===expected.slotId&&slot.item==null))throw Error('removal-unconfirmed');
   if(trashing){
    const expectedAfter={slots:before.slots.map(slot=>String(slot.ID)===expected.slotId?{ID:slot.ID,item:null}:slot)};
    if(after.maxBaseSlots!==before.maxBaseSlots||after.maxSpecialSlots!==before.maxSpecialSlots||inventoryFingerprint(after)!==inventoryFingerprint(expectedAfter))throw Error('unrelated-inventory-change');
   }
   travelOutcome.consumption='confirmed-by-response-and-fresh-inventory';
   // Release is separate evidence; never advances purchase/travel or assumes a partial heal released the player.
   travelInspection={at:new Date(now()).toISOString(),build,...capture.inventoryInfo(after)};
   window.sessionStorage.removeItem(KEY);record('response',expected.itemId,'success-response',started);
   return {result:trashing?'destruction-confirmed':'consumption-confirmed',inventoryCapacity:inventoryCapacity(after),...(trashing?{remaining:after.slots.filter(slot=>selectedSlot(slot,workflow.items)).length,inventoryFingerprint:inventoryFingerprint(after)}:{}),text:plain(data.message||data.text||'Item consumed.')+' Hospital release: '+travelOutcome.hospitalRelease+'.',...travelOutcome};
  }catch{if(posted)record('uncertain',expected.itemId,'network-or-timeout',started);return {result:posted?'uncertain':'inventory-unconfirmed',text:posted?'Check Torn before clearing this attempt. No retry will occur.':'Inventory could not be verified. No item-use request was sent.'};}
  finally{window.clearTimeout(timer);window.removeEventListener('pagehide',abort);if(controller===active)controller=null;busy=false;renderState();refreshTravelChoices();}
 }
 function refreshTravelChoices(){if(!panel)return;const select=panel.querySelector('[data-travel-select]');select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select a verified travel item';select.append(placeholder);for(const item of travelInspection?.mappings||[]){const option=document.createElement('option');option.value=item.slotId;option.textContent=item.name+' (slot '+item.slotId+')';select.append(option);}renderState();}
 async function inspectTravel(event){
  if(!event?.isTrusted||busy||inspecting||!isAuthorized()||document.hidden||!document.hasFocus()||!document.querySelector('#travel-root')||window.location.protocol!=='https:'||!['torn.com','www.torn.com'].includes(window.location.hostname))return {result:'invalid-context'};
  const rfc=token();if(!rfc)return {result:'missing-token'};
  inspecting=true;const abort=new window.AbortController(),timer=window.setTimeout(()=>abort.abort(),timeoutMs);
  try{capture.start();const url=new URL('/page.php',window.location.origin);url.search=new URLSearchParams({sid:'travelData',step:'inventory',rfcv:rfc}).toString();
   const response=await fetchImpl(url.href,{method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',signal:abort.signal});
   if(!response.ok||response.redirected)throw Error();const raw=await response.text();if(raw.length>512000)throw Error();const data=JSON.parse(raw);if(!data||typeof data!=='object'||!Object.hasOwn(data,'slots'))throw Error();
   travelInspection={at:new Date(now()).toISOString(),build,...capture.inventoryInfo(data)};return travelInspection;
  }catch{return {result:'inspection-unconfirmed'};}finally{window.clearTimeout(timer);inspecting=false;}
 }
 function renderState(){if(!panel)return;const travelButton=panel.querySelector('[data-travel-use]');if(travelButton)travelButton.disabled=busy||inspecting||pending()||!travelContext()||!panel.querySelector('[data-travel-consent]').checked||!panel.querySelector('[data-travel-select]').value;const useButton=panel.querySelector('[data-use]'),choice=panel.querySelector('select'),consent=panel.querySelector('[data-consent]');useButton.disabled=busy||pending()||!consent.checked||!choice.value||!contextOK();panel.querySelector('[data-review]').hidden=!pending()||busy;panel.querySelector('[data-state]').textContent=busy?'Request pending — additional clicks are blocked.':pending()?'Previous attempt is unconfirmed. Check Torn inventory before proceeding.':'Ready for a user-triggered personal item test.';}
 function review(event){if(!event?.isTrusted||busy)return false;try{window.sessionStorage.removeItem(KEY);}catch{return false;}record('reviewed','','reviewed');renderState();return true;}
 function refresh(){if(!panel)return;const select=panel.querySelector('select');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Select a visible personal medical item';select.append(empty);for(const item of inventory()){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' × '+item.quantity;select.append(option);}panel.querySelector('[data-context]').textContent=contextOK()?'Personal inventory only. Open the relevant Medical list in Torn, then refresh this list.':'Open Torn Items (personal inventory) to test. Flight and foreign inventories are not supported by this endpoint.';renderState();}
 function close(){controller?.abort();panel?.remove();panel=null;}
 function open(){if(panel?.isConnected)return;panel=document.createElement('section');panel.id='tuim-quickitems-test';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Direct Quick Items experimental test');panel.style.cssText='position:fixed;inset:5vh 4vw;z-index:2147483646;background:#11191d;color:#eee;border:2px solid #d6b65c;border-radius:12px;padding:18px;overflow:auto;font:15px/1.5 system-ui;box-sizing:border-box';
  panel.innerHTML='<h2>Direct Quick Items · Experimental</h2><h3>Identify the travel item endpoint</h3><p>On a travel/foreign inventory page, start diagnostics and perform your normal inventory, purchase and travel steps in Torn. Recording continues across same-tab navigation until diagnostics are stopped. No requests are replayed. Restore Item Monitor and select Report Generation to export the sanitized request details.</p><button type="button" data-capture>Start travel request recording</button><h3>Read-only travel inventory inspection</h3><p>Inspect before and after using an item normally in Torn, then generate the Item Monitor report. Names alone never authorize direct use. Direct travel use is available below for the explicitly selected carried item, with a fresh identity check per click.</p><button type="button" data-inspect>Inspect current travel inventory (GET only)</button><pre data-inspection style="white-space:pre-wrap"></pre><h3>Personal item POST pilot</h3><p>Personal medical inventory only. One explicit click sends one item-use POST to Torn using your signed-in session. No simulated Use/Yes clicks, automatic retries or automatic follow-up actions.</p><p data-context></p><select aria-label="Personal medical item"></select><button type="button" data-refresh>Refresh item list</button><label style="display:flex;gap:8px;margin:14px 0"><input type="checkbox" data-consent>I understand this consumes a personal inventory item, not a travel inventory item.</label><button type="button" data-use>Use selected item (POST)</button><p data-state role="status"></p><p data-result style="white-space:pre-wrap"></p><button type="button" data-review hidden>I checked Torn inventory — clear unconfirmed attempt</button><p>Read the Torn response below before further actions. Any additional choices must be made in Torn. Export timing logs through Item Monitor → Report Generation. Experimental Snatch healing and hospitalization also use this direct item handler.</p><h3>Travel item handler</h3><p>Inspect inventory above first. Each click checks the current slot, uses one selected item, then verifies removal. Snatch and Run is not advanced automatically.</p><select data-travel-select aria-label="Travel item"></select><label style="display:flex;gap:8px;margin:14px 0"><input type="checkbox" data-travel-consent>I understand the selected travel item will be consumed.</label><button type="button" data-travel-use>Use selected travel item (POST)</button><p data-travel-result style="white-space:pre-wrap" role="status"></p><button type="button" data-close>Close test panel</button>';
  for(const button of panel.querySelectorAll('button'))button.style.cssText='padding:10px;margin:6px;background:#d6b65c;color:#111;border:0;border-radius:6px;font:bold 14px system-ui;cursor:pointer';panel.querySelector('select').style.cssText='display:block;width:100%;padding:10px;background:#283239;color:white';
  panel.querySelector('[data-inspect]').onclick=async event=>{const button=event.currentTarget;button.disabled=true;const result=await inspectTravel(event);if(panel)panel.querySelector('[data-inspection]').textContent=JSON.stringify(result,null,2);button.disabled=false;refreshTravelChoices();};panel.querySelector('[data-capture]').disabled=!capture.canStart();panel.querySelector('[data-capture]').onclick=event=>{if(capture.start(event))close();};panel.querySelector('[data-close]').onclick=close;panel.querySelector('[data-refresh]').onclick=refresh;panel.querySelector('select').onchange=renderState;panel.querySelector('[data-consent]').onchange=renderState;panel.querySelector('[data-review]').onclick=review;panel.querySelector('[data-use]').onclick=async event=>{const select=panel?.querySelector('select');const result=await use(event,select?.value,panel?.querySelector('[data-consent]').checked);if(panel)panel.querySelector('[data-result]').textContent=result.text||result.result;};panel.querySelector('[data-travel-select]').onchange=renderState;panel.querySelector('[data-travel-consent]').onchange=renderState;panel.querySelector('[data-travel-use]').onclick=async event=>{const selection=panel?.querySelector('[data-travel-select]').value,consented=panel?.querySelector('[data-travel-consent]').checked;const result=await useTravel(event,selection,consented);if(panel)panel.querySelector('[data-travel-result]').textContent=result.text||result.result;};document.body.append(panel);refresh();refreshTravelChoices();
 }
 return {clearLogs(){capture.clear();records=[];if(!busy&&!inspecting){travelInspection=null;travelOutcome=null;}try{window.sessionStorage.removeItem(LOG);}catch{}},open,close,stop(){close();capture.stop();},captureStart:()=>capture.start(),captureStop:()=>capture.stop(),captureResume:()=>capture.resume(),inspectTravel,useTravel,buyRunItem,useRunItem:(event,items,guard)=>useTravel(event,null,true,{items,guard}),trashRunItem:(event,items,guard,expectedFingerprint)=>useTravel(event,null,true,{items,guard,operation:'trash',expectedFingerprint}),hasPendingAttempt:pending,cancel:()=>controller?.abort(),use,review,inventory,report:()=>({build,transport:'direct-website-post',inventoryScope:'personal-medical-and-selected-travel-items',travelRequestCapture:capture.report(),travelInspection,travelOutcome,travelPilot:{enabled:true,selectionScope:'explicit-user-selected-carried-items',freshIdentityCheck:true,automaticFollowUps:false},busy,unconfirmedAttempt:pending(),records:records.map(entry=>({...entry})),limitation:'Response receipt is not proof of travel inventory consumption. Snatch item use and selected destruction use the direct handler; purchase uses verified direct requests; return travel retains native transport.'})};
}
