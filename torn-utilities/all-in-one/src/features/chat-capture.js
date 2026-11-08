export function createChatCaptureSupport(){
 const full=/^\d{1,2}:\d{2}:\d{2}\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/;
 function timestamp(root){
  if(!root)return '';for(const el of [root,...root.querySelectorAll('time,[datetime],[data-timestamp],[data-time],[title],[data-original-title]')]){
   for(const key of ['datetime','data-timestamp','data-time','title','data-original-title']){
    const raw=(el.getAttribute(key)||'').trim();if(full.test(raw))return raw;
    if(['datetime','data-timestamp','data-time'].includes(key)&&raw){let date;if(/^\d{10}(?:\d{3})?$/.test(raw))date=new Date(Number(raw)*(raw.length===10?1000:1));else if(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d\d:\d\d)$/.test(raw))date=new Date(raw);if(date&&Number.isFinite(date.getTime()))return date.toISOString();}
   }
  }return '';
 }
 function interrupted(before,after){return !!before&&(after.top-before.top>Math.max(80,after.viewport/2))&&Math.abs(after.height-before.height)<40&&after.height-after.viewport-after.top<40;}
 return {timestamp,interrupted};
}
