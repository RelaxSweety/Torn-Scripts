# DEV .115 — timers, Tag Team and private Monitor integration

TU **0.5.42.115-dev**, War Organizer **0.3.29-dev**, Item Monitor **1.12.56-dev**.
Production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`.
No production Worker/database or agreement changes are included.

## User-visible changes

- Destination ETA in Snatch and Run, landing banners and Travel Assistant's
  remaining-flight display use **MM:SS**, retaining total minutes above an hour
  (`3634` seconds → `60:34`). Hospital, reservation/forfeit and premium flight
  countdowns already use MM:SS; forfeit choices and API-update age now match.
  Numeric setting inputs retain their explicit units and existing allowed ranges.
- Opposing-player Reserve long press/context menu includes **Tag Team slots** and
  **Assign Tag Team** for verified faction War Admins. Setting one slot removes
  Tag Team. Server-side admin/faction checks remain authoritative.
- Targets with more than one reservation slot are purple, including their ready
  state; existing label, count, full/available count font and countdown rules stay
  intact. Other reserved Okay players remain orange, and unreserved Okay players
  retain open ATTACK behavior.
- War Settings → Tag Team shows name, level and personal cached BS/FF estimates.
  Name search matches case-insensitive characters/substrings. Name, level and FF
  sort in either direction; FF sorting is numeric and unavailable values remain
  last. Opening this menu also requests opposing estimates when viewing one's own
  faction. Provider updates preserve slot input drafts. Personal FF/premium data
  is not copied to shared settings or the Monitor upload schema.

## Private TU Monitor

Implementation and synthetic UI evidence live in the private repository:
[RelaxSweety/TU-Multiplayer-Server, dev/tu-monitor](https://github.com/RelaxSweety/TU-Multiplayer-Server/tree/dev/tu-monitor).
It provides TU users/activity, module use rates, feedback and admin review tabs,
versioned Pending/In review/Completed states, and paged JSON exports for AI
assessment. Global TU admin authorization is separate from faction War Admin.
The private deployment guide specifies access checks, field limits, rate limits,
30-day retention, erasure and export/privacy limitations.

TU Settings → Diagnostics prepares opt-in structured workflow uploads, module
openings, direct feedback and a Monitor link. Automatic uploads are off by
default and enable only on a trusted checkbox change. Preferences use private
userscript storage where available. Events are strictly selected and credential-
redacted on both client and server; raw page DOM, chat, input values, BS/FF and
premium flights are excluded. Uploads are identity-scoped, bounded and retried
with immutable IDs. Existing local diagnostic tools remain available.

**Monitor activated on DEV — 2026-11-13.** Initial migration attempts failed
with permission codes 10000 and 7500; these are resolved. A fresh read check and
all five additive schema statements succeeded on `tu-users-dev`. The private
.115 Worker was then deployed as version
`7f0ee2ac-889c-45e5-bd82-171d21881f01` after preserving the previous DEV snapshot
and verifying that production had no changes.

The client checks the credential-free DEV health capability before enabling
server reporting. Live health now advertises `tu_monitor:1` and .115, enabling
the existing client's reporting controls after its health check. Automatic
uploads remain off until each user opts in. No new installer version is needed
for server activation. Local diagnostics remain available.

Live credential-free checks confirmed the Monitor shell/assets return 200 and
anonymous users/usage/reports/exports and War state requests return 401. No real
user key or diagnostic record was used. Authenticated delivery/dashboard
acceptance remains unverified; local/mocked tests do not establish that result.

## Validation and evidence

- Build and full npm regression suite passed; final suite exit status recorded
  privately. Follow-up startup/session lifecycle checks passed after adding the
  health readiness gate, preserving no idle authorization polling.
- War UI tests verify numeric FF/level ordering, substring search, long-press
  assignment, purple targets, member read-only restrictions, countdown/counts,
  prior navigation/restoration and native server authorization behavior.
- Complete generated userscript tested in isolated Chromium at desktop
  1280×900, portrait 390×844 and landscape 844×390. Synthetic users, keys,
  rosters and API responses only. Evidence:
  [War Organizer](evidence/war-coordination-115/validation.json),
  [Monitor client](evidence/monitor-client-115/validation.json).
- Private Monitor tests exercise the actual Worker with real local SQLite:
  migration, active account/session/agreement/role checks and revocation,
  schema/redaction, retries, budgets, pagination/export, stale review rejection,
  deletion and retention. Chromium checks all dashboard tabs, safe text rendering,
  key clearing/no stored credentials, explicit completion, exports and logout.
- Private DEV Worker dry build passed and its added service source scan found no
  secrets. No real tester keys, authenticated live provider calls, gameplay
  actions, existing user records or production services were used to validate it.
- Existing reserve/minimize/scroll behavior, purchase red X markers and notices,
  no automatic purchase reload, DEV monitor tools and faster healing remain.

Real-device authenticated diagnostic delivery and real-user premium ETA remain
acceptance checks. A public login shell alone does not demonstrate authenticated
Monitor functionality. Exported free text may identify its author and needs admin
review before forwarding to AI; no automatic external AI submission is included.
