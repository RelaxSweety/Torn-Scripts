# TU implementation status — CURRENT DEV ONLY

The approved compact UI and self-service deletion work is implemented for
**TU 0.5.42.98-dev / Item Monitor 1.12.48-dev** with agreement **1.4 / number 5**.
Earlier production-target references and implementation holds are superseded by
the explicit DEV-only authorization.

Completed: compact Manager/integrated tools; original branding and window state;
Manager minimize; separate dynamic faction information; flush scrolling headers;
Select Item on Screen; monitored filter below Add/update monitor; hidden empty
arming feedback; compact persisted independent alarm channels; resumable,
ownership-verified account deletion and current-agreement re-registration.

Independent observations are preserved, including information sourced through
other users' APIs or submissions. Only requester-derived identifying attribution
is removed from mixed records.

See [the release and validation record](DEV-RELEASE-20261111.md),
[the deletion specification](SELF-SERVICE-DATA-DELETION-PLAN.md), and
[the operative DEV agreement](../agreements/dev/1.4.md).

Separate production remains unchanged. Real-device acceptance and provider/
other-installation cleanup limitations are recorded in the release report.

The .91 correction routes every selected healing item through the direct item
handler, removes the .90 native diversion, and retains travel inventory schema
compatibility. See [handler regression evidence](HEALING-FIX-20261111.md).

The .92 follow-up routes selected inventory destruction through the handler,
with one verified removal per trusted click. See [destruction validation](DIRECT-TRASH-20261111.md).

The .93 follow-up routes foreign purchases through the direct handler and retains
one initial purchase plus five trusted-click remainder attempts. See
[direct purchase validation](DIRECT-PURCHASE-20261111.md).

The .94 follow-up completes any same-player armed stage on confirmed return
travel, clearing the action and screen alarm even after refresh. See
[return-flight cleanup](RETURN-CLEANUP-20261111.md).

The .95 follow-up adds per-purchase three-second quantity/capacity feedback and
a single inventory page refresh only after the purchase sequence finishes, and
verified green/red inventory-slot badges and native flight/hospital countdown synchronization.
See [purchase notification](PURCHASE-NOTICE-20261111.md).

## Completed UI cleanup — requested 2026-11-11

- **Completed in .96-dev:** Removed the Direct Item Tools section heading, explanatory text and standalone launch button from Travel Assistant and Item Monitor. Integrated healing, hospitalization, destruction, purchase handlers and normal diagnostic controls are preserved. See [removal and validation](DIRECT-TOOLS-UI-REMOVAL-20261111.md).

The .97 follow-up removes the redundant common Inventory Audio/Visual switches
and makes per-item alert preferences authoritative. See
[inventory alert settings](INVENTORY-ALERT-SETTINGS-20261111.md).

## Current purchase refresh policy — .98-dev

Automatic page refresh after purchase and its departure lock are removed. Keep
verified slot badges and per-purchase confirmation notifications. Return and
departure choices are immediately available after verification. A native
inventory refresh command remains unverified and is not substituted. See
[removal and validation](NO-AUTO-REFRESH-20261111.md).

## Temporary native refresh diagnostic — .99-dev

Added read-only native refresh-function inspection and a trusted-click A+ blood
bag add-to-carried-inventory POST test inside existing DEV diagnostics. Grounded
Travel Agency/status guards, exact inventory verification and unresolved-attempt
protection apply. Automatic page refresh remains removed. See
[native refresh diagnostic and validation](NATIVE-REFRESH-DIAGNOSTIC-20261111.md).

## Manual native focus refresh test — .100-dev

Added **Test Native Inventory Refresh** to existing diagnostics. One explicit
focus event is followed by five seconds of passive request/native-cell evidence.
No automatic purchase integration or page reload. Real PDA redraw acceptance is
pending. See [test and validation](NATIVE-FOCUS-REFRESH-20261111.md).

## Non-blocking post-purchase native refresh — .101-dev

