// Captured desktop and PDA Torn travel UI. One trusted TU action may expand its native
// controls and confirm that same item/action; it never starts the next TU stage.
export function createNativeTravelActions({document,window,enabled=()=>false,now=()=>Date.now()}){
 const norm=v=>String(v||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
 const label=e=>norm(e?.getAttribute('aria-label')||e?.textContent||e?.value);
 const shown=e=>!!e?.isConnected&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&e.getClientRects().length>0&&window.getComputedStyle(e).visibility!=='hidden'&&!e.closest('#tuim-panel,#tu-snatch-run,#tu-pda-panel');
 const one=(list,description)=>{const items=[...list].filter(shown);if(items.length>1)throw Error('Ambiguous '+description+'; no action selected');return items[0]||null;};
 const buttons=(root,text)=>[...(root?.querySelectorAll('button,a,input[type=button],input[type=submit]')||[])].filter(e=>label(e)===norm(text));
 const scope=()=>document.querySelector('#travel-root');
 const itemName=e=>norm(e?.getAttribute('aria-label')).replace(/\s+slot\s+\d+$/,'');
 const inventory=name=>[...(scope()?.querySelectorAll('[class*=inventorySlot] > button[aria-label]')||[])].filter(e=>shown(e)&&itemName(e)===norm(name));
 const same=(a,b)=>a&&b&&a.ownerId===b.ownerId&&a.expiresAt===b.expiresAt&&a.watchKey===b.watchKey;
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
 let controller=null,released=null,purchased=null,booked=null;
 function cancel(){controller?.abort();controller=null;}
 function inspect(run){
  const hospital=document.querySelector('a[aria-label^="Hospital:"]');
  const release=same(released,run)&&now()-released.at<120000&&(!hospital||hospital===released.hospital&&hospital.getAttribute('aria-label')===released.hospitalLabel);
  const flight=!!scope()?.querySelector('[aria-label="Flight progress"]')||norm(scope()?.querySelector('h4')?.textContent)==='traveling';
  return {released:!!release,purchaseProof:same(purchased,run)?purchased.proof:null,purchaseItemKey:same(purchased,run)?run.watchKey:null,traveling:!!(same(booked,run)||flight),returning:!!same(booked,run)};
 }
 async function execute(kind,{run,getSnapshot,guard}){
  if(!enabled())throw Error('Native Tampermonkey/PDA controls unavailable');cancel();const current=new window.AbortController();controller=current;
  const signal=current.signal;let submitted=false;
  const ensure=()=>{if(signal.aborted||!guard()||document.hidden||!document.hasFocus())throw Error('Action canceled or page/player changed. Continue manually if Torn already accepted it.');};
  const click=e=>{ensure();if(!shown(e))throw Error('Native action is no longer available');e.click();};
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
   ensure();if(!scope())throw Error('Open the native foreign travel page');
   if(kind==='heal'){
    if(!getSnapshot().hospitalized)throw Error('Hospital status is not confirmed');
    const matches=inventory(run.medical?.name).filter(e=>!run.medical?.uid||String(e.closest('li')?.getAttribute('data-item-uid'))===String(run.medical.uid));
    // Stackable medical items share a name; use the first matching visible slot.
    const opener=matches[0];if(!opener)throw Error('Selected medical item is not present in the visible foreign inventory');
    const slot=opener.closest('li'),selectedName=run.medical.name;
    const question=()=>slot.querySelector('[class*=confirmQuestion]');
    if(question())throw Error('Close the existing medical confirmation, then try Heal again');
    if(opener.getAttribute('aria-expanded')!=='true')click(opener);
    const use=await wait(()=>one(buttons(slot,'Use'),'medical Use control'));click(use);
    const yes=await wait(()=>{const q=question();if(!q)return null;if(norm(q.querySelector('strong')?.textContent)!==norm(selectedName)||!norm(q.textContent).includes('would you like to use'))throw Error('Medical confirmation does not match the selected item');return one(buttons(q,'Yes'),'medical Yes confirmation');});
    if(!(getSnapshot().quantity>=Math.max(1,Number(run.minimumQty)||1)))throw Error('Monitored stock dropped before healing; no medical item was used');
    submitted=true;click(yes);
    await wait(()=>slot.isConnected&&/you are out of the hospital!/i.test(slot.textContent));
    released={...run,at:now(),hospital:document.querySelector('a[aria-label^="Hospital:"]')};released.hospitalLabel=released.hospital?.getAttribute('aria-label');
    return {hospitalReleased:true};
   }
   if(kind==='buy'){
    let s=getSnapshot();if(s.hospitalized!==false||!(s.quantity>0))throw Error('Confirm hospital release and current stock before buying');
    const {id,row}=resolveItem(run);
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
    const input=one(container.querySelectorAll('input.input-money'),'visible native quantity input');
    const nativeMax=one(container.querySelectorAll('input.wai-btn[type=button]'),'native maximum control');
    const max=nativeMax||one(buttons(container,'MAX').filter(e=>e.matches('button[type=button]')),'quantity-panel MAX control');
    if(!input||!max||nativeMax&&!/add the maximum amount/i.test(max.getAttribute('aria-label')||max.parentElement?.getAttribute('title')||''))throw Error('Native maximum/quantity controls are unavailable');
    const before=inventory(run.watchName).length;click(max);await new Promise(resolve=>window.setTimeout(resolve,32));ensure();
    const buy=await wait(()=>{const amount=Number(input.value.replace(/,/g,''));const fresh=getSnapshot();if(!Number.isSafeInteger(amount)||amount<1||amount>fresh.quantity)return null;
     return compact?one(buttons(container,'Buy'),'quantity-panel Buy control'):one([...row.querySelectorAll('button[aria-controls]')].filter(e=>e.getAttribute('aria-controls')===panelId&&label(e)==='buy'),'monitored Buy control');});
    const amount=Number(input.value.replace(/,/g,''));s=getSnapshot();if(s.hospitalized!==false||amount>s.quantity)throw Error('Hospital or stock state changed before Buy');click(buy);
    const yes=await wait(()=>{const panel=scope()?.querySelector('#'+panelId),confirmation=panel?.querySelector('[class*=confirmPanel]');if(!shown(confirmation))return null;
     const strong=confirmation.querySelector('p strong');if(norm(strong?.textContent)!==norm(amount+'x '+run.watchName))throw Error('Purchase confirmation quantity/item mismatch');return one(buttons(confirmation,'Yes'),'purchase Yes confirmation');});
    if(getSnapshot().hospitalized!==false)throw Error('Hospital state changed before confirmation');submitted=true;click(yes);
    await wait(()=>inventory(run.watchName).length>=before+amount);
    purchased={...run,proof:'native:'+run.expiresAt+':'+id+':'+amount};return {purchaseConfirmed:true,amount};
   }
   if(kind==='return'){
    if(!run.purchaseConfirmed)throw Error('Confirm the purchase before returning');
    let panel=scope().querySelector('#travel-home-panel');
    if(!panel){const home=one([...scope().querySelectorAll('a[aria-controls="travel-home-panel"]')].filter(e=>label(e)==='travel home'),'Travel home');if(!home)throw Error('Travel home control is not available');click(home);panel=await wait(()=>scope()?.querySelector('#travel-home-panel'));}
    const text=norm(panel.querySelector('p')?.textContent);if(!text.includes('are you sure you want to travel back to torn'))throw Error('Return confirmation does not specify Torn');
    const back=one([...panel.querySelectorAll('button')].filter(e=>/^(confirm )?travel back$/.test(label(e))),'Travel Back confirmation');if(!back)throw Error('Travel Back control is unavailable');submitted=true;click(back);
    await wait(()=>/you make your way over to the airstrip and tell your pilot to head for torn/i.test(panel.textContent));booked={...run};
    const next=await wait(()=>one([...panel.querySelectorAll('button')].filter(e=>/^continue(?:\s*\(\d+\))?$/.test(label(e))),'flight Continue control'),8000);click(next);
    return {returnBooked:true};
   }
   throw Error('Unknown native action');
  }catch(error){error.submitted=submitted;throw error;}finally{document.removeEventListener('visibilitychange',foreground);window.removeEventListener('blur',foreground);if(controller===current)controller=null;}
 }
 return {enabled,execute,cancel,inspect,resolveItem};
}
