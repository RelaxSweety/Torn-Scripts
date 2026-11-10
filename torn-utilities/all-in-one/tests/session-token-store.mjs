import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createSessionTokenStore} from '../src/adapters/session-token-store.js';
const TOKEN='tu:dev:auth:session:v1',CACHE='tu:dev:authorization-cache:v1';
function fixture(fail=false){const dom=new JSDOM('',{url:'https://www.torn.com'}),data=new Map();return {dom,data,options:{window:dom.window,privateMode:true,getValue:(k,f)=>data.has(k)?data.get(k):f,setValue:(k,v)=>{if(fail)throw Error('Unavailable');data.set(k,v);},deleteValue:k=>data.delete(k)}};}
{
 const {dom,data,options}=fixture(),s=dom.window.sessionStorage;s.setItem(TOKEN,'secret-session');s.setItem(CACHE,JSON.stringify({token:'secret-session',accepted:true}));
 const store=createSessionTokenStore(options);assert.equal(store.get(),'secret-session');assert.equal(s.getItem(TOKEN),null);assert.ok(!JSON.stringify(Object.values(s)).includes('secret-session'));
 assert.ok(JSON.parse(s.getItem(CACHE)).sessionMarker);assert.equal(JSON.parse(s.getItem(CACHE)).token,undefined);
 const restored=createSessionTokenStore(options);assert.equal(restored.get(),'secret-session');assert.equal(restored.marker(),store.marker());
 store.set('second-secret');assert.equal(store.get(),'second-secret');assert.ok(!JSON.stringify(Object.values(s)).includes('second-secret'));
 store.clear();assert.equal(store.get(),'');assert.equal(data.size,0);dom.window.close();
}
{
 const {dom,options}=fixture(true);dom.window.sessionStorage.setItem(TOKEN,'retain-on-failure');const store=createSessionTokenStore(options);
 assert.equal(store.get(),'');assert.ok(store.status().error);assert.equal(dom.window.sessionStorage.getItem(TOKEN),'retain-on-failure');assert.throws(()=>store.set('new'),/unavailable/);dom.window.close();
}
{
 const dom=new JSDOM('',{url:'https://www.torn.com'}),store=createSessionTokenStore({window:dom.window});store.set('pda-token');assert.equal(store.get(),'pda-token');assert.equal(store.status().mode,'origin-session');assert.ok(store.marker());store.clear();assert.equal(store.get(),'');dom.window.close();
}
console.log('Session storage passed: verified private migration, token-free origin cache, reload/clear, failure isolation and explicit PDA fallback');
