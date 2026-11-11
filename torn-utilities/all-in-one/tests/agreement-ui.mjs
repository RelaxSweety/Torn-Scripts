import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const source=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const published=JSON.parse(fs.readFileSync(new URL('../../agreements/dev/current.json',import.meta.url),'utf8'));
const pause=()=>new Promise(resolve=>setTimeout(resolve,55)),KEY='abcdef0123456789';
async function boot({oldConsent=false,holdDocument=false}={}){
 const dom=new JSDOM('<body/>',{url:'https://www.torn.com',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;const errors=[],calls=[];let accepted=false,resume;
 w.alert=()=>{};w.confirm=()=>true;w.fetch=async()=>{throw Error('Unexpected network');};w.HTMLElement.prototype.setPointerCapture=()=>{};w.addEventListener('error',event=>{errors.push(event.error);event.preventDefault();});
 if(oldConsent){w.localStorage.setItem('tu:identity:public-only-key:v1',KEY);w.localStorage.setItem('tu:agreement:accepted','1.2');w.sessionStorage.setItem('tu:dev:auth:session:v1','old-session');w.sessionStorage.setItem('tu:session:tab:v1','66666666-6666-4666-8666-666666666666');w.sessionStorage.setItem('tu:session:tab:v1:marker','old-marker');w.sessionStorage.setItem('tu:dev:authorization-cache:v1',JSON.stringify({sessionMarker:'old-marker',build:'0.5.42.85-dev',checkedAt:Date.now(),agreement:{agreement_version:'1.2',agreement_number:3,agreement_date:'2026-11-04'},accepted:true}));}
 w.GM_xmlhttpRequest=options=>{calls.push({url:options.url,method:options.method,body:options.data&&JSON.parse(options.data)});queueMicrotask(()=>{
  let data={};
  if(options.url.endsWith('/api/auth/agreement/current')){if(holdDocument){resume=()=>options.onload({status:200,responseText:JSON.stringify(published)});return;}data=published;}
  else if(options.url.endsWith('/api/auth/register'))data={token:'new-session',accessLevel:'public',playerId:42};
  else if(options.url.endsWith('/api/auth/agreement')){if(options.method==='POST')accepted=JSON.parse(options.data).action==='accepted';data={agreement:published.agreement,accepted};}
  else if(options.url.includes('/key/info'))data={info:{access:{type:'Public Only'},user:{id:42}}};
  else if(options.url.includes('/user/'))data={name:'Fixture',player_id:42};
  options.onload({status:200,responseText:JSON.stringify(data)});
 });};
 w.eval(source);await pause();
 const review=async()=>{w.document.querySelector('[data-tab="modules"]').click();await pause();return w.document.getElementById('tu-agreement-overlay');};
 return {w,dom,calls,errors,review,resume:()=>resume(),close:()=>w.close(),posts:()=>calls.filter(call=>call.method==='POST'&&call.url.endsWith('/api/auth/agreement'))};
}
{
 const b=await boot();try{const overlay=await b.review();assert.ok(overlay);assert.equal(overlay.querySelectorAll('table').length,7);assert.equal(overlay.querySelectorAll('tbody tr').length,35);assert.equal(overlay.querySelector('script,img'),null);
 const checkbox=overlay.querySelector('input[type=checkbox]'),accept=[...overlay.querySelectorAll('button')].find(button=>button.textContent==='I Agree — Continue');
 assert.equal(checkbox.checked,false);assert.equal(checkbox.disabled,false);assert.ok(overlay.textContent.includes('Agreement version '+published.agreement.agreement_version));assert.equal(overlay.querySelector('input[type=password]').value,'');
 assert.equal(overlay.querySelector('table').style.tableLayout,'fixed');assert.equal(overlay.querySelector('td').style.whiteSpace,'normal');assert.equal(overlay.querySelector('a').rel,'noopener noreferrer');
 accept.click();await pause();assert.equal(b.posts().length,0,'Unchecked consent cannot post acceptance');
 overlay.querySelector('input[type=password]').value=KEY;checkbox.checked=true;accept.click();await pause();await pause();assert.equal(b.posts().length,1);assert.equal(b.posts()[0].body.agreement_version,published.agreement.agreement_version);assert.equal(b.w.TornUtilities.isAuthorized(),true);
 b.w.document.querySelector('[data-tab="settings"]').click();[...b.w.document.querySelectorAll('.tu-card')].find(card=>card.querySelector('strong')?.textContent==='API Keys').querySelector('button').click();
 assert.equal(b.w.document.querySelector('[data-tu-key-disclosure]').querySelectorAll('table').length,7,'Saved-key entry has the approved disclosures too');assert.deepEqual(b.errors,[]);
 }finally{b.close();}
}
{
 const b=await boot({holdDocument:true});try{const overlay=await b.review();assert.equal(overlay.querySelector('input[type=checkbox]').disabled,true);const accept=[...overlay.querySelectorAll('button')].find(button=>button.textContent==='I Agree — Continue');assert.equal(accept.disabled,true);assert.equal(b.posts().length,0);[...overlay.querySelectorAll('button')].find(button=>button.textContent==='Decline / Info only').click();b.resume();await pause();assert.equal(b.posts().length,0);assert.equal(b.w.TornUtilities.isAuthorized(),false);assert.equal(b.w.document.getElementById('tu-agreement-overlay'),null);}finally{b.close();}
}
{
 const b=await boot({oldConsent:true});try{assert.equal(b.w.TornUtilities.isAuthorized(),false,'Previous consent is not current consent');const overlay=await b.review();assert.ok(overlay.textContent.includes('Agreement version '+published.agreement.agreement_version));assert.equal(overlay.querySelector('input[type=checkbox]').checked,false);assert.equal(b.posts().length,0);}finally{b.close();}
}
console.log('Agreement UI passed: wrapped tables/links, both key-entry surfaces, explicit acceptance only, loading/decline gates and stale-consent rejection');
