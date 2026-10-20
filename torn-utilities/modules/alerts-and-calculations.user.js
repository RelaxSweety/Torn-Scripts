// ==UserScript==
// @name         TU Stock and Calculations
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.4.6
// @description  Stock cash targets, foreign stock alerts and calculator
// @match        https://www.torn.com/*
// @grant        unsafeWindow
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/alerts-and-calculations.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/alerts-and-calculations.user.js
// ==/UserScript==
(()=>{'use strict';if(window.__TU_ALERT_CALC__)return;window.__TU_ALERT_CALC__=true;
const ID='alerts-calculations',state={panel:null,tab:'stocks',stock:null,minimized:false,context:null,pick:null,audio:null};
const cfg=(()=>{try{return JSON.parse(localStorage.getItem('tu-stock-calc-settings')||'{}')}catch{return {}}})();
const save=()=>{try{localStorage.setItem('tu-stock-calc-settings',JSON.stringify(cfg))}catch{}};
const num=x=>Number(String(x??'').replace(/[$,\s]/g,''));const cash=x=>'$'+x.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const E=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent?.append(e);return e};
const B=(parent,text,fn)=>{const b=E('button',parent,text);b.type='button';b.onclick=fn;return b};
const F=(parent,label,key,defaultValue)=>{E('label',parent,label);const i=E('input',parent);i.type='number';i.step='any';i.value=cfg[key]??defaultValue??'';i.oninput=()=>{cfg[key]=i.value;save()};return i};
const info=(parent,text)=>E('p',parent,text);
const rowFor=e=>e.closest('tr,[role=row],li,[class*=row],[class*=Row],[class*=card],[class*=Card]')||e.parentElement;
const stockPrice=row=>{if(!row)return NaN;for(const el of row.querySelectorAll('[data-price],[class*=price],[class*=Price]')){const m=(el.getAttribute('data-price')||el.textContent||'').match(/\$?\s*([\d,]+(?:\.\d+)?)/);if(m)return num(m[1])}const matches=(row.innerText||'').match(/\$\s*[\d,]+(?:\.\d+)?/g)||[];return matches.length===1?num(matches[0]):NaN};
const qtyField=row=>[...row.querySelectorAll('input:not([type=hidden])')].find(e=>e.type==='number'||/quantity|amount|shares/i.test([e.name,e.id,e.placeholder].join(' ')))||null;
function stopPick(){if(state.pick){document.removeEventListener('pointerdown',state.pick,true);document.removeEventListener('touchstart',state.pick,true);document.removeEventListener('mousedown',state.pick,true);document.removeEventListener('click',state.pick,true)}state.pick=null;document.getElementById('tuac-tip')?.remove()}
function pick(kind){stopPick();state.panel.hidden=true;const tip=E('div',document.body,'Tap a Torn '+kind+' row to select it. Tap here to cancel.');tip.id='tuac-tip';tip.style.cssText='position:fixed;z-index:2147483646;top:10px;left:5%;width:90%;padding:12px;background:#3a2c16;color:white;border:2px solid gold';tip.onclick=()=>{stopPick();state.panel.hidden=false};state.pick=e=>{if(e.target.closest('#tuac-tip,#tuac-panel,#tu-pda-panel'))return;const row=rowFor(e.target);if(!row)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(kind==='stock')state.stock=row;else state.item=row;stopPick();state.minimized=false;state.panel.hidden=false;render()};for(const event of ['pointerdown','touchstart','mousedown','click'])document.addEventListener(event,state.pick,{capture:true,passive:false})}
function minimize(){state.minimized=true;state.panel.hidden=true;}
// Closing ends monitoring; minimizing preserves it.
function close(){stopPick();state.minimized=false;state.panel.hidden=true;state.context?.close?.()}
function render(){const p=state.panel;p.replaceChildren();const header=E('div',p);header.style.cssText='display:flex;align-items:center;gap:10px';const title=E('strong',header,'Stock and Calculations');title.style.flex='1';B(header,'−',minimize);B(header,'×',close);const nav=E('nav',p);for(const [id,label] of [['stocks','Stocks'],['math','Calculator']])B(nav,label,()=>{state.tab=id;render()});const root=E('section',p);
if(state.tab==='stocks'){info(root,'Enter current cash and desired cash AFTER the trade. Select the stock row on Torn. This tool fills quantity only; you press Buy/Sell.');B(root,'Select Torn stock row',()=>pick('stock'));const priceDetected=state.stock?.isConnected?stockPrice(state.stock):NaN;info(root,'Selected: '+(state.stock?.isConnected?(state.stock.innerText||'').slice(0,80):'None'));E('label',root,'Trade type');const side=E('select',root);for(const type of ['Buy','Sell']){const o=E('option',side,type);o.value=type}side.value=cfg.side||'Buy';side.onchange=()=>{cfg.side=side.value;save()};const current=F(root,'Current cash ($)','cash','');const target=F(root,'Desired ending cash ($)','target','');const price=F(root,'Price per share ($)','price',Number.isFinite(priceDetected)?priceDetected:'');if(Number.isFinite(priceDetected))price.value=priceDetected;const fee=F(root,'Sell fee (%)','fee',0);const out=E('pre',root,'');B(root,'Calculate and fill quantity',()=>{const c=num(current.value),t=num(target.value),v=num(price.value),f=num(fee.value),buy=side.value==='Buy';if([c,t,v,f].some(x=>!Number.isFinite(x))||c<0||t<0||v<=0||f<0||f>=100){out.textContent='Invalid values';return}const delta=buy?c-t:t-c,unit=buy?v:v*(1-f/100);if(delta<=0){out.textContent='Target must be '+(buy?'lower':'higher')+' than current cash';return}const shares=Math.floor(delta/unit+1e-10);if(shares<1||!Number.isSafeInteger(shares)){out.textContent='No valid whole-share quantity';return}const end=buy?c-shares*unit:c+shares*unit;out.textContent='Shares: '+shares+'\nEstimated ending cash: '+cash(end)+'\nTarget difference: '+cash(Math.abs(end-t));const input=state.stock?.isConnected?qtyField(state.stock):null;if(!input){out.textContent+='\nNo Torn quantity input detected; nothing filled.';return}const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,String(shares));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));out.textContent+='\nQuantity entered. Verify Torn quote before confirming.'});info(root,'Confirm the current share price, cash balance and applicable fees. The script never submits trades.');}

