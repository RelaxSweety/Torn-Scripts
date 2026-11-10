import assert from 'node:assert/strict';
import {SubmissionBudget} from '../cloudflare/submission-budget.js';
import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex');
let clock=1_000_000;const old=Date.now;Date.now=()=>clock;
function make(){const data=new Map();let tail=Promise.resolve();const tx={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>data.delete(k),setAlarm:async()=>{}};const storage={transaction(fn){const result=tail.then(()=>fn(tx));tail=result.catch(()=>{});return result;}};return {budget:new SubmissionBudget({storage}),data};}
function reserve(budget,key,ip){return budget.fetch(new Request('https://internal/reserve',{method:'POST',body:JSON.stringify({keyHash:hash(key),ipHash:hash(ip)})}));}
try{
 for(const [count,key,ip,expected] of [[65,()=> 'same-user',i=>'ip'+i,60],[125,i=>'user'+i,()=> 'same-ip',120],[505,i=>'user'+i,i=>'ip'+i,500]]){
  const {budget,data}=make(),results=await Promise.all(Array.from({length:count},(_,i)=>reserve(budget,key(i),ip(i))));
  assert.equal(results.filter(r=>r.status===200).length,expected);assert.ok(Buffer.byteLength(JSON.stringify([...data]))<128*1024);
  clock+=59_999;assert.equal((await reserve(budget,key(0),ip(0))).status,429);clock++;assert.equal((await reserve(budget,key(0),ip(0))).status,200);
  clock+=60_000;await budget.alarm();assert.equal(data.size,0);
 }
}finally{Date.now=old;}
console.log('Submission budget passed: per-account/IP/global concurrent limits, rolling expiry and cleanup');
