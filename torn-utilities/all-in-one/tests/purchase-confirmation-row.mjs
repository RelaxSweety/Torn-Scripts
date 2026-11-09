import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createNativeTravelActions} from '../src/features/native-travel-actions.js';
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/desktop-travel.json',import.meta.url)));
for(const scenario of ['replaced','stock-zero','cash-dropped','price-increased']){
 const w=new JSDOM('<body><span id="user-money">$1,000</span><div id="travel-root"><ul class="inventoryPanel_fixture" aria-label="Inventory 18 items"></ul><ul class="shop">'+f.shopItem+'</ul></div></body>',{url:'https://www.torn.com',pretendToBeVisual:true}).window,d=w.document;d.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&!this.disabled?[{}]:[];};
 const root=d.getElementById('travel-root'),inventory=root.querySelector('ul'),shop=root.querySelector('.shop');for(let n=0;n<18;n++){const li=d.createElement('li');li.className='inventorySlot_fixture';inventory.append(li);}
 let visible=true,stock=1000,yes=0,no=0;const events=[],row=shop.querySelector('[class*=row]'),input=row.querySelector('.input-money'),buy=[...row.querySelectorAll('button')].find(e=>e.textContent==='Buy');
 buy.onclick=()=>{const amount=Number(input.value);const panel=d.createElement('div');panel.id='item-261-buyPanel';panel.innerHTML='<div class="confirmPanel_fixture"><p>Buy <strong>'+amount+'x Wolverine Plushie</strong> for <strong>$'+(scenario==='price-increased'?2000:amount*20)+'</strong>?</p><button>Yes</button><button>No</button></div>';root.append(panel);visible=scenario==='stock-zero';stock=0;if(!visible)row.replaceChildren();if(scenario==='cash-dropped')d.getElementById('user-money').textContent='$0';panel.querySelector('button').onclick=()=>{yes++;panel.remove();const result=d.createElement('div');result.className='success';result.textContent='You have purchased '+amount+'x Wolverine Plushie';root.append(result);};panel.querySelectorAll('button')[1].onclick=()=>{no++;panel.remove();};};
 const adapter=createNativeTravelActions({document:d,window:w,enabled:()=>true}),run={ownerId:'42',intentId:'test',watchKey:'id:261',watchName:'Wolverine Plushie',expiresAt:9999999999999};
 try{const task=adapter.execute('buy',{run,getSnapshot:()=>({hospitalized:false,stockVisible:visible,quantity:stock}),guard:()=>true,onEvent:e=>events.push(e)});
 if(scenario==='replaced'){const result=await task;assert.equal(result.amount,18);assert.equal(yes,1);assert.equal(no,0);assert.ok(events.some(e=>e.reason==='confirmation row absent'&&e.quantity===1000));}
 else{await assert.rejects(task,/purchase canceled/);assert.equal(yes,0);assert.equal(no,1,'Validation failure dismisses only the matching question');assert.equal(d.querySelector('[class*=confirmPanel]'),null);}
 }finally{adapter.cancel();adapter.forget();w.close();}
}
console.log('Purchase confirmation row passed: missing row is unknown stock, exact question and price survive replacement, real zero stock/cash drop/price increase cancel via No without submitting');
