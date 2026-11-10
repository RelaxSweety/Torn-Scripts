"""Real Chromium previews with mocked network data; no Torn account actions.
Run after npm run build:compact-preview. Requires Python Playwright + Chromium.
"""
import argparse,functools,http.server,json,pathlib,shutil,tempfile,threading
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(base.parent/'development/previews/compact-ui'));args=parser.parse_args()
out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
tmp=tempfile.TemporaryDirectory(prefix='tu-compact-preview-');root=pathlib.Path(tmp.name)
shutil.copyfile(base.parent/'releases/dev/torn-utilities-0.5.42.87-dev.user.js',root/'before.js')
shutil.copyfile('/tmp/tu-compact-preview.user.js',root/'after.js')
html=(base/'tests/fixtures/compact-preview.html').read_text()
for variant in ['before','after']:(root/(variant+'.html')).write_text(html.replace('/bundle.js','/'+variant+'.js'))
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:'+str(server.server_address[1]);results=[]
metrics='''e=>{const h=e.querySelector('header,.tuim-header,.tuim-travel-header'),r=h.getBoundingClientRect(),s=getComputedStyle(e),hs=getComputedStyle(h),controls=[...h.querySelectorAll('button')].filter(b=>getComputedStyle(b).display!=='none').map(b=>({label:b.getAttribute('aria-label')||b.title||b.textContent.trim(),x:b.getBoundingClientRect().x,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}));return {headerHeight:r.height,panelWidth:e.getBoundingClientRect().width,bodyFont:s.fontSize,headerPadding:hs.padding,headerGap:hs.gap,controls,horizontalOverflow:e.scrollWidth>e.clientWidth+1};}'''
def card(page,name):page.locator('#tu-pda-panel .tu-card').filter(has=page.get_by_text(name,exact=True)).get_by_role('button').click()
def manager(page):
 page.evaluate('window.TornUtilities.closeActiveModule()')
 page.locator('#tu-pda-panel [data-tab=modules]').click()
def open_business(page):
 page.locator('#tu-pda-panel [data-tab=modules]').click();card(page,'Business Tools')
