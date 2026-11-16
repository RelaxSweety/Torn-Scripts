export function createWindowExpansion({window}){
 const d=window.document,key='tu:window-expanded:v1:',bounds=new WeakMap();
 const style=d.createElement('style');style.textContent='[data-tu-expanded="true"]{position:fixed!important;inset:0!important;left:0!important;top:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100dvh!important;max-width:100vw!important;max-height:100dvh!important;min-width:0!important;min-height:0!important;margin:0!important;transform:none!important;border-radius:0!important;box-sizing:border-box!important;resize:none!important} [data-tu-expand]{touch-action:manipulation;flex:0 0 auto;min-width:28px;min-height:28px}';d.head.append(style);
 function apply(el,on){
  if(on&&!bounds.has(el)){let original=el.getAttribute('style')||'';try{if(window.localStorage.getItem(key+el.id)==='true')original=window.localStorage.getItem(key+el.id+':restore')||original;window.localStorage.setItem(key+el.id+':restore',original);}catch{}bounds.set(el,original);}
  if(!on&&bounds.has(el)){el.setAttribute('style',bounds.get(el));bounds.delete(el);}
  el.dataset.tuExpanded=String(on);try{window.localStorage.setItem(key+el.id,String(on));}catch{}
  const b=el.querySelector('[data-tu-expand]');if(b){b.textContent=on?'▣':'□';b.setAttribute('aria-label',on?'Restore window size':'Expand window');b.title=b.getAttribute('aria-label');}
 }
 function enhance(el){
  if(!el?.id)return;const header=el.querySelector('header,.tu-header,.tuim-header,.tuim-travel-header,.tuac-header,.who-header')||el.firstElementChild;
  if(!header||header.querySelector('[data-tu-expand]'))return;
  const b=d.createElement('button');b.type='button';b.dataset.tuExpand='1';b.textContent='□';b.title='Expand window';b.setAttribute('aria-label','Expand window');
  b.addEventListener('click',e=>{e.stopPropagation();apply(el,el.dataset.tuExpanded!=='true');});header.append(b);
  if(!header.querySelector('[data-tu-fullscreen]')){const full=d.createElement('button');full.type='button';full.dataset.tuFullscreen='1';full.textContent='⛶';full.title='Device fullscreen (when supported)';full.setAttribute('aria-label',full.title);full.hidden=typeof d.documentElement.requestFullscreen!=='function';full.onclick=async e=>{e.stopPropagation();try{if(d.fullscreenElement)await d.exitFullscreen();else{apply(el,true);await d.documentElement.requestFullscreen();}}catch{full.title='Fullscreen unavailable in this browser or PDA webview. Use PDA fullscreen controls.';}};header.append(full);}
  try{apply(el,el.dataset.tuExpanded==='true'||window.localStorage.getItem(key+el.id)==='true');}catch{apply(el,false);}
 }
 return {enhance,apply};
}
