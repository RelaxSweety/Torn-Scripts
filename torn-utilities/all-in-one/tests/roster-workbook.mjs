import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createRosterWorkbook} from '../src/features/roster-workbook.js';
import {storedZipEntries} from './helpers/stored-zip.mjs';
const estimates=[1234567890,12345678,123456,1005000,999995,999994,1234567890123,null];
const rows=estimates.map((bs,i)=>({side:'Friendly',faction:'A & B',factionId:'99',id:String(i),name:i===0?'=HYPERLINK("unsafe")':'Å player '+i,level:42,days:.25,bs}));
const bytes=createRosterWorkbook(rows);assert.notDeepEqual(Buffer.from(Buffer.from(bytes).toString('utf8'),'utf8'),Buffer.from(bytes),'Reproduce binary ZIP corruption through a UTF-8 text bridge');assert.deepEqual(Buffer.from(Buffer.from(bytes).toString('base64'),'base64'),Buffer.from(bytes),'Base64 transport preserves every workbook byte');const entries=storedZipEntries(bytes);assert.equal(entries.size,6);const w=new JSDOM('').window;
try{
 const sheet=new w.DOMParser().parseFromString(entries.get('xl/worksheets/sheet1.xml'),'application/xml');assert.equal(sheet.querySelectorAll('parsererror').length,0);assert.equal(sheet.querySelector('autoFilter').getAttribute('ref'),'A1:I9');assert.equal(sheet.querySelector('pane').getAttribute('state'),'frozen');assert.equal(sheet.querySelector('c[r="H2"]').getAttribute('t'),null,'Full BS is numeric');assert.equal(sheet.querySelector('c[r="H2"] v').textContent,'1234567890');assert.deepEqual([...sheet.querySelectorAll('c[r^="I"]')].slice(1).map(c=>c.textContent),['1.23B','12.35M','123.46K','1.01M','1.00M','999.99K','1.23T','Unknown']);assert.equal(sheet.querySelector('c[r="D2"]').getAttribute('t'),'inlineStr');assert.equal(sheet.querySelectorAll('f').length,0);assert.equal(sheet.querySelector('c[r="B2"]').textContent,'A & B');fs.writeFileSync('/tmp/tu-roster-workbook-test.xlsx',bytes);
 console.log('Roster workbook passed: XLSX package, active nine-column filter, numeric BS, two-decimal abbreviation/boundary rounding, Unicode, safe literal text and frozen header.');
}finally{w.close();}
