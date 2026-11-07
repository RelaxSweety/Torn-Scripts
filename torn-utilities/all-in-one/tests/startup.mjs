import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const source=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://www.torn.com/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document,observers=[],Native=w.MutationObserver,errors=[];
w.MutationObserver=class extends Native{constructor(fn){super(fn);observers.push(this)}};w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});w.fetch=async()=>{throw Error('Unexpected network request')};w.alert=()=>{};w.confirm=()=>true;
Object.defineProperty(w,'innerWidth',{value:432,configurable:true});Object.defineProperty(w,'innerHeight',{value:816,configurable:true});w.localStorage.setItem('relaxsweety_tu_pda_v1',JSON.stringify({x:9000,y:9000}));
try{
 d.body.remove();w.eval(source);assert.equal(w.__TU_DEV_STARTUP__.phase,'waiting-for-body');assert.equal(w.TornUtilities,undefined);w.eval(source);d.documentElement.append(d.createElement('body'));d.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,30));
 assert.equal(w.__TU_DEV_STARTUP__.phase,'ready');const icon=d.querySelector('#tu-pda-launcher');assert.ok(icon);assert.equal(icon.hidden,false);assert.equal(d.querySelectorAll('#tu-pda-launcher').length,1);assert.ok(Number.parseFloat(icon.style.left)<=398,'Zero-width layout measurements must not put the icon beyond the viewport');assert.ok(Number.parseFloat(icon.style.top)<=782);w.eval(source);assert.equal(d.querySelectorAll('#tu-pda-launcher').length,1);assert.equal(w.TornUtilities.isRegistered('item-monitor'),true);assert.deepEqual(errors,[]);
}finally{for(const observer of observers)observer.disconnect();w.close()}
console.log('Startup passed: pre-BODY PDA injection, delayed tool registration, duplicate injection and offscreen saved launcher coordinates');
