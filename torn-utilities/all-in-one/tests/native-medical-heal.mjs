import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const code=fs.readFileSync(new URL('../dist/tu-integrated-staging-dev.user.js',import.meta.url),'utf8');
const factory=name=>{const marker='const '+name+'=',start=code.indexOf(marker)+marker.length,end=code.indexOf('\n};',start)+2;assert.ok(start>=marker.length&&end>start,name);return vm.runInNewContext('('+code.slice(start,end)+')');};
const Native=factory('createNativeTravelActions'),Stepped=factory('createSteppedNativeActions'),Direct=factory('createSnatchDirectItems');
for(const scenario of ['release','partial','stock-dropped','hospital-changed','item-changed','cancel']){
 const w=new JSDOM('<a aria-label="Hospital: Fixture"></a><div id="travel-root"><ul class="inventoryPanel_fixture" aria-label="Inventory 1 items"><li class="inventorySlot_fixture" data-item-id="66"><button aria-label="Morphine slot 1" aria-expanded="false">Morphine</button></li></ul></div>',{url:'https://www.torn.com/page.php?sid=travel',pretendToBeVisual:true}).window,d=w.document;
 d.hasFocus=()=>true;w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&!this.hidden&&!this.disabled?[{}]:[];};
 const slot=d.querySelector('li'),opener=slot.querySelector('button'),calls=[];let stock=2500,hospitalized=true,until=Date.now()+3600000;
 opener.onclick=()=>{calls.push('open');opener.setAttribute('aria-expanded','true');const use=d.createElement('button');use.textContent='Use';slot.append(use);use.onclick=()=>{calls.push('use');use.remove();const question=d.createElement('div');question.className='confirmQuestion_fixture';question.innerHTML='Would you like to use the <strong>Morphine</strong>?<button>Yes</button><button>No</button>';slot.append(question);question.querySelector('button').onclick=()=>{calls.push('yes');question.remove();opener.remove();const result=d.createElement('p');result.textContent=scenario==='partial'?'Morphine used. Hospital time reduced.':'You are out of the hospital!';slot.append(result);until-=900000;if(scenario!=='partial')hospitalized=false;};};};
 const run={ownerId:'7',intentId:'fixture',watchKey:'id:206',watchName:'Xanax',minimumQty:1,expiresAt:Date.now()+3600000,medicals:[{id:66,name:'Morphine'}]};
 const adapter=Direct({native:Stepped({native:Native({window:w,document:d,enabled:()=>true})}),getPilot:()=>({report:()=>({unconfirmedAttempt:false}),useRunItem(){throw Error('Morphine must not enter the blood-bag POST adapter');},cancel(){}}),getProfile:()=>{throw Error('Native evidence does not need the direct profile read');},window:w});
 const options=()=>({run,event:{isTrusted:true},guard:()=>true,getSnapshot:()=>({hospitalized,hospitalUntil:until,quantity:stock,traveling:false,returning:false}),onEvent(){}});
 try{
  await assert.rejects(adapter.execute('heal',{...options(),event:{isTrusted:false}}));assert.deepEqual(calls,[]);
  assert.equal((await adapter.execute('heal',options())).nextLabel,'Use selected healing item');assert.deepEqual(calls,['open']);
  assert.equal((await adapter.execute('heal',options())).nextLabel,'Confirm healing item');assert.deepEqual(calls,['open','use']);
  if(scenario==='stock-dropped')stock=0;
  if(scenario==='hospital-changed')hospitalized=false;
  if(scenario==='item-changed')slot.querySelector('strong').textContent='Another item';
  if(scenario==='cancel'){adapter.cancel();assert.deepEqual(calls,['open','use']);continue;}
  if(['stock-dropped','hospital-changed','item-changed'].includes(scenario)){await assert.rejects(adapter.execute('heal',options()),/changed before healing confirmation|state no longer permits/);assert.deepEqual(calls,['open','use']);}
  else{const result=await adapter.execute('heal',options());assert.equal(result.medicalUsed,true);assert.equal(result.hospitalReleased,scenario==='release');assert.deepEqual(calls,['open','use','yes']);assert.equal(run.capacityLedger.freed,1);}
 }finally{adapter.cancel();w.close();}
}
console.log('Generated native medical healing passed: Morphine selection, one trusted gesture per step, partial/released outcomes, capacity credit and fresh stock/hospital/item/cancellation guards');
