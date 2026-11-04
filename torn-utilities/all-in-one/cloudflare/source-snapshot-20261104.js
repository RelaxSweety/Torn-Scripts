var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/published-agreement.js
var bundledAgreement = { "agreement": { "agreement_version": "1.1", "agreement_number": 2, "agreement_date": "2026-10-23" }, "content": "# Torn Utilities Terms and Information Use Agreement\n\nVersion: 1.1\nAgreement number: 2\nEffective date: 2026-10-23\n\n## Terms of Use\nTorn Utilities (TU) is independent of Torn City and is provided as-is. Use is optional and subject to Torn rules and applicable law.\n\n## Information Use\nTU may process Torn identity, gameplay information, market observations, and user-entered settings. Approved TU features may transmit observations and multiplayer activity to TU services for functionality and analysis.\n\n## API Keys and Storage\nUse a Public Only Torn API key. TU uses local storage for settings and agreement cache, and its backend records agreement events against a verified Torn player ID. Do not share API keys or session tokens.\n\n## Third-party Services and Retention\nTU may use Torn API, GitHub, and Cloudflare. Shared observations and gameplay records may be retained. A comprehensive retention schedule has not yet been published.\n\n## Prohibited Activities\nUnauthorized modification, redistribution, or manipulation of TU scripts; tampering with TU server connections, requests, authentication, or reporting; and automated scraping, bulk extraction, reverse engineering of nonpublic service interfaces, or data mining of TU-hosted information are strictly prohibited. This does not prohibit approved TU features, access to your own information, security research permitted by applicable law, or other rights that cannot lawfully be restricted.\n\n## User Choice\nYou may decline and review the information page, but TU modules require acceptance. You may stop using TU and remove locally stored information.\n\n## Agreement\nBy accepting, you consent to the described processing and confirm review of these terms. Acceptance is recorded by the TU backend. A new agreement version requires renewed acceptance.\n" };

// src/auth.js
var respond = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" } }), "respond");
var digest = /* @__PURE__ */ __name(async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((x) => x.toString(16).padStart(2, "0")).join(""), "digest");
var now = /* @__PURE__ */ __name(() => Math.floor(Date.now() / 1e3), "now");
var validPlatform = /* @__PURE__ */ __name((v) => v === "pda" || v === "tampermonkey", "validPlatform");
async function limitedJson(req) {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > 2048) return null;
  const text = await req.text();
  if (new TextEncoder().encode(text).length > 2048) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
