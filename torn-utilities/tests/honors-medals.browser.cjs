// Run with: node torn-utilities/tests/honors-medals.browser.cjs
// Requires Playwright and Chromium. All Torn requests are fixtures; no real key is used.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'modules.json'),'utf8'));
const a=(id,name,description,type=2)=>({id,name,description,type:{id:type,title:type===1?'default':'attacking'}});
const catalogs={honors:[a(1,'Bar Breaker','Bust 1,000 players out of jail'),a(2,'Default','',1)],medals:[a(1,'Anti Social','Win 50 attacks'),a(2,'Happy Slapper','Win 250 attacks'),a(3,'Frequent Flyer','Travel abroad 25 times'),a(4,'<img src=x onerror=alert(1)>','Unsupported requirement')]};
const stats={attacking:{attacks:{won:240}},travel:{total:24},jail:{busts:{success:950}}};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const mode of ['cross-platform-gm','cross-platform-fetch','pda-native','pda-fetch']){
   const platform=mode.startsWith('pda')?'pda':'cross-platform';
   const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   let failHonors=true,failMedals=false,delay=0,calls=[];
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='www.torn.com')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'});
    if(url.hostname==='raw.githubusercontent.com')return route.fulfill({json:catalog});
    if(url.hostname!=='api.torn.com')return route.abort();
    calls.push({path:url.pathname,authorization:route.request().headers().authorization,key:url.searchParams.get('key')});
    if(delay)await new Promise(r=>setTimeout(r,delay));
    let data;
    if(url.pathname==='/v2/key/info')data={info:{access:{type:'Public Only'},user:{id:123,faction_id:0}}};
    else if(url.pathname==='/user/'||url.pathname==='/user/123')data={player_id:123,name:'TestPlayer'};
    else if(url.pathname==='/v2/torn/honors')data={honors:catalogs.honors};
    else if(url.pathname==='/v2/torn/medals')data={medals:catalogs.medals};
    else if(url.pathname==='/v2/user/honors')data=failHonors?{error:{code:16,error:'Access level too low'}}:{honors:[{id:1,timestamp:1700000000}]};
    else if(url.pathname==='/v2/user/medals')data=failMedals?{}:{medals:[{id:1,timestamp:1700000000}]};
    else if(url.pathname==='/v2/user/personalstats')data={personalstats:stats};
    else data={members:[]};
    await route.fulfill({json:data});
   });
   await page.goto('https://www.torn.com/');
   await page.evaluate(()=>{
    localStorage.setItem('tu:agreement:accepted','2026-10-20');
    localStorage.setItem('tu:identity:public-only-key:v1','TESTKEY000000000');
    localStorage.setItem('tu:public-api-key:v1','TESTKEY000000000');
    localStorage.setItem('tu:agreement:verified-key:v1','TESTKEY000000000');
    // Simulate PDA's native wrapper and Tampermonkey's privileged transport.
    window.PDA_httpGet=async url=>({data:await (await fetch(url)).text()});
    window.GM_xmlhttpRequest=opts=>fetch(opts.url,{headers:opts.headers}).then(async r=>opts.onload({status:r.status,responseText:await r.text()})).catch(opts.onerror);
    window.unsafeWindow=window;
   });
   if(mode.endsWith('fetch'))await page.evaluate(()=>{delete window.GM_xmlhttpRequest;delete window.PDA_httpGet;});
   // Test module-before-manager load order too.
   await page.addScriptTag({path:path.join(root,'modules/honors-medals.user.js')});
   await page.addScriptTag({path:process.env.MANAGER_DIR?path.join(process.env.MANAGER_DIR,`tu-manager-${platform}-DEV.user.js`):path.join(root,`core/${platform}/torn-utilities.user.js`)});
   await page.waitForFunction(()=>window.TornUtilities?.getPlayer()?.id==='123');
   assert.equal(await page.evaluate(()=>TornUtilities.isRegistered('honors-medals')),true);
   assert.equal(calls.some(c=>c.path==='/v2/torn/honors'),false,'registration must stay inert');
   await page.locator('#tu-pda-launcher').click();
   await page.locator('.tu-card').filter({has:page.getByText('Other Tools',{exact:true})}).getByRole('button').click();
   await page.getByText('Honors & Medals',{exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#tuhm-panel [role=status]')?.textContent.includes('Honor ownership unavailable'));
   assert.equal(await page.locator('#tuhm-panel tbody tr').count(),6);
   assert.match(await page.locator('#tuhm-panel').innerText(),/1 earned · 3 unearned · 1 unknown/);
   assert.equal(await page.locator('#tuhm-panel img').count(),0,'catalog text is never interpreted as markup');
   const recs=await page.locator('.tuhm-recs ol').innerText();assert.match(recs,/Happy Slapper/);assert.doesNotMatch(recs,/Anti Social|Bar Breaker/);
   if(process.env.ARTIFACT_DIR){fs.mkdirSync(process.env.ARTIFACT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ARTIFACT_DIR,mode+'-desktop.png')});}
   await page.locator('[data-filter=status]').selectOption('unearned');assert.equal(await page.locator('#tuhm-panel tbody tr').count(),3);
   await page.getByRole('button',{name:'Progress',exact:true}).click();assert.match(await page.locator('#tuhm-panel tbody tr').first().innerText(),/Happy Slapper|Frequent Flyer/);
   await page.getByLabel('Search',{exact:true}).fill('Happy');assert.equal(await page.locator('#tuhm-panel tbody tr').count(),1);
   await page.getByLabel('Search',{exact:true}).fill('');
   // Manager-owned drag and native resize behavior.
   const panel=page.locator('#tuhm-panel'),before=await panel.boundingBox();
   await page.mouse.move(before.x+70,before.y+20);await page.mouse.down();await page.mouse.move(before.x+110,before.y+60);await page.mouse.up();
   const moved=await panel.boundingBox();assert.ok(moved.x>before.x&&moved.y>before.y);
   assert.equal(await panel.evaluate(n=>getComputedStyle(n).resize),'both');
   const oldWidth=(await panel.boundingBox()).width;
   await panel.getByRole('button',{name:'↘ Resize',exact:true}).focus();await page.keyboard.press('ArrowLeft');
   assert.ok((await panel.boundingBox()).width<oldWidth);
   await panel.getByRole('button',{name:'Minimize',exact:true}).click();assert.equal(await panel.isVisible(),false);
   await page.locator('#tu-pda-launcher').click();assert.equal(await panel.isVisible(),true);
   await panel.getByRole('button',{name:'Back',exact:true}).click();assert.equal(await page.locator('#tu-pda-panel').isVisible(),true);
   await page.evaluate(()=>TUWindowNavigation.open('tuhm-panel'));
   await page.setViewportSize({width:360,height:640});
   assert.ok((await panel.boundingBox()).width<=348);
   if(process.env.ARTIFACT_DIR)await page.screenshot({path:path.join(process.env.ARTIFACT_DIR,mode+'-mobile.png')});
   await panel.getByRole('button',{name:'Exit',exact:true}).click();assert.equal(await panel.count(),0);
   assert.equal(await page.evaluate(()=>TornUtilities.isActive('honors-medals')),false);
   // Successful ownership and malformed ownership must be independent.
   failHonors=false;failMedals=true;
   await page.locator('#tu-pda-launcher').click();
   await page.getByText('Honors & Medals',{exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#tuhm-panel [role=status]')?.textContent.includes('Medal ownership unavailable'));
   await panel.locator('[data-filter=status]').selectOption('all');
   assert.match(await panel.innerText(),/1 earned · 0 unearned · 4 unknown/);
   await panel.getByRole('button',{name:'Exit',exact:true}).click();
   // Deactivation during an in-flight request must not recreate a panel or write results.
   delay=100;
   await page.locator('#tu-pda-launcher').click();await page.getByText('Honors & Medals',{exact:true}).click();
   await panel.getByRole('button',{name:'Exit',exact:true}).click();await page.waitForTimeout(300);
   assert.equal(await panel.count(),0);
   await assert.rejects(page.evaluate(()=>TornUtilities.requestTorn('/v2/user/money')));
   if(platform==='cross-platform')await page.evaluate(()=>TornUtilities.requestTorn('/v2/faction/1/members'));
   assert.ok(calls.filter(c=>c.path.startsWith('/v2/torn/')).every(c=>platform==='pda'?c.key==='TESTKEY000000000':c.authorization==='ApiKey TESTKEY000000000'));
   assert.deepEqual(errors,[]);
   console.log(mode+': registration, shared auth, partial failures, filters, sort, safe text, navigation, drag, keyboard resize, mobile sizing and in-flight cleanup passed');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
