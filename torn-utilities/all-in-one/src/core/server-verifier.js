// Option A: extend the existing Cloudflare registration endpoint, not a second auth service.
// This adapter is fail-closed until the DEV worker returns verified access metadata.
import {classifyAccess,validateKey} from './api-credentials.js';

export function createServerVerifier({request}) {
  if(typeof request!=='function')throw new Error('Server request function required');
  return async function verifyWithServer({apiKey,requestedAccess}) {
    const key=validateKey(apiKey);
    const requested=classifyAccess(requestedAccess);
    const response=await request('/api/auth/register',{
      method:'POST',body:{api_key:key,platform:'tampermonkey',requested_access:requested}
    });
    if(!response||response.verified!==true)throw new Error('Registration did not confirm key verification');
    const accessLevel=classifyAccess(response.accessLevel);
    const playerId=String(response.playerId||'');
    if(!/^[1-9][0-9]*$/.test(playerId))throw new Error('Registration did not confirm player identity');
    if(accessLevel!==requested)throw new Error('Verified key access does not match selected access level');
    // Session token is intentionally not persisted by this credential-verification adapter.
    // Existing Manager session handling remains responsible for token and agreement.
    return {verified:true,accessLevel,playerId};
  };
}
