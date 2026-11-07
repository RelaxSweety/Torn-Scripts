// ==UserScript==
// @name         TU Testing and Diagnostics DEV
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.2.5-dev
// @description  Guided DEV acceptance for ten tools, separate PDA/Tampermonkey evidence and sanitized reports
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @connect      tu-multiplayer-server-dev.tuserver.workers.dev
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/all-in-one/dist/tu-diagnostics-dev.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/all-in-one/dist/tu-diagnostics-dev.user.js
// @run-at       document-idle
// ==/UserScript==
(() => {
 'use strict';
 if(window.__TU_DIAGNOSTICS_DEV__)return;
 window.__TU_DIAGNOSTICS_DEV__=true;
 const catalog=__TU_TEST_CATALOG__,tools=__TU_TEST_TOOLS__,targetBuild='__TU_TEST_TARGET__';
 const createSession=__TU_ACCEPTANCE_ENGINE__;
 const tests=catalog.tests;
 const key='tu:test:acceptance:'+targetBuild+':'+catalog.checklistVersion;
 const positionKey='tu:aio:diagnostics:launcher-position:v1',panelLayoutKey='tu:aio:diagnostics:panel-layout:v1';
 const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
 const detectEnvironment=__TU_ENVIRONMENT_DETECTOR__;
 const baseEnvironment={userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gmInfo:typeof GM_info!=='undefined'?GM_info:null,pdaBridge:typeof host.flutter_inappwebview?.callHandler==='function'||typeof window.flutter_inappwebview?.callHandler==='function'||typeof host.PDA_httpGet==='function'||typeof host.PDA_httpPost==='function'||typeof window.PDA_httpGet==='function'||typeof window.PDA_httpPost==='function'};
 let environment=detectEnvironment({...baseEnvironment,uaData:navigator.userAgentData});
 const detected=environment.host.id;

 let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
 const profiles=saved.profiles&&typeof saved.profiles==='object'?saved.profiles:{};
 let platform=detected,session;
 const loadSession=()=>{session=createSession({targetBuild,checklistVersion:catalog.checklistVersion,tests,platform,initial:profiles[platform]});};loadSession();
 const save=()=>{profiles[platform]=session.snapshot();try{localStorage.setItem(key,JSON.stringify({profiles}))}catch{notice.textContent='Unable to save results on this device. Export the report before leaving.'}};
  const launcher=document.createElement('button');launcher.textContent='TU Test';launcher.id='tu-test-dev-toggle';launcher.title='Open independent TU diagnostics';
  launcher.style.cssText='position:fixed;bottom:18px;right:18px;z-index:2147483645;background:#233f53;color:white;border:1px solid #9ac;padding:9px 12px;border-radius:8px;font:600 13px/1.3 Arial,Helvetica,sans-serif;cursor:pointer';
  // Drag with pointer or touch; a short tap still opens the checklist.
  let position=null;
  try{position=JSON.parse(localStorage.getItem(positionKey)||'null')}catch{}
  if(position&&Number.isFinite(position.x)&&Number.isFinite(position.y)){
    launcher.style.left=Math.max(0,Math.min(window.innerWidth-70,position.x))+'px';
    launcher.style.top=Math.max(0,Math.min(window.innerHeight-35,position.y))+'px';
    launcher.style.right='auto';launcher.style.bottom='auto';
  }
  launcher.style.touchAction='none';
  let drag=null,suppressClick=false;
  launcher.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const rect=launcher.getBoundingClientRect();
    drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:rect.left,y:rect.top,moved:false};
    launcher.setPointerCapture?.(event.pointerId);
  });
  launcher.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(!drag.moved&&Math.hypot(dx,dy)<6)return;
    drag.moved=true;
    const x=Math.max(0,Math.min(window.innerWidth-launcher.offsetWidth,drag.x+dx));
    const y=Math.max(0,Math.min(window.innerHeight-launcher.offsetHeight,drag.y+dy));
    launcher.style.left=x+'px';launcher.style.top=y+'px';launcher.style.right='auto';launcher.style.bottom='auto';
  });
  const finishDrag=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    if(drag.moved){
      suppressClick=true;
      try{localStorage.setItem(positionKey,JSON.stringify({x:parseFloat(launcher.style.left),y:parseFloat(launcher.style.top)}))}catch{}
    }
    drag=null;
  };
  launcher.addEventListener('pointerup',finishDrag);
  launcher.addEventListener('pointercancel',finishDrag);
  const panel=document.createElement('section');panel.id='tu-test-dev-panel';
  panel.style.cssText='position:fixed;right:12px;bottom:60px;width:min(410px,calc(100vw - 24px));height:min(530px,calc(100dvh - 36px));min-width:260px;min-height:230px;max-width:100vw;max-height:100dvh;overflow:hidden;display:none;flex-direction:column;z-index:2147483646;background:#18242d;color:white;padding:14px;border:1px solid #89a;border-radius:10px;font:400 14px/1.5 Arial,Helvetica,sans-serif;box-sizing:border-box;resize:both';
  let savedPanelLayout=null;
  try{savedPanelLayout=JSON.parse(localStorage.getItem(panelLayoutKey)||'null')}catch{}
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  if(savedPanelLayout&&['x','y','w','h'].every(k=>Number.isFinite(savedPanelLayout[k]))){
    panel.style.width=clamp(savedPanelLayout.w,260,Math.max(260,innerWidth))+'px';
    panel.style.height=clamp(savedPanelLayout.h,230,Math.max(230,innerHeight))+'px';
    panel.style.left=clamp(savedPanelLayout.x,0,Math.max(0,innerWidth-60))+'px';
    panel.style.top=clamp(savedPanelLayout.y,0,Math.max(0,innerHeight-50))+'px';
    panel.style.right='auto';panel.style.bottom='auto';
  }
  const savePanelLayout=()=>{const rect=panel.getBoundingClientRect();try{localStorage.setItem(panelLayoutKey,JSON.stringify({x:rect.left,y:rect.top,w:rect.width,h:rect.height}))}catch{}};
  const panelResizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(panel.style.display!=='none')savePanelLayout()}):null;
  // Torn page styles can override native buttons and inputs; scope explicit typography.
  const font='Arial,Helvetica,sans-serif';
  const heading=document.createElement('div');heading.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:move;touch-action:none;flex-shrink:0;user-select:none;padding-bottom:8px';
  const title=document.createElement('strong');title.textContent='TU Test · DEV acceptance';title.style.cssText='font:700 15px/1.4 '+font+';color:#f4f7fa';
  const close=document.createElement('button');close.textContent='Close';close.style.cssText='font:600 12px/1.35 Arial,Helvetica,sans-serif;color:#fff;background:#344d60;border:1px solid #7892a2;border-radius:5px;padding:6px 10px;cursor:pointer';close.onclick=()=>{panel.style.display='none';panelResizeObserver?.disconnect();};heading.append(title,close);panel.append(heading);
  let panelDrag=null;
  heading.addEventListener('pointerdown',event=>{if(event.button!==0||event.target===close)return;const rect=panel.getBoundingClientRect();panelDrag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};heading.setPointerCapture?.(event.pointerId);event.preventDefault()});
  heading.addEventListener('pointermove',event=>{if(!panelDrag||event.pointerId!==panelDrag.id)return;panel.style.left=clamp(panelDrag.left+event.clientX-panelDrag.x,0,Math.max(0,innerWidth-60))+'px';panel.style.top=clamp(panelDrag.top+event.clientY-panelDrag.y,0,Math.max(0,innerHeight-50))+'px';panel.style.right='auto';panel.style.bottom='auto'});
  const stopPanelDrag=event=>{if(!panelDrag||event.pointerId!==panelDrag.id)return;panelDrag=null;savePanelLayout()};
  heading.addEventListener('pointerup',stopPanelDrag);heading.addEventListener('pointercancel',stopPanelDrag);
  const content=document.createElement('div');content.style.cssText='flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding-right:4px';panel.append(content);
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;b.style.cssText='font:600 12px Arial;color:#fff;background:#344d60;border:1px solid #7892a2;border-radius:5px;padding:8px;margin:3px;cursor:pointer';return b;};
 const text=(tag,value,parent=content)=>{const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;};
 const notice=text('p','Target '+targetBuild+' · TU Test 0.2.5-dev. Record results only for the actual selected host. Automatic checks are read-only and do not prove gameplay or native bridge compatibility.');
 text('p','Do not paste API keys, session tokens or room secrets into notes. This tool never registers keys, accepts/cancels agreements, creates rooms or modifies backend records.');
 const hostLabel=text('label','Actual test host: ');
 const hostSelect=document.createElement('select');hostSelect.id='tu-test-host';
 for(const [id,label] of [['unknown','Select actual host'],['tampermonkey','Tampermonkey'],['pda','Torn PDA']]){const o=document.createElement('option');o.value=id;o.textContent=label;hostSelect.append(o);}hostSelect.value=platform;hostLabel.append(hostSelect);
 const device=text('input','');device.placeholder='Device / OS / browser';device.id='tu-test-device';
 const hostVersion=text('input','');hostVersion.placeholder='Actual PDA / Tampermonkey version';hostVersion.id='tu-test-host-version';
 for(const e of [device,hostVersion]){e.style.cssText='display:block;width:100%;box-sizing:border-box;padding:8px;margin:6px 0';e.oninput=()=>{session.setMeta({device:device.value,hostVersion:hostVersion.value});save();updateSummary();};}
 const contextWarning=text('p','');
 const detectedDetails=text('p','');detectedDetails.id='tu-test-detected-environment';
 const section=document.createElement('select');section.id='tu-test-section';
 const sections=[['all','All sections'],['automatic','Read-only automatic checks'],['auth','Authentication & agreement'],['core','Manager, data & release'],...tools.map(t=>['tool.'+t.id,t.name])];
 for(const [id,label] of sections){const o=document.createElement('option');o.value=id;o.textContent=label;section.append(o);}content.append(section);
 const filter=document.createElement('select');filter.id='tu-test-status';
 for(const [id,label] of [['all','All results'],['unpassed','Not passed'],['fail','Failed'],['blocked','Blocked'],['not-tested','Not tested']]){const o=document.createElement('option');o.value=id;o.textContent=label;filter.append(o);}content.append(filter);
 const summary=text('p','');summary.id='tu-test-summary';summary.setAttribute('role','status');
 const actions=document.createElement('div');content.append(actions);
 const list=document.createElement('div');list.id='tu-test-checklist';content.append(list);
 const feedback=text('textarea','');feedback.placeholder='General feedback (no credentials)';feedback.id='tu-test-feedback';feedback.style.cssText='width:100%;box-sizing:border-box;min-height:70px';
 feedback.oninput=()=>{session.setMeta({feedback:feedback.value});save();};
 const describeEnvironment=()=>[environment.device.model||environment.device.type,environment.os.name+(environment.os.version?(environment.os.source==='client-hints platform version'?' (platform '+environment.os.version+')':' '+environment.os.version):''),environment.browser.name+(environment.browser.version?' '+environment.browser.version:'')].filter(v=>v&&v!=='unknown').join(' / ');
 const applyDetection=()=>{
  const m=session.snapshot().meta,values={};
  if(!m.device.trim())values.device=describeEnvironment();
  if(!m.hostVersion.trim()&&platform===environment.host.id&&environment.host.version)values.hostVersion=environment.host.version;
  session.setMeta(values);
 };
 const refreshFields=()=>{applyDetection();const m=session.snapshot().meta;device.value=m.device;hostVersion.value=m.hostVersion;feedback.value=m.feedback;detectedDetails.textContent='Auto-detected: '+describeEnvironment()+' · '+environment.host.name+' '+(environment.host.version||'(version not exposed)')+'. Reported browser information may be reduced; exact device models and app versions may be unavailable. Edit the fields to correct or complete them.';};
 const statusLabel=s=>s.toUpperCase().replace('-',' ');
 function updateSummary(){
  const r=session.report();
  const snapshots={...profiles,[platform]:session.snapshot()};
  const matrix=['tampermonkey','pda'].map(id=>{const report=createSession({targetBuild,checklistVersion:catalog.checklistVersion,tests,platform:id,initial:snapshots[id]}).report();return (id==='pda'?'PDA':'Tampermonkey')+' '+report.counts.pass+'/'+tests.length+' passed';}).join(' · ');
  const counts=Object.entries(r.counts).map(([s,n])=>statusLabel(s)+': '+n).join(' · ');
  summary.textContent=matrix+' | '+counts+' — '+(r.platformReady?'Selected host checklist complete; review required.':'Selected host validation incomplete.');
  contextWarning.textContent=platform==='unknown'?'Select the actual host and enter device/host versions. Unknown hosts cannot complete acceptance.':detected!=='unknown'&&detected!==platform?'Host detection differs from your selection. Only record results from the actual selected host.':'Detected host: '+detected+'. Keep separate results for each host.';
 }
 const currentBuild=()=>document.querySelector('#tu-pda-panel footer')?.textContent.match(/Torn Utilities v([^\s]+)/)?.[1]||null;
 function render(){
  list.replaceChildren();updateSummary();const results=session.snapshot().results;
  for(const t of tests){
   const r=results[t.id]||{status:'not-tested',note:''};
   if(section.value!=='all'&&section.value!==t.section)continue;
   if(filter.value==='unpassed'&&r.status==='pass')continue;
   if(!['all','unpassed'].includes(filter.value)&&r.status!==filter.value)continue;
   const row=document.createElement('section');row.dataset.testId=t.id;row.style.cssText='border-top:1px solid #789;padding:10px 0';list.append(row);
   text('strong',t.label,row);text('div',(t.kind==='automatic'?'READ-ONLY AUTO':'MANUAL · ACTUAL HOST')+' · '+statusLabel(r.status),row);
   text('p',t.instructions,row);
   const note=document.createElement('textarea');note.placeholder='Observed behavior, reproduction steps or reason blocked/skipped. Never enter credentials.';note.value=r.note;note.style.cssText='width:100%;box-sizing:border-box;min-height:45px';row.append(note);
   note.readOnly=t.kind==='automatic';
   if(t.kind==='manual'){
    note.onchange=()=>{try{session.record(t.id,note.value.trim()?r.status:'not-tested',note.value);save();}catch(error){alert(error.message);}};
    for(const status of ['pass','fail','blocked','skip','not-tested'])row.append(button(statusLabel(status),()=>{
     if(platform==='unknown'){alert('Select the actual PDA or Tampermonkey host first.');return;}
     if(currentBuild()!==targetBuild){alert('Install/open TU '+targetBuild+' before recording acceptance for this build.');return;}
     try{session.record(t.id,status,note.value);save();render();}catch(error){alert(error.message);}
    }));
   }
  }
 }
 section.onchange=render;filter.onchange=render;
 hostSelect.onchange=()=>{save();platform=hostSelect.value;loadSession();refreshFields();render();};
 const githubAgreement='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/agreements/dev/version.json';
 const artifact='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-'+targetBuild+'.user.js';
 async function getText(url){
  return new Promise((resolve,reject)=>{
   let done=false;const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
   const blocked=message=>Object.assign(Error(message),{blocked:true});
   const timer=setTimeout(()=>finish(blocked('Network timeout; check connectivity and policy')),12000);
   const handle=(status,value)=>{if(status!==200)return finish(Object.assign(Error('HTTP '+status),{blocked:[0,401,403,429,502,503,504].includes(status)}));finish(null,value);};
   const gm=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);
   if(gm){try{gm({method:'GET',url,anonymous:true,timeout:11000,headers:{Accept:'application/json,text/plain'},onload:r=>handle(r.status,r.responseText),onerror:()=>finish(blocked('Network request blocked/unavailable')),ontimeout:()=>finish(blocked('Network timeout'))});}catch{finish(blocked('Request bridge unavailable'));}}
   else fetch(url,{cache:'no-store',credentials:'omit'}).then(async r=>handle(r.status,await r.text())).catch(()=>finish(blocked('Network/CORS request unavailable')));
  });
 }
 const setAuto=(id,status,note)=>{session.record(id,status,note,'automatic');save();render();};
 const validAgreement=d=>typeof d?.agreement_version==='string'&&!!d.agreement_version.trim();
 let running=false;
 async function runChecks(){
  if(running)return;if(platform==='unknown'){alert('Select your actual test host first.');return;}
  running=true;runButton.disabled=true;hostSelect.disabled=true;
  try{
   const actual=currentBuild();setAuto('runtime.build',actual===targetBuild?'pass':actual?'fail':'blocked',actual?'Visible installed TU '+actual+'; target '+targetBuild:'TU version label unavailable; open/install the integrated DEV Manager.');
   let api;try{api=host.TornUtilities||window.TornUtilities;}catch{}
   if(typeof api?.isRegistered!=='function')setAuto('runtime.registry','blocked','Shared Manager API unavailable; this does not establish missing tools.');
   else{const missing=tools.filter(t=>!api.isRegistered(t.id));const removed=api.isRegistered('alerts-calculations');setAuto('runtime.registry',!missing.length&&!removed?'pass':'fail',missing.length?'Missing registrations: '+missing.map(t=>t.name).join(', '):removed?'Removed Stock and Calculations still registered':'All ten expected registrations present; removed tool absent. Functionality remains manual.');}
   const temp='tu:test:probe:'+Date.now();try{localStorage.setItem(temp,'roundtrip');const ok=localStorage.getItem(temp)==='roundtrip';setAuto('runtime.storage',ok?'pass':'fail','Temporary local storage roundtrip '+(ok?'succeeded':'failed'));}catch{setAuto('runtime.storage','blocked','Local storage is unavailable');}finally{try{localStorage.removeItem(temp)}catch{}}
   try{
    const source=await getText(artifact);const version=source.match(/^\/\/\s*@version\s+(\S+)/m)?.[1];
    const markers=tools.every(t=>source.includes('/* Integrated tool: '+t.id+' ('));
    const ok=source.startsWith('// ==UserScript==')&&version===targetBuild&&markers&&(source.match(/\/\* Integrated tool:/g)||[]).length===10&&!source.includes('/* Integrated tool: alerts-calculations')&&!source.includes('war-status-diagnostic')&&!source.includes('modules.json')&&!source.includes('https://tu-multiplayer-server.tuserver.workers.dev');
    setAuto('source.bundle',ok?'pass':'fail','Published '+(version||'unknown')+'; single-script metadata, ten tool markers, exclusions and DEV endpoints '+(ok?'match':'do not match')+'. This does not execute the source.');
   }catch(e){setAuto('source.bundle',e.blocked?'blocked':'fail',e.message);}
   let github=null,worker=null;
   try{github=JSON.parse(await getText(githubAgreement));if(!validAgreement(github))throw Error('Invalid published version');setAuto('agreement.github','pass','Published DEV agreement version '+github.agreement_version+'; metadata only');}
   catch(e){github=null;setAuto('agreement.github',e.blocked?'blocked':'fail',e.blocked?e.message:'Invalid public version metadata');}
   if(typeof api?.getAgreementVersion!=='function')setAuto('agreement.worker','blocked','Updated authenticated TU Manager is required for version-only backend verification');
   else try{worker=await api.getAgreementVersion({refresh:true});if(!validAgreement(worker))throw Error('Missing backend version');setAuto('agreement.worker','pass','DEV backend agreement version '+worker.agreement_version+' confirmed via Manager; full text not downloaded');}
   catch{worker=null;setAuto('agreement.worker','blocked','DEV session/version verification unavailable; authenticate in TU and retry');}
   if(!github||!worker)setAuto('agreement.match','blocked','Both published version numbers are needed');
   else{const same=github.agreement_version===worker.agreement_version;setAuto('agreement.match',same?'pass':'fail',same?'Published agreement versions match; wording is not compared':'Published agreement version numbers differ');}

  }finally{running=false;runButton.disabled=false;hostSelect.disabled=false;render();}
 }
 const runButton=button('Run read-only checks',runChecks);actions.append(runButton);
 function exportReport(){
  save();const reports={};for(const id of ['tampermonkey','pda'])reports[id]=createSession({targetBuild,checklistVersion:catalog.checklistVersion,tests,platform:id,initial:profiles[id]}).report();
  const report={schemaVersion:2,toolVersion:'0.2.5-dev',targetBuild,checklistVersion:catalog.checklistVersion,detectedHost:detected,detectedEnvironment:Object.fromEntries(Object.entries(environment).map(([k,fields])=>[k,Object.fromEntries(Object.entries(fields).map(([name,value])=>[name,typeof value==='string'?session.scrub(value):value]))])),userAgent:session.scrub(navigator.userAgent),platforms:reports,acceptanceComplete:Object.values(reports).every(r=>r.platformReady),productionAuthorized:false};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tu-dev-acceptance-'+targetBuild+'-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 actions.append(button('Export both host reports',exportReport),button('Reset selected host',()=>{
  if(!confirm('Clear results for this build and selected host? Export first to retain evidence.'))return;
  delete profiles[platform];loadSession();refreshFields();save();render();
 }));
 launcher.onclick=()=>{if(suppressClick){suppressClick=false;return;}panel.style.display=panel.style.display==='none'?'flex':'none';if(panel.style.display==='none')panelResizeObserver?.disconnect();else panelResizeObserver?.observe(panel);render();};
 document.body.append(launcher,panel);refreshFields();render();
 if(typeof navigator.userAgentData?.getHighEntropyValues==='function'){
  Promise.resolve().then(()=>navigator.userAgentData.getHighEntropyValues(['model','platformVersion','fullVersionList'])).then(hints=>{
   const previous=describeEnvironment();environment=detectEnvironment({...baseEnvironment,uaData:{platform:navigator.userAgentData.platform,brands:navigator.userAgentData.brands,...hints}});
   if(session.snapshot().meta.device===previous)session.setMeta({device:describeEnvironment()});
   refreshFields();save();updateSummary();
  }).catch(()=>{ /* Keep reported UA values and editable fields when hints are unavailable. */ });
 }

})();
