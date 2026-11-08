import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createChatMonitor} from '../src/diagnostics/chat-monitor.js';
import {createChatCaptureSupport} from '../src/features/chat-capture.js';
const w=new JSDOM('<body><div class="scrollWrapper_fixture"><div class="virtualItem_fixture" data-timestamp="2026-11-08T00:01:02Z">PRIVATE CHAT TEXT</div></div></body>',{url:'https://www.torn.com/'}).window,d=w.document;
const support=createChatCaptureSupport(),root=d.querySelector('.scrollWrapper_fixture');assert.equal(support.timestamp(root),'2026-11-08T00:01:02.000Z');assert.equal(support.timestamp(d.createElement('div')),'','Never invent capture time');assert.equal(support.interrupted({top:100,height:2000},{top:1600,height:2000,viewport:400}),true);assert.equal(support.interrupted({top:100,height:2000},{top:1600,height:3500,viewport:400}),false,'Normal history prepend anchoring is not a reset');
const monitor=createChatMonitor({document:d,window:w,storageKey:'chat-test'});try{
 monitor.start();Object.defineProperty(root,'scrollHeight',{value:2000});Object.defineProperty(root,'clientHeight',{value:400});root.scrollTop=100;root.dispatchEvent(new w.Event('scroll'));root.scrollTop=1600;root.dispatchEvent(new w.Event('scroll'));
 d.dispatchEvent(new w.CustomEvent('tu-chat-diagnostic',{detail:JSON.stringify({event:'scan',exactTimes:4,total:9,message:'PRIVATE TEXT',apiKey:'SECRET'})}));assert.ok(monitor.report().records.some(r=>r.event==='scroll-jump'));assert.ok(monitor.report().records.some(r=>r.exactTimes===4));assert.ok(!JSON.stringify(monitor.report()).includes('PRIVATE'));assert.ok(!JSON.stringify(monitor.report()).includes('SECRET'));monitor.stop();const count=monitor.report().records.length;root.dispatchEvent(new w.Event('scroll'));assert.equal(monitor.report().records.length,count);
}finally{monitor.stop();w.close()}
console.log('Chat behavior passed: native timestamp evidence, no invented time, jump vs prepend, passive redacted recording and Stop cleanup');
