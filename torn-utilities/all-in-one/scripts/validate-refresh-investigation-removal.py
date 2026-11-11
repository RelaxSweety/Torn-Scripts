"""Full DEV menu browser checks with synthetic authorization and no gameplay requests."""
import pathlib
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1];code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
setup=r'''
window.GM_info={scriptHandler:'Tampermonkey',version:'fixture'};window.alert=()=>{};window.confirm=()=>true;
localStorage.setItem('tu:identity:public-only-key:v1','abcdef0123456789');localStorage.setItem('tu:agreement:accepted','fixture-v1');sessionStorage.setItem('tu:dev:auth:session:v1','fixture-token');
window.GM_xmlhttpRequest=o=>queueMicrotask(()=>o.onload?.({status:200,responseText:JSON.stringify(o.url.endsWith('/api/auth/agreement')?{accepted:true,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-07'}}:{info:{access:{type:'Public Only'},user:{id:42}}})}));
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height in [('desktop',1280,900),('portrait',390,844),('landscape',844,390)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body='<!doctype html><meta charset="utf-8"><div id="travel-root"><h4>Travel Agency</h4></div>'));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel');page.bring_to_front();page.evaluate(setup);page.evaluate(code);page.locator('#tu-pda-launcher').click();page.locator('[data-tab="modules"]').click()
   for name in ['Business Tools','Travel Assistant and Item Monitor']:page.locator('.tu-card').filter(has=page.get_by_text(name,exact=True)).locator('button').click()
   menu=page.locator('#tuim-menu');menu.wait_for(state='visible');assert menu.get_by_text('Direct Item Tools',exact=True).count()==0;assert menu.get_by_role('button',name='Open Direct Item Tools',exact=True).count()==0;menu.get_by_role('button',name='Open Item Monitor',exact=True).wait_for(state='visible');out=base.parent/'development/evidence/remove-refresh-investigation-101';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'.png')))
   menu.get_by_role('button',name='Open Item Monitor',exact=True).click();page.get_by_role('button',name='Diagnostic Monitor Activation',exact=True).wait_for(state='visible');assert page.get_by_text('Native inventory refresh investigation',exact=True).count()==0;assert page.locator('#tuim-dev-inspect-refresh,#tuim-dev-add-blood-bag,#tuim-dev-test-refresh').count()==0;page.locator('#tuim-dev-diagnostics').scroll_into_view_if_needed();page.screenshot(path=str(out/(label+'-diagnostics.png')));context.close()
  print('Chromium full-bundle menu passed: Direct Item Tools section/launcher absent, normal Item Monitor and diagnostics available, desktop/portrait/landscape screenshots; all traffic mocked')
 finally:browser.close()
