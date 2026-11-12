// ==UserScript==
// @name         Torn Utilities DEV (All-in-One)
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.5.42.103-dev
// @description  Integrated TU development bundle for PDA and Tampermonkey
// @author       RelaxSweety [4539436]
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_listValues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @connect      api.torn.com
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @connect      tu-multiplayer-server-dev.tuserver.workers.dev
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js
// ==/UserScript==
/* Early passive page-world transport probe; no recording until diagnostics start. */
(()=>{const page=typeof unsafeWindow!=='undefined'&&unsafeWindow.document?unsafeWindow:window;try{if(!page.__TU_DIRECT_ITEMS_CAPTURE__){const create=function createTravelRequestCapture({window,document,pageWindow=window,now=()=>Date.now(),build='unknown'}){
 // Per-tab build boundary: discard evidence, preserve monitoring and all gameplay settings/locks.
 try{const marker='tu:diagnostics:build:v1',prior=window.sessionStorage.getItem(marker);if(prior!==build){const monitor='tu:item-monitor:dev:diagnostics:v1',network='tu:direct-items:travel-network:v1';let state={},net={};try{state=JSON.parse(window.sessionStorage.getItem(monitor+':monitor')||'{}');net=JSON.parse(window.sessionStorage.getItem(network)||'{}');}catch{}for(const key of [monitor,monitor+':page','tu:item-monitor:stock-evidence:v1','tu:direct-items:log:v1','tu:diagnostics:ui:v1',network])window.sessionStorage.removeItem(key);if(state.active!==undefined)window.sessionStorage.setItem(monitor+':monitor',JSON.stringify({active:state.active===true,stage:state.stage}));if(net.active)window.sessionStorage.setItem(network,JSON.stringify({schemaVersion:1,active:true}));window.sessionStorage.setItem(marker,build);}}catch{}
 const KEY='tu:direct-items:travel-network:v1';let active=false,resumeActive=false,flushTimer=null,records=[],actions=[],droppedRequests=0,droppedActions=0,sequence=0,lastAction=null,lastUserAction=null,persistenceState='unwritten',banner=null,oldFetch,oldOpen,oldSend,wrappedFetch,wrappedOpen,wrappedSend;
 const responseOwners=new WeakMap(),aliases=new WeakMap();const xhrMeta=new WeakMap(),listeners=new Map(),hooks={fetch:false,xhr:false};let installed=false,resourceObserver=null,recentPointer=null;const resources=[],counters={eventsSeen:0,outsideTravel:0,controlsSeen:0,fetchCalls:0,xhrSends:0,filteredRequests:0,resourceEntries:0,duplicateFetchObservations:0},instrumentedAt=new Date(now()).toISOString();
 const name=value=>String(value||'').replace(/[^a-zA-Z0-9_.\[\]-]/g,'').slice(0,60);
 function fields(value){let pairs=[];try{if(value&&typeof value.entries==='function')pairs=[...value.entries()];else if(typeof value==='string'){if(value.trim().startsWith('{'))pairs=Object.entries(JSON.parse(value));else if(value.startsWith('--')&&value.includes('Content-Disposition:')){const boundary=value.split(/\r?\n/,1)[0];for(const part of value.split(boundary).slice(1,61)){const match=part.match(/Content-Disposition:\s*form-data;[^\r\n]*?name="([^"]+)"/i),split=part.search(/\r?\n\r?\n/);if(match&&split>=0){const content=part.slice(split).replace(/^\r?\n\r?\n/,'').replace(/\r?\n$/,'');pairs.push([match[1],/filename=/i.test(part.slice(0,split))?'[file omitted]':content]);}}}else pairs=[...new URLSearchParams(value)];}else if(value&&typeof value==='object')pairs=Object.entries(value);}catch{}const result=[];function add(key,value,prefix='',depth=0){if(result.length>=80)return;const field=name(prefix+key),base=name(key).split('.').at(-1),sensitive=/rfc|csrf|token|auth|password|cookie|secret|session|key/i.test(field);let safe='[omitted]';if(!sensitive&&/^(sid|step|action|substep|type|operation|mode|category)$/i.test(base)&&/^[a-z][a-z0-9_-]{0,50}$/i.test(String(value)))safe=String(value);if(!sensitive&&/^(item|itemID|item_id|id|uid|slot|slotID|slot_id|instanceId|instance_id|confirm|amount|quantity|cat)$/i.test(base)&&/^[ug]?\d{1,24}$/.test(String(value)))safe=String(value);result.push({name:field,value:safe,type:typeof value});if(!sensitive&&depth<3){let nested=value;if(typeof value==='string'&&/^(data|params|payload)$/i.test(base)&&value.trim().startsWith('{'))try{nested=JSON.parse(value);}catch{}if(nested&&typeof nested==='object'&&!Array.isArray(nested))for(const [child,entry] of Object.entries(nested).slice(0,30))add(child,entry,field+'.',depth+1);}}for(const [key,value] of pairs.slice(0,60))add(key,value);return result;}
 function route(input){try{const url=new URL(typeof input==='string'?input:input.url,window.location.origin);if(url.origin!==window.location.origin||!/^[\w/.-]{1,160}$/.test(url.pathname))return null;return {path:url.pathname,query:fields(url.search.slice(1))};}catch{return null;}}
 function flush(){window.clearTimeout(flushTimer);flushTimer=null;try{window.sessionStorage.setItem(KEY,JSON.stringify({schemaVersion:1,active,records,actions,resources,counters,droppedRequests,droppedActions,sequence}));persistenceState='saved';}catch{persistenceState='failed';}}
 function schedule(){if(flushTimer===null)flushTimer=window.setTimeout(flush,2000);}
 function action(kind,details={}){const value={id:++sequence,at:new Date(now()).toISOString(),build,kind,...details};actions.push(value);if(actions.length>300){actions.shift();droppedActions++;}schedule();return value;}
 // Restore only this recorder's strictly bounded, sanitized format. Never restore bodies or headers.
 try{const saved=JSON.parse(window.sessionStorage.getItem(KEY)||'null');if(saved?.schemaVersion===1){resumeActive=saved.active===true;droppedRequests=Math.max(0,Number(saved.droppedRequests)||0);droppedActions=Math.max(0,Number(saved.droppedActions)||0);sequence=Math.max(0,Number(saved.sequence)||0);const stamp=v=>/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(String(v))?String(v):'';const version=v=>/^\d+(?:\.\d+){3}-[a-z0-9.-]+$/.test(String(v))?String(v):'unknown';const safeFields=v=>{const input=(Array.isArray(v)?v:[]).slice(0,60);return fields(Object.fromEntries(input.map(f=>[name(f?.name),f?.value]))).map((field,i)=>({...field,type:['string','number','boolean','object','undefined'].includes(input[i]?.type)?input[i].type:field.type}));};for(const key of Object.keys(counters))if(Number.isSafeInteger(saved.counters?.[key])&&saved.counters[key]>=0)counters[key]=saved.counters[key];for(const r of (Array.isArray(saved.resources)?saved.resources:[]).slice(-120)){if(!/^[\w/.-]{1,160}$/.test(r.path||'')||!['fetch','xmlhttprequest'].includes(r.initiatorType))continue;resources.push({at:stamp(r.at),build:version(r.build),path:r.path,query:safeFields(r.query),initiatorType:r.initiatorType,durationMs:Number.isFinite(r.durationMs)?r.durationMs:null});}for(const r of (Array.isArray(saved.records)?saved.records:[]).slice(-300)){if(!/^[\w/.-]{1,160}$/.test(r.path||'')||!['GET','POST'].includes(r.method))continue;records.push({id:Number(r.id)||0,at:stamp(r.at),build:version(r.build),method:r.method,path:r.path,query:safeFields(r.query),body:safeFields(r.body),bodyState:['captured','pending','no-fields','unparsed','empty-or-not-observed'].includes(r.bodyState)?r.bodyState:r.body?.length?'captured':'empty-or-not-observed',bodyVariants:(Array.isArray(r.bodyVariants)?r.bodyVariants:[]).slice(0,2).map(safeFields),userActionId:Number(r.userActionId)||null,actionId:Number(r.actionId)||null,captureLayers:Number.isSafeInteger(r.captureLayers)?r.captureLayers:1,scope:r.scope==='known-route'?'known-route':'correlated-candidate',response:{state:['pending','received','network-error'].includes(r.response?.state)?r.response.state:'unknown',httpStatus:Number(r.response?.httpStatus)||null,elapsedMs:Number(r.response?.elapsedMs)||null,format:['json','html','text'].includes(r.response?.format)?r.response.format:'unknown',keys:Array.isArray(r.response?.keys)?r.response.keys.slice(0,40).map(name):[],success:typeof r.response?.success==='boolean'?r.response.success:null,signals:Array.isArray(r.response?.signals)?r.response.signals.filter(v=>['hospital','cooldown','life','used','confirm','error','wrong item','bought','travel'].includes(v)):[],errorCode:Number.isFinite(r.response?.errorCode)?r.response.errorCode:null,inventory:r.response?.inventory?restoreInventory(r.response.inventory):undefined,itemUse:r.response?.itemUse?useInfo({...Object.fromEntries(Object.entries(r.response.itemUse.flags||{}).map(([k,v])=>[k,v?.value])),message:r.response.itemUse.hospitalRelease==='still-hospitalized'?'You are still in hospital.':r.response.itemUse.hospitalRelease==='explicit-release-message-needs-status-check'?'You are out of the hospital.':''}):undefined}});}for(const a of (Array.isArray(saved.actions)?saved.actions:[]).slice(-300)){actions.push({id:Number(a.id)||0,at:stamp(a.at),build:version(a.build),kind:['click','quantity-change','navigation','recording-start','recording-stop'].includes(a.kind)?a.kind:'navigation',control:name(a.control),parentUserActionId:Number(a.parentUserActionId)||null,trusted:a.trusted===true,stage:name(a.stage),slotIdentity:Object.fromEntries(Object.entries(a.slotIdentity||{}).filter(([key,value])=>/^data-(item-id|item|id|item-uid|slot|slot-id)$/.test(key)&&/^[ug]?\d{1,24}$/.test(String(value)))),quantity:Number.isFinite(a.quantity)?a.quantity:null,path:/^[\w/.-]{1,160}$/.test(a.path||'')?a.path:'',query:safeFields(a.query)});}}}catch{}
 function markNativeClick(event){if(!active)return;counters.eventsSeen++;const node=event.target?.nodeType===1?event.target:event.target?.parentElement;if(!node||typeof node.closest!=='function')return;const target=node.closest('button,a,[role=button],[role=option],input[type=submit],input[type=button]');if(!target)return;const snatch=target.closest('#tu-snatch-run,#tu-snatch-extra-hosp,#tu-snatch-departure-choice'),root=target.closest('#travel-root'),slot=target.closest('li[class*=inventorySlot]');if(!snatch&&!root){counters.outsideTravel++;return;}if(target.closest('#tuim-panel,#tuim-menu,#tuim-quickitems-test'))return;if(event.type==='click'&&recentPointer?.target===target&&recentPointer.trusted===!!event.isTrusted&&now()-recentPointer.at<700)return;if(event.type==='pointerdown')recentPointer={target,at:now(),trusted:!!event.isTrusted};counters.controlsSeen++;let control=(target.getAttribute('aria-label')||target.textContent||target.value||'').trim().replace(/\s+/g,' ').toLowerCase();if(snatch)control='snatch-stage';else if(target.matches('[role=option]'))control='select-inventory-item';else if(slot&&target===slot.querySelector(':scope > button'))control='open-inventory-item';else if(!/^(use|yes|no|trash|buy|max|add|fill|cancel|travel home|travel back|confirm travel back|continue(?:\s*\(\d+\))?|travel|fly)$/i.test(control))control='native-control';
  const slotIdentity={};if(slot)for(const key of ['data-item-id','data-item','data-id','data-item-uid','data-slot','data-slot-id']){const value=slot.getAttribute(key);if(/^[ug]?\d{1,24}$/.test(value||''))slotIdentity[key]=value;}const value=action('click',{control,slotIdentity,eventType:event.type||'click',parentUserActionId:!event.isTrusted&&lastUserAction&&now()-lastUserAction.at<10000?lastUserAction.id:null,trusted:!!event.isTrusted,stage:name(snatch?.dataset.snatchStage||''),path:window.location.pathname});lastAction={id:value.id,at:now(),trusted:!!event.isTrusted};if(event.isTrusted)lastUserAction={id:value.id,at:now()};
 }
 function quantityChanged(event){if(!active||event.target?.nodeType!==1||!event.target.closest('#travel-root')||!event.target.matches('input')||!/^[\d,]+$/.test(event.target.value||''))return;action('quantity-change',{quantity:Number(event.target.value.replace(/,/g,'')),trusted:!!event.isTrusted,path:window.location.pathname});}
 function begin(input,method,body){if(!active||!['GET','POST'].includes(String(method).toUpperCase()))return null;const target=route(input);if(!target)return null;const sid=target.query.find(f=>f.name==='sid')?.value||'',queryText=target.query.map(f=>f.name+'='+f.value).join('&');if(/chat|message|mail|login|auth|password|captcha|security|forum/i.test(target.path+'?'+queryText)||/\.(png|jpg|gif|svg|css|js|woff2?)$/i.test(target.path))return null;const requestFields=fields(body),known=/^\/(?:item|travelagency|travel)\.php$/i.test(target.path)||/^\/(?:page|loader)\.php$/i.test(target.path)&&/^(?:travel|travelagency|travelData|items|itemsLoadouts)$/i.test(sid);const correlated=lastAction&&now()-lastAction.at<5000;if(!known&&!correlated){counters.filteredRequests++;return null;}
  const entry={id:++sequence,at:new Date(now()).toISOString(),build,method:String(method).toUpperCase(),...target,body:requestFields,bodyState:requestFields.length?'captured':'empty-or-not-observed',actionId:lastAction&&now()-lastAction.at<10000?lastAction.id:null,userActionId:lastUserAction&&now()-lastUserAction.at<10000?lastUserAction.id:null,scope:known?'known-route':'correlated-candidate',response:{state:'pending'},started:now()};records.push(entry);if(records.length>300){records.shift();droppedRequests++;}schedule();return entry;
 }
 function canonical(entry){while(entry&&aliases.has(entry))entry=aliases.get(entry);return entry;}
 function mergeFields(entry,body){const target=canonical(entry);if(body.length){if(!target.body.length)target.body=body;else if(JSON.stringify(target.body)!==JSON.stringify(body)){target.bodyVariants=target.bodyVariants||[];if(target.bodyVariants.length<2&&!target.bodyVariants.some(v=>JSON.stringify(v)===JSON.stringify(body)))target.bodyVariants.push(body);}target.bodyState='captured';}}
 function setBody(entry,value){if(!active||!entry)return;const target=canonical(entry),body=fields(value);mergeFields(target,body);if(!body.length&&!target.body.length)target.bodyState=typeof value==='string'&&value.length?'unparsed':'no-fields';schedule();}
 function responseOwner(entry,response){if(!entry||!response||typeof response!=='object')return entry;const prior=canonical(responseOwners.get(response)),target=canonical(entry);if(prior&&prior!==target&&prior.method===target.method&&prior.path===target.path&&JSON.stringify(prior.query)===JSON.stringify(target.query)&&prior.userActionId===target.userActionId){if(target.body.length)mergeFields(prior,target.body);for(const variant of target.bodyVariants||[])mergeFields(prior,variant);aliases.set(target,prior);const index=records.indexOf(target);if(index>=0)records.splice(index,1);prior.captureLayers=(prior.captureLayers||1)+1;counters.duplicateFetchObservations++;schedule();return prior;}responseOwners.set(response,target);return target;}
 function restoreInventory(saved){
  // Rebuild only the bounded slot/item paths we captured, then sanitize again.
  // Do not flatten the nested item identity into a new slot on navigation.
  const rows=[];
  for(const row of (Array.isArray(saved?.slots)?saved.slots:[]).slice(0,80)){
   const match=String(row?.path||'').match(/^slots\[(\d{1,2})\](\.item)?$/);
   if(!match||Number(match[1])>=40||!row.fields||typeof row.fields!=='object')continue;
   const index=Number(match[1]);rows[index]||={};
   if(match[2])rows[index].item=row.fields;else Object.assign(rows[index],Object.fromEntries(Object.entries(row.fields).filter(([key])=>key!=='item'&&key!=='__proto__'&&key!=='constructor')));
  }
  return inventoryInfo({slots:rows,...Object.fromEntries(['excessSlots','maxSpecialSlots','maxBaseSlots'].map(key=>[key,saved?.capacities?.[key]]))});
 }
 function inventoryInfo(data){
  const schema=[],slots=[],capacities={};let visited=0;
  for(const key of ['excessSlots','maxSpecialSlots','maxBaseSlots'])if(Number.isSafeInteger(data?.[key])&&data[key]>=0&&data[key]<=10000)capacities[key]=data[key];
  function walk(value,path,depth){if(depth>5||++visited>240||!value||typeof value!=='object')return;
   if(Array.isArray(value)){schema.push({path,type:'array',length:value.length});value.slice(0,40).forEach((v,i)=>walk(v,path+'['+i+']',depth+1));return;}
   const safe={};for(const [key,v] of Object.entries(value).slice(0,40)){
    if(/rfc|csrf|token|auth|password|cookie|secret|session|key|owner|player|user/i.test(key)||!/^[a-zA-Z_][a-zA-Z0-9_]{0,39}$/.test(key))continue;
    schema.push({path:path+'.'+key,type:v===null?'null':Array.isArray(v)?'array':typeof v});
    if(/^(slotID|slotId|slot_id|itemID|itemId|item_id|ID|id|quantity|qty|amount)$/.test(key)&&/^\d{1,24}$/.test(String(v)))safe[key]=String(v);
    if(/^(name|itemName|type|category)$/.test(key)&&typeof v==='string'&&v.length<=120&&!/[<>\r\n]/.test(v)&&!/(?:https?:|token|rfcv|secret)/i.test(v))safe[key]=v;
    if(v&&typeof v==='object')walk(v,path+'.'+key,depth+1);
   }if(Object.keys(safe).length)slots.push({path,fields:safe});
  }walk(data?.slots,'slots',0);
  const mappings=slots.map(row=>{const f=row.fields;return {path:row.path,slotId:f.slotID||f.slotId||f.slot_id||null,itemId:f.itemID||f.itemId||f.item_id||null,name:f.itemName||f.name||null};}).filter(row=>row.slotId&&row.itemId);
  // Observed Torn travelData schema: the outer ID identifies the slot;
  // item.ID identifies the item type. Never use an array index or armouryID.
  for(const row of slots){
   if(!/^slots\[\d+\]$/.test(row.path)||!row.fields.ID)continue;
   const item=slots.find(child=>child.path===row.path+'.item');
   if(!item?.fields.ID||mappings.some(existing=>existing.path===row.path))continue;
   mappings.push({path:row.path,slotId:row.fields.ID,itemId:item.fields.ID,name:item.fields.name||null,identitySource:'travelData.slots[].ID + item.ID'});
  }
  const unique=new Set(mappings.map(row=>row.slotId)).size===mappings.length;
  const nativeLabels=[...document.querySelectorAll('#travel-root [class*="inventorySlot"] button[aria-label]')].slice(0,60).map(node=>node.getAttribute('aria-label')).filter(v=>v&&v.length<=120&&!/[<>]/.test(v));
  return {capacities,schema:schema.slice(0,300),slots:slots.slice(0,80),mappings,uniqueSlotIds:unique,nativeLabels,mappingState:mappings.length&&unique?'explicit-identities-observed-unvalidated':'unresolved',directTravelUseEnabled:false};
 }
 function useInfo(data){
  const flags={};for(const key of ['success','itemRemoved','useAnother']){const value=data?.[key];flags[key]={type:typeof value,value:typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)?value:null};}
  const message=String(data?.message||data?.text||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').toLowerCase();
  const still=/still.{0,30}hospital|remain.{0,30}hospital/.test(message),released=!still&&/you (?:are|have been) (?:now )?(?:out of|released from) (?:the )?hospital/.test(message);
  const hospitalized=!released&&/\byou (?:are|have been|were) (?:now )?(?:hospitali[sz]ed|(?:put |placed )?in (?:the )?hospital)\b|\byou hospitali[sz]ed yourself\b/.test(message);
  let seconds=0;for(const match of message.matchAll(/\b(\d+)\s*(hours?|minutes?|seconds?)\b/g))seconds+=Number(match[1])*({h:3600,m:60,s:1}[match[2][0]]);
  return {hospitalization: data?.success===true&&hospitalized?'explicit-hospital-message':'unconfirmed',hospitalSeconds:hospitalized&&seconds>0?Math.min(seconds,604800):null,flags,consumption:data?.success===true&&data?.itemRemoved===true?'server-reported-removal-needs-inventory-check':'unconfirmed',hospitalRelease:still?'still-hospitalized':released&&data?.success===true?'explicit-release-message-needs-status-check':'unconfirmed',directTravelUseEnabled:false};
 }
 function responseInfo(entry,status,text){if(!active||!entry)return;entry=canonical(entry);const response={state:'received',httpStatus:status,elapsedMs:Math.max(0,now()-entry.started),format:'text',keys:[],success:null,signals:[]};try{const data=JSON.parse(String(text).slice(0,512000));response.format='json';response.keys=Object.keys(data||{}).slice(0,40).map(name);response.success=typeof data?.success==='boolean'?data.success:null;response.errorCode=Number.isFinite(data?.error?.code)?data.error.code:null;const step=entry.query.find(f=>f.name==='step')?.value;if(step==='inventory')response.inventory=inventoryInfo(data);if(step==='useItem')response.itemUse=useInfo(data);const message=typeof data?.text==='string'?data.text:typeof data?.message==='string'?data.message:'';for(const signal of ['hospital','cooldown','life','used','confirm','error','wrong item','bought','travel'])if(message.toLowerCase().includes(signal))response.signals.push(signal);}catch{response.format=/<[a-z][\s\S]*>/i.test(String(text))?'html':'text';}entry.response=response;delete entry.started;schedule();}
 function observeResources(){try{const C=pageWindow.PerformanceObserver||window.PerformanceObserver;if(!C)return;const since=(pageWindow.performance||window.performance).now();resourceObserver=new C(list=>{if(!active)return;for(const entry of list.getEntries()){if(entry.startTime<since||!['fetch','xmlhttprequest'].includes(entry.initiatorType))continue;const target=route(entry.name);if(!target||/chat|message|mail|login|auth|password|captcha|security|forum/i.test(target.path+'?'+target.query.map(f=>f.name+'='+f.value).join('&')))continue;if(!document.querySelector('#travel-root')&&!/travel|item\.php/i.test(target.path))continue;resources.push({at:new Date(now()).toISOString(),build,...target,initiatorType:entry.initiatorType,durationMs:Number.isFinite(entry.duration)?entry.duration:null});if(resources.length>120)resources.shift();counters.resourceEntries++;schedule();}});resourceObserver.observe({type:'resource',buffered:true});}catch{resourceObserver=null;}}
 function navigation(){if(active){const info=route(window.location.href);if(info)action('navigation',info);flush();}}
 function pagehide(){if(active){navigation();flush();}}
 function stop(){if(active)action('recording-stop');active=false;resumeActive=false;window.clearTimeout(flushTimer);flushTimer=null;document.removeEventListener('click',markNativeClick,true);document.removeEventListener('pointerdown',markNativeClick,true);resourceObserver?.disconnect();resourceObserver=null;document.removeEventListener('change',quantityChanged,true);window.removeEventListener('pagehide',pagehide);for(const type of ['pageshow','popstate','hashchange'])window.removeEventListener(type,navigation);try{if(wrappedFetch&&pageWindow.fetch===wrappedFetch)pageWindow.fetch=oldFetch;}catch{}try{if(wrappedOpen&&pageWindow.XMLHttpRequest?.prototype.open===wrappedOpen)pageWindow.XMLHttpRequest.prototype.open=oldOpen;}catch{}try{if(wrappedSend&&pageWindow.XMLHttpRequest?.prototype.send===wrappedSend)pageWindow.XMLHttpRequest.prototype.send=oldSend;}catch{}for(const [xhr,handlers] of listeners)for(const handler of handlers)xhr.removeEventListener('loadend',handler);listeners.clear();hooks.fetch=hooks.xhr=false;installed=false;lastAction=lastUserAction=recentPointer=null;banner?.remove();banner=null;flush();}
 function install(){if(installed&&pageWindow.fetch===wrappedFetch&&(!pageWindow.XMLHttpRequest||pageWindow.XMLHttpRequest.prototype.open===wrappedOpen&&pageWindow.XMLHttpRequest.prototype.send===wrappedSend))return;
  if(pageWindow.fetch!==wrappedFetch)try{oldFetch=pageWindow.fetch;if(typeof oldFetch==='function'){const priorFetch=oldFetch;wrappedFetch=function(input,init){if(!active)return priorFetch.apply(this,arguments);counters.fetchCalls++;const entry=begin(input,init?.method||input?.method||'GET',init?.body);if(entry&&init?.body===undefined&&typeof input?.clone==='function')try{entry.bodyState='pending';const copy=input.clone();copy.text().then(value=>setBody(entry,value)).catch(()=>{if(active&&canonical(entry).bodyState==='pending')canonical(entry).bodyState='unparsed';});}catch{entry.bodyState='unparsed';}const result=priorFetch.apply(this,arguments);if(!entry)return result;return result.then(resp=>{if(entry&&active&&responseOwner(entry,resp)===entry)try{resp.clone().text().then(text=>responseInfo(entry,resp.status,text)).catch(()=>{});}catch{}return resp;},error=>{if(entry&&active){entry.response={state:'network-error'};delete entry.started;schedule();}throw error;});};pageWindow.fetch=wrappedFetch;hooks.fetch=pageWindow.fetch===wrappedFetch;}}catch{hooks.fetch=false;}
  try{const proto=pageWindow.XMLHttpRequest?.prototype;if(proto&&(proto.open!==wrappedOpen||proto.send!==wrappedSend)){oldOpen=proto.open;oldSend=proto.send;const priorOpen=oldOpen,priorSend=oldSend;wrappedOpen=function(method,url){if(active)xhrMeta.set(this,{method,url,transaction:{}});return priorOpen.apply(this,arguments);};wrappedSend=function(body){if(active)counters.xhrSends++;const meta=xhrMeta.get(this),entry=meta?begin(meta.url,meta.method,body):null;if(entry){const handlers=listeners.get(this)||new Set();const handler=()=>{handlers.delete(handler);if(!handlers.size)listeners.delete(this);if(!active)return;let text='';try{text=this.responseType==='json'?JSON.stringify(this.response):this.responseText;}catch{}if(responseOwner(entry,meta.transaction)===entry)responseInfo(entry,this.status,text);};handlers.add(handler);listeners.set(this,handlers);this.addEventListener('loadend',handler,{once:true});}return priorSend.apply(this,arguments);};proto.open=wrappedOpen;proto.send=wrappedSend;hooks.xhr=proto.open===wrappedOpen&&proto.send===wrappedSend;}}catch{hooks.xhr=false;}
  installed=hooks.fetch||hooks.xhr;
 }
 function start(event){if(event&&event.isTrusted!==true)return false;if(active){install();return true;}active=true;resumeActive=true;lastAction=lastUserAction=null;
  install();observeResources();
  document.addEventListener('click',markNativeClick,true);document.addEventListener('pointerdown',markNativeClick,true);document.addEventListener('change',quantityChanged,true);window.addEventListener('pagehide',pagehide);for(const type of ['pageshow','popstate','hashchange'])window.addEventListener(type,navigation);action('recording-start',{path:window.location.pathname});flush();return true;
 }
 return {activity:()=>({active,records:records.map(record=>({id:record.id,at:record.at,method:record.method,path:record.path,step:record.query?.find(field=>field.name==='step')?.value||null,response:record.response?{state:record.response.state,httpStatus:record.response.httpStatus,elapsedMs:record.response.elapsedMs}:null}))}),clear(){const running=active;stop();records=[];actions=[];resources.length=0;droppedRequests=droppedActions=sequence=0;for(const key of Object.keys(counters))counters[key]=0;flush();if(running)start();},inventoryInfo,useInfo,install,start,stop,resume(){if(resumeActive)start();},markNativeClick,canStart:()=>true,report:()=>({schemaVersion:1,active,build,instrumentedAt,documentState:document.readyState,documentMatchesPage:pageWindow.document===document,persistenceState,counters:{...counters},resourceEndpoints:resources.map(r=>({...r,query:r.query.map(f=>({...f}))})),hooks:{...hooks},records:records.map(({started,...record})=>JSON.parse(JSON.stringify(record))),actions:actions.map(a=>({...a,query:a.query?.map(f=>({...f}))})),droppedRequests,droppedActions,limits:{requests:300,actions:300},scope:'Same-origin travel/item fetch and XHR, native travel controls and sanitized navigation; continuous until diagnostics stop',excluded:['cookies','headers','RFC/CSRF/token values','raw response bodies','chat traffic','API keys'],limitation:'An observed request identifies a candidate contract, not an approved replay template. Top-level document requests, WebSockets, service-worker traffic and unrecognized routes may not be captured.'})};
};page.__TU_DIRECT_ITEMS_CAPTURE__=create({window:page,document:page.document,pageWindow:page,build:"0.5.42.103-dev"});page.__TU_DIRECT_ITEMS_CAPTURE__.install();}}catch{}})();

(()=>{
 const owner=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
 const version="0.5.42.103-dev";
 const previous=owner.__TU_DEV_STARTUP__;
 if(previous?.build===version&&['waiting-for-body','starting','ready'].includes(previous.phase))return;
 const status={build:version,phase:'waiting-for-body',at:new Date().toISOString(),error:null};owner.__TU_DEV_STARTUP__=status;
  let tuPrivateManager;
  const tuPrepareBackend=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
  const start=()=>{
  status.phase='starting';
  try{

(() => {
  'use strict';
const createDataDeletion=function createDataDeletion({readJob,saveJob,removeJob,request,verify,entries,stop,cleanup,random}){
 let running=false;
 return {pending:()=>!!readJob(),async run(key,notify=()=>{}){
  if(running)throw Error('Deletion already running');running=true;
  try{
   stop();let job=readJob();
   if(!job){
    const owner=await verify(key);
    for(const entry of entries())if(!entry.playerId)await verify(entry.key);
    job={id:String(owner.playerId),receipt:random()};
    saveJob(job);
   }
   stop();notify('Deleting TU account data. Keep this installation open; an interrupted deletion can be resumed.');
   if(!job.remoteReady){const result=await request({receipt:job.receipt,...(key?{api_key:key}:{})});key='';
    if(!result.ready_for_local_cleanup&&!result.complete){notify('Remote cleanup pending. Retry shortly to check completion.');return false;}
    job.remoteReady=true;job.sessionHashes=result.session_hashes||[];job.roomHashes=result.room_hashes||[];saveJob(job);
   }
   await cleanup(job.id,job.sessionHashes,job.roomHashes);const final=await request({receipt:job.receipt,cleanup_ack:true});if(!final.complete)throw Error('Final remote cleanup incomplete');removeJob();notify('Your TU registration, supplied credentials and associated identifying data have been deleted from this installation and active TU service storage. Access has ended. Enter an API key and accept the current agreement to return.');return true;
  }finally{running=false;}
 }};
};
const renderAgreementMarkdown=function renderAgreementMarkdown({document,markdown}) {
 const root=document.createElement('div');root.className='tu-agreement-content';
 root.style.cssText='min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important;white-space:normal!important;';
 function inline(parent,value){
  const pattern=/\[([^\]\n]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*/g;let cursor=0,match;
  while((match=pattern.exec(value))){parent.append(document.createTextNode(value.slice(cursor,match.index)));let node;
   if(match[3]){node=document.createElement('strong');node.textContent=match[3];}
   else{let url;try{url=new URL(match[2]);}catch{}if(url?.protocol==='https:'){node=document.createElement('a');node.href=url.href;node.target='_blank';node.rel='noopener noreferrer';node.textContent=match[1];node.style.cssText='color:#f1ce72!important;overflow-wrap:anywhere!important;white-space:normal!important;';}else node=document.createTextNode(match[0]);}
   parent.append(node);cursor=pattern.lastIndex;
  }parent.append(document.createTextNode(value.slice(cursor)));
 }
 const lines=String(markdown||'').replace(/\r\n?/g,'\n').split('\n');let index=0;
 const textStyle='display:block!important;position:static!important;margin:0 0 9px!important;padding:0!important;font:400 11px/1.65 system-ui!important;color:#e3e8ec!important;white-space:normal!important;overflow-wrap:anywhere!important;min-width:0!important;max-width:100%!important;';
 while(index<lines.length){const line=lines[index].trim();if(!line){index++;continue;}
  const heading=/^(#{1,3})\s+(.+)$/.exec(line);
  if(heading){const node=document.createElement(heading[1].length===1?'h2':heading[1].length===2?'h3':'h4');inline(node,heading[2]);node.style.cssText=textStyle+'margin:13.5px 0 7.5px!important;font-weight:700!important;font-size:'+(heading[1].length===1?'19':'15')+'px!important;';root.append(node);index++;continue;}
  if(line.startsWith('|')){
   const rows=[];while(index<lines.length&&lines[index].trim().startsWith('|')){const cells=lines[index].trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());if(!cells.every(cell=>/^:?-+:?$/.test(cell)))rows.push(cells);index++;}
   if(!rows.length)continue;const table=document.createElement('table');table.style.cssText='display:table!important;position:static!important;width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;margin:6px 0 15px!important;color:#e3e8ec!important;font:400 11px/1.55 system-ui!important;';
   const head=document.createElement('thead'),body=document.createElement('tbody');head.style.cssText='display:table-header-group!important;';body.style.cssText='display:table-row-group!important;';
   rows.forEach((values,rowIndex)=>{const tr=document.createElement('tr');tr.style.cssText='display:table-row!important;';values.forEach((value,column)=>{const th=rowIndex===0||column===0;const cell=document.createElement(th?'th':'td');if(th)cell.scope=rowIndex===0?'col':'row';inline(cell,value);cell.style.cssText='display:table-cell!important;position:static!important;float:none!important;box-sizing:border-box!important;padding:6.75px!important;border:1px solid #806a3e!important;vertical-align:top!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;color:#e3e8ec!important;font:400 11px/1.55 system-ui!important;'+(th?'background:#253039!important;font-weight:600!important;':'background:#182026!important;')+(values.length===2?'width:'+(column===0?'29':'71')+'%!important;':'');tr.append(cell);});(rowIndex===0?head:body).append(tr);});table.append(head,body);root.append(table);continue;
  }
  if(line.startsWith('- ')){const list=document.createElement('ul');list.style.cssText=textStyle+'padding-left:16.5px!important;';while(index<lines.length&&lines[index].trim().startsWith('- ')){let value=lines[index++].trim().slice(2);while(index<lines.length&&/^\s{2,}\S/.test(lines[index]))value+=' '+lines[index++].trim();const item=document.createElement('li');item.style.cssText='display:list-item!important;white-space:normal!important;overflow-wrap:anywhere!important;margin:0 0 6px!important;';inline(item,value);list.append(item);}root.append(list);continue;}
  const paragraph=[line];index++;while(index<lines.length&&lines[index].trim()&&!/^(#{1,3}\s|\||- )/.test(lines[index].trim()))paragraph.push(lines[index++].trim());const node=document.createElement('p');node.style.cssText=textStyle;inline(node,paragraph.join(' '));root.append(node);
 }return root;
};
const createApiDisclosure=function createApiDisclosure({document,storageMode='origin-local',content}) {
 const match=String(content||'').match(/^## 2\.[\s\S]*?(?=^## 3\.)/m);
 if(!match||!match[0].includes('| Disclosure |'))throw Error('Agreement disclosure tables are unavailable');
 const section=document.createElement('section');section.dataset.tuKeyDisclosure='true';section.setAttribute('aria-label','API key and data use disclosure');section.style.cssText='min-width:0;max-width:100%;overflow-wrap:anywhere;white-space:normal;';
 const notice=document.createElement('p');notice.style.cssText='font:400 11px/1.6 system-ui;white-space:normal;overflow-wrap:anywhere;';
 notice.textContent=storageMode==='userscript-private'?'This host uses unencrypted userscript-manager storage for saved credentials. Typing or revealing a key places it in the page input.':storageMode==='private-unavailable'?'Private credential storage is unavailable. TU will not silently fall back to origin storage.':'This host uses unencrypted Torn-origin storage. Other scripts on Torn may read saved keys or session credentials.';
 section.append(notice,renderAgreementMarkdown({document,markdown:match[0]}));return section;
};
const TU_API_DISCLOSURE_TEXT="## 2. API keys, access and required disclosures\n\nTU never asks for your Torn password. Obtain your key directly from Torn and use\nthe least access needed for the features you choose. Registration accepts\n**Public Only or Limited Access** keys. Full Access is not required or accepted\nfor registration. Providing a Limited Access key is not permission to retrieve\nevery selection available through that key.\n\nTU verifies the key's access level and account owner with Torn. You should not\nneed to supply a name or player ID separately for verification. TU may retain\nyour verified Torn name and ID as described below. You may remove your\nidentifying information through Settings > API > Delete My TU Data, as\ndescribed in section 6.\n\nThe public Torn API is read-only. TU uses it for information requests. Supported\nSnatch and Run item-use requests instead use your signed-in Torn website session\nand Torn's security token. They are website gameplay actions, not writes through\nthe public API.\n\nThe following tables describe storage, recipients, purpose, key handling and\nrequired access. The same information must be clearly visible at every place\nTU asks you to provide a key. A hidden link alone does not replace that\nkey-entry disclosure.\n\n### Account verification, TU access and agreement records\n\n| Disclosure | Details |\n|---|---|\n| Data storage | TU stores verified identity, access permissions, agreement events, session metadata and audit records until cleared through the deletion process in section 6 or otherwise removed by the service. Delete My TU Data removes your identifying information from TU-controlled active storage and invalidates your TU access. Non-identifying service records may remain. Provider logs, backups and separately exported copies have the limits described in section 6. Expiry of access alone is not deletion. |\n| Data sharing | You, authorized TU operators, Torn for verification, and hosting providers processing TU's service. Account and session records are not intended to be public records. |\n| Purpose of use | Verify identity and access, maintain sessions, record agreement decisions and investigate abuse. |\n| Key storage and sharing | Saved keys use the storage mode explained in section 3. Registration sends the selected key over HTTPS to TU's backend, which sends it to Torn for verification. The key is processed during verification; raw keys are not written to TU's application database. Provider logging is separate from application database behavior. |\n| Required access / selections | Public Only or Limited Access; key information and public user identity selections. Full Access is not accepted for registration. |\n\n### Travel Assistant and Item Monitor reads\n\n| Disclosure | Details |\n|---|---|\n| Data storage | Settings, verified identity and feature caches are stored in your browser until cleared, replaced or expired by the feature. Delete My TU Data clears the selected account’s identity and credentials from this TU installation, including private manager storage and supported fallback copies. Non-identifying settings need not be erased. Other installations and exported copies are covered in section 6. |\n| Data sharing | You and Torn. Reporting to TU is described separately below. |\n| Purpose of use | Display item and price information; calculate travel and purchase capacity; check travel, hospital and inventory status; monitor availability. This supplies gameplay and competitive information, not a guarantee of availability or profit. |\n| Key storage and sharing | The selected saved key is sent to Torn for enabled reads. Saving a key does not authorize publishing it or private API data to other players. |\n| Required access / selections | Public profile and item catalog. Verified Limited Access for private travel, medical inventory and cooldown reads where used. Any item-market read must use the access allowed by Torn for its endpoint and version. |\n\n### War Organizer and enabled player/faction features\n\n| Disclosure | Details |\n|---|---|\n| Data storage | Settings, fetched information and feature caches may be retained locally until cleared or replaced. |\n| Data sharing | You and Torn. A feature that shares a board or information must identify its recipients before sharing. |\n| Purpose of use | Display player/faction information and organize targets or reservations for gameplay planning and competitive information. |\n| Key storage and sharing | The selected feature key is sent to Torn for the requested read. A key's technical access is not consent to unrelated retrieval or disclosure. |\n| Required access / selections | Only the supported faction-member, faction-snapshot and player-profile selections needed for the feature. Verified Limited Access is required where the feature uses it. Additional private selections must be disclosed before use. |\n\n### Optional foreign-stock reporting and travel feedback\n\n| Disclosure | Details |\n|---|---|\n| Data storage | TU keeps a bounded local history and pending upload queue. Accepted observations and feedback are stored remotely and may remain indefinitely. Delete My TU Data removes account-identifying links and related personal information; non-identifying stock observations, feedback and aggregate statistics may remain. Pending delivery is stopped when TU access is removed. |\n| Data sharing | TU operators and hosting providers. Stock observations, history and derived estimates may be available to the general public. A submission's TU session allows the service to associate the request with a verified account; reporting is not represented as anonymous. |\n| Purpose of use | Community stock history, depletion/restock estimates, travel planning and evaluation of forecasts. This provides gameplay information and a competitive advantage to users of that information. |\n| Key storage and sharing | Stock and feedback payloads do not include a raw Torn API key. Authenticated delivery sends a TU session token to TU. Account identities and session tokens are not intended to be public fields in the stock data service. |\n| Required access / selections | Reading the visible page for an observation requires no Torn API read. Authenticated submission requires TU registration, the relevant module permission and the current agreement. Any separate API reads use the access disclosed for their feature. |\n\n### Security and request-limit counters\n\n| Disclosure | Details |\n|---|---|\n| Data storage | Rate-limit counters hold timestamps and hashed key, account or IP identifiers as needed. The active windows are 70 seconds for registration and 60 seconds for submissions. Expired entries stop counting; scheduled cleanup removes expired counter entries when it runs. Identifying limiter state that TU can associate with your account is included in the deletion process. Provider logs and backups have the limits in section 6. |\n| Data sharing | TU's service and hosting provider; authorized operators may access service state. These hashes are pseudonymous identifiers, not a promise of anonymity. |\n| Purpose of use | Enforce service limits, reduce repeated failed verification and protect reporting/database capacity. |\n| Key storage and sharing | Limiter state does not contain raw API keys or raw TU session tokens. Verification and authenticated requests still process their credentials as disclosed in the other rows. |\n| Required access / selections | No additional Torn API access merely to maintain these counters. |\n\n### Chat archives and local diagnostic reports\n\n| Disclosure | Details |\n|---|---|\n| Data storage | Chat capture remains in the feature's local session until cleared or the session ends. Diagnostic histories use bounded local/session storage. Delete My TU Data removes your identifying information from TU-managed local caches and histories on this installation. It does not erase other players’ information generally or recall files you exported, copied or shared. Those copies remain wherever you saved or shared them. |\n| Data sharing | You and any recipients you choose for an export. Enabling diagnostics does not itself authorize uploading a full diagnostic report or chat archive to TU. |\n| Purpose of use | Your conversation archive, troubleshooting, development testing and support. |\n| Key storage and sharing | Reports are designed to omit API keys, cookies, authentication headers and security-token values. They can still contain personal or gameplay information. Inspect reports before sharing; redaction is not a guarantee that every sensitive detail has been removed. |\n| Required access / selections | No additional key for local capture of page information already available to you. Accompanying API reads use the access disclosed for their feature. |\n\n### TU multiplayer games and shared results\n\n| Disclosure | Details |\n|---|---|\n| Data storage | TU stores room activity, participant identifiers, session metadata and game records needed by the feature. Delete My TU Data removes your identifying information and account links and invalidates your room/session credentials. Results or history may remain only without personal information that identifies or reconnects them to you. Other players’ records are not deleted by your request. |\n| Data sharing | TU operators and hosting providers; room participants and users of the applicable shared results or history. |\n| Purpose of use | Operate TU multiplayer rooms, games, results and related community features. |\n| Key storage and sharing | Games use TU sessions and room credentials. Raw Torn API keys are not sent to other players as game data. Registration is disclosed above. |\n| Required access / selections | No additional Torn API access merely to play a TU multiplayer game. |\n\n\n## 3.";
const createTornApiGovernor=function createTornApiGovernor({window,now=()=>Date.now(),limit=60,periodMs=60000,storageKey='tu:torn-api-budget:v1'}){
 let serial=Promise.resolve();const forgotten=new Set();
 const fail=(message,code,retryAfterMs=0)=>Object.assign(Error(message),{code,retryAfterMs});
 // Fingerprints are identifiers, never credentials or authentication proofs.
 // Two independent 32-bit accumulators avoid persisting the raw API key here.
 function fingerprint(key){let a=2166136261,b=2246822519;for(const ch of key){a=Math.imul(a^ch.charCodeAt(0),16777619);b=Math.imul(b^ch.charCodeAt(0),3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
 function identify(input,options={}){let url;try{url=new URL(typeof input==='string'?input:input.url,window.location.origin);}catch{return null;}if(url.origin!=='https://api.torn.com')return null;let key=url.searchParams.get('key')||'';try{const headers=new window.Headers(options.headers||input?.headers||{});key=String(headers.get('Authorization')||'').replace(/^ApiKey\s+/i,'')||key;}catch{for(const [name,value] of Object.entries(options.headers||{}))if(name.toLowerCase()==='authorization')key=String(value).replace(/^ApiKey\s+/i,'');}return {id:fingerprint(key),keyPresent:!!key,revalidate:options.tuApiRevalidate===true&&/^\/v2\/key\/info\/?$/.test(url.pathname)};}
 function load(){let value;try{value=JSON.parse(window.localStorage.getItem(storageKey)||'null');}catch{value=null;}const time=now();return {times:(Array.isArray(value?.times)?value.times:[]).filter(t=>Number.isFinite(t)&&t>time-periodMs&&t<=time).slice(-100),blocked:Object.fromEntries(Object.entries(value?.blocked||{}).filter(([k,v])=>/^[a-f0-9]{16}$/.test(k)&&[1,2,10,13,18,'TU_VERIFICATION_REJECTED'].includes(v?.code)).slice(-100)),pauseUntil:Number.isFinite(value?.pauseUntil)?Math.min(value.pauseUntil,time+300000):0};}
 function save(state){window.localStorage.setItem(storageKey,JSON.stringify(state));}
 function transaction(update){const task=async()=>{if(window.navigator?.locks?.request)return window.navigator.locks.request(storageKey,{mode:'exclusive'},()=>{const state=load(),result=update(state);save(state);return result;});const state=load(),result=update(state);save(state);return result;};const next=serial.then(task,task);serial=next.catch(()=>{});return next;}
 async function reserve(target){return transaction(state=>{if(!target.keyPresent)throw fail('A Torn API key is required.','TU_API_KEY_MISSING');if(state.blocked[target.id]&&!target.revalidate)throw fail('This Torn API key is suspended. Use Verify in API Keys after correcting or reactivating it.','TU_API_KEY_SUSPENDED');if(state.pauseUntil>now())throw fail('Torn API requests are temporarily paused. Retry after the cooldown.','TU_API_COOLDOWN',state.pauseUntil-now());if(state.times.length+(target.cost||1)>limit)throw fail('TU API request budget reached. Wait before requesting more data.','TU_API_RATE_LIMIT',state.times[0]+periodMs-now());for(let n=0;n<(target.cost||1);n++)state.times.push(now());});}
 async function observe(target,status,data){if(forgotten.has(target.id))return;const code=Number(data?.error?.code);await transaction(state=>{if([1,2,10,13,18].includes(code))state.blocked[target.id]={code,at:now()};if([5,8].includes(code)||[429,503].includes(Number(status)))state.pauseUntil=Math.max(state.pauseUntil,now()+periodMs);if(target.revalidate&&Number(status)>=200&&Number(status)<300&&!data?.error&&data?.info?.user?.id&&data?.info?.access)delete state.blocked[target.id];});}
 async function inspect(result){if(result?.clone){try{return await result.clone().json();}catch{return null;}}let data=result?.responseText??result?.body??result?.data??result;try{return typeof data==='string'?JSON.parse(data):data;}catch{return null;}}
 async function run(input,options,send){const target=identify(input,options);if(!target)return send();if(String(options?.method||input?.method||'GET').toUpperCase()!=='GET')throw fail('Only read-only Torn API requests are supported.','TU_API_METHOD');await reserve(target);const response=await send();await observe(target,response?.status??200,await inspect(response));return response;}
 async function fetch(input,options={},transport=window.fetch.bind(window)){const {tuApiRevalidate,...forwarded}=options;return run(input,options,()=>transport(input,forwarded));}
 function request(details,transport){let stopped=false,handle;const options={...details};delete options.tuApiRevalidate;const target=identify(details.url,details);if(!target)return transport(options);
  Promise.resolve().then(async()=>{if(String(details.method||'GET').toUpperCase()!=='GET')throw fail('Only read-only Torn API requests are supported.','TU_API_METHOD');await reserve(target);if(stopped)return;handle=transport({...options,onload:response=>{if(stopped)return;observe(target,response.status,(()=>{try{return JSON.parse(response.responseText);}catch{return null;}})()).then(()=>{if(!stopped)details.onload?.(response);},()=>{if(!stopped)details.onerror?.({error:'TU API budget storage unavailable'});});},onerror:error=>{if(!stopped)details.onerror?.(error);},ontimeout:error=>{if(!stopped)details.ontimeout?.(error);}});}).catch(error=>{if(!stopped)details.onerror?.({error:error.message,code:error.code,retryAfterMs:error.retryAfterMs});});
  return {abort(){stopped=true;handle?.abort?.();}};
 }
 return {fetch,request,run,forgetKeys:keys=>transaction(state=>{for(const key of keys){const id=fingerprint(String(key));forgotten.add(id);delete state.blocked[id];}}),isKeySuspended:key=>!!load().blocked[fingerprint(String(key||''))],suspendVerification:key=>transaction(state=>{state.blocked[fingerprint(String(key||''))]={code:'TU_VERIFICATION_REJECTED',at:now()};}),reserveVerification:key=>reserve({id:fingerprint(String(key||'')),keyPresent:!!key,revalidate:false,cost:2}),snapshot(){const state=load();return {limit,periodMs,used:state.times.length,remaining:Math.max(0,limit-state.times.length),pausedUntil:state.pauseUntil,blockedKeyCount:Object.keys(state.blocked).length,crossTabAtomic:!!window.navigator?.locks?.request};}};
};
const createCredentialStore=function createCredentialStore({window,handler='',pda=false,getValue,setValue,deleteValue}){
 const PRIVATE='tu:credentials:private:v1',REVISION='tu:credentials:revision:v1';
 const VAULT='tu:identity:public-only-key:v1',RING='tu:identity:saved-keys:v1',WHO='tu:who:limited-api-key:v1',EXTRAS='tu:api:additional-keys:v1',CLEARED='tu:identity:login-cleared:v1';
 const fields=[VAULT,RING,WHO,EXTRAS,CLEARED,'tu:dev:deletion-job:v1'],secrets=[VAULT,RING,WHO,EXTRAS];
 const privateCapable=!pda&&/^(Tampermonkey|Violentmonkey|Greasemonkey)$/i.test(handler)&&typeof getValue==='function'&&typeof setValue==='function';
 let error=null;
 const key=value=>{if(typeof value!=='string')return null;value=value.trim();for(let n=0;n<3;n++){if(typeof value!=='string')return null;if(value.startsWith('GMV2_')){value=value.slice(5);continue;}if(value.startsWith('\"'))try{value=JSON.parse(value);continue;}catch{}break;}return typeof value==='string'&&/^[A-Za-z0-9]{16}$/.test(value)?value:null;};
 function readPrivate(){const raw=getValue(PRIVATE,null);if(raw&&typeof raw.then==='function')throw Error('Asynchronous credential storage is unsupported');if(raw===null||raw===undefined)return null;const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.schema!==1||!data.values||typeof data.values!=='object'||Array.isArray(data.values))throw Error('Private credential record is invalid');return {schema:1,values:Object.fromEntries(fields.filter(k=>typeof data.values[k]==='string').map(k=>[k,data.values[k]]))};}
 function persist(data){const text=JSON.stringify({schema:1,values:Object.fromEntries(fields.filter(k=>typeof data.values[k]==='string').map(k=>[k,data.values[k]]))}),result=setValue(PRIVATE,text);if(result&&typeof result.then==='function')throw Error('Asynchronous credential storage is unsupported');if(JSON.stringify(readPrivate())!==text)throw Error('Private credential write could not be verified');}
 function notify(){try{window.localStorage.setItem(REVISION,window.crypto.randomUUID());}catch{}}
 function migrate(){let current=readPrivate(),next=current?{schema:1,values:{...current.values}}:{schema:1,values:{}};const legacy=Object.fromEntries(fields.map(k=>[k,window.localStorage.getItem(k)]));let oldGM='';try{oldGM=getValue(VAULT,'');}catch{}
  for(const k of fields)if(next.values[k]===undefined&&typeof legacy[k]==='string')next.values[k]=legacy[k];
  if(!next.values[VAULT]&&next.values[CLEARED]!=='1'&&key(oldGM))next.values[VAULT]=key(oldGM);
  // Keep conflicting legacy login/role keys as additional unverified entries, never replace an existing private selection.
  const entries=new Map();function add(value){if(!value||typeof value!=='object'||!key(value.key))return;if(!entries.has(value.key))entries.set(value.key,{...value});}
  for(const raw of [next.values[RING],legacy[RING]])try{const list=JSON.parse(raw||'[]');if(Array.isArray(list))list.forEach(add);}catch{}
  for(const raw of [next.values[EXTRAS],legacy[EXTRAS]])try{const list=JSON.parse(raw||'[]');if(Array.isArray(list))for(const entry of list)add({key:entry?.key,level:null,playerId:null,verifiedAt:null});}catch{}
  for(const value of [next.values[VAULT],legacy[VAULT],next.values[WHO],legacy[WHO],next.values[CLEARED]==='1'?null:oldGM])if(key(value))add({key:key(value),level:null,playerId:null,verifiedAt:null});
  next.values[RING]=JSON.stringify([...entries.values()]);
  persist(next); // Verify the complete private copy before deleting any origin credential.
  for(const k of secrets)window.localStorage.removeItem(k);
  try{if(deleteValue)deleteValue(VAULT);else setValue(VAULT,'');}catch{}
  if(!current)notify();
 }
 if(privateCapable)try{migrate();}catch{error='Private credential storage or migration is unavailable. Existing credentials were not intentionally discarded; no insecure fallback will be used.';}
 function ensure(){if(error)throw Error(error);}
 return {mode:privateCapable?(error?'private-unavailable':'userscript-private'):'origin-local',revisionKey:REVISION,
  get(name){if(!fields.includes(name))throw Error('Unsupported credential field');if(!privateCapable)return window.localStorage.getItem(name);ensure();return readPrivate()?.values[name]??null;},
  set(name,value){if(!fields.includes(name)||typeof value!=='string')throw Error('Invalid credential field');if(!privateCapable){window.localStorage.setItem(name,value);return;}ensure();const data=readPrivate()||{schema:1,values:{}};const changed=data.values[name]!==value;data.values[name]=value;persist(data);window.localStorage.removeItem(name);if(changed&&[VAULT,CLEARED].includes(name))notify();},
  remove(name){if(!fields.includes(name))throw Error('Unsupported credential field');if(!privateCapable){window.localStorage.removeItem(name);return;}ensure();const data=readPrivate()||{schema:1,values:{}};const changed=data.values[name]!==undefined;delete data.values[name];persist(data);window.localStorage.removeItem(name);if(changed&&[VAULT,CLEARED].includes(name))notify();},
  eraseKeys(values){
   const removed=new Set(values.map(key).filter(Boolean));
   const clean=(name,value)=>{if([VAULT,WHO].includes(name))return removed.has(key(value))?null:value;if([RING,EXTRAS].includes(name)){const list=JSON.parse(value||'[]');if(!Array.isArray(list))throw Error('Unrecognized legacy credential list');return JSON.stringify(list.filter(entry=>!removed.has(key(entry?.key))));}return value;};
   for(const name of secrets){const value=this.get(name);if(value!==null){const next=clean(name,value);if(next===null)this.remove(name);else this.set(name,next);}
    const legacy=window.localStorage.getItem(name);if(legacy!==null){const next=clean(name,legacy);if(next===null)window.localStorage.removeItem(name);else window.localStorage.setItem(name,next);}
    if(typeof getValue==='function'){const legacyGM=getValue(name,null);if(legacyGM!==null&&legacyGM!==undefined){if(typeof legacyGM!=='string')throw Error('Unrecognized legacy credential');const next=clean(name,legacyGM);if(next===null){if(deleteValue)deleteValue(name);else setValue(name,'');}else if(setValue)setValue(name,next);else throw Error('Legacy credential storage cannot be updated');}}
   }
   for(const name of secrets){for(const raw of [this.get(name),window.localStorage.getItem(name),typeof getValue==='function'?getValue(name,null):null]){if(raw==null||raw==='')continue;if([VAULT,WHO].includes(name)){if(removed.has(key(raw)))throw Error('Credential cleanup was not persisted');}else if(JSON.parse(raw).some(entry=>removed.has(key(entry?.key))))throw Error('Credential cleanup was not persisted');}}
  },
  status:()=>({mode:privateCapable?(error?'private-unavailable':'userscript-private'):'origin-local',isolated:privateCapable&&!error,error,encrypted:false})};
};
const isScopedTornRead=function isScopedTornRead(path,kind='faction') {
 if(typeof path!=='string')return false;
 const faction=/^\/v2\/faction\/(?:[1-9][0-9]{0,11}\/members|snapshot)$/.test(path);
 return faction || kind==='who' && /^\/v2\/user\/[1-9][0-9]{0,11}\/profile$/.test(path);
};

  const uiLogKey='tu:diagnostics:ui:v1';let restoredUi=[];try{restoredUi=JSON.parse(sessionStorage.getItem(uiLogKey)||'[]');}catch{}
  const uiEvents=window.__TU_UI_DIAGNOSTICS__=Array.isArray(restoredUi)?restoredUi.slice(-160):[];
  const uiTrace=window.__TU_UI_TRACE__=(event,reason='',details={})=>{const entry={at:new Date().toISOString(),event,reason,...details};uiEvents.push(entry);if(uiEvents.length>160)uiEvents.shift();try{sessionStorage.setItem(uiLogKey,JSON.stringify(uiEvents));}catch{}};
  window.addEventListener('error',event=>uiTrace('runtime-error',event.error?.name||'Error'));
  window.addEventListener('unhandledrejection',event=>uiTrace('unhandled-rejection',event.reason?.name||'Error'));

  // Tampermonkey GM-enabled scripts use an isolated window. Publish the TU API on
  // the page window so separately installed @grant none modules can register.
  const pageWindow=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const nativeBridge=pageWindow.flutter_inappwebview||window.flutter_inappwebview;
  const rawManagerHttp=typeof nativeBridge?.callHandler==='function'?details=>{
    let settled=false;const finish=(error,response)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)details.onerror?.({error:'PDA native request failed'});else details.onload?.(response);};
    const timer=setTimeout(()=>{if(settled)return;settled=true;details.ontimeout?.();},details.timeout||20000);
    const method=String(details.method||'GET').toUpperCase();
    if(!['GET','POST'].includes(method)){finish(true);return;}
    const args=[details.url,details.headers||{}];if(method==='POST')args.push(details.data||'');
    Promise.resolve().then(()=>nativeBridge.callHandler('PDA_http'+(method==='GET'?'Get':'Post'),...args)).then(response=>{
      if(!response||!Number.isFinite(Number(response.status))||Number(response.status)<=0){finish(true);return;}
      finish(false,{...response,status:Number(response.status)});
    }).catch(()=>finish(true));
  }:typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null;
  if (pageWindow.__RELAX_TORN_UTILITIES_PDA__) return;
  pageWindow.__RELAX_TORN_UTILITIES_PDA__ = true;
  const KEY = 'relaxsweety_tu_pda_v1';
  const apiGovernor=createTornApiGovernor({window});
  const rawManagerFetch=window.fetch.bind(window);
  const fetch=(input,options)=>apiGovernor.fetch(input,options,rawManagerFetch);
  const managerHttp=rawManagerHttp?details=>apiGovernor.request(details,rawManagerHttp):null;
  const TU_VERSION='0.5.42.103-dev';
  const TU_LOGO='data:image/webp;base64,UklGRkpDAABXRUJQVlA4TD1DAAAvf8AfEE0oaCNJycLj/vsXTBoi+j8B+CxXANKlVtsG9MBND8mP4BnbHEprc895UKQCrJEAAa9ZHMlKfIjZDNmScPGzReHax7SlQpFjd9OlAGVIGoftAEvXiwDgp9YDP/hdwFEkSZLk/3/iiCPN7haJkwRJH6VN7x/guLbtOlm2SRW6JeWf/5CoHK6+nhwPOSNIkmy3bRrEB/8HJKe97386LR2U1f8JgG+uHHPL/1bfj9bezvAv2l5KS0Jhql9r1u16bCyfD91mvWUACoVCOWazNy1LAJBt66HfAeW5z7q7z3cA7yIjMuCPnLYzpIQDOJhOdVCMgAA4gRwElRSZRYD22b4gWwfb2RDDMOdGQra9jfWt9yiU4/28nS+CBPyEQKlIcmU3iwnlcCmaFkWAQGHic73u05THTwpFzzzw/G4iXSJCEZ+PSpNmGZTZkvQwy1cZXaaDknF0TKZv8LVMUqYNg/Zmk8jeIsN6nQCfV9qOPCBzn7nqt5bZRiea9D3HxASAddVzfGVvs6FQuJO97NX7MAO+e51m5Dh8r0ZyXNmnWfX8Bc9IP6ve1xtNs3wuAQBgMGjbRlDMH/a2+4cQERPQqvRqvVCFhU5+oRRqSUGVERFvrdfMFzK8EW1ppcmRs3etuGjbNi3ZVutjrr0jMo51+Wzbtm3btm192bZt2zaujeM8JzNjrTnaQ2QkHz792rat2tYmSbXNfe75mZmZ/18CEYzNRLPXsWdiic1Uk5mZmdnumd0PtW3Hts22te3X/X5/ddu2zdSOeg8dKXZk954h6pV2O7KZuffILNv19fq/9z4oadt2bHLO533/qmrbtm07tkbJLMMsIBvILDNvwM4sU9u2rXZ3HdX1f+8zAZpu2zat27Zqbb2PMfVhfVxrfXt5bV7bts3oDeknOHaDDtnPts3DbWPZn6fG6L21+vwO45gkyXZtO05E7nPukx/1oQFq0dRqAJwC58J+EQOlsYnS6v+H/96956zEI9u2a9tSeh9z7XNvZqK1BhdMiqCVm4XAU7b6sg7ggZWR9SCogxaW1vDVvWfPQdu2bdO2U8ec+9q2bfve6D0lT84f5CvyDfYH2LZtWwexnbPnHBMAAf7f9q0/8aLop2O8EgP7c6Iu7NYOZR3rleuOXrmcA/Kzyg/93WdRlzHeJy5m45tv5Fv/2lc0SHD6J3/4T8rf/f6fyuunnkAuDzsgPyv84N//f9m9S/mOqwloAP/7u//qdwz1Bx4mP98HXjf5Uf//hgm3MnF3z9i6K61sRh6y4Xtv55/4P+9y9sE/dvbw/56dhQYAAADw4Ns/jj/4+3+s/xVyept+nXubL/5BefWn15YP/9vnOkACAOz++jcHe3/N2i+++98de7Bji91x88PSw5pzeM7UAybUWY8ot/kYd8wdE9td2zRyvJ1b278X7vl52n5xUj+86779oZ++/0PA9wAAAN9y/6a84td+qfcin/59163X/dxfxas8Xlff6z81aAD8RH5x/VdePjvjcjztKZ5H1r3XDdZMGaVyqmJ7NX1oJ9dTW4+0Wc8xJRJiI1ApCHcJhhq16spv88n7+/Dce+WZ//DT9z8PI9DAF3ldfbmv/Xa9Lr3Ll36vvI43BXQAfOvrj1n3+o8X3fTC3nL1edl3Jkwbb095Q9nILgxLkgXMc6Ir+pxQVGwn80ETLZncDqtwl31YLSFlkoBQhjAY9OBx8XOc4i/Lk7vX3m7HL/zjGYURyG/b4nW/8Se95/nMH7jevN+X/7q+2QSgAfzCy28t/KH7/zr3y3xcfGm/Dp/1njTewDyz2zpRVNXiEqHhCyLC5ZZHEQSoooQIS0o0PRXCRp7wlBUSoSJSSGlPku0kBj2TVsPUDdiy45x6ns82vd797V/8/w9/DehfzK/l0Vuq59/1rXk9+cAv/VV53deBDvwGb9u+k73kc3m58AosWL+AW3vvDgsNNgUmZIWoqkY1UOQpULCgwpIKEaDGcJuRcsurCiJyqyIDFEoQGQJFzJq0iH24Ulbj9FXZvRu3bn39yV9/7cdf+AxGX+z5C9zxvAJ5vXj3L/1VedFbvNV//G0D39y7bX9Hr7nni+c6+6mtk8bbnf3aicIEa5UAkPBERFTGolLUo9NgCqasEzUHBZSGRxKJsiCL1hpSY5SDjGhUUJErFFTNKHuiKQUSvhimjVyJsdasXB/23vHeHzn9k3/5+V9A/yXe9HlRb/qIAnldeOFbPPb5aUJ+s3db9/Z73d2vvKc3vuh580Drl22205xUMmEgUA0EmqgpIjglHoAPtritHs54FJxQ86JveAMglBABlVSmWqtVE7SqNouzYIfYKsYLFG7FBKokGjUoYVikvTF9nJQzp2lH7jW3vu/H//qFv/i8zyFf+Pnzyt1v+hjX3gd+8fdLnQu0l3/r98x8g73xrpd+2Q0v7Gk58ObuwqMWTLVCVE14YlAMjtXtx/3Em9UrG97J8RjNzsl+JnwUozjlZ0SFUSAhAAAoKgoLbClbtsmW2q1GWWvFTuLi4GqxB9ZUGwGwSmiA2loo6tRudpeja0a2ufODP/Ux/PlGb/7AsiqutTMv4ot//3MbeJv+7ZqXPk9veZ7HWwZ3j7d0Z591c1ete4JIkBENBmn0YF0+esN/m3rLOpjL8hj1Cj9QjuEnvFIEwIoIgIoAgAVQWCiUkFAEYC3blFPNhuZO7Y617XauNTtjBa0tDAOrMspdLVgmkDq1G6nLrvnbuvjjf/ghr8Kl/X2Im9728XEtvd8Xfzduffx/QH5hn7PkBc5ueZ7ds294etrOPt9dO7VKlNPJRKy8vSl5eGkd/+729KET94+je13+urrb6I8IB6hUJcMMQ1aYYZUsIEOgpAAkAGRJeCQQlqtAEgBpYbhVe4/jGferx4MEdoIzgRJW7GTBWJGdPCKPXvRgEh/8yXfB87zhtW6buHb2u+INvSjBq77+3wPP602Hbn166qHnZ/3jrmKiY0bizGs6j//e8c+Ody+dOHmN8um2+AndIRmpyAlDTZUYRKEaggitiAwZAAoXEED1BkQABMqFu6BQyKrChYOI+usf8VHNOE0cGKh2ow0RR5adY3+JgrQznTpvM1/Sm06Aj//t0246z+JaYRKAxv2HZzxDztqhs3HZNl+EJ8WjGtWl4azldvyXxj88f8wbxw+YfvoOyw9fM3v9Dt4wqmUtZSyFkhrBDhMdICgoA1v02EmjDaIBvVgAmAAOQ9MoRUWgBhesPGPy2XHh/s0337+5YK0obyQigVTCM5K2LYnN5PA/fPqzBYCOGp8eqzYAvvivWLrV7j9jldXmtIBVo5LISOLV6p/z9HbH6Z++0/RP32X+9nVSLStRjcoFskMAJpaR0sPiQEaADRmBqMjSmMUBQMGyDQPJaAipoCooKMBgq433WnuH02Ij47JlRlS5MCIMp9mmdqZbv+XhH1cArG316bDqALgq6zc4q7hrkcUaaEWrpiy4n+Pf9vbGqdlPmH3E6et3sNbQlamEWhTAQKRGR2RgM8oyKD0IFqHYDAFANDQuQcS4gBr7so4U0EZABYArpwpyNNqRtiiXQXFZbYpiEElZDRUj1gSXbTdrANbVp9wbfunt41ENwKasHMlsLbImIVEXypIpN15svX7W4hrzj5i+hhUDVyNylQsqozLogVjAMrAVBsUhqpSZ2GQgEGNsZSIIgjaFVXpUARlVGiIAUbTCAJDwVo/KfCz1j7R3KFudFVcTNagGUW6ACWgbxhmTzRUAm326ymaXR17AoC4duIPE3YBBgwhdmXpcvXrU/oz6ac1+gkCLWo9cERjIAAgggFFDViymF0uhsaKwjK2AYGIZKceDIoKCGDgeHYswZtSODkZBRgC1zCHgFJAo8gHnI358ZLwX78c4eCY1CvJZ+RSRMMpKWmqFnQFwJq6qh3fbn+cSLBnfoFiTLAEERKKtHoD3q8WbZi8oM1rU5mIVAY1cEARlCC1XGQSMiVpyWI2yG1uZqIVmLktpNIJtCcpUsKxIGdgMY5EuDmKThAAABABABUJLP3wbEfhAIYwPDB/V7HhBDW7FRiQAQqNKRlS1grPnuIog13sHUNEH2EyILSkzKutudZxDtzV/CwAzUsMIESiMMgQqF0Wp1aoo1iiwYCYKRCMS9BAUTRZLQ4AFmk0cC5DZREAGRbjQAEDhKgEBLwxBAQhJOR9BP7T2UM0F+w0bQIUqURcsI7VCB/py9ZwFcGe47qFCEQ1Zhtzx0Jp3dDeVUxk0hRCAgQZlogCBhNgigPDKxQHmoEw0BsqsiAwzpUeXWioac6kYaEz02EfvmFFLYLDEiFlQgALIyI1KZWCVAH74NiJW+N9vUT/gP/8rK/fq1OkgMspSb/VWEUvWw2fO7ZwCz4mr5UEAMJNfKmLDBiRAAPTiGGBQbyFjuJUMDAQ9eiyIiEZjN7psQ4lJ2YayoA0lC5EhGkGKRgRZUrYFU2gAYxoWYoMlw5gCutRSUGYEHUQtQIBq2lFuKhPHQb9HFUV0Ykl1y7JY6SfmB4Aj41PjSRfAovd4x81KSIgCBRFEUThRjgAwo5DRAISYsiHIEEYgWsYAjRm1FLbCUiHmCCwZQFgWNBxgYJaJAYCJGQEoGQWLI2AwkC4tXTKCjixEJADwU0GEqqITC7VQ82V2tk5z//m49zjAIc1PhceaALfiyEL+DKihyUoKFStRKHyCFQBAIhDCwIAJgMmyxPEC9pjo0uhlGKGUiUwjCkgbC6ME06CMoXQ0ejTERBuGxQAUg+gSgDaaGCy6CNAGuBAARANFbyzFXCyjxVLnZm/N4ceX1w+OAuxn8pP3LA8J8J/ffvyrI/ptMAFIUWkklQAJAAwAckVCYCKDUaI0AKgxkRJMjBFsAAox4KVCbNKmgkVQMlIKq1nQwmgAylxqiWSxAIYQmhKQBQQsCKIiK7O4CIQFhgwAAAKzZqsW1CJYWj1kKabwPuA78BcF0K8UtDf51bsAfpj2+XEZBKQbUKqSoxWMEAHIIRSVIQtlwsEYqE1HJKalsQfjWNoUQAVQwAbGgo4GEsRkmWWgh9LBEqMMMwDGGGOgBmgBMUYtwJIBHDGxFB1CATBEAQBwKbWGS3OryyqsnqpqwdjHVwB+7b9+vlypb/i6Au7Ky8fcaqIIZzkrF2seaSEpAFEspByACsAMY2I7aZlolGGxDDAMF8sAYHSZYIkJBGWMDSWaQOkoMLowqtSooCAUkBHEBIwZLKBLG0shIRTDxZIhJQoAFEC2BkvDYLbQix70JGtS5tDv4zMAT/gfeWX+ciV43O639otOyizVRb2qwWbUpvJWMgRCERA45V1gmEabDDaNQBREYUMwTJagIRpgYkRkNWMZmDGWFSVEj1EASyPGABkah7AABOkiAMioJaNNIJAsQknByGBFRIACIO8YRe0a81ZBnVrEBB2c4mf/5EffAo/7j6tdicfdJw38yh+e9+679/cBg3noS2sZLdUmSivaHaCIBACIrAojWlOCDA2RjQhqzFiWiQZlMUPmMHoBXQoNTEnGLGM0KJrGQC8pLjGJKQWKUQD/PSalYABLBIMAjBA1ymQAEEkJCAklMNxrzWHUEvRRH9XYfXA0+wSc/ErfUSEvH+QvfehbK/z/9LOXju9FoXeJPnW868ymdaq9CGCEciMRRAJQVrhw1KHKhBaQLcvBTaIXgiWHinY0gAApEE0WqriZECnZdIlhaQkIJFKyGTYRgkEBbizBkJYJMUYkpQcFowSaggNIgJWEoQw6YrC9aXdtOLTUBSXoI2iR8dSz58AfxeX78ednwL89PXvhwQsqxXKxjMZL22u0dyMJpwZejCAKBCoQWgFAomAowE0OKcCNZURiu7QgiSoOMAsodKmNmFINoinpQWFQRO3ACEtEgAyCYURESQ8AIhTAJiAcoEsMCwkpAkNGtNTieDG6aLKwZXWBq0CSPjwZ3P/SZz/3ex/wCvjXl4d2uf7+6aGBX/jjj33p2fUVq3f+cbeyRg8kLoHRjsFFrghSwwwBUADRFYahoE2XAWCIlHFG9EjUgc1cLGCJKUAoIxqNIWwIh1GymRLQiLBQ2pSjsCFgUDJAOtooGSlIA0TKOAiBtFHKAKAABSAAYMSABWryEBtbbE/VFhSRQV/u8ZzrKRj+nI++pEJeHsgv/tbXVTj/ZPfjx/dBn7ttmxosxQV1Zq+Vu/IoIhpQAqwCSCGCIAUaRhKQVWIEJYHEiJZEHQQQQElpFIJNCoERNMqAlkAJJmqxCJBhyUITB8bRJaM6QEOUsFEwQYcCCkgJSKHFiorICEdNsHaPvcpWRMIAIW9Ygw9x5jfPOzwG/pS8PH9cCX7z8Q6P3ztnd67B47O0WVgbjr1o7VkEhXLLkCEhIqmuWFogwMINABQoMQABCIIF7kRwAgNwQ4nBgQEAAxAAAIJHCAAAgwAILBGAAQDBAAQAgAEXRQAooLbKggZaERCBqhkrlzqzsKcqMtC09tbtdnnWegK+/9bv+aYK7XJA+6Hv/ZoK3z6ZJ9ylj45d+iSia2usPmpyh0KAkiBSASpEP9h4qB/6BlZJI1LuZBAUhaaDUWd0YAqzw6a6TReJkWzQ0FFgI8YwQJYyIKjFjl7SjYNoYydqy61oKhxZCCQLhtJNjcAOLkQ3HbmJUTwoadSpf/CLn1Qn2hSEVQIhXIDafIqLWZsIxbA4WHnUNXBBw3++3Qd+eY95Ob5PCX7bw8MPvL4uHVRdWxrnNxeI3R3rTxWRWwASUFIARBzV+/qS7/QVr1HXZXdP1Ig7l3uMm+WmRh8Ky4LERLYz6wHpc2yPmY/pM9vjZkcfOhwzcEMQR4OOOVq2po2HVeZlHhqb6cXDNlqytHgPsYKooUkHN8RsbFyChk1hXN0S/bZUQLACEIgEQCXGF20+1nXGoJgMDhxV3b4Tz5hH4Iuv+ch3VmiX4es/+d0VPnr69uR4eahpXS0eDuL5xOYzmoUKQAUAMgJUFCEk6on3Z717LwejR1X2ZtfsYj/GZsjOlLCpMg8z7NhkPenmAuZhk9WxwmXGWkTGWmZHi2PFNBdwXJT1ph2r4zy8aaylRxcv27LKdi+agSlziYgYd4DZgBpLj4wkYkIjALVIAFhlFVoKItp+wrVVFwYg9h37yls8GXjgduEXvP294Lu689Le4ZMvKoC8MS8fjSdb8qIohglWE/TUZ/9u67N/1zlcmAVKVABAwYh27ISxdavY7TZiLMOxmEXGYMAoGQi0igkILVQsyIMRu2XBEgssJcPFKCkZC4e2yqohBkRGyWhABq0xqIYoE0M0REPQKDcwiEBUKBQAAIwpMUYEk9HlsOhRYQZFCQgoKYA6Gu+48H597uUYGss4WBFG72T8G3ntneB1PF8u7a0qAD+s+qwDnSQdNiRITFAOdr74N9l3feUAwAAAKASjQco0js8cy9hQMixGTGADQOSrQIVQUIQsi+gzRkc3YBaiHFmULnF0A2h4AsgIR2E4IYOqIlZQAlJCajgyqw+CSihEUQaGtBG9VMQAoqI9shgiAgQAKAFQrna+wNPP49o+Di87R1QOHrfn83j7n/39R0yF/jlXXMqbfvxFAd2f83NvNmVDGyoxskrUxoCXdztf/KslUYUQCgBDBD2MCMGY2OCmAJRIAGxszICQJaGECwipPlQhOOkDxXMoo0NsjcViLKIjCBIohBIiAWQAwhEJBUDGoCEEVYGDJFBUoACF0ig3hUCWpmKU83vkgslgYwAiImBI9dXkDk99FV+66YYdYxmUMPpIFrzbh/71BvD8j2flUl7y1angvL/945BMZxg2JRIYi7Gw7V2bN2VUWQEAHAlQVHEzDxqlpZd2gC7jTgCAgYMJAAmgAkKg5YpiaBBgzEOazcxSpTuCWuYSAXIDwBUoq0xVAINIqCoBENEQiiAKCVPRkqVEIIMNwQB1GM0yIiABhAEAEVEA0RRwtfcNvuRJJTajAzkyL3qf3QG+6fd+r10K9IGNC0dQDSUAtNmIfUn1jqAEApECcBCATZeII8CsJ9uoZoyExUYpDJErLCq3ABxVBBAU4iA8AMNIB1AKvXSp0UWVAgURCMmQShRUMKBMiXAEhcABCiovUMFyZAKzDWXEQA4VLKNj/0gFMJQgCwqBQESBlsXmcz37RT2Egx0Op6TyEevAj+xdV0O+9Vd+vpzunT/54gK+926PlRWWZsTwoO3aonj/pp6fWPYoghSBAIEVrrYoh24UgphjwzDD4GggSBdFSkqCqqIQpKTmwaD0wYhQusPhiWiZXWgEHVUZAeQAIhIIgAiIICAMmDIERAVQKlIynCIAEEZKxu5k52hD7ONcz1NAlgzCCEVklVoBnEriyvd4/Cuq6KACjR49NvTy3ngl+Phv/GLvdK94rgJe2pOb26YoNBp1aY21st7lu9X//BPOEvACwAoKAoKS6YbJAC0xdaeGxZFgx4xZhEQogEAVATCqSAGcSQksIqUxo9GSYohGADXCkCKBwCMQiSHgBgiqUIYMhcsVKrUigAgQVEohZYcKYkTFYnoAYFA0iAAJKRcAIXq09zWe8Mh2oDHWxBnzGN0A9MI41Rt/7BUB/a/9ow+sjzq7sqE1VGpVsS6Gd1/J/KHqR5wloUJAIBALFIKwEYwFyDyhaCwK0oEAF6BqVSpSAl7QQCx2aTTsMqUdfVB0FESb3mwHT7iqEYkEACrBhiEJAhJQVBAyouXIBIoqYKGSoMmylNGkBAdlRHUZqEAiGqQWAAC0DMmAKCfW7tez73Hv4zYE9Kmk3Jodj/z8Ny0Eb/m1PyunOXr1LMCrfeTFW2552FDWdEFxoiEOOx5+quOXyEDTxWAMGEZCCBQrOky0IitTO1MAi0SWTToqFhOMk0USVYakENkILOUwh3pjAyIZhgjQQhGAhDUKCIqNUM5SYxih1Rc58iKAT7mqhVc9UhpspvSoYlMlY3eSw5AllmCzK/tgYBggYtFEEDcRY8Psdv8tHrqMcioNEToxgVlfzX8cA7d7jNM8vxXwEjvHj05R6FCFE0D3Bo9fxvIYeQ2MQwAFgGxEAVHEYLCiDw5uVUEtbOKwjGWMcowN6I5ldKQkaheMRTKsSq0AUg3DjyjXIwEJIUdQAFaxqBQ9aquqAZpfsZhiBCsKUdWIWUIBRBXGXBKGZYiF2KEisiwpfRhLYjk3JIK4sZRgRC3A6ObcjicvdS/JUFIyHHJonDeng5cnTvOxf1YDd9mB5UzphCovZurBUccfCigjYgomcPQwAiACISbqEf/qNzh+QxK9A1gYIAhSWnoHQyCKS51BF1JuGLKpPNGPEL19raECAiULQAKUAIFzC2GtVnzo45uP/UGr2w0RCmtBqSKgAQgEjMZzJMpYXAKXlghIeDh8PNpeXzIokeoQGAUEtWwRnFtOPuHBNKYRUSRcSwM2M4cB9E/xph96WUD7nJ/52Yk3HVsxqS1uhGM+2j+O00+yFoBQAkoFEglAoajCgoOPcBYAACDAxQMLAMAbUbHSAMoUiOvff6a4YERgishQiFCsZBgw4EUhJvs6/qPKm0gBAMhAAUBgBwjsCOxggNNGljM9SoQQmJIImJvIhvmb9g+cquRACyV8abRl49Fnn58N3vzT/x0XO/N4LOC1P/LitUfnLJitC4zoaIzj6ugNy2s0K+iY0JQJymCyYdCQEZShTCQCIJAIEAyCiSiYiAEAQIAoDmSAYgUlYOi0T6yAoBwEEHABIEBKVFBopUGcYGVCCMAKAAAABICEoIOBiQCFyFAwERCJxMEmHRnAgmFEKGz6xE1/q6M37FsEQiwRcTiyc9/g5X/XgFv3WC52+0OA59GmA5nqHFWqtPbB7BU+IwlQQmFEHB3AIUSUGq4SahkCDYoIEREgA1gCA6GwAYEMCQOgAAI41aR6b1apYMNFWBJhpUEoNxy5UtDsYESUiYYAEBAgIhIAg2AQgKEwMtLRAFkMSqRGgcLGEhEig0AARkSO6VVHwl1lRWTItJxxR9aD287iYi8s4NbZOs6sJ1VV0Iuj6vSTAEwBAOAmoVAsQiAhGKkKJRDAEOE4RgOcunFYZQhIAFSglKp5ShmuWKElFMJVgChKFAKtmAoAQGSISIigdoWoFDj1kOEoAbUUBJIRBxsCIDW6gEIDAzC/agYqAcpTVSKDG7IOPC8u9im/rIEzT63uB5tFQVKFODk0fRskAIREF0Y2MQGbYYSA1AJIjapEZXR2xyPe9nqf8fF/c8NLak9w8dzE1iizY8NAnxs7zjzmw8ef+r3/W/kIUDCIgqKqeYKqKhao0AiiAi8icgBWUAVkYBSBDJsCpcr328/+A373Hz/l/z9BszVjx3zADsQml+HS3TB3n/naP3wvZ//zHRweagBAdERAgETYWCJsuuDGYvFWx2ghWHiiQhAcdK0CH/gbz9pF3vRLbwtoL/57Lxzcn7O4MSdQBLEYzc/qrrAWkJVAGrOkKIDSC+hhIbZSppaJNKo79Pjuh1W/LrFVRP2OQEE5CKJjRKNSpfGcJ5QWChBglOqCJSqAQCgiRv1aAdAFqq9GRhIASkYKaKG5++ltXvUV7d1T1wirQxr1haogVAh5a5j61zf0hoEAlrEIRglogAAjABAWjaHuGtNbzbkJoRUSAHvmfdpPf1tAe6OPvSlOGnsEbvu4aQc1U0gEQNGJ7kC5yRQgiLoBGYwMTBYgCoy5ABbKgEX1Gsc3HT9ogRhUqiRYVRUgECx2hNG3jiPYSpAFIDbVWwOskAFAQISqUkCOBIQAQAEAICJuGOdfjrubsr0xkDvcIjLQI1TeFag0DE2tzHIQCogUBcOwCKAEggIYmIT6U8tbLFEfVQolVA3N5m0vmApcTloqwAu98S3TdjsTmcaOIAAqWN5UTyXESpAuImEBSBslQ1gSMV0wBSGAZgmGqdzDRUsoQGUoWShqwEFKFLojA4BacGOYt2S4QUVhQMgJUkKOogAAqyAADFCGEMpB1CF3GCVvreVIUaICSBSwAC0xQE4AJCLDcGQAS6Qkkh0AZAgGQeUTs1PLuUWrU5UqkjtNeol3v2ka2B9xUk4BbjqmUaUtOxEgRLUW5xEEFSBdgYILmOISiWnpgglYYpQ1BLjkiZJywwMpYYAmAwpUIZJSSid6CUBLSgQUwiXkggUoF0AiogogoJYMVxSqEBA0AOiT2ZjVCCJHxhIlyqKwmMqiYRVCFZGKiNKlJCOicbQIA7gYwIAS6q7oKAe1qDVCe2Xwzvt0CljMSaOAw3NNTUxruIWKQVfUQ0CGZAAQMV16aDDDlMSIACEQBwJAAFBBFRnJijSNRGoQVIs5CJEgi8ghAwBgIN3hLqEQoapRAwlTBYDlKIEOqEiIAkRqmcGIzEUkAEVLFlWyGHhRrbYxLAjMMksAogGCLEZDoYBCgaGhBIAFgJ8oVKGiqKLQnCf7zkTAOXHSPgH2mVAySxc1KuGFVwAyRKWqFlBDVAGzAKKAZCiCUgMAhVcVeVQtsAJQAdCAIos1pZHFYgBREAIE9JYrVmhURlSy4AK3AoyIQqpMcJVZDMLAWDA1xhJIBK3GEkUhBatn5RPFMNW2AIjQAiALUNhYChkU0aAEgAUAAA2pAkRFV4G0Y89EMHDSDmA/Y4kmGwIBBHwEwAKVEGVKY0SQMrGFOxiMCQAyKKCCCFBAKZKLCoKMAHC1whEoEAaAhYEIACIpAAIFQKCGRqoE2PACAlM9Cy4Igo1SCJRRAilRmWCVVvUALANNVZQIVSYoQgFQgkgXNpaAwdKFEQBGoAEACBQgiqJqUJCQAcAWJ8UBSgPtaJmoFACAjwAICKQmRBVlorEMBhEIgpFhuABQhKMTXrUKiorCBA1QAp4goIEAALIA3MqkrFBVGCAQCOAIoA5kyfDW0GClCigYDAAaRVYCBoAk6KJBVm8RgcpISIgFkAANYQkYFiEApaEhWGgAeIWooFI5oaIDFYCcxALs0tFNIyJFpqiApIgAAiF2A0wEjJguoIToyIIxFY1yKlABfWTAkFNSVCWAICFlIAaARkoGKMCqkRsA3gKowNQ6guzwogzUDYMBRIsSKC2LpFmWxNZQMiYiY4xSSAmAwaggAFAyhAhqdIgBYAAAmGFFbVXghStMXADjpOMDWK3N2GKeI5ATjBoBigiGFTUyJkBCEEGWRqONQIyCBICiAoqVRUO4qBZUICIBEGxEsO0AoKHYgQilVIEK5EoCqoLedMwx0UiUo2CyEIcAiEubQsHSiINisZQMx26ApVs1BkiILCLAgkQGATCMaoBogwIgCVQlcuCEUDfz6gCVJzXAPA13MxMiQLWIcgCgKCyJgIYBOjKEmCWjChIAYKBgYKKiajRRUQRIyAAKRCJYYaCICUCUGAywwwVaKKpw5FQKKqFj3syDkVhRDwgA2AgMqDPHj+FchE0i0HRExkI0UlgyEMCSAsYQIggyOkAFRpkoAwXQBKCqVVUVQXmy6xoB4qTjU4JtLjQ8sYTlwqqUAEIhIcESySgIJQCOQpAlS40svQgxMCEhoKICIVZCjoKqFhMuAuwiQ0QhGAATDQQ1kHAKoDYAxJTGgKNHIsGEZKSKgvFwbCyYREaHRQDC0aV2RAiDAQSFARIIBgSIyOIgCgCghsqiPnCqUhUCM+sCSDnpYYD7c3aT7MR2EgkJowYsUGERSUwDCgHGAAlKg9FhCEERIGBQKlWqQhGICOXAEYwKQBjwxAIiisDUUOSUg4qoonKFYGJGRAeLskQGaIXBRhBzmQg6go5eaglmbE2XsSy7KEoWTAfQAIAARcQghQmaAhAAtSKaqqhQoWqMHufcZ8CBJ3nSNgnOzskZqdINqFiyaiUASyIRMIAgsjiCGjVqFFqECyBqMaGqP4MoUBWmAES5knIRgFUvMtGLgoiMCBIhVVRFjlAFEhHCJWjMwRiXCkgrI0pLwRXcZDl+uoDZsUkXQunSSBRsOAMwliwCMRAQowAQTCSABuPCwGQTGg5CuKRD7Vx87mkY3BYnzQ7wbC84uTGsFZWoAqXGOpUDGW4BCEeHAQJAEF1sAqJLJCaUkFkeCBgACBQKIBAqF1VYI5SREYgIAXIgKkDCUIAAypIBGNwBhZzoSAIigqFEQu7MesYdW0dLQiCii8Uxy27xRsmSESloWETgIoAyUSYLTdAhol1YDbwiCuGtKMLJe//ynYFHvem38qS8lOCZf/P8yWOd7jBC1JShtWiUihZBqggBMroBLkqLiMQgwzgEAEUQBkyFAiIIFchbNQKIqlIWFBIiYmGAMSIoVqqCiCgiAIIGKClHztGjBGQIUEMoq5wvvQctEUGILpouCIujDgGIIJqIAAwiACJgITAuNAFGC9vKCVGKXFKJ7foLAMiTIA//6ysDzp3f/Qt3VJMA5StGGSvCIwJP9WBgAIvFYIAagZLRQjQAVEVlKCghA1UEqCy3fFCrCgqoBAEKAABZikABSSQUwAVBQ7FwISFlyIBbAA0AkAAgEhACclTQCiU7MNuhMQ99sAEb0QqVAIEUgBAgABHAIBBByejAJGJpfcMq0QU1UOErGa3j8/AzePJ3/XCF7iTw+R/8igIe5hsuklIhqlg9x5kVsaQIRlAosQBGgZJh0QACgBQCIbHCAgEQLAFUAA4AVAVy5UUgJQAkpFAAZJWNqmokYVQEUAkkwoALj1glkAkAAFBCUqYAJAqrF02jS5ZGuSAsBBy0DB8IsQAQDJHAgKCWODAAEZhCBNT2WqkqFEGIqNmr4+Nr8DcE5EX+vjvAg8dna/FcQhC4GJzaVqAEWCSMNqCR4hBBjSyBEgNYIIQEaIkFlhSBFJCoKqSqqiiQCQIpRSxAAbAi4BQBlKtAAEZRKFJkrWwwAxQRCShQLFSASoVXK9q4w2KUpDQIBFy1VQgUEkAgBlEyEpQMAJQMIqLgBmpvU6rKkjKEUglPnL8+BXfvEbjoc0nw3PbxhVJWpCT6BU3sFZlyAdDS0tJIwVACiwAMRouLEAAIFJGEiAACgVy4ClBQAAEHoAgIWEEpATAwhhkmUiUhBYKGFIABU6YMDNCqI4kQAigERBEA9WArINIlQswQFE1FAKAKAEiipRFj9A4MRWCy1EhxQ9Gsy0BcopZETRBI0AxiaM89Tz4HZ72+XeyBWwN/+n/v+slDOp1TzyWFREXj7Iy1oAhFMWXGqAFcamAYXSyWIEjBoEDhVCIyMmAolAAKq4AkrAIwNHCkKIQEABCIV8Fd15lELMlAlRQLrSCCggIrV+2G/946PiKzUEkBBGAwWkJjE0BUDAeGiCOKCmoRRQVSAGhplFoIJSNgoVgwJRYEt7Vsb7VbzZdSF6uQbm308uWT/vY9O3DsE/NikPadAX/ez+cKaCcRidlWZ25jT/kuCiCERSiCpQuoEQAGBljgjSUQRaUgWKJkhQgkJEAk1FeTargQEQEAqnbW3Wv8w1+i22qCQCUlIcECABQBjDXiNd79i18Dg4QAQEEIjbZ1ZlVFqwm6GEHHskRcEaCQKK0YgSLCdMkQXUDACBiEALglMFdXTUbzgISElSQ63s8b4LM++c8V+hcD7/rBH6/ggXl7uyPJEGm03JBGlwNQHigsgOGgESLImMGYhWApmPAzpsdQAaAWoqRURQMVqAxkqFrMZfM8zgoARSgAjGgH7/xy/IvfFFMTAhSRIRQAeWCDjTlubE//4jfR36oxUIECYCGx/fhmd0MZzADjZCyMIctNxApRSrhrOlEnWEgxugghKKClhAAAMAzMC5H3Ml83AiGUrMUMngF/8voKyFM85UrwnOul403CCItUXVVPXT8vq0FvxQ0QRqGEkhIYwMCwWBSIOnF6i1pAmEhAAoIIiiiqUoUqKs+4KsASAABgBZTQa788/usnNCvaiMqURabcWJuxv7/7V3/E6SsyYIMKCEAUWE+//9I4WlAFTxapkY4FoMQBBbqE5mf4GRQoBEMwBChkdIgsBCAu3Nz+lqeuN46pmpIIyuigYruzX0+Au3ttA6ec52OAf/nH9/7mhd/1p0dTMikg3SA4XXrqiMv35REBHHEAN0BgkCCIEIFGIg6cHFhEiUIGlIEWkciVERUQhNVVK6Jn/ddfBxskFIFSBBAgL6xE7UCKVQgTfW9DxurDAoVCwJABIBmp8e9+HIdTW0tzBWDKDQBDrqCgQEEZKsbxKCoiCUpGokaACTJAEREQARDE0gubtg893ldCUoqdpszgnRu/+PJdyKd7cBrw4e/8lQqn/+D//r4XxyJ0tFid7ss6Pu8eoHpQ6MgAAoAWDWgBCKPFDDSOrmOmDKEQSCgZMAKEokHDlDd4xlPqxQ86vmJgSAAASShSYnTBLqigWBRLMEBr94ASAAggAIpFm7E88G9/c1z01szRIwIJi0iEIjKUiIyslVqL1PGhGEFIgCyii0sXwCKFlhRasjwi+AqwYJxuixWAmV4TB+n9gHyZf9YDp/7nfVwB8/H2n82NZETCQM06VJ9H7NzhwqUAuoAIm4yMEhYGYHQERECHLzo80ACiDFILIqgQUiSkJIgWavsszvr4HxcQCgAAtABAAazutdLoIxJmbN2h2RGVFCggACUC5erjv63T23iuWBqVgIUKKJQoCgBDoICyMQMnbwCgYaiLCIyGQYkhAFIiEmYsF64ufM6hO+spLFaBrNa+zRuZOwCec97D6cb5FOBx//AOHx/BSNJJUVJGrva3Wp/xJXerz8zAiA4A7KgSAIvDEtRCxGL6E+4csmJQNQgRAlOIDKFISsJRD7x1Ud2+xeNXtEACBRGURABQuztWJprq3B0mjyUDLAFQAgBEObEcvfaH+NxbtGgRFQeUVAhWqYMoE2RAEWWOg46D6wNQKkhYHEgAhAKIAAiIZIH6KtfgHA/vnvIAIKQb1Km+DHgVAPJ04BXf+dUVzj+s9xRk0qQIFrmdFl8T3PQG1osIahEU4NAQAIAsFhVJLF519xoLo0WGmioXVlBYRQAjFBSKhUg9Lszx8BUAVIYAwpICEEqXuBI01pmHJ1CqBASIQAkAALzzNlZfY+c4lpQXfRUIFREAkAGKhHLVFDZ1u5q+ihURWgTAIDEYINBSAgCiAzvBN1/HvRXLbTUcUka7gyftTQDf+t3rAFzic54+OcBbedx4SlrGgVsRQdzda2/Gq3yIrYmJUCIMIBQlhsAYGoCs6hE3P8SDYlQ0g7ZgQANRGCGgiFx0qhDzFWPG2rVwAKAqRVAAshRFtHu5nWzV7PBKQEgAiCAAwHJW+xbnXo8uUYsyq1YmHFGYCAAjE7mRiAGYijvX6t5WFlKKQBYgkECxKINAApRv+iZr9/Zw+7EyIQGaTZk8rT//t3m9GeDOtF0K5Nf8sAJ4/RF9MLBIGopEHFxuJzPe8AM5ep516QARO0SQAQQCAEJExOrh7/XGDaxSYUQyDBgiEhKQkrEES2qx1KvRgXzE9op2Cwc1RUVAEF1N0J2SAgVKikqqFAAXNljFDm91ohgBShXKRCJS1BgNYsAFiknjTsa9lyGHARQABkYApQyCASVB1YHN4LuPcfMOh081GFGYaU3jUG4DjH1bqYC8FPAzPqkAvEOunolGokYRmXj/7ukFnh+8zkdmbWJEFxAYXRiBaMlSgwgoJ6Yf8dLLcTcxQqkyAAFFRBXCFY1C9MgNr6J1ssV8PXz59vDFEUC1usAFRFYxkQwKgK7ouwSuvsPX/GzUXUcXFaNWBXXIkQoTiBrUVkkZyiirAVWLl4n9l2AhpQQREmSIFg0oEEkQ+IbvLc5/Ot7+DFYA0GjNYIb9reZ6gP8uCXDJkO//5k8APhnpqiEUxw5AtNjwzO1hP+tDH5Q6UKEgAKUEFhYAQBcBAVClsfnl+Kqf6eqJTlEZoFIQAZEhKQEiiwxF41XXP+/DMxc936dXwN+7xYdul/3bA8D/cbzfPvezL3zX11/6tndYvH3D38z3eycYVEIiAqBICIWKAAAB5AAQGltff6envoWUKFAAoBBQCxsAhDDEij3+3S8w5ekLeklrJMOMkDaMZbxcCBj/1RCA/P8Df/Iv31EBjsl3ra5hktKCgtXabZwTH7ni6FArgGCElRETGEEhyCCAAqhFWnXlq6cvmUUlYFGiTJGABQAhwgJDVEKNeMD6B6Nrr9/w1W9fdxnUqdsTN4uH1JKw3Na32n14uny3ttbDwfXhv53v3s5nZt7aUSBDhphIIiE2hBzJYSAXDaJ6Tn3uFzV+QG2ACoCCBWFQAABAOBpZt1/io3/U5Q2bZzRZ7TqSKS1j1Gyd2hFAvhgC4BMIyF/8w18G4JMhLhokpWADYURZunx7EcGHXgBkFVqgCAYmwGgaBAGRgFRhrL/DCw91AUCIIDLCEAEICAqLKAwRkcgdlupWzYuN28OV49X166udGQ3Vjnoxo56oO2fd7NOBb4w15EgoEJApiwjMyAKGGbA8MCM5wpgwvmDF5ueSkiKSIQNAKQGAoQAABfBvf602ujIP4WinmjUAfeQpYzMLMPqdeSmA/EQA/L3vfrYA8qUnxxvdkKATChOwxmdcmvEGdeNVbRWKDpYgS5YsEQMQwVAB4ACs3ff1zCV2iSrCEBUGkJCEKSkAICpFQtFA4cBFn6oWKjTYkHLLXAm1qCWZLK8RHSYMWMUGBCiocFSHCCICgpbIHHufvWu28ilQoACEWIjawTBKIhGWpvHaH/D+cbs2x8AjqUFlprQaLWx6ZT+fAPIVJwA+oYA89wUF8EVTjLBqpSeVKBfb18umeP2tCkgKgACAYgFIwEKFABSAV+1FO0+VgzNWIKkAEUmQAJJCAcQEkFFAUh5ExYoorHA5kYRQUgYEkmAhZREEKCAoKaosoFjIACGUxKhxf2HyKHcIAIACAEDRYWGILErHrkxvevGP2F21c1x8qRGjGMDhiJk07P4H+O7iUAD5iQF4ff14APIf+D1vWFw1SCoxEspVTlx7e9GvevUNQIZYLERQIyNGoIBBg0hAwInRBR/bax2MA09kRGQIBpEIEFBWASQiR0GVUURohYqAgIUqExKBEjIAKqssiAyYRZFaRBACqABcuRpO3Jh68OkCKhQAEAARDRYYA3SDcVQH8uIfULIuHWpVVgPQaBltQl35n37Z1wH5Ll8H8AkGZFysgN/a7fd/aMl04rAhkVVeGlbnqjvc7tyQURoBNEYCCCEoIhQBAKQA/vNvvumlaFs123IkFQlRoYQAKJJKigZVKQRCVAQAQKDACkSgVGUVBUQTQZliRIIRIyIZnaMqByzQeGd089Nl9vEjqtACAJACgCGEMBgixZEdj/u3y+OpvRlnZoxFI5q2ZJw4d8fq/O6PvgT8vWIrwCcc0P/Db7+VgBcDpgxDNY1GNQpi63bZIG6cNRt1GEIURBYEwAqgKKSEhNC68Zsf8B9/902vRedmtAtFGSJhSIICFQQAgJCEkEuGRBQEAFpiBUBgwkRUBhgZMABFlVAGRFRe9A0ZYLx94O2Pl9P/+XP84RfIQIuAlQBbAEQpKRGGssez/zdP/u/Zapw5j7aYMIZrhJOrW1y+9BzAOz+XXyuA/MSBr33XCvir//jQD1mzmpAZSoNGqA3OzatG3Pz0AGCCiMpUABVSZTIMjCegNiAEgIp+dGDFPDmqCCoBIigJAgkTqIoIAUDgyoATUklgYJGERSyoDCgBCgWUC0Op6FKVOrROlRNSUqAIYABKoAEAKKiEUqJWNz7U8PqFW/73OfXI/ubwhcOr3Ig7jsP/4KsWQXfuvlsBVxDy6e951wp/t8ev17edgWFiYGIoBmqkdo7D0b0PLwAAhAREATCRwQhqgNowLKAAQJUDB0cdoOpRRFhQUAAkYEAZCOUogIEQBFUEMKUoAbXMwchABtWBlqFIoItGUCnLiifFg0PLN0kRSAEI4RBIhAGkBCgsAXDnBXJtMA6XQ8dhl8NV9jujj5rZL/emN+wAz+OVAa4otNf6xLsFvLu9PU9siAHJdtVIDalxY3OO7sCj1xdAAKCoQBABYQFdGiIBAEACoLvi4C1uoMNirXGywkQuWlCBZ9SCQMgrD5QQQAEEiwUAgTlAJWWRsYQACHzJWGsT3dvXvFXcvcbyVQBQBFJAESKS4TBADQoBCoAnn+TrWD/H2DgzztwcXfauvAWP2X0IvKxnwBX+438G8t/88sfn7e7sX9milbIyGBatWOWyjubnZX4EAACRgCgMI4EhQARIAKAAZaA/9Oij3ntdnwd2V8SKGatHJSNRrVBVlQNRIUIQhSAyYQQrUElYAgBAItTQNTqjng+v9vKRtR6+XJa3AcAKFVsEABFBIYCwIABCAIsj4tS4GKOBOBx7x1huXW59tOWDfuzbel/1Vy9uz/3vj40rBe5zKsD2X3y+ZnV15VByQMogMVaTxIYanygnyggIIJRADYpFBIJNDAkiCSg6CKSOX7D1jMuPdT06X2ye6lYso2L1RAWoahEBgAwDLCxwgw0DFpnIyNCk0XQcHpc3Zrwm/PaQTgiZIoKCgQIAIIIBJ6oFsDzRAwPmSKIlDm+WVY4cd72+l/O2t58L+eieBrjikNt5C4Cn7j7bsh5nDrUNxQpa5TK2BqCZIyZUgAKiUTAc2QQMEEiBCkUAwIEZBkKl1ORxnL1fe1vsodUVWTSWB31VRReAUmWRGUIJJJCrhMwgcTqXex0fVPca4+PBBiDI/yAgsgqFIlYAAlkikRoYgQAALoUyyoEAgKn9PQ5eTt6saS/47mcLwJ1nAa7Gs5cFsL6xel0Ma58wMe4YgZGaNEgkkSMAANFACAMYQIIAiEAKBQyrwqqGBKi8jfFFq1ut7XEmWosmqI0YgWVGQlZ4xMqrnjgFU+pAzUeYkQAU+G/kCxkpAlIEg0QkBAAUAdEFCTAKGC5gVYlK0akq3ILGbvo33DPu9j2/BNx0nwW4Oq+sJsAoXbXiMWFMeozAUIyKtpWmRq3hVqA0gMEGABEAKAEgS4IFDQCJplAUoB4AAEXFpbShWZWDFJiyhAEIFBX5RGnUidrwM8D/A/8PfMlQooBCoGDFIgSRISVQAIAGUEAD3PrEgLFYWiQKqMCpogKdGWeYDh7RgKv02d413up/Jbi5pt4oh/chR2jUGI5yS1ZNDNdY2wtAgBSUlAAKgIIiEAoIClk6shiaRhcXFwsAGHAyAkBtcgiyIIVAlIFhhVphsIACECAiYkHgCGD3fiU0X+iyqugDVy66rRkbDpkFbgO4au84z3vVX/kQ3/6HHxQHrt7Rfc5ANYSpEELLYLZjsGPrPgBUGQAgApDBBmEDsmRBuhQclogGKBoWw2ABoEsGAAEGCYhalJgIBgQsQgoKLSgBASIiASiAgsabrjyIxfGm2XpaWj0oorKqywGbAONxgKt4PIGPTyiju7pKHKiCqmpuHO042tZQXH+nlOgRABEAEBuCjWHJiAgGBaNkUACGxSIwWbpgEBADgBJTAIAFAIKFkkFEJASEQgAAgMgVqL37unJX/fZqP7dS9aJLLYM+qhIeeEyAG8+dD//9l8TVBA4G/jegefOfRi7Rh1wm5mIhZtbhJhDP36+dewQVBikBhZJFWDKQFIawFBxdSoJeRKKWhiUQMYFgIQCCiQAGsICAAYMAFJFVaEERlAbAC+/r0j5O1MFCV/mgWA4qpGP0RcDfAAcHMZ4AV/c4PP1jLwXIJfwyB8XG0lqy5tScOKXurZp7PP00Pu99AXSFQNCBwXSwQQTBIBA3KYwGpUZiSpDRpQxQYpQYoGQYSCBAwKAIARFIySDVg6DOP+mr3tdwO26v42Td0HDCRz03t1mwLkvr6jjAoYEBuNo9/M0//5kAWNbxadWRstB+nHHimKJlY3+ru2qb+Pov6vxzBNgkAQBNGwtgpDAsAAhRIyEQwUjRRDIMFmBEYloAwCAYAARkoGXCqwKGS1/31fq850t3O+51TYVGS9FTlQjJno1p8vNhMwpwwAAkwNWfZn1wvQLg8Lw+Pxz/OaF1DjmvFmBeLKsD1jus04kvfB5f9/XK43nnMCWRIgAARC0WDYOCAQiDUAKAQRwpGASTxQAslgwjEAAACR90gOpLv8B3fjm2enxQ3dtv0fKqVr2xwAw1X3HMPfp4Xr4CmI8APi0Bee82AB69+tmjs2OnJ1TMS07BtConSnU39fahCfq2b/6MN/j4v+jz6NxYhSaHQAEEUEQBCASAGARgxFhmZCGCRiCyGACANJgy6ATFF3+BH/k+8fw+Hl3Hm6tmWRk5VUAtHLuTenLUkby5/6PjAB2TAJ+uZwX827/vx3uPT+55hMHJZu+wFFRUBdPcjqzx8eKqx95l+VYPj48t+qHqR9gPNUgJIQkUUECgAFBAALGAYCUAIQAEiggtKaIABmCAgnBUIlmDpa+8xw9v+pLGSS8vPt1uvXtnkQxfEoramzFLW4/on0/ap2D4S3/0hbVJcO32lr/yIz9X4OQzeHEDz0hbpnWhL0SFKMirHp2sOk00M640nr1g/R4zP3J0fqg0QKQqAzNYKENAwAoAKRQQAEJEAgAEEqwIQBFJFaMugUV1YcM3ur5txZUzDhkvPuPW45N5G0wkoqqS8kUq1uVoX199d7ueA/izdxbn3iTBtXz+yO84K0D3H/y6uXVPs7IREsvQeo1qoyAOFB2uta/qeeygFzY9+1gfGX3swPu3OJ0BAMCOVKSIylpQLKRACbGAElAh4FVVoMACGIiLq77E9VVTz98uzYxbC288rIfPy1zDUWpYgoUnzUIUWh/u/fHm5k2Pfn1/DjDHhATXNrRz987/cPc3AL987PmlD+FoMnNioWtbNQEIRwBSx2vdX/W4gcalOTEW+9l8l3rzXO9N3J9xeMbiGEIA/6/NqvXLOn//dM16rnp2cL6jOY4HF737ULferdnl1lSjRmYhQWS2tZmwOjiCfCR3fGS+dhug/+Dn1uXWBLj2fRH/+asfLID859evjaxfds4w2ZNwqmJU0yqJMBGECDK6TY/3Gh7j7PXh0u3VpXNsjgaJLutIHN10cuD4Nk5uMT+jU7WQaqpmq9Voc9XOjq0NazsGW/GIE+LeHe484OFDTe8qU8NBNnJlgpCWtEZrU+rytD/C+9+k1wN++MXPG93CjXUlwGdCQDKUdP8agH/eHz+ZbMxMZkcyk9NsiWHYm3QNYRhoqiq6rFqhMejYPC5bM7ZmbORYASvGhGiQWHVVADZ65ae66qi3w6OOXIc8HW0138FoABqiHZkisESClmIO2gGZsjzpD5nH3jnmUsArAO92yoN1JyABPkPuE6tYzu4A/Prma94bLTSwMeNMJVU2gmmSdBMsEUIooghKyhGKUJow1DSg2EiASJQLgWC5AJWtFg0KQ3RkRAFN1szQ22QwqkWNGfz5pLntzetcBngd4Gfevqq3LjdAB/gMepgrNrcpHS8Av37s9l0vr/j8Ppl5SZdmMzCpkSk+TFQhpwgCEAAEUqqk2HIUgsiAKgAGqUDFKAETLACkmTTTSjfQ6KRcwqritHLwxsM8bnr5fL0JMALw0+uL8ooGoAF8ZoV8hveMl6BAH4A/ff3cmud/enbbDcfVu4etiw0RjZWcp67VdEigEBAKGIUBAMGADFJZZJ1JtKRYGxN5IIY3/y/0veNyz1N2PfuEf7g+hQQf9IHH+jcBHbgOP/R493he6uv/92nQAPjWc6149KsO3nwc2GXbcqzcbeNnTGTMaNNgDEcnQSQKTDCkUKUiOySEf3f6UUfeOMHn3u88s//7fgbo4Pt/4PvjR9511385GjRwve6nDykvkPLW/10HCcBH/9hPx+3vsuB5HltzlFW7Y83CCpizHFOi8ZVxw+kxNQRJVjfT71xknZvrpF1/rfnlgvPVdPjg3i0fH74wAkgAgL/474/jb35x13+nQQPX9/3Tp5ejc5WXcvmMX7s6SPDfX/J3fnOo3mT80TuMPXoydKCBrNLpLrhGz+650XP/+eQC/+sCXAL//Z1//b349f/8zvoqOM50QAf4H/HgTV9Wzjhxo+KWR17z/581aOC0H/WLT+Lrfkj5i/N2cfd9MG2z1AR0gM+yN7/tG0N0RZWMDEtLgySABP+fCwA=';
  // Bundled tool directory: no external catalog, cache, or refresh requests.
  const registry={schemaVersion:1,categories:[{"id":"business","name":"Business Tools","icon":"▥","order":10},{"id":"games","name":"Games","icon":"♜","order":20},{"id":"single-player","name":"Single Player","icon":"▣","order":21,"parent":"games"},{"id":"multiplayer","name":"Multiplayer","icon":"♟","order":22,"parent":"games"},{"id":"chat","name":"Chat Tools","icon":"◉","order":30},{"id":"other","name":"War Tools","icon":"⚙","order":40}],modules:[{"id":"flight-game","name":"Flight Game","category":"single-player","version":"0.12.8","description":"Standalone Flight Game arcade module, playable anytime"},{"id":"stick-fighter","name":"Stick Fighter","category":"single-player","version":"0.2.7","description":"Standalone Stick Fighter arcade module, playable anytime"},{"id":"chat-archiver","name":"Chat Archiver","category":"chat","version":"0.1.10","description":"Archive Torn chat conversations"},{"id":"tic-tac-toe","name":"Tic-Tac-Toe","category":"multiplayer","version":"0.6.5","description":"Two-player Tic-Tac-Toe with named winners, green winning line, rematches and head-to-head history"},{"id":"torn-four","name":"Torn Four","category":"multiplayer","version":"0.2.5","description":"Connect Four: two-player multiplayer with private room codes"},{"id":"torn-fleet","name":"Torn Fleet","category":"multiplayer","version":"0.2.5","description":"Battleship: fleet placement and turn-based naval combat"},{"id":"torn-snake","name":"Slithering Streets","category":"single-player","version":"0.2.14","description":"Single-player Snake with touch controls and local high scores"},{"id":"chaos-marbles","name":"Chaos Marbles","category":"multiplayer","version":"0.2.5","description":"Online 2–4 player marble race with private player sessions, Waiting for Chaos staging, and game history"},{"id":"item-monitor","name":"Travel Assistant and Item Monitor","category":"business","version":"1.12.53-dev","description":"Item Monitor and Travel Assistant with D1 stock reporting, source diagnostics and stock estimation"},{"id":"war-hit-organizer","name":"War Organizer","category":"other","version":"0.3.17-dev","description":"Compact war target board, reservation controls, timer and local development settings"}]};
const TU_RELEASES=[{"version":"0.5.42.103-dev","date":"2026-11-12","securityBundle":true,"changes":{"Improvements":["Remove green purchase checkmarks, including saved-run restoration","Keep purchase confirmations and red markers for unfilled slots"]}},{"version":"0.5.42.102-dev","date":"2026-11-12","securityBundle":true,"changes":{"Improvements":["Check healing inventory when arming and after hospitalization-item use","Remove the extra inventory request before healing while retaining consumption verification"]}},{"version":"0.5.42.101-dev","date":"2026-11-11","securityBundle":true,"changes":{"Improvements":["Refresh native inventory after verified purchases without reloading or delaying departure","Remove the native inventory refresh investigation controls"]}},{"version":"0.5.42.100-dev","date":"2026-11-11","securityBundle":true,"changes":{"Diagnostics":["Add a manual native inventory refresh test with request and cell-change evidence","Keep page reload disabled and departure available"]}},{"version":"0.5.42.99-dev","date":"2026-11-11","securityBundle":true,"changes":{"Diagnostics":["Inspect native inventory refresh without running it","Add one A+ Blood Bag to carried inventory per click at the grounded Travel Agency, with verified results"]}},{"version":"0.5.42.98-dev","date":"2026-11-11","securityBundle":true,"changes":{"Improvements":["Remove automatic purchase page refresh and the departure delay","Keep verified purchase notifications and inventory check marks"]}},{"version":"0.5.42.97-dev","date":"2026-11-11","securityBundle":true,"changes":{"Improvements":["Remove redundant inventory alarm Audio and Visual switches; use per-item preferences"]}},{"version":"0.5.42.96-dev","date":"2026-11-11","securityBundle":true,"changes":{"Improvements":["Remove the standalone Direct Item Tools section from Travel Assistant and Item Monitor"]}},{"version":"0.5.42.95-dev","date":"2026-11-11","securityBundle":true,"changes":{"Improvements":["Show a three-second verified purchase notification with quantity and inventory capacity","Refresh Torn inventory after the completed purchase sequence","Mark verified purchased slots and unfilled requested slots","Synchronize flight and hospital countdown displays with native counter changes"]}},{"version":"0.5.42.94-dev","date":"2026-11-11","securityBundle":true,"changes":{"Fixes":["Clear the Snatch button and screen alarm when returning to Torn","Recognize return flights after refresh or native navigation"]}},{"version":"0.5.42.93-dev","date":"2026-11-11","securityBundle":true,"changes":{"Improvements":["Buy monitored foreign items through the direct handler","Retain five verified remainder attempts to fill available inventory"]}},{"version":"0.5.42.92-dev","date":"2026-11-11","securityBundle":true,"changes":{"Improvements":["Use the direct item handler for selected inventory destruction","Verify one trashed item per click before continuing"]}},{"version":"0.5.42.91-dev","date":"2026-11-11","securityBundle":true,"changes":{"Fixes":["Use all selected healing items through the direct item handler","Preserve item identity checks and partial-heal verification"]}},{"version":"0.5.42.90-dev","date":"2026-11-11","securityBundle":true,"changes":{"Fixes":["Restore Snatch and Run healing with Morphine and other selected medical items","Recognize travel inventory identifiers and empty slots correctly"]}},{"version":"0.5.42.89-dev","date":"2026-11-11","securityBundle":true,"changes":{"Improvements":["Compact windows and independent alarm controls","Add self-service deletion of TU registration and supplied credentials"]}},{"version":"0.5.42.88-dev","date":"2026-11-10","securityBundle":true,"changes":{"Improvements":["Compact Manager and integrated tool typography, spacing and headers","Keep window controls visible and usable on narrow screens"]}},{"version":"0.5.42.87-dev","date":"2026-11-10","securityBundle":true,"changes":{"Fixes":["Improve inventory filling after item use with up to five remainder attempts","Improve TU icon and Item Monitor opening reliability","Improve in-flight hospital status verification"],"Improvements":["Add Clear Logs and reset diagnostic history after updates"]}},{"version":"0.5.42.86-dev","date":"2026-11-09","securityBundle":true,"changes":{"Improvements":["Update the user agreement and data-use disclosures","Improve text wrapping, tables and links in agreement and API-key screens"]}},{"version":"0.5.42.85-dev","date":"2026-11-09","securityBundle":true,"changes":{"Improvements":["Improve stock-report delivery and preserve queued reports during interruptions","Improve session handling and credential protection","General compatibility and reliability fixes"]}},{"version":"0.5.42.84-dev","date":"2026-11-09","changes":{"Credential protection":["Improve saved-key storage and privacy controls on supported hosts","Keep saved-key selection and removal behavior consistent"]}},{"version":"0.5.42.83-dev","date":"2026-11-09","changes":{"API reliability":["Improve API request handling and recovery from rejected keys","Reduce unnecessary requests during normal use"]}},{"version":"0.5.42.82-dev","date":"2026-11-09","changes":{"Snatch and Run direct actions":["Integrate validated direct blood bag use, one-click native steps, status/capacity fixes and sanitized request diagnostics","After a purchase leaves space, choose step-by-step departure or stop Snatch and Run to continue purchasing/travel manually"]}},{"version":"0.5.42.81-dev","date":"2026-11-09","changes":{"Missed-stock diagnostic evidence":["Separate compact stock history from the DOM buffer; retain native quantity, engine quantity, threshold, scan/focus state and cached-row source","Record alarm requests, dispatch/context, mute/suppression and Snatch stock acceptance/rejection reasons","Coalesce unchanged samples with a one-minute heartbeat and deferred session writes; retain same-tab history with build provenance and loss counters","Observe visible native stock during unfocused skipped scans without changing gameplay or alarm gating"]}},{"version":"0.5.42.80-dev","date":"2026-11-09","changes":{"Alarm settings and muting":["Group inventory, hospital and landing alarm controls together under Alarm settings","Each alarm supports a duration in seconds or Alarm until muted","Show inventory and hospital mute controls while sounding; click Landing soon to mute and dismiss","Use bounded audio batches for long alarms, with independent channels and shared master volume"]}},{"version":"0.5.42.79-dev","date":"2026-11-09","changes":{"Destination landing alarm":["Optional outbound landing alarm with configurable seconds, Chime default and master volume","Flashing landing notification and Dest ETA seconds on Snatch and Run","Native flight timer with local countdown, same-tab alert deduplication and exit cleanup"],"Exit confirmation":["When Snatch and Run is armed, Item Monitor Exit offers Close program or Minimize"]}},{"version":"0.5.42.78-dev","date":"2026-11-09","changes":{"Flight readiness":["Recover destination and direction from the visible native flight route after refresh","Refresh readiness on focus and visibility changes; retain player and confirmation checks","Export the exact readiness blocking reason in diagnostics"]}},{"version":"0.5.42.77-dev","date":"2026-11-09","changes":{"Diagnostic status controls":["Show a green diagnostic indicator while recording and red while stopped","Gray out and disable Activation while running and Deactivation while stopped","Synchronize controls after automatic start, manual stop/restart, rerender and same-tab resume"]}},{"version":"0.5.42.76-dev","date":"2026-11-09","changes":{"Item Monitor screen and embedded DEV diagnostics":["Replace the combined entry screen with Open Travel Assistant and Open Item Monitor menu actions","Move monitoring, alarms and Snatch and Run to the dedicated Item Monitor screen","Automatically start the embedded DEV recorder when Open Item Monitor is selected","Add Diagnostic Monitor Activation, Monitoring Deactivation and Report Generation at the bottom","Keep recording across minimize, Back and same-tab navigation; explicit exit stops resources and preserves evidence","Bundle system detection, sanitized action/DOM recording and retained capacity export into TU; defer action-log storage writes off native event dispatch"]}},{"version":"0.5.42.75-dev","date":"2026-11-09","changes":{"Launcher touch isolation":["Open TU on normal button click, keeping the launcher present through pointer release","Contain pointer, mouse and touch events; suppress post-drag activation","Block duplicate clicks only inside the prior icon rectangle for 500 ms after pointer activation","Support keyboard activation and leave unrelated Torn controls usable"],"Validation":["Underlying Torn home-link ghost click blocked, normal controls usable, drag and keyboard behaviour, guard expiry and existing launcher/navigation tests"]}},{"version":"0.5.42.74-dev","date":"2026-11-09","changes":{"Per-item monitor alerts":["Add independent Audible alerts and Visual alerts checkboxes to every monitored item","Keep silent monitors active for stock/price tracking and monitored-only filtering","Gate row highlights and optional Snatch screen border by the selected item visual preference; Snatch action readiness remains functional","Persist preferences across reloads and item edits; preserve enabled defaults for legacy watches","Stop remaining sound pulses when their source item is muted; retain shared alarm settings"],"Validation":["Mixed three-item audio/visual settings, runtime toggling, silent filtering and Snatch readiness, screen-border gating, edit preservation and fresh-page persistence"]}},{"version":"0.5.42.73-dev","date":"2026-11-09","changes":{"Inventory item assignments":["Show only configured Heal, enabled Hospitalize and accepted Destroy assignments per item","For heal/hospitalization items also selected for destruction, label the later action destroy remaining copies","Use Keep for unassigned items; hide hospitalization annotation when planning is disabled","Preserve actual item selections and gameplay actions"]}},{"version":"0.5.42.72-dev","date":"2026-11-09","changes":{"Flight inventory capacity":["Recognize the complete numbered inventory on Traveling pages as well as Travel Agency pages","Treat Inventory N items as occupancy and exclude decorative blocked cells during flights","Replace foreign-only inventory guidance with page-neutral wording"],"Validation":["Captured PDA flight inventory: 18 total slots, 2 carried blood bags and 16 free slots","Flight pre-action capacity baseline and existing agency, purchase and native-action regressions"]}},{"version":"0.5.42.71-dev","date":"2026-11-09","changes":{"Inventory Destruction selection reset":["Unchecking Inventory Destruction clears selected item types and warning acceptance immediately","Show Selected for destruction: No items selected after disabling or declining","Discard inactive saved selections when setup is reopened; re-enabling requires a fresh selection and acceptance"],"Validation":["UI selection clearing, saved-state reset, setup reopen and existing heal/destruction/purchase flow tests"]}},{"version":"0.5.42.70-dev","date":"2026-11-09","changes":{"Travel Agency inventory capacity":["Interpret Inventory N items as occupied count when active slots are explicitly numbered","Determine capacity from consecutive native inventorySlot LI elements; ignore decorative blocked DIV cells","Keep foreign-page explicit total capacity authoritative and reject incomplete slot layouts","Read rendered native agency item-picker choices with available-to-pack annotations, separately from carried inventory and destruction choices"],"Validation":["Captured PDA agency panel: Inventory 0 items, 18 numbered empty slots, three decorative blocked cells","Simulated carried Morphine in slot 1 reports 18 total, 1 used, 17 free; gapped numbering is rejected"]}},{"version":"0.5.42.69-dev","date":"2026-11-09","changes":{"Purchase confirmation recovery":["Distinguish a stock row replaced by Torn confirmation from visible zero stock","For an exact item/quantity confirmation, retain immediately pre-Buy stock and verify current cash, tracked space and confirmation price","Cancel the matching question via No if real capacity/stock/funds validation fails, allowing normal recovery","Record confirmation capacity source and avoid redacting the capacity-ledger source label"],"Validation":["Captured integrated desktop flow with verified 18-slot capacity and removed stock row","Missing row succeeds; visible stock zero, cash drop and increased confirmation price cancel without Yes"]}},{"version":"0.5.42.68-dev","date":"2026-11-09","changes":{"Inventory and maximum purchases":["Show total, occupied and free travel slots with per-item counts and heal/hospitalization/destruction annotations","Establish inventory baseline when arming or before the first inventory action; credit each confirmed consumed/destroyed item once","Enter maximum affordable in-stock quantity from tracked free space directly, without clicking native Max when verified","Accept a native downward clamp and permit one remainder purchase using confirmed transaction evidence, without waiting for all inventory labels to refresh","Invalidate tracked capacity on refresh, manual inventory/shop interactions or uncertain submitted actions; bound reconciliation and preserve confirmed purchases"],"Validation":["Direct maximum and native-clamped 17+1, stale Morphine label with receipt/banner confirmation, funds/stock limits and changes, uncertain remainder without replay","Setup overview annotations and baseline invalidation; PC/PDA captured native panels"]}},{"version":"0.5.42.67-dev","date":"2026-11-09","changes":{"Hospital diagnostic evidence":["Expose safe configured and armed threshold/alarm settings, shared volume and rearm mismatch","Record threshold transition and alarm dispatch events with seconds, limit, sound and volume","Report selected/carried hospitalization item counts and companion button availability reason","Preserve safe settings snapshots across diagnostic navigation; no arbitrary input values, credentials or network capture"]}},{"version":"0.5.42.66-dev","date":"2026-11-09","changes":{"Alarm settings and formatting":["Move hospital warning, enabled checkbox, sound and test into the existing Alarm settings section","Use the existing volume slider for both stock and hospital alarms, including changes while armed","Default hospital sound to Siren; preserve saved sound choices","Standardize gold checkbox accents, checkbox placement, control fonts, field borders and button spacing"]}},{"version":"0.5.42.65-dev","date":"2026-11-09","changes":{"Hospital items and timer":["Select multiple healing and hospitalization item types; each trusted click uses one selected available carried item","Show + Hosp? and Hosp Time: MM:SS while hospitalized with selected hospitalization items remaining; otherwise show time on the waiting stock button","Configurable warning threshold, progressively faster blinking, independent optional hospital sound and volume","Extra hospitalization requires increased time or a new confirmed result; uncertain item use is never replayed automatically"],"Validation":["Multi-selection persistence, item fallback, pending-click guard, partial healing, deadline warning reset and cleanup","Native-first purchase reconciliation remains covered on PC and PDA"]}},{"version":"0.5.42.64-dev","date":"2026-11-09","changes":{"Purchase first, reconcile afterward":["Buy the quantity Torn currently allows before attempting to reconcile additional capacity","After confirmed purchase and observed inventory update, recheck space/cash/stock and permit one bounded remainder purchase","Never force an upward quantity correction or replay the initial purchase","Preserve the confirmed initial purchase and make Return ready if reconciliation cannot be verified; explain partial/uncertain reconciliation"],"Validation":["Native shown 17 bought first, then only 1 more when verified","Stock/funds changing after first purchase, wrong follow-up confirmation and unconfirmed follow-up without retry","Captured PDA compact quantity panels: 17 first, a fresh panel for the 1-item remainder"]}},{"version":"0.5.42.63-dev","date":"2026-11-09","changes":{"Hospital clock":["Fetch missing hospital deadline once when a hospitalized waiting intent is restored","Avoid repeated lookup attempts and duplicate reads when fresh arming data already contains clock evidence","Read hospital-specific native title metadata in addition to native deadlines and profile until"],"Diagnostics":["Export clock display/availability, deadline/seconds, source, reason, lookup status and safe profile timing flags even with recording off"],"Validation":["Restore a deadline-less hospital wait and recover via one read; unknown timing does not cause polling; structured export without recording"]}},{"version":"0.5.42.62-dev","date":"2026-11-09","changes":{"Hospital countdown":["Show Hospital: N seconds remaining under Waiting for available stock while hospitalized","Read the hospital-specific profile until or native hospital timer; never use flight arrival as hospital time","Update text locally once per second without inventory scans or API polling","Stop the timer when stock is available, the user is released, the sequence ends or the tool exits; show unavailable for unknown timing"],"Validation":["Seconds/milliseconds conversion, anchored relative labels, flight-time exclusion, zero/unknown states and timer cleanup"]}},{"version":"0.5.42.61-dev","date":"2026-11-09","changes":{"Arming without another hospitalization item":["Add None — already used / skip hospitalization to the hospitalization selector","Allow arming with a healing item but no hospitalization item, including during flight or delayed status updates","None disables the Hospitalize Me step and any before-landing use prompt","Wait for available stock and observed hospital status before Heal or subsequent steps"],"Validation":["Explicit UI None, already-hospitalized arming, waiting-stock progression and in-flight no-item guard"]}},{"version":"0.5.42.60-dev","date":"2026-11-09","changes":{"Before landing":["Hospitalize Me is actionable on the outbound flight with a named-item confirmation prompt","Confirming rechecks the current player and outbound destination before selected native item Use/Yes","Decline, changed flight/player, absent native controls and unconfirmed results stop without queuing a later use","Before-landing permission is transient and does not enable healing/destruction/purchases during flight"],"Validation":["Confirmation decline, return-flight/player changes, repeated clicks and native Use/Yes proof"]}},{"version":"0.5.42.59-dev","date":"2026-11-09","changes":{"Inventory Destruction":["Opening the red activation warning automatically populates the inventory selection list","No Load button is required; a Retry control appears only after a loading error","Explicit item selection and Accept remain required; closing the warning ignores pending results"],"Validation":["Automatic list population, no initial Load action, consent/decline and existing Snatch options regressions"]}},{"version":"0.5.42.58-dev","date":"2026-11-09","changes":{"Inventory pickers":["Populate healing, hospitalization and destruction choices directly from current carried foreign inventory","Do not gate visible carried items on inventory/profile API calls","Group duplicate carried item quantities, omit empty slots/home inventory, preserve name-based native selections without invented IDs","Remove the uncategorized inventory request; retain labeled medical API fallback outside visible foreign inventory"],"Validation":["Generated PC UI with rejecting inventory endpoints and current native slots","Both dropdowns, quantities, empty inventory, native ID absence, and existing PC/PDA native action flows"]}},{"version":"0.5.42.57-dev","date":"2026-11-09","changes":{"Snatch planning":["Replace hospital-status question with Planning to Hospitalize and separate healing/hospitalization inventory selections","Offer Hospitalize Me while waiting out of hospital; skip hospitalization when stock arrives before use","Recheck item, player/country, stock and native Use/Yes before hospitalization; wait for observed hospital status"],"Selected destruction":["Require explicit selection and confirmation of item types before enabling destruction","Destroy only selected carried item types and preserve unselected inventory","Invalidate legacy broad destruction consents on restore"]}},{"version":"0.5.42.56-dev","date":"2026-11-08","changes":{"Snatch and Run":["Optional screen-edge alert: thick red while armed/waiting, flashing green with available monitored stock","Optional accepted Inventory Destruction stage: Heal if needed, Destroy Travel Inventory, Purchase Max, Return","Exact user warning with explicit Accept/Decline; decline keeps destruction off","Only native foreign travel inventory Trash confirmations are used; stop on mismatches, stock/hospital changes or unverified removal"],"Validation":["Screen alert states/cleanup, consent gate and decline","Separate trusted action stages, exact Trash/Yes scope, duplicate items, home inventory exclusion and partial-batch stop"]}},{"version":"0.5.42.55-dev","date":"2026-11-08","changes":{"Chat timestamps":["Adapt M'AOL 0.1.29 bounded React message id/createdAt reading without hover or capture-time fallback","Store original UTC time, Unix milliseconds, source and native message identity in chat exports","Keep identical private messages separate by native identity across virtualized windows","Reject ambiguous metadata and prevent hover timestamps overwriting native creation time"],"Validation":["React props/fiber fixtures, secret/accessor exclusion, ambiguous IDs, native identity mismatch and repeated private-message text"]}},{"version":"0.5.42.54-dev","date":"2026-11-08","changes":{"Travel":["Allow outbound foreign-flight arming; preserve waiting intent without a 15-minute timeout","Keep armed intent during identity loading and hide completed return button","Evaluate watched item identities across shop categories and explain empty filtered lists"],"Chat Archiver":["Read explicit native timestamps when available; retain unknown/group time when not available","Pause history capture on a detected reset to latest messages, retaining archive and avoiding false end detection"],"Diagnostics":["Add opt-in passive chat scrolling/progress monitoring with text excluded","Organize system, travel, chat and checklist sections; single Export all diagnostics includes all recorded evidence"]}},{"version":"0.5.42.53-dev","date":"2026-11-07","changes":{"Fixes":["Reacquire current quantity input and item row while preparing Purchase Max after native form updates","Prepare replacement quantity inputs against freshly verified capacity before Buy"],"Diagnostics":["Record quantity preparation and quantity readiness reasons without logging credentials"],"Validation":["Replace a quantity input during native input handling and verify one full-capacity purchase"]}},{"version":"0.5.42.52-dev","date":"2026-11-07","changes":{"Fixes":["Load complete item catalog through authenticated TU Manager transport on desktop and PDA","Permit Public Only and Limited Access login keys for the shared catalog read"],"Validation":["Cold desktop catalog without PDA key or cached items; authenticated request and cached reopen"]}},{"version":"0.5.42.51-dev","date":"2026-11-07","changes":{"Fixes":["Resume previously active Item Monitor after refresh and authorization, minimized and bound to the same player","Persist monitor selection, quantity/price drafts and Snatch and Run setup","Accept matching native purchase success without waiting for delayed inventory tiles","Read foreign cash from the travel banner even when it is outside travel-root"],"Validation":["Full document reload with persisted storage, explicit exit, no automatic arming","Delayed inventory purchase proof and mobile cash banner capacity fixtures"]}},{"version":"0.5.42.50-dev","date":"2026-11-07","changes":{"Fixes":["Keep Snatch and Run taps from dismissing native Torn confirmations while an action is pending","Show Confirming healing, Confirming purchase and Booking return flight during native actions"],"Validation":["Reproduce PDA medical popover dismissal from repeated taps and verify exactly one Heal/Yes without starting Purchase","Keep passive capture diagnostics and red/green dragging functional"]}},{"version":"0.5.42.49-dev","date":"2026-11-07","changes":{"Fixes":["Display foreign catalog locations as country names while retaining Torn Item Market/Bazaar","Restore the existing Travel Assistant and Item Monitor window when opening an already-active tool"],"Validation":["Preserve unsaved fields, monitor runtime and armed Snatch and Run intent during resume","Exercise repeated minimize, launcher restore, card reopen and planner navigation"]}},{"version":"0.5.42.48-dev","date":"2026-11-07","changes":{"Fixes":["Remove the curly apostrophe that became a JavaScript syntax error under Torn PDA adaptSource quote normalization"],"Validation":["Compile the PDA-normalized generated bundle during every build","Reproduce the official script wrapper/quote normalization and verify PDA Manager, launcher and tool registration startup"]}},{"version":"0.5.42.47-dev","date":"2026-11-07","changes":{"Fixes":["Recheck live travel capacity, visible cash, unit price and stock when Purchase Max is selected","Account for the exact consumed medical slot, including stale result tiles","Update the native quantity field when Max is stale and verify the item/quantity confirmation before Yes"],"Diagnostics":["Record capacity verification, free slots, native Max, selected quantity and limiting factor without exposing wallet balance"]}},{"version":"0.5.42.46-dev","date":"2026-11-07","changes":{"Fixes":["Open Travel home even when its empty/collapsed panel container already exists","Wait for the rendered Torn destination question and enabled Travel Back control before confirmation","Recognize automatic flight navigation instead of waiting for a vanished Continue control"],"Compatibility":["Shared PC/PDA return adapter; purchase and medical stages unchanged"],"Features":["Draggable red/green Snatch and Run button with saved, bounded screen position","TU Test records Snatch and Run lifecycle, native clicks, outcomes, blocked clicks and errors"]}},{"version":"0.5.42.45-dev","date":"2026-11-07","changes":{"Fixes":["Resolve legacy name-based foreign monitors from an exact current native item form and Buy panel","Retain native form/Buy item IDs when selecting new watches","Support Purchase Max without hospitalization or medical selection for both hosts","Defer integrated startup until BODY exists and keep saved launcher coordinates within bounds"],"Diagnostics":["Export startup phase/error and launcher presence/position to distinguish PDA loading failures from hidden UI"]}},{"version":"0.5.42.44-dev","date":"2026-11-07","changes":{"Features":["Enable native Snatch and Run actions in Torn PDA using captured mobile foreign-page controls"],"Fixes":["Open the compact item-specific quantity panel before selecting Max, Buy and matching Yes","Ignore hidden desktop fields when using the PDA layout","Share confirmed Morphine/medical release, purchase inventory proof and Travel home/Back/Continue handling across PC and PDA"],"Compatibility":["PC Tampermonkey path retained; fixture-tested on both captured layouts, live PDA acceptance pending; production unchanged"]}},{"version":"0.5.42.43-dev","date":"2026-11-07","changes":{"Features":["Desktop Tampermonkey native Snatch and Run action adapter based on captured foreign-page DOM"],"Fixes":["Heal opens the selected inventory slot, uses the item and confirms its matching Yes","Purchase Max uses the native icon/text input and matching item/quantity Yes confirmation","Return to Torn handles Travel home, Travel Back and Continue","Native release and selected-item inventory changes advance stages without waiting for cached API status"],"Compatibility":["Desktop Tampermonkey only; PDA action path unchanged; production remains on hold"]}},{"version":"0.5.42.42-dev","date":"2026-11-07","changes":{"Fixes":["Remove full-resolution logo link from About","Align monitored-only checkbox beside its label","Collapse unmonitored foreign item containers so watched items rise to the top of the list; restore on disable/Exit"]}},{"version":"0.5.42.41-dev","date":"2026-11-07","changes":{"Features":["One red/green Snatch and Run button with automatic matching of visible Torn controls","Arming minimizes the main window; labeled conditional medical selection"],"Fixes":["Remove native-control selection buttons and floating status panel","Bounded status refresh after user-initiated healing and return actions"]}},{"version":"0.5.42.40-dev","date":"2026-11-06","changes":{"Features":["Show monitored items only, with reversible native-listing filtering","Opt-in Snatch and Run native-control workflow with explicit clicks and confirmed results"],"Fixes":["Monitor alarms preserve minimized windows"],"Compatibility":["Optimized approved-logo WebP embedded once; original master retained","Native confirmation/navigation and actual PDA acceptance remain required"]}},{"version":"0.5.42.39-dev","date":"2026-11-06","changes":{"Fixes":["Use the official Torn PDA native HTTP bridge with headers for registration and authenticated GET requests","Bind modern GM requests correctly; preserve HTTP rejection status and identify failed request phase without credentials"]}},{"version":"0.5.42.38-dev","date":"2026-11-05","changes":{"Fixes":["Reuse short-lived session verification and cached identity across page navigation","Agreement verification uses version metadata; full text is fetched only for review/acceptance","Remove one-second authorization polling; recheck on relevant activity, resume and backend denial","Observe TU windows only while in use; no global subtree observer in the idle Manager"]}},{"version":"0.5.42.37-dev","date":"2026-11-05","changes":{"Fixes":["Ignore unrelated Torn DOM changes in Manager visibility/layout observers","Batch TU window updates per animation frame; stop rewriting initialized headers","Skip Item Monitor page scans without monitors or while the page is hidden"],"Compatibility":["PDA performance mitigation; actual device retesting required"]}},{"version":"0.5.42.36-dev","date":"2026-11-05","changes":{"Fixes":["Retain each validated API key independently with its own verified access level and owner","Adding keys preserves the active login; explicit saved-key login and War Organizer selection","Remove selected keys from legacy role stores as well as the saved-key list; prevent cleared login resurrection"],"Migration":["Legacy saved keys are recovered and shown individually; recheck legacy access levels in Settings"]}},{"version":"0.5.42.35-dev","date":"2026-11-05","changes":{"Fixes":["Removed flare highlights from the Integrated Gold logo"],"Compatibility":["Existing launcher sizing and embedded image delivery retained"]}},{"version":"0.5.42.34-dev","date":"2026-11-05","changes":{"Removed":["Stock and Calculations removed from the integrated application"],"Features":["10 retained integrated tools"],"Migration":["Existing saved data and historical releases retained"]}},{"version":"0.5.42.33-dev","date":"2026-11-05","changes":{"Features":["Selected sample #1 Integrated Gold logo embedded in launcher, headers and War Organizer"],"Compatibility":["High-resolution transparent PNG; compact launcher dimensions preserved"],"Migration":["Logo-only DEV update; settings and previous release retained"]}},{"version":"0.5.42.32-dev","date":"2026-11-05","changes":{"Features":["One DEV userscript with 11 tools and lazy tool factories","Embedded structured Version Notes"],"Fixes":["Internal registration across userscript and page contexts","Updated retained tool sources","Activation failure clears active state"],"Removed":["External module installation and catalog diagnostics","Obsolete war diagnostic excluded"],"Compatibility":["Desktop Tampermonkey and Torn PDA adapters retained; device acceptance required"],"Migration":["Existing storage namespaces retained","Previous DEV Manager preserved"]}},{"version":"0.5.42.31-integration-dev","date":"2026-11-05","changes":{"Features":["Initial integration staging at b5ba89c"],"Migration":["Not a validated single-script release"]}}];
  const versionCompare=(a,b)=>{const aa=String(a||'0').split('.').map(v=>parseInt(v,10)||0),bb=String(b||'0').split('.').map(v=>parseInt(v,10)||0);for(let i=0;i<3;i++)if(aa[i]!==bb[i])return (aa[i]||0)-(bb[i]||0);return 0;};
  // Lifecycle API: modules register inert factories; only this manager calls activate().
  const registered = new Map();
  let active = null,observationReady=false;
  const moduleHost = document.createElement('div');
  moduleHost.id = 'tu-pda-module-host';
  moduleHost.hidden = true;
  document.body.appendChild(moduleHost);
  // v0.3 storage: synchronous, namespaced, JSON values; available to independently installed modules.
  const DATA_PREFIX='tu:data:v1:';
  const VALID_ID=/^[a-z0-9-]{1,64}$/;
  const VALID_KEY=/^[a-zA-Z0-9_.-]{1,100}$/;
  const storageKey=(id,key)=>{
    if(!VALID_ID.test(id)||!VALID_KEY.test(key))throw new Error('Invalid TU storage namespace/key');
    return DATA_PREFIX+id+':'+key;
  };
  const storage=Object.freeze({
    get(id,key,fallback=null){
      const raw=localStorage.getItem(storageKey(id,key));
      if(raw===null)return fallback;
      try{return JSON.parse(raw);}catch{return fallback;}
    },
    set(id,key,value){
      if(value===undefined)throw new Error('Cannot store undefined');
      localStorage.setItem(storageKey(id,key),JSON.stringify(value));
      return true;
    },
    remove(id,key){localStorage.removeItem(storageKey(id,key));},
    keys(id){
      if(!VALID_ID.test(id))throw new Error('Invalid namespace');
      const prefix=DATA_PREFIX+id+':';
      return Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length)).sort();
    },
    clear(id){for(const key of this.keys(id))localStorage.removeItem(storageKey(id,key));},
    namespaces(){
      return [...new Set(Object.keys(localStorage).filter(k=>k.startsWith(DATA_PREFIX))
        .map(k=>k.slice(DATA_PREFIX.length).split(':')[0]))].sort();
    }
  });
  function exportData(){
    const data={format:'torn-utilities-backup',schema:1,createdAt:new Date().toISOString(),managerSettings:saved,modules:{}};
    for(const id of storage.namespaces()){
      data.modules[id]={};
      for(const key of storage.keys(id))data.modules[id][key]=storage.get(id,key);
    }
    return JSON.stringify(data,null,2);
  }
  function importData(text){
    if(text.length>3_000_000)throw new Error('Backup exceeds 3 MB limit');
    const data=JSON.parse(text);
    if(data?.format!=='torn-utilities-backup'||data.schema!==1||
       !data.modules||typeof data.modules!=='object'||Array.isArray(data.modules))throw new Error('Invalid backup format');
    const pending=[];
    for(const [id,records] of Object.entries(data.modules)){
      if(!VALID_ID.test(id)||!records||typeof records!=='object'||Array.isArray(records))throw new Error('Invalid tool data');
      for(const [key,value] of Object.entries(records))pending.push([storageKey(id,key),JSON.stringify(value)]);
    }
    if(pending.length>2000)throw new Error('Too many backup entries');
    // Additive restore: existing keys not in the backup are preserved.
    for(const [key,value] of pending)localStorage.setItem(key,value);
    if(data.managerSettings&&typeof data.managerSettings==='object'&&!Array.isArray(data.managerSettings)){
      saved.disabled={...(saved.disabled||{}),...(data.managerSettings.disabled||{})};
      persist();
    }
    return pending.length;
  }
  // Credentials use private userscript storage where the verified host supports it.
  const VAULT='tu:identity:public-only-key:v1',VAULT_CLEARED='tu:identity:login-cleared:v1';
  const LOGIN_ACCESS_KEY='tu:identity:login-access-level:v1';
  const AUTH_CACHE='tu:dev:authorization-cache:v1',IDENTITY_CACHE='tu:dev:identity-cache:v1',AGREEMENT_CACHE='tu:dev:agreement-content:v1';
  const AUTH_TTL=5*60*1000,IDENTITY_TTL=30*60*1000,AGREEMENT_TTL=24*60*60*1000;
  const credentials=createCredentialStore({window,handler:typeof GM_info==='undefined'?'':GM_info.scriptHandler||'',pda:!!nativeBridge||typeof pageWindow.PDA_httpGet==='function',getValue:typeof GM_getValue==='function'?GM_getValue:null,setValue:typeof GM_setValue==='function'?GM_setValue:null,deleteValue:typeof GM_deleteValue==='function'?GM_deleteValue:null});
  let identityDeletionInProgress=false;
  const sessionTokens=(function createSessionTokenStore({window,privateMode=false,getValue,setValue,deleteValue,listValues,blocked=()=>false}){
 const TOKEN='tu:dev:auth:session:v1',CACHE='tu:dev:authorization-cache:v1',TAB='tu:session:tab:v1';
 let failure=null,tab=window.sessionStorage.getItem(TAB);
 if(!/^[0-9a-f-]{36}$/i.test(tab||'')){tab=window.crypto.randomUUID();window.sessionStorage.setItem(TAB,tab);}
 const recordKey='tu:session:private:v1:'+tab;
 function read(){const value=getValue(recordKey,null);if(value&&typeof value.then==='function')throw Error('Asynchronous private session storage unsupported');if(value==null)return null;const record=typeof value==='string'?JSON.parse(value):value;if(typeof record.token!=='string'||!record.token||typeof record.marker!=='string'||!Number.isFinite(record.expiresAt))throw Error('Invalid private session record');return record;}
 function removeRecord(){if(deleteValue)deleteValue(recordKey);else setValue(recordKey,null);if(read()!==null)throw Error('Private session removal failed');}
 function persist(record){const encoded=JSON.stringify(record),result=setValue(recordKey,encoded);if(result&&typeof result.then==='function')throw Error('Asynchronous private session storage unsupported');if(JSON.stringify(read())!==encoded)throw Error('Private session write failed');}
 function scrubCache(marker){for(const name of [CACHE,'tu:dev:identity-cache:v1'])try{const cache=JSON.parse(window.sessionStorage.getItem(name)||'null');if(cache&&typeof cache==='object'){delete cache.token;cache.sessionMarker=marker;window.sessionStorage.setItem(name,JSON.stringify(cache));}}catch{window.sessionStorage.removeItem(name);}}
 if(privateMode)try{
  const current=read(),legacy=window.sessionStorage.getItem(TOKEN);
  if(!current&&legacy)persist({token:legacy,marker:window.crypto.randomUUID(),expiresAt:Date.now()+86400000});
  const record=read();scrubCache(record?.marker||'');window.sessionStorage.removeItem(TOKEN);
 }catch{failure='Private session storage unavailable';}
 const ensure=()=>{if(failure)throw Error(failure);};
 return {
  get(){if(!privateMode)return window.sessionStorage.getItem(TOKEN)||'';try{ensure();const record=read();if(record&&record.expiresAt<=Date.now()){removeRecord();return '';}return record?.token||'';}catch{return '';}},
  marker(){if(!privateMode){let marker=window.sessionStorage.getItem(TAB+':marker');if(!marker){marker=window.crypto.randomUUID();window.sessionStorage.setItem(TAB+':marker',marker);}return marker;}ensure();return read()?.marker||'';},
  set(token){if(blocked())throw Error('Account deletion in progress');if(typeof token!=='string'||!token)throw Error('Invalid session token');if(!privateMode){window.sessionStorage.setItem(TOKEN,token);window.sessionStorage.setItem(TAB+':marker',window.crypto.randomUUID());scrubCache(window.sessionStorage.getItem(TAB+':marker'));return;}ensure();persist({token,marker:window.crypto.randomUUID(),expiresAt:Date.now()+86400000});window.sessionStorage.removeItem(TOKEN);scrubCache(read().marker);},
  clear(){if(privateMode){ensure();removeRecord();}window.sessionStorage.removeItem(TOKEN);window.sessionStorage.removeItem(CACHE);window.sessionStorage.removeItem(TAB+':marker');},
  async eraseHashes(hashes){
   const targets=new Set(hashes);const hash=async token=>Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(n=>n.toString(16).padStart(2,'0')).join('');
   if(privateMode){if(typeof listValues!=='function')throw Error('Private session enumeration unavailable');for(const key of listValues()){if(!key.startsWith('tu:session:private:v1:'))continue;const raw=getValue(key,null);if(raw==null)continue;const record=typeof raw==='string'?JSON.parse(raw):raw;if(typeof record?.token!=='string')throw Error('Unknown private session record');if(targets.has(await hash(record.token))){if(deleteValue)deleteValue(key);else setValue(key,null);if(getValue(key,null)!=null)throw Error('Private session cleanup failed');}}}
   const current=this.get();if(current&&targets.has(await hash(current)))this.clear();
  },
  status:()=>({mode:privateMode?'userscript-private':'origin-session',error:failure})
 };
})({window,privateMode:credentials.mode!=='origin-local',getValue:typeof GM_getValue==='function'?GM_getValue:null,setValue:typeof GM_setValue==='function'?GM_setValue:null,deleteValue:typeof GM_deleteValue==='function'?GM_deleteValue:null,listValues:typeof GM_listValues==='function'?GM_listValues:null,blocked:()=>identityDeletionInProgress||!!readCredential('tu:dev:deletion-job:v1')});
  const readCredential=name=>{try{return credentials.get(name);}catch{return null;}};
  const readCache=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
  const fresh=(entry,ttl)=>entry&&Number.isFinite(entry.checkedAt)&&entry.checkedAt<=Date.now()&&Date.now()-entry.checkedAt<ttl;
  const clearAuthorizationCache=()=>{sessionStorage.removeItem(AUTH_CACHE);};

  const loginAccessLabel=()=>readStoredKeys().find(entry=>entry.key===readSavedKey())?.level||'Access level unverified';
  const normalizeKey=v=>{if(typeof v!=='string')return '';let x=v.trim();for(let i=0;i<3;i++){if(x.startsWith('GMV2_')){x=x.slice(5);continue;}if(x.startsWith('"')&&x.endsWith('"')){try{const y=JSON.parse(x);if(typeof y==='string'){x=y.trim();continue}}catch{}}break;}return /^[A-Za-z0-9]{16}$/.test(x)?x:'';};
  const readSavedKey=()=>{let value='';try{value=readCredential(VAULT)||'';}catch{return '';}let key=normalizeKey(value);if(key)return key;if(credentials.mode!=='origin-local'||readCredential(VAULT_CLEARED)==='1')return '';try{return normalizeKey(typeof GM_getValue==='function'?GM_getValue(VAULT,''):'');}catch{return '';}};
  const saveKey=key=>{if(identityDeletionInProgress||readCredential('tu:dev:deletion-job:v1'))throw Error('Account deletion in progress');clearAuthorizationCache();sessionStorage.removeItem(IDENTITY_CACHE);credentials.set(SAVED_KEYS,JSON.stringify(readStoredKeys()));credentials.set(VAULT,key);credentials.remove(VAULT_CLEARED);};
  const removeSavedKey=()=>{clearAuthorizationCache();sessionStorage.removeItem(IDENTITY_CACHE);credentials.set(VAULT_CLEARED,'1');localStorage.setItem(VAULT_CLEARED,'1');localStorage.removeItem(LOGIN_ACCESS_KEY);credentials.remove(VAULT);if(credentials.mode==='origin-local')try{if(typeof GM_deleteValue==='function')GM_deleteValue(VAULT);else if(typeof GM_setValue==='function')GM_setValue(VAULT,'');}catch{}};
  const SAVED_KEYS='tu:identity:saved-keys:v1',WHO_KEY='tu:who:limited-api-key:v1',EXTRA_KEYS='tu:api:additional-keys:v1';
  const readExtras=()=>{try{const list=JSON.parse(readCredential(EXTRA_KEYS)||'[]');return Array.isArray(list)?list.filter(x=>normalizeKey(x?.key)):[]}catch{return []}};
  function readStoredKeys(){
    let records=[];try{const data=JSON.parse(readCredential(SAVED_KEYS)||'[]');if(Array.isArray(data))records=data}catch{}
    const keys=new Map();
    for(const entry of records){const key=normalizeKey(entry?.key);if(key&&!keys.has(key))keys.set(key,{key,level:['Public Only','Limited Access'].includes(entry.level)?entry.level:null,playerId:/^[1-9][0-9]*$/.test(String(entry.playerId||''))?String(entry.playerId):null,verifiedAt:typeof entry.verifiedAt==='string'?entry.verifiedAt:null});}
    // Recover every legacy key without treating stale role labels as verified access.
    for(const value of [readSavedKey(),readCredential(WHO_KEY),...readExtras().map(e=>e.key)]){const key=normalizeKey(value);if(key&&!keys.has(key))keys.set(key,{key,level:null,playerId:null,verifiedAt:null});}
    return [...keys.values()];
  }
  function rememberVerifiedKey(key,level,playerId,{deletion=false}={}){
    if(!deletion&&(identityDeletionInProgress||readCredential('tu:dev:deletion-job:v1')))throw Error('Account deletion in progress');
    if(!normalizeKey(key)||!['Public Only','Limited Access'].includes(level))throw Error('Unsupported verified key');
    const entries=readStoredKeys(),entry=entries.find(e=>e.key===key)||{key};
    const previous=entries.findIndex(e=>e.key===key);
    Object.assign(entry,{level,playerId:/^[1-9][0-9]*$/.test(String(playerId||''))?String(playerId):entry.playerId||null,verifiedAt:new Date().toISOString()});
    if(previous<0)entries.push(entry);else entries[previous]=entry;
    credentials.set(SAVED_KEYS,JSON.stringify(entries));
    return entry;
  }
  function forgetStoredKey(key){
    const remaining=readStoredKeys().filter(e=>e.key!==key);
    if(readSavedKey()===key)removeSavedKey();
    if(normalizeKey(readCredential(WHO_KEY))===key)credentials.remove(WHO_KEY);
    credentials.set(EXTRA_KEYS,JSON.stringify(readExtras().filter(e=>normalizeKey(e.key)!==key)));
    credentials.set(SAVED_KEYS,JSON.stringify(remaining));
  }
  function checkedKeyInfo(data){
    if(data?.error)throw Error('Torn rejected key');
    const level=String(data?.info?.access?.type??data?.info?.access??'').trim(),playerId=Number(data?.info?.user?.id);
    if(!['Public Only','Limited Access'].includes(level))throw Error('Only Public Only or Limited Access keys are supported');
    if(!Number.isSafeInteger(playerId)||playerId<=0)throw Error('Torn did not return a valid key owner');
    return {level,playerId:String(playerId)};
  }
  // Explicit user-provided Public Only key; never persisted or broadcast.
  let playerInfo=null,identityStatus='Enter your Public Only or Limited Access API key',identityBusy=null,authGeneration=0;
  const getPlayer=()=>playerInfo?Object.freeze({...playerInfo}):null;
  let automaticIdentityAttempted=false;
  const openProfileHelp=()=>{panel.hidden=false;render('settings');syncLauncher();};
  const clearPlayer=()=>{authGeneration++;playerInfo=null;identityStatus='No verified session';pageWindow.dispatchEvent(new CustomEvent('tu-player-updated',{detail:null}));};
  const requestIdentity=(key,{revalidate=false}={})=>new Promise((resolve,reject)=>{
    const url='https://api.torn.com/v2/key/info';
    if(typeof managerHttp==='function')managerHttp({method:'GET',url,tuApiRevalidate:revalidate,timeout:12000,headers:{Authorization:'ApiKey '+key,Accept:'application/json'},onload:r=>{try{if(r.status<200||r.status>=300)throw Error('HTTP '+r.status);resolve(JSON.parse(r.responseText));}catch(e){reject(e)}},onerror:e=>reject(Object.assign(Error(e?.error||'Network error'),{code:e?.code,retryAfterMs:e?.retryAfterMs})),ontimeout:()=>reject(Error('Timeout'))});
    else{const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);fetch(url,{tuApiRevalidate:revalidate,headers:{Authorization:'ApiKey '+key,Accept:'application/json'},signal:c.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(resolve,reject).finally(()=>clearTimeout(t));}
  });
  const requestPublicJson=(url,key)=>new Promise((resolve,reject)=>{
    if(typeof managerHttp==='function')managerHttp({method:'GET',url,timeout:12000,headers:{Authorization:'ApiKey '+key,Accept:'application/json'},onload:r=>{try{if(r.status<200||r.status>=300)throw Error('HTTP '+r.status);const data=JSON.parse(r.responseText);if(data.error)throw Error(data.error.error||'API error');resolve(data)}catch(e){reject(e)}},onerror:e=>reject(Object.assign(Error(e?.error||'Network error'),{code:e?.code,retryAfterMs:e?.retryAfterMs})),ontimeout:()=>reject(Error('Timeout'))});
    else fetch(url,{headers:{Authorization:'ApiKey '+key,Accept:'application/json'},cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(resolve,reject);
  });
  async function enrichIdentity(key,generation){
    if(!playerInfo||generation!==authGeneration)return;
    const id=playerInfo.id,fid=playerInfo.factionId;
    const [user,faction]=await Promise.allSettled([requestPublicJson('https://api.torn.com/user/'+encodeURIComponent(id)+'?selections=profile&key='+encodeURIComponent(key),key),fid?requestPublicJson('https://api.torn.com/faction/'+encodeURIComponent(fid)+'?selections=basic&key='+encodeURIComponent(key),key):Promise.resolve(null)]);
    if(generation!==authGeneration||playerInfo?.id!==id)return;
    const u=user.status==='fulfilled'?user.value:null,fa=faction.status==='fulfilled'?faction.value:null;
    const factionFromUser=u?.faction?.faction_name||u?.faction?.name;
    playerInfo={...playerInfo,name:u?.name||u?.player?.name||playerInfo.name||null,factionName:fa?.name||fa?.faction?.name||factionFromUser||playerInfo.factionName||null,updatedAt:Date.now()};
    cacheIdentity();pageWindow.dispatchEvent(new CustomEvent('tu-player-updated',{detail:{...playerInfo}}));
  }
  async function updatePlayer(key,verifiedData=null){
    if(typeof key!=='string')return !!playerInfo;
    if(identityBusy)return identityBusy;
    const generation=++authGeneration;
    identityBusy=(async()=>{
      try{
        if(!/^[a-zA-Z0-9]{16}$/.test(key))throw Error('Invalid 16-character key');
        const data=verifiedData||await requestIdentity(key);
        if(data?.error)throw Error('Torn rejected key');
        if(!['Public Only','Limited Access'].includes(data?.info?.access?.type??data?.info?.access))throw Error('Public Only or Limited Access key required');
        const id=Number(data?.info?.user?.id),faction=Number(data?.info?.user?.faction_id||0);
        if(!Number.isSafeInteger(id)||id<=0)throw Error('Key owner not returned');
        if(generation!==authGeneration)return false;
        const checked=checkedKeyInfo(data);rememberVerifiedKey(key,checked.level,checked.playerId);
        if(key===readSavedKey())localStorage.setItem(LOGIN_ACCESS_KEY,checked.level==='Limited Access'?'limited':'public');
        playerInfo={id:String(id),name:null,factionId:Number.isSafeInteger(faction)&&faction>0?faction:null,factionName:null,profileUrl:'https://www.torn.com/profiles.php?XID='+id,updatedAt:Date.now()};
        const warKey=readStoredKeys().find(entry=>entry.key===normalizeKey(readCredential(WHO_KEY)));if(warKey?.playerId&&warKey.playerId!==String(id))credentials.remove(WHO_KEY);
        cacheIdentity();identityStatus='Verified by Torn API';pageWindow.dispatchEvent(new CustomEvent('tu-player-updated',{detail:{...playerInfo}}));void enrichIdentity(key,generation);return true;
      }catch(e){if(generation===authGeneration){playerInfo=null;identityStatus='Verification failed: '+e.message;}return false;}
      finally{identityBusy=null;}
    })();return identityBusy;
  }
  // Restore identity once per page load. Never send the stored key to modules.
  function cacheIdentity(){
    if(playerInfo&&devToken())sessionStorage.setItem(IDENTITY_CACHE,JSON.stringify({sessionMarker:sessionTokens.marker(),checkedAt:Date.now(),player:playerInfo}));
  }
  async function restoreSavedIdentity(){
    if(automaticIdentityAttempted)return;
    automaticIdentityAttempted=true;
    const key=readSavedKey();if(!key)return;
    const cached=readCache(IDENTITY_CACHE),entry=readStoredKeys().find(e=>e.key===key);
    if(cached?.sessionMarker===sessionTokens.marker()&&cached.player?.id&&entry?.playerId===String(cached.player.id)&&entry.level){
      playerInfo={...cached.player};identityStatus='Verified session identity restored';refreshIdentity();if(!fresh(cached,IDENTITY_TTL))void enrichIdentity(key,authGeneration);return;
    }
    identityStatus='Verifying saved Torn API key…';
    const ok=await updatePlayer(key);
    if(!ok)console.warn('[TU] Saved key verification unavailable');
    refreshIdentity();
    if(currentTab==='settings'&&!panel.hidden)render('settings');
  }
  let authorizationVerified=false,authRestorePending=true,authOpenRequested=false;
  const authorized=()=>!identityDeletionInProgress&&!readCredential('tu:dev:deletion-job:v1')&&authorizationVerified&&!!devToken()&&!!readSavedKey()&&!!TU_TERMS_VERSION&&localStorage.getItem(TU_TERMS_KEY)===TU_TERMS_VERSION;
  const publishAuthorization=ok=>{authorizationVerified=!!ok;pageWindow.dispatchEvent(new CustomEvent('tu-authorization-change',{detail:{authorized:authorized()}}));if(!authorized())stopModule();};
  const api = Object.freeze({
    isAuthorized:()=>authorized(),
    prepareBackendRequest:(url,options)=>tuPrepareBackend(url,options,{authorized:authorized(),token:devToken()}),
    async getAgreementVersion({refresh=false}={}){
      if(!devToken()||!readSavedKey())throw Error('An authenticated DEV session is required');
      if(refresh){
        // Independent TU Test gets a read-only status check, never registration
        // or automatic agreement acceptance through this bridge.
        try{
          const status=await devRequest('/api/auth/agreement','GET');applyAgreementMetadata(status.agreement);
          if(!status.accepted){clearAuthorizationCache();localStorage.removeItem(TU_TERMS_KEY);publishAuthorization(false);return {agreement_version:TU_TERMS_VERSION,accepted:false,checkedAt:Date.now()};}
          rememberAuthorization(status);publishAuthorization(true);
        }catch{clearAuthorizationCache();publishAuthorization(false);throw Error('DEV agreement verification unavailable; reopen TU to restore the session');}
      }else await restoreDevSession();
      if(!authorized()||!currentDevAgreement)throw Error('DEV agreement verification unavailable');
      return {agreement_version:TU_TERMS_VERSION,accepted:true,checkedAt:readCache(AUTH_CACHE)?.checkedAt||null};
    },
    handleBackendAuthorizationFailure:()=>{clearAuthorizationCache();publishAuthorization(false);void restoreDevSession({force:true});},
    storage,
    fetchWithApiBudget:(url,options,transport)=>apiGovernor.fetch(url,options,transport),
    requestWithApiBudget:(details,transport)=>apiGovernor.request(details,transport),
    apiRequestWithBudget:(url,options,send)=>apiGovernor.run(url,options,send),
    apiBudgetStatus:()=>apiGovernor.snapshot(),
    getLogo:()=>TU_LOGO,
    getPlayer,
    async requestTorn(path,{format='json'}={}){
      if(!await ensureAuthorization())throw Error('TU Manager authentication required');
      if(!isScopedTornRead(path,'faction'))throw Error('Unsupported Torn API path');
      const key=readSavedKey();if(!key)throw Error('Set Public Only API key in TU Manager Settings');
      const url='https://api.torn.com'+path;
      const raw=await new Promise((resolve,reject)=>{
        if(typeof managerHttp==='function')managerHttp({method:'GET',url,timeout:30000,headers:{Authorization:'ApiKey '+key,Accept:format==='text'?'text/csv,application/json':'application/json'},onload:r=>r.status>=200&&r.status<300?resolve(r.responseText):reject(Error('HTTP '+r.status)),onerror:e=>reject(Object.assign(Error(e?.error||'Network error'),{code:e?.code,retryAfterMs:e?.retryAfterMs})),ontimeout:()=>reject(Error('Timeout'))});
        else fetch(url,{headers:{Authorization:'ApiKey '+key},cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject(Error('HTTP '+r.status))).then(resolve,reject);
      });
      if(format==='text')return raw;
      const data=JSON.parse(raw);if(data?.error)throw Error(data.error.error||'Torn API error');return data;
    },
    async requestTravelInfo(kind){
      if(!await ensureAuthorization())throw Error('TU authentication required');
      const paths={profile:'/v2/user/profile',travel:'/v2/user/travel',inventory:'/v2/user/inventory?cat=medical',cooldowns:'/v2/user/cooldowns',catalog:'/v2/torn/items'};
      if(!Object.hasOwn(paths,kind))throw Error('Unsupported Travel Assistant read');
      const key=readSavedKey(),entry=readStoredKeys().find(e=>e.key===key);
      if(!['profile','catalog'].includes(kind)&&entry?.level!=='Limited Access')throw Error('Use a verified Limited Access login key for medical inventory/travel data, then retry');
      if(!entry?.playerId||entry.playerId!==getPlayer()?.id)throw Error('Verify the current player before loading travel data');
      const url='https://api.torn.com'+paths[kind];
      const response=await new Promise((resolve,reject)=>{
        if(managerHttp)managerHttp({method:'GET',url,headers:{Authorization:'ApiKey '+key,Accept:'application/json'},timeout:12000,onload:r=>{try{if(r.status<200||r.status>=300)throw Error('Torn API HTTP '+r.status);const d=JSON.parse(r.responseText);if(d.error)throw Error('Torn rejected the travel data request');resolve(d);}catch(error){reject(error)}},onerror:e=>reject(Object.assign(Error(e?.error||'Travel data network failure'),{code:e?.code,retryAfterMs:e?.retryAfterMs})),ontimeout:()=>reject(Error('Travel data timeout'))});
        else fetch(url,{headers:{Authorization:'ApiKey '+key},cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Torn API HTTP '+r.status);const d=await r.json();if(d.error)throw Error('Torn rejected the travel data request');return d;}).then(resolve,reject);
      });return response;
    },
    async requestWhoTorn(path){
      if(!await ensureAuthorization())throw Error('TU Manager authentication required');
      if(!isScopedTornRead(path,'who'))throw Error('Unsupported WHO API path');
      const key=normalizeKey(readCredential('tu:who:limited-api-key:v1')||'')||(localStorage.getItem(LOGIN_ACCESS_KEY)==='limited'?readSavedKey():'');
      const keyEntry=readStoredKeys().find(entry=>entry.key===key);
      if(!key||keyEntry?.level!=='Limited Access'||!playerInfo?.id||keyEntry.playerId!==playerInfo.id)throw Error('Recheck and select a Limited Access key for the current TU player in Settings > API Keys');
      const url='https://api.torn.com'+path;
      const data=await new Promise((resolve,reject)=>{
        if(typeof managerHttp==='function')managerHttp({method:'GET',url,timeout:20000,headers:{Authorization:'ApiKey '+key,Accept:'application/json'},onload:r=>{try{if(r.status<200||r.status>=300)throw Error('HTTP '+r.status);resolve(JSON.parse(r.responseText))}catch(e){reject(e)}},onerror:e=>reject(Object.assign(Error(e?.error||'Network error'),{code:e?.code,retryAfterMs:e?.retryAfterMs})),ontimeout:()=>reject(Error('Timeout'))});
        else fetch(url,{headers:{Authorization:'ApiKey '+key,Accept:'application/json'},cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(resolve,reject);
      });
      if(data?.error)throw Error(data.error.error||'Torn API error');
      return data;
    },
    getFaction:()=>playerInfo?.factionId?Object.freeze({id:playerInfo.factionId,name:playerInfo.factionName||null}):null,
    refreshPlayer:()=>Promise.resolve(!!playerInfo),
    requestPlayerProfile:openProfileHelp,
    closeActiveModule(){stopModule();tuShow('tu-pda-panel');viewModule=null;render('modules');syncLauncher();},
    registerTool(def) {
      if (!def || typeof def.id !== 'string' || !/^[a-z0-9-]+$/.test(def.id) ||
          typeof def.activate !== 'function' || typeof def.deactivate !== 'function' ||
          registered.has(def.id)||!registry.modules.some(t=>t.id===def.id)) return false;
      if(def.id==='item-monitor')queueMicrotask(()=>void resumeSavedMonitor());
      registered.set(def.id, Object.freeze({id:def.id, version:typeof def.version==='string'?def.version:null, activate:def.activate, resume:typeof def.resume==='function'?def.resume:null, deactivate:def.deactivate}));
      if (typeof render === 'function'&&!panel.hidden) render(currentTab);
      return true;
    },
    isRegistered(id) { return registered.has(id); },
    isActive(id) { return active === id; }
  });
  tuPrivateManager=api;
  const privateMethods=new Set(['requestTorn','requestTravelInfo','requestWhoTorn','fetchWithApiBudget','requestWithApiBudget','apiRequestWithBudget','prepareBackendRequest','handleBackendAuthorizationFailure']);
  const publicApi=Object.freeze(Object.fromEntries(Object.entries(api).filter(([name])=>!privateMethods.has(name))));
  Object.defineProperty(pageWindow,'TornUtilities',{value:publicApi,configurable:false,writable:false});
  // Share the integrated tool API with both the page and userscript sandbox.
  if(window!==pageWindow)try{Object.defineProperty(window,'TornUtilities',{value:publicApi,configurable:true});}catch(error){console.warn('[TU] Sandbox API bridge unavailable',error);}
  pageWindow.dispatchEvent(new Event('torn-utilities-ready'));
  if(window!==pageWindow)window.dispatchEvent(new Event('torn-utilities-ready'));
  let TU_TERMS_VERSION=null;
  let currentDevAgreement=null;
  let currentDevAgreementContent='';

  // DEVELOPMENT BUILD ONLY. This code is not deployed from main.
  const DEV_BASE='https://tu-multiplayer-server-dev.tuserver.workers.dev';
  function applyAgreementMetadata(a){
    if(!a||typeof a.agreement_version!=='string'||!a.agreement_version.trim())throw Error('Current DEV agreement version unavailable');
    if(TU_TERMS_VERSION!==a.agreement_version)currentDevAgreementContent='';
    currentDevAgreement={agreement_version:a.agreement_version,agreement_number:a.agreement_number??null,agreement_date:a.agreement_date??null};
    TU_TERMS_VERSION=a.agreement_version;
    return currentDevAgreement;
  }
  function rememberAuthorization(status,token=devToken()){
    applyAgreementMetadata(status.agreement);
    if(status.accepted!==true)throw Error('Current agreement requires acceptance');
    localStorage.setItem(TU_TERMS_KEY,TU_TERMS_VERSION);
    sessionStorage.setItem(AUTH_CACHE,JSON.stringify({sessionMarker:sessionTokens.marker(),build:TU_VERSION,checkedAt:Date.now(),agreement:currentDevAgreement,accepted:true}));
  }
  function freshAuthorization(){
    const cached=readCache(AUTH_CACHE);
    return fresh(cached,AUTH_TTL)&&cached.build===TU_VERSION&&cached.sessionMarker===sessionTokens.marker()&&cached.accepted===true&&cached.agreement?.agreement_version===localStorage.getItem(TU_TERMS_KEY)?cached:null;
  }
  let agreementLoad=null;
  async function loadDevAgreement({force=false}={}){
    const cached=readCache(AGREEMENT_CACHE);
    if(!force&&fresh(cached,AGREEMENT_TTL)&&cached.content&&(!TU_TERMS_VERSION||cached.agreement?.agreement_version===TU_TERMS_VERSION)){
      applyAgreementMetadata(cached.agreement);currentDevAgreementContent=cached.content;return currentDevAgreement;
    }
    if(agreementLoad)return agreementLoad;
    agreementLoad=(async()=>{
      const published=await devRequest('/api/auth/agreement/current','GET',null,'');
      if(!Number.isSafeInteger(published?.agreement?.agreement_number)||typeof published?.agreement?.agreement_date!=='string'||typeof published.content!=='string'||!published.content.trim())throw Error('Current DEV agreement unavailable');
      applyAgreementMetadata(published.agreement);currentDevAgreementContent=published.content;
      sessionStorage.setItem(AGREEMENT_CACHE,JSON.stringify({checkedAt:Date.now(),agreement:currentDevAgreement,content:currentDevAgreementContent}));
      return currentDevAgreement;
    })().finally(()=>{agreementLoad=null;});
    return agreementLoad;
  }
  const DEV_SESSION_KEY='tu:dev:auth:session:v1';
  const devToken=()=>sessionTokens.get();
  const scriptPlatform=()=>typeof nativeBridge?.callHandler==='function'||/torn[ -]?pda/i.test(navigator.userAgent)||typeof pageWindow.PDA_httpGet==='function'||typeof window.PDA_httpGet==='function'||typeof pageWindow.PDA_httpPost==='function'||typeof window.PDA_httpPost==='function'?'pda':'tampermonkey';
  let devAuthIssue='',devRenewalBlocked=false;
  function devAuthFailure(error){
    const status=error?.status;
    devAuthIssue=status===401||status===403?'Saved API key rejected. Replace it in TU Settings.':status===429?'Authentication rate-limited. Retry later.':status>=500||!status?'Authentication service unavailable. Retry later.':error?.message||'Session renewal failed.';
    devRenewalBlocked=true;
    clearAuthorizationCache();sessionTokens.clear();
    if(!panel.hidden)render('about');
  }
  function resetDevAuthFailure(){devAuthIssue='';devRenewalBlocked=false;}
  async function devRequest(path,method='GET',body,token=devToken()){
    // The current registration service performs up to two Torn API reads.
    if(path==='/api/auth/register'&&body?.api_key)await apiGovernor.reserveVerification(body.api_key);
    const url=DEV_BASE+path;
    const headers={...(method!=='GET'?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})};
    const payload=body?JSON.stringify(body):undefined;
    const parse=raw=>{
      if(raw==null)throw Error('Empty authentication response');
      if(typeof raw==='string'){try{return JSON.parse(raw)}catch{throw Error('Invalid authentication JSON')}}
      if(raw instanceof Map)return Object.fromEntries(raw);
      if(typeof raw==='object'){
        if(raw.responseText!==undefined)return parse(raw.responseText);
        if(raw.response!==undefined&&typeof raw.response!=='function')return parse(raw.response);
        if(raw.body!==undefined&&raw.status!==undefined)return parse(raw.body);
        return raw;
      }
      throw Error('Unexpected authentication response');
    };
    const transport=async()=>{
      const gm=managerHttp;
      if(gm){
        try{return await new Promise((resolve,reject)=>gm({method,url,headers,...(payload?{data:payload}:{}),timeout:20000,
          onload:r=>{try{resolve({status:r.status||0,data:parse(r.responseText??r.response)})}catch{reject(Error('Invalid transport response'))}},
          onerror:()=>reject(Error('Request bridge failure')),ontimeout:()=>reject(Error('Request bridge timeout'))}));}
        catch{throw Error('Request bridge failed for '+method+' '+path+'. Reload Torn in PDA and retry; check the app network/bridge permissions.');}
      }
      // Standard fetch is a last resort on platforms with CORS support.
      let response;try{response=await fetch(url,{method,headers,...(payload?{body:payload}:{}),cache:'no-store'});}catch(error){throw Error('Unable to reach DEV Worker (network/CORS). Check '+DEV_BASE+'/api/auth/agreement/current in a browser. '+(error?.message||''));}
      return {status:response.status,data:await response.json().catch(()=>({}))};
    };
    const response=await transport();
    const result=response.data||{};
    response.ok=response.status>=200&&response.status<300;
    if(response.status===401&&!devRenewalBlocked&&token&&token===devToken()&&localStorage.getItem(TU_TERMS_KEY)===TU_TERMS_VERSION&&path!=='/api/auth/register'&&path!=='/api/auth/agreement'){
      const renewed=await renewDevSession();
      return devRequest(path,method,body,renewed);
    }
    if(!response.ok){if(path==='/api/auth/register'&&body?.api_key&&[401,403].includes(response.status))await apiGovernor.suspendVerification(body.api_key);if([401,403].includes(response.status)&&token&&token===devToken()){clearAuthorizationCache();publishAuthorization(false);}const error=Error(result.error||('Development server HTTP '+response.status));error.status=response.status;throw error;}
    return result;
  }
  // Renew expired sessions using the user's saved Public Only key. Never accept terms automatically.
  let devRenewal=null;
  async function renewDevSession(){
    if(devRenewal)return devRenewal;
    if(devRenewalBlocked)throw Error(devAuthIssue||'Session renewal paused');
    const key=readSavedKey();
    if(!/^[A-Za-z0-9]{16}$/.test(key||''))throw Error('Saved Public Only or Limited Access API key required to renew session');
    devRenewal=(async()=>{
      const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform:scriptPlatform()},'');
      if(!registration.token||!['public','limited'].includes(registration.accessLevel))throw Error('Session renewal returned no verified session');
      const status=await devRequest('/api/auth/agreement','GET',null,registration.token);
      applyAgreementMetadata(status.agreement);
      if(!status.accepted){
        clearAuthorizationCache();sessionTokens.clear();
        localStorage.removeItem(TU_TERMS_KEY);
        throw Error('Current agreement requires acceptance');
      }
      const identity=readCache(IDENTITY_CACHE),savedEntry=readStoredKeys().find(entry=>entry.key===key);
      if(identity?.player?.id&&String(registration.playerId)===String(identity.player.id)&&savedEntry?.playerId===String(identity.player.id))sessionStorage.setItem(IDENTITY_CACHE,JSON.stringify({...identity,sessionMarker:sessionTokens.marker()}));
      sessionTokens.set(registration.token);
      rememberAuthorization(status,registration.token);
      return registration.token;
    })().catch(error=>{devAuthFailure(error);throw error;}).finally(()=>{devRenewal=null});
    return devRenewal;
  }
  let authRestorePromise=null;
  async function restoreDevSession({force=false}={}){
    if(authRestorePromise)return authRestorePromise;
    authRestorePromise=(async()=>{
      try{
        if(!readSavedKey()){clearAuthorizationCache();publishAuthorization(false);return;}
        const cached=!force&&freshAuthorization();
        if(cached){applyAgreementMetadata(cached.agreement);publishAuthorization(true);await restoreSavedIdentity();return;}
        const token=devToken();
        if(token){
          try{
            const status=await devRequest('/api/auth/agreement','GET',null,token);
            applyAgreementMetadata(status.agreement);
            if(status.accepted){rememberAuthorization(status);publishAuthorization(true);resetDevAuthFailure();await restoreSavedIdentity();if(!panel.hidden)render('modules');return;}
            clearAuthorizationCache();localStorage.removeItem(TU_TERMS_KEY);sessionTokens.clear();publishAuthorization(false);return;
          }catch(error){if(error.status!==401)throw error;}
        }
        if(!localStorage.getItem(TU_TERMS_KEY)){publishAuthorization(false);return;}
        await renewDevSession();publishAuthorization(true);resetDevAuthFailure();await restoreSavedIdentity();if(!panel.hidden)render('modules');
      }catch(error){
        clearAuthorizationCache();publishAuthorization(false);console.warn('[TU] Session restore unavailable');if(!panel.hidden)render('about');
      }finally{
        authRestorePending=false;
        if(authOpenRequested){authOpenRequested=false;tuRestore();syncLauncher();}
      }
    })().finally(()=>{authRestorePromise=null;});
    return authRestorePromise;
  }
  async function ensureAuthorization(){
    if(!freshAuthorization())await restoreDevSession({force:true});
    return authorized();
  }
  async function devAccept(key,platform){
    if(apiGovernor.isKeySuspended(key))await requestIdentity(key,{revalidate:true});
    const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform,manual:true},'');
    if(!registration.token)throw Error('Registration returned no session');
    const token=registration.token;
    const accessLevel=registration.accessLevel;
    if(!['public','limited'].includes(accessLevel))throw Error('Torn did not confirm a Public Only or Limited Access key');
    const agreement=await loadDevAgreement();
    const before=await devRequest('/api/auth/agreement','GET',null,token);
    if(before.agreement?.agreement_version!==agreement.agreement_version){applyAgreementMetadata(before.agreement);await loadDevAgreement({force:true});document.getElementById('tu-agreement-overlay')?.remove();showAgreement(key);throw Error('Agreement version changed. Review the updated agreement and confirm again.');}
    await devRequest('/api/auth/agreement','POST',{action:'accepted',request_id:crypto.randomUUID(),...agreement},token);
    const status=await devRequest('/api/auth/agreement','GET',null,token);
    if(!status.accepted||status.agreement?.agreement_version!==agreement.agreement_version)throw Error('Development agreement was not confirmed');
    sessionTokens.set(token);
    rememberAuthorization(status,token);
    rememberVerifiedKey(key,accessLevel==='limited'?'Limited Access':'Public Only',registration.playerId);
    localStorage.setItem(LOGIN_ACCESS_KEY,accessLevel);
    resetDevAuthFailure();
    return status;
  }
  async function devCancel(){
    const token=devToken();
    if(!token)throw Error('No development session available; cannot confirm cancellation');
    await devRequest('/api/auth/agreement','POST',{action:'cancelled',request_id:crypto.randomUUID()},token);
    clearAuthorizationCache();sessionStorage.removeItem(IDENTITY_CACHE);sessionTokens.clear();
    publishAuthorization(false);
  }
  const TU_TERMS_KEY='tu:agreement:accepted';
  const TU_TERMS=[
    ['Terms of Use','Torn Utilities is an independent optional collection of Torn City userscripts, not endorsed by Torn City. Use is at your own risk and subject to Torn rules. Features, predictions and availability are not guaranteed.'],
    ['Information Use','TU may read your player name and ID, publicly accessible Torn information, shop inventory, item prices, gameplay and settings. Optional foreign shop reporting transmits observed item IDs, quantities, prices, country and timestamps to TU-hosted Cloudflare services for stock analysis. Multiplayer tools exchange gameplay/session information with TU services.'],
    ['API Key and Storage','Use a Public Only or Limited Access Torn API key for TU registration; use the least access required. Limited Access keys may permit additional gameplay data access. Full Access keys are not accepted for registration. Your key is sent to Torn for verification; an optionally saved key is stored locally without encryption and excluded from TU backups. Other scripts running on Torn pages may be able to read local browser storage. Do not share API keys in diagnostic reports.'],
    ['Services and Retention','TU uses Torn API, GitHub, and TU-hosted services including Cloudflare. Server-side observations and game records may be retained for functionality and analysis. A complete retention and deletion schedule is not yet published. Network metadata may be handled by service providers.'],
    ['Consent and Choice','Declining restricts Manager functionality to the Info page. You can stop using TU, uninstall TU and clear local data. Acceptance is stored locally and may be requested again after terms updates. Contact the maintainer using the links below with questions.']
  ];
  const hasAgreement=()=>!!devToken()&&!!TU_TERMS_VERSION&&localStorage.getItem(TU_TERMS_KEY)===TU_TERMS_VERSION;
  let currentTab='modules',settingsPage=null,diagnosticModule=null;
  // Internal tool factories load on first activation.
  function stopModule() {
    if (!active) return;
    const id=active;if(id==='item-monitor')sessionStorage.removeItem('tu:monitor:resume:v1'); active=null;observeTUWindows();
    try { registered.get(id)?.deactivate(); } catch(e) { console.error('[TU] tool cleanup failed',id); }
    moduleHost.replaceChildren(); moduleHost.hidden=true;
  }
  async function openModule(id) {
    if(!await ensureAuthorization()){showAgreement();return false;}
    const mod=registered.get(id);
    if (!mod || saved.disabled?.[id]) return false;
    if(active===id){
      // Minimized tools remain active; opening their card must restore their UI.
      // A resume hook preserves watchers, unsaved fields and armed actions.
      if(typeof mod.resume==='function')await mod.resume();
      if(observationReady)scheduleWindowUpdate(true);return true;
    }
    stopModule();
    moduleHost.hidden=false;
    try {
      active=id;observeTUWindows();
      tuNav.history.push('tu-pda-panel');tuNav.current=id;tuNav.minimized=false;tuNav.exited=false;
      await mod.activate(Object.freeze({mount:moduleHost, close:()=>{stopModule();panel.hidden=false;viewModule=null;render('modules');syncLauncher();},minimize:()=>{tuMinimize();syncLauncher();}}));
      if(id==='item-monitor')sessionStorage.setItem('tu:monitor:resume:v1',String(getPlayer()?.id||''));
      if(observationReady)scheduleWindowUpdate(true);return true;
    } catch(e) {
      console.error('[TU] tool activation failed',id);
      try { mod.deactivate(); } catch {}
      active=null;observeTUWindows();moduleHost.replaceChildren(); moduleHost.hidden=true;
      return false;
    }
  }
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} };
  // TU unified window navigation (test release).
  const tuNav={history:[],current:'tu-pda-panel',minimized:true,exited:true};
  const tuRoots=['tu-pda-panel','tuim-menu','tuim-panel','tuim-catalog','tuim-travel-window','tuim-data-window','tca-panel','tca-playbar','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tu-diagnostics-window'];
  const tuRoot=id=>document.getElementById(id);
  const tuHideAll=()=>tuRoots.forEach(id=>{const el=tuRoot(id);if(el){el.hidden=true;if(id==='tpfg-root')el.style.display='none';}});
  const tuShow=id=>{const el=tuRoot(id);if(!el)return false;tuHideAll();el.hidden=false;if(id==='tpfg-root')el.style.display='block';tuNav.current=id;tuNav.minimized=false;tuNav.exited=false;observeTUWindows();if(observationReady)syncLauncher();return true;};
  const tuOpen=id=>{if(!tuRoot(id))return false;if(tuNav.current!==id&&tuRoot(tuNav.current))tuNav.history.push(tuNav.current);return tuShow(id);};
  const tuBack=(source)=>{const parents={'tuim-panel':'tuim-menu','tuim-travel-window':'tuim-menu','tuim-data-window':'tuim-travel-window','tuim-catalog':'tuim-panel'};const parent=parents[source];if(parent&&tuRoot(parent)){if(tuNav.history[tuNav.history.length-1]===parent)tuNav.history.pop();return tuShow(parent);}if(source&&tuRoot(source))tuNav.current=source;while(tuNav.history.length){const id=tuNav.history.pop();if(tuRoot(id))return tuShow(id);}return tuShow('tu-pda-panel');};
  const tuMinimize=(source)=>{if(source&&tuRoot(source))tuNav.current=source;
    // Capture the actual visible window before hiding anything; module IDs are not DOM IDs.
    const visible=tuRoots.filter(id=>{const el=tuRoot(id);return el&&!el.hidden&&getComputedStyle(el).display!=='none';});
    const top=(source&&tuRoot(source)?source:null)||visible.find(id=>id===tuNav.current)||visible.find(id=>id!=='tu-pda-panel')||visible[0];
    if(top)tuNav.current=top;
    tuNav.minimized=true;tuNav.exited=false;tuHideAll();launcher.hidden=false;observeTUWindows();
  };
  const tuExit=(source)=>{tuNav.history.length=0;tuNav.current='tu-pda-panel';tuMinimize();tuNav.exited=true;stopModule();};
  const tuRestore=()=>{
    if(authRestorePending){authOpenRequested=true;tuNav.minimized=true;tuNav.exited=false;panel.hidden=true;launcher.hidden=false;return true;}
    if(tuNav.exited){tuNav.history.length=0;tuNav.current='tu-pda-panel';render(authorized()?'modules':'about');}
    if(!authorized()){tuShow('tu-pda-panel');showAgreement();return true;}
    let id=tuNav.current;
    if(!tuRoot(id)&&active){id=({'item-monitor':'tuim-menu','flight-game':'tpfg-root','stick-fighter':'sff-root'}[active]||id);}
    return tuShow(tuRoot(id)?id:'tu-pda-panel');
  };
  pageWindow.TUWindowNavigation=Object.freeze({open:tuOpen,back:tuBack,minimize:tuMinimize,exit:tuExit,restore:tuRestore});
  const style = document.createElement('style');
  style.textContent = `
:root{--tu-logo-image:url(${TU_LOGO})}
#tu-pda-panel .tu-refresh-icon{display:inline-block}#tu-pda-panel .tu-spinning{animation:tu-refresh-spin .8s linear infinite}@keyframes tu-refresh-spin{to{transform:rotate(360deg)}}
#tu-pda-launcher{position:fixed;left:12px;top:38%;z-index:2147483645;touch-action:none;width:43px;height:43px;border-radius:50%;border:2px solid #e3bb57;background:radial-gradient(circle at 35% 25%,#293b45,#07090b 70%);color:#f5d87e;box-shadow:0 2px 9px #000b,inset 0 0 4px #f5d87e66;font:bold italic 17.25px 'Palatino Linotype','Book Antiqua',Georgia,serif;letter-spacing:-2px;padding:0 1.5px 0 0;display:flex;align-items:center;justify-content:center;line-height:1;cursor:grab;user-select:none;-webkit-user-select:none}
#tu-pda-launcher{border-radius:50%;border:0;background:#08090a var(--tu-logo-image) center/cover no-repeat;color:transparent;box-shadow:0 2px 9px #000b;font-size:0;padding:0}
#tu-pda-launcher:active{cursor:grabbing}
#tu-pda-launcher[hidden]{display:none!important}
#tu-pda-panel{position:fixed;z-index:2147483644;inset:8% 3% auto 3%;max-width:440px;margin:auto;max-height:82vh;overflow:auto;background:#101417;color:#eee;border:1px solid #c49a46;border-radius:18px;box-shadow:0 10px 35px #000d;font:11px system-ui,Arial,sans-serif}
#tu-pda-panel[hidden]{display:none}
#tu-pda-panel *{box-sizing:border-box}
#tu-pda-panel header{display:flex;align-items:center;gap:6px;padding:9px;border-bottom:1px solid #4a3c21;position:sticky;top:0;z-index:100;background:#101417}
#tu-pda-panel .tu-logo{font-size:0;line-height:0;color:transparent;overflow:hidden;vertical-align:middle}
#tu-pda-panel header>.tu-logo{display:block!important;flex:0 0 44px!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;max-width:44px!important;max-height:44px!important;overflow:hidden!important;white-space:nowrap!important;font-size:0!important;line-height:0!important;color:transparent!important;text-indent:-9999px!important}
#tu-pda-panel h2{font-size:16.5px;margin:0;color:#f1ce72}
#tu-pda-panel p{margin:3px 0;color:#aeb4bd}
#tu-pda-panel button{cursor:pointer}
#tu-pda-panel .tu-close{margin-left:auto;background:none;border:0;color:#ddd;font-size:21px}
#tu-pda-panel nav{display:flex;gap:4.5px;padding:7.5px}
#tu-pda-panel nav button{flex:1;background:#252a2e;border:0;color:#ddd;padding:8.25px 3px;border-radius:20px}
#tu-pda-panel nav button[aria-selected=true]{background:#dfb952;color:#141414;font-weight:700}
#tu-pda-panel .tu-content{padding:3px 9px 12px}
#tu-pda-panel .tu-card{padding:9.75px;display:flex;align-items:center;gap:9px;background:#1c2226;border:1px solid #32383b;border-radius:12px;margin:6.75px 0}
#tu-pda-panel .tu-symbol{font-size:18.75px;color:#e1b95a;min-width:30px}
#tu-pda-panel .tu-card strong{display:block;font-size:12px}
#tu-pda-panel .tu-card small{color:#b6bac0}
#tu-pda-panel .tu-status{margin-left:auto;white-space:nowrap;color:#a9abb0;font-size:11px}
#tu-pda-panel footer{border-top:1px solid #59451d;padding:9.75px;color:#aeb4bd;font-size:11px}
/* Shared compact headers. Existing DOM, controls, assets and window geometry stay intact. */
#tu-pda-panel header{display:flex;align-items:center;gap:6px;padding:1px 6px;min-height:37.125px;flex-wrap:nowrap}
#tu-pda-panel header>.tu-logo{order:0;flex:0 0 28px!important;width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;max-width:28px!important;max-height:28px!important}
#tu-pda-panel header>div{order:1;flex:1;min-width:0}
#tu-pda-panel header h2{font-size:16.5px;line-height:1;margin:0}
#tu-pda-panel header p{font-size:11px;line-height:1.05;margin:0!important;overflow-wrap:anywhere}
#tu-pda-panel header .tu-player-identity{font-size:11px!important;white-space:pre-line;line-height:1.15}
#tu-pda-panel header>.tu-nav-control,#tu-pda-panel header>.tu-close{flex:0 0 24px;width:24px;height:24px;min-width:24px;min-height:24px;margin:0;padding:0;border-radius:4px;border:1px solid #806a3e;background:#252a2e;color:#f1ce72;font:18px/1 system-ui}
#tu-pda-panel header>[aria-label=Back]{order:2;margin-left:auto}
#tu-pda-panel header>[aria-label=Minimize]{order:3}
#tu-pda-panel header>.tu-close{order:4}
#tu-pda-panel .tu-card>div{min-width:0}
#tu-pda-panel .tu-card strong{overflow-wrap:anywhere}
#tu-pda-panel .tu-card button{flex-shrink:0;min-height:24px;font-size:11px}
/* Standard form/button minima are reduced from 36/40 px, not game geometry. */
#tu-pda-panel button,#tu-pda-module-host :is(button,input,select,textarea){font-size:inherit;font-family:inherit}
:is(#tuim-panel,#tuim-menu)>button,:is(#tuim-panel,#tuim-menu) :is(section,.tuim-entry)>button{min-height:27px!important}
:is(#tuim-travel-window,#tuim-data-window)>button{min-height:24px!important}
:is(#tuim-panel,#tuim-menu) :is(input:not([type=checkbox]):not([type=radio]),select){min-height:30px}
/* Existing module header types, including modules mounted without a named root. */
:is(#tuim-panel,#tuim-menu,#tuim-catalog) .tuim-header,
:is(#tuim-travel-window,#tuim-data-window) .tuim-travel-header,
#tu-who-panel header.who-header,#tca-header,
#tu-pda-module-host>:is(section,div)>div:has(>strong):has(>button[title^="Minimize"]),
#tpfg-title,#tpfg-stick-fighter>div>div:has(>#sff-min){display:flex;align-items:center;gap:6px;min-height:28.5px!important;height:auto!important;padding:2px 0!important;margin-bottom:9px;flex-wrap:nowrap;box-sizing:border-box}
:is(#tuim-panel,#tuim-menu,#tuim-catalog) .tuim-header{margin-top:0;top:0}
:is(#tuim-travel-window,#tuim-data-window) .tuim-travel-header{top:0}
:is(.tuim-header,.tuim-travel-header) :is(strong,h3),#tu-who-panel .who-heading{flex:1;min-width:0;font-size:13.5px!important;line-height:1.15!important;overflow-wrap:anywhere;margin:0!important}
:is(.tuim-header,.tuim-travel-header) [data-tu-nav-controls]{flex:none;display:flex;align-items:center;gap:4.5px!important;margin-left:auto!important}
:is(#tuim-panel,#tuim-menu,#tuim-catalog,#tuim-travel-window,#tuim-data-window) :is(.tuim-header,.tuim-travel-header) .tu-brand-emblem[data-tu-brand-emblem],#tu-who-panel header.who-header .who-logo{order:-1;flex:0 0 24px!important;width:24px!important;height:24px!important;min-width:24px!important;min-height:24px!important;max-width:24px!important;max-height:24px!important;object-fit:contain}
:is(.tuim-header,.tuim-travel-header) [data-tu-nav-controls] button,#tu-who-panel header.who-header .who-icon,
#tca-header button,#tu-pda-module-host>:is(section,div)>div:has(>strong)>button[title^="Minimize"],#tpfg-title button,#sff-min{flex:0 0 24px!important;width:24px!important;min-width:24px!important;max-width:none!important;height:24px!important;min-height:24px!important;padding:0!important;margin:0!important;font-size:16px!important;line-height:1!important}
#tu-who-panel header.who-header{padding-inline:6.75px!important}
#tca-header{padding-inline:6px!important}
/* Already-short legacy headers stop at a 24 px control/readability floor. */
#tu-pda-module-host>:is(section,div)>div:has(>strong):has(>button[title^="Minimize"]),#tca-header,#tpfg-title,#tpfg-stick-fighter>div>div:has(>#sff-min){min-height:24px!important;padding-block:0!important;margin-bottom:7.5px}
/* Keyboard focus is kept visible at the smaller visual sizes. */
:is(#tu-pda-panel,#tuim-menu,#tuim-panel,#tuim-travel-window,#tuim-data-window,#tu-who-panel,#tu-pda-module-host) :is(button,a,input,select):focus-visible{outline:2px solid #f1ce72;outline-offset:2px}
/* Physical touch controls and readable inputs take priority over exact reduction.
   Board/canvas geometry is deliberately excluded. */
@media (pointer:coarse){
 #tu-pda-panel header{min-height:47px;gap:4px}
 #tu-pda-panel header>.tu-nav-control,#tu-pda-panel header>.tu-close{flex-basis:44px;width:44px;height:44px;min-width:44px;min-height:44px}
 #tu-pda-panel :is(nav button,.tu-card button,.tu-content>button){min-height:44px}
 :is(#tuim-panel,#tuim-menu,#tuim-travel-window,#tuim-data-window){font-size:12px}
 :is(.tuim-header,.tuim-travel-header),#tu-who-panel header.who-header,#tca-header,#tpfg-title,#tpfg-stick-fighter>div>div:has(>#sff-min){min-height:48px!important}
 :is(.tuim-header,.tuim-travel-header) [data-tu-nav-controls] button,#tu-who-panel header.who-header .who-icon,#tca-header button,#tpfg-title button,#sff-min,
 #tu-pda-module-host>:is(section,div)>div:has(>strong)>button[title^="Minimize"]{flex-basis:44px!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important}
 :is(#tuim-panel,#tuim-menu)>button,:is(#tuim-panel,#tuim-menu) :is(section,.tuim-entry)>button{min-height:44px!important}
 :is(#tu-pda-panel,#tuim-panel,#tuim-menu,#tuim-travel-window,#tuim-data-window,#tu-who-panel,#tca-panel,#tu-pda-module-host) :is(input:not([type=checkbox]):not([type=radio]),select){min-height:44px!important;font-size:16px}
 :is(#tuim-panel,#tuim-menu) label:has(>input[type=checkbox]){min-height:44px}
}
@media(max-width:380px){
 #tu-pda-panel header{column-gap:3px}
 #tu-pda-panel header>.tu-logo{flex-basis:24px!important;width:24px!important;height:24px!important;min-width:24px!important;min-height:24px!important}
 #tu-pda-panel .tu-card{flex-wrap:wrap}
 #tu-pda-panel .tu-card>.tu-symbol{flex-shrink:0}
 #tu-pda-panel .tu-card>.tu-status{margin-left:auto}
}

#tpfg-stick-fighter>div>div:has(>#sff-min){font-size:12px}

/* Pad content below sticky headers. */
:is(#tuim-panel,#tuim-menu,#tuim-catalog,#tuim-travel-window,#tuim-data-window,#tu-who-panel,#tca-panel){padding-top:0!important}
:is(#tuim-panel,#tuim-menu,#tuim-catalog) .tuim-header,
:is(#tuim-travel-window,#tuim-data-window) .tuim-travel-header{
 position:sticky!important;top:0!important;margin-top:0!important;
 margin-inline:-9px!important;padding-inline:9px!important;background:#11191d!important;
 z-index:100!important;isolation:isolate
}
#tuim-arm-feedback[hidden],#tuim-arm-feedback:empty{display:none!important}
#tuim-alarm-settings :is(h3,h4){margin:6px 0 3px}
#tuim-alarm-settings label{margin:3px 0}
#tuim-alarm-settings :is(input:not([type=checkbox]),select){margin:2px 0 5px;padding:4px 6px;min-height:27px}
#tuim-panel .tuim-alarm-channels{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
#tuim-panel .tuim-alarm-channels label{display:flex!important;align-items:center;gap:5px;margin:3px 0!important}
#tuim-panel .tuim-alarm-channels input[type=checkbox]{display:inline-block!important;flex:none;width:18px!important;height:18px!important;min-height:18px!important;margin:0!important;padding:0}

/* Legacy multiplayer windows mount without IDs; identify their real title bars. */
#tu-pda-module-host>:is(section,div):has(>div>strong):has(>div>button[title^="Minimize"]){padding-top:0!important}
#tu-pda-module-host>:is(section,div)>div:has(>strong):has(>button[title^="Minimize"]){
 position:sticky!important;top:0!important;z-index:100!important;
 margin-top:0!important;margin-inline:-11.25px!important;padding-inline:11.25px!important;
 background:#20252e!important;isolation:isolate
}
/* Put desktop branding on one row; identity retains separate player/faction lines.
   Small screens retain wrapping and the larger touch/readability exception. */
@media(min-width:600px){
 #tu-pda-panel header>div{display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:6px;align-items:center}
 #tu-pda-panel header h2{grid-column:1;grid-row:1}
 #tu-pda-panel header p:not(.tu-player-identity){grid-column:2;grid-row:1;font-size:11px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #tu-pda-panel header .tu-player-identity{grid-column:1/-1;line-height:1.05}
}

`;
  document.head.appendChild(style);
  const launcher = document.createElement('button');
  launcher.id = 'tu-pda-launcher';
  launcher.type = 'button';
  for(const old of document.querySelectorAll('#tu-pda-launcher'))old.remove();
  launcher.textContent = 'TU';
  launcher.dataset.tuBrand='canonical';
  launcher.setAttribute('aria-label', 'Open Torn Utilities; drag to reposition');
  document.body.appendChild(launcher);
  const brandStyle=document.createElement('style');brandStyle.textContent='.tu-brand-emblem{display:inline-grid;place-items:center;width:32px;height:32px;flex:none;border:2px solid #e3bb57;border-radius:50%;border:0;background:#08090a var(--tu-logo-image) center/cover no-repeat;color:transparent;font-size:0;box-shadow:0 2px 9px #000b}';document.head.appendChild(brandStyle);
  const panel = document.createElement('section');
  panel.id = 'tu-pda-panel';
  panel.hidden = true;
  panel.innerHTML = '<header><span class="tu-logo" role="img" aria-label="Torn Utilities"></span><div><h2>Torn Utilities</h2><p>Integrated Tools for Torn City</p></div><button class="tu-close" aria-label="Close">×</button></header><nav><button data-tab="modules" aria-selected="true">Tools</button><button data-tab="settings">Settings</button><button data-tab="about">About</button></nav><div class="tu-content"></div><footer style="display:flex;justify-content:space-between;align-items:center;gap:7.5px;flex-wrap:wrap"><span>Torn Utilities v0.5.42.103-dev</span></footer>';
  document.body.appendChild(panel);
  const headerBrand=panel.querySelector('.tu-logo');if(headerBrand){headerBrand.textContent='';headerBrand.classList.add('tu-brand-emblem');headerBrand.setAttribute('role','img');headerBrand.setAttribute('aria-label','Torn Utilities');}
  const identityLine=document.createElement('p');
  identityLine.className='tu-player-identity';
  identityLine.style.cssText='margin:2.25px 0 0;font-size:11px;color:#e4c779;overflow-wrap:anywhere';
  panel.querySelector('header h2').parentElement.appendChild(identityLine);
  const refreshIdentity=()=>{
    const player=getPlayer();
    identityLine.textContent=player?.id?(player.name||'Verified player')+' ['+player.id+']'+(player.factionId?'\n'+(player.factionName||'Faction')+' ['+player.factionId+']':''):(identityStatus.startsWith('Verifying')?'Verifying saved player…':'Player not identified');
  };
  refreshIdentity();
  pageWindow.addEventListener('tu-player-updated',refreshIdentity);
  const content = panel.querySelector('.tu-content');
  function makeButton(label,handler,disabled=false) {
    const btn=document.createElement('button');btn.type='button';btn.textContent=label;
    btn.disabled=disabled;
    btn.style.cssText='margin-left:auto;padding:6px 7.5px;border-radius:8px;border:0;background:#dfb952;color:#111;white-space:nowrap;font-weight:600;'+(disabled?'opacity:.5;':'');
    if(handler)btn.addEventListener('click',handler);
    return btn;
  }
  let viewCategory=null,viewModule=null;
  const goModules=()=>{viewCategory=null;viewModule=null;render('modules');};
  const addLink=(label,url)=>{
    const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';
    a.style.cssText='color:#f1ce72;text-decoration:underline;display:inline-block;margin:6px 7.5px 6px 0';content.append(a);
  };
  const addSocialIcon=(name,url,svgPath,viewBox='0 0 24 24')=>{
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
    a.title=name;a.setAttribute('aria-label',name);
    a.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:50px;height:48px;margin:9px 10.5px 3px 0;background:#252a2e;border:1px solid #806a3e;border-radius:12px;color:#f1ce72';
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',viewBox);svg.setAttribute('width','30');svg.setAttribute('height','30');svg.setAttribute('fill','currentColor');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',svgPath);svg.append(path);a.append(svg);content.append(a);
  };
  const addSectionHeader=(back,label)=>{
    const bar=document.createElement('div');bar.style.cssText='display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:7.5px 0 10.5px';
    const btn=makeButton('← '+back.label,back.action);btn.style.marginLeft='0';btn.style.flex='0 0 auto';bar.append(btn);
    const h=document.createElement('h3');h.textContent=label;h.style.cssText='margin:0;font-size:13.5px;min-width:0;overflow-wrap:anywhere';bar.append(h);content.append(bar);
  };
  function appendTerms(target,{onReady=()=>{}}={}){
    const version=document.createElement('small');
    version.style.cssText='display:block;margin:0 0 15px;color:#c5d0d8;font:500 11px/1.5 system-ui';
    version.textContent='Loading current agreement…';target.append(version);
    const body=document.createElement('div');target.append(body);
    const renderPublished=()=>{
      body.replaceChildren();
      version.textContent='Agreement version '+TU_TERMS_VERSION+' · Number '+currentDevAgreement.agreement_number+' · '+currentDevAgreement.agreement_date;
      body.append(renderAgreementMarkdown({document,markdown:currentDevAgreementContent}));
      onReady({...currentDevAgreement,content:currentDevAgreementContent});
    };
    loadDevAgreement().then(renderPublished).catch(error=>{version.textContent='Agreement unavailable';body.textContent='Unable to load current terms: '+error.message+'. Retry by reopening the agreement.';});
  }
  function showAgreement(selectedKey=null){
    panel.hidden=false;render('about');
    const existing=document.getElementById('tu-agreement-overlay');if(existing){if(typeof selectedKey==='string'){const field=existing.querySelector('input[type=password],input[type=text]');if(field)field.value=selectedKey;}existing.hidden=false;existing.style.display='flex';tuNav.minimized=false;tuNav.exited=false;launcher.hidden=true;return;}
    const overlay=document.createElement('div');overlay.id='tu-agreement-overlay';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000d;display:flex;align-items:center;justify-content:center;padding:9px;box-sizing:border-box;overflow:hidden';
    const dialog=document.createElement('section');dialog.style.cssText='background:#182026;color:#eee;border:2px solid #cba953;border-radius:12px;width:min(96vw,580px);max-height:calc(100dvh - 110px);height:min(780px,calc(100dvh - 110px));display:flex;flex-direction:column;overflow:hidden;padding:0;font:11px/1.5 system-ui;box-sizing:border-box;min-height:0';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    let displayedAgreement=null;
    const h=document.createElement('h2');h.textContent='TU Terms and Information Use Agreement';h.style.cssText='display:block;position:static;margin:0 0 13.5px;padding:0;color:#f3f6f8;font:700 15.75px/1.35 system-ui';dialog.append(h);appendTerms(dialog,{onReady:agreement=>{displayedAgreement=agreement;check.checked=false;check.disabled=false;accept.disabled=false;}});
    const keyInfo=document.createElement('p');keyInfo.textContent='Torn Public Only or Limited Access API key: enter your key below to verify identity and accept the current published agreement. Never enter a Full Access key.';dialog.append(keyInfo);
    const storageNotice=document.createElement('p');storageNotice.dataset.tuKeyStorage='true';storageNotice.textContent=credentials.mode==='userscript-private'?'Saved credentials use unencrypted userscript-manager storage. A typed or revealed key is present in the page input.':credentials.mode==='private-unavailable'?'Private credential storage is unavailable; no insecure fallback will be used.':'Saved credentials use unencrypted Torn-origin storage; other page scripts may read them.';dialog.append(storageNotice);
    const key=document.createElement('input');key.type='password';key.autocomplete='off';key.maxLength=16;if(typeof selectedKey==='string'&&credentials.mode!=='userscript-private')key.value=selectedKey;key.placeholder=readSavedKey()?'API key already saved':'16-character Public Only or Limited Access key';key.style.cssText='flex:1;min-width:0;box-sizing:border-box;padding:7.5px';const keyRow=document.createElement('div');keyRow.style.cssText='display:flex;align-items:center;gap:6px;width:100%';const revealKey=makeButton('Show',()=>{const visible=key.type==='text';key.type=visible?'password':'text';revealKey.textContent=visible?'Show':'Hide';revealKey.setAttribute('aria-pressed',String(!visible));});revealKey.type='button';revealKey.setAttribute('aria-label','Show or hide agreement API key');revealKey.setAttribute('aria-pressed','false');keyRow.append(key,revealKey);dialog.append(keyRow);
    const checkLabel=document.createElement('label');checkLabel.style.cssText='display:flex;gap:7.5px;margin:11.25px 0';const check=document.createElement('input');check.type='checkbox';check.disabled=true;checkLabel.append(check,document.createTextNode('I have reviewed and agree to the Terms of Use and Information Use Agreement.'));dialog.append(checkLabel);
    const status=document.createElement('p');status.setAttribute('role','status');dialog.append(status);
    const buttons=document.createElement('div');buttons.style.cssText='display:flex;justify-content:flex-end;gap:7.5px;flex-wrap:wrap';
    const decline=makeButton('Decline / Info only',()=>{overlay.remove();render('about')});
    const accept=makeButton('I Agree — Continue',async()=>{
      if(!check.checked)return;
      if(!displayedAgreement||!currentDevAgreement||displayedAgreement.content!==currentDevAgreementContent||['agreement_version','agreement_number','agreement_date'].some(field=>displayedAgreement[field]!==currentDevAgreement[field])){check.checked=false;status.textContent='Load and review the current agreement before accepting. Reopen it if the version has changed.';return;}
      const supplied=key.value.trim();if(supplied&&!/^[a-zA-Z0-9]{16}$/.test(supplied)){status.textContent='Enter a valid 16-character Public Only or Limited Access key';return;}
      const selected=supplied||normalizeKey(selectedKey)||readSavedKey();if(!/^[A-Za-z0-9]{16}$/.test(selected)){status.textContent='A 16-character Public Only or Limited Access key is required';return;}accept.disabled=true;try{status.textContent='Registering and recording development agreement…';const accepted=await devAccept(selected,scriptPlatform());if(supplied)saveKey(supplied);rememberAuthorization(accepted);await updatePlayer(selected);}catch(error){status.textContent='Development agreement failed: '+(error.message==='Torn verification failed'?'Torn could not verify this key. Registration requires a valid Public Only or Limited Access key; Full Access and invalid keys are not supported.':error.message);accept.disabled=false;return;}
      localStorage.setItem(TU_TERMS_KEY,TU_TERMS_VERSION);publishAuthorization(true);overlay.remove();render('modules');
    });
    accept.disabled=true;
    buttons.append(decline,accept);dialog.append(buttons);overlay.append(dialog);document.body.append(overlay);observeTUWindows();
    // Minimize the consent dialog without accepting; the user may visit Torn to retrieve an API key.
    const minimizeAgreement=()=>{overlay.hidden=true;overlay.style.display='none';tuNav.minimized=true;tuNav.exited=false;panel.hidden=true;launcher.hidden=false;observeTUWindows();};
    const agreementBar=document.createElement('div');agreementBar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:9px;position:sticky;top:0;background:#172026;z-index:2;padding:4.5px 0';
    const agreementTitle=document.createElement('strong');agreementTitle.textContent='TU Agreement';
    const minimizeButton=makeButton('− Minimize',minimizeAgreement);minimizeButton.setAttribute('aria-label','Minimize agreement to retrieve Torn API key');
    agreementBar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:9px;flex:none;background:#172026;z-index:2;padding:9px 12px;border-bottom:1px solid #806a3e';
    agreementBar.append(agreementTitle,minimizeButton);
    const scrollBody=document.createElement('div');scrollBody.style.cssText='flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px;box-sizing:border-box';
    while(dialog.firstChild)scrollBody.appendChild(dialog.firstChild);
    dialog.append(agreementBar,scrollBody);

  }
  // Script update check is informational: PDA manages installed script replacement.
  const tuScriptPath='torn-utilities/releases/dev/torn-utilities-dev.user.js';
  const tuScriptUrl='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js';
  let tuUpdateStatus='Not checked';
  const tuCheckUpdates=async()=>{
    tuUpdateStatus='Checking GitHub…';render('settings');
    try{
      const response=await fetch(tuScriptUrl+'?tu_check='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const source=await response.text();
      const latest=source.match(/^\/\/\s*@version\s+([^\s]+)/m)?.[1];
      if(!latest)throw Error('No userscript version found');
      tuUpdateStatus=versionCompare(TU_VERSION,latest)<0?'Update available: '+latest:'Manager current: '+TU_VERSION+' (GitHub '+latest+')';
    }catch(e){tuUpdateStatus='Could not check GitHub: '+(e.message||e);}
    render('settings');
  };
  const tuShowUpdateTools=()=>{
    const box=document.createElement('div');box.className='tu-card';box.style.cssText+=';display:block';
    const h=document.createElement('strong');h.textContent='Script updates';box.append(h);
    const p=document.createElement('p');p.textContent='Installed TU: '+TU_VERSION+' · '+tuUpdateStatus;box.append(p);
    const note=document.createElement('p');note.textContent='All tools are packaged with TU. Update this one userscript in Tampermonkey or PDA to update the entire application.';box.append(note);
    const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
    const check=makeButton('Check TU update',tuCheckUpdates);check.style.marginLeft='0';buttons.append(check);
    const link=document.createElement('a');link.href=tuScriptUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View latest TU script';link.style.cssText='color:#f1ce72;padding:6px';buttons.append(link);
    box.append(buttons);content.append(box);
  };
  function render(tab) {
    observeTUWindows();
    if(!authorized()&&tab!=='about'&&!(tab==='settings'&&settingsPage==='api'))tab='about';
    if(tab!=='settings')settingsPage=null;
    currentTab=tab;
    panel.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
    content.replaceChildren();
    if(credentials.mode==='private-unavailable'){const warning=document.createElement('p');warning.setAttribute('role','alert');warning.textContent=credentials.status().error;warning.style.cssText='padding:9px;border:2px solid #ec8585;color:#ec8585';content.append(warning);}
    if(!authorized()){content.append(makeButton('Manage or delete TU account data',()=>{settingsPage='api';render('settings');}));}
    if(tab==='modules'){
      if(viewModule){
        const m=registry.modules.find(x=>x.id===viewModule);
        if(!m){viewModule=null;return render('modules');}
        addSectionHeader({label:'Back',action:()=>{viewModule=null;render('modules');}},m.name);
        const p=document.createElement('p');p.textContent=m.description;content.append(p);
        const reg=registered.get(m.id),loaded=!!reg,disabled=!!saved.disabled?.[m.id];
        const installed=reg?.version||'Unknown';
        const status=document.createElement('p');
        status.textContent=(disabled?'Disabled':'Ready')+' · Version '+m.version;
        content.append(status);
        if(loaded){
          content.append(makeButton(disabled?'Enable tool':'Disable tool',()=>{
            saved.disabled ||= {};saved.disabled[m.id]=!disabled;
            if(!disabled&&active===m.id)stopModule();
            persist();render('modules');
          }));
        }
        content.append(makeButton('Tool diagnostics',()=>{diagnosticModule=m.id;settingsPage='diagnostics';render('settings')}));
        // Tool is bundled: no separate installation required.
      }else if(viewCategory){
        const category=registry.categories.find(x=>x.id===viewCategory);
        if(!category){viewCategory=null;return render('modules');}
        addSectionHeader({label:category.parent?'Games':'Categories',action:()=>{viewCategory=category.parent||null;render('modules');}},category.name);
        const subcategories=registry.categories.filter(c=>c.parent===viewCategory).sort((a,b)=>a.order-b.order);
        for(const group of subcategories){
          const card=document.createElement('div');card.className='tu-card';
          const symbol=document.createElement('span');symbol.className='tu-symbol';symbol.textContent=group.icon;
          const body=document.createElement('div');body.style.flex='1';
          const name=document.createElement('strong');name.textContent=group.name;
          const mods=registry.modules.filter(m=>m.category===group.id);
          const count=document.createElement('small');count.textContent=mods.length+' tools';
          body.append(name,count);const go=()=>{viewCategory=group.id;render('modules');};
          card.append(symbol,body,makeButton('Open →',go));content.append(card);
        }
        const modules=registry.modules.filter(m=>m.category===viewCategory);
        if(!modules.length&&!subcategories.length){const p=document.createElement('p');p.textContent='No tools in this category';content.append(p);}
        for(const m of modules){
          const card=document.createElement('div');card.className='tu-card';
          const body=document.createElement('div');body.style.flex='1;min-width:0';
          const name=document.createElement('strong');name.textContent=m.name;
          const loaded=registered.get(m.id);
          const state=document.createElement('small');
          state.textContent=(saved.disabled?.[m.id]?'Disabled':'Ready')+' · v'+m.version;
          body.append(name,state);
          const ready=!!loaded&&!saved.disabled?.[m.id];
          const go=async()=>{if(ready){if(await openModule(m.id)){panel.hidden=true;syncLauncher();}}else{viewModule=m.id;render('modules');}};
          card.style.cursor='pointer';card.setAttribute('role','button');card.tabIndex=0;
          card.addEventListener('click',e=>{if(e.target.closest('button'))return;go();});
          card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
          card.append(body,makeButton(ready?'Open →':'Details →',go));content.append(card);
        }
      }else{

        const categories=registry.categories.filter(c=>!c.parent).sort((a,b)=>a.order-b.order);
        for(const group of categories){
          const card=document.createElement('div');card.className='tu-card';
          const icon=document.createElement('span');icon.className='tu-symbol';icon.textContent=group.icon;
          const body=document.createElement('div');body.style.flex='1';
          const title=document.createElement('strong');title.textContent=group.name;
          const count=document.createElement('small');const children=registry.categories.filter(c=>c.parent===group.id).map(c=>c.id);const mods=registry.modules.filter(m=>m.category===group.id||children.includes(m.category));
          count.textContent=mods.length+' tools';
          body.append(title,count);card.append(icon,body,makeButton('Open →',()=>{viewCategory=group.id;render('modules');}));content.append(card);
        }
        // Integrated tool directory is packaged with the userscript; no catalog refresh.
      }
    }else if(tab==='settings'){
      if(!settingsPage)tuShowUpdateTools();
      if(!settingsPage){diagnosticModule=null;
        const h=document.createElement('h3');h.textContent='Settings';content.append(h);
        for(const [id,name,desc] of [['time','Time Display','Local or TCT'],['api','API Keys','Verify, identify, view or remove saved keys'],['storage','Storage & Backups','Export, restore or clear tool data'],['diagnostics','Diagnostics','Manager and tool reports']]){
          const card=document.createElement('div');card.className='tu-card';const body=document.createElement('div');body.style.flex='1';const label=document.createElement('strong');label.textContent=name;const detail=document.createElement('small');detail.textContent=desc;body.append(label,detail);card.append(body,makeButton('Open →',()=>{settingsPage=id;render('settings')}));content.append(card);
        }return;
      }
      const back=makeButton('← Settings',()=>{settingsPage=null;diagnosticModule=null;render('settings')});back.style.margin='0 0 9px';content.append(back);
      const heading=document.createElement('h3');heading.textContent=({time:'Time Display',api:'API Keys',storage:'Storage & Backups',diagnostics:'Diagnostics'})[settingsPage];content.append(heading);
      if(settingsPage==='time'){
      const timeHeading=document.createElement('strong');timeHeading.textContent='Time Display';content.append(timeHeading);
      const timeDescription=document.createElement('p');timeDescription.textContent='Choose one timezone for TU travel estimates and observation timestamps.';content.append(timeDescription);
      const timeSelect=document.createElement('select');timeSelect.setAttribute('aria-label','TU time display');timeSelect.style.cssText='width:100%;padding:6.75px;margin:6px 0 13.5px';
      for(const [value,label] of [['local','Local Time (device)'],['tct','Torn City Time (TCT / UTC)']]){const option=document.createElement('option');option.value=value;option.textContent=label;timeSelect.append(option)}
      timeSelect.value=localStorage.getItem('tu-time-display')==='tct'?'tct':'local';
      timeSelect.addEventListener('change',()=>{localStorage.setItem('tu-time-display',timeSelect.value);pageWindow.dispatchEvent(new CustomEvent('tu-time-display-changed',{detail:{mode:timeSelect.value}}))});content.append(timeSelect);
      return;
      }
      if(settingsPage==='api'){
        const deletionStatus=document.createElement('p');deletionStatus.setAttribute('role','status');
        const deletion=createDataDeletion({
         readJob:()=>{const raw=readCredential('tu:dev:deletion-job:v1');return raw?JSON.parse(raw):null;},
         saveJob:job=>credentials.set('tu:dev:deletion-job:v1',JSON.stringify(job)),removeJob:()=>credentials.remove('tu:dev:deletion-job:v1'),
         random:()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),
         request:body=>devRequest('/api/auth/delete-data','POST',body,''),
         verify:async key=>{const info=checkedKeyInfo(await requestIdentity(key,{revalidate:true}));rememberVerifiedKey(key,info.level,info.playerId,{deletion:true});return info;},entries:readStoredKeys,
         stop:()=>{identityDeletionInProgress=true;credentials.set(VAULT_CLEARED,'1');stopModule();publishAuthorization(false);authGeneration++;clearAuthorizationCache();localStorage.removeItem(TU_TERMS_KEY);},
         cleanup:async (id,hashes,roomHashes)=>{await sessionTokens.eraseHashes(hashes);
          const keys=readStoredKeys().filter(entry=>entry.playerId===id).map(entry=>entry.key);await apiGovernor.forgetKeys(keys);credentials.eraseKeys(keys);
          clearPlayer();clearAuthorizationCache();sessionStorage.removeItem(IDENTITY_CACHE);localStorage.removeItem(TU_TERMS_KEY);localStorage.removeItem(LOGIN_ACCESS_KEY);
          savedKeys.replaceChildren();input.value='';
          for(const key of ['tu-ttt-dev-session-v1','tu:chaos-marbles:dev:session','tu:dev:torn-four:session','tu:dev:torn-fleet:session']){const raw=localStorage.getItem(key);if(!raw)continue;const record=JSON.parse(raw);if(record?.token){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(record.token)))).map(n=>n.toString(16).padStart(2,'0')).join('');if(roomHashes.includes(hash))localStorage.removeItem(key);}}
          for(const key of ['tu:snatch-run:v1','tu:landing-notification:v1'])sessionStorage.removeItem(key);
          credentials.set(VAULT_CLEARED,'1');localStorage.setItem(VAULT_CLEARED,'1');
          if(readStoredKeys().some(entry=>entry.playerId===id))throw Error('Local key cleanup incomplete');
         }
        });
        const deleteData=makeButton(deletion.pending()?'Resume TU data deletion':'Delete My TU Data',async()=>{
         let key=deletion.pending()?readSavedKey():'';
         if(!deletion.pending()){
          key=readSavedKey()||normalizeKey(prompt('Enter a Public Only or Limited Access API key for the account to delete.'));
          if(!key){deletionStatus.textContent='An API key is required to verify account ownership.';return;}
          let owner;try{owner=checkedKeyInfo(await requestIdentity(key,{revalidate:true}));}catch{deletionStatus.textContent='Ownership verification failed.';return;}
          if(!confirm('Delete My TU Data for player '+owner.playerId+'? This removes TU registration, supplied keys and associated identifying data. Independent shared records are preserved. TU sessions end. Other devices and exported files need separate local cleanup.'))return;
         }
         deleteData.disabled=true;
         try{const complete=await deletion.run(key,message=>{deletionStatus.textContent=message;});key='';if(complete){alert(deletionStatus.textContent);location.reload();}deleteData.textContent=deletion.pending()?'Resume TU data deletion':'Delete My TU Data';}
         catch{deletionStatus.textContent=deletion.pending()?'Deletion is incomplete. Keep this installation and use Resume TU data deletion to retry.':'Deletion has not started. Verify or remove legacy saved keys with unknown ownership, then retry.';}
         finally{deleteData.disabled=false;}
        });content.append(deleteData,deletionStatus);
        const note=document.createElement('p');note.textContent='Save Public Only or Limited Access keys individually. Adding a key preserves the current TU login. Use a saved key explicitly to switch login or select the Limited key for War Organizer. '+(credentials.mode==='userscript-private'?'Saved keys use userscript-manager storage and are removed from Torn-origin credential storage. This is storage isolation, not encryption. Revealing a full key places it in the page input where page scripts may read it.':credentials.mode==='private-unavailable'?credentials.status().error:'This environment uses unencrypted Torn-origin storage. Other scripts on Torn may be able to read saved keys.');content.append(note);
        const disclosure=createApiDisclosure({document,storageMode:credentials.mode,content:TU_API_DISCLOSURE_TEXT});content.append(disclosure);
        const form=document.createElement('form');form.autocomplete='off';
        const input=document.createElement('input');input.type='password';input.maxLength=16;input.autocomplete='off';input.placeholder='16-character Torn API key';input.style.cssText='width:100%;box-sizing:border-box;padding:6.75px';
        const status=document.createElement('p');status.setAttribute('role','status');status.textContent=identityStatus;
        const submit=makeButton('Confirm & Save');submit.type='submit';
        form.append(input,makeButton('Show / Hide',()=>{input.type=input.type==='password'?'text':'password'}),submit);content.append(form,status);
        const savedKeys=document.createElement('div');savedKeys.style.cssText='margin:7.5px 0';let viewing=true,keyOperation=false;
        const guarded=action=>async()=>{if(keyOperation)return;keyOperation=true;try{await action()}finally{keyOperation=false;}};
        const reportError=()=>{status.textContent='Operation failed. Check the key, network connection and DEV session, then retry.'};
        async function verifyEntry(key){const data=await requestIdentity(key,{revalidate:true}),info=checkedKeyInfo(data);rememberVerifiedKey(key,info.level,info.playerId);if(key===readSavedKey())localStorage.setItem(LOGIN_ACCESS_KEY,info.level==='Limited Access'?'limited':'public');return {data,...info};}
        async function useForLogin(key){
          try{
            const checked=await verifyEntry(key);
            const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform:scriptPlatform(),manual:true},'');
            const expected=checked.level==='Limited Access'?'limited':'public';
            if(!registration.token||registration.accessLevel!==expected||(registration.playerId!=null&&String(registration.playerId)!==checked.playerId))throw Error('DEV registration verification mismatch');
            const current=await devRequest('/api/auth/agreement','GET',null,registration.token);
            applyAgreementMetadata(current.agreement);if(!current.accepted){showAgreement(key);return;}
            stopModule();clearPlayer();saveKey(key);localStorage.setItem(LOGIN_ACCESS_KEY,expected);sessionTokens.set(registration.token);localStorage.setItem(TU_TERMS_KEY,current.agreement.agreement_version);rememberAuthorization(current,registration.token);
            if(!await updatePlayer(key,checked.data))throw Error('Identity update failed');
            resetDevAuthFailure();publishAuthorization(true);status.textContent='Saved key selected for TU login';renderSaved();
          }catch{reportError();}
        }
        function renderSaved(){
          savedKeys.replaceChildren();const keys=readStoredKeys();
          const summary=document.createElement('p');summary.textContent=keys.length+' saved API key(s)';savedKeys.append(summary);if(!viewing)return;
          for(const [index,entry] of keys.entries()){
            const row=document.createElement('div');row.dataset.tuKeyEntry=String(index);row.style.cssText='padding:6.75px 0;border-top:1px solid #555';
            const roles=[entry.key===readSavedKey()?'TU login':null,entry.key===normalizeKey(readCredential(WHO_KEY))?'War Organizer':null].filter(Boolean);
            const label=document.createElement('strong');label.textContent=(entry.level||'Access level unverified')+(roles.length?' ('+roles.join(', ')+')':'');row.append(label);
            const owner=document.createElement('small');owner.textContent=entry.playerId?' · Player '+entry.playerId:' · Recheck legacy key to verify its access level';row.append(owner);
            const field=document.createElement('input');field.type='password';field.readOnly=true;field.value=credentials.mode==='userscript-private'?'':entry.key;field.placeholder='Key ending in '+entry.key.slice(-4);field.style.cssText='display:block;width:100%;box-sizing:border-box;padding:6px;margin:4.5px 0';row.append(field);
            row.append(makeButton('Show / Hide',event=>{if(credentials.mode==='userscript-private'){if(!event?.isTrusted)return;const reveal=field.type==='password';field.value=reveal?entry.key:'';field.type=reveal?'text':'password';}else field.type=field.type==='password'?'text':'password';}));
            row.append(makeButton('Recheck access level',guarded(async()=>{try{await verifyEntry(entry.key);status.textContent='Saved key access level verified by Torn';renderSaved();}catch{status.textContent='Key could not be verified. It remains saved until you remove it.'}})));
            if(entry.key!==readSavedKey())row.append(makeButton('Use for TU login',guarded(()=>useForLogin(entry.key))));
            if(entry.level==='Limited Access'&&entry.key!==normalizeKey(readCredential(WHO_KEY)))row.append(makeButton('Use for War Organizer',guarded(async()=>{try{const checked=await verifyEntry(entry.key);if(checked.level!=='Limited Access'||checked.playerId!==getPlayer()?.id)throw Error('Use a Limited key belonging to the current TU player');credentials.set(WHO_KEY,entry.key);status.textContent='Limited key selected for War Organizer';renderSaved();}catch{status.textContent='Select a valid Limited key belonging to the current TU player.'}})));
            row.append(makeButton('Remove',guarded(async()=>{
              if(!confirm('Remove only this saved API key? Other saved keys will be retained.'))return;
              const activeKey=entry.key===readSavedKey();
              if(activeKey){try{await devCancel()}catch{status.textContent='Cancellation not confirmed; key retained. Check the DEV connection and retry.';return;}}
              forgetStoredKey(entry.key);
              if(activeKey){resetDevAuthFailure();localStorage.removeItem(TU_TERMS_KEY);sessionTokens.clear();clearPlayer();publishAuthorization(false);showAgreement();syncLauncher();}
              else{status.textContent='Selected key removed; other saved keys retained';renderSaved();}
            })));savedKeys.append(row);
          }
        }
        const toggleSaved=makeButton('Hide Saved Keys',()=>{viewing=!viewing;toggleSaved.textContent=viewing?'Hide Saved Keys':'View Saved Keys';renderSaved();});content.append(toggleSaved,savedKeys);
        content.append(makeButton('Clear session',()=>{clearPlayer();status.textContent=identityStatus;refreshIdentity()}));
        form.addEventListener('submit',async event=>{
          event.preventDefault();if(keyOperation)return;keyOperation=true;const key=normalizeKey(input.value);input.value='';
          if(!key){keyOperation=false;status.textContent='Enter a valid 16-character API key';return;}
          submit.disabled=true;status.textContent='Verifying key with Torn…';
          try{const checked=await verifyEntry(key);status.textContent=checked.level+' key verified and saved individually; TU login unchanged';renderSaved();}
          catch{status.textContent='Not saved: Torn must verify a valid Public Only or Limited Access key and its owner';}
          finally{keyOperation=false;submit.disabled=false;}
        });renderSaved();return;
      }
      if(settingsPage==='diagnostics'){
      if(diagnosticModule){const h=document.createElement('h4');h.textContent='Tool: '+(registry.modules.find(m=>m.id===diagnosticModule)?.name||diagnosticModule);content.append(h)}
      const buildDiagnostics=()=>({
        managerVersion:TU_VERSION,
        toolCount:registry.modules.length,
        tools:registry.modules.map(m=>({id:m.id,version:m.version,enabled:!saved.disabled?.[m.id],active:active===m.id})),
        playerVerified:!!playerInfo,
        factionId:playerInfo?.factionId??null,
        savedPublicOnlyKeyPresent:!!readSavedKey(),
        transport:{tampermonkey:typeof managerHttp==='function',pda:typeof PDA_httpGet==='function'},
        platform:typeof unsafeWindow!=='undefined'?'Tampermonkey':'PDA or browser'
      });
      content.append(makeButton('Open Diagnostics',()=>{
        let win=document.getElementById('tu-diagnostics-window');
        if(win){win.hidden=false;return;}
        win=document.createElement('section');win.id='tu-diagnostics-window';
        win.style.cssText='position:fixed;z-index:2147483646;top:15%;left:calc(50% - 190px);width:380px;height:360px;background:#181b20;color:#f2e8d5;border:1px solid #ad8d4b;border-radius:12px;box-shadow:0 12px 35px #000a;padding:10.5px;display:flex;flex-direction:column;gap:7.5px;box-sizing:border-box';
        const header=document.createElement('header');
        header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:7.5px;cursor:move';
        const title=document.createElement('strong');title.textContent='TU Diagnostics';
        const close=makeButton('Close',()=>{win.remove();});
        header.append(title,close);
        const report=document.createElement('pre');
        report.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;overflow:auto;flex:1;margin:0';
        const refresh=()=>{const all=buildDiagnostics();const mod=diagnosticModule;report.textContent=JSON.stringify(mod?{managerVersion:all.managerVersion,tool:all.tools.find(m=>m.id===mod)||null}:all,null,2);};
        const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
        actions.append(makeButton('Refresh',refresh),makeButton('Copy Diagnostics',()=>{
          const value=JSON.stringify(buildDiagnostics(),null,2);
          if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>alert('Diagnostics copied')).catch(()=>prompt('Copy diagnostics',value));
          else prompt('Copy diagnostics',value);
        }));
        win.append(header,report,actions);document.body.appendChild(win);refresh();
      }));
      return;
      }
      if(settingsPage==='storage'){
      const heading=document.createElement('strong');heading.textContent='Storage & Backups';content.append(heading);
      const summary=document.createElement('p');
      const spaces=storage.namespaces();
      summary.textContent=spaces.length+' tool data namespace(s): '+(spaces.join(', ')||'none')+'. Data remains when tools are disabled.';
      content.append(summary);
      const backup=makeButton('Export backup',()=>{
        try{
          const json=exportData(),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob);
          const a=document.createElement('a');a.href=url;a.download='torn-utilities-backup-'+new Date().toISOString().slice(0,10)+'.json';
          document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
        }catch(e){alert('Export failed: '+e.message);}
      });content.append(backup);
      content.append(makeButton('Restore backup',()=>{
        const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
        input.addEventListener('change',async()=>{
          const file=input.files?.[0];if(!file)return;
          try{if(!confirm('Restore TU backup? Matching keys will be overwritten.'))return;
            const count=importData(await file.text());alert('Restored '+count+' entries. Reload Torn to apply settings.');render('settings');
          }catch(e){alert('Restore failed: '+e.message);}
        });input.click();
      }));
      const privacy=document.createElement('p');privacy.textContent='Backups contain TU-managed settings and tool data only. Large archives and legacy storage are not included.';content.append(privacy);
      for(const id of spaces){
        const line=document.createElement('div');line.className='tu-card';
        const name=document.createElement('span');name.textContent=id+' ('+storage.keys(id).length+' keys)';name.style.flex='1';
        line.append(name,makeButton('Clear data',()=>{if(confirm('Delete all TU data for '+id+'?')){storage.clear(id);render('settings');}}));content.append(line);
      }
      }
    }else{
      const p=document.createElement('p');p.textContent='Torn Utilities integration development build by RelaxSweety [4539436]. Drag TU to reposition.';content.append(p);
      if(devAuthIssue){const issue=document.createElement('p');issue.setAttribute('role','status');issue.textContent=devAuthIssue;content.append(issue,makeButton('Retry saved API key',()=>{resetDevAuthFailure();void restoreDevSession();}));}
      const agreementButton=makeButton('User Agreement',()=>{content.replaceChildren();const back=makeButton('← About',()=>render('about'));content.append(back);appendTerms(content);if(!hasAgreement())content.append(makeButton('Review and Accept Terms',showAgreement));});agreementButton.style.margin='6px 6px 6px 0';content.append(agreementButton);const notesButton=makeButton('Version Notes',()=>{content.replaceChildren();content.append(makeButton('← About',()=>render('about')));const heading=document.createElement('h3');heading.textContent='Version Notes';const notes=document.createElement('div');for(const release of TU_RELEASES){const h=document.createElement('h4');h.textContent=release.version+' · '+release.date;notes.append(h);for(const [section,items] of Object.entries(release.changes)){const p=document.createElement('p');p.textContent=section+': '+items.join('; ');notes.append(p);}}content.append(heading,notes);});notesButton.style.margin='6px 0';content.append(notesButton);
      // Official-style vector marks; no remote image dependencies.
      addSocialIcon('RelaxSweety on Discord','https://discord.com/users/relaxsweety','M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.1 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.075.075 0 0 0-.041-.104 13.1 13.1 0 0 1-1.872-.89.076.076 0 0 1-.008-.127c.126-.095.252-.193.372-.292a.074.074 0 0 1 .077-.01c3.929 1.793 8.185 1.793 12.068 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.292a.076.076 0 0 1-.007.127c-.598.35-1.224.65-1.873.89a.076.076 0 0 0-.04.105c.36.698.77 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.83 19.83 0 0 0 6.003-3.03.077.077 0 0 0 .031-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z');
      const tornLink=document.createElement('a');tornLink.href='https://www.torn.com/profiles.php?XID=4539436';tornLink.target='_blank';tornLink.rel='noopener noreferrer';tornLink.title='RelaxSweety on Torn';tornLink.setAttribute('aria-label','RelaxSweety on Torn');
      tornLink.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:50px;height:48px;margin:9px 10.5px 3px 0;background:#252a2e;border:1px solid #806a3e;border-radius:12px';
      const tornLogo=document.createElement('img');tornLogo.src='https://www.torn.com/favicon.ico';tornLogo.alt='Torn';tornLogo.width=30;tornLogo.height=30;tornLink.append(tornLogo);content.append(tornLink);
    }
  }
  render(hasAgreement()?'modules':'about');
  async function resumeSavedMonitor(){if(active||!authorized()||sessionStorage.getItem('tu:monitor:resume:v1')!==String(getPlayer()?.id||'')||!getPlayer()?.id||!registered.has('item-monitor'))return;if(await openModule('item-monitor')){tuMinimize();syncLauncher();}}
  void restoreDevSession().then(resumeSavedMonitor);
  const resumeAuthorization=()=>{if(!document.hidden&&devToken()&&!freshAuthorization())void restoreDevSession({force:true});};
  document.addEventListener('visibilitychange',resumeAuthorization);
  window.addEventListener('pageshow',resumeAuthorization);
  window.addEventListener('storage',event=>{
    if(![VAULT,TU_TERMS_KEY,VAULT_CLEARED,credentials.revisionKey].includes(event.key))return;
    clearAuthorizationCache();
    if(event.key===VAULT||event.key===VAULT_CLEARED||event.key===credentials.revisionKey){sessionStorage.removeItem(IDENTITY_CACHE);sessionTokens.clear();automaticIdentityAttempted=false;}
    if(!readSavedKey()||!localStorage.getItem(TU_TERMS_KEY))publishAuthorization(false);
    else void restoreDevSession({force:true});
  });
  // Do not interrupt first-run API requests with an immediate alert.
  window.addEventListener('torn-utilities-ready',()=>render(currentTab));
  // Tool factories remain inert until Open is pressed.

  const isVisible=id=>{
    const el=document.getElementById(id);
    return !!el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  };
  const syncLauncher=()=>{
    const moduleVisible=!!active&&(['tuim-menu','tuim-panel','tuim-catalog','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tca-panel','tca-playbar'].some(isVisible)||[...moduleHost.children].some(el=>isVisible(el.id)||(!el.hidden&&el.getClientRects().length>0)));
    const consent=document.getElementById('tu-agreement-overlay');
    const hide=consent&&!consent.hidden&&consent.style.display!=='none'?true:(tuNav.minimized||tuNav.exited?false:(!panel.hidden||moduleVisible));
    if(launcher.hidden!==hide)launcher.hidden=hide;
  };
  const closePanel = () => { tuMinimize(); syncLauncher(); };
  const togglePanel=()=>{const visible=tuRoots.some(id=>{const el=tuRoot(id);return el&&!el.hidden&&getComputedStyle(el).display!=='none';});if(tuNav.minimized||tuNav.exited||!visible)tuRestore();else tuMinimize();syncLauncher();};
  const navHeader=panel.querySelector('header');
  const addNavControl=(label,title,handler,before)=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.className='tu-nav-control';
    b.addEventListener('click',e=>{e.stopPropagation();handler();syncLauncher();});
    if(before)navHeader.prepend(b);else navHeader.insertBefore(b,navHeader.querySelector('.tu-close'));return b;
  };
  addNavControl('←','Back',tuBack,true);
  addNavControl('−','Minimize',tuMinimize,false);
  panel.querySelector('.tu-close').title='Exit';
  panel.querySelector('.tu-close').setAttribute('aria-label','Exit');
  panel.querySelector('.tu-close').addEventListener('click',()=>{tuExit();syncLauncher();});
  panel.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {if(!authorized()&&b.dataset.tab!=='about'){showAgreement();return;}if(b.dataset.tab==='modules')goModules();else render(b.dataset.tab);}));
  // Shared floating-window support for TU module panels.
  // Persist each TU window's user-selected size and position independently.
  const floatIds=['tu-diagnostics-window','tuim-menu','tuim-panel','tuim-catalog','tca-panel','tu-pda-panel','sff-root','tpfg-manager','tpfg-root','tpfg-prompt'];
  const floatingSetup=new WeakSet(),floatingResizeObservers=new Map();
  const FLOAT_KEY='tu:window-layout:v1:';
  const getLayout=id=>{try{return JSON.parse(localStorage.getItem(FLOAT_KEY+id)||'null')}catch(_){return null}};
  const putLayout=(id,layout)=>{try{localStorage.setItem(FLOAT_KEY+id,JSON.stringify(layout))}catch(_){}};
  const setupFloating=el=>{
    if(!el||floatingSetup.has(el)||!el.id)return;
    floatingSetup.add(el);
    el.style.boxSizing='border-box';
    el.style.maxWidth='calc(100vw - 12px)';
    el.style.maxHeight='calc(100dvh - 12px)';
    el.style.overflow='auto';
    el.style.resize='both';
    el.style.minWidth='220px';
    el.style.minHeight='120px';
    el.style.overflowWrap='anywhere';
    const layout=getLayout(el.id);
    if(layout){
      if(Number.isFinite(layout.width)&&layout.width>=220)el.style.width=Math.min(layout.width,Math.max(220,innerWidth-12))+'px';
      if(Number.isFinite(layout.height)&&layout.height>=120)el.style.height=Math.min(layout.height,Math.max(120,innerHeight-12))+'px';
      if(Number.isFinite(layout.left)&&Number.isFinite(layout.top)){
        el.style.left=Math.max(0,Math.min(layout.left,innerWidth-100))+'px';
        el.style.top=Math.max(0,Math.min(layout.top,innerHeight-60))+'px';
        el.style.right='auto';el.style.bottom='auto';
      }
    }
    const remember=()=>{
      if(el.hidden||!el.isConnected)return;
      const rect=el.getBoundingClientRect();
      if(rect.width<100||rect.height<70)return;
      putLayout(el.id,{width:Math.round(rect.width),height:Math.round(rect.height),left:Math.round(rect.left),top:Math.round(rect.top)});
    };
    if(typeof ResizeObserver==='function'){
      let first=true;
      const resizeObserver=new ResizeObserver(()=>{
        if(first){first=false;return;}
        remember();
      });
      floatingResizeObservers.set(el,{observer:resizeObserver,observing:false});
    }
    const bar=el.querySelector('header,.tu-header,.tuim-header,.tuac-header')||el.firstElementChild;
    if(!bar)return;
    bar.style.touchAction='none';
    bar.style.cursor='move';
    let drag=null;
    bar.addEventListener('pointerdown',e=>{
      if(e.target.closest('button,input,select,textarea,a,[role=button]'))return;
      if(e.button!==0&&e.pointerType==='mouse')return;
      const rect=el.getBoundingClientRect();
      el.style.left=rect.left+'px';el.style.top=rect.top+'px';el.style.right='auto';el.style.bottom='auto';
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      el.style.left=Math.max(0,Math.min(innerWidth-el.offsetWidth,drag.left+e.clientX-drag.x))+'px';
      el.style.top=Math.max(0,Math.min(innerHeight-el.offsetHeight,drag.top+e.clientY-drag.y))+'px';
    });
    const end=e=>{if(drag?.id===e.pointerId){drag=null;remember()}};
    bar.addEventListener('pointerup',end);bar.addEventListener('pointercancel',end);
  };
  // Enforce one visible TU window when a module reveals a new panel.
  let tuWindowSyncing=false;
  const tuReconcileWindows=()=>{
    if(tuWindowSyncing||tuNav.minimized||tuNav.exited)return;
    if(tuRoot(tuNav.current)&&!tuRoot(tuNav.current).hidden)return;
    const visible=tuRoots.filter(id=>{const el=tuRoot(id);return el&&!el.hidden&&getComputedStyle(el).display!=='none';});
    if(visible.length<2)return;
    const latest=visible.find(id=>id!==tuNav.current&&id!=='tu-pda-panel')||visible[visible.length-1];
    if(latest!==tuNav.current&&tuRoot(tuNav.current))tuNav.history.push(tuNav.current);
    tuWindowSyncing=true;tuNav.current=latest;
    for(const id of visible){if(id!==latest){const el=tuRoot(id);el.hidden=true;if(id==='tpfg-root')el.style.display='none';}}
    tuWindowSyncing=false;
  };
  const enhanceFloating=()=>floatIds.forEach(id=>setupFloating(document.getElementById(id)));
  const enhancedHeaders=new WeakSet();
  const tuEnhanceHeaders=()=>{
    for(const id of floatIds){
      if(id==='tu-pda-panel')continue;
      const el=tuRoot(id);if(!el||el.dataset.tuModuleNav==='1')continue;
      const bar=el.querySelector('header,.tu-header,.tuim-header,.tuim-travel-header,.tuac-header');if(!bar||(enhancedHeaders.has(bar)&&bar.querySelector('[data-tu-nav-controls]')))continue;enhancedHeaders.add(bar);
      el.dataset.tuNavHeader='1';for(const oldButton of [...bar.querySelectorAll('button')]){if(['−','—','×'].includes(oldButton.textContent.trim())&&!oldButton.closest('[data-tu-nav-controls]')&&oldButton.style.display!=='none')oldButton.style.display='none';}
      if(!bar.querySelector('[data-tu-brand-emblem]')){const emblem=document.createElement('span');emblem.className='tu-brand-emblem';emblem.dataset.tuBrandEmblem='1';emblem.textContent='';bar.prepend(emblem);}
      if(bar.querySelector('[data-tu-nav-controls]'))continue;bar.style.position='sticky';bar.style.top='0';bar.style.zIndex='100';bar.style.background='#101417';
      const controls=document.createElement('span');controls.dataset.tuNavControls='1';controls.style.cssText='margin-left:auto;display:flex;gap:3.75px';
      for(const [label,title,fn] of [['←','Back',tuBack],['−','Minimize',tuMinimize],['×','Exit',tuExit]]){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
        b.style.cssText='padding:3px 6.75px;background:#252a2e;color:#f1ce72;border:1px solid #806a3e;border-radius:5px';
        b.addEventListener('click',e=>{e.stopPropagation();fn();syncLauncher();});controls.append(b);
      }
      bar.append(controls);
    }
  };
  enhanceFloating();tuEnhanceHeaders();
  // Torn updates its page frequently. Ignore unrelated changes and perform TU
  // visibility/layout work at most once per frame, never once per mutation batch.
  const windowIds=new Set([...tuRoots,...floatIds,moduleHost.id,'tu-agreement-overlay']);
  const windowSelector=[...windowIds].map(id=>'#'+id).join(',');
  const headerSelector='header,.tu-header,.tuim-header,.tuim-travel-header,.tuac-header';
  let uiFrame=null,enhancementPending=false;
  const scheduleWindowUpdate=(enhance=false)=>{
    enhancementPending ||= enhance;
    if(uiFrame!==null||document.hidden)return;
    uiFrame=requestAnimationFrame(()=>{
      uiFrame=null;if(document.hidden)return;
      if(enhancementPending){enhancementPending=false;enhanceFloating();tuEnhanceHeaders();}
      observeTUWindows();syncLauncher();
    });
  };
  const windowObserver=new MutationObserver(records=>{
    let visibilityChanged=false,headersChanged=false;
    for(const record of records){
      const target=record.target.nodeType===1?record.target:record.target.parentElement;
      if(!target)continue;
      if(record.type==='attributes'){
        if(windowIds.has(target.id)||target.parentElement===moduleHost||target===document.body)visibilityChanged=true;
        continue;
      }
      const nodes=[...record.addedNodes,...record.removedNodes].filter(n=>n.nodeType===1);
      if(target===moduleHost||nodes.some(n=>windowIds.has(n.id)||n.querySelector(windowSelector))){visibilityChanged=true;headersChanged=true;}
      else if(target.closest(windowSelector)&&(target.matches(headerSelector)||nodes.some(n=>n.matches(headerSelector)||n.querySelector(headerSelector))))headersChanged=true;
    }
    if(visibilityChanged||headersChanged)scheduleWindowUpdate(headersChanged);
  });
  const windowDiscovery=new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(n=>n.nodeType===1&&(windowIds.has(n.id)||n.querySelector(windowSelector)))))scheduleWindowUpdate(true);
  });
  function observeTUWindows(){
    if(!observationReady)return;
    windowObserver.disconnect();windowDiscovery.disconnect();
    for(const [el,entry] of floatingResizeObservers){
      const needed=!document.hidden&&el.isConnected&&!el.hidden&&el.style.display!=='none'&&(el===panel||!!active||!panel.hidden);
      if(needed&&!entry.observing){entry.observer.observe(el);entry.observing=true;}
      else if(!needed&&entry.observing){entry.observer.disconnect();entry.observing=false;}
      if(!el.isConnected){entry.observer.disconnect();floatingResizeObservers.delete(el);}
    }
    if(document.hidden)return;
    const options={subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden','class']};
    if(!panel.hidden)windowObserver.observe(panel,options);
    const overlay=document.getElementById('tu-agreement-overlay');if(overlay&&!overlay.hidden)windowObserver.observe(overlay,options);
    if(active){windowObserver.observe(moduleHost,options);for(const id of windowIds){const el=tuRoot(id);if(el&&el!==moduleHost&&el!==panel)windowObserver.observe(el,options);}windowDiscovery.observe(document.body,{childList:true});}
  }
  observationReady=true;observeTUWindows();
  document.addEventListener('visibilitychange',()=>{observeTUWindows();if(!document.hidden&&(active||!panel.hidden))scheduleWindowUpdate(true);});
  syncLauncher();
  // Restore the original draggable launcher with compact dimensions.
  launcher.setAttribute('aria-label','Open Torn Utilities; drag to reposition');
  launcher.style.width='34px';
  launcher.style.height='34px';
  launcher.style.minWidth='34px';
  launcher.style.minHeight='34px';
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const setPos = (x, y) => {
    launcher.style.left = clamp(x, 0, Math.max(0, innerWidth - Math.max(34,launcher.offsetWidth))) + 'px';
    launcher.style.top = clamp(y, 0, Math.max(0, innerHeight - Math.max(34,launcher.offsetHeight))) + 'px';
  };
  if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPos(saved.x, saved.y);
  let gesture = null,suppressLauncherClickUntil=0,launcherTapGuard=null,launcherTapGuardTimer=null;
  const shieldLauncherTap=rect=>{
    if(launcherTapGuard)window.removeEventListener('click',launcherTapGuard,true);
    clearTimeout(launcherTapGuardTimer);
    const until=Date.now()+500;
    launcherTapGuard=event=>{if(event.target===launcher||launcher.contains(event.target)||Date.now()>until)return;if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;event.preventDefault();event.stopImmediatePropagation();};
    window.addEventListener('click',launcherTapGuard,{capture:true,passive:false});
    launcherTapGuardTimer=setTimeout(()=>{window.removeEventListener('click',launcherTapGuard,true);launcherTapGuard=null;launcherTapGuardTimer=null;},500);
  };
  // Keep the launcher mounted through pointer release; activate only on click.
  for(const type of ['pointerdown','pointerup','pointermove','pointercancel','mousedown','mouseup','touchstart','touchend','touchcancel','dblclick'])launcher.addEventListener(type,event=>event.stopPropagation());
  launcher.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    uiTrace('launcher-click','attempt',{detail:event.detail,dragSuppressed:Date.now()<suppressLauncherClickUntil});if(Date.now()<suppressLauncherClickUntil){uiTrace('launcher-blocked','drag-release');return;}
    const rect=launcher.getBoundingClientRect();if(event.detail>0)shieldLauncherTap(rect);togglePanel();uiTrace('launcher-result',tuNav.minimized?'minimized':'restore-requested');
  });
  launcher.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    suppressLauncherClickUntil=0;uiTrace('launcher-pointer','down');gesture = {id:e.pointerId, sx:e.clientX, sy:e.clientY, x:launcher.offsetLeft, y:launcher.offsetTop, moved:false};
    launcher.setPointerCapture?.(e.pointerId);
  });
  launcher.addEventListener('pointermove', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const dx=e.clientX-gesture.sx, dy=e.clientY-gesture.sy;
    if (Math.hypot(dx,dy)>6) gesture.moved=true;
    if (gesture.moved) {e.preventDefault();setPos(gesture.x+dx,gesture.y+dy);}
  });
  launcher.addEventListener('pointerup', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const moved=gesture.moved; gesture=null;
    uiTrace('launcher-pointer',moved?'drag':'tap');if (moved) { suppressLauncherClickUntil=Date.now()+500;saved.x=launcher.offsetLeft; saved.y=launcher.offsetTop; persist(); }
  });
  launcher.addEventListener('pointercancel', () => { gesture=null;suppressLauncherClickUntil=Date.now()+500; });
  window.addEventListener('resize', () => {
    if (saved.x !== undefined) setPos(launcher.offsetLeft, launcher.offsetTop);
  });
})();



/* TU compact presentation v1 */

/* Integrated tool: flight-game (0.12.8) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="flight-game")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="flight-game"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.12.8"}};



/*
 * TORN PDA ARCADE - RELEASE NOTES
 * v0.10.7 - Touch-identifier joystick tracking, reliable score-driven aircraft styling, and 100-point full-health pickups.
 * v0.10.6 - Fixed multitouch joystick pointer ownership and reset on release or lost capture.
 * v0.10.5 - Removed continuous engine audio and corrected aircraft transitions on score awards.
 * v0.10.4 - Changed aircraft progression to 5,000-point stages with exit-right and reenter-left transformation animation.
 * v0.10.3 - Ensured engine audio stops immediately on pause, leave prompts, game over, minimize, and exit.
 * v0.10.2 - Reduced aircraft engine/movement sound volume while preserving effects volume.
 * v0.10.1 - Fixed literal escaped-newline parse errors introduced by the v0.10.0 aircraft/audio build.
 * v0.10.0 - Added 8-stage aircraft progression, faster maneuvering, and volume-controlled movement/explosion/healing audio.
 * v0.9.3 - Fixed two literal escape sequences that caused a fatal JavaScript parse error and prevented the Arcade launcher from loading.
 * v0.9.2 - Fixed fatal initialization syntax error that prevented the userscript and launcher from loading.
 * v0.9.1 - Fixed launcher initialization regression that could prevent the Arcade icon from appearing.
 * v0.9.0 - Added condition timers/end prompts plus save-and-resume for unfinished games.
 * v0.8.0 - Added per-game Show in Game List setting and persistent visibility preferences.
 * v0.7.0 - Added modular Arcade registry; Flight Arcade became a registered module.
 * v0.6.0 - Added selected-tab highlighting, escaped-enemy damage, and +10 health pickups.
 * v0.5.0 - Added crosshair Game Manager, Games/Settings tabs, and removed displayed flight status.
 * v0.4.0 - Added availability modes, strict flight detection, and draggable launcher persistence.
 * v0.3.0 - Added analog controls, chat sharing, donation link, and auto-update metadata.
 * v0.2.0 - Improved flight detection, mobile controls/layout, and update support.
 * v0.1.0 - Initial release.
 */

(() => {
    'use strict';
  const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.12.6';
    // TU v0.3 storage bridge. Existing legacy keys remain readable and are migrated
    // on first access; modules continue to work if TU loads later or is absent.
    const TU_NAMESPACE = 'flight-game';
    const legacyStore = window.localStorage;
    const tuStorage = () => (typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.storage;
    const moduleStore = {
        getItem(key) {
            const name = String(key);
            const tu = tuStorage();
            if (tu) {
                try {
                    const value = tu.get(TU_NAMESPACE, name, null);
                    if (typeof value === 'string') return value;
                } catch (_) {}
            }
            const old = legacyStore.getItem(name);
            if (old !== null && tu) {
                try { tu.set(TU_NAMESPACE, name, old); } catch (_) {}
            }
            return old;
        },
        setItem(key, value) {
            const name = String(key), text = String(value);
            const tu = tuStorage();
            if (tu) {
                // Preserve existing legacy data until the shared write succeeds.
                tu.set(TU_NAMESPACE, name, text);
            } else {
                legacyStore.setItem(name, text);
            }
        },
        removeItem(key) {
            const name = String(key);
            const tu = tuStorage();
            if (tu) tu.remove(TU_NAMESPACE, name);
            legacyStore.removeItem(name);
        }
    };


    if (window.__TU_FLIGHT_GAME__) return;
    window.__TU_FLIGHT_GAME__ = true;

    const GAME = {
        name: 'Torn PDA Flight Game',
        version: '0.10.8',
        creator: 'RelaxSweety',
        creatorId: '4539436',
        creatorUrl: 'https://www.torn.com/profiles.php?XID=4539436',
        discordUrl: 'https://discord.com/users/relaxsweety'
    };

    const STORE_KEY = 'tornPdaFlightGame';
    const LAUNCH_MODE_KEY = 'tpfgLaunchMode';
    const LAUNCH_POS_KEY = 'tpfgLaunchPosition';
    const SAVE_PREFIX = 'tpfgGameSave:';
    const launchMode = () => 'always';
    let saved = { highScore: 0, bestKills: 0, games: 0 };

    async function storageGet() {
        try {
            if (typeof PDA_storage !== 'undefined' && PDA_storage && typeof PDA_storage.get === 'function') {
                const v = await PDA_storage.get(STORE_KEY);
                if (v) return typeof v === 'string' ? JSON.parse(v) : v;
            }
        } catch (_) {}
        try {
            return JSON.parse(moduleStore.getItem(STORE_KEY) || 'null');
        } catch (_) { return null; }
    }

    async function storageSet(value) {
        try {
            if (typeof PDA_storage !== 'undefined' && PDA_storage && typeof PDA_storage.set === 'function') {
                await PDA_storage.set(STORE_KEY, JSON.stringify(value));
                return;
            }
        } catch (_) {}
        try { moduleStore.setItem(STORE_KEY, JSON.stringify(value)); } catch (_) {}
    }

    function injectStyle() {
        if (document.getElementById('tpfg-style')) return;
        const s = document.createElement('style');
        s.id = 'tpfg-style';
        s.textContent = `
#tpfg-launcher{position:fixed;right:12px;bottom:88px;z-index:2147483000;width:42px;height:42px;border:1px solid #777;background:#171717;color:#eee;border-radius:50%;font-size:17.25px;font-weight:800;touch-action:none;box-shadow:0 2px 8px #0008}
#tpfg-manager,#tpfg-game-settings,#tpfg-prompt{position:fixed;inset:0;z-index:2147483800;background:#000b;display:none;align-items:center;justify-content:center;padding:12px}
.tpfg-settings-card{width:min(420px,100%);background:#151a20;border:1px solid #59616b;border-radius:12px;padding:12px;color:#fff;font-family:Arial,sans-serif}
.tpfg-settings-card label{display:block;padding:9px 3px;border-top:1px solid #343a40}.tpfg-manager-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:9px 0}.tpfg-manager-tabs button,.tpfg-game-card button{min-height:42px;border:1px solid #59616b;border-radius:8px;background:#252c34;color:#fff;font-weight:800}.tpfg-manager-tabs button.tpfg-selected{background:#596674;border-color:#aeb8c2;box-shadow:inset 0 0 0 1px #d7dde3}.tpfg-game-card{display:grid;gap:6px;padding:9px;border:1px solid #343a40;border-radius:9px}.tpfg-game-card span,.tpfg-empty{color:#9da6af;font-size:11px}.tpfg-setting-row{display:flex;justify-content:space-between;padding:6px 3px}.tpfg-settings-note{color:#9da6af;font-size:11px}
#tpfg-launch{position:fixed;right:10px;bottom:88px;z-index:2147483000;border:1px solid #777;background:#171717;color:#eee;border-radius:10px;padding:7.5px 9.75px;font:700 11px Arial,sans-serif;box-shadow:0 2px 8px #0008;touch-action:manipulation}
#tpfg-launch:active{transform:scale(.97)}
#tpfg-root{position:fixed;inset:0;z-index:2147483600;background:#090b0e;color:#fff;font-family:Arial,sans-serif;display:none;overscroll-behavior:none;touch-action:none}
#tpfg-root *{box-sizing:border-box}
#tpfg-shell{height:100%;display:flex;flex-direction:column;max-width:900px;margin:0 auto;background:#0d1117}
#tpfg-top{flex:0 0 auto;padding:6px 7.5px;background:#151a20;border-bottom:1px solid #343a40}
#tpfg-title{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:800}
#tpfg-condition{font-size:11px;color:#aeb6bf;margin-top:2.25px;font-weight:700}
.tpfg-topbtn{border:1px solid #555;background:#242a31;color:#fff;border-radius:7px;min-width:42px;min-height:34px;font-weight:800}
#tpfg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:3.75px;margin-top:5.25px}
.tpfg-stat{background:#090c10;border:1px solid #30363d;border-radius:6px;text-align:center;padding:3px 1.5px;font-size:11px;color:#9da7b1}
.tpfg-stat b{display:block;color:#fff;font-size:11px;margin-top:1.5px}
#tpfg-stagewrap{position:relative;flex:1 1 auto;min-height:220px;overflow:hidden;background:#05080d}
#tpfg-canvas{width:100%;height:100%;display:block}
#tpfg-message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:15px;pointer-events:none;font-weight:800;text-shadow:0 2px 4px #000}
#tpfg-controls{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr;gap:7.5px;padding:6.75px 9px 9px;background:#11161c;border-top:1px solid #343a40;user-select:none;-webkit-user-select:none}
#tpfg-stick{position:relative;width:150px;height:150px;margin:auto;border:1px solid #58616b;border-radius:50%;background:#1b222a;touch-action:none}
#tpfg-stick-knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-21.75px;border:1px solid #8b949e;border-radius:50%;background:#39424c;pointer-events:none}
#tpfg-stick-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8b949e;font-size:11px;pointer-events:none}
#tpfg-chatpick{position:fixed;inset:0;z-index:2147483700;background:#000b;display:none;align-items:center;justify-content:center;padding:12px}#tpfg-chatcard{width:min(440px,100%);max-height:80vh;overflow:auto;background:#151a20;border:1px solid #59616b;border-radius:12px;padding:10.5px}#tpfg-chatlist button{width:100%;min-height:44px;margin:3.75px 0;background:#252c34;color:#fff;border:1px solid #59616b;border-radius:8px}.tpfg-donate{margin-top:12px;padding-top:9px;border-top:1px solid #3a424b;font-size:11px;line-height:1.6;color:#aeb6bf}.tpfg-donate a{color:#ffd75a;font-weight:800}
#tpfg-fire{border:1px solid #58616b;background:#252c34;color:#fff;font-weight:900;border-radius:12px;touch-action:none}
#tpfg-fire.on{background:#555f6b;transform:scale(.96)}

#tpfg-actions{display:flex;flex-direction:column;justify-content:center;gap:6px}
#tpfg-audio{display:grid;grid-template-columns:auto 1fr auto;gap:4.5px;align-items:center;font:700 11px Arial,sans-serif;color:#aeb6bf}#tpfg-volume{width:100%;accent-color:#8b949e}#tpfg-mute{min-height:28px;border:1px solid #555;border-radius:7px;background:#242a31;color:#fff;font-weight:800}
#tpfg-fire{min-height:82px;font-size:15px}
#tpfg-pause,#tpfg-end{min-height:40px;border:1px solid #555;border-radius:9px;background:#242a31;color:#fff;font-weight:800}
#tpfg-results{position:absolute;inset:0;background:#0d1117;z-index:3;display:none;overflow:auto;padding:16.5px}
#tpfg-results-card{max-width:520px;margin:15px auto;background:#151a20;border:1px solid #3a424b;border-radius:14px;padding:13.5px;text-align:center}
#tpfg-results h2{margin:0 0 6px;font-size:15px}
#tpfg-results-route{color:#b8c0c8;margin-bottom:12px}
#tpfg-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tpfg-result{background:#0b0e12;border-radius:8px;padding:7.5px;color:#aab2ba;font-size:11px}
.tpfg-result b{display:block;color:#fff;font-size:15px;margin-top:2.25px}
#tpfg-sharetext{white-space:pre-wrap;background:#090c10;border:1px solid #30363d;border-radius:8px;text-align:left;padding:7.5px;margin-top:9px;font-size:11px;color:#d6dbe0}
.tpfg-resultbtn{width:100%;min-height:46px;margin-top:6.75px;border:1px solid #59616b;border-radius:9px;background:#252c34;color:#fff;font-weight:800}
#tpfg-by{margin-top:9.75px;font-size:11px;color:#7f8993}
#tpfg-by a{color:#b9c1c9}
@media(max-width:380px){#tpfg-stats{grid-template-columns:repeat(2,1fr)}#tpfg-controls{padding-left:4.5px;padding-right:4.5px;gap:3px}#tpfg-stick{width:132px;height:132px}}
`;
        document.head.appendChild(s);
    }

    function detectFlight() {
        // Torn's travel card is authoritative. Do not infer flight state from generic page words.
        const nodes=[...document.querySelectorAll('body *')];
        const re=/([A-Za-z][A-Za-z .'-]{1,35}?)\s+to\s+([A-Za-z][A-Za-z .'-]{1,35}?)\.\s*Remaining Flight Time\s*-\s*(\d{1,2}:\d{2}:\d{2})/i;
        for (const el of nodes) {
            if (el.children.length) continue;
            const t=(el.textContent||'').replace(/\s+/g,' ').trim();
            const m=t.match(re);
            if(m) return {flying:true,origin:m[1].trim(),destination:m[2].trim(),remaining:m[3]};
        }
        const text=(document.body?.innerText||'').replace(/\s+/g,' ');
        const m=text.match(re);
        return m ? {flying:true,origin:m[1].trim(),destination:m[2].trim(),remaining:m[3]} :
                   {flying:false,origin:'Unknown',destination:'Unknown',remaining:''};
    }

    // Arcade core: games register here; production remains a single bundled userscript.
    const Arcade = {
        games:new Map(),
        registerGame(game){if(!game?.id||typeof game.start!=='function')throw new Error('Invalid arcade game module');this.games.set(game.id,game);return game;},
        list(){return [...this.games.values()].filter(g=>g.id==='flight-arcade');},
        enabled(game){return moduleStore.getItem('tpfgGameEnabled:'+game.id)!=='false';},
        setEnabled(game,value){moduleStore.setItem('tpfgGameEnabled:'+game.id,value?'true':'false');},
        available(game){return game.isAvailable?game.isAvailable():true;},
        start(id){const game=this.games.get(id);if(game&&this.available(game))launchGame(game);}
    };
    const FlightArcade = Arcade.registerGame({
        id:'flight-arcade',name:'Flight Arcade',version:'1.0.0',
        isAvailable(){return true;},
        start(){startGame();},pause(){if(state.running&&!state.paused)togglePause();},resume(){if(state.running&&state.paused)togglePause();},stop(){if(state.running&&!state.over)requestLeave();}
    });

    // Stick Figure Fighter: self-contained arcade module.
    const StickFighter = (() => {
        let host=null, canvas=null, ctx=null, frame=0, last=0, active=false, weaponDropClock=0, keys=new Set(), joystick={x:0,y:0}, player, enemies, pickups, shots, score, elapsed, spawn, attack, weapon, pointer=null, aimPointer=null, aimStick={x:0,y:0}, swing=0, aim=0, paused=false, deathPrompted=false;
        const W=360,H=600, names=['Knife','Bat','Sword','Shotgun','Dual Pistols','Chain Gun'];
        const rand=(a,b)=>a+Math.random()*(b-a);
        const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
        function randomWeaponDrop(){const choices=names.map((_,i)=>i).filter(i=>i!==weapon);return choices[Math.floor(Math.random()*choices.length)];}
        function reset(){weaponDropClock=0;player={x:W/2,y:H/2,hp:100};enemies=[];pickups=[];shots=[];score=0;elapsed=0;spawn=0;attack=0;weapon=0;swing=0;aim=0;paused=false;deathPrompted=false;aimPointer=null;aimStick={x:0,y:0};last=performance.now();}
        function stick(x,y,color){ctx.strokeStyle=color;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y-15,8,0,Math.PI*2);ctx.moveTo(x,y-7);ctx.lineTo(x,y+18);ctx.moveTo(x-12,y+5);ctx.lineTo(x+12,y+5);ctx.moveTo(x,y+18);ctx.lineTo(x-11,y+34);ctx.moveTo(x,y+18);ctx.lineTo(x+11,y+34);ctx.stroke();}
        function draw(){
            ctx.fillStyle='#11151b';ctx.fillRect(0,0,W,H);
            ctx.strokeStyle='#27313b';ctx.lineWidth=1;
            for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
            for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
            for(const p of pickups){if(p.type==='weapon'){ctx.strokeStyle='#ffda63';ctx.lineWidth=2;ctx.strokeRect(p.x-17,p.y-15,34,30);}ctx.fillStyle=p.type==='health'?'#48d16a':'#e4c35c';ctx.fillRect(p.x-(p.weapon===5?13:9),p.y-9,p.weapon===5?26:18,18);ctx.fillStyle='#101010';ctx.font='bold 14px sans-serif';ctx.fillText(p.type==='health'?'+':['K','B','S','G','P','CG'][p.weapon],p.x-6,p.y+5);}
            for(const e of enemies)stick(e.x,e.y,'#e64d54');
            for(const s of shots){ctx.fillStyle='#ffd35b';ctx.beginPath();ctx.arc(s.x,s.y,3,0,7);ctx.fill();}
            stick(player.x,player.y,'#55e879');
            // Visible equipped weapon and animated melee strike.
            ctx.save();ctx.translate(player.x,player.y+5);ctx.rotate(aim);
            ctx.strokeStyle=weapon===0?'#e9edf4':weapon===1?'#aa753f':weapon===2?'#c8e8ff':'#424b55';
            ctx.lineWidth=weapon===1?7:weapon===2?5:4;ctx.lineCap='round';
            const reach=[26,38,53,30,24,38][weapon];
            const theta=weapon<3&&swing>0?Math.sin((1-swing/.22)*Math.PI)*.9:0;
            ctx.rotate(theta);ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(reach,0);ctx.stroke();
            if(weapon===2){ctx.strokeStyle='#f7fafc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,-3);ctx.lineTo(reach+8,0);ctx.stroke();}
            if(weapon===0){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,-3);ctx.lineTo(reach+5,0);ctx.stroke();}
            if(weapon===5){ctx.strokeStyle='#8b949e';ctx.lineWidth=3;for(const off of [-6,0,6]){ctx.beginPath();ctx.moveTo(16,off);ctx.lineTo(42,off);ctx.stroke();}}if(weapon===4){ctx.strokeStyle='#8b949e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(8,11);ctx.lineTo(27,11);ctx.stroke();}
            if(weapon<3&&swing>0){ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,reach+6,-.55,.75);ctx.stroke();}
            ctx.restore();
            ctx.fillStyle='#fff';ctx.font='bold 15px sans-serif';ctx.fillText('HP '+Math.ceil(player.hp)+'   KILLS '+score,12,23);ctx.fillText(names[weapon],12,44);ctx.fillText(Math.floor(elapsed)+'s',W-52,23);ctx.fillStyle='#ffda63';ctx.font='bold 12px sans-serif';ctx.fillText('NEXT GUN '+Math.max(0,Math.ceil(10-weaponDropClock))+'s',W-115,44);
            ctx.fillStyle='#4d2227';ctx.fillRect(12,53,140,9);ctx.fillStyle='#4bdf73';ctx.fillRect(12,53,140*Math.max(0,player.hp)/100,9);
            ctx.strokeStyle='#b8c1d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(62,H-68,43,0,7);ctx.stroke();ctx.fillStyle='#71879b';ctx.beginPath();ctx.arc(62+joystick.x*27,H-68+joystick.y*27,17,0,7);ctx.fill();
            ctx.strokeStyle='#b8c1d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(W-62,H-68,43,0,7);ctx.stroke();ctx.fillStyle='#b37d55';ctx.beginPath();ctx.arc(W-62+aimStick.x*27,H-68+aimStick.y*27,17,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('MOVE',62,H-115);ctx.fillText('AIM',W-62,H-115);ctx.textAlign='left';
            if(player.hp<=0){ctx.fillStyle='#000c';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 30px sans-serif';ctx.fillText('GAME OVER',W/2,H/2-30);ctx.font='18px sans-serif';ctx.fillText('Kills: '+score+' · Time: '+Math.floor(elapsed)+'s',W/2,H/2+5);ctx.fillText('Use the results menu',W/2,H/2+38);ctx.textAlign='left';}
        }
        function tick(ts){if(!active)return;const dt=Math.min(.05,(ts-last)/1000||0);last=ts;if(!paused&&player.hp>0){swing=Math.max(0,swing-dt);elapsed+=dt;spawn-=dt;attack-=dt;
            let dx=joystick.x+(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),dy=joystick.y+(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);let m=Math.hypot(dx,dy)||1;player.x=Math.max(18,Math.min(W-18,player.x+dx/m*145*dt));player.y=Math.max(38,Math.min(H-38,player.y+dy/m*145*dt));
            if(spawn<=0){spawn=Math.max(.12,.65-elapsed/110);const edge=Math.floor(rand(0,4));enemies.push({x:edge===0?-15:edge===1?W+15:rand(0,W),y:edge===2?-15:edge===3?H+15:rand(0,H),hp:weapon===3?2:1});}
            for(const e of enemies){let d=dist(e,player)||1;e.x+=(player.x-e.x)/d*(65+Math.min(85,elapsed/3))*dt;e.y+=(player.y-e.y)/d*(35+Math.min(55,elapsed/5))*dt;if(d<21)player.hp=Math.max(0,player.hp-20*dt);}
            const inRange=enemies.filter(e=>dist(e,player)<(weapon===0?60:weapon===1?80:weapon===2?115:320));const target=inRange.filter(e=>Math.cos(Math.atan2(e.y-player.y,e.x-player.x)-aim)>.45).sort((a,b)=>dist(a,player)-dist(b,player))[0];
            if(target&&attack<=0){if(weapon<3)swing=.22;attack=[.27,.55,.42,.9,.18,.045][weapon];if(weapon<3){const range=[60,80,115][weapon];const hits=enemies.filter(e=>dist(e,player)<range&&Math.cos(Math.atan2(e.y-player.y,e.x-player.x)-aim)>.35).slice(0,weapon===0?1:weapon===1?3:5);for(const e of hits){e.hp--;if(weapon===1){let d=dist(e,player)||1;e.x+=(e.x-player.x)/d*20;e.y+=(e.y-player.y)/d*20;}}}else{let a=aim;for(let i=0;i<(weapon===3?5:weapon===5?3:1);i++){let angle=a+(weapon===3?(i-2)*.16:0);const offset=weapon===5?(i-1)*8:0;shots.push({x:player.x-Math.sin(a)*offset,y:player.y+Math.cos(a)*offset,vx:Math.cos(angle)*(weapon===5?600:350),vy:Math.sin(angle)*(weapon===5?600:350),life:weapon===5?.55:.8});}}}
            for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;for(const e of enemies){if(dist(s,e)<15){e.hp--;s.life=0;break;}}}shots=shots.filter(s=>s.life>0);
            for(const e of enemies.filter(e=>e.hp<=0)){score++;if(Math.random()<.12)pickups.push({x:e.x,y:e.y,type:'health'});if(Math.random()<.008)pickups.push({x:e.x,y:e.y,type:'weapon',weapon:randomWeaponDrop(),spawnedAt:elapsed});}
            enemies=enemies.filter(e=>e.hp>0);
            weaponDropClock+=dt;
            if(weaponDropClock>=10){weaponDropClock-=10;const nextWeapon=randomWeaponDrop();pickups.push({x:Math.max(35,Math.min(W-35,player.x+(player.x<W/2?85:-85))),y:Math.max(90,Math.min(H-160,player.y+(player.y<H/2?65:-65))),type:'weapon',weapon:nextWeapon,spawnedAt:elapsed,guaranteed:true});}
            for(const p of pickups){if(p.type==='weapon'&&p.weapon===weapon&&!p.guaranteed)p.used=true;if(!p.used&&dist(p,player)<23){if(p.type==='health')player.hp=Math.min(100,player.hp+25);else weapon=p.weapon;p.used=true;}}pickups=pickups.filter(p=>!p.used&&(p.type!=='weapon'||elapsed-(p.spawnedAt??elapsed)<10)).slice(-35);
        }draw();if(player.hp<=0&&!deathPrompted){deathPrompted=true;paused=true;try{moduleStore.removeItem('sffSavedGame');}catch(_){}setTimeout(()=>arcadeEndPrompt('stick-figure-fighter',true),0);}if(host){const n=Math.floor(elapsed),t=host.querySelector('#sff-time');if(t)t.textContent=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');host.querySelector('#sff-kills').textContent=score;host.querySelector('#sff-hp').textContent=Math.ceil(player.hp);try{const best=Math.max(score,Number(moduleStore.getItem('sffBestKills')||0));host.querySelector('#sff-best').textContent=best;if(player.hp<=0)moduleStore.setItem('sffBestKills',String(best));}catch(_){}}frame=requestAnimationFrame(tick);}
        function setPointer(e){if(pointer!==null&&e.pointerId!==pointer)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(pointer===null&&Math.hypot(x-62,y-(H-68))>105)return;pointer=e.pointerId;let dx=x-62,dy=y-(H-68),m=Math.max(1,Math.hypot(dx,dy));joystick={x:dx/Math.max(43,m),y:dy/Math.max(43,m)};}
        function start(){stop();reset();host=document.createElement('div');host.id='tpfg-stick-fighter';host.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#080b10;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;box-sizing:border-box;font-family:Arial,sans-serif;color:white';
            host.innerHTML=`
            <div style="width:min(100%,420px);box-sizing:border-box;background:#151a20;border:1px solid #59616b;border-radius:9px 9px 0 0;padding:6.75px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-weight:700">STICK FIGURE FIGHTER <small>v0.1.7</small><button type="button" id="sff-min" class="tpfg-topbtn" aria-label="Leave game">—</button></div>
              <div style="display:flex;justify-content:space-around;margin-top:6px;text-align:center;font-size:11px"><span>TIME<br><b id="sff-time">00:00</b></span><span>KILLS<br><b id="sff-kills">0</b></span><span>HP<br><b id="sff-hp">100</b></span><span>BEST<br><b id="sff-best">0</b></span></div>
            </div>
            <div id="sff-stage" style="position:relative;width:min(100%,420px);min-height:0;display:flex;justify-content:center"></div>
            <div style="width:min(100%,420px);box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;background:#151a20;border:1px solid #59616b;padding:6px;gap:7.5px">
              <span style="font-size:11px;color:#aaa">LEFT: MOVE<br>RIGHT: AIM</span>
              <span style="display:flex;gap:5.25px"><button id="sff-pause" type="button" class="tpfg-resultbtn">PAUSE</button><button id="sff-exit" type="button" class="tpfg-resultbtn">END GAME</button></span>
            </div>
            <div id="sff-dialog" style="display:none;position:absolute;z-index:2;inset:0;background:#000c;align-items:center;justify-content:center;padding:12px">
              <div class="tpfg-settings-card"><h3 id="sff-dialog-title">SAVE YOUR GAME?</h3><p id="sff-dialog-text">Save your current progress and continue next time?</p><div id="sff-dialog-actions" style="display:grid;gap:6px"></div></div>
            </div>`;
            canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.style.cssText='width:100%;height:auto;max-height:calc(100dvh - 175px);touch-action:none;object-fit:contain;border:1px solid #3b4652';host.querySelector('#sff-stage').appendChild(canvas);document.body.appendChild(host);ctx=canvas.getContext('2d');
            canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
            document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);
            host.querySelector('#sff-pause').onclick=()=>{if(player.hp<=0)return;paused=!paused;last=performance.now();host.querySelector('#sff-pause').textContent=paused?'RESUME':'PAUSE';};
            host.querySelector('#sff-exit').onclick=host.querySelector('#sff-min').onclick=requestLeave;
            try{host.querySelector('#sff-best').textContent=moduleStore.getItem('sffBestKills')||'0';}catch(_){}
            active=true;frame=requestAnimationFrame(tick);
        }
        function dialog(title,message,actions){const d=host.querySelector('#sff-dialog');d.querySelector('#sff-dialog-title').textContent=title;d.querySelector('#sff-dialog-text').textContent=message;const area=d.querySelector('#sff-dialog-actions');area.replaceChildren();for(const action of actions){const button=document.createElement('button');button.className='tpfg-resultbtn';button.textContent=action.label;button.onclick=()=>{d.style.display='none';action.run();};area.appendChild(button);}d.style.display='flex';}
        function snapshot(){return JSON.stringify({player,enemies,pickups,shots,score,elapsed,spawn,attack,weapon,swing,aim,weaponDropClock});}
        function save(){try{moduleStore.setItem('sffSavedGame',snapshot());}catch(_){}}
        function restore(){try{const s=JSON.parse(moduleStore.getItem('sffSavedGame'));if(!s)return;({player,enemies,pickups,shots,score,elapsed,spawn,attack,weapon,swing,aim}=s);weaponDropClock=Number.isFinite(s.weaponDropClock)?Math.max(0,Math.min(10,s.weaponDropClock)):elapsed%10;paused=false;last=performance.now();}catch(_){}}
        function requestLeave(){if(!host)return;paused=true;arcadeEndPrompt('stick-figure-fighter',player.hp<=0);}
        function setAim(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height,dx=x-(W-62),dy=y-(H-68),m=Math.hypot(dx,dy);if(m>3){aim=Math.atan2(dy,dx);aimStick={x:dx/Math.max(43,m),y:dy/Math.max(43,m)};}}
        function onDown(e){if(player.hp<=0)return;if(paused)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(Math.hypot(x-(W-62),y-(H-68))<105&&aimPointer===null){aimPointer=e.pointerId;setAim(e);}else setPointer(e);if(pointer===e.pointerId||aimPointer===e.pointerId){canvas.setPointerCapture(e.pointerId);e.preventDefault();}}
        function onMove(e){if(pointer===e.pointerId)setPointer(e);if(aimPointer===e.pointerId)setAim(e);}
        function onUp(e){if(pointer===e.pointerId){pointer=null;joystick={x:0,y:0};}if(aimPointer===e.pointerId){aimPointer=null;aimStick={x:0,y:0};}}
        function onKeyDown(e){keys.add(e.key);}
        function onKeyUp(e){keys.delete(e.key);}
        function stop(){active=false;cancelAnimationFrame(frame);document.removeEventListener('keydown',onKeyDown);document.removeEventListener('keyup',onKeyUp);host?.remove();host=null;pointer=null;aimPointer=null;aimStick={x:0,y:0};joystick={x:0,y:0};keys.clear();}
        return {start,stop,restore,save,reset,resume(){paused=false;last=performance.now();if(host)host.querySelector('#sff-pause').textContent='PAUSE';},getScore(){return score;},getTime(){return elapsed;}};
    })();
    Arcade.registerGame({id:'stick-figure-fighter',name:'Stick Figure Fighter',version:'0.1.5',isAvailable(){return true;},start:StickFighter.start,stop:StickFighter.stop});

    function gameSaveKey(id){return SAVE_PREFIX+id;}
    function getGameSave(id){try{return JSON.parse(moduleStore.getItem(gameSaveKey(id))||'null');}catch(_){return null;}}
    function clearGameSave(id){try{moduleStore.removeItem(gameSaveKey(id));}catch(_){}}
    function snapshotGame(){
        const keys=['score','kills','hp','activeMs','spawnClock','shotClock','enemyShotClock','player','bullets','enemies','enemyBullets','particles','healthDrops'];
        const out={}; keys.forEach(k=>out[k]=state[k]); return JSON.parse(JSON.stringify(out));
    }
    function saveCurrentGame(){try{moduleStore.setItem(gameSaveKey('flight-arcade'),JSON.stringify({version:1,savedAt:Date.now(),state:snapshotGame()}));return true;}catch(_){return false;}}
    function restoreGame(s){Object.assign(state,JSON.parse(JSON.stringify(s.state)));shownStage=aircraftStage();transition=null;state.running=true;state.paused=false;state.over=false;state.lastTs=performance.now();state.keys={up:false,down:false,left:false,right:false,fire:false};state.stick={x:0,y:0};showGame();setTimeout(resize,0);updateHud();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
    function arcadeEndPrompt(id,died=false){
        const isStick=id==='stick-figure-fighter';
        const donation='Torn donations are appreciated. Send cash or items to RelaxSweety [4539436].';
        const close=()=>{if(isStick)StickFighter.stop();else closeActiveGame();(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.closeActiveModule?.();};
        const replay=()=>{if(isStick){StickFighter.start();}else startGame();};
        const buttons=died?[
            {label:'REPLAY',action:replay},
            {label:'EXIT',action:close}
        ]:[
            {label:'SAVE & EXIT',action:()=>{if(isStick)StickFighter.save();else saveCurrentGame();close();}},
            {label:'EXIT WITHOUT SAVING',action:()=>{if(isStick)moduleStore.removeItem('sffSavedGame');else clearGameSave('flight-arcade');close();}},
            {label:'CANCEL',action:()=>{if(isStick)StickFighter.resume();else{state.paused=false;state.lastTs=performance.now();document.getElementById('tpfg-pause').textContent='PAUSE';}}}
        ];
        const gameName=isStick?'Stick Figure Fighter':'Flight Arcade';
        const kills=isStick?StickFighter.getScore():state.kills;
        const score=isStick?StickFighter.getScore():Math.floor(state.score);
        const time=isStick?formatTime(StickFighter.getTime()*1000):formatTime(state.activeMs);
        const status=died?'Game Over':'Session Ended';
        const player=(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.getPlayer?.();
        const playerName=player?.name||'Unknown Player';
        const summary=playerName+' Played Flight Game with a score of '+Number(score).toLocaleString()+' | Kills '+Number(kills).toLocaleString()+' | Flight Time '+time;
        promptBox(died?'GAME OVER':'END GAME',donation,buttons,true,summary);
    }
    function promptBox(title,message,buttons,showDonation=false,summary=''){
        const p=document.getElementById('tpfg-prompt');p.querySelector('h3').textContent=title;p.querySelector('p').textContent=message;
        const a=p.querySelector('#tpfg-prompt-actions');a.innerHTML='';buttons.forEach(x=>{const b=document.createElement('button');b.className='tpfg-resultbtn';b.textContent=x.label;b.onclick=()=>{p.style.display='none';x.action();};a.appendChild(b);});if(summary){const wrap=document.createElement('div');wrap.style.cssText='margin:9px 0;padding:9px;background:#10151b;border:1px solid #59616b;border-radius:8px;font-size:11px;line-height:1.5;white-space:normal;overflow-wrap:anywhere';const label=document.createElement('strong');label.textContent='GAME SUMMARY';const content=document.createElement('div');content.textContent=summary;content.style.margin='5.25px 0';const copy=document.createElement('button');copy.type='button';copy.className='tpfg-resultbtn';copy.textContent='COPY SUMMARY';copy.onclick=async()=>{try{await navigator.clipboard.writeText(summary);copy.textContent='COPIED';}catch(_){const input=document.createElement('textarea');input.value=summary;input.style.cssText='position:fixed;opacity:0';document.body.appendChild(input);input.select();const ok=document.execCommand('copy');input.remove();copy.textContent=ok?'COPIED':'SELECT TEXT TO COPY';if(!ok){const selection=document.createElement('textarea');selection.value=summary;wrap.appendChild(selection);selection.focus();selection.select();}}};wrap.append(label,content,copy);a.prepend(wrap);}if(showDonation){const info=document.createElement('div');info.style.cssText='margin-top:10.5px;padding-top:9px;border-top:1px solid #59616b;font-size:11px;text-align:center';info.innerHTML='Enjoying Torn PDA Arcade? <a href="https://www.torn.com/profiles.php?XID=4539436" target="_blank" rel="noopener noreferrer" style="color:#e2c778">Donate to RelaxSweety [4539436]</a>';a.appendChild(info);}p.style.display='flex';
    }
    function launchGame(game){if(game.id==='stick-figure-fighter'){const savedStick=moduleStore.getItem('sffSavedGame');if(savedStick)promptBox('SAVED GAME','Continue your saved Stick Figure Fighter game?',[{label:'CONTINUE SAVED GAME',action:()=>{game.start();StickFighter.restore();}},{label:'START NEW GAME',action:()=>{moduleStore.removeItem('sffSavedGame');game.start();}},{label:'CANCEL',action:()=>{}}]);else game.start();return;}if(game.id!=='flight-arcade'){game.start();return;}const s=getGameSave(game.id);if(s)promptBox('SAVED GAME','Continue your saved '+game.name+' game?',[{label:'CONTINUE SAVED GAME',action:()=>restoreGame(s)},{label:'START NEW GAME',action:()=>{clearGameSave(game.id);game.start();}},{label:'CANCEL',action:()=>{}}]);else game.start();}
    function requestLeave(){if(!state.running||state.over){updateEngineSound(false);minimize();return;}state.paused=true;updateEngineSound(false);document.getElementById('tpfg-pause').textContent='RESUME';arcadeEndPrompt('flight-arcade',false);}
    function closeActiveGame(){transition=null;state.running=false;state.paused=true;updateEngineSound(false);cancelAnimationFrame(raf);document.getElementById('tpfg-root').style.display='none';}
    function openManager(){document.getElementById('tpfg-manager').style.display='flex';renderManager('games');}
    function renderManager(tab){
        const body=document.getElementById('tpfg-manager-body');
        document.getElementById('tpfg-tab-games')?.classList.toggle('tpfg-selected',tab==='games');
        document.getElementById('tpfg-tab-settings')?.classList.toggle('tpfg-selected',tab==='settings');
        if(tab==='games'){
            const games=Arcade.list().filter(g=>Arcade.available(g));
            body.innerHTML=games.length?games.map(g=>'<div class="tpfg-game-card"><b>'+g.name+'</b><span>Available now</span><button data-game="'+g.id+'">PLAY</button></div>').join(''):'<p class="tpfg-empty">No games are available in your current Torn situation.</p>';
            body.querySelectorAll('button[data-game]').forEach(btn=>btn.onclick=()=>{document.getElementById('tpfg-manager').style.display='none';Arcade.start(btn.dataset.game);});
        } else {
            body.innerHTML=Arcade.list().map(g=>{const mode=g.id==='flight-arcade'?launchMode():(moduleStore.getItem('tpfgMode:'+g.id)||'always');return '<div class="tpfg-game-card"><b>'+g.name+'</b><label><input type="checkbox" data-enable-game="'+g.id+'" '+(Arcade.enabled(g)?'checked':'')+'> Show in Game List</label><span>Availability</span><label><input type="radio" name="manager-mode-'+g.id+'" value="flight" '+(mode==='flight'?'checked':'')+'> Traveling</label><label><input type="radio" name="manager-mode-'+g.id+'" value="always" '+(mode==='always'?'checked':'')+'> Always</label><label><input type="radio" name="manager-mode-'+g.id+'" value="disabled" '+(mode==='disabled'?'checked':'')+'> Disabled</label></div>';}).join('');
            body.querySelectorAll('input[data-enable-game]').forEach(x=>x.onchange=()=>Arcade.setEnabled(Arcade.games.get(x.dataset.enableGame),x.checked));
            body.querySelectorAll('input[type="radio"]').forEach(r=>r.onchange=()=>{const id=r.name.replace('manager-mode-','');moduleStore.setItem(id==='flight-arcade'?LAUNCH_MODE_KEY:'tpfgMode:'+id,r.value);});
        }
    }

    function buildUI() {
        if (document.getElementById('tpfg-root')) return;
        // TU owns the only persistent launcher; no game-specific floating button.
        const root = document.createElement('div');
        root.id = 'tpfg-root';
        root.innerHTML = `
<div id="tpfg-shell">
  <div id="tpfg-top">
    <div id="tpfg-title"><span>TORN PDA FLIGHT GAME <small>v${GAME.version}</small></span><button class="tpfg-topbtn" id="tpfg-min" type="button">—</button></div>
    <div id="tpfg-condition">TORN STATUS: --</div>
        <div id="tpfg-stats">
      <div class="tpfg-stat">TIME<b id="tpfg-time">00:00</b></div>
      <div class="tpfg-stat">SCORE<b id="tpfg-score">0</b></div>
      <div class="tpfg-stat">HP<b id="tpfg-hp">100</b></div>
      <div class="tpfg-stat">HIGH<b id="tpfg-high">0</b></div>
    </div>
  </div>
  <div id="tpfg-stagewrap">
    <canvas id="tpfg-canvas"></canvas>
    <div id="tpfg-message"></div>
    <div id="tpfg-results">
      <div id="tpfg-results-card">
        <h2>TORN PDA FLIGHT GAME</h2>
                <div id="tpfg-result-grid">
          <div class="tpfg-result">SCORE<b id="tpfg-rscore">0</b></div>
          <div class="tpfg-result">KILLS<b id="tpfg-rkills">0</b></div>
          <div class="tpfg-result">GAME TIME<b id="tpfg-rtime">00:00</b></div>
          <div class="tpfg-result">HIGH SCORE<b id="tpfg-rhigh">0</b></div>
        </div>
        <div id="tpfg-sharetext"></div>
        <button class="tpfg-resultbtn" id="tpfg-share" type="button">SHARE RESULTS</button>
        <button class="tpfg-resultbtn" id="tpfg-restart" type="button">PLAY AGAIN</button>
        <button class="tpfg-resultbtn" id="tpfg-close" type="button">RETURN TO TORN</button>
        <div class="tpfg-donate"><b>Enjoying Torn PDA Flight Game?</b><br>Torn donations are appreciated.<br><a href="${GAME.creatorUrl}" target="_blank" rel="noopener noreferrer">RelaxSweety [4539436]</a></div><div id="tpfg-by">Created by <a href="${GAME.creatorUrl}">${GAME.creator} [${GAME.creatorId}]</a> · <a href="${GAME.discordUrl}">Discord</a></div>
      </div>
    </div>
  </div>
  <div id="tpfg-controls">
    <div id="tpfg-stick"><div id="tpfg-stick-label">SLIDE TO MOVE</div><div id="tpfg-stick-knob"></div></div>
    <div id="tpfg-actions">

      <div id="tpfg-audio"><span>VOL</span><input id="tpfg-volume" type="range" min="0" max="100" value="55"><button id="tpfg-mute" type="button">ON</button></div>
      <button id="tpfg-pause" type="button">PAUSE</button>
      <button id="tpfg-end" type="button">END GAME</button>
    </div>
  </div>
</div>`;
        const manager=document.createElement('div');manager.id='tpfg-manager';manager.style.display='none';manager.innerHTML='<div class="tpfg-settings-card"><h3>TORN PDA ARCADE</h3><div class="tpfg-manager-tabs"><button id="tpfg-tab-games">GAMES</button><button id="tpfg-tab-settings">SETTINGS</button></div><div id="tpfg-manager-body"></div><button class="tpfg-resultbtn" id="tpfg-manager-close">CLOSE</button></div>';document.body.appendChild(manager);
        const prompt=document.createElement('div');prompt.id='tpfg-prompt';prompt.style.display='none';prompt.innerHTML='<div class="tpfg-settings-card"><h3></h3><p></p><div id="tpfg-prompt-actions"></div></div>';document.body.appendChild(prompt);
        const gameSettings=document.createElement('div');gameSettings.id='tpfg-game-settings';gameSettings.style.display='none';gameSettings.innerHTML='<div class="tpfg-settings-card"><h3>GAME SETTINGS</h3><div class="tpfg-setting-row"><b>Flight Arcade</b><span>Enabled</span></div><label><input type="radio" name="tpfg-mode" value="flight"> Flight only</label><label><input type="radio" name="tpfg-mode" value="always"> Always available</label><label><input type="radio" name="tpfg-mode" value="disabled"> Disabled</label><p class="tpfg-settings-note">Additional Torn games can be added here as modules.</p><button class="tpfg-resultbtn" id="tpfg-settings-close">CLOSE</button></div>';document.body.appendChild(gameSettings);
        gameSettings.querySelectorAll('input[name="tpfg-mode"]').forEach(r=>{r.checked=(launchMode()===r.value);r.addEventListener('change',()=>moduleStore.setItem(LAUNCH_MODE_KEY,r.value));});
        document.getElementById('tpfg-settings-close').onclick=()=>gameSettings.style.display='none';
        document.getElementById('tpfg-manager-close').onclick=()=>manager.style.display='none';
        document.getElementById('tpfg-tab-games').onclick=()=>renderManager('games');
        document.getElementById('tpfg-tab-settings').onclick=()=>renderManager('settings');
        const picker=document.createElement('div');picker.id='tpfg-chatpick';picker.innerHTML='<div id="tpfg-chatcard"><b>Share Arcade Results</b><p>Select an open Torn chat. Results are inserted but not sent.</p><div id="tpfg-chatlist"></div><button class="tpfg-resultbtn" id="tpfg-copy">COPY RESULTS</button><button class="tpfg-resultbtn" id="tpfg-chatcancel">CANCEL</button></div>';document.body.appendChild(picker);
        document.body.appendChild(root);
        wireUI();
    }

    const state = {
        running:false, paused:false, over:false, score:0, kills:0, hp:100,
        activeMs:0, lastTs:0, spawnClock:0, shotClock:0, enemyShotClock:0,
        keys:{up:false,down:false,left:false,right:false,fire:false},
        stick:{x:0,y:0}, shareText:'',
        player:null, bullets:[], enemies:[], enemyBullets:[], particles:[]
    };

    let canvas, ctx, raf = 0, W = 0, H = 0;

    const AIRCRAFT_COUNT=8;
    const AUDIO_KEY='tpfgAudio';
    let audioCtx=null,engineOsc=null,engineGain=null;
    let audioPrefs=(()=>{try{return {...{volume:.55,muted:false},...JSON.parse(moduleStore.getItem(AUDIO_KEY)||'{}')}}catch(_){return {volume:.55,muted:false}}})();
    function saveAudio(){try{moduleStore.setItem(AUDIO_KEY,JSON.stringify(audioPrefs));}catch(_){}}
    function ensureAudio(){if(audioCtx)return audioCtx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;audioCtx=new AC();return audioCtx;}
    function tone(freq,dur,type='sine',gain=.12,endFreq=null){if(audioPrefs.muted||audioPrefs.volume<=0)return;const a=ensureAudio();if(!a)return;if(a.state==='suspended')a.resume();const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+dur);g.gain.setValueAtTime(Math.max(.0001,gain*audioPrefs.volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur);}
    function explosionSound(){tone(110,.28,'sawtooth',.18,38);tone(62,.34,'square',.08,28);}
    function healSound(){tone(520,.12,'sine',.10,760);setTimeout(()=>tone(760,.16,'sine',.08,1040),70);}
    function updateEngineSound(){if(engineOsc){try{engineOsc.stop();engineOsc.disconnect();}catch(_){}engineOsc=null;}if(engineGain){try{engineGain.disconnect();}catch(_){}engineGain=null;}}

    function resize() {
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(300, r.width); H = Math.max(200, r.height);
        canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
        ctx.setTransform(dpr,0,0,dpr,0,0);
        if (state.player) {
            state.player.x = Math.min(state.player.x, W-40);
            state.player.y = Math.min(state.player.y, H-30);
        }
    }

    let uiAbort=null;
    function wireUI() {
        uiAbort?.abort();uiAbort=new AbortController();
        canvas = document.getElementById('tpfg-canvas');
        ctx = canvas.getContext('2d');
                document.getElementById('tpfg-min').addEventListener('click', requestLeave);
        document.getElementById('tpfg-pause').addEventListener('click', togglePause);
        document.getElementById('tpfg-end').addEventListener('click', requestLeave);
        document.getElementById('tpfg-restart').addEventListener('click', startGame);
        document.getElementById('tpfg-close').addEventListener('click', minimize);
        document.getElementById('tpfg-share').addEventListener('click', showChatPicker);
        document.getElementById('tpfg-chatcancel').addEventListener('click',()=>document.getElementById('tpfg-chatpick').style.display='none');
        document.getElementById('tpfg-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.shareText);}catch(_){window.prompt('Copy results:',state.shareText);}});

        bindStick(document.getElementById('tpfg-stick'));
        const vol=document.getElementById('tpfg-volume'),mute=document.getElementById('tpfg-mute');vol.value=Math.round(audioPrefs.volume*100);mute.textContent=audioPrefs.muted?'OFF':'ON';vol.addEventListener('input',()=>{audioPrefs.volume=Number(vol.value)/100;saveAudio();});mute.addEventListener('click',()=>{audioPrefs.muted=!audioPrefs.muted;mute.textContent=audioPrefs.muted?'OFF':'ON';saveAudio();if(audioPrefs.muted)updateEngineSound(false);else ensureAudio();});

        window.addEventListener('resize', resize,{signal:uiAbort.signal});
        window.addEventListener('keydown', e => {
            if (!state.running) return;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault();
            keyFromEvent(e, true);
        }, {passive:false,signal:uiAbort.signal});
        window.addEventListener('keyup', e => keyFromEvent(e, false),{signal:uiAbort.signal});
    }

    function bindStick(stick) {
        const knob=document.getElementById('tpfg-stick-knob');
        let activeTouch=null,activePointer=null;
        const reset=()=>{activeTouch=null;activePointer=null;state.stick={x:0,y:0};knob.style.transform='translate(0,0)';};
        const move=(x,y)=>{
            if(!Number.isFinite(x)||!Number.isFinite(y))return;
            const r=stick.getBoundingClientRect(),max=r.width*.32;
            if(max<=0)return;
            let vx=x-r.left-r.width/2,vy=y-r.top-r.height/2;
            const dist=Math.hypot(vx,vy);
            if(dist>max){vx=vx/dist*max;vy=vy/dist*max;}
            state.stick={x:vx/max,y:vy/max};
            knob.style.transform='translate('+vx+'px,'+vy+'px)';
        };
        // Android WebView: use the original touch identifier so the held FIRE
        // finger can never take over when the movement thumb is replaced.
        stick.addEventListener('touchstart',e=>{
            e.preventDefault();
            if(activeTouch!==null)return;
            const t=Array.from(e.changedTouches).find(t=>t.target===stick||stick.contains(t.target));
            if(!t)return;
            activeTouch=t.identifier;move(t.clientX,t.clientY);
        },{passive:false});
        stick.addEventListener('touchmove',e=>{
            e.preventDefault();
            if(activeTouch===null)return;
            const t=Array.from(e.touches).find(t=>t.identifier===activeTouch);
            if(t)move(t.clientX,t.clientY);
        },{passive:false});
        const endTouch=e=>{
            if(activeTouch===null)return;
            if(Array.from(e.changedTouches).some(t=>t.identifier===activeTouch))reset();
        };
        stick.addEventListener('touchend',endTouch,{passive:false});
        stick.addEventListener('touchcancel',endTouch,{passive:false});
        // Mouse/stylus fallback; touch is exclusively handled above.
        stick.addEventListener('pointerdown',e=>{
            if(e.pointerType==='touch'||activeTouch!==null||activePointer!==null)return;
            if(e.pointerType==='mouse'&&e.button!==0)return;
            activePointer=e.pointerId;move(e.clientX,e.clientY);
            try{stick.setPointerCapture(e.pointerId);}catch(_){}
        });
        stick.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'&&activePointer===e.pointerId)move(e.clientX,e.clientY);});
        const endPointer=e=>{if(activePointer===e.pointerId)reset();};
        stick.addEventListener('pointerup',endPointer);
        stick.addEventListener('pointercancel',endPointer);
        stick.addEventListener('lostpointercapture',endPointer);
        window.addEventListener('blur',reset,{signal:uiAbort.signal});
    }

    function chatInputs(){return [...new Set([...document.querySelectorAll('textarea,[contenteditable="true"][role="textbox"],[contenteditable="true"][data-placeholder*="message" i],[contenteditable="true"][aria-label*="message" i]')])].filter(el=>!el.closest('#tpfg-root')&&!el.closest('#tpfg-chatpick')&&el.getBoundingClientRect().width>0);}
    function chatName(input,i){let el=input;for(let n=0;n<8&&el;n++,el=el.parentElement){const r=el.getBoundingClientRect();if(r.width>=200&&r.height>=120){const top=r.top+70;const candidates=[...el.querySelectorAll('[title],[aria-label],strong,b,h1,h2,h3,span')].filter(x=>{const q=x.getBoundingClientRect();return q.height>0&&q.top>=r.top-5&&q.top<top;}).map(x=>(x.getAttribute('title')||x.getAttribute('aria-label')||x.textContent||'').trim()).filter(x=>x.length>=2&&x.length<=40&&!/close|minimize|send|message|emoji|settings/i.test(x));if(candidates.length)return candidates[0];}}return 'Open Chat '+(i+1);}
    function insertChat(input,text){input.focus();if('value'in input){const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),'value');if(d&&d.set)d.set.call(input,text);else input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));return true;}input.textContent=text;input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));return true;}
    function showChatPicker(){const picker=document.getElementById('tpfg-chatpick'),list=document.getElementById('tpfg-chatlist');list.innerHTML='';const chats=chatInputs();if(!chats.length)list.innerHTML='<p>No open Torn chats detected. Open a chat and try again.</p>';chats.forEach((input,i)=>{const b=document.createElement('button');b.textContent=chatName(input,i);b.onclick=()=>{if(insertChat(input,state.shareText))picker.style.display='none';};list.appendChild(b);});picker.style.display='flex';}

    function bindHold(btn, key) {
        const on = e => { e.preventDefault(); state.keys[key]=true; btn.classList.add('on'); };
        const off = e => { if (e) e.preventDefault(); state.keys[key]=false; btn.classList.remove('on'); };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('pointerleave', off);
    }

    function keyFromEvent(e, down) {
        const k = e.key.toLowerCase();
        if (k==='arrowup'||k==='w') state.keys.up=down;
        if (k==='arrowdown'||k==='s') state.keys.down=down;
        if (k==='arrowleft'||k==='a') state.keys.left=down;
        if (k==='arrowright'||k==='d') state.keys.right=down;
        if (k===' ') state.keys.fire=down;
        if (down && (k==='p'||k==='escape')) togglePause();
    }

    function showGame(){document.getElementById('tpfg-root').style.display='block';document.getElementById('tpfg-results').style.display='none';document.getElementById('tpfg-message').textContent='';document.getElementById('tpfg-pause').textContent='PAUSE';document.getElementById('tpfg-high').textContent=Number(saved.highScore||0).toLocaleString();}
    async function startGame() {
        cancelAnimationFrame(raf);
        const flight = detectFlight();
        state.running=true; state.paused=false; state.over=false; conditionWasActive=detectCondition(); conditionPrompted=false;
        state.score=0; state.kills=0; state.hp=100; state.activeMs=0;
        state.lastTs=performance.now(); state.spawnClock=0; state.shotClock=0; state.enemyShotClock=0;
        state.keys={up:false,down:false,left:false,right:false,fire:false};
        state.stick={x:0,y:0};
        state.player={x:45,y:150,w:44,h:24,speed:270};shownStage=0;transition=null;
        state.bullets=[]; state.enemies=[]; state.enemyBullets=[]; state.particles=[]; state.healthDrops=[];
        showGame();
        setTimeout(resize, 0);
        updateHud();
        raf=requestAnimationFrame(loop);
    }

    function minimize(){if(state.running&&!state.over){requestLeave();return;}updateEngineSound(false);(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.closeActiveModule?.();if(!(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.closeActiveModule)document.getElementById('tpfg-root').style.display='none';}

    function togglePause() {
        if (!state.running || state.over) return;
        state.paused=!state.paused;
        updateEngineSound(false);
        state.lastTs=performance.now();
        document.getElementById('tpfg-pause').textContent=state.paused?'RESUME':'PAUSE';
        document.getElementById('tpfg-message').textContent=state.paused?'PAUSED':'';
    }

    let conditionWasActive=null,conditionPrompted=false,lastConditionCheck=0;
    function detectCondition(){
        const f=detectFlight();if(f.flying)return {type:'flight',active:true,remaining:f.remaining,label:'FLIGHT'};
        const text=(document.body?.innerText||'').replace(/\s+/g,' ');
        let m=text.match(/(?:Hospital|Hospitalized).*?(\d{1,2}:\d{2}:\d{2})/i);if(m)return {type:'hospital',active:true,remaining:m[1],label:'HOSPITAL'};
        m=text.match(/(?:Jail|Jailed).*?(\d{1,2}:\d{2}:\d{2})/i);if(m)return {type:'jail',active:true,remaining:m[1],label:'JAIL'};
        return {type:null,active:false,remaining:'',label:'TORN'};
    }
    function monitorCondition(ts){
        if(ts-lastConditionCheck<500)return;lastConditionCheck=ts;const q=detectCondition();const el=document.getElementById('tpfg-condition');if(el)el.textContent=q.active?q.label+' REMAINING: '+q.remaining:'TORN STATUS: FREE';
        if(conditionWasActive&&conditionWasActive.active&&!q.active&&!conditionPrompted){conditionPrompted=true;state.paused=true;const type=conditionWasActive.type;const msg=type==='flight'?'Your flight has ended.':type==='jail'?'You have been released from jail.':'You have been released from the hospital.';promptBox(type==='flight'?'FLIGHT ENDED':type==='jail'?'RELEASED FROM JAIL':'RELEASED FROM HOSPITAL',msg+' Would you like to continue playing or leave the game?',[{label:'CONTINUE',action:()=>{state.paused=false;state.lastTs=performance.now();}},{label:'LEAVE GAME',action:requestLeave}]);}
        if(q.active)conditionWasActive=q;
    }
    function loop(ts) {
        if (!state.running) return;
        monitorCondition(ts);
        let dt=Math.min((ts-state.lastTs)/1000, .05);
        state.lastTs=ts;
        if (!state.paused && !state.over) {
            if(transition){advanceAircraftTransition(dt);draw();updateHud();raf=requestAnimationFrame(loop);return;}
            state.activeMs += dt*1000;
            update(dt);
            if(!state.over&&!transition&&aircraftStage()!==shownStage)startAircraftTransition(aircraftStage());
            draw();
            updateHud();
        } else draw();
        raf=requestAnimationFrame(loop);
    }

    function update(dt) {
        const p=state.player;
        let dx=(state.keys.right?1:0)-(state.keys.left?1:0);
        let dy=(state.keys.down?1:0)-(state.keys.up?1:0);
        if(Math.abs(state.stick.x)>.04||Math.abs(state.stick.y)>.04){dx=state.stick.x;dy=state.stick.y;}
        const mag=Math.max(1,Math.hypot(dx,dy));
        p.x=Math.max(4,Math.min(W-p.w-4,p.x+dx/mag*p.speed*dt));
        p.y=Math.max(4,Math.min(H-p.h-4,p.y+dy/mag*p.speed*dt));
        // Continuous engine audio removed.

        state.shotClock-=dt;
        if (state.shotClock<=0) {
            state.bullets.push({x:p.x+p.w,y:p.y+p.h*.5,vx:510,r:3});
            state.shotClock=.14;
        }

        const seconds=state.activeMs/1000;
        const difficulty=1+Math.min(seconds/150,1.5);
        state.spawnClock-=dt;
        if (state.spawnClock<=0) {
            spawnEnemy(difficulty);
            state.spawnClock=Math.max(.35,1.15/difficulty)*(0.75+Math.random()*.55);
        }

        state.enemyShotClock-=dt;
        if (state.enemyShotClock<=0 && state.enemies.length) {
            const shooters=state.enemies.filter(e=>e.x<W-25);
            if (shooters.length) {
                const e=shooters[(Math.random()*shooters.length)|0];
                const px=p.x+p.w/2, py=p.y+p.h/2;
                const ex=e.x, ey=e.y+e.h/2;
                const a=Math.atan2(py-ey,px-ex);
                const sp=145+45*difficulty;
                state.enemyBullets.push({x:ex,y:ey,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:4});
            }
            state.enemyShotClock=Math.max(.5,1.35/difficulty);
        }

        state.bullets.forEach(b=>b.x+=b.vx*dt);
        state.enemyBullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;});
        state.enemies.forEach(e=>e.x-=e.speed*dt);
        state.healthDrops.forEach(h=>h.x-=h.speed*dt);
        state.particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;});

        for (let bi=state.bullets.length-1;bi>=0;bi--) {
            const b=state.bullets[bi];
            if (b.x>W+20) {state.bullets.splice(bi,1);continue;}
            for (let ei=state.enemies.length-1;ei>=0;ei--) {
                const e=state.enemies[ei];
                if (circleRect(b,e)) {
                    state.bullets.splice(bi,1); e.hp--;
                    if (e.hp<=0) {
                        explode(e.x+e.w/2,e.y+e.h/2); explosionSound();
                        state.score+=e.tough?300:120; state.kills++;

                        state.healthDrops.push({x:e.x+e.w/2-8,y:e.y+e.h/2-8,w:18,h:18,speed:55});
                        state.enemies.splice(ei,1);
                    }
                    break;
                }
            }
        }

        for (let i=state.enemyBullets.length-1;i>=0;i--) {
            const b=state.enemyBullets[i];
            if (b.x<-20||b.y<-20||b.y>H+20) {state.enemyBullets.splice(i,1);continue;}
            if (circleRect(b,p)) {
                state.enemyBullets.splice(i,1);
                damage(10);
            }
        }

        for (let i=state.enemies.length-1;i>=0;i--) {
            const e=state.enemies[i];
            if (e.x+e.w<0) {explode(8,e.y+e.h/2,18); explosionSound();state.enemies.splice(i,1);damage(e.tough?30:20);continue;}
            if (rectHit(e,p)) {
                state.enemies.splice(i,1);
                explode(e.x+e.w/2,e.y+e.h/2);
                damage(e.tough?30:20);
            }
        }

        for(let i=state.healthDrops.length-1;i>=0;i--){const h=state.healthDrops[i];if(h.x+h.w<0){state.healthDrops.splice(i,1);continue;}if(rectHit(h,p)){if(state.hp>=100)state.score+=100;else state.hp=Math.min(100,state.hp+10);state.healthDrops.splice(i,1);explode(p.x+p.w/2,p.y+p.h/2,8);healSound();}}
        state.particles=state.particles.filter(q=>q.life>0);
        state.score += 8*dt;
        if (state.hp<=0) finishGame(false);
    }

    function spawnEnemy(difficulty) {
        const tough=Math.random()<Math.min(.12+(difficulty-1)*.1,.32);
        const h=tough?34:25, w=tough?52:40;
        state.enemies.push({
            x:W+10,y:10+Math.random()*Math.max(10,H-h-20),w,h,
            hp:tough?3:1,tough,speed:(95+Math.random()*65)*difficulty
        });
    }

    function damage(n) {
        state.hp=Math.max(0,state.hp-n);
        explode(state.player.x+20,state.player.y+12,7);
    }

    function explode(x,y,n=14) {
        for(let i=0;i<n;i++) {
            const a=Math.random()*Math.PI*2, s=35+Math.random()*120;
            state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.45});
        }
    }

    function circleRect(c,r) {
        const x=Math.max(r.x,Math.min(c.x,r.x+r.w)), y=Math.max(r.y,Math.min(c.y,r.y+r.h));
        return (c.x-x)**2+(c.y-y)**2<c.r**2;
    }
    function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

    function aircraftStage(){return Math.floor(Math.max(0,state.score)/5000)%AIRCRAFT_COUNT;}
    // Transition phases: old aircraft exits right, new aircraft enters from left.
    const TRANSITION_SECONDS=1.4;
    let transition=null,shownStage=0;
    function startAircraftTransition(nextStage){
        if(!state.player)return;
        transition={elapsed:0,from:shownStage,to:nextStage,x:state.player.x,y:state.player.y};
        updateEngineSound(false);
    }
    function advanceAircraftTransition(dt){
        if(!transition)return;
        transition.elapsed=Math.min(TRANSITION_SECONDS,transition.elapsed+dt);
        if(transition.elapsed>=TRANSITION_SECONDS){shownStage=transition.to;transition=null;}
    }
    function drawAircraft(x,y,w,h,design,enemy=false,tough=false){
        ctx.save();ctx.translate(x,y);if(enemy){ctx.translate(w,0);ctx.scale(-1,1);}
        const paint=['#d8dde2','#313c50','#00c8ed','#7c8a68','#a3a6ae','#b77b42','#e6bd43','#e8e8e8'];
        const trims=['#6fa8d8','#8d71e6','#ff4bd8','#d95444','#f0e5c1','#48d68a','#191919','#ff4d4d'];
        const body=enemy?(tough?'#7d858d':'#626b74'):paint[design%AIRCRAFT_COUNT],accent=enemy?'#c4544c':trims[design%AIRCRAFT_COUNT],dark=enemy?'#343b42':'#18202a';
        ctx.fillStyle=body;ctx.strokeStyle=dark;ctx.lineWidth=1;
        const cy=h/2;
        if(design===0){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.58,h*.30);ctx.lineTo(w*.38,0);ctx.lineTo(w*.30,h*.34);ctx.lineTo(0,h*.18);ctx.lineTo(w*.14,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.30,h*.66);ctx.lineTo(w*.38,h);ctx.lineTo(w*.58,h*.70);ctx.closePath();}
        else if(design===1){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.48,.08*h);ctx.lineTo(w*.18,0);ctx.lineTo(w*.28,h*.38);ctx.lineTo(0,h*.18);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.28,h*.62);ctx.lineTo(w*.18,h);ctx.lineTo(w*.48,.92*h);ctx.closePath();}
        else if(design===2){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.55,.22*h);ctx.lineTo(w*.30,0);ctx.lineTo(w*.22,h*.32);ctx.lineTo(0,h*.12);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.88);ctx.lineTo(w*.22,h*.68);ctx.lineTo(w*.30,h);ctx.lineTo(w*.55,.78*h);ctx.closePath();}
        else if(design===3){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.60,h*.36);ctx.lineTo(w*.48,0);ctx.lineTo(w*.35,h*.36);ctx.lineTo(0,h*.28);ctx.lineTo(0,h*.72);ctx.lineTo(w*.35,h*.64);ctx.lineTo(w*.48,h);ctx.lineTo(w*.60,h*.64);ctx.closePath();}
        else if(design===4){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.55,h*.38);ctx.lineTo(w*.42,0);ctx.lineTo(w*.32,h*.38);ctx.lineTo(0,h*.24);ctx.lineTo(w*.10,cy);ctx.lineTo(0,h*.76);ctx.lineTo(w*.32,h*.62);ctx.lineTo(w*.42,h);ctx.lineTo(w*.55,h*.62);ctx.closePath();}
        else if(design===5){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.62,h*.26);ctx.lineTo(w*.42,.08*h);ctx.lineTo(w*.32,h*.34);ctx.lineTo(0,0);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h);ctx.lineTo(w*.32,h*.66);ctx.lineTo(w*.42,.92*h);ctx.lineTo(w*.62,.74*h);ctx.closePath();}
        else if(design===6){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.58,h*.20);ctx.lineTo(w*.28,0);ctx.lineTo(w*.24,h*.36);ctx.lineTo(0,h*.18);ctx.lineTo(w*.10,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.24,h*.64);ctx.lineTo(w*.28,h);ctx.lineTo(w*.58,h*.80);ctx.closePath();}
        else {ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.52,h*.30);ctx.lineTo(w*.34,h*.08);ctx.lineTo(w*.28,h*.38);ctx.lineTo(0,h*.24);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.76);ctx.lineTo(w*.28,h*.62);ctx.lineTo(w*.34,h*.92);ctx.lineTo(w*.52,h*.70);ctx.closePath();}
        ctx.fill();ctx.stroke();
        if(!enemy){ctx.save();ctx.globalAlpha=.85;ctx.fillStyle=accent;ctx.fillRect(w*.18,h*.40,w*.25,h*.20);ctx.restore();}
        ctx.fillStyle=accent;ctx.beginPath();ctx.ellipse(w*.62,cy,w*.13,Math.max(2,h*.12),0,0,Math.PI*2);ctx.fill();
        if(design===2||design===3||design===6){ctx.fillStyle=dark;ctx.fillRect(w*.08,h*.18,w*.10,h*.18);ctx.fillRect(w*.08,h*.64,w*.10,h*.18);}
        if(design===4){ctx.strokeStyle='#d7d7d7';ctx.beginPath();ctx.moveTo(w*.70,cy-h*.32);ctx.lineTo(w*.70,cy+h*.32);ctx.stroke();}
        ctx.restore();
    }
    function draw() {
        if (!ctx) return;
        ctx.clearRect(0,0,W,H);
        const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#071525');g.addColorStop(1,'#101820');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
        ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;for(let i=0;i<18;i++){const y=(i*47+(state.activeMs*.025))%H,x=(i*83)%W;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+16,y);ctx.stroke();}
        const stage=shownStage,enemyDesign=(stage+1)%AIRCRAFT_COUNT,p=state.player;
        ctx.fillStyle='#d8dde2';ctx.font='bold 12px sans-serif';ctx.fillText('AIRCRAFT '+(transition?transition.to+1:stage+1)+' / '+AIRCRAFT_COUNT,12,18);
        if(p){
            if(transition){
                const t=transition.elapsed/TRANSITION_SECONDS;
                const x=t<.5?transition.x+(W+80-transition.x)*(t/.5):(-p.w-12)+(transition.x+p.w+12)*((t-.5)/.5);
                drawAircraft(x,transition.y,p.w,p.h,t<.5?transition.from:transition.to,false,false);
            }else drawAircraft(p.x,p.y,p.w,p.h,stage,false,false);
        }
        state.bullets.forEach(b=>{ctx.fillStyle='#f5e8a8';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();});
        state.enemyBullets.forEach(b=>{ctx.fillStyle='#e46a5e';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();});
        state.healthDrops.forEach(h=>{ctx.save();ctx.translate(h.x,h.y);ctx.fillStyle='#49c86b';ctx.fillRect(0,0,h.w,h.h);ctx.fillStyle='#fff';ctx.fillRect(7,3,4,12);ctx.fillRect(3,7,12,4);ctx.restore();});
        state.enemies.forEach(e=>drawAircraft(e.x,e.y,e.w,e.h,enemyDesign,true,e.tough));
        state.particles.forEach(q=>{ctx.globalAlpha=Math.max(0,q.life/.7);ctx.fillStyle='#e3a34c';ctx.fillRect(q.x,q.y,3,3);ctx.globalAlpha=1;});
    }

    function updateHud() {
        document.getElementById('tpfg-time').textContent=formatTime(state.activeMs);
        document.getElementById('tpfg-score').textContent=Math.floor(state.score).toLocaleString();
        document.getElementById('tpfg-hp').textContent=Math.max(0,Math.ceil(state.hp));
        const stageLabel=document.getElementById('tpfg-aircraft-stage');if(stageLabel)stageLabel.textContent='AIRCRAFT '+(shownStage+1)+' / '+AIRCRAFT_COUNT;
    }

    function formatTime(ms) {
        const s=Math.floor(ms/1000);
        return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    }

    async function finishGame(manual) {
        if (!state.running || state.over) return;
        state.over=true; state.paused=true; transition=null; updateEngineSound(false);
        clearGameSave('flight-arcade');
        const score=Math.floor(state.score);
        saved.highScore=Math.max(Number(saved.highScore||0),score);
        saved.bestKills=Math.max(Number(saved.bestKills||0),state.kills);
        saved.games=Number(saved.games||0)+1;
        await storageSet(saved);

        const now=new Date();
        const stamp=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})+' - '+now.toLocaleDateString();
        const share=`Achieved a Torn PDA Arcade Flight Arcade score of ${score.toLocaleString()}.`;
        document.getElementById('tpfg-rscore').textContent=score.toLocaleString();
        document.getElementById('tpfg-rkills').textContent=state.kills.toLocaleString();
        document.getElementById('tpfg-rtime').textContent=formatTime(state.activeMs);
        document.getElementById('tpfg-rhigh').textContent=Number(saved.highScore).toLocaleString();
        document.getElementById('tpfg-high').textContent=Number(saved.highScore).toLocaleString();
        state.shareText=`${stamp} ${share.replace(/\n/g,' ') } Game Time: ${formatTime(state.activeMs)} | Kills: ${state.kills} | High Score: ${Number(saved.highScore).toLocaleString()}`;
        document.getElementById('tpfg-sharetext').textContent=state.shareText;
        document.getElementById('tpfg-results').style.display='block';
        document.getElementById('tpfg-message').textContent=manual?'GAME ENDED':'';if(!manual)arcadeEndPrompt('flight-arcade',true);
    }

    async function init() {
        injectStyle();
        const existing=await storageGet();
        if (existing && typeof existing==='object') saved={...saved,...existing};
        buildUI();
    }

    let initialized=false;
    async function ensureInitialized(){if(!initialized){await init();initialized=true;}}
    let activationEpoch=0;
    async function activateFlight(){const epoch=++activationEpoch;await ensureInitialized();if(epoch!==activationEpoch||!(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.isActive?.('flight-game'))return;launchGame(Arcade.games.get('flight-arcade'));}
    async function activateStick(){await ensureInitialized();launchGame(Arcade.games.get('stick-figure-fighter'));}
    function deactivateFromTU(){
      ++activationEpoch;
      uiAbort?.abort();uiAbort=null;
      StickFighter.stop();closeActiveGame();
      for(const id of ['tpfg-manager','tpfg-prompt','tpfg-game-settings','tpfg-root','tpfg-chatpick'])document.getElementById(id)?.remove();
      canvas=null;ctx=null;initialized=false;
    }
    const definitions=[{id:'flight-game',version:TU_MODULE_VERSION,activate:activateFlight,deactivate:deactivateFromTU}];
    function registerTU(){if((typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register)for(const definition of definitions)(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities.register(definition);}
    window.addEventListener('torn-utilities-ready',registerTU);registerTU();
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="flight-game";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"flight-game",version:"0.12.8",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: stick-fighter (0.2.7) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="stick-fighter")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="stick-fighter"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.2.7"}};



/*
 * TORN PDA ARCADE - RELEASE NOTES
 * v0.10.7 - Touch-identifier joystick tracking, reliable score-driven aircraft styling, and 100-point full-health pickups.
 * v0.10.6 - Fixed multitouch joystick pointer ownership and reset on release or lost capture.
 * v0.10.5 - Removed continuous engine audio and corrected aircraft transitions on score awards.
 * v0.10.4 - Changed aircraft progression to 5,000-point stages with exit-right and reenter-left transformation animation.
 * v0.10.3 - Ensured engine audio stops immediately on pause, leave prompts, game over, minimize, and exit.
 * v0.10.2 - Reduced aircraft engine/movement sound volume while preserving effects volume.
 * v0.10.1 - Fixed literal escaped-newline parse errors introduced by the v0.10.0 aircraft/audio build.
 * v0.10.0 - Added 8-stage aircraft progression, faster maneuvering, and volume-controlled movement/explosion/healing audio.
 * v0.9.3 - Fixed two literal escape sequences that caused a fatal JavaScript parse error and prevented the Arcade launcher from loading.
 * v0.9.2 - Fixed fatal initialization syntax error that prevented the userscript and launcher from loading.
 * v0.9.1 - Fixed launcher initialization regression that could prevent the Arcade icon from appearing.
 * v0.9.0 - Added condition timers/end prompts plus save-and-resume for unfinished games.
 * v0.8.0 - Added per-game Show in Game List setting and persistent visibility preferences.
 * v0.7.0 - Added modular Arcade registry; Flight Arcade became a registered module.
 * v0.6.0 - Added selected-tab highlighting, escaped-enemy damage, and +10 health pickups.
 * v0.5.0 - Added crosshair Game Manager, Games/Settings tabs, and removed displayed flight status.
 * v0.4.0 - Added availability modes, strict flight detection, and draggable launcher persistence.
 * v0.3.0 - Added analog controls, chat sharing, donation link, and auto-update metadata.
 * v0.2.5 - Improved flight detection, mobile controls/layout, and update support.
 * v0.1.0 - Initial release.
 */

(() => {
    'use strict';
  const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.2.5';
    // TU v0.3 storage bridge. Existing legacy keys remain readable and are migrated
    // on first access; modules continue to work if TU loads later or is absent.
    const TU_NAMESPACE = 'stick-fighter';
    const legacyStore = window.localStorage;
    const tuStorage = () => (typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.storage;
    const moduleStore = {
        getItem(key) {
            const name = String(key);
            const tu = tuStorage();
            if (tu) {
                try {
                    const value = tu.get(TU_NAMESPACE, name, null);
                    if (typeof value === 'string') return value;
                } catch (_) {}
            }
            const old = legacyStore.getItem(name);
            if (old !== null && tu) {
                try { tu.set(TU_NAMESPACE, name, old); } catch (_) {}
            }
            return old;
        },
        setItem(key, value) {
            const name = String(key), text = String(value);
            const tu = tuStorage();
            if (tu) {
                // Preserve existing legacy data until the shared write succeeds.
                tu.set(TU_NAMESPACE, name, text);
            } else {
                legacyStore.setItem(name, text);
            }
        },
        removeItem(key) {
            const name = String(key);
            const tu = tuStorage();
            if (tu) tu.remove(TU_NAMESPACE, name);
            legacyStore.removeItem(name);
        }
    };


    if (window.__TU_STICK_GAME__) return;
    window.__TU_STICK_GAME__ = true;

    const GAME = {
        name: 'Torn PDA Flight Game',
        version: '0.10.8',
        creator: 'RelaxSweety',
        creatorId: '4539436',
        creatorUrl: 'https://www.torn.com/profiles.php?XID=4539436',
        discordUrl: 'https://discord.com/users/relaxsweety'
    };

    const STORE_KEY = 'tornPdaFlightGame';
    const LAUNCH_MODE_KEY = 'tpfgLaunchMode';
    const LAUNCH_POS_KEY = 'tpfgLaunchPosition';
    const SAVE_PREFIX = 'tpfgGameSave:';
    const launchMode = () => 'always';
    let saved = { highScore: 0, bestKills: 0, games: 0 };

    async function storageGet() {
        try {
            if (typeof PDA_storage !== 'undefined' && PDA_storage && typeof PDA_storage.get === 'function') {
                const v = await PDA_storage.get(STORE_KEY);
                if (v) return typeof v === 'string' ? JSON.parse(v) : v;
            }
        } catch (_) {}
        try {
            return JSON.parse(moduleStore.getItem(STORE_KEY) || 'null');
        } catch (_) { return null; }
    }

    async function storageSet(value) {
        try {
            if (typeof PDA_storage !== 'undefined' && PDA_storage && typeof PDA_storage.set === 'function') {
                await PDA_storage.set(STORE_KEY, JSON.stringify(value));
                return;
            }
        } catch (_) {}
        try { moduleStore.setItem(STORE_KEY, JSON.stringify(value)); } catch (_) {}
    }

    function injectStyle() {
        if (document.getElementById('tpfg-style')) return;
        const s = document.createElement('style');
        s.id = 'tpfg-style';
        s.textContent = `
#tpfg-launcher{position:fixed;right:12px;bottom:88px;z-index:2147483000;width:42px;height:42px;border:1px solid #777;background:#171717;color:#eee;border-radius:50%;font-size:17.25px;font-weight:800;touch-action:none;box-shadow:0 2px 8px #0008}
#tpfg-manager,#tpfg-game-settings,#tpfg-prompt{position:fixed;inset:0;z-index:2147483800;background:#000b;display:none;align-items:center;justify-content:center;padding:12px}
.tpfg-settings-card{width:min(420px,100%);background:#151a20;border:1px solid #59616b;border-radius:12px;padding:12px;color:#fff;font-family:Arial,sans-serif}
.tpfg-settings-card label{display:block;padding:9px 3px;border-top:1px solid #343a40}.tpfg-manager-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:9px 0}.tpfg-manager-tabs button,.tpfg-game-card button{min-height:42px;border:1px solid #59616b;border-radius:8px;background:#252c34;color:#fff;font-weight:800}.tpfg-manager-tabs button.tpfg-selected{background:#596674;border-color:#aeb8c2;box-shadow:inset 0 0 0 1px #d7dde3}.tpfg-game-card{display:grid;gap:6px;padding:9px;border:1px solid #343a40;border-radius:9px}.tpfg-game-card span,.tpfg-empty{color:#9da6af;font-size:11px}.tpfg-setting-row{display:flex;justify-content:space-between;padding:6px 3px}.tpfg-settings-note{color:#9da6af;font-size:11px}
#tpfg-launch{position:fixed;right:10px;bottom:88px;z-index:2147483000;border:1px solid #777;background:#171717;color:#eee;border-radius:10px;padding:7.5px 9.75px;font:700 11px Arial,sans-serif;box-shadow:0 2px 8px #0008;touch-action:manipulation}
#tpfg-launch:active{transform:scale(.97)}
#tpfg-root{position:fixed;inset:0;z-index:2147483600;background:#090b0e;color:#fff;font-family:Arial,sans-serif;display:none;overscroll-behavior:none;touch-action:none}
#tpfg-root *{box-sizing:border-box}
#tpfg-shell{height:100%;display:flex;flex-direction:column;max-width:900px;margin:0 auto;background:#0d1117}
#tpfg-top{flex:0 0 auto;padding:6px 7.5px;background:#151a20;border-bottom:1px solid #343a40}
#tpfg-title{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:800}
#tpfg-condition{font-size:11px;color:#aeb6bf;margin-top:2.25px;font-weight:700}
.tpfg-topbtn{border:1px solid #555;background:#242a31;color:#fff;border-radius:7px;min-width:42px;min-height:34px;font-weight:800}
#tpfg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:3.75px;margin-top:5.25px}
.tpfg-stat{background:#090c10;border:1px solid #30363d;border-radius:6px;text-align:center;padding:3px 1.5px;font-size:11px;color:#9da7b1}
.tpfg-stat b{display:block;color:#fff;font-size:11px;margin-top:1.5px}
#tpfg-stagewrap{position:relative;flex:1 1 auto;min-height:220px;overflow:hidden;background:#05080d}
#tpfg-canvas{width:100%;height:100%;display:block}
#tpfg-message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:15px;pointer-events:none;font-weight:800;text-shadow:0 2px 4px #000}
#tpfg-controls{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr;gap:7.5px;padding:6.75px 9px 9px;background:#11161c;border-top:1px solid #343a40;user-select:none;-webkit-user-select:none}
#tpfg-stick{position:relative;width:150px;height:150px;margin:auto;border:1px solid #58616b;border-radius:50%;background:#1b222a;touch-action:none}
#tpfg-stick-knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-21.75px;border:1px solid #8b949e;border-radius:50%;background:#39424c;pointer-events:none}
#tpfg-stick-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8b949e;font-size:11px;pointer-events:none}
#tpfg-chatpick{position:fixed;inset:0;z-index:2147483700;background:#000b;display:none;align-items:center;justify-content:center;padding:12px}#tpfg-chatcard{width:min(440px,100%);max-height:80vh;overflow:auto;background:#151a20;border:1px solid #59616b;border-radius:12px;padding:10.5px}#tpfg-chatlist button{width:100%;min-height:44px;margin:3.75px 0;background:#252c34;color:#fff;border:1px solid #59616b;border-radius:8px}.tpfg-donate{margin-top:12px;padding-top:9px;border-top:1px solid #3a424b;font-size:11px;line-height:1.6;color:#aeb6bf}.tpfg-donate a{color:#ffd75a;font-weight:800}
#tpfg-fire{border:1px solid #58616b;background:#252c34;color:#fff;font-weight:900;border-radius:12px;touch-action:none}
#tpfg-fire.on{background:#555f6b;transform:scale(.96)}

#tpfg-actions{display:flex;flex-direction:column;justify-content:center;gap:6px}
#tpfg-audio{display:grid;grid-template-columns:auto 1fr auto;gap:4.5px;align-items:center;font:700 11px Arial,sans-serif;color:#aeb6bf}#tpfg-volume{width:100%;accent-color:#8b949e}#tpfg-mute{min-height:28px;border:1px solid #555;border-radius:7px;background:#242a31;color:#fff;font-weight:800}
#tpfg-fire{min-height:82px;font-size:15px}
#tpfg-pause,#tpfg-end{min-height:40px;border:1px solid #555;border-radius:9px;background:#242a31;color:#fff;font-weight:800}
#tpfg-results{position:absolute;inset:0;background:#0d1117;z-index:3;display:none;overflow:auto;padding:16.5px}
#tpfg-results-card{max-width:520px;margin:15px auto;background:#151a20;border:1px solid #3a424b;border-radius:14px;padding:13.5px;text-align:center}
#tpfg-results h2{margin:0 0 6px;font-size:15px}
#tpfg-results-route{color:#b8c0c8;margin-bottom:12px}
#tpfg-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tpfg-result{background:#0b0e12;border-radius:8px;padding:7.5px;color:#aab2ba;font-size:11px}
.tpfg-result b{display:block;color:#fff;font-size:15px;margin-top:2.25px}
#tpfg-sharetext{white-space:pre-wrap;background:#090c10;border:1px solid #30363d;border-radius:8px;text-align:left;padding:7.5px;margin-top:9px;font-size:11px;color:#d6dbe0}
.tpfg-resultbtn{width:100%;min-height:46px;margin-top:6.75px;border:1px solid #59616b;border-radius:9px;background:#252c34;color:#fff;font-weight:800}
#tpfg-by{margin-top:9.75px;font-size:11px;color:#7f8993}
#tpfg-by a{color:#b9c1c9}
@media(max-width:380px){#tpfg-stats{grid-template-columns:repeat(2,1fr)}#tpfg-controls{padding-left:4.5px;padding-right:4.5px;gap:3px}#tpfg-stick{width:132px;height:132px}}
`;
        document.head.appendChild(s);
    }

    function detectFlight() {
        // Torn's travel card is authoritative. Do not infer flight state from generic page words.
        const nodes=[...document.querySelectorAll('body *')];
        const re=/([A-Za-z][A-Za-z .'-]{1,35}?)\s+to\s+([A-Za-z][A-Za-z .'-]{1,35}?)\.\s*Remaining Flight Time\s*-\s*(\d{1,2}:\d{2}:\d{2})/i;
        for (const el of nodes) {
            if (el.children.length) continue;
            const t=(el.textContent||'').replace(/\s+/g,' ').trim();
            const m=t.match(re);
            if(m) return {flying:true,origin:m[1].trim(),destination:m[2].trim(),remaining:m[3]};
        }
        const text=(document.body?.innerText||'').replace(/\s+/g,' ');
        const m=text.match(re);
        return m ? {flying:true,origin:m[1].trim(),destination:m[2].trim(),remaining:m[3]} :
                   {flying:false,origin:'Unknown',destination:'Unknown',remaining:''};
    }

    // Arcade core: games register here; production remains a single bundled userscript.
    const Arcade = {
        games:new Map(),
        registerGame(game){if(!game?.id||typeof game.start!=='function')throw new Error('Invalid arcade game module');this.games.set(game.id,game);return game;},
        list(){return [...this.games.values()].filter(g=>g.id==='stick-figure-fighter');},
        enabled(game){return moduleStore.getItem('tpfgGameEnabled:'+game.id)!=='false';},
        setEnabled(game,value){moduleStore.setItem('tpfgGameEnabled:'+game.id,value?'true':'false');},
        available(game){return game.isAvailable?game.isAvailable():true;},
        start(id){const game=this.games.get(id);if(game&&this.available(game))launchGame(game);}
    };
    const FlightArcade = Arcade.registerGame({
        id:'flight-arcade',name:'Flight Arcade',version:'1.0.0',
        isAvailable(){return true;},
        start(){startGame();},pause(){if(state.running&&!state.paused)togglePause();},resume(){if(state.running&&state.paused)togglePause();},stop(){if(state.running&&!state.over)requestLeave();}
    });

    // Stick Figure Fighter: self-contained arcade module.
    const StickFighter = (() => {
        let host=null, canvas=null, ctx=null, frame=0, last=0, active=false, weaponDropClock=0, keys=new Set(), joystick={x:0,y:0}, player, enemies, pickups, shots, score, elapsed, spawn, attack, weapon, pointer=null, aimPointer=null, aimStick={x:0,y:0}, swing=0, aim=0, paused=false, deathPrompted=false;
        const W=360,H=600, names=['Knife','Bat','Sword','Shotgun','Dual Pistols','Chain Gun'];
        const rand=(a,b)=>a+Math.random()*(b-a);
        const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
        function randomWeaponDrop(){const choices=names.map((_,i)=>i).filter(i=>i!==weapon);return choices[Math.floor(Math.random()*choices.length)];}
        function reset(){weaponDropClock=0;player={x:W/2,y:H/2,hp:100};enemies=[];pickups=[];shots=[];score=0;elapsed=0;spawn=0;attack=0;weapon=0;swing=0;aim=0;paused=false;deathPrompted=false;aimPointer=null;aimStick={x:0,y:0};last=performance.now();}
        function stick(x,y,color){ctx.strokeStyle=color;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y-15,8,0,Math.PI*2);ctx.moveTo(x,y-7);ctx.lineTo(x,y+18);ctx.moveTo(x-12,y+5);ctx.lineTo(x+12,y+5);ctx.moveTo(x,y+18);ctx.lineTo(x-11,y+34);ctx.moveTo(x,y+18);ctx.lineTo(x+11,y+34);ctx.stroke();}
        function draw(){
            ctx.fillStyle='#11151b';ctx.fillRect(0,0,W,H);
            ctx.strokeStyle='#27313b';ctx.lineWidth=1;
            for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
            for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
            for(const p of pickups){if(p.type==='weapon'){ctx.strokeStyle='#ffda63';ctx.lineWidth=2;ctx.strokeRect(p.x-17,p.y-15,34,30);}ctx.fillStyle=p.type==='health'?'#48d16a':'#e4c35c';ctx.fillRect(p.x-(p.weapon===5?13:9),p.y-9,p.weapon===5?26:18,18);ctx.fillStyle='#101010';ctx.font='bold 14px sans-serif';ctx.fillText(p.type==='health'?'+':['K','B','S','G','P','CG'][p.weapon],p.x-6,p.y+5);}
            for(const e of enemies)stick(e.x,e.y,'#e64d54');
            for(const s of shots){ctx.fillStyle='#ffd35b';ctx.beginPath();ctx.arc(s.x,s.y,3,0,7);ctx.fill();}
            stick(player.x,player.y,'#55e879');
            // Visible equipped weapon and animated melee strike.
            ctx.save();ctx.translate(player.x,player.y+5);ctx.rotate(aim);
            ctx.strokeStyle=weapon===0?'#e9edf4':weapon===1?'#aa753f':weapon===2?'#c8e8ff':'#424b55';
            ctx.lineWidth=weapon===1?7:weapon===2?5:4;ctx.lineCap='round';
            const reach=[26,38,53,30,24,38][weapon];
            const theta=weapon<3&&swing>0?Math.sin((1-swing/.22)*Math.PI)*.9:0;
            ctx.rotate(theta);ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(reach,0);ctx.stroke();
            if(weapon===2){ctx.strokeStyle='#f7fafc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,-3);ctx.lineTo(reach+8,0);ctx.stroke();}
            if(weapon===0){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,-3);ctx.lineTo(reach+5,0);ctx.stroke();}
            if(weapon===5){ctx.strokeStyle='#8b949e';ctx.lineWidth=3;for(const off of [-6,0,6]){ctx.beginPath();ctx.moveTo(16,off);ctx.lineTo(42,off);ctx.stroke();}}if(weapon===4){ctx.strokeStyle='#8b949e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(8,11);ctx.lineTo(27,11);ctx.stroke();}
            if(weapon<3&&swing>0){ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,reach+6,-.55,.75);ctx.stroke();}
            ctx.restore();
            ctx.fillStyle='#fff';ctx.font='bold 15px sans-serif';ctx.fillText('HP '+Math.ceil(player.hp)+'   KILLS '+score,12,23);ctx.fillText(names[weapon],12,44);ctx.fillText(Math.floor(elapsed)+'s',W-52,23);ctx.fillStyle='#ffda63';ctx.font='bold 12px sans-serif';ctx.fillText('NEXT GUN '+Math.max(0,Math.ceil(10-weaponDropClock))+'s',W-115,44);
            ctx.fillStyle='#4d2227';ctx.fillRect(12,53,140,9);ctx.fillStyle='#4bdf73';ctx.fillRect(12,53,140*Math.max(0,player.hp)/100,9);
            ctx.strokeStyle='#b8c1d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(62,H-68,43,0,7);ctx.stroke();ctx.fillStyle='#71879b';ctx.beginPath();ctx.arc(62+joystick.x*27,H-68+joystick.y*27,17,0,7);ctx.fill();
            ctx.strokeStyle='#b8c1d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(W-62,H-68,43,0,7);ctx.stroke();ctx.fillStyle='#b37d55';ctx.beginPath();ctx.arc(W-62+aimStick.x*27,H-68+aimStick.y*27,17,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('MOVE',62,H-115);ctx.fillText('AIM',W-62,H-115);ctx.textAlign='left';
            if(player.hp<=0){ctx.fillStyle='#000c';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 30px sans-serif';ctx.fillText('GAME OVER',W/2,H/2-30);ctx.font='18px sans-serif';ctx.fillText('Kills: '+score+' · Time: '+Math.floor(elapsed)+'s',W/2,H/2+5);ctx.fillText('Use the results menu',W/2,H/2+38);ctx.textAlign='left';}
        }
        function tick(ts){if(!active)return;const dt=Math.min(.05,(ts-last)/1000||0);last=ts;if(!paused&&player.hp>0){swing=Math.max(0,swing-dt);elapsed+=dt;spawn-=dt;attack-=dt;
            let dx=joystick.x+(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),dy=joystick.y+(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);let m=Math.hypot(dx,dy)||1;player.x=Math.max(18,Math.min(W-18,player.x+dx/m*145*dt));player.y=Math.max(38,Math.min(H-38,player.y+dy/m*145*dt));
            if(spawn<=0){spawn=Math.max(.12,.65-elapsed/110);const edge=Math.floor(rand(0,4));enemies.push({x:edge===0?-15:edge===1?W+15:rand(0,W),y:edge===2?-15:edge===3?H+15:rand(0,H),hp:weapon===3?2:1});}
            for(const e of enemies){let d=dist(e,player)||1;e.x+=(player.x-e.x)/d*(65+Math.min(85,elapsed/3))*dt;e.y+=(player.y-e.y)/d*(35+Math.min(55,elapsed/5))*dt;if(d<21)player.hp=Math.max(0,player.hp-20*dt);}
            const inRange=enemies.filter(e=>dist(e,player)<(weapon===0?60:weapon===1?80:weapon===2?115:320));const target=inRange.filter(e=>Math.cos(Math.atan2(e.y-player.y,e.x-player.x)-aim)>.45).sort((a,b)=>dist(a,player)-dist(b,player))[0];
            if(target&&attack<=0){if(weapon<3)swing=.22;attack=[.27,.55,.42,.9,.18,.045][weapon];if(weapon<3){const range=[60,80,115][weapon];const hits=enemies.filter(e=>dist(e,player)<range&&Math.cos(Math.atan2(e.y-player.y,e.x-player.x)-aim)>.35).slice(0,weapon===0?1:weapon===1?3:5);for(const e of hits){e.hp--;if(weapon===1){let d=dist(e,player)||1;e.x+=(e.x-player.x)/d*20;e.y+=(e.y-player.y)/d*20;}}}else{let a=aim;for(let i=0;i<(weapon===3?5:weapon===5?3:1);i++){let angle=a+(weapon===3?(i-2)*.16:0);const offset=weapon===5?(i-1)*8:0;shots.push({x:player.x-Math.sin(a)*offset,y:player.y+Math.cos(a)*offset,vx:Math.cos(angle)*(weapon===5?600:350),vy:Math.sin(angle)*(weapon===5?600:350),life:weapon===5?.55:.8});}}}
            for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;for(const e of enemies){if(dist(s,e)<15){e.hp--;s.life=0;break;}}}shots=shots.filter(s=>s.life>0);
            for(const e of enemies.filter(e=>e.hp<=0)){score++;if(Math.random()<.12)pickups.push({x:e.x,y:e.y,type:'health'});if(Math.random()<.008)pickups.push({x:e.x,y:e.y,type:'weapon',weapon:randomWeaponDrop(),spawnedAt:elapsed});}
            enemies=enemies.filter(e=>e.hp>0);
            weaponDropClock+=dt;
            if(weaponDropClock>=10){weaponDropClock-=10;const nextWeapon=randomWeaponDrop();pickups.push({x:Math.max(35,Math.min(W-35,player.x+(player.x<W/2?85:-85))),y:Math.max(90,Math.min(H-160,player.y+(player.y<H/2?65:-65))),type:'weapon',weapon:nextWeapon,spawnedAt:elapsed,guaranteed:true});}
            for(const p of pickups){if(p.type==='weapon'&&p.weapon===weapon&&!p.guaranteed)p.used=true;if(!p.used&&dist(p,player)<23){if(p.type==='health')player.hp=Math.min(100,player.hp+25);else weapon=p.weapon;p.used=true;}}pickups=pickups.filter(p=>!p.used&&(p.type!=='weapon'||elapsed-(p.spawnedAt??elapsed)<10)).slice(-35);
        }draw();if(player.hp<=0&&!deathPrompted){deathPrompted=true;paused=true;try{moduleStore.removeItem('sffSavedGame');}catch(_){}setTimeout(()=>arcadeEndPrompt('stick-figure-fighter',true),0);}if(host){const n=Math.floor(elapsed),t=host.querySelector('#sff-time');if(t)t.textContent=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');host.querySelector('#sff-kills').textContent=score;host.querySelector('#sff-hp').textContent=Math.ceil(player.hp);try{const best=Math.max(score,Number(moduleStore.getItem('sffBestKills')||0));host.querySelector('#sff-best').textContent=best;if(player.hp<=0)moduleStore.setItem('sffBestKills',String(best));}catch(_){}}frame=requestAnimationFrame(tick);}
        function setPointer(e){if(pointer!==null&&e.pointerId!==pointer)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(pointer===null&&Math.hypot(x-62,y-(H-68))>105)return;pointer=e.pointerId;let dx=x-62,dy=y-(H-68),m=Math.max(1,Math.hypot(dx,dy));joystick={x:dx/Math.max(43,m),y:dy/Math.max(43,m)};}
        function start(){stop();reset();host=document.createElement('div');host.id='tpfg-stick-fighter';host.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#080b10;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;box-sizing:border-box;font-family:Arial,sans-serif;color:white';
            host.innerHTML=`
            <div style="width:min(100%,420px);box-sizing:border-box;background:#151a20;border:1px solid #59616b;border-radius:9px 9px 0 0;padding:6.75px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-weight:700">STICK FIGURE FIGHTER <small>v0.1.7</small><button type="button" id="sff-min" class="tpfg-topbtn" aria-label="Leave game">—</button></div>
              <div style="display:flex;justify-content:space-around;margin-top:6px;text-align:center;font-size:11px"><span>TIME<br><b id="sff-time">00:00</b></span><span>KILLS<br><b id="sff-kills">0</b></span><span>HP<br><b id="sff-hp">100</b></span><span>BEST<br><b id="sff-best">0</b></span></div>
            </div>
            <div id="sff-stage" style="position:relative;width:min(100%,420px);min-height:0;display:flex;justify-content:center"></div>
            <div style="width:min(100%,420px);box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;background:#151a20;border:1px solid #59616b;padding:6px;gap:7.5px">
              <span style="font-size:11px;color:#aaa">LEFT: MOVE<br>RIGHT: AIM</span>
              <span style="display:flex;gap:5.25px"><button id="sff-pause" type="button" class="tpfg-resultbtn">PAUSE</button><button id="sff-exit" type="button" class="tpfg-resultbtn">END GAME</button></span>
            </div>
            <div id="sff-dialog" style="display:none;position:absolute;z-index:2;inset:0;background:#000c;align-items:center;justify-content:center;padding:12px">
              <div class="tpfg-settings-card"><h3 id="sff-dialog-title">SAVE YOUR GAME?</h3><p id="sff-dialog-text">Save your current progress and continue next time?</p><div id="sff-dialog-actions" style="display:grid;gap:6px"></div></div>
            </div>`;
            canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.style.cssText='width:100%;height:auto;max-height:calc(100dvh - 175px);touch-action:none;object-fit:contain;border:1px solid #3b4652';host.querySelector('#sff-stage').appendChild(canvas);document.body.appendChild(host);ctx=canvas.getContext('2d');
            canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
            document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);
            host.querySelector('#sff-pause').onclick=()=>{if(player.hp<=0)return;paused=!paused;last=performance.now();host.querySelector('#sff-pause').textContent=paused?'RESUME':'PAUSE';};
            host.querySelector('#sff-exit').onclick=host.querySelector('#sff-min').onclick=requestLeave;
            try{host.querySelector('#sff-best').textContent=moduleStore.getItem('sffBestKills')||'0';}catch(_){}
            active=true;frame=requestAnimationFrame(tick);
        }
        function dialog(title,message,actions){const d=host.querySelector('#sff-dialog');d.querySelector('#sff-dialog-title').textContent=title;d.querySelector('#sff-dialog-text').textContent=message;const area=d.querySelector('#sff-dialog-actions');area.replaceChildren();for(const action of actions){const button=document.createElement('button');button.className='tpfg-resultbtn';button.textContent=action.label;button.onclick=()=>{d.style.display='none';action.run();};area.appendChild(button);}d.style.display='flex';}
        function snapshot(){return JSON.stringify({player,enemies,pickups,shots,score,elapsed,spawn,attack,weapon,swing,aim,weaponDropClock});}
        function save(){try{moduleStore.setItem('sffSavedGame',snapshot());}catch(_){}}
        function restore(){try{const s=JSON.parse(moduleStore.getItem('sffSavedGame'));if(!s)return;({player,enemies,pickups,shots,score,elapsed,spawn,attack,weapon,swing,aim}=s);weaponDropClock=Number.isFinite(s.weaponDropClock)?Math.max(0,Math.min(10,s.weaponDropClock)):elapsed%10;paused=false;last=performance.now();}catch(_){}}
        function requestLeave(){if(!host)return;paused=true;arcadeEndPrompt('stick-figure-fighter',player.hp<=0);}
        function setAim(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height,dx=x-(W-62),dy=y-(H-68),m=Math.hypot(dx,dy);if(m>3){aim=Math.atan2(dy,dx);aimStick={x:dx/Math.max(43,m),y:dy/Math.max(43,m)};}}
        function onDown(e){if(player.hp<=0)return;if(paused)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(Math.hypot(x-(W-62),y-(H-68))<105&&aimPointer===null){aimPointer=e.pointerId;setAim(e);}else setPointer(e);if(pointer===e.pointerId||aimPointer===e.pointerId){canvas.setPointerCapture(e.pointerId);e.preventDefault();}}
        function onMove(e){if(pointer===e.pointerId)setPointer(e);if(aimPointer===e.pointerId)setAim(e);}
        function onUp(e){if(pointer===e.pointerId){pointer=null;joystick={x:0,y:0};}if(aimPointer===e.pointerId){aimPointer=null;aimStick={x:0,y:0};}}
        function onKeyDown(e){keys.add(e.key);}
        function onKeyUp(e){keys.delete(e.key);}
        function stop(){active=false;cancelAnimationFrame(frame);document.removeEventListener('keydown',onKeyDown);document.removeEventListener('keyup',onKeyUp);host?.remove();host=null;pointer=null;aimPointer=null;aimStick={x:0,y:0};joystick={x:0,y:0};keys.clear();}
        return {start,stop,restore,save,reset,resume(){paused=false;last=performance.now();if(host)host.querySelector('#sff-pause').textContent='PAUSE';},getScore(){return score;},getTime(){return elapsed;}};
    })();
    Arcade.registerGame({id:'stick-figure-fighter',name:'Stick Figure Fighter',version:'0.1.5',isAvailable(){return true;},start:StickFighter.start,stop:StickFighter.stop});

    function gameSaveKey(id){return SAVE_PREFIX+id;}
    function getGameSave(id){try{return JSON.parse(moduleStore.getItem(gameSaveKey(id))||'null');}catch(_){return null;}}
    function clearGameSave(id){try{moduleStore.removeItem(gameSaveKey(id));}catch(_){}}
    function snapshotGame(){
        const keys=['score','kills','hp','activeMs','spawnClock','shotClock','enemyShotClock','player','bullets','enemies','enemyBullets','particles','healthDrops'];
        const out={}; keys.forEach(k=>out[k]=state[k]); return JSON.parse(JSON.stringify(out));
    }
    function saveCurrentGame(){try{moduleStore.setItem(gameSaveKey('flight-arcade'),JSON.stringify({version:1,savedAt:Date.now(),state:snapshotGame()}));return true;}catch(_){return false;}}
    function restoreGame(s){Object.assign(state,JSON.parse(JSON.stringify(s.state)));shownStage=aircraftStage();transition=null;state.running=true;state.paused=false;state.over=false;state.lastTs=performance.now();state.keys={up:false,down:false,left:false,right:false,fire:false};state.stick={x:0,y:0};showGame();setTimeout(resize,0);updateHud();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
    function arcadeEndPrompt(id,died=false){
        const isStick=id==='stick-figure-fighter';
        const donation='Torn donations are appreciated. Send cash or items to RelaxSweety [4539436].';
        const close=()=>{if(isStick)StickFighter.stop();else closeActiveGame();(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.closeActiveModule?.();};
        const replay=()=>{if(isStick){StickFighter.start();}else startGame();};
        const buttons=died?[
            {label:'REPLAY',action:replay},
            {label:'EXIT',action:close}
        ]:[
            {label:'SAVE & EXIT',action:()=>{if(isStick)StickFighter.save();else saveCurrentGame();close();}},
            {label:'EXIT WITHOUT SAVING',action:()=>{if(isStick)moduleStore.removeItem('sffSavedGame');else clearGameSave('flight-arcade');close();}},
            {label:'CANCEL',action:()=>{if(isStick)StickFighter.resume();else{state.paused=false;state.lastTs=performance.now();document.getElementById('tpfg-pause').textContent='PAUSE';}}}
        ];
        const gameName=isStick?'Stick Figure Fighter':'Flight Arcade';
        const kills=isStick?StickFighter.getScore():state.kills;
        const score=isStick?StickFighter.getScore():Math.floor(state.score);
        const time=isStick?formatTime(StickFighter.getTime()*1000):formatTime(state.activeMs);
        const status=died?'Game Over':'Session Ended';
        const summary='Torn Arcade — '+gameName+' | '+status+' | Score: '+Number(score).toLocaleString()+' | Kills: '+Number(kills).toLocaleString()+' | Time: '+time;
        promptBox(died?'GAME OVER':'END GAME',donation,buttons,true,summary);
    }
    function promptBox(title,message,buttons,showDonation=false,summary=''){
        const p=document.getElementById('tpfg-prompt');p.querySelector('h3').textContent=title;p.querySelector('p').textContent=message;
        const a=p.querySelector('#tpfg-prompt-actions');a.innerHTML='';buttons.forEach(x=>{const b=document.createElement('button');b.className='tpfg-resultbtn';b.textContent=x.label;b.onclick=()=>{p.style.display='none';x.action();};a.appendChild(b);});if(summary){const wrap=document.createElement('div');wrap.style.cssText='margin:9px 0;padding:9px;background:#10151b;border:1px solid #59616b;border-radius:8px;font-size:11px;line-height:1.5;white-space:normal;overflow-wrap:anywhere';const label=document.createElement('strong');label.textContent='GAME SUMMARY';const content=document.createElement('div');content.textContent=summary;content.style.margin='5.25px 0';const copy=document.createElement('button');copy.type='button';copy.className='tpfg-resultbtn';copy.textContent='COPY SUMMARY';copy.onclick=async()=>{try{await navigator.clipboard.writeText(summary);copy.textContent='COPIED';}catch(_){const input=document.createElement('textarea');input.value=summary;input.style.cssText='position:fixed;opacity:0';document.body.appendChild(input);input.select();const ok=document.execCommand('copy');input.remove();copy.textContent=ok?'COPIED':'SELECT TEXT TO COPY';if(!ok){const selection=document.createElement('textarea');selection.value=summary;wrap.appendChild(selection);selection.focus();selection.select();}}};wrap.append(label,content,copy);a.prepend(wrap);}if(showDonation){const info=document.createElement('div');info.style.cssText='margin-top:10.5px;padding-top:9px;border-top:1px solid #59616b;font-size:11px;text-align:center';info.innerHTML='Enjoying Torn PDA Arcade? <a href="https://www.torn.com/profiles.php?XID=4539436" target="_blank" rel="noopener noreferrer" style="color:#e2c778">Donate to RelaxSweety [4539436]</a>';a.appendChild(info);}p.style.display='flex';
    }
    function launchGame(game){if(game.id==='stick-figure-fighter'){const savedStick=moduleStore.getItem('sffSavedGame');if(savedStick)promptBox('SAVED GAME','Continue your saved Stick Figure Fighter game?',[{label:'CONTINUE SAVED GAME',action:()=>{game.start();StickFighter.restore();}},{label:'START NEW GAME',action:()=>{moduleStore.removeItem('sffSavedGame');game.start();}},{label:'CANCEL',action:()=>{}}]);else game.start();return;}if(game.id!=='flight-arcade'){game.start();return;}const s=getGameSave(game.id);if(s)promptBox('SAVED GAME','Continue your saved '+game.name+' game?',[{label:'CONTINUE SAVED GAME',action:()=>restoreGame(s)},{label:'START NEW GAME',action:()=>{clearGameSave(game.id);game.start();}},{label:'CANCEL',action:()=>{}}]);else game.start();}
    function requestLeave(){if(!state.running||state.over){updateEngineSound(false);minimize();return;}state.paused=true;updateEngineSound(false);document.getElementById('tpfg-pause').textContent='RESUME';arcadeEndPrompt('flight-arcade',false);}
    function closeActiveGame(){transition=null;state.running=false;state.paused=true;updateEngineSound(false);cancelAnimationFrame(raf);document.getElementById('tpfg-root').style.display='none';}
    function openManager(){document.getElementById('tpfg-manager').style.display='flex';renderManager('games');}
    function renderManager(tab){
        const body=document.getElementById('tpfg-manager-body');
        document.getElementById('tpfg-tab-games')?.classList.toggle('tpfg-selected',tab==='games');
        document.getElementById('tpfg-tab-settings')?.classList.toggle('tpfg-selected',tab==='settings');
        if(tab==='games'){
            const games=Arcade.list().filter(g=>Arcade.available(g));
            body.innerHTML=games.length?games.map(g=>'<div class="tpfg-game-card"><b>'+g.name+'</b><span>Available now</span><button data-game="'+g.id+'">PLAY</button></div>').join(''):'<p class="tpfg-empty">No games are available in your current Torn situation.</p>';
            body.querySelectorAll('button[data-game]').forEach(btn=>btn.onclick=()=>{document.getElementById('tpfg-manager').style.display='none';Arcade.start(btn.dataset.game);});
        } else {
            body.innerHTML=Arcade.list().map(g=>{const mode=g.id==='flight-arcade'?launchMode():(moduleStore.getItem('tpfgMode:'+g.id)||'always');return '<div class="tpfg-game-card"><b>'+g.name+'</b><label><input type="checkbox" data-enable-game="'+g.id+'" '+(Arcade.enabled(g)?'checked':'')+'> Show in Game List</label><span>Availability</span><label><input type="radio" name="manager-mode-'+g.id+'" value="flight" '+(mode==='flight'?'checked':'')+'> Traveling</label><label><input type="radio" name="manager-mode-'+g.id+'" value="always" '+(mode==='always'?'checked':'')+'> Always</label><label><input type="radio" name="manager-mode-'+g.id+'" value="disabled" '+(mode==='disabled'?'checked':'')+'> Disabled</label></div>';}).join('');
            body.querySelectorAll('input[data-enable-game]').forEach(x=>x.onchange=()=>Arcade.setEnabled(Arcade.games.get(x.dataset.enableGame),x.checked));
            body.querySelectorAll('input[type="radio"]').forEach(r=>r.onchange=()=>{const id=r.name.replace('manager-mode-','');moduleStore.setItem(id==='flight-arcade'?LAUNCH_MODE_KEY:'tpfgMode:'+id,r.value);});
        }
    }

    function buildUI() {
        if (document.getElementById('tpfg-root')) return;
        // TU owns the only persistent launcher; no game-specific floating button.
        const root = document.createElement('div');
        root.id = 'tpfg-root';
        root.innerHTML = `
<div id="tpfg-shell">
  <div id="tpfg-top">
    <div id="tpfg-title"><span>TORN PDA FLIGHT GAME <small>v${GAME.version}</small></span><button class="tpfg-topbtn" id="tpfg-min" type="button">—</button></div>
    <div id="tpfg-condition">TORN STATUS: --</div>
        <div id="tpfg-stats">
      <div class="tpfg-stat">TIME<b id="tpfg-time">00:00</b></div>
      <div class="tpfg-stat">SCORE<b id="tpfg-score">0</b></div>
      <div class="tpfg-stat">HP<b id="tpfg-hp">100</b></div>
      <div class="tpfg-stat">HIGH<b id="tpfg-high">0</b></div>
    </div>
  </div>
  <div id="tpfg-stagewrap">
    <canvas id="tpfg-canvas"></canvas>
    <div id="tpfg-message"></div>
    <div id="tpfg-results">
      <div id="tpfg-results-card">
        <h2>TORN PDA FLIGHT GAME</h2>
                <div id="tpfg-result-grid">
          <div class="tpfg-result">SCORE<b id="tpfg-rscore">0</b></div>
          <div class="tpfg-result">KILLS<b id="tpfg-rkills">0</b></div>
          <div class="tpfg-result">GAME TIME<b id="tpfg-rtime">00:00</b></div>
          <div class="tpfg-result">HIGH SCORE<b id="tpfg-rhigh">0</b></div>
        </div>
        <div id="tpfg-sharetext"></div>
        <button class="tpfg-resultbtn" id="tpfg-share" type="button">SHARE RESULTS</button>
        <button class="tpfg-resultbtn" id="tpfg-restart" type="button">PLAY AGAIN</button>
        <button class="tpfg-resultbtn" id="tpfg-close" type="button">RETURN TO TORN</button>
        <div class="tpfg-donate"><b>Enjoying Torn PDA Flight Game?</b><br>Torn donations are appreciated.<br><a href="${GAME.creatorUrl}" target="_blank" rel="noopener noreferrer">RelaxSweety [4539436]</a></div><div id="tpfg-by">Created by <a href="${GAME.creatorUrl}">${GAME.creator} [${GAME.creatorId}]</a> · <a href="${GAME.discordUrl}">Discord</a></div>
      </div>
    </div>
  </div>
  <div id="tpfg-controls">
    <div id="tpfg-stick"><div id="tpfg-stick-label">SLIDE TO MOVE</div><div id="tpfg-stick-knob"></div></div>
    <div id="tpfg-actions">

      <div id="tpfg-audio"><span>VOL</span><input id="tpfg-volume" type="range" min="0" max="100" value="55"><button id="tpfg-mute" type="button">ON</button></div>
      <button id="tpfg-pause" type="button">PAUSE</button>
      <button id="tpfg-end" type="button">END GAME</button>
    </div>
  </div>
</div>`;
        const manager=document.createElement('div');manager.id='tpfg-manager';manager.style.display='none';manager.innerHTML='<div class="tpfg-settings-card"><h3>TORN PDA ARCADE</h3><div class="tpfg-manager-tabs"><button id="tpfg-tab-games">GAMES</button><button id="tpfg-tab-settings">SETTINGS</button></div><div id="tpfg-manager-body"></div><button class="tpfg-resultbtn" id="tpfg-manager-close">CLOSE</button></div>';document.body.appendChild(manager);
        const prompt=document.createElement('div');prompt.id='tpfg-prompt';prompt.style.display='none';prompt.innerHTML='<div class="tpfg-settings-card"><h3></h3><p></p><div id="tpfg-prompt-actions"></div></div>';document.body.appendChild(prompt);
        const gameSettings=document.createElement('div');gameSettings.id='tpfg-game-settings';gameSettings.style.display='none';gameSettings.innerHTML='<div class="tpfg-settings-card"><h3>GAME SETTINGS</h3><div class="tpfg-setting-row"><b>Flight Arcade</b><span>Enabled</span></div><label><input type="radio" name="tpfg-mode" value="flight"> Flight only</label><label><input type="radio" name="tpfg-mode" value="always"> Always available</label><label><input type="radio" name="tpfg-mode" value="disabled"> Disabled</label><p class="tpfg-settings-note">Additional Torn games can be added here as modules.</p><button class="tpfg-resultbtn" id="tpfg-settings-close">CLOSE</button></div>';document.body.appendChild(gameSettings);
        gameSettings.querySelectorAll('input[name="tpfg-mode"]').forEach(r=>{r.checked=(launchMode()===r.value);r.addEventListener('change',()=>moduleStore.setItem(LAUNCH_MODE_KEY,r.value));});
        document.getElementById('tpfg-settings-close').onclick=()=>gameSettings.style.display='none';
        document.getElementById('tpfg-manager-close').onclick=()=>manager.style.display='none';
        document.getElementById('tpfg-tab-games').onclick=()=>renderManager('games');
        document.getElementById('tpfg-tab-settings').onclick=()=>renderManager('settings');
        const picker=document.createElement('div');picker.id='tpfg-chatpick';picker.innerHTML='<div id="tpfg-chatcard"><b>Share Arcade Results</b><p>Select an open Torn chat. Results are inserted but not sent.</p><div id="tpfg-chatlist"></div><button class="tpfg-resultbtn" id="tpfg-copy">COPY RESULTS</button><button class="tpfg-resultbtn" id="tpfg-chatcancel">CANCEL</button></div>';document.body.appendChild(picker);
        document.body.appendChild(root);
        wireUI();
    }

    const state = {
        running:false, paused:false, over:false, score:0, kills:0, hp:100,
        activeMs:0, lastTs:0, spawnClock:0, shotClock:0, enemyShotClock:0,
        keys:{up:false,down:false,left:false,right:false,fire:false},
        stick:{x:0,y:0}, shareText:'',
        player:null, bullets:[], enemies:[], enemyBullets:[], particles:[]
    };

    let canvas, ctx, raf = 0, W = 0, H = 0;

    const AIRCRAFT_COUNT=8;
    const AUDIO_KEY='tpfgAudio';
    let audioCtx=null,engineOsc=null,engineGain=null;
    let audioPrefs=(()=>{try{return {...{volume:.55,muted:false},...JSON.parse(moduleStore.getItem(AUDIO_KEY)||'{}')}}catch(_){return {volume:.55,muted:false}}})();
    function saveAudio(){try{moduleStore.setItem(AUDIO_KEY,JSON.stringify(audioPrefs));}catch(_){}}
    function ensureAudio(){if(audioCtx)return audioCtx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;audioCtx=new AC();return audioCtx;}
    function tone(freq,dur,type='sine',gain=.12,endFreq=null){if(audioPrefs.muted||audioPrefs.volume<=0)return;const a=ensureAudio();if(!a)return;if(a.state==='suspended')a.resume();const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+dur);g.gain.setValueAtTime(Math.max(.0001,gain*audioPrefs.volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur);}
    function explosionSound(){tone(110,.28,'sawtooth',.18,38);tone(62,.34,'square',.08,28);}
    function healSound(){tone(520,.12,'sine',.10,760);setTimeout(()=>tone(760,.16,'sine',.08,1040),70);}
    function updateEngineSound(){if(engineOsc){try{engineOsc.stop();engineOsc.disconnect();}catch(_){}engineOsc=null;}if(engineGain){try{engineGain.disconnect();}catch(_){}engineGain=null;}}

    function resize() {
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(300, r.width); H = Math.max(200, r.height);
        canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
        ctx.setTransform(dpr,0,0,dpr,0,0);
        if (state.player) {
            state.player.x = Math.min(state.player.x, W-40);
            state.player.y = Math.min(state.player.y, H-30);
        }
    }

    let uiAbort=null;
    function wireUI() {
        uiAbort?.abort();uiAbort=new AbortController();
        canvas = document.getElementById('tpfg-canvas');
        ctx = canvas.getContext('2d');
                document.getElementById('tpfg-min').addEventListener('click', requestLeave);
        document.getElementById('tpfg-pause').addEventListener('click', togglePause);
        document.getElementById('tpfg-end').addEventListener('click', requestLeave);
        document.getElementById('tpfg-restart').addEventListener('click', startGame);
        document.getElementById('tpfg-close').addEventListener('click', minimize);
        document.getElementById('tpfg-share').addEventListener('click', showChatPicker);
        document.getElementById('tpfg-chatcancel').addEventListener('click',()=>document.getElementById('tpfg-chatpick').style.display='none');
        document.getElementById('tpfg-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.shareText);}catch(_){window.prompt('Copy results:',state.shareText);}});

        bindStick(document.getElementById('tpfg-stick'));
        const vol=document.getElementById('tpfg-volume'),mute=document.getElementById('tpfg-mute');vol.value=Math.round(audioPrefs.volume*100);mute.textContent=audioPrefs.muted?'OFF':'ON';vol.addEventListener('input',()=>{audioPrefs.volume=Number(vol.value)/100;saveAudio();});mute.addEventListener('click',()=>{audioPrefs.muted=!audioPrefs.muted;mute.textContent=audioPrefs.muted?'OFF':'ON';saveAudio();if(audioPrefs.muted)updateEngineSound(false);else ensureAudio();});

        window.addEventListener('resize', resize,{signal:uiAbort.signal});
        window.addEventListener('keydown', e => {
            if (!state.running) return;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault();
            keyFromEvent(e, true);
        }, {passive:false,signal:uiAbort.signal});
        window.addEventListener('keyup', e => keyFromEvent(e, false),{signal:uiAbort.signal});
    }

    function bindStick(stick) {
        const knob=document.getElementById('tpfg-stick-knob');
        let activeTouch=null,activePointer=null;
        const reset=()=>{activeTouch=null;activePointer=null;state.stick={x:0,y:0};knob.style.transform='translate(0,0)';};
        const move=(x,y)=>{
            if(!Number.isFinite(x)||!Number.isFinite(y))return;
            const r=stick.getBoundingClientRect(),max=r.width*.32;
            if(max<=0)return;
            let vx=x-r.left-r.width/2,vy=y-r.top-r.height/2;
            const dist=Math.hypot(vx,vy);
            if(dist>max){vx=vx/dist*max;vy=vy/dist*max;}
            state.stick={x:vx/max,y:vy/max};
            knob.style.transform='translate('+vx+'px,'+vy+'px)';
        };
        // Android WebView: use the original touch identifier so the held FIRE
        // finger can never take over when the movement thumb is replaced.
        stick.addEventListener('touchstart',e=>{
            e.preventDefault();
            if(activeTouch!==null)return;
            const t=Array.from(e.changedTouches).find(t=>t.target===stick||stick.contains(t.target));
            if(!t)return;
            activeTouch=t.identifier;move(t.clientX,t.clientY);
        },{passive:false});
        stick.addEventListener('touchmove',e=>{
            e.preventDefault();
            if(activeTouch===null)return;
            const t=Array.from(e.touches).find(t=>t.identifier===activeTouch);
            if(t)move(t.clientX,t.clientY);
        },{passive:false});
        const endTouch=e=>{
            if(activeTouch===null)return;
            if(Array.from(e.changedTouches).some(t=>t.identifier===activeTouch))reset();
        };
        stick.addEventListener('touchend',endTouch,{passive:false});
        stick.addEventListener('touchcancel',endTouch,{passive:false});
        // Mouse/stylus fallback; touch is exclusively handled above.
        stick.addEventListener('pointerdown',e=>{
            if(e.pointerType==='touch'||activeTouch!==null||activePointer!==null)return;
            if(e.pointerType==='mouse'&&e.button!==0)return;
            activePointer=e.pointerId;move(e.clientX,e.clientY);
            try{stick.setPointerCapture(e.pointerId);}catch(_){}
        });
        stick.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'&&activePointer===e.pointerId)move(e.clientX,e.clientY);});
        const endPointer=e=>{if(activePointer===e.pointerId)reset();};
        stick.addEventListener('pointerup',endPointer);
        stick.addEventListener('pointercancel',endPointer);
        stick.addEventListener('lostpointercapture',endPointer);
        window.addEventListener('blur',reset,{signal:uiAbort.signal});
    }

    function chatInputs(){return [...new Set([...document.querySelectorAll('textarea,[contenteditable="true"][role="textbox"],[contenteditable="true"][data-placeholder*="message" i],[contenteditable="true"][aria-label*="message" i]')])].filter(el=>!el.closest('#tpfg-root')&&!el.closest('#tpfg-chatpick')&&el.getBoundingClientRect().width>0);}
    function chatName(input,i){let el=input;for(let n=0;n<8&&el;n++,el=el.parentElement){const r=el.getBoundingClientRect();if(r.width>=200&&r.height>=120){const top=r.top+70;const candidates=[...el.querySelectorAll('[title],[aria-label],strong,b,h1,h2,h3,span')].filter(x=>{const q=x.getBoundingClientRect();return q.height>0&&q.top>=r.top-5&&q.top<top;}).map(x=>(x.getAttribute('title')||x.getAttribute('aria-label')||x.textContent||'').trim()).filter(x=>x.length>=2&&x.length<=40&&!/close|minimize|send|message|emoji|settings/i.test(x));if(candidates.length)return candidates[0];}}return 'Open Chat '+(i+1);}
    function insertChat(input,text){input.focus();if('value'in input){const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),'value');if(d&&d.set)d.set.call(input,text);else input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));return true;}input.textContent=text;input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));return true;}
    function showChatPicker(){const picker=document.getElementById('tpfg-chatpick'),list=document.getElementById('tpfg-chatlist');list.innerHTML='';const chats=chatInputs();if(!chats.length)list.innerHTML='<p>No open Torn chats detected. Open a chat and try again.</p>';chats.forEach((input,i)=>{const b=document.createElement('button');b.textContent=chatName(input,i);b.onclick=()=>{if(insertChat(input,state.shareText))picker.style.display='none';};list.appendChild(b);});picker.style.display='flex';}

    function bindHold(btn, key) {
        const on = e => { e.preventDefault(); state.keys[key]=true; btn.classList.add('on'); };
        const off = e => { if (e) e.preventDefault(); state.keys[key]=false; btn.classList.remove('on'); };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('pointerleave', off);
    }

    function keyFromEvent(e, down) {
        const k = e.key.toLowerCase();
        if (k==='arrowup'||k==='w') state.keys.up=down;
        if (k==='arrowdown'||k==='s') state.keys.down=down;
        if (k==='arrowleft'||k==='a') state.keys.left=down;
        if (k==='arrowright'||k==='d') state.keys.right=down;
        if (k===' ') state.keys.fire=down;
        if (down && (k==='p'||k==='escape')) togglePause();
    }

    function showGame(){document.getElementById('tpfg-root').style.display='block';document.getElementById('tpfg-results').style.display='none';document.getElementById('tpfg-message').textContent='';document.getElementById('tpfg-pause').textContent='PAUSE';document.getElementById('tpfg-high').textContent=Number(saved.highScore||0).toLocaleString();}
    async function startGame() {
        cancelAnimationFrame(raf);
        const flight = detectFlight();
        state.running=true; state.paused=false; state.over=false; conditionWasActive=detectCondition(); conditionPrompted=false;
        state.score=0; state.kills=0; state.hp=100; state.activeMs=0;
        state.lastTs=performance.now(); state.spawnClock=0; state.shotClock=0; state.enemyShotClock=0;
        state.keys={up:false,down:false,left:false,right:false,fire:false};
        state.stick={x:0,y:0};
        state.player={x:45,y:150,w:44,h:24,speed:270};shownStage=0;transition=null;
        state.bullets=[]; state.enemies=[]; state.enemyBullets=[]; state.particles=[]; state.healthDrops=[];
        showGame();
        setTimeout(resize, 0);
        updateHud();
        raf=requestAnimationFrame(loop);
    }

    function minimize(){if(state.running&&!state.over){requestLeave();return;}updateEngineSound(false);document.getElementById('tpfg-root').style.display='none';}

    function togglePause() {
        if (!state.running || state.over) return;
        state.paused=!state.paused;
        updateEngineSound(false);
        state.lastTs=performance.now();
        document.getElementById('tpfg-pause').textContent=state.paused?'RESUME':'PAUSE';
        document.getElementById('tpfg-message').textContent=state.paused?'PAUSED':'';
    }

    let conditionWasActive=null,conditionPrompted=false,lastConditionCheck=0;
    function detectCondition(){
        const f=detectFlight();if(f.flying)return {type:'flight',active:true,remaining:f.remaining,label:'FLIGHT'};
        const text=(document.body?.innerText||'').replace(/\s+/g,' ');
        let m=text.match(/(?:Hospital|Hospitalized).*?(\d{1,2}:\d{2}:\d{2})/i);if(m)return {type:'hospital',active:true,remaining:m[1],label:'HOSPITAL'};
        m=text.match(/(?:Jail|Jailed).*?(\d{1,2}:\d{2}:\d{2})/i);if(m)return {type:'jail',active:true,remaining:m[1],label:'JAIL'};
        return {type:null,active:false,remaining:'',label:'TORN'};
    }
    function monitorCondition(ts){
        if(ts-lastConditionCheck<500)return;lastConditionCheck=ts;const q=detectCondition();const el=document.getElementById('tpfg-condition');if(el)el.textContent=q.active?q.label+' REMAINING: '+q.remaining:'TORN STATUS: FREE';
        if(conditionWasActive&&conditionWasActive.active&&!q.active&&!conditionPrompted){conditionPrompted=true;state.paused=true;const type=conditionWasActive.type;const msg=type==='flight'?'Your flight has ended.':type==='jail'?'You have been released from jail.':'You have been released from the hospital.';promptBox(type==='flight'?'FLIGHT ENDED':type==='jail'?'RELEASED FROM JAIL':'RELEASED FROM HOSPITAL',msg+' Would you like to continue playing or leave the game?',[{label:'CONTINUE',action:()=>{state.paused=false;state.lastTs=performance.now();}},{label:'LEAVE GAME',action:requestLeave}]);}
        if(q.active)conditionWasActive=q;
    }
    function loop(ts) {
        if (!state.running) return;
        monitorCondition(ts);
        let dt=Math.min((ts-state.lastTs)/1000, .05);
        state.lastTs=ts;
        if (!state.paused && !state.over) {
            if(transition){advanceAircraftTransition(dt);draw();updateHud();raf=requestAnimationFrame(loop);return;}
            state.activeMs += dt*1000;
            update(dt);
            if(!state.over&&!transition&&aircraftStage()!==shownStage)startAircraftTransition(aircraftStage());
            draw();
            updateHud();
        } else draw();
        raf=requestAnimationFrame(loop);
    }

    function update(dt) {
        const p=state.player;
        let dx=(state.keys.right?1:0)-(state.keys.left?1:0);
        let dy=(state.keys.down?1:0)-(state.keys.up?1:0);
        if(Math.abs(state.stick.x)>.04||Math.abs(state.stick.y)>.04){dx=state.stick.x;dy=state.stick.y;}
        const mag=Math.max(1,Math.hypot(dx,dy));
        p.x=Math.max(4,Math.min(W-p.w-4,p.x+dx/mag*p.speed*dt));
        p.y=Math.max(4,Math.min(H-p.h-4,p.y+dy/mag*p.speed*dt));
        // Continuous engine audio removed.

        state.shotClock-=dt;
        if (state.shotClock<=0) {
            state.bullets.push({x:p.x+p.w,y:p.y+p.h*.5,vx:510,r:3});
            state.shotClock=.14;
        }

        const seconds=state.activeMs/1000;
        const difficulty=1+Math.min(seconds/150,1.5);
        state.spawnClock-=dt;
        if (state.spawnClock<=0) {
            spawnEnemy(difficulty);
            state.spawnClock=Math.max(.35,1.15/difficulty)*(0.75+Math.random()*.55);
        }

        state.enemyShotClock-=dt;
        if (state.enemyShotClock<=0 && state.enemies.length) {
            const shooters=state.enemies.filter(e=>e.x<W-25);
            if (shooters.length) {
                const e=shooters[(Math.random()*shooters.length)|0];
                const px=p.x+p.w/2, py=p.y+p.h/2;
                const ex=e.x, ey=e.y+e.h/2;
                const a=Math.atan2(py-ey,px-ex);
                const sp=145+45*difficulty;
                state.enemyBullets.push({x:ex,y:ey,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:4});
            }
            state.enemyShotClock=Math.max(.5,1.35/difficulty);
        }

        state.bullets.forEach(b=>b.x+=b.vx*dt);
        state.enemyBullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;});
        state.enemies.forEach(e=>e.x-=e.speed*dt);
        state.healthDrops.forEach(h=>h.x-=h.speed*dt);
        state.particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;});

        for (let bi=state.bullets.length-1;bi>=0;bi--) {
            const b=state.bullets[bi];
            if (b.x>W+20) {state.bullets.splice(bi,1);continue;}
            for (let ei=state.enemies.length-1;ei>=0;ei--) {
                const e=state.enemies[ei];
                if (circleRect(b,e)) {
                    state.bullets.splice(bi,1); e.hp--;
                    if (e.hp<=0) {
                        explode(e.x+e.w/2,e.y+e.h/2); explosionSound();
                        state.score+=e.tough?300:120; state.kills++;

                        state.healthDrops.push({x:e.x+e.w/2-8,y:e.y+e.h/2-8,w:18,h:18,speed:55});
                        state.enemies.splice(ei,1);
                    }
                    break;
                }
            }
        }

        for (let i=state.enemyBullets.length-1;i>=0;i--) {
            const b=state.enemyBullets[i];
            if (b.x<-20||b.y<-20||b.y>H+20) {state.enemyBullets.splice(i,1);continue;}
            if (circleRect(b,p)) {
                state.enemyBullets.splice(i,1);
                damage(10);
            }
        }

        for (let i=state.enemies.length-1;i>=0;i--) {
            const e=state.enemies[i];
            if (e.x+e.w<0) {explode(8,e.y+e.h/2,18); explosionSound();state.enemies.splice(i,1);damage(e.tough?30:20);continue;}
            if (rectHit(e,p)) {
                state.enemies.splice(i,1);
                explode(e.x+e.w/2,e.y+e.h/2);
                damage(e.tough?30:20);
            }
        }

        for(let i=state.healthDrops.length-1;i>=0;i--){const h=state.healthDrops[i];if(h.x+h.w<0){state.healthDrops.splice(i,1);continue;}if(rectHit(h,p)){if(state.hp>=100)state.score+=100;else state.hp=Math.min(100,state.hp+10);state.healthDrops.splice(i,1);explode(p.x+p.w/2,p.y+p.h/2,8);healSound();}}
        state.particles=state.particles.filter(q=>q.life>0);
        state.score += 8*dt;
        if (state.hp<=0) finishGame(false);
    }

    function spawnEnemy(difficulty) {
        const tough=Math.random()<Math.min(.12+(difficulty-1)*.1,.32);
        const h=tough?34:25, w=tough?52:40;
        state.enemies.push({
            x:W+10,y:10+Math.random()*Math.max(10,H-h-20),w,h,
            hp:tough?3:1,tough,speed:(95+Math.random()*65)*difficulty
        });
    }

    function damage(n) {
        state.hp=Math.max(0,state.hp-n);
        explode(state.player.x+20,state.player.y+12,7);
    }

    function explode(x,y,n=14) {
        for(let i=0;i<n;i++) {
            const a=Math.random()*Math.PI*2, s=35+Math.random()*120;
            state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.45});
        }
    }

    function circleRect(c,r) {
        const x=Math.max(r.x,Math.min(c.x,r.x+r.w)), y=Math.max(r.y,Math.min(c.y,r.y+r.h));
        return (c.x-x)**2+(c.y-y)**2<c.r**2;
    }
    function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

    function aircraftStage(){return Math.floor(Math.max(0,state.score)/5000)%AIRCRAFT_COUNT;}
    // Transition phases: old aircraft exits right, new aircraft enters from left.
    const TRANSITION_SECONDS=1.4;
    let transition=null,shownStage=0;
    function startAircraftTransition(nextStage){
        if(!state.player)return;
        transition={elapsed:0,from:shownStage,to:nextStage,x:state.player.x,y:state.player.y};
        updateEngineSound(false);
    }
    function advanceAircraftTransition(dt){
        if(!transition)return;
        transition.elapsed=Math.min(TRANSITION_SECONDS,transition.elapsed+dt);
        if(transition.elapsed>=TRANSITION_SECONDS){shownStage=transition.to;transition=null;}
    }
    function drawAircraft(x,y,w,h,design,enemy=false,tough=false){
        ctx.save();ctx.translate(x,y);if(enemy){ctx.translate(w,0);ctx.scale(-1,1);}
        const paint=['#d8dde2','#313c50','#00c8ed','#7c8a68','#a3a6ae','#b77b42','#e6bd43','#e8e8e8'];
        const trims=['#6fa8d8','#8d71e6','#ff4bd8','#d95444','#f0e5c1','#48d68a','#191919','#ff4d4d'];
        const body=enemy?(tough?'#7d858d':'#626b74'):paint[design%AIRCRAFT_COUNT],accent=enemy?'#c4544c':trims[design%AIRCRAFT_COUNT],dark=enemy?'#343b42':'#18202a';
        ctx.fillStyle=body;ctx.strokeStyle=dark;ctx.lineWidth=1;
        const cy=h/2;
        if(design===0){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.58,h*.30);ctx.lineTo(w*.38,0);ctx.lineTo(w*.30,h*.34);ctx.lineTo(0,h*.18);ctx.lineTo(w*.14,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.30,h*.66);ctx.lineTo(w*.38,h);ctx.lineTo(w*.58,h*.70);ctx.closePath();}
        else if(design===1){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.48,.08*h);ctx.lineTo(w*.18,0);ctx.lineTo(w*.28,h*.38);ctx.lineTo(0,h*.18);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.28,h*.62);ctx.lineTo(w*.18,h);ctx.lineTo(w*.48,.92*h);ctx.closePath();}
        else if(design===2){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.55,.22*h);ctx.lineTo(w*.30,0);ctx.lineTo(w*.22,h*.32);ctx.lineTo(0,h*.12);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.88);ctx.lineTo(w*.22,h*.68);ctx.lineTo(w*.30,h);ctx.lineTo(w*.55,.78*h);ctx.closePath();}
        else if(design===3){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.60,h*.36);ctx.lineTo(w*.48,0);ctx.lineTo(w*.35,h*.36);ctx.lineTo(0,h*.28);ctx.lineTo(0,h*.72);ctx.lineTo(w*.35,h*.64);ctx.lineTo(w*.48,h);ctx.lineTo(w*.60,h*.64);ctx.closePath();}
        else if(design===4){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.55,h*.38);ctx.lineTo(w*.42,0);ctx.lineTo(w*.32,h*.38);ctx.lineTo(0,h*.24);ctx.lineTo(w*.10,cy);ctx.lineTo(0,h*.76);ctx.lineTo(w*.32,h*.62);ctx.lineTo(w*.42,h);ctx.lineTo(w*.55,h*.62);ctx.closePath();}
        else if(design===5){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.62,h*.26);ctx.lineTo(w*.42,.08*h);ctx.lineTo(w*.32,h*.34);ctx.lineTo(0,0);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h);ctx.lineTo(w*.32,h*.66);ctx.lineTo(w*.42,.92*h);ctx.lineTo(w*.62,.74*h);ctx.closePath();}
        else if(design===6){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.58,h*.20);ctx.lineTo(w*.28,0);ctx.lineTo(w*.24,h*.36);ctx.lineTo(0,h*.18);ctx.lineTo(w*.10,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.24,h*.64);ctx.lineTo(w*.28,h);ctx.lineTo(w*.58,h*.80);ctx.closePath();}
        else {ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.52,h*.30);ctx.lineTo(w*.34,h*.08);ctx.lineTo(w*.28,h*.38);ctx.lineTo(0,h*.24);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.76);ctx.lineTo(w*.28,h*.62);ctx.lineTo(w*.34,h*.92);ctx.lineTo(w*.52,h*.70);ctx.closePath();}
        ctx.fill();ctx.stroke();
        if(!enemy){ctx.save();ctx.globalAlpha=.85;ctx.fillStyle=accent;ctx.fillRect(w*.18,h*.40,w*.25,h*.20);ctx.restore();}
        ctx.fillStyle=accent;ctx.beginPath();ctx.ellipse(w*.62,cy,w*.13,Math.max(2,h*.12),0,0,Math.PI*2);ctx.fill();
        if(design===2||design===3||design===6){ctx.fillStyle=dark;ctx.fillRect(w*.08,h*.18,w*.10,h*.18);ctx.fillRect(w*.08,h*.64,w*.10,h*.18);}
        if(design===4){ctx.strokeStyle='#d7d7d7';ctx.beginPath();ctx.moveTo(w*.70,cy-h*.32);ctx.lineTo(w*.70,cy+h*.32);ctx.stroke();}
        ctx.restore();
    }
    function draw() {
        if (!ctx) return;
        ctx.clearRect(0,0,W,H);
        const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#071525');g.addColorStop(1,'#101820');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
        ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;for(let i=0;i<18;i++){const y=(i*47+(state.activeMs*.025))%H,x=(i*83)%W;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+16,y);ctx.stroke();}
        const stage=shownStage,enemyDesign=(stage+1)%AIRCRAFT_COUNT,p=state.player;
        ctx.fillStyle='#d8dde2';ctx.font='bold 12px sans-serif';ctx.fillText('AIRCRAFT '+(transition?transition.to+1:stage+1)+' / '+AIRCRAFT_COUNT,12,18);
        if(p){
            if(transition){
                const t=transition.elapsed/TRANSITION_SECONDS;
                const x=t<.5?transition.x+(W+80-transition.x)*(t/.5):(-p.w-12)+(transition.x+p.w+12)*((t-.5)/.5);
                drawAircraft(x,transition.y,p.w,p.h,t<.5?transition.from:transition.to,false,false);
            }else drawAircraft(p.x,p.y,p.w,p.h,stage,false,false);
        }
        state.bullets.forEach(b=>{ctx.fillStyle='#f5e8a8';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();});
        state.enemyBullets.forEach(b=>{ctx.fillStyle='#e46a5e';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();});
        state.healthDrops.forEach(h=>{ctx.save();ctx.translate(h.x,h.y);ctx.fillStyle='#49c86b';ctx.fillRect(0,0,h.w,h.h);ctx.fillStyle='#fff';ctx.fillRect(7,3,4,12);ctx.fillRect(3,7,12,4);ctx.restore();});
        state.enemies.forEach(e=>drawAircraft(e.x,e.y,e.w,e.h,enemyDesign,true,e.tough));
        state.particles.forEach(q=>{ctx.globalAlpha=Math.max(0,q.life/.7);ctx.fillStyle='#e3a34c';ctx.fillRect(q.x,q.y,3,3);ctx.globalAlpha=1;});
    }

    function updateHud() {
        document.getElementById('tpfg-time').textContent=formatTime(state.activeMs);
        document.getElementById('tpfg-score').textContent=Math.floor(state.score).toLocaleString();
        document.getElementById('tpfg-hp').textContent=Math.max(0,Math.ceil(state.hp));
        const stageLabel=document.getElementById('tpfg-aircraft-stage');if(stageLabel)stageLabel.textContent='AIRCRAFT '+(shownStage+1)+' / '+AIRCRAFT_COUNT;
    }

    function formatTime(ms) {
        const s=Math.floor(ms/1000);
        return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    }

    async function finishGame(manual) {
        if (!state.running || state.over) return;
        state.over=true; state.paused=true; transition=null; updateEngineSound(false);
        clearGameSave('flight-arcade');
        const score=Math.floor(state.score);
        saved.highScore=Math.max(Number(saved.highScore||0),score);
        saved.bestKills=Math.max(Number(saved.bestKills||0),state.kills);
        saved.games=Number(saved.games||0)+1;
        await storageSet(saved);

        const now=new Date();
        const stamp=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})+' - '+now.toLocaleDateString();
        const share=`Achieved a Torn PDA Arcade Flight Arcade score of ${score.toLocaleString()}.`;
        document.getElementById('tpfg-rscore').textContent=score.toLocaleString();
        document.getElementById('tpfg-rkills').textContent=state.kills.toLocaleString();
        document.getElementById('tpfg-rtime').textContent=formatTime(state.activeMs);
        document.getElementById('tpfg-rhigh').textContent=Number(saved.highScore).toLocaleString();
        document.getElementById('tpfg-high').textContent=Number(saved.highScore).toLocaleString();
        state.shareText=`${stamp} ${share.replace(/\n/g,' ') } Game Time: ${formatTime(state.activeMs)} | Kills: ${state.kills} | High Score: ${Number(saved.highScore).toLocaleString()}`;
        document.getElementById('tpfg-sharetext').textContent=state.shareText;
        document.getElementById('tpfg-results').style.display='block';
        document.getElementById('tpfg-message').textContent=manual?'GAME ENDED':'';if(!manual)arcadeEndPrompt('flight-arcade',true);
    }

    async function init() {
        injectStyle();
        const existing=await storageGet();
        if (existing && typeof existing==='object') saved={...saved,...existing};
        buildUI();
    }

    let initialized=false;
    async function ensureInitialized(){if(!initialized){await init();initialized=true;}}
    async function activateFlight(){await ensureInitialized();launchGame(Arcade.games.get('flight-arcade'));}
    async function activateStick(){await ensureInitialized();launchGame(Arcade.games.get('stick-figure-fighter'));}
    function deactivateFromTU(){
      StickFighter.stop();closeActiveGame();
      for(const id of ['tpfg-manager','tpfg-prompt','tpfg-game-settings','tpfg-root','tpfg-chatpick'])document.getElementById(id)?.remove();
      canvas=null;ctx=null;initialized=false;
    }
    const definitions=[{id:'stick-fighter',version:TU_MODULE_VERSION,activate:activateStick,deactivate:deactivateFromTU}];
    function registerTU(){if((typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register)for(const definition of definitions)(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities.register(definition);}
    window.addEventListener('torn-utilities-ready',registerTU);registerTU();
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="stick-fighter";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"stick-fighter",version:"0.2.7",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: chat-archiver (0.1.10) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="chat-archiver")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="chat-archiver"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.1.10"}};
const createChatCaptureSupport=function createChatCaptureSupport(){
 const full=/^\d{1,2}:\d{2}:\d{2}\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/;
 function timestamp(root){
  if(!root)return '';for(const el of [root,...root.querySelectorAll('time,[datetime],[data-timestamp],[data-time],[title],[data-original-title]')]){
   for(const key of ['datetime','data-timestamp','data-time','title','data-original-title']){
    const raw=(el.getAttribute(key)||'').trim();if(full.test(raw))return raw;
    if(['datetime','data-timestamp','data-time'].includes(key)&&raw){let date;if(/^\d{10}(?:\d{3})?$/.test(raw))date=new Date(Number(raw)*(raw.length===10?1000:1));else if(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d\d:\d\d)$/.test(raw))date=new Date(raw);if(date&&Number.isFinite(date.getTime()))return date.toISOString();}
   }
  }return '';
 }
 // M'AOL 0.1.29 nativeMessageMeta: bounded read-only React createdAt lookup.
 function nativeMeta(item){
  if(!item)return null;const hits=new Map();let visited=0,conflict=false;
  const data=(object,key)=>{try{const descriptor=Object.getOwnPropertyDescriptor(object,key);return descriptor&&'value' in descriptor?descriptor.value:undefined;}catch{return undefined;}};
  for(const node of [item,item.querySelector('[class*=message___]')].filter(Boolean)){
   for(const key of Object.getOwnPropertyNames(node)){
    if(!key.startsWith('__reactFiber')&&!key.startsWith('__reactProps'))continue;
    const isFiber=key.startsWith('__reactFiber');let fiber=data(node,key);
    for(let depth=0;fiber&&depth<4;depth++,fiber=isFiber?data(fiber,'return'):null){
     const seen=new WeakSet();
     function walk(value,level){
      if(!value||typeof value!=='object'||seen.has(value)||level>7||++visited>1200||data(value,'nodeType'))return;seen.add(value);
      const id=typeof data(value,'id')==='string'?data(value,'id'):typeof data(value,'messageId')==='string'?data(value,'messageId'):null,at=data(value,'createdAt');
      if(id&&typeof at==='number'&&at>1500000000000&&at<2200000000000){if(hits.has(id)&&hits.get(id).at!==at)conflict=true;hits.set(id,{id,at});}
      for(const field of Object.keys(value).slice(0,60)){if(/token|auth|secret|password|cookie|apiKey/i.test(field))continue;const child=data(value,field);if(child&&typeof child==='object'&&!data(child,'nodeType')&&!data(child,'stateNode'))walk(child,level+1);}
     }
     walk(isFiber?data(fiber,'memoizedProps'):fiber,0);
    }
   }
  }
  return !conflict&&visited<=1200&&hits.size===1?[...hits.values()][0]:null;
 }
 function applyNative(record,item){const meta=nativeMeta(item);if(!meta||record.sourceMessageId&&record.sourceMessageId!==meta.id)return false;record.sourceMessageId=meta.id;record.exactTimestamp=new Date(meta.at).toISOString();record.exactTimestampUnixMs=meta.at;record.exactTimestampSource='torn-react-createdAt';return true;}
 function interrupted(before,after){return !!before&&(after.top-before.top>Math.max(80,after.viewport/2))&&Math.abs(after.height-before.height)<40&&after.height-after.viewport-after.top<40;}
 return {timestamp,nativeMeta,applyNative,interrupted};
};
(function () {
    'use strict';
    // TU v0.3 storage bridge. Existing legacy keys remain readable and are migrated
    // on first access; modules continue to work if TU loads later or is absent.
    const TU_NAMESPACE = 'chat-archiver';
    const legacyStore = window.localStorage;
    const tuStorage = () => window.TornUtilities?.storage;
    const moduleStore = {
        getItem(key) {
            const name = String(key);
            const tu = tuStorage();
            if (tu) {
                try {
                    const value = tu.get(TU_NAMESPACE, name, null);
                    if (typeof value === 'string') return value;
                } catch (_) {}
            }
            const old = legacyStore.getItem(name);
            if (old !== null && tu) {
                try { tu.set(TU_NAMESPACE, name, old); } catch (_) {}
            }
            return old;
        },
        setItem(key, value) {
            const name = String(key), text = String(value);
            const tu = tuStorage();
            if (tu) {
                // Preserve existing legacy data until the shared write succeeds.
                tu.set(TU_NAMESPACE, name, text);
            } else {
                legacyStore.setItem(name, text);
            }
        },
        removeItem(key) {
            const name = String(key);
            const tu = tuStorage();
            if (tu) tu.remove(TU_NAMESPACE, name);
            legacyStore.removeItem(name);
        }
    };


    /* =========================================================
       CONFIG
       ========================================================= */

    const SETTINGS_KEY = 'RelaxSweety_TCA_PDA_v01_settings';
    const PANEL_POS_KEY = 'RelaxSweety_TCA_PDA_v01_panelPosition';
    const PANEL_MIN_KEY = 'RelaxSweety_TCA_PDA_v01_minimized';

    const chatSupport=typeof createChatCaptureSupport==='function'?createChatCaptureSupport():null;
    let lastDiagnosticAt=0;
    const chatEvent=(event,fields={})=>{try{document.dispatchEvent(new CustomEvent('tu-chat-diagnostic',{detail:JSON.stringify({event,running:autoRunning,...fields})}));}catch{}};
    const scrollMetrics=scroller=>({top:scroller.scrollTop,height:scroller.scrollHeight,viewport:scroller.clientHeight});
    function detectHistoryReset(before,scroller){
        if(!chatSupport?.interrupted(before,scrollMetrics(scroller)))return false;
        autoRunning=false;autoPaused=true;chatEvent('scroll-interrupted',scrollMetrics(scroller));
        setStatus('History scrolling interrupted: chat returned to latest messages. Archive retained; restore your history position and resume.');updateIndicators();return true;
    }
    let scrollStep = 20;
    let scrollDelay = 40;

    const NO_NEW_RESULTS_MS = 5000;
    const END_RETRY_WAIT_MS = 5000;
    const STALL_GRACE_MS = 5000;
    const SCAN_THROTTLE = 100;
    const SCAN_DEBOUNCE = 75;
    const LIVE_MESSAGE_YIELD_MS = 250;

    const FULL_TIMESTAMP =
        /^\d{1,2}:\d{2}:\d{2}\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/;

    const GROUP_TIMESTAMP_PATTERNS = [
        /^Today\s+\d{1,2}:\d{2}$/i,
        /^Yesterday\s+\d{1,2}:\d{2}$/i,
        /^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}$/i,
        /^[A-Za-z]{3,9}\s+\d{1,2}:\d{2}$/i
    ];

    /* =========================================================
       STATE
       ========================================================= */

    let selectedChatId = '';
    let selectedChatName = '';
    let selectedChatType = '';

    let archive = new Map();
    let messageOrder = [];
    let privateIdCounter = 0;
    let sessionNumber = 0;

    let captureActive = false;
    let autoEnabled = false;
    let autoRunning = false;
    let autoPaused = false;

    let archiveComplete = false;
    let completionPromptOpen = false;

    let autoRunId = 0;

    let observer = null;
    let scanTimer = null;
    let currentScroller = null;

    let lastScrollScan = 0;
    let lastHistoricalProgressAt = 0;
    let autoStartedAt = 0;

    let rememberedOldestGroup = '';

    let customPromptResolver = null;
    let currentStatusNote = 'Ready';

    let autoYieldUntil = 0;

    /* =========================================================
       HELPERS
       ========================================================= */

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function escapeHTML(text) {
        return String(text ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function sanitizeFilename(text) {
        return String(text || 'chat')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function getTop(el) {
        try {
            return el.getBoundingClientRect().top;
        } catch {
            return 0;
        }
    }

    function isGroupTimestamp(text) {
        text = String(text || '').trim();
        return GROUP_TIMESTAMP_PATTERNS.some(pattern => pattern.test(text));
    }

    function getRecordSignature(record) {
        return [
            record.isSelf ? '1' : '0',
            record.playerId || '',
            record.player || '',
            record.message || ''
        ].join('\u241F');
    }

    function getRenderedSignature(record) {
        return [
            record.isSelf ? '1' : '0',
            record.playerId || '',
            record.player || '',
            record.message || ''
        ].join('\u241F');
    }

    function generatePrivateId() {
        privateIdCounter++;

        return [
            'private',
            sessionNumber,
            selectedChatId,
            Date.now().toString(36),
            privateIdCounter.toString(36)
        ].join('-');
    }

    function resetSessionArchive() {
        archive = new Map();
        messageOrder = [];
        privateIdCounter = 0;
        rememberedOldestGroup = '';

        lastHistoricalProgressAt = performance.now();
        lastScrollScan = 0;

        archiveComplete = false;
        autoPaused = false;
        completionPromptOpen = false;

        autoYieldUntil = 0;

        sessionNumber++;

        updateStatus();
    }

    function markHistoricalProgress(count) {
        if (count > 0) {
            lastHistoricalProgressAt = performance.now();
        }
    }

    function beginLiveMessageYield() {
        if (!autoRunning || completionPromptOpen) return;

        autoYieldUntil = Math.max(
            autoYieldUntil,
            performance.now() + LIVE_MESSAGE_YIELD_MS
        );

        currentStatusNote =
            'Live message detected — allowing Torn chat to settle';

        updateStatus();
    }

    /* =========================================================
       v1.9 USER-SCROLL EMULATION
       ========================================================= */

    function notifyTornOfUpwardScroll(scroller, amount) {
        if (!scroller) return;

        /*
         * A normal scrollTop assignment generates a scroll event,
         * but not a wheel event.
         *
         * Manual mouse-wheel scrolling generates the wheel event
         * BEFORE the browser changes the scroll position.
         *
         * v1.9 duplicates that order:
         *
         *   1. wheel event
         *   2. scrollTop movement
         *
         * The event bubbles, allowing React/Torn listeners on
         * ancestors to see it as well.
         */

        try {
            const rect = scroller.getBoundingClientRect();

            const wheelEvent = new WheelEvent('wheel', {
                bubbles: true,
                cancelable: true,
                composed: true,

                deltaX: 0,
                deltaY: -Math.abs(amount),
                deltaZ: 0,
                deltaMode: WheelEvent.DOM_DELTA_PIXEL,

                clientX: Math.round(rect.left + rect.width / 2),
                clientY: Math.round(rect.top + rect.height / 2),

                screenX: 0,
                screenY: 0,

                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false
            });

            scroller.dispatchEvent(wheelEvent);

        } catch (error) {
            /*
             * Wheel emulation failing must never stop the archive.
             */
        }
    }

    function performAutoScrollStep(scroller) {
        if (!scroller) return;

        /*
         * Tell Torn about the upward scrolling first.
         */
        notifyTornOfUpwardScroll(
            scroller,
            scrollStep
        );

        /*
         * Then perform the actual movement.
         */
        const current = scroller.scrollTop;

        scroller.scrollTop = Math.max(
            0,
            current - scrollStep
        );
    }

    /* =========================================================
       CHAT DISCOVERY
       ========================================================= */

    function discoverChats() {
        const chats = [];
        const seen = new Set();

        const textareas = document.querySelectorAll(
            'textarea[placeholder="Type your message here..."]'
        );

        for (const textarea of textareas) {
            let root = textarea;

            for (
                let level = 0;
                level < 8 && root;
                level++, root = root.parentElement
            ) {
                const id = root.id || '';

                const cls =
                    typeof root.className === 'string'
                        ? root.className
                        : '';

                if (
                    id &&
                    (
                        cls.includes('root___Ex8tg') ||
                        id === 'global' ||
                        id === 'trade' ||
                        id === 'faction' ||
                        /^\d+$/.test(id)
                    )
                ) {
                    break;
                }
            }

            if (!root || !root.id || seen.has(root.id)) continue;

            seen.add(root.id);

            const id = root.id;

            let type = 'Private';

            if (id === 'global') {
                type = 'Global';
            } else if (id === 'trade') {
                type = 'Trade';
            } else if (id === 'faction') {
                type = 'Faction';
            }

            let name = '';

            if (type === 'Private') {
                const title = root.querySelector('[class*="title___"]');

                const profile =
                    root.querySelector(
                        `a[href*="/profiles.php?XID=${id}"]`
                    ) ||
                    root.querySelector(
                        'a[href*="/profiles.php?XID="]'
                    );

                const titleSpan =
                    profile?.parentElement?.querySelector('span[title]');

                name =
                    title?.textContent?.trim() ||
                    titleSpan?.getAttribute('title') ||
                    titleSpan?.textContent?.trim() ||
                    `Private ${id}`;

            } else {
                const lines = (root.innerText || '')
                    .split('\n')
                    .map(x => x.trim())
                    .filter(Boolean);

                name = lines[0] || type;
            }

            chats.push({
                id,
                name,
                type,
                root
            });
        }

        return chats;
    }

    function getSelectedChat() {
        if (!selectedChatId) return null;
        return document.getElementById(selectedChatId);
    }

    function getChatLabel(chat) {
        if (!chat) return '';

        if (chat.type === 'Private') {
            return `${chat.name} [Private]`;
        }

        if (chat.type === 'Faction') {
            return `${chat.name} [Faction]`;
        }

        return chat.name;
    }

    /* =========================================================
       PRIVATE PARTICIPANT
       ========================================================= */

    function getPrivateParticipant() {
        const chat = getSelectedChat();

        if (!chat) {
            return {
                player: selectedChatName,
                playerId: selectedChatId
            };
        }

        const profile =
            chat.querySelector(
                `a[href*="/profiles.php?XID=${selectedChatId}"]`
            ) ||
            chat.querySelector(
                'a[href*="/profiles.php?XID="]'
            );

        let playerId = selectedChatId;

        if (profile) {
            try {
                playerId =
                    new URL(profile.href, location.origin)
                        .searchParams
                        .get('XID') ||
                    selectedChatId;
            } catch {}
        }

        const title = chat.querySelector('[class*="title___"]');

        const titleSpan =
            profile?.parentElement?.querySelector('span[title]');

        const player =
            title?.textContent?.trim() ||
            titleSpan?.getAttribute('title') ||
            titleSpan?.textContent?.trim() ||
            selectedChatName ||
            `Player ${playerId}`;

        return {
            player,
            playerId
        };
    }

    /* =========================================================
       SCROLLER
       ========================================================= */

    function getScroller() {
        const chat = getSelectedChat();

        if (!chat) return null;

        const known =
            chat.querySelector('[class*="scrollWrapper___"]');

        if (
            known &&
            known.scrollHeight > known.clientHeight + 20
        ) {
            return known;
        }

        const candidates =
            [...chat.querySelectorAll('*')]
                .filter(el =>
                    el.scrollHeight > el.clientHeight + 20
                )
                .sort(
                    (a, b) =>
                        (b.scrollHeight - b.clientHeight) -
                        (a.scrollHeight - a.clientHeight)
                );

        return candidates[0] || null;
    }

    /* =========================================================
       STANDARD MESSAGE EXTRACTION
       ========================================================= */

    function extractStandardMessage(sender) {
        try {
            const playerId =
                new URL(sender.href, location.origin)
                    .searchParams
                    .get('XID');

            if (!playerId) return null;

            const messageId =
                (sender.id || '').split(':')[0];

            if (!messageId) return null;

            const senderContainer =
                sender.closest('[class*="senderContainer"]');

            if (!senderContainer) return null;

            const box = senderContainer.parentElement;

            if (!box) return null;

            const body =
                box.querySelector('[class*="message___"]');

            if (!body) return null;

            const virtualItem =
                box.closest('[class*="virtualItem"]');

            if (!virtualItem) return null;

            const wrapper =
                virtualItem.parentElement || virtualItem;

            return {
                messageId,

                player:
                    sender.textContent
                        .trim()
                        .replace(/:$/, ''),

                playerId,

                isSelf: false,

                message:
                    body.textContent.trim(),

                virtualItem,
                wrapper,
                body,
                box,

                top:
                    getTop(wrapper)
            };

        } catch {
            return null;
        }
    }

    /*
     * PDA can omit desktop sender link IDs. Use the existing desktop
     * extractor first, then discover messages from their body nodes.
     * Only accept a message when a nearby profile link identifies
     * its sender. Stable DOM identifiers prevent duplicate capture.
     */
    function extractPdaStandardFallback(chat, existing) {
        const seen = new Set(existing.map(m => m.messageId));
        const bodies = chat.querySelectorAll('[class*="message___"]');
        const recovered = [];
        for (const body of bodies) {
            const message = body.textContent?.trim();
            if (!message) continue;
            const box = body.closest('[class*="virtualItem"]') ||
                        body.closest('[class*="messageContainer"]') ||
                        body.parentElement?.parentElement;
            if (!box) continue;
            const sender = box.querySelector('a[href*="profiles.php?XID="]') ||
                           body.parentElement?.parentElement?.querySelector('a[href*="profiles.php?XID="]');
            if (!sender) continue;
            let playerId;
            try {
                playerId = new URL(sender.href, location.origin).searchParams.get('XID');
            } catch { continue; }
            if (!playerId) continue;
            const rawId = sender.id?.split(':')[0] ||
                          box.getAttribute('data-message-id') ||
                          box.getAttribute('data-id') ||
                          box.id;
            if (!rawId) continue;
            const messageId = String(rawId);
            if (seen.has(messageId)) continue;
            seen.add(messageId);
            recovered.push({
                messageId, player: sender.textContent?.trim().replace(/:$/, '') || 'Unknown',
                playerId, isSelf: false, message,
                virtualItem: box, wrapper: box, body, box,
                top: getTop(box)
            });
        }
        return recovered;
    }

    function buildStandardRenderedMessages() {
        const chat = getSelectedChat();

        if (!chat) return [];

        const senders =
            chat.querySelectorAll(
                'a[href*="/profiles.php?XID="][id*=":"]'
            );

        const messages = [];

        for (const sender of senders) {
            const msg = extractStandardMessage(sender);

            if (msg) messages.push(msg);
        }

        messages.push(...extractPdaStandardFallback(chat, messages));
        messages.sort((a, b) => a.top - b.top);

        return messages;
    }

    /* =========================================================
       PRIVATE MESSAGE EXTRACTION
       ========================================================= */

    function buildPrivateRenderedMessages() {
        const chat = getSelectedChat();

        if (!chat) return [];

        const participant =
            getPrivateParticipant();

        const items =
            [...chat.querySelectorAll('[class*="virtualItem"]')];
        if (!items.length) {
            for (const body of chat.querySelectorAll('[class*="message___"]')) {
                const container = body.closest('[class*="messageContainer"]') ||
                                  body.parentElement?.parentElement;
                if (container && !items.includes(container)) items.push(container);
            }
        }

        const messages = [];

        for (const item of items) {
            const body =
                item.matches('[class*="message___"]')
                    ? item
                    : item.querySelector('[class*="message___"]');

            if (!body) continue;

            const message =
                body.textContent?.trim() || '';

            if (!message) continue;

            const root = item.firstElementChild;

            const rootClass =
                typeof root?.className === 'string'
                    ? root.className
                    : '';

            const isSelf =
                rootClass.includes('self___') ||
                !!item.querySelector('[class*="self___"]');

            const wrapper =
                item.parentElement || item;

            messages.push({
                messageId: null,

                player:
                    isSelf
                        ? 'RelaxSweety'
                        : participant.player,

                playerId:
                    isSelf
                        ? ''
                        : participant.playerId,

                isSelf,

                message,

                virtualItem: item,
                wrapper,
                body,

                box:
                    body.closest('[data-is-tooltip-opened]') ||
                    body.parentElement,

                top:
                    getTop(wrapper)
            });
        }

        messages.sort((a, b) => a.top - b.top);

        return messages;
    }

    /* =========================================================
       GROUP TIMESTAMPS
       ========================================================= */

    function collectGroupSeparators() {
        const chat = getSelectedChat();

        if (!chat) return [];

        const results = [];
        const seen = new Set();

        const candidates =
            chat.querySelectorAll('div, span, p');

        for (const el of candidates) {
            if (
                el.children.length > 2 ||
                seen.has(el)
            ) {
                continue;
            }

            const text =
                el.textContent?.trim() || '';

            if (
                !text ||
                text.length > 40 ||
                !isGroupTimestamp(text)
            ) {
                continue;
            }

            seen.add(el);

            results.push({
                text,
                top: getTop(el)
            });
        }

        results.sort((a, b) => a.top - b.top);

        const cleaned = [];

        for (const item of results) {
            const duplicate =
                cleaned.some(
                    existing =>
                        existing.text === item.text &&
                        Math.abs(existing.top - item.top) < 3
                );

            if (!duplicate) {
                cleaned.push(item);
            }
        }

        return cleaned;
    }

    function assignGroupTimestamps(messages, separators) {
        const result = new Map();

        let current =
            rememberedOldestGroup || '';

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            for (const separator of separators) {
                if (separator.top <= message.top + 2) {
                    current = separator.text;
                } else {
                    break;
                }
            }

            if (current) {
                result.set(i, current);
            }
        }

        if (separators.length) {
            rememberedOldestGroup =
                separators[0].text;
        }

        return result;
    }

    /* =========================================================
       PRIVATE OVERLAP
       ========================================================= */

    function findBestPrivateOverlap(rendered) {
        if (
            !rendered.length ||
            !messageOrder.length
        ) {
            return null;
        }

        const renderedSigs =
            rendered.map(getRenderedSignature);

        const archiveSigs =
            messageOrder.map(id => {
                const record = archive.get(id);

                return record
                    ? getRecordSignature(record)
                    : '';
            });

        let best = null;

        for (
            let offset = -rendered.length + 1;
            offset < archiveSigs.length;
            offset++
        ) {
            let compared = 0;
            let matches = 0;

            for (
                let r = 0;
                r < renderedSigs.length;
                r++
            ) {
                const a = offset + r;

                if (
                    a < 0 ||
                    a >= archiveSigs.length
                ) {
                    continue;
                }

                compared++;

                if (
                    renderedSigs[r] ===
                    archiveSigs[a]
                ) {
                    matches++;
                }
            }

            if (!compared) continue;
            if (matches !== compared) continue;

            if (
                !best ||
                compared > best.compared
            ) {
                best = {
                    offset,
                    compared
                };
            }
        }

        return best;
    }

    function addPrivateRecord(rendered, groupTimestamp = '') {
        const id = generatePrivateId();

        const record = {
            chat: selectedChatName,
            chatId: selectedChatId,

            messageId: id,
            sourceMessageId: '',

            player: rendered.player,
            playerId: rendered.playerId,

            isSelf: rendered.isSelf,

            exactTimestamp: chatSupport?.timestamp(rendered.virtualItem||rendered.box)||'',

            groupTimestamp:
                groupTimestamp || '',

            message:
                rendered.message
        };

        chatSupport?.applyNative(record,rendered.virtualItem||rendered.box);
        archive.set(id, record);

        return id;
    }

    /* =========================================================
       PRIVATE CAPTURE
       ========================================================= */

    function capturePrivateMessages() {
        const rendered =
            buildPrivateRenderedMessages();

        if (!rendered.length) {
            return {
                added: 0,
                historicalAdded: 0,
                liveAdded: 0,
                updated: 0
            };
        }

        const nativeRows=rendered.map(message=>({message,meta:chatSupport?.nativeMeta(message.virtualItem||message.box)}));
        if(nativeRows.length&&nativeRows.every(row=>row.meta)){
            const groups=assignGroupTimestamps(rendered,collectGroupSeparators());let added=0,historicalAdded=0,updated=0;const known=new Map([...archive.values()].filter(r=>r.sourceMessageId).map(r=>[r.sourceMessageId,r]));
            const earliest=Math.min(...[...archive.values()].map(r=>r.exactTimestampUnixMs).filter(Number.isFinite));
            nativeRows.forEach(({message,meta},index)=>{let record=known.get(meta.id);if(!record){const id=addPrivateRecord(message,groups.get(index)||'');record=archive.get(id);messageOrder.push(id);added++;if(Number.isFinite(earliest)&&meta.at<earliest)historicalAdded++;}else if(chatSupport.applyNative(record,message.virtualItem||message.box))updated++;});
            if(added)messageOrder.sort((a,b)=>(archive.get(a).exactTimestampUnixMs||0)-(archive.get(b).exactTimestampUnixMs||0));
            return {added,historicalAdded,liveAdded:added-historicalAdded,updated};
        }
        const separators =
            collectGroupSeparators();

        const groups =
            assignGroupTimestamps(
                rendered,
                separators
            );

        let added = 0;
        let historicalAdded = 0;
        let liveAdded = 0;
        let updated = 0;

        if (!messageOrder.length) {
            for (
                let i = 0;
                i < rendered.length;
                i++
            ) {
                const id =
                    addPrivateRecord(
                        rendered[i],
                        groups.get(i) || ''
                    );

                messageOrder.push(id);
                added++;
            }

            return {
                added,
                historicalAdded: 0,
                liveAdded: 0,
                updated
            };
        }

        const overlap =
            findBestPrivateOverlap(rendered);

        if (!overlap) {
            return {
                added: 0,
                historicalAdded: 0,
                liveAdded: 0,
                updated: 0
            };
        }

        const { offset } = overlap;

        const olderCount =
            Math.max(0, -offset);

        if (olderCount) {
            const olderIds = [];

            for (
                let r = 0;
                r < olderCount;
                r++
            ) {
                const id =
                    addPrivateRecord(
                        rendered[r],
                        groups.get(r) || ''
                    );

                olderIds.push(id);

                added++;
                historicalAdded++;
            }

            messageOrder =
                olderIds.concat(messageOrder);
        }

        const correctedOffset =
            offset + olderCount;

        for (
            let r = olderCount;
            r < rendered.length;
            r++
        ) {
            const archiveIndex =
                correctedOffset + r;

            if (
                archiveIndex < 0 ||
                archiveIndex >= messageOrder.length
            ) {
                continue;
            }

            const id =
                messageOrder[archiveIndex];

            const record =
                archive.get(id);

            if (!record) continue;

            const group =
                groups.get(r) || '';

            if (
                group &&
                !record.groupTimestamp
            ) {
                record.groupTimestamp = group;
                updated++;
            }
        }

        const firstNewerRenderedIndex =
            Math.max(
                olderCount,
                messageOrder.length -
                    correctedOffset
            );

        for (
            let r = firstNewerRenderedIndex;
            r < rendered.length;
            r++
        ) {
            const id =
                addPrivateRecord(
                    rendered[r],
                    groups.get(r) || ''
                );

            messageOrder.push(id);

            added++;
            liveAdded++;
        }

        return {
            added,
            historicalAdded,
            liveAdded,
            updated
        };
    }

    /* =========================================================
       STANDARD CAPTURE
       ========================================================= */

    function captureStandardMessages() {
        const messages =
            buildStandardRenderedMessages();

        if (!messages.length) {
            return {
                added: 0,
                historicalAdded: 0,
                liveAdded: 0,
                updated: 0
            };
        }

        const separators =
            collectGroupSeparators();

        const groups =
            assignGroupTimestamps(
                messages,
                separators
            );

        let added = 0;
        let historicalAdded = 0;
        let liveAdded = 0;
        let updated = 0;

        const knownIndices = [];

        for (let i = 0; i < messages.length; i++) {
            if (
                archive.has(
                    messages[i].messageId
                )
            ) {
                knownIndices.push(i);
            }
        }

        const initialWindow =
            archive.size === 0;

        const firstKnown =
            knownIndices.length
                ? knownIndices[0]
                : -1;

        const lastKnown =
            knownIndices.length
                ? knownIndices[knownIndices.length - 1]
                : -1;

        const olderIds = [];
        const newerIds = [];

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];

            const groupTimestamp =
                groups.get(i) || '';

            let record =
                archive.get(msg.messageId);

            if (!record) {
                record = {
                    chat:
                        selectedChatName,

                    chatId:
                        selectedChatId,

                    messageId:
                        msg.messageId,

                    sourceMessageId:
                        msg.messageId,

                    player:
                        msg.player,

                    playerId:
                        msg.playerId,

                    isSelf:
                        false,

                    exactTimestamp:
                        chatSupport?.timestamp(msg.virtualItem||msg.box)||'',

                    groupTimestamp,

                    message:
                        msg.message
                };

                chatSupport?.applyNative(record,msg.virtualItem||msg.box);
                archive.set(
                    msg.messageId,
                    record
                );

                added++;

                if (initialWindow) {
                    newerIds.push(
                        msg.messageId
                    );

                } else if (knownIndices.length) {

                    if (i < firstKnown) {
                        olderIds.push(
                            msg.messageId
                        );

                        historicalAdded++;

                    } else if (i > lastKnown) {
                        newerIds.push(
                            msg.messageId
                        );

                        liveAdded++;

                    } else {
                        newerIds.push(
                            msg.messageId
                        );

                        liveAdded++;
                    }

                } else {
                    newerIds.push(
                        msg.messageId
                    );
                }

            } else {
                if(chatSupport?.applyNative(record,msg.virtualItem||msg.box))updated++;
                if (
                    groupTimestamp &&
                    !record.groupTimestamp
                ) {
                    record.groupTimestamp =
                        groupTimestamp;

                    updated++;
                }

                if (
                    record.message !==
                    msg.message
                ) {
                    record.message =
                        msg.message;

                    updated++;
                }
            }
        }

        if (olderIds.length) {
            messageOrder =
                olderIds.concat(
                    messageOrder
                );
        }

        for (const id of newerIds) {
            if (!messageOrder.includes(id)) {
                messageOrder.push(id);
            }
        }

        return {
            added,
            historicalAdded,
            liveAdded,
            updated
        };
    }

    /* =========================================================
       SCAN
       ========================================================= */

    function scan() {
        if (!captureActive) {
            return {
                added: 0,
                historicalAdded: 0,
                liveAdded: 0,
                updated: 0
            };
        }

        let result;

        if (selectedChatType === 'Private') {
            result =
                capturePrivateMessages();
        } else {
            result =
                captureStandardMessages();
        }

        if (result.historicalAdded > 0) {
            markHistoricalProgress(
                result.historicalAdded
            );
        }

        if (
            result.liveAdded > 0 &&
            autoRunning &&
            !completionPromptOpen
        ) {
            beginLiveMessageYield();
        }

        if(performance.now()-lastDiagnosticAt>250){lastDiagnosticAt=performance.now();const values=[...archive.values()];chatEvent('scan',{historicalAdded:result.historicalAdded,liveAdded:result.liveAdded,total:archive.size,exactTimes:values.filter(r=>r.exactTimestamp).length,groupTimes:values.filter(r=>r.groupTimestamp).length});}
        updateStatus();

        return result;
    }

    function scheduleScan() {
        if (!captureActive) return;

        clearTimeout(scanTimer);

        scanTimer =
            setTimeout(
                scan,
                SCAN_DEBOUNCE
            );
    }

    function scanDuringScroll() {
        if (!captureActive) return;

        const now =
            performance.now();

        if (
            now - lastScrollScan >=
            SCAN_THROTTLE
        ) {
            lastScrollScan = now;
            scan();
        }

        scheduleScan();
    }

    function handleChatMutation() {
        if (!captureActive) return;

        const result = scan();

        if (
            result.liveAdded > 0 &&
            autoRunning
        ) {
            beginLiveMessageYield();
        }

        scheduleScan();
    }

    /* =========================================================
       EXACT TIMESTAMP
       ========================================================= */

    function getVisibleExactTimestamp() {
        const elements =
            document.querySelectorAll(
                'body p, body span'
            );

        for (const el of elements) {
            const text =
                el.textContent?.trim() || '';

            if (
                FULL_TIMESTAMP.test(text) &&
                el.getClientRects().length
            ) {
                return text;
            }
        }

        return '';
    }

    document.addEventListener(
        'mousemove',

        event => {
            if (!captureActive) return;

            const timestamp =
                getVisibleExactTimestamp();

            if (!timestamp) return;

            const target =
                document.elementFromPoint(
                    event.clientX,
                    event.clientY
                );

            if (!target) return;

            const chat =
                getSelectedChat();

            if (
                !chat ||
                !chat.contains(target)
            ) {
                return;
            }

            const item =
                target.closest(
                    '[class*="virtualItem"]'
                );

            if (!item) return;

            if (
                selectedChatType !== 'Private'
            ) {
                const sender =
                    item.querySelector(
                        'a[href*="/profiles.php?XID="][id*=":"]'
                    );

                if (!sender) return;

                const msg =
                    extractStandardMessage(sender);

                if (!msg) return;

                const record =
                    archive.get(
                        msg.messageId
                    );

                if (
                    record &&record.exactTimestampSource!=='torn-react-createdAt'&&
                    record.exactTimestamp !==
                        timestamp
                ) {
                    record.exactTimestamp =
                        timestamp;record.exactTimestampSource='torn-hover-tooltip';

                    updateStatus();
                }

                return;
            }

            const rendered =
                buildPrivateRenderedMessages();

            const renderedIndex =
                rendered.findIndex(
                    msg =>
                        msg.virtualItem === item
                );

            if (renderedIndex < 0) return;

            const overlap =
                findBestPrivateOverlap(
                    rendered
                );

            if (!overlap) return;

            const olderCount =
                Math.max(
                    0,
                    -overlap.offset
                );

            const archiveIndex =
                overlap.offset +
                olderCount +
                renderedIndex;

            const id =
                messageOrder[
                    archiveIndex
                ];

            if (!id) return;

            const record =
                archive.get(id);

            if (
                record &&record.exactTimestampSource!=='torn-react-createdAt'&&
                record.exactTimestamp !==
                    timestamp
            ) {
                record.exactTimestamp =
                    timestamp;record.exactTimestampSource='torn-hover-tooltip';

                updateStatus();
            }
        },

        {
            passive: true
        }
    );

    /* =========================================================
       CHAT SELECTION
       ========================================================= */

    function refreshChatSelector(
        preserveSelection = true
    ) {
        const select =
            document.getElementById(
                'tca-chat-select'
            );

        if (!select) return;

        const previous =
            preserveSelection
                ? selectedChatId
                : '';

        const chats =
            discoverChats();

        select.innerHTML = '';

        if (!chats.length) {
            const option =
                document.createElement(
                    'option'
                );

            option.value = '';
            option.textContent =
                'No open chats detected';

            select.appendChild(option);

            return;
        }

        for (const chat of chats) {
            const option =
                document.createElement(
                    'option'
                );

            option.value =
                chat.id;

            option.textContent =
                getChatLabel(chat);

            select.appendChild(option);
        }

        const chosen =
            chats.find(
                chat =>
                    chat.id === previous
            ) ||
            chats.find(
                chat =>
                    chat.id === 'faction'
            ) ||
            chats[0];

        select.value =
            chosen.id;

        switchChat(
            chosen.id
        );
    }

    function switchChat(chatId) {
        if (
            captureActive &&
            chatId !== selectedChatId
        ) {
            const select =
                document.getElementById(
                    'tca-chat-select'
                );

            if (select) {
                select.value =
                    selectedChatId;
            }

            alert(
                'Turn Capture off before switching chats.'
            );

            return;
        }

        const chat =
            discoverChats().find(
                item =>
                    item.id === chatId
            );

        if (!chat) return;

        selectedChatId =
            chat.id;

        selectedChatName =
            chat.name;

        selectedChatType =
            chat.type;

        archive = new Map();
        messageOrder = [];
        privateIdCounter = 0;
        rememberedOldestGroup = '';

        archiveComplete = false;
        autoPaused = false;
        completionPromptOpen = false;

        autoYieldUntil = 0;

        lastHistoricalProgressAt =
            performance.now();

        setStatus(
            `Selected ${getChatLabel(chat)} — ready for new session`
        );
    }

    /* =========================================================
       YES / NO PROMPT
       ========================================================= */

    function showYesNoPrompt(
        title,
        question
    ) {
        return new Promise(
            resolve => {
                const overlay =
                    document.getElementById(
                        'tca-prompt-overlay'
                    );

                const titleEl =
                    document.getElementById(
                        'tca-prompt-title'
                    );

                const questionEl =
                    document.getElementById(
                        'tca-prompt-question'
                    );

                const yesButton =
                    document.getElementById(
                        'tca-prompt-yes'
                    );

                const noButton =
                    document.getElementById(
                        'tca-prompt-no'
                    );

                if (
                    !overlay ||
                    !titleEl ||
                    !questionEl ||
                    !yesButton ||
                    !noButton
                ) {
                    resolve(false);
                    return;
                }

                titleEl.textContent =
                    title;

                questionEl.textContent =
                    question;

                overlay.style.display =
                    'flex';

                customPromptResolver =
                    answer => {
                        overlay.style.display =
                            'none';

                        customPromptResolver =
                            null;

                        resolve(answer);
                    };

                yesButton.onclick =
                    () => {
                        if (customPromptResolver) {
                            customPromptResolver(true);
                        }
                    };

                noButton.onclick =
                    () => {
                        if (customPromptResolver) {
                            customPromptResolver(false);
                        }
                    };
            }
        );
    }

    /* =========================================================
       CAPTURE CONTROL
       ========================================================= */

    function startCapture() {
        if (captureActive) return;

        const chat =
            getSelectedChat();

        const scroller =
            getScroller();

        if (
            !chat ||
            !scroller
        ) {
            alert(
                'Select an open chat first.'
            );

            return;
        }

        resetSessionArchive();

        captureActive = true;
        currentScroller = scroller;
        hideFullPanel();

        scan();

        lastHistoricalProgressAt =
            performance.now();

        observer =
            new MutationObserver(
                handleChatMutation
            );

        observer.observe(
            chat,
            {
                childList: true,
                subtree: true
            }
        );

        currentScroller.addEventListener(
            'scroll',
            scanDuringScroll,
            {
                passive: true
            }
        );

        updateIndicators();

        if (autoEnabled) {
            setStatus(
                'New archive session started — Auto armed'
            );

            setTimeout(
                () => {
                    if (
                        captureActive &&
                        autoEnabled &&
                        !archiveComplete
                    ) {
                        startAutoRun();
                    }
                },
                150
            );

        } else {
            setStatus(
                'New archive session started'
            );
        }
    }

    function stopCapture(
        note = ''
    ) {
        if (captureActive) {
            scan();
        }

        captureActive = false;

        stopAutoRun(false);

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (currentScroller) {
            currentScroller.removeEventListener(
                'scroll',
                scanDuringScroll
            );

            currentScroller = null;
        }

        clearTimeout(scanTimer);

        autoYieldUntil = 0;

        updateIndicators();

        setStatus(
            note ||
            (
                autoEnabled
                    ? 'Capture off — Auto armed'
                    : 'Capture stopped'
            )
        );
    }

    /* =========================================================
       AUTO CONTROL
       ========================================================= */

    function toggleAutoSetting() {
        autoEnabled =
            !autoEnabled;

        if (!autoEnabled) {
            autoPaused = false;

            stopAutoRun(false);

            autoYieldUntil = 0;

            updateIndicators();

            setStatus(
                captureActive
                    ? 'Capture running — Auto off'
                    : 'Auto off'
            );

            return;
        }

        updateIndicators();

        if (!captureActive) {
            setStatus(
                'Auto armed — waiting for Capture'
            );

            return;
        }

        archiveComplete = false;
        autoPaused = false;

        setStatus(
            'Auto armed — starting'
        );

        startAutoRun();
    }

    /* =========================================================
       FINISH
       ========================================================= */

    function finishArchivingSession() {
        archiveComplete = true;
        autoPaused = false;
        completionPromptOpen = false;

        autoEnabled = false;
        autoYieldUntil = 0;

        stopCapture(
            'ARCHIVING COMPLETE — ready to export'
        );

        updateIndicators();
    }

    /* =========================================================
       NO NEW HISTORY
       ========================================================= */

    async function handleNoNewResults(
        runId
    ) {
        if (
            completionPromptOpen ||
            !autoRunning ||
            !autoEnabled ||
            !captureActive ||
            runId !== autoRunId
        ) {
            return;
        }

        autoRunning = false;
        autoRunId++;

        autoPaused = true;
        completionPromptOpen = true;

        autoYieldUntil = 0;

        scan();

        updateIndicators();

        setStatus(
            'No new older history detected — scrolling paused'
        );

        const complete =
            await showYesNoPrompt(
                'History Check',
                'Is the available chat history complete?'
            );

        if (complete) {
            completionPromptOpen = false;

            finishArchivingSession();

            return;
        }

        setStatus(
            'Awaiting archive decision'
        );

        const continueArchiving =
            await showYesNoPrompt(
                'Continue Archiving?',
                'Should archiving continue?'
            );

        if (!continueArchiving) {
            completionPromptOpen = false;

            finishArchivingSession();

            return;
        }

        completionPromptOpen = false;
        archiveComplete = false;
        autoPaused = false;

        lastHistoricalProgressAt =
            performance.now();

        autoStartedAt =
            performance.now();

        autoYieldUntil = 0;

        setStatus(
            'Continuing from current chat position'
        );

        updateIndicators();

        if (
            captureActive &&
            autoEnabled
        ) {
            setTimeout(
                () => {
                    if (
                        captureActive &&
                        autoEnabled &&
                        !completionPromptOpen &&
                        !archiveComplete
                    ) {
                        startAutoRun();
                    }
                },
                100
            );
        }
    }

    /* =========================================================
       AUTO SCROLL
       ========================================================= */

    async function startAutoRun() {
        if (
            autoRunning ||
            !autoEnabled ||
            !captureActive ||
            archiveComplete ||
            completionPromptOpen
        ) {
            return;
        }

        updateScrollSettings();

        let scroller =
            getScroller();

        if (!scroller) {
            setStatus(
                'Unable to locate chat scrollbar'
            );

            return;
        }

        autoPaused = false;
        autoRunning = true;

        autoStartedAt =
            performance.now();

        lastHistoricalProgressAt =
            performance.now();

        autoYieldUntil = 0;

        const runId =
            ++autoRunId;

        updateIndicators();

        setStatus(
            'Scanning older history'
        );
        updatePlayBar();

        while (
            autoRunning &&
            autoEnabled &&
            captureActive &&
            !archiveComplete &&
            !completionPromptOpen &&
            runId === autoRunId
        ) {
            const nowBeforeScroll =
                performance.now();

            if (
                nowBeforeScroll <
                autoYieldUntil
            ) {
                const remaining =
                    autoYieldUntil -
                    nowBeforeScroll;

                await sleep(
                    Math.min(
                        50,
                        Math.max(
                            10,
                            remaining
                        )
                    )
                );

                continue;
            }

            const liveScroller =
                getScroller();

            if (liveScroller) {
                if(scroller&&liveScroller!==scroller&&detectHistoryReset(scrollMetrics(scroller),liveScroller))return;
                scroller =
                    liveScroller;
            }

            if (!scroller) {
                break;
            }

            /*
             * v1.9:
             *
             * Do not directly assign scrollTop here.
             *
             * performAutoScrollStep() first emits the same
             * direction of wheel event produced by manual
             * upward scrolling and THEN changes scrollTop.
             */
            // Capture the outgoing virtualized window before it disappears.
            scan();
            const beforeScroll=scrollMetrics(scroller);
            performAutoScrollStep(
                scroller
            );

            await sleep(
                scrollDelay
            );

            if (
                !autoRunning ||
                !autoEnabled ||
                !captureActive ||
                archiveComplete ||
                completionPromptOpen ||
                runId !== autoRunId
            ) {
                break;
            }

            if (
                performance.now() <
                autoYieldUntil
            ) {
                continue;
            }

            if(detectHistoryReset(beforeScroll,scroller))return;
            // PDA virtual lists may change without emitting a scroll event.
            scan();
            const now =
                performance.now();

            if (
                now - lastScrollScan >=
                SCAN_THROTTLE
            ) {
                lastScrollScan = now;
                scan();
            }

            if (
                performance.now() <
                autoYieldUntil
            ) {
                continue;
            }

            const runAge =
                now -
                autoStartedAt;

            const noHistoryAge =
                now -
                lastHistoricalProgressAt;

            if (
                runAge >=
                    STALL_GRACE_MS &&
                noHistoryAge >=
                    NO_NEW_RESULTS_MS
            ) {
                const before =
                    lastHistoricalProgressAt;

                /*
                 * A suspected end of history is not yet confirmed.
                 * Let Torn finish loading for five seconds before
                 * trying another upward scroll. Do not reposition
                 * the chat or reset the archive.
                 */
                setStatus('Possible history end — waiting 5 seconds before retry');
                await sleep(END_RETRY_WAIT_MS);

                if (
                    !autoRunning ||
                    !autoEnabled ||
                    !captureActive ||
                    archiveComplete ||
                    completionPromptOpen ||
                    runId !== autoRunId
                ) {
                    return;
                }

                if(detectHistoryReset(beforeScroll,getScroller()||scroller))return;
                scan();

                if (lastHistoricalProgressAt > before) {
                    setStatus('Older history loaded — resuming scroll');
                    continue;
                }

                const retryScroller = getScroller() || scroller;
                performAutoScrollStep(retryScroller);
                await sleep(Math.max(scrollDelay, 200));
                scan();

                if (
                    performance.now() <
                    autoYieldUntil
                ) {
                    continue;
                }

                if (
                    lastHistoricalProgressAt >
                    before
                ) {
                    continue;
                }

                await handleNoNewResults(
                    runId
                );

                return;
            }
        }

        if (
            runId === autoRunId
        ) {
            autoRunning = false;
            updateIndicators();
        }
    }

    function stopAutoRun(
        update = true
    ) {
        if (autoRunning) {
            autoRunning = false;
            autoRunId++;
        }

        autoYieldUntil = 0;

        if (update) {
            updateIndicators();
            updateStatus();
        }
    }

    /* =========================================================
       SETTINGS
       ========================================================= */

    function loadSettings() {
        try {
            let raw =
                moduleStore.getItem(
                    SETTINGS_KEY
                );

            if (!raw) {
                const oldKeys = [
                    'RelaxSweety_TCA_v18_settings',
                    'RelaxSweety_TCA_v17_settings',
                    'RelaxSweety_TCA_v16_settings',
                    'RelaxSweety_TCA_v15_settings',
                    'RelaxSweety_TCA_v14_settings'
                ];

                for (const key of oldKeys) {
                    raw =
                        moduleStore.getItem(
                            key
                        );

                    if (raw) break;
                }
            }

            if (!raw) return;

            const settings =
                JSON.parse(raw);

            if (
                Number.isFinite(
                    settings.step
                )
            ) {
                scrollStep =
                    Math.max(
                        1,
                        Math.min(
                            50,
                            settings.step
                        )
                    );
            }

            if (
                Number.isFinite(
                    settings.delay
                )
            ) {
                scrollDelay =
                    Math.max(
                        15,
                        Math.min(
                            500,
                            settings.delay
                        )
                    );
            }

        } catch {}
    }

    function updateScrollSettings() {
        const step =
            parseInt(
                document.getElementById(
                    'tca-step'
                )?.value,
                10
            );

        const delay =
            parseInt(
                document.getElementById(
                    'tca-delay'
                )?.value,
                10
            );

        if (Number.isFinite(step)) {
            scrollStep =
                Math.max(
                    1,
                    Math.min(
                        50,
                        step
                    )
                );
        }

        if (Number.isFinite(delay)) {
            scrollDelay =
                Math.max(
                    15,
                    Math.min(
                        500,
                        delay
                    )
                );
        }

        const stepInput =
            document.getElementById(
                'tca-step'
            );

        const delayInput =
            document.getElementById(
                'tca-delay'
            );

        if (stepInput) {
            stepInput.value =
                scrollStep;
        }

        if (delayInput) {
            delayInput.value =
                scrollDelay;
        }

        moduleStore.setItem(
            SETTINGS_KEY,

            JSON.stringify({
                step: scrollStep,
                delay: scrollDelay
            })
        );
    }

    /* =========================================================
       EXPORT
       ========================================================= */

    function csvEscape(value) {
        return (
            '"' +
            String(value ?? '')
                .replaceAll(
                    '"',
                    '""'
                ) +
            '"'
        );
    }

    function getOrderedRecords() {
        const result = [];
        const used = new Set();

        for (const id of messageOrder) {
            const record =
                archive.get(id);

            if (record) {
                result.push(record);
                used.add(id);
            }
        }

        for (
            const [id, record] of
            archive.entries()
        ) {
            if (!used.has(id)) {
                result.push(record);
            }
        }

        return result;
    }

    function exportCSV() {
        const rows = [[
            'Chat',
            'Chat ID',
            'Message ID',
            'Player',
            'Player ID',
            'Direction',
            'Exact Timestamp',
            'Group Timestamp',
            'Message','Source Message ID','Exact Timestamp Unix Ms','Exact Timestamp Source'
        ]];

        for (
            const msg of
            getOrderedRecords()
        ) {
            rows.push([
                msg.chat ||
                    selectedChatName,

                msg.chatId ||
                    selectedChatId,

                msg.messageId,

                msg.player,

                msg.playerId,

                msg.isSelf
                    ? 'Self'
                    : 'Other',

                msg.exactTimestamp,

                msg.groupTimestamp,

                msg.message,msg.sourceMessageId||'',msg.exactTimestampUnixMs??'',msg.exactTimestampSource||''
            ]);
        }

        const csv =
            '\uFEFF' +
            rows
                .map(
                    row =>
                        row
                            .map(csvEscape)
                            .join(',')
                )
                .join('\r\n');

        download(
            `torn-chat-${sanitizeFilename(selectedChatName)}.csv`,
            csv,
            'text/csv;charset=utf-8'
        );
    }

    function exportJSON() {
        const data = {
            version: '1.9',

            chat:
                selectedChatName,

            chatId:
                selectedChatId,

            chatType:
                selectedChatType,

            exportedAt:
                new Date().toISOString(),

            messageCount:
                archive.size,

            messages:
                getOrderedRecords()
        };

        download(
            `torn-chat-${sanitizeFilename(selectedChatName)}.json`,

            JSON.stringify(
                data,
                null,
                2
            ),

            'application/json;charset=utf-8'
        );
    }

    function download(
        filename,
        content,
        type
    ) {
        const blob =
            new Blob(
                [content],
                { type }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const a =
            document.createElement(
                'a'
            );

        a.href = url;
        a.download = filename;

        document.body.appendChild(a);

        a.click();
        a.remove();

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            30000
        );
    }

    /* =========================================================
       CLEAR
       ========================================================= */

    async function clearCurrentSession() {
        if (captureActive) {
            setStatus(
                'Stop Capture before clearing the session'
            );

            return;
        }

        if (!archive.size) {
            setStatus(
                'Archive is already empty'
            );

            return;
        }

        const clear =
            await showYesNoPrompt(
                'Clear Session?',
                'Delete all currently captured messages from this session?'
            );

        if (!clear) {
            setStatus(
                'Clear cancelled'
            );

            return;
        }

        archive = new Map();
        messageOrder = [];
        privateIdCounter = 0;
        rememberedOldestGroup = '';

        setStatus(
            'Session archive cleared'
        );
    }

    /* =========================================================
       STATUS
       ========================================================= */

    function getStats() {
        let exact = 0;
        let grouped = 0;

        for (
            const record of
            archive.values()
        ) {
            if (record.exactTimestamp) {
                exact++;
            }

            if (record.groupTimestamp) {
                grouped++;
            }
        }

        return {
            exact,
            grouped
        };
    }

    function setStateButton(
        id,
        on,
        onText,
        offText
    ) {
        const button =
            document.getElementById(id);

        if (!button) return;

        button.textContent =
            `● ${on ? onText : offText}`;

        button.style.background =
            on
                ? '#176b2c'
                : '#6e2020';

        button.style.border =
            on
                ? '2px solid #45c968'
                : '2px solid #d85a5a';

        button.style.color =
            '#fff';

        button.style.fontWeight =
            '700';

        button.style.fontSize =
            '11px';

        button.style.height =
            '34px';

        button.style.cursor =
            'pointer';

        button.style.textShadow =
            '0 1px 2px #000';
    }

    function updatePlayBar() {
        const bar = document.getElementById('tca-playbar');
        if (!bar) return;
        const copied = document.getElementById('tca-bar-copied');
        if (copied) copied.textContent = 'Copied: ' + archive.size.toLocaleString();
        bar.style.display = captureActive ? 'flex' : 'none';
        const state = {
            play: captureActive && autoRunning && !autoPaused && !completionPromptOpen,
            pause: captureActive && (!autoRunning || autoPaused || completionPromptOpen),
            stop: !captureActive
        };
        for (const [key, active] of Object.entries(state)) {
            const btn = document.getElementById('tca-bar-' + key);
            if (!btn) continue;
            btn.style.background = active ? '#187b38' : '#922b2b';
            btn.style.color = '#fff';
            btn.setAttribute('aria-pressed', String(active));
        }
    }

    function showFullPanel() {
        const panel = document.getElementById('tca-panel');
        const launcher = document.getElementById('tca-launcher');
        if (!panel) return;
        panel.style.display = 'block';
    }

    function hideFullPanel() {
        const panel = document.getElementById('tca-panel');
        const launcher = document.getElementById('tca-launcher');
        if (!panel) return;
        panel.style.display = 'none';
        updatePlayBar();
    }

    function pausePlayBar() {
        if (!captureActive) return;
        autoPaused = true;
        stopAutoRun(false);
        setStatus('Paused — capture remains active');
        updateIndicators();
    }

    function resumePlayBar() {
        if (!captureActive) {
            startCapture();
        }
        if (!captureActive) return;
        autoEnabled = true;
        autoPaused = false;
        archiveComplete = false;
        completionPromptOpen = false;
        lastHistoricalProgressAt = performance.now();
        startAutoRun();
        updateIndicators();
    }

    function stopPlayBar() {
        stopCapture('Stopped — archive available for export');
        autoEnabled = false;
        autoPaused = false;
        updateIndicators();
        showFullPanel();
    }

    function updateIndicators() {
        setStateButton(
            'tca-capture-state',
            captureActive,
            'CAPTURE ON',
            'CAPTURE OFF'
        );

        setStateButton(
            'tca-auto-state',
            autoEnabled,
            'AUTO ON',
            'AUTO OFF'
        );
        updatePlayBar();
    }

    function getAutoStatus() {
        if (archiveComplete) {
            return 'COMPLETE';
        }

        if (!autoEnabled) {
            return 'OFF';
        }

        if (
            completionPromptOpen ||
            autoPaused
        ) {
            return 'PAUSED';
        }

        if (
            autoRunning &&
            performance.now() <
                autoYieldUntil
        ) {
            return 'YIELDING';
        }

        if (autoRunning) {
            return 'RUNNING';
        }

        return 'ARMED';
    }

    function getLastHistoricalText() {
        if (!lastHistoricalProgressAt) {
            return '-';
        }

        const age =
            Math.max(
                0,
                (
                    performance.now() -
                    lastHistoricalProgressAt
                ) / 1000
            );

        return (
            age.toFixed(1) +
            ' sec ago'
        );
    }

    function setStatus(note) {
        chatEvent('status');
        if (note) {
            currentStatusNote =
                note;
        }

        updateStatus();
    }

    function updateStatus() {
        const status =
            document.getElementById(
                'tca-status'
            );

        if (!status) return;

        const stats =
            getStats();
        updatePlayBar();

        status.innerHTML = `
            <div style="
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                font-weight:bold;
                margin-bottom:3.75px;
            ">
                ${escapeHTML(
                    selectedChatName ||
                    'No chat selected'
                )}
            </div>

            <div>
                Type:
                <b>${escapeHTML(
                    selectedChatType || '-'
                )}</b>
            </div>

            <div>
                Messages:
                <b>${archive.size}</b>
            </div>

            <div>
                Group timestamps:
                <b>${stats.grouped}</b>
            </div>

            <div>
                Exact timestamps:
                <b>${stats.exact}</b>
            </div>

            <div>
                Capture:
                <b>${
                    captureActive
                        ? 'ON'
                        : 'OFF'
                }</b>
            </div>

            <div>
                Auto:
                <b>${getAutoStatus()}</b>
            </div>

            <div>
                Last older history:
                <b>${getLastHistoricalText()}</b>
            </div>

            <div style="
                min-height:32px;
                white-space:normal;
                color:#ddd;
                margin-top:4.5px;
                padding-top:3.75px;
                border-top:1px solid #444;
                line-height:14px;
            ">
                Status:
                <b>${escapeHTML(
                    currentStatusNote
                )}</b>
            </div>
        `;

        updateIndicators();
    }

    /* =========================================================
       PANEL POSITION
       ========================================================= */

    function savePanelPosition(panel) {
        const rect =
            panel.getBoundingClientRect();

        moduleStore.setItem(
            PANEL_POS_KEY,

            JSON.stringify({
                left: rect.left,
                top: rect.top
            })
        );
    }

    function loadPanelPosition(panel) {
        try {
            const raw =
                moduleStore.getItem(
                    PANEL_POS_KEY
                );

            if (!raw) return;

            const pos =
                JSON.parse(raw);

            panel.style.left =
                Math.max(
                    0,
                    Math.min(
                        pos.left,
                        window.innerWidth - Math.min(290, window.innerWidth - 16)
                    )
                ) + 'px';

            panel.style.top =
                Math.max(
                    0,
                    Math.min(
                        pos.top,
                        window.innerHeight - 50
                    )
                ) + 'px';

            panel.style.right =
                'auto';

            panel.style.bottom =
                'auto';

        } catch {}
    }

    function makeDraggable(panel, handle) {
        let activePointer = null;
        let dx = 0, dy = 0;
        handle.addEventListener('pointerdown', event => {
            if (event.target.closest('button,select,input')) return;
            activePointer = event.pointerId;
            const rect = panel.getBoundingClientRect();
            dx = event.clientX - rect.left;
            dy = event.clientY - rect.top;
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            handle.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        });
        handle.addEventListener('pointermove', event => {
            if (event.pointerId !== activePointer) return;
            const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - 40);
            panel.style.left = Math.max(0, Math.min(maxLeft, event.clientX - dx)) + 'px';
            panel.style.top = Math.max(0, Math.min(maxTop, event.clientY - dy)) + 'px';
        });
        function finish(event) {
            if (event.pointerId !== activePointer) return;
            activePointer = null;
            savePanelPosition(panel);
        }
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
    }

    function setMinimized(minimized) {
        const body =
            document.getElementById(
                'tca-body'
            );

        const button =
            document.getElementById(
                'tca-minimize'
            );

        if (
            !body ||
            !button
        ) {
            return;
        }

        body.style.display =
            minimized
                ? 'none'
                : 'block';

        button.textContent =
            minimized
                ? '+'
                : '−';

        moduleStore.setItem(
            PANEL_MIN_KEY,
            minimized
                ? '1'
                : '0'
        );
        if (minimized) hideFullPanel();
    }

    /* =========================================================
       PANEL
       ========================================================= */

    function createPanel() {
        if (
            document.getElementById(
                'tca-panel'
            )
        ) {
            return;
        }

        const panel =
            document.createElement(
                'div'
            );

        panel.id =
            'tca-panel';

        Object.assign(
            panel.style,
            {
                position: 'fixed',
                right: '10px',
                bottom: '10px',

                zIndex: '999999',

                width: 'min(290px, calc(100vw - 16px))',
                minWidth: '0',
                maxWidth: 'calc(100vw - 16px)',

                background: '#202020',
                color: '#eee',

                border: '1px solid #666',
                borderRadius: '7px',

                boxShadow:
                    '0 3px 12px rgba(0,0,0,.5)',

                fontFamily:
                    'Arial,sans-serif',

                fontSize: '11px',

                overflow: 'hidden',
                maxHeight: 'calc(100dvh - 24px)',
                overflowY: 'auto',
                touchAction: 'pan-y',

                boxSizing:
                    'border-box'
            }
        );

        panel.innerHTML = `
            <div
                id="tca-header"
                style="
                    height:36px;
                    box-sizing:border-box;
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:5.25px 6px;
                    background:#292929;
                    cursor:move;
                    touch-action:none;
                    font-weight:bold;
                    border-bottom:1px solid #555;
                "
            >
                <span>
                    Torn Chat Archive PDA 0.1
                </span>

                <button
                    id="tca-minimize"
                    style="
                        width:25px;
                        height:22px;
                        padding:0;
                        cursor:pointer;
                        font-weight:bold;
                        color:#fff;
                        background:#444;
                        border:1px solid #777;
                    "
                >
                    −
                </button>
            </div>

            <div
                id="tca-body"
                style="
                    padding:6.75px;
                    box-sizing:border-box;
                "
            >
                <div style="
                    font-weight:bold;
                    margin-bottom:3px;
                ">
                    Chat to Archive
                </div>

                <div style="
                    display:flex;
                    gap:3px;
                    height:28px;
                    margin-bottom:6px;
                ">
                    <select
                        id="tca-chat-select"
                        style="
                            flex:1;
                            min-width:0;
                            height:28px;
                        "
                    ></select>

                    <button
                        id="tca-refresh"
                        style="
                            width:32px;
                            height:28px;
                            color:#fff;
                            background:#444;
                            border:1px solid #888;
                            font-size:12.75px;
                            font-weight:bold;
                            cursor:pointer;
                        "
                    >
                        ↻
                    </button>
                </div>

                <div style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:3.75px;
                    height:34px;
                    margin-bottom:5.25px;
                ">
                    <button
                        id="tca-capture-state"
                    >
                        ● CAPTURE OFF
                    </button>

                    <button
                        id="tca-auto-state"
                    >
                        ● AUTO OFF
                    </button>
                </div>

                <div
                    id="tca-status"
                    style="
                        height:185px;
                        min-height:185px;
                        max-height:185px;
                        box-sizing:border-box;
                        overflow:hidden;
                        padding:6px;
                        background:#181818;
                        border:1px solid #444;
                        border-radius:4px;
                        line-height:15px;
                        margin-bottom:6px;
                    "
                ></div>

                <div style="
                    font-weight:bold;
                    margin-bottom:3.75px;
                ">
                    Auto Scroll
                </div>

                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:flex-start;
                    gap:2.25px;
                    margin-bottom:6.75px;
                ">
                    <span>Step</span>

                    <input
                        id="tca-step"
                        type="number"
                        min="1"
                        max="50"
                        value="${scrollStep}"
                        style="
                            width:44px;
                            box-sizing:border-box;
                            margin-left:0.75px;
                            margin-right:6px;
                        "
                    >

                    <span>Delay</span>

                    <input
                        id="tca-delay"
                        type="number"
                        min="15"
                        max="500"
                        value="${scrollDelay}"
                        style="
                            width:50px;
                            box-sizing:border-box;
                            margin-left:0.75px;
                        "
                    >
                </div>

                <div style="
                    display:grid;
                    grid-template-columns:1fr 1fr 1fr;
                    gap:3.75px;
                ">
                    <button id="tca-csv">
                        CSV
                    </button>

                    <button id="tca-json">
                        JSON
                    </button>

                    <button id="tca-clear">
                        CLEAR
                    </button>
                </div>
            </div>

            <div
                id="tca-prompt-overlay"
                style="
                    display:none;
                    position:absolute;
                    left:0;
                    top:36px;
                    right:0;
                    bottom:0;
                    background:rgba(0,0,0,.90);
                    z-index:100;
                    align-items:center;
                    justify-content:center;
                    padding:10.5px;
                    box-sizing:border-box;
                "
            >
                <div
                    style="
                        width:100%;
                        background:#242424;
                        border:1px solid #777;
                        border-radius:6px;
                        padding:10.5px;
                        box-sizing:border-box;
                        box-shadow:0 4px 14px rgba(0,0,0,.7);
                    "
                >
                    <div
                        id="tca-prompt-title"
                        style="
                            font-size:11px;
                            font-weight:bold;
                            margin-bottom:7.5px;
                            text-align:center;
                        "
                    >
                        History Check
                    </div>

                    <div
                        id="tca-prompt-question"
                        style="
                            font-size:11px;
                            line-height:17px;
                            text-align:center;
                            margin-bottom:10.5px;
                        "
                    ></div>

                    <div
                        style="
                            display:grid;
                            grid-template-columns:1fr 1fr;
                            gap:6px;
                        "
                    >
                        <button
                            id="tca-prompt-yes"
                            style="
                                height:36px;
                                background:#176b2c;
                                color:#fff;
                                border:2px solid #45c968;
                                border-radius:4px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            YES
                        </button>

                        <button
                            id="tca-prompt-no"
                            style="
                                height:36px;
                                background:#6e2020;
                                color:#fff;
                                border:2px solid #d85a5a;
                                border-radius:4px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            NO
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        const styleButton =
            (
                button,
                danger = false
            ) => {
                Object.assign(
                    button.style,
                    {
                        background:
                            danger
                                ? '#682424'
                                : '#3f3f3f',

                        color: '#fff',

                        border:
                            danger
                                ? '2px solid #d85a5a'
                                : '2px solid #888',

                        borderRadius: '4px',
                        fontWeight: '700',
                        height: '34px',
                        cursor: 'pointer'
                    }
                );
            };

        document.getElementById(
            'tca-capture-state'
        ).onclick =
            () =>
                captureActive
                    ? stopCapture()
                    : startCapture();

        document.getElementById(
            'tca-auto-state'
        ).onclick =
            toggleAutoSetting;

        document.getElementById(
            'tca-refresh'
        ).onclick =
            () =>
                refreshChatSelector(true);

        document.getElementById(
            'tca-chat-select'
        ).onchange =
            event =>
                switchChat(
                    event.target.value
                );

        document.getElementById(
            'tca-step'
        ).onchange =
            updateScrollSettings;

        document.getElementById(
            'tca-delay'
        ).onchange =
            updateScrollSettings;

        const csv =
            document.getElementById(
                'tca-csv'
            );

        const json =
            document.getElementById(
                'tca-json'
            );

        const clear =
            document.getElementById(
                'tca-clear'
            );

        styleButton(csv);
        styleButton(json);
        styleButton(clear, true);

        csv.onclick =
            exportCSV;

        json.onclick =
            exportJSON;

        clear.onclick =
            clearCurrentSession;

        document.getElementById(
            'tca-minimize'
        ).onclick =
            event => {
                event.stopPropagation();

                const body =
                    document.getElementById(
                        'tca-body'
                    );

                setMinimized(
                    body.style.display !==
                        'none'
                );
            };

        makeDraggable(
            panel,
            document.getElementById(
                'tca-header'
            )
        );

        // TU is the only launcher; preserve the capture transport bar.
        const bar = document.createElement('div');
        bar.id = 'tca-playbar';
        bar.style.cssText = 'position:fixed;right:10px;bottom:44px;z-index:1000000;display:none;align-items:center;gap:3px;padding:3.75px;background:#202020;border:1px solid #777;border-radius:6px;touch-action:none;user-select:none;';
        bar.innerHTML = '<span id="tca-bar-handle" style="padding:3px 4.5px;color:#ccc;cursor:move;touch-action:none">⋮⋮</span>' +
          ['play','pause','stop'].map(k => '<button id="tca-bar-'+k+'" style="border:1px solid #ccc;border-radius:4px;padding:5.25px 6.75px;font:bold 11px Arial;color:white">'+k.toUpperCase()+'</button>').join('') +
          '<span id="tca-bar-copied" style="color:#fff;font:bold 11px Arial;white-space:nowrap;padding:0 3px">Copied: 0</span>';
        document.body.appendChild(bar);
        makeDraggable(bar, document.getElementById('tca-bar-handle'));
        document.getElementById('tca-bar-play').onclick = resumePlayBar;
        document.getElementById('tca-bar-pause').onclick = pausePlayBar;
        document.getElementById('tca-bar-stop').onclick = stopPlayBar;

        loadPanelPosition(panel);

        refreshChatSelector(false);

        setMinimized(false);
        hideFullPanel();
        updateIndicators();
        updateStatus();
    }

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    let initialized=false;
    function activateFromTU(){
      if(!initialized){ loadSettings(); createPanel(); initialized=true; }
      showFullPanel();
    }
    function deactivateFromTU(){
      stopCapture('Closed by Torn Utilities'); stopAutoRun(false);
      const panel=document.getElementById('tca-panel'); if(panel) panel.style.display='none';
      const playbar=document.getElementById('tca-playbar'); if(playbar) playbar.style.display='none';
    }
    const definition={id:'chat-archiver',version:'0.1.10',activate:activateFromTU,deactivate:deactivateFromTU};
    function registerTU(){if(window.TornUtilities?.register) window.TornUtilities.register(definition);}
    window.addEventListener('torn-utilities-ready',registerTU); registerTU();

})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"chat-archiver",version:"0.1.10",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: tic-tac-toe (0.6.5) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="tic-tac-toe")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="tic-tac-toe"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.6.5"}};


(()=>{
  "use strict";
const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.6.4';
if(window.__TU_TTT_MODULE__)return;window.__TU_TTT_MODULE__=true;
const ID="tic-tac-toe";let panel=null,host=null,dragCleanup=null;
const API="https://tu-multiplayer-server-dev.tuserver.workers.dev",STORE="tu-ttt-dev-session-v1";
let session=null,timer=null,busy=false,latestGame=null,lastAnnounced=null;
try{localStorage.removeItem("tu-ttt-player-name");session=JSON.parse(localStorage.getItem(STORE));}catch{}
const el=(tag,props={},parent)=>{const n=document.createElement(tag);Object.assign(n,props);parent?.appendChild(n);return n;};
const btn=(label,fn,parent)=>{const b=el("button",{textContent:label},parent);Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"6px",cursor:"pointer"});b.addEventListener("click",fn);return b;};

const HISTORY_KEY="tu:history:"+ID;
function historyRead(){try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(h)?h:[]}catch{return []}}
function recordResult(g){if(!g?.winner||!session?.room)return;const h=historyRead();if(h.some(x=>x.room===session.room&&x.round===(g.round||1)))return;h.unshift({room:session.room,round:g.round||1,symbol:session.symbol,winner:g.winner,moves:g.moves||0,names:g.names||{},completed:new Date().toISOString()});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,200)))}catch{}}
function buildHistoryUI(parent){const wrap=el("div",{},parent);wrap.style.cssText="margin:7.5px 0;border-top:1px solid #657184;padding-top:6px";const bar=el("div",{},wrap);bar.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:6px";el("strong",{textContent:"Head-to-head history"},bar);const open=btn("Game History",()=>{page.hidden=!page.hidden;open.textContent=page.hidden?"Game History":"Hide History";update()},bar);const summary=el("div",{},wrap);summary.style.cssText="font-size:11px;line-height:1.6;margin-top:4.5px";const page=el("div",{},wrap);page.hidden=true;page.style.cssText="max-height:240px;overflow:auto;border:1px solid #657184;padding:6px";function update(){const h=historyRead(),g=latestGame,n=g?.names||{},x=n.X||"Player X",o=n.O||"Player O";const games=h.filter(v=>v.names?.X===x&&v.names?.O===o);const xw=games.filter(v=>v.winner==="X").length,ow=games.filter(v=>v.winner==="O").length,draw=games.filter(v=>v.winner==="draw").length;summary.textContent=x+" "+xw+" wins | "+o+" "+ow+" wins | Draws "+draw+" | Games "+games.length+" (this device)";if(!page.hidden){page.replaceChildren();if(!games.length)el("div",{textContent:"No completed games recorded for this matchup on this device."},page);for(const v of games)el("div",{textContent:new Date(v.completed).toLocaleString()+" | "+(v.winner==="draw"?"Draw":(v.names[v.winner]||"Player "+v.winner)+" won")},page)}}update();return update}

function activate(context){host=context.mount;panel=el("div",{},host);panel.hidden=false;
Object.assign(panel.style,{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxHeight:"82vh",overflowY:"auto",boxSizing:"border-box",zIndex:"2147483647",width:"min(360px,94vw)",padding:"11.25px",background:"#20252e",color:"#fff",border:"1px solid #888",borderRadius:"12px",font:"11px system-ui"});
const bar=el("div",{},panel);
Object.assign(bar.style,{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"6px",cursor:"move",touchAction:"none",userSelect:"none",marginBottom:"7.5px"});
const heading=el("strong",{textContent:"TU Tic-Tac-Toe"},bar);
const minimize=btn("−",()=>{context.close();},bar);
minimize.title="Minimize to TU";minimize.setAttribute("aria-label","Minimize Tic-Tac-Toe to TU");
Object.assign(minimize.style,{fontSize:"16.5px",fontWeight:"bold",padding:"0 9px",lineHeight:"30px"});
const grip=el("div",{textContent:"◢"},panel);
Object.assign(grip.style,{position:"absolute",right:"3px",bottom:"2px",width:"30px",height:"30px",display:"flex",alignItems:"end",justifyContent:"end",padding:"2.25px",boxSizing:"border-box",cursor:"nwse-resize",touchAction:"none",color:"#d6b96a",fontSize:"15.75px",zIndex:"2"});
panel.style.resize="both";panel.style.minWidth="260px";panel.style.minHeight="260px";panel.style.height="min(480px,78vh)";panel.style.maxWidth="96vw";panel.style.maxHeight="90vh";panel.style.overflow="auto";
function track(handle,resize){
 const start=e=>{if(e.button!==undefined&&e.button!==0)return;if(e.target.closest("button"))return;e.preventDefault();const rect=panel.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
 panel.style.transform="none";panel.style.left=rect.left+"px";panel.style.top=rect.top+"px";panel.style.width=rect.width+"px";panel.style.height=rect.height+"px";
 const move=ev=>{if(ev.pointerId!==e.pointerId)return;const dx=ev.clientX-sx,dy=ev.clientY-sy;
 if(resize){panel.style.width=Math.max(260,Math.min(window.innerWidth-rect.left-8,rect.width+dx))+"px";panel.style.height=Math.max(260,Math.min(window.innerHeight-rect.top-8,rect.height+dy))+"px";}
 else{panel.style.left=Math.max(0,Math.min(window.innerWidth-rect.width,rect.left+dx))+"px";panel.style.top=Math.max(0,Math.min(window.innerHeight-rect.height,rect.top+dy))+"px";}};
 const stop=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",stop);window.removeEventListener("pointercancel",stop);};
 window.addEventListener("pointermove",move);window.addEventListener("pointerup",stop);window.addEventListener("pointercancel",stop);
 dragCleanup=stop;
 };handle.addEventListener("pointerdown",start);
}
track(bar,false);track(grip,true);

const status=el("div",{textContent:"Create or join a room"},panel);
const controls=el("div",{},panel);
controls.style.display="flex";controls.style.gap="4.5px";controls.style.flexWrap="wrap";
const roomInput=el("input",{placeholder:"ROOM CODE",maxLength:6},controls);Object.assign(roomInput.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"4.5px"});
btn("Join",()=>{const room=roomInput.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(room))return notice("Invalid room code");const identity=playerIdentity();if(identity)action("/api/rooms/"+room+"/join","POST",identity,true);},controls);
btn("Create",()=>{const identity=playerIdentity();if(identity)action("/api/rooms","POST",identity,true)},controls);
btn("Leave",()=>{session=null;lastAnnounced=null;localStorage.removeItem(STORE);clearInterval(timer);timer=null;render(null);},controls);
const roomText=el("div",{},panel);
const opponentText=el("div",{},panel);
const summaryBtn=btn("Copy game summary",()=>copySummary(),panel);
const rematchBtn=btn("Rematch",()=>{if(session)action("/api/rooms/"+session.room+"/rematch","POST",{});},panel);
const victoryPopup=el("div",{},panel);victoryPopup.hidden=true;victoryPopup.style.cssText="position:sticky;top:8px;z-index:5;background:#143b27;color:#8bffab;border:2px solid #39d879;border-radius:10px;padding:10.5px;text-align:center;font-size:15px;font-weight:800;box-shadow:0 4px 18px #0009";const victoryText=el("div",{},victoryPopup);btn("Close",()=>{victoryPopup.hidden=true},victoryPopup);
function playerIdentity(){const p=(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.getPlayer?.();if(!p?.name||!p?.id){(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.requestPlayerProfile?.();notice("Open Torn Home to identify your player in TU Manager");return null}return {name:p.name,playerId:String(p.id)}}
function copySummary(){if(!latestGame||!session)return notice("No game to summarize");const g=latestGame,n=g.names||{},x=n.X||"Player X",o=n.O||"Player O",result=g.winner==="draw"?"Draw":g.winner?(n[g.winner]||"Player "+g.winner)+" won":"In progress";const message="Tic-Tac-Toe | "+x+" vs "+o+" | "+result;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(message).then(()=>notice("Summary copied")).catch(()=>fallbackCopy(message));else fallbackCopy(message)}

function fallbackCopy(message){const t=el("textarea",{value:message},panel);t.select();try{document.execCommand("copy");notice("Summary copied - paste into Torn chat");}catch{notice("Select and copy the summary below");}setTimeout(()=>t.remove(),12000);}
btn("Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join TU Tic-Tac-Toe room "+session.room);},panel);
const board=el("div",{},panel);Object.assign(board.style,{position:"relative",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"4.5px",marginTop:"9px"});
const winOverlay=el("svg",{},board);winOverlay.setAttribute("viewBox","0 0 300 300");winOverlay.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2";panel._historyUpdate=buildHistoryUI(panel);
const squares=Array.from({length:9},(_,i)=>{const b=btn("",()=>{if(session)action("/api/rooms/"+session.room+"/move","POST",{index:i});},board);Object.assign(b.style,{height:"65px",touchAction:"manipulation",fontSize:"22.5px",background:"#333c49",color:"#fff"});return b;});
function notice(msg){status.textContent=msg;}
function render(g){latestGame=g;recordResult(g);panel._historyUpdate?.();opponentText.textContent=g&&session?"You: "+(g.names?.[session.symbol]||session.symbol)+" | Opponent: "+(g.names?.[session.symbol==="X"?"O":"X"]||"Waiting"):"";summaryBtn.disabled=!g;rematchBtn.disabled=!g?.winner||!g?.ready||!!g?.rematch?.[session?.symbol];rematchBtn.textContent=g?.rematch?.[session?.symbol]?"Waiting for opponent":"Rematch";const winningLines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];const winningLine=g?.winner&&g.winner!=="draw"?winningLines.find(ids=>ids.every(i=>g.board[i]===g.winner)):null;const key=g&&session&&g.winner?session.room+":"+(g.round||1)+":"+g.winner:null;if(key&&key!==lastAnnounced){lastAnnounced=key;victoryText.textContent=g.winner==="draw"?"Draw!":(g.names?.[g.winner]||"Player "+g.winner)+" Wins!";victoryPopup.hidden=false;}if(!g?.winner)victoryPopup.hidden=true;squares.forEach((b,i)=>{b.textContent=g?.board[i]||"";b.style.color=winningLine?.includes(i)?"#38e477":"#fff";b.style.background=winningLine?.includes(i)?"#174a30":"#333c49";b.disabled=!g||!session||!g.ready||!!g.winner||g.turn!==session.symbol||!!g.board[i]||busy;});winOverlay.replaceChildren();if(g?.winner&&g.winner!=="draw"){const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];const line=lines.find(ids=>ids.every(i=>g.board[i]===g.winner));if(line){const a=line[0],b=line[2],p=i=>({x:50+(i%3)*100,y:50+Math.floor(i/3)*100});const start=p(a),end=p(b);const stroke=el("line",{},winOverlay);for(const [k,v] of Object.entries({x1:start.x,y1:start.y,x2:end.x,y2:end.y,stroke:"#38e477","stroke-width":9,"stroke-linecap":"round"}))stroke.setAttribute(k,v)}}roomText.textContent=session?"Room: "+session.room+" | You: "+session.symbol:"";if(g)notice(g.winner?(g.winner==="draw"?"Draw":(g.names?.[g.winner]||"Player "+g.winner)+" wins!"):!g.ready?"Waiting for opponent":g.turn===session.symbol?"Your turn":"Opponent turn");else notice("Create or join a room");}
function req(path,method="GET",body){
 const headers={"Content-Type":"application/json"};
 if(session?.token)headers.Authorization="Bearer "+session.token;
 const url=API+path;
 const data=method==="POST"?JSON.stringify(body||{}):undefined;
 const parse=(status,raw)=>{let obj;try{obj=JSON.parse(raw);}catch{throw Error("Invalid server response (HTTP "+status+")");}if(status<200||status>=300)throw Error((obj.error||"Server error")+" (HTTP "+status+")");return obj;};
 const native=()=>fetch(url,{method,headers,body:data,mode:"cors",cache:"no-store"}).then(async res=>parse(res.status,await res.text()));
 const gm=()=>new Promise((resolve,reject)=>{if(typeof GM_xmlhttpRequest!=="function")return reject(Error("PDA request bridge unavailable"));try{GM_xmlhttpRequest({method,url,headers,data,onload:res=>{try{resolve(parse(res.status,res.responseText));}catch(e){reject(e);}},onerror:()=>reject(Error("PDA request bridge network error")),ontimeout:()=>reject(Error("PDA request bridge timed out")),timeout:12000});}catch(e){reject(Error("PDA request bridge failed: "+e.message));}});
 return native().catch(e=>{if(typeof GM_xmlhttpRequest!=="function")throw Error("Browser request failed: "+e.message);return gm().catch(g=>{throw Error("Browser: "+e.message+"; PDA: "+g.message);});});
}
async function action(path,method,body,newSession=false){if(busy)return;busy=true;try{const result=await req(path,method,body);if(newSession){lastAnnounced=null;session={room:result.room,token:result.token,symbol:result.symbol};localStorage.setItem(STORE,JSON.stringify(session));}render(result.game);startPolling();}catch(e){notice(e.message);}finally{busy=false;if(session&&panel)refresh();}}
async function refresh(){if(!session||!panel)return;try{const r=await req("/api/rooms/"+session.room+"/state");render(r.game);}catch(e){notice(e.message);}}
function startPolling(){if(timer)clearInterval(timer);if(session)timer=setInterval(()=>{if(!busy)refresh();},2500);}
render(null);if(session){startPolling();refresh();}
}
function deactivate(){dragCleanup?.();dragCleanup=null;clearInterval(timer);timer=null;panel?.remove();panel=null;host=null;latestGame=null;}
function register(){if((typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register){(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities.register({id:ID,version:TU_MODULE_VERSION,activate,deactivate});return true;}return false;}
if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="tic-tac-toe";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"tic-tac-toe",version:"0.6.5",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: torn-four (0.2.5) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="torn-four")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="torn-four"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.2.5"}};


(()=>{
  'use strict';
const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.2.4';
const ID="torn-four",API="https://tu-multiplayer-server-dev.tuserver.workers.dev/api/connect",STORE="tu:dev:"+ID+":session";
let mount=null,panel=null,timer=null,session=null,game=null,context=null,placement=[],fleet=[];
try{session=JSON.parse(localStorage.getItem(STORE)||"null")}catch{}
const E=(tag,parent,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;parent.append(x);return x};
const B=(parent,text,fn)=>{const b=E("button",parent,text);b.type="button";b.onclick=fn;Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"6px",cursor:"pointer",font:"inherit"});return b};
const request=(path,method="GET",data)=>new Promise((resolve,reject)=>{
const url=API+path,headers={"Content-Type":"application/json"};if(session?.token)headers.Authorization="Bearer "+session.token;
const handle=(status,body)=>{try{const o=JSON.parse(body);if(status>=400)throw Error(o.error||"Server error");resolve(o)}catch(e){reject(e)}};
if(typeof GM_xmlhttpRequest==="function")GM_xmlhttpRequest({method,url,headers,data:data?JSON.stringify(data):undefined,timeout:12000,onload:r=>handle(r.status,r.responseText),onerror:()=>reject(Error("Network error")),ontimeout:()=>reject(Error("Timeout"))});
else fetch(url,{method,headers,body:data?JSON.stringify(data):undefined}).then(async r=>handle(r.status,await r.text())).catch(reject);
});

const HISTORY_KEY="tu:history:"+ID;
function historyRead(){try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(x)?x:[]}catch{return []}}
function recordResult(g){if(!g?.winner||!session?.room)return;const h=historyRead();if(h.some(x=>x.room===session.room))return;h.unshift({room:session.room,symbol:session.symbol,winner:g.winner,moves:g.moves||0,completed:new Date().toISOString()});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,200)))}catch{}}
function statsFor(h,s){const matches=h.length,wins=h.filter(x=>x.winner===s).length,draws=h.filter(x=>x.winner==="draw").length;return {matches,wins,draws,losses:matches-wins-draws,rate:matches?Math.round(wins/matches*100):0}}
function statsText(h){return ["X","O"].map(s=>{const a=statsFor(h,s);return "Player "+s+": "+a.wins+"W / "+a.losses+"L / "+a.draws+"D ("+a.rate+"% wins)"}).join(" | ")}
function buildHistoryUI(parent){const wrap=E("div",parent);wrap.style.cssText="margin:7.5px 0;border-top:1px solid #657184;padding-top:6px";const bar=E("div",wrap);bar.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap";E("strong",bar,"Game statistics");const open=B(bar,"Game History",()=>{const visible=page.hidden;page.hidden=!visible;open.textContent=visible?"Hide History":"Game History";update()});const summary=E("div",wrap);summary.style.cssText="font-size:11px;line-height:1.6;color:#d8dde5;margin-top:4.5px";const page=E("div",wrap);page.hidden=true;page.style.cssText="margin-top:7.5px;max-height:240px;overflow:auto;border:1px solid #657184;border-radius:6px;padding:6px";function update(){const h=historyRead();summary.textContent="Completed: "+h.length+" | "+statsText(h);if(!page.hidden){page.replaceChildren();if(!h.length)E("p",page,"No completed matches recorded on this device.");for(const x of h){const row=E("div",page);row.style.cssText="border-bottom:1px solid #485463;padding:4.5px 0;font-size:11px";const result=x.winner==="draw"?"Draw":"Player "+x.winner+" won";row.textContent=new Date(x.completed).toLocaleString()+" | Room "+x.room+" | "+result+" | "+x.moves+" moves | You: "+x.symbol}}}update();return update}

const say=s=>{if(panel)panel.querySelector(".status").textContent=s};
async function action(path,method="GET",body,joined=false){try{const r=await request(path,method,body);if(joined){session={room:r.room,token:r.token,symbol:r.symbol};localStorage.setItem(STORE,JSON.stringify(session))}game=r.game;recordResult(game);render()}catch(e){say(e.message)}}
function status(g){if(!g)return "Create or join a room";if(g.winner)return g.winner===session.symbol?"You won!":g.winner==="draw"?"Draw":"Opponent won";if(!g.ready)return "Waiting for opponent";return g.turn===session.symbol?"Your turn":"Opponent turn";}
function render(){if(!panel)return;const area=panel.querySelector(".game");area.replaceChildren();say(status(game));panel.querySelector(".room").textContent=session?"Room: "+session.room+" | You: "+session.symbol:"";panel.querySelector(".players").textContent=session?"You: Player "+session.symbol+" | Opponent: Player "+(session.symbol==="X"?"O":"X"):"";panel._historyUpdate?.();

if(!game)return;
const grid=E("div",area);grid.style.cssText="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2.25px";
for(let i=0;i<42;i++){const c=i%7,v=game.board[i];const b=B(grid,v==="X"?"●":v==="O"?"●":"·",()=>action("/"+session.room+"/move","POST",{index:c}));b.style.cssText="min-width:0;height:38px;padding:0;background:"+(v==="X"?"#c44848":v==="O"?"#d9bd52":"#29384a")+";color:white;border:1px solid #687689;border-radius:50%;font-size:18.75px";b.disabled=!game.ready||!!game.winner||game.turn!==session.symbol||!!game.board[c];}

}
function activate(ctx){context=ctx;mount=ctx.mount;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#20252e;color:#fff;border:1px solid #888;border-radius:12px;padding:11.25px;width:min(360px,94vw);height:min(480px,78vh);min-width:260px;min-height:260px;max-width:96vw;max-height:90vh;overflow:auto;resize:both;box-sizing:border-box;font:11px system-ui";
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:2.25px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:15.75px;z-index:2";const head=E("div",panel);head.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:6px;touch-action:none;user-select:none;cursor:move;margin-bottom:7.5px";E("strong",head,"Torn Four");const minimize=B(head,"−",()=>ctx.close());minimize.title="Minimize to TU";minimize.setAttribute("aria-label","Minimize game to TU");Object.assign(minimize.style,{fontSize:"16.5px",fontWeight:"bold",padding:"0 9px",lineHeight:"30px"});
let origin;head.addEventListener("pointerdown",e=>{if(e.target.tagName==="BUTTON")return;const r=panel.getBoundingClientRect();origin={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";head.setPointerCapture(e.pointerId)});head.addEventListener("pointermove",e=>{if(!origin)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,origin.l+e.clientX-origin.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,origin.t+e.clientY-origin.y))+"px"});head.addEventListener("pointerup",()=>origin=null);head.addEventListener("pointercancel",()=>origin=null);
let resizing=null;grip.addEventListener("pointerdown",e=>{e.preventDefault();const r=panel.getBoundingClientRect();resizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";panel.style.width=r.width+"px";panel.style.height=r.height+"px";grip.setPointerCapture(e.pointerId)});grip.addEventListener("pointermove",e=>{if(!resizing)return;panel.style.width=Math.max(260,Math.min(innerWidth-resizing.l-8,resizing.w+e.clientX-resizing.x))+"px";panel.style.height=Math.max(260,Math.min(innerHeight-resizing.t-8,resizing.h+e.clientY-resizing.y))+"px"});grip.addEventListener("pointerup",()=>resizing=null);grip.addEventListener("pointercancel",()=>resizing=null);
const status=E("div",panel,"Create or join a room");status.className="status";const controls=E("div",panel);controls.style.cssText="display:flex;gap:4.5px;flex-wrap:wrap;align-items:center";const code=E("input",controls);code.placeholder="ROOM CODE";code.maxLength=6;Object.assign(code.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"4.5px",font:"inherit",boxSizing:"border-box"});
B(controls,"Join",()=>{const c=code.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))return say("Invalid room code");action("/"+c+"/join","POST",{},true)});
B(controls,"Create",()=>action("","POST",{},true));B(controls,"Leave",()=>{session=null;game=null;fleet=[];placement=[];localStorage.removeItem(STORE);render()});
const roomInfo=E("div",panel);roomInfo.className="room";const playerInfo=E("div",panel);playerInfo.className="players";const share=E("div",panel);share.style.cssText="display:flex;flex-wrap:wrap;gap:4.5px;margin:6px 0";B(share,"Copy game summary",()=>{if(!game||!session)return say("No game to summarize");const result=game.winner?(game.winner==="draw"?"Draw":game.winner===session.symbol?"You won":"Opponent won"):"In progress";const msg="Torn Four | Room "+session.room+" | Player X vs Player O | "+result+" | Moves: "+game.moves;navigator.clipboard?.writeText(msg).then(()=>say("Summary copied")).catch(()=>say("Clipboard unavailable"))});B(share,"Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join Torn Four: "+session.room)});E("div",panel).className="game";panel._historyUpdate=buildHistoryUI(panel);
render();if(session)action("/"+session.room+"/state");timer=setInterval(()=>{if(session&&panel)action("/"+session.room+"/state")},2500);
}
function deactivate(){clearInterval(timer);timer=null;panel?.remove();panel=null;mount=null;context=null}
const register=()=>(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register({id:ID,version:TU_MODULE_VERSION,activate,deactivate});
if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="torn-four";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"torn-four",version:"0.2.5",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: torn-fleet (0.2.5) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="torn-fleet")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="torn-fleet"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.2.5"}};


(()=>{
  'use strict';
const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.2.4';
const ID="torn-fleet",API="https://tu-multiplayer-server-dev.tuserver.workers.dev/api/battleship",STORE="tu:dev:"+ID+":session";
let mount=null,panel=null,timer=null,session=null,game=null,context=null,placement=[],fleet=[];
try{session=JSON.parse(localStorage.getItem(STORE)||"null")}catch{}
const E=(tag,parent,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;parent.append(x);return x};
const B=(parent,text,fn)=>{const b=E("button",parent,text);b.type="button";b.onclick=fn;Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"6px",cursor:"pointer",font:"inherit"});return b};
const request=(path,method="GET",data)=>new Promise((resolve,reject)=>{
const url=API+path,headers={"Content-Type":"application/json"};if(session?.token)headers.Authorization="Bearer "+session.token;
const handle=(status,body)=>{try{const o=JSON.parse(body);if(status>=400)throw Error(o.error||"Server error");resolve(o)}catch(e){reject(e)}};
if(typeof GM_xmlhttpRequest==="function")GM_xmlhttpRequest({method,url,headers,data:data?JSON.stringify(data):undefined,timeout:12000,onload:r=>handle(r.status,r.responseText),onerror:()=>reject(Error("Network error")),ontimeout:()=>reject(Error("Timeout"))});
else fetch(url,{method,headers,body:data?JSON.stringify(data):undefined}).then(async r=>handle(r.status,await r.text())).catch(reject);
});

const HISTORY_KEY="tu:history:"+ID;
function historyRead(){try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(x)?x:[]}catch{return []}}
function recordResult(g){if(!g?.winner||!session?.room)return;const h=historyRead();if(h.some(x=>x.room===session.room))return;h.unshift({room:session.room,symbol:session.symbol,winner:g.winner,moves:g.moves||0,completed:new Date().toISOString()});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,200)))}catch{}}
function statsFor(h,s){const matches=h.length,wins=h.filter(x=>x.winner===s).length,draws=h.filter(x=>x.winner==="draw").length;return {matches,wins,draws,losses:matches-wins-draws,rate:matches?Math.round(wins/matches*100):0}}
function statsText(h){return ["X","O"].map(s=>{const a=statsFor(h,s);return "Player "+s+": "+a.wins+"W / "+a.losses+"L / "+a.draws+"D ("+a.rate+"% wins)"}).join(" | ")}
function buildHistoryUI(parent){const wrap=E("div",parent);wrap.style.cssText="margin:7.5px 0;border-top:1px solid #657184;padding-top:6px";const bar=E("div",wrap);bar.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap";E("strong",bar,"Game statistics");const open=B(bar,"Game History",()=>{const visible=page.hidden;page.hidden=!visible;open.textContent=visible?"Hide History":"Game History";update()});const summary=E("div",wrap);summary.style.cssText="font-size:11px;line-height:1.6;color:#d8dde5;margin-top:4.5px";const page=E("div",wrap);page.hidden=true;page.style.cssText="margin-top:7.5px;max-height:240px;overflow:auto;border:1px solid #657184;border-radius:6px;padding:6px";function update(){const h=historyRead();summary.textContent="Completed: "+h.length+" | "+statsText(h);if(!page.hidden){page.replaceChildren();if(!h.length)E("p",page,"No completed matches recorded on this device.");for(const x of h){const row=E("div",page);row.style.cssText="border-bottom:1px solid #485463;padding:4.5px 0;font-size:11px";const result=x.winner==="draw"?"Draw":"Player "+x.winner+" won";row.textContent=new Date(x.completed).toLocaleString()+" | Room "+x.room+" | "+result+" | "+x.moves+" moves | You: "+x.symbol}}}update();return update}

const say=s=>{if(panel)panel.querySelector(".status").textContent=s};
async function action(path,method="GET",body,joined=false){try{const r=await request(path,method,body);if(joined){session={room:r.room,token:r.token,symbol:r.symbol};localStorage.setItem(STORE,JSON.stringify(session))}game=r.game;recordResult(game);render()}catch(e){say(e.message)}}
function status(g){if(!g)return "Create or join a room";if(g.winner)return g.winner===session.symbol?"You won!":g.winner==="draw"?"Draw":"Opponent won";if(!g.ready)return "Waiting for opponent";if(!g.placed.X||!g.placed.O)return "Place your fleet and wait for opponent";return g.turn===session.symbol?"Fire at enemy waters":"Opponent turn";}
function render(){if(!panel)return;const area=panel.querySelector(".game");area.replaceChildren();say(status(game));panel.querySelector(".room").textContent=session?"Room: "+session.room+" | You: "+session.symbol:"";panel.querySelector(".players").textContent=session?"You: Player "+session.symbol+" | Opponent: Player "+(session.symbol==="X"?"O":"X"):"";panel._historyUpdate?.();
if(!game)return;
const info=E("p",area,game.placed[session.symbol]?"Your fleet is deployed":"Place 3 ships: lengths 3, 2, 2. Tap cells to select a straight line, then tap Add Ship.");
const own=E("div",area);E("strong",own,"Your waters");const grid=(parent,click,paint)=>{const g=E("div",parent);g.style.cssText="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:1.5px";for(let i=0;i<64;i++){const b=B(g,"",()=>click(i));b.style.cssText="height:28px;min-width:0;padding:0;border:1px solid #667; background:"+paint(i)+";color:white";}};
grid(own,i=>{if(game.placed[session.symbol])return;placement.includes(i)?placement.splice(placement.indexOf(i),1):placement.push(i);render()},i=>game.incoming.includes(i)?(game.myShips.includes(i)?"#d14b4b":"#d9d9d9"):placement.includes(i)?"#e5ba44":game.myShips.includes(i)?"#4a9b71":"#29384a");
if(!game.placed[session.symbol]){E("p",area,"Selected: "+placement.length+" | Next ship: "+([3,2,2][fleet.length]||0));B(area,"Add Ship",()=>{const len=[3,2,2][fleet.length];if(placement.length!==len)return say("Select "+len+" cells");const rows=placement.map(i=>Math.floor(i/8)),cols=placement.map(i=>i%8);if(!(rows.every(x=>x===rows[0])&&Math.max(...cols)-Math.min(...cols)===len-1||cols.every(x=>x===cols[0])&&Math.max(...rows)-Math.min(...rows)===len-1))return say("Ship must be straight and contiguous");if(fleet.flat().some(i=>placement.includes(i)))return say("Ships cannot overlap");fleet.push([...placement]);placement=[];if(fleet.length===3)action("/"+session.room+"/move","POST",{ships:fleet});else render()})}
const enemy=E("div",area);E("strong",enemy,"Enemy waters (tap to fire)");
grid(enemy,i=>{if(!game.placed.X||!game.placed.O||game.turn!==session.symbol||game.myShots.includes(i)||game.winner)return;action("/"+session.room+"/move","POST",{index:i})},i=>game.myShots.includes(i)?"#d7d7d7":"#29384a");
E("p",area,"Shots fired: "+game.myShots.length+" | Incoming: "+game.incoming.length);

}
function activate(ctx){context=ctx;mount=ctx.mount;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#20252e;color:#fff;border:1px solid #888;border-radius:12px;padding:11.25px;width:min(360px,94vw);height:min(480px,78vh);min-width:260px;min-height:260px;max-width:96vw;max-height:90vh;overflow:auto;resize:both;box-sizing:border-box;font:11px system-ui";
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:2.25px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:15.75px;z-index:2";const head=E("div",panel);head.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:6px;touch-action:none;user-select:none;cursor:move;margin-bottom:7.5px";E("strong",head,"Torn Fleet");const minimize=B(head,"−",()=>ctx.close());minimize.title="Minimize to TU";minimize.setAttribute("aria-label","Minimize game to TU");Object.assign(minimize.style,{fontSize:"16.5px",fontWeight:"bold",padding:"0 9px",lineHeight:"30px"});
let origin;head.addEventListener("pointerdown",e=>{if(e.target.tagName==="BUTTON")return;const r=panel.getBoundingClientRect();origin={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";head.setPointerCapture(e.pointerId)});head.addEventListener("pointermove",e=>{if(!origin)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,origin.l+e.clientX-origin.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,origin.t+e.clientY-origin.y))+"px"});head.addEventListener("pointerup",()=>origin=null);head.addEventListener("pointercancel",()=>origin=null);
let resizing=null;grip.addEventListener("pointerdown",e=>{e.preventDefault();const r=panel.getBoundingClientRect();resizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";panel.style.width=r.width+"px";panel.style.height=r.height+"px";grip.setPointerCapture(e.pointerId)});grip.addEventListener("pointermove",e=>{if(!resizing)return;panel.style.width=Math.max(260,Math.min(innerWidth-resizing.l-8,resizing.w+e.clientX-resizing.x))+"px";panel.style.height=Math.max(260,Math.min(innerHeight-resizing.t-8,resizing.h+e.clientY-resizing.y))+"px"});grip.addEventListener("pointerup",()=>resizing=null);grip.addEventListener("pointercancel",()=>resizing=null);
const status=E("div",panel,"Create or join a room");status.className="status";const controls=E("div",panel);controls.style.cssText="display:flex;gap:4.5px;flex-wrap:wrap;align-items:center";const code=E("input",controls);code.placeholder="ROOM CODE";code.maxLength=6;Object.assign(code.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"4.5px",font:"inherit",boxSizing:"border-box"});
B(controls,"Join",()=>{const c=code.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))return say("Invalid room code");action("/"+c+"/join","POST",{},true)});
B(controls,"Create",()=>action("","POST",{},true));B(controls,"Leave",()=>{session=null;game=null;fleet=[];placement=[];localStorage.removeItem(STORE);render()});
const roomInfo=E("div",panel);roomInfo.className="room";const playerInfo=E("div",panel);playerInfo.className="players";const share=E("div",panel);share.style.cssText="display:flex;flex-wrap:wrap;gap:4.5px;margin:6px 0";B(share,"Copy game summary",()=>{if(!game||!session)return say("No game to summarize");const result=game.winner?(game.winner==="draw"?"Draw":game.winner===session.symbol?"You won":"Opponent won"):"In progress";const msg="Torn Fleet | Room "+session.room+" | Player X vs Player O | "+result+" | Moves: "+game.moves;navigator.clipboard?.writeText(msg).then(()=>say("Summary copied")).catch(()=>say("Clipboard unavailable"))});B(share,"Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join Torn Fleet: "+session.room)});E("div",panel).className="game";panel._historyUpdate=buildHistoryUI(panel);
render();if(session)action("/"+session.room+"/state");timer=setInterval(()=>{if(session&&panel)action("/"+session.room+"/state")},2500);
}
function deactivate(){clearInterval(timer);timer=null;panel?.remove();panel=null;mount=null;context=null}
const register=()=>(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register({id:ID,version:TU_MODULE_VERSION,activate,deactivate});
if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="torn-fleet";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"torn-fleet",version:"0.2.5",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: torn-snake (0.2.14) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="torn-snake")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="torn-snake"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.2.14"}};


(()=>{
  'use strict';const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.2.13';
const ID="torn-snake";let panel=null,canvas=null,ctx=null,timer=null,head=null,score=0,food=null,dir=[1,0],next=[1,0],snake=[],running=false;
const E=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e};
function spawn(){do{food=Math.floor(Math.random()*400)}while(snake.includes(food))}
function draw(){if(!ctx)return;ctx.fillStyle="#17232c";ctx.fillRect(0,0,320,320);ctx.fillStyle="#d6a950";ctx.fillRect(food%20*16,Math.floor(food/20)*16,15,15);ctx.fillStyle="#62c68b";for(const n of snake)ctx.fillRect(n%20*16,Math.floor(n/20)*16,15,15);panel?._statsUpdate?.()}
function end(){running=false;clearInterval(timer);timer=null;const best=Math.max(score,Number(localStorage.getItem("tu:snake:best")||0));localStorage.setItem("tu:snake:best",best);try{const h=JSON.parse(localStorage.getItem("tu:snake:runs")||"[]");h.unshift({score,completed:new Date().toISOString()});localStorage.setItem("tu:snake:runs",JSON.stringify(h.slice(0,200)))}catch{}draw();panel?._statsUpdate?.()}
function tick(){dir=next;const x=snake[0]%20+dir[0],y=Math.floor(snake[0]/20)+dir[1],n=y*20+x;if(x<0||x>=20||y<0||y>=20||snake.slice(0,food===n?undefined:-1).includes(n)){end();return}snake.unshift(n);if(n===food){score++;spawn()}else snake.pop();draw()}
function turn(x,y){if(x===-dir[0]&&y===-dir[1])return;next=[x,y]}
function start(){clearInterval(timer);score=0;snake=[210,209,208];dir=[1,0];next=[1,0];spawn();running=true;draw();timer=setInterval(tick,125)}
function activate({mount,close}){panel=E("section",mount);panel.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(370px,95vw);max-height:90vh;overflow:auto;resize:both;background:#20252e;color:white;border:1px solid #888;border-radius:12px;padding:11.25px;min-width:260px;min-height:320px;height:min(660px,82vh);max-width:96vw;box-sizing:border-box;z-index:2147483647;font:11px system-ui";
const bar=E("div",panel);bar.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:7.5px;cursor:move;touch-action:none;user-select:none";E("strong",bar,"Slithering Streets");const min=E("button",bar,"−");min.onclick=close;min.title="Minimize to TU";min.setAttribute("aria-label","Minimize Slithering Streets to TU");min.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:0 9px;line-height:30px;font-size:16.5px;font-weight:bold;cursor:pointer";
let drag;bar.onpointerdown=e=>{if(e.target===min)return;const r=panel.getBoundingClientRect();drag=[e.clientX,e.clientY,r.left,r.top];panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";bar.setPointerCapture(e.pointerId)};bar.onpointermove=e=>{if(!drag)return;panel.style.left=Math.max(0,drag[2]+e.clientX-drag[0])+"px";panel.style.top=Math.max(0,drag[3]+e.clientY-drag[1])+"px"};bar.onpointerup=()=>drag=null;bar.onpointercancel=()=>drag=null;
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:2.25px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:15.75px;z-index:2";let resizing=null;grip.onpointerdown=e=>{e.preventDefault();const r=panel.getBoundingClientRect();resizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";panel.style.width=r.width+"px";panel.style.height=r.height+"px";grip.setPointerCapture(e.pointerId)};grip.onpointermove=e=>{if(!resizing)return;panel.style.width=Math.max(260,Math.min(innerWidth-resizing.l-8,resizing.w+e.clientX-resizing.x))+"px";panel.style.height=Math.max(320,Math.min(innerHeight-resizing.t-8,resizing.h+e.clientY-resizing.y))+"px"};grip.onpointerup=()=>resizing=null;grip.onpointercancel=()=>resizing=null;
const status=E("div",panel,"Ready to play");status.style.cssText="margin:4.5px 0;color:#d8dde5";const arena=E("div",panel);arena.style.cssText="border:3px solid #d6b96a;border-radius:7px;background:#111a21;padding:3.75px;box-shadow:inset 0 0 0 1px #657184;margin:6px auto;width:100%;max-width:340px;box-sizing:border-box";canvas=E("canvas",arena);canvas.width=320;canvas.height=320;canvas.style.cssText="width:100%;aspect-ratio:1;display:block;touch-action:none;border:1px solid #425264;box-sizing:border-box";ctx=canvas.getContext("2d");
const statbox=E("div",panel);statbox.style.cssText="font-size:11px;color:#d8dde5;margin:6px 0";const history=E("div",panel);history.hidden=true;history.style.cssText="max-height:180px;overflow:auto;border:1px solid #657184;border-radius:6px;padding:6px;margin:4.5px 0";const show=E("button",panel,"Game History");show.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:6px;cursor:pointer";show.onclick=()=>{history.hidden=!history.hidden;show.textContent=history.hidden?"Game History":"Hide History";panel._statsUpdate?.()};panel._statsUpdate=()=>{let h=[];try{h=JSON.parse(localStorage.getItem("tu:snake:runs")||"[]")}catch{}statbox.textContent="Current score: "+score+" | Best score: "+(localStorage.getItem("tu:snake:best")||0)+" | Games played: "+h.length+" | Average: "+(h.length?Math.round(h.reduce((a,b)=>a+b.score,0)/h.length):0);if(!history.hidden){history.replaceChildren();if(!h.length)E("p",history,"No completed games yet.");for(const x of h)E("div",history,new Date(x.completed).toLocaleString()+" | Score: "+x.score)}};panel._statsUpdate();const controls=E("div",panel);controls.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:3.75px;max-width:240px;margin:6px auto";const button=(label,fn)=>{const b=E("button",controls,label);b.style.cssText="padding:7.5px;background:#344154;color:white;border:1px solid #657184;border-radius:6px;font:inherit;cursor:pointer";b.onclick=fn;return b};
button(" ",()=>{});button("▲",()=>turn(0,-1));button(" ",()=>{});button("◀",()=>turn(-1,0));button("▼",()=>turn(0,1));button("▶",()=>turn(1,0));const play=E("button",panel,"Start / Restart");play.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:6.75px 10.5px;font:inherit;cursor:pointer";play.onclick=start;
const copy=E("button",panel,"Copy Game Summary");copy.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:6.75px 10.5px;font:inherit;cursor:pointer;margin:6px 0 0 6px";copy.onclick=async()=>{let h=[];try{h=JSON.parse(localStorage.getItem("tu:snake:runs")||"[]")}catch{}const best=Number(localStorage.getItem("tu:snake:best")||0),avg=h.length?Math.round(h.reduce((a,b)=>a+b.score,0)/h.length):0;const latest=h[0];const identity=(()=>{const player=(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.getPlayer?.();if(player?.name)return {name:player.name,link:player.profileUrl};(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.requestPlayerProfile?.();return {name:null,link:"https://www.torn.com/profiles.php"}})();const msg=(identity.name||identity.link)+" played Slithering Streets for a score of "+(latest?latest.score:score);try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(msg);status.textContent="Game summary copied — paste into Torn chat";return}}catch{}const field=E("textarea",panel,msg);field.style.cssText="display:block;width:100%;height:70px;margin-top:6px";field.select();let ok=false;try{ok=document.execCommand("copy")}catch{}status.textContent=ok?"Game summary copied — paste into Torn chat":"Select and copy the summary below";if(ok)setTimeout(()=>field.remove(),2000)};
panel.insertBefore(statbox,arena);panel.insertBefore(play,arena);panel.insertBefore(copy,arena);panel.append(show,history);
const key=e=>{const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[e.key];if(d){e.preventDefault();turn(...d)}};window.addEventListener("keydown",key);panel._cleanup=()=>window.removeEventListener("keydown",key);snake=[210,209,208];spawn();draw()}
function deactivate(){clearInterval(timer);timer=null;running=false;panel?._cleanup?.();panel?.remove();panel=null;canvas=null;ctx=null}
const register=()=>(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register({id:ID,version:TU_MODULE_VERSION,activate,deactivate});if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="torn-snake";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"torn-snake",version:"0.2.14",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: chaos-marbles (0.2.5) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="chaos-marbles")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="chaos-marbles"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.2.5"}};


(()=>{
  'use strict';
const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.2.4';
const ID="chaos-marbles",KEY="tu:chaos-marbles:game",HISTORY="tu:chaos-marbles:history";
const COLORS=["#dc6059","#e4b951","#5fb2da","#8fd17b"],NAMES=["Crimson","Gold","Azure","Emerald"];
let panel=null,game=null,notice="",view="play",active=false,session=null,timer=null,busy=false,rolling=false,dieValue=1,rollTimer=null;const API="https://tu-multiplayer-server-dev.tuserver.workers.dev/api/marbles",SESSION="tu:chaos-marbles:dev:session";
const E=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e};
const B=(parent,label,fn)=>{const b=E("button",parent,label);b.type="button";b.onclick=fn;b.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:6px 7.5px;cursor:pointer;font:inherit";return b};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};


const save=()=>{if(session)localStorage.setItem(SESSION,JSON.stringify(session));else localStorage.removeItem(SESSION)};
function legal(p,i,roll){if(!game||roll===null)return false;const v=game.marbles[p][i];if(v===35)return false;const dest=v===-1?(roll===6?0:-1):v+roll;return dest>=0&&dest<=35&&!game.marbles[p].some((x,j)=>j!==i&&x===dest)}
function choices(){return !game||!session||game.turn!==session.player?[]:game.marbles[session.player].map((_,i)=>i).filter(i=>legal(session.player,i,game.roll))}
function req(path,method="GET",body){const url=API+path,headers={"Content-Type":"application/json"};if(session?.token)headers.Authorization="Bearer "+session.token;const data=method==="POST"?JSON.stringify(body||{}):undefined;
const parse=(status,raw)=>{let o;try{o=JSON.parse(raw)}catch{throw Error("Invalid server response")};if(status<200||status>=300)throw Error(o.error||"Server error");return o};
return new Promise((resolve,reject)=>{if(typeof GM_xmlhttpRequest==="function"){GM_xmlhttpRequest({method,url,headers,data,timeout:12000,onload:r=>{try{resolve(parse(r.status,r.responseText))}catch(e){reject(e)}},onerror:()=>reject(Error("Network error")),ontimeout:()=>reject(Error("Request timed out"))})}else fetch(url,{method,headers,body:data,cache:"no-store"}).then(async r=>parse(r.status,await r.text())).then(resolve,reject)})}
function recordResult(){if(game?.winner===null||!session)return;const h=read(HISTORY,[]);if(h.some(x=>x.room===session.room))return;h.unshift({room:session.room,winner:game.winner,player:session.player,count:game.count,moves:game.moves,rolls:game.rolls,ended:new Date().toISOString()});localStorage.setItem(HISTORY,JSON.stringify(h.slice(0,100)))}
async function action(path,method="GET",body,join=false){if(busy)return;busy=true;try{const r=await req(path,method,body);if(join){session={room:r.room,token:r.token,player:r.player};save()}game=r.game;recordResult();notice="Room "+session.room+" updated";render()}catch(e){notice=e.message;render()}finally{busy=false}}
async function roll(){if(!session||!game||game.turn!==session.player||game.roll!==null||busy||rolling)return;rolling=true;dieValue=1;render();const begin=Date.now();rollTimer=setInterval(()=>{dieValue=1+Math.floor(Math.random()*6);const face=panel?.querySelector(".chaos-die");if(face)face.textContent=String(dieValue)},70);await action("/"+session.room+"/roll","POST");await new Promise(resolve=>setTimeout(resolve,Math.max(0,850-(Date.now()-begin))));clearInterval(rollTimer);rollTimer=null;rolling=false;dieValue=game?.roll||dieValue;render()}
function move(i){if(session&&game?.turn===session.player&&legal(session.player,i,game.roll))action("/"+session.room+"/move","POST",{index:i})}
function drawBoard(parent){const wrap=E("div",parent);wrap.style.cssText="border:3px solid #d6b96a;background:#121b25;border-radius:10px;padding:3.75px;margin:7.5px auto;max-width:420px;box-sizing:border-box";const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 480 480");svg.style.cssText="display:block;width:100%;aspect-ratio:1";wrap.append(svg);
const node=(name,attrs)=>{const n=document.createElementNS("http://www.w3.org/2000/svg",name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);return n};
node("circle",{cx:240,cy:240,r:155,fill:"none",stroke:"#455363","stroke-width":2});
for(let i=0;i<32;i++){const a=-Math.PI/2+i*Math.PI*2/32,x=240+155*Math.cos(a),y=240+155*Math.sin(a);node("circle",{cx:x,cy:y,r:15,fill:i%8===0?COLORS[i/8]:"#293747",stroke:"#708092","stroke-width":1.5})}
for(let p=0;p<game.count;p++){const a=-Math.PI/2+p*Math.PI/2;for(let j=0;j<4;j++){const r=120-j*24;node("circle",{cx:240+r*Math.cos(a),cy:240+r*Math.sin(a),r:10,fill:COLORS[p],opacity:.35,stroke:"#ddd","stroke-width":1})}}
node("circle",{cx:240,cy:240,r:31,fill:"#253344",stroke:"#d6b96a","stroke-width":2});const t=node("text",{x:240,y:245,"text-anchor":"middle",fill:"#f0d68d","font-size":13,"font-weight":"bold"});t.textContent="CHAOS";
// Distinct outer corner holding zones: never overlap home lanes or track.
const WAIT=[{x:65,y:65},{x:415,y:65},{x:415,y:415},{x:65,y:415}];
for(let p=0;p<game.count;p++){const zone=WAIT[p],a=-Math.PI/2+p*Math.PI/2;node("rect",{x:zone.x-43,y:zone.y-32,width:86,height:69,rx:10,fill:"#253344",stroke:COLORS[p],"stroke-width":2});const title=node("text",{x:zone.x,y:zone.y-42,"text-anchor":"middle",fill:COLORS[p],"font-size":11,"font-weight":"bold"});title.textContent="WAITING FOR";const sub=node("text",{x:zone.x,y:zone.y-31,"text-anchor":"middle",fill:COLORS[p],"font-size":11,"font-weight":"bold"});sub.textContent="CHAOS";for(let i=0;i<3;i++)node("circle",{cx:zone.x+(i-1)*24,cy:zone.y+9,r:11,fill:"#111a23",stroke:COLORS[p],"stroke-width":1.5})}
for(let p=0;p<game.count;p++){for(let i=0;i<3;i++){const v=game.marbles[p][i];let x,y;if(v===-1){const zone=WAIT[p];x=zone.x+(i-1)*24;y=zone.y+9}else if(v<32){const a=-Math.PI/2+((p*8+v)%32)*Math.PI*2/32;x=240+155*Math.cos(a);y=240+155*Math.sin(a)}else{const a=-Math.PI/2+p*Math.PI/2,r=120-(v-32)*24;x=240+r*Math.cos(a);y=240+r*Math.sin(a)}
const c=node("circle",{cx:x,cy:y,r:9,fill:COLORS[p],stroke:"#fff","stroke-width":2});if(session&&p===session.player&&p===game.turn&&game.roll!==null&&legal(p,i,game.roll)){c.style.cursor="pointer";c.setAttribute("stroke-width","4");c.addEventListener("click",()=>move(i))}
const label=node("text",{x,y:y+3.5,"text-anchor":"middle",fill:"#121820","font-size":10,"font-weight":"bold","pointer-events":"none"});label.textContent=i+1}}
}

function historyPage(parent){const h=read(HISTORY,[]);E("strong",parent,"Completed games on this device: "+h.length);E("p",parent,"Your wins: "+h.filter(x=>x.winner===x.player).length);if(!h.length)E("p",parent,"No completed games yet.");for(const x of h.slice(0,30)){const row=E("div",parent,new Date(x.ended).toLocaleString()+" | Room "+x.room+" | "+NAMES[x.winner]+" won | "+x.moves+" moves | You: "+NAMES[x.player]);row.style.cssText="border-bottom:1px solid #465466;padding:5.25px 0;font-size:11px"}}
function render(){if(!panel)return;const body=panel.querySelector(".body");body.replaceChildren();const tabs=E("div",body);tabs.style.cssText="display:flex;gap:4.5px;flex-wrap:wrap;margin:6px 0";B(tabs,"Play",()=>{view="play";render()});B(tabs,"Game History",()=>{view="history";render()});if(view==="history"){historyPage(body);return}
if(!session){E("p",body,"Online multiplayer for 2–4 players. Each player joins from their own device. Roll 6 to leave Waiting for Chaos.");const controls=E("div",body);controls.style.cssText="display:flex;gap:4.5px;flex-wrap:wrap";const input=E("input",controls);input.placeholder="ROOM CODE";input.maxLength=6;input.style.cssText="width:115px;padding:5.25px";B(controls,"Join",()=>{const c=input.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c)){notice="Invalid room code";render();return}action("/"+c+"/join","POST",{},true)});for(let n=2;n<=4;n++)B(body,"Create "+n+"-player room",()=>action("","POST",{count:n},true));E("p",body,notice);return}
const header=E("div",body);header.style.cssText="padding:6px;background:#293747;border-radius:6px";header.textContent="Room: "+session.room+" | You: "+NAMES[session.player];const controls=E("div",body);controls.style.cssText="display:flex;gap:5.25px;flex-wrap:wrap;margin:6px 0";B(controls,"Copy Invite",()=>{const text="Join TU Chaos Marbles room "+session.room; if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).catch(()=>{});else notice=text});B(controls,"Leave",()=>{session=null;game=null;save();render()});B(controls,"Refresh",()=>action("/"+session.room+"/state"));
if(!game){E("p",body,"Loading room...");return}
const ready=game.ready;const status=E("div",body);status.style.cssText="padding:6px;border-radius:6px;background:#293747";status.textContent=game.winner!==null?NAMES[game.winner]+" wins!":!ready?"Waiting for Chaos: "+game.players.filter(Boolean).length+"/"+game.count+" players joined":game.turn===session.player?"Your turn — "+(game.roll===null?"roll the die":"move a marble (roll "+game.roll+")"):NAMES[game.turn]+"'s turn";
E("p",body,notice).style.fontSize="11px";E("div",body,"Waiting for Chaos — unplayed and captured marbles occupy the corner holding zones").style.cssText="font-size:11px;color:#d6b96a;text-align:center";drawBoard(body);
const moves=E("div",body);moves.style.cssText="display:flex;gap:4.5px;flex-wrap:wrap";const face=E("div",moves,rolling?String(dieValue):game.roll===null?"⚀":String(game.roll));face.className="chaos-die";face.style.cssText="display:grid;place-items:center;width:50px;height:50px;border-radius:9px;background:#f4ebd6;color:#182330;border:2px solid #d6b96a;font-size:22.5px;font-weight:bold;"+(rolling?"animation:chaosSpin .16s ease-in-out infinite alternate;":"");const die=B(moves,rolling?"Rolling…":"Roll die",roll);die.disabled=!ready||game.winner!==null||game.turn!==session.player||game.roll!==null||busy||rolling;
if(ready&&game.turn===session.player&&game.roll!==null)for(const i of choices())B(moves,"Move marble "+(i+1),()=>move(i));
E("p",body,"Moves: "+game.moves+" | Rolls: "+game.rolls+" | Home: "+game.marbles.map((a,p)=>NAMES[p]+" "+a.filter(x=>x===35).length+"/3").join(" · ")).style.fontSize="11px";
E("p",body,"Rules: Roll 6 to enter. Exact roll required to finish. Capture opponents by landing on them. A 6 earns another roll.").style.fontSize="11px"}
function activate({mount,close}){if(panel)return;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#20252e;color:#fff;border:1px solid #888;border-radius:12px;padding:11.25px;width:min(390px,94vw);height:min(690px,85vh);min-width:260px;min-height:320px;max-width:96vw;max-height:92vh;overflow:auto;resize:both;box-sizing:border-box;font:11px system-ui";
const bar=E("div",panel);bar.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:7.5px;touch-action:none;user-select:none;cursor:move";E("strong",bar,"Chaos Marbles");const min=B(bar,"−",close);min.title="Minimize to TU";min.style.cssText+=";font-size:16.5px;font-weight:bold;padding:0 9px;line-height:30px";
let drag=null;bar.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";bar.setPointerCapture(e.pointerId)});bar.addEventListener("pointermove",e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,drag.l+e.clientX-drag.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,drag.t+e.clientY-drag.y))+"px"});bar.addEventListener("pointerup",()=>drag=null);bar.addEventListener("pointercancel",()=>drag=null);
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:2.25px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:15.75px";let resize=null;grip.onpointerdown=e=>{e.preventDefault();const r=panel.getBoundingClientRect();resize={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";grip.setPointerCapture(e.pointerId)};grip.onpointermove=e=>{if(!resize)return;panel.style.width=Math.max(260,Math.min(innerWidth-resize.l-8,resize.w+e.clientX-resize.x))+"px";panel.style.height=Math.max(320,Math.min(innerHeight-resize.t-8,resize.h+e.clientY-resize.y))+"px"};grip.onpointerup=()=>resize=null;grip.onpointercancel=()=>resize=null;
E("style",panel,"@keyframes chaosSpin{from{transform:rotate(-14deg) scale(.9)}to{transform:rotate(14deg) scale(1.1)}}");E("div",panel).className="body";session=read(SESSION,null);render();if(session)action("/"+session.room+"/state");timer=setInterval(()=>{if(session&&!busy&&panel)action("/"+session.room+"/state")},2500)}
function deactivate(){clearInterval(timer);clearInterval(rollTimer);timer=null;rollTimer=null;panel?.remove();panel=null}
function register(){return (typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register({id:ID,version:TU_MODULE_VERSION,activate,deactivate})}
if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="chaos-marbles";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"chaos-marbles",version:"0.2.5",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: item-monitor (1.12.53-dev) */
(()=>{
const quickItemCapturePage=typeof unsafeWindow!=='undefined'&&unsafeWindow.document?unsafeWindow:window;
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="item-monitor")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="item-monitor"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"1.12.53-dev"}};
const createNativeClockSync=function createNativeClockSync({document,window,sync}){
 let observer=null;
 const selector='#travel-root [aria-label="Flight progress"],a[aria-label^="Hospital:"],[data-hospital-until]';
 const privateRoots='#tu-snatch-run,#tu-snatch-extra-hosp,#tuim-panel,#tuim-menu,#tu-pda-panel,#tu-landing-alert,#tu-purchase-confirmation';
 const element=node=>node?.nodeType===1?node:node?.parentElement;
 const relevant=node=>{const el=element(node);return !!el&&!el.closest(privateRoots)&&!!el.closest(selector);};
 const subtree=node=>{const el=element(node);return !!el&&!el.closest(privateRoots)&&(el.matches(selector)||!!el.querySelector(selector));};
 const update=()=>{if(!document.hidden)sync();};
 return {start(){if(observer)return;observer=new window.MutationObserver(records=>{if(records.some(record=>relevant(record.target)||record.type==='attributes'&&record.attributeName==='aria-label'&&/^Hospital:/.test(record.oldValue||'')&&!element(record.target)?.closest(privateRoots)||[...record.addedNodes,...record.removedNodes].some(subtree)))update();});observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['aria-label','title','data-original-title','data-hospital-until','data-until','data-time','datetime']});document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);update();},stop(){observer?.disconnect();observer=null;document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);}};
};
const createStockMonitorDiagnostic=function createStockMonitorDiagnostic({window,storageKey,scrub=value=>String(value),now=()=>Date.now(),build='unknown'}){
 let active=false,pending=null,samples=[],events=[],latest=new Map(),droppedSamples=0,droppedEvents=0,stats={attempts:0,completed:0,hidden:0,unfocused:0,errors:0};
 const strings=['item','key','category','pageCategory','country','scanStatus','rowSource','stage','readinessReason','event','reason','audioState','sound','alarmDecision','nativeStockText'];
 const numbers=['quantity','engineQuantity','minimumQty','maximumPrice','price','volume','repeatCount'];
 const booleans=['nativeRowFound','cachedRowConnected','cachedMatchesNative','qualifies','fired','audibleEnabled','visualEnabled','audioActive','focused','visible','nativeThresholdMet'];
 const codes=new Set('diagnostic-start diagnostic-stop stock-timeline stock-state-change stock-ready stock-ignored armed cancel inventory-alarm-requested inventory-alarm-dispatched inventory-alarm-suppressed inventory-alarm-muted stock-threshold-hit monitor-scan-error native-quantity-changed threshold-result-changed scan-status-changed page-hidden page-not-focused evidence-error completed item-row-not-found quantity-unreadable market-item-mismatch native-shop cached-or-fallback none off not-evaluated already-latched item-muted alarm-requested below-threshold audio-context-running audio-unavailable-or-suspended item-audible-alert-disabled user-muted manual-test not-armed different-armed-item traveling player-unavailable-or-changed destination-unavailable-or-changed quantity-unavailable-or-zero run-inactive-or-expired tool-inactive run-expired action-busy waiting-for-stock confirmation-pending return-flight in-flight stock-or-hospital-status-unavailable state-or-stock-not-ready ready'.split(' '));
 const enumFields=new Set(['event','reason','scanStatus','rowSource','alarmDecision','readinessReason']);
 function clean(value){const out={};for(const k of strings)if(typeof value?.[k]==='string')out[k]=(enumFields.has(k)&&codes.has(value[k])?value[k]:scrub(value[k])).replace(/https?:\/\/\S+/gi,'[URL OMITTED]').slice(0,120);for(const k of numbers)out[k]=Number.isFinite(value?.[k])?value[k]:null;for(const k of booleans)if(typeof value?.[k]==='boolean')out[k]=value[k];return out;}
 const stamp=()=>new Date(now()).toISOString();
 function flush(){window.clearTimeout(pending);pending=null;try{window.sessionStorage.setItem(storageKey,JSON.stringify({schemaVersion:1,build,samples,events,droppedSamples,droppedEvents,stats}));}catch{stats.errors++;}}
 function schedule(){if(pending===null)pending=window.setTimeout(flush,5000);}
 try{const saved=JSON.parse(window.sessionStorage.getItem(storageKey)||'null');if(saved?.schemaVersion===1){for(const field of ['samples','events']){const entries=Array.isArray(saved[field])?saved[field]:[];const restored=entries.slice(-(field==='samples'?512:256)).filter(e=>typeof e.at==='string').map(e=>({...clean(e),at:e.at.slice(0,30),lastSeenAt:String(e.lastSeenAt||e.at).slice(0,30),build:String(e.build||'unknown').slice(0,40)}));if(field==='samples')samples=restored;else events=restored;}for(const e of samples)latest.set(e.category+':'+e.key,e);droppedSamples=Number(saved.droppedSamples)||0;droppedEvents=Number(saved.droppedEvents)||0;for(const k of Object.keys(stats))stats[k]=Number.isSafeInteger(saved.stats?.[k])?saved.stats[k]:0;}}catch{}
 function event(value){if(!active)return;const entry=clean(value),prior=events.at(-1);if(prior&&JSON.stringify(clean(prior))===JSON.stringify({...entry,repeatCount:prior.repeatCount??null})&&now()-Date.parse(prior.lastSeenAt)<60000){prior.repeatCount=(prior.repeatCount||1)+1;prior.lastSeenAt=stamp();}else{events.push({...entry,at:stamp(),lastSeenAt:stamp(),build,repeatCount:1});if(events.length>256){events.shift();droppedEvents++;}}schedule();}
 function observe(value){if(!active)return;const entry=clean(value),id=entry.category+':'+entry.key,prior=latest.get(id);const comparable=e=>JSON.stringify({...clean(e),repeatCount:null});if(prior&&comparable(prior)===comparable(entry)&&now()-Date.parse(prior.at)<60000){prior.repeatCount=(prior.repeatCount||1)+1;prior.lastSeenAt=stamp();schedule();return;}
  const next={...entry,at:stamp(),lastSeenAt:stamp(),build,repeatCount:1};samples.push(next);latest.set(id,next);if(latest.size>64)latest.delete(latest.keys().next().value);if(samples.length>512){samples.shift();droppedSamples++;}
  if(prior&&(prior.quantity!==entry.quantity||prior.qualifies!==entry.qualifies||prior.scanStatus!==entry.scanStatus))event({...entry,event:'stock-state-change',reason:prior.quantity!==entry.quantity?'native-quantity-changed':prior.qualifies!==entry.qualifies?'threshold-result-changed':'scan-status-changed'});schedule();
 }
 const attempt=status=>{if(!active)return;stats.attempts++;if(status==='completed')stats.completed++;else if(status==='page-hidden')stats.hidden++;else if(status==='page-not-focused')stats.unfocused++;else stats.errors++;schedule();};
 const onFunction=e=>{try{const value=typeof e.detail==='string'?JSON.parse(e.detail):e.detail;if(['stock-ready','stock-ignored','armed','cancel'].includes(value?.event))event(value);}catch{}};
 return {clear(){window.clearTimeout(pending);pending=null;samples=[];events=[];latest.clear();droppedSamples=droppedEvents=0;stats={attempts:0,completed:0,hidden:0,unfocused:0,errors:0};try{window.sessionStorage.removeItem(storageKey);}catch{}},observe,event,attempt,isActive:()=>active,start(){if(active)return;active=true;window.addEventListener('pagehide',flush);window.document.addEventListener('tu-snatch-run-diagnostic',onFunction);event({event:'diagnostic-start',reason:'stock-timeline'});},stop(){if(active)event({event:'diagnostic-stop',reason:'stock-timeline'});active=false;window.document.removeEventListener('tu-snatch-run-diagnostic',onFunction);window.removeEventListener('pagehide',flush);if(pending!==null)flush();},report:()=>({schemaVersion:1,active,build,stats:{...stats},droppedSamples,droppedEvents,limits:{samples:512,events:256,heartbeatSeconds:60},latest:[...latest.values()].map(e=>({...e})),samples:samples.map(e=>({...e})),events:events.map(e=>({...e})),limitations:['Passive observations cannot recover stock changes Torn never rendered.','Audio dispatch/context state is not proof of audible output.','Repeated identical readings coalesce; first/last timestamps and repeatCount identify the interval.']})};
};
const createAlarmAudio=function createAlarmAudio({window,getVolume,getDuration,onActive=()=>{},now=()=>Date.now()}){
 let audio=null,batchTimer=null,stopTimer=null,nodes=[],active=false;
 const unlock=()=>{try{const C=window.AudioContext||window.webkitAudioContext;if(C){audio=audio||new C();audio.resume?.()?.catch?.(()=>{});}}catch{}};
 const stop=()=>{window.clearTimeout(batchTimer);window.clearTimeout(stopTimer);batchTimer=stopTimer=null;for(const node of nodes){try{node.stop();}catch{}}nodes=[];active=false;onActive(false);};
 const play=({sound='beep'}={})=>{stop();unlock();if(!audio)return;const cfg=getDuration(),seconds=Math.max(.5,Math.min(86400,Number(cfg.seconds)||3)),deadline=cfg.untilMuted?Infinity:now()+seconds*1000;active=true;onActive(true);
  function batch(){if(!active)return;nodes=[];try{const level=Math.max(0,Math.min(100,Number(getVolume()??60)))/100;for(let n=0;n<8&&now()+n*400<deadline;n++){const osc=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+n*.4;osc.type=sound==='siren'?'sawtooth':sound==='chime'?'sine':'square';if(osc.frequency.setValueAtTime)osc.frequency.setValueAtTime(sound==='chime'?1046:850,at);else osc.frequency.value=sound==='chime'?1046:850;if(sound==='siren')osc.frequency.linearRampToValueAtTime?.(1400,at+.22);gain.gain.setValueAtTime(level*.13,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.25);osc.connect(gain);gain.connect(audio.destination);osc.onended=()=>{osc.disconnect?.();gain.disconnect?.();};osc.start(at);osc.stop(at+.28);nodes.push(osc);}if(now()+3200<deadline)batchTimer=window.setTimeout(batch,3200);}catch{stop();}}
  batch();if(Number.isFinite(deadline))stopTimer=window.setTimeout(stop,seconds*1000);
 };
 return {unlock,stop,play,status:()=>({active,volume:Math.max(0,Math.min(100,Number(getVolume())||0)),supported:!!(window.AudioContext||window.webkitAudioContext),contextState:audio?.state||'not-created'})};
};
const createLandingAlarm=function createLandingAlarm({document,window,getFlight,getSettings,audio,readSaved=()=>null,save=()=>{},now=()=>Date.now(),onEvent=()=>{}}){
 let timer=null,flight=null,raw='',arrival=null,notified=readSaved(),banner=null;
 function stopVisual(){banner?.remove();banner=null;}
 function snapshot(){const seconds=arrival===null?null:Math.max(0,Math.ceil((arrival-now())/1000));return {outbound:!!flight&&!flight.returning,arrival,remainingSeconds:seconds,enabled:!!getSettings().enabled,thresholdSeconds:Math.max(1,Number(getSettings().seconds)||60),sound:getSettings().sound||'chime',volumePercent:audio?.status?.().volume??null,audioState:audio?.status?.().contextState||'unknown',fired:!!(notified&&flight&&notified.route===flight.route&&Math.abs(notified.arrival-arrival)<10000)};}
 function tick(){
  const next=getFlight();
  if(!next||next.returning){flight=null;raw='';arrival=null;if(!getSettings().enabled){stopVisual();audio?.stop?.();}return snapshot();}
  if(next.route!==flight?.route){raw='';arrival=null;stopVisual();audio?.stop?.();}flight=next;
  // Re-anchor only when Torn actually changes the displayed timer, then count locally.
  if(next.timerText!==raw){raw=next.timerText;const match=raw.match(/^(\d{1,3}):([0-5]\d):([0-5]\d)$/);arrival=match?now()+(+match[1]*3600 + +match[2]*60 + +match[3])*1000:null;}
  if(getSettings().audio===false)audio?.stop?.();if(getSettings().visual===false)stopVisual();
  const state=snapshot();
  if(!state.enabled){stopVisual();audio?.stop?.();return state;}if(state.remainingSeconds===null||state.remainingSeconds===0){if(banner&&state.remainingSeconds===0)banner.querySelector('[data-landing-label]').textContent='Landing now';return state;}
  if(state.remainingSeconds<=state.thresholdSeconds&&!state.fired){notified={route:flight.route,arrival};save(notified);if(getSettings().audio!==false)audio?.play?.({sound:state.sound});onEvent('landing-alarm',{remainingSeconds:state.remainingSeconds,threshold:state.thresholdSeconds,sound:state.sound});
   if(getSettings().visual!==false){banner=document.createElement('div');banner.id='tu-landing-alert';banner.setAttribute('role','button');banner.tabIndex=0;banner.setAttribute('aria-label','Landing soon. Click to mute');banner.onclick=event=>{event.stopPropagation();mute();};banner.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();mute();}};banner.style.cssText='position:fixed;top:12px;left:12px;right:12px;z-index:2147483644;padding:12px;background:#ffd44d;color:#111;border:4px solid #fff;border-radius:8px;text-align:center;font:bold 13.5px system-ui;cursor:pointer;pointer-events:auto';const style=document.createElement('style');style.textContent='@keyframes tu-landing-flash{50%{opacity:.3}}#tu-landing-alert{animation:tu-landing-flash .6s steps(1,end) infinite}';banner.append(style);const label=document.createElement('span');label.textContent='Landing soon — '+state.remainingSeconds+' seconds';label.dataset.landingLabel='1';banner.append(label);const hint=document.createElement('small');hint.textContent='Click to Mute';hint.style.cssText='display:block;font-size:11px;margin-top:4.5px';banner.append(hint);document.body.append(banner);}
  }
  if(banner)banner.querySelector('[data-landing-label]').textContent='Landing soon — '+state.remainingSeconds+' seconds';return snapshot();
 }
 function mute(){audio?.stop?.();stopVisual();onEvent('landing-alarm-muted',{});}
 return {tick,snapshot,mute,start(){if(timer!==null)return;tick();timer=window.setInterval(tick,1000);},stop(){window.clearInterval(timer);timer=null;stopVisual();audio?.stop?.();},test(){audio?.unlock?.();audio?.play?.({sound:getSettings().sound||'chime'});}};
};
const createSteppedNativeActions=function createSteppedNativeActions({native}){
 let job=null;
 const nextLabel=(kind,label)=>{const value=String(label||'').trim().toLowerCase();if(/^no$/.test(value))return 'Cancel '+(kind==='buy'?'purchase':'item action');if(/^yes$/.test(value))return kind==='buy'?'Confirm purchase':kind==='destroy'?'Destroy selected item':'Confirm return flight';if(/^continue/.test(value))return 'Continue to return flight';if(/travel back/.test(value))return 'Book return flight';if(/travel home/.test(value))return 'Open return flight';if(/trash/.test(value))return 'Trash selected item';if(/close/.test(value))return 'Close item result';if(/^(max|maximum)$/.test(value))return 'Set maximum quantity';if(/^buy$/.test(value))return 'Buy selected quantity';return kind==='destroy'?'Select item for destruction':kind==='buy'?'Open purchase panel':'Open return flight';};
 function deliver(current,error,result){if(current.waiter){const waiter=current.waiter;current.waiter=null;error?waiter.reject(error):waiter.resolve(result);}else current.outcome={error,result};}
 function cancel(){const current=job;job=null;if(current){const error=Error('Action canceled. No further Torn step was sent.');current.cancelled=true;current.gate?.reject(error);deliver(current,error);}native.cancel?.();}
 async function execute(kind,options){
  if(!options.event?.isTrusted||!options.guard())throw Error('A fresh user click and unchanged run are required for each Torn step.');
  if(job&&(job.run!==options.run||job.kind!==kind))throw Error('Finish or cancel the pending Torn action before starting another.');
  const current=job||{run:options.run,kind,first:true,gate:null,waiter:null};
  if(current.waiter)throw Error('The current Torn step is still being checked.');
  const response=new Promise((resolve,reject)=>{current.waiter={resolve,reject};});
  if(job){if(!current.gate){deliver(current,Error('The next Torn control is not ready.'));return response;}const gate=current.gate;current.gate=null;gate.resolve();}
  else{
   job=current;
   const awaitAction=async label=>{if(current.cancelled||!options.guard())throw Error('Run changed; no further Torn step was sent.');if(current.first){current.first=false;return;}
    const waiting=new Promise((resolve,reject)=>{current.gate={resolve,reject};});
    deliver(current,null,{actionPending:true,nextLabel:nextLabel(kind,label)});await waiting;
   };
   Promise.resolve().then(()=>native.execute(kind,{...options,awaitAction})).then(result=>{if(job===current)job=null;deliver(current,null,result);},error=>{if(job===current)job=null;deliver(current,error);});
  }
  return response;
 }
 return {...native,execute,cancel,forget(){cancel();native.forget?.();},hasPendingStep:()=>!!job?.gate,isStepping:()=>!!job};
};
const createSnatchDirectItems=function createSnatchDirectItems({native,getPilot,getProfile,window,now=()=>Date.now()}){
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
   consumed=true;
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
   removed=result.result==='destruction-confirmed';
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
};
const createTravelRequestCapture=function createTravelRequestCapture({window,document,pageWindow=window,now=()=>Date.now(),build='unknown'}){
 // Per-tab build boundary: discard evidence, preserve monitoring and all gameplay settings/locks.
 try{const marker='tu:diagnostics:build:v1',prior=window.sessionStorage.getItem(marker);if(prior!==build){const monitor='tu:item-monitor:dev:diagnostics:v1',network='tu:direct-items:travel-network:v1';let state={},net={};try{state=JSON.parse(window.sessionStorage.getItem(monitor+':monitor')||'{}');net=JSON.parse(window.sessionStorage.getItem(network)||'{}');}catch{}for(const key of [monitor,monitor+':page','tu:item-monitor:stock-evidence:v1','tu:direct-items:log:v1','tu:diagnostics:ui:v1',network])window.sessionStorage.removeItem(key);if(state.active!==undefined)window.sessionStorage.setItem(monitor+':monitor',JSON.stringify({active:state.active===true,stage:state.stage}));if(net.active)window.sessionStorage.setItem(network,JSON.stringify({schemaVersion:1,active:true}));window.sessionStorage.setItem(marker,build);}}catch{}
 const KEY='tu:direct-items:travel-network:v1';let active=false,resumeActive=false,flushTimer=null,records=[],actions=[],droppedRequests=0,droppedActions=0,sequence=0,lastAction=null,lastUserAction=null,persistenceState='unwritten',banner=null,oldFetch,oldOpen,oldSend,wrappedFetch,wrappedOpen,wrappedSend;
 const responseOwners=new WeakMap(),aliases=new WeakMap();const xhrMeta=new WeakMap(),listeners=new Map(),hooks={fetch:false,xhr:false};let installed=false,resourceObserver=null,recentPointer=null;const resources=[],counters={eventsSeen:0,outsideTravel:0,controlsSeen:0,fetchCalls:0,xhrSends:0,filteredRequests:0,resourceEntries:0,duplicateFetchObservations:0},instrumentedAt=new Date(now()).toISOString();
 const name=value=>String(value||'').replace(/[^a-zA-Z0-9_.\[\]-]/g,'').slice(0,60);
 function fields(value){let pairs=[];try{if(value&&typeof value.entries==='function')pairs=[...value.entries()];else if(typeof value==='string'){if(value.trim().startsWith('{'))pairs=Object.entries(JSON.parse(value));else if(value.startsWith('--')&&value.includes('Content-Disposition:')){const boundary=value.split(/\r?\n/,1)[0];for(const part of value.split(boundary).slice(1,61)){const match=part.match(/Content-Disposition:\s*form-data;[^\r\n]*?name="([^"]+)"/i),split=part.search(/\r?\n\r?\n/);if(match&&split>=0){const content=part.slice(split).replace(/^\r?\n\r?\n/,'').replace(/\r?\n$/,'');pairs.push([match[1],/filename=/i.test(part.slice(0,split))?'[file omitted]':content]);}}}else pairs=[...new URLSearchParams(value)];}else if(value&&typeof value==='object')pairs=Object.entries(value);}catch{}const result=[];function add(key,value,prefix='',depth=0){if(result.length>=80)return;const field=name(prefix+key),base=name(key).split('.').at(-1),sensitive=/rfc|csrf|token|auth|password|cookie|secret|session|key/i.test(field);let safe='[omitted]';if(!sensitive&&/^(sid|step|action|substep|type|operation|mode|category)$/i.test(base)&&/^[a-z][a-z0-9_-]{0,50}$/i.test(String(value)))safe=String(value);if(!sensitive&&/^(item|itemID|item_id|id|uid|slot|slotID|slot_id|instanceId|instance_id|confirm|amount|quantity|cat)$/i.test(base)&&/^[ug]?\d{1,24}$/.test(String(value)))safe=String(value);result.push({name:field,value:safe,type:typeof value});if(!sensitive&&depth<3){let nested=value;if(typeof value==='string'&&/^(data|params|payload)$/i.test(base)&&value.trim().startsWith('{'))try{nested=JSON.parse(value);}catch{}if(nested&&typeof nested==='object'&&!Array.isArray(nested))for(const [child,entry] of Object.entries(nested).slice(0,30))add(child,entry,field+'.',depth+1);}}for(const [key,value] of pairs.slice(0,60))add(key,value);return result;}
 function route(input){try{const url=new URL(typeof input==='string'?input:input.url,window.location.origin);if(url.origin!==window.location.origin||!/^[\w/.-]{1,160}$/.test(url.pathname))return null;return {path:url.pathname,query:fields(url.search.slice(1))};}catch{return null;}}
 function flush(){window.clearTimeout(flushTimer);flushTimer=null;try{window.sessionStorage.setItem(KEY,JSON.stringify({schemaVersion:1,active,records,actions,resources,counters,droppedRequests,droppedActions,sequence}));persistenceState='saved';}catch{persistenceState='failed';}}
 function schedule(){if(flushTimer===null)flushTimer=window.setTimeout(flush,2000);}
 function action(kind,details={}){const value={id:++sequence,at:new Date(now()).toISOString(),build,kind,...details};actions.push(value);if(actions.length>300){actions.shift();droppedActions++;}schedule();return value;}
 // Restore only this recorder's strictly bounded, sanitized format. Never restore bodies or headers.
 try{const saved=JSON.parse(window.sessionStorage.getItem(KEY)||'null');if(saved?.schemaVersion===1){resumeActive=saved.active===true;droppedRequests=Math.max(0,Number(saved.droppedRequests)||0);droppedActions=Math.max(0,Number(saved.droppedActions)||0);sequence=Math.max(0,Number(saved.sequence)||0);const stamp=v=>/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(String(v))?String(v):'';const version=v=>/^\d+(?:\.\d+){3}-[a-z0-9.-]+$/.test(String(v))?String(v):'unknown';const safeFields=v=>{const input=(Array.isArray(v)?v:[]).slice(0,60);return fields(Object.fromEntries(input.map(f=>[name(f?.name),f?.value]))).map((field,i)=>({...field,type:['string','number','boolean','object','undefined'].includes(input[i]?.type)?input[i].type:field.type}));};for(const key of Object.keys(counters))if(Number.isSafeInteger(saved.counters?.[key])&&saved.counters[key]>=0)counters[key]=saved.counters[key];for(const r of (Array.isArray(saved.resources)?saved.resources:[]).slice(-120)){if(!/^[\w/.-]{1,160}$/.test(r.path||'')||!['fetch','xmlhttprequest'].includes(r.initiatorType))continue;resources.push({at:stamp(r.at),build:version(r.build),path:r.path,query:safeFields(r.query),initiatorType:r.initiatorType,durationMs:Number.isFinite(r.durationMs)?r.durationMs:null});}for(const r of (Array.isArray(saved.records)?saved.records:[]).slice(-300)){if(!/^[\w/.-]{1,160}$/.test(r.path||'')||!['GET','POST'].includes(r.method))continue;records.push({id:Number(r.id)||0,at:stamp(r.at),build:version(r.build),method:r.method,path:r.path,query:safeFields(r.query),body:safeFields(r.body),bodyState:['captured','pending','no-fields','unparsed','empty-or-not-observed'].includes(r.bodyState)?r.bodyState:r.body?.length?'captured':'empty-or-not-observed',bodyVariants:(Array.isArray(r.bodyVariants)?r.bodyVariants:[]).slice(0,2).map(safeFields),userActionId:Number(r.userActionId)||null,actionId:Number(r.actionId)||null,captureLayers:Number.isSafeInteger(r.captureLayers)?r.captureLayers:1,scope:r.scope==='known-route'?'known-route':'correlated-candidate',response:{state:['pending','received','network-error'].includes(r.response?.state)?r.response.state:'unknown',httpStatus:Number(r.response?.httpStatus)||null,elapsedMs:Number(r.response?.elapsedMs)||null,format:['json','html','text'].includes(r.response?.format)?r.response.format:'unknown',keys:Array.isArray(r.response?.keys)?r.response.keys.slice(0,40).map(name):[],success:typeof r.response?.success==='boolean'?r.response.success:null,signals:Array.isArray(r.response?.signals)?r.response.signals.filter(v=>['hospital','cooldown','life','used','confirm','error','wrong item','bought','travel'].includes(v)):[],errorCode:Number.isFinite(r.response?.errorCode)?r.response.errorCode:null,inventory:r.response?.inventory?restoreInventory(r.response.inventory):undefined,itemUse:r.response?.itemUse?useInfo({...Object.fromEntries(Object.entries(r.response.itemUse.flags||{}).map(([k,v])=>[k,v?.value])),message:r.response.itemUse.hospitalRelease==='still-hospitalized'?'You are still in hospital.':r.response.itemUse.hospitalRelease==='explicit-release-message-needs-status-check'?'You are out of the hospital.':''}):undefined}});}for(const a of (Array.isArray(saved.actions)?saved.actions:[]).slice(-300)){actions.push({id:Number(a.id)||0,at:stamp(a.at),build:version(a.build),kind:['click','quantity-change','navigation','recording-start','recording-stop'].includes(a.kind)?a.kind:'navigation',control:name(a.control),parentUserActionId:Number(a.parentUserActionId)||null,trusted:a.trusted===true,stage:name(a.stage),slotIdentity:Object.fromEntries(Object.entries(a.slotIdentity||{}).filter(([key,value])=>/^data-(item-id|item|id|item-uid|slot|slot-id)$/.test(key)&&/^[ug]?\d{1,24}$/.test(String(value)))),quantity:Number.isFinite(a.quantity)?a.quantity:null,path:/^[\w/.-]{1,160}$/.test(a.path||'')?a.path:'',query:safeFields(a.query)});}}}catch{}
 function markNativeClick(event){if(!active)return;counters.eventsSeen++;const node=event.target?.nodeType===1?event.target:event.target?.parentElement;if(!node||typeof node.closest!=='function')return;const target=node.closest('button,a,[role=button],[role=option],input[type=submit],input[type=button]');if(!target)return;const snatch=target.closest('#tu-snatch-run,#tu-snatch-extra-hosp,#tu-snatch-departure-choice'),root=target.closest('#travel-root'),slot=target.closest('li[class*=inventorySlot]');if(!snatch&&!root){counters.outsideTravel++;return;}if(target.closest('#tuim-panel,#tuim-menu,#tuim-quickitems-test'))return;if(event.type==='click'&&recentPointer?.target===target&&recentPointer.trusted===!!event.isTrusted&&now()-recentPointer.at<700)return;if(event.type==='pointerdown')recentPointer={target,at:now(),trusted:!!event.isTrusted};counters.controlsSeen++;let control=(target.getAttribute('aria-label')||target.textContent||target.value||'').trim().replace(/\s+/g,' ').toLowerCase();if(snatch)control='snatch-stage';else if(target.matches('[role=option]'))control='select-inventory-item';else if(slot&&target===slot.querySelector(':scope > button'))control='open-inventory-item';else if(!/^(use|yes|no|trash|buy|max|add|fill|cancel|travel home|travel back|confirm travel back|continue(?:\s*\(\d+\))?|travel|fly)$/i.test(control))control='native-control';
  const slotIdentity={};if(slot)for(const key of ['data-item-id','data-item','data-id','data-item-uid','data-slot','data-slot-id']){const value=slot.getAttribute(key);if(/^[ug]?\d{1,24}$/.test(value||''))slotIdentity[key]=value;}const value=action('click',{control,slotIdentity,eventType:event.type||'click',parentUserActionId:!event.isTrusted&&lastUserAction&&now()-lastUserAction.at<10000?lastUserAction.id:null,trusted:!!event.isTrusted,stage:name(snatch?.dataset.snatchStage||''),path:window.location.pathname});lastAction={id:value.id,at:now(),trusted:!!event.isTrusted};if(event.isTrusted)lastUserAction={id:value.id,at:now()};
 }
 function quantityChanged(event){if(!active||event.target?.nodeType!==1||!event.target.closest('#travel-root')||!event.target.matches('input')||!/^[\d,]+$/.test(event.target.value||''))return;action('quantity-change',{quantity:Number(event.target.value.replace(/,/g,'')),trusted:!!event.isTrusted,path:window.location.pathname});}
 function begin(input,method,body){if(!active||!['GET','POST'].includes(String(method).toUpperCase()))return null;const target=route(input);if(!target)return null;const sid=target.query.find(f=>f.name==='sid')?.value||'',queryText=target.query.map(f=>f.name+'='+f.value).join('&');if(/chat|message|mail|login|auth|password|captcha|security|forum/i.test(target.path+'?'+queryText)||/\.(png|jpg|gif|svg|css|js|woff2?)$/i.test(target.path))return null;const requestFields=fields(body),known=/^\/(?:item|travelagency|travel)\.php$/i.test(target.path)||/^\/(?:page|loader)\.php$/i.test(target.path)&&/^(?:travel|travelagency|travelData|items|itemsLoadouts)$/i.test(sid);const correlated=lastAction&&now()-lastAction.at<5000;if(!known&&!correlated){counters.filteredRequests++;return null;}
  const entry={id:++sequence,at:new Date(now()).toISOString(),build,method:String(method).toUpperCase(),...target,body:requestFields,bodyState:requestFields.length?'captured':'empty-or-not-observed',actionId:lastAction&&now()-lastAction.at<10000?lastAction.id:null,userActionId:lastUserAction&&now()-lastUserAction.at<10000?lastUserAction.id:null,scope:known?'known-route':'correlated-candidate',response:{state:'pending'},started:now()};records.push(entry);if(records.length>300){records.shift();droppedRequests++;}schedule();return entry;
 }
 function canonical(entry){while(entry&&aliases.has(entry))entry=aliases.get(entry);return entry;}
 function mergeFields(entry,body){const target=canonical(entry);if(body.length){if(!target.body.length)target.body=body;else if(JSON.stringify(target.body)!==JSON.stringify(body)){target.bodyVariants=target.bodyVariants||[];if(target.bodyVariants.length<2&&!target.bodyVariants.some(v=>JSON.stringify(v)===JSON.stringify(body)))target.bodyVariants.push(body);}target.bodyState='captured';}}
 function setBody(entry,value){if(!active||!entry)return;const target=canonical(entry),body=fields(value);mergeFields(target,body);if(!body.length&&!target.body.length)target.bodyState=typeof value==='string'&&value.length?'unparsed':'no-fields';schedule();}
 function responseOwner(entry,response){if(!entry||!response||typeof response!=='object')return entry;const prior=canonical(responseOwners.get(response)),target=canonical(entry);if(prior&&prior!==target&&prior.method===target.method&&prior.path===target.path&&JSON.stringify(prior.query)===JSON.stringify(target.query)&&prior.userActionId===target.userActionId){if(target.body.length)mergeFields(prior,target.body);for(const variant of target.bodyVariants||[])mergeFields(prior,variant);aliases.set(target,prior);const index=records.indexOf(target);if(index>=0)records.splice(index,1);prior.captureLayers=(prior.captureLayers||1)+1;counters.duplicateFetchObservations++;schedule();return prior;}responseOwners.set(response,target);return target;}
 function restoreInventory(saved){
  // Rebuild only the bounded slot/item paths we captured, then sanitize again.
  // Do not flatten the nested item identity into a new slot on navigation.
  const rows=[];
  for(const row of (Array.isArray(saved?.slots)?saved.slots:[]).slice(0,80)){
   const match=String(row?.path||'').match(/^slots\[(\d{1,2})\](\.item)?$/);
   if(!match||Number(match[1])>=40||!row.fields||typeof row.fields!=='object')continue;
   const index=Number(match[1]);rows[index]||={};
   if(match[2])rows[index].item=row.fields;else Object.assign(rows[index],Object.fromEntries(Object.entries(row.fields).filter(([key])=>key!=='item'&&key!=='__proto__'&&key!=='constructor')));
  }
  return inventoryInfo({slots:rows,...Object.fromEntries(['excessSlots','maxSpecialSlots','maxBaseSlots'].map(key=>[key,saved?.capacities?.[key]]))});
 }
 function inventoryInfo(data){
  const schema=[],slots=[],capacities={};let visited=0;
  for(const key of ['excessSlots','maxSpecialSlots','maxBaseSlots'])if(Number.isSafeInteger(data?.[key])&&data[key]>=0&&data[key]<=10000)capacities[key]=data[key];
  function walk(value,path,depth){if(depth>5||++visited>240||!value||typeof value!=='object')return;
   if(Array.isArray(value)){schema.push({path,type:'array',length:value.length});value.slice(0,40).forEach((v,i)=>walk(v,path+'['+i+']',depth+1));return;}
   const safe={};for(const [key,v] of Object.entries(value).slice(0,40)){
    if(/rfc|csrf|token|auth|password|cookie|secret|session|key|owner|player|user/i.test(key)||!/^[a-zA-Z_][a-zA-Z0-9_]{0,39}$/.test(key))continue;
    schema.push({path:path+'.'+key,type:v===null?'null':Array.isArray(v)?'array':typeof v});
    if(/^(slotID|slotId|slot_id|itemID|itemId|item_id|ID|id|quantity|qty|amount)$/.test(key)&&/^\d{1,24}$/.test(String(v)))safe[key]=String(v);
    if(/^(name|itemName|type|category)$/.test(key)&&typeof v==='string'&&v.length<=120&&!/[<>\r\n]/.test(v)&&!/(?:https?:|token|rfcv|secret)/i.test(v))safe[key]=v;
    if(v&&typeof v==='object')walk(v,path+'.'+key,depth+1);
   }if(Object.keys(safe).length)slots.push({path,fields:safe});
  }walk(data?.slots,'slots',0);
  const mappings=slots.map(row=>{const f=row.fields;return {path:row.path,slotId:f.slotID||f.slotId||f.slot_id||null,itemId:f.itemID||f.itemId||f.item_id||null,name:f.itemName||f.name||null};}).filter(row=>row.slotId&&row.itemId);
  // Observed Torn travelData schema: the outer ID identifies the slot;
  // item.ID identifies the item type. Never use an array index or armouryID.
  for(const row of slots){
   if(!/^slots\[\d+\]$/.test(row.path)||!row.fields.ID)continue;
   const item=slots.find(child=>child.path===row.path+'.item');
   if(!item?.fields.ID||mappings.some(existing=>existing.path===row.path))continue;
   mappings.push({path:row.path,slotId:row.fields.ID,itemId:item.fields.ID,name:item.fields.name||null,identitySource:'travelData.slots[].ID + item.ID'});
  }
  const unique=new Set(mappings.map(row=>row.slotId)).size===mappings.length;
  const nativeLabels=[...document.querySelectorAll('#travel-root [class*="inventorySlot"] button[aria-label]')].slice(0,60).map(node=>node.getAttribute('aria-label')).filter(v=>v&&v.length<=120&&!/[<>]/.test(v));
  return {capacities,schema:schema.slice(0,300),slots:slots.slice(0,80),mappings,uniqueSlotIds:unique,nativeLabels,mappingState:mappings.length&&unique?'explicit-identities-observed-unvalidated':'unresolved',directTravelUseEnabled:false};
 }
 function useInfo(data){
  const flags={};for(const key of ['success','itemRemoved','useAnother']){const value=data?.[key];flags[key]={type:typeof value,value:typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)?value:null};}
  const message=String(data?.message||data?.text||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').toLowerCase();
  const still=/still.{0,30}hospital|remain.{0,30}hospital/.test(message),released=!still&&/you (?:are|have been) (?:now )?(?:out of|released from) (?:the )?hospital/.test(message);
  const hospitalized=!released&&/\byou (?:are|have been|were) (?:now )?(?:hospitali[sz]ed|(?:put |placed )?in (?:the )?hospital)\b|\byou hospitali[sz]ed yourself\b/.test(message);
  let seconds=0;for(const match of message.matchAll(/\b(\d+)\s*(hours?|minutes?|seconds?)\b/g))seconds+=Number(match[1])*({h:3600,m:60,s:1}[match[2][0]]);
  return {hospitalization: data?.success===true&&hospitalized?'explicit-hospital-message':'unconfirmed',hospitalSeconds:hospitalized&&seconds>0?Math.min(seconds,604800):null,flags,consumption:data?.success===true&&data?.itemRemoved===true?'server-reported-removal-needs-inventory-check':'unconfirmed',hospitalRelease:still?'still-hospitalized':released&&data?.success===true?'explicit-release-message-needs-status-check':'unconfirmed',directTravelUseEnabled:false};
 }
 function responseInfo(entry,status,text){if(!active||!entry)return;entry=canonical(entry);const response={state:'received',httpStatus:status,elapsedMs:Math.max(0,now()-entry.started),format:'text',keys:[],success:null,signals:[]};try{const data=JSON.parse(String(text).slice(0,512000));response.format='json';response.keys=Object.keys(data||{}).slice(0,40).map(name);response.success=typeof data?.success==='boolean'?data.success:null;response.errorCode=Number.isFinite(data?.error?.code)?data.error.code:null;const step=entry.query.find(f=>f.name==='step')?.value;if(step==='inventory')response.inventory=inventoryInfo(data);if(step==='useItem')response.itemUse=useInfo(data);const message=typeof data?.text==='string'?data.text:typeof data?.message==='string'?data.message:'';for(const signal of ['hospital','cooldown','life','used','confirm','error','wrong item','bought','travel'])if(message.toLowerCase().includes(signal))response.signals.push(signal);}catch{response.format=/<[a-z][\s\S]*>/i.test(String(text))?'html':'text';}entry.response=response;delete entry.started;schedule();}
 function observeResources(){try{const C=pageWindow.PerformanceObserver||window.PerformanceObserver;if(!C)return;const since=(pageWindow.performance||window.performance).now();resourceObserver=new C(list=>{if(!active)return;for(const entry of list.getEntries()){if(entry.startTime<since||!['fetch','xmlhttprequest'].includes(entry.initiatorType))continue;const target=route(entry.name);if(!target||/chat|message|mail|login|auth|password|captcha|security|forum/i.test(target.path+'?'+target.query.map(f=>f.name+'='+f.value).join('&')))continue;if(!document.querySelector('#travel-root')&&!/travel|item\.php/i.test(target.path))continue;resources.push({at:new Date(now()).toISOString(),build,...target,initiatorType:entry.initiatorType,durationMs:Number.isFinite(entry.duration)?entry.duration:null});if(resources.length>120)resources.shift();counters.resourceEntries++;schedule();}});resourceObserver.observe({type:'resource',buffered:true});}catch{resourceObserver=null;}}
 function navigation(){if(active){const info=route(window.location.href);if(info)action('navigation',info);flush();}}
 function pagehide(){if(active){navigation();flush();}}
 function stop(){if(active)action('recording-stop');active=false;resumeActive=false;window.clearTimeout(flushTimer);flushTimer=null;document.removeEventListener('click',markNativeClick,true);document.removeEventListener('pointerdown',markNativeClick,true);resourceObserver?.disconnect();resourceObserver=null;document.removeEventListener('change',quantityChanged,true);window.removeEventListener('pagehide',pagehide);for(const type of ['pageshow','popstate','hashchange'])window.removeEventListener(type,navigation);try{if(wrappedFetch&&pageWindow.fetch===wrappedFetch)pageWindow.fetch=oldFetch;}catch{}try{if(wrappedOpen&&pageWindow.XMLHttpRequest?.prototype.open===wrappedOpen)pageWindow.XMLHttpRequest.prototype.open=oldOpen;}catch{}try{if(wrappedSend&&pageWindow.XMLHttpRequest?.prototype.send===wrappedSend)pageWindow.XMLHttpRequest.prototype.send=oldSend;}catch{}for(const [xhr,handlers] of listeners)for(const handler of handlers)xhr.removeEventListener('loadend',handler);listeners.clear();hooks.fetch=hooks.xhr=false;installed=false;lastAction=lastUserAction=recentPointer=null;banner?.remove();banner=null;flush();}
 function install(){if(installed&&pageWindow.fetch===wrappedFetch&&(!pageWindow.XMLHttpRequest||pageWindow.XMLHttpRequest.prototype.open===wrappedOpen&&pageWindow.XMLHttpRequest.prototype.send===wrappedSend))return;
  if(pageWindow.fetch!==wrappedFetch)try{oldFetch=pageWindow.fetch;if(typeof oldFetch==='function'){const priorFetch=oldFetch;wrappedFetch=function(input,init){if(!active)return priorFetch.apply(this,arguments);counters.fetchCalls++;const entry=begin(input,init?.method||input?.method||'GET',init?.body);if(entry&&init?.body===undefined&&typeof input?.clone==='function')try{entry.bodyState='pending';const copy=input.clone();copy.text().then(value=>setBody(entry,value)).catch(()=>{if(active&&canonical(entry).bodyState==='pending')canonical(entry).bodyState='unparsed';});}catch{entry.bodyState='unparsed';}const result=priorFetch.apply(this,arguments);if(!entry)return result;return result.then(resp=>{if(entry&&active&&responseOwner(entry,resp)===entry)try{resp.clone().text().then(text=>responseInfo(entry,resp.status,text)).catch(()=>{});}catch{}return resp;},error=>{if(entry&&active){entry.response={state:'network-error'};delete entry.started;schedule();}throw error;});};pageWindow.fetch=wrappedFetch;hooks.fetch=pageWindow.fetch===wrappedFetch;}}catch{hooks.fetch=false;}
  try{const proto=pageWindow.XMLHttpRequest?.prototype;if(proto&&(proto.open!==wrappedOpen||proto.send!==wrappedSend)){oldOpen=proto.open;oldSend=proto.send;const priorOpen=oldOpen,priorSend=oldSend;wrappedOpen=function(method,url){if(active)xhrMeta.set(this,{method,url,transaction:{}});return priorOpen.apply(this,arguments);};wrappedSend=function(body){if(active)counters.xhrSends++;const meta=xhrMeta.get(this),entry=meta?begin(meta.url,meta.method,body):null;if(entry){const handlers=listeners.get(this)||new Set();const handler=()=>{handlers.delete(handler);if(!handlers.size)listeners.delete(this);if(!active)return;let text='';try{text=this.responseType==='json'?JSON.stringify(this.response):this.responseText;}catch{}if(responseOwner(entry,meta.transaction)===entry)responseInfo(entry,this.status,text);};handlers.add(handler);listeners.set(this,handlers);this.addEventListener('loadend',handler,{once:true});}return priorSend.apply(this,arguments);};proto.open=wrappedOpen;proto.send=wrappedSend;hooks.xhr=proto.open===wrappedOpen&&proto.send===wrappedSend;}}catch{hooks.xhr=false;}
  installed=hooks.fetch||hooks.xhr;
 }
 function start(event){if(event&&event.isTrusted!==true)return false;if(active){install();return true;}active=true;resumeActive=true;lastAction=lastUserAction=null;
  install();observeResources();
  document.addEventListener('click',markNativeClick,true);document.addEventListener('pointerdown',markNativeClick,true);document.addEventListener('change',quantityChanged,true);window.addEventListener('pagehide',pagehide);for(const type of ['pageshow','popstate','hashchange'])window.addEventListener(type,navigation);action('recording-start',{path:window.location.pathname});flush();return true;
 }
 return {activity:()=>({active,records:records.map(record=>({id:record.id,at:record.at,method:record.method,path:record.path,step:record.query?.find(field=>field.name==='step')?.value||null,response:record.response?{state:record.response.state,httpStatus:record.response.httpStatus,elapsedMs:record.response.elapsedMs}:null}))}),clear(){const running=active;stop();records=[];actions=[];resources.length=0;droppedRequests=droppedActions=sequence=0;for(const key of Object.keys(counters))counters[key]=0;flush();if(running)start();},inventoryInfo,useInfo,install,start,stop,resume(){if(resumeActive)start();},markNativeClick,canStart:()=>true,report:()=>({schemaVersion:1,active,build,instrumentedAt,documentState:document.readyState,documentMatchesPage:pageWindow.document===document,persistenceState,counters:{...counters},resourceEndpoints:resources.map(r=>({...r,query:r.query.map(f=>({...f}))})),hooks:{...hooks},records:records.map(({started,...record})=>JSON.parse(JSON.stringify(record))),actions:actions.map(a=>({...a,query:a.query?.map(f=>({...f}))})),droppedRequests,droppedActions,limits:{requests:300,actions:300},scope:'Same-origin travel/item fetch and XHR, native travel controls and sanitized navigation; continuous until diagnostics stop',excluded:['cookies','headers','RFC/CSRF/token values','raw response bodies','chat traffic','API keys'],limitation:'An observed request identifies a candidate contract, not an approved replay template. Top-level document requests, WebSockets, service-worker traffic and unrecognized routes may not be captured.'})};
};
const createDirectQuickItems=function createDirectQuickItems({window,document,fetchImpl,isAuthorized=()=>false,onEvent=()=>{},now=()=>Date.now(),timeoutMs=12000,build='unknown',capturePage=window,getProfile=async()=>null}){
 const capture=capturePage.__TU_DIRECT_ITEMS_CAPTURE__||createTravelRequestCapture({window,document,pageWindow:capturePage,build});
 const KEY='tu:direct-items:attempt:v1',LOG='tu:direct-items:log:v1';
 let panel=null,controller=null,busy=false,records=[],travelInspection=null,inspecting=false,travelOutcome=null;
 try{const saved=JSON.parse(window.sessionStorage.getItem(LOG)||'[]');if(Array.isArray(saved))records=saved.slice(-100).map(clean);}catch{}
 function clean(value){return {build:/^\d+(?:\.\d+){3}-[a-z0-9.-]+$/.test(String(value?.build||build))?String(value?.build||build):'unknown',at:/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(String(value?.at||''))?String(value.at):'',event:['requested','response','uncertain','blocked','reviewed'].includes(value?.event)?value.event:'blocked',itemId:/^\d+$/.test(String(value?.itemId))?String(value.itemId):'',elapsedMs:Number.isFinite(value?.elapsedMs)?value.elapsedMs:null,result:['success-response','error-response','further-choice','response-received','network-or-timeout','previous-attempt','invalid-context','missing-token','invalid-item','reviewed'].includes(value?.result)?value.result:'response-received'};}
 function record(event,itemId,result,started){const entry=clean({at:new Date(now()).toISOString(),event,itemId,result,elapsedMs:started===undefined?null:Math.max(0,now()-started)});records.push(entry);records=records.slice(-100);try{window.sessionStorage.setItem(LOG,JSON.stringify(records));}catch{}try{onEvent(entry);}catch{}return entry;}
 function pending(){try{return !!window.sessionStorage.getItem(KEY);}catch{return true;}}
 function contextOK(){const loc=window.location;return isAuthorized()&&loc.protocol==='https:'&&['www.torn.com','torn.com'].includes(loc.hostname)&&(loc.pathname==='/item.php'||loc.pathname==='/page.php'&&new URLSearchParams(loc.search).get('sid')==='items')&&!document.querySelector('#travel-root,[aria-label="Flight progress"]');}
 function inventory(){if(!contextOK())return [];const found=new Map();for(const row of document.querySelectorAll('li[data-item][data-category="Medical"]')){if(row.closest('#tuim-quickitems-test'))continue;const id=row.getAttribute('data-item'),qty=Number(row.getAttribute('data-qty')),name=(row.getAttribute('data-sort')||row.querySelector('.name')?.textContent||'').trim();if(/^\d+$/.test(id||'')&&Number(id)>0&&Number.isSafeInteger(qty)&&qty>0&&name)found.set(id,{id,name:name.slice(0,120),quantity:qty});}return [...found.values()];}
 function token(){for(const part of document.cookie.split(';')){const [name,...values]=part.trim().split('=');if(name==='rfc_v'){const value=values.join('=');return /^[A-Za-z0-9_-]{1,256}$/.test(value)?value:null;}}return null;}
 function plain(raw){const doc=new window.DOMParser().parseFromString(String(raw).slice(0,32000),'text/html');for(const node of doc.querySelectorAll('script,style,iframe'))node.remove();return (doc.body.textContent||'').replace(/https?:\/\/\S+/g,'[URL omitted]').replace(/\b[A-Za-z0-9_-]{24,}\b/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,2000);}
 async function use(event,id,consented=false){
  if(!event?.isTrusted||busy)return {result:'blocked'};
  if(pending()){record('blocked',id,'previous-attempt');return {result:'previous-attempt'};}
  if(!consented||!contextOK()||document.hidden||!document.hasFocus()){record('blocked',id,'invalid-context');return {result:'invalid-context'};}
  const item=inventory().find(item=>item.id===String(id));if(!item){record('blocked',id,'invalid-item');return {result:'invalid-item'};}
  const rfc=token();if(!rfc){record('blocked',id,'missing-token');return {result:'missing-token'};}
  // Reserve synchronously before the first await; one submission per gesture.
  try{window.sessionStorage.setItem(KEY,JSON.stringify({itemId:item.id,at:new Date(now()).toISOString()}));}catch{return {result:'storage-unavailable'};}
  busy=true;controller=new window.AbortController();const active=controller,started=now();record('requested',item.id,'response-received',started);renderState();
  const abort=()=>active.abort();window.addEventListener('pagehide',abort,{once:true});const timer=window.setTimeout(abort,timeoutMs);
  try{
   const url=new URL('/item.php',window.location.origin);url.searchParams.set('rfcv',rfc);const body=new URLSearchParams({step:'useItem',itemID:item.id,item:item.id});
   const response=await fetchImpl(url.href,{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},body:body.toString(),signal:active.signal});
   if(!response.ok||response.redirected)throw Error('Unconfirmed response');const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{throw Error('Unconfirmed response');}if(!data||typeof data!=='object'||Array.isArray(data)||raw.length>512000)throw Error('Unconfirmed response');
   const text=plain(typeof data.text==='string'?data.text:typeof data.message==='string'?data.message:'');if(!text)throw Error('Unconfirmed response');
   const result=data.success===false||data.error?'error-response':Array.isArray(data.links)&&data.links.length?'further-choice':data.success===true?'success-response':'response-received';
   window.sessionStorage.removeItem(KEY);record('response',item.id,result,started);return {result,text,elapsedMs:now()-started};
  }catch{record('uncertain',item.id,'network-or-timeout',started);return {result:'uncertain',text:'The outcome is unconfirmed. Check Torn inventory before clearing this attempt. Nothing will retry automatically.'};}
  finally{window.clearTimeout(timer);window.removeEventListener('pagehide',abort);if(controller===active)controller=null;busy=false;renderState();}
 }
 function travelContext(){return isAuthorized()&&!document.hidden&&document.hasFocus()&&window.location.protocol==='https:'&&['torn.com','www.torn.com'].includes(window.location.hostname)&&!!document.querySelector('#travel-root');}
 async function travelRequest(step,signal,slotId){
  const rfc=token();if(!rfc)throw Error('missing-token');
  const url=new URL('/page.php',window.location.origin);url.search=new URLSearchParams({sid:'travelData',step,rfcv:rfc}).toString();
  const options={method:slotId===undefined?'GET':'POST',credentials:'same-origin',redirect:'error',cache:'no-store',signal};
  if(slotId!==undefined){options.headers={'Content-Type':'application/json','Accept':'application/json'};options.body=JSON.stringify({slotID:Number(slotId)});}
  const response=await fetchImpl(url.href,options);if(!response.ok||response.redirected)throw Error('unconfirmed-response');
  const raw=await response.text();if(raw.length>512000)throw Error('oversized-response');const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid-response');return data;
 }
 function validTravelInventory(data){
  // An empty mapping alone is never proof of an empty inventory.
  if(!Array.isArray(data?.slots)||!Number.isSafeInteger(data.maxBaseSlots)||!Number.isSafeInteger(data.maxSpecialSlots)||data.maxBaseSlots<0||data.maxSpecialSlots<0||data.slots.length!==data.maxBaseSlots+data.maxSpecialSlots||data.slots.length>100)return false;
  const positiveId=value=>/^[1-9][0-9]{0,14}$/.test(String(value))&&Number.isSafeInteger(Number(value));
  const ids=new Set();for(const slot of data.slots){const id=String(slot?.ID);if(!slot||!positiveId(slot.ID)||ids.has(id)||!(slot.item==null||slot.item&&positiveId(slot.item.ID)))return false;ids.add(id);}return true;
 }
 // One captured foreign-shop transaction per trusted gesture. Remainders are scheduled by the facade.
 async function buyRunItem(event,quote,guard,expectedFingerprint){
  if(!event?.isTrusted||busy||inspecting||pending()||!travelContext()||!token())return {result:'blocked'};
  busy=true;const active=new window.AbortController();controller=active;const abort=()=>active.abort(),timer=window.setTimeout(abort,timeoutMs);window.addEventListener('pagehide',abort,{once:true});let posted=false;
  try{
   capture.start();const before=await travelRequest('inventory',active.signal);
   if(!validTravelInventory(before)||!guard())return {result:'inventory-unconfirmed'};
   if(expectedFingerprint&&inventoryFingerprint(before)!==expectedFingerprint)return {result:'inventory-changed',text:'Inventory changed between purchases. Review and re-arm.'};
   const capacity=inventoryCapacity(before),plan=quote(capacity);
   if(!plan||!/^\d{1,15}$/.test(String(plan.id))||!Number.isSafeInteger(plan.amount)||plan.amount<1||plan.amount>capacity.total-capacity.occupied||!Number.isSafeInteger(plan.price)||plan.price<=0||!Number.isSafeInteger(plan.cash)||plan.cash<plan.amount*plan.price||typeof plan.name!=='string'||!plan.name.trim())return {result:'invalid-quote'};
   const final=quote(capacity);
   if(!guard()||!travelContext()||active.signal.aborted||JSON.stringify(final)!==JSON.stringify(plan))return {result:'quote-changed'};
   // The captured endpoint mutates via GET. Disable caching and redirects; never retry this request.
   const rfc=token();if(!rfc)return {result:'blocked'};
   const url=new URL('/page.php',window.location.origin);url.search=new URLSearchParams({sid:'travelData',step:'buy',itemID:String(plan.id),amount:String(plan.amount),rfcv:rfc}).toString();
   window.sessionStorage.setItem(KEY,JSON.stringify({scope:'travel',operation:'buy',itemId:String(plan.id),amount:plan.amount,at:new Date(now()).toISOString()}));posted=true;record('requested',plan.id,'response-received');
   const response=await fetchImpl(url.href,{method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',signal:active.signal});
   if(!response.ok||response.redirected)throw Error('unconfirmed-purchase');const raw=await response.text();if(raw.length>512000)throw Error('oversized-response');const data=JSON.parse(raw);
   const actual=['number','string'].includes(typeof data?.amount)&&/^[1-9][0-9]*$/.test(String(data.amount))?Number(data.amount):NaN,total=typeof data?.total==='number'?data.total:typeof data?.total==='string'&&/^\$?[\d,]+$/.test(data.total)?Number(String(data.total).replace(/[$,]/g,'')):NaN;
   if(data?.success!==true||!Number.isSafeInteger(actual)||actual<1||actual>plan.amount||!Number.isSafeInteger(total)||total!==actual*plan.price)throw Error('purchase-response-unconfirmed');
   const after=await travelRequest('inventory',active.signal);
   if(!validTravelInventory(after)||after.maxBaseSlots!==before.maxBaseSlots||after.maxSpecialSlots!==before.maxSpecialSlots)throw Error('inventory-unconfirmed');
   let added=0;
   for(const prior of before.slots){const current=after.slots.find(s=>String(s.ID)===String(prior.ID));if(!current)throw Error('slot-changed');if(prior.item!=null){if(JSON.stringify(slotIdentity(prior))!==JSON.stringify(slotIdentity(current)))throw Error('unrelated-change');}else if(current.item!=null){if(String(current.item.ID)!==String(plan.id)||current.item.name!==plan.name)throw Error('wrong-item');added++;}}
   if(added!==actual)throw Error('purchase-count-unconfirmed');
   travelInspection={at:new Date(now()).toISOString(),build,...capture.inventoryInfo(after)};
   travelOutcome={at:new Date(now()).toISOString(),build,operation:'buy',itemId:String(plan.id),amount:actual,requested:plan.amount,verification:'response-and-fresh-inventory'};
   // Keep the lock if the run was canceled after submission, even if the inventory read succeeded.
   if(!guard()||active.signal.aborted)throw Error('run-changed');
   window.sessionStorage.removeItem(KEY);record('response',plan.id,'success-response');
   return {result:'purchase-confirmed',amount:actual,spent:total,requested:plan.amount,price:plan.price,cash:plan.cash,slots:before.slots.map((slot,index)=>{const current=after.slots.find(s=>String(s.ID)===String(slot.ID));return {number:index+1,id:String(slot.ID),added:slot.item==null&&current.item!=null,empty:current.item==null};}),inventoryCapacity:inventoryCapacity(after),inventoryFingerprint:inventoryFingerprint(after)};
  }catch{return {result:posted?'uncertain':'inventory-unconfirmed',text:posted?'Purchase outcome is unconfirmed. Review Torn inventory before re-arming; no retry will occur.':'Purchase checks failed. No purchase request was sent.'};}
  finally{window.clearTimeout(timer);window.removeEventListener('pagehide',abort);if(controller===active)controller=null;busy=false;renderState();}
 }
 const slotIdentity=slot=>[String(slot.ID),slot.item==null?null:[String(slot.item.ID),slot.item.name||'',String(slot.item.UID??slot.item.uid??'')]];
 const inventoryFingerprint=data=>JSON.stringify(data.slots.map(slotIdentity).sort((a,b)=>a[0].localeCompare(b[0])));
 const selectedSlot=(slot,items)=>!!slot.item&&(items||[]).some(item=>typeof item?.name==='string'&&!!item.name.trim()&&slot.item.name===item.name&&(!item.id||String(item.id)===String(slot.item.ID))&&(!item.uid||String(slot.item.UID??slot.item.uid??'')===String(item.uid)));
 const inventoryCapacity=data=>({total:data.slots.length,occupied:data.slots.filter(slot=>slot.item!=null).length});
 function snapshotEpoch(){try{return window.sessionStorage.getItem(KEY+':inventory-epoch')||'0';}catch{return null;}}
 function invalidateRunInventory(){try{window.sessionStorage.setItem(KEY+':inventory-epoch',window.crypto.randomUUID());}catch{}}
 function runInventoryKey(run){return JSON.stringify([run?.ownerId,run?.intentId,run?.watchKey,run?.country]);}
 function rememberRunInventory(run,data,source){
  if(!run||!validTravelInventory(data))return;
  run.directItemInventory={epoch:snapshotEpoch(),build,key:runInventoryKey(run),at:new Date(now()).toISOString(),source,data:{maxBaseSlots:data.maxBaseSlots,maxSpecialSlots:data.maxSpecialSlots,slots:data.slots.map(slot=>({ID:slot.ID,item:slot.item?{ID:slot.item.ID,name:slot.item.name,...(slot.item.UID!=null?{UID:slot.item.UID}:{})}:null}))}};
 }
 function armedRunInventory(run){
  const saved=run?.directItemInventory;
  if(!saved||saved.epoch===null||saved.epoch!==snapshotEpoch()||saved.build!==build||saved.key!==runInventoryKey(run)||!validTravelInventory(saved.data))return null;
  const mutations=new Set(['buy','useItem','trashItem','addSlotItem','removeSlotItem','fillSlotItems','clear','setLoadout']);
  if(capture.activity().records.some(record=>mutations.has(record.step)&&(record.at>=saved.at||record.response?.state!=='received'))){delete run.directItemInventory;return null;}
  // Reuse passive native reads to detect changed slots, without issuing a heal-time GET.
  const recorded=capture.report();if(recorded.actions.some(action=>action.kind==='recording-stop'&&action.at>=saved.at)){delete run.directItemInventory;return null;}
  const latest=recorded.records.filter(record=>record.at>=saved.at&&record.response?.inventory).at(-1)?.response.inventory;
  if(latest){
   const rows=[];for(const row of latest.slots||[]){const match=row.path?.match(/^slots\[(\d+)\](\.item)?$/);if(!match)continue;const index=Number(match[1]);rows[index]||={};if(match[2])rows[index].item=row.fields;else Object.assign(rows[index],row.fields);}
   const data={...latest.capacities,slots:rows};
   const identity=value=>JSON.stringify(value.slots.map(slot=>[String(slot.ID),slot.item?[String(slot.item.ID),slot.item.name]:null]).sort((a,b)=>a[0].localeCompare(b[0])));
   if(!validTravelInventory(data)||identity(data)!==identity(saved.data)){delete run.directItemInventory;return null;}
  }
  return saved.data;
 }
 async function prepareRunInventory(run){
  if(busy||inspecting||pending()||!travelContext())return {result:'blocked'};
  inspecting=true;const abort=new window.AbortController(),cancel=()=>abort.abort(),timer=window.setTimeout(cancel,timeoutMs);controller=abort;window.addEventListener('pagehide',cancel,{once:true});
  try{capture.start();const data=await travelRequest('inventory',abort.signal);if(!travelContext()||!validTravelInventory(data))return {result:'inventory-unconfirmed'};rememberRunInventory(run,data,'arming');travelInspection={at:new Date(now()).toISOString(),build,...capture.inventoryInfo(data)};return {result:'inventory-prepared',inventoryCapacity:inventoryCapacity(data)};}
  catch{return {result:'inventory-unconfirmed'};}finally{window.clearTimeout(timer);window.removeEventListener('pagehide',cancel);if(controller===abort)controller=null;inspecting=false;}
 }
 async function useTravel(event,selection,consented=false,workflow=null){
  if(!event?.isTrusted||busy||inspecting||pending()||!consented||!travelContext())return {result:'blocked'};
  const trashing=workflow?.operation==='trash';
  let expected=workflow?null:travelInspection?.mappings.find(row=>row.slotId===String(selection));
  // Every use is explicitly selected and matched against fresh complete inventory.
  if(!workflow&&(!expected||!/^\d{1,15}$/.test(expected.slotId))||!token())return {result:'invalid-item'};
  busy=true;travelOutcome=null;controller=new window.AbortController();const active=controller,started=now();let posted=false;
  const abort=()=>active.abort(),timer=window.setTimeout(abort,timeoutMs);window.addEventListener('pagehide',abort,{once:true});renderState();
  try{
   capture.start();const before=workflow?.useArmedInventory?armedRunInventory(workflow.run):await travelRequest('inventory',active.signal);
   if(workflow?.useArmedInventory&&!before)return {result:'armed-inventory-unavailable',text:'The armed inventory snapshot is missing or changed. Re-arm Snatch and Run before healing.'};
   if(!validTravelInventory(before))return {result:'inventory-unconfirmed'};
   if(workflow){
    if(!workflow.guard())return {result:'blocked'};
    if(trashing&&workflow.expectedFingerprint&&inventoryFingerprint(before)!==workflow.expectedFingerprint)return {result:'inventory-changed',text:'Travel inventory changed between destruction steps. Re-arm and review the selected items.'};
    expected=null;
    for(const selected of workflow.items||[]){const slot=before.slots.find(slot=>selectedSlot(slot,[selected]));if(slot){expected={slotId:String(slot.ID),itemId:String(slot.item.ID),name:slot.item.name};break;}}
    if(!expected){
     const conflict=before.slots.some(slot=>slot.item&&(workflow.items||[]).some(item=>item?.name===slot.item.name));
     if(trashing&&!conflict)return {result:'nothing-selected-carried',remaining:0,inventoryCapacity:inventoryCapacity(before),inventoryFingerprint:inventoryFingerprint(before)};
     return {result:'invalid-item',text:'No selected item is currently carried with a verified matching identity. No item request was sent.'};
    }
   }
   const current=before.slots.find(slot=>String(slot.ID)===expected.slotId);
   if(!current?.item||String(current.item.ID)!==expected.itemId||current.item.name!==expected.name||!travelContext()||active.signal.aborted||workflow&&!workflow.guard())return {result:'slot-changed',text:'Inventory changed. Inspect again before selecting an item.'};
   if(trashing&&current.item.isTrashable===false)return {result:'not-trashable',text:'Torn marks the selected item as not trashable. No request was sent.'};
   // Reserve before the sole state-changing request; reloads and uncertain outcomes stay locked.
   window.sessionStorage.setItem(KEY,JSON.stringify({scope:'travel',operation:trashing?'trash':'use',itemId:expected.itemId,slotId:expected.slotId,at:new Date(now()).toISOString()}));
   if(workflow?.run)delete workflow.run.directItemInventory;
   posted=true;record('requested',expected.itemId,'response-received',started);
   const data=await travelRequest(trashing?'trashItem':'useItem',active.signal,expected.slotId),evidence=capture.useInfo(data);
   travelOutcome={at:new Date(now()).toISOString(),build,operation:trashing?'trash':'use',slotId:expected.slotId,itemId:expected.itemId,evidence,consumption:'unconfirmed',hospitalRelease:evidence.hospitalRelease};
   if(data.success!==true||(!trashing&&data.itemRemoved!==true)||trashing&&data.itemRemoved===false)throw Error('unconfirmed-use');
   const after=await travelRequest('inventory',active.signal);
   if(!validTravelInventory(after)||!after.slots.some(slot=>String(slot.ID)===expected.slotId&&slot.item==null))throw Error('removal-unconfirmed');
   if(trashing){
    const expectedAfter={slots:before.slots.map(slot=>String(slot.ID)===expected.slotId?{ID:slot.ID,item:null}:slot)};
    if(after.maxBaseSlots!==before.maxBaseSlots||after.maxSpecialSlots!==before.maxSpecialSlots||inventoryFingerprint(after)!==inventoryFingerprint(expectedAfter))throw Error('unrelated-inventory-change');
   }
   travelOutcome.consumption='confirmed-by-response-and-fresh-inventory';
   if(workflow?.run)rememberRunInventory(workflow.run,after,workflow.useArmedInventory?'healing':'hospitalization');
   // Release is separate evidence; never advances purchase/travel or assumes a partial heal released the player.
   travelInspection={at:new Date(now()).toISOString(),build,...capture.inventoryInfo(after)};
   window.sessionStorage.removeItem(KEY);record('response',expected.itemId,'success-response',started);
   return {result:trashing?'destruction-confirmed':'consumption-confirmed',inventoryCapacity:inventoryCapacity(after),...(trashing?{remaining:after.slots.filter(slot=>selectedSlot(slot,workflow.items)).length,inventoryFingerprint:inventoryFingerprint(after)}:{}),text:plain(data.message||data.text||'Item consumed.')+' Hospital release: '+travelOutcome.hospitalRelease+'.',...travelOutcome};
  }catch{if(posted)record('uncertain',expected.itemId,'network-or-timeout',started);return {result:posted?'uncertain':'inventory-unconfirmed',text:posted?'Check Torn before clearing this attempt. No retry will occur.':'Inventory could not be verified. No item-use request was sent.'};}
  finally{window.clearTimeout(timer);window.removeEventListener('pagehide',abort);if(controller===active)controller=null;busy=false;renderState();refreshTravelChoices();}
 }
 function refreshTravelChoices(){if(!panel)return;const select=panel.querySelector('[data-travel-select]');select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select a verified travel item';select.append(placeholder);for(const item of travelInspection?.mappings||[]){const option=document.createElement('option');option.value=item.slotId;option.textContent=item.name+' (slot '+item.slotId+')';select.append(option);}renderState();}
 async function inspectTravel(event){
  if(!event?.isTrusted||busy||inspecting||!isAuthorized()||document.hidden||!document.hasFocus()||!document.querySelector('#travel-root')||window.location.protocol!=='https:'||!['torn.com','www.torn.com'].includes(window.location.hostname))return {result:'invalid-context'};
  const rfc=token();if(!rfc)return {result:'missing-token'};
  inspecting=true;const abort=new window.AbortController(),timer=window.setTimeout(()=>abort.abort(),timeoutMs);
  try{capture.start();const url=new URL('/page.php',window.location.origin);url.search=new URLSearchParams({sid:'travelData',step:'inventory',rfcv:rfc}).toString();
   const response=await fetchImpl(url.href,{method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',signal:abort.signal});
   if(!response.ok||response.redirected)throw Error();const raw=await response.text();if(raw.length>512000)throw Error();const data=JSON.parse(raw);if(!data||typeof data!=='object'||!Object.hasOwn(data,'slots'))throw Error();
   travelInspection={at:new Date(now()).toISOString(),build,...capture.inventoryInfo(data)};return travelInspection;
  }catch{return {result:'inspection-unconfirmed'};}finally{window.clearTimeout(timer);inspecting=false;}
 }
 // Temporary, explicit diagnostics. Never call an inspected page function.
 let refreshProbes=[],addOutcome=null;
 function diagnosticContext(){return isAuthorized()&&!document.hidden&&document.hasFocus()&&window.location.protocol==='https:'&&['torn.com','www.torn.com'].includes(window.location.hostname);}
 // Refresh Torn's subscribed inventory cache without waiting or navigating.
 function refreshNativeInventory(){
  if(!travelContext()||capturePage.document!==document)return false;
  try{capturePage.dispatchEvent(new capturePage.Event('focus'));return true;}catch{return false;}
 }
 // One explicit diagnostic event; no direct request, navigation or cell edits.
 let focusTests=[],cancelFocusTest=null;
 function nativeCellSnapshot(){
  const panels=[...document.querySelectorAll('#travel-root [class*="inventoryPanel"]')].filter(node=>!node.closest('#tuim-panel'));
  const cells=panels.length===1?[...panels[0].querySelectorAll('li[class*="inventorySlot"]')].slice(0,100):[];
  return {panelCount:panels.length,cells:cells.map((cell,index)=>{
   const labels=[cell.getAttribute('aria-label'),...cell.querySelectorAll('[aria-label],[class*="srOnly"]')].map(node=>typeof node==='string'?node:node?.getAttribute('aria-label')||node?.textContent||'').join(' ');
   const match=labels.match(/\bslot\s+(\d{1,3})\b/i),itemIDs=[];
   for(const image of cell.querySelectorAll('img')){try{const url=new URL(image.getAttribute('src')||'',window.location.origin);const id=url.pathname.match(/^\/images\/items\/(\d{1,6})(?:\/|\.)/);if(url.origin===window.location.origin&&id)itemIDs.push(Number(id[1]));}catch{}}
   return {index,slot:match?Number(match[1]):null,empty:/\bempty\b/i.test(labels),imageCount:cell.querySelectorAll('img').length,itemIDs:[...new Set(itemIDs)]};
  })};
 }
 async function testNativeRefresh(event,guard=()=>false){
  if(!event?.isTrusted||busy||inspecting||pending()||!diagnosticContext()||!document.querySelector('#travel-root')||guard()!==true||capture.activity().active!==true||capturePage.document!==document)return {result:'blocked'};
  inspecting=true;
  const entry={build,at:new Date(now()).toISOString(),result:'observing',event:'window-focus',observationMs:5000,before:nativeCellSnapshot(),after:null,cellsChanged:false,firstCellChangeMs:null,inventoryRequests:[],otherReadRequests:0,limitation:'Temporal correlation only. A completed inventory read does not alone prove native cell synchronization.'};
  focusTests.push(entry);focusTests=focusTests.slice(-4);
  const seen=new Set(capture.activity().records.map(record=>record.id)),started=now();
  return new Promise(resolve=>{
   let timer=null,poll=null,finished=false;
   const sample=()=>{entry.after=nativeCellSnapshot();if(JSON.stringify(entry.before)!==JSON.stringify(entry.after)){entry.cellsChanged=true;entry.firstCellChangeMs??=Math.max(0,now()-started);}
    const reads=capture.activity().records.filter(record=>!seen.has(record.id)&&record.method==='GET'&&record.path==='/page.php');
    entry.inventoryRequests=reads.filter(record=>record.step==='inventory').slice(0,12).map(record=>({at:record.at,state:record.response?.state||'pending',httpStatus:record.response?.httpStatus??null,elapsedMs:record.response?.elapsedMs??null}));entry.otherReadRequests=reads.length-entry.inventoryRequests.length;
   };
   const finish=reason=>{if(finished)return;finished=true;window.clearTimeout(timer);window.clearInterval(poll);window.removeEventListener('pagehide',cancel);sample();entry.elapsedMs=Math.max(0,now()-started);const read=entry.inventoryRequests.some(record=>record.state==='received'&&record.httpStatus===200);entry.result=reason|| (read?(entry.cellsChanged?'inventory-read-and-cells-changed':'inventory-read-cells-unchanged'):(entry.cellsChanged?'cells-changed-no-inventory-read':'no-inventory-read-observed'));cancelFocusTest=null;inspecting=false;resolve(JSON.parse(JSON.stringify(entry)));};
   const cancel=()=>finish('cancelled');cancelFocusTest=cancel;window.addEventListener('pagehide',cancel,{once:true});
   poll=window.setInterval(()=>{if(!diagnosticContext()||guard()!==true)cancel();else sample();},200);timer=window.setTimeout(()=>finish(),5000);
   try{capturePage.dispatchEvent(new capturePage.Event('focus'));}catch{finish('dispatch-unavailable');}
  });
 }

 function inspectNativeRefresh(event){
  if(!event?.isTrusted||!diagnosticContext())return {result:'blocked'};
  const entry={build,at:new Date(now()).toISOString(),result:'not-found',name:'loadEquippedItems',source:'',stringLiteralsOmitted:true,assets:[]};
  try{
   const descriptor=Object.getOwnPropertyDescriptor(capturePage,'loadEquippedItems');
   if(descriptor&&!Object.hasOwn(descriptor,'value'))entry.result='accessor-not-read';
   else if(typeof descriptor?.value==='function'){
    const source=Function.prototype.toString.call(descriptor.value);
    // Omit every literal and comment: closures can contain credentials or player data.
    entry.source=(source.length<=16000?source:'/* function exceeds capture limit */').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,match=>match.startsWith('/')?'/* omitted */':'"[literal omitted]"').replace(/\b\d+\b/g,'0').replace(/\b[A-Za-z0-9_$]{40,}\b/g,'REDACTED');
    entry.truncated=source.length>16000;entry.result=source.includes('[native code]')?'native-function':'function-found';
   }
   for(const script of document.scripts){if(entry.assets.length>=60)break;try{const url=new URL(script.src,window.location.origin);if(url.origin===window.location.origin&&/^\/(?:js|builds)\/[A-Za-z0-9_./-]+\.js$/.test(url.pathname))entry.assets.push(url.pathname);}catch{}}
   entry.assets=[...new Set(entry.assets)];
  }catch{entry.result='inspection-unavailable';entry.source='';}
  refreshProbes.push(entry);refreshProbes=refreshProbes.slice(-4);return {result:entry.result};
 }
 async function addDiagnosticBloodBag(event,guard=()=>false){
  if(!event?.isTrusted||busy||inspecting||pending())return {result:'blocked'};
  const grounded=()=>diagnosticContext()&&travelContext()&&guard()===true&&!document.querySelector('[aria-label="Flight progress"]')&&[...document.querySelectorAll('#travel-root h1,#travel-root h2,#travel-root h3,#travel-root h4')].some(node=>/^travel agency$/i.test(node.textContent.trim()));
  if(!grounded()||!token())return {result:'grounded-travel-agency-required'};
  busy=true;const active=new window.AbortController();controller=active;const abort=()=>active.abort(),timer=window.setTimeout(abort,timeoutMs);window.addEventListener('pagehide',abort,{once:true});let posted=false;
  const profile=async()=>{const data=await getProfile();const p=data?.profile||data;const id=p?.id||p?.player_id;return Number.isSafeInteger(Number(id))&&Number(id)>0&&['Okay','Hospital','Jail'].includes(p?.status?.state)?String(id):null;};
  try{
   const owner=await profile();if(!owner||!grounded()||active.signal.aborted)return {result:'non-travel-status-unconfirmed'};
   const before=await travelRequest('inventory',active.signal);if(!validTravelInventory(before))return {result:'inventory-unconfirmed'};
   if(!before.slots.some(slot=>slot.item==null))return {result:'inventory-full'};
   if(await profile()!==owner||!grounded()||active.signal.aborted)return {result:'status-changed'};
   window.sessionStorage.setItem(KEY,JSON.stringify({operation:'diagnostic-add',itemId:732,at:now()}));
   const rfc=token();if(!rfc)throw Error();const url=new URL('/page.php',window.location.origin);url.search=new URLSearchParams({sid:'travelData',step:'addSlotItem',rfcv:rfc}).toString();
   posted=true;record('requested',732,'response-received');
   const response=await fetchImpl(url.href,{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',signal:active.signal,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({itemID:732})});
   if(!response.ok||response.redirected)throw Error();const raw=await response.text();if(raw.length>512000)throw Error();const reply=JSON.parse(raw);
   const after=await travelRequest('inventory',active.signal);if(!validTravelInventory(after)||after.maxBaseSlots!==before.maxBaseSlots||after.maxSpecialSlots!==before.maxSpecialSlots||reply?.success!==true)throw Error();
   const old=new Map(before.slots.map(slot=>[String(slot.ID),slot]));let added=0;
   for(const slot of after.slots){const previous=old.get(String(slot.ID));if(!previous)throw Error();if(previous.item==null&&Number(slot.item?.ID)===732)added++;else if(JSON.stringify(slotIdentity(previous))!==JSON.stringify(slotIdentity(slot)))throw Error();}
   if(added!==1)throw Error();window.sessionStorage.removeItem(KEY);
   addOutcome={build,at:new Date(now()).toISOString(),result:'addition-confirmed',itemID:732,quantity:1};record('response',732,'success-response');return {...addOutcome};
  }catch{if(!posted){try{window.sessionStorage.removeItem(KEY);}catch{}}addOutcome={build,at:new Date(now()).toISOString(),result:posted?'uncertain':'not-submitted',itemID:732};return {...addOutcome};}
  finally{window.clearTimeout(timer);window.removeEventListener('pagehide',abort);if(controller===active)controller=null;busy=false;}
 }

 function renderState(){if(!panel)return;const travelButton=panel.querySelector('[data-travel-use]');if(travelButton)travelButton.disabled=busy||inspecting||pending()||!travelContext()||!panel.querySelector('[data-travel-consent]').checked||!panel.querySelector('[data-travel-select]').value;const useButton=panel.querySelector('[data-use]'),choice=panel.querySelector('select'),consent=panel.querySelector('[data-consent]');useButton.disabled=busy||pending()||!consent.checked||!choice.value||!contextOK();panel.querySelector('[data-review]').hidden=!pending()||busy;panel.querySelector('[data-state]').textContent=busy?'Request pending — additional clicks are blocked.':pending()?'Previous attempt is unconfirmed. Check Torn inventory before proceeding.':'Ready for a user-triggered personal item test.';}
 function review(event){if(!event?.isTrusted||busy)return false;try{window.sessionStorage.removeItem(KEY);}catch{return false;}record('reviewed','','reviewed');renderState();return true;}
 function refresh(){if(!panel)return;const select=panel.querySelector('select');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Select a visible personal medical item';select.append(empty);for(const item of inventory()){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' × '+item.quantity;select.append(option);}panel.querySelector('[data-context]').textContent=contextOK()?'Personal inventory only. Open the relevant Medical list in Torn, then refresh this list.':'Open Torn Items (personal inventory) to test. Flight and foreign inventories are not supported by this endpoint.';renderState();}
 function close(){controller?.abort();panel?.remove();panel=null;}
 function open(){if(panel?.isConnected)return;panel=document.createElement('section');panel.id='tuim-quickitems-test';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Direct Item Tools');panel.style.cssText='position:fixed;inset:5vh 4vw;z-index:2147483646;background:#11191d;color:#eee;border:2px solid #d6b65c;border-radius:12px;padding:18px;overflow:auto;font:15px/1.5 system-ui;box-sizing:border-box';
  panel.innerHTML='<h2>Direct Item Tools</h2><h3>Identify the travel item endpoint</h3><p>On a travel/foreign inventory page, start diagnostics and perform your normal inventory, purchase and travel steps in Torn. Recording continues across same-tab navigation until diagnostics are stopped. No requests are replayed. Restore Item Monitor and select Report Generation to export the sanitized request details.</p><button type="button" data-capture>Start travel request recording</button><h3>Read-only travel inventory inspection</h3><p>Inspect before and after using an item normally in Torn, then generate the Item Monitor report. Names alone never authorize direct use. Direct travel use is available below for the explicitly selected carried item, with a fresh identity check per click.</p><button type="button" data-inspect>Inspect current travel inventory (GET only)</button><pre data-inspection style="white-space:pre-wrap"></pre><h3>Personal item POST pilot</h3><p>Personal medical inventory only. One explicit click sends one item-use POST to Torn using your signed-in session. No simulated Use/Yes clicks, automatic retries or automatic follow-up actions.</p><p data-context></p><select aria-label="Personal medical item"></select><button type="button" data-refresh>Refresh item list</button><label style="display:flex;gap:8px;margin:14px 0"><input type="checkbox" data-consent>I understand this consumes a personal inventory item, not a travel inventory item.</label><button type="button" data-use>Use selected item (POST)</button><p data-state role="status"></p><p data-result style="white-space:pre-wrap"></p><button type="button" data-review hidden>I checked Torn inventory — clear unconfirmed attempt</button><p>Read the Torn response below before further actions. Any additional choices must be made in Torn. Export timing logs through Item Monitor → Report Generation. Snatch healing and hospitalization also use this direct item handler.</p><h3>Travel item handler</h3><p>Inspect inventory above first. Each click checks the current slot, uses one selected item, then verifies removal. Snatch and Run is not advanced automatically.</p><select data-travel-select aria-label="Travel item"></select><label style="display:flex;gap:8px;margin:14px 0"><input type="checkbox" data-travel-consent>I understand the selected travel item will be consumed.</label><button type="button" data-travel-use>Use selected travel item (POST)</button><p data-travel-result style="white-space:pre-wrap" role="status"></p><button type="button" data-close>Close test panel</button>';
  for(const button of panel.querySelectorAll('button'))button.style.cssText='padding:10px;margin:6px;background:#d6b65c;color:#111;border:0;border-radius:6px;font:bold 14px system-ui;cursor:pointer';panel.querySelector('select').style.cssText='display:block;width:100%;padding:10px;background:#283239;color:white';
  panel.querySelector('[data-inspect]').onclick=async event=>{const button=event.currentTarget;button.disabled=true;const result=await inspectTravel(event);if(panel)panel.querySelector('[data-inspection]').textContent=JSON.stringify(result,null,2);button.disabled=false;refreshTravelChoices();};panel.querySelector('[data-capture]').disabled=!capture.canStart();panel.querySelector('[data-capture]').onclick=event=>{if(capture.start(event))close();};panel.querySelector('[data-close]').onclick=close;panel.querySelector('[data-refresh]').onclick=refresh;panel.querySelector('select').onchange=renderState;panel.querySelector('[data-consent]').onchange=renderState;panel.querySelector('[data-review]').onclick=review;panel.querySelector('[data-use]').onclick=async event=>{const select=panel?.querySelector('select');const result=await use(event,select?.value,panel?.querySelector('[data-consent]').checked);if(panel)panel.querySelector('[data-result]').textContent=result.text||result.result;};panel.querySelector('[data-travel-select]').onchange=renderState;panel.querySelector('[data-travel-consent]').onchange=renderState;panel.querySelector('[data-travel-use]').onclick=async event=>{const selection=panel?.querySelector('[data-travel-select]').value,consented=panel?.querySelector('[data-travel-consent]').checked;const result=await useTravel(event,selection,consented);if(panel)panel.querySelector('[data-travel-result]').textContent=result.text||result.result;};document.body.append(panel);refresh();refreshTravelChoices();
 }
 return {prepareRunInventory,refreshNativeInventory,testNativeRefresh,inspectNativeRefresh,addDiagnosticBloodBag,clearLogs(){invalidateRunInventory();cancelFocusTest?.();focusTests=[];capture.clear();records=[];refreshProbes=[];addOutcome=null;if(!busy&&!inspecting){travelInspection=null;travelOutcome=null;}try{window.sessionStorage.removeItem(LOG);}catch{}},open,close,stop(){invalidateRunInventory();cancelFocusTest?.();close();capture.stop();},captureStart:()=>capture.start(),captureStop:()=>{invalidateRunInventory();cancelFocusTest?.();capture.stop();},captureResume:()=>capture.resume(),inspectTravel,useTravel,buyRunItem,useRunItem:(event,items,guard,options={})=>useTravel(event,null,true,{items,guard,...options}),trashRunItem:(event,items,guard,expectedFingerprint)=>useTravel(event,null,true,{items,guard,operation:'trash',expectedFingerprint}),hasPendingAttempt:pending,cancel:()=>controller?.abort(),use,review,inventory,report:()=>({nativeInventoryRefresh:{focusTests:JSON.parse(JSON.stringify(focusTests)),probes:refreshProbes.map(entry=>({...entry,assets:[...entry.assets]})),addOutcome},build,transport:'direct-website-post',inventoryScope:'personal-medical-and-selected-travel-items',travelRequestCapture:capture.report(),travelInspection,travelOutcome,travelPilot:{enabled:true,selectionScope:'explicit-user-selected-carried-items',freshIdentityCheck:true,automaticFollowUps:false},busy,unconfirmedAttempt:pending(),records:records.map(entry=>({...entry})),limitation:'Response receipt is not proof of travel inventory consumption. Snatch item use and selected destruction use the direct handler; purchase uses verified direct requests; return travel retains native transport.'})};
};
const TU_INTEGRATED_BUILD="0.5.42.103-dev";
const createTravelDomDiagnostic=function createTravelDomDiagnostic({document,window,scrub,storageKey,getMeta,onChange=()=>{},deferPersistence=false,prioritizeFunctions=false}){
 const stages=['Workflow (continuous)','Foreign page / hospitalized','Hospitalization item / Use / Yes confirmation','Inventory Trash / Yes confirmation','Selected healing item / Use control','Heal Yes/No confirmation','Hospital release result','Monitored item / Max and Buy','Purchase Yes/No confirmation','Purchase result','Return to Torn control / confirmation','Return flight result','Failed Snatch and Run attempt'];
 const clean=value=>scrub(String(value??'')).replace(/https?:\/\/[^\s<>"']+/gi,'[URL OMITTED]').replace(/\b[A-Za-z0-9_=-]{24,}\b/g,'[REDACTED]').slice(0,600);
 const privateRegions='#tuim-quickitems-test,#tuim-menu,#tuim-panel,#tuim-travel-window,#tuim-catalog,#tu-pda-panel,#tu-test-dev-panel,#tu-test-dev-toggle,#tu-snatch-run,#tu-snatch-extra-hosp,[role=log],#chat-root,#chatRoot,[class*=chatRoot],[class*=chatBox],[class*=chat-box]';
 const skip='#global,#trade,#faction,[class*="message___"],[class*="senderContainer"],#tuim-quickitems-test,[role=log],#chat-root,#chatRoot,[class*=chatRoot],[class*=chatBox],[class*=chat-box],script,style,noscript,iframe,svg,canvas,img,video,audio,link,meta,textarea,[contenteditable],input[type=hidden],input[type=password],input[type=email],[autocomplete=current-password],[autocomplete=new-password]';
 function markup(root,nativeOnly=false){let count=0,truncated=false;const out=document.createElement('div');
  function copy(node,depth){if(++count>160||depth>9){truncated=true;return null;}if(node.nodeType===3)return document.createTextNode(clean(node.nodeValue));if(node.nodeType!==1||node.matches(skip)||nativeOnly&&node.closest(privateRegions))return null;
   const e=document.createElement(node.tagName.toLowerCase());
   for(const name of ['id','name','class','role','title','type','aria-label','aria-controls','aria-expanded','aria-disabled','data-item-id','data-itemid','data-item-uid','data-id','data-slot','data-slot-id','data-capacity','placeholder','aria-labelledby','aria-describedby','min','max']){
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
  if(!value||typeof value!=='object')return null;const allowed=['event','stage','item','action','step','control','controlId','panel','message','result','reason','limitedBy','sound','source','lastOccurrenceAt','status','effectiveState'];
  const data=Object.fromEntries(allowed.filter(k=>typeof value[k]==='string').map(k=>[k,clean(value[k])]));
  if(['manual-purchase','depart-now'].includes(value.choice))data.choice=value.choice;
  for(const k of ['amount','quantity','x','y','capacityTotal','occupiedSlots','freeSlots','nativeMax','desired','remainingSeconds','threshold','volume','selectedCount','carriedCount','freedSlots','confirmedPurchases','repeatCount','attempt','maxAttempts'])if(Number.isFinite(value[k]))data[k]=value[k];for(const k of ['submitted','hospital','verified','enabled'])if(typeof value[k]==='boolean')data[k]=value[k];
  return data.event?data:null;
 };
 const cleanHospitalAlarm=value=>{if(!value||typeof value!=='object')return null;const out={};for(const key of ['configuredThresholdSeconds','armedThresholdSeconds','sharedVolumePercent','secondsUntilThreshold'])out[key]=Number.isFinite(value[key])?value[key]:null;for(const key of ['armed','configuredEnabled','armedEnabled','settingsChangedSinceArming','dispatchedForCurrentDeadline','audioSupported','audibleOutputVerified'])out[key]=typeof value[key]==='boolean'?value[key]:null;for(const key of ['configuredSound','armedSound','thresholdState','audioContextState'])out[key]=clean(value[key]||'');return out;};
 let captures=[],cancel=null,shield=null,monitoring=false,observer=null,flushTimer=null,stage=stages[0],lastAction=0,sequence=0,dropped=0;
 const pending=new Set();let resumeState={};try{resumeState=JSON.parse(window.sessionStorage.getItem(storageKey+':monitor')||'{}')||{};}catch{}
 const saveMonitoring=()=>{try{window.sessionStorage.setItem(storageKey+':monitor',JSON.stringify({active:monitoring,stage,dropped,sequence}));}catch{}};
 const persist=()=>{try{window.sessionStorage.setItem(storageKey,JSON.stringify(captures));}catch{onChange('Capture kept in memory only; export before navigation.');}};
 let persistTimer=null;const flushPersist=()=>{if(persistTimer!==null)window.clearTimeout(persistTimer);persistTimer=null;persist();saveMonitoring();};const schedulePersist=()=>{if(!deferPersistence){flushPersist();return;}if(persistTimer===null)persistTimer=window.setTimeout(flushPersist,300);};
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
 function append(entry){captures.push(entry);while(captures.length>200||captures.reduce((n,c)=>n+c.html.length,0)>1000000){const index=prioritizeFunctions?captures.findIndex(c=>c.kind!=='function-event'):0;captures.splice(Math.max(0,index),1);dropped++;}schedulePersist();onChange((monitoring?'Monitoring ON · ':'')+captures.length+' captures'+(dropped?' · '+dropped+' older captures discarded':'')+'.');return entry;}
 function recordFunction(event){
  if(!monitoring||typeof event.detail!=='string'||event.detail.length>8192)return;
  let data;try{data=cleanFunction(JSON.parse(event.detail));}catch{return;}if(!data)return;
  if(prioritizeFunctions&&data.event==='click-blocked'){const previous=[...captures].reverse().find(c=>c.kind==='function-event');if(previous?.function?.event===data.event&&previous.function.stage===data.stage&&previous.function.reason===data.reason&&Date.now()-Date.parse(previous.function.lastOccurrenceAt||previous.at)<1000){previous.function.repeatCount=(previous.function.repeatCount||1)+1;previous.function.lastOccurrenceAt=new Date().toISOString();schedulePersist();return;}}
  append({kind:'function-event',function:data,hospitalAlarm:snatchState().hospitalAlarm,sequence:++sequence,stage,at:new Date().toISOString(),host:clean(getMeta().host),installedBuild:clean(getMeta().installedBuild),path:window.location.pathname,html:'',truncated:false,nodes:0});
 }
 function retainedRun(){
  try{const raw=window.sessionStorage.getItem('tu:snatch-run:v1');if(!raw)return {available:false,reason:'No retained Snatch and Run session in this tab'};if(raw.length>64000)return {available:false,reason:'Retained session exceeds diagnostic limit'};const run=JSON.parse(raw);if(!run||typeof run!=='object')return {available:false,reason:'Retained session is unavailable'};
   const ledger=run.capacityLedger&&typeof run.capacityLedger==='object'?run.capacityLedger:null,capacity={};
   if(ledger){for(const key of ['total','initialOccupied','freed','purchased','spent','cashBeforePurchase','watchCount','at'])capacity[key]=Number.isFinite(ledger[key])?ledger[key]:null;capacity.valid=typeof ledger.valid==='boolean'?ledger.valid:null;capacity.reason=clean(ledger.reason||'');capacity.source=clean(ledger.source||'');const computed=capacity.initialOccupied!==null&&capacity.freed!==null&&capacity.purchased!==null?capacity.initialOccupied-capacity.freed+capacity.purchased:null;capacity.expectedOccupied=computed;capacity.expectedFree=computed!==null&&capacity.total!==null?Math.max(0,capacity.total-computed):null;}
   return {available:true,stage:clean(run.stage),item:clean(run.watchName),hospitalizedConfirmed:!!run.hospitalizedConfirmed,purchaseConfirmed:!!run.purchaseConfirmed,destructionEnabled:!!run.destroyInventory,destructionAccepted:!!run.destroyAccepted,destructionDone:!!run.destroyDone,selectedDestructionItemTypes:Array.isArray(run.destroyItems)?Math.min(100,run.destroyItems.length):0,capacityLedger:ledger?capacity:null,limitation:'Retained state is not an action timeline and cannot prove unrecorded causes.'};
  }catch{return {available:false,reason:'Retained Snatch and Run state could not be read'};}
 }
 function snatchState(){const button=document.getElementById('tu-snatch-run');
  const numeric=value=>value!==undefined&&value!==null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  // Read only named TU controls; never collect arbitrary input values.
  const control=(id,label,selector)=>document.getElementById(id)||[...document.querySelectorAll('#tuim-hospital-alarm-settings label')].find(e=>e.textContent.trim().startsWith(label))?.querySelector(selector)||null;const warning=control('tuim-hospital-warning-seconds','Warn when hospital time reaches','input[type=number]'),enabled=control('tuim-hospital-alarm-enabled','Audible hospital alarm','input[type=checkbox]'),sound=control('tuim-hospital-alarm-sound','Hospital alarm sound','select'),volume=document.getElementById('tuim-alarm-volume')||document.querySelector('#tuim-panel input[type=range]');
  const threshold=numeric(button?.dataset.hospitalWarningSeconds),configured=numeric(warning?.value),until=numeric(button?.dataset.hospitalUntil),remaining=until>0?Math.max(0,Math.ceil((until-Date.now())/1000)):null;
  return {present:!!button,stage:clean(button?.dataset.snatchStage||''),label:clean(button?.textContent||''),readinessReason:clean(button?.dataset.readinessReason||''),destinationETASeconds:button?.dataset.destinationETASeconds?Number(button.dataset.destinationETASeconds):null,message:clean(button?.title||''),ready:button?.getAttribute('aria-disabled')==='false',hospitalAlarm:{armed:button?.dataset.hospitalSettingsActive==='true',configuredThresholdSeconds:configured,armedThresholdSeconds:threshold,configuredEnabled:enabled?enabled.checked:null,armedEnabled:button?.dataset.hospitalAlarmEnabled===undefined?null:button.dataset.hospitalAlarmEnabled==='true',configuredSound:sound?clean(sound.value):null,armedSound:clean(button?.dataset.hospitalAlarmSound||''),sharedVolumePercent:numeric(volume?.value)??numeric(button?.dataset.hospitalAlarmVolume),settingsChangedSinceArming:!!(threshold!==null&&(configured!==null&&configured!==threshold||enabled&&enabled.checked!==(button.dataset.hospitalAlarmEnabled==='true')||sound&&sound.value!==button.dataset.hospitalAlarmSound)),thresholdState:clean(button?.dataset.hospitalThresholdState||'unavailable'),secondsUntilThreshold:remaining!==null&&threshold!==null?Math.max(0,remaining-threshold):null,dispatchedForCurrentDeadline:until>0&&numeric(button?.dataset.hospitalAlarmDispatchedUntil)===until,audioContextState:clean(button?.dataset.hospitalAudioState||'unknown'),audioSupported:button?.dataset.hospitalAudioSupported==='unknown'||button?.dataset.hospitalAudioSupported===undefined?null:button.dataset.hospitalAudioSupported==='true',audibleOutputVerified:false},extraHospital:{selectedItemTypes:numeric(button?.dataset.hospitalSelectedCount),carriedSelectedItems:numeric(button?.dataset.hospitalCarriedCount),availabilityReason:clean(button?.dataset.hospitalExtraReason||'unavailable'),present:!!document.getElementById('tu-snatch-extra-hosp')&&!document.getElementById('tu-snatch-extra-hosp').hidden,label:clean(document.getElementById('tu-snatch-extra-hosp')?.textContent||''),warning:document.getElementById('tu-snatch-extra-hosp')?.dataset.hospitalWarning==='true',blinkPeriod:clean(document.getElementById('tu-snatch-extra-hosp')?.style.animation||'')},hospitalClock:{displayed:button?.dataset.hospitalClockVisible==='true'||!!document.getElementById('tu-snatch-extra-hosp')&&!document.getElementById('tu-snatch-extra-hosp').hidden,available:Number(button?.dataset.hospitalUntil)>0,until:Number(button?.dataset.hospitalUntil)||null,remainingSeconds:Number(button?.dataset.hospitalUntil)>0?Math.max(0,Math.ceil((Number(button.dataset.hospitalUntil)-Date.now())/1000)):null,source:clean(button?.dataset.hospitalClockSource||'unavailable'),reason:clean(button?.dataset.hospitalClockReason||''),lookup:clean(button?.dataset.hospitalClockLookup||'not-requested'),profileState:clean(button?.dataset.hospitalProfileState||''),profileUntilPresent:button?.dataset.hospitalProfileUntilPresent==='true'}};}
 // Separate bounded page evidence survives a busy click timeline.
 let pageCaptures=[],pageTimer=null,pageDirty=false,pageSeen=new WeakMap(),lastPageCapture=0;
 function pageContext(){
  const agency=[...document.querySelectorAll('h1,h2,h3,h4')].some(e=>!e.closest(privateRegions)&&/^travel agency$/i.test(e.textContent.trim()));
  const root=document.querySelector('#travel-root,#travelagency-root,#travel-agency-root');
  const path=window.location.pathname;const route=new window.URLSearchParams(window.location.search).get('sid')||'';
  return {kind:agency||/travelagency\.php$/i.test(path)?'travel-agency':root||/^(travel|travelagency)$/i.test(route)?'travel':'unidentified',path,route:/^(travel|travelagency)$/i.test(route)?route.toLowerCase():null,nativeRootPresent:!!root};
 }
 try{const saved=JSON.parse(window.sessionStorage.getItem(storageKey+':page')||'[]');if(Array.isArray(saved))for(const entry of saved.slice(-64)){if(typeof entry.html!=='string')continue;const template=document.createElement('template');template.innerHTML=entry.html.slice(0,16000);const root=template.content.firstElementChild;if(!root||root.matches('body,html'))continue;pageCaptures.push({kind:'page-dom',region:clean(entry.region),at:clean(entry.at),path:clean(entry.path).split(/[?#]/)[0],pageKind:clean(entry.pageKind),host:clean(entry.host),installedBuild:clean(entry.installedBuild),...markup(root,true)});}}catch{}
 function capturePage(){
  if(pageTimer!==null)window.clearTimeout(pageTimer);pageTimer=null;if(!monitoring)return;if(document.hidden){pageDirty=true;return;}pageDirty=false;lastPageCapture=Date.now();const context=pageContext();if(context.kind==='unidentified')return;
  let root=document.querySelector('#travel-root,#travelagency-root,#travel-agency-root');
  if(!root){const heading=[...document.querySelectorAll('h1,h2,h3,h4')].find(e=>!e.closest(privateRegions)&&/^travel agency$/i.test(e.textContent.trim()));root=heading?.closest('main,[role=main],#content-wrapper,#mainContainer')||heading?.parentElement?.parentElement;}
  if(!root||root.matches('body,html')||root.closest(privateRegions))return;
  const regions=new Map([[root,'travel-page']]);
  const add=(element,label)=>{if(element&&!element.matches('body,html')&&!element.closest(privateRegions)&&regions.size<32)regions.set(element,label);};
  // Capture sections independently so slots cannot truncate inventory search or destination controls.
  for(const child of [...root.children].slice(0,12)){add(child,'page-section');for(const sub of [...child.children].slice(0,8))if(sub.querySelector('input,button,select,[role=button]'))add(sub,'control-section');}
  for(const panel of [...root.querySelectorAll('[class*=inventory i],[id*=inventory i],fieldset,form')].slice(0,24))add(panel,'inventory-or-form');
  for(const input of [...root.querySelectorAll('input[placeholder],input[type=checkbox],select')].slice(0,12))add(input.parentElement?.parentElement,'inventory-controls');
  let changed=0;for(const [element,region] of regions){const safe=markup(element,true);const signature=context.path+'|'+context.kind+'|'+safe.html;if(pageSeen.get(element)===signature)continue;pageSeen.set(element,signature);pageCaptures.push({kind:'page-dom',region,at:new Date().toISOString(),path:context.path,pageKind:context.kind,host:clean(getMeta().host),installedBuild:clean(getMeta().installedBuild),...safe});changed++;}
  while(pageCaptures.length>64||pageCaptures.reduce((n,c)=>n+c.html.length,0)>512000)pageCaptures.shift();
  if(changed){try{window.sessionStorage.setItem(storageKey+':page',JSON.stringify(pageCaptures));}catch{}onChange('Monitoring ON · '+captures.length+' action captures · '+pageCaptures.length+' native page DOM fragments.');}
 }
 function schedulePage(){pageDirty=true;if(pageTimer===null)pageTimer=window.setTimeout(capturePage,Math.max(350,1500-(Date.now()-lastPageCapture)));}
 const pageVisible=()=>{if(!document.hidden&&pageDirty&&monitoring)schedulePage();};
 function stop(){window.removeEventListener('pagehide',flushPersist);if(monitoring&&pageDirty&&!document.hidden)capturePage();window.clearTimeout(pageTimer);pageTimer=null;pageDirty=false;document.removeEventListener('visibilitychange',pageVisible);window.removeEventListener('popstate',schedulePage);window.removeEventListener('hashchange',schedulePage);cancel?.();shield?.();monitoring=false;observer?.disconnect();observer=null;window.clearTimeout(flushTimer);flushTimer=null;pending.clear();document.removeEventListener('click',recordClick,true);document.removeEventListener('change',recordChange,true);document.removeEventListener('tu-snatch-run-diagnostic',recordFunction);if(persistTimer!==null)flushPersist();saveMonitoring();onChange('Monitoring OFF · '+captures.length+' captures retained.');}
 const ignored=e=>!e||e.closest(privateRegions)||e.closest('#tu-test-dev-panel,#tu-test-dev-toggle,script,style,textarea,[contenteditable],input[type=password],input[type=hidden],[role=log],[class*=chatBox],[class*=chat-box]');
 const relevant=e=>!ignored(e)&&!e.matches('html,body')&&/\b(use|yes|no|buy|purchase|return|torn|hospital|flight|blood bag|medical)\b/i.test((e.getAttribute('aria-label')||'')+' '+(e.textContent||'').slice(0,1800));
 function take(target,kind){if(!monitoring||document.hidden||ignored(target))return;try{const result=capture(stage,target,kind);return result;}catch{}}
 function recordClick(event){const target=event.target.nodeType===1?event.target:event.target.parentElement;if(ignored(target))return;lastAction=Date.now();take(target,'click');schedulePage();}
 function recordChange(event){if(/^tuim-(?:hospital-(?:warning-seconds|alarm-enabled|alarm-sound)|alarm-volume)$/.test(event.target?.id||'')){lastAction=Date.now();try{capture(stage,event.target,'change');}catch{}return;}if(!ignored(event.target)){lastAction=Date.now();take(event.target,'change');schedulePage();}}
 function start(selected=stages[0]){
  if(!stages.includes(selected))throw Error('Select a capture stage');if(monitoring){stage=selected;saveMonitoring();return;}
  cancel?.();shield?.();stage=selected;monitoring=true;saveMonitoring();window.addEventListener('pagehide',flushPersist);document.addEventListener('visibilitychange',pageVisible);window.addEventListener('popstate',schedulePage);window.addEventListener('hashchange',schedulePage);capturePage();
  document.addEventListener('click',recordClick,{capture:true,passive:true});document.addEventListener('change',recordChange,{capture:true,passive:true});document.addEventListener('tu-snatch-run-diagnostic',recordFunction);
  observer=new window.MutationObserver(records=>{
   if(!monitoring||document.hidden)return;
   if(records.some(record=>{const e=record.target.nodeType===1?record.target:record.target.parentElement;return record.type!=='characterData'&&(record.type!=='childList'||[...record.addedNodes,...record.removedNodes].some(n=>n.nodeType===1))&&e&&!e.closest(privateRegions)&&(e.closest('#travel-root,#travelagency-root,#travel-agency-root')||[...record.addedNodes].some(n=>n.nodeType===1&&(n.matches('#travel-root,#travelagency-root,#travel-agency-root,main,[role=main]')||n.querySelector('#travel-root,#travelagency-root,#travel-agency-root'))));}))schedulePage();
   for(const record of records.slice(0,50)){
    const target=record.target.nodeType===1?record.target:record.target.parentElement;if(ignored(target))continue;
    for(const node of [target,...record.addedNodes].slice(0,12)){if(node.nodeType!==1||!relevant(node))continue;if(Date.now()-lastAction>12000&&!node.closest('[role=dialog],dialog,[class*=confirm i],[class*=popover i],[class*=hospital i],[class*=travel i]')&&!/would you like|you (?:have )?(?:used|purchased|bought)|return(?:ing)? to torn/i.test((node.textContent||'').slice(0,1800)))continue;pending.add(node);if(pending.size>=12)break;}
    if(pending.size>=12)break;
   }
   if(pending.size&&flushTimer===null)flushTimer=window.setTimeout(()=>{flushTimer=null;if(!monitoring)return;let count=0;for(const node of pending){if(node.isConnected&&count++<6)take(node,'dom-change');}pending.clear();},180);
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-expanded','aria-disabled','disabled','checked','aria-label']});
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
 return {stages,markup,capture,pick,start,stop,isMonitoring:()=>monitoring,resume(){if(resumeState.active)start(stages.includes(resumeState.stage)?resumeState.stage:stages[0]);},setStage(value){if(stages.includes(value)){stage=value;saveMonitoring();}},report:()=>({schemaVersion:5,readOnly:true,monitoring,stage,retainedSnatchRun:retainedRun(),pageContext:pageContext(),pageDom:pageCaptures.map(c=>({...c})),snatchAndRun:snatchState(),droppedCaptures:dropped,captures:captures.map(c=>({...c})),limits:{maxPageFragments:64,maxPageHtmlCharacters:512000,maxCaptures:200,maxTotalHtmlCharacters:1000000,maxNodes:160,maxDepth:9,maxHtmlCharacters:16000},excluded:['arbitrary input values (only named TU hospital settings and shared volume are included)','URLs and query strings (only allowlisted travel route category retained)','cookies and credentials','network requests','full browser-page HTML (bounded native travel content fragments only)']}),clear(){stop();pageCaptures=[];pageSeen=new WeakMap();captures=[];dropped=0;sequence=0;try{window.sessionStorage.removeItem(storageKey);window.sessionStorage.removeItem(storageKey+':monitor');window.sessionStorage.removeItem(storageKey+':page');}catch{}onChange('DOM captures cleared.');}};
};
const createAcceptanceSession=function createAcceptanceSession({targetBuild,checklistVersion,tests,platform,initial={},clock=()=>new Date().toISOString()}) {
 const allowed=new Set(['pass','fail','skip','blocked','not-tested']);
 const scrub=value=>String(value??'').replace(/\b(?:Bearer|ApiKey)\s+[^\s,;]+/gi,'[REDACTED]')
  .replace(/\b(?:api[_ -]?key|token|secret|authorization)\s*[:=]\s*["']?[^\s,"';]+/gi,'[REDACTED]')
  .replace(/\b[A-Za-z0-9]{16}\b/g,'[REDACTED]').replace(/\b[A-Za-z0-9_-]{24,}(?:\.[A-Za-z0-9_-]+)*\b/g,'[REDACTED]')
  .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi,'[REDACTED]').slice(0,2000);
 const same=initial.targetBuild===targetBuild&&initial.checklistVersion===checklistVersion&&initial.platform===platform;
 const results={};
 if(same)for(const t of tests){const old=initial.results?.[t.id];if(old&&allowed.has(old.status)&&old.kind===t.kind)results[t.id]={status:old.status,kind:t.kind,note:scrub(old.note),at:scrub(old.at)};}
 const meta={device:scrub(same?initial.meta?.device:''),hostVersion:scrub(same?initial.meta?.hostVersion:''),feedback:scrub(same?initial.meta?.feedback:'')};
 return Object.freeze({
  scrub,
  setMeta(values){for(const k of Object.keys(meta))if(k in values)meta[k]=scrub(values[k]);},
  record(id,status,note='',kind='manual'){
   const t=tests.find(t=>t.id===id);if(!t)throw Error('Unknown acceptance check');
   if(!allowed.has(status))throw Error('Invalid result');
   if(t.kind!==kind)throw Error('Check must be recorded by its declared method');
   const clean=scrub(note).trim();if(status!=='not-tested'&&!clean)throw Error('Record observed evidence or a reason before choosing a result');
   results[id]={status,kind,note:clean,at:clock()};
  },
  snapshot(){
   return {schemaVersion:2,targetBuild,checklistVersion,platform,meta:{...meta},results:JSON.parse(JSON.stringify(results))};
  },
  report(){
   const items=tests.map(t=>({id:t.id,label:t.label,section:t.section,critical:t.critical,kind:t.kind,instructions:t.instructions,...(results[t.id]||{status:'not-tested',note:'',at:null})}));
   const counts={pass:0,fail:0,skip:0,blocked:0,'not-tested':0};for(const t of items)counts[t.status]++;
   const platformReady=['pda','tampermonkey'].includes(platform)&&!!meta.device.trim()&&!!meta.hostVersion.trim()&&items.every(t=>!t.critical||(t.status==='pass'&&!!t.note));
   return {...this.snapshot(),results:items,counts,platformReady,productionAuthorized:false,exported:clock()};
  }
 });
};
const detectTestEnvironment=function detectTestEnvironment({userAgent='',platform='',maxTouchPoints=0,uaData=null,gmInfo=null,pdaBridge=false}={}) {
 const ua=String(userAgent),version=v=>typeof v==='string'&&/^\d+(?:[._]\d+)*(?:[-+][\w.-]+)?$/.test(v)?v.replaceAll('_','.'):null;
 const match=re=>version(re.exec(ua)?.[1]);
 let os={name:'Unknown OS',version:null,source:'unavailable'},device={type:'unknown',model:null,source:'unavailable'};
 const desktopIPad=/Mac/i.test(platform)&&maxTouchPoints>1;
 if(/Android/i.test(ua)){os={name:'Android',version:match(/Android\s+([\d.]+)/i),source:'user-agent'};device={type:/Mobile/i.test(ua)?'phone':'tablet',model:null,source:'user-agent'};const model=/Android[^;)]*;\s*(?:[A-Za-z]{2}[-_][A-Za-z]{2};\s*)?([^;)]+)/.exec(ua)?.[1]?.replace(/\s+Build\/.*$/,'').trim();if(model&&!/^(K|wv|Linux|Mobile)$/i.test(model))device.model=model;}
 else if(/iPhone|iPad|iPod/i.test(ua)||desktopIPad){const tablet=/iPad/i.test(ua)||desktopIPad;os={name:tablet?'iPadOS':'iOS',version:desktopIPad?null:match(/(?:CPU (?:iPhone )?OS|iPhone OS)\s+([\d_]+)/i),source:'user-agent'};device={type:tablet?'tablet':'phone',model:tablet?'iPad family':'iPhone/iPod family',source:desktopIPad?'desktop-mode touch signals':'user-agent'};}
 else if(/Windows NT/i.test(ua)){const nt=match(/Windows NT ([\d.]+)/);os={name:nt==='10.0'?'Windows 10/11':'Windows',version:nt==='10.0'?null:nt,source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/Mac OS X/i.test(ua)){os={name:'macOS',version:match(/Mac OS X\s+([\d_]+)/),source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/CrOS/i.test(ua)){os={name:'ChromeOS',version:match(/CrOS \S+ ([\d.]+)/),source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/Linux/i.test(ua)){os={name:'Linux',version:null,source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 let browser={name:'Unknown browser',version:null,source:'unavailable'};
 for(const [name,re] of [['Edge',/(?:Edg|EdgA|EdgiOS)\/([\d.]+)/],['Opera',/(?:OPR|OPiOS)\/([\d.]+)/],['Samsung Internet',/SamsungBrowser\/([\d.]+)/],['Firefox',/(?:Firefox|FxiOS)\/([\d.]+)/],['Chrome',/(?:Chrome|CriOS)\/([\d.]+)/],['Safari',/Version\/([\d.]+).*Safari\//]]){const v=match(re);if(v){browser={name,version:v,source:'user-agent'};break;}}
 if(/Android/i.test(ua)&&/; wv\)/.test(ua)&&browser.name==='Chrome')browser.name='Android WebView (Chromium)';
 if(browser.name==='Unknown browser'&&/AppleWebKit\//.test(ua))browser={name:'WebKit webview',version:match(/AppleWebKit\/([\d.]+)/),source:'user-agent engine version'};
 if(uaData&&typeof uaData==='object'){
  if(typeof uaData.model==='string'&&uaData.model.trim())device={...device,model:uaData.model.trim(),source:'client-hints'};
  if(!desktopIPad&&typeof uaData.platform==='string'&&uaData.platform.trim()){
   os={name:uaData.platform,version:version(uaData.platformVersion),source:uaData.platformVersion?'client-hints platform version':'client-hints'};
   if(uaData.platform==='Windows'&&!os.version)os.name='Windows (version unavailable)';
  }
  const brands=Array.isArray(uaData.fullVersionList)?uaData.fullVersionList:uaData.brands;
  if(Array.isArray(brands))for(const [brand,name] of [['Microsoft Edge','Edge'],['Opera','Opera'],['Google Chrome','Chrome'],['Chromium','Chromium']]){
   const found=brands.find(b=>b?.brand===brand&&version(b.version));
   if(found){if(browser.name==='Unknown browser'||browser.name===name||(name==='Chromium'&&browser.name==='Android WebView (Chromium)'))browser={...browser,name:browser.name==='Android WebView (Chromium)'?browser.name:name,version:version(found.version),source:Array.isArray(uaData.fullVersionList)?'client-hints full version':'client-hints major version'};break;}
  }
 }
 const pdaVersion=match(/Torn[ _-]?PDA[\s/:;-]+v?([\d.]+)/i);
 const isPda=!!pdaBridge||/Torn[ _-]?PDA/i.test(ua);
 let host={id:'unknown',name:'Unknown host',version:null,source:'unavailable'};
 if(isPda)host={id:'pda',name:'Torn PDA',version:pdaVersion,source:pdaVersion?'user-agent app token':pdaBridge?'PDA bridge (version unavailable)':'user-agent (version unavailable)'};
 else if(/tampermonkey/i.test(gmInfo?.scriptHandler||''))host={id:'tampermonkey',name:'Tampermonkey',version:version(gmInfo.version),source:gmInfo.version?'GM_info.version':'GM_info.scriptHandler (version unavailable)'};
 return {device,os,browser,host};
};
const createHospitalClock=function createHospitalClock({document,now=()=>Date.now()}){
 let profileUntil=null,profileState='',profileUntilPresent=false,signature='',relativeUntil=null,diagnostic={source:'unavailable',until:null,nativeHospitalPresent:false,reason:'not-read'};
 const deadline=value=>{const n=Number(value);if(Number.isFinite(n)&&n>=1e9)return n<1e12?n*1000:n;if(typeof value==='string'&&/^\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(value)){const parsed=Date.parse(value);if(Number.isFinite(parsed))return parsed;}return null;};
 let displaySignature='',displayUntil=null;
 function displayRemaining(){
  const hospital=[...document.querySelectorAll('a[aria-label^="Hospital:"],[data-hospital-until]')].find(el=>!el.closest('#tu-snatch-run,#tu-snatch-extra-hosp,#tuim-panel,#tu-pda-panel'));
  if(!hospital){displaySignature='';displayUntil=null;return null;}
  const texts=[hospital.textContent,hospital.getAttribute('title'),hospital.getAttribute('data-original-title'),hospital.getAttribute('aria-label')].filter(Boolean).map(text=>text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
  for(const text of texts){if(/\bago\b/i.test(text))continue;const clock=text.match(/\b(\d{1,3}):([0-5]\d):([0-5]\d)\b/);let seconds=0;
   if(clock&&(/\b(remaining|left|for)\b/i.test(text)||text===clock[0]||/^Hospital:\s*\d{1,3}:[0-5]\d:[0-5]\d$/i.test(text)))seconds=+clock[1]*3600 + +clock[2]*60 + +clock[3];
   else if(/\b\d+\s*(seconds?|secs?|s)\b/i.test(text)){for(const match of text.matchAll(/\b(\d+)\s*(days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|[dhms])\b/gi))seconds+=Number(match[1])*({d:86400,h:3600,m:60,s:1}[match[2][0].toLowerCase()]);}
   else continue;
   if(displaySignature!==text){displaySignature=text;displayUntil=now()+seconds*1000;}
   return Math.max(0,Math.ceil((displayUntil-now())/1000));
  }displaySignature='';displayUntil=null;return null;
 }
 function read(status){
  if(status){profileState=['Hospital','Abroad','Traveling','Okay'].includes(status.state)?status.state:'other';profileUntilPresent=status.until!==undefined&&status.until!==null;profileUntil=status.state==='Hospital'?deadline(status.until):null;}
  const hospital=[...document.querySelectorAll('a[aria-label^="Hospital:"],[data-hospital-until]')].find(el=>!el.closest('#tu-snatch-run,#tu-snatch-extra-hosp,#tuim-panel,#tu-pda-panel'));
  const finish=(until,source,reason='')=>{diagnostic={source,until:until||null,nativeHospitalPresent:!!hospital,profileState,profileUntilPresent,reason};return until;};
  if(hospital){
   for(const el of [hospital,...hospital.querySelectorAll('[data-hospital-until],[data-until],[data-time],[datetime]')])for(const attr of ['data-hospital-until','data-until','data-time','datetime']){const value=deadline(el.getAttribute(attr));if(value)return finish(value,'native-deadline');}
   if(profileUntil)return finish(profileUntil,'profile-hospital-until');
   const texts=[...new Set([hospital.getAttribute('title'),hospital.getAttribute('data-original-title'),hospital.getAttribute('aria-label'),hospital.textContent].filter(Boolean).map(text=>text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()))];
   for(const text of texts){const clock=text.match(/\b(\d{1,3}):(\d{2}):(\d{2})\b/);let seconds=0,found=false;if(/\bago\b/i.test(text))continue;
    for(const match of text.matchAll(/\b(\d+)\s*(days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|[dhms])\b/gi)){found=true;seconds+=Number(match[1])*({d:86400,h:3600,m:60,s:1}[match[2][0].toLowerCase()]);}
    if(!found&&clock&&(/\b(remaining|left|for)\b/i.test(text)||text===clock[0]||/^Hospital:\s*\d{1,3}:[0-5]\d:[0-5]\d$/i.test(text))){seconds=Number(clock[1])*3600+Number(clock[2])*60+Number(clock[3]);found=true;}
    if(found){if(signature!==text){signature=text;const observed=now()+seconds*1000;if(relativeUntil===null||Math.abs(relativeUntil-observed)>1500)relativeUntil=observed;}return finish(relativeUntil,'native-duration');}
   }
  }else{signature='';relativeUntil=null;}
  return finish(profileUntil,profileUntil?'profile-hospital-until':'unavailable',profileUntil?'':profileState==='Hospital'?(profileUntilPresent?'profile-hospital-until-invalid-or-zero':'profile-hospital-until-missing'):profileState?'profile-state-not-hospital':'profile-not-read');
 }
 return {read,displayRemaining,report:()=>({...diagnostic})};
};
const createNativeTravelActions=function createNativeTravelActions({document,window,enabled=()=>false,now=()=>Date.now()}){
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
 async function execute(kind,{run,getSnapshot,guard,allowBeforeLanding=false,extendHospital=false,onEvent=()=>{},awaitAction=null}){
  if(!enabled())throw Error('Native Tampermonkey/PDA controls unavailable');cancel();const current=new window.AbortController();controller=current;
  const signal=current.signal;let submitted=false;
  const ensure=()=>{if((kind!=='return'&&run.capacityLedger?.valid===false)||signal.aborted||!guard()||document.hidden||!document.hasFocus())throw Error('Action canceled or page/player changed. Continue manually if Torn already accepted it.');};
  let stepValidation=null;const click=async (e,mutating=false)=>{if(awaitAction)await awaitAction(label(e));ensure();const freshState=getSnapshot();if(['buy','destroy'].includes(kind)&&freshState.hospitalized!==false)throw Error('Hospital status changed before the next Torn step');if(stepValidation)stepValidation(e);if(!shown(e))throw Error('Native action is no longer available');onEvent({step:'native-click',control:label(e).slice(0,220),controlId:e.id||'',panel:e.getAttribute('aria-controls')||''});if(mutating)submitted=true;e.click();};
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
    if(slot.querySelector('[class*=confirmQuestion]'))throw Error('Close the existing item confirmation first');if(opener.getAttribute('aria-expanded')!=='true')await click(opener);
    const use=await wait(()=>one(buttons(slot,'Use'),'hospitalization Use control'));await click(use);
    const yes=await wait(()=>{const q=slot.querySelector('[class*=confirmQuestion]');if(!q)return null;if(norm(q.querySelector('strong')?.textContent)!==norm(item.name)||!norm(q.textContent).includes('would you like to use'))throw Error('Hospitalization confirmation does not match the selected item');return one(buttons(q,'Yes'),'hospitalization Yes confirmation');});
    const fresh=getSnapshot();if(!eligible(fresh)){const no=one(buttons(slot.querySelector('[class*=confirmQuestion]'),'No'),'hospitalization No control');if(no)await click(no);throw Error('Stock or hospital status changed; hospitalization was not submitted');}
    await click(yes,true);await wait(()=>extendHospital?
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
    if(opener.getAttribute('aria-expanded')!=='true')await click(opener);
    const use=await wait(()=>one(buttons(slot,'Use'),'medical Use control'));await click(use);
    const yes=await wait(()=>{const q=question();if(!q)return null;if(norm(q.querySelector('strong')?.textContent)!==norm(selectedName)||!norm(q.textContent).includes('would you like to use'))throw Error('Medical confirmation does not match the selected item');return one(buttons(q,'Yes'),'medical Yes confirmation');});
    if(!(getSnapshot().quantity>=Math.max(1,Number(run.minimumQty)||1)))throw Error('Monitored stock dropped before healing; no medical item was used');
    await click(yes,true);
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
     if(opener.getAttribute('aria-expanded')!=='true')await click(opener);
     const trash=await wait(()=>one(buttons(slot,'Trash'),'travel inventory Trash control'));await click(trash);
     const yes=await wait(()=>{const question=slot.querySelector('[class*=confirmQuestion]');if(!question)return null;const text=norm(question.textContent);if(norm(question.querySelector('strong')?.textContent)!==name||! /\b(trash|destroy|throw away|discard)\b/.test(text))throw Error('Trash confirmation does not match the approved travel inventory item');return one(buttons(question,'Yes'),'travel Trash Yes confirmation');});
     eligible();await click(yes,true);
     const beforeCount=[...remaining.values()].reduce((a,b)=>a+b,0);
     const result=await wait(()=>{if(current().length<beforeCount)return {removed:true};const close=one(slot.querySelectorAll('button[aria-label="Close"]'),'Trash result Close');return close&&/\b(trashed|destroyed|discarded)\b/i.test(slot.textContent)?{close}:null;});
     if(result.close){await click(result.close);await wait(()=>current().length<beforeCount);}
     const left=(remaining.get(name)||0)-1;if(left)remaining.set(name,left);else remaining.delete(name);creditFreed(run);destroyed++;onEvent({step:'inventory-item-destroyed',amount:destroyed,quantity:total});
    }
    eligible();if(current().some(item=>approved.has(itemName(item))))throw Error('Selected travel inventory items did not finish clearing');return {inventoryDestroyed:true,amount:destroyed};
   }
   if(kind==='buy'){
    let confirmedAmount=0,target=null;
    const outcome=warning=>({purchaseConfirmed:true,amount:confirmedAmount,...(warning?{reconcileWarning:warning}:{})});
    // Initial purchase plus five confirmed remainder attempts. Each native control still yields to a user gesture.
    for(let round=0;round<6;round++){try{
    submitted=false;stepValidation=null;
    let s=getSnapshot();
    // A purchase receipt can precede Torn restoring the shop row. Missing is unknown,
    // not sold out. Only the remainder path waits; the first purchase stays immediate.
    if(round>0&&s.stockVisible===false){onEvent({step:'remainder-state-wait',attempt:round,reason:'shop-row-pending'});await wait(()=>{const fresh=getSnapshot();return fresh.stockVisible!==false&&Number.isFinite(fresh.quantity)?fresh:null;});s=getSnapshot();}
    if(s.hospitalized!==false)throw Error('Confirm hospital release before buying');
    if(!(s.quantity>0))throw Error('Current stock is unavailable or exhausted');
    if(same(released,run)){const close=one([...(released.slot?.querySelectorAll('button[aria-label="Close"]')||[])],'medical result Close');if(close){await click(close);await new Promise(resolve=>window.setTimeout(resolve,32));ensure();}}
    let {id,row}=resolveItem(run);
    const panelId='item-'+id+'-buyPanel';
    const existing=scope().querySelector('#'+panelId);
    if(existing&&one(existing.querySelectorAll('[class*=confirmPanel]'),'existing purchase confirmation'))throw Error('Close the existing purchase confirmation before Purchase Max');
    const icon=one([...row.querySelectorAll('button[class*=buyIconButton][aria-controls]')].filter(e=>e.getAttribute('aria-controls')===panelId),'compact Buy opener');
    let container=row,compact=!!icon;
    if(compact){
     let amountPanel=existing?.querySelector('[class*=amountPanel]');
     if(!shown(amountPanel)){await click(icon);amountPanel=await wait(()=>{const panel=scope()?.querySelector('#'+panelId);const amount=panel?.querySelector('[class*=amountPanel]');return shown(amount)?amount:null;});}
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
    if(!capacity.verified){if(!max)throw Error('Native maximum fallback unavailable');await click(max);await new Promise(resolve=>window.setTimeout(resolve,32));ensure();nativeAmount=Number(input.value.replace(/,/g,''));capacity=capacityFor(row,run,getSnapshot().quantity,nativeAmount);}
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
    const amount=Number(input.value.replace(/,/g,''));s=getSnapshot();const freshCapacity=capacityFor(row,run,s.quantity,amount);if(capacity.verified&&(!freshCapacity.verified||freshCapacity.desired<amount))throw Error('Available capacity, stock or funds changed before Buy');if(s.hospitalized!==false||amount>s.quantity)throw Error('Hospital or stock state changed before Buy');await click(buy);
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
     const confirmation=scope()?.querySelector('#'+panelId+' [class*=confirmPanel]');const no=one(buttons(confirmation,'No'),'purchase No confirmation');if(no)await click(no);
     throw Error('Capacity, stock or funds changed before confirmation; purchase canceled');
    }
    if(getSnapshot().hospitalized!==false)throw Error('Hospital state changed before confirmation');if(capacity.verified&&!Number.isFinite(run.capacityLedger.cashBeforePurchase))run.capacityLedger.cashBeforePurchase=capacity.cash;stepValidation=()=>{const current=getSnapshot(),stock=current.stockVisible===false?s.quantity:Number.isFinite(current.quantity)?current.quantity:s.quantity;const fresh=capacityFor(row,run,stock,amount,confirmedPrice);if(current.hospitalized!==false||capacity.verified&&(!fresh.verified||fresh.desired<amount))throw Error('Capacity, stock, funds or hospital status changed before the purchase click');};await click(yes,true);
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
     if(home.getAttribute('aria-expanded')!=='true')await click(home);
    }
    const confirmation=await wait(()=>{
     const candidate=currentPanel();if(!shown(candidate))return null;const value=prompt(candidate);
     if(!value)return null;
     if(/are you sure you want to travel back to/.test(value)&&!value.includes('are you sure you want to travel back to torn'))throw Error('Return confirmation does not specify Torn');
     if(!value.includes('are you sure you want to travel back to torn'))return null;
     const back=returnButton(candidate);return back?{panel:candidate,back}:null;
    });
    panel=confirmation.panel;await click(confirmation.back,true);
    panel=await wait(()=>{const candidate=currentPanel();return candidate&&/you make your way over to the airstrip and tell your pilot to head for torn/i.test(candidate.textContent)?candidate:null;});booked={...run};
    const next=await wait(()=>{
     // Torn may advance automatically when its countdown ends.
     if(scope()?.querySelector('[aria-label="Flight progress"]')||norm(scope()?.querySelector('h4')?.textContent)==='traveling')return {complete:true};
     const candidate=currentPanel(),button=one([...(candidate?.querySelectorAll('button')||[])].filter(e=>/^continue(?:\s*\(\d+\))?$/.test(label(e))),'flight Continue control');
     return button?{button}:null;
    },8000);if(next.button)await click(next.button);
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
};
const createTravelEnhancements=function createTravelEnhancements({document,window,getItems,getContext,getSnapshot,getRows,matchRow,getSetup=()=>({}),storeSetup=()=>{},screenAlertEnabled=()=>false,getFilterContainer=row=>row,onArmed=()=>{},executeAction=null,filterEnabled,onNotice,storeRun=()=>{},restoreRun=null,now=()=>Date.now(),hospitalAudio=null,getDestinationETA=()=>null,getHospitalCountdown=()=>null}) {
 const hiddenRows=new Map(),TTL=Number.MAX_SAFE_INTEGER,STOCK_TTL=30000;
 let departurePrompt=null;
 let run=restoreRun?{...restoreRun,expiresAt:Number.MAX_SAFE_INTEGER}:null,busy=false,active=false,hud=null,action=null,lastNotice='',statusTimer=null,statusAttempts=0,drag=null,suppressClickUntil=0,warningCancel=null,countdownTimer=null,countdownBase='',countdownShown=false,clockReadPending=false;if(run?.capacityLedger){run.capacityLedger={...run.capacityLedger,valid:false,reason:'page-refreshed'};}if(run){delete run.purchaseRefreshPending;delete run.purchaseDisplayRefreshDone;}const clockReads=new WeakSet();let extraHosp=null,hospitalShown=false,alarmDeadline=null,hospitalRemaining=false;
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
  hospitalAudio?.stop?.();return nativeAct('hospitalize',{extendHospital:true,event});
 }

 async function loadHospitalClock(force=false){const expected=run;if(!expected||clockReadPending||!force&&clockReads.has(expected))return;clockReads.add(expected);clockReadPending=true;run.hospitalClockLookup='loading';if(action)action.dataset.hospitalClockLookup='loading';try{const context=await getContext();if(run===expected){run.hospitalClockLookup=context.hospitalUntil>0?'available':'unavailable';run.hospitalClock=context.hospitalClock||null;if(context.hospitalUntil>0){run.hospitalUntil=context.hospitalUntil;persist();}}}catch{if(run===expected)run.hospitalClockLookup='request-failed';emit('hospital-clock-unavailable');}finally{clockReadPending=false;if(run===expected)refresh();}}
 function finishReturnFlight(s){
  if(!run||run.stage==='complete'||!s.traveling||!s.returning||String(s.ownerId)!==run.ownerId)return false;
  run.stage='complete';delete run.stepLabel;clearStatusTimer();executeAction?.cancel?.();departurePrompt?.remove();departurePrompt=null;persist();emit('return-flight-confirmed');notice('Return flight to Torn confirmed. Snatch and Run completed.');return true;
 }
 function refresh(){
  if(!action)return;finishReturnFlight(getSnapshot());const hide=!run||run.stage==='complete';action.dataset.hospitalSettingsActive=String(!hide);if(action.hidden!==hide)action.hidden=hide;const display=hide?'none':'block';if(action.style.display!==display)action.style.display=display;if(!run||hide){if(run?.stage==='complete'){action.textContent='Return flight booked';action.dataset.snatchStage='complete';}extraHosp?.setAttribute('hidden','');if(extraHosp)extraHosp.style.display='none';hospitalAudio?.stop?.();stopCountdown();document.getElementById('tu-snatch-screen-alert')?.remove();return;}
  const s=getSnapshot();hospitalRemaining=(s.hospitalized===true||s.hospitalized==null&&run.hospitalizedConfirmed)&&validRun(s)&&hasHospitalItem();screenAlert(s);const kind=run.stage,waiting=kind==='waiting',pending=kind.endsWith('-pending');
  const minimum=Math.max(1,Number(getItems().find(w=>w.key===run.watchKey)?.minQty)||1);
  const stockAvailable=executeAction?.hasPendingStep?.()&&run.stepLabel&&kind!=='destroy'?true:kind==='hospitalize'?outbound(s)||Number.isFinite(s.quantity)&&s.quantity<minimum&&s.hospitalized===false:kind==='return'||(['buy','destroy'].includes(kind)?s.quantity>=minimum:!Number.isFinite(s.quantity)||s.quantity>=minimum);
  const ready=!!(stockAvailable&&(validRun(s)||kind==='hospitalize'&&outbound(s)||run.stepLabel&&!['destroy','buy'].includes(kind)&&executeAction?.hasPendingStep?.()&&sameTrip(s))&&focused()&&!busy&&!waiting&&!pending&&(kind!=='destroy'||s.hospitalized===false)&&['hospitalize','heal','destroy','buy','return'].includes(kind)&&(['return','hospitalize'].includes(kind)||run.stepLabel&&!['destroy','buy'].includes(kind)&&executeAction?.hasPendingStep?.()||now()-run.stockAt<(kind==='heal'?120000:STOCK_TTL)));
  const reason=ready?'ready':!active?'tool-inactive':run.expiresAt<=now()?'run-expired':String(s.ownerId)!==run.ownerId?'player-unavailable-or-changed':s.country!==run.country?'destination-unavailable-or-changed':document.hidden?'page-hidden':!document.hasFocus()?'page-not-focused':busy?'action-busy':waiting?'waiting-for-stock':pending?'confirmation-pending':s.returning&&s.traveling?'return-flight':s.traveling&&kind!=='hospitalize'?'in-flight':!stockAvailable?'stock-or-hospital-status-unavailable':'state-or-stock-not-ready';
  action.dataset.readinessReason=reason;
  const text=run.stepLabel&&executeAction?.hasPendingStep?.()?run.stepLabel:kind==='departure-choice'?'Choose departure option':waiting?'Waiting for available stock':kind==='hospitalize'?'Hospitalize Me':pending?(kind==='hospitalize-pending'?'Confirming hospitalization':kind==='heal-pending'?'Confirming healing':kind==='buy-pending'?'Confirming purchase':kind==='destroy-pending'?'Destroying travel inventory':'Booking return flight'):kind==='complete'?'Return flight booked':kind==='destroy'?'Destroy Selected Items':kind==='buy'?'Purchase Max':kind==='heal'?'Heal from Hospital':'Return to Torn';
  const hospitalWaiting=waiting&&(s.hospitalized===true||s.hospitalized==null&&run.hospitalizedConfirmed);updateCountdown(text,hospitalWaiting,s);if(hospitalShown&&!run.hospitalUntil&&focused()&&!clockReads.has(run)&&!clockReadPending)void loadHospitalClock();action.dataset.snatchStage=kind;
  const state=ready?'ready':'waiting';if(action.dataset.state!==state){action.disabled=false;action.dataset.state=state;action.setAttribute('aria-disabled',String(!ready));action.style.backgroundColor=ready?'#167b35':'#b32424';action.style.borderColor=ready?'#66d584':'#ec8585';}
 }
 function showDepartureChoice(){
  if(!run||run.stage!=='departure-choice'||departurePrompt?.isConnected)return;
  const expected=run,capacity=run.departureCapacity;
  const overlay=document.createElement('div');departurePrompt=overlay;overlay.id='tu-snatch-departure-choice';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Purchase completed with inventory space remaining');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000b;display:flex;align-items:center;justify-content:center;padding:15px;box-sizing:border-box';
  const body=document.createElement('section');body.style.cssText='max-width:520px;padding:16.5px;background:#11191d;color:#eee;border:2px solid #d6b65c;border-radius:12px;font:12px/1.5 system-ui';overlay.append(body);
  const heading=document.createElement('h3');heading.textContent='Purchase completed';body.append(heading);
  const message=document.createElement('p');message.textContent=capacity?.free>0?capacity.free+' of '+capacity.total+' inventory slots remain free. Would you like to purchase other items and depart manually, or depart now?':'Remaining inventory space could not be verified. Would you like to purchase other items and depart manually, or depart now?';body.append(message);
  const detail=document.createElement('p');detail.textContent='Purchase more items closes Snatch and Run. You will choose additional purchases and arrange travel yourself. Depart now starts the usual travel steps, one action per click.';body.append(detail);
  for(const [label,manual] of [['Purchase more items',true],['Depart now',false]]){
   const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='padding:9px;margin:4.5px;background:#d6b65c;color:#111;border:0;border-radius:6px;font:bold 11.25px system-ui';body.append(button);
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
 function disarm(reason='Snatch and Run canceled'){departurePrompt?.remove();departurePrompt=null;hospitalAudio?.stop?.();alarmDeadline=null;emit('cancel',{message:reason});clearStatusTimer();executeAction?.cancel();executeAction?.forget?.();busy=false;run=null;persist();notice(reason);refresh();}
 async function arm({watchKey,hospital,medical=null,destroyInventory=false,destroyAccepted=false,destroyItems=[],planHospitalize=false,hospitalization=null,medicals=null,hospitalizations=null,hospitalWarningSeconds=60,hospitalAlarm=false,hospitalAlarmVolume=60,hospitalAlarmSound='siren'}={}){
  if(!active||!focused())throw Error('Open Travel Assistant on the actively viewed foreign page');
  const watch=getItems().find(w=>w.key===watchKey&&w.category==='Foreign');if(!watch)throw Error('Select a monitored foreign item');
  hospitalAudio?.unlock?.();const s=await getContext();
  if(!active||!focused())throw Error('Travel Assistant was closed or the page lost focus; arm again');
  if(!s.country||!s.ownerId||!['Abroad','Hospital','Traveling'].includes(s.status)||s.returning)throw Error([...document.querySelectorAll('#travel-root h1,#travel-root h2,#travel-root h3,#travel-root h4')].some(node=>/^travel agency$/i.test(node.textContent.trim()))?'Start your outbound flight first, then arm Snatch and Run while flying or abroad. Item setup can be completed here, but arming is unavailable before departure from Torn.':'Cannot verify your foreign destination or player status. Confirm you are on an outbound flight or abroad, then retry Arm.');
  medicals=selections(medicals,medical);hospitalizations=selections(hospitalizations,hospitalization);medical=medicals[0]||null;hospitalization=hospitalizations[0]||null;
  if(s.status==='Hospital'&&!medical?.name)throw Error('Select a healing medical item before arming while hospitalized');
  const selectedItem=item=>!!item?.name&&(item.source==='travel-dom'||item.source==='agency-picker'||Number.isSafeInteger(Number(item.id))&&Number(item.id)>0);
  if((hospital||planHospitalize)&&(!medicals.length||medicals.some(item=>!selectedItem(item))))throw Error('Select the medical item you intend to use');
  if(destroyInventory&&!destroyAccepted)throw Error('Accept the Inventory Destruction warning before arming');
  if(destroyInventory&&(!Array.isArray(destroyItems)||!destroyItems.length||destroyItems.some(item=>!item?.name)))throw Error('Confirm the inventory items selected for destruction');
  hospitalAudio?.unlock?.();hospitalAudio?.stop?.();alarmDeadline=null;
  run={medicals,hospitalizations:hospitalizations.filter(selectedItem),hospitalWarningSeconds:Math.max(1,Math.min(3600,Number(hospitalWarningSeconds)||60)),hospitalAlarm:!!hospitalAlarm,hospitalAlarmVolume:Math.max(0,Math.min(100,Number(hospitalAlarmVolume)||0)),hospitalAlarmSound:['beep','siren','chime'].includes(hospitalAlarmSound)?hospitalAlarmSound:'siren',planHospitalize:!!planHospitalize&&selectedItem(hospitalization),hospitalization:selectedItem(hospitalization)?hospitalization:null,destroyItems:destroyItems.map(item=>({name:item.name,id:item.id??null})),destroyInventory:!!destroyInventory,destroyAccepted:!!destroyInventory&&!!destroyAccepted,destroyDone:false,intentId:window.crypto?.randomUUID?.()||String(now())+':'+Math.random(),ownerId:String(s.ownerId),country:s.country,watchKey,watchName:watch.name,maximumPrice:Number.isFinite(watch.maxPrice)&&watch.maxPrice>0?watch.maxPrice:null,minimumQty:Math.max(1,Number(watch.minQty)||1),hospital:!!hospital,medical,hospitalUntil:s.hospitalUntil||null,hospitalClock:s.hospitalClock||null,hospitalClockLookup:s.hospitalClock?(s.hospitalUntil?'available':'unavailable'):'not-requested',hospitalizedConfirmed:s.status==='Hospital',stage:'waiting',expiresAt:TTL,stockAt:0};
  const armedRun=run;busy=true;try{await executeAction?.prepareRun?.(armedRun);if(run!==armedRun||!active||!focused())throw Error('Arming changed or lost focus while checking inventory. Arm again.');}catch(error){if(run===armedRun){run=null;busy=false;executeAction?.cancel();persist();}throw error;}
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
  if(!run)return;const s=getSnapshot();if(s.directItemUncertain){refresh();return;}
  if(s.ownerId==null){refresh();return;}
  if(String(s.ownerId)!==run.ownerId){disarm('Player changed; arm again');return;}
  if(run.stage==='hospitalize'&&s.hospitalized===true){run.stage='waiting';persist();}
  if(['hospitalize','waiting'].includes(run.stage)&&Number.isFinite(s.quantity)&&s.quantity>=Math.max(1,Number(run.minimumQty)||1)&&validRun(s)&&focused()){run.stockAt=now();run.stage=s.hospitalized?'heal':afterHeal();persist();emit('stock-ready',{quantity:s.quantity});}
  if(run.stage==='hospitalize-pending'&&s.directItemConsumed&&s.hospitalized===false){clearStatusTimer();run.extensionPending=false;run.hospitalizedConfirmed=false;run.hospitalUntil=null;run.stage='waiting';persist();notice('Item consumed. Torn reports you are not hospitalized. Waiting for available stock.');}if(run.stage==='hospitalize-pending'&&s.hospitalized===true&&(!run.extensionPending||s.hospitalUntil>run.extensionPriorUntil)){run.extensionPending=false;run.stage='waiting';persist();}
  if(run.stage==='heal'&&s.hospitalized===false){run.stage=afterHeal();persist();}
  if(['buy','destroy'].includes(run.stage)&&s.hospitalized===true){if(run.medical){run.stage='heal';persist();}else{notice('Hospitalized: restore Travel Assistant and select a healing item, then re-arm.');}}
  if(run.stage==='heal-pending'&&s.directItemConsumed&&s.hospitalized===true){clearStatusTimer();run.stage='heal';persist();}if(run.stage==='heal-pending'&&s.hospitalized===false){clearStatusTimer();run.stage=afterHeal();persist();notice(run.stage==='destroy'?'Hospital release confirmed. Destroy Selected Items is ready with fresh stock.':'Hospital release confirmed. Return to the monitored shop and verify fresh stock before buying.');}
  if(!executeAction?.isStepping?.()&&!busy&&run.stage==='buy-pending'&&s.purchaseProof&&s.purchaseProof!==run.priorProof&&s.purchaseItemKey===run.watchKey){run.stage='return';run.purchaseConfirmed=true;persist();notice('Purchase confirmed. Return to Torn is ready.');}
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
   const result=await executeAction.execute(kind,{...options,run:expected,getSnapshot,guard,onEvent:fields=>emit('native-step',{action:kind,...fields})});if(run!==expected)return false;if(run.stage==='complete')return true;if(result.actionPending){run.stage=kind;run.stepLabel=result.nextLabel;persist();emit('action-step-ready',{action:kind,label:result.nextLabel});notice(result.nextLabel+' — press Snatch and Run to perform this step.');return true;}delete run.stepLabel;if(run.stage==='complete')return true;
   if(kind==='hospitalize'&&result.hospitalizationNotApplied){run.extensionPending=false;run.hospitalizedConfirmed=false;run.hospitalUntil=null;run.stage='waiting';}if(kind==='hospitalize'&&result.hospitalized){run.extensionPending=false;run.hospitalizedConfirmed=true;run.stage='waiting';void loadHospitalClock(true);const state=getSnapshot();if(Number.isFinite(state.quantity)&&state.quantity>=run.minimumQty){run.stockAt=now();run.stage='heal';}}
   if(kind==='heal'&&result.medicalUsed&&!result.hospitalReleased){run.stage='heal';void loadHospitalClock(true);}
   if(kind==='heal'&&result.hospitalReleased){run.hospitalUntil=null;run.hospitalClock=null;run.hospitalizedConfirmed=false;hospitalAudio?.stop?.();run.stage=afterHeal();}
   if(kind==='destroy'&&result.inventoryDestroyed){run.destroyDone=true;run.stage='buy';}
   if(kind==='buy'&&result.purchaseConfirmed){finishPurchase();}
   if(kind==='return'&&result.returnBooked)run.stage='complete';
   persist();emit('action-result',{action:kind,result:'confirmed',amount:result.amount||null});notice(run.stage==='departure-choice'?'Purchase completed. Choose whether to depart or continue manually.':result.reconcileWarning?'Purchased '+result.amount+' item(s). Reconciliation stopped: '+result.reconcileWarning+'. Return to Torn is ready.':kind==='hospitalize'?(result.hospitalizationNotApplied?'Item consumed. Torn reports you are not hospitalized. Waiting for available stock; no additional item will be used automatically.':result.extensionUnchanged?'Item consumed. Torn still reports the existing hospital deadline; no extension is confirmed. Waiting for available stock.':'Hospitalization confirmed. Waiting for available stock.'):kind==='heal'&&!result.hospitalReleased?'Healing item used; still hospitalized. Click again to use the next selected available heal.':kind==='heal'?(run.stage==='destroy'?'Hospital release confirmed. Destroy Selected Items is ready.':'Hospital release confirmed. Purchase Max is ready.'):kind==='destroy'?'Selected items destroyed. Purchase Max is ready.':kind==='buy'?'Purchase confirmed. Return to Torn is ready.':'Return flight booked.');if(run.stage==='departure-choice')showDepartureChoice();return true;
  }catch(error){if(run===expected&&run.stage==='complete')return true;if(run===expected){delete run.stepLabel;if(!error.submitted){run.stage=options.extendHospital?'waiting':kind;run.extensionPending=false;}else{statusAttempts=0;scheduleStatus();}persist();emit('action-error',{action:kind,message:error.message,submitted:!!error.submitted});notice(error.message);}return false;}
  finally{if(run===expected){busy=false;check();}}
 }
 async function hospitalizeBeforeLanding(event){
  const expected=run;if(!expected||busy||!focused()||!outbound(getSnapshot()))return false;busy=true;refresh();
  try{
   emit('before-landing-confirmation',{action:'hospitalize'});

   if(!executeAction?.enabled())throw Error('Native inventory controls are unavailable; no item was used');
   const current=await getContext();if(run!==expected||!active||!focused()||current.status!=='Traveling'||current.returning||current.country!==expected.country||String(current.ownerId)!==expected.ownerId||!outbound(getSnapshot()))throw Error('The outbound flight changed or could not be verified. No item was used.');
   emit('before-landing-confirmed',{action:'hospitalize'});return await nativeAct('hospitalize',{allowBeforeLanding:true,event});
  }catch(error){notice(error.message);return false;}finally{if(run===expected){busy=false;refresh();}}
 }
 function act(event){
  if(!event?.isTrusted||busy||!run)return false;
  const s=getSnapshot(),kind=run.stage;
  if(kind==='hospitalize'&&outbound(s))return hospitalizeBeforeLanding(event);
  if(!(validRun(s)||run.stepLabel&&!['destroy','buy'].includes(kind)&&executeAction?.hasPendingStep?.()&&sameTrip(s))||!focused()||((!run.stepLabel||kind==='destroy')&&!['return','hospitalize'].includes(kind)&&Number.isFinite(s.quantity)&&s.quantity<Math.max(1,Number(run.minimumQty)||1))||((!run.stepLabel||['destroy','buy'].includes(kind))&&!['return','hospitalize'].includes(kind)&&now()-run.stockAt>=(kind==='heal'?120000:STOCK_TTL))||!['hospitalize','heal','destroy','buy','return'].includes(kind)){notice('Refresh visible state/stock, or re-arm before acting');refresh();return false;}
  if(kind==='hospitalize'&&(s.hospitalized!==false||!Number.isFinite(s.quantity)||s.quantity>=Math.max(1,Number(run.minimumQty)||1))){check();return false;}
  if(executeAction?.enabled())return nativeAct(kind,{event});
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
  const field=(label,control,target=section)=>{const wrap=document.createElement('label');wrap.textContent=label;wrap.style.cssText='display:block;margin:7.5px 0';control.style.cssText='display:block;width:100%;margin-top:3px';wrap.append(control);target.append(wrap);return wrap;};
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
  const alarm=document.createElement('input');alarm.id='tuim-hospital-alarm-enabled';alarm.type='checkbox';alarm.checked=!!setup.hospitalAlarm;const alarmWrap=field('Audio',alarm,alarmParent);alarm.style.cssText='display:inline-block;width:20px;height:20px;min-height:20px;margin:4.5px';alarmWrap.replaceChildren(alarm,document.createTextNode('Audio'));alarmWrap.className='tuim-monitored-toggle';alarmWrap.style.display='flex';alarmWrap.style.alignItems='center';alarm.onchange=()=>{setup.hospitalAlarm=alarm.checked;if(run){run.hospitalAlarm=alarm.checked;persist();}if(!alarm.checked)hospitalAudio?.stop?.();hospitalAudio?.unlock?.();saveSetup();};
  const visual=document.createElement('input');visual.type='checkbox';visual.id='tuim-hospital-visual';visual.checked=setup.hospitalVisual!==false;const channels=document.createElement('div');channels.className='tuim-alarm-channels';alarmParent.insertBefore(channels,alarmWrap);channels.append(alarmWrap);const visualWrap=field('Visual',visual,channels);visualWrap.replaceChildren(visual,document.createTextNode('Visual'));visualWrap.className='tuim-monitored-toggle';visual.onchange=()=>{setup.hospitalVisual=visual.checked;saveSetup();refresh();};
  const sound=document.createElement('select');sound.id='tuim-hospital-alarm-sound';for(const name of ['beep','siren','chime']){const o=document.createElement('option');o.value=name;o.textContent=name;sound.append(o);}sound.value=setup.hospitalAlarmSound||'siren';field('Hospital alarm sound',sound,alarmParent);sound.onchange=()=>{setup.hospitalAlarmSound=sound.value;saveSetup();};
  const testAlarm=document.createElement('button');testAlarm.type='button';testAlarm.textContent='Test hospital alarm';testAlarm.onclick=()=>{hospitalAudio?.unlock?.();hospitalAudio?.play?.({sound:sound.value});};alarmParent.append(testAlarm);

  const destroyWrap=document.createElement('label');destroyWrap.style.cssText='display:flex;align-items:center;gap:6px;margin:9px 0';const destruction=document.createElement('input');destruction.type='checkbox';destruction.id='tuim-inventory-destruction';destruction.checked=!!setup.destroyInventory&&!!setup.destroyAccepted&&!!setup.destroyItems?.length;destruction.style.cssText='width:18px;height:18px;min-height:18px;flex:none';destroyWrap.append(destruction,document.createTextNode('Inventory Destruction'));section.append(destroyWrap);const destroySummary=document.createElement('p');destroySummary.textContent='Selected for destruction: '+(setup.destroyItems?.map(item=>item.name).join(', ')||'No items selected');section.append(destroySummary);
  destruction.onchange=()=>{if(!destruction.checked){setup.destroyInventory=false;setup.destroyAccepted=false;setup.destroyItems=[];destroySummary.textContent='Selected for destruction: No items selected';saveSetup();if(run?.destroyInventory)disarm('Inventory Destruction disabled; arm again');return;}destruction.checked=false;const overlay=document.createElement('div');overlay.id='tuim-destruction-warning';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Inventory Destruction warning');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#8b0000f5;color:white;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box';const body=document.createElement('div');body.style.cssText='max-width:700px;max-height:calc(100dvh - 48px);overflow:auto;font:bold 16.5px/1.5 system-ui';body.textContent="Warning: By activating Snatch and Run Inventory Destruction, the inventory items you select will be permanently destroyed at your demand when Destroy Selected Items is pressed.";const detail=document.createElement('p');detail.style.fontSize='12px';detail.textContent='Only the selected item types carried in foreign travel inventory are destroyed, after healing if needed. Item destruction is permanent. The button will display Destroy Selected Items before Purchase Max.';body.append(detail);overlay.append(body);document.body.append(overlay);const chosen=new Set();let loaded=false;const selection=document.createElement('div');selection.style.cssText='font:12px system-ui;max-height:240px;overflow:auto;background:#4d0000;padding:9px';selection.textContent='Reading current travel inventory… Select the items to destroy when the list appears.';body.append(selection);const loadSelection=document.createElement('button');loadSelection.type='button';loadSelection.textContent='Retry inventory loading';loadSelection.hidden=true;body.append(loadSelection);loadSelection.onclick=async()=>{loadSelection.disabled=true;loadSelection.hidden=true;loaded=false;chosen.clear();try{const data=await getContext({inventory:true});inventoryInfo=executeAction?.inventorySummary?.()||null;refreshInventory();if(!overlay.isConnected)return;selection.replaceChildren();const items=data.inventoryItems||[];for(const item of items.filter(item=>item.amount>0)){const label=document.createElement('label');label.style.cssText='display:flex;gap:6px;align-items:center;margin:6px';const box=document.createElement('input');box.type='checkbox';box.style.cssText='width:22px;height:22px';box.onchange=()=>{if(box.checked)chosen.add(item);else chosen.delete(item);};label.append(box,document.createTextNode(item.name+' — all carried copies'));selection.append(label);}loaded=true;if(!items.some(item=>item.amount>0))selection.textContent='No inventory items are available to select.';}catch(error){if(overlay.isConnected){selection.textContent=error.message;loadSelection.hidden=false;}}finally{loadSelection.disabled=false;}};const finish=accepted=>{if(accepted&&(!loaded||!chosen.size)){selection.append(document.createTextNode(' Select at least one item before accepting.'));return;}if(accepted)setup.destroyItems=[...chosen].map(item=>({id:item.id,name:item.name}));else setup.destroyItems=[];warningCancel=null;destroySummary.textContent='Selected for destruction: '+(setup.destroyItems?.map(item=>item.name).join(', ')||'No items selected');setup.destroyInventory=accepted;setup.destroyAccepted=accepted;destruction.checked=accepted;saveSetup();overlay.remove();document.removeEventListener('keydown',escape);if(run)disarm('Inventory Destruction setting changed; arm again');destruction.focus();};const escape=event=>{if(event.key==='Escape')finish(false);if(event.key==='Tab'){const controls=[...body.querySelectorAll('button,input')].filter(control=>!control.disabled);if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}}};warningCancel=()=>finish(false);document.addEventListener('keydown',escape);for(const [label,value] of [['Accept',true],['Decline',false]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='font:bold 15px system-ui;padding:9px 18px;margin:6px;color:#111;background:white';button.onclick=()=>finish(value);body.append(button);}body.querySelector('button:last-child').focus();void loadSelection.onclick();};
  refreshInventory=()=>{
   inventoryOverview.replaceChildren();const heading=document.createElement('h4');heading.textContent='Travel inventory and purchase capacity';inventoryOverview.append(heading);
   const totals=document.createElement('p');totals.textContent=inventoryInfo?.verified?'Total capacity: '+inventoryInfo.total+' slots · Used: '+inventoryInfo.occupied+' · Free now: '+inventoryInfo.free:'Total capacity: unavailable. Make sure the full travel inventory is visible, then use Load inventory.';inventoryOverview.append(totals);
   const items=inventoryInfo?.items||[],list=document.createElement('ul');list.style.cssText='padding-left:16.5px;margin:6px 0';
   const normalize=name=>String(name||'').normalize('NFKC').trim().toLowerCase();const heals=selected(medical),hospItems=selected(hospitalization);
   for(const item of items){const notes=[];const healing=heals.some(s=>normalize(s.name)===normalize(item.name)),hospitalizing=hospital.value==='yes'&&hospItems.some(s=>normalize(s.name)===normalize(item.name)),destroying=!!setup.destroyInventory&&!!setup.destroyAccepted&&setup.destroyItems?.some(s=>normalize(s.name)===normalize(item.name));if(healing)notes.push('Heal');if(hospitalizing)notes.push('Hospitalize');if(destroying)notes.push(healing||hospitalizing?'destroy remaining copies':'Destroy');const row=document.createElement('li');row.textContent=item.name+' × '+item.amount+' — '+item.amount+' slot'+(item.amount===1?'':'s')+' ['+(notes.join('; ')||'Keep')+']';list.append(row);}
   if(items.length)inventoryOverview.append(list);else if(inventoryInfo){const empty=document.createElement('p');empty.textContent='No items currently occupy travel inventory slots.';inventoryOverview.append(empty);}
   const explanation=document.createElement('p');explanation.textContent='Purchase Max buys as many monitored items as confirmed free space, available funds and stock permit. Selected items still occupy space until their use or destruction is confirmed; each freed slot is counted once.';inventoryOverview.append(explanation);
  };refreshInventory();
  const armFeedback=document.createElement('p');armFeedback.id='tuim-arm-feedback';armFeedback.setAttribute('role','alert');armFeedback.setAttribute('aria-live','assertive');armFeedback.hidden=true;armFeedback.style.cssText='padding:12px;border:2px solid #ec8585;background:#5c2020;color:white;white-space:pre-wrap';section.append(armFeedback);
  const armButton=add('Arm Snatch and Run',async()=>{armFeedback.hidden=true;armButton.disabled=true;try{await arm({watchKey:watch.value,hospital:hospital.value==='yes',medicals:selected(medical),medical:selected(medical)[0]||null,planHospitalize:hospital.value==='yes',hospitalizations:selected(hospitalization),hospitalization:selected(hospitalization)[0]||null,destroyItems:setup.destroyItems||[],destroyInventory:destruction.checked,destroyAccepted:!!setup.destroyAccepted,hospitalWarningSeconds:setup.hospitalWarningSeconds??60,hospitalAlarm:!!setup.hospitalAlarm,hospitalVisual:setup.hospitalVisual!==false,hospitalAlarmVolume:setup.hospitalAlarmVolume??60,hospitalAlarmSound:setup.hospitalAlarmSound||'siren'});}catch(error){notice(error.message);armFeedback.textContent=error.message;armFeedback.hidden=false;armFeedback.scrollIntoView?.({block:'nearest'});}finally{armButton.disabled=false;}});
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
   action=document.createElement('button');action.id='tu-snatch-run';action.type='button';action.style.cssText='position:fixed;bottom:12px;left:12px;max-width:calc(100vw - 24px);z-index:2147483643;color:#fff;border:2px solid;border-radius:8px;padding:9px 13.5px;font:bold 11.25px system-ui;opacity:1;cursor:grab;touch-action:none;user-select:none';
   action.setAttribute('aria-label','Snatch and Run action; drag to reposition');
   // Keep TU taps inside TU: Torn treats an outside tap as dismissal of its native confirmation.
   for(const type of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','dblclick'])action.addEventListener(type,event=>event.stopPropagation());
   action.onclick=event=>{event?.stopPropagation?.();if(now()<suppressClickUntil){event?.preventDefault?.();event?.stopPropagation?.();emit('click-blocked',{reason:'drag-release'});return false;}if(action.getAttribute('aria-disabled')==='true'){emit('click-blocked',{reason:'not-ready'});return false;}return act(event);};
   action.addEventListener('pointerdown',event=>{if(event.button!==0&&event.pointerType==='mouse')return;const rect=action.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};action.setPointerCapture?.(event.pointerId);});
   action.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const x=event.clientX-drag.x,y=event.clientY-drag.y;if(Math.hypot(x,y)>6)drag.moved=true;if(drag.moved){event.preventDefault();clampPosition(drag.left+x,drag.top+y);}});
   action.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;if(drag.moved){suppressClickUntil=now()+400;try{window.localStorage.setItem(positionKey,JSON.stringify({x:parseFloat(action.style.left),y:parseFloat(action.style.top)}));}catch{}emit('button-moved',{x:parseFloat(action.style.left),y:parseFloat(action.style.top)});}drag=null;});
   action.addEventListener('pointercancel',()=>{drag=null;suppressClickUntil=now()+400;});
   const warningStyle=document.createElement('style');warningStyle.textContent='@keyframes tu-hospital-warning{0%,49%{filter:brightness(1)}50%,100%{filter:brightness(.4)}}';document.head.append(warningStyle);warningStyle.id='tu-hospital-warning-style';
   extraHosp=document.createElement('button');extraHosp.id='tu-snatch-extra-hosp';extraHosp.type='button';extraHosp.style.cssText='position:fixed;z-index:2147483643;white-space:pre-line;background:#a82525;color:white;border:2px solid #ec8585;border-radius:8px;padding:7.5px 12px;font:bold 11.25px system-ui;max-width:calc(100vw - 24px)';extraHosp.onclick=event=>{event.stopPropagation();return extendHospital(event);};for(const type of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend'])extraHosp.addEventListener(type,event=>event.stopPropagation());document.body.append(extraHosp);
   document.body.append(action);hud=action;try{const position=JSON.parse(window.localStorage.getItem(positionKey)||'null');if(Number.isFinite(position?.x)&&Number.isFinite(position?.y))clampPosition(position.x,position.y);}catch{}window.addEventListener('resize',resizeButton);
  }refresh();if(run?.stage==='departure-choice')showDepartureChoice();if(run)scheduleStatus();
 }

 function update(){applyFilter();check();if(hud)hud.hidden=!run||run.stage==='complete';}
 return {start,syncCountdown(){if(active&&run&&!document.hidden)paintCountdown();},stop(){warningCancel?.();active=false;disarm('Tool exited; sequence canceled');restoreRows();hud?.remove();extraHosp?.remove();extraHosp=null;document.getElementById('tu-hospital-warning-style')?.remove();hospitalAudio?.stop?.();hud=null;action=null;drag=null;window.removeEventListener('resize',resizeButton);},mount,arm,act,extendHospital,stock,check,update,disarm,getState:()=>run?{...run}:null,applyFilter,restoreRows};
};


(()=>{
  'use strict';const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'1.10.23';
if(host.__TU_ITEM_MONITOR__)return;window.__TU_ITEM_MONITOR__=true;
const runtimeTasks=[];const every=(fn,delay)=>runtimeTasks.push({fn,delay,timer:null});
let runtimeObserver=null,runtimeAbort=null,scanTimer=null;
const ID='item-monitor',KEY='tu-item-monitor-v1',OLD='tuac-watches';
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
const state={items:load(KEY,[]),cfg:load('tuac-settings',{}),panel:null,menu:null,lastView:sessionStorage.getItem('tu:item-monitor:view:v1')||'menu',context:null,picking:false,selected:load('tuim-selection-v1',null),observer:null,alarmTimers:[],audio:null,muted:false,catalog:null,catalogWindow:null};
const save=()=>localStorage.setItem(KEY,JSON.stringify(state.items.map(({category,name,key,minQty,maxPrice,audibleAlerts,visualAlerts})=>({category,name,key,minQty,maxPrice,audibleAlerts:audibleAlerts!==false,visualAlerts:visualAlerts!==false}))));
const saveCfg=()=>localStorage.setItem('tuac-settings',JSON.stringify(state.cfg));
let stockDiagnostic=null,embeddedDiagnostic=null,diagnosticStatus='Monitoring off';
const diagnosticHost=()=>typeof host.flutter_inappwebview?.callHandler==='function'||typeof host.PDA_httpGet==='function'||/com\.manuito\.tornpda/i.test(navigator.userAgent)?'pda':typeof GM_info!=='undefined'&&GM_info.scriptHandler==='Tampermonkey'?'tampermonkey':'unknown';
const diagnosticBuild=()=>typeof TU_INTEGRATED_BUILD==='string'?TU_INTEGRATED_BUILD:host.__TU_DEV_STARTUP__?.build||'unknown';
function syncDiagnosticControls(){
 const active=embeddedDiagnostic?.isMonitoring()===true,light=document.getElementById('tuim-dev-diagnostic-light');
 if(light){light.style.background=active?'#35c759':'#e04444';light.setAttribute('aria-label',active?'Diagnostic monitoring active':'Diagnostic monitoring inactive');light.title=light.getAttribute('aria-label');}
 for(const [id,disabled] of [['tuim-dev-diagnostic-start',active],['tuim-dev-diagnostic-stop',!active]]){const button=document.getElementById(id);if(button){button.disabled=disabled;button.style.opacity=disabled?'0.45':'1';button.style.filter=disabled?'grayscale(1)':'none';button.style.cursor=disabled?'not-allowed':'pointer';}}
}
function diagnosticNotice(value){diagnosticStatus=String(value);const status=document.getElementById('tuim-dev-diagnostic-status');if(status)status.textContent=diagnosticStatus;syncDiagnosticControls();}
try{if(typeof createTravelDomDiagnostic==='function'&&typeof createAcceptanceSession==='function'){
 const session=createAcceptanceSession({targetBuild:diagnosticBuild(),checklistVersion:'embedded-item-monitor-dev',tests:[],platform:diagnosticHost()});
 if(typeof createStockMonitorDiagnostic==='function')stockDiagnostic=createStockMonitorDiagnostic({window,storageKey:'tu:item-monitor:stock-evidence:v1',scrub:session.scrub,build:diagnosticBuild()});
 embeddedDiagnostic=createTravelDomDiagnostic({document,window,scrub:session.scrub,storageKey:'tu:item-monitor:dev:diagnostics:v1',deferPersistence:true,prioritizeFunctions:true,getMeta:()=>({host:diagnosticHost(),installedBuild:diagnosticBuild()}),onChange:diagnosticNotice});
}}catch{diagnosticNotice('Diagnostic recorder unavailable; gameplay remains available.');}
function diagnosticStart(){try{quickItemTest.captureStart();embeddedDiagnostic?.start('Workflow (continuous)');stockDiagnostic?.start();recordStockScan('diagnostic-start');}catch{diagnosticNotice('Diagnostic recording could not start; gameplay remains available.');}}
function diagnosticStop(){try{quickItemTest.captureStop();embeddedDiagnostic?.stop();stockDiagnostic?.stop();}catch{diagnosticNotice('Diagnostic recording stopped.');}}
function diagnosticExport(){try{
 if(!embeddedDiagnostic)throw Error('Recorder unavailable');
 const scrub=createAcceptanceSession({targetBuild:diagnosticBuild(),checklistVersion:'embedded-item-monitor-dev',tests:[],platform:diagnosticHost()}).scrub;
 const environment=typeof detectTestEnvironment==='function'?detectTestEnvironment({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,uaData:navigator.userAgentData,gmInfo:typeof GM_info==='undefined'?null:GM_info,pdaBridge:diagnosticHost()==='pda'}):{};
 const clean=value=>typeof value==='string'?scrub(value):Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clean(item)])):value;
 const rawTravelReport=embeddedDiagnostic.report();const travelReport={...rawTravelReport,captures:rawTravelReport.captures.filter(entry=>entry.kind==='function-event'),privacy:{broadDomCapturesOmitted:rawTravelReport.captures.filter(entry=>entry.kind!=='function-event').length}},stockReport=stockDiagnostic?.report()||null,evidenceBuilds={};for(const entry of [...travelReport.captures,...travelReport.pageDom,...(stockReport?.samples||[]),...(stockReport?.events||[])]){const build=String(entry.installedBuild||entry.build||'unknown');const label=/^\d+(?:\.\d+){3}-dev$/.test(build)?build:'unknown';evidenceBuilds[label]=(evidenceBuilds[label]||0)+1;}
 const report={schemaVersion:2,source:'embedded-item-monitor-dev',toolVersion:TU_MODULE_VERSION,targetBuild:diagnosticBuild(),installedBuild:diagnosticBuild(),exportedAt:new Date().toISOString(),detectedHost:diagnosticHost(),detectedEnvironment:clean(environment),userAgent:scrub(navigator.userAgent),viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:window.devicePixelRatio},productionAuthorized:false,quickItemExperiment:{...quickItemTest.report(),snatchDirectItems:nativeActions.report()},uiEvents:(host.__TU_UI_DIAGNOSTICS__||[]).map(entry=>({...entry})),evidenceBuilds,stockMonitor:stockReport,landingAlarm:landingAlarm?.snapshot()||null,travelDom:travelReport};
 const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tu-item-monitor-dev-'+diagnosticBuild()+'-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}catch{diagnosticNotice('Report generation failed. Retained recordings remain in this tab.');}}
function renderEmbeddedDiagnostics(parent){
 if(!embeddedDiagnostic)return;const section=E('section',parent);section.id='tuim-dev-diagnostics';E('h3',section,'Temporary DEV Diagnostics');E('p',section,'Recording starts when Open Item Monitor is selected and continues while minimized, on Back, and across navigation in this tab. Stop it below or exit the tool. Reports include system information, action timing, stock observations, scan/alarm decisions, confirmations, inventory calculations and bounded native page DOM. Credentials, chat and arbitrary input values are excluded.');
 const indicator=E('span',section);indicator.id='tuim-dev-diagnostic-light';indicator.setAttribute('role','img');indicator.style.cssText='display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #aaa;vertical-align:middle;margin-right:6px';const status=E('p',section,diagnosticStatus);status.style.display='inline';status.id='tuim-dev-diagnostic-status';status.setAttribute('role','status');const start=B(section,'Diagnostic Monitor Activation',diagnosticStart);start.id='tuim-dev-diagnostic-start';const stop=B(section,'Monitoring Deactivation',diagnosticStop);stop.id='tuim-dev-diagnostic-stop';B(section,'Report Generation',diagnosticExport);const clear=B(section,'Clear Logs',diagnosticClear);clear.id='tuim-dev-diagnostic-clear';
 const review=B(section,'Review Unresolved Item Attempt',event=>{if(!event.isTrusted||!quickItemTest.hasPendingAttempt())return;if(!window.confirm('Only continue after checking Torn inventory and confirming the previous item action has finished. Clear the unresolved attempt lock?'))return;if(quickItemTest.review(event))diagnosticNotice('Attempt reviewed. Any next item action requires a new click.');});review.id='tuim-dev-review-attempt';syncDiagnosticControls();
}
function openItemMonitor(){
 try{state.lastView='monitor';sessionStorage.setItem('tu:item-monitor:view:v1','monitor');tuModuleOpen('tuim-panel');host.__TU_UI_TRACE__?.('monitor-open','visible');
 diagnosticStart();
 }catch(error){host.__TU_UI_TRACE__?.('monitor-open-error',error?.name||'Error');diagnosticNotice('Item Monitor could not open. Export diagnostics and try again.');}
}
function diagnosticClear(){quickItemTest.clearLogs();const active=embeddedDiagnostic?.isMonitoring()===true;diagnosticStop();embeddedDiagnostic?.clear();stockDiagnostic?.clear();if(host.__TU_UI_DIAGNOSTICS__)host.__TU_UI_DIAGNOSTICS__.length=0;try{sessionStorage.removeItem('tu:diagnostics:ui:v1');}catch{}if(active)diagnosticStart();diagnosticNotice(active?'Monitoring ON · previous logs cleared.':'Logs cleared. Monitoring OFF.');}
const quickItemTest=createDirectQuickItems({window,document,fetchImpl:fetch,capturePage:quickItemCapturePage,getProfile:()=>host.TornUtilities.requestTravelInfo('profile'),isAuthorized:()=>host.TornUtilities?.isAuthorized?.()===true,build:TU_INTEGRATED_BUILD});
function renderMenu(){
 const p=state.menu;if(!p)return;p.replaceChildren();const h=E('div',p);h.className='tuim-header';draggable(p,h);E('strong',h,'Travel Assistant and Item Monitor');tuModuleHeader(p,h,'tu-pda-panel');E('h3',p,'Travel Assistant');E('p',p,'Travel planning, foreign inventory reporting, and restock predictions');B(p,'Open Travel Assistant',travelUI);const divider=E('hr',p);divider.style.cssText='border:0;border-top:2px solid #cba953;margin:12px 0';E('h3',p,'Item Monitor');E('p',p,'Item monitoring, alarms, Snatch and Run, and temporary DEV diagnostics');B(p,'Open Item Monitor',openItemMonitor);
}
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const text=e=>e?.innerText||e?.textContent||'';
const money=v=>{const m=String(v||'').match(/\$\s*([\d,]+(?:\.\d+)?)/);return m?Number(m[1].replaceAll(',','')):NaN};
const pageItem=()=>{
 const params=new URLSearchParams(location.search);
 const id=params.get('itemID')||params.get('itemId')||params.get('item_id')||params.get('ID');
 const visible=e=>e&&e.getClientRects().length>0;
 const exact=e=>text(e).trim().replace(/\s+/g,' ');
 const invalid=/^(item market|owner|cost|qty|buy|search for an item|text based rpg\s*-\s*torn)$/i;
 let name='';
 // The active item name is the bar immediately above the Owner / Cost / Qty / Buy listing headers.
 const owner=[...document.querySelectorAll('th,div,span')].find(e=>visible(e)&&exact(e)==='Owner'&&e.children.length===0);
 if(owner){
   let table=owner.parentElement;
   for(let i=0;i<5&&table;i++,table=table.parentElement){
     const t=exact(table);
     if(/\bCost\b/.test(t)&&/\bQty\b/.test(t)){
       const prev=table.previousElementSibling;
       const candidates=[prev,table.parentElement?.previousElementSibling,table.parentElement?.parentElement?.previousElementSibling];
       for(const el of candidates){
         if(!visible(el))continue;
         const leaves=[...el.querySelectorAll('div,span,strong,h2,h3,h4')].filter(x=>visible(x)&&x.children.length===0).map(exact);
         const val=leaves.find(x=>x.length>0&&x.length<90&&!invalid.test(x)&&!x.includes('$'))||exact(el);
         if(val&&val.length<90&&!invalid.test(val)&&!val.includes('$')){name=val;break}
       }
       if(name)break;
     }
   }
 }
 if(!name){
   const el=[...document.querySelectorAll('[class*=itemName],[class*=ItemName],[class*=itemTitle],[class*=ItemTitle],h3,h4')].find(e=>visible(e)&&exact(e).length>0&&exact(e).length<90&&!invalid.test(exact(e))&&e.closest('[class*=market],[class*=Market],main'));
   if(el)name=exact(el);
 }
 return name?{key:'name:'+norm(name),name}:null;
};
// Item Market tile fallback: identify the item explicitly clicked by its visible label.
const marketTileItem=target=>{
 const visible=e=>!!e&&e.getClientRects().length>0;
 const clean=x=>String(x||'').trim().replace(/\\s+/g,' ');
 const invalid=/^(item market|drugs|most popular|search for an item|buy|qty|owner|cost|equipment|medical)$/i;
 let node=target;
 for(let depth=0;node&&depth<6;node=node.parentElement,depth++){
   if(!visible(node)||node.closest('#tuim-tip,#tuim-panel,#tu-pda-panel'))return null;
   const raw=(node.innerText||'').trim();
   if(raw.length>180||!node.querySelector('img'))continue;
   const lines=raw.split('\\n').map(clean).filter(Boolean);
   const name=lines.find(x=>x.length>=2&&x.length<=65&&!invalid.test(x)&&!/^\\$|^[\\d,() ]+$/.test(x)&&!/available|listing|seller/i.test(x));
   if(name&&lines.some(x=>/\\$[\\d,]+/.test(x)))return {name,key:'name:'+norm(name)};
 }
 return null;
};
const listingSelector='[data-listing-id],[data-seller-id],tr,[role=row],[class*=sellerRow],[class*=SellerRow],[class*=listingRow],[class*=ListingRow],[class*=marketRow],[class*=MarketRow]';
const listings=()=>[...document.querySelectorAll(listingSelector)].filter(e=>!e.closest('#tuim-panel,#tu-pda-panel')&&Number.isFinite(listingPrice(e))&&(!e.parentElement?.closest(listingSelector)));
const listingPrice=row=>{const unit=row.querySelector('[data-unit-price],[class*=unitPrice],[class*=UnitPrice],[class*=pricePer],[class*=PricePer]');if(unit){const n=money(unit.getAttribute('data-unit-price')||text(unit));if(Number.isFinite(n))return n}for(const el of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const n=money(el.getAttribute('data-price')||text(el));if(Number.isFinite(n))return n}return money(text(row))};
const candidates='[data-item-id],[data-itemname],[data-item-name],tr,[role=row],li,[class*=itemWrap],[class*=ItemWrap],[class*=itemRow],[class*=ItemRow],[class*=itemCard],[class*=ItemCard],[class*=row],[class*=Row],[class*=card],[class*=Card]';
const category=()=>{const url=(location.pathname+location.search+location.hash).toLowerCase();if(/itemmarket|item-market|item_market|market.php|item.php/.test(url))return 'Item Market';const abroad=/travel|abroad|foreign|country|cayman|japan|mexico|canada|hawaii|switzerland|china|argentina|unitedkingdom|southafrica|uae/i.test(url)||document.querySelector('[class*=foreignStock],[class*=ForeignStock],#travel-root [class*=stockTableWrapper]');const stockTable=[...document.querySelectorAll('table, [role=table]')].some(t=>/\bStock\b/i.test(text(t).slice(0,300))&&/\bCost\b/i.test(text(t).slice(0,300))&&/\bBuy\b/i.test(text(t).slice(0,300)));if(abroad||stockTable)return 'Foreign';if(/shop|store|bazaar|city/.test(url))return 'Stores';return 'Other'};
const nameOf=row=>{const e=row.querySelector('[data-itemname],[data-item-name],[class*=itemName],[class*=ItemName],[class*=name],[class*=Name]');return (e?.getAttribute('data-itemname')||e?.getAttribute('data-item-name')||text(e)||text(row)).split('\n').map(x=>x.trim()).find(Boolean)?.slice(0,90)||''};
const idOf=row=>{
 const data=row.getAttribute('data-item-id')||row.getAttribute('data-itemid')||row.querySelector('[data-item-id]')?.getAttribute('data-item-id');if(/^\d+$/.test(data||''))return data;
 // Foreign React rows identify items through their native form/Buy panel,
 // even when no data-item-id exists on the item selected by the user.
 const form=row.matches('form')?row:row.querySelector('form[id^="item-"]');const formId=form?.id.match(/^item-(\d+)-form$/)?.[1];if(formId)return formId;
 for(const el of [row,...row.querySelectorAll('[aria-controls^="item-"]')]){const id=el.getAttribute('aria-controls')?.match(/^item-(\d+)-buyPanel$/)?.[1];if(id)return id;}
 return '';
};
const keyOf=row=>idOf(row)?'id:'+idOf(row):'name:'+norm(nameOf(row));
const foreignRow=w=>foreignShopTables().flatMap(s=>s.rows).find(row=>rowMatches(row,w))||null;
const foreignStock=row=>{
 const shop=foreignShopTables().find(s=>s.rows.includes(row));
 const cell=shop?.kind==='torn-abroad'?row.querySelector('[class*="tabletColC"]'):shop?[...row.children][shop.headers.indexOf('stock')]:null;
 const raw=cell?text(cell).replace(/stock/ig,'').replace(/,/g,'').trim():'';
 const value=raw.match(/\b(\d+)\b/);return value?Number(value[1]):quantity(row);
};
const quantity=row=>{for(const e of row.querySelectorAll('[data-stock],[data-quantity],[class*=stock],[class*=Stock],[class*=quantity],[class*=available]')){const raw=e.getAttribute('data-stock')||e.getAttribute('data-quantity')||text(e);const m=raw.match(/(?:stock|quantity|available|remaining|in stock)?\s*:?\s*([\d,]+)/i);if(m)return Number(m[1].replaceAll(',',''))}const m=text(row).match(/(?:stock|quantity|available|remaining)\s*:?\s*([\d,]+)/i);return m?Number(m[1].replaceAll(',','')):NaN};
const price=row=>{for(const e of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const raw=e.getAttribute('data-price')||text(e);const m=raw.match(/\$\s*([\d,]+(?:\.\d+)?)/)||raw.match(/^\s*([\d,]+(?:\.\d+)?)\s*$/);if(m)return Number(m[1].replaceAll(',',''))}const m=text(row).match(/\$\s*([\d,]+(?:\.\d+)?)/);return m?Number(m[1].replaceAll(',','')):NaN};
const E=(tag,parent,t)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;parent?.append(e);return e};
const B=(p,t,f)=>{const b=E('button',p,t);b.type='button';b.onclick=event=>{event.preventDefault();event.stopPropagation();return f(event);};return b};
const hospitalClock=typeof createHospitalClock==='function'?createHospitalClock({document}):null;
const proofIds=new WeakMap();let nextProof=0,snatchContext=null;
const liveCountry=()=>{
 if(!foreignShopTables().length)return null;
 const heading=norm(document.querySelector('#travel-root h4')?.textContent||'');
 const native=Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>norm(alias)===heading));if(native)return native;
 const page=[document.title,document.querySelector('main')?.textContent||'',...document.querySelectorAll('h1,h2,[data-country]')].map(e=>typeof e==='string'?e:e.getAttribute('data-country')||text(e)).join(' ').toLowerCase();
 return Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>page.includes(alias)))||null;
};
// The visible flight route survives refresh even when the cached API context does not.
function nativeFlightRoute(){
 const progress=document.querySelector('#travel-root [aria-label="Flight progress"]');if(!progress)return null;
 const route=(progress.textContent||'').replace(/\s+/g,' ').trim();
 const returning=/^.+?\s+to\s+Torn\b/i.test(route),outgoing=/^Torn\s+to\s+/i.test(route);
 if(!returning&&!outgoing)return null;
 const country=Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>new RegExp('^'+(outgoing?'Torn\\s+to\\s+':'')+alias+'\\b','i').test(route)))||null;
 return {country,returning,traveling:true,status:'Traveling',source:'native-flight-route'};
}
const nativeRow=control=>control?.closest('[data-item-id],[data-itemid],tr,[role=row],li,[class*=itemRow],[class*=row]');
const rowMatches=(row,w)=>{
 const id=idOf(row);
 if(w.key.startsWith('id:')&&id)return w.key==='id:'+id;
 const nativeName=row.querySelector('[class*=tabletColB]')||row.querySelector('[data-item-name],[class*=itemName],[class*=ItemName]');const name=nativeName?text(nativeName).trim():nameOf(row);return !!name&&norm(name)===norm(w.name);
};
const filterContainer=row=>{
 const wrapper=row.closest('[class*=stockTableWrapper]'),li=row.closest('li');
 if(wrapper&&li&&wrapper.contains(li)){
  // Only collapse an item container; never hide a shared list or shop wrapper.
  const nested=[...li.querySelectorAll('[class*=row]')].filter(e=>e.querySelector('[class*=tabletColB]')&&e.querySelector('[class*=tabletColC]'));
  if(nested.length===1&&nested[0]===row||li===row)return li;
 }
 return row;
};
const filterRows=()=>{
 const foreign=foreignShopTables().flatMap(shop=>shop.rows);if(foreign.length)return [...new Set(foreign)];
 // Only explicitly item-identified shop/market containers are eligible elsewhere.
 const identified=[...document.querySelectorAll('[data-item-id],[data-itemid]')].filter(e=>!e.closest('#tuim-panel,#tuim-catalog,#tu-pda-panel,#tu-snatch-run')&&e.querySelector('button,input,a')&&e.querySelector('[data-price],[class*=price],[class*=Price]'));
 return identified.filter(e=>!e.parentElement?.closest('[data-item-id],[data-itemid]'));
};
function snatchSnapshot(watch=null){
 const run=enhancements?.getState(),w=watch||state.items.find(e=>e.key===run?.watchKey);
 const row=w?filterRows().find(row=>rowMatches(row,w)):null;
 const quantityInput=row?.querySelector('input[type=number],input[name*=amount],input[name*=quantity]');
 const declaredMax=Number(quantityInput?.getAttribute('max'));
 const ownerId=host.TornUtilities?.getPlayer?.()?.id;
 const flightRoute=nativeFlightRoute();
 const nativeStatus=document.querySelector('[data-user-status]')?.getAttribute('data-user-status');
 const nativeState=nativeActions?.enabled()?nativeActions.inspect(run):null;
 const status=flightRoute?'Traveling':nativeState?.traveling?'Traveling':nativeState?.released?'Abroad':nativeState?.hospitalized?'Hospital':document.querySelector('a[aria-label^="Hospital:"]')?'Hospital':liveCountry()?'Abroad':['Hospital','Abroad','Traveling'].includes(nativeStatus)?nativeStatus:snatchContext?.status;
 let purchaseProof=null,purchaseItemKey=null;
 for(const el of document.querySelectorAll('[role=alert],[role=status],.success,[class*=success]')){
  if(el.closest('#tuim-panel,#tu-snatch-run,#tu-pda-panel')||!el.getClientRects().length)continue;
  const value=text(el);if(w&&/you (?:have )?(?:bought|purchased)/i.test(value)&&norm(value).includes(norm(w.name))){if(!proofIds.has(el))proofIds.set(el,++nextProof);purchaseProof=proofIds.get(el)+':'+value;purchaseItemKey=w.key;break;}
 }
 if(nativeState?.purchaseProof){purchaseProof=nativeState.purchaseProof;purchaseItemKey=nativeState.purchaseItemKey;}
 const hospitalUntil=nativeState?.released?null:nativeState?.hospitalUntil||hospitalClock?.read()||snatchContext?.hospitalUntil||null;
 return {ownerId,directItemConsumed:!!nativeState?.directItemConsumed,directItemUncertain:!!nativeState?.directItemUncertain,hospitalUntil,hospitalClock:hospitalClock?.report(),country:flightRoute?flightRoute.country:liveCountry()||snatchContext?.country||null,status,hospitalized:nativeState?.hospitalized===true?true:nativeState?.released===true?false:status==='Hospital'?true:status==='Abroad'?false:null,traveling:!!flightRoute||status==='Traveling',returning:flightRoute?flightRoute.returning:!!nativeState?.returning||status==='Traveling'&&/\b(?:to torn|returning to torn|back to torn)\b/i.test(snatchContext?.description||''),stockVisible:!!row,quantity:row?foreignStock(row):foreignShopTables().length?0:NaN,purchaseProof,purchaseItemKey,quantityInput,maxControl:row?[...row.querySelectorAll('button,a,[role=button]')].find(e=>/^(max|maximum)$/i.test(text(e).trim())):null,maxQuantity:declaredMax,maxVerified:Number.isSafeInteger(declaredMax)&&declaredMax>0,
 buyMatches:(control,key)=>!!row&&row.contains(control)&&w?.key===key&&/^(?:buy|purchase)(?:\s|$)/i.test(control.getAttribute('aria-label')||text(control)||control.value||''),
 medicalMatches:(control,medical)=>{const item=nativeRow(control);const id=item?.getAttribute('data-item-id')||item?.getAttribute('data-itemid');const uid=item?.getAttribute('data-item-uid');return !!item&&String(id)===String(medical.id)&&(!medical.uid||String(uid)===String(medical.uid))&&/^(?:use|take)(?:\s|$)/i.test(control.getAttribute('aria-label')||text(control)||control.value||'');},
 returnMatches:control=>/^(?:return|travel|fly)(?:\s+back)?\s+to\s+torn\b/i.test(control.getAttribute('aria-label')||text(control)||control.value||'')};
}
async function getSnatchContext({inventory=false}={}){
 const api=host.TornUtilities;if(typeof api?.requestTravelInfo!=='function')throw Error('Update the integrated TU Manager to use Snatch and Run');
 if(inventory){const carried=nativeActions?.listInventory?.();if(carried!==null&&carried!==undefined){const grouped=new Map();for(const item of carried){const key=norm(item.name);const existing=grouped.get(key);if(existing)existing.amount+=Number(item.amount)||1;else grouped.set(key,{...item,amount:Number(item.amount)||1,source:'travel-dom'});}const items=[...grouped.values()],choices=new Map(items.map(item=>[norm(item.name),item]));for(const item of nativeActions?.listAgencyItems?.()||[])if(!choices.has(norm(item.name)))choices.set(norm(item.name),item);const selectionItems=[...choices.values()];return {...snatchContext,ownerId:api.getPlayer()?.id,country:liveCountry(),inventorySource:'travel-dom',inventoryItems:items,medicalItems:selectionItems,selectionItems,agencyPage:[...document.querySelectorAll('#travel-root h1,#travel-root h2,#travel-root h3,#travel-root h4')].some(e=>/^travel agency$/i.test(e.textContent.trim()))};}}
 const data=await api.requestTravelInfo('profile'),profile=data.profile||data;
 let country=liveCountry(),status=profile.status?.state||'',description=profile.status?.description||'';
 const route=document.querySelector('#travel-root [aria-label="Flight progress"]')?.textContent||'';
 const traveling=status==='Traveling',returning=traveling&&/\b(?:to|back to|returning to) torn\b/i.test(description+' '+route);
 if(traveling){country=Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>norm(description).includes(norm(alias))||new RegExp('(?:to|→)\\s*'+alias+'\\b','i').test(route)))||null;}
 if(!country&&!returning){try{const trip=await api.requestTravelInfo('travel');const destination=trip.travel?.destination;country=Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>norm(alias)===norm(destination)));}catch{}}
 snatchContext={ownerId:api.getPlayer()?.id,country,status,traveling,returning,description,hospitalUntil:hospitalClock?.read(profile.status)||null,hospitalClock:hospitalClock?.report(),checkedAt:Date.now()};
 if(inventory){const d=await api.requestTravelInfo('inventory');const raw=Array.isArray(d.inventory)?d.inventory:d.inventory?.items||[];snatchContext.medicalItems=raw;snatchContext.inventoryItems=raw;snatchContext.inventorySource='medical-api';}
 nativeActions.observeProfile?.(profile);enhancements?.check();return snatchContext;
}
const nativeBaseActions=typeof createNativeTravelActions==='function'?createNativeTravelActions({document,window,enabled:()=>typeof GM_info!=='undefined'&&GM_info.scriptHandler==='Tampermonkey'||typeof host.flutter_inappwebview?.callHandler==='function'||typeof host.PDA_httpGet==='function'||typeof host.PDA_httpPost==='function'||/com\.manuito\.tornpda/i.test(navigator.userAgent)}):null;
const nativeActions=createSnatchDirectItems({native:createSteppedNativeActions({native:nativeBaseActions}),getPilot:()=>quickItemTest,getProfile:()=>host.TornUtilities.requestTravelInfo('profile'),window});
// Hospital alarm owns its audio nodes, so stock alarms cannot cancel it.
function alarmMuteButton(kind,active){
 const id='tuim-mute-'+kind;let button=document.getElementById(id);if(!active){button?.remove();return;}if(button)return;button=document.createElement('button');button.id=id;button.type='button';button.textContent='Mute '+(kind==='inventory'?'Inventory':'Hospital')+' Alarm';button.style.cssText='position:fixed;right:12px;bottom:'+(kind==='inventory'?80:132)+'px;z-index:2147483645;background:#d6b65c;color:#111;border:2px solid white;border-radius:8px;padding:9px;font:bold 11.25px system-ui;cursor:pointer';button.onclick=event=>{event.stopPropagation();(kind==='inventory'?inventoryAudio:hospitalAudio).stop();if(kind==='inventory')stockEvent('inventory-alarm-muted',state.items.find(w=>w.key===state.alarmItemKey),'user-muted');};document.body.append(button);
}
const makeAudio=(kind,getDuration)=>typeof createAlarmAudio==='function'?createAlarmAudio({window,getVolume:()=>state.cfg.alarmVolume??60,getDuration,onActive:active=>{if(kind!=='landing')alarmMuteButton(kind,active);}}):{unlock(){},stop(){},play(){},status:()=>({})};
const inventoryAudio=makeAudio('inventory',()=>({seconds:state.cfg.alarmDuration??3,untilMuted:!!state.cfg.alarmUntilMuted}));
const hospitalAudio=makeAudio('hospital',()=>({seconds:state.cfg.snatchSetup?.hospitalAlarmDuration??3,untilMuted:!!state.cfg.snatchSetup?.hospitalAlarmUntilMuted}));
const landingAudio=makeAudio('landing',()=>({seconds:state.cfg.landingAlarm?.duration??3,untilMuted:!!state.cfg.landingAlarm?.untilMuted}));
const landingAlarm=typeof createLandingAlarm==='function'?createLandingAlarm({document,window,getFlight:()=>{const route=nativeFlightRoute(),el=document.querySelector('#travel-root [aria-label="Flight progress"]');if(!route||!el)return null;const timerText=el.querySelector('time')?.textContent?.trim()||el.textContent.match(/\b\d{1,3}:[0-5]\d:[0-5]\d\b/)?.[0]||'';return {...route,route:(el.textContent||'').split(/Remaining Flight Time/i)[0].replace(/\s+/g,' ').trim(),timerText};},getSettings:()=>state.cfg.landingAlarm||{},audio:landingAudio,readSaved:()=>loadLandingNotification(),save:value=>{try{sessionStorage.setItem('tu:landing-notification:v1',JSON.stringify(value));}catch{}},onEvent:(event,fields)=>{document.dispatchEvent(new CustomEvent('tu-snatch-run-diagnostic',{detail:JSON.stringify({event,...fields})}));}}):null;
function loadLandingNotification(){try{return JSON.parse(sessionStorage.getItem('tu:landing-notification:v1')||'null')}catch{return null}}
const enhancements=typeof createTravelEnhancements==='function'?createTravelEnhancements({document,window,hospitalAudio,getHospitalCountdown:()=>hospitalClock?.displayRemaining?.()??null,getDestinationETA:()=>landingAlarm?.snapshot(),executeAction:nativeActions,getItems:()=>state.items,getSetup:()=>state.cfg.snatchSetup||{},screenAlertEnabled:watch=>!!state.cfg.screenAlert&&!!watch&&watch.visualAlerts!==false,storeSetup:value=>{Object.assign(state.cfg.snatchSetup||(state.cfg.snatchSetup={}),value);saveCfg();},getContext:getSnatchContext,getSnapshot:snatchSnapshot,getRows:filterRows,getFilterContainer:filterContainer,matchRow:rowMatches,filterEnabled:()=>!!state.cfg.monitoredOnly,onArmed:()=>{landingAudio.unlock();host.TUWindowNavigation?.minimize?.('tuim-panel');if(state.panel)state.panel.hidden=true;state.catalogWindow?.remove();state.catalogWindow=null;},onNotice:message=>{const el=document.getElementById('tuim-snatch-notice');if(el)el.textContent=message;},restoreRun:(()=>{try{return JSON.parse(sessionStorage.getItem('tu:snatch-run:v1')||'null')}catch{return null}})(),storeRun:value=>{if(value)sessionStorage.setItem('tu:snatch-run:v1',JSON.stringify(value));else sessionStorage.removeItem('tu:snatch-run:v1');}}):null;
const nativeClockSync=typeof createNativeClockSync==='function'?createNativeClockSync({document,window,sync:()=>{landingAlarm?.tick();enhancements?.syncCountdown();}}):null;
function renderMonitoredFilter(parent){
 const label=E('label',parent);label.className='tuim-monitored-toggle';const check=E('input',label);check.type='checkbox';check.id='tuim-monitored-only';check.checked=!!state.cfg.monitoredOnly;label.append(document.createTextNode('Show monitored items only'));check.onchange=()=>{state.cfg.monitoredOnly=check.checked;saveCfg();enhancements?.applyFilter();};
}
function renderEnhancements(parent,alarmParent){

 const edgeLabel=E('label',parent);edgeLabel.className='tuim-monitored-toggle';const edge=E('input',edgeLabel);edge.type='checkbox';edge.id='tuim-screen-color-alert';edge.checked=!!state.cfg.screenAlert;edge.style.cssText='width:18px;height:18px;min-height:18px;flex:none';edgeLabel.append(document.createTextNode('Snatch and Run screen color alert'));edge.onchange=()=>{state.cfg.screenAlert=edge.checked;saveCfg();enhancements?.update();};
 E('style',parent,'.tu-monitor-filter-hidden{display:none!important}#tuim-panel label.tuim-monitored-toggle{display:flex;align-items:center;gap:6px;cursor:pointer}#tuim-panel input#tuim-monitored-only{display:inline-block;flex:0 0 18px;width:18px;height:18px;min-height:18px;padding:0;margin:0;accent-color:#d6b65c}');
 const notice=E('p',parent,'Snatch and Run is off until explicitly armed.');notice.id='tuim-snatch-notice';enhancements?.mount(parent,alarmParent);
}
function style(){if(document.getElementById('tuim-style'))return;const e=E('style',document.head||document.documentElement);e.id='tuim-style';e.textContent='#tuim-panel{position:fixed;z-index:2147483642;top:10vh;left:4vw;width:min(92vw,440px);min-width:220px;min-height:160px;max-width:calc(100vw - 12px);height:min(62dvh,540px);max-height:calc(100dvh - 160px)!important;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;resize:both;box-sizing:border-box;overflow-wrap:anywhere;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:9px;font:11px/1.45 system-ui;display:block}#tuim-panel[hidden]{display:none!important}#tuim-panel *{box-sizing:border-box}#tuim-panel button{max-width:100%;white-space:normal;margin:0;padding:6px 9px;background:#d6b65c;color:#111;border:0;border-radius:5px;line-height:1.3;min-height:36px}#tuim-panel input[type=range]{touch-action:none!important;accent-color:#d6b65c;user-select:none}#tuim-panel input,#tuim-panel select{display:block;width:100%;box-sizing:border-box;padding:6px;margin:3px 0 9px;background:#283239;color:white;min-height:40px}#tuim-panel label{display:block;margin:9px 0 3px;line-height:1.4}#tuim-panel .tuim-header{display:flex;align-items:center;gap:6px;position:sticky;top:0;background:#11191d;z-index:10;padding:9px;margin:0 0 9px;touch-action:none;cursor:move;min-height:76px;border-bottom:1px solid #806a3e;isolation:isolate}#tuim-panel .tuim-header strong{flex:1;min-width:0;font-size:13.5px;line-height:1.3;overflow-wrap:anywhere}#tuim-panel .tuim-header [data-tu-brand-emblem]{align-self:center;flex:0 0 44px!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important}#tuim-panel .tuim-header button{flex:0 0 38px;padding:5.25px}#tuim-panel p{display:block;margin:9px 0!important;line-height:1.5!important;min-height:0!important}#tuim-panel h3{display:block;font-size:14.25px;line-height:1.35!important;margin:16.5px 0 9px!important;padding:0!important;clear:both}#tuim-panel .tuim-entry{display:block;border:1px solid #3ba35b;border-radius:6px;padding:9px;margin:7.5px 0 12px;line-height:1.5}#tuim-panel .tuim-entry strong,#tuim-panel .tuim-entry small{display:block;margin:3px 0;line-height:1.5}#tuim-panel .tuim-entry button{display:block;margin-top:7.5px}#tuim-panel div,#tuim-panel p,#tuim-panel small{overflow-wrap:anywhere}#tuim-panel>button{display:block;margin:9px 0}#tuim-panel #tuim-status{margin:12px 0 15px!important}.tuim-watch,.tuim-wait{outline:3px solid #d83030!important;outline-offset:-2px!important}.tuim-trigger{outline:4px solid #00ff69!important;outline-offset:-2px!important}#tuim-panel input[type=checkbox]{display:inline-block!important;flex:0 0 18px!important;width:18px!important;height:18px!important;min-height:18px!important;padding:0!important;margin:0!important;accent-color:#d6b65c!important}#tuim-panel label:has(>input[type=checkbox]){display:flex!important;align-items:center;gap:6px;margin:9px 0!important;cursor:pointer}#tuim-panel input:not([type=checkbox]):not([type=range]),#tuim-panel select{border:1px solid #57616a;border-radius:5px;font:inherit;line-height:1.4}#tuim-panel button{font:inherit;line-height:1.3;margin:4.5px 3px 4.5px 0}#tuim-panel h4{font-size:12px;margin:13.5px 0 7.5px;color:#d6b65c}#tuim-panel label{font-size:11px}#tuim-panel select[multiple]{min-height:112px}'.replaceAll('#tuim-panel',':is(#tuim-panel,#tuim-menu)')}
function travelStyle(){if(document.getElementById('tuim-travel-style'))return;const x=E('style',document.head||document.documentElement);x.id='tuim-travel-style';x.textContent="#tuim-data-window{position:fixed;z-index:2147483646;top:13vh;left:8vw;width:min(85vw,440px);height:min(65dvh,540px);min-width:250px;min-height:180px;max-width:100vw;max-height:96dvh;resize:both;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:9px;font:11px/1.45 system-ui}#tuim-data-window *{box-sizing:border-box}#tuim-data-window .tuim-travel-header{display:flex;align-items:center;gap:6px;position:sticky;top:-12px;background:#11191d;padding:6px 0 9px;z-index:3;touch-action:none;cursor:move}#tuim-data-window .tuim-travel-header strong{flex:1;font-size:12.75px}#tuim-data-window button{background:#d6b65c;color:#111;border:0;border-radius:6px;min-height:32px;padding:3.75px 7.5px}#tuim-data-window .tuim-travel-card{border:1px solid #39434a;border-radius:9px;background:#1b252b;padding:8.25px}#tuim-data-window .tuim-travel-line{display:flex;justify-content:space-between;gap:9px;padding:6px 0;border-bottom:1px solid #344047}#tuim-data-window .tuim-travel-line span{color:#c3c9cd;flex:1}#tuim-data-window .tuim-travel-line strong{text-align:right;flex:1}#tuim-data-window small{display:block;color:#b3bbc0;font-size:11px;margin-top:7.5px}"+"#tuim-travel-window{position:fixed;z-index:2147483645;top:8vh;left:5vw;width:min(92vw,520px);height:min(82dvh,750px);min-width:280px;min-height:260px;max-width:100vw;max-height:96dvh;resize:both;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:9px;font:11px/1.45 system-ui}#tuim-travel-window *{box-sizing:border-box}#tuim-travel-window .tuim-travel-header{display:flex;align-items:center;justify-content:space-between;position:sticky;top:-12px;background:#11191d;padding:6px 0 9px;z-index:3;touch-action:none;cursor:move}#tuim-travel-window .tuim-travel-header strong{font-size:14.25px}#tuim-travel-window button{padding:6.75px 9px;background:#d6b65c;color:#111;border:0;border-radius:6px;min-height:36px}#tuim-travel-window .tuim-travel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6.75px}#tuim-travel-window label{display:block;font-size:11px;color:#c7cbd0}#tuim-travel-window input:not([type=checkbox]),#tuim-travel-window select{display:block;width:100%;padding:6.75px;margin-top:3.75px;background:#283239;color:white;border:1px solid #57616a;border-radius:5px;min-height:40px}#tuim-travel-window input[type=checkbox]{margin:7.5px}#tuim-travel-window .tuim-travel-card{border:1px solid #39434a;border-radius:9px;background:#1b252b;padding:8.25px;min-width:0;overflow-wrap:anywhere}#tuim-travel-window .tuim-travel-muted,#tuim-travel-window small{display:block;color:#b3bbc0;font-size:11px}#tuim-travel-window .tuim-travel-card>strong{display:block;font-size:12px;margin-top:3px}#tuim-travel-window h3{font-size:12px;margin:12px 0 6.75px;color:#d6b65c}#tuim-travel-window .tuim-travel-line{display:flex;justify-content:space-between;gap:9px;padding:6px 0;border-bottom:1px solid #344047}#tuim-travel-window .tuim-travel-line span{color:#c3c9cd;flex:1}#tuim-travel-window .tuim-travel-line strong{text-align:right;flex:1}#tuim-travel-window .tuim-travel-total{margin-top:7.5px;border-color:#7e9e67}#tuim-travel-window .tuim-travel-total>strong{font-size:18px;color:#8fd69c}#tuim-travel-window .tuim-travel-actions{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0}#tuim-travel-window .tuim-travel-output>small{margin:7.5px 0}@media(max-width:380px){#tuim-travel-window .tuim-travel-grid{grid-template-columns:1fr}}"}
function sound(watch=null){if(watch?.audibleAlerts===false)return;state.alarmItemKey=watch?.key||null;stockEvent('inventory-alarm-requested',watch,watch?.key?'stock-threshold-hit':'manual-test');inventoryAudio.play({sound:state.cfg.alarmSound||'beep'});stockEvent('inventory-alarm-dispatched',watch,inventoryAudio.status().contextState==='running'?'audio-context-running':'audio-unavailable-or-suspended');}
function alertItem(w,reason){const p=state.panel?.querySelector('#tuim-status');if(p&&w.visualAlerts!==false)p.textContent='ALERT: '+w.name+' — '+reason;enhancements?.stock(w,snatchSnapshot(w));stockEvent('stock-threshold-hit',w,reason);if(w.audibleAlerts!==false)sound(w);else stockEvent('inventory-alarm-suppressed',w,'item-audible-alert-disabled')}
function stockEvent(event,watch,reason){try{stockDiagnostic?.event({event,item:watch?.name||'',key:watch?.key||'',category:watch?.category||'',reason,audibleEnabled:watch?.audibleAlerts!==false,visualEnabled:watch?.visualAlerts!==false,audioActive:inventoryAudio.status().active,audioState:inventoryAudio.status().contextState||'unavailable',volume:Number(state.cfg.alarmVolume??60),sound:state.cfg.alarmSound||'beep'});}catch{}}
function recordStockScan(status,watch=null,engineQuantity=null,priceRead=null,qualifies=false,alarmDecision='not-evaluated'){
 if(!stockDiagnostic?.isActive())return;
 try{if(!watch)stockDiagnostic.attempt(status==='completed'||status==='diagnostic-start'?'completed':status);const cat=category(),run=enhancements?.getState(),audio=inventoryAudio.status();for(const w of watch?[watch]:state.items){const native=!document.hidden&&cat==='Foreign'?foreignRow(w):null,nativeQuantity=native?foreignStock(native):null;stockDiagnostic.observe({item:w.name,key:w.key,category:w.category,pageCategory:cat,country:liveCountry()||run?.country||'',scanStatus:status,quantity:nativeQuantity,nativeStockText:native?.querySelector('[class*="tabletColC"],[data-stock],[data-quantity]')?.textContent?.trim()||'',engineQuantity,minimumQty:w.minQty,maximumPrice:w.maxPrice,price:priceRead,nativeRowFound:!!native,cachedRowConnected:!!w.row?.isConnected,cachedMatchesNative:!!native&&native===w.row,rowSource:!w.row?'none':native===w.row?'native-shop':'cached-or-fallback',qualifies,alarmDecision,nativeThresholdMet:!!native&&w.minQty!=null&&Number.isFinite(nativeQuantity)&&nativeQuantity>=Number(w.minQty),fired:!!w.fired,audibleEnabled:w.audibleAlerts!==false,visualEnabled:w.visualAlerts!==false,focused:document.hasFocus(),visible:!document.hidden,stage:run?.stage||'off',readinessReason:document.getElementById('tu-snatch-run')?.dataset.readinessReason||'',audioActive:!!audio.active,audioState:audio.contextState||'unavailable',volume:Number(state.cfg.alarmVolume??60)});}}catch{stockDiagnostic?.attempt('evidence-error');}
}
function scan(){try{return scanMonitor();}catch(error){stockDiagnostic?.attempt('monitor-scan-error');stockEvent('monitor-scan-error',null,error?.name||'unknown-error');throw error;}}
function scanMonitor(){
  if(document.hidden||!document.hasFocus()){recordStockScan(document.hidden?'page-hidden':'page-not-focused');return;}stockDiagnostic?.attempt('completed');if(!state.items.length){enhancements?.restoreRows();return;}enhancements?.update();
  style();
  const cat=category(),rows=state.items.length?[...document.querySelectorAll(candidates)].filter(e=>!e.closest('#tuim-panel,#tu-pda-panel')):[];
  for(const w of state.items){
    const previous=w.row,alarmWasFired=!!w.fired;
    if(cat==='Item Market'){
      previous?.classList.remove('tuim-watch','tuim-trigger','tuim-wait');w.row=null;
      const active=pageItem();
      const matching=active&&(w.key===active.key||norm(w.name)===norm(active.name));
      if(!matching){w.status='Waiting for '+w.name;w.fired=false;recordStockScan('market-item-mismatch',w);continue}
      const found=listings(),qualifying=[];
      for(const row of found){
        const p=listingPrice(row);
        const match=w.maxPrice!=null&&Number.isFinite(p)&&p<=w.maxPrice;
        row.classList.toggle('tuim-trigger',w.visualAlerts!==false&&match);row.classList.toggle('tuim-wait',w.visualAlerts!==false&&!match&&w.maxPrice!=null);
        if(match)qualifying.push({row,p});
      }
      w.status=qualifying.length?qualifying.length+' qualifying listing(s), lowest $'+Math.min(...qualifying.map(x=>x.p)).toLocaleString():found.length+' listing(s), none at target';
      if(qualifying.length&&!w.fired){w.fired=true;alertItem(w,w.status)}
      if(!qualifying.length)w.fired=false;
      recordStockScan('completed',w,null,qualifying.length?Math.min(...qualifying.map(x=>x.p)):null,qualifying.length>0);continue;
    }
    if(!w.row?.isConnected)w.row=null;
    if(!w.row)w.row=(cat==='Foreign'?foreignRow(w):null)||rows.filter(r=>keyOf(r)===w.key||norm(nameOf(r))===norm(w.name)||(norm(text(r)).includes(norm(w.name))&&norm(w.name).length>3)).sort((a,b)=>text(a).length-text(b).length)[0]||null;
    if(previous&&previous!==w.row)previous.classList.remove('tuim-watch','tuim-trigger','tuim-wait');
    if(!w.row){w.status='Not visible';w.fired=false;recordStockScan('item-row-not-found',w);continue}
    const q=cat==='Foreign'?foreignStock(w.row):quantity(w.row),p=price(w.row);
    const hits=[];
    if(w.minQty!=null&&Number.isFinite(q)&&q>=w.minQty)hits.push('quantity '+q+' ≥ '+w.minQty);
    if(cat!=='Foreign'&&w.maxPrice!=null&&Number.isFinite(p)&&p<=w.maxPrice)hits.push('price $'+p.toLocaleString()+' ≤ $'+w.maxPrice.toLocaleString());
    w.status='Qty: '+(Number.isFinite(q)?q:'?')+' | Price: '+(Number.isFinite(p)?'$'+p.toLocaleString():'?');
    w.row.classList.toggle('tuim-trigger',w.visualAlerts!==false&&hits.length>0);
    w.row.classList.toggle('tuim-wait',w.visualAlerts!==false&&hits.length===0);
    w.row.classList.remove('tuim-watch');
    if(hits.length&&!w.fired){w.fired=true;alertItem(w,hits.join('; '))}
    if(!hits.length)w.fired=false;
    if(hits.length)enhancements?.stock(w,snatchSnapshot(w));
    recordStockScan(Number.isFinite(q)?'completed':'quantity-unreadable',w,q,p,hits.length>0,hits.length?(alarmWasFired?'already-latched':w.audibleAlerts===false?'item-muted':'alarm-requested'):'below-threshold');
  }
  enhancements?.update();
}
function clearHighlights(){document.querySelectorAll('.tuim-watch,.tuim-wait,.tuim-trigger').forEach(el=>el.classList.remove('tuim-watch','tuim-wait','tuim-trigger'))}
function draggable(el,handle,clickAllowed=false){let moved=false,start=null;handle.style.touchAction='none';handle.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button')&&handle!==el)return;start={x:e.clientX,y:e.clientY,left:el.getBoundingClientRect().left,top:el.getBoundingClientRect().top};moved=false;handle.setPointerCapture?.(e.pointerId)});handle.addEventListener('pointermove',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)+Math.abs(dy)>7)moved=true;if(!moved)return;el.style.left=Math.max(0,Math.min(window.innerWidth-el.offsetWidth,start.left+dx))+'px';el.style.top=Math.max(0,Math.min(window.innerHeight-el.offsetHeight,start.top+dy))+'px';el.style.right='auto'});const finish=()=>{start=null};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);if(clickAllowed)handle.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false}},true)}
function stopPick(){
 state.picking=false;
 for(const event of ['pointerdown','touchstart','mousedown','click'])document.removeEventListener(event,intercept,true);
 document.removeEventListener('keydown',cancelPickOnEscape,true);
 document.getElementById('tuim-tip')?.remove();
}
function cancelPick(){
 stopPick();
 if(state.panel){state.panel.hidden=false;render();}
}
function cancelPickOnEscape(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelPick();}}
function intercept(e){
 if(e.target.closest('#tuim-tip,#tuim-panel,#tu-pda-panel'))return;
 const row=e.target.closest(candidates);
 if(!row&&category()!=='Item Market')return;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.type==='click'){
   const item=category()==='Item Market'?(marketTileItem(e.target)||pageItem()):null;
   if(category()==='Item Market'&&!item)return;
   state.selected=item?{category:'Item Market',...item}:{category:category(),name:nameOf(row),key:keyOf(row),row};
   cancelPick();
 }else if((e.type==='pointerdown'||e.type==='touchstart')&&row&&category()!=='Item Market'){
   state.selected={category:category(),name:nameOf(row),key:keyOf(row),row};
   setTimeout(()=>{if(state.picking)cancelPick()},500);
 }
}
function pick(){
 stopPick();
 state.picking=true;
 state.panel.hidden=true;
 document.addEventListener('keydown',cancelPickOnEscape,true);
 const tip=E('div',document.body);
 tip.id='tuim-tip';
 tip.style.cssText='position:fixed;z-index:2147483646;top:10%;right:12px;max-width:260px;padding:9px;background:#3a2c16;color:white;border:2px solid #d6b65c;border-radius:9px;font:11px system-ui;box-shadow:0 3px 12px #000';
 const instructions=E('div',tip,category()==='Item Market'?'Open an individual item listing, then select the item.':'Tap an item to monitor.');
 instructions.style.marginBottom='6px';
 if(category()==='Item Market'){
   instructions.textContent='Click the item tile (image/name/price) you want to monitor, or use the button below.';
   document.addEventListener('click',intercept,{capture:true,passive:false});
   const choose=E('button',tip,'Select displayed market item');
   choose.type='button';
   choose.style.cssText='display:block;margin:4.5px 0;padding:6px;background:#d6b65c;color:#111;border:0;border-radius:5px;cursor:pointer';
   choose.onclick=()=>{
     const item=pageItem();
     if(!item){instructions.textContent='No active item identified. Click its item tile (image/name/price), or cancel.';return;}
     state.selected={category:'Item Market',...item};cancelPick();
   };
 }else{
   for(const event of ['pointerdown','touchstart','mousedown','click'])document.addEventListener(event,intercept,{capture:true,passive:false});
 }
 const cancel=E('button',tip,'Cancel selection');
 cancel.type='button';
 cancel.style.cssText='display:block;margin-top:6px;padding:6px 9px;background:#444;color:white;border:1px solid #aaa;border-radius:5px;cursor:pointer';
 cancel.onclick=cancelPick;
}

const catalogCacheKey='tuim-catalog-v2';
async function getCatalog(){
 if(state.catalog)return state.catalog;
 const cached=load(catalogCacheKey,null);
 if(cached?.items?.length&&Date.now()-cached.time<86400000){state.catalog=cached.items;return state.catalog}
 const pdaKey='###PDA-APIKEY###';
 const apiKey=!pdaKey.includes('PDA-APIKEY')?pdaKey:(host.TornUtilities?.apiKey||host.TornUtilities?.getApiKey?.()||'');
 if(!apiKey&&typeof host.TornUtilities?.requestTravelInfo!=='function')throw Error('Verify your Torn API login key in TU Settings > API Keys, then try again.');
 const url='https://api.torn.com/v2/torn/items?key='+encodeURIComponent(apiKey);
 let payload=null;
 const unpack=response=>{
   let data=response;
   if(data&&typeof data==='object'&&('responseText' in data||'data' in data||'body' in data||'response' in data))data=data.responseText??data.data??data.body??data.response;
   if(typeof data==='string')data=JSON.parse(data);
   if(data?.error)throw Error('Torn API: '+(data.error.error||'Unknown error'));
   return data;
 };
 try{
   if(typeof host.TornUtilities?.requestTravelInfo==='function')payload=unpack(await host.TornUtilities.requestTravelInfo('catalog'));
   else if(typeof PDA_httpGet==='function')payload=unpack(await PDA_httpGet(url));
   else {const response=await fetch(url);if(!response.ok)throw Error('HTTP '+response.status);payload=unpack(await response.json())}
 }catch(e){console.warn('[TU Item Monitor] Catalog fetch:',e);if(cached?.items?.length){state.catalog=cached.items;return state.catalog}throw Error('Catalog request failed: '+e.message)}
 if(!payload){if(cached?.items?.length){state.catalog=cached.items;return state.catalog}throw Error('Could not retrieve item catalog. Configure Torn API access in PDA/TU and try again.')}
 const raw=payload.items||payload;
 const entries=Array.isArray(raw)?raw:Object.entries(raw).filter(([,v])=>v&&typeof v==='object').map(([id,v])=>({...v,id:v.id??id}));
 state.catalog=entries.filter(v=>v&&v.name).map(v=>{
   const value=v.value&&typeof v.value==='object'?v.value:{};
   const shops=Array.isArray(value.shops)?value.shops:Array.isArray(v.shops)?v.shops:[];
   const locations=shops.map(shop=>{
     if(typeof shop==='string')return shop;
     if(!shop||typeof shop!=='object')return '';
     const location=shop.location||shop.country||shop.city||shop.name||shop.shop?.name||shop.shop||shop.vendor||'';
     return typeof location==='string'?location:String(location?.name||location?.country||'');
   }).filter(Boolean);
   return {id:String(v.id),name:String(v.name),type:String(v.type||'Other'),locations:[...new Set(locations)],country:String(v.country||v.origin||'')};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 localStorage.setItem(catalogCacheKey,JSON.stringify({time:Date.now(),items:state.catalog}));
 return state.catalog;
}
function catalogGroups(item){
 const countries=['Japan','Mexico','Canada','Hawaii','Cayman Islands','Switzerland','China','Argentina','United Kingdom','UAE','South Africa'];
 const locations=item.locations.length?item.locations:item.country?[item.country]:[];
 return locations.length?[...new Set(locations.map(x=>{
   const country=countries.find(c=>norm(x).includes(norm(c)));
   return country?country+' / Foreign / Item Market / Bazaar':x+' / Item Market / Bazaar';
 }))]:['Unspecified Location / Item Market / Bazaar'];
}
const catalogLocationLabel=location=>location.includes(' / Foreign / ')?location.split(' / ')[0]:location;
function openCatalog(){
 style();
 state.catalogWindow?.remove();
 const w=E('section',document.body);state.catalogWindow=w;w.id='tuim-catalog';
 w.style.cssText='position:fixed;z-index:2147483645;left:5vw;top:8vh;width:min(90vw,530px);height:min(80dvh,680px);background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:9px;display:flex;flex-direction:column;font:11px system-ui;box-sizing:border-box;box-shadow:0 10px 30px #000b';
 const head=E('div',w);head.style.cssText='display:flex;align-items:center;gap:6px;cursor:move;touch-action:none;padding:3.75px 0 9px';
 E('strong',head,'Select Item from Complete List').style.flex='1';
 const exit=B(head,'×',()=>{w.remove();state.catalogWindow=null});exit.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c';
 draggable(w,head);tuModuleOpen('tuim-catalog');
 const locationRow=E('div',w);locationRow.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:6px';E('span',locationRow,'Filter location:');const locationFilter=E('select',locationRow);locationFilter.style.cssText='flex:1;min-width:0;background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:6px';locationFilter.onchange=()=>{if(state.catalog)filter()};
 const populateLocations=()=>{
   const previous=locationFilter.value;locationFilter.replaceChildren();
   const all=E('option',locationFilter,'All locations');all.value='';
   const locations=[...new Set(state.catalog.flatMap(catalogGroups))].sort((a,b)=>a.localeCompare(b));for(const shared of ['Torn / Item Market / Bazaar'])if(!locations.includes(shared))locations.unshift(shared);
   for(const loc of locations){const o=E('option',locationFilter,catalogLocationLabel(loc));o.value=loc}
   locationFilter.value=locations.includes(previous)?previous:'';
 };
 const search=E('input',w);search.placeholder='Keyword or item ID';search.style.cssText='width:100%;padding:7.5px;background:#283239;color:white;border:1px solid #667;margin-bottom:6px;box-sizing:border-box';
 const controls=E('div',w);controls.style.cssText='display:flex;align-items:center;gap:7.5px;margin-bottom:6px';
 const count=E('span',controls,'Loading catalog…');count.style.flex='1';
 const next=B(controls,'Next',()=>jump());next.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:6.75px 10.5px;border-radius:5px';next.disabled=true;
 const list=E('div',w);list.style.cssText='flex:1;overflow:auto;overscroll-behavior:contain';
 let matches=[],position=-1;
 const draw=items=>{
   list.replaceChildren();const grouped=new Map();
   for(const item of items)for(const loc of (locationFilter.value?[locationFilter.value]:catalogGroups(item))){if(!grouped.has(loc))grouped.set(loc,[]);grouped.get(loc).push(item)}
   for(const [loc,group] of [...grouped].sort((a,b)=>a[0].localeCompare(b[0]))){
     const heading=E('h3',list,catalogLocationLabel(loc));heading.style.cssText='font-size:11.25px;margin:10.5px 0 4.5px;color:#d6b65c';
     for(const item of group){const line=E('div',list);line.dataset.itemId=item.id;line.style.cssText='padding:6px;border-bottom:1px solid #39434a;display:flex;align-items:center;gap:6px';
       const label=E('span',line,item.name+' (#'+item.id+')');label.style.flex='1';
       const select=B(line,'Select',()=>{state.selected={category:loc.includes(' / Foreign / ')?'Foreign':'Item Market',name:item.name,key:'id:'+item.id};w.remove();state.catalogWindow=null;state.panel.hidden=false;render()});select.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:6px 9px;border-radius:5px';
     }
   }
 };
 function jump(){
   if(!matches.length)return;
   position=(position+1)%matches.length;
   const nodes=[...list.querySelectorAll('[data-item-id]')];nodes.forEach(n=>n.style.background='');
   const target=nodes.find(n=>n.dataset.itemId===matches[position].id);
   if(target){target.style.background='#31563e';target.scrollIntoView({block:'center',behavior:'smooth'})}
   count.textContent=(position+1)+' / '+matches.length+' matches';
 }
 function filter(){
   const term=norm(search.value);
   const visible=locationFilter.value==='Torn / Item Market / Bazaar'?state.catalog:locationFilter.value?state.catalog.filter(x=>catalogGroups(x).includes(locationFilter.value)):state.catalog;
   matches=visible.filter(x=>norm(x.name).includes(term)||x.id.includes(term));
   position=-1;
   // Keep the full catalog visible; Next navigates through partial keyword matches.
   draw(visible);
   next.disabled=!matches.length;
   count.textContent=term?matches.length+' matches':visible.length+' items';
   if(term&&matches.length)jump();
 }
 search.addEventListener('input',filter);
 search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();jump()}});
 getCatalog().then(()=>{if(!w.isConnected)return;populateLocations();filter()}).catch(err=>{count.textContent=err.message;B(list,'Retry',()=>{w.remove();openCatalog()})});
}



const travel=load('tuim-travel-v8',{capacity:20,mode:'standard',country:'mex',item:'',buffer:5,fee:5,book:false,departure:0,armed:false});
const travelCountries={mex:'Mexico',cay:'Cayman Islands',can:'Canada',haw:'Hawaii',uni:'United Kingdom',arg:'Argentina',swi:'Switzerland',jap:'Japan',chi:'China',uae:'United Arab Emirates',sou:'South Africa'};
const travelTimes={mex:[24,17,12,7],cay:[33,23,17,10],can:[39,27,19,12],haw:[127,89,63,38],uni:[151,106,75,45],arg:[158,111,79,47],swi:[166,116,83,50],jap:[213,149,107,64],chi:[229,160,114,69],uae:[257,180,128,77],sou:[282,197,141,85]};
const travelCosts={mex:6500,cay:10000,can:9000,haw:11000,uni:18000,arg:21000,swi:27000,jap:32000,chi:35000,uae:32000,sou:40000};
const travelAliases={mex:['mexico'],cay:['cayman'],can:['canada'],haw:['hawaii'],uni:['united kingdom','london'],arg:['argentina'],swi:['switzerland'],jap:['japan'],chi:['china'],uae:['united arab emirates','dubai','uae'],sou:['south africa']};
const travelSave=()=>localStorage.setItem('tuim-travel-v8',JSON.stringify(travel));
const travelNum=v=>Math.max(0,Number(v)||0);
const travelDate=t=>{const d=new Date(t*1000),mode=localStorage.getItem('tu-time-display')||'local';return mode==='tct'?new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)+' TCT':d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})+' Local'};
const travelMoney=v=>(v<0?'-$':'$')+Math.abs(Math.round(v)).toLocaleString();
const travelMinutes=()=>Math.ceil(travelTimes[travel.country][{standard:0,airstrip:1,private:2,business:3}[travel.mode]]*(travel.book?.75/100:1));
let travelAlerted=0;
every(()=>{const t=travel.departure;if(!travel.armed||!t||travelAlerted===t)return;if(t-Date.now()/1000<=30&&t-Date.now()/1000>=-5){travelAlerted=t;travel.armed=false;travelSave();sound();alert('Travel Assistant: departure in 30 seconds')}},1000);
function travelArrivalFallback(description){
 const now=Math.floor(Date.now()/1000);
 const text=String(description||'');
 const h=text.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i),m=text.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i),sec=text.match(/(\d+)\s*(?:seconds?|secs?|s)\b/i);
 if((h||m||sec)&&/travel|flight|arriv|land|remain|left/i.test(text))return now+(Number(h?.[1]||0)*3600+Number(m?.[1]||0)*60+Number(sec?.[1]||0));
 return null;
}
async function travelCurrentFlight(key){
 if(!key)return null;
 try{
  const [profileResult,travelResult]=await Promise.allSettled([
   travelGet('https://api.torn.com/v2/user/profile?key='+encodeURIComponent(key)),
   travelGet('https://api.torn.com/user/?selections=travel&key='+encodeURIComponent(key))
  ]);
  if(profileResult.status==='rejected'&&travelResult.status==='rejected')throw Error('Profile and travel requests failed');
  const data=profileResult.status==='fulfilled'?profileResult.value:{};
  const trip=travelResult.status==='fulfilled'?(travelResult.value.travel||{}):{};
  const user=data.profile||data;
  const status=user.status||{};
  const state=String(status.state||'').toLowerCase();
  if(!state.includes('travel')&&!state.includes('abroad')&&!(Number(trip.time_left)>0))return null;
  const description=String(status.description||'');
  const text=[description,String(trip.destination||''),String(user.travel?.destination||''),String(user.travel?.country||'')].join(' ').toLowerCase();
  // Profile direction overrides the legacy travel field, which can name the overseas country on a return flight.
  const returnFlight=/\\b(?:travel(?:l)?ing|flying|heading|going)\\s+(?:back\\s+)?to\\s+torn\\b|\\b(?:returning|flying\\s+back|heading\\s+back)\\s+(?:to\\s+torn|home)\\b/i.test(description)
    ||/^(?:torn|torn city)$/i.test(String(trip.destination||'').trim());
  const destination=returnFlight?'torn':Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>text.includes(alias)));
  const until=Number(status.until||user.travel?.arrival||user.travel?.arrival_time||0);
  const seconds=Number(trip.time_left);
  const tripTimestamp=Number(trip.timestamp);
  const arrival=Number.isFinite(seconds)&&seconds>0?Math.floor(Date.now()/1000+seconds):tripTimestamp>Date.now()/1000?tripTimestamp:until>Date.now()/1000?until:travelArrivalFallback(description);
  return {destination,description,arrival,traveling:state.includes('travel')||seconds>0,state};
 }catch(e){return {error:e.message}}
}
async function travelGet(url){
 const parse=r=>{const raw=typeof r==='string'?r:r?.responseText??r?.data??r?.body??r?.response??r;const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.error)throw Error(typeof data.error==='string'?data.error:data.error.error||'API error');return data};
 try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return parse(await r.text())}
 catch(e){if(typeof PDA_httpGet!=='function')throw e;return parse(await PDA_httpGet(url))}
}
function stockHistoryMetrics(history){
 const points=Array.isArray(history?.points)?history.points:[];
 const sorted=points.filter(p=>Number.isFinite(Number(p.quantity))&&Number(p.source_observed_at)>0).sort((a,b)=>Number(a.source_observed_at)-Number(b.source_observed_at));
 const sources={dom:0,api:0,other:0};
 for(const p of sorted){const src=String(p.provider||p.source||p.observation_source||p.source_type||'').toLowerCase();if(/dom|direct|tu/.test(src))sources.dom++;else if(/yata|api/.test(src))sources.api++;else sources.other++}
 const latest=sorted[sorted.length-1];let rate=0,intervals=0,increases=0;
 for(let i=1;i<sorted.length;i++){
  const a=sorted[i-1],b=sorted[i],dt=Number(b.source_observed_at)-Number(a.source_observed_at),dq=Number(a.quantity)-Number(b.quantity);
  if(dq<0)increases++;
  if(dt>=60&&dt<=3600&&dq>0){rate+=dq/dt;intervals++}
 }
 const age=latest?Math.max(0,Date.now()/1000-Number(latest.source_observed_at)):Infinity;
 // A bounded heuristic, not a forecast: no estimate with sparse or stale observations.
 const reliable=intervals>=3&&age<=1800;
 const estimate=reliable?Math.max(0,Math.floor(Number(latest.quantity)-(rate/intervals)*age)):null;
 return {points:sorted.length,sources,increases,intervals,estimate,age,latest,confidence:reliable?(intervals>=10&&age<=300?'Moderate':'Low'):'Unavailable'};
}
function travelMarket(data){
 const found=[];const scan=(x,depth)=>{
  if(!x||depth>5)return;
  if(Array.isArray(x)){for(const y of x)scan(y,depth+1);return}
  if(typeof x!=='object')return;
  const price=Number(x.price??x.cost??x.listing_price);
  if(Number.isFinite(price)&&price>0&&('quantity' in x||'amount' in x||'seller' in x))found.push(price);
  for(const [k,v] of Object.entries(x))if(['itemmarket','listings','items','item','market','bazaar','bazaars','offers'].includes(k))scan(v,depth+1);
 };scan(data,0);return found.length?Math.min(...found):null;
}

// Anonymous foreign-shop observations. No API key, account ID or player name is sent.
const stockReportingKey='tuim-stock-reporting-v1';
const stockReportingEnabled=()=>localStorage.getItem(stockReportingKey)==='yes';
let stockReportingBusy=false;
const stockChecks=new Map();
function foreignShopTables(){
 const found=[];
 // Torn abroad inventory: wrapper > header + LI > nested row > seven cells.
 for(const wrapper of document.querySelectorAll('[class*="stockTableWrapper"]')){
  if(!wrapper.getClientRects().length||wrapper.closest('#tuim-panel,#tuim-travel-window'))continue;
  const header=wrapper.querySelector('[class*="itemsHeader"]');
  if(!header)continue;
  const columns=[...header.children].map(x=>norm(text(x)));
  if(!['name','stock','cost'].every(x=>columns.includes(x)))continue;
  const rows=[...wrapper.querySelectorAll('li [class*="row"],li[class*="row"]')].filter(x=>(x.getClientRects().length||x.dataset.tuMonitorFiltered==='1')&&x.querySelector('[class*="tabletColB"]')&&x.querySelector('[class*="tabletColC"]'));
  if(rows.length)found.push({headers:columns,rows,kind:'torn-abroad'});
 }
 // Retain standard HTML table support for alternate layouts.
 for(const table of document.querySelectorAll('table,[role="table"]')){
  if(!table.getClientRects().length||table.closest('#tuim-panel,#tuim-travel-window'))continue;
  const header=table.querySelector('tr,[role="row"]');if(!header)continue;
  const columns=[...header.children].map(x=>norm(text(x)));
  if(!['name','stock','cost'].every(x=>columns.includes(x)))continue;
  const rows=[...table.querySelectorAll('tr,[role="row"]')].filter(x=>x!==header&&(x.getClientRects().length||x.dataset.tuMonitorFiltered==='1'));
  if(rows.length)found.push({headers:columns,rows,kind:'table'});
 }
 return found;
}
function foreignShopDiagnostic(){
 const report={version:TU_MODULE_VERSION,timestamp:new Date().toISOString(),countrySelection:travel.country,path:location.pathname,reportingEnabled:stockReportingEnabled(),reportingBusy:stockReportingBusy,reportingStatus:stockReportStatus,endpointConfigured:!!stockEndpoint,catalogLoaded:!!stockCatalogMap,catalogSize:stockCatalogMap?.size||0,queueBatches:load(stockQueueKey,[]).length,checks:document.querySelectorAll('[data-tu-stock-reported]').length,shops:[],errors:[]};
 const safe=(fn,fallback=null)=>{try{return fn()}catch(e){report.errors.push(String(e?.message||e));return fallback}};
 const sample=e=>e?{tag:e.tagName,cls:String(e.className||'').slice(0,90),text:String(text(e)).slice(0,100),title:e.getAttribute?.('title')?.slice(0,100)||null,aria:e.getAttribute?.('aria-label')?.slice(0,100)||null,html:String(e.outerHTML||'').slice(0,320)}:null;
 const shops=safe(()=>foreignShopTables(),[])||[];
 report.detectedShops=shops.length;
 report.detectedCountry=safe(()=>foreignShopCountry());
 for(const shop of shops){
  const data={kind:shop.kind,headers:shop.headers,rowCount:shop.rows.length,rows:[]};
  for(const row of shop.rows.slice(0,5)){
   safe(()=>{
    const cells=[...row.children],name=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColB"]'):cells[shop.headers.indexOf('name')],stock=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColC"]'):cells[shop.headers.indexOf('stock')],cost=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColD"]'):cells[shop.headers.indexOf('cost')];
    const entry={name:sample(name),stock:sample(stock),cost:sample(cost),itemId:name?safe(()=>foreignItemId(name)):null,quantityText:stock?text(stock).replace(/stock/ig,'').trim():null,quantityMatch:stock?text(stock).replace(/stock/ig,'').replace(/,/g,'').match(/\b(\d+)\b/)?.[1]??null:null,mark:!!name?.querySelector('[data-tu-stock-reported]')};
    data.rows.push(entry);
   });
  }
  report.shops.push(data);
 }
 report.totalRows=shops.reduce((n,x)=>n+x.rows.length,0);
 report.matchedRows=safe(()=>foreignShopSnapshot()?.rows.length);
 return JSON.stringify(report,null,2);
}
function foreignShopCountry(){
 const shops=foreignShopTables();if(!shops.length)return null;
 const pageText=[document.title,document.querySelector('main')?.innerText?.slice(0,1200)||'',...document.querySelectorAll('h1,h2,h3,[class*="country"],[class*="location"]')].map(e=>typeof e==='string'?e:(e.getClientRects().length?text(e):'')).join(' ').toLowerCase();
 const detected=Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>pageText.includes(alias)));
 return detected||(travelAliases[travel.country]?travel.country:null);
}
let stockCatalogMap=null,stockCatalogPending=null,stockCatalogIds=null;
let stockReportStatus='Waiting for foreign shop';
const setStockReportStatus=message=>{stockReportStatus=message;const el=document.querySelector('#tuim-stock-report-status');if(el)el.textContent=message};
async function ensureStockCatalog(){
 if(stockCatalogMap)return stockCatalogMap;
 if(stockCatalogPending)return stockCatalogPending;
 stockCatalogPending=getCatalog().then(items=>{
  stockCatalogMap=new Map(items.filter(x=>Number(x.id)>0).map(x=>[norm(x.name),Number(x.id)]));
  stockCatalogIds=new Set(stockCatalogMap.values());
  return stockCatalogMap;
 }).finally(()=>{stockCatalogPending=null});
 return stockCatalogPending;
}
function foreignItemId(cell){
 const control=cell?.querySelector?.('[aria-controls^="item-"]');
 const controlId=control?.getAttribute('aria-controls')?.match(/^item-(\d+)-itemInfoWrapper$/);
 if(controlId){const id=Number(controlId[1]);if(Number.isSafeInteger(id)&&id>0)return id}

 const direct=[cell,...cell.querySelectorAll('[data-item-id],[data-itemid],[data-id],a[href],img[src]')];
 for(const node of direct){
  for(const attr of ['data-item-id','data-itemid']){
   const n=Number(node.getAttribute?.(attr));if(Number.isSafeInteger(n)&&n>0&&stockCatalogIds?.has(n))return n;
  }
  for(const attr of ['href','src']){
   const v=node.getAttribute?.(attr)||'';
   const m=v.match(/(?:itemID|itemId|item_id|item\/)(?:=|\/)(\d+)/i);
   if(m&&stockCatalogIds?.has(Number(m[1])))return Number(m[1]);
  }
 }
 const labels=[cell.getAttribute('title'),cell.getAttribute('aria-label'),...cell.querySelectorAll('[title],[aria-label],img[alt]')].map(x=>typeof x==='string'?x:(x?.getAttribute?.('title')||x?.getAttribute?.('aria-label')||x?.getAttribute?.('alt'))).filter(Boolean);
 labels.push(text(cell.querySelector('button')||cell).replace(/✓/g,'').trim());
 for(const label of labels){const key=norm(label).replace(/\s*[.…]+$/,'').trim();if(stockCatalogMap.has(key))return stockCatalogMap.get(key)}
 // Truncated names are only matched if exactly one catalog entry shares the prefix.
 for(const label of labels){const raw=norm(label);if(!/[.…]$/.test(raw))continue;const prefix=raw.replace(/[.…]+$/,'').trim();if(prefix.length<8)continue;const matches=[...stockCatalogMap].filter(([name])=>name.startsWith(prefix));if(matches.length===1)return matches[0][1]}
 return null;
}
function foreignShopSnapshot(){
 const country=foreignShopCountry();if(!country)return null;
 const rows=[],seen=new Set();
 for(const shop of foreignShopTables()){
  const nameIndex=shop.headers.indexOf('name'),stockIndex=shop.headers.indexOf('stock'),costIndex=shop.headers.indexOf('cost');
  for(const row of shop.rows){
   const cells=[...row.children];
   const nameCell=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColB"]'):cells[nameIndex];
   const stockCell=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColC"]'):cells[stockIndex];
   const costCell=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColD"]'):cells[costIndex];
   if(!nameCell||!stockCell||!costCell)continue;
   const id=foreignItemId(nameCell);if(!id||seen.has(id))continue;
   const quantityLabel=text(stockCell).replace(/stock/ig,'').replace(/,/g,'').trim();
   const quantityMatch=quantityLabel.match(/\b(\d+)\b/);
   if(!quantityMatch)continue;
   const quantity=Number(quantityMatch[1]);
   const priceMatch=text(costCell).match(/\$\s*([\d,]+)/);
   const unit_price=priceMatch?Number(priceMatch[1].replace(/,/g,'')):null;
   if(!Number.isSafeInteger(quantity)||quantity<0)continue;
   seen.add(id);rows.push({item_id:id,quantity,unit_price,node:nameCell});
  }
 }
 return {country,rows};
}
const stockArchiveKey='tuim-stock-archive-v1';
const stockQueueKey='tuim-stock-upload-queue-v1';
function markStockArchived(rows,stamp){
 for(const row of rows){
  let mark=row.node.querySelector('[data-tu-stock-reported]');
  if(!mark){mark=document.createElement('span');mark.setAttribute('data-tu-stock-reported','');mark.style.cssText='color:#e69a22;font-weight:bold;margin-left:4.5px';mark.title='DOM observation awaiting server acknowledgment';row.node.append(mark)}
  mark.textContent='✓';mark.style.color='#e69a22';mark.title='DOM observation pending D1 acknowledgment';mark.dataset.tuItemId=String(row.item_id);mark.dataset.tuObservedAt=String(stamp);stockChecks.set(row.item_id,stamp);
 }
}
function storeStockSnapshot(snapshot){
 const archive=load(stockArchiveKey,[]);
 const queue=load(stockQueueKey,[]);
 // Keep a bounded local history and unsent batches, with no silent loss of unsent data.
 if(queue.length>=500)throw Error('Upload queue full (500 batches); retry when connected');
 archive.push(snapshot);
 queue.push(snapshot);
 try{
  localStorage.setItem(stockArchiveKey,JSON.stringify(archive.slice(-500)));
  localStorage.setItem(stockQueueKey,JSON.stringify(queue));
 }catch(e){throw Error('Local storage full or unavailable: '+e.message)}
}
const stockEndpoint='https://tu-multiplayer-server-dev.tuserver.workers.dev/api/foreign/observations';
const stockDelivery=(function createSubmissionDelivery({endpoint,store,now=()=>Date.now(),pda,gm,fetch:fetchTransport,onAuthorizationFailure=()=>{}}){
 const KEY='tu:foreign:retry-after:v1';let retryAt=0;
 const readDeadline=()=>{try{return Math.max(retryAt,Number(store?.getItem(KEY))||0);}catch{return retryAt;}};
 function pause(ms){retryAt=now()+ms;try{store?.setItem(KEY,String(retryAt));}catch{}}
 function error(message,status,retryAfterMs){return Object.assign(Error(message),{status,retryAfterMs});}
 return async batch=>{
  if(readDeadline()>now())throw error('Stock upload paused; queued data retained',429,readDeadline()-now());
  const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch)};
  const transports=[pda&&(()=>pda(endpoint,options.body,options.headers)),gm&&(()=>gm(endpoint,options)),fetchTransport&&(()=>fetchTransport(endpoint,options))].filter(Boolean);
  for(let index=0;index<transports.length;index++){
   let raw,status,data,timer;const controller=new AbortController();options.signal=controller.signal;
   try{
    ({raw,status,data}=await Promise.race([(async()=>{
     const raw=await transports[index](),status=Number(raw?.status)||200;let data=raw;
     try{if(typeof raw?.json==='function')data=await raw.json();else{data=raw?.responseText??raw?.data??raw?.body??raw?.response??raw;if(data instanceof Map)data=Object.fromEntries(data);if(typeof data==='string')data=JSON.parse(data);}}catch{data=null;}
     return {raw,status,data};
    })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Transport timeout'));},12000);})]));
   }catch{if(index+1<transports.length)continue;pause(30000);throw error('Stock upload network failure; queued data retained',0,30000);}
   finally{clearTimeout(timer);controller.abort();}
   if(status>=400){
    let seconds=Number(raw?.headers?.get?.('retry-after')??data?.retry_after_seconds);
    const delay=status===429?Math.max(60000,Math.min(300000,(Number.isFinite(seconds)?seconds:60)*1000)):30000;
    pause(delay);if([401,403].includes(status))onAuthorizationFailure();
    throw error('Stock upload HTTP '+status+'; queued data retained',status,delay);
   }
   const expected=new Set(batch.items.map(item=>String(item.item_id))),accepted=data?.accepted;
   if(!data?.ok||!Array.isArray(accepted)||accepted.length!==expected.size||new Set(accepted.map(String)).size!==expected.size||accepted.some(id=>!expected.has(String(id)))){
    pause(30000);throw error('Stock receipt does not match queued item IDs',502,30000);
   }
   retryAt=0;try{store?.removeItem(KEY);}catch{}return data;
  }
  pause(30000);throw error('No supported stock upload transport',0,30000);
 };
})({endpoint:stockEndpoint,store:sessionStorage,
 pda:typeof PDA_httpPost==='function'?PDA_httpPost:null,
 gm:typeof GM_xmlhttpRequest==='function'?(url,options)=>new Promise((resolve,reject)=>GM_xmlhttpRequest({url,method:'POST',headers:options.headers,data:options.body,timeout:12000,onload:resolve,onerror:reject,ontimeout:reject})):null,
 fetch:(url,options)=>fetch(url,options),onAuthorizationFailure:()=>api.handleBackendAuthorizationFailure?.()});
async function deliverStockBatch(batch){return stockDelivery(batch);}
function confirmStockMarks(batch){
 for(const item of batch.items)for(const mark of document.querySelectorAll('[data-tu-stock-reported]')){
  if(mark.dataset.tuItemId===String(item.item_id)&&mark.dataset.tuObservedAt===String(batch.observed_at)){
   mark.style.color='#34c759';mark.title='DOM observation acknowledged by server';
  }
 }
}
let stockFlushBusy=false;
async function flushStockQueue(){
 if(stockFlushBusy)return 0;
 stockFlushBusy=true;
 try{
 const queue=load(stockQueueKey,[]);
 if(!queue.length)return 0;
 let sent=0;
 for(const batch of queue.slice(0,6)){
  await deliverStockBatch(batch);
  // Remove only after acknowledgment, preserving batches queued later.
  const current=load(stockQueueKey,[]);
  if(current[0]?.observed_at!==batch.observed_at||current[0]?.country!==batch.country)break;
  localStorage.setItem(stockQueueKey,JSON.stringify(current.slice(1)));
  confirmStockMarks(batch);
  sent++;
 }
 return sent;
 }finally{stockFlushBusy=false}
}
// Retry persisted observations independently of foreign-shop visibility.
// This also drains the queue after returning to Torn or reopening PDA.
let stockRetryDelay=15000;
async function retryStockQueue(){
 if(!stockReportingEnabled())return;
 if(!load(stockQueueKey,[]).length){stockRetryDelay=15000;return}
 try{
  const sent=await flushStockQueue();
  if(sent)stockRetryDelay=15000;
  const pending=load(stockQueueKey,[]).length;
  setStockReportStatus(sent+' queued batches delivered · '+pending+' pending');
 }catch(e){
  stockRetryDelay=Math.min(stockRetryDelay*2,300000);
  setStockReportStatus('D1 delivery pending: '+e.message+' · '+load(stockQueueKey,[]).length+' batches queued');
 }
}
every(()=>{if(load(stockQueueKey,[]).length)retryStockQueue()},15000);
window.addEventListener('online',retryStockQueue);
window.addEventListener('pageshow',retryStockQueue);
let lastVisibleInventory=null,lastVisibleUploadAt=0;
function visibleInventorySignature(snap){
 return snap.country+'|'+snap.rows.map(r=>r.item_id+':'+r.quantity+':'+(r.unit_price??'')).sort().join('|');
}
async function reportForeignShop(){
 if(!stockReportingEnabled()||stockReportingBusy||document.hidden||!document.hasFocus())return;
 if(Date.now()-lastVisibleUploadAt<5000)return;
 stockReportingBusy=true;
 try{
  const country=foreignShopCountry();
  if(!country){lastVisibleInventory=null;return}
  try{await ensureStockCatalog()}catch(e){setStockReportStatus('Catalog unavailable; using DOM item IDs: '+e.message)}
  const snap=foreignShopSnapshot();
  if(!snap?.rows.length)return;
  const signature=visibleInventorySignature(snap);
  if(lastVisibleInventory===null){
   lastVisibleInventory=signature;
   setStockReportStatus('Inventory baseline captured · waiting for visible changes');
   return;
  }
  if(signature===lastVisibleInventory)return;
  const observed_at=Math.floor(Date.now()/1000);
  const rows=snap.rows.slice(0,50);
  const batch={country:snap.country,observed_at,items:rows.map(({item_id,quantity,unit_price})=>({item_id,quantity,unit_price}))};
  lastVisibleInventory=signature;
  lastVisibleUploadAt=Date.now();
  markStockArchived(rows,observed_at);
  try{
   await deliverStockBatch(batch);
   confirmStockMarks(batch);
   setStockReportStatus('Inventory changed: '+rows.length+' observations acknowledged · '+load(stockQueueKey,[]).length+' older batches pending');
   if(load(stockQueueKey,[]).length)retryStockQueue();
  }catch(e){
   storeStockSnapshot(batch);
   setStockReportStatus('Changed inventory: delivery failed ('+e.message+') · saved '+rows.length+' observations locally · '+load(stockQueueKey,[]).length+' pending batches');
  }
 }catch(e){setStockReportStatus('Archive error: '+e.message);console.warn('[TU Stock Reporter]',e)}
 finally{stockReportingBusy=false}
}
every(reportForeignShop,1000);
let travelWindow=null,travelEpoch=0,travelDataWindow=null,travelDataModel=null;
function travelClose(){travelEpoch++;travelWindow?.remove();travelWindow=null;travelDataWindow?.remove();travelDataWindow=null;travelDataModel=null}
function travelDataRender(){if(!travelDataWindow?.isConnected)return;const area=travelDataWindow.querySelector('.tuim-data-body');if(!area)return;area.replaceChildren();const model=travelDataModel;if(!model){E('small',area,'Waiting for travel data...');return}const card=E('div',area);card.className='tuim-travel-card';const lineData=(label,value)=>{const row=E('div',card);row.className='tuim-travel-line';E('span',row,label);E('strong',row,String(value))};lineData('Server detected restock events',model.pred?.observed_events??'Unavailable');if(model.metrics){const m=model.metrics;lineData('History observations sampled',m.points+' (latest 200 requested)');lineData('Real Time Reporting',model.realTimeReportingTotal!=null?model.realTimeReportingTotal:m.sources.dom);lineData('API/YATA observations (identified)',m.sources.api);lineData('Unknown-source observations',m.sources.other);lineData('Stock increases in sampled history',m.increases);lineData('Depletion intervals used',m.intervals);if(m.points>0)E('small',area,'Real Time Reporting counts all stored app-submitted observations for this item in D1. Other source counts reflect only the latest sampled history. Restock events and forecasts may use additional history.')}else E('small',area,'History metrics unavailable')}
// Enforce hidden state regardless of module CSS display rules.
(function(){const id='tuim-window-visibility';if(document.getElementById(id))return;const st=E('style',document.head||document.documentElement);st.id=id;st.textContent='#tuim-menu[hidden],#tuim-panel[hidden],#tuim-travel-window[hidden],#tuim-data-window[hidden],#tuim-catalog[hidden]{display:none!important}';})();
function tuModuleOpen(id){if(id==='tuim-menu'||id==='tuim-panel'){state.lastView=id==='tuim-menu'?'menu':'monitor';sessionStorage.setItem('tu:item-monitor:view:v1',state.lastView);}const el=document.getElementById(id);if(!el)return;const nav=window.TUWindowNavigation;if(nav?.open?.(id))return;for(const other of ['tuim-menu','tuim-panel','tuim-travel-window','tuim-data-window','tuim-catalog']){const w=document.getElementById(other);if(w&&other!==id)w.hidden=true;}el.hidden=false;}
function requestItemMonitorExit(w){
 const close=()=>{w.hidden=true;if(window.TUWindowNavigation?.exit)window.TUWindowNavigation.exit(w.id);else state.context?.close?.();};
 const armed=enhancements?.getState();if(!armed||armed.stage==='complete'){close();return;}if(document.getElementById('tuim-exit-confirm'))return;
 const overlay=E('div',document.body);overlay.id='tuim-exit-confirm';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Close Item Monitor and Snatch and Run?');overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#000b;display:flex;align-items:center;justify-content:center;padding:12px';
 const box=E('div',overlay);box.style.cssText='background:#182126;color:white;border:2px solid #d6b65c;border-radius:10px;padding:15px;max-width:360px;font:12px system-ui';E('strong',box,'Close Item Monitor and Snatch and Run?');E('p',box,'Close program turns off monitoring and Snatch and Run. Minimize keeps them running.');
 const finish=()=>{overlay.remove();};B(box,'Close program',()=>{finish();close();});const minimize=B(box,'Minimize',()=>{finish();window.TUWindowNavigation?.minimize?.(w.id);w.hidden=true;});for(const button of box.querySelectorAll('button'))button.style.cssText='padding:7.5px;margin:3.75px;background:#d6b65c;color:#111;border:0;border-radius:6px;font:bold 11.25px system-ui;cursor:pointer';minimize.focus();overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){finish();}if(event.key==='Tab'){event.preventDefault();const buttons=[...box.querySelectorAll('button')];buttons[(buttons.indexOf(document.activeElement)+1)%buttons.length].focus();}});
}
function renderAlarmChannels(parent,kind,cfg,audioKey,visualKey){
 const row=E('div',parent);row.className='tuim-alarm-channels';
 for(const [field,label] of [[audioKey,'Audio'],[visualKey,'Visual']]){const wrap=E('label',row);wrap.className='tuim-monitored-toggle';const check=E('input',wrap);check.type='checkbox';check.id='tuim-'+kind+'-'+label.toLowerCase();check.checked=cfg[field]!==false;wrap.append(document.createTextNode(label));check.onchange=()=>{cfg[field]=check.checked;saveCfg();if(!check.checked&&label==='Audio')(kind==='inventory'?inventoryAudio:landingAudio).stop();if(kind==='inventory'){clearHighlights();scan();}else landingAlarm?.tick();};}
}
function renderAlarmDuration(parent,kind,cfg,secondsKey,untilKey){
 E('label',parent,'Duration (seconds)');const seconds=E('input',parent);seconds.id='tuim-'+kind+'-alarm-duration';seconds.type='number';seconds.min='.5';seconds.max='86400';seconds.step='.5';seconds.value=cfg[secondsKey]??3;seconds.disabled=!!cfg[untilKey];const row=E('label',parent);row.className='tuim-monitored-toggle';const check=E('input',row);check.id='tuim-'+kind+'-alarm-until-muted';check.type='checkbox';check.checked=!!cfg[untilKey];row.append(document.createTextNode('Alarm until muted'));const saveDuration=()=>{cfg[secondsKey]=Math.max(.5,Math.min(86400,Number(seconds.value)||3));cfg[untilKey]=check.checked;seconds.disabled=check.checked;saveCfg();};seconds.onchange=saveDuration;check.onchange=saveDuration;
}
function renderLandingSettings(parent){
 const section=E('section',parent);section.id='tuim-landing-alarm-settings';E('h3',section,'Destination landing alarm');const cfg=state.cfg.landingAlarm||(state.cfg.landingAlarm={enabled:false,seconds:60,sound:'chime'});
 const row=E('label',section);row.className='tuim-monitored-toggle';const check=E('input',row);check.type='checkbox';check.checked=!!cfg.enabled;check.id='tuim-landing-alarm-enabled';row.append(document.createTextNode('Enable landing alarm'));renderAlarmChannels(section,'landing',cfg,'audio','visual');
 E('label',section,'Seconds before landing');const seconds=E('input',section);seconds.type='number';seconds.min='1';seconds.max='86400';seconds.value=cfg.seconds||60;seconds.id='tuim-landing-alarm-seconds';E('label',section,'Landing alarm sound');const sound=E('select',section);sound.id='tuim-landing-alarm-sound';for(const name of ['chime','beep','siren']){const option=E('option',sound,name);option.value=name;}sound.value=cfg.sound||'chime';
 renderAlarmDuration(section,'landing',cfg,'duration','untilMuted');const change=()=>{cfg.enabled=check.checked;cfg.seconds=Math.max(1,Math.min(86400,Math.round(Number(seconds.value)||60)));cfg.sound=sound.value;landingAudio.unlock();saveCfg();landingAlarm?.tick();};check.onchange=change;seconds.onchange=change;sound.onchange=change;B(section,'Test landing sound',()=>{change();landingAlarm?.test();});E('small',section,'Uses the master volume slider. Alerts on outbound destination flights while Item Monitor is running.');
}
function tuModuleHeader(w,head,parentId){
 w.dataset.tuModuleNav='1';if(!head.querySelector('[data-tu-brand-emblem]')){const emblem=E('span');emblem.className='tu-brand-emblem';emblem.dataset.tuBrandEmblem='1';head.prepend(emblem);}
 const controls=E('span',head);controls.dataset.tuNavControls='1';controls.style.cssText='margin-left:auto;display:flex;gap:4.5px;flex-shrink:0';
 const button=(symbol,title,action)=>{const b=B(controls,symbol,(event)=>{event?.stopPropagation();event?.preventDefault();action();});b.title=title;b.setAttribute('aria-label',title);b.style.cssText='background:#252a2e;color:#f1ce72;border:1px solid #806a3e;border-radius:5px;padding:4.5px 7.5px;min-width:35px';};
 button('←','Back',()=>{const nav=window.TUWindowNavigation;const result=nav?.back?.(w.id);w.hidden=true;const p=document.getElementById(parentId);if(parentId==='tuim-menu'){state.lastView='menu';sessionStorage.setItem('tu:item-monitor:view:v1','menu');}if(p){if(result!==true||p.hidden){nav?.open?.(parentId);p.hidden=false;}}});
 button('−','Minimize',()=>{window.TUWindowNavigation?.minimize?.(w.id);w.hidden=true;});
 button('×','Exit',()=>requestItemMonitorExit(w));
}
function travelDataOpen(){if(travelDataWindow?.isConnected){tuModuleOpen('tuim-data-window');return}const w=E('section',document.body);w.id='tuim-data-window';travelDataWindow=w;const head=E('div',w);head.className='tuim-travel-header';draggable(w,head);E('strong',head,'Data Used');tuModuleHeader(w,head,'tuim-travel-window');const area=E('div',w);area.className='tuim-data-body';travelDataRender();tuModuleOpen('tuim-data-window')}
function travelUI(){
 travelStyle();
 if(travelWindow?.isConnected){tuModuleOpen('tuim-travel-window');return}
 const w=E('section',document.body);travelWindow=w;w.id='tuim-travel-window';
 const head=E('div',w);head.className='tuim-travel-header';draggable(w,head);
 E('strong',head,'Travel Assistant v'+TU_MODULE_VERSION);tuModuleHeader(w,head,'tuim-menu');
 const body=E('div',w);body.className='tuim-travel-body';tuModuleOpen('tuim-travel-window');
 const intro=E('small',body,'Travel planner · Experimental restock predictions');
 const controls=E('div',body);controls.className='tuim-travel-grid';
 const field=(label,key)=>{const box=E('label',controls,label),x=E('input',box);x.type='number';x.min=0;x.value=travel[key];x.onchange=()=>{travel[key]=x.value;travelSave();refresh()};return x};
 const select=(label,key,options)=>{const box=E('label',controls,label),x=E('select',box);for(const [v,n] of Object.entries(options)){const o=E('option',x,n);o.value=v}x.value=travel[key];return x};
 const country=select('Destination','country',travelCountries);
 const mode=select('Flight mode','mode',{standard:'Standard',airstrip:'Airstrip',private:'Private Jet',business:'Business Class'});
 const item=select('Item','item',{'':'Select an item'});
 field('Carrying capacity','capacity');field('Arrival buffer (min)','buffer');field('Selling fee (%)','fee');
 const book=select('Mailing Yourself Abroad','book',{'false':'No','true':'Yes'});book.value=String(!!travel.book);book.onchange=()=>{travel.book=book.value==='true';travelSave();refresh()};
 const info=E('small',body,'Loading item catalog...');
 const output=E('div',body);output.className='tuim-travel-output';
 const reportingPanel=E('div',body);reportingPanel.className='tuim-travel-output';
 window.addEventListener('tu-time-display-changed',()=>{if(w.isConnected)refresh()},{signal:undefined});
 const actions=E('div',body);actions.className='tuim-travel-actions';
 B(actions,'Refresh travel plan',refresh);
 B(actions,'Arm departure reminder',()=>{if(!travel.departure||travel.departure*1000<=Date.now()+30000)return alert('No future recommended departure');travel.armed=true;travelAlerted=0;travelSave();alert('Reminder armed; keep PDA active')});
 const box=(parent,title)=>{const d=E('div',parent);d.className='tuim-travel-card';if(title){const t=E('small',d,title);t.className='tuim-travel-muted'}return d};
 const line=(parent,name,value)=>{const r=E('div',parent);r.className='tuim-travel-line';E('span',r,name);E('strong',r,String(value));return r};
 const date=t=>t?travelDate(t):'Not available';
 const money=n=>Number.isFinite(n)?travelMoney(n):'Unavailable';
 function renderReporting(){
  reportingPanel.replaceChildren();
  const panel=box(reportingPanel,'Automatic Foreign Stock Reporting');
  const row=E('div',panel);row.className='tuim-travel-actions';
  const toggle=B(row,stockReportingEnabled()?'Reporting: ON':'Reporting: OFF',()=>{localStorage.setItem(stockReportingKey,stockReportingEnabled()?'no':'yes');renderReporting();if(stockReportingEnabled())reportForeignShop()});
  toggle.setAttribute('aria-pressed',String(stockReportingEnabled()));
  const details=E('div',panel);details.hidden=true;
  B(row,'ⓘ Info',()=>{details.hidden=!details.hidden});
  B(row,'Diagnostics',()=>{
   const overlay=E('div',document.body);overlay.style.cssText='position:fixed;inset:0;background:#000c;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:9px';
   const page=E('section',overlay);page.style.cssText='width:min(96vw,620px);max-height:90dvh;overflow:auto;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:10.5px;box-sizing:border-box';
   const header=E('div',page);header.style.cssText='display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#11191d;padding:4.5px 0';
   E('strong',header,'Travel Assistant and Item Monitor — Diagnostics');B(header,'×',()=>overlay.remove());
   const output=E('textarea',page);output.readOnly=true;output.style.cssText='width:100%;height:55dvh;box-sizing:border-box;white-space:pre;font:11px monospace;background:#233039;color:#fff;border:1px solid #d6b65c';
   const refresh=()=>{try{output.value=foreignShopDiagnostic()}catch(e){output.value='Diagnostic failed: '+(e?.message||String(e))}};
   refresh();
   const actions=E('div',page);actions.className='tuim-travel-actions';
   B(actions,'Refresh',refresh);
   B(actions,'Copy diagnostics',async()=>{try{await navigator.clipboard.writeText(output.value)}catch(e){output.focus();output.select()}});
  });
  E('small',details,'Optional and off by default. When enabled and a supported foreign item shop is open, TU reads visible item IDs, inventory quantities, prices, country and observation timestamps when visible inventory changes, no more than once every five seconds. These are sent to the TU server to improve stock, depletion and restock forecasts. Player information is not transmitted. An orange check indicates pending server delivery; green indicates a server acknowledgment. Failed uploads are retained locally for retry. Reporting stops when the shop is not visible or you disable it. Data may still be associated with network metadata handled by the hosting provider.');
  E('small',panel,stockReportingEnabled()?'DOM observations: orange = queued, green = D1 accepted. API/YATA observations are separate server-sourced data.':'DOM reporting disabled; server API/YATA data is separate');
  const status=E('small',panel,stockReportingEnabled()?stockReportStatus:'Reporting disabled');status.id='tuim-stock-report-status';
 }
 renderReporting();
 function show(model){
  if(!w.isConnected)return;
  output.replaceChildren();travelDataModel=model;travelDataRender();
  E('h3',output,'Recommended travel schedule');
  const schedule=box(output);
  const now=Date.now()/1000;
  const forecast=model.pred?.status==='experimental';
  const end=forecast?Number(model.pred.expected_end_at):0;
  const start=forecast?Number(model.pred.expected_start_at):0;
  const missed=!!model.depart&&model.depart<=now;
  const arrivalNow=now+model.minutes*60;
  if(missed){
   line(schedule,'Original departure','Missed ('+date(model.depart)+')');
   line(schedule,'Original arrival','Missed ('+date(model.arrive)+')');
   line(schedule,'Flight duration',model.minutes+' minutes');
   if(end>now){
    line(schedule,'Earliest departure','Depart now');
    line(schedule,'Arrival if departing now',date(arrivalNow));
    line(schedule,'Travel opportunity',arrivalNow<=end?'Arrival within forecast window':'Unlikely to arrive before forecast window ends');
   }else{
    line(schedule,'Next recommended departure','Next forecast unavailable');
   }
  }else{
   line(schedule,'Recommended departure',date(model.depart));
   line(schedule,'Flight duration',model.minutes+' minutes');
   line(schedule,'Estimated arrival',date(model.arrive));
  }
  if(model.stock?.observed_at>0)line(schedule,'Last observed stock (server history)',String(model.stock.quantity??'Unknown')+' at '+date(model.stock.observed_at));
  if(model.flight?.traveling){
   const flight=model.flight;
   line(schedule,'Current travel status',flight.destination==='torn'?'Returning to Torn':'In flight'+(flight.destination?' to '+travelCountries[flight.destination]:''));
   line(schedule,'Estimated in-flight arrival',flight.arrival?date(flight.arrival):'Unavailable from Torn API');
   if(flight.arrival)line(schedule,'Time remaining',Math.max(0,Math.ceil((flight.arrival-now)/60))+' minutes');
   if(flight.destination==='torn'){
    line(schedule,'Stock on arrival','Returning to Torn — foreign stock forecast not applicable');
   }else if(flight.destination&&flight.destination!==travel.country){
    line(schedule,'Item forecast','Select your flight destination to evaluate stock');
   }else{
    const q=Number(model.stock?.quantity);
    const observed=Number(model.stock?.observed_at);
    const fresh=Number.isFinite(observed)&&observed>0&&now-observed<=900;
    let assessment='Insufficient data';
    if(fresh&&q>0)assessment='Stock recently observed; availability at arrival not guaranteed';
    else if(fresh&&q===0)assessment='Recently observed out of stock';
    if(flight.arrival){
     if(fresh&&q>0&&flight.arrival-now<=900)assessment='Stock recently observed; availability at arrival not guaranteed';
     else if(forecast&&flight.arrival>=start&&flight.arrival<=end)assessment='Arrival within projected restock window';
     else if(forecast&&flight.arrival>end)assessment='Arrival after projected window; availability unknown';
     else if(forecast&&flight.arrival<start)assessment='Arrival before projected window';
    }
    line(schedule,'Stock on arrival',assessment);
    if(Number.isFinite(q)&&observed>0)line(schedule,'Last observed stock',q+' items at '+date(observed));
   }
  }else if(model.flight?.error)E('small',schedule,'Live flight status unavailable: '+model.flight.error);
  line(schedule,'Predicted restock window',forecast?date(start)+' – '+date(end):'Insufficient data');
  line(schedule,'Forecast confidence score',forecast?Math.round(travelNum(model.pred.confidence)*100)+'% (not a probability)':'Unavailable');
  if(model.metrics){
   const m=model.metrics;
   line(schedule,'Estimated current stock',m.estimate==null?'Unavailable — insufficient recent depletion data':m.estimate+' items · '+m.confidence+' confidence (heuristic)');
  }
  if(missed&&end>now&&arrivalNow<=end)E('small',schedule,'Original departure has passed. Departing now may still reach the predicted window; stock is not guaranteed.');
  if(missed&&end>now&&arrivalNow>end)E('small',schedule,'Original departure has passed. The remaining predicted window is shorter than the flight. Next forecast unavailable.');
  if(missed&&end<=now)E('small',schedule,'Predicted window has ended. Next forecast unavailable.');
  E('h3',output,'Item pricing and profit');
  const pricing=box(output);
  line(pricing,'Foreign purchase price',money(model.buy));
  line(pricing,'Torn resale listing',money(model.sell));
  line(pricing,'Gross difference per item',money(model.gross));
  line(pricing,'Selling fee per item',money(model.fee));
  line(pricing,'Net profit per item',money(model.net));
  const total=box(output,'Net haul profit after travel expenses');
  total.className+=' tuim-travel-total';
  E('strong',total,money(model.haul));
  line(total,'Gross haul profit after selling fees',money(model.grossHaul));
  line(total,'Round-trip travel cost ('+(travel.mode==='standard'?'Standard':mode.selectedOptions[0]?.textContent||travel.mode)+')',money(model.travelCost));
  line(total,'Cash needed for full-capacity haul',money(model.cash));
  line(total,'Estimated net sale proceeds',money(model.proceeds));
  line(total,'Planned haul quantity',model.qty+' items');
  if(model.issues?.length)E('small',output,'API issues: '+model.issues.join('; '));
  E('small',output,'Prices are listings, not guaranteed sales. Stock is a last-observed snapshot; predictions are experimental. Flight eligibility must be verified in Torn.');
  const dataActions=E('div',output);dataActions.style.cssText='display:flex;justify-content:flex-end;margin-top:10.5px';const dataButton=B(dataActions,'Data Used',travelDataOpen);dataButton.style.cssText='font-size:11px;padding:3px 6.75px;min-height:26px';
 }
 let serial=0;
 async function populate(){
  const selected=travel.country;
  try{const all=await getCatalog();if(!w.isConnected||selected!==travel.country)return;
   item.replaceChildren();const first=E('option',item,'Select an item');first.value='';
   const matched=all.filter(x=>[...(x.locations||[]),x.country||''].some(v=>travelAliases[selected].some(n=>norm(v).includes(norm(n)))));
   for(const x of matched){const o=E('option',item,x.name);o.value=x.id}
   item.value=travel.item;info.textContent=matched.length+' destination items found';
   refresh();
  }catch(e){info.textContent='Catalog unavailable: '+e.message}
 }
 async function refresh(){
  const seq=++serial,minutes=travelMinutes(),cap=Math.floor(travelNum(travel.capacity)),empty={minutes,depart:null,arrive:(Date.now()/1000)+minutes*60,pred:null,buy:NaN,sell:NaN,gross:NaN,fee:NaN,net:NaN,haul:NaN,cash:NaN,proceeds:NaN,qty:cap,stock:null,issues:[]};
  const id=Number(travel.item);
  if(!Number.isSafeInteger(id)||id<=0){show(empty);return}
  info.textContent='Retrieving current stock and prices...';
  const base='https://tu-multiplayer-server-dev.tuserver.workers.dev/api/foreign/',query='?country='+travel.country+'&item_id='+id;
  const pdaKey='###PDA-APIKEY###';
  const key=!pdaKey.includes('PDA-APIKEY')?pdaKey:(host.TornUtilities?.apiKey||host.TornUtilities?.getApiKey?.()||'');
  const flightPromise=travelCurrentFlight(key);
  const jobs=[travelGet(base+'history'+query+'&limit=200'),travelGet(base+'prediction'+query+'&lead_seconds='+Math.ceil((minutes+travelNum(travel.buffer))*60+60)),key?travelGet('https://api.torn.com/v2/market/'+id+'/itemmarket?key='+encodeURIComponent(key)):Promise.reject(Error('Torn API key unavailable'))];
  const settled=await Promise.allSettled(jobs);if(seq!==serial||!w.isConnected)return;
  const [history,pred,market]=settled.map(x=>x.status==='fulfilled'?x.value:null);
  const flight=await flightPromise;if(seq!==serial||!w.isConnected)return;
  if(flight?.traveling&&!flight.arrival&&travel.manualArrival>Date.now()/1000)flight.arrival=travel.manualArrival;
  const issues=settled.map((x,i)=>x.status==='rejected'?['Foreign stock','Prediction','Market price'][i]+': '+x.reason.message:null).filter(Boolean);
  const metrics=stockHistoryMetrics(history),latest=metrics.latest,buy=Number(latest?.unit_price)>0?Number(latest.unit_price):NaN,sell=market?travelMarket(market):null;
  const qty=cap;
  const gross=sell&&Number.isFinite(buy)?sell-buy:NaN,fee=sell?travelNum(travel.fee)/100*sell:NaN,net=gross-fee,grossHaul=net*cap,travelCost=travel.mode==='standard'?2*travelCosts[travel.country]:0,haul=grossHaul-travelCost,fullHaul=haul,cash=buy*cap,proceeds=(sell-fee)*cap;
  const depart=pred?.status==='experimental'?pred.expected_start_at-(minutes+travelNum(travel.buffer))*60:null;
  travel.departure=depart&&depart>Date.now()/1000+30?depart:0;travel.armed=false;travelSave();
  show({minutes,depart,arrive:depart?depart+minutes*60:Date.now()/1000+minutes*60,realTimeReportingTotal:Number.isFinite(Number(history?.real_time_reporting_total))?Number(history.real_time_reporting_total):null,flight,stock:{quantity:latest?.quantity,observed_at:latest?.source_observed_at},metrics,pred,buy,sell,gross,fee,net,haul,grossHaul,travelCost,fullHaul,cash,proceeds,qty,issues});
  info.textContent=issues.length?'Partial API data · See warnings':'Updated '+new Date().toLocaleTimeString();
 }
 country.onchange=()=>{travel.country=country.value;travel.item='';travelSave();populate()};
 mode.onchange=()=>{travel.mode=mode.value;travelSave();refresh()};
 item.onchange=()=>{travel.item=item.value;travelSave();refresh()};
 show({minutes:travelMinutes(),depart:null,arrive:Date.now()/1000+travelMinutes()*60,pred:null,buy:NaN,sell:NaN,gross:NaN,fee:NaN,net:NaN,haul:NaN,cash:NaN,proceeds:NaN,qty:Math.floor(travelNum(travel.capacity)),stock:null,issues:[]});
 populate();
}

function render(){if(state.selected){const {category,name,key}=state.selected;localStorage.setItem('tuim-selection-v1',JSON.stringify({category,name,key}));}const p=state.panel;if(!p)return;p.scrollTop=0;p.replaceChildren();const h=E('div',p);h.className='tuim-header';draggable(p,h);E('strong',h,'Item Monitor and Snatch and Run');tuModuleHeader(p,h,'tuim-menu');E('h3',p,'Item Monitor');B(p,'Select Item on Screen',pick);B(p,'Select Item from Complete List',openCatalog);E('p',p,'Current selection: '+(state.selected?state.selected.category+' / '+state.selected.name:'None'));const label=(t)=>E('label',p,t);label('Minimum available quantity (Foreign / Stores)');const q=E('input',p);q.type='number';q.min='1';q.placeholder='No quantity alert';q.value=state.cfg.draftQuantity??'';q.oninput=()=>{state.cfg.draftQuantity=q.value;saveCfg();};label('Alert at or below unit price ($, Item Market / Stores)');const pr=E('input',p);pr.type='number';pr.min='0';pr.step='0.01';pr.placeholder='No price alert';pr.value=state.cfg.draftPrice??'';pr.oninput=()=>{state.cfg.draftPrice=pr.value;saveCfg();};if(state.selected){const prev=state.items.find(w=>w.category===state.selected.category&&(w.key===state.selected.key||norm(w.name)===norm(state.selected.name)));if(prev){q.value=state.cfg.draftQuantity??prev.minQty??'';pr.value=state.cfg.draftPrice??prev.maxPrice??''}}B(p,'Add / update monitor',()=>{if(!state.selected)return alert('Select an item first.');const s=state.selected;const minQty=q.value.trim()===''?null:Number(q.value),maxPrice=pr.value.trim()===''?null:Number(pr.value);if(s.category==='Foreign'&&minQty===null)return alert('Enter a minimum quantity for foreign items.');if(s.category==='Item Market'&&maxPrice===null)return alert('Enter a target price for Item Market.');if(minQty===null&&maxPrice===null)return alert('Enter a quantity or target price.');if(minQty!==null&&(!Number.isFinite(minQty)||minQty<1)||maxPrice!==null&&(!Number.isFinite(maxPrice)||maxPrice<0))return alert('Invalid target.');const alertPreferences=state.items.find(w=>w.category===s.category&&(w.key===s.key||norm(w.name)===norm(s.name)));state.items=state.items.filter(w=>!(w.category===s.category&&(w.key===s.key||norm(w.name)===norm(s.name))));clearHighlights();state.items.push({...s,audibleAlerts:alertPreferences?.audibleAlerts!==false,visualAlerts:alertPreferences?.visualAlerts!==false,minQty:s.category==='Item Market'?null:minQty,maxPrice:s.category==='Foreign'?null:maxPrice,fired:false,status:'Waiting'});save();scan();render()});renderMonitoredFilter(p);const st=E('p',p,state.items.length+' monitored item(s)');st.id='tuim-status';for(const cat of ['Foreign','Stores','Item Market','Other']){const watches=state.items.filter(w=>w.category===cat);if(!watches.length)continue;E('h3',p,cat+' ('+watches.length+')');for(const w of watches){const line=E('div',p);line.className='tuim-entry';const heading=E('strong',line,w.name+' ✎');heading.style.cssText='cursor:pointer;color:#d6b65c;padding:3.75px 0';heading.setAttribute('role','button');heading.tabIndex=0;const edit=()=>{state.selected={category:w.category,name:w.name,key:w.key};render();state.panel.scrollTo({top:0,behavior:'smooth'});state.panel.querySelectorAll('input[type=number]')[w.category==='Item Market'?1:0]?.focus()};heading.onclick=edit;heading.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit()}};E('div',line,'Qty ≥ '+(w.minQty??'off')+' | Price ≤ '+(w.maxPrice==null?'off':'$'+w.maxPrice.toLocaleString()));E('small',line,w.status||'Waiting');for(const [field,label] of [['audibleAlerts','Audible alerts'],['visualAlerts','Visual alerts']]){const controlLabel=E('label',line);controlLabel.className='tuim-monitored-toggle';const check=E('input',controlLabel);check.type='checkbox';check.checked=w[field]!==false;check.setAttribute('aria-label',w.name+': '+label);controlLabel.append(document.createTextNode(label));check.onchange=()=>{w[field]=check.checked;save();if(field==='audibleAlerts'){if(!check.checked&&state.alarmItemKey===w.key){inventoryAudio.stop();state.alarmItemKey=null;}else if(check.checked&&w.fired)sound(w);}if(field==='visualAlerts'&&!check.checked){const status=state.panel?.querySelector('#tuim-status');if(status?.textContent.startsWith('ALERT: '+w.name+' — '))status.textContent=state.items.length+' monitored item(s)';}clearHighlights();scan();};}B(line,'Edit',edit);B(line,'Remove',()=>{state.items=state.items.filter(x=>x!==w);clearHighlights();save();scan();render()})}}B(p,'Clear all monitors',()=>{if(!confirm('Remove all monitored items?'))return;state.items=[];clearHighlights();save();render()});const alarms=E('section',p);alarms.id='tuim-alarm-settings';E('h3',alarms,'Alarm settings');const alarmLabel=t=>E('label',alarms,t);alarmLabel('Volume (%)');const vol=E('input',alarms);vol.id='tuim-alarm-volume';vol.type='range';vol.min=0;vol.max=100;vol.value=state.cfg.alarmVolume??60;vol.style.touchAction='none';const setVolume=x=>{const rect=vol.getBoundingClientRect();if(!rect.width)return;vol.value=String(Math.round(Math.max(0,Math.min(100,(x-rect.left)/rect.width*100))));state.cfg.alarmVolume=vol.value;saveCfg()};let volumePointer=null;vol.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();e.stopImmediatePropagation();volumePointer=e.pointerId;vol.setPointerCapture?.(e.pointerId);setVolume(e.clientX)},{capture:true,passive:false});vol.addEventListener('pointermove',e=>{if(volumePointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();setVolume(e.clientX)},{capture:true,passive:false});for(const ev of ['pointerup','pointercancel','lostpointercapture'])vol.addEventListener(ev,e=>{if(volumePointer===e.pointerId)volumePointer=null;e.stopPropagation()},{capture:true});vol.addEventListener('touchmove',e=>{if(volumePointer!==null)e.preventDefault();e.stopPropagation()},{passive:false});vol.oninput=()=>{state.cfg.alarmVolume=vol.value;saveCfg()};E('h4',alarms,'Inventory alarm');alarmLabel('Sound');const snd=E('select',alarms);for(const v of ['beep','siren','chime']){const o=E('option',snd,v);o.value=v}snd.value=state.cfg.alarmSound||'beep';snd.onchange=()=>{state.cfg.alarmSound=snd.value;saveCfg()};renderAlarmDuration(alarms,'inventory',state.cfg,'alarmDuration','alarmUntilMuted');B(alarms,'Test alarm',sound);const hospitalAlarmSection=E('section',alarms);hospitalAlarmSection.id='tuim-hospital-alarm-settings';const hospitalCfg=state.cfg.snatchSetup||(state.cfg.snatchSetup={});renderEnhancements(p,hospitalAlarmSection);renderAlarmDuration(hospitalAlarmSection,'hospital',hospitalCfg,'hospitalAlarmDuration','hospitalAlarmUntilMuted');renderLandingSettings(alarms);E('p',p,'Monitors persist across navigation and refresh. Alerts only evaluate visible listings while Torn is running.');renderEmbeddedDiagnostics(p)}
function migrate(){if(localStorage.getItem('tuim-migrated'))return;const old=load(OLD,[]);for(const w of old){if(!w.name)continue;const key=w.key?.startsWith('id:')?w.key:'name:'+norm(w.name);if(!state.items.some(x=>x.key===key&&x.category==='Foreign'))state.items.push({category:'Foreign',name:w.name,key,minQty:Number(w.min)||null,maxPrice:null,status:'Migrated',fired:false})}save();localStorage.setItem('tuim-migrated','1')}
function activate(ctx){startRuntime();enhancements?.start();state.context=ctx;style();if(!state.panel){state.panel=E('section',document.body);state.panel.id='tuim-panel'}state.panel.hidden=false;state.panel.style.height=state.panel.style.height||'min(62dvh,540px)';render();if(!state.menu){state.menu=E('section',document.body);state.menu.id='tuim-menu';}renderMenu();tuModuleOpen(state.lastView==='monitor'?'tuim-panel':'tuim-menu');scan();enhancements?.update()}
function resume(){if(state.panel?.isConnected)tuModuleOpen(state.lastView==='monitor'?'tuim-panel':'tuim-menu');else{state.panel=null;activate(state.context);}return true;}
function deactivate(){stopRuntime();travelClose();state.catalogWindow?.remove();state.catalogWindow=null;stopPick();if(state.panel)state.panel.hidden=true;if(state.menu)state.menu.hidden=true;state.lastView='menu';sessionStorage.removeItem('tu:item-monitor:view:v1');state.context=null}
every(()=>{if(state.items.length)scan()},2000);
function startRuntime(){
 if(runtimeAbort)return;
 migrate();style();landingAlarm?.start();nativeClockSync?.start();runtimeAbort=new AbortController();try{embeddedDiagnostic?.resume();if(embeddedDiagnostic?.isMonitoring()){stockDiagnostic?.start();quickItemTest.captureStart();}}catch{}
 for(const task of runtimeTasks)task.timer=setInterval(task.fn,task.delay);
 runtimeObserver=new MutationObserver(records=>{if(document.hidden||!document.hasFocus()||!state.items.length||scanTimer!==null)return;if(records.every(record=>(record.target.nodeType===1?record.target:record.target.parentElement)?.closest('#tuim-menu,#tuim-panel,#tuim-catalog,#tuim-travel-window,#tuim-data-window,#tu-pda-panel,#tu-test-dev-panel,#tu-snatch-run')))return;scanTimer=setTimeout(()=>{scanTimer=null;if(runtimeAbort)scan()},400)});
 runtimeObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
 window.addEventListener('pageshow',scan,{signal:runtimeAbort.signal});
 window.addEventListener('pointerdown',()=>{if(state.cfg.landingAlarm?.enabled)landingAudio.unlock();},{signal:runtimeAbort.signal,passive:true});
 for(const event of ['focus','blur'])window.addEventListener(event,()=>enhancements?.check(),{signal:runtimeAbort.signal});
 document.addEventListener('visibilitychange',()=>enhancements?.check(),{signal:runtimeAbort.signal});
 window.addEventListener('popstate',scan,{signal:runtimeAbort.signal});
}
function stopRuntime(){
 quickItemTest.stop();
 nativeClockSync?.stop();landingAlarm?.stop();document.getElementById('tuim-exit-confirm')?.remove();enhancements?.stop();diagnosticStop();runtimeAbort?.abort();runtimeAbort=null;runtimeObserver?.disconnect();runtimeObserver=null;
 clearTimeout(scanTimer);scanTimer=null;
 for(const task of runtimeTasks){clearInterval(task.timer);task.timer=null}
 inventoryAudio.stop();
 clearHighlights();
}

const definition={id:ID,version:TU_MODULE_VERSION,activate,resume,deactivate};const register=()=>host.TornUtilities?.register?.(definition);host.addEventListener('torn-utilities-ready',register);register();
})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"item-monitor",version:"1.12.53-dev",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

/* Integrated tool: war-hit-organizer (0.3.17-dev) */
(()=>{
const realWindow=window,manager=tuPrivateManager;
let definition=null,loaded=false;
const nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;
const nativePDAGet=typeof PDA_httpGet==='function'?PDA_httpGet:null;const nativePDAPost=typeof PDA_httpPost==='function'?PDA_httpPost:null;
const nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
const authorize=function authorize(url,options,context){const foreign=function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
};const rooms=function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
};return rooms(url,foreign(url,options,context),context);};
const prepare=(url,options)=>manager.prepareBackendRequest(url,options);
const accountFailure=function isAccountAuthorizationFailure(url,status,data) {
 const target=new URL(String(url),'https://www.torn.com');
 return target.origin==='https://tu-multiplayer-server-dev.tuserver.workers.dev'&&/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname)&&[401,403].includes(status)&&[401,403].includes(data?.authorization_status);
};
const reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};
const toolAPI=Object.freeze({...manager,register(def){if(def.id!=="war-hit-organizer")throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id==="war-hit-organizer"&&!!definition;}});
const facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});
function load(){const PDA_httpPost=nativePDAPost?(url,body,headers)=>nativePDAPost(url,body,prepare(url,{method:'POST',headers}).headers):undefined;const fetch=async(url,options)=>{const r=await manager.fetchWithApiBudget(url,prepare(url,options),nativeFetch);if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>manager.requestWithApiBudget({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}},nativeGM):undefined;const PDA_httpGet=nativePDAGet?(url,headers)=>manager.apiRequestWithBudget(url,{headers},()=>nativePDAGet(url,headers)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:"0.3.17-dev"}};
(()=>{
'use strict';
const ID='war-hit-organizer',STORE='tu:who:state:v2',LOGO=manager.getLogo();
let root=null,ctx=null,stylesheet=null,lastUserScroll=0,rosterTimer=null,rosterEpoch=0,rosterLoading=false,rosterError='',rosterUpdated=0,ownOnline=null,enemyOnline=null,rosterFaction='',tab='targets',filter='all',query='',sort='release',expanded='',message='',poll=null;
let state={};try{state=JSON.parse(localStorage.getItem(STORE)||'{}')}catch{}
state.targets=state.targets||{};state.reservations=state.reservations||{};state.reservationLimit=Number(state.reservationLimit||state.hits||1);state.reservationTimer=Number(state.reservationTimer||5);
const save=()=>localStorage.setItem(STORE,JSON.stringify(state));
const el=(tag,parent,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;if(cls)x.className=cls;if(parent)parent.append(x);return x};
const btn=(parent,txt,fn,cls='')=>{const x=el('button',parent,txt,cls);x.type='button';x.onclick=fn;return x};
const field=(parent,label,value='',type='text')=>{const l=el('label',parent,label,'who-field');const x=el('input',l);x.type=type;x.value=value;return x};
const dropdown=(parent,label,values,value)=>{const l=el('label',parent,label,'who-field'),s=el('select',l);values.forEach(([v,t])=>{const o=el('option',s,t);o.value=v});s.value=value;return s};
const identity=()=>{const api=window.TornUtilities;const i=api?.getPlayer?.()||api?.getIdentity?.()||api?.identity||{};return {id:Number(i.player_id||i.playerId||i.id||0),name:String(i.name||i.player_name||'')}};
const own=(r)=>{const i=identity();return !!i.id&&Number(r.playerId)===i.id};
const isAdmin=()=>false; // Remote moderator/organizer roles not implemented; never assume privileges.
const format=(n)=>Number.isFinite(Number(n))?Number(n).toLocaleString():'—';
const formatCountdown=s=>String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')+':'+String(Math.max(0,s)%60).padStart(2,'0');
const seconds=(t)=>{if(!t)return null;const v=typeof t==='number'?t:Date.parse(t)/1000;return Number.isFinite(v)?Math.ceil(v-Date.now()/1000):null};
function close(){rosterEpoch++;if(rosterTimer)clearTimeout(rosterTimer);rosterTimer=null;if(poll)clearInterval(poll);poll=null;root?.remove();stylesheet?.remove();stylesheet=null;root=null;ctx=null}
function membersOf(data){const raw=data?.members??data?.faction?.members??[];return Array.isArray(raw)?raw:Object.entries(raw||{}).filter(([id,v])=>/^\d+$/.test(id)&&v&&typeof v==='object').map(([id,v])=>({...v,id:v.id||Number(id)}))}
function activityOf(m){const a=String(m.last_action?.status||'').toLowerCase();return a==='online'?'Online':a==='idle'?'Idle':a==='offline'?'Offline':'Unknown'}
function onlineCount(members){return members.filter(m=>activityOf(m)==='Online').length}
function ownFactionId(){const p=window.TornUtilities?.getPlayer?.()||{};return String(p.faction_id||p.factionId||p.faction?.id||'')}
async function refreshRoster(){
const fid=String(state.factionId||'');if(!/^\d+$/.test(fid)){rosterError='Select an opposing faction in Settings';if(root)render();return}
if(rosterLoading)return;rosterLoading=true;const run=++rosterEpoch;
try{
const api=window.TornUtilities;if(!api?.requestTorn)throw Error('TU Manager faction API unavailable');
const data=await api.requestTorn('/v2/faction/'+fid+'/members');if(data?.error)throw Error(data.error.error||'Faction API error');
const members=membersOf(data);if(!members.length)throw Error('No faction members returned');
if(run!==rosterEpoch)return;
const updated={};for(const m of members){const id=String(m.id||m.player_id||m.user_id||'');if(!/^\d+$/.test(id))continue;const previous=state.targets[id]||{};const status=String(m.status?.state||m.status?.description||'Unknown');updated[id]={...previous,name:m.name||previous.name||id,level:Number(m.level)||0,status,activity:activityOf(m),releaseAt:status==='Hospital'&&Number(m.status?.until)>0?Number(m.status.until):null,source:'API',lastObserved:Date.now()}}
state.targets=updated;rosterFaction=fid;enemyOnline=onlineCount(members);rosterUpdated=Date.now();rosterError='';save();void hydrateHealth();
const own=ownFactionId();if(/^\d+$/.test(own)&&own!==fid){try{const friendly=await api.requestTorn('/v2/faction/'+own+'/members');if(run===rosterEpoch)ownOnline=onlineCount(membersOf(friendly))}catch{}}
}catch(e){if(run===rosterEpoch)rosterError='Roster API: '+e.message}finally{if(run===rosterEpoch){rosterLoading=false;if(root&&!root.hidden)render()}}
}
let hpWorkerActive=false;
function paintHealth(id){
 const t=state.targets[id];if(!t||!root)return;
 const label=root.querySelector('[data-hp-id="'+id+'"]'),bar=root.querySelector('[data-hp-bar="'+id+'"]');
 const hasCurrent=t.hp!==undefined&&t.hp!==null&&Number.isFinite(Number(t.hp));
 const hasMaximum=t.maxHp!==undefined&&t.maxHp!==null&&Number.isFinite(Number(t.maxHp))&&Number(t.maxHp)>0;
 const hp=hasCurrent?format(t.hp):'?',max=hasMaximum?format(t.maxHp):'?';
 if(label)label.textContent=hasCurrent||hasMaximum?'HP '+hp+'/'+max+' · '+(t.hpSource||'Torn API'):'HP Unknown · '+(t.hpError||'Profile health unavailable');
 if(bar)bar.style.width=hasCurrent&&hasMaximum?Math.max(0,Math.min(100,100*Number(t.hp)/Number(t.maxHp)))+'%':'0%';
}
async function hydrateHealth(){
 if(hpWorkerActive)return;
 hpWorkerActive=true;
 const faction=String(state.factionId);
 try{
  const api=window.TornUtilities;
  for(const id of Object.keys(state.targets).sort((a,b)=>Number(state.targets[b]?.status==='Hospital')-Number(state.targets[a]?.status==='Hospital'))){
   if(faction!==String(state.factionId)||!root||root.hidden)break;
   const target=state.targets[id];
   if(target.hpObservedAt&&Date.now()-target.hpObservedAt<600000)continue;
   if(target.hpAttemptAt&&Date.now()-target.hpAttemptAt<120000)continue;
   target.hpAttemptAt=Date.now();
   try{
    const data=await (api.requestWhoTorn?api.requestWhoTorn('/v2/user/'+id+'/profile'):Promise.reject(Error('TU Manager WHO API unavailable')));
    if(faction!==String(state.factionId))break;
    const life=data?.profile?.life??data?.life??data?.profile?.health??data?.health;
    const live=state.targets[id];if(!live)continue;
    const current=life?.current===null||life?.current===undefined?NaN:Number(life.current);
    const maximum=life?.maximum===null||life?.maximum===undefined?NaN:Number(life.maximum);
    if(Number.isFinite(maximum)&&maximum>0)live.maxHp=maximum;
    if(Number.isFinite(current))live.hp=current;
    if(Number.isFinite(current)||Number.isFinite(maximum)&&maximum>0){
     live.hpObservedAt=Date.now();live.hpSource='Torn API';delete live.hpError;
    }else{
     live.hpError=String(data?.error?.error||'Profile health fields absent');
    }
    save();paintHealth(id);
   }catch(error){
    const live=state.targets[id];
    if(live){live.hpError=String(error?.message||error);paintHealth(id)}
    console.warn('[TU WHO] HP unavailable for player '+id+': '+String(error?.message||error));
   }
   await new Promise(resolve=>setTimeout(resolve,750));
  }
 }finally{hpWorkerActive=false}
}
function startRoster(){if(rosterTimer)clearTimeout(rosterTimer);if(!state.factionId)return;refreshRoster();const loop=()=>{rosterTimer=setTimeout(()=>{if(root&&!root.hidden&&state.factionId)refreshRoster();loop()},15000)};loop()}
function render(){
if(!root)return;const oldContent=root.querySelector('.who-content');const previousScroll=oldContent?.scrollTop||0;const preservedGrip=root.querySelector('.who-resize-grip');root.replaceChildren();
const head=el('header',root,undefined,'who-header');head.style.touchAction='none';const img=el('img',head,undefined,'who-logo');img.src=LOGO;img.alt='TU';
el('strong',head,'War Organizer','who-heading');
btn(head,'−',()=>{root.hidden=true;ctx?.minimize?.()},'who-icon');
btn(head,'×',()=>ctx?.close?ctx.close():close(),'who-icon');
const content=el('div',root,undefined,'who-content');if(preservedGrip)root.append(preservedGrip);if(previousScroll>0){requestAnimationFrame(()=>{if(content.isConnected)content.scrollTop=previousScroll})}
const banner=el('div',content,undefined,'who-factions');
const f1=el('div',banner);el('b',f1,'Chaos Cartel');el('small',f1,'● Online: '+(ownOnline===null?'—':ownOnline),'who-online');
const f2=el('div',banner);el('b',f2,state.factionName||'Opposing faction');el('small',f2,'● Online: '+(enemyOnline===null?'—':enemyOnline),'who-online');
const info=el('div',content,rosterError||((rosterLoading?'Loading roster…':rosterUpdated?'API updated '+Math.round((Date.now()-rosterUpdated)/1000)+'s ago':'Select a faction in Settings')),'who-hint');btn(content,'Refresh roster',()=>refreshRoster(),'who-refresh');
const nav=el('div',content,undefined,'who-tabs');
[['targets','Targets'],['assignments','Reservations'],['settings','Settings']].forEach(([id,name])=>btn(nav,name,()=>{tab=id;render()},tab===id?'active':''));
if(message)el('div',content,message,'who-message');
if(tab==='settings'){settings(content);content.scrollTop=previousScroll;if(!directoryLoaded&&!directoryError){loadDirectory().then(()=>{if(root&&tab==='settings')render()}).catch(e=>{directoryError='Directory error: '+e.message;if(root&&tab==='settings')render()})}return}
if(tab==='assignments'){content.scrollTop=previousScroll;el('h3',content,'Current reservations');const rows=Object.entries(state.reservations);if(!rows.length)el('p',content,'No local reservations.');rows.forEach(([id,r])=>{const row=el('div',content,undefined,'who-row');el('span',row,(state.targets[id]?.name||id)+' · '+r.name);btn(row,'Details',()=>promptRelease(id,r))});el('p',content,'Shared faction reservations and permission verification require backend integration.','who-hint');return}
const tools=el('div',content,undefined,'who-tools');const search=el('input',tools);search.placeholder='Search targets';search.value=query;search.oninput=()=>{query=search.value;render();const next=root.querySelector('.who-tools input');next?.focus();next?.setSelectionRange(query.length,query.length)};
const order=el('select',tools);[['release','Release'],['level','Level'],['name','Name']].forEach(([v,t])=>{const o=el('option',order,t);o.value=v});order.value=sort;order.onchange=()=>{sort=order.value;render()};
const filters=el('div',content,undefined,'who-filters');[['all','All'],['hospital','Hospital'],['open','Open'],['reserved','Reserved']].forEach(([v,t])=>btn(filters,t,()=>{filter=v;render()},filter===v?'active':''));
const entries=Object.entries(rosterFaction===String(state.factionId)?state.targets:{}).filter(([id,t])=>(id.includes(query)||String(t.name||'').toLowerCase().includes(query.toLowerCase()))&&(filter==='all'||filter==='reserved'&&state.reservations[id]||filter==='hospital'&&t.status==='Hospital'||filter==='open'&&!state.reservations[id]&&isOpen(t)));
entries.sort((a,b)=>sort==='name'?String(a[1].name).localeCompare(String(b[1].name)):sort==='level'?Number(b[1].level||0)-Number(a[1].level||0):(seconds(a[1].releaseAt)??999999)-(seconds(b[1].releaseAt)??999999));
const list=el('div',content,undefined,'who-list');
entries.forEach(([id,t])=>{
const row=el('div',list,undefined,'who-row'),left=el('div',row,undefined,'who-left'),line=el('div',left,undefined,'who-line');
const reservedBy=state.reservations[id],canAttack=!reservedBy||own(reservedBy)||isAdmin();const playerLink=el(canAttack?'a':'span',line,t.name||'Player '+id);if(canAttack){playerLink.href='https://www.torn.com/loader.php?sid=attack&user2ID='+encodeURIComponent(id);playerLink.style.cssText='color:#f0ce77!important;text-decoration:underline!important;cursor:pointer';}else{playerLink.style.cssText='color:#89949a!important;cursor:not-allowed';playerLink.title='Reserved by '+(reservedBy.name||'another player')+' — attack link unavailable';}el('small',line,'L'+(t.level||'?'));
const health=el('div',left,undefined,'who-health');const hpText=el('small',health,'HP Unknown · Awaiting profile');hpText.dataset.hpId=id;
const bar=el('div',left,undefined,'who-bar');const fill=el('div',bar);fill.dataset.hpBar=id;fill.style.width='0%';paintHealth(id);
const right=el('div',row,undefined,'who-right'),status=el('div',right,undefined,'who-status');
const rem=seconds(t.releaseAt),hospital=t.status==='Hospital'&&rem!==null;
el('span',status,hospital?'Hospital':(t.status||'Unknown'));
if(hospital){const clock=el('span',status,formatCountdown(rem),'who-countdown');clock.dataset.releaseAt=String(t.releaseAt);clock.style.cssText='font-variant-numeric:tabular-nums;font-weight:700;margin-left:4.5px;color:'+(rem>0&&rem<=state.reservationTimer?'#8fe0a8':'#f0b85c');clock.title='Time until hospital release';}
const activity=el('span',status,undefined,'who-dot '+({online:'online',idle:'idle',offline:'offline'}[String(t.activity||'').toLowerCase()]||'unknown'));activity.title=t.activity||'Unknown';
const r=state.reservations[id];btn(right,r?r.name:'Reserve',()=>r?promptRelease(id,r):reserve(id,t),r?'who-reserved':'who-reserve');const reserveButton=right.lastElementChild;reserveButton.dataset.targetId=id;reserveButton.disabled=false;
btn(row,expanded===id?'⌃':'⌄',()=>{expanded=expanded===id?'':id;render()},'who-expand');
if(expanded===id){const detail=el('div',list,undefined,'who-detail');el('div',detail,'ID: '+id+' · Strength: Unknown');el('div',detail,'Source: '+(t.source||'Unknown')+' · Activity: '+(t.activity||'Unknown'));el('div',detail,'Reservation: '+(r?.name||'Available'))}
});
if(!entries.length)el('p',list,'No matching targets. Add a target in Settings.','who-hint');
el('p',content,'Roster and status from Torn API. HP remains Unknown until player profile/Live observations are connected. Reservations are still local to this device.','who-hint');
}
function isOpen(t){const status=String(t.status||'').toLowerCase();if(status==='okay'||status==='traveling'||status==='travelling'||status==='abroad')return true;const s=seconds(t.releaseAt);return status==='hospital'&&s!==null&&s>0&&s<=state.reservationTimer}
function reserve(id,t){if(!isOpen(t)){const remaining=seconds(t.releaseAt);if(String(t.status||'').toLowerCase()==='hospital'&&remaining!==null&&remaining>state.reservationTimer){const wait=remaining-state.reservationTimer;alert('Reservation is not available yet for '+(t.name||'this player')+'.\nYou can reserve in '+formatCountdown(wait)+'.');}else alert('This player is not currently eligible for reservation.');return;}const who=identity();if(!who.id||!who.name){alert('Verified Torn identity is required to reserve.');return}if(Object.values(state.reservations).filter(r=>Number(r.playerId)===who.id).length>=state.reservationLimit){alert('Your reservation limit has been reached.');return}if(state.reservations[id]){const existing=state.reservations[id];alert('This player is already reserved by '+(existing.name||'another player')+'.');return}state.reservations[id]={playerId:who.id,name:who.name,createdAt:Date.now()};save();render()}
function promptRelease(id,r){if(!own(r)&&!isAdmin()){alert('Only the reserving player or an authorized moderator/administrator can remove this reservation.');return}if(!confirm('Remove '+r.name+' reservation for '+(state.targets[id]?.name||id)+'?'))return;if(state.reservations[id]?.playerId!==r.playerId)return;delete state.reservations[id];save();render()}

const DIRECTORY_CACHE='tu:factions:directory:v1';
let directory=[],directoryLoaded=false,directoryError='',pickerQuery='',pickerOpen=false;
function parseCSV(text){
const rows=[];let row=[],cell='',quoted=false;
for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=ch}
if(cell||row.length){row.push(cell);rows.push(row)}if(!rows.length)throw Error('Empty faction directory');
const heads=rows.shift().map(x=>x.trim().toLowerCase().replace(/^\ufeff/,''));const idCol=heads.indexOf('id'),nameCol=heads.indexOf('name');
if(idCol<0||nameCol<0)throw Error('Faction directory has no id/name columns');
return rows.map(r=>({id:String(r[idCol]||'').trim(),name:String(r[nameCol]||'').trim()})).filter(x=>/^\d+$/.test(x.id)&&x.name);
}
async function loadDirectory(force=false){
if(!force){try{const cached=JSON.parse(localStorage.getItem(DIRECTORY_CACHE)||'null');if(cached?.saved&&Date.now()-cached.saved<86400000&&cached.rows?.length){directory=cached.rows;directoryLoaded=true;directoryError='';return}}catch{}}
const api=window.TornUtilities;if(!api?.requestTorn)throw Error('TU Manager API unavailable');
const body=await api.requestTorn('/v2/faction/snapshot',{format:'text'});
let csv=typeof body==='string'?body:typeof body?.csv==='string'?body.csv:typeof body?.data==='string'?body.data:'';
if(csv.trim().startsWith('{')){const parsed=JSON.parse(csv);if(parsed.error)throw Error(parsed.error.error||'API error');csv=parsed.csv||parsed.data||parsed.snapshot||''}
const rows=parseCSV(csv);if(!rows.length)throw Error('Faction directory returned no factions');
directory=rows;directoryLoaded=true;directoryError='';try{localStorage.setItem(DIRECTORY_CACHE,JSON.stringify({saved:Date.now(),rows}))}catch{}
}
function picker(parent){
const wrap=el('div',parent,undefined,'who-picker');
const selected=directory.find(x=>x.id===String(state.factionId));
const choose=btn(wrap,selected?selected.name+' ['+selected.id+']':'Select opposing faction',()=>{pickerOpen=!pickerOpen;render()},'who-picker-trigger');
if(!pickerOpen)return;
const search=el('input',wrap);search.placeholder='Search faction name or ID';search.value=pickerQuery;
const status=el('small',wrap,undefined,'who-hint');
const results=el('div',wrap,undefined,'who-picker-results');
function update(){pickerQuery=search.value;results.replaceChildren();const q=pickerQuery.trim().toLowerCase();const matches=directory.filter(x=>x.name.toLowerCase().includes(q)||x.id.includes(q));status.textContent=directoryLoaded?directory.length+' factions · '+matches.length+' matches'+(matches.length>100?' · first 100 shown':''):directoryError||'Loading faction directory…';for(const item of matches.slice(0,100))btn(results,item.name+' ['+item.id+']',()=>{state.factionId=item.id;state.factionName=item.name;state.targets={};rosterFaction='';enemyOnline=null;rosterUpdated=0;rosterLoading=false;rosterEpoch++;save();pickerOpen=false;pickerQuery='';render();startRoster()},'who-faction-option')}
search.oninput=update;update();
btn(wrap,'Refresh faction directory',async()=>{status.textContent='Refreshing faction directory…';try{await loadDirectory(true)}catch(e){directoryError='API error: '+e.message}if(root)render()},'who-refresh');
}
function settings(parent){
el('h3',parent,'War settings');
el('div',parent,'Opposing faction','who-field-label');
picker(parent);
if(state.factionId){
  btn(parent,'Clear selected faction',()=>{
    if(!confirm('Remove '+(state.factionName||'the selected faction')+' from War Organizer? This also clears its locally stored targets and reservations.'))return;
    rosterEpoch++;if(rosterTimer)clearTimeout(rosterTimer);rosterTimer=null;rosterLoading=false;
    state.factionId='';state.factionName='';state.targets={};state.reservations={};
    rosterFaction='';rosterError='';rosterUpdated=0;enemyOnline=null;ownOnline=null;
    pickerOpen=false;pickerQuery='';filter='all';query='';expanded='';message='Selected faction and local selections cleared.';
    save();render();
  },'who-clear-faction');
  btn(parent,'Clear target reservations',()=>{
    if(!confirm('Clear all locally stored target reservations for this faction?'))return;
    state.reservations={};message='Local target reservations cleared.';save();render();
  },'who-clear-reservations');
}
const mode=dropdown(parent,'War mode',[['real','Real War'],['offline','Offline Only']],state.mode||'real');
const limit=dropdown(parent,'Reservation Limit',[['1','Single (1 target per player)'],['2','Double (2 targets per player)'],['3','Triple (3 targets per player)']],String(state.reservationLimit));
const timer=field(parent,'Reservation Timer (1–30 seconds before hospital release)',state.reservationTimer,'number');timer.min='1';timer.max='30';timer.step='1';
btn(parent,'Save Settings',()=>{const v=Number(timer.value);if(!Number.isInteger(v)||v<1||v>30){alert('Reservation timer must be 1–30 seconds');return}state.mode=mode.value;state.reservationLimit=Number(limit.value);state.reservationTimer=v;save();message='Settings saved locally. Shared administrator permissions are not yet connected.';render()});
el('p',parent,'Faction names and IDs come from the Torn API. The directory is cached for up to 24 hours. Player roster integration is the next step.','who-hint');
}

function activate(context){if(!window.TornUtilities?.isAuthorized?.())return;ctx=context||null;if(root?.isConnected){root.hidden=false;render();startRoster();return}
root=document.createElement('section');root.id='tu-who-panel';root.style.cssText='position:fixed;z-index:2147483646;top:10%;left:5%;width:min(560px,90vw);height:82vh;min-width:300px;min-height:260px;background:#11191d;border:1px solid #a58a48;border-radius:12px;color:#e8edf0;font:11px system-ui;box-shadow:0 8px 28px #000b;display:flex;flex-direction:column;overflow:hidden';
stylesheet=document.createElement('style');stylesheet.textContent=`
#tu-who-panel,#tu-who-panel *{box-sizing:border-box}#tu-who-panel{font:11px/1.35 system-ui,sans-serif!important;color:#e8edf0!important}#tu-who-panel .who-header{min-height:46px!important}#tu-who-panel .who-logo{display:block!important;width:32px!important;height:32px!important;max-width:32px!important;max-height:32px!important;min-width:32px!important;min-height:32px!important;object-fit:contain!important}#tu-who-panel .who-heading{font-size:11px!important;line-height:1.2!important;margin:0!important}#tu-who-panel button{font-size:11px!important;line-height:1.2!important;min-height:25px!important}#tu-who-panel .who-icon{font-size:13.5px!important;min-width:28px!important;max-width:30px!important;padding:2.25px!important}#tu-who-panel .who-tabs button,#tu-who-panel .who-filters button{background:#28343b!important;color:#dce5e9!important}#tu-who-panel .who-tabs .active,#tu-who-panel .who-filters .active{background:#9c7b3b!important;color:#101417!important}#tu-who-panel .who-factions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}#tu-who-panel .who-factions>div{display:flex!important;flex-direction:column!important;align-items:center!important}#tu-who-panel input,#tu-who-panel select{background:#28343b!important;color:#eee!important;border:1px solid #50606a!important;max-width:100%!important}#tu-who-panel .who-content{width:100%!important}#tu-who-panel .who-reserved{background:#34443c!important;color:#93e2b0!important}#tu-who-panel .who-expand{background:transparent!important;color:#ddd!important}#tu-who-panel button,#tu-who-panel input,#tu-who-panel select{font:inherit}#tu-who-panel button{background:#dfb952;color:#101417;border:0;border-radius:5px;padding:3.75px 5.25px;cursor:pointer}#tu-who-panel button:disabled{opacity:.4;cursor:not-allowed}
#tu-who-panel .who-header{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:6px;background:#101417;border-bottom:1px solid #66552f;padding:5.25px 6.75px;flex-shrink:0}
#tu-who-panel .who-logo{width:32px;height:32px;object-fit:contain;flex-shrink:0}#tu-who-panel .who-heading{flex:1;color:#f0ce77;font-size:11px}#tu-who-panel .who-icon{background:#283139;color:#f0ce77;font-size:13.5px;min-width:28px}
#tu-who-panel .who-content{padding:6.75px;overflow-y:auto!important;overflow-x:hidden!important;min-height:0!important;flex:1 1 auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}#tu-who-panel .who-factions{display:grid;grid-template-columns:1fr 1fr;gap:6px;text-align:center;color:#f0ce77}#tu-who-panel .who-factions>div{display:flex;flex-direction:column;gap:2.25px}#tu-who-panel .who-online{color:#55cc80}
#tu-who-panel .who-hint{font-size:11px;color:#aeb8bd;margin:5.25px 0}#tu-who-panel .who-tabs,#tu-who-panel .who-filters{display:flex;gap:3px;margin:6px 0}#tu-who-panel .who-tabs button,#tu-who-panel .who-filters button{flex:1;background:#28343b;color:#dce5e9}#tu-who-panel .who-tabs .active,#tu-who-panel .who-filters .active{background:#9c7b3b;color:#101417}
#tu-who-panel .who-tools{display:flex;gap:3.75px}#tu-who-panel .who-tools input{min-width:0;flex:1}#tu-who-panel input,#tu-who-panel select{background:#28343b;color:#eee;border:1px solid #50606a;border-radius:5px;padding:4.5px}
#tu-who-panel .who-list{display:flex;flex-direction:column;gap:0.75px;background:#374149}#tu-who-panel .who-row{background:#1c262d;display:flex;align-items:center;gap:4.5px;padding:3.75px 4.5px;min-height:44px}#tu-who-panel .who-left{min-width:0;flex:1}#tu-who-panel .who-line{display:flex;gap:3.75px;align-items:center;white-space:nowrap;overflow:hidden}#tu-who-panel .who-line b{overflow:hidden;text-overflow:ellipsis}#tu-who-panel .who-line small,#tu-who-panel .who-health{color:#afbbc2;font-size:11px}#tu-who-panel .who-bar{height:3px;background:#3d4a51;margin-top:2.25px}#tu-who-panel .who-bar>div{height:100%;background:#63ba8e}
#tu-who-panel .who-right{width:112px;flex-shrink:0;display:flex;flex-direction:column;align-items:stretch;gap:2.25px}#tu-who-panel .who-status{display:flex;justify-content:flex-end;align-items:center;gap:3.75px;font-size:11px;white-space:nowrap}#tu-who-panel .who-dot{height:8px;width:8px;border-radius:50%;background:#77828b;flex-shrink:0}#tu-who-panel .who-dot.online{background:#48cd7b}#tu-who-panel .who-dot.idle{background:#e9b84b}#tu-who-panel .who-dot.offline{background:#9aa4ae}#tu-who-panel .who-reserved{background:#34443c;color:#93e2b0}#tu-who-panel .who-expand{background:transparent;color:#ddd;padding:2.25px}#tu-who-panel .who-detail{padding:5.25px;background:#2b363e;color:#d4dfe3}#tu-who-panel .who-field{display:block;margin:6px 0;color:#d4dfe3}#tu-who-panel .who-field input,#tu-who-panel .who-field select{display:block;width:100%;margin-top:2.25px}#tu-who-panel .who-message{color:#e9b84b;padding:3.75px}#tu-who-panel .who-picker{display:flex;flex-direction:column;gap:3.75px;margin:3.75px 0 7.5px}#tu-who-panel .who-picker-trigger{width:100%;text-align:left!important;background:#28343b!important;color:#f0ce77!important;border:1px solid #6d5b35!important}#tu-who-panel .who-picker-results{max-height:210px;overflow-y:auto;overscroll-behavior:contain;background:#182229;border:1px solid #50606a;border-radius:6px}#tu-who-panel .who-picker-results button{display:block;width:100%;text-align:left!important;background:#202d35!important;color:#e8edf0!important;border-bottom:1px solid #374149!important;border-radius:0!important;padding:6px!important}#tu-who-panel .who-refresh{background:#28343b!important;color:#f0ce77!important}#tu-who-panel .who-field-label{font-weight:600;margin-top:6px}
`;document.head.append(stylesheet);
const grip=document.createElement('div');grip.className='who-resize-grip';grip.title='Resize window';grip.style.cssText='position:absolute;right:0;bottom:0;width:25px;height:25px;z-index:5;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,#a58a48 52%,#a58a48 58%,transparent 60%,transparent 72%,#a58a48 74%)';root.append(grip);
const beginGesture=(e,resize)=>{if(e.button!==undefined&&e.button!==0)return;if(!resize&&e.target.closest('button,a,input,select'))return;const rect=root.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,startW=rect.width,startH=rect.height,startL=rect.left,startT=rect.top;const handle=resize?grip:root.querySelector('.who-header');handle.setPointerCapture(e.pointerId);const move=ev=>{const dx=ev.clientX-startX,dy=ev.clientY-startY;if(resize){root.style.width=Math.max(300,Math.min(window.innerWidth-startL,startW+dx))+'px';root.style.height=Math.max(260,Math.min(window.innerHeight-startT,startH+dy))+'px'}else{root.style.left=Math.max(0,Math.min(window.innerWidth-80,startL+dx))+'px';root.style.top=Math.max(0,Math.min(window.innerHeight-46,startT+dy))+'px'}};const done=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',done);handle.removeEventListener('pointercancel',done)};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',done);handle.addEventListener('pointercancel',done)};
root.addEventListener('pointerdown',e=>{if(e.target===grip)beginGesture(e,true);else if(e.target.closest('.who-header'))beginGesture(e,false)});
root.addEventListener('touchmove',()=>{lastUserScroll=Date.now()},{passive:true});root.addEventListener('wheel',()=>{lastUserScroll=Date.now()},{passive:true});document.body.append(root);render();startRoster();poll=setInterval(()=>{if(!root||root.hidden||tab!=='targets')return;for(const clock of root.querySelectorAll('.who-countdown')){const remaining=seconds(Number(clock.dataset.releaseAt));if(remaining===null)continue;clock.textContent=formatCountdown(remaining);clock.style.color=remaining>0&&remaining<=state.reservationTimer?'#8fe0a8':'#f0b85c';}for(const button of root.querySelectorAll('.who-reserve')){const id=button.dataset.targetId;if(id&&state.targets[id])button.disabled=false;}},1000);
}
function register(){window.TornUtilities?.register?.({id:ID,version:'0.3.17-dev',activate, deactivate:close})}
if(window.TornUtilities)register();else window.addEventListener('torn-utilities-ready',register,{once:true});
})();
/* TU compact presentation v1 */
}
manager.registerTool({id:"war-hit-organizer",version:"0.3.17-dev",activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});
})();

   status.phase='ready';
  }catch(error){status.phase='failed';status.error={name:String(error?.name||'Error'),message:String(error?.message||'Startup failed').replace(/https?:\/\/[^\s]+/gi,'[URL OMITTED]').replace(/\b[A-Za-z0-9_-]{16,}\b/g,'[REDACTED]').slice(0,240)};throw error;}
 };
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
