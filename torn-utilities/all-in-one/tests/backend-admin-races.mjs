import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import worker from '../cloudflare/tu-multiplayer-server-dev-option-a.js';
const token='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222';
const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE tu_users(torn_id INTEGER PRIMARY KEY,username TEXT,account_status TEXT,role TEXT,updated_at INTEGER,faction_id INTEGER);
CREATE TABLE tu_sessions(id TEXT,torn_id INTEGER,token_hash TEXT,platform TEXT,created_at INTEGER,expires_at INTEGER,revoked_at INTEGER);
CREATE TABLE tu_module_permissions(torn_id INTEGER,module_id TEXT,allowed INTEGER,updated_at INTEGER,updated_by INTEGER,PRIMARY KEY(torn_id,module_id));
CREATE TABLE tu_audit_events(actor_torn_id INTEGER,target_torn_id INTEGER,event_type TEXT,created_at INTEGER);
INSERT INTO tu_users VALUES(1,'Admin','active','admin',0,NULL),(2,'Target','active','user',0,NULL);`);
db.prepare('INSERT INTO tu_sessions VALUES(?,?,?,?,?,?,NULL)').run('session',1,createHash('sha256').update(token).digest('hex'),'tampermonkey',0,Math.floor(Date.now()/1000)+3600);
let beforeWrite=null,failRevocation=false;
const binding={prepare(sql){return {values:[],bind(...values){this.values=values;return this;},async first(){return db.prepare(sql).get(...this.values)||null;},async all(){return {results:db.prepare(sql).all(...this.values)};},async run(){if(failRevocation&&sql.startsWith('UPDATE tu_sessions'))throw Error('Fixture revocation failure');if(beforeWrite&&/^(UPDATE tu_users|INSERT INTO tu_module_permissions)/.test(sql)){const action=beforeWrite;beforeWrite=null;action();}const result=db.prepare(sql).run(...this.values);return {meta:{changes:Number(result.changes)}};}};}};
binding.batch=async statements=>{db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}};
const call=(route,body)=>worker.fetch(new Request('https://tu.example/api/auth/admin/'+route,{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)}),{TU_USERS_DB:binding});
function reset(){db.exec("UPDATE tu_users SET role='admin',account_status='active' WHERE torn_id=1;UPDATE tu_users SET role='user',account_status='active' WHERE torn_id=2;DELETE FROM tu_module_permissions;DELETE FROM tu_audit_events;");}
try{
 reset();assert.equal((await call('status',{torn_id:2,status:'suspended'})).status,200);assert.equal(db.prepare('SELECT account_status FROM tu_users WHERE torn_id=2').get().account_status,'suspended');
 reset();failRevocation=true;assert.equal((await call('status',{torn_id:2,status:'suspended'})).status,503);assert.equal(db.prepare('SELECT account_status FROM tu_users WHERE torn_id=2').get().account_status,'active','Status and session revocation roll back together');failRevocation=false;
 reset();beforeWrite=()=>db.exec("UPDATE tu_users SET account_status='revoked' WHERE torn_id=2");assert.equal((await call('status',{torn_id:2,status:'suspended'})).status,409);assert.equal(db.prepare('SELECT account_status FROM tu_users WHERE torn_id=2').get().account_status,'revoked');
 reset();beforeWrite=()=>db.exec("UPDATE tu_users SET role='admin' WHERE torn_id=2");assert.equal((await call('permission',{torn_id:2,module_id:'item-monitor',allowed:true})).status,409);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tu_module_permissions').get().n,0);
 reset();assert.equal((await call('permission',{torn_id:2,module_id:'item-monitor',allowed:true})).status,200);assert.equal((await call('permission',{torn_id:2,module_id:'item-monitor',allowed:false})).status,200);assert.equal(db.prepare('SELECT allowed FROM tu_module_permissions').get().allowed,0);
 reset();beforeWrite=()=>db.exec("UPDATE tu_users SET role='user' WHERE torn_id=1");assert.equal((await call('permission',{torn_id:2,module_id:'item-monitor',allowed:true})).status,409);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tu_module_permissions').get().n,0);
 reset();db.exec("UPDATE tu_users SET account_status='pending' WHERE torn_id=2");beforeWrite=()=>db.exec("UPDATE tu_users SET account_status='suspended' WHERE torn_id=1");assert.equal((await call('approve',{torn_id:2})).status,404);assert.equal(db.prepare('SELECT account_status FROM tu_users WHERE torn_id=2').get().account_status,'pending');
}finally{db.close();}
console.log('Admin mutation races passed against SQLite: stale target status/role and revoked actor authority cannot overwrite concurrent changes; permission insert/upsert work');
