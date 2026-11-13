# TU .116 — Diagnostics layout and default module reporting

TU **0.5.42.116-dev**. War Organizer remains 0.3.29-dev and Item Monitor
1.12.56-dev. No agreement, production, key permissions or database schema changes.

Diagnostics now has three vertically stacked cards: TU Monitor reporting,
feedback, and local diagnostics. Scoped dark form styles override host page/PDA
styles. Module selection and the feedback textarea occupy separate full-width
rows. Actions have compact readable labels, visible link colors and touch-sized
controls. The long retention/data description is under a collapsed disclosure.
Automatic upload progress updates the visible status without rebuilding the page.

**Report module use is on by default for authorized users.** The new preference
is separate from detailed diagnostics. Existing explicit module-off preferences
are retained. A saved .115 combined-reporting off choice migrates to module off;
an absent preference defaults on. No historical activity is fabricated or
backfilled. Counts represent successful module openings, not time spent or
restoring an already-active minimized module. No additional consent checkbox is
required for the default module-count behavior requested by the owner.

Detailed workflow diagnostics remain separately optional. Existing opted-in
workflow users keep that choice. Switching either category off clears only that
category's unsent records. Authentication/current-agreement and module-permission
checks, identity isolation, redaction, bounded retries, retention and deletion
remain in place. A module-use record contains only request ID, kind/module ID,
TU build and platform; the server associates its verified sender and receipt
 time. It has no DOM, gameplay contents, API keys, chat, BS/FF or premium flights.

The reporting scheduler starts only when there is work, stops after its queue is
drained, and remains independent of module lifecycles. No idle startup/authorization
polling is introduced. Feedback remains an explicit user submission. Monitor UI
wording now describes reporting-enabled clients rather than implying every
reporting user separately opted in. The existing agreement remains unchanged;
the visible page distinguishes minimal module counts from detailed diagnostics.

Validation includes default-on actual module opening through the complete
userscript, separately optional diagnostics, trusted preference changes, saved
off migration, independent category cancellation, live status updates, secret
exclusion, identity isolation, and erasure. Chromium exercises desktop 1280×900,
portrait 390×844 and landscape 844×390 with conflicting host form styles,
checking dark full-width controls and no horizontal overflow. Synthetic users,
keys and API responses only. Evidence:
[evidence/monitor-client-116](evidence/monitor-client-116/validation.json).
Real-user authenticated delivery remains an acceptance check; no real tester
credentials are used for automated validation.
