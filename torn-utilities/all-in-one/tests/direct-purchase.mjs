import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createDirectQuickItems} from '../src/features/direct-items/direct-quick-items.js';
import {createSnatchDirectItems} from '../src/features/direct-items/snatch-direct-items.js';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
function factory(name){const marker='const '+name+'=',start=code.indexOf(marker)+marker.length;return vm.runInNewContext('('+code.slice(start,code.indexOf('\n};',start)+2)+')');}
const nativeFactory=factory('createNativeTravelActions'),engineFactory=factory('createTravelEnhancements');
const shop=JSON.parse(fs.readFileSync(new URL('./fixtures/pda-travel.json',import.meta.url))).shopItem;
function fixture({total=18,occupied=0,cash=100000,stock=1000,clamp=Infinity,mode='normal'}={}){
 const w=new JSDOM('<span id="user-money">$'+cash+'</span><div id="travel-root"><ul>'+shop+'</ul></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window,d=w.document;d.hasFocus=()=>true;d.cookie='rfc_v=PRIVATE_FIXTURE; path=/';w.HTMLElement.prototype.getClientRects=function(){return this.isConnected?[{}]:[];};
 const row=d.querySelector('[class*=row]');row.querySelector('[class*=tabletColD]').textContent='$300';
 const slots=Array.from({length:total},(_,i)=>({ID:String(100+i),item:i<occupied?{ID:'66',name:'Morphine'}:null}));let allowed=true,releaseRead,reads=0,clock=Date.now();
 const posts=[],nativeCalls=[],events=[],state={ownerId:'42',country:'mex',status:'Abroad',hospitalized:false,quantity:stock,stockVisible:true,traveling:false,returning:false};
 const pilot=createDirectQuickItems({window:w,document:d,isAuthorized:()=>true,fetchImpl:async(url,options)=>{
  const u=new URL(url),step=u.searchParams.get('step');assert.equal(options.credentials,'same-origin');
  if(step==='buy'){
   assert.equal(options.method,'GET');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.equal(options.body,undefined);assert.equal(u.searchParams.get('itemID'),'260');assert.deepEqual([...u.searchParams.keys()],['sid','step','itemID','amount','rfcv']);
   const requested=Number(u.searchParams.get('amount'));posts.push(requested);
   if(mode==='reject')return {ok:true,text:async()=>JSON.stringify({success:false})};
   const actual=Math.min(requested,clamp);if(mode!=='not-added'){let left=actual;for(const slot of slots)if(!slot.item&&left-->0)slot.item={ID:mode==='wrong-item'?'258':'260',name:mode==='wrong-item'?'Jaguar Plushie':'Dahlia'};}
   state.quantity-=actual;
   if(mode==='network')throw Error('Lost response');
   if(mode==='unrelated')slots[0].item={ID:'67',name:'First Aid Kit'};
   if(mode==='canceled-after')allowed=false;
   return {ok:true,text:async()=>JSON.stringify({success:true,amount:mode==='wrong-amount'?actual+1:actual,total:mode==='price-rise'?actual*301:actual*300,message:'You bought items',item:'Dahlia'})};
  }
  assert.equal(step,'inventory');reads++;
  if(mode==='wait'&&reads===1||mode==='wait-remainder'&&reads===3)await new Promise(r=>releaseRead=r);
  if(mode==='bad-after'&&posts.length)return {ok:true,text:async()=>'{"slots":[]}'};
  return {ok:true,text:async()=>JSON.stringify({maxBaseSlots:total,maxSpecialSlots:0,slots})};
 }});
 const base=nativeFactory({window:w,document:d,enabled:()=>true}),adapter=createSnatchDirectItems({window:w,native:{...base,execute:async kind=>{nativeCalls.push(kind);if(kind==='buy')throw Error('Native purchase forbidden');return {returnBooked:true};}},getPilot:()=>pilot,getProfile:()=>{throw Error('No profile request for purchase');}});
 const run={ownerId:'42',intentId:'fixture',country:'mex',watchKey:'id:260',watchName:'Dahlia',minimumQty:1,maximumPrice:300};
 const options=()=>({event:{isTrusted:true},run,getSnapshot:()=>({...state}),guard:()=>allowed,onEvent:e=>events.push(e)});
 return {w,d,row,slots,posts,nativeCalls,pilot,adapter,run,state,options,events,release:()=>releaseRead?.(),disallow:()=>allowed=false,now:()=>clock,advance:ms=>clock+=ms,close(){adapter.cancel();pilot.stop();w.close();}};
}
for(const config of [ {},{total:8,occupied:3},{total:60,occupied:2},{cash:2000,clamp:2},{clamp:3},{clamp:1},{stock:7,clamp:3}]){
 const f=fixture(config);try{
  let result;for(let i=0;i<6;i++){const before=f.posts.length;result=await f.adapter.execute('buy',f.options());assert.equal(f.posts.length,before+1,'One purchase per gesture');assert.deepEqual(f.nativeCalls,[]);if(!result.actionPending)break;await assert.rejects(f.adapter.execute('return',f.options()));}
  const expected=Math.min((config.total||18)-(config.occupied||0),Math.floor((config.cash??100000)/300),config.stock??1000,6*(config.clamp??Infinity));
  assert.equal(result.purchaseConfirmed,true);assert.equal(result.amount,expected);assert.equal(f.slots.filter(s=>s.item?.ID==='260').length,expected);assert.equal(f.slots.filter(s=>s.item?.ID==='66').length,config.occupied||0);assert.equal(f.pilot.hasPendingAttempt(),false);assert.ok(f.posts.length<=6);
  assert.equal(f.run.capacityLedger.purchased,expected);assert.equal(f.run.directBuySpent,expected*300);assert.ok(!JSON.stringify(f.pilot.report()).includes('PRIVATE_FIXTURE'));
  if(config.clamp===1){assert.deepEqual(f.posts,[18,17,16,15,14,13]);assert.match(result.reconcileWarning,/Five remainder attempts/);await assert.rejects(f.adapter.execute('buy',f.options()));}
  if(config.clamp===3&&!config.stock)assert.deepEqual(f.posts,[18,15,12,9,6,3]);
  await f.adapter.execute('return',f.options());assert.deepEqual(f.nativeCalls,['return']);
 }finally{f.close();}
}
for(const mode of ['network','reject','not-added','wrong-item','wrong-amount','price-rise','bad-after','unrelated','canceled-after']){
 const f=fixture({mode,occupied:1});try{
  await assert.rejects(f.adapter.execute('buy',f.options()),e=>e.submitted===true);assert.equal(f.posts.length,1);assert.equal(f.pilot.hasPendingAttempt(),true);assert.equal(f.run.directBuyUncertain,true);await assert.rejects(f.adapter.execute('buy',f.options()));await assert.rejects(f.adapter.execute('return',f.options()));assert.equal(f.posts.length,1);assert.equal(f.adapter.inspect(f.run).directItemUncertain,true);
  const p=createDirectQuickItems({window:f.w,document:f.d,isAuthorized:()=>true});assert.equal(p.hasPendingAttempt(),true);p.stop();
 }finally{f.close();}
}
for(const change of ['synthetic','hospital','travel','return','stock','funds','price','identity','owner','capacity']){
 const f=fixture();try{
  const o=f.options();if(change==='synthetic')o.event={isTrusted:false};if(change==='hospital')f.state.hospitalized=true;if(change==='travel')f.state.traveling=true;if(change==='return')f.state.returning=true;if(change==='stock')f.state.quantity=0;if(change==='funds')f.d.getElementById('user-money').textContent='$0';if(change==='price')f.row.querySelector('[class*=tabletColD]').textContent='$301';if(change==='identity')f.run.watchKey='id:258';if(change==='owner')f.disallow();if(change==='capacity')for(const s of f.slots)s.item={ID:'66',name:'Morphine'};
  await assert.rejects(f.adapter.execute('buy',o));assert.deepEqual(f.posts,[],change);
 }finally{f.close();}
}
for(const change of ['cancel','stock','price','owner','double']){
 const f=fixture({mode:'wait'});try{
  const pending=f.adapter.execute('buy',f.options());if(change==='cancel')f.adapter.cancel();if(change==='stock')f.state.quantity=0;if(change==='price')f.row.querySelector('[class*=tabletColD]').textContent='$301';if(change==='owner')f.disallow();if(change==='double')await assert.rejects(f.adapter.execute('buy',f.options()));f.release();if(change==='double'){await pending;assert.equal(f.posts.length,1);}else{await assert.rejects(pending);assert.equal(f.posts.length,0);}
 }finally{f.close();}
}
{
 const f=fixture({clamp:3});try{await f.adapter.execute('buy',f.options());f.slots[17].item={ID:'66',name:'Morphine'};const result=await f.adapter.execute('buy',f.options());assert.equal(result.purchaseConfirmed,true);assert.match(result.reconcileWarning,/Inventory changed/);assert.equal(f.posts.length,1);assert.equal(f.pilot.hasPendingAttempt(),false);}finally{f.close();}
}
{
 const f=fixture({clamp:3});try{await f.adapter.execute('buy',f.options());f.state.quantity=0;const result=await f.adapter.execute('buy',f.options());assert.equal(result.purchaseConfirmed,true);assert.equal(result.amount,3);assert.match(result.reconcileWarning,/Stock exhausted/);assert.equal(f.posts.length,1);assert.equal(f.adapter.hasPendingStep(),false);}finally{f.close();}
}
{
 const f=fixture({clamp:1});try{
  await f.adapter.execute('buy',f.options());await f.adapter.execute('buy',f.options());
  const restored=JSON.parse(JSON.stringify(f.run));restored.capacityLedger.valid=false;restored.capacityLedger.reason='page-refreshed';
  for(let i=0;i<4;i++)await f.adapter.execute('buy',{...f.options(),run:restored});
  assert.equal(restored.directBuyAttempts,6);assert.equal(restored.directBuyAmount,6);assert.equal(restored.directBuySpent,1800);assert.deepEqual(f.posts,[18,17,16,15,14,13]);await assert.rejects(f.adapter.execute('buy',{...f.options(),run:restored}));
 }finally{f.close();}
}
{
 const f=fixture({clamp:3});try{f.run.capacityLedger={valid:true,total:18,initialOccupied:2,freed:2,purchased:0,spent:0};await f.adapter.execute('buy',f.options());assert.equal(f.run.capacityLedger.freed,2);assert.equal(f.run.capacityLedger.purchased,3);assert.equal(f.adapter.remainingCapacity(f.run).free,15);}finally{f.close();}
}
{
 const f=fixture({clamp:3,mode:'wait-remainder'});try{await f.adapter.execute('buy',f.options());const pending=f.adapter.execute('buy',f.options());f.adapter.cancel();f.release();await assert.rejects(pending);assert.equal(f.posts.length,1);assert.ok(!f.run.directBuyComplete);}finally{f.close();}
}
{
 const f=fixture({clamp:3});const watch={key:'id:260',name:'Dahlia',category:'Foreign',minQty:1,maxPrice:300};
 const engine=engineFactory({window:f.w,document:f.d,now:f.now,getItems:()=>[watch],getContext:async()=>({...f.state}),getSnapshot:()=>({...f.state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:f.adapter});
 try{engine.start();await engine.arm({watchKey:watch.key});engine.stock(watch,f.state);assert.equal(await engine.act({isTrusted:false}),false);for(let i=0;i<6;i++){assert.equal(await engine.act({isTrusted:true}),true);assert.equal(f.posts.length,i+1);if(i===0){f.advance(31000);assert.equal(await engine.act({isTrusted:true}),false);engine.stock(watch,f.state);}}assert.equal(engine.getState().purchaseConfirmed,true);assert.equal(engine.getState().stage,'return');assert.equal(f.slots.filter(s=>s.item?.ID==='260').length,18);assert.deepEqual(f.nativeCalls,[]);console.log('Generated direct purchase workflow passed: six trusted transactions, stale-stock gate and verified separate return stage');}finally{engine.stop();f.close();}
}
console.log('Direct purchase passed: captured GET contract; variable capacity/funds/stock; initial plus five partial-fill remainders; exact item/amount/price inventory proof; gesture, cancellation, identity, uncertainty and reload guards; no native purchase or automatic retry');
