import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const A='aaaaaaaaaaaaaaaa',B='bbbbbbbbbbbbbbbb',C='cccccccccccccccc',D='dddddddddddddddd',E='eeeeeeeeeeeeeeee',F='ffffffffffffffff';
const VAULT='tu:identity:public-only-key:v1',WHO='tu:who:limited-api-key:v1',EXTRAS='tu:api:additional-keys:v1',RING='tu:identity:saved-keys:v1',ACCESS='tu:identity:login-access-level:v1';
const tick=()=>new Promise(r=>setTimeout(r,30));
async function boot({local=null,gmInitial=A,deleteGM=true,clearGM=true,privateStore=false,gmEntries=null,gmFailWrite=false}={}){
 const dom=new JSDOM('<body/>',{url:'https://www.torn.com/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const clickHandlers=new WeakMap(),nativeAdd=w.EventTarget.prototype.addEventListener;w.EventTarget.prototype.addEventListener=function(type,handler,...rest){if(type==='click'&&this.tagName==='BUTTON'){const handlers=clickHandlers.get(this)||[];handlers.push(handler);clickHandlers.set(this,handlers);}return nativeAdd.call(this,type,handler,...rest);};
 const observers=[],errors=[],requests=[];let gmKey=gmInitial;const privateValues=new Map(gmEntries||[[VAULT,gmInitial]]);if(privateStore)w.GM_info={scriptHandler:'Tampermonkey'};
 const Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(fn){super(fn);observers.push(this)}};
 w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});w.console.error=(...args)=>errors.push(args.join(' '));w.alert=()=>{};w.confirm=()=>true;
 const fixtures=new Map([[A,{level:'Public Only',id:42}],[B,{level:'Public Only',id:42}],[C,{level:'Limited Access',id:42}],[D,{level:'Limited Access',id:42}],[E,{level:'Full Access',id:42}],[F,{level:'Limited Access',id:99}]]);
 const control={registrationFailure:false,cancelFailure:false,accepted:true,cancellations:0};
 if(local)for(const [k,v] of Object.entries(local))w.localStorage.setItem(k,v);
 else{w.localStorage.setItem(VAULT,A);w.localStorage.setItem(ACCESS,'limited');w.localStorage.setItem(WHO,C);w.localStorage.setItem(EXTRAS,JSON.stringify([{key:B,level:'Limited Access'},{key:C,level:'Limited Access'},{key:A,level:'Public Only'}]));w.localStorage.setItem('tu:agreement:accepted','fixture-v1');}
 w.sessionStorage.setItem('tu:dev:auth:session:v1','fixture-session');
 w.fetch=async()=>{throw Error('Unexpected fetch in fixture')};
 w.GM_getValue=privateStore?(key,fallback)=>privateValues.has(key)?privateValues.get(key):fallback:()=>gmKey;if(clearGM)w.GM_setValue=(key,value)=>{if(privateStore){if(gmFailWrite)throw Error('Private storage unavailable');privateValues.set(key,value);}else gmKey=value;};if(deleteGM)w.GM_deleteValue=key=>{if(privateStore)privateValues.delete(key);else gmKey='';};
 w.GM_xmlhttpRequest=o=>{requests.push(o);queueMicrotask(()=>{
  let status=200,data={};
  if(o.url.endsWith('/api/auth/agreement/current'))data={agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-05'},content:'Complete fixture agreement.'};
  else if(o.url.endsWith('/api/auth/register')){const key=JSON.parse(o.data).api_key;if(control.registrationFailure){status=403;data={error:'Rejected fixture registration'}}else data={token:'new-fixture-session',accessLevel:fixtures.get(key)?.level==='Limited Access'?'limited':'public',playerId:fixtures.get(key)?.id};}
  else if(o.url.endsWith('/api/auth/agreement')){
   if(o.method==='POST'&&JSON.parse(o.data).action==='cancelled'){control.cancellations++;if(control.cancelFailure){status=503;data={error:'Cancellation unavailable'}}else{control.accepted=false;data={ok:true}}}
   else data={accepted:control.accepted,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-05'}};
  }else if(o.url.includes('/key/info')){const key=o.headers.Authorization.replace('ApiKey ',''),fixture=fixtures.get(key);data=fixture?{info:{access:{type:fixture.level},user:{id:fixture.id}}}:{error:{error:'Rejected fixture key'}};}
  else if(o.url.includes('/user/'))data={name:'Fixture player'};
  o.onload?.({status,responseText:JSON.stringify(data)});
 });};
 w.eval(code);await tick();await tick();
 const button=(root,label)=>[...root.querySelectorAll('button')].find(b=>b.textContent===label);
 const settings=()=>{w.document.querySelector('[data-tab="settings"]').click();const card=[...w.document.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent==='API Keys');card.querySelector('button').click();};
 const row=key=>[...w.document.querySelectorAll('[data-tu-key-entry]')].find(r=>r.querySelector('input')?.value===key);
 const save=async key=>{const form=w.document.querySelector('#tu-pda-panel form');form.querySelector('input').value=key;form.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick();};
 return {dom,w,control,fixtures,errors,requests,row,button,settings,save,trusted:element=>{for(const handler of clickHandlers.get(element)||[])handler.call(element,{isTrusted:true});},gmKey:()=>gmKey,gmEntries:()=>[...privateValues.entries()],local:()=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)])),close:()=>{for(const o of observers)o.disconnect();dom.window.close()}};
}
let local;
{
 const b=await boot();try{
  b.settings();assert.equal(b.row(A).querySelector('strong').textContent,'Public Only (TU login)','Stale global access flag must not mislabel active key');
  assert.equal(b.w.document.querySelectorAll('[data-tu-key-entry]').length,3,'Legacy stores recovered and deduplicated');
  assert.ok(b.row(B).textContent.includes('Access level unverified'),'Legacy role label is not trusted');
  b.button(b.row(B),'Recheck access level').click();await tick();assert.equal(b.row(B).querySelector('strong').textContent,'Public Only');
  await b.save(C);await b.save(D);await b.save(B);await b.save(B);
  assert.equal(b.w.document.querySelectorAll('[data-tu-key-entry]').length,4,'All validated keys saved separately; duplicates excluded');
  assert.equal(b.w.localStorage.getItem(VAULT),A,'Adding a key must not replace login');assert.equal(b.w.localStorage.getItem(WHO),C,'Saving another Limited key preserves selected War key');
  assert.ok(b.row(C).querySelector('strong').textContent.includes('Limited Access'));assert.ok(b.row(D).querySelector('strong').textContent.includes('Limited Access'));
  assert.equal(b.row(B).querySelector('input').type,'password');b.button(b.row(B),'Show / Hide').click();assert.equal(b.row(B).querySelector('input').type,'text');
  await b.save(E);assert.equal(b.row(E),undefined,'Unsupported keys not added');
  await b.save(F);assert.ok(b.row(F));b.button(b.row(F),'Use for War Organizer').click();await tick();assert.equal(b.w.localStorage.getItem(WHO),C,'A different player key cannot be selected for current War Organizer');
  b.button(b.row(D),'Use for War Organizer').click();await tick();assert.equal(b.w.localStorage.getItem(WHO),D);assert.ok(b.row(C),'Replacing a role does not remove prior key');
  b.control.registrationFailure=true;b.button(b.row(B),'Use for TU login').click();await tick();assert.equal(b.w.localStorage.getItem(VAULT),A,'Registration failure leaves current login intact');
  b.control.registrationFailure=false;b.button(b.row(B),'Use for TU login').click();await tick();await tick();assert.equal(b.w.localStorage.getItem(VAULT),B);assert.equal(b.w.localStorage.getItem(ACCESS),'public');assert.ok(b.row(A),'Explicit switch preserves previous login key');
  b.button(b.row(C),'Remove').click();await tick();assert.equal(b.row(C),undefined);assert.equal(b.control.cancellations,0,'Non-active deletion does not cancel agreement');assert.ok(!b.w.localStorage.getItem(EXTRAS).includes(C),'Selected key removed from legacy copies');
  b.button(b.w.document,'← Settings').click();const storageCard=[...b.w.document.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent==='Storage & Backups');storageCard.querySelector('button').click();
  let exported='';b.w.Blob=class{constructor(parts){exported=parts.join('')}};b.w.URL.createObjectURL=()=> 'blob:fixture';b.w.URL.revokeObjectURL=()=>{};b.w.HTMLAnchorElement.prototype.click=()=>{};
  b.button(b.w.document,'Export backup').click();for(const key of [A,B,D,F])assert.ok(!exported.includes(key),'Saved-key records must stay out of Manager backups');
  assert.deepEqual(b.errors,[]);local=b.local();
 }finally{b.close()}
}
{
 const b=await boot({local,gmInitial:B});try{
  b.settings();assert.equal(b.w.document.querySelectorAll('[data-tu-key-entry]').length,4,'Saved keys survive reload without deleted-key resurrection');assert.equal(b.row(C),undefined);assert.ok(b.row(A));assert.ok(b.row(B));assert.ok(b.row(D));assert.ok(b.row(F));
  b.control.cancelFailure=true;b.button(b.row(B),'Remove').click();await tick();assert.ok(b.row(B));assert.equal(b.w.localStorage.getItem(VAULT),B,'Cancellation failure retains active key');
  b.control.cancelFailure=false;b.button(b.row(B),'Remove').click();await tick();assert.equal(b.w.localStorage.getItem(VAULT),null);assert.equal(b.gmKey(),'');assert.ok(!b.w.localStorage.getItem(RING).includes(B));assert.ok(!b.w.localStorage.getItem(EXTRAS).includes(B));assert.ok(b.w.localStorage.getItem(RING).includes(A));assert.ok(b.w.localStorage.getItem(RING).includes(D));
  assert.ok(b.w.document.querySelector('#tu-agreement-overlay'),'Active removal requires explicit new consent/login');
  assert.deepEqual(b.errors,[]);
 }finally{b.close()}
}
{
 const b=await boot({deleteGM:false,clearGM:false});try{
  b.settings();b.button(b.row(A),'Remove').click();await tick();assert.equal(b.gmKey(),A,'Fixture emulates inaccessible stale GM storage');
  const reloaded=await boot({local:b.local(),gmInitial:A,deleteGM:false,clearGM:false});try{assert.equal(reloaded.w.localStorage.getItem(VAULT),null,'A deliberately cleared login must not be restored from stale GM fallback');}finally{reloaded.close()}
 }finally{b.close()}
}
{
 const b=await boot();try{b.settings();b.control.accepted=false;b.button(b.row(B),'Use for TU login').click();await tick();await tick();assert.equal(b.w.localStorage.getItem(VAULT),A,'Agreement still needed; current key not silently replaced');const field=b.w.document.querySelector('#tu-agreement-overlay input[type=password]');assert.equal(field.value,B);assert.equal(field.type,'password');assert.ok(JSON.parse(b.w.localStorage.getItem(RING)).some(e=>e.key===A));}finally{b.close()}
}
{
 const b=await boot();try{
  b.settings();await b.save(C);await b.save(F);b.button(b.row(F),'Use for TU login').click();await tick();await tick();assert.equal(b.w.localStorage.getItem(VAULT),F);assert.equal(b.w.localStorage.getItem(WHO),null,'Switching account clears only the incompatible War role, not its saved key');assert.ok(b.row(C));
  b.w.localStorage.setItem(WHO,C);await assert.rejects(b.w.TornUtilities.requestWhoTorn('/v2/faction/1'),/current TU player/,'Wrong-player stored keys must not be used for Torn requests');
 }finally{b.close()}
}
console.log('Saved-key regression checks passed: per-key levels, legacy migration, multiple keys, explicit selection, reload, account isolation, targeted removal and stale GM fallback');

