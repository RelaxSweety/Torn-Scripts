import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTravelRequestCapture} from '../src/features/direct-items/travel-request-capture.js';
import {createTravelDomDiagnostic} from '../src/diagnostics/travel-dom.js';
const w=new JSDOM('<body><section id="tuim-panel"><p id="status">Hospital monitoring</p></section></body>',{url:'https://www.torn.com',pretendToBeVisual:true}).window,s=w.sessionStorage;
const domKey='tu:item-monitor:dev:diagnostics:v1',network='tu:quickitems-test:travel-network:v1';
s.setItem('tu:diagnostics:build:v1','old');s.setItem(domKey,JSON.stringify([{old:true}]));s.setItem(domKey+':monitor',JSON.stringify({active:true,stage:'Workflow (continuous)',sequence:20}));s.setItem(network,JSON.stringify({schemaVersion:1,active:true,records:[{old:true}]}));s.setItem('tu:quickitems-test:attempt:v1','unconfirmed');s.setItem('tu:snatch-run:v1','armed');w.localStorage.setItem('tuac-settings','preferences');
const capture=createTravelRequestCapture({window:w,document:w.document,build:'0.5.42.87-dev'});
assert.equal(capture.report().records.length,0);assert.equal(s.getItem(domKey),null);assert.equal(JSON.parse(s.getItem(domKey+':monitor')).active,true);assert.equal(s.getItem('tu:quickitems-test:attempt:v1'),'unconfirmed');assert.equal(s.getItem('tu:snatch-run:v1'),'armed');assert.equal(w.localStorage.getItem('tuac-settings'),'preferences');
let notices=0;const diag=createTravelDomDiagnostic({window:w,document:w.document,scrub:String,storageKey:'fixture',getMeta:()=>({installedBuild:'fixture'}),onChange:()=>{notices++;w.document.getElementById('status').textContent='Hospital monitoring '+notices;}});
try{diag.start();for(let i=0;i<10;i++)w.document.getElementById('status').append(w.document.createElement('span'));await new Promise(r=>setTimeout(r,450));assert.equal(diag.report().captures.length,0,'TU UI updates cannot feed diagnostic DOM capture');assert.ok(notices<5,'No diagnostic self-capture loop');capture.clear();assert.equal(capture.report().records.length,0);assert.equal(s.getItem('tu:quickitems-test:attempt:v1'),'unconfirmed');}finally{diag.stop();capture.stop();w.close();}
console.log('Diagnostic reset passed: update clears mixed-version evidence, preserves monitoring/settings/run/pending-use lock, and excludes TU self-mutations');
