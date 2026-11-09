// Explicit, bounded DOM-region capture. Never submits a native action or reads network/storage credentials.
export function createTravelDomDiagnostic({document,window,scrub,storageKey,getMeta,onChange=()=>{}}){
 const stages=['Workflow (continuous)','Foreign page / hospitalized','Hospitalization item / Use / Yes confirmation','Inventory Trash / Yes confirmation','Selected healing item / Use control','Heal Yes/No confirmation','Hospital release result','Monitored item / Max and Buy','Purchase Yes/No confirmation','Purchase result','Return to Torn control / confirmation','Return flight result','Failed Snatch and Run attempt'];
 const clean=value=>scrub(String(value??'')).replace(/https?:\/\/[^\s<>"']+/gi,'[URL OMITTED]').replace(/\b[A-Za-z0-9_=-]{24,}\b/g,'[REDACTED]').slice(0,600);
 const skip='script,style,noscript,iframe,svg,canvas,img,video,audio,link,meta,textarea,[contenteditable],input[type=hidden],input[type=password],input[type=email],[autocomplete=current-password],[autocomplete=new-password]';
 function markup(root){let count=0,truncated=false;const out=document.createElement('div');
  function copy(node,depth){if(++count>160||depth>9){truncated=true;return null;}if(node.nodeType===3)return document.createTextNode(clean(node.nodeValue));if(node.nodeType!==1||node.matches(skip))return null;
   const e=document.createElement(node.tagName.toLowerCase());
   for(const name of ['id','name','class','role','title','type','aria-label','aria-controls','aria-expanded','aria-disabled','data-item-id','data-itemid','data-item-uid','data-id','min','max']){
    if(!node.hasAttribute(name))continue;let value=node.getAttribute(name);if(name.startsWith('data-')&&!/^\d+$/.test(value))continue;if(name==='type'&&!/^(button|submit|number|text|checkbox|radio)$/i.test(value))continue;e.setAttribute(name,clean(value));
   }
   if(node.disabled)e.setAttribute('disabled','');
   // Input values, URLs, form actions, handlers and arbitrary data attributes are deliberately omitted.
   for(const child of node.childNodes){const c=copy(child,depth+1);if(c)e.append(c);if(count>160)break;}
   return e;
  }
  const node=copy(root,0);if(node)out.append(node);const html=out.innerHTML;return {html:html.slice(0,16000),truncated:truncated||html.length>16000,nodes:Math.min(count,160)};
 }
 const cleanFunction=value=>{
  if(!value||typeof value!=='object')return null;const allowed=['event','stage','item','action','step','control','controlId','panel','message','result','reason','limitedBy','sound','source'];
  const data=Object.fromEntries(allowed.filter(k=>typeof value[k]==='string').map(k=>[k,clean(value[k])]));
  for(const k of ['amount','quantity','x','y','capacityTotal','occupiedSlots','freeSlots','nativeMax','desired','remainingSeconds','threshold','volume','selectedCount','carriedCount','freedSlots','confirmedPurchases'])if(Number.isFinite(value[k]))data[k]=value[k];for(const k of ['submitted','hospital','verified','enabled'])if(typeof value[k]==='boolean')data[k]=value[k];
  return data.event?data:null;
 };
 const cleanHospitalAlarm=value=>{if(!value||typeof value!=='object')return null;const out={};for(const key of ['configuredThresholdSeconds','armedThresholdSeconds','sharedVolumePercent','secondsUntilThreshold'])out[key]=Number.isFinite(value[key])?value[key]:null;for(const key of ['armed','configuredEnabled','armedEnabled','settingsChangedSinceArming','dispatchedForCurrentDeadline','audioSupported','audibleOutputVerified'])out[key]=typeof value[key]==='boolean'?value[key]:null;for(const key of ['configuredSound','armedSound','thresholdState','audioContextState'])out[key]=clean(value[key]||'');return out;};
 let captures=[],cancel=null,shield=null,monitoring=false,observer=null,flushTimer=null,stage=stages[0],lastAction=0,sequence=0,dropped=0;
 const pending=new Set();let resumeState={};try{resumeState=JSON.parse(window.sessionStorage.getItem(storageKey+':monitor')||'{}')||{};}catch{}
 const saveMonitoring=()=>{try{window.sessionStorage.setItem(storageKey+':monitor',JSON.stringify({active:monitoring,stage,dropped,sequence}));}catch{}};
 const persist=()=>{try{window.sessionStorage.setItem(storageKey,JSON.stringify(captures));}catch{onChange('Capture kept in memory only; export before navigation.');}};
 try{const saved=JSON.parse(window.sessionStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))for(const record of saved.slice(-200)){
  if(!stages.includes(record.stage)||typeof record.html!=='string')continue;const template=document.createElement('template');template.innerHTML=record.html.slice(0,16000);const safe=markup(template.content.firstElementChild||document.createElement('div'));
  captures.push({hospitalAlarm:cleanHospitalAlarm(record.hospitalAlarm),function:cleanFunction(record.function),target:Object.fromEntries(['tag','id','class','role','label'].map(k=>[k,clean(record.target?.[k])])),kind:clean(record.kind||'selection'),sequence:Number(record.sequence)||0,stage:record.stage,at:clean(record.at),host:clean(record.host),installedBuild:clean(record.installedBuild),path:clean(record.path).split(/[?#]/)[0],...safe});
 }}catch{}
 sequence=Math.max(Number(resumeState.sequence)||0,...captures.map(c=>c.sequence||0));dropped=Number(resumeState.dropped)||0;
 function capture(stage,target,kind='selection'){
  if(!stages.includes(stage))throw Error('Select a capture stage');
  if(document.hidden||!target?.isConnected||target.closest('#tu-test-dev-panel,#tu-test-dev-toggle'))throw Error('Select a visible Torn page region');
  const region=target.closest('[role=dialog],dialog,[aria-modal=true],.confirm-wrap,[class*=confirm i]:not(button):not(a):not(input),[data-item-id],[data-itemid],tr,[role=row],li')||(target.parentElement?.matches('html,body,main')?target:target.parentElement)||target;
  if(region.matches('html,body')||target.matches('html,body'))throw Error('Select the specific item, control or confirmation, not the full page');
  const targetInfo={tag:target.tagName.toLowerCase(),id:clean(target.id),class:clean(target.className),role:clean(target.getAttribute('role')),label:clean(target.getAttribute('aria-label')||(/^(BUTTON|A|SPAN)$/.test(target.tagName)?target.textContent:''))};
  const entry={hospitalAlarm:snatchState().hospitalAlarm,target:targetInfo,kind,sequence:++sequence,stage,at:new Date().toISOString(),host:clean(getMeta().host),installedBuild:clean(getMeta().installedBuild),path:window.location.pathname,...markup(region)};
  return append(entry);
 }
 function append(entry){captures.push(entry);while(captures.length>200||captures.reduce((n,c)=>n+c.html.length,0)>1000000){captures.shift();dropped++;}persist();saveMonitoring();onChange((monitoring?'Monitoring ON · ':'')+captures.length+' captures'+(dropped?' · '+dropped+' older captures discarded':'')+'.');return entry;}
 function recordFunction(event){
  if(!monitoring||typeof event.detail!=='string'||event.detail.length>8192)return;
  let data;try{data=cleanFunction(JSON.parse(event.detail));}catch{return;}if(!data)return;
  append({kind:'function-event',function:data,hospitalAlarm:snatchState().hospitalAlarm,sequence:++sequence,stage,at:new Date().toISOString(),host:clean(getMeta().host),installedBuild:clean(getMeta().installedBuild),path:window.location.pathname,html:'',truncated:false,nodes:0});
 }
 function snatchState(){const button=document.getElementById('tu-snatch-run');
  const numeric=value=>value!==undefined&&value!==null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  // Read only named TU controls; never collect arbitrary input values.
  const control=(id,label,selector)=>document.getElementById(id)||[...document.querySelectorAll('#tuim-hospital-alarm-settings label')].find(e=>e.textContent.trim().startsWith(label))?.querySelector(selector)||null;const warning=control('tuim-hospital-warning-seconds','Warn when hospital time reaches','input[type=number]'),enabled=control('tuim-hospital-alarm-enabled','Audible hospital alarm','input[type=checkbox]'),sound=control('tuim-hospital-alarm-sound','Hospital alarm sound','select'),volume=document.getElementById('tuim-alarm-volume')||document.querySelector('#tuim-panel input[type=range]');
  const threshold=numeric(button?.dataset.hospitalWarningSeconds),configured=numeric(warning?.value),until=numeric(button?.dataset.hospitalUntil),remaining=until>0?Math.max(0,Math.ceil((until-Date.now())/1000)):null;
  return {present:!!button,stage:clean(button?.dataset.snatchStage||''),label:clean(button?.textContent||''),message:clean(button?.title||''),ready:button?.getAttribute('aria-disabled')==='false',hospitalAlarm:{armed:button?.dataset.hospitalSettingsActive==='true',configuredThresholdSeconds:configured,armedThresholdSeconds:threshold,configuredEnabled:enabled?enabled.checked:null,armedEnabled:button?.dataset.hospitalAlarmEnabled===undefined?null:button.dataset.hospitalAlarmEnabled==='true',configuredSound:sound?clean(sound.value):null,armedSound:clean(button?.dataset.hospitalAlarmSound||''),sharedVolumePercent:numeric(volume?.value)??numeric(button?.dataset.hospitalAlarmVolume),settingsChangedSinceArming:!!(threshold!==null&&(configured!==null&&configured!==threshold||enabled&&enabled.checked!==(button.dataset.hospitalAlarmEnabled==='true')||sound&&sound.value!==button.dataset.hospitalAlarmSound)),thresholdState:clean(button?.dataset.hospitalThresholdState||'unavailable'),secondsUntilThreshold:remaining!==null&&threshold!==null?Math.max(0,remaining-threshold):null,dispatchedForCurrentDeadline:until>0&&numeric(button?.dataset.hospitalAlarmDispatchedUntil)===until,audioContextState:clean(button?.dataset.hospitalAudioState||'unknown'),audioSupported:button?.dataset.hospitalAudioSupported==='unknown'||button?.dataset.hospitalAudioSupported===undefined?null:button.dataset.hospitalAudioSupported==='true',audibleOutputVerified:false},extraHospital:{selectedItemTypes:numeric(button?.dataset.hospitalSelectedCount),carriedSelectedItems:numeric(button?.dataset.hospitalCarriedCount),availabilityReason:clean(button?.dataset.hospitalExtraReason||'unavailable'),present:!!document.getElementById('tu-snatch-extra-hosp')&&!document.getElementById('tu-snatch-extra-hosp').hidden,label:clean(document.getElementById('tu-snatch-extra-hosp')?.textContent||''),warning:document.getElementById('tu-snatch-extra-hosp')?.dataset.hospitalWarning==='true',blinkPeriod:clean(document.getElementById('tu-snatch-extra-hosp')?.style.animation||'')},hospitalClock:{displayed:button?.dataset.hospitalClockVisible==='true'||!!document.getElementById('tu-snatch-extra-hosp')&&!document.getElementById('tu-snatch-extra-hosp').hidden,available:Number(button?.dataset.hospitalUntil)>0,until:Number(button?.dataset.hospitalUntil)||null,remainingSeconds:Number(button?.dataset.hospitalUntil)>0?Math.max(0,Math.ceil((Number(button.dataset.hospitalUntil)-Date.now())/1000)):null,source:clean(button?.dataset.hospitalClockSource||'unavailable'),reason:clean(button?.dataset.hospitalClockReason||''),lookup:clean(button?.dataset.hospitalClockLookup||'not-requested'),profileState:clean(button?.dataset.hospitalProfileState||''),profileUntilPresent:button?.dataset.hospitalProfileUntilPresent==='true'}};}
 function stop(){cancel?.();shield?.();monitoring=false;observer?.disconnect();observer=null;window.clearTimeout(flushTimer);flushTimer=null;pending.clear();document.removeEventListener('click',recordClick,true);document.removeEventListener('change',recordChange,true);document.removeEventListener('tu-snatch-run-diagnostic',recordFunction);saveMonitoring();onChange('Monitoring OFF · '+captures.length+' captures retained.');}
 const ignored=e=>!e||e.closest('#tu-test-dev-panel,#tu-test-dev-toggle,script,style,textarea,[contenteditable],input[type=password],input[type=hidden],[role=log],[class*=chatBox],[class*=chat-box]');
 const relevant=e=>!ignored(e)&&!e.matches('html,body')&&/\b(use|yes|no|buy|purchase|return|torn|hospital|flight|blood bag|medical)\b/i.test((e.getAttribute('aria-label')||'')+' '+(e.textContent||'').slice(0,1800));
 function take(target,kind){if(!monitoring||document.hidden||ignored(target))return;try{const result=capture(stage,target,kind);return result;}catch{}}
 function recordClick(event){const target=event.target.nodeType===1?event.target:event.target.parentElement;if(ignored(target))return;lastAction=Date.now();take(target,'click');}
 function recordChange(event){if(!ignored(event.target)){lastAction=Date.now();take(event.target,'change');}}
 function start(selected=stages[0]){
  if(!stages.includes(selected))throw Error('Select a capture stage');if(monitoring){stage=selected;saveMonitoring();return;}
  cancel?.();shield?.();stage=selected;monitoring=true;saveMonitoring();
  document.addEventListener('click',recordClick,{capture:true,passive:true});document.addEventListener('change',recordChange,{capture:true,passive:true});document.addEventListener('tu-snatch-run-diagnostic',recordFunction);
  observer=new window.MutationObserver(records=>{
   if(!monitoring||document.hidden)return;
   for(const record of records.slice(0,50)){
    const target=record.target.nodeType===1?record.target:record.target.parentElement;if(ignored(target))continue;
    for(const node of [target,...record.addedNodes].slice(0,12)){if(node.nodeType!==1||!relevant(node))continue;if(Date.now()-lastAction>12000&&!node.closest('[role=dialog],dialog,[class*=confirm i],[class*=popover i],[class*=hospital i],[class*=travel i]')&&!/would you like|you (?:have )?(?:used|purchased|bought)|return(?:ing)? to torn/i.test((node.textContent||'').slice(0,1800)))continue;pending.add(node);if(pending.size>=12)break;}
    if(pending.size>=12)break;
   }
   if(pending.size&&flushTimer===null)flushTimer=window.setTimeout(()=>{flushTimer=null;if(!monitoring)return;let count=0;for(const node of pending){if(node.isConnected&&count++<6)take(node,'dom-change');}pending.clear();},180);
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-expanded','aria-disabled']});
  onChange('Monitoring ON · clicks and related DOM changes are recorded until Stop monitoring. Play manually as usual.');
 }

 function pick(stage,done){stop();let timer;
  const finish=()=>{for(const kind of ['pointerdown','mousedown','touchstart'])document.removeEventListener(kind,blockStart,true);for(const kind of ['pointerup','mouseup','touchend'])document.removeEventListener(kind,end,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);window.clearTimeout(timer);cancel=null;done?.();};
  const click=event=>{if(event.target.closest('#tu-test-dev-panel'))return;event.preventDefault();event.stopImmediatePropagation();if(!event.target.closest('#tu-test-dev-toggle')){try{capture(stage,event.target);}catch(error){onChange(error.message);}}finish();};
  const blockStart=event=>{if(event.target.closest('#tu-test-dev-panel'))return;event.preventDefault();event.stopImmediatePropagation();};
  const end=event=>{if(event.target.closest('#tu-test-dev-panel'))return;click(event);const block=e=>{e.preventDefault();e.stopImmediatePropagation();};let until;shield=()=>{for(const kind of ['click','mouseup','touchend'])document.removeEventListener(kind,block,true);window.clearTimeout(until);shield=null;};for(const kind of ['click','mouseup','touchend'])document.addEventListener(kind,block,true);until=window.setTimeout(()=>shield?.(),600);};
  const key=event=>{if(event.key==='Escape'){event.preventDefault();finish();}};
  cancel=finish;for(const kind of ['pointerdown','mousedown','touchstart'])document.addEventListener(kind,blockStart,{capture:true,passive:false});for(const kind of ['pointerup','mouseup','touchend'])document.addEventListener(kind,end,{capture:true,passive:false});document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);timer=window.setTimeout(finish,30000);
 }
 return {stages,markup,capture,pick,start,stop,resume(){if(resumeState.active)start(stages.includes(resumeState.stage)?resumeState.stage:stages[0]);},setStage(value){if(stages.includes(value)){stage=value;saveMonitoring();}},report:()=>({schemaVersion:4,readOnly:true,monitoring,stage,snatchAndRun:snatchState(),droppedCaptures:dropped,captures:captures.map(c=>({...c})),limits:{maxCaptures:200,maxTotalHtmlCharacters:1000000,maxNodes:160,maxDepth:9,maxHtmlCharacters:16000},excluded:['arbitrary input values (only named TU hospital settings and shared volume are included)','URLs and query strings','cookies and credentials','network requests','full-page HTML']}),clear(){stop();captures=[];dropped=0;sequence=0;try{window.sessionStorage.removeItem(storageKey);window.sessionStorage.removeItem(storageKey+':monitor');}catch{}onChange('DOM captures cleared.');}};
}
