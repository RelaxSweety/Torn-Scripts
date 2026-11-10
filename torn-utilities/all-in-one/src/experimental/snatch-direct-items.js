// Experimental facade: item use changes transport; buying/destruction/return retain native handling.
export function createSnatchDirectItems({native,getPilot,getProfile,window,now=()=>Date.now()}){
 let proof=null,generation=0,active=false,lastStatus=null;
 const same=run=>proof&&proof.ownerId===run?.ownerId&&proof.intentId===run?.intentId&&proof.watchKey===run?.watchKey;
 function cancel(){generation++;getPilot()?.cancel();native?.cancel();}
 async function execute(kind,options){
  const pilot=getPilot();
  if(!['heal','hospitalize'].includes(kind)){if(active||pilot.report().unconfirmedAttempt||proof?.uncertain)throw Error('Resolve the direct item/status verification before continuing.');return native.execute(kind,options);}
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
   const result=await pilot.useRunItem(options.event,selected,()=>ensure()&&eligible());
   if(result.result!=='consumption-confirmed'){const error=Error(result.text||'Direct item use was blocked: '+result.result);error.submitted=result.result==='uncertain';if(error.submitted)proof={ownerId:run.ownerId,intentId:run.intentId,watchKey:run.watchKey,uncertain:true,at:now()};throw error;}
   consumed=true;
   // Credit each confirmed request once; the server slot ID can later be reused.
   if(run.capacityLedger?.valid)run.capacityLedger.freed=Math.min(run.capacityLedger.initialOccupied,run.capacityLedger.freed+1);
   onEvent({step:'direct-item-consumed',action:kind,itemId:result.itemId,slotId:result.slotId});
   proof={ownerId:run.ownerId,intentId:run.intentId,watchKey:run.watchKey,uncertain:true,consumed:true,kind,priorUntil:run.extensionPriorUntil||0,extendHospital:!!options.extendHospital,at:now()};
   if(!ensure())throw Error('Run changed after item consumption. No subsequent action was sent.');
   let timer;const profile=await Promise.race([getProfile(),new Promise((_,reject)=>{timer=window.setTimeout(()=>reject(Error('Hospital status verification timed out')),12000);})]).finally(()=>window.clearTimeout(timer));
   if(!ensure())throw Error('Run changed during hospital status verification.');
   const status=(profile?.profile||profile)?.status,state=status?.state;
   lastStatus={at:now(),state:['Hospital','Abroad','Traveling'].includes(state)?state:'unknown',action:kind};
   onEvent({step:'direct-item-status',action:kind,status:lastStatus.state});
   if(kind==='heal'&&['Hospital','Abroad'].includes(state)){
    proof={...proof,uncertain:false,hospitalized:state==='Hospital',released:state==='Abroad',hospitalUntil:state==='Hospital'&&Number.isFinite(status.until)?status.until*1000:null,at:now()};
    return {medicalUsed:true,hospitalReleased:state==='Abroad'};
   }
   if(kind==='hospitalize'&&state==='Hospital'){
    if(options.extendHospital&&!(Number(status.until)*1000>Number(run.extensionPriorUntil||0)))throw Error('Hospital extension is not confirmed by the current deadline.');
    proof={...proof,uncertain:false,hospitalized:true,released:false,hospitalUntil:Number.isFinite(status.until)?status.until*1000:null,at:now()};return {hospitalized:true};
   }
   throw Error('Item was consumed, but hospital status is not confirmed. No further task was started.');
  }catch(error){if(consumed||error.submitted){error.submitted=true;if(run.capacityLedger&&!consumed){run.capacityLedger.valid=false;run.capacityLedger.reason='unconfirmed-direct-item';}}throw error;}
  finally{active=false;}
 }
 function observeProfile(payload){
  // Existing status reconciliation can recover a consumed item after a transient read failure.
  // Never clear an uncertain use outcome using hospital status alone.
  if(!proof?.consumed||!proof.uncertain)return;
  const status=(payload?.profile||payload)?.status,state=status?.state;
  if(!['Hospital','Abroad'].includes(state)||proof.kind==='hospitalize'&&(state!=='Hospital'||proof.extendHospital&&!(Number(status.until)*1000>proof.priorUntil)))return;
  proof={...proof,uncertain:false,hospitalized:state==='Hospital',released:state==='Abroad',hospitalUntil:state==='Hospital'&&Number.isFinite(status.until)?status.until*1000:null,at:now()};
  lastStatus={at:now(),state,action:proof.kind,reconciled:true};
 }
 return {...native,execute,cancel,observeProfile,forget(){cancel();proof=null;lastStatus=null;native.forget?.();},inspect(run){const base=native.inspect(run);if(!same(run))return base;if(proof.uncertain)return {...base,released:false,hospitalized:true,directItemUncertain:true};if(now()-proof.at>120000)return {...base,released:false,hospitalized:true,directItemUncertain:true};return {...base,released:proof.released,hospitalized:proof.hospitalized,hospitalUntil:proof.hospitalUntil,directItemConsumed:!!proof.consumed,directItemUncertain:false};},listInventory(){const pilot=getPilot(),inspection=pilot?.report().travelInspection;if(!inspection)return native.listInventory();return inspection.mappings.map(item=>({id:item.itemId,name:item.name,amount:1,source:'travel-direct-inventory'}));},report:()=>({active,lastStatus,proof:proof?{uncertain:proof.uncertain,hospitalized:proof.hospitalized,released:proof.released,at:proof.at}:null})};
}
