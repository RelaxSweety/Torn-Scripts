"""Synthetic native countdown synchronization; no network requests or gameplay."""
import pathlib
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1];code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
def factory(name):
 start=code.index('const '+name+'=')+len('const '+name+'=');return 'const '+name+'='+code[start:code.index('\n};',start)+2]+';'
script='\n'.join(factory(name) for name in ['createNativeClockSync','createHospitalClock','createLandingAlarm','createTravelEnhancements'])
script+=r'''
let clock=Date.now(),updates=0,requests=0;const hospital=createHospitalClock({document,now:()=>clock}),deadline=clock+91000;hospital.read({state:'Hospital',until:deadline/1000});
const landing=createLandingAlarm({window,document,now:()=>clock,getFlight:()=>({route:'Torn to Japan',returning:false,timerText:document.querySelector('time').textContent}),getSettings:()=>({enabled:false}),audio:{stop(){}}});
const engine=createTravelEnhancements({window,document,now:()=>clock,restoreRun:{ownerId:'42',country:'jap',stage:'waiting',watchKey:'id:260',hospitalizedConfirmed:true,hospitalUntil:deadline},getItems:()=>[],getSnapshot:()=>({ownerId:'42',country:'jap',traveling:true,returning:false,hospitalized:true,quantity:0,hospitalUntil:deadline}),getHospitalCountdown:()=>hospital.displayRemaining(),getDestinationETA:()=>landing.snapshot(),getContext:()=>{requests++;throw Error('No request permitted')},getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false});
const sync=createNativeClockSync({window,document,sync:()=>{updates++;landing.tick();engine.syncCountdown();}});engine.start();sync.start();
window.fixture={engine,get updates(){return updates},get requests(){return requests},advance(){clock+=630;document.querySelector('#native-hospital span').textContent='00:01:29';document.querySelector('time').textContent='00:01:29';}};
'''
html='<!doctype html><meta charset="utf-8"><title>Native clock synchronization fixture</title><style>body{background:#19232c;color:white;font:18px system-ui;padding:18px}</style><h2>Native countdown fixture</h2><a id="native-hospital" aria-label="Hospital: Injury">Hospital: <span>00:01:30</span></a><div id="travel-root"><section aria-label="Flight progress">Torn to Japan. Remaining Flight Time — <time>00:01:30</time></section></div><script>'+script+'</script>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height in [('desktop',1280,900),('portrait',390,844),('landscape',844,390)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body=html));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel');page.evaluate('fixture.advance()');page.wait_for_function("document.getElementById('tu-snatch-run').textContent.includes('Hosp Time: 01:29')&&document.getElementById('tu-snatch-run').textContent.includes('Dest ETA: 89 seconds')");assert page.evaluate('fixture.requests')==0;out=base.parent/'development/evidence/native-clocks-95';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'.png')));context.close()
  print('Chromium native clock sync passed: off-phase native changes immediately mirror hospital 01:29 and flight 89 seconds on desktop/portrait/landscape with no API requests; synthetic fixtures only')
 finally:browser.close()
