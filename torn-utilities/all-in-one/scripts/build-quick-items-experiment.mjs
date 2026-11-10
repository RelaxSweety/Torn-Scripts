import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createTravelRequestCapture} from '../src/experimental/travel-request-capture.js';
import {createDirectQuickItems} from '../src/experimental/direct-quick-items.js';
import {createSnatchDirectItems} from '../src/experimental/snatch-direct-items.js';
import {createSteppedNativeActions} from '../src/experimental/stepped-native-actions.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(base,'../..');
const cfg=JSON.parse(fs.readFileSync(path.join(base,'config/quick-items-experiment.json'),'utf8'));
const originalPath=path.join(root,`torn-utilities/releases/dev/torn-utilities-${cfg.baseBuild}.user.js`),original=fs.readFileSync(originalPath,'utf8');
const fingerprint=crypto.createHash('sha256').update(original).digest('hex');
if(!original.includes('// @version      '+cfg.baseBuild))throw Error('Base build mismatch');
let output=original.replaceAll(cfg.baseBuild,cfg.version).replaceAll('1.12.36-dev',cfg.itemMonitorVersion);
output=output.replace('^\\d+(?:\\.\\d+){3}-dev$', '^\\d+(?:\\.\\d+){3}-(?:dev|quickitems-test\\.\\d+)$');
output=output.replace(/^\/\/ @name\s+.*$/m,'// @name         '+cfg.name).replace(/^\/\/ @namespace\s+.*$/m,'// @namespace    '+cfg.namespace).replace(/^\/\/ @description\s+.*$/m,'// @description  Separate personal Quick Items POST test; disable other TU scripts; experimental Snatch healing and hospitalization use direct requests');
for(const key of ['updateURL','downloadURL'])output=output.replace(new RegExp('^// @'+key+'\\s+.*$','m'),'// @'+key+'    '+cfg.url);
const notes={version:cfg.version,date:'2026-11-09',changes:{'Experimental direct Quick Items':['Based on '+cfg.baseBuild+'; separately named and separately updated','Personal medical item POST from one explicit click; no automatic retries','Early page-world request hooks, pointer controls and resource/counter coverage evidence','Request timing and uncertainty logs are included in Report Generation','Snatch healing and hospitalization use the direct blood bag adapter with live slot and profile status checks']}};
output=output.replace(/const TU_RELEASES=(\[.*\]);/,()=>{const source=original.match(/const TU_RELEASES=(\[.*\]);/);return 'const TU_RELEASES='+JSON.stringify([notes,...JSON.parse(source[1])])+';';});
const marker='const TU_INTEGRATED_BUILD='+JSON.stringify(cfg.version)+';';
if(output.split(marker).length!==2)throw Error('Item Monitor integration marker mismatch');
output=output.replace(marker,'const createSteppedNativeActions='+createSteppedNativeActions.toString()+';\nconst createSnatchDirectItems='+createSnatchDirectItems.toString()+';\nconst createTravelRequestCapture='+createTravelRequestCapture.toString()+';\nconst createDirectQuickItems='+createDirectQuickItems.toString()+';\n'+marker);
const factoryMarker='/* Integrated tool: item-monitor (';const factoryStart=output.indexOf(factoryMarker);const factoryBody=output.indexOf('(()=>{',factoryStart)+'(()=>{'.length;if(factoryStart<0)throw Error('Item Monitor factory missing');output=output.slice(0,factoryBody)+'\nconst quickItemCapturePage=typeof unsafeWindow!==\'undefined\'?unsafeWindow:window;'+output.slice(factoryBody);
const menu="B(p,'Open Item Monitor',()=>{state.lastView='monitor';sessionStorage.setItem('tu:item-monitor:view:v1','monitor');tuModuleOpen('tuim-panel');diagnosticStart();});";
if(!output.includes(menu))throw Error('Menu integration changed');
output=output.replace(menu,menu+"E('h3',p,'Experimental Direct Requests');E('p',p,'Experimental Snatch blood bag actions use direct requests with fresh slot and hospital status checks.');B(p,'Open Direct Quick Items Test',()=>{diagnosticStart();quickItemTest.open();});");
output=output.replace('const hospitalUntil=hospitalClock?.read()||snatchContext?.hospitalUntil||null;', 'const hospitalUntil=nativeState?.hospitalUntil||hospitalClock?.read()||snatchContext?.hospitalUntil||null;');
output=output.replace('return {ownerId,hospitalUntil,hospitalClock:', 'return {ownerId,directItemConsumed:!!nativeState?.directItemConsumed,directItemUncertain:!!nativeState?.directItemUncertain,hospitalUntil,hospitalClock:');
output=output.replace('if(!run)return;const s=getSnapshot();', 'if(!run)return;const s=getSnapshot();if(s.directItemUncertain){refresh();return;}');
output=output.replace('enhancements?.check();return snatchContext;', 'nativeActions.observeProfile?.(profile);enhancements?.check();return snatchContext;');
output=output.replace("if(run.stage==='heal-pending'&&s.hospitalized===false){", "if(run.stage==='heal-pending'&&s.directItemConsumed&&s.hospitalized===true){clearStatusTimer();run.stage='heal';persist();}if(run.stage==='heal-pending'&&s.hospitalized===false){");
// A known non-hospital status after consumption is an outcome, not an endless pending state.
output=output.replace("if(kind==='hospitalize'&&result.hospitalized){", "if(kind==='hospitalize'&&result.hospitalizationNotApplied){run.extensionPending=false;run.hospitalizedConfirmed=false;run.hospitalUntil=null;run.stage='waiting';}if(kind==='hospitalize'&&result.hospitalized){");
output=output.replace("kind==='hospitalize'?'Hospitalization confirmed. Waiting for available stock.'", "kind==='hospitalize'?(result.hospitalizationNotApplied?'Item consumed. Torn reports you are not hospitalized. Waiting for available stock; no additional item will be used automatically.':result.extensionUnchanged?'Item consumed. Torn still reports the existing hospital deadline; no extension is confirmed. Waiting for available stock.':'Hospitalization confirmed. Waiting for available stock.')");
output=output.replace("if(run.stage==='hospitalize-pending'&&s.hospitalized===true", "if(run.stage==='hospitalize-pending'&&s.directItemConsumed&&s.hospitalized===false){clearStatusTimer();run.extensionPending=false;run.hospitalizedConfirmed=false;run.hospitalUntil=null;run.stage='waiting';persist();notice('Item consumed. Torn reports you are not hospitalized. Waiting for available stock.');}if(run.stage==='hospitalize-pending'&&s.hospitalized===true");
// Keep arming failures visible beside the clicked button, including pre-departure rejection.
const armLine=output.match(/^  add\('Arm Snatch and Run'.*$/m)?.[0];
if(!armLine)throw Error('Arm feedback integration marker changed');
const armFeedback="  const armFeedback=document.createElement('p');armFeedback.id='tuim-arm-feedback';armFeedback.setAttribute('role','alert');armFeedback.setAttribute('aria-live','assertive');armFeedback.hidden=true;armFeedback.style.cssText='padding:12px;border:2px solid #ec8585;background:#5c2020;color:white;white-space:pre-wrap';section.append(armFeedback);\n";
const improvedArm=armLine.replace("add('Arm Snatch and Run',async()=>{try{", "const armButton=add('Arm Snatch and Run',async()=>{armFeedback.hidden=true;armButton.disabled=true;try{").replace('catch(error){notice(error.message);}});', "catch(error){notice(error.message);armFeedback.textContent=error.message;armFeedback.hidden=false;armFeedback.scrollIntoView?.({block:'nearest'});}finally{armButton.disabled=false;}});");
if(improvedArm===armLine)throw Error('Arm feedback replacement failed');
output=output.replace(armLine,armFeedback+improvedArm);
output=output.replace("throw Error('A confirmed foreign destination or current foreign location is required');", "throw Error([...document.querySelectorAll('#travel-root h1,#travel-root h2,#travel-root h3,#travel-root h4')].some(node=>/^travel agency$/i.test(node.textContent.trim()))?'Start your outbound flight first, then arm Snatch and Run while flying or abroad. Item setup can be completed here, but arming is unavailable before departure from Torn.':'Cannot verify your foreign destination or player status. Confirm you are on an outbound flight or abroad, then retry Arm.');");
// Native action chains yield before every additional Torn control click.
const nativeStart=output.indexOf('const createNativeTravelActions=function createNativeTravelActions('),nativeEnd=output.indexOf('\n};',nativeStart)+3;
if(nativeStart<0||nativeEnd<3)throw Error('Native stepping factory marker changed');
let nativeFactory=output.slice(nativeStart,nativeEnd);
nativeFactory=nativeFactory.replace('extendHospital=false,onEvent=()=>{}})', 'extendHospital=false,onEvent=()=>{},awaitAction=null})');
nativeFactory=nativeFactory.replace('const click=e=>{ensure();', "let stepValidation=null;const click=async (e,mutating=false)=>{if(awaitAction)await awaitAction(label(e));ensure();const freshState=getSnapshot();if(['buy','destroy'].includes(kind)&&freshState.hospitalized!==false)throw Error('Hospital status changed before the next Torn step');if(stepValidation)stepValidation(e);");
nativeFactory=nativeFactory.replace(/(?<![.\w])click\(/g,'await click(');
nativeFactory=nativeFactory.replace(/submitted=true;await click\(([^;]+)\);/g,'await click($1,true);').replace('e.click();};', 'if(mutating)submitted=true;e.click();};');
nativeFactory=nativeFactory.replace('submitted=false;\n    let s=getSnapshot();', 'submitted=false;stepValidation=null;\n    let s=getSnapshot();');
nativeFactory=nativeFactory.replace('await click(yes,true);\n    await wait(()=>{const snapshot=getSnapshot()', "stepValidation=()=>{const current=getSnapshot(),stock=current.stockVisible===false?s.quantity:Number.isFinite(current.quantity)?current.quantity:s.quantity;const fresh=capacityFor(row,run,stock,amount,confirmedPrice);if(current.hospitalized!==false||capacity.verified&&(!fresh.verified||fresh.desired<amount))throw Error('Capacity, stock, funds or hospital status changed before the purchase click');};await click(yes,true);\n    await wait(()=>{const snapshot=getSnapshot()");

output=output.slice(0,nativeStart)+nativeFactory+output.slice(nativeEnd);
output=output.replace("(['return','hospitalize'].includes(kind)||now()-run.stockAt", "(['return','hospitalize'].includes(kind)||run.stepLabel&&executeAction?.hasPendingStep?.()||now()-run.stockAt");
// Active button presses already authorize execution; retain setup warnings only.
const flightConfirm=output.split('\n').find(line=>line.includes("if(!window.confirm('Hospitalize before landing?"));
if(!flightConfirm)throw Error('Before-landing confirmation marker changed');output=output.replace(flightConfirm,'');
output=output.replace("const result=await executeAction.execute(kind,{...options,run:expected,getSnapshot,guard,onEvent:fields=>emit('native-step',{action:kind,...fields})});if(run!==expected)return false;", "const result=await executeAction.execute(kind,{...options,run:expected,getSnapshot,guard,onEvent:fields=>emit('native-step',{action:kind,...fields})});if(run!==expected)return false;if(result.actionPending){run.stage=kind;run.stepLabel=result.nextLabel;persist();emit('action-step-ready',{action:kind,label:result.nextLabel});notice(result.nextLabel+' — press Snatch and Run to perform this step.');return true;}delete run.stepLabel;");
output=output.replace("const text=waiting?'Waiting for available stock'", "const text=run.stepLabel&&executeAction?.hasPendingStep?.()?run.stepLabel:waiting?'Waiting for available stock'");
output=output.replace("const stockAvailable=kind==='hospitalize'?", "const stockAvailable=executeAction?.hasPendingStep?.()&&run.stepLabel?true:kind==='hospitalize'?");
output=output.replace("(validRun(s)||kind==='hospitalize'&&outbound(s))", "(validRun(s)||kind==='hospitalize'&&outbound(s)||run.stepLabel&&executeAction?.hasPendingStep?.()&&sameTrip(s))");
output=output.replace("if(!validRun(s)||!focused()||(!['return','hospitalize'].includes(kind)", "if(!(validRun(s)||run.stepLabel&&executeAction?.hasPendingStep?.()&&sameTrip(s))||!focused()||(!run.stepLabel&&!['return','hospitalize'].includes(kind)");
output=output.replace("||(!['return','hospitalize'].includes(kind)&&now()-run.stockAt", "||(!run.stepLabel&&!['return','hospitalize'].includes(kind)&&now()-run.stockAt");
output=output.replace("if(!busy&&run.stage==='buy-pending'", "if(!executeAction?.isStepping?.()&&!busy&&run.stage==='buy-pending'");
output=output.replace("if(run.stage==='return-pending'&&s.traveling", "if(!executeAction?.isStepping?.()&&run.stage==='return-pending'&&s.traveling");
output=output.replace("if(run===expected){if(!error.submitted){run.stage=", "if(run===expected){delete run.stepLabel;if(!error.submitted){run.stage=");
// Only experimental output gets the facade and original trusted event forwarding.
const nativeDeclaration=output.match(/^const nativeActions=typeof createNativeTravelActions.*$/m)?.[0];
if(!nativeDeclaration)throw Error('Native action integration marker changed');
output=output.replace(nativeDeclaration,nativeDeclaration.replace('const nativeActions=','const nativeBaseActions=')+"\nconst nativeActions=createSnatchDirectItems({native:createSteppedNativeActions({native:nativeBaseActions}),getPilot:()=>quickItemTest,getProfile:()=>host.TornUtilities.requestTravelInfo('profile'),window});");
for(const [from,to] of [
 ["nativeAct('hospitalize',{extendHospital:true})","nativeAct('hospitalize',{extendHospital:true,event})"],
 ['async function hospitalizeBeforeLanding(){','async function hospitalizeBeforeLanding(event){'],
 ["nativeAct('hospitalize',{allowBeforeLanding:true})","nativeAct('hospitalize',{allowBeforeLanding:true,event})"],
 ['return hospitalizeBeforeLanding();','return hospitalizeBeforeLanding(event);'],
 ['return nativeAct(kind);','return nativeAct(kind,{event});']
]){if(!output.includes(from))throw Error('Trusted event integration changed: '+from);output=output.replace(from,to);}
output=output.replace('function renderMenu(){',"const quickItemTest=createDirectQuickItems({window,document,fetchImpl:fetch,capturePage:quickItemCapturePage,isAuthorized:()=>host.TornUtilities?.isAuthorized?.()===true,build:TU_INTEGRATED_BUILD});\nfunction renderMenu(){");
output=output.replace('productionAuthorized:false,evidenceBuilds,stockMonitor:', 'productionAuthorized:false,quickItemExperiment:{...quickItemTest.report(),snatchDirectItems:nativeActions.report()},evidenceBuilds,stockMonitor:');
output=output.replace("function diagnosticStart(){try{embeddedDiagnostic?.start('Workflow (continuous)');","function diagnosticStart(){try{quickItemTest.captureStart();embeddedDiagnostic?.start('Workflow (continuous)');");
output=output.replace('function diagnosticStop(){try{embeddedDiagnostic?.stop();','function diagnosticStop(){try{quickItemTest.captureStop();embeddedDiagnostic?.stop();');
output=output.replace('embeddedDiagnostic?.resume();if(embeddedDiagnostic?.isMonitoring())stockDiagnostic?.start();','embeddedDiagnostic?.resume();if(embeddedDiagnostic?.isMonitoring()){stockDiagnostic?.start();quickItemTest.captureStart();}');
output=output.replace('function stopRuntime(){','function stopRuntime(){\n quickItemTest.stop();');
// Exclude broad DOM-change captures from experimental exports; keep structured events and native page fragments.
output=output.replace('const travelReport=embeddedDiagnostic.report(),stockReport=stockDiagnostic?.report()||null,evidenceBuilds={};', 'const rawTravelReport=embeddedDiagnostic.report();const travelReport={...rawTravelReport,captures:rawTravelReport.captures.filter(entry=>entry.kind===\'function-event\'),privacy:{broadDomCapturesOmitted:rawTravelReport.captures.filter(entry=>entry.kind!==\'function-event\').length}},stockReport=stockDiagnostic?.report()||null,evidenceBuilds={};');
// Isolate experiment monitor/run/log state. Existing TU credentials and game data remain shared.
const namespaces={
 'relaxsweety_tu_pda_v1':'relaxsweety_tu_quickitems_test_v1',
 'tuac-settings':'tuac-quickitems-test-settings-v1',
 'tu-item-monitor-v1':'tu-quickitems-test-monitors-v1',
 'tuim-selection-v1':'tuim-quickitems-test-selection-v1',
 'tu:snatch-run:v1':'tu:quickitems-test:snatch-run:v1',
 'tu:item-monitor:view:v1':'tu:quickitems-test:view:v1',
 'tu:item-monitor:dev:diagnostics:v1':'tu:quickitems-test:diagnostics:v1',
 'tu:item-monitor:stock-evidence:v1':'tu:quickitems-test:stock-evidence:v1',
 'tuim-stock-reporting-v1':'tuim-quickitems-test-stock-reporting-v1',
 'tuim-stock-upload-queue-v1':'tuim-quickitems-test-upload-queue-v1',
 'tu:landing-notification:v1':'tu:quickitems-test:landing-notification:v1'
};
for(const [from,to] of Object.entries(namespaces))output=output.replaceAll(from,to);
// Do not allow the ordinary diagnostic DOM serializer to retain this test panel/results.
output=output.replace("const privateRegions='#tuim-menu,", "const privateRegions='#tuim-quickitems-test,#tuim-menu,");
output=output.replace("const skip='[role=log]", "const skip='#global,#trade,#faction,[class*=\"message___\"],[class*=\"senderContainer\"],#tuim-quickitems-test,[role=log]");
const metadataEnd=output.indexOf('// ==/UserScript==')+'// ==/UserScript=='.length;
const early='\n/* Early passive page-world transport probe; no recording until diagnostics start. */\n(()=>{const page=typeof unsafeWindow!==\'undefined\'?unsafeWindow:window;try{if(!page.__TU_QUICKITEMS_CAPTURE__){const create='+createTravelRequestCapture.toString()+';page.__TU_QUICKITEMS_CAPTURE__=create({window:page,document:page.document,pageWindow:page,build:'+JSON.stringify(cfg.version)+'});page.__TU_QUICKITEMS_CAPTURE__.install();}}catch{}})();\n';
output=output.slice(0,metadataEnd)+early+output.slice(metadataEnd);
output=output.replace('// @run-at       document-idle','// @run-at       document-start');
new vm.Script(output);new vm.Script(output.replace(/[“”]/g,'"').replace(/[‘’]/g,"'"));
if(!output.includes('Open Direct Quick Items Test')||!output.includes('snatchDirectItems:nativeActions.report()'))throw Error('Experiment not integrated');
if(output.includes('// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/'))throw Error('Experiment would update to ordinary DEV');
if(output.includes('https://tu-multiplayer-server.tuserver.workers.dev'))throw Error('Production endpoint in experiment');
const targets=['dist/tu-quick-items-test.user.js','../releases/experimental/torn-utilities-quick-items-test.user.js',`../releases/experimental/torn-utilities-${cfg.version}.user.js`];
for(const target of targets){const dest=path.resolve(base,target);if(process.argv.includes('--check')){if(fs.readFileSync(dest,'utf8')!==output)throw Error('Stale experiment '+target);}else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,output);}}
if(crypto.createHash('sha256').update(fs.readFileSync(originalPath)).digest('hex')!==fingerprint)throw Error('Base artifact changed');
console.log(`Built separate ${cfg.version}: ${Buffer.byteLength(output)} bytes; ${cfg.baseBuild} unchanged`);
