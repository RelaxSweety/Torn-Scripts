# TU change implementation checklist

**Current DEV client release:** 0.5.42.85-dev. **Agreement:** active 1.2; revised 1.3 approved and held. This checklist retains the earlier preparation and rollout plan; its historical deployment assumptions are not evidence of live service state.

A checked box means the stated preparation or test is complete. It does not mean a prepared change is live. This checklist uses the Torn rules/API text already pasted into the conversation; no repeat submission is required.

## 1. Completed code preparation

- [x] Client API budget across TU keys/transports; invalid/disabled-key suspension and explicit revalidation (.83, present in .84).
- [x] Verified userscript-private key storage, migration, masked/reveal controls and explicit PDA fallback (.84).
- [x] Backend exact key validation, header-only key verification, bounded/deadlined bodies, safe error classes and hashed session storage.
- [x] Shared registration limiter: 500 registrations globally, 10/key and 20/IP per rolling 70 seconds; reserve both potential Torn reads; missing limiter blocks verification.
- [x] Stock/feedback session, account, module-permission and current-agreement checks.
- [x] Authenticated PDA POST, GM and fetch stock transports in the .85 candidate; opt-in and upload queues preserved.
- [x] Shared submission limiter: 60/account, 120/IP and 500 total per rolling 60 seconds; hashes/timestamps only; expiry cleanup; missing limiter blocks writes.
- [x] Strict numeric stock values, bounded feedback fields and exclusion of conflicting same-time observations from history/restock estimates/overview.
- [x] Real upload retry deadlines, bounded waits, exact receipt-ID validation, and no transport fallback after an HTTP rejection. Failed reports stay queued.
- [x] All multiplayer seats bound to verified accounts plus room tokens; self-join rejection and serialized Durable Object processing.
- [x] Administrator mutations guarded against changed actor/target authority; status and session revocation use an atomic batch; registration cannot issue a session after concurrent restriction.
- [x] Private session-token storage where supported; raw token copies removed from origin authorization/identity caches after verified migration; private capability bridge and scoped API paths in the candidate.
- [x] Disclosure-table component and separate storage/disclosure amendment prepared without mounting UI, editing the approved draft or triggering new acceptance.
- [x] Consolidated rules assessment, remaining provider checks, compatibility notes and rollout/rollback procedure prepared.

## 2. Validation completed

- [x] Normal .84 build and diagnostics checks confirm published artifacts remain unchanged.
- [x] Full repository regression suite passes, including new backend/security fixtures.
- [x] Isolated normal .85 candidate build and full regression suite pass; no real release file was replaced for testing.
- [x] End-to-end queued reporting tests pass for PDA POST, GM, fetch and private-manager storage.
- [x] SQLite tests cover administrator races/atomic rollback and stock aggregation queries.
- [x] Cloudflare Wrangler local dry-run bundles all intended bindings without deployment.
- [x] Local Miniflare/workerd tests cover SQLite Durable Object limits/alarm scheduling, simultaneous joins, D1 permission upserts and atomic status/session writes.
- [x] Deterministic limiter tests cover window expiry, cleanup and restart persistence.
- [x] Supplied API-rules text and Quick Items approval report assessed with explicit limits; no blanket Torn certification claimed.

See [validation evidence](validation-evidence.json) and [candidate scope](../all-in-one/docs/SECURITY-CANDIDATE.md).

## 3. Operational gates before Worker deployment

These require the actual Cloudflare account/configuration; local tests cannot establish them.

- [ ] Verify DEV account, Worker, D1 databases, current deployed version and existing Durable Object migration history. Reconcile the prepared registration/submission migration tags with that history; do not recreate/delete existing game namespaces.
- [ ] Verify operator membership/least privilege, account protection, API-token scopes and access to D1, logs, exports and backups.
- [ ] Verify what provider request/trace/security logs retain, who can access them, and whether bodies/Authorization headers are captured. Application redaction does not establish provider behavior. Remove any real credential capture before rollout.
- [ ] Record actual account/session/audit/game/stock/feedback/log/backup retention and deletion procedures. Do not invent automatic deletion guarantees or equate session expiry/counter expiry with deletion of every record/copy.
- [ ] Verify outbound/IP-wide API usage coordination and account-wide usage with other tools. TU's own budgets do not control unrelated apps or prove Cloudflare egress isolation.
- [ ] Validate supported real PDA/userscript-manager versions, private-storage behavior and reload/session recovery. Device tests must identify the installed build before assessing a diagnostic report.

