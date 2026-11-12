// ==UserScript==
// @name         TU War Organizer
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.3.26-dev
// @description  Compact War Organizer target board and reservation design preview
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/stable-05424-who/torn-utilities/modules/war-hit-organizer.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/stable-05424-who/torn-utilities/modules/war-hit-organizer.user.js
// ==/UserScript==
(()=>{
'use strict';
const ID='war-hit-organizer',STORE='tu:who:state:v2',LOGO="data:image/webp;base64,UklGRq4GAABXRUJQVlA4IKIGAAAwHACdASpgAGAAPpU8mUiloyIhKrK/ULASiWoAwne0lPSi7G2qg0ltv0P7ZnzI+bV/nvXZ/k9999CL9iut1rz0mO9Cfr9HUXaZwyuOal/4fNz9S+jf/xuBdeDYib+r4+o01uo4Fe5wCllruiV7HogTd8NYJp2HZhuyzPaLHGNUhONqVaXDfidHh3gDU03sGVoDbxBsLMYbgIZJscfjJN6/Cuwf+lpc7yBok1/B6IPkz/4IK3gm9J/27Bccd/Vu0I67CDDXdjwv9yZ88/+SGxC7SPq/0wMczZp3ahPn7a7zzD+ry0hpqnkRIQAA/v1uSKGx+Jn/no2//fWx79LRnMZ/hFKeb/W89WQyYr1/en+ak1594g2/jvqMWzCEyv/g/h6d0hPkmQ5ezERi2EA5XlSIJEt/X31Xmlzx0Bs1UL/xHnRu7CQD+YunEj8cMN1EoP7+wWAxWomBcZDIaoOX2RArXlfkkf34+KvKJn0aaZljJ+xP4MRw7FMMOZDQoKvNAiAdMwSIqUMICrYuhvf6n6gQ6agK6qoHEIHu4W/DExeNKG+sOsoZIiyI3xmq3c0evDzfkUtuqtPF0ZYGz+k/s4DgrlSXCIIWuKJueob1EvRo+0clCx/rH/izpBsTPbwgtRJGpEcO7psIJoZgFSSLeZxwIYrrdepjc0OeudEZGGgwX7GZvVVkfrOW24nwFalbAtXrCKOKKh4LLluHH+m6hquhlu3ywQk86ilNUEFf/DWDTTmG4/j7RyO9zwjgSZRj62RomMbtIe4AGW1C1G8FMZFT5Hl2bW1i3jbCCaK3X+1X21/SJ/07ieGvkW1MDKy0D3PeKbGqpCnxHc9n5EaWCkCaUlwkid1P4iHg4kuqY6b2rqBuX14FD1z/qtySU0h9GTQEuzjj/X+MS9KGP9Vcxzhf+EaAJIKGb2mfOBrO2D9/snC+VDkBJNfYc8K+vJnJZk9znFBuZcI5U38KUd+Iod6xRVfxkf81tyQ4yehnh279c9aaJdnYvTffqZbsqixbg2SQuXuP9DjNBK8kgq5e6habhY5/uS6x/8fgprWCvXWXFist42MlorVQZLZuO0IKd9KOj/Ho+5xKEUuq3hHZ+NQvDCxVimngFBYjk/8FGNicRnDgr2sW05dP9Y6o7QQbpKy/xPd6dJs9O7qkkSrZccMiSt2mu9IpMeYxLdADxxG7RBbyFuCidzxQPrtT3glWJyaI0L+TUtZIn7HNv+0ACpDWhePHk/gDWrT72x3y6iktn8I41w93aMn0DP1JGunzNAD9INpTFzvMK5LEwIlw8iICzGjRT4qU/ABRUwlrSvgd0bH/IEKT9MY9f5+gLcEsoEcFLjSxP/+RZxcf06hEmrQCNa1cJ6sdfF6DEyv125hCHvZGuWgpVYqbGjH+mZyajeQnXsTdTx0H+FzbhJlSrt15U3N86k4GjIY8D5dF/MjuEGxlasg1WNKICMsSlm2bAsc2gRz27RJYSnn16kXFoA+1EcVjnlSE1pU+L7xHuqQ690c20jYTjDISPD9eKAh+9/7U8cvQf+Pfi4FmpvP5jt1uuvS3GqZvRF9rts5105OtTd82JylWZVuNt75RozzZng3gSAdCpQKW/Y2jFcgT5+Nz5zoC73+9pXmIJJIRg3LRIgq97yuZp+MtAv0XjUz3WCKBmXsIdR8MB90FSdykRbQcubenEF0iRmK7zO6HjFNs+hY8uwR1hzwgl7Qd2XLMf0bxHZlqbXmDaXhvbgkkrS8iKfR5dfOkPZlg91MyCnIy26qM7Rahd0PyK1JpWfsfE1T4Zqofux8e2WBSjdjzd8DnKZN7wHt4q9NUDgPq0yTL1fFDH/LdkLdqP2Te+sq+fsJ29x+O8/QxDpVdIgHmlj5bN+eEJ4LqhOEqjdnL4NwzSkSHbu6H1XEChVgOPx/6RgJeVa3ygz3NNej6hhw8CSuIUQ/y8/P+8p3oHNQ6CwasUQkncNkMVARQEwexRxHc3C5K8LejobmSzZzM6wYKg/+rON2ho6BI9apVNUdE4+G48mPqxqxHhj5axEsT1N2DlKiamua2U4tHPSjM2MWXE+DN4nIXaEMAHYRfmaDuKOYelGKd7FRTi3g1c3KIuZyBm+kfM9f+yBR6EOXncG7ZtC6/+82tihoyoo9PXWLyAIdjvt68WbxM9+MGUQUf2fM1q1SCeAs+taTXoNwx57fKlXX2MxOXiD8ZLo5Lcw3N6YmdtzS0QZ03VlFWkTt4mI3AbHmpIJSh34teaOQzt4qhzqcAAAA=";
let root=null,ctx=null,stylesheet=null,lastUserScroll=0,rosterTimer=null,rosterEpoch=0,rosterLoading=false,rosterError='',rosterUpdated=0,ownOnline=null,enemyOnline=null,rosterFaction='',tab='targets',filter='all',query='',sort='release',expanded='',message='',poll=null;
let state={};try{state=JSON.parse(localStorage.getItem(STORE)||'{}')}catch{}
state.targets=state.targets||{};state.reservations=state.reservations||{};state.reservationLimit=Number(state.reservationLimit||state.hits||1);state.reservationTimer=Number(state.reservationTimer||5);
let ownStatusCounts=null,enemyStatusCounts=null,scouterRows={},scouterScope=null,scouterEpoch=0,scouterPending=false,scouterEnabled=false,scouterAvailable=false,scouterError='',scouterConfirmed=false;let flightRows={},flightEpoch=0,flightPending=false,flightPremium=null,flightError='',flightAvailability={};
sort=['release','level','name','ff-asc','ff-desc'].includes(state.sort)?state.sort:'release';filter=['all','hospital','okay','open','reserved'].includes(state.statusFilter)?state.statusFilter:'all';let ffDraftMin=String(state.ffMin??''),ffDraftMax=String(state.ffMax??'');
let ownTargets={},ownRosterFaction='',ownRosterUpdated=0,ownMemberCount=null,enemyMemberCount=null,listNode=null;const listPositions=new Map();let renderingBoard=false,paintingBoard=0;
function preservePaint(action){const keep=!renderingBoard&&!paintingBoard&&listNode?.isConnected&&!root?.hidden&&root?.style.display!=='none';if(keep)rememberListPosition();paintingBoard++;try{return action();}finally{paintingBoard--;if(keep)restoreListPosition();}}
const viewingOwn=()=>state.viewSide==='own'||(!/^[1-9][0-9]*$/.test(String(state.factionId||''))&&!!ownFactionId());
const activeRosterId=()=>String(viewingOwn()?ownFactionId():state.factionId||'');
const activeTargets=()=>viewingOwn()?(ownRosterFaction===ownFactionId()?ownTargets:{}):(rosterFaction===String(state.factionId)?state.targets:{});
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
function close(){listPositions.clear();listNode=null;clearFlights();scouterEpoch++;scouterRows={};scouterScope=null;scouterPending=false;scouterEnabled=false;scouterAvailable=false;scouterConfirmed=false;scouterError='';window.removeEventListener('tu-player-updated',identityChanged);window.removeEventListener('tu-who-key-changed',scouterChanged);window.removeEventListener('storage',scouterStorage);rosterEpoch++;if(rosterTimer)clearTimeout(rosterTimer);rosterTimer=null;if(poll)clearInterval(poll);poll=null;root?.remove();stylesheet?.remove();stylesheet=null;root=null;ctx=null}
function membersOf(data){const raw=data?.members??data?.faction?.members??[];return Array.isArray(raw)?raw:Object.entries(raw||{}).filter(([id,v])=>/^\d+$/.test(id)&&v&&typeof v==='object').map(([id,v])=>({...v,id:v.id||Number(id)}))}
function activityOf(m){const a=String(m.last_action?.status||'').toLowerCase();return a==='online'?'Online':a==='idle'?'Idle':a==='offline'?'Offline':'Unknown'}
function onlineCount(members){return members.filter(m=>activityOf(m)==='Online').length}
function ownFactionId(){const p=window.TornUtilities?.getPlayer?.()||{};return String(p.faction_id||p.factionId||p.faction?.id||'')}
function rosterRows(members,previous){const updated={};for(const member of members){const id=String(member.id||member.player_id||member.user_id||'');if(!/^[1-9][0-9]*$/.test(id))continue;const status=String(member.status?.state||'Unknown');updated[id]={...(previous[id]||{}),name:member.name||previous[id]?.name||id,level:Number(member.level)||0,status,statusDescription:typeof member.status?.description==='string'?member.status.description:'',revivable:typeof member.is_revivable==='boolean'?member.is_revivable:null,activity:activityOf(member),releaseAt:status==='Hospital'&&Number(member.status?.until)>0?Number(member.status.until):null,source:'API',lastObserved:Date.now()};}return updated;}
async function refreshRoster(){
 if(rosterLoading)return;const opposing=String(state.factionId||''),friendly=ownFactionId(),ids=[...new Set([opposing,friendly].filter(id=>/^[1-9][0-9]*$/.test(id)))];if(!ids.length){rosterError='Select a faction in Settings';if(root)render();return;}
 rosterLoading=true;const run=++rosterEpoch;
 try{
  const api=window.TornUtilities;if(!api?.requestTorn)throw Error('TU Manager faction API unavailable');
  const results=await Promise.all(ids.map(async id=>{try{const data=await api.requestTorn('/v2/faction/'+id+'/members');if(data?.error)throw Error();const members=membersOf(data);if(!members.length)throw Error();return {id,members};}catch{return {id,members:null};}}));
  if(run!==rosterEpoch||friendly!==ownFactionId()||opposing!==String(state.factionId||''))return;
  rosterError='';for(const {id,members} of results){if(!members){if(id===activeRosterId())rosterError='Roster API unavailable. Cached rows may be stale.';if(id===friendly){ownOnline=null;ownStatusCounts=null;ownMemberCount=null;}if(id===opposing){enemyOnline=null;enemyStatusCounts=null;enemyMemberCount=null;}continue;}
   if(id===opposing){state.targets=rosterRows(members,state.targets);rosterFaction=id;enemyOnline=onlineCount(members);enemyStatusCounts=countStatuses(members);enemyMemberCount=members.length;rosterUpdated=Date.now();}
   if(id===friendly){ownTargets=rosterRows(members,ownTargets);ownRosterFaction=id;ownOnline=onlineCount(members);ownStatusCounts=countStatuses(members);ownMemberCount=members.length;ownRosterUpdated=Date.now();}
  }
  save();void hydrateHealth();void refreshScouter();
 }catch{if(run===rosterEpoch)rosterError='Roster API unavailable. Try again later.';}
 finally{if(run===rosterEpoch){rosterLoading=false;if(root&&!root.hidden)render({background:true});}}
}

let hpWorkerActive=false;
function paintHealth(id){return preservePaint(()=>{
 const t=activeTargets()[id];if(!t||!root)return;
 const label=root.querySelector('[data-hp-id="'+id+'"]'),bar=root.querySelector('[data-hp-bar="'+id+'"]');
 const hasCurrent=t.hp!==undefined&&t.hp!==null&&Number.isFinite(Number(t.hp));
 const hasMaximum=t.maxHp!==undefined&&t.maxHp!==null&&Number.isFinite(Number(t.maxHp))&&Number(t.maxHp)>0;
 const hp=hasCurrent?format(t.hp):'?',max=hasMaximum?format(t.maxHp):'?';
 if(label)label.textContent=hasCurrent||hasMaximum?'HP '+(hasCurrent?(Number(t.hp)===0?'0':compactNumber(Number(t.hp))):'?')+'/'+(hasMaximum?compactNumber(Number(t.maxHp)):'?'):'HP —';if(label)label.title=hasCurrent||hasMaximum?'HP '+hp+'/'+max+' · '+(t.hpSource||'Torn API'):t.hpError||'Profile health unavailable';
 if(bar)bar.style.width=hasCurrent&&hasMaximum?Math.max(0,Math.min(100,100*Number(t.hp)/Number(t.maxHp)))+'%':'0%';
});}
async function hydrateHealth(){
 if(hpWorkerActive)return;
 hpWorkerActive=true;
 const faction=activeRosterId(),viewer=String(identity().id);
 try{
  const api=window.TornUtilities;
  for(const id of Object.keys(activeTargets()).sort((a,b)=>Number(activeTargets()[b]?.status==='Hospital')-Number(activeTargets()[a]?.status==='Hospital'))){
   if(faction!==activeRosterId()||viewer!==String(identity().id)||!root||root.hidden)break;
   const target=activeTargets()[id];if(!target)continue;
   if(target.hpObservedAt&&Date.now()-target.hpObservedAt<600000)continue;
   if(target.hpAttemptAt&&Date.now()-target.hpAttemptAt<120000)continue;
   target.hpAttemptAt=Date.now();
   try{
    const data=await (api.requestWhoTorn?api.requestWhoTorn('/v2/user/'+id+'/profile'):Promise.reject(Error('TU Manager WHO API unavailable')));
    if(faction!==activeRosterId()||viewer!==String(identity().id))break;
    const life=data?.profile?.life??data?.life??data?.profile?.health??data?.health;
    const live=activeTargets()[id];if(!live)continue;
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
    const live=activeTargets()[id];
    if(live){live.hpError=String(error?.message||error);paintHealth(id)}
    console.warn('[TU WHO] HP unavailable for player '+id+': '+String(error?.message||error));
   }
   await new Promise(resolve=>setTimeout(resolve,750));
  }
 }finally{hpWorkerActive=false;if(root&&!root.hidden&&(faction!==activeRosterId()||viewer!==String(identity().id)))void hydrateHealth();}
}
function startRoster(){if(rosterTimer)clearTimeout(rosterTimer);if(!state.factionId&&!ownFactionId())return;refreshRoster();const loop=()=>{rosterTimer=setTimeout(()=>{if(root&&!root.hidden&&(state.factionId||ownFactionId()))refreshRoster();loop()},15000)};loop()}
const scouterNumber=value=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:null;
const compactNumber=value=>{if(scouterNumber(value)===null)return '—';for(const [scale,suffix] of [[1e18,'Qi'],[1e15,'Q'],[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']])if(value>=scale)return String(Number((value/scale).toFixed(2)))+suffix;return String(Number(value.toFixed(2)));};
const ffNumber=value=>scouterNumber(value)===null?null:Number(value.toFixed(2));
function countStatuses(members){const counts={okay:0,hospital:0,travel:0,revivable:0,reviveKnown:0,reviveUnknown:0};for(const member of members){const status=String(member.status?.state||'').toLowerCase();if(typeof member.is_revivable==='boolean'){counts.reviveKnown++;if(member.is_revivable)counts.revivable++;}else counts.reviveUnknown++;if(status==='okay')counts.okay++;else if(status==='hospital')counts.hospital++;else if(['traveling','travelling','abroad'].includes(status))counts.travel++;}return counts;}
function statusTotals(parent,counts){const line=el('div',parent,undefined,'who-status-totals');for(const [key,label,cls] of [['okay','Okay','okay'],['hospital','Hosp','hospital'],['travel','Trvl','travel'],['revivable','Rev','revivable']]){const item=el('span',line,label+' '+(counts?(key==='revivable'?counts.reviveKnown?String(counts.revivable)+(counts.reviveUnknown?'+':''):'—':counts[key]):'—'),'who-total-'+cls);item.dataset.statusCount=key;if(key==='revivable')item.title=counts?counts.revivable+' confirmed revivable; '+counts.reviveUnknown+' unknown.':'Revive availability unknown.';}}
function ffRange(){const min=state.ffMin===''||state.ffMin==null?null:Number(state.ffMin),max=state.ffMax===''||state.ffMax==null?null:Number(state.ffMax);return {min:Number.isFinite(min)&&min>=0?min:null,max:Number.isFinite(max)&&max>=0?max:null};}
function paintScouter(){return preservePaint(()=>{
 if(!root)return;const consent=root.querySelector('[data-scouter-consent]');if(consent&&!consent.disabled)consent.checked=scouterEnabled;for(const node of root.querySelectorAll('[data-scouter-id]')){const value=scouterEnabled?scouterRows[node.dataset.scouterId]:null;node.querySelector('.who-bs-value').textContent=compactNumber(value?.bs);node.querySelector('.who-ff-value').textContent=scouterNumber(value?.ff)===null?'—':value.ff.toFixed(2);node.title='FFScouter estimate · '+(value?.lastUpdated?'updated '+new Date(value.lastUpdated*1000).toLocaleString():'update time unavailable');}
 const text=scouterError||(!scouterAvailable?'Choose and confirm your FFScouter key in Settings.':!scouterEnabled?'FFScouter off · enable for your key in Settings.':scouterPending?'Checking FFScouter…':scouterConfirmed?'FFScouter confirmed for your selected key.':'FFScouter has not confirmed this key.');
 for(const status of root.querySelectorAll('[data-scouter-status]'))status.textContent=text;
 const valid=root.querySelector('[data-scouter-valid]'),confirmed=root.querySelector('[data-scouter-confirmed]');for(const [node,ok,label] of [[valid,scouterAvailable,'Valid Key'],[confirmed,scouterEnabled&&scouterConfirmed,'FFScouter Confirmed']])if(node){node.dataset.valid=String(ok);node.textContent=(ok?'● ':'● ')+label+': '+(ok?'Yes':'No');}
 paintFlights();

});}
function clearFlights(){flightEpoch++;flightRows={};flightPending=false;flightPremium=null;flightError='';flightAvailability={};paintFlights();}
const flightReasonText={arrival:'Return arrival estimate available.',outbound:'Outbound trip; no return-to-Torn ETA.', 'no-current':'FFScouter has no current flight for this player.','not-returned':'FFScouter did not return this player.','unknown-direction':'Provider has not identified a return-to-Torn trip.','no-arrival':'Return trip found, but provider arrival times are unavailable.',expired:'Provider arrival estimate has already passed.','invalid-window':'Provider arrival times are inconsistent or unsupported.'};
function flightSummary(){const counts={};for(const [id,value] of Object.entries(flightAvailability)){if(!/^travel(?:l)?ing$/i.test(activeTargets()[id]?.status||''))continue;const reason=outboundTrip(activeTargets()[id])?'outbound':value.validUntil>Date.now()?value.reason:'expired';counts[reason]=(counts[reason]||0)+1;}const parts=[];for(const [reason,label] of [['arrival','return ETA'],['outbound','outbound'],['no-current','no current flight'],['not-returned','not returned'],['unknown-direction','unknown direction'],['no-arrival','no arrival times'],['expired','expired'],['invalid-window','invalid times']])if(counts[reason])parts.push(counts[reason]+' '+label);return 'FFScouter Premium confirmed · '+(parts.length?parts.join(' · '):'no traveling targets')+'.';}
function flightDetail(id){if(outboundTrip(activeTargets()[id]))return 'Torn reports an outbound trip; no return-to-Torn ETA.';if(!scouterEnabled)return 'Enable FFScouter for your own selected key.';if(flightError)return flightError;if(flightPremium!==true)return flightPremium===false?'Your selected key has no active premium flight access.':'Premium flight access has not been checked.';const value=flightAvailability[id];return value?.validUntil>Date.now()?(flightReasonText[value.reason]||'Flight information unavailable.'):'Flight information is not yet available or needs refreshing.';}
function paintFlights(){return preservePaint(()=>{
 if(!root)return;const now=Date.now()/1000;let shown=0;
 for(const node of root.querySelectorAll('[data-flight-id]')){const id=node.dataset.flightId,value=flightRows[id],travel=/^travel(?:l)?ing$/i.test(activeTargets()[id]?.status||'');const show=!outboundTrip(activeTargets()[id])&&state.mode!=='offline'&&scouterEnabled&&flightPremium===true&&travel&&value&&value.latest>now&&value.validUntil>Date.now();node.hidden=!show;if(!show){node.textContent='';continue;}shown++;
  const early=formatCountdown(Math.ceil(value.earliest-now)),late=formatCountdown(Math.ceil(value.latest-now));node.textContent='ETA '+(value.partial?'~':'')+(value.earliest===value.latest?late:early+'–'+late);node.title='FFScouter Premium · returning to Torn · estimated arrival '+new Date(value.earliest*1000).toLocaleTimeString()+' – '+new Date(value.latest*1000).toLocaleTimeString();
 }
 const provider=root.querySelector('.who-data-footer [data-scouter-status]');if(provider&&scouterEnabled&&scouterConfirmed&&!scouterError)provider.textContent='FFScouter confirmed'+(flightError?' · Flights unavailable':flightPremium===true?' · Premium active · '+shown+' return ETAs':flightPremium===false?' · Premium unavailable':'');
 for(const node of root.querySelectorAll('[data-flight-detail]'))node.textContent='Premium flight: '+flightDetail(node.dataset.flightDetail);
 for(const node of root.querySelectorAll('[data-flight-status]'))node.textContent=state.mode==='offline'?'Offline mode — premium flight requests paused.':flightError||(!scouterEnabled?'Premium return-flight ETA requires FFScouter opt-in.':flightPremium===false?'Return-flight ETA requires active FFScouter Premium on your own key.':flightPremium===true?flightSummary():flightPending?'Checking personal premium flight access…':'Personal premium return-flight ETA appears for current return trips when available.');
});}
async function refreshFlights(){
 if(flightPending||!scouterEnabled||!root||root.hidden||state.mode==='offline'||!window.TornUtilities?.requestWhoScouterFlights)return;
 const ids=Object.keys(activeTargets()).filter(id=>/^travel(?:l)?ing$/i.test(activeTargets()[id]?.status||''));if(!ids.length){flightRows={};flightAvailability={};paintFlights();return;}
 const ticket=++flightEpoch,scope=scouterScope;flightPending=true;paintFlights();
 try{const data=await window.TornUtilities.requestWhoScouterFlights(ids);if(ticket!==flightEpoch||scope!==scouterScope||data.scope!==scope||!scouterEnabled||!root)return;flightRows=Object.fromEntries(data.rows.map(row=>[String(row.playerId),row]));flightPremium=data.premium===true;flightAvailability=Object.fromEntries((data.availability||data.rows.map(row=>({playerId:row.playerId,reason:'arrival',validUntil:row.validUntil}))).map(value=>[String(value.playerId),value]));flightError='';}
 catch(error){if(ticket===flightEpoch){flightRows={};flightAvailability={};flightPremium=null;flightError=error.message||'Premium flight data unavailable.';}}
 finally{if(ticket===flightEpoch){flightPending=false;paintFlights();}}
}
function scouterChanged(){clearFlights();scouterEpoch++;scouterPending=false;scouterRows={};scouterScope=null;scouterEnabled=false;scouterAvailable=false;scouterConfirmed=false;scouterError='';if(root)render();if(root&&!root.hidden)void refreshScouter();}
function identityChanged(){ownTargets={};ownRosterFaction='';ownRosterUpdated=0;ownMemberCount=null;ownStatusCounts=null;ownOnline=null;rosterEpoch++;rosterLoading=false;scouterChanged();if(root&&!root.hidden)startRoster();}
async function refreshScouter(){
 if(scouterPending||!root||root.hidden)return;const api=window.TornUtilities;if(!api?.getWhoScouterState)return;const ticket=++scouterEpoch;scouterPending=true;
 try{const context=await api.getWhoScouterState();if(ticket!==scouterEpoch||!root)return;if(context.scope!==scouterScope){clearFlights();scouterRows={};scouterScope=context.scope;paintScouter();}scouterAvailable=context.available;scouterEnabled=context.enabled;scouterConfirmed=context.confirmed===true;scouterError='';if(state.mode==='offline'){clearFlights();scouterEnabled=false;scouterRows={};scouterError='Offline mode — FFScouter requests paused.';return;}if(!context.enabled){clearFlights();scouterRows={};return;}
  void refreshFlights();
  const ids=Object.keys(activeTargets());if(!ids.length&&context.viewerId)ids.push(String(context.viewerId));if(!ids.length)return;const data=await api.requestWhoScouter(ids);if(ticket!==scouterEpoch||!root||data.scope!==scouterScope)return;const next=Object.fromEntries(data.rows.map(row=>[String(row.playerId),row])),changed=JSON.stringify(next)!==JSON.stringify(scouterRows);scouterRows=next;const checked=await api.getWhoScouterState();if(ticket!==scouterEpoch||!root)return;scouterConfirmed=checked.confirmed===true;
  if(changed&&(sort.startsWith('ff-')||ffRange().min!==null||ffRange().max!==null)&&!root.hidden)render({background:true});else paintScouter();
 }catch(error){if(ticket===scouterEpoch){scouterRows={};scouterConfirmed=false;scouterError=error.message||'FFScouter estimates unavailable.';}}
 finally{if(ticket===scouterEpoch){scouterPending=false;if(root&&tab==='targets'&&(sort.startsWith('ff-')||ffRange().min!==null||ffRange().max!==null))render({background:true});else paintScouter();}}
}
function scouterSettings(parent){
 const section=el('section',parent,undefined,'who-scouter-settings');el('h3',section,'FFScouter');
 el('p',section,'Which API key do you use for FFScouter? Choose a saved TU key, or confirm and save another key. This selection is separate from TU login and War Organizer roster keys.','who-hint');
 const setup=el('p',section,undefined,'who-hint');const setupLink=el('a',setup,'If you need to setup an FFScouter account, follow this link.');setupLink.href='https://ffscouter.com/#get-started';setupLink.target='_blank';setupLink.rel='noopener noreferrer';
 const lights=el('div',section,undefined,'who-key-lights');el('span',lights).dataset.scouterValid='1';el('span',lights).dataset.scouterConfirmed='1';
 const select=dropdown(section,'Saved API keys',[['','Choose your FFScouter key']],'');select.id='tu-who-ff-key';
 const keyStatus=el('p',section,'Loading saved keys…','who-hint');keyStatus.setAttribute('role','status');
 async function loadKeys(){if(!window.TornUtilities.getWhoScouterKeys){keyStatus.textContent='Update the TU Manager to select a separate FFScouter key.';return;}try{const keys=await window.TornUtilities.getWhoScouterKeys();if(!section.isConnected)return;select.replaceChildren();const blank=el('option',select,'Choose your FFScouter key');blank.value='';for(const key of keys){const option=el('option',select,key.label);option.value=key.id;if(key.selected)option.selected=true;}keyStatus.textContent=keys.some(key=>key.selected)?'Selected FFScouter key. Use selected key to recheck with Torn.':keys.length?'Confirm the selected key with Torn before enabling FFScouter.':'No keys saved yet. Enter your FFScouter key below.';}catch{keyStatus.textContent='Saved keys unavailable. Verify your TU session.';}}
 const choose=btn(section,'Use selected key',async()=>{if(!select.value){keyStatus.textContent='Choose a saved key first.';return;}choose.disabled=true;try{await window.TornUtilities.selectWhoScouterKey(select.value); }catch(error){keyStatus.textContent=error.message;}finally{choose.disabled=false;}},'who-ff-select');
 const input=field(section,'Or enter another FFScouter API key','','password');input.id='tu-who-ff-new-key';input.maxLength=16;input.autocomplete='off';input.spellcheck=false;
 const add=btn(section,'Confirm & Save key',async()=>{const key=input.value.trim();input.value='';add.disabled=true;keyStatus.textContent='Verifying key owner and access with Torn…';try{await window.TornUtilities.selectWhoScouterKey(null,key);}catch(error){keyStatus.textContent=error.message;}finally{add.disabled=false;}},'who-ff-add');
 el('p',section,'Valid Key means Torn verified that this key belongs to your current TU player. FFScouter Confirmed turns green only after FFScouter accepts a request. Saving a key does not register it with FFScouter.','who-hint');
 const details=el('details',section,undefined,'who-ff-policy');el('summary',details,'Data sharing and provider policy');
 el('p',details,'Optional: send only your selected FFScouter key and target player IDs directly to FFScouter. FF is personalized and is not shared with other TU users. Estimates are cached in memory for up to ten minutes. FFScouter may log your IP address, retain registered keys/private stats, and use battle/personal stats for AI training. Registration requires provider-approved permissions; a TU public-only key is insufficient.','who-hint');
 const links=el('p',section,undefined,'who-ff-links');for(const [label,url] of [['API Guidance','https://ffscouter.com/api-docs/guidance'],['Data Policy','https://ffscouter.com/#data-policy'],['Privacy Policy','https://ffscouter.com/privacy'],['Support FFScouter','https://ffscouter.com/premium']]){const a=el('a',links,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
 const label=el('label',section,undefined,'who-ff-consent'),toggle=el('input',label);toggle.type='checkbox';toggle.id='tu-who-ff-consent';toggle.dataset.scouterConsent='1';toggle.checked=scouterEnabled;label.append(document.createTextNode(' I have reviewed the current FFScouter API guidance/data policy and allow my selected FFScouter key and target IDs to be sent for confirmation and estimates.'));
 el('p',section,'Premium return-flight ETA is personal to your selected key. Travel target IDs are checked in batches; flight data stays in memory and is never shared. Arrival windows are estimates, not guaranteed landing times.','who-hint');const flightInfo=el('p',section,'','who-hint');flightInfo.dataset.flightStatus='1';
 const info=el('p',section,'','who-hint');info.dataset.scouterStatus='1';info.setAttribute('role','status');
 toggle.onchange=async event=>{toggle.disabled=true;try{const result=await window.TornUtilities.setWhoScouterEnabled(toggle.checked,event);clearFlights();scouterEpoch++;scouterPending=false;scouterRows={};scouterScope=result.scope;scouterEnabled=result.enabled;scouterAvailable=result.available;scouterConfirmed=result.confirmed===true;scouterError='';void refreshScouter();}catch(error){toggle.checked=false;scouterError=error.message;}finally{toggle.disabled=false;paintScouter();}};
 void loadKeys();paintScouter();
}

function ffControls(parent){

 const range=ffRange(),details=el('details',parent,undefined,'who-ff-filters');details.open=!!state.ffFiltersOpen;const summary=el('summary',details,'FF range'+(range.min!==null||range.max!==null?' · '+(range.min??'Any')+' – '+(range.max??'Any'):' · All'));details.ontoggle=()=>{state.ffFiltersOpen=details.open;save();};
 const fields=el('div',details,undefined,'who-ff-fields'),min=field(fields,'Minimum FF',ffDraftMin,'number'),max=field(fields,'Maximum FF',ffDraftMax,'number');for(const input of [min,max]){input.min='0';input.max='10000';input.step='0.01';}min.oninput=()=>ffDraftMin=min.value;max.oninput=()=>ffDraftMax=max.value;
 const status=el('small',details,'Targets without an FF value are hidden while an FF range is active.','who-hint');
 btn(details,'Apply FF filter',()=>{const low=min.value===''?null:Number(min.value),high=max.value===''?null:Number(max.value);if((low!==null&&(!Number.isFinite(low)||low<0||low>10000))||(high!==null&&(!Number.isFinite(high)||high<0||high>10000))||low!==null&&high!==null&&low>high){status.textContent='Enter a valid range with minimum no greater than maximum.';return;}if(!scouterEnabled&&(low!==null||high!==null)){status.textContent='Enable FFScouter in Settings before applying an FF range.';return;}state.ffMin=low??'';state.ffMax=high??'';save();render();},'who-ff-apply');
 btn(details,'Clear FF filter',()=>{state.ffMin='';state.ffMax='';ffDraftMin='';ffDraftMax='';save();render();},'who-ff-clear');
}
function scouterStorage(event){if(event.key==='tu:credentials:revision:v1')identityChanged();else if(event.key==='tu:who:ffscouter:consent:v1')scouterChanged();}
function rememberListPosition(){if(!listNode?.isConnected||root?.hidden||root?.style.display==='none')return;const box=listNode.getBoundingClientRect(),row=[...listNode.querySelectorAll('.who-row[data-player-id]')].find(node=>node.getBoundingClientRect().bottom>box.top+1);listPositions.set(listNode.dataset.side,{top:listNode.scrollTop,id:row?.dataset.playerId,offset:row?row.getBoundingClientRect().top-box.top:0});}
function restoreListPosition(reset=false){if(!listNode?.isConnected||root?.hidden||root?.style.display==='none')return;const position=reset?{top:0}:listPositions.get(listNode.dataset.side)||{top:0};if(listNode.scrollTop!==position.top)listNode.scrollTop=position.top;const row=position.top>0&&position.id?[...listNode.querySelectorAll('[data-player-id]')].find(node=>node.dataset.playerId===position.id):null;if(row){const delta=row.getBoundingClientRect().top-listNode.getBoundingClientRect().top-position.offset;if(Math.abs(delta)>.5)listNode.scrollTop+=delta;}listPositions.set(listNode.dataset.side,{...position,top:listNode.scrollTop});}
function switchFaction(side){if(side==='own'&&!ownFactionId())return;if(side==='opposing'&&!state.factionId){tab='settings';render();return;}rememberListPosition();state.viewSide=side;save();scouterEpoch++;scouterPending=false;scouterRows={};clearFlights();expanded='';render();void refreshScouter();void hydrateHealth();}
function travelDestination(description){const text=String(description||'').trim().replace(/\s+/g,' ');if(/^(?:Returning to Torn(?: from .+)?|Travel(?:l)?ing (?:back )?to Torn(?: from .+)?)\.?$/i.test(text))return 'Torn';return text.match(/^Travel(?:l)?ing from .+? to (.+?)(?:\.)?$/i)?.[1]||text.match(/^Travel(?:l)?ing to (.+?)(?:\.)?$/i)?.[1]||null;}
function outboundTrip(target){const destination=travelDestination(target?.statusDescription);return /^travel(?:l)?ing$/i.test(target?.status||'')&&!!destination&&destination.toLowerCase()!=='torn';}
function travelLabel(target,id){const description=String(target.statusDescription||'').trim().replace(/\s+/g,' ');if(/^travel(?:l)?ing$/i.test(target.status)){const destination=travelDestination(description);if(destination?.toLowerCase()==='torn')return 'Returning → Torn';const returning=flightRows[id]&&flightRows[id].latest>Date.now()/1000&&flightRows[id].validUntil>Date.now()&&scouterEnabled&&flightPremium===true;return destination?'Traveling → '+destination:returning?'Returning → Torn':'Traveling → Unknown';}if(String(target.status).toLowerCase()==='abroad'){const destination=description.match(/^(?:In|Abroad in) (.+?)(?:\.)?$/i)?.[1];return 'Abroad → '+(destination||'Unknown');}return target.status||'Unknown';}

function factionSummary(parent,side,name,online,counts,total){const selected=viewingOwn()===(side==='own'),button=btn(parent,'',()=>switchFaction(side),'who-faction-card'+(selected?' active':''));button.dataset.rosterSide=side;button.setAttribute('aria-pressed',String(selected));const title=el('b',button);el('span',title,name||(side==='own'?'Your faction':'Opposing faction'),'who-faction-name');el('small',title,selected?'✓ VIEWING':'TAP TO VIEW','who-faction-role');el('small',button,'● Online '+(online??'—')+' · '+(total??'—')+' players','who-online');statusTotals(button,counts);}
function dataFooter(content){const footer=el('footer',content,undefined,'who-data-footer'),updated=viewingOwn()?ownRosterUpdated:rosterUpdated;el('div',footer,rosterError||(rosterLoading?'Refreshing roster…':updated?'API updated '+Math.round((Date.now()-updated)/1000)+'s ago · Roster/status: Torn API':'Roster/status: Torn API · awaiting faction data'));const provider=el('div',footer,'','who-provider-status');provider.dataset.scouterStatus='1';provider.setAttribute('role','status');const details=el('details',footer);details.open=!!state.dataNotesOpen;details.ontoggle=()=>{state.dataNotesOpen=details.open;save();};el('summary',details,'Data sources & flight availability');const flightInfo=el('p',details,'','who-hint');flightInfo.dataset.flightStatus='1';el('p',details,'Roster, travel destination and revive availability: Torn API. Health: profile API/user observations when available. Reservations remain local to this device. Premium flight estimates are personal to your selected key and are never shared. Unknown revive values are not counted as No. Rev N+ means some values are unknown.','who-hint');}
function render({resetList=false,background=false}={}){renderingBoard=true;try{
 if(!root)return;rememberListPosition();const oldContent=root.querySelector('.who-content'),previousScroll=oldContent?.scrollTop||0,focused=document.activeElement;const editing=focused&&root.contains(focused)&&focused.matches('input,select');const focusId=editing?focused.id:null,focusSearch=editing&&focused.matches('.who-tools input'),selection=editing&&focused.tagName==='INPUT'?{start:focused.selectionStart,end:focused.selectionEnd}:null;
 if(background&&tab==='settings'){paintScouter();return;}
 const savedList=listNode,savedGrip=root.querySelector('.who-resize-grip');if(savedList?.isConnected)savedList.remove();root.replaceChildren();
 const head=el('header',root,undefined,'who-header');head.style.touchAction='none';const img=el('img',head,undefined,'who-logo');img.src=LOGO;img.alt='TU';el('strong',head,'War Organizer','who-heading');
 const back=btn(head,'←',()=>{rememberListPosition();if(window.TUWindowNavigation?.back)window.TUWindowNavigation.back('tu-who-panel');else ctx?.close?.()},'who-icon');back.title='Back';back.setAttribute('aria-label','Back');const minimize=btn(head,'−',()=>{rememberListPosition();root.hidden=true;root.style.display='none';if(window.TUWindowNavigation?.minimize)window.TUWindowNavigation.minimize('tu-who-panel');else ctx?.minimize?.()},'who-icon');minimize.title='Minimize';minimize.setAttribute('aria-label','Minimize');btn(head,'×',()=>ctx?.close?ctx.close():close(),'who-icon');
 const content=el('div',root,undefined,'who-content'+(tab==='targets'?' who-player-view':''));if(savedGrip)root.append(savedGrip);const fixed=el('div',content,undefined,'who-fixed-controls'),banner=el('div',fixed,undefined,'who-factions');factionSummary(banner,'own',window.TornUtilities?.getFaction?.()?.name||window.TornUtilities?.getPlayer?.()?.factionName,ownOnline,ownStatusCounts,ownMemberCount);factionSummary(banner,'opposing',state.factionName,enemyOnline,enemyStatusCounts,enemyMemberCount);
 const nav=el('div',fixed,undefined,'who-tabs');[['targets','Players'],['assignments','Reservations'],['settings','Settings']].forEach(([id,name])=>btn(nav,name,()=>{tab=id;render()},tab===id?'active':''));const refresh=btn(nav,'↻',()=>refreshRoster(),'who-refresh');refresh.title='Refresh roster';refresh.setAttribute('aria-label','Refresh roster');
 if(tab==='settings'){settings(content);content.scrollTop=previousScroll;if(!directoryLoaded&&!directoryError){loadDirectory().then(()=>{if(root&&tab==='settings')paintDirectory()}).catch(()=>{directoryError='Faction directory unavailable';if(root&&tab==='settings')paintDirectory()});}if(focusId){const next=document.getElementById(focusId);next?.focus({preventScroll:true});if(selection&&next?.setSelectionRange)try{next.setSelectionRange(selection.start,selection.end)}catch{}}return;}
 if(tab==='assignments'){el('h3',content,'Current reservations');const rows=Object.entries(state.reservations);if(!rows.length)el('p',content,'No local reservations.');for(const [id,reservation] of rows){const row=el('div',content,undefined,'who-row');el('span',row,(state.targets[id]?.name||id)+' · '+reservation.name);btn(row,'Details',()=>promptRelease(id,reservation));}el('p',content,'Shared faction reservations and permission verification require backend integration.','who-hint');content.scrollTop=previousScroll;return;}
 const tools=el('div',fixed,undefined,'who-tools'),search=el('input',tools);search.id='tu-who-search';search.placeholder='Search targets';search.setAttribute('aria-label','Search targets');search.value=query;search.oninput=()=>{query=search.value;render({resetList:true});const next=root.querySelector('.who-tools input');next?.focus({preventScroll:true});next?.setSelectionRange(query.length,query.length);};const order=el('select',tools);[['release','Release'],['level','Level'],['name','Name'],['ff-asc','FF ↑'],['ff-desc','FF ↓']].forEach(([value,text])=>{const option=el('option',order,text);option.value=value;});order.value=sort;order.setAttribute('aria-label','Sort targets');order.onchange=()=>{sort=order.value;state.sort=sort;save();render({resetList:true});};
 const filters=el('div',fixed,undefined,'who-filters');[['all','All'],['okay','Okay'],['hospital','Hospital'],['open','Open'],['reserved','Reserved']].forEach(([value,text])=>btn(filters,text,()=>{filter=value;state.statusFilter=filter;save();render({resetList:true});},filter===value?'active':''));ffControls(fixed);
 const roster=activeTargets(),friendly=activeRosterId()===ownFactionId(),entries=Object.entries(roster).filter(([id,target])=>(id.includes(query)||String(target.name||'').toLowerCase().includes(query.toLowerCase()))&&(filter==='all'||filter==='reserved'&&state.reservations[id]||filter==='hospital'&&target.status==='Hospital'||filter==='okay'&&String(target.status).toLowerCase()==='okay'||filter==='open'&&!state.reservations[id]&&isOpen(target)));
 const range=ffRange(),ranged=scouterEnabled&&(range.min!==null||range.max!==null);if(ranged){for(let i=entries.length-1;i>=0;i--){const ff=ffNumber(scouterRows[entries[i][0]]?.ff);if(ff===null||range.min!==null&&ff<range.min||range.max!==null&&ff>range.max)entries.splice(i,1);}}
 entries.sort((a,b)=>{if(sort.startsWith('ff-')){const x=ffNumber(scouterRows[a[0]]?.ff),y=ffNumber(scouterRows[b[0]]?.ff);if(x===null&&y!==null)return 1;if(y===null&&x!==null)return -1;if(x!==null&&y!==null&&x!==y)return sort==='ff-desc'?y-x:x-y;return String(a[1].name).localeCompare(String(b[1].name));}return sort==='name'?String(a[1].name).localeCompare(String(b[1].name)):sort==='level'?Number(b[1].level||0)-Number(a[1].level||0):(seconds(a[1].releaseAt)??999999)-(seconds(b[1].releaseAt)??999999);});
 const count=el('small',fixed,(viewingOwn()?'Own':'Opposing')+' faction · '+entries.length+' / '+Object.keys(roster).length+' players','who-list-count');count.setAttribute('aria-live','polite');listNode=savedList||document.createElement('div');listNode.className='who-list';listNode.dataset.side=viewingOwn()?'own':'opposing';listNode.setAttribute('aria-label','Scrollable player list');listNode.replaceChildren();content.append(listNode);const list=listNode;
 for(const [id,target] of entries){
  const row=el('div',list,undefined,'who-row');row.dataset.playerId=id;const left=el('div',row,undefined,'who-left'),line=el('div',left,undefined,'who-line'),nameGroup=el('div',line,undefined,'who-name-level');const reservation=state.reservations[id],canAttack=!friendly&&(!reservation||own(reservation)||isAdmin()),link=el(friendly||canAttack?'a':'span',nameGroup,target.name||'Player '+id);if(friendly){link.href='https://www.torn.com/profiles.php?XID='+encodeURIComponent(id);link.title='View own-faction player profile';}else if(canAttack)link.href='https://www.torn.com/loader.php?sid=attack&user2ID='+encodeURIComponent(id);else link.title='Reserved by '+(reservation?.name||'another player');link.className='who-player-name';el('small',nameGroup,'L'+(target.level||'?'),'who-level');const hp=el('small',line,'HP —','who-health');hp.dataset.hpId=id;
  const bar=el('div',left,undefined,'who-bar'),fill=el('div',bar);fill.dataset.hpBar=id;fill.style.width='0%';const lower=el('div',left,undefined,'who-player-meta'),status=el('div',lower,undefined,'who-status');const dot=el('span',status,undefined,'who-dot '+({online:'online',idle:'idle',offline:'offline'}[String(target.activity||'').toLowerCase()]||'unknown'));dot.title=target.activity||'Unknown';const hospital=target.status==='Hospital'&&seconds(target.releaseAt)!==null;const statusText=el('span',status,hospital?'Hosp':travelLabel(target,id));statusText.title=target.statusDescription||target.status||'Unknown';if(hospital){const clock=el('span',status,formatCountdown(seconds(target.releaseAt)),'who-countdown');clock.dataset.releaseAt=String(target.releaseAt);clock.title='Time until hospital release';}const eta=el('span',status,'','who-flight-eta');eta.dataset.flightId=id;eta.hidden=true;const revive=el('span',status,target.revivable===true?'Revivable':'','who-revivable');revive.hidden=target.revivable!==true;revive.dataset.revivable=target.revivable===true?'yes':target.revivable===false?'no':'unknown';
  const stats=el('div',lower,undefined,'who-scouter');stats.dataset.scouterId=id;const bs=el('span',stats,'BS ');el('strong',bs,'—','who-bs-value');const ff=el('span',stats,'FF ');el('strong',ff,'—','who-ff-value');const right=el('div',row,undefined,'who-right');if(friendly)btn(right,'Details',()=>{expanded=expanded===id?'':id;render();},'who-member-details');else{const reserve=btn(right,reservation?reservation.name:'Reserve',()=>reservation?promptRelease(id,reservation):reserveTarget(id,target),reservation?'who-reserved':'who-reserve');reserve.dataset.targetId=id;}
  btn(row,expanded===id?'⌃':'⌄',()=>{expanded=expanded===id?'':id;render();},'who-expand');if(expanded===id){row.classList.add('who-expanded');const detail=el('div',list,undefined,'who-detail');el('div',detail,'ID: '+id+' · Battle estimate: '+(scouterRows[id]?.bs?format(scouterRows[id].bs):'Unavailable')+' · FF: '+(scouterRows[id]?.ff?.toFixed(2)||'Unavailable'));if(scouterRows[id]?.lastUpdated)el('div',detail,'FFScouter updated: '+new Date(scouterRows[id].lastUpdated*1000).toLocaleString());el('div',detail,'Status: '+(target.statusDescription||target.status||'Unknown'));el('div',detail,'Source: '+(target.source||'Unknown')+' · Activity: '+(target.activity||'Unknown'));if(target.revivable===true){const reviveInfo=el('div',detail,'Revivable','who-revivable');reviveInfo.dataset.revivable='yes';}if(!friendly)el('div',detail,'Reservation: '+(reservation?.name||'Available'));if(/^travel(?:l)?ing$/i.test(target.status||'')){const flight=el('div',detail);flight.dataset.flightDetail=id;}}
 }
 if(!entries.length)el('p',list,scouterPending&&ranged?'Loading FF estimates…':'No players match the current search and filters.','who-hint');dataFooter(content);if(message)el('div',content,message,'who-message');paintScouter();for(const [id] of entries)paintHealth(id);restoreListPosition(resetList);
 if(focusSearch){search.focus({preventScroll:true});if(selection)search.setSelectionRange(selection.start,selection.end);}
}finally{renderingBoard=false;}}
function isOpen(t){const status=String(t.status||'').toLowerCase();if(status==='okay'||status==='traveling'||status==='travelling'||status==='abroad')return true;const s=seconds(t.releaseAt);return status==='hospital'&&s!==null&&s>0&&s<=state.reservationTimer}
function reserveTarget(id,t){if(activeRosterId()===ownFactionId()){alert('Own-faction players are view-only.');return;}if(!isOpen(t)){const remaining=seconds(t.releaseAt);if(String(t.status||'').toLowerCase()==='hospital'&&remaining!==null&&remaining>state.reservationTimer){const wait=remaining-state.reservationTimer;alert('Reservation is not available yet for '+(t.name||'this player')+'.\nYou can reserve in '+formatCountdown(wait)+'.');}else alert('This player is not currently eligible for reservation.');return;}const who=identity();if(!who.id||!who.name){alert('Verified Torn identity is required to reserve.');return}if(Object.values(state.reservations).filter(r=>Number(r.playerId)===who.id).length>=state.reservationLimit){alert('Your reservation limit has been reached.');return}if(state.reservations[id]){const existing=state.reservations[id];alert('This player is already reserved by '+(existing.name||'another player')+'.');return}state.reservations[id]={playerId:who.id,name:who.name,createdAt:Date.now()};save();render()}
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
function paintDirectory(){const old=root?.querySelector('.who-picker');if(!old)return;const holder=document.createElement('div');picker(holder);old.replaceWith(holder.firstChild);}
function picker(parent){
const wrap=el('div',parent,undefined,'who-picker');
const selected=directory.find(x=>x.id===String(state.factionId));
const choose=btn(wrap,selected?selected.name+' ['+selected.id+']':'Select opposing faction',()=>{pickerOpen=!pickerOpen;render()},'who-picker-trigger');
if(!pickerOpen)return;
const search=el('input',wrap);search.placeholder='Search faction name or ID';search.value=pickerQuery;
const status=el('small',wrap,undefined,'who-hint');
const results=el('div',wrap,undefined,'who-picker-results');
function update(){pickerQuery=search.value;results.replaceChildren();const q=pickerQuery.trim().toLowerCase();const matches=directory.filter(x=>x.name.toLowerCase().includes(q)||x.id.includes(q));status.textContent=directoryLoaded?directory.length+' factions · '+matches.length+' matches'+(matches.length>100?' · first 100 shown':''):directoryError||'Loading faction directory…';for(const item of matches.slice(0,100))btn(results,item.name+' ['+item.id+']',()=>{state.factionId=item.id;state.factionName=item.name;state.targets={};rosterFaction='';enemyOnline=null;enemyStatusCounts=null;rosterUpdated=0;rosterLoading=false;rosterEpoch++;save();pickerOpen=false;pickerQuery='';render();startRoster()},'who-faction-option')}
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
    rosterFaction='';rosterError='';rosterUpdated=0;enemyOnline=null;enemyStatusCounts=null;enemyMemberCount=null;
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
scouterSettings(parent);
el('p',parent,'Faction names and IDs come from the Torn API. The directory is cached for up to 24 hours. Player status comes from the Torn API.','who-hint');
}

function showOrganizer(){if(root)root.style.display='flex';if(window.TUWindowNavigation?.open)window.TUWindowNavigation.open('tu-who-panel');else if(root)root.hidden=false;restoreListPosition();}
function resume(){if(root?.isConnected){showOrganizer();void refreshScouter();}else activate(ctx);}
function activate(context){if(!window.TornUtilities?.isAuthorized?.())return;ctx=context||null;window.addEventListener('tu-player-updated',identityChanged);window.addEventListener('tu-who-key-changed',scouterChanged);window.addEventListener('storage',scouterStorage);if(root?.isConnected){render();showOrganizer();startRoster();return}
root=document.createElement('section');root.id='tu-who-panel';root.dataset.tuModuleNav='1';root.style.cssText='position:fixed;z-index:2147483646;top:40px;left:max(12px,calc((100vw - 600px)/2));width:min(600px,calc(100vw - 24px));height:calc(100vh - 64px);min-width:300px;min-height:260px;background:#11191d;border:1px solid #a58a48;border-radius:12px;color:#e8edf0;font:12px system-ui;box-shadow:0 8px 28px #000b;display:flex;flex-direction:column;overflow:hidden';
stylesheet=document.createElement('style');stylesheet.textContent=`
#tu-who-panel[hidden]{display:none!important}
#tu-who-panel,#tu-who-panel *{box-sizing:border-box}#tu-who-panel{font:12px/1.35 system-ui,sans-serif!important;color:#e8edf0!important}#tu-who-panel .who-header{min-height:46px!important}#tu-who-panel .who-logo{display:block!important;width:32px!important;height:32px!important;max-width:32px!important;max-height:32px!important;min-width:32px!important;min-height:32px!important;object-fit:contain!important}#tu-who-panel .who-heading{font-size:14px!important;line-height:1.2!important;margin:0!important}#tu-who-panel button{font-size:12px!important;line-height:1.2!important;min-height:25px!important}#tu-who-panel .who-icon{font-size:18px!important;min-width:28px!important;max-width:30px!important;padding:3px!important}#tu-who-panel .who-tabs button,#tu-who-panel .who-filters button{background:#28343b!important;color:#dce5e9!important}#tu-who-panel .who-tabs .active,#tu-who-panel .who-filters .active{background:#9c7b3b!important;color:#101417!important}#tu-who-panel .who-factions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}#tu-who-panel .who-factions>div{display:flex!important;flex-direction:column!important;align-items:center!important}#tu-who-panel input,#tu-who-panel select{background:#28343b!important;color:#eee!important;border:1px solid #50606a!important;max-width:100%!important}#tu-who-panel .who-content{width:100%!important}#tu-who-panel .who-reserved{background:#34443c!important;color:#93e2b0!important}#tu-who-panel .who-expand{background:transparent!important;color:#ddd!important}#tu-who-panel button,#tu-who-panel input,#tu-who-panel select{font:inherit}#tu-who-panel button{background:#dfb952;color:#101417;border:0;border-radius:5px;padding:5px 7px;cursor:pointer}#tu-who-panel button:disabled{opacity:.4;cursor:not-allowed}
#tu-who-panel .who-header{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:8px;background:#101417;border-bottom:1px solid #66552f;padding:7px 9px;flex-shrink:0}
#tu-who-panel .who-logo{width:32px;height:32px;object-fit:contain;flex-shrink:0}#tu-who-panel .who-heading{flex:1;color:#f0ce77;font-size:14px}#tu-who-panel .who-icon{background:#283139;color:#f0ce77;font-size:18px;min-width:28px}
#tu-who-panel .who-content{padding:9px;overflow-y:auto!important;overflow-x:hidden!important;min-height:0!important;flex:1 1 auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}#tu-who-panel .who-factions{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;color:#f0ce77}#tu-who-panel .who-factions>div{display:flex;flex-direction:column;gap:3px}#tu-who-panel .who-online{color:#55cc80}
#tu-who-panel .who-hint{font-size:10px;color:#aeb8bd;margin:7px 0}#tu-who-panel .who-tabs,#tu-who-panel .who-filters{display:flex;gap:4px;margin:8px 0}#tu-who-panel .who-tabs button,#tu-who-panel .who-filters button{flex:1;background:#28343b;color:#dce5e9}#tu-who-panel .who-tabs .active,#tu-who-panel .who-filters .active{background:#9c7b3b;color:#101417}
#tu-who-panel .who-tools{display:flex;gap:5px}#tu-who-panel .who-tools input{min-width:0;flex:1}#tu-who-panel input,#tu-who-panel select{background:#28343b;color:#eee;border:1px solid #50606a;border-radius:5px;padding:6px}
#tu-who-panel .who-list{display:flex;flex-direction:column;gap:1px;background:#374149}#tu-who-panel .who-row{background:#1c262d;display:flex;align-items:center;gap:6px;padding:5px 6px;min-height:44px}#tu-who-panel .who-left{min-width:0;flex:1}#tu-who-panel .who-line{display:flex;gap:5px;align-items:center;white-space:nowrap;overflow:hidden}#tu-who-panel .who-line b{overflow:hidden;text-overflow:ellipsis}#tu-who-panel .who-line small,#tu-who-panel .who-health{color:#afbbc2;font-size:10px}#tu-who-panel .who-bar{height:3px;background:#3d4a51;margin-top:3px}#tu-who-panel .who-bar>div{height:100%;background:#63ba8e}
#tu-who-panel .who-right{width:112px;flex-shrink:0;display:flex;flex-direction:column;align-items:stretch;gap:3px}#tu-who-panel .who-status{display:flex;justify-content:flex-end;align-items:center;gap:5px;font-size:10px;white-space:nowrap}#tu-who-panel .who-dot{height:8px;width:8px;border-radius:50%;background:#77828b;flex-shrink:0}#tu-who-panel .who-dot.online{background:#48cd7b}#tu-who-panel .who-dot.idle{background:#e9b84b}#tu-who-panel .who-dot.offline{background:#9aa4ae}#tu-who-panel .who-reserved{background:#34443c;color:#93e2b0}#tu-who-panel .who-expand{background:transparent;color:#ddd;padding:3px}#tu-who-panel .who-detail{padding:7px;background:#2b363e;color:#d4dfe3}#tu-who-panel .who-field{display:block;margin:8px 0;color:#d4dfe3}#tu-who-panel .who-field input,#tu-who-panel .who-field select{display:block;width:100%;margin-top:3px}#tu-who-panel .who-message{color:#e9b84b;padding:5px}#tu-who-panel .who-picker{display:flex;flex-direction:column;gap:5px;margin:5px 0 10px}#tu-who-panel .who-picker-trigger{width:100%;text-align:left!important;background:#28343b!important;color:#f0ce77!important;border:1px solid #6d5b35!important}#tu-who-panel .who-picker-results{max-height:210px;overflow-y:auto;overscroll-behavior:contain;background:#182229;border:1px solid #50606a;border-radius:6px}#tu-who-panel .who-picker-results button{display:block;width:100%;text-align:left!important;background:#202d35!important;color:#e8edf0!important;border-bottom:1px solid #374149!important;border-radius:0!important;padding:8px!important}#tu-who-panel .who-refresh{background:#28343b!important;color:#f0ce77!important}#tu-who-panel .who-field-label{font-weight:600;margin-top:8px}

#tu-who-panel .who-scouter-settings{margin-top:18px;padding-top:14px;border-top:1px solid #59636a;display:flex;flex-direction:column;gap:10px;min-width:0}
#tu-who-panel .who-scouter-settings h3{font-size:16px;line-height:1.3;margin:0}
#tu-who-panel .who-scouter-settings p,#tu-who-panel .who-scouter-settings .who-field{margin:0;line-height:1.45}
#tu-who-panel .who-scouter-settings button{min-height:44px!important;align-self:flex-start}
#tu-who-panel .who-scouter-settings :is(input,select){box-sizing:border-box;max-width:100%;min-width:0;width:100%}
#tu-who-panel .who-key-lights{display:flex;flex-wrap:wrap;gap:8px 14px;font-size:12px}
#tu-who-panel .who-key-lights [data-valid=false]{color:#ff7777}
#tu-who-panel .who-key-lights [data-valid=true]{color:#62d78d}
#tu-who-panel .who-ff-policy summary{cursor:pointer;min-height:36px;display:flex;align-items:center}
#tu-who-panel .who-ff-links{display:flex;flex-wrap:wrap;gap:8px 12px}
#tu-who-panel .who-ff-links a{color:#f0ce77}
#tu-who-panel .who-ff-consent{display:flex;gap:8px;align-items:flex-start;line-height:1.45}
#tu-who-panel .who-scouter-settings .who-ff-consent input{width:22px;min-width:22px;height:22px;flex-shrink:0;margin:0}
#tu-who-panel .who-health .who-status{flex-wrap:wrap;min-width:0;white-space:normal}
#tu-who-panel .who-flight-eta{color:#7fc8ff;white-space:nowrap;font-variant-numeric:tabular-nums}
#tu-who-panel .who-flight-eta[hidden]{display:none!important}
/* Approved compact dual-faction player board. The player list owns its scroll. */
#tu-who-panel .who-content.who-player-view{display:flex;flex-direction:column;overflow:hidden!important;padding:0 8px!important;min-height:0}
#tu-who-panel .who-fixed-controls{flex:none;padding:8px 0 5px;position:relative;border-bottom:1px solid #46515a}
#tu-who-panel .who-factions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;margin:0 0 7px!important}
#tu-who-panel .who-factions .who-faction-card{display:flex!important;flex-direction:column;align-items:stretch;gap:3px;min-width:0;min-height:55px!important;height:auto!important;margin:0!important;padding:6px 5px!important;text-align:left!important;background:#1b272e!important;border:1px solid #3e4b55!important;color:#d7e0e7!important;border-radius:6px!important;white-space:normal}
#tu-who-panel .who-factions .who-faction-card.active{border-color:#c8a64e!important;background:#302d21!important;box-shadow:inset 0 -2px #d3ad4c}
#tu-who-panel .who-faction-card b{display:flex;align-items:baseline;justify-content:space-between;gap:4px;color:#f0ce77;font-size:12px;line-height:1.2;min-width:0}
#tu-who-panel .who-faction-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
#tu-who-panel .who-faction-card .who-faction-role{font-size:8px;white-space:nowrap;flex-shrink:0;color:#c3cbd0}
#tu-who-panel .who-faction-card>.who-online{font-size:9px;line-height:1.2;margin:0;color:#6cd49b}
#tu-who-panel .who-faction-card .who-status-totals{display:flex;justify-content:flex-start;gap:3px;margin:0;font-size:8.5px;line-height:1.2;flex-wrap:nowrap;white-space:nowrap}
#tu-who-panel .who-total-revivable{color:#79d3ad}
#tu-who-panel .who-fixed-controls .who-tabs{display:grid;grid-template-columns:1fr 1fr 1fr 32px;gap:4px;margin:0 0 6px!important}
#tu-who-panel .who-fixed-controls .who-tabs button,#tu-who-panel .who-fixed-controls .who-filters button{padding:0 5px!important;height:30px!important;min-height:30px!important;font-size:11px!important;margin:0!important;border-radius:5px!important}
#tu-who-panel .who-fixed-controls .who-tools{display:grid;grid-template-columns:minmax(0,1fr) 94px;gap:5px;margin:0 0 6px!important}
#tu-who-panel .who-fixed-controls .who-tools input,#tu-who-panel .who-fixed-controls .who-tools select{height:31px!important;min-height:31px!important;line-height:20px!important;padding:4px 8px!important;margin:0!important;width:100%!important;min-width:0!important;box-sizing:border-box;font-size:12px!important;border-radius:5px!important}
#tu-who-panel .who-fixed-controls .who-filters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:0!important}
#tu-who-panel .who-fixed-controls .who-ff-filters{margin:2px 0 0;font-size:10px}
#tu-who-panel .who-fixed-controls .who-ff-filters summary{min-height:22px;height:22px;padding:0;line-height:22px;color:#edcc76}
#tu-who-panel .who-list-count{display:block;text-align:right;color:#b8c4cd;font-size:10px;line-height:14px;margin-top:-19px;pointer-events:none}
#tu-who-panel .who-ff-filters[open]+.who-list-count{margin-top:1px}
#tu-who-panel .who-player-view>.who-list{display:flex;flex-direction:column;gap:0;overflow-y:auto;overscroll-behavior:contain;overflow-anchor:none;flex:1;min-height:0;margin:0!important;padding:4px 0!important;scrollbar-width:thin;scrollbar-color:#6c7780 #172128;background:#11191d}
#tu-who-panel .who-player-view .who-list>.who-row{display:flex;flex:none;align-items:center;min-height:32px!important;padding:3px 5px!important;gap:5px!important;border-bottom:1px solid #a58a48;background:#1d2a32}
#tu-who-panel .who-player-view .who-row .who-left{flex:1;min-width:0}
#tu-who-panel .who-player-view .who-line{display:flex;align-items:baseline;justify-content:space-between;gap:6px;white-space:nowrap;overflow:hidden;line-height:1.3}
#tu-who-panel .who-name-level{display:flex;align-items:baseline;gap:5px;flex:1;min-width:0}
#tu-who-panel .who-player-name{font-size:11px!important;color:#f0ce77!important;text-decoration:underline;text-underline-offset:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#tu-who-panel .who-name-level .who-level{flex-shrink:0;font-size:9px;color:#9aaebc}
#tu-who-panel .who-player-view .who-line .who-health{display:block;margin:0!important;flex:none;min-width:0;color:#d4e2e9;font-size:10px;white-space:nowrap;font-variant-numeric:tabular-nums}
#tu-who-panel .who-player-view .who-row .who-bar{height:2px;margin:2px 0 3px!important;background:#43535d}
#tu-who-panel .who-player-meta{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:5px}
#tu-who-panel .who-player-meta .who-status{display:flex;justify-content:flex-start;align-items:center;flex-wrap:wrap;gap:2px 5px;font-size:9px;line-height:1.3;min-width:0;white-space:normal}
#tu-who-panel .who-player-meta .who-dot{width:6px;height:6px}
#tu-who-panel .who-player-meta .who-countdown{font-size:9px;margin:0!important;color:#f0b85c;font-weight:650}
#tu-who-panel .who-player-meta .who-flight-eta{font-size:9px}
#tu-who-panel .who-revivable{font-size:8.5px;white-space:nowrap;color:#b2bfc7}
#tu-who-panel .who-revivable[data-revivable=yes]{color:#79d3ad}
#tu-who-panel .who-revivable[data-revivable=no]{color:#c3a8a8}
#tu-who-panel .who-player-meta .who-scouter{display:inline-flex;gap:5px;align-items:baseline;justify-content:flex-end;font-size:8.5px;line-height:12px;white-space:nowrap;margin:0;color:#acbac4}
#tu-who-panel .who-player-meta .who-scouter strong{font-size:9px!important}
#tu-who-panel .who-player-view .who-list .who-row .who-right{width:90.9px!important;min-width:90.9px!important;flex:none;gap:0}
#tu-who-panel .who-player-view .who-list .who-row .who-right>button{width:90.9px!important;min-width:90.9px!important;height:27px!important;min-height:27px!important;margin:0!important;padding:0 5px!important;font-size:10px!important;border-radius:4px!important}
#tu-who-panel .who-player-view .who-member-details{background:#2b3d48!important;color:#d9e7ee!important;border:1px solid #516a7b!important}
#tu-who-panel .who-player-view .who-list .who-row .who-expand{width:15px!important;min-width:15px!important;min-height:27px!important;padding:0!important}
#tu-who-panel .who-player-view .who-list .who-detail{flex:none;padding:6px;font-size:10px}
#tu-who-panel .who-data-footer{flex:none;border-top:1px solid #46515a;padding:7px 0 8px;color:#9eafba;font-size:9.5px;line-height:1.5;max-height:28%;overflow:auto;overscroll-behavior:contain}
#tu-who-panel .who-data-footer .who-provider-status{color:#98cdb0}
#tu-who-panel .who-data-footer summary{color:#dfc579;cursor:pointer}
#tu-who-panel .who-data-footer p{margin:3px 0;font-size:9.5px;line-height:1.4}
#tu-who-panel .who-message{flex:none}
@media(min-width:700px){#tu-who-panel .who-player-name{font-size:12px!important}#tu-who-panel .who-player-view .who-line .who-health{font-size:11px}#tu-who-panel .who-player-meta .who-status,#tu-who-panel .who-player-meta .who-flight-eta{font-size:11px}}
@media(max-height:450px){#tu-who-panel .who-fixed-controls{padding-top:3px}#tu-who-panel .who-factions{margin-bottom:3px!important}#tu-who-panel .who-factions .who-faction-card{padding:3px 6px!important;min-height:40px!important}#tu-who-panel .who-fixed-controls .who-tabs{margin-bottom:3px!important}#tu-who-panel .who-data-footer{padding:3px 0;font-size:9px}}


@media(max-height:450px){#tu-who-panel .who-player-view .who-fixed-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:3px 6px}#tu-who-panel .who-player-view .who-factions{grid-column:1/-1;margin:0!important}#tu-who-panel .who-player-view .who-tabs,#tu-who-panel .who-player-view .who-filters{grid-column:1;margin:0!important}#tu-who-panel .who-player-view .who-tools,#tu-who-panel .who-player-view .who-ff-filters{grid-column:2;margin:0!important}#tu-who-panel .who-player-view .who-tools{grid-row:2}#tu-who-panel .who-player-view .who-ff-filters{grid-row:3}#tu-who-panel .who-player-view .who-list-count{position:absolute;right:0;bottom:7px;margin:0}}
#tu-who-panel .who-revivable[hidden]{display:none!important}#tu-who-panel .who-player-view .who-list>.who-row.who-expanded{border-bottom:0}#tu-who-panel .who-player-view .who-list>.who-detail{border-bottom:1px solid #a58a48}
`;document.head.append(stylesheet);
const grip=document.createElement('div');grip.className='who-resize-grip';grip.title='Resize window';grip.style.cssText='position:absolute;right:0;bottom:0;width:25px;height:25px;z-index:5;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,#a58a48 52%,#a58a48 58%,transparent 60%,transparent 72%,#a58a48 74%)';root.append(grip);
const beginGesture=(e,resize)=>{if(e.button!==undefined&&e.button!==0)return;if(!resize&&e.target.closest('button,a,input,select'))return;const rect=root.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,startW=rect.width,startH=rect.height,startL=rect.left,startT=rect.top;const handle=resize?grip:root.querySelector('.who-header');handle.setPointerCapture(e.pointerId);const move=ev=>{const dx=ev.clientX-startX,dy=ev.clientY-startY;if(resize){root.style.width=Math.max(300,Math.min(window.innerWidth-startL,startW+dx))+'px';root.style.height=Math.max(260,Math.min(window.innerHeight-startT,startH+dy))+'px'}else{root.style.left=Math.max(0,Math.min(window.innerWidth-80,startL+dx))+'px';root.style.top=Math.max(0,Math.min(window.innerHeight-46,startT+dy))+'px'}};const done=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',done);handle.removeEventListener('pointercancel',done)};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',done);handle.addEventListener('pointercancel',done)};
root.addEventListener('pointerdown',e=>{if(e.target===grip)beginGesture(e,true);else if(e.target.closest('.who-header'))beginGesture(e,false)});
root.addEventListener('touchmove',()=>{lastUserScroll=Date.now()},{passive:true});root.addEventListener('wheel',()=>{lastUserScroll=Date.now()},{passive:true});document.body.append(root);render();showOrganizer();startRoster();poll=setInterval(()=>{if(!root||root.hidden||tab!=='targets')return;paintFlights();for(const clock of root.querySelectorAll('.who-countdown')){const remaining=seconds(Number(clock.dataset.releaseAt));if(remaining===null)continue;clock.textContent=formatCountdown(remaining);clock.style.color=remaining>0&&remaining<=state.reservationTimer?'#8fe0a8':'#f0b85c';}for(const button of root.querySelectorAll('.who-reserve')){const id=button.dataset.targetId;if(id&&state.targets[id])button.disabled=false;}},1000);
}
function register(){window.TornUtilities?.register?.({id:ID,version:'0.3.26-dev',activate,resume,deactivate:close})}
if(window.TornUtilities)register();else window.addEventListener('torn-utilities-ready',register,{once:true});
})();