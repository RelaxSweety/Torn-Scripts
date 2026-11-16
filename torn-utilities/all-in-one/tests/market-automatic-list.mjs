import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createMarketPriceAutoFill} from '../src/features/market-price-auto-fill.js';
import {setMarketInput} from '../src/features/market-input.js';
import {readItemStockQuantity} from '../src/features/item-stock-quantity.js';
const dom=new JSDOM('<body><main id="item-market-root" style="overflow-y:auto"></main></body>',{url:'https://www.torn.com/page.php?sid=ItemMarket#/addListing',pretendToBeVisual:true}),w=dom.window,d=w.document,root=d.querySelector('main'),pause=ms=>new Promise(r=>setTimeout(r,ms));
w.HTMLElement.prototype.getClientRects=function(){return this.dataset.offscreen?[]:[{}];};
const rows=Array.from({length:6},(_,i)=>{const row=d.createElement('div');row.className='itemRowWrapper_test';row.dataset.itemId=String(500+i);row.dataset.offscreen='1';row.innerHTML=`<span class="itemName_test">Item ${i}</span><div class="info_test"><div class="amountInputWrapper_test"><div class="input-money-group"><input class="input-money" max="4"><input class="input-money" type="hidden" disabled></div></div><div class="priceInputWrapper_test"><div class="input-money-group"><input class="input-money"><input class="input-money" type="hidden" disabled></div></div></div>`;return row;});
const footer=d.createElement('footer');footer.innerHTML='<label><input type="checkbox">Fill</label><button type="submit">List</button>';let top=400,page=2,renderTimer,scrolls=0,submissions=0;root.addEventListener('submit',e=>{submissions++;e.preventDefault();});
const render=next=>{page=next;root.replaceChildren(...rows.slice(page*2,page*2+2),footer);};render(2);
Object.defineProperties(root,{clientHeight:{value:200},scrollHeight:{value:600},scrollTop:{get:()=>top,set:value=>{top=value;scrolls++;const next=Math.min(2,Math.floor(value/200));if(next!==page){w.clearTimeout(renderTimer);renderTimer=w.setTimeout(()=>render(next),30);}}}});
w.localStorage.setItem('tu:market-fill:price-delta','=1');w.localStorage.setItem('tu:market-fill:quantity-mode','max');
const tool=createMarketPriceAutoFill({window:w,manager:{isAuthorized:()=>true,requestMarketPriceData:async()=>{throw Error('No API for fixed prices');}},setMarketInput,readItemStockQuantity});
try{
 tool.setEnabled(true);await pause(100);root.querySelector('[data-tu-fill-list]').click();
 for(let i=0;i<200&&tool.diagnostics().listFill.active;i++)await pause(100);
 assert.equal(tool.diagnostics().listFill.active,false);assert.equal(tool.diagnostics().listFill.pending,0);assert.deepEqual(rows.map(r=>r.querySelector('[class*=amountInputWrapper] input').value),Array(6).fill('4'),'All mounted/off-screen and virtual pages filled without any manual scroll');assert.deepEqual(rows.map(r=>r.querySelector('[class*=priceInputWrapper] input.input-money').value),Array(6).fill('1'));assert.equal(top,400,'Original scroll position restored');assert.ok(scrolls>2);assert.equal(submissions,0);assert.equal(tool.diagnostics().pricingTiming.sourceReads,0);assert.equal(tool.diagnostics().pricingTiming.cooldownMs,120);
 await pause(80);root.querySelector('[data-tu-fill-list]').click();tool.setEnabled(false);assert.equal(top,400,'Cancel restores position');const count=scrolls;await pause(400);assert.equal(scrolls,count,'No discovery movement after cancel');
 console.log('Automatic list passed: zero-rect mounted rows, three virtual pages without manual scrolling, remount safety, position restore, cancel, fixed-price fast path and no submission.');
}finally{tool.stop();w.clearTimeout(renderTimer);w.close();}
