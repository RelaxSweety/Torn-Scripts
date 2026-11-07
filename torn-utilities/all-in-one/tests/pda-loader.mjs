import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
// Mirror Torn PDA UserscriptsProvider.adaptSource: per-script storage binding,
// closure wrapping, then global typography normalization before evaluation.
const adapt=source=>`(function(){const PDA_storage=window.__pdaStorageFactory&&window.__pdaStorageFactory("tu-fixture");${source}}());`.replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
const old=fs.readFileSync(new URL('../../releases/dev/torn-utilities-0.5.42.47-dev.user.js',import.meta.url),'utf8');assert.throws(()=>new vm.Script(adapt(old)),SyntaxError,'Previous distribution must reproduce the PDA parse failure');
const source=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');new vm.Script(adapt(source));new vm.Script(adapt(fs.readFileSync(new URL('../dist/tu-diagnostics-dev.user.js',import.meta.url),'utf8')));
const tools=JSON.parse(fs.readFileSync(new URL('../config/tools.json',import.meta.url)));
for(const early of [false,true]){
 const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://www.torn.com/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document,errors=[],observers=[],Native=w.MutationObserver;
 w.MutationObserver=class extends Native{constructor(fn){super(fn);observers.push(this)}};w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});w.unsafeWindow=w;w.GM_info={scriptHandler:'Torn PDA'};w.__pdaStorageFactory=()=>({});w.flutter_inappwebview={callHandler:async()=>{throw Error('Unexpected request')}};w.fetch=async()=>{throw Error('Unexpected fetch')};w.alert=()=>{};
 try{
  if(early)d.body.remove();w.eval(adapt(source));if(early){assert.equal(w.__TU_DEV_STARTUP__.phase,'waiting-for-body');d.documentElement.append(d.createElement('body'));d.dispatchEvent(new w.Event('DOMContentLoaded'));}
  await new Promise(resolve=>setTimeout(resolve,20));assert.equal(w.__TU_DEV_STARTUP__.phase,'ready');assert.ok(d.querySelector('#tu-pda-launcher'));assert.equal(d.querySelector('#tu-pda-launcher').hidden,false);for(const tool of tools)assert.equal(w.TornUtilities.isRegistered(tool.id),true);assert.deepEqual(errors,[]);
 }finally{for(const observer of observers)observer.disconnect();w.close()}
}
console.log('PDA loader passed: official wrapper/storage binding/quote normalization, reproduced old syntax error, normal and pre-BODY startup, visible launcher and ten registered tools');
