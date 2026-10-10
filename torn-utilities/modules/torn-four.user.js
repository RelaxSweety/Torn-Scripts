// ==UserScript==
// @name         TU Torn Four
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.2.0
// @description  Torn Utilities Torn Four multiplayer module
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @connect      tu-multiplayer-server.tuserver.workers.dev
// @run-at       document-idle
// ==/UserScript==
(()=>{'use strict';
const ID="torn-four",API="https://tu-multiplayer-server.tuserver.workers.dev/api/connect",STORE="tu:"+ID+":session";
let mount=null,panel=null,timer=null,session=null,game=null,context=null,placement=[],fleet=[];
try{session=JSON.parse(localStorage.getItem(STORE)||"null")}catch{}
const E=(tag,parent,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;parent.append(x);return x};
const B=(parent,text,fn)=>{const b=E("button",parent,text);b.type="button";b.onclick=fn;Object.assign(b.style,{background:"#344154",color:"#fff",border:"1px solid #657184",borderRadius:"6px",padding:"8px",cursor:"pointer",font:"inherit"});return b};
const request=(path,method="GET",data)=>new Promise((resolve,reject)=>{
const url=API+path,headers={"Content-Type":"application/json"};if(session?.token)headers.Authorization="Bearer "+session.token;
const handle=(status,body)=>{try{const o=JSON.parse(body);if(status>=400)throw Error(o.error||"Server error");resolve(o)}catch(e){reject(e)}};
if(typeof GM_xmlhttpRequest==="function")GM_xmlhttpRequest({method,url,headers,data:data?JSON.stringify(data):undefined,timeout:12000,onload:r=>handle(r.status,r.responseText),onerror:()=>reject(Error("Network error")),ontimeout:()=>reject(Error("Timeout"))});
else fetch(url,{method,headers,body:data?JSON.stringify(data):undefined}).then(async r=>handle(r.status,await r.text())).catch(reject);
});

const HISTORY_KEY="tu:history:"+ID;
function historyRead(){try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(x)?x:[]}catch{return []}}
function recordResult(g){if(!g?.winner||!session?.room)return;const h=historyRead();if(h.some(x=>x.room===session.room))return;h.unshift({room:session.room,symbol:session.symbol,winner:g.winner,moves:g.moves||0,completed:new Date().toISOString()});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,200)))}catch{}}
function statsFor(h,s){const matches=h.length,wins=h.filter(x=>x.winner===s).length,draws=h.filter(x=>x.winner==="draw").length;return {matches,wins,draws,losses:matches-wins-draws,rate:matches?Math.round(wins/matches*100):0}}
function statsText(h){return ["X","O"].map(s=>{const a=statsFor(h,s);return "Player "+s+": "+a.wins+"W / "+a.losses+"L / "+a.draws+"D ("+a.rate+"% wins)"}).join(" | ")}
function buildHistoryUI(parent){const wrap=E("div",parent);wrap.style.cssText="margin:10px 0;border-top:1px solid #657184;padding-top:8px";const bar=E("div",wrap);bar.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap";E("strong",bar,"Game statistics");const open=B(bar,"Game History",()=>{const visible=page.hidden;page.hidden=!visible;open.textContent=visible?"Hide History":"Game History";update()});const summary=E("div",wrap);summary.style.cssText="font-size:12px;line-height:1.6;color:#d8dde5;margin-top:6px";const page=E("div",wrap);page.hidden=true;page.style.cssText="margin-top:10px;max-height:240px;overflow:auto;border:1px solid #657184;border-radius:6px;padding:8px";function update(){const h=historyRead();summary.textContent="Completed: "+h.length+" | "+statsText(h);if(!page.hidden){page.replaceChildren();if(!h.length)E("p",page,"No completed matches recorded on this device.");for(const x of h){const row=E("div",page);row.style.cssText="border-bottom:1px solid #485463;padding:6px 0;font-size:12px";const result=x.winner==="draw"?"Draw":"Player "+x.winner+" won";row.textContent=new Date(x.completed).toLocaleString()+" | Room "+x.room+" | "+result+" | "+x.moves+" moves | You: "+x.symbol}}}update();return update}

const say=s=>{if(panel)panel.querySelector(".status").textContent=s};
async function action(path,method="GET",body,joined=false){try{const r=await request(path,method,body);if(joined){session={room:r.room,token:r.token,symbol:r.symbol};localStorage.setItem(STORE,JSON.stringify(session))}game=r.game;recordResult(game);render()}catch(e){say(e.message)}}
function status(g){if(!g)return "Create or join a room";if(g.winner)return g.winner===session.symbol?"You won!":g.winner==="draw"?"Draw":"Opponent won";if(!g.ready)return "Waiting for opponent";return g.turn===session.symbol?"Your turn":"Opponent turn";}
function render(){if(!panel)return;const area=panel.querySelector(".game");area.replaceChildren();say(status(game));panel.querySelector(".room").textContent=session?"Room: "+session.room+" | You: "+session.symbol:"";panel.querySelector(".players").textContent=session?"You: Player "+session.symbol+" | Opponent: Player "+(session.symbol==="X"?"O":"X"):"";panel._historyUpdate?.();

if(!game)return;
const grid=E("div",area);grid.style.cssText="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px";
for(let i=0;i<42;i++){const c=i%7,v=game.board[i];const b=B(grid,v==="X"?"●":v==="O"?"●":"·",()=>action("/"+session.room+"/move","POST",{index:c}));b.style.cssText="min-width:0;height:38px;padding:0;background:"+(v==="X"?"#c44848":v==="O"?"#d9bd52":"#29384a")+";color:white;border:1px solid #687689;border-radius:50%;font-size:25px";b.disabled=!game.ready||!!game.winner||game.turn!==session.symbol||!!game.board[c];}

}
function activate(ctx){context=ctx;mount=ctx.mount;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#20252e;color:#fff;border:1px solid #888;border-radius:12px;padding:15px;width:min(360px,94vw);height:min(480px,78vh);min-width:260px;min-height:260px;max-width:96vw;max-height:90vh;overflow:auto;resize:both;box-sizing:border-box;font:14px system-ui";
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:3px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:21px;z-index:2";const head=E("div",panel);head.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:8px;touch-action:none;user-select:none;cursor:move;margin-bottom:10px";E("strong",head,"Torn Four");const minimize=B(head,"−",()=>ctx.close());minimize.title="Minimize to TU";minimize.setAttribute("aria-label","Minimize game to TU");Object.assign(minimize.style,{fontSize:"22px",fontWeight:"bold",padding:"0 12px",lineHeight:"30px"});
let origin;head.addEventListener("pointerdown",e=>{if(e.target.tagName==="BUTTON")return;const r=panel.getBoundingClientRect();origin={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";head.setPointerCapture(e.pointerId)});head.addEventListener("pointermove",e=>{if(!origin)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,origin.l+e.clientX-origin.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,origin.t+e.clientY-origin.y))+"px"});head.addEventListener("pointerup",()=>origin=null);head.addEventListener("pointercancel",()=>origin=null);
let resizing=null;grip.addEventListener("pointerdown",e=>{e.preventDefault();const r=panel.getBoundingClientRect();resizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";panel.style.width=r.width+"px";panel.style.height=r.height+"px";grip.setPointerCapture(e.pointerId)});grip.addEventListener("pointermove",e=>{if(!resizing)return;panel.style.width=Math.max(260,Math.min(innerWidth-resizing.l-8,resizing.w+e.clientX-resizing.x))+"px";panel.style.height=Math.max(260,Math.min(innerHeight-resizing.t-8,resizing.h+e.clientY-resizing.y))+"px"});grip.addEventListener("pointerup",()=>resizing=null);grip.addEventListener("pointercancel",()=>resizing=null);
const status=E("div",panel,"Create or join a room");status.className="status";const controls=E("div",panel);controls.style.cssText="display:flex;gap:6px;flex-wrap:wrap;align-items:center";const code=E("input",controls);code.placeholder="ROOM CODE";code.maxLength=6;Object.assign(code.style,{width:"110px",background:"#fff",color:"#111",borderRadius:"4px",padding:"6px",font:"inherit",boxSizing:"border-box"});
B(controls,"Join",()=>{const c=code.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))return say("Invalid room code");action("/"+c+"/join","POST",{},true)});
B(controls,"Create",()=>action("","POST",{},true));B(controls,"Leave",()=>{session=null;game=null;fleet=[];placement=[];localStorage.removeItem(STORE);render()});
const roomInfo=E("div",panel);roomInfo.className="room";const playerInfo=E("div",panel);playerInfo.className="players";const share=E("div",panel);share.style.cssText="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0";B(share,"Copy game summary",()=>{if(!game||!session)return say("No game to summarize");const result=game.winner?(game.winner==="draw"?"Draw":game.winner===session.symbol?"You won":"Opponent won"):"In progress";const msg="Torn Four | Room "+session.room+" | Player X vs Player O | "+result+" | Moves: "+game.moves;navigator.clipboard?.writeText(msg).then(()=>say("Summary copied")).catch(()=>say("Clipboard unavailable"))});B(share,"Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join Torn Four: "+session.room)});E("div",panel).className="game";panel._historyUpdate=buildHistoryUI(panel);
render();if(session)action("/"+session.room+"/state");timer=setInterval(()=>{if(session&&panel)action("/"+session.room+"/state")},2500);
}
function deactivate(){clearInterval(timer);timer=null;panel?.remove();panel=null;mount=null;context=null}
const register=()=>window.TornUtilities?.register({id:ID,version:"0.2.0",activate,deactivate});
if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
})();