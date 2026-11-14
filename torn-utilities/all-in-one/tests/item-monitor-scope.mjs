import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';
const src=fs.readFileSync(new URL('../../modules/item-monitor.user.js',import.meta.url),'utf8');
const between=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
const helper=between('const listingSelector=','\nconst E=')+between('const rowMatches=','\nconst filterContainer=')+between('function foreignShopTables(){','\nfunction foreignShopDiagnostic(){');
const scan=between('function scanMonitor(){','\nfunction clearHighlights()')+between('function clearHighlights(){','\nfunction draggable(');
const row=(id,name,quantity=10,button='Buy',price=100)=>`<tr data-item-id="${id}"><td class="itemName">${name}</td><td data-stock="${quantity}">${quantity}</td><td data-price="${price}">$${price}<button>${button}</button></td></tr>`;
const table=rows=>'<table><tr><th>Name</th><th>Stock</th><th>Cost</th></tr>'+rows+'</table>';
function boot(path,html,watch={category:'Foreign',name:'Xanax',key:'id:206',minQty:5,maxPrice:null}){
 const w=new JSDOM('<main>'+html+'</main>',{url:'https://www.torn.com'+path,pretendToBeVisual:true}).window;w.document.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}]};const alerts=[];let stops=0;
 const c=vm.createContext({document:w.document,location:w.location,URLSearchParams,w,money:v=>{const m=String(v).match(/\$\s*([\d,]+)/);return m?Number(m[1].replaceAll(',','')):NaN;},state:{items:[watch],alarmItemKey:null},text:e=>e?.textContent||'',norm:s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim(),style(){},recordStockScan(){},stockDiagnostic:null,enhancements:null,inventoryAudio:{stop(){stops++;}},alertItem:(item,reason)=>{alerts.push(reason);c.state.alarmItemKey=item.key;},snatchSnapshot:()=>({})});vm.runInContext(helper+'\n'+scan,c);return {w,c,alerts,scan:()=>vm.runInContext('scanMonitor()',c),stops:()=>stops,close:()=>w.close()};
}
for(const path of ['/factions.php','/item.php','/inventory.php','/city.php','/page.php?sid=jobs&name=itemmarket','/page.php?sid=travelData&step=useItem']){
 const t=boot(path,table(row(206,'Xanax')));try{t.scan();assert.equal(t.alerts.length,0,path);assert.equal(t.w.document.querySelectorAll('.tuim-trigger,.tuim-wait').length,0,path);}finally{t.close();}
}
for(const path of ['/bazaar.php','/shops.php','/page.php?sid=travel','/travelagency.php']){
 const t=boot(path,table(row(206,'Xanax')));try{t.scan();assert.equal(t.alerts.length,1,path);assert.ok(t.w.document.querySelector('.tuim-trigger'));t.w.history.pushState({},'','/factions.php');t.scan();assert.equal(t.w.document.querySelectorAll('.tuim-trigger,.tuim-wait').length,0);assert.equal(t.c.state.items[0].row,null);assert.equal(t.c.state.items[0].fired,false);assert.equal(t.stops(),1);}finally{t.close();}
}
for(const [html,expected] of [[row(206,'Xanax',10,'Use'),false],[row(207,'Xanax',10),false],[row(999,'Xanax Plushie',10),false],[row(206,'Xanax',0),false],[row(206,'Xanax',10).replace('<button>','<button disabled>'),false],[row(206,'Xanax',10).replace('<button>Buy</button>','<button class=buyIconButton></button>'),true],[row(206,'Xanax',10),true]]){
 const t=boot('/bazaar.php',table(html),{category:'Item Market',key:'id:206',name:'Xanax',minQty:null,maxPrice:null});try{t.scan();assert.equal(t.alerts.length>0,expected,html);}finally{t.close();}
}
for(const price of [null,50,150]){
 const t=boot('/page.php?sid=ItemMarket','<h3>Xanax</h3>'+table(row(206,'Xanax')),{category:'Item Market',key:'name:xanax',name:'Xanax',minQty:null,maxPrice:price});try{vm.runInContext("const pageItem=()=>({name:'Xanax',key:'name:xanax'});",t.c);t.scan();assert.equal(t.alerts.length,price===50?0:1);t.w.document.querySelector('button').disabled=true;t.scan();assert.equal(t.w.document.querySelectorAll('.tuim-trigger').length,0);assert.equal(t.c.state.items[0].fired,false);}finally{t.close();}
}
const start=src.indexOf("B(p,'Add / update monitor',()=>{")+"B(p,'Add / update monitor',()=>{".length,body=src.slice(start,src.indexOf('});renderMonitoredFilter(p)',start));
for(const category of ['Foreign','Stores','Item Market','Other'])for(const qty of ['', '10']){
 const alerts=[],c=vm.createContext({state:{selected:{category,name:'Synthetic',key:'id:1'},items:[]},q:{value:qty},pr:{value:''},alert:m=>alerts.push(m),norm:x=>x,clearHighlights(){},save(){},scan(){},render(){}});vm.runInContext('(function(){'+body+'})()',c);assert.deepEqual(alerts,[]);assert.equal(c.state.items.length,1);assert.equal(c.state.items[0].maxPrice,null);assert.equal(c.state.items[0].minQty,qty?10:null);
}
for(const category of ['Foreign','Stores','Item Market']){const c=vm.createContext({state:{selected:{category,name:'Synthetic',key:'id:1'},items:[]},q:{value:'10'},pr:{value:'100'},alert:m=>{throw Error(m)},norm:x=>x,clearHighlights(){},save(){},scan(){},render(){}});vm.runInContext('(function(){'+body+'})()',c);assert.equal(c.state.items[0].maxPrice,100);assert.equal(c.state.items[0].minQty,10);}
console.log('Item scope passed: optional price/quantity, availability and price alerts, supported shops, exact identity, no inventory/faction/city alerts, disabled/zero stock exclusion, navigation cleanup and audio stop.');
