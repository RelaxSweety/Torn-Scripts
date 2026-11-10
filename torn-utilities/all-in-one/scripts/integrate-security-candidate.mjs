import {createSubmissionDelivery} from '../src/adapters/submission-delivery.js';
import {isScopedTornRead} from '../src/adapters/scoped-api-path.js';
import {createSessionTokenStore} from '../src/adapters/session-token-store.js';
export function secureCandidateManager(source){
 source=source.replace("  'use strict';","  'use strict';\nconst isScopedTornRead="+isScopedTornRead.toString()+";\n");
 const credentialLine='  const readCredential=name=>';
 const insert=`  const sessionTokens=(${createSessionTokenStore.toString()})({window,privateMode:credentials.mode!=='origin-local',getValue:typeof GM_getValue==='function'?GM_getValue:null,setValue:typeof GM_setValue==='function'?GM_setValue:null,deleteValue:typeof GM_deleteValue==='function'?GM_deleteValue:null});\n`;
 if(!source.includes(credentialLine))throw Error('Credential integration changed');
 source=source.replace(credentialLine,insert+credentialLine);
 source=source.replace("const devToken=()=>sessionStorage.getItem(DEV_SESSION_KEY)||'';","const devToken=()=>sessionTokens.get();");
 source=source.replaceAll('sessionStorage.removeItem(DEV_SESSION_KEY)','sessionTokens.clear()');
 source=source.replaceAll('sessionStorage.setItem(DEV_SESSION_KEY,registration.token)','sessionTokens.set(registration.token)').replaceAll('sessionStorage.setItem(DEV_SESSION_KEY,token)','sessionTokens.set(token)');
 source=source.replace('JSON.stringify({token,build:TU_VERSION,checkedAt:Date.now(),agreement:currentDevAgreement,accepted:true})','JSON.stringify({sessionMarker:sessionTokens.marker(),build:TU_VERSION,checkedAt:Date.now(),agreement:currentDevAgreement,accepted:true})');
 source=source.replace('cached.token===devToken()', 'cached.sessionMarker===sessionTokens.marker()');
 source=source.replace('cached?.token===devToken()', 'cached?.sessionMarker===sessionTokens.marker()').replace('JSON.stringify({token:devToken(),checkedAt:', 'JSON.stringify({sessionMarker:sessionTokens.marker(),checkedAt:').replace('...identity,token:registration.token', '...identity,sessionMarker:sessionTokens.marker()');
 const expose="  Object.defineProperty(pageWindow, 'TornUtilities', {value:api, configurable:false, writable:false});";
 if(!source.includes(expose))throw Error('Manager publication changed');
 source=source.replace(expose,`  tuPrivateManager=api;\n  const privateMethods=new Set(['requestTorn','requestTravelInfo','requestWhoTorn','fetchWithApiBudget','requestWithApiBudget','apiRequestWithBudget','prepareBackendRequest','handleBackendAuthorizationFailure']);\n  const publicApi=Object.freeze(Object.fromEntries(Object.entries(api).filter(([name])=>!privateMethods.has(name))));\n  Object.defineProperty(pageWindow,'TornUtilities',{value:publicApi,configurable:false,writable:false});`);
 source=source.replace("Object.defineProperty(window,'TornUtilities',{value:api,configurable:true})","Object.defineProperty(window,'TornUtilities',{value:publicApi,configurable:true})");
 source=source.replace("if(typeof path!=='string'||!/^\\/v2\\/faction(?:\\/|\\?|$)/.test(path))", "if(!isScopedTornRead(path,'faction'))");
 source=source.replace("if(typeof path!=='string'||!(/^(?:\\/v2\\/faction(?:\\/|\\?|$)|\\/v2\\/user\\/[0-9]+\\/profile(?:\\?|$))/.test(path)))", "if(!isScopedTornRead(path,'who'))");
 source=source.replace('    isAuthorized:()=>authorized(),',`    isAuthorized:()=>authorized(),\n    prepareBackendRequest:(url,options)=>tuPrepareBackend(url,options,{authorized:authorized(),token:devToken()}),`);
 if(source.includes('sessionStorage.setItem(DEV_SESSION_KEY')||source.includes('sessionStorage.getItem(DEV_SESSION_KEY')||!source.includes("if(!isScopedTornRead(path,'who'))")||!source.includes("if(!isScopedTornRead(path,'faction'))"))throw Error('Security candidate integration incomplete');
 return source;
}

export function secureCandidateReporting(source){
 const start=source.indexOf('async function deliverStockBatch(batch){'),end=source.indexOf('function confirmStockMarks(batch){',start);
 if(start<0||end<0)throw Error('Stock transport integration changed');
 const code=`const stockDelivery=(${createSubmissionDelivery.toString()})({endpoint:stockEndpoint,store:sessionStorage,
 pda:typeof PDA_httpPost==='function'?PDA_httpPost:null,
 gm:typeof GM_xmlhttpRequest==='function'?(url,options)=>new Promise((resolve,reject)=>GM_xmlhttpRequest({url,method:'POST',headers:options.headers,data:options.body,timeout:12000,onload:resolve,onerror:reject,ontimeout:reject})):null,
 fetch:(url,options)=>fetch(url,options),onAuthorizationFailure:()=>api.handleBackendAuthorizationFailure?.()});
async function deliverStockBatch(batch){return stockDelivery(batch);}
`;
 return source.slice(0,start)+code+source.slice(end);
}
