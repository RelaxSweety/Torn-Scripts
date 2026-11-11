import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from './fixtures/worker.mjs';
const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE foreign_stock_observations(country TEXT,item_id INTEGER,quantity INTEGER,unit_price INTEGER,source_observed_at INTEGER,collected_at INTEGER,provider TEXT);
CREATE TABLE foreign_direct_observations(country TEXT,item_id INTEGER,observed_bucket INTEGER,quantity INTEGER,unit_price INTEGER,source TEXT DEFAULT 'tu_dom',received_at INTEGER);
CREATE TABLE foreign_restock_events(country TEXT,item_id INTEGER,previous_observed_at INTEGER,detected_observed_at INTEGER,quantity_before INTEGER,quantity_after INTEGER,confidence TEXT);
INSERT INTO foreign_direct_observations VALUES('can',206,100,0,500,'tu_dom',100),('can',206,110,10,500,'tu_dom',110),('can',206,110,20,500,'tu_dom',111),('can',206,120,5,500,'tu_dom',120);`);
const binding={prepare(sql){return {values:[],bind(...values){this.values=values;return this;},async all(){return {results:db.prepare(sql).all(...this.values)};},async first(){return db.prepare(sql).get(...this.values)||null;}};}};
try{
 const response=await worker.fetch(new Request('https://tu.example/api/foreign/history?country=can&item_id=206'),{FOREIGN_DB:binding});assert.equal(response.status,200);const history=await response.json();assert.deepEqual(history.points.map(p=>p.source_observed_at),[100,120]);
 const events=await (await worker.fetch(new Request('https://tu.example/api/foreign/restocks?country=can&item_id=206'),{FOREIGN_DB:binding})).json();assert.equal(events.events.length,1);assert.equal(events.events[0].quantity_after,5,'Conflicting same-bucket values never become a stock increase');
 const overview=await (await worker.fetch(new Request('https://tu.example/api/foreign/overview'),{FOREIGN_DB:binding})).json();assert.equal(overview.locations[0].items[0].direct_observations,2);assert.equal(overview.locations[0].items[0].latest_quantity,5);
}finally{db.close();}
console.log('Observation integrity passed against SQLite: ambiguous timestamp buckets excluded consistently from history, restock events and overview');
