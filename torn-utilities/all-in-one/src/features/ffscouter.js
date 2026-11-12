// Per-viewer, read-only FFScouter access. Keys remain inside the Manager closure.
export function createFFScouter({window,getCredentials,isAuthorized,request,now=()=>Date.now(),ttl=600000}){
 const CONSENT='tu:who:ffscouter:consent:v1';let current='',generation=0;const cache=new Map(),inflight=new Map();let retryAt=0,lastFailure='',confirmed=false;let premium=null,premiumUntil=0,flightRetryAt=0,flightFailure='';const flightCache=new Map(),flightJobs=new Map();let lastViewer=null;
 const fail=message=>Error(message);
 function credentials(){if(!isAuthorized())return null;const c=getCredentials();return c&&c.verified&&/^[A-Za-z0-9]{16}$/.test(c.key||'')&&/^[1-9][0-9]*$/.test(String(c.playerId))?{key:c.key,playerId:String(c.playerId)}:null;}
 async function scope(){
  const c=credentials();if(!c){reset();return null;}
  if(!window.crypto?.subtle)throw fail('Secure key identification is unavailable.');
  const bytes=new TextEncoder().encode('tu-ffscouter-v1:'+c.playerId+':'+c.key),digest=await window.crypto.subtle.digest('SHA-256',bytes),id=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const fresh=credentials();if(!fresh||fresh.key!==c.key||fresh.playerId!==c.playerId)throw fail('Selected user/key changed. Retry for the current account.');
  if(current!==id){reset({keepDisk:true});current=id;lastViewer=c.playerId;loadCache({...c,id});}return {...c,id,generation};
 }
 function enabled(c){try{const data=JSON.parse(window.localStorage.getItem(CONSENT)||'null');return data?.scope===c.id&&String(data.playerId)===c.playerId;}catch{return false;}}
 function reset({keepDisk=false}={}){if(!keepDisk&&lastViewer)try{window.sessionStorage?.removeItem('tu:who:ff-cache:v1:'+lastViewer);}catch{}generation++;current='';cache.clear();inflight.clear();retryAt=0;lastFailure='';confirmed=false;premium=null;premiumUntil=0;flightRetryAt=0;flightFailure='';flightCache.clear();flightJobs.clear();}
 async function state(){const c=await scope();return c?{available:true,enabled:enabled(c),scope:c.id,viewerId:c.playerId,confirmed,valid:true,lastFailure,retryAt}:{available:false,enabled:false,scope:null,viewerId:null,confirmed:false,valid:false,lastFailure:'',retryAt:0};}
 async function setEnabled(value){const c=await scope();if(!c)throw fail('Select and confirm your FFScouter key in War Organizer Settings.');if(value!==true){window.localStorage.removeItem(CONSENT);reset();return state();}window.localStorage.setItem(CONSENT,JSON.stringify({scope:c.id,playerId:c.playerId,acceptedAt:now()}));if(!enabled(c))throw fail('FFScouter consent could not be saved.');return state();}
 function number(value){if(!['number','string'].includes(typeof value)||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
 function loadCache(c){try{const stored=JSON.parse(window.sessionStorage?.getItem('tu:who:ff-cache:v1:'+c.playerId)||'null');if(stored?.scope!==c.id||!Number.isFinite(stored.savedAt)||stored.savedAt>now()+300000||!Array.isArray(stored.rows))return;for(const row of stored.rows.slice(0,1000)){if(!/^[1-9][0-9]{0,11}$/.test(String(row.playerId)))continue;const bs=number(row.bs),ff=number(row.ff);if(bs&&bs>1e24||ff&&ff>10000)continue;cache.set(String(row.playerId),{value:{playerId:String(row.playerId),bs,ff,lastUpdated:number(row.lastUpdated),stale:true},expires:0});}}catch{}}
 function saveCache(c){try{window.sessionStorage?.setItem('tu:who:ff-cache:v1:'+c.playerId,JSON.stringify({scope:c.id,savedAt:now(),rows:[...cache.values()].map(entry=>entry.value).filter(row=>row.bs||row.ff)}));}catch{}}
 async function peek(ids){const c=await scope();if(!c||!enabled(c))return {scope:c?.id||null,rows:[]};return {scope:c.id,rows:(Array.isArray(ids)?ids:[]).map(String).map(id=>cache.get(id)?.value).filter(Boolean).map(row=>({...row,stale:row.stale||cache.get(row.playerId)?.expires<=now()}))};}
 async function stats(ids){
  const c=await scope();if(!c||!enabled(c))throw fail('Enable FFScouter for your selected key in War Organizer Settings.');
  if(!Array.isArray(ids)||ids.length>1000||ids.some(id=>!/^[1-9][0-9]{0,11}$/.test(String(id))))throw fail('Invalid FFScouter target IDs.');
  const targets=[...new Set(ids.map(String))].sort((a,b)=>Number(a)-Number(b)),missing=targets.filter(id=>!cache.has(id)||cache.get(id).expires<=now());
  if(missing.length&&now()<retryAt)throw fail((lastFailure||'FFScouter is temporarily unavailable.')+' Retry in '+Math.ceil((retryAt-now())/1000)+' seconds.');
  for(let index=0;index<missing.length;index+=200){
   const batch=missing.slice(index,index+200),jobKey=c.id+':'+batch.join(',');let job=inflight.get(jobKey);
   if(!job){job=(async()=>{
    const fresh=await scope();if(!fresh||fresh.id!==c.id||fresh.generation!==c.generation||!enabled(fresh))throw fail('Selected user/key changed.');
    const url=new URL('https://ffscouter.com/api/v1/get-stats');url.searchParams.set('key',c.key);url.searchParams.set('targets',batch.join(','));
    let response;
    try{response=await request(url.href);}catch{if(current===c.id&&generation===c.generation){retryAt=now()+60000;confirmed=false;lastFailure='FFScouter network request failed.';}throw fail('FFScouter network request failed. Check your connection or PDA transport.');}
    const after=await scope();if(!after||after.id!==c.id||after.generation!==c.generation||!enabled(after))throw fail('Selected user/key changed; old estimates discarded.');
    if(response.status!==200){confirmed=false;retryAt=now()+(response.status===429?120000:60000);lastFailure=response.status===429?'FFScouter rate limit reached.':response.status===401?'FFScouter key is not registered or was rejected.':response.status===403?'FFScouter access denied.':'FFScouter rejected the request (HTTP '+Number(response.status)+').';throw fail(lastFailure);}
    let rows;try{if(typeof response.text!=='string'||response.text.length>1000000)throw Error();rows=JSON.parse(response.text);if(!Array.isArray(rows))throw Error();}catch{confirmed=false;retryAt=now()+60000;lastFailure='FFScouter returned an unsupported response.';throw fail(lastFailure);}
    const accepted=new Map();for(const row of rows){const id=String(row?.player_id);if(!batch.includes(id))continue;if(accepted.has(id)){confirmed=false;retryAt=now()+60000;lastFailure='FFScouter returned conflicting target results.';throw fail(lastFailure);}const bs=number(row.bs_estimate),ff=number(row.fair_fight),updated=number(row.last_updated);accepted.set(id,{playerId:id,bs:bs&&bs<=1e24?bs:null,ff:ff&&ff<=10000?ff:null,lastUpdated:updated&&updated<=now()/1000+300?updated:null});}
    confirmed=accepted.size>0;lastFailure=confirmed?'':'FFScouter returned no matching target results.';
    for(const id of batch){let value=accepted.get(id)||{playerId:id,bs:null,ff:null,lastUpdated:null};const previous=cache.get(id)?.value;if(previous&&(!value.bs&&previous.bs||!value.ff&&previous.ff))value={...value,bs:value.bs||previous.bs,ff:value.ff||previous.ff,lastUpdated:previous.lastUpdated||value.lastUpdated,stale:true};cache.set(id,{value,expires:now()+(value.bs||value.ff?ttl:120000)});}while(cache.size>1000){const old=[...cache.keys()].find(id=>!targets.includes(id));if(!old)break;cache.delete(old);}
   })();inflight.set(jobKey,job);job.finally(()=>{if(inflight.get(jobKey)===job)inflight.delete(jobKey);}).catch(()=>{});}
   await job;
  }
  const after=await scope();if(!after||after.id!==c.id||after.generation!==c.generation||!enabled(after))throw fail('Selected user/key changed; old estimates discarded.');
  saveCache(c);
  return {scope:c.id,viewerId:c.playerId,rows:targets.map(id=>({...cache.get(id).value}))};
 }

 async function flights(ids){
  const c=await scope();if(!c||!enabled(c))throw fail('Enable FFScouter for your selected key in War Organizer Settings.');
  if(!Array.isArray(ids)||ids.length>1000||ids.some(id=>!/^[1-9][0-9]{0,11}$/.test(String(id))))throw fail('Invalid FFScouter target IDs.');
  const targets=[...new Set(ids.map(String))].sort((a,b)=>Number(a)-Number(b));
  async function active(){const fresh=await scope();if(!fresh||fresh.id!==c.id||fresh.generation!==c.generation||!enabled(fresh))throw fail('Selected user/key changed; old flight data discarded.');}
  async function get(path,params={}){
   await active();const url=new URL('https://ffscouter.com/api/v1/'+path);url.searchParams.set('key',c.key);for(const [name,value] of Object.entries(params))url.searchParams.set(name,value);
   let r;try{r=await request(url.href);}catch{await active();flightFailure='FFScouter flight network request failed.';flightRetryAt=now()+60000;throw fail(flightFailure);}
   await active();
   if(r.status!==200){flightFailure=r.status===429?'FFScouter flight rate limit reached.':r.status===403?'FFScouter premium flight access denied.':r.status===401?'FFScouter flight key rejected.':'FFScouter flights unavailable (HTTP '+Number(r.status)+').';flightRetryAt=now()+(r.status===429?120000:60000);if([401,403].includes(r.status)){premium=null;premiumUntil=0;flightCache.clear();}throw fail(flightFailure);}
   try{if(typeof r.text!=='string'||r.text.length>1000000)throw Error();return JSON.parse(r.text);}catch{flightFailure='FFScouter returned unsupported flight data.';flightRetryAt=now()+60000;throw fail(flightFailure);}
  }
  function invalid(){flightFailure='FFScouter returned unsupported flight data.';flightRetryAt=now()+60000;throw fail(flightFailure);}
  if(now()<flightRetryAt)throw fail(flightFailure+' Retry in '+Math.ceil((flightRetryAt-now())/1000)+' seconds.');
  if(now()>=premiumUntil){
   const jobKey=c.id+':premium';let job=flightJobs.get(jobKey);
   if(!job){job=(async()=>{const data=await get('check-key');if(typeof data?.is_registered!=='boolean'||typeof data?.is_premium!=='boolean'||typeof data?.policy_update_required!=='boolean')invalid();premium=data.is_registered===true&&data.is_premium===true&&data.policy_update_required===false;premiumUntil=now()+300000;const expiry=Number(data.premium_entitlement_source==='faction'?data.faction_premium_expires_at:data.premium_expires_at);if(['personal','faction'].includes(data.premium_entitlement_source)&&Number.isFinite(expiry)&&expiry>0){if(expiry*1000<=now())premium=false;else premiumUntil=Math.min(premiumUntil,expiry*1000);}if(!premium)flightCache.clear();})();flightJobs.set(jobKey,job);job.finally(()=>{if(flightJobs.get(jobKey)===job)flightJobs.delete(jobKey);}).catch(()=>{});}
   await job;await active();
  }
  if(!premium)return {scope:c.id,premium:false,rows:[]};
  const missing=targets.filter(id=>!flightCache.has(id)||flightCache.get(id).expires<=now());
  for(let i=0;i<missing.length;i+=100){
   const batch=missing.slice(i,i+100),jobKey=c.id+':flights:'+batch.join(',');let job=flightJobs.get(jobKey);
   if(!job){job=(async()=>{
    const data=await get('player-flights/batch',{targets:batch.join(',')});if(!Array.isArray(data?.flights))invalid();const accepted=new Map();
    for(const row of data.flights){const id=String(row?.player_id);if(!batch.includes(id))continue;if(accepted.has(id))invalid();const leg=row.current,base={playerId:id,validUntil:Math.min(now()+60000,premiumUntil)};let value={...base,reason:'no-current'};
     if(leg&&typeof leg==='object'){
      const description=typeof leg.status_description==='string'?leg.status_description.trim().replace(/\s+/g,' '):'';
      const returning=/^(?:returning to torn(?: from .+)?|travel(?:l)?ing (?:back )?to torn(?: from .+)?|travel(?:l)?ing from .+? to torn)\.?$/i.test(description),outbound=/^travel(?:l)?ing (?:to|from .+? to) (?!torn(?:\b|$)).+/i.test(description);
      value={...base,reason:outbound?'outbound':returning?'no-arrival':'unknown-direction'};
      if(returning){
       const first=number(leg.earliest_arrival_time),last=number(leg.latest_arrival_time),early=first||last,late=last||first,takeoff=number(leg.takeoff_time),secondsNow=now()/1000;
       const takeoffValid=leg.takeoff_time==null||(takeoff&&takeoff<=secondsNow+60&&early>=takeoff);
       if(early&&late){value.reason=late<=secondsNow?'expired':'invalid-window';if(takeoffValid&&late>=early&&late>secondsNow&&late<=secondsNow+86400)value={...base,reason:'arrival',earliest:early,latest:late,partial:!first||!last};}
      }
     }accepted.set(id,value);
    }
    for(const id of batch)flightCache.set(id,{value:accepted.get(id)||{playerId:id,reason:'not-returned',validUntil:Math.min(now()+60000,premiumUntil)},expires:Math.min(now()+60000,premiumUntil)});while(flightCache.size>1000)flightCache.delete(flightCache.keys().next().value);flightFailure='';
   })();flightJobs.set(jobKey,job);job.finally(()=>{if(flightJobs.get(jobKey)===job)flightJobs.delete(jobKey);}).catch(()=>{});}
   await job;await active();
  }
  return {scope:c.id,premium:true,rows:targets.map(id=>flightCache.get(id)?.value).filter(value=>value?.reason==='arrival'),availability:targets.map(id=>flightCache.get(id)?.value).filter(Boolean).map(value=>({playerId:value.playerId,reason:value.reason,validUntil:value.validUntil}))};
 }
 function forget(playerId){try{const data=JSON.parse(window.localStorage.getItem(CONSENT)||'null');if(String(data?.playerId)===String(playerId))window.localStorage.removeItem(CONSENT);}finally{reset();}}
 return {state,setEnabled,stats,peek,flights,reset,forget};
}
