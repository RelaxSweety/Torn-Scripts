# DEV .120 — Torn attack endpoint correction

TU 0.5.42.120-dev / War Organizer 0.3.31-dev. Item Monitor unchanged.

Torn publicly returns the reported retired-endpoint JSON for
`loader.php?sid=attack&user2ID=…`; `page.php` returns HTML without that error.
War Organizer opposing-name links, the strict navigation validator and the DEV
shared-board attack response now use `page.php`. The updated client also accepts
strictly validated legacy DEV responses and converts them to `page.php` before
navigation. Existing reservation/faction/status checks, saved position and
minimize behavior remain. Older clients must update because their strict URL
validator accepts only the retired endpoint. Own-faction profile links remain
profile links. No schema, agreement or production changes.

Validation: build/full npm regressions, explicit current/legacy response navigation
and foreign-host rejection, shared attack URL assertion, private Worker checks,
and generated-bundle Chromium desktop/portrait/landscape navigation and restore.
Public endpoint checks used no cookies or credentials. Browser gameplay transport
is synthetic; no real authenticated attack was initiated.
