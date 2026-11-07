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
 function capacityFor(row,run,stock,nativeMax){
  const root=scope(),panel=root?.querySelector('[class*=inventoryPanel]');
  const slots=[...(panel?.querySelectorAll('li[class*=inventorySlot]')||[])];
  const banner=[...document.querySelectorAll('[class*=messageContent],.info-msg')].map(e=>e.textContent||'').find(t=>/you are in\s+.+?and have\s*\$/i.test(t))||'';
  const total=Number(banner.match(/you have purchased\s*[\d,]+\s*\/\s*([\d,]+)/i)?.[1]?.replace(/,/g,'')||panel?.getAttribute('aria-label')?.match(/^inventory\s+(\d+)\s+items$/i)?.[1]);
  if(!Number.isSafeInteger(total)||total<1||slots.length!==total)return {verified:false,reason:'capacity-not-available',desired:nativeMax};
  let occupied=slots.filter(slot=>{const b=slot.querySelector(':scope > button[aria-label]');return b&&!/^(empty|available|free|unused)\b/i.test(b.getAttribute('aria-label')||'');}).length;
  // A consumed medical slot can retain its old button while showing the result.
  // Ignore only that exact slot/button from this run's proven medical use.
  const ghost=same(released,run)&&released.opener?.isConnected&&released.opener.getAttribute('aria-label')===released.slotLabel;
  if(ghost)occupied=Math.max(0,occupied-1);
  const free=Math.max(0,total-occupied);
  const currency=value=>{const match=String(value||'').match(/(-?)\$\s*(-?)([\d,]+(?:\.\d+)?)(?![\w,.])/);return match?((match[1]||match[2])?-1:1)*Number(match[3].replace(/,/g,'')):NaN;};
  const price=currency(row.querySelector('[class*=tabletColD] [class*=displayPrice]')?.textContent||row.querySelector('[class*=tabletColD]')?.textContent);
  const displayedCash=currency(document.getElementById('user-money')?.textContent);
  const cash=Number.isFinite(displayedCash)?displayedCash:currency(banner.match(/and have\s*(\$\s*-?[\d,]+(?:\.\d+)?)/i)?.[1]);
  if(!(price>0)||!Number.isFinite(cash))return {verified:false,reason:'funds-not-available',total,occupied,free,desired:Math.min(nativeMax,free,stock)};
  const affordable=Math.max(0,Math.floor(cash/price)),desired=Math.max(0,Math.min(free,stock,affordable));
  return {verified:true,total,occupied,free,price,desired,affordableSlots:Math.min(free,affordable),limitedBy:desired===free?'space':desired===stock?'stock':'funds'};
 }
 let controller=null,released=null,purchased=null,booked=null;
 function cancel(){controller?.abort();controller=null;}
 function inspect(run){
  const hospital=document.querySelector('a[aria-label^="Hospital:"]');
  const release=same(released,run)&&now()-released.at<120000&&(!hospital||hospital===released.hospital&&hospital.getAttribute('aria-label')===released.hospitalLabel);
  const flight=!!scope()?.querySelector('[aria-label="Flight progress"]')||norm(scope()?.querySelector('h4')?.textContent)==='traveling';
  return {released:!!release,purchaseProof:same(purchased,run)?purchased.proof:null,purchaseItemKey:same(purchased,run)?run.watchKey:null,traveling:!!(same(booked,run)||flight),returning:!!same(booked,run)};
 }
 async function execute(kind,{run,getSnapshot,guard,onEvent=()=>{}}){
  if(!enabled())throw Error('Native Tampermonkey/PDA controls unavailable');cancel();const current=new window.AbortController();controller=current;
  const signal=current.signal;let submitted=false;
  const ensure=()=>{if(signal.aborted||!guard()||document.hidden||!document.hasFocus())throw Error('Action canceled or page/player changed. Continue manually if Torn already accepted it.');};
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
    const resultOpener=slot.querySelector(':scope > button[aria-label]');released={...run,opener:resultOpener,slot,slotLabel:resultOpener?.getAttribute('aria-label'),at:now(),hospital:document.querySelector('a[aria-label^="Hospital:"]')};released.hospitalLabel=released.hospital?.getAttribute('aria-label');
    return {hospitalReleased:true};
   }
   if(kind==='buy'){
    let s=getSnapshot();if(s.hospitalized!==false||!(s.quantity>0))throw Error('Confirm hospital release and current stock before buying');
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
    if(!input||!max||nativeMax&&!/add the maximum amount/i.test(max.getAttribute('aria-label')||max.parentElement?.getAttribute('title')||''))throw Error('Native maximum/quantity controls are unavailable');
    const before=inventory(run.watchName).length;click(max);await new Promise(resolve=>window.setTimeout(resolve,32));ensure();
    const nativeAmount=Number(input.value.replace(/,/g,''));
    const capacity=capacityFor(row,run,getSnapshot().quantity,nativeAmount);
    onEvent({step:'capacity-check',verified:capacity.verified,capacityTotal:capacity.total,occupiedSlots:capacity.occupied,freeSlots:capacity.free,nativeMax:nativeAmount,desired:capacity.desired,limitedBy:capacity.limitedBy||capacity.reason});
    if(!capacity.verified&&same(released,run)&&capacity.free>nativeAmount)throw Error('Cannot verify current funds for the freed medical slot; no purchase was sent');
    if(capacity.verified){
     if(capacity.desired<1)throw Error('No available capacity, affordable items or stock; no purchase was sent');
     // React may replace the quantity form after closing a medical result.
     // Prepare each current input once; never retry a submitted purchase.
    }
    const prepared=new WeakSet();
    const prepare=element=>{if(!capacity.verified||Number(element.value.replace(/,/g,''))===capacity.desired||prepared.has(element))return;const fresh=capacityFor(row,run,getSnapshot().quantity,Number(element.value));if(!fresh.verified||fresh.desired!==capacity.desired)throw Error('Capacity, stock or funds changed while preparing quantity');prepared.add(element);const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;if(!setter)throw Error('Native quantity input cannot be updated');setter.call(element,String(capacity.desired));element.dispatchEvent(new window.Event('input',{bubbles:true}));element.dispatchEvent(new window.Event('change',{bubbles:true}));onEvent({step:'quantity-prepared',amount:Number(element.value.replace(/,/g,'')),desired:capacity.desired});};
    prepare(input);await new Promise(resolve=>window.setTimeout(resolve,32));ensure();
    const reported=new Set();const readiness=(reason,amount)=>{const key=reason+':'+amount;if(!reported.has(key)){reported.add(key);onEvent({step:'quantity-wait',reason,amount,desired:capacity.desired});}};
    const buy=await wait(()=>{
     ({row}=resolveItem(run));container=compact?scope()?.querySelector('#'+panelId+' [class*=amountPanel]'):row;
     const current=one(container?.querySelectorAll('input.input-money')||[],'current quantity input');if(!current){readiness('input-unavailable',null);return null;}input=current;prepare(input);if(!input.isConnected)return null;
     const amount=Number(input.value.replace(/,/g,''));const fresh=getSnapshot();if(!Number.isSafeInteger(amount)||amount<1||amount>fresh.quantity||capacity.verified&&amount!==capacity.desired){readiness('quantity-not-ready',amount);return null;}
     return compact?one(buttons(container,'Buy'),'quantity-panel Buy control'):one([...row.querySelectorAll('button[aria-controls]')].filter(e=>e.getAttribute('aria-controls')===panelId&&label(e)==='buy'),'monitored Buy control');});
    const amount=Number(input.value.replace(/,/g,''));s=getSnapshot();const freshCapacity=capacityFor(row,run,s.quantity,amount);if(capacity.verified&&(!freshCapacity.verified||freshCapacity.desired!==amount))throw Error('Available capacity, stock or funds changed before Buy');if(s.hospitalized!==false||amount>s.quantity)throw Error('Hospital or stock state changed before Buy');click(buy);
    const yes=await wait(()=>{const panel=scope()?.querySelector('#'+panelId),confirmation=panel?.querySelector('[class*=confirmPanel]');if(!shown(confirmation))return null;
     const strong=confirmation.querySelector('p strong');if(norm(strong?.textContent)!==norm(amount+'x '+run.watchName))throw Error('Purchase confirmation quantity/item mismatch');return one(buttons(confirmation,'Yes'),'purchase Yes confirmation');});
    const confirmSnapshot=getSnapshot(),confirmStock=Number.isFinite(confirmSnapshot.quantity)?confirmSnapshot.quantity:s.quantity;const finalCapacity=capacityFor(row,run,confirmStock,amount);if(capacity.verified&&finalCapacity.verified&&finalCapacity.desired!==amount)throw Error('Capacity, stock or funds changed before confirmation');
    if(getSnapshot().hospitalized!==false)throw Error('Hospital state changed before confirmation');submitted=true;click(yes);
    await wait(()=>{const snapshot=getSnapshot();return inventory(run.watchName).length>=before+amount||snapshot.purchaseProof&&snapshot.purchaseProof!==run.priorProof&&snapshot.purchaseItemKey===run.watchKey;});
    purchased={...run,proof:'native:'+run.expiresAt+':'+id+':'+amount};return {purchaseConfirmed:true,amount};
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
  }catch(error){error.submitted=submitted;throw error;}finally{document.removeEventListener('visibilitychange',foreground);window.removeEventListener('blur',foreground);if(controller===current)controller=null;}
 }
 return {enabled,execute,cancel,inspect,resolveItem,capacityFor};
}
