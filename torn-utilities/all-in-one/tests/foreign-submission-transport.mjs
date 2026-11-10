import assert from 'node:assert/strict';
import { authorizeForeignSubmission } from '../src/adapters/foreign-submission.js';
const root='https://tu-multiplayer-server-dev.tuserver.workers.dev';
const context={authorized:true,token:'session-fixture'};
for(const route of ['observations','feedback'])for(const headers of [{'Content-Type':'application/json',authorization:'old'},new Headers({'Content-Type':'application/json',authorization:'old'}),[['Content-Type','application/json'],['Authorization','old']]]){
 const result=authorizeForeignSubmission(root+'/api/foreign/'+route,{method:'POST',headers},context);
 assert.equal(result.headers.Authorization,'Bearer session-fixture');
 assert.equal(new Headers(result.headers).get('content-type'),'application/json');
 assert.equal(Object.keys(result.headers).filter(k=>k.toLowerCase()==='authorization').length,1);
 assert.throws(()=>authorizeForeignSubmission(root+'/api/foreign/'+route,{},{}),/authentication required/);
}
for(const url of ['https://api.torn.com/v2/user/basic','https://www.torn.com/item.php','https://tu-multiplayer-server.tuserver.workers.dev/api/foreign/observations',root+'/api/foreign/overview']){
 const options={headers:{Authorization:'original'}};assert.equal(authorizeForeignSubmission(url,options,context),options);
}
console.log('Foreign submission transport passed: exact DEV routes, session headers, header formats, authentication requirement and unrelated endpoints untouched');
