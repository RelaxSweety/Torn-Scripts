// Translate legacy room credentials to the DEV Worker's two-token contract.
export function authorizeToolRequest(url, options={}, {authorized,token}={}) {
 const target=new URL(String(url),'https://www.torn.com');
 if(target.origin!=='https://tu-multiplayer-server-dev.tuserver.workers.dev'||!/^\/api\/(rooms|connect|battleship|marbles)(\/|$)/.test(target.pathname))return options;
 if(!authorized||!token)throw Error('TU authentication required; reopen TU to verify your session');
 const headers={...options.headers};
 for(const name of Object.keys(headers))if(name.toLowerCase()==='authorization'){
  const room=String(headers[name]).replace(/^Bearer\s+/i,'');
  if(room)headers['x-tu-room-token']=room;
  delete headers[name];
 }
 headers.Authorization='Bearer '+token;
 return {...options,headers};
}
