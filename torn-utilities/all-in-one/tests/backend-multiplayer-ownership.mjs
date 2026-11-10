import assert from 'node:assert/strict';
import {GameRoom,ArcadeRoom,MarbleRoom} from '../cloudflare/tu-multiplayer-server-dev-option-a.js';
function state(){let tail=Promise.resolve();const data=new Map();return {data,blockConcurrencyWhile(fn){const result=tail.then(fn);tail=result.catch(()=>{});return result;},storage:{async get(k){return structuredClone(data.get(k));},async put(k,v){data.set(k,structuredClone(v));}}};}
function req(path,id=42,body={},token){return new Request('https://internal'+path,{method:path.endsWith('/state')?'GET':'POST',headers:{'x-tu-verified-id':String(id),'x-tu-verified-name':'Player_'+id,...(token?{'x-tu-room-token':token}:{})},...(!path.endsWith('/state')?{body:JSON.stringify(body)}:{})});}
for(const [Class,base,body] of [[GameRoom,'/rooms/ABCDEF',{}],[ArcadeRoom,'/rooms/ABCDEF/connect',{}],[ArcadeRoom,'/rooms/ABCDEF/battleship',{}],[MarbleRoom,'/rooms/ABCDEF',{count:2}]]){
 const storage=state(),room=new Class(storage),created=await room.fetch(req(base+'/create',42,body));assert.equal(created.status,201);const owner=await created.json();
 assert.equal((await room.fetch(req(base+'/join',42))).status,409);
 const joins=await Promise.all([room.fetch(req(base+'/join',43)),room.fetch(req(base+'/join',44))]);assert.deepEqual(joins.map(r=>r.status).sort(),[200,409],'Concurrent join only claims one seat');
 const guest=await joins.find(r=>r.status===200).json();
 assert.equal((await room.fetch(req(base+'/state',43,{},owner.token))).status,401);
 assert.equal((await room.fetch(req(base+'/state',42,{},owner.token))).status,200);
 assert.equal((await room.fetch(req(base+'/state',43,{},guest.token))).status,200);
 const stored=storage.data.get('game');delete stored.ids;storage.data.set('game',stored);
 assert.equal((await room.fetch(req(base+'/state',42,{},owner.token))).status,401,'No insecure legacy seat bypass');
}
console.log('All multiplayer ownership passed: verified seats, own-room denial, concurrent join serialization, token/account binding and fail-closed legacy rooms');