One native focus event now follows each verified direct purchase, without
waiting, a five-second observer, page reload or departure lock. Removed the
Native inventory refresh investigation section; normal passive diagnostics
remain. Real foreign-market acceptance is pending. See
[implementation and validation](PURCHASE-NATIVE-REFRESH-20261111.md).

## Armed healing inventory — .102-dev

Healing inventory is prepared while arming and refreshed by post-hospitalization
verification. Heal skips its pre-use inventory GET and retains the post-use
consumption check. Missing/changed snapshots require re-arming; no hidden fallback
GET or automatic retry. DEV monitor controls remain, per the user's final
instruction. See [implementation and validation](ARMED-HEALING-INVENTORY-20261112.md).

## Green purchase checkmark removal — .103-dev

Removed filled-slot green checkmarks and prevented restoration from old saved
state. Red X markers for unfilled slots, purchase notifications, native refresh,
healing timing and DEV monitor tools remain. See
[removal and validation](REMOVE-GREEN-CHECKMARKS-20261112.md).

## War Organizer window navigation — .104-dev

Registered War Organizer with shared TU navigation and fixed hidden/flex
visibility, minimize/launcher restoration and previous-window hiding. Back and
active-card resume preserve the existing window/drafts. See
[fix and validation](WAR-WINDOW-NAVIGATION-20261112.md).

## War Organizer FFScouter and faction totals — .105-dev

Added optional per-user/key FFScouter battle estimates and FF inline with target
names, numerical FF sorting/range filters, Okay-only filtering, and green Okay /
red Hosp / blue Trvl totals under both factions. Public live documentation, unauthenticated HTTPS and Chromium fetch/CORS were
verified in .106-dev after the new policy took effect. Corrected provider policy
links and registration/retention disclosure. Authenticated FF and real PDA/GM
transport remain unverified. See [implementation, privacy and validation](WAR-FFSCOUTER-20261112.md).


## Separate FFScouter key selection — .107-dev

War Organizer Settings lists saved TU keys or verifies/saves another key for
FFScouter separately from login and roster keys. Added red/green Torn-valid and
provider-confirmed indicators, visible categorized errors during cooldown and
mobile Settings spacing/status fixes. No automatic provider registration.
See [behavior, validation and limits](WAR-FFSCOUTER-KEYS-20261112.md).

## FFScouter account setup link — .108-dev

Added the requested `https://ffscouter.com/#get-started` link and exact account
setup sentence in War Organizer Settings. TU 0.5.42.108-dev / War Organizer
0.3.22-dev; Item Monitor unchanged at 1.12.53-dev. Build, War Scouter UI,
War navigation and PDA loader checks passed; integrated payload 1,001,021 bytes.

Premium faction-wide redistribution was assessed but not implemented. Public
API guidance checked on 2026-11-12 at https://ffscouter.com/api-docs/guidance
prohibits showing premium data to users without active premium and using a
single key to provide multiple users with data. One member's premium flight
information cannot be distributed to non-premium faction members under these
published rules. Provider permission or an appropriate faction-access product
would be needed before implementing that design. No Worker, database,
agreement or production change is included.

## Personal premium return-flight ETA — .109-dev

Added own-key FFScouter premium checks and private batched current-flight reads.
Returning players display ETA MM:SS beside travel status, or earliest/latest
countdowns where the provider supplies an arrival window. No premium data is
shared with other users. See [contract, validation and limits](WAR-FFSCOUTER-FLIGHT-ETA-20261112.md).

## Premium ETA availability correction and update detection — .110-dev

Accepted valid return estimates with nullable takeoff and single arrival bounds,
added aggregate/per-player reasons for unavailable ETA, and fixed TU's update
check to compare the fourth numeric version component. Premium success alone
no longer implies a usable return estimate exists. See
[correction, validation and remaining limits](WAR-FFSCOUTER-ETA-FIX-20261112.md).

## Approved compact dual-faction board — .111-dev

