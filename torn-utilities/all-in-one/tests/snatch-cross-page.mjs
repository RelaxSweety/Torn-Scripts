import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
let clock=1800000000000,nav=0,actions=0,reads=0,saved;
const make=(restoreRun,snapshot,liveETA)=>{
 const dom=new JSDOM('<body></body>',{url:'https://www.torn.com/forums.php',pretendToBeVisual:true}),w=dom.window,d=w.document;
 d.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=()=>[{}];let page=false;
 const tool=createTravelEnhancements({document:d,window:w,now:()=>clock,isTravelPage:()=>page,navigateTravel:()=>{nav++;},getItems:()=>[{key:'id:1',category:'Foreign',name:'Fixture',minQty:1}],getSnapshot:()=>snapshot,getContext:async()=>{reads++;return snapshot;},getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,getDestinationETA:()=>liveETA.value,storeRun:v=>{saved=structuredClone(v);},restoreRun,executeAction:{enabled:()=>true,cancel(){},forget(){},execute:async()=>{actions++;return {};}}});
 tool.start();return {tool,d,w,setPage:v=>{page=v;}};
};
const run={ownerId:'42',country:'jap',watchKey:'id:1',watchName:'Fixture',stage:'hospitalize',hospitalization:{id:1,name:'Fixture item'},expiresAt:clock+600000,stockAt:0};
let snapshot={ownerId:42,country:'jap',status:'Traveling',traveling:true,returning:false,hospitalized:null,quantity:NaN},eta={value:{outbound:true,arrival:clock+120000,remainingSeconds:120}};
const a=make(run,snapshot,eta);
try{
 assert.match(a.d.querySelector('#tu-snatch-run').textContent,/Traveling to Japan\nETA: 02:00\nHospitalize Me/);
 assert.equal(saved.destinationArrival,clock+120000);clock+=10000;a.tool.syncCountdown();assert.match(a.d.querySelector('#tu-snatch-run').textContent,/01:50/);
 assert.equal(a.tool.act({isTrusted:false}),false);assert.equal(nav,0);
 assert.equal(a.tool.act({isTrusted:true}),true);assert.equal(nav,1);assert.equal(actions,0,'Off-page clicks only navigate');
 const restored=structuredClone(saved);a.w.close();eta.value=null;
 const b=make(restored,snapshot,eta);
 try{
   assert.match(b.d.querySelector('#tu-snatch-run').textContent,/Traveling to Japan\nETA: 01:50/);
   clock+=110000;b.tool.syncCountdown();await Promise.resolve();await Promise.resolve();assert.equal(b.d.querySelector('#tu-landed-unprotected'),null,'ETA alone is not arrival evidence');
   snapshot.status='Abroad';snapshot.traveling=false;snapshot.hospitalized=false;b.tool.check();
   let warning=b.d.querySelector('#tu-landed-unprotected');assert.ok(warning);assert.equal(warning.querySelector('strong').textContent,'You have Landed Unprotected');
   [...warning.querySelectorAll('button')].find(x=>x.textContent==='Show Me').click();assert.equal(nav,2);assert.equal(actions,0);
   snapshot.hospitalized=true;snapshot.status='Hospital';b.tool.check();assert.equal(b.d.querySelector('#tu-landed-unprotected'),null);
   snapshot.hospitalized=false;snapshot.status='Abroad';b.tool.check();warning=b.d.querySelector('#tu-landed-unprotected');assert.ok(warning);
   [...warning.querySelectorAll('button')].find(x=>x.textContent==='Ignore').click();assert.equal(b.d.querySelector('#tu-landed-unprotected'),null);assert.equal(saved.landedWarningDismissed,true);b.tool.check();assert.equal(b.d.querySelector('#tu-landed-unprotected'),null);
   const dismissed=structuredClone(saved);const c=make(dismissed,snapshot,eta);try{assert.equal(c.d.querySelector('#tu-landed-unprotected'),null);}finally{c.w.close();}
 }finally{b.w.close();}
 for(const stage of ['heal','buy']){const c=make({...run,stage},snapshot,eta);try{const before=nav;c.tool.act({isTrusted:true});assert.equal(nav,before+1);assert.equal(actions,0);}finally{c.w.close();}}
 snapshot={...snapshot,ownerId:99};const changed=make(run,snapshot,eta);try{assert.equal(changed.tool.act({isTrusted:true}),false);assert.equal(changed.d.querySelector('#tu-landed-unprotected'),null);}finally{changed.w.close();}
 console.log('Cross-page Snatch passed: destination/ETA, persistent deadline, Hospitalize/Heal/Buy navigation without actions, verified arrival, Ignore/Show Me, hospital and identity suppression.');
}finally{a.w.close();}
