// Fallback storage for PDA environments. Browser storage is not encrypted.
export function pdaStorage() {
  if(typeof localStorage==='undefined')throw new Error('PDA storage unavailable');
  return {get:key=>Promise.resolve(localStorage.getItem(key)),set:(key,value)=>Promise.resolve(localStorage.setItem(key,value)),remove:key=>Promise.resolve(localStorage.removeItem(key))};
}
