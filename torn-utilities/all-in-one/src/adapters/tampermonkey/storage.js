export function tampermonkeyStorage() {
  if(typeof GM_getValue!=='function'||typeof GM_setValue!=='function'||typeof GM_deleteValue!=='function')throw new Error('Tampermonkey GM storage unavailable');
  return {get:key=>Promise.resolve(GM_getValue(key,null)),set:(key,value)=>Promise.resolve(GM_setValue(key,value)),remove:key=>Promise.resolve(GM_deleteValue(key))};
}
