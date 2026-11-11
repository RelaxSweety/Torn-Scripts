"""Exercise trusted browser gestures against generated native healing code.
All Torn controls and results are synthetic; no network/game action is sent.
"""
import http.server,pathlib,threading
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1]
code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
def factory(name):
 start=code.index('const '+name+'=')+len('const '+name+'=');end=code.index('\n};',start)+2
 return 'const '+name+'='+code[start:end]+';'
script='\n'.join(factory(n) for n in ['createNativeTravelActions','createSteppedNativeActions','createSnatchDirectItems'])
script+=r'''
let hospitalized=true,quantity=2500;const clicks=[];
const slot=document.querySelector('li'),opener=slot.querySelector('button');
opener.onclick=()=>{clicks.push('open');opener.setAttribute('aria-expanded','true');const use=document.createElement('button');use.textContent='Use';slot.append(use);use.onclick=()=>{clicks.push('use');use.remove();const q=document.createElement('div');q.className='confirmQuestion_fixture';q.innerHTML='Would you like to use the <strong>Morphine</strong>?<button>Yes</button><button>No</button>';slot.append(q);q.querySelector('button').onclick=()=>{clicks.push('yes');hospitalized=false;slot.replaceChildren();const p=document.createElement('p');p.textContent='You are out of the hospital!';slot.append(p);};};};
const run={ownerId:'fixture',intentId:'fixture',watchKey:'id:206',minimumQty:1,expiresAt:Date.now()+3600000,medicals:[{id:66,name:'Morphine'}]};
const native=createNativeTravelActions({window,document,enabled:()=>true});
const adapter=createSnatchDirectItems({window,native:createSteppedNativeActions({native}),getPilot:()=>({report:()=>({unconfirmedAttempt:false}),cancel(){},useRunItem(){throw Error('Unexpected direct item request')}}),getProfile(){throw Error('Unexpected profile request')}});
const action=document.querySelector('#action'),status=document.querySelector('#status');
action.onclick=async event=>{action.disabled=true;try{const r=await adapter.execute('heal',{event,run,guard:()=>true,getSnapshot:()=>({hospitalized,quantity,hospitalUntil:Date.now()+3600000,traveling:false}),onEvent(){}});action.textContent=r.nextLabel||'Healing confirmed';status.textContent=r.hospitalReleased?'Released':r.nextLabel;}catch(e){status.textContent=e.message;}finally{action.disabled=false;}};
window.fixture={clicks,dropStock(){quantity=0}};
'''
html='<!doctype html><meta charset="utf-8"><title>Synthetic healing fixture</title><body><h1>Synthetic healing fixture</h1><div id="travel-root"><ul class="inventoryPanel_fixture" aria-label="Inventory 1 items"><li class="inventorySlot_fixture"><button aria-label="Morphine slot 1" aria-expanded="false">Morphine</button></li></ul></div><button id="action">Heal from Hospital</button><p id="status"></p><script>'+script+'</script>'
class Handler(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(html.encode())
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for drop in [False,True]:
   page=browser.new_page();page.goto('http://127.0.0.1:'+str(server.server_port));page.bring_to_front()
   page.locator('#action').click();page.get_by_role('button',name='Use selected healing item',exact=True).wait_for();assert page.evaluate('fixture.clicks')==['open']
   page.locator('#action').click();page.get_by_role('button',name='Confirm healing item',exact=True).wait_for();assert page.evaluate('fixture.clicks')==['open','use']
   if drop:page.evaluate('fixture.dropStock()')
   page.locator('#action').click();page.wait_for_timeout(100)
   assert page.evaluate('fixture.clicks')==(['open','use'] if drop else ['open','use','yes'])
   assert ('state no longer permits' in page.locator('#status').inner_text()) if drop else page.locator('#status').inner_text()=='Released'
   page.close()
  print('Chromium trusted healing passed: separate selection/Use/confirmation gestures, confirmed release and changed-stock rejection; no live gameplay requests')
 finally:browser.close();server.shutdown()
