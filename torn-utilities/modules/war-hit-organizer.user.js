// ==UserScript==
// @name         TU War Hit Organizer
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.2.0-dev
// @description  WHO war target assignments and optional faction attack-log review
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/stable-05424-who/torn-utilities/modules/war-hit-organizer.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/stable-05424-who/torn-utilities/modules/war-hit-organizer.user.js
// ==/UserScript==
(()=>{
 'use strict';
 const ID='war-hit-organizer',STORE='tu:who:state:v2';
 let root=null,ctx=null;
 const load=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}};
 let state=load();
 const persist=()=>localStorage.setItem(STORE,JSON.stringify(state));
 const element=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(parent)parent.append(e);return e};
 const button=(text,parent,fn)=>{const b=element('button',text,parent);b.type='button';b.onclick=fn;b.style.cssText='margin:5px 6px 5px 0;padding:8px 11px;background:#dfb952;border:0;border-radius:7px;color:#111;font-weight:600';return b};
 const input=(label,parent,value='')=>{const box=element('label',undefined,parent);box.style.cssText='display:block;margin:8px 0';element('span',label,box);const e=element('input',undefined,box);e.value=value;e.style.cssText='display:block;box-sizing:border-box;width:100%;padding:8px;margin-top:4px';return e};
 const select=(label,parent,options,value)=>{const wrap=element('label',undefined,parent);wrap.style.cssText='display:block;margin:8px 0';element('span',label,wrap);const el=element('select',undefined,wrap);el.style.cssText='display:block;width:100%;padding:8px';for(const [v,t] of options){const opt=element('option',t,el);opt.value=v}el.value=value;return el};
 function deactivate(){root?.remove();root=null;ctx=null}
 function render(){
  if(!root)return;
  root.replaceChildren();
  const header=element('div',undefined,root);header.style.cssText='display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#101417;padding:0 0 10px';
  element('strong','War Hit Organizer · 0.2.0-dev',header);
  button('Minimize',header,()=>{root.hidden=true;ctx?.minimize?.()});
  button('Exit',header,()=>{if(ctx?.close)ctx.close();else deactivate()});
  const note=element('p','Local planning workspace. Assignments are stored on this device, not synchronized across your faction.',root);note.style.color='#bbb';
  const faction=input('Opposing faction ID',root,state.factionId||'');
  const mode=select('War mode',root,[['real','Real War'],['offline','Offline Only']],state.mode||'real');
  const hits=select('Hits per target',root,[['1','Single'],['2','Double'],['3','Triple']],String(state.hits||1));
  button('Save War Setup',root,()=>{const id=faction.value.trim();if(id&&!/^\d+$/.test(id)){alert('Enter a numeric faction ID');return;}state.factionId=id;state.mode=mode.value;state.hits=Number(hits.value);persist();render()});
  const form=element('section',undefined,root);form.style.cssText='border-top:1px solid #66552f;padding-top:8px';
  element('h3','Target assignments',form);
  const target=input('Target player ID',form);
  const name=input('Target name',form);
  const assignee=input('Assigned attacker',form);
  button('Add / Update Target',form,()=>{
    const id=target.value.trim();if(!/^\d+$/.test(id)){alert('Enter a numeric player ID');return;}
    state.targets=state.targets||{};state.targets[id]={name:name.value.trim().slice(0,80),assignee:assignee.value.trim().slice(0,80),hits:Number(state.hits||1)};persist();render();
  });
  const list=element('div',undefined,root);
  for(const [id,t] of Object.entries(state.targets||{})){
    const row=element('div',undefined,list);row.style.cssText='border-top:1px solid #414141;padding:10px 0';
    element('strong',(t.name||'Player')+' ['+id+']',row);
    element('div','Assigned: '+(t.assignee||'Unassigned')+' · '+(t.hits||1)+' hit(s)',row);
    button('Edit',row,()=>{target.value=id;name.value=t.name||'';assignee.value=t.assignee||'';target.focus()});
    button('Remove',row,()=>{if(!confirm('Remove target '+id+'?'))return;delete state.targets[id];persist();render()});
  }
  const audit=element('section',undefined,root);audit.style.cssText='border-top:1px solid #66552f;padding-top:12px';
  element('h3','Faction attack API',audit);
  const result=element('p','No API request made.',audit);result.style.color='#bbb';
  button('Test Limited API Access',audit,async()=>{
    result.textContent='Checking access…';
    try{
      const data=await window.TornUtilities.requestWhoTorn('/v2/faction/attacks?limit=1');
      const count=Array.isArray(data?.attacks)?data.attacks.length:Object.keys(data?.attacks||{}).length;
      result.textContent='Faction attacks endpoint responded. Returned attack records: '+count+'. Live tracking is not enabled.';
    }catch(err){result.textContent='API check failed: '+err.message}
  });
  element('p','Automated hit attribution, role permissions, cross-device synchronization and hospital-release targeting require additional implementation.',root).style.color='#aaa';
 }
 function activate(context){
   if(!window.TornUtilities?.isAuthorized?.())return;
   ctx=context||null;
   if(root?.isConnected){root.hidden=false;render();return}
   root=document.createElement('section');root.id='tu-who-panel';
   root.style.cssText='position:fixed;z-index:2147483646;top:12%;left:6%;width:min(480px,86vw);max-height:78vh;overflow:auto;padding:14px;background:#101417;border:1px solid #c49a46;border-radius:14px;color:#eee;font:14px system-ui;box-shadow:0 8px 28px #000b';
   document.body.append(root);render();
 }
 function register(){window.TornUtilities?.register?.({id:ID,version:'0.2.0-dev',activate,deactivate})}
 if(window.TornUtilities)register();else window.addEventListener('torn-utilities-ready',register,{once:true});
})();