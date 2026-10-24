// ==UserScript==
// @name         Torn Utilities PDA
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.4.65-dev
// @description  Movable TU launcher and module catalog for Torn PDA
// @author       RelaxSweety [4539436]
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/agreement-lifecycle-integration/torn-utilities/core/pda/torn-utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/agreement-lifecycle-integration/torn-utilities/core/pda/torn-utilities.user.js
// ==/UserScript==
(() => {
  'use strict';
  if (window.__RELAX_TORN_UTILITIES_PDA__) return;
  window.__RELAX_TORN_UTILITIES_PDA__ = true;
let currentAgreement=null;
  let currentAgreementText='';
  let agreementLoadedAt=0;
  const TU_TERMS_VERSION=()=>currentAgreement?.agreement_version||'unavailable';
  async function loadPublishedAgreement(force=false){
    if(!force&&currentAgreement&&Date.now()-agreementLoadedAt<30000)return currentAgreement;
    const result=await devRequest('/api/auth/agreement/current','GET',null,'');
    if(!result.agreement||typeof result.content!=='string')throw Error('Invalid published agreement');
    currentAgreement=result.agreement;currentAgreementText=result.content;agreementLoadedAt=Date.now();
    return currentAgreement;
  }
  // DEVELOPMENT BUILD ONLY. This code is not deployed from main.
  const DEV_BASE='https://tu-multiplayer-server-dev.tuserver.workers.dev';
  const DEV_SESSION_KEY='tu:dev:auth:session:v1';
  const devToken=()=>sessionStorage.getItem(DEV_SESSION_KEY)||'';
  async function devRequest(path,method='GET',body,token=devToken()){
    const url=DEV_BASE+path;
    const headers={'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})};
    const payload=body===undefined||body===null?undefined:JSON.stringify(body);
    const failures=[];
    const parse=(raw,transport,status)=>{
      let value=raw;
      if(value instanceof Map)value=Object.fromEntries(value);
      if(value&&typeof value==='object'&&('responseText' in value||'data' in value||'body' in value||'response' in value)){
        value=value.responseText??value.data??value.body??value.response;
        if(value instanceof Map)value=Object.fromEntries(value);
      }
      if(typeof value==='string'){
        try{value=JSON.parse(value)}catch{throw Error(transport+': invalid JSON response ('+value.slice(0,180)+')')}
      }
      if(!value||typeof value!=='object'||Array.isArray(value))throw Error(transport+': invalid server response ('+String(value).slice(0,180)+')');
      if(typeof status==='number'&&(status<200||status>=300))throw Error('HTTP '+status+': '+(value.error||'Request rejected'));
      if(typeof value.error==='string'&&value.error)throw Error('HTTP response: '+value.error);
      return value;
    };
    const isHttpError=error=>/HTTP\\s*[45]\\d\\d|status\\s*[45]\\d\\d|HTTP response:/i.test(String(error?.message||error));
    // A POST may have reached the server even when PDA returns an invalid response.
    // Never replay a mutation over a different transport after an uncertain outcome.
    if(method==='POST'&&typeof PDA_httpPost==='function'){
      try{return parse(await PDA_httpPost(url,headers,payload),'PDA_httpPost')}
      catch(error){const diagnostic={method,bodyType:typeof body,serializedBodyType:typeof payload,headersType:typeof headers,bridgeType:typeof PDA_httpPost,errorType:String(error?.name||'Error')};console.warn('[TU] POST argument types',diagnostic);throw Error('PDA_httpPost: '+error.message+'; POST not retried. Diagnostic: '+JSON.stringify(diagnostic))}
    }
    if(method==='GET'&&typeof PDA_httpGet==='function'){
      try{
        // PDA's native helper is normally called with URL only. Some versions
        // return undefined when an unsupported headers argument is supplied.
        const response=token?await PDA_httpGet(url,headers):await PDA_httpGet(url);
        return parse(response,'PDA_httpGet');
      }catch(error){if(isHttpError(error))throw error;failures.push('PDA_httpGet: '+error.message)}
    }
    const gm=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest:null;
    if(gm){
      try{
        const response=await new Promise((resolve,reject)=>gm({method,url,headers,data:payload,timeout:15000,onload:resolve,onerror:()=>reject(Error('network error')),ontimeout:()=>reject(Error('timeout'))}));
        if(!response)throw Error('GM_xmlhttpRequest returned no response (check PDA script grants)');
        return parse(response,'GM_xmlhttpRequest',response.status);
      }catch(error){if(isHttpError(error)||method!=='GET')throw error;failures.push('GM_xmlhttpRequest: '+error.message)}
    }
    if(method!=='GET')throw Error('No safe PDA POST transport available; request not retried');
    try{
      const response=await fetch(url,{method,headers,cache:'no-store'});
      return parse(await response.text(),'fetch',response.status);
    }catch(error){
      if(isHttpError(error))throw error;
      failures.push('fetch: '+error.message);
      throw Error(failures.join(' | '));
    }
  }
  // Status-aware diagnostic: do not interpret PDA's undefined response as HTTP 401.
  // Fetch is attempted first because it exposes Response.status when CORS permits.
  async function devProbeAuthStatus(token){
    const url=DEV_BASE+'/api/auth/me';
    const headers={Authorization:'Bearer '+token};
    const errors=[];
    try{
      const response=await fetch(url,{method:'GET',headers,cache:'no-store'});
      return {status:response.status,transport:'fetch'};
    }catch(error){errors.push('fetch: '+error.message)}
    const gm=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest:null;
    if(gm){
      try{
        const response=await new Promise((resolve,reject)=>gm({method:'GET',url,headers,timeout:15000,onload:resolve,onerror:()=>reject(Error('network error')),ontimeout:()=>reject(Error('timeout'))}));
        if(response&&typeof response.status==='number')return {status:response.status,transport:'GM_xmlhttpRequest'};
        errors.push('GM_xmlhttpRequest: no HTTP status exposed');
      }catch(error){errors.push('GM_xmlhttpRequest: '+error.message)}
    }
    return {status:null,transport:'none',detail:errors.join(' | ')||'No status-aware transport available'};
  }
  async function devAccept(key,platform){
    let stage='register';
    try{
      const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform},'');
      if(!registration.token)throw Error('Registration returned no session');
      const token=registration.token;
      stage='load published agreement';
      const agreement=await loadPublishedAgreement(false);
      stage='record acceptance';
      await devRequest('/api/auth/agreement','POST',{action:'accepted',request_id:crypto.randomUUID(),...agreement},token);
      stage='verify acceptance';
      const status=await devRequest('/api/auth/agreement','GET',null,token);
      if(!status.accepted)throw Error('Development agreement was not confirmed');
      sessionStorage.setItem(DEV_SESSION_KEY,token);
      return status;
    }catch(error){throw Error('Agreement '+stage+' failed: '+error.message)}
  }
  // Recover an existing server-accepted agreement when PDA discards sessionStorage.
  // Local cache only controls the prompt; protected endpoints still require a live bearer token.
  let sessionRecovery=null;
  async function restoreDevSession(){
    if(sessionRecovery)return sessionRecovery;
    sessionRecovery=(async()=>{
      if(!hasAgreement())throw Error('Agreement not confirmed locally');
      const existing=devToken();
      if(existing){
        try{await devRequest('/api/auth/me','GET',null,existing);return existing}
        catch(error){if(!/Unauthorized|HTTP 401/i.test(error.message))throw error;sessionStorage.removeItem(DEV_SESSION_KEY)}
      }
      const key=getPublicApiKey();
      if(!/^[A-Za-z0-9]{16}$/.test(key))throw Error('Public Only API key unavailable');
      const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform:'pda'},'');
      if(!registration.token)throw Error('Registration did not return a token');
      const status=await devRequest('/api/auth/agreement','GET',null,registration.token);
      if(!status.accepted){
        await devRequest('/api/auth/logout','POST',{},registration.token).catch(()=>{});
        throw Error('Server agreement is not accepted; review agreement');
      }
      sessionStorage.setItem(DEV_SESSION_KEY,registration.token);
      return registration.token;
    })();
    try{return await sessionRecovery}finally{sessionRecovery=null}
  }
  async function devCancel(){
    let token=devToken();
    if(token){
      try{await devRequest('/api/auth/me','GET',null,token)}
      catch(error){
        if(!/Unauthorized|HTTP 401/i.test(error.message))throw error;
        sessionStorage.removeItem(DEV_SESSION_KEY);
        token='';
      }
    }
    if(!token){
      // Reauthenticate only for cancellation. Do not record another acceptance.
      const key=localStorage.getItem('tu:public-api-key:v1')||'';
      if(!/^[A-Za-z0-9]{16}$/.test(key))throw Error('Saved Public Only API key unavailable for cancellation');
      const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform:'pda'},'');
      if(!registration.token)throw Error('Cancellation reauthentication returned no session');
      token=registration.token;
      sessionStorage.setItem(DEV_SESSION_KEY,token);
    }
    await devRequest('/api/auth/agreement','POST',{action:'cancelled',request_id:crypto.randomUUID()},token);
    sessionStorage.removeItem(DEV_SESSION_KEY);
  }
  const TU_TERMS_KEY='tu:agreement:accepted';
  const hasAgreement=()=>localStorage.getItem(TU_TERMS_KEY)===TU_TERMS_VERSION()&&!!localStorage.getItem('tu:agreement:verified-key:v1')&&localStorage.getItem('tu:agreement:verified-key:v1')===localStorage.getItem('tu:public-api-key:v1');
  const ACCESS_URL='https://tu-multiplayer-server.tuserver.workers.dev/api/access/agreements';
  async function serverAgreement(key,accept){
    const url=ACCESS_URL+(accept?'':'?check=1');
    const options={method:accept?'POST':'GET',headers:{'content-type':'application/json','x-torn-public-key':key},...(accept?{body:JSON.stringify({accepted:true,version:TU_TERMS_VERSION()})}:{})};
    let response;
    try{response=await fetch(url,options);}
    catch(fetchError){
      if(typeof GM_xmlhttpRequest!=='function')throw Error('PDA blocked the TU server request. Check PDA network permissions or script grants. '+fetchError.message);
      response=await new Promise((resolve,reject)=>GM_xmlhttpRequest({method:options.method,url,headers:options.headers,data:options.body,timeout:15000,onload:r=>resolve({ok:r.status>=200&&r.status<300,status:r.status,json:async()=>JSON.parse(r.responseText)}),onerror:()=>reject(Error('PDA network request failed')),ontimeout:()=>reject(Error('TU server timed out'))}));
    }
    let data={};try{data=await response.json()}catch{}
    if(!response.ok||!data.accessConfirmed)throw Error(data.error||'Backend confirmation failed ('+response.status+')');
    return data;
  }

  const KEY = 'relaxsweety_tu_pda_v1';
  const TU_VERSION='0.4.65-dev';
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
    ,{id:'item-monitor',name:'Item Monitor',category:'business',version:'1.10.1',description:'Item Monitor and Travel Assistant',scriptUrl:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/item-monitor.user.js'}
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
  async function refreshRegistry(){
    if(registryRefreshing)return;
    registryRefreshing=true;registryStatus='Refreshing catalog';render(currentTab);
    try{
      const url=REGISTRY_URL+'?t='+Date.now();
      const get=async()=>{
        // Prefer a cache-busted browser request; PDA_httpGet may return a stale cached GitHub response.
        try{
          const response=await fetch(url,{cache:'no-store'});
          if(!response.ok)throw Error('HTTP '+response.status);
          return await response.text();
        }catch(browserError){
          if(typeof PDA_httpGet!=='function')throw browserError;
          const response=await PDA_httpGet(url+'&refresh='+Math.random().toString(36).slice(2));
          const raw=typeof response==='string'?response:(response?.responseText??response?.data??response?.body??response?.response);
          if(typeof raw==='string'&&raw.trim())return raw;
          if(raw&&typeof raw==='object')return raw;
          throw Error('PDA returned empty catalog: '+browserError.message);
        }
      };
      const raw=await Promise.race([get(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Catalog timeout')),12000))]);
      let next=validateRegistry(typeof raw==='string'?JSON.parse(raw):raw);
      // When PDA returns a stale raw.githubusercontent.com response, use the GitHub
      // contents endpoint as an independent, cache-busted source of truth.
      const githubApi='https://api.github.com/repos/RelaxSweety/Torn-Scripts/contents/torn-utilities/modules.json?ref=main&t='+Date.now();
      const currentVersion=next.modules.find(m=>m.id==='item-monitor')?.version;
      const cachedVersion=registry.modules.find(m=>m.id==='item-monitor')?.version;
      if(!currentVersion||currentVersion==='1.4.0'||(cachedVersion&&versionCompare(currentVersion,cachedVersion)<0)){
        try{
          const apiResponse=await fetch(githubApi,{cache:'no-store',headers:{Accept:'application/vnd.github.raw+json'}});
          if(apiResponse.ok){
            const data=await apiResponse.json();
            let parsed=data;
            if(data.content&&data.encoding==='base64')parsed=JSON.parse(atob(data.content.replace(/\\s/g,'')));
            const apiCatalog=validateRegistry(parsed);
            const apiVersion=apiCatalog.modules.find(m=>m.id==='item-monitor')?.version;
            if(apiVersion&&(!currentVersion||versionCompare(apiVersion,currentVersion)>0))next=apiCatalog;
          }
        }catch(err){console.warn('[TU] alternate catalog lookup failed',err)}
      }
      const prior=registry.modules.find(m=>m.id==='item-monitor')?.version;
      const incoming=next.modules.find(m=>m.id==='item-monitor')?.version;
      if(prior&&incoming&&versionCompare(incoming,prior)<0)throw Error('Stale catalog returned (Item Monitor '+incoming+' < '+prior+')');
      registry=next;localStorage.setItem(CACHE_KEY,JSON.stringify(next));
      registryStatus='GitHub catalog updated';registryUpdatedAt=Date.now();localStorage.setItem('tu:catalog:updated-at',String(registryUpdatedAt));
    }catch(e){registryStatus='Refresh failed: '+e.message;console.warn('[TU] catalog refresh failed',e);}
    registryRefreshing=false;render(currentTab);
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
  // Shared identity from the authenticated Torn PDA API key; no Torn screen scraping.
  const PLAYER_KEY='tu:manager:player:v2';
  const PDA_KEY='###PDA-APIKEY###';
  const USER_PUBLIC_KEY_STORAGE='tu:public-api-key:v1';
  const getPublicApiKey=()=>{const supplied=localStorage.getItem(USER_PUBLIC_KEY_STORAGE)||'';return supplied||(!PDA_KEY.includes('PDA-APIKEY')?PDA_KEY:'');};
  const validPlayerName=name=>{name=String(name||'').trim();return /^[a-zA-Z0-9_-]{2,32}$/.test(name)?name:null};
  let playerInfo=null,identityStatus='Waiting for PDA API',identityBusy=null;
  const getPlayer=()=>playerInfo?Object.freeze({...playerInfo}):null;
  const parseApiResponse=response=>{
    let data=response;
    if(typeof data==='object'&&data!==null&&('responseText' in data||'data' in data||'body' in data||'response' in data))
      data=data.responseText??data.data??data.body??data.response;
    if(typeof data==='string')data=JSON.parse(data);
    if(data?.error)throw Error('Torn API error '+(data.error.code??'')+': '+(data.error.error??'Unknown'));
    const id=data?.player_id??data?.id??data?.profile?.id;
    const name=validPlayerName(data?.name??data?.profile?.name);
    if(!/^\d+$/.test(String(id??''))||!name)throw Error('Player ID or name missing from API response');
    return {id:String(id),name,profileUrl:'https://www.torn.com/profiles.php?XID='+id,updatedAt:Date.now()};
  };
  async function updatePlayer(){
    if(identityBusy)return identityBusy;
    identityBusy=(async()=>{
      try{
        const key=getPublicApiKey();if(!key)throw Error('Public API key not configured; open TU Info to configure it');
        const url='https://api.torn.com/user/?selections=basic&key='+encodeURIComponent(key);
        let response;
        if(typeof PDA_httpGet==='function')response=await PDA_httpGet(url);
        else {const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);response=await r.text();}
        const next=parseApiResponse(response);
        playerInfo=next;
        try{localStorage.setItem(PLAYER_KEY,JSON.stringify(next));}catch(_){}
        identityStatus='Verified by Torn API';
        window.dispatchEvent(new CustomEvent('tu-player-updated',{detail:{...next}}));
        return true;
      }catch(e){
        identityStatus='API identity unavailable: '+e.message;
        console.warn('[TU] identity request failed',e.message);
        // Cache is intentionally not used as verified identity for a possibly different account.
        return false;
      }finally{identityBusy=null;}
    })();
    return identityBusy;
  }
  const openProfileHelp=()=>{
    if(playerInfo)return;
    alert('TU could not identify your player through the PDA API. Confirm your PDA API key is configured, reload Torn in PDA, then reopen TU. '+identityStatus);
    updatePlayer();
  };
  if(hasAgreement())updatePlayer();
  window.addEventListener('focus',()=>{if(hasAgreement()&&!playerInfo)updatePlayer();});
  const api = Object.freeze({
    storage,
    getPlayer,
    refreshPlayer:()=>hasAgreement()?updatePlayer():Promise.resolve(false),
    requestPlayerProfile:()=>hasAgreement()?openProfileHelp():showAgreement(),
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
    if(!hasAgreement()){showAgreement();return false;}
    const mod=registered.get(id);
    if (!mod || saved.disabled?.[id]) return false;
    stopModule();
    moduleHost.hidden=false;
    try {
      active=id;
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
  const tuNav={history:[],current:'tu-pda-panel',minimized:true,exited:true};
  const tuRoots=['tu-pda-panel','tuim-panel','tuim-catalog','tuim-travel-window','tuim-data-window','tuac-panel','tca-panel','tca-playbar','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tu-diagnostics-window'];
  const tuRoot=id=>document.getElementById(id);
  const tuHideAll=()=>tuRoots.forEach(id=>{const el=tuRoot(id);if(el){el.hidden=true;if(id==='tpfg-root')el.style.display='none';}});
  const tuShow=id=>{if(!hasAgreement()&&id!=='tu-pda-panel'){id='tu-pda-panel';render('about');showAgreement();}const el=tuRoot(id);if(!el)return false;tuHideAll();el.hidden=false;if(id==='tpfg-root')el.style.display='block';tuNav.current=id;tuNav.minimized=false;tuNav.exited=false;return true;};
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
    if(!hasAgreement()){tuNav.current='tu-pda-panel';tuNav.history.length=0;render('about');showAgreement();return tuShow('tu-pda-panel');}
    if(tuNav.exited){tuNav.history.length=0;tuNav.current='tu-pda-panel';render(hasAgreement()?'modules':'about');if(!hasAgreement())showAgreement();}
    let id=tuNav.current;
    if(!tuRoot(id)&&active){id=({'item-monitor':'tuim-panel','flight-game':'tpfg-root','stick-fighter':'sff-root'}[active]||id);}
    return tuShow(tuRoot(id)?id:'tu-pda-panel');
  };
  window.TUWindowNavigation=Object.freeze({open:tuOpen,back:tuBack,minimize:tuMinimize,exit:tuExit,restore:tuRestore});
  const style = document.createElement('style');
  style.textContent = `
#tu-pda-panel .tu-refresh-icon{display:inline-block}#tu-pda-panel .tu-spinning{animation:tu-refresh-spin .8s linear infinite}@keyframes tu-refresh-spin{to{transform:rotate(360deg)}}
#tu-pda-launcher{position:fixed;left:12px;top:38%;z-index:2147483645;touch-action:none;width:43px;height:43px;border-radius:50%;border:2px solid #e3bb57;background:radial-gradient(circle at 35% 25%,#293b45,#07090b 70%);color:#f5d87e;box-shadow:0 2px 9px #000b,inset 0 0 4px #f5d87e66;font:bold italic 23px 'Palatino Linotype','Book Antiqua',Georgia,serif;letter-spacing:-2px;padding:0 2px 0 0;display:flex;align-items:center;justify-content:center;line-height:1;cursor:grab;user-select:none;-webkit-user-select:none}
#tu-pda-launcher:active{cursor:grabbing}
#tu-pda-launcher[hidden]{display:none!important}
#tu-pda-panel{position:fixed;z-index:2147483644;inset:8% 3% auto 3%;max-width:440px;margin:auto;max-height:82vh;overflow:auto;background:#101417;color:#eee;border:1px solid #c49a46;border-radius:18px;box-shadow:0 10px 35px #000d;font:14px system-ui,Arial,sans-serif}
#tu-pda-panel[hidden]{display:none}
#tu-pda-panel *{box-sizing:border-box}
#tu-pda-panel header{display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid #4a3c21;position:sticky;top:0;z-index:100;background:#101417}
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
  panel.innerHTML = '<header><span class="tu-logo">TU</span><div><h2>Torn Utilities</h2><p>Modular Tools for Torn City</p></div><button class="tu-close" aria-label="Close">×</button></header><nav><button data-tab="modules" aria-selected="true">Modules</button><button data-tab="settings">Settings</button><button data-tab="about">About</button></nav><div class="tu-content"></div><footer style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>Torn Utilities v0.4.65-dev (PDA)</span><span id="tu-catalog-updated" style="text-align:right"></span></footer>';
  document.body.appendChild(panel);
  const identityLine=document.createElement('p');
  identityLine.className='tu-player-identity';
  identityLine.style.cssText='margin:3px 0 0;font-size:12px;color:#e4c779;overflow-wrap:anywhere';
  panel.querySelector('header h2').parentElement.appendChild(identityLine);
  const refreshIdentity=()=>{
    const player=window.TornUtilities?.getPlayer?.();
    identityLine.textContent=player?.name&&player?.id?player.name+' ['+player.id+']':'Player not identified';
  };
  refreshIdentity();
  window.addEventListener('tu-player-updated',refreshIdentity);
  const content = panel.querySelector('.tu-content');
  function makeButton(label,handler,disabled=false) {
    const btn=document.createElement('button');btn.type='button';btn.textContent=label;
    btn.disabled=disabled;
    btn.style.cssText='margin-left:auto;padding:8px 10px;border-radius:8px;border:0;background:#dfb952;color:#111;white-space:nowrap;font-weight:600;'+(disabled?'opacity:.5;':'');
    if(handler)btn.addEventListener('click',handler);
    return btn;
  }
  let viewCategory=null,viewModule=null,settingsPage=null,diagnosticModule=null;
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
  function showAgreement(){
    panel.hidden=false;
    render('about');
    const existing=document.getElementById('tu-agreement-overlay');if(existing){existing.hidden=false;existing.style.display='flex';return;}
    const overlay=document.createElement('div');overlay.id='tu-agreement-overlay';
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000d;display:flex;align-items:center;justify-content:center;padding:14px';
    const dialog=document.createElement('section');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','TU Terms and Information Use Agreement');
    dialog.style.cssText='width:min(96vw,590px);max-height:90dvh;display:flex;flex-direction:column;overflow:hidden;background:#172026;color:#eee;border:2px solid #cba953;border-radius:12px;padding:18px;font:14px/1.5 system-ui';
    const heading=document.createElement('h2');heading.textContent='TU Terms and Information Use Agreement';dialog.append(heading);
    const note=document.createElement('p');note.textContent='Review the agreement below. Acceptance requires confirmation from the TU server using a 16-character Public Only Torn API key. You may minimize this window to retrieve your key.';dialog.append(note);
    appendTerms(dialog);
    const keyLabel=document.createElement('label');keyLabel.textContent='Torn public API key (required if PDA has not provided one)';keyLabel.style.cssText='display:block;margin:12px 0';const keyInput=document.createElement('input');keyInput.type='password';keyInput.autocomplete='off';keyInput.placeholder='Enter a Public Only Torn API key';keyInput.style.cssText='display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:6px';keyLabel.append(keyInput);
    const keyControls=document.createElement('div');keyControls.style.cssText='display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap';
    const reveal=makeButton('Show API Key',()=>{keyInput.type=keyInput.type==='password'?'text':'password';reveal.textContent=keyInput.type==='password'?'Show API Key':'Hide API Key';});
    // New agreement entry is deliberately blank; saved keys are managed in About.
    keyInput.value='';
    const clear=makeButton('Clear Entry',()=>{keyInput.value='';keyInput.type='password';reveal.textContent='Show API Key';});
    keyControls.append(reveal,clear);keyLabel.append(keyControls);dialog.append(keyLabel);
    const keyNote=document.createElement('small');keyNote.textContent='An entered key is stored on this device to enable TU identity requests. Prefer configuring your public key in PDA settings. Never enter a full-access key.';dialog.append(keyNote);
    const confirmLabel=document.createElement('label');confirmLabel.style.cssText='display:flex;gap:10px;align-items:flex-start;margin:15px 0';const check=document.createElement('input');check.type='checkbox';confirmLabel.append(check,document.createTextNode('I have reviewed and agree to the Terms of Use and Information Use Agreement.'));dialog.append(confirmLabel);
    const agreementStatus=document.createElement('p');agreementStatus.setAttribute('role','status');agreementStatus.setAttribute('aria-live','polite');agreementStatus.style.cssText='margin:12px 0;color:#e7d29a;font-size:13px';dialog.append(agreementStatus);const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap';
    const decline=makeButton('Decline / Info only',()=>{overlay.remove();render('about');});const accept=makeButton('I Agree — Continue',async()=>{if(!check.checked)return;try{await loadPublishedAgreement(true)}catch(error){agreementStatus.textContent='Cannot accept: '+error.message;return;}const entered=keyInput.value.trim();const key=entered||getPublicApiKey();if(!/^[a-zA-Z0-9]{16}$/.test(key))return alert('A valid 16-character Public Only Torn API key is required.');accept.disabled=true;agreementStatus.textContent='Confirming agreement with development server…';try{await devAccept(key,'pda');if(entered)localStorage.setItem(USER_PUBLIC_KEY_STORAGE,entered);keyInput.value='';keyInput.type='password';localStorage.setItem(TU_TERMS_KEY,TU_TERMS_VERSION());localStorage.setItem('tu:agreement:verified-key:v1',localStorage.getItem(USER_PUBLIC_KEY_STORAGE)||key);agreementStatus.textContent='Agreement accepted and confirmed by development server.';overlay.remove();updatePlayer();render('modules');}catch(error){agreementStatus.textContent='Agreement not confirmed: '+error.message;alert('Agreement not recorded: '+error.message+'\nCheck your API key and network connection, then retry.');}finally{accept.disabled=!check.checked;}});accept.disabled=true;check.addEventListener('change',()=>{accept.disabled=!check.checked});actions.append(decline,accept);dialog.append(actions);
    const scrollArea=document.createElement('div');
    scrollArea.style.cssText='flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 2px 12px';
    while(dialog.firstChild)scrollArea.append(dialog.firstChild);
    const footer=document.createElement('div');footer.style.cssText='flex:0 0 auto;border-top:1px solid #6e603d;padding-top:10px;background:#172026';
    footer.append(agreementStatus,actions);
    dialog.append(scrollArea,footer);
    overlay.append(dialog);document.body.append(overlay);
    // Minimize the consent dialog without accepting; the user may visit Torn to retrieve an API key.
    const minimizeAgreement=()=>{overlay.hidden=true;overlay.style.display='none';panel.hidden=true;launcher.hidden=false;};
    const agreementBar=document.createElement('div');agreementBar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;flex:0 0 auto;border-bottom:1px solid #6e603d;background:#172026;z-index:2;padding:6px 0 10px';
    const agreementTitle=document.createElement('strong');agreementTitle.textContent='TU Agreement';
    const minimizeButton=makeButton('− Minimize',minimizeAgreement);minimizeButton.setAttribute('aria-label','Minimize agreement to retrieve Torn API key');
    agreementBar.append(agreementTitle,minimizeButton);dialog.prepend(agreementBar);

  }
  function appendTerms(target){
    const version=document.createElement('small');
    version.textContent='Agreement version '+TU_TERMS_VERSION();
    target.append(version);
    const body=document.createElement('div');
    body.style.cssText='margin-top:10px;line-height:1.55;overflow-wrap:anywhere';
    target.append(body);
    const renderMarkdown=source=>{
      body.replaceChildren();
      const lines=String(source||'').split(/\r?\n/);
      let paragraph=[];
      const flush=()=>{if(!paragraph.length)return;const p=document.createElement('p');p.textContent=paragraph.join(' ');p.style.margin='8px 0 12px';body.append(p);paragraph=[]};
      for(const line of lines){
        const heading=/^(#{1,6})\s+(.+)$/.exec(line);
        const bullet=/^\s*[-*]\s+(.+)$/.exec(line);
        if(heading){flush();const h=document.createElement(heading[1].length<=2?'h3':'h4');h.textContent=heading[2];h.style.cssText='color:#f1ce72;margin:16px 0 7px;font-size:'+(heading[1].length<=2?'17px':'15px');body.append(h)}
        else if(bullet){flush();const p=document.createElement('p');p.textContent='• '+bullet[1];p.style.margin='3px 0 3px 12px';body.append(p)}
        else if(!line.trim()){flush()}
        else paragraph.push(line.trim());
      }
      flush();
    };
    renderMarkdown(currentAgreementText||'Loading current agreement from server…');
    loadPublishedAgreement().then(()=>{version.textContent='Agreement version '+TU_TERMS_VERSION();renderMarkdown(currentAgreementText)}).catch(error=>{renderMarkdown('Unable to load agreement: '+error.message)});
  }
  // Script update check is informational: PDA manages installed script replacement.
  const tuScriptPath='torn-utilities/core/pda/torn-utilities.user.js';
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
    if(!hasAgreement()&&tab!=='about')tab='about';
    if(tab!=='settings')settingsPage=null;
    currentTab=tab;
    const catalogFooter=panel.querySelector('#tu-catalog-updated');if(catalogFooter)catalogFooter.textContent='Catalog: '+(registryUpdatedAt?new Date(registryUpdatedAt).toLocaleString():'Not refreshed')+(registryStatus.startsWith('Refresh failed')?' · Failed':'');
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
        content.append(makeButton('Module diagnostics',()=>{diagnosticModule=m.id;settingsPage='diagnostics';render('settings')}));
        content.append(makeButton('PDA installation instructions',showInstallationInstructions));
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
        const heading=document.createElement('h3');heading.textContent='Settings';content.append(heading);
        for(const [id,title,description] of [
          ['time','Time Display','Local time or Torn City Time (TCT)'],
          ['storage','Storage & Backups','Export, restore, or clear module data'],
          ['diagnostics','Diagnostics','Manager and module diagnostic information']
        ]){
          const card=document.createElement('div');card.className='tu-card';
          const body=document.createElement('div');body.style.flex='1';
          const label=document.createElement('strong');label.textContent=title;
          const detail=document.createElement('small');detail.textContent=description;body.append(label,detail);
          card.append(body,makeButton('Open →',()=>{settingsPage=id;render('settings')}));content.append(card);
        }
        return;
      }
      const back=makeButton('← Settings',()=>{settingsPage=null;diagnosticModule=null;render('settings')});back.style.margin='0 0 12px';content.append(back);
      const section=document.createElement('h3');section.textContent=({time:'Time Display',storage:'Storage & Backups',diagnostics:'Diagnostics'})[settingsPage];content.append(section);
      if(settingsPage==='diagnostics'){
        if(diagnosticModule){const h=document.createElement('h4');h.textContent='Module: '+(registry.modules.find(m=>m.id===diagnosticModule)?.name||diagnosticModule);content.append(h);}
        const report=()=>{
          const result={managerVersion:TU_VERSION,agreementVersion:hasAgreement()?TU_TERMS_VERSION():'not accepted',catalogStatus:registryStatus,catalogUpdatedAt:registryUpdatedAt,registeredModules:[...registered].map(([id,mod])=>({id,version:mod.version})),activeModule:active,playerIdentityStatus:identityStatus,storageNamespaces:storage.namespaces().map(id=>({namespace:id,keys:storage.keys(id).length})),timeDisplay:localStorage.getItem('tu-time-display')==='tct'?'tct':'local',timestamp:new Date().toISOString()};
          if(diagnosticModule){const m=registry.modules.find(x=>x.id===diagnosticModule),loaded=registered.get(diagnosticModule);return JSON.stringify({timestamp:result.timestamp,moduleId:diagnosticModule,catalogVersion:m?.version||null,installedVersion:loaded?.version||null,registered:!!loaded,enabled:!saved.disabled?.[diagnosticModule],active:active===diagnosticModule,managerVersion:TU_VERSION},null,2)}
          return JSON.stringify(result,null,2);
        };
        const output=document.createElement('textarea');output.readOnly=true;output.value=report();output.style.cssText='width:100%;height:300px;box-sizing:border-box;background:#10171b;color:#eee;border:1px solid #806a3e;border-radius:8px;padding:10px';content.append(output);
        const securityStatus=document.createElement('p');securityStatus.setAttribute('role','status');securityStatus.style.cssText='white-space:pre-wrap;font-size:12px';content.append(securityStatus);
        content.append(makeButton('Test Development Authorization',async()=>{
          const key=getPublicApiKey();
          if(!/^[A-Za-z0-9]{16}$/.test(key)){securityStatus.textContent='No saved Public Only key available. Test not started.';return;}
          securityStatus.textContent='Running isolated authorization checks…';
          let temporaryToken='';
          try{
            const registration=await devRequest('/api/auth/register','POST',{api_key:key,platform:'pda'},'');
            temporaryToken=registration.token;
            if(!temporaryToken)throw Error('Temporary registration returned no token');
            const current=await devRequest('/api/auth/agreement','GET',null,temporaryToken);
            if(!current.accepted)throw Error('Current agreement not accepted');
            const moduleId='item-monitor';
            let permission;
            try{
              const result=await devRequest('/api/auth/module-access?module_id='+encodeURIComponent(moduleId),'GET',null,temporaryToken);
              permission=result.allowed===true?'ALLOWED':'DENIED';
            }catch(error){
              permission=/permission not granted|HTTP 403|not authorized|Account not active/i.test(error.message)?'DENIED (expected policy)':'ERROR: '+error.message;
            }
            if(permission.startsWith('ERROR'))throw Error(permission);
            await devRequest('/api/auth/logout','POST',{},temporaryToken);
            let rejected=false,revocationDetail='No rejection received';
            try{const result=await devRequest('/api/auth/me','GET',null,temporaryToken);revocationDetail='Unexpected successful response: '+JSON.stringify(result).slice(0,200)}
            catch(error){revocationDetail=error.message;rejected=/Unauthorized|HTTP 401/i.test(error.message)}
            securityStatus.textContent='Agreement: accepted\\nModule '+moduleId+': '+permission+'\\nRevoked token rejected: '+(rejected?'PASS':'NOT CONFIRMED')+'\\nRevocation response: '+revocationDetail+'\\nCurrent Manager session unchanged.';
          }catch(error){
            securityStatus.textContent='Test incomplete: '+error.message+'\\nCurrent Manager session unchanged.';
          }finally{
            // Never persist the temporary token. Best-effort cleanup if a test failed early.
            if(temporaryToken)try{await devRequest('/api/auth/logout','POST',{},temporaryToken)}catch(_){}
          }
        }));
        const revokeTest=makeButton('Test Agreement Cancellation Revocation',async()=>{
          if(!confirm('This test cancels your current agreement and revokes your sessions. You will need to accept the agreement again. Continue?'))return;
          revokeTest.disabled=true;
          const requestId=crypto.randomUUID();
          let stage='session verification',cancellation='NOT SENT',verification='NOT RUN';
          const show=(message)=>{securityStatus.textContent='Stage: '+stage+'\nCancellation: '+cancellation+'\nRevoked-token check: '+verification+'\nRequest ID: '+requestId+'\n'+message};
          const isUnauthorized=(error)=>/Unauthorized|HTTP 401/i.test(String(error?.message||''));
          const isTransportFailure=(error)=>/invalid server response|returned no response|Failed to fetch|network error|timed out|timeout/i.test(String(error?.message||''));
          const resetLocal=()=>{
            sessionStorage.removeItem(DEV_SESSION_KEY);
            localStorage.removeItem(USER_PUBLIC_KEY_STORAGE);
            localStorage.removeItem('tu:agreement:verified-key:v1');
            localStorage.removeItem(TU_TERMS_KEY);
            playerInfo=null;
            tuNav.history.length=0;
            tuNav.current='tu-pda-panel';
            tuNav.exited=true;
            stopModule();
          };
          try{
            // Keep the original bearer in memory; do not use restoreDevSession(), which can
            // create a different token and masks failures in the initial verification step.
            const token=devToken();
            if(!token){show('INCOMPLETE: No current session token. Reopen TU Manager and authenticate before testing.');return}
            show('Verifying the existing bearer with the protected endpoint…');
            const initial=await devProbeAuthStatus(token);
            if(initial.status!==200){show('INCONCLUSIVE: Initial authorization status '+(initial.status??'unavailable')+' via '+initial.transport+'. '+(initial.detail||''));return}
            stage='agreement cancellation';
            show('Submitting cancellation once (no automatic POST retry)…');
            try{
              await devRequest('/api/auth/agreement','POST',{action:'cancelled',request_id:requestId},token);
              cancellation='CONFIRMED';
            }catch(error){
              cancellation=isTransportFailure(error)?'UNKNOWN — response unavailable':'NOT CONFIRMED';
              show('INCONCLUSIVE: Cancellation response was not confirmed: '+error.message+'\nDo not repeat the cancellation test until the request ID has been checked against backend agreement events.');
              return;
            }
            // Only a confirmed cancellation allows clearing credentials.
            resetLocal();
            stage='revoked-token verification';
            show('Checking the same token after cancellation…');
            const probe=await devProbeAuthStatus(token);
            verification=probe.status===401?'PASS — HTTP 401 via '+probe.transport:probe.status===200?'FAIL — HTTP 200 via '+probe.transport:probe.status===null?'INCONCLUSIVE — HTTP status unavailable ('+probe.detail+')':'INCONCLUSIVE — HTTP '+probe.status+' via '+probe.transport;
            show('Cancellation confirmed; local TU credentials cleared. Reaccept the agreement to continue.');
            alert(securityStatus.textContent);
            showAgreement();
          }finally{revokeTest.disabled=false}
        });
        revokeTest.style.margin='10px 0';
        content.append(revokeTest);
        const sessionsHeading=document.createElement('h4');sessionsHeading.textContent='Development Sessions';content.append(sessionsHeading);
        const sessionsBox=document.createElement('div');sessionsBox.style.cssText='display:grid;gap:8px;margin:8px 0 16px';content.append(sessionsBox);
        const loadSessions=async()=>{
          sessionsBox.textContent='Loading sessions…';
          try{
            const token=await restoreDevSession();
            const response=await devRequest('/api/auth/sessions','GET',null,token);
            sessionsBox.textContent='';
            for(const item of response.sessions||[]){
              const entry=document.createElement('div');entry.style.cssText='border:1px solid #806a3e;padding:8px;border-radius:6px';
              const active=!item.revoked_at&&item.expires_at>Math.floor(Date.now()/1000);
              const date=new Date(item.created_at*1000).toLocaleString();
              const label=document.createElement('div');label.textContent=item.platform.toUpperCase()+' · '+date+' · '+(item.current?'This session':active?'Active':item.revoked_at?'Revoked':'Expired');entry.append(label);
              if(active&&!item.current){
                const revoke=makeButton('Revoke session',async()=>{
                  if(!confirm('Revoke this session? Other devices using it will need to sign in again.'))return;
                  try{await devRequest('/api/auth/sessions/revoke','POST',{session_id:item.id},await restoreDevSession());await loadSessions()}
                  catch(error){alert('Session revocation failed: '+error.message)}
                });entry.append(revoke);
              }
              sessionsBox.append(entry);
            }
            if(!response.sessions?.length)sessionsBox.textContent='No sessions found.';
          }catch(error){sessionsBox.textContent='Session list unavailable: '+error.message}
        };
        content.append(makeButton('Load Development Sessions',loadSessions));
        content.append(makeButton('Refresh diagnostics',()=>{output.value=report()}));
        content.append(makeButton('Copy diagnostics',()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(output.value).catch(()=>alert('Clipboard unavailable'));else{output.select();document.execCommand('copy')}}));
        return;
      }
      if(settingsPage==='time'){
      const timeHeading=document.createElement('strong');timeHeading.textContent='Time Display';content.append(timeHeading);
      const timeDescription=document.createElement('p');timeDescription.textContent='Choose one timezone for TU travel estimates and observation timestamps.';content.append(timeDescription);
      const timeSelect=document.createElement('select');timeSelect.setAttribute('aria-label','TU time display');timeSelect.style.cssText='width:100%;padding:9px;margin:8px 0 18px';
      for(const [value,label] of [['local','Local Time (device)'],['tct','Torn City Time (TCT / UTC)']]){const option=document.createElement('option');option.value=value;option.textContent=label;timeSelect.append(option)}
      timeSelect.value=localStorage.getItem('tu-time-display')==='tct'?'tct':'local';
      timeSelect.addEventListener('change',()=>{localStorage.setItem('tu-time-display',timeSelect.value);pageWindow.dispatchEvent(new CustomEvent('tu-time-display-changed',{detail:{mode:timeSelect.value}}))});content.append(timeSelect);
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
      const p=document.createElement('p');p.textContent='Torn Utilities v'+TU_VERSION+' by RelaxSweety [4539436]. Drag TU to reposition. Modules are installed separately in Torn PDA Scripts.';content.append(p);
      {
        const apiSection=document.createElement('section');apiSection.style.cssText='border:1px solid #806a3e;border-radius:8px;padding:12px;margin:12px 0';
        const title=document.createElement('h3');title.textContent='Public Only Torn API Key';apiSection.append(title);
        const note=document.createElement('p');note.textContent='Manage the key stored by TU on this device. A key supplied by Torn PDA itself is managed in PDA settings.';apiSection.append(note);
        const field=document.createElement('input');field.type='password';field.autocomplete='off';field.spellcheck=false;field.value=localStorage.getItem(USER_PUBLIC_KEY_STORAGE)||'';field.placeholder='Enter a new Public Only API key';field.style.cssText='width:100%;box-sizing:border-box;padding:10px';apiSection.append(field);
        const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
        const view=makeButton('Show API Key',()=>{field.type=field.type==='password'?'text':'password';view.textContent=field.type==='password'?'Show API Key':'Hide API Key';});
        const save=makeButton('Save / Update',()=>{const key=field.value.trim();if(!/^[A-Za-z0-9]{16}$/.test(key))return alert('Enter a valid 16-character Public Only API key.');localStorage.setItem(USER_PUBLIC_KEY_STORAGE,key);localStorage.removeItem('tu:agreement:verified-key:v1');localStorage.removeItem(TU_TERMS_KEY);field.value='';field.type='password';view.textContent='Show API Key';playerInfo=null;updatePlayer();alert('API key saved. Verify your key and accept the agreement again.');showAgreement();});
        const del=makeButton('Delete Saved API Key',async()=>{if(!localStorage.getItem(USER_PUBLIC_KEY_STORAGE))return alert('No TU-saved key to delete.');if(!confirm('Delete the API key saved by TU on this device? This will not delete a key configured separately in Torn PDA.'))return;try{await devCancel();}catch(error){alert('Cancellation not confirmed; API key retained: '+error.message);return;}localStorage.removeItem(USER_PUBLIC_KEY_STORAGE);localStorage.removeItem('tu:agreement:verified-key:v1');localStorage.removeItem(TU_TERMS_KEY);field.value='';field.type='password';view.textContent='Show API Key';playerInfo=null;tuNav.history.length=0;tuNav.current='tu-pda-panel';tuNav.exited=true;stopModule();render('about');showAgreement();});
        buttons.append(view,save,del);apiSection.append(buttons);content.append(apiSection);
      }
      const termsHeading=document.createElement('h3');termsHeading.textContent='Terms of Use and Information Use Agreement';content.append(termsHeading);appendTerms(content);if(!hasAgreement())content.append(makeButton('Review and Accept Terms',showAgreement));
      const guideLink=document.createElement('a');guideLink.href='https://github.com/RelaxSweety/Torn-Scripts/blob/main/torn-utilities/INSTALLATION.md';guideLink.target='_blank';guideLink.rel='noopener noreferrer';guideLink.textContent='TU Installation & Module Setup Guide ↗';guideLink.style.cssText='display:block;margin:12px 0;padding:12px;border:1px solid #806a3e;border-radius:8px;color:#e4c779;text-decoration:underline;font-weight:600';content.append(guideLink);
      // Official-style vector marks; no remote image dependencies.
      addSocialIcon('RelaxSweety on Discord','https://discord.com/users/relaxsweety','M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.1 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.075.075 0 0 0-.041-.104 13.1 13.1 0 0 1-1.872-.89.076.076 0 0 1-.008-.127c.126-.095.252-.193.372-.292a.074.074 0 0 1 .077-.01c3.929 1.793 8.185 1.793 12.068 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.292a.076.076 0 0 1-.007.127c-.598.35-1.224.65-1.873.89a.076.076 0 0 0-.04.105c.36.698.77 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.83 19.83 0 0 0 6.003-3.03.077.077 0 0 0 .031-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.211 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z');
      const tornLink=document.createElement('a');tornLink.href='https://www.torn.com/profiles.php?XID=4539436';tornLink.target='_blank';tornLink.rel='noopener noreferrer';tornLink.title='RelaxSweety on Torn';tornLink.setAttribute('aria-label','RelaxSweety on Torn');
      tornLink.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:50px;height:48px;margin:12px 14px 4px 0;background:#252a2e;border:1px solid #806a3e;border-radius:12px';
      const tornLogo=document.createElement('img');tornLogo.src='https://www.torn.com/favicon.ico';tornLogo.alt='Torn';tornLogo.width=30;tornLogo.height=30;tornLink.append(tornLogo);content.append(tornLink);
    }
  }
  loadPublishedAgreement(true).then(()=>{render(hasAgreement()?'modules':'about');if(!hasAgreement())showAgreement();return restoreDevSession().catch(()=>{})}).catch(()=>{render('about');showAgreement()});
  render(hasAgreement()?'modules':'about');
  refreshRegistry();
  // Do not interrupt first-run API requests with an immediate alert.
  window.addEventListener('torn-utilities-ready',()=>render(currentTab));
  // A module script can be installed separately, but remains inert until Open is pressed.

  const isVisible=id=>{
    const el=document.getElementById(id);
    return !!el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  };
  const syncLauncher=()=>{
    const moduleVisible=!!active&&(['tuim-panel','tuim-catalog','tpfg-root','tpfg-manager','tpfg-prompt','sff-root','tca-panel','tca-playbar','tuac-panel'].some(isVisible)||[...moduleHost.children].some(el=>isVisible(el.id)||(!el.hidden&&el.getClientRects().length>0)));
    const hide=tuNav.minimized||tuNav.exited?false:(!panel.hidden||moduleVisible);
    if(launcher.hidden!==hide)launcher.hidden=hide;
  };
  const closePanel = () => { tuMinimize(); syncLauncher(); };
  const togglePanel=()=>{if(tuNav.minimized||tuNav.exited)tuRestore();else tuMinimize();syncLauncher();};
  const navHeader=panel.querySelector('header');
  for(const [label,title,fn] of [['←','Back',tuBack],['−','Minimize',tuMinimize]]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
    b.addEventListener('click',e=>{e.stopPropagation();fn();syncLauncher();});navHeader.prepend(b);
  }
  panel.querySelector('.tu-close').title='Exit';
  panel.querySelector('.tu-close').setAttribute('aria-label','Exit');
  panel.querySelector('.tu-close').addEventListener('click',()=>{tuExit();syncLauncher();});
  panel.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {if(!hasAgreement()&&b.dataset.tab!=='about'){showAgreement();return;}render(b.dataset.tab);}));
  // Shared floating-window support for TU module panels.
  const floatIds=['tuim-panel','tuim-catalog','tuim-travel-window','tuim-data-window','tuac-panel','tca-panel','tu-pda-panel','sff-root','tpfg-manager','tpfg-root','tpfg-prompt','tu-diagnostics-window'];
  const floatingSetup=new WeakSet();
  const setupFloating=el=>{
    if(!el||floatingSetup.has(el))return;
    if(el.id==='tpfg-root')return;
    floatingSetup.add(el);
    el.style.boxSizing='border-box';
    el.style.maxWidth='calc(100vw - 12px)';
    el.style.maxHeight='calc(100dvh - 12px)';
    el.style.overflow='auto';
    el.style.resize='both';
    el.style.minWidth='220px';
    el.style.minHeight='120px';
    el.style.overflowWrap='anywhere';
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
    const end=e=>{if(drag?.id===e.pointerId)drag=null};
    bar.addEventListener('pointerup',end);bar.addEventListener('pointercancel',end);
  };
  // Apply a consistent TU window treatment to game panels without changing gameplay DOM.
  const gameTitles={'flight-game':'Flight Game','stick-fighter':'Stick Fighter','torn-snake':'Slithering Streets','tic-tac-toe':'Tic-Tac-Toe','torn-four':'Torn Four','torn-fleet':'Torn Fleet','chaos-marbles':'Chaos Marbles'};
  const gameWindowSetup=new WeakSet();
  const enhanceGameWindows=()=>{
    if(!active||!gameTitles[active])return;
    const gamePanels=[...moduleHost.children].filter(el=>el.getClientRects().length&&el.querySelector('button'));
    for(const el of gamePanels){
      if(gameWindowSetup.has(el))continue;
      gameWindowSetup.add(el);
      el.style.boxSizing='border-box';
      el.style.maxWidth='calc(100vw - 12px)';
      el.style.maxHeight='calc(100dvh - 12px)';
      el.style.overflow='auto';
      el.style.resize='both';
      el.style.borderRadius='12px';
      el.style.borderColor='#a88a49';
      // Existing game controls stay intact; diagnostics are a separate Manager page.
      const bar=el.querySelector('header,.tu-header,[style*="sticky"]')||el.firstElementChild;
      if(bar&&bar!==el){bar.style.position='sticky';bar.style.top='0';bar.style.zIndex='20';bar.style.background=bar.style.background||'#20252e';}
    }
  };
  const tuEnhanceHeaders=()=>{
    for(const id of floatIds){if(id==='tu-pda-panel')continue;
      const el=tuRoot(id);if(!el||el.dataset.tuModuleNav==='1')continue;
      const bar=el.querySelector('header,.tu-header,.tuim-header,.tuim-travel-header,.tuac-header');if(!bar)continue;
      el.dataset.tuNavHeader='1';for(const oldButton of [...bar.querySelectorAll('button')]){if(['−','—','×'].includes(oldButton.textContent.trim())&&!oldButton.closest('[data-tu-nav-controls]'))oldButton.style.display='none';}
      if(bar.querySelector('[data-tu-nav-controls]'))continue;bar.style.position='sticky';bar.style.top='0';bar.style.zIndex='100';bar.style.background='#101417';
      const controls=document.createElement('span');controls.dataset.tuNavControls='1';controls.style.cssText='margin-left:auto;display:flex;gap:5px';
      for(const [label,title,fn] of [['←','Back',tuBack],['−','Minimize',tuMinimize],['×','Exit',tuExit]]){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
        b.style.cssText='padding:4px 9px;background:#252a2e;color:#f1ce72;border:1px solid #806a3e;border-radius:5px';
        b.addEventListener('click',e=>{e.stopPropagation();fn();syncLauncher();});controls.append(b);
      }bar.append(controls);
    }
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
  const enhanceFloating=()=>{floatIds.forEach(id=>setupFloating(document.getElementById(id)));enhanceGameWindows();tuEnhanceHeaders();};
  enhanceFloating();
  const floatingObserver=new MutationObserver(()=>{enhanceFloating();tuReconcileWindows();});
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
