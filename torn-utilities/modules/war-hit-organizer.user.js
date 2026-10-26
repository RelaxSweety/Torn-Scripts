// ==UserScript==
// @name         TU War Organizer
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.3.1-dev
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
let root=null,ctx=null,stylesheet=null,tab='targets',filter='all',query='',sort='release',expanded='',message='',poll=null;
let state={};try{state=JSON.parse(localStorage.getItem(STORE)||'{}')}catch{}
state.targets=state.targets||{};state.reservations=state.reservations||{};state.reservationLimit=Number(state.reservationLimit||state.hits||1);state.reservationTimer=Number(state.reservationTimer||5);
const save=()=>localStorage.setItem(STORE,JSON.stringify(state));
const el=(tag,parent,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;if(cls)x.className=cls;if(parent)parent.append(x);return x};
const btn=(parent,txt,fn,cls='')=>{const x=el('button',parent,txt,cls);x.type='button';x.onclick=fn;return x};
const field=(parent,label,value='',type='text')=>{const l=el('label',parent,label,'who-field');const x=el('input',l);x.type=type;x.value=value;return x};
const dropdown=(parent,label,values,value)=>{const l=el('label',parent,label,'who-field'),s=el('select',l);values.forEach(([v,t])=>{const o=el('option',s,t);o.value=v});s.value=value;return s};
const identity=()=>{const api=window.TornUtilities;const i=api?.getIdentity?.()||api?.identity||{};return {id:Number(i.player_id||i.playerId||i.id||0),name:String(i.name||i.player_name||'')}};
const own=(r)=>{const i=identity();return !!i.id&&Number(r.playerId)===i.id};
const isAdmin=()=>false; // Remote moderator/organizer roles not implemented; never assume privileges.
const format=(n)=>Number.isFinite(Number(n))?Number(n).toLocaleString():'—';
const seconds=(t)=>{if(!t)return null;const v=typeof t==='number'?t:Date.parse(t)/1000;return Number.isFinite(v)?Math.ceil(v-Date.now()/1000):null};
function close(){if(poll)clearInterval(poll);poll=null;root?.remove();stylesheet?.remove();stylesheet=null;root=null;ctx=null}
function render(){
if(!root)return;root.replaceChildren();
const head=el('header',root,undefined,'who-header');const img=el('img',head,undefined,'who-logo');img.src=LOGO;img.alt='TU';
el('strong',head,'War Organizer','who-heading');
btn(head,'−',()=>{root.hidden=true;ctx?.minimize?.()},'who-icon');
btn(head,'×',()=>ctx?.close?ctx.close():close(),'who-icon');
const content=el('div',root,undefined,'who-content');
const banner=el('div',content,undefined,'who-factions');
const f1=el('div',banner);el('b',f1,'Chaos Cartel');el('small',f1,'● Online: —','who-online');
const f2=el('div',banner);el('b',f2,state.factionName||'Opposing faction');el('small',f2,'● Online: —','who-online');
el('div',content,'Faction counts pending live roster integration','who-hint');
const nav=el('div',content,undefined,'who-tabs');
[['targets','Targets'],['assignments','Reservations'],['settings','Settings']].forEach(([id,name])=>btn(nav,name,()=>{tab=id;render()},tab===id?'active':''));
if(message)el('div',content,message,'who-message');
if(tab==='settings'){settings(content);return}
if(tab==='assignments'){el('h3',content,'Current reservations');const rows=Object.entries(state.reservations);if(!rows.length)el('p',content,'No local reservations.');rows.forEach(([id,r])=>{const row=el('div',content,undefined,'who-row');el('span',row,(state.targets[id]?.name||id)+' · '+r.name);btn(row,'Details',()=>promptRelease(id,r))});el('p',content,'Shared faction reservations and permission verification require backend integration.','who-hint');return}
const tools=el('div',content,undefined,'who-tools');const search=el('input',tools);search.placeholder='Search targets';search.value=query;search.oninput=()=>{query=search.value;render();const next=root.querySelector('.who-tools input');next?.focus();next?.setSelectionRange(query.length,query.length)};
const order=el('select',tools);[['release','Release'],['level','Level'],['name','Name']].forEach(([v,t])=>{const o=el('option',order,t);o.value=v});order.value=sort;order.onchange=()=>{sort=order.value;render()};
const filters=el('div',content,undefined,'who-filters');[['all','All'],['hospital','Hospital'],['open','Open'],['reserved','Reserved']].forEach(([v,t])=>btn(filters,t,()=>{filter=v;render()},filter===v?'active':''));
const entries=Object.entries(state.targets).filter(([id,t])=>(id.includes(query)||String(t.name||'').toLowerCase().includes(query.toLowerCase()))&&(filter==='all'||filter==='reserved'&&state.reservations[id]||filter==='hospital'&&t.status==='Hospital'||filter==='open'&&!state.reservations[id]&&isOpen(t)));
entries.sort((a,b)=>sort==='name'?String(a[1].name).localeCompare(String(b[1].name)):sort==='level'?Number(b[1].level||0)-Number(a[1].level||0):(seconds(a[1].releaseAt)??999999)-(seconds(b[1].releaseAt)??999999));
const list=el('div',content,undefined,'who-list');
entries.forEach(([id,t])=>{
const row=el('div',list,undefined,'who-row'),left=el('div',row,undefined,'who-left'),line=el('div',left,undefined,'who-line');
el('b',line,t.name||'Player '+id);el('small',line,'L'+(t.level||'?'));
const health=el('div',left,undefined,'who-health');el('small',health,'HP '+format(t.hp)+'/'+format(t.maxHp)+' · '+(t.source||'API'));
const bar=el('div',left,undefined,'who-bar');const fill=el('div',bar);fill.style.width=t.maxHp&&t.hp!==undefined?Math.max(0,Math.min(100,100*t.hp/t.maxHp))+'%':'0%';
const right=el('div',row,undefined,'who-right'),status=el('div',right,undefined,'who-status');
const rem=seconds(t.releaseAt),statusText=t.status==='Hospital'&&rem!==null?(rem>0?'Hospital '+rem+'s':'Release due'):(t.status||'Unknown');
el('span',status,statusText);
const activity=el('span',status,undefined,'who-dot '+({online:'online',idle:'idle',offline:'offline'}[String(t.activity||'').toLowerCase()]||'unknown'));activity.title=t.activity||'Unknown';
const r=state.reservations[id];btn(right,r?r.name:'Reserve',()=>r?promptRelease(id,r):reserve(id,t),r?'who-reserved':'who-reserve').disabled=!r&&!isOpen(t);
btn(row,expanded===id?'⌃':'⌄',()=>{expanded=expanded===id?'':id;render()},'who-expand');
if(expanded===id){const detail=el('div',list,undefined,'who-detail');el('div',detail,'ID: '+id+' · Strength: Unknown');el('div',detail,'Source: '+(t.source||'Unknown')+' · Activity: '+(t.activity||'Unknown'));el('div',detail,'Reservation: '+(r?.name||'Available'))}
});
if(!entries.length)el('p',list,'No matching targets. Add a target in Settings.','who-hint');
el('p',content,'Local development board. No live faction synchronization or automatic roster collection yet.','who-hint');
}
function isOpen(t){const s=seconds(t.releaseAt);return t.status==='Hospital'&&s!==null&&s>0&&s<=state.reservationTimer}
function reserve(id,t){if(!isOpen(t))return;const who=identity();if(!who.id||!who.name){alert('Verified Torn identity is required to reserve.');return}if(Object.values(state.reservations).filter(r=>Number(r.playerId)===who.id).length>=state.reservationLimit){alert('Your reservation limit has been reached.');return}if(state.reservations[id]){render();return}state.reservations[id]={playerId:who.id,name:who.name,createdAt:Date.now()};save();render()}
function promptRelease(id,r){if(!own(r)&&!isAdmin()){alert('Only the reserving player or an authorized moderator/administrator can remove this reservation.');return}if(!confirm('Remove '+r.name+' reservation for '+(state.targets[id]?.name||id)+'?'))return;if(state.reservations[id]?.playerId!==r.playerId)return;delete state.reservations[id];save();render()}
function settings(parent){
el('h3',parent,'War settings');
const fid=field(parent,'Opposing faction ID',state.factionId||'');
const fname=field(parent,'Opposing faction name',state.factionName||'');
const mode=dropdown(parent,'War mode',[['real','Real War'],['offline','Offline Only']],state.mode||'real');
const limit=dropdown(parent,'Reservation Limit',[['1','Single (1 target)'],['2','Double (2 targets)'],['3','Triple (3 targets)']],String(state.reservationLimit));
const timer=field(parent,'Reservation Timer (1–30 seconds before hospital release)',state.reservationTimer,'number');timer.min='1';timer.max='30';timer.step='1';
btn(parent,'Save Settings',()=>{if(fid.value&&!/^\d+$/.test(fid.value)){alert('Invalid faction ID');return}const v=Number(timer.value);if(!Number.isInteger(v)||v<1||v>30){alert('Reservation timer must be 1–30 seconds');return}state.factionId=fid.value;state.factionName=fname.value.slice(0,80);state.mode=mode.value;state.reservationLimit=Number(limit.value);state.reservationTimer=v;save();message='Saved locally. Administrator authorization and faction-wide synchronization are not yet implemented.';render()});
el('p',parent,'Default reservation timer: 5 seconds. Settings are local to this device until administrator roles and backend are implemented.','who-hint');
el('h3',parent,'Development target editor');
const id=field(parent,'Player ID');const name=field(parent,'Player name');const level=field(parent,'Level','','number');const status=dropdown(parent,'Status',[['Hospital','Hospital'],['Okay','Okay'],['Traveling','Traveling'],['Unknown','Unknown']],'Hospital');const activity=dropdown(parent,'Activity',[['Unknown','Unknown'],['Online','Online'],['Idle','Idle'],['Offline','Offline']],'Unknown');
const hp=field(parent,'Current HP','','number'),max=field(parent,'Max HP','','number'),release=field(parent,'Hospital release (ISO time, optional)');
btn(parent,'Add / Update Target',()=>{if(!/^\d+$/.test(id.value)){alert('Numeric player ID required');return}const prev=state.targets[id.value]||{};state.targets[id.value]={...prev,name:name.value.slice(0,80),level:Number(level.value)||0,status:status.value,activity:activity.value,hp:hp.value===''?undefined:Number(hp.value),maxHp:max.value===''?undefined:Number(max.value),releaseAt:release.value||null,source:'API'};save();render()});
Object.entries(state.targets).forEach(([tid,t])=>{const row=el('div',parent,undefined,'who-row');el('span',row,(t.name||tid)+' ['+tid+']');btn(row,'Edit',()=>{id.value=tid;name.value=t.name||'';level.value=t.level||'';status.value=t.status||'Unknown';activity.value=t.activity||'Unknown';hp.value=t.hp??'';max.value=t.maxHp??'';release.value=t.releaseAt||'';id.focus()});btn(row,'Remove',()=>{if(!confirm('Remove target '+tid+'?'))return;delete state.targets[tid];delete state.reservations[tid];save();render()})});
}
function activate(context){if(!window.TornUtilities?.isAuthorized?.())return;ctx=context||null;if(root?.isConnected){root.hidden=false;render();return}
root=document.createElement('section');root.id='tu-who-panel';root.style.cssText='position:fixed;z-index:2147483646;top:10%;left:5%;width:min(560px,90vw);max-height:82vh;background:#11191d;border:1px solid #a58a48;border-radius:12px;color:#e8edf0;font:12px system-ui;box-shadow:0 8px 28px #000b;display:flex;flex-direction:column;overflow:hidden';
stylesheet=document.createElement('style');stylesheet.textContent=`
#tu-who-panel,#tu-who-panel *{box-sizing:border-box}#tu-who-panel{font:12px/1.35 system-ui,sans-serif!important;color:#e8edf0!important}#tu-who-panel .who-header{min-height:46px!important}#tu-who-panel .who-logo{display:block!important;width:32px!important;height:32px!important;max-width:32px!important;max-height:32px!important;min-width:32px!important;min-height:32px!important;object-fit:contain!important}#tu-who-panel .who-heading{font-size:14px!important;line-height:1.2!important;margin:0!important}#tu-who-panel button{font-size:12px!important;line-height:1.2!important;min-height:25px!important}#tu-who-panel .who-icon{font-size:18px!important;min-width:28px!important;max-width:30px!important;padding:3px!important}#tu-who-panel .who-tabs button,#tu-who-panel .who-filters button{background:#28343b!important;color:#dce5e9!important}#tu-who-panel .who-tabs .active,#tu-who-panel .who-filters .active{background:#9c7b3b!important;color:#101417!important}#tu-who-panel .who-factions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}#tu-who-panel .who-factions>div{display:flex!important;flex-direction:column!important;align-items:center!important}#tu-who-panel input,#tu-who-panel select{background:#28343b!important;color:#eee!important;border:1px solid #50606a!important;max-width:100%!important}#tu-who-panel .who-content{width:100%!important}#tu-who-panel .who-reserved{background:#34443c!important;color:#93e2b0!important}#tu-who-panel .who-expand{background:transparent!important;color:#ddd!important}#tu-who-panel button,#tu-who-panel input,#tu-who-panel select{font:inherit}#tu-who-panel button{background:#dfb952;color:#101417;border:0;border-radius:5px;padding:5px 7px;cursor:pointer}#tu-who-panel button:disabled{opacity:.4;cursor:not-allowed}
#tu-who-panel .who-header{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:8px;background:#101417;border-bottom:1px solid #66552f;padding:7px 9px;flex-shrink:0}
#tu-who-panel .who-logo{width:32px;height:32px;object-fit:contain;flex-shrink:0}#tu-who-panel .who-heading{flex:1;color:#f0ce77;font-size:14px}#tu-who-panel .who-icon{background:#283139;color:#f0ce77;font-size:18px;min-width:28px}
#tu-who-panel .who-content{padding:9px;overflow-y:auto;min-height:0;overscroll-behavior:contain}#tu-who-panel .who-factions{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;color:#f0ce77}#tu-who-panel .who-factions>div{display:flex;flex-direction:column;gap:3px}#tu-who-panel .who-online{color:#55cc80}
#tu-who-panel .who-hint{font-size:10px;color:#aeb8bd;margin:7px 0}#tu-who-panel .who-tabs,#tu-who-panel .who-filters{display:flex;gap:4px;margin:8px 0}#tu-who-panel .who-tabs button,#tu-who-panel .who-filters button{flex:1;background:#28343b;color:#dce5e9}#tu-who-panel .who-tabs .active,#tu-who-panel .who-filters .active{background:#9c7b3b;color:#101417}
#tu-who-panel .who-tools{display:flex;gap:5px}#tu-who-panel .who-tools input{min-width:0;flex:1}#tu-who-panel input,#tu-who-panel select{background:#28343b;color:#eee;border:1px solid #50606a;border-radius:5px;padding:6px}
#tu-who-panel .who-list{display:flex;flex-direction:column;gap:1px;background:#374149}#tu-who-panel .who-row{background:#1c262d;display:flex;align-items:center;gap:6px;padding:5px 6px;min-height:44px}#tu-who-panel .who-left{min-width:0;flex:1}#tu-who-panel .who-line{display:flex;gap:5px;align-items:center;white-space:nowrap;overflow:hidden}#tu-who-panel .who-line b{overflow:hidden;text-overflow:ellipsis}#tu-who-panel .who-line small,#tu-who-panel .who-health{color:#afbbc2;font-size:10px}#tu-who-panel .who-bar{height:3px;background:#3d4a51;margin-top:3px}#tu-who-panel .who-bar>div{height:100%;background:#63ba8e}
#tu-who-panel .who-right{width:112px;flex-shrink:0;display:flex;flex-direction:column;align-items:stretch;gap:3px}#tu-who-panel .who-status{display:flex;justify-content:flex-end;align-items:center;gap:5px;font-size:10px;white-space:nowrap}#tu-who-panel .who-dot{height:8px;width:8px;border-radius:50%;background:#77828b;flex-shrink:0}#tu-who-panel .who-dot.online{background:#48cd7b}#tu-who-panel .who-dot.idle{background:#e9b84b}#tu-who-panel .who-dot.offline{background:#9aa4ae}#tu-who-panel .who-reserved{background:#34443c;color:#93e2b0}#tu-who-panel .who-expand{background:transparent;color:#ddd;padding:3px}#tu-who-panel .who-detail{padding:7px;background:#2b363e;color:#d4dfe3}#tu-who-panel .who-field{display:block;margin:8px 0;color:#d4dfe3}#tu-who-panel .who-field input,#tu-who-panel .who-field select{display:block;width:100%;margin-top:3px}#tu-who-panel .who-message{color:#e9b84b;padding:5px}
`;document.head.append(stylesheet);
document.body.append(root);render();poll=setInterval(()=>{if(root&&!root.hidden&&tab==='targets'&&Object.values(state.targets).some(t=>t.status==='Hospital'&&t.releaseAt))render()},1000);
}
function register(){window.TornUtilities?.register?.({id:ID,version:'0.3.1-dev',activate, deactivate:close})}
if(window.TornUtilities)register();else window.addEventListener('torn-utilities-ready',register,{once:true});
})();