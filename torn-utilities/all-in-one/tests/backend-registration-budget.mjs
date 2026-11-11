import assert from 'node:assert/strict';
import { RegistrationBudget } from '../cloudflare/registration-budget.js';
import worker from './fixtures/worker.mjs';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
// Serial storage double matches the transaction contract; not a Cloudflare runtime test.
function storage() {
 const records=new Map();let tail=Promise.resolve(),alarm;
 const tx={async get(k){return structuredClone(records.get(k));},async put(k,v){records.set(k,structuredClone(v));},async delete(k){records.delete(k);},async setAlarm(t){alarm=t;}};
 return {records,get alarm(){return alarm;},transaction(fn){const result=tail.then(()=>fn(tx));tail=result.catch(()=>{});return result;}};
}
const reserve=(limiter,key,ip)=>limiter.fetch(new Request('https://budget.internal/reserve',{method:'POST',body:JSON.stringify({keyHash:hash('key:'+key),ipHash:hash('ip:'+ip)})}));
const oldTime=Date.now,oldFetch=globalThis.fetch;let clock=1_000_000;Date.now=()=>clock;
try {
 let store=storage(),limiter=new RegistrationBudget({storage:store});
 const results=await Promise.all(Array.from({length:30},()=>reserve(limiter,'same-key','same-ip')));
 assert.equal(results.filter(r=>r.status===200).length,10,'Concurrent attempts share key budget');
 assert.equal(store.records.get('reservations').length,10);
 assert.ok(!JSON.stringify([...store.records]).includes('same-key'));
 assert.ok(!JSON.stringify([...store.records]).includes('same-ip'));
 assert.equal(store.alarm,clock+70_000);
 limiter=new RegistrationBudget({storage:store});
 assert.equal((await reserve(limiter,'same-key','different-ip')).status,429,'Restart/IP change retains key budget');
 clock+=69_999;assert.equal((await reserve(limiter,'same-key','different-ip')).status,429);
 clock++;assert.equal((await reserve(limiter,'same-key','different-ip')).status,200);
 clock+=70_000;await limiter.alarm();assert.equal(store.records.has('reservations'),false,'Alarm removes expired hashes');
 for(const [count,keyFor,ipFor,expected] of [[40,i=>'key'+i,()=> 'shared-ip',20],[510,i=>'key'+i,i=>'ip'+i,500]]){
  store=storage();limiter=new RegistrationBudget({storage:store});
  const responses=await Promise.all(Array.from({length:count},(_,i)=>reserve(limiter,keyFor(i),ipFor(i))));
  assert.equal(responses.filter(r=>r.status===200).length,expected);
 }
 assert.ok(Buffer.byteLength(JSON.stringify(store.records.get('reservations')))<128*1024);
 clock+=69_999;assert.equal((await reserve(limiter,'new-key','new-ip')).status,429,'No minute-boundary burst');
 clock++;assert.equal((await reserve(limiter,'new-key','new-ip')).status,200);
 assert.equal((await limiter.fetch(new Request('https://budget.internal/reserve',{method:'POST',body:'{"keyHash":"raw","ipHash":"raw"}'}))).status,400);
 assert.equal((await limiter.fetch(new Request('https://budget.internal/reserve'))).status,404);
 let calls=0,received,objectName;globalThis.fetch=async()=>{calls++;throw Error('Unexpected Torn call');};
 const request=()=>new Request('https://tu.example/api/auth/register',{method:'POST',headers:{'cf-connecting-ip':'192.0.2.9'},body:JSON.stringify({api_key:'aa11bb22cc33dd44',platform:'pda'})});
 const binding=fn=>({idFromName(name){objectName=name;return name;},get:()=>({async fetch(req){received=await req.json();return fn();}})});
 for(const [budget,status] of [[undefined,503],[binding(()=>{throw Error('PRIVATE_LIMITER_ERROR');}),503],[binding(()=>Response.json({allowed:false},{status:429})),429],[binding(()=>Response.json({allowed:false})),503]]){
  const result=await worker.fetch(request(),{TU_USERS_DB:{},REGISTRATION_BUDGET:budget});
  assert.equal(result.status,status);assert.ok(!(await result.text()).includes('PRIVATE_LIMITER_ERROR'));
  if(status===429)assert.equal(result.headers.get('retry-after'),'70');
 }
 assert.equal(calls,0,'Denied/unavailable budgets never contact Torn');assert.equal(objectName,'registration-global-v1');
 assert.deepEqual(received,{keyHash:hash('key:aa11bb22cc33dd44'),ipHash:hash('ip:192.0.2.9')});
 for(const path of ['/api/rooms','/api/connect','/api/battleship','/api/marbles','/api/auth/admin/users','/api/auth/admin/pending']){
  assert.equal((await worker.fetch(new Request('https://tu.example'+path),{TU_USERS_DB:{}})).status,401,path);
 }
} finally {Date.now=oldTime;globalThis.fetch=oldFetch;}
console.log('Backend budget passed: concurrent/global/key/IP limits, rolling expiry, alarm cleanup, bounded hashed state, fail-closed verification and private-route authorization');
