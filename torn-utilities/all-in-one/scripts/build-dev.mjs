import fs from 'node:fs';
import {createStockMonitorDiagnostic} from '../src/diagnostics/stock-monitor.js';
import {createAlarmAudio} from '../src/features/alarm-audio.js';
import {createLandingAlarm} from '../src/features/landing-alarm.js';
import {createTravelDomDiagnostic} from '../src/diagnostics/travel-dom.js';
import {createAcceptanceSession} from '../src/diagnostics/acceptance-session.js';
import {detectTestEnvironment} from '../src/diagnostics/environment.js';
import {createHospitalClock} from '../src/features/hospital-clock.js';
import {createChatCaptureSupport} from '../src/features/chat-capture.js';
import {createNativeTravelActions} from '../src/features/native-travel-actions.js';
import {createTravelEnhancements} from '../src/features/travel-enhancements.js';
import path from 'node:path';
import vm from 'node:vm';
import {authorizeToolRequest,isAccountAuthorizationFailure} from '../src/adapters/tool-request.js';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(base,'../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const tools=JSON.parse(read('config/tools.json'));
const releases=JSON.parse(read('config/releases.json'));
const version=releases[0].version;
const logoData='data:image/webp;base64,'+fs.readFileSync(path.join(root,'torn-utilities/assets/tu-logo-128.webp')).toString('base64');
let manager=read('src/manager/manager.user.js').replaceAll('__TU_LOGO_DATA_URL__',logoData);
const registry=/const registry=\{schemaVersion:1,categories:(\[.*?\]),modules:\[.*?\]\};/;
if(!registry.test(manager))throw Error('Manager tool directory missing');
manager=manager.replace(registry,(_,categories)=>`const registry={schemaVersion:1,categories:${categories},modules:${JSON.stringify(tools.map(({source,...t})=>t))}};\nconst TU_RELEASES=${JSON.stringify(releases)};`);
let output=manager+'\n';
const transport=authorizeToolRequest.toString();
for(const tool of tools){
 const filename=path.join(root,tool.source);
 let source=fs.readFileSync(filename,'utf8').replace(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==\s*/m,'');
 new vm.Script(source,{filename:tool.source});
 if(!source.includes(tool.id))throw Error('Source missing tool ID: '+tool.id);
 source=source.replaceAll('https://tu-multiplayer-server.tuserver.workers.dev','https://tu-multiplayer-server-dev.tuserver.workers.dev');
 source=source.replaceAll('tu-ttt-pda-session-v1','tu-ttt-dev-session-v1').replaceAll('tu:chaos-marbles:session','tu:chaos-marbles:dev:session').replaceAll('STORE="tu:"+ID+":session"','STORE="tu:dev:"+ID+":session"');
 if(source.includes('function startModule(){')){
  const start=source.indexOf('function startModule(){')+'function startModule(){'.length;
  const end=source.lastIndexOf('\n  }\n  run();\n})();');
  if(end<start)throw Error('Authorization wrapper changed: '+tool.source);
  source=source.slice(start,end);
 }
 if(tool.id==='war-hit-organizer')source=source.replace(/"data:image\/webp;base64,[A-Za-z0-9+/=]+"/g,'manager.getLogo()');

 if(tool.id==='item-monitor')source='const createStockMonitorDiagnostic='+createStockMonitorDiagnostic.toString()+';\nconst createAlarmAudio='+createAlarmAudio.toString()+';\nconst createLandingAlarm='+createLandingAlarm.toString()+';\nconst TU_INTEGRATED_BUILD='+JSON.stringify(version)+';\nconst createTravelDomDiagnostic='+createTravelDomDiagnostic.toString()+';\nconst createAcceptanceSession='+createAcceptanceSession.toString()+';\nconst detectTestEnvironment='+detectTestEnvironment.toString()+';\n'+'const createHospitalClock='+createHospitalClock.toString()+';\n'+'const createNativeTravelActions='+createNativeTravelActions.toString()+';\n'+'const createTravelEnhancements='+createTravelEnhancements.toString()+';\n'+source;
 if(tool.id==='chat-archiver')source='const createChatCaptureSupport='+createChatCaptureSupport.toString()+';\n'+source;
 // Each retained source runs only on first use. A private Window facade captures
 // its legacy registration internally and binds native Window methods correctly.
 // GM_info reflects the tool's version rather than the enclosing TU version.
 output+=`\n/* Integrated tool: ${tool.id} (${tool.version}) */\n(()=>{\nconst realWindow=window,manager=(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities;\nlet definition=null,loaded=false;\nconst nativeGMInfo=typeof GM_info==='undefined'?{}:GM_info;\nconst nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);\nconst authorize=${transport};\nconst prepare=(url,options)=>authorize(url,options,{authorized:manager.isAuthorized(),token:sessionStorage.getItem('tu:dev:auth:session:v1')});\nconst accountFailure=${isAccountAuthorizationFailure.toString()};\nconst reportAuth=(url,status,data)=>{if(accountFailure(url,status,data))manager.handleBackendAuthorizationFailure();};\nconst toolAPI=Object.freeze({...manager,register(def){if(def.id!==${JSON.stringify(tool.id)})throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id===${JSON.stringify(tool.id)}&&!!definition;}});\nconst facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});\nfunction load(){const fetch=async(url,options)=>{const r=await nativeFetch(url,prepare(url,options));if([401,403].includes(r.status)){let data;try{data=await r.clone().json()}catch{}reportAuth(url,r.status,data);}return r;},GM_xmlhttpRequest=nativeGM?options=>nativeGM({...prepare(options.url,options),onload:r=>{options.onload?.(r);if([401,403].includes(r.status)){let data;try{data=JSON.parse(r.responseText)}catch{}reportAuth(options.url,r.status,data);}}}):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={...nativeGMInfo,script:{...nativeGMInfo.script,version:${JSON.stringify(tool.version)}}};\n${source}\n}\nmanager.registerTool({id:${JSON.stringify(tool.id)},version:${JSON.stringify(tool.version)},activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},resume(){return definition?.resume?.()||false;},deactivate(){definition?.deactivate();}});\n})();\n`;
}
// PDA can inject a userscript before BODY exists, irrespective of @run-at.
// Delay the Manager AND lazy tool registrations together; never poll the DOM.
const metadataEnd=output.indexOf('// ==/UserScript==')+'// ==/UserScript=='.length;
const body=output.slice(metadataEnd);
output=output.slice(0,metadataEnd)+'\n'+String.raw`(()=>{
 const owner=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
 const version=${JSON.stringify(version)};
 const previous=owner.__TU_DEV_STARTUP__;
 if(previous?.build===version&&['waiting-for-body','starting','ready'].includes(previous.phase))return;
 const status={build:version,phase:'waiting-for-body',at:new Date().toISOString(),error:null};owner.__TU_DEV_STARTUP__=status;
 const start=()=>{
  status.phase='starting';
  try{
${body}
   status.phase='ready';
  }catch(error){status.phase='failed';status.error={name:String(error?.name||'Error'),message:String(error?.message||'Startup failed').replace(/https?:\/\/[^\s]+/gi,'[URL OMITTED]').replace(/\b[A-Za-z0-9_-]{16,}\b/g,'[REDACTED]').slice(0,240)};throw error;}
 };
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
`;
output=output.replace(/[\t ]+$/gm,'');
new vm.Script(output,{filename:'torn-utilities-dev.user.js'});
// Official PDA adaptSource normalizes typography before evaluating the entire script.
new vm.Script(output.replace(/[“”]/g,'\"').replace(/[‘’]/g,"'"),{filename:'torn-utilities-dev.pda-adapted.user.js'});
if((output.match(/^\/\/ ==UserScript==$/gm)||[]).length!==1)throw Error('Duplicate metadata');
for(const marker of ['tu-multiplayer-server.tuserver.workers.dev','alerts-calculations','modules.json','War Status Diagnostic','war-status-diagnostic','--- Current Version','+++ New Version'])if(output.includes(marker))throw Error('Forbidden distribution marker: '+marker);
if(!output.startsWith('// ==UserScript==')||!output.includes('// @version      '+version))throw Error('Release metadata mismatch');
if(tools.length!==10||new Set(tools.map(t=>t.id)).size!==10)throw Error('Expected exactly 10 tools');
fs.mkdirSync(path.join(root,'torn-utilities/releases/dev'),{recursive:true});
for(const p of ['dist/tu-integrated-staging-dev.user.js',`../releases/dev/torn-utilities-${version}.user.js`,'../releases/dev/torn-utilities-dev.user.js']){const target=path.join(base,p);if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Stale generated release: '+p);}else fs.writeFileSync(target,output);}
console.log(`Built ${version}: ${tools.length} tools; ${Buffer.byteLength(output)} bytes`);
