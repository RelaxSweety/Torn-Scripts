// All identity-bearing DEV requests share this coordinator. Serializing the
// complete request prevents a verified registration/report from racing erasure.
export function createIdentityCoordinator({route,verify,digest,readJson}) {
 return class IdentityCoordinator {
  constructor(state,env){this.state=state;this.env=env;}
  fetch(req){return this.state.blockConcurrencyWhile(()=>this.handle(req));}
  async handle(req){
   const storage=this.state.storage,env={...this.env,__identityStorage:storage};
   if(new URL(req.url).pathname!=='/api/auth/delete-data'){if(new URL(req.url).pathname==='/api/auth/register'&&await storage.get('active-deletion'))return Response.json({error:'Registration temporarily paused during account cleanup'},{status:503});return route(req,env);}
   const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','access-control-allow-origin':'*'}});
   if(env.TU_DELETION_ENABLED!=='true')return reply({error:'Self-service deletion is not enabled on this deployment'},503);
   if(req.method!=='POST')return reply({error:'Method not allowed'},405);
   const body=await readJson(req);
   if(!body||Object.keys(body).some(k=>!['receipt','api_key','cleanup_ack'].includes(k))||!/^[a-f0-9]{64}$/.test(body.receipt||''))return reply({error:'Invalid deletion request'},400);
   const receipt='receipt:'+await digest(body.receipt);
   let job=await storage.get(receipt);
   if(job?.complete)return reply({complete:true});
   if(!job){
    if(await storage.get('active-deletion'))return reply({error:'Another deletion is pending; retry later'},409);
    if(!/^[A-Za-z0-9]{16}$/.test(body.api_key||''))return reply({error:'Provide a Torn API key to verify account ownership'},401);
    const budget=env.REGISTRATION_BUDGET.get(env.REGISTRATION_BUDGET.idFromName('registration-global-v1'));
    const decision=await budget.fetch(new Request('https://budget.internal/reserve',{method:'POST',body:JSON.stringify({keyHash:await digest('key:'+body.api_key),ipHash:await digest('ip:'+(req.headers.get('cf-connecting-ip')||'unknown'))})}));
    if(!decision.ok)return reply({error:'Ownership verification rate-limited; retry later'},429);
    let identity;try{identity=await verify(body.api_key);}catch{return reply({error:'Ownership verification failed; retry with a valid Public Only or Limited Access key'},401);}
    const pending=await storage.get('deleting:'+identity.id);
    if(pending&&pending!==receipt)return reply({error:'Deletion already pending; resume with the original receipt'},409);
    job={id:String(identity.id),started:Date.now()};
    await storage.transaction(async tx=>{await tx.put(receipt,job);await tx.put('deleting:'+job.id,receipt);await tx.put('active-deletion',receipt);await tx.setAlarm(job.started+71000);});
   }
   if(job.ready&&body.cleanup_ack===true){await storage.transaction(async tx=>{await tx.delete('deleting:'+job.id);await tx.put(receipt,{complete:true});});return reply({complete:true});}
   return this.finish(job,receipt);
  }
  async alarm(){const receipt=await this.state.storage.get('active-deletion');if(!receipt)return;const job=await this.state.storage.get(receipt);if(job&&!job.complete)await this.finish(job,receipt);}
  async finish(job,receipt){
   const storage=this.state.storage,env=this.env;
   const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','access-control-allow-origin':'*'}});
   try{
    const db=env.TU_USERS_DB,id=job.id;
    if(job.ready)return reply({complete:false,ready_for_local_cleanup:true,session_hashes:job.sessionHashes,room_hashes:job.roomHashes||[]});
    if(!job.sessionHashes){const result=await db.prepare('SELECT token_hash FROM tu_sessions WHERE torn_id=?').bind(id).all();job.sessionHashes=result.results.map(row=>row.token_hash);await storage.put(receipt,job);}
    // Revocation happens first and remains in place on every partial failure.
    await db.prepare('DELETE FROM tu_sessions WHERE torn_id=?').bind(id).run();
    const rooms=[...(await storage.get('rooms:'+id)||[]),...JSON.parse(env.LEGACY_IDENTITY_ROOMS||'[]')];
    if(!job.roomHashes){job.roomHashes=[];for(const room of rooms){const binding=env[room.binding],stub=binding.get(room.objectId?binding.idFromString(room.objectId):binding.idFromName(room.name));const response=await stub.fetch(new Request('https://identity.internal/inspect',{method:'POST',headers:{'x-tu-erase-id':id}}));if(!response.ok)throw Error('Room inventory incomplete');job.roomHashes.push(...(await response.json()).hashes);}await storage.put(receipt,job);}
    for(const room of rooms){
     const response=await env[room.binding].get(room.objectId?env[room.binding].idFromString(room.objectId):env[room.binding].idFromName(room.name)).fetch(new Request('https://identity.internal/erase',{method:'POST',headers:{'x-tu-erase-id':id}}));
     if(!response.ok)throw Error('Room cleanup incomplete');
    }
    await env.FOREIGN_DB.prepare('DELETE FROM tu_agreement_events WHERE player_id=?').bind(id).run();
    // Audit and permission records about other users remain; remove only the
    // requester attribution and unstructured details that could repeat it.
    await db.batch([
     db.prepare('DELETE FROM tu_module_permissions WHERE torn_id=?').bind(id),
     db.prepare('UPDATE tu_module_permissions SET updated_by=NULL WHERE updated_by=?').bind(id),
     db.prepare('UPDATE tu_audit_events SET actor_torn_id=CASE WHEN actor_torn_id=? THEN NULL ELSE actor_torn_id END,target_torn_id=CASE WHEN target_torn_id=? THEN NULL ELSE target_torn_id END,details_json=NULL WHERE actor_torn_id=? OR target_torn_id=?').bind(id,id,id,id),
     db.prepare('DELETE FROM tu_users WHERE torn_id=?').bind(id)
    ]);
    // Legacy key/IP budget reservations cannot be attributed to a saved account.
    // Their bounded lifetime is allowed to expire before completion, so previous
    // supplied keys leave no pre-deletion limiter records. No key is retained.
    if(Date.now()<job.started+71000)return reply({complete:false,retry_after_seconds:Math.ceil((job.started+71000-Date.now())/1000)},202);
    for(const [binding,name] of [['REGISTRATION_BUDGET','registration-global-v1'],['SUBMISSION_BUDGET','foreign-writes-global-v1']]){const r=await env[binding].get(env[binding].idFromName(name)).fetch(new Request('https://budget.internal/prune',{method:'POST'}));if(!r.ok)throw Error('Budget cleanup incomplete');}
    await storage.transaction(async tx=>{await tx.delete('active-deletion');await tx.delete('rooms:'+id);job.ready=true;await tx.put(receipt,job);});
    return reply({complete:false,ready_for_local_cleanup:true,session_hashes:job.sessionHashes,room_hashes:job.roomHashes||[]});
   }catch{await storage.setAlarm(Date.now()+60000);return reply({complete:false,error:'Deletion incomplete; keep the receipt and retry'},503);}
  }
 };
}

