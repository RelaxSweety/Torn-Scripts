// Only structured workflow fields are uploaded. DOM, page text, keys, chat and premium data never enter this queue.
export function createMonitorClient({window,getContext,send,getPreference=name=>window.localStorage.getItem(name)==='true',setPreference=(name,value)=>window.localStorage.setItem(name,String(value)),now=()=>Date.now()}){
 const storage=window.sessionStorage,key='tu:monitor:outbox:v1',pref='tu:monitor:enabled:v1:';
 let queue=[],events=[],owner='',busy=false,timer=null,lastSent=0,state='Not connected';
 const scrub=value=>String(value??'').replace(/https?:\/\/[^\s<>"']+/gi,'[URL OMITTED]').replace(/\b(?:Bearer|ApiKey)\s+[^\s,;]+/gi,'[REDACTED]').replace(/\b(?:api[_ -]?key|token|secret|authorization|password)\s*[:=]\s*["']?[^\s,"';]+/gi,'[REDACTED]').replace(/\b[A-Za-z0-9]{16}\b/g,'[REDACTED]').replace(/\b[A-Za-z0-9_-]{24,}(?:\.[A-Za-z0-9_-]+)*\b/g,'[REDACTED]').replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi,'[REDACTED]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[EMAIL OMITTED]').slice(0,1500);
 function context(){const c=getContext();const id=String(c.playerId||'');if(id!==owner){queue=[];events=[];owner=id;lastSent=0;state='Not connected';try{const raw=storage.getItem(key)||'null';const saved=raw.length<=100000?JSON.parse(raw):null;if(saved?.owner===owner&&Array.isArray(saved.queue))queue=saved.queue.filter(q=>now()-q.at<86400000&&q.at<=now()).slice(-8);else storage.removeItem(key);}catch{}}return c;}
 const enabled=()=>{const c=context();try{return !!c.authorized&&!!owner&&getPreference(pref+owner)===true;}catch{return false;}};
 const persist=()=>{try{storage.setItem(key,JSON.stringify({owner,queue}));}catch{}};
 function envelope(kind,moduleId,body={}){const c=context();return {id:window.crypto.randomUUID(),kind,moduleId,build:c.build,platform:c.platform,...body};}
 function collect(){queue=queue.filter(q=>q&&q.body&&now()-q.at<86400000&&q.at<=now());if(events.length){queue.push({at:now(),body:envelope('diagnostic','item-monitor',{events:events.splice(0,40)})});queue=queue.slice(-8);persist();}}
 async function flush(force=false){if(!enabled()||busy||!force&&now()-lastSent<60000)return false;collect();if(!queue.length)return true;const scope=owner;busy=true;lastSent=now();try{const batch=queue[0];await send(batch.body);if(scope===String(getContext().playerId||'')){queue=queue.filter(q=>q.body.id!==batch.body.id);persist();state='Last upload '+new Date(now()).toLocaleTimeString();}return true;}catch{state='Upload pending; will retry while TU is open';return false;}finally{busy=false;}}
 function record(detail){if(!enabled()||typeof detail!=='string'||detail.length>8192)return;let value;try{value=JSON.parse(detail);}catch{return;}const event={};for(const name of ['event','stage','step','result','reason'])if(typeof value[name]==='string')event[name]=scrub(value[name]).slice(0,160);if(!event.event)return;for(const name of ['amount','remainingSeconds','quantity','capacityTotal','occupiedSlots','freeSlots','attempt','repeatCount'])if(Number.isFinite(value[name])&&Math.abs(value[name])<=1e9)event[name]=value[name];event.at=new Date(now()).toISOString();events.push(event);if(events.length>=40)collect();}
 const startTimer=()=>{if(timer===null)timer=window.setInterval(()=>void flush(),60000);};
 const listener=event=>record(event.detail),hidden=()=>{if(window.document.hidden){if(enabled()){collect();void flush();}}};
 return {enabled,scrub,status:()=>state+' · '+queue.length+' queued batches',
  setEnabled(value){const c=context();if(!c.authorized||!owner)throw Error('Verified TU session required');setPreference(pref+owner,value===true);if(!value){window.clearInterval(timer);timer=null;queue=[];events=[];storage.removeItem(key);state='Uploads disabled';}else{startTimer();state='Automatic uploads enabled';}},
  moduleOpened(moduleId){if(!enabled())return;startTimer();queue.push({at:now(),body:envelope('usage',moduleId)});queue=queue.slice(-8);persist();void flush();},
  record,flush,
  async feedback(moduleId,message){const c=context();if(!c.authorized||!String(message).trim())throw Error('Enter feedback while signed in');const body=envelope('feedback',moduleId,{message:scrub(message)});await send(body);return true;},
  start(){if(timer!==null)return;context();window.document.addEventListener('tu-snatch-run-diagnostic',listener);window.document.addEventListener('visibilitychange',hidden);if(enabled())startTimer();},
  stop(){window.clearInterval(timer);timer=null;window.document.removeEventListener('tu-snatch-run-diagnostic',listener);window.document.removeEventListener('visibilitychange',hidden);},
  clear(){queue=[];events=[];try{storage.removeItem(key);setPreference(pref+owner,false);}catch{}}
 };
}
