// Bounded batches keep long/until-muted alarms from scheduling unbounded nodes.
export function createAlarmAudio({window,getVolume,getDuration,onActive=()=>{},now=()=>Date.now()}){
 let audio=null,batchTimer=null,stopTimer=null,nodes=[],active=false;
 const unlock=()=>{try{const C=window.AudioContext||window.webkitAudioContext;if(C){audio=audio||new C();audio.resume?.()?.catch?.(()=>{});}}catch{}};
 const stop=()=>{window.clearTimeout(batchTimer);window.clearTimeout(stopTimer);batchTimer=stopTimer=null;for(const node of nodes){try{node.stop();}catch{}}nodes=[];active=false;onActive(false);};
 const play=({sound='beep'}={})=>{stop();unlock();if(!audio)return;const cfg=getDuration(),seconds=Math.max(.5,Math.min(86400,Number(cfg.seconds)||3)),deadline=cfg.untilMuted?Infinity:now()+seconds*1000;active=true;onActive(true);
  function batch(){if(!active)return;nodes=[];try{const level=Math.max(0,Math.min(100,Number(getVolume()??60)))/100;for(let n=0;n<8&&now()+n*400<deadline;n++){const osc=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+n*.4;osc.type=sound==='siren'?'sawtooth':sound==='chime'?'sine':'square';if(osc.frequency.setValueAtTime)osc.frequency.setValueAtTime(sound==='chime'?1046:850,at);else osc.frequency.value=sound==='chime'?1046:850;if(sound==='siren')osc.frequency.linearRampToValueAtTime?.(1400,at+.22);gain.gain.setValueAtTime(level*.13,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.25);osc.connect(gain);gain.connect(audio.destination);osc.onended=()=>{osc.disconnect?.();gain.disconnect?.();};osc.start(at);osc.stop(at+.28);nodes.push(osc);}if(now()+3200<deadline)batchTimer=window.setTimeout(batch,3200);}catch{stop();}}
  batch();if(Number.isFinite(deadline))stopTimer=window.setTimeout(stop,seconds*1000);
 };
 return {unlock,stop,play,status:()=>({active,volume:Math.max(0,Math.min(100,Number(getVolume())||0)),supported:!!(window.AudioContext||window.webkitAudioContext),contextState:audio?.state||'not-created'})};
}
