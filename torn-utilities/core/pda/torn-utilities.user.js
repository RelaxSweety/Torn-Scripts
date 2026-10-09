// ==UserScript==
// @name         Torn Utilities PDA
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.1.3
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
    ['Business Tools', 'Market Scanner, Bazaar Manager, Trade Calculator and more', '▥'],
    ['Games', 'Flight Game, Stick Fighter', '♜'],
    ['Chat Tools', 'Chat Archiver and chat utilities', '◉'],
    ['Other Tools', 'Additional Torn utilities', '⚙']
  ];
  // Lifecycle API: modules register inert factories; only this manager calls activate().
  const registered = new Map();
  let active = null;
  const moduleHost = document.createElement('div');
  moduleHost.id = 'tu-pda-module-host';
  moduleHost.hidden = true;
  document.body.appendChild(moduleHost);
  const api = Object.freeze({
    register(def) {
      if (!def || typeof def.id !== 'string' || !/^[a-z0-9-]+$/.test(def.id) ||
          typeof def.activate !== 'function' || typeof def.deactivate !== 'function' ||
          registered.has(def.id)) return false;
      registered.set(def.id, Object.freeze({id:def.id, activate:def.activate, deactivate:def.deactivate}));
      if (typeof render === 'function') render('modules');
      return true;
    },
    isRegistered(id) { return registered.has(id); },
    isActive(id) { return active === id; }
  });
  Object.defineProperty(window, 'TornUtilities', {value:api, configurable:false, writable:false});
  window.dispatchEvent(new Event('torn-utilities-ready'));
  const moduleList=[['flight-game','Flight Game'],['chat-archiver','Chat Archiver']];
  function stopModule() {
    if (!active) return;
    const id=active; active=null;
    try { registered.get(id)?.deactivate(); } catch(e) { console.error('[TU] module cleanup failed', id, e); }
    moduleHost.replaceChildren(); moduleHost.hidden=true;
  }
  function openModule(id) {
    const mod=registered.get(id);
    if (!mod) return false;
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
  panel.innerHTML = '<header><span class="tu-logo">TU</span><div><h2>Torn Utilities</h2><p>Modular Tools for Torn City</p></div><button class="tu-close" aria-label="Close">×</button></header><nav><button data-tab="modules" aria-selected="true">Modules</button><button data-tab="settings">Settings</button><button data-tab="about">About</button></nav><div class="tu-content"></div><footer>Torn Utilities v0.1.3 (PDA)</footer>';
  document.body.appendChild(panel);
  const content = panel.querySelector('.tu-content');
  function render(tab) {
    panel.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    content.replaceChildren();
    if (tab === 'modules') {
      for (const [id,name] of moduleList) {
        const card=document.createElement('div'); card.className='tu-card';
        const label=document.createElement('strong'); label.textContent=name;
        const launch=document.createElement('button'); launch.textContent=registered.has(id)?'Open':'Not loaded';
        launch.disabled=!registered.has(id);
        launch.style.cssText='margin-left:auto;padding:8px;border-radius:8px;border:0;background:#dfb952;color:#111';
        launch.addEventListener('click',()=>{if(openModule(id)){panel.hidden=true;launcher.hidden=true;}});
        card.append(label,launch);content.appendChild(card);
      }
      for (const [name, description, symbol] of catalog) {
        const card = document.createElement('div'); card.className = 'tu-card';
        const icon = document.createElement('span'); icon.className = 'tu-symbol'; icon.textContent = symbol;
        const body = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = name;
        const subtitle = document.createElement('small'); subtitle.textContent = description;
        body.append(title, subtitle);
        const status = document.createElement('span'); status.className = 'tu-status'; status.textContent = 'Coming soon';
        card.append(icon, body, status); content.appendChild(card);
      }
    } else {
      const p = document.createElement('p');
      p.textContent = tab === 'settings' ? 'Drag the TU button anywhere on screen. Its position is saved on this device.' : 'Torn Utilities by RelaxSweety [4539436]. This is the initial PDA launcher preview. Modules are not installed or active yet.';
      content.appendChild(p);
    }
  }
  render('modules');
  window.addEventListener('torn-utilities-ready',()=>render('modules'));
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
