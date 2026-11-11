// Observe native clock changes directly; never poll APIs or scan inventory.
export function createNativeClockSync({document,window,sync}){
 let observer=null;
 const selector='#travel-root [aria-label="Flight progress"],a[aria-label^="Hospital:"],[data-hospital-until]';
 const privateRoots='#tu-snatch-run,#tu-snatch-extra-hosp,#tuim-panel,#tuim-menu,#tu-pda-panel,#tu-landing-alert,#tu-purchase-confirmation';
 const element=node=>node?.nodeType===1?node:node?.parentElement;
 const relevant=node=>{const el=element(node);return !!el&&!el.closest(privateRoots)&&!!el.closest(selector);};
 const subtree=node=>{const el=element(node);return !!el&&!el.closest(privateRoots)&&(el.matches(selector)||!!el.querySelector(selector));};
 const update=()=>{if(!document.hidden)sync();};
 return {start(){if(observer)return;observer=new window.MutationObserver(records=>{if(records.some(record=>relevant(record.target)||record.type==='attributes'&&record.attributeName==='aria-label'&&/^Hospital:/.test(record.oldValue||'')&&!element(record.target)?.closest(privateRoots)||[...record.addedNodes,...record.removedNodes].some(subtree)))update();});observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['aria-label','title','data-original-title','data-hospital-until','data-until','data-time','datetime']});document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);update();},stop(){observer?.disconnect();observer=null;document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);}};
}
