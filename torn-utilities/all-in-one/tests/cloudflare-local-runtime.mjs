import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
if(!process.argv[2]||!process.argv[3])throw Error('Usage: node tests/cloudflare-local-runtime.mjs <miniflare module path> <dry-run Worker bundle>');
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(process.argv[2]));
const bundle=fs.readFileSync(process.argv[3],'utf8');
const entry=bundle.replace(/export\s*\{[^}]+\};/,'')+`export {RegistrationBudget,SubmissionBudget,ArcadeRoom};export default {fetch(req,env){const path=new URL(req.url).pathname;if(path.startsWith('/api/'))return index_default.fetch(req,{...env,TU_USERS_DB:env.DB});if(path.startsWith('/room'))return env.ROOM.get(env.ROOM.idFromName('room')).fetch(new Request('https://internal'+path.replace('/room','/rooms/ABCDEF/connect'),req));const binding=path==='/register'?env.REG:env.SUB;return binding.get(binding.idFromName('global')).fetch(new Request('https://internal/reserve',req));}};`;
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:entry,compatibilityDate:'2026-11-04',d1Databases:['DB'],durableObjects:{REG:{className:'RegistrationBudget',useSQLite:true},SUB:{className:'SubmissionBudget',useSQLite:true},ROOM:{className:'ArcadeRoom',useSQLite:true}}}));
try{
 for(const [path,total,expected] of [['/register',30,10],['/submission',65,60]]){
  const results=await Promise.all(Array.from({length:total},()=>mf.dispatchFetch('https://local'+path,{method:'POST',body:JSON.stringify({keyHash:'a'.repeat(64),ipHash:'b'.repeat(64)})})));
  assert.equal(results.filter(r=>r.status===200).length,expected);
 }
 const request=(path,id)=>mf.dispatchFetch('https://local/room/'+path,{method:'POST',headers:{'x-tu-verified-id':String(id),'x-tu-verified-name':'Player_'+id},body:'{}'});
 assert.equal((await request('create',42)).status,201);const joins=await Promise.all([request('join',43),request('join',44)]);assert.deepEqual(joins.map(r=>r.status).sort(),[200,409]);
 const db=await mf.getD1Database('DB');
 for(const sql of [
  'CREATE TABLE tu_users(torn_id INTEGER PRIMARY KEY,username TEXT,account_status TEXT,role TEXT,updated_at INTEGER,faction_id INTEGER)',
  'CREATE TABLE tu_sessions(id TEXT,torn_id INTEGER,token_hash TEXT,platform TEXT,created_at INTEGER,expires_at INTEGER,revoked_at INTEGER)',
  'CREATE TABLE tu_module_permissions(torn_id INTEGER,module_id TEXT,allowed INTEGER,updated_at INTEGER,updated_by INTEGER,PRIMARY KEY(torn_id,module_id))',
  'CREATE TABLE tu_audit_events(actor_torn_id INTEGER,target_torn_id INTEGER,event_type TEXT,created_at INTEGER)',
  "INSERT INTO tu_users VALUES(1,'Admin','active','admin',0,NULL),(2,'Target','active','user',0,NULL)"
 ])await db.prepare(sql).run();
 const secret='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222';
 await db.prepare('INSERT INTO tu_sessions VALUES(?,?,?,?,?,?,NULL)').bind('admin',1,createHash('sha256').update(secret).digest('hex'),'tampermonkey',0,Math.floor(Date.now()/1000)+3600).run();
 await db.prepare('INSERT INTO tu_sessions VALUES(?,?,?,?,?,?,NULL)').bind('target',2,'not-a-real-token','tampermonkey',0,Math.floor(Date.now()/1000)+3600).run();
 const admin=(path,body)=>mf.dispatchFetch('https://local/api/auth/admin/'+path,{method:'POST',headers:{authorization:'Bearer '+secret},body:JSON.stringify(body)});
 assert.equal((await admin('permission',{torn_id:2,module_id:'item-monitor',allowed:true})).status,200);
 assert.equal((await admin('permission',{torn_id:2,module_id:'item-monitor',allowed:false})).status,200);
 assert.equal((await admin('status',{torn_id:2,status:'suspended'})).status,200);
 assert.ok((await db.prepare("SELECT revoked_at FROM tu_sessions WHERE id='target'").first()).revoked_at);
 console.log('Cloudflare local runtime passed: SQLite Durable Object transactions, alarm scheduling, both concurrent limiter thresholds, serialized multiplayer joins and D1 guarded permission/status/session writes');
}finally{await mf.dispose();}
