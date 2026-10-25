// ==UserScript==
// @name         TU War Hit Organizer
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.1.0-dev
// @description  WHO catalog module foundation; no live attack collection enabled
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(()=>{
  'use strict';
  const MODULE_ID='war-hit-organizer';
  let root=null;
  function activate(){
    const tu=window.TornUtilities;
    if(!tu?.isAuthorized?.())return;
    if(root?.isConnected)return;
    root=document.createElement('section');
    root.id='tu-who-panel';
    root.style.cssText='position:fixed;z-index:2147483646;top:15%;left:10%;width:min(440px,80vw);max-height:75vh;overflow:auto;padding:16px;background:#101417;border:1px solid #c49a46;border-radius:12px;color:#eee;font:14px system-ui';
    const title=document.createElement('h2');title.textContent='War Hit Organizer';root.append(title);
    const status=document.createElement('p');status.textContent='WHO setup foundation. Live attack tracking, assignment, and faction permissions are not yet enabled.';root.append(status);
    const close=document.createElement('button');close.textContent='Exit';close.onclick=()=>{deactivate();tu.closeActiveModule?.()};root.append(close);
    document.body.append(root);
  }
  function deactivate(){root?.remove();root=null}
  function register(){window.TornUtilities?.register?.({id:MODULE_ID,version:'0.1.0-dev',activate,deactivate})}
  if(window.TornUtilities)register();
  else window.addEventListener('torn-utilities-ready',register,{once:true});
})();