__name(limitedJson, "limitedJson");
async function tornIdentity(key) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const response = await fetch("https://api.torn.com/v2/key/info", { headers: { "Authorization": "ApiKey " + key, "Accept": "application/json" }, signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.error) return null;
    const id = Number(data?.info?.user?.id);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const access = data?.info?.access?.type ?? data?.info?.access;
    if (access !== "Public Only") return null;
    const userResponse = await fetch("https://api.torn.com/v2/user/basic", { headers: { "Authorization": "ApiKey " + key, "Accept": "application/json" }, signal: controller.signal });
    if (!userResponse.ok) return null;
    const user = await userResponse.json();
    const profile = user?.profile ?? user;
    if (user?.error || Number(profile?.id) !== id || typeof profile?.name !== "string" || !/^[A-Za-z0-9_-]{2,32}$/.test(profile.name)) return null;
    return { id, username: profile.name };
  } finally {
    clearTimeout(timeout);
  }
}
__name(tornIdentity, "tornIdentity");
async function audit(db, type, actor, target) {
  await db.prepare("INSERT INTO tu_audit_events(actor_torn_id,target_torn_id,event_type,created_at) VALUES(?,?,?,?)").bind(actor, target, type, now()).run();
}
__name(audit, "audit");
async function publishedAgreement() {
  return bundledAgreement;
}
__name(publishedAgreement, "publishedAgreement");
async function latestAgreement(db, playerId) {
  return db.prepare("SELECT event_id,event_type,agreement_version,agreement_number,agreement_date,occurred_at FROM tu_agreement_events WHERE player_id=? ORDER BY event_id DESC LIMIT 1").bind(playerId).first();
}
__name(latestAgreement, "latestAgreement");
var currentAgreement = /* @__PURE__ */ __name((e, agreement) => e?.event_type === "accepted" && e.agreement_version === agreement.agreement_version && e.agreement_number === agreement.agreement_number && e.agreement_date === agreement.agreement_date, "currentAgreement");
async function agreementEvent(db, playerId, type, requestId, reason, agreement) {
  const latest = await latestAgreement(db, playerId);
  if (type === "cancelled" && latest?.event_type === "cancelled") return { unchanged: true, event: latest };
  if (type === "accepted" && currentAgreement(latest, agreement)) return { unchanged: true, event: latest };
  await db.prepare("INSERT INTO tu_agreement_events(player_id,event_type,agreement_version,agreement_number,agreement_date,request_id,reason) VALUES(?,?,?,?,?,?,?)").bind(playerId, type, agreement.agreement_version, agreement.agreement_number, agreement.agreement_date, requestId, reason).run();
  const recorded = await db.prepare("SELECT event_id,event_type,agreement_version,agreement_number,agreement_date,occurred_at FROM tu_agreement_events WHERE request_id=? AND player_id=?").bind(requestId, playerId).first();
  if (!recorded || recorded.event_type !== type) throw Error("Agreement event not persisted");
  return { unchanged: false, event: recorded };
}
__name(agreementEvent, "agreementEvent");
async function handleAuth(req, env, url) {
  const path = url.pathname;
  if (path === "/api/auth/agreement/current" && req.method === "GET") {
    try {
      return respond(await publishedAgreement());
    } catch (error) {
      return respond({ error: "Published agreement unavailable", detail: String(error?.message || error).slice(0, 200) }, 503);
    }
  }
  const db = env.TU_USERS_DB;
  if (!db) return respond({ error: "User database is not configured" }, 503);
  if (path === "/api/auth/register") {
    if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
    const body = await limitedJson(req);
    if (!body || !validPlatform(body.platform) || typeof body.api_key !== "string") return respond({ error: "Invalid registration request: missing API key or unsupported platform" }, 400);
    body.api_key = body.api_key.trim();
    if (!/^[A-Za-z0-9]{16,128}$/.test(body.api_key)) return respond({ error: "Invalid registration request: API key must contain 16\u2013128 letters or digits (check for spaces or pasted URL)" }, 400);
    let identity;
    try {
      identity = await tornIdentity(body.api_key);
    } catch {
      return respond({ error: "Torn verification unavailable" }, 503);
    }
    if (!identity) return respond({ error: "Torn verification failed" }, 401);
    const t = now();
    try {
      const previous = await db.prepare("SELECT account_status FROM tu_users WHERE torn_id=?").bind(identity.id).first();
      if (previous?.account_status === "suspended" || previous?.account_status === "revoked") return respond({ error: "Account restricted" }, 403);
      await db.prepare("INSERT INTO tu_users(torn_id,username,account_status,verified_at,created_at,updated_at) VALUES(?,?,'pending',?,?,?) ON CONFLICT(torn_id) DO UPDATE SET username=excluded.username,verified_at=excluded.verified_at,updated_at=excluded.updated_at").bind(identity.id, identity.username, t, t, t).run();
      const secret = crypto.randomUUID() + "." + crypto.randomUUID(), hash2 = await digest(secret), id = crypto.randomUUID(), expiry = t + 86400;
      await db.prepare("INSERT INTO tu_sessions(id,torn_id,token_hash,platform,created_at,expires_at) VALUES(?,?,?,?,?,?)").bind(id, identity.id, hash2, body.platform, t, expiry).run();
      await audit(db, "auth.register", identity.id, identity.id);
      return respond({ token: secret, expires_at: expiry, player: { torn_id: identity.id, username: identity.username, account_status: previous?.account_status || "pending" } }, 201);
    } catch {
      return respond({ error: "Registration unavailable" }, 503);
    }
  }
  const authorization = req.headers.get("authorization") || "";
  const match = /^Bearer ([0-9a-f-]{36}\.[0-9a-f-]{36})$/i.exec(authorization);
  if (!match) return respond({ error: "Unauthorized" }, 401);
  const hash = await digest(match[1]);
  try {
    const session = await db.prepare("SELECT s.id,s.torn_id,s.expires_at,u.username,u.faction_id,u.account_status,u.role FROM tu_sessions s JOIN tu_users u ON u.torn_id=s.torn_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?").bind(hash, now()).first();
    if (!session || session.account_status === "suspended" || session.account_status === "revoked") return respond({ error: "Unauthorized" }, 401);
    if (path === "/api/auth/agreement") {
      const ledger = env.FOREIGN_DB;
      if (!ledger) return respond({ error: "Agreement database is not configured" }, 503);
      let published;
      try {
        published = await publishedAgreement();
      } catch {
        return respond({ error: "Published agreement unavailable" }, 503);
      }
      const AGREEMENT = published.agreement;
      if (req.method === "GET") {
        const event = await latestAgreement(ledger, session.torn_id);
        return respond({ agreement: AGREEMENT, accepted: currentAgreement(event, AGREEMENT), latest_event: event || null });
      }
      if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
      const body = await limitedJson(req);
      if (!body || !["accepted", "cancelled"].includes(body.action) || typeof body.request_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.request_id)) return respond({ error: "Invalid agreement event request" }, 400);
      if (body.action === "accepted" && (body.agreement_version !== AGREEMENT.agreement_version || body.agreement_number !== AGREEMENT.agreement_number || body.agreement_date !== AGREEMENT.agreement_date)) return respond({ error: "Agreement version mismatch", agreement: AGREEMENT }, 409);
      const existing = await ledger.prepare("SELECT player_id,event_type FROM tu_agreement_events WHERE request_id=?").bind(body.request_id).first();
      if (existing) {
        if (existing.player_id !== session.torn_id || existing.event_type !== body.action) return respond({ error: "Request ID conflict" }, 409);
        return respond({ ok: true, unchanged: true, agreement: AGREEMENT });
      }
      let outcome2;
      try {
        outcome2 = await agreementEvent(ledger, session.torn_id, body.action, body.request_id, body.action === "cancelled" ? "api_key_deleted" : null, AGREEMENT);
      } catch {
        return respond({ error: "Agreement recording failed", code: "AGREEMENT_WRITE_FAILED" }, 503);
      }
      if (body.action === "cancelled") {
        await db.prepare("UPDATE tu_sessions SET revoked_at=? WHERE torn_id=? AND revoked_at IS NULL").bind(now(), session.torn_id).run();
      }
      return respond({ ok: true, accepted: body.action === "accepted", unchanged: outcome2.unchanged, event: outcome2.event, agreement: AGREEMENT });
    }
    if (path === "/api/auth/me") {
      if (req.method !== "GET") return respond({ error: "Method not allowed" }, 405);
      const { results } = await db.prepare("SELECT module_id,allowed FROM tu_module_permissions WHERE torn_id=?").bind(session.torn_id).all();
      return respond({ player: { torn_id: session.torn_id, username: session.username, faction_id: session.faction_id, account_status: session.account_status, role: session.role }, permissions: results, expires_at: session.expires_at });
    }
    if (path === "/api/auth/admin/pending") {
      if (req.method !== "GET") return respond({ error: "Method not allowed" }, 405);
      if (session.role !== "admin" || session.account_status !== "active") return respond({ error: "Forbidden" }, 403);
      const { results } = await db.prepare("SELECT torn_id,username,verified_at FROM tu_users WHERE account_status='pending' ORDER BY verified_at DESC LIMIT 100").all();
      return respond({ users: results });
    }
    if (path === "/api/auth/admin/approve") {
      if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
      if (session.role !== "admin" || session.account_status !== "active") return respond({ error: "Forbidden" }, 403);
      const body = await limitedJson(req);
      const target = Number(body?.torn_id);
      if (!Number.isSafeInteger(target) || target <= 0) return respond({ error: "Invalid Torn ID" }, 400);
      const result = await db.prepare("UPDATE tu_users SET account_status='active',updated_at=? WHERE torn_id=? AND account_status='pending' AND role='user'").bind(now(), target).run();
      if (!result.meta?.changes) return respond({ error: "No pending user found" }, 404);
      await audit(db, "auth.approve", session.torn_id, target);
      return respond({ ok: true, torn_id: target, account_status: "active" });
    }
    if (path === "/api/auth/admin/users") {
      if (req.method !== "GET") return respond({ error: "Method not allowed" }, 405);
      if (session.role !== "admin" || session.account_status !== "active") return respond({ error: "Forbidden" }, 403);
      const { results } = await db.prepare("SELECT torn_id,username,account_status,role,updated_at FROM tu_users ORDER BY updated_at DESC LIMIT 200").all();
      return respond({ users: results });
    }
    if (path === "/api/auth/admin/status") {
      if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
      if (session.role !== "admin" || session.account_status !== "active") return respond({ error: "Forbidden" }, 403);
      const body = await limitedJson(req), target = Number(body?.torn_id), status = body?.status;
      if (!Number.isSafeInteger(target) || target <= 0 || !["active", "suspended", "revoked"].includes(status)) return respond({ error: "Invalid account status request" }, 400);
      if (target === session.torn_id) return respond({ error: "Cannot change your own account" }, 403);
      const user = await db.prepare("SELECT account_status,role FROM tu_users WHERE torn_id=?").bind(target).first();
      if (!user) return respond({ error: "User not found" }, 404);
      if (user.role === "admin") return respond({ error: "Cannot change administrator accounts" }, 403);
      if (user.account_status === "revoked" && status !== "revoked") return respond({ error: "Revoked accounts cannot be reactivated" }, 409);
      if (user.account_status === "pending" && status === "active") return respond({ error: "Approve pending accounts through the approval endpoint" }, 409);
      if (user.account_status === status) return respond({ ok: true, torn_id: target, account_status: status, unchanged: true });
      await db.prepare("UPDATE tu_users SET account_status=?,updated_at=? WHERE torn_id=? AND role='user'").bind(status, now(), target).run();
      if (status !== "active") await db.prepare("UPDATE tu_sessions SET revoked_at=? WHERE torn_id=? AND revoked_at IS NULL").bind(now(), target).run();
      await audit(db, "auth.status." + status, session.torn_id, target);
      return respond({ ok: true, torn_id: target, account_status: status });
    }
    if (path === "/api/auth/admin/permission") {
      if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
      if (session.role !== "admin" || session.account_status !== "active") return respond({ error: "Forbidden" }, 403);
      const body = await limitedJson(req), target = Number(body?.torn_id), moduleId = body?.module_id, allowed = body?.allowed;
      if (!Number.isSafeInteger(target) || target <= 0 || typeof moduleId !== "string" || !/^[a-zA-Z0-9._-]{1,80}$/.test(moduleId) || typeof allowed !== "boolean") return respond({ error: "Invalid permission request" }, 400);
      if (target === session.torn_id) return respond({ error: "Cannot change your own permissions" }, 403);
      const user = await db.prepare("SELECT role FROM tu_users WHERE torn_id=?").bind(target).first();
      if (!user) return respond({ error: "User not found" }, 404);
      if (user.role === "admin") return respond({ error: "Cannot change administrator permissions" }, 403);
      await db.prepare("INSERT INTO tu_module_permissions(torn_id,module_id,allowed,updated_at,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(torn_id,module_id) DO UPDATE SET allowed=excluded.allowed,updated_at=excluded.updated_at,updated_by=excluded.updated_by").bind(target, moduleId, allowed ? 1 : 0, now(), session.torn_id).run();
      await audit(db, "auth.permission." + (allowed ? "allow" : "deny"), session.torn_id, target);
      return respond({ ok: true, torn_id: target, module_id: moduleId, allowed });
    }
    if (path === "/api/auth/module-access") {
      if (req.method !== "GET") return respond({ error: "Method not allowed" }, 405);
      const moduleId = url.searchParams.get("module_id");
      if (!moduleId || !/^[a-zA-Z0-9._-]{1,80}$/.test(moduleId)) return respond({ error: "Invalid module ID" }, 400);
      if (session.account_status !== "active") return respond({ allowed: false, reason: "Account not active" }, 403);
      if (!env.FOREIGN_DB) return respond({ allowed: false, reason: "Agreement database unavailable" }, 503);
      if (!currentAgreement(await latestAgreement(env.FOREIGN_DB, session.torn_id), (await publishedAgreement()).agreement)) return respond({ allowed: false, reason: "Current agreement not accepted" }, 403);
      const permission = await db.prepare("SELECT allowed FROM tu_module_permissions WHERE torn_id=? AND module_id=?").bind(session.torn_id, moduleId).first();
      const allowed = session.role === "admin" || permission?.allowed === 1;
      return respond({ allowed, module_id: moduleId, reason: allowed ? "Authorized" : "Module permission not granted" }, allowed ? 200 : 403);
    }
    if (path === "/api/auth/sessions") {
      if (req.method !== "GET") return respond({ error: "Method not allowed" }, 405);
      const { results } = await db.prepare("SELECT id,platform,created_at,expires_at,revoked_at FROM tu_sessions WHERE torn_id=? ORDER BY created_at DESC LIMIT 100").bind(session.torn_id).all();
      return respond({ sessions: results.map((item) => ({ ...item, current: item.id === session.id })) });
    }
    if (path === "/api/auth/sessions/revoke") {
      if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
      const body = await limitedJson(req);
      if (!body || typeof body.session_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.session_id)) return respond({ error: "Invalid session ID" }, 400);
      if (body.session_id === session.id) return respond({ error: "Use logout for current session" }, 409);
      const target = await db.prepare("SELECT revoked_at FROM tu_sessions WHERE id=? AND torn_id=?").bind(body.session_id, session.torn_id).first();
      if (!target) return respond({ error: "Session not found" }, 404);
      if (target.revoked_at !== null) return respond({ ok: true, unchanged: true });
      await db.prepare("UPDATE tu_sessions SET revoked_at=? WHERE id=? AND torn_id=? AND revoked_at IS NULL").bind(now(), body.session_id, session.torn_id).run();
      await audit(db, "auth.session.revoke", session.torn_id, session.torn_id);
      return respond({ ok: true });
    }
    if (path === "/api/auth/logout") {
      if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
      await db.prepare("UPDATE tu_sessions SET revoked_at=? WHERE id=?").bind(now(), session.id).run();
      await audit(db, "auth.logout", session.torn_id, session.torn_id);
      return respond({ ok: true });
    }
    return respond({ error: "Not found" }, 404);
  } catch {
    return respond({ error: "Authentication unavailable" }, 503);
  }
}
__name(handleAuth, "handleAuth");

