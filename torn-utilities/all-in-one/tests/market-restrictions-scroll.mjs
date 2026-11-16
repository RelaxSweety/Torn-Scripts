import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createMarketPriceAutoFill} from '../src/features/market-price-auto-fill.js';
import {setMarketInput} from '../src/features/market-input.js';
import {readItemStockQuantity} from '../src/features/item-stock-quantity.js';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const dom=new JSDOM('<body><form id="item-market-root"></form><div id="mount"></div></body>',{url:'https://www.torn.com/page.php?sid=ItemMarket#/addListing',pretendToBeVisual:true});
const w=dom.window,d=w.document,market=d.getElementById('item-market-root');
w.HTMLElement.prototype.getClientRects=function(){let el=this;while(el){if(el.hidden||el.style.display==='none')return [];el=el.parentElement;}return this.isConnected?[{}]:[];};
const make=(id,uid,max,name='Golf clubs')=>{const row=d.createElement('div');row.className='itemRowWrapper_test';row.dataset.itemId=String(id);row.dataset.itemUid=uid;row.innerHTML=`<span class="itemName_test">${name}</span><div class="info_test"><div class="amountInputWrapper_test"><div class="input-money-group"><input class="input-money" max="${max}"></div></div><div class="priceInputWrapper_test"><div class="input-money-group"><input class="input-money"></div></div></div>`;return row;};
const qty=row=>row.querySelector('[class*=amountInputWrapper] input.input-money'),price=row=>row.querySelector('[class*=priceInputWrapper] input.input-money');
let a=make(206,'a',2),b=make(206,'b',3),c=make(207,'c',4,'Other restricted item'),one=make(209,'one',1,'Only copy'),recycled=make(208,'slot',5,'Favorite item');
market.append(a,b,c,one,recycled);
const single=(id,uid)=>{const row=make(id,uid,1,'Checkbox item');row.querySelector('[class*=amountInputWrapper]').outerHTML='<div class="checkboxWrapper_test"><div class="checkboxContainer_test"><input type="checkbox"></div></div>';price(row).disabled=true;row.querySelector('input[type=checkbox]').onclick=event=>{price(row).disabled=!event.currentTarget.checked;};return row;};const selectable=single(212,'selectable'),protectedSingle=single(213,'protected');market.append(selectable,protectedSingle);const footer=d.createElement('footer');footer.innerHTML='<label><input type="checkbox">Fill</label><button type="submit">List items</button>';market.append(footer);
let submissions=0;market.onsubmit=e=>{submissions++;e.preventDefault();};
w.localStorage.setItem('tu:market-fill:price-delta','=1');w.localStorage.setItem('tu:market-fill:quantity-mode','max');w.localStorage.setItem('tu:market-fill:favourites','["208"]');w.localStorage.setItem('tu:market-fill:excluded','[206,207,209,213]');w.localStorage.setItem('tu:market-fill:restricted-quantities','{"206":1,"209":1,"213":1}');w.localStorage.setItem('tu:market-fill:item-formulas','{"210":{"price":"-1[0]"}}');
let release,reads=0;const data={itemmarket:{item:{id:210,type:'Other'},listings:[{price:101,amount:10}]}};
const tool=createMarketPriceAutoFill({window:w,manager:{isAuthorized:()=>true,requestMarketPriceData:async(kind,id)=>{assert.equal(id,210);reads++;if(reads===1)return new Promise(r=>{release=r;});return data;}},setMarketInput,readItemStockQuantity});
try{
 tool.setEnabled(true);await pause(80);tool.activate({mount:d.getElementById('mount')});
 const star=row=>row.querySelector('.tmf-fav'),entry=id=>d.querySelector(`[data-tu-favorite-entries="Excluded"] [data-item-id="${id}"]`);
 assert.equal(d.querySelector('[aria-label="Keep quantity for 207"]').value,'all','Legacy exclusion still keeps every copy');
 const keep207=d.querySelector('[aria-label="Keep quantity for 207"]');keep207.value='1';entry(207).querySelector('button').click();assert.equal(tool.diagnostics().restrictedQuantities['207'],1);
 // Canonical storage changes clear both the module entries and visible row marks.
 w.localStorage.setItem('tu:market-fill:favourites','[]');w.dispatchEvent(new w.StorageEvent('storage',{key:'tu:market-fill:favourites'}));assert.equal(star(recycled).textContent,'☆');assert.equal(d.querySelector('[data-tu-favorite-entries="Favorites"] [data-item-id="208"]'),null);
 star(recycled).click();star(recycled).click();star(recycled).click();assert.equal(tool.diagnostics().favorites.includes(208),false);assert.equal(tool.diagnostics().excluded.includes(208),false);
 // Torn recycles a row: old item marks must not be carried onto the new item.
 recycled.dataset.itemId='210';recycled.querySelector('.itemName_test').textContent='Remounted quote item';await pause(80);assert.equal(star(recycled).dataset.tmfItemId,'210');star(recycled).click();assert.ok(tool.diagnostics().favorites.includes(210));assert.ok(!tool.diagnostics().favorites.includes(208));star(recycled).click();star(recycled).click();assert.equal(d.querySelector('[data-tu-favorite-entries="Excluded"] [data-item-id="210"]'),null);
 // Restriction caps apply to manual Fill too, without silently overwriting the user's amount.
 qty(c).value='4';assert.equal(await tool.test.guardedFill(c.querySelector('.silmaril-market-filler-button'),207,false),'error');assert.equal(qty(c).value,'4');assert.equal(price(c).value,'');qty(c).value='';
 market.querySelector('[data-tu-fill-list]').click();await pause(30);c.remove();w.dispatchEvent(new w.Event('scroll'));
 for(let i=0;i<100&&!release;i++)await pause(100);assert.ok(release,'Run reaches the quoted item while a queued row is unmounted');
 // Scrolling recycles the in-flight row to a different item; never write the old quote there.
 recycled.dataset.itemId='211';price(recycled).disabled=true;recycled.querySelector('.itemName_test').textContent='Different item';a.remove();a=make(206,'a',2);market.prepend(a);await pause(80);w.dispatchEvent(new w.Event('scroll'));release(data);await pause(250);assert.equal(price(recycled).value,'','Temporarily disabled controls are not filled');price(recycled).disabled=false;
 for(let i=0;i<100&&price(recycled).value!=='1';i++)await pause(100);assert.equal(price(recycled).value,'1','Recycled item gets its own fixed price, never the old 100 quote');assert.equal(tool.diagnostics().listFill.active,true,'Missing queued rows pause rather than terminate the run');
 c=make(207,'c',4,'Other restricted item');const quote=make(210,'slot',5,'Quote item');market.insertBefore(c,footer);market.insertBefore(quote,footer);w.dispatchEvent(new w.Event('scroll'));
 for(let i=0;i<150&&tool.diagnostics().listFill.active;i++)await pause(100);
 assert.equal(tool.diagnostics().listFill.active,false);assert.equal(qty(a).value,'1');assert.equal(qty(b).value,'3','Keep one is counted once across two stacks');assert.equal(qty(c).value,'3');assert.equal(price(quote).value,'100');assert.equal(qty(quote).value,'5');assert.equal(qty(one).value,'');assert.equal(price(one).value,'');assert.equal(submissions,0);
 assert.equal(selectable.querySelector('input[type=checkbox]').checked,true);assert.equal(price(selectable).value,'1');assert.equal(protectedSingle.querySelector('input[type=checkbox]').checked,false);assert.equal(price(protectedSingle).value,'');assert.deepEqual(tool.diagnostics().excluded.sort(),[206,207,209,213]);assert.deepEqual(tool.diagnostics().favorites,[]);
 const savedKeep=d.querySelector('[aria-label="Keep quantity for 207"]');savedKeep.value='2';entry(207).querySelector('button').click();await pause(220);assert.equal(price(c).value,'','Changing a restriction invalidates prepared prices');assert.equal(await tool.test.guardedFill(c.querySelector('.silmaril-market-filler-button'),207,false),'ok');assert.equal(qty(c).value,'2','Previously automatic quantities are recalculated for the new keep count');d.querySelector('[aria-label="Keep all copies of 207"]').click();await pause(220);assert.equal(tool.diagnostics().restrictedQuantities['207'],'all');assert.equal(price(c).value,'');assert.equal(await tool.test.guardedFill(c.querySelector('.silmaril-market-filler-button'),207,false),'skipped');

 d.querySelector('[aria-label="Remove 206 from Excluded"]').click();assert.equal(entry(206),null);assert.equal(star(a).textContent,'☆');assert.equal(star(b).textContent,'☆');assert.ok(!Object.hasOwn(tool.diagnostics().restrictedQuantities,'206'));assert.ok(!Object.hasOwn(JSON.parse(w.localStorage.getItem('tu:market-fill:restricted-quantities')),'206'));
 console.log('Market restrictions/scroll passed: authoritative mark removal, recycled-row identity, per-item keep quantities across stacks, manual cap rejection, only-copy preservation, pending-row remounts, in-flight row reuse, correct quotes and no submission.');
}finally{tool.stop();w.close();}
