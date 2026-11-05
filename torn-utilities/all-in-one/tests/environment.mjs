import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {detectTestEnvironment as detect} from '../src/diagnostics/environment.js';
const android='Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36 TornPDA/3.8.2';
let env=detect({userAgent:android,pdaBridge:true,gmInfo:{scriptHandler:'Tampermonkey',version:'5.3',script:{version:'0.2.1-dev'}}});
assert.equal(env.device.model,'SM-S918B');assert.equal(env.os.version,'14');assert.equal(env.host.id,'pda');assert.equal(env.host.version,'3.8.2');assert.equal(env.browser.name,'Android WebView (Chromium)');
env=detect({userAgent:android.replace(' TornPDA/3.8.2',''),pdaBridge:true});assert.equal(env.host.version,null,'A bridge does not reveal PDA app version');
env=detect({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.63',gmInfo:{scriptHandler:'Tampermonkey',version:'5.3.3',script:{version:'0.2.1-dev'}}});
assert.equal(env.browser.name,'Edge');assert.equal(env.browser.version,'131.0.2903.63');assert.equal(env.os.name,'Windows 10/11');assert.equal(env.os.version,null);assert.equal(env.host.version,'5.3.3');
assert.equal(detect({gmInfo:{scriptHandler:'Tampermonkey',script:{version:'9.9.9'}}}).host.version,null,'Never use userscript version as host version');
env=detect({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'});
assert.equal(env.os.name,'iOS');assert.equal(env.os.version,'18.1');assert.equal(env.browser.name,'Safari');assert.equal(env.device.model,'iPhone/iPod family');
env=detect({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.1 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:5});assert.equal(env.os.name,'iPadOS');assert.equal(env.os.version,null);assert.equal(env.device.type,'tablet');
env=detect({userAgent:'Mozilla/5.0 (Linux; Android 10; K) Chrome/131.0.0.0 Mobile Safari/537.36',uaData:{platform:'Android',platformVersion:'14.0.0',model:'Pixel 8',fullVersionList:[{brand:'Not A(Brand',version:'99'},{brand:'Google Chrome',version:'131.0.6778.69'}]}});
assert.equal(env.device.model,'Pixel 8');assert.equal(env.os.version,'14.0.0');assert.equal(env.browser.version,'131.0.6778.69');assert.equal(env.browser.source,'client-hints full version');
assert.equal(detect({userAgent:'Mozilla/5.0 (Linux; Android 10; K) Chrome/131.0.0.0 Mobile Safari/537.36'}).device.model,null);
assert.equal(detect({}).host.id,'unknown');assert.equal(detect({}).browser.version,null);
const source=fs.readFileSync(new URL('../dist/tu-diagnostics-dev.user.js',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,20));
for(const hintsDenied of [false,true]){
 const dom=new JSDOM('<body/>',{url:'https://www.torn.com',runScripts:'outside-only'}),w=dom.window;
 try{
  Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 10; K) Chrome/131.0.0.0 Mobile Safari/537.36'});
  Object.defineProperty(w.navigator,'userAgentData',{value:{platform:'Android',brands:[{brand:'Google Chrome',version:'131'}],getHighEntropyValues:()=>hintsDenied?Promise.reject(Error('Unavailable')):Promise.resolve({platform:'Android',platformVersion:'14.0.0',model:'Pixel 8',fullVersionList:[{brand:'Google Chrome',version:'131.0.6778.69'}]})}});
  w.GM_info={scriptHandler:'Tampermonkey',version:'5.3.3'};
  w.eval(source);
  const input=w.document.querySelector('#tu-test-device');assert.ok(input.value.includes('Android'));assert.equal(w.document.querySelector('#tu-test-host-version').value,'5.3.3');
  input.value='My corrected device';input.dispatchEvent(new w.Event('input'));
  await tick();assert.equal(input.value,'My corrected device','Async detection must preserve user edits');
  assert.ok(w.document.querySelector('#tu-test-detected-environment').textContent.includes(hintsDenied?'Chrome 131':'Pixel 8'));
  const version=w.document.querySelector('#tu-test-host-version');version.value='manual host correction';version.dispatchEvent(new w.Event('input'));
  const select=w.document.querySelector('#tu-test-host');select.value='pda';select.dispatchEvent(new w.Event('change'));assert.equal(version.value,'','Do not copy Tampermonkey version into PDA profile');
  select.value='tampermonkey';select.dispatchEvent(new w.Event('change'));assert.equal(version.value,'manual host correction');
 }finally{dom.window.close()}
}
console.log('Environment detection checks passed: Android/PDA, iOS/iPad desktop mode, Windows/Edge, host versions, Client Hints, unavailable values and editable autofill');
