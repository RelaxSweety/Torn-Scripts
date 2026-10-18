// ==UserScript==
// @name         Torn Utilities Cross-Platform
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.5.21
// @description  Movable TU launcher and module catalog for Torn PDA
// @author       RelaxSweety [4539436]
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @connect      api.torn.com
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/core/cross-platform/torn-utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/core/cross-platform/torn-utilities.user.js
// ==/UserScript==
(() => {
  'use strict';
  // Tampermonkey GM-enabled scripts use an isolated window. Publish the TU API on
  // the page window so separately installed @grant none modules can register.
  const pageWindow=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  if (pageWindow.__RELAX_TORN_UTILITIES_PDA__) return;
  pageWindow.__RELAX_TORN_UTILITIES_PDA__ = true;
  const KEY = 'relaxsweety_tu_pda_v1';
  const TU_VERSION='0.5.21';
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
  let registry=FALLBACK,registryStatus='Built-in catalog',registryRefreshing=false,registryUpdatedAt=Number(localStorage.getItem('tu:catalog:updated-at')||0);
  try{const cached=localStorage.getItem(CACHE_KEY);if(cached){registry=validateRegistry(JSON.parse(cached));registryStatus='Cached catalog';}}catch(_){}
  const versionCompare=(a,b)=>{
    const aa=String(a||'0').split('.').map(v=>parseInt(v,10)||0),bb=String(b||'0').split('.').map(v=>parseInt(v,10)||0);
    for(let i=0;i<3;i++)if(aa[i]!==bb[i])return (aa[i]||0)-(bb[i]||0);
    return 0;
  };
  // Fetch the entire catalog; never special-case a module or trust stale CDN results.
  async function refreshRegistry(){
    if(registryRefreshing)return;
    registryRefreshing=true;
    registryStatus='Refreshing catalog';
    render(currentTab);
    const nonce=Date.now();
    const parseResponse=raw=>{
      if(typeof raw==='string')return JSON.parse(raw);
      if(raw?.schemaVersion===1)return raw;
      const body=raw?.responseText??raw?.data??raw?.body??raw?.response;
      if(typeof body==='string')return JSON.parse(body);
      if(body?.schemaVersion===1)return body;
      throw Error('Empty or unsupported catalog response');
    };
    const validateComplete=data=>{
      const next=validateRegistry(data);
      if(next.modules.length!==data.modules.length||next.categories.length<data.categories.length)throw Error('Invalid catalog entries');
      if(new Set(next.modules.map(m=>m.id)).size!==next.modules.length)throw Error('Duplicate module IDs');
      return next;
    };
    const get=async url=>{
      const failures=[];
      if(typeof GM_xmlhttpRequest==='function'){
        try{
          return await new Promise((resolve,reject)=>{
            GM_xmlhttpRequest({
              method:'GET',url,timeout:9000,
              headers:{Accept:'application/json, text/plain, */*'},
              onload:r=>r.status>=200&&r.status<300?resolve(r.responseText):reject(Error('Tampermonkey HTTP '+r.status)),
              onerror:()=>reject(Error('Tampermonkey network error')),
              ontimeout:()=>reject(Error('Tampermonkey timeout'))
            });
          });
        }catch(err){failures.push(err.message);}
      }
      if(typeof PDA_httpGet==='function'){
        try{return await PDA_httpGet(url);}
        catch(err){failures.push('PDA: '+err.message);}
      }
      try{
        const response=await fetch(url,{cache:'no-store'});
        if(!response.ok)throw Error('HTTP '+response.status);
        return await response.text();
      }catch(err){failures.push('Browser: '+err.message);}
      throw Error(failures.join('; ')||'No available request transport');
    };
    const githubUrl='https://api.github.com/repos/RelaxSweety/Torn-Scripts/contents/torn-utilities/modules.json?ref=main&refresh='+nonce;
    const sources=[
      async()=>{
        const raw=await get(githubUrl);
        const obj=parseResponse(raw);
        if(obj.encoding==='base64'&&typeof obj.content==='string'){
          const binary=atob(obj.content.replace(/\s/g,''));
          const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
          return validateComplete(JSON.parse(new TextDecoder().decode(bytes)));
        }
        return validateComplete(obj);
      },
      async()=>validateComplete(parseResponse(await get(REGISTRY_URL+'?refresh='+nonce)))
    ];
    const errors=[];
    try{
      let next=null;
      for(const source of sources){
        try{
          next=await Promise.race([source(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Source timed out')),7000))]);
          if(next)break;
        }catch(err){errors.push(err.message||String(err));console.warn('[TU] catalog source failed',err);}
      }
      if(!next)throw Error(errors.join(' / ')||'No catalog source available');
      // An authoritative catalog can remove modules and correct versions; never let stale cache veto it.
      registry=next;
      try{
        localStorage.setItem(CACHE_KEY,JSON.stringify(next));
        registryUpdatedAt=Date.now();
        localStorage.setItem('tu:catalog:updated-at',String(registryUpdatedAt));
      }catch(err){console.warn('[TU] catalog cache write failed',err);}
      registryStatus='GitHub catalog updated';
    }catch(err){
      registryStatus='Refresh failed: '+err.message;
      console.warn('[TU] catalog refresh failed',err);
    }finally{
      registryRefreshing=false;
      render(currentTab);
    }
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
  // Public Only key stored locally on this device; no passphrase or GM grants.
  const VAULT='tu:identity:public-only-key:v1';
  const readSavedKey=()=>{try{const local=localStorage.getItem(VAULT)||'';if(local)return local;}catch(_){}try{const backup=typeof GM_getValue==='function'?GM_getValue(VAULT,''):'';if(backup){try{localStorage.setItem(VAULT,backup)}catch(_){}return backup}}catch(_){}return ''};
  const saveKey=key=>{let stored=false;try{localStorage.setItem(VAULT,key);stored=true}catch(_){}try{if(typeof GM_setValue==='function'){GM_setValue(VAULT,key);stored=true}}catch(_){}if(!stored)throw Error('No persistent key storage available')};
  const removeSavedKey=()=>{try{localStorage.removeItem(VAULT)}catch(_){}try{if(typeof GM_deleteValue==='function')GM_deleteValue(VAULT)}catch(_){}};
  // Explicit user-provided Public Only key; never persisted or broadcast.
  let playerInfo=null,identityStatus='Enter your Public Only API key',identityBusy=null,authGeneration=0;
  const getPlayer=()=>playerInfo?Object.freeze({...playerInfo}):null;
  let automaticIdentityAttempted=false;
  const openProfileHelp=()=>{panel.hidden=false;render('settings');syncLauncher();};
  const clearPlayer=()=>{authGeneration++;playerInfo=null;identityStatus='No verified session';pageWindow.dispatchEvent(new CustomEvent('tu-player-updated',{detail:null}));};
  const requestIdentity=key=>new Promise((resolve,reject)=>{
    const url='https://api.torn.com/v2/key/info';
    if(typeof GM_xmlhttpRequest==='function')GM_xmlhttpRequest({method:'GET',url,timeout:12000,headers:{Authorization:'ApiKey '+key,Accept:'application/json'},onload:r=>{try{if(r.status<200||r.status>=300)throw Error('HTTP '+r.status);resolve(JSON.parse(r.responseText));}catch(e){reject(e)}},onerror:()=>reject(Error('Network error')),ontimeout:()=>reject(Error('Timeout'))});
    else{const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);fetch(url,{headers:{Authorization:'ApiKey '+key,Accept:'application/json'},signal:c.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(resolve,reject).finally(()=>clearTimeout(t));}
  });
  const requestPublicJson=(url,key)=>new Promise((resolve,reject)=>{
    if(typeof GM_xmlhttpRequest==='function')GM_xmlhttpRequest({method:'GET',url,timeout:12000,headers:{Authorization:'ApiKey '+key,Accept:'application/json'},onload:r=>{try{if(r.status<200||r.status>=300)throw Error('HTTP '+r.status);const data=JSON.parse(r.responseText);if(data.error)throw Error(data.error.error||'API error');resolve(data)}catch(e){reject(e)}},onerror:()=>reject(Error('Network error')),ontimeout:()=>reject(Error('Timeout'))});
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
    pageWindow.dispatchEvent(new CustomEvent('tu-player-updated',{detail:{...playerInfo}}));
  }
  async function updatePlayer(key){
    if(typeof key!=='string')return !!playerInfo;
    if(identityBusy)return identityBusy;
    const generation=++authGeneration;
    identityBusy=(async()=>{
      try{
        if(!/^[a-zA-Z0-9]{16}$/.test(key))throw Error('Invalid 16-character key');
        const data=await requestIdentity(key);
        if(data?.error)throw Error('Torn rejected key');
        if((data?.info?.access?.type??data?.info?.access)!=='Public Only')throw Error('Public Only key required');
        const id=Number(data?.info?.user?.id),faction=Number(data?.info?.user?.faction_id||0);
        if(!Number.isSafeInteger(id)||id<=0)throw Error('Key owner not returned');
        if(generation!==authGeneration)return false;
        playerInfo={id:String(id),name:null,factionId:Number.isSafeInteger(faction)&&faction>0?faction:null,factionName:null,profileUrl:'https://www.torn.com/profiles.php?XID='+id,updatedAt:Date.now()};
        identityStatus='Verified by Torn API';pageWindow.dispatchEvent(new CustomEvent('tu-player-updated',{detail:{...playerInfo}}));void enrichIdentity(key,generation);return true;
      }catch(e){if(generation===authGeneration){playerInfo=null;identityStatus='Verification failed: '+e.message;}return false;}
      finally{identityBusy=null;}
    })();return identityBusy;
  }
  // Restore identity once per page load. Never send the stored key to modules.
  async function restoreSavedIdentity(){
    if(automaticIdentityAttempted)return;
    automaticIdentityAttempted=true;
    const key=readSavedKey();
    if(!key)return;
    identityStatus='Verifying saved Public Only API key…';
    const ok=await updatePlayer(key);
    if(!ok)console.warn('[TU] Saved key verification failed:',identityStatus);
    refreshIdentity();
    if(typeof render==='function'&&currentTab==='settings')render('settings');
  }
  const api = Object.freeze({
    storage,
    getPlayer,
    async requestTorn(path,{format='json'}={}){
      if(typeof path!=='string'||!/^\/v2\/faction(?:\/|\?|$)/.test(path))throw Error('Unsupported Torn API path');
      const key=readSavedKey();if(!key)throw Error('Set Public Only API key in TU Manager Settings');
      const url='https://api.torn.com'+path;
      const raw=await new Promise((resolve,reject)=>{
        if(typeof GM_xmlhttpRequest==='function')GM_xmlhttpRequest({method:'GET',url,timeout:30000,headers:{Authorization:'ApiKey '+key,Accept:format==='text'?'text/csv,application/json':'application/json'},onload:r=>r.status>=200&&r.status<300?resolve(r.responseText):reject(Error('HTTP '+r.status)),onerror:()=>reject(Error('Network error')),ontimeout:()=>reject(Error('Timeout'))});
        else fetch(url,{headers:{Authorization:'ApiKey '+key},cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject(Error('HTTP '+r.status))).then(resolve,reject);
      });
      if(format==='text')return raw;
      const data=JSON.parse(raw);if(data?.error)throw Error(data.error.error||'Torn API error');return data;
    },
    getFaction:()=>playerInfo?.factionId?Object.freeze({id:playerInfo.factionId,name:playerInfo.factionName||null}):null,
    refreshPlayer:()=>Promise.resolve(!!playerInfo),
    requestPlayerProfile:openProfileHelp,
    closeActiveModule(){stopModule();panel.hidden=false;viewModule=null;render('modules');syncLauncher();},
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
  Object.defineProperty(pageWindow, 'TornUtilities', {value:api, configurable:false, writable:false});
  pageWindow.dispatchEvent(new Event('torn-utilities-ready'));
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
      mod.activate(Object.freeze({mount:moduleHost, close:()=>{stopModule();panel.hidden=false;viewModule=null;render('modules');syncLauncher();},minimize:()=>{panel.hidden=true;syncLauncher();}}));
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
#tu-pda-panel .tu-refresh-icon{display:inline-block}#tu-pda-panel .tu-spinning{animation:tu-refresh-spin .8s linear infinite}@keyframes tu-refresh-spin{to{transform:rotate(360deg)}}
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
  panel.innerHTML = '<header><span class="tu-logo">TU</span><div><h2>Torn Utilities</h2><p>Modular Tools for Torn City</p></div><button class="tu-close" aria-label="Close">×</button></header><nav><button data-tab="modules" aria-selected="true">Modules</button><button data-tab="settings">Settings</button><button data-tab="about">About</button></nav><div class="tu-content"></div><footer style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>Torn Utilities v0.5.21 (PDA)</span><span id="tu-catalog-updated" style="text-align:right"></span></footer>';
  document.body.appendChild(panel);
  const identityLine=document.createElement('p');
  identityLine.className='tu-player-identity';
  identityLine.style.cssText='margin:3px 0 0;font-size:12px;color:#e4c779;overflow-wrap:anywhere';
  panel.querySelector('header h2').parentElement.appendChild(identityLine);
  const refreshIdentity=()=>{
    const player=getPlayer();
    identityLine.textContent=player?.id?(player.name||'Verified player')+' ['+player.id+']'+(player.factionId?' · '+(player.factionName||'Faction')+' ['+player.factionId+']':''):(identityStatus.startsWith('Verifying')?'Verifying saved player…':'Player not identified');
  };
  refreshIdentity();
  pageWindow.addEventListener('tu-player-updated',refreshIdentity);
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
  const showInstallationInstructions=()=>{
    const instructions='Install a TU module in Torn PDA:\n\n1. Copy the module script URL from TU.\n2. Open PDA Settings > Advanced Browser Settings > Manage Scripts > Add New Script.\n3. Select Configure > Paste URL > Fetch > Load.\n4. Select OK or Authorize when prompted.\n5. Reload the Torn page inside PDA, then reopen TU.\n\nTU modules are installed separately; copying a URL does not install it.';
    alert(instructions);
  };
  function render(tab) {
    currentTab=tab;
    const catalogFooter=panel.querySelector('#tu-catalog-updated');if(catalogFooter)catalogFooter.textContent='Catalog: '+(registryUpdatedAt?new Date(registryUpdatedAt).toLocaleString():'Not refreshed')+(registryStatus.startsWith('Refresh failed')?' · '+registryStatus:'');
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
        content.append(makeButton('Copy Script URL',()=>{
          if(navigator.clipboard?.writeText)navigator.clipboard.writeText(m.scriptUrl).then(()=>alert('Script URL copied')).catch(()=>prompt('Copy script URL',m.scriptUrl));
          else prompt('Copy script URL',m.scriptUrl);
        }));
        content.append(makeButton('Install in Tampermonkey',()=>{
          // Opening a raw .user.js URL in a new tab triggers Tampermonkey's installation page.
          // If popups are blocked, show the URL for manual installation from Dashboard > Utilities.
          const tab=window.open(m.scriptUrl,'_blank','noopener');
          if(!tab)prompt('Open this URL in a new tab or paste it into Tampermonkey > Utilities > Install from URL:',m.scriptUrl);
        }));
        content.append(makeButton('PDA installation instructions',showInstallationInstructions));
        const help=document.createElement('p');help.textContent='PDA: Copy Script URL and install through PDA Scripts. Tampermonkey: Select Install in Tampermonkey and confirm the installation, or use Dashboard > Utilities > Install from URL. Refresh Torn after installing.';content.append(help);
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
        const refresh=makeButton('',refreshRegistry);refresh.style.marginLeft='0';refresh.disabled=registryRefreshing;refresh.innerHTML='<span class="tu-refresh-icon'+(registryRefreshing?' tu-spinning':'')+'">↻</span> '+(registryRefreshing?'Refreshing…':'Refresh catalog');refreshRow.append(refresh);content.append(refreshRow);
      }
    }else if(tab==='settings'){
      const headingAuth=document.createElement('strong');headingAuth.textContent='Torn Public Only API Key';content.append(headingAuth);
      const notice=document.createElement('p');notice.textContent='Key sent to Torn over HTTPS. Optional saved Public Only key is stored locally without encryption or a passphrase, excluded from TU backups, and never shared by TU. Other scripts running on Torn pages may be able to read browser storage. This verification does not grant WHO server access.';content.append(notice);
      const form=document.createElement('form');form.autocomplete='off';
      const input=document.createElement('input');input.type='password';input.maxLength=16;input.autocomplete='off';input.placeholder='16-character Public Only key';input.style.cssText='width:100%;box-sizing:border-box;padding:9px';
      const status=document.createElement('p');status.textContent=identityStatus;status.setAttribute('role','status');
      const submit=makeButton('Verify & Save Key');submit.type='submit';
      form.addEventListener('submit',async e=>{e.preventDefault();const key=input.value.trim();input.value='';submit.disabled=true;status.textContent='Verifying…';const verified=await updatePlayer(key);if(verified){try{saveKey(key);vaultStatus.textContent='Public Only API key saved on this device';}catch(err){vaultStatus.textContent='Key verified, but saving failed: '+err.message;}}submit.disabled=false;status.textContent=identityStatus;refreshIdentity();});
      form.append(input,submit);content.append(form);
      content.append(makeButton('Clear session',()=>{clearPlayer();status.textContent=identityStatus;refreshIdentity();}),status);
      const vaultStatus=document.createElement('p');vaultStatus.textContent=readSavedKey()?'Public Only API key saved on this device':'No saved API key';
      const keyDetails=document.createElement('div');
      keyDetails.style.cssText='display:none;width:100%;box-sizing:border-box;margin:8px 0 12px';
      const view=makeButton('View API Key',()=>{
        if(keyDetails.style.display!=='none'){keyDetails.replaceChildren();keyDetails.style.display='none';return;}
        const key=readSavedKey();
        if(!key){vaultStatus.textContent='No saved API key';return;}
        keyDetails.replaceChildren();
        const field=document.createElement('input');
        field.type='password';field.readOnly=true;field.value=key;
        field.style.cssText='display:block;width:100%;box-sizing:border-box;padding:9px';
        const show=makeButton('Show / Hide',()=>{field.type=field.type==='password'?'text':'password';});
        const close=makeButton('Close',()=>{field.value='';keyDetails.replaceChildren();keyDetails.style.display='none';});
        keyDetails.append(field,show,close);keyDetails.style.display='block';
      });
      const remove=makeButton('Remove saved API Key',()=>{
        if(confirm('Remove saved Public Only API key from this browser?')){
          removeSavedKey();vaultStatus.textContent='No saved API key';
          keyDetails.replaceChildren();keyDetails.style.display='none';
        }
      });
      content.append(view,keyDetails,remove,vaultStatus);
      const buildDiagnostics=()=>({
        managerVersion:TU_VERSION,
        catalogStatus:registryStatus,
        catalogLastRefreshed:registryUpdatedAt?new Date(registryUpdatedAt).toISOString():null,
        catalogModuleCount:registry.modules.length,
        registeredModules:[...registered.values()].map(m=>({id:m.id,version:m.version})),
        moduleCompatibility:registry.modules.map(m=>{
          const loaded=registered.get(m.id);
          const state=!loaded?'not-loaded':!loaded.version?'version-unknown':versionCompare(loaded.version,m.version)<0?'update-available':versionCompare(loaded.version,m.version)>0?'ahead-of-catalog':'current';
          return {id:m.id,name:m.name,catalogVersion:m.version,loadedVersion:loaded?.version??null,status:state,enabled:!saved.disabled?.[m.id]};
        }),
        uncatalogedModules:[...registered.keys()].filter(id=>!registry.modules.some(m=>m.id===id)),
        moduleSummary:{
          catalog:registry.modules.length,
          loaded:registry.modules.filter(m=>registered.has(m.id)).length,
          updatesAvailable:registry.modules.filter(m=>{const v=registered.get(m.id)?.version;return v&&versionCompare(v,m.version)<0}).length,
          notLoaded:registry.modules.filter(m=>!registered.has(m.id)).length
        },
        playerVerified:!!playerInfo,
        factionId:playerInfo?.factionId??null,
        savedPublicOnlyKeyPresent:!!readSavedKey(),
        transport:{tampermonkey:typeof GM_xmlhttpRequest==='function',pda:typeof PDA_httpGet==='function'},
        platform:typeof unsafeWindow!=='undefined'?'Tampermonkey':'PDA or browser'
      });
      content.append(makeButton('Open Diagnostics',()=>{
        let win=document.getElementById('tu-diagnostics-window');
        if(win){win.hidden=false;return;}
        win=document.createElement('section');win.id='tu-diagnostics-window';
        win.style.cssText='position:fixed;z-index:2147483646;top:15%;left:calc(50% - 190px);width:380px;height:360px;background:#181b20;color:#f2e8d5;border:1px solid #ad8d4b;border-radius:12px;box-shadow:0 12px 35px #000a;padding:14px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box';
        const header=document.createElement('header');
        header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:move';
        const title=document.createElement('strong');title.textContent='TU Diagnostics';
        const close=makeButton('Close',()=>{win.remove();});
        header.append(title,close);
        const report=document.createElement('pre');
        report.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;overflow:auto;flex:1;margin:0';
        const refresh=()=>{report.textContent=JSON.stringify(buildDiagnostics(),null,2);};
        const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
        actions.append(makeButton('Refresh',refresh),makeButton('Copy Diagnostics',()=>{
          const value=JSON.stringify(buildDiagnostics(),null,2);
          if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>alert('Diagnostics copied')).catch(()=>prompt('Copy diagnostics',value));
          else prompt('Copy diagnostics',value);
        }));
        win.append(header,report,actions);document.body.appendChild(win);refresh();
      }));
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
      const p=document.createElement('p');p.textContent='Torn Utilities v0.5.21 by RelaxSweety [4539436]. Drag TU to reposition. Modules are installed separately in Torn PDA Scripts.';content.append(p);
      const guideLink=document.createElement('a');guideLink.href='https://github.com/RelaxSweety/Torn-Scripts/blob/main/torn-utilities/INSTALLATION.md';guideLink.target='_blank';guideLink.rel='noopener noreferrer';guideLink.textContent='TU Installation & Module Setup Guide ↗';guideLink.style.cssText='display:block;margin:12px 0;padding:12px;border:1px solid #806a3e;border-radius:8px;color:#e4c779;text-decoration:underline;font-weight:600';content.append(guideLink);
      // Official-style vector marks; no remote image dependencies.
      addSocialIcon('RelaxSweety on Discord','https://discord.com/users/relaxsweety','M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.1 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.075.075 0 0 0-.041-.104 13.1 13.1 0 0 1-1.872-.89.076.076 0 0 1-.008-.127c.126-.095.252-.193.372-.292a.074.074 0 0 1 .077-.01c3.929 1.793 8.185 1.793 12.068 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.292a.076.076 0 0 1-.007.127c-.598.35-1.224.65-1.873.89a.076.076 0 0 0-.04.105c.36.698.77 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.83 19.83 0 0 0 6.003-3.03.077.077 0 0 0 .031-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z');
      const tornLink=document.createElement('a');tornLink.href='https://www.torn.com/profiles.php?XID=4539436';tornLink.target='_blank';tornLink.rel='noopener noreferrer';tornLink.title='RelaxSweety on Torn';tornLink.setAttribute('aria-label','RelaxSweety on Torn');
      tornLink.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:50px;height:48px;margin:12px 14px 4px 0;background:#252a2e;border:1px solid #806a3e;border-radius:12px';
      const tornLogo=document.createElement('img');tornLogo.src='https://www.torn.com/favicon.ico';tornLogo.alt='Torn';tornLogo.width=30;tornLogo.height=30;tornLink.append(tornLogo);content.append(tornLink);
    }
  }
  render('modules');
  refreshRegistry();
  restoreSavedIdentity();
  // Do not interrupt first-run API requests with an immediate alert.
  window.addEventListener('torn-utilities-ready',()=>render(currentTab));
  // A module script can be installed separately, but remains inert until Open is pressed.

  const isVisible=id=>{
    const el=document.getElementById(id);
    return !!el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  };
  const syncLauncher=()=>{
    const moduleVisible=!!active&&(['tuim-panel','tuim-catalog','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tca-panel','tca-playbar','tuac-panel'].some(isVisible)||[...moduleHost.children].some(el=>isVisible(el.id)||(!el.hidden&&el.getClientRects().length>0)));
    const hide=!panel.hidden||moduleVisible;
    if(launcher.hidden!==hide)launcher.hidden=hide;
  };
  const closePanel = () => { panel.hidden = true; syncLauncher(); };
  const togglePanel = () => { if(active==='item-monitor'&&document.getElementById('tuim-panel')?.hidden){registered.get(active)?.activate(Object.freeze({mount:moduleHost,close:()=>{stopModule();panel.hidden=false;viewModule=null;render('modules');syncLauncher();},minimize:()=>{panel.hidden=true;syncLauncher();}}));panel.hidden=true;syncLauncher();return;} if(active)stopModule(); panel.hidden=!panel.hidden; if(!panel.hidden){viewModule=null;render('modules');} syncLauncher(); };
  panel.querySelector('.tu-close').addEventListener('click', () => { closePanel(); });
  panel.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => render(b.dataset.tab)));
  // Shared floating-window support for TU module panels.
  // Persist each TU window's user-selected size and position independently.
  const floatIds=['tu-diagnostics-window','tuim-panel','tuac-panel','tca-panel','tu-pda-panel','sff-root','tpfg-manager','tpfg-root'];
  const floatingSetup=new WeakSet();
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
      resizeObserver.observe(el);
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
  const enhanceFloating=()=>floatIds.forEach(id=>setupFloating(document.getElementById(id)));
  enhanceFloating();
  const floatingObserver=new MutationObserver(enhanceFloating);
  floatingObserver.observe(document.body,{childList:true,subtree:true});
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
    else { togglePanel(); }
  });
  launcher.addEventListener('pointercancel', () => { gesture=null; });
  window.addEventListener('resize', () => {
    if (saved.x !== undefined) setPos(launcher.offsetLeft, launcher.offsetTop);
  });
})();
