// DEV-only stock-cycle model. No identities, credentials, network requests or DB writes.
const DAY=86400, GAP=900, FRESH=180;
const quantile=(a,p)=>{const b=[...a].sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor((b.length-1)*p))]};
const median=a=>quantile(a,.5);
export function reconcileStock(raw,now){
 const buckets=new Map();let rejected=0,conflicts=0;
 for(const p of raw){const t=Number(p.source_observed_at),q=Number(p.quantity);if(!Number.isSafeInteger(t)||!Number.isSafeInteger(q)||q< -1||q>1e9||!['yata','tu_dom'].includes(p.provider)||t>now||t<now-30*DAY){rejected++;continue}const key=Math.floor(t/10)*10;const rows=buckets.get(key)||[];rows.push({t:key,q:q===-1?null:q,source:p.provider==='tu_dom'?'tu_dom':'yata'});buckets.set(key,rows)}
 const points=[...buckets].sort((a,b)=>a[0]-b[0]).map(([t,rows])=>{if(rows.some(p=>p.q===null)||new Set(rows.map(p=>p.q)).size!==1){conflicts++;return {t,q:null,sources:[]}}return {t,q:rows[0].q,sources:[...new Set(rows.map(p=>p.source))]}});
 return {points,rejected,conflicts};
}
function cyclesFrom(points){
 let previous=null,empty=null;const cycles=[];let gaps=0;
 for(const p of points){if(p.q===null){previous=null;empty=null;continue}if(previous&&p.t-previous.t>GAP){previous=null;empty=null;gaps++}
  if(p.q===0){if(previous?.q>0)empty={low:previous.t,high:p.t,last:p.t};else if(empty)empty.last=p.t}
  else if(previous?.q===0){if(empty)cycles.push({zeroLow:empty.low,zeroHigh:empty.high,refillLow:empty.last,refillHigh:p.t,low:Math.max(0,empty.last-empty.high),high:p.t-empty.low});empty=null}
  previous=p;
 }
 return {cycles,empty,latest:previous,gaps};
}
function delayBounds(cycles){return [quantile(cycles.map(c=>c.low),.1),quantile(cycles.map(c=>c.high),.9)]}
export function predictStock(raw,now=Math.floor(Date.now()/1000),{truncated=false}={}){
 const reconciled=reconcileStock(raw,now),{points}=reconciled;
 const streams=['tu_dom','yata'].map(source=>{const selected=points.filter(p=>p.q===null||p.sources.includes(source));return {...cyclesFrom(selected),points:selected}});
 const current=streams.filter(s=>s.latest).sort((a,b)=>b.latest.t-a.latest.t)[0]||{points:[],cycles:[],gaps:0};
 const {empty,latest}=current,gaps=streams.reduce((n,s)=>n+s.gaps,0),cycles=[];
 // Detect transitions within each source, then reconcile overlapping cycle evidence.
 for(const c of streams.flatMap(s=>s.cycles).sort((a,b)=>a.refillHigh-b.refillHigh)){
  const old=cycles.find(p=>p.refillLow<=c.refillHigh&&c.refillLow<=p.refillHigh);
  if(old){old.zeroLow=Math.min(old.zeroLow,c.zeroLow);old.zeroHigh=Math.max(old.zeroHigh,c.zeroHigh);old.refillLow=Math.min(old.refillLow,c.refillLow);old.refillHigh=Math.max(old.refillHigh,c.refillHigh);old.low=Math.max(0,old.refillLow-old.zeroHigh);old.high=old.refillHigh-old.zeroLow;}
  else cycles.push({...c});
 }
 cycles.sort((a,b)=>a.refillHigh-b.refillHigh);
 const recent=cycles.filter(c=>c.refillHigh>=now-14*DAY).slice(-80);
 const base={model_version:'stock-cycle-v3',generated_at:now,source:'yata+tu_dom',observed_events:cycles.length,usable_intervals:recent.length,completed_cycles:recent.length,source_counts:{tu_dom:points.filter(p=>p.sources.includes('tu_dom')).length,yata:points.filter(p=>p.sources.includes('yata')).length},conflicting_buckets:reconciled.conflicts,rejected_points:reconciled.rejected,observation_gaps:gaps,truncated,latest_observed_at:latest?.t??null,latest_quantity:latest?.q??null,estimated_current_stock:latest?.q===0?0:null,precision_target_seconds:900};
 const insufficient=reason=>({...base,status:'insufficient_data',reason,precision_target_met:false});
 if(truncated)return insufficient('History limit reached; narrow timing is unsupported');
 if(!latest||now-latest.t>FRESH)return insufficient('Recent non-conflicting stock observations required');
 if(recent.length<4)return insufficient('At least four complete sell-out/refill cycles required');
 // Only use an hourly cohort when sufficiently populated; otherwise retain recent per-item history.
 const hour=t=>Math.floor(t/3600)%24,near=(a,b)=>Math.min(Math.abs(a-b),24-Math.abs(a-b))<=2;
 const select=(history,t)=>{const cohort=history.filter(c=>near(hour(c.zeroHigh),hour(t)));return cohort.length>=12?cohort:history};
 const train=select(recent,empty?.high??now),[delayLow,delayHigh]=delayBounds(train);
 // Walk-forward residuals: each forecast sees only earlier completed cycles.
 const residuals=[];let hits=0;
 for(let i=4;i<recent.length;i++){const c=recent[i],[lo,hi]=delayBounds(select(recent.slice(0,i),c.zeroHigh));const a=c.zeroLow+lo,b=c.zeroHigh+hi;residuals.push(Math.max(0,a-c.refillLow,c.refillHigh-b));if(a<=c.refillLow&&b>=c.refillHigh)hits++}
 const validated=residuals.length>=8,padding=validated?Math.max(30,quantile(residuals,.9)):900;
 let zeroLow,zeroHigh,phase;
 if(latest.q===0){if(!empty)return insufficient('Sell-out boundary unknown after an observation gap');zeroLow=empty.low;zeroHigh=empty.high;phase='empty'}
 else{
  // Within-cycle positive-stock slopes only; never bridge a refill, conflict or observation gap.
  const rates=[];for(let i=current.points.length-1;i>0;i--){const b=current.points[i],a=current.points[i-1],dt=b.t-a.t;if(a.q===null||b.q===null||a.q===0||b.q===0||b.q>a.q||dt>GAP||a.t<now-6*3600)break;if(dt>=10)rates.push((a.q-b.q)/dt)}
  const usable=rates.slice(0,60);if(usable.length<4||quantile(usable,.1)<=0)return insufficient('Stock remains available; depletion timing uncertain');
  zeroLow=Math.max(now,latest.t+latest.q/quantile(usable,.9));zeroHigh=Math.max(zeroLow,latest.t+latest.q/quantile(usable,.1));phase='in_stock';
  base.estimated_current_stock=Math.max(0,Math.floor(latest.q-median(usable)*(now-latest.t)));
 }
 const start=Math.floor(zeroLow+delayLow-padding),end=Math.ceil(zeroHigh+delayHigh+padding);
 if(end<now)return insufficient('Restock overdue; awaiting a new observation, not projecting another cycle');
 if(end-now>2*DAY)return insufficient('Forecast horizon too long');
 const measured={samples:residuals.length,coverage:residuals.length?hits/residuals.length:null,interval_miss_p90_seconds:residuals.length?quantile(residuals,.9):null,method:'walk-forward interval coverage before residual padding'};
 const tight=phase==='empty'&&validated&&measured.coverage>=.8&&end-start<=900;
 return {...base,status:'experimental',phase,expected_start_at:start,expected_end_at:end,expected_at:Math.round((start+end)/2),window_seconds:end-start,precision_target_met:tight,confidence:measured.coverage,validation:measured,seasonality:train===recent?'recent-per-item':'hour-of-day',projected_cycles_ahead:1,reason:tight?'Supported 15-minute window':'Timing uncertain; 15-minute accuracy not established',disclaimer:'Observed stock cycles; historical coverage is not a future guarantee'};
}
const caches=new WeakMap();
export function invalidateStockPrediction(db,country,ids){const cache=caches.get(db);for(const id of ids)cache?.delete(country+':'+id)}
export async function loadStockPrediction(db,country,id,now=Math.floor(Date.now()/1000)){
 let cache=caches.get(db);if(!cache){cache=new Map();caches.set(db,cache)}const key=country+':'+id,prior=cache.get(key);if(prior&&now-prior.at>=0&&now-prior.at<15)return prior.value;
 const since=now-30*DAY;
 // Compact older readings to the last observation per minute, preserving conflict barriers.
 // Keep the latest three hours at native resolution for depletion and transition boundaries.
 const queries=[['foreign_stock_observations','source_observed_at',"provider='yata'",'yata'],['foreign_direct_observations','observed_bucket',"source='tu_dom'",'tu_dom']].map(([table,stamp,filter,provider])=>`WITH buckets AS (SELECT ${stamp} AS stamp,CASE WHEN COUNT(DISTINCT quantity)=1 THEN MIN(quantity) ELSE -1 END AS quantity FROM ${table} WHERE country=? AND item_id=? AND ${stamp}>=? AND ${stamp}<=? AND ${filter} GROUP BY ${stamp}), ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY CAST(stamp/60 AS INTEGER) ORDER BY stamp DESC) AS rn FROM buckets) SELECT stamp AS source_observed_at,quantity,'${provider}' AS provider FROM ranked WHERE rn=1 OR stamp>=? OR quantity=-1 ORDER BY stamp DESC LIMIT 50001`);
 const rows=await Promise.all(queries.map(sql=>db.prepare(sql).bind(country,id,since,now,now-10800).all()));
 const value=predictStock(rows.flatMap(r=>r.results),now,{truncated:rows.some(r=>r.results.length>50000)});
 if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,{at:now,value});return value;
}
