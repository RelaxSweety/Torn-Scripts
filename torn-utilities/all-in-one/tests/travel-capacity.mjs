import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createNativeTravelActions} from '../src/features/native-travel-actions.js';
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/desktop-travel.json',import.meta.url)));
async function check({occupied=1,heal=true,cash=1000000,stock=611,expected=18,keepGhost=true,proofOnly=false,mobileCash=false,replaceQuantity=false,nativeMax=17,afterFirstStock=null,afterFirstCash=null,failTopup=false,dropTopupProof=false,firstDesired=expected,expectedActual=expected}={}){
 const dom=new JSDOM(`<body><span id="user-money">$${cash.toLocaleString('en-US')}</span><div id="travel-root"><h4>Canada</h4><ul class="inventoryPanel_fixture" aria-label="Inventory 18 items"></ul><ul class="shop">${f.shopItem}</ul></div></body>`,{url:'https://www.torn.com/',pretendToBeVisual:true});
 const w=dom.window,d=w.document;if(mobileCash){d.getElementById('user-money').remove();const banner=d.createElement('div');banner.className='messageContent_fixture';banner.textContent='You are in Canada and have $'+cash.toLocaleString('en-US')+'. You have purchased 1 / 18 items so far.';d.body.prepend(banner);}d.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=function(){return this.disabled?[]:[{}]};const root=d.querySelector('#travel-root'),items=root.querySelector('ul'),shop=root.querySelector('.shop');
 let currentQuantity=stock,purchased=0,stateValue=0,healed=false,closed=0;const events=[],transactions=[];if(dropTopupProof){const nativeTimeout=w.setTimeout.bind(w);w.setTimeout=(fn,ms)=>nativeTimeout(fn,ms>=4000?60:ms);}
 const holder=d.createElement('div');holder.innerHTML=f.closedSlot;const medical=holder.firstElementChild;
 for(let n=0;n<18;n++){const li=n===0&&occupied>0?medical:d.createElement('li');li.classList.add('inventorySlot_fixture');if(n>0&&n<occupied)li.innerHTML='<button aria-label="Other item slot '+n+'"></button>';items.append(li);}
 if(occupied>0)medical.querySelector('button').onclick=()=>{
  const open=d.createElement('div');open.innerHTML=f.openSlot;medical.innerHTML=open.firstElementChild.innerHTML;
  [...medical.querySelectorAll('button')].find(e=>e.textContent.trim()==='Use').onclick=()=>{
   medical.querySelector('[class*=controls]').innerHTML=f.healConfirmation;medical.querySelector('form').onsubmit=e=>e.preventDefault();
   [...medical.querySelectorAll('button')].find(e=>e.textContent==='Yes').onclick=e=>{e.preventDefault();healed=true;medical.querySelector('[class*=controls]').innerHTML='<b>You are out of the hospital!</b><button aria-label="Close" type="button">Close</button>';medical.querySelector('[aria-label="Close"]').onclick=()=>{closed++;if(!keepGhost)medical.replaceChildren();};};
  };
 };
 const row=shop.querySelector('[class*=row]'),input=row.querySelector('.input-money'),buy=[...row.querySelectorAll('button')].find(e=>e.textContent==='Buy');
 let replacementDone=false;input.addEventListener('input',()=>{stateValue=Number(input.value);if(replaceQuantity&&!replacementDone){replacementDone=true;const next=input.cloneNode();next.value='17';next.addEventListener('input',()=>{stateValue=Number(next.value);});input.replaceWith(next);input.value='17';}});input.addEventListener('change',()=>{stateValue=Number(input.value);});
 row.querySelector('.wai-btn').onclick=()=>{input.value=String(nativeMax);stateValue=nativeMax;};
 buy.onclick=e=>{e.preventDefault();const panel=d.createElement('div');panel.id='item-261-buyPanel';panel.innerHTML='<div class="confirmPanel_fixture"><p>Buy <strong>'+stateValue+'x Wolverine Plushie</strong> for <strong>$'+(stateValue*20)+'</strong>?</p><button>Yes</button><button>No</button></div>';if(failTopup&&transactions.length)panel.querySelector('strong').textContent='Wrong item';root.append(panel);panel.querySelector('button').onclick=()=>{
  purchased+=stateValue;transactions.push(stateValue);if(dropTopupProof&&transactions.length===2){panel.remove();return;}if(heal&&purchased===stateValue)medical.replaceChildren();let remaining=stateValue;
  for(const li of items.children){if(remaining>0&&!li.querySelector('button')){const button=d.createElement('button');button.setAttribute('aria-label','Wolverine Plushie slot '+remaining);li.append(button);remaining--;}}
  currentQuantity-=stateValue;if(transactions.length===1&&afterFirstStock!==null)currentQuantity=afterFirstStock;if(transactions.length===1&&afterFirstCash!==null)d.getElementById('user-money').textContent='$'+afterFirstCash;panel.remove();if(proofOnly)for(const b of items.querySelectorAll('button'))b.remove();
 };};
 const adapter=createNativeTravelActions({document:d,window:w,enabled:()=>true});const run={ownerId:'42',watchKey:'id:261',watchName:'Wolverine Plushie',expiresAt:Date.now()+90000,medical:{id:1,name:'Blood Bag : A+'},minimumQty:1};
 const getSnapshot=()=>({hospitalized:heal&&!healed,quantity:currentQuantity,purchaseProof:proofOnly&&purchased?'confirmed:'+purchased:null,purchaseItemKey:'id:261'});
 try{
  if(heal)assert.equal((await adapter.execute('heal',{run,getSnapshot,guard:()=>true})).hospitalReleased,true);
  const result=await adapter.execute('buy',{run,getSnapshot,guard:()=>true,onEvent:e=>events.push(e)});
  assert.equal(result.amount,expected);assert.equal(purchased,expectedActual);const capacity=events.find(e=>e.step==='capacity-check');assert.equal(capacity.verified,true);assert.equal(capacity.desired,firstDesired);assert.equal(capacity.freeSlots,18-occupied+(heal?1:0));if(heal)assert.ok(closed>=1);assert.ok(transactions.length<=2);assert.ok(transactions.reduce((a,b)=>a+b,0)<=firstDesired);if(expected===18&&nativeMax===17)assert.deepEqual(transactions,[17,1],'Purchase native shown 17 first, then only the remaining 1');if(afterFirstStock!==null||afterFirstCash!==null||failTopup||dropTopupProof){assert.equal(transactions[0],17);assert.ok(result.reconcileWarning||transactions.length===1);}if(dropTopupProof)assert.deepEqual(transactions,[17,1],'Unconfirmed reconciliation never repeats either purchase');
 }finally{adapter.cancel();w.close()}
}
await check({afterFirstStock:0,expected:17,firstDesired:18});
await check({afterFirstCash:0,expected:17,firstDesired:18});
await check({failTopup:true,expected:17,firstDesired:18});
await check({dropTopupProof:true,expected:17,expectedActual:18,firstDesired:18});
await check({replaceQuantity:true});
await check({proofOnly:true,nativeMax:18});
await check({mobileCash:true});
await check(); // Native Max 17 is purchased first; reconcile the freed slot with 1 more.
await check({keepGhost:false}); // The inventory already cleared the consumed slot.
await check({occupied:2,expected:17}); // A remaining item still occupies one slot.
await check({cash:340,expected:17}); // Insufficient money for the eighteenth item.
await check({stock:10,expected:10}); // Stock is the limiting factor.
await check({occupied:0,heal:false,expected:18}); // Direct purchase also verifies live space.
console.log('Travel capacity passed: freed medical slot, native-first 17 plus verified 1, stock/funds changes, unknown second result without retry, fresh/ghost inventory, remaining items, cash limits, stock limits and no-hospital purchase');
