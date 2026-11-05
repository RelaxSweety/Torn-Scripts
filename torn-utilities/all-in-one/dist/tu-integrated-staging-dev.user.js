// ==UserScript==
// @name         Torn Utilities Cross-Platform
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.5.42.29-integration-dev
// @description  Integrated TU development bundle for PDA and Tampermonkey
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
// @connect      tu-multiplayer-server-dev.tuserver.workers.dev
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/core/cross-platform/torn-utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/core/cross-platform/torn-utilities.user.js
// ==/UserScript==
(() => {
  'use strict';
  // Tampermonkey GM-enabled scripts use an isolated window. Publish the TU API on
  // the page window so separately installed @grant none modules can register.
  const pageWindow=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  if (pageWindow.__RELAX_TORN_UTILITIES_PDA__) return;
  pageWindow.__RELAX_TORN_UTILITIES_PDA__ = true;
  const KEY = 'relaxsweety_tu_pda_v1';
  const TU_VERSION='0.5.42.29-integration-dev';
  const REGISTRY_URL='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/stable-05424-who/torn-utilities/modules.json';
  const CACHE_KEY='tu:registry:v1';
  const FALLBACK={schemaVersion:1,categories:[
    {id:'business',name:'Business Tools',icon:'▥',order:10},
    {id:'games',name:'Games',icon:'♜',order:20},
    {id:'single-player',name:'Single Player',icon:'▣',order:21,parent:'games'},
    {id:'multiplayer',name:'Multiplayer',icon:'♟',order:22,parent:'games'},
    {id:'chat',name:'Chat Tools',icon:'◉',order:30},
    {id:'other',name:'War Tools',icon:'⚙',order:40}
  ],modules:[
    {id:'alerts-calculations',name:'Alerts and Calculations',category:'business',version:'0.2.0',description:'Stock cash targets, foreign item alerts and calculator',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/alerts-and-calculations.user.js'},
    {id:'flight-game',name:'Flight Game',category:'single-player',version:'0.11.13',description:'Flight arcade and Stick Fighter',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/pda-flight-game/Torn-PDA-Flight-Game.user.js'},
    {id:'stick-fighter',name:'Stick Fighter',category:'single-player',version:'0.1.6',description:'Stick Fighter arcade game',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/pda-flight-game/Torn-PDA-Flight-Game.user.js'},
    {id:'chat-archiver',name:'Chat Archiver',category:'chat',version:'0.1.7',description:'Archive Torn chat conversations',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/chat-archiver/pda/src/torn-multi-chat-archiver-pda.user.js'}
    ,{id:'item-monitor',name:'Item Monitor',category:'business',version:'1.10.1',description:'Item Monitor and Travel Assistant',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/item-monitor.user.js'}
  ]};
  const validId=/^[a-z0-9-]{1,64}$/;
  const safeScriptUrl=url=>typeof url==='string'&&/^https:\/\/raw\.githubusercontent\.com\/RelaxSweety\/Torn-Scripts\/(?:main|dev\/stable-05424-who)\/[a-zA-Z0-9/_-]+\.user\.js$/.test(url);
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
    const githubUrl='https://api.github.com/repos/RelaxSweety/Torn-Scripts/contents/torn-utilities/modules.json?ref=dev%2Fstable-05424-who&refresh='+nonce;
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
  const LOGIN_ACCESS_KEY='tu:identity:login-access-level:v1';
  const loginAccessLabel=()=>localStorage.getItem(LOGIN_ACCESS_KEY)==='limited'?'Limited Access':localStorage.getItem(LOGIN_ACCESS_KEY)==='public'?'Public Only':'Access level unverified';
  const normalizeKey=v=>{if(typeof v!=='string')return '';let x=v.trim();for(let i=0;i<3;i++){if(x.startsWith('GMV2_')){x=x.slice(5);continue;}if(x.startsWith('"')&&x.endsWith('"')){try{const y=JSON.parse(x);if(typeof y==='string'){x=y.trim();continue}}catch{}}break;}return /^[A-Za-z0-9]{16}$/.test(x)?x:'';};
  const readSavedKey=()=>{let v='';try{v=localStorage.getItem(VAULT)||''}catch{}let key=normalizeKey(v);if(key){if(key!==v)try{localStorage.setItem(VAULT,key)}catch{}return key;}try{key=normalizeKey(typeof GM_getValue==='function'?GM_getValue(VAULT,''):'');if(key){try{localStorage.setItem(VAULT,key)}catch{}return key}}catch{}return ''};
  const saveKey=key=>{let stored=false;try{localStorage.setItem(VAULT,key);stored=true}catch(_){}try{if(typeof GM_setValue==='function'){GM_setValue(VAULT,key);stored=true}}catch(_){}if(!stored)throw Error('No persistent key storage available')};
  const removeSavedKey=()=>{try{localStorage.removeItem(LOGIN_ACCESS_KEY)}catch(_){}try{localStorage.removeItem(VAULT)}catch(_){}try{if(typeof GM_deleteValue==='function')GM_deleteValue(VAULT)}catch(_){}};
  // Explicit user-provided Public Only key; never persisted or broadcast.
  let playerInfo=null,identityStatus='Enter your Public Only or Limited Access API key',identityBusy=null,authGeneration=0;
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
        if(!['Public Only','Limited Access'].includes(data?.info?.access?.type??data?.info?.access))throw Error('Public Only or Limited Access key required');
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
    identityStatus='Verifying saved Torn API key…';
    const ok=await updatePlayer(key);
    if(!ok)console.warn('[TU] Saved key verification failed:',identityStatus);
    refreshIdentity();
    if(typeof render==='function'&&currentTab==='settings')render('settings');
  }
  let authorizationVerified=false,authRestorePending=true,authOpenRequested=false;
  const authorized=()=>authorizationVerified&&!!devToken()&&!!readSavedKey()&&!!TU_TERMS_VERSION&&localStorage.getItem(TU_TERMS_KEY)===TU_TERMS_VERSION;
  const publishAuthorization=ok=>{authorizationVerified=!!ok;pageWindow.dispatchEvent(new CustomEvent('tu-authorization-change',{detail:{authorized:authorized()}}));if(!authorized())stopModule();};
  const api = Object.freeze({
    isAuthorized:()=>authorized(),
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
    async requestWhoTorn(path){
      if(!authorized())throw Error('TU Manager authentication required');
      if(typeof path!=='string'||!(/^(?:\/v2\/faction(?:\/|\?|$)|\/v2\/user\/[0-9]+\/profile(?:\?|$))/.test(path)))throw Error('Unsupported WHO API path');
      const key=normalizeKey(localStorage.getItem('tu:who:limited-api-key:v1')||'');
      if(!key)throw Error('Save a Limited Access key under TU Manager > Settings > API Keys');
      const url='https://api.torn.com'+path;
      const data=await new Promise((resolve,reject)=>{
        if(typeof GM_xmlhttpRequest==='function')GM_xmlhttpRequest({method:'GET',url,timeout:20000,headers:{Authorization:'ApiKey '+key,Accept:'application/json'},onload:r=>{try{if(r.status<200||r.status>=300)throw Error('HTTP '+r.status);resolve(JSON.parse(r.responseText))}catch(e){reject(e)}},onerror:()=>reject(Error('Network error')),ontimeout:()=>reject(Error('Timeout'))});
        else fetch(url,{headers:{Authorization:'ApiKey '+key,Accept:'application/json'},cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(resolve,reject);
      });
      if(data?.error)throw Error(data.error.error||'Torn API error');
      return data;
    },
    getFaction:()=>playerInfo?.factionId?Object.freeze({id:playerInfo.factionId,name:playerInfo.factionName||null}):null,
    refreshPlayer:()=>Promise.resolve(!!playerInfo),
    requestPlayerProfile:openProfileHelp,
    closeActiveModule(){stopModule();tuShow('tu-pda-panel');viewModule=null;render('modules');syncLauncher();},
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
  let TU_TERMS_VERSION=null;
  let currentDevAgreement=null;
  let currentDevAgreementContent='';

  // DEVELOPMENT BUILD ONLY. This code is not deployed from main.
  const DEV_BASE='https://tu-multiplayer-server-dev.tuserver.workers.dev';
  async function loadDevAgreement(){
    const published=await devRequest('/api/auth/agreement/current','GET',null,'');
    const a=published?.agreement;
    if(!a||typeof a.agreement_version!=='string'||!Number.isSafeInteger(a.agreement_number)||typeof a.agreement_date!=='string'||typeof published.content!=='string'||!published.content.trim())throw Error('Current DEV agreement unavailable');
    currentDevAgreement={agreement_version:a.agreement_version,agreement_number:a.agreement_number,agreement_date:a.agreement_date};
    currentDevAgreementContent=published.content;
    TU_TERMS_VERSION=a.agreement_version;
    return currentDevAgreement;
  }
  const DEV_SESSION_KEY='tu:dev:auth:session:v1';
  const devToken=()=>sessionStorage.getItem(DEV_SESSION_KEY)||'';
  let devAuthIssue='',devRenewalBlocked=false;
  function devAuthFailure(error){
    const status=error?.status;
    devAuthIssue=status===401||status===403?'Saved API key rejected. Replace it in TU Settings.':status===429?'Authentication rate-limited. Retry later.':status>=500||!status?'Authentication service unavailable. Retry later.':error?.message||'Session renewal failed.';
    devRenewalBlocked=true;
    sessionStorage.removeItem(DEV_SESSION_KEY);
    if(!panel.hidden)render('about');
  }
  function resetDevAuthFailure(){devAuthIssue='';devRenewalBlocked=false;}
  async function devRequest(path,method='GET',body,token=devToken()){
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
      // Auth endpoints require Authorization headers. PDA_httpGet does not
      // accept them, and PDA_httpPost may ignore its headers argument.
      // Use GM's cross-origin request when a bearer token is present.
      const gm=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:
        (typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest:null);
      if(gm){
        try{
          return await new Promise((resolve,reject)=>gm({method,url,headers,...(payload?{data:payload}:{}),timeout:20000,
            onload:r=>{try{resolve({status:r.status||0,data:parse(r.responseText??r.response)})}catch(e){reject(e)}},
            onerror:()=>reject(Error('GM request network failure')),ontimeout:()=>reject(Error('GM request timeout'))}));
        }catch(error){console.warn('[TU] GM authentication transport failed',error.message);}
      }
      // Native PDA POST supports JSON bodies but may not support bearer headers.
      // Do not treat its return value as proof of a confirmed agreement.
      const pdaPost=pageWindow.PDA_httpPost||window.PDA_httpPost;
      if(method==='POST'&&!token&&typeof pdaPost==='function'){
        const raw=await pdaPost(url,payload,{'Content-Type':'application/json'});
        const data=parse(raw);
        if(!data?.token)throw Error('PDA registration response missing session token');
        return {status:200,data};
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
    if(!response.ok){const error=Error(result.error||('Development server HTTP '+response.status));error.status=response.status;throw error;}
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
      const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform:'tampermonkey'},'');
      if(!registration.token)throw Error('Session renewal returned no token');
      const status=await devRequest('/api/auth/agreement','GET',null,registration.token);
      if(!status.accepted){
        sessionStorage.removeItem(DEV_SESSION_KEY);
        localStorage.removeItem(TU_TERMS_KEY);
        throw Error('Current agreement requires acceptance');
      }
      sessionStorage.setItem(DEV_SESSION_KEY,registration.token);
      localStorage.setItem(TU_TERMS_KEY,TU_TERMS_VERSION);
      return registration.token;
    })().catch(error=>{devAuthFailure(error);throw error;}).finally(()=>{devRenewal=null});
    return devRenewal;
  }
  async function restoreDevSession(){
    try{
      await loadDevAgreement();
      if(!readSavedKey()||localStorage.getItem(TU_TERMS_KEY)!==TU_TERMS_VERSION)return;
      const token=devToken();
      if(token){
        try{
          const status=await devRequest('/api/auth/agreement','GET',null,token);
          if(status.accepted){publishAuthorization(true);resetDevAuthFailure();render('modules');return;}
          localStorage.removeItem(TU_TERMS_KEY);
          sessionStorage.removeItem(DEV_SESSION_KEY);
          return;
        }catch(error){
          if(error.status!==401)throw error;
        }
      }
      await renewDevSession();
      publishAuthorization(true);
      resetDevAuthFailure();
      render('modules');
    }catch(error){
      publishAuthorization(false);
      console.warn('[TU] Session restore unavailable:',error.message);
      render('about');
    }finally{
      authRestorePending=false;
      if(authOpenRequested){authOpenRequested=false;tuRestore();syncLauncher();}
    }
  }
  async function devAccept(key,platform){
    const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform},'');
    if(!registration.token)throw Error('Registration returned no session');
    const token=registration.token;
    const accessLevel=registration.accessLevel;
    if(!['public','limited'].includes(accessLevel))throw Error('Torn did not confirm a Public Only or Limited Access key');
    const agreement=await loadDevAgreement();
    await devRequest('/api/auth/agreement','POST',{action:'accepted',request_id:crypto.randomUUID(),...agreement},token);
    const status=await devRequest('/api/auth/agreement','GET',null,token);
    if(!status.accepted)throw Error('Development agreement was not confirmed');
    sessionStorage.setItem(DEV_SESSION_KEY,token);
    localStorage.setItem(LOGIN_ACCESS_KEY,accessLevel);
    resetDevAuthFailure();
    return status;
  }
  async function devCancel(){
    const token=devToken();
    if(!token)throw Error('No development session available; cannot confirm cancellation');
    await devRequest('/api/auth/agreement','POST',{action:'cancelled',request_id:crypto.randomUUID()},token);
    sessionStorage.removeItem(DEV_SESSION_KEY);
    publishAuthorization(false);
  }
  const TU_TERMS_KEY='tu:agreement:accepted';
  const TU_TERMS=[
    ['Terms of Use','Torn Utilities is an independent optional collection of Torn City userscripts, not endorsed by Torn City. Use is at your own risk and subject to Torn rules. Features, predictions and availability are not guaranteed.'],
    ['Information Use','TU may read your player name and ID, publicly accessible Torn information, shop inventory, item prices, gameplay and settings. Optional foreign shop reporting transmits observed item IDs, quantities, prices, country and timestamps to TU-hosted Cloudflare services for stock analysis. Multiplayer modules exchange gameplay/session information with TU services.'],
    ['API Key and Storage','Use a Public Only or Limited Access Torn API key for TU registration; use the least access required. Limited Access keys may permit additional gameplay data access. Full Access keys are not accepted for registration. Your key is sent to Torn for verification; an optionally saved key is stored locally without encryption and excluded from TU backups. Other scripts running on Torn pages may be able to read local browser storage. Do not share API keys in diagnostic reports.'],
    ['Services and Retention','TU uses Torn API, GitHub, and TU-hosted services including Cloudflare. Server-side observations and game records may be retained for functionality and analysis. A complete retention and deletion schedule is not yet published. Network metadata may be handled by service providers.'],
    ['Consent and Choice','Declining restricts Manager functionality to the Info page. You can stop using TU, uninstall scripts and clear local data. Acceptance is stored locally and may be requested again after terms updates. Contact the maintainer using the links below with questions.']
  ];
  const hasAgreement=()=>!!devToken()&&!!TU_TERMS_VERSION&&localStorage.getItem(TU_TERMS_KEY)===TU_TERMS_VERSION;
  let currentTab='modules',settingsPage=null,diagnosticModule=null;
  // PDA Scripts installs modules independently; TU only manages registered modules.
  function stopModule() {
    if (!active) return;
    const id=active; active=null;
    try { registered.get(id)?.deactivate(); } catch(e) { console.error('[TU] module cleanup failed', id, e); }
    moduleHost.replaceChildren(); moduleHost.hidden=true;
  }
  function openModule(id) {
    if(!authorized()){showAgreement();return false;}
    const mod=registered.get(id);
    if (!mod || saved.disabled?.[id]) return false;
    stopModule();
    moduleHost.hidden=false;
    try {
      active=id;
      tuNav.history.push('tu-pda-panel');tuNav.current=id;tuNav.minimized=false;tuNav.exited=false;
      mod.activate(Object.freeze({mount:moduleHost, close:()=>{stopModule();panel.hidden=false;viewModule=null;render('modules');syncLauncher();},minimize:()=>{tuMinimize();syncLauncher();}}));
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
  // TU unified window navigation (test release).
  const tuNav={history:[],current:'tu-pda-panel',minimized:true,exited:true};
  const tuRoots=['tu-pda-panel','tuim-panel','tuim-catalog','tuim-travel-window','tuim-data-window','tuac-panel','tca-panel','tca-playbar','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tu-diagnostics-window'];
  const tuRoot=id=>document.getElementById(id);
  const tuHideAll=()=>tuRoots.forEach(id=>{const el=tuRoot(id);if(el){el.hidden=true;if(id==='tpfg-root')el.style.display='none';}});
  const tuShow=id=>{const el=tuRoot(id);if(!el)return false;tuHideAll();el.hidden=false;if(id==='tpfg-root')el.style.display='block';tuNav.current=id;tuNav.minimized=false;tuNav.exited=false;return true;};
  const tuOpen=id=>{if(!tuRoot(id))return false;if(tuNav.current!==id&&tuRoot(tuNav.current))tuNav.history.push(tuNav.current);return tuShow(id);};
  const tuBack=(source)=>{const parents={'tuim-travel-window':'tuim-panel','tuim-data-window':'tuim-travel-window','tuim-catalog':'tuim-panel'};const parent=parents[source];if(parent&&tuRoot(parent)){if(tuNav.history[tuNav.history.length-1]===parent)tuNav.history.pop();return tuShow(parent);}if(source&&tuRoot(source))tuNav.current=source;while(tuNav.history.length){const id=tuNav.history.pop();if(tuRoot(id))return tuShow(id);}return tuShow('tu-pda-panel');};
  const tuMinimize=(source)=>{if(source&&tuRoot(source))tuNav.current=source;
    // Capture the actual visible window before hiding anything; module IDs are not DOM IDs.
    const visible=tuRoots.filter(id=>{const el=tuRoot(id);return el&&!el.hidden&&getComputedStyle(el).display!=='none';});
    const top=(source&&tuRoot(source)?source:null)||visible.find(id=>id===tuNav.current)||visible.find(id=>id!=='tu-pda-panel')||visible[0];
    if(top)tuNav.current=top;
    tuNav.minimized=true;tuNav.exited=false;tuHideAll();launcher.hidden=false;
  };
  const tuExit=(source)=>{tuNav.history.length=0;tuNav.current='tu-pda-panel';tuMinimize();tuNav.exited=true;stopModule();};
  const tuRestore=()=>{
    if(authRestorePending){authOpenRequested=true;tuNav.minimized=true;tuNav.exited=false;panel.hidden=true;launcher.hidden=false;return true;}
    if(tuNav.exited){tuNav.history.length=0;tuNav.current='tu-pda-panel';render(authorized()?'modules':'about');}
    if(!authorized()){tuShow('tu-pda-panel');showAgreement();return true;}
    let id=tuNav.current;
    if(!tuRoot(id)&&active){id=({'item-monitor':'tuim-panel','flight-game':'tpfg-root','stick-fighter':'sff-root'}[active]||id);}
    return tuShow(tuRoot(id)?id:'tu-pda-panel');
  };
  pageWindow.TUWindowNavigation=Object.freeze({open:tuOpen,back:tuBack,minimize:tuMinimize,exit:tuExit,restore:tuRestore});
  const style = document.createElement('style');
  style.textContent = `
#tu-pda-panel .tu-refresh-icon{display:inline-block}#tu-pda-panel .tu-spinning{animation:tu-refresh-spin .8s linear infinite}@keyframes tu-refresh-spin{to{transform:rotate(360deg)}}
#tu-pda-launcher{position:fixed;left:12px;top:38%;z-index:2147483645;touch-action:none;width:43px;height:43px;border-radius:50%;border:2px solid #e3bb57;background:radial-gradient(circle at 35% 25%,#293b45,#07090b 70%);color:#f5d87e;box-shadow:0 2px 9px #000b,inset 0 0 4px #f5d87e66;font:bold italic 23px 'Palatino Linotype','Book Antiqua',Georgia,serif;letter-spacing:-2px;padding:0 2px 0 0;display:flex;align-items:center;justify-content:center;line-height:1;cursor:grab;user-select:none;-webkit-user-select:none}
#tu-pda-launcher{border-radius:50%;border:0;background:#08090a url(data:image/webp;base64,UklGRq4GAABXRUJQVlA4IKIGAAAwHACdASpgAGAAPpU8mUiloyIhKrK/ULASiWoAwne0lPSi7G2qg0ltv0P7ZnzI+bV/nvXZ/k9999CL9iut1rz0mO9Cfr9HUXaZwyuOal/4fNz9S+jf/xuBdeDYib+r4+o01uo4Fe5wCllruiV7HogTd8NYJp2HZhuyzPaLHGNUhONqVaXDfidHh3gDU03sGVoDbxBsLMYbgIZJscfjJN6/Cuwf+lpc7yBok1/B6IPkz/4IK3gm9J/27Bccd/Vu0I67CDDXdjwv9yZ88/+SGxC7SPq/0wMczZp3ahPn7a7zzD+ry0hpqnkRIQAA/v1uSKGx+Jn/no2//fWx79LRnMZ/hFKeb/W89WQyYr1/en+ak1594g2/jvqMWzCEyv/g/h6d0hPkmQ5ezERi2EA5XlSIJEt/X31Xmlzx0Bs1UL/xHnRu7CQD+YunEj8cMN1EoP7+wWAxWomBcZDIaoOX2RArXlfkkf34+KvKJn0aaZljJ+xP4MRw7FMMOZDQoKvNAiAdMwSIqUMICrYuhvf6n6gQ6agK6qoHEIHu4W/DExeNKG+sOsoZIiyI3xmq3c0evDzfkUtuqtPF0ZYGz+k/s4DgrlSXCIIWuKJueob1EvRo+0clCx/rH/izpBsTPbwgtRJGpEcO7psIJoZgFSSLeZxwIYrrdepjc0OeudEZGGgwX7GZvVVkfrOW24nwFalbAtXrCKOKKh4LLluHH+m6hquhlu3ywQk86ilNUEFf/DWDTTmG4/j7RyO9zwjgSZRj62RomMbtIe4AGW1C1G8FMZFT5Hl2bW1i3jbCCaK3X+1X21/SJ/07ieGvkW1MDKy0D3PeKbGqpCnxHc9n5EaWCkCaUlwkid1P4iHg4kuqY6b2rqBuX14FD1z/qtySU0h9GTQEuzjj/X+MS9KGP9Vcxzhf+EaAJIKGb2mfOBrO2D9/snC+VDkBJNfYc8K+vJnJZk9znFBuZcI5U38KUd+Iod6xRVfxkf81tyQ4yehnh279c9aaJdnYvTffqZbsqixbg2SQuXuP9DjNBK8kgq5e6habhY5/uS6x/8fgprWCvXWXFist42MlorVQZLZuO0IKd9KOj/Ho+5xKEUuq3hHZ+NQvDCxVimngFBYjk/8FGNicRnDgr2sW05dP9Y6o7QQbpKy/xPd6dJs9O7qkkSrZccMiSt2mu9IpMeYxLdADxxG7RBbyFuCidzxQPrtT3glWJyaI0L+TUtZIn7HNv+0ACpDWhePHk/gDWrT72x3y6iktn8I41w93aMn0DP1JGunzNAD9INpTFzvMK5LEwIlw8iICzGjRT4qU/ABRUwlrSvgd0bH/IEKT9MY9f5+gLcEsoEcFLjSxP/+RZxcf06hEmrQCNa1cJ6sdfF6DEyv125hCHvZGuWgpVYqbGjH+mZyajeQnXsTdTx0H+FzbhJlSrt15U3N86k4GjIY8D5dF/MjuEGxlasg1WNKICMsSlm2bAsc2gRz27RJYSnn16kXFoA+1EcVjnlSE1pU+L7xHuqQ690c20jYTjDISPD9eKAh+9/7U8cvQf+Pfi4FmpvP5jt1uuvS3GqZvRF9rts5105OtTd82JylWZVuNt75RozzZng3gSAdCpQKW/Y2jFcgT5+Nz5zoC73+9pXmIJJIRg3LRIgq97yuZp+MtAv0XjUz3WCKBmXsIdR8MB90FSdykRbQcubenEF0iRmK7zO6HjFNs+hY8uwR1hzwgl7Qd2XLMf0bxHZlqbXmDaXhvbgkkrS8iKfR5dfOkPZlg91MyCnIy26qM7Rahd0PyK1JpWfsfE1T4Zqofux8e2WBSjdjzd8DnKZN7wHt4q9NUDgPq0yTL1fFDH/LdkLdqP2Te+sq+fsJ29x+O8/QxDpVdIgHmlj5bN+eEJ4LqhOEqjdnL4NwzSkSHbu6H1XEChVgOPx/6RgJeVa3ygz3NNej6hhw8CSuIUQ/y8/P+8p3oHNQ6CwasUQkncNkMVARQEwexRxHc3C5K8LejobmSzZzM6wYKg/+rON2ho6BI9apVNUdE4+G48mPqxqxHhj5axEsT1N2DlKiamua2U4tHPSjM2MWXE+DN4nIXaEMAHYRfmaDuKOYelGKd7FRTi3g1c3KIuZyBm+kfM9f+yBR6EOXncG7ZtC6/+82tihoyoo9PXWLyAIdjvt68WbxM9+MGUQUf2fM1q1SCeAs+taTXoNwx57fKlXX2MxOXiD8ZLo5Lcw3N6YmdtzS0QZ03VlFWkTt4mI3AbHmpIJSh34teaOQzt4qhzqcAAAA=) center/cover no-repeat;color:transparent;box-shadow:0 2px 9px #000b;font-size:0;padding:0}
#tu-pda-launcher:active{cursor:grabbing}
#tu-pda-launcher[hidden]{display:none!important}
#tu-pda-panel{position:fixed;z-index:2147483644;inset:8% 3% auto 3%;max-width:440px;margin:auto;max-height:82vh;overflow:auto;background:#101417;color:#eee;border:1px solid #c49a46;border-radius:18px;box-shadow:0 10px 35px #000d;font:14px system-ui,Arial,sans-serif}
#tu-pda-panel[hidden]{display:none}
#tu-pda-panel *{box-sizing:border-box}
#tu-pda-panel header{display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid #4a3c21;position:sticky;top:0;z-index:100;background:#101417}
#tu-pda-panel .tu-logo{font-size:0;line-height:0;color:transparent;overflow:hidden;vertical-align:middle}
#tu-pda-panel header>.tu-logo{display:block!important;flex:0 0 44px!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;max-width:44px!important;max-height:44px!important;overflow:hidden!important;white-space:nowrap!important;font-size:0!important;line-height:0!important;color:transparent!important;text-indent:-9999px!important}
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
  for(const old of document.querySelectorAll('#tu-pda-launcher'))old.remove();
  launcher.textContent = 'TU';
  launcher.dataset.tuBrand='canonical';
  launcher.setAttribute('aria-label', 'Open Torn Utilities; drag to reposition');
  document.body.appendChild(launcher);
  const brandStyle=document.createElement('style');brandStyle.textContent='.tu-brand-emblem{display:inline-grid;place-items:center;width:32px;height:32px;flex:none;border:2px solid #e3bb57;border-radius:50%;border:0;background:#08090a url(data:image/webp;base64,UklGRq4GAABXRUJQVlA4IKIGAAAwHACdASpgAGAAPpU8mUiloyIhKrK/ULASiWoAwne0lPSi7G2qg0ltv0P7ZnzI+bV/nvXZ/k9999CL9iut1rz0mO9Cfr9HUXaZwyuOal/4fNz9S+jf/xuBdeDYib+r4+o01uo4Fe5wCllruiV7HogTd8NYJp2HZhuyzPaLHGNUhONqVaXDfidHh3gDU03sGVoDbxBsLMYbgIZJscfjJN6/Cuwf+lpc7yBok1/B6IPkz/4IK3gm9J/27Bccd/Vu0I67CDDXdjwv9yZ88/+SGxC7SPq/0wMczZp3ahPn7a7zzD+ry0hpqnkRIQAA/v1uSKGx+Jn/no2//fWx79LRnMZ/hFKeb/W89WQyYr1/en+ak1594g2/jvqMWzCEyv/g/h6d0hPkmQ5ezERi2EA5XlSIJEt/X31Xmlzx0Bs1UL/xHnRu7CQD+YunEj8cMN1EoP7+wWAxWomBcZDIaoOX2RArXlfkkf34+KvKJn0aaZljJ+xP4MRw7FMMOZDQoKvNAiAdMwSIqUMICrYuhvf6n6gQ6agK6qoHEIHu4W/DExeNKG+sOsoZIiyI3xmq3c0evDzfkUtuqtPF0ZYGz+k/s4DgrlSXCIIWuKJueob1EvRo+0clCx/rH/izpBsTPbwgtRJGpEcO7psIJoZgFSSLeZxwIYrrdepjc0OeudEZGGgwX7GZvVVkfrOW24nwFalbAtXrCKOKKh4LLluHH+m6hquhlu3ywQk86ilNUEFf/DWDTTmG4/j7RyO9zwjgSZRj62RomMbtIe4AGW1C1G8FMZFT5Hl2bW1i3jbCCaK3X+1X21/SJ/07ieGvkW1MDKy0D3PeKbGqpCnxHc9n5EaWCkCaUlwkid1P4iHg4kuqY6b2rqBuX14FD1z/qtySU0h9GTQEuzjj/X+MS9KGP9Vcxzhf+EaAJIKGb2mfOBrO2D9/snC+VDkBJNfYc8K+vJnJZk9znFBuZcI5U38KUd+Iod6xRVfxkf81tyQ4yehnh279c9aaJdnYvTffqZbsqixbg2SQuXuP9DjNBK8kgq5e6habhY5/uS6x/8fgprWCvXWXFist42MlorVQZLZuO0IKd9KOj/Ho+5xKEUuq3hHZ+NQvDCxVimngFBYjk/8FGNicRnDgr2sW05dP9Y6o7QQbpKy/xPd6dJs9O7qkkSrZccMiSt2mu9IpMeYxLdADxxG7RBbyFuCidzxQPrtT3glWJyaI0L+TUtZIn7HNv+0ACpDWhePHk/gDWrT72x3y6iktn8I41w93aMn0DP1JGunzNAD9INpTFzvMK5LEwIlw8iICzGjRT4qU/ABRUwlrSvgd0bH/IEKT9MY9f5+gLcEsoEcFLjSxP/+RZxcf06hEmrQCNa1cJ6sdfF6DEyv125hCHvZGuWgpVYqbGjH+mZyajeQnXsTdTx0H+FzbhJlSrt15U3N86k4GjIY8D5dF/MjuEGxlasg1WNKICMsSlm2bAsc2gRz27RJYSnn16kXFoA+1EcVjnlSE1pU+L7xHuqQ690c20jYTjDISPD9eKAh+9/7U8cvQf+Pfi4FmpvP5jt1uuvS3GqZvRF9rts5105OtTd82JylWZVuNt75RozzZng3gSAdCpQKW/Y2jFcgT5+Nz5zoC73+9pXmIJJIRg3LRIgq97yuZp+MtAv0XjUz3WCKBmXsIdR8MB90FSdykRbQcubenEF0iRmK7zO6HjFNs+hY8uwR1hzwgl7Qd2XLMf0bxHZlqbXmDaXhvbgkkrS8iKfR5dfOkPZlg91MyCnIy26qM7Rahd0PyK1JpWfsfE1T4Zqofux8e2WBSjdjzd8DnKZN7wHt4q9NUDgPq0yTL1fFDH/LdkLdqP2Te+sq+fsJ29x+O8/QxDpVdIgHmlj5bN+eEJ4LqhOEqjdnL4NwzSkSHbu6H1XEChVgOPx/6RgJeVa3ygz3NNej6hhw8CSuIUQ/y8/P+8p3oHNQ6CwasUQkncNkMVARQEwexRxHc3C5K8LejobmSzZzM6wYKg/+rON2ho6BI9apVNUdE4+G48mPqxqxHhj5axEsT1N2DlKiamua2U4tHPSjM2MWXE+DN4nIXaEMAHYRfmaDuKOYelGKd7FRTi3g1c3KIuZyBm+kfM9f+yBR6EOXncG7ZtC6/+82tihoyoo9PXWLyAIdjvt68WbxM9+MGUQUf2fM1q1SCeAs+taTXoNwx57fKlXX2MxOXiD8ZLo5Lcw3N6YmdtzS0QZ03VlFWkTt4mI3AbHmpIJSh34teaOQzt4qhzqcAAAA=) center/cover no-repeat;color:transparent;font-size:0;box-shadow:0 2px 9px #000b}';document.head.appendChild(brandStyle);
  const panel = document.createElement('section');
  panel.id = 'tu-pda-panel';
  panel.hidden = true;
  panel.innerHTML = '<header><span class="tu-logo" role="img" aria-label="Torn Utilities"></span><div><h2>Torn Utilities</h2><p>Integrated Tools for Torn City</p></div><button class="tu-close" aria-label="Close">×</button></header><nav><button data-tab="modules" aria-selected="true">Modules</button><button data-tab="settings">Settings</button><button data-tab="about">About</button></nav><div class="tu-content"></div><footer style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>Torn Utilities v0.5.42.29-integration-dev</span><span id="tu-catalog-updated" style="text-align:right"></span></footer>';
  document.body.appendChild(panel);
  const headerBrand=panel.querySelector('.tu-logo');if(headerBrand){headerBrand.textContent='';headerBrand.classList.add('tu-brand-emblem');headerBrand.setAttribute('role','img');headerBrand.setAttribute('aria-label','Torn Utilities');}
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
  function appendTerms(target){
    const version=document.createElement('small');
    version.style.cssText='display:block;margin:0 0 20px;color:#c5d0d8;font:500 12px/1.5 system-ui';
    version.textContent='Loading current agreement…';target.append(version);
    const body=document.createElement('div');target.append(body);
    const renderPublished=()=>{
      body.replaceChildren();
      version.textContent='Agreement version '+TU_TERMS_VERSION+' · Number '+currentDevAgreement.agreement_number+' · '+currentDevAgreement.agreement_date;
      // Render only recognized Markdown headings and paragraphs using safe text nodes.
      // Never assign published agreement content to innerHTML.
      const sections=currentDevAgreementContent.replace(/\r\n?/g,'\n').split(/\n\s*\n/);
      for(const block of sections){
        const lines=block.split('\n');
        for(const line of lines){
          const heading=/^(#{1,3})\s+(.+)$/.exec(line);
          const element=document.createElement(heading?(heading[1].length===1?'h2':'h3'):'p');
          element.textContent=heading?heading[2]:line;
          element.style.cssText=heading
            ?'display:block!important;position:static!important;margin:18px 0 10px!important;padding:0!important;font:700 '+(heading[1].length===1?'19':'16')+'px/1.45 system-ui!important;color:#f3f6f8!important;white-space:normal!important;'
            :'display:block!important;position:static!important;margin:0 0 12px!important;padding:0!important;font:400 14px/1.65 system-ui!important;color:#e3e8ec!important;white-space:normal!important;overflow-wrap:anywhere!important;';
          body.append(element);
        }
      }
    };
    loadDevAgreement().then(renderPublished).catch(error=>{version.textContent='Agreement unavailable';body.textContent='Unable to load current terms: '+error.message+'. Retry by reopening the agreement.';});
  }
  function showAgreement(){
    panel.hidden=false;render('about');
    const existing=document.getElementById('tu-agreement-overlay');if(existing){existing.hidden=false;existing.style.display='flex';tuNav.minimized=false;tuNav.exited=false;launcher.hidden=true;return;}
    const overlay=document.createElement('div');overlay.id='tu-agreement-overlay';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000d;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;overflow:hidden';
    const dialog=document.createElement('section');dialog.style.cssText='background:#182026;color:#eee;border:2px solid #cba953;border-radius:12px;width:min(96vw,580px);max-height:calc(100dvh - 110px);height:min(780px,calc(100dvh - 110px));display:flex;flex-direction:column;overflow:hidden;padding:0;font:14px/1.5 system-ui;box-sizing:border-box;min-height:0';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    const h=document.createElement('h2');h.textContent='TU Terms and Information Use Agreement';h.style.cssText='display:block;position:static;margin:0 0 18px;padding:0;color:#f3f6f8;font:700 21px/1.35 system-ui';dialog.append(h);appendTerms(dialog);
    const keyInfo=document.createElement('p');keyInfo.textContent='Torn Public Only or Limited Access API key: enter your key below to verify identity and accept the current published agreement. Never enter a Full Access key.';dialog.append(keyInfo);
    const key=document.createElement('input');key.type='password';key.autocomplete='off';key.maxLength=16;key.placeholder=readSavedKey()?'API key already saved':'16-character Public Only or Limited Access key';key.style.cssText='flex:1;min-width:0;box-sizing:border-box;padding:10px';const keyRow=document.createElement('div');keyRow.style.cssText='display:flex;align-items:center;gap:8px;width:100%';const revealKey=makeButton('Show',()=>{const visible=key.type==='text';key.type=visible?'password':'text';revealKey.textContent=visible?'Show':'Hide';revealKey.setAttribute('aria-pressed',String(!visible));});revealKey.type='button';revealKey.setAttribute('aria-label','Show or hide agreement API key');revealKey.setAttribute('aria-pressed','false');keyRow.append(key,revealKey);dialog.append(keyRow);
    const checkLabel=document.createElement('label');checkLabel.style.cssText='display:flex;gap:10px;margin:15px 0';const check=document.createElement('input');check.type='checkbox';checkLabel.append(check,document.createTextNode('I have reviewed and agree to the Terms of Use and Information Use Agreement.'));dialog.append(checkLabel);
    const status=document.createElement('p');status.setAttribute('role','status');dialog.append(status);
    const buttons=document.createElement('div');buttons.style.cssText='display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap';
    const decline=makeButton('Decline / Info only',()=>{overlay.remove();render('about')});
    const accept=makeButton('I Agree — Continue',async()=>{
      if(!check.checked)return;
      if(!currentDevAgreement){status.textContent='Current agreement has not loaded. Please wait or reopen the agreement.';return;}
      const supplied=key.value.trim();if(supplied&&!/^[a-zA-Z0-9]{16}$/.test(supplied)){status.textContent='Enter a valid 16-character Public Only or Limited Access key';return;}
      const selected=supplied||readSavedKey();if(!/^[A-Za-z0-9]{16}$/.test(selected)){status.textContent='A 16-character Public Only or Limited Access key is required';return;}accept.disabled=true;try{status.textContent='Registering and recording development agreement…';await devAccept(selected,'tampermonkey');if(supplied)saveKey(supplied);await updatePlayer(selected);}catch(error){status.textContent='Development agreement failed: '+(error.message==='Torn verification failed'?'Torn could not verify this key. Registration requires a valid Public Only or Limited Access key; Full Access and invalid keys are not supported.':error.message);accept.disabled=false;return;}
      localStorage.setItem(TU_TERMS_KEY,TU_TERMS_VERSION);publishAuthorization(true);overlay.remove();render('modules');
    });
    buttons.append(decline,accept);dialog.append(buttons);overlay.append(dialog);document.body.append(overlay);
    // Minimize the consent dialog without accepting; the user may visit Torn to retrieve an API key.
    const minimizeAgreement=()=>{overlay.hidden=true;overlay.style.display='none';tuNav.minimized=true;tuNav.exited=false;panel.hidden=true;launcher.hidden=false;};
    const agreementBar=document.createElement('div');agreementBar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;background:#172026;z-index:2;padding:6px 0';
    const agreementTitle=document.createElement('strong');agreementTitle.textContent='TU Agreement';
    const minimizeButton=makeButton('− Minimize',minimizeAgreement);minimizeButton.setAttribute('aria-label','Minimize agreement to retrieve Torn API key');
    agreementBar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none;background:#172026;z-index:2;padding:12px 16px;border-bottom:1px solid #806a3e';
    agreementBar.append(agreementTitle,minimizeButton);
    const scrollBody=document.createElement('div');scrollBody.style.cssText='flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:16px;box-sizing:border-box';
    while(dialog.firstChild)scrollBody.appendChild(dialog.firstChild);
    dialog.append(agreementBar,scrollBody);

  }
  // Script update check is informational: PDA manages installed script replacement.
  const tuScriptPath='torn-utilities/core/cross-platform/torn-utilities.user.js';
  const tuScriptUrl='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/'+tuScriptPath;
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
    const p=document.createElement('p');p.textContent='Installed Manager: '+TU_VERSION+' · '+tuUpdateStatus;box.append(p);
    const note=document.createElement('p');note.textContent='Catalog refresh only updates the list of available modules. PDA does not automatically replace installed scripts through TU Manager. To update, open PDA Settings > Advanced Browser Settings > Manage Scripts, select TU Manager, then Fetch and Load the latest script URL.';box.append(note);
    const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
    const check=makeButton('Check Manager update',tuCheckUpdates);check.style.marginLeft='0';buttons.append(check);
    const link=document.createElement('a');link.href=tuScriptUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View latest Manager script';link.style.cssText='color:#f1ce72;padding:8px';buttons.append(link);
    box.append(buttons);content.append(box);
  };
  function render(tab) {
    if(!authorized()&&tab!=='about')tab='about';
    if(tab!=='settings')settingsPage=null;
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
        content.append(makeButton('Module diagnostics',()=>{diagnosticModule=m.id;settingsPage='diagnostics';render('settings')}));
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
      if(!settingsPage)tuShowUpdateTools();
      if(!settingsPage){diagnosticModule=null;
        const h=document.createElement('h3');h.textContent='Settings';content.append(h);
        for(const [id,name,desc] of [['time','Time Display','Local or TCT'],['api','API Keys','Verify, identify, view or remove saved keys'],['storage','Storage & Backups','Export, restore or clear module data'],['diagnostics','Diagnostics','Manager and module reports']]){
          const card=document.createElement('div');card.className='tu-card';const body=document.createElement('div');body.style.flex='1';const label=document.createElement('strong');label.textContent=name;const detail=document.createElement('small');detail.textContent=desc;body.append(label,detail);card.append(body,makeButton('Open →',()=>{settingsPage=id;render('settings')}));content.append(card);
        }return;
      }
      const back=makeButton('← Settings',()=>{settingsPage=null;diagnosticModule=null;render('settings')});back.style.margin='0 0 12px';content.append(back);
      const heading=document.createElement('h3');heading.textContent=({time:'Time Display',api:'API Keys',storage:'Storage & Backups',diagnostics:'Diagnostics'})[settingsPage];content.append(heading);
      if(settingsPage==='time'){
      const timeHeading=document.createElement('strong');timeHeading.textContent='Time Display';content.append(timeHeading);
      const timeDescription=document.createElement('p');timeDescription.textContent='Choose one timezone for TU travel estimates and observation timestamps.';content.append(timeDescription);
      const timeSelect=document.createElement('select');timeSelect.setAttribute('aria-label','TU time display');timeSelect.style.cssText='width:100%;padding:9px;margin:8px 0 18px';
      for(const [value,label] of [['local','Local Time (device)'],['tct','Torn City Time (TCT / UTC)']]){const option=document.createElement('option');option.value=value;option.textContent=label;timeSelect.append(option)}
      timeSelect.value=localStorage.getItem('tu-time-display')==='tct'?'tct':'local';
      timeSelect.addEventListener('change',()=>{localStorage.setItem('tu-time-display',timeSelect.value);pageWindow.dispatchEvent(new CustomEvent('tu-time-display-changed',{detail:{mode:timeSelect.value}}))});content.append(timeSelect);
      return;
      }
      if(settingsPage==='api'){
        const WHO_KEY='tu:who:limited-api-key:v1';
        const EXTRA_KEYS='tu:api:additional-keys:v1';
        const readExtras=()=>{try{const list=JSON.parse(localStorage.getItem(EXTRA_KEYS)||'[]');return Array.isArray(list)?list.filter(x=>x&&typeof x.key==='string'&&typeof x.level==='string'):[]}catch{return []}};
        const note=document.createElement('p');
        note.textContent='Enter any Torn API key below. TU identifies its access level before saving. Public Only and Limited Access are supported login key levels. Higher-access keys are optional and stored locally without encryption; other scripts on Torn pages may be able to read them. Do not enter a Full Access key unless necessary.';
        content.append(note);
        const form=document.createElement('form');form.autocomplete='off';
        const input=document.createElement('input');input.type='password';input.maxLength=16;input.autocomplete='off';input.placeholder='16-character Torn API key';input.style.cssText='width:100%;box-sizing:border-box;padding:9px';
        const status=document.createElement('p');status.setAttribute('role','status');status.textContent=identityStatus;
        const submit=makeButton('Confirm & Save');submit.type='submit';
        form.append(input,makeButton('Show / Hide',()=>{input.type=input.type==='password'?'text':'password'}),submit);
        content.append(form,status);
        const saved=document.createElement('div');saved.style.cssText='margin:10px 0';
        let viewing=false;
        const renderSaved=()=>{
          saved.replaceChildren();
          const keys=[];
          const publicKey=readSavedKey();if(publicKey)keys.push({key:publicKey,level:loginAccessLabel(),source:'public'});
          const who=localStorage.getItem(WHO_KEY);if(who&&who!==publicKey)keys.push({key:who,level:'Limited Access',source:'who'});
          for(const x of readExtras())if(!keys.some(y=>y.key===x.key))keys.push({...x,source:'extra'});
          const summary=document.createElement('p');summary.textContent=keys.length+' saved API key(s)';saved.append(summary);
          if(!viewing)return;
          if(!keys.length){const empty=document.createElement('p');empty.textContent='No saved keys';saved.append(empty);return;}
          for(const entry of keys){
            const row=document.createElement('div');row.style.cssText='padding:9px 0;border-top:1px solid #555';
            const label=document.createElement('strong');label.textContent=entry.level+(entry.source==='public'?' (TU login)':entry.source==='who'?' (WHO)':'');row.append(label);
            const field=document.createElement('input');field.type='password';field.readOnly=true;field.value=entry.key;field.style.cssText='display:block;width:100%;box-sizing:border-box;padding:8px;margin:6px 0';row.append(field);
            row.append(makeButton('Show / Hide',()=>{field.type=field.type==='password'?'text':'password'}));
            row.append(makeButton('Remove',async()=>{
              if(!confirm('Remove this '+entry.level+' API key?'))return;
              if(entry.source==='public'){
                try{await devCancel()}catch(error){status.textContent='Cancellation not confirmed; key retained: '+error.message;return;}
                removeSavedKey();resetDevAuthFailure();localStorage.removeItem(TU_TERMS_KEY);sessionStorage.removeItem(DEV_SESSION_KEY);clearPlayer();publishAuthorization(false);
                showAgreement();syncLauncher();
              }else if(entry.source==='who'){localStorage.removeItem(WHO_KEY)}
              else localStorage.setItem(EXTRA_KEYS,JSON.stringify(readExtras().filter(x=>x.key!==entry.key)));
              renderSaved();
            }));
            saved.append(row);
          }
        };
        content.append(makeButton('View Saved Keys',()=>{viewing=!viewing;renderSaved()}),saved);
        content.append(makeButton('Clear session',()=>{clearPlayer();status.textContent=identityStatus;refreshIdentity()}));
        form.addEventListener('submit',async event=>{
          event.preventDefault();const key=input.value.trim();input.value='';
          if(!/^[A-Za-z0-9]{16}$/.test(key)){status.textContent='Enter a valid 16-character API key';return;}
          submit.disabled=true;status.textContent='Verifying key with Torn…';
          try{
            const data=await requestIdentity(key);
            if(data?.error)throw Error(data.error.error||'Torn rejected key');
            const level=String(data?.info?.access?.type??data?.info?.access??'').trim();
            const owner=Number(data?.info?.user?.id);
            if(!level||!Number.isSafeInteger(owner)||owner<=0)throw Error('Torn did not return a valid access level and key owner');
            status.textContent='Torn confirmed: '+level;
            if(level!=='Public Only'){
              const approved=confirm('WARNING: '+level+' keys can expose more Torn account information or actions than Public Only. TU will store this key locally without encryption. Other scripts running on Torn pages may be able to read it. Continue saving this '+level+' key?');
              if(!approved){status.textContent='Verified '+level+' key; not saved (warning declined)';return;}
            }
            if(level==='Public Only'){
              const verified=await updatePlayer(key);
              if(!verified)throw Error(identityStatus);
              saveKey(key);resetDevAuthFailure();
            }else if(level==='Limited Access'){
              localStorage.setItem(WHO_KEY,key);
              localStorage.setItem(EXTRA_KEYS,JSON.stringify(readExtras().filter(x=>x.key!==key)));
            }else{
              const extras=readExtras().filter(x=>x.key!==key);
              extras.push({key,level});
              localStorage.setItem(EXTRA_KEYS,JSON.stringify(extras));
            }
            status.textContent=level+' key verified and saved';
            renderSaved();refreshIdentity();
          }catch(error){status.textContent='Not saved: '+error.message}
          finally{submit.disabled=false}
        });
        renderSaved();
        return;
      }
      if(settingsPage==='diagnostics'){
      if(diagnosticModule){const h=document.createElement('h4');h.textContent='Module: '+(registry.modules.find(m=>m.id===diagnosticModule)?.name||diagnosticModule);content.append(h)}
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
        const refresh=()=>{const all=buildDiagnostics();const mod=diagnosticModule;report.textContent=JSON.stringify(mod?{managerVersion:all.managerVersion,module:all.moduleCompatibility.find(m=>m.id===mod)||null,registered:all.registeredModules.find(m=>m.id===mod)||null}:all,null,2);};
        const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
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
      }
    }else{
      const p=document.createElement('p');p.textContent='Torn Utilities integration development build by RelaxSweety [4539436]. Drag TU to reposition.';content.append(p);
      if(devAuthIssue){const issue=document.createElement('p');issue.setAttribute('role','status');issue.textContent=devAuthIssue;content.append(issue,makeButton('Retry saved API key',()=>{resetDevAuthFailure();void restoreDevSession();}));}
      const termsHeading=document.createElement('h3');termsHeading.textContent='Terms of Use and Information Use Agreement';content.append(termsHeading);appendTerms(content);if(!hasAgreement())content.append(makeButton('Review and Accept Terms',showAgreement));
      const guideLink=document.createElement('a');guideLink.href='https://github.com/RelaxSweety/Torn-Scripts/blob/main/torn-utilities/INSTALLATION.md';guideLink.target='_blank';guideLink.rel='noopener noreferrer';guideLink.textContent='TU Installation & Module Setup Guide ↗';guideLink.style.cssText='display:block;margin:12px 0;padding:12px;border:1px solid #806a3e;border-radius:8px;color:#e4c779;text-decoration:underline;font-weight:600';content.append(guideLink);
      // Official-style vector marks; no remote image dependencies.
      addSocialIcon('RelaxSweety on Discord','https://discord.com/users/relaxsweety','M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.1 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.075.075 0 0 0-.041-.104 13.1 13.1 0 0 1-1.872-.89.076.076 0 0 1-.008-.127c.126-.095.252-.193.372-.292a.074.074 0 0 1 .077-.01c3.929 1.793 8.185 1.793 12.068 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.292a.076.076 0 0 1-.007.127c-.598.35-1.224.65-1.873.89a.076.076 0 0 0-.04.105c.36.698.77 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.83 19.83 0 0 0 6.003-3.03.077.077 0 0 0 .031-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z');
      const tornLink=document.createElement('a');tornLink.href='https://www.torn.com/profiles.php?XID=4539436';tornLink.target='_blank';tornLink.rel='noopener noreferrer';tornLink.title='RelaxSweety on Torn';tornLink.setAttribute('aria-label','RelaxSweety on Torn');
      tornLink.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:50px;height:48px;margin:12px 14px 4px 0;background:#252a2e;border:1px solid #806a3e;border-radius:12px';
      const tornLogo=document.createElement('img');tornLogo.src='https://www.torn.com/favicon.ico';tornLogo.alt='Torn';tornLogo.width=30;tornLogo.height=30;tornLink.append(tornLogo);content.append(tornLink);
    }
  }
  render(hasAgreement()?'modules':'about');
  refreshRegistry();
  restoreSavedIdentity();
  void restoreDevSession();
  setInterval(()=>{if(authorizationVerified&&!authorized())publishAuthorization(false);},1000);
  // Do not interrupt first-run API requests with an immediate alert.
  window.addEventListener('torn-utilities-ready',()=>render(currentTab));
  // A module script can be installed separately, but remains inert until Open is pressed.

  const isVisible=id=>{
    const el=document.getElementById(id);
    return !!el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  };
  const syncLauncher=()=>{
    const moduleVisible=!!active&&(['tuim-panel','tuim-catalog','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tca-panel','tca-playbar','tuac-panel'].some(isVisible)||[...moduleHost.children].some(el=>isVisible(el.id)||(!el.hidden&&el.getClientRects().length>0)));
    const consent=document.getElementById('tu-agreement-overlay');
    const hide=consent&&!consent.hidden&&consent.style.display!=='none'?true:(tuNav.minimized||tuNav.exited?false:(!panel.hidden||moduleVisible));
    if(launcher.hidden!==hide)launcher.hidden=hide;
  };
  const closePanel = () => { tuMinimize(); syncLauncher(); };
  const togglePanel=()=>{if(tuNav.minimized||tuNav.exited)tuRestore();else tuMinimize();syncLauncher();};
  const navHeader=panel.querySelector('header');
  const addNavControl=(label,title,handler,before)=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.className='tu-nav-control';
    b.addEventListener('click',e=>{e.stopPropagation();handler();syncLauncher();});
    if(before)navHeader.prepend(b);else navHeader.append(b);return b;
  };
  addNavControl('←','Back',tuBack,true);
  addNavControl('−','Minimize',tuMinimize,false);
  panel.querySelector('.tu-close').title='Exit';
  panel.querySelector('.tu-close').setAttribute('aria-label','Exit');
  panel.querySelector('.tu-close').addEventListener('click',()=>{tuExit();syncLauncher();});
  panel.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {if(!authorized()&&b.dataset.tab!=='about'){showAgreement();return;}render(b.dataset.tab);}));
  // Shared floating-window support for TU module panels.
  // Persist each TU window's user-selected size and position independently.
  const floatIds=['tu-diagnostics-window','tuim-panel','tuim-catalog','tuac-panel','tca-panel','tu-pda-panel','sff-root','tpfg-manager','tpfg-root','tpfg-prompt'];
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
  const tuEnhanceHeaders=()=>{
    for(const id of floatIds){
      if(id==='tu-pda-panel')continue;
      const el=tuRoot(id);if(!el||el.dataset.tuModuleNav==='1')continue;
      const bar=el.querySelector('header,.tu-header,.tuim-header,.tuim-travel-header,.tuac-header');if(!bar)continue;
      el.dataset.tuNavHeader='1';for(const oldButton of [...bar.querySelectorAll('button')]){if(['−','—','×'].includes(oldButton.textContent.trim())&&!oldButton.closest('[data-tu-nav-controls]'))oldButton.style.display='none';}
      if(!bar.querySelector('[data-tu-brand-emblem]')){const emblem=document.createElement('span');emblem.className='tu-brand-emblem';emblem.dataset.tuBrandEmblem='1';emblem.textContent='TU';bar.prepend(emblem);}
      if(bar.querySelector('[data-tu-nav-controls]'))continue;bar.style.position='sticky';bar.style.top='0';bar.style.zIndex='100';bar.style.background='#101417';
      const controls=document.createElement('span');controls.dataset.tuNavControls='1';controls.style.cssText='margin-left:auto;display:flex;gap:5px';
      for(const [label,title,fn] of [['←','Back',tuBack],['−','Minimize',tuMinimize],['×','Exit',tuExit]]){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
        b.style.cssText='padding:4px 9px;background:#252a2e;color:#f1ce72;border:1px solid #806a3e;border-radius:5px';
        b.addEventListener('click',e=>{e.stopPropagation();fn();syncLauncher();});controls.append(b);
      }
      bar.append(controls);
    }
  };
  enhanceFloating();tuEnhanceHeaders();
  const floatingObserver=new MutationObserver(()=>{enhanceFloating();tuEnhanceHeaders();});
  floatingObserver.observe(document.body,{childList:true,subtree:true});
  const visibilityObserver=new MutationObserver(syncLauncher);
  visibilityObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden','class']});
  syncLauncher();
  // Restore the original draggable launcher with compact dimensions.
  launcher.setAttribute('aria-label','Open Torn Utilities; drag to reposition');
  launcher.style.width='34px';
  launcher.style.height='34px';
  launcher.style.minWidth='34px';
  launcher.style.minHeight='34px';
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


/* TU INTEGRATED TOOLS: embedded source; development staging build */

/* BEGIN torn-utilities/modules/alerts-and-calculations.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){

(()=>{'use strict';
  const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.4.6';if(window.__TU_ALERT_CALC__)return;window.__TU_ALERT_CALC__=true;
const ID='alerts-calculations',state={panel:null,tab:'stocks',stock:null,minimized:false,context:null,pick:null,audio:null};
const cfg=(()=>{try{return JSON.parse(localStorage.getItem('tu-stock-calc-settings')||'{}')}catch{return {}}})();
const save=()=>{try{localStorage.setItem('tu-stock-calc-settings',JSON.stringify(cfg))}catch{}};
const num=x=>Number(String(x??'').replace(/[$,\s]/g,''));const cash=x=>'$'+x.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const E=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent?.append(e);return e};
const B=(parent,text,fn)=>{const b=E('button',parent,text);b.type='button';b.onclick=fn;return b};
const F=(parent,label,key,defaultValue)=>{E('label',parent,label);const i=E('input',parent);i.type='number';i.step='any';i.value=cfg[key]??defaultValue??'';i.oninput=()=>{cfg[key]=i.value;save()};return i};
const info=(parent,text)=>E('p',parent,text);
const rowFor=e=>e.closest('tr,[role=row],li,[class*=row],[class*=Row],[class*=card],[class*=Card]')||e.parentElement;
const stockPrice=row=>{if(!row)return NaN;for(const el of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const m=(el.getAttribute('data-price')||el.textContent||'').match(/\$?\s*([\d,]+(?:\.\d+)?)/);if(m)return num(m[1])}const matches=(row.innerText||'').match(/\$\s*[\d,]+(?:\.\d+)?/g)||[];return matches.length===1?num(matches[0]):NaN};
const qtyField=row=>[...row.querySelectorAll('input:not([type=hidden])')].find(e=>e.type==='number'||/quantity|amount|shares/i.test([e.name,e.id,e.placeholder].join(' ')))||null;
function stopPick(){if(state.pick){document.removeEventListener('pointerdown',state.pick,true);document.removeEventListener('touchstart',state.pick,true);document.removeEventListener('mousedown',state.pick,true);document.removeEventListener('click',state.pick,true)}state.pick=null;document.getElementById('tuac-tip')?.remove()}
function pick(kind){stopPick();state.panel.hidden=true;const tip=E('div',document.body,'Tap a Torn '+kind+' row to select it. Tap here to cancel.');tip.id='tuac-tip';tip.style.cssText='position:fixed;z-index:2147483646;top:10px;left:5%;width:90%;padding:12px;background:#3a2c16;color:white;border:2px solid gold';tip.onclick=()=>{stopPick();state.panel.hidden=false};state.pick=e=>{if(e.target.closest('#tuac-tip,#tuac-panel,#tu-pda-panel'))return;const row=rowFor(e.target);if(!row)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(kind==='stock')state.stock=row;else state.item=row;stopPick();state.minimized=false;state.panel.hidden=false;render()};for(const event of ['pointerdown','touchstart','mousedown','click'])document.addEventListener(event,state.pick,{capture:true,passive:false})}
function minimize(){state.minimized=true;state.panel.hidden=true;}
// Closing ends monitoring; minimizing preserves it.
function close(){stopPick();state.minimized=false;state.panel.hidden=true;state.context?.close?.()}
function render(){const p=state.panel;p.replaceChildren();const header=E('div',p);header.style.cssText='display:flex;align-items:center;gap:10px';const title=E('strong',header,'Stock and Calculations');title.style.flex='1';B(header,'−',minimize);B(header,'×',close);const nav=E('nav',p);for(const [id,label] of [['stocks','Stocks'],['math','Calculator']])B(nav,label,()=>{state.tab=id;render()});const root=E('section',p);
if(state.tab==='stocks'){info(root,'Enter current cash and desired cash AFTER the trade. Select the stock row on Torn. This tool fills quantity only; you press Buy/Sell.');B(root,'Select Torn stock row',()=>pick('stock'));const priceDetected=state.stock?.isConnected?stockPrice(state.stock):NaN;info(root,'Selected: '+(state.stock?.isConnected?(state.stock.innerText||'').slice(0,80):'None'));E('label',root,'Trade type');const side=E('select',root);for(const type of ['Buy','Sell']){const o=E('option',side,type);o.value=type}side.value=cfg.side||'Buy';side.onchange=()=>{cfg.side=side.value;save()};const current=F(root,'Current cash ($)','cash','');const target=F(root,'Desired ending cash ($)','target','');const price=F(root,'Price per share ($)','price',Number.isFinite(priceDetected)?priceDetected:'');if(Number.isFinite(priceDetected))price.value=priceDetected;const fee=F(root,'Sell fee (%)','fee',0);const out=E('pre',root,'');B(root,'Calculate and fill quantity',()=>{const c=num(current.value),t=num(target.value),v=num(price.value),f=num(fee.value),buy=side.value==='Buy';if([c,t,v,f].some(x=>!Number.isFinite(x))||c<0||t<0||v<=0||f<0||f>=100){out.textContent='Invalid values';return}const delta=buy?c-t:t-c,unit=buy?v:v*(1-f/100);if(delta<=0){out.textContent='Target must be '+(buy?'lower':'higher')+' than current cash';return}const shares=Math.floor(delta/unit+1e-10);if(shares<1||!Number.isSafeInteger(shares)){out.textContent='No valid whole-share quantity';return}const end=buy?c-shares*unit:c+shares*unit;out.textContent='Shares: '+shares+'\nEstimated ending cash: '+cash(end)+'\nTarget difference: '+cash(Math.abs(end-t));const input=state.stock?.isConnected?qtyField(state.stock):null;if(!input){out.textContent+='\nNo Torn quantity input detected; nothing filled.';return}const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,String(shares));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));out.textContent+='\nQuantity entered. Verify Torn quote before confirming.'});info(root,'Confirm the current share price, cash balance and applicable fees. The script never submits trades.');}

else{const a=F(root,'First / original value','mathA','');const b=F(root,'Second / new value','mathB','');const op=E('select',root);for(const [v,label] of [['+','Add'],['-','Subtract'],['*','Multiply'],['/','Divide'],['pct','Percentage gain/loss'],['ratio','First as % of second']]){const o=E('option',op,label);o.value=v}op.value=cfg.op||'pct';op.onchange=()=>{cfg.op=op.value;save()};const out=E('p',root,'');B(root,'Calculate',()=>{const x=num(a.value),y=num(b.value);if(![x,y].every(Number.isFinite)){out.textContent='Invalid numbers';return}const v=op.value==='+'?x+y:op.value==='-'?x-y:op.value==='*'?x*y:op.value==='/'?x/y:op.value==='pct'?(y-x)/Math.abs(x)*100:x/y*100;out.textContent=Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:5})+(['pct','ratio'].includes(op.value)?'%':''):'Undefined (division by zero)'});}}
function activate(ctx){state.context=ctx; if(!state.panel){const style=E('style',document.head);style.textContent='#tuac-panel{position:fixed;z-index:2147483642;top:10vh;left:4vw;width:min(92vw,440px);max-height:80vh;overflow:auto;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:14px;padding:14px;font:14px system-ui;box-shadow:0 10px 30px #000c}#tuac-panel[hidden]{display:none!important}#tuac-panel button{margin:4px;padding:9px;background:#d6b65c;color:#111;border:0;border-radius:6px;font-weight:700}#tuac-panel nav{display:flex}#tuac-panel nav button{flex:1}#tuac-panel label{display:block;margin-top:10px}#tuac-panel input,#tuac-panel select{display:block;width:100%;box-sizing:border-box;background:#283239;color:#fff;border:1px solid #647077;border-radius:5px;padding:9px;font-size:16px}#tuac-panel pre{white-space:pre-wrap}.tuac-monitored{outline:3px solid #1ce15e!important;outline-offset:-2px!important}.tuac-alert{outline:4px solid #00ff69!important;outline-offset:-2px!important}';state.panel=E('section',document.body);state.panel.id='tuac-panel'}state.panel.hidden=false;render()}
function deactivate(){stopPick();if(state.panel)state.panel.hidden=true;state.context=null}
// Legacy startup hooks were removed; calling them prevented TU registration.
const definition={id:ID,version:TU_MODULE_VERSION,activate,deactivate};const register=()=>(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register?.(definition);window.addEventListener('torn-utilities-ready',register);register();
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="alerts-calculations";
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
  }
  run();
})();

/* END torn-utilities/modules/alerts-and-calculations.user.js */


/* BEGIN torn-utilities/modules/flight-game.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){


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
#tpfg-launcher{position:fixed;right:12px;bottom:88px;z-index:2147483000;width:42px;height:42px;border:1px solid #777;background:#171717;color:#eee;border-radius:50%;font-size:23px;font-weight:800;touch-action:none;box-shadow:0 2px 8px #0008}
#tpfg-manager,#tpfg-game-settings,#tpfg-prompt{position:fixed;inset:0;z-index:2147483800;background:#000b;display:none;align-items:center;justify-content:center;padding:16px}
.tpfg-settings-card{width:min(420px,100%);background:#151a20;border:1px solid #59616b;border-radius:12px;padding:16px;color:#fff;font-family:Arial,sans-serif}
.tpfg-settings-card label{display:block;padding:12px 4px;border-top:1px solid #343a40}.tpfg-manager-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.tpfg-manager-tabs button,.tpfg-game-card button{min-height:42px;border:1px solid #59616b;border-radius:8px;background:#252c34;color:#fff;font-weight:800}.tpfg-manager-tabs button.tpfg-selected{background:#596674;border-color:#aeb8c2;box-shadow:inset 0 0 0 1px #d7dde3}.tpfg-game-card{display:grid;gap:8px;padding:12px;border:1px solid #343a40;border-radius:9px}.tpfg-game-card span,.tpfg-empty{color:#9da6af;font-size:12px}.tpfg-setting-row{display:flex;justify-content:space-between;padding:8px 4px}.tpfg-settings-note{color:#9da6af;font-size:11px}
#tpfg-launch{position:fixed;right:10px;bottom:88px;z-index:2147483000;border:1px solid #777;background:#171717;color:#eee;border-radius:10px;padding:10px 13px;font:700 12px Arial,sans-serif;box-shadow:0 2px 8px #0008;touch-action:manipulation}
#tpfg-launch:active{transform:scale(.97)}
#tpfg-root{position:fixed;inset:0;z-index:2147483600;background:#090b0e;color:#fff;font-family:Arial,sans-serif;display:none;overscroll-behavior:none;touch-action:none}
#tpfg-root *{box-sizing:border-box}
#tpfg-shell{height:100%;display:flex;flex-direction:column;max-width:900px;margin:0 auto;background:#0d1117}
#tpfg-top{flex:0 0 auto;padding:8px 10px;background:#151a20;border-bottom:1px solid #343a40}
#tpfg-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:800}
#tpfg-condition{font-size:11px;color:#aeb6bf;margin-top:3px;font-weight:700}
.tpfg-topbtn{border:1px solid #555;background:#242a31;color:#fff;border-radius:7px;min-width:42px;min-height:34px;font-weight:800}
#tpfg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:7px}
.tpfg-stat{background:#090c10;border:1px solid #30363d;border-radius:6px;text-align:center;padding:4px 2px;font-size:10px;color:#9da7b1}
.tpfg-stat b{display:block;color:#fff;font-size:13px;margin-top:2px}
#tpfg-stagewrap{position:relative;flex:1 1 auto;min-height:220px;overflow:hidden;background:#05080d}
#tpfg-canvas{width:100%;height:100%;display:block}
#tpfg-message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;pointer-events:none;font-weight:800;text-shadow:0 2px 4px #000}
#tpfg-controls{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:9px 12px 12px;background:#11161c;border-top:1px solid #343a40;user-select:none;-webkit-user-select:none}
#tpfg-stick{position:relative;width:150px;height:150px;margin:auto;border:1px solid #58616b;border-radius:50%;background:#1b222a;touch-action:none}
#tpfg-stick-knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px;border:1px solid #8b949e;border-radius:50%;background:#39424c;pointer-events:none}
#tpfg-stick-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8b949e;font-size:10px;pointer-events:none}
#tpfg-chatpick{position:fixed;inset:0;z-index:2147483700;background:#000b;display:none;align-items:center;justify-content:center;padding:16px}#tpfg-chatcard{width:min(440px,100%);max-height:80vh;overflow:auto;background:#151a20;border:1px solid #59616b;border-radius:12px;padding:14px}#tpfg-chatlist button{width:100%;min-height:44px;margin:5px 0;background:#252c34;color:#fff;border:1px solid #59616b;border-radius:8px}.tpfg-donate{margin-top:16px;padding-top:12px;border-top:1px solid #3a424b;font-size:12px;line-height:1.6;color:#aeb6bf}.tpfg-donate a{color:#ffd75a;font-weight:800}
#tpfg-fire{border:1px solid #58616b;background:#252c34;color:#fff;font-weight:900;border-radius:12px;touch-action:none}
#tpfg-fire.on{background:#555f6b;transform:scale(.96)}

#tpfg-actions{display:flex;flex-direction:column;justify-content:center;gap:8px}
#tpfg-audio{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center;font:700 10px Arial,sans-serif;color:#aeb6bf}#tpfg-volume{width:100%;accent-color:#8b949e}#tpfg-mute{min-height:28px;border:1px solid #555;border-radius:7px;background:#242a31;color:#fff;font-weight:800}
#tpfg-fire{min-height:82px;font-size:20px}
#tpfg-pause,#tpfg-end{min-height:40px;border:1px solid #555;border-radius:9px;background:#242a31;color:#fff;font-weight:800}
#tpfg-results{position:absolute;inset:0;background:#0d1117;z-index:3;display:none;overflow:auto;padding:22px}
#tpfg-results-card{max-width:520px;margin:20px auto;background:#151a20;border:1px solid #3a424b;border-radius:14px;padding:18px;text-align:center}
#tpfg-results h2{margin:0 0 8px;font-size:20px}
#tpfg-results-route{color:#b8c0c8;margin-bottom:16px}
#tpfg-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tpfg-result{background:#0b0e12;border-radius:8px;padding:10px;color:#aab2ba;font-size:11px}
.tpfg-result b{display:block;color:#fff;font-size:20px;margin-top:3px}
#tpfg-sharetext{white-space:pre-wrap;background:#090c10;border:1px solid #30363d;border-radius:8px;text-align:left;padding:10px;margin-top:12px;font-size:12px;color:#d6dbe0}
.tpfg-resultbtn{width:100%;min-height:46px;margin-top:9px;border:1px solid #59616b;border-radius:9px;background:#252c34;color:#fff;font-weight:800}
#tpfg-by{margin-top:13px;font-size:10px;color:#7f8993}
#tpfg-by a{color:#b9c1c9}
@media(max-width:380px){#tpfg-stats{grid-template-columns:repeat(2,1fr)}#tpfg-controls{padding-left:6px;padding-right:6px;gap:4px}#tpfg-stick{width:132px;height:132px}}
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
        function start(){stop();reset();host=document.createElement('div');host.id='tpfg-stick-fighter';host.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#080b10;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;font-family:Arial,sans-serif;color:white';
            host.innerHTML=`
            <div style="width:min(100%,420px);box-sizing:border-box;background:#151a20;border:1px solid #59616b;border-radius:9px 9px 0 0;padding:9px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:700">STICK FIGURE FIGHTER <small>v0.1.7</small><button type="button" id="sff-min" class="tpfg-topbtn" aria-label="Leave game">—</button></div>
              <div style="display:flex;justify-content:space-around;margin-top:8px;text-align:center;font-size:12px"><span>TIME<br><b id="sff-time">00:00</b></span><span>KILLS<br><b id="sff-kills">0</b></span><span>HP<br><b id="sff-hp">100</b></span><span>BEST<br><b id="sff-best">0</b></span></div>
            </div>
            <div id="sff-stage" style="position:relative;width:min(100%,420px);min-height:0;display:flex;justify-content:center"></div>
            <div style="width:min(100%,420px);box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;background:#151a20;border:1px solid #59616b;padding:8px;gap:10px">
              <span style="font-size:11px;color:#aaa">LEFT: MOVE<br>RIGHT: AIM</span>
              <span style="display:flex;gap:7px"><button id="sff-pause" type="button" class="tpfg-resultbtn">PAUSE</button><button id="sff-exit" type="button" class="tpfg-resultbtn">END GAME</button></span>
            </div>
            <div id="sff-dialog" style="display:none;position:absolute;z-index:2;inset:0;background:#000c;align-items:center;justify-content:center;padding:16px">
              <div class="tpfg-settings-card"><h3 id="sff-dialog-title">SAVE YOUR GAME?</h3><p id="sff-dialog-text">Save your current progress and continue next time?</p><div id="sff-dialog-actions" style="display:grid;gap:8px"></div></div>
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
        const a=p.querySelector('#tpfg-prompt-actions');a.innerHTML='';buttons.forEach(x=>{const b=document.createElement('button');b.className='tpfg-resultbtn';b.textContent=x.label;b.onclick=()=>{p.style.display='none';x.action();};a.appendChild(b);});if(summary){const wrap=document.createElement('div');wrap.style.cssText='margin:12px 0;padding:12px;background:#10151b;border:1px solid #59616b;border-radius:8px;font-size:12px;line-height:1.5;white-space:normal;overflow-wrap:anywhere';const label=document.createElement('strong');label.textContent='GAME SUMMARY';const content=document.createElement('div');content.textContent=summary;content.style.margin='7px 0';const copy=document.createElement('button');copy.type='button';copy.className='tpfg-resultbtn';copy.textContent='COPY SUMMARY';copy.onclick=async()=>{try{await navigator.clipboard.writeText(summary);copy.textContent='COPIED';}catch(_){const input=document.createElement('textarea');input.value=summary;input.style.cssText='position:fixed;opacity:0';document.body.appendChild(input);input.select();const ok=document.execCommand('copy');input.remove();copy.textContent=ok?'COPIED':'SELECT TEXT TO COPY';if(!ok){const selection=document.createElement('textarea');selection.value=summary;wrap.appendChild(selection);selection.focus();selection.select();}}};wrap.append(label,content,copy);a.prepend(wrap);}if(showDonation){const info=document.createElement('div');info.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid #59616b;font-size:13px;text-align:center';info.innerHTML='Enjoying Torn PDA Arcade? <a href="https://www.torn.com/profiles.php?XID=4539436" target="_blank" rel="noopener noreferrer" style="color:#e2c778">Donate to RelaxSweety [4539436]</a>';a.appendChild(info);}p.style.display='flex';
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

    function wireUI() {
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

        window.addEventListener('resize', resize);
        window.addEventListener('keydown', e => {
            if (!state.running) return;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault();
            keyFromEvent(e, true);
        }, {passive:false});
        window.addEventListener('keyup', e => keyFromEvent(e, false));
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
        window.addEventListener('blur',reset);
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
      StickFighter.stop();closeActiveGame();
      for(const id of ['tpfg-manager','tpfg-prompt','tpfg-game-settings','tpfg-root'])document.getElementById(id)?.remove();
      initialized=false;
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
  }
  run();
})();

/* END torn-utilities/modules/flight-game.user.js */


/* BEGIN torn-utilities/modules/stick-fighter.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){


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
#tpfg-launcher{position:fixed;right:12px;bottom:88px;z-index:2147483000;width:42px;height:42px;border:1px solid #777;background:#171717;color:#eee;border-radius:50%;font-size:23px;font-weight:800;touch-action:none;box-shadow:0 2px 8px #0008}
#tpfg-manager,#tpfg-game-settings,#tpfg-prompt{position:fixed;inset:0;z-index:2147483800;background:#000b;display:none;align-items:center;justify-content:center;padding:16px}
.tpfg-settings-card{width:min(420px,100%);background:#151a20;border:1px solid #59616b;border-radius:12px;padding:16px;color:#fff;font-family:Arial,sans-serif}
.tpfg-settings-card label{display:block;padding:12px 4px;border-top:1px solid #343a40}.tpfg-manager-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.tpfg-manager-tabs button,.tpfg-game-card button{min-height:42px;border:1px solid #59616b;border-radius:8px;background:#252c34;color:#fff;font-weight:800}.tpfg-manager-tabs button.tpfg-selected{background:#596674;border-color:#aeb8c2;box-shadow:inset 0 0 0 1px #d7dde3}.tpfg-game-card{display:grid;gap:8px;padding:12px;border:1px solid #343a40;border-radius:9px}.tpfg-game-card span,.tpfg-empty{color:#9da6af;font-size:12px}.tpfg-setting-row{display:flex;justify-content:space-between;padding:8px 4px}.tpfg-settings-note{color:#9da6af;font-size:11px}
#tpfg-launch{position:fixed;right:10px;bottom:88px;z-index:2147483000;border:1px solid #777;background:#171717;color:#eee;border-radius:10px;padding:10px 13px;font:700 12px Arial,sans-serif;box-shadow:0 2px 8px #0008;touch-action:manipulation}
#tpfg-launch:active{transform:scale(.97)}
#tpfg-root{position:fixed;inset:0;z-index:2147483600;background:#090b0e;color:#fff;font-family:Arial,sans-serif;display:none;overscroll-behavior:none;touch-action:none}
#tpfg-root *{box-sizing:border-box}
#tpfg-shell{height:100%;display:flex;flex-direction:column;max-width:900px;margin:0 auto;background:#0d1117}
#tpfg-top{flex:0 0 auto;padding:8px 10px;background:#151a20;border-bottom:1px solid #343a40}
#tpfg-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:800}
#tpfg-condition{font-size:11px;color:#aeb6bf;margin-top:3px;font-weight:700}
.tpfg-topbtn{border:1px solid #555;background:#242a31;color:#fff;border-radius:7px;min-width:42px;min-height:34px;font-weight:800}
#tpfg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:7px}
.tpfg-stat{background:#090c10;border:1px solid #30363d;border-radius:6px;text-align:center;padding:4px 2px;font-size:10px;color:#9da7b1}
.tpfg-stat b{display:block;color:#fff;font-size:13px;margin-top:2px}
#tpfg-stagewrap{position:relative;flex:1 1 auto;min-height:220px;overflow:hidden;background:#05080d}
#tpfg-canvas{width:100%;height:100%;display:block}
#tpfg-message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;pointer-events:none;font-weight:800;text-shadow:0 2px 4px #000}
#tpfg-controls{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:9px 12px 12px;background:#11161c;border-top:1px solid #343a40;user-select:none;-webkit-user-select:none}
#tpfg-stick{position:relative;width:150px;height:150px;margin:auto;border:1px solid #58616b;border-radius:50%;background:#1b222a;touch-action:none}
#tpfg-stick-knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px;border:1px solid #8b949e;border-radius:50%;background:#39424c;pointer-events:none}
#tpfg-stick-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8b949e;font-size:10px;pointer-events:none}
#tpfg-chatpick{position:fixed;inset:0;z-index:2147483700;background:#000b;display:none;align-items:center;justify-content:center;padding:16px}#tpfg-chatcard{width:min(440px,100%);max-height:80vh;overflow:auto;background:#151a20;border:1px solid #59616b;border-radius:12px;padding:14px}#tpfg-chatlist button{width:100%;min-height:44px;margin:5px 0;background:#252c34;color:#fff;border:1px solid #59616b;border-radius:8px}.tpfg-donate{margin-top:16px;padding-top:12px;border-top:1px solid #3a424b;font-size:12px;line-height:1.6;color:#aeb6bf}.tpfg-donate a{color:#ffd75a;font-weight:800}
#tpfg-fire{border:1px solid #58616b;background:#252c34;color:#fff;font-weight:900;border-radius:12px;touch-action:none}
#tpfg-fire.on{background:#555f6b;transform:scale(.96)}

#tpfg-actions{display:flex;flex-direction:column;justify-content:center;gap:8px}
#tpfg-audio{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center;font:700 10px Arial,sans-serif;color:#aeb6bf}#tpfg-volume{width:100%;accent-color:#8b949e}#tpfg-mute{min-height:28px;border:1px solid #555;border-radius:7px;background:#242a31;color:#fff;font-weight:800}
#tpfg-fire{min-height:82px;font-size:20px}
#tpfg-pause,#tpfg-end{min-height:40px;border:1px solid #555;border-radius:9px;background:#242a31;color:#fff;font-weight:800}
#tpfg-results{position:absolute;inset:0;background:#0d1117;z-index:3;display:none;overflow:auto;padding:22px}
#tpfg-results-card{max-width:520px;margin:20px auto;background:#151a20;border:1px solid #3a424b;border-radius:14px;padding:18px;text-align:center}
#tpfg-results h2{margin:0 0 8px;font-size:20px}
#tpfg-results-route{color:#b8c0c8;margin-bottom:16px}
#tpfg-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tpfg-result{background:#0b0e12;border-radius:8px;padding:10px;color:#aab2ba;font-size:11px}
.tpfg-result b{display:block;color:#fff;font-size:20px;margin-top:3px}
#tpfg-sharetext{white-space:pre-wrap;background:#090c10;border:1px solid #30363d;border-radius:8px;text-align:left;padding:10px;margin-top:12px;font-size:12px;color:#d6dbe0}
.tpfg-resultbtn{width:100%;min-height:46px;margin-top:9px;border:1px solid #59616b;border-radius:9px;background:#252c34;color:#fff;font-weight:800}
#tpfg-by{margin-top:13px;font-size:10px;color:#7f8993}
#tpfg-by a{color:#b9c1c9}
@media(max-width:380px){#tpfg-stats{grid-template-columns:repeat(2,1fr)}#tpfg-controls{padding-left:6px;padding-right:6px;gap:4px}#tpfg-stick{width:132px;height:132px}}
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
        function start(){stop();reset();host=document.createElement('div');host.id='tpfg-stick-fighter';host.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#080b10;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;font-family:Arial,sans-serif;color:white';
            host.innerHTML=`
            <div style="width:min(100%,420px);box-sizing:border-box;background:#151a20;border:1px solid #59616b;border-radius:9px 9px 0 0;padding:9px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:700">STICK FIGURE FIGHTER <small>v0.1.7</small><button type="button" id="sff-min" class="tpfg-topbtn" aria-label="Leave game">—</button></div>
              <div style="display:flex;justify-content:space-around;margin-top:8px;text-align:center;font-size:12px"><span>TIME<br><b id="sff-time">00:00</b></span><span>KILLS<br><b id="sff-kills">0</b></span><span>HP<br><b id="sff-hp">100</b></span><span>BEST<br><b id="sff-best">0</b></span></div>
            </div>
            <div id="sff-stage" style="position:relative;width:min(100%,420px);min-height:0;display:flex;justify-content:center"></div>
            <div style="width:min(100%,420px);box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;background:#151a20;border:1px solid #59616b;padding:8px;gap:10px">
              <span style="font-size:11px;color:#aaa">LEFT: MOVE<br>RIGHT: AIM</span>
              <span style="display:flex;gap:7px"><button id="sff-pause" type="button" class="tpfg-resultbtn">PAUSE</button><button id="sff-exit" type="button" class="tpfg-resultbtn">END GAME</button></span>
            </div>
            <div id="sff-dialog" style="display:none;position:absolute;z-index:2;inset:0;background:#000c;align-items:center;justify-content:center;padding:16px">
              <div class="tpfg-settings-card"><h3 id="sff-dialog-title">SAVE YOUR GAME?</h3><p id="sff-dialog-text">Save your current progress and continue next time?</p><div id="sff-dialog-actions" style="display:grid;gap:8px"></div></div>
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
        const a=p.querySelector('#tpfg-prompt-actions');a.innerHTML='';buttons.forEach(x=>{const b=document.createElement('button');b.className='tpfg-resultbtn';b.textContent=x.label;b.onclick=()=>{p.style.display='none';x.action();};a.appendChild(b);});if(summary){const wrap=document.createElement('div');wrap.style.cssText='margin:12px 0;padding:12px;background:#10151b;border:1px solid #59616b;border-radius:8px;font-size:12px;line-height:1.5;white-space:normal;overflow-wrap:anywhere';const label=document.createElement('strong');label.textContent='GAME SUMMARY';const content=document.createElement('div');content.textContent=summary;content.style.margin='7px 0';const copy=document.createElement('button');copy.type='button';copy.className='tpfg-resultbtn';copy.textContent='COPY SUMMARY';copy.onclick=async()=>{try{await navigator.clipboard.writeText(summary);copy.textContent='COPIED';}catch(_){const input=document.createElement('textarea');input.value=summary;input.style.cssText='position:fixed;opacity:0';document.body.appendChild(input);input.select();const ok=document.execCommand('copy');input.remove();copy.textContent=ok?'COPIED':'SELECT TEXT TO COPY';if(!ok){const selection=document.createElement('textarea');selection.value=summary;wrap.appendChild(selection);selection.focus();selection.select();}}};wrap.append(label,content,copy);a.prepend(wrap);}if(showDonation){const info=document.createElement('div');info.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid #59616b;font-size:13px;text-align:center';info.innerHTML='Enjoying Torn PDA Arcade? <a href="https://www.torn.com/profiles.php?XID=4539436" target="_blank" rel="noopener noreferrer" style="color:#e2c778">Donate to RelaxSweety [4539436]</a>';a.appendChild(info);}p.style.display='flex';
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

    function wireUI() {
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

        window.addEventListener('resize', resize);
        window.addEventListener('keydown', e => {
            if (!state.running) return;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault();
            keyFromEvent(e, true);
        }, {passive:false});
        window.addEventListener('keyup', e => keyFromEvent(e, false));
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
        window.addEventListener('blur',reset);
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
      for(const id of ['tpfg-manager','tpfg-prompt','tpfg-game-settings','tpfg-root'])document.getElementById(id)?.remove();
      initialized=false;
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
  }
  run();
})();

/* END torn-utilities/modules/stick-fighter.user.js */


/* BEGIN torn-utilities/modules/tic-tac-toe.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){

(()=>{
  "use strict";
const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.6.4';
if(window.__TU_TTT_MODULE__)return;window.__TU_TTT_MODULE__=true;
const ID="tic-tac-toe";let panel=null,host=null,dragCleanup=null;
const API="https://tu-multiplayer-server.tuserver.workers.dev",STORE="tu-ttt-pda-session-v1";
let session=null,timer=null,busy=false,latestGame=null,lastAnnounced=null;
try{localStorage.removeItem("tu-ttt-player-name");session=JSON.parse(localStorage.getItem(STORE));}catch{}
const el=(tag,props={},parent)=>{const n=document.createElement(tag);Object.assign(n,props);parent?.appendChild(n);return n;};
const btn=(label,fn,parent)=>{const b=el("button",{textContent:label},parent);Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"8px",cursor:"pointer"});b.addEventListener("click",fn);return b;};

const HISTORY_KEY="tu:history:"+ID;
function historyRead(){try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(h)?h:[]}catch{return []}}
function recordResult(g){if(!g?.winner||!session?.room)return;const h=historyRead();if(h.some(x=>x.room===session.room&&x.round===(g.round||1)))return;h.unshift({room:session.room,round:g.round||1,symbol:session.symbol,winner:g.winner,moves:g.moves||0,names:g.names||{},completed:new Date().toISOString()});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,200)))}catch{}}
function buildHistoryUI(parent){const wrap=el("div",{},parent);wrap.style.cssText="margin:10px 0;border-top:1px solid #657184;padding-top:8px";const bar=el("div",{},wrap);bar.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px";el("strong",{textContent:"Head-to-head history"},bar);const open=btn("Game History",()=>{page.hidden=!page.hidden;open.textContent=page.hidden?"Game History":"Hide History";update()},bar);const summary=el("div",{},wrap);summary.style.cssText="font-size:12px;line-height:1.6;margin-top:6px";const page=el("div",{},wrap);page.hidden=true;page.style.cssText="max-height:240px;overflow:auto;border:1px solid #657184;padding:8px";function update(){const h=historyRead(),g=latestGame,n=g?.names||{},x=n.X||"Player X",o=n.O||"Player O";const games=h.filter(v=>v.names?.X===x&&v.names?.O===o);const xw=games.filter(v=>v.winner==="X").length,ow=games.filter(v=>v.winner==="O").length,draw=games.filter(v=>v.winner==="draw").length;summary.textContent=x+" "+xw+" wins | "+o+" "+ow+" wins | Draws "+draw+" | Games "+games.length+" (this device)";if(!page.hidden){page.replaceChildren();if(!games.length)el("div",{textContent:"No completed games recorded for this matchup on this device."},page);for(const v of games)el("div",{textContent:new Date(v.completed).toLocaleString()+" | "+(v.winner==="draw"?"Draw":(v.names[v.winner]||"Player "+v.winner)+" won")},page)}}update();return update}

function activate(context){host=context.mount;panel=el("div",{},host);panel.hidden=false;
Object.assign(panel.style,{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxHeight:"82vh",overflowY:"auto",boxSizing:"border-box",zIndex:"2147483647",width:"min(360px,94vw)",padding:"15px",background:"#20252e",color:"#fff",border:"1px solid #888",borderRadius:"12px",font:"14px system-ui"});
const bar=el("div",{},panel);
Object.assign(bar.style,{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",cursor:"move",touchAction:"none",userSelect:"none",marginBottom:"10px"});
const heading=el("strong",{textContent:"TU Tic-Tac-Toe"},bar);
const minimize=btn("−",()=>{context.close();},bar);
minimize.title="Minimize to TU";minimize.setAttribute("aria-label","Minimize Tic-Tac-Toe to TU");
Object.assign(minimize.style,{fontSize:"22px",fontWeight:"bold",padding:"0 12px",lineHeight:"30px"});
const grip=el("div",{textContent:"◢"},panel);
Object.assign(grip.style,{position:"absolute",right:"3px",bottom:"2px",width:"30px",height:"30px",display:"flex",alignItems:"end",justifyContent:"end",padding:"3px",boxSizing:"border-box",cursor:"nwse-resize",touchAction:"none",color:"#d6b96a",fontSize:"21px",zIndex:"2"});
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
controls.style.display="flex";controls.style.gap="6px";controls.style.flexWrap="wrap";
const roomInput=el("input",{placeholder:"ROOM CODE",maxLength:6},controls);Object.assign(roomInput.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"6px"});
btn("Join",()=>{const room=roomInput.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(room))return notice("Invalid room code");const identity=playerIdentity();if(identity)action("/api/rooms/"+room+"/join","POST",identity,true);},controls);
btn("Create",()=>{const identity=playerIdentity();if(identity)action("/api/rooms","POST",identity,true)},controls);
btn("Leave",()=>{session=null;lastAnnounced=null;localStorage.removeItem(STORE);clearInterval(timer);timer=null;render(null);},controls);
const roomText=el("div",{},panel);
const opponentText=el("div",{},panel);
const summaryBtn=btn("Copy game summary",()=>copySummary(),panel);
const rematchBtn=btn("Rematch",()=>{if(session)action("/api/rooms/"+session.room+"/rematch","POST",{});},panel);
const victoryPopup=el("div",{},panel);victoryPopup.hidden=true;victoryPopup.style.cssText="position:sticky;top:8px;z-index:5;background:#143b27;color:#8bffab;border:2px solid #39d879;border-radius:10px;padding:14px;text-align:center;font-size:20px;font-weight:800;box-shadow:0 4px 18px #0009";const victoryText=el("div",{},victoryPopup);btn("Close",()=>{victoryPopup.hidden=true},victoryPopup);
function playerIdentity(){const p=(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.getPlayer?.();if(!p?.name||!p?.id){(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.requestPlayerProfile?.();notice("Open Torn Home to identify your player in TU Manager");return null}return {name:p.name,playerId:String(p.id)}}
function copySummary(){if(!latestGame||!session)return notice("No game to summarize");const g=latestGame,n=g.names||{},x=n.X||"Player X",o=n.O||"Player O",result=g.winner==="draw"?"Draw":g.winner?(n[g.winner]||"Player "+g.winner)+" won":"In progress";const message="Tic-Tac-Toe | "+x+" vs "+o+" | "+result;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(message).then(()=>notice("Summary copied")).catch(()=>fallbackCopy(message));else fallbackCopy(message)}

function fallbackCopy(message){const t=el("textarea",{value:message},panel);t.select();try{document.execCommand("copy");notice("Summary copied - paste into Torn chat");}catch{notice("Select and copy the summary below");}setTimeout(()=>t.remove(),12000);}
btn("Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join TU Tic-Tac-Toe room "+session.room);},panel);
const board=el("div",{},panel);Object.assign(board.style,{position:"relative",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px",marginTop:"12px"});
const winOverlay=el("svg",{},board);winOverlay.setAttribute("viewBox","0 0 300 300");winOverlay.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2";panel._historyUpdate=buildHistoryUI(panel);
const squares=Array.from({length:9},(_,i)=>{const b=btn("",()=>{if(session)action("/api/rooms/"+session.room+"/move","POST",{index:i});},board);Object.assign(b.style,{height:"65px",touchAction:"manipulation",fontSize:"30px",background:"#333c49",color:"#fff"});return b;});
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
  }
  run();
})();

/* END torn-utilities/modules/tic-tac-toe.user.js */


/* BEGIN torn-utilities/modules/torn-four.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){

(()=>{
  'use strict';
const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.2.4';
const ID="torn-four",API="https://tu-multiplayer-server.tuserver.workers.dev/api/connect",STORE="tu:"+ID+":session";
let mount=null,panel=null,timer=null,session=null,game=null,context=null,placement=[],fleet=[];
try{session=JSON.parse(localStorage.getItem(STORE)||"null")}catch{}
const E=(tag,parent,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;parent.append(x);return x};
const B=(parent,text,fn)=>{const b=E("button",parent,text);b.type="button";b.onclick=fn;Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"8px",cursor:"pointer",font:"inherit"});return b};
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
function buildHistoryUI(parent){const wrap=E("div",parent);wrap.style.cssText="margin:10px 0;border-top:1px solid #657184;padding-top:8px";const bar=E("div",wrap);bar.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap";E("strong",bar,"Game statistics");const open=B(bar,"Game History",()=>{const visible=page.hidden;page.hidden=!visible;open.textContent=visible?"Hide History":"Game History";update()});const summary=E("div",wrap);summary.style.cssText="font-size:12px;line-height:1.6;color:#d8dde5;margin-top:6px";const page=E("div",wrap);page.hidden=true;page.style.cssText="margin-top:10px;max-height:240px;overflow:auto;border:1px solid #657184;border-radius:6px;padding:8px";function update(){const h=historyRead();summary.textContent="Completed: "+h.length+" | "+statsText(h);if(!page.hidden){page.replaceChildren();if(!h.length)E("p",page,"No completed matches recorded on this device.");for(const x of h){const row=E("div",page);row.style.cssText="border-bottom:1px solid #485463;padding:6px 0;font-size:12px";const result=x.winner==="draw"?"Draw":"Player "+x.winner+" won";row.textContent=new Date(x.completed).toLocaleString()+" | Room "+x.room+" | "+result+" | "+x.moves+" moves | You: "+x.symbol}}}update();return update}

const say=s=>{if(panel)panel.querySelector(".status").textContent=s};
async function action(path,method="GET",body,joined=false){try{const r=await request(path,method,body);if(joined){session={room:r.room,token:r.token,symbol:r.symbol};localStorage.setItem(STORE,JSON.stringify(session))}game=r.game;recordResult(game);render()}catch(e){say(e.message)}}
function status(g){if(!g)return "Create or join a room";if(g.winner)return g.winner===session.symbol?"You won!":g.winner==="draw"?"Draw":"Opponent won";if(!g.ready)return "Waiting for opponent";return g.turn===session.symbol?"Your turn":"Opponent turn";}
function render(){if(!panel)return;const area=panel.querySelector(".game");area.replaceChildren();say(status(game));panel.querySelector(".room").textContent=session?"Room: "+session.room+" | You: "+session.symbol:"";panel.querySelector(".players").textContent=session?"You: Player "+session.symbol+" | Opponent: Player "+(session.symbol==="X"?"O":"X"):"";panel._historyUpdate?.();

if(!game)return;
const grid=E("div",area);grid.style.cssText="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px";
for(let i=0;i<42;i++){const c=i%7,v=game.board[i];const b=B(grid,v==="X"?"●":v==="O"?"●":"·",()=>action("/"+session.room+"/move","POST",{index:c}));b.style.cssText="min-width:0;height:38px;padding:0;background:"+(v==="X"?"#c44848":v==="O"?"#d9bd52":"#29384a")+";color:white;border:1px solid #687689;border-radius:50%;font-size:25px";b.disabled=!game.ready||!!game.winner||game.turn!==session.symbol||!!game.board[c];}

}
function activate(ctx){context=ctx;mount=ctx.mount;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#20252e;color:#fff;border:1px solid #888;border-radius:12px;padding:15px;width:min(360px,94vw);height:min(480px,78vh);min-width:260px;min-height:260px;max-width:96vw;max-height:90vh;overflow:auto;resize:both;box-sizing:border-box;font:14px system-ui";
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:3px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:21px;z-index:2";const head=E("div",panel);head.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:8px;touch-action:none;user-select:none;cursor:move;margin-bottom:10px";E("strong",head,"Torn Four");const minimize=B(head,"−",()=>ctx.close());minimize.title="Minimize to TU";minimize.setAttribute("aria-label","Minimize game to TU");Object.assign(minimize.style,{fontSize:"22px",fontWeight:"bold",padding:"0 12px",lineHeight:"30px"});
let origin;head.addEventListener("pointerdown",e=>{if(e.target.tagName==="BUTTON")return;const r=panel.getBoundingClientRect();origin={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";head.setPointerCapture(e.pointerId)});head.addEventListener("pointermove",e=>{if(!origin)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,origin.l+e.clientX-origin.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,origin.t+e.clientY-origin.y))+"px"});head.addEventListener("pointerup",()=>origin=null);head.addEventListener("pointercancel",()=>origin=null);
let resizing=null;grip.addEventListener("pointerdown",e=>{e.preventDefault();const r=panel.getBoundingClientRect();resizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";panel.style.width=r.width+"px";panel.style.height=r.height+"px";grip.setPointerCapture(e.pointerId)});grip.addEventListener("pointermove",e=>{if(!resizing)return;panel.style.width=Math.max(260,Math.min(innerWidth-resizing.l-8,resizing.w+e.clientX-resizing.x))+"px";panel.style.height=Math.max(260,Math.min(innerHeight-resizing.t-8,resizing.h+e.clientY-resizing.y))+"px"});grip.addEventListener("pointerup",()=>resizing=null);grip.addEventListener("pointercancel",()=>resizing=null);
const status=E("div",panel,"Create or join a room");status.className="status";const controls=E("div",panel);controls.style.cssText="display:flex;gap:6px;flex-wrap:wrap;align-items:center";const code=E("input",controls);code.placeholder="ROOM CODE";code.maxLength=6;Object.assign(code.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"6px",font:"inherit",boxSizing:"border-box"});
B(controls,"Join",()=>{const c=code.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))return say("Invalid room code");action("/"+c+"/join","POST",{},true)});
B(controls,"Create",()=>action("","POST",{},true));B(controls,"Leave",()=>{session=null;game=null;fleet=[];placement=[];localStorage.removeItem(STORE);render()});
const roomInfo=E("div",panel);roomInfo.className="room";const playerInfo=E("div",panel);playerInfo.className="players";const share=E("div",panel);share.style.cssText="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0";B(share,"Copy game summary",()=>{if(!game||!session)return say("No game to summarize");const result=game.winner?(game.winner==="draw"?"Draw":game.winner===session.symbol?"You won":"Opponent won"):"In progress";const msg="Torn Four | Room "+session.room+" | Player X vs Player O | "+result+" | Moves: "+game.moves;navigator.clipboard?.writeText(msg).then(()=>say("Summary copied")).catch(()=>say("Clipboard unavailable"))});B(share,"Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join Torn Four: "+session.room)});E("div",panel).className="game";panel._historyUpdate=buildHistoryUI(panel);
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
  }
  run();
})();

/* END torn-utilities/modules/torn-four.user.js */


/* BEGIN torn-utilities/modules/torn-fleet.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){

(()=>{
  'use strict';
const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.2.4';
const ID="torn-fleet",API="https://tu-multiplayer-server.tuserver.workers.dev/api/battleship",STORE="tu:"+ID+":session";
let mount=null,panel=null,timer=null,session=null,game=null,context=null,placement=[],fleet=[];
try{session=JSON.parse(localStorage.getItem(STORE)||"null")}catch{}
const E=(tag,parent,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;parent.append(x);return x};
const B=(parent,text,fn)=>{const b=E("button",parent,text);b.type="button";b.onclick=fn;Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"8px",cursor:"pointer",font:"inherit"});return b};
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
function buildHistoryUI(parent){const wrap=E("div",parent);wrap.style.cssText="margin:10px 0;border-top:1px solid #657184;padding-top:8px";const bar=E("div",wrap);bar.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap";E("strong",bar,"Game statistics");const open=B(bar,"Game History",()=>{const visible=page.hidden;page.hidden=!visible;open.textContent=visible?"Hide History":"Game History";update()});const summary=E("div",wrap);summary.style.cssText="font-size:12px;line-height:1.6;color:#d8dde5;margin-top:6px";const page=E("div",wrap);page.hidden=true;page.style.cssText="margin-top:10px;max-height:240px;overflow:auto;border:1px solid #657184;border-radius:6px;padding:8px";function update(){const h=historyRead();summary.textContent="Completed: "+h.length+" | "+statsText(h);if(!page.hidden){page.replaceChildren();if(!h.length)E("p",page,"No completed matches recorded on this device.");for(const x of h){const row=E("div",page);row.style.cssText="border-bottom:1px solid #485463;padding:6px 0;font-size:12px";const result=x.winner==="draw"?"Draw":"Player "+x.winner+" won";row.textContent=new Date(x.completed).toLocaleString()+" | Room "+x.room+" | "+result+" | "+x.moves+" moves | You: "+x.symbol}}}update();return update}

const say=s=>{if(panel)panel.querySelector(".status").textContent=s};
async function action(path,method="GET",body,joined=false){try{const r=await request(path,method,body);if(joined){session={room:r.room,token:r.token,symbol:r.symbol};localStorage.setItem(STORE,JSON.stringify(session))}game=r.game;recordResult(game);render()}catch(e){say(e.message)}}
function status(g){if(!g)return "Create or join a room";if(g.winner)return g.winner===session.symbol?"You won!":g.winner==="draw"?"Draw":"Opponent won";if(!g.ready)return "Waiting for opponent";if(!g.placed.X||!g.placed.O)return "Place your fleet and wait for opponent";return g.turn===session.symbol?"Fire at enemy waters":"Opponent turn";}
function render(){if(!panel)return;const area=panel.querySelector(".game");area.replaceChildren();say(status(game));panel.querySelector(".room").textContent=session?"Room: "+session.room+" | You: "+session.symbol:"";panel.querySelector(".players").textContent=session?"You: Player "+session.symbol+" | Opponent: Player "+(session.symbol==="X"?"O":"X"):"";panel._historyUpdate?.();
if(!game)return;
const info=E("p",area,game.placed[session.symbol]?"Your fleet is deployed":"Place 3 ships: lengths 3, 2, 2. Tap cells to select a straight line, then tap Add Ship.");
const own=E("div",area);E("strong",own,"Your waters");const grid=(parent,click,paint)=>{const g=E("div",parent);g.style.cssText="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px";for(let i=0;i<64;i++){const b=B(g,"",()=>click(i));b.style.cssText="height:28px;min-width:0;padding:0;border:1px solid #667; background:"+paint(i)+";color:white";}}; 
grid(own,i=>{if(game.placed[session.symbol])return;placement.includes(i)?placement.splice(placement.indexOf(i),1):placement.push(i);render()},i=>game.incoming.includes(i)?(game.myShips.includes(i)?"#d14b4b":"#d9d9d9"):placement.includes(i)?"#e5ba44":game.myShips.includes(i)?"#4a9b71":"#29384a");
if(!game.placed[session.symbol]){E("p",area,"Selected: "+placement.length+" | Next ship: "+([3,2,2][fleet.length]||0));B(area,"Add Ship",()=>{const len=[3,2,2][fleet.length];if(placement.length!==len)return say("Select "+len+" cells");const rows=placement.map(i=>Math.floor(i/8)),cols=placement.map(i=>i%8);if(!(rows.every(x=>x===rows[0])&&Math.max(...cols)-Math.min(...cols)===len-1||cols.every(x=>x===cols[0])&&Math.max(...rows)-Math.min(...rows)===len-1))return say("Ship must be straight and contiguous");if(fleet.flat().some(i=>placement.includes(i)))return say("Ships cannot overlap");fleet.push([...placement]);placement=[];if(fleet.length===3)action("/"+session.room+"/move","POST",{ships:fleet});else render()})}
const enemy=E("div",area);E("strong",enemy,"Enemy waters (tap to fire)");
grid(enemy,i=>{if(!game.placed.X||!game.placed.O||game.turn!==session.symbol||game.myShots.includes(i)||game.winner)return;action("/"+session.room+"/move","POST",{index:i})},i=>game.myShots.includes(i)?"#d7d7d7":"#29384a");
E("p",area,"Shots fired: "+game.myShots.length+" | Incoming: "+game.incoming.length);

}
function activate(ctx){context=ctx;mount=ctx.mount;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#20252e;color:#fff;border:1px solid #888;border-radius:12px;padding:15px;width:min(360px,94vw);height:min(480px,78vh);min-width:260px;min-height:260px;max-width:96vw;max-height:90vh;overflow:auto;resize:both;box-sizing:border-box;font:14px system-ui";
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:3px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:21px;z-index:2";const head=E("div",panel);head.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:8px;touch-action:none;user-select:none;cursor:move;margin-bottom:10px";E("strong",head,"Torn Fleet");const minimize=B(head,"−",()=>ctx.close());minimize.title="Minimize to TU";minimize.setAttribute("aria-label","Minimize game to TU");Object.assign(minimize.style,{fontSize:"22px",fontWeight:"bold",padding:"0 12px",lineHeight:"30px"});
let origin;head.addEventListener("pointerdown",e=>{if(e.target.tagName==="BUTTON")return;const r=panel.getBoundingClientRect();origin={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";head.setPointerCapture(e.pointerId)});head.addEventListener("pointermove",e=>{if(!origin)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,origin.l+e.clientX-origin.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,origin.t+e.clientY-origin.y))+"px"});head.addEventListener("pointerup",()=>origin=null);head.addEventListener("pointercancel",()=>origin=null);
let resizing=null;grip.addEventListener("pointerdown",e=>{e.preventDefault();const r=panel.getBoundingClientRect();resizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";panel.style.width=r.width+"px";panel.style.height=r.height+"px";grip.setPointerCapture(e.pointerId)});grip.addEventListener("pointermove",e=>{if(!resizing)return;panel.style.width=Math.max(260,Math.min(innerWidth-resizing.l-8,resizing.w+e.clientX-resizing.x))+"px";panel.style.height=Math.max(260,Math.min(innerHeight-resizing.t-8,resizing.h+e.clientY-resizing.y))+"px"});grip.addEventListener("pointerup",()=>resizing=null);grip.addEventListener("pointercancel",()=>resizing=null);
const status=E("div",panel,"Create or join a room");status.className="status";const controls=E("div",panel);controls.style.cssText="display:flex;gap:6px;flex-wrap:wrap;align-items:center";const code=E("input",controls);code.placeholder="ROOM CODE";code.maxLength=6;Object.assign(code.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"6px",font:"inherit",boxSizing:"border-box"});
B(controls,"Join",()=>{const c=code.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))return say("Invalid room code");action("/"+c+"/join","POST",{},true)});
B(controls,"Create",()=>action("","POST",{},true));B(controls,"Leave",()=>{session=null;game=null;fleet=[];placement=[];localStorage.removeItem(STORE);render()});
const roomInfo=E("div",panel);roomInfo.className="room";const playerInfo=E("div",panel);playerInfo.className="players";const share=E("div",panel);share.style.cssText="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0";B(share,"Copy game summary",()=>{if(!game||!session)return say("No game to summarize");const result=game.winner?(game.winner==="draw"?"Draw":game.winner===session.symbol?"You won":"Opponent won"):"In progress";const msg="Torn Fleet | Room "+session.room+" | Player X vs Player O | "+result+" | Moves: "+game.moves;navigator.clipboard?.writeText(msg).then(()=>say("Summary copied")).catch(()=>say("Clipboard unavailable"))});B(share,"Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join Torn Fleet: "+session.room)});E("div",panel).className="game";panel._historyUpdate=buildHistoryUI(panel);
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
  }
  run();
})();

/* END torn-utilities/modules/torn-fleet.user.js */


/* BEGIN torn-utilities/modules/torn-snake.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){

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
function activate({mount,close}){panel=E("section",mount);panel.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(370px,95vw);max-height:90vh;overflow:auto;resize:both;background:#20252e;color:white;border:1px solid #888;border-radius:12px;padding:15px;min-width:260px;min-height:320px;height:min(660px,82vh);max-width:96vw;box-sizing:border-box;z-index:2147483647;font:14px system-ui";
const bar=E("div",panel);bar.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;cursor:move;touch-action:none;user-select:none";E("strong",bar,"Slithering Streets");const min=E("button",bar,"−");min.onclick=close;min.title="Minimize to TU";min.setAttribute("aria-label","Minimize Slithering Streets to TU");min.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:0 12px;line-height:30px;font-size:22px;font-weight:bold;cursor:pointer";
let drag;bar.onpointerdown=e=>{if(e.target===min)return;const r=panel.getBoundingClientRect();drag=[e.clientX,e.clientY,r.left,r.top];panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";bar.setPointerCapture(e.pointerId)};bar.onpointermove=e=>{if(!drag)return;panel.style.left=Math.max(0,drag[2]+e.clientX-drag[0])+"px";panel.style.top=Math.max(0,drag[3]+e.clientY-drag[1])+"px"};bar.onpointerup=()=>drag=null;bar.onpointercancel=()=>drag=null;
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:3px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:21px;z-index:2";let resizing=null;grip.onpointerdown=e=>{e.preventDefault();const r=panel.getBoundingClientRect();resizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";panel.style.width=r.width+"px";panel.style.height=r.height+"px";grip.setPointerCapture(e.pointerId)};grip.onpointermove=e=>{if(!resizing)return;panel.style.width=Math.max(260,Math.min(innerWidth-resizing.l-8,resizing.w+e.clientX-resizing.x))+"px";panel.style.height=Math.max(320,Math.min(innerHeight-resizing.t-8,resizing.h+e.clientY-resizing.y))+"px"};grip.onpointerup=()=>resizing=null;grip.onpointercancel=()=>resizing=null;
const status=E("div",panel,"Ready to play");status.style.cssText="margin:6px 0;color:#d8dde5";const arena=E("div",panel);arena.style.cssText="border:3px solid #d6b96a;border-radius:7px;background:#111a21;padding:5px;box-shadow:inset 0 0 0 1px #657184;margin:8px auto;width:100%;max-width:340px;box-sizing:border-box";canvas=E("canvas",arena);canvas.width=320;canvas.height=320;canvas.style.cssText="width:100%;aspect-ratio:1;display:block;touch-action:none;border:1px solid #425264;box-sizing:border-box";ctx=canvas.getContext("2d");
const statbox=E("div",panel);statbox.style.cssText="font-size:12px;color:#d8dde5;margin:8px 0";const history=E("div",panel);history.hidden=true;history.style.cssText="max-height:180px;overflow:auto;border:1px solid #657184;border-radius:6px;padding:8px;margin:6px 0";const show=E("button",panel,"Game History");show.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:8px;cursor:pointer";show.onclick=()=>{history.hidden=!history.hidden;show.textContent=history.hidden?"Game History":"Hide History";panel._statsUpdate?.()};panel._statsUpdate=()=>{let h=[];try{h=JSON.parse(localStorage.getItem("tu:snake:runs")||"[]")}catch{}statbox.textContent="Current score: "+score+" | Best score: "+(localStorage.getItem("tu:snake:best")||0)+" | Games played: "+h.length+" | Average: "+(h.length?Math.round(h.reduce((a,b)=>a+b.score,0)/h.length):0);if(!history.hidden){history.replaceChildren();if(!h.length)E("p",history,"No completed games yet.");for(const x of h)E("div",history,new Date(x.completed).toLocaleString()+" | Score: "+x.score)}};panel._statsUpdate();const controls=E("div",panel);controls.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;max-width:240px;margin:8px auto";const button=(label,fn)=>{const b=E("button",controls,label);b.style.cssText="padding:10px;background:#344154;color:white;border:1px solid #657184;border-radius:6px;font:inherit;cursor:pointer";b.onclick=fn;return b};
button(" ",()=>{});button("▲",()=>turn(0,-1));button(" ",()=>{});button("◀",()=>turn(-1,0));button("▼",()=>turn(0,1));button("▶",()=>turn(1,0));const play=E("button",panel,"Start / Restart");play.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:9px 14px;font:inherit;cursor:pointer";play.onclick=start;
const copy=E("button",panel,"Copy Game Summary");copy.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:9px 14px;font:inherit;cursor:pointer;margin:8px 0 0 8px";copy.onclick=async()=>{let h=[];try{h=JSON.parse(localStorage.getItem("tu:snake:runs")||"[]")}catch{}const best=Number(localStorage.getItem("tu:snake:best")||0),avg=h.length?Math.round(h.reduce((a,b)=>a+b.score,0)/h.length):0;const latest=h[0];const identity=(()=>{const player=(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.getPlayer?.();if(player?.name)return {name:player.name,link:player.profileUrl};(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.requestPlayerProfile?.();return {name:null,link:"https://www.torn.com/profiles.php"}})();const msg=(identity.name||identity.link)+" played Slithering Streets for a score of "+(latest?latest.score:score);try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(msg);status.textContent="Game summary copied — paste into Torn chat";return}}catch{}const field=E("textarea",panel,msg);field.style.cssText="display:block;width:100%;height:70px;margin-top:8px";field.select();let ok=false;try{ok=document.execCommand("copy")}catch{}status.textContent=ok?"Game summary copied — paste into Torn chat":"Select and copy the summary below";if(ok)setTimeout(()=>field.remove(),2000)};
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
  }
  run();
})();

/* END torn-utilities/modules/torn-snake.user.js */


/* BEGIN torn-utilities/modules/chaos-marbles.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){

(()=>{
  'use strict';
const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'0.2.4';
const ID="chaos-marbles",KEY="tu:chaos-marbles:game",HISTORY="tu:chaos-marbles:history";
const COLORS=["#dc6059","#e4b951","#5fb2da","#8fd17b"],NAMES=["Crimson","Gold","Azure","Emerald"];
let panel=null,game=null,notice="",view="play",active=false,session=null,timer=null,busy=false,rolling=false,dieValue=1,rollTimer=null;const API="https://tu-multiplayer-server.tuserver.workers.dev/api/marbles",SESSION="tu:chaos-marbles:session";
const E=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e};
const B=(parent,label,fn)=>{const b=E("button",parent,label);b.type="button";b.onclick=fn;b.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:8px 10px;cursor:pointer;font:inherit";return b};
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
function drawBoard(parent){const wrap=E("div",parent);wrap.style.cssText="border:3px solid #d6b96a;background:#121b25;border-radius:10px;padding:5px;margin:10px auto;max-width:420px;box-sizing:border-box";const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 480 480");svg.style.cssText="display:block;width:100%;aspect-ratio:1";wrap.append(svg);
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

function historyPage(parent){const h=read(HISTORY,[]);E("strong",parent,"Completed games on this device: "+h.length);E("p",parent,"Your wins: "+h.filter(x=>x.winner===x.player).length);if(!h.length)E("p",parent,"No completed games yet.");for(const x of h.slice(0,30)){const row=E("div",parent,new Date(x.ended).toLocaleString()+" | Room "+x.room+" | "+NAMES[x.winner]+" won | "+x.moves+" moves | You: "+NAMES[x.player]);row.style.cssText="border-bottom:1px solid #465466;padding:7px 0;font-size:12px"}}
function render(){if(!panel)return;const body=panel.querySelector(".body");body.replaceChildren();const tabs=E("div",body);tabs.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0";B(tabs,"Play",()=>{view="play";render()});B(tabs,"Game History",()=>{view="history";render()});if(view==="history"){historyPage(body);return}
if(!session){E("p",body,"Online multiplayer for 2–4 players. Each player joins from their own device. Roll 6 to leave Waiting for Chaos.");const controls=E("div",body);controls.style.cssText="display:flex;gap:6px;flex-wrap:wrap";const input=E("input",controls);input.placeholder="ROOM CODE";input.maxLength=6;input.style.cssText="width:115px;padding:7px";B(controls,"Join",()=>{const c=input.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c)){notice="Invalid room code";render();return}action("/"+c+"/join","POST",{},true)});for(let n=2;n<=4;n++)B(body,"Create "+n+"-player room",()=>action("","POST",{count:n},true));E("p",body,notice);return}
const header=E("div",body);header.style.cssText="padding:8px;background:#293747;border-radius:6px";header.textContent="Room: "+session.room+" | You: "+NAMES[session.player];const controls=E("div",body);controls.style.cssText="display:flex;gap:7px;flex-wrap:wrap;margin:8px 0";B(controls,"Copy Invite",()=>{const text="Join TU Chaos Marbles room "+session.room; if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).catch(()=>{});else notice=text});B(controls,"Leave",()=>{session=null;game=null;save();render()});B(controls,"Refresh",()=>action("/"+session.room+"/state"));
if(!game){E("p",body,"Loading room...");return}
const ready=game.ready;const status=E("div",body);status.style.cssText="padding:8px;border-radius:6px;background:#293747";status.textContent=game.winner!==null?NAMES[game.winner]+" wins!":!ready?"Waiting for Chaos: "+game.players.filter(Boolean).length+"/"+game.count+" players joined":game.turn===session.player?"Your turn — "+(game.roll===null?"roll the die":"move a marble (roll "+game.roll+")"):NAMES[game.turn]+"'s turn";
E("p",body,notice).style.fontSize="12px";E("div",body,"Waiting for Chaos — unplayed and captured marbles occupy the corner holding zones").style.cssText="font-size:12px;color:#d6b96a;text-align:center";drawBoard(body);
const moves=E("div",body);moves.style.cssText="display:flex;gap:6px;flex-wrap:wrap";const face=E("div",moves,rolling?String(dieValue):game.roll===null?"⚀":String(game.roll));face.className="chaos-die";face.style.cssText="display:grid;place-items:center;width:50px;height:50px;border-radius:9px;background:#f4ebd6;color:#182330;border:2px solid #d6b96a;font-size:30px;font-weight:bold;"+(rolling?"animation:chaosSpin .16s ease-in-out infinite alternate;":"");const die=B(moves,rolling?"Rolling…":"Roll die",roll);die.disabled=!ready||game.winner!==null||game.turn!==session.player||game.roll!==null||busy||rolling;
if(ready&&game.turn===session.player&&game.roll!==null)for(const i of choices())B(moves,"Move marble "+(i+1),()=>move(i));
E("p",body,"Moves: "+game.moves+" | Rolls: "+game.rolls+" | Home: "+game.marbles.map((a,p)=>NAMES[p]+" "+a.filter(x=>x===35).length+"/3").join(" · ")).style.fontSize="12px";
E("p",body,"Rules: Roll 6 to enter. Exact roll required to finish. Capture opponents by landing on them. A 6 earns another roll.").style.fontSize="12px"}
function activate({mount,close}){if(panel)return;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#20252e;color:#fff;border:1px solid #888;border-radius:12px;padding:15px;width:min(390px,94vw);height:min(690px,85vh);min-width:260px;min-height:320px;max-width:96vw;max-height:92vh;overflow:auto;resize:both;box-sizing:border-box;font:14px system-ui";
const bar=E("div",panel);bar.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;touch-action:none;user-select:none;cursor:move";E("strong",bar,"Chaos Marbles");const min=B(bar,"−",close);min.title="Minimize to TU";min.style.cssText+=";font-size:22px;font-weight:bold;padding:0 12px;line-height:30px";
let drag=null;bar.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";bar.setPointerCapture(e.pointerId)});bar.addEventListener("pointermove",e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,drag.l+e.clientX-drag.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,drag.t+e.clientY-drag.y))+"px"});bar.addEventListener("pointerup",()=>drag=null);bar.addEventListener("pointercancel",()=>drag=null);
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:3px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:21px";let resize=null;grip.onpointerdown=e=>{e.preventDefault();const r=panel.getBoundingClientRect();resize={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";grip.setPointerCapture(e.pointerId)};grip.onpointermove=e=>{if(!resize)return;panel.style.width=Math.max(260,Math.min(innerWidth-resize.l-8,resize.w+e.clientX-resize.x))+"px";panel.style.height=Math.max(320,Math.min(innerHeight-resize.t-8,resize.h+e.clientY-resize.y))+"px"};grip.onpointerup=()=>resize=null;grip.onpointercancel=()=>resize=null;
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
  }
  run();
})();

/* END torn-utilities/modules/chaos-marbles.user.js */


/* BEGIN torn-utilities/modules/item-monitor.user.js */

// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){

(()=>{
  'use strict';const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'1.10.23';
if(host.__TU_ITEM_MONITOR__)return;window.__TU_ITEM_MONITOR__=true;
const ID='item-monitor',KEY='tu-item-monitor-v1',OLD='tuac-watches';
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
const state={items:load(KEY,[]),cfg:load('tuac-settings',{}),panel:null,context:null,picking:false,selected:null,observer:null,alarmTimers:[],audio:null,muted:false,catalog:null,catalogWindow:null};
const save=()=>localStorage.setItem(KEY,JSON.stringify(state.items.map(({category,name,key,minQty,maxPrice})=>({category,name,key,minQty,maxPrice}))));
const saveCfg=()=>localStorage.setItem('tuac-settings',JSON.stringify(state.cfg));
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
const category=()=>{const url=(location.pathname+location.search+location.hash).toLowerCase();if(/itemmarket|item-market|item_market|market.php|item.php/.test(url))return 'Item Market';const abroad=/travel|abroad|foreign|country|cayman|japan|mexico|canada|hawaii|switzerland|china|argentina|unitedkingdom|southafrica|uae/i.test(url)||document.querySelector('[class*=foreignStock],[class*=ForeignStock]');const stockTable=[...document.querySelectorAll('table, [role=table]')].some(t=>/\bStock\b/i.test(text(t).slice(0,300))&&/\bCost\b/i.test(text(t).slice(0,300))&&/\bBuy\b/i.test(text(t).slice(0,300)));if(abroad||stockTable)return 'Foreign';if(/shop|store|bazaar|city/.test(url))return 'Stores';return 'Other'};
const nameOf=row=>{const e=row.querySelector('[data-itemname],[data-item-name],[class*=itemName],[class*=ItemName],[class*=name],[class*=Name]');return (e?.getAttribute('data-itemname')||e?.getAttribute('data-item-name')||text(e)||text(row)).split('\n').map(x=>x.trim()).find(Boolean)?.slice(0,90)||''};
const idOf=row=>row.getAttribute('data-item-id')||row.querySelector('[data-item-id]')?.getAttribute('data-item-id')||'';
const keyOf=row=>idOf(row)?'id:'+idOf(row):'name:'+norm(nameOf(row));
const foreignRow=w=>[...document.querySelectorAll('tr,[role=row]')].filter(r=>!r.closest('#tuim-panel,#tuim-catalog,#tu-pda-panel')&&r.getClientRects().length&&[...r.querySelectorAll('td,[role=cell]')].some(c=>norm(text(c)).includes(norm(w.name)))).sort((a,b)=>text(a).length-text(b).length)[0]||null;
const foreignStock=row=>{const cells=[...row.querySelectorAll(':scope > td,:scope > [role=cell]')];if(cells.length>=4){const raw=text(cells[cells.length-3]).trim();if(/^\\d[\\d,]*$/.test(raw))return Number(raw.replaceAll(',',''))}return quantity(row)};
const quantity=row=>{for(const e of row.querySelectorAll('[data-stock],[data-quantity],[class*=stock],[class*=Stock],[class*=quantity],[class*=available]')){const raw=e.getAttribute('data-stock')||e.getAttribute('data-quantity')||text(e);const m=raw.match(/(?:stock|quantity|available|remaining|in stock)?\s*:?\s*([\d,]+)/i);if(m)return Number(m[1].replaceAll(',',''))}const m=text(row).match(/(?:stock|quantity|available|remaining)\s*:?\s*([\d,]+)/i);return m?Number(m[1].replaceAll(',','')):NaN};
const price=row=>{for(const e of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const raw=e.getAttribute('data-price')||text(e);const m=raw.match(/\$\s*([\d,]+(?:\.\d+)?)/)||raw.match(/^\s*([\d,]+(?:\.\d+)?)\s*$/);if(m)return Number(m[1].replaceAll(',',''))}const m=text(row).match(/\$\s*([\d,]+(?:\.\d+)?)/);return m?Number(m[1].replaceAll(',','')):NaN};
const E=(tag,parent,t)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;parent?.append(e);return e};
const B=(p,t,f)=>{const b=E('button',p,t);b.type='button';b.onclick=f;return b};
function style(){if(document.getElementById('tuim-style'))return;const e=E('style',document.head||document.documentElement);e.id='tuim-style';e.textContent='#tuim-panel{position:fixed;z-index:2147483642;top:10vh;left:4vw;width:min(92vw,440px);min-width:220px;min-height:160px;max-width:calc(100vw - 12px);height:min(62dvh,540px);max-height:calc(100dvh - 160px)!important;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;resize:both;box-sizing:border-box;overflow-wrap:anywhere;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;font:14px/1.45 system-ui;display:block}#tuim-panel[hidden]{display:none!important}#tuim-panel *{box-sizing:border-box}#tuim-panel button{max-width:100%;white-space:normal;margin:0;padding:8px 12px;background:#d6b65c;color:#111;border:0;border-radius:5px;line-height:1.3;min-height:36px}#tuim-panel input[type=range]{touch-action:none!important;accent-color:#d6b65c;user-select:none}#tuim-panel input,#tuim-panel select{display:block;width:100%;box-sizing:border-box;padding:8px;margin:4px 0 12px;background:#283239;color:white;min-height:40px}#tuim-panel label{display:block;margin:12px 0 4px;line-height:1.4}#tuim-panel .tuim-header{display:flex;align-items:center;gap:8px;position:sticky;top:0;background:#11191d;z-index:10;padding:12px;margin:0 0 12px;touch-action:none;cursor:move;min-height:76px;border-bottom:1px solid #806a3e;isolation:isolate}#tuim-panel .tuim-header strong{flex:1;min-width:0;font-size:18px;line-height:1.3;overflow-wrap:anywhere}#tuim-panel .tuim-header [data-tu-brand-emblem]{align-self:center;flex:0 0 44px!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important}#tuim-panel .tuim-header button{flex:0 0 38px;padding:7px}#tuim-panel p{display:block;margin:12px 0!important;line-height:1.5!important;min-height:0!important}#tuim-panel h3{display:block;font-size:19px;line-height:1.35!important;margin:22px 0 12px!important;padding:0!important;clear:both}#tuim-panel .tuim-entry{display:block;border:1px solid #3ba35b;border-radius:6px;padding:12px;margin:10px 0 16px;line-height:1.5}#tuim-panel .tuim-entry strong,#tuim-panel .tuim-entry small{display:block;margin:4px 0;line-height:1.5}#tuim-panel .tuim-entry button{display:block;margin-top:10px}#tuim-panel div,#tuim-panel p,#tuim-panel small{overflow-wrap:anywhere}#tuim-panel>button{display:block;margin:12px 0}#tuim-panel #tuim-status{margin:16px 0 20px!important}.tuim-watch,.tuim-wait{outline:3px solid #d83030!important;outline-offset:-2px!important}.tuim-trigger{outline:4px solid #00ff69!important;outline-offset:-2px!important}'}
function travelStyle(){if(document.getElementById('tuim-travel-style'))return;const x=E('style',document.head||document.documentElement);x.id='tuim-travel-style';x.textContent="#tuim-data-window{position:fixed;z-index:2147483646;top:13vh;left:8vw;width:min(85vw,440px);height:min(65dvh,540px);min-width:250px;min-height:180px;max-width:100vw;max-height:96dvh;resize:both;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;font:14px/1.45 system-ui}#tuim-data-window *{box-sizing:border-box}#tuim-data-window .tuim-travel-header{display:flex;align-items:center;gap:8px;position:sticky;top:-12px;background:#11191d;padding:8px 0 12px;z-index:3;touch-action:none;cursor:move}#tuim-data-window .tuim-travel-header strong{flex:1;font-size:17px}#tuim-data-window button{background:#d6b65c;color:#111;border:0;border-radius:6px;min-height:32px;padding:5px 10px}#tuim-data-window .tuim-travel-card{border:1px solid #39434a;border-radius:9px;background:#1b252b;padding:11px}#tuim-data-window .tuim-travel-line{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #344047}#tuim-data-window .tuim-travel-line span{color:#c3c9cd;flex:1}#tuim-data-window .tuim-travel-line strong{text-align:right;flex:1}#tuim-data-window small{display:block;color:#b3bbc0;font-size:12px;margin-top:10px}"+"#tuim-travel-window{position:fixed;z-index:2147483645;top:8vh;left:5vw;width:min(92vw,520px);height:min(82dvh,750px);min-width:280px;min-height:260px;max-width:100vw;max-height:96dvh;resize:both;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;font:14px/1.45 system-ui}#tuim-travel-window *{box-sizing:border-box}#tuim-travel-window .tuim-travel-header{display:flex;align-items:center;justify-content:space-between;position:sticky;top:-12px;background:#11191d;padding:8px 0 12px;z-index:3;touch-action:none;cursor:move}#tuim-travel-window .tuim-travel-header strong{font-size:19px}#tuim-travel-window button{padding:9px 12px;background:#d6b65c;color:#111;border:0;border-radius:6px;min-height:36px}#tuim-travel-window .tuim-travel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#tuim-travel-window label{display:block;font-size:12px;color:#c7cbd0}#tuim-travel-window input:not([type=checkbox]),#tuim-travel-window select{display:block;width:100%;padding:9px;margin-top:5px;background:#283239;color:white;border:1px solid #57616a;border-radius:5px;min-height:40px}#tuim-travel-window input[type=checkbox]{margin:10px}#tuim-travel-window .tuim-travel-card{border:1px solid #39434a;border-radius:9px;background:#1b252b;padding:11px;min-width:0;overflow-wrap:anywhere}#tuim-travel-window .tuim-travel-muted,#tuim-travel-window small{display:block;color:#b3bbc0;font-size:12px}#tuim-travel-window .tuim-travel-card>strong{display:block;font-size:16px;margin-top:4px}#tuim-travel-window h3{font-size:16px;margin:16px 0 9px;color:#d6b65c}#tuim-travel-window .tuim-travel-line{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #344047}#tuim-travel-window .tuim-travel-line span{color:#c3c9cd;flex:1}#tuim-travel-window .tuim-travel-line strong{text-align:right;flex:1}#tuim-travel-window .tuim-travel-total{margin-top:10px;border-color:#7e9e67}#tuim-travel-window .tuim-travel-total>strong{font-size:24px;color:#8fd69c}#tuim-travel-window .tuim-travel-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#tuim-travel-window .tuim-travel-output>small{margin:10px 0}@media(max-width:380px){#tuim-travel-window .tuim-travel-grid{grid-template-columns:1fr}}"}
function sound(){for(const t of state.alarmTimers)clearTimeout(t);state.alarmTimers=[];const duration=Math.max(.5,Math.min(30,Number(state.cfg.alarmDuration)||3)),vol=Math.max(0,Math.min(100,Number(state.cfg.alarmVolume??60)))/100;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=state.audio||(state.audio=new C());a.resume?.();for(let ms=0;ms<duration*1000;ms+=280)state.alarmTimers.push(setTimeout(()=>{const o=a.createOscillator(),g=a.createGain(),now=a.currentTime;o.type=state.cfg.alarmSound==='siren'?'sawtooth':state.cfg.alarmSound==='chime'?'sine':'square';o.frequency.value=state.cfg.alarmSound==='chime'?1046:850;g.gain.setValueAtTime(vol*.13,now);g.gain.exponentialRampToValueAtTime(.0001,now+.18);o.connect(g);g.connect(a.destination);o.start();o.stop(now+.2)},ms))}catch(e){console.warn('[Item Monitor] Audio unavailable',e)}}
function alertItem(w,reason){if(!state.panel){sound();return}state.panel.hidden=false;render();const p=state.panel.querySelector('#tuim-status');if(p)p.textContent='ALERT: '+w.name+' — '+reason;sound()}
function scan(){
  style();
  const cat=category(),rows=[...document.querySelectorAll(candidates)].filter(e=>!e.closest('#tuim-panel,#tu-pda-panel'));
  for(const w of state.items){
    const previous=w.row;
    if(w.category!==cat){previous?.classList.remove('tuim-watch','tuim-trigger','tuim-wait');w.row=null;w.status='Waiting for '+w.category;w.fired=false;continue}
    if(cat==='Item Market'){
      previous?.classList.remove('tuim-watch','tuim-trigger','tuim-wait');w.row=null;
      const active=pageItem();
      const matching=active&&(w.key===active.key||norm(w.name)===norm(active.name));
      if(!matching){w.status='Waiting for '+w.name;w.fired=false;continue}
      const found=listings(),qualifying=[];
      for(const row of found){
        const p=listingPrice(row);
        const match=w.maxPrice!=null&&Number.isFinite(p)&&p<=w.maxPrice;
        row.classList.toggle('tuim-trigger',match);row.classList.toggle('tuim-wait',!match&&w.maxPrice!=null);
        if(match)qualifying.push({row,p});
      }
      w.status=qualifying.length?qualifying.length+' qualifying listing(s), lowest $'+Math.min(...qualifying.map(x=>x.p)).toLocaleString():found.length+' listing(s), none at target';
      if(qualifying.length&&!w.fired){w.fired=true;alertItem(w,w.status)}
      if(!qualifying.length)w.fired=false;
      continue;
    }
    if(!w.row?.isConnected)w.row=null;
    if(!w.row)w.row=(cat==='Foreign'?foreignRow(w):null)||rows.filter(r=>keyOf(r)===w.key||norm(nameOf(r))===norm(w.name)||(norm(text(r)).includes(norm(w.name))&&norm(w.name).length>3)).sort((a,b)=>text(a).length-text(b).length)[0]||null;
    if(previous&&previous!==w.row)previous.classList.remove('tuim-watch','tuim-trigger','tuim-wait');
    if(!w.row){w.status='Not visible';w.fired=false;continue}
    const q=cat==='Foreign'?foreignStock(w.row):quantity(w.row),p=price(w.row);
    const hits=[];
    if(w.minQty!=null&&Number.isFinite(q)&&q>=w.minQty)hits.push('quantity '+q+' ≥ '+w.minQty);
    if(cat!=='Foreign'&&w.maxPrice!=null&&Number.isFinite(p)&&p<=w.maxPrice)hits.push('price $'+p.toLocaleString()+' ≤ $'+w.maxPrice.toLocaleString());
    w.status='Qty: '+(Number.isFinite(q)?q:'?')+' | Price: '+(Number.isFinite(p)?'$'+p.toLocaleString():'?');
    w.row.classList.toggle('tuim-trigger',hits.length>0);
    w.row.classList.toggle('tuim-wait',hits.length===0);
    w.row.classList.remove('tuim-watch');
    if(hits.length&&!w.fired){w.fired=true;alertItem(w,hits.join('; '))}
    if(!hits.length)w.fired=false;
  }
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
 tip.style.cssText='position:fixed;z-index:2147483646;top:10%;right:12px;max-width:260px;padding:12px;background:#3a2c16;color:white;border:2px solid #d6b65c;border-radius:9px;font:14px system-ui;box-shadow:0 3px 12px #000';
 const instructions=E('div',tip,category()==='Item Market'?'Open an individual item listing, then select the item.':'Tap an item to monitor.');
 instructions.style.marginBottom='8px';
 if(category()==='Item Market'){
   instructions.textContent='Click the item tile (image/name/price) you want to monitor, or use the button below.';
   document.addEventListener('click',intercept,{capture:true,passive:false});
   const choose=E('button',tip,'Select displayed market item');
   choose.type='button';
   choose.style.cssText='display:block;margin:6px 0;padding:8px;background:#d6b65c;color:#111;border:0;border-radius:5px;cursor:pointer';
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
 cancel.style.cssText='display:block;margin-top:8px;padding:8px 12px;background:#444;color:white;border:1px solid #aaa;border-radius:5px;cursor:pointer';
 cancel.onclick=cancelPick;
}

const catalogCacheKey='tuim-catalog-v2';
async function getCatalog(){
 if(state.catalog)return state.catalog;
 const cached=load(catalogCacheKey,null);
 if(cached?.items?.length&&Date.now()-cached.time<86400000){state.catalog=cached.items;return state.catalog}
 const pdaKey='###PDA-APIKEY###';
 const apiKey=!pdaKey.includes('PDA-APIKEY')?pdaKey:(host.TornUtilities?.apiKey||host.TornUtilities?.getApiKey?.()||'');
 if(!apiKey)throw Error('PDA API key unavailable. Configure your key in Torn PDA, then reload the script.');
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
   if(typeof PDA_httpGet==='function')payload=unpack(await PDA_httpGet(url));
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
function openCatalog(){
 style();
 state.catalogWindow?.remove();
 const w=E('section',document.body);state.catalogWindow=w;w.id='tuim-catalog';
 w.style.cssText='position:fixed;z-index:2147483645;left:5vw;top:8vh;width:min(90vw,530px);height:min(80dvh,680px);background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;display:flex;flex-direction:column;font:14px system-ui;box-sizing:border-box;box-shadow:0 10px 30px #000b';
 const head=E('div',w);head.style.cssText='display:flex;align-items:center;gap:8px;cursor:move;touch-action:none;padding:5px 0 12px';
 E('strong',head,'Select Item from Complete List').style.flex='1';
 const exit=B(head,'×',()=>{w.remove();state.catalogWindow=null});exit.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c';
 draggable(w,head);tuModuleOpen('tuim-catalog');
 const locationRow=E('div',w);locationRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px';E('span',locationRow,'Filter location:');const locationFilter=E('select',locationRow);locationFilter.style.cssText='flex:1;min-width:0;background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:8px';locationFilter.onchange=()=>{if(state.catalog)filter()};
 const populateLocations=()=>{
   const previous=locationFilter.value;locationFilter.replaceChildren();
   const all=E('option',locationFilter,'All locations');all.value='';
   const locations=[...new Set(state.catalog.flatMap(catalogGroups))].sort((a,b)=>a.localeCompare(b));for(const shared of ['Torn / Item Market / Bazaar'])if(!locations.includes(shared))locations.unshift(shared);
   for(const loc of locations){const o=E('option',locationFilter,loc);o.value=loc}
   locationFilter.value=locations.includes(previous)?previous:'';
 };
 const search=E('input',w);search.placeholder='Keyword or item ID';search.style.cssText='width:100%;padding:10px;background:#283239;color:white;border:1px solid #667;margin-bottom:8px;box-sizing:border-box';
 const controls=E('div',w);controls.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:8px';
 const count=E('span',controls,'Loading catalog…');count.style.flex='1';
 const next=B(controls,'Next',()=>jump());next.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:9px 14px;border-radius:5px';next.disabled=true;
 const list=E('div',w);list.style.cssText='flex:1;overflow:auto;overscroll-behavior:contain';
 let matches=[],position=-1;
 const draw=items=>{
   list.replaceChildren();const grouped=new Map();
   for(const item of items)for(const loc of (locationFilter.value?[locationFilter.value]:catalogGroups(item))){if(!grouped.has(loc))grouped.set(loc,[]);grouped.get(loc).push(item)}
   for(const [loc,group] of [...grouped].sort((a,b)=>a[0].localeCompare(b[0]))){
     const heading=E('h3',list,loc);heading.style.cssText='font-size:15px;margin:14px 0 6px;color:#d6b65c';
     for(const item of group){const line=E('div',list);line.dataset.itemId=item.id;line.style.cssText='padding:8px;border-bottom:1px solid #39434a;display:flex;align-items:center;gap:8px';
       const label=E('span',line,item.name+' (#'+item.id+')');label.style.flex='1';
       const select=B(line,'Select',()=>{state.selected={category:loc.includes(' / Foreign / ')?'Foreign':'Item Market',name:item.name,key:'id:'+item.id};w.remove();state.catalogWindow=null;state.panel.hidden=false;render()});select.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:8px 12px;border-radius:5px';
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
setInterval(()=>{const t=travel.departure;if(!travel.armed||!t||travelAlerted===t)return;if(t-Date.now()/1000<=30&&t-Date.now()/1000>=-5){travelAlerted=t;travel.armed=false;travelSave();sound();alert('Travel Assistant: departure in 30 seconds')}},1000);
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
  const rows=[...wrapper.querySelectorAll('li [class*="row"],li[class*="row"]')].filter(x=>x.getClientRects().length&&x.querySelector('[class*="tabletColB"]')&&x.querySelector('[class*="tabletColC"]'));
  if(rows.length)found.push({headers:columns,rows,kind:'torn-abroad'});
 }
 // Retain standard HTML table support for alternate layouts.
 for(const table of document.querySelectorAll('table,[role="table"]')){
  if(!table.getClientRects().length||table.closest('#tuim-panel,#tuim-travel-window'))continue;
  const header=table.querySelector('tr,[role="row"]');if(!header)continue;
  const columns=[...header.children].map(x=>norm(text(x)));
  if(!['name','stock','cost'].every(x=>columns.includes(x)))continue;
  const rows=[...table.querySelectorAll('tr,[role="row"]')].filter(x=>x!==header&&x.getClientRects().length);
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
  if(!mark){mark=document.createElement('span');mark.setAttribute('data-tu-stock-reported','');mark.style.cssText='color:#e69a22;font-weight:bold;margin-left:6px';mark.title='DOM observation awaiting server acknowledgment';row.node.append(mark)}
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
const stockEndpoint='https://tu-multiplayer-server.tuserver.workers.dev/api/foreign/observations';
async function deliverStockBatch(batch){
 const body=JSON.stringify(batch);
 const parse=(raw,transport)=>{
  let data=raw;
  if(data&&typeof data==='object'&&('responseText' in data||'data' in data||'body' in data||'response' in data))data=data.responseText??data.data??data.body??data.response;
  if(typeof data==='string'){try{data=JSON.parse(data)}catch{throw Error(transport+': invalid JSON response')}}
  if(!data?.ok||!Array.isArray(data.accepted)||data.accepted.length!==batch.items.length)throw Error(transport+': upload not fully accepted'+(data?.error?' ('+data.error+')':''));
  return data;
 };
 const failures=[];
 if(typeof PDA_httpPost==='function'){
  try{return parse(await PDA_httpPost(stockEndpoint,body,{'Content-Type':'application/json'}),'PDA_httpPost')}
  catch(e){failures.push('PDA_httpPost: '+e.message)}
 }
 const gm=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest:null;
 if(gm){
  try{
   const response=await new Promise((resolve,reject)=>gm({method:'POST',url:stockEndpoint,headers:{'Content-Type':'application/json'},data:body,timeout:12000,onload:resolve,onerror:()=>reject(Error('network error')),ontimeout:()=>reject(Error('timeout'))}));
   if(response.status<200||response.status>=300)throw Error('HTTP '+response.status+' '+String(response.responseText||'').slice(0,150));
   return parse(response,'GM_xmlhttpRequest');
  }catch(e){failures.push('GM_xmlhttpRequest: '+e.message)}
 }
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(stockEndpoint,{method:'POST',headers:{'content-type':'application/json'},body,signal:controller.signal});
  if(!response.ok)throw Error('HTTP '+response.status+' '+(await response.text()).slice(0,150));
  return parse(await response.json(),'fetch');
 }catch(e){failures.push('fetch: '+e.message);throw Error(failures.join(' | '))}
 finally{clearTimeout(timer)}
}
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
setInterval(()=>{if(load(stockQueueKey,[]).length)retryStockQueue()},15000);
window.addEventListener('online',retryStockQueue);
window.addEventListener('pageshow',retryStockQueue);
let lastVisibleInventory=null,lastVisibleUploadAt=0;
function visibleInventorySignature(snap){
 return snap.country+'|'+snap.rows.map(r=>r.item_id+':'+r.quantity+':'+(r.unit_price??'')).sort().join('|');
}
async function reportForeignShop(){
 if(!stockReportingEnabled()||stockReportingBusy||document.hidden)return;
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
setInterval(reportForeignShop,1000);
let travelWindow=null,travelEpoch=0,travelDataWindow=null,travelDataModel=null;
function travelClose(){travelEpoch++;travelWindow?.remove();travelWindow=null;travelDataWindow?.remove();travelDataWindow=null;travelDataModel=null}
function travelDataRender(){if(!travelDataWindow?.isConnected)return;const area=travelDataWindow.querySelector('.tuim-data-body');if(!area)return;area.replaceChildren();const model=travelDataModel;if(!model){E('small',area,'Waiting for travel data...');return}const card=E('div',area);card.className='tuim-travel-card';const lineData=(label,value)=>{const row=E('div',card);row.className='tuim-travel-line';E('span',row,label);E('strong',row,String(value))};lineData('Server detected restock events',model.pred?.observed_events??'Unavailable');if(model.metrics){const m=model.metrics;lineData('History observations sampled',m.points+' (latest 200 requested)');lineData('Real Time Reporting',model.realTimeReportingTotal!=null?model.realTimeReportingTotal:m.sources.dom);lineData('API/YATA observations (identified)',m.sources.api);lineData('Unknown-source observations',m.sources.other);lineData('Stock increases in sampled history',m.increases);lineData('Depletion intervals used',m.intervals);if(m.points>0)E('small',area,'Real Time Reporting counts all stored app-submitted observations for this item in D1. Other source counts reflect only the latest sampled history. Restock events and forecasts may use additional history.')}else E('small',area,'History metrics unavailable')}
// Enforce hidden state regardless of module CSS display rules.
(function(){const id='tuim-window-visibility';if(document.getElementById(id))return;const st=E('style',document.head||document.documentElement);st.id=id;st.textContent='#tuim-panel[hidden],#tuim-travel-window[hidden],#tuim-data-window[hidden],#tuim-catalog[hidden]{display:none!important}';})();
function tuModuleOpen(id){const el=document.getElementById(id);if(!el)return;const nav=window.TUWindowNavigation;if(nav?.open?.(id))return;for(const other of ['tuim-panel','tuim-travel-window','tuim-data-window','tuim-catalog']){const w=document.getElementById(other);if(w&&other!==id)w.hidden=true;}el.hidden=false;}
function tuModuleHeader(w,head,parentId){
 w.dataset.tuModuleNav='1';
 const controls=E('span',head);controls.dataset.tuNavControls='1';controls.style.cssText='margin-left:auto;display:flex;gap:6px;flex-shrink:0';
 const button=(symbol,title,action)=>{const b=B(controls,symbol,(event)=>{event?.stopPropagation();event?.preventDefault();action();});b.title=title;b.setAttribute('aria-label',title);b.style.cssText='background:#252a2e;color:#f1ce72;border:1px solid #806a3e;border-radius:5px;padding:6px 10px;min-width:35px';};
 button('←','Back',()=>{const nav=window.TUWindowNavigation;const result=nav?.back?.(w.id);w.hidden=true;const p=document.getElementById(parentId);if(p){if(result!==true||p.hidden){nav?.open?.(parentId);p.hidden=false;}}});
 button('−','Minimize',()=>{window.TUWindowNavigation?.minimize?.(w.id);w.hidden=true;});
 button('×','Exit',()=>{w.hidden=true;if(window.TUWindowNavigation?.exit)window.TUWindowNavigation.exit(w.id);else state.context?.close?.();});
}
function travelDataOpen(){if(travelDataWindow?.isConnected){tuModuleOpen('tuim-data-window');return}const w=E('section',document.body);w.id='tuim-data-window';travelDataWindow=w;const head=E('div',w);head.className='tuim-travel-header';draggable(w,head);E('strong',head,'Data Used');tuModuleHeader(w,head,'tuim-travel-window');const area=E('div',w);area.className='tuim-data-body';travelDataRender();tuModuleOpen('tuim-data-window')}
function travelUI(){
 travelStyle();
 if(travelWindow?.isConnected){tuModuleOpen('tuim-travel-window');return}
 const w=E('section',document.body);travelWindow=w;w.id='tuim-travel-window';
 const head=E('div',w);head.className='tuim-travel-header';draggable(w,head);
 E('strong',head,'Travel Assistant v'+TU_MODULE_VERSION);tuModuleHeader(w,head,'tuim-panel');
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
   const overlay=E('div',document.body);overlay.style.cssText='position:fixed;inset:0;background:#000c;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:12px';
   const page=E('section',overlay);page.style.cssText='width:min(96vw,620px);max-height:90dvh;overflow:auto;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:14px;box-sizing:border-box';
   const header=E('div',page);header.style.cssText='display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#11191d;padding:6px 0';
   E('strong',header,'Travel Assistant and Item Monitor — Diagnostics');B(header,'×',()=>overlay.remove());
   const output=E('textarea',page);output.readOnly=true;output.style.cssText='width:100%;height:55dvh;box-sizing:border-box;white-space:pre;font:12px monospace;background:#233039;color:#fff;border:1px solid #d6b65c';
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
  const dataActions=E('div',output);dataActions.style.cssText='display:flex;justify-content:flex-end;margin-top:14px';const dataButton=B(dataActions,'Data Used',travelDataOpen);dataButton.style.cssText='font-size:11px;padding:4px 9px;min-height:26px';
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
  const base='https://tu-multiplayer-server.tuserver.workers.dev/api/foreign/',query='?country='+travel.country+'&item_id='+id;
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

function render(){const p=state.panel;if(!p)return;p.scrollTop=0;p.replaceChildren();const h=E('div',p);h.className='tuim-header';draggable(p,h);E('strong',h,'Travel Assistant and Item Monitor');B(h,'−',()=>{p.hidden=true;state.catalogWindow?.remove();state.catalogWindow=null;state.context?.minimize?.()});B(h,'×',()=>{p.hidden=true;state.catalogWindow?.remove();state.catalogWindow=null;state.context?.close?.()});const travelSection=E('div',p);travelSection.className='tuim-section-travel';E('h3',travelSection,'Travel Assistant');E('p',travelSection,'Travel planning, foreign inventory reporting, and restock predictions');B(travelSection,'Open Travel Assistant',travelUI);const divider=E('hr',p);divider.style.cssText='border:0;border-top:2px solid #cba953;margin:16px 0';E('h3',p,'Item Monitor');B(p,category()==='Item Market'?'Select Current Market Item':'Select item on Torn',pick);B(p,'Select Item from Complete List',openCatalog);E('p',p,'Current selection: '+(state.selected?state.selected.category+' / '+state.selected.name:'None'));const label=(t)=>E('label',p,t);label('Minimum available quantity (Foreign / Stores)');const q=E('input',p);q.type='number';q.min='1';q.placeholder='No quantity alert';label('Alert at or below unit price ($, Item Market / Stores)');const pr=E('input',p);pr.type='number';pr.min='0';pr.step='0.01';pr.placeholder='No price alert';if(state.selected){const prev=state.items.find(w=>w.category===state.selected.category&&(w.key===state.selected.key||norm(w.name)===norm(state.selected.name)));if(prev){q.value=prev.minQty??'';pr.value=prev.maxPrice??''}}B(p,'Add / update monitor',()=>{if(!state.selected)return alert('Select an item first.');const s=state.selected;const minQty=q.value.trim()===''?null:Number(q.value),maxPrice=pr.value.trim()===''?null:Number(pr.value);if(s.category==='Foreign'&&minQty===null)return alert('Enter a minimum quantity for foreign items.');if(s.category==='Item Market'&&maxPrice===null)return alert('Enter a target price for Item Market.');if(minQty===null&&maxPrice===null)return alert('Enter a quantity or target price.');if(minQty!==null&&(!Number.isFinite(minQty)||minQty<1)||maxPrice!==null&&(!Number.isFinite(maxPrice)||maxPrice<0))return alert('Invalid target.');state.items=state.items.filter(w=>!(w.category===s.category&&(w.key===s.key||norm(w.name)===norm(s.name))));clearHighlights();state.items.push({...s,minQty:s.category==='Item Market'?null:minQty,maxPrice:s.category==='Foreign'?null:maxPrice,fired:false,status:'Waiting'});save();scan();render()});const st=E('p',p,state.items.length+' monitored item(s)');st.id='tuim-status';for(const cat of ['Foreign','Stores','Item Market','Other']){const watches=state.items.filter(w=>w.category===cat);if(!watches.length)continue;E('h3',p,cat+' ('+watches.length+')');for(const w of watches){const line=E('div',p);line.className='tuim-entry';const heading=E('strong',line,w.name+' ✎');heading.style.cssText='cursor:pointer;color:#d6b65c;padding:5px 0';heading.setAttribute('role','button');heading.tabIndex=0;const edit=()=>{state.selected={category:w.category,name:w.name,key:w.key};render();state.panel.scrollTo({top:0,behavior:'smooth'});state.panel.querySelectorAll('input[type=number]')[w.category==='Item Market'?1:0]?.focus()};heading.onclick=edit;heading.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit()}};E('div',line,'Qty ≥ '+(w.minQty??'off')+' | Price ≤ '+(w.maxPrice==null?'off':'$'+w.maxPrice.toLocaleString()));E('small',line,w.status||'Waiting');B(line,'Edit',edit);B(line,'Remove',()=>{state.items=state.items.filter(x=>x!==w);clearHighlights();save();scan();render()})}}B(p,'Clear all monitors',()=>{if(!confirm('Remove all monitored items?'))return;state.items=[];clearHighlights();save();render()});E('h3',p,'Alarm settings');label('Volume (%)');const vol=E('input',p);vol.type='range';vol.min=0;vol.max=100;vol.value=state.cfg.alarmVolume??60;vol.style.touchAction='none';const setVolume=x=>{const rect=vol.getBoundingClientRect();if(!rect.width)return;vol.value=String(Math.round(Math.max(0,Math.min(100,(x-rect.left)/rect.width*100))));state.cfg.alarmVolume=vol.value;saveCfg()};let volumePointer=null;vol.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();e.stopImmediatePropagation();volumePointer=e.pointerId;vol.setPointerCapture?.(e.pointerId);setVolume(e.clientX)},{capture:true,passive:false});vol.addEventListener('pointermove',e=>{if(volumePointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();setVolume(e.clientX)},{capture:true,passive:false});for(const ev of ['pointerup','pointercancel','lostpointercapture'])vol.addEventListener(ev,e=>{if(volumePointer===e.pointerId)volumePointer=null;e.stopPropagation()},{capture:true});vol.addEventListener('touchmove',e=>{if(volumePointer!==null)e.preventDefault();e.stopPropagation()},{passive:false});vol.oninput=()=>{state.cfg.alarmVolume=vol.value;saveCfg()};label('Sound');const snd=E('select',p);for(const v of ['beep','siren','chime']){const o=E('option',snd,v);o.value=v}snd.value=state.cfg.alarmSound||'beep';snd.onchange=()=>{state.cfg.alarmSound=snd.value;saveCfg()};label('Duration (seconds)');const dur=E('input',p);dur.type='number';dur.min=.5;dur.max=30;dur.value=state.cfg.alarmDuration??3;dur.oninput=()=>{state.cfg.alarmDuration=dur.value;saveCfg()};B(p,'Test alarm',sound);E('p',p,'Monitors persist across navigation and refresh. Alerts only evaluate visible listings while Torn is running.')}
function migrate(){if(localStorage.getItem('tuim-migrated'))return;const old=load(OLD,[]);for(const w of old){if(!w.name)continue;const key=w.key?.startsWith('id:')?w.key:'name:'+norm(w.name);if(!state.items.some(x=>x.key===key&&x.category==='Foreign'))state.items.push({category:'Foreign',name:w.name,key,minQty:Number(w.min)||null,maxPrice:null,status:'Migrated',fired:false})}save();localStorage.setItem('tuim-migrated','1')}
function activate(ctx){state.context=ctx;style();if(!state.panel){state.panel=E('section',document.body);state.panel.id='tuim-panel'}state.panel.hidden=false;state.panel.style.height=state.panel.style.height||'min(62dvh,540px)';render();tuModuleOpen('tuim-panel');scan()}
function deactivate(){travelClose();state.catalogWindow?.remove();state.catalogWindow=null;stopPick();if(state.panel)state.panel.hidden=true;state.context=null}
migrate();style();let pending=false;const obs=new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;scan()},400)});obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});window.addEventListener('pageshow',scan);window.addEventListener('popstate',()=>setTimeout(scan,300));setInterval(()=>{if(state.items.length)scan()},2000);scan();
const definition={id:ID,version:TU_MODULE_VERSION,activate,deactivate};const register=()=>host.TornUtilities?.register?.(definition);host.addEventListener('torn-utilities-ready',register);register();
})();
  }
  run();
})();

