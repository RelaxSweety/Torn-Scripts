import assert from 'node:assert/strict';
import {createSubmissionDelivery} from '../src/adapters/submission-delivery.js';
let clock=1000;const values=new Map(),store={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const batch={items:[{item_id:206}]};let pda=0,gm=0,fetches=0,auth=0;
function make(status=429){return createSubmissionDelivery({endpoint:'https://tu.example/stock',store,now:()=>clock,pda:async()=>{pda++;return {status,body:JSON.stringify({retry_after_seconds:70})};},gm:async()=>{gm++;return {ok:true,accepted:[206]};},fetch:async()=>{fetches++;return {ok:true,accepted:[206]};},onAuthorizationFailure:()=>auth++});}
await assert.rejects(make()(batch),e=>e.status===429&&e.retryAfterMs===70000);assert.equal(pda,1);assert.equal(gm,0);assert.equal(fetches,0);
await assert.rejects(make()(batch),e=>e.status===429);assert.equal(pda,1,'Reloaded delivery observes saved retry deadline');clock+=70000;values.clear();await assert.rejects(make(403)(batch),e=>e.status===403);assert.equal(auth,1);assert.equal(gm,0);
values.clear();const wrong=createSubmissionDelivery({endpoint:'x',store,now:()=>clock,fetch:async()=>({ok:true,accepted:[999]})});await assert.rejects(wrong(batch),/receipt/);
values.clear();const fallback=createSubmissionDelivery({endpoint:'x',store,now:()=>clock,pda:async()=>{throw Error('Network');},gm:async()=>({status:201,responseText:JSON.stringify({ok:true,accepted:[206]})})});assert.equal((await fallback(batch)).ok,true);
console.log('Submission delivery passed: enforced persistent retry deadline, no alternate transport on HTTP failure, auth signal, exact receipt IDs and idempotent network fallback');
