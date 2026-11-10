# Self-service identity deletion — pending implementation

Requested for the pending TU release. This is a specification, not a deployed
capability. The compact preview does not currently delete remote identity data.
The active agreement remains 1.3 / number 4.

## User-facing flow

1. Settings > API contains **Delete My TU Data**, separate from per-key removal.
2. Show the verified account and scope. Explain that TU access ends and returning
   requires manual key entry, ownership verification and explicit acceptance of
   the current agreement. Provide **Delete My TU Data** and **Cancel** controls.
3. On confirmation, stop tools, armed actions and pending reporting; lock feature
   access while deletion is in progress.
4. Perform authenticated server deletion and local identity/credential cleanup.
5. Show **Your identifying data has been deleted from this TU installation and
   TU's active service storage. TU access has ended. Provide an API key and accept
   the current agreement to register again.** only after both scopes complete.
6. If either scope fails or remains uncertain, show its actual state and a recovery
   action. Do not display a success notice merely because a request was sent.

Deletion is for the selected verified account, not a general reset of shared
browser storage, other users' records or non-identifying settings. Deleting TU
copies does not revoke the key at Torn or alter Torn inventory/items.

## Confirmed current behavior

The DEV Worker agreement-cancellation route writes a cancellation event and
revokes sessions. It does not erase identity rows, agreement history or all
linked information. Therefore that route cannot be relabeled as deletion.

Registration verifies a supplied raw key with Torn rather than writing it to
TU's application database. Raw saved keys still need removal from the client's
private credential store, supported origin fallbacks and legacy copies. The
agreement must not imply that raw keys were previously stored in a server DB.

## Storage inventory and scope before implementation

- Client: enumerate selected-account credentials in private GM storage and
  supported PDA/origin fallback storage; known legacy aliases; player/faction
  caches; TU/room session credentials; cached acceptance and access decisions;
  identity-bearing diagnostics/history/export queues maintained by TU. Preserve
  unrelated account records and non-identifying preferences.
- User database: account identity/name/faction fields in `tu_users`, sessions and
  token hashes in `tu_sessions`, `tu_module_permissions`, and identifying actor/
  target links in `tu_audit_events`.
- Foreign database: account-linked `tu_agreement_events`, submission/feedback
  links and any other identifying metadata. The public agreement registry and
  non-identifying stock observations are not the user's personal data to erase.
- Durable Objects: verify room/game identity arrays, player names and seat tokens
  for all active multiplayer implementations; remove the selected user's identity
  and invalidate their participation credentials without exposing other players.
- Limiter/storage metadata: audit key/account/IP hashes that can still associate
  retained records with the selected account. Hashing alone is not anonymization.
- Operator-controlled configuration, logs and backups: establish the actual
  deletion boundary and restoration policy. Do not advertise all identifying
  storage as covered until every retained link has been audited and tested.

This list is based on the current code and is not a complete remote storage
inventory. Both D1 bindings, active Durable Object implementations and deployed
provider configuration must be checked before enabling the feature.

## Required behavior and safeguards

- Authenticate ownership using trusted server verification. Do not allow a client
  to select a deletion target by changing a Torn/player ID in a request body.
- Require an explicit destructive-action confirmation. Do not require agreement
  acceptance merely to exercise account-data deletion. Provide an ownership-
  verification route if ordinary tool access is unavailable.
- Do not bypass existing ownership or service-limit protections.
- Coordinate deletion across databases and objects. D1 transactions in one
  database do not make changes in a second database or Durable Object atomic.
  Use a bounded, resumable process and an authenticated/non-identifying completion
  receipt for response loss; never claim atomic cross-store deletion without it.
- Invalidate all TU sessions and account-linked room credentials. Ensure in-flight
  registrations, reports or stale clients cannot recreate identifying records
  after deletion has started or restore old acceptance.
- Do not erase a second user's record, a public agreement document or shared
  aggregate stock data as a side effect. Remove identifying links from any
  retained record; a key hash or stable account pseudonym is still a link.
- Remove private and fallback credential copies and their legacy migration paths.
  Other tabs must stop using the deleted account; server revocation is authoritative.
- Require fresh manual key entry/registration and current agreement acceptance
  after deletion. Do not retain an old key/hash simply to test whether a newly
  entered key differs from the removed one.
- Do not promise remote erasure of private local storage on another device,
  third-party logs/backups or exported files. Explain those limits in the UI and
  agreement; other TU sessions must nevertheless lose access.
- Do not clear credentials needed to recover an incomplete remote deletion without
  providing a safe deletion-only recovery mechanism. Remove recovery linkage once
  completion is confirmed; do not keep a new identifying deletion audit trail.

## Validation before approval/publication

- Real storage adapters: selected-account erasure across every audited store and
  preservation of unrelated accounts/non-identifying data.
- Forged identity, missing/expired ownership proof, cross-account requests,
  restricted/declined accounts and CSRF/unauthorized request rejection.
- Partial failures, timeouts, lost responses, retries, duplicate requests and
  recovery after navigation or browser restart.
- Concurrent registration/submission/game actions, stale tabs/devices and session
  replay after deletion; no automatic credential/consent restoration.
- Confirmation appears only after successful server and local completion.
- Returning requires fresh key entry and current explicit agreement acceptance.
- GM-private storage and PDA fallback cleanup, legacy aliases and independent
  browser/device limitations.
- Agreement text and every affected data-use table match the tested behavior.
  Publish a new version only when this feature is available, not ahead of it.

## Draft agreement

[Proposed 1.4 text](../agreements/drafts/1.4-self-service-deletion-review-draft.md)
adds the self-service process, clarifies retained non-identifying data and
provider/export limitations, and removes the operator-contact deletion process.
The current published manifest and immutable agreement history are unchanged.