## 4. Agreement hold — separate authorization required

**Do not perform these while the existing hold remains.** The user explicitly approved the draft and instructed that it not yet be implemented; that approval is preserved.

- [ ] Review the [separate storage amendment](AGREEMENT-STORAGE-AMENDMENT-REVIEW.md) covering private storage, PDA fallback, session records and authenticated reporting; do not silently rewrite the approved file.
- [ ] Confirm the private support contact and applicable YATA/source-data terms. Establish actual provider/retention facts for the disclosure.
- [ ] When implementation is authorized, confirm an available agreement number/effective date and mount the table visibly at every key-entry surface. Test decline, accept, cancellation, reacceptance, version changes and all optional-reporting defaults.
- [ ] Publish the agreement only when authorized and ready. Updating the active manifest can synchronize the Worker registry; it is not a harmless bookkeeping change.

## 5. Ordered DEV rollout

The client and Worker must be coordinated. Deploying authenticated stock writes while .84 users still report anonymously will reject their uploads.

1. [ ] Complete the operational/compatibility gates and resolve the agreement/disclosure release decision under the explicit hold. Retain exact evidence for any scripting approval relied on; use [the review brief](SCRIPTING-REVIEW-BRIEF.md) for unsettled behavior, especially Chat Archiver. No staff message has been sent.
2. [ ] Approve a DEV-only release/deployment window and capture current Worker/client versions, configuration and recoverable database backups.
3. [ ] Promote the tested client integration: add the next release entry with `securityBundle: true`, update Manager metadata/TU_VERSION, build standard client and TU Test artifacts, run the full suite and review the diff. Do not overwrite immutable .84 files.
4. [ ] Publish the versioned client and rolling DEV files. Verify the raw GitHub metadata and PDA update path show the intended new version; have testers reload and verify their installed build.
5. [ ] Confirm reporting requests include the TU bearer header and queues drain against the intended server. Do not drop pending batches simply to clear an error.
6. [ ] Apply only the reviewed DEV Worker binding/migration changes and deploy the prepared Worker after client compatibility is established. Production and the agreement are not included unless separately authorized.
7. [ ] Smoke-test registration, expired/revoked sessions, module/admin denials, rate limits/Retry-After, reporting receipts, both inventory states, hospital/heal/destruction/purchase/departure steps, alarms, diagnostics and cancellation/reload on supported devices. Perform real consumptive actions only as intentionally chosen by the tester.
8. [ ] Recreate legacy Arcade/Marble rooms lacking verified seat IDs. Test valid/invalid room ownership and concurrent joins. Explain that separately installed scripts cannot use the candidate's removed privileged page API.
9. [ ] Confirm no regression in purchase quantity, cash/stock caps, freed slots, partial-purchase choice or informational auto-advancement. Check diagnostic installed-build and evidence-build fields match the actual run.
10. [ ] Review health, 401/403/429/503 rates, queue age, provider collection and limiter cleanup over a DEV observation window; then close the rollout record. Production remains a separate decision.

## 6. Rollback readiness

- [ ] Retain the previous reviewed Worker source/config and immutable .84 client artifact; verify recovery steps before rollout.
- [ ] If the Worker must be reverted, use a compatible reviewed implementation and retain the existing namespaces/databases/migration history. Do not delete data or reactivate anonymous writes as an undocumented workaround.
- [ ] A client rollback may require fresh login because private candidate session records are not an .84 origin token; retained private key records remain compatible. Verify behavior rather than migrating tokens into origin storage to hide the difference.
- [ ] Preserve pending report queues; inspect installed versions and sanitized diagnostics before any retry of an uncertain consumptive action.
- [ ] Never roll back or republish the agreement manifest as part of a code rollback without a separate reviewed agreement decision.

## Assessment boundaries

The pasted API rules require truthful disclosure, protected keys/data, minimal reads, limits and compliance with separate scripting rules. POST is still an action: it is not a compliance exemption. The user-reported Quick Items approval does not, by itself, certify all TU behaviors. The separate [rules assessment](TORN-RULES-ASSESSMENT.md) records those distinctions without requiring the rules to be pasted again.

PDA origin storage, typed/revealed DOM values, potentially retained manager backups/orphaned session records, provider/operator controls and truth of user-submitted stock remain explicit limitations. The code does not claim to eliminate them. No live deployment, agreement change, automatic message sending or production action was performed in this preparation batch.
