// Shared source embedded only into the lazy Travel Assistant factory.
// No gameplay requests: actions delegate once to a visible, automatically matched native control.
export function createTravelEnhancements({document,window,getItems,getContext,getSnapshot,getRows,matchRow,getSetup=()=>({}),storeSetup=()=>{},screenAlertEnabled=()=>false,getFilterContainer=row=>row,onArmed=()=>{},executeAction=null,filterEnabled,onNotice,storeRun=()=>{},restoreRun=null,now=()=>Date.now()}) {
 const hiddenRows=new Map(),TTL=Number.MAX_SAFE_INTEGER,STOCK_TTL=30000;
 let run=restoreRun?{...restoreRun,expiresAt:Number.MAX_SAFE_INTEGER}:null,busy=false,active=false,hud=null,action=null,lastNotice='',statusTimer=null,statusAttempts=0,drag=null,suppressClickUntil=0,warningCancel=null;
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
 function screenAlert(s){let edge=document.getElementById('tu-snatch-screen-alert');if(!run||run.stage==='complete'||!screenAlertEnabled()){edge?.remove();return;}if(!edge){edge=document.createElement('div');edge.id='tu-snatch-screen-alert';edge.setAttribute('aria-hidden','true');edge.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483642;box-sizing:border-box;border:10px solid #d71920';const style=document.createElement('style');style.textContent='@keyframes tu-snatch-edge-flash{0%,49%{opacity:1}50%,100%{opacity:.15}}#tu-snatch-screen-alert[data-ready="true"]{border-color:#00ee4d!important;animation:tu-snatch-edge-flash .4s steps(1,end) infinite}';edge.append(style);document.body.append(edge);}const available=validRun(s)&&(run.stage==='return'||run.stage==='return-pending'||Number.isFinite(s.quantity)&&s.quantity>=Math.max(1,Number(run.minimumQty)||1)&&now()-run.stockAt<STOCK_TTL&&run.stage!=='waiting');if(edge.dataset.ready!==String(!!available))edge.dataset.ready=String(!!available);}
 const sameTrip=s=>run&&active&&run.expiresAt>now()&&String(s.ownerId)===run.ownerId&&s.country===run.country;
 const outbound=s=>sameTrip(s)&&s.traveling&&!s.returning&&s.hospitalized!==true;
 const validRun=s=>sameTrip(s)&&!s.traveling;
 function refresh(){
  if(!action)return;const hide=!run||run.stage==='complete';if(action.hidden!==hide)action.hidden=hide;const display=hide?'none':'block';if(action.style.display!==display)action.style.display=display;if(!run){document.getElementById('tu-snatch-screen-alert')?.remove();return;}
  const s=getSnapshot();screenAlert(s);const kind=run.stage,waiting=kind==='waiting',pending=kind.endsWith('-pending');
  const minimum=Math.max(1,Number(getItems().find(w=>w.key===run.watchKey)?.minQty)||1);
  const stockAvailable=kind==='hospitalize'?outbound(s)||Number.isFinite(s.quantity)&&s.quantity<minimum&&s.hospitalized===false:kind==='return'||(['buy','destroy'].includes(kind)?s.quantity>=minimum:!Number.isFinite(s.quantity)||s.quantity>=minimum);
  const ready=!!(stockAvailable&&(validRun(s)||kind==='hospitalize'&&outbound(s))&&focused()&&!busy&&!waiting&&!pending&&(kind!=='destroy'||s.hospitalized===false)&&['hospitalize','heal','destroy','buy','return'].includes(kind)&&(['return','hospitalize'].includes(kind)||now()-run.stockAt<(kind==='heal'?120000:STOCK_TTL)));
  const text=waiting?'Waiting for available stock':kind==='hospitalize'?'Hospitalize Me':pending?(kind==='hospitalize-pending'?'Confirming hospitalization':kind==='heal-pending'?'Confirming healing':kind==='buy-pending'?'Confirming purchase':kind==='destroy-pending'?'Destroying travel inventory':'Booking return flight'):kind==='complete'?'Return flight booked':kind==='destroy'?'Destroy Selected Items':kind==='buy'?'Purchase Max':kind==='heal'?'Heal from Hospital':'Return to Torn';
  if(action.textContent!==text){action.textContent=text;action.setAttribute('aria-label',text+'; drag to reposition');if(action.style.top)clampPosition();}action.dataset.snatchStage=kind;
  const state=ready?'ready':'waiting';if(action.dataset.state!==state){action.disabled=false;action.dataset.state=state;action.setAttribute('aria-disabled',String(!ready));action.style.backgroundColor=ready?'#167b35':'#b32424';action.style.borderColor=ready?'#66d584':'#ec8585';}
 }
 function disarm(reason='Snatch and Run canceled'){emit('cancel',{message:reason});clearStatusTimer();executeAction?.cancel();busy=false;run=null;persist();notice(reason);refresh();}
 async function arm({watchKey,hospital,medical=null,destroyInventory=false,destroyAccepted=false,destroyItems=[],planHospitalize=false,hospitalization=null}={}){
  if(!active||!focused())throw Error('Open Travel Assistant on the actively viewed foreign page');
  const watch=getItems().find(w=>w.key===watchKey&&w.category==='Foreign');if(!watch)throw Error('Select a monitored foreign item');
  const s=await getContext();
  if(!active||!focused())throw Error('Travel Assistant was closed or the page lost focus; arm again');
  if(!s.country||!s.ownerId||!['Abroad','Hospital','Traveling'].includes(s.status)||s.returning)throw Error('A confirmed foreign destination or current foreign location is required');
  if(s.status==='Hospital'&&!medical?.name)throw Error('Select a healing medical item before arming while hospitalized');
  const selectedItem=item=>!!item?.name&&(item.source==='travel-dom'||Number.isSafeInteger(Number(item.id))&&Number(item.id)>0);
  if(planHospitalize&&s.status!=='Hospital'&&!selectedItem(hospitalization))throw Error('Select the hospitalization item you intend to use');
  if((hospital||planHospitalize)&&!selectedItem(medical))throw Error('Select the medical item you intend to use');
  if(destroyInventory&&!destroyAccepted)throw Error('Accept the Inventory Destruction warning before arming');
  if(destroyInventory&&(!Array.isArray(destroyItems)||!destroyItems.length||destroyItems.some(item=>!item?.name)))throw Error('Confirm the inventory items selected for destruction');
  run={planHospitalize:!!planHospitalize,hospitalization,destroyItems:destroyItems.map(item=>({name:item.name,id:item.id??null})),destroyInventory:!!destroyInventory,destroyAccepted:!!destroyInventory&&!!destroyAccepted,destroyDone:false,intentId:window.crypto?.randomUUID?.()||String(now())+':'+Math.random(),ownerId:String(s.ownerId),country:s.country,watchKey,watchName:watch.name,minimumQty:Math.max(1,Number(watch.minQty)||1),hospital:!!hospital,medical,stage:'waiting',expiresAt:TTL,stockAt:0};
  if(planHospitalize&&s.status!=='Hospital')run.stage='hospitalize';const snapshot=getSnapshot();if(planHospitalize&&!s.traveling&&Number.isFinite(snapshot.quantity)&&snapshot.quantity>=run.minimumQty){run.stockAt=now();run.stage=snapshot.hospitalized?'heal':afterHeal();}
  watch.fired=false;clearStatusTimer();executeAction?.cancel();busy=false;persist();notice('Armed. Waiting for the selected item alarm.');refresh();emit('armed',{hospital:!!hospital});onArmed();return {...run};
 }
 function stock(w,s){
  if(!run||w.key!==run.watchKey||!validRun(s)||!focused()||!(s.quantity>0))return;
  run.stockAt=now();if(['waiting','hospitalize'].includes(run.stage)){run.stage=s.hospitalized===true?'heal':s.hospitalized===false?afterHeal():run.hospital?'heal':afterHeal();emit('stock-ready',{quantity:s.quantity});}persist();refresh();
 }
 function check(){
  if(!run)return;const s=getSnapshot();
  if(s.ownerId==null){refresh();return;}
  if(String(s.ownerId)!==run.ownerId){disarm('Player changed; arm again');return;}
  if(run.stage==='hospitalize'&&s.hospitalized===true){run.stage='waiting';persist();}
  if(['hospitalize','waiting'].includes(run.stage)&&Number.isFinite(s.quantity)&&s.quantity>=Math.max(1,Number(run.minimumQty)||1)&&validRun(s)&&focused()){run.stockAt=now();run.stage=s.hospitalized?'heal':afterHeal();persist();emit('stock-ready',{quantity:s.quantity});}
  if(run.stage==='hospitalize-pending'&&s.hospitalized===true){run.stage='waiting';persist();}
  if(run.stage==='heal'&&s.hospitalized===false){run.stage=afterHeal();persist();}
  if(['buy','destroy'].includes(run.stage)&&s.hospitalized===true){if(run.medical){run.stage='heal';persist();}else{notice('Hospitalized: restore Travel Assistant and select a healing item, then re-arm.');}}
  if(run.stage==='heal-pending'&&s.hospitalized===false){clearStatusTimer();run.stage=afterHeal();persist();notice(run.stage==='destroy'?'Hospital release confirmed. Destroy Selected Items is ready with fresh stock.':'Hospital release confirmed. Return to the monitored shop and verify fresh stock before buying.');}
  if(run.stage==='buy-pending'&&s.purchaseProof&&s.purchaseProof!==run.priorProof&&s.purchaseItemKey===run.watchKey){run.stage='return';run.purchaseConfirmed=true;persist();notice('Purchase confirmed. Return to Torn is ready.');}
  if(run.stage==='return-pending'&&s.traveling&&s.returning){clearStatusTimer();run.stage='complete';persist();notice('Return flight to Torn confirmed. Snatch and Run completed.');}
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
  const expected=run;busy=true;emit('action-start',{action:kind});run.priorProof=getSnapshot().purchaseProof||null;run.stage=kind+'-pending';persist();refresh();
  const guard=()=>run===expected&&active&&run.expiresAt>now()&&String(getSnapshot().ownerId)===run.ownerId&&getSnapshot().country===run.country;
  try{
   const result=await executeAction.execute(kind,{...options,run:expected,getSnapshot,guard,onEvent:fields=>emit('native-step',{action:kind,...fields})});if(run!==expected)return false;
   if(kind==='hospitalize'&&result.hospitalized){run.stage='waiting';const state=getSnapshot();if(Number.isFinite(state.quantity)&&state.quantity>=run.minimumQty){run.stockAt=now();run.stage='heal';}}
   if(kind==='heal'&&result.hospitalReleased)run.stage=afterHeal();
   if(kind==='destroy'&&result.inventoryDestroyed){run.destroyDone=true;run.stage='buy';}
   if(kind==='buy'&&result.purchaseConfirmed){run.stage='return';run.purchaseConfirmed=true;}
   if(kind==='return'&&result.returnBooked)run.stage='complete';
   persist();emit('action-result',{action:kind,result:'confirmed',amount:result.amount||null});notice(kind==='hospitalize'?'Hospitalization confirmed. Waiting for available stock.':kind==='heal'?(run.stage==='destroy'?'Hospital release confirmed. Destroy Selected Items is ready.':'Hospital release confirmed. Purchase Max is ready.'):kind==='destroy'?'Selected items destroyed. Purchase Max is ready.':kind==='buy'?'Purchase confirmed. Return to Torn is ready.':'Return flight booked.');return true;
  }catch(error){if(run===expected){if(!error.submitted)run.stage=kind;else{statusAttempts=0;scheduleStatus();}persist();emit('action-error',{action:kind,message:error.message,submitted:!!error.submitted});notice(error.message);}return false;}
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
  if(!event?.isTrusted||busy||!run)return false;
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
 function mount(parent){
  warningCancel?.();
  const setup=getSetup();if(!setup.destroyItems?.length){setup.destroyInventory=false;setup.destroyAccepted=false;}const section=document.createElement('section');section.id='tuim-snatch-setup';parent.append(section);
  const title=document.createElement('h3');title.textContent='Snatch and Run';section.append(title);
  const hint=document.createElement('p');hint.textContent='Arm to minimize this window. The red button waits for stock; green offers Heal from Hospital if needed, optional Destroy Selected Items, Purchase Max, then Return to Torn. Each action needs your click and its Torn page controls.';section.append(hint);
  const field=(label,control)=>{const wrap=document.createElement('label');wrap.textContent=label;wrap.style.cssText='display:block;margin:10px 0';control.style.cssText='display:block;width:100%;margin-top:4px';wrap.append(control);section.append(wrap);return wrap;};
  const watch=document.createElement('select');watch.setAttribute('aria-label','Snatch and Run monitored item');for(const w of getItems().filter(w=>w.category==='Foreign')){const o=document.createElement('option');o.value=w.key;o.textContent=w.name;watch.append(o);}field('Monitored foreign item',watch);if([...watch.options].some(o=>o.value===setup.watchKey))watch.value=setup.watchKey;
  const hospital=document.createElement('select');hospital.setAttribute('aria-label','Planning to Hospitalize?');for(const [value,label] of [['no','Planning to Hospitalize? No'],['yes','Planning to Hospitalize? Yes']]){const o=document.createElement('option');o.value=value;o.textContent=label;hospital.append(o);}field('Planning to Hospitalize?',hospital);hospital.value=setup.hospital?'yes':'no';
  const medical=document.createElement('select');medical.setAttribute('aria-label','Selected medical item');const medicalField=field('Healing item from your inventory',medical);const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Load medical inventory to select a healing item';medical.append(placeholder);if(setup.medical){const o=document.createElement('option');o.value=JSON.stringify(setup.medical);o.textContent=setup.medical.name+' (verify native availability)';medical.append(o);medical.value=o.value;}const saveSetup=()=>storeSetup({watchKey:watch.value,hospital:hospital.value==='yes',medical:medical.value?JSON.parse(medical.value):null,planHospitalize:hospital.value==='yes',hospitalization:hospitalization.value?JSON.parse(hospitalization.value):null,destroyItems:setup.destroyItems||[],destroyInventory:!!setup.destroyInventory,destroyAccepted:!!setup.destroyAccepted});watch.onchange=saveSetup;medical.onchange=saveSetup;
  const hospitalization=document.createElement('select');hospitalization.setAttribute('aria-label','Selected hospitalization item');const hospitalizationField=field('Hospitalization item from your inventory',hospitalization);const hospitalizationPlaceholder=document.createElement('option');hospitalizationPlaceholder.value='';hospitalizationPlaceholder.textContent='Load inventory to select a hospitalization item';hospitalization.append(hospitalizationPlaceholder);if(setup.hospitalization){const option=document.createElement('option');option.value=JSON.stringify(setup.hospitalization);option.textContent=setup.hospitalization.name;hospitalization.append(option);hospitalization.value=option.value;}hospitalization.onchange=saveSetup;
  const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;section.append(b);return b;};
  const load=add('Load inventory',async()=>{try{const s=await getContext({inventory:true});hospitalizationPlaceholder.textContent=s.inventorySource==='travel-dom'&&!s.inventoryItems?.length?'No items in current travel inventory':'Select a hospitalization item';hospitalization.replaceChildren(hospitalizationPlaceholder);for(const item of s.inventoryItems||[]){if(!(item.amount>0))continue;const option=document.createElement('option');option.value=JSON.stringify({id:item.id,uid:item.uid??null,name:item.name,source:item.source||'api'});option.textContent=item.name+' × '+item.amount;hospitalization.append(option);}if(setup.hospitalization){const match=[...hospitalization.options].find(o=>{try{return JSON.parse(o.value).name===setup.hospitalization.name}catch{return false}});if(match)hospitalization.value=match.value;else if(s.inventorySource!=='travel-dom'){const saved=document.createElement('option');saved.value=JSON.stringify(setup.hospitalization);saved.textContent=setup.hospitalization.name+' (saved; verify carried availability)';hospitalization.append(saved);hospitalization.value=saved.value;}}medical.replaceChildren();if(s.inventorySource==='travel-dom'&&s.medicalItems?.length){const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select a healing item';medical.append(placeholder);}for(const item of s.medicalItems||[]){if(!(item.amount>0))continue;const o=document.createElement('option');o.value=JSON.stringify({id:item.id,uid:item.uid??null,name:item.name,source:item.source||'api'});o.textContent=item.name+' × '+item.amount;medical.append(o);}if(!medical.options.length){const o=document.createElement('option');o.value='';o.textContent=s.inventorySource==='travel-dom'?'No items in current travel inventory':'No medical items available';medical.append(o);}if(setup.medical){const selected=[...medical.options].find(o=>{try{return JSON.parse(o.value).name===setup.medical.name}catch{return false}});if(selected)medical.value=selected.value;else if(s.inventorySource!=='travel-dom'){const saved=document.createElement('option');saved.value=JSON.stringify(setup.medical);saved.textContent=setup.medical.name+' (saved; verify carried availability)';medical.append(saved);medical.value=saved.value;}}saveSetup();notice(s.inventorySource==='travel-dom'?'Loaded current carried travel items from this Torn page. Choose the correct item for each action.':'Loaded medical API inventory; it may be cached. Open the foreign inventory to load all currently carried item types.');}catch(error){notice(error.message);}});
  const destroyWrap=document.createElement('label');destroyWrap.style.cssText='display:flex;align-items:center;gap:8px;margin:12px 0';const destruction=document.createElement('input');destruction.type='checkbox';destruction.id='tuim-inventory-destruction';destruction.checked=!!setup.destroyInventory&&!!setup.destroyAccepted&&!!setup.destroyItems?.length;destruction.style.cssText='width:18px;height:18px;min-height:18px;flex:none';destroyWrap.append(destruction,document.createTextNode('Inventory Destruction'));section.append(destroyWrap);const destroySummary=document.createElement('p');destroySummary.textContent='Selected for destruction: '+(setup.destroyItems?.map(item=>item.name).join(', ')||'None');section.append(destroySummary);
  destruction.onchange=()=>{if(!destruction.checked){setup.destroyInventory=false;setup.destroyAccepted=false;saveSetup();if(run?.destroyInventory)disarm('Inventory Destruction disabled; arm again');return;}destruction.checked=false;const overlay=document.createElement('div');overlay.id='tuim-destruction-warning';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Inventory Destruction warning');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#8b0000f5;color:white;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box';const body=document.createElement('div');body.style.cssText='max-width:700px;max-height:calc(100dvh - 48px);overflow:auto;font:bold 22px/1.5 system-ui';body.textContent="Warning: By activating Snatch and Run Inventory Destruction, the inventory items you select will be permanently destroyed at your demand when Destroy Selected Items is pressed.";const detail=document.createElement('p');detail.style.fontSize='16px';detail.textContent='Only the selected item types carried in foreign travel inventory are destroyed, after healing if needed. Item destruction is permanent. The button will display Destroy Selected Items before Purchase Max.';body.append(detail);overlay.append(body);document.body.append(overlay);const chosen=new Set();let loaded=false;const selection=document.createElement('div');selection.style.cssText='font:16px system-ui;max-height:240px;overflow:auto;background:#4d0000;padding:12px';selection.textContent='Reading current travel inventory… Select the items to destroy when the list appears.';body.append(selection);const loadSelection=document.createElement('button');loadSelection.type='button';loadSelection.textContent='Retry inventory loading';loadSelection.hidden=true;body.append(loadSelection);loadSelection.onclick=async()=>{loadSelection.disabled=true;loadSelection.hidden=true;loaded=false;chosen.clear();try{const data=await getContext({inventory:true});if(!overlay.isConnected)return;selection.replaceChildren();const items=data.inventoryItems||[];for(const item of items.filter(item=>item.amount>0)){const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:center;margin:8px';const box=document.createElement('input');box.type='checkbox';box.style.cssText='width:22px;height:22px';box.onchange=()=>{if(box.checked)chosen.add(item);else chosen.delete(item);};label.append(box,document.createTextNode(item.name+' — all carried copies'));selection.append(label);}loaded=true;if(!items.some(item=>item.amount>0))selection.textContent='No inventory items are available to select.';}catch(error){if(overlay.isConnected){selection.textContent=error.message;loadSelection.hidden=false;}}finally{loadSelection.disabled=false;}};const finish=accepted=>{if(accepted&&(!loaded||!chosen.size)){selection.append(document.createTextNode(' Select at least one item before accepting.'));return;}if(accepted)setup.destroyItems=[...chosen].map(item=>({id:item.id,name:item.name}));else setup.destroyItems=[];warningCancel=null;destroySummary.textContent='Selected for destruction: '+(setup.destroyItems?.map(item=>item.name).join(', ')||'None');setup.destroyInventory=accepted;setup.destroyAccepted=accepted;destruction.checked=accepted;saveSetup();overlay.remove();document.removeEventListener('keydown',escape);if(run)disarm('Inventory Destruction setting changed; arm again');destruction.focus();};const escape=event=>{if(event.key==='Escape')finish(false);if(event.key==='Tab'){const controls=[...body.querySelectorAll('button,input')].filter(control=>!control.disabled);if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}}};warningCancel=()=>finish(false);document.addEventListener('keydown',escape);for(const [label,value] of [['Accept',true],['Decline',false]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='font:bold 20px system-ui;padding:12px 24px;margin:8px;color:#111;background:white';button.onclick=()=>finish(value);body.append(button);}body.querySelector('button:last-child').focus();void loadSelection.onclick();};
  add('Arm Snatch and Run',async()=>{try{await arm({watchKey:watch.value,hospital:hospital.value==='yes',medical:medical.value?JSON.parse(medical.value):null,planHospitalize:hospital.value==='yes',hospitalization:hospitalization.value?JSON.parse(hospitalization.value):null,destroyItems:setup.destroyItems||[],destroyInventory:destruction.checked,destroyAccepted:!!setup.destroyAccepted,destroyItems:setup.destroyItems||[],planHospitalize:hospital.value==='yes',hospitalization:hospitalization.value?JSON.parse(hospitalization.value):null});}catch(error){notice(error.message);}});
  const hospitalChanged=()=>{saveSetup();hospitalizationField.hidden=hospital.value!=='yes';hospitalizationField.style.display=hospitalizationField.hidden?'none':'block';medicalField.hidden=hospital.value!=='yes'&&getSnapshot().hospitalized!==true;medicalField.style.display=medicalField.hidden?'none':'block';load.hidden=medicalField.hidden;load.style.display=load.hidden?'none':'';};hospital.onchange=hospitalChanged;hospitalChanged();
  add('Cancel Snatch and Run',()=>disarm());
 }
 const positionKey='tu:snatch-run:position:v1';
 function clampPosition(x,y){
  if(!action)return;const rect=action.getBoundingClientRect(),width=Math.max(120,rect.width||160),height=Math.max(40,rect.height||48);
  const left=Math.max(0,Math.min(Number.isFinite(x)?x:parseFloat(action.style.left)||0,Math.max(0,window.innerWidth-width)));
  const top=Math.max(0,Math.min(Number.isFinite(y)?y:parseFloat(action.style.top)||0,Math.max(0,window.innerHeight-height)));
  action.style.left=left+'px';action.style.top=top+'px';action.style.bottom='auto';action.style.right='auto';
 }
 function resizeButton(){if(action?.style.top)clampPosition();}
 function start(){
  active=true;if(run?.destroyInventory&&!run.destroyItems?.length)disarm('Select and confirm destruction items, then arm again');if(!action){
   action=document.createElement('button');action.id='tu-snatch-run';action.type='button';action.style.cssText='position:fixed;bottom:12px;left:12px;max-width:calc(100vw - 24px);z-index:2147483643;color:#fff;border:2px solid;border-radius:8px;padding:12px 18px;font:bold 15px system-ui;opacity:1;cursor:grab;touch-action:none;user-select:none';
   action.setAttribute('aria-label','Snatch and Run action; drag to reposition');
   // Keep TU taps inside TU: Torn treats an outside tap as dismissal of its native confirmation.
   for(const type of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','dblclick'])action.addEventListener(type,event=>event.stopPropagation());
   action.onclick=event=>{event?.stopPropagation?.();if(now()<suppressClickUntil){event?.preventDefault?.();event?.stopPropagation?.();emit('click-blocked',{reason:'drag-release'});return false;}if(action.getAttribute('aria-disabled')==='true'){emit('click-blocked',{reason:'not-ready'});return false;}return act(event);};
   action.addEventListener('pointerdown',event=>{if(event.button!==0&&event.pointerType==='mouse')return;const rect=action.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};action.setPointerCapture?.(event.pointerId);});
   action.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const x=event.clientX-drag.x,y=event.clientY-drag.y;if(Math.hypot(x,y)>6)drag.moved=true;if(drag.moved){event.preventDefault();clampPosition(drag.left+x,drag.top+y);}});
   action.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;if(drag.moved){suppressClickUntil=now()+400;try{window.localStorage.setItem(positionKey,JSON.stringify({x:parseFloat(action.style.left),y:parseFloat(action.style.top)}));}catch{}emit('button-moved',{x:parseFloat(action.style.left),y:parseFloat(action.style.top)});}drag=null;});
   action.addEventListener('pointercancel',()=>{drag=null;suppressClickUntil=now()+400;});
   document.body.append(action);hud=action;try{const position=JSON.parse(window.localStorage.getItem(positionKey)||'null');if(Number.isFinite(position?.x)&&Number.isFinite(position?.y))clampPosition(position.x,position.y);}catch{}window.addEventListener('resize',resizeButton);
  }refresh();if(run)scheduleStatus();
 }

 function update(){applyFilter();check();if(hud)hud.hidden=!run||run.stage==='complete';}
 return {start,stop(){warningCancel?.();active=false;disarm('Tool exited; sequence canceled');restoreRows();hud?.remove();hud=null;action=null;drag=null;window.removeEventListener('resize',resizeButton);},mount,arm,act,stock,check,update,disarm,getState:()=>run?{...run}:null,applyFilter,restoreRows};
}
