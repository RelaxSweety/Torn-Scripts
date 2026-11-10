// Idempotent stock uploads only. Does not send Torn gameplay actions.
export function createSubmissionDelivery({endpoint,store,now=()=>Date.now(),pda,gm,fetch:fetchTransport,onAuthorizationFailure=()=>{}}){
 const KEY='tu:foreign:retry-after:v1';let retryAt=0;
 const readDeadline=()=>{try{return Math.max(retryAt,Number(store?.getItem(KEY))||0);}catch{return retryAt;}};
 function pause(ms){retryAt=now()+ms;try{store?.setItem(KEY,String(retryAt));}catch{}}
 function error(message,status,retryAfterMs){return Object.assign(Error(message),{status,retryAfterMs});}
 return async batch=>{
  if(readDeadline()>now())throw error('Stock upload paused; queued data retained',429,readDeadline()-now());
  const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch)};
  const transports=[pda&&(()=>pda(endpoint,options.body,options.headers)),gm&&(()=>gm(endpoint,options)),fetchTransport&&(()=>fetchTransport(endpoint,options))].filter(Boolean);
  for(let index=0;index<transports.length;index++){
   let raw,status,data,timer;const controller=new AbortController();options.signal=controller.signal;
   try{
    ({raw,status,data}=await Promise.race([(async()=>{
     const raw=await transports[index](),status=Number(raw?.status)||200;let data=raw;
     try{if(typeof raw?.json==='function')data=await raw.json();else{data=raw?.responseText??raw?.data??raw?.body??raw?.response??raw;if(data instanceof Map)data=Object.fromEntries(data);if(typeof data==='string')data=JSON.parse(data);}}catch{data=null;}
     return {raw,status,data};
    })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Transport timeout'));},12000);})]));
   }catch{if(index+1<transports.length)continue;pause(30000);throw error('Stock upload network failure; queued data retained',0,30000);}
   finally{clearTimeout(timer);controller.abort();}
   if(status>=400){
    let seconds=Number(raw?.headers?.get?.('retry-after')??data?.retry_after_seconds);
    const delay=status===429?Math.max(60000,Math.min(300000,(Number.isFinite(seconds)?seconds:60)*1000)):30000;
    pause(delay);if([401,403].includes(status))onAuthorizationFailure();
    throw error('Stock upload HTTP '+status+'; queued data retained',status,delay);
   }
   const expected=new Set(batch.items.map(item=>String(item.item_id))),accepted=data?.accepted;
   if(!data?.ok||!Array.isArray(accepted)||accepted.length!==expected.size||new Set(accepted.map(String)).size!==expected.size||accepted.some(id=>!expected.has(String(id)))){
    pause(30000);throw error('Stock receipt does not match queued item IDs',502,30000);
   }
   retryAt=0;try{store?.removeItem(KEY);}catch{}return data;
  }
  pause(30000);throw error('No supported stock upload transport',0,30000);
 };
}
