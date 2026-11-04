// TU All-in-One credential controller. Server acceptance is mandatory.
export const KEY_STORAGE = 'tu:aio:verified-credential:v1';
export const ACCESS = Object.freeze({ PUBLIC: 'public', LIMITED: 'limited' });
export function classifyAccess(value) {
  const v=String(value||'').toLowerCase().replace(/[ _-]/g,'');
  if(v==='public'||v==='publiconly')return ACCESS.PUBLIC;
  if(v==='limited'||v==='limitedaccess')return ACCESS.LIMITED;
  throw new Error('Server returned an unsupported API access level');
}
export function validateKey(key) {
  const clean=String(key||'').trim();
  if(!/^[a-zA-Z0-9]{16}$/.test(clean))throw new Error('Enter a 16-character Torn API key');
  return clean;
}
export function createCredentialController({verifyWithServer,storage}) {
  if(typeof verifyWithServer!=='function'||!storage)throw new Error('Server verifier and storage are required');
  return Object.freeze({
    async confirm(key,requestedAccess) {
      const clean=validateKey(key), requested=classifyAccess(requestedAccess);
      // Server MUST verify key with Torn, return verified access and player ID.
      // Do not persist the key until this authoritative check succeeds.
      const result=await verifyWithServer({apiKey:clean,requestedAccess:requested});
      if(!result||result.verified!==true||!result.playerId)throw new Error('Server verification was not confirmed');
      const actual=classifyAccess(result.accessLevel);
      if(requested===ACCESS.LIMITED&&actual!==ACCESS.LIMITED)throw new Error('This key was not verified as Limited');
      const record={apiKey:clean,accessLevel:actual,playerId:String(result.playerId),verifiedAt:new Date().toISOString()};
      await storage.set(KEY_STORAGE,JSON.stringify(record));
      return {accessLevel:actual,playerId:record.playerId,verifiedAt:record.verifiedAt};
    },
    async getStatus() {
      const raw=await storage.get(KEY_STORAGE);if(!raw)return null;
      try {const r=JSON.parse(raw);return {accessLevel:classifyAccess(r.accessLevel),playerId:r.playerId,verifiedAt:r.verifiedAt};}
      catch{return null;}
    },
    async getKeyForAuthorizedRequest() {
      const raw=await storage.get(KEY_STORAGE);if(!raw)throw new Error('No verified key saved');
      const r=JSON.parse(raw);return validateKey(r.apiKey);
    },
    async clear(){await storage.remove(KEY_STORAGE);}
  });
}
