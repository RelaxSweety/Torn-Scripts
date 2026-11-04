// Platform-neutral guided test sessions; intentionally never captures API credentials.
const VALID=new Set(['pass','fail','skip']);
export function createTestSession({buildId,platform,tests,clock=()=>new Date().toISOString()}) {
  if(!['tampermonkey','pda'].includes(platform))throw new Error('Unsupported platform');
  const results=new Map(),events=[];
  const scrub=value=>String(value||'').replace(/\b[A-Za-z0-9]{16}\b/g,'[REDACTED]');
  return Object.freeze({
    record(testId,status,notes='') {
      if(!tests.some(t=>t.id===testId))throw new Error('Unknown test');
      if(!VALID.has(status))throw new Error('Invalid test status');
      results.set(testId,{status,notes:scrub(notes),at:clock()});
    },
    log(moduleId,code,message) {events.push({moduleId:scrub(moduleId),code:scrub(code),message:scrub(message),at:clock()});},
    export() {
      const items=tests.map(t=>({id:t.id,critical:!!t.critical,result:results.get(t.id)||{status:'not-tested'}}));
      return {schemaVersion:1,buildId,platform,createdAt:clock(),tests:items,events:[...events],releaseReady:items.every(t=>!t.critical||t.result.status==='pass')};
    }
  });
}
