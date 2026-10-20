// ==UserScript==
// @name         TU Tic-Tac-Toe Module
// @namespace    https://www.torn.com/
// @version      0.6.4
// @description  Torn PDA mobile multiplayer Tic-Tac-Toe
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      tu-multiplayer-server.tuserver.workers.dev
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/tic-tac-toe.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/tic-tac-toe.user.js
// ==/UserScript==
(()=>{
"use strict";
if(window.__TU_TTT_MODULE__)return;window.__TU_TTT_MODULE__=true;
const ID="tic-tac-toe";let panel=null,host=null,dragCleanup=null;
const API="https://tu-multiplayer-server.tuserver.workers.dev",STORE="tu-ttt-pda-session-v1";
let session=null,timer=null,busy=false,latestGame=null,lastAnnounced=null;
try{localStorage.removeItem("tu-ttt-player-name");session=JSON.parse(localStorage.getItem(STORE));}catch{}
const el=(tag,props={},parent)=>{const n=document.createElement(tag);Object.assign(n,props);parent?.appendChild(n);return n;};
const btn=(label,fn,parent)=>{const b=el("button",{textContent:label},parent);Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"8px",cursor:"pointer"});b.addEventListener("click",fn);return b;};

const HISTORY_KEY="tu:history:"+ID;
function historyRead(){try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(h)?h:[]}catch{return []}}
function recordResult(g){if(!g?.winner||!session?.room)return;const h=historyRead();if(h.some(x=>x.room===session.room&&x.round===(g.round||1)))return;h.unshift({room:session.room,round:g.round||1,symbol:session.symbol,winner:g.winner,moves:g.moves||0,names:g.names||{},completed:new Date().toISOString()});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,200)))}catch{}}
function buildHistoryUI(parent){const wrap=el("div",{},parent);wrap.style.cssText="margin:10px 0;border-top:1px solid #657184;padding-top:8px";const bar=el("div",{},wrap);bar.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px";el("strong",{textContent:"Head-to-head history"},bar);const open=btn("Game History",()=>{page.hidden=!page.hidden;open.textContent=page.hidden?"Game History":"Hide History";update()},bar);const summary=el("div",{},wrap);summary.style.cssText="font-size:12px;line-height:1.6;margin-top:6px";const page=el("div",{},wrap);page.hidden=true;page.style.cssText="max-height:240px;overflow:auto;border:1px solid #657184;padding:8px";function update(){const h=historyRead(),g=latestGame,n=g?.names||{},x=n.X||"Player X",o=n.O||"Player O";const games=h.filter(v=>v.names?.X===x&&v.names?.O===o);const xw=games.filter(v=>v.winner==="X").length,ow=games.filter(v=>v.winner==="O").length,draw=games.filter(v=>v.winner==="draw").length;summary.textContent=x+" "+xw+" wins | "+o+" "+ow+" wins | Draws "+draw+" | Games "+games.length+" (this device)";if(!page.hidden){page.replaceChildren();if(!games.length)el("div",{textContent:"No completed games recorded for this matchup on this device."},page);for(const v of games)el("div",{textContent:new Date(v.completed).toLocaleString()+" | "+(v.winner==="draw"?"Draw":(v.names[v.winner]||"Player "+v.winner)+" won")},page)}}update();return update}

function activate(context){host=context.mount;panel=el("div",{},host);panel.hidden=false;
Object.assign(panel.style,{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%,-50%)",maxHeight:"82vh",overflowY:"auto",boxSizing:"border-box",zIndex:"2147483647",width:"min(360px,94vw)",padding:"15px",background:"#20252e",color:"#fff",border:"1px solid #888",borderRadius:"12px",font:"14px system-ui"});
const bar=el("div",{},panel);
Object.assign(bar.style,{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",cursor:"move",touchAction:"none",userSelect:"none",marginBottom:"10px"});
const heading=el("strong",{textContent:"TU Tic-Tac-Toe"},bar);
const minimize=btn("−",()=>{context.close();},bar);
minimize.title="Minimize to TU";minimize.setAttribute("aria-label","Minimize Tic-Tac-Toe to TU");
Object.assign(minimize.style,{fontSize:"22px",fontWeight:"bold",padding:"0 12px",lineHeight:"30px"});
const grip=el("div",{textContent:"◢"},panel);
Object.assign(grip.style,{position:"absolute",right:"3px",bottom:"2px",width:"30px",height:"30px",display:"flex",alignItems:"end",justifyContent:"end",padding:"3px",boxSizing:"border-box",cursor:"nwse-resize",touchAction:"none",color:"#d6b96a",fontSize:"21px",zIndex:"2"});
panel.style.resize="both";panel.style.minWidth="260px";panel.style.minHeight="260px";panel.style.height="min(480px,78vh)";panel.style.maxWidth="96vw";panel.style.maxHeight="90vh";panel.style.overflow="auto";
function track(handle,resize){
 const start=e=>{if(e.button!==undefined&&e.button!==0)return;if(e.target.closest("button"))return;e.preventDefault();const rect=panel.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
 panel.style.transform="none";panel.style.left=rect.left+"px";panel.style.top=rect.top+"px";panel.style.width=rect.width+"px";panel.style.height=rect.height+"px";
 const move=ev=>{if(ev.pointerId!==e.pointerId)return;const dx=ev.clientX-sx,dy=ev.clientY-sy;
 if(resize){panel.style.width=Math.max(260,Math.min(window.innerWidth-rect.left-8,rect.width+dx))+"px";panel.style.height=Math.max(260,Math.min(window.innerHeight-rect.top-8,rect.height+dy))+"px";}
 else{panel.style.left=Math.max(0,Math.min(window.innerWidth-rect.width,rect.left+dx))+"px";panel.style.top=Math.max(0,Math.min(window.innerHeight-rect.height,rect.top+dy))+"px";}};
 const stop=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",stop);window.removeEventListener("pointercancel",stop);};
 window.addEventListener("pointermove",move);window.addEventListener("pointerup",stop);window.addEventListener("pointercancel",stop);
 dragCleanup=stop;
 };handle.addEventListener("pointerdown",start);
}
track(bar,false);track(grip,true);

const status=el("div",{textContent:"Create or join a room"},panel);
const controls=el("div",{},panel);
controls.style.display="flex";controls.style.gap="6px";controls.style.flexWrap="wrap";
const roomInput=el("input",{placeholder:"ROOM CODE",maxLength:6},controls);Object.assign(roomInput.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"6px"});
btn("Join",()=>{const room=roomInput.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(room))return notice("Invalid room code");const identity=playerIdentity();if(identity)action("/api/rooms/"+room+"/join","POST",identity,true);},controls);
btn("Create",()=>{const identity=playerIdentity();if(identity)action("/api/rooms","POST",identity,true)},controls);
btn("Leave",()=>{session=null;lastAnnounced=null;localStorage.removeItem(STORE);clearInterval(timer);timer=null;render(null);},controls);
const roomText=el("div",{},panel);
const opponentText=el("div",{},panel);
const summaryBtn=btn("Copy game summary",()=>copySummary(),panel);
const rematchBtn=btn("Rematch",()=>{if(session)action("/api/rooms/"+session.room+"/rematch","POST",{});},panel);
const victoryPopup=el("div",{},panel);victoryPopup.hidden=true;victoryPopup.style.cssText="position:sticky;top:8px;z-index:5;background:#143b27;color:#8bffab;border:2px solid #39d879;border-radius:10px;padding:14px;text-align:center;font-size:20px;font-weight:800;box-shadow:0 4px 18px #0009";const victoryText=el("div",{},victoryPopup);btn("Close",()=>{victoryPopup.hidden=true},victoryPopup);
function playerIdentity(){const p=(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.getPlayer?.();if(!p?.name||!p?.id){(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.requestPlayerProfile?.();notice("Open Torn Home to identify your player in TU Manager");return null}return {name:p.name,playerId:String(p.id)}}
function copySummary(){if(!latestGame||!session)return notice("No game to summarize");const g=latestGame,n=g.names||{},x=n.X||"Player X",o=n.O||"Player O",result=g.winner==="draw"?"Draw":g.winner?(n[g.winner]||"Player "+g.winner)+" won":"In progress";const message="Tic-Tac-Toe | "+x+" vs "+o+" | "+result;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(message).then(()=>notice("Summary copied")).catch(()=>fallbackCopy(message));else fallbackCopy(message)}

function fallbackCopy(message){const t=el("textarea",{value:message},panel);t.select();try{document.execCommand("copy");notice("Summary copied - paste into Torn chat");}catch{notice("Select and copy the summary below");}setTimeout(()=>t.remove(),12000);}
btn("Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join TU Tic-Tac-Toe room "+session.room);},panel);
const board=el("div",{},panel);Object.assign(board.style,{position:"relative",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px",marginTop:"12px"});
const winOverlay=el("svg",{},board);winOverlay.setAttribute("viewBox","0 0 300 300");winOverlay.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2";panel._historyUpdate=buildHistoryUI(panel);
const squares=Array.from({length:9},(_,i)=>{const b=btn("",()=>{if(session)action("/api/rooms/"+session.room+"/move","POST",{index:i});},board);Object.assign(b.style,{height:"65px",touchAction:"manipulation",fontSize:"30px",background:"#333c49",color:"#fff"});return b;});
function notice(msg){status.textContent=msg;}
function render(g){latestGame=g;recordResult(g);panel._historyUpdate?.();opponentText.textContent=g&&session?"You: "+(g.names?.[session.symbol]||session.symbol)+" | Opponent: "+(g.names?.[session.symbol==="X"?"O":"X"]||"Waiting"):"";summaryBtn.disabled=!g;rematchBtn.disabled=!g?.winner||!g?.ready||!!g?.rematch?.[session?.symbol];rematchBtn.textContent=g?.rematch?.[session?.symbol]?"Waiting for opponent":"Rematch";const winningLines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];const winningLine=g?.winner&&g.winner!=="draw"?winningLines.find(ids=>ids.every(i=>g.board[i]===g.winner)):null;const key=g&&session&&g.winner?session.room+":"+(g.round||1)+":"+g.winner:null;if(key&&key!==lastAnnounced){lastAnnounced=key;victoryText.textContent=g.winner==="draw"?"Draw!":(g.names?.[g.winner]||"Player "+g.winner)+" Wins!";victoryPopup.hidden=false;}if(!g?.winner)victoryPopup.hidden=true;squares.forEach((b,i)=>{b.textContent=g?.board[i]||"";b.style.color=winningLine?.includes(i)?"#38e477":"#fff";b.style.background=winningLine?.includes(i)?"#174a30":"#333c49";b.disabled=!g||!session||!g.ready||!!g.winner||g.turn!==session.symbol||!!g.board[i]||busy;});winOverlay.replaceChildren();if(g?.winner&&g.winner!=="draw"){const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];const line=lines.find(ids=>ids.every(i=>g.board[i]===g.winner));if(line){const a=line[0],b=line[2],p=i=>({x:50+(i%3)*100,y:50+Math.floor(i/3)*100});const start=p(a),end=p(b);const stroke=el("line",{},winOverlay);for(const [k,v] of Object.entries({x1:start.x,y1:start.y,x2:end.x,y2:end.y,stroke:"#38e477","stroke-width":9,"stroke-linecap":"round"}))stroke.setAttribute(k,v)}}roomText.textContent=session?"Room: "+session.room+" | You: "+session.symbol:"";if(g)notice(g.winner?(g.winner==="draw"?"Draw":(g.names?.[g.winner]||"Player "+g.winner)+" wins!"):!g.ready?"Waiting for opponent":g.turn===session.symbol?"Your turn":"Opponent turn");else notice("Create or join a room");}
function req(path,method="GET",body){
 const headers={"Content-Type":"application/json"};
 if(session?.token)headers.Authorization="Bearer "+session.token;
 const url=API+path;
 const data=method==="POST"?JSON.stringify(body||{}):undefined;
 const parse=(status,raw)=>{let obj;try{obj=JSON.parse(raw);}catch{throw Error("Invalid server response (HTTP "+status+")");}if(status<200||status>=300)throw Error((obj.error||"Server error")+" (HTTP "+status+")");return obj;};
 const native=()=>fetch(url,{method,headers,body:data,mode:"cors",cache:"no-store"}).then(async res=>parse(res.status,await res.text()));
 const gm=()=>new Promise((resolve,reject)=>{if(typeof GM_xmlhttpRequest!=="function")return reject(Error("PDA request bridge unavailable"));try{GM_xmlhttpRequest({method,url,headers,data,onload:res=>{try{resolve(parse(res.status,res.responseText));}catch(e){reject(e);}},onerror:()=>reject(Error("PDA request bridge network error")),ontimeout:()=>reject(Error("PDA request bridge timed out")),timeout:12000});}catch(e){reject(Error("PDA request bridge failed: "+e.message));}});
 return native().catch(e=>{if(typeof GM_xmlhttpRequest!=="function")throw Error("Browser request failed: "+e.message);return gm().catch(g=>{throw Error("Browser: "+e.message+"; PDA: "+g.message);});});
}
async function action(path,method,body,newSession=false){if(busy)return;busy=true;try{const result=await req(path,method,body);if(newSession){lastAnnounced=null;session={room:result.room,token:result.token,symbol:result.symbol};localStorage.setItem(STORE,JSON.stringify(session));}render(result.game);startPolling();}catch(e){notice(e.message);}finally{busy=false;if(session&&panel)refresh();}}
async function refresh(){if(!session||!panel)return;try{const r=await req("/api/rooms/"+session.room+"/state");render(r.game);}catch(e){notice(e.message);}}
function startPolling(){if(timer)clearInterval(timer);if(session)timer=setInterval(()=>{if(!busy)refresh();},2500);}
render(null);if(session){startPolling();refresh();}
}
function deactivate(){dragCleanup?.();dragCleanup=null;clearInterval(timer);timer=null;panel?.remove();panel=null;host=null;latestGame=null;}
function register(){if((typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities?.register){(typeof unsafeWindow!=='undefined'?unsafeWindow:window).TornUtilities.register({id:ID,version:"0.6.4",activate,deactivate});return true;}return false;}
if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
  // TU cross-world registration: retry after manager startup and SPA initialization.
  // Stop once this exact module is visible in the shared manager registry.
  {
    const tuId="tic-tac-toe";
    let tries=0;
    const attempt=()=>{
      const host=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
      if(host.TornUtilities?.isRegistered?.(tuId))return true;
      try{
        if(typeof registerTU==='function')registerTU();
        else if(typeof register==='function')register();
      }catch(err){console.warn('[TU] Registration retry failed for '+tuId,err);}
      return !!host.TornUtilities?.isRegistered?.(tuId);
    };
    if(!attempt()){
      const interval=setInterval(()=>{if(attempt()||++tries>=30)clearInterval(interval)},1000);
      (typeof unsafeWindow!=='undefined'?unsafeWindow:window).addEventListener('torn-utilities-ready',attempt);
    }
  }

})();