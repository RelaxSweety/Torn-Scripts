// ==UserScript==
// @name         TU Testing and Diagnostics DEV
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.1.0-dev
// @description  Independent guided cross-platform TU test checklist and sanitized export
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(() => {
  'use strict';
  if(window.__TU_DIAGNOSTICS_DEV__)return;
  window.__TU_DIAGNOSTICS_DEV__=true;
  const key='tu:aio:diagnostics:v1';
  const tests=[
    ['core.launcher','TU launcher appears and opens'],
    ['core.window','Manager Back, Minimize, Restore and Exit work'],
    ['core.position','Launcher movement and position persist after reload'],
    ['auth.agreement','Agreement confirmation and session restoration work'],
    ['auth.api','Saved API level is verified and labeled correctly'],
    ['core.registry','Expected modules appear in Manager'],
    ['module.travel','Travel Assistant opens and controls respond'],
    ['module.item','Item Monitor selection and Cancel work'],
    ['module.war','War Organizer opens and displays players'],
    ['core.recovery','Manager recovers after reload without duplicate windows']
  ];
  const redact=s=>String(s||'').replace(/\b[A-Za-z0-9]{16}\b/g,'[REDACTED]').slice(0,1500);
  const platform=/android|iphone|ipad/i.test(navigator.userAgent)?'mobile/PDA candidate':'desktop/Tampermonkey candidate';
  let state;
  try{state=JSON.parse(localStorage.getItem(key)||'null')}catch{}
  if(!state||!Array.isArray(state.results))state={results:[],started:new Date().toISOString()};
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(state))}catch{}};
  const launcher=document.createElement('button');launcher.textContent='TU Test';launcher.title='Open independent TU diagnostics';
  launcher.style.cssText='position:fixed;bottom:18px;right:18px;z-index:2147483645;background:#233f53;color:white;border:1px solid #9ac;padding:9px 12px;border-radius:8px;font:13px sans-serif;cursor:pointer';
  const panel=document.createElement('section');
  panel.style.cssText='position:fixed;right:12px;bottom:60px;width:min(410px,calc(100vw - 24px));max-height:75vh;overflow:auto;z-index:2147483646;background:#18242d;color:white;padding:14px;border:1px solid #89a;border-radius:10px;font:13px/1.45 sans-serif;box-sizing:border-box;display:none';
  const heading=document.createElement('div');heading.style.cssText='display:flex;justify-content:space-between;align-items:center';
  const title=document.createElement('strong');title.textContent='TU Testing & Diagnostics';
  const close=document.createElement('button');close.textContent='Close';close.onclick=()=>panel.style.display='none';heading.append(title,close);panel.append(heading);
  const meta=document.createElement('p');meta.textContent='Platform: '+platform+' (confirm manually)';panel.append(meta);
  const status=document.createElement('p');panel.append(status);
  const list=document.createElement('div');panel.append(list);
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';panel.append(actions);
  const btn=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;b.style.cssText='padding:6px 9px;cursor:pointer';return b};
  function render(){
    list.replaceChildren();
    const completed=state.results.filter(x=>x&&x.status).length;
    status.textContent=completed+'/'+tests.length+' checks recorded';
    tests.forEach(([id,label],i)=>{
      const wrap=document.createElement('div');wrap.style.cssText='border-top:1px solid #566;padding:8px 0';
      const name=document.createElement('div');name.textContent=(i+1)+'. '+label;wrap.append(name);
      const row=document.createElement('div');row.style.cssText='display:flex;gap:5px;margin-top:5px';
      ['pass','fail','skip'].forEach(result=>{
        const b=btn(result.toUpperCase(),()=>{state.results[i]={id,status:result,at:new Date().toISOString(),note:redact(note.value)};save();render()});
        if(state.results[i]?.status===result)b.style.background='#89b9ad';
        row.append(b);
      });wrap.append(row);
      const note=document.createElement('input');note.placeholder='Optional notes';note.value=state.results[i]?.note||'';note.style.cssText='width:100%;box-sizing:border-box;margin-top:5px';
      note.onchange=()=>{const prev=state.results[i]||{id,status:null};state.results[i]={...prev,note:redact(note.value)};save()};
      wrap.append(note);list.append(wrap);
    });
  }
  actions.append(btn('Export JSON',()=>{
    const report={schemaVersion:1,platform,userAgent:navigator.userAgent,started:state.started,exported:new Date().toISOString(),results:state.results.map(x=>x?{...x,note:redact(x.note)}:null)};
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tu-diagnostics-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }),btn('Reset checklist',()=>{if(confirm('Clear this diagnostic session?')){state={results:[],started:new Date().toISOString()};save();render()}}));
  launcher.onclick=()=>{panel.style.display=panel.style.display==='none'?'block':'none';render()};
  document.body.append(launcher,panel);render();
})();
