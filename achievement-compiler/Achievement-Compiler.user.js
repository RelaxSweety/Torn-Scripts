// ==UserScript==
// @name         Achievement Compiler (Standalone)
// @namespace    https://github.com/RelaxSweety/Torn-Scripts-Dev
// @version      0.10.0
// @description  Read-only achievements report for RelaxSweety; enter an API key in the tool.
// @match        *://www.torn.com/*
// @match        *://torn.com/*
// @grant        GM_xmlhttpRequest
// @connect      api.torn.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/achievement-compiler/Achievement-Compiler.user.js
// @downloadURL  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/achievement-compiler/Achievement-Compiler.user.js
// ==/UserScript==
(function () {
  'use strict';
  const PLAYER = 4539436;
  const API = 'https://api.torn.com/v2';
  const SCRIPT_VERSION='0.10.0';
  let current = null;
  let dossierPreview = null;
  let careerState = null;
  const button = document.createElement('button');
  button.id = 'achievement-compiler-launcher';
  button.textContent = 'Achievements';
  Object.assign(button.style, {position:'fixed',right:'12px',bottom:'12px',zIndex:'2147483646',padding:'9px',cursor:'pointer'});
  // PDA can inject userscripts before document.body exists. Mount only after DOM readiness.
  function mount() {
    const root = document.body || document.documentElement;
    if (!root) return;
    if (!button.isConnected) root.appendChild(button);
    if (!panel.isConnected) root.appendChild(panel);
  }
  const panel = document.createElement('section');
  Object.assign(panel.style, {display:'none',position:'fixed',right:'12px',bottom:'55px',zIndex:'2147483647',
    width:'min(92vw,520px)',maxHeight:'75vh',overflow:'auto',background:'#20252c',color:'#fff',
    border:'1px solid #777',padding:'16px',font:'14px sans-serif',boxShadow:'0 4px 20px #0009'});
  panel.id = 'achievement-compiler-panel';
  panel.style.boxSizing = 'border-box';
  panel.style.maxWidth = 'calc(100vw - 16px)';
  panel.style.maxHeight = 'min(75dvh, 650px)';
  panel.style.overflowY = 'auto';
  panel.style.touchAction = 'pan-y';
  button.style.setProperty('display','block','important');
  button.style.setProperty('visibility','visible','important');
  button.style.setProperty('opacity','1','important');
  button.style.setProperty('bottom','max(60px, env(safe-area-inset-bottom))','important');
  button.style.setProperty('right','8px','important');
  button.style.setProperty('background','#262d36','important');
  button.style.setProperty('color','#fff','important');
  button.style.setProperty('border','1px solid #aaa','important');
  button.style.setProperty('borderRadius','8px','important');
  function el(tag,text,parent=panel) { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; parent.appendChild(node); return node; }
  const style=document.createElement('style');
  style.textContent=`
  #achievement-compiler-panel {background:#11151d!important;color:#f3f6fc!important;border:2px solid #d5ad5a!important;border-radius:12px!important;box-shadow:0 12px 45px #000e!important;font:600 15px/1.55 system-ui,Arial,sans-serif!important}
  #achievement-compiler-panel h3 {font:900 23px/1.2 system-ui,Arial,sans-serif!important;color:#f3c76d!important;letter-spacing:.5px!important;margin:0 0 10px!important}
  #achievement-compiler-panel p {color:#e7eaf1!important}
  #achievement-compiler-panel input,#achievement-compiler-panel textarea {background:#fff!important;color:#111!important;font:600 15px/1.5 monospace!important;border:2px solid #b6bfcf!important;border-radius:6px!important}
  #achievement-compiler-panel button {background:#f3c76d!important;color:#111!important;border:0!important;border-radius:6px!important;padding:9px 12px!important;font-weight:800!important}
  #achievement-compiler-panel details {border:1px solid #5e687a!important;border-radius:7px!important;padding:8px!important;margin:8px 0!important}
  #achievement-compiler-panel summary {color:#f3c76d!important;font-size:17px!important;font-weight:900!important;cursor:pointer}
  #achievement-compiler-panel .ac-preview {white-space:pre-wrap!important;user-select:text!important;overflow-wrap:anywhere!important;background:#080b10!important;padding:12px!important;border:1px solid #65758a!important;border-radius:8px!important;font:700 14px/1.65 monospace!important;color:#f7f2e7!important}
  `;
  (document.head || document.documentElement).appendChild(style);
  const header=el('h3','ACHIEVEMENT COMPILER v'+SCRIPT_VERSION);
  const info=el('p','Enter your Torn API key below. The key stays in this input during the session; it is not saved or included in exports.');
  const input=el('input');
  input.type='password'; input.placeholder='Torn API key'; input.autocomplete='off';
  Object.assign(input.style,{width:'95%',padding:'8px'});
  const controls=el('div');
  const run=el('button','Compile',controls);
  const exportJson=el('button','Export JSON',controls);
  const exportMd=el('button','Export Markdown',controls);
  const copyProfile=el('button','Copy Profile HTML',controls);
  const close=el('button','Close',controls);
  for(const b of [run,exportJson,exportMd,copyProfile,close])b.style.margin='8px 5px 8px 0';
  const status=el('p','Ready.');
  const diagnostics=el('details');
  el('summary','API Access Diagnostics',diagnostics);
  const diagnosticText=el('pre','Run Compile to inspect key permissions and log access.',diagnostics);
  diagnosticText.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:12px monospace';
  const careerControls=el('details');
  el('summary','Employment History Corrections and Backup',careerControls);
  el('p','Compile first. Add previous employment you personally confirm. Backups contain employment data and are tied to the API account.',careerControls);
  const employerInput=el('input',undefined,careerControls);
  employerInput.placeholder='Previous employer (e.g. Army)';
  employerInput.setAttribute('aria-label','Previous employer');
  const rankInput=el('input',undefined,careerControls);
  rankInput.placeholder='Highest rank or position (optional)';
  rankInput.setAttribute('aria-label','Highest rank or position');
  const companyInput=el('input',undefined,careerControls);
  companyInput.placeholder='Company ID (optional)';
  companyInput.inputMode='numeric';
  companyInput.setAttribute('aria-label','Previous company ID');
  const confirmCareer=el('button','Confirm Previous Employment',careerControls);
  const backupCareer=el('button','Export Employment Backup',careerControls);
  const importCareer=el('input',undefined,careerControls);
  importCareer.type='file';
  importCareer.accept='.json,application/json';
  importCareer.setAttribute('aria-label','Import employment backup');
  const careerStatus=el('p','',careerControls);
  careerStatus.setAttribute('role','status');
  const results=el('div');
  const profileTitle=el('h3','TORN PROFILE HTML');
  const profilePreview=el('div','Compile achievements to generate copy-ready HTML.');
  profilePreview.className='ac-preview';
  const profileText=el('textarea');
  profileText.readOnly=true;
  profileText.rows=10;
  profileText.style.width='100%';
  profileText.style.boxSizing='border-box';
  profileText.setAttribute('aria-label','Torn HTML for profile');
  const htmlEscape = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function formatDate(value){const n=Number(value);const date=Number.isFinite(n)&&n>100000000?new Date(n*1000):new Date(value);if(Number.isNaN(date.getTime()))return 'Date unavailable';return String(date.getUTCDate()).padStart(2,'0')+'/'+String(date.getUTCMonth()+1).padStart(2,'0')+'/'+date.getUTCFullYear();}
  function chronologicalAwards(data) {
    return data.awards.filter(a=>a.earned).slice().sort((a,b)=>{
      const x=Number(a.earned_at),y=Number(b.earned_at);
      const xd=Number.isFinite(x)&&x>0,yd=Number.isFinite(y)&&y>0;
      if(xd!==yd)return xd?-1:1;
      if(xd&&x!==y)return x-y;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  const pick=(o,...keys)=>keys.reduce((v,k)=>v==null?undefined:v[k],o);
  const STANDARD_JOBS = {
    army: 'Torn Army', grocer: 'Grocer', casino: 'Casino', medical: 'Medical',
    law: 'Law', education: 'Education'
  };
  const REFERENCE_CORRECTIONS = [{
    employer: 'Torn Army', standard_job: 'army', highest_recorded_rank: 'Sergeant',
    note: 'Player confirmed Army was their only employer before joining their current company.'
  }];
  const textValue = value => typeof value === 'string' && value.trim() ? value.trim() : null;
  const positiveId = value => ['number','string'].includes(typeof value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const standardJob = name => {
    const key = textValue(name)?.toLowerCase().replace(/^torn /, '');
    return Object.hasOwn(STANDARD_JOBS, key) ? key : null;
  };
  function careerJob(payload, companyTypes = [], legacy = false) {
    const job = payload?.job;
    if (job === null) return {kind:'unemployed', employer:null, position:null};
    const name = textValue(job?.name ?? job?.company?.name ?? job?.employer);
    if (!name) return null;
    const companyId = positiveId(job.type === 'company' ? job.id ?? job.company_id : job.company_id ?? job.company?.id);
    const typeId = positiveId(job.type_id ?? job.company_type_id);
    const standard = job.type === 'company' || companyId || job.kind === 'company' ? null : standardJob(job.standard_job ?? name);
    return {
      kind: standard ? 'standard' : job.type === 'company' || companyId || job.kind === 'company' ? 'company' : legacy ? 'unknown' : null,
      employer: standard ? STANDARD_JOBS[standard] : name,
      position: textValue(job.position),
      standard_job: standard,
      company_id: companyId,
      company_type_id: typeId,
      company_type: textValue((Array.isArray(companyTypes) ? companyTypes : []).find(type => positiveId(type.id) === typeId)?.name ?? job.company_type),
      days_in_company: Number.isInteger(job.days_in_company) && job.days_in_company >= 0 ? job.days_in_company : null
    };
  }
  const careerKey = player => 'achievement-compiler-career-history-' + player;
  const validTimestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString() : null;
  function sameEmployer(a, b) {
    if (!a || !b) return false;
    if (a.kind === 'unemployed' || b.kind === 'unemployed') return a.kind === b.kind;
    if (a.company_id && b.company_id) return a.company_id === b.company_id;
    if (a.kind !== b.kind && ![a.kind, b.kind].includes('unknown')) return false;
    return a.employer?.toLowerCase() === b.employer?.toLowerCase();
  }
  function cleanCorrection(value) {
    const employer = textValue(value?.employer);
    if (!employer) return null;
    const standard = value.company_id ? null : standardJob(value.standard_job ?? employer);
    return {
      employer: standard ? STANDARD_JOBS[standard] : employer,
      standard_job: standard, company_id: positiveId(value.company_id),
      highest_recorded_rank: textValue(value.highest_recorded_rank),
      position: textValue(value.position), note: textValue(value.note)
    };
  }
  function cleanLogEvent(value) {
    const occurredAt = validTimestamp(value?.occurred_at);
    const employer = textValue(value?.employer);
    const id = textValue(value?.id);
    if (!occurredAt || !employer || !id || !['joined','left','promoted'].includes(value.action)) return null;
    const companyId = positiveId(value.company_id);
    const standard = companyId ? null : standardJob(value.standard_job ?? employer);
    return {
      id, action:value.action, occurred_at:occurredAt, employer:standard ? STANDARD_JOBS[standard] : employer,
      company_id:companyId, standard_job:standard, position:textValue(value.position)
    };
  }
  function readCareerState(raw) {
    const observations = (Array.isArray(raw?.observations) ? raw.observations : Array.isArray(raw?.events) ? raw.events : [])
      .flatMap(entry => {
        const first = validTimestamp(entry?.first_observed_at ?? entry?.observed_at);
        const last = validTimestamp(entry?.last_observed_at ?? entry?.observed_at);
        const job = entry?.kind === 'unemployed' ? careerJob({job:null}) : careerJob({job:entry}, [], true);
        return first && last && first <= last && job?.kind
          ? [{...job, first_observed_at:first, last_observed_at:last}] : [];
      });
    return {
      observations: mergeObservations(observations),
      faction_events:(Array.isArray(raw?.faction_events) ? raw.faction_events : []).map(cleanFactionEvent).filter(Boolean),
      corrections: (Array.isArray(raw?.corrections) ? raw.corrections : []).map(cleanCorrection).filter(Boolean),
      verified_events: (Array.isArray(raw?.verified_events) ? raw.verified_events : []).map(cleanLogEvent).filter(Boolean)
    };
  }
  function mergeObservations(observations) {
    const merged = [];
    for (const entry of observations.slice().sort((a,b) => a.first_observed_at.localeCompare(b.first_observed_at))) {
      const previous = merged.at(-1);
      if (sameEmployer(previous, entry) && previous.position === entry.position) {
        merged[merged.length - 1] = {
          ...previous, ...entry, kind:entry.kind === 'unknown' ? previous.kind : entry.kind,
          company_id:entry.company_id ?? previous.company_id,
          company_type_id:entry.company_type_id ?? previous.company_type_id,
          company_type:entry.company_type ?? previous.company_type,
          first_observed_at:previous.first_observed_at,
          last_observed_at:[previous.last_observed_at,entry.last_observed_at].sort().at(-1)
        };
      } else merged.push(entry);
    }
    return merged;
  }
  function mergeCareerState(a, b) {
    const entries = values => [...new Map(values.map(value => [JSON.stringify(value),value])).values()];
    return {
      observations:mergeObservations([...a.observations, ...b.observations]),
      faction_events:[...new Map([...(a.faction_events ?? []),...(b.faction_events ?? [])].map(event => [event.id,event])).values()],
      corrections:entries([...a.corrections,...b.corrections]),
      verified_events:[...new Map([...a.verified_events,...b.verified_events].map(event => [event.id,event])).values()]
    };
  }
  function employmentAction(title) {
    return textValue(title)?.toLowerCase().match(/^(?:job|company) (join(?:ed)?|leave|left|quit|fired|promote(?:d)?|promotion)$/);
  }
  function employmentLog(entry) {
    // Only use explicit, attributable events. Log data fields are dynamic in the API schema.
    const match = employmentAction(entry?.details?.title);
    if (!match) return null;
    const data = entry.data ?? {};
    const companyId = positiveId(data.company_id ?? data.company?.id ?? data.company);
    const standard = standardJob(data.job?.name ?? data.job_name ?? data.job);
    const employer = standard ? STANDARD_JOBS[standard] : textValue(data.company?.name ?? data.company_name)
      ?? (companyId ? 'Company #' + companyId : null);
    const date = new Date(Number(entry.timestamp) * 1000);
    return cleanLogEvent({
      id:String(entry.id ?? ''), employer, company_id:companyId, standard_job:standard,
      action:match[1].startsWith('join') ? 'joined' : ['leave','left','quit','fired'].includes(match[1]) ? 'left' : 'promoted',
      position:data.position?.name ?? data.position ?? data.rank,
      occurred_at:Number.isFinite(date.getTime()) && Number(entry.timestamp) > 0 ? date.toISOString() : null
    });
  }
  function factionAction(title) {
    const match = textValue(title)?.toLowerCase().match(/^faction (join(?:ed)?|leave|left|quit|kicked|separation)$/);
    return match ? match[1].startsWith('join') ? 'joined' : 'left' : null;
  }
  function cleanFactionEvent(value) {
    const factionId = positiveId(value?.faction_id);
    const occurredAt = validTimestamp(value?.occurred_at);
    const id = textValue(value?.id);
    if (!factionId || !occurredAt || !id || !['joined','left'].includes(value.action)) return null;
    return {id, faction_id:factionId, faction_name:textValue(value.faction_name), action:value.action, occurred_at:occurredAt};
  }
  function factionLog(entry) {
    const action = factionAction(entry?.details?.title);
    if (!action) return null;
    const data = entry.data ?? {};
    const date = new Date(Number(entry.timestamp)*1000);
    return cleanFactionEvent({
      id:String(entry.id ?? ''), action, faction_id:data.faction_id ?? data.faction?.id ?? data.faction,
      faction_name:data.faction_name ?? data.faction?.name,
      occurred_at:Number.isFinite(date.getTime()) && Number(entry.timestamp) > 0 ? date.toISOString() : null
    });
  }
  function normalizeFactions(data, events) {
    const membership = data.faction?.faction;
    const currentId = positiveId(membership?.id);
    const groups = new Map();
    function group(id) {
      if (!groups.has(id)) groups.set(id,{faction_id:id,faction_name:null,stints:[]});
      return groups.get(id);
    }
    for (const event of events.slice().sort((a,b) => a.occurred_at.localeCompare(b.occurred_at))) {
      const faction = group(event.faction_id);
      faction.faction_name = event.faction_name ?? faction.faction_name;
      const last = faction.stints.at(-1);
      if (event.action === 'joined') {
        if (last?.joined_at === event.occurred_at) continue;
        faction.stints.push({joined_at:event.occurred_at,separated_at:null,source:'torn_faction_log'});
      } else if (last?.joined_at && !last.separated_at) {
        last.separated_at=event.occurred_at;
      } else if (last?.separated_at !== event.occurred_at) {
        faction.stints.push({joined_at:null,separated_at:event.occurred_at,source:'torn_faction_log'});
      }
    }
    if (currentId) {
      const faction = group(currentId);
      faction.faction_name=textValue(membership.name) ?? faction.faction_name;
      const last = faction.stints.at(-1);
      const current = last?.joined_at && !last.separated_at
        ? last : {joined_at:null,separated_at:null,source:'torn_current_faction'};
      current.current=true;
      current.api_reported_days=Number.isInteger(membership.days_in_faction) && membership.days_in_faction >= 0
        ? membership.days_in_faction : null;
      if (current !== last) faction.stints.push(current);
    }
    return {
      history_complete:false,
      coverage:events.length ? 'Recognized membership events from available logs; lifetime coverage unknown.'
        : 'No attributable faction membership events were available.',
      factions:[...groups.values()].map(faction => {
        const stints = faction.stints.map(stint => {
          const end = stint.current ? data.generated_at : stint.separated_at;
          const elapsed = stint.joined_at && end ? (Date.parse(end)-Date.parse(stint.joined_at))/86400000 : null;
          const exact = Number.isFinite(elapsed) && elapsed >= 0;
          const apiDays = stint.api_reported_days ?? null;
          // A logged join may belong to an older stint if a later separation was outside log coverage.
          const consistent = !stint.current || apiDays === null || !exact || Math.abs(Math.floor(elapsed)-apiDays) <= 1;
          return {
            ...stint, joined_at:consistent ? stint.joined_at : null,
            days_served:exact && consistent ? elapsed : stint.current ? apiDays : null,
            duration_source:exact && consistent ? 'log_dates' : stint.current && apiDays !== null ? 'days_in_faction' : null,
            date_conflict:consistent ? null : 'Logged join disagrees with current API tenure.'
          };
        });
        const known = stints.filter(stint => stint.days_served !== null);
        return {
          ...faction, stints, total_known_days_served:known.length ? known.reduce((sum,stint) => sum+stint.days_served,0) : null,
          total_time_complete:false
        };
      })
    };
  }
  function factionDossier(history) {
    const factions = history?.factions ?? [];
    return Object.fromEntries(factions.map(faction => [
      (faction.faction_name ?? 'Faction')+' ['+faction.faction_id+']', [
        ...faction.stints.map(stint => 'Joined: '+(stint.joined_at ? formatDate(stint.joined_at) : 'Unknown')
          +' | Separated: '+(stint.current ? 'Current member' : stint.separated_at ? formatDate(stint.separated_at) : 'Unknown')
          +' | Time served: '+(stint.days_served === null ? 'Unknown' : Number(stint.days_served.toFixed(2))+' days')),
        'Total documented time served: '+(faction.total_known_days_served === null ? 'Unknown' : Number(faction.total_known_days_served.toFixed(2))+' days')
      ].join('\n')
    ]).concat([['Coverage',history?.coverage ?? 'Unavailable']]));
  }
  function normalizeCareer(data, prior, player) {
    const pointTypes = Array.isArray(data.jobpoints?.jobpoints?.companies)
      ? data.jobpoints.jobpoints.companies.map(entry => entry.company).filter(Boolean) : [];
    const companyTypes = Array.isArray(data.company_types?.companies) ? data.company_types.companies : [];
    const job = careerJob(data.job, [...companyTypes, ...pointTypes]);
    const current = job?.kind ? job : null;
    const observation = current && validTimestamp(data.generated_at)
      ? {...current, first_observed_at:data.generated_at,last_observed_at:data.generated_at} : null;
    const membershipEntries=[...(data.logs?.log ?? []),...(data.membership_logs?.log ?? [])];
    const state = mergeCareerState(prior, {
      observations:observation ? [observation] : [], corrections:[],
      faction_events:membershipEntries.map(factionLog).filter(Boolean),
      verified_events:membershipEntries.map(employmentLog).filter(Boolean)
    });
    const corrections = mergeCareerState({
      observations:[], corrections:player === PLAYER ? REFERENCE_CORRECTIONS.map(cleanCorrection) : [], verified_events:[]
    },state).corrections;
    const ranks = data.jobranks?.jobranks ?? null;
    const points = data.jobpoints?.jobpoints ?? null;
    const stints = [];
    const transitions = [];
    const conflicts = [];
    for (const entry of state.observations) {
      const previous = stints.at(-1);
      if (previous && sameEmployer(previous, entry)) {
        if (previous.position && entry.position && previous.position !== entry.position) transitions.push({
          type:'position_change', employer:entry.employer, company_id:entry.company_id,
          from:previous.position, to:entry.position, observed_at:entry.first_observed_at
        });
        Object.assign(previous, {
          ...entry, position:entry.position ?? previous.position,
          company_id:entry.company_id ?? previous.company_id,
          company_type_id:entry.company_type_id ?? previous.company_type_id,
          company_type:entry.company_type ?? previous.company_type,
          first_observed_at:previous.first_observed_at
        });
      } else {
        if (previous) transitions.push({
          type:'employer_change', from:previous.employer, from_company_id:previous.company_id ?? null,
          to:entry.employer, to_company_id:entry.company_id ?? null, observed_at:entry.first_observed_at
        });
        stints.push({...entry});
      }
    }
    const record = (entry,status,sources) => ({
      ...entry, status, employment_status:'Former', evidence_sources:sources,
      confidence:status === 'confirmed' ? 'verified' : status === 'observed' ? 'snapshot' : 'player_attested',
      start_date:entry.start_date ?? null, end_date:entry.end_date ?? null
    });
    const previous = stints.slice(0,-1).filter(entry => entry.kind !== 'unemployed')
      .map(entry => record(entry,'observed',['compiler_snapshot']));
    const open = [];
    const verified = state.verified_events.slice().sort((a,b) => a.occurred_at.localeCompare(b.occurred_at));
    for (const event of verified) {
      const entry = {...event, kind:event.standard_job ? 'standard' : 'company'};
      const index = open.findIndex(item => sameEmployer(item,entry));
      if (event.action === 'joined') {
        if (index === -1) open.push(entry);
      } else if (event.action === 'left') {
        const start = index < 0 ? null : open.splice(index,1)[0];
        const match = previous.find(item => sameEmployer(item,entry) && item.first_observed_at
          && item.last_observed_at <= event.occurred_at && (!start || item.first_observed_at >= start.occurred_at)
          && item.status === 'observed');
        const {employer,company_id,standard_job,position,kind} = entry;
        const verifiedRecord = record({
          ...(match ?? {}), employer:match?.employer ?? employer, company_id, standard_job, kind,
          position:position ?? match?.position ?? start?.position ?? null,
          start_date:start?.occurred_at ?? null, end_date:event.occurred_at
        },'confirmed',[...(match?.evidence_sources ?? []),'torn_employment_log']);
        if (match) previous[previous.indexOf(match)] = verifiedRecord;
        else previous.push(verifiedRecord);
      }
    }
    for (const correction of corrections) {
      const entry = {...correction, kind:correction.standard_job ? 'standard' : correction.company_id ? 'company' : 'unknown'};
      const match = previous.find(item => sameEmployer(item,entry));
      if (sameEmployer(current,entry) && !match) {
        conflicts.push('Player reports prior service at ' + entry.employer + ', also the current employer. A separate stint is player-attested.');
      }
      if (match) {
        if (!match.evidence_sources.includes('player_confirmation')) match.evidence_sources.push('player_confirmation');
        if (match.status !== 'confirmed') {
          match.status = 'user_confirmed';
          match.confidence = 'player_attested';
        }
        match.highest_recorded_rank = correction.highest_recorded_rank ?? match.highest_recorded_rank;
      } else previous.push(record(entry,'user_confirmed',['player_confirmation']));
    }
    for (const entry of previous) {
      if (!entry.standard_job) continue;
      const rank = ranks?.[entry.standard_job] ?? null;
      entry.remaining_points = points?.jobs?.[entry.standard_job] ?? null;
      entry.highest_recorded_rank ??= rank ?? entry.position ?? null;
      entry.api_reported_rank = rank;
      if (rank != null || entry.remaining_points != null) entry.evidence_sources.push('api_progression');
      if (rank && entry.evidence_sources.includes('player_confirmation') && entry.highest_recorded_rank && rank !== entry.highest_recorded_rank)
        conflicts.push(entry.employer + ': player-confirmed rank differs from API rank.');
    }
    const endpoint = (name, field) => data.unavailable_sources?.[name]
      ? {status:'failed', error:data.unavailable_sources[name]}
      : {status:data[field ?? name] === undefined ? 'unavailable' : 'success'};
    const promotions = verified.filter(event => event.action === 'promoted')
      .map(event => ({...event, status:'confirmed', evidence_sources:['torn_employment_log']}));
    const standardProgression = Object.fromEntries(Object.keys(STANDARD_JOBS).map(job => {
      const rank = ranks?.[job] ?? null;
      const balance = points?.jobs?.[job] ?? null;
      const evidence = previous.find(entry => entry.standard_job === job);
      return [job,{
        rank, points:balance,
        classification:evidence?.status ?? (current?.standard_job === job ? 'confirmed' : rank !== null || balance !== null ? 'unverified' : 'not_established'),
        previous_employment:evidence?.status ?? 'not_established',
        baseline_status:balance === 5 && !evidence && current?.standard_job !== job ? 'possible_baseline_not_verified' : null
      }];
    }));
    const companyPoints = Array.isArray(points?.companies) ? points.companies : [];
    const last = state.observations.at(-1);
    return {
      state,
      faction_history:normalizeFactions(data,state.faction_events),
      career_history:{
        current:current && current.kind !== 'unemployed' ? {
          ...current, status:'confirmed', employment_status:'Current',
          evidence_sources:['torn_current_job'], confidence:'verified',
          first_observed_at:stints.at(-1)?.first_observed_at ?? last?.first_observed_at ?? null,
          last_observed_at:last?.last_observed_at ?? null, start_date:null,end_date:null
        } : null,
        current_employment_status:current?.kind === 'unemployed' ? 'unemployed' : current ? 'employed' : 'unavailable',
        previous_employment:previous, observed_transitions:transitions, historical_promotions:promotions,
        history_complete:false
      },
      job_progression:{
        standard_job_ranks:ranks, standard_job_points:points?.jobs ?? null, standard_jobs:standardProgression,
        company_job_points:companyPoints.map(entry => ({
          company_type_id:positiveId(entry.company?.id), company_type:textValue(entry.company?.name),
          points:entry.points ?? null, classification:'unverified'
        })),
        raw_job_points:points
      },
      career_diagnostics:{
        endpoints:{job:endpoint('job'), jobranks:endpoint('jobranks'), jobpoints:endpoint('jobpoints'),
          company_types:endpoint('company_types'), logs:endpoint('logs'), membership_logs:endpoint('membership_logs')},
        historical_coverage:{
          history_complete:false, log_pages:data.logs?.pages_fetched ?? 0,
          recognized_employment_events:verified.length,
          targeted_log_pages:data.membership_logs?.pages_fetched ?? 0,
          first_observed_at:state.observations[0]?.first_observed_at ?? null,
          last_observed_at:last?.last_observed_at ?? null
        },
        missing_information:[
          'Torn documents five starting points on first hire. The API does not document how it fills never-held jobs, and ranks and balances alone do not establish employment.',
          'Service dates remain unknown unless explicitly supported by attributable employment logs.',
          ...(!data.logs && !data.membership_logs ? ['Historical log access was unavailable.'] : []),
          ...(!current ? ['Current employment was unavailable.'] : []),
          ...(!player ? ['Account identity could not be verified; employment history was not saved.'] : []),
          ...(data.unavailable_sources?.legacy_career_storage ? [data.unavailable_sources.legacy_career_storage] : []),
          ...(data.unavailable_sources?.career_history_storage ? ['The saved employment history could not be read.'] : [])
        ],
        conflicting_evidence:conflicts, user_confirmed_corrections:corrections,
        log_access:data.api_diagnostics?.log_probe ?? null
      }
    };
  }
  function employmentDossier(data) {
    const career = data.career_history ?? {};
    const current = career.current;
    function evidenceLabel(entry) {
      const labels = {
        player_confirmation:'Player Confirmed', api_progression:'API rank/points',
        compiler_snapshot:'Compiler Snapshot', torn_employment_log:'Torn Employment Log'
      };
      return entry.evidence_sources.map(source => labels[source] ?? source).join(' + ');
    }
    return {
      'Current employment':current ? [
        current.employer, current.position && 'Position: '+current.position,
        current.company_id && 'Company ID: '+current.company_id,
        current.company_type && 'Company Type: '+current.company_type,
        current.days_in_company != null && current.days_in_company+' days at export'
      ].filter(Boolean).join('\n') : career.current_employment_status === 'unemployed' ? 'Unemployed' : 'Unavailable',
      'Previous employment':career.previous_employment?.map(entry => [
        entry.employer, entry.highest_recorded_rank && 'Highest Recorded Rank: '+entry.highest_recorded_rank,
        !entry.highest_recorded_rank && entry.position && 'Position: '+entry.position,
        entry.remaining_points != null && 'Remaining Points: '+entry.remaining_points,
        'Service Dates: '+(entry.start_date || entry.end_date
          ? [entry.start_date,entry.end_date].map(date => date ? formatDate(date) : 'Unknown').join(' to ') : 'Unknown'),
        'Evidence: '+evidenceLabel(entry)
      ].filter(Boolean).join('\n')).join('\n\n') || 'No previous employment established',
      'Other standard jobs':Object.keys(STANDARD_JOBS).some(job =>
        !career.previous_employment?.some(entry => entry.standard_job === job))
        ? 'No previous employment established' : 'All standard jobs represented above',
      'History completeness':data.career_diagnostics?.endpoints?.logs?.status === 'failed' && data.career_diagnostics?.endpoints?.membership_logs?.status !== 'success'
        ? 'Partial — historical log access unavailable' : 'Partial'
    };
  }
  function dossier(d){
    const p=pick(d,'personalstats','personalstats')||{};
    const profile=d.profile?.profile||d.profile||{};
    const basic=d.basic?.basic||d.basic||{};
    const work=d.workstats?.workstats||d.workstats||{};
    const prop=d.property?.property||d.property||{};
    const fac=profile.faction||d.faction?.faction||d.faction||{};
    const name=prop.property?.name||prop.name||prop.property_name||prop.type||profile.property?.name||null;
    const island=name&&/private island/i.test(name);
    const address=name?(island?'1 Cartel Cove, Sovereign Isle, Torn City':'4539 Cartel Avenue, Torn City'):null;
    const aw=d.awards.filter(a=>a.earned);
    const history=d.history||{};
    const enemies=d.enemies?.list??d.enemies?.enemies;
    const enemyTotal=d.enemies?._metadata?.total??(Array.isArray(enemies)?enemies.length:null);
    const logs=d.logs?.log??d.logs?.logs;
    const logEntries=Array.isArray(logs)?logs:Object.values(logs||{});
    const mugLogs=logEntries.filter(x=>/attack mug/i.test(String(x.details?.title??x.title??'')));
    const largestLogMug=mugLogs.reduce((best,x)=>Number(x.data?.money_mugged||0)>Number(best?.data?.money_mugged||0)?x:best,null);
    const edu=d.education?.education||d.education||{};
    const eduCatalog=d.education_catalog?.education||d.education_catalog||[];
    const rawCompleted=edu.complete??edu.completed??edu.education_completed??[];
    const completed=Array.isArray(rawCompleted)?rawCompleted:Object.keys(rawCompleted||{});
    const categories=Array.isArray(eduCatalog)?eduCatalog:Object.values(eduCatalog||{});
    const courseIndex=new Map();
    for(const category of categories){
      if(!category||typeof category!=='object')continue;
      const entries=Array.isArray(category.courses)?category.courses:Object.values(category.courses||{});
      for(const course of entries)if(course&&course.id!=null)courseIndex.set(String(course.id),course);
    }
    const courseId=v=>v&&typeof v==='object'?(v.id??v.course_id):v;
    const courseName=v=>{
      const id=courseId(v);
      const c=courseIndex.get(String(id));
      return c?.name??c?.title??('Course #'+id);
    };
    const completedNames=completed.map(courseName);
    const currentCourse=edu.current??edu.education_current??null;
    const currentId=courseId(currentCourse);
    const currentName=currentId!=null&&String(currentId)!=='0'?courseName(currentId):null;
    const currentUntil=currentCourse&&typeof currentCourse==='object'?currentCourse.until:null;
    const missionCount=p.missions?.missions??null;
    const groups={
      'Identity & personal life':{
        'Player ID':d.player_id,'Level':profile.level??basic.level,'Rank':profile.rank??basic.rank,
        'Account age (days)':profile.age??basic.age,
        'Marital status':profile.spouse?.status??profile.marital_status??profile.married,
        'Spouse':profile.spouse?.name??profile.spouse_name??profile.spouse?.player_name,
        'Spouse ID':profile.spouse?.id??profile.spouse_id,
        'Best activity streak (days)':p.other?.activity?.streak?.best},
      'Residence':{'Property':name,'Ownership / rental':prop.status==='rented'||prop.rented_by?'Rented':d.player_id && (prop.owner?.id===d.player_id||prop.owner_id===d.player_id)?'Owned':null,
        'Fictional address (not API data)':address},
      'Combat':{'Attacks won':p.attacking?.attacks?.won,'Attacks lost':p.attacking?.attacks?.lost,
        'Best kill streak':p.attacking?.killstreak?.best,'Best damage':p.attacking?.damage?.best,
        'Critical hits':p.attacking?.hits?.critical,'Stealth attacks':p.attacking?.attacks?.stealth,
        'Total mugged ($)':p.attacking?.networth?.money_mugged,
        'Largest mug ($)':p.attacking?.networth?.largest_mug,
        'Muggings in retrieved logs (not lifetime)':d.logs?mugLogs.length:null,'Largest mug in retrieved logs ($)':largestLogMug?.data?.money_mugged??null,'Largest logged mug date (UTC)':largestLogMug?.timestamp?formatDate(largestLogMug.timestamp):null,'Confirmed kills':null,'Enemies (profile count)':profile.enemies??enemyTotal,
        'Strength':p.battle_stats?.strength,'Defense':p.battle_stats?.defense,
        'Speed':p.battle_stats?.speed,'Dexterity':p.battle_stats?.dexterity},
      'Crime & consumption':{'Crimes committed':p.crimes?.total??p.crimes?.offenses?.total,
        'Organized crimes (recorded)':p.crimes?.offenses?.organized_crimes,
        'Xanax used':p.drugs?.xanax,'Alcohol consumed':p.items?.used?.alcohol,
        'E-DVD used':null,'Rehabs':p.drugs?.rehabilitations?.amount,
        'Times jailed':p.jail?.times_jailed,'Missions completed':missionCount,'Duke contracts':p.missions?.contracts?.duke},
      'Faction & military':{'Current faction':fac.name,'Faction ID':fac.id,
        'Faction respect earned':p.attacking?.faction?.respect,
        'Ranked war hits':p.attacking?.faction?.ranked_war_hits,
        'Ranked war wins':p.other?.ranked_war_wins,
        'Wars personally fought':null},
      'Employment history':employmentDossier(d),
      'Faction history':factionDossier(d.faction_history),
      'Work stats & education':{
        'Manual labor':work.manual_labor??work.manual??p.jobs?.stats?.manual,
        'Intelligence':work.intelligence??p.jobs?.stats?.intelligence,
        'Endurance':work.endurance??p.jobs?.stats?.endurance,
        'Completed courses':d.education?completed.length:null,'Education history':d.education?completedNames.join('; '):null,'Current education':currentName,'Current education ends (UTC)':currentUntil?formatDate(currentUntil):null,'Education completion dates':'Not provided by education selection'},
      'Wealth & trading':{'Net worth ($)':p.networth?.total,
        'Item market revenue ($)':p.trading?.item_market?.revenue,
        'Item market sales':p.trading?.item_market?.sales,
        'Bank profit ($)':p.investments?.bank?.profit,
        'Stock net profits ($)':p.investments?.stocks?.net_profits},
      'Travel & racing':{'Flights':p.travel?.total,'Time abroad (seconds)':p.travel?.time_spent,
        'Races entered':p.racing?.races?.entered,'Races won':p.racing?.races?.won},
      'Medical':{'Hospitalizations':p.hospital?.times_hospitalized,
        'Overdoses':p.drugs?.overdoses,'Medical items used':p.hospital?.medical_items_used,
        'Revives received':p.hospital?.reviving?.revives_received},
      'Awards & progression':{'Earned awards':aw.length,
        'Honors':aw.filter(a=>a.type==='honor').length,
        'Medals':aw.filter(a=>a.type==='medal').length,
        'First dated award':chronologicalAwards(d)[0]?.name,
        'Most recent dated award':chronologicalAwards(d).filter(a=>a.earned_at).slice(-1)[0]?.name,'Previous snapshots tracked':history.previous_snapshots??0,'New awards since last snapshot':history.new_awards??null,'Net worth change since last snapshot ($)':history.networth_change??null}
    };
    return groups;
  }
  function dossierText(d){
    return Object.entries(dossier(d)).flatMap(([title,items])=>[
      '=== '+title.toUpperCase()+' ===',
      ...Object.entries(items).map(([k,v])=>k+': '+(v===null||v===undefined?'Not available':String(v))), ''
    ]).join('\\n');
  }
  function signature(data){
    const earned=chronologicalAwards(data);
    const rows=earned.map((a,i)=>{
      const date=a.earned_at?formatDate(a.earned_at):'Unknown';
      return '<tr style="background-color:#000000;color:#00FF66;">'
        +'<td style="padding:1px 3px;white-space:nowrap;border-bottom:1px solid #123B20;">'+htmlEscape(date)+'</td>'
        +'<td style="padding:1px 3px;border-bottom:1px solid #123B20;">'+htmlEscape(a.type.toUpperCase())+'</td>'
        +'<td style="padding:2px 4px;"><strong>'+htmlEscape(a.name)+'</strong></td>'
        +'<td style="padding:1px 3px;border-bottom:1px solid #123B20;">'+htmlEscape(a.description)+'</td></tr>';
    });
    return ['<pre style="background:#000;color:#00FF66;font:9px/1.2 monospace;white-space:pre-wrap;">'+htmlEscape(dossierText(data))+'</pre>', '<div style="text-align:center;">',
      '<p><strong>RELAXSWEETY — ACCOMPLISHMENT LEDGER</strong></p>',
      '<p>'+earned.length+' earned honors and medals | Oldest to newest</p>',
      '</div>',
      '<table style="width:100%;border-collapse:collapse;background-color:#000000;color:#00FF66;font-family:Courier New,monospace;font-size:9px;line-height:1.1;">',
      '<thead><tr style="background-color:#061B0B;color:#7CFF9A;"><th>Date</th><th>Type</th><th>Accomplishment</th><th>Description</th></tr></thead>',
      '<tbody>',...rows,'</tbody></table>',
      '<p style="font-size:9px;">Unknown dates are listed last. Dates use DD/MM/YYYY (UTC).</p>'].join('\n');
  }
  function renderSignature(){
    if(!current)return;
    // Keep the PDA UI light: don't duplicate the entire HTML table in the live DOM.
    profileText.value=signature(current);
    const earned=chronologicalAwards(current);
    const dated=earned.filter(a=>a.earned_at).length;
    profilePreview.textContent=earned.length+' earned accomplishments ready to copy. '+dated+
      ' have recorded dates; '+(earned.length-dated)+' have unknown dates. Full ledger is in the HTML field below.';
  }
  copyProfile.onclick=async()=>{
    if(!current){status.textContent='Compile achievements first.';return;}
    profileText.focus();profileText.select();
    try{await navigator.clipboard.writeText(profileText.value);status.textContent='Profile HTML copied.';}
    catch{status.textContent='Select the HTML field and use Copy from the PDA selection menu.';}
  };
  button.onclick=()=>{panel.style.display=panel.style.display==='none'?'block':'none';};
  close.onclick=()=>{panel.style.display='none';input.value='';};
  function request(path,key) {
    const url = API + path;
    const headers = {Authorization: 'ApiKey ' + key, Accept:'application/json'};
    const parse = (status, body) => {
      let data;
      try { data = JSON.parse(body); } catch { throw new Error('Invalid JSON response'); }
      if (data.error) throw new Error('Torn API error '+data.error.code+': '+data.error.error);
      if (status < 200 || status >= 300) throw new Error('HTTP '+status);
      return data;
    };
    // Native Torn PDA HTTP bridge is more reliable than GM shims on mobile.
    if (typeof PDA_httpGet === 'function') {
      return Promise.resolve(PDA_httpGet(url,headers)).then(r=>parse(r.status,r.responseText));
    }
    if (typeof GM_xmlhttpRequest === 'function') {
      return new Promise((resolve,reject)=>GM_xmlhttpRequest({
        method:'GET',url,headers,timeout:25000,
        onload:r=>{try{resolve(parse(r.status,r.responseText));}catch(e){reject(e);}},
        ontimeout:()=>reject(new Error('Request timed out')),
        onerror:()=>reject(new Error('Network request failed'))
      }));
    }
    return fetch(url,{headers}).then(async r=>parse(r.status,await r.text()));
  }
  function list(payload,name) {
    const raw=payload[name]??payload;
    if(Array.isArray(raw))return raw.map(v=>typeof v==='object'?v:{id:v});
    if(raw&&typeof raw==='object')return Object.entries(raw).map(([id,v])=>({id,...(v&&typeof v==='object'?v:{value:v})}));
    return [];
  }
  const id=a=>String(a.id??a.honor_id??a.medal_id??'');
  function compile(earned,catalog,name) {
    const owned=list(earned,name),all=list(catalog,name);
    const ownedIds=new Set(owned.map(id));
    const known=new Set(all.map(id));
    const output=all.map(a=>{
      const e=owned.find(x=>id(x)===id(a))||{};
      return {type:name.slice(0,-1),id:id(a),name:a.name??e.name??'Unknown',
        description:a.description??e.description??'',earned:ownedIds.has(id(a)),
        earned_at:e.earned_at??e.timestamp??e.awarded_at??null};
    });
    for(const a of owned)if(!known.has(id(a)))output.push({type:name.slice(0,-1),id:id(a),name:a.name??'Unknown',description:'',earned:true,earned_at:null});
    return output.sort((a,b)=>Number(b.earned)-Number(a.earned)||a.name.localeCompare(b.name));
  }
  function markdown(data) {
    const done=data.awards.filter(x=>x.earned),todo=data.awards.filter(x=>!x.earned);
    let lines=['# RelaxSweety Achievement Compiler','', 'Generated: '+data.generated_at,'',
      'Completed: '+done.length+' | Not earned: '+todo.length,'',
      'Dates are included only when provided by the API.',''];
    lines.push('## Player dossier','', '```text',dossierText(data),'```','');
    for(const [heading,items] of [['Completed',done],['Not yet earned',todo]]){
      lines.push('## '+heading,'');
      for(const a of items)lines.push('- **'+a.name+'** ('+a.type+', '+a.id+') — '+a.description+(a.earned_at?' | '+formatDate(a.earned_at):''));
      lines.push('');
    }
    return lines.join('\n');
  }
  function download(name,body,mime) {
    const url=URL.createObjectURL(new Blob([body],{type:mime}));
    const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function collectLogPages(page,key) {
    const seen=new Map();
    let pagesFetched=0;
    for (;pagesFetched<5;) {
      if (!Array.isArray(page?.log)) throw new Error('Unexpected user/log response; expected a log array');
      for (const entry of page.log) if (entry?.id != null) seen.set(entry.id,entry);
      pagesFetched++;
      const prev=page._metadata?.links?.prev;
      if (!prev || pagesFetched===5) break;
      const url=new URL(prev,API);
      if (url.origin!=='https://api.torn.com' || url.pathname!=='/v2/user/log') break;
      page=await request(url.pathname.replace(/^\/v2/, '')+url.search,key);
    }
    return {log:[...seen.values()],pages_fetched:pagesFetched,partial_history:true,history_note:'Up to 5 pages; lifetime coverage unknown'};
  }
  function updateEmployment(state, persist = true) {
    const compiled = normalizeCareer(current, state, current.player_id);
    careerState = compiled.state;
    current.career_history = compiled.career_history;
    current.faction_history = compiled.faction_history;
    current.job_progression = compiled.job_progression;
    current.career_diagnostics = compiled.career_diagnostics;
    if (current.player_id && persist) {
      try {
        localStorage.setItem(careerKey(current.player_id), JSON.stringify(careerState));
      } catch (error) {
        current.unavailable_sources.career_history_storage = String(error.message);
        current.career_diagnostics.missing_information.push('Employment snapshots could not be saved on this device.');
      }
    }
    current.dossier = dossier(current);
    if (dossierPreview) dossierPreview.textContent=dossierText(current);
    renderSignature();
  }
  function requireCareerAccount() {
    if (current?.player_id && careerState && !run.disabled) return true;
    careerStatus.textContent='Compile with an API key whose account can be identified first.';
    return false;
  }
  confirmCareer.onclick=()=>{
    if (!requireCareerAccount()) return;
    const correction=cleanCorrection({
      employer:employerInput.value, company_id:companyInput.value,
      highest_recorded_rank:rankInput.value
    });
    if (!correction || (companyInput.value.trim() && !correction.company_id)) {
      careerStatus.textContent='Enter an employer name and, if supplied, a valid company ID.';
      return;
    }
    updateEmployment(mergeCareerState(careerState,{observations:[], corrections:[correction], verified_events:[]}));
    for (const field of [employerInput, rankInput, companyInput]) field.value='';
    careerStatus.textContent='Previous employment correction added.';
  };
  backupCareer.onclick=()=>{
    if (!requireCareerAccount()) return;
    const state=mergeCareerState(careerState,{
      observations:[], corrections:current.career_diagnostics.user_confirmed_corrections, verified_events:[]
    });
    download('employment-history-'+current.player_id+'.json',
      JSON.stringify({format:'achievement-compiler-employment',version:1,player_id:current.player_id,...state},null,2),
      'application/json');
  };
  importCareer.onchange=async()=>{
    const file=importCareer.files[0];
    importCareer.value='';
    if (!file || !requireCareerAccount()) return;
    const report=current;
    try {
      if (file.size > 5_000_000) throw new Error('Backup exceeds 5 MB.');
      const backup=JSON.parse(await file.text());
      if (report !== current || !requireCareerAccount()) return;
      if (backup?.format !== 'achievement-compiler-employment' || backup.version !== 1
          || positiveId(backup.player_id) !== current.player_id
          || ![backup.observations,backup.corrections,backup.verified_events].every(Array.isArray)) {
        throw new Error('Choose a version 1 employment backup for this same Torn account.');
      }
      updateEmployment(mergeCareerState(careerState,readCareerState(backup)));
      careerStatus.textContent='Employment backup merged.';
    } catch (error) {
      careerStatus.textContent='Import failed. '+error.message;
    }
  };
  exportJson.onclick=()=>{if(current)download('relaxsweety-achievements.json',JSON.stringify(current,null,2),'application/json');};
  exportMd.onclick=()=>{if(current)download('relaxsweety-achievements.md',markdown(current),'text/markdown');};
  run.onclick=async()=>{
    const key=input.value.trim();if(!key){status.textContent='Enter an API key first.';return;}
    run.disabled=true;status.textContent='Retrieving Torn data…';results.replaceChildren();current=null;dossierPreview=null;careerState=null;diagnosticText.textContent='Checking key metadata…';
    try {
      let keyPlayer=null;
      let availableLogIds=[];
      const apiDiagnostics={script_version:SCRIPT_VERSION,key_info_status:'not checked',key_access:null,
        user_log_selection:null,log_probe:null,log_probe_error:null,notes:[]};
      try {
        const info=await request('/key/info',key);
        const detail=info.info||info;
        keyPlayer=positiveId(detail.user?.id);
        apiDiagnostics.key_info_status='success';
        apiDiagnostics.key_access=detail.access?.type??detail.access?.level??detail.access??null;
        const selected=detail.selections?.user;
        apiDiagnostics.user_log_selection=Array.isArray(selected)?selected.includes('log'):null;
        apiDiagnostics.custom_log_permissions=detail.access?.log?.custom_permissions??null;
        apiDiagnostics.available_log_categories=Array.isArray(detail.access?.log?.available)
          ? detail.access.log.available.length : null;
        if (apiDiagnostics.custom_log_permissions && Array.isArray(detail.access?.log?.available)) {
          availableLogIds=detail.access.log.available.flatMap(category => category.log_ids ?? []).map(positiveId).filter(Boolean);
        }
        if(apiDiagnostics.user_log_selection===false)
          apiDiagnostics.notes.push('Key metadata does not explicitly include user/log. Custom-key selections may be restricted.');
      }catch(e){
        apiDiagnostics.key_info_status='failed';
        apiDiagnostics.notes.push('Key metadata request failed: '+e.message);
      }
      diagnosticText.textContent=JSON.stringify(apiDiagnostics,null,2);
      const paths={honors:'/user/honors',medals:'/user/medals',
        honors_catalog:'/torn/honors',medals_catalog:'/torn/medals',
        personalstats:'/user/personalstats?cat=all'};
      const data={};
      for(const [name,path] of Object.entries(paths)){
        status.textContent='Loading '+name+' ('+path+')…';
        try { data[name]=await request(path,key); }
        catch(e) { throw new Error('Failed at '+name+' ('+path+'): '+e.message); }
      }
      const awards=[...compile(data.honors,data.honors_catalog,'honors'),
                    ...compile(data.medals,data.medals_catalog,'medals')];
      const extras={profile:'/user/profile',basic:'/user/basic',job:'/user/job',jobranks:'/user/jobranks',jobpoints:'/user/jobpoints',
        workstats:'/user/workstats',property:'/user/property',faction:'/user/faction',education:'/user/education',education_catalog:'/torn/education'};
      const unavailable={};
      for(const [name,path] of Object.entries(extras)){
        status.textContent='Loading '+name+'…';
        try{data[name]=await request(path,key);}catch(e){unavailable[name]=e.message;}
      }
      const typeId=careerJob(data.job)?.company_type_id;
      if (typeId) {
        try { data.company_types=await request('/torn/'+typeId+'/companies',key); }
        catch (e) { unavailable.company_types=e.message; }
      }
      const historical={};
      // Profile provides the verified enemy count; no invalid list-category request.
      // Log pagination is capped to avoid excessive PDA memory and API requests.
      try {
        status.textContent='Probing user/log access…';
        let page=await request('/user/log?limit=1',key);
        apiDiagnostics.log_probe='success';
        // Re-request normal page only after the one-record probe succeeds.
        page=await request('/user/log?limit=100',key);
        historical.logs=await collectLogPages(page,key);
      }catch(e){unavailable.logs=e.message;apiDiagnostics.log_probe='failed';apiDiagnostics.log_probe_error=e.message;
        if(/error 16\b/i.test(e.message))apiDiagnostics.notes.push('Torn denied standalone user/log. The documented Full Access requirement and custom log permissions are separate from the access label. The response does not identify which setting caused the denial.');}
      // A custom key can deny the unrestricted selection while allowing a narrower log filter.
      if (historical.logs || apiDiagnostics.custom_log_permissions === true) {
        try {
          const catalog=await request('/torn/logtypes',key);
          const ids=[...new Set((catalog.logtypes ?? []).filter(entry => employmentAction(entry.title) || factionAction(entry.title))
            .map(entry => positiveId(entry.id)).filter(id => id && (!availableLogIds.length || availableLogIds.includes(id))))];
          if (ids.length) {
            const page=await request('/user/log?limit=100&log='+ids.join(','),key);
            historical.membership_logs=await collectLogPages(page,key);
          } else unavailable.membership_logs='No recognized employment or faction membership log types were available for this key.';
        } catch (error) { unavailable.membership_logs=error.message; }
      }
      diagnosticText.textContent=JSON.stringify(apiDiagnostics,null,2);

      const basicPlayer=positiveId(data.basic?.profile?.id ?? data.basic?.basic?.id);
      const player=keyPlayer && basicPlayer && keyPlayer !== basicPlayer ? null : keyPlayer ?? basicPlayer;
      if (!player) unavailable.career_account='Account identity could not be verified for employment storage.';
      current={player_id:player,generated_at:new Date().toISOString(),awards,
        ...historical,
        personalstats:data.personalstats,profile:data.profile,basic:data.basic,
        job:data.job,company_types:data.company_types,jobranks:data.jobranks,jobpoints:data.jobpoints,workstats:data.workstats,property:data.property,
        faction:data.faction,education:data.education,education_catalog:data.education_catalog,unavailable_sources:unavailable,api_diagnostics:apiDiagnostics};
      let savedCareer = readCareerState(null);
      let persistCareer = true;
      try {
        if (player) {
          const saved = JSON.parse(localStorage.getItem(careerKey(player))||'null');
          savedCareer=readCareerState(saved);
          if (Array.isArray(saved?.events)) unavailable.legacy_career_storage =
            'Legacy snapshots were stored under the reference player ID without verifying the API account.';
        }
      } catch (error) {
        persistCareer=false;
        unavailable.career_history_storage=String(error.message);
      }
      try{
        if (!player) throw new Error('Account identity unavailable');
        const storageKey='achievement-compiler-snapshots-'+player;
        const old=JSON.parse(localStorage.getItem(storageKey)||'[]');
        const previous=old.length?old[old.length-1]:null;
        const currentEarned=awards.filter(a=>a.earned).map(a=>a.type+':'+a.id);
        const worth=data.personalstats?.personalstats?.networth?.total??null;
        current.history={previous_snapshots:old.length,
          new_awards:previous?currentEarned.filter(id=>!previous.earned.includes(id)).length:null,
          networth_change:previous&&worth!=null&&previous.networth!=null?worth-previous.networth:null};
        const next=old.slice(-29).concat([{date:current.generated_at,earned:currentEarned,networth:worth}]);
        localStorage.setItem(storageKey,JSON.stringify(next));
      }catch(e){unavailable.local_history=String(e.message);}
      updateEmployment(savedCareer,persistCareer);
      const done=awards.filter(a=>a.earned),todo=awards.filter(a=>!a.earned);
      status.textContent='Completed: '+done.length+' | Not earned: '+todo.length+'. API log: '+(apiDiagnostics.log_probe||'not checked')+'. Export available.';
      const detail=el('details',undefined,results);
      el('summary','Player Performance Dossier',detail);
      dossierPreview=el('pre',dossierText(current),detail);
      dossierPreview.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;background:#000;color:#00FF66;padding:8px;font:11px monospace';
      for(const [label,items] of [['Completed',done],['Not yet earned',todo]]){
        const details=el('details',undefined,results),summary=el('summary',label+' ('+items.length+')',details);
        for(const a of items)el('p',a.name+' — '+a.description+(a.earned_at?' ['+formatDate(a.earned_at)+']':''),details);
      }
    }catch(e){status.textContent=e.message+'; verify endpoint permissions and API response format.';}
    finally{input.value='';run.disabled=false;}
  };
  // PDA and SPA navigation can replace document.body after userscript injection.
  // Mount immediately, retry on DOM readiness and reattach after route changes.
  mount();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  window.addEventListener('pageshow', mount);
  const observer = new MutationObserver(() => {
    if (!button.isConnected || !panel.isConnected) mount();
  });
  observer.observe(document.documentElement, {childList:true,subtree:true});
  setInterval(() => { if (!button.isConnected || !panel.isConnected) mount(); }, 2500);
})();
