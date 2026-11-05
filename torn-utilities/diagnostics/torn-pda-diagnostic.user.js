// ==UserScript==
// @name         Torn Utilities Testing & Diagnostic (DEV)
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.3.0-dev
// @description  Repeatable, read-only PDA/Tampermonkey tests for TU Manager, DEV agreement publication, network and storage.
// @author       RelaxSweety [4539436]
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      raw.githubusercontent.com
// @connect      tu-multiplayer-server-dev.tuserver.workers.dev
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/diagnostics/torn-pda-diagnostic.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/diagnostics/torn-pda-diagnostic.user.js
// ==/UserScript==
(() => {
  'use strict';
  if (window.__TU_PDA_DIAGNOSTIC_V3__) return;
  window.__TU_PDA_DIAGNOSTIC_V3__ = true;
  const VERSION='0.3.0-dev';
  const WORKER='https://tu-multiplayer-server-dev.tuserver.workers.dev/api/auth/agreement/current';
  const MANAGER='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/core/cross-platform/torn-utilities.user.js';
  const MANIFEST='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/agreements/dev/current.json';
  const tests=[]; let running=false;
  const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const style=el('style');style.textContent=`
#tu-test-toggle{position:fixed;bottom:85px;left:8px;z-index:2147483646;background:#12181b;color:#eac65b;border:1px solid #eac65b;border-radius:10px;padding:8px 11px;font:bold 13px system-ui}
#tu-test-panel{position:fixed;z-index:2147483647;left:3vw;top:7dvh;width:min(94vw,620px);max-height:86dvh;overflow:auto;box-sizing:border-box;background:#12171a;color:#eee;border:1px solid #d3ad54;border-radius:14px;padding:14px;font:13px/1.45 system-ui;box-shadow:0 6px 30px #000c}
#tu-test-panel[hidden]{display:none}
#tu-test-panel button{background:#d7b554;color:#141414;border:0;border-radius:8px;padding:9px 12px;margin:3px;font-weight:650}
#tu-test-panel button:disabled{opacity:.5}
#tu-test-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#20262a;padding:9px;border-radius:8px;max-height:48dvh;overflow:auto}
`;document.head.append(style);
  const toggle=el('button','TU TEST');toggle.id='tu-test-toggle';document.body.append(toggle);
  const panel=el('section');panel.id='tu-test-panel';panel.hidden=true;
  const title=el('h3','TU Testing & Diagnostic '+VERSION);
  const info=el('p','Read-only DEV checks. No API keys are requested, no agreement is accepted, and no D1 records are changed.');
  const run=el('button','Run all tests'),copy=el('button','Copy report'),close=el('button','Close'),output=el('pre','Run tests to generate a reproducible report.');
  panel.append(title,info,run,copy,close,output);document.body.append(panel);
  toggle.onclick=()=>{panel.hidden=!panel.hidden;};close.onclick=()=>{panel.hidden=true;};
  const started=()=>new Date().toISOString();let runAt='';
  const add=(name,status,detail='')=>{tests.push({name,status,detail});output.textContent=report();};
  const clean=x=>String(x??'').replace(/[\r\n]+/g,' ').slice(0,250);
  const report=()=>{const counts={PASS:0,FAIL:0,WARN:0,SKIP:0};tests.forEach(t=>{if(t.status in counts)counts[t.status]++;});return ['TU Testing & Diagnostic '+VERSION,'Run: '+runAt,'Platform: '+(/Android|iPhone|iPad/i.test(navigator.userAgent)?'mobile':'desktop'),'User agent: '+navigator.userAgent,'Origin: '+location.origin,'Summary: '+Object.entries(counts).map(([k,v])=>k+'='+v).join(' '),'---',...tests.map(t=>'['+t.status+'] '+t.name+(t.detail?' | '+t.detail:''))].join('\n');};
  function request(url,ms=12000){
    return new Promise((resolve,reject)=>{
      let done=false;const finish=(err,val)=>{if(done)return;done=true;clearTimeout(timer);err?reject(err):resolve(val);};
      const timer=setTimeout(()=>finish(new Error('timeout '+ms+'ms')),ms);
      if(typeof GM_xmlhttpRequest==='function'){
        try{GM_xmlhttpRequest({method:'GET',url,timeout:ms,headers:{'Accept':'application/json, text/plain, */*'},onload:r=>finish(null,{status:r.status,text:r.responseText||'',via:'GM'}),onerror:()=>finish(new Error('GM network error')),ontimeout:()=>finish(new Error('GM timeout'))});}catch(e){finish(e);}
      }else{
        fetch(url,{cache:'no-store'}).then(async r=>finish(null,{status:r.status,text:await r.text(),via:'fetch'})).catch(e=>finish(e));
      }
    });
  }
  const parse=(s)=>{try{return JSON.parse(s);}catch{return null;}};
  const canonical=s=>String(s??'').replace(/\s+/g,' ').trim();
  async function checkEndpoint(name,url,validate){
    try{const r=await request(url);if(r.status!==200){add(name,'FAIL','HTTP '+r.status+' via '+r.via);return null;}
      const data=parse(r.text);if(!data){add(name,'FAIL','Invalid JSON via '+r.via);return null;}
      const result=validate(data);add(name,result.ok?'PASS':'FAIL',result.detail+'; via '+r.via);return result.ok?data:null;
    }catch(e){add(name,'FAIL',clean(e.message));return null;}
  }
  async function testAll(){
    if(running)return;running=true;run.disabled=true;tests.length=0;runAt=started();output.textContent='Testing…';
    try{
      add('Runtime', 'PASS',typeof GM_xmlhttpRequest==='function'?'GM request available':'fetch fallback; GM request unavailable');
      add('TU Manager page API',window.__RELAX_TORN_UTILITIES_PDA__?'PASS':'WARN',window.__RELAX_TORN_UTILITIES_PDA__?'Manager detected in page context':'Manager not detected; isolated userscript contexts may hide it');
      try{const k='__tu_diag_'+Date.now(),v='roundtrip';localStorage.setItem(k,v);const ok=localStorage.getItem(k)===v;localStorage.removeItem(k);add('Local storage roundtrip',ok?'PASS':'FAIL');}catch(e){add('Local storage roundtrip','FAIL',clean(e.message));}
      if(typeof GM_getValue==='function'&&typeof GM_setValue==='function'){try{const k='__tu_diag_v3_'+Date.now();GM_setValue(k,'test');add('GM storage roundtrip',GM_getValue(k)==='test'?'PASS':'FAIL');if(typeof GM_deleteValue==='function')GM_deleteValue(k);}catch(e){add('GM storage roundtrip','FAIL',clean(e.message));}}else add('GM storage roundtrip','SKIP','GM storage not available in this runtime');
      const manager=await request(MANAGER).catch(e=>({status:0,text:'',error:e.message}));
      if(manager.status===200&&manager.text.startsWith('// ==UserScript==')){
        const version=manager.text.match(/^\/\/ @version\s+(.+)$/m)?.[1]||'unknown';
        const parserOK=manager.text.includes("split(/\\n\\s*\\n/)")&&manager.text.includes("block.split('\\n')");
        add('DEV Manager source','PASS','version '+version+'; bytes '+manager.text.length);
        add('Agreement Markdown parser',parserOK?'PASS':'FAIL',parserOK?'heading and paragraph newline handling present':'expected newline parser not detected');
      }else add('DEV Manager source','FAIL',manager.error||'HTTP '+manager.status);
      const github=await checkEndpoint('GitHub agreement manifest',MANIFEST,d=>({ok:!!(d.agreement?.agreement_number&&d.content),detail:'agreement '+(d.agreement?.agreement_version||'?')+' #'+(d.agreement?.agreement_number||'?')}));
      const live=await checkEndpoint('DEV Worker agreement',WORKER,d=>({ok:!!(d.agreement?.agreement_number&&d.content),detail:'agreement '+(d.agreement?.agreement_version||'?')+' #'+(d.agreement?.agreement_number||'?')}));
      if(github&&live){const metadata=['agreement_number','agreement_version','agreement_date'].every(k=>github.agreement[k]===live.agreement[k]);add('GitHub / Worker agreement metadata',metadata?'PASS':'FAIL','published versions '+github.agreement.agreement_version+' / '+live.agreement.agreement_version);
        const same=canonical(github.content)===canonical(live.content);add('GitHub / Worker agreement wording',same?'PASS':'FAIL',same?'same wording after whitespace normalization':'content differs');
      }else add('GitHub / Worker consistency','SKIP','Both endpoints must pass');
      add('Agreement acceptance write','SKIP','Manual acceptance test required; diagnostic never submits agreement events');
      add('D1 acceptance event','SKIP','Requires authorized backend verification; diagnostic does not access private D1 records');
      add('New-version reacceptance','SKIP','Requires a separate DEV agreement publication and manual acceptance');
    }catch(e){add('Unexpected diagnostic error','FAIL',clean(e.message));}
    finally{running=false;run.disabled=false;output.textContent=report();}
  }
  run.onclick=testAll;
  copy.onclick=async()=>{const value=report();try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(value);}catch{const t=el('textarea');t.value=value;t.style.cssText='position:fixed;left:0;top:0;opacity:.01';document.body.append(t);t.select();document.execCommand('copy');t.remove();}};
})();
