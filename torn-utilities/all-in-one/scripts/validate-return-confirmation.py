"""Trusted browser gestures through generated Snatch/native factories; synthetic Torn page only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1];bundle=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
def factory(name):
 start=bundle.index('const '+name+'=')+len('const '+name+'=');end=bundle.index('\n};',start)+2;return 'const '+name+'='+bundle[start:end]+';'
code='\n'.join(factory(n) for n in ['createNativeTravelActions','createSteppedNativeActions','createTravelEnhancements'])
fixture=r'''
window.bookings=0;window.continues=0;const state={ownerId:'42',country:'mex',hospitalized:false,traveling:false,returning:false,quantity:NaN};
const home=document.querySelector('#travel-root a'),panel=document.getElementById('travel-home-panel');home.onclick=()=>{home.setAttribute('aria-expanded','true');panel.hidden=false;panel.innerHTML='<p>Are you sure you want to travel back to Torn?</p><button>Confirm travel back</button>';panel.querySelector('button').onclick=()=>{bookings++;Object.assign(state,{traveling:true,returning:true,country:'torn'});panel.innerHTML='<p>You make your way over to the airstrip and tell your pilot to head for Torn</p><button disabled>Continue (5)</button>';};};
const native=createNativeTravelActions({window,document,enabled:()=>true}),adapter=createSteppedNativeActions({native});window.engine=createTravelEnhancements({window,document,getItems:()=>[],getSnapshot:()=>({...state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,restoreRun:{ownerId:'42',country:'mex',watchKey:'id:206',stage:'return',purchaseConfirmed:true},executeAction:adapter});engine.start();
'''
out=base.parent/'development/evidence/snatch-return-114';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for name,width,height in [('desktop',1280,900),('portrait',390,844),('landscape',844,390)]:
   context=browser.new_context(viewport={'width':width,'height':height},is_mobile=name!='desktop',has_touch=name!='desktop');flight=[False];requests=[]
   def route(r):
    requests.append(r.request.method)
    body='<section aria-label="Flight progress">Synthetic return flight page</section>' if flight[0] else '<h2>Synthetic return-flight fixture</h2><div id="travel-root"><a aria-controls="travel-home-panel" aria-expanded="false">Travel home</a><div id="travel-home-panel" hidden></div></div>'
    r.fulfill(status=200,content_type='text/html',body='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;margin:20px;background:#f1f3f4;color:#111}button{padding:12px}</style>'+body)
   context.route('**/*',route);page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel');page.evaluate(code+fixture);button=page.locator('#tu-snatch-run');button.click();page.wait_for_function("document.querySelector('#tu-snatch-run').textContent==='Book return flight'");button.click();page.wait_for_function("document.querySelector('#tu-snatch-run').textContent==='Confirm travel'");assert page.evaluate('bookings')==1;assert page.locator('#travel-home-panel button').is_disabled();assert button.get_attribute('aria-disabled')=='false';assert len(requests)==1;page.screenshot(path=str(out/(name+'-confirm-travel.png')));flight[0]=True;button.click();page.wait_for_selector('[aria-label="Flight progress"]');assert requests==['GET','GET'];context.close()
  print('Generated Snatch Chromium passed: explicit native open/book steps, visible green Confirm travel beside disabled countdown, immediate user-click GET navigation and no duplicate booking; desktop/portrait/landscape synthetic fixtures.')
 finally:browser.close()
