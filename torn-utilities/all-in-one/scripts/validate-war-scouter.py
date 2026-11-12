"""Full-bundle FFScouter UI/consent test; all credentials, rosters and responses synthetic."""
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1];code=(base/'dist/tu-integrated-staging-dev.user.js').read_text()
setup=r'''
window.GM_info={scriptHandler:'Tampermonkey',version:'fixture'};window.alert=()=>{};window.confirm=()=>true;
localStorage.setItem('tu:identity:public-only-key:v1','abcdefghijklmnop');localStorage.setItem('tu:agreement:accepted','fixture-v1');sessionStorage.setItem('tu:dev:auth:session:v1','fixture-token');localStorage.setItem('tu:who:state:v2',JSON.stringify({factionId:'88',factionName:'Opposition'}));window.ffRequests=[];
const until=Math.floor(Date.now()/1000);const members=[['NightFalcon',1,'Okay','Online'],['IronHarbor',2,'Hospital','Offline'],['SilverWren',3,'Traveling','Idle'],['MapleFox',4,'Abroad','Online'],['EmberWolf',5,'Okay','Offline'],['OceanKite',6,'Hospital','Offline']].map(([name,id,state,status])=>({name,id,level:50+id,status:{state,until:until+id*40},last_action:{status}}));
window.GM_xmlhttpRequest=o=>{let data,status=200;const url=new URL(o.url);if(url.hostname==='ffscouter.com'){window.ffRequests.push({method:o.method,headers:o.headers,anonymous:o.anonymous,targetCount:url.searchParams.get('targets').split(',').length});if(o.headers.Authorization)throw Error('TU/Torn headers must not be sent to FFScouter');const ff=[2.254,1.05,3,1.38,null,2.7],bs=[245e6,78.6e6,1.32e9,12.4e6,null,92e6];data=url.searchParams.get('targets').split(',').map(id=>({player_id:Number(id),bs_estimate:bs[Number(id)-1],fair_fight:ff[Number(id)-1],last_updated:until-120}));}
else if(url.pathname.endsWith('/api/auth/agreement'))data={accepted:true,agreement:{agreement_version:'fixture-v1',agreement_number:1,agreement_date:'2026-11-07'}};
else if(url.pathname.includes('/v2/faction/'))data={members:url.pathname.includes('/99/')?members.slice(0,4):members};
else if(url.pathname.includes('/v2/key/info'))data={info:{access:{type:'Public Only'},user:{id:42,faction_id:99}}};
else if(url.pathname.startsWith('/user/'))data={name:'Viewer',faction:{name:'Friendly'}};
else if(url.pathname.startsWith('/faction/'))data={name:'Friendly'};
else data={info:{access:{type:'Public Only'},user:{id:42,faction_id:99}}};queueMicrotask(()=>o.onload?.({status,responseText:JSON.stringify(data)}));};
void 0;
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,width,height in [('desktop',1280,900),('portrait',390,844),('landscape',844,390)]:
   context=browser.new_context(viewport={'width':width,'height':height},is_mobile=label!='desktop',has_touch=label!='desktop');context.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body='<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">'));page=context.new_page();page.goto('https://www.torn.com/index.php');page.evaluate(setup);page.evaluate(code);page.locator('#tu-pda-launcher').click();page.locator('[data-tab="modules"]').click()
   for name in ['War Tools','War Organizer']:page.locator('.tu-card').filter(has=page.get_by_text(name,exact=True)).locator('button').click()
   root=page.locator('#tu-who-panel');page.wait_for_function("document.querySelectorAll('.who-row .who-scouter').length===6");assert page.evaluate('ffRequests.length')==0
   assert page.evaluate("(()=>{try{TornUtilities.setWhoScouterEnabled(true,{isTrusted:true});return false}catch{return true}})()"),'Programmatic consent spoof must be rejected'
   root.get_by_role('button',name='Settings',exact=True).click();root.locator('#tu-who-ff-consent').check();page.wait_for_function('ffRequests.length===1');root.get_by_role('button',name='Targets',exact=True).click();page.wait_for_function("document.querySelector('[data-scouter-id=\"1\"] .who-ff-value')?.textContent==='2.25'")
   assert page.evaluate('ffRequests[0].anonymous')==True;assert page.evaluate('ffRequests[0].targetCount')==6
   totals=root.locator('.who-status-totals');assert totals.nth(0).inner_text().replace('\n',' ');assert totals.nth(0).locator('[data-status-count=okay]').inner_text()=='Okay 1';assert totals.nth(0).locator('[data-status-count=hospital]').inner_text()=='Hosp 1';assert totals.nth(0).locator('[data-status-count=travel]').inner_text()=='Trvl 2';assert totals.nth(1).locator('[data-status-count=okay]').inner_text()=='Okay 2';assert totals.nth(1).locator('[data-status-count=hospital]').inner_text()=='Hosp 2';assert totals.nth(1).locator('[data-status-count=travel]').inner_text()=='Trvl 2'
   assert root.locator('.who-right>button').first.bounding_box()['height']>=44;assert page.evaluate("[...document.querySelectorAll('.who-line')].every(line=>line.scrollWidth<=line.clientWidth+1)")
   root.locator('.who-content').evaluate('(node)=>node.scrollTop=0');out=base.parent/'development/evidence/war-scouter-105';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/(label+'-targets.png')))
   if label=='landscape':
    root.locator('.who-list').evaluate('(node)=>node.scrollIntoView({block:"start"})');page.screenshot(path=str(out/(label+'-rows.png')))
   root.locator('[aria-label="Sort targets"]').select_option('ff-asc');assert root.locator('.who-list .who-line a').all_text_contents()==['IronHarbor','MapleFox','NightFalcon','OceanKite','SilverWren','EmberWolf'];root.get_by_role('button',name='Okay',exact=True).click();assert root.locator('.who-list .who-line a').all_text_contents()==['NightFalcon','EmberWolf'];
   root.locator('.who-ff-filters summary').click();root.locator('.who-ff-fields input').nth(1).fill('2.25');root.get_by_role('button',name='Apply FF filter',exact=True).click();assert root.locator('.who-list .who-line a').all_text_contents()==['NightFalcon'],'Filter must agree with displayed two-decimal FF';page.screenshot(path=str(out/(label+'-filtered.png')))
   root.get_by_role('button',name='Clear FF filter',exact=True).click();root.get_by_role('button',name='All',exact=True).click();root.get_by_role('button',name='Refresh roster',exact=True).click();page.wait_for_timeout(100);assert page.evaluate('ffRequests.length')==1,'Cached refresh must not call FFScouter again';root.get_by_role('button',name='Settings',exact=True).click();root.locator('#tu-who-ff-consent').scroll_into_view_if_needed();page.screenshot(path=str(out/(label+'-consent.png')));root.locator('#tu-who-ff-consent').uncheck();root.get_by_role('button',name='Targets',exact=True).click();assert all(value=='—' for value in root.locator('.who-ff-value').all_text_contents());assert page.evaluate("!JSON.stringify(localStorage).includes('245000000')"),'FF stats must not persist in roster storage';context.close()
  print('Full-bundle FFScouter passed: trusted opt-in, no TU token/cookies, batched scoped fetch/cache, inline layout, 44px reserves, numeric sorting/range+Okay filters, both-faction totals, disable cleanup; desktop/mobile screenshots; all responses synthetic.')
 finally:browser.close()
