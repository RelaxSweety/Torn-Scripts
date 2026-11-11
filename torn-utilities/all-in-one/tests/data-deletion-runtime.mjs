import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(process.argv[2]));
const code=fs.readFileSync(process.argv[3],'utf8').replace(/export\s*\{[^}]+\};/,'');
// This fixture-only subclass seeds an already ownership-verified job. It is
// appended to the dry-run bundle in memory and is never deployed.
const script=code+`
class FixtureCoordinator extends IdentityCoordinator {
 async handle(req){if(new URL(req.url).pathname==='/fixture-seed'){const body=await req.json();await this.state.storage.put('receipt:'+body.hash,{id:'7',started:Date.now()-72000});await this.state.storage.put('deleting:7','receipt:'+body.hash);await this.state.storage.put('active-deletion','receipt:'+body.hash);await this.state.storage.put('rooms:7',[{binding:'GAME',name:'fixture'}]);return new Response(null,{status:204});}return super.handle(req);}
}
export {FixtureCoordinator,RegistrationBudget,SubmissionBudget,GameRoom};
export default {fetch(req,env){return env.IDENTITY_COORDINATOR.get(env.IDENTITY_COORDINATOR.idFromName('fixture')).fetch(req);}};`;
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,bindings:{TU_DELETION_ENABLED:'true'},compatibilityDate:'2026-11-04',d1Databases:['TU_USERS_DB','FOREIGN_DB'],durableObjects:{IDENTITY_COORDINATOR:{className:'FixtureCoordinator',useSQLite:true},REGISTRATION_BUDGET:{className:'RegistrationBudget',useSQLite:true},SUBMISSION_BUDGET:{className:'SubmissionBudget',useSQLite:true},GAME:{className:'GameRoom',useSQLite:true}}}));
try{
 const users=await mf.getD1Database('TU_USERS_DB'),foreign=await mf.getD1Database('FOREIGN_DB');
 for(const sql of [
  'CREATE TABLE tu_users(torn_id INTEGER PRIMARY KEY,username TEXT)',
  'CREATE TABLE tu_sessions(torn_id INTEGER,token_hash TEXT)',
  'CREATE TABLE tu_module_permissions(torn_id INTEGER,updated_by INTEGER)',
  'CREATE TABLE tu_audit_events(actor_torn_id INTEGER,target_torn_id INTEGER,details_json TEXT)',
  "INSERT INTO tu_users VALUES(7,'Requester'),(8,'Independent')",
  "INSERT INTO tu_sessions VALUES(7,'revoked-token-hash'),(8,'independent-session')",
  "INSERT INTO tu_module_permissions VALUES(7,8),(8,7)",
  "INSERT INTO tu_audit_events VALUES(7,8,'attribution'),(8,8,'preserve')"
 ])await users.prepare(sql).run();
 await foreign.prepare('CREATE TABLE tu_agreement_events(player_id INTEGER)').run();
 await foreign.prepare('INSERT INTO tu_agreement_events VALUES(7),(8)').run();
 const ns=await mf.getDurableObjectNamespace('GAME'),room=ns.get(ns.idFromName('fixture'));
 const play=(action,id)=>room.fetch(new Request('https://rooms.internal/rooms/ABCDEF/'+action,{method:'POST',headers:{'x-tu-verified-id':String(id),'x-tu-verified-name':'Player_'+id},body:'{}'}));
 const own=await (await play('create',7)).json(),other=await (await play('join',8)).json();
 const receipt='c'.repeat(64),hash=createHash('sha256').update(receipt).digest('hex');
 assert.equal((await mf.dispatchFetch('https://fixture/fixture-seed',{method:'POST',body:JSON.stringify({hash})})).status,204);
 const deletion=()=>mf.dispatchFetch('https://fixture/api/auth/delete-data',{method:'POST',body:JSON.stringify({receipt})});
 const results=await Promise.all([deletion(),deletion()]);
 for(const response of results){assert.equal(response.status,200);const body=await response.json();assert.equal(body.complete,false);assert.equal(body.ready_for_local_cleanup,true);assert.deepEqual(body.session_hashes,['revoked-token-hash']);assert.ok(body.room_hashes.includes(createHash('sha256').update(own.token).digest('hex')));}
 assert.equal(await users.prepare('SELECT count(*) AS n FROM tu_users WHERE torn_id=7').first('n'),0);
 assert.equal(await users.prepare('SELECT count(*) AS n FROM tu_users WHERE torn_id=8').first('n'),1);
 assert.equal(await foreign.prepare('SELECT count(*) AS n FROM tu_agreement_events WHERE player_id=7').first('n'),0);
 const state=token=>room.fetch(new Request('https://rooms.internal/rooms/ABCDEF/state',{headers:{'x-tu-verified-id':token===own.token?'7':'8','x-tu-verified-name':'Player_8','x-tu-room-token':token}}));
 assert.equal((await state(own.token)).status,401);assert.equal((await state(other.token)).status,200);
 const ack=await mf.dispatchFetch('https://fixture/api/auth/delete-data',{method:'POST',body:JSON.stringify({receipt,cleanup_ack:true})});assert.deepEqual(await ack.json(),{complete:true});
 assert.deepEqual(await (await deletion()).json(),{complete:true});
 console.log('Deletion runtime passed: real D1, SQLite Durable Object serialization, concurrent retries, two-phase completion and per-seat isolation');
}finally{await mf.dispose();}
