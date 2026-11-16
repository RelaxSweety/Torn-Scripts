// Read-only endpoints; credentials are supplied only for api.torn.com.
export function createMarketRequest({window,http,pdaGet,fetch,getKey,authorized,now=()=>Date.now()}){
 const cache=new Map(),nextSend={torn:0,bazaar:0};let bazaarPause=0;
 async function read(kind,id,{signal,refresh=false}={}){
  if(!authorized())throw Error('Open TU and verify your session and agreement.');
  if(!['market','items','bazaar','bazaar-all'].includes(kind)||(!Number.isSafeInteger(Number(id))||Number(id)<=0)&&kind!=='bazaar-all')throw Error('Invalid item or price source.');
  const third=kind.startsWith('bazaar'),key=third?'':getKey();
  if(!third&&!/^[a-zA-Z0-9]{16}$/.test(key))throw Error('Verify a Public Only or Limited Access key in TU Settings → API Keys.');
  if(third&&now()<bazaarPause)throw Error('Bazaar rate limit reached. Wait one minute before retrying.');
  if(signal?.aborted)throw Error('Fill cancelled.');
  const token=kind+':'+id+':'+(third?'public':key),prior=cache.get(token);
  if(!refresh&&prior&&now()-prior.at<60000)return prior.data;
  const url=third?'https://weav3r.dev/api/marketplace'+(kind==='bazaar-all'?'':'/'+id):kind==='items'?'https://api.torn.com/torn/'+id+'?selections=items':'https://api.torn.com/v2/market?id='+id+'&selections=itemMarket';
  const headers={Accept:'application/json',...(!third?{Authorization:'ApiKey '+key}:{})};
  if(signal?.aborted)throw Error('Fill cancelled.');
  // Pace fresh transport requests only. Cached and fixed-price rows do not pay this wait.
  const source=third?'bazaar':'torn',delay=Math.max(0,nextSend[source]-now());nextSend[source]=Math.max(now(),nextSend[source])+(third?500:1000);
  if(delay)await new Promise((resolve,reject)=>{const abort=()=>{window.clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(Error('Fill cancelled.'));};const timer=window.setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},delay);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();});
  if(signal?.aborted||!authorized()||!third&&getKey()!==key)throw Error('TU session or key changed; request cancelled.');
  const response=await new Promise((resolve,reject)=>{
   let handle,controller,settled=false;
   const finish=(error,value)=>{if(settled)return;settled=true;window.clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
   const abort=()=>{finish(Error('Fill cancelled.'));handle?.abort?.();controller?.abort();};
   const timer=window.setTimeout(()=>{finish(Error('Price request timed out. Retry this row.'));handle?.abort?.();controller?.abort();},15000);
   signal?.addEventListener('abort',abort,{once:true});
   if(http){try{handle=http({method:'GET',url,headers,timeout:15000,anonymous:true,onload:r=>finish(null,{status:Number(r.status),text:r.responseText}),onerror:()=>finish(Error('Price network request failed. Check TU API status.')),ontimeout:()=>finish(Error('Price request timed out.')),onabort:abort});}catch{finish(Error('Price transport unavailable.'));}}
   else if(pdaGet){Promise.resolve().then(()=>pdaGet(url,headers)).then(async r=>({status:Number(r?.status),text:typeof r?.responseText==='string'?r.responseText:typeof r?.text==='function'?await r.text():typeof r?.body==='string'?r.body:JSON.stringify(r?.body??r?.data)})).then(r=>finish(null,r),()=>finish(Error('PDA price request failed.')));}
   else{controller=new window.AbortController();fetch(url,{headers,credentials:'omit',signal:controller.signal}).then(async r=>({status:r.status,text:await r.text()})).then(r=>finish(null,r),()=>finish(Error('Price network request failed.')));}
  });
  if(response.status===429){if(third)bazaarPause=now()+60000;throw Object.assign(Error('Price API rate limit reached. Retry after the cooldown.'),{status:429});}
  if(!Number.isInteger(response.status)||response.status<200||response.status>=300)throw Error('Price API HTTP '+(Number.isInteger(response.status)?response.status:'unknown')+'. Existing fields were preserved.');
  let data;try{data=JSON.parse(response.text);}catch{throw Error('Price API returned invalid JSON.');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Price API returned unsupported data.');
  if(data.error)throw Object.assign(Error('Torn API rejected the request (code '+Number(data.error.code)+'). Check TU API Keys.'),{status:[5,8].includes(Number(data.error.code))?429:400});
  if(signal?.aborted||!authorized()||!third&&getKey()!==key)throw Error('TU session or key changed; price response discarded.');
  if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(token,{at:now(),data});return data;
 }
 return {read,clear:()=>cache.clear()};
}
