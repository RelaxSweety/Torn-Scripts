"""Synthetic return-flight lifecycle screenshots; no gameplay requests."""
import pathlib
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1];code=(base/'dist/tu-integrated-staging-dev.user.js').read_text();marker='const createTravelEnhancements=';start=code.index(marker)+len(marker);factory=code[start:code.index('\n};',start)+2]
script='const createTravelEnhancements='+factory+r''';
const state={ownerId:'42',country:'mex',traveling:false,returning:false,hospitalized:false,quantity:100};let canceled=0;
const engine=createTravelEnhancements({window,document,getItems:()=>[{key:'id:260',name:'Dahlia',category:'Foreign'}],getSnapshot:()=>({...state}),getRows:()=>[],matchRow:()=>false,filterEnabled:()=>false,screenAlertEnabled:()=>true,restoreRun:{ownerId:'42',country:'mex',stage:'return',purchaseConfirmed:true,watchKey:'id:260',stepLabel:'Continue to return flight'},executeAction:{cancel(){canceled++;},hasPendingStep:()=>true}});
engine.start();window.fixture={engine,get canceled(){return canceled},depart(){state.traveling=true;state.returning=true;engine.check();document.getElementById('status').textContent='Returning to Torn — Snatch controls cleared';}};
'''
html='<!doctype html><meta charset="utf-8"><title>Synthetic return-flight cleanup</title><style>body{background:#182229;color:white;font:18px system-ui;padding:20px}</style><h1>Return-flight fixture</h1><p id="status">Foreign shop: return action armed</p><script>'+script+'</script>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height in [('desktop',1280,900),('portrait',390,844),('landscape',844,390)]:
   context=browser.new_context(viewport={'width':width,'height':height});context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body=html));page=context.new_page();page.goto('https://www.torn.com/page.php?sid=travel');assert page.locator('#tu-snatch-screen-alert').count()==1;assert page.locator('#tu-snatch-run').is_visible();page.evaluate('fixture.depart()');assert page.locator('#tu-snatch-screen-alert').count()==0;assert page.locator('#tu-snatch-run').is_hidden();assert page.evaluate('fixture.engine.getState().stage')=='complete';assert page.evaluate('fixture.canceled')==1
   out=base.parent/'development/evidence/return-cleanup-94';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'.png')));context.close()
  print('Chromium return cleanup passed: generated engine clears border/button and cancels pending action on confirmed return flight across desktop/portrait/landscape; all traffic synthetic')
 finally:browser.close()
