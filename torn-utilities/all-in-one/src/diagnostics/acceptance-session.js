// Shared by the independent TU Test userscript and its automated regression tests.
export function createAcceptanceSession({targetBuild,checklistVersion,tests,platform,initial={},clock=()=>new Date().toISOString()}) {
 const allowed=new Set(['pass','fail','skip','blocked','not-tested']);
 const scrub=value=>String(value??'').replace(/\b(?:Bearer|ApiKey)\s+[^\s,;]+/gi,'[REDACTED]')
  .replace(/\b(?:api[_ -]?key|token|secret|authorization)\s*[:=]\s*["']?[^\s,"';]+/gi,'[REDACTED]')
  .replace(/\b[A-Za-z0-9]{16}\b/g,'[REDACTED]').replace(/\b[A-Za-z0-9_-]{24,}(?:\.[A-Za-z0-9_-]+)*\b/g,'[REDACTED]')
  .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi,'[REDACTED]').slice(0,2000);
 const same=initial.targetBuild===targetBuild&&initial.checklistVersion===checklistVersion&&initial.platform===platform;
 const results={};
 if(same)for(const t of tests){const old=initial.results?.[t.id];if(old&&allowed.has(old.status)&&old.kind===t.kind)results[t.id]={status:old.status,kind:t.kind,note:scrub(old.note),at:scrub(old.at)};}
 const meta={device:scrub(same?initial.meta?.device:''),hostVersion:scrub(same?initial.meta?.hostVersion:''),feedback:scrub(same?initial.meta?.feedback:'')};
 return Object.freeze({
  scrub,
  setMeta(values){for(const k of Object.keys(meta))if(k in values)meta[k]=scrub(values[k]);},
  record(id,status,note='',kind='manual'){
   const t=tests.find(t=>t.id===id);if(!t)throw Error('Unknown acceptance check');
   if(!allowed.has(status))throw Error('Invalid result');
   if(t.kind!==kind)throw Error('Check must be recorded by its declared method');
   const clean=scrub(note).trim();if(status!=='not-tested'&&!clean)throw Error('Record observed evidence or a reason before choosing a result');
   results[id]={status,kind,note:clean,at:clock()};
  },
  snapshot(){
   return {schemaVersion:2,targetBuild,checklistVersion,platform,meta:{...meta},results:JSON.parse(JSON.stringify(results))};
  },
  report(){
   const items=tests.map(t=>({id:t.id,label:t.label,section:t.section,critical:t.critical,kind:t.kind,instructions:t.instructions,...(results[t.id]||{status:'not-tested',note:'',at:null})}));
   const counts={pass:0,fail:0,skip:0,blocked:0,'not-tested':0};for(const t of items)counts[t.status]++;
   const platformReady=['pda','tampermonkey'].includes(platform)&&!!meta.device.trim()&&!!meta.hostVersion.trim()&&items.every(t=>!t.critical||(t.status==='pass'&&!!t.note));
   return {...this.snapshot(),results:items,counts,platformReady,productionAuthorized:false,exported:clock()};
  }
 });
}
