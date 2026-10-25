// ==UserScript==
// @name         TU Travel Assistant and Item Monitor
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      1.10.26-dev
// @description  Persistent foreign, shop and item market quantity and price alerts
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @connect      tu-multiplayer-server.tuserver.workers.dev
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/item-monitor.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/item-monitor.user.js
// @run-at       document-idle
// ==/UserScript==
// TU Manager authorization gate (development): no module initialization before verified consent.
(()=>{
  let started=false;
  const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
  const run=()=>{
    if(started||host.TornUtilities?.isAuthorized?.()!==true)return;
    started=true;
    startModule();
  };
  const onAuth=e=>{
    if(e?.detail?.authorized===false&&started){location.reload();return;}
    run();
  };
  host.addEventListener('tu-authorization-change',onAuth);
  host.addEventListener('torn-utilities-ready',run);
  function startModule(){

(()=>{
  'use strict';const TU_MODULE_VERSION=(typeof GM_info!=='undefined'&&GM_info?.script?.version)||'1.10.23';
if(window.__TU_ITEM_MONITOR__)return;window.__TU_ITEM_MONITOR__=true;
const ID='item-monitor',KEY='tu-item-monitor-v1',OLD='tuac-watches';
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
const state={items:load(KEY,[]),cfg:load('tuac-settings',{}),panel:null,context:null,picking:false,selected:null,observer:null,alarmTimers:[],audio:null,muted:false,catalog:null,catalogWindow:null};
const save=()=>localStorage.setItem(KEY,JSON.stringify(state.items.map(({category,name,key,minQty,maxPrice})=>({category,name,key,minQty,maxPrice}))));
const saveCfg=()=>localStorage.setItem('tuac-settings',JSON.stringify(state.cfg));
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const text=e=>e?.innerText||e?.textContent||'';
const money=v=>{const m=String(v||'').match(/\$\s*([\d,]+(?:\.\d+)?)/);return m?Number(m[1].replaceAll(',','')):NaN};
const pageItem=()=>{
 const params=new URLSearchParams(location.search);
 const id=params.get('itemID')||params.get('itemId')||params.get('item_id')||params.get('ID');
 const visible=e=>e&&e.getClientRects().length>0;
 const exact=e=>text(e).trim().replace(/\s+/g,' ');
 const invalid=/^(item market|owner|cost|qty|buy|search for an item|text based rpg\s*-\s*torn)$/i;
 let name='';
 // The active item name is the bar immediately above the Owner / Cost / Qty / Buy listing headers.
 const owner=[...document.querySelectorAll('th,div,span')].find(e=>visible(e)&&exact(e)==='Owner'&&e.children.length===0);
 if(owner){
   let table=owner.parentElement;
   for(let i=0;i<5&&table;i++,table=table.parentElement){
     const t=exact(table);
     if(/\bCost\b/.test(t)&&/\bQty\b/.test(t)){
       const prev=table.previousElementSibling;
       const candidates=[prev,table.parentElement?.previousElementSibling,table.parentElement?.parentElement?.previousElementSibling];
       for(const el of candidates){
         if(!visible(el))continue;
         const leaves=[...el.querySelectorAll('div,span,strong,h2,h3,h4')].filter(x=>visible(x)&&x.children.length===0).map(exact);
         const val=leaves.find(x=>x.length>0&&x.length<90&&!invalid.test(x)&&!x.includes('$'))||exact(el);
         if(val&&val.length<90&&!invalid.test(val)&&!val.includes('$')){name=val;break}
       }
       if(name)break;
     }
   }
 }
 if(!name){
   const el=[...document.querySelectorAll('[class*=itemName],[class*=ItemName],[class*=itemTitle],[class*=ItemTitle],h3,h4')].find(e=>visible(e)&&exact(e).length>0&&exact(e).length<90&&!invalid.test(exact(e))&&e.closest('[class*=market],[class*=Market],main'));
   if(el)name=exact(el);
 }
 return name?{key:'name:'+norm(name),name}:null;
};
const listingSelector='[data-listing-id],[data-seller-id],tr,[role=row],[class*=sellerRow],[class*=SellerRow],[class*=listingRow],[class*=ListingRow],[class*=marketRow],[class*=MarketRow]';
const listings=()=>[...document.querySelectorAll(listingSelector)].filter(e=>!e.closest('#tuim-panel,#tu-pda-panel')&&Number.isFinite(listingPrice(e))&&(!e.parentElement?.closest(listingSelector)));
const listingPrice=row=>{const unit=row.querySelector('[data-unit-price],[class*=unitPrice],[class*=UnitPrice],[class*=pricePer],[class*=PricePer]');if(unit){const n=money(unit.getAttribute('data-unit-price')||text(unit));if(Number.isFinite(n))return n}for(const el of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const n=money(el.getAttribute('data-price')||text(el));if(Number.isFinite(n))return n}return money(text(row))};
const candidates='[data-item-id],[data-itemname],[data-item-name],tr,[role=row],li,[class*=itemWrap],[class*=ItemWrap],[class*=itemRow],[class*=ItemRow],[class*=itemCard],[class*=ItemCard],[class*=row],[class*=Row],[class*=card],[class*=Card]';
const category=()=>{const url=(location.pathname+location.search+location.hash).toLowerCase();if(/itemmarket|item-market|item_market|market.php|item.php/.test(url))return 'Item Market';const abroad=/travel|abroad|foreign|country|cayman|japan|mexico|canada|hawaii|switzerland|china|argentina|unitedkingdom|southafrica|uae/i.test(url)||document.querySelector('[class*=foreignStock],[class*=ForeignStock]');const stockTable=[...document.querySelectorAll('table, [role=table]')].some(t=>/\bStock\b/i.test(text(t).slice(0,300))&&/\bCost\b/i.test(text(t).slice(0,300))&&/\bBuy\b/i.test(text(t).slice(0,300)));if(abroad||stockTable)return 'Foreign';if(/shop|store|bazaar|city/.test(url))return 'Stores';return 'Other'};
const nameOf=row=>{const e=row.querySelector('[data-itemname],[data-item-name],[class*=itemName],[class*=ItemName],[class*=name],[class*=Name]');return (e?.getAttribute('data-itemname')||e?.getAttribute('data-item-name')||text(e)||text(row)).split('\n').map(x=>x.trim()).find(Boolean)?.slice(0,90)||''};
const idOf=row=>row.getAttribute('data-item-id')||row.querySelector('[data-item-id]')?.getAttribute('data-item-id')||'';
const keyOf=row=>idOf(row)?'id:'+idOf(row):'name:'+norm(nameOf(row));
const foreignRow=w=>[...document.querySelectorAll('tr,[role=row]')].filter(r=>!r.closest('#tuim-panel,#tuim-catalog,#tu-pda-panel')&&r.getClientRects().length&&[...r.querySelectorAll('td,[role=cell]')].some(c=>norm(text(c)).includes(norm(w.name)))).sort((a,b)=>text(a).length-text(b).length)[0]||null;
const foreignStock=row=>{const cells=[...row.querySelectorAll(':scope > td,:scope > [role=cell]')];if(cells.length>=4){const raw=text(cells[cells.length-3]).trim();if(/^\\d[\\d,]*$/.test(raw))return Number(raw.replaceAll(',',''))}return quantity(row)};
const quantity=row=>{for(const e of row.querySelectorAll('[data-stock],[data-quantity],[class*=stock],[class*=Stock],[class*=quantity],[class*=available]')){const raw=e.getAttribute('data-stock')||e.getAttribute('data-quantity')||text(e);const m=raw.match(/(?:stock|quantity|available|remaining|in stock)?\s*:?\s*([\d,]+)/i);if(m)return Number(m[1].replaceAll(',',''))}const m=text(row).match(/(?:stock|quantity|available|remaining)\s*:?\s*([\d,]+)/i);return m?Number(m[1].replaceAll(',','')):NaN};
const price=row=>{for(const e of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const raw=e.getAttribute('data-price')||text(e);const m=raw.match(/\$\s*([\d,]+(?:\.\d+)?)/)||raw.match(/^\s*([\d,]+(?:\.\d+)?)\s*$/);if(m)return Number(m[1].replaceAll(',',''))}const m=text(row).match(/\$\s*([\d,]+(?:\.\d+)?)/);return m?Number(m[1].replaceAll(',','')):NaN};
const E=(tag,parent,t)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;parent?.append(e);return e};
const B=(p,t,f)=>{const b=E('button',p,t);b.type='button';b.onclick=f;return b};
function style(){if(document.getElementById('tuim-style'))return;const e=E('style',document.head||document.documentElement);e.id='tuim-style';e.textContent='#tuim-panel{position:fixed;z-index:2147483642;top:10vh;left:4vw;width:min(92vw,440px);min-width:220px;min-height:160px;max-width:calc(100vw - 12px);height:min(62dvh,540px);max-height:calc(100dvh - 160px)!important;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;resize:both;box-sizing:border-box;overflow-wrap:anywhere;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;font:14px/1.45 system-ui;display:block}#tuim-panel[hidden]{display:none!important}#tuim-panel *{box-sizing:border-box}#tuim-panel button{max-width:100%;white-space:normal;margin:0;padding:8px 12px;background:#d6b65c;color:#111;border:0;border-radius:5px;line-height:1.3;min-height:36px}#tuim-panel input[type=range]{touch-action:none!important;accent-color:#d6b65c;user-select:none}#tuim-panel input,#tuim-panel select{display:block;width:100%;box-sizing:border-box;padding:8px;margin:4px 0 12px;background:#283239;color:white;min-height:40px}#tuim-panel label{display:block;margin:12px 0 4px;line-height:1.4}#tuim-panel .tuim-header{display:flex;align-items:center;gap:8px;position:sticky;top:0;background:#11191d;z-index:10;padding:12px;margin:0 0 12px;touch-action:none;cursor:move;min-height:76px;border-bottom:1px solid #806a3e;isolation:isolate}#tuim-panel .tuim-header strong{flex:1;min-width:0;font-size:18px;line-height:1.3;overflow-wrap:anywhere}#tuim-panel .tuim-header [data-tu-brand-emblem]{align-self:center;flex:0 0 44px!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important}#tuim-panel .tuim-header button{flex:0 0 38px;padding:7px}#tuim-panel p{display:block;margin:12px 0!important;line-height:1.5!important;min-height:0!important}#tuim-panel h3{display:block;font-size:19px;line-height:1.35!important;margin:22px 0 12px!important;padding:0!important;clear:both}#tuim-panel .tuim-entry{display:block;border:1px solid #3ba35b;border-radius:6px;padding:12px;margin:10px 0 16px;line-height:1.5}#tuim-panel .tuim-entry strong,#tuim-panel .tuim-entry small{display:block;margin:4px 0;line-height:1.5}#tuim-panel .tuim-entry button{display:block;margin-top:10px}#tuim-panel div,#tuim-panel p,#tuim-panel small{overflow-wrap:anywhere}#tuim-panel>button{display:block;margin:12px 0}#tuim-panel #tuim-status{margin:16px 0 20px!important}.tuim-watch,.tuim-wait{outline:3px solid #d83030!important;outline-offset:-2px!important}.tuim-trigger{outline:4px solid #00ff69!important;outline-offset:-2px!important}'}
function travelStyle(){if(document.getElementById('tuim-travel-style'))return;const x=E('style',document.head||document.documentElement);x.id='tuim-travel-style';x.textContent="#tuim-data-window{position:fixed;z-index:2147483646;top:13vh;left:8vw;width:min(85vw,440px);height:min(65dvh,540px);min-width:250px;min-height:180px;max-width:100vw;max-height:96dvh;resize:both;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;font:14px/1.45 system-ui}#tuim-data-window *{box-sizing:border-box}#tuim-data-window .tuim-travel-header{display:flex;align-items:center;gap:8px;position:sticky;top:-12px;background:#11191d;padding:8px 0 12px;z-index:3;touch-action:none;cursor:move}#tuim-data-window .tuim-travel-header strong{flex:1;font-size:17px}#tuim-data-window button{background:#d6b65c;color:#111;border:0;border-radius:6px;min-height:32px;padding:5px 10px}#tuim-data-window .tuim-travel-card{border:1px solid #39434a;border-radius:9px;background:#1b252b;padding:11px}#tuim-data-window .tuim-travel-line{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #344047}#tuim-data-window .tuim-travel-line span{color:#c3c9cd;flex:1}#tuim-data-window .tuim-travel-line strong{text-align:right;flex:1}#tuim-data-window small{display:block;color:#b3bbc0;font-size:12px;margin-top:10px}"+"#tuim-travel-window{position:fixed;z-index:2147483645;top:8vh;left:5vw;width:min(92vw,520px);height:min(82dvh,750px);min-width:280px;min-height:260px;max-width:100vw;max-height:96dvh;resize:both;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;font:14px/1.45 system-ui}#tuim-travel-window *{box-sizing:border-box}#tuim-travel-window .tuim-travel-header{display:flex;align-items:center;justify-content:space-between;position:sticky;top:-12px;background:#11191d;padding:8px 0 12px;z-index:3;touch-action:none;cursor:move}#tuim-travel-window .tuim-travel-header strong{font-size:19px}#tuim-travel-window button{padding:9px 12px;background:#d6b65c;color:#111;border:0;border-radius:6px;min-height:36px}#tuim-travel-window .tuim-travel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#tuim-travel-window label{display:block;font-size:12px;color:#c7cbd0}#tuim-travel-window input:not([type=checkbox]),#tuim-travel-window select{display:block;width:100%;padding:9px;margin-top:5px;background:#283239;color:white;border:1px solid #57616a;border-radius:5px;min-height:40px}#tuim-travel-window input[type=checkbox]{margin:10px}#tuim-travel-window .tuim-travel-card{border:1px solid #39434a;border-radius:9px;background:#1b252b;padding:11px;min-width:0;overflow-wrap:anywhere}#tuim-travel-window .tuim-travel-muted,#tuim-travel-window small{display:block;color:#b3bbc0;font-size:12px}#tuim-travel-window .tuim-travel-card>strong{display:block;font-size:16px;margin-top:4px}#tuim-travel-window h3{font-size:16px;margin:16px 0 9px;color:#d6b65c}#tuim-travel-window .tuim-travel-line{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #344047}#tuim-travel-window .tuim-travel-line span{color:#c3c9cd;flex:1}#tuim-travel-window .tuim-travel-line strong{text-align:right;flex:1}#tuim-travel-window .tuim-travel-total{margin-top:10px;border-color:#7e9e67}#tuim-travel-window .tuim-travel-total>strong{font-size:24px;color:#8fd69c}#tuim-travel-window .tuim-travel-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#tuim-travel-window .tuim-travel-output>small{margin:10px 0}@media(max-width:380px){#tuim-travel-window .tuim-travel-grid{grid-template-columns:1fr}}"}
function sound(){for(const t of state.alarmTimers)clearTimeout(t);state.alarmTimers=[];const duration=Math.max(.5,Math.min(30,Number(state.cfg.alarmDuration)||3)),vol=Math.max(0,Math.min(100,Number(state.cfg.alarmVolume??60)))/100;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=state.audio||(state.audio=new C());a.resume?.();for(let ms=0;ms<duration*1000;ms+=280)state.alarmTimers.push(setTimeout(()=>{const o=a.createOscillator(),g=a.createGain(),now=a.currentTime;o.type=state.cfg.alarmSound==='siren'?'sawtooth':state.cfg.alarmSound==='chime'?'sine':'square';o.frequency.value=state.cfg.alarmSound==='chime'?1046:850;g.gain.setValueAtTime(vol*.13,now);g.gain.exponentialRampToValueAtTime(.0001,now+.18);o.connect(g);g.connect(a.destination);o.start();o.stop(now+.2)},ms))}catch(e){console.warn('[Item Monitor] Audio unavailable',e)}}
function alertItem(w,reason){if(!state.panel){sound();return}state.panel.hidden=false;render();const p=state.panel.querySelector('#tuim-status');if(p)p.textContent='ALERT: '+w.name+' — '+reason;sound()}
function scan(){
  style();
  const cat=category(),rows=[...document.querySelectorAll(candidates)].filter(e=>!e.closest('#tuim-panel,#tu-pda-panel'));
  for(const w of state.items){
    const previous=w.row;
    if(w.category!==cat){previous?.classList.remove('tuim-watch','tuim-trigger','tuim-wait');w.row=null;w.status='Waiting for '+w.category;w.fired=false;continue}
    if(cat==='Item Market'){
      previous?.classList.remove('tuim-watch','tuim-trigger','tuim-wait');w.row=null;
      const active=pageItem();
      const matching=active&&(w.key===active.key||norm(w.name)===norm(active.name));
      if(!matching){w.status='Waiting for '+w.name;w.fired=false;continue}
      const found=listings(),qualifying=[];
      for(const row of found){
        const p=listingPrice(row);
        const match=w.maxPrice!=null&&Number.isFinite(p)&&p<=w.maxPrice;
        row.classList.toggle('tuim-trigger',match);row.classList.toggle('tuim-wait',!match&&w.maxPrice!=null);
        if(match)qualifying.push({row,p});
      }
      w.status=qualifying.length?qualifying.length+' qualifying listing(s), lowest $'+Math.min(...qualifying.map(x=>x.p)).toLocaleString():found.length+' listing(s), none at target';
      if(qualifying.length&&!w.fired){w.fired=true;alertItem(w,w.status)}
      if(!qualifying.length)w.fired=false;
      continue;
    }
    if(!w.row?.isConnected)w.row=null;
    if(!w.row)w.row=(cat==='Foreign'?foreignRow(w):null)||rows.filter(r=>keyOf(r)===w.key||norm(nameOf(r))===norm(w.name)||(norm(text(r)).includes(norm(w.name))&&norm(w.name).length>3)).sort((a,b)=>text(a).length-text(b).length)[0]||null;
    if(previous&&previous!==w.row)previous.classList.remove('tuim-watch','tuim-trigger','tuim-wait');
    if(!w.row){w.status='Not visible';w.fired=false;continue}
    const q=cat==='Foreign'?foreignStock(w.row):quantity(w.row),p=price(w.row);
    const hits=[];
    if(w.minQty!=null&&Number.isFinite(q)&&q>=w.minQty)hits.push('quantity '+q+' ≥ '+w.minQty);
    if(cat!=='Foreign'&&w.maxPrice!=null&&Number.isFinite(p)&&p<=w.maxPrice)hits.push('price $'+p.toLocaleString()+' ≤ $'+w.maxPrice.toLocaleString());
    w.status='Qty: '+(Number.isFinite(q)?q:'?')+' | Price: '+(Number.isFinite(p)?'$'+p.toLocaleString():'?');
    w.row.classList.toggle('tuim-trigger',hits.length>0);
    w.row.classList.toggle('tuim-wait',hits.length===0);
    w.row.classList.remove('tuim-watch');
    if(hits.length&&!w.fired){w.fired=true;alertItem(w,hits.join('; '))}
    if(!hits.length)w.fired=false;
  }
}
function clearHighlights(){document.querySelectorAll('.tuim-watch,.tuim-wait,.tuim-trigger').forEach(el=>el.classList.remove('tuim-watch','tuim-wait','tuim-trigger'))}
function draggable(el,handle,clickAllowed=false){let moved=false,start=null;handle.style.touchAction='none';handle.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button')&&handle!==el)return;start={x:e.clientX,y:e.clientY,left:el.getBoundingClientRect().left,top:el.getBoundingClientRect().top};moved=false;handle.setPointerCapture?.(e.pointerId)});handle.addEventListener('pointermove',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)+Math.abs(dy)>7)moved=true;if(!moved)return;el.style.left=Math.max(0,Math.min(window.innerWidth-el.offsetWidth,start.left+dx))+'px';el.style.top=Math.max(0,Math.min(window.innerHeight-el.offsetHeight,start.top+dy))+'px';el.style.right='auto'});const finish=()=>{start=null};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);if(clickAllowed)handle.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false}},true)}
function stopPick(){if(!state.picking)return;state.picking=false;for(const event of ['pointerdown','touchstart','mousedown','click'])document.removeEventListener(event,intercept,true);document.getElementById('tuim-tip')?.remove()}
function intercept(e){if(e.target.closest('#tuim-tip,#tuim-panel,#tu-pda-panel'))return;const row=e.target.closest(candidates);if(!row&&category()!=='Item Market')return;e.preventDefault();e.stopImmediatePropagation();if(e.type==='click'){state.selected=category()==='Item Market'?{category:'Item Market',...pageItem()}: {category:category(),name:nameOf(row),key:keyOf(row),row};stopPick();state.panel.hidden=false;render()}else if(e.type==='pointerdown'||e.type==='touchstart'){state.selected={category:category(),name:nameOf(row),key:keyOf(row),row};setTimeout(()=>{if(state.picking){stopPick();state.panel.hidden=false;render()}},500)}}
function pick(){
 stopPick();
 if(category()==='Item Market'){
   state.picking=true;
   state.panel.hidden=true;
   const tip=E('button',document.body,'Select displayed market item');
   tip.id='tuim-tip';
   tip.type='button';
   tip.style.cssText='position:fixed;z-index:2147483646;top:18%;right:12px;max-width:220px;padding:10px 14px;background:#d6b65c;color:#111;border:2px solid #fff;border-radius:9px;font:600 14px system-ui;box-shadow:0 3px 12px #000';
   draggable(tip,tip,true);
   tip.onclick=()=>{
     const item=pageItem();
     if(!item){alert('Could not identify the displayed market item. Open an item listing and try again.');return}
     state.selected={category:'Item Market',...item};
     stopPick();state.panel.hidden=false;render();
   };
   return;
 }
 state.picking=true;state.panel.hidden=true;
 const tip=E('div',document.body,'Tap an item to monitor. Tap here to cancel.');
 tip.id='tuim-tip';
 tip.style.cssText='position:fixed;z-index:2147483646;top:10px;left:5%;width:90%;padding:12px;background:#3a2c16;color:white;border:2px solid gold';
 draggable(tip,tip,true);tip.onclick=()=>{stopPick();state.panel.hidden=false};
 for(const event of ['pointerdown','touchstart','mousedown','click'])document.addEventListener(event,intercept,{capture:true,passive:false});
}

const catalogCacheKey='tuim-catalog-v2';
async function getCatalog(){
 if(state.catalog)return state.catalog;
 const cached=load(catalogCacheKey,null);
 if(cached?.items?.length&&Date.now()-cached.time<86400000){state.catalog=cached.items;return state.catalog}
 const pdaKey='###PDA-APIKEY###';
 const apiKey=!pdaKey.includes('PDA-APIKEY')?pdaKey:(window.TornUtilities?.apiKey||window.TornUtilities?.getApiKey?.()||'');
 if(!apiKey)throw Error('PDA API key unavailable. Configure your key in Torn PDA, then reload the script.');
 const url='https://api.torn.com/v2/torn/items?key='+encodeURIComponent(apiKey);
 let payload=null;
 const unpack=response=>{
   let data=response;
   if(data&&typeof data==='object'&&('responseText' in data||'data' in data||'body' in data||'response' in data))data=data.responseText??data.data??data.body??data.response;
   if(typeof data==='string')data=JSON.parse(data);
   if(data?.error)throw Error('Torn API: '+(data.error.error||'Unknown error'));
   return data;
 };
 try{
   if(typeof PDA_httpGet==='function')payload=unpack(await PDA_httpGet(url));
   else {const response=await fetch(url);if(!response.ok)throw Error('HTTP '+response.status);payload=unpack(await response.json())}
 }catch(e){console.warn('[TU Item Monitor] Catalog fetch:',e);if(cached?.items?.length){state.catalog=cached.items;return state.catalog}throw Error('Catalog request failed: '+e.message)}
 if(!payload){if(cached?.items?.length){state.catalog=cached.items;return state.catalog}throw Error('Could not retrieve item catalog. Configure Torn API access in PDA/TU and try again.')}
 const raw=payload.items||payload;
 const entries=Array.isArray(raw)?raw:Object.entries(raw).filter(([,v])=>v&&typeof v==='object').map(([id,v])=>({...v,id:v.id??id}));
 state.catalog=entries.filter(v=>v&&v.name).map(v=>{
   const value=v.value&&typeof v.value==='object'?v.value:{};
   const shops=Array.isArray(value.shops)?value.shops:Array.isArray(v.shops)?v.shops:[];
   const locations=shops.map(shop=>{
     if(typeof shop==='string')return shop;
     if(!shop||typeof shop!=='object')return '';
     const location=shop.location||shop.country||shop.city||shop.name||shop.shop?.name||shop.shop||shop.vendor||'';
     return typeof location==='string'?location:String(location?.name||location?.country||'');
   }).filter(Boolean);
   return {id:String(v.id),name:String(v.name),type:String(v.type||'Other'),locations:[...new Set(locations)],country:String(v.country||v.origin||'')};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 localStorage.setItem(catalogCacheKey,JSON.stringify({time:Date.now(),items:state.catalog}));
 return state.catalog;
}
function catalogGroups(item){
 const countries=['Japan','Mexico','Canada','Hawaii','Cayman Islands','Switzerland','China','Argentina','United Kingdom','UAE','South Africa'];
 const locations=item.locations.length?item.locations:item.country?[item.country]:[];
 return locations.length?[...new Set(locations.map(x=>{
   const country=countries.find(c=>norm(x).includes(norm(c)));
   return country?country+' / Foreign / Item Market / Bazaar':x+' / Item Market / Bazaar';
 }))]:['Unspecified Location / Item Market / Bazaar'];
}
function openCatalog(){
 style();
 state.catalogWindow?.remove();
 const w=E('section',document.body);state.catalogWindow=w;w.id='tuim-catalog';
 w.style.cssText='position:fixed;z-index:2147483645;left:5vw;top:8vh;width:min(90vw,530px);height:min(80dvh,680px);background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;display:flex;flex-direction:column;font:14px system-ui;box-sizing:border-box;box-shadow:0 10px 30px #000b';
 const head=E('div',w);head.style.cssText='display:flex;align-items:center;gap:8px;cursor:move;touch-action:none;padding:5px 0 12px';
 E('strong',head,'Select Item from Complete List').style.flex='1';
 const exit=B(head,'×',()=>{w.remove();state.catalogWindow=null});exit.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c';
 draggable(w,head);tuModuleOpen('tuim-catalog');
 const locationRow=E('div',w);locationRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px';E('span',locationRow,'Filter location:');const locationFilter=E('select',locationRow);locationFilter.style.cssText='flex:1;min-width:0;background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:8px';locationFilter.onchange=()=>{if(state.catalog)filter()};
 const populateLocations=()=>{
   const previous=locationFilter.value;locationFilter.replaceChildren();
   const all=E('option',locationFilter,'All locations');all.value='';
   const locations=[...new Set(state.catalog.flatMap(catalogGroups))].sort((a,b)=>a.localeCompare(b));for(const shared of ['Torn / Item Market / Bazaar'])if(!locations.includes(shared))locations.unshift(shared);
   for(const loc of locations){const o=E('option',locationFilter,loc);o.value=loc}
   locationFilter.value=locations.includes(previous)?previous:'';
 };
 const search=E('input',w);search.placeholder='Keyword or item ID';search.style.cssText='width:100%;padding:10px;background:#283239;color:white;border:1px solid #667;margin-bottom:8px;box-sizing:border-box';
 const controls=E('div',w);controls.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:8px';
 const count=E('span',controls,'Loading catalog…');count.style.flex='1';
 const next=B(controls,'Next',()=>jump());next.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:9px 14px;border-radius:5px';next.disabled=true;
 const list=E('div',w);list.style.cssText='flex:1;overflow:auto;overscroll-behavior:contain';
 let matches=[],position=-1;
 const draw=items=>{
   list.replaceChildren();const grouped=new Map();
   for(const item of items)for(const loc of (locationFilter.value?[locationFilter.value]:catalogGroups(item))){if(!grouped.has(loc))grouped.set(loc,[]);grouped.get(loc).push(item)}
   for(const [loc,group] of [...grouped].sort((a,b)=>a[0].localeCompare(b[0]))){
     const heading=E('h3',list,loc);heading.style.cssText='font-size:15px;margin:14px 0 6px;color:#d6b65c';
     for(const item of group){const line=E('div',list);line.dataset.itemId=item.id;line.style.cssText='padding:8px;border-bottom:1px solid #39434a;display:flex;align-items:center;gap:8px';
       const label=E('span',line,item.name+' (#'+item.id+')');label.style.flex='1';
       const select=B(line,'Select',()=>{state.selected={category:loc.includes(' / Foreign / ')?'Foreign':'Item Market',name:item.name,key:'id:'+item.id};w.remove();state.catalogWindow=null;state.panel.hidden=false;render()});select.style.cssText='background:#283239;color:#d6b65c;border:1px solid #d6b65c;padding:8px 12px;border-radius:5px';
     }
   }
 };
 function jump(){
   if(!matches.length)return;
   position=(position+1)%matches.length;
   const nodes=[...list.querySelectorAll('[data-item-id]')];nodes.forEach(n=>n.style.background='');
   const target=nodes.find(n=>n.dataset.itemId===matches[position].id);
   if(target){target.style.background='#31563e';target.scrollIntoView({block:'center',behavior:'smooth'})}
   count.textContent=(position+1)+' / '+matches.length+' matches';
 }
 function filter(){
   const term=norm(search.value);
   const visible=locationFilter.value==='Torn / Item Market / Bazaar'?state.catalog:locationFilter.value?state.catalog.filter(x=>catalogGroups(x).includes(locationFilter.value)):state.catalog;
   matches=visible.filter(x=>norm(x.name).includes(term)||x.id.includes(term));
   position=-1;
   // Keep the full catalog visible; Next navigates through partial keyword matches.
   draw(visible);
   next.disabled=!matches.length;
   count.textContent=term?matches.length+' matches':visible.length+' items';
   if(term&&matches.length)jump();
 }
 search.addEventListener('input',filter);
 search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();jump()}});
 getCatalog().then(()=>{if(!w.isConnected)return;populateLocations();filter()}).catch(err=>{count.textContent=err.message;B(list,'Retry',()=>{w.remove();openCatalog()})});
}



const travel=load('tuim-travel-v8',{capacity:20,mode:'standard',country:'mex',item:'',buffer:5,fee:5,book:false,departure:0,armed:false});
const travelCountries={mex:'Mexico',cay:'Cayman Islands',can:'Canada',haw:'Hawaii',uni:'United Kingdom',arg:'Argentina',swi:'Switzerland',jap:'Japan',chi:'China',uae:'United Arab Emirates',sou:'South Africa'};
const travelTimes={mex:[24,17,12,7],cay:[33,23,17,10],can:[39,27,19,12],haw:[127,89,63,38],uni:[151,106,75,45],arg:[158,111,79,47],swi:[166,116,83,50],jap:[213,149,107,64],chi:[229,160,114,69],uae:[257,180,128,77],sou:[282,197,141,85]};
const travelCosts={mex:6500,cay:10000,can:9000,haw:11000,uni:18000,arg:21000,swi:27000,jap:32000,chi:35000,uae:32000,sou:40000};
const travelAliases={mex:['mexico'],cay:['cayman'],can:['canada'],haw:['hawaii'],uni:['united kingdom','london'],arg:['argentina'],swi:['switzerland'],jap:['japan'],chi:['china'],uae:['united arab emirates','dubai','uae'],sou:['south africa']};
const travelSave=()=>localStorage.setItem('tuim-travel-v8',JSON.stringify(travel));
const travelNum=v=>Math.max(0,Number(v)||0);
const travelDate=t=>{const d=new Date(t*1000),mode=localStorage.getItem('tu-time-display')||'local';return mode==='tct'?new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)+' TCT':d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})+' Local'};
const travelMoney=v=>(v<0?'-$':'$')+Math.abs(Math.round(v)).toLocaleString();
const travelMinutes=()=>Math.ceil(travelTimes[travel.country][{standard:0,airstrip:1,private:2,business:3}[travel.mode]]*(travel.book?.75/100:1));
let travelAlerted=0;
setInterval(()=>{const t=travel.departure;if(!travel.armed||!t||travelAlerted===t)return;if(t-Date.now()/1000<=30&&t-Date.now()/1000>=-5){travelAlerted=t;travel.armed=false;travelSave();sound();alert('Travel Assistant: departure in 30 seconds')}},1000);
function travelArrivalFallback(description){
 const now=Math.floor(Date.now()/1000);
 const text=String(description||'');
 const h=text.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i),m=text.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i),sec=text.match(/(\d+)\s*(?:seconds?|secs?|s)\b/i);
 if((h||m||sec)&&/travel|flight|arriv|land|remain|left/i.test(text))return now+(Number(h?.[1]||0)*3600+Number(m?.[1]||0)*60+Number(sec?.[1]||0));
 return null;
}
async function travelCurrentFlight(key){
 if(!key)return null;
 try{
  const [profileResult,travelResult]=await Promise.allSettled([
   travelGet('https://api.torn.com/v2/user/profile?key='+encodeURIComponent(key)),
   travelGet('https://api.torn.com/user/?selections=travel&key='+encodeURIComponent(key))
  ]);
  if(profileResult.status==='rejected'&&travelResult.status==='rejected')throw Error('Profile and travel requests failed');
  const data=profileResult.status==='fulfilled'?profileResult.value:{};
  const trip=travelResult.status==='fulfilled'?(travelResult.value.travel||{}):{};
  const user=data.profile||data;
  const status=user.status||{};
  const state=String(status.state||'').toLowerCase();
  if(!state.includes('travel')&&!state.includes('abroad')&&!(Number(trip.time_left)>0))return null;
  const description=String(status.description||'');
  const text=[description,String(trip.destination||''),String(user.travel?.destination||''),String(user.travel?.country||'')].join(' ').toLowerCase();
  // Profile direction overrides the legacy travel field, which can name the overseas country on a return flight.
  const returnFlight=/\\b(?:travel(?:l)?ing|flying|heading|going)\\s+(?:back\\s+)?to\\s+torn\\b|\\b(?:returning|flying\\s+back|heading\\s+back)\\s+(?:to\\s+torn|home)\\b/i.test(description)
    ||/^(?:torn|torn city)$/i.test(String(trip.destination||'').trim());
  const destination=returnFlight?'torn':Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>text.includes(alias)));
  const until=Number(status.until||user.travel?.arrival||user.travel?.arrival_time||0);
  const seconds=Number(trip.time_left);
  const tripTimestamp=Number(trip.timestamp);
  const arrival=Number.isFinite(seconds)&&seconds>0?Math.floor(Date.now()/1000+seconds):tripTimestamp>Date.now()/1000?tripTimestamp:until>Date.now()/1000?until:travelArrivalFallback(description);
  return {destination,description,arrival,traveling:state.includes('travel')||seconds>0,state};
 }catch(e){return {error:e.message}}
}
async function travelGet(url){
 const parse=r=>{const raw=typeof r==='string'?r:r?.responseText??r?.data??r?.body??r?.response??r;const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.error)throw Error(typeof data.error==='string'?data.error:data.error.error||'API error');return data};
 try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return parse(await r.text())}
 catch(e){if(typeof PDA_httpGet!=='function')throw e;return parse(await PDA_httpGet(url))}
}
function stockHistoryMetrics(history){
 const points=Array.isArray(history?.points)?history.points:[];
 const sorted=points.filter(p=>Number.isFinite(Number(p.quantity))&&Number(p.source_observed_at)>0).sort((a,b)=>Number(a.source_observed_at)-Number(b.source_observed_at));
 const sources={dom:0,api:0,other:0};
 for(const p of sorted){const src=String(p.provider||p.source||p.observation_source||p.source_type||'').toLowerCase();if(/dom|direct|tu/.test(src))sources.dom++;else if(/yata|api/.test(src))sources.api++;else sources.other++}
 const latest=sorted[sorted.length-1];let rate=0,intervals=0,increases=0;
 for(let i=1;i<sorted.length;i++){
  const a=sorted[i-1],b=sorted[i],dt=Number(b.source_observed_at)-Number(a.source_observed_at),dq=Number(a.quantity)-Number(b.quantity);
  if(dq<0)increases++;
  if(dt>=60&&dt<=3600&&dq>0){rate+=dq/dt;intervals++}
 }
 const age=latest?Math.max(0,Date.now()/1000-Number(latest.source_observed_at)):Infinity;
 // A bounded heuristic, not a forecast: no estimate with sparse or stale observations.
 const reliable=intervals>=3&&age<=1800;
 const estimate=reliable?Math.max(0,Math.floor(Number(latest.quantity)-(rate/intervals)*age)):null;
 return {points:sorted.length,sources,increases,intervals,estimate,age,latest,confidence:reliable?(intervals>=10&&age<=300?'Moderate':'Low'):'Unavailable'};
}
function travelMarket(data){
 const found=[];const scan=(x,depth)=>{
  if(!x||depth>5)return;
  if(Array.isArray(x)){for(const y of x)scan(y,depth+1);return}
  if(typeof x!=='object')return;
  const price=Number(x.price??x.cost??x.listing_price);
  if(Number.isFinite(price)&&price>0&&('quantity' in x||'amount' in x||'seller' in x))found.push(price);
  for(const [k,v] of Object.entries(x))if(['itemmarket','listings','items','item','market','bazaar','bazaars','offers'].includes(k))scan(v,depth+1);
 };scan(data,0);return found.length?Math.min(...found):null;
}

