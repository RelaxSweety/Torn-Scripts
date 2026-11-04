import assert from 'node:assert/strict';
import {createCredentialController} from '../src/core/api-credentials.js';
import {createServerVerifier} from '../src/core/server-verifier.js';
import {createModuleRegistry} from '../src/core/module-registry.js';
import {createTestSession} from '../src/diagnostics/test-session.js';
const data=new Map(),storage={get:async k=>data.get(k),set:async(k,v)=>data.set(k,v),remove:async k=>data.delete(k)};
const api=createCredentialController({storage,verifyWithServer:async({requestedAccess})=>({verified:true,accessLevel:requestedAccess,playerId:4539436})});
await api.confirm('1234567890abcdef','limited');
assert.equal((await api.getStatus()).accessLevel,'limited');
assert.equal((await api.getStatus()).apiKey,undefined);
const modules=createModuleRegistry();modules.register({id:'broken',activate(){throw Error('failure')}});modules.register({id:'working',activate(){return ()=>{}}});
assert.equal(await modules.activate('broken'),false);assert.equal(await modules.activate('working'),true);
const s=createTestSession({buildId:'test',platform:'pda',tests:[{id:'critical',critical:true}]});s.record('critical','pass','key 1234567890abcdef');assert.equal(s.export().releaseReady,true);assert.ok(!JSON.stringify(s.export()).includes('1234567890abcdef'));
console.log('TU core smoke tests passed');

const freshStorage=()=>{const entries=new Map();return {entries,get:async k=>entries.get(k),set:async(k,v)=>{entries.set(k,v)},remove:async k=>{entries.delete(k)}}};
const sampleKey='abcdef0123456789';
{
  const storage=freshStorage();
  const controller=createCredentialController({storage,verifyWithServer:async()=>({verified:false,accessLevel:'limited',playerId:42})});
  await assert.rejects(controller.confirm(sampleKey,'limited'),/verification/i);
  assert.equal(await controller.getStatus(),null,'Rejected keys must not persist');
}
{
  const storage=freshStorage();
  const controller=createCredentialController({storage,verifyWithServer:async()=>({verified:true,accessLevel:'public',playerId:42})});
  await assert.rejects(controller.confirm(sampleKey,'limited'),/not verified as Limited/);
  assert.equal(storage.entries.size,0,'Mismatched requested access must not persist');
}
{
  const storage=freshStorage();
  const controller=createCredentialController({storage,verifyWithServer:async()=>({verified:true,accessLevel:'full',playerId:42})});
  await assert.rejects(controller.confirm(sampleKey,'public'),/unsupported API access level/);
  assert.equal(storage.entries.size,0,'Unsupported access must not persist');
}
{
  const storage=freshStorage();
  const controller=createCredentialController({storage,verifyWithServer:async()=>({verified:true,accessLevel:'limited',playerId:42})});
  const confirmed=await controller.confirm(sampleKey,'limited');
  assert.equal(confirmed.accessLevel,'limited');
  assert.equal(await controller.getKeyForAuthorizedRequest(),sampleKey);
  assert.ok(!JSON.stringify(await controller.getStatus()).includes(sampleKey));
  await controller.clear();
  assert.equal(await controller.getStatus(),null);
}

{
  const verifier=createServerVerifier({request:async(path,options)=>{
    assert.equal(path,'/api/auth/verify-key');
    assert.equal(options.body.requested_access,'limited');
    return {verified:true,accessLevel:'limited',playerId:4539436};
  }});
  const result=await verifier({apiKey:sampleKey,requestedAccess:'limited'});
  assert.equal(result.playerId,'4539436');
}
{
  const verifier=createServerVerifier({request:async()=>({verified:true,accessLevel:'limited',playerId:null})});
  await assert.rejects(verifier({apiKey:sampleKey,requestedAccess:'limited'}),/player identity/);
}
