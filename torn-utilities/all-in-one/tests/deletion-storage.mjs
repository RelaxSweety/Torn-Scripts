import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {createCredentialStore} from '../src/adapters/credential-store.js';
import {createSessionTokenStore} from '../src/adapters/session-token-store.js';
const dom=new JSDOM('',{url:'https://www.torn.com'}),w=dom.window,data=new Map();
Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});
const gm={getValue:(k,f)=>data.has(k)?data.get(k):f,setValue:(k,v)=>data.set(k,v),deleteValue:k=>data.delete(k),listValues:()=>[...data.keys()]};
const A='a'.repeat(16),B='b'.repeat(16),VAULT='tu:identity:public-only-key:v1',RING='tu:identity:saved-keys:v1';
try{
 const credentials=createCredentialStore({window:w,handler:'Tampermonkey',...gm});
 credentials.set(VAULT,A);credentials.set(RING,JSON.stringify([{key:A,playerId:'7'},{key:B,playerId:'8'}]));
 w.localStorage.setItem(VAULT,'GMV2_'+JSON.stringify(A));data.set(VAULT,A);
 credentials.eraseKeys([A]);assert.equal(credentials.get(VAULT),null);assert.equal(w.localStorage.getItem(VAULT),null);assert.equal(data.has(VAULT),false);
 assert.deepEqual(JSON.parse(credentials.get(RING)),[{key:B,playerId:'8'}]);
 const own='own-session',other='other-session',hash=v=>createHash('sha256').update(v).digest('hex');
 const sessions=createSessionTokenStore({window:w,privateMode:true,...gm});sessions.set(own);
 data.set('tu:session:private:v1:closed-own',JSON.stringify({token:own,marker:'m',expiresAt:Date.now()+86400000}));
 data.set('tu:session:private:v1:closed-other',JSON.stringify({token:other,marker:'m',expiresAt:Date.now()+86400000}));
 await sessions.eraseHashes([hash(own)]);assert.equal(sessions.get(),'');assert.equal(data.has('tu:session:private:v1:closed-own'),false);assert.equal(JSON.parse(data.get('tu:session:private:v1:closed-other')).token,other);
 sessions.set(other);await sessions.eraseHashes([hash(own)]);assert.equal(sessions.get(),other,'Unrelated current session survives targeted cleanup');
 const missingEnumeration=createSessionTokenStore({window:w,privateMode:true,...gm,listValues:undefined});await assert.rejects(missingEnumeration.eraseHashes([hash(other)]),/enumeration/);
 const failure=createSessionTokenStore({window:w,privateMode:true,...gm,deleteValue:()=>{}});await assert.rejects(failure.eraseHashes([hash(other)]),/cleanup failed/);
 const blocked=createSessionTokenStore({window:w,privateMode:true,...gm,blocked:()=>true});assert.throws(()=>blocked.set('late-session'),/deletion/);
 console.log('Deletion storage passed: legacy key encodings, private/origin copies, other-account preservation, closed-tab sessions, failed deletion and late-write prevention');
}finally{w.close();}
