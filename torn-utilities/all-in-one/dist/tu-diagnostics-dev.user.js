// ==UserScript==
// @name         TU Testing and Diagnostics DEV
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.2.0-dev
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
 const catalog={"schemaVersion":2,"checklistVersion":"dev-acceptance-2026-11-05-v2","tests":[{"id":"runtime.build","section":"automatic","label":"Installed DEV build","instructions":"Confirm the installed TU version matches the target release. This checks only the visible version label.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"runtime.registry","section":"automatic","label":"Ten integrated tools registered","instructions":"Read the shared TU API and confirm all ten expected tools are registered; Stock and Calculations must be absent. Registration does not prove a tool works.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"runtime.storage","section":"automatic","label":"Temporary storage roundtrip","instructions":"Write, read and remove only a temporary TU Test key; do not touch tool data.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"source.bundle","section":"automatic","label":"Published single-script DEV artifact","instructions":"Check release metadata, ten bundled factory markers, removed tool exclusion and DEV-only backend URLs. This is a source check, not runtime validation.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.github","section":"automatic","label":"GitHub published agreement","instructions":"Read the published DEV agreement metadata and complete text.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.worker","section":"automatic","label":"DEV Worker published agreement","instructions":"Read the public DEV agreement endpoint. No key or session token is transmitted.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.match","section":"automatic","label":"Agreement publication consistency","instructions":"Compare published version, number, effective date and wording between GitHub and DEV Worker.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.public","section":"auth","label":"Public Only registration","instructions":"In DEV, register using a Public Only key. Verify the server-confirmed access label and accepted current agreement. Record outcome only; never paste the key.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.limited","section":"auth","label":"Limited Access registration","instructions":"Repeat with a Limited Access key in DEV; verify its label and access to the features requiring that level.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.reject","section":"auth","label":"Reject unsupported or invalid keys","instructions":"Verify Full Access, unsupported levels and invalid keys are rejected with actionable errors and are not persisted.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.visibility","section":"auth","label":"Show / Hide API key","instructions":"Check registration and Settings fields toggle between masked and visible values without exposing values in reports.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.persist","section":"auth","label":"Session and agreement persistence","instructions":"Accept the current agreement, navigate and reload Torn; authorization restores without another acceptance prompt. Close/reopen the host too.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.renew","section":"auth","label":"Expired session renewal","instructions":"Using a controlled DEV session, verify expiry/renewal respects backend validity and does not accept terms automatically.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.failures","section":"auth","label":"Authentication failure recovery","instructions":"Verify rejected/revoked keys, rate limits and network failures produce clear recovery steps without repeated requests or prompts.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.display","section":"auth","label":"Complete published agreement","instructions":"Compare all displayed content plus version, number and effective date with the published DEV agreement.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.accept","section":"auth","label":"Agreement acceptance record","instructions":"Explicitly accept in DEV and verify the authorized backend confirms the corresponding acceptance event. This tool never submits acceptance.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.cancel","section":"auth","label":"Cancellation and revocation","instructions":"In a dedicated DEV session, cancel acceptance and confirm backend event/revocation, tool access removal and a subsequent valid recovery.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.reaccept","section":"auth","label":"Version-change reacceptance","instructions":"With an approved controlled DEV agreement update, verify old acceptance no longer grants access. Do not modify production or publish terms just to complete this checklist.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.privacy","section":"auth","label":"Credentials stay private","instructions":"Inspect diagnostics, exported backups/reports and console output. Confirm no API keys, bearer tokens or room secrets appear; record no secret values.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.navigation","section":"core","label":"Tools / Settings / About","instructions":"Open each tab, Business Tools, Games single/multiplayer, Chat Tools and War Tools. War Organizer belongs under War Tools. No module installation/catalog controls or removed tools.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.branding","section":"core","label":"Approved gold logo","instructions":"Check the approved no-flare Integrated Gold master in launcher, headers and War Organizer on standard/high-density displays. Check sharpness, proportions, transparent exterior and compact launcher size.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.launcher","section":"core","label":"Launcher visibility and dragging","instructions":"Drag with mouse and touch as applicable; reload to verify position persistence, keep launcher on-screen after rotation/resize.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.windows","section":"core","label":"Window navigation and layout","instructions":"Check Back, Minimize, Restore and Exit, drag/resize, saved positions, viewport bounds, stacking, scrolling and overflow.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.lazy","section":"core","label":"Lazy startup and cleanup","instructions":"Opening one tool should initialize only that tool. Repeat open/close and switch tools; inspect for duplicate windows, listeners, timers and requests. Minimize should preserve the active tool.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.recovery","section":"core","label":"Reload and duplicate injection","instructions":"Reload and test normal Torn SPA navigation; verify one launcher and one instance per tool with no startup exceptions.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"platform.bridges","section":"core","label":"Native host / request bridges","instructions":"In the selected actual host, exercise its real GM legacy/modern or PDA/fetch bridge and isolated/shared page context. A mocked or desktop-browser result cannot prove PDA compatibility.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"data.settings","section":"core","label":"Settings persistence","instructions":"Change time display and tool settings; reload and verify saved values and unaffected historical data.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"data.backup","section":"core","label":"Backup and restoration","instructions":"Export TU-managed data and restore in a controlled DEV profile; verify additive restoration and key exclusion. Separately export/import large archives and legacy data using each tool.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"release.update","section":"core","label":"Single-script update","instructions":"Install/update via rolling DEV URL; confirm version, all ten tools, settings/history, approved logo, and no separate tool installation.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"release.rollback","section":"core","label":"Rollback procedure","instructions":"In a controlled DEV profile, disable the integrated script and restore the previous Manager/tools without clearing storage. Confirm recovery; then return to the target DEV build.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.flight-game.function","section":"tool.flight-game","label":"Flight Game — functional test","instructions":"Play with mouse/keyboard and touch as applicable; check graphics, audio, scoring, pause/end, condition transitions, saved game and restore.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.flight-game.lifecycle","section":"tool.flight-game","label":"Flight Game — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.stick-fighter.function","section":"tool.stick-fighter","label":"Stick Fighter — functional test","instructions":"Play, move/attack, pause/end, score and save/restore. Check touch/multitouch and audio on the selected host.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.stick-fighter.lifecycle","section":"tool.stick-fighter","label":"Stick Fighter — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.chat-archiver.function","section":"tool.chat-archiver","label":"Chat Archiver — functional test","instructions":"Capture live/history chats, select channels, pause/resume/stop, scroll without jumping, preserve records, and verify complete CSV/JSON exports.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.chat-archiver.lifecycle","section":"tool.chat-archiver","label":"Chat Archiver — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.tic-tac-toe.function","section":"tool.tic-tac-toe","label":"Tic-Tac-Toe — functional test","instructions":"Use two separate DEV accounts (up to four for Chaos Marbles). Create/join a fresh DEV room; play a complete game, check rules, turns, scoring/winner, history, reconnect and rematch. Verify account authorization and room tokens; never use production rooms.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.tic-tac-toe.lifecycle","section":"tool.tic-tac-toe","label":"Tic-Tac-Toe — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-four.function","section":"tool.torn-four","label":"Torn Four — functional test","instructions":"Use two separate DEV accounts (up to four for Chaos Marbles). Create/join a fresh DEV room; play a complete game, check rules, turns, scoring/winner, history, reconnect and rematch. Verify account authorization and room tokens; never use production rooms.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-four.lifecycle","section":"tool.torn-four","label":"Torn Four — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-fleet.function","section":"tool.torn-fleet","label":"Torn Fleet — functional test","instructions":"Use two separate DEV accounts (up to four for Chaos Marbles). Create/join a fresh DEV room; play a complete game, check rules, turns, scoring/winner, history, reconnect and rematch. Verify account authorization and room tokens; never use production rooms.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-fleet.lifecycle","section":"tool.torn-fleet","label":"Torn Fleet — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-snake.function","section":"tool.torn-snake","label":"Slithering Streets — functional test","instructions":"Play with desktop and touch controls as applicable; check scoring, game-over, restart and persisted high scores.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-snake.lifecycle","section":"tool.torn-snake","label":"Slithering Streets — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.chaos-marbles.function","section":"tool.chaos-marbles","label":"Chaos Marbles — functional test","instructions":"Use two separate DEV accounts (up to four for Chaos Marbles). Create/join a fresh DEV room; play a complete game, check rules, turns, scoring/winner, history, reconnect and rematch. Verify account authorization and room tokens; never use production rooms.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.chaos-marbles.lifecycle","section":"tool.chaos-marbles","label":"Chaos Marbles — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.function","section":"tool.item-monitor","label":"Travel Assistant and Item Monitor — functional test","instructions":"Select/cancel items, manage watches, trigger quantity/price alerts, verify alarms and persistence. Exercise Travel planning, live DEV reporting, predictions and failure recovery on representative Torn pages.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.lifecycle","section":"tool.item-monitor","label":"Travel Assistant and Item Monitor — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.war-hit-organizer.function","section":"tool.war-hit-organizer","label":"War Organizer — functional test","instructions":"Use a Limited key to exercise faction roster, target/reservation controls, countdowns, refresh, historical data and API errors without automating attacks.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.war-hit-organizer.lifecycle","section":"tool.war-hit-organizer","label":"War Organizer — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]}]},tools=[{"id":"flight-game","name":"Flight Game"},{"id":"stick-fighter","name":"Stick Fighter"},{"id":"chat-archiver","name":"Chat Archiver"},{"id":"tic-tac-toe","name":"Tic-Tac-Toe"},{"id":"torn-four","name":"Torn Four"},{"id":"torn-fleet","name":"Torn Fleet"},{"id":"torn-snake","name":"Slithering Streets"},{"id":"chaos-marbles","name":"Chaos Marbles"},{"id":"item-monitor","name":"Travel Assistant and Item Monitor"},{"id":"war-hit-organizer","name":"War Organizer"}],targetBuild='0.5.42.35-dev';
 const createSession=function createAcceptanceSession({targetBuild,checklistVersion,tests,platform,initial={},clock=()=>new Date().toISOString()}) {
 const allowed=new Set(['pass','fail','skip','blocked','not-tested']);
 const scrub=value=>String(value??'').replace(/\b(?:Bearer|ApiKey)\s+[^\s,;]+/gi,'[REDACTED]')
  .replace(/\b(?:api[_ -]?key|token|secret|authorization)\s*[:=]\s*["']?[^\s,"';]+/gi,'[REDACTED]')
  .replace(/\b[A-Za-z0-9]{16}\b/g,'[REDACTED]').replace(/\b[A-Za-z0-9_-]{24,}(?:\.[A-Za-z0-9_-]+)*\b/g,'[REDACTED]')
  .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi,'[REDACTED]').slice(0,2000);
 const same=initial.targetBuild===targetBuild&&initial.checklistVersion===checklistVersion&&initial.platform===platform;
 const results={};
 if(same)for(const t of tests){const old=initial.results?.[t.id];if(old&&allowed.has(old.status)&&old.kind===t.kind)results[t.id]={status:old.status,kind:t.kind,note:scrub(old.note),at:scrub(old.at)};}
 const meta={device:scrub(same?initial.meta?.device:''),hostVersion:scrub(same?initial.meta?.hostVersion:''),feedback:scrub(same?initial.meta?.feedback:'')};
 return Object.freeze({
  scrub,
  setMeta(values){for(const k of Object.keys(meta))if(k in values)meta[k]=scrub(values[k]);},
  record(id,status,note='',kind='manual'){
   const t=tests.find(t=>t.id===id);if(!t)throw Error('Unknown acceptance check');
   if(!allowed.has(status))throw Error('Invalid result');
   if(t.kind!==kind)throw Error('Check must be recorded by its declared method');
   const clean=scrub(note).trim();if(status!=='not-tested'&&!clean)throw Error('Record observed evidence or a reason before choosing a result');
   results[id]={status,kind,note:clean,at:clock()};
  },
  snapshot(){
   return {schemaVersion:2,targetBuild,checklistVersion,platform,meta:{...meta},results:JSON.parse(JSON.stringify(results))};
  },
  report(){
   const items=tests.map(t=>({id:t.id,label:t.label,section:t.section,critical:t.critical,kind:t.kind,instructions:t.instructions,...(results[t.id]||{status:'not-tested',note:'',at:null})}));
   const counts={pass:0,fail:0,skip:0,blocked:0,'not-tested':0};for(const t of items)counts[t.status]++;
   const platformReady=['pda','tampermonkey'].includes(platform)&&!!meta.device.trim()&&!!meta.hostVersion.trim()&&items.every(t=>!t.critical||(t.status==='pass'&&!!t.note));
   return {...this.snapshot(),results:items,counts,platformReady,productionAuthorized:false,exported:clock()};
  }
 });
};
 const tests=catalog.tests;
 const key='tu:test:acceptance:'+targetBuild+':'+catalog.checklistVersion;
 const positionKey='tu:aio:diagnostics:launcher-position:v1',panelLayoutKey='tu:aio:diagnostics:panel-layout:v1';
 const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
 const detected=(()=>{
  if(/torn[ -]?pda/i.test(navigator.userAgent)||typeof host.PDA_httpGet==='function'||typeof host.PDA_httpPost==='function'||typeof window.PDA_httpGet==='function'||typeof window.PDA_httpPost==='function')return 'pda';
  if(typeof GM_info!=='undefined'&&/tampermonkey/i.test(GM_info.scriptHandler||''))return 'tampermonkey';
  return 'unknown';
 })();
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
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(panel.style.display!=='none')savePanelLayout()}).observe(panel);
  // Torn page styles can override native buttons and inputs; scope explicit typography.
  const font='Arial,Helvetica,sans-serif';
  const heading=document.createElement('div');heading.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:move;touch-action:none;flex-shrink:0;user-select:none;padding-bottom:8px';
  const title=document.createElement('strong');title.textContent='TU Test · DEV acceptance';title.style.cssText='font:700 15px/1.4 '+font+';color:#f4f7fa';
  const close=document.createElement('button');close.textContent='Close';close.style.cssText='font:600 12px/1.35 Arial,Helvetica,sans-serif;color:#fff;background:#344d60;border:1px solid #7892a2;border-radius:5px;padding:6px 10px;cursor:pointer';close.onclick=()=>panel.style.display='none';heading.append(title,close);panel.append(heading);
  let panelDrag=null;
  heading.addEventListener('pointerdown',event=>{if(event.button!==0||event.target===close)return;const rect=panel.getBoundingClientRect();panelDrag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};heading.setPointerCapture?.(event.pointerId);event.preventDefault()});
  heading.addEventListener('pointermove',event=>{if(!panelDrag||event.pointerId!==panelDrag.id)return;panel.style.left=clamp(panelDrag.left+event.clientX-panelDrag.x,0,Math.max(0,innerWidth-60))+'px';panel.style.top=clamp(panelDrag.top+event.clientY-panelDrag.y,0,Math.max(0,innerHeight-50))+'px';panel.style.right='auto';panel.style.bottom='auto'});
  const stopPanelDrag=event=>{if(!panelDrag||event.pointerId!==panelDrag.id)return;panelDrag=null;savePanelLayout()};
  heading.addEventListener('pointerup',stopPanelDrag);heading.addEventListener('pointercancel',stopPanelDrag);
  const content=document.createElement('div');content.style.cssText='flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding-right:4px';panel.append(content);
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;b.style.cssText='font:600 12px Arial;color:#fff;background:#344d60;border:1px solid #7892a2;border-radius:5px;padding:8px;margin:3px;cursor:pointer';return b;};
 const text=(tag,value,parent=content)=>{const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;};
 const notice=text('p','Target '+targetBuild+' · TU Test 0.2.0-dev. Record results only for the actual selected host. Automatic checks are read-only and do not prove gameplay or native bridge compatibility.');
 text('p','Do not paste API keys, session tokens or room secrets into notes. This tool never registers keys, accepts/cancels agreements, creates rooms or modifies backend records.');
 const hostLabel=text('label','Actual test host: ');
 const hostSelect=document.createElement('select');hostSelect.id='tu-test-host';
 for(const [id,label] of [['unknown','Select actual host'],['tampermonkey','Tampermonkey'],['pda','Torn PDA']]){const o=document.createElement('option');o.value=id;o.textContent=label;hostSelect.append(o);}hostSelect.value=platform;hostLabel.append(hostSelect);
 const device=text('input','');device.placeholder='Device / OS / browser';device.id='tu-test-device';
 const hostVersion=text('input','');hostVersion.placeholder='Actual PDA / Tampermonkey version';hostVersion.id='tu-test-host-version';
 for(const e of [device,hostVersion]){e.style.cssText='display:block;width:100%;box-sizing:border-box;padding:8px;margin:6px 0';e.oninput=()=>{session.setMeta({device:device.value,hostVersion:hostVersion.value});save();updateSummary();};}
 const contextWarning=text('p','');
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
 const refreshFields=()=>{const m=session.snapshot().meta;device.value=m.device;hostVersion.value=m.hostVersion;feedback.value=m.feedback;};
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
 const githubAgreement='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/agreements/dev/current.json';
 const workerAgreement='https://tu-multiplayer-server-dev.tuserver.workers.dev/api/auth/agreement/current';
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
 const validAgreement=d=>typeof d?.agreement?.agreement_version==='string'&&d.agreement.agreement_version.trim()&&Number.isSafeInteger(d.agreement.agreement_number)&&d.agreement.agreement_number>0&&/^\d{4}-\d{2}-\d{2}$/.test(d.agreement.agreement_date||'')&&typeof d.content==='string'&&d.content.trim().length>0;
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
   const documents=[];
   for(const [id,url] of [['agreement.github',githubAgreement],['agreement.worker',workerAgreement]]){
    try{const d=JSON.parse(await getText(url));const valid=!!validAgreement(d);documents.push(valid?d:null);setAuto(id,valid?'pass':'fail',valid?'Published '+d.agreement.agreement_version+' #'+d.agreement.agreement_number+' effective '+d.agreement.agreement_date:'Invalid agreement metadata or empty content');}
    catch(e){documents.push(null);setAuto(id,e.blocked?'blocked':'fail',e.blocked?e.message:'Invalid agreement response');}
   }
   const [github,worker]=documents;
   if(!github||!worker)setAuto('agreement.match','blocked','Both valid agreement publications are needed for comparison');
   else{const same=['agreement_version','agreement_number','agreement_date'].every(k=>github.agreement[k]===worker.agreement[k])&&github.content.replace(/\s+/g,' ').trim()===worker.content.replace(/\s+/g,' ').trim();setAuto('agreement.match',same?'pass':'fail',same?'Metadata and full wording match after whitespace normalization':'Published DEV metadata or wording differs');}
  }finally{running=false;runButton.disabled=false;hostSelect.disabled=false;render();}
 }
 const runButton=button('Run read-only checks',runChecks);actions.append(runButton);
 function exportReport(){
  save();const reports={};for(const id of ['tampermonkey','pda'])reports[id]=createSession({targetBuild,checklistVersion:catalog.checklistVersion,tests,platform:id,initial:profiles[id]}).report();
  const report={schemaVersion:2,toolVersion:'0.2.0-dev',targetBuild,checklistVersion:catalog.checklistVersion,detectedHost:detected,userAgent:session.scrub(navigator.userAgent),platforms:reports,acceptanceComplete:Object.values(reports).every(r=>r.platformReady),productionAuthorized:false};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tu-dev-acceptance-'+targetBuild+'-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 actions.append(button('Export both host reports',exportReport),button('Reset selected host',()=>{
  if(!confirm('Clear results for this build and selected host? Export first to retain evidence.'))return;
  delete profiles[platform];loadSession();refreshFields();save();render();
 }));
 launcher.onclick=()=>{if(suppressClick){suppressClick=false;return;}panel.style.display=panel.style.display==='none'?'flex':'none';render();};
 document.body.append(launcher,panel);refreshFields();render();
})();
