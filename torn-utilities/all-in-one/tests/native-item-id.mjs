import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createNativeTravelActions} from '../src/features/native-travel-actions.js';
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/desktop-travel.json',import.meta.url)));
const dom=new JSDOM('<body><div id="travel-root">'+f.shopItem+'</div></body>',{pretendToBeVisual:true});const w=dom.window,d=w.document;w.HTMLElement.prototype.getClientRects=()=>[{}];
const adapter=createNativeTravelActions({document:d,window:w,enabled:()=>true});
try{
 assert.equal(adapter.resolveItem({watchKey:'name:wolverine plushie',watchName:'Wolverine Plushie'}).id,'261');
 assert.throws(()=>adapter.resolveItem({watchKey:'id:999',watchName:'Wolverine Plushie'}),/could not be identified/);
 assert.throws(()=>adapter.resolveItem({watchKey:'name:wolverine',watchName:'Wolverine'}),/could not be identified/);
 const duplicate=d.querySelector('li').cloneNode(true);duplicate.querySelector('form').id='item-999-form';duplicate.querySelector('[aria-controls="item-261-buyPanel"]').setAttribute('aria-controls','item-999-buyPanel');d.querySelector('#travel-root').append(duplicate);
 assert.throws(()=>adapter.resolveItem({watchKey:'name:wolverine plushie',watchName:'Wolverine Plushie'}),/More than one/);
}finally{w.close()}
console.log('Native item identity passed: legacy names, explicit-ID mismatch, exact names and ambiguous-row rejection');