export async function trackIdentityRoom(env,req,binding,name){
 const id=req.headers.get('x-tu-verified-id');
 if(!id||!env.__identityStorage)return;
 const key='rooms:'+id,rooms=await env.__identityStorage.get(key)||[];
 if(!rooms.some(r=>r.binding===binding&&r.name===name)){
  rooms.push({binding,name});await env.__identityStorage.put(key,rooms);
 }
}

export async function eraseRoomIdentity(state,req){
 if(new URL(req.url).origin!=='https://identity.internal'||!['/erase','/inspect'].includes(new URL(req.url).pathname))return null;
 const id=req.headers.get('x-tu-erase-id');if(req.method!=='POST'||!/^\d+$/.test(id||''))return new Response(null,{status:400});
 const game=await state.storage.get('game');
 if(new URL(req.url).pathname==='/inspect'){const hashes=[];for(const seat of Object.keys(game?.ids||{}))if(String(game.ids[seat])===id&&game.players?.[seat])hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(game.players[seat])))).map(n=>n.toString(16).padStart(2,'0')).join(''));return Response.json({hashes});}
 if(game?.ids&&Object.values(game.ids).some(value=>String(value)===id)){
  for(const seat of Object.keys(game.ids))if(String(game.ids[seat])===id){game.ids[seat]=null;game.players[seat]=null;if(game.names)game.names[seat]='Deleted player';}
  game.version=(game.version||0)+1;
  await state.storage.put('game',game);
 }
 return new Response(null,{status:204});
}