else{const a=F(root,'First / original value','mathA','');const b=F(root,'Second / new value','mathB','');const op=E('select',root);for(const [v,label] of [['+','Add'],['-','Subtract'],['*','Multiply'],['/','Divide'],['pct','Percentage gain/loss'],['ratio','First as % of second']]){const o=E('option',op,label);o.value=v}op.value=cfg.op||'pct';op.onchange=()=>{cfg.op=op.value;save()};const out=E('p',root,'');B(root,'Calculate',()=>{const x=num(a.value),y=num(b.value);if(![x,y].every(Number.isFinite)){out.textContent='Invalid numbers';return}const v=op.value==='+'?x+y:op.value==='-'?x-y:op.value==='*'?x*y:op.value==='/'?x/y:op.value==='pct'?(y-x)/Math.abs(x)*100:x/y*100;out.textContent=Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:5})+(['pct','ratio'].includes(op.value)?'%':''):'Undefined (division by zero)'});}}
function activate(ctx){state.context=ctx; if(!state.panel){const style=E('style',document.head);style.textContent='#tuac-panel{position:fixed;z-index:2147483642;top:10vh;left:4vw;width:min(92vw,440px);max-height:80vh;overflow:auto;background:#11191d;color:#eee;border:1px solid #cba953;border-radius:14px;padding:14px;font:14px system-ui;box-shadow:0 10px 30px #000c}#tuac-panel[hidden]{display:none!important}#tuac-panel button{margin:4px;padding:9px;background:#d6b65c;color:#111;border:0;border-radius:6px;font-weight:700}#tuac-panel nav{display:flex}#tuac-panel nav button{flex:1}#tuac-panel label{display:block;margin-top:10px}#tuac-panel input,#tuac-panel select{display:block;width:100%;box-sizing:border-box;background:#283239;color:#fff;border:1px solid #647077;border-radius:5px;padding:9px;font-size:16px}#tuac-panel pre{white-space:pre-wrap}.tuac-monitored{outline:3px solid #1ce15e!important;outline-offset:-2px!important}.tuac-alert{outline:4px solid #00ff69!important;outline-offset:-2px!important}';state.panel=E('section',document.body);state.panel.id='tuac-panel'}state.panel.hidden=false;render()}
function deactivate(){stopPick();if(state.panel)state.panel.hidden=true;state.context=null}
// Legacy startup hooks were removed; calling them prevented TU registration.
const definition={id:ID,version:'0.4.5',activate,deactivate};const register=()=>(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register?.(definition);window.addEventListener('torn-utilities-ready',register);register();
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="alerts-calculations";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();
