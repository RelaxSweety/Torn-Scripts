import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTravelRequestCapture} from '../src/experimental/travel-request-capture.js';
import {createDirectQuickItems} from '../src/experimental/direct-quick-items.js';
const w=new JSDOM('<div id="travel-root"><li class="inventorySlot_fixture"><button aria-label="Blood Bag : A+">Item</button></li></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;
w.document.hasFocus=()=>true;w.document.cookie='rfc_v=PRIVATE_TOKEN; path=/';
const capture=createTravelRequestCapture({window:w,document:w.document});
const data={slots:[{slotID:123,itemID:732,name:'Blood Bag : A+',token:'PRIVATE_SECRET'},{slotID:124,itemID:736,name:'Blood Bag : AB+'}],maxBaseSlots:18,rfc:'PRIVATE_SECRET'};
try{
 const info=capture.inventoryInfo(data);assert.equal(info.mappings.length,2);assert.notEqual(info.mappings[0].name,info.mappings[1].name);assert.equal(info.capacities.maxBaseSlots,18);assert.equal(info.directTravelUseEnabled,false);assert.ok(!JSON.stringify(info).includes('PRIVATE_SECRET'));
 assert.equal(capture.inventoryInfo({slots:[{id:123,itemID:732}]}).mappingState,'unresolved','Generic id cannot authorize slot mapping');
 assert.equal(capture.inventoryInfo({slots:[{slotID:123,itemID:1},{slotID:123,itemID:2}]}).mappingState,'unresolved','Duplicate slots fail closed');
 const partial=capture.useInfo({success:true,itemRemoved:true,useAnother:false,message:'You are still in hospital.'});assert.equal(partial.flags.useAnother.value,false);assert.equal(partial.hospitalRelease,'still-hospitalized');assert.equal(partial.consumption,'server-reported-removal-needs-inventory-check');
 assert.equal(capture.useInfo({success:true,itemRemoved:true,message:'Hospital cooldown reduced.'}).hospitalRelease,'unconfirmed');assert.equal(capture.useInfo({success:false,itemRemoved:true}).consumption,'unconfirmed');assert.equal(capture.useInfo({success:true,message:'You are out of the hospital!'}).hospitalRelease,'explicit-release-message-needs-status-check');assert.equal(capture.useInfo({success:true,itemRemoved:'true'}).consumption,'unconfirmed');
 let calls=[];const api=createDirectQuickItems({window:w,document:w.document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,text:async()=>JSON.stringify(data)};}});
 await api.inspectTravel({isTrusted:false});assert.equal(calls.length,0);assert.equal((await api.inspectTravel({isTrusted:true})).mappings.length,2);assert.equal(calls.length,1);assert.equal(calls[0].options.method,'GET');assert.equal(new URL(calls[0].url).searchParams.get('step'),'inventory');assert.equal(calls[0].options.body,undefined);assert.ok(!JSON.stringify(api.report()).includes('PRIVATE_TOKEN'));api.stop();
 let response=data;w.fetch=async()=>({status:200,clone:()=>({text:async()=>JSON.stringify(response)})});capture.start();await w.fetch('/page.php?sid=travelData&step=inventory');await new Promise(r=>setTimeout(r,0));assert.equal(capture.report().records.at(-1).response.inventory.mappings.length,2);
 response={success:true,itemRemoved:true,useAnother:false,message:'You remain in hospital.'};await w.fetch('/page.php?sid=travelData&step=useItem',{method:'POST',body:JSON.stringify({slotID:123})});await new Promise(r=>setTimeout(r,0));assert.equal(capture.report().records.at(-1).response.itemUse.hospitalRelease,'still-hospitalized');
}finally{capture.stop();w.close();}
console.log('Travel inventory inspection passed: GET only, bounded identity discovery, ambiguous mappings disabled, secret exclusion, typed consumption flags and separate release evidence');
