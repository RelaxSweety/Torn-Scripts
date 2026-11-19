const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const {chromium} = require('playwright');
const source = fs.readFileSync(require.resolve('./Achievement-Compiler.user.js'), 'utf8');
const harness = source.replace('  // PDA and SPA navigation can replace document.body after userscript injection.',
  '  globalThis.careerTest = {normalizeCareer, readCareerState, mergeCareerState, employmentDossier, markdown, signature}; return;');
const element = () => ({style:{setProperty(){}}, appendChild(){}, setAttribute(){}});
const context = {document:{head:element(),createElement:element}};
vm.runInNewContext(harness, context);
const {normalizeCareer,readCareerState,mergeCareerState,employmentDossier,markdown,signature}=context.careerTest;
const PLAYER=4539436;
const time=day=>new Date(Date.UTC(2026,10,day)).toISOString();
const unix=day=>Date.parse(time(day))/1000;
const army={type:'job',name:'Army',position:'Sergeant'};
const company=(id=131509,name='The sweat shop',position='Packager')=>
  ({type:'company',id,type_id:14,name,position,days_in_company:6});
const progression={
  jobranks:{jobranks:{army:'Sergeant',grocer:'Bagboy',casino:'Dealer',medical:'Medical Student',law:'Law Student',education:'Recess Supervisor'}},
  jobpoints:{jobpoints:{jobs:{army:80,grocer:5,casino:5,medical:5,law:5,education:5},companies:[{company:{id:14,name:'Sweet Shop'},points:12}]}},
  company_types:{companies:[{id:14,name:'Sweet Shop'}]}
};
const normalize=(day,job,prior=readCareerState(null),player=42,extra={})=>
  normalizeCareer({generated_at:time(day),job:{job},...progression,...extra},prior,player);
const event=(id,title,day,data)=>({id,timestamp:unix(day),details:{title},data});

test('reference report has only Army, with player evidence, and no invented service dates',()=>{
  const result=normalize(19,company(),undefined,PLAYER,{unavailable_sources:{logs:'Torn API error 16'}});
  const history=result.career_history;
  assert.equal(history.previous_employment.length,1);
  const [previous]=history.previous_employment;
  assert.equal(previous.employer,'Torn Army');
  assert.equal(previous.highest_recorded_rank,'Sergeant');
  assert.equal(previous.remaining_points,80);
  assert.equal(previous.status,'user_confirmed');
  assert.equal(previous.employment_status,'Former');
  assert.equal(previous.start_date,null);
  assert.equal(previous.end_date,null);
  assert.equal(history.current.employer,'The sweat shop');
  assert.equal(history.current.position,'Packager');
  assert.equal(history.current.company_id,131509);
  assert.equal(history.current.days_in_company,6);
  for (const job of ['grocer','casino','medical','law','education']) {
    const value=result.job_progression.standard_jobs[job];
    assert.equal(value.points,5);
    assert.equal(value.classification,'unverified');
    assert.equal(value.previous_employment,'not_established');
  }
  const data={generated_at:time(19),awards:[],...result};
  for (const content of [markdown(data),signature(data),employmentDossier(data)['Previous employment']]) {
    assert.match(content,/Torn Army/);
    assert.match(content,/Sergeant/);
    assert.match(content,/Service Dates: Unknown/);
    assert.doesNotMatch(content,/Grocer|Casino|Medical Student|Law Student|Recess Supervisor/);
  }
});

test('multiple verified standard jobs and a dated promotion come from explicit log evidence',()=>{
  const logs={pages_fetched:1,log:[
    event('1','Job join',1,{job:'Army',position:'Private'}),
    event('2','Job promote',2,{job:'Army',position:'Sergeant'}),
    event('3','Job quit',3,{job:'Army',position:'Sergeant'}),
    event('4','Job join',4,{job:'Grocer',position:'Bagboy'}),
    event('5','Job quit',7,{job:'Grocer',position:'Bagboy'}),
    event('6','Job interview',8,{job:'Law'})
  ]};
  const result=normalize(19,company(),undefined,42,{logs});
  const history=result.career_history;
  assert.equal(history.previous_employment.map(x=>x.status).join(','),'confirmed,confirmed');
  assert.equal(history.previous_employment.map(x=>x.employer).join(','),'Torn Army,Grocer');
  assert.equal(history.previous_employment[0].start_date,time(1));
  assert.equal(history.previous_employment[0].end_date,time(3));
  assert.equal(history.historical_promotions[0].occurred_at,time(2));
});

test('rank and baseline points alone establish no prior employment',()=>{
  const result=normalize(19,null);
  assert.equal(result.career_history.previous_employment.length,0);
  assert.equal(result.career_history.current_employment_status,'unemployed');
  assert.equal(result.job_progression.standard_jobs.grocer.baseline_status,'possible_baseline_not_verified');
  assert.equal(normalize(19,null,undefined,42,{jobranks:undefined,jobpoints:undefined})
    .job_progression.standard_jobs.grocer.classification,'not_established');
});

