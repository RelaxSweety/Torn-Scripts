"""Full DEV War Organizer navigation; synthetic auth, no gameplay/API requests."""
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
   context=browser.new_context(viewport={'width':width,'height':height},is_mobile=label!='desktop',has_touch=label!='desktop');context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Torn fixture</title>'));page=context.new_page();page.goto('https://www.torn.com/index.php');page.bring_to_front();page.evaluate(setup);page.evaluate(code);page.locator('#tu-pda-launcher').click();page.locator('[data-tab="modules"]').click()
   for name in ['War Tools','War Organizer']:page.locator('.tu-card').filter(has=page.get_by_text(name,exact=True)).locator('button').click()
   root=page.locator('#tu-who-panel');root.wait_for(state='visible');assert not page.locator('#tu-pda-panel').is_visible();assert not page.locator('#tu-pda-launcher').is_visible();out=base.parent/'development/evidence/war-window-104';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'-opened.png')))
   root.get_by_role('button',name='Settings',exact=True).click();field=root.locator('input').first;field.fill('17');root.evaluate("e=>{e.style.left='24px';e.style.top='24px';}");root.get_by_role('button',name='Minimize',exact=True).click();assert not root.is_visible();assert not page.locator('#tu-pda-panel').is_visible();assert page.locator('#tu-pda-launcher').is_visible();page.screenshot(path=str(out/(label+'-minimized.png')))
   page.locator('#tu-pda-launcher').click();assert root.is_visible();assert not page.locator('#tu-pda-panel').is_visible();assert field.input_value()=='17';assert root.evaluate('e=>e.style.left')=='24px';page.screenshot(path=str(out/(label+'-restored.png')))
   root.get_by_role('button',name='Back',exact=True).click();assert not root.is_visible();assert page.locator('#tu-pda-panel').is_visible();page.locator('.tu-card').filter(has=page.get_by_text('War Organizer',exact=True)).locator('button').click();assert root.is_visible();assert field.input_value()=='17';assert not page.locator('#tu-pda-panel').is_visible();root.locator('header').get_by_role('button',name='×',exact=True).click();assert page.locator('#tu-who-panel').count()==0;assert page.locator('#tu-pda-panel').is_visible();context.close()
  print('Full-build Chromium War Organizer passed: one visible TU window, minimize/launcher restore, retained draft/position, Back/card resume and close; desktop/portrait/landscape screenshots; all traffic mocked.')
 finally:browser.close()
