// Shared source embedded only into the lazy Travel Assistant factory.
// No gameplay requests: actions delegate once to a visible, automatically matched native control.
export function createTravelEnhancements({document,window,getItems,getContext,getSnapshot,getRows,matchRow,getSetup=()=>({}),storeSetup=()=>{},screenAlertEnabled=()=>false,getFilterContainer=row=>row,onArmed=()=>{},executeAction=null,filterEnabled,onNotice,storeRun=()=>{},restoreRun=null,now=()=>Date.now(),hospitalAudio=null,getDestinationETA=()=>null,reloadPage=()=>window.location.reload(),getHospitalCountdown=()=>null}) {
 const hiddenRows=new Map(),TTL=Number.MAX_SAFE_INTEGER,STOCK_TTL=30000;
 let departurePrompt=null,purchaseRefreshTimer=null;
 let run=restoreRun?{...restoreRun,expiresAt:Number.MAX_SAFE_INTEGER}:null,busy=false,active=false,hud=null,action=null,lastNotice='',statusTimer=null,statusAttempts=0,drag=null,suppressClickUntil=0,warningCancel=null,countdownTimer=null,countdownBase='',countdownShown=false,clockReadPending=false;if(run?.capacityLedger){run.capacityLedger={...run.capacityLedger,valid:false,reason:'page-refreshed'};}if(run)run.purchaseRefreshPending=false;const clockReads=new WeakSet();let extraHosp=null,hospitalShown=false,alarmDeadline=null,hospitalRemaining=false;
 const selections=(items,item)=>Array.isArray(items)?items.filter(item=>item?.name):item?.name?[item]:[];
 const hospitalItems=()=>selections(run?.hospitalizations,run?.hospitalization);
 let hospitalInventoryKnown=false,hospitalCarriedCount=0;
 const hasHospitalItem=()=>{const items=hospitalItems();hospitalCarriedCount=0;hospitalInventoryKnown=false;if(!items.length)return false;const carried=executeAction?.listInventory?.();hospitalInventoryKnown=Array.isArray(carried);if(hospitalInventoryKnown)hospitalCarriedCount=carried.filter(c=>items.some(item=>c.name.toLowerCase()===item.name.toLowerCase())&&c.amount>0).reduce((n,c)=>n+Number(c.amount),0);return hospitalCarriedCount>0;};
 const persist=()=>storeRun(run?{...run}:null);
 const focused=()=>!document.hidden&&document.hasFocus();
 const visible=e=>!!e?.isConnected&&!e.hidden&&e.getClientRects().length>0&&!e.closest('#tuim-panel,#tuim-travel-window,#tuim-catalog,#tu-pda-panel,#tu-snatch-run');
 const emit=(event,fields={})=>{try{document.dispatchEvent(new window.CustomEvent('tu-snatch-run-diagnostic',{detail:JSON.stringify({event,stage:run?.stage||'off',item:run?.watchName||'',...fields})}));}catch{}};
 const notice=value=>{lastNotice=value;if(action)action.title=value;onNotice?.(value);emit('notice',{message:String(value).slice(0,300)});};
 function showRow(row){const target=hiddenRows.get(row);for(const e of new Set([row,target]))if(e){e.classList.remove('tu-monitor-filter-hidden');delete e.dataset.tuMonitorFiltered;}hiddenRows.delete(row);}
 function restoreRows(){document.getElementById('tuim-filter-empty')?.remove();for(const row of [...hiddenRows.keys()])showRow(row);}
 function applyFilter(){
  if(!active||!filterEnabled()||!getItems().length){restoreRows();return;}
  const rows=getRows(),current=new Set(rows);const matches=rows.filter(row=>getItems().some(w=>matchRow(row,w)));let empty=document.getElementById('tuim-filter-empty');if(!matches.length&&rows.length){if(!empty){empty=document.createElement('p');empty.id='tuim-filter-empty';empty.textContent='No monitored items are listed here. Turn off Show monitored items only to see all items.';rows[0].parentElement?.before(empty);}}else empty?.remove();
  for(const row of [...hiddenRows.keys()])if(!row.isConnected||!current.has(row))showRow(row);
  for(const row of rows){
   const hide=!getItems().some(w=>matchRow(row,w)),target=getFilterContainer(row)||row;
   if(hiddenRows.has(row)&&(!hide||hiddenRows.get(row)!==target))showRow(row);
   if(hide&&!hiddenRows.has(row)){
    // Collapse the layout-owning container too: hiding a nested row alone leaves
    // the foreign shop's fixed-height LI in the list, producing empty slots.
    for(const e of new Set([row,target])){e.classList.add('tu-monitor-filter-hidden');e.dataset.tuMonitorFiltered='1';}
    hiddenRows.set(row,target);
   }
  }
 }
 function findControl(kind,s){
  const candidates=[...document.querySelectorAll('button,a,input[type=submit],input[type=button],[role=button]')].filter(e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');
  const matches=candidates.filter(e=>kind==='heal'?run?.medical&&s.medicalMatches?.(e,run.medical):kind==='buy'?s.buyMatches?.(e,run?.watchKey):s.returnMatches?.(e));
  // Multiple matches are ambiguous: never guess which gameplay action to submit.
  return matches.length===1?matches[0]:null;
 }
 function clearStatusTimer(){if(statusTimer!==null)window.clearTimeout(statusTimer);statusTimer=null;}
 function scheduleStatus(){
  clearStatusTimer();if(!run||!['hospitalize-pending','heal-pending','return-pending'].includes(run.stage)||statusAttempts>=3)return;
  const expected=run;statusTimer=window.setTimeout(async()=>{statusTimer=null;if(run!==expected||!active)return;
   if(!focused())return;
   statusAttempts++;try{await getContext();if(run===expected)check();}catch(error){notice(error.message);}
   if(run===expected)scheduleStatus();
  },[1200,4000,10000][statusAttempts]);
 }
 const afterHeal=()=>run.destroyInventory&&!run.destroyDone?'destroy':'buy';
 function screenAlert(s){let edge=document.getElementById('tu-snatch-screen-alert');if(!run||run.stage==='complete'||!screenAlertEnabled(getItems().find(item=>item.key===run.watchKey&&item.category==='Foreign'))){edge?.remove();return;}if(!edge){edge=document.createElement('div');edge.id='tu-snatch-screen-alert';edge.setAttribute('aria-hidden','true');edge.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483642;box-sizing:border-box;border:10px solid #d71920';const style=document.createElement('style');style.textContent='@keyframes tu-snatch-edge-flash{0%,49%{opacity:1}50%,100%{opacity:.15}}#tu-snatch-screen-alert[data-ready="true"]{border-color:#00ee4d!important;animation:tu-snatch-edge-flash .4s steps(1,end) infinite}';edge.append(style);document.body.append(edge);}const available=validRun(s)&&(run.stage==='return'||run.stage==='return-pending'||Number.isFinite(s.quantity)&&s.quantity>=Math.max(1,Number(run.minimumQty)||1)&&now()-run.stockAt<STOCK_TTL&&run.stage!=='waiting');if(edge.dataset.ready!==String(!!available))edge.dataset.ready=String(!!available);}
 const sameTrip=s=>run&&active&&run.expiresAt>now()&&String(s.ownerId)===run.ownerId&&s.country===run.country;
 const outbound=s=>sameTrip(s)&&s.traveling&&!s.returning&&s.hospitalized!==true;
 const validRun=s=>sameTrip(s)&&!s.traveling;
 function stopCountdown(){if(countdownTimer!==null)window.clearInterval(countdownTimer);countdownTimer=null;}
 function paintCountdown(){
  if(!action||!run)return;const end=Number(run.hospitalUntil),known=Number.isFinite(end)&&end>0,nativeSeconds=hospitalShown?getHospitalCountdown():null,seconds=known?(Number.isSafeInteger(nativeSeconds)&&nativeSeconds>=0?nativeSeconds:Math.max(0,Math.ceil((end-now())/1000))):null;
  const time=known?String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):'time unavailable';
  const extra=!!(hospitalShown&&hospitalRemaining&&['waiting','heal'].includes(run.stage));
  if(extraHosp){extraHosp.hidden=!extra;extraHosp.style.display=extra?'block':'none';const extraText='+ Hosp?\nHosp Time: '+time;if(extraHosp.textContent!==extraText)extraHosp.textContent=extraText;extraHosp.disabled=busy||!focused();positionExtra();}
  const eta=getDestinationETA();const etaText=eta?.outbound?'\nDest ETA: '+(Number.isFinite(eta.remainingSeconds)?eta.remainingSeconds+' seconds':'unavailable'):'';action.dataset.destinationETASeconds=Number.isFinite(eta?.remainingSeconds)?String(eta.remainingSeconds):'';
  const text=countdownBase+etaText+(countdownShown&&!extra?'\nHosp Time: '+time:'');if(action.textContent!==text){action.textContent=text;action.setAttribute('aria-label',text.replace('\n','. ')+'; drag to reposition');}
  const audioStatus=hospitalAudio?.status?.()||{};
  action.dataset.hospitalWarningSeconds=String(Math.max(1,Number(run.hospitalWarningSeconds)||60));action.dataset.hospitalAlarmEnabled=String(!!run.hospitalAlarm);action.dataset.hospitalAlarmSound=run.hospitalAlarmSound||'siren';action.dataset.hospitalAlarmVolume=String(audioStatus.volume??run.hospitalAlarmVolume??60);action.dataset.hospitalAudioState=audioStatus.contextState||'unknown';action.dataset.hospitalAudioSupported=typeof audioStatus.supported==='boolean'?String(audioStatus.supported):'unknown';action.dataset.hospitalSelectedCount=String(hospitalItems().length);action.dataset.hospitalCarriedCount=hospitalInventoryKnown?String(hospitalCarriedCount):'';action.dataset.hospitalExtraReason=!hospitalShown?'not-hospitalized':!hospitalItems().length?'no-selected-hospitalization-items':!hospitalInventoryKnown?'travel-inventory-unavailable':!hospitalCarriedCount?'selected-items-not-carried':!hospitalRemaining?'foreign-page-or-trip-not-ready':busy||!['waiting','heal'].includes(run.stage)?'action-pending-or-stage-not-ready':!focused()?'page-not-focused':'available';
  const threshold=Math.max(1,Number(run.hospitalWarningSeconds)||60),urgent=hospitalShown&&known&&seconds<=threshold&&seconds>0;
  const target=extra?extraHosp:action;for(const button of [action,extraHosp])if(button){const warning=getSetup().hospitalVisual!==false&&urgent&&button===target;button.dataset.hospitalWarning=String(warning);button.style.animation=warning?'tu-hospital-warning '+(.22+1.28*Math.min(1,seconds/threshold)).toFixed(2)+'s steps(1,end) infinite':'';}
  if(hospitalShown&&known&&seconds<=threshold&&seconds>0&&run.hospitalAlarm&&alarmDeadline!==end){alarmDeadline=end;action.dataset.hospitalAlarmDispatchedUntil=String(end);emit('hospital-alarm',{remainingSeconds:seconds,threshold,volume:Number(action.dataset.hospitalAlarmVolume),sound:run.hospitalAlarmSound||'siren'});hospitalAudio?.play?.({volume:run.hospitalAlarmVolume??60,sound:run.hospitalAlarmSound||'siren'});}
  const previousThresholdState=action.dataset.hospitalThresholdState;action.dataset.hospitalAlarmDispatchedUntil=alarmDeadline?String(alarmDeadline):'';action.dataset.hospitalThresholdState=!hospitalShown?'not-hospitalized':!known?'time-unavailable':seconds===0?'expired':urgent?'at-or-below-limit':'above-limit';
  if(previousThresholdState!==action.dataset.hospitalThresholdState)emit('hospital-threshold',{reason:action.dataset.hospitalThresholdState,remainingSeconds:seconds,threshold,enabled:!!run.hospitalAlarm});
  // Audio duration/mute controls own the playback lifetime.
 }
 function positionExtra(){if(!extraHosp||!action||extraHosp.hidden)return;const r=action.getBoundingClientRect(),h=extraHosp.getBoundingClientRect().height||64;extraHosp.style.left=Math.max(0,Math.min(r.left,window.innerWidth-(extraHosp.offsetWidth||180)))+'px';extraHosp.style.top=Math.max(0,r.top>=h+8?r.top-h-8:Math.min(window.innerHeight-h,r.bottom+8))+'px';}
 function updateCountdown(text,show,s){if(s.hospitalClock)run.hospitalClock=s.hospitalClock;if(Number.isFinite(s.hospitalUntil)&&s.hospitalUntil>0&&run.hospitalUntil!==s.hospitalUntil){run.hospitalUntil=s.hospitalUntil;persist();}const layoutChanged=countdownBase!==text||countdownShown!==show;countdownBase=text;countdownShown=show;hospitalShown=!!(s.hospitalized===true||s.hospitalized==null&&run.hospitalizedConfirmed);action.dataset.hospitalClockVisible=String(show);action.dataset.hospitalUntil=Number(run.hospitalUntil)>0?String(run.hospitalUntil):'';action.dataset.hospitalClockSource=run.hospitalClock?.source||(run.hospitalUntil?'restored-deadline':'unavailable');action.dataset.hospitalClockReason=run.hospitalClock?.reason||'';action.dataset.hospitalClockLookup=run.hospitalClockLookup||'not-requested';action.dataset.hospitalProfileState=run.hospitalClock?.profileState||'';action.dataset.hospitalProfileUntilPresent=String(!!run.hospitalClock?.profileUntilPresent);action.style.whiteSpace='pre-line';paintCountdown();if(layoutChanged&&action.style.top)clampPosition();if((hospitalShown&&Number(run.hospitalUntil)>0||getDestinationETA()?.outbound)&&!document.hidden){if(countdownTimer===null)countdownTimer=window.setInterval(()=>{if(document.hidden){stopCountdown();return;}paintCountdown();},1000);}else stopCountdown();}
 async function extendHospital(event){
  if(!event?.isTrusted||!run||busy||!focused()||!validRun(getSnapshot())||getSnapshot().hospitalized!==true||!['waiting','heal'].includes(run.stage)||!hasHospitalItem()){emit('click-blocked',{action:'extend-hospital',reason:action?.dataset.hospitalExtraReason||'not-armed-or-untrusted'});return false;}
  if(!executeAction?.enabled()){notice('Native inventory controls are unavailable.');return false;}
  hospitalAudio?.stop?.();return nativeAct('hospitalize',{extendHospital:true});
 }

 async function loadHospitalClock(force=false){const expected=run;if(!expected||clockReadPending||!force&&clockReads.has(expected))return;clockReads.add(expected);clockReadPending=true;run.hospitalClockLookup='loading';if(action)action.dataset.hospitalClockLookup='loading';try{const context=await getContext();if(run===expected){run.hospitalClockLookup=context.hospitalUntil>0?'available':'unavailable';run.hospitalClock=context.hospitalClock||null;if(context.hospitalUntil>0){run.hospitalUntil=context.hospitalUntil;persist();}}}catch{if(run===expected)run.hospitalClockLookup='request-failed';emit('hospital-clock-unavailable');}finally{clockReadPending=false;if(run===expected)refresh();}}
 function clearPurchaseRefresh(){if(purchaseRefreshTimer!==null)window.clearTimeout(purchaseRefreshTimer);purchaseRefreshTimer=null;}
 function schedulePurchaseRefresh(){
  if(!run||run.purchaseDisplayRefreshDone)return;
  const expected=run;run.purchaseDisplayRefreshDone=true;run.purchaseRefreshPending=true;persist();
  purchaseRefreshTimer=window.setTimeout(()=>{
   purchaseRefreshTimer=null;if(run!==expected||!active)return;
   run.purchaseRefreshPending=false;
   try{persist();const s=getSnapshot();if(busy||s.directItemUncertain||s.traveling||String(s.ownerId)!==run.ownerId||s.country!==run.country){refresh();return;}emit('purchase-inventory-refresh');reloadPage();}
   catch{notice('Purchase verified. Refresh inventory manually; the saved state could not be refreshed safely.');refresh();}
  },3000);
 }
 function finishReturnFlight(s){
  if(!run||run.stage==='complete'||!s.traveling||!s.returning||String(s.ownerId)!==run.ownerId)return false;
  run.stage='complete';run.purchaseRefreshPending=false;clearPurchaseRefresh();delete run.stepLabel;clearStatusTimer();executeAction?.cancel?.();departurePrompt?.remove();departurePrompt=null;persist();emit('return-flight-confirmed');notice('Return flight to Torn confirmed. Snatch and Run completed.');return true;
 }
 function refresh(){
  if(!action)return;finishReturnFlight(getSnapshot());const hide=!run||run.stage==='complete';action.dataset.hospitalSettingsActive=String(!hide);if(action.hidden!==hide)action.hidden=hide;const display=hide?'none':'block';if(action.style.display!==display)action.style.display=display;if(!run||hide){if(run?.stage==='complete'){action.textContent='Return flight booked';action.dataset.snatchStage='complete';}extraHosp?.setAttribute('hidden','');if(extraHosp)extraHosp.style.display='none';hospitalAudio?.stop?.();stopCountdown();document.getElementById('tu-snatch-screen-alert')?.remove();return;}
  const s=getSnapshot();hospitalRemaining=(s.hospitalized===true||s.hospitalized==null&&run.hospitalizedConfirmed)&&validRun(s)&&hasHospitalItem();screenAlert(s);const kind=run.stage,waiting=kind==='waiting',pending=kind.endsWith('-pending');
  const minimum=Math.max(1,Number(getItems().find(w=>w.key===run.watchKey)?.minQty)||1);
  const stockAvailable=kind==='hospitalize'?outbound(s)||Number.isFinite(s.quantity)&&s.quantity<minimum&&s.hospitalized===false:kind==='return'||(['buy','destroy'].includes(kind)?s.quantity>=minimum:!Number.isFinite(s.quantity)||s.quantity>=minimum);
  const ready=!!(stockAvailable&&(validRun(s)||kind==='hospitalize'&&outbound(s))&&focused()&&!busy&&!run.purchaseRefreshPending&&!waiting&&!pending&&(kind!=='destroy'||s.hospitalized===false)&&['hospitalize','heal','destroy','buy','return'].includes(kind)&&(['return','hospitalize'].includes(kind)||now()-run.stockAt<(kind==='heal'?120000:STOCK_TTL)));
  const reason=ready?'ready':!active?'tool-inactive':run.expiresAt<=now()?'run-expired':String(s.ownerId)!==run.ownerId?'player-unavailable-or-changed':s.country!==run.country?'destination-unavailable-or-changed':document.hidden?'page-hidden':!document.hasFocus()?'page-not-focused':busy?'action-busy':waiting?'waiting-for-stock':pending?'confirmation-pending':s.returning&&s.traveling?'return-flight':s.traveling&&kind!=='hospitalize'?'in-flight':!stockAvailable?'stock-or-hospital-status-unavailable':'state-or-stock-not-ready';
  action.dataset.readinessReason=reason;
  const text=run.purchaseRefreshPending?'Refreshing inventory…':kind==='departure-choice'?'Choose departure option':waiting?'Waiting for available stock':kind==='hospitalize'?'Hospitalize Me':pending?(kind==='hospitalize-pending'?'Confirming hospitalization':kind==='heal-pending'?'Confirming healing':kind==='buy-pending'?'Confirming purchase':kind==='destroy-pending'?'Destroying travel inventory':'Booking return flight'):kind==='complete'?'Return flight booked':kind==='destroy'?'Destroy Selected Items':kind==='buy'?'Purchase Max':kind==='heal'?'Heal from Hospital':'Return to Torn';
  const hospitalWaiting=waiting&&(s.hospitalized===true||s.hospitalized==null&&run.hospitalizedConfirmed);updateCountdown(text,hospitalWaiting,s);if(hospitalShown&&!run.hospitalUntil&&focused()&&!clockReads.has(run)&&!clockReadPending)void loadHospitalClock();action.dataset.snatchStage=kind;
  const state=ready?'ready':'waiting';if(action.dataset.state!==state){action.disabled=false;action.dataset.state=state;action.setAttribute('aria-disabled',String(!ready));action.style.backgroundColor=ready?'#167b35':'#b32424';action.style.borderColor=ready?'#66d584':'#ec8585';}
 }
 function showDepartureChoice(){
  if(!run||run.purchaseRefreshPending||run.stage!=='departure-choice'||departurePrompt?.isConnected)return;
  const expected=run,capacity=run.departureCapacity;
  const overlay=document.createElement('div');departurePrompt=overlay;overlay.id='tu-snatch-departure-choice';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Purchase completed with inventory space remaining');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000b;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
  const body=document.createElement('section');body.style.cssText='max-width:520px;padding:22px;background:#11191d;color:#eee;border:2px solid #d6b65c;border-radius:12px;font:16px/1.5 system-ui';overlay.append(body);
  const heading=document.createElement('h3');heading.textContent='Purchase completed';body.append(heading);
  const message=document.createElement('p');message.textContent=capacity?.free>0?capacity.free+' of '+capacity.total+' inventory slots remain free. Would you like to purchase other items and depart manually, or depart now?':'Remaining inventory space could not be verified. Would you like to purchase other items and depart manually, or depart now?';body.append(message);
  const detail=document.createElement('p');detail.textContent='Purchase more items closes Snatch and Run. You will choose additional purchases and arrange travel yourself. Depart now starts the usual travel steps, one action per click.';body.append(detail);
  for(const [label,manual] of [['Purchase more items',true],['Depart now',false]]){
   const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='padding:12px;margin:6px;background:#d6b65c;color:#111;border:0;border-radius:6px;font:bold 15px system-ui';body.append(button);
   button.onclick=event=>{event?.stopPropagation?.();if(!event?.isTrusted||run!==expected)return;overlay.remove();departurePrompt=null;delete run.departureCapacity;
    emit('departure-choice',{choice:manual?'manual-purchase':'depart-now'});
    if(manual){disarm('Snatch and Run closed. Purchase additional items and depart manually.');return;}
    run.stage='return';persist();refresh();return act(event);
   };
  }
  for(const type of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click'])overlay.addEventListener(type,event=>event.stopPropagation());
  overlay.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const buttons=[...body.querySelectorAll('button')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}});
  document.body.append(overlay);body.querySelector('button').focus();
 }
 function finishPurchase(){
  run.purchaseConfirmed=true;
  if(typeof executeAction?.remainingCapacity!=='function'){run.stage='return';return;}
  const capacity=executeAction.remainingCapacity(run);
  emit('post-purchase-space',{freeSlots:capacity?.free??null,capacityTotal:capacity?.total??null,verified:!!capacity});
  if(capacity&&capacity.free===0){run.stage='return';return;}
  run.departureCapacity=capacity||null;run.stage='departure-choice';
 }
 function disarm(reason='Snatch and Run canceled'){clearPurchaseRefresh();departurePrompt?.remove();departurePrompt=null;hospitalAudio?.stop?.();alarmDeadline=null;emit('cancel',{message:reason});clearStatusTimer();executeAction?.cancel();executeAction?.forget?.();busy=false;run=null;persist();notice(reason);refresh();}
 async function arm({watchKey,hospital,medical=null,destroyInventory=false,destroyAccepted=false,destroyItems=[],planHospitalize=false,hospitalization=null,medicals=null,hospitalizations=null,hospitalWarningSeconds=60,hospitalAlarm=false,hospitalAlarmVolume=60,hospitalAlarmSound='siren'}={}){
  if(!active||!focused())throw Error('Open Travel Assistant on the actively viewed foreign page');
  const watch=getItems().find(w=>w.key===watchKey&&w.category==='Foreign');if(!watch)throw Error('Select a monitored foreign item');
  hospitalAudio?.unlock?.();const s=await getContext();
  if(!active||!focused())throw Error('Travel Assistant was closed or the page lost focus; arm again');
  if(!s.country||!s.ownerId||!['Abroad','Hospital','Traveling'].includes(s.status)||s.returning)throw Error('A confirmed foreign destination or current foreign location is required');
  medicals=selections(medicals,medical);hospitalizations=selections(hospitalizations,hospitalization);medical=medicals[0]||null;hospitalization=hospitalizations[0]||null;
  if(s.status==='Hospital'&&!medical?.name)throw Error('Select a healing medical item before arming while hospitalized');
  const selectedItem=item=>!!item?.name&&(item.source==='travel-dom'||item.source==='agency-picker'||Number.isSafeInteger(Number(item.id))&&Number(item.id)>0);
  if((hospital||planHospitalize)&&(!medicals.length||medicals.some(item=>!selectedItem(item))))throw Error('Select the medical item you intend to use');
  if(destroyInventory&&!destroyAccepted)throw Error('Accept the Inventory Destruction warning before arming');
  if(destroyInventory&&(!Array.isArray(destroyItems)||!destroyItems.length||destroyItems.some(item=>!item?.name)))throw Error('Confirm the inventory items selected for destruction');
  hospitalAudio?.unlock?.();hospitalAudio?.stop?.();alarmDeadline=null;
  run={medicals,hospitalizations:hospitalizations.filter(selectedItem),hospitalWarningSeconds:Math.max(1,Math.min(3600,Number(hospitalWarningSeconds)||60)),hospitalAlarm:!!hospitalAlarm,hospitalAlarmVolume:Math.max(0,Math.min(100,Number(hospitalAlarmVolume)||0)),hospitalAlarmSound:['beep','siren','chime'].includes(hospitalAlarmSound)?hospitalAlarmSound:'siren',planHospitalize:!!planHospitalize&&selectedItem(hospitalization),hospitalization:selectedItem(hospitalization)?hospitalization:null,destroyItems:destroyItems.map(item=>({name:item.name,id:item.id??null})),destroyInventory:!!destroyInventory,destroyAccepted:!!destroyInventory&&!!destroyAccepted,destroyDone:false,intentId:window.crypto?.randomUUID?.()||String(now())+':'+Math.random(),ownerId:String(s.ownerId),country:s.country,watchKey,watchName:watch.name,maximumPrice:Number.isFinite(watch.maxPrice)&&watch.maxPrice>0?watch.maxPrice:null,minimumQty:Math.max(1,Number(watch.minQty)||1),hospital:!!hospital,medical,hospitalUntil:s.hospitalUntil||null,hospitalClock:s.hospitalClock||null,hospitalClockLookup:s.hospitalClock?(s.hospitalUntil?'available':'unavailable'):'not-requested',hospitalizedConfirmed:s.status==='Hospital',stage:'waiting',expiresAt:TTL,stockAt:0};
  executeAction?.prepareRun?.(run);
  if(s.hospitalClock)clockReads.add(run);
  if(run.planHospitalize&&s.status!=='Hospital')run.stage='hospitalize';const snapshot=getSnapshot();if(planHospitalize&&!s.traveling&&Number.isFinite(snapshot.quantity)&&snapshot.quantity>=run.minimumQty){run.stockAt=now();run.stage=snapshot.hospitalized?'heal':afterHeal();}
  watch.fired=false;clearStatusTimer();executeAction?.cancel();busy=false;persist();notice('Armed. Waiting for the selected item alarm.');refresh();emit('armed',{hospital:!!hospital,threshold:run.hospitalWarningSeconds,enabled:run.hospitalAlarm,selectedCount:hospitalItems().length});onArmed();return {...run};
 }
 const stockIgnoredEvidence=new Map();
 function stock(w,s){
  if(!run||w.key!==run.watchKey||!validRun(s)||!focused()||!(s.quantity>0)){const reason=!run?'not-armed':w.key!==run.watchKey?'different-armed-item':!focused()?'page-not-focused':s.traveling?'traveling':String(s.ownerId)!==run.ownerId?'player-unavailable-or-changed':s.country!==run.country?'destination-unavailable-or-changed':!(s.quantity>0)?'quantity-unavailable-or-zero':'run-inactive-or-expired';const signature=JSON.stringify([reason,run?.stage,s.quantity]),prior=stockIgnoredEvidence.get(w.key);if(!prior||prior.signature!==signature||now()-prior.at>=60000){stockIgnoredEvidence.set(w.key,{signature,at:now()});if(stockIgnoredEvidence.size>64)stockIgnoredEvidence.delete(stockIgnoredEvidence.keys().next().value);emit('stock-ignored',{item:w.name,quantity:s.quantity,reason});}return;}
  stockIgnoredEvidence.delete(w.key);run.stockAt=now();if(['waiting','hospitalize'].includes(run.stage)){run.stage=s.hospitalized===true?'heal':s.hospitalized===false?afterHeal():run.hospital?'heal':afterHeal();emit('stock-ready',{quantity:s.quantity});}persist();refresh();
 }
 function check(){
  if(!run)return;const s=getSnapshot();
  if(s.ownerId==null){refresh();return;}
  if(String(s.ownerId)!==run.ownerId){disarm('Player changed; arm again');return;}
  if(run.stage==='hospitalize'&&s.hospitalized===true){run.stage='waiting';persist();}
  if(['hospitalize','waiting'].includes(run.stage)&&Number.isFinite(s.quantity)&&s.quantity>=Math.max(1,Number(run.minimumQty)||1)&&validRun(s)&&focused()){run.stockAt=now();run.stage=s.hospitalized?'heal':afterHeal();persist();emit('stock-ready',{quantity:s.quantity});}
  if(run.stage==='hospitalize-pending'&&s.hospitalized===true&&(!run.extensionPending||s.hospitalUntil>run.extensionPriorUntil)){run.extensionPending=false;run.stage='waiting';persist();}
  if(run.stage==='heal'&&s.hospitalized===false){run.stage=afterHeal();persist();}
  if(['buy','destroy'].includes(run.stage)&&s.hospitalized===true){if(run.medical){run.stage='heal';persist();}else{notice('Hospitalized: restore Travel Assistant and select a healing item, then re-arm.');}}
  if(run.stage==='heal-pending'&&s.hospitalized===false){clearStatusTimer();run.stage=afterHeal();persist();notice(run.stage==='destroy'?'Hospital release confirmed. Destroy Selected Items is ready with fresh stock.':'Hospital release confirmed. Return to the monitored shop and verify fresh stock before buying.');}
  if(!busy&&run.stage==='buy-pending'&&s.purchaseProof&&s.purchaseProof!==run.priorProof&&s.purchaseItemKey===run.watchKey){run.stage='return';run.purchaseConfirmed=true;persist();notice('Purchase confirmed. Return to Torn is ready.');}
  finishReturnFlight(s);
  refresh();
 }
 function nativeControl(kind,s){
  const e=findControl(kind,s);if(!e)throw Error('Open the native Torn '+(kind==='heal'?'inventory for the selected healing item':kind==='buy'?'shop for the monitored item':'return travel page')+'. A unique visible '+kind+' action is required; no action was sent.');
  if(kind==='heal'){
   if(!s.hospitalized)throw Error('Hospital status must be confirmed before using a medical item');
   if(!run.medical||!s.medicalMatches?.(e,run.medical))throw Error('The visible control does not match the selected medical item');
  }
  if(kind==='buy'){
   if(s.hospitalized!==false)throw Error('Confirm hospital release before buying');
   if(!(s.quantity>=Math.max(1,Number(getItems().find(w=>w.key===run.watchKey)?.minQty)||1))||!s.buyMatches?.(e,run.watchKey))throw Error('Reconfirm fresh stock for the monitored item');
   const input=s.quantityInput;let max=s.maxQuantity,verified=s.maxVerified;
   if(input&&visible(s.maxControl)){s.maxControl.click();max=Number(input.value);verified=Number.isSafeInteger(max)&&max>0&&max<=s.quantity;}
   if(!input||!Number.isSafeInteger(max)||max<1||!verified)throw Error('Torn has not exposed a verified maximum quantity. Set Max manually and retry.');
   const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;if(!setter)throw Error('Quantity input is not supported');
   setter.call(input,String(max));input.dispatchEvent(new window.Event('input',{bubbles:true}));input.dispatchEvent(new window.Event('change',{bubbles:true}));if(!visible(e))throw Error('Torn refreshed the purchase controls; retry Purchase Max');
  }
  if(kind==='return'&&(!s.returnMatches?.(e)||!run.purchaseConfirmed))throw Error('Confirm purchase and open the native return travel page');
  return e;
 }
 async function nativeAct(kind,options={}){
  const expected=run;if(options.extendHospital){run.extensionPending=true;run.extensionPriorUntil=getSnapshot().hospitalUntil||run.hospitalUntil||0;}busy=true;hospitalAudio?.stop?.();emit('action-start',{action:kind});run.priorProof=getSnapshot().purchaseProof||null;run.stage=kind+'-pending';persist();refresh();
  const guard=()=>run===expected&&active&&run.expiresAt>now()&&String(getSnapshot().ownerId)===run.ownerId&&getSnapshot().country===run.country;
  try{
   const result=await executeAction.execute(kind,{...options,run:expected,getSnapshot,guard,onEvent:fields=>emit('native-step',{action:kind,...fields})});if(run!==expected)return false;if(run.stage==='complete')return true;
   if(kind==='hospitalize'&&result.hospitalized){run.extensionPending=false;run.hospitalizedConfirmed=true;run.stage='waiting';void loadHospitalClock(true);const state=getSnapshot();if(Number.isFinite(state.quantity)&&state.quantity>=run.minimumQty){run.stockAt=now();run.stage='heal';}}
   if(kind==='heal'&&result.medicalUsed&&!result.hospitalReleased){run.stage='heal';void loadHospitalClock(true);}
   if(kind==='heal'&&result.hospitalReleased){run.hospitalizedConfirmed=false;hospitalAudio?.stop?.();run.stage=afterHeal();}
   if(kind==='destroy'&&result.inventoryDestroyed){run.destroyDone=true;run.stage='buy';}
   if(kind==='buy'&&result.purchaseConfirmed){finishPurchase();}
   if(kind==='return'&&result.returnBooked)run.stage='complete';
   persist();if(kind==='buy'&&result.purchaseConfirmed&&result.directPurchaseVerified)schedulePurchaseRefresh();emit('action-result',{action:kind,result:'confirmed',amount:result.amount||null});notice(run.stage==='departure-choice'?'Purchase completed. Choose whether to depart or continue manually.':result.reconcileWarning?'Purchased '+result.amount+' item(s). Reconciliation stopped: '+result.reconcileWarning+'. Return to Torn is ready.':kind==='hospitalize'?'Hospitalization confirmed. Waiting for available stock.':kind==='heal'&&!result.hospitalReleased?'Healing item used; still hospitalized. Click again to use the next selected available heal.':kind==='heal'?(run.stage==='destroy'?'Hospital release confirmed. Destroy Selected Items is ready.':'Hospital release confirmed. Purchase Max is ready.'):kind==='destroy'?'Selected items destroyed. Purchase Max is ready.':kind==='buy'?'Purchase confirmed. Return to Torn is ready.':'Return flight booked.');if(run.stage==='departure-choice')showDepartureChoice();return true;
  }catch(error){if(run===expected&&run.stage==='complete')return true;if(run===expected){if(!error.submitted){run.stage=options.extendHospital?'waiting':kind;run.extensionPending=false;}else{statusAttempts=0;scheduleStatus();}persist();emit('action-error',{action:kind,message:error.message,submitted:!!error.submitted});notice(error.message);}return false;}
  finally{if(run===expected){busy=false;check();}}
 }
 async function hospitalizeBeforeLanding(){
  const expected=run;if(!expected||busy||!focused()||!outbound(getSnapshot()))return false;busy=true;refresh();
  try{
   emit('before-landing-confirmation',{action:'hospitalize'});
   if(!window.confirm('Hospitalize before landing? Use your selected hospitalization item, '+expected.hospitalization?.name+', now while flying to '+expected.country+'?')){emit('before-landing-declined',{action:'hospitalize'});return false;}
   if(!executeAction?.enabled())throw Error('Native inventory controls are unavailable; no item was used');
   const current=await getContext();if(run!==expected||!active||!focused()||current.status!=='Traveling'||current.returning||current.country!==expected.country||String(current.ownerId)!==expected.ownerId||!outbound(getSnapshot()))throw Error('The outbound flight changed or could not be verified. No item was used.');
   emit('before-landing-confirmed',{action:'hospitalize'});return await nativeAct('hospitalize',{allowBeforeLanding:true});
  }catch(error){notice(error.message);return false;}finally{if(run===expected){busy=false;refresh();}}
 }
 function act(event){
  if(!event?.isTrusted||busy||!run||run.purchaseRefreshPending)return false;
  const s=getSnapshot(),kind=run.stage;
  if(kind==='hospitalize'&&outbound(s))return hospitalizeBeforeLanding();
  if(!validRun(s)||!focused()||(!['return','hospitalize'].includes(kind)&&Number.isFinite(s.quantity)&&s.quantity<Math.max(1,Number(run.minimumQty)||1))||(!['return','hospitalize'].includes(kind)&&now()-run.stockAt>=(kind==='heal'?120000:STOCK_TTL))||!['hospitalize','heal','destroy','buy','return'].includes(kind)){notice('Refresh visible state/stock, or re-arm before acting');refresh();return false;}
  if(kind==='hospitalize'&&(s.hospitalized!==false||!Number.isFinite(s.quantity)||s.quantity>=Math.max(1,Number(run.minimumQty)||1))){check();return false;}
  if(executeAction?.enabled())return nativeAct(kind);
  if(['hospitalize','destroy'].includes(kind)){notice('Native inventory Trash controls are unavailable in this host. No inventory action was sent.');return false;}
  busy=true;
  try{const e=nativeControl(kind,s);run.priorProof=s.purchaseProof||null;run.stage=kind+'-pending';if(kind==='return')run.stockAt=now();persist();e.click();notice('Action sent to Torn. Complete any native confirmation; the next action waits for observed success.');statusAttempts=0;scheduleStatus();return true;}
  catch(error){notice(error.message);return false;}finally{busy=false;refresh();}
 }
 function mount(parent,alarmParent=parent){
  warningCancel?.();
  const setup=getSetup();if(!setup.destroyInventory||!setup.destroyAccepted||!setup.destroyItems?.length){setup.destroyInventory=false;setup.destroyAccepted=false;setup.destroyItems=[];}const section=document.createElement('section');section.id='tuim-snatch-setup';parent.append(section);let refreshInventory=()=>{},inventoryInfo=executeAction?.inventorySummary?.()||null;
  const title=document.createElement('h3');title.textContent='Snatch and Run';section.append(title);
  const hint=document.createElement('p');hint.textContent='Arm to minimize this window. The red button waits for stock; green offers Heal from Hospital if needed, optional Destroy Selected Items, Purchase Max, then Return to Torn. Each action needs your click and its Torn page controls.';section.append(hint);
  const inventoryOverview=document.createElement('section');inventoryOverview.id='tuim-inventory-overview';section.append(inventoryOverview);
  const field=(label,control,target=section)=>{const wrap=document.createElement('label');wrap.textContent=label;wrap.style.cssText='display:block;margin:10px 0';control.style.cssText='display:block;width:100%;margin-top:4px';wrap.append(control);target.append(wrap);return wrap;};
  const watch=document.createElement('select');watch.setAttribute('aria-label','Snatch and Run monitored item');for(const w of getItems().filter(w=>w.category==='Foreign')){const o=document.createElement('option');o.value=w.key;o.textContent=w.name;watch.append(o);}field('Monitored foreign item',watch);if([...watch.options].some(o=>o.value===setup.watchKey))watch.value=setup.watchKey;
  const hospital=document.createElement('select');hospital.setAttribute('aria-label','Planning to Hospitalize?');for(const [value,label] of [['no','Planning to Hospitalize? No'],['yes','Planning to Hospitalize? Yes']]){const o=document.createElement('option');o.value=value;o.textContent=label;hospital.append(o);}field('Planning to Hospitalize?',hospital);hospital.value=setup.hospital?'yes':'no';
  const medical=document.createElement('select');medical.setAttribute('aria-label','Selected medical item');medical.multiple=true;medical.size=4;const medicalField=field('Healing items from your inventory (select one or more)',medical);const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Load medical inventory to select a healing item';medical.append(placeholder);for(const item of selections(setup.medicals,setup.medical)){const o=document.createElement('option');o.value=JSON.stringify(item);o.textContent=item.name+(item.source==='agency-picker'?' (available to pack)':' (verify native availability)');medical.append(o);o.selected=true;}const selected=select=>[...select.selectedOptions].filter(o=>o.value).map(o=>JSON.parse(o.value));const saveSetup=()=>{storeSetup({watchKey:watch.value,hospital:hospital.value==='yes',medicals:selected(medical),medical:selected(medical)[0]||null,planHospitalize:hospital.value==='yes',hospitalizations:selected(hospitalization),hospitalization:selected(hospitalization)[0]||null,destroyItems:setup.destroyItems||[],destroyInventory:!!setup.destroyInventory,destroyAccepted:!!setup.destroyAccepted,hospitalWarningSeconds:setup.hospitalWarningSeconds??60,hospitalAlarm:!!setup.hospitalAlarm,hospitalVisual:setup.hospitalVisual!==false,hospitalAlarmVolume:setup.hospitalAlarmVolume??60,hospitalAlarmSound:setup.hospitalAlarmSound||'siren'});refreshInventory();};watch.onchange=saveSetup;medical.onchange=()=>{setup.medicals=selected(medical);setup.medical=setup.medicals[0]||null;saveSetup();};
  const hospitalization=document.createElement('select');hospitalization.setAttribute('aria-label','Selected hospitalization item');hospitalization.multiple=true;hospitalization.size=4;const hospitalizationField=field('Hospitalization items from your inventory (select one or more)',hospitalization);const hospitalizationPlaceholder=document.createElement('option');hospitalizationPlaceholder.value='';hospitalizationPlaceholder.textContent='None — already used / skip hospitalization';hospitalization.append(hospitalizationPlaceholder);for(const item of selections(setup.hospitalizations,setup.hospitalization)){const option=document.createElement('option');option.value=JSON.stringify(item);option.textContent=item.name+(item.source==='agency-picker'?' (available to pack)':'');hospitalization.append(option);option.selected=true;}hospitalization.onchange=()=>{setup.hospitalizations=selected(hospitalization);setup.hospitalization=setup.hospitalizations[0]||null;saveSetup();};
  const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;section.append(b);return b;};
  const selectionHint=document.createElement('p');selectionHint.textContent='Select all item types you want to use. Each click uses one carried item, in list order. On PC use Ctrl/Command to select multiple rows. None skips planned hospitalization.';section.append(selectionHint);
  const load=add('Load inventory',async()=>{try{const data=await getContext({inventory:true});inventoryInfo=executeAction?.inventorySummary?.()||null;
   for(const [select,items,saved,isHeal] of [[medical,data.medicalItems,selections(setup.medicals,setup.medical),true],[hospitalization,data.selectionItems||data.inventoryItems,selections(setup.hospitalizations,setup.hospitalization),false]]){
    select.replaceChildren();const none=document.createElement('option');none.value='';none.textContent=isHeal?'Select healing items':'None — already used / skip hospitalization';select.append(none);
    for(const item of items||[]){if(!(item.amount>0))continue;const option=document.createElement('option');option.value=JSON.stringify({id:item.id,uid:item.uid??null,name:item.name,source:item.source||'api'});option.textContent=item.name+' × '+item.amount+(item.source==='agency-picker'?' (available to pack)':'');option.selected=saved.some(s=>s.name===item.name);select.append(option);}
    if(data.agencyPage)for(const item of saved){if([...select.options].some(o=>o.value&&JSON.parse(o.value).name===item.name))continue;const option=document.createElement('option');option.value=JSON.stringify(item);option.textContent=item.name+' (saved; verify packed availability)';option.selected=true;select.append(option);}
    if(select.options.length===1){none.textContent=isHeal?(data.inventorySource==='travel-dom'?'No items in current travel inventory':'No medical items available'):'No items in current travel inventory — skip hospitalization';}
    if(isHeal&&select.options.length>1&&!select.selectedOptions.length)select.options[1].selected=true;
   }
   setup.medicals=selected(medical);setup.hospitalizations=selected(hospitalization);setup.medical=setup.medicals[0]||null;setup.hospitalization=setup.hospitalizations[0]||null;saveSetup();notice(data.agencyPage&&!data.selectionItems?.length?'No items are packed. Open the Torn inventory search to load available choices, then use Load inventory again.':data.selectionItems?.some(item=>item.source==='agency-picker')?'Loaded agency choices. Items marked available to pack must be added to travel inventory using Torn Add/Fill before they can be used.':'Loaded inventory. Select every healing and hospitalization item type you want to use. Each click uses one selected carried item.');
  }catch(error){notice(error.message);}});
  const alarmTitle=document.createElement('h4');alarmTitle.textContent='Hospital alarm';alarmParent.append(alarmTitle);
  const warning=document.createElement('input');warning.id='tuim-hospital-warning-seconds';warning.type='number';warning.min='1';warning.max='3600';warning.value=setup.hospitalWarningSeconds??60;field('Warn when hospital time reaches (seconds)',warning,alarmParent);warning.onchange=()=>{setup.hospitalWarningSeconds=Math.max(1,Math.min(3600,Number(warning.value)||60));warning.value=setup.hospitalWarningSeconds;saveSetup();};
  const alarm=document.createElement('input');alarm.id='tuim-hospital-alarm-enabled';alarm.type='checkbox';alarm.checked=!!setup.hospitalAlarm;const alarmWrap=field('Audio',alarm,alarmParent);alarm.style.cssText='display:inline-block;width:20px;height:20px;min-height:20px;margin:6px';alarmWrap.replaceChildren(alarm,document.createTextNode('Audio'));alarmWrap.className='tuim-monitored-toggle';alarmWrap.style.display='flex';alarmWrap.style.alignItems='center';alarm.onchange=()=>{setup.hospitalAlarm=alarm.checked;if(run){run.hospitalAlarm=alarm.checked;persist();}if(!alarm.checked)hospitalAudio?.stop?.();hospitalAudio?.unlock?.();saveSetup();};
  const visual=document.createElement('input');visual.type='checkbox';visual.id='tuim-hospital-visual';visual.checked=setup.hospitalVisual!==false;const channels=document.createElement('div');channels.className='tuim-alarm-channels';alarmParent.insertBefore(channels,alarmWrap);channels.append(alarmWrap);const visualWrap=field('Visual',visual,channels);visualWrap.replaceChildren(visual,document.createTextNode('Visual'));visualWrap.className='tuim-monitored-toggle';visual.onchange=()=>{setup.hospitalVisual=visual.checked;saveSetup();refresh();};
  const sound=document.createElement('select');sound.id='tuim-hospital-alarm-sound';for(const name of ['beep','siren','chime']){const o=document.createElement('option');o.value=name;o.textContent=name;sound.append(o);}sound.value=setup.hospitalAlarmSound||'siren';field('Hospital alarm sound',sound,alarmParent);sound.onchange=()=>{setup.hospitalAlarmSound=sound.value;saveSetup();};
  const testAlarm=document.createElement('button');testAlarm.type='button';testAlarm.textContent='Test hospital alarm';testAlarm.onclick=()=>{hospitalAudio?.unlock?.();hospitalAudio?.play?.({sound:sound.value});};alarmParent.append(testAlarm);

  const destroyWrap=document.createElement('label');destroyWrap.style.cssText='display:flex;align-items:center;gap:8px;margin:12px 0';const destruction=document.createElement('input');destruction.type='checkbox';destruction.id='tuim-inventory-destruction';destruction.checked=!!setup.destroyInventory&&!!setup.destroyAccepted&&!!setup.destroyItems?.length;destruction.style.cssText='width:18px;height:18px;min-height:18px;flex:none';destroyWrap.append(destruction,document.createTextNode('Inventory Destruction'));section.append(destroyWrap);const destroySummary=document.createElement('p');destroySummary.textContent='Selected for destruction: '+(setup.destroyItems?.map(item=>item.name).join(', ')||'No items selected');section.append(destroySummary);
  destruction.onchange=()=>{if(!destruction.checked){setup.destroyInventory=false;setup.destroyAccepted=false;setup.destroyItems=[];destroySummary.textContent='Selected for destruction: No items selected';saveSetup();if(run?.destroyInventory)disarm('Inventory Destruction disabled; arm again');return;}destruction.checked=false;const overlay=document.createElement('div');overlay.id='tuim-destruction-warning';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Inventory Destruction warning');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#8b0000f5;color:white;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box';const body=document.createElement('div');body.style.cssText='max-width:700px;max-height:calc(100dvh - 48px);overflow:auto;font:bold 22px/1.5 system-ui';body.textContent="Warning: By activating Snatch and Run Inventory Destruction, the inventory items you select will be permanently destroyed at your demand when Destroy Selected Items is pressed.";const detail=document.createElement('p');detail.style.fontSize='16px';detail.textContent='Only the selected item types carried in foreign travel inventory are destroyed, after healing if needed. Item destruction is permanent. The button will display Destroy Selected Items before Purchase Max.';body.append(detail);overlay.append(body);document.body.append(overlay);const chosen=new Set();let loaded=false;const selection=document.createElement('div');selection.style.cssText='font:16px system-ui;max-height:240px;overflow:auto;background:#4d0000;padding:12px';selection.textContent='Reading current travel inventory… Select the items to destroy when the list appears.';body.append(selection);const loadSelection=document.createElement('button');loadSelection.type='button';loadSelection.textContent='Retry inventory loading';loadSelection.hidden=true;body.append(loadSelection);loadSelection.onclick=async()=>{loadSelection.disabled=true;loadSelection.hidden=true;loaded=false;chosen.clear();try{const data=await getContext({inventory:true});inventoryInfo=executeAction?.inventorySummary?.()||null;refreshInventory();if(!overlay.isConnected)return;selection.replaceChildren();const items=data.inventoryItems||[];for(const item of items.filter(item=>item.amount>0)){const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:center;margin:8px';const box=document.createElement('input');box.type='checkbox';box.style.cssText='width:22px;height:22px';box.onchange=()=>{if(box.checked)chosen.add(item);else chosen.delete(item);};label.append(box,document.createTextNode(item.name+' — all carried copies'));selection.append(label);}loaded=true;if(!items.some(item=>item.amount>0))selection.textContent='No inventory items are available to select.';}catch(error){if(overlay.isConnected){selection.textContent=error.message;loadSelection.hidden=false;}}finally{loadSelection.disabled=false;}};const finish=accepted=>{if(accepted&&(!loaded||!chosen.size)){selection.append(document.createTextNode(' Select at least one item before accepting.'));return;}if(accepted)setup.destroyItems=[...chosen].map(item=>({id:item.id,name:item.name}));else setup.destroyItems=[];warningCancel=null;destroySummary.textContent='Selected for destruction: '+(setup.destroyItems?.map(item=>item.name).join(', ')||'No items selected');setup.destroyInventory=accepted;setup.destroyAccepted=accepted;destruction.checked=accepted;saveSetup();overlay.remove();document.removeEventListener('keydown',escape);if(run)disarm('Inventory Destruction setting changed; arm again');destruction.focus();};const escape=event=>{if(event.key==='Escape')finish(false);if(event.key==='Tab'){const controls=[...body.querySelectorAll('button,input')].filter(control=>!control.disabled);if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}}};warningCancel=()=>finish(false);document.addEventListener('keydown',escape);for(const [label,value] of [['Accept',true],['Decline',false]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='font:bold 20px system-ui;padding:12px 24px;margin:8px;color:#111;background:white';button.onclick=()=>finish(value);body.append(button);}body.querySelector('button:last-child').focus();void loadSelection.onclick();};
  refreshInventory=()=>{
   inventoryOverview.replaceChildren();const heading=document.createElement('h4');heading.textContent='Travel inventory and purchase capacity';inventoryOverview.append(heading);
   const totals=document.createElement('p');totals.textContent=inventoryInfo?.verified?'Total capacity: '+inventoryInfo.total+' slots · Used: '+inventoryInfo.occupied+' · Free now: '+inventoryInfo.free:'Total capacity: unavailable. Make sure the full travel inventory is visible, then use Load inventory.';inventoryOverview.append(totals);
   const items=inventoryInfo?.items||[],list=document.createElement('ul');list.style.cssText='padding-left:22px;margin:8px 0';
   const normalize=name=>String(name||'').normalize('NFKC').trim().toLowerCase();const heals=selected(medical),hospItems=selected(hospitalization);
   for(const item of items){const notes=[];const healing=heals.some(s=>normalize(s.name)===normalize(item.name)),hospitalizing=hospital.value==='yes'&&hospItems.some(s=>normalize(s.name)===normalize(item.name)),destroying=!!setup.destroyInventory&&!!setup.destroyAccepted&&setup.destroyItems?.some(s=>normalize(s.name)===normalize(item.name));if(healing)notes.push('Heal');if(hospitalizing)notes.push('Hospitalize');if(destroying)notes.push(healing||hospitalizing?'destroy remaining copies':'Destroy');const row=document.createElement('li');row.textContent=item.name+' × '+item.amount+' — '+item.amount+' slot'+(item.amount===1?'':'s')+' ['+(notes.join('; ')||'Keep')+']';list.append(row);}
   if(items.length)inventoryOverview.append(list);else if(inventoryInfo){const empty=document.createElement('p');empty.textContent='No items currently occupy travel inventory slots.';inventoryOverview.append(empty);}
   const explanation=document.createElement('p');explanation.textContent='Purchase Max buys as many monitored items as confirmed free space, available funds and stock permit. Selected items still occupy space until their use or destruction is confirmed; each freed slot is counted once.';inventoryOverview.append(explanation);
  };refreshInventory();
  add('Arm Snatch and Run',async()=>{try{await arm({watchKey:watch.value,hospital:hospital.value==='yes',medicals:selected(medical),medical:selected(medical)[0]||null,planHospitalize:hospital.value==='yes',hospitalizations:selected(hospitalization),hospitalization:selected(hospitalization)[0]||null,destroyItems:setup.destroyItems||[],destroyInventory:destruction.checked,destroyAccepted:!!setup.destroyAccepted,hospitalWarningSeconds:setup.hospitalWarningSeconds??60,hospitalAlarm:!!setup.hospitalAlarm,hospitalVisual:setup.hospitalVisual!==false,hospitalAlarmVolume:setup.hospitalAlarmVolume??60,hospitalAlarmSound:setup.hospitalAlarmSound||'siren'});}catch(error){notice(error.message);}});
  const hospitalChanged=()=>{saveSetup();hospitalizationField.hidden=hospital.value!=='yes';hospitalizationField.style.display=hospitalizationField.hidden?'none':'block';medicalField.hidden=hospital.value!=='yes'&&getSnapshot().hospitalized!==true;medicalField.style.display=medicalField.hidden?'none':'block';load.hidden=false;load.style.display='';};hospital.onchange=hospitalChanged;hospitalChanged();
  add('Cancel Snatch and Run',()=>disarm());
 }
 const positionKey='tu:snatch-run:position:v1';
 function clampPosition(x,y){
  if(!action)return;const rect=action.getBoundingClientRect(),width=Math.max(120,rect.width||160),height=Math.max(40,rect.height||48);
  const left=Math.max(0,Math.min(Number.isFinite(x)?x:parseFloat(action.style.left)||0,Math.max(0,window.innerWidth-width)));
  const top=Math.max(0,Math.min(Number.isFinite(y)?y:parseFloat(action.style.top)||0,Math.max(0,window.innerHeight-height)));
  action.style.left=left+'px';action.style.top=top+'px';action.style.bottom='auto';action.style.right='auto';positionExtra();
 }
 function resizeButton(){if(action?.style.top)clampPosition();}
 function start(){
  active=true;if(run?.stage==='hospitalize'&&!run.hospitalization?.name){run.planHospitalize=false;run.stage='waiting';persist();}if(run?.destroyInventory&&!run.destroyItems?.length)disarm('Select and confirm destruction items, then arm again');if(!action){
   action=document.createElement('button');action.id='tu-snatch-run';action.type='button';action.style.cssText='position:fixed;bottom:12px;left:12px;max-width:calc(100vw - 24px);z-index:2147483643;color:#fff;border:2px solid;border-radius:8px;padding:12px 18px;font:bold 15px system-ui;opacity:1;cursor:grab;touch-action:none;user-select:none';
   action.setAttribute('aria-label','Snatch and Run action; drag to reposition');
   // Keep TU taps inside TU: Torn treats an outside tap as dismissal of its native confirmation.
   for(const type of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','dblclick'])action.addEventListener(type,event=>event.stopPropagation());
   action.onclick=event=>{event?.stopPropagation?.();if(now()<suppressClickUntil){event?.preventDefault?.();event?.stopPropagation?.();emit('click-blocked',{reason:'drag-release'});return false;}if(action.getAttribute('aria-disabled')==='true'){emit('click-blocked',{reason:'not-ready'});return false;}return act(event);};
   action.addEventListener('pointerdown',event=>{if(event.button!==0&&event.pointerType==='mouse')return;const rect=action.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};action.setPointerCapture?.(event.pointerId);});
   action.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const x=event.clientX-drag.x,y=event.clientY-drag.y;if(Math.hypot(x,y)>6)drag.moved=true;if(drag.moved){event.preventDefault();clampPosition(drag.left+x,drag.top+y);}});
   action.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;if(drag.moved){suppressClickUntil=now()+400;try{window.localStorage.setItem(positionKey,JSON.stringify({x:parseFloat(action.style.left),y:parseFloat(action.style.top)}));}catch{}emit('button-moved',{x:parseFloat(action.style.left),y:parseFloat(action.style.top)});}drag=null;});
   action.addEventListener('pointercancel',()=>{drag=null;suppressClickUntil=now()+400;});
   const warningStyle=document.createElement('style');warningStyle.textContent='@keyframes tu-hospital-warning{0%,49%{filter:brightness(1)}50%,100%{filter:brightness(.4)}}';document.head.append(warningStyle);warningStyle.id='tu-hospital-warning-style';
   extraHosp=document.createElement('button');extraHosp.id='tu-snatch-extra-hosp';extraHosp.type='button';extraHosp.style.cssText='position:fixed;z-index:2147483643;white-space:pre-line;background:#a82525;color:white;border:2px solid #ec8585;border-radius:8px;padding:10px 16px;font:bold 15px system-ui;max-width:calc(100vw - 24px)';extraHosp.onclick=event=>{event.stopPropagation();return extendHospital(event);};for(const type of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend'])extraHosp.addEventListener(type,event=>event.stopPropagation());document.body.append(extraHosp);
   document.body.append(action);hud=action;try{const position=JSON.parse(window.localStorage.getItem(positionKey)||'null');if(Number.isFinite(position?.x)&&Number.isFinite(position?.y))clampPosition(position.x,position.y);}catch{}window.addEventListener('resize',resizeButton);
  }refresh();if(run?.stage==='departure-choice')showDepartureChoice();if(run)scheduleStatus();
 }

 function update(){applyFilter();check();if(hud)hud.hidden=!run||run.stage==='complete';}
 return {start,syncCountdown(){if(active&&run&&!document.hidden)paintCountdown();},stop(){warningCancel?.();active=false;disarm('Tool exited; sequence canceled');restoreRows();hud?.remove();extraHosp?.remove();extraHosp=null;document.getElementById('tu-hospital-warning-style')?.remove();hospitalAudio?.stop?.();hud=null;action=null;drag=null;window.removeEventListener('resize',resizeButton);},mount,arm,act,extendHospital,stock,check,update,disarm,getState:()=>run?{...run}:null,applyFilter,restoreRows};
}