test('company and position changes use instance ID and keep observation bounds',()=>{
  const first=normalize(1,company(1,'Same name'));
  const repeat=normalize(2,company(1,'Same name'),first.state);
  assert.equal(repeat.state.observations.length,1);
  const promoted=normalize(3,company(1,'New name','Manager'),repeat.state);
  assert.equal(promoted.career_history.historical_promotions.length,0);
  const moved=normalize(4,company(2,'New name'),promoted.state);
  const [former]=moved.career_history.previous_employment;
  assert.equal(former.company_id,1);
  assert.equal(former.first_observed_at,time(1));
  assert.equal(former.last_observed_at,time(3));
  assert.equal(former.start_date,null);
  assert.equal(former.end_date,null);
  assert.equal(moved.career_history.current.company_id,2);
  assert.equal(moved.career_history.observed_transitions.map(x=>x.type).join(','),'position_change,employer_change');
});

test('leaving and rejoining Army preserves distinct observed stints',()=>{
  const first=normalize(1,army);
  const left=normalize(2,null,first.state);
  const returned=normalize(3,army,left.state);
  const leftAgain=normalize(4,company(),returned.state);
  const previous=leftAgain.career_history.previous_employment;
  assert.equal(previous.length,2);
  assert.equal(previous.map(x=>x.first_observed_at).join(','),[time(1),time(3)].join(','));
  assert.ok(previous.every(x=>x.start_date===null&&x.end_date===null));
});

test('restricted logs and an absent current-job response leave the last observed job unresolved',()=>{
  const first=normalize(1,army);
  const result=normalizeCareer({
    generated_at:time(2), unavailable_sources:{logs:'Torn API error 16',job:'Unavailable'},
    api_diagnostics:{log_probe:'failed'}
  },first.state,42);
  assert.equal(result.career_diagnostics.endpoints.logs.status,'failed');
  assert.equal(result.career_diagnostics.historical_coverage.log_pages,0);
  assert.equal(result.career_history.current_employment_status,'unavailable');
  assert.equal(result.career_history.previous_employment.length,0);
  assert.equal(result.state.observations.length,1);
});

test('v0.9.9 snapshots migrate, deduplicate on restore and keep player-confirmed records',()=>{
  const old=readCareerState({events:[
    {name:'Army',position:'Sergeant',observed_at:time(1)},
    {name:'The sweat shop',position:'Packager',observed_at:time(2)}
  ]});
  const last=normalize(3,company(),old,PLAYER);
  assert.equal(last.state.observations.length,2);
  assert.equal(last.career_history.current.first_observed_at,time(2));
  assert.equal(last.career_history.current.last_observed_at,time(3));
  const restored=readCareerState(JSON.parse(JSON.stringify(last.state)));
  assert.equal(mergeCareerState(last.state,restored).observations.length,2);
  assert.equal(normalize(4,company(),restored,PLAYER).career_history.previous_employment[0].status,'user_confirmed');
});

test('company instance, type, reported tenure and type-level point balances stay distinct',()=>{
  const {career_history,job_progression}=normalize(19,company());
  assert.equal(career_history.current.company_id,131509);
  assert.equal(career_history.current.company_type_id,14);
  assert.equal(career_history.current.company_type,'Sweet Shop');
  assert.equal(career_history.current.days_in_company,6);
  assert.equal(job_progression.company_job_points[0].company_type_id,14);
  assert.equal(job_progression.company_job_points[0].points,12);
  assert.equal(job_progression.company_job_points[0].classification,'unverified');
});

test('faction dates and total time cover separate verified stints and preserve unknown boundaries',()=>{
  const logs={pages_fetched:1,log:[
    event('a','Faction join',1,{faction_id:17,faction_name:'First'}),
    event('b','Faction leave',3,{faction_id:17}),
    event('c','Faction join',4,{faction_id:17}),
    event('d','Faction kicked',7,{faction_id:17}),
    event('e','Faction leave',8,{faction_id:18})
  ]};
  const data={faction:{faction:{id:19,name:'Current',days_in_faction:6}},logs};
  const result=normalize(19,company(),undefined,42,data);
  const [first,unknown,current]=result.faction_history.factions;
  assert.equal(first.stints.length,2);
  assert.equal(first.stints[0].joined_at,time(1));
  assert.equal(first.stints[0].separated_at,time(3));
  assert.equal(first.total_known_days_served,5);
  assert.equal(unknown.stints[0].joined_at,null);
  assert.equal(unknown.total_known_days_served,null);
  assert.equal(current.stints[0].joined_at,null);
  assert.equal(current.total_known_days_served,6);
  assert.equal(current.total_time_complete,false);
  const restored=normalize(20,company(),readCareerState(result.state),42,{faction:data.faction});
  assert.equal(restored.faction_history.factions[0].total_known_days_served,5);
});

