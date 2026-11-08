export function createChatCaptureSupport(){
 const full=/^\d{1,2}:\d{2}:\d{2}\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/;
 function timestamp(root){
  if(!root)return '';for(const el of [root,...root.querySelectorAll('time,[datetime],[data-timestamp],[data-time],[title],[data-original-title]')]){
   for(const key of ['datetime','data-timestamp','data-time','title','data-original-title']){
    const raw=(el.getAttribute(key)||'').trim();if(full.test(raw))return raw;
    if(['datetime','data-timestamp','data-time'].includes(key)&&raw){let date;if(/^\d{10}(?:\d{3})?$/.test(raw))date=new Date(Number(raw)*(raw.length===10?1000:1));else if(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d\d:\d\d)$/.test(raw))date=new Date(raw);if(date&&Number.isFinite(date.getTime()))return date.toISOString();}
   }
  }return '';
 }
 // M'AOL 0.1.29 nativeMessageMeta: bounded read-only React createdAt lookup.
 function nativeMeta(item){
  if(!item)return null;const hits=new Map();let visited=0,conflict=false;
  const data=(object,key)=>{try{const descriptor=Object.getOwnPropertyDescriptor(object,key);return descriptor&&'value' in descriptor?descriptor.value:undefined;}catch{return undefined;}};
  for(const node of [item,item.querySelector('[class*=message___]')].filter(Boolean)){
   for(const key of Object.getOwnPropertyNames(node)){
    if(!key.startsWith('__reactFiber')&&!key.startsWith('__reactProps'))continue;
    const isFiber=key.startsWith('__reactFiber');let fiber=data(node,key);
    for(let depth=0;fiber&&depth<4;depth++,fiber=isFiber?data(fiber,'return'):null){
     const seen=new WeakSet();
     function walk(value,level){
      if(!value||typeof value!=='object'||seen.has(value)||level>7||++visited>1200||data(value,'nodeType'))return;seen.add(value);
      const id=typeof data(value,'id')==='string'?data(value,'id'):typeof data(value,'messageId')==='string'?data(value,'messageId'):null,at=data(value,'createdAt');
      if(id&&typeof at==='number'&&at>1500000000000&&at<2200000000000){if(hits.has(id)&&hits.get(id).at!==at)conflict=true;hits.set(id,{id,at});}
      for(const field of Object.keys(value).slice(0,60)){if(/token|auth|secret|password|cookie|apiKey/i.test(field))continue;const child=data(value,field);if(child&&typeof child==='object'&&!data(child,'nodeType')&&!data(child,'stateNode'))walk(child,level+1);}
     }
     walk(isFiber?data(fiber,'memoizedProps'):fiber,0);
    }
   }
  }
  return !conflict&&visited<=1200&&hits.size===1?[...hits.values()][0]:null;
 }
 function applyNative(record,item){const meta=nativeMeta(item);if(!meta||record.sourceMessageId&&record.sourceMessageId!==meta.id)return false;record.sourceMessageId=meta.id;record.exactTimestamp=new Date(meta.at).toISOString();record.exactTimestampUnixMs=meta.at;record.exactTimestampSource='torn-react-createdAt';return true;}
 function interrupted(before,after){return !!before&&(after.top-before.top>Math.max(80,after.viewport/2))&&Math.abs(after.height-before.height)<40&&after.height-after.viewport-after.top<40;}
 return {timestamp,nativeMeta,applyNative,interrupted};
}
