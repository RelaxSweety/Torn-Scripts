import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createNativeTravelActions} from '../src/features/native-travel-actions.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/travel-agency-inventory.json',import.meta.url)));
const w=new JSDOM('<body><div id="travel-root"><h4>Travel Agency</h4>'+fixture.emptyPanel+'</div></body>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window,d=w.document;
const adapter=createNativeTravelActions({document:d,window:w}),panel=d.querySelector('ul');
try{d.getElementById('travel-root').insertAdjacentHTML('beforeend',fixture.availableItemPicker);assert.deepEqual(adapter.listAgencyItems().map(item=>[item.name,item.amount]),[['Blood Bag : AB+',3],['Blood Bag : A+',4],['Ipecac Syrup',4],['Morphine',2],['First Aid Kit',50]]);assert.ok(adapter.listAgencyItems().every(item=>item.source==='agency-picker'));let result=adapter.inventorySummary();assert.equal(result.verified,true);assert.equal(result.total,18);assert.equal(result.occupied,0);assert.equal(result.free,18);assert.deepEqual(adapter.listInventory(),[]);assert.equal(panel.children.length,21,'Decorative blocked cells are not active slots');
 // Occupied form follows the existing captured native item-button convention.
 panel.querySelector('li').innerHTML='<button aria-label="Morphine slot 1">Morphine</button>';panel.setAttribute('aria-label','Inventory 1 items');result=adapter.inventorySummary();assert.equal(result.total,18);assert.equal(result.occupied,1);assert.equal(result.free,17);assert.deepEqual(result.items,[{name:'Morphine',amount:1}]);assert.equal(adapter.listInventory()[0].name,'Morphine');
 panel.querySelectorAll('li')[1].remove();result=adapter.inventorySummary();assert.equal(result.verified,false,'Incomplete or gapped slot numbering cannot establish capacity');
 d.getElementById('travel-root').innerHTML='<h4>Traveling</h4>'+fixture.flightPanel;result=adapter.inventorySummary();assert.equal(result.verified,true);assert.equal(result.total,18);assert.equal(result.occupied,2);assert.equal(result.free,16);assert.deepEqual(result.items,[{name:'Blood Bag : A+',amount:1},{name:'Blood Bag : AB+',amount:1}]);const run={ownerId:'42',watchKey:'id:1',watchName:'Xanax',intentId:'flight'};adapter.prepareRun(run);assert.equal(run.capacityLedger.total,18);assert.equal(run.capacityLedger.initialOccupied,2,'Flight inventory establishes the pre-action baseline');
}finally{adapter.forget();w.close();}
console.log('Travel Agency inventory passed: captured 0-item panel yields 18 active free slots, three decorative cells excluded, simulated carried item counted, incomplete numbering rejected');
