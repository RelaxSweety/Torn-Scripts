// Shared source embedded only into the lazy Travel Assistant factory.
// No gameplay requests: actions delegate once to a visible, automatically matched native control.
export function createTravelEnhancements({document,window,getItems,getContext,getSnapshot,getRows,matchRow,getFilterContainer=row=>row,onArmed=()=>{},executeAction=null,filterEnabled,onNotice,storeRun=()=>{},restoreRun=null,now=()=>Date.now()}) {
 const hiddenRows=new Map(),TTL=15*60*1000,STOCK_TTL=30000;
 let run=restoreRun&&restoreRun.expiresAt>now()?restoreRun:null,busy=false,active=false,hud=null,action=null,lastNotice='',statusTimer=null,statusAttempts=0;
 const persist=()=>storeRun(run?{...run}:null);
 const focused=()=>!document.hidden&&document.hasFocus();
 const visible=e=>!!e?.isConnected&&!e.hidden&&e.getClientRects().length>0&&!e.closest('#tuim-panel,#tuim-travel-window,#tuim-catalog,#tu-pda-panel,#tu-snatch-run');
 const notice=value=>{lastNotice=value;if(action)action.title=value;onNotice?.(value);};
 function showRow(row){const target=hiddenRows.get(row);for(const e of new Set([row,target]))if(e){e.classList.remove('tu-monitor-filter-hidden');delete e.dataset.tuMonitorFiltered;}hiddenRows.delete(row);}
 function restoreRows(){for(const row of [...hiddenRows.keys()])showRow(row);}
 function applyFilter(){
  if(!active||!filterEnabled()||!getItems().length){restoreRows();return;}
  const rows=getRows(),current=new Set(rows);
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
  clearStatusTimer();if(!run||!['heal-pending','return-pending'].includes(run.stage)||statusAttempts>=3)return;
  const expected=run;statusTimer=window.setTimeout(async()=>{statusTimer=null;if(run!==expected||!active)return;
   if(!focused())return;
   statusAttempts++;try{await getContext();if(run===expected)check();}catch(error){notice(error.message);}
   if(run===expected)scheduleStatus();
  },[1200,4000,10000][statusAttempts]);
 }
 const validRun=s=>run&&active&&run.expiresAt>now()&&String(s.ownerId)===run.ownerId&&s.country===run.country&&!s.traveling;
 function refresh(){
  if(!action)return;if(action.hidden!==!run)action.hidden=!run;const display=run?'block':'none';if(action.style.display!==display)action.style.display=display;if(!run)return;
  const s=getSnapshot(),kind=run.stage,waiting=kind==='waiting',pending=kind.endsWith('-pending');
  const minimum=Math.max(1,Number(getItems().find(w=>w.key===run.watchKey)?.minQty)||1);
  const stockAvailable=kind==='return'||(kind==='buy'?s.quantity>=minimum:!Number.isFinite(s.quantity)||s.quantity>=minimum);
  const ready=!!(stockAvailable&&validRun(s)&&focused()&&!busy&&!waiting&&!pending&&['heal','buy','return'].includes(kind)&&(kind==='return'||now()-run.stockAt<(kind==='heal'?120000:STOCK_TTL)));
  const text=waiting?'Snatch and Run':pending?'Waiting for confirmation':kind==='complete'?'Return flight booked':kind==='buy'?'Purchase Max':kind==='heal'?'Heal from Hospital':'Return to Torn';
  if(action.textContent!==text)action.textContent=text;
  const state=ready?'ready':'waiting';if(action.dataset.state!==state){action.disabled=!ready;action.dataset.state=state;action.setAttribute('aria-disabled',String(!ready));action.style.backgroundColor=ready?'#167b35':'#b32424';action.style.borderColor=ready?'#66d584':'#ec8585';}
 }
 function disarm(reason='Snatch and Run canceled'){clearStatusTimer();executeAction?.cancel();busy=false;run=null;persist();notice(reason);refresh();}
 async function arm({watchKey,hospital,medical=null}={}){
  if(!active||!focused())throw Error('Open Travel Assistant on the actively viewed foreign page');
  const watch=getItems().find(w=>w.key===watchKey&&w.category==='Foreign');if(!watch)throw Error('Select a monitored foreign item');
  const s=await getContext();
  if(!active||!focused())throw Error('Travel Assistant was closed or the page lost focus; arm again');
  if(!s.country||s.traveling||!s.ownerId||!['Abroad','Hospital'].includes(s.status))throw Error('A confirmed foreign location and non-flying status are required');
  if((s.status==='Hospital')!==!!hospital)throw Error('Hospital answer does not match the verified status; refresh and try again');
  if(hospital&&(!medical?.name||!Number.isSafeInteger(Number(medical.id))||Number(medical.id)<1))throw Error('Select the medical item you intend to use');
  run={ownerId:String(s.ownerId),country:s.country,watchKey,watchName:watch.name,minimumQty:Math.max(1,Number(watch.minQty)||1),hospital:!!hospital,medical,stage:'waiting',expiresAt:now()+TTL,stockAt:0};
  watch.fired=false;clearStatusTimer();executeAction?.cancel();busy=false;persist();notice('Armed. Waiting for the selected item alarm.');refresh();onArmed();return {...run};
 }
 function stock(w,s){
  if(!run||w.key!==run.watchKey||!validRun(s)||!focused()||!(s.quantity>0))return;
  run.stockAt=now();if(run.stage==='waiting')run.stage=s.hospitalized===true?'heal':s.hospitalized===false?'buy':run.hospital?'heal':'buy';persist();refresh();
 }
 function check(){
  if(!run)return;const s=getSnapshot();
  if(run.expiresAt<=now()||String(s.ownerId)!==run.ownerId){disarm('Session expired or player changed; arm again');return;}
  if(run.stage==='heal'&&s.hospitalized===false){run.stage='buy';persist();}
  if(run.stage==='buy'&&s.hospitalized===true){if(run.medical){run.stage='heal';persist();}else{notice('Hospitalized: restore Travel Assistant and select a healing item, then re-arm.');}}
  if(run.stage==='heal-pending'&&s.hospitalized===false){clearStatusTimer();run.stage='buy';persist();notice('Hospital release confirmed. Return to the monitored shop and verify fresh stock before buying.');}
  if(run.stage==='buy-pending'&&s.purchaseProof&&s.purchaseProof!==run.priorProof&&s.purchaseItemKey===run.watchKey){run.stage='return';run.purchaseConfirmed=true;persist();notice('Purchase confirmed. Return to Torn is ready.');}
  if(run.stage==='return-pending'&&s.traveling&&s.returning){clearStatusTimer();run.stage='complete';persist();notice('Return flight to Torn confirmed. Snatch and Run completed.');}
  refresh();
 }
 function nativeControl(kind,s){
  const e=findControl(kind,s);if(!e)throw Error('Open Torn’s '+(kind==='heal'?'inventory for the selected healing item':kind==='buy'?'shop for the monitored item':'return travel page')+'. A unique visible '+kind+' action is required; no action was sent.');
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
 async function desktopAct(kind){
  const expected=run;busy=true;run.priorProof=getSnapshot().purchaseProof||null;run.stage=kind+'-pending';persist();refresh();
  const guard=()=>run===expected&&active&&run.expiresAt>now()&&String(getSnapshot().ownerId)===run.ownerId&&getSnapshot().country===run.country;
  try{
   const result=await executeAction.execute(kind,{run:expected,getSnapshot,guard});if(run!==expected)return false;
   if(kind==='heal'&&result.hospitalReleased)run.stage='buy';
   if(kind==='buy'&&result.purchaseConfirmed){run.stage='return';run.purchaseConfirmed=true;}
   if(kind==='return'&&result.returnBooked)run.stage='complete';
   persist();notice(kind==='heal'?'Hospital release confirmed. Purchase Max is ready.':kind==='buy'?'Purchase confirmed. Return to Torn is ready.':'Return flight booked.');return true;
  }catch(error){if(run===expected){if(!error.submitted)run.stage=kind;else{statusAttempts=0;scheduleStatus();}persist();notice(error.message);}return false;}
  finally{if(run===expected){busy=false;refresh();}}
 }
 function act(event){
  if(!event?.isTrusted||busy||!run)return false;
  const s=getSnapshot(),kind=run.stage;
  if(!validRun(s)||!focused()||(kind!=='return'&&Number.isFinite(s.quantity)&&s.quantity<Math.max(1,Number(run.minimumQty)||1))||(kind!=='return'&&now()-run.stockAt>=(kind==='heal'?120000:STOCK_TTL))||!['heal','buy','return'].includes(kind)){notice('Refresh visible state/stock, or re-arm before acting');refresh();return false;}
  if(executeAction?.enabled())return desktopAct(kind);
  busy=true;
  try{const e=nativeControl(kind,s);run.priorProof=s.purchaseProof||null;run.stage=kind+'-pending';if(kind==='return')run.stockAt=now();persist();e.click();notice('Action sent to Torn. Complete any native confirmation; the next action waits for observed success.');statusAttempts=0;scheduleStatus();return true;}
  catch(error){notice(error.message);return false;}finally{busy=false;refresh();}
 }
 function mount(parent){
  const section=document.createElement('section');section.id='tuim-snatch-setup';parent.append(section);
  const title=document.createElement('h3');title.textContent='Snatch and Run';section.append(title);
  const hint=document.createElement('p');hint.textContent='Arm to minimize this window. The red button waits for stock; green offers Heal from Hospital, Purchase Max, then Return to Torn. Each action needs your click and its Torn page controls.';section.append(hint);
  const field=(label,control)=>{const wrap=document.createElement('label');wrap.textContent=label;wrap.style.cssText='display:block;margin:10px 0';control.style.cssText='display:block;width:100%;margin-top:4px';wrap.append(control);section.append(wrap);return wrap;};
  const watch=document.createElement('select');watch.setAttribute('aria-label','Snatch and Run monitored item');for(const w of getItems().filter(w=>w.category==='Foreign')){const o=document.createElement('option');o.value=w.key;o.textContent=w.name;watch.append(o);}field('Monitored foreign item',watch);
  const hospital=document.createElement('select');hospital.setAttribute('aria-label','Are you hospitalized?');for(const [value,label] of [['no','Are you hospitalized? No'],['yes','Are you hospitalized? Yes']]){const o=document.createElement('option');o.value=value;o.textContent=label;hospital.append(o);}field('Are you hospitalized?',hospital);
  const medical=document.createElement('select');medical.setAttribute('aria-label','Selected medical item');const medicalField=field('Healing item from your inventory',medical);const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Load medical inventory to select a healing item';medical.append(placeholder);
  const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;section.append(b);return b;};
  const load=add('Load medical inventory',async()=>{try{const s=await getContext({inventory:true});medical.replaceChildren();for(const item of s.medicalItems||[]){if(!(item.amount>0))continue;const o=document.createElement('option');o.value=JSON.stringify({id:item.id,uid:item.uid??null,name:item.name});o.textContent=item.name+' × '+item.amount;medical.append(o);}if(!medical.options.length){const o=document.createElement('option');o.value='';o.textContent='No medical items available';medical.append(o);}notice('Inventory may be cached by Torn for 15 minutes. Actual native availability must still be checked.');}catch(error){notice(error.message);}});
  add('Arm Snatch and Run',async()=>{try{await arm({watchKey:watch.value,hospital:hospital.value==='yes',medical:medical.value?JSON.parse(medical.value):null});}catch(error){notice(error.message);}});
  const hospitalChanged=()=>{medicalField.hidden=hospital.value!=='yes';medicalField.style.display=medicalField.hidden?'none':'block';load.hidden=medicalField.hidden;load.style.display=load.hidden?'none':'';};hospital.onchange=hospitalChanged;hospitalChanged();
  add('Cancel Snatch and Run',()=>disarm());
 }
 function start(){active=true;if(!action){action=document.createElement('button');action.id='tu-snatch-run';action.type='button';action.style.cssText='position:fixed;bottom:12px;left:12px;max-width:calc(100vw - 24px);z-index:2147483643;color:#fff;border:2px solid;border-radius:8px;padding:12px 18px;font:bold 15px system-ui;opacity:1;cursor:pointer';action.onclick=act;document.body.append(action);hud=action;}refresh();if(run)scheduleStatus();}

 function update(){applyFilter();check();if(hud&&hud.hidden!==!run)hud.hidden=!run;}
 return {start,stop(){active=false;disarm('Tool exited; sequence canceled');restoreRows();hud?.remove();hud=null;action=null;},mount,arm,act,stock,check,update,disarm,getState:()=>run?{...run}:null,applyFilter,restoreRows};
}
