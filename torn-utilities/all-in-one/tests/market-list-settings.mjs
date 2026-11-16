import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createMarketPriceAutoFill} from '../src/features/market-price-auto-fill.js';
import {setMarketInput} from '../src/features/market-input.js';
import {readItemStockQuantity} from '../src/features/item-stock-quantity.js';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const dom=new JSDOM('<body><main id="item-market-root"></main><div id="mount"></div></body>',{url:'https://www.torn.com/page.php?sid=ItemMarket#/addListing',pretendToBeVisual:true});
const w=dom.window,d=w.document,market=d.getElementById('item-market-root');w.HTMLElement.prototype.getClientRects=()=>[{}];
const row=(id,name)=>{const el=d.createElement('div');el.className='itemRowWrapper_test';el.dataset.itemId=String(id);el.innerHTML=`<span class="itemName_test">${name}</span><div class="info_test"><div class="amountInputWrapper_test"><div class="input-money-group"><input class="input-money" max="10"></div></div><div class="priceInputWrapper_test"><div class="input-money-group"><input class="input-money"></div></div></div>`;return el;};
for(const [id,name] of [[700,'Zebra'],[100,'apple'],[300,'Banana'],[400,'Golf Club Alpha'],[500,'golf club Deluxe']])market.append(row(id,name));
w.localStorage.setItem('tu:market-fill:favourites','[700,100,300]');w.localStorage.setItem('tu:market-fill:excluded','[500,400]');w.localStorage.setItem('tu:market-fill:restricted-quantities','{"500":1}');
const tool=createMarketPriceAutoFill({window:w,manager:{isAuthorized:()=>true,requestMarketPriceData:async()=>{throw Error('Settings must not request prices');}},setMarketInput,readItemStockQuantity});
const edit=(el,value)=>{el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
try{
 tool.setEnabled(true);await pause(80);tool.activate({mount:d.getElementById('mount')});
 const section=d.querySelector('[data-tu-favorite-section]'),master=section.querySelector('[data-tu-mark-save]'),search=d.querySelector('[aria-label="Search favorites and restricted items"]');
 const ids=name=>[...section.querySelectorAll(`[data-tu-favorite-entries="${name}"] li[data-item-id]`)].map(el=>Number(el.dataset.itemId));
 const keep=id=>d.querySelector(`[aria-label="Keep quantity for ${id}"]`);
 assert.deepEqual(ids('Favorites'),[100,300,700]);assert.deepEqual(ids('Excluded'),[400,500]);assert.equal(section.querySelectorAll('[data-tu-mark-save]').length,1);assert.equal(section.lastElementChild,master,'One master Save at bottom');assert.ok(![...section.querySelectorAll('button')].some(b=>['Save quantity','Save Favorites','Save Excluded'].includes(b.textContent)));
 edit(search,'GOLF alpha');assert.deepEqual(ids('Excluded'),[400]);assert.deepEqual(ids('Favorites'),[]);assert.match(section.textContent,/No matching items/);edit(search,'');
 edit(keep(500),'2');assert.equal(tool.diagnostics().restrictedQuantities['500'],1,'Quantity edit remains a draft');edit(search,'alpha');edit(keep(400),'3');edit(search,'unmatched-keyword');edit(search,'');assert.equal(keep(500).value,'2');assert.equal(keep(400).value,'3','Filtering preserves drafts');
 edit(search,'alpha');master.click();await pause(30);assert.equal(tool.diagnostics().restrictedQuantities['500'],2,'Master save includes hidden items');assert.equal(tool.diagnostics().restrictedQuantities['400'],3);assert.match(section.querySelector('[data-tu-mark-save-status]').textContent,/Changes saved/);
 edit(search,'');d.querySelector('[aria-label="Keep all copies of 400"]').click();assert.equal(tool.diagnostics().restrictedQuantities['400'],3,'All also waits for master Save');edit(search,'deluxe');edit(keep(500),'-1');master.click();await pause(10);assert.equal(tool.diagnostics().restrictedQuantities['400'],3,'Invalid batch cannot partially save another valid item');assert.equal(tool.diagnostics().restrictedQuantities['500'],2);assert.match(section.querySelector('[data-tu-mark-save-status]').textContent,/Invalid keep quantity/);
 edit(keep(500),'4');master.click();await pause(30);assert.equal(tool.diagnostics().restrictedQuantities['400'],'all');assert.equal(tool.diagnostics().restrictedQuantities['500'],4);assert.equal(JSON.parse(w.localStorage.getItem('tu:market-fill:restricted-quantities'))['500'],4);
 edit(search,'500');assert.deepEqual(ids('Excluded'),[500]);edit(keep(500),'6');keep(500).focus();market.append(row(600,'Aardvark'));await pause(80);assert.equal(d.querySelector('[aria-label="Search favorites and restricted items"]'),search,'Search input survives row/name refresh');assert.equal(keep(500).value,'6');assert.equal(d.activeElement,keep(500),'Focused quantity survives a list refresh');
 d.querySelector('.tmf-fav[data-tmf-item-id="600"]').click();edit(search,'');assert.deepEqual(ids('Favorites'),[600,100,300,700],'New marks use the same alphabetical order');edit(d.querySelector('[aria-label="Excluded item IDs"]'),'400,500');d.querySelector('[aria-label="Remove 500 from Excluded"]').click();master.click();await pause(30);assert.ok(!Object.hasOwn(tool.diagnostics().restrictedQuantities,'500'),'Removing an item discards its unsaved quantity');assert.ok(!tool.diagnostics().excluded.includes(500));
 console.log('Market list settings passed: alphabetical lists, case-insensitive multi-keyword/ID search, stable focus, draft retention through filtering, one bottom Save, hidden-item batch save, validation without partial writes, All drafts and removal.');
}finally{tool.stop();w.close();}
