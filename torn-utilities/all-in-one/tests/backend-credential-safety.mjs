import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../cloudflare/tu-multiplayer-server-dev-option-a.js';
const KEY='aa11bb22cc33dd44',SECRET='PRIVATE_ERROR_'+KEY,originalFetch=globalThis.fetch,originalWarn=console.warn;
let scenario='',outgoing=[],writes=[],warnings=[];
console.warn=(...args)=>warnings.push(args.join(' '));
globalThis.fetch=async(url,options)=>{
 outgoing.push({url,options});if(scenario==='network-secret')throw Error(SECRET);if(scenario==='http429')return new Response(SECRET,{status:429});if(scenario==='http503')return new Response(SECRET,{status:503});
 if(String(url).endsWith('/key/info')){if(scenario.startsWith('code:'))return Response.json({error:{code:Number(scenario.slice(5)),error:SECRET}});return Response.json({info:{access:{type:scenario==='full'?'Full Access':'Limited Access'},user:{id:42}}});}
 return Response.json({profile:{id:scenario==='mismatch'?43:42,name:'Fixture_Player'}});
};
const budget={idFromName:name=>name,get:()=>({fetch:async()=>Response.json({allowed:true})})};
function database(){return {prepare(sql){const statement={values:[],bind(...values){this.values=values;return this;},async first(){if(scenario==='database-secret')throw Error(SECRET);return null;},async run(){writes.push({sql,values:this.values});return {success:true};}};return statement;}};}
function registration(body){return new Request('https://tu-multiplayer-server-dev.example/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});}
async function invoke(body={api_key:KEY,platform:'pda'}){outgoing=[];writes=[];return worker.fetch(registration(body),{TU_USERS_DB:database(),REGISTRATION_BUDGET:budget});}
try{
 for(const mode of ['','mismatch','full','network-secret','http429','http503','code:2','code:5','code:8','code:9','code:13','code:18','database-secret']){
  scenario=mode;const response=await invoke(),text=await response.text();assert.ok(!text.includes(KEY)&&!text.includes(SECRET),'Responses exclude the raw key and upstream cause');assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(!JSON.stringify(writes).includes(KEY),'Raw keys never appear in application DB bindings');
  if(!mode){assert.equal(response.status,201);assert.equal(outgoing.length,2);const data=JSON.parse(text),session=writes.find(x=>x.sql.includes('INSERT INTO tu_sessions'));assert.equal(session.values[2],crypto.createHash('sha256').update(data.token).digest('hex'));assert.ok(!JSON.stringify(writes).includes(data.token),'Only the session-token hash is stored');}
  else if(['http429','code:5','code:8'].includes(mode)){assert.equal(response.status,429);assert.equal(JSON.parse(text).code,'TORN_RATE_LIMIT');assert.equal(response.headers.get('retry-after'),'60');assert.equal(outgoing.length,1);}
  else if(mode==='full'){assert.equal(response.status,403);assert.equal(outgoing.length,1);}
  else if(['code:2','code:13','code:18'].includes(mode)){assert.equal(response.status,401);assert.equal(outgoing.length,1);}
  else assert.equal(response.status,503);
  for(const call of outgoing){assert.equal(new URL(call.url).origin,'https://api.torn.com');assert.ok(!call.url.includes(KEY),'Key is sent in authorization header, never URL');assert.equal(call.options.headers.Authorization,'ApiKey '+KEY);}
 }
 scenario='';for(const body of [{api_key:KEY+'extra',platform:'pda'},{api_key:KEY,platform:'pda',password:SECRET},{api_key:KEY,platform:'pda',requested_access:'full'}]){const response=await invoke(body);assert.equal(response.status,400);assert.equal(outgoing.length,0,'Malformed registration never contacts Torn');assert.ok(!(await response.text()).includes(SECRET));}
 // Read chunked/undeclared bodies only up to the limit and cancel oversized streams.
 let cancelled=false;const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('x'.repeat(2049)));},cancel(){cancelled=true;}});
 outgoing=[];const oversized=await worker.fetch(new Request('https://tu.example/api/auth/register',{method:'POST',body:stream,duplex:'half'}),{TU_USERS_DB:database(),REGISTRATION_BUDGET:budget});assert.equal(oversized.status,400);assert.equal(cancelled,true);assert.equal(outgoing.length,0);
 // Generic D1/publication failures must not reflect arbitrary exception messages.
 globalThis.fetch=async()=>{throw Error(SECRET);};const agreement=await worker.fetch(new Request('https://tu.example/api/auth/agreement/current'),{TU_USERS_DB:database(),REGISTRATION_BUDGET:budget});assert.equal(agreement.status,503);assert.ok(!(await agreement.text()).includes(SECRET));
 globalThis.fetch=async()=>Response.json({});const failed=await worker.fetch(registration({api_key:KEY,platform:'pda'}),{get TU_USERS_DB(){throw Error(SECRET);}});assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes(SECRET));assert.ok(warnings.every(message=>['TU_REQUEST_FAILED','TU_FOREIGN_COLLECTION_FAILED'].includes(message)));
}finally{globalThis.fetch=originalFetch;console.warn=originalWarn;}
console.log('DEV Worker credential safety passed: exact key validation, bounded bodies, safe error classes, rate-limit/outage distinction, header-only keys, hashed sessions, DB canaries and generic-error redaction');
