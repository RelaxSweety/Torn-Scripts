// Development-only protocol adapter for TU Manager integration.
// Not loaded by production Manager. No Torn API key is logged or persisted here.
export const AGREEMENT=Object.freeze({agreement_version:"1.1",agreement_number:2,agreement_date:"2026-10-23"});
export const BASE="https://tu-multiplayer-server-dev.tuserver.workers.dev";
export async function request(path,{method="GET",token,body}={}){
 const response=await fetch(BASE+path,{method,headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||"TU development API HTTP "+response.status);
 return data;
}
export async function register(apiKey,platform){
 if(!["pda","tampermonkey"].includes(platform))throw Error("Invalid platform");
 return request("/api/auth/register",{method:"POST",body:{api_key:apiKey,platform}});
}
export const agreementStatus=token=>request("/api/auth/agreement",{token});
export const acceptAgreement=token=>request("/api/auth/agreement",{method:"POST",token,body:{action:"accepted",request_id:crypto.randomUUID(),...AGREEMENT}});
export const cancelAgreement=token=>request("/api/auth/agreement",{method:"POST",token,body:{action:"cancelled",request_id:crypto.randomUUID()}});
export const playerStatus=token=>request("/api/auth/me",{token});