// Anonymous foreign-shop observations. No API key, account ID or player name is sent.
const stockReportingKey='tuim-stock-reporting-v1';
const stockReportingEnabled=()=>localStorage.getItem(stockReportingKey)==='yes';
let stockReportingBusy=false;
const stockChecks=new Map();
function foreignShopTables(){
 const found=[];
 // Torn abroad inventory: wrapper > header + LI > nested row > seven cells.
 for(const wrapper of document.querySelectorAll('[class*="stockTableWrapper"]')){
  if(!wrapper.getClientRects().length||wrapper.closest('#tuim-panel,#tuim-travel-window'))continue;
  const header=wrapper.querySelector('[class*="itemsHeader"]');
  if(!header)continue;
  const columns=[...header.children].map(x=>norm(text(x)));
  if(!['name','stock','cost'].every(x=>columns.includes(x)))continue;
  const rows=[...wrapper.querySelectorAll('li [class*="row"],li[class*="row"]')].filter(x=>x.getClientRects().length&&x.querySelector('[class*="tabletColB"]')&&x.querySelector('[class*="tabletColC"]'));
  if(rows.length)found.push({headers:columns,rows,kind:'torn-abroad'});
 }
 // Retain standard HTML table support for alternate layouts.
 for(const table of document.querySelectorAll('table,[role="table"]')){
  if(!table.getClientRects().length||table.closest('#tuim-panel,#tuim-travel-window'))continue;
  const header=table.querySelector('tr,[role="row"]');if(!header)continue;
  const columns=[...header.children].map(x=>norm(text(x)));
  if(!['name','stock','cost'].every(x=>columns.includes(x)))continue;
  const rows=[...table.querySelectorAll('tr,[role="row"]')].filter(x=>x!==header&&x.getClientRects().length);
  if(rows.length)found.push({headers:columns,rows,kind:'table'});
 }
 return found;
}
function foreignShopDiagnostic(){
 const report={version:TU_MODULE_VERSION,timestamp:new Date().toISOString(),countrySelection:travel.country,path:location.pathname,reportingEnabled:stockReportingEnabled(),reportingBusy:stockReportingBusy,reportingStatus:stockReportStatus,endpointConfigured:!!stockEndpoint,catalogLoaded:!!stockCatalogMap,catalogSize:stockCatalogMap?.size||0,queueBatches:load(stockQueueKey,[]).length,checks:document.querySelectorAll('[data-tu-stock-reported]').length,shops:[],errors:[]};
 const safe=(fn,fallback=null)=>{try{return fn()}catch(e){report.errors.push(String(e?.message||e));return fallback}};
 const sample=e=>e?{tag:e.tagName,cls:String(e.className||'').slice(0,90),text:String(text(e)).slice(0,100),title:e.getAttribute?.('title')?.slice(0,100)||null,aria:e.getAttribute?.('aria-label')?.slice(0,100)||null,html:String(e.outerHTML||'').slice(0,320)}:null;
 const shops=safe(()=>foreignShopTables(),[])||[];
 report.detectedShops=shops.length;
 report.detectedCountry=safe(()=>foreignShopCountry());
 for(const shop of shops){
  const data={kind:shop.kind,headers:shop.headers,rowCount:shop.rows.length,rows:[]};
  for(const row of shop.rows.slice(0,5)){
   safe(()=>{
    const cells=[...row.children],name=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColB"]'):cells[shop.headers.indexOf('name')],stock=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColC"]'):cells[shop.headers.indexOf('stock')],cost=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColD"]'):cells[shop.headers.indexOf('cost')];
    const entry={name:sample(name),stock:sample(stock),cost:sample(cost),itemId:name?safe(()=>foreignItemId(name)):null,quantityText:stock?text(stock).replace(/stock/ig,'').trim():null,quantityMatch:stock?text(stock).replace(/stock/ig,'').replace(/,/g,'').match(/\b(\d+)\b/)?.[1]??null:null,mark:!!name?.querySelector('[data-tu-stock-reported]')};
    data.rows.push(entry);
   });
  }
  report.shops.push(data);
 }
 report.totalRows=shops.reduce((n,x)=>n+x.rows.length,0);
 report.matchedRows=safe(()=>foreignShopSnapshot()?.rows.length);
 return JSON.stringify(report,null,2);
}
function foreignShopCountry(){
 const shops=foreignShopTables();if(!shops.length)return null;
 const pageText=[document.title,document.querySelector('main')?.innerText?.slice(0,1200)||'',...document.querySelectorAll('h1,h2,h3,[class*="country"],[class*="location"]')].map(e=>typeof e==='string'?e:(e.getClientRects().length?text(e):'')).join(' ').toLowerCase();
 const detected=Object.keys(travelAliases).find(code=>travelAliases[code].some(alias=>pageText.includes(alias)));
 return detected||(travelAliases[travel.country]?travel.country:null);
}
let stockCatalogMap=null,stockCatalogPending=null,stockCatalogIds=null;
let stockReportStatus='Waiting for foreign shop';
const setStockReportStatus=message=>{stockReportStatus=message;const el=document.querySelector('#tuim-stock-report-status');if(el)el.textContent=message};
async function ensureStockCatalog(){
 if(stockCatalogMap)return stockCatalogMap;
 if(stockCatalogPending)return stockCatalogPending;
 stockCatalogPending=getCatalog().then(items=>{
  stockCatalogMap=new Map(items.filter(x=>Number(x.id)>0).map(x=>[norm(x.name),Number(x.id)]));
  stockCatalogIds=new Set(stockCatalogMap.values());
  return stockCatalogMap;
 }).finally(()=>{stockCatalogPending=null});
 return stockCatalogPending;
}
function foreignItemId(cell){
 const control=cell?.querySelector?.('[aria-controls^="item-"]');
 const controlId=control?.getAttribute('aria-controls')?.match(/^item-(\d+)-itemInfoWrapper$/);
 if(controlId){const id=Number(controlId[1]);if(Number.isSafeInteger(id)&&id>0)return id}

 const direct=[cell,...cell.querySelectorAll('[data-item-id],[data-itemid],[data-id],a[href],img[src]')];
 for(const node of direct){
  for(const attr of ['data-item-id','data-itemid']){
   const n=Number(node.getAttribute?.(attr));if(Number.isSafeInteger(n)&&n>0&&stockCatalogIds?.has(n))return n;
  }
  for(const attr of ['href','src']){
   const v=node.getAttribute?.(attr)||'';
   const m=v.match(/(?:itemID|itemId|item_id|item\/)(?:=|\/)(\d+)/i);
   if(m&&stockCatalogIds?.has(Number(m[1])))return Number(m[1]);
  }
 }
 const labels=[cell.getAttribute('title'),cell.getAttribute('aria-label'),...cell.querySelectorAll('[title],[aria-label],img[alt]')].map(x=>typeof x==='string'?x:(x?.getAttribute?.('title')||x?.getAttribute?.('aria-label')||x?.getAttribute?.('alt'))).filter(Boolean);
 labels.push(text(cell.querySelector('button')||cell).replace(/✓/g,'').trim());
 for(const label of labels){const key=norm(label).replace(/\s*[.…]+$/,'').trim();if(stockCatalogMap.has(key))return stockCatalogMap.get(key)}
 // Truncated names are only matched if exactly one catalog entry shares the prefix.
 for(const label of labels){const raw=norm(label);if(!/[.…]$/.test(raw))continue;const prefix=raw.replace(/[.…]+$/,'').trim();if(prefix.length<8)continue;const matches=[...stockCatalogMap].filter(([name])=>name.startsWith(prefix));if(matches.length===1)return matches[0][1]}
 return null;
}
function foreignShopSnapshot(){
 const country=foreignShopCountry();if(!country)return null;
 const rows=[],seen=new Set();
 for(const shop of foreignShopTables()){
  const nameIndex=shop.headers.indexOf('name'),stockIndex=shop.headers.indexOf('stock'),costIndex=shop.headers.indexOf('cost');
  for(const row of shop.rows){
   const cells=[...row.children];
   const nameCell=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColB"]'):cells[nameIndex];
   const stockCell=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColC"]'):cells[stockIndex];
   const costCell=shop.kind==='torn-abroad'?row.querySelector('[class*="tabletColD"]'):cells[costIndex];
   if(!nameCell||!stockCell||!costCell)continue;
   const id=foreignItemId(nameCell);if(!id||seen.has(id))continue;
   const quantityLabel=text(stockCell).replace(/stock/ig,'').replace(/,/g,'').trim();
   const quantityMatch=quantityLabel.match(/\b(\d+)\b/);
   if(!quantityMatch)continue;
   const quantity=Number(quantityMatch[1]);
   const priceMatch=text(costCell).match(/\$\s*([\d,]+)/);
   const unit_price=priceMatch?Number(priceMatch[1].replace(/,/g,'')):null;
   if(!Number.isSafeInteger(quantity)||quantity<0)continue;
   seen.add(id);rows.push({item_id:id,quantity,unit_price,node:nameCell});
  }
 }
 return {country,rows};
}
const stockArchiveKey='tuim-stock-archive-v1';
const stockQueueKey='tuim-stock-upload-queue-v1';
function markStockArchived(rows,stamp){
 for(const row of rows){
  let mark=row.node.querySelector('[data-tu-stock-reported]');
  if(!mark){mark=document.createElement('span');mark.setAttribute('data-tu-stock-reported','');mark.style.cssText='color:#e69a22;font-weight:bold;margin-left:6px';mark.title='DOM observation awaiting server acknowledgment';row.node.append(mark)}
  mark.textContent='✓';mark.style.color='#e69a22';mark.title='DOM observation pending D1 acknowledgment';mark.dataset.tuItemId=String(row.item_id);mark.dataset.tuObservedAt=String(stamp);stockChecks.set(row.item_id,stamp);
 }
}
function storeStockSnapshot(snapshot){
 const archive=load(stockArchiveKey,[]);
 const queue=load(stockQueueKey,[]);
 // Keep a bounded local history and unsent batches, with no silent loss of unsent data.
 if(queue.length>=500)throw Error('Upload queue full (500 batches); retry when connected');
 archive.push(snapshot);
 queue.push(snapshot);
 try{
  localStorage.setItem(stockArchiveKey,JSON.stringify(archive.slice(-500)));
  localStorage.setItem(stockQueueKey,JSON.stringify(queue));
 }catch(e){throw Error('Local storage full or unavailable: '+e.message)}
}
const stockEndpoint='https://tu-multiplayer-server.tuserver.workers.dev/api/foreign/observations';
async function deliverStockBatch(batch){
 const body=JSON.stringify(batch);
 const parse=(raw,transport)=>{
  let data=raw;
  if(data&&typeof data==='object'&&('responseText' in data||'data' in data||'body' in data||'response' in data))data=data.responseText??data.data??data.body??data.response;
  if(typeof data==='string'){try{data=JSON.parse(data)}catch{throw Error(transport+': invalid JSON response')}}
  if(!data?.ok||!Array.isArray(data.accepted)||data.accepted.length!==batch.items.length)throw Error(transport+': upload not fully accepted'+(data?.error?' ('+data.error+')':''));
  return data;
 };
 const failures=[];
 if(typeof PDA_httpPost==='function'){
  try{return parse(await PDA_httpPost(stockEndpoint,body,{'Content-Type':'application/json'}),'PDA_httpPost')}
  catch(e){failures.push('PDA_httpPost: '+e.message)}
 }
 const gm=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest:null;
 if(gm){
  try{
   const response=await new Promise((resolve,reject)=>gm({method:'POST',url:stockEndpoint,headers:{'Content-Type':'application/json'},data:body,timeout:12000,onload:resolve,onerror:()=>reject(Error('network error')),ontimeout:()=>reject(Error('timeout'))}));
   if(response.status<200||response.status>=300)throw Error('HTTP '+response.status+' '+String(response.responseText||'').slice(0,150));
   return parse(response,'GM_xmlhttpRequest');
  }catch(e){failures.push('GM_xmlhttpRequest: '+e.message)}
 }
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(stockEndpoint,{method:'POST',headers:{'content-type':'application/json'},body,signal:controller.signal});
  if(!response.ok)throw Error('HTTP '+response.status+' '+(await response.text()).slice(0,150));
  return parse(await response.json(),'fetch');
 }catch(e){failures.push('fetch: '+e.message);throw Error(failures.join(' | '))}
 finally{clearTimeout(timer)}
}
function confirmStockMarks(batch){
 for(const item of batch.items)for(const mark of document.querySelectorAll('[data-tu-stock-reported]')){
  if(mark.dataset.tuItemId===String(item.item_id)&&mark.dataset.tuObservedAt===String(batch.observed_at)){
   mark.style.color='#34c759';mark.title='DOM observation acknowledged by server';
  }
 }
}
let stockFlushBusy=false;
async function flushStockQueue(){
 if(stockFlushBusy)return 0;
 stockFlushBusy=true;
 try{
 const queue=load(stockQueueKey,[]);
 if(!queue.length)return 0;
 let sent=0;
 for(const batch of queue.slice(0,6)){
  await deliverStockBatch(batch);
  // Remove only after acknowledgment, preserving batches queued later.
  const current=load(stockQueueKey,[]);
  if(current[0]?.observed_at!==batch.observed_at||current[0]?.country!==batch.country)break;
  localStorage.setItem(stockQueueKey,JSON.stringify(current.slice(1)));
  confirmStockMarks(batch);
  sent++;
 }
 return sent;
 }finally{stockFlushBusy=false}
}
// Retry persisted observations independently of foreign-shop visibility.
// This also drains the queue after returning to Torn or reopening PDA.
let stockRetryDelay=15000;
async function retryStockQueue(){
 if(!stockReportingEnabled())return;
 if(!load(stockQueueKey,[]).length){stockRetryDelay=15000;return}
 try{
  const sent=await flushStockQueue();
  if(sent)stockRetryDelay=15000;
  const pending=load(stockQueueKey,[]).length;
  setStockReportStatus(sent+' queued batches delivered · '+pending+' pending');
 }catch(e){
  stockRetryDelay=Math.min(stockRetryDelay*2,300000);
  setStockReportStatus('D1 delivery pending: '+e.message+' · '+load(stockQueueKey,[]).length+' batches queued');
 }
}
setInterval(()=>{if(load(stockQueueKey,[]).length)retryStockQueue()},15000);
window.addEventListener('online',retryStockQueue);
window.addEventListener('pageshow',retryStockQueue);
let lastVisibleInventory=null,lastVisibleUploadAt=0;
function visibleInventorySignature(snap){
 return snap.country+'|'+snap.rows.map(r=>r.item_id+':'+r.quantity+':'+(r.unit_price??'')).sort().join('|');
}
async function reportForeignShop(){
 if(!stockReportingEnabled()||stockReportingBusy||document.hidden)return;
 if(Date.now()-lastVisibleUploadAt<5000)return;
 stockReportingBusy=true;
 try{
  const country=foreignShopCountry();
  if(!country){lastVisibleInventory=null;return}
  try{await ensureStockCatalog()}catch(e){setStockReportStatus('Catalog unavailable; using DOM item IDs: '+e.message)}
  const snap=foreignShopSnapshot();
  if(!snap?.rows.length)return;
  const signature=visibleInventorySignature(snap);
  if(lastVisibleInventory===null){
   lastVisibleInventory=signature;
   setStockReportStatus('Inventory baseline captured · waiting for visible changes');
   return;
  }
  if(signature===lastVisibleInventory)return;
  const observed_at=Math.floor(Date.now()/1000);
  const rows=snap.rows.slice(0,50);
  const batch={country:snap.country,observed_at,items:rows.map(({item_id,quantity,unit_price})=>({item_id,quantity,unit_price}))};
  lastVisibleInventory=signature;
  lastVisibleUploadAt=Date.now();
  markStockArchived(rows,observed_at);
  try{
   await deliverStockBatch(batch);
   confirmStockMarks(batch);
   setStockReportStatus('Inventory changed: '+rows.length+' observations acknowledged · '+load(stockQueueKey,[]).length+' older batches pending');
   if(load(stockQueueKey,[]).length)retryStockQueue();
  }catch(e){
   storeStockSnapshot(batch);
   setStockReportStatus('Changed inventory: delivery failed ('+e.message+') · saved '+rows.length+' observations locally · '+load(stockQueueKey,[]).length+' pending batches');
  }
 }catch(e){setStockReportStatus('Archive error: '+e.message);console.warn('[TU Stock Reporter]',e)}
 finally{stockReportingBusy=false}
}
setInterval(reportForeignShop,1000);
let travelWindow=null,travelEpoch=0,travelDataWindow=null,travelDataModel=null;
function travelClose(){travelEpoch++;travelWindow?.remove();travelWindow=null;travelDataWindow?.remove();travelDataWindow=null;travelDataModel=null}
function travelDataRender(){if(!travelDataWindow?.isConnected)return;const area=travelDataWindow.querySelector('.tuim-data-body');if(!area)return;area.replaceChildren();const model=travelDataModel;if(!model){E('small',area,'Waiting for travel data...');return}const card=E('div',area);card.className='tuim-travel-card';const lineData=(label,value)=>{const row=E('div',card);row.className='tuim-travel-line';E('span',row,label);E('strong',row,String(value))};lineData('Server detected restock events',model.pred?.observed_events??'Unavailable');if(model.metrics){const m=model.metrics;lineData('History observations sampled',m.points+' (latest 200 requested)');lineData('Real Time Reporting',model.realTimeReportingTotal!=null?model.realTimeReportingTotal:m.sources.dom);lineData('API/YATA observations (identified)',m.sources.api);lineData('Unknown-source observations',m.sources.other);lineData('Stock increases in sampled history',m.increases);lineData('Depletion intervals used',m.intervals);if(m.points>0)E('small',area,'Real Time Reporting counts all stored app-submitted observations for this item in D1. Other source counts reflect only the latest sampled history. Restock events and forecasts may use additional history.')}else E('small',area,'History metrics unavailable')}
// Enforce hidden state regardless of module CSS display rules.
(function(){const id='tuim-window-visibility';if(document.getElementById(id))return;const st=E('style',document.head||document.documentElement);st.id=id;st.textContent='#tuim-panel[hidden],#tuim-travel-window[hidden],#tuim-data-window[hidden],#tuim-catalog[hidden]{display:none!important}';})();
function tuModuleOpen(id){const el=document.getElementById(id);if(!el)return;const nav=window.TUWindowNavigation;if(nav?.open?.(id))return;for(const other of ['tuim-panel','tuim-travel-window','tuim-data-window','tuim-catalog']){const w=document.getElementById(other);if(w&&other!==id)w.hidden=true;}el.hidden=false;}
function tuModuleHeader(w,head,parentId){
 w.dataset.tuModuleNav='1';
 const controls=E('span',head);controls.dataset.tuNavControls='1';controls.style.cssText='margin-left:auto;display:flex;gap:6px;flex-shrink:0';
 const button=(symbol,title,action)=>{const b=B(controls,symbol,(event)=>{event?.stopPropagation();event?.preventDefault();action();});b.title=title;b.setAttribute('aria-label',title);b.style.cssText='background:#252a2e;color:#f1ce72;border:1px solid #806a3e;border-radius:5px;padding:6px 10px;min-width:35px';};
 button('←','Back',()=>{const nav=window.TUWindowNavigation;const result=nav?.back?.(w.id);w.hidden=true;const p=document.getElementById(parentId);if(p){if(result!==true||p.hidden){nav?.open?.(parentId);p.hidden=false;}}});
 button('−','Minimize',()=>{window.TUWindowNavigation?.minimize?.(w.id);w.hidden=true;});
 button('×','Exit',()=>{w.hidden=true;if(window.TUWindowNavigation?.exit)window.TUWindowNavigation.exit(w.id);else state.context?.close?.();});
}
function travelDataOpen(){if(travelDataWindow?.isConnected){tuModuleOpen('tuim-data-window');return}const w=E('section',document.body);w.id='tuim-data-window';travelDataWindow=w;const head=E('div',w);head.className='tuim-travel-header';draggable(w,head);E('strong',head,'Data Used');tuModuleHeader(w,head,'tuim-travel-window');const area=E('div',w);area.className='tuim-data-body';travelDataRender();tuModuleOpen('tuim-data-window')}
function travelUI(){
 travelStyle();
 if(travelWindow?.isConnected){tuModuleOpen('tuim-travel-window');return}
 const w=E('section',document.body);travelWindow=w;w.id='tuim-travel-window';
 const head=E('div',w);head.className='tuim-travel-header';draggable(w,head);
 E('strong',head,'Travel Assistant v'+TU_MODULE_VERSION);tuModuleHeader(w,head,'tuim-panel');
 const body=E('div',w);body.className='tuim-travel-body';tuModuleOpen('tuim-travel-window');
 const intro=E('small',body,'Travel planner · Experimental restock predictions');
 const controls=E('div',body);controls.className='tuim-travel-grid';
 const field=(label,key)=>{const box=E('label',controls,label),x=E('input',box);x.type='number';x.min=0;x.value=travel[key];x.onchange=()=>{travel[key]=x.value;travelSave();refresh()};return x};
 const select=(label,key,options)=>{const box=E('label',controls,label),x=E('select',box);for(const [v,n] of Object.entries(options)){const o=E('option',x,n);o.value=v}x.value=travel[key];return x};
 const country=select('Destination','country',travelCountries);
 const mode=select('Flight mode','mode',{standard:'Standard',airstrip:'Airstrip',private:'Private Jet',business:'Business Class'});
 const item=select('Item','item',{'':'Select an item'});
 field('Carrying capacity','capacity');field('Arrival buffer (min)','buffer');field('Selling fee (%)','fee');
 const book=select('Mailing Yourself Abroad','book',{'false':'No','true':'Yes'});book.value=String(!!travel.book);book.onchange=()=>{travel.book=book.value==='true';travelSave();refresh()};
 const info=E('small',body,'Loading item catalog...');
 const output=E('div',body);output.className='tuim-travel-output';
 const reportingPanel=E('div',body);reportingPanel.className='tuim-travel-output';
 window.addEventListener('tu-time-display-changed',()=>{if(w.isConnected)refresh()},{signal:undefined});
 const actions=E('div',body);actions.className='tuim-travel-actions';
 B(actions,'Refresh travel plan',refresh);
 B(actions,'Arm departure reminder',()=>{if(!travel.departure||travel.departure*1000<=Date.now()+30000)return alert('No future recommended departure');travel.armed=true;travelAlerted=0;travelSave();alert('Reminder armed; keep PDA active')});
 const box=(parent,title)=>{const d=E('div',parent);d.className='tuim-travel-card';if(title){const t=E('small',d,title);t.className='tuim-travel-muted'}return d};
 const line=(parent,name,value)=>{const r=E('div',parent);r.className='tuim-travel-line';E('span',r,name);E('strong',r,String(value));return r};
 const date=t=>t?travelDate(t):'Not available';
 const money=n=>Number.isFinite(n)?travelMoney(n):'Unavailable';
 function renderReporting(){
  reportingPanel.replaceChildren();
  const panel=box(reportingPanel,'Automatic Foreign Stock Reporting');
  const row=E('div',panel);row.className='tuim-travel-actions';
  const toggle=B(row,stockReportingEnabled()?'Reporting: ON':'Reporting: OFF',()=>{localStorage.setItem(stockReportingKey,stockReportingEnabled()?'no':'yes');renderReporting();if(stockReportingEnabled())reportForeignShop()});
  toggle.setAttribute('aria-pressed',String(stockReportingEnabled()));
  const details=E('div',panel);details.hidden=true;
  B(row,'ⓘ Info',()=>{details.hidden=!details.hidden});
  B(row,'Diagnostics',()=>{
   const overlay=E('div',document.body);overlay.style.cssText='position:fixed;inset:0;background:#000c;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:12px';
   const page=E('section',overlay);page.style.cssText='width:min(96vw,620px);max-height:90dvh;overflow:auto;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:14px;box-sizing:border-box';
   const header=E('div',page);header.style.cssText='display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#11191d;padding:6px 0';
   E('strong',header,'Travel Assistant and Item Monitor — Diagnostics');B(header,'×',()=>overlay.remove());
   const output=E('textarea',page);output.readOnly=true;output.style.cssText='width:100%;height:55dvh;box-sizing:border-box;white-space:pre;font:12px monospace;background:#233039;color:#fff;border:1px solid #d6b65c';
   const refresh=()=>{try{output.value=foreignShopDiagnostic()}catch(e){output.value='Diagnostic failed: '+(e?.message||String(e))}};
   refresh();
   const actions=E('div',page);actions.className='tuim-travel-actions';
   B(actions,'Refresh',refresh);
   B(actions,'Copy diagnostics',async()=>{try{await navigator.clipboard.writeText(output.value)}catch(e){output.focus();output.select()}});
  });
  E('small',details,'Optional and off by default. When enabled and a supported foreign item shop is open, TU reads visible item IDs, inventory quantities, prices, country and observation timestamps when visible inventory changes, no more than once every five seconds. These are sent to the TU server to improve stock, depletion and restock forecasts. Player information is not transmitted. An orange check indicates pending server delivery; green indicates a server acknowledgment. Failed uploads are retained locally for retry. Reporting stops when the shop is not visible or you disable it. Data may still be associated with network metadata handled by the hosting provider.');
  E('small',panel,stockReportingEnabled()?'DOM observations: orange = queued, green = D1 accepted. API/YATA observations are separate server-sourced data.':'DOM reporting disabled; server API/YATA data is separate');
  const status=E('small',panel,stockReportingEnabled()?stockReportStatus:'Reporting disabled');status.id='tuim-stock-report-status';
 }
 renderReporting();
 function show(model){
  if(!w.isConnected)return;
  output.replaceChildren();travelDataModel=model;travelDataRender();
  E('h3',output,'Recommended travel schedule');
  const schedule=box(output);
  const now=Date.now()/1000;
  const forecast=model.pred?.status==='experimental';
  const end=forecast?Number(model.pred.expected_end_at):0;
  const start=forecast?Number(model.pred.expected_start_at):0;
  const missed=!!model.depart&&model.depart<=now;
  const arrivalNow=now+model.minutes*60;
  if(missed){
   line(schedule,'Original departure','Missed ('+date(model.depart)+')');
   line(schedule,'Original arrival','Missed ('+date(model.arrive)+')');
   line(schedule,'Flight duration',model.minutes+' minutes');
   if(end>now){
    line(schedule,'Earliest departure','Depart now');
    line(schedule,'Arrival if departing now',date(arrivalNow));
    line(schedule,'Travel opportunity',arrivalNow<=end?'Arrival within forecast window':'Unlikely to arrive before forecast window ends');
   }else{
    line(schedule,'Next recommended departure','Next forecast unavailable');
   }
  }else{
   line(schedule,'Recommended departure',date(model.depart));
   line(schedule,'Flight duration',model.minutes+' minutes');
   line(schedule,'Estimated arrival',date(model.arrive));
  }
  if(model.stock?.observed_at>0)line(schedule,'Last observed stock (server history)',String(model.stock.quantity??'Unknown')+' at '+date(model.stock.observed_at));
  if(model.flight?.traveling){
   const flight=model.flight;
   line(schedule,'Current travel status',flight.destination==='torn'?'Returning to Torn':'In flight'+(flight.destination?' to '+travelCountries[flight.destination]:''));
   line(schedule,'Estimated in-flight arrival',flight.arrival?date(flight.arrival):'Unavailable from Torn API');
   if(flight.arrival)line(schedule,'Time remaining',Math.max(0,Math.ceil((flight.arrival-now)/60))+' minutes');
   if(flight.destination==='torn'){
    line(schedule,'Stock on arrival','Returning to Torn — foreign stock forecast not applicable');
   }else if(flight.destination&&flight.destination!==travel.country){
    line(schedule,'Item forecast','Select your flight destination to evaluate stock');
   }else{
    const q=Number(model.stock?.quantity);
    const observed=Number(model.stock?.observed_at);
    const fresh=Number.isFinite(observed)&&observed>0&&now-observed<=900;
    let assessment='Insufficient data';
    if(fresh&&q>0)assessment='Stock recently observed; availability at arrival not guaranteed';
    else if(fresh&&q===0)assessment='Recently observed out of stock';
    if(flight.arrival){
     if(fresh&&q>0&&flight.arrival-now<=900)assessment='Stock recently observed; availability at arrival not guaranteed';
     else if(forecast&&flight.arrival>=start&&flight.arrival<=end)assessment='Arrival within projected restock window';
     else if(forecast&&flight.arrival>end)assessment='Arrival after projected window; availability unknown';
     else if(forecast&&flight.arrival<start)assessment='Arrival before projected window';
    }
    line(schedule,'Stock on arrival',assessment);
    if(Number.isFinite(q)&&observed>0)line(schedule,'Last observed stock',q+' items at '+date(observed));
   }
  }else if(model.flight?.error)E('small',schedule,'Live flight status unavailable: '+model.flight.error);
  line(schedule,'Predicted restock window',forecast?date(start)+' – '+date(end):'Insufficient data');
  line(schedule,'Forecast confidence score',forecast?Math.round(travelNum(model.pred.confidence)*100)+'% (not a probability)':'Unavailable');
  if(model.metrics){
   const m=model.metrics;
   line(schedule,'Estimated current stock',m.estimate==null?'Unavailable — insufficient recent depletion data':m.estimate+' items · '+m.confidence+' confidence (heuristic)');
  }
  if(missed&&end>now&&arrivalNow<=end)E('small',schedule,'Original departure has passed. Departing now may still reach the predicted window; stock is not guaranteed.');
  if(missed&&end>now&&arrivalNow>end)E('small',schedule,'Original departure has passed. The remaining predicted window is shorter than the flight. Next forecast unavailable.');
  if(missed&&end<=now)E('small',schedule,'Predicted window has ended. Next forecast unavailable.');
  E('h3',output,'Item pricing and profit');
  const pricing=box(output);
  line(pricing,'Foreign purchase price',money(model.buy));
  line(pricing,'Torn resale listing',money(model.sell));
  line(pricing,'Gross difference per item',money(model.gross));
  line(pricing,'Selling fee per item',money(model.fee));
  line(pricing,'Net profit per item',money(model.net));
  const total=box(output,'Net haul profit after travel expenses');
  total.className+=' tuim-travel-total';
  E('strong',total,money(model.haul));
  line(total,'Gross haul profit after selling fees',money(model.grossHaul));
  line(total,'Round-trip travel cost ('+(travel.mode==='standard'?'Standard':mode.selectedOptions[0]?.textContent||travel.mode)+')',money(model.travelCost));
  line(total,'Cash needed for full-capacity haul',money(model.cash));
  line(total,'Estimated net sale proceeds',money(model.proceeds));
  line(total,'Planned haul quantity',model.qty+' items');
  if(model.issues?.length)E('small',output,'API issues: '+model.issues.join('; '));
  E('small',output,'Prices are listings, not guaranteed sales. Stock is a last-observed snapshot; predictions are experimental. Flight eligibility must be verified in Torn.');
  const dataActions=E('div',output);dataActions.style.cssText='display:flex;justify-content:flex-end;margin-top:14px';const dataButton=B(dataActions,'Data Used',travelDataOpen);dataButton.style.cssText='font-size:11px;padding:4px 9px;min-height:26px';
 }
 let serial=0;
 async function populate(){
  const selected=travel.country;
  try{const all=await getCatalog();if(!w.isConnected||selected!==travel.country)return;
   item.replaceChildren();const first=E('option',item,'Select an item');first.value='';
   const matched=all.filter(x=>[...(x.locations||[]),x.country||''].some(v=>travelAliases[selected].some(n=>norm(v).includes(norm(n)))));
   for(const x of matched){const o=E('option',item,x.name);o.value=x.id}
   item.value=travel.item;info.textContent=matched.length+' destination items found';
   refresh();
  }catch(e){info.textContent='Catalog unavailable: '+e.message}
 }
 async function refresh(){
  const seq=++serial,minutes=travelMinutes(),cap=Math.floor(travelNum(travel.capacity)),empty={minutes,depart:null,arrive:(Date.now()/1000)+minutes*60,pred:null,buy:NaN,sell:NaN,gross:NaN,fee:NaN,net:NaN,haul:NaN,cash:NaN,proceeds:NaN,qty:cap,stock:null,issues:[]};
  const id=Number(travel.item);
  if(!Number.isSafeInteger(id)||id<=0){show(empty);return}
  info.textContent='Retrieving current stock and prices...';
  const base='https://tu-multiplayer-server.tuserver.workers.dev/api/foreign/',query='?country='+travel.country+'&item_id='+id;
  const pdaKey='###PDA-APIKEY###';
  const key=!pdaKey.includes('PDA-APIKEY')?pdaKey:(window.TornUtilities?.apiKey||window.TornUtilities?.getApiKey?.()||'');
  const flightPromise=travelCurrentFlight(key);
  const jobs=[travelGet(base+'history'+query+'&limit=200'),travelGet(base+'prediction'+query+'&lead_seconds='+Math.ceil((minutes+travelNum(travel.buffer))*60+60)),key?travelGet('https://api.torn.com/v2/market/'+id+'/itemmarket?key='+encodeURIComponent(key)):Promise.reject(Error('Torn API key unavailable'))];
  const settled=await Promise.allSettled(jobs);if(seq!==serial||!w.isConnected)return;
  const [history,pred,market]=settled.map(x=>x.status==='fulfilled'?x.value:null);
  const flight=await flightPromise;if(seq!==serial||!w.isConnected)return;
  if(flight?.traveling&&!flight.arrival&&travel.manualArrival>Date.now()/1000)flight.arrival=travel.manualArrival;
  const issues=settled.map((x,i)=>x.status==='rejected'?['Foreign stock','Prediction','Market price'][i]+': '+x.reason.message:null).filter(Boolean);
  const metrics=stockHistoryMetrics(history),latest=metrics.latest,buy=Number(latest?.unit_price)>0?Number(latest.unit_price):NaN,sell=market?travelMarket(market):null;
  const qty=cap;
  const gross=sell&&Number.isFinite(buy)?sell-buy:NaN,fee=sell?travelNum(travel.fee)/100*sell:NaN,net=gross-fee,grossHaul=net*cap,travelCost=travel.mode==='standard'?2*travelCosts[travel.country]:0,haul=grossHaul-travelCost,fullHaul=haul,cash=buy*cap,proceeds=(sell-fee)*cap;
  const depart=pred?.status==='experimental'?pred.expected_start_at-(minutes+travelNum(travel.buffer))*60:null;
  travel.departure=depart&&depart>Date.now()/1000+30?depart:0;travel.armed=false;travelSave();
  show({minutes,depart,arrive:depart?depart+minutes*60:Date.now()/1000+minutes*60,realTimeReportingTotal:Number.isFinite(Number(history?.real_time_reporting_total))?Number(history.real_time_reporting_total):null,flight,stock:{quantity:latest?.quantity,observed_at:latest?.source_observed_at},metrics,pred,buy,sell,gross,fee,net,haul,grossHaul,travelCost,fullHaul,cash,proceeds,qty,issues});
  info.textContent=issues.length?'Partial API data · See warnings':'Updated '+new Date().toLocaleTimeString();
 }
 country.onchange=()=>{travel.country=country.value;travel.item='';travelSave();populate()};
 mode.onchange=()=>{travel.mode=mode.value;travelSave();refresh()};
 item.onchange=()=>{travel.item=item.value;travelSave();refresh()};
 show({minutes:travelMinutes(),depart:null,arrive:Date.now()/1000+travelMinutes()*60,pred:null,buy:NaN,sell:NaN,gross:NaN,fee:NaN,net:NaN,haul:NaN,cash:NaN,proceeds:NaN,qty:Math.floor(travelNum(travel.capacity)),stock:null,issues:[]});
 populate();
}

