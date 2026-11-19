// ==UserScript==
// @name         TU Honors & Medals
// @namespace    https://github.com/RelaxSweety/Torn-Scripts
// @version      0.1.0
// @description  Sort awards, track supported progress and find nearby milestones using TU authentication
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(() => {
  'use strict';
  const ID='honors-medals', VERSION='0.1.0', PANEL='tuhm-panel';
  // Deliberately narrow rules: changed or compound requirements must not produce false progress.
  const RULES=[
    [/^(?:win|achieve) ([\d,]+) attacks(?: won)?$/i,'attacking.attacks.won','attack wins'],
    [/^(?:win|achieve) ([\d,]+) (?:defen[cs]es|defends)(?: won)?$/i,'attacking.defends.won','defense wins'],
    [/^(?:bust|successfully bust) ([\d,]+) (?:people|players) (?:from|out of) (?:the Torn City )?jail$/i,'jail.busts.success','successful busts'],
    [/^travel (?:abroad )?([\d,]+) times$/i,'travel.total','trips'],
    [/^win ([\d,]+) races$/i,'racing.races.won','race wins'],
    [/^use ([\d,]+) medical items$/i,'hospital.medical_items_used','medical items'],
    [/^(?:bail) ([\d,]+) players out of jail$/i,'jail.bails.amount','bails'],
    [/^go to jail ([\d,]+) times$/i,'jail.times_jailed','jail visits'],
    [/^deal ([\d,]+) critical hits$/i,'attacking.hits.critical','critical hits'],
    [/^earn ([\d,]+) respect$/i,'attacking.faction.respect','respect'],
    [/^fire ([\d,]+) rounds$/i,'attacking.ammunition.total','rounds fired'],
    [/^import ([\d,]+) items from abroad$/i,'travel.items_bought','items bought abroad']
  ];
  for(const [country,path] of [['Mexico','mexico'],['Canada','canada'],['Cayman Islands','cayman_islands'],['Hawaii','hawaii'],['England','united_kingdom'],['Switzerland','switzerland'],['Argentina','argentina'],['Japan','japan'],['China','china'],['Dubai','united_arab_emirates'],['South Africa','south_africa']]){
    RULES.push([new RegExp('^Travel to '+country+' ([\\d,]+) times$','i'),'travel.'+path,'trips to '+country]);
  }
  for(const [weapon,path] of [['rifles','rifles'],['SMGs','sub_machine_guns'],['clubbing weapons','clubbing'],['shotguns','shotguns'],['machine guns','machine_guns'],['temporary weapons','temporary'],['mechanical weapons','mechanical'],['slashing weapons','slashing'],['heavy artillery','heavy_artillery'],['piercing weapons','piercing'],['pistols','pistols']]){
    RULES.push([new RegExp('^Achieve ([\\d,]+) finishing hits with '+weapon+'$','i'),'finishing_hits.'+path,'finishing hits with '+weapon]);
  }
  const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
  const statAt=(stats,path)=>number(path.split('.').reduce((v,k)=>v?.[k],stats));
  function tracking(award,stats){
    // Crimes 1.0/2.0 and historical awards need separate semantics; never infer them.
    if(award.crimes_version)return null;
    const description=String(award.description||'').trim().replace(/\.$/,'');
    for(const [pattern,path,unit] of RULES){
      const match=description.match(pattern);if(!match)continue;
      const target=Number(match[1].replace(/,/g,'')),current=statAt(stats,path);
      if(!Number.isSafeInteger(target)||target<=0||current===null)return null;
      return {current,target,remaining:Math.max(0,target-current),percent:Math.min(100,current/target*100),unit,path};
    }
    return null;
  }
  function awardList(data,field){
    if(!Array.isArray(data?.[field]))throw Error('Unexpected '+field+' response');
    const rows=data[field];
    if(rows.some(a=>!a||!Number.isSafeInteger(a.id)||a.id<=0)||new Set(rows.map(a=>a.id)).size!==rows.length)throw Error('Invalid '+field+' IDs');
    return rows;
  }
  function buildRows(catalog,owned,stats){
    return ['honors','medals'].flatMap(kind=>{
      const earned=owned[kind]===null?null:new Map(owned[kind].map(a=>[a.id,a.timestamp]));
      return catalog[kind].map(a=>{
        const defaultHonor=kind==='honors'&&String(a.type?.title).toLowerCase()==='default';
        const status=defaultHonor?'default':earned===null?'unknown':earned.has(a.id)?'earned':'unearned';
        return {...a,key:kind+':'+a.id,kind,category:a.type?.title||'Other',status,
          timestamp:earned?.get(a.id)??null,progress:defaultHonor?null:tracking(a,stats)};
      });
    });
  }
  const recommendations=rows=>rows.filter(r=>r.status==='unearned'&&r.progress).sort((a,b)=>
    b.progress.percent-a.progress.percent||a.name.localeCompare(b.name)||a.key.localeCompare(b.key));
  function selectRows(rows,{query='',kind='all',status='all',category='all',sort='name',ascending=true}={}){
    const term=query.trim().toLowerCase();
    const filtered=rows.filter(r=>(kind==='all'||r.kind===kind)&&(category==='all'||r.category===category)&&
      (status==='all'||(status==='trackable'?!!r.progress:r.status===status))&&
      (!term||[r.name,r.description,r.category].some(v=>String(v||'').toLowerCase().includes(term))));
    return filtered.sort((a,b)=>{
      const value=r=>sort==='progress'?r.progress?.percent??null:sort==='remaining'?r.progress?.remaining??null:sort==='date'?r.timestamp:r[sort];
      const x=value(a),y=value(b);
      // Missing values stay last in both directions.
      if(x==null||y==null)return x==null?(y==null?a.key.localeCompare(b.key):1):-1;
      const c=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y));
      return (ascending?c:-c)||a.key.localeCompare(b.key);
    });
  }
  // Test the same functions used by the userscript without a bundler or page-side exports.
  if(typeof module==='object'&&module.exports){module.exports={tracking,awardList,buildRows,recommendations,selectRows};return;}
  if(window.__TU_HONORS_MEDALS__)return;
  window.__TU_HONORS_MEDALS__=true;
  const manager=()=>window.TornUtilities;
  let ctx=null,panel=null,body=null,tableBody=null,summary=null,recs=null,message=null,refreshButton=null;
  let rows=[],busy=false,generation=0,updatedAt=0,lastAttempt=0,identity=null,preferences={};
  const el=(tag,parent,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;parent?.append(n);return n;};
  const button=(parent,text,fn)=>{const n=el('button',parent,text);n.type='button';n.onclick=fn;return n;};
  const persist=()=>{try{manager().storage.set(ID,'preferences',preferences);}catch{}};
  const fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:1});
  const date=n=>n?new Date(n*1000).toLocaleDateString('en-GB',{timeZone:'UTC'}):'—';
  function clampPanel(){
    if(!panel)return;
    const r=panel.getBoundingClientRect();
    panel.style.left=Math.max(0,Math.min(r.left,innerWidth-r.width-6))+'px';
    panel.style.top=Math.max(0,Math.min(r.top,innerHeight-Math.min(r.height,innerHeight)-6))+'px';
  }
  window.addEventListener('resize',clampPanel);
  function render(){
    if(!panel)return;
    const earned=rows.filter(r=>r.status==='earned').length,unearned=rows.filter(r=>r.status==='unearned').length,unknown=rows.filter(r=>r.status==='unknown').length;
    summary.textContent=earned+' earned · '+unearned+' unearned · '+unknown+' unknown · '+rows.filter(r=>r.progress).length+' trackable'+(updatedAt?' · Updated '+new Date(updatedAt).toLocaleTimeString():'');
    tableBody.replaceChildren();
    const selected=selectRows(rows,preferences);
    for(const a of selected){
      const tr=el('tr',tableBody);tr.dataset.award=a.key;
      const title=el('td',tr);el('strong',title,a.name);el('small',title,a.description);
      el('td',tr,a.kind==='honors'?'Honor':'Medal');el('td',tr,a.category);
      el('td',tr,({default:'Default (available)',unknown:'Unknown',earned:'Earned',unearned:'Unearned'})[a.status]);
      const progress=el('td',tr);
      if(a.status==='earned'){el('span',progress,'Earned');}
      else if(a.progress){
        const p=a.progress;el('span',progress,fmt(p.current)+' / '+fmt(p.target)+' '+p.unit+' ('+fmt(p.percent)+'%)');
        const bar=el('progress',progress);bar.max=100;bar.value=p.percent;bar.setAttribute('aria-label',a.name+' progress');
        el('small',progress,p.remaining?fmt(p.remaining)+' remaining':'Target met; award not yet confirmed');
      }else el('span',progress,'Not tracked');
      el('td',tr,date(a.timestamp));
    }
    if(!selected.length)el('td',el('tr',tableBody),busy?'Loading achievements…':'No matching achievements.').colSpan=6;
    recs.replaceChildren();
    el('strong',recs,'Closest remaining achievements');
    el('p',recs,'Ranked by percentage complete among known unearned, trackable awards. This estimates proximity, not time, cost or difficulty. Remaining counts use different units.');
    const list=el('ol',recs);
    for(const a of recommendations(rows).slice(0,5)){
      const p=a.progress;el('li',list,a.name+' — '+fmt(p.remaining)+' '+p.unit+' remaining ('+fmt(p.percent)+'% complete)');
    }
    if(!list.children.length)el('p',recs,'No confirmed remaining achievements with supported progress.');
    refreshButton.disabled=busy;
    const sortSelect=panel.querySelector('[data-filter="sort"]');if(sortSelect)sortSelect.value=preferences.sort;
    for(const th of panel.querySelectorAll('th[data-sort]'))th.setAttribute('aria-sort',th.dataset.sort===preferences.sort?(preferences.ascending?'ascending':'descending'):'none');
  }
  async function refresh(){
    if(busy||!ctx)return;
    if(Date.now()-lastAttempt<30000){message.textContent='Please wait 30 seconds between refreshes.';return;}
    const api=manager();
    if(!api?.requestTorn){message.textContent='Update TU Manager to the Honors & Medals DEV build to use shared authentication.';return;}
    const player=api.getPlayer?.();
    if(!player?.id){message.textContent='Verify your existing API key in TU Manager, then reopen this module.';return;}
    const owner=String(player.id),token=++generation;identity=owner;busy=true;lastAttempt=Date.now();
    message.textContent='Loading achievement catalogs and your progress…';render();
    const paths=['/v2/torn/honors','/v2/torn/medals','/v2/user/honors','/v2/user/medals','/v2/user/personalstats?cat=all'];
    // Sequential requests limit bursts; failures remain independent (e.g. Public Only honors).
    const results=[];
    for(const path of paths){
      if(token!==generation||!ctx||String(api.getPlayer?.()?.id)!==owner)return;
      try{const data=await api.requestTorn(path);results.push({data});}catch{results.push({failed:true});}
    }
    if(token!==generation||!ctx||String(api.getPlayer?.()?.id)!==owner)return;
    const notes=[],catalog={honors:[],medals:[]},owned={honors:null,medals:null};let stats={};
    for(let i=0;i<4;i++){
      const field=i%2===0?'honors':'medals';
      try{
        if(results[i].failed)throw Error();
        const list=awardList(results[i].data,field);
        if(i<2){if(list.some(a=>typeof a.name!=='string'||typeof a.description!=='string'))throw Error();catalog[field]=list;}
        else owned[field]=list;
      }catch{notes.push(i<2?'Could not load '+field+' catalog.':field==='honors'?'Honor ownership unavailable: /user/honors requires Minimal access. Public Only keys cannot read it.':'Medal ownership unavailable.');}
    }
    if(!results[4].failed&&results[4].data?.personalstats&&typeof results[4].data.personalstats==='object')stats=results[4].data.personalstats;
    else notes.push('Progress stats unavailable.');
    rows=buildRows(catalog,owned,stats);busy=false;updatedAt=Date.now();
    message.textContent=notes.length?notes.join(' ')+' Refresh to retry.':'Loaded. Progress is an estimate; Torn confirms earned status.';
    const categories=panel.querySelector('[data-filter="category"]'),prior=preferences.category||'all';
    categories.replaceChildren();for(const c of ['all',...new Set(rows.map(r=>r.category).sort())]){const o=el('option',categories,c==='all'?'All categories':c);o.value=c;}
    categories.value=[...categories.options].some(o=>o.value===prior)?prior:'all';preferences.category=categories.value;
    render();
  }
  function activate(context){
    ctx=context;preferences={sort:'name',ascending:true,...manager().storage.get(ID,'preferences',{})};
    const styleId='tuhm-style';
    if(!document.getElementById(styleId)){
      const style=el('style',document.head);style.id=styleId;style.textContent=`
        #tuhm-panel{position:fixed;z-index:2147483644;left:4vw;top:8vh;width:760px;height:600px;max-width:calc(100vw - 12px);max-height:calc(100dvh - 12px);min-width:220px;min-height:120px;resize:both;overflow:auto;box-sizing:border-box;background:#101417;color:#eee;border:1px solid #c49a46;border-radius:12px;box-shadow:0 10px 35px #000d;font:14px system-ui,Arial,sans-serif}
        #tuhm-panel[hidden]{display:none!important}#tuhm-panel *{box-sizing:border-box}#tuhm-panel header{display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid #806a3e;background:#101417;position:sticky;top:0;z-index:100}
        #tuhm-panel button{background:#252a2e;color:#f1ce72;border:1px solid #806a3e;border-radius:5px;padding:7px 9px;cursor:pointer}#tuhm-panel button:disabled{opacity:.5;cursor:wait}#tuhm-panel button:focus-visible,#tuhm-panel input:focus-visible,#tuhm-panel select:focus-visible{outline:2px solid #f1ce72;outline-offset:2px}
        #tuhm-panel section{padding:12px}#tuhm-panel .tuhm-filters{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}#tuhm-panel label{flex:1;min-width:130px}#tuhm-panel input,#tuhm-panel select{width:100%;background:#252a2e;color:#eee;border:1px solid #806a3e;padding:8px;font-size:16px;border-radius:5px}
        #tuhm-panel .tuhm-table{overflow-x:auto}#tuhm-panel table{width:100%;border-collapse:collapse;text-align:left}#tuhm-panel th,#tuhm-panel td{padding:8px;vertical-align:top;border-bottom:1px solid #3c3930}#tuhm-panel th button{white-space:nowrap}#tuhm-panel td:first-child{min-width:190px}#tuhm-panel small{display:block;color:#c5c5c5;margin-top:4px}#tuhm-panel progress{display:block;max-width:100%;width:140px;accent-color:#d6b65c}#tuhm-panel .tuhm-recs{border:1px solid #806a3e;border-radius:8px;padding:10px;margin:10px 0}#tuhm-panel p{line-height:1.4}`;
    }
    panel=el('section',ctx.mount);panel.id=PANEL;
    const header=el('header',panel);el('strong',header,'Honors & Medals');
    // Manager adds Back / Minimize / Exit and owns drag, resize and saved layout.
    body=el('section',panel);message=el('p',body);message.setAttribute('role','status');
    refreshButton=button(body,'Refresh',refresh);
    const resize=button(body,'↘ Resize',()=>{});resize.title='Drag to resize, or use arrow keys';resize.style.touchAction='none';
    let resizing=null;
    const setSize=(width,height)=>{
      panel.style.width=Math.max(220,Math.min(innerWidth-12,width))+'px';
      panel.style.height=Math.max(120,Math.min(innerHeight-12,height))+'px';clampPanel();
    };
    resize.onpointerdown=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();const r=panel.getBoundingClientRect();resizing={id:e.pointerId,x:e.clientX,y:e.clientY,width:r.width,height:r.height};resize.setPointerCapture(e.pointerId);};
    resize.onpointermove=e=>{if(resizing?.id===e.pointerId)setSize(resizing.width+e.clientX-resizing.x,resizing.height+e.clientY-resizing.y);};
    resize.onpointerup=resize.onpointercancel=()=>{resizing=null;};
    resize.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=panel.getBoundingClientRect();setSize(r.width+(e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0),r.height+(e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0));};
    summary=el('p',body);
    const filters=el('div',body);filters.className='tuhm-filters';
    const label=el('label',filters,'Search');const search=el('input',label);search.type='search';search.value=preferences.query||'';
    search.oninput=()=>{preferences.query=search.value;persist();render();};
    const filter=(key,title,options)=>{
      const label=el('label',filters,title),select=el('select',label);select.dataset.filter=key;
      for(const [value,text] of options){const o=el('option',select,text);o.value=value;}
      select.value=preferences[key]||'all';if(!select.value)select.value='all';
      select.onchange=()=>{preferences[key]=select.value;persist();render();};return select;
    };
    filter('kind','Type',[['all','All types'],['honors','Honors'],['medals','Medals']]);
    filter('status','Status',[['all','All statuses'],['earned','Earned'],['unearned','Unearned'],['trackable','Trackable'],['unknown','Unknown'],['default','Default']]);
    filter('category','Category',[['all','All categories']]);
    const sortSelect=filter('sort','Sort by',[['name','Name'],['kind','Type'],['category','Category'],['status','Status'],['progress','Progress %'],['remaining','Remaining actions'],['date','Earned date']]);
    sortSelect.onchange=()=>{preferences.sort=sortSelect.value;preferences.ascending=!['progress','date'].includes(sortSelect.value);persist();render();};
    button(filters,'Reverse sort',()=>{preferences.ascending=!preferences.ascending;persist();render();});
    recs=el('div',body);recs.className='tuhm-recs';
    const scroll=el('div',body);scroll.className='tuhm-table';scroll.tabIndex=0;scroll.setAttribute('aria-label','Scrollable achievements table');
    const table=el('table',scroll);el('caption',table,'Achievements — select a column to sort');const tr=el('tr',el('thead',table));
    for(const [key,title] of [['name','Achievement'],['kind','Type'],['category','Category'],['status','Status'],['progress','Progress'],['date','Earned (UTC)']]){
      const th=el('th',tr);th.scope='col';th.dataset.sort=key;
      button(th,title,()=>{preferences.ascending=preferences.sort===key?!preferences.ascending:key!=='progress'&&key!=='date';preferences.sort=key;persist();render();});
    }
    tableBody=el('tbody',table);rows=[];updatedAt=0;lastAttempt=0;render();
    window.TUWindowNavigation?.open(PANEL);clampPanel();void refresh();
  }
  function deactivate(){generation++;ctx=null;busy=false;rows=[];identity=null;panel?.remove();panel=null;}
  window.addEventListener('tu-player-updated',()=>{
    if(!ctx)return;
    const next=String(manager()?.getPlayer?.()?.id||'');
    if(next===identity)return;
    generation++;busy=false;rows=[];updatedAt=0;lastAttempt=0;identity=next;render();void refresh();
  });
  const definition={id:ID,version:VERSION,activate,deactivate};
  // Manager emits ready before finishing its synchronous UI initialization.
  const register=()=>queueMicrotask(()=>manager()?.register?.(definition));
  window.addEventListener('torn-utilities-ready',register);register();
})();
