"""Generated DEV arming/healing path; isolated native-style fixture, no real actions."""
import pathlib
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1];code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
def factory(name):
 start=code.index('const '+name+'=')+len('const '+name+'=');end=code.index('\n};',start)+2
 return 'const '+name+'='+code[start:end]+';'
script='\n'.join(factory(n) for n in ['createTravelRequestCapture','createDirectQuickItems','createSnatchDirectItems','createTravelEnhancements'])+r'''
document.cookie='rfc_v=fixture;path=/';window.calls=[];let slots=[{ID:1,item:{ID:732,name:'Blood Bag : A+'}},{ID:2,item:null}];let state={ownerId:'42',country:'mex',status:'Hospital',hospitalized:true,hospitalUntil:Date.now()+600000,quantity:2500,stockVisible:true,traveling:false,returning:false};
const pilot=createDirectQuickItems({window,document,build:'0.5.42.102-dev',isAuthorized:()=>true,fetchImpl:async(url,o)=>{const step=new URL(url).searchParams.get('step');calls.push(step);await new Promise(r=>setTimeout(r,60));if(step==='useItem'){slots[0].item=null;return new Response(JSON.stringify({success:true,itemRemoved:true,message:'You are out of the hospital!'}));}return new Response(JSON.stringify({slots,maxBaseSlots:2,maxSpecialSlots:0}));}});
const adapter=createSnatchDirectItems({window,getPilot:()=>pilot,getProfile:async()=>({status:{state:'Abroad'}}),native:{enabled:()=>true,prepareRun(run){run.capacityLedger??={valid:true,total:2,initialOccupied:1,freed:0,purchased:0};},inspect:()=>({}),cancel(){},forget(){},execute:async()=>({})}});
const watch={key:'id:206',name:'Xanax',category:'Foreign',minQty:1};let engine;engine=createTravelEnhancements({window,document,getItems:()=>[watch],getContext:async()=>state,getSnapshot:()=>({...state,...adapter.inspect(engine?.getState())}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter});
window.fixture={engine,pilot};engine.start();document.querySelector('#arm').onclick=async()=>{await engine.arm({watchKey:watch.key,hospital:true,medical:{id:732,name:'Blood Bag : A+'}});engine.stock(watch,state);document.querySelector('#status').textContent='Armed; inventory verified';};
'''
html='<!doctype html><meta charset="utf-8"><style>body{background:#17232a;color:white;font:16px system-ui;padding:20px}button{padding:12px;background:#d6b65c;border:0;border-radius:6px;margin:8px}</style><h2>DEV armed healing fixture</h2><div id="travel-root"><p>Hospitalized · A+ bag carried</p></div><button id="arm">Arm Snatch and Run</button><p id="status"></p><script>'+script+'</script>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height in [('desktop',1280,900),('portrait',390,844),('landscape',844,390)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body=html));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel');page.bring_to_front();page.locator('#arm').click();page.wait_for_function("document.querySelector('#status').textContent.startsWith('Armed')");assert page.evaluate('calls')==['inventory'];page.locator('#tu-snatch-run').click(timeout=3000);page.wait_for_function("fixture.engine.getState().stage==='buy'",timeout=5000);assert page.evaluate('calls')==['inventory','useItem','inventory'];assert page.evaluate('fixture.pilot.hasPendingAttempt()')==False;assert 'Purchase Max' in page.locator('#tu-snatch-run').inner_text();out=base.parent/'development/evidence/armed-healing-102';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'.png')));context.close()
  print('Generated DEV Chromium arming/healing passed: one GET at arm, heal POST then removal GET, no pre-heal GET, immediate buy readiness, no pending lock; desktop/portrait/landscape screenshots; all gameplay mocked.')
 finally:browser.close()
