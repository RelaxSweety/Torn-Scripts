// Read-only hospital deadline; relative labels are anchored once, not restarted by repaint.
export function createHospitalClock({document,now=()=>Date.now()}){
 let profileUntil=null,profileState='',profileUntilPresent=false,signature='',relativeUntil=null,diagnostic={source:'unavailable',until:null,nativeHospitalPresent:false,reason:'not-read'};
 const deadline=value=>{const n=Number(value);if(Number.isFinite(n)&&n>=1e9)return n<1e12?n*1000:n;if(typeof value==='string'&&/^\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(value)){const parsed=Date.parse(value);if(Number.isFinite(parsed))return parsed;}return null;};
 function read(status){
  if(status){profileState=['Hospital','Abroad','Traveling','Okay'].includes(status.state)?status.state:'other';profileUntilPresent=status.until!==undefined&&status.until!==null;profileUntil=status.state==='Hospital'?deadline(status.until):null;}
  const hospital=[...document.querySelectorAll('a[aria-label^="Hospital:"],[data-hospital-until]')].find(el=>!el.closest('#tu-snatch-run,#tu-snatch-extra-hosp,#tuim-panel,#tu-pda-panel'));
  const finish=(until,source,reason='')=>{diagnostic={source,until:until||null,nativeHospitalPresent:!!hospital,profileState,profileUntilPresent,reason};return until;};
  if(hospital){
   for(const el of [hospital,...hospital.querySelectorAll('[data-hospital-until],[data-until],[data-time],[datetime]')])for(const attr of ['data-hospital-until','data-until','data-time','datetime']){const value=deadline(el.getAttribute(attr));if(value)return finish(value,'native-deadline');}
   if(profileUntil)return finish(profileUntil,'profile-hospital-until');
   const texts=[...new Set([hospital.getAttribute('title'),hospital.getAttribute('data-original-title'),hospital.getAttribute('aria-label'),hospital.textContent].filter(Boolean).map(text=>text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()))];
   for(const text of texts){const clock=text.match(/\b(\d{1,3}):(\d{2}):(\d{2})\b/);let seconds=0,found=false;if(/\bago\b/i.test(text))continue;
    for(const match of text.matchAll(/\b(\d+)\s*(days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|[dhms])\b/gi)){found=true;seconds+=Number(match[1])*({d:86400,h:3600,m:60,s:1}[match[2][0].toLowerCase()]);}
    if(!found&&clock&&/\b(remaining|left|for)\b/i.test(text)){seconds=Number(clock[1])*3600+Number(clock[2])*60+Number(clock[3]);found=true;}
    if(found){if(signature!==text){signature=text;relativeUntil=now()+seconds*1000;}return finish(relativeUntil,'native-duration');}
   }
  }else{signature='';relativeUntil=null;}
  return finish(profileUntil,profileUntil?'profile-hospital-until':'unavailable',profileUntil?'':profileState==='Hospital'?(profileUntilPresent?'profile-hospital-until-invalid-or-zero':'profile-hospital-until-missing'):profileState?'profile-state-not-hospital':'profile-not-read');
 }
 return {read,report:()=>({...diagnostic})};
}
