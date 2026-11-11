// Source-only DEV safeguard. One Durable Object serializes every registration reservation.
const WINDOW_MS = 70_000; // Covers Torn's rolling minute plus the 8s verification deadline.
const MAX_REGISTRATIONS = 500; // At most 1000 reserved Torn reads across this Worker.
const MAX_PER_KEY = 10;
const MAX_PER_IP = 20;
const HASH = /^[a-f0-9]{64}$/;

export class RollingBudget {
  constructor(state, limits) { this.storage = state.storage; this.limits = limits; }

  async fetch(request) {
    if(request.method==='POST'&&new URL(request.url).origin==='https://budget.internal'&&new URL(request.url).pathname==='/forget'){const {keyHash}=await request.json();if(!HASH.test(keyHash||''))return new Response(null,{status:400});await this.storage.transaction(async tx=>{const events=await tx.get('reservations')||[];await tx.put('reservations',events.filter(event=>event.key!==keyHash));});return new Response(null,{status:204});}
    if(request.method==='POST'&&new URL(request.url).origin==='https://budget.internal'&&new URL(request.url).pathname==='/prune'){await this.alarm();return new Response(null,{status:204});}
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/reserve') {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    let body;
    try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
    if (!HASH.test(body?.keyHash) || !HASH.test(body?.ipHash)) return new Response(null, { status: 400 });
    const decision = await this.storage.transaction(async transaction => {
      const time = Date.now();
      const events = (await transaction.get('reservations') || []).filter(event => event.at > time - this.limits.window);
      if (events.length >= this.limits.global ||
          events.filter(event => event.key === body.keyHash).length >= this.limits.key ||
          events.filter(event => event.ip === body.ipHash).length >= this.limits.ip) {
        return false;
      }
      events.push({ at: time, key: body.keyHash, ip: body.ipHash });
      await transaction.put('reservations', events);
      await transaction.setAlarm(Math.min(...events.map(event => event.at)) + this.limits.window);
      return true;
    });
    return Response.json({ allowed: decision }, { status: decision ? 200 : 429 });
  }

  async alarm() {
    await this.storage.transaction(async transaction => {
      const time = Date.now();
      const events = (await transaction.get('reservations') || []).filter(event => event.at > time - this.limits.window);
      if (!events.length) { await transaction.delete('reservations'); return; }
      await transaction.put('reservations', events);
      await transaction.setAlarm(Math.min(...events.map(event => event.at)) + this.limits.window);
    });
  }
}

export class RegistrationBudget extends RollingBudget {
  constructor(state) { super(state, {window:WINDOW_MS, global:MAX_REGISTRATIONS, key:MAX_PER_KEY, ip:MAX_PER_IP}); }
}
