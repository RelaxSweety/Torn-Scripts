// ==UserScript==
// @name         Torn Utilities PDA Diagnostic
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.2.0
// @description  Tests native PDA and GM network requests, storage, execution, and script interfaces.
// @author       RelaxSweety [4539436]
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/diagnostics/torn-pda-diagnostic.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/diagnostics/torn-pda-diagnostic.user.js
// ==/UserScript==
(() => {
  'use strict';
  if (window.__TU_PDA_DIAGNOSTIC__) return;
  window.__TU_PDA_DIAGNOSTIC__ = true;
  const results=[];
  const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const style=el('style');
  style.textContent=`
#tu-diag-toggle{position:fixed;bottom:85px;left:8px;z-index:2147483646;background:#12181b;color:#eac65b;border:1px solid #eac65b;border-radius:12px;padding:8px 11px;font:bold 13px system-ui}
#tu-diag-panel{position:fixed;z-index:2147483647;inset:8% 3% auto;max-width:480px;margin:auto;max-height:82vh;overflow:auto;background:#12171a;color:#eee;border:1px solid #d3ad54;border-radius:14px;padding:14px;font:13px system-ui;box-shadow:0 6px 30px #000c}
#tu-diag-panel[hidden]{display:none}
#tu-diag-panel button{background:#d7b554;color:#141414;border:0;border-radius:8px;padding:9px 12px;margin:4px;font-weight:650}
#tu-diag-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#20262a;padding:9px;border-radius:8px;max-height:45vh;overflow:auto}
`;
  document.head.append(style);
  const toggle=el('button','DIAG');toggle.id='tu-diag-toggle';document.body.append(toggle);
  const panel=el('section');panel.id='tu-diag-panel';panel.hidden=true;
  const header=el('h3','Torn PDA Diagnostic v0.2.0');header.style.margin='0 0 8px';
  const info=el('p','Tests PDA_httpGet and GM_xmlhttpRequest against Chat Archiver, storage, and script interfaces. No modules are executed or installed.');
  const run=el('button','Run tests'),copy=el('button','Copy report'),close=el('button','Close');
  const output=el('pre','Press Run tests to begin.');
  panel.append(header,info,run,copy,close,output);document.body.append(panel);
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;});
  close.addEventListener('click',()=>{panel.hidden=true;});
  const report=()=>['Torn Utilities PDA Diagnostic v0.2.0','Timestamp: '+new Date().toISOString(),'User agent: '+navigator.userAgent,'Origin: '+location.origin,...results].join('\n');
  const record=(name,status,detail='')=>{results.push(name+': '+status+(detail?' | '+detail:''));output.textContent=report();};
  const withTimeout=(promise,ms=8500)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timeout after '+ms+'ms')),ms))]);
  async function testFetch(name,url){
    try{
      const r=await withTimeout(fetch(url,{mode:'cors',cache:'no-store'}));
      const body=await withTimeout(r.text());
      record(name,r.ok?'PASS':'HTTP '+r.status,'status='+r.status+'; bytes='+body.length+'; content-type='+(r.headers.get('content-type')||'unknown'));
    }catch(e){record(name,'FAIL',String(e.message||e));}
  }
  const target='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/chat-archiver/pda/src/torn-multi-chat-archiver-pda.user.js';
  function describeResponse(value){
    const body=typeof value==='string'?value:typeof value?.responseText==='string'?value.responseText:typeof value?.data==='string'?value.data:typeof value?.body==='string'?value.body:'';
    return {body,status:value?.status??value?.statusCode??'unknown',kind:typeof value};
  }
  async function testPDAGet(){
    if(typeof window.PDA_httpGet!=='function'){record('PDA_httpGet module','UNAVAILABLE');return;}
    try{
      // PDA_httpGet commonly accepts a URL and resolves to text or response object.
      const result=await withTimeout(Promise.resolve(window.PDA_httpGet(target)),12000);
      const data=describeResponse(result);
      record('PDA_httpGet module',data.body.includes('Torn Multi-Chat Archiver')?'PASS':'RESPONSE RECEIVED',
        'status='+data.status+'; bytes='+data.body.length+'; response type='+data.kind);
    }catch(e){record('PDA_httpGet module','FAIL',String(e.message||e));}
  }
  async function testGMRequest(){
    const gm=window.GM_xmlhttpRequest;
    if(typeof gm!=='function'){record('GM_xmlhttpRequest module','UNAVAILABLE');return;}
    try{
      const response=await withTimeout(new Promise((resolve,reject)=>{
        let settled=false;
        try{
          const handle=gm({
            method:'GET',url:target,timeout:11000,
            onload:r=>{settled=true;resolve(r);},
            onerror:r=>{settled=true;reject(new Error('Network error '+(r?.status||'')));},
            ontimeout:()=>{settled=true;reject(new Error('Request timeout'));}
          });
          // The timeout wrapper ensures we do not wait indefinitely for an unsupported callback.
        }catch(e){reject(e);}
      }),12000);
      const data=describeResponse(response);
      record('GM_xmlhttpRequest module',data.body.includes('Torn Multi-Chat Archiver')?'PASS':'RESPONSE RECEIVED',
        'status='+data.status+'; bytes='+data.body.length);
    }catch(e){record('GM_xmlhttpRequest module','FAIL',String(e.message||e));}
  }
  function testScriptInterfaces(){
    const candidates=['PDA_installScript','PDA_addScript','PDA_saveScript','PDA_scripts','PDA_scriptManager','PDA_openUrl','PDA_openBrowser','GM_registerMenuCommand','GM_addElement','GM_getResourceText','GM_download'];
    for(const key of candidates)record('Script API '+key,typeof window[key]);
    try{record('GM_info metadata',JSON.stringify({scriptHandler:window.GM_info?.scriptHandler,version:window.GM_info?.version,scriptName:window.GM_info?.script?.name}));}
    catch(e){record('GM_info metadata','ERROR',e.message);}
  }
  async function tests(){
    results.length=0;run.disabled=true;output.textContent='Running tests…';
    const globals=['PDA_httpGet','PDA_httpPost','PDA_storage','PDA_log','GM_xmlhttpRequest','GM_xmlHttpRequest','GM_getValue','GM_setValue','GM_info','unsafeWindow'];
    for(const key of globals){
      let kind='undefined';
      try{kind=typeof window[key];if(key==='PDA_storage'&&window[key])kind+=' ('+['get','set','remove'].map(k=>k+':'+typeof window[key][k]).join(', ')+')';}catch(e){kind='inaccessible: '+e.message;}
      record('API '+key,kind);
    }
    try{
      const k='__tu_diag_'+Date.now(),v='test-'+Math.random().toString(36).slice(2);
      localStorage.setItem(k,v);const ok=localStorage.getItem(k)===v;localStorage.removeItem(k);
      record('localStorage roundtrip',ok?'PASS':'FAIL');
    }catch(e){record('localStorage roundtrip','FAIL',String(e.message||e));}
    try{
      const k='__tu_diag_'+Date.now();
      if(window.PDA_storage?.set&&window.PDA_storage?.get){
        await withTimeout(Promise.resolve(window.PDA_storage.set(k,'test')));
        const v=await withTimeout(Promise.resolve(window.PDA_storage.get(k)));
        record('PDA_storage roundtrip',v==='test'?'PASS':'UNEXPECTED','returned type='+typeof v);
        if(window.PDA_storage.remove)await Promise.resolve(window.PDA_storage.remove(k));
      }else record('PDA_storage roundtrip','UNAVAILABLE');
    }catch(e){record('PDA_storage roundtrip','FAIL',String(e.message||e));}
    try{record('new Function',new Function('return 3 * 7')()===21?'PASS':'FAIL');}
    catch(e){record('new Function','BLOCKED',String(e.message||e));}
    try{
      const marker='__tu_diag_script_'+Date.now(),s=el('script');
      s.textContent='window['+JSON.stringify(marker)+']=true;';
      document.documentElement.appendChild(s);s.remove();
      const ok=window[marker]===true;delete window[marker];
      record('Inline script injection',ok?'PASS':'BLOCKED');
    }catch(e){record('Inline script injection','BLOCKED',String(e.message||e));}
    testScriptInterfaces();
    await testPDAGet();
    await testGMRequest();
    await testFetch('same-origin Torn','https://www.torn.com/');
    await testFetch('raw.githubusercontent.com','https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/core/pda/torn-utilities.user.js');
    await testFetch('cdn.jsdelivr.net','https://cdn.jsdelivr.net/gh/RelaxSweety/Torn-Scripts@main/README.md');
    await testFetch('api.github.com','https://api.github.com/repos/RelaxSweety/Torn-Scripts');
    record('Diagnostic complete','DONE');
    run.disabled=false;
  }
  run.addEventListener('click',()=>{tests().catch(e=>{record('Unexpected failure','FAIL',String(e));run.disabled=false;});});
  copy.addEventListener('click',()=>{
    const value=report();
    if(typeof navigator.clipboard?.writeText==='function')navigator.clipboard.writeText(value).catch(()=>fallbackCopy(value));
    else fallbackCopy(value);
  });
  function fallbackCopy(value){
    const t=el('textarea');t.value=value;t.style.cssText='position:fixed;left:0;top:0;opacity:.01';
    document.body.append(t);t.select();try{document.execCommand('copy');}catch{}t.remove();
  }
})();
