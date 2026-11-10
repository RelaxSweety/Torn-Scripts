import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import worker from '../cloudflare/tu-multiplayer-server-dev-option-a.js';
const publication=JSON.parse(fs.readFileSync(new URL('../../agreements/dev/current.json',import.meta.url),'utf8'));
const previous=JSON.parse(fs.readFileSync(new URL('../../agreements/dev/history/1.2.json',import.meta.url),'utf8'));
const users=new DatabaseSync(':memory:'),ledger=new DatabaseSync(':memory:');
users.exec(`CREATE TABLE tu_users(torn_id INTEGER PRIMARY KEY,username TEXT,faction_id INTEGER,account_status TEXT,role TEXT);
CREATE TABLE tu_sessions(id TEXT,torn_id INTEGER,token_hash TEXT,platform TEXT,expires_at INTEGER,revoked_at INTEGER);
CREATE TABLE tu_module_permissions(torn_id INTEGER,module_id TEXT,allowed INTEGER);
CREATE TABLE tu_agreement_registry(agreement_number INTEGER PRIMARY KEY,agreement_version TEXT,agreement_date TEXT,content TEXT,is_current INTEGER);
INSERT INTO tu_users VALUES(42,'Fixture',NULL,'active','user');INSERT INTO tu_module_permissions VALUES(42,'tic-tac-toe',1);`);
ledger.exec(`CREATE TABLE tu_agreement_events(event_id INTEGER PRIMARY KEY AUTOINCREMENT,player_id INTEGER,event_type TEXT,agreement_version TEXT,agreement_number INTEGER,agreement_date TEXT,request_id TEXT UNIQUE,reason TEXT,occurred_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
users.prepare('INSERT INTO tu_agreement_registry VALUES(?,?,?,?,1)').run(previous.agreement.agreement_number,previous.agreement.agreement_version,previous.agreement.agreement_date,previous.content);
ledger.prepare('INSERT INTO tu_agreement_events(player_id,event_type,agreement_version,agreement_number,agreement_date,request_id) VALUES(?,?,?,?,?,?)').run(42,'accepted',previous.agreement.agreement_version,previous.agreement.agreement_number,previous.agreement.agreement_date,'previous');
const token='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222';
users.prepare('INSERT INTO tu_sessions VALUES(?,?,?,?,?,NULL)').run('session',42,createHash('sha256').update(token).digest('hex'),'pda',Math.floor(Date.now()/1000)+3600);
function binding(db){const result={prepare(sql){return {values:[],bind(...values){this.values=values;return this;},async first(){return db.prepare(sql).get(...this.values)||null;},async all(){return {results:db.prepare(sql).all(...this.values)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...this.values).changes)}};}};}};result.batch=async statements=>{db.exec('BEGIN');try{const responses=[];for(const statement of statements)responses.push(await statement.run());db.exec('COMMIT');return responses;}catch(error){db.exec('ROLLBACK');throw error;}};return result;}
const env={TU_USERS_DB:binding(users),FOREIGN_DB:binding(ledger)},oldFetch=globalThis.fetch;let remote=publication;
const request=(path,body)=>worker.fetch(new Request('https://tu.example/api/auth/'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{})}),env);
try{
 globalThis.fetch=async()=>Response.json(remote);
 assert.equal((await request('agreement/current')).status,200);
 assert.equal(users.prepare('SELECT is_current FROM tu_agreement_registry WHERE agreement_number=?').get(publication.agreement.agreement_number).is_current,1);
 assert.equal(users.prepare('SELECT content FROM tu_agreement_registry WHERE agreement_number=3').get().content,previous.content,'Previous immutable text preserved');
 assert.equal((await (await request('agreement')).json()).accepted,false);assert.equal((await request('module-access?module_id=tic-tac-toe')).status,403);
 const count=()=>ledger.prepare('SELECT COUNT(*) AS n FROM tu_agreement_events').get().n;
 assert.equal(count(),1,'Reading a new agreement never accepts it');
 assert.equal((await request('agreement',{action:'accepted',request_id:'33333333-3333-4333-8333-333333333333',...previous.agreement})).status,409);assert.equal(count(),1);
 const accepted={action:'accepted',request_id:'44444444-4444-4444-8444-444444444444',...publication.agreement};
 assert.equal((await request('agreement',accepted)).status,200);assert.equal(count(),2);assert.equal((await request('agreement',accepted)).status,200);assert.equal(count(),2,'Idempotent acceptance');
 assert.equal((await (await request('agreement')).json()).accepted,true);assert.equal((await request('module-access?module_id=tic-tac-toe')).status,200);
 remote={...publication,content:publication.content+'\nUnapproved replacement'};assert.equal((await request('agreement/current')).status,409,'Same-number text replacement rejected');remote=publication;
 assert.equal((await request('agreement',{action:'cancelled',request_id:'55555555-5555-4555-8555-555555555555'})).status,200);assert.equal((await request('agreement')).status,401,'Cancellation revokes the session');
}finally{globalThis.fetch=oldFetch;users.close();ledger.close();}
console.log('Agreement publication passed: immutable history, new-version reacceptance, stale rejection, idempotency, module denial until accepted and cancellation');
