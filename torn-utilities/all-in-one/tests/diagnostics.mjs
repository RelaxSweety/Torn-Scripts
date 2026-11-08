import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createAcceptanceSession} from '../src/diagnostics/acceptance-session.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const catalog=JSON.parse(read('config/test-cases.json')),tools=JSON.parse(read('config/tools.json')),targetBuild=JSON.parse(read('config/releases.json'))[0].version;
const source=read('dist/tu-diagnostics-dev.user.js'),bundle=read('dist/tu-integrated-staging-dev.user.js');
const make=(platform='tampermonkey',initial={})=>createAcceptanceSession({targetBuild,checklistVersion:catalog.checklistVersion,tests:catalog.tests,platform,initial});
assert.equal(catalog.tests.length,58);assert.equal(catalog.tests.filter(t=>t.kind==='automatic').length,7);
for(const t of tools)for(const suffix of ['function','lifecycle'])assert.ok(catalog.tests.some(c=>c.id==='tool.'+t.id+'.'+suffix));
const s=make();assert.equal(s.report().counts['not-tested'],58);assert.equal(s.report().platformReady,false);
assert.throws(()=>s.record('auth.public','pass'),/evidence/);
assert.throws(()=>s.record('runtime.build','pass','manual fiction'),/declared method/);
s.record('auth.public','blocked','Need a DEV test account');assert.equal(s.report().counts.blocked,1);
s.record('auth.privacy','pass','ApiKey abcdef0123456789 Bearer test-account-secret-value-with-32chars api_key=abcdef0123456789 token=secret-value');
const serialized=JSON.stringify(s.report());for(const secret of ['abcdef0123456789','test-account-secret-value-with-32chars','secret-value'])assert.ok(!serialized.includes(secret));
for(const t of catalog.tests)s.record(t.id,'pass','Observed expected behavior',t.kind);
assert.equal(s.report().platformReady,false,'Device metadata required');s.setMeta({device:'Desktop fixture',hostVersion:'5.0'});assert.equal(s.report().platformReady,true);assert.equal(s.report().productionAuthorized,false);
s.record('auth.public','skip','No account available');assert.equal(s.report().platformReady,false,'Skipped checks do not pass acceptance');
const stale={...s.snapshot(),targetBuild:'old-dev'};assert.equal(make('tampermonkey',stale).report().counts['not-tested'],58);
assert.equal(make('pda',s.snapshot()).report().counts['not-tested'],58,'Host passes must not transfer');
assert.equal(make('unknown').report().platformReady,false);
const tick=()=>new Promise(r=>setTimeout(r,20));
function boot({offline=false,isolated=false,wrongBuild=false}={}){
 const dom=new JSDOM(`<body><section id="tu-pda-panel"><footer>Torn Utilities v${wrongBuild?'old-dev':targetBuild}</footer></section></body>`,{url:'https://www.torn.com/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,errors=[],requests=[],alerts=[];let report;
 w.addEventListener('error',e=>{errors.push(e.error);e.preventDefault()});w.alert=m=>alerts.push(m);w.confirm=()=>true;
 w.GM_info={scriptHandler:'Tampermonkey'};w.HTMLElement.prototype.setPointerCapture=()=>{};
 w.localStorage.setItem('tu:aio:diagnostics:v1',JSON.stringify({results:[{id:'auth.public',status:'pass'}]}));
 w.TornUtilities={isRegistered:id=>tools.some(t=>t.id===id),getAgreementVersion:async()=>{if(offline)throw Error('Network unavailable');return {agreement_version:'fixture-v1',accepted:true}}};
 if(isolated){w.unsafeWindow={TornUtilities:w.TornUtilities};delete w.TornUtilities;}
 w.GM_xmlhttpRequest=o=>{requests.push(o);queueMicrotask(()=>{
  if(offline){o.onerror();return;}
  const agreement={agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-05'},content:'Complete published fixture agreement.'};
  o.onload({status:200,responseText:o.url.endsWith('.user.js')?bundle:JSON.stringify({agreement_version:'fixture-v1'})});
 });};
 w.Blob=class{constructor(parts){report=JSON.parse(parts.join(''))}};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 w.eval(source);
 return {w,dom,errors,requests,alerts,report:()=>report,button:label=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===label),close:()=>dom.window.close()};
}
for(const isolated of [false,true]){
 const b=boot({isolated});try{
  const {w,button,requests,errors,alerts}=b;
  assert.equal(w.document.querySelectorAll('[data-test-id]').length,58);
  button('Export all diagnostics').click();assert.equal(b.report().platforms.tampermonkey.counts.pass,0,'Legacy results are not imported');assert.equal(b.report().platforms.pda.results.length,58);
  button('Run read-only checks').click();await tick();await tick();
  button('Export all diagnostics').click();assert.equal(b.report().platforms.tampermonkey.counts.pass,7);assert.equal(b.report().platforms.pda.counts.pass,0);assert.equal(b.report().acceptanceComplete,false);
  assert.equal(requests.length,2);assert.ok(requests.some(r=>r.url.endsWith('/agreements/dev/version.json')));assert.ok(!requests.some(r=>r.url.includes('/agreement/current')||r.url.endsWith('/agreements/dev/current.json')),'Do not download full agreements for version comparison');for(const r of requests){assert.equal(r.method,'GET');assert.ok(!('data' in r));assert.ok(!Object.keys(r.headers).some(k=>k.toLowerCase()==='authorization'));}
  const auth=w.document.querySelector('[data-test-id="auth.public"]');auth.querySelector('button').click();assert.ok(alerts.pop().includes('evidence'));
  auth.querySelector('textarea').value='Registered a DEV Public Only test account; verified label';auth.querySelector('button').click();
  button('Export all diagnostics').click();assert.equal(b.report().platforms.tampermonkey.counts.pass,8);
  const filter=w.document.querySelector('#tu-test-status');filter.value='not-tested';filter.dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('[data-test-id]').length,50);
  filter.value='all';filter.dispatchEvent(new w.Event('change'));
  const section=w.document.querySelector('#tu-test-section');section.value='tool.war-hit-organizer';section.dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('[data-test-id]').length,2);
  const host=w.document.querySelector('#tu-test-host');host.value='pda';host.dispatchEvent(new w.Event('change'));button('Export all diagnostics').click();assert.equal(b.report().platforms.pda.counts.pass,0);
  button('Reset selected host').click();button('Export all diagnostics').click();assert.equal(b.report().platforms.tampermonkey.counts.pass,8,'Reset only affects selected host');
  w.eval(source);assert.equal(w.document.querySelectorAll('#tu-test-dev-toggle').length,1);
  assert.deepEqual(errors,[]);
 }finally{b.close()}
}
{
 const b=boot({offline:true});try{b.button('Run read-only checks').click();await tick();await tick();b.button('Export all diagnostics').click();const r=b.report().platforms.tampermonkey;assert.equal(r.counts.pass,3);assert.equal(r.counts.blocked,4);assert.equal(r.counts.fail,0);assert.equal(r.counts['not-tested'],51);}finally{b.close()}
}
{
 const b=boot({wrongBuild:true});try{const row=b.w.document.querySelector('[data-test-id="auth.public"]');row.querySelector('textarea').value='Unrelated old build';row.querySelector('button').click();assert.ok(b.alerts.pop().includes(targetBuild));b.button('Export all diagnostics').click();assert.equal(b.report().platforms.tampermonkey.counts.pass,0);}finally{b.close()}
}
console.log('TU Test regression checks passed: catalog coverage, redaction, build/host isolation, evidence gates, UI, exports and blocked networking');
{
 const b=boot();try{
  const {w,button}=b;const dialog=w.document.createElement('div');dialog.setAttribute('role','dialog');dialog.innerHTML='<p>Use a First Aid Kit?</p><button>Yes</button><button>No</button>';w.document.body.append(dialog);let submitted=0;dialog.querySelector('button').onclick=()=>submitted++;
  button('Start monitoring').click();dialog.querySelector('button').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(submitted,1);button('Stop monitoring').click();
  button('Export all diagnostics').click();const report=b.report();assert.equal(report.toolVersion,'0.2.22-dev');assert.equal(report.installedBuild,targetBuild);assert.equal(report.travelDom.captures.length,1);assert.equal(report.travelDom.captures[0].installedBuild,targetBuild);assert.ok(report.travelDom.captures[0].html.includes('Yes'));assert.ok(report.detectedEnvironment.os);assert.ok(report.detectedEnvironment.browser);assert.ok(report.platforms.tampermonkey.meta);assert.equal(b.requests.length,0,'Region capture/export makes no network requests');assert.deepEqual(b.errors,[]);
 }finally{b.close()}
}

{
 const b=boot();try{b.w.__TU_DEV_STARTUP__={build:targetBuild,phase:'failed',error:{name:'TypeError',message:'ApiKey abcdef0123456789'}};b.button('Export all diagnostics').click();const r=b.report();assert.equal(r.startup.phase,'failed');assert.equal(r.startup.launcher.present,false);assert.ok(!JSON.stringify(r.startup).includes('abcdef0123456789'));}finally{b.close()}
}