let privateLocal,privateGM;
{
 const b=await boot({privateStore:true});try{
  b.settings();for(const key of [VAULT,WHO,EXTRAS,RING])assert.equal(b.w.localStorage.getItem(key),null,'No private credential origin copy: '+key);
  assert.ok(b.w.document.body.textContent.includes('userscript-manager storage'));
  const rows=[...b.w.document.querySelectorAll('[data-tu-key-entry]')];assert.ok(rows.length>=3);for(const row of rows)assert.equal(row.querySelector('input').value,'','Private saved keys are absent from masked DOM inputs');
  const first=rows.find(row=>row.querySelector('input').placeholder.endsWith(A.slice(-4)));const reveal=b.button(first,'Show / Hide');reveal.click();assert.equal(first.querySelector('input').value,'','Synthetic reveal is rejected');b.trusted(reveal);assert.equal(first.querySelector('input').value,A);b.trusted(reveal);assert.equal(first.querySelector('input').value,'','Hide removes the raw DOM value');
  await b.save(D);assert.equal(b.w.localStorage.getItem(RING),null);assert.ok(b.gmEntries().some(([key,value])=>key==='tu:credentials:private:v1'&&value.includes(D)));
  privateLocal=b.local();privateGM=b.gmEntries();assert.deepEqual(b.errors,[]);
 }finally{b.close();}
}
{
 const b=await boot({privateStore:true,local:privateLocal,gmEntries:privateGM});try{b.settings();assert.ok([...b.w.document.querySelectorAll('[data-tu-key-entry] input')].some(input=>input.placeholder.endsWith(D.slice(-4))),'Private saved ring survives reload');assert.equal(b.w.localStorage.getItem(VAULT),null);assert.deepEqual(b.errors,[]);}finally{b.close();}
}
console.log('Private Manager credential integration passed: migration, empty masked DOM fields, trusted reveal/hide, key addition and private reload');

{
 const b=await boot({privateStore:true,gmFailWrite:true});try{assert.equal(b.w.localStorage.getItem(VAULT),A,'Failed migration preserves original credentials');assert.ok(b.w.document.querySelector('[role=alert]')?.textContent.includes('Private credential storage'));assert.ok(!b.requests.some(request=>request.url.startsWith('https://api.torn.com')),'No API fallback reads legacy keys after private storage fails');assert.deepEqual(b.errors,[]);}finally{b.close();}
}
