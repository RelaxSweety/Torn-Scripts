// Captured desktop and PDA Torn travel UI. One trusted TU action may expand its native
// controls and confirm that same item/action; it never starts the next TU stage.
export function createNativeTravelActions({document,window,enabled=()=>false,now=()=>Date.now()}){
 const norm=v=>String(v||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
 const label=e=>norm(e?.getAttribute('aria-label')||e?.textContent||e?.value);
 const shown=e=>!!e?.isConnected&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&e.getClientRects().length>0&&window.getComputedStyle(e).visibility!=='hidden'&&!e.closest('#tuim-panel,#tu-snatch-run,#tu-snatch-extra-hosp,#tu-pda-panel');
 const one=(list,description)=>{const items=[...list].filter(shown);if(items.length>1)throw Error('Ambiguous '+description+'; no action selected');return items[0]||null;};
 const buttons=(root,text)=>[...(root?.querySelectorAll('button,a,input[type=button],input[type=submit]')||[])].filter(e=>label(e)===norm(text));
 const scope=()=>document.querySelector('#travel-root');
 const itemName=e=>norm(e?.getAttribute('aria-label')).replace(/\s+slot\s+\d+$/,'');
 const inventory=name=>[...(scope()?.querySelectorAll('[class*=inventorySlot] > button[aria-label]')||[])].filter(e=>shown(e)&&itemName(e)===norm(name));
 const same=(a,b)=>a&&b&&a.ownerId===b.ownerId&&a.intentId===b.intentId&&a.expiresAt===b.expiresAt&&a.watchKey===b.watchKey;
 function resolveItem(run){
  const declared=String(run.watchKey||'').match(/^id:(\d+)$/)?.[1];
  const candidates=[...(scope()?.querySelectorAll('form[id^="item-"][id$="-form"]')||[])].map(form=>({form,id:form.id.match(/^item-(\d+)-form$/)?.[1],row:form.closest('[class*=row]')})).filter(({row,id})=>{
   if(!id||declared&&id!==declared||!shown(row)||norm(row.querySelector('[class*=tabletColB] button')?.textContent)!==norm(run.watchName))return false;
   const data=row.getAttribute('data-item-id')||row.getAttribute('data-itemid');if(data&&String(data)!==id)return false;
   return [...row.querySelectorAll('button[aria-controls]')].some(e=>e.getAttribute('aria-controls')==='item-'+id+'-buyPanel');
  });
  if(candidates.length!==1)throw Error(candidates.length?'More than one native item matches this monitor; no purchase selected':'The monitored item could not be identified in the current foreign shop. No purchase was sent.');
  return candidates[0];
 }
 function capacityFor(row,run,stock,nativeMax,priceOverride=null){
  const ledger=run.capacityLedger;
  const banner=travelBanner();
  if(!ledger?.valid)return {verified:false,reason:'capacity-baseline-unavailable',desired:nativeMax};
  const total=ledger.total,occupied=Math.max(0,ledger.initialOccupied-ledger.freed+ledger.purchased),free=Math.max(0,total-occupied);
  const currency=value=>{const match=String(value||'').match(/(-?)\$\s*(-?)([\d,]+(?:\.\d+)?)(?![\w,.])/);return match?((match[1]||match[2])?-1:1)*Number(match[3].replace(/,/g,'')):NaN;};
  const price=Number.isFinite(priceOverride)&&priceOverride>0?priceOverride:currency(row.querySelector('[class*=tabletColD] [class*=displayPrice]')?.textContent||row.querySelector('[class*=tabletColD]')?.textContent);
  const displayedCash=currency(document.getElementById('user-money')?.textContent);
  const cash=Number.isFinite(displayedCash)?displayedCash:currency(banner.match(/and have\s*(\$\s*-?[\d,]+(?:\.\d+)?)/i)?.[1]);
  if(!(price>0)||!Number.isFinite(cash))return {verified:false,reason:'funds-not-available',total,occupied,free,desired:Math.min(nativeMax,free,stock)};
  const budget=Number.isFinite(ledger.cashBeforePurchase)?Math.max(0,ledger.cashBeforePurchase-(ledger.spent||0)):cash;const affordable=Math.max(0,Math.floor(Math.min(cash,budget)/price)),desired=Math.max(0,Math.min(free,stock,affordable));
  return {verified:true,total,occupied,free,price,cash,desired,affordableSlots:Math.min(free,affordable),limitedBy:desired===free?'space':desired===stock?'stock':'funds'};
 }
 let controller=null,released=null,purchased=null,booked=null,hospitalizedProof=null;
 const consumed=[];
 const isConsumed=e=>consumed.some(record=>record.opener===e&&e.getAttribute('aria-label')===record.slotLabel);
 const availableItem=items=>{for(const item of items||[]){const opener=inventory(item.name).find(e=>!isConsumed(e)&&(!item.uid||String(e.closest('li')?.getAttribute('data-item-uid'))===String(item.uid)));if(opener)return {item,opener};}return null;};
 function remember(run,slot){creditFreed(run);const opener=slot.querySelector(':scope > button[aria-label]');const record={...run,opener,slot,slotLabel:opener?.getAttribute('aria-label'),at:now()};if(opener&&!/^(empty|available|free|unused)\b/i.test(record.slotLabel||''))consumed.push(record);return record;}
 const travelBanner=()=>[...document.querySelectorAll('[class*=messageContent],.info-msg')].map(e=>e.textContent||'').find(t=>/you are in\s+.+?and have\s*\$/i.test(t))||'';
 function inventorySummary(){
  const panel=scope()?.querySelector('[class*=inventoryPanel]');if(!panel)return null;
  const slots=[...panel.querySelectorAll('li[class*=inventorySlot]')],banner=travelBanner();
  const bannerTotal=Number(banner.match(/you have purchased\s*[\d,]+\s*\/\s*([\d,]+)/i)?.[1]?.replace(/,/g,''));
  const labelCount=Number(panel.getAttribute('aria-label')?.match(/^inventory\s+(\d+)\s+items$/i)?.[1]);
  // Inventory N items is occupied count on agency and flight pages, not total capacity.
  // Count only real, consecutively numbered LI slots; decorative blocked cells are DIVs.
  const numberedPage=[...scope().querySelectorAll('h1,h2,h3,h4')].some(e=>/^(travel agency|traveling)$/i.test(e.textContent.trim()));
  const numbered=numberedPage&&slots.length>0&&slots.every((slot,index)=>{
   const button=slot.querySelector(':scope > button[aria-label]');const label=button?.getAttribute('aria-label')||slot.querySelector('[class*=srOnly]')?.textContent||'';
   const number=label.match(/\bslot\s+(\d+)\b/i);return number&&Number(number[1])===index+1;
  });
  const total=Number.isSafeInteger(bannerTotal)&&bannerTotal>0?(slots.length===bannerTotal?bannerTotal:null):numbered?slots.length:Number.isSafeInteger(labelCount)&&labelCount>0&&slots.length===labelCount?labelCount:null;
  const groups=new Map();let occupied=0;for(const slot of slots){const e=slot.querySelector(':scope > button[aria-label]');if(!e||isConsumed(e)||/^(empty|available|free|unused)\b/i.test(e.getAttribute('aria-label')||''))continue;occupied++;const name=(e.getAttribute('aria-label')||'').replace(/\s+slot\s+\d+$/i,'');groups.set(name,(groups.get(name)||0)+1);}
  return {verified:total!==null,total,occupied,free:total===null?null:Math.max(0,total-occupied),items:[...groups].map(([name,amount])=>({name,amount})),source:'travel-dom'};
 }
 let trackedRun=null;
 const manualChange=event=>{if(event.isTrusted&&trackedRun?.capacityLedger&&event.target?.closest?.('#travel-root [class*=inventoryPanel],#travel-root [class*=stockTable],#travel-root form[id^="item-"]')){trackedRun.capacityLedger.valid=false;trackedRun.capacityLedger.reason='manual-inventory-or-shop-interaction';}};
 function prepareRun(run){
  if(trackedRun!==run){document.removeEventListener('click',manualChange,true);trackedRun=run;document.addEventListener('click',manualChange,true);}
  if(run.capacityLedger?.valid)return run.capacityLedger;
  const summary=inventorySummary();if(!summary?.verified)return null;
  run.capacityLedger={valid:true,total:summary.total,initialOccupied:summary.occupied,freed:0,purchased:0,spent:0,watchCount:summary.items.filter(item=>norm(item.name)===norm(run.watchName)).reduce((n,item)=>n+item.amount,0),at:now(),source:'travel-dom-baseline'};return run.capacityLedger;
 }
 function forget(){document.removeEventListener('click',manualChange,true);trackedRun=null;}
 function creditFreed(run){const ledger=run.capacityLedger;if(ledger?.valid)ledger.freed=Math.min(ledger.initialOccupied,ledger.freed+1);}
 const purchasedCount=()=>Number(travelBanner().match(/you have purchased\s*([\d,]+)\s*\//i)?.[1]?.replace(/,/g,''));
 const receipt=run=>[...document.querySelectorAll('[role=alert],[role=status],.success,[class*=success]')].filter(e=>shown(e)&&!e.closest('#tuim-panel,#tu-snatch-run')&&/you (?:have )?(?:bought|purchased)/i.test(e.textContent||'')&&norm(e.textContent).includes(norm(run.watchName))).map(e=>e.textContent.trim()).join('|');
 function cancel(){controller?.abort();controller=null;}
 function inspect(run){
  const hospital=document.querySelector('a[aria-label^="Hospital:"]');
  const release=same(released,run)&&now()-released.at<120000&&(!hospital||hospital===released.hospital&&hospital.getAttribute('aria-label')===released.hospitalLabel);
  const flight=!!scope()?.querySelector('[aria-label="Flight progress"]')||norm(scope()?.querySelector('h4')?.textContent)==='traveling';
  return {...(same(hospitalizedProof,run)&&!hospitalizedProof.healed&&!release&&now()-hospitalizedProof.at<120000?{hospitalized:true}:{}),released:!!release,purchaseProof:same(purchased,run)?purchased.proof:null,purchaseItemKey:same(purchased,run)?run.watchKey:null,traveling:!!(same(booked,run)||flight),returning:!!same(booked,run)};
 }
 async function execute(kind,{run,getSnapshot,guard,allowBeforeLanding=false,extendHospital=false,onEvent=()=>{}}){
  if(!enabled())throw Error('Native Tampermonkey/PDA controls unavailable');cancel();const current=new window.AbortController();controller=current;
  const signal=current.signal;let submitted=false;
  const ensure=()=>{if((kind!=='return'&&run.capacityLedger?.valid===false)||signal.aborted||!guard()||document.hidden||!document.hasFocus())throw Error('Action canceled or page/player changed. Continue manually if Torn already accepted it.');};
  const click=e=>{ensure();if(!shown(e))throw Error('Native action is no longer available');onEvent({step:'native-click',control:label(e).slice(0,220),controlId:e.id||'',panel:e.getAttribute('aria-controls')||''});e.click();};
  const wait=(read,timeout=4000)=>new Promise((resolve,reject)=>{
   let observer,timer,done=false;
   const finish=(error,value)=>{if(done)return;done=true;observer?.disconnect();window.clearTimeout(timer);signal.removeEventListener('abort',aborted);error?reject(error):resolve(value);};
   const check=()=>{try{ensure();const value=read();if(value)finish(null,value);}catch(error){finish(error);}};
   const aborted=()=>finish(Error('Action canceled; no further native clicks sent'));
   signal.addEventListener('abort',aborted,{once:true});observer=new window.MutationObserver(check);observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true});timer=window.setTimeout(()=>finish(Error('Torn did not expose the expected '+kind+' result. No action will be retried automatically.')),timeout);check();
  });
  const foreground=()=>{if(document.hidden||!document.hasFocus())current.abort();};
  document.addEventListener('visibilitychange',foreground);window.addEventListener('blur',foreground);
  try{
   if(kind!=='return')prepareRun(run);ensure();if(!scope())throw Error('Open the native foreign travel page');
   if(kind==='hospitalize'){
    if((!extendHospital&&!run.planHospitalize)||!(run.hospitalizations?.length||run.hospitalization?.name))throw Error('Select the planned hospitalization item first');
    const eligible=state=>extendHospital?state.hospitalized===true&&!state.returning&&!state.traveling:allowBeforeLanding?state.traveling===true&&!state.returning&&state.hospitalized!==true:!state.traveling&&state.hospitalized===false&&Number.isFinite(state.quantity)&&state.quantity<Math.max(1,Number(run.minimumQty)||1);
    const state=getSnapshot();if(!eligible(state))throw Error('Hospitalization state changed or before-landing confirmation is missing');
    const selected=availableItem(run.hospitalizations?.length?run.hospitalizations:[run.hospitalization]);if(!selected)throw Error('No selected hospitalization item is carried in the visible inventory');const {item,opener}=selected,slot=opener.closest('li');
    const previousUntil=getSnapshot().hospitalUntil||0;
    if(slot.querySelector('[class*=confirmQuestion]'))throw Error('Close the existing item confirmation first');if(opener.getAttribute('aria-expanded')!=='true')click(opener);
    const use=await wait(()=>one(buttons(slot,'Use'),'hospitalization Use control'));click(use);
    const yes=await wait(()=>{const q=slot.querySelector('[class*=confirmQuestion]');if(!q)return null;if(norm(q.querySelector('strong')?.textContent)!==norm(item.name)||!norm(q.textContent).includes('would you like to use'))throw Error('Hospitalization confirmation does not match the selected item');return one(buttons(q,'Yes'),'hospitalization Yes confirmation');});
    const fresh=getSnapshot();if(!eligible(fresh)){const no=one(buttons(slot.querySelector('[class*=confirmQuestion]'),'No'),'hospitalization No control');if(no)click(no);throw Error('Stock or hospital status changed; hospitalization was not submitted');}
    submitted=true;click(yes);await wait(()=>extendHospital?
     (getSnapshot().hospitalUntil>previousUntil||/you (?:are|have been) (?:now )?(?:in|sent to|put in|admitted to) (?:the )?hospital|hospital(?:ization)? (?:time )?(?:increased|extended)/i.test(slot.textContent)&&!slot.querySelector('[class*=confirmQuestion]')):
     getSnapshot().hospitalized===true||document.querySelector('a[aria-label^="Hospital:"]')||/you (?:are|have been) (?:now )?(?:in|sent to|put in|admitted to) (?:the )?hospital/i.test(slot.textContent));
    hospitalizedProof=remember(run,slot);released=null;return {hospitalized:true};
   }
   if(kind==='heal'){
    if(!getSnapshot().hospitalized)throw Error('Hospital status is not confirmed');
    const selected=availableItem(run.medicals?.length?run.medicals:[run.medical]);if(!selected)throw Error('No selected healing item remains in the visible foreign inventory');
    const {item,opener}=selected,slot=opener.closest('li'),selectedName=item.name,previousUntil=getSnapshot().hospitalUntil||0;
    const question=()=>slot.querySelector('[class*=confirmQuestion]');
    if(question())throw Error('Close the existing medical confirmation, then try Heal again');
    if(opener.getAttribute('aria-expanded')!=='true')click(opener);
    const use=await wait(()=>one(buttons(slot,'Use'),'medical Use control'));click(use);
    const yes=await wait(()=>{const q=question();if(!q)return null;if(norm(q.querySelector('strong')?.textContent)!==norm(selectedName)||!norm(q.textContent).includes('would you like to use'))throw Error('Medical confirmation does not match the selected item');return one(buttons(q,'Yes'),'medical Yes confirmation');});
    if(!(getSnapshot().quantity>=Math.max(1,Number(run.minimumQty)||1)))throw Error('Monitored stock dropped before healing; no medical item was used');
    submitted=true;click(yes);
    await wait(()=>slot.isConnected&&(/you are out of the hospital!/i.test(slot.textContent)||previousUntil>0&&getSnapshot().hospitalUntil>0&&getSnapshot().hospitalUntil<previousUntil));
    const record=remember(run,slot),hospitalReleased=/you are out of the hospital!/i.test(slot.textContent)||getSnapshot().hospitalized===false;
    if(hospitalReleased){released={...record,hospital:document.querySelector('a[aria-label^="Hospital:"]')};released.hospitalLabel=released.hospital?.getAttribute('aria-label');if(hospitalizedProof)hospitalizedProof={...hospitalizedProof,healed:true};}
    return {hospitalReleased,medicalUsed:true};
   }
   if(kind==='destroy'){
    if(!run.destroyInventory||!run.destroyAccepted||run.destroyDone||!run.destroyItems?.length)throw Error('Inventory Destruction is not accepted for this armed run');
    const eligible=()=>{ensure();const state=getSnapshot();if(state.hospitalized!==false||!(state.quantity>=Math.max(1,Number(run.minimumQty)||1)))throw Error('Hospital release and available monitored stock are required before destroying items');};
    const current=()=>{const panel=scope()?.querySelector('[class*=inventoryPanel]');if(!panel)throw Error('Foreign travel inventory is not visible');return [...panel.querySelectorAll('li[class*=inventorySlot] > button[aria-label]')].filter(e=>shown(e)&&! /^(empty|available|free|unused)\b/i.test(e.getAttribute('aria-label')||'')&&!isConsumed(e));};
    const counts=()=>{const result=new Map();for(const e of current())result.set(itemName(e),(result.get(itemName(e))||0)+1);return result;};
    eligible();let remaining=counts();const total=[...remaining.values()].reduce((a,b)=>a+b,0);if(total>100)throw Error('Unexpected travel inventory size; no destruction started');let destroyed=0;
    const approved=new Set(run.destroyItems.map(item=>norm(item.name)));
    for(const name of [...remaining.keys()].filter(name=>approved.has(name)))while((remaining.get(name)||0)>0){
     eligible();const actual=counts();if(actual.size!==remaining.size||[...remaining].some(([key,n])=>actual.get(key)!==n))throw Error('Travel inventory changed during destruction; no further items selected');
     const opener=current().find(e=>itemName(e)===name);if(!opener)throw Error('Approved travel item is no longer present');const slot=opener.closest('li');
     if(slot.querySelector('[class*=confirmQuestion]'))throw Error('Close the existing inventory confirmation before destroying items');
     if(opener.getAttribute('aria-expanded')!=='true')click(opener);
     const trash=await wait(()=>one(buttons(slot,'Trash'),'travel inventory Trash control'));click(trash);
     const yes=await wait(()=>{const question=slot.querySelector('[class*=confirmQuestion]');if(!question)return null;const text=norm(question.textContent);if(norm(question.querySelector('strong')?.textContent)!==name||! /\b(trash|destroy|throw away|discard)\b/.test(text))throw Error('Trash confirmation does not match the approved travel inventory item');return one(buttons(question,'Yes'),'travel Trash Yes confirmation');});
     eligible();submitted=true;click(yes);
     const beforeCount=[...remaining.values()].reduce((a,b)=>a+b,0);
     const result=await wait(()=>{if(current().length<beforeCount)return {removed:true};const close=one(slot.querySelectorAll('button[aria-label="Close"]'),'Trash result Close');return close&&/\b(trashed|destroyed|discarded)\b/i.test(slot.textContent)?{close}:null;});
     if(result.close){click(result.close);await wait(()=>current().length<beforeCount);}
     const left=(remaining.get(name)||0)-1;if(left)remaining.set(name,left);else remaining.delete(name);creditFreed(run);destroyed++;onEvent({step:'inventory-item-destroyed',amount:destroyed,quantity:total});
    }
    eligible();if(current().some(item=>approved.has(itemName(item))))throw Error('Selected travel inventory items did not finish clearing');return {inventoryDestroyed:true,amount:destroyed};
   }
   if(kind==='buy'){
    let confirmedAmount=0,target=null;
    const outcome=warning=>({purchaseConfirmed:true,amount:confirmedAmount,...(warning?{reconcileWarning:warning}:{})});
    // Initial purchase plus five confirmed remainder attempts. Each native control still yields to a user gesture.
    for(let round=0;round<6;round++){try{
    submitted=false;
    let s=getSnapshot();
    // A purchase receipt can precede Torn restoring the shop row. Missing is unknown,
    // not sold out. Only the remainder path waits; the first purchase stays immediate.
    if(round>0&&s.stockVisible===false){onEvent({step:'remainder-state-wait',attempt:round,reason:'shop-row-pending'});await wait(()=>{const fresh=getSnapshot();return fresh.stockVisible!==false&&Number.isFinite(fresh.quantity)?fresh:null;});s=getSnapshot();}
    if(s.hospitalized!==false)throw Error('Confirm hospital release before buying');
    if(!(s.quantity>0))throw Error('Current stock is unavailable or exhausted');
    if(same(released,run)){const close=one([...(released.slot?.querySelectorAll('button[aria-label="Close"]')||[])],'medical result Close');if(close){click(close);await new Promise(resolve=>window.setTimeout(resolve,32));ensure();}}
    let {id,row}=resolveItem(run);
    const panelId='item-'+id+'-buyPanel';
    const existing=scope().querySelector('#'+panelId);
    if(existing&&one(existing.querySelectorAll('[class*=confirmPanel]'),'existing purchase confirmation'))throw Error('Close the existing purchase confirmation before Purchase Max');
    const icon=one([...row.querySelectorAll('button[class*=buyIconButton][aria-controls]')].filter(e=>e.getAttribute('aria-controls')===panelId),'compact Buy opener');
    let container=row,compact=!!icon;
    if(compact){
     let amountPanel=existing?.querySelector('[class*=amountPanel]');
     if(!shown(amountPanel)){click(icon);amountPanel=await wait(()=>{const panel=scope()?.querySelector('#'+panelId);const amount=panel?.querySelector('[class*=amountPanel]');return shown(amount)?amount:null;});}
     if(norm(amountPanel.querySelector('p strong')?.textContent)!==norm(run.watchName)||!norm(amountPanel.querySelector('p')?.textContent).includes('do you want to buy'))throw Error('Compact quantity panel does not match the monitored item');
     container=amountPanel;
    }else if(existing&&shown(existing))throw Error('Unexpected open purchase panel; close it before Purchase Max');
    let input=one(container.querySelectorAll('input.input-money'),'visible native quantity input');
    const nativeMax=one(container.querySelectorAll('input.wai-btn[type=button]'),'native maximum control');
    const max=nativeMax||one(buttons(container,'MAX').filter(e=>e.matches('button[type=button]')),'quantity-panel MAX control');
    if(!input)throw Error('Native maximum/quantity controls are unavailable');
    const fallbackBefore=capacityFor(row,run,getSnapshot().quantity,NaN).verified?null:inventory(run.watchName).length;
    const priorProof=getSnapshot().purchaseProof||null,priorReceipt=receipt(run),priorCount=purchasedCount(),priorOccupied=run.capacityLedger?.valid?run.capacityLedger.initialOccupied-run.capacityLedger.freed+run.capacityLedger.purchased:priorCount;
    let capacity=capacityFor(row,run,getSnapshot().quantity,NaN),nativeAmount=null;
    // Use the verified ledger directly. Max is only a fallback when capacity or funds are unavailable.
    if(!capacity.verified){if(!max)throw Error('Native maximum fallback unavailable');click(max);await new Promise(resolve=>window.setTimeout(resolve,32));ensure();nativeAmount=Number(input.value.replace(/,/g,''));capacity=capacityFor(row,run,getSnapshot().quantity,nativeAmount);}
    if(capacity.verified&&capacity.desired<1)throw Error('No available capacity, affordable items or stock; no purchase was sent');
    if(target===null)target=capacity.verified?capacity.desired:nativeAmount;
    const wanted=Math.min(Number.isFinite(capacity.desired)?capacity.desired:nativeAmount,target-confirmedAmount);
    onEvent({step:'capacity-check',verified:capacity.verified,capacityTotal:capacity.total,occupiedSlots:capacity.occupied,freeSlots:capacity.free,nativeMax:nativeAmount,desired:wanted,limitedBy:capacity.limitedBy||capacity.reason,freedSlots:run.capacityLedger?.freed||0,confirmedPurchases:run.capacityLedger?.purchased||0,source:capacity.verified?'capacity-ledger':'native-max-fallback'});
    if(!Number.isSafeInteger(wanted)||wanted<1){if(confirmedAmount)return outcome('Torn currently allows no additional quantity');throw Error('Torn has no available purchase quantity');}
    const prepared=new WeakSet();
    const prepare=element=>{if(Number(element.value.replace(/,/g,''))===wanted||prepared.has(element))return;const fresh=capacityFor(row,run,getSnapshot().quantity,Number(element.value));if(capacity.verified&&(!fresh.verified||fresh.desired<wanted))throw Error('Capacity, stock or funds changed while preparing quantity');prepared.add(element);const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;if(!setter)throw Error('Native quantity input cannot be updated');setter.call(element,String(wanted));element.dispatchEvent(new window.Event('input',{bubbles:true}));element.dispatchEvent(new window.Event('change',{bubbles:true}));onEvent({step:'quantity-prepared',amount:Number(element.value.replace(/,/g,'')),desired:wanted});};
    prepare(input);await new Promise(resolve=>window.setTimeout(resolve,32));ensure();
    const reported=new Set();const readiness=(reason,amount)=>{const key=reason+':'+amount;if(!reported.has(key)){reported.add(key);onEvent({step:'quantity-wait',reason,amount,desired:capacity.desired});}};
    const buy=await wait(()=>{
     ({row}=resolveItem(run));container=compact?scope()?.querySelector('#'+panelId+' [class*=amountPanel]'):row;
     const current=one(container?.querySelectorAll('input.input-money')||[],'current quantity input');if(!current){readiness('input-unavailable',null);return null;}input=current;prepare(input);if(!input.isConnected)return null;
     const amount=Number(input.value.replace(/,/g,''));const fresh=getSnapshot();if(!Number.isSafeInteger(amount)||amount<1||amount>fresh.quantity||amount>wanted){readiness('quantity-not-ready',amount);return null;}
     if(amount<wanted)readiness('native-quantity-clamped',amount);
     return compact?one(buttons(container,'Buy'),'quantity-panel Buy control'):one([...row.querySelectorAll('button[aria-controls]')].filter(e=>e.getAttribute('aria-controls')===panelId&&label(e)==='buy'),'monitored Buy control');});
    const amount=Number(input.value.replace(/,/g,''));s=getSnapshot();const freshCapacity=capacityFor(row,run,s.quantity,amount);if(capacity.verified&&(!freshCapacity.verified||freshCapacity.desired<amount))throw Error('Available capacity, stock or funds changed before Buy');if(s.hospitalized!==false||amount>s.quantity)throw Error('Hospital or stock state changed before Buy');click(buy);
    const yes=await wait(()=>{const panel=scope()?.querySelector('#'+panelId),confirmation=panel?.querySelector('[class*=confirmPanel]');if(!shown(confirmation))return null;
     const strong=confirmation.querySelector('p strong');if(norm(strong?.textContent)!==norm(amount+'x '+run.watchName))throw Error('Purchase confirmation quantity/item mismatch');return one(buttons(confirmation,'Yes'),'purchase Yes confirmation');});
    const confirmSnapshot=getSnapshot();
    // Torn replaces the monitored row with its exact item/quantity confirmation.
    // Its absence is unknown stock, not a stock depletion. Use this transaction's
    // immediately verified pre-Buy stock while continuing to check live cash/space.
    const confirmStock=confirmSnapshot.stockVisible===false?s.quantity:Number.isFinite(confirmSnapshot.quantity)?confirmSnapshot.quantity:s.quantity;
    const confirmPanel=scope()?.querySelector('#'+panelId+' [class*=confirmPanel]');const totalText=confirmPanel?.querySelectorAll('p strong')?.[1]?.textContent||'';const totalMatch=totalText.match(/\$\s*([\d,]+(?:\.\d+)?)/);const confirmedPrice=totalMatch?Number(totalMatch[1].replace(/,/g,''))/amount:capacity.price;
    const finalCapacity=capacityFor(row,run,confirmStock,amount,confirmedPrice);
    onEvent({step:'confirmation-capacity-check',verified:finalCapacity.verified,freeSlots:finalCapacity.free,desired:finalCapacity.desired,quantity:confirmStock,reason:confirmSnapshot.stockVisible===false?'confirmation row absent':'current-visible-stock'});
    if(capacity.verified&&(!finalCapacity.verified||finalCapacity.desired<amount)){
     const confirmation=scope()?.querySelector('#'+panelId+' [class*=confirmPanel]');const no=one(buttons(confirmation,'No'),'purchase No confirmation');if(no)click(no);
     throw Error('Capacity, stock or funds changed before confirmation; purchase canceled');
    }
    if(getSnapshot().hospitalized!==false)throw Error('Hospital state changed before confirmation');if(capacity.verified&&!Number.isFinite(run.capacityLedger.cashBeforePurchase))run.capacityLedger.cashBeforePurchase=capacity.cash;submitted=true;click(yes);
    await wait(()=>{const snapshot=getSnapshot(),currentReceipt=receipt(run);return Number.isFinite(priorOccupied)&&purchasedCount()!==priorCount&&purchasedCount()>priorOccupied&&purchasedCount()<=priorOccupied+amount||currentReceipt&&currentReceipt!==priorReceipt||round===0&&snapshot.purchaseProof&&snapshot.purchaseProof!==priorProof&&snapshot.purchaseItemKey===run.watchKey||inventory(run.watchName).length>=(fallbackBefore??((run.capacityLedger?.watchCount||0)+(run.capacityLedger?.purchased||0)))+amount;});
    const liveReceipt=receipt(run),receiptQuantity=liveReceipt!==priorReceipt?Number(liveReceipt.match(/\b(?:bought|purchased)\s+([\d,]+)\b/i)?.[1]?.replace(/,/g,'')):NaN;
    const countDelta=purchasedCount()!==priorCount?purchasedCount()-priorOccupied:NaN;
    const actual=[receiptQuantity,countDelta].find(value=>Number.isSafeInteger(value)&&value>0&&value<=amount)??amount;
    if(run.capacityLedger?.valid){run.capacityLedger.purchased+=actual;run.capacityLedger.spent+=(capacity.price||0)*actual;}
    confirmedAmount+=actual;purchased={...run,proof:'native:'+(run.intentId||run.expiresAt)+':'+id+':'+round+':'+confirmedAmount};
    onEvent({step:'purchase-confirmed',amount:actual,quantity:confirmedAmount,desired:target});
    if(round===5&&confirmedAmount<target)return outcome('Five remainder attempts completed; inventory is not full');
    if(round===5||!capacity.verified||confirmedAmount>=target)return outcome();
    // The confirmed first transaction updates the ledger; stale inventory labels do not block the remainder.
    onEvent({step:'capacity-reconcile',amount:confirmedAmount,desired:target-confirmedAmount,attempt:round+1,maxAttempts:5});
    }catch(error){if(submitted&&run.capacityLedger){run.capacityLedger.valid=false;run.capacityLedger.reason='unconfirmed-remainder';}if(confirmedAmount){onEvent({step:'reconcile-stopped',message:error.message,submitted:!!error.submitted,amount:confirmedAmount});return outcome(error.message);}throw error;}}
    return outcome();
   }
   if(kind==='return'){
    if(!run.purchaseConfirmed)throw Error('Confirm the purchase before returning');
    const currentPanel=()=>scope()?.querySelector('#travel-home-panel');
    const prompt=panel=>norm(panel?.querySelector('p')?.textContent);
    const returnButton=panel=>one([...(panel?.querySelectorAll('button')||[])].filter(e=>/^(confirm )?travel back$/.test(label(e))),'Travel Back confirmation');
    let panel=currentPanel();const homeControl=one([...scope().querySelectorAll('a[aria-controls="travel-home-panel"]')].filter(e=>label(e)==='travel home'),'Travel home');
    if(homeControl?.getAttribute('aria-expanded')==='false'||!shown(panel)||!prompt(panel).includes('are you sure you want to travel back to torn')||!returnButton(panel)){
     const home=homeControl;
     if(!home)throw Error('Travel home control is not available');
     // An empty/collapsed container exists before the real question is rendered.
     // Do not toggle an already-expanded home link while hydration is pending.
     if(home.getAttribute('aria-expanded')!=='true')click(home);
    }
    const confirmation=await wait(()=>{
     const candidate=currentPanel();if(!shown(candidate))return null;const value=prompt(candidate);
     if(!value)return null;
     if(/are you sure you want to travel back to/.test(value)&&!value.includes('are you sure you want to travel back to torn'))throw Error('Return confirmation does not specify Torn');
     if(!value.includes('are you sure you want to travel back to torn'))return null;
     const back=returnButton(candidate);return back?{panel:candidate,back}:null;
    });
    panel=confirmation.panel;submitted=true;click(confirmation.back);
    panel=await wait(()=>{const candidate=currentPanel();return candidate&&/you make your way over to the airstrip and tell your pilot to head for torn/i.test(candidate.textContent)?candidate:null;});booked={...run};
    const next=await wait(()=>{
     // Torn may advance automatically when its countdown ends.
     if(scope()?.querySelector('[aria-label="Flight progress"]')||norm(scope()?.querySelector('h4')?.textContent)==='traveling')return {complete:true};
     const candidate=currentPanel(),button=one([...(candidate?.querySelectorAll('button')||[])].filter(e=>/^continue(?:\s*\(\d+\))?$/.test(label(e))),'flight Continue control');
     return button?{button}:null;
    },8000);if(next.button)click(next.button);
    return {returnBooked:true};
   }
   throw Error('Unknown native action');
  }catch(error){if(submitted&&run.capacityLedger){run.capacityLedger.valid=false;run.capacityLedger.reason='unconfirmed-submitted-action';}error.submitted=submitted;throw error;}finally{document.removeEventListener('visibilitychange',foreground);window.removeEventListener('blur',foreground);if(controller===current)controller=null;}
 }
 function listAgencyItems(){
  const root=scope();if(!root||![...root.querySelectorAll('h1,h2,h3,h4')].some(e=>/^travel agency$/i.test(e.textContent.trim())))return [];
  const items=new Map();for(const option of root.querySelectorAll('[class*=itemPicker] [role=listbox] [role=option]')){
   if(option.getAttribute('aria-disabled')==='true')continue;const name=option.querySelector('[class*=itemNameText]')?.textContent?.trim(),amount=Number(option.querySelector('[class*=itemName] b')?.textContent?.match(/x\s*([\d,]+)/i)?.[1]?.replace(/,/g,''));
   if(name&&Number.isSafeInteger(amount)&&amount>0)items.set(norm(name),{name,id:null,uid:null,amount,source:'agency-picker'});
  }return [...items.values()];
 }
 function listInventory(){const panel=scope()?.querySelector('[class*=inventoryPanel]');if(!panel)return null;return [...panel.querySelectorAll('li[class*=inventorySlot] > button[aria-label]')].filter(e=>e.isConnected&&!isConsumed(e)&&! /^(empty|available|free|unused)\b/i.test(e.getAttribute('aria-label')||'')).map(e=>({name:(e.getAttribute('aria-label')||'').replace(/\s+slot\s+\d+$/i,''),id:Number(e.closest('li')?.getAttribute('data-item-id'))||null,uid:null,amount:1,source:'travel-dom'}));}
 return {enabled,execute,cancel,forget,prepareRun,inventorySummary,inspect,resolveItem,capacityFor,listInventory,listAgencyItems};
}
