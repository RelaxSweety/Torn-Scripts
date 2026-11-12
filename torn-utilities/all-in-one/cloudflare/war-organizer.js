// DEV faction coordination. Called only inside the serialized identity coordinator.
// Native Torn keys are request-scoped; FFScouter data/keys never enter this service.
const OWNER='4539436',identities=new Map(),nativeReads=new Map();
const positive=value=>/^[1-9][0-9]{0,11}$/.test(String(value||''));
const defaults=()=>({enemyFactionId:null,enemyName:'',reservationLimit:1,reservationTimer:5,attackForfeit:0,slots:{}});
const reply=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','access-control-allow-origin':'*'}});
// Keep each Durable Object value below its 128 KiB limit even for a full
// faction using ten reservations per member. Each target has its own record.
async function loadRoom(storage,faction){
 const room=await storage.get('war:room:'+faction);if(!room)return null;
 if(Array.isArray(room.reservationTargets)){const rows=await Promise.all(room.reservationTargets.map(async target=>[target,await storage.get('war:bookings:'+faction+':'+target)||[]]));room.reservations=Object.fromEntries(rows);}return room;
}
async function saveRoom(storage,faction,room){
 const write=async tx=>{const key='war:room:'+faction,previous=await tx.get(key),targets=Object.keys(room.reservations).filter(target=>room.reservations[target].length);for(const target of previous?.reservationTargets||[])if(!targets.includes(target))await tx.delete('war:bookings:'+faction+':'+target);for(const target of targets)await tx.put('war:bookings:'+faction+':'+target,room.reservations[target]);const {reservations,...metadata}=room;await tx.put(key,{...metadata,reservationTargets:targets});};
 await storage.transaction(write);
}
export async function eraseWarIdentity(storage,id){
 for(const faction of await storage.get('war:index:'+id)||[]){const room=await loadRoom(storage,faction);if(!room)continue;delete room.admins?.[id];for(const [target,entries] of Object.entries(room.reservations||{})){room.reservations[target]=entries.filter(entry=>entry.playerId!==String(id));if(!room.reservations[target].length)delete room.reservations[target];}room.version++;await saveRoom(storage,faction,room);}await storage.delete('war:index:'+id);await storage.delete('war:rate:'+id);
 for(const [key,value] of identities)if(value.value?.id===String(id))identities.delete(key);
}
export async function handleWar(req,env,actor,{read:providerRead,readJson,now=()=>Math.floor(Date.now()/1000)}={}){
 const deadline=Date.now()+20000;const read=(url,key,signal)=>{if(Date.now()>=deadline)throw Error('Verification deadline');return providerRead(url,key,AbortSignal.any([signal,AbortSignal.timeout(Math.max(1,deadline-Date.now()))]));};
 const storage=env.__identityStorage,path=new URL(req.url).pathname;if(!storage||!positive(actor?.id))return reply({error:'Verified coordination unavailable'},503);
 if(!['GET','POST'].includes(req.method)||req.method==='GET'&&path!=='/api/war/state')return reply({error:'Method not allowed'},405);
 const key=req.headers.get('x-tu-war-key')||'';if(!/^[A-Za-z0-9]{16}$/.test(key))return reply({error:'A verified TU/War API key is required'},400);
 let body;if(req.method==='POST'){body=await readJson(req,12000);if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Invalid war request'},400);}
 const fresh=req.method==='POST';const rateKey='war:rate:'+actor.id,rate=(await storage.get(rateKey)||[]).filter(time=>time>now()-60);if(rate.length>=60)return reply({error:'War request limit reached. Retry shortly.'},429);rate.push(now());await storage.put(rateKey,rate);
 async function native(path,cacheKey,ttl=10){const cached=nativeReads.get(cacheKey);if(!fresh&&cached&&cached.until>now())return cached.value;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const data=await read('https://api.torn.com'+path,key,controller.signal);nativeReads.set(cacheKey,{value:data,until:now()+ttl});while(nativeReads.size>500)nativeReads.delete(nativeReads.keys().next().value);return data;}finally{clearTimeout(timer);}}
 try{
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))).map(x=>x.toString(16).padStart(2,'0')).join('');let identity=identities.get(fingerprint);
  if(fresh||!identity||identity.until<=now()){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const info=await read('https://api.torn.com/v2/key/info',key,controller.signal);let id=info?.info?.user?.id,faction=info?.info?.user?.faction_id;if(!positive(id)||String(id)!==String(actor.id))return reply({error:'War key must belong to the signed-in player'},403);if(!positive(faction)){const data=await read('https://api.torn.com/v2/user/profile',key,controller.signal),profile=data?.profile;if(String(profile?.id)!==String(id))return reply({error:'Faction ownership verification unavailable'},503);faction=profile.faction?.id;}if(!positive(faction))return reply({error:'Faction membership is required'},403);identity={until:now()+15,value:{id:String(id),faction:String(faction)}};identities.set(fingerprint,identity);while(identities.size>2000)identities.delete(identities.keys().next().value);}finally{clearTimeout(timer);}}
  if(identity.value.id!==String(actor.id))return reply({error:'War key owner mismatch'},403);const faction=identity.value.faction;
  const [basicData,membersData]=await Promise.all([native('/v2/faction/'+faction+'/basic','basic:'+faction),native('/v2/faction/'+faction+'/members','members:'+faction)]),basic=basicData?.basic,members=membersData?.members;
  if(String(basic?.id)!==faction||!positive(basic?.leader_id)||!Array.isArray(members)||!members.some(m=>String(m.id)===String(actor.id)))return reply({error:'Current faction membership/leadership could not be verified'},503);
  const own=new Map(members.filter(m=>positive(m.id)).map(m=>[String(m.id),m])),automatic=[OWNER,String(basic.leader_id),...(positive(basic.co_leader_id)?[String(basic.co_leader_id)]:[])];
  const room=await loadRoom(storage,faction)||{settings:defaults(),admins:{},reservations:{},version:0,settingsVersion:0};
  async function index(id){const name='war:index:'+id,rooms=await storage.get(name)||[];if(!rooms.includes(faction)){rooms.push(faction);await storage.put(name,rooms);}}
  await index(String(actor.id));for(const id of Object.keys(room.admins))if(!own.has(id))delete room.admins[id];
  const isAdmin=automatic.includes(String(actor.id))||room.admins[String(actor.id)]===true;
  let enemy=new Map(),enemyAvailable=true;if(positive(room.settings.enemyFactionId)){let data;try{data=await native('/v2/faction/'+room.settings.enemyFactionId+'/members','members:'+room.settings.enemyFactionId,5);}catch{}if(!Array.isArray(data?.members))enemyAvailable=false;else enemy=new Map(data.members.filter(m=>positive(m.id)).map(m=>[String(m.id),m]));}
  function sweep(){for(const [target,entries] of Object.entries(room.reservations)){room.reservations[target]=entries.filter(entry=>own.has(entry.playerId)&&(!enemyAvailable||enemy.has(target))&&(!entry.expiresAt||entry.expiresAt>now()));for(const entry of room.reservations[target])if(!entry.readyAt&&enemy.get(target)?.status?.state==='Okay'){entry.readyAt=now();entry.expiresAt=room.settings.attackForfeit?now()+room.settings.attackForfeit:null;}if(!room.reservations[target].length)delete room.reservations[target];}}
  sweep();if(enemyAvailable)for(const target of Object.keys(room.settings.slots))if(!enemy.has(target))delete room.settings.slots[target];
  async function snapshot(status=200){room.version++;await saveRoom(storage,faction,room);return reply({factionId:faction,viewerId:String(actor.id),serverTime:now(),version:room.version,enemyAvailable,settingsVersion:room.settingsVersion,isAdmin:automatic.includes(String(actor.id))||room.admins[String(actor.id)]===true,adminIds:[...new Set([...automatic.filter(id=>own.has(id)),...Object.keys(room.admins)])],automaticAdminIds:automatic,settings:room.settings,reservations:room.reservations},status);}
  if(req.method==='GET')return snapshot();
  const action=path.slice('/api/war/'.length),adminActions=['settings','admin','slots','boot','reset'];
  if(adminActions.includes(action)&&!isAdmin)return reply({error:'Faction War administrator access required'},403);
  const expectedKeys={settings:['expectedVersion','enemyFactionId','reservationLimit','reservationTimer','attackForfeit'],admin:['targetId','enabled'],slots:['targetId','slots'],reserve:['targetId'],release:['targetId','reservationId'],boot:['targetId','reservationId'],attack:['targetId','reservationId'],reset:['mode']};
  if(!Object.hasOwn(expectedKeys,action)||Object.keys(body).some(k=>!expectedKeys[action].includes(k)))return reply({error:'Unsupported war action'},400);
  if(action==='settings'){
   if(body.expectedVersion!==room.settingsVersion)return reply({error:'War settings changed. Reload settings before saving.'},409);
   if(!Number.isInteger(body.reservationLimit)||body.reservationLimit<1||body.reservationLimit>10||!Number.isInteger(body.reservationTimer)||body.reservationTimer<1||body.reservationTimer>30||!Number.isInteger(body.attackForfeit)||body.attackForfeit<0||body.attackForfeit>60)return reply({error:'Invalid reservation or forfeit settings'},400);
   const counts={};for(const entries of Object.values(room.reservations))for(const entry of entries)counts[entry.playerId]=(counts[entry.playerId]||0)+1;if(Object.values(counts).some(count=>count>body.reservationLimit))return reply({error:'Release excess reservations before lowering the player limit'},409);
   const destination=body.enemyFactionId==null||body.enemyFactionId===''?null:String(body.enemyFactionId);if(destination&&(!positive(destination)||destination===faction))return reply({error:'Select an opposing faction'},400);
   let name='';if(destination){const data=await native('/v2/faction/'+destination+'/basic','basic:'+destination);if(String(data?.basic?.id)!==destination)return reply({error:'Opposing faction could not be verified'},400);name=String(data.basic.name||destination).slice(0,100);}
   if(destination!==room.settings.enemyFactionId){room.reservations={};room.settings.slots={};}
   if(body.attackForfeit!==room.settings.attackForfeit)for(const entries of Object.values(room.reservations))for(const entry of entries){entry.readyAt=null;entry.expiresAt=null;}
   Object.assign(room.settings,{enemyFactionId:destination,enemyName:name,reservationLimit:body.reservationLimit,reservationTimer:body.reservationTimer,attackForfeit:body.attackForfeit});room.settingsVersion++;sweep();return snapshot();
  }
  if(action==='admin'){const id=String(body.targetId);if(!own.has(id)||typeof body.enabled!=='boolean')return reply({error:'Select a current faction member'},400);if(automatic.includes(id))return reply({error:'Automatic administrators cannot be removed or reassigned'},403);if(body.enabled){room.admins[id]=true;await index(id);}else delete room.admins[id];return snapshot();}
  if(action==='reset'){if(!['reservations','all'].includes(body.mode))return reply({error:'Choose a reset mode'},400);room.reservations={};if(body.mode==='all'){room.settings=defaults();room.settingsVersion++;}return snapshot();}
  const target=String(body.targetId);if(!positive(target)||!enemy.has(target))return reply({error:'Target is not in the configured opposing faction'},400);const entries=room.reservations[target]||[],mine=entries.find(entry=>entry.playerId===String(actor.id)),member=enemy.get(target),capacity=room.settings.slots[target]||1;
  if(action==='slots'){if(!Number.isInteger(body.slots)||body.slots<1||body.slots>Math.min(1000,own.size))return reply({error:'Invalid Tag Team capacity'},400);if(entries.length>body.slots)return reply({error:'Boot excess reservations before reducing capacity'},409);room.settings.slots[target]=body.slots;return snapshot();}
  if(action==='reserve'){
   if(mine)return snapshot();if(entries.length>=capacity)return reply({error:'All reservation slots are full'},409);
   if(Object.values(room.reservations).flat().filter(entry=>entry.playerId===String(actor.id)).length>=room.settings.reservationLimit)return reply({error:'Your reservation limit has been reached'},409);
   const status=member.status?.state,remaining=Number(member.status?.until)-now();if(!['Okay','Traveling','Abroad'].includes(status)&&!(status==='Hospital'&&remaining>0&&remaining<=room.settings.reservationTimer))return reply({error:'Target is not yet eligible for reservation'},409);
   const ready=status==='Okay';entries.push({id:crypto.randomUUID(),playerId:String(actor.id),name:String(own.get(String(actor.id)).name||actor.name).slice(0,32),createdAt:now(),readyAt:ready?now():null,expiresAt:ready&&room.settings.attackForfeit?now()+room.settings.attackForfeit:null});room.reservations[target]=entries;return snapshot();
  }
  if(action==='release'||action==='boot'){const entry=entries.find(entry=>entry.id===body.reservationId);if(!entry)return snapshot();if(action==='release'&&entry.playerId!==String(actor.id))return reply({error:'Only your own reservation can be released'},403);room.reservations[target]=entries.filter(value=>value.id!==entry.id);return snapshot();}
  if(action==='attack'){if(entries.length&&(!mine||mine.id!==body.reservationId))return reply({error:'This target is reserved. A reservation of your own is required'},403);if(member.status?.state!=='Okay')return reply({error:'Target is not currently Okay'},409);await saveRoom(storage,faction,room);return reply({attackUrl:'https://www.torn.com/loader.php?sid=attack&user2ID='+target,serverTime:now()});}
  return reply({error:'Unsupported action'},400);
 }catch{return reply({error:'War verification/service unavailable. Retry later.'},503);}
}