// src/foreign/direct-observations.js
var countries = /* @__PURE__ */ new Set(["mex", "cay", "can", "haw", "uni", "arg", "swi", "jap", "chi", "uae", "sou"]);
var reply = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" } }), "reply");
async function submitForeignSnapshot(req, env) {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (!env.FOREIGN_DB) return reply({ error: "Database unavailable" }, 503);
  const size = Number(req.headers.get("content-length") || 0);
  if (size > 16e3) return reply({ error: "Payload too large" }, 413);
  let data;
  try {
    data = await req.json();
  } catch {
    return reply({ error: "Invalid JSON" }, 400);
  }
  const country = String(data?.country || "").toLowerCase(), observed = Number(data?.observed_at), items = data?.items;
  const now2 = Math.floor(Date.now() / 1e3);
  if (!countries.has(country) || !Number.isSafeInteger(observed) || observed > now2 + 300 || observed < now2 - 90 * 86400 || !Array.isArray(items) || items.length < 1 || items.length > 50) return reply({ error: "Invalid observation" }, 400);
  const seen = /* @__PURE__ */ new Set(), rows = [];
  for (const item of items) {
    const id = Number(item?.item_id), quantity = Number(item?.quantity), price = item?.unit_price == null ? null : Number(item.unit_price);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1e9 || price !== null && (!Number.isSafeInteger(price) || price < 0 || price > 1e9)) return reply({ error: "Invalid item" }, 400);
    seen.add(id);
    rows.push({ id, quantity, price });
  }
  try {
    const db = env.FOREIGN_DB;
    await db.prepare("CREATE TABLE IF NOT EXISTS foreign_direct_observations (country TEXT NOT NULL,item_id INTEGER NOT NULL,observed_bucket INTEGER NOT NULL,quantity INTEGER NOT NULL,unit_price INTEGER,source TEXT NOT NULL DEFAULT 'tu_dom',received_at INTEGER NOT NULL,PRIMARY KEY(country,item_id,observed_bucket,quantity))").run();
    const bucket = Math.floor(observed / 10) * 10;
    const statements = rows.map((x) => db.prepare("INSERT OR IGNORE INTO foreign_direct_observations(country,item_id,observed_bucket,quantity,unit_price,received_at) VALUES(?,?,?,?,?,?)").bind(country, x.id, bucket, x.quantity, x.price, now2));
    await db.batch(statements);
    return reply({ ok: true, accepted: rows.map((x) => x.id), observed_at: observed, delayed: now2 - observed > 300 }, 201);
  } catch {
    return reply({ error: "Observation storage unavailable" }, 503);
  }
}
__name(submitForeignSnapshot, "submitForeignSnapshot");

