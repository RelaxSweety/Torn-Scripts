import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { GameRoom } from '../cloudflare/tu-multiplayer-server-dev-option-a.js';
const publication=JSON.parse(await readFile(new URL('../../agreements/dev/current.json',import.meta.url),'utf8'));
const bearer='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222';
const oldFetch=globalThis.fetch;
let actor=42,status='active',role='user',permission=1,accepted=true,expired=false,revoked=false,dbUnavailable=false,writes=[],forwarded=[];
const userDB={prepare(sql){return {values:[],bind(...values){this.values=values;return this;},async first(){
 if(dbUnavailable)throw Error('PRIVATE_DB_ERROR');
 if(sql.includes('FROM tu_sessions s JOIN')){
  assert.ok(sql.includes('s.revoked_at IS NULL')&&sql.includes('s.expires_at>?'));
  assert.match(this.values[0],/^[a-f0-9]{64}$/);assert.ok(!this.values[0].includes(bearer));
  if(expired||revoked)return null;
  return {id:'33333333-3333-4333-8333-333333333333',torn_id:actor,username:'Player_'+actor,account_status:status,role,expires_at:Math.floor(Date.now()/1000)+3600};
 }
 if(sql.includes('FROM tu_agreement_registry WHERE agreement_number='))return {...publication.agreement,content:publication.content,is_current:1};
 if(sql.includes('FROM tu_agreement_registry WHERE is_current='))return {agreement_number:publication.agreement.agreement_number};
 if(sql.includes('FROM tu_module_permissions')){assert.equal(this.values[0],actor);return {allowed:permission};}
 if(sql.includes('FROM tu_sessions WHERE id=? AND torn_id=?')){assert.equal(this.values[1],actor);return null;}
 throw Error('Unexpected fixture SQL: '+sql);
 },async run(){writes.push({sql,values:this.values});return {meta:{changes:1}};},async all(){return {results:[]};}};}};
const ledger={prepare(sql){return {bind(id){assert.equal(id,actor);return this;},async first(){assert.ok(sql.includes('FROM tu_agreement_events'));return accepted?{event_type:'accepted',...publication.agreement}:null;}};}};
const rooms=new Map();
const gameBinding={idFromName:name=>name,get(name){if(!rooms.has(name)){const data=new Map();rooms.set(name,new GameRoom({storage:{async get(key){return structuredClone(data.get(key));},async put(key,value){data.set(key,structuredClone(value));}}}));}return {async fetch(req){forwarded.push({id:req.headers.get('x-tu-verified-id'),name:req.headers.get('x-tu-verified-name')});return rooms.get(name).fetch(req);}};}};
const env={TU_USERS_DB:userDB,FOREIGN_DB:ledger,GAME:gameBinding};
function request(path,method='GET',body,extra={}){return new Request('https://tu.example'+path,{method,headers:{authorization:'Bearer '+bearer,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function run(path,method='GET',body,extra){return worker.fetch(request(path,method,body,extra),env);}
try{
 globalThis.fetch=async(url)=>{assert.ok(String(url).endsWith('/agreements/dev/current.json'));return Response.json(publication);};
 for(const mode of ['pending','suspended','revoked']){status=mode;assert.equal((await run('/api/rooms','POST',{})).status,mode==='pending'?403:401);}
 status='active';expired=true;assert.equal((await run('/api/rooms','POST',{})).status,401);expired=false;
 revoked=true;assert.equal((await run('/api/rooms','POST',{})).status,401);revoked=false;
 permission=0;assert.equal((await run('/api/rooms','POST',{})).status,403);permission=1;
 accepted=false;assert.equal((await run('/api/rooms','POST',{})).status,403);accepted=true;
 dbUnavailable=true;const unavailable=await run('/api/rooms','POST',{});assert.equal(unavailable.status,503);assert.ok(!(await unavailable.text()).includes('PRIVATE_DB_ERROR'));dbUnavailable=false;
 assert.equal(forwarded.length,0,'Rejected authorization never reaches a game object');
 for(const [path,method,body] of [['pending','GET'],['users','GET'],['approve','POST',{torn_id:99}],['status','POST',{torn_id:99,status:'active'}],['permission','POST',{torn_id:99,module_id:'tic-tac-toe',allowed:true}]]){
  assert.equal((await run('/api/auth/admin/'+path,method,body)).status,403);
 }
 assert.equal(writes.length,0,'Non-admin requests cannot modify account/permission data');
 // Caller identity fields and invented internal headers are both overwritten.
 const created=await run('/api/rooms','POST',{name:'Impersonated',playerId:'999'},{'x-tu-verified-id':'999','x-tu-verified-name':'Impersonated'});
 assert.equal(created.status,201);const owner=await created.json();assert.equal(owner.game.names.X,'Player_42');
 assert.deepEqual(forwarded.at(-1),{id:'42',name:'Player_42'});
 assert.equal((await run('/api/rooms/'+owner.room+'/join','POST',{name:'Different',playerId:'999'})).status,409,'Body spoofing cannot bypass own-room rejection');
 actor=43;const joined=await run('/api/rooms/'+owner.room+'/join','POST',{name:'Another',playerId:'888'});assert.equal(joined.status,200);const guest=await joined.json();assert.equal(guest.game.names.O,'Player_43');
 assert.equal((await run('/api/rooms/'+owner.room+'/state','GET',undefined,{'x-tu-room-token':owner.token,'x-tu-verified-id':'42'})).status,401,'Room token must belong to authenticated player');
 assert.equal((await run('/api/rooms/'+owner.room+'/state','GET',undefined,{'x-tu-room-token':guest.token})).status,200);
 actor=42;assert.equal((await run('/api/rooms/'+owner.room+'/state','GET',undefined,{'x-tu-room-token':owner.token})).status,200);
 assert.equal((await run('/api/auth/sessions/revoke','POST',{session_id:'99999999-9999-4999-8999-999999999999',torn_id:43})).status,404);
 assert.equal(writes.length,0,'Session revocation is scoped to authenticated owner');
 role='admin';permission=0;assert.equal((await run('/api/auth/module-access?module_id=tic-tac-toe')).status,200);
 accepted=false;assert.equal((await run('/api/auth/module-access?module_id=tic-tac-toe')).status,403,'Admins still require current agreement');
}finally{globalThis.fetch=oldFetch;}
console.log('Backend authorization passed: session expiry/revocation/status, agreement/permissions, admin denial, own-session scope and server-bound Tic-Tac-Toe identity/token ownership');
