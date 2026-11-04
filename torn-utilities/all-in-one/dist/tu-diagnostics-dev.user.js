// ==UserScript==
// @name         TU Testing and Diagnostics DEV
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.1.6-dev
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
  const positionKey='tu:aio:diagnostics:launcher-position:v1';
  const panelLayoutKey='tu:aio:diagnostics:panel-layout:v1';
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
  const detectPlatform=()=>{
    const ua=navigator.userAgent||'';
    const pdaSignals=[/torn[ -]?pda/i.test(ua),typeof window.PDA_httpGet==='function',typeof window.PDA_httpPost==='function',typeof window.tornPDA!=='undefined'];
    if(pdaSignals.some(Boolean))return {id:'pda',label:'Torn PDA',confidence:'detected'};
    const tmSignals=[/tampermonkey/i.test(ua),typeof GM_info!=='undefined'&&/tampermonkey/i.test(GM_info?.scriptHandler||'')];
    if(tmSignals.some(Boolean))return {id:'tampermonkey',label:'Tampermonkey',confidence:'detected'};
    return {id:'unknown',label:'Unknown script host',confidence:'unconfirmed'};
  };
  const platformInfo=detectPlatform();
  const platform=platformInfo.id;
  let state;
  try{state=JSON.parse(localStorage.getItem(key)||'null')}catch{}
  if(!state||!Array.isArray(state.results))state={results:[],started:new Date().toISOString()};
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(state))}catch{}};
  const launcher=document.createElement('button');launcher.textContent='TU Test';launcher.title='Open independent TU diagnostics';
  launcher.style.cssText='position:fixed;bottom:18px;right:18px;z-index:2147483645;background:#233f53;color:white;border:1px solid #9ac;padding:9px 12px;border-radius:8px;font:600 13px/1.3 Arial,Helvetica,sans-serif;cursor:pointer';
  // Drag with pointer or touch; a short tap still opens the checklist.
  let position=null;
  try{position=JSON.parse(localStorage.getItem(positionKey)||'null')}catch{}
  if(position&&Number.isFinite(position.x)&&Number.isFinite(position.y)){
    launcher.style.left=Math.max(0,Math.min(window.innerWidth-70,position.x))+'px';
    launcher.style.top=Math.max(0,Math.min(window.innerHeight-35,position.y))+'px';
    launcher.style.right='auto';launcher.style.bottom='auto';
  }
  launcher.style.touchAction='none';
  let drag=null,suppressClick=false;
  launcher.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const rect=launcher.getBoundingClientRect();
    drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:rect.left,y:rect.top,moved:false};
    launcher.setPointerCapture?.(event.pointerId);
  });
  launcher.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(!drag.moved&&Math.hypot(dx,dy)<6)return;
    drag.moved=true;
    const x=Math.max(0,Math.min(window.innerWidth-launcher.offsetWidth,drag.x+dx));
    const y=Math.max(0,Math.min(window.innerHeight-launcher.offsetHeight,drag.y+dy));
    launcher.style.left=x+'px';launcher.style.top=y+'px';launcher.style.right='auto';launcher.style.bottom='auto';
  });
  const finishDrag=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    if(drag.moved){
      suppressClick=true;
      try{localStorage.setItem(positionKey,JSON.stringify({x:parseFloat(launcher.style.left),y:parseFloat(launcher.style.top)}))}catch{}
    }
    drag=null;
  };
  launcher.addEventListener('pointerup',finishDrag);
  launcher.addEventListener('pointercancel',finishDrag);
  const panel=document.createElement('section');
  panel.style.cssText='position:fixed;right:12px;bottom:60px;width:min(410px,calc(100vw - 24px));height:min(530px,calc(100dvh - 36px));min-width:260px;min-height:230px;max-width:100vw;max-height:100dvh;overflow:hidden;display:none;flex-direction:column;z-index:2147483646;background:#18242d;color:white;padding:14px;border:1px solid #89a;border-radius:10px;font:400 14px/1.5 Arial,Helvetica,sans-serif;box-sizing:border-box;resize:both';
  let savedPanelLayout=null;
  try{savedPanelLayout=JSON.parse(localStorage.getItem(panelLayoutKey)||'null')}catch{}
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  if(savedPanelLayout&&['x','y','w','h'].every(k=>Number.isFinite(savedPanelLayout[k]))){
    panel.style.width=clamp(savedPanelLayout.w,260,Math.max(260,innerWidth))+'px';
    panel.style.height=clamp(savedPanelLayout.h,230,Math.max(230,innerHeight))+'px';
    panel.style.left=clamp(savedPanelLayout.x,0,Math.max(0,innerWidth-60))+'px';
    panel.style.top=clamp(savedPanelLayout.y,0,Math.max(0,innerHeight-50))+'px';
    panel.style.right='auto';panel.style.bottom='auto';
  }
  const savePanelLayout=()=>{const rect=panel.getBoundingClientRect();try{localStorage.setItem(panelLayoutKey,JSON.stringify({x:rect.left,y:rect.top,w:rect.width,h:rect.height}))}catch{}};
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(panel.style.display!=='none')savePanelLayout()}).observe(panel);
  // Torn page styles can override native buttons and inputs; scope explicit typography.
  const font='Arial,Helvetica,sans-serif';
  const heading=document.createElement('div');heading.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:move;touch-action:none;flex-shrink:0;user-select:none;padding-bottom:8px';
  const title=document.createElement('strong');title.textContent='TU Testing & Diagnostics';title.style.cssText='font:700 15px/1.4 '+font+';color:#f4f7fa';
  const close=document.createElement('button');close.textContent='Close';close.style.cssText='font:600 12px/1.35 Arial,Helvetica,sans-serif;color:#fff;background:#344d60;border:1px solid #7892a2;border-radius:5px;padding:6px 10px;cursor:pointer';close.onclick=()=>panel.style.display='none';heading.append(title,close);panel.append(heading);
  let panelDrag=null;
  heading.addEventListener('pointerdown',event=>{if(event.button!==0||event.target===close)return;const rect=panel.getBoundingClientRect();panelDrag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};heading.setPointerCapture?.(event.pointerId);event.preventDefault()});
  heading.addEventListener('pointermove',event=>{if(!panelDrag||event.pointerId!==panelDrag.id)return;panel.style.left=clamp(panelDrag.left+event.clientX-panelDrag.x,0,Math.max(0,innerWidth-60))+'px';panel.style.top=clamp(panelDrag.top+event.clientY-panelDrag.y,0,Math.max(0,innerHeight-50))+'px';panel.style.right='auto';panel.style.bottom='auto'});
  const stopPanelDrag=event=>{if(!panelDrag||event.pointerId!==panelDrag.id)return;panelDrag=null;savePanelLayout()};
  heading.addEventListener('pointerup',stopPanelDrag);heading.addEventListener('pointercancel',stopPanelDrag);
  const content=document.createElement('div');content.style.cssText='flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding-right:4px';panel.append(content);
  const meta=document.createElement('p');meta.textContent='Platform: '+platformInfo.label+(platformInfo.confidence==='detected'?' (detected)':' (not identifiable automatically)');content.append(meta);
  const filterBar=document.createElement('div');filterBar.style.cssText='margin:8px 0 12px;position:relative';
  const sections=[['core','Manager core'],['auth','Authentication & API'],['module.travel','Travel Assistant'],['module.item','Item Monitor'],['module.war','War Organizer'],['incomplete','Not passed'],['failed','Failed only']];
  const selectedSections=new Set(sections.map(([id])=>id)); // All selected by default.
  const filterToggle=document.createElement('button');filterToggle.type='button';
  filterToggle.style.cssText='width:100%;text-align:left;font:600 13px/1.4 Arial,Helvetica,sans-serif;color:#f4f7fa;background:#344d60;border:1px solid #7892a2;border-radius:5px;padding:9px 10px;cursor:pointer';
  const filterMenu=document.createElement('div');filterMenu.style.cssText='display:none;position:absolute;left:0;right:0;top:100%;z-index:10;background:#233541;border:1px solid #7892a2;border-radius:5px;max-height:260px;overflow:auto;padding:8px;box-shadow:0 5px 15px #0008';
  const updateFilterLabel=()=>{filterToggle.textContent='Sections ('+selectedSections.size+'/'+sections.length+' selected) ▾'};
  filterToggle.onclick=()=>{filterMenu.style.display=filterMenu.style.display==='none'?'block':'none'};
  sections.forEach(([value,label])=>{
    const line=document.createElement('label');line.style.cssText='display:flex;align-items:center;gap:8px;padding:6px;font:400 13px Arial,Helvetica,sans-serif;color:#fff;cursor:pointer';
    const check=document.createElement('input');check.type='checkbox';check.value=value;check.checked=true;check.style.cssText='width:16px;height:16px;accent-color:#89b9ad';
    check.onchange=()=>{if(check.checked)selectedSections.add(value);else selectedSections.delete(value);updateFilterLabel();render()};
    line.append(check,document.createTextNode(label));filterMenu.append(line);
  });
  const filterActions=document.createElement('div');filterActions.style.cssText='display:flex;gap:6px;margin-top:8px;flex-wrap:wrap';
  const setAllFilters=select=>{selectedSections.clear();filterMenu.querySelectorAll('input[type=checkbox]').forEach(c=>{c.checked=select;if(select)selectedSections.add(c.value)});updateFilterLabel();render()};
  for(const [label,select] of [['Select all',true],['Clear all',false]]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='font:600 12px Arial,Helvetica,sans-serif;padding:7px;color:#fff;background:#344d60;border:1px solid #7892a2;border-radius:5px;cursor:pointer';b.onclick=()=>setAllFilters(select);filterActions.append(b);
  }
  filterMenu.append(filterActions);filterBar.append(filterToggle,filterMenu);content.append(filterBar);updateFilterLabel();
  const status=document.createElement('p');content.append(status);
  const list=document.createElement('div');content.append(list);
  const feedback=document.createElement('div');feedback.style.cssText='border-top:1px solid #566;margin-top:14px;padding-top:12px';
  const feedbackTitle=document.createElement('strong');feedbackTitle.textContent='User feedback';feedbackTitle.style.cssText='font:700 14px Arial,Helvetica,sans-serif;color:#fff';feedback.append(feedbackTitle);
  const feedbackHint=document.createElement('p');feedbackHint.textContent='General feedback, suggestions, or issues not covered by the checklist. Included in JSON export.';feedbackHint.style.cssText='font:400 12px/1.5 Arial,Helvetica,sans-serif;color:#d4e1e9;margin:6px 0';feedback.append(feedbackHint);
  const feedbackInput=document.createElement('textarea');feedbackInput.placeholder='Enter your feedback here';feedbackInput.value=state.feedback||'';feedbackInput.style.cssText='display:block;width:100%;min-height:90px;box-sizing:border-box;resize:vertical;padding:8px;font:400 13px/1.4 Arial,Helvetica,sans-serif;color:#18242d;background:#fff;border:1px solid #a8b5bf;border-radius:4px';
  feedbackInput.addEventListener('input',()=>{state.feedback=redact(feedbackInput.value);save()});feedback.append(feedbackInput);content.append(feedback);
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';content.append(actions);
  const btn=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;b.style.cssText='font:600 12px/1.35 '+font+';color:#f4f7fa;background:#344d60;border:1px solid #7892a2;border-radius:5px;padding:7px 10px;min-height:32px;cursor:pointer;appearance:none;text-shadow:none';return b};
  function render(){
    list.replaceChildren();
    const completed=state.results.filter(x=>x&&x.status).length;
    const visible=tests.filter(([id],i)=>[...selectedSections].some(section=>(section==='incomplete'&&state.results[i]?.status!=='pass')||(section==='failed'&&state.results[i]?.status==='fail')||id===section||id.startsWith(section+'.')));
    status.textContent=completed+'/'+tests.length+' checks recorded · '+visible.length+' shown';
    tests.forEach(([id,label],i)=>{
      if(!visible.some(t=>t[0]===id))return;
      const wrap=document.createElement('div');wrap.style.cssText='border-top:1px solid #566;padding:10px 0';
      const name=document.createElement('div');name.textContent=(i+1)+'. '+label;name.style.cssText='font:600 13px/1.45 '+font+';color:#f4f7fa';wrap.append(name);
      const row=document.createElement('div');row.style.cssText='display:flex;gap:5px;margin-top:5px';
      ['pass','fail','skip'].forEach(result=>{
        const b=btn(result.toUpperCase(),()=>{state.results[i]={id,status:result,at:new Date().toISOString(),note:redact(note.value)};save();render()});
        if(state.results[i]?.status===result){b.style.background='#89b9ad';b.style.color='#10262a';}
        row.append(b);
      });wrap.append(row);
      const note=document.createElement('input');note.placeholder='Optional notes';note.value=state.results[i]?.note||'';note.style.cssText='width:100%;box-sizing:border-box;margin-top:7px;padding:7px 9px;min-height:34px;font:400 13px/1.4 '+font+';color:#18242d;background:#fff;border:1px solid #a8b5bf;border-radius:4px';
      note.onchange=()=>{const prev=state.results[i]||{id,status:null};state.results[i]={...prev,note:redact(note.value)};save()};
      wrap.append(note);list.append(wrap);
    });
  }
  actions.append(btn('Export JSON',()=>{
    const report={schemaVersion:1,platform,platformDetection:platformInfo.confidence,userAgent:navigator.userAgent,started:state.started,exported:new Date().toISOString(),feedback:redact(state.feedback),results:state.results.map(x=>x?{...x,note:redact(x.note)}:null)};
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tu-diagnostics-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }),btn('Reset checklist',()=>{if(confirm('Clear this diagnostic session?')){state={results:[],feedback:'',started:new Date().toISOString()};feedbackInput.value='';save();render()}}));
  launcher.onclick=()=>{if(suppressClick){suppressClick=false;return;}panel.style.display=panel.style.display==='none'?'flex':'none';render()};
  document.body.append(launcher,panel);render();
})();
