import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createTravelRequestCapture} from '../src/experimental/travel-request-capture.js';
import {createDirectQuickItems} from '../src/experimental/direct-quick-items.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(base,'../..');
const cfg=JSON.parse(fs.readFileSync(path.join(base,'config/quick-items-experiment.json'),'utf8'));
const originalPath=path.join(root,`torn-utilities/releases/dev/torn-utilities-${cfg.baseBuild}.user.js`),original=fs.readFileSync(originalPath,'utf8');
const fingerprint=crypto.createHash('sha256').update(original).digest('hex');
if(!original.includes('// @version      '+cfg.baseBuild))throw Error('Base build mismatch');
let output=original.replaceAll(cfg.baseBuild,cfg.version).replaceAll('1.12.36-dev',cfg.itemMonitorVersion);
output=output.replace('^\\d+(?:\\.\\d+){3}-dev$', '^\\d+(?:\\.\\d+){3}-(?:dev|quickitems-test\\.\\d+)$');
output=output.replace(/^\/\/ @name\s+.*$/m,'// @name         '+cfg.name).replace(/^\/\/ @namespace\s+.*$/m,'// @namespace    '+cfg.namespace).replace(/^\/\/ @description\s+.*$/m,'// @description  Separate personal Quick Items POST test; disable other TU scripts; foreign Snatch transport unchanged');
for(const key of ['updateURL','downloadURL'])output=output.replace(new RegExp('^// @'+key+'\\s+.*$','m'),'// @'+key+'    '+cfg.url);
const notes={version:cfg.version,date:'2026-11-09',changes:{'Experimental direct Quick Items':['Based on '+cfg.baseBuild+'; separately named and separately updated','Personal medical item POST from one explicit click; no automatic retries','Early page-world request hooks, pointer controls and resource/counter coverage evidence','Request timing and uncertainty logs are included in Report Generation','Foreign travel inventory endpoints are not yet verified; Snatch and Run transport remains unchanged']}};
output=output.replace(/const TU_RELEASES=(\[.*\]);/,()=>{const source=original.match(/const TU_RELEASES=(\[.*\]);/);return 'const TU_RELEASES='+JSON.stringify([notes,...JSON.parse(source[1])])+';';});
const marker='const TU_INTEGRATED_BUILD='+JSON.stringify(cfg.version)+';';
if(output.split(marker).length!==2)throw Error('Item Monitor integration marker mismatch');
output=output.replace(marker,'const createTravelRequestCapture='+createTravelRequestCapture.toString()+';\nconst createDirectQuickItems='+createDirectQuickItems.toString()+';\n'+marker);
const factoryMarker='/* Integrated tool: item-monitor (';const factoryStart=output.indexOf(factoryMarker);const factoryBody=output.indexOf('(()=>{',factoryStart)+'(()=>{'.length;if(factoryStart<0)throw Error('Item Monitor factory missing');output=output.slice(0,factoryBody)+'\nconst quickItemCapturePage=typeof unsafeWindow!==\'undefined\'?unsafeWindow:window;'+output.slice(factoryBody);
const menu="B(p,'Open Item Monitor',()=>{state.lastView='monitor';sessionStorage.setItem('tu:item-monitor:view:v1','monitor');tuModuleOpen('tuim-panel');diagnosticStart();});";
if(!output.includes(menu))throw Error('Menu integration changed');
output=output.replace(menu,menu+"E('h3',p,'Experimental Direct Requests');E('p',p,'Personal medical items only. Snatch and Run still uses the existing native action path.');B(p,'Open Direct Quick Items Test',()=>{diagnosticStart();quickItemTest.open();});");
output=output.replace('function renderMenu(){',"const quickItemTest=createDirectQuickItems({window,document,fetchImpl:fetch,capturePage:quickItemCapturePage,isAuthorized:()=>host.TornUtilities?.isAuthorized?.()===true,build:TU_INTEGRATED_BUILD});\nfunction renderMenu(){");
output=output.replace('productionAuthorized:false,evidenceBuilds,stockMonitor:', 'productionAuthorized:false,quickItemExperiment:quickItemTest.report(),evidenceBuilds,stockMonitor:');
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
if(!output.includes('Open Direct Quick Items Test')||!output.includes('quickItemExperiment:quickItemTest.report()'))throw Error('Experiment not integrated');
if(output.includes('// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/'))throw Error('Experiment would update to ordinary DEV');
if(output.includes('https://tu-multiplayer-server.tuserver.workers.dev'))throw Error('Production endpoint in experiment');
const targets=['dist/tu-quick-items-test.user.js','../releases/experimental/torn-utilities-quick-items-test.user.js',`../releases/experimental/torn-utilities-${cfg.version}.user.js`];
for(const target of targets){const dest=path.resolve(base,target);if(process.argv.includes('--check')){if(fs.readFileSync(dest,'utf8')!==output)throw Error('Stale experiment '+target);}else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,output);}}
if(crypto.createHash('sha256').update(fs.readFileSync(originalPath)).digest('hex')!==fingerprint)throw Error('Base artifact changed');
console.log(`Built separate ${cfg.version}: ${Buffer.byteLength(output)} bytes; ${cfg.baseBuild} unchanged`);
