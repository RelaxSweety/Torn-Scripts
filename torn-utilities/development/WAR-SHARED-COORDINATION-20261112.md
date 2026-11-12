# Shared faction War coordination — DEV .113

TU **0.5.42.113-dev**, War Organizer **0.3.27-dev**. Item Monitor remains
**1.12.54-dev**, including the published native item-cell refresh changes.

The user explicitly authorized extending only the DEV Worker/database boundary
for shared roles, reservations, War settings and authoritative timers. Production
main remains `73c42788968612913ccfee20b1d5c194324dc8fd`. No production code,
production releases, agreement text or D1 schema changes are included.

## Behavior

War Settings and Personal Settings are separate buttons. War settings can be
read by connected faction members; server-verified admins can edit them. Current
faction Leader and Co-Leader are automatic admins, using Torn's native
`leader_id`/`co_leader_id`, not customizable position names. Verified player
**4539436 (RelaxSweety)** retains admin access within their current faction.
Admins may delegate/remove additional current-faction admins; a small gold star
marks admins beside names in the own-faction list. Automatic roles cannot be
revoked. Membership and leadership are rechecked on every mutation.

Personal Settings contains a separate, off-by-default shared-coordination
checkbox. Its disclosure identifies the TU DEV service, request-scoped native
key verification, shared names/bookings/admin roles/settings and faction-member
recipients. Only a trusted checkbox event can enable it; consent is scoped to
the current verified player, native TU/War key fingerprint and faction. FFScouter
uses its separately selected key and opt-in. Its key, BS/FF estimates and premium
flight information never enter the shared service.

War Settings supports:

- Opposing faction selection from the existing directory or verified numeric ID.
- Reservation Limit: **1–10 targets per player**.
- Existing hospital pre-release reservation window: **1–30 seconds**.
- Attack Forfeit Time: **None or 1–60 seconds**.
- Player Admin Roles and Tag Team reservation capacities for opposing players.
- Reset All Reservations: a confirmation and choice of reservations only, or
  reservations plus War settings. Both retain admin roles and Personal Settings.
  Resetting settings clears the opposing faction and restores default limits.

Reservation counts show `(used/slots)`, green while capacity remains and red
when full. Long press or the context menu opens the list of reserving players;
users can release their own booking, and admins can Boot any booking. Booting
removes it immediately, and the player may reserve again. Reservation UUIDs
prevent an old boot/release action from deleting a newer booking.

The latest user instruction supersedes the earlier green/blinking and red
reserved-button proposals:

| Opposing target | Button | Attack through War Organizer |
| --- | --- | --- |
| Okay, no active reservations | Red **ATTACK** | Any authorized current faction member |
| Okay, active reservation(s) | Orange **Reserve**, countdown retained | A matching active booking of the viewer is required |
| Not Okay | Standard **Reserve** | Not enabled |

Long press also permits reserving a free eligible slot without following the
red ATTACK link. Own-faction rows remain profile/Details only. These checks
control links provided by this tool, not attacks initiated elsewhere in Torn.
The service returns a validated attack-screen URL; it never performs an attack.

Forfeit time starts when the service first confirms the target is Okay.
Reservations expire against the server clock and are pruned before reads,
reserves or attacks; a client clock or stale display cannot extend a booking.
The local countdown uses the server offset and does not send a request each
second. Shared snapshots refresh with the visible board's 15-second roster loop;
there is no push channel. Status transitions can therefore take a polling cycle
to start a timer. If nobody has the board open, no new Okay transition is
observed until the next request. Existing recorded expiry deadlines still hold.
Changing the forfeit duration restarts active countdowns; None removes them.

## Retention and layout

List anchors and search/filter/sort/faction selection are saved per viewer and
faction. Refreshes, minimize, full close/reopen and attack-screen navigation
restore the visible player and offset. Same-player identity metadata refreshes
do not discard the active board. Controls stay fixed while the player list
scrolls independently. Source/provider/shared-board messages remain below it.

BS/FF values remain visible during failed or empty refreshes until usable new
values arrive. They are scoped to the viewer/key fingerprint and retained in a
private in-memory cache, plus same-tab session storage for navigation. Restored
or expired values are marked cached in tooltips; disabling, logout/key removal
or TU deletion clears the relevant cache. Premium flights keep their separate
short validity checks and are never persisted or redistributed. Background
health reads stop when fewer than 25 API-budget units remain, preserving room
for higher-priority work;
interactive operations still obey TU's shared native API governor.

## DEV service and safety

`/api/war/{state,settings,admin,slots,reserve,release,boot,attack,reset}` uses the
existing authenticated module-access/agreement gate and serialized
IdentityCoordinator. There is no new public unauthenticated data endpoint.
A separate `X-TU-War-Key` header is verified against the TU session owner, current
native faction roster and leadership. No raw native key is stored. POST actions
require a trusted visible War Organizer event in the Manager, and the service
independently verifies every permission and target regardless of client checks.
Requests are bounded by per-viewer rate limits and native verification deadlines.

Shared records use the existing **DEV** IdentityCoordinator SQLite storage,
with transactional per-target booking records to avoid a single large storage
value. No D1 migration or new Durable Object class/binding is required. Native
metadata caches are bounded and brief; all mutations use fresh native checks.
Deletion removes the requester's delegated roles, bookings, faction indexes and
rate records. Legacy device-only reservations are not automatically uploaded or
used for shared attack authorization.

Before deployment the existing DEV code, source map, settings and deployments
were backed up privately outside Git. Every source-map source matched the
previously published repository baseline, and code was checked again immediately
before deployment. Existing DEV variables and D1 identities match the preserved
configuration. Recovery uses the saved DEV deployment/version metadata or the
prior published Worker sources; it must not modify production.

## Validation and limits

Build, full npm regression suite, native-role/ownership/concurrency/forfeit/
boot-reset-deletion tests and Manager/backend authorization checks passed.
Full generated-bundle Chromium fixtures cover desktop 1280×900, mobile portrait
390×844 and landscape 844×390: explicit trusted consent, native-key transport,
admin menus, Tag Team, orange/red buttons, counts/countdowns, long press/boot,
admin stars, read-only member settings and close/attack anchor restoration.
The admin stress fixture advances only its synthetic clock between high-rate
actions and navigation to respect the real API governor. Existing board and
private FFScouter/premium tests also passed at all three sizes.

Evidence: [shared coordination screenshots/results](evidence/war-coordination-113/),
[private FFScouter screenshots](evidence/war-scouter-113/) and
[approved board regressions](evidence/war-board-113/).
All authenticated tests use synthetic keys, users, rosters and provider/service
responses. Public deployed probes verify service availability and rejection of
unauthenticated shared requests, not authenticated gameplay or premium ETA
accuracy on a real PDA. No tester credentials were requested or used. Native
PDA rendering and live authenticated provider/coordination behavior remain
real-device acceptance checks.

DEV Worker version: `edbe6fc5-2687-4a24-a2d6-c9c4287de864`.

Live credential-free probes passed: health 200 with `.113`/War capability 1;
shared state/reserve without a session 401; OPTIONS 204 allowing the native
key header; current agreement remains version 1.4 / number 5. Python urllib
received Cloudflare browser-signature denial 1010; curl succeeded. No allowlist
change or credential was required. See `live-service.json` in the evidence.
