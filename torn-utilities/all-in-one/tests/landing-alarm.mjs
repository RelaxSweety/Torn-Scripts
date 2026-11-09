import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createLandingAlarm} from '../src/features/landing-alarm.js';
const w=new JSDOM('<body></body>',{pretendToBeVisual:true}).window;let now=100000,flight={route:'Torn to Japan.',timerText:'00:02:00',returning:false},cfg={enabled:false,seconds:60,sound:'chime'},saved=null,played=[],events=[];
const opts={document:w.document,window:w,getFlight:()=>flight,getSettings:()=>cfg,audio:{play:p=>played.push(p),stop(){}},readSaved:()=>saved,save:v=>saved=v,now:()=>now,onEvent:(...v)=>events.push(v)};
let alarm=createLandingAlarm(opts);
try{
 assert.equal(alarm.tick().remainingSeconds,120);now+=30000;assert.equal(alarm.tick().remainingSeconds,90,'Local countdown works if DOM text is unchanged');cfg.enabled=true;alarm.tick();assert.equal(played.length,0);now+=30000;alarm.tick();assert.equal(played.length,1);assert.equal(played[0].sound,'chime');assert.ok(w.document.getElementById('tu-landing-alert'));alarm.tick();assert.equal(played.length,1,'One alarm per flight');
 alarm.stop();flight.timerText='00:01:00';alarm=createLandingAlarm(opts);alarm.tick();assert.equal(played.length,1,'Same-tab refresh does not replay alarm');cfg.enabled=false;alarm.tick();assert.equal(w.document.getElementById('tu-landing-alert'),null);
 cfg.enabled=true;flight={route:'Japan to Torn.',timerText:'00:00:30',returning:true};assert.equal(alarm.tick().outbound,false);assert.equal(played.length,1);flight=null;assert.equal(alarm.tick().arrival,null);
 now+=1000000;flight={route:'Torn to Japan.',timerText:'00:00:30',returning:false};alarm.tick();assert.equal(played.length,2,'Later flight rearms');now+=30000;assert.equal(alarm.tick().remainingSeconds,0);assert.ok(w.document.getElementById('tu-landing-alert'),'Notice remains available to mute after landing');assert.ok(w.document.getElementById('tu-landing-alert').textContent.includes('Click to Mute'));w.document.getElementById('tu-landing-alert').click();assert.equal(w.document.getElementById('tu-landing-alert'),null);alarm.tick();assert.equal(played.length,2,'Muting does not rearm the same flight');flight.timerText='unknown';assert.equal(alarm.tick().remainingSeconds,null);assert.equal(events.filter(e=>e[0]==='landing-alarm').length,2);
}finally{alarm.stop();w.close();}
console.log('Landing alarm passed: local seconds, optional enable, threshold, Chime default, once-per-flight/refresh, later trip, visual cleanup, return/unknown/zero exclusions');
