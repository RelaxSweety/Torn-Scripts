import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createApiDisclosure} from '../src/features/api-disclosure.js';
const dom=new JSDOM('');try{for(const mode of ['userscript-private','origin-local']){const table=createApiDisclosure({document:dom.window.document,storageMode:mode});assert.equal(table.querySelectorAll('th').length,6);assert.equal(table.querySelectorAll('tbody tr').length,4);assert.ok(table.textContent.includes('competitive'));assert.ok(table.textContent.includes(mode==='userscript-private'?'userscript-manager':'Torn-origin'));assert.ok(table.textContent.includes('no automatic remote deletion'));assert.equal(table.querySelector('input,button,script'),null);}}finally{dom.window.close();}
console.log('Queued disclosure component passed: required categories, storage-mode accuracy, explicit processing/recipients and no activation/acceptance side effect');
