// ==UserScript==
// @name         Achievement Compiler (Standalone)
// @namespace    https://github.com/RelaxSweety/Torn-Scripts-Dev
// @version      0.9.9
// @description  Read-only achievements report for RelaxSweety; enter an API key in the tool.
// @match        *://www.torn.com/*
// @match        *://torn.com/*
// @grant        GM_xmlhttpRequest
// @connect      api.torn.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/achievement-compiler/Achievement-Compiler.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/achievement-compiler/Achievement-Compiler.user.js
// ==/UserScript==
(function () {
  'use strict';
  const PLAYER = 4539436;
  const API = 'https://api.torn.com/v2';
  const SCRIPT_VERSION='0.9.9';
  let current = null;
  const button = document.createElement('button');
  button.id = 'achievement-compiler-launcher';
  button.textContent = 'Achievements';
  Object.assign(button.style, {position:'fixed',right:'12px',bottom:'12px',zIndex:'2147483646',padding:'9px',cursor:'pointer'});
  // PDA can inject userscripts before document.body exists. Mount only after DOM readiness.
  function mount() {
    const root = document.body || document.documentElement;
    if (!root) return;
    if (!button.isConnected) root.appendChild(button);
    if (!panel.isConnected) root.appendChild(panel);
  }
  const panel = document.createElement('section');
  Object.assign(panel.style, {display:'none',position:'fixed',right:'12px',bottom:'55px',zIndex:'2147483647',
    width:'min(92vw,520px)',maxHeight:'75vh',overflow:'auto',background:'#20252c',color:'#fff',
    border:'1px solid #777',padding:'16px',font:'14px sans-serif',boxShadow:'0 4px 20px #0009'});
  panel.id = 'achievement-compiler-panel';
  panel.style.boxSizing = 'border-box';
  panel.style.maxWidth = 'calc(100vw - 16px)';
  panel.style.maxHeight = 'min(75dvh, 650px)';
  panel.style.overflowY = 'auto';
  panel.style.touchAction = 'pan-y';
  button.style.setProperty('display','block','important');
  button.style.setProperty('visibility','visible','important');
  button.style.setProperty('opacity','1','important');
  button.style.setProperty('bottom','max(60px, env(safe-area-inset-bottom))','important');
  button.style.setProperty('right','8px','important');
  button.style.setProperty('background','#262d36','important');
  button.style.setProperty('color','#fff','important');
  button.style.setProperty('border','1px solid #aaa','important');
  button.style.setProperty('borderRadius','8px','important');
  function el(tag,text,parent=panel) { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; parent.appendChild(node); return node; }
  const style=document.createElement('style');
  style.textContent=`
  #achievement-compiler-panel {background:#11151d!important;color:#f3f6fc!important;border:2px solid #d5ad5a!important;border-radius:12px!important;box-shadow:0 12px 45px #000e!important;font:600 15px/1.55 system-ui,Arial,sans-serif!important}
  #achievement-compiler-panel h3 {font:900 23px/1.2 system-ui,Arial,sans-serif!important;color:#f3c76d!important;letter-spacing:.5px!important;margin:0 0 10px!important}
  #achievement-compiler-panel p {color:#e7eaf1!important}
  #achievement-compiler-panel input,#achievement-compiler-panel textarea {background:#fff!important;color:#111!important;font:600 15px/1.5 monospace!important;border:2px solid #b6bfcf!important;border-radius:6px!important}
  #achievement-compiler-panel button {background:#f3c76d!important;color:#111!important;border:0!important;border-radius:6px!important;padding:9px 12px!important;font-weight:800!important}
  #achievement-compiler-panel details {border:1px solid #5e687a!important;border-radius:7px!important;padding:8px!important;margin:8px 0!important}
  #achievement-compiler-panel summary {color:#f3c76d!important;font-size:17px!important;font-weight:900!important;cursor:pointer}
  #achievement-compiler-panel .ac-preview {white-space:pre-wrap!important;user-select:text!important;overflow-wrap:anywhere!important;background:#080b10!important;padding:12px!important;border:1px solid #65758a!important;border-radius:8px!important;font:700 14px/1.65 monospace!important;color:#f7f2e7!important}
  `;
  (document.head || document.documentElement).appendChild(style);
  const header=el('h3','ACHIEVEMENT COMPILER v'+SCRIPT_VERSION);
  const info=el('p','Enter your Torn API key below. The key stays in this input during the session; it is not saved or included in exports.');
  const input=el('input');
  input.type='password'; input.placeholder='Torn API key'; input.autocomplete='off';
  Object.assign(input.style,{width:'95%',padding:'8px'});
  const controls=el('div');
  const run=el('button','Compile',controls);
  const exportJson=el('button','Export JSON',controls);
  const exportMd=el('button','Export Markdown',controls);
  const copyProfile=el('button','Copy Profile HTML',controls);
  const close=el('button','Close',controls);
  for(const b of [run,exportJson,exportMd,copyProfile,close])b.style.margin='8px 5px 8px 0';
  const status=el('p','Ready.');
  const diagnostics=el('details');
  el('summary','API Access Diagnostics',diagnostics);
  const diagnosticText=el('pre','Run Compile to inspect key permissions and log access.',diagnostics);
  diagnosticText.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:12px monospace';
  const results=el('div');
  const profileTitle=el('h3','TORN PROFILE HTML');
  const profilePreview=el('div','Compile achievements to generate copy-ready HTML.');
  profilePreview.className='ac-preview';
  const profileText=el('textarea');
  profileText.readOnly=true;
  profileText.rows=10;
  profileText.style.width='100%';
  profileText.style.boxSizing='border-box';
  profileText.setAttribute('aria-label','Torn HTML for profile');
  const htmlEscape = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function formatDate(value){const n=Number(value);const date=Number.isFinite(n)&&n>100000000?new Date(n*1000):new Date(value);if(Number.isNaN(date.getTime()))return 'Date unavailable';return String(date.getUTCDate()).padStart(2,'0')+'/'+String(date.getUTCMonth()+1).padStart(2,'0')+'/'+date.getUTCFullYear();}
  function chronologicalAwards(data) {
    return data.awards.filter(a=>a.earned).slice().sort((a,b)=>{
      const x=Number(a.earned_at),y=Number(b.earned_at);
      const xd=Number.isFinite(x)&&x>0,yd=Number.isFinite(y)&&y>0;
      if(xd!==yd)return xd?-1:1;
      if(xd&&x!==y)return x-y;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  const pick=(o,...keys)=>keys.reduce((v,k)=>v==null?undefined:v[k],o);
  const CAREER_KEY='achievement-compiler-career-history-'+PLAYER;
  function careerJob(payload){
    const j=payload?.job??payload??{};
    const name=j.name??j.company?.name??j.job??null;
    if(typeof name!=='string'||!name)return null;
    return {name,position:j.position??j.rank??null,company_id:j.company?.id??j.company_id??null};
  }
  function normalizeCareer(d,prior){
    const current=careerJob(d.job);
    const events=Array.isArray(prior?.events)?prior.events.slice(-199):[];
    const last=events[events.length-1];
    if(current&&(!last||last.name!==current.name||last.position!==current.position||last.company_id!==current.company_id))
      events.push({...current,observed_at:d.generated_at,source:'api_snapshot'});
    return {current,standard_job_ranks:d.jobranks?.jobranks??d.jobranks??null,
      job_points:d.jobpoints?.jobpoints??d.jobpoints??null,observed_events:events.slice(-200),
      history_complete:false,note:'Prior ranks and job points do not establish service dates; snapshots only record changes observed from now onward.'};
  }
  function dossier(d){
    const p=pick(d,'personalstats','personalstats')||{};
    const profile=d.profile?.profile||d.profile||{};
    const basic=d.basic?.basic||d.basic||{};
    const job=d.job?.job||d.job||{};
    const work=d.workstats?.workstats||d.workstats||{};
    const prop=d.property?.property||d.property||{};
    const fac=profile.faction||d.faction?.faction||d.faction||{};
    const name=prop.property?.name||prop.name||prop.property_name||prop.type||profile.property?.name||null;
    const island=name&&/private island/i.test(name);
    const address=name?(island?'1 Cartel Cove, Sovereign Isle, Torn City':'4539 Cartel Avenue, Torn City'):null;
    const aw=d.awards.filter(a=>a.earned);
    const history=d.history||{};
    const career=d.career_history||{};
    const enemies=d.enemies?.list??d.enemies?.enemies;
    const enemyTotal=d.enemies?._metadata?.total??(Array.isArray(enemies)?enemies.length:null);
    const logs=d.logs?.log??d.logs?.logs;
    const logEntries=Array.isArray(logs)?logs:Object.values(logs||{});
    const mugLogs=logEntries.filter(x=>/attack mug/i.test(String(x.details?.title??x.title??'')));
    const largestLogMug=mugLogs.reduce((best,x)=>Number(x.data?.money_mugged||0)>Number(best?.data?.money_mugged||0)?x:best,null);
    const edu=d.education?.education||d.education||{};
    const eduCatalog=d.education_catalog?.education||d.education_catalog||[];
    const rawCompleted=edu.complete??edu.completed??edu.education_completed??[];
    const completed=Array.isArray(rawCompleted)?rawCompleted:Object.keys(rawCompleted||{});
    const categories=Array.isArray(eduCatalog)?eduCatalog:Object.values(eduCatalog||{});
    const courseIndex=new Map();
    for(const category of categories){
      if(!category||typeof category!=='object')continue;
      const entries=Array.isArray(category.courses)?category.courses:Object.values(category.courses||{});
      for(const course of entries)if(course&&course.id!=null)courseIndex.set(String(course.id),course);
    }
    const courseId=v=>v&&typeof v==='object'?(v.id??v.course_id):v;
    const courseName=v=>{
      const id=courseId(v);
      const c=courseIndex.get(String(id));
      return c?.name??c?.title??('Course #'+id);
    };
    const completedNames=completed.map(courseName);
    const currentCourse=edu.current??edu.education_current??null;
    const currentId=courseId(currentCourse);
    const currentName=currentId!=null&&String(currentId)!=='0'?courseName(currentId):null;
    const currentUntil=currentCourse&&typeof currentCourse==='object'?currentCourse.until:null;
    const missionCount=p.missions?.missions??null;
    const groups={
      'Identity & personal life':{
        'Player ID':PLAYER,'Level':profile.level??basic.level,'Rank':profile.rank??basic.rank,
        'Account age (days)':profile.age??basic.age,
        'Marital status':profile.spouse?.status??profile.marital_status??profile.married,
        'Spouse':profile.spouse?.name??profile.spouse_name??profile.spouse?.player_name,
        'Spouse ID':profile.spouse?.id??profile.spouse_id,
        'Best activity streak (days)':p.other?.activity?.streak?.best},
      'Residence':{'Property':name,'Ownership / rental':prop.status==='rented'||prop.rented_by?'Rented':prop.owner?.id===PLAYER||prop.owner_id===PLAYER?'Owned':null,
        'Fictional address (not API data)':address},
      'Combat':{'Attacks won':p.attacking?.attacks?.won,'Attacks lost':p.attacking?.attacks?.lost,
        'Best kill streak':p.attacking?.killstreak?.best,'Best damage':p.attacking?.damage?.best,
        'Critical hits':p.attacking?.hits?.critical,'Stealth attacks':p.attacking?.attacks?.stealth,
        'Total mugged ($)':p.attacking?.networth?.money_mugged,
        'Largest mug ($)':p.attacking?.networth?.largest_mug,
        'Muggings in retrieved logs (not lifetime)':d.logs?mugLogs.length:null,'Largest mug in retrieved logs ($)':largestLogMug?.data?.money_mugged??null,'Largest logged mug date (UTC)':largestLogMug?.timestamp?formatDate(largestLogMug.timestamp):null,'Confirmed kills':null,'Enemies (profile count)':profile.enemies??enemyTotal,
        'Strength':p.battle_stats?.strength,'Defense':p.battle_stats?.defense,
        'Speed':p.battle_stats?.speed,'Dexterity':p.battle_stats?.dexterity},
      'Crime & consumption':{'Crimes committed':p.crimes?.total??p.crimes?.offenses?.total,
        'Organized crimes (recorded)':p.crimes?.offenses?.organized_crimes,
        'Xanax used':p.drugs?.xanax,'Alcohol consumed':p.items?.used?.alcohol,
        'E-DVD used':null,'Rehabs':p.drugs?.rehabilitations?.amount,
        'Times jailed':p.jail?.times_jailed,'Missions completed':missionCount,'Duke contracts':p.missions?.contracts?.duke},
      'Faction & military':{'Current faction':fac.name,'Faction ID':fac.id,
        'Faction respect earned':p.attacking?.faction?.respect,
        'Ranked war hits':p.attacking?.faction?.ranked_war_hits,
        'Ranked war wins':p.other?.ranked_war_wins,
        'Wars personally fought':null},
      'Employment & education':{'Current job':job.name??job.job??profile.job?.name??profile.job,
        'Position':job.position??job.rank,
        'Manual labor':work.manual_labor??work.manual??p.jobs?.stats?.manual,
        'Intelligence':work.intelligence??p.jobs?.stats?.intelligence,
        'Endurance':work.endurance??p.jobs?.stats?.endurance,
        'Observed career changes':(career.observed_events||[]).map(e=>e.name+' / '+(e.position||'Unknown rank')+' (observed '+e.observed_at+')').join('; ')||'No earlier snapshots',
        'Standard job ranks':career.standard_job_ranks?JSON.stringify(career.standard_job_ranks):null,
        'Job points':career.job_points?JSON.stringify(career.job_points):null,
        'History completeness':'Partial; historical dates are not inferred','Completed courses':d.education?completed.length:null,'Education history':d.education?completedNames.join('; '):null,'Current education':currentName,'Current education ends (UTC)':currentUntil?formatDate(currentUntil):null,'Education completion dates':'Not provided by education selection'},
      'Wealth & trading':{'Net worth ($)':p.networth?.total,
        'Item market revenue ($)':p.trading?.item_market?.revenue,
        'Item market sales':p.trading?.item_market?.sales,
        'Bank profit ($)':p.investments?.bank?.profit,
        'Stock net profits ($)':p.investments?.stocks?.net_profits},
      'Travel & racing':{'Flights':p.travel?.total,'Time abroad (seconds)':p.travel?.time_spent,
        'Races entered':p.racing?.races?.entered,'Races won':p.racing?.races?.won},
      'Medical':{'Hospitalizations':p.hospital?.times_hospitalized,
        'Overdoses':p.drugs?.overdoses,'Medical items used':p.hospital?.medical_items_used,
        'Revives received':p.hospital?.reviving?.revives_received},
      'Awards & progression':{'Earned awards':aw.length,
        'Honors':aw.filter(a=>a.type==='honor').length,
        'Medals':aw.filter(a=>a.type==='medal').length,
        'First dated award':chronologicalAwards(d)[0]?.name,
        'Most recent dated award':chronologicalAwards(d).filter(a=>a.earned_at).slice(-1)[0]?.name,'Previous snapshots tracked':history.previous_snapshots??0,'New awards since last snapshot':history.new_awards??null,'Net worth change since last snapshot ($)':history.networth_change??null}
    };
    return groups;
  }
  function dossierText(d){
    return Object.entries(dossier(d)).flatMap(([title,items])=>[
      '=== '+title.toUpperCase()+' ===',
      ...Object.entries(items).map(([k,v])=>k+': '+(v===null||v===undefined?'Not available':String(v))), ''
    ]).join('\\n');
  }
  function signature(data){
    const earned=chronologicalAwards(data);
    const rows=earned.map((a,i)=>{
      const date=a.earned_at?formatDate(a.earned_at):'Unknown';
      return '<tr style="background-color:#000000;color:#00FF66;">'
        +'<td style="padding:1px 3px;white-space:nowrap;border-bottom:1px solid #123B20;">'+htmlEscape(date)+'</td>'
        +'<td style="padding:1px 3px;border-bottom:1px solid #123B20;">'+htmlEscape(a.type.toUpperCase())+'</td>'
        +'<td style="padding:2px 4px;"><strong>'+htmlEscape(a.name)+'</strong></td>'
        +'<td style="padding:1px 3px;border-bottom:1px solid #123B20;">'+htmlEscape(a.description)+'</td></tr>';
    });
    return ['<pre style="background:#000;color:#00FF66;font:9px/1.2 monospace;white-space:pre-wrap;">'+htmlEscape(dossierText(data))+'</pre>', '<div style="text-align:center;">',
      '<p><strong>RELAXSWEETY — ACCOMPLISHMENT LEDGER</strong></p>',
      '<p>'+earned.length+' earned honors and medals | Oldest to newest</p>',
      '</div>',
      '<table style="width:100%;border-collapse:collapse;background-color:#000000;color:#00FF66;font-family:Courier New,monospace;font-size:9px;line-height:1.1;">',
      '<thead><tr style="background-color:#061B0B;color:#7CFF9A;"><th>Date</th><th>Type</th><th>Accomplishment</th><th>Description</th></tr></thead>',
      '<tbody>',...rows,'</tbody></table>',
      '<p style="font-size:9px;">Unknown dates are listed last. Dates use DD/MM/YYYY (UTC).</p>'].join('\n');
  }
  function renderSignature(){
    if(!current)return;
    // Keep the PDA UI light: don't duplicate the entire HTML table in the live DOM.
    profileText.value=signature(current);
    const earned=chronologicalAwards(current);
    const dated=earned.filter(a=>a.earned_at).length;
    profilePreview.textContent=earned.length+' earned accomplishments ready to copy. '+dated+
      ' have recorded dates; '+(earned.length-dated)+' have unknown dates. Full ledger is in the HTML field below.';
  }
  copyProfile.onclick=async()=>{
    if(!current){status.textContent='Compile achievements first.';return;}
    profileText.focus();profileText.select();
    try{await navigator.clipboard.writeText(profileText.value);status.textContent='Profile HTML copied.';}
    catch{status.textContent='Select the HTML field and use Copy from the PDA selection menu.';}
  };
  button.onclick=()=>{panel.style.display=panel.style.display==='none'?'block':'none';};
  close.onclick=()=>{panel.style.display='none';input.value='';};
  function request(path,key) {
    const url = API + path;
    const headers = {Authorization: 'ApiKey ' + key, Accept:'application/json'};
    const parse = (status, body) => {
      let data;
      try { data = JSON.parse(body); } catch { throw new Error('Invalid JSON response'); }
      if (data.error) throw new Error('Torn API error '+data.error.code+': '+data.error.error);
      if (status < 200 || status >= 300) throw new Error('HTTP '+status);
      return data;
    };
    // Native Torn PDA HTTP bridge is more reliable than GM shims on mobile.
    if (typeof PDA_httpGet === 'function') {
      return Promise.resolve(PDA_httpGet(url,headers)).then(r=>parse(r.status,r.responseText));
    }
    if (typeof GM_xmlhttpRequest === 'function') {
      return new Promise((resolve,reject)=>GM_xmlhttpRequest({
        method:'GET',url,headers,timeout:25000,
        onload:r=>{try{resolve(parse(r.status,r.responseText));}catch(e){reject(e);}},
        ontimeout:()=>reject(new Error('Request timed out')),
        onerror:()=>reject(new Error('Network request failed'))
      }));
    }
    return fetch(url,{headers}).then(async r=>parse(r.status,await r.text()));
  }
  function list(payload,name) {
    const raw=payload[name]??payload;
    if(Array.isArray(raw))return raw.map(v=>typeof v==='object'?v:{id:v});
    if(raw&&typeof raw==='object')return Object.entries(raw).map(([id,v])=>({id,...(v&&typeof v==='object'?v:{value:v})}));
    return [];
  }
  const id=a=>String(a.id??a.honor_id??a.medal_id??'');
  function compile(earned,catalog,name) {
    const owned=list(earned,name),all=list(catalog,name);
    const ownedIds=new Set(owned.map(id));
    const known=new Set(all.map(id));
    const output=all.map(a=>{
      const e=owned.find(x=>id(x)===id(a))||{};
      return {type:name.slice(0,-1),id:id(a),name:a.name??e.name??'Unknown',
        description:a.description??e.description??'',earned:ownedIds.has(id(a)),
        earned_at:e.earned_at??e.timestamp??e.awarded_at??null};
    });
    for(const a of owned)if(!known.has(id(a)))output.push({type:name.slice(0,-1),id:id(a),name:a.name??'Unknown',description:'',earned:true,earned_at:null});
    return output.sort((a,b)=>Number(b.earned)-Number(a.earned)||a.name.localeCompare(b.name));
  }
  function markdown(data) {
    const done=data.awards.filter(x=>x.earned),todo=data.awards.filter(x=>!x.earned);
    let lines=['# RelaxSweety Achievement Compiler','', 'Generated: '+data.generated_at,'',
      'Completed: '+done.length+' | Not earned: '+todo.length,'',
      'Dates are included only when provided by the API.',''];
    lines.push('## Player dossier','', '```text',dossierText(data),'```','');
    for(const [heading,items] of [['Completed',done],['Not yet earned',todo]]){
      lines.push('## '+heading,'');
      for(const a of items)lines.push('- **'+a.name+'** ('+a.type+', '+a.id+') — '+a.description+(a.earned_at?' | '+formatDate(a.earned_at):''));
      lines.push('');
    }
    return lines.join('\n');
  }
  function download(name,body,mime) {
    const url=URL.createObjectURL(new Blob([body],{type:mime}));
    const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  exportJson.onclick=()=>{if(current)download('relaxsweety-achievements.json',JSON.stringify(current,null,2),'application/json');};
  exportMd.onclick=()=>{if(current)download('relaxsweety-achievements.md',markdown(current),'text/markdown');};
  run.onclick=async()=>{
    const key=input.value.trim();if(!key){status.textContent='Enter an API key first.';return;}
    run.disabled=true;status.textContent='Retrieving Torn data…';results.replaceChildren();current=null;diagnosticText.textContent='Checking key metadata…';
    try {
      const apiDiagnostics={script_version:SCRIPT_VERSION,key_info_status:'not checked',key_access:null,
        user_log_selection:null,log_probe:null,log_probe_error:null,notes:[]};
      try {
        const info=await request('/key/info',key);
        const detail=info.info||info;
        apiDiagnostics.key_info_status='success';
        apiDiagnostics.key_access=detail.access?.type??detail.access?.level??detail.access??null;
        const selected=detail.selections?.user;
        apiDiagnostics.user_log_selection=Array.isArray(selected)?selected.includes('log'):null;
        apiDiagnostics.custom_log_permissions=detail.access?.log?.custom_permissions??null;
        if(apiDiagnostics.user_log_selection===false)
          apiDiagnostics.notes.push('Key metadata does not explicitly include user/log. Custom-key selections may be restricted.');
      }catch(e){
        apiDiagnostics.key_info_status='failed';
        apiDiagnostics.notes.push('Key metadata request failed: '+e.message);
      }
      diagnosticText.textContent=JSON.stringify(apiDiagnostics,null,2);
      const paths={honors:'/user/honors',medals:'/user/medals',
        honors_catalog:'/torn/honors',medals_catalog:'/torn/medals',
        personalstats:'/user/personalstats?cat=all'};
      const data={};
      for(const [name,path] of Object.entries(paths)){
        status.textContent='Loading '+name+' ('+path+')…';
        try { data[name]=await request(path,key); }
        catch(e) { throw new Error('Failed at '+name+' ('+path+'): '+e.message); }
      }
      const awards=[...compile(data.honors,data.honors_catalog,'honors'),
                    ...compile(data.medals,data.medals_catalog,'medals')];
      const extras={profile:'/user/profile',basic:'/user/basic',job:'/user/job',jobranks:'/user/jobranks',jobpoints:'/user/jobpoints',
        workstats:'/user/workstats',property:'/user/property',faction:'/user/faction',education:'/user/education',education_catalog:'/torn/education'};
      const unavailable={};
      for(const [name,path] of Object.entries(extras)){
        status.textContent='Loading '+name+'…';
        try{data[name]=await request(path,key);}catch(e){unavailable[name]=e.message;}
      }
      const historical={};
      // Profile provides the verified enemy count; no invalid list-category request.
      // Log pagination is capped to avoid excessive PDA memory and API requests.
      try {
        status.textContent='Probing user/log access…';
        let page=await request('/user/log?limit=1',key);
        apiDiagnostics.log_probe='success';
        // Re-request normal page only after the one-record probe succeeds.
        page=await request('/user/log?limit=100',key);
        const all=[];
        const seen=new Set();
        for(let i=0;i<5;i++){
          const entries=page?.log||[];
          for(const entry of entries)if(!seen.has(entry.id)){seen.add(entry.id);all.push(entry);}
          const prev=page?._metadata?.links?.prev;
          if(!prev||i===4)break;
          status.textContent='Loading history page '+(i+2)+' of up to 5…';
          const parsed=new URL(prev);
          if(parsed.origin!=='https://api.torn.com'||parsed.pathname!=='/v2/user/log')break;
          page=await request(parsed.pathname+parsed.search,key);
        }
        historical.logs={log:all,pages_fetched:Math.ceil(all.length/100),
          partial_history:true,history_note:'Up to 5 recent pages; not lifetime totals'};
      }catch(e){unavailable.logs=e.message;apiDiagnostics.log_probe='failed';apiDiagnostics.log_probe_error=e.message;
        if(/error 16\b/i.test(e.message))apiDiagnostics.notes.push('Torn returned error 16 for user/log. Compare the key access and selection metadata above; no key value is exported.');}
      diagnosticText.textContent=JSON.stringify(apiDiagnostics,null,2);

      current={player_id:PLAYER,generated_at:new Date().toISOString(),awards,
        ...historical,
        personalstats:data.personalstats,profile:data.profile,basic:data.basic,
        job:data.job,jobranks:data.jobranks,jobpoints:data.jobpoints,workstats:data.workstats,property:data.property,
        faction:data.faction,education:data.education,education_catalog:data.education_catalog,unavailable_sources:unavailable,api_diagnostics:apiDiagnostics};
      try{
        const oldCareer=JSON.parse(localStorage.getItem(CAREER_KEY)||'null');
        current.career_history=normalizeCareer(current,oldCareer);
        localStorage.setItem(CAREER_KEY,JSON.stringify({events:current.career_history.observed_events}));
      }catch(e){
        unavailable.career_history_storage=String(e.message);
        current.career_history=normalizeCareer(current,null);
      }
      try{
        const storageKey='achievement-compiler-snapshots-'+PLAYER;
        const old=JSON.parse(localStorage.getItem(storageKey)||'[]');
        const previous=old.length?old[old.length-1]:null;
        const currentEarned=awards.filter(a=>a.earned).map(a=>a.type+':'+a.id);
        const worth=data.personalstats?.personalstats?.networth?.total??null;
        current.history={previous_snapshots:old.length,
          new_awards:previous?currentEarned.filter(id=>!previous.earned.includes(id)).length:null,
          networth_change:previous&&worth!=null&&previous.networth!=null?worth-previous.networth:null};
        const next=old.slice(-29).concat([{date:current.generated_at,earned:currentEarned,networth:worth}]);
        localStorage.setItem(storageKey,JSON.stringify(next));
      }catch(e){unavailable.local_history=String(e.message);}
      current.dossier=dossier(current);
      const done=awards.filter(a=>a.earned),todo=awards.filter(a=>!a.earned);
      status.textContent='Completed: '+done.length+' | Not earned: '+todo.length+'. API log: '+(apiDiagnostics.log_probe||'not checked')+'. Export available.';
      renderSignature();
      const detail=el('details',undefined,results);
      el('summary','Player Performance Dossier',detail);
      const pre=el('pre',dossierText(current),detail);
      pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;background:#000;color:#00FF66;padding:8px;font:11px monospace';
      for(const [label,items] of [['Completed',done],['Not yet earned',todo]]){
        const details=el('details',undefined,results),summary=el('summary',label+' ('+items.length+')',details);
        for(const a of items)el('p',a.name+' — '+a.description+(a.earned_at?' ['+formatDate(a.earned_at)+']':''),details);
      }
    }catch(e){status.textContent=e.message+'; verify endpoint permissions and API response format.';}
    finally{input.value='';run.disabled=false;}
  };
  // PDA and SPA navigation can replace document.body after userscript injection.
  // Mount immediately, retry on DOM readiness and reattach after route changes.
  mount();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  window.addEventListener('pageshow', mount);
  const observer = new MutationObserver(() => {
    if (!button.isConnected || !panel.isConnected) mount();
  });
  observer.observe(document.documentElement, {childList:true,subtree:true});
  setInterval(() => { if (!button.isConnected || !panel.isConnected) mount(); }, 2500);
})();
