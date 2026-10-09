// ==UserScript==
// @name         Torn Utilities PDA
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.3.1
// @description  Movable TU launcher and module catalog for Torn PDA
// @author       RelaxSweety [4539436]
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/core/pda/torn-utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/core/pda/torn-utilities.user.js
// ==/UserScript==
(() => {
  'use strict';
  if (window.__RELAX_TORN_UTILITIES_PDA__) return;
  window.__RELAX_TORN_UTILITIES_PDA__ = true;
  const KEY = 'relaxsweety_tu_pda_v1';
  const catalog = [
    {id:'business',name:'Business Tools',desc:'Market Scanner, Bazaar Manager, Trade Calculator and more',icon:'▥',modules:[]},
    {id:'games',name:'Games',desc:'Flight Game, Stick Fighter',icon:'♜',modules:['flight-game']},
    {id:'chat',name:'Chat Tools',desc:'Chat Archiver and chat utilities',icon:'◉',modules:['chat-archiver']},
    {id:'other',name:'Other Tools',desc:'Additional Torn utilities',icon:'⚙',modules:[]}
  ];
  const available = [
    {id:'flight-game',name:'Flight Game',category:'games',url:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/pda-flight-game/Torn-PDA-Flight-Game.user.js'},
    {id:'chat-archiver',name:'Chat Archiver',category:'chat',url:'https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/chat-archiver/pda/src/torn-multi-chat-archiver-pda.user.js'}
  ];
  // Lifecycle API: modules register inert factories; only this manager calls activate().
  const registered = new Map();
  let active = null;
  const moduleHost = document.createElement('div');
  moduleHost.id = 'tu-pda-module-host';
  moduleHost.hidden = true;
  document.body.appendChild(moduleHost);
  // v0.3 storage: synchronous, namespaced, JSON values; available to independently installed modules.
  const DATA_PREFIX='tu:data:v1:';
  const VALID_ID=/^[a-z0-9-]{1,64}$/;
  const VALID_KEY=/^[a-zA-Z0-9_.-]{1,100}$/;
  const storageKey=(id,key)=>{
    if(!VALID_ID.test(id)||!VALID_KEY.test(key))throw new Error('Invalid TU storage namespace/key');
    return DATA_PREFIX+id+':'+key;
  };
  const storage=Object.freeze({
    get(id,key,fallback=null){
      const raw=localStorage.getItem(storageKey(id,key));
      if(raw===null)return fallback;
      try{return JSON.parse(raw);}catch{return fallback;}
    },
    set(id,key,value){
      if(value===undefined)throw new Error('Cannot store undefined');
      localStorage.setItem(storageKey(id,key),JSON.stringify(value));
      return true;
    },
    remove(id,key){localStorage.removeItem(storageKey(id,key));},
    keys(id){
      if(!VALID_ID.test(id))throw new Error('Invalid namespace');
      const prefix=DATA_PREFIX+id+':';
      return Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length)).sort();
    },
    clear(id){for(const key of this.keys(id))localStorage.removeItem(storageKey(id,key));},
    namespaces(){
      return [...new Set(Object.keys(localStorage).filter(k=>k.startsWith(DATA_PREFIX))
        .map(k=>k.slice(DATA_PREFIX.length).split(':')[0]))].sort();
    }
  });
  function exportData(){
    const data={format:'torn-utilities-backup',schema:1,createdAt:new Date().toISOString(),managerSettings:saved,modules:{}};
    for(const id of storage.namespaces()){
      data.modules[id]={};
      for(const key of storage.keys(id))data.modules[id][key]=storage.get(id,key);
    }
    return JSON.stringify(data,null,2);
  }
  function importData(text){
    if(text.length>3_000_000)throw new Error('Backup exceeds 3 MB limit');
    const data=JSON.parse(text);
    if(data?.format!=='torn-utilities-backup'||data.schema!==1||
       !data.modules||typeof data.modules!=='object'||Array.isArray(data.modules))throw new Error('Invalid backup format');
    const pending=[];
    for(const [id,records] of Object.entries(data.modules)){
      if(!VALID_ID.test(id)||!records||typeof records!=='object'||Array.isArray(records))throw new Error('Invalid module data');
      for(const [key,value] of Object.entries(records))pending.push([storageKey(id,key),JSON.stringify(value)]);
    }
    if(pending.length>2000)throw new Error('Too many backup entries');
    // Additive restore: existing keys not in the backup are preserved.
    for(const [key,value] of pending)localStorage.setItem(key,value);
    if(data.managerSettings&&typeof data.managerSettings==='object'&&!Array.isArray(data.managerSettings)){
      saved.disabled={...(saved.disabled||{}),...(data.managerSettings.disabled||{})};
      persist();
    }
    return pending.length;
  }
  const api = Object.freeze({
    storage,
    register(def) {
      if (!def || typeof def.id !== 'string' || !/^[a-z0-9-]+$/.test(def.id) ||
          typeof def.activate !== 'function' || typeof def.deactivate !== 'function' ||
          registered.has(def.id)) return false;
      registered.set(def.id, Object.freeze({id:def.id, activate:def.activate, deactivate:def.deactivate}));
      if (typeof render === 'function') render(currentTab);
      return true;
    },
    isRegistered(id) { return registered.has(id); },
    isActive(id) { return active === id; }
  });
  Object.defineProperty(window, 'TornUtilities', {value:api, configurable:false, writable:false});
  window.dispatchEvent(new Event('torn-utilities-ready'));
  let currentTab='modules';
  // PDA Scripts installs modules independently; TU only manages registered modules.
  function stopModule() {
    if (!active) return;
    const id=active; active=null;
    try { registered.get(id)?.deactivate(); } catch(e) { console.error('[TU] module cleanup failed', id, e); }
    moduleHost.replaceChildren(); moduleHost.hidden=true;
  }
  function openModule(id) {
    const mod=registered.get(id);
    if (!mod || saved.disabled?.[id]) return false;
    stopModule();
    moduleHost.hidden=false;
    const exit=document.createElement('button');
    exit.textContent='TU ×'; exit.setAttribute('aria-label','Close module and return to Torn Utilities');
    exit.style.cssText='position:fixed;top:12px;right:12px;z-index:2147483647;background:#15191c;color:#f1ce72;border:1px solid #dfb952;border-radius:14px;padding:8px 12px;font:bold 15px Georgia';
    exit.addEventListener('click',()=>{stopModule();panel.hidden=false;launcher.hidden=true;render('modules');});
    moduleHost.appendChild(exit);
    try {
      active=id;
      mod.activate(Object.freeze({mount:moduleHost, close:stopModule}));
      return true;
    } catch(e) {
      console.error('[TU] module activation failed', id, e);
      try { mod.deactivate(); } catch {}
      moduleHost.replaceChildren(); moduleHost.hidden=true;
      return false;
    }
  }
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} };
  const style = document.createElement('style');
  style.textContent = `
#tu-pda-launcher{position:fixed;left:12px;top:38%;z-index:2147483645;touch-action:none;width:43px;height:43px;border-radius:50%;border:2px solid #e3bb57;background:radial-gradient(circle at 35% 25%,#293b45,#07090b 70%);color:#f5d87e;box-shadow:0 2px 9px #000b,inset 0 0 4px #f5d87e66;font:bold italic 23px 'Palatino Linotype','Book Antiqua',Georgia,serif;letter-spacing:-2px;padding:0 2px 0 0;display:flex;align-items:center;justify-content:center;line-height:1;cursor:grab;user-select:none;-webkit-user-select:none}
#tu-pda-launcher:active{cursor:grabbing}
#tu-pda-launcher[hidden]{display:none!important}
#tu-pda-panel{position:fixed;z-index:2147483644;inset:8% 3% auto 3%;max-width:440px;margin:auto;max-height:82vh;overflow:auto;background:#101417;color:#eee;border:1px solid #c49a46;border-radius:18px;box-shadow:0 10px 35px #000d;font:14px system-ui,Arial,sans-serif}
#tu-pda-panel[hidden]{display:none}
#tu-pda-panel *{box-sizing:border-box}
#tu-pda-panel header{display:flex;align-items:center;gap:12px;padding:17px;border-bottom:1px solid #4a3c21}
#tu-pda-panel .tu-logo{font:bold italic 29px Georgia,serif;color:#f1ce72}
#tu-pda-panel h2{font-size:22px;margin:0;color:#f1ce72}
#tu-pda-panel p{margin:4px 0;color:#aeb4bd}
#tu-pda-panel button{cursor:pointer}
#tu-pda-panel .tu-close{margin-left:auto;background:none;border:0;color:#ddd;font-size:28px}
#tu-pda-panel nav{display:flex;gap:6px;padding:10px}
#tu-pda-panel nav button{flex:1;background:#252a2e;border:0;color:#ddd;padding:11px 4px;border-radius:20px}
#tu-pda-panel nav button[aria-selected=true]{background:#dfb952;color:#141414;font-weight:700}
#tu-pda-panel .tu-content{padding:4px 12px 16px}
#tu-pda-panel .tu-card{padding:13px;display:flex;align-items:center;gap:12px;background:#1c2226;border:1px solid #32383b;border-radius:12px;margin:9px 0}
#tu-pda-panel .tu-symbol{font-size:25px;color:#e1b95a;min-width:30px}
#tu-pda-panel .tu-card strong{display:block;font-size:16px}
#tu-pda-panel .tu-card small{color:#b6bac0}
#tu-pda-panel .tu-status{margin-left:auto;white-space:nowrap;color:#a9abb0;font-size:11px}
#tu-pda-panel footer{border-top:1px solid #59451d;padding:13px;color:#aeb4bd;font-size:12px}
`;
  document.head.appendChild(style);
  const launcher = document.createElement('button');
  launcher.id = 'tu-pda-launcher';
  launcher.type = 'button';
  launcher.textContent = 'TU';
  launcher.setAttribute('aria-label', 'Open Torn Utilities; drag to reposition');
  document.body.appendChild(launcher);
  const panel = document.createElement('section');
  panel.id = 'tu-pda-panel';
  panel.hidden = true;
  panel.innerHTML = '<header><span class="tu-logo">TU</span><div><h2>Torn Utilities</h2><p>Modular Tools for Torn City</p></div><button class="tu-close" aria-label="Close">×</button></header><nav><button data-tab="modules" aria-selected="true">Modules</button><button data-tab="settings">Settings</button><button data-tab="about">About</button></nav><div class="tu-content"></div><footer>Torn Utilities v0.3.1 (PDA)</footer>';
  document.body.appendChild(panel);
  const content = panel.querySelector('.tu-content');
  function makeButton(label,handler,disabled=false) {
    const btn=document.createElement('button');btn.type='button';btn.textContent=label;
    btn.disabled=disabled;
    btn.style.cssText='margin-left:auto;padding:8px 10px;border-radius:8px;border:0;background:#dfb952;color:#111;white-space:nowrap;font-weight:600;'+(disabled?'opacity:.5;':'');
    if(handler)btn.addEventListener('click',handler);
    return btn;
  }
  function render(tab) {
    currentTab=tab;
    panel.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
    content.replaceChildren();
    if(tab==='modules'){
      for(const group of catalog){
        const card=document.createElement('div');card.className='tu-card';
        const symbol=document.createElement('span');symbol.className='tu-symbol';symbol.textContent=group.icon;
        const body=document.createElement('div');body.style.flex='1';
        const title=document.createElement('strong');title.textContent=group.name;
        const desc=document.createElement('small');desc.textContent=group.desc;
        body.append(title,desc);card.append(symbol,body);
        const loaded=group.modules.filter(id=>registered.has(id)&&!saved.disabled?.[id]);
        if(loaded.length){
          card.append(makeButton('Open',()=>{
            if(loaded.length===1){if(openModule(loaded[0])){panel.hidden=true;launcher.hidden=true;}}
            else renderGroup(group);
          }));
        } else {
          const status=document.createElement('span');status.className='tu-status';status.textContent='Not loaded';
          card.append(status);
        }
        content.append(card);
      }
    }else if(tab==='settings'){
      const hint=document.createElement('p');
      hint.textContent='Install modules in Torn PDA Scripts, then reload Torn. Enable modules here to make them available in the Modules tab.';
      content.append(hint);
      for(const mod of available){
        const card=document.createElement('div');card.className='tu-card';
        const body=document.createElement('div');body.style.flex='1;min-width:0';
        const title=document.createElement('strong');title.textContent=mod.name;
        const state=document.createElement('small');
        const loaded=registered.has(mod.id),enabled=!saved.disabled?.[mod.id];
        state.textContent=loaded?(enabled?'Loaded · enabled':'Loaded · disabled'):'Not loaded · install in PDA Scripts';
        body.append(title,state);card.append(body);
        const controls=document.createElement('div');controls.style.cssText='display:flex;flex-direction:column;gap:5px';
        if(loaded)controls.append(makeButton(enabled?'Disable':'Activate',()=>{
          saved.disabled ||= {};saved.disabled[mod.id]=enabled;
          if(enabled&&active===mod.id)stopModule();
          persist();render('settings');
        }));
        card.append(controls);content.append(card);
      }
      const note=document.createElement('p');
      note.textContent='Install or update module scripts separately in Torn PDA Scripts. TU detects installed modules and controls activation. Disabling a module preserves its data.';
      content.append(note);
      const heading=document.createElement('strong');heading.textContent='Storage & Backups';content.append(heading);
      const summary=document.createElement('p');
      const spaces=storage.namespaces();
      summary.textContent=spaces.length+' module data namespace(s): '+(spaces.join(', ')||'none')+'. Data remains when modules are disabled or removed.';
      content.append(summary);
      const backup=makeButton('Export backup',()=>{
        try{
          const json=exportData();
          const blob=new Blob([json],{type:'application/json'});
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a');a.href=url;a.download='torn-utilities-backup-'+new Date().toISOString().slice(0,10)+'.json';
          document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
          setStatus('storage','Backup file prepared');
        }catch(e){setStatus('storage','Export failed: '+e.message);}
      });
      content.append(backup);
      const importBtn=makeButton('Restore backup',()=>{
        const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
        input.addEventListener('change',async()=>{
          const file=input.files?.[0];if(!file)return;
          try{
            if(!confirm('Restore TU backup? Existing keys in the backup will be overwritten.'))return;
            const count=importData(await file.text());
            alert('Restored '+count+' entries. Reload Torn to apply restored settings.');
            render('settings');
          }catch(e){alert('Restore failed: '+e.message);}
        });
        input.click();
      });
      content.append(importBtn);
      if(statusText.storage){const msg=document.createElement('p');msg.textContent=statusText.storage;content.append(msg);}
      const privacy=document.createElement('p');privacy.textContent='Backups contain TU-managed settings and module data only. Large archives and legacy module storage are not included. Do not store API keys in TU backups.';content.append(privacy);
      for(const id of spaces){
        const line=document.createElement('div');line.className='tu-card';
        const name=document.createElement('span');name.textContent=id+' ('+storage.keys(id).length+' keys)';name.style.flex='1';
        line.append(name,makeButton('Clear data',()=>{
          if(confirm('Permanently delete all TU data for '+id+'? This cannot be undone.')){storage.clear(id);render('settings');}
        }));content.append(line);
      }
    }else{
      const p=document.createElement('p');
      p.textContent='Torn Utilities by RelaxSweety [4539436]. Drag the TU button to reposition it. Modules are managed through Settings.';
      content.append(p);
    }
  }
  function renderGroup(group){
    content.replaceChildren();
    content.append(makeButton('← Back',()=>render('modules')));
    for(const id of group.modules){
      if(!registered.has(id)||saved.disabled?.[id])continue;
      const mod=available.find(x=>x.id===id);
      const card=document.createElement('div');card.className='tu-card';
      const label=document.createElement('strong');label.textContent=mod?.name||id;
      card.append(label,makeButton('Open',()=>{if(openModule(id)){panel.hidden=true;launcher.hidden=true;}}));
      content.append(card);
    }
  }
  render('modules');
  window.addEventListener('torn-utilities-ready',()=>render(currentTab));
  // A module script can be installed separately, but remains inert until Open is pressed.

  const closePanel = () => { panel.hidden = true; launcher.hidden = false; };
  const togglePanel = () => { panel.hidden = !panel.hidden; launcher.hidden = !panel.hidden; };
  panel.querySelector('.tu-close').addEventListener('click', () => { stopModule(); closePanel(); });
  panel.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => render(b.dataset.tab)));
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const setPos = (x, y) => {
    launcher.style.left = clamp(x, 0, Math.max(0, innerWidth - launcher.offsetWidth)) + 'px';
    launcher.style.top = clamp(y, 0, Math.max(0, innerHeight - launcher.offsetHeight)) + 'px';
  };
  if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPos(saved.x, saved.y);
  let gesture = null;
  launcher.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    gesture = {id:e.pointerId, sx:e.clientX, sy:e.clientY, x:launcher.offsetLeft, y:launcher.offsetTop, moved:false};
    launcher.setPointerCapture(e.pointerId);
  });
  launcher.addEventListener('pointermove', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const dx=e.clientX-gesture.sx, dy=e.clientY-gesture.sy;
    if (Math.hypot(dx,dy)>6) gesture.moved=true;
    if (gesture.moved) setPos(gesture.x+dx,gesture.y+dy);
  });
  launcher.addEventListener('pointerup', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const moved=gesture.moved; gesture=null;
    if (moved) { saved.x=launcher.offsetLeft; saved.y=launcher.offsetTop; persist(); }
    else { if (!panel.hidden) stopModule(); togglePanel(); }
  });
  launcher.addEventListener('pointercancel', () => { gesture=null; });
  window.addEventListener('resize', () => {
    if (saved.x !== undefined) setPos(launcher.offsetLeft, launcher.offsetTop);
  });
})();
