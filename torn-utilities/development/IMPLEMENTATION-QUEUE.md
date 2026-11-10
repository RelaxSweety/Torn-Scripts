# Implementation queue

Current consolidated status: [change implementation checklist](CHANGE-IMPLEMENTATION-CHECKLIST.md).

## Approved agreement 1.3 — queued, explicitly not implemented

The user approved [this exact agreement draft](../agreements/drafts/1.3-approved-not-active.md) in this conversation and explicitly instructed that it not yet be implemented. Do not edit the active agreement manifest, serve this text as current, trigger renewed acceptance, or deploy agreement changes until the user authorizes implementation.

SHA-256 of approved draft: `ca2902b5cb38dd69ebdcd2c6cd8b0e7aa816796ccd339e81668df31a199e9d25`.

Current active checked-in agreement remains 1.2 / number 3. The draft proposes 1.3 / number 4; check availability before eventual publication. Approval of the draft does not fill its private-support-contact placeholder or establish deployed retention/logging controls or the external YATA terms URL. Preserve the approval; resolve these publication details during implementation without treating the entire draft as unapproved again.

Required eventual work: finish the private contact/external terms details; verify operational claims; render the disclosure table at every key-entry surface; verify opt-in and key/data behavior; test renewed acceptance; then publish to DEV only when authorized. Never publish merely by updating the active manifest as a bookkeeping step.

## Completed next issue — TU client API request management (.83)

Implemented a shared TU client request budget across keys, persistent suspension of invalid/disabled keys, explicit user verification to restore a suspended key, and structured limit errors. Cover Manager and bundled-module API transports without modifying Torn website gameplay requests. Account-wide traffic from unrelated applications and server-side verification requires separate coordination; do not claim this client budget controls it.

Validation: full DEV regression suite and targeted API governor tests passed. See [scope and limitations](../all-in-one/docs/API-REQUEST-GOVERNOR.md). This client safeguard does not control unrelated applications or replace server-side/IP-level management.

## Completed next issue — client credential storage isolation (.84)

Implemented verified userscript-private credential migration and storage, private-mode masked DOM handling, failure-safe migration and explicit PDA fallback. See [scope and remaining limits](../all-in-one/docs/CREDENTIAL-STORAGE.md). The active agreement remains unchanged. Before eventual agreement publication, review an amendment to the approved draft storage section to reflect these new modes; preserve the exact approved draft until then.

## Prepared next issue — backend credential/error handling (deployment held)

Worker source now bounds registration body reads, validates exact 16-character keys, separates Torn rate limits/outages from rejected credentials, and excludes arbitrary exception text from public errors and application failure logs. Regression fixtures verify header-only keys and hashed session-token database writes. See [backend scope and validation](../all-in-one/docs/BACKEND-CREDENTIAL-SAFETY.md). These changes are not deployed; the live backend and operational logging/access/retention settings remain unverified. No client release or agreement change is included.

## Prepared next issue — shared backend registration budget (deployment held)

Added a Durable Object reservation budget before registration contacts Torn: at most 500 registrations globally, 10 per key and 20 per client IP in a rolling 70-second window, reserving two Torn reads per registration. Missing/unavailable limiter fails closed. Only SHA-256 key/IP fingerprints enter short-lived limiter state; expiry alarms prune them. Unit fixtures cover concurrent limits, restarts, rolling expiry, unavailable/denied limiter behavior and unauthenticated private-route rejection. See [deployment requirements and limits](../all-in-one/docs/BACKEND-REGISTRATION-BUDGET.md).

The DEV Worker binding/migration is prepared only. Verify existing remote migration history and runtime behavior before an authorized deployment. No deployment, active agreement change, or client release is included.

## Prepared next issue — session-bound multiplayer identity (deployment held)

Authorization fixtures now cover expired/revoked sessions, account status, agreement/permission denial, administrator rejection and session ownership. Found and fixed caller-controlled Tic-Tac-Toe player identity: room creation/join now uses the verified server session, and room tokens require the corresponding authenticated player. No client protocol change is required. See [scope and compatibility](../all-in-one/docs/BACKEND-AUTHORIZATION.md). Worker deployment remains held; DEV client and agreement are unchanged.

## Prepared next issue — foreign submission authorization and payload bounds (deployment held)

The Worker source now requires active Item Monitor authorization and current agreement acceptance for observation/feedback writes. Observation and feedback bodies are stream-bounded, and feedback projection storage uses only defined fields. Client compatibility is prepared in an unpublished builder preview covering PDA POST, GM and fetch; default `.84` artifacts remain byte-for-byte unchanged. End-to-end preview tests confirm authenticated queued stock delivery. See [coordinated rollout and limits](../all-in-one/docs/FOREIGN-SUBMISSION-AUTHORIZATION.md).

Do not deploy this Worker without the compatible client rollout: current published `.84` stock reports do not carry the new session header. No Worker deployment or client publication is included here.

## Completed remaining code preparation — unpublished .85 security candidate

Prepared shared foreign-write limits, strict stock values/conflict filtering, all multiplayer seat ownership and serialized mutations, atomic guarded administrator writes, concurrent registration restriction checks, private session-token storage/cache-marker migration, a private integrated capability bridge, narrow API paths, and enforced stock-upload cooldown/receipt validation. The disclosure table component is prepared but not mounted under the agreement hold. See [security candidate scope](../all-in-one/docs/SECURITY-CANDIDATE.md).

The standard .84 build remains unchanged. The .85 candidate can be built under /tmp; `securityBundle: true` is prepared for eventual versioned promotion, not enabled on the .84 release entry. Full suite, isolated candidate build, SQLite tests and local Cloudflare validation are recorded in the checklist/evidence report.

## Remaining release/operational gates

No further generic “next issue” loop is needed for this preparation batch. Execute the checklist in order when authorized: inspect remote migration history and Cloudflare access/log/retention controls; confirm supported host behavior and compatibility; promote the client before enabling authenticated Worker writes; perform DEV smoke tests/monitoring and rollback checks. Recreate legacy multiplayer rooms lacking verified IDs.

Agreement UI/publication stays explicitly held. Review the separate storage/disclosure amendment, private contact, YATA/source conditions and final metadata before eventual implementation. Use the rules text already supplied in this conversation; retain the distinction between its API requirements and any separate scripting approval scope. No blanket compliance certification or production change is claimed.
