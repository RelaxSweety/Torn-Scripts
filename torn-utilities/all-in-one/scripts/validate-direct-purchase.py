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
document.cookie='rfc_v=fixture; path=/';const uncertain=location.search.includes('uncertain'),partial=location.search.includes('partial'),exhausted=location.search.includes('exhausted'),posts=JSON.parse(sessionStorage.getItem('fixture:posts')||'[]'),native=[],slots=JSON.parse(sessionStorage.getItem('fixture:slots')||'null')||Array.from({length:18},(_,i)=>({ID:String(100+i),item:null}));const boots=Number(sessionStorage.getItem('fixture:boots')||0)+1;sessionStorage.setItem('fixture:boots',String(boots));const savedRun=JSON.parse(sessionStorage.getItem('fixture:run')||'null');document.getElementById('synced').textContent=slots.filter(s=>s.item).length+' items displayed';const inventoryPanel=document.getElementById('native-inventory');for(const number of [1,7,13,2,8,14,3,9,15,4,10,16,5,11,17,6,12,18]){const cell=document.createElement('li');cell.className='inventorySlot_fixture';cell.dataset.number=number;const item=slots[number-1].item;if(item){const button=document.createElement('button');button.setAttribute('aria-label',item.name+' slot '+number);button.textContent=item.name;cell.append(button);}else{const label=document.createElement('span');label.className='srOnly_fixture';label.textContent='slot '+number+' empty';cell.append(label);}inventoryPanel.append(cell);}
const state={ownerId:'42',country:'mex',status:'Abroad',hospitalized:false,quantity:1000,stockVisible:true,traveling:false,returning:false};
const pilot=createDirectQuickItems({window,document,isAuthorized:()=>true,fetchImpl:async(url,options)=>{const u=new URL(url);if(u.searchParams.get('step')==='buy'){if(options.method!=='GET'||options.cache!=='no-store'||options.redirect!=='error')throw Error('Wrong contract');const requested=Number(u.searchParams.get('amount'));posts.push(requested);const actual=Math.min(requested,partial?16:exhausted?1:3);if(!uncertain){let left=actual;for(const slot of slots)if(!slot.item&&left-->0)slot.item={ID:'260',name:'Dahlia'};}state.quantity-=actual;sessionStorage.setItem('fixture:slots',JSON.stringify(slots));sessionStorage.setItem('fixture:posts',JSON.stringify(posts));return new Response(JSON.stringify({success:true,amount:actual,total:actual*300,item:'Dahlia',message:'Bought selected items'}));}return new Response(JSON.stringify({maxBaseSlots:18,maxSpecialSlots:0,slots}));}});
const adapter=createSnatchDirectItems({window,getPilot:()=>pilot,getProfile:()=>{throw Error('No profile for purchase')},native:{...createNativeTravelActions({window,document,enabled:()=>true}),execute:async kind=>{native.push(kind);if(kind==='buy')throw Error('Native purchase forbidden');return {returnBooked:true}}}});
const watch={key:'id:260',name:'Dahlia',category:'Foreign',minQty:1,maxPrice:300};
let engine;engine=createTravelEnhancements({window,document,getItems:()=>[watch],getContext:async()=>({...state}),getSnapshot:()=>{adapter.inspect(engine?.getState());return {...state};},getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,executeAction:adapter,restoreRun:savedRun,storeRun:run=>sessionStorage.setItem('fixture:run',JSON.stringify(run))});
window.fixture={posts,native,slots,engine,pilot,boots,async ready(){engine.start();await engine.arm({watchKey:watch.key});engine.stock(watch,state);}};if(savedRun)engine.start();
'''
shop=json.loads((base/'tests/fixtures/pda-travel.json').read_text())['shopItem']
html='<!doctype html><meta charset="utf-8"><title>Synthetic direct purchase workflow</title><span id="user-money">$100,000</span><p id="synced"></p><style>#native-inventory{display:grid;grid-template-columns:repeat(6,minmax(30px,1fr));gap:4px;padding:8px;list-style:none;max-width:480px;background:#24313b}#native-inventory li{height:38px;min-width:0;border:1px solid #65717b;border-radius:4px;color:white;background:#17232a}#native-inventory button{font-size:9px;max-width:100%;overflow:hidden}.srOnly_fixture{font-size:0}</style><div id="travel-root"><ul id="native-inventory" class="inventoryPanel_fixture"></ul><ul>'+shop+'</ul></div><script>'+script+'</script>'
# Match the fixture price to the approved quote.
html=html.replace('<script>'+script, '<script>document.querySelector("[class*=tabletColD]").textContent="$300";document.getElementById("user-money").textContent=location.search.includes("partial")?"$4,800":"$100,000";'+script)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height,uncertain in [('desktop',1280,900,False),('portrait',390,844,False),('landscape',844,390,False),('uncertain',1280,900,True),('partial',390,844,False),('exhausted',390,844,False)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html; charset=utf-8',body=html));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel'+('&uncertain=1' if uncertain else '&partial=1' if label=='partial' else '&exhausted=1' if label=='exhausted' else ''));page.bring_to_front();page.evaluate('fixture.ready()');button=page.locator('#tu-snatch-run')
   button.evaluate('e=>e.click()');page.wait_for_timeout(30);assert page.evaluate('fixture.posts.length')==0
   button.click();page.wait_for_function('fixture.posts.length===1');page.wait_for_timeout(100)
   if uncertain:
    assert page.locator('#tu-purchase-confirmation').count()==0;assert page.locator('[data-tu-purchase-slot]').count()==0
    assert page.evaluate('fixture.pilot.hasPendingAttempt()');button.evaluate('e=>e.click()');page.wait_for_timeout(30);assert page.evaluate('fixture.posts.length')==1;assert page.evaluate('fixture.native.length')==0
   elif label=='partial':
    notice=page.locator('#tu-purchase-confirmation');assert notice.inner_text()=='16/18 Dahlia Purchased';assert page.locator('[data-tu-purchase-slot=filled]').count()==16;assert page.locator('[data-tu-purchase-slot=unfilled]').count()==0
    dialog=page.locator('#tu-snatch-departure-choice');dialog.wait_for();assert page.evaluate('fixture.posts')==[16];out=base.parent/'development/evidence/purchase-no-refresh-98';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/'partial.png'))
    dialog.get_by_role('button',name='Depart now',exact=True).click();page.wait_for_function('fixture.native.length===1');assert page.evaluate('fixture.native')==['return'];page.wait_for_timeout(3500);assert page.evaluate('fixture.boots')==1
   else:
    assert 'remainder 1/5' in button.inner_text();notice=page.locator('#tu-purchase-confirmation');assert notice.inner_text()==('1/18 Dahlia Purchased' if label=='exhausted' else '3/18 Dahlia Purchased');assert page.locator('[data-tu-purchase-slot=filled]').count()==(1 if label=='exhausted' else 3);assert page.locator('[data-tu-purchase-slot=unfilled]').count()==(17 if label=='exhausted' else 15);out=base.parent/'development/evidence/purchase-no-refresh-98';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'.png')))
    if label=='desktop':notice.wait_for(state='detached',timeout=4000)
    for count in range(2,7):button.click();page.wait_for_function('(n)=>fixture.posts.length===n',arg=count);page.wait_for_timeout(40)
    page.wait_for_function("fixture.engine.getState().purchaseConfirmed===true");expected=[18,17,16,15,14,13] if label=='exhausted' else [18,15,12,9,6,3];assert page.evaluate('fixture.posts')==expected;assert page.evaluate('fixture.native.length')==0
    if label=='exhausted':
     dialog=page.locator('#tu-snatch-departure-choice');dialog.wait_for();page.screenshot(path=str(out/'exhausted-complete.png'));dialog.get_by_role('button',name='Depart now',exact=True).click()
    else:
     if label=='desktop':page.screenshot(path=str(out/'full.png'))
     button.click()
    page.wait_for_function('fixture.native.length===1');assert page.evaluate('fixture.native')==['return'];page.wait_for_timeout(3500);assert page.evaluate('fixture.boots')==1,'No automatic navigation after purchase or popup expiry';assert page.locator('#tu-purchase-confirmation').count()==0
    if label=='desktop':
     page.reload();page.wait_for_function('fixture.boots===2');assert page.locator('#synced').inner_text()=='18 items displayed';assert page.evaluate('fixture.posts')==expected;assert page.locator('[data-tu-purchase-slot=filled]').count()==18
   context.close()
  print('Chromium direct purchase passed: desktop/portrait/landscape, real trusted clicks, initial plus five verified partial fills, exact remainder quantities, synthetic rejection, per-purchase notifications, no automatic reload, immediate departure choices/return, preserved markers after explicit manual reload, five-remainder limit and uncertain-outcome lock; all traffic mocked')
 finally:browser.close()
