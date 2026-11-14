# DEV .122 — War activity filter and sort

TU 0.5.42.122-dev / War Organizer 0.3.32-dev. Item Monitor remains 1.12.58-dev.
No service, schema, agreement or production changes.

The fixed player-list control row now includes Activity filter: All activity,
Online, Idle, Offline and Unknown. It combines with name/ID search, the existing
Okay/Hospital/Open/Reserved filter and personal FF range on either faction list.
Activity uses Torn's existing `last_action.status`, not health, travel status or
War Organizer's separate offline mode. Idle remains distinct; missing/unrecognized
activity is Unknown. Faction summary counts continue to count Online only.

Sort targets includes Online first (Online, Idle, Offline, Unknown) and Offline
first (Offline, Idle, Online, Unknown). Names break ties. Unknown remains last in
both directions. The selection is validated and saved in per-viewer local view
state, preserving it across minimize, close, attack navigation and reload along
with the existing list state. Explicit filter/sort changes reset the list to its
top; background roster refresh retains the existing position behavior.

Validation: War UI tests cover both sorts, exact activity categories, combined
status filtering, Unknown last, both faction lists and minimize/close restore.
Generated-bundle Chromium checks at desktop, portrait and landscape cover both
sorts and all activity options, combined Okay, both factions, no control-row
overflow and full reload/launcher restoration. Full npm regression suite passes.
The bundle budget grows from 1.085 MB to 1.09 MB for the added control/state/sort;
the built installer remains below that cap. All test identities and transport
responses are synthetic; no gameplay requests or user credentials are used.

[Browser evidence](evidence/war-activity-122/validation.json).
