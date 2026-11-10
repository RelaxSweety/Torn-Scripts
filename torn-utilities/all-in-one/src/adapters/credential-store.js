// Private persistence when a known userscript manager supplies synchronous GM storage.
export function createCredentialStore({window,handler='',pda=false,getValue,setValue,deleteValue}){
 const PRIVATE='tu:credentials:private:v1',REVISION='tu:credentials:revision:v1';
 const VAULT='tu:identity:public-only-key:v1',RING='tu:identity:saved-keys:v1',WHO='tu:who:limited-api-key:v1',EXTRAS='tu:api:additional-keys:v1',CLEARED='tu:identity:login-cleared:v1';
 const fields=[VAULT,RING,WHO,EXTRAS,CLEARED],secrets=[VAULT,RING,WHO,EXTRAS];
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
  status:()=>({mode:privateCapable?(error?'private-unavailable':'userscript-private'):'origin-local',isolated:privateCapable&&!error,error,encrypted:false})};
}
