// Item use and selected destruction share the direct handler; purchasing also uses direct requests; return retains native controls.
export function createSnatchDirectItems({native,getPilot,getProfile,window,now=()=>Date.now()}){
 let proof=null,generation=0,active=false,lastStatus=null,trashRun=null,purchaseNotice=null,purchaseNoticeTimer=null;
 function clearPurchaseNotice(){if(purchaseNoticeTimer!==null)window.clearTimeout(purchaseNoticeTimer);purchaseNoticeTimer=null;purchaseNotice?.remove();purchaseNotice=null;}
 function showPurchaseNotice(run,total){
  clearPurchaseNotice();const node=window.document.createElement('div');purchaseNotice=node;node.id='tu-purchase-confirmation';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');node.textContent=run.directBuyAmount+'/'+total+' '+run.watchName+' Purchased';node.style.cssText='position:fixed;top:20%;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);box-sizing:border-box;padding:12px 16px;border:2px solid #78d7a0;border-radius:8px;background:#164c31;color:#fff;font:bold 16px system-ui;text-align:center;overflow-wrap:anywhere;box-shadow:0 4px 18px #0008;z-index:2147483647;pointer-events:none';window.document.body.append(node);window.requestAnimationFrame?.(()=>{if(purchaseNotice===node&&node.isConnected)window.document.body.append(node);});purchaseNoticeTimer=window.setTimeout(clearPurchaseNotice,3000);
 }
 let slotCache=null;
 function clearPurchaseSlots(){
  for(const node of window.document.querySelectorAll('[data-tu-purchase-slot]'))node.remove();
  for(const [cell,prior] of slotCache?.positions||[])if(cell.style.position==='relative')cell.style.position=prior;
  slotCache=null;
 }
 function renderPurchaseSlots(run){
  const marks=run?.directBuySlotStatus?.filter(mark=>mark.status==='unfilled');
  if(run?.directBuySlotStatus)run.directBuySlotStatus=marks;
  for(const node of window.document.querySelectorAll('[data-tu-purchase-slot=filled]'))node.remove();
  if(!marks?.length){clearPurchaseSlots();return;}
  const panel=window.document.querySelector('#travel-root [class*=inventoryPanel]'),signature=JSON.stringify(marks);
  if(slotCache?.panel===panel&&slotCache.signature===signature&&slotCache.nodes.every(node=>node.isConnected))return;
  clearPurchaseSlots();if(!panel)return;
  const cells=[...panel.querySelectorAll('li[class*=inventorySlot]')],total=run.capacityLedger?.total,numbered=new Map();
  if(!Number.isSafeInteger(total)||total<1||total>100||cells.length!==total)return;
  // Torn's DOM can use column order (1,7,13,2,...). Match its explicit slot labels, never DOM position.
  for(const cell of cells){const label=cell.querySelector(':scope > button[aria-label]')?.getAttribute('aria-label')||cell.querySelector('[class*=srOnly]')?.textContent||'',number=Number(label.match(/\bslot\s+(\d+)\b/i)?.[1]);if(!Number.isSafeInteger(number)||number<1||number>total||numbered.has(number))return;numbered.set(number,cell);}
  if(marks.some(mark=>!numbered.has(mark.number)||mark.status!=='unfilled'))return;
  const nodes=[],positions=[];
  for(const mark of marks){const cell=numbered.get(mark.number),existing=cell.querySelector(':scope > button[aria-label]');if(mark.status==='unfilled'&&existing&&!/^(empty|available|free|unused)\b/i.test(existing.getAttribute('aria-label')||''))continue;const badge=window.document.createElement('span');
   badge.dataset.tuPurchaseSlot=mark.status;badge.setAttribute('role','img');badge.setAttribute('aria-label','Requested slot not filled');badge.title='Requested inventory space is still empty';badge.textContent='✕';badge.style.cssText='position:absolute;top:1px;right:1px;z-index:5;display:grid;place-items:center;width:20px;height:20px;box-sizing:border-box;border:1px solid currentColor;border-radius:50%;font:bold 17px/1 system-ui;pointer-events:none;background:#15212aee;color:#ff6262';
   if(window.getComputedStyle(cell).position==='static'||!window.getComputedStyle(cell).position){positions.push([cell,cell.style.position]);cell.style.position='relative';}cell.append(badge);nodes.push(badge);
  }
  slotCache={panel,signature,nodes,positions};
 }
 const same=run=>proof&&proof.ownerId===run?.ownerId&&proof.intentId===run?.intentId&&proof.watchKey===run?.watchKey;
 function cancel(){generation++;getPilot()?.cancel();native?.cancel();}
 function refreshItemCells(pilot,onEvent,action){let dispatched=false;try{dispatched=pilot.refreshNativeInventory?.()===true;}catch{}try{onEvent({step:'native-inventory-refresh',dispatched,afterVerifiedItem:true,action});}catch{}}
 async function execute(kind,options){
  const pilot=getPilot();
  if(options.run?.directBuyUncertain||options.run?.directTrashUncertain)throw Error('Review the uncertain action and re-arm before continuing.');
  if(kind==='destroy')return destroy(options);
  if(kind==='buy')return buy(options);
  if(!['heal','hospitalize'].includes(kind)){if(active||pilot.report().unconfirmedAttempt||proof?.uncertain||trashRun?.directTrashRemaining>0||trashRun?.directBuyRemaining>0)throw Error('Resolve the direct item/status verification before continuing.');return native.execute(kind,options);}
  if(!options.event?.isTrusted||active||pilot.report().unconfirmedAttempt)throw Error('A fresh user click and a resolved prior attempt are required.');
  const {run,getSnapshot,guard,onEvent=()=>{}}=options;
  const eligible=()=>{if(!guard()||run.capacityLedger?.valid===false)return false;const s=getSnapshot();if(kind==='heal')return s.hospitalized===true&&!s.traveling&&s.quantity>=Math.max(1,Number(run.minimumQty)||1);return options.extendHospital?s.hospitalized===true&&!s.traveling&&!s.returning:options.allowBeforeLanding?s.traveling===true&&!s.returning:s.hospitalized===false&&!s.traveling&&Number.isFinite(s.quantity)&&s.quantity<Math.max(1,Number(run.minimumQty)||1);};
  if(!guard())throw Error('The armed run or player changed; no item was used.');
  // Refresh/navigation deliberately invalidates the old baseline. Rebuild from
  // visible inventory before consulting it, just as the native adapter does.
  const priorReason=run.capacityLedger?.valid===false?run.capacityLedger.reason||'invalid-baseline':null;
  native.prepareRun?.(run);
  if(priorReason)onEvent({step:'direct-capacity-rebuild',reason:priorReason,verified:run.capacityLedger?.valid===true,total:run.capacityLedger?.total??null,occupied:run.capacityLedger?.initialOccupied??null});
  if(run.capacityLedger?.valid===false)throw Error('Current travel inventory capacity could not be verified. Load inventory or re-arm before using an item.');
  if(!eligible())throw Error('Hospital, stock or travel state no longer permits this item use.');
  lastStatus=null;active=true;const ticket=++generation;let consumed=false;
  const ensure=()=>ticket===generation&&guard();
  try{
   const selected=kind==='heal'?(run.medicals?.length?run.medicals:[run.medical]):(run.hospitalizations?.length?run.hospitalizations:[run.hospitalization]);
   onEvent({step:'direct-item-start',action:kind});
   const result=await pilot.useRunItem(options.event,selected,()=>ensure()&&eligible(),{run,useArmedInventory:kind==='heal'});
   if(result.result!=='consumption-confirmed'){const error=Error(result.text||'Direct item use was blocked: '+result.result);error.submitted=result.result==='uncertain';if(error.submitted)proof={ownerId:run.ownerId,intentId:run.intentId,watchKey:run.watchKey,uncertain:true,at:now()};throw error;}
   consumed=true;refreshItemCells(pilot,onEvent,kind);
   // Credit each confirmed request once; the server slot ID can later be reused.
   if(run.capacityLedger?.valid){
    const ledger=run.capacityLedger;ledger.freed=Math.min(ledger.initialOccupied,ledger.freed+1);
    const capacity=result.inventoryCapacity;
    if(capacity?.total===ledger.total&&Number.isSafeInteger(capacity.occupied)){
     const freed=ledger.initialOccupied+(ledger.purchased||0)-capacity.occupied;
     if(Number.isSafeInteger(freed)&&freed>=0&&freed<=ledger.initialOccupied){ledger.freed=freed;onEvent({step:'direct-capacity-confirmed',capacityTotal:ledger.total,occupiedSlots:capacity.occupied,freeSlots:ledger.total-capacity.occupied,freedSlots:freed,verified:true});}
     else{ledger.valid=false;ledger.reason='fresh-inventory-ledger-conflict';}
    }
   }
   onEvent({step:'direct-item-consumed',action:kind,itemId:result.itemId,slotId:result.slotId,reason:result.evidence?.hospitalization||'unconfirmed',remainingSeconds:result.evidence?.hospitalSeconds});
   proof={ownerId:run.ownerId,intentId:run.intentId,watchKey:run.watchKey,uncertain:true,consumed:true,kind,priorUntil:run.extensionPriorUntil||0,extendHospital:!!options.extendHospital,at:now()};
   if(!ensure())throw Error('Run changed after item consumption. No subsequent action was sent.');
   // The live action response is newer than the cached profile selection.
   // Only explicit release plus verified consumption qualifies; partial heals do not.
   if(kind==='heal'&&result.hospitalRelease==='explicit-release-message-needs-status-check'){
    proof={...proof,uncertain:false,hospitalized:false,released:true,hospitalUntil:null,releaseSource:'torn-use-response',releaseConfirmedAt:now(),at:now()};
    lastStatus={at:now(),state:'Abroad',action:kind,source:'torn-use-response'};
    onEvent({step:'direct-item-status',action:kind,status:'Abroad',source:'torn-use-response'});
    return {medicalUsed:true,hospitalReleased:true,statusSource:'torn-use-response'};
   }
   if(kind==='hospitalize'&&result.evidence?.hospitalization==='explicit-hospital-message'){
    const until=Number(result.evidence.hospitalSeconds)>0?now()+result.evidence.hospitalSeconds*1000:null;
    proof={...proof,uncertain:false,hospitalized:true,released:false,hospitalUntil:until,hospitalSource:'torn-use-response',hospitalConfirmedAt:now(),at:now()};
    lastStatus={at:now(),state:'Hospital',action:kind,source:'torn-use-response'};onEvent({step:'direct-item-status',action:kind,status:'Hospital',source:'torn-use-response'});
    return {hospitalized:true,statusSource:'torn-use-response'};
   }
   let timer;const profile=await Promise.race([getProfile(),new Promise((_,reject)=>{timer=window.setTimeout(()=>reject(Error('Hospital status verification timed out')),12000);})]).finally(()=>window.clearTimeout(timer));
   if(!ensure())throw Error('Run changed during hospital status verification.');
   const status=(profile?.profile||profile)?.status,state=status?.state;
   lastStatus={at:now(),state:['Hospital','Abroad','Traveling'].includes(state)?state:'unknown',action:kind};
   onEvent({step:'direct-item-status',action:kind,status:lastStatus.state});
   if(kind==='heal'&&['Hospital','Abroad'].includes(state)){
    proof={...proof,uncertain:false,hospitalized:state==='Hospital',released:state==='Abroad',hospitalUntil:state==='Hospital'&&Number.isFinite(status.until)?status.until*1000:null,at:now()};
    return {medicalUsed:true,hospitalReleased:state==='Abroad'};
   }
   if(kind==='hospitalize'&&state==='Abroad'){
    proof={...proof,uncertain:false,hospitalized:false,released:true,hospitalUntil:null,at:now()};
    return {medicalUsed:true,hospitalized:false,hospitalizationNotApplied:true};
   }
   if(kind==='hospitalize'&&state==='Hospital'){
    proof={...proof,uncertain:false,hospitalized:true,released:false,hospitalUntil:Number.isFinite(status.until)?status.until*1000:null,at:now()};return {hospitalized:true,extensionUnchanged:!!options.extendHospital&&!(Number(status.until)*1000>Number(run.extensionPriorUntil||0))};
   }
   throw Error('Item was consumed, but hospital status is not confirmed. No further task was started.');
  }catch(error){if(consumed||error.submitted){error.submitted=true;if(run.capacityLedger&&!consumed){run.capacityLedger.valid=false;run.capacityLedger.reason='unconfirmed-direct-item';}}throw error;}
  finally{active=false;}
 }
 async function buy(options){
  const pilot=getPilot(),{run,getSnapshot,guard,onEvent=()=>{}}=options;
  if(!options.event?.isTrusted||active||pilot.report().unconfirmedAttempt||proof?.uncertain||run.directBuyUncertain||run.directTrashUncertain||trashRun?.directTrashRemaining>0)throw Error('Resolve the prior action and use a fresh click before purchasing.');
  if(run.purchaseConfirmed||run.directBuyComplete||(run.directBuyAttempts||0)>=6)throw Error('This purchase sequence is complete. Re-arm before another purchase.');
  const signature=JSON.stringify([run.ownerId,run.intentId,run.watchKey,run.watchName,run.maximumPrice,run.minimumQty]);
  const eligible=()=>{const s=getSnapshot();return guard()&&(!Number.isFinite(run.stockAt)||now()-run.stockAt<30000)&&signature===JSON.stringify([run.ownerId,run.intentId,run.watchKey,run.watchName,run.maximumPrice,run.minimumQty])&&s.hospitalized===false&&!s.traveling&&!s.returning&&s.stockVisible!==false&&Number.isSafeInteger(s.quantity)&&s.quantity>=(run.directBuyAmount?1:Math.max(1,Number(run.minimumQty)||1));};
  if(!eligible()){
   const state=getSnapshot();
   if(run.directBuyAmount&&guard()&&state.hospitalized===false&&!state.traveling&&!state.returning&&state.stockVisible!==false&&state.quantity===0){run.directBuyRemaining=0;run.directBuyComplete=true;return {purchaseConfirmed:true,directPurchaseVerified:true,amount:run.directBuyAmount,reconcileWarning:'Stock exhausted after confirmed partial purchases'};}
   throw Error('Fresh monitored stock and confirmed hospital release are required before buying.');
  }
  active=true;trashRun=run;const ticket=++generation;let submitted=false,plan=null;
  const outcome=warning=>{run.directBuyRemaining=0;run.directBuyComplete=true;return {purchaseConfirmed:true,directPurchaseVerified:true,amount:run.directBuyAmount,...(warning?{reconcileWarning:warning}:{})};};
  try{
   const ensure=()=>ticket===generation&&guard()&&signature===JSON.stringify([run.ownerId,run.intentId,run.watchKey,run.watchName,run.maximumPrice,run.minimumQty]);
   const quote=capacity=>{
    if(!ensure()||!eligible())throw Error('Run changed before purchase');
    const {id,row}=native.resolveItem(run),state=getSnapshot();
    if(String(run.watchKey).startsWith('id:')&&String(run.watchKey)!=='id:'+id)throw Error('The shop item does not match the monitor');
    const snapshotRun={...run,capacityLedger:{valid:true,total:capacity.total,initialOccupied:capacity.occupied,freed:0,purchased:0,cashBeforePurchase:run.directBuyCash,spent:run.directBuySpent||0}};
    const limit=native.capacityFor(row,snapshotRun,state.quantity,capacity.total);
    if(!limit.verified||run.maximumPrice!=null&&limit.price>run.maximumPrice||run.directBuyPrice!=null&&limit.price>run.directBuyPrice)throw Error('Current price, funds or capacity could not be verified within the approved limits');
    const amount=Math.min(limit.desired,run.directBuyTarget==null?limit.desired:run.directBuyTarget-(run.directBuyAmount||0));
    plan={id:String(id),name:run.watchName,amount,price:limit.price,cash:limit.cash};return plan;
   };
   const result=await pilot.buyRunItem(options.event,quote,ensure,run.directBuyFingerprint||null);
   if(result.result!=='purchase-confirmed'){const error=Error(result.text||'Purchase blocked: '+result.result);error.submitted=result.result==='uncertain';throw error;}
   submitted=true;run.directBuyAttempts=(run.directBuyAttempts||0)+1;
   run.directBuyTarget??=result.requested;run.directBuyCash??=result.cash;run.directBuyPrice??=result.price;
   run.directBuyAmount=(run.directBuyAmount||0)+result.amount;run.directBuySpent=(run.directBuySpent||0)+result.spent;run.directBuyFingerprint=result.inventoryFingerprint;
   const capacity=result.inventoryCapacity;
   const ledger=run.capacityLedger;
   if(ledger?.valid&&ledger.total===capacity.total&&ledger.initialOccupied-ledger.freed+(ledger.purchased||0)+result.amount===capacity.occupied){ledger.purchased=(ledger.purchased||0)+result.amount;ledger.spent=(ledger.spent||0)+result.spent;ledger.cashBeforePurchase??=run.directBuyCash;}
   else run.capacityLedger={valid:true,total:capacity.total,initialOccupied:capacity.occupied-run.directBuyAmount,freed:0,purchased:run.directBuyAmount,spent:run.directBuySpent,cashBeforePurchase:run.directBuyCash};
   if(!ensure())throw Error('Run changed after purchase; review inventory before continuing');
   if(result.slots){
    const unfilled=result.slots.filter(slot=>slot.empty).slice(0,Math.max(0,run.directBuyTarget-run.directBuyAmount)).map(slot=>({number:slot.number,id:slot.id,status:'unfilled'}));
    run.directBuySlotStatus=unfilled;
    try{renderPurchaseSlots(run);}catch{clearPurchaseSlots();}
   }
   try{showPurchaseNotice(run,capacity.total);}catch{clearPurchaseNotice();}
   onEvent({step:'direct-purchase-confirmed',amount:result.amount,quantity:run.directBuyAmount,attempt:run.directBuyAttempts,freeSlots:capacity.total-capacity.occupied,verified:true});
   try{onEvent({step:'native-inventory-refresh',dispatched:pilot.refreshNativeInventory?.()===true,afterVerifiedPurchase:true});}catch{}
   if(capacity.occupied>=capacity.total||run.directBuyAmount>=run.directBuyTarget)return outcome();
   if(run.directBuyAttempts>=6)return outcome('Five remainder attempts completed; inventory is not full');
   run.directBuyRemaining=run.directBuyTarget-run.directBuyAmount;
   return {actionPending:true,nextLabel:'Buy remaining '+run.directBuyRemaining+' (remainder '+run.directBuyAttempts+'/5)'};
  }catch(error){
   if(submitted||error.submitted){error.submitted=true;run.directBuyUncertain=true;delete run.directBuySlotStatus;clearPurchaseSlots();run.capacityLedger={...run.capacityLedger,valid:false,reason:'unconfirmed-direct-purchase'};throw error;}
   // A pre-submission stop after confirmed partial fills is safe to finish, never to replay.
   if(run.directBuyAmount&&ticket===generation&&guard()&&signature===JSON.stringify([run.ownerId,run.intentId,run.watchKey,run.watchName,run.maximumPrice,run.minimumQty]))return outcome(error.message);
   throw error;
  }finally{if(run.directBuyAmount&&(run.directBuyAmount>=run.directBuyTarget||run.directBuyAttempts>=6))run.directBuyRemaining=0;active=false;}
 }
 async function destroy(options){
  const pilot=getPilot(),{run,getSnapshot,guard,onEvent=()=>{}}=options;
  if(!options.event?.isTrusted||active||pilot.report().unconfirmedAttempt)throw Error('A fresh user click and a resolved prior attempt are required.');
  if(!run.destroyInventory||!run.destroyAccepted||run.destroyDone||!run.destroyItems?.length)throw Error('Inventory Destruction is not accepted for this armed run.');
  if(run.directTrashUncertain||proof?.uncertain)throw Error('Review the uncertain item outcome and re-arm before continuing.');
  const selected=run.destroyItems.map(item=>({...item})),selectionKey=items=>JSON.stringify((items||[]).map(item=>[String(item.id||''),String(item.name||''),String(item.uid||'')])),approvedKey=selectionKey(selected);
  const eligible=()=>{const state=getSnapshot();return run.destroyInventory&&run.destroyAccepted&&!run.destroyDone&&selectionKey(run.destroyItems)===approvedKey&&guard()&&run.capacityLedger?.valid===true&&state.hospitalized===false&&!state.traveling&&!state.returning&&Number.isFinite(state.quantity)&&state.quantity>=Math.max(1,Number(run.minimumQty)||1);};
  if(!guard())throw Error('The armed run or player changed; no item was trashed.');
  native.prepareRun?.(run);
  if(!eligible())throw Error('Verified capacity, hospital release and available monitored stock are required before destroying items.');
  active=true;trashRun=run;const ticket=++generation;let removed=false;
  try{
   const ensure=()=>ticket===generation&&eligible();
   onEvent({step:'direct-trash-start',action:'destroy'});
   const result=await pilot.trashRunItem(options.event,selected,ensure,run.directTrashFingerprint||null);
   if(!['destruction-confirmed','nothing-selected-carried'].includes(result.result)){const error=Error(result.text||'Direct destruction was blocked: '+result.result);error.submitted=result.result==='uncertain';throw error;}
   removed=result.result==='destruction-confirmed';if(removed)refreshItemCells(pilot,onEvent,'destroy');
   if(!ensure())throw Error('Run changed after the inventory check. No subsequent action was sent.');
   const ledger=run.capacityLedger,capacity=result.inventoryCapacity,freed=ledger.initialOccupied+(ledger.purchased||0)-capacity?.occupied;
   if(capacity?.total!==ledger.total||!Number.isSafeInteger(freed)||freed<0||freed>ledger.initialOccupied)throw Error('Fresh inventory conflicts with the capacity baseline. Review inventory and re-arm.');
   ledger.freed=freed;run.directTrashDestroyed=(run.directTrashDestroyed||0)+(removed?1:0);run.directTrashRemaining=result.remaining;run.directTrashFingerprint=result.inventoryFingerprint;
   onEvent({step:'direct-trash-confirmed',action:'destroy',amount:removed?1:0,quantity:result.remaining,capacityTotal:capacity.total,occupiedSlots:capacity.occupied,freedSlots:freed,verified:true});
   if(result.remaining>0)return {actionPending:true,nextLabel:'Destroy next selected item ('+result.remaining+' remaining)'};
   return {inventoryDestroyed:true,amount:run.directTrashDestroyed};
  }catch(error){if(removed||error.submitted){error.submitted=true;run.directTrashUncertain=true;if(run.capacityLedger){run.capacityLedger.valid=false;run.capacityLedger.reason='unconfirmed-direct-trash';}}throw error;}
  finally{active=false;}
 }
 function observeProfile(payload){
  // Existing status reconciliation can recover a consumed item after a transient read failure.
  // Never clear an uncertain use outcome using hospital status alone.
  if(!proof?.consumed)return;
  const status=(payload?.profile||payload)?.status,state=status?.state;
  if(!['Hospital','Abroad'].includes(state))return;
  if(proof.hospitalSource==='torn-use-response'&&now()-proof.hospitalConfirmedAt<30000&&state!=='Hospital')return;
  if(state==='Hospital'&&proof.releaseSource==='torn-use-response'&&now()-proof.releaseConfirmedAt<30000){lastStatus={at:now(),state,action:proof.kind,effectiveState:'Abroad',source:'torn-use-response',profileConflict:true};return;}
  proof={...proof,uncertain:false,hospitalized:state==='Hospital',released:state==='Abroad',hospitalUntil:state==='Hospital'&&Number.isFinite(status.until)?status.until*1000:null,at:now()};
  lastStatus={at:now(),state,action:proof.kind,reconciled:true};
 }
 function remainingCapacity(run){
  const ledger=run.capacityLedger;
  if(ledger?.valid&&[ledger.total,ledger.initialOccupied,ledger.freed,ledger.purchased].every(Number.isSafeInteger)&&ledger.total>=0&&ledger.total<=100&&ledger.initialOccupied>=0&&ledger.initialOccupied<=ledger.total&&ledger.freed>=0&&ledger.freed<=ledger.initialOccupied&&ledger.purchased>=0){const occupied=ledger.initialOccupied-ledger.freed+ledger.purchased;if(occupied<=ledger.total)return {total:ledger.total,occupied,free:ledger.total-occupied,source:'confirmed-capacity-ledger'};}
  const summary=native.inventorySummary?.();if(summary?.verified&&[summary.total,summary.occupied,summary.free].every(Number.isSafeInteger)&&summary.total>=0&&summary.total<=100&&summary.free>=0&&summary.occupied>=0&&summary.occupied+summary.free===summary.total)return {total:summary.total,occupied:summary.occupied,free:summary.free,source:'current-travel-dom'};
  return null;
 }
 async function prepareRun(run){native.prepareRun?.(run);if(!(run.medicals?.length||run.medical)||!(run.hospital||run.planHospitalize||run.hospitalizedConfirmed))return;const result=await getPilot().prepareRunInventory(run);if(result.result!=='inventory-prepared')throw Error('Travel inventory could not be checked while arming. Try Arm again.');}
 return {...native,prepareRun,execute,cancel,remainingCapacity,observeProfile,hasPendingStep:()=>!!(trashRun?.directTrashRemaining>0||trashRun?.directBuyRemaining>0)||!!native.hasPendingStep?.(),forget(){cancel();clearPurchaseNotice();clearPurchaseSlots();proof=null;lastStatus=null;trashRun=null;native.forget?.();},inspect(run){try{renderPurchaseSlots(run);}catch{clearPurchaseSlots();}trashRun=run;const base=native.inspect(run);if(run?.directTrashUncertain||run?.directBuyUncertain||getPilot()?.hasPendingAttempt?.())return {...base,directItemUncertain:true};if(!same(run))return base;if(proof.uncertain)return {...base,released:false,hospitalized:true,directItemUncertain:true};if(now()-proof.at>120000)return {...base,released:false,hospitalized:true,directItemUncertain:true};return {...base,released:proof.released,hospitalized:proof.hospitalized,hospitalUntil:proof.hospitalUntil,directItemConsumed:!!proof.consumed,directItemUncertain:false};},listInventory(){const pilot=getPilot(),inspection=pilot?.report().travelInspection;if(!inspection)return native.listInventory();return inspection.mappings.map(item=>({id:item.itemId,name:item.name,amount:1,source:'travel-direct-inventory'}));},report:()=>({active,lastStatus,proof:proof?{uncertain:proof.uncertain,hospitalized:proof.hospitalized,released:proof.released,consumed:!!proof.consumed,action:proof.kind||null,source:proof.releaseSource||'profile',at:proof.at}:null})};
}
