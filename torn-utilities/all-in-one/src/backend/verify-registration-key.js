// Option A server-side verification helper for the EXISTING /api/auth/register handler.
// This is backend code; never import it into the userscript bundle.
// Existing registration must call verifyRegistrationKey before issuing a session.
// Torn API v2 key/info response shape is checked strictly; unexpected shapes fail closed.
export async function verifyRegistrationKey(apiKey,{fetchImpl=fetch}={}) {
  if(typeof apiKey!=='string'||!/^[A-Za-z0-9]{16}$/.test(apiKey))throw Error('Invalid API key format');
  const response=await fetchImpl('https://api.torn.com/v2/key/info',{
    headers:{Authorization:'ApiKey '+apiKey,Accept:'application/json'},
    cache:'no-store'
  });
  if(!response.ok)throw Error('Torn key verification failed');
  const data=await response.json();
  if(data?.error)throw Error('Torn rejected API key');
  const raw=String(data?.info?.access?.type??'').trim();
  const accessLevel=raw==='Public Only'?'public':raw==='Limited Access'?'limited':null;
  const playerId=Number(data?.info?.user?.id);
  if(!accessLevel)throw Error('Unsupported API access level');
  if(!Number.isSafeInteger(playerId)||playerId<=0)throw Error('Torn key owner not verified');
  return Object.freeze({verified:true,accessLevel,playerId});
}
