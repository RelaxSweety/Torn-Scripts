// ==UserScript==
// @name         TU Item Monitor
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      1.1.0
// @description  Persistent foreign, shop and item market quantity and price alerts
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(()=>{'use strict';if(window.__TU_ITEM_MONITOR__)return;window.__TU_ITEM_MONITOR__=true;
const ID='item-monitor',KEY='tu-item-monitor-v1',OLD='tuac-watches';
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
const state={items:load(KEY,[]),cfg:load('tuac-settings',{}),panel:null,context:null,picking:false,selected:null,observer:null,alarmTimers:[],audio:null,muted:false};
const save=()=>localStorage.setItem(KEY,JSON.stringify(state.items.map(({category,name,key,minQty,maxPrice})=>({category,name,key,minQty,maxPrice}))));
const saveCfg=()=>localStorage.setItem('tuac-settings',JSON.stringify(state.cfg));
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const text=e=>e?.innerText||e?.textContent||'';
const money=v=>{const m=String(v||'').match(/\$\s*([\d,]+(?:\.\d+)?)/);return m?Number(m[1].replaceAll(',','')):NaN};
const pageItem=()=>{const params=new URLSearchParams(location.search);const id=params.get('itemID')||params.get('itemId')||params.get('item_id')||params.get('ID');const heading=document.querySelector('h1,h2,[class*=itemTitle],[class*=ItemTitle]');const name=(text(heading)||document.title.replace(/\s*\|.*$/,'')).trim();return {key:id?'id:'+id:'name:'+norm(name),name:name||'Selected market item'}};
const listingSelector='[data-listing-id],[data-seller-id],tr,[role=row],[class*=sellerRow],[class*=SellerRow],[class*=listingRow],[class*=ListingRow],[class*=marketRow],[class*=MarketRow]';
const listings=()=>[...document.querySelectorAll(listingSelector)].filter(e=>!e.closest('#tuim-panel,#tu-pda-panel')&&Number.isFinite(listingPrice(e))&&(!e.parentElement?.closest(listingSelector)));
const listingPrice=row=>{const unit=row.querySelector('[data-unit-price],[class*=unitPrice],[class*=UnitPrice],[class*=pricePer],[class*=PricePer]');if(unit){const n=money(unit.getAttribute('data-unit-price')||text(unit));if(Number.isFinite(n))return n}for(const el of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const n=money(el.getAttribute('data-price')||text(el));if(Number.isFinite(n))return n}return money(text(row))};
const candidates='[data-item-id],[data-itemname],[data-item-name],tr,[role=row],li,[class*=itemWrap],[class*=ItemWrap],[class*=itemRow],[class*=ItemRow],[class*=itemCard],[class*=ItemCard],[class*=row],[class*=Row],[class*=card],[class*=Card]';
const category=()=>{const url=(location.pathname+location.search+location.hash).toLowerCase();if(/itemmarket|item-market|item_market|market.php|item.php/.test(url))return 'Item Market';if(/travel|abroad|foreign|country/.test(url)||document.querySelector('[class*=foreignStock],[class*=ForeignStock]'))return 'Foreign';if(/shop|store|bazaar|city/.test(url))return 'Stores';return 'Other'};
const nameOf=row=>{const e=row.querySelector('[data-itemname],[data-item-name],[class*=itemName],[class*=ItemName],[class*=name],[class*=Name]');return (e?.getAttribute('data-itemname')||e?.getAttribute('data-item-name')||text(e)||text(row)).split('\n').map(x=>x.trim()).find(Boolean)?.slice(0,90)||''};
const idOf=row=>row.getAttribute('data-item-id')||row.querySelector('[data-item-id]')?.getAttribute('data-item-id')||'';
const keyOf=row=>idOf(row)?'id:'+idOf(row):'name:'+norm(nameOf(row));
const quantity=row=>{for(const e of row.querySelectorAll('[data-stock],[data-quantity],[class*=stock],[class*=Stock],[class*=quantity],[class*=available]')){const raw=e.getAttribute('data-stock')||e.getAttribute('data-quantity')||text(e);const m=raw.match(/(?:stock|quantity|available|remaining|in stock)?\s*:?\s*([\d,]+)/i);if(m)return Number(m[1].replaceAll(',',''))}const m=text(row).match(/(?:stock|quantity|available|remaining)\s*:?\s*([\d,]+)/i);return m?Number(m[1].replaceAll(',','')):NaN};
const price=row=>{for(const e of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const raw=e.getAttribute('data-price')||text(e);const m=raw.match(/\$\s*([\d,]+(?:\.\d+)?)/)||raw.match(/^\s*([\d,]+(?:\.\d+)?)\s*$/);if(m)return Number(m[1].replaceAll(',',''))}const m=text(row).match(/\$\s*([\d,]+(?:\.\d+)?)/);return m?Number(m[1].replaceAll(',','')):NaN};
const E=(tag,parent,t)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;parent?.append(e);return e};
const B=(p,t,f)=>{const b=E('button',p,t);b.type='button';b.onclick=f;return b};
function style(){if(document.getElementById('tuim-style'))return;const e=E('style',document.head||document.documentElement);e.id='tuim-style';e.textContent='#tuim-panel{position:fixed;z-index:2147483642;top:10vh;left:4vw;width:min(92vw,440px);min-width:220px;min-height:160px;max-width:calc(100vw - 12px);height:min(68dvh,600px);max-height:calc(100dvh - 140px);overflow:auto;overscroll-behavior:contain;resize:both;box-sizing:border-box;overflow-wrap:anywhere;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:12px;padding:12px;font:14px system-ui}#tuim-panel[hidden]{display:none!important}#tuim-panel button{max-width:100%;white-space:normal;margin:4px;padding:8px;background:#d6b65c;color:#111;border:0;border-radius:5px}#tuim-panel input,#tuim-panel select{width:100%;box-sizing:border-box;padding:7px;margin:4px 0 10px;background:#283239;color:white}#tuim-panel label{display:block;margin-top:7px}#tuim-panel .tuim-header{display:flex;align-items:center;gap:6px;position:sticky;top:-12px;background:#11191d;z-index:2;padding:8px 0;touch-action:none;cursor:move}#tuim-panel .tuim-header strong{flex:1;min-width:0}#tuim-panel .tuim-header button{flex:0 0 auto}#tuim-panel div,#tuim-panel p,#tuim-panel small{overflow-wrap:anywhere}.tuim-watch{outline:3px solid #d83030!important;outline-offset:-2px!important}.tuim-wait{outline:3px solid #d83030!important;outline-offset:-2px!important}.tuim-trigger{outline:4px solid #00ff69!important;outline-offset:-2px!important}'}
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
      const matching=w.key===active.key||norm(w.name)===norm(active.name);
      if(!matching){w.status='Waiting for '+w.name;w.fired=false;continue}
      const found=listings(),qualifying=[];
      for(const row of found){
        const p=listingPrice(row);
        const match=w.maxPrice!=null&&Number.isFinite(p)&&p<=w.maxPrice;
        row.classList.toggle('tuim-trigger',match);
        if(match)qualifying.push({row,p});
      }
      w.status=qualifying.length?qualifying.length+' qualifying listing(s), lowest $'+Math.min(...qualifying.map(x=>x.p)).toLocaleString():found.length+' listing(s), none at target';
      if(qualifying.length&&!w.fired){w.fired=true;alertItem(w,w.status)}
      if(!qualifying.length)w.fired=false;
      continue;
    }
    if(!w.row?.isConnected)w.row=null;
    if(!w.row)w.row=rows.filter(r=>keyOf(r)===w.key||(w.key.startsWith('name:')&&norm(text(r)).includes(w.key.slice(5)))).sort((a,b)=>text(a).length-text(b).length)[0]||null;
    if(previous&&previous!==w.row)previous.classList.remove('tuim-watch','tuim-trigger','tuim-wait');
    if(!w.row){w.status='Not visible';w.fired=false;continue}
    const q=quantity(w.row),p=price(w.row);
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
function stopPick(){if(!state.picking)return;state.picking=false;for(const event of ['pointerdown','touchstart','mousedown','click'])document.removeEventListener(event,intercept,true);document.getElementById('tuim-tip')?.remove()}
function intercept(e){if(e.target.closest('#tuim-tip,#tuim-panel,#tu-pda-panel'))return;const row=e.target.closest(candidates);if(!row&&category()!=='Item Market')return;e.preventDefault();e.stopImmediatePropagation();if(e.type==='click'){state.selected=category()==='Item Market'?{category:'Item Market',...pageItem()}: {category:category(),name:nameOf(row),key:keyOf(row),row};stopPick();state.panel.hidden=false;render()}else if(e.type==='pointerdown'||e.type==='touchstart'){state.selected={category:category(),name:nameOf(row),key:keyOf(row),row};setTimeout(()=>{if(state.picking){stopPick();state.panel.hidden=false;render()}},500)}}
function pick(){stopPick();if(category()==='Item Market'){state.selected={category:'Item Market',...pageItem()};render();return}state.picking=true;state.panel.hidden=true;const tip=E('div',document.body,'Tap an item to monitor. Tap here to cancel.');tip.id='tuim-tip';tip.style.cssText='position:fixed;z-index:2147483646;top:10px;left:5%;width:90%;padding:12px;background:#3a2c16;color:white;border:2px solid gold';tip.onclick=()=>{stopPick();state.panel.hidden=false};for(const event of ['pointerdown','touchstart','mousedown','click'])document.addEventListener(event,intercept,{capture:true,passive:false})}
function render(){const p=state.panel;if(!p)return;p.replaceChildren();const h=E('div',p);h.className='tuim-header';E('strong',h,'Item Monitor');B(h,'−',()=>p.hidden=true);B(h,'×',()=>{p.hidden=true;state.context?.close?.()});B(p,category()==='Item Market'?'Use current Item Market item':'Select item on Torn',pick);E('p',p,'Current selection: '+(state.selected?state.selected.category+' / '+state.selected.name:'None'));const label=(t)=>E('label',p,t);label('Minimum available quantity (Foreign / Stores)');const q=E('input',p);q.type='number';q.min='1';q.placeholder='No quantity alert';label('Alert at or below unit price ($, Item Market / Stores)');const pr=E('input',p);pr.type='number';pr.min='0';pr.step='0.01';pr.placeholder='No price alert';if(state.selected){const prev=state.items.find(w=>w.category===state.selected.category&&w.key===state.selected.key);if(prev){q.value=prev.minQty??'';pr.value=prev.maxPrice??''}}B(p,'Add / update monitor',()=>{if(!state.selected)return alert('Select an item first.');const s=state.selected;const minQty=q.value.trim()===''?null:Number(q.value),maxPrice=pr.value.trim()===''?null:Number(pr.value);if(s.category==='Foreign'&&minQty===null)return alert('Enter a minimum quantity for foreign items.');if(s.category==='Item Market'&&maxPrice===null)return alert('Enter a target price for Item Market.');if(minQty===null&&maxPrice===null)return alert('Enter a quantity or target price.');if(minQty!==null&&(!Number.isFinite(minQty)||minQty<1)||maxPrice!==null&&(!Number.isFinite(maxPrice)||maxPrice<0))return alert('Invalid target.');state.items=state.items.filter(w=>!(w.category===s.category&&w.key===s.key));state.items.push({...s,minQty:s.category==='Item Market'?null:minQty,maxPrice:s.category==='Foreign'?null:maxPrice,fired:false,status:'Waiting'});save();scan();render()});const st=E('p',p,state.items.length+' monitored item(s)');st.id='tuim-status';for(const cat of ['Foreign','Stores','Item Market','Other']){const watches=state.items.filter(w=>w.category===cat);if(!watches.length)continue;E('h3',p,cat+' ('+watches.length+')');for(const w of watches){const line=E('div',p);line.style.cssText='border:1px solid #3ba35b;border-radius:6px;padding:6px;margin:6px 0';E('strong',line,w.name);E('div',line,'Qty ≥ '+(w.minQty??'off')+' | Price ≤ '+(w.maxPrice==null?'off':'$'+w.maxPrice.toLocaleString()));E('small',line,w.status||'Waiting');B(line,'Remove',()=>{w.row?.classList.remove('tuim-watch','tuim-trigger');state.items=state.items.filter(x=>x!==w);save();render()})}}B(p,'Clear all monitors',()=>{if(!confirm('Remove all monitored items?'))return;for(const w of state.items)w.row?.classList.remove('tuim-watch','tuim-trigger');state.items=[];save();render()});E('h3',p,'Alarm settings');label('Volume (%)');const vol=E('input',p);vol.type='range';vol.min=0;vol.max=100;vol.value=state.cfg.alarmVolume??60;vol.oninput=()=>{state.cfg.alarmVolume=vol.value;saveCfg()};label('Sound');const snd=E('select',p);for(const v of ['beep','siren','chime']){const o=E('option',snd,v);o.value=v}snd.value=state.cfg.alarmSound||'beep';snd.onchange=()=>{state.cfg.alarmSound=snd.value;saveCfg()};label('Duration (seconds)');const dur=E('input',p);dur.type='number';dur.min=.5;dur.max=30;dur.value=state.cfg.alarmDuration??3;dur.oninput=()=>{state.cfg.alarmDuration=dur.value;saveCfg()};B(p,'Test alarm',sound);E('p',p,'Monitors persist across navigation and refresh. Alerts only evaluate visible listings while Torn is running.')}
function migrate(){if(localStorage.getItem('tuim-migrated'))return;const old=load(OLD,[]);for(const w of old){if(!w.name)continue;const key=w.key?.startsWith('id:')?w.key:'name:'+norm(w.name);if(!state.items.some(x=>x.key===key&&x.category==='Foreign'))state.items.push({category:'Foreign',name:w.name,key,minQty:Number(w.min)||null,maxPrice:null,status:'Migrated',fired:false})}save();localStorage.setItem('tuim-migrated','1')}
function activate(ctx){state.context=ctx;style();if(!state.panel){state.panel=E('section',document.body);state.panel.id='tuim-panel'}state.panel.hidden=false;state.panel.style.height=state.panel.style.height||'min(68dvh,600px)';render();scan()}
function deactivate(){stopPick();if(state.panel)state.panel.hidden=true;state.context=null}
migrate();style();let pending=false;const obs=new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;scan()},400)});obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});window.addEventListener('pageshow',scan);window.addEventListener('popstate',()=>setTimeout(scan,300));setInterval(()=>{if(state.items.length)scan()},2000);scan();
const definition={id:ID,version:'1.1.0',activate,deactivate};const register=()=>window.TornUtilities?.register?.(definition);window.addEventListener('torn-utilities-ready',register);register();
})();