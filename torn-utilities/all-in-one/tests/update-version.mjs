import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/manager/manager.user.js',import.meta.url),'utf8');
const line=source.split('\n').find(line=>line.includes('const versionCompare='));
const compare=Function(line+';return versionCompare;')();
for(const [old,newer] of [['0.5.42.106-dev','0.5.42.109-dev'],['0.5.42.109-dev','0.5.42.110-dev'],['0.5.42.99-dev','0.5.42.100-dev'],['0.5.42.110-dev','0.5.42.110'],['0.5.42.110-dev.2','0.5.42.110-dev.10'],['0.5.42.999-dev','0.5.43.1-dev']]){assert.ok(compare(old,newer)<0,`${old} must detect ${newer}`);assert.ok(compare(newer,old)>0,'Older remote cannot be offered as newer');}
assert.equal(compare('0.5.42.110-dev','0.5.42.110-dev'),0);assert.equal(compare('0.5.42','0.5.42.0'),0);assert.throws(()=>compare('garbage','0.5.42.110-dev'),/format/);
console.log('TU update versions passed: fourth numeric component, numeric rollover, prerelease/stable ordering, equality and invalid metadata.');
