// Shared source embedded only into the lazy Travel Assistant factory.
// No gameplay requests: actions delegate once to a visible, user-bound native control.
export function createTravelEnhancements({document,window,getItems,getContext,getSnapshot,getRows,matchRow,saveFilter,filterEnabled,onNotice,storeRun=()=>{},restoreRun=null,now=()=>Date.now()}) {
 const hiddenRows=new Set(),bindings={},TTL=15*60*1000,STOCK_TTL=30000;
 let run=restoreRun&&restoreRun.expiresAt>now()?restoreRun:null,busy=false,active=false,picker=null,pickerEscape=null,hud=null,action=null,message=null,lastNotice='';
 const persist=()=>storeRun(run?{...run}:null);
 const focused=()=>!document.hidden&&document.hasFocus();
 const visible=e=>!!e?.isConnected&&!e.hidden&&e.getClientRects().length>0&&!e.closest('#tuim-panel,#tuim-travel-window,#tuim-catalog,#tu-pda-panel,#tu-snatch-run');
 const notice=value=>{lastNotice=value;if(message)message.textContent=value;onNotice?.(value);};
 const label=e=>(e.getAttribute('aria-label')||e.textContent||e.value||'').trim().replace(/\s+/g,' ').slice(0,120);
 function restoreRows(){for(const e of hiddenRows){e.classList.remove('tu-monitor-filter-hidden');delete e.dataset.tuMonitorFiltered;}hiddenRows.clear();}
 function applyFilter(){
  if(!active||!filterEnabled()||!getItems().length){restoreRows();return;}
  const rows=getRows();const current=new Set(rows);
  for(const e of hiddenRows)if(!e.isConnected||!current.has(e)){e.classList.remove('tu-monitor-filter-hidden');delete e.dataset.tuMonitorFiltered;hiddenRows.delete(e);}
  for(const row of rows){const hide=!getItems().some(w=>matchRow(row,w));if(hide&&!hiddenRows.has(row)){row.classList.add('tu-monitor-filter-hidden');row.dataset.tuMonitorFiltered='1';hiddenRows.add(row);}else if(!hide&&hiddenRows.has(row)){row.classList.remove('tu-monitor-filter-hidden');delete row.dataset.tuMonitorFiltered;hiddenRows.delete(row);}}
 }
 function clearPicker(){if(picker)document.removeEventListener('click',picker,true);if(pickerEscape)document.removeEventListener('keydown',pickerEscape,true);picker=null;pickerEscape=null;}
 function bind(kind,element){
  if(!['heal','buy','return'].includes(kind)||!visible(element)||!element.matches('button,a,input[type=submit],input[type=button],[role=button]'))throw Error('Select a visible native Torn action control');
  // Keep references only for this document. Do not save session URLs, tokens or arbitrary selectors.
  bindings[kind]={element,label:label(element)};notice(kind+' control selected: '+bindings[kind].label);refresh();
 }
 function pick(kind){clearPicker();notice('Select the actual Torn '+kind+' control. This selection click will NOT execute it. Escape cancels.');picker=e=>{if(!e.isTrusted||e.target.closest('#tu-snatch-run,#tuim-panel'))return;const control=e.target.closest('button,a,input[type=submit],input[type=button],[role=button]');if(!control)return;e.preventDefault();e.stopImmediatePropagation();try{bind(kind,control);clearPicker();}catch(error){notice(error.message);}};document.addEventListener('click',picker,true);pickerEscape=e=>{if(e.key==='Escape'){clearPicker();notice('Control selection canceled');}};document.addEventListener('keydown',pickerEscape,true);}
 const validRun=s=>run&&active&&run.expiresAt>now()&&String(s.ownerId)===run.ownerId&&s.country===run.country&&!s.traveling;
 function refresh(){
  if(!hud)return;const s=getSnapshot(),kind=run?.stage;
  const waiting=kind==='waiting',pending=kind?.endsWith('-pending');const control=bindings[kind]?.element;
  const ready=validRun(s)&&focused()&&!busy&&!waiting&&!pending&&(kind==='return'||now()-run.stockAt<(kind==='heal'?120000:STOCK_TTL))&&visible(control)&&!control.disabled&&control.getAttribute('aria-disabled')!=='true';
  const text=!run?'Snatch and Run: off':waiting?'Waiting for monitored stock':pending?'Waiting for Torn confirmation':kind==='complete'?'Return flight confirmed':kind==='buy'?'Buy monitored item (Max)':kind==='heal'?'Use selected healing item':'Return to Torn';
  if(action.textContent!==text)action.textContent=text;if(action.disabled!==!ready)action.disabled=!ready;
 }
 function disarm(reason='Snatch and Run canceled'){run=null;persist();clearPicker();notice(reason);refresh();}
 async function arm({watchKey,hospital,medical=null}={}){
  if(!active||!focused())throw Error('Open Travel Assistant on the actively viewed foreign page');
  const watch=getItems().find(w=>w.key===watchKey&&w.category==='Foreign');if(!watch)throw Error('Select a monitored foreign item');
  const s=await getContext();
  if(!s.country||s.traveling||!s.ownerId||!['Abroad','Hospital'].includes(s.status))throw Error('A confirmed foreign location and non-flying status are required');
  if((s.status==='Hospital')!==!!hospital)throw Error('Hospital answer does not match the verified status; refresh and try again');
  if(hospital&&(!medical?.name||!Number.isSafeInteger(Number(medical.id))||Number(medical.id)<1))throw Error('Select the medical item you intend to use; its native Use control must also be bound');
  run={ownerId:String(s.ownerId),country:s.country,watchKey,watchName:watch.name,hospital:!!hospital,medical,stage:'waiting',expiresAt:now()+TTL,stockAt:0};
  watch.fired=false;persist();if(hud)hud.hidden=false;notice('Armed. Waiting for the selected monitor alarm. Actions require visible bound Torn controls; native confirmations stay manual.');refresh();return {...run};
 }
 function stock(w,s){
  if(!run||w.key!==run.watchKey||!validRun(s)||!focused()||!(s.quantity>0))return;
  run.stockAt=now();if(run.stage==='waiting')run.stage=run.hospital?'heal':'buy';persist();refresh();
 }
 function check(){
  if(!run)return;const s=getSnapshot();
  if(run.expiresAt<=now()||String(s.ownerId)!==run.ownerId){disarm('Session expired or player changed; arm again');return;}
  if(run.stage==='heal-pending'&&s.hospitalized===false){run.stage='buy';persist();notice('Hospital release confirmed. Return to the monitored shop and verify fresh stock before buying.');}
  if(run.stage==='buy-pending'&&s.purchaseProof&&s.purchaseProof!==run.priorProof&&s.purchaseItemKey===run.watchKey){run.stage='return';run.purchaseConfirmed=true;persist();notice('Purchase confirmed. Select the visible native return-to-Torn control.');}
  if(run.stage==='return-pending'&&s.traveling&&s.returning){run.stage='complete';persist();notice('Return flight to Torn confirmed. Snatch and Run completed.');}
  refresh();
 }
 function nativeControl(kind,s){
  const e=bindings[kind]?.element;if(!visible(e)||e.disabled||e.getAttribute('aria-disabled')==='true')throw Error('The selected '+kind+' control is no longer visible/enabled. Open its native Torn page and bind it again.');
  if(kind==='heal'){
   if(!s.hospitalized)throw Error('Hospital status must be confirmed before using a medical item');
   if(!run.medical||!s.medicalMatches?.(e,run.medical))throw Error('The visible control does not match the selected medical item');
  }
  if(kind==='buy'){
   if(s.hospitalized!==false)throw Error('Confirm hospital release before buying');
   if(!(s.quantity>0)||!s.buyMatches?.(e,run.watchKey))throw Error('Reconfirm fresh stock and bind Buy for the monitored item');
   const input=s.quantityInput;let max=s.maxQuantity,verified=s.maxVerified;
   if(input&&visible(s.maxControl)){s.maxControl.click();max=Number(input.value);verified=Number.isSafeInteger(max)&&max>0&&max<=s.quantity;}
   if(!input||!Number.isSafeInteger(max)||max<1||!verified)throw Error('Torn has not exposed a verified maximum quantity. Set Max manually and retry.');
   const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;if(!setter)throw Error('Quantity input is not supported');
   setter.call(input,String(max));input.dispatchEvent(new window.Event('input',{bubbles:true}));input.dispatchEvent(new window.Event('change',{bubbles:true}));if(!visible(e))throw Error('Torn refreshed the purchase controls; select Buy again');
  }
  if(kind==='return'&&(!s.returnMatches?.(e)||!run.purchaseConfirmed))throw Error('Confirm purchase and bind the native Return to Torn action');
  return e;
 }
 function act(event){
  if(!event?.isTrusted||busy||!run)return false;
  const s=getSnapshot(),kind=run.stage;
  if(!validRun(s)||!focused()||(kind!=='return'&&now()-run.stockAt>=(kind==='heal'?120000:STOCK_TTL))||!['heal','buy','return'].includes(kind)){notice('Refresh visible state/stock, or re-arm before acting');refresh();return false;}
  busy=true;
  try{const e=nativeControl(kind,s);run.priorProof=s.purchaseProof||null;run.stage=kind+'-pending';if(kind==='return')run.stockAt=now();persist();e.click();notice('Action sent to Torn. Complete any native confirmation; the next action waits for observed success.');return true;}
  catch(error){notice(error.message);return false;}finally{busy=false;refresh();}
 }
 function mount(parent){
  const section=document.createElement('section');section.id='tuim-snatch-setup';parent.append(section);
  const title=document.createElement('h3');title.textContent='Snatch and Run';section.append(title);
  const hint=document.createElement('p');hint.textContent='Opt-in, user-clicked actions only. Bind the actual visible Torn controls; extra navigation/confirmations may be required. Medical inventory needs a Limited login key.';section.append(hint);
  const watch=document.createElement('select');watch.setAttribute('aria-label','Snatch and Run monitored item');for(const w of getItems().filter(w=>w.category==='Foreign')){const o=document.createElement('option');o.value=w.key;o.textContent=w.name;watch.append(o);}section.append(watch);
  const hospital=document.createElement('select');hospital.setAttribute('aria-label','Are you hospitalized?');for(const [value,label] of [['no','Are you hospitalized? No'],['yes','Are you hospitalized? Yes']]){const o=document.createElement('option');o.value=value;o.textContent=label;hospital.append(o);}section.append(hospital);
  const medical=document.createElement('select');medical.setAttribute('aria-label','Selected medical item');section.append(medical);
  const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;section.append(b);return b;};
  add('Load medical inventory',async()=>{try{const s=await getContext({inventory:true});medical.replaceChildren();for(const item of s.medicalItems||[]){if(!(item.amount>0))continue;const o=document.createElement('option');o.value=JSON.stringify({id:item.id,uid:item.uid??null,name:item.name});o.textContent=item.name+' × '+item.amount;medical.append(o);}notice('Inventory may be cached by Torn for 15 minutes. Actual native availability must still be checked.');}catch(error){notice(error.message);}});
  add('Arm Snatch and Run',async()=>{try{await arm({watchKey:watch.value,hospital:hospital.value==='yes',medical:medical.value?JSON.parse(medical.value):null});}catch(error){notice(error.message);}});
  for(const kind of ['heal','buy','return'])add('Select native '+kind+' control',()=>pick(kind));
  add('Cancel Snatch and Run',()=>disarm());
 }
 function start(){active=true;if(!hud){hud=document.createElement('aside');hud.id='tu-snatch-run';hud.style.cssText='position:fixed;bottom:8px;left:8px;max-width:calc(100vw - 16px);z-index:2147483643;background:#152127;color:#fff;border:1px solid #cba953;border-radius:8px;padding:8px;font:12px system-ui';action=document.createElement('button');action.onclick=act;hud.append(action);const checkButton=document.createElement('button');checkButton.textContent='Check result / refresh status';checkButton.onclick=async()=>{try{await getContext();check();}catch(error){notice(error.message);}};hud.append(checkButton);const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>disarm();hud.append(cancel);message=document.createElement('p');message.textContent=lastNotice;hud.append(message);document.body.append(hud);}hud.hidden=!run;refresh();}
 function update(){applyFilter();check();if(hud)hud.hidden=!run;}
 return {start,stop(){active=false;disarm('Tool exited; sequence canceled');restoreRows();hud?.remove();hud=null;clearPicker();},mount,arm,bind,pick,act,stock,check,update,disarm,getState:()=>run?{...run}:null,applyFilter,restoreRows};
}
