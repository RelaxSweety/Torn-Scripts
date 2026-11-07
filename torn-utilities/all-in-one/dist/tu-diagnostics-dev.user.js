// ==UserScript==
// @name         TU Testing and Diagnostics DEV
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.2.9-dev
// @description  Guided DEV acceptance, system information and sanitized travel DOM diagnostics
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
 const catalog={"schemaVersion":2,"checklistVersion":"dev-acceptance-2026-11-07-v7","tests":[{"id":"runtime.build","section":"automatic","label":"Installed DEV build","instructions":"Confirm the installed TU version matches the target release. This checks only the visible version label.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"runtime.registry","section":"automatic","label":"Ten integrated tools registered","instructions":"Read the shared TU API and confirm all ten expected tools are registered; Stock and Calculations must be absent. Registration does not prove a tool works.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"runtime.storage","section":"automatic","label":"Temporary storage roundtrip","instructions":"Write, read and remove only a temporary TU Test key; do not touch tool data.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"source.bundle","section":"automatic","label":"Published single-script DEV artifact","instructions":"Check release metadata, ten bundled factory markers, removed tool exclusion and DEV-only backend URLs. This is a source check, not runtime validation.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.github","section":"automatic","label":"GitHub published agreement","instructions":"Read the small published DEV agreement version.json metadata file. Full agreement text is not fetched by this automatic check.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.worker","section":"automatic","label":"DEV Worker published agreement","instructions":"Ask the authenticated TU Manager for a read-only DEV agreement-status check. Confirm its published version; the tool does not receive keys/tokens or download full text. If authentication is unavailable, mark BLOCKED.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.match","section":"automatic","label":"Agreement version consistency","instructions":"Compare the published agreement_version values only. Wording, number and effective-date fields are not compared for this verification. Full agreement remains available for user review in TU.","kind":"automatic","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.public","section":"auth","label":"Public Only registration","instructions":"In DEV, register using a Public Only key. Verify the server-confirmed access label and accepted current agreement. Record outcome only; never paste the key.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.limited","section":"auth","label":"Limited Access registration","instructions":"Repeat with a Limited Access key in DEV; verify its label and access to the features requiring that level.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.reject","section":"auth","label":"Reject unsupported or invalid keys","instructions":"Verify Full Access, unsupported levels and invalid keys are rejected with actionable errors and are not persisted.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.keyinventory","section":"auth","label":"Saved keys and verified per-key labels","instructions":"Save at least two Public Only and two Limited Access keys. Verify each is listed once with its own Torn-verified access level and owner, even after reload. Adding a key must leave the current login unchanged. Recheck legacy keys; explicitly switch the login and War Organizer key, and verify other keys remain saved.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.keyremoval","section":"auth","label":"Remove one key without losing others","instructions":"Remove an inactive key and verify every copy is removed while other keys and the login remain. Remove the active login in a dedicated DEV session: cancellation must be confirmed before deletion, other saved keys must remain, and the deleted key must not return after reload through GM or legacy storage. Cancellation/network failure must retain the active key.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.visibility","section":"auth","label":"Show / Hide API key","instructions":"Check registration and Settings fields toggle between masked and visible values without exposing values in reports.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.persist","section":"auth","label":"Session and agreement persistence","instructions":"Accept the current agreement, navigate and reload Torn; authorization restores without another acceptance prompt. With a fresh session cache, verify no repeated key/profile or full agreement downloads. After the five-minute verification cache expires, confirm a metadata status check on activity/resume. Closing the host may require normal session restoration.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.renew","section":"auth","label":"Expired session renewal","instructions":"Use a controlled DEV session to verify expired tokens renew once through the Manager, backend revocation stops access, cross-tab logout clears cached access, and changed agreement versions require explicit acceptance. TU Test read-only version checking must never register or accept automatically.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.failures","section":"auth","label":"Authentication failure recovery","instructions":"Verify rejected/revoked keys, rate limits and network failures produce clear recovery steps without repeated requests or prompts.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.display","section":"auth","label":"Complete published agreement","instructions":"Compare all displayed content plus version, number and effective date with the published DEV agreement.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.accept","section":"auth","label":"Agreement acceptance record","instructions":"After explicitly accepting in DEV, inspect an authorized backend response or event record confirming the acceptance event for the current agreement. Record the event type, agreement version and confirmation timestamp without credentials. Successful UI access alone does not pass this check; mark BLOCKED if backend evidence is unavailable. This tool never submits acceptance.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.cancel","section":"auth","label":"Cancellation and revocation","instructions":"In a dedicated DEV session, cancel acceptance and confirm backend event/revocation, tool access removal and a subsequent valid recovery.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"agreement.reaccept","section":"auth","label":"Version-change reacceptance","instructions":"With an approved controlled DEV agreement update, verify old acceptance no longer grants access. Do not modify production or publish terms just to complete this checklist.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"auth.privacy","section":"auth","label":"Credentials stay private","instructions":"Inspect diagnostics, exported backups/reports and console output. Confirm no API keys, bearer tokens or room secrets appear; record no secret values.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.navigation","section":"core","label":"Tools / Settings / About","instructions":"Open each tab, Business Tools, Games single/multiplayer, Chat Tools and War Tools. War Organizer belongs under War Tools. No module installation/catalog controls or removed tools.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.branding","section":"core","label":"Approved gold logo","instructions":"Check the approved no-flare Integrated Gold master in launcher, headers and War Organizer on standard/high-density displays. Check sharpness, proportions, transparent exterior and compact launcher size. About must not include a full-resolution logo link.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.launcher","section":"core","label":"Launcher visibility and dragging","instructions":"Drag with mouse and touch as applicable; reload to verify position persistence, keep launcher on-screen after rotation/resize.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.windows","section":"core","label":"Window navigation and layout","instructions":"Check Back, Minimize, Restore and Exit, drag/resize, saved positions, viewport bounds, stacking, scrolling and overflow.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.lazy","section":"core","label":"Lazy startup and cleanup","instructions":"With Manager and tools closed, verify no authorization polling interval, connected Manager DOM observers or background tool initialization. Opening a tool should initialize only that tool; Torn page-content observers should exist only for activated tools that need them. Repeat close/Exit/switch and verify observers/timers stop. Minimizing an active monitor may preserve its intended monitoring.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"core.recovery","section":"core","label":"Reload and duplicate injection","instructions":"Reload and test normal Torn SPA navigation; verify one launcher and one instance per tool with no startup exceptions.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"platform.bridges","section":"core","label":"Native host / request bridges","instructions":"In the selected actual host, exercise its real GM legacy/modern or PDA/fetch bridge and isolated/shared page context. A mocked or desktop-browser result cannot prove PDA compatibility.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"data.settings","section":"core","label":"Settings persistence","instructions":"Change time display and tool settings; reload and verify saved values and unaffected historical data.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"data.backup","section":"core","label":"Backup and restoration","instructions":"Export TU-managed data and restore in a controlled DEV profile; verify additive restoration and key exclusion. Separately export/import large archives and legacy data using each tool.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"release.update","section":"core","label":"Single-script update","instructions":"Install/update via rolling DEV URL; confirm version, all ten tools, settings/history, approved logo, and no separate tool installation.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"release.rollback","section":"core","label":"Rollback procedure","instructions":"In a controlled DEV profile, disable the integrated script and restore the previous Manager/tools without clearing storage. Confirm recovery; then return to the target DEV build.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.flight-game.function","section":"tool.flight-game","label":"Flight Game — functional test","instructions":"Play with mouse/keyboard and touch as applicable; check graphics, audio, scoring, pause/end, condition transitions, saved game and restore.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.flight-game.lifecycle","section":"tool.flight-game","label":"Flight Game — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.stick-fighter.function","section":"tool.stick-fighter","label":"Stick Fighter — functional test","instructions":"Play, move/attack, pause/end, score and save/restore. Check touch/multitouch and audio on the selected host.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.stick-fighter.lifecycle","section":"tool.stick-fighter","label":"Stick Fighter — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.chat-archiver.function","section":"tool.chat-archiver","label":"Chat Archiver — functional test","instructions":"Capture live/history chats, select channels, pause/resume/stop, scroll without jumping, preserve records, and verify complete CSV/JSON exports.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.chat-archiver.lifecycle","section":"tool.chat-archiver","label":"Chat Archiver — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.tic-tac-toe.function","section":"tool.tic-tac-toe","label":"Tic-Tac-Toe — functional test","instructions":"Use two separate DEV accounts (up to four for Chaos Marbles). Create/join a fresh DEV room; play a complete game, check rules, turns, scoring/winner, history, reconnect and rematch. Verify account authorization and room tokens; never use production rooms.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.tic-tac-toe.lifecycle","section":"tool.tic-tac-toe","label":"Tic-Tac-Toe — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-four.function","section":"tool.torn-four","label":"Torn Four — functional test","instructions":"Use two separate DEV accounts (up to four for Chaos Marbles). Create/join a fresh DEV room; play a complete game, check rules, turns, scoring/winner, history, reconnect and rematch. Verify account authorization and room tokens; never use production rooms.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-four.lifecycle","section":"tool.torn-four","label":"Torn Four — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-fleet.function","section":"tool.torn-fleet","label":"Torn Fleet — functional test","instructions":"Use two separate DEV accounts (up to four for Chaos Marbles). Create/join a fresh DEV room; play a complete game, check rules, turns, scoring/winner, history, reconnect and rematch. Verify account authorization and room tokens; never use production rooms.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-fleet.lifecycle","section":"tool.torn-fleet","label":"Torn Fleet — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-snake.function","section":"tool.torn-snake","label":"Slithering Streets — functional test","instructions":"Play with desktop and touch controls as applicable; check scoring, game-over, restart and persisted high scores.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.torn-snake.lifecycle","section":"tool.torn-snake","label":"Slithering Streets — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.chaos-marbles.function","section":"tool.chaos-marbles","label":"Chaos Marbles — functional test","instructions":"Use two separate DEV accounts (up to four for Chaos Marbles). Create/join a fresh DEV room; play a complete game, check rules, turns, scoring/winner, history, reconnect and rematch. Verify account authorization and room tokens; never use production rooms.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.chaos-marbles.lifecycle","section":"tool.chaos-marbles","label":"Chaos Marbles — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.function","section":"tool.item-monitor","label":"Travel Assistant and Item Monitor — functional test","instructions":"Select/cancel items, manage watches, trigger quantity/price alerts, verify alarms and persistence. Exercise Travel planning, live DEV reporting, predictions and failure recovery on representative Torn pages.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.lifecycle","section":"tool.item-monitor","label":"Travel Assistant and Item Monitor — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.war-hit-organizer.function","section":"tool.war-hit-organizer","label":"War Organizer — functional test","instructions":"Use a Limited key to exercise faction roster, target/reservation controls, countdowns, refresh, historical data and API errors without automating attacks.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.war-hit-organizer.lifecycle","section":"tool.war-hit-organizer","label":"War Organizer — lifecycle and saved data","instructions":"Open, minimize, restore, Back, Exit, switch away and reopen this tool repeatedly. Check viewport/scroll/touch behavior, one instance, saved data and cessation of polling/listeners after Exit. Verify no late errors or duplicate requests.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.alarm-minimized","section":"tool.item-monitor","label":"Alarm preserves minimized window","instructions":"Minimize Travel Assistant with an active watch. Trigger an alarm while Torn is actively viewed; sound/status must update without restoring the main window. Restore manually and repeat; Exit stops monitoring.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.filter","section":"tool.item-monitor","label":"Show monitored items only","instructions":"Verify the checkbox sits beside Show monitored items only. On a foreign shop with unmonitored rows before monitored rows, enable it. Monitored items including zero-stock rows collect at the top of the item list with no empty slots; other entire item containers hide. Change watches and dynamic rows; disable or Exit restores all native rows in original order. Check native nested LI and table layouts.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.snatch-setup","section":"tool.item-monitor","label":"Snatch and Run eligibility and selection","instructions":"Verify domestic/in-flight states cannot arm. Abroad, select a monitored foreign item and answer hospital status. Hospital users select a labeled medical item with a Limited login. Arm: main window minimizes and exactly one red Snatch and Run button appears. Clicking red does nothing. No native-control selection buttons or floating status panel exist.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.snatch-heal","section":"tool.item-monitor","label":"Snatch and Run hospital release","instructions":"Selected stock alarm turns the single button green, labeled Heal from Hospital for hospitalized users. One trusted click automatically matches and uses only the selected visible native medical item once. It waits for confirmed release, then shows Purchase Max. No-hospital users skip healing. Changed/ambiguous/unavailable controls block without selecting alternatives; native confirmations stay manual.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.snatch-buy","section":"tool.item-monitor","label":"Snatch and Run Max and purchase confirmation","instructions":"Purchase Max is offered after confirmed release (or No selected). One trusted click automatically matches Buy for the monitored row, sets a verified native Max and delegates Buy once. Wrong rows, ambiguous/disabled/missing controls, stale stock and hidden/unfocused pages block. Only a new matching purchase confirmation enables Return to Torn.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]},{"id":"tool.item-monitor.snatch-return","section":"tool.item-monitor","label":"Snatch and Run return and cleanup","instructions":"After confirmed purchase the same green button shows Return to Torn. One trusted click automatically matches the visible native return control and delegates once; flight status must confirm return. Native dialogs/navigation may need manual action. Test Cancel from restored setup, Exit, expiry, player changes and reload; no automatic gameplay actions or stuck hidden rows. Record PDA and Tampermonkey separately.","kind":"manual","critical":true,"platforms":["tampermonkey","pda"]}]},tools=[{"id":"flight-game","name":"Flight Game"},{"id":"stick-fighter","name":"Stick Fighter"},{"id":"chat-archiver","name":"Chat Archiver"},{"id":"tic-tac-toe","name":"Tic-Tac-Toe"},{"id":"torn-four","name":"Torn Four"},{"id":"torn-fleet","name":"Torn Fleet"},{"id":"torn-snake","name":"Slithering Streets"},{"id":"chaos-marbles","name":"Chaos Marbles"},{"id":"item-monitor","name":"Travel Assistant and Item Monitor"},{"id":"war-hit-organizer","name":"War Organizer"}],targetBuild='0.5.42.42-dev';
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
 const detectEnvironment=function detectTestEnvironment({userAgent='',platform='',maxTouchPoints=0,uaData=null,gmInfo=null,pdaBridge=false}={}) {
 const ua=String(userAgent),version=v=>typeof v==='string'&&/^\d+(?:[._]\d+)*(?:[-+][\w.-]+)?$/.test(v)?v.replaceAll('_','.'):null;
 const match=re=>version(re.exec(ua)?.[1]);
 let os={name:'Unknown OS',version:null,source:'unavailable'},device={type:'unknown',model:null,source:'unavailable'};
 const desktopIPad=/Mac/i.test(platform)&&maxTouchPoints>1;
 if(/Android/i.test(ua)){os={name:'Android',version:match(/Android\s+([\d.]+)/i),source:'user-agent'};device={type:/Mobile/i.test(ua)?'phone':'tablet',model:null,source:'user-agent'};const model=/Android[^;)]*;\s*(?:[A-Za-z]{2}[-_][A-Za-z]{2};\s*)?([^;)]+)/.exec(ua)?.[1]?.replace(/\s+Build\/.*$/,'').trim();if(model&&!/^(K|wv|Linux|Mobile)$/i.test(model))device.model=model;}
 else if(/iPhone|iPad|iPod/i.test(ua)||desktopIPad){const tablet=/iPad/i.test(ua)||desktopIPad;os={name:tablet?'iPadOS':'iOS',version:desktopIPad?null:match(/(?:CPU (?:iPhone )?OS|iPhone OS)\s+([\d_]+)/i),source:'user-agent'};device={type:tablet?'tablet':'phone',model:tablet?'iPad family':'iPhone/iPod family',source:desktopIPad?'desktop-mode touch signals':'user-agent'};}
 else if(/Windows NT/i.test(ua)){const nt=match(/Windows NT ([\d.]+)/);os={name:nt==='10.0'?'Windows 10/11':'Windows',version:nt==='10.0'?null:nt,source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/Mac OS X/i.test(ua)){os={name:'macOS',version:match(/Mac OS X\s+([\d_]+)/),source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/CrOS/i.test(ua)){os={name:'ChromeOS',version:match(/CrOS \S+ ([\d.]+)/),source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/Linux/i.test(ua)){os={name:'Linux',version:null,source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 let browser={name:'Unknown browser',version:null,source:'unavailable'};
 for(const [name,re] of [['Edge',/(?:Edg|EdgA|EdgiOS)\/([\d.]+)/],['Opera',/(?:OPR|OPiOS)\/([\d.]+)/],['Samsung Internet',/SamsungBrowser\/([\d.]+)/],['Firefox',/(?:Firefox|FxiOS)\/([\d.]+)/],['Chrome',/(?:Chrome|CriOS)\/([\d.]+)/],['Safari',/Version\/([\d.]+).*Safari\//]]){const v=match(re);if(v){browser={name,version:v,source:'user-agent'};break;}}
 if(/Android/i.test(ua)&&/; wv\)/.test(ua)&&browser.name==='Chrome')browser.name='Android WebView (Chromium)';
 if(browser.name==='Unknown browser'&&/AppleWebKit\//.test(ua))browser={name:'WebKit webview',version:match(/AppleWebKit\/([\d.]+)/),source:'user-agent engine version'};
 if(uaData&&typeof uaData==='object'){
  if(typeof uaData.model==='string'&&uaData.model.trim())device={...device,model:uaData.model.trim(),source:'client-hints'};
  if(!desktopIPad&&typeof uaData.platform==='string'&&uaData.platform.trim()){
   os={name:uaData.platform,version:version(uaData.platformVersion),source:uaData.platformVersion?'client-hints platform version':'client-hints'};
   if(uaData.platform==='Windows'&&!os.version)os.name='Windows (version unavailable)';
  }
  const brands=Array.isArray(uaData.fullVersionList)?uaData.fullVersionList:uaData.brands;
  if(Array.isArray(brands))for(const [brand,name] of [['Microsoft Edge','Edge'],['Opera','Opera'],['Google Chrome','Chrome'],['Chromium','Chromium']]){
   const found=brands.find(b=>b?.brand===brand&&version(b.version));
   if(found){if(browser.name==='Unknown browser'||browser.name===name||(name==='Chromium'&&browser.name==='Android WebView (Chromium)'))browser={...browser,name:browser.name==='Android WebView (Chromium)'?browser.name:name,version:version(found.version),source:Array.isArray(uaData.fullVersionList)?'client-hints full version':'client-hints major version'};break;}
  }
 }
 const pdaVersion=match(/Torn[ _-]?PDA[\s/:;-]+v?([\d.]+)/i);
 const isPda=!!pdaBridge||/Torn[ _-]?PDA/i.test(ua);
 let host={id:'unknown',name:'Unknown host',version:null,source:'unavailable'};
 if(isPda)host={id:'pda',name:'Torn PDA',version:pdaVersion,source:pdaVersion?'user-agent app token':pdaBridge?'PDA bridge (version unavailable)':'user-agent (version unavailable)'};
 else if(/tampermonkey/i.test(gmInfo?.scriptHandler||''))host={id:'tampermonkey',name:'Tampermonkey',version:version(gmInfo.version),source:gmInfo.version?'GM_info.version':'GM_info.scriptHandler (version unavailable)'};
 return {device,os,browser,host};
};
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
 const notice=text('p','Target '+targetBuild+' · TU Test 0.2.9-dev. Record results only for the actual selected host. Automatic checks are read-only and do not prove gameplay or native bridge compatibility.');
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
 const travelSection=document.createElement('section');travelSection.id='tu-test-travel-dom';content.append(travelSection);
 text('h3','Snatch and Run · DOM diagnostic',travelSection);
 text('p','Capture the manual Heal, Yes/No, Max/Buy and Return stages separately. Choose a stage, press Select region, then tap the relevant Torn control or dialog. That selection tap is blocked: it does not use, buy, confirm or travel. Perform gameplay manually afterward. Captures stay in this tab across navigation; export before closing it. Maximum 20 captures. Review JSON before sharing.',travelSection);
 const travelStage=document.createElement('select');travelStage.setAttribute('aria-label','Travel DOM capture stage');travelStage.style.cssText='width:100%;padding:8px';travelSection.append(travelStage);
 const travelNotice=text('p','No DOM capture runs automatically.',travelSection);
 const createTravelDiagnostic=function createTravelDomDiagnostic({document,window,scrub,storageKey,getMeta,onChange=()=>{}}){
 const stages=['Foreign page / hospitalized','Selected healing item / Use control','Heal Yes/No confirmation','Hospital release result','Monitored item / Max and Buy','Purchase Yes/No confirmation','Purchase result','Return to Torn control / confirmation','Return flight result','Failed Snatch and Run attempt'];
 const clean=value=>scrub(String(value??'')).replace(/https?:\/\/[^\s<>"']+/gi,'[URL OMITTED]').replace(/\b[A-Za-z0-9_=-]{24,}\b/g,'[REDACTED]').slice(0,600);
 const skip='script,style,noscript,iframe,svg,canvas,img,video,audio,link,meta,textarea,[contenteditable],input[type=hidden],input[type=password],input[type=email],[autocomplete=current-password],[autocomplete=new-password]';
 function markup(root){let count=0,truncated=false;const out=document.createElement('div');
  function copy(node,depth){if(++count>160||depth>9){truncated=true;return null;}if(node.nodeType===3)return document.createTextNode(clean(node.nodeValue));if(node.nodeType!==1||node.matches(skip))return null;
   const e=document.createElement(node.tagName.toLowerCase());
   for(const name of ['id','name','class','role','title','type','aria-label','aria-controls','aria-expanded','aria-disabled','data-item-id','data-itemid','data-item-uid','data-id','min','max']){
    if(!node.hasAttribute(name))continue;let value=node.getAttribute(name);if(name.startsWith('data-')&&!/^\d+$/.test(value))continue;if(name==='type'&&!/^(button|submit|number|text|checkbox|radio)$/i.test(value))continue;e.setAttribute(name,clean(value));
   }
   if(node.disabled)e.setAttribute('disabled','');
   // Input values, URLs, form actions, handlers and arbitrary data attributes are deliberately omitted.
   for(const child of node.childNodes){const c=copy(child,depth+1);if(c)e.append(c);if(count>160)break;}
   return e;
  }
  const node=copy(root,0);if(node)out.append(node);const html=out.innerHTML;return {html:html.slice(0,16000),truncated:truncated||html.length>16000,nodes:Math.min(count,160)};
 }
 let captures=[],cancel=null,shield=null;
 const persist=()=>{try{window.sessionStorage.setItem(storageKey,JSON.stringify(captures));}catch{onChange('Capture kept in memory only; export before navigation.');}};
 try{const saved=JSON.parse(window.sessionStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))for(const record of saved.slice(-20)){
  if(!stages.includes(record.stage)||typeof record.html!=='string')continue;const template=document.createElement('template');template.innerHTML=record.html.slice(0,16000);const safe=markup(template.content.firstElementChild||document.createElement('div'));
  captures.push({stage:record.stage,at:clean(record.at),host:clean(record.host),installedBuild:clean(record.installedBuild),path:clean(record.path).split(/[?#]/)[0],...safe});
 }}catch{}
 function capture(stage,target){
  if(!stages.includes(stage))throw Error('Select a capture stage');
  if(document.hidden||!target?.isConnected||target.closest('#tu-test-dev-panel,#tu-test-dev-toggle'))throw Error('Select a visible Torn page region');
  const region=target.closest('[role=dialog],dialog,[aria-modal=true],.confirm-wrap,[class*=confirm i]:not(button):not(a):not(input),[data-item-id],[data-itemid],tr,[role=row],li')||(target.parentElement?.matches('html,body,main')?target:target.parentElement)||target;
  if(region.matches('html,body')||target.matches('html,body'))throw Error('Select the specific item, control or confirmation, not the full page');
  const entry={stage,at:new Date().toISOString(),host:clean(getMeta().host),installedBuild:clean(getMeta().installedBuild),path:window.location.pathname,...markup(region)};
  captures.push(entry);captures=captures.slice(-20);persist();onChange('Captured '+stage+' ('+captures.length+'/20).');return entry;
 }
 function stop(){cancel?.();shield?.();}
 function pick(stage,done){stop();let timer;
  const finish=()=>{for(const kind of ['pointerdown','mousedown','touchstart'])document.removeEventListener(kind,blockStart,true);for(const kind of ['pointerup','mouseup','touchend'])document.removeEventListener(kind,end,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);window.clearTimeout(timer);cancel=null;done?.();};
  const click=event=>{if(event.target.closest('#tu-test-dev-panel'))return;event.preventDefault();event.stopImmediatePropagation();if(!event.target.closest('#tu-test-dev-toggle')){try{capture(stage,event.target);}catch(error){onChange(error.message);}}finish();};
  const blockStart=event=>{if(event.target.closest('#tu-test-dev-panel'))return;event.preventDefault();event.stopImmediatePropagation();};
  const end=event=>{if(event.target.closest('#tu-test-dev-panel'))return;click(event);const block=e=>{e.preventDefault();e.stopImmediatePropagation();};let until;shield=()=>{for(const kind of ['click','mouseup','touchend'])document.removeEventListener(kind,block,true);window.clearTimeout(until);shield=null;};for(const kind of ['click','mouseup','touchend'])document.addEventListener(kind,block,true);until=window.setTimeout(()=>shield?.(),600);};
  const key=event=>{if(event.key==='Escape'){event.preventDefault();finish();}};
  cancel=finish;for(const kind of ['pointerdown','mousedown','touchstart'])document.addEventListener(kind,blockStart,{capture:true,passive:false});for(const kind of ['pointerup','mouseup','touchend'])document.addEventListener(kind,end,{capture:true,passive:false});document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);timer=window.setTimeout(finish,30000);
 }
 return {stages,markup,capture,pick,stop,report:()=>({schemaVersion:1,readOnly:true,captures:captures.map(c=>({...c})),limits:{maxCaptures:20,maxNodes:160,maxDepth:9,maxHtmlCharacters:16000},excluded:['input values','URLs and query strings','cookies and credentials','network requests','full-page HTML']}),clear(){stop();captures=[];try{window.sessionStorage.removeItem(storageKey);}catch{}onChange('DOM captures cleared.');}};
};
 const travelDiagnostic=createTravelDiagnostic({document,window,scrub:value=>session.scrub(value),storageKey:'tu:test:travel-dom:'+targetBuild+':v1',getMeta:()=>({host:platform,installedBuild:currentBuild()||'unavailable'}),onChange:message=>{travelNotice.textContent=message;}});
 for(const stage of travelDiagnostic.stages){const option=document.createElement('option');option.value=stage;option.textContent=stage;travelStage.append(option);}
 travelNotice.textContent=travelDiagnostic.report().captures.length+' saved DOM captures in this tab. No automatic page monitoring.';
 travelSection.append(button('Select region to capture',()=>{panel.style.display='none';launcher.title='Tap a Torn control/dialog to capture it without executing. Tap TU Test or press Escape to cancel.';travelDiagnostic.pick(travelStage.value,()=>{panel.style.display='flex';launcher.title='Open independent TU diagnostics';});}),button('Export travel DOM and system info',()=>exportReport()),button('Clear travel DOM captures',()=>travelDiagnostic.clear()));
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
  const report={schemaVersion:2,toolVersion:'0.2.9-dev',targetBuild,installedBuild:currentBuild()||null,viewport:{width:window.innerWidth,height:window.innerHeight,devicePixelRatio:window.devicePixelRatio},checklistVersion:catalog.checklistVersion,detectedHost:detected,detectedEnvironment:Object.fromEntries(Object.entries(environment).map(([k,fields])=>[k,Object.fromEntries(Object.entries(fields).map(([name,value])=>[name,typeof value==='string'?session.scrub(value):value]))])),userAgent:session.scrub(navigator.userAgent),platforms:reports,acceptanceComplete:Object.values(reports).every(r=>r.platformReady),productionAuthorized:false,travelDom:travelDiagnostic.report()};
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
