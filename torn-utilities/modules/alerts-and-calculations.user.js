// ==UserScript==
// @name         TU Alerts and Calculations
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.2.0
// @description  Stock cash targets, foreign stock alerts and calculator
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(()=>{'use strict';if(window.__TU_ALERT_CALC__)return;window.__TU_ALERT_CALC__=true;
const ID='alerts-calculations',state={panel:null,tab:'stocks',stock:null,item:null,watches:new Map(),observer:null,alarmTimers:[],minimized:false,context:null,pick:null,audio:null};
const cfg=(()=>{try{return window.TornUtilities?.storage?.get(ID,'settings',{})||{}}catch{return {}}})();
const save=()=>{try{window.TornUtilities?.storage?.set(ID,'settings',cfg)}catch{}};
const num=x=>Number(String(x??'').replace(/[$,\s]/g,''));const cash=x=>'$'+x.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const E=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent?.append(e);return e};
const B=(parent,text,fn)=>{const b=E('button',parent,text);b.type='button';b.onclick=fn;return b};
const F=(parent,label,key,defaultValue)=>{E('label',parent,label);const i=E('input',parent);i.type='number';i.step='any';i.value=cfg[key]??defaultValue??'';i.oninput=()=>{cfg[key]=i.value;save()};return i};
const info=(parent,text)=>E('p',parent,text);
const rowFor=e=>e.closest('tr,[role=row],li,[class*=row],[class*=Row],[class*=card],[class*=Card]')||e.parentElement;
const stockPrice=row=>{if(!row)return NaN;for(const el of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const m=(el.getAttribute('data-price')||el.textContent||'').match(/\$?\s*([\d,]+(?:\.\d+)?)/);if(m)return num(m[1])}const matches=(row.innerText||'').match(/\$\s*[\d,]+(?:\.\d+)?/g)||[];return matches.length===1?num(matches[0]):NaN};
const qtyField=row=>[...row.querySelectorAll('input:not([type=hidden])')].find(e=>e.type==='number'||/quantity|amount|shares/i.test([e.name,e.id,e.placeholder].join(' ')))||null;
function stopPick(){if(state.pick)document.removeEventListener('click',state.pick,true);state.pick=null;document.getElementById('tuac-tip')?.remove()}
function pick(kind){stopPick();state.panel.hidden=true;const tip=E('div',document.body,'Tap a Torn '+kind+' row to select it. Tap here to cancel.');tip.id='tuac-tip';tip.style.cssText='position:fixed;z-index:2147483646;top:10px;left:5%;width:90%;padding:12px;background:#3a2c16;color:white;border:2px solid gold';tip.onclick=()=>{stopPick();state.panel.hidden=false};state.pick=e=>{if(e.target.closest('#tuac-tip,#tuac-panel,#tu-pda-panel'))return;e.preventDefault();e.stopImmediatePropagation();const row=rowFor(e.target);if(kind==='stock')state.stock=row;else state.item=row;stopPick();state.minimized=false;state.panel.hidden=false;render()};document.addEventListener('click',state.pick,true)}
function stopSound(){for(const t of state.alarmTimers)clearTimeout(t);state.alarmTimers=[];}
function alarm(){
  stopSound();
  const duration=Math.max(.5,Math.min(30,num(cfg.alarmDuration||3)));
  const volume=Math.max(0,Math.min(100,num(cfg.alarmVolume??60)))/100;
  const sound=cfg.alarmSound||'beep';
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const a=state.audio||(state.audio=new C());a.resume?.();
    const tone=(offset)=>{
      if(!state.watches.size)return;
      const o=a.createOscillator(),g=a.createGain(),now=a.currentTime;
      o.type=sound==='siren'?'sawtooth':sound==='chime'?'sine':'square';
      o.frequency.setValueAtTime(sound==='chime'?1046:sound==='siren'?520:850,now);
      if(sound==='siren')o.frequency.linearRampToValueAtTime(1150,now+.2);
      g.gain.setValueAtTime(.0001,now);g.gain.linearRampToValueAtTime(volume*.16,now+.02);
      g.gain.exponentialRampToValueAtTime(.0001,now+.19);
      o.connect(g);g.connect(a.destination);o.start(now);o.stop(now+.2);
    };
    for(let t=0;t<duration*1000;t+=260)state.alarmTimers.push(setTimeout(tone,t));
  }catch(e){console.warn('[TU alerts] Audio unavailable',e)}
}
function notifyAlarm(name,qty){
  state.minimized=false;state.panel.hidden=false;render();
  state.tab='foreign';render();
  const message=state.panel.querySelector('#tuac-status');
  if(message)message.textContent='ALERT: '+name+' — '+qty+' available';
  alarm();
}
function quantity(row){for(const e of row.querySelectorAll('[data-stock],[data-quantity],[class*=stock],[class*=Stock],[class*=quantity],[class*=available]')){const t=e.getAttribute('data-stock')||e.getAttribute('data-quantity')||e.textContent||'';const m=t.match(/(?:stock|quantity|available|in stock)?\s*:?\s*([\d,]+)/i);if(m)return num(m[1])}const m=(row.innerText||'').match(/(?:stock|quantity|available|remaining)\s*:?\s*([\d,]+)/i);return m?num(m[1]):NaN}
function stopWatch(row){
  if(row){const w=state.watches.get(row);if(w){row.classList.remove('tuac-monitored','tuac-alert');state.watches.delete(row)}}
  else{for(const w of state.watches.values())w.row.classList.remove('tuac-monitored','tuac-alert');state.watches.clear()}
  if(!state.watches.size){state.observer?.disconnect();state.observer=null;stopSound();}
}
function scan(){
  for(const w of state.watches.values()){
    if(!w.row.isConnected){w.status='Item no longer on page';continue}
    const q=quantity(w.row);w.status=Number.isFinite(q)?'Available: '+q:'Quantity unavailable';
    w.row.classList.add('tuac-monitored');
    if(!Number.isFinite(q))continue;
    if(q>=w.min){
      w.row.classList.add('tuac-alert');
      if(!w.fired){w.fired=true;notifyAlarm(w.name,q)}
    }else{w.row.classList.remove('tuac-alert');w.fired=false}
  }
  const output=state.panel?.querySelector('#tuac-status');
  if(output&&!output.textContent.startsWith('ALERT:')){
    const total=state.watches.size;const t=total+' item(s) monitored';
    if(output.textContent!==t)output.textContent=t;
  }
}
function watch(min){
  if(!state.item?.isConnected||!Number.isFinite(min)||min<1){alert('Select a visible foreign item and enter a valid minimum.');return}
  const row=state.item;
  const name=(row.innerText||'Selected item').split('\n')[0].trim().slice(0,70);
  state.watches.set(row,{row,name,min,fired:false,status:'Waiting'});
  row.classList.add('tuac-monitored');
  if(!state.observer){
    let timer=null;
    state.observer=new MutationObserver(()=>{if(timer)return;timer=setTimeout(()=>{timer=null;scan()},350)});
    state.observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-stock','data-quantity']});
  }
  scan();render();
}
function minimize(){state.minimized=true;state.panel.hidden=true;}
// Closing ends monitoring; minimizing preserves it.
function close(){stopPick();stopWatch();state.minimized=false;state.panel.hidden=true;state.context?.close?.()}
function render(){const p=state.panel;p.replaceChildren();const header=E('div',p);header.style.cssText='display:flex;align-items:center;gap:10px';const title=E('strong',header,'Alerts and Calculations');title.style.flex='1';B(header,'−',minimize);B(header,'×',close);const nav=E('nav',p);for(const [id,label] of [['stocks','Stocks'],['foreign','Foreign Alerts'],['math','Calculator']])B(nav,label,()=>{state.tab=id;render()});const root=E('section',p);
if(state.tab==='stocks'){info(root,'Enter current cash and desired cash AFTER the trade. Select the stock row on Torn. This tool fills quantity only; you press Buy/Sell.');B(root,'Select Torn stock row',()=>pick('stock'));const priceDetected=state.stock?.isConnected?stockPrice(state.stock):NaN;info(root,'Selected: '+(state.stock?.isConnected?(state.stock.innerText||'').slice(0,80):'None'));E('label',root,'Trade type');const side=E('select',root);for(const type of ['Buy','Sell']){const o=E('option',side,type);o.value=type}side.value=cfg.side||'Buy';side.onchange=()=>{cfg.side=side.value;save()};const current=F(root,'Current cash ($)','cash','');const target=F(root,'Desired ending cash ($)','target','');const price=F(root,'Price per share ($)','price',Number.isFinite(priceDetected)?priceDetected:'');if(Number.isFinite(priceDetected))price.value=priceDetected;const fee=F(root,'Sell fee (%)','fee',0);const out=E('pre',root,'');B(root,'Calculate and fill quantity',()=>{const c=num(current.value),t=num(target.value),v=num(price.value),f=num(fee.value),buy=side.value==='Buy';if([c,t,v,f].some(x=>!Number.isFinite(x))||c<0||t<0||v<=0||f<0||f>=100){out.textContent='Invalid values';return}const delta=buy?c-t:t-c,unit=buy?v:v*(1-f/100);if(delta<=0){out.textContent='Target must be '+(buy?'lower':'higher')+' than current cash';return}const shares=Math.floor(delta/unit+1e-10);if(shares<1||!Number.isSafeInteger(shares)){out.textContent='No valid whole-share quantity';return}const end=buy?c-shares*unit:c+shares*unit;out.textContent='Shares: '+shares+'\nEstimated ending cash: '+cash(end)+'\nTarget difference: '+cash(Math.abs(end-t));const input=state.stock?.isConnected?qtyField(state.stock):null;if(!input){out.textContent+='\nNo Torn quantity input detected; nothing filled.';return}const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,String(shares));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));out.textContent+='\nQuantity entered. Verify Torn quote before confirming.'});info(root,'Confirm the current share price, cash balance and applicable fees. The script never submits trades.');}
else if(state.tab==='foreign'){
  info(root,'Select multiple foreign items. Every monitored item has a green outline. Monitoring continues when this window is minimized.',root);
  B(root,'Select another foreign item',()=>pick('item'));
  info(root,'Current selection: '+(state.item?.isConnected?(state.item.innerText||'').slice(0,70):'None'));
  const min=F(root,'Minimum quantity for selected item','minimum',10);
  B(root,'Add / update selected item',()=>watch(num(min.value)));
  const status=E('p',root,state.watches.size+' item(s) monitored');status.id='tuac-status';
  for(const w of state.watches.values()){
    const line=E('div',root);line.style.cssText='border:1px solid #3ba35b;border-radius:6px;padding:6px;margin:6px 0';
    E('span',line,w.name+' · Minimum '+w.min+' · '+w.status+' ');
    B(line,'Remove',()=>{stopWatch(w.row);render()});
  }
  B(root,'Stop all monitoring',()=>{stopWatch();render()});
  B(root,'Test alarm',()=>{if(!state.watches.size){state.watches.set(document.body,{row:document.body,name:'Test',min:1,fired:true});alarm();state.watches.delete(document.body)}else alarm()});
  E('h3',root,'Alarm Settings');
  E('label',root,'Volume: '+(cfg.alarmVolume??60)+'%');
  const vol=E('input',root);vol.type='range';vol.min='0';vol.max='100';vol.value=cfg.alarmVolume??60;vol.oninput=()=>{cfg.alarmVolume=vol.value;vol.previousElementSibling.textContent='Volume: '+vol.value+'%';save()};
  E('label',root,'Sound type');const sound=E('select',root);
  for(const [v,label] of [['beep','Beep'],['siren','Siren'],['chime','Chime']]){const o=E('option',sound,label);o.value=v}
  sound.value=cfg.alarmSound||'beep';sound.onchange=()=>{cfg.alarmSound=sound.value;save()};
  const duration=F(root,'Alarm duration (seconds, 0.5–30)','alarmDuration',3);duration.min='.5';duration.max='30';
  info(root,'Only displayed page stock is monitored. Background tabs, page reloads and navigation can interrupt monitoring. Audio may require a user gesture.');
}
else{const a=F(root,'First / original value','mathA','');const b=F(root,'Second / new value','mathB','');const op=E('select',root);for(const [v,label] of [['+','Add'],['-','Subtract'],['*','Multiply'],['/','Divide'],['pct','Percentage gain/loss'],['ratio','First as % of second']]){const o=E('option',op,label);o.value=v}op.value=cfg.op||'pct';op.onchange=()=>{cfg.op=op.value;save()};const out=E('p',root,'');B(root,'Calculate',()=>{const x=num(a.value),y=num(b.value);if(![x,y].every(Number.isFinite)){out.textContent='Invalid numbers';return}const v=op.value==='+'?x+y:op.value==='-'?x-y:op.value==='*'?x*y:op.value==='/'?x/y:op.value==='pct'?(y-x)/Math.abs(x)*100:x/y*100;out.textContent=Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:5})+(['pct','ratio'].includes(op.value)?'%':''):'Undefined (division by zero)'});}}
function activate(ctx){state.context=ctx; if(!state.panel){const style=E('style',document.head);style.textContent='#tuac-panel{position:fixed;z-index:2147483642;top:10vh;left:4vw;width:min(92vw,440px);max-height:80vh;overflow:auto;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:14px;padding:14px;font:14px system-ui;box-shadow:0 10px 30px #000c}#tuac-panel[hidden]{display:none!important}#tuac-panel button{margin:4px;padding:9px;background:#d6b65c;color:#111;border:0;border-radius:6px;font-weight:700}#tuac-panel nav{display:flex}#tuac-panel nav button{flex:1}#tuac-panel label{display:block;margin-top:10px}#tuac-panel input,#tuac-panel select{display:block;width:100%;box-sizing:border-box;background:#283239;color:#fff;border:1px solid #647077;border-radius:5px;padding:9px;font-size:16px}#tuac-panel pre{white-space:pre-wrap}.tuac-monitored{outline:3px solid #1ce15e!important;outline-offset:-2px!important}.tuac-alert{outline:4px solid #00ff69!important;outline-offset:-2px!important}';state.panel=E('section',document.body);state.panel.id='tuac-panel'}state.panel.hidden=false;render()}
function deactivate(){stopPick();stopWatch();if(state.panel)state.panel.hidden=true;state.context=null}
const definition={id:ID,version:'0.2.0',activate,deactivate};const register=()=>window.TornUtilities?.register?.(definition);window.addEventListener('torn-utilities-ready',register);register();
})();