// src/foreign/intelligence.js
var countries2 = /* @__PURE__ */ new Set(["mex", "cay", "can", "haw", "uni", "arg", "swi", "jap", "chi", "uae", "sou"]);
var bad = /* @__PURE__ */ __name((error, status = 400) => new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" } }), "bad");
var ok = /* @__PURE__ */ __name((data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=30" } }), "ok");
var median = /* @__PURE__ */ __name((a) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2 : null;
}, "median");
function estimateRestock(events, now2 = Math.floor(Date.now() / 1e3), leadSeconds = 0) {
  const times = [...new Set(events.map((e) => Number(e.detected_observed_at)).filter(Number.isSafeInteger))].sort((a, b) => a - b);
  const intervals = times.slice(1).map((t, i) => t - times[i]).filter((n) => n >= 300 && n <= 30 * 86400);
  if (intervals.length < 3) return { status: "insufficient_data", reason: "At least four distinct stock increases are needed", observed_events: times.length, usable_intervals: intervals.length };
  const typical = median(intervals), deviation = median(intervals.map((n) => Math.abs(n - typical)));
  const last = times.at(-1);
  const width = Math.max(900, Math.ceil(1.4826 * deviation), Math.ceil(typical * 0.2));
  const target = now2 + Math.max(0, leadSeconds);
  let cycle = 1;
  while (cycle < 4 && last + cycle * typical - width < target) cycle++;
  const start = Math.floor(last + cycle * typical - width), end = Math.ceil(last + cycle * typical + width);
  if (start < target || width >= typical) return { status: "insufficient_data", reason: "Restock pattern is too irregular or overdue", observed_events: times.length, usable_intervals: intervals.length };
  const confidence = Math.round(Math.min(0.75, Math.max(0.05, (1 - deviation / typical) * Math.min(1, intervals.length / 12) * 0.75 / Math.sqrt(cycle))) * 100) / 100;
  return { status: "experimental", model_version: "median-interval-v2", projected_cycles_ahead: cycle, expected_start_at: start, expected_end_at: end, confidence, observed_events: times.length, usable_intervals: intervals.length, typical_interval_seconds: typical, median_absolute_deviation_seconds: deviation, disclaimer: "Based on crowdsourced stock increases, not confirmed restock times" };
}
__name(estimateRestock, "estimateRestock");
async function directSeries(db, country, id, limit = 500) {
  const { results } = await db.prepare("SELECT observed_bucket AS source_observed_at,quantity,unit_price,received_at AS collected_at,source AS provider FROM foreign_direct_observations WHERE country=? AND item_id=? ORDER BY observed_bucket DESC LIMIT ?").bind(country, id, limit).all();
  return results.reverse();
}
__name(directSeries, "directSeries");
function increases(points) {
  const ordered = [...points].sort((a, b) => a.source_observed_at - b.source_observed_at);
  const out = [];
  let previous = null;
  for (const p of ordered) {
    if (previous && p.source_observed_at > previous.source_observed_at && p.quantity > previous.quantity)
      out.push({ previous_observed_at: previous.source_observed_at, detected_observed_at: p.source_observed_at, quantity_before: previous.quantity, quantity_after: p.quantity, confidence: "observed_increase", source: "tu_dom" });
    if (!previous || p.source_observed_at >= previous.source_observed_at) previous = p;
  }
  return out;
}
__name(increases, "increases");
async function directEvents(db, country, id) {
  return increases(await directSeries(db, country, id, 500));
}
__name(directEvents, "directEvents");
async function foreignOverview(env) {
  const db = env.FOREIGN_DB;
  if (!db) return bad("Database unavailable", 503);
  try {
    const { results: rows } = await db.prepare(`
   SELECT o.country,o.item_id,COUNT(*) AS observations,
     MAX(o.source_observed_at) AS latest_observed_at,
     (SELECT x.quantity FROM foreign_stock_observations x WHERE x.country=o.country AND x.item_id=o.item_id ORDER BY x.source_observed_at DESC LIMIT 1) AS latest_quantity,
     (SELECT COUNT(*) FROM foreign_restock_events e WHERE e.country=o.country AND e.item_id=o.item_id) AS restock_occurrences
   FROM foreign_stock_observations o
   GROUP BY o.country,o.item_id ORDER BY o.country,o.item_id`).all();
    const { results: directGroups } = await db.prepare("SELECT country,item_id,COUNT(*) AS observations,MAX(observed_bucket) AS latest_observed_at FROM foreign_direct_observations GROUP BY country,item_id").all();
    const directMap = new Map(directGroups.map((x) => [x.country + ":" + x.item_id, x]));
    const combined = new Map(rows.map((x) => [x.country + ":" + x.item_id, { ...x, yata_observations: x.observations, direct_observations: 0 }]));
    for (const d of directGroups) {
      const key = d.country + ":" + d.item_id;
      if (!combined.has(key)) combined.set(key, { country: d.country, item_id: d.item_id, observations: 0, latest_observed_at: 0, latest_quantity: null, restock_occurrences: 0, yata_observations: 0, direct_observations: 0 });
      const entry = combined.get(key);
      entry.direct_observations = d.observations;
      entry.observations += d.observations;
      if (d.latest_observed_at > entry.latest_observed_at) {
        entry.latest_observed_at = d.latest_observed_at;
        const latest = await db.prepare("SELECT quantity FROM foreign_direct_observations WHERE country=? AND item_id=? ORDER BY observed_bucket DESC LIMIT 1").bind(d.country, d.item_id).first();
        entry.latest_quantity = latest?.quantity ?? entry.latest_quantity;
      }
    }
    const mergedRows = [...combined.values()];
    const byCountry = {};
    let observations = 0, occurrences = 0, eligible = 0;
    for (const row of mergedRows) {
      const item = { item_id: row.item_id, observations: row.observations, restock_occurrences: row.restock_occurrences, latest_quantity: row.latest_quantity, latest_observed_at: row.latest_observed_at, yata_observations: row.yata_observations, direct_observations: row.direct_observations, threshold_met: row.restock_occurrences >= 4 };
      (byCountry[row.country] ??= []).push(item);
      observations += row.observations;
      occurrences += row.restock_occurrences;
      if (item.threshold_met) eligible++;
    }
    const { results: eventRows } = await db.prepare("SELECT country,item_id,detected_observed_at FROM foreign_restock_events ORDER BY country,item_id,detected_observed_at DESC").all();
    const eventsByItem = /* @__PURE__ */ new Map();
    for (const e of eventRows) {
      const key = e.country + ":" + e.item_id;
      if (!eventsByItem.has(key)) eventsByItem.set(key, []);
      const arr = eventsByItem.get(key);
      if (arr.length < 100) arr.push({ detected_observed_at: e.detected_observed_at });
    }
    for (const d of directGroups) {
      const key = d.country + ":" + d.item_id;
      const events = await directEvents(db, d.country, d.item_id);
      const arr = eventsByItem.get(key) || [];
      arr.push(...events);
      eventsByItem.set(key, arr);
      const item = byCountry[d.country]?.find((x) => x.item_id === d.item_id);
      if (item) {
        item.direct_stock_increases = events.length;
        item.restock_occurrences += events.length;
        item.threshold_met = item.restock_occurrences >= 4;
      }
      occurrences += events.length;
    }
    eligible = Object.values(byCountry).flat().filter((x) => x.threshold_met).length;
    const now2 = Math.floor(Date.now() / 1e3);
    const statuses = { experimental: 0, insufficient_data: 0 };
    const reasons = {};
    for (const [country, items] of Object.entries(byCountry)) for (const item of items) {
      const prediction = estimateRestock(eventsByItem.get(country + ":" + item.item_id) || [], now2);
      item.prediction_status = prediction.status;
      item.prediction_reason = prediction.reason || null;
      item.observed_events = prediction.observed_events;
      item.usable_intervals = prediction.usable_intervals;
      if (prediction.status === "experimental") {
        item.expected_start_at = prediction.expected_start_at;
        item.expected_end_at = prediction.expected_end_at;
        item.confidence = prediction.confidence;
      }
      statuses[prediction.status] = (statuses[prediction.status] || 0) + 1;
      if (prediction.reason) reasons[prediction.reason] = (reasons[prediction.reason] || 0) + 1;
    }
    return ok({ generated_at: now2, source: "yata+tu_dom", time_unit: "unix_seconds", prediction_threshold: 4, summary: { countries: Object.keys(byCountry).length, items: mergedRows.length, observations, restock_occurrences: occurrences, threshold_met_items: eligible, prediction_statuses: statuses, insufficient_reasons: reasons }, locations: Object.entries(byCountry).map(([country, items]) => ({ country, items })), note: "Observed stock increases are not confirmed restocks. Experimental confidence is a heuristic, not a calibrated probability." });
  } catch {
    return bad("Stock overview query failed", 503);
  }
}
__name(foreignOverview, "foreignOverview");
async function handleForeignApi(request, env, url) {
  if (request.method !== "GET") return bad("Method not allowed", 405);
  const country = (url.searchParams.get("country") || "").toLowerCase();
  const raw = url.searchParams.get("item_id");
  const id = Number(raw);
  if (!countries2.has(country) || !raw || !/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id <= 0) return bad("Valid country and positive item_id are required");
  const limitRaw = url.searchParams.get("limit") || "100";
  if (!/^\d+$/.test(limitRaw)) return bad("Invalid limit");
  const limit = Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) return bad("limit must be 1\u2013500");
  const path = url.pathname;
  const db = env.FOREIGN_DB;
  if (!db) return bad("Database unavailable", 503);
  try {
    if (path === "/api/foreign/history") {
      const { results } = await db.prepare("SELECT quantity,unit_price,source_observed_at,collected_at,provider FROM foreign_stock_observations WHERE country=? AND item_id=? ORDER BY source_observed_at DESC LIMIT ?").bind(country, id, limit).all();
      const direct = await directSeries(db, country, id, limit);
      const points = [...results, ...direct].sort((a, b) => a.source_observed_at - b.source_observed_at).slice(-limit);
      return ok({ country, item_id: id, points, count: points.length, source: "yata+tu_dom", time_unit: "unix_seconds" });
    }
    if (path === "/api/foreign/restocks" || path === "/api/foreign/prediction") {
      const { results } = await db.prepare("SELECT previous_observed_at,detected_observed_at,quantity_before,quantity_after,confidence FROM foreign_restock_events WHERE country=? AND item_id=? ORDER BY detected_observed_at DESC LIMIT ?").bind(country, id, path.endsWith("prediction") ? 100 : limit).all();
      const direct = await directEvents(db, country, id);
      const events = [...results.map((x) => ({ ...x, source: "yata" })), ...direct].sort((a, b) => a.detected_observed_at - b.detected_observed_at);
      if (path.endsWith("restocks")) return ok({ country, item_id: id, events: events.slice(-limit), count: Math.min(limit, events.length), source: "yata+tu_dom", time_unit: "unix_seconds", note: "Events represent observed quantity increases, not confirmed restocks" });
      const leadRaw = url.searchParams.get("lead_seconds") || "0";
      if (!/^\d+$/.test(leadRaw) || Number(leadRaw) > 86400) return bad("lead_seconds must be between 0 and 86400");
      const prediction = estimateRestock(events, Math.floor(Date.now() / 1e3), Number(leadRaw));
      return ok({ country, item_id: id, ...prediction, generated_at: Math.floor(Date.now() / 1e3), source: "yata+tu_dom" });
    }
    return bad("Not found", 404);
  } catch {
    return bad("Stock intelligence query failed", 503);
  }
}
__name(handleForeignApi, "handleForeignApi");

// src/foreign/feedback.js
var countries3 = /* @__PURE__ */ new Set(["mex", "cay", "can", "haw", "uni", "arg", "swi", "jap", "chi", "uae", "sou"]);
var reply2 = /* @__PURE__ */ __name((v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" } }), "reply");
var integer = /* @__PURE__ */ __name((n) => Number.isSafeInteger(n) && n >= 0, "integer");
async function submitTravelFeedback(req, env) {
  if (req.method !== "POST") return reply2({ error: "Method not allowed" }, 405);
  if (!env.FOREIGN_DB) return reply2({ error: "Database unavailable" }, 503);
  let b;
  try {
    b = await req.json();
  } catch {
    return reply2({ error: "Invalid JSON" }, 400);
  }
  const p = b?.projection || {}, o = b?.outcome || {};
  if (!/^[0-9a-f-]{36}$/i.test(String(b.report_id || "")) || !countries3.has(p.country) || !integer(p.item_id) || p.item_id === 0 || !integer(p.captured_at) || !integer(p.predicted_arrival) || !integer(p.forecast_start) || !integer(p.forecast_end) || !["yes", "no", "not_checked"].includes(o.available) || !["yes", "no", "unsure"].includes(o.restocked) || o.restocked === "yes" && (!integer(o.restock_time) || !["exact", "approximate"].includes(o.time_accuracy)) || !integer(o.checked_at) || o.checked_at < p.captured_at || o.checked_at > Date.now() / 1e3 + 300 || o.quantity != null && (!integer(o.quantity) || o.quantity > 1e7) || p.captured_at > Date.now() / 1e3 + 300 || Date.now() / 1e3 - p.captured_at > 30 * 86400) return reply2({ error: "Invalid feedback fields" }, 400);
  try {
    const db = env.FOREIGN_DB;
    await db.prepare("CREATE TABLE IF NOT EXISTS foreign_travel_feedback (report_id TEXT PRIMARY KEY,country TEXT NOT NULL,item_id INTEGER NOT NULL,captured_at INTEGER NOT NULL,checked_at INTEGER NOT NULL,available TEXT NOT NULL,restocked TEXT NOT NULL,restock_time INTEGER,time_accuracy TEXT,projection_json TEXT NOT NULL,quantity INTEGER,created_at INTEGER NOT NULL)").run();
    const result = await db.prepare("INSERT OR IGNORE INTO foreign_travel_feedback (report_id,country,item_id,captured_at,checked_at,available,restocked,restock_time,time_accuracy,projection_json,quantity,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(b.report_id, p.country, p.item_id, p.captured_at, o.checked_at, o.available, o.restocked, o.restocked === "yes" ? o.restock_time : null, o.restocked === "yes" ? o.time_accuracy : null, JSON.stringify(p).slice(0, 4e3), o.quantity ?? null, Math.floor(Date.now() / 1e3)).run();
    return reply2({ ok: true, duplicate: !result.meta?.changes }, result.meta?.changes ? 201 : 200);
  } catch {
    return reply2({ error: "Feedback storage unavailable" }, 503);
  }
}
__name(submitTravelFeedback, "submitTravelFeedback");

// src/foreign/collector.js
var URL2 = "https://yata.yt/api/v1/travel/export/";
var countries4 = /* @__PURE__ */ new Set(["mex", "cay", "can", "haw", "uni", "arg", "swi", "jap", "chi", "uae", "sou"]);
async function collectForeignStock(env) {
  const db = env.FOREIGN_DB;
  if (!db) throw new Error("FOREIGN_DB binding missing");
  const now2 = Math.floor(Date.now() / 1e3);
  let response, body;
  try {
    response = await fetch(URL2, { headers: { accept: "application/json", "user-agent": "TU-Foreign-Stock/1.0" }, signal: AbortSignal.timeout(15e3) });
    if (!response.ok) throw new Error("YATA HTTP " + response.status);
    body = await response.json();
    if (!body || typeof body !== "object" || !body.stocks || typeof body.stocks !== "object") throw new Error("Invalid YATA stock response");
  } catch (e) {
    await db.prepare(`INSERT INTO foreign_provider_health(provider,last_attempt_at,last_error,consecutive_failures,updated_at)
  VALUES('yata',?,?,1,?) ON CONFLICT(provider) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,last_error=excluded.last_error,consecutive_failures=foreign_provider_health.consecutive_failures+1,updated_at=excluded.updated_at`).bind(now2, String(e).slice(0, 400), now2).run();
    throw e;
  }
  let inserted = 0, events = 0, latest = 0;
  for (const [country, data] of Object.entries(body.stocks)) {
    if (!countries4.has(country) || !data || !Array.isArray(data.stocks)) continue;
    const observed = Number(data.update);
    if (!Number.isSafeInteger(observed) || observed <= 0 || observed > now2 + 300) continue;
    latest = Math.max(latest, observed);
    for (const item of data.stocks) {
      const id = Number(item.id), qty = Number(item.quantity), price = Number(item.cost);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(qty) || qty < 0 || qty > 1e9) continue;
      const prior = await db.prepare("SELECT quantity,source_observed_at FROM foreign_stock_observations WHERE country=? AND item_id=? AND provider=? ORDER BY source_observed_at DESC LIMIT 1").bind(country, id, "yata").first();
      if (prior && observed <= prior.source_observed_at) continue;
      const result = await db.prepare("INSERT OR IGNORE INTO foreign_stock_observations(country,item_id,quantity,unit_price,provider,source_observed_at,collected_at) VALUES(?,?,?,?,?,?,?)").bind(country, id, qty, Number.isSafeInteger(price) && price >= 0 ? price : null, "yata", observed, now2).run();
      if (!result.meta?.changes) continue;
      inserted++;
      if (prior && qty > prior.quantity) {
        await db.prepare(`INSERT OR IGNORE INTO foreign_restock_events(country,item_id,provider,previous_observed_at,detected_observed_at,quantity_before,quantity_after,confidence)
    VALUES(?,?,?,?,?,?,?,'observed_increase')`).bind(country, id, "yata", prior.source_observed_at, observed, prior.quantity, qty).run();
        events++;
      }
    }
  }
  await db.prepare(`INSERT INTO foreign_provider_health(provider,last_attempt_at,last_success_at,last_source_observed_at,last_http_status,last_error,consecutive_failures,updated_at)
 VALUES('yata',?,?,?,?,NULL,0,?) ON CONFLICT(provider) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,last_success_at=excluded.last_success_at,last_source_observed_at=excluded.last_source_observed_at,last_http_status=excluded.last_http_status,last_error=NULL,consecutive_failures=0,updated_at=excluded.updated_at`).bind(now2, now2, latest || null, response.status, now2).run();
  return { inserted, events, latest };
}
__name(collectForeignStock, "collectForeignStock");
async function foreignStatus(env) {
  const health = await env.FOREIGN_DB.prepare("SELECT provider,last_attempt_at,last_success_at,last_source_observed_at,last_http_status,consecutive_failures FROM foreign_provider_health WHERE provider=?").bind("yata").first();
  const counts = await env.FOREIGN_DB.prepare("SELECT COUNT(*) AS observations,COUNT(DISTINCT country) AS countries FROM foreign_stock_observations").first();
  return { provider: health || null, observations: counts?.observations || 0, countries: counts?.countries || 0 };
}
__name(foreignStatus, "foreignStatus");

// src/index.js
var protectedModules = [
  { pattern: new RegExp("^/api/marbles(?:/|$)"), id: "chaos-marbles" },
  { pattern: new RegExp("^/api/connect(?:/|$)"), id: "torn-four" },
  { pattern: new RegExp("^/api/battleship(?:/|$)"), id: "torn-fleet" },
  { pattern: new RegExp("^/api/rooms(?:/|$)"), id: "tic-tac-toe" }
];
async function requireModuleAccess(req, env, moduleId) {
  const checkUrl = new URL("/api/auth/module-access?module_id=" + encodeURIComponent(moduleId), req.url);
  const result = await handleAuth(new Request(checkUrl, { method: "GET", headers: { authorization: req.headers.get("authorization") || "" } }), env, checkUrl);
  if (result.status === 200) return null;
  return json({ error: "Module access denied", module_id: moduleId, authorization_status: result.status }, result.status);
}
__name(requireModuleAccess, "requireModuleAccess");
var json = /* @__PURE__ */ __name((v, s = 200) => new Response(JSON.stringify(v), { status: s, headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" } }), "json");
var headers = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type, authorization, x-tu-room-token" };
var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var code = /* @__PURE__ */ __name(() => Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => alphabet[x % alphabet.length]).join(""), "code");
var token = /* @__PURE__ */ __name(() => crypto.randomUUID() + crypto.randomUUID(), "token");
var winLines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function outcome(b) {
  for (const [a, c, d] of winLines) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? "draw" : null;
}
__name(outcome, "outcome");
var publicState = /* @__PURE__ */ __name((g) => ({ room: g.room, board: g.board, turn: g.turn, winner: g.winner, ready: !!g.players.O, version: g.version, names: g.names || { X: "Player X", O: "Player O" }, moves: g.moves || 0, round: g.round || 1, rematch: g.rematch || { X: false, O: false } }), "publicState");
var playerName = /* @__PURE__ */ __name(async (req) => {
  try {
    const b = await req.json();
    const name = String(b.name || "").trim(), id = String(b.playerId || "");
    return /^[A-Za-z0-9_-]{2,32}$/.test(name) && /^\d{1,12}$/.test(id) ? { name, id } : null;
  } catch {
    return null;
  }
}, "playerName");
var GameRoom = class {
  static {
    __name(this, "GameRoom");
  }
  constructor(state) {
    this.state = state;
  }
  async fetch(req) {
    const url = new URL(req.url), room = url.pathname.split("/")[2], g = await this.state.storage.get("game");
    if (req.method === "POST" && url.pathname.endsWith("/create")) {
      if (g) return json({ error: "Room exists" }, 409);
      const secret2 = token(), identity = await playerName(req);
      if (!identity) return json({ error: "Torn player identity required" }, 400);
      const game = { room, board: Array(9).fill(null), turn: "X", winner: null, players: { X: secret2, O: null }, names: { X: identity.name, O: "Player O" }, ids: { X: identity.id, O: null }, moves: 0, round: 1, rematch: { X: false, O: false }, version: 1 };
      await this.state.storage.put("game", game);
      return json({ room, token: secret2, symbol: "X", game: publicState(game) }, 201);
    }
    if (!g) return json({ error: "Room not found" }, 404);
    if (req.method === "POST" && url.pathname.endsWith("/join")) {
      if (g.players.O) return json({ error: "Room full" }, 409);
      const identity = await playerName(req);
      if (!identity) return json({ error: "Torn player identity required" }, 400);
      if (g.ids?.X === identity.id) return json({ error: "Cannot join your own room" }, 409);
      const secret2 = token();
      g.players.O = secret2;
      g.names.O = identity.name;
      g.ids = { ...g.ids || {}, O: identity.id };
      g.version++;
      await this.state.storage.put("game", g);
      return json({ room, token: secret2, symbol: "O", game: publicState(g) });
    }
    const secret = req.headers.get("x-tu-room-token") || "";
    const symbol = secret && (g.players.X === secret ? "X" : g.players.O === secret ? "O" : null);
    if (!symbol) return json({ error: "Unauthorized" }, 401);
    if (req.method === "GET" && url.pathname.endsWith("/state")) return json({ symbol, game: publicState(g) });
    if (req.method === "POST" && url.pathname.endsWith("/rematch")) {
      if (!g.players.O) return json({ error: "Waiting for opponent" }, 409);
      if (!g.winner) return json({ error: "Finish this game before rematching" }, 409);
      g.rematch ||= { X: false, O: false };
      g.rematch[symbol] = true;
      if (g.rematch.X && g.rematch.O) {
        g.board = Array(9).fill(null);
        g.winner = null;
        g.moves = 0;
        g.turn = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0 ? "X" : "O";
        g.round = (g.round || 1) + 1;
        g.rematch = { X: false, O: false };
      }
      g.version++;
      await this.state.storage.put("game", g);
      return json({ symbol, game: publicState(g) });
    }
    if (req.method === "POST" && url.pathname.endsWith("/move")) {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const i = body.index;
      if (!g.players.O) return json({ error: "Waiting for opponent" }, 409);
      if (g.winner) return json({ error: "Game finished" }, 409);
      if (g.turn !== symbol) return json({ error: "Not your turn" }, 409);
      if (!Number.isInteger(i) || i < 0 || i > 8 || g.board[i]) return json({ error: "Illegal move" }, 400);
      g.board[i] = symbol;
      g.moves = (g.moves || 0) + 1;
      g.winner = outcome(g.board);
      g.turn = symbol === "X" ? "O" : "X";
      g.version++;
      await this.state.storage.put("game", g);
      return json({ symbol, game: publicState(g) });
    }
    return json({ error: "Not found" }, 404);
  }
};
var newBoard = /* @__PURE__ */ __name((kind) => kind === "connect" ? Array(42).fill(null) : null, "newBoard");
var connectWin = /* @__PURE__ */ __name((b) => {
  for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
    const a = b[row * 7 + col];
    if (!a) continue;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let ok2 = true;
      for (let k = 1; k < 4; k++) {
        const y = row + dr * k, x = col + dc * k;
        if (y < 0 || y >= 6 || x < 0 || x >= 7 || b[y * 7 + x] !== a) {
          ok2 = false;
          break;
        }
      }
      if (ok2) return a;
    }
  }
  return b.every(Boolean) ? "draw" : null;
}, "connectWin");
var fleet = [3, 2, 2];
var validateShips = /* @__PURE__ */ __name((ships) => {
  if (!Array.isArray(ships) || ships.length !== 3) return null;
  const occupied = /* @__PURE__ */ new Set();
  for (let n = 0; n < 3; n++) {
    const cells = ships[n];
    if (!Array.isArray(cells) || cells.length !== fleet[n] || !cells.every((i) => Number.isInteger(i) && i >= 0 && i < 64) || new Set(cells).size !== cells.length) return null;
    const rows = cells.map((i) => Math.floor(i / 8)), cols = cells.map((i) => i % 8);
    if (!(rows.every((v) => v === rows[0]) && Math.max(...cols) - Math.min(...cols) === cells.length - 1 || cols.every((v) => v === cols[0]) && Math.max(...rows) - Math.min(...rows) === cells.length - 1)) return null;
    for (const i of cells) {
      if (occupied.has(i)) return null;
      occupied.add(i);
    }
  }
  return [...occupied];
}, "validateShips");
var safeState = /* @__PURE__ */ __name((g, symbol) => {
  if (g.kind === "connect") return { room: g.room, kind: g.kind, board: g.board, turn: g.turn, winner: g.winner, ready: !!g.players.O, moves: g.moves };
  const other = symbol === "X" ? "O" : "X";
  return { room: g.room, kind: g.kind, turn: g.turn, winner: g.winner, ready: !!g.players.O, placed: { X: !!g.ships.X, O: !!g.ships.O }, myShips: g.ships[symbol] || [], myShots: g.shots[symbol], incoming: g.shots[other], moves: g.moves };
}, "safeState");
var ArcadeRoom = class {
  static {
    __name(this, "ArcadeRoom");
  }
  constructor(state) {
    this.state = state;
  }
  async fetch(req) {
    const url = new URL(req.url), parts = url.pathname.split("/"), room = parts[2], kind = parts[3], action = parts[4];
    let g = await this.state.storage.get("game");
    if (action === "create" && req.method === "POST") {
      if (g) return json({ error: "Room exists" }, 409);
      const secret2 = token();
      g = { room, kind, board: newBoard(kind), players: { X: secret2, O: null }, turn: "X", winner: null, moves: 0, ships: { X: null, O: null }, shots: { X: [], O: [] } };
      await this.state.storage.put("game", g);
      return json({ room, token: secret2, symbol: "X", game: safeState(g, "X") }, 201);
    }
    if (!g || g.kind !== kind) return json({ error: "Room not found" }, 404);
    if (action === "join" && req.method === "POST") {
      if (g.players.O) return json({ error: "Room full" }, 409);
      const secret2 = token();
      g.players.O = secret2;
      await this.state.storage.put("game", g);
      return json({ room, token: secret2, symbol: "O", game: safeState(g, "O") });
    }
    const secret = req.headers.get("x-tu-room-token") || "";
    const symbol = secret && (g.players.X === secret ? "X" : g.players.O === secret ? "O" : null);
    if (!symbol) return json({ error: "Unauthorized" }, 401);
    if (action === "state" && req.method === "GET") return json({ symbol, game: safeState(g, symbol) });
    if (action === "move" && req.method === "POST") {
      if (!g.players.O) return json({ error: "Waiting for opponent" }, 409);
      if (g.winner) return json({ error: "Game finished" }, 409);
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      if (kind === "connect") {
        if (g.turn !== symbol) return json({ error: "Not your turn" }, 409);
        const col = body.index;
        if (!Number.isInteger(col) || col < 0 || col > 6) return json({ error: "Invalid column" }, 400);
        let idx = -1;
        for (let row = 5; row >= 0; row--) if (!g.board[row * 7 + col]) {
          idx = row * 7 + col;
          break;
        }
        if (idx < 0) return json({ error: "Column full" }, 409);
        g.board[idx] = symbol;
        g.winner = connectWin(g.board);
        g.moves++;
        g.turn = symbol === "X" ? "O" : "X";
      } else {
        if (body.ships !== void 0) {
          if (g.ships[symbol]) return json({ error: "Fleet already placed" }, 409);
          const ships = validateShips(body.ships);
          if (!ships) return json({ error: "Invalid fleet placement" }, 400);
          g.ships[symbol] = ships;
        } else {
          if (!g.ships.X || !g.ships.O) return json({ error: "Waiting for fleets" }, 409);
          if (g.turn !== symbol) return json({ error: "Not your turn" }, 409);
          const i = body.index;
          if (!Number.isInteger(i) || i < 0 || i >= 64 || g.shots[symbol].includes(i)) return json({ error: "Invalid target" }, 400);
          g.shots[symbol].push(i);
          g.moves++;
          const other = symbol === "X" ? "O" : "X";
          if (g.ships[other].every((v) => g.shots[symbol].includes(v))) g.winner = symbol;
          g.turn = other;
        }
      }
      await this.state.storage.put("game", g);
      return json({ symbol, game: safeState(g, symbol) });
    }
    return json({ error: "Not found" }, 404);
  }
};
var marblePublic = /* @__PURE__ */ __name((g) => ({ room: g.room, kind: "marbles", count: g.count, players: g.players.map(Boolean), turn: g.turn, marbles: g.marbles, roll: g.roll, winner: g.winner, moves: g.moves, rolls: g.rolls, ready: g.players.every(Boolean) }), "marblePublic");
var marbleLegal = /* @__PURE__ */ __name((g, p, i) => {
  const v = g.marbles[p][i], r = g.roll;
  if (!Number.isInteger(i) || i < 0 || i > 2 || r === null || v === 35) return false;
  const d = v === -1 ? r === 6 ? 0 : -1 : v + r;
  return d >= 0 && d <= 35 && !g.marbles[p].some((x, j) => j !== i && x === d);
}, "marbleLegal");
var MarbleRoom = class {
  static {
    __name(this, "MarbleRoom");
  }
  constructor(state) {
    this.state = state;
  }
  async fetch(req) {
    const parts = new URL(req.url).pathname.split("/"), room = parts[2], action = parts[3];
    let g = await this.state.storage.get("game");
    if (action === "create" && req.method === "POST") {
      if (g) return json({ error: "Room exists" }, 409);
      let b = {};
      try {
        b = await req.json();
      } catch {
      }
      const count = b.count;
      if (!Number.isInteger(count) || count < 2 || count > 4) return json({ error: "Choose 2\u20134 players" }, 400);
      const secret2 = token();
      g = { room, count, players: [secret2, ...Array(count - 1).fill(null)], turn: 0, marbles: Array.from({ length: count }, () => [-1, -1, -1]), roll: null, rolls: 0, moves: 0, winner: null };
      await this.state.storage.put("game", g);
      return json({ room, token: secret2, player: 0, game: marblePublic(g) }, 201);
    }
    if (!g) return json({ error: "Room not found" }, 404);
    if (action === "join" && req.method === "POST") {
      const p2 = g.players.indexOf(null);
      if (p2 < 0) return json({ error: "Room full" }, 409);
      const secret2 = token();
      g.players[p2] = secret2;
      await this.state.storage.put("game", g);
      return json({ room, token: secret2, player: p2, game: marblePublic(g) });
    }
    const secret = req.headers.get("x-tu-room-token") || "", p = g.players.indexOf(secret);
    if (!secret || p < 0) return json({ error: "Unauthorized" }, 401);
    if (action === "state" && req.method === "GET") return json({ player: p, game: marblePublic(g) });
    if (req.method === "POST" && (action === "roll" || action === "move")) {
      if (!g.players.every(Boolean)) return json({ error: "Waiting for players" }, 409);
      if (g.winner !== null) return json({ error: "Game finished" }, 409);
      if (g.turn !== p) return json({ error: "Not your turn" }, 409);
      if (action === "roll") {
        if (g.roll !== null) return json({ error: "Move a marble first" }, 409);
        g.roll = 1 + Math.floor(Math.random() * 6);
        g.rolls++;
        if (!g.marbles[p].some((_, i) => marbleLegal(g, p, i))) {
          const extra = g.roll === 6;
          g.roll = null;
          if (!extra) g.turn = (p + 1) % g.count;
        }
      } else {
        let b;
        try {
          b = await req.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        if (!marbleLegal(g, p, b.index)) return json({ error: "Illegal marble move" }, 400);
        const i = b.index, v = g.marbles[p][i], r = g.roll, d = v === -1 ? 0 : v + r;
        g.marbles[p][i] = d;
        if (d < 32) {
          const square = (p * 8 + d) % 32;
          for (let other = 0; other < g.count; other++) {
            if (other === p) continue;
            for (let j = 0; j < 3; j++) {
              const x = g.marbles[other][j];
              if (x >= 0 && x < 32 && (other * 8 + x) % 32 === square) g.marbles[other][j] = -1;
            }
          }
        }
        g.moves++;
        if (g.marbles[p].every((x) => x === 35)) g.winner = p;
        else if (r !== 6) g.turn = (p + 1) % g.count;
        g.roll = null;
      }
      await this.state.storage.put("game", g);
      return json({ player: p, game: marblePublic(g) });
    }
    return json({ error: "Not found" }, 404);
  }
};
var index_default = { async scheduled(event, env, ctx) {
  ctx.waitUntil(collectForeignStock(env));
}, async fetch(req, env) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/auth/")) return handleAuth(req, env, url);
  const protectedModule = protectedModules.find((p) => p.pattern.test(url.pathname));
  if (protectedModule) {
    const denied = await requireModuleAccess(req, env, protectedModule.id);
    if (denied) return denied;
  }
  if (url.pathname === "/api/foreign/observations") return submitForeignSnapshot(req, env);
  if (url.pathname === "/api/foreign/feedback") return submitTravelFeedback(req, env);
  if (url.pathname === "/api/foreign/history" || url.pathname === "/api/foreign/restocks" || url.pathname === "/api/foreign/prediction") return handleForeignApi(req, env, url);
  if (url.pathname === "/api/foreign/overview") return req.method === "GET" ? foreignOverview(env) : json({ error: "Method not allowed" }, 405);
  if (req.method === "GET" && url.pathname === "/api/foreign/status") {
    try {
      return json(await foreignStatus(env));
    } catch {
      return json({ error: "Stock status unavailable" }, 503);
    }
  }
  if (url.pathname === "/health") return json({ ok: true, version: "0.2.0" });
  const marble = url.pathname.match(/^\/api\/marbles(?:\/([A-HJ-NP-Z2-9]{6})\/(join|state|roll|move))?$/);
  if (marble) {
    const room = marble[1] || code(), action = marble[2] || "create";
    if (!marble[1] && req.method !== "POST") return json({ error: "Not found" }, 404);
    const stub2 = env.MARBLES.get(env.MARBLES.idFromName("marbles:" + room));
    return stub2.fetch(new Request(url.origin + "/rooms/" + room + "/" + action, req));
  }
  const arcade = url.pathname.match(/^\/api\/(connect|battleship)(?:\/([A-HJ-NP-Z2-9]{6})\/(join|state|move))?$/);
  if (arcade) {
    const kind = arcade[1], room = arcade[2] || code(), action = arcade[3] || "create";
    if (!arcade[2] && req.method !== "POST") return json({ error: "Not found" }, 404);
    const stub2 = env.ARCADE.get(env.ARCADE.idFromName(kind + ":" + room));
    return stub2.fetch(new Request(url.origin + "/rooms/" + room + "/" + kind + "/" + action, req));
  }
  if (req.method === "POST" && url.pathname === "/api/rooms") {
    const room = code(), stub2 = env.GAME.get(env.GAME.idFromName(room));
    return stub2.fetch(new Request(url.origin + "/rooms/" + room + "/create", req));
  }
  const m = url.pathname.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{6})\/(join|state|move|rematch)$/);
  if (!m) return json({ error: "Not found" }, 404);
  const stub = env.GAME.get(env.GAME.idFromName(m[1]));
  return stub.fetch(new Request(url.origin + "/rooms/" + m[1] + "/" + m[2], req));
} };
export {
  ArcadeRoom,
  GameRoom,
  MarbleRoom,
  index_default as default
};
//# sourceMappingURL=index.js.map