Implemented the approved v6 layout: fixed compact controls; stable independently
scrolling player list; health/name/level and right-aligned BS/FF arrangement;
smaller/narrower Reserve controls; own/opposing faction switching; travel
destinations; player revive availability and same-line faction Rev totals.
Source/provider information is below the list. Refresh, faction switching and
minimize/restore preserve player position; background updates preserve Settings
drafts. Own faction has profile/Details actions only. See
[implementation, validation and limits](WAR-BOARD-APPROVED-20261112.md).

## Snatch and Grab item-cell refresh — .112-dev

Added the existing non-blocking native focus refresh after verified hospital/heal
item consumption and destruction. Partial heals refresh when the item removal
is confirmed; uncertain/no-op attempts do not. No extra verification GET, delay,
page reload or automatic follow-up. Item Monitor 1.12.54-dev; War Organizer
unchanged. See [implementation and validation](SNATCH-ITEM-CELL-REFRESH-20261112.md).

## War direction/revive/separator corrections — .112-dev

Recognized the reported Traveling from South Africa to Torn wording in both
native destination and premium ETA parsing. False/unknown revive values are
hidden; confirmed active values display green Revivable. Gold separators mark
complete player sections, including expanded details. War Organizer 0.3.26-dev,
included alongside Snatch item-cell refresh. See
[correction, ETA verification scope and validation](WAR-TRAVEL-REVIVE-FIX-20261112.md).

## Shared War settings, roles and reservations — .113-dev

TU 0.5.42.113-dev / War Organizer 0.3.27-dev; Item Monitor remains 1.12.54-dev.
Implemented the explicitly authorized DEV-only shared service, native faction
leadership/delegated admins, separate War/Personal settings and opt-in, Tag Team
slots, long-press bookings/boot, 1–10 reservation limit, 0–60-second forfeits and
both reset choices. Latest button rules: Okay with bookings is orange Reserve
with countdown; Okay without bookings is red ATTACK open to faction members.
Active bookings otherwise gate this tool's attack links. List position survives
close/minimize/attack navigation; private key-scoped BS/FF values survive empty
or failed refreshes and same-tab navigation. No premium data redistribution.
See [behavior, service boundaries, validation and limits](WAR-SHARED-COORDINATION-20261112.md).

## War mode/restoration and uploaded Snatch reports — .114-dev

TU 0.5.42.114-dev / War Organizer 0.3.28-dev / Item Monitor 1.12.55-dev.
Moved War mode to shared admin-only War Settings, removed the redundant War
coordination authorization section, and restored minimized War UI directly
through the icon after attack navigation with tab/menu/scroll retained.
Addressed the .112 uploads: recover missing healing inventory on a fresh user
click while preserving the armed fast path; keep Confirm travel available after
verified boarding and permit immediate click-driven flight-page navigation
without waiting on the native Continue countdown. No automatic gameplay or
post-purchase reload. See [findings, changes, tests and limits](WAR-SNATCH-FIXES-20261112.md).

## Timers, Tag Team and private TU Monitor — .115-dev

TU 0.5.42.115-dev / War Organizer 0.3.29-dev / Item Monitor 1.12.56-dev.
Standardized remaining timers to MM:SS. Added long-press admin Tag Team slots,
purple multi-slot targets, name search and numeric level/FF sorting with personal
BS/FF information in the Tag Team settings list. Private TU Monitor code provides
user/activity and use-rate tabs, feedback, versioned admin review and AI exports.
Client reporting is readiness-gated and off by default. **Monitor activated on DEV after D1 Edit was confirmed: five additive schema
statements succeeded, .115 health advertises readiness, and anonymous data/export
requests return 401.** Automatic reporting remains per-user opt-in; real-user
authenticated acceptance remains unverified. Local diagnostics remain usable. See
[behavior, private repository, tests and deployment boundary](TU-MONITOR-TAG-TEAM-20261113.md).
