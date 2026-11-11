import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createDirectQuickItems} from '../src/features/direct-items/direct-quick-items.js';
import {createSnatchDirectItems} from '../src/features/direct-items/snatch-direct-items.js';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8'),marker='const createTravelEnhancements=',start=code.indexOf(marker)+marker.length,end=code.indexOf('\n};',start)+2;
const createEngine=vm.runInNewContext('('+code.slice(start,end)+')');
const w=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window,d=w.document;d.hasFocus=()=>true;d.cookie='rfc_v=fixture; path=/';
const slots=[{ID:11,item:{ID:732,name:'Blood Bag : A+'}},{ID:12,item:{ID:732,name:'Blood Bag : A+'}},{ID:13,item:{ID:736,name:'Blood Bag : AB+'}},{ID:14,item:null}],posts=[],native=[];
const pilot=createDirectQuickItems({window:w,document:d,isAuthorized:()=>true,fetchImpl:async(url,options)=>{if(options.method==='POST'){assert.equal(new URL(url).searchParams.get('step'),'trashItem');const id=JSON.parse(options.body).slotID;posts.push(id);slots.find(s=>s.ID===id).item=null;return {ok:true,text:async()=>JSON.stringify({success:true,message:'Item trashed.'})};}return {ok:true,text:async()=>JSON.stringify({maxBaseSlots:4,maxSpecialSlots:0,slots})};}});
const adapter=createSnatchDirectItems({window:w,getPilot:()=>pilot,getProfile:()=>{throw Error('No profile needed for trash');},native:{enabled:()=>true,cancel(){},forget(){},inspect:()=>({}),prepareRun(run){if(!run.capacityLedger?.valid)run.capacityLedger={valid:true,total:4,initialOccupied:3,freed:0,purchased:0};},execute:async kind=>{native.push(kind);if(kind==='destroy')throw Error('Native trash forbidden');return {purchaseConfirmed:true,amount:3};}}});
const watch={key:'id:206',name:'Xanax',category:'Foreign',minQty:1},snapshot={ownerId:'42',country:'mex',status:'Abroad',hospitalized:false,quantity:2500,traveling:false,returning:false};
let clock=Date.now();
const engine=createEngine({window:w,document:d,now:()=>clock,getItems:()=>[watch],getContext:async()=>({...snapshot}),getSnapshot:()=>({...snapshot}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter});
try{
 engine.start();await engine.arm({watchKey:watch.key,destroyInventory:true,destroyAccepted:true,destroyItems:[{id:732,name:'Blood Bag : A+'}]});engine.stock(watch,snapshot);
 assert.equal(engine.getState().stage,'destroy');assert.equal(await engine.act({isTrusted:false}),false);assert.deepEqual(posts,[]);
 await engine.act({isTrusted:true});assert.equal(engine.getState().stage,'destroy');assert.equal(engine.getState().destroyDone,false);assert.match(d.getElementById('tu-snatch-run').textContent,/1 remaining/);assert.deepEqual(posts,[11]);assert.deepEqual(native,[]);
 snapshot.quantity=0;assert.equal(await engine.act({isTrusted:true}),false);assert.deepEqual(posts,[11]);snapshot.quantity=2500;clock+=180000;assert.equal(await engine.act({isTrusted:true}),false);assert.deepEqual(posts,[11]);engine.stock(watch,snapshot);
 await engine.act({isTrusted:true});assert.equal(engine.getState().stage,'buy');assert.equal(engine.getState().destroyDone,true);assert.deepEqual(posts,[11,12]);assert.deepEqual(native,[]);assert.equal(slots[2].item.ID,736);assert.equal(engine.getState().capacityLedger.freed,2);
 assert.deepEqual(native,[]);assert.deepEqual(posts,[11,12]); // Purchase transport is exercised by direct-purchase.mjs.
 console.log('Generated destruction workflow passed: accepted selection, one handler trash per trusted click, remaining-item continuation, no early buy, capacity credit and unselected-item preservation');
}finally{engine.stop();pilot.stop();w.close();}
