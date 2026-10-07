// ==UserScript==
// @name         Torn PDA Arcade
// @namespace    https://www.torn.com/
// @version      0.10.6
// @description  Touch-first in-flight arcade game built for Torn PDA.
// @author       RelaxSweety [4539436]
// @match        https://www.torn.com/*
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/pda-flight-game/Torn-PDA-Flight-Game.meta.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/pda-flight-game/Torn-PDA-Flight-Game.user.js
// @grant        none
// ==/UserScript==

/*
 * TORN PDA ARCADE - RELEASE NOTES
 * v0.10.6 - Fixed multitouch joystick pointer ownership and reset on release or lost capture.
 * v0.10.5 - Removed continuous engine audio and corrected aircraft transitions on score awards.
 * v0.10.4 - Changed aircraft progression to 5,000-point stages with exit-right and reenter-left transformation animation.
 * v0.10.3 - Ensured engine audio stops immediately on pause, leave prompts, game over, minimize, and exit.
 * v0.10.2 - Reduced aircraft engine/movement sound volume while preserving effects volume.
 * v0.10.1 - Fixed literal escaped-newline parse errors introduced by the v0.10.0 aircraft/audio build.
 * v0.10.0 - Added 8-stage aircraft progression, faster maneuvering, and volume-controlled movement/explosion/healing audio.
 * v0.9.3 - Fixed two literal escape sequences that caused a fatal JavaScript parse error and prevented the Arcade launcher from loading.
 * v0.9.2 - Fixed fatal initialization syntax error that prevented the userscript and launcher from loading.
 * v0.9.1 - Fixed launcher initialization regression that could prevent the Arcade icon from appearing.
 * v0.9.0 - Added condition timers/end prompts plus save-and-resume for unfinished games.
 * v0.8.0 - Added per-game Show in Game List setting and persistent visibility preferences.
 * v0.7.0 - Added modular Arcade registry; Flight Arcade became a registered module.
 * v0.6.0 - Added selected-tab highlighting, escaped-enemy damage, and +10 health pickups.
 * v0.5.0 - Added crosshair Game Manager, Games/Settings tabs, and removed displayed flight status.
 * v0.4.0 - Added availability modes, strict flight detection, and draggable launcher persistence.
 * v0.3.0 - Added analog controls, chat sharing, donation link, and auto-update metadata.
 * v0.2.0 - Improved flight detection, mobile controls/layout, and update support.
 * v0.1.0 - Initial release.
 */

