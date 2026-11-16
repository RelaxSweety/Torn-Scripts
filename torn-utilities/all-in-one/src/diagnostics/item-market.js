// Passive, bounded item evidence. Never invoke React getters, click controls or request prices.
export function createItemMarketDiagnostic({document,window,onChange=()=>{}}){
 const selector='[data-tmf-item-id],[data-item-id],[data-itemid],[class*=itemRowWrapper],[data-testid="sortable-item"],tr,[role=row]';
 const excluded='#tu-test-dev-panel,.tmf-icons,.tmf-settings-overlay,#tu-market-fill-window';
 const secret=/key|token|password|secret|authorization|cookie|session|csrf|owner|seller|player|user|email/i;
 const safe=s=>{let value=String(s??'');if(/^[\[{]/.test(value.trim()))try{value=JSON.stringify(JSON.parse(value),(key,v)=>secret.test(key)?'[redacted]':v);}catch{}return value.replace(/\b[a-f0-9]{16,}\b/ig,'[redacted]').replace(/((?:api[_ -]?key|token|password|secret|authorization)["']?\s*[:=]\s*["']?)[^"'\s,;}]+/ig,'$1[redacted]').slice(0,1600);};
 let active=false,timer=null,observer=null,records=[],seen=new Set(),dropped=0,retainedBytes=0,detailRecords=[];
 const attrs=el=>Object.fromEntries([...el.attributes].filter(a=>!secret.test(a.name)&&!(a.name==='value'&&el.matches('input[type=hidden],input[type=password]'))&&(/^(?:id|class|role|title|alt|type|name|min|max|step|value|checked|disabled|readonly|for)$/.test(a.name)||/^aria-/.test(a.name)||/^data-/.test(a.name))).slice(0,50).map(a=>[a.name,safe(a.value)]));
 function itemProps(el){
  const result=[];let budget=160;const visited=new WeakSet();
  const allowed=/^(?:id|uid|item_?id|item_?uid|unique_?id|inventory_?id|name|type|amount|quantity|damage|accuracy|quality|armou?r|defen[cs]e|bonus|bonuses|rarity|condition|equipped|restricted|favorite|favourite|value|price|stat|stats|weapon|item|itemData|itemDetails|props|data|children|attributes|modifiers|effect|effects|title|description|percentage|rate|is[A-Z].*)$/i;
  function visit(v,path,depth){
   if(!v||typeof v!=='object'||visited.has(v)||depth>6||budget--<=0)return;visited.add(v);
   for(const [k,d] of Object.entries(Object.getOwnPropertyDescriptors(v)).slice(0,100)){
    if(!('value' in d)||secret.test(k)||!(allowed.test(k)||Array.isArray(v)&&/^\d+$/.test(k)))continue;
    const x=d.value,p=path+'.'+k;
    if(x!==null&&typeof x==='object')visit(x,p,depth+1);
    else if(['string','number','boolean'].includes(typeof x)&&result.length<100)result.push({path:safe(p),value:typeof x==='string'?safe(x):x});
   }
  }
  for(const [k,d] of Object.entries(Object.getOwnPropertyDescriptors(el))){
   if(!('value' in d))continue;
   if(k.startsWith('__reactProps$'))visit(d.value,'props',0);
   if(k.startsWith('__reactFiber$')){const props=Object.getOwnPropertyDescriptor(d.value||{},'memoizedProps');if(props&&'value' in props)visit(props.value,'memoizedProps',0);}
  }
  return result;
 }
 function catalog(){
  const names=new Map();for(const key of ['tuim-catalog-v2','tu:market-fill:item-names'])try{const data=JSON.parse(window.localStorage.getItem(key)||'null');for(const [id,name] of key==='tuim-catalog-v2'?(data?.items||[]).map(x=>[x.id,x.name]):Object.entries(data||{}))if(/^\d+$/.test(String(id))&&typeof name==='string')names.set(String(id),safe(name));}catch{}return names;
 }
 function snapshot(){
  if(!/itemmarket/i.test(window.location.href))return [];
  const names=catalog();let rules={},restricted=[];try{rules=JSON.parse(window.localStorage.getItem('tu:market-fill:restricted-quantities')||'{}');restricted=JSON.parse(window.localStorage.getItem('tu:market-fill:excluded')||'[]').map(String);}catch{}
  const candidates=[...document.querySelectorAll(selector)].filter(el=>!el.closest(excluded)&&el.querySelector('input,[role=checkbox],[class*=priceInputWrapper],img[src*="/items/"]'));
  const primary=candidates.filter(el=>el.matches('[data-tmf-item-id],[class*=itemRowWrapper]'));
  const rows=[...primary.filter(el=>!primary.some(other=>other!==el&&other.contains(el))),...candidates.filter(el=>!primary.some(other=>other.contains(el)||el.contains(other))&&!candidates.some(other=>other!==el&&el.contains(other)&&other.querySelector('input,[role=checkbox]')))].slice(0,150);
  let captureBytes=0;return rows.map((row,index)=>{
   const allNodes=[row,...row.querySelectorAll('*')],nodes=allNodes.slice(0,500).filter(el=>!el.closest(excluded)),idEvidence=[];
   for(const el of nodes)for(const attr of ['data-item-id','data-itemid','data-tmf-item-id','data-item-uid','data-uid','data-listing-id','data-row-id','data-index','aria-controls']){const value=el.getAttribute(attr);if(value!==null)idEvidence.push({tag:el.tagName,attribute:attr,value:safe(value)});}
   const images=nodes.filter(el=>el.tagName==='IMG').map(el=>{let path='';try{path=new URL(el.getAttribute('src')||'',window.location.href).pathname;}catch{}const match=path.match(/\/items\/(\d+)(?:\D|$)/);if(match)idEvidence.push({attribute:'image-item-id',value:match[1]});return {attributes:attrs(el),path:safe(path)};});
   const ids=[...new Set(idEvidence.filter(x=>/^(?:data-item-id|data-itemid|data-tmf-item-id|image-item-id)$/.test(x.attribute)&&/^\d+$/.test(x.value)).map(x=>x.value))];
   const textNodes=[];for(const el of nodes)for(const child of el.childNodes)if(child.nodeType===3&&child.textContent.trim())textNodes.push(safe(child.textContent.trim()));
   const controls=nodes.filter(el=>el.matches('input,select,button,[role=checkbox],[role=switch]')).map(el=>({tag:el.tagName,attributes:attrs(el),value:el.matches('input[type=password],input[type=hidden]')?undefined:typeof el.value==='string'?safe(el.value):undefined,checked:typeof el.checked==='boolean'?el.checked:undefined,disabled:!!el.disabled,readOnly:!!el.readOnly,parents:[el.parentElement,el.parentElement?.parentElement].filter(Boolean).map(attrs)}));
   const result={index,attributes:attrs(row),structure:nodes.slice(0,200).map((el,index)=>({index,parent:nodes.indexOf(el.parentElement),tag:el.tagName,attributes:attrs(el),text:[...el.childNodes].filter(n=>n.nodeType===3).map(n=>safe(n.textContent.trim())).filter(Boolean).slice(0,5)})),identities:idEvidence.slice(0,100),itemIDs:ids,catalogNames:ids.map(id=>({id,name:names.get(id)||null,savedKeep:rules[id]??(restricted.includes(id)?'all':null)})),text:textNodes.slice(0,100),details:nodes.filter(el=>el.hasAttribute('title')||el.hasAttribute('aria-label')||[...el.attributes].some(a=>/^data-/.test(a.name))).slice(0,100).map(el=>({tag:el.tagName,attributes:attrs(el)})),images:images.slice(0,20),controls:controls.slice(0,30),reactItemFields:nodes.slice(0,100).flatMap(el=>itemProps(el)).slice(0,200),nodesInspected:nodes.length,truncated:allNodes.length>500};
   let serialized=JSON.stringify(result);for(const field of ['structure','details','reactItemFields','text','controls','images','identities'])while(serialized.length>32000&&result[field].length>1){result[field].pop();result.truncated=true;serialized=JSON.stringify(result);}
   if(serialized.length>32000){result.attributes=Object.fromEntries(Object.entries(result.attributes).slice(0,10).map(([k,v])=>[k,v.slice(0,200)]));result.truncated=true;}
   return result;
  }).filter(row=>{captureBytes+=JSON.stringify(row).length;return captureBytes<=524288;});
 }
 function openDetails(){
  if(!/itemmarket/i.test(window.location.href))return [];
  return [...document.querySelectorAll('[role=tooltip],[role=dialog],[class*=tooltip],[class*=Tooltip],[class*=itemInfo],[class*=item-info]')].filter(el=>!el.closest(excluded)&&el.getClientRects().length&&/damage|accuracy|quality|bonus|armou?r|weapon/i.test(el.textContent)).slice(0,20).map(el=>({attributes:attrs(el),text:safe(el.textContent),fields:[...el.querySelectorAll('[title],[aria-label],[data-damage],[data-accuracy],[data-quality]')].slice(0,25).map(attrs),reactItemFields:itemProps(el)}));
 }
 function capture(){const rows=snapshot();for(const detail of openDetails()){const signature=JSON.stringify(detail);if(!seen.has(signature)&&detailRecords.length<40&&retainedBytes+signature.length<=1048576){seen.add(signature);retainedBytes+=signature.length;detailRecords.push({at:new Date().toISOString(),...detail});}}for(const row of rows){const signature=JSON.stringify({...row,index:0});if(seen.has(signature))continue;if(records.length>=300||retainedBytes+signature.length>1048576){dropped++;continue;}retainedBytes+=signature.length;seen.add(signature);records.push({at:new Date().toISOString(),...row});}onChange('Captured '+records.length+' item-row variants'+(active?' · recording':''));return rows;}
 const schedule=()=>{if(active&&!timer)timer=window.setTimeout(()=>{timer=null;capture();},400);};
 function start(){if(active)return;active=true;capture();observer=new window.MutationObserver(changes=>{if(changes.some(c=>!c.target.parentElement?.closest(excluded)))schedule();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});window.addEventListener('scroll',schedule,true);document.addEventListener('change',schedule,true);document.addEventListener('input',schedule,true);}
 function stop(){active=false;observer?.disconnect();observer=null;window.removeEventListener('scroll',schedule,true);document.removeEventListener('change',schedule,true);document.removeEventListener('input',schedule,true);if(timer)window.clearTimeout(timer);timer=null;onChange('Recording stopped · '+records.length+' item-row variants');}
 function clear(){stop();records=[];detailRecords=[];seen.clear();dropped=0;retainedBytes=0;onChange('Item Market evidence cleared');}
 return {start,stop,clear,capture,report(){return {schemaVersion:1,mode:'passive-read-only',itemMarketDetected:/itemmarket/i.test(window.location.href),active,scope:'Mounted native item rows; scroll or open native item details while recording to capture additional evidence. No automatic clicks, submissions, fetches or private page data.',limits:{rowsPerCapture:150,retainedVariants:300,detailVariants:40,retainedCharacters:1048576,currentCharacters:524288},dropped,current:snapshot(),openDetails:openDetails(),detailRecords,records};}};
}