/* END torn-utilities/modules/item-monitor.user.js */


/* BEGIN torn-utilities/modules/war-hit-organizer.user.js */

(()=>{
'use strict';
const ID='war-hit-organizer',STORE='tu:who:state:v2',LOGO="data:image/webp;base64,UklGRq4GAABXRUJQVlA4IKIGAAAwHACdASpgAGAAPpU8mUiloyIhKrK/ULASiWoAwne0lPSi7G2qg0ltv0P7ZnzI+bV/nvXZ/k9999CL9iut1rz0mO9Cfr9HUXaZwyuOal/4fNz9S+jf/xuBdeDYib+r4+o01uo4Fe5wCllruiV7HogTd8NYJp2HZhuyzPaLHGNUhONqVaXDfidHh3gDU03sGVoDbxBsLMYbgIZJscfjJN6/Cuwf+lpc7yBok1/B6IPkz/4IK3gm9J/27Bccd/Vu0I67CDDXdjwv9yZ88/+SGxC7SPq/0wMczZp3ahPn7a7zzD+ry0hpqnkRIQAA/v1uSKGx+Jn/no2//fWx79LRnMZ/hFKeb/W89WQyYr1/en+ak1594g2/jvqMWzCEyv/g/h6d0hPkmQ5ezERi2EA5XlSIJEt/X31Xmlzx0Bs1UL/xHnRu7CQD+YunEj8cMN1EoP7+wWAxWomBcZDIaoOX2RArXlfkkf34+KvKJn0aaZljJ+xP4MRw7FMMOZDQoKvNAiAdMwSIqUMICrYuhvf6n6gQ6agK6qoHEIHu4W/DExeNKG+sOsoZIiyI3xmq3c0evDzfkUtuqtPF0ZYGz+k/s4DgrlSXCIIWuKJueob1EvRo+0clCx/rH/izpBsTPbwgtRJGpEcO7psIJoZgFSSLeZxwIYrrdepjc0OeudEZGGgwX7GZvVVkfrOW24nwFalbAtXrCKOKKh4LLluHH+m6hquhlu3ywQk86ilNUEFf/DWDTTmG4/j7RyO9zwjgSZRj62RomMbtIe4AGW1C1G8FMZFT5Hl2bW1i3jbCCaK3X+1X21/SJ/07ieGvkW1MDKy0D3PeKbGqpCnxHc9n5EaWCkCaUlwkid1P4iHg4kuqY6b2rqBuX14FD1z/qtySU0h9GTQEuzjj/X+MS9KGP9Vcxzhf+EaAJIKGb2mfOBrO2D9/snC+VDkBJNfYc8K+vJnJZk9znFBuZcI5U38KUd+Iod6xRVfxkf81tyQ4yehnh279c9aaJdnYvTffqZbsqixbg2SQuXuP9DjNBK8kgq5e6habhY5/uS6x/8fgprWCvXWXFist42MlorVQZLZuO0IKd9KOj/Ho+5xKEUuq3hHZ+NQvDCxVimngFBYjk/8FGNicRnDgr2sW05dP9Y6o7QQbpKy/xPd6dJs9O7qkkSrZccMiSt2mu9IpMeYxLdADxxG7RBbyFuCidzxQPrtT3glWJyaI0L+TUtZIn7HNv+0ACpDWhePHk/gDWrT72x3y6iktn8I41w93aMn0DP1JGunzNAD9INpTFzvMK5LEwIlw8iICzGjRT4qU/ABRUwlrSvgd0bH/IEKT9MY9f5+gLcEsoEcFLjSxP/+RZxcf06hEmrQCNa1cJ6sdfF6DEyv125hCHvZGuWgpVYqbGjH+mZyajeQnXsTdTx0H+FzbhJlSrt15U3N86k4GjIY8D5dF/MjuEGxlasg1WNKICMsSlm2bAsc2gRz27RJYSnn16kXFoA+1EcVjnlSE1pU+L7xHuqQ690c20jYTjDISPD9eKAh+9/7U8cvQf+Pfi4FmpvP5jt1uuvS3GqZvRF9rts5105OtTd82JylWZVuNt75RozzZng3gSAdCpQKW/Y2jFcgT5+Nz5zoC73+9pXmIJJIRg3LRIgq97yuZp+MtAv0XjUz3WCKBmXsIdR8MB90FSdykRbQcubenEF0iRmK7zO6HjFNs+hY8uwR1hzwgl7Qd2XLMf0bxHZlqbXmDaXhvbgkkrS8iKfR5dfOkPZlg91MyCnIy26qM7Rahd0PyK1JpWfsfE1T4Zqofux8e2WBSjdjzd8DnKZN7wHt4q9NUDgPq0yTL1fFDH/LdkLdqP2Te+sq+fsJ29x+O8/QxDpVdIgHmlj5bN+eEJ4LqhOEqjdnL4NwzSkSHbu6H1XEChVgOPx/6RgJeVa3ygz3NNej6hhw8CSuIUQ/y8/P+8p3oHNQ6CwasUQkncNkMVARQEwexRxHc3C5K8LejobmSzZzM6wYKg/+rON2ho6BI9apVNUdE4+G48mPqxqxHhj5axEsT1N2DlKiamua2U4tHPSjM2MWXE+DN4nIXaEMAHYRfmaDuKOYelGKd7FRTi3g1c3KIuZyBm+kfM9f+yBR6EOXncG7ZtC6/+82tihoyoo9PXWLyAIdjvt68WbxM9+MGUQUf2fM1q1SCeAs+taTXoNwx57fKlXX2MxOXiD8ZLo5Lcw3N6YmdtzS0QZ03VlFWkTt4mI3AbHmpIJSh34teaOQzt4qhzqcAAAA=";
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
if(hospital){const clock=el('span',status,formatCountdown(rem),'who-countdown');clock.dataset.releaseAt=String(t.releaseAt);clock.style.cssText='font-variant-numeric:tabular-nums;font-weight:700;margin-left:6px;color:'+(rem>0&&rem<=state.reservationTimer?'#8fe0a8':'#f0b85c');clock.title='Time until hospital release';}
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
root=document.createElement('section');root.id='tu-who-panel';root.style.cssText='position:fixed;z-index:2147483646;top:10%;left:5%;width:min(560px,90vw);height:82vh;min-width:300px;min-height:260px;background:#11191d;border:1px solid #a58a48;border-radius:12px;color:#e8edf0;font:12px system-ui;box-shadow:0 8px 28px #000b;display:flex;flex-direction:column;overflow:hidden';
stylesheet=document.createElement('style');stylesheet.textContent=`
#tu-who-panel,#tu-who-panel *{box-sizing:border-box}#tu-who-panel{font:12px/1.35 system-ui,sans-serif!important;color:#e8edf0!important}#tu-who-panel .who-header{min-height:46px!important}#tu-who-panel .who-logo{display:block!important;width:32px!important;height:32px!important;max-width:32px!important;max-height:32px!important;min-width:32px!important;min-height:32px!important;object-fit:contain!important}#tu-who-panel .who-heading{font-size:14px!important;line-height:1.2!important;margin:0!important}#tu-who-panel button{font-size:12px!important;line-height:1.2!important;min-height:25px!important}#tu-who-panel .who-icon{font-size:18px!important;min-width:28px!important;max-width:30px!important;padding:3px!important}#tu-who-panel .who-tabs button,#tu-who-panel .who-filters button{background:#28343b!important;color:#dce5e9!important}#tu-who-panel .who-tabs .active,#tu-who-panel .who-filters .active{background:#9c7b3b!important;color:#101417!important}#tu-who-panel .who-factions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}#tu-who-panel .who-factions>div{display:flex!important;flex-direction:column!important;align-items:center!important}#tu-who-panel input,#tu-who-panel select{background:#28343b!important;color:#eee!important;border:1px solid #50606a!important;max-width:100%!important}#tu-who-panel .who-content{width:100%!important}#tu-who-panel .who-reserved{background:#34443c!important;color:#93e2b0!important}#tu-who-panel .who-expand{background:transparent!important;color:#ddd!important}#tu-who-panel button,#tu-who-panel input,#tu-who-panel select{font:inherit}#tu-who-panel button{background:#dfb952;color:#101417;border:0;border-radius:5px;padding:5px 7px;cursor:pointer}#tu-who-panel button:disabled{opacity:.4;cursor:not-allowed}
#tu-who-panel .who-header{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:8px;background:#101417;border-bottom:1px solid #66552f;padding:7px 9px;flex-shrink:0}
#tu-who-panel .who-logo{width:32px;height:32px;object-fit:contain;flex-shrink:0}#tu-who-panel .who-heading{flex:1;color:#f0ce77;font-size:14px}#tu-who-panel .who-icon{background:#283139;color:#f0ce77;font-size:18px;min-width:28px}
#tu-who-panel .who-content{padding:9px;overflow-y:auto!important;overflow-x:hidden!important;min-height:0!important;flex:1 1 auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}#tu-who-panel .who-factions{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;color:#f0ce77}#tu-who-panel .who-factions>div{display:flex;flex-direction:column;gap:3px}#tu-who-panel .who-online{color:#55cc80}
#tu-who-panel .who-hint{font-size:10px;color:#aeb8bd;margin:7px 0}#tu-who-panel .who-tabs,#tu-who-panel .who-filters{display:flex;gap:4px;margin:8px 0}#tu-who-panel .who-tabs button,#tu-who-panel .who-filters button{flex:1;background:#28343b;color:#dce5e9}#tu-who-panel .who-tabs .active,#tu-who-panel .who-filters .active{background:#9c7b3b;color:#101417}
#tu-who-panel .who-tools{display:flex;gap:5px}#tu-who-panel .who-tools input{min-width:0;flex:1}#tu-who-panel input,#tu-who-panel select{background:#28343b;color:#eee;border:1px solid #50606a;border-radius:5px;padding:6px}
#tu-who-panel .who-list{display:flex;flex-direction:column;gap:1px;background:#374149}#tu-who-panel .who-row{background:#1c262d;display:flex;align-items:center;gap:6px;padding:5px 6px;min-height:44px}#tu-who-panel .who-left{min-width:0;flex:1}#tu-who-panel .who-line{display:flex;gap:5px;align-items:center;white-space:nowrap;overflow:hidden}#tu-who-panel .who-line b{overflow:hidden;text-overflow:ellipsis}#tu-who-panel .who-line small,#tu-who-panel .who-health{color:#afbbc2;font-size:10px}#tu-who-panel .who-bar{height:3px;background:#3d4a51;margin-top:3px}#tu-who-panel .who-bar>div{height:100%;background:#63ba8e}
#tu-who-panel .who-right{width:112px;flex-shrink:0;display:flex;flex-direction:column;align-items:stretch;gap:3px}#tu-who-panel .who-status{display:flex;justify-content:flex-end;align-items:center;gap:5px;font-size:10px;white-space:nowrap}#tu-who-panel .who-dot{height:8px;width:8px;border-radius:50%;background:#77828b;flex-shrink:0}#tu-who-panel .who-dot.online{background:#48cd7b}#tu-who-panel .who-dot.idle{background:#e9b84b}#tu-who-panel .who-dot.offline{background:#9aa4ae}#tu-who-panel .who-reserved{background:#34443c;color:#93e2b0}#tu-who-panel .who-expand{background:transparent;color:#ddd;padding:3px}#tu-who-panel .who-detail{padding:7px;background:#2b363e;color:#d4dfe3}#tu-who-panel .who-field{display:block;margin:8px 0;color:#d4dfe3}#tu-who-panel .who-field input,#tu-who-panel .who-field select{display:block;width:100%;margin-top:3px}#tu-who-panel .who-message{color:#e9b84b;padding:5px}#tu-who-panel .who-picker{display:flex;flex-direction:column;gap:5px;margin:5px 0 10px}#tu-who-panel .who-picker-trigger{width:100%;text-align:left!important;background:#28343b!important;color:#f0ce77!important;border:1px solid #6d5b35!important}#tu-who-panel .who-picker-results{max-height:210px;overflow-y:auto;overscroll-behavior:contain;background:#182229;border:1px solid #50606a;border-radius:6px}#tu-who-panel .who-picker-results button{display:block;width:100%;text-align:left!important;background:#202d35!important;color:#e8edf0!important;border-bottom:1px solid #374149!important;border-radius:0!important;padding:8px!important}#tu-who-panel .who-refresh{background:#28343b!important;color:#f0ce77!important}#tu-who-panel .who-field-label{font-weight:600;margin-top:8px}
`;document.head.append(stylesheet);
const grip=document.createElement('div');grip.className='who-resize-grip';grip.title='Resize window';grip.style.cssText='position:absolute;right:0;bottom:0;width:25px;height:25px;z-index:5;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,#a58a48 52%,#a58a48 58%,transparent 60%,transparent 72%,#a58a48 74%)';root.append(grip);
const beginGesture=(e,resize)=>{if(e.button!==undefined&&e.button!==0)return;if(!resize&&e.target.closest('button,a,input,select'))return;const rect=root.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,startW=rect.width,startH=rect.height,startL=rect.left,startT=rect.top;const handle=resize?grip:root.querySelector('.who-header');handle.setPointerCapture(e.pointerId);const move=ev=>{const dx=ev.clientX-startX,dy=ev.clientY-startY;if(resize){root.style.width=Math.max(300,Math.min(window.innerWidth-startL,startW+dx))+'px';root.style.height=Math.max(260,Math.min(window.innerHeight-startT,startH+dy))+'px'}else{root.style.left=Math.max(0,Math.min(window.innerWidth-80,startL+dx))+'px';root.style.top=Math.max(0,Math.min(window.innerHeight-46,startT+dy))+'px'}};const done=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',done);handle.removeEventListener('pointercancel',done)};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',done);handle.addEventListener('pointercancel',done)};
root.addEventListener('pointerdown',e=>{if(e.target===grip)beginGesture(e,true);else if(e.target.closest('.who-header'))beginGesture(e,false)});
root.addEventListener('touchmove',()=>{lastUserScroll=Date.now()},{passive:true});root.addEventListener('wheel',()=>{lastUserScroll=Date.now()},{passive:true});document.body.append(root);render();startRoster();poll=setInterval(()=>{if(!root||root.hidden||tab!=='targets')return;for(const clock of root.querySelectorAll('.who-countdown')){const remaining=seconds(Number(clock.dataset.releaseAt));if(remaining===null)continue;clock.textContent=formatCountdown(remaining);clock.style.color=remaining>0&&remaining<=state.reservationTimer?'#8fe0a8':'#f0b85c';}for(const button of root.querySelectorAll('.who-reserve')){const id=button.dataset.targetId;if(id&&state.targets[id])button.disabled=false;}},1000);
}
function register(){window.TornUtilities?.register?.({id:ID,version:'0.3.17-dev',activate, deactivate:close})}
if(window.TornUtilities)register();else window.addEventListener('torn-utilities-ready',register,{once:true});
})();
/* END torn-utilities/modules/war-hit-organizer.user.js */


