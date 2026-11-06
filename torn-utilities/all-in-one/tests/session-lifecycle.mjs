import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {isAccountAuthorizationFailure} from '../src/adapters/tool-request.js';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const KEY='abcdef0123456789',VAULT='tu:identity:public-only-key:v1',TOKEN='tu:dev:auth:session:v1',AUTH='tu:dev:authorization-cache:v1',IDENTITY='tu:dev:identity-cache:v1';
const tick=()=>new Promise(r=>setTimeout(r,35));
async function boot(snapshot=null,{noKey=false}={}){
 const dom=new JSDOM('<body><main id="torn-content">Torn</main></body>',{url:'https://www.torn.com',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const watchers=[],intervals=[],requests=[],errors=[],renders={count:0};let shift=0;
 const now=w.Date.now.bind(w.Date);w.Date.now=()=>now()+shift;
 const Native=w.MutationObserver;w.MutationObserver=class extends Native{constructor(fn){super(fn);this.targets=new Map();watchers.push(this)}observe(t,o){this.targets.set(t,o);super.observe(t,o)}disconnect(){this.targets.clear();super.disconnect()}};
 w.ResizeObserver=class{constructor(){this.targets=new Map();watchers.push(this)}observe(t){this.targets.set(t,{})}disconnect(){this.targets.clear()}};
 const nativeInterval=w.setInterval.bind(w);w.setInterval=(fn,ms)=>{intervals.push(ms);return nativeInterval(fn,ms)};
 w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});w.console.error=(...a)=>errors.push(a.join(' '));w.console.warn=()=>{};w.alert=()=>{};w.confirm=()=>true;
 if(snapshot){for(const [k,v] of Object.entries(snapshot.local))w.localStorage.setItem(k,v);for(const [k,v] of Object.entries(snapshot.session))w.sessionStorage.setItem(k,v);}
 else if(!noKey){w.localStorage.setItem(VAULT,KEY);w.localStorage.setItem('tu:agreement:accepted','fixture-v1');w.sessionStorage.setItem(TOKEN,'token-v1');}
 const control={version:'fixture-v1',accepted:true,status:200,registers:0,accepts:0,body:'Published complete fixture agreement.'};
 const metadata=()=>({agreement_version:control.version,agreement_number:1,agreement_date:'2026-11-05'});
 w.GM_xmlhttpRequest=o=>{requests.push({method:o.method,path:new URL(o.url).pathname});queueMicrotask(()=>{
  let data={},status=200;
  if(o.url.endsWith('/api/auth/agreement/current'))data={agreement:metadata(),content:control.body};
  else if(o.url.endsWith('/api/auth/register')){control.registers++;control.status=200;data={token:'token-renewed',accessLevel:'public',playerId:42};}
  else if(o.url.endsWith('/api/auth/agreement')){
   if(o.method==='POST'){control.accepts++;control.accepted=true;data={ok:true};}
   else{status=control.status;data=status===200?{agreement:metadata(),accepted:control.accepted}:{error:'Fixture authorization rejection'};}
  }else if(o.url.includes('/key/info'))data={info:{access:{type:'Public Only'},user:{id:42}}};
  else if(o.url.includes('/user/'))data={name:'Fixture player'};
  o.onload?.({status,responseText:JSON.stringify(data)});
 });};
 w.HTMLElement.prototype.setPointerCapture=()=>{};
 w.fetch=async()=>{throw Error('Unexpected fetch')};
 w.__renders=renders;w.eval(code.replace('function render(tab) {','function render(tab) {window.__renders.count++;'));
 await tick();await tick();
 const button=label=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===label);
 const card=name=>[...w.document.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent===name).querySelector('button').click();
 const dump=store=>Object.fromEntries(Object.keys(store).map(k=>[k,store.getItem(k)]));
 return {w,api:w.TornUtilities,control,watchers,intervals,requests,errors,renders,button,card,advance:ms=>{shift+=ms},snapshot:()=>({local:dump(w.localStorage),session:dump(w.sessionStorage)}),close:()=>{for(const o of watchers)o.disconnect();dom.window.close()}};
}
assert.equal(isAccountAuthorizationFailure('https://tu-multiplayer-server-dev.tuserver.workers.dev/api/connect/ROOM/state',401,{error:'Bad room token'}),false);
assert.equal(isAccountAuthorizationFailure('https://tu-multiplayer-server-dev.tuserver.workers.dev/api/connect/ROOM/state',401,{authorization_status:401}),true);
assert.equal(isAccountAuthorizationFailure('https://api.torn.com/v2/key/info',401,{authorization_status:401}),false);
let saved;
{
 const b=await boot();try{
  assert.equal(b.api.isAuthorized(),true);assert.equal(b.renders.count,1,'Hidden Manager should not rerender per tool registration');
  assert.deepEqual(b.intervals,[],'No idle authorization polling');assert.equal(b.requests.filter(r=>r.path.includes('/key/info')).length,1);assert.equal(b.requests.filter(r=>r.path==='/api/auth/agreement/current').length,0,'No full agreement fetch at startup');
  assert.ok(b.watchers.every(w=>w.targets.size===0),'No connected DOM observations while Manager/tools closed');
  const before=b.requests.length;b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));await tick();assert.equal(b.requests.length,before,'Fresh session resumes without requests');
  b.w.document.querySelector('#torn-content').textContent='Updated Torn';await tick();assert.ok(b.watchers.every(w=>w.targets.size===0));
  saved=b.snapshot();assert.deepEqual(b.errors,[]);
 }finally{b.close()}
}
{
 const b=await boot(saved);try{
  assert.equal(b.api.isAuthorized(),true);assert.equal(b.api.getPlayer().id,'42');assert.deepEqual(b.requests,[],'Fresh verified session and identity should survive navigation without HTTP');assert.deepEqual(b.intervals,[]);
  b.advance(6*60*1000);b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));await tick();await tick();
  assert.equal(b.requests.length,1);assert.equal(b.requests[0].path,'/api/auth/agreement');assert.equal(b.control.registers,0,'Metadata recheck does not register key again');
  b.w.document.querySelector('[data-tab="modules"]').click();
  // Showing the Manager through the launcher connects only its own window.
  const launcher=b.w.document.querySelector('#tu-pda-launcher');for(const type of ['pointerdown','pointerup']){const e=new b.w.Event(type);Object.assign(e,{pointerId:1,pointerType:'touch',clientX:10,clientY:10});launcher.dispatchEvent(e);}await tick();
  assert.ok(b.watchers.some(w=>w.targets.has(b.w.document.querySelector('#tu-pda-panel'))));
  assert.ok(b.watchers.every(w=>![...w.targets.entries()].some(([target,options])=>target===b.w.document.body&&options.subtree)),'Manager never observes whole-page subtree');
  const panel=b.w.document.querySelector('#tu-pda-panel');panel.querySelector('[title="Exit"]').click();await tick();assert.ok(b.watchers.every(w=>w.targets.size===0),'Closing idle Manager disconnects its observations');
  b.w.document.querySelector('[data-tab="about"]').click();b.button('User Agreement').click();await tick();assert.equal(b.requests.filter(r=>r.path.endsWith('/current')).length,1,'Full agreement fetched for deliberate review');
  b.button('← About').click();b.button('User Agreement').click();await tick();assert.equal(b.requests.filter(r=>r.path.endsWith('/current')).length,1,'Review reuses full-text cache');
 }finally{b.close()}
}
{
 const stale=structuredClone(saved);const receipt=JSON.parse(stale.session[AUTH]);receipt.checkedAt-=6*60*1000;stale.session[AUTH]=JSON.stringify(receipt);
 const b=await boot(stale);try{assert.equal(b.requests.length,1);assert.equal(b.requests[0].path,'/api/auth/agreement');assert.equal(b.api.isAuthorized(),true);}finally{b.close()}
}
{
 const b=await boot(saved);try{
  b.control.accepted=false;b.control.version='fixture-v2';const status=await b.api.getAgreementVersion({refresh:true});assert.equal(status.agreement_version,'fixture-v2');assert.equal(status.accepted,false);assert.equal(b.api.isAuthorized(),false);assert.equal(b.control.accepts,0,'New versions must not be accepted automatically');assert.equal(b.w.localStorage.getItem('tu:agreement:accepted'),null);assert.equal(b.w.localStorage.getItem(VAULT),KEY);
 }finally{b.close()}
}
{
 const b=await boot(saved);try{b.control.status=401;await assert.rejects(b.api.getAgreementVersion({refresh:true}),/verification/);assert.equal(b.control.registers,0,'TU Test version bridge must stay read-only');b.advance(6*60*1000);b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));await tick();await tick();assert.equal(b.control.registers,1,'Expired token renewal is bounded');assert.equal(b.api.isAuthorized(),true);assert.equal(b.control.accepts,0);}finally{b.close()}
}
{
 const b=await boot(saved);try{b.control.status=403;await assert.rejects(b.api.getAgreementVersion({refresh:true}),/verification/);assert.equal(b.api.isAuthorized(),false);assert.equal(b.control.registers,0,'Revocation is not treated as token expiry');assert.equal(b.w.localStorage.getItem(VAULT),KEY);}finally{b.close()}
}
{
 const stale=structuredClone(saved);const identity=JSON.parse(stale.session[IDENTITY]);identity.checkedAt-=31*60*1000;stale.session[IDENTITY]=JSON.stringify(identity);
 const b=await boot(stale);try{assert.equal(b.requests.filter(r=>r.path.includes('/key/info')).length,0,'A valid session does not need key revalidation to refresh player info');assert.equal(b.requests.filter(r=>r.path.includes('/user/')).length,1);assert.equal(b.api.isAuthorized(),true);}finally{b.close()}
}
{
 const b=await boot(null,{noKey:true});try{assert.equal(b.requests.length,0,'No credentials: no background agreement/key requests');assert.deepEqual(b.intervals,[]);assert.equal(b.api.isAuthorized(),false);}finally{b.close()}
}
{
 const b=await boot(saved);try{const before=b.requests.length;b.w.localStorage.removeItem('tu:agreement:accepted');b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:'tu:agreement:accepted',newValue:null}));await tick();assert.equal(b.api.isAuthorized(),false);assert.equal(b.requests.length,before,'Cross-tab logout is event-driven, not a new polling request');assert.equal(b.w.sessionStorage.getItem(AUTH),null);}finally{b.close()}
}
console.log('Session lifecycle checks passed: warm navigation, bounded rechecks, cached full text, version changes, expiry/revocation, no idle polling and scoped observation');
