// ==UserScript==
// @name         TU Chaos Marbles
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.1.0
// @description  Original marble race board game for 2-4 local players
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/chaos-marbles.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/modules/chaos-marbles.user.js
// ==/UserScript==
(()=>{'use strict';
const ID="chaos-marbles",KEY="tu:chaos-marbles:game",HISTORY="tu:chaos-marbles:history";
const COLORS=["#dc6059","#e4b951","#5fb2da","#8fd17b"],NAMES=["Crimson","Gold","Azure","Emerald"];
let panel=null,game=null,notice="",view="play",active=false;
const E=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e};
const B=(parent,label,fn)=>{const b=E("button",parent,label);b.type="button";b.onclick=fn;b.style.cssText="background:#344154;color:#fff;border:1px solid #657184;border-radius:6px;padding:8px 10px;cursor:pointer;font:inherit";return b};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(game))}catch{}};
function newGame(count){game={count,turn:0,marbles:Array.from({length:count},()=>[-1,-1,-1]),roll:null,rolls:0,moves:0,winner:null,started:Date.now(),log:[]};notice="Roll a 6 to release a marble from base.";save();render()}
function legal(p,i,roll){const v=game.marbles[p][i];if(v===35)return false;if(v===-1)return roll===6;if(v+roll>35)return false;const dest=v+roll;if(dest>=32)return !game.marbles[p].some((x,j)=>j!==i&&x===dest);return !game.marbles[p].some((x,j)=>j!==i&&x===dest)}
function choices(){return game.marbles[game.turn].map((_,i)=>i).filter(i=>legal(game.turn,i,game.roll))}
function nextTurn(){game.turn=(game.turn+1)%game.count;game.roll=null;save();render()}
function roll(){if(!game||game.winner!==null||game.roll!==null)return;game.roll=1+Math.floor(Math.random()*6);game.rolls++;notice=NAMES[game.turn]+" rolled "+game.roll+".";if(!choices().length){const extra=game.roll===6;game.roll=null;notice+=" No legal move."+(extra?" Roll again.":" Next player.");if(!extra)game.turn=(game.turn+1)%game.count;}save();render()}
function move(i){if(game.roll===null||!legal(game.turn,i,game.roll))return;const p=game.turn,rollValue=game.roll,old=game.marbles[p][i],dest=old===-1?0:old+rollValue;game.marbles[p][i]=dest;let captured=0;
if(dest<32){const square=(p*8+dest)%32;for(let other=0;other<game.count;other++){if(other===p)continue;for(let j=0;j<3;j++){const op=game.marbles[other][j];if(op>=0&&op<32&&(other*8+op)%32===square){game.marbles[other][j]=-1;captured++}}}}
game.moves++;game.log.unshift(NAMES[p]+" moved marble "+(i+1)+(captured?" and captured "+captured:""));game.log=game.log.slice(0,30);
if(game.marbles[p].every(x=>x===35)){game.winner=p;const history=read(HISTORY,[]);history.unshift({winner:p,count:game.count,moves:game.moves,rolls:game.rolls,ended:new Date().toISOString(),duration:Math.round((Date.now()-game.started)/1000)});try{localStorage.setItem(HISTORY,JSON.stringify(history.slice(0,100)))}catch{}notice=NAMES[p]+" wins!";}else{notice=NAMES[p]+" moved marble "+(i+1)+(captured?" — "+captured+" capture!":"");if(rollValue!==6)game.turn=(p+1)%game.count;}
game.roll=null;save();render()}
function drawBoard(parent){const wrap=E("div",parent);wrap.style.cssText="border:3px solid #d6b96a;background:#121b25;border-radius:10px;padding:5px;margin:10px auto;max-width:420px;box-sizing:border-box";const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 400 400");svg.style.cssText="display:block;width:100%;aspect-ratio:1";wrap.append(svg);
const node=(name,attrs)=>{const n=document.createElementNS("http://www.w3.org/2000/svg",name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);return n};
node("circle",{cx:200,cy:200,r:153,fill:"none",stroke:"#455363","stroke-width":2});
for(let i=0;i<32;i++){const a=-Math.PI/2+i*Math.PI*2/32,x=200+153*Math.cos(a),y=200+153*Math.sin(a);node("circle",{cx:x,cy:y,r:15,fill:i%8===0?COLORS[i/8]:"#293747",stroke:"#708092","stroke-width":1.5})}
for(let p=0;p<game.count;p++){const a=-Math.PI/2+p*Math.PI/2;for(let j=0;j<4;j++){const r=120-j*24;node("circle",{cx:200+r*Math.cos(a),cy:200+r*Math.sin(a),r:10,fill:COLORS[p],opacity:.35,stroke:"#ddd","stroke-width":1})}}
node("circle",{cx:200,cy:200,r:31,fill:"#253344",stroke:"#d6b96a","stroke-width":2});const t=node("text",{x:200,y:205,"text-anchor":"middle",fill:"#f0d68d","font-size":13,"font-weight":"bold"});t.textContent="CHAOS";
for(let p=0;p<game.count;p++){for(let i=0;i<3;i++){const v=game.marbles[p][i];let x,y;if(v===-1){const a=-Math.PI/2+p*Math.PI/2;const bx=200+82*Math.cos(a),by=200+82*Math.sin(a);x=bx+(i-1)*13*Math.cos(a+Math.PI/2);y=by+(i-1)*13*Math.sin(a+Math.PI/2)}else if(v<32){const a=-Math.PI/2+((p*8+v)%32)*Math.PI*2/32;x=200+153*Math.cos(a);y=200+153*Math.sin(a)}else{const a=-Math.PI/2+p*Math.PI/2,r=120-(v-32)*24;x=200+r*Math.cos(a);y=200+r*Math.sin(a)}
const c=node("circle",{cx:x,cy:y,r:9,fill:COLORS[p],stroke:"#fff","stroke-width":2});if(p===game.turn&&game.roll!==null&&legal(p,i,game.roll)){c.style.cursor="pointer";c.setAttribute("stroke-width","4");c.addEventListener("click",()=>move(i))}
const label=node("text",{x,y:y+3.5,"text-anchor":"middle",fill:"#121820","font-size":10,"font-weight":"bold","pointer-events":"none"});label.textContent=i+1}}
}
function historyPage(parent){const h=read(HISTORY,[]);const wins=Array.from({length:4},(_,p)=>h.filter(x=>x.winner===p).length);E("strong",parent,"Completed games: "+h.length);E("p",parent,NAMES.map((n,p)=>n+": "+wins[p]+" wins").join(" | "));if(!h.length)E("p",parent,"No completed games yet.");for(const x of h.slice(0,30)){const row=E("div",parent,new Date(x.ended).toLocaleString()+" — "+NAMES[x.winner]+" won ("+x.count+" players, "+x.moves+" moves, "+x.rolls+" rolls)");row.style.cssText="border-bottom:1px solid #465466;padding:7px 0;font-size:12px"}}
function render(){if(!panel)return;const body=panel.querySelector(".body");body.replaceChildren();const tabs=E("div",body);tabs.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0";B(tabs,"Play",()=>{view="play";render()});B(tabs,"Game History",()=>{view="history";render()});
if(view==="history"){historyPage(body);return}
if(!game){E("p",body,"Local pass-and-play marble race for 2–4 players. Roll a 6 to enter the track, capture opponents, and bring all three marbles home.");for(let n=2;n<=4;n++)B(body,n+" Players",()=>newGame(n));return}
const banner=E("div",body);banner.style.cssText="padding:8px;border-radius:6px;background:#293747";banner.textContent=game.winner!==null?NAMES[game.winner]+" wins!":"Turn: "+NAMES[game.turn]+" | "+(game.roll===null?"Roll the die":"Die: "+game.roll+" — select a highlighted marble");
const msg=E("p",body,notice);msg.style.cssText="font-size:12px;color:#d7dce5;margin:7px 0";drawBoard(body);
const controls=E("div",body);controls.style.cssText="display:flex;flex-wrap:wrap;gap:7px";const die=B(controls,"Roll die",roll);die.disabled=game.roll!==null||game.winner!==null;
if(game.roll!==null)for(const i of choices())B(controls,"Move marble "+(i+1),()=>move(i));
B(controls,"New game",()=>{if(confirm("Start a new Chaos Marbles game?")){game=null;localStorage.removeItem(KEY);render()}});
const stats=E("div",body);stats.style.cssText="margin:10px 0;font-size:12px";stats.textContent="Moves: "+game.moves+" | Rolls: "+game.rolls+" | Finished: "+game.marbles.map((a,p)=>NAMES[p]+" "+a.filter(x=>x===35).length+"/3").join(" · ");
E("p",body,"Rules: Roll 6 to enter. Exact roll required to finish. Landing on a rival marble sends it to base. A 6 earns another roll.").style.fontSize="12px";
}
function activate({mount,close}){if(panel)return;panel=E("section",mount);panel.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#20252e;color:#fff;border:1px solid #888;border-radius:12px;padding:15px;width:min(390px,94vw);height:min(690px,85vh);min-width:260px;min-height:320px;max-width:96vw;max-height:92vh;overflow:auto;resize:both;box-sizing:border-box;font:14px system-ui";
const bar=E("div",panel);bar.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;touch-action:none;user-select:none;cursor:move";E("strong",bar,"Chaos Marbles");const min=B(bar,"−",close);min.title="Minimize to TU";min.style.cssText+=";font-size:22px;font-weight:bold;padding:0 12px;line-height:30px";
let drag=null;bar.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";bar.setPointerCapture(e.pointerId)});bar.addEventListener("pointermove",e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-100,drag.l+e.clientX-drag.x))+"px";panel.style.top=Math.max(0,Math.min(innerHeight-60,drag.t+e.clientY-drag.y))+"px"});bar.addEventListener("pointerup",()=>drag=null);bar.addEventListener("pointercancel",()=>drag=null);
const grip=E("div",panel,"◢");grip.style.cssText="position:absolute;right:3px;bottom:2px;width:30px;height:30px;display:flex;align-items:end;justify-content:end;padding:3px;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:#d6b96a;font-size:21px";let resize=null;grip.onpointerdown=e=>{e.preventDefault();const r=panel.getBoundingClientRect();resize={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:r.left,t:r.top};panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";grip.setPointerCapture(e.pointerId)};grip.onpointermove=e=>{if(!resize)return;panel.style.width=Math.max(260,Math.min(innerWidth-resize.l-8,resize.w+e.clientX-resize.x))+"px";panel.style.height=Math.max(320,Math.min(innerHeight-resize.t-8,resize.h+e.clientY-resize.y))+"px"};grip.onpointerup=()=>resize=null;grip.onpointercancel=()=>resize=null;
E("div",panel).className="body";game=read(KEY,null);render()}
function deactivate(){panel?.remove();panel=null}
function register(){return window.TornUtilities?.register({id:ID,version:"0.1.0",activate,deactivate})}
if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
})();