/* BEGIN chat-archiver/pda/src/torn-multi-chat-archiver-pda.user.js */


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

            exactTimestamp: '',

            groupTimestamp:
                groupTimestamp || '',

            message:
                rendered.message
        };

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
                        '',

                    groupTimestamp,

                    message:
                        msg.message
                };

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
                    record &&
                    record.exactTimestamp !==
                        timestamp
                ) {
                    record.exactTimestamp =
                        timestamp;

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
                record &&
                record.exactTimestamp !==
                    timestamp
            ) {
                record.exactTimestamp =
                    timestamp;

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
            'Message'
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

                msg.message
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
            '12px';

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
                margin-bottom:5px;
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
                margin-top:6px;
                padding-top:5px;
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

                fontSize: '12px',

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
                    padding:7px 8px;
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
                    padding:9px;
                    box-sizing:border-box;
                "
            >
                <div style="
                    font-weight:bold;
                    margin-bottom:4px;
                ">
                    Chat to Archive
                </div>

                <div style="
                    display:flex;
                    gap:4px;
                    height:28px;
                    margin-bottom:8px;
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
                            font-size:17px;
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
                    gap:5px;
                    height:34px;
                    margin-bottom:7px;
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
                        padding:8px;
                        background:#181818;
                        border:1px solid #444;
                        border-radius:4px;
                        line-height:15px;
                        margin-bottom:8px;
                    "
                ></div>

                <div style="
                    font-weight:bold;
                    margin-bottom:5px;
                ">
                    Auto Scroll
                </div>

                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:flex-start;
                    gap:3px;
                    margin-bottom:9px;
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
                            margin-left:1px;
                            margin-right:8px;
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
                            margin-left:1px;
                        "
                    >
                </div>

                <div style="
                    display:grid;
                    grid-template-columns:1fr 1fr 1fr;
                    gap:5px;
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
                    padding:14px;
                    box-sizing:border-box;
                "
            >
                <div
                    style="
                        width:100%;
                        background:#242424;
                        border:1px solid #777;
                        border-radius:6px;
                        padding:14px;
                        box-sizing:border-box;
                        box-shadow:0 4px 14px rgba(0,0,0,.7);
                    "
                >
                    <div
                        id="tca-prompt-title"
                        style="
                            font-size:14px;
                            font-weight:bold;
                            margin-bottom:10px;
                            text-align:center;
                        "
                    >
                        History Check
                    </div>

                    <div
                        id="tca-prompt-question"
                        style="
                            font-size:12px;
                            line-height:17px;
                            text-align:center;
                            margin-bottom:14px;
                        "
                    ></div>

                    <div
                        style="
                            display:grid;
                            grid-template-columns:1fr 1fr;
                            gap:8px;
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
        bar.style.cssText = 'position:fixed;right:10px;bottom:44px;z-index:1000000;display:none;align-items:center;gap:4px;padding:5px;background:#202020;border:1px solid #777;border-radius:6px;touch-action:none;user-select:none;';
        bar.innerHTML = '<span id="tca-bar-handle" style="padding:4px 6px;color:#ccc;cursor:move;touch-action:none">⋮⋮</span>' +
          ['play','pause','stop'].map(k => '<button id="tca-bar-'+k+'" style="border:1px solid #ccc;border-radius:4px;padding:7px 9px;font:bold 12px Arial;color:white">'+k.toUpperCase()+'</button>').join('') +
          '<span id="tca-bar-copied" style="color:#fff;font:bold 12px Arial;white-space:nowrap;padding:0 4px">Copied: 0</span>';
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
    const definition={id:'chat-archiver',version:'0.1.8',activate:activateFromTU,deactivate:deactivateFromTU};
    function registerTU(){if(window.TornUtilities?.register) window.TornUtilities.register(definition);}
    window.addEventListener('torn-utilities-ready',registerTU); registerTU();

})();
/* END chat-archiver/pda/src/torn-multi-chat-archiver-pda.user.js */
