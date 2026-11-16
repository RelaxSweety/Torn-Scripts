import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createMarketPriceAutoFill} from '../src/features/market-price-auto-fill.js';
import {readItemStockQuantity} from '../src/features/item-stock-quantity.js';
import {setMarketInput} from '../src/features/market-input.js';
import {createMarketRequest} from '../src/adapters/market-request.js';
import {createWindowExpansion} from '../src/ui/window-expansion.js';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const dom=new JSDOM('<head></head><body><main id="item-market-root"></main><div id="mount"></div></body>',{url:'https://www.torn.com/page.php?sid=ItemMarket#/addListing',pretendToBeVisual:true});
const w=dom.window,d=w.document;w.HTMLElement.prototype.getClientRects=()=>[{}];
let calls=[],response={itemmarket:{listings:[{price:100,amount:20},{price:120,amount:5}]}},reject=false,pendingRead=null;
const failIds=new Set();
const manager={isAuthorized:()=>true,requestMarketPriceData:async(kind,id)=>{calls.push([kind,id]);if(pendingRead)return pendingRead();if(reject||failIds.has(id))throw Error('network unavailable');if(id===207)return {...response,itemmarket:{...response.itemmarket,item:{...response.itemmarket.item,id}}};return response;}};
d.getElementById('item-market-root').innerHTML='<div class="itemRowWrapper_new" data-item-id="206"><div class="itemRow_new"><div class="info_new"><span>Xanax x12</span><div class="amountInputWrapper_new"><div class="input-money-group"><input class="input-money" max="12"></div></div><div class="priceInputWrapper_new"><div class="input-money-group"><input class="input-money"></div></div></div></div></div>';
w.localStorage.setItem('tu:market-fill:price-delta','=1');w.localStorage.setItem('tu:market-fill:quantity-mode','max-2');
let filler;
try{
 filler=createMarketPriceAutoFill({window:w,manager,setMarketInput,readItemStockQuantity});assert.equal(filler.diagnostics().enabled,false);assert.equal(d.querySelector('.silmaril-market-filler-button'),null);
 filler.setEnabled(true);await delay(50);let button=d.querySelector('.silmaril-market-filler-button');assert.ok(button,'Dynamic rows receive Fill');
 assert.equal(d.querySelectorAll('.silmaril-market-filler-button').length,1);assert.equal(d.querySelector('.tmf-fillall-bar'),null,'No independent floating manager');
 const price=d.querySelector('[class*=priceInputWrapper] input.input-money'),quantity=d.querySelector('[class*=amountInputWrapper] input.input-money');
 // PDA layouts keep the owned count beside the picture, outside the info controls.
 quantity.removeAttribute('max');[...d.querySelectorAll('.info_new > span')].find(el=>el.textContent==='Xanax x12').remove();
 const stock=d.createElement('span');stock.className='inventory-count';stock.textContent=' ×12';d.querySelector('.itemRow_new').prepend(stock);
 for(const label of [' x12',' ×12',' Available: 12','12 in inventory']){stock.textContent=label;assert.equal(await filler.test.discoverMaxQuantity([quantity],d.querySelector('.info_new')),12,label);assert.equal(quantity.value,'','Read-only discovery never probes live quantity');}
 stock.textContent=' ×1,234';assert.equal(await filler.test.discoverMaxQuantity([quantity],d.querySelector('.info_new')),1234);stock.textContent='';stock.className='itemQuantity_new';stock.textContent='12';assert.equal(await filler.test.discoverMaxQuantity([quantity],d.querySelector('.info_new')),12);stock.textContent=' ×12';
 let inputs=0,changes=0;price.addEventListener('input',()=>inputs++);price.addEventListener('change',()=>changes++);
 assert.equal(await filler.test.guardedFill(button,206,false),'ok');assert.equal(price.value,'1');assert.equal(quantity.value,'10');assert.ok(inputs&&changes);assert.equal(button.dataset.actionFlag,'clear');assert.equal(calls.length,0,'Fixed pricing makes no request');
 await filler.test.guardedFill(button,206,false);assert.equal(price.value,'');assert.equal(quantity.value,'');assert.equal(button.dataset.actionFlag,'fill');
 filler.activate({mount:d.getElementById('mount')});const defaultQty=d.querySelector('[aria-label="Default quantity"]');defaultQty.value='max';[...d.querySelectorAll('button')].find(x=>x.textContent==='Save defaults').click();assert.equal(await filler.test.guardedFill(button,206,false),'ok');assert.equal(quantity.value,'12','Max fills the picture-side inventory count');await filler.test.guardedFill(button,206,false);defaultQty.value='max-2';[...d.querySelectorAll('button')].find(x=>x.textContent==='Save defaults').click();
 // Like Snatch and Run, use Torn's own quantity MAX only when no stock evidence exists.
 stock.textContent='';stock.className='unlabeled';const max=d.createElement('input');max.type='button';max.className='wai-btn';max.value='MAX';quantity.parentElement.append(max);let maxClicks=0;max.onclick=()=>{maxClicks++;quantity.value='12';quantity.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const wrong=d.createElement('input');wrong.type='button';wrong.className='wai-btn';wrong.value='MAX';price.parentElement.append(wrong);let wrongClicks=0;wrong.onclick=()=>wrongClicks++;
 defaultQty.value='skip';[...d.querySelectorAll('button')].find(x=>x.textContent==='Save defaults').click();assert.equal(await filler.test.guardedFill(button,206,false),'skipped');assert.equal(maxClicks,0,'Skip must not click native MAX');assert.equal(quantity.value,'');assert.equal(price.value,'');
 defaultQty.value='max';[...d.querySelectorAll('button')].find(x=>x.textContent==='Save defaults').click();assert.equal(await filler.test.guardedFill(button,206,false),'ok');assert.equal(quantity.value,'12');assert.equal(maxClicks,1);assert.equal(wrongClicks,0);assert.equal(filler.diagnostics().quantity.source,'verified-native-quantity-max');await filler.test.guardedFill(button,206,false);
 const nativePending=filler.test.guardedFill(button,206,false);await delay(20);[...d.querySelectorAll('button')].find(x=>x.textContent==='Stop / Cancel').click();assert.equal(await nativePending,'error');assert.equal(quantity.value,'','Stop restores the pre-MAX quantity');assert.equal(price.value,'','Stop cannot fill a price after native MAX discovery');
 defaultQty.value='max-2';[...d.querySelectorAll('button')].find(x=>x.textContent==='Save defaults').click();assert.equal(await filler.test.guardedFill(button,206,false),'ok');assert.equal(quantity.value,'10');await filler.test.guardedFill(button,206,false);max.remove();
 const submit=d.createElement('button');submit.type='submit';submit.textContent='MAX';submit.onclick=()=>wrongClicks++;quantity.parentElement.append(submit);assert.equal(await filler.test.guardedFill(button,206,false),'error');assert.equal(quantity.value,'');assert.equal(price.value,'');assert.equal(wrongClicks,0,'No submit control is clicked');submit.remove();wrong.remove();stock.textContent=' ×12';
 quantity.value='3';await filler.test.guardedFill(button,206,false);assert.equal(quantity.value,'3','Manual quantities are respected');
 assert.equal(filler.test.resolveQuantity(12,'max-2'),10);assert.equal(filler.test.resolveQuantity(12,'skip'),null);assert.equal(filler.test.resolveQuantity(12,'4'),4);
 for(const formula of ['-1[0]','-5%[market]','-1[bazaar:median]','-1[bazaar:avg]','-1[100x+]','min(max(-1[0],+10%[market]),-1[14])','max(-1[0],=1000)','-1[bazaar] | -1[0]'])assert.equal(filler.test.settingProblem(formula),null,formula);
 assert.equal(filler.test.performOperation(1000,'-5%'),950);assert.equal(filler.test.performOperation(1000,'-1'),999);
 response={itemmarket:{item:{id:206,type:'Drug'},listings:[{price:100,amount:1},{price:120,amount:100},{price:200,amount:5}]},items:{206:{market_value:150,type:'Drug'}},bazaar_average:130,listings:[{price:110,quantity:20,last_checked:Date.now()/1000},{price:140,quantity:20,last_checked:Date.now()/1000}]};
 const evaluate=async formula=>{const result=await filler.test.priceSetting(formula,206,null,null,{mine:12});return filler.test.GetPrice(result.prices,result.formula);};
 assert.equal(await evaluate('-1[0]'),99);assert.equal(await evaluate('-1[1]'),119);assert.equal(await evaluate('-1[100x+]'),119);assert.equal(await evaluate('+10%[market]'),165);assert.equal(await evaluate('max(-1[0],=1000)'),1000);assert.equal(await evaluate('min(max(-1[0],+10%[market]),-1[2])'),165);assert.equal(await evaluate('-1[bazaar]'),109);assert.equal(await evaluate('-1[bazaar:median]'),124);
 // Manual pricing errors preserve both existing fields and the original action flag.
 await filler.test.guardedFill(button,206,false); // Clear the fixed-price row.
 filler.activate({mount:d.getElementById('mount')});
 d.querySelector('[aria-label="Default price formula"]').value='-1[0]';
 [...d.querySelectorAll('button')].find(x=>x.textContent==='Save defaults').click();
 price.value='77';quantity.value='3';reject=true;assert.equal(await filler.test.guardedFill(button,206,true),'error');assert.equal(price.value,'77');assert.equal(quantity.value,'3');assert.equal(button.dataset.actionFlag,'fill');reject=false;
 // Fill All continues after a failed favorite and never invokes submission.
 const clone=d.createElement('div');clone.className='itemRowWrapper_new';clone.dataset.itemId='207';clone.innerHTML='<div class="itemRow_new"><div class="info_new"><span>Second item x12</span><div class="amountInputWrapper_new"><div class="input-money-group"><input class="input-money" max="12"></div></div><div class="priceInputWrapper_new"><div class="input-money-group"><input class="input-money"></div></div></div></div>';d.getElementById('item-market-root').append(clone);await delay(50);
 const favoriteIds=d.querySelector('[aria-label="Favorites item IDs"]');favoriteIds.value='206,207';[...d.querySelectorAll('button')].find(x=>x.textContent==='Save Favorites').click();failIds.add(206);[...d.querySelectorAll('button')].find(x=>x.textContent==='Fill All favorites').click();
 for(let n=0;n<40&&clone.querySelector('.silmaril-market-filler-button')?.dataset.actionFlag!=='clear';n++)await delay(100);
 assert.equal(clone.querySelector('[class*=priceInputWrapper] input.input-money').value,'99');assert.equal(price.value,'77');assert.equal(quantity.value,'3');
 [...d.querySelectorAll('button')].find(x=>x.textContent==='Stop / Cancel').click();failIds.clear();
 // Even a transport that ignores abort cannot apply its late response after Stop.
 let release;pendingRead=()=>new Promise(r=>{release=r;});const inFlight=filler.test.guardedFill(button,206,false);await delay(5);assert.ok(release);[...d.querySelectorAll('button')].find(x=>x.textContent==='Stop / Cancel').click();release(response);assert.equal(await inFlight,'error');assert.equal(price.value,'77');assert.equal(quantity.value,'3');pendingRead=null;
 assert.equal(filler.test.getRowItemId(d.createElement('div')),-1);const image=d.createElement('div');image.innerHTML='<img src="https://www.torn.com/images/items/206/large.png">';assert.equal(filler.test.getRowItemId(image),206);
 const info=d.createElement('div');info.innerHTML='<button class="viewInfoButton_new" aria-controls="info-206-1">Info</button>';assert.equal(filler.test.getRowItemId(info),206);
 // A controlled component rejecting the write must fail verification.
 const controlled=d.createElement('input');d.body.append(controlled);controlled.addEventListener('input',()=>{controlled.value='old';});await assert.rejects(setMarketInput(controlled,'10',{settleMs:1}),/did not accept/);
 // A replacement input accepted by React can still be verified.
 let mounted=d.createElement('input');d.body.append(mounted);mounted.addEventListener('input',()=>{const next=d.createElement('input');next.value='1,234';mounted.replaceWith(next);mounted=next;});await setMarketInput(mounted,'1234',{resolve:()=>mounted,settleMs:1});assert.equal(mounted.value,'1,234');
 filler.activate({mount:d.getElementById('mount')});assert.ok(d.querySelector('[data-tu-embedded]'));assert.match(d.getElementById('mount').textContent,/Favorites/);
 filler.setEnabled(false);assert.equal(d.querySelector('.silmaril-market-filler-button'),null);assert.equal(w.localStorage.getItem('tu:market-fill:enabled'),'false');
 // Expand/restore preserves original inline geometry and is independent of native fullscreen.
 const panel=d.createElement('section');panel.id='window-test';panel.style.cssText='width:300px;left:25px';panel.innerHTML='<header>Tool</header>';d.body.append(panel);const expansion=createWindowExpansion({window:w});expansion.enhance(panel);panel.querySelector('[data-tu-expand]').click();assert.equal(panel.dataset.tuExpanded,'true');panel.querySelector('[data-tu-expand]').click();assert.equal(panel.style.width,'300px');assert.equal(panel.style.left,'25px');
 // Read-only adapter: key isolation, cache, malformed JSON, rate limit, cancellation.
 let requests=[],badJson=false,status=200,clock=0;
 const adapter=createMarketRequest({window:w,authorized:()=>true,getKey:()=> 'abcdef0123456789',now:()=>clock,http:options=>{requests.push(options);queueMicrotask(()=>options.onload({status,responseText:badJson?'invalid':'{"listings":[]}'}));return {abort(){}};}});
 await adapter.read('market',206);assert.equal(requests[0].headers.Authorization,'ApiKey abcdef0123456789');assert.ok(!requests[0].url.includes('abcdef'));await adapter.read('market',206);assert.equal(requests.length,1);
 await adapter.read('bazaar',206);assert.equal(requests[1].headers.Authorization,undefined);assert.ok(!JSON.stringify(requests[1]).includes('abcdef'));
 await assert.rejects(adapter.read('market',-1),/Invalid/);clock=61000;badJson=true;await assert.rejects(adapter.read('market',206),/invalid JSON/);badJson=false;status=429;await assert.rejects(adapter.read('bazaar',206),/rate limit/);const n=requests.length;await assert.rejects(adapter.read('bazaar',206),/rate limit/);assert.equal(requests.length,n);
 const controller=new w.AbortController();controller.abort();await assert.rejects(adapter.read('market',206,{signal:controller.signal}),/cancelled/);
 console.log('PASS Market Auto Fill: fixed/combined formula grammar, original arithmetic, quantity rules, dynamic controls, native event writes, formatted rerenders/rejection, Clear/manual quantity, ID extraction, embedded settings, enable/disable, expand/restore, adapter cache/key isolation/JSON/rate limit/cancellation. Actual PDA and Tampermonkey interaction: SKIP (unverified).');
}finally{filler?.stop();w.close();}
