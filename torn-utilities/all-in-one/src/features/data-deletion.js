// Receipt persists until remote completion AND verified local cleanup. It grants
// deletion-only recovery, never TU access, and contains no API credential.
export function createDataDeletion({readJob,saveJob,removeJob,request,verify,entries,stop,cleanup,random}){
 let running=false;
 return {pending:()=>!!readJob(),async run(key,notify=()=>{}){
  if(running)throw Error('Deletion already running');running=true;
  try{
   let job=readJob();
   if(!job){
    const owner=await verify(key);
    for(const entry of entries())if(!entry.playerId)await verify(entry.key);
    job={id:String(owner.playerId),receipt:random()};
    saveJob(job);
   }
   stop();notify('Deleting TU account data. Keep this installation open; an interrupted deletion can be resumed.');
   if(!job.remoteReady){const result=await request({receipt:job.receipt,...(key?{api_key:key}:{})});key='';
    if(!result.ready_for_local_cleanup&&!result.complete){notify('Remote cleanup pending. Retry shortly to check completion.');return false;}
    job.remoteReady=true;job.sessionHashes=result.session_hashes||[];saveJob(job);
   }
   await cleanup(job.id,job.sessionHashes);const final=await request({receipt:job.receipt,cleanup_ack:true});if(!final.complete)throw Error('Final remote cleanup incomplete');removeJob();notify('Your TU registration, supplied credentials and associated identifying data have been deleted from this installation and active TU service storage. Access has ended. Enter an API key and accept the current agreement to return.');return true;
  }finally{running=false;}
 }};
}
