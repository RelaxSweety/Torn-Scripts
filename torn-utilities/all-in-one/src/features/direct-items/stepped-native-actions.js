// Suspends native click chains between trusted Snatch button gestures.
export function createSteppedNativeActions({native}){
 let job=null;
 const nextLabel=(kind,label)=>{const value=String(label||'').trim().toLowerCase();if(/^no$/.test(value))return 'Cancel '+(kind==='buy'?'purchase':'item action');if(/^yes$/.test(value))return kind==='buy'?'Confirm purchase':kind==='destroy'?'Destroy selected item':kind==='heal'?'Confirm healing item':'Confirm return flight';if(/^continue/.test(value))return 'Continue to return flight';if(kind==='heal'&&/^(?:use|take)$/.test(value))return 'Use selected healing item';if(/travel back/.test(value))return 'Book return flight';if(/travel home/.test(value))return 'Open return flight';if(/trash/.test(value))return 'Trash selected item';if(/close/.test(value))return 'Close item result';if(/^(max|maximum)$/.test(value))return 'Set maximum quantity';if(/^buy$/.test(value))return 'Buy selected quantity';return kind==='destroy'?'Select item for destruction':kind==='buy'?'Open purchase panel':kind==='heal'?'Select healing item':'Open return flight';};
 function deliver(current,error,result){if(current.waiter){const waiter=current.waiter;current.waiter=null;error?waiter.reject(error):waiter.resolve(result);}else current.outcome={error,result};}
 function cancel(){const current=job;job=null;if(current){const error=Error('Action canceled. No further Torn step was sent.');current.cancelled=true;current.gate?.reject(error);deliver(current,error);}native.cancel?.();}
 async function execute(kind,options){
  if(!options.event?.isTrusted||!options.guard())throw Error('A fresh user click and unchanged run are required for each Torn step.');
  if(job&&(job.run!==options.run||job.kind!==kind))throw Error('Finish or cancel the pending Torn action before starting another.');
  const current=job||{run:options.run,kind,first:true,gate:null,waiter:null};
  if(current.waiter)throw Error('The current Torn step is still being checked.');
  const response=new Promise((resolve,reject)=>{current.waiter={resolve,reject};});
  if(job){if(!current.gate){deliver(current,Error('The next Torn control is not ready.'));return response;}const gate=current.gate;current.gate=null;gate.resolve();}
  else{
   job=current;
   const awaitAction=async label=>{if(current.cancelled||!options.guard())throw Error('Run changed; no further Torn step was sent.');if(current.first){current.first=false;return;}
    const waiting=new Promise((resolve,reject)=>{current.gate={resolve,reject};});
    deliver(current,null,{actionPending:true,nextLabel:nextLabel(kind,label)});await waiting;
   };
   Promise.resolve().then(()=>native.execute(kind,{...options,awaitAction})).then(result=>{if(job===current)job=null;deliver(current,null,result);},error=>{if(job===current)job=null;deliver(current,error);});
  }
  return response;
 }
 return {...native,execute,cancel,forget(){cancel();native.forget?.();},hasPendingStep:()=>!!job?.gate,isStepping:()=>!!job};
}
