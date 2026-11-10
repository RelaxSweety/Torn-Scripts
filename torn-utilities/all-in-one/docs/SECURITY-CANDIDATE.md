# Unpublished TU security candidate

The currently published DEV client is **0.5.42.84-dev**. The prepared next client is **0.5.42.85-dev**, generated only into `/tmp` for validation. Worker changes are checked-in source, not a deployed service. Agreement 1.2 remains active; the exact approved 1.3 draft remains unchanged and unpublished.

## Client preparation

`npm run build:security-candidate` generates a distinct next-version candidate with updates disabled. `npm run test:security-candidate` exercises the client integration. The old foreign-submission preview flag remains an alias.

The candidate combines authenticated stock uploads through PDA POST/GM/fetch with verified private session-token persistence on supported userscript managers. Tokens are removed from Torn-origin session fields only after private writes verify. Authorization and identity caches contain nonsensitive session markers rather than token copies. Invalid/unavailable private storage does not silently fall back. PDA/unsupported hosts still use unencrypted origin storage, which is a material residual exposure. Existing private key storage behavior remains.

Privileged data-request methods and arbitrary transport callbacks are no longer exported through pageWindow.TornUtilities. Integrated modules receive their capability through a lexical closure. The public status/navigation API remains. War Organizer API paths are restricted to the exact used faction-member, faction-snapshot and player-profile reads; traversal, query credentials and extra scopes are rejected. This can affect separately installed scripts that previously called privileged Manager methods. A compromised page, browser, extension or userscript manager is not made safe by these changes; typed/revealed keys also remain observable while in the page DOM.

Per-tab private session records expire for use after at most 24 hours, with server expiry always authoritative. Expired records are removed when read; closed/orphaned private records are not guaranteed to be deleted by a background process. Browser/userscript-manager backups and sync have their own retention. Do not promise automatic deletion of all copies.

Stock delivery now enforces a persisted retry deadline, pauses on 429/401/403 and other HTTP errors without trying another transport, bounds transport waits, validates the exact acknowledged item IDs, and preserves the pending batch on failure. Only network failures may fall through to another transport, and only for these idempotent stock reports. Torn gameplay actions do not use this retry helper.

Promotion is prepared through `securityBundle: true` on the next release entry. Before an authorized publication, add the actual release entry, update Manager metadata/TU_VERSION, build the normal distribution and diagnostics, and run the full suite against those artifacts. Do not set this flag on the existing immutable .84 release. The preview alone does not publish an update.

## Additional Worker preparation

- Foreign write reservations: one shared SubmissionBudget object; **60 submissions/account, 120/IP, 500 globally per rolling 60 seconds**, covering observations and feedback together. Hashes and timestamps only; fail closed when missing/unavailable; Retry-After on limits; expiry alarms. Other applications and Cloudflare egress sharing remain outside this scope.
- Strict numeric observations prevent null/string/boolean quantities becoming false zero-stock readings. Conflicting same-time stock buckets are excluded consistently from history, derived stock increases and overview; a submitted observation is still not independently verified truth.
- Every multiplayer seat uses verified identity and requires its matching account plus room token. Own-room joins are rejected. Durable Object request processing is serialized; request JSON is bounded. Legacy rooms lacking verified IDs must be recreated rather than trusted retroactively.
- Administrator updates include current actor/target guards. Stale status changes cannot reactivate concurrently revoked accounts; permission writes cannot target a newly promoted administrator. Account status and session revocation commit/roll back in a D1 batch. Registration cannot create a session after concurrent suspension/revocation. Replayed agreement cancellations retry session revocation.
- Registration retains its separate global/key/IP reservation budget, structured safe errors, header-only API keys and hashed session-token database storage. JSON body reads are byte-bounded with a five-second read deadline.

## Validation and limits

Full repository tests and an isolated normal .85 candidate build are validated separately. The candidate's normal build uses a copied checkout under `/tmp`; published files are not replaced to run it. SQLite tests exercise actual admin mutation guards/rollback and observation grouping queries. Cloudflare Wrangler dry-run and Miniflare/workerd tests exercise actual local SQLite Durable Objects, alarms being scheduled, concurrent budgets and room joins. Alarm expiry cleanup also has deterministic clock-controlled unit coverage; no claim of live alarm execution is made.

Wrangler/Miniflare are optional local tools, not new client dependencies. A reproducible smoke test is available as:

```
node tests/cloudflare-local-runtime.mjs <miniflare module path> <Wrangler dry-run Worker bundle>
```

Remote migration history, Cloudflare operator roles/logging/retention/backups, real Torn/PDA testing and agreement publication remain operational/release gates. Local runtime success does not deploy or verify the live service. See the [implementation checklist](../../development/CHANGE-IMPLEMENTATION-CHECKLIST.md).
