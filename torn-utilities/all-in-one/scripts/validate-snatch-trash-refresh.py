"""Trusted Chromium destruction checks; all inventory and traffic synthetic."""
import pathlib
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1]
code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
def factory(name):
 start=code.index('const '+name+'=')+len('const '+name+'=');end=code.index('\n};',start)+2
 return 'const '+name+'='+code[start:end]+';'
script='\n'.join(factory(n) for n in ['createTravelRequestCapture','createDirectQuickItems','createSnatchDirectItems','createTravelEnhancements'])
fixture=(base/'tests/direct-trash-workflow.mjs').read_text()
script+='\nconst w=window,d=document;d.cookie="rfc_v=fixture; path=/";\n'+fixture[fixture.index('const slots='):fixture.index('try{\n engine.start')].replace('const engine=createEngine(', 'const engine=createTravelEnhancements(').replace("if(options.method==='POST'){assert.equal(new URL(url).searchParams.get('step'),'trashItem');", "if(options.method==='POST'){").replace('slots.find(s=>s.ID===id).item=null;', "if(!location.search.includes('uncertain'))slots.find(s=>s.ID===id).item=null;")
script+='''\nwindow.itemFocusEvents=[];window.addEventListener('focus',()=>{if(posts.length)itemFocusEvents.push(posts.length);return new Promise(()=>{});});\nwindow.fixture={posts,native,slots,engine,async ready(){engine.start();await engine.arm({watchKey:watch.key,destroyInventory:true,destroyAccepted:true,destroyItems:[{id:732,name:'Blood Bag : A+'}]});engine.stock(watch,snapshot);}};'''
html='<!doctype html><meta charset="utf-8"><title>Synthetic direct destruction</title><div id="travel-root"></div><script>'+script+'</script>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height,uncertain in [('desktop',1280,900,False),('portrait',390,844,False),('landscape',844,390,False),('uncertain',1280,900,True)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html; charset=utf-8',body=html));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel'+('&uncertain=1' if uncertain else ''));page.bring_to_front();page.evaluate('fixture.ready()')
   button=page.locator('#tu-snatch-run');button.evaluate('e=>e.click()');page.wait_for_timeout(50);assert page.evaluate('fixture.posts.length')==0
   button.click();page.wait_for_function('fixture.posts.length===1');page.wait_for_timeout(100)
   assert page.evaluate('fixture.native.length')==0
   if uncertain:
    assert page.evaluate('itemFocusEvents')==[],'Uncertain destruction must not refresh'
    button.evaluate('e=>e.click()');page.wait_for_timeout(50);assert page.evaluate('fixture.posts.length')==1;assert page.evaluate('fixture.engine.getState().destroyDone')==False
   else:
    assert '1 remaining' in button.inner_text();assert page.evaluate('itemFocusEvents')==[1];out=base.parent/'development'/'evidence'/'snatch-trash-refresh-112';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'.png')));button.click();page.wait_for_function("fixture.engine.getState().stage==='buy'");assert page.evaluate('fixture.posts')==[11,12];assert page.evaluate('itemFocusEvents')==[1,2],'One refresh per verified removal; never await the native listener';assert page.evaluate('fixture.slots[2].item.ID')==736;assert page.evaluate('fixture.native.length')==0
    assert page.evaluate('fixture.native.length')==0 # Purchase is covered by validate-direct-purchase.py.
   context.close()
  print('Chromium destruction refresh passed: one non-blocking focus event per verified removal, no focus after uncertainty; trusted clicks, one handler POST per item, verified continuation, unselected preservation, separate buy, uncertain-removal lock; all traffic mocked')
 finally:browser.close()
