import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDirectQuickItems} from '../src/experimental/direct-quick-items.js';
import {createSnatchDirectItems} from '../src/experimental/snatch-direct-items.js';
const w=new JSDOM('<div id="travel-root"></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;
w.document.hasFocus=()=>true;w.document.cookie='rfc_v=PRIVATE; path=/';w.confirm=()=>{throw Error('Workflow must retain its existing flight confirmation');};
let item=732,calls=[],status='Hospital',profileError=false,guard=true,fallback=[],events=[],clock=100000;
const inventory=()=>({maxBaseSlots:2,maxSpecialSlots:0,slots:[{ID:123,item:item?{ID:item,name:item===732?'Blood Bag : A+':'Blood Bag : AB+'}:null},{ID:124,item:null}]});
const pilot=createDirectQuickItems({window:w,document:w.document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{const step=new URL(url).searchParams.get('step');calls.push(step);if(step==='useItem'){item=null;return {ok:true,text:async()=>JSON.stringify({success:true,itemRemoved:true,useAnother:false,message:'used'})};}return {ok:true,text:async()=>JSON.stringify(inventory())};}});
const native={enabled:()=>true,execute:async(kind)=>{fallback.push(kind);return {purchaseConfirmed:true};},prepareRun:()=>{},inspect:()=>({released:false}),listInventory:()=>[],cancel(){},forget(){}};
const adapter=createSnatchDirectItems({native,getPilot:()=>pilot,getProfile:async()=>{if(profileError)throw Error('Profile unavailable');return {profile:{status:{state:status,until:250}}};},window:w,now:()=>clock});
const run={ownerId:'1',intentId:'run1',watchKey:'id:258',minimumQty:1,medicals:[{id:732,name:'Blood Bag : A+'}],hospitalizations:[{id:736,name:'Blood Bag : AB+'}],capacityLedger:{valid:true,initialOccupied:2,freed:0},extensionPriorUntil:200000};
let snapshot={hospitalized:true,quantity:18,traveling:false,returning:false};
const options=()=>({run,event:{isTrusted:true},guard:()=>guard,getSnapshot:()=>snapshot,onEvent:e=>events.push(e)});
try{
 await assert.rejects(adapter.execute('heal',{...options(),event:{isTrusted:false}}));assert.equal(calls.length,0);
 const partial=await adapter.execute('heal',options());assert.equal(partial.medicalUsed,true);assert.equal(partial.hospitalReleased,false);assert.equal(adapter.inspect(run).hospitalized,true);assert.equal(run.capacityLedger.freed,1);assert.deepEqual(calls,['inventory','useItem','inventory']);assert.equal(fallback.length,0);
 item=732;status='Abroad';const healed=await adapter.execute('heal',options());assert.equal(healed.hospitalReleased,true);assert.equal(adapter.inspect(run).released,true);assert.equal(run.capacityLedger.freed,2);assert.equal(events.at(-1).status,'Abroad');
 await adapter.execute('buy',options());assert.deepEqual(fallback,['buy'],'Purchase uses native adapter only on its own call');
 item=736;status='Hospital';snapshot={hospitalized:true,quantity:0,traveling:false,returning:false};const extended=await adapter.execute('hospitalize',{...options(),extendHospital:true});assert.equal(extended.hospitalized,true);assert.equal(adapter.inspect(run).hospitalUntil,250000);
 item=736;status='Hospital';snapshot={hospitalized:false,quantity:0,traveling:true,returning:false};const inFlight=await adapter.execute('hospitalize',{...options(),allowBeforeLanding:true});assert.equal(inFlight.hospitalized,true);
 item=732;profileError=true;snapshot={hospitalized:true,quantity:18,traveling:false};await assert.rejects(adapter.execute('heal',options()),e=>e.submitted===true);assert.equal(adapter.inspect(run).directItemUncertain,true);await assert.rejects(adapter.execute('buy',options()));assert.deepEqual(fallback,['buy']);adapter.observeProfile({status:{state:'Hospital',until:250}});assert.equal(adapter.inspect(run).directItemUncertain,false,'Read-only profile reconciliation can resolve known consumption');assert.equal(adapter.inspect(run).directItemConsumed,true);
 adapter.forget();item=732;profileError=false;status='Hospital';guard=false;const count=calls.length;await assert.rejects(adapter.execute('heal',options()));assert.equal(calls.length,count,'Changed run cannot submit an item');guard=true;
 run.medicals=[{id:999,name:'Unsupported item'}];await assert.rejects(adapter.execute('heal',options()));assert.equal(calls.filter(c=>c==='useItem').length,5,'Unsupported selected items never fall back to native use');
}finally{adapter.cancel();pilot.stop();w.close();}
console.log('Snatch direct integration passed: original trusted gesture, multi-item selection, one request, partial heal, verified release, extension/flight, exact capacity credit, uncertain status blocking and native purchase delegation');
