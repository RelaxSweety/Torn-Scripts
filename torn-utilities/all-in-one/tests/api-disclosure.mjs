import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createApiDisclosure} from '../src/features/api-disclosure.js';
import {renderAgreementMarkdown} from '../src/features/agreement-renderer.js';
const agreement=JSON.parse(fs.readFileSync(new URL('../../agreements/dev/current.json',import.meta.url),'utf8'));
const dom=new JSDOM('');try{
 for(const mode of ['userscript-private','origin-local']){
  const disclosure=createApiDisclosure({document:dom.window.document,storageMode:mode,content:agreement.content});assert.equal(disclosure.querySelectorAll('table').length,7);assert.equal(disclosure.querySelectorAll('tbody tr').length,35);
  assert.ok(disclosure.textContent.includes('competitive'));assert.ok(disclosure.textContent.includes(mode==='userscript-private'?'userscript-manager':'Torn-origin'));assert.ok(disclosure.textContent.includes('Delete My TU Data'));assert.equal(disclosure.querySelector('input,button,script'),null);
  for(const table of disclosure.querySelectorAll('table')){assert.equal(table.querySelectorAll('thead th').length,2);assert.equal(table.style.tableLayout,'fixed');}
 }
 const safe=renderAgreementMarkdown({document:dom.window.document,markdown:'# Heading\n\nA wrapped\nparagraph with **bold** and [Torn](https://www.torn.com).\n\n<img src=x onerror=alert(1)> [Bad](javascript:alert(1))\n\n- First\n  continuation\n- Second'});
 assert.ok(safe.textContent.includes('A wrapped paragraph'));assert.ok(safe.querySelector('strong'));assert.equal(safe.querySelectorAll('a').length,1);assert.equal(safe.querySelector('a').rel,'noopener noreferrer');assert.equal(safe.querySelector('script,img'),null);assert.equal(safe.querySelectorAll('li').length,2);
 assert.throws(()=>createApiDisclosure({document:dom.window.document,content:'Missing disclosure'}),/unavailable/);
}finally{dom.window.close();}
console.log('Agreement disclosures passed: all approved tables, host storage notice, wrapped Markdown, safe links/literal HTML and missing-content rejection');
