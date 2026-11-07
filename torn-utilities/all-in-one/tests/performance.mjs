import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const measureOnly=process.argv.includes('--measure-only'),withMonitor=process.argv.includes('--with-monitor');
const input=process.argv.find(a=>a.endsWith('.user.js'));
const code=fs.readFileSync(input||new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const dom=new JSDOM('<body><main id="torn-fixture"><div id="torn-row">Torn fixture</div></main></body>',{url:'https://www.torn.com',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,observers=[],errors=[];
const NativeObserver=w.MutationObserver;w.MutationObserver=class extends NativeObserver{constructor(fn){super(fn);observers.push(this)}};
w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});w.console.error=(...args)=>errors.push(args.join(' '));
w.document.hasFocus=()=>true;w.alert=()=>{};w.confirm=()=>true;w.fetch=async()=>({ok:true,status:200,json:async()=>({}),text:async()=> '{}'});
w.localStorage.setItem('tu:identity:public-only-key:v1','abcdef0123456789');w.localStorage.setItem('tu:agreement:accepted','fixture-v1');w.sessionStorage.setItem('tu:dev:auth:session:v1','fixture-session');
if(withMonitor)w.localStorage.setItem('tu-item-monitor-v1',JSON.stringify([{category:'Other',name:'Fixture monitored item',key:'name:fixture monitored item',minQty:10,maxPrice:null}]));
w.GM_xmlhttpRequest=o=>queueMicrotask(()=>o.onload?.({status:200,responseText:JSON.stringify(o.url.endsWith('/api/auth/agreement/current')?{agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-05'},content:'Complete fixture agreement.'}:o.url.endsWith('/api/auth/agreement')?{accepted:true,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-05'}}:o.url.includes('/key/info')?{info:{access:{type:'Public Only'},user:{id:42}}}:{})}));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let rootLookups=0,layoutReads=0,itemScans=0,styleWrites=0;
const getById=w.document.getElementById.bind(w.document);w.document.getElementById=id=>{if(['tuim-panel','tuim-catalog','tu-pda-panel','tca-panel','tpfg-root'].includes(id))rootLookups++;return getById(id)};
const computed=w.getComputedStyle.bind(w);w.getComputedStyle=(...args)=>{layoutReads++;return computed(...args)};
const query=w.document.querySelectorAll.bind(w.document);w.document.querySelectorAll=s=>{if(s.includes('[class*=itemWrap]'))itemScans++;return query(s)};
try{
 w.eval(code);await delay(70);
 w.document.querySelector('[data-tab="modules"]').click();
 const open=name=>{const card=[...w.document.querySelectorAll('.tu-card')].find(c=>c.querySelector('strong')?.textContent===name);assert.ok(card,name);card.querySelector('button').click()};
 open('Business Tools');open('Travel Assistant and Item Monitor');await delay(550);
 const panel=getById('tuim-panel');assert.ok(panel);assert.equal(panel.hidden,false);
 if(!measureOnly){
  const probe=w.document.createElement('section');probe.id='tu-diagnostics-window';probe.innerHTML='<header><strong>Fixture</strong><button>×</button></header>';w.document.body.append(probe);await delay(60);
  const bar=probe.querySelector('header');assert.equal(bar.querySelectorAll('[data-tu-nav-controls]').length,1);
  bar.replaceChildren(w.document.createElement('strong'));await delay(60);assert.equal(bar.querySelectorAll('[data-tu-nav-controls]').length,1,'Rebuilt headers retain window controls');probe.remove();await delay(60);
 }
 const header=panel.querySelector('.tuim-header');const styleObserver=new NativeObserver(records=>{styleWrites+=records.filter(r=>r.type==='attributes'&&r.attributeName==='style').length});styleObserver.observe(header,{attributes:true,subtree:true,attributeFilter:['style']});observers.push(styleObserver);
 rootLookups=layoutReads=itemScans=styleWrites=0;
 const row=getById('torn-row');
 for(let i=0;i<20;i++){row.className='torn-state-'+i;row.style.opacity=i%2?'0.9':'1';row.textContent='Updated Torn data '+i;await delay(20);}
 await delay(100);
 const churn={rootLookups,layoutReads,itemScans,headerStyleWrites:styleWrites};
 rootLookups=layoutReads=itemScans=styleWrites=0;await delay(500);
 const idle={rootLookups,layoutReads,itemScans,headerStyleWrites:styleWrites};
 console.log(JSON.stringify({fixture:'20 unrelated Torn DOM updates with Travel open; monitors='+Number(withMonitor),churn,idle},null,2));
 if(!measureOnly){assert.equal(churn.rootLookups,0,'Unrelated Torn updates must not trigger Manager window rescans');assert.equal(churn.layoutReads,0,'Unrelated Torn updates must not force Manager style reads');assert.equal(churn.headerStyleWrites,0,'Unchanged headers must not be rewritten');if(withMonitor)assert.ok(churn.itemScans>=1,'Configured monitors must still react to Torn data changes');else assert.equal(churn.itemScans,0,'No item listing scans without monitors');assert.equal(idle.rootLookups,0);if(!withMonitor)assert.equal(idle.itemScans,0);
  rootLookups=layoutReads=itemScans=0;Object.defineProperty(w.document,'hidden',{configurable:true,value:true});panel.hidden=true;await delay(500);assert.equal(layoutReads,0,'No Manager layout reads while hidden');assert.equal(itemScans,0,'No item scans while hidden');
  Object.defineProperty(w.document,'hidden',{configurable:true,value:false});w.document.dispatchEvent(new w.Event('visibilitychange'));await delay(60);assert.equal(getById('tu-pda-launcher').hidden,false);panel.hidden=false;await delay(60);assert.equal(getById('tu-pda-launcher').hidden,true,'Relevant window visibility changes must still update the launcher');}
 assert.deepEqual(errors,[]);
}finally{for(const o of observers)o.disconnect();dom.window.close();}
