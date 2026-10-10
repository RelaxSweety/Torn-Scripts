// ==UserScript==
// @name         TU Slithering Streets
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.1.0
// @description  Torn Utilities mobile-friendly Snake arcade
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(()=>{'use strict';const ID="torn-snake";let panel=null,canvas=null,ctx=null,timer=null,head=null,score=0,food=null,dir=[1,0],next=[1,0],snake=[],running=false;
const E=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e};
function spawn(){do{food=Math.floor(Math.random()*400)}while(snake.includes(food))}
function draw(){if(!ctx)return;ctx.fillStyle="#17232c";ctx.fillRect(0,0,320,320);ctx.fillStyle="#d6a950";ctx.fillRect(food%20*16,Math.floor(food/20)*16,15,15);ctx.fillStyle="#62c68b";for(const n of snake)ctx.fillRect(n%20*16,Math.floor(n/20)*16,15,15);panel.querySelector(".score").textContent="Score: "+score+" | Best: "+(localStorage.getItem("tu:snake:best")||0)}
function end(){running=false;clearInterval(timer);timer=null;const best=Math.max(score,Number(localStorage.getItem("tu:snake:best")||0));localStorage.setItem("tu:snake:best",best);draw()}
function tick(){dir=next;const x=snake[0]%20+dir[0],y=Math.floor(snake[0]/20)+dir[1],n=y*20+x;if(x<0||x>=20||y<0||y>=20||snake.slice(0,food===n?undefined:-1).includes(n)){end();return}snake.unshift(n);if(n===food){score++;spawn()}else snake.pop();draw()}
function turn(x,y){if(x===-dir[0]&&y===-dir[1])return;next=[x,y]}
function start(){clearInterval(timer);score=0;snake=[210,209,208];dir=[1,0];next=[1,0];spawn();running=true;draw();timer=setInterval(tick,125)}
function activate({mount,close}){panel=E("section",mount);panel.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(370px,95vw);max-height:90vh;overflow:auto;resize:both;background:#19232b;color:white;border:1px solid #bda05d;border-radius:10px;padding:12px;box-sizing:border-box;z-index:2147483647;font:14px system-ui";
const bar=E("div",panel);bar.style.cssText="display:flex;justify-content:space-between;cursor:move;touch-action:none";E("strong",bar,"Slithering Streets");const min=E("button",bar,"−");min.onclick=close;
let drag;bar.onpointerdown=e=>{if(e.target===min)return;const r=panel.getBoundingClientRect();drag=[e.clientX,e.clientY,r.left,r.top];panel.style.transform="none";panel.style.left=r.left+"px";panel.style.top=r.top+"px";bar.setPointerCapture(e.pointerId)};bar.onpointermove=e=>{if(!drag)return;panel.style.left=Math.max(0,drag[2]+e.clientX-drag[0])+"px";panel.style.top=Math.max(0,drag[3]+e.clientY-drag[1])+"px"};bar.onpointerup=()=>drag=null;bar.onpointercancel=()=>drag=null;
E("p",panel).className="score";canvas=E("canvas",panel);canvas.width=320;canvas.height=320;canvas.style.cssText="width:100%;max-width:320px;aspect-ratio:1;display:block;touch-action:none";ctx=canvas.getContext("2d");
const controls=E("div",panel);controls.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;max-width:240px;margin:8px auto";const button=(label,fn)=>{const b=E("button",controls,label);b.style.cssText="padding:10px;background:#394a5a;color:white;border:1px solid #8a9baa";b.onclick=fn;return b};
button(" ",()=>{});button("▲",()=>turn(0,-1));button(" ",()=>{});button("◀",()=>turn(-1,0));button("▼",()=>turn(0,1));button("▶",()=>turn(1,0));const play=E("button",panel,"Start / Restart");play.onclick=start;
const key=e=>{const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[e.key];if(d){e.preventDefault();turn(...d)}};window.addEventListener("keydown",key);panel._cleanup=()=>window.removeEventListener("keydown",key);snake=[210,209,208];spawn();draw()}
function deactivate(){clearInterval(timer);timer=null;running=false;panel?._cleanup?.();panel?.remove();panel=null;canvas=null;ctx=null}
const register=()=>window.TornUtilities?.register({id:ID,version:"0.1.0",activate,deactivate});if(!register())window.addEventListener("torn-utilities-ready",register,{once:true});
})();