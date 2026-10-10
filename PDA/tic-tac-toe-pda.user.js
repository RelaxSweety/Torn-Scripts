// ==UserScript==
// @name         TU Multiplayer Arcade - Tic-Tac-Toe (PDA)
// @namespace    https://www.torn.com/
// @version      0.1.2
// @description  Torn PDA mobile multiplayer Tic-Tac-Toe
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @connect      tu-multiplayer-server.tyler-a-wood.workers.dev
// ==/UserScript==
(()=>{
"use strict";
if(window.__TU_TTT_PDA__)return;window.__TU_TTT_PDA__=true;
const API="https://tu-multiplayer-server.tyler-a-wood.workers.dev",STORE="tu-ttt-pda-session-v1";
let session=null,timer=null,busy=false;
try{session=JSON.parse(localStorage.getItem(STORE));}catch{}
const el=(tag,props={},parent)=>{const n=document.createElement(tag);Object.assign(n,props);parent?.appendChild(n);return n;};
const btn=(label,fn,parent)=>{const b=el("button",{textContent:label},parent);Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"8px",cursor:"pointer"});b.addEventListener("click",fn);return b;};
const toggle=btn("TU XO",()=>{panel.hidden=!panel.hidden;if(!panel.hidden)refresh();},document.body);
Object.assign(toggle.style,{position:"fixed",right:"12px",bottom:"100px",touchAction:"manipulation",zIndex:"2147483646",padding:"9px",background:"#242b35",color:"#fff",borderRadius:"10px"});
const panel=el("div",{},document.body);panel.hidden=true;
Object.assign(panel.style,{position:"fixed",right:"12px",bottom:"150px",maxHeight:"70vh",overflowY:"auto",boxSizing:"border-box",zIndex:"2147483647",width:"min(340px,90vw)",padding:"15px",background:"#20252e",color:"#fff",border:"1px solid #888",borderRadius:"12px",font:"14px system-ui"});
el("h3",{textContent:"TU Tic-Tac-Toe"},panel);
const status=el("div",{textContent:"Create or join a room"},panel),controls=el("div",{},panel);
controls.style.display="flex";controls.style.gap="6px";controls.style.flexWrap="wrap";
const roomInput=el("input",{placeholder:"ROOM CODE",maxLength:6},controls);Object.assign(roomInput.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"6px"});
btn("Join",()=>{const room=roomInput.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(room))return notice("Invalid room code");action("/api/rooms/"+room+"/join","POST",{},true);},controls);
btn("Create",()=>action("/api/rooms","POST",{},true),controls);
btn("Leave",()=>{session=null;localStorage.removeItem(STORE);clearInterval(timer);timer=null;render(null);},controls);
const roomText=el("div",{},panel);
btn("Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join TU Tic-Tac-Toe room "+session.room);},panel);
const board=el("div",{},panel);Object.assign(board.style,{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px",marginTop:"12px"});
const squares=Array.from({length:9},(_,i)=>{const b=btn("",()=>{if(session)action("/api/rooms/"+session.room+"/move","POST",{index:i});},board);Object.assign(b.style,{height:"65px",touchAction:"manipulation",fontSize:"30px",background:"#333c49",color:"#fff"});return b;});
function notice(msg){status.textContent=msg;}
function render(g){squares.forEach((b,i)=>{b.textContent=g?.board[i]||"";b.disabled=!g||!session||!g.ready||!!g.winner||g.turn!==session.symbol||!!g.board[i]||busy;});roomText.textContent=session?"Room: "+session.room+" | You: "+session.symbol:"";if(g)notice(g.winner?(g.winner==="draw"?"Draw":g.winner===session.symbol?"You won!":"Opponent won"):!g.ready?"Waiting for opponent":g.turn===session.symbol?"Your turn":"Opponent turn");else notice("Create or join a room");}
function req(path,method="GET",body){return new Promise((resolve,reject)=>{const headers={"Content-Type":"application/json"};if(session?.token)headers.Authorization="Bearer "+session.token;const finish=(s,t)=>{let obj;try{obj=JSON.parse(t);}catch{return reject(Error("Invalid server response"));}s>=200&&s<300?resolve(obj):reject(Error(obj.error||"Server error"));};if(typeof GM_xmlhttpRequest==="function")GM_xmlhttpRequest({method,url:API+path,headers,data:method==="POST"?JSON.stringify(body||{}):undefined,onload:r=>finish(r.status,r.responseText),onerror:()=>reject(Error("Network error"))});else fetch(API+path,{method,headers,body:method==="POST"?JSON.stringify(body||{}):undefined}).then(async r=>finish(r.status,await r.text())).catch(reject);});}
async function action(path,method,body,newSession=false){if(busy)return;busy=true;try{const result=await req(path,method,body);if(newSession){session={room:result.room,token:result.token,symbol:result.symbol};localStorage.setItem(STORE,JSON.stringify(session));}render(result.game);startPolling();}catch(e){notice(e.message);}finally{busy=false;if(session)refresh();}}
async function refresh(){if(!session)return;try{const r=await req("/api/rooms/"+session.room+"/state");render(r.game);}catch(e){notice(e.message);}}
function startPolling(){if(timer)clearInterval(timer);if(session)timer=setInterval(()=>{if(!busy)refresh();},2500);}
render(null);if(session)startPolling();
})();