import assert from 'node:assert/strict';
export function storedZipEntries(value){
 const data=Buffer.from(value),entries=new Map();let offset=0;
 while(data.readUInt32LE(offset)===0x04034b50){
  assert.equal(data.readUInt16LE(offset+8),0,'ZIP entry uses storage method');const size=data.readUInt32LE(offset+18),nameSize=data.readUInt16LE(offset+26),extraSize=data.readUInt16LE(offset+28),start=offset+30+nameSize+extraSize,name=data.subarray(offset+30,offset+30+nameSize).toString('utf8');entries.set(name,data.subarray(start,start+size).toString('utf8'));offset=start+size;
 }
 assert.equal(data.readUInt32LE(offset),0x02014b50,'Central directory follows entries');return entries;
}
