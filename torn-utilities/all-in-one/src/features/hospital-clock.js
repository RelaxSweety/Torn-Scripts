// Read-only hospital deadline; relative labels are anchored once, not restarted by repaint.
export function createHospitalClock({document,now=()=>Date.now()}){
 let profileUntil=null,signature='',relativeUntil=null;
 const deadline=value=>{const n=Number(value);if(Number.isFinite(n)&&n>=1e9)return n<1e12?n*1000:n;if(typeof value==='string'&&/^\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(value)){const parsed=Date.parse(value);if(Number.isFinite(parsed))return parsed;}return null;};
 function read(status){
  if(status)profileUntil=status.state==='Hospital'?deadline(status.until):null;
  const hospital=document.querySelector('a[aria-label^="Hospital:"],[data-hospital-until]');
  if(hospital){
   for(const el of [hospital,...hospital.querySelectorAll('[data-hospital-until],[data-until],[data-time],[datetime]')])for(const attr of ['data-hospital-until','data-until','data-time','datetime']){const value=deadline(el.getAttribute(attr));if(value)return value;}
   if(profileUntil)return profileUntil;
   const text=[hospital.getAttribute('aria-label'),hospital.textContent].filter(Boolean).join(' '),clock=text.match(/\b(\d{1,3}):(\d{2}):(\d{2})\b/);let seconds=0,found=false;if(/\bago\b/i.test(text))return profileUntil;
   for(const match of text.matchAll(/\b(\d+)\s*(days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|[dhms])\b/gi)){found=true;seconds+=Number(match[1])*({d:86400,h:3600,m:60,s:1}[match[2][0].toLowerCase()]);}
   if(!found&&clock&&/\b(remaining|left|for)\b/i.test(text)){seconds=Number(clock[1])*3600+Number(clock[2])*60+Number(clock[3]);found=true;}
   if(found){if(signature!==text){signature=text;relativeUntil=now()+seconds*1000;}return relativeUntil;}
  }else{signature='';relativeUntil=null;}
  return profileUntil;
 }
 return {read};
}
