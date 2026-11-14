# DEV .123 — highest FF within War activity groups

TU 0.5.42.123-dev / War Organizer 0.3.33-dev. Item Monitor remains 1.12.58-dev.

Online first now orders Online, Idle, Offline, Unknown, with numeric FF highest
to lowest within each activity group. Offline first uses the inverse known
activity grouping with the same descending FF secondary sort. Unknown activity
stays last; missing/non-numeric FF stays last within its group. Names break equal
FF or missing-FF ties. The existing displayed-precision numeric FF conversion is
used, matching the dedicated FF sorts. When FFScouter is unavailable/disabled,
activity grouping remains useful with names breaking missing-FF ties.

FF arrival/refresh now triggers list rendering for activity sorts as well as
dedicated FF sorts, preserving the existing background list-position handling.
Filters, saved selections, provider consent, personal-cache scope and War access
checks remain unchanged. No service, schema, agreement or production changes.

Validation: War UI tests cover numeric 10.2 vs 2.254 ordering, missing FF, Unknown
activity, both activity sort directions and reordering after new FF arrives.
Generated-bundle Chromium desktop/portrait/landscape checks use synthetic provider
responses to verify grouped descending FF, combined activity/status filters,
both factions and persistence across minimize/reload. Full npm regressions pass.
No real user keys, provider requests or gameplay actions are used by tests.

[Browser evidence](evidence/war-activity-ff-123/validation.json).
