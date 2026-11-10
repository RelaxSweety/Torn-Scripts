import assert from 'node:assert/strict';
import {isScopedTornRead} from '../src/adapters/scoped-api-path.js';
for(const path of ['/v2/faction/123/members','/v2/faction/snapshot'])assert.equal(isScopedTornRead(path),true);
assert.equal(isScopedTornRead('/v2/user/123/profile','who'),true);assert.equal(isScopedTornRead('/v2/user/123/profile'),false);
for(const path of ['/v2/faction/../user/inventory','/v2/faction/%2e%2e/user/inventory','/v2/faction/123/members?key=secret','/v2/faction/123/members#x','https://api.torn.com/v2/faction/snapshot','/v2/faction/0/members','/v2/faction/123/members/'])assert.equal(isScopedTornRead(path,'who'),false);
console.log('Scoped API reads passed: exact used endpoints; traversal, alternate scopes, fragments and query credentials rejected');
