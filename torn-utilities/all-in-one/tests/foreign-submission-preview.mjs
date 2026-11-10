import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const preview=process.argv[2]||'/tmp/tu-foreign-auth-preview.user.js';
const code=fs.readFileSync(preview,'utf8');
assert.ok(code.includes('-foreign-auth-preview'));assert.match(code,/\/\/ @updateURL\s+none/);
for(const transport of ['pda','gm','fetch']){
 const dom=new JSDOM('<body><main>Torn</main></body>',{url:'https://www.torn.com/travelagency.php',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,timers=[],posts=[],errors=[];
 w.setInterval=(fn,ms)=>{timers.push({fn,ms});return timers.length;};w.clearInterval=()=>{};
 d.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}];};w.HTMLElement.prototype.setPointerCapture=()=>{};w.alert=()=>{};w.confirm=()=>true;w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
 w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault();});
 w.localStorage.setItem('tu:identity:public-only-key:v1','abcdef0123456789');w.localStorage.setItem('tu:agreement:accepted','fixture-v1');w.sessionStorage.setItem('tu:dev:auth:session:v1','fixture-token');
 w.localStorage.setItem('tuim-stock-reporting-v1','yes');w.localStorage.setItem('tuim-stock-upload-queue-v1',JSON.stringify([{country:'can',observed_at:Math.floor(Date.now()/1000),items:[{item_id:206,quantity:10,unit_price:500}]}]));
 function reply(url){
  if(url.endsWith('/api/auth/agreement/current'))return {agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-07'},content:'# Fixture agreement'};
  if(url.endsWith('/api/auth/agreement'))return {accepted:true,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-07'}};
  if(url.includes('/key/info'))return {info:{access:{type:'Public Only'},user:{id:42}}};
  if(url.endsWith('/api/foreign/observations'))return {ok:true,accepted:[206]};
  return {name:'Fixture',status:{state:'Abroad'}};
 }
 w.fetch=async(url,options={})=>{if(String(url).endsWith('/api/foreign/observations'))posts.push({transport:'fetch',headers:options.headers});const data=reply(String(url));return {ok:true,status:200,json:async()=>data,text:async()=>JSON.stringify(data)};};
 if(transport!=='fetch')w.GM_xmlhttpRequest=options=>{if(options.url.endsWith('/api/foreign/observations'))posts.push({transport:'gm',headers:options.headers});queueMicrotask(()=>options.onload?.({status:200,responseText:JSON.stringify(reply(options.url))}));};
 if(transport==='pda')w.PDA_httpPost=async(url,body,headers)=>{posts.push({transport:'pda',headers});return reply(url);};
 const pause=()=>new Promise(resolve=>setTimeout(resolve,70));
 try{
  w.eval(code);await pause();d.querySelector('[data-tab="modules"]').click();
  for(const name of ['Business Tools','Travel Assistant and Item Monitor'])[...d.querySelectorAll('.tu-card')].find(card=>card.querySelector('strong')?.textContent===name).querySelector('button').click();
  await pause();for(const timer of timers.filter(timer=>timer.ms===15000))timer.fn();await pause();
  assert.equal(posts.length,1,transport+' drains one queued batch');assert.equal(posts[0].transport,transport);assert.equal(posts[0].headers.Authorization,'Bearer fixture-token');
  assert.equal(JSON.parse(w.localStorage.getItem('tuim-stock-upload-queue-v1')).length,0);assert.deepEqual(errors,[]);
 }finally{w.TornUtilities?.closeActiveModule();w.close();}
}
console.log('Unpublished preview passed: real integrated Item Monitor authenticates queued stock reporting through PDA POST, GM and fetch; default release untouched');
