"""Full-bundle diagnostic controls, trusted clicks and screenshots; all gameplay mocked."""
import pathlib,json
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1];code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
setup=r'''
document.cookie='rfc_v=FIXTURE_RFC;path=/';window.GM_info={scriptHandler:'Tampermonkey',version:'fixture'};window.alert=()=>{};window.confirm=()=>true;
localStorage.setItem('tu:identity:public-only-key:v1','abcdef0123456789');localStorage.setItem('tu:agreement:accepted','fixture-v1');sessionStorage.setItem('tu:dev:auth:session:v1','fixture-token');
window.GM_xmlhttpRequest=o=>queueMicrotask(()=>o.onload?.({status:200,responseText:JSON.stringify(o.url.includes('/v2/user/profile')?{profile:{id:42,status:{state:'Okay'}}}:o.url.endsWith('/api/auth/agreement')?{accepted:true,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-07'}}:{info:{access:{type:'Public Only'},user:{id:42}}})}));
window.nativeRefreshCalls=0;window.loadEquippedItems=function(){window.nativeRefreshCalls++;return fetch('/page.php?rfcv=SECRET_SOURCE');};
window.itemPosts=[];let inventory={maxBaseSlots:2,maxSpecialSlots:0,slots:[{ID:1,item:{ID:736,name:'Blood Bag : AB+'}},{ID:2}]};
window.fetch=async(url,options={})=>{const step=new URL(url,location.href).searchParams.get('step');if(step==='addSlotItem'){window.itemPosts.push(JSON.parse(options.body));inventory.slots[1].item={ID:732,name:'Blood Bag : A+'};}return new Response(JSON.stringify(step==='addSlotItem'?{success:true}:inventory),{status:200,headers:{'Content-Type':'application/json'}});};
window.focusTestEvents=0;window.enableRefreshFixture=false;window.addEventListener('focus',()=>{if(!window.enableRefreshFixture)return;window.enableRefreshFixture=false;window.focusTestEvents++;window.fetch('/page.php?sid=travelData&step=inventory&rfcv=FIXTURE_RFC').then(()=>{document.querySelector('.inventorySlot_fixture').innerHTML='<button aria-label="Blood Bag slot 1"><img src="/images/items/732/medium.png"></button>';});});
window.URL.createObjectURL=blob=>{blob.text().then(text=>window.diagnosticReport=JSON.parse(text));return 'blob:fixture';};window.URL.revokeObjectURL=()=>{};window.HTMLAnchorElement.prototype.click=()=>{};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height in [('desktop',1280,900),('portrait',390,844),('landscape',844,390)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body='<!doctype html><meta charset="utf-8"><div id="travel-root"><h4>Travel Agency</h4><ul class="inventoryPanel_fixture"><li class="inventorySlot_fixture"><span class="srOnly_fixture">slot 1 empty</span></li></ul></div>'));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel');page.bring_to_front();page.evaluate(setup);page.evaluate(code);page.locator('#tu-pda-launcher').click();page.locator('[data-tab="modules"]').click()
   for name in ['Business Tools','Travel Assistant and Item Monitor']:page.locator('.tu-card').filter(has=page.get_by_text(name,exact=True)).locator('button').click()
   page.get_by_role('button',name='Open Item Monitor',exact=True).click();page.locator('#tuim-dev-inspect-refresh').click();assert page.evaluate('window.nativeRefreshCalls')==0
   page.locator('#tuim-dev-add-blood-bag').click();page.wait_for_function("!document.querySelector('#tuim-dev-add-blood-bag').disabled");assert page.locator('#tuim-dev-diagnostic-status').inner_text().startswith('Confirmed: 1 A+'),page.locator('#tuim-dev-diagnostic-status').inner_text()
   assert page.evaluate('window.itemPosts')==[{'itemID':732}];page.evaluate('window.enableRefreshFixture=true');page.locator('#tuim-dev-test-refresh').click();page.wait_for_function("!document.querySelector('#tuim-dev-test-refresh').disabled");assert page.evaluate('window.focusTestEvents')==1;page.get_by_role('button',name='Report Generation',exact=True).click();page.wait_for_function('!!window.diagnosticReport');report=page.evaluate('window.diagnosticReport.quickItemExperiment.nativeInventoryRefresh');assert report['focusTests'][0]['result']=='inventory-read-and-cells-changed';assert report['focusTests'][0]['after']['cells'][0]['itemIDs']==[732];assert report['addOutcome']['result']=='addition-confirmed';assert report['probes'][0]['result']=='function-found';assert 'SECRET_SOURCE' not in json.dumps(report)
   out=base.parent/'development/evidence/native-refresh-100';out.mkdir(parents=True,exist_ok=True);page.locator('#tuim-dev-test-refresh').scroll_into_view_if_needed();page.screenshot(path=str(out/(label+'.png')))
   page.get_by_role('button',name='Monitoring Deactivation',exact=True).click();page.locator('#tuim-dev-inspect-refresh').click();assert 'Activate diagnostics first' in page.locator('#tuim-dev-diagnostic-status').inner_text();context.close()
  print('Full-bundle Chromium diagnostics passed: trusted numeric itemID POST, one focus event with inventory GET and native-cell redraw, verified report, inspected function never invoked, secret omitted, inactive guard; desktop/portrait/landscape screenshots; all traffic mocked.')
 finally:browser.close()
