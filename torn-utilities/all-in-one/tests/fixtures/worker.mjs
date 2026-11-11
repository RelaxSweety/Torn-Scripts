import worker,{IdentityCoordinator} from '../../cloudflare/tu-multiplayer-server-dev-option-a.js';
export * from '../../cloudflare/tu-multiplayer-server-dev-option-a.js';
export function memoryState(){const data=new Map();const storage={async get(k){return structuredClone(data.get(k));},async put(k,v){data.set(k,structuredClone(v));},async delete(k){return data.delete(k);},async setAlarm(){},async transaction(fn){return fn(storage);}};let last=Promise.resolve();return {data,storage,blockConcurrencyWhile(fn){const result=last.then(fn);last=result.catch(()=>{});return result;}};}
const instances=new WeakMap();
export default {fetch(req,env){if(!instances.has(env)){const object=new IdentityCoordinator(memoryState(),env);instances.set(env,{idFromName:x=>x,get:()=>object});}return worker.fetch(req,new Proxy(env,{get(target,key){return key==='IDENTITY_COORDINATOR'?instances.get(env):Reflect.get(target,key);}}));}};
