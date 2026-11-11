"""Trusted-click handler checks. All browser/network responses are synthetic."""
import pathlib
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1]
code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
def factory(name):
 start=code.index('const '+name+'=')+len('const '+name+'=');end=code.index('\n};',start)+2
 return 'const '+name+'='+code[start:end]+';'
script='\n'.join(factory(n) for n in ['createTravelRequestCapture','createDirectQuickItems','createSnatchDirectItems'])
script+=r'''
const partial=location.search.includes('partial'),id=partial?67:66,name=partial?'First Aid Kit':'Morphine';
document.cookie='rfc_v=fixture; path=/';let current={maxBaseSlots:2,maxSpecialSlots:0,slots:[{ID:'123',item:{ID:String(id),name}},{ID:'124'}]},nativeCalls=0;const requests=[];
const pilot=createDirectQuickItems({window,document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{const step=new URL(url).searchParams.get('step');requests.push({step,method:options.method,body:options.body});if(step==='useItem'){current={maxBaseSlots:2,maxSpecialSlots:0,slots:[{ID:'123'},{ID:'124'}]};return new Response(JSON.stringify({success:true,itemRemoved:true,message:'Selected medical used.'}));}return new Response(JSON.stringify(current));}});
const run={ownerId:'fixture',intentId:'fixture',watchKey:'id:206',minimumQty:1,medicals:[{id,name}],capacityLedger:{valid:true,total:2,initialOccupied:1,freed:0,purchased:0}};
const adapter=createSnatchDirectItems({window,native:{prepareRun(){},cancel(){},inspect:()=>({}),execute(){nativeCalls++;throw Error('Native item use is forbidden')}},getPilot:()=>pilot,getProfile:async()=>({status:{state:partial?'Hospital':'Abroad',until:Date.now()/1000+1000}})});
document.getElementById('action').onclick=async event=>{try{const r=await adapter.execute('heal',{event,run,guard:()=>true,getSnapshot:()=>({hospitalized:true,traveling:false,quantity:2500})});document.getElementById('status').textContent=r.hospitalReleased?'Released':'Still hospitalized';}catch(e){document.getElementById('status').textContent=e.message;}};
window.fixture={requests,get nativeCalls(){return nativeCalls}};
'''
html='<!doctype html><meta charset="utf-8"><title>Synthetic selected-item handler</title><div id="travel-root"></div><button id="action">Heal selected item</button><p id="status"></p><script>'+script+'</script>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for partial in [False,True]:
   context=browser.new_context();context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html; charset=utf-8',body=html));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel'+('&partial=1' if partial else ''));page.bring_to_front()
   page.locator('#action').evaluate('e=>e.click()');page.wait_for_timeout(30);assert page.evaluate('fixture.requests.length')==0
   page.locator('#action').click();expected='Still hospitalized' if partial else 'Released';page.get_by_text(expected,exact=True).wait_for()
   assert page.evaluate('fixture.nativeCalls')==0
   calls=page.evaluate('fixture.requests');assert [r['step'] for r in calls]==['inventory','useItem','inventory'];assert calls[1]['method']=='POST';assert calls[1]['body']=='{"slotID":123}'
   context.close()
  print('Chromium selected healing passed: one trusted click uses Morphine/First Aid through the direct handler, no native calls, verified consumption and separate partial/released outcomes; all traffic mocked')
 finally:browser.close()
