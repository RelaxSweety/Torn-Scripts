// Prepared private session persistence for the unpublished integrated candidate.
export function createSessionTokenStore({window,privateMode=false,getValue,setValue,deleteValue}){
 const TOKEN='tu:dev:auth:session:v1',CACHE='tu:dev:authorization-cache:v1',TAB='tu:session:tab:v1';
 let failure=null,tab=window.sessionStorage.getItem(TAB);
 if(!/^[0-9a-f-]{36}$/i.test(tab||'')){tab=window.crypto.randomUUID();window.sessionStorage.setItem(TAB,tab);}
 const recordKey='tu:session:private:v1:'+tab;
 function read(){const value=getValue(recordKey,null);if(value&&typeof value.then==='function')throw Error('Asynchronous private session storage unsupported');if(value==null)return null;const record=typeof value==='string'?JSON.parse(value):value;if(typeof record.token!=='string'||!record.token||typeof record.marker!=='string'||!Number.isFinite(record.expiresAt))throw Error('Invalid private session record');return record;}
 function removeRecord(){if(deleteValue)deleteValue(recordKey);else setValue(recordKey,null);if(read()!==null)throw Error('Private session removal failed');}
 function persist(record){const encoded=JSON.stringify(record),result=setValue(recordKey,encoded);if(result&&typeof result.then==='function')throw Error('Asynchronous private session storage unsupported');if(JSON.stringify(read())!==encoded)throw Error('Private session write failed');}
 function scrubCache(marker){for(const name of [CACHE,'tu:dev:identity-cache:v1'])try{const cache=JSON.parse(window.sessionStorage.getItem(name)||'null');if(cache&&typeof cache==='object'){delete cache.token;cache.sessionMarker=marker;window.sessionStorage.setItem(name,JSON.stringify(cache));}}catch{window.sessionStorage.removeItem(name);}}
 if(privateMode)try{
  const current=read(),legacy=window.sessionStorage.getItem(TOKEN);
  if(!current&&legacy)persist({token:legacy,marker:window.crypto.randomUUID(),expiresAt:Date.now()+86400000});
  const record=read();scrubCache(record?.marker||'');window.sessionStorage.removeItem(TOKEN);
 }catch{failure='Private session storage unavailable';}
 const ensure=()=>{if(failure)throw Error(failure);};
 return {
  get(){if(!privateMode)return window.sessionStorage.getItem(TOKEN)||'';try{ensure();const record=read();if(record&&record.expiresAt<=Date.now()){removeRecord();return '';}return record?.token||'';}catch{return '';}},
  marker(){if(!privateMode){let marker=window.sessionStorage.getItem(TAB+':marker');if(!marker){marker=window.crypto.randomUUID();window.sessionStorage.setItem(TAB+':marker',marker);}return marker;}ensure();return read()?.marker||'';},
  set(token){if(typeof token!=='string'||!token)throw Error('Invalid session token');if(!privateMode){window.sessionStorage.setItem(TOKEN,token);window.sessionStorage.setItem(TAB+':marker',window.crypto.randomUUID());scrubCache(window.sessionStorage.getItem(TAB+':marker'));return;}ensure();persist({token,marker:window.crypto.randomUUID(),expiresAt:Date.now()+86400000});window.sessionStorage.removeItem(TOKEN);scrubCache(read().marker);},
  clear(){if(privateMode){ensure();removeRecord();}window.sessionStorage.removeItem(TOKEN);window.sessionStorage.removeItem(CACHE);window.sessionStorage.removeItem(TAB+':marker');},
  status:()=>({mode:privateMode?'userscript-private':'origin-session',error:failure})
 };
}
