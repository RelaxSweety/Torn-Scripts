import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {authorizeToolRequest} from '../src/adapters/tool-request.js';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(base,'../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const tools=JSON.parse(read('config/tools.json'));
const releases=JSON.parse(read('config/releases.json'));
const version=releases[0].version;
const logoData='data:image/png;base64,'+fs.readFileSync(path.join(root,'torn-utilities/assets/tu-logo-integrated-gold.png')).toString('base64');
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

 // Each retained source runs only on first use. A private Window facade captures
 // its legacy registration internally and binds native Window methods correctly.
 // GM_info reflects the tool's version rather than the enclosing TU version.
 output+=`\n/* Integrated tool: ${tool.id} (${tool.version}) */\n(()=>{\nconst realWindow=window,manager=(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities;\nlet definition=null,loaded=false;\nconst nativeFetch=fetch,nativeGM=typeof GM_xmlhttpRequest==='function'?GM_xmlhttpRequest:(typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function'?GM.xmlHttpRequest.bind(GM):null);\nconst authorize=${transport};\nconst prepare=(url,options)=>authorize(url,options,{authorized:manager.isAuthorized(),token:sessionStorage.getItem('tu:dev:auth:session:v1')});\nconst toolAPI=Object.freeze({...manager,register(def){if(def.id!==${JSON.stringify(tool.id)})throw Error('Unexpected tool registration');definition=def;return true;},isRegistered(id){return id===${JSON.stringify(tool.id)}&&!!definition;}});\nconst facade=new Proxy({},{get(target,key){if(key==='TornUtilities')return toolAPI;const v=Reflect.get(realWindow,key,realWindow);return typeof v==='function'&&!/^[A-Z]/.test(String(key))?v.bind(realWindow):v;},set(target,key,value){return Reflect.set(realWindow,key,value,realWindow);}});\nfunction load(){const fetch=(url,options)=>nativeFetch(url,prepare(url,options)),GM_xmlhttpRequest=nativeGM?options=>nativeGM(prepare(options.url,options)):undefined;const window=facade,unsafeWindow=facade,host=facade,GM_info={script:{version:${JSON.stringify(tool.version)}}};\n${source}\n}\nmanager.registerTool({id:${JSON.stringify(tool.id)},version:${JSON.stringify(tool.version)},activate(context){if(!loaded){load();if(!definition)throw Error('Tool did not register');loaded=true;}return definition.activate(context);},deactivate(){definition?.deactivate();}});\n})();\n`;
}
output=output.replace(/[\t ]+$/gm,'');
new vm.Script(output,{filename:'torn-utilities-dev.user.js'});
if((output.match(/^\/\/ ==UserScript==$/gm)||[]).length!==1)throw Error('Duplicate metadata');
for(const marker of ['tu-multiplayer-server.tuserver.workers.dev','modules.json','War Status Diagnostic','war-status-diagnostic','--- Current Version','+++ New Version'])if(output.includes(marker))throw Error('Forbidden distribution marker: '+marker);
if(!output.startsWith('// ==UserScript==')||!output.includes('// @version      '+version))throw Error('Release metadata mismatch');
if(tools.length!==11||new Set(tools.map(t=>t.id)).size!==11)throw Error('Expected exactly 11 tools');
fs.mkdirSync(path.join(root,'torn-utilities/releases/dev'),{recursive:true});
for(const p of ['dist/tu-integrated-staging-dev.user.js',`../releases/dev/torn-utilities-${version}.user.js`,'../releases/dev/torn-utilities-dev.user.js']){const target=path.join(base,p);if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Stale generated release: '+p);}else fs.writeFileSync(target,output);}
console.log(`Built ${version}: ${tools.length} tools; ${Buffer.byteLength(output)} bytes`);
