import {JSDOM} from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {authorizeToolRequest} from '../src/adapters/tool-request.js';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const tools=JSON.parse(fs.readFileSync(new URL('../config/tools.json',import.meta.url)));
const tick=()=>new Promise(r=>setTimeout(r,30));
async function boot({sandbox=false,authorized=true,accepted=true,access='public',gm=true}={}){
 const dom=new JSDOM('<html><head></head><body><main>Torn fixture</main></body></html>',{url:'https://www.torn.com/index.php',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,requests=[],errors=[],observers=[],intervals=new Set();
 const nativeSet=w.setInterval.bind(w),nativeClear=w.clearInterval.bind(w);w.setInterval=(...args)=>{const id=nativeSet(...args);intervals.add(id);return id};w.clearInterval=id=>{intervals.delete(id);nativeClear(id)};
 const Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(fn){super(fn);observers.push(this)}};
 w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});
 w.console.error=(...args)=>errors.push(args.map(String).join(' '));
 w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
 w.HTMLElement.prototype.getClientRects=function(){return this.hidden||this.style.display==='none'?[]:[{width:300,height:400}]};
 w.HTMLElement.prototype.setPointerCapture=()=>{};
 w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({canvas:this,measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop(){}})},{get(t,k){return t[k]??(()=>{})},set(t,k,v){t[k]=v;return true}})};
 if(authorized){w.localStorage.setItem('tu:identity:public-only-key:v1','abcdef0123456789');w.localStorage.setItem('tu:agreement:accepted','test-v1');w.sessionStorage.setItem('tu:dev:auth:session:v1','mock-session');}
 const response=url=>{
 requests.push(url);
 if(url.endsWith('/api/auth/agreement/current'))return {agreement:{agreement_version:'test-v1',agreement_number:1,agreement_date:'2026-11-05'},content:'# Published agreement\n\nComplete fixture agreement.'};
 if(url.endsWith('/api/auth/register'))return {token:'mock-session',accessLevel:access,playerId:4539436};
 if(url.endsWith('/api/auth/agreement'))return {accepted,agreement:{agreement_version:'test-v1',agreement_number:1,agreement_date:'2026-11-05'}};
 if(url.includes('/key/info'))return {info:{access:{type:'Public Only'},user:{id:4539436}}};
 if(url.includes('/user/'))return {name:'Fixture Player',player_id:4539436};
 return {};
 };
 w.fetch=async url=>({ok:true,status:200,json:async()=>response(String(url)),text:async()=>JSON.stringify(response(String(url)))});
 w.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onload?.({status:200,responseText:JSON.stringify(response(o.url))}));return {abort(){}}};
 if(!gm)delete w.GM_xmlhttpRequest;
 if(sandbox){const page=new w.EventTarget();page.TornUtilities=undefined;w.unsafeWindow=page;}
 try{w.eval(code)}catch(e){errors.push(e)}
 await tick();
 return {intervals,close:()=>{for(const o of observers)o.disconnect();dom.window.close()},dom,w,requests,errors,api:(w.unsafeWindow||w).TornUtilities};
}
let checks=0;
for(const sandbox of [false,true]){
 const {intervals,close,dom,w,requests,errors,api}=await boot({sandbox});
 try{
 assert.equal(api?.isAuthorized(),true);checks++;
 for(const t of tools)assert.equal(api.isRegistered(t.id),true,t.id);checks++;
 w.eval(code);assert.equal(w.document.querySelectorAll('#tu-pda-launcher').length,1);checks++;
 assert.equal(api.isRegistered('alerts-calculations'),false,'Removed tool must not register');
 assert.equal(w.document.querySelector('#tuim-panel'),null,'Startup must not initialize Travel tool');checks++;
 assert.ok(!requests.some(u=>u.includes('modules.json')));checks++;
 w.document.querySelector('[data-tab="about"]').click();
 const button=text=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===text);
 button('Version Notes').click();assert.ok(w.document.body.textContent.includes('0.5.42.56-dev'));checks++;
 button('← About').click();button('User Agreement').click();await tick();assert.ok(w.document.body.textContent.includes('Complete fixture agreement.'));checks++;
 for(const tool of tools){
  api.closeActiveModule();
  w.document.querySelector('[data-tab="modules"]').click();
  const openCard=name=>{const card=[...w.document.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent===name);assert.ok(card,'Card '+name);card.querySelector('button').click()};
  if(['single-player','multiplayer'].includes(tool.category)){openCard('Games');openCard(tool.category==='single-player'?'Single Player':'Multiplayer')}
  else openCard(tool.category==='business'?'Business Tools':tool.category==='chat'?'Chat Tools':'War Tools');
  const timerCount=intervals.size;
  openCard(tool.name);await tick();
  if(errors.length)console.log(tool.id,errors);
  assert.equal(api.isActive(tool.id),true,'Activate '+tool.id);checks++;
  api.closeActiveModule();await tick();assert.equal(api.isActive(tool.id),false,'Deactivate '+tool.id);checks++;
  assert.equal(intervals.size,timerCount,'Interval cleanup '+tool.id);checks++;
  openCard(tool.name);await tick();assert.equal(api.isActive(tool.id),true,'Reopen '+tool.id);checks++;
  const ids=[...w.document.querySelectorAll('[id]')].map(e=>e.id);if(new Set(ids).size!==ids.length)console.log(ids.filter((id,i)=>ids.indexOf(id)!==i));assert.equal(new Set(ids).size,ids.length,'Duplicate windows '+tool.id);checks++;
  api.closeActiveModule();await tick();assert.equal(intervals.size,timerCount,'Repeated interval cleanup '+tool.id);checks++;

 }

 assert.equal(errors.length,0);checks++;
 }finally{close()}
}
for(const options of [{authorized:false},{accepted:false},{gm:false}]){
 const {api,close,errors}=await boot(options);try{assert.equal(api.isAuthorized(),!(options.authorized===false||options.accepted===false));assert.equal(errors.length,0);checks+=2}finally{close()}
}
for(const access of ['public','limited','full']){
 const {w,api,close}=await boot({authorized:false,access});try{
  const button=text=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===text);
  button('User Agreement').click();await tick();button('Review and Accept Terms').click();await tick();
  const key=w.document.querySelector('input[placeholder*="16-character"]');key.value='abcdef0123456789';
  button('Show').click();assert.equal(key.type,'text');button('Hide').click();assert.equal(key.type,'password');checks+=2;
  w.document.querySelector('input[type="checkbox"]').checked=true;button('I Agree — Continue').click();await tick();await tick();
  assert.equal(api.isAuthorized(),access!=='full','Registration access '+access);checks++;
 }finally{close()}
}
{
 const {w,api,close,errors}=await boot();try{
  const button=text=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===text);
  const card=name=>[...w.document.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent===name).querySelector('button').click();
  api.storage.set('flight-game','settings',{volume:0.5});
  w.document.querySelector('[data-tab="settings"]').click();card('Storage & Backups');
  let exported;w.Blob=class{constructor(parts){exported=parts.join('')}};w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
  button('Export backup').click();
  assert.equal(JSON.parse(exported).modules['flight-game'].settings.volume,0.5);checks++;
  assert.ok(!exported.includes('abcdef0123456789')&&!exported.includes('mock-session'));checks++;
  api.storage.remove('flight-game','settings');api.storage.set('flight-game','other',true);
  const nativeClick=w.HTMLInputElement.prototype.click;w.HTMLInputElement.prototype.click=function(){if(this.type!=='file')return nativeClick.call(this);Object.defineProperty(this,'files',{value:[{text:async()=>exported}]});this.dispatchEvent(new w.Event('change'));};
  button('Restore backup').click();await tick();
  assert.equal(api.storage.get('flight-game','settings').volume,0.5);assert.equal(api.storage.get('flight-game','other'),true);checks+=2;
  button('← Settings').click();card('Time Display');const select=w.document.querySelector('[aria-label="TU time display"]');select.value='tct';select.dispatchEvent(new w.Event('change'));assert.equal(w.localStorage.getItem('tu-time-display'),'tct');checks++;
  const panel=w.document.querySelector('#tu-pda-panel');panel.hidden=false;
  panel.querySelector('[title="Minimize"]').click();assert.equal(panel.hidden,true);checks++;
  const launcher=w.document.querySelector('#tu-pda-launcher');const pointer=type=>{const e=new w.Event(type);Object.assign(e,{pointerId:1,pointerType:'touch',clientX:10,clientY:10});launcher.dispatchEvent(e)};pointer('pointerdown');pointer('pointerup');await tick();assert.equal(panel.hidden,false);checks++;
  button('← Settings').click();card('Diagnostics');button('Open Diagnostics').click();assert.ok(w.document.querySelector('#tu-diagnostics-window pre').textContent.includes('toolCount'));assert.ok(!w.document.querySelector('#tu-diagnostics-window pre').textContent.includes('abcdef0123456789'));checks+=2;
  panel.querySelector('[title="Exit"]').click();assert.equal(panel.hidden,true);assert.equal(errors.length,0);checks+=2;
 }finally{close()}
}
for(const route of ['rooms','connect','battleship','marbles']){
 const options={headers:{Authorization:'Bearer room-fixture','Content-Type':'application/json'}};
 const prepared=authorizeToolRequest('https://tu-multiplayer-server-dev.tuserver.workers.dev/api/'+route+'/ROOM/state',options,{authorized:true,token:'account-fixture'});
 assert.equal(prepared.headers.Authorization,'Bearer account-fixture');assert.equal(prepared.headers['x-tu-room-token'],'room-fixture');assert.equal(options.headers.Authorization,'Bearer room-fixture');checks+=3;
 assert.throws(()=>authorizeToolRequest('https://tu-multiplayer-server-dev.tuserver.workers.dev/api/'+route,options,{authorized:false}),/authentication/);checks++;
}
const untouched={headers:{Authorization:'ApiKey fixture'}};assert.equal(authorizeToolRequest('https://api.torn.com/v2/key/info',untouched),untouched);checks++;
console.log(`Integration checks passed: ${checks}`);
