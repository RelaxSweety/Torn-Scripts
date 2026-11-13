// Native route/timer only. No travel or item actions and no polling requests.
export function createLandingAlarm({document,window,getFlight,getSettings,audio,readSaved=()=>null,save=()=>{},now=()=>Date.now(),onEvent=()=>{}}){
 let timer=null,flight=null,raw='',arrival=null,notified=readSaved(),banner=null;
 function stopVisual(){banner?.remove();banner=null;}
 function snapshot(){const seconds=arrival===null?null:Math.max(0,Math.ceil((arrival-now())/1000));return {outbound:!!flight&&!flight.returning,arrival,remainingSeconds:seconds,enabled:!!getSettings().enabled,thresholdSeconds:Math.max(1,Number(getSettings().seconds)||60),sound:getSettings().sound||'chime',volumePercent:audio?.status?.().volume??null,audioState:audio?.status?.().contextState||'unknown',fired:!!(notified&&flight&&notified.route===flight.route&&Math.abs(notified.arrival-arrival)<10000)};}
 function tick(){
  const next=getFlight();
  if(!next||next.returning){flight=null;raw='';arrival=null;if(!getSettings().enabled){stopVisual();audio?.stop?.();}return snapshot();}
  if(next.route!==flight?.route){raw='';arrival=null;stopVisual();audio?.stop?.();}flight=next;
  // Re-anchor only when Torn actually changes the displayed timer, then count locally.
  if(next.timerText!==raw){raw=next.timerText;const match=raw.match(/^(\d{1,3}):([0-5]\d):([0-5]\d)$/);arrival=match?now()+(+match[1]*3600 + +match[2]*60 + +match[3])*1000:null;}
  if(getSettings().audio===false)audio?.stop?.();if(getSettings().visual===false)stopVisual();
  const state=snapshot();
  if(!state.enabled){stopVisual();audio?.stop?.();return state;}if(state.remainingSeconds===null||state.remainingSeconds===0){if(banner&&state.remainingSeconds===0)banner.querySelector('[data-landing-label]').textContent='Landing now';return state;}
  if(state.remainingSeconds<=state.thresholdSeconds&&!state.fired){notified={route:flight.route,arrival};save(notified);if(getSettings().audio!==false)audio?.play?.({sound:state.sound});onEvent('landing-alarm',{remainingSeconds:state.remainingSeconds,threshold:state.thresholdSeconds,sound:state.sound});
   if(getSettings().visual!==false){banner=document.createElement('div');banner.id='tu-landing-alert';banner.setAttribute('role','button');banner.tabIndex=0;banner.setAttribute('aria-label','Landing soon. Click to mute');banner.onclick=event=>{event.stopPropagation();mute();};banner.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();mute();}};banner.style.cssText='position:fixed;top:12px;left:12px;right:12px;z-index:2147483644;padding:16px;background:#ffd44d;color:#111;border:4px solid #fff;border-radius:8px;text-align:center;font:bold 18px system-ui;cursor:pointer;pointer-events:auto';const style=document.createElement('style');style.textContent='@keyframes tu-landing-flash{50%{opacity:.3}}#tu-landing-alert{animation:tu-landing-flash .6s steps(1,end) infinite}';banner.append(style);const label=document.createElement('span');label.textContent='Landing soon — '+String(Math.floor(state.remainingSeconds/60)).padStart(2,'0')+':'+String(state.remainingSeconds%60).padStart(2,'0');label.dataset.landingLabel='1';banner.append(label);const hint=document.createElement('small');hint.textContent='Click to Mute';hint.style.cssText='display:block;font-size:12px;margin-top:6px';banner.append(hint);document.body.append(banner);}
  }
  if(banner)banner.querySelector('[data-landing-label]').textContent='Landing soon — '+String(Math.floor(state.remainingSeconds/60)).padStart(2,'0')+':'+String(state.remainingSeconds%60).padStart(2,'0');return snapshot();
 }
 function mute(){audio?.stop?.();stopVisual();onEvent('landing-alarm-muted',{});}
 return {tick,snapshot,mute,start(){if(timer!==null)return;tick();timer=window.setInterval(tick,1000);},stop(){window.clearInterval(timer);timer=null;stopVisual();audio?.stop?.();},test(){audio?.unlock?.();audio?.play?.({sound:getSettings().sound||'chime'});}};
}
