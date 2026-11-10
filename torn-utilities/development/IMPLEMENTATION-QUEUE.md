# Implementation queue

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

## Next identified issue — foreign submission authorization

The checked-in router sends `/api/foreign/observations` and `/api/foreign/feedback` directly to their write handlers without a session/module authorization gate. Review the intended public-crowdsourcing policy, payload bounds and submission abuse protection; any authenticated submission change also needs compatible client transport. This finding is about source, not a verified live exploit. No change to those routes is included in the multiplayer patch.

## Remaining audit work

Operational backend key/log protection and remaining PDA/session/callable-API exposures; current Torn scripting-rule/approval verification and the inherited Chat Archiver questions; backend-wide request/retention/access verification. Agreement UI/publication work stays queued under the explicit hold above.
