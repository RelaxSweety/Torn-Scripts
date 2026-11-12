# War settings/restoration and Snatch feedback — DEV .114

TU **0.5.42.114-dev**, War Organizer **0.3.28-dev**, Item Monitor
**1.12.55-dev**. Published .113 and earlier installers remain unchanged.

## War Organizer

War mode is now in **War Settings**, readable by faction members and editable
only by server-verified War Admins. It is a shared `real`/`offline` setting;
Offline Only blocks shared reserve/attack actions on the service as well as in
the client. Personal FF requests pause and estimates hide in Offline Only;
returning to Real War immediately restores the personal lookup/cache path.
Existing .113 clients can still save other settings without a `mode` field;
they cannot bypass a server-configured Offline Only mode.

Removed the separate Shared faction coordination authorization/disclosure/
checkbox section from Personal Settings, as explicitly requested by the user.
War service access uses the existing accepted TU agreement, verified TU session,
selected native TU/War key, current faction membership and module access. Key/
account/faction rechecks, native header-only transport, cookie omission,
redirect rejection and server-side permissions remain. Old checkbox records
are ignored; no new acceptance or registration is introduced. Agreement files
and registry version are unchanged. FFScouter remains a separate personal
provider key and opt-in; no premium data is shared.

The War Organizer close button now minimizes. A player-scoped, same-tab resume
record lets the Manager restore the organizer **minimized** after attack-page
navigation; the next TU icon click opens the organizer directly. It does not
require navigating through Tools/War Tools. Explicit tool exit clears that
resume record; a different player cannot consume it. List anchors, faction,
search/filter/sort, tab, expanded row, settings submenu and settings scroll are
retained. Hidden/loading panels cannot overwrite a saved settings offset with
zero during pagehide. Settings headings also have an explicit compact size.

## Uploaded Snatch reports

The reports target .112. The report without the Leela suffix shows repeated
pre-submission heal errors: **“The armed inventory snapshot is missing or
changed. Re-arm Snatch and Run before healing.”** Its direct item action records
are empty; these attempts did not submit an item-use request. The retained
capacity baseline was rebuilt after a page refresh. The export does not prove
which earlier event originally invalidated the separate armed item snapshot.

The other report records a confirmed heal and purchase, native return booking,
then `return-flight-confirmed`/complete without a Continue click. The .112
workflow retired its button as soon as returning status was observed, including
while Torn still displayed the airstrip/Continue countdown panel.

Only a sanitized assessment and input hashes are committed in
[evidence/snatch-report-fixes-114](evidence/snatch-report-fixes-114/). Raw reports,
credentials and actual player/inventory snapshots were not copied into Git or
sent to a live service. Truncation/dropped captures and unrecorded manual actions
limit what the exports establish.

## Healing correction

The valid armed inventory path remains **item POST → verification inventory
GET**, with no new pre-heal read or delay. If the matching run's snapshot is
missing/invalidated, a fresh user click may perform **one complete inventory
read**, revalidate the current run/focus/status and selected item name/ID/UID,
then use it and verify consumption. A different run, known unresolved native
mutation, changed guard, absent selection, malformed inventory or uncertain
prior action still prevents an item POST. Consumption verification and uncertain
attempt locks remain. No automatic heal, retry or subsequent purchase is added.

Verified hospital/heal use or destruction still sends the existing non-blocking
native item-cell refresh. Red X purchase markers, purchase notifications and the
absence of green purchase-slot checkmarks remain. Purchases do not reload Torn.

## Confirm travel

A verified native return boarding panel now keeps a green **Confirm travel**
button available. It also recognizes a manually booked return flight observed
for the same player. A fresh click uses an enabled native Continue control; if
the native Continue is disabled for the page countdown, it opens the fixed,
same-origin `/page.php?sid=travel` page for the **already booked** flight. That
is a navigation GET, not another booking or a timer override. No automatic
continuation occurs. Unconfirmed bookings and changed players/runs cannot
advance. Arrival at the actual flight-progress view completes the workflow.

## Verification and boundaries

Build and full npm regression suite passed, including source/generated native
stepping, direct item safety, armed fast path, recovery cancellation, partial
healing, refresh, travel, purchases, roles/mode enforcement and account deletion.
Generated Snatch/native factories were tested in Chromium at desktop 1280×900,
portrait 390×844 and landscape 844×390: explicit open/book clicks, a visible
Confirm travel button beside disabled Continue (5), immediate user-click GET
navigation, and no duplicate booking. Full-bundle War fixtures cover the
removed redundant section, admin mode/read-only member controls, close/minimize,
reload and direct attack-page icon restoration, player anchors and Personal/
Tag Team tab/scroll retention. FFScouter provider-consent tests also passed.

Evidence: [War](evidence/war-coordination-114/),
[Snatch confirmation](evidence/snatch-return-114/),
[private FFScouter](evidence/war-scouter-114/).
All execution tests use synthetic accounts, keys, inventory and service
responses. No real item use, purchase, attack or tester credentials were used.
Native PDA acceptance and authenticated live behavior remain device checks.

The existing DEV Worker receives the backward-compatible shared mode field;
there is no D1 schema change or new Durable Object binding. The previous DEV
Worker code/settings/deployment metadata were privately backed up and checked
before deployment. No production Worker/database, production release or
agreement change is authorized or included. Production main remains
`73c42788968612913ccfee20b1d5c194324dc8fd`.

DEV Worker version: `a7a9a994-60f5-4c18-9f5c-1bd57a45aadb`.
Credential-free public probes verify health/authentication/CORS and unchanged
agreement version 1.4 / number 5; they do not verify authenticated gameplay.
