// ==UserScript==
// @name         TU Torn Fleet
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.1.0
// @description  Torn Utilities Torn Fleet multiplayer module
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @connect      tu-multiplayer-server.tuserver.workers.dev
// @run-at       document-idle
// ==/UserScript==
(()=>{'use strict';
const ID="torn-fleet",API="https://tu-multiplayer-server.tuserver.workers.dev/api/battleship",STORE="tu:"+ID+":session";
let mount=null,panel=null,timer=null,session=null,game=null,context=null,placement=[],fleet=[];
try{session=JSON.parse(localStorage.getItem(STORE)||"null")}catch{}
const E=(tag,parent,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;parent.append(x);return x};
const B=(parent,text,fn)=>{const b=E("button",parent,text);b.type="button";b.onclick=fn;return b};
const request=(path,method="GET",data)=>new Promise((resolve,reject)=>{
const url=API+path,headers={"Content-Type":"application/json"};if(session?.token)headers.Authorization="Bearer "+session.token;
const handle=(status,body)=>{try{const o=JSON.parse(body);if(status>=400)throw Error(o.error||"Server error");resolve(o)}catch(e){reject(e)}};
if(typeof GM_xmlhttpRequest==="function")GM_xmlhttpRequest({method,url,headers,data:data?JSON.stringify(data):undefined,timeout:12000,onload:r=>handle(r.status,r.responseText),onerror:()=>reject(Error("Network error")),ontimeout:()=>reject(Error("Timeout"))});
else fetch(url,{method,headers,body:data?JSON.stringify(data):undefined}).then(async r=>handle(r.status,await r.text())).catch(reject);
});
const say=s=>{if(panel)panel.querySelector(".status").textContent=s};
async function action(path,method="GET",body,joined=false){try{const r=await request(path,method,body);if(joined){session={room:r.room,token:r.token,symbol:r.symbol};localStorage.setItem(STORE,JSON.stringify(session))}game=r.game;render()}catch(e){say(e.message)}}
function status(g){if(!g)return "Create or join a room";if(g.winner)return g.winner===session.symbol?"You won!":g.winner==="draw"?"Draw":"Opponent won";if(!g.ready)return "Waiting for opponent";if(!g.placed.X||!g.placed.O)return "Place your fleet and wait for opponent";return g.turn===session.symbol?"Fire at enemy waters":"Opponent turn";}
function render(){if(!panel)return;const area=panel.querySelector(".game");area.replaceChildren();say(status(game));panel.querySelector(".room").textContent=session?"Room "+session.room+" | You are "+session.symbol:"";
if(!game)return;
const info=E("p",area,game.placed[session.symbol]?"Your fleet is deployed":"Place 3 ships: lengths 3, 2, 2. Tap cells to select a straight line, then tap Add Ship.");
const own=E("div",area);E("strong",own,"Your waters");const grid=(parent,click,paint)=>{const g=E("div",parent);g.style.cssText="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px";for(let i=0;i<64;i++){const b=B(g,"",()=>click(i));b.style.cssText="height:28px;min-width:0;padding:0;border:1px solid #667; background:"+paint(i)+";color:white";}}; 
grid(own,i=>{if(game.placed[session.symbol])return;placement.includes(i)?placement.splice(placement.indexOf(i),1):placement.push(i);render()},i=>game.incoming.includes(i)?(game.myShips.includes(i)?"#d14b4b":"#d9d9d9"):placement.includes(i)?"#e5ba44":game.myShips.includes(i)?"#4a9b71":"#29384a");
if(!game.placed[session.symbol]){E("p",area,"Selected: "+placement.length+" | Next ship: "+([3,2,2][fleet.length]||0));B(area,"Add Ship",()=>{const len=[3,2,2][fleet.length];if(placement.length!==len)return say("Select "+len+" cells");const rows=placement.map(i=>Math.floor(i/8)),cols=placement.map(i=>i%8);if(!(rows.every(x=>x===rows[0])&&Math.max(...cols)-Math.min(...cols)===len-1||cols.every(x=>x===cols[0])&&Math.max(...rows)-Math.min(...rows)===len-1))return say("Ship must be straight and contiguous");if(fleet.flat().some(i=>placement.includes(i)))return say("Ships cannot overlap");fleet.push([...placement]);placement=[];if(fleet.length===3)action("/"+session.room+"/move","POST",{ships:fleet});else render()})}
const enemy=E("div",area);E("strong",enemy,"Enemy waters (tap to fire)");
grid(enemy,i=>{if(!game.placed.X||!game.placed.O||game.turn!==session.symbol||game.myShots.includes(i)||game.winner)return;action("/"+session.room+"/move","POST",{index:i})},i=>game.myShots.includes(i)?"#d7d7d7":"#29384a");
E("p",area,"Shots fired: "+game.myShots.length+" | Incoming: "+game.incoming.length);

}
function activate(ctx){context=ctx;mount=ctx.mount;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#1d2631;color:#fff;border:1px solid #bd9d55;border-radius:10px;padding:12px;width:min(370px,92vw);height:min(520px,82vh);overflow:auto;resize:both;box-sizing:border-box;font:14px system-ui";
const head=E("div",panel);head.style.cssText="display:flex;justify-content:space-between;align-items:center;touch-action:none;cursor:move";E("strong",head,"Torn Fleet");B(head,"−",()=>ctx.close());
let origin;head.addEventListener("pointerdown",e=>{if(e.target.tagName==="BUTTON")return;const r=panel.getBoundingClientRect();origin={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";head.setPointerCapture(e.pointerId)});head.addEventListener("pointermove",e=>{if(!origin)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,origin.l+e.clientX-origin.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,origin.t+e.clientY-origin.y))+"px"});head.addEventListener("pointerup",()=>origin=null);head.addEventListener("pointercancel",()=>origin=null);
E("p",panel).className="status";const controls=E("div",panel);const code=E("input",controls);code.placeholder="ROOM CODE";code.maxLength=6;code.style.width="110px";
B(controls,"Join",()=>{const c=code.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))return say("Invalid room code");action("/"+c+"/join","POST",{},true)});
B(controls,"Create",()=>action("","POST",{},true));B(controls,"Leave",()=>{session=null;game=null;fleet=[];placement=[];localStorage.removeItem(STORE);render()});
E("p",panel).className="room";B(panel,"Copy invite",()=>{if(session)navigator.clipboard?.writeText("Join Torn Fleet: "+session.room)});E("div",panel).className="game";
render();if(session)action("/"+session.room+"/state");timer=setInterval(()=>{if(session&&panel)action("/"+session.room+"/state")},2500);
}
function deactivate(){clearInterval(timer);timer=null;panel?.remove();panel=null;mount=null;context=null}
const register=()=>window.TornUtilities?.register({id:ID,version:"0.1.0",activate,deactivate});
if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
})();