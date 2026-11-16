import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createMarketRequest} from '../src/adapters/market-request.js';
const dom=new JSDOM('',{url:'https://www.torn.com'}),w=dom.window,sends=[];
const adapter=createMarketRequest({window:w,http:options=>{sends.push(Date.now());w.setTimeout(()=>options.onload({status:200,responseText:'{"ok":true}'}),1);return {abort(){}};},authorized:()=>true,getKey:()=>'abcdefghijklmnop'});
try{
 await adapter.read('market',1);await adapter.read('market',2);assert.ok(sends[1]-sends[0]>=950,'Fresh Torn requests paced at one second');const before=Date.now();await adapter.read('market',1);assert.ok(Date.now()-before<100,'Cache hit bypasses network pacing');assert.equal(sends.length,2);
 const controller=new w.AbortController(),pending=adapter.read('market',3,{signal:controller.signal});controller.abort();await assert.rejects(pending,/cancel/i);assert.equal(sends.length,2,'Cancelled scheduled request never sent');
 console.log('Market request pacing passed: fresh-request spacing, cached fast path and cancellation during pacing.');
}finally{w.close();}
