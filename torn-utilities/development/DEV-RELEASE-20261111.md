# DEV release — 2026-11-11

Scope: **CURRENT DEV ONLY**. The separate production release, Worker and
databases are unchanged.

## Versions and installation

- Torn Utilities: **0.5.42.89-dev**.
- Integrated Item Monitor: **1.12.39-dev**.
- Agreement: **1.4 / number 5**, effective 2026-11-11.
- Universal PDA/Tampermonkey auto-update installer:
  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js
- Pinned installer:
  https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-0.5.42.89-dev.user.js
- DEV service:
  https://tu-multiplayer-server-dev.tuserver.workers.dev

## Changes

Compact presentation is applied once from the original source baseline. Manager
minimize and the separate dynamic faction line were already present and were
preserved. This release completes flush scrolling headers, the Select Item on
Screen label, monitored-filter placement, empty arming-feedback suppression and
independent persisted Audio/Visual controls for Inventory, Hospital and Landing.
Per-item preferences, thresholds, master volume, mute and flight latches remain.
Small-screen touch targets and readable text take priority over exact ratios.

Settings > API provides Delete My TU Data and resumable cleanup. Ownership is
verified by Torn, not a caller-selected player ID. A new agreement is not needed
to request deletion. Account writes and deletion coordinate server-side; all
related TU sessions are revoked. Room seats and local credentials are matched
to the verified owner. Local/private/fallback credentials and agreement
acceptance are cleared before completion is acknowledged. A reload discards
in-memory credentials; returning requires manual key entry and current consent.

Mixed account audit records lose requester attribution. Independently supported
stock, faction, player-status and activity information is preserved, even when
it mentions the requesting player. The audited live DEV schemas contain no
separate player-status/activity tables; no broad player-ID deletion is used.
The registration service does not persist raw API keys in application D1.

## Storage and deployment checks

Authentication, actual DEV D1 bindings and all live Durable Object bindings were
verified without printing credentials. Both DEV database schemas were audited.
The three game namespaces contained zero objects before and after staged
deployment. New room participation is indexed; any deployment-time legacy
objects can be swept by object ID with owner-specific erasure.

The Worker was first deployed with deletion disabled, its live bindings and
inventory checked, then enabled. The enabled Worker version is
`2aad02f8-adfa-4e94-84c7-df3f2ea43b7f`.

Worker source/settings/deployment snapshots and read-only D1 Time Travel
bookmarks were saved under `/workspace/tu-dev-recovery` before deployment.
The old deployed Worker source matched the preserved `d6036cf` source exactly.
No manual D1 schema migration or tester-data deletion was performed.

## Validation

- Established `npm run validate`: passed, including the regression/security,
  agreement display/acceptance, credential, multiplayer, travel and alarm suites.
  Two stale assertions were updated to use the current agreement metadata.
- Deletion fixtures: ownership rejection, SQL isolation, independent provenance,
  partial foreign-store failure, bounded room batches, receipt transfer/recovery,
  session/seat revocation, limiter cleanup and local failure reporting passed.
- Real local Cloudflare runtime: D1 and SQLite Durable Object serialization,
  concurrent retries, two-phase completion and per-seat isolation passed.
- Credential fixtures: legacy encodings, private/origin copies, closed-tab private
  sessions, other-account preservation and late-write prevention passed.
- Chromium origin/private-storage deletion flows: pending/resume, cleanup,
  empty fresh-key entry and explicit re-registration passed.
- Desktop Chromium checks covered all active tools. Portrait, landscape and
  narrow checks covered Manager, Item Monitor, Travel Assistant and alarm controls.
  Scroll positions, persisted independent channels, drag/resize/restore and
  absence of page errors were checked. Screenshots and metrics are in
  [validation/20261111](validation/20261111).
- Live DEV health/CORS and missing-proof/forged-target rejection checks passed.
  These checks do not delete tester records.

## Limits

Deletion can take over a minute while earlier temporary limiter hashes expire.
An interrupted operation remains pending until its local cleanup is confirmed;
use Resume TU data deletion. Fresh ownership proof can recover a lost receipt.
Unknown-owner legacy keys must be verified or removed before proceeding.

Other devices, manager sync/backups, exported files and provider-controlled
historical logs/backups require their own cleanup. Other TU sessions lose access.
Browser and local Cloudflare fixtures are not physical-device acceptance, and no
real tester account was erased for verification.

## Recovery of previous work

`5200ac9` was absent from both supplied local checkouts and could not be resolved
from GitHub. Work was reconstructed from the existing source, preserving newer
changes. Recovery commits were pushed to `release/approved-changes-20261110`;
the current DEV distribution is published on `dev/tu-all-in-one`.

See [changed-files-20261111.txt](changed-files-20261111.txt) for the release file
manifest. Primary changes are in the all-in-one Manager, compact CSS, Item
Monitor/alarm sources, credential/session adapters, DEV Cloudflare coordinator,
agreement publication, regression tests and generated DEV distributions.
