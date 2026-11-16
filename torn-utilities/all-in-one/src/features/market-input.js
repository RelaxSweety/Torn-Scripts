// Shared accepted-value verification for every Market Price Auto Fill write.
export async function setMarketInput(input,value,{resolve=()=>input,signal,settleMs=80}={}){
 if(!input||input.disabled||input.readOnly)throw Error('Listing input is unavailable.');
 const w=input.ownerDocument.defaultView,expected=String(value),normal=v=>String(v).replace(/[$,\s]/g,'');
 if(signal?.aborted)throw Error('Fill cancelled.');
 const setter=Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value')?.set;
 if(!setter)throw Error('Native input setter unavailable.');
 setter.call(input,expected);
 input.dispatchEvent(new w.Event('input',{bubbles:true}));
 input.dispatchEvent(new w.Event('change',{bubbles:true}));
 // Torn may format the value or replace the input during its React commit.
 for(let attempt=0;attempt<2;attempt++){
  await new Promise(r=>w.setTimeout(r,settleMs));
  if(signal?.aborted)throw Error('Fill cancelled.');
  input=resolve();
  if(!input?.isConnected||normal(input.value)!==normal(expected))throw Error('Torn did not accept the listing value. Retry this row.');
 }
 return input;
}
