import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDirectQuickItems} from '../src/features/direct-items/direct-quick-items.js';
async function fixture(mode){
 const w=new JSDOM('<div id="travel-root"><ul class="inventoryPanel_fixture"><li class="inventorySlot_fixture"><span class="srOnly_fixture">slot 1 empty</span></li></ul></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window;
 const d=w.document;d.hasFocus=()=>true;let calls=0,focusEvents=0;
 const timeout=w.setTimeout.bind(w),interval=w.setInterval.bind(w);w.setTimeout=(fn,ms,...args)=>timeout(fn,ms===5000?40:ms,...args);w.setInterval=(fn,ms,...args)=>interval(fn,ms===200?5:ms,...args);
 w.fetch=async(url,options={})=>{calls++;assert.equal(options.method||'GET','GET');return {status:200,clone:()=>({text:async()=>JSON.stringify({slots:[],maxBaseSlots:0,maxSpecialSlots:0})})};};
 w.addEventListener('focus',()=>{focusEvents++;if(mode==='none')return;w.fetch('/page.php?sid=travelData&step=inventory&rfcv=SECRET').then(()=>{if(mode==='redraw')d.querySelector('li').innerHTML='<button aria-label="Blood Bag slot 1"><img src="/images/items/732/medium.png?token=SECRET"></button>';});});
 const api=createDirectQuickItems({window:w,document:d,fetchImpl:()=>{throw Error('Diagnostic cannot make direct requests');},isAuthorized:()=>true,build:'0.5.42.100-dev'});
 try{
  assert.equal((await api.testNativeRefresh({isTrusted:true},()=>true)).result,'blocked','Inactive capture rejects');api.captureStart();
  assert.equal((await api.testNativeRefresh({isTrusted:false},()=>true)).result,'blocked');assert.equal((await api.testNativeRefresh({isTrusted:true},()=>false)).result,'blocked');assert.equal(focusEvents,0);
  const pending=api.testNativeRefresh({isTrusted:true},()=>true);assert.equal((await api.testNativeRefresh({isTrusted:true},()=>true)).result,'blocked');
  if(mode==='cancel')api.captureStop();
  const result=await pending;assert.equal(focusEvents,1);assert.equal(result.result,mode==='redraw'?'inventory-read-and-cells-changed':mode==='read'?'inventory-read-cells-unchanged':mode==='cancel'?'cancelled':'no-inventory-read-observed');
  assert.equal(calls,mode==='none'?0:1);assert.ok(!JSON.stringify(result).includes('SECRET'));if(mode==='redraw'){assert.deepEqual(result.after.cells[0].itemIDs,[732]);assert.ok(result.firstCellChangeMs>=0);assert.equal(result.inventoryRequests[0].httpStatus,200);}
  assert.equal(api.report().nativeInventoryRefresh.focusTests.length,1);api.clearLogs();assert.equal(api.report().nativeInventoryRefresh.focusTests.length,0);
 }finally{api.stop();w.close();}
}
for(const mode of ['redraw','read','none','cancel'])await fixture(mode);
console.log('Native focus refresh: one event; passive inventory-read/cell-change evidence; absent/unchanged/cancelled outcomes; synthetic/inactive/duplicate guards; no direct fetch or mutation; private URLs excluded.');
