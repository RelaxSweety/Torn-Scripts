"""Trusted Chromium purchase tests. Every shop, inventory and response is synthetic."""
import json,pathlib
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1]
code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
def factory(name):
 start=code.index('const '+name+'=')+len('const '+name+'=');end=code.index('\n};',start)+2
 return 'const '+name+'='+code[start:end]+';'
script='\n'.join(factory(n) for n in ['createTravelRequestCapture','createDirectQuickItems','createSnatchDirectItems','createNativeTravelActions','createTravelEnhancements'])
script+=r'''
document.cookie='rfc_v=fixture; path=/';const uncertain=location.search.includes('uncertain'),posts=[],native=[],slots=Array.from({length:18},(_,i)=>({ID:String(100+i),item:null}));
const state={ownerId:'42',country:'mex',status:'Abroad',hospitalized:false,quantity:1000,stockVisible:true,traveling:false,returning:false};
const pilot=createDirectQuickItems({window,document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{const u=new URL(url);if(u.searchParams.get('step')==='buy'){if(options.method!=='GET'||options.cache!=='no-store'||options.redirect!=='error')throw Error('Wrong contract');const requested=Number(u.searchParams.get('amount'));posts.push(requested);const actual=Math.min(requested,3);if(!uncertain){let left=actual;for(const slot of slots)if(!slot.item&&left-->0)slot.item={ID:'260',name:'Dahlia'};}state.quantity-=actual;return new Response(JSON.stringify({success:true,amount:actual,total:actual*300,item:'Dahlia',message:'Bought selected items'}));}return new Response(JSON.stringify({maxBaseSlots:18,maxSpecialSlots:0,slots}));}});
const adapter=createSnatchDirectItems({window,getPilot:()=>pilot,getProfile:()=>{throw Error('No profile for purchase')},native:{...createNativeTravelActions({window,document,enabled:()=>true}),execute:async kind=>{native.push(kind);if(kind==='buy')throw Error('Native purchase forbidden');return {returnBooked:true}}}});
const watch={key:'id:260',name:'Dahlia',category:'Foreign',minQty:1,maxPrice:300};
const engine=createTravelEnhancements({window,document,getItems:()=>[watch],getContext:async()=>({...state}),getSnapshot:()=>({...state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter});
window.fixture={posts,native,slots,engine,pilot,async ready(){engine.start();await engine.arm({watchKey:watch.key});engine.stock(watch,state);}};
'''
shop=json.loads((base/'tests/fixtures/pda-travel.json').read_text())['shopItem']
html='<!doctype html><meta charset="utf-8"><title>Synthetic direct purchase workflow</title><span id="user-money">$100,000</span><div id="travel-root"><ul>'+shop+'</ul></div><script>'+script+'</script>'
# Match the fixture price to the approved quote.
html=html.replace('<script>'+script, '<script>document.querySelector("[class*=tabletColD]").textContent="$300";'+script)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height,uncertain in [('desktop',1280,900,False),('portrait',390,844,False),('landscape',844,390,False),('uncertain',1280,900,True)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html; charset=utf-8',body=html));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel'+('&uncertain=1' if uncertain else ''));page.bring_to_front();page.evaluate('fixture.ready()');button=page.locator('#tu-snatch-run')
   button.evaluate('e=>e.click()');page.wait_for_timeout(30);assert page.evaluate('fixture.posts.length')==0
   button.click();page.wait_for_function('fixture.posts.length===1');page.wait_for_timeout(100)
   if uncertain:
    assert page.evaluate('fixture.pilot.hasPendingAttempt()');button.evaluate('e=>e.click()');page.wait_for_timeout(30);assert page.evaluate('fixture.posts.length')==1;assert page.evaluate('fixture.native.length')==0
   else:
    assert 'remainder 1/5' in button.inner_text();out=base.parent/'development'/'evidence'/'direct-purchase-93';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'.png')))
    for count in range(2,7):button.click();page.wait_for_function('(n)=>fixture.posts.length===n',arg=count);page.wait_for_timeout(40)
    page.wait_for_function("fixture.engine.getState().stage==='return'");assert page.evaluate('fixture.posts')==[18,15,12,9,6,3];assert page.evaluate('fixture.slots.filter(s=>s.item?.ID==="260").length')==18;assert page.evaluate('fixture.native.length')==0
    button.click();page.wait_for_function('fixture.native.length===1');assert page.evaluate('fixture.native')==['return']
   context.close()
  print('Chromium direct purchase passed: desktop/portrait/landscape, real trusted clicks, initial plus five verified partial fills, exact remainder quantities, synthetic rejection, separate return and uncertain-outcome lock; all traffic mocked')
 finally:browser.close()