(() => {
    'use strict';

    if (window.__TORN_PDA_FLIGHT_GAME__) return;
    window.__TORN_PDA_FLIGHT_GAME__ = true;

    const GAME = {
        name: 'Torn PDA Flight Game',
        version: '0.10.6',
        creator: 'RelaxSweety',
        creatorId: '4539436',
        creatorUrl: 'https://www.torn.com/profiles.php?XID=4539436',
        discordUrl: 'https://discord.com/users/relaxsweety'
    };

    const STORE_KEY = 'tornPdaFlightGame';
    const LAUNCH_MODE_KEY = 'tpfgLaunchMode';
    const LAUNCH_POS_KEY = 'tpfgLaunchPosition';
    const SAVE_PREFIX = 'tpfgGameSave:';
    const launchMode = () => localStorage.getItem(LAUNCH_MODE_KEY) || 'flight';
    let saved = { highScore: 0, bestKills: 0, games: 0 };

    async function storageGet() {
        try {
            if (typeof PDA_storage !== 'undefined' && PDA_storage && typeof PDA_storage.get === 'function') {
                const v = await PDA_storage.get(STORE_KEY);
                if (v) return typeof v === 'string' ? JSON.parse(v) : v;
            }
        } catch (_) {}
        try {
            return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        } catch (_) { return null; }
    }

    async function storageSet(value) {
        try {
            if (typeof PDA_storage !== 'undefined' && PDA_storage && typeof PDA_storage.set === 'function') {
                await PDA_storage.set(STORE_KEY, JSON.stringify(value));
                return;
            }
        } catch (_) {}
        try { localStorage.setItem(STORE_KEY, JSON.stringify(value)); } catch (_) {}
    }

    function injectStyle() {
        if (document.getElementById('tpfg-style')) return;
        const s = document.createElement('style');
        s.id = 'tpfg-style';
        s.textContent = `
#tpfg-launcher{position:fixed;right:12px;bottom:88px;z-index:2147483000;width:42px;height:42px;border:1px solid #777;background:#171717;color:#eee;border-radius:50%;font-size:23px;font-weight:800;touch-action:none;box-shadow:0 2px 8px #0008}
#tpfg-manager,#tpfg-game-settings,#tpfg-prompt{position:fixed;inset:0;z-index:2147483800;background:#000b;display:none;align-items:center;justify-content:center;padding:16px}
.tpfg-settings-card{width:min(420px,100%);background:#151a20;border:1px solid #59616b;border-radius:12px;padding:16px;color:#fff;font-family:Arial,sans-serif}
.tpfg-settings-card label{display:block;padding:12px 4px;border-top:1px solid #343a40}.tpfg-manager-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.tpfg-manager-tabs button,.tpfg-game-card button{min-height:42px;border:1px solid #59616b;border-radius:8px;background:#252c34;color:#fff;font-weight:800}.tpfg-manager-tabs button.tpfg-selected{background:#596674;border-color:#aeb8c2;box-shadow:inset 0 0 0 1px #d7dde3}.tpfg-game-card{display:grid;gap:8px;padding:12px;border:1px solid #343a40;border-radius:9px}.tpfg-game-card span,.tpfg-empty{color:#9da6af;font-size:12px}.tpfg-setting-row{display:flex;justify-content:space-between;padding:8px 4px}.tpfg-settings-note{color:#9da6af;font-size:11px}
#tpfg-launch{position:fixed;right:10px;bottom:88px;z-index:2147483000;border:1px solid #777;background:#171717;color:#eee;border-radius:10px;padding:10px 13px;font:700 12px Arial,sans-serif;box-shadow:0 2px 8px #0008;touch-action:manipulation}
#tpfg-launch:active{transform:scale(.97)}
#tpfg-root{position:fixed;inset:0;z-index:2147483600;background:#090b0e;color:#fff;font-family:Arial,sans-serif;display:none;overscroll-behavior:none;touch-action:none}
#tpfg-root *{box-sizing:border-box}
#tpfg-shell{height:100%;display:flex;flex-direction:column;max-width:900px;margin:0 auto;background:#0d1117}
#tpfg-top{flex:0 0 auto;padding:8px 10px;background:#151a20;border-bottom:1px solid #343a40}
#tpfg-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:800}
#tpfg-condition{font-size:11px;color:#aeb6bf;margin-top:3px;font-weight:700}
.tpfg-topbtn{border:1px solid #555;background:#242a31;color:#fff;border-radius:7px;min-width:42px;min-height:34px;font-weight:800}
#tpfg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:7px}
.tpfg-stat{background:#090c10;border:1px solid #30363d;border-radius:6px;text-align:center;padding:4px 2px;font-size:10px;color:#9da7b1}
.tpfg-stat b{display:block;color:#fff;font-size:13px;margin-top:2px}
#tpfg-stagewrap{position:relative;flex:1 1 auto;min-height:220px;overflow:hidden;background:#05080d}
#tpfg-canvas{width:100%;height:100%;display:block}
#tpfg-message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;pointer-events:none;font-weight:800;text-shadow:0 2px 4px #000}
#tpfg-controls{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:9px 12px 12px;background:#11161c;border-top:1px solid #343a40;user-select:none;-webkit-user-select:none}
#tpfg-stick{position:relative;width:150px;height:150px;margin:auto;border:1px solid #58616b;border-radius:50%;background:#1b222a;touch-action:none}
#tpfg-stick-knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px;border:1px solid #8b949e;border-radius:50%;background:#39424c;pointer-events:none}
#tpfg-stick-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8b949e;font-size:10px;pointer-events:none}
#tpfg-chatpick{position:fixed;inset:0;z-index:2147483700;background:#000b;display:none;align-items:center;justify-content:center;padding:16px}#tpfg-chatcard{width:min(440px,100%);max-height:80vh;overflow:auto;background:#151a20;border:1px solid #59616b;border-radius:12px;padding:14px}#tpfg-chatlist button{width:100%;min-height:44px;margin:5px 0;background:#252c34;color:#fff;border:1px solid #59616b;border-radius:8px}.tpfg-donate{margin-top:16px;padding-top:12px;border-top:1px solid #3a424b;font-size:12px;line-height:1.6;color:#aeb6bf}.tpfg-donate a{color:#ffd75a;font-weight:800}
#tpfg-fire{border:1px solid #58616b;background:#252c34;color:#fff;font-weight:900;border-radius:12px;touch-action:none}
#tpfg-fire.on{background:#555f6b;transform:scale(.96)}

#tpfg-actions{display:flex;flex-direction:column;justify-content:center;gap:8px}
#tpfg-audio{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center;font:700 10px Arial,sans-serif;color:#aeb6bf}#tpfg-volume{width:100%;accent-color:#8b949e}#tpfg-mute{min-height:28px;border:1px solid #555;border-radius:7px;background:#242a31;color:#fff;font-weight:800}
#tpfg-fire{min-height:82px;font-size:20px}
#tpfg-pause,#tpfg-end{min-height:40px;border:1px solid #555;border-radius:9px;background:#242a31;color:#fff;font-weight:800}
#tpfg-results{position:absolute;inset:0;background:#0d1117;z-index:3;display:none;overflow:auto;padding:22px}
#tpfg-results-card{max-width:520px;margin:20px auto;background:#151a20;border:1px solid #3a424b;border-radius:14px;padding:18px;text-align:center}
#tpfg-results h2{margin:0 0 8px;font-size:20px}
#tpfg-results-route{color:#b8c0c8;margin-bottom:16px}
#tpfg-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tpfg-result{background:#0b0e12;border-radius:8px;padding:10px;color:#aab2ba;font-size:11px}
.tpfg-result b{display:block;color:#fff;font-size:20px;margin-top:3px}
#tpfg-sharetext{white-space:pre-wrap;background:#090c10;border:1px solid #30363d;border-radius:8px;text-align:left;padding:10px;margin-top:12px;font-size:12px;color:#d6dbe0}
.tpfg-resultbtn{width:100%;min-height:46px;margin-top:9px;border:1px solid #59616b;border-radius:9px;background:#252c34;color:#fff;font-weight:800}
#tpfg-by{margin-top:13px;font-size:10px;color:#7f8993}
#tpfg-by a{color:#b9c1c9}
@media(max-width:380px){#tpfg-stats{grid-template-columns:repeat(2,1fr)}#tpfg-controls{padding-left:6px;padding-right:6px;gap:4px}#tpfg-stick{width:132px;height:132px}}
`;
        document.head.appendChild(s);
    }

    function detectFlight() {
        // Torn's travel card is authoritative. Do not infer flight state from generic page words.
        const nodes=[...document.querySelectorAll('body *')];
        const re=/([A-Za-z][A-Za-z .'-]{1,35}?)\s+to\s+([A-Za-z][A-Za-z .'-]{1,35}?)\.\s*Remaining Flight Time\s*-\s*(\d{1,2}:\d{2}:\d{2})/i;
        for (const el of nodes) {
            if (el.children.length) continue;
            const t=(el.textContent||'').replace(/\s+/g,' ').trim();
            const m=t.match(re);
            if(m) return {flying:true,origin:m[1].trim(),destination:m[2].trim(),remaining:m[3]};
        }
        const text=(document.body?.innerText||'').replace(/\s+/g,' ');
        const m=text.match(re);
        return m ? {flying:true,origin:m[1].trim(),destination:m[2].trim(),remaining:m[3]} :
                   {flying:false,origin:'Unknown',destination:'Unknown',remaining:''};
    }

    // Arcade core: games register here; production remains a single bundled userscript.
    const Arcade = {
        games:new Map(),
        registerGame(game){if(!game?.id||typeof game.start!=='function')throw new Error('Invalid arcade game module');this.games.set(game.id,game);return game;},
        list(){return [...this.games.values()];},
        enabled(game){return localStorage.getItem('tpfgGameEnabled:'+game.id)!=='false';},
        setEnabled(game,value){localStorage.setItem('tpfgGameEnabled:'+game.id,value?'true':'false');},
        available(game){return this.enabled(game)&&(game.isAvailable?game.isAvailable():true);},
        start(id){const game=this.games.get(id);if(game&&this.available(game))launchGame(game);}
    };
    const FlightArcade = Arcade.registerGame({
        id:'flight-arcade',name:'Flight Arcade',version:'1.0.0',
        isAvailable(){const mode=launchMode();return mode==='always'||(mode==='flight'&&detectFlight().flying);},
        start(){startGame();},pause(){if(state.running&&!state.paused)togglePause();},resume(){if(state.running&&state.paused)togglePause();},stop(){if(state.running&&!state.over)requestLeave();}
    });
    function gameSaveKey(id){return SAVE_PREFIX+id;}
    function getGameSave(id){try{return JSON.parse(localStorage.getItem(gameSaveKey(id))||'null');}catch(_){return null;}}
    function clearGameSave(id){try{localStorage.removeItem(gameSaveKey(id));}catch(_){}}
    function snapshotGame(){
        const keys=['score','kills','hp','activeMs','spawnClock','shotClock','enemyShotClock','player','bullets','enemies','enemyBullets','particles','healthDrops'];
        const out={}; keys.forEach(k=>out[k]=state[k]); return JSON.parse(JSON.stringify(out));
    }
    function saveCurrentGame(){try{localStorage.setItem(gameSaveKey('flight-arcade'),JSON.stringify({version:1,savedAt:Date.now(),state:snapshotGame()}));return true;}catch(_){return false;}}
    function restoreGame(s){Object.assign(state,JSON.parse(JSON.stringify(s.state)));shownStage=aircraftStage();transition=null;state.running=true;state.paused=false;state.over=false;state.lastTs=performance.now();state.keys={up:false,down:false,left:false,right:false,fire:false};state.stick={x:0,y:0};showGame();setTimeout(resize,0);updateHud();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
    function promptBox(title,message,buttons){
        const p=document.getElementById('tpfg-prompt');p.querySelector('h3').textContent=title;p.querySelector('p').textContent=message;
        const a=p.querySelector('#tpfg-prompt-actions');a.innerHTML='';buttons.forEach(x=>{const b=document.createElement('button');b.className='tpfg-resultbtn';b.textContent=x.label;b.onclick=()=>{p.style.display='none';x.action();};a.appendChild(b);});p.style.display='flex';
    }
    function launchGame(game){const s=getGameSave(game.id);if(s)promptBox('SAVED GAME','Continue your saved '+game.name+' game?',[{label:'CONTINUE SAVED GAME',action:()=>restoreGame(s)},{label:'START NEW GAME',action:()=>{clearGameSave(game.id);game.start();}},{label:'CANCEL',action:()=>{}}]);else game.start();}
    function requestLeave(){if(!state.running||state.over){updateEngineSound(false);minimize();return;}state.paused=true;updateEngineSound(false);document.getElementById('tpfg-pause').textContent='RESUME';promptBox('SAVE YOUR GAME?','Save your current progress and continue from this point next time?',[{label:'SAVE & LEAVE',action:()=>{saveCurrentGame();closeActiveGame();}},{label:'LEAVE WITHOUT SAVING',action:()=>{clearGameSave('flight-arcade');closeActiveGame();}},{label:'CANCEL',action:()=>{state.paused=false;state.lastTs=performance.now();document.getElementById('tpfg-pause').textContent='PAUSE';}}]);}
    function closeActiveGame(){transition=null;state.running=false;state.paused=true;updateEngineSound(false);cancelAnimationFrame(raf);document.getElementById('tpfg-root').style.display='none';}
    function openManager(){document.getElementById('tpfg-manager').style.display='flex';renderManager('games');}
    function renderManager(tab){
        const body=document.getElementById('tpfg-manager-body');
        document.getElementById('tpfg-tab-games')?.classList.toggle('tpfg-selected',tab==='games');
        document.getElementById('tpfg-tab-settings')?.classList.toggle('tpfg-selected',tab==='settings');
        if(tab==='games'){
            const games=Arcade.list().filter(g=>Arcade.available(g));
            body.innerHTML=games.length?games.map(g=>'<div class="tpfg-game-card"><b>'+g.name+'</b><span>Available now</span><button data-game="'+g.id+'">PLAY</button></div>').join(''):'<p class="tpfg-empty">No games are available in your current Torn situation.</p>';
            body.querySelectorAll('button[data-game]').forEach(btn=>btn.onclick=()=>{document.getElementById('tpfg-manager').style.display='none';Arcade.start(btn.dataset.game);});
        } else {
            body.innerHTML=Arcade.list().map(g=>{const mode=launchMode();return '<div class="tpfg-game-card"><b>'+g.name+'</b><label><input type="checkbox" data-enable-game="'+g.id+'" '+(Arcade.enabled(g)?'checked':'')+'> Show in Game List</label><span>Availability</span><label><input type="radio" name="manager-mode-'+g.id+'" value="flight" '+(mode==='flight'?'checked':'')+'> Traveling</label><label><input type="radio" name="manager-mode-'+g.id+'" value="always" '+(mode==='always'?'checked':'')+'> Always</label><label><input type="radio" name="manager-mode-'+g.id+'" value="disabled" '+(mode==='disabled'?'checked':'')+'> Disabled</label></div>';}).join('');
            body.querySelectorAll('input[data-enable-game]').forEach(x=>x.onchange=()=>Arcade.setEnabled(Arcade.games.get(x.dataset.enableGame),x.checked));
            body.querySelectorAll('input[type="radio"]').forEach(r=>r.onchange=()=>localStorage.setItem(LAUNCH_MODE_KEY,r.value));
        }
    }

    function buildUI() {
        if (document.getElementById('tpfg-root')) return;
        const launcher=document.createElement('button');
        launcher.id='tpfg-launcher';
        launcher.type='button';
        launcher.textContent='⌖';
        launcher.title='Torn PDA Arcade';
        document.body.appendChild(launcher);
        const restorePos=()=>{try{const p=JSON.parse(localStorage.getItem(LAUNCH_POS_KEY)||'null');if(p){launcher.style.left=Math.max(0,Math.min(innerWidth-44,p.x))+'px';launcher.style.top=Math.max(0,Math.min(innerHeight-44,p.y))+'px';launcher.style.right='auto';launcher.style.bottom='auto';}}catch(_){}};
        restorePos();
        let drag=null,moved=false;
        launcher.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,l:launcher.offsetLeft,t:launcher.offsetTop};moved=false;launcher.setPointerCapture(e.pointerId);});
        launcher.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>7)moved=true;if(moved){launcher.style.left=Math.max(0,Math.min(innerWidth-launcher.offsetWidth,drag.l+dx))+'px';launcher.style.top=Math.max(0,Math.min(innerHeight-launcher.offsetHeight,drag.t+dy))+'px';launcher.style.right='auto';launcher.style.bottom='auto';}});
        launcher.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(moved)localStorage.setItem(LAUNCH_POS_KEY,JSON.stringify({x:launcher.offsetLeft,y:launcher.offsetTop}));else openManager();drag=null;});

        const root = document.createElement('div');
        root.id = 'tpfg-root';
        root.innerHTML = `
<div id="tpfg-shell">
  <div id="tpfg-top">
    <div id="tpfg-title"><span>TORN PDA FLIGHT GAME <small>v${GAME.version}</small></span><button class="tpfg-topbtn" id="tpfg-min" type="button">—</button></div>
    <div id="tpfg-condition">TORN STATUS: --</div>
        <div id="tpfg-stats">
      <div class="tpfg-stat">TIME<b id="tpfg-time">00:00</b></div>
      <div class="tpfg-stat">SCORE<b id="tpfg-score">0</b></div>
      <div class="tpfg-stat">HP<b id="tpfg-hp">100</b></div>
      <div class="tpfg-stat">HIGH<b id="tpfg-high">0</b></div>
    </div>
  </div>
  <div id="tpfg-stagewrap">
    <canvas id="tpfg-canvas"></canvas>
    <div id="tpfg-message"></div>
    <div id="tpfg-results">
      <div id="tpfg-results-card">
        <h2>TORN PDA FLIGHT GAME</h2>
                <div id="tpfg-result-grid">
          <div class="tpfg-result">SCORE<b id="tpfg-rscore">0</b></div>
          <div class="tpfg-result">KILLS<b id="tpfg-rkills">0</b></div>
          <div class="tpfg-result">GAME TIME<b id="tpfg-rtime">00:00</b></div>
          <div class="tpfg-result">HIGH SCORE<b id="tpfg-rhigh">0</b></div>
        </div>
        <div id="tpfg-sharetext"></div>
        <button class="tpfg-resultbtn" id="tpfg-share" type="button">SHARE RESULTS</button>
        <button class="tpfg-resultbtn" id="tpfg-restart" type="button">PLAY AGAIN</button>
        <button class="tpfg-resultbtn" id="tpfg-close" type="button">RETURN TO TORN</button>
        <div class="tpfg-donate"><b>Enjoying Torn PDA Flight Game?</b><br>Torn donations are appreciated.<br><a href="${GAME.creatorUrl}" target="_blank" rel="noopener noreferrer">RelaxSweety [4539436]</a></div><div id="tpfg-by">Created by <a href="${GAME.creatorUrl}">${GAME.creator} [${GAME.creatorId}]</a> · <a href="${GAME.discordUrl}">Discord</a></div>
      </div>
    </div>
  </div>
  <div id="tpfg-controls">
    <div id="tpfg-stick"><div id="tpfg-stick-label">SLIDE TO MOVE</div><div id="tpfg-stick-knob"></div></div>
    <div id="tpfg-actions">
      <button id="tpfg-fire" type="button">FIRE</button>
      <div id="tpfg-audio"><span>VOL</span><input id="tpfg-volume" type="range" min="0" max="100" value="55"><button id="tpfg-mute" type="button">ON</button></div>
      <button id="tpfg-pause" type="button">PAUSE</button>
      <button id="tpfg-end" type="button">END GAME</button>
    </div>
  </div>
</div>`;
        const manager=document.createElement('div');manager.id='tpfg-manager';manager.style.display='none';manager.innerHTML='<div class="tpfg-settings-card"><h3>TORN PDA ARCADE</h3><div class="tpfg-manager-tabs"><button id="tpfg-tab-games">GAMES</button><button id="tpfg-tab-settings">SETTINGS</button></div><div id="tpfg-manager-body"></div><button class="tpfg-resultbtn" id="tpfg-manager-close">CLOSE</button></div>';document.body.appendChild(manager);
        const prompt=document.createElement('div');prompt.id='tpfg-prompt';prompt.style.display='none';prompt.innerHTML='<div class="tpfg-settings-card"><h3></h3><p></p><div id="tpfg-prompt-actions"></div></div>';document.body.appendChild(prompt);
        const gameSettings=document.createElement('div');gameSettings.id='tpfg-game-settings';gameSettings.style.display='none';gameSettings.innerHTML='<div class="tpfg-settings-card"><h3>GAME SETTINGS</h3><div class="tpfg-setting-row"><b>Flight Arcade</b><span>Enabled</span></div><label><input type="radio" name="tpfg-mode" value="flight"> Flight only</label><label><input type="radio" name="tpfg-mode" value="always"> Always available</label><label><input type="radio" name="tpfg-mode" value="disabled"> Disabled</label><p class="tpfg-settings-note">Additional Torn games can be added here as modules.</p><button class="tpfg-resultbtn" id="tpfg-settings-close">CLOSE</button></div>';document.body.appendChild(gameSettings);
        gameSettings.querySelectorAll('input[name="tpfg-mode"]').forEach(r=>{r.checked=(launchMode()===r.value);r.addEventListener('change',()=>localStorage.setItem(LAUNCH_MODE_KEY,r.value));});
        document.getElementById('tpfg-settings-close').onclick=()=>gameSettings.style.display='none';
        document.getElementById('tpfg-manager-close').onclick=()=>manager.style.display='none';
        document.getElementById('tpfg-tab-games').onclick=()=>renderManager('games');
        document.getElementById('tpfg-tab-settings').onclick=()=>renderManager('settings');
        const picker=document.createElement('div');picker.id='tpfg-chatpick';picker.innerHTML='<div id="tpfg-chatcard"><b>Share Arcade Results</b><p>Select an open Torn chat. Results are inserted but not sent.</p><div id="tpfg-chatlist"></div><button class="tpfg-resultbtn" id="tpfg-copy">COPY RESULTS</button><button class="tpfg-resultbtn" id="tpfg-chatcancel">CANCEL</button></div>';document.body.appendChild(picker);
        document.body.appendChild(root);
        wireUI();
    }

    const state = {
        running:false, paused:false, over:false, score:0, kills:0, hp:100,
        activeMs:0, lastTs:0, spawnClock:0, shotClock:0, enemyShotClock:0,
        keys:{up:false,down:false,left:false,right:false,fire:false},
        stick:{x:0,y:0}, shareText:'',
        player:null, bullets:[], enemies:[], enemyBullets:[], particles:[]
    };

    let canvas, ctx, raf = 0, W = 0, H = 0;

    const AIRCRAFT_COUNT=8;
    const AUDIO_KEY='tpfgAudio';
    let audioCtx=null,engineOsc=null,engineGain=null;
    let audioPrefs=(()=>{try{return {...{volume:.55,muted:false},...JSON.parse(localStorage.getItem(AUDIO_KEY)||'{}')}}catch(_){return {volume:.55,muted:false}}})();
    function saveAudio(){try{localStorage.setItem(AUDIO_KEY,JSON.stringify(audioPrefs));}catch(_){}}
    function ensureAudio(){if(audioCtx)return audioCtx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;audioCtx=new AC();return audioCtx;}
    function tone(freq,dur,type='sine',gain=.12,endFreq=null){if(audioPrefs.muted||audioPrefs.volume<=0)return;const a=ensureAudio();if(!a)return;if(a.state==='suspended')a.resume();const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+dur);g.gain.setValueAtTime(Math.max(.0001,gain*audioPrefs.volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur);}
    function explosionSound(){tone(110,.28,'sawtooth',.18,38);tone(62,.34,'square',.08,28);}
    function healSound(){tone(520,.12,'sine',.10,760);setTimeout(()=>tone(760,.16,'sine',.08,1040),70);}
    function updateEngineSound(){if(engineOsc){try{engineOsc.stop();engineOsc.disconnect();}catch(_){}engineOsc=null;}if(engineGain){try{engineGain.disconnect();}catch(_){}engineGain=null;}}

    function resize() {
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(300, r.width); H = Math.max(200, r.height);
        canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
        ctx.setTransform(dpr,0,0,dpr,0,0);
        if (state.player) {
            state.player.x = Math.min(state.player.x, W-40);
            state.player.y = Math.min(state.player.y, H-30);
        }
    }

    function wireUI() {
        canvas = document.getElementById('tpfg-canvas');
        ctx = canvas.getContext('2d');
                document.getElementById('tpfg-min').addEventListener('click', requestLeave);
        document.getElementById('tpfg-pause').addEventListener('click', togglePause);
        document.getElementById('tpfg-end').addEventListener('click', requestLeave);
        document.getElementById('tpfg-restart').addEventListener('click', startGame);
        document.getElementById('tpfg-close').addEventListener('click', minimize);
        document.getElementById('tpfg-share').addEventListener('click', showChatPicker);
        document.getElementById('tpfg-chatcancel').addEventListener('click',()=>document.getElementById('tpfg-chatpick').style.display='none');
        document.getElementById('tpfg-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.shareText);}catch(_){window.prompt('Copy results:',state.shareText);}});

        bindStick(document.getElementById('tpfg-stick'));
        bindHold(document.getElementById('tpfg-fire'), 'fire');
        const vol=document.getElementById('tpfg-volume'),mute=document.getElementById('tpfg-mute');vol.value=Math.round(audioPrefs.volume*100);mute.textContent=audioPrefs.muted?'OFF':'ON';vol.addEventListener('input',()=>{audioPrefs.volume=Number(vol.value)/100;saveAudio();});mute.addEventListener('click',()=>{audioPrefs.muted=!audioPrefs.muted;mute.textContent=audioPrefs.muted?'OFF':'ON';saveAudio();if(audioPrefs.muted)updateEngineSound(false);else ensureAudio();});

        window.addEventListener('resize', resize);
        window.addEventListener('keydown', e => {
            if (!state.running) return;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault();
            keyFromEvent(e, true);
        }, {passive:false});
        window.addEventListener('keyup', e => keyFromEvent(e, false));
    }

    function bindStick(stick) {
        const knob=document.getElementById('tpfg-stick-knob');
        let pid=null;
        const reset=()=>{
            pid=null;
            state.stick={x:0,y:0};
            knob.style.transform='translate(0,0)';
        };
        const move=e=>{
            if(pid!==e.pointerId)return;
            if(!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;
            e.preventDefault();
            const r=stick.getBoundingClientRect(),max=r.width*.32;
            if(max<=0)return;
            let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
            const d=Math.hypot(x,y);
            if(d>max){x=x/d*max;y=y/d*max;}
            state.stick={x:x/max,y:y/max};
            knob.style.transform='translate('+x+'px,'+y+'px)';
        };
        stick.addEventListener('pointerdown',e=>{
            if(pid!==null)return; // Ignore other fingers, including the fire-button finger.
            if(e.pointerType==='mouse'&&e.button!==0)return;
            pid=e.pointerId;
            try{stick.setPointerCapture(pid);}catch(_){}
            move(e);
        });
        stick.addEventListener('pointermove',move);
        const end=e=>{
            if(pid!==e.pointerId)return;
            reset();
            if(stick.hasPointerCapture(e.pointerId)){
                try{stick.releasePointerCapture(e.pointerId);}catch(_){}
            }
        };
        stick.addEventListener('pointerup',end);
        stick.addEventListener('pointercancel',end);
        stick.addEventListener('lostpointercapture',end);
        window.addEventListener('blur',reset);
    }

    function chatInputs(){return [...new Set([...document.querySelectorAll('textarea,[contenteditable="true"][role="textbox"],[contenteditable="true"][data-placeholder*="message" i],[contenteditable="true"][aria-label*="message" i]')])].filter(el=>!el.closest('#tpfg-root')&&!el.closest('#tpfg-chatpick')&&el.getBoundingClientRect().width>0);}
    function chatName(input,i){let el=input;for(let n=0;n<8&&el;n++,el=el.parentElement){const r=el.getBoundingClientRect();if(r.width>=200&&r.height>=120){const top=r.top+70;const candidates=[...el.querySelectorAll('[title],[aria-label],strong,b,h1,h2,h3,span')].filter(x=>{const q=x.getBoundingClientRect();return q.height>0&&q.top>=r.top-5&&q.top<top;}).map(x=>(x.getAttribute('title')||x.getAttribute('aria-label')||x.textContent||'').trim()).filter(x=>x.length>=2&&x.length<=40&&!/close|minimize|send|message|emoji|settings/i.test(x));if(candidates.length)return candidates[0];}}return 'Open Chat '+(i+1);}
    function insertChat(input,text){input.focus();if('value'in input){const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),'value');if(d&&d.set)d.set.call(input,text);else input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));return true;}input.textContent=text;input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));return true;}
    function showChatPicker(){const picker=document.getElementById('tpfg-chatpick'),list=document.getElementById('tpfg-chatlist');list.innerHTML='';const chats=chatInputs();if(!chats.length)list.innerHTML='<p>No open Torn chats detected. Open a chat and try again.</p>';chats.forEach((input,i)=>{const b=document.createElement('button');b.textContent=chatName(input,i);b.onclick=()=>{if(insertChat(input,state.shareText))picker.style.display='none';};list.appendChild(b);});picker.style.display='flex';}

    function bindHold(btn, key) {
        const on = e => { e.preventDefault(); state.keys[key]=true; btn.classList.add('on'); };
        const off = e => { if (e) e.preventDefault(); state.keys[key]=false; btn.classList.remove('on'); };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('pointerleave', off);
    }

    function keyFromEvent(e, down) {
        const k = e.key.toLowerCase();
        if (k==='arrowup'||k==='w') state.keys.up=down;
        if (k==='arrowdown'||k==='s') state.keys.down=down;
        if (k==='arrowleft'||k==='a') state.keys.left=down;
        if (k==='arrowright'||k==='d') state.keys.right=down;
        if (k===' ') state.keys.fire=down;
        if (down && (k==='p'||k==='escape')) togglePause();
    }

    function showGame(){document.getElementById('tpfg-root').style.display='block';document.getElementById('tpfg-results').style.display='none';document.getElementById('tpfg-message').textContent='';document.getElementById('tpfg-pause').textContent='PAUSE';document.getElementById('tpfg-high').textContent=Number(saved.highScore||0).toLocaleString();}
    async function startGame() {
        cancelAnimationFrame(raf);
        const flight = detectFlight();
        state.running=true; state.paused=false; state.over=false; conditionWasActive=detectCondition(); conditionPrompted=false;
        state.score=0; state.kills=0; state.hp=100; state.activeMs=0;
        state.lastTs=performance.now(); state.spawnClock=0; state.shotClock=0; state.enemyShotClock=0;
        state.keys={up:false,down:false,left:false,right:false,fire:false};
        state.stick={x:0,y:0};
        state.player={x:45,y:150,w:44,h:24,speed:270};shownStage=0;transition=null;
        state.bullets=[]; state.enemies=[]; state.enemyBullets=[]; state.particles=[]; state.healthDrops=[];
        showGame();
        setTimeout(resize, 0);
        updateHud();
        raf=requestAnimationFrame(loop);
    }

    function minimize(){if(state.running&&!state.over){requestLeave();return;}updateEngineSound(false);document.getElementById('tpfg-root').style.display='none';}

    function togglePause() {
        if (!state.running || state.over) return;
        state.paused=!state.paused;
        updateEngineSound(false);
        state.lastTs=performance.now();
        document.getElementById('tpfg-pause').textContent=state.paused?'RESUME':'PAUSE';
        document.getElementById('tpfg-message').textContent=state.paused?'PAUSED':'';
    }

    let conditionWasActive=null,conditionPrompted=false,lastConditionCheck=0;
    function detectCondition(){
        const f=detectFlight();if(f.flying)return {type:'flight',active:true,remaining:f.remaining,label:'FLIGHT'};
        const text=(document.body?.innerText||'').replace(/\s+/g,' ');
        let m=text.match(/(?:Hospital|Hospitalized).*?(\d{1,2}:\d{2}:\d{2})/i);if(m)return {type:'hospital',active:true,remaining:m[1],label:'HOSPITAL'};
        m=text.match(/(?:Jail|Jailed).*?(\d{1,2}:\d{2}:\d{2})/i);if(m)return {type:'jail',active:true,remaining:m[1],label:'JAIL'};
        return {type:null,active:false,remaining:'',label:'TORN'};
    }
    function monitorCondition(ts){
        if(ts-lastConditionCheck<500)return;lastConditionCheck=ts;const q=detectCondition();const el=document.getElementById('tpfg-condition');if(el)el.textContent=q.active?q.label+' REMAINING: '+q.remaining:'TORN STATUS: FREE';
        if(conditionWasActive&&conditionWasActive.active&&!q.active&&!conditionPrompted){conditionPrompted=true;state.paused=true;const type=conditionWasActive.type;const msg=type==='flight'?'Your flight has ended.':type==='jail'?'You have been released from jail.':'You have been released from the hospital.';promptBox(type==='flight'?'FLIGHT ENDED':type==='jail'?'RELEASED FROM JAIL':'RELEASED FROM HOSPITAL',msg+' Would you like to continue playing or leave the game?',[{label:'CONTINUE',action:()=>{state.paused=false;state.lastTs=performance.now();}},{label:'LEAVE GAME',action:requestLeave}]);}
        if(q.active)conditionWasActive=q;
    }
    function loop(ts) {
        if (!state.running) return;
        monitorCondition(ts);
        let dt=Math.min((ts-state.lastTs)/1000, .05);
        state.lastTs=ts;
        if (!state.paused && !state.over) {
            if(transition){advanceAircraftTransition(dt);draw();updateHud();raf=requestAnimationFrame(loop);return;}
            state.activeMs += dt*1000;
            update(dt);
            draw();
            updateHud();
        } else draw();
        raf=requestAnimationFrame(loop);
    }

    function update(dt) {
        const p=state.player;
        let dx=(state.keys.right?1:0)-(state.keys.left?1:0);
        let dy=(state.keys.down?1:0)-(state.keys.up?1:0);
        if(Math.abs(state.stick.x)>.04||Math.abs(state.stick.y)>.04){dx=state.stick.x;dy=state.stick.y;}
        const mag=Math.max(1,Math.hypot(dx,dy));
        p.x=Math.max(4,Math.min(W-p.w-4,p.x+dx/mag*p.speed*dt));
        p.y=Math.max(4,Math.min(H-p.h-4,p.y+dy/mag*p.speed*dt));
        // Continuous engine audio removed.

        state.shotClock-=dt;
        if (state.keys.fire && state.shotClock<=0) {
            state.bullets.push({x:p.x+p.w,y:p.y+p.h*.5,vx:510,r:3});
            state.shotClock=.14;
        }

        const seconds=state.activeMs/1000;
        const difficulty=1+Math.min(seconds/150,1.5);
        state.spawnClock-=dt;
        if (state.spawnClock<=0) {
            spawnEnemy(difficulty);
            state.spawnClock=Math.max(.35,1.15/difficulty)*(0.75+Math.random()*.55);
        }

        state.enemyShotClock-=dt;
        if (state.enemyShotClock<=0 && state.enemies.length) {
            const shooters=state.enemies.filter(e=>e.x<W-25);
            if (shooters.length) {
                const e=shooters[(Math.random()*shooters.length)|0];
                const px=p.x+p.w/2, py=p.y+p.h/2;
                const ex=e.x, ey=e.y+e.h/2;
                const a=Math.atan2(py-ey,px-ex);
                const sp=145+45*difficulty;
                state.enemyBullets.push({x:ex,y:ey,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:4});
            }
            state.enemyShotClock=Math.max(.5,1.35/difficulty);
        }

        state.bullets.forEach(b=>b.x+=b.vx*dt);
        state.enemyBullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;});
        state.enemies.forEach(e=>e.x-=e.speed*dt);
        state.healthDrops.forEach(h=>h.x-=h.speed*dt);
        state.particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;});

        for (let bi=state.bullets.length-1;bi>=0;bi--) {
            const b=state.bullets[bi];
            if (b.x>W+20) {state.bullets.splice(bi,1);continue;}
            for (let ei=state.enemies.length-1;ei>=0;ei--) {
                const e=state.enemies[ei];
                if (circleRect(b,e)) {
                    state.bullets.splice(bi,1); e.hp--;
                    if (e.hp<=0) {
                        explode(e.x+e.w/2,e.y+e.h/2); explosionSound();
                        state.score+=e.tough?300:120; state.kills++;
                        if(!transition&&aircraftStage()!==shownStage)startAircraftTransition(aircraftStage());
                        state.healthDrops.push({x:e.x+e.w/2-8,y:e.y+e.h/2-8,w:18,h:18,speed:55});
                        state.enemies.splice(ei,1);
                    }
                    break;
                }
            }
        }

        for (let i=state.enemyBullets.length-1;i>=0;i--) {
            const b=state.enemyBullets[i];
            if (b.x<-20||b.y<-20||b.y>H+20) {state.enemyBullets.splice(i,1);continue;}
            if (circleRect(b,p)) {
                state.enemyBullets.splice(i,1);
                damage(10);
            }
        }

        for (let i=state.enemies.length-1;i>=0;i--) {
            const e=state.enemies[i];
            if (e.x+e.w<0) {explode(8,e.y+e.h/2,18); explosionSound();state.enemies.splice(i,1);damage(e.tough?30:20);continue;}
            if (rectHit(e,p)) {
                state.enemies.splice(i,1);
                explode(e.x+e.w/2,e.y+e.h/2);
                damage(e.tough?30:20);
            }
        }

        for(let i=state.healthDrops.length-1;i>=0;i--){const h=state.healthDrops[i];if(h.x+h.w<0){state.healthDrops.splice(i,1);continue;}if(rectHit(h,p)){state.hp=Math.min(100,state.hp+10);state.healthDrops.splice(i,1);explode(p.x+p.w/2,p.y+p.h/2,8);healSound();}}
        state.particles=state.particles.filter(q=>q.life>0);
        state.score += 8*dt;
        if(!transition&&aircraftStage()!==shownStage)startAircraftTransition(aircraftStage());
        if (state.hp<=0) finishGame(false);
    }

    function spawnEnemy(difficulty) {
        const tough=Math.random()<Math.min(.12+(difficulty-1)*.1,.32);
        const h=tough?34:25, w=tough?52:40;
        state.enemies.push({
            x:W+10,y:10+Math.random()*Math.max(10,H-h-20),w,h,
            hp:tough?3:1,tough,speed:(95+Math.random()*65)*difficulty
        });
    }

    function damage(n) {
        state.hp=Math.max(0,state.hp-n);
        explode(state.player.x+20,state.player.y+12,7);
    }

    function explode(x,y,n=14) {
        for(let i=0;i<n;i++) {
            const a=Math.random()*Math.PI*2, s=35+Math.random()*120;
            state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.45});
        }
    }

    function circleRect(c,r) {
        const x=Math.max(r.x,Math.min(c.x,r.x+r.w)), y=Math.max(r.y,Math.min(c.y,r.y+r.h));
        return (c.x-x)**2+(c.y-y)**2<c.r**2;
    }
    function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

    function aircraftStage(){return Math.floor(Math.max(0,state.score)/5000)%AIRCRAFT_COUNT;}
    // Transition phases: old aircraft exits right, new aircraft enters from left.
    const TRANSITION_SECONDS=1.4;
    let transition=null,shownStage=0;
    function startAircraftTransition(nextStage){
        if(!state.player)return;
        transition={elapsed:0,from:shownStage,to:nextStage,x:state.player.x,y:state.player.y};
        updateEngineSound(false);
    }
    function advanceAircraftTransition(dt){
        if(!transition)return;
        transition.elapsed=Math.min(TRANSITION_SECONDS,transition.elapsed+dt);
        if(transition.elapsed>=TRANSITION_SECONDS){shownStage=transition.to;transition=null;}
    }
    function drawAircraft(x,y,w,h,design,enemy=false,tough=false){
        ctx.save();ctx.translate(x,y);if(enemy){ctx.translate(w,0);ctx.scale(-1,1);}
        const body=enemy?(tough?'#7d858d':'#626b74'):'#d8dde2',accent=enemy?'#c4544c':'#6fa8d8',dark=enemy?'#343b42':'#697580';
        ctx.fillStyle=body;ctx.strokeStyle=dark;ctx.lineWidth=1;
        const cy=h/2;
        if(design===0){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.58,h*.30);ctx.lineTo(w*.38,0);ctx.lineTo(w*.30,h*.34);ctx.lineTo(0,h*.18);ctx.lineTo(w*.14,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.30,h*.66);ctx.lineTo(w*.38,h);ctx.lineTo(w*.58,h*.70);ctx.closePath();}
        else if(design===1){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.48,.08*h);ctx.lineTo(w*.18,0);ctx.lineTo(w*.28,h*.38);ctx.lineTo(0,h*.18);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.28,h*.62);ctx.lineTo(w*.18,h);ctx.lineTo(w*.48,.92*h);ctx.closePath();}
        else if(design===2){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.55,.22*h);ctx.lineTo(w*.30,0);ctx.lineTo(w*.22,h*.32);ctx.lineTo(0,h*.12);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.88);ctx.lineTo(w*.22,h*.68);ctx.lineTo(w*.30,h);ctx.lineTo(w*.55,.78*h);ctx.closePath();}
        else if(design===3){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.60,h*.36);ctx.lineTo(w*.48,0);ctx.lineTo(w*.35,h*.36);ctx.lineTo(0,h*.28);ctx.lineTo(0,h*.72);ctx.lineTo(w*.35,h*.64);ctx.lineTo(w*.48,h);ctx.lineTo(w*.60,h*.64);ctx.closePath();}
        else if(design===4){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.55,h*.38);ctx.lineTo(w*.42,0);ctx.lineTo(w*.32,h*.38);ctx.lineTo(0,h*.24);ctx.lineTo(w*.10,cy);ctx.lineTo(0,h*.76);ctx.lineTo(w*.32,h*.62);ctx.lineTo(w*.42,h);ctx.lineTo(w*.55,h*.62);ctx.closePath();}
        else if(design===5){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.62,h*.26);ctx.lineTo(w*.42,.08*h);ctx.lineTo(w*.32,h*.34);ctx.lineTo(0,0);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h);ctx.lineTo(w*.32,h*.66);ctx.lineTo(w*.42,.92*h);ctx.lineTo(w*.62,.74*h);ctx.closePath();}
        else if(design===6){ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.58,h*.20);ctx.lineTo(w*.28,0);ctx.lineTo(w*.24,h*.36);ctx.lineTo(0,h*.18);ctx.lineTo(w*.10,cy);ctx.lineTo(0,h*.82);ctx.lineTo(w*.24,h*.64);ctx.lineTo(w*.28,h);ctx.lineTo(w*.58,h*.80);ctx.closePath();}
        else {ctx.beginPath();ctx.moveTo(w,cy);ctx.lineTo(w*.52,h*.30);ctx.lineTo(w*.34,h*.08);ctx.lineTo(w*.28,h*.38);ctx.lineTo(0,h*.24);ctx.lineTo(w*.12,cy);ctx.lineTo(0,h*.76);ctx.lineTo(w*.28,h*.62);ctx.lineTo(w*.34,h*.92);ctx.lineTo(w*.52,h*.70);ctx.closePath();}
        ctx.fill();ctx.stroke();
        ctx.fillStyle=accent;ctx.beginPath();ctx.ellipse(w*.62,cy,w*.13,Math.max(2,h*.12),0,0,Math.PI*2);ctx.fill();
        if(design===2||design===3||design===6){ctx.fillStyle=dark;ctx.fillRect(w*.08,h*.18,w*.10,h*.18);ctx.fillRect(w*.08,h*.64,w*.10,h*.18);}
        if(design===4){ctx.strokeStyle='#d7d7d7';ctx.beginPath();ctx.moveTo(w*.70,cy-h*.32);ctx.lineTo(w*.70,cy+h*.32);ctx.stroke();}
        ctx.restore();
    }
    function draw() {
        if (!ctx) return;
        ctx.clearRect(0,0,W,H);
        const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#071525');g.addColorStop(1,'#101820');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
        ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;for(let i=0;i<18;i++){const y=(i*47+(state.activeMs*.025))%H,x=(i*83)%W;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+16,y);ctx.stroke();}
        const stage=shownStage,enemyDesign=(stage+1)%AIRCRAFT_COUNT,p=state.player;
        if(p){
            if(transition){
                const t=transition.elapsed/TRANSITION_SECONDS;
                const x=t<.5?transition.x+(W+80-transition.x)*(t/.5):(-p.w-12)+(transition.x+p.w+12)*((t-.5)/.5);
                drawAircraft(x,transition.y,p.w,p.h,t<.5?transition.from:transition.to,false,false);
            }else drawAircraft(p.x,p.y,p.w,p.h,stage,false,false);
        }
        state.bullets.forEach(b=>{ctx.fillStyle='#f5e8a8';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();});
        state.enemyBullets.forEach(b=>{ctx.fillStyle='#e46a5e';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();});
        state.healthDrops.forEach(h=>{ctx.save();ctx.translate(h.x,h.y);ctx.fillStyle='#49c86b';ctx.fillRect(0,0,h.w,h.h);ctx.fillStyle='#fff';ctx.fillRect(7,3,4,12);ctx.fillRect(3,7,12,4);ctx.restore();});
        state.enemies.forEach(e=>drawAircraft(e.x,e.y,e.w,e.h,enemyDesign,true,e.tough));
        state.particles.forEach(q=>{ctx.globalAlpha=Math.max(0,q.life/.7);ctx.fillStyle='#e3a34c';ctx.fillRect(q.x,q.y,3,3);ctx.globalAlpha=1;});
    }

    function updateHud() {
        document.getElementById('tpfg-time').textContent=formatTime(state.activeMs);
        document.getElementById('tpfg-score').textContent=Math.floor(state.score).toLocaleString();
        document.getElementById('tpfg-hp').textContent=Math.max(0,Math.ceil(state.hp));
    }

    function formatTime(ms) {
        const s=Math.floor(ms/1000);
        return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    }

    async function finishGame(manual) {
        if (!state.running || state.over) return;
        state.over=true; state.paused=true; transition=null; updateEngineSound(false);
        clearGameSave('flight-arcade');
        const score=Math.floor(state.score);
        saved.highScore=Math.max(Number(saved.highScore||0),score);
        saved.bestKills=Math.max(Number(saved.bestKills||0),state.kills);
        saved.games=Number(saved.games||0)+1;
        await storageSet(saved);

        const now=new Date();
        const stamp=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})+' - '+now.toLocaleDateString();
        const share=`Achieved a Torn PDA Arcade Flight Arcade score of ${score.toLocaleString()}.`;
        document.getElementById('tpfg-rscore').textContent=score.toLocaleString();
        document.getElementById('tpfg-rkills').textContent=state.kills.toLocaleString();
        document.getElementById('tpfg-rtime').textContent=formatTime(state.activeMs);
        document.getElementById('tpfg-rhigh').textContent=Number(saved.highScore).toLocaleString();
        document.getElementById('tpfg-high').textContent=Number(saved.highScore).toLocaleString();
        state.shareText=`${stamp} ${share.replace(/\n/g,' ') } Game Time: ${formatTime(state.activeMs)} | Kills: ${state.kills} | High Score: ${Number(saved.highScore).toLocaleString()}`;
        document.getElementById('tpfg-sharetext').textContent=state.shareText;
        document.getElementById('tpfg-results').style.display='block';
        document.getElementById('tpfg-message').textContent=manual?'GAME ENDED':'';
    }

    async function init() {
        injectStyle();
        const existing=await storageGet();
        if (existing && typeof existing==='object') saved={...saved,...existing};
        buildUI();
    }

    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
})();