test('PDA and Tampermonkey transports keep launcher visible and support compiling and restoring backups',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for (const mode of ['pda','tampermonkey']) {
      const page=await browser.newPage({viewport:mode==='pda'?{width:390,height:844}:{width:1280,height:800}});
      await page.route('https://www.torn.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
      await page.goto('https://www.torn.com/');
      const responses={
        '/key/info':{info:{user:{id:PLAYER},access:{type:'Full Access',log:{custom_permissions:true,available:[]}},selections:{user:['log']}}},
        '/user/honors':{honors:[]},'/torn/honors':{honors:[]},'/user/medals':{medals:[]},'/torn/medals':{medals:[]},
        '/user/personalstats':{personalstats:{}},'/user/job':{job:company()},'/user/jobranks':progression.jobranks,
        '/user/jobpoints':progression.jobpoints,'/torn/14/companies':progression.company_types,
        '/user/basic':{profile:{id:PLAYER}},'/user/log':{error:{code:16,error:'Access level of this key is not high enough'}},
        '/torn/logtypes':{logtypes:[{id:123,title:'Job join'},{id:456,title:'Faction join'}]}
      };
      await page.evaluate(({mode,responses,unix1,unix2})=>{
        const mock=(url,headers)=>{
          if (new URL(url).origin!=='https://api.torn.com'||headers.Authorization!=='ApiKey mock') throw Error('Unexpected request');
          const parsed=new URL(url);
          let response=responses[parsed.pathname.replace(/^\/v2/,'')]??{};
          if (mode==='pda' && parsed.searchParams.get('log')==='123,456') {
            response=parsed.searchParams.get('nanostamp')
              ? {log:[{id:'join',timestamp:unix1,details:{title:'Faction join'},data:{faction_id:61}}]}
              : {log:[{id:'leave',timestamp:unix2,details:{title:'Faction leave'},data:{faction_id:61}}],
                _metadata:{links:{prev:'https://api.torn.com/v2/user/log?limit=100&log=123,456&nanostamp=1'}}};
          }
          return {status:200,responseText:JSON.stringify(response)};
        };
        if(mode==='pda')window.PDA_httpGet=(url,headers)=>Promise.resolve(mock(url,headers));
        else window.GM_xmlhttpRequest=options=>queueMicrotask(()=>options.onload(mock(options.url,options.headers)));
      },{mode,responses,unix1:unix(1),unix2:unix(2)});
      await page.addScriptTag({content:source});
      const launcher=page.getByRole('button',{name:'Achievements',exact:true});
      await launcher.waitFor({state:'visible'});
      await page.evaluate(()=>document.body.replaceChildren());
      await launcher.waitFor({state:'visible'});
      await launcher.click();
      await page.getByPlaceholder('Torn API key').fill('mock');
      await page.getByRole('button',{name:'Compile',exact:true}).click();
      await page.getByText(/Export available/).waitFor();
      const [profile]=await page.getByLabel('Torn HTML for profile').evaluateAll(elements=>elements.map(el=>el.value));
      assert.match(profile,/Company ID: 131509/);
      const readDownload=async name=>{
        const pending=page.waitForEvent('download');
        await page.getByRole('button',{name,exact:true}).click();
        const file=await pending;
        return fs.readFileSync(await file.path());
      };
      const report=JSON.parse(await readDownload('Export JSON'));
      assert.equal(report.career_history.previous_employment[0].employer,'Torn Army');
      assert.equal(report.career_diagnostics.endpoints.logs.status,'failed');
      assert.equal(report.career_diagnostics.endpoints.membership_logs.status,mode==='pda'?'success':'failed');
      if (mode==='pda') {
        assert.equal(report.career_diagnostics.historical_coverage.targeted_log_pages,2);
        assert.equal(report.faction_history.factions[0].total_known_days_served,1);
      }
      await page.getByText('Employment History Corrections and Backup').click();
      await page.getByLabel('Previous employer',{exact:true}).fill('Prior Company');
      await page.getByLabel('Previous company ID').fill('42');
      await page.getByRole('button',{name:'Confirm Previous Employment'}).click();
      const backup=await readDownload('Export Employment Backup');
      assert.equal(JSON.parse(backup).corrections.length,2);
      await page.getByLabel('Import employment backup').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:backup});
      await page.getByText('Employment backup merged.').waitFor();
      const restored=JSON.parse(await readDownload('Export JSON'));
      assert.equal(restored.career_history.previous_employment.length,2);
      await page.close();
    }
  } finally { await browser.close(); }
});
