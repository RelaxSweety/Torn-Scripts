// ==UserScript==
// @name         Torn Utilities PDA
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.4.10
// @description  Movable TU launcher and module catalog for Torn PDA
// @author       RelaxSweety [4539436]
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/core/pda/torn-utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/core/pda/torn-utilities.user.js
// ==/UserScript==
(() => {
  'use strict';
  if (window.__RELAX_TORN_UTILITIES_PDA__) return;
  window.__RELAX_TORN_UTILITIES_PDA__ = true;
  const KEY = 'relaxsweety_tu_pda_v1';
  const TU_VERSION='0.4.10';
  const REGISTRY_URL='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules.json';
  const CACHE_KEY='tu:registry:v1';
  const FALLBACK={schemaVersion:1,categories:[
    {id:'business',name:'Business Tools',icon:'▥',order:10},
    {id:'games',name:'Games',icon:'♜',order:20},
    {id:'single-player',name:'Single Player',icon:'▣',order:21,parent:'games'},
    {id:'multiplayer',name:'Multiplayer',icon:'♟',order:22,parent:'games'},
    {id:'chat',name:'Chat Tools',icon:'◉',order:30},
    {id:'other',name:'Other Tools',icon:'⚙',order:40}
  ],modules:[
    {id:'alerts-calculations',name:'Alerts and Calculations',category:'business',version:'0.2.0',description:'Stock cash targets, foreign item alerts and calculator',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/alerts-and-calculations.user.js'},
    {id:'flight-game',name:'Flight Game',category:'single-player',version:'0.11.13',description:'Flight arcade and Stick Fighter',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/pda-flight-game/Torn-PDA-Flight-Game.user.js'},
    {id:'stick-fighter',name:'Stick Fighter',category:'single-player',version:'0.1.6',description:'Stick Fighter arcade game',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/pda-flight-game/Torn-PDA-Flight-Game.user.js'},
    {id:'chat-archiver',name:'Chat Archiver',category:'chat',version:'0.1.7',description:'Archive Torn chat conversations',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/chat-archiver/pda/src/torn-multi-chat-archiver-pda.user.js'}
  ]};
  const validId=/^[a-z0-9-]{1,64}$/;
  const safeScriptUrl=url=>typeof url==='string'&&/^https:\/\/raw\.githubusercontent\.com\/RelaxSweety\/Torn-Scripts\/main\/[a-zA-Z0-9/_-]+\.user\.js$/.test(url);
  function validateRegistry(data){
    if(data?.schemaVersion!==1||!Array.isArray(data.categories)||!Array.isArray(data.modules)||data.modules.length>250||data.categories.length>50)throw Error('Invalid module catalog');
    const categories=data.categories.filter(c=>validId.test(c.id)&&typeof c.name==='string'&&c.name.length<=70).map(c=>({id:c.id,name:c.name,icon:String(c.icon||'•').slice(0,3),order:Number(c.order)||100,parent:typeof c.parent==='string'?c.parent:null}));
    const ids=new Set(categories.map(c=>c.id));
    const modules=data.modules.filter(m=>validId.test(m.id)&&ids.has(m.category)&&typeof m.name==='string'&&m.name.length<=90&&safeScriptUrl(m.scriptUrl)&&/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(m.version)).map(m=>({id:m.id,name:m.name,category:m.category,version:m.version,description:String(m.description||'').slice(0,250),scriptUrl:m.scriptUrl}));
    // Migrate older cached catalogs even when GitHub is temporarily unreachable.
    const gameCategory=categories.find(c=>c.id==='games');
    if(gameCategory){
      for(const [id,name,icon,order] of [['single-player','Single Player','▣',21],['multiplayer','Multiplayer','♟',22]]){
        const found=categories.find(c=>c.id===id);
        if(found)found.parent='games';
        else categories.push({id,name,icon,order,parent:'games'});
      }
      for(const m of modules)if(m.category==='games')m.category=['tic-tac-toe','torn-four','torn-fleet'].includes(m.id)?'multiplayer':'single-player';
    }
    return {schemaVersion:1,categories,modules};
  }
  let registry=FALLBACK,registryStatus='Built-in catalog';
  try{const cached=localStorage.getItem(CACHE_KEY);if(cached){registry=validateRegistry(JSON.parse(cached));registryStatus='Cached catalog';}}catch(_){}
  const versionCompare=(a,b)=>{
    const aa=String(a||'0').split('.').map(v=>parseInt(v,10)||0),bb=String(b||'0').split('.').map(v=>parseInt(v,10)||0);
    for(let i=0;i<3;i++)if(aa[i]!==bb[i])return (aa[i]||0)-(bb[i]||0);
    return 0;
  };
  async function refreshRegistry(){
    registryStatus='Refreshing catalog';render(currentTab);
    try{
      const url=REGISTRY_URL+'?t='+Date.now();
      const get=async()=>{
        if(typeof PDA_httpGet==='function'){
          try{
            const response=await PDA_httpGet(url);
            const raw=typeof response==='string'?response:(response?.responseText??response?.data??response?.body??response?.response);
            if(typeof raw==='string'&&raw.trim())return raw;
            if(raw&&typeof raw==='object')return raw;
          }catch(e){console.warn('[TU] PDA catalog bridge failed; trying fetch',e);}
        }
        const response=await fetch(url,{cache:'no-store'});
        if(!response.ok)throw Error('HTTP '+response.status);
        return await response.text();
      };
      const raw=await Promise.race([get(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Catalog timeout')),12000))]);
      const next=validateRegistry(typeof raw==='string'?JSON.parse(raw):raw);
      registry=next;localStorage.setItem(CACHE_KEY,JSON.stringify(next));
      registryStatus='GitHub catalog updated';
    }catch(e){registryStatus='Catalog unavailable · using cached list';console.warn('[TU] catalog refresh failed',e);}
    render(currentTab);
  }
  // Lifecycle API: modules register inert factories; only this manager calls activate().
  const registered = new Map();
  let active = null;
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
      if(!VALID_ID.test(id)||!records||typeof records!=='object'||Array.isArray(records))throw new Error('Invalid module data');
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
  // Shared player identity: only Torn-provided data, never manual username entry.
  const PLAYER_KEY='tu:manager:player:v1';
  const profilePattern=/\/profiles\.php(?:\?|$)/i;
  const playerIdFrom=url=>{try{const u=new URL(url,location.origin);const id=u.searchParams.get('XID');return /^\d+$/.test(id||'')?id:null}catch{return null}};
  const validPlayerName=name=>{name=String(name||'').trim();return /^[a-zA-Z0-9_-]{2,32}$/.test(name)&&!(/^(view|profile|player|viewprofile)$/i.test(name))?name:null};
  let playerInfo=null;
  try{const cached=JSON.parse(localStorage.getItem(PLAYER_KEY)||'null');if(cached?.id&&validPlayerName(cached.name))playerInfo=cached}catch{}
  const playerFromPage=()=>{
    const make=(id,name)=>({id,name,profileUrl:'https://www.torn.com/profiles.php?XID='+id,updatedAt:Date.now()});
    // The Home > General Information > Name row contains "Username [ID]".
    // Only read this row on the player's own Home page, not arbitrary profile links.
    if(location.pathname==='/'||/\/index\.php$/i.test(location.pathname)){
      for(const cell of document.querySelectorAll('td,th,div,span')){
        if(cell.children.length>2||cell.textContent.trim()!=='Name')continue;
        const row=cell.closest('tr')||cell.parentElement;
        if(!row||!row.textContent.includes('Name'))continue;
        const value=row.querySelector('a[href*="profiles.php?XID="]')||row.querySelector('a');
        const match=value?.textContent?.trim().match(/^([a-zA-Z0-9_-]{2,32})\s*\[(\d+)\]$/);
        if(match&&validPlayerName(match[1]))return make(match[2],match[1]);
      }
    }
    // A directly visited profile can identify its owner only if the page itself
    // exposes an unambiguous username and matching XID.
    if(!profilePattern.test(location.pathname))return null;
    const id=playerIdFrom(location.href);
    if(!id)return null;
    for(const el of document.querySelectorAll('h1,h2,[class*="profileName"],[class*="playerName"]')){
      const raw=el.textContent.trim();
      const match=raw.match(/^([a-zA-Z0-9_-]{2,32})\s*\[(\d+)\]$/);
      if(match&&match[2]===id&&validPlayerName(match[1]))return make(id,match[1]);
    }
    return null;
  };
  const updatePlayer=()=>{
    const next=playerFromPage();
    if(!next)return false;
    if(playerInfo?.id===next.id&&playerInfo?.name===next.name)return true;
    playerInfo=next;localStorage.setItem(PLAYER_KEY,JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('tu-player-updated',{detail:{...next}}));
    return true;
  };
  const getPlayer=()=>playerInfo?Object.freeze({...playerInfo}):null;
  const openProfileHelp=()=>{
    if(playerInfo)return;
    if(document.getElementById('tu-profile-help'))return;
    const notice=document.createElement('div');notice.id='tu-profile-help';
    notice.style.cssText='position:fixed;bottom:70px;right:12px;z-index:2147483647;background:#20252e;color:white;border:1px solid #d6b96a;border-radius:10px;padding:12px;max-width:290px;font:13px system-ui;box-shadow:0 4px 20px #0009';
    const title=document.createElement('div');title.textContent='TU could not identify your Torn player. Open Torn Home and let TU read the General Information > Name row. If needed, open your own profile afterward.';notice.append(title);
    const link=document.createElement('a');link.textContent='Open Torn Home';link.href='https://www.torn.com/index.php';link.style.cssText='display:inline-block;color:#f1ce72;margin-top:10px;text-decoration:underline';notice.append(link);
    const dismiss=document.createElement('button');dismiss.textContent='Later';dismiss.style.cssText='margin-left:12px;padding:5px';dismiss.onclick=()=>notice.remove();notice.append(dismiss);document.body.append(notice);
  };
  updatePlayer();
  window.addEventListener('popstate',()=>setTimeout(updatePlayer,200));
  let profileChecks=0;const profilePoll=setInterval(()=>{updatePlayer();if(++profileChecks>=20)clearInterval(profilePoll)},1500);
  const api = Object.freeze({
    storage,
    getPlayer,
    requestPlayerProfile:openProfileHelp,
    register(def) {
      if (!def || typeof def.id !== 'string' || !/^[a-z0-9-]+$/.test(def.id) ||
          typeof def.activate !== 'function' || typeof def.deactivate !== 'function' ||
          registered.has(def.id)) return false;
      registered.set(def.id, Object.freeze({id:def.id, version:typeof def.version==='string'?def.version:null, activate:def.activate, deactivate:def.deactivate}));
      if (typeof render === 'function') render(currentTab);
      return true;
    },
    isRegistered(id) { return registered.has(id); },
    isActive(id) { return active === id; }
  });
  Object.defineProperty(window, 'TornUtilities', {value:api, configurable:false, writable:false});
  window.dispatchEvent(new Event('torn-utilities-ready'));
  let currentTab='modules';
  // PDA Scripts installs modules independently; TU only manages registered modules.
  function stopModule() {
    if (!active) return;
    const id=active; active=null;
    try { registered.get(id)?.deactivate(); } catch(e) { console.error('[TU] module cleanup failed', id, e); }
    moduleHost.replaceChildren(); moduleHost.hidden=true;
  }
  function openModule(id) {
    const mod=registered.get(id);
    if (!mod || saved.disabled?.[id]) return false;
    stopModule();
    moduleHost.hidden=false;
    try {
      active=id;
      mod.activate(Object.freeze({mount:moduleHost, close:stopModule}));
      return true;
    } catch(e) {
      console.error('[TU] module activation failed', id, e);
      try { mod.deactivate(); } catch {}
      moduleHost.replaceChildren(); moduleHost.hidden=true;
      return false;
    }
  }
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} };
  const style = document.createElement('style');
  style.textContent = `
#tu-pda-launcher{position:fixed;left:12px;top:38%;z-index:2147483645;touch-action:none;width:43px;height:43px;border-radius:50%;border:2px solid #e3bb57;background:radial-gradient(circle at 35% 25%,#293b45,#07090b 70%);color:#f5d87e;box-shadow:0 2px 9px #000b,inset 0 0 4px #f5d87e66;font:bold italic 23px 'Palatino Linotype','Book Antiqua',Georgia,serif;letter-spacing:-2px;padding:0 2px 0 0;display:flex;align-items:center;justify-content:center;line-height:1;cursor:grab;user-select:none;-webkit-user-select:none}
#tu-pda-launcher:active{cursor:grabbing}
#tu-pda-launcher[hidden]{display:none!important}
#tu-pda-panel{position:fixed;z-index:2147483644;inset:8% 3% auto 3%;max-width:440px;margin:auto;max-height:82vh;overflow:auto;background:#101417;color:#eee;border:1px solid #c49a46;border-radius:18px;box-shadow:0 10px 35px #000d;font:14px system-ui,Arial,sans-serif}
#tu-pda-panel[hidden]{display:none}
#tu-pda-panel *{box-sizing:border-box}
#tu-pda-panel header{display:flex;align-items:center;gap:12px;padding:17px;border-bottom:1px solid #4a3c21}
#tu-pda-panel .tu-logo{font:bold italic 29px Georgia,serif;color:#f1ce72}
#tu-pda-panel h2{font-size:22px;margin:0;color:#f1ce72}
#tu-pda-panel p{margin:4px 0;color:#aeb4bd}
#tu-pda-panel button{cursor:pointer}
#tu-pda-panel .tu-close{margin-left:auto;background:none;border:0;color:#ddd;font-size:28px}
#tu-pda-panel nav{display:flex;gap:6px;padding:10px}
#tu-pda-panel nav button{flex:1;background:#252a2e;border:0;color:#ddd;padding:11px 4px;border-radius:20px}
#tu-pda-panel nav button[aria-selected=true]{background:#dfb952;color:#141414;font-weight:700}
#tu-pda-panel .tu-content{padding:4px 12px 16px}
#tu-pda-panel .tu-card{padding:13px;display:flex;align-items:center;gap:12px;background:#1c2226;border:1px solid #32383b;border-radius:12px;margin:9px 0}
#tu-pda-panel .tu-symbol{font-size:25px;color:#e1b95a;min-width:30px}
#tu-pda-panel .tu-card strong{display:block;font-size:16px}
#tu-pda-panel .tu-card small{color:#b6bac0}
#tu-pda-panel .tu-status{margin-left:auto;white-space:nowrap;color:#a9abb0;font-size:11px}
#tu-pda-panel footer{border-top:1px solid #59451d;padding:13px;color:#aeb4bd;font-size:12px}
`;
  document.head.appendChild(style);
  const launcher = document.createElement('button');
  launcher.id = 'tu-pda-launcher';
  launcher.type = 'button';
  launcher.textContent = 'TU';
  launcher.setAttribute('aria-label', 'Open Torn Utilities; drag to reposition');
  document.body.appendChild(launcher);
  const panel = document.createElement('section');
  panel.id = 'tu-pda-panel';
  panel.hidden = true;
  panel.innerHTML = '<header><span class="tu-logo">TU</span><div><h2>Torn Utilities</h2><p>Modular Tools for Torn City</p></div><button class="tu-close" aria-label="Close">×</button></header><nav><button data-tab="modules" aria-selected="true">Modules</button><button data-tab="settings">Settings</button><button data-tab="about">About</button></nav><div class="tu-content"></div><footer>Torn Utilities v0.4.10 (PDA)</footer>';
  document.body.appendChild(panel);
  const content = panel.querySelector('.tu-content');
  function makeButton(label,handler,disabled=false) {
    const btn=document.createElement('button');btn.type='button';btn.textContent=label;
    btn.disabled=disabled;
    btn.style.cssText='margin-left:auto;padding:8px 10px;border-radius:8px;border:0;background:#dfb952;color:#111;white-space:nowrap;font-weight:600;'+(disabled?'opacity:.5;':'');
    if(handler)btn.addEventListener('click',handler);
    return btn;
  }
  let viewCategory=null,viewModule=null;
  const goModules=()=>{viewCategory=null;viewModule=null;render('modules');};
  const addLink=(label,url)=>{
    const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';
    a.style.cssText='color:#f1ce72;text-decoration:underline;display:inline-block;margin:8px 10px 8px 0';content.append(a);
  };
  const addSocialIcon=(name,url,svgPath,viewBox='0 0 24 24')=>{
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
    a.title=name;a.setAttribute('aria-label',name);
    a.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:50px;height:48px;margin:12px 14px 4px 0;background:#252a2e;border:1px solid #806a3e;border-radius:12px;color:#f1ce72';
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',viewBox);svg.setAttribute('width','30');svg.setAttribute('height','30');svg.setAttribute('fill','currentColor');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',svgPath);svg.append(path);a.append(svg);content.append(a);
  };
  const addSectionHeader=(back,label)=>{
    const bar=document.createElement('div');bar.style.cssText='display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0 14px';
    const btn=makeButton('← '+back.label,back.action);btn.style.marginLeft='0';btn.style.flex='0 0 auto';bar.append(btn);
    const h=document.createElement('h3');h.textContent=label;h.style.cssText='margin:0;font-size:18px;min-width:0;overflow-wrap:anywhere';bar.append(h);content.append(bar);
  };
  function render(tab) {
    currentTab=tab;
    panel.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
    content.replaceChildren();
    if(tab==='modules'){
      if(viewModule){
        const m=registry.modules.find(x=>x.id===viewModule);
        if(!m){viewModule=null;return render('modules');}
        addSectionHeader({label:'Back',action:()=>{viewModule=null;render('modules');}},m.name);
        const p=document.createElement('p');p.textContent=m.description;content.append(p);
        const reg=registered.get(m.id),loaded=!!reg,disabled=!!saved.disabled?.[m.id];
        const installed=reg?.version||'Unknown (module does not report version)';
        const status=document.createElement('p');
        status.textContent='Status: '+(!loaded?'Not loaded':disabled?'Loaded · disabled':'Ready')+' | Installed: '+(loaded?installed:'Not installed')+' | Latest: '+m.version;
        content.append(status);
        if(loaded&&reg.version&&versionCompare(reg.version,m.version)<0){const u=document.createElement('p');u.textContent='Update available';content.append(u);}
        if(loaded){
          content.append(makeButton(disabled?'Enable module':'Disable module',()=>{
            saved.disabled ||= {};saved.disabled[m.id]=!disabled;
            if(!disabled&&active===m.id)stopModule();
            persist();render('modules');
          }));
        }
        content.append(makeButton(loaded?'Copy update URL':'Copy install URL',()=>{
          if(navigator.clipboard?.writeText)navigator.clipboard.writeText(m.scriptUrl).then(()=>alert('Script URL copied')).catch(()=>prompt('Copy script URL',m.scriptUrl));
          else prompt('Copy script URL',m.scriptUrl);
        }));
        addLink('View script on GitHub',m.scriptUrl.replace('raw.githubusercontent.com/','github.com/').replace('/main/','/blob/main/'));
        const help=document.createElement('p');help.textContent='Copy the script URL, add or update it in Torn PDA Scripts, then reload Torn. TU cannot install scripts automatically.';content.append(help);
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
          const count=document.createElement('small');count.textContent=mods.length+' available · '+mods.filter(m=>registered.has(m.id)).length+' loaded';
          body.append(name,count);const go=()=>{viewCategory=group.id;render('modules');};
          card.append(symbol,body,makeButton('Open →',go));content.append(card);
        }
        const modules=registry.modules.filter(m=>m.category===viewCategory);
        if(!modules.length&&!subcategories.length){const p=document.createElement('p');p.textContent='No published modules yet';content.append(p);}
        for(const m of modules){
          const card=document.createElement('div');card.className='tu-card';
          const body=document.createElement('div');body.style.flex='1;min-width:0';
          const name=document.createElement('strong');name.textContent=m.name;
          const loaded=registered.get(m.id);
          const state=document.createElement('small');
          state.textContent=(loaded?(saved.disabled?.[m.id]?'Loaded · disabled':'Ready'):'Not loaded')+' · Latest v'+m.version+(loaded?.version?' · Installed v'+loaded.version:'');
          body.append(name,state);
          const ready=!!loaded&&!saved.disabled?.[m.id];
          const go=()=>{if(ready){if(openModule(m.id)){panel.hidden=true;syncLauncher();}}else{viewModule=m.id;render('modules');}};
          card.style.cursor='pointer';card.setAttribute('role','button');card.tabIndex=0;
          card.addEventListener('click',e=>{if(e.target.closest('button'))return;go();});
          card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
          card.append(body,makeButton(ready?'Open →':'Details →',go));content.append(card);
        }
      }else{
        const status=document.createElement('p');status.textContent='TU v'+TU_VERSION+' · '+registryStatus;content.append(status);
        const categories=registry.categories.filter(c=>!c.parent).sort((a,b)=>a.order-b.order);
        for(const group of categories){
          const card=document.createElement('div');card.className='tu-card';
          const icon=document.createElement('span');icon.className='tu-symbol';icon.textContent=group.icon;
          const body=document.createElement('div');body.style.flex='1';
          const title=document.createElement('strong');title.textContent=group.name;
          const count=document.createElement('small');const children=registry.categories.filter(c=>c.parent===group.id).map(c=>c.id);const mods=registry.modules.filter(m=>m.category===group.id||children.includes(m.category));
          count.textContent=mods.length+' available · '+mods.filter(m=>registered.has(m.id)).length+' loaded';
          body.append(title,count);card.append(icon,body,makeButton('Open →',()=>{viewCategory=group.id;render('modules');}));content.append(card);
        }
        const refreshRow=document.createElement('div');refreshRow.style.cssText='display:flex;justify-content:flex-end;margin:16px 0 4px';
        const refresh=makeButton('↻ Refresh catalog',refreshRegistry);refresh.style.marginLeft='0';refreshRow.append(refresh);content.append(refreshRow);
      }
    }else if(tab==='settings'){
      const heading=document.createElement('strong');heading.textContent='Storage & Backups';content.append(heading);
      const summary=document.createElement('p');
      const spaces=storage.namespaces();
      summary.textContent=spaces.length+' module data namespace(s): '+(spaces.join(', ')||'none')+'. Data remains when modules are disabled or removed.';
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
      const privacy=document.createElement('p');privacy.textContent='Backups contain TU-managed settings and module data only. Large archives and legacy storage are not included.';content.append(privacy);
      for(const id of spaces){
        const line=document.createElement('div');line.className='tu-card';
        const name=document.createElement('span');name.textContent=id+' ('+storage.keys(id).length+' keys)';name.style.flex='1';
        line.append(name,makeButton('Clear data',()=>{if(confirm('Delete all TU data for '+id+'?')){storage.clear(id);render('settings');}}));content.append(line);
      }
    }else{
      const p=document.createElement('p');p.textContent='Torn Utilities v0.4.10 by RelaxSweety [4539436]. Drag TU to reposition. Modules are installed separately in Torn PDA Scripts.';content.append(p);
      // Official-style vector marks; no remote image dependencies.
      addSocialIcon('RelaxSweety on Discord','https://discord.com/users/relaxsweety','M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.1 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.075.075 0 0 0-.041-.104 13.1 13.1 0 0 1-1.872-.89.076.076 0 0 1-.008-.127c.126-.095.252-.193.372-.292a.074.074 0 0 1 .077-.01c3.929 1.793 8.185 1.793 12.068 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.292a.076.076 0 0 1-.007.127c-.598.35-1.224.65-1.873.89a.076.076 0 0 0-.04.105c.36.698.77 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.83 19.83 0 0 0 6.003-3.03.077.077 0 0 0 .031-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z');
      const tornLink=document.createElement('a');tornLink.href='https://www.torn.com/profiles.php?XID=4539436';tornLink.target='_blank';tornLink.rel='noopener noreferrer';tornLink.title='RelaxSweety on Torn';tornLink.setAttribute('aria-label','RelaxSweety on Torn');
      tornLink.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:50px;height:48px;margin:12px 14px 4px 0;background:#252a2e;border:1px solid #806a3e;border-radius:12px';
      const tornLogo=document.createElement('img');tornLogo.src='https://www.torn.com/favicon.ico';tornLogo.alt='Torn';tornLogo.width=30;tornLogo.height=30;tornLink.append(tornLogo);content.append(tornLink);
    }
  }
  render('modules');
  refreshRegistry();
  if(!getPlayer())setTimeout(openProfileHelp,1800);
  window.addEventListener('torn-utilities-ready',()=>render(currentTab));
  // A module script can be installed separately, but remains inert until Open is pressed.

  const isVisible=id=>{
    const el=document.getElementById(id);
    return !!el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  };
  const syncLauncher=()=>{
    const moduleVisible=!!active&&['tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tca-panel','tca-playbar','tuac-panel'].some(isVisible);
    const hide=!panel.hidden||moduleVisible;
    if(launcher.hidden!==hide)launcher.hidden=hide;
  };
  const closePanel = () => { panel.hidden = true; syncLauncher(); };
  const togglePanel = () => { if(active){const mod=registered.get(active);try{mod?.activate(Object.freeze({mount:moduleHost,close:stopModule}));}catch(e){console.error('[TU] restore failed',e);}panel.hidden=true;}else panel.hidden=!panel.hidden; syncLauncher(); };
  panel.querySelector('.tu-close').addEventListener('click', () => { closePanel(); });
  panel.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => render(b.dataset.tab)));
  const visibilityObserver=new MutationObserver(syncLauncher);
  visibilityObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden','class']});
  syncLauncher();
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const setPos = (x, y) => {
    launcher.style.left = clamp(x, 0, Math.max(0, innerWidth - launcher.offsetWidth)) + 'px';
    launcher.style.top = clamp(y, 0, Math.max(0, innerHeight - launcher.offsetHeight)) + 'px';
  };
  if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPos(saved.x, saved.y);
  let gesture = null;
  launcher.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    gesture = {id:e.pointerId, sx:e.clientX, sy:e.clientY, x:launcher.offsetLeft, y:launcher.offsetTop, moved:false};
    launcher.setPointerCapture(e.pointerId);
  });
  launcher.addEventListener('pointermove', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const dx=e.clientX-gesture.sx, dy=e.clientY-gesture.sy;
    if (Math.hypot(dx,dy)>6) gesture.moved=true;
    if (gesture.moved) setPos(gesture.x+dx,gesture.y+dy);
  });
  launcher.addEventListener('pointerup', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const moved=gesture.moved; gesture=null;
    if (moved) { saved.x=launcher.offsetLeft; saved.y=launcher.offsetTop; persist(); }
    else { if (!panel.hidden) stopModule(); togglePanel(); }
  });
  launcher.addEventListener('pointercancel', () => { gesture=null; });
  window.addEventListener('resize', () => {
    if (saved.x !== undefined) setPos(launcher.offsetLeft, launcher.offsetTop);
  });
})();