def snap(page,variant,layout,name):page.screenshot(path=str(out/(variant+'-'+layout+'-'+name+'.png')))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking'])
 try:
  for layout,width,height,touch in [('desktop',1280,900,False),('portrait',390,844,True),('landscape',844,390,True),('narrow',320,740,True)]:
   for variant in ['before','after']:
    context=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch,device_scale_factor=1)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url+'/'+variant+'.html',wait_until='domcontentloaded');page.wait_for_timeout(250)
    if not page.locator('#tu-pda-panel').is_visible():page.locator('#tu-pda-launcher').click()
    open_business(page);row={'layout':layout,'variant':variant,'viewport':[width,height],'manager':page.locator('#tu-pda-panel').evaluate(metrics)}
    if variant=='after':
     assert not row['manager']['horizontalOverflow'],row
     identity=page.locator('.tu-player-identity').inner_text();assert identity=='RelaxSweety [4539436] · Chaos Cartel [51855]',identity
     controls=row['manager']['controls'];assert len(controls)==3 and controls[0]['x']<controls[1]['x']<controls[2]['x'],'Back, Minimize, Exit ordered right'
     if touch:assert all(c['width']>=44 and c['height']>=44 for c in controls),controls
     page.get_by_role('button',name='Minimize',exact=True).click();assert not page.locator('#tu-pda-panel').is_visible();page.locator('#tu-pda-launcher').click();assert page.locator('#tu-pda-panel').is_visible()
     page.get_by_role('button',name='Exit',exact=True).click();assert not page.locator('#tu-pda-panel').is_visible();page.locator('#tu-pda-launcher').click();assert page.locator('#tu-pda-panel').is_visible();open_business(page)
    snap(page,variant,layout,'manager');card(page,'Travel Assistant and Item Monitor');page.wait_for_selector('#tuim-menu',state='visible');row['moduleMenu']=page.locator('#tuim-menu').evaluate(metrics);snap(page,variant,layout,'tool-menu')
    page.get_by_role('button',name='Open Travel Assistant',exact=True).click();page.wait_for_selector('#tuim-travel-window',state='visible');row['travelAssistant']=page.locator('#tuim-travel-window').evaluate(metrics);snap(page,variant,layout,'travel-assistant')
    page.evaluate('window.TUWindowNavigation.back("tuim-travel-window")');page.get_by_role('button',name='Open Item Monitor',exact=True).click();page.wait_for_selector('#tuim-panel',state='visible');row['itemMonitor']=page.locator('#tuim-panel').evaluate(metrics);snap(page,variant,layout,'item-monitor')
    if variant=='after':
     for key in ['moduleMenu','travelAssistant','itemMonitor']:assert not row[key]['horizontalOverflow'],(key,row[key])
     assert page.locator('#tuim-panel').evaluate('e=>{e.scrollTop=e.scrollHeight;return e.scrollTop>0;}'),'Monitor scrolls'
     page.locator('#tuim-panel').evaluate('e=>e.scrollTop=0');page.evaluate('window.TUWindowNavigation.minimize("tuim-panel")');page.locator('#tu-pda-launcher').click();assert page.locator('#tuim-panel').is_visible()
     page.evaluate('window.TornUtilities.closeActiveModule()');assert page.locator('#tu-pda-panel').is_visible()
     if layout=='desktop':
      # Use the actual header drag and Chromium's native CSS resize grip.
      panel=page.locator('#tu-pda-panel');r=panel.bounding_box();page.mouse.move(r['x']+20,r['y']+15);page.mouse.down();page.mouse.move(r['x']+45,r['y']+40,steps=8);page.mouse.up();page.wait_for_timeout(100);moved=panel.bounding_box();assert moved['y']>r['y']+10,'Header drag'
      page.mouse.move(moved['x']+moved['width']-3,moved['y']+moved['height']-3);page.mouse.down();page.mouse.move(moved['x']+moved['width']-83,moved['y']+moved['height']+35,steps=10);page.mouse.up();page.wait_for_timeout(150);resized=panel.bounding_box();assert resized['width']<moved['width']-20,'Native window resize'
      saved=page.evaluate('JSON.parse(localStorage.getItem("tu:window-layout:v1:tu-pda-panel"))');assert abs(saved['width']-resized['width'])<2,'Saved dimensions'
      page.reload();page.wait_for_timeout(250)
      if not panel.is_visible():page.locator('#tu-pda-launcher').click()
      assert abs(panel.bounding_box()['width']-saved['width'])<2,'Size restored after reload';assert abs(panel.bounding_box()['y']-saved['top'])<2,'Position restored after reload';row['dragResizePersistence']=True
      open_business(page);card(page,'Travel Assistant and Item Monitor');page.wait_for_timeout(100)
      if page.locator('#tuim-menu').is_visible():page.get_by_role('button',name='Open Item Monitor',exact=True).click()
      page.wait_for_selector('#tuim-panel',state='visible')
      module=page.locator('#tuim-panel');mr=module.bounding_box();page.mouse.move(mr['x']+12,mr['y']+12);page.mouse.down();page.mouse.move(mr['x']+32,mr['y']+32,steps=6);page.mouse.up();page.wait_for_timeout(100)
      saved_module=page.evaluate('JSON.parse(localStorage.getItem("tu:window-layout:v1:tuim-panel"))');assert saved_module is not None,'Module layout saved independently';assert page.evaluate('JSON.parse(localStorage.getItem("tu:window-layout:v1:tu-pda-panel")).width')==saved['width'],'Module drag leaves Manager layout intact';row['independentModulePosition']=True
    if layout=='desktop':
     tools=[('Chat Archiver',['Chat Tools']),('War Organizer',['War Tools']),('Flight Game',['Games','Single Player']),('Stick Fighter',['Games','Single Player']),('Slithering Streets',['Games','Single Player']),('Tic-Tac-Toe',['Games','Multiplayer']),('Torn Four',['Games','Multiplayer']),('Torn Fleet',['Games','Multiplayer']),('Chaos Marbles',['Games','Multiplayer'])]
     row['otherTools']=[]
     for name,path in tools:
      manager(page)
      for category in path:card(page,category)
      card(page,name);page.wait_for_timeout(150);assert page.evaluate('window.TornUtilities.isActive('+json.dumps({'Chat Archiver':'chat-archiver','War Organizer':'war-hit-organizer','Flight Game':'flight-game','Stick Fighter':'stick-fighter','Slithering Streets':'torn-snake','Tic-Tac-Toe':'tic-tac-toe','Torn Four':'torn-four','Torn Fleet':'torn-fleet','Chaos Marbles':'chaos-marbles'}[name])+')'),name
      snap(page,variant,layout,name.lower().replace(' ','-'));row['otherTools'].append({'name':name,'headerHeight':page.evaluate('''()=>{const el=[...document.querySelectorAll('#tu-who-panel header,#tca-header,#tpfg-stick-fighter>div>div:has(>#sff-min),#tpfg-title,#tu-pda-module-host>:is(section,div)>div:has(>strong):has(>button[title^=Minimize])')].find(e=>e.getBoundingClientRect().height>0);return el?.getBoundingClientRect().height??null;}''')})
    assert not errors,errors;row['pageErrors']=errors;results.append(row);context.close()
 finally:browser.close();server.shutdown();server.server_close();tmp.cleanup()
(out/'metrics.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps([{'variant':r['variant'],'layout':r['layout'],'managerHeader':r['manager']['headerHeight'],'moduleHeader':r['moduleMenu']['headerHeight'],'pageErrors':r['pageErrors']} for r in results],indent=2))
