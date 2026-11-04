// Adapter for the future verified-auth backend contract. Never infer key access from UI selection.
import {classifyAccess,validateKey} from './api-credentials.js';

export function createServerVerifier({request}) {
  if(typeof request!=='function')throw new Error('Authenticated server request function required');
  return async function verifyWithServer({apiKey,requestedAccess}) {
    const key=validateKey(apiKey);
    const requested=classifyAccess(requestedAccess);
    // This endpoint MUST be implemented by the TU backend before use.
    // The existing /api/auth/register response is NOT sufficient evidence of key level.
    const response=await request('/api/auth/verify-key',{
      method:'POST',body:{api_key:key,requested_access:requested}
    });
    if(!response||response.verified!==true)throw new Error('Backend did not confirm key verification');
    const accessLevel=classifyAccess(response.accessLevel);
    const playerId=String(response.playerId||'');
    if(!/^[1-9][0-9]*$/.test(playerId))throw new Error('Backend did not confirm player identity');
    return {verified:true,accessLevel,playerId};
  };
}
