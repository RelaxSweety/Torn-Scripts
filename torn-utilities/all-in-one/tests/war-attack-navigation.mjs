import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../modules/war-hit-organizer.user.js',import.meta.url),'utf8');
const action=source.slice(source.indexOf('async function warAction('),source.indexOf('\nfunction attackPlayer('));
for(const endpoint of ['page.php','loader.php','https://evil.example/page.php']){
 const navigation=[],events=[];
 const attackUrl=endpoint.startsWith('https:')?endpoint+'?sid=attack&user2ID=101':'https://www.torn.com/'+endpoint+'?sid=attack&user2ID=101';
 const context=vm.createContext({coordinationBusy:false,coordinationRun:1,root:{},coordinationError:'',window:{TornUtilities:{requestWhoWar:async()=>({attackUrl})},TUWindowNavigation:{minimize:()=>events.push('minimize')},location:{assign:url=>navigation.push(url)}},paintReservations(){},persistPosition(){events.push('persist');}});
 await vm.runInContext(action+";warAction('attack',{},{});",context);
 if(endpoint.startsWith('https:')){assert.deepEqual(navigation,[]);assert.equal(context.coordinationError,'Unsupported attack destination.');}
 else{assert.deepEqual(navigation,['https://www.torn.com/page.php?sid=attack&user2ID=101']);assert.deepEqual(events,['persist','minimize']);}
}
console.log('Attack navigation: current and legacy server URLs use page.php, saved position/minimize preserved, foreign URL rejected.');
