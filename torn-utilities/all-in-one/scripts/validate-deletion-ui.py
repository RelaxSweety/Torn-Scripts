"""Chromium checks of the built deletion UI against isolated service fixtures."""
import functools,http.server,json,pathlib,threading,hashlib
from playwright.sync_api import sync_playwright
base=pathlib.Path(__file__).resolve().parents[1]
out=pathlib.Path('/workspace/tu-validation-evidence/deletion-ui');out.mkdir(parents=True,exist_ok=True)
agreement=json.loads((base.parent/'agreements/dev/current.json').read_text())
token='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222'
mock=r'''
const privateMode=location.pathname.includes('private');
window.GM_info={scriptHandler:privateMode?'Tampermonkey':'Torn PDA',version:'fixture'};
if(privateMode){window.GM_getValue=(k,f)=>{const s=JSON.parse(sessionStorage.getItem('fixture:gm')||'{}');return k in s?s[k]:f};window.GM_setValue=(k,v)=>{const s=JSON.parse(sessionStorage.getItem('fixture:gm')||'{}');s[k]=v;sessionStorage.setItem('fixture:gm',JSON.stringify(s))};window.GM_deleteValue=k=>{const s=JSON.parse(sessionStorage.getItem('fixture:gm')||'{}');delete s[k];sessionStorage.setItem('fixture:gm',JSON.stringify(s))};window.GM_listValues=()=>Object.keys(JSON.parse(sessionStorage.getItem('fixture:gm')||'{}'));}
if(!sessionStorage.getItem('fixture:started')){
 sessionStorage.setItem('fixture:started','1');sessionStorage.setItem('fixture:accepted','1');
 localStorage.setItem('tu:identity:public-only-key:v1','aaaaaaaaaaaaaaaa');
 localStorage.setItem('tu:identity:saved-keys:v1',JSON.stringify([{key:'aaaaaaaaaaaaaaaa',level:'Public Only',playerId:'7'},{key:'bbbbbbbbbbbbbbbb',level:'Public Only',playerId:'8'}]));
 localStorage.setItem('tu:agreement:accepted',publication.agreement.agreement_version);sessionStorage.setItem('tu:dev:auth:session:v1',fixtureToken);
}
const response=o=>{const path=new URL(o.url).pathname;let body={};try{body=JSON.parse(o.data||'{}')}catch{}
 if(path==='/api/auth/delete-data'){
  if(body.cleanup_ack){sessionStorage.setItem('fixture:accepted','0');return {complete:true};}
  const n=Number(sessionStorage.getItem('fixture:delete-count')||0)+1;sessionStorage.setItem('fixture:delete-count',n);
  return n===1?{complete:false,retry_after_seconds:1}:{complete:false,ready_for_local_cleanup:true,session_hashes:[fixtureTokenHash],room_hashes:[]};
 }
 if(path==='/api/auth/agreement/current')return publication;
 if(path==='/api/auth/register'){sessionStorage.setItem('fixture:manual',String(body.manual));return {token:fixtureToken,playerId:7,verified:true,accessLevel:'public',player:{torn_id:7,username:'Fixture_7',account_status:'active'}};}
 if(path==='/api/auth/agreement'){if(o.method==='POST')sessionStorage.setItem('fixture:accepted','1');return {accepted:sessionStorage.getItem('fixture:accepted')==='1',agreement:publication.agreement};}
 if(path.endsWith('/key/info'))return {info:{access:{type:'Public Only'},user:{id:7}}};
 return {name:'Fixture_7',id:7,profile:{id:7,name:'Fixture_7'},status:{state:'Okay'}};
};
window.GM_xmlhttpRequest=o=>queueMicrotask(()=>o.onload?.({status:200,responseText:JSON.stringify(response(o))}));
window.fetch=async(url,options={})=>new Response(JSON.stringify(response({url:String(url),method:options.method,data:options.body})),{status:200,headers:{'content-type':'application/json'}});
'''
class Handler(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  if self.path=='/bundle.js':data=(base/'dist/tu-integrated-staging-dev.user.js').read_bytes();kind='application/javascript; charset=utf-8'
  else:
   data=('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body><script>const publication='+json.dumps(agreement)+';const fixtureToken='+json.dumps(token)+';const fixtureTokenHash='+json.dumps(hashlib.sha256(token.encode()).hexdigest())+';'+mock+'</script><script src="/bundle.js"></script>').encode();kind='text/html; charset=utf-8'
  self.send_response(200);self.send_header('Content-Type',kind);self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for mode in ['origin','private']:
   context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://127.0.0.1:'+str(server.server_port)+'/'+mode);page.wait_for_timeout(300)
   page.locator('#tu-pda-launcher').click();page.locator('[data-tab=settings]').click();page.locator('.tu-card').filter(has=page.get_by_text('API Keys',exact=True)).get_by_role('button').click()
   page.get_by_role('button',name='Delete My TU Data',exact=True).wait_for();page.screenshot(path=str(out/(mode+'-settings.png')))
   page.once('dialog',lambda dialog:dialog.accept());page.get_by_role('button',name='Delete My TU Data',exact=True).click();page.get_by_text('Remote cleanup pending.',exact=False).wait_for();page.screenshot(path=str(out/(mode+'-pending.png')))
   dialogs=[];page.once('dialog',lambda dialog:(dialogs.append(dialog.message),dialog.accept()));page.get_by_role('button',name='Resume TU data deletion',exact=True).click();page.wait_for_timeout(500)
   assert dialogs and 'have been deleted' in dialogs[0],dialogs
   data=page.evaluate("({origin:Object.fromEntries(Object.entries(localStorage)),gm:JSON.parse(sessionStorage.getItem('fixture:gm')||'{}')})")
   assert 'aaaaaaaaaaaaaaaa' not in json.dumps(data),data
   assert 'bbbbbbbbbbbbbbbb' in json.dumps(data),'Other account key preserved'
   assert 'tu:agreement:accepted' not in data['origin']
   page.locator('#tu-pda-launcher').click();page.locator('#tu-agreement-overlay').wait_for(state='visible');assert page.locator('#tu-agreement-overlay input[type=password]').input_value()==''
   page.screenshot(path=str(out/(mode+'-fresh-key-required.png')))
   page.locator('#tu-agreement-overlay input[type=password]').fill('aaaaaaaaaaaaaaaa');page.locator('#tu-agreement-overlay input[type=checkbox]').check();page.get_by_role('button',name='I Agree — Continue',exact=True).click();page.locator('#tu-agreement-overlay').wait_for(state='detached')
   assert page.evaluate("sessionStorage.getItem('fixture:manual')")=='true';assert page.evaluate("localStorage.getItem('tu:agreement:accepted')")==agreement['agreement']['agreement_version']
   assert not errors,errors;print(mode+': deletion pending/resume, local isolation, empty fresh-key entry and explicit re-registration passed')
   context.close()
 finally:browser.close();server.shutdown()
