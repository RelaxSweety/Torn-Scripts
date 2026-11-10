import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createSteppedNativeActions} from '../src/features/direct-items/stepped-native-actions.js';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const marker='const createNativeTravelActions=',start=code.indexOf(marker)+marker.length,end=code.indexOf('\n};',start)+2;
const factory=vm.runInNewContext('('+code.slice(start,end)+')');
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/pda-travel.json',import.meta.url)));
async function scenario({cash,clamp,expected,delayed=false,serverClamp=Infinity}){
 const w=new JSDOM('<body><span id="user-money">$'+cash+'</span><div id="travel-root"><div class="info-msg">You are in Mexico and have $100,000. You have purchased 0 / 18 items so far.</div><ul class="inventoryPanel_fixture" aria-label="Inventory 18 items"></ul><ul>'+f.shopItem+'</ul></div></body>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window,d=w.document;
 d.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&!this.disabled&&!this.closest('[class*=tabletHide]')?[{}]:[];};
 const root=d.getElementById('travel-root'),inventory=root.querySelector('ul'),row=root.querySelector('[class*=row]');for(let i=0;i<18;i++){const slot=d.createElement('li');slot.className='inventorySlot_fixture';inventory.append(slot);}
 const price=300;row.querySelector('[class*=tabletColD]').textContent='$300';let stock=1000,bought=0,pending=false,nativeClicks=0;const transactions=[],events=[];
 row.querySelector('[class*=buyIconButton]').onclick=()=>{nativeClicks++;const box=d.createElement('div');box.innerHTML=f.amountRow;const panel=box.querySelector('#item-260-buyPanel');root.append(panel);const input=panel.querySelector('.input-money'),buy=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Buy');input.addEventListener('input',()=>{input.value=String(Math.min(Number(input.value),clamp,18-bought,Math.floor(cash/price)));buy.disabled=false;});buy.onclick=()=>{nativeClicks++;const requested=Number(input.value),amount=Math.min(requested,serverClamp);assert.ok(amount>0&&amount*price<=cash);panel.innerHTML='<div class="confirmPanel_fixture"><p>Buy <strong>'+requested+'x Dahlia</strong>?</p><button>Yes</button></div>';panel.querySelector('button').onclick=()=>{nativeClicks++;transactions.push(amount);cash-=amount*price;bought+=amount;stock-=amount;root.querySelector('.info-msg').textContent='You are in Mexico and have $'+cash+'. You have purchased '+bought+' / 18 items so far.';for(let n=0;n<amount;n++){const slot=[...inventory.children].find(s=>!s.querySelector('button'));assert.ok(slot,'No capacity overflow');slot.innerHTML='<button aria-label="Dahlia slot '+n+'"></button>';}panel.remove();if(delayed){pending=true;setTimeout(()=>{pending=false;row.append(d.createElement('span'));},40);}};};};
 const base=factory({document:d,window:w,enabled:()=>true}),adapter=createSteppedNativeActions({native:base});
 // Two carried items have been confirmed used. The ledger is authoritative while Torn refreshes.
 const run={ownerId:'42',intentId:'test',watchKey:'id:260',watchName:'Dahlia',capacityLedger:{valid:true,total:18,initialOccupied:2,freed:2,purchased:0,spent:0,watchCount:0}};
 const snapshot=()=>({hospitalized:false,quantity:pending?NaN:stock,stockVisible:!pending});const options={run,getSnapshot:snapshot,guard:()=>true,event:{isTrusted:true},onEvent:e=>events.push(e)};
 try{let result,gestures=0;do{const before=nativeClicks;result=await adapter.execute('buy',options);assert.ok(nativeClicks-before<=1,'At most one native action per user gesture');gestures++;assert.ok(gestures<30);}while(result.actionPending);assert.deepEqual(transactions,expected);assert.equal(result.amount,expected.reduce((a,b)=>a+b,0));assert.ok(transactions.length<=6,'Initial plus at most five retries');assert.equal(run.capacityLedger.purchased,bought);if(delayed)assert.ok(events.some(e=>e.step==='remainder-state-wait'));return result;}finally{adapter.cancel();w.close();}
}
await scenario({cash:100000,clamp:3,expected:[3,3,3,3,3,3],delayed:true});
await scenario({cash:100000,clamp:18,serverClamp:3,expected:[3,3,3,3,3,3],delayed:true});
await scenario({cash:2000,clamp:2,expected:[2,2,2]});
const exhausted=await scenario({cash:100000,clamp:1,expected:[1,1,1,1,1,1]});assert.match(exhausted.reconcileWarning,/Five remainder attempts/);
console.log('Five-retry purchases passed: actual compiled stepped adapter, two freed medical slots, transient row, six bounded purchases, exact funds limits and one native action per gesture');
