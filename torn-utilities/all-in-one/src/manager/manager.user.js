// ==UserScript==
// @name         Torn Utilities DEV (All-in-One)
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.5.42.37-dev
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
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js
// ==/UserScript==
(() => {
  'use strict';
  // Tampermonkey GM-enabled scripts use an isolated window. Publish the TU API on
  // the page window so separately installed @grant none modules can register.
  const pageWindow=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  if (pageWindow.__RELAX_TORN_UTILITIES_PDA__) return;
  pageWindow.__RELAX_TORN_UTILITIES_PDA__ = true;
  const KEY = 'relaxsweety_tu_pda_v1';
  const TU_VERSION='0.5.42.37-dev';
  const TU_LOGO='__TU_LOGO_DATA_URL__';
  // Bundled tool directory: no external catalog, cache, or refresh requests.
  const registry={schemaVersion:1,categories:[{"id":"business","name":"Business Tools","icon":"▥","order":10},{"id":"games","name":"Games","icon":"♜","order":20},{"id":"single-player","name":"Single Player","icon":"▣","order":21,"parent":"games"},{"id":"multiplayer","name":"Multiplayer","icon":"♟","order":22,"parent":"games"},{"id":"chat","name":"Chat Tools","icon":"◉","order":30},{"id":"other","name":"War Tools","icon":"⚙","order":40}],modules:[{"id":"flight-game","name":"Flight Game","category":"single-player","version":"0.12.8","description":"Standalone Flight Game arcade module, playable anytime"},{"id":"stick-fighter","name":"Stick Fighter","category":"single-player","version":"0.2.7","description":"Standalone Stick Fighter arcade module, playable anytime"},{"id":"chat-archiver","name":"Chat Archiver","category":"chat","version":"0.1.8","description":"Archive Torn chat conversations"},{"id":"tic-tac-toe","name":"Tic-Tac-Toe","category":"multiplayer","version":"0.6.5","description":"Two-player Tic-Tac-Toe with named winners, green winning line, rematches and head-to-head history"},{"id":"torn-four","name":"Torn Four","category":"multiplayer","version":"0.2.5","description":"Connect Four: two-player multiplayer with private room codes"},{"id":"torn-fleet","name":"Torn Fleet","category":"multiplayer","version":"0.2.5","description":"Battleship: fleet placement and turn-based naval combat"},{"id":"torn-snake","name":"Slithering Streets","category":"single-player","version":"0.2.14","description":"Single-player Snake with touch controls and local high scores"},{"id":"chaos-marbles","name":"Chaos Marbles","category":"multiplayer","version":"0.2.5","description":"Online 2\u20134 player marble race with private player sessions, Waiting for Chaos staging, and game history"},{"id":"item-monitor","name":"Travel Assistant and Item Monitor","category":"business","version":"1.10.31-dev","description":"Item Monitor and Travel Assistant with D1 stock reporting, source diagnostics and stock estimation"},{"id":"war-hit-organizer","name":"War Organizer","category":"other","version":"0.3.17-dev","description":"Compact war target board, reservation controls, timer and local development settings"}]};
  const versionCompare=(a,b)=>{const aa=String(a||'0').split('.').map(v=>parseInt(v,10)||0),bb=String(b||'0').split('.').map(v=>parseInt(v,10)||0);for(let i=0;i<3;i++)if(aa[i]!==bb[i])return (aa[i]||0)-(bb[i]||0);return 0;};
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
  // Public Only key stored locally on this device; no passphrase or GM grants.
  const VAULT='tu:identity:public-only-key:v1',VAULT_CLEARED='tu:identity:login-cleared:v1';
  const LOGIN_ACCESS_KEY='tu:identity:login-access-level:v1';
  const loginAccessLabel=()=>readStoredKeys().find(entry=>entry.key===readSavedKey())?.level||'Access level unverified';
  const normalizeKey=v=>{if(typeof v!=='string')return '';let x=v.trim();for(let i=0;i<3;i++){if(x.startsWith('GMV2_')){x=x.slice(5);continue;}if(x.startsWith('"')&&x.endsWith('"')){try{const y=JSON.parse(x);if(typeof y==='string'){x=y.trim();continue}}catch{}}break;}return /^[A-Za-z0-9]{16}$/.test(x)?x:'';};
  const readSavedKey=()=>{let v='';try{v=localStorage.getItem(VAULT)||''}catch{}let key=normalizeKey(v);if(key){if(key!==v)try{localStorage.setItem(VAULT,key)}catch{}return key;}if(localStorage.getItem(VAULT_CLEARED)==='1')return '';try{key=normalizeKey(typeof GM_getValue==='function'?GM_getValue(VAULT,''):'');if(key){try{localStorage.setItem(VAULT,key)}catch{}return key}}catch{}return ''};
  const saveKey=key=>{localStorage.setItem(SAVED_KEYS,JSON.stringify(readStoredKeys()));let stored=false;try{localStorage.setItem(VAULT,key);stored=true}catch(_){}try{if(typeof GM_setValue==='function'){GM_setValue(VAULT,key);stored=true}}catch(_){}if(!stored)throw Error('No persistent key storage available');localStorage.removeItem(VAULT_CLEARED)};
  const removeSavedKey=()=>{localStorage.setItem(VAULT_CLEARED,'1');try{localStorage.removeItem(LOGIN_ACCESS_KEY)}catch(_){}try{localStorage.removeItem(VAULT)}catch(_){}try{if(typeof GM_deleteValue==='function')GM_deleteValue(VAULT);else if(typeof GM_setValue==='function')GM_setValue(VAULT,'')}catch(_){}};
  const SAVED_KEYS='tu:identity:saved-keys:v1',WHO_KEY='tu:who:limited-api-key:v1',EXTRA_KEYS='tu:api:additional-keys:v1';
  const readExtras=()=>{try{const list=JSON.parse(localStorage.getItem(EXTRA_KEYS)||'[]');return Array.isArray(list)?list.filter(x=>normalizeKey(x?.key)):[]}catch{return []}};
  function readStoredKeys(){
    let records=[];try{const data=JSON.parse(localStorage.getItem(SAVED_KEYS)||'[]');if(Array.isArray(data))records=data}catch{}
    const keys=new Map();
    for(const entry of records){const key=normalizeKey(entry?.key);if(key&&!keys.has(key))keys.set(key,{key,level:['Public Only','Limited Access'].includes(entry.level)?entry.level:null,playerId:/^[1-9][0-9]*$/.test(String(entry.playerId||''))?String(entry.playerId):null,verifiedAt:typeof entry.verifiedAt==='string'?entry.verifiedAt:null});}
    // Recover every legacy key without treating stale role labels as verified access.
    for(const value of [readSavedKey(),localStorage.getItem(WHO_KEY),...readExtras().map(e=>e.key)]){const key=normalizeKey(value);if(key&&!keys.has(key))keys.set(key,{key,level:null,playerId:null,verifiedAt:null});}
    return [...keys.values()];
  }
  function rememberVerifiedKey(key,level,playerId){
    if(!normalizeKey(key)||!['Public Only','Limited Access'].includes(level))throw Error('Unsupported verified key');
    const entries=readStoredKeys(),entry=entries.find(e=>e.key===key)||{key};
    const previous=entries.findIndex(e=>e.key===key);
    Object.assign(entry,{level,playerId:/^[1-9][0-9]*$/.test(String(playerId||''))?String(playerId):entry.playerId||null,verifiedAt:new Date().toISOString()});
    if(previous<0)entries.push(entry);else entries[previous]=entry;
    localStorage.setItem(SAVED_KEYS,JSON.stringify(entries));
    return entry;
  }
  function forgetStoredKey(key){
    const remaining=readStoredKeys().filter(e=>e.key!==key);
    if(readSavedKey()===key)removeSavedKey();
    if(normalizeKey(localStorage.getItem(WHO_KEY))===key)localStorage.removeItem(WHO_KEY);
    localStorage.setItem(EXTRA_KEYS,JSON.stringify(readExtras().filter(e=>normalizeKey(e.key)!==key)));
    localStorage.setItem(SAVED_KEYS,JSON.stringify(remaining));
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
        const warKey=readStoredKeys().find(entry=>entry.key===normalizeKey(localStorage.getItem(WHO_KEY)));if(warKey?.playerId&&warKey.playerId!==String(id))localStorage.removeItem(WHO_KEY);
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
    getLogo:()=>TU_LOGO,
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
      const key=normalizeKey(localStorage.getItem('tu:who:limited-api-key:v1')||'')||(localStorage.getItem(LOGIN_ACCESS_KEY)==='limited'?readSavedKey():'');
      const keyEntry=readStoredKeys().find(entry=>entry.key===key);
      if(!key||keyEntry?.level!=='Limited Access'||!playerInfo?.id||keyEntry.playerId!==playerInfo.id)throw Error('Recheck and select a Limited Access key for the current TU player in Settings > API Keys');
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
    registerTool(def) {
      if (!def || typeof def.id !== 'string' || !/^[a-z0-9-]+$/.test(def.id) ||
          typeof def.activate !== 'function' || typeof def.deactivate !== 'function' ||
          registered.has(def.id)||!registry.modules.some(t=>t.id===def.id)) return false;
      registered.set(def.id, Object.freeze({id:def.id, version:typeof def.version==='string'?def.version:null, activate:def.activate, deactivate:def.deactivate}));
      if (typeof render === 'function') render(currentTab);
      return true;
    },
    isRegistered(id) { return registered.has(id); },
    isActive(id) { return active === id; }
  });
  Object.defineProperty(pageWindow, 'TornUtilities', {value:api, configurable:false, writable:false});
  // Share the integrated tool API with both the page and userscript sandbox.
  if(window!==pageWindow)try{Object.defineProperty(window,'TornUtilities',{value:api,configurable:true});}catch(error){console.warn('[TU] Sandbox API bridge unavailable',error);}
  pageWindow.dispatchEvent(new Event('torn-utilities-ready'));
  if(window!==pageWindow)window.dispatchEvent(new Event('torn-utilities-ready'));
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
    rememberVerifiedKey(key,accessLevel==='limited'?'Limited Access':'Public Only',registration.playerId);
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
    const id=active; active=null;
    try { registered.get(id)?.deactivate(); } catch(e) { console.error('[TU] tool cleanup failed',id); }
    moduleHost.replaceChildren(); moduleHost.hidden=true;
  }
  async function openModule(id) {
    if(!authorized()){showAgreement();return false;}
    const mod=registered.get(id);
    if (!mod || saved.disabled?.[id]) return false;
    if(active===id)return true;
    stopModule();
    moduleHost.hidden=false;
    try {
      active=id;
      tuNav.history.push('tu-pda-panel');tuNav.current=id;tuNav.minimized=false;tuNav.exited=false;
      await mod.activate(Object.freeze({mount:moduleHost, close:()=>{stopModule();panel.hidden=false;viewModule=null;render('modules');syncLauncher();},minimize:()=>{tuMinimize();syncLauncher();}}));
      return true;
    } catch(e) {
      console.error('[TU] tool activation failed',id);
      try { mod.deactivate(); } catch {}
      active=null;moduleHost.replaceChildren(); moduleHost.hidden=true;
      return false;
    }
  }
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} };
  // TU unified window navigation (test release).
  const tuNav={history:[],current:'tu-pda-panel',minimized:true,exited:true};
  const tuRoots=['tu-pda-panel','tuim-panel','tuim-catalog','tuim-travel-window','tuim-data-window','tca-panel','tca-playbar','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tu-diagnostics-window'];
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
#tu-pda-launcher{border-radius:50%;border:0;background:#08090a url(${TU_LOGO}) center/cover no-repeat;color:transparent;box-shadow:0 2px 9px #000b;font-size:0;padding:0}
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
  const brandStyle=document.createElement('style');brandStyle.textContent='.tu-brand-emblem{display:inline-grid;place-items:center;width:32px;height:32px;flex:none;border:2px solid #e3bb57;border-radius:50%;border:0;background:#08090a url('+TU_LOGO+') center/cover no-repeat;color:transparent;font-size:0;box-shadow:0 2px 9px #000b}';document.head.appendChild(brandStyle);
  const panel = document.createElement('section');
  panel.id = 'tu-pda-panel';
  panel.hidden = true;
  panel.innerHTML = '<header><span class="tu-logo" role="img" aria-label="Torn Utilities"></span><div><h2>Torn Utilities</h2><p>Integrated Tools for Torn City</p></div><button class="tu-close" aria-label="Close">×</button></header><nav><button data-tab="modules" aria-selected="true">Tools</button><button data-tab="settings">Settings</button><button data-tab="about">About</button></nav><div class="tu-content"></div><footer style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>Torn Utilities v0.5.42.37-dev</span></footer>';
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
  function showAgreement(selectedKey=null){
    panel.hidden=false;render('about');
    const existing=document.getElementById('tu-agreement-overlay');if(existing){if(typeof selectedKey==='string'){const field=existing.querySelector('input[type=password],input[type=text]');if(field)field.value=selectedKey;}existing.hidden=false;existing.style.display='flex';tuNav.minimized=false;tuNav.exited=false;launcher.hidden=true;return;}
    const overlay=document.createElement('div');overlay.id='tu-agreement-overlay';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000d;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;overflow:hidden';
    const dialog=document.createElement('section');dialog.style.cssText='background:#182026;color:#eee;border:2px solid #cba953;border-radius:12px;width:min(96vw,580px);max-height:calc(100dvh - 110px);height:min(780px,calc(100dvh - 110px));display:flex;flex-direction:column;overflow:hidden;padding:0;font:14px/1.5 system-ui;box-sizing:border-box;min-height:0';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    const h=document.createElement('h2');h.textContent='TU Terms and Information Use Agreement';h.style.cssText='display:block;position:static;margin:0 0 18px;padding:0;color:#f3f6f8;font:700 21px/1.35 system-ui';dialog.append(h);appendTerms(dialog);
    const keyInfo=document.createElement('p');keyInfo.textContent='Torn Public Only or Limited Access API key: enter your key below to verify identity and accept the current published agreement. Never enter a Full Access key.';dialog.append(keyInfo);
    const key=document.createElement('input');key.type='password';key.autocomplete='off';key.maxLength=16;if(typeof selectedKey==='string')key.value=selectedKey;key.placeholder=readSavedKey()?'API key already saved':'16-character Public Only or Limited Access key';key.style.cssText='flex:1;min-width:0;box-sizing:border-box;padding:10px';const keyRow=document.createElement('div');keyRow.style.cssText='display:flex;align-items:center;gap:8px;width:100%';const revealKey=makeButton('Show',()=>{const visible=key.type==='text';key.type=visible?'password':'text';revealKey.textContent=visible?'Show':'Hide';revealKey.setAttribute('aria-pressed',String(!visible));});revealKey.type='button';revealKey.setAttribute('aria-label','Show or hide agreement API key');revealKey.setAttribute('aria-pressed','false');keyRow.append(key,revealKey);dialog.append(keyRow);
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
    const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
    const check=makeButton('Check TU update',tuCheckUpdates);check.style.marginLeft='0';buttons.append(check);
    const link=document.createElement('a');link.href=tuScriptUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View latest TU script';link.style.cssText='color:#f1ce72;padding:8px';buttons.append(link);
    box.append(buttons);content.append(box);
  };
  function render(tab) {
    if(!authorized()&&tab!=='about')tab='about';
    if(tab!=='settings')settingsPage=null;
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
        const note=document.createElement('p');note.textContent='Save Public Only or Limited Access keys individually. Adding a key preserves the current TU login. Use a saved key explicitly to switch login or select the Limited key for War Organizer. Keys are stored locally without encryption; keep them private.';content.append(note);
        const form=document.createElement('form');form.autocomplete='off';
        const input=document.createElement('input');input.type='password';input.maxLength=16;input.autocomplete='off';input.placeholder='16-character Torn API key';input.style.cssText='width:100%;box-sizing:border-box;padding:9px';
        const status=document.createElement('p');status.setAttribute('role','status');status.textContent=identityStatus;
        const submit=makeButton('Confirm & Save');submit.type='submit';
        form.append(input,makeButton('Show / Hide',()=>{input.type=input.type==='password'?'text':'password'}),submit);content.append(form,status);
        const savedKeys=document.createElement('div');savedKeys.style.cssText='margin:10px 0';let viewing=true,keyOperation=false;
        const guarded=action=>async()=>{if(keyOperation)return;keyOperation=true;try{await action()}finally{keyOperation=false;}};
        const reportError=()=>{status.textContent='Operation failed. Check the key, network connection and DEV session, then retry.'};
        async function verifyEntry(key){const data=await requestIdentity(key),info=checkedKeyInfo(data);rememberVerifiedKey(key,info.level,info.playerId);if(key===readSavedKey())localStorage.setItem(LOGIN_ACCESS_KEY,info.level==='Limited Access'?'limited':'public');return {data,...info};}
        async function useForLogin(key){
          try{
            const checked=await verifyEntry(key);
            const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform:typeof pageWindow.PDA_httpGet==='function'?'pda':'tampermonkey'},'');
            const expected=checked.level==='Limited Access'?'limited':'public';
            if(!registration.token||registration.accessLevel!==expected||(registration.playerId!=null&&String(registration.playerId)!==checked.playerId))throw Error('DEV registration verification mismatch');
            const agreement=await loadDevAgreement();
            const current=await devRequest('/api/auth/agreement','GET',null,registration.token);
            if(!current.accepted){showAgreement(key);return;}
            stopModule();clearPlayer();saveKey(key);localStorage.setItem(LOGIN_ACCESS_KEY,expected);sessionStorage.setItem(DEV_SESSION_KEY,registration.token);localStorage.setItem(TU_TERMS_KEY,agreement.agreement_version);
            if(!await updatePlayer(key,checked.data))throw Error('Identity update failed');
            resetDevAuthFailure();publishAuthorization(true);status.textContent='Saved key selected for TU login';renderSaved();
          }catch{reportError();}
        }
        function renderSaved(){
          savedKeys.replaceChildren();const keys=readStoredKeys();
          const summary=document.createElement('p');summary.textContent=keys.length+' saved API key(s)';savedKeys.append(summary);if(!viewing)return;
          for(const [index,entry] of keys.entries()){
            const row=document.createElement('div');row.dataset.tuKeyEntry=String(index);row.style.cssText='padding:9px 0;border-top:1px solid #555';
            const roles=[entry.key===readSavedKey()?'TU login':null,entry.key===normalizeKey(localStorage.getItem(WHO_KEY))?'War Organizer':null].filter(Boolean);
            const label=document.createElement('strong');label.textContent=(entry.level||'Access level unverified')+(roles.length?' ('+roles.join(', ')+')':'');row.append(label);
            const owner=document.createElement('small');owner.textContent=entry.playerId?' · Player '+entry.playerId:' · Recheck legacy key to verify its access level';row.append(owner);
            const field=document.createElement('input');field.type='password';field.readOnly=true;field.value=entry.key;field.style.cssText='display:block;width:100%;box-sizing:border-box;padding:8px;margin:6px 0';row.append(field);
            row.append(makeButton('Show / Hide',()=>{field.type=field.type==='password'?'text':'password'}));
            row.append(makeButton('Recheck access level',guarded(async()=>{try{await verifyEntry(entry.key);status.textContent='Saved key access level verified by Torn';renderSaved();}catch{status.textContent='Key could not be verified. It remains saved until you remove it.'}})));
            if(entry.key!==readSavedKey())row.append(makeButton('Use for TU login',guarded(()=>useForLogin(entry.key))));
            if(entry.level==='Limited Access'&&entry.key!==normalizeKey(localStorage.getItem(WHO_KEY)))row.append(makeButton('Use for War Organizer',guarded(async()=>{try{const checked=await verifyEntry(entry.key);if(checked.level!=='Limited Access'||checked.playerId!==getPlayer()?.id)throw Error('Use a Limited key belonging to the current TU player');localStorage.setItem(WHO_KEY,entry.key);status.textContent='Limited key selected for War Organizer';renderSaved();}catch{status.textContent='Select a valid Limited key belonging to the current TU player.'}})));
            row.append(makeButton('Remove',guarded(async()=>{
              if(!confirm('Remove only this saved API key? Other saved keys will be retained.'))return;
              const activeKey=entry.key===readSavedKey();
              if(activeKey){try{await devCancel()}catch{status.textContent='Cancellation not confirmed; key retained. Check the DEV connection and retry.';return;}}
              forgetStoredKey(entry.key);
              if(activeKey){resetDevAuthFailure();localStorage.removeItem(TU_TERMS_KEY);sessionStorage.removeItem(DEV_SESSION_KEY);clearPlayer();publishAuthorization(false);showAgreement();syncLauncher();}
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
        const refresh=()=>{const all=buildDiagnostics();const mod=diagnosticModule;report.textContent=JSON.stringify(mod?{managerVersion:all.managerVersion,tool:all.tools.find(m=>m.id===mod)||null}:all,null,2);};
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
      const agreementButton=makeButton('User Agreement',()=>{content.replaceChildren();const back=makeButton('← About',()=>render('about'));content.append(back);appendTerms(content);if(!hasAgreement())content.append(makeButton('Review and Accept Terms',showAgreement));});agreementButton.style.margin='8px 8px 8px 0';content.append(agreementButton);const notesButton=makeButton('Version Notes',()=>{content.replaceChildren();content.append(makeButton('← About',()=>render('about')));const heading=document.createElement('h3');heading.textContent='Version Notes';const notes=document.createElement('div');for(const release of TU_RELEASES){const h=document.createElement('h4');h.textContent=release.version+' · '+release.date;notes.append(h);for(const [section,items] of Object.entries(release.changes)){const p=document.createElement('p');p.textContent=section+': '+items.join('; ');notes.append(p);}}content.append(heading,notes);});notesButton.style.margin='8px 0';content.append(notesButton);
      // Official-style vector marks; no remote image dependencies.
      addSocialIcon('RelaxSweety on Discord','https://discord.com/users/relaxsweety','M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.1 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.075.075 0 0 0-.041-.104 13.1 13.1 0 0 1-1.872-.89.076.076 0 0 1-.008-.127c.126-.095.252-.193.372-.292a.074.074 0 0 1 .077-.01c3.929 1.793 8.185 1.793 12.068 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.292a.076.076 0 0 1-.007.127c-.598.35-1.224.65-1.873.89a.076.076 0 0 0-.04.105c.36.698.77 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.83 19.83 0 0 0 6.003-3.03.077.077 0 0 0 .031-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z');
      const tornLink=document.createElement('a');tornLink.href='https://www.torn.com/profiles.php?XID=4539436';tornLink.target='_blank';tornLink.rel='noopener noreferrer';tornLink.title='RelaxSweety on Torn';tornLink.setAttribute('aria-label','RelaxSweety on Torn');
      tornLink.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:50px;height:48px;margin:12px 14px 4px 0;background:#252a2e;border:1px solid #806a3e;border-radius:12px';
      const tornLogo=document.createElement('img');tornLogo.src='https://www.torn.com/favicon.ico';tornLogo.alt='Torn';tornLogo.width=30;tornLogo.height=30;tornLink.append(tornLogo);content.append(tornLink);
    }
  }
  render(hasAgreement()?'modules':'about');
  restoreSavedIdentity();
  void restoreDevSession();
  setInterval(()=>{if(authorizationVerified&&!authorized())publishAuthorization(false);},1000);
  // Do not interrupt first-run API requests with an immediate alert.
  window.addEventListener('torn-utilities-ready',()=>render(currentTab));
  // Tool factories remain inert until Open is pressed.

  const isVisible=id=>{
    const el=document.getElementById(id);
    return !!el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  };
  const syncLauncher=()=>{
    const moduleVisible=!!active&&(['tuim-panel','tuim-catalog','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tca-panel','tca-playbar'].some(isVisible)||[...moduleHost.children].some(el=>isVisible(el.id)||(!el.hidden&&el.getClientRects().length>0)));
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
  panel.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {if(!authorized()&&b.dataset.tab!=='about'){showAgreement();return;}if(b.dataset.tab==='modules')goModules();else render(b.dataset.tab);}));
  // Shared floating-window support for TU module panels.
  // Persist each TU window's user-selected size and position independently.
  const floatIds=['tu-diagnostics-window','tuim-panel','tuim-catalog','tca-panel','tu-pda-panel','sff-root','tpfg-manager','tpfg-root','tpfg-prompt'];
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
  const enhancedHeaders=new WeakSet();
  const tuEnhanceHeaders=()=>{
    for(const id of floatIds){
      if(id==='tu-pda-panel')continue;
      const el=tuRoot(id);if(!el||el.dataset.tuModuleNav==='1')continue;
      const bar=el.querySelector('header,.tu-header,.tuim-header,.tuim-travel-header,.tuac-header');if(!bar||(enhancedHeaders.has(bar)&&bar.querySelector('[data-tu-nav-controls]')))continue;enhancedHeaders.add(bar);
      el.dataset.tuNavHeader='1';for(const oldButton of [...bar.querySelectorAll('button')]){if(['−','—','×'].includes(oldButton.textContent.trim())&&!oldButton.closest('[data-tu-nav-controls]')&&oldButton.style.display!=='none')oldButton.style.display='none';}
      if(!bar.querySelector('[data-tu-brand-emblem]')){const emblem=document.createElement('span');emblem.className='tu-brand-emblem';emblem.dataset.tuBrandEmblem='1';emblem.textContent='';bar.prepend(emblem);}
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
      syncLauncher();
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
  windowObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden','class']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleWindowUpdate(true);});
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


