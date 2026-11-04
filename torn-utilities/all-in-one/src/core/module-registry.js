// Isolated module lifecycle; a module failure does not block other modules.
export function createModuleRegistry({onError=()=>{}}={}) {
  const entries=new Map();
  return Object.freeze({
    register(def) {
      if(!def||!/^[a-z0-9-]+$/.test(def.id)||typeof def.activate!=='function')throw new Error('Invalid module');
      if(entries.has(def.id))throw new Error('Duplicate module '+def.id);
      entries.set(def.id,{def,state:'registered',cleanup:null});
    },
    list(){return [...entries].map(([id,e])=>({id,state:e.state,version:e.def.version||'unknown'}));},
    async activate(id,context) {
      const e=entries.get(id);if(!e)throw new Error('Unknown module');
      if(e.state==='active')return true;
      try {const cleanup=await e.def.activate(context);e.cleanup=typeof cleanup==='function'?cleanup:null;e.state='active';return true;}
      catch(error){e.state='failed';onError({moduleId:id,phase:'activate',error});return false;}
    },
    async deactivate(id) {
      const e=entries.get(id);if(!e)return false;
      try {if(e.cleanup)await e.cleanup();e.state='registered';e.cleanup=null;return true;}
      catch(error){e.state='failed';onError({moduleId:id,phase:'deactivate',error});return false;}
    }
  });
}
