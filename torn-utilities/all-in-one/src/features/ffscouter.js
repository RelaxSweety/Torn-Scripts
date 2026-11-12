// Per-viewer, read-only FFScouter access. Keys remain inside the Manager closure.
export function createFFScouter({window,getCredentials,isAuthorized,request,now=()=>Date.now(),ttl=600000}){
 const CONSENT='tu:who:ffscouter:consent:v1';let current='',generation=0;const cache=new Map(),inflight=new Map();let retryAt=0;
 const fail=message=>Error(message);
 function credentials(){if(!isAuthorized())return null;const c=getCredentials();return c&&c.verified&&/^[A-Za-z0-9]{16}$/.test(c.key||'')&&/^[1-9][0-9]*$/.test(String(c.playerId))?{key:c.key,playerId:String(c.playerId)}:null;}
 async function scope(){
  const c=credentials();if(!c){reset();return null;}
  if(!window.crypto?.subtle)throw fail('Secure key identification is unavailable.');
  const bytes=new TextEncoder().encode('tu-ffscouter-v1:'+c.playerId+':'+c.key),digest=await window.crypto.subtle.digest('SHA-256',bytes),id=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const fresh=credentials();if(!fresh||fresh.key!==c.key||fresh.playerId!==c.playerId)throw fail('Selected user/key changed. Retry for the current account.');
  if(current!==id){reset();current=id;}return {...c,id,generation};
 }
 function enabled(c){try{const data=JSON.parse(window.localStorage.getItem(CONSENT)||'null');return data?.scope===c.id&&String(data.playerId)===c.playerId;}catch{return false;}}
 function reset(){generation++;current='';cache.clear();inflight.clear();retryAt=0;}
 async function state(){const c=await scope();return c?{available:true,enabled:enabled(c),scope:c.id,viewerId:c.playerId}:{available:false,enabled:false,scope:null,viewerId:null};}
 async function setEnabled(value){const c=await scope();if(!c)throw fail('Select a verified API key belonging to the current TU player.');if(value!==true){window.localStorage.removeItem(CONSENT);reset();return state();}window.localStorage.setItem(CONSENT,JSON.stringify({scope:c.id,playerId:c.playerId,acceptedAt:now()}));if(!enabled(c))throw fail('FFScouter consent could not be saved.');return state();}
 function number(value){if(!['number','string'].includes(typeof value)||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
 async function stats(ids){
  const c=await scope();if(!c||!enabled(c))throw fail('Enable FFScouter for your selected key in War Organizer Settings.');
  if(!Array.isArray(ids)||ids.length>1000||ids.some(id=>!/^[1-9][0-9]{0,11}$/.test(String(id))))throw fail('Invalid FFScouter target IDs.');
  const targets=[...new Set(ids.map(String))].sort((a,b)=>Number(a)-Number(b)),missing=targets.filter(id=>!cache.has(id)||cache.get(id).expires<=now());
  if(missing.length&&now()<retryAt)throw fail('FFScouter is temporarily unavailable. Retry later.');
  for(let index=0;index<missing.length;index+=200){
   const batch=missing.slice(index,index+200),jobKey=c.id+':'+batch.join(',');let job=inflight.get(jobKey);
   if(!job){job=(async()=>{
    const fresh=await scope();if(!fresh||fresh.id!==c.id||fresh.generation!==c.generation||!enabled(fresh))throw fail('Selected user/key changed.');
    const url=new URL('https://ffscouter.com/api/v1/get-stats');url.searchParams.set('key',c.key);url.searchParams.set('targets',batch.join(','));
    let response;
    try{response=await request(url.href);}catch{if(current===c.id&&generation===c.generation)retryAt=now()+60000;throw fail('FFScouter request failed. Check key registration and try again later.');}
    const after=await scope();if(!after||after.id!==c.id||after.generation!==c.generation||!enabled(after))throw fail('Selected user/key changed; old estimates discarded.');
    if(response.status!==200){retryAt=now()+(response.status===429?120000:60000);throw fail(response.status===429?'FFScouter rate limit reached. Retry later.':'FFScouter rejected the request. Check that your selected key is registered with FFScouter.');}
    let rows;try{if(typeof response.text!=='string'||response.text.length>1000000)throw Error();rows=JSON.parse(response.text);if(!Array.isArray(rows))throw Error();}catch{retryAt=now()+60000;throw fail('FFScouter returned an unsupported response.');}
    const accepted=new Map();for(const row of rows){const id=String(row?.player_id);if(!batch.includes(id))continue;if(accepted.has(id)){retryAt=now()+60000;throw fail('FFScouter returned conflicting target results.');}const bs=number(row.bs_estimate),ff=number(row.fair_fight),updated=number(row.last_updated);accepted.set(id,{playerId:id,bs:bs&&bs<=1e24?bs:null,ff:ff&&ff<=10000?ff:null,lastUpdated:updated&&updated<=now()/1000+300?updated:null});}
    for(const id of batch){const value=accepted.get(id)||{playerId:id,bs:null,ff:null,lastUpdated:null};cache.set(id,{value,expires:now()+(value.bs||value.ff?ttl:120000)});}while(cache.size>1000){const old=[...cache.keys()].find(id=>!targets.includes(id));if(!old)break;cache.delete(old);}
   })();inflight.set(jobKey,job);job.finally(()=>{if(inflight.get(jobKey)===job)inflight.delete(jobKey);}).catch(()=>{});}
   await job;
  }
  const after=await scope();if(!after||after.id!==c.id||!enabled(after))throw fail('Selected user/key changed; old estimates discarded.');
  return {scope:c.id,viewerId:c.playerId,rows:targets.map(id=>({...cache.get(id).value}))};
 }
 function forget(playerId){try{const data=JSON.parse(window.localStorage.getItem(CONSENT)||'null');if(String(data?.playerId)===String(playerId))window.localStorage.removeItem(CONSENT);}finally{reset();}}
 return {state,setEnabled,stats,reset,forget};
}
