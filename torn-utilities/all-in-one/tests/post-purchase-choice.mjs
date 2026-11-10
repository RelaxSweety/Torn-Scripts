import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createSnatchDirectItems} from '../src/features/direct-items/snatch-direct-items.js';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const getFactory=name=>{const marker='const '+name+'=',start=code.indexOf(marker)+marker.length,end=code.indexOf('\n};',start)+2;return vm.runInNewContext('('+code.slice(start,end)+')');};
const native={inventorySummary:()=>null};const capacityAdapter=createSnatchDirectItems({native,getPilot:()=>({}),getProfile:async()=>({}),window:{}});
for(const [initial,freed,bought,free] of [[2,2,18,0],[2,2,15,3],[2,2,10,8],[5,3,12,4]])assert.equal(capacityAdapter.remainingCapacity({capacityLedger:{valid:true,total:18,initialOccupied:initial,freed,purchased:bought}}).free,free);
assert.equal(capacityAdapter.remainingCapacity({capacityLedger:{valid:false}}),null);
for(const choice of ['manual','depart','full','unknown','restore','cancel']){
 const w=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window,d=w.document;d.hasFocus=()=>true;const watch={key:'id:258',category:'Foreign',name:'Jaguar Plushie',minQty:1},snapshot={ownerId:'42',country:'mex',status:'Abroad',hospitalized:false,traveling:false,quantity:100};let calls=[],pending=false;
 const adapter={enabled:()=>true,cancel(){pending=false;},forget(){},prepareRun(){},listInventory:()=>[],hasPendingStep:()=>pending,isStepping:()=>pending,remainingCapacity:()=>choice==='full'?{total:18,occupied:18,free:0}:choice==='unknown'?null:{total:18,occupied:15,free:3},async execute(kind,{event}){assert.equal(event.isTrusted,true);calls.push(kind);if(kind==='buy')return {purchaseConfirmed:true,amount:15};pending=true;return {actionPending:true,nextLabel:'Book return flight'};}};
 const restored=choice==='restore'?{ownerId:'42',country:'mex',watchKey:watch.key,watchName:watch.name,stage:'departure-choice',expiresAt:Number.MAX_SAFE_INTEGER,purchaseConfirmed:true,departureCapacity:{total:18,free:3}}:null;
 const engine=getFactory('createTravelEnhancements')({window:w,document:d,getItems:()=>[watch],getContext:async()=>({...snapshot}),getSnapshot:()=>({...snapshot}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,onNotice:()=>{},executeAction:adapter,restoreRun:restored});
 try{
  engine.start();if(!restored){await engine.arm({watchKey:watch.key});engine.stock(watch,snapshot);await engine.act({isTrusted:true});}
  const dialog=d.getElementById('tu-snatch-departure-choice');
  if(choice==='full'){assert.equal(dialog,null);assert.equal(engine.getState().stage,'return');continue;}
  assert.ok(dialog,'Choice opens automatically without an acknowledgement click');assert.equal(engine.getState().stage,'departure-choice');assert.equal(calls.filter(x=>x==='return').length,0,'No departure before a choice');
  if(choice==='unknown')assert.match(dialog.textContent,/could not be verified/);else assert.match(dialog.textContent,/3 of 18/);
  if(choice==='cancel'){engine.disarm();assert.equal(d.getElementById('tu-snatch-departure-choice'),null);continue;}
  const button=[...dialog.querySelectorAll('button')].find(b=>b.textContent===(choice==='depart'?'Depart now':'Purchase more items'));
  await button.onclick({isTrusted:false});assert.ok(d.getElementById('tu-snatch-departure-choice'),'Synthetic selection is rejected');await button.onclick({isTrusted:true});assert.equal(d.getElementById('tu-snatch-departure-choice'),null);
  if(choice==='depart'){assert.equal(engine.getState().stage,'return');assert.equal(calls.at(-1),'return');assert.ok(d.getElementById('tu-snatch-run').textContent.startsWith('Book return flight'),'Travel pauses at the next native step');}
  else {assert.equal(engine.getState(),null);assert.equal(d.getElementById('tu-snatch-run').hidden,true);assert.equal(calls.filter(x=>x==='return').length,0,'Manual choice never initiates travel');}
 }finally{engine.stop();w.close();}
}
console.log('Post-purchase choice passed: confirmed free-space accounting, automatic prompt, manual close, first departure step, full inventory, unknown capacity, restored choice and cancellation');
