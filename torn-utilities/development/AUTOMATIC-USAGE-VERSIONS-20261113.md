# DEV .118 — automatic module reporting and per-player TU versions

TU **0.5.42.118-dev**. Item Monitor remains 1.12.57-dev and War Organizer
0.3.29-dev. Production and agreements remain unchanged.

## Client behavior

Module/version reporting is automatic for authorized TU users. It no longer
reads the old module-use off preferences or the old combined diagnostic switch.
There is no module-reporting opt-out control on Diagnostics. Detailed workflow
diagnostics remain independently optional; their off choice is not changed.

After TU authorization and identity restoration, the client reports its TU build
and platform in a `usage` record for `manager`, marked `usageEvent:startup`.
Identity/enrichment notifications cannot duplicate that document's startup.
Rapid navigation in the same tab is deduplicated for five minutes for the same
player/build/platform. A changed build sends a new report immediately. Queued
startups from a different build are discarded, while older module-use evidence
retains its original build attribution.

Successful tool openings report `open`. Restoring the active tool through its
card or launcher reports `resume`. Reports use the current verified TU session,
existing server account/agreement/module gates, bounded identity-scoped retries,
and retention/erasure. No additional key, raw DOM, chat, BS/FF or premium flight
information is collected automatically. Explicit feedback is unchanged.

The startup is sent promptly, and later queued records follow the existing
bounded delivery schedule. This is reporting of use, not continuous online
presence. No automatic gameplay action or Torn API polling is introduced.
Pending, restricted, offline or outdated clients cannot be forced to report.
Users need the updated DEV installer; old versions do not gain new reporting
behavior remotely and no historical use is invented.

## Monitor

The admin users table displays **Last reported TU** (build/platform) and
**Version received** (server receipt time) for each player, not just the admin.
The version lookup spans retained reports (30 days) independently of the usage
period filter. Same-second ties use insertion order. No report means
**Unknown — no report**, including older or pending clients without evidence.
This is a last client-reported build, not a live scan or a guarantee that every
installation used by a player has that version.

Use metrics distinguish client starts from tool restores while retaining total
use counts. Old clients' usage bodies remain compatible and count as openings.
The added `usageEvent` is strict: startup/open/resume only, startup for manager
only, and no usage marker on diagnostic/feedback payloads. All admin data and
exports retain their current authorization and role restrictions.

## Validation and deployment

Build and full npm regression suite passed. Unit and full generated-bundle tests
cover startup before opening any tool, overriding old off settings, startup
navigation deduplication, automatic opens/restores, optional diagnostic separation,
identity/auth isolation, redaction and erasure. Chromium covers desktop 1280×900,
portrait 390×844 and landscape 844×390. All data, identities, keys and responses
are synthetic. [Client evidence](evidence/monitor-client-118/validation.json).

Private Monitor tests use real local SQLite and multiple synthetic players to
verify all-user version queries, Unknown, separate startup counters and existing
permission/retention/deletion behavior. Its admin dashboard Chromium checks
include per-player version display. Evidence/source remain in the private
`RelaxSweety/TU-Multiplayer-Server` repository on `dev/tu-monitor`.

The payload guard is 1.085 MB to accommodate the small automatic startup/version
integration; the tested build is approximately 1.081 MB. Official PDA loader and
complete bundle checks remain part of the regression suite. No minifier or
additional startup dependency was introduced merely to change that guard.

The DEV Monitor service is deployed before the new client because older services
reject the new strict usage marker. No database schema migration is necessary:
version/build and event metadata use the existing bounded report records. Live
verification is credential-free health/shell and anonymous data rejection only;
real-user authenticated delivery still requires acceptance in the updated client.