function render(){const p=state.panel;if(!p)return;p.scrollTop=0;p.replaceChildren();const h=E('div',p);h.className='tuim-header';draggable(p,h);E('strong',h,'Travel Assistant and Item Monitor');B(h,'−',()=>{p.hidden=true;state.catalogWindow?.remove();state.catalogWindow=null;state.context?.minimize?.()});B(h,'×',()=>{p.hidden=true;state.catalogWindow?.remove();state.catalogWindow=null;state.context?.close?.()});const travelSection=E('div',p);travelSection.className='tuim-section-travel';E('h3',travelSection,'Travel Assistant');E('p',travelSection,'Travel planning, foreign inventory reporting, and restock predictions');B(travelSection,'Open Travel Assistant',travelUI);const divider=E('hr',p);divider.style.cssText='border:0;border-top:2px solid #cba953;margin:16px 0';E('h3',p,'Item Monitor');B(p,category()==='Item Market'?'Select Current Market Item':'Select item on Torn',pick);B(p,'Select Item from Complete List',openCatalog);E('p',p,'Current selection: '+(state.selected?state.selected.category+' / '+state.selected.name:'None'));const label=(t)=>E('label',p,t);label('Minimum available quantity (Foreign / Stores)');const q=E('input',p);q.type='number';q.min='1';q.placeholder='No quantity alert';label('Alert at or below unit price ($, Item Market / Stores)');const pr=E('input',p);pr.type='number';pr.min='0';pr.step='0.01';pr.placeholder='No price alert';if(state.selected){const prev=state.items.find(w=>w.category===state.selected.category&&(w.key===state.selected.key||norm(w.name)===norm(state.selected.name)));if(prev){q.value=prev.minQty??'';pr.value=prev.maxPrice??''}}B(p,'Add / update monitor',()=>{if(!state.selected)return alert('Select an item first.');const s=state.selected;const minQty=q.value.trim()===''?null:Number(q.value),maxPrice=pr.value.trim()===''?null:Number(pr.value);if(s.category==='Foreign'&&minQty===null)return alert('Enter a minimum quantity for foreign items.');if(s.category==='Item Market'&&maxPrice===null)return alert('Enter a target price for Item Market.');if(minQty===null&&maxPrice===null)return alert('Enter a quantity or target price.');if(minQty!==null&&(!Number.isFinite(minQty)||minQty<1)||maxPrice!==null&&(!Number.isFinite(maxPrice)||maxPrice<0))return alert('Invalid target.');state.items=state.items.filter(w=>!(w.category===s.category&&(w.key===s.key||norm(w.name)===norm(s.name))));clearHighlights();state.items.push({...s,minQty:s.category==='Item Market'?null:minQty,maxPrice:s.category==='Foreign'?null:maxPrice,fired:false,status:'Waiting'});save();scan();render()});const st=E('p',p,state.items.length+' monitored item(s)');st.id='tuim-status';for(const cat of ['Foreign','Stores','Item Market','Other']){const watches=state.items.filter(w=>w.category===cat);if(!watches.length)continue;E('h3',p,cat+' ('+watches.length+')');for(const w of watches){const line=E('div',p);line.className='tuim-entry';const heading=E('strong',line,w.name+' ✎');heading.style.cssText='cursor:pointer;color:#d6b65c;padding:5px 0';heading.setAttribute('role','button');heading.tabIndex=0;const edit=()=>{state.selected={category:w.category,name:w.name,key:w.key};render();state.panel.scrollTo({top:0,behavior:'smooth'});state.panel.querySelectorAll('input[type=number]')[w.category==='Item Market'?1:0]?.focus()};heading.onclick=edit;heading.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit()}};E('div',line,'Qty ≥ '+(w.minQty??'off')+' | Price ≤ '+(w.maxPrice==null?'off':'$'+w.maxPrice.toLocaleString()));E('small',line,w.status||'Waiting');B(line,'Edit',edit);B(line,'Remove',()=>{state.items=state.items.filter(x=>x!==w);clearHighlights();save();scan();render()})}}B(p,'Clear all monitors',()=>{if(!confirm('Remove all monitored items?'))return;state.items=[];clearHighlights();save();render()});E('h3',p,'Alarm settings');label('Volume (%)');const vol=E('input',p);vol.type='range';vol.min=0;vol.max=100;vol.value=state.cfg.alarmVolume??60;vol.style.touchAction='none';const setVolume=x=>{const rect=vol.getBoundingClientRect();if(!rect.width)return;vol.value=String(Math.round(Math.max(0,Math.min(100,(x-rect.left)/rect.width*100))));state.cfg.alarmVolume=vol.value;saveCfg()};let volumePointer=null;vol.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();e.stopImmediatePropagation();volumePointer=e.pointerId;vol.setPointerCapture?.(e.pointerId);setVolume(e.clientX)},{capture:true,passive:false});vol.addEventListener('pointermove',e=>{if(volumePointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();setVolume(e.clientX)},{capture:true,passive:false});for(const ev of ['pointerup','pointercancel','lostpointercapture'])vol.addEventListener(ev,e=>{if(volumePointer===e.pointerId)volumePointer=null;e.stopPropagation()},{capture:true});vol.addEventListener('touchmove',e=>{if(volumePointer!==null)e.preventDefault();e.stopPropagation()},{passive:false});vol.oninput=()=>{state.cfg.alarmVolume=vol.value;saveCfg()};label('Sound');const snd=E('select',p);for(const v of ['beep','siren','chime']){const o=E('option',snd,v);o.value=v}snd.value=state.cfg.alarmSound||'beep';snd.onchange=()=>{state.cfg.alarmSound=snd.value;saveCfg()};label('Duration (seconds)');const dur=E('input',p);dur.type='number';dur.min=.5;dur.max=30;dur.value=state.cfg.alarmDuration??3;dur.oninput=()=>{state.cfg.alarmDuration=dur.value;saveCfg()};B(p,'Test alarm',sound);E('p',p,'Monitors persist across navigation and refresh. Alerts only evaluate visible listings while Torn is running.')}
function migrate(){if(localStorage.getItem('tuim-migrated'))return;const old=load(OLD,[]);for(const w of old){if(!w.name)continue;const key=w.key?.startsWith('id:')?w.key:'name:'+norm(w.name);if(!state.items.some(x=>x.key===key&&x.category==='Foreign'))state.items.push({category:'Foreign',name:w.name,key,minQty:Number(w.min)||null,maxPrice:null,status:'Migrated',fired:false})}save();localStorage.setItem('tuim-migrated','1')}
function activate(ctx){state.context=ctx;style();if(!state.panel){state.panel=E('section',document.body);state.panel.id='tuim-panel'}state.panel.hidden=false;state.panel.style.height=state.panel.style.height||'min(62dvh,540px)';render();scan()}
function deactivate(){travelClose();state.catalogWindow?.remove();state.catalogWindow=null;stopPick();if(state.panel)state.panel.hidden=true;state.context=null}
migrate();style();let pending=false;const obs=new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;scan()},400)});obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});window.addEventListener('pageshow',scan);window.addEventListener('popstate',()=>setTimeout(scan,300));setInterval(()=>{if(state.items.length)scan()},2000);scan();
const definition={id:ID,version:TU_MODULE_VERSION,activate,deactivate};const register=()=>window.TornUtilities?.register?.(definition);window.addEventListener('torn-utilities-ready',register);register();
})();
  }
  run();
})();
