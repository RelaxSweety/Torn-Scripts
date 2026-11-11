# DEV purchase feedback, inventory refresh and countdown synchronization — 0.5.42.95-dev

TU 0.5.42.95-dev / Item Monitor 1.12.45-dev adds a three-second status popup after each successful direct purchase verified by Torn's response and fresh server inventory. Format: `16/18 Xanax Purchased`. The numerator is confirmed cumulative purchases of that item in the armed sequence; the denominator is detected total inventory capacity. Pre-existing items are not counted. Each confirmed remainder updates the quantity and restarts the three-second popup timer.

The non-modal popup does not take focus or intercept clicks, uses text content rather than HTML, and supports narrow screens and long item names. It disappears on expiry or tool exit. Uncertain or rejected purchases do not create a success popup. A display failure cannot invalidate a verified purchase.

## Verified inventory-slot badges

Green ✓ badges mark slots confirmed newly occupied by the selected purchase. Red ✕ badges mark the requested remaining slots that fresh inventory confirms empty. Subsequent verified remainder purchases replace red marks with green. Existing carried items, unused capacity outside the purchase target and decorative blocked cells stay unmarked. Unknown outcomes clear badges rather than asserting a failure or success without evidence.

The renderer requires a complete, unique numbered native slot mapping. Torn can put cells in column order (1, 7, 13, 2, …), so explicit slot labels are matched to the server's slot positions rather than DOM order. Ambiguous or incomplete layouts are left unmarked. Badges are noninteractive overlays, not fabricated item cells or controls. Verified badge state is retained in the armed run and reapplied after native remount/reload; new runs and tool exit clear it.

## Refresh timing and Purchase Completed dialog

The popup and the Purchase Completed departure-choice dialog are separate. One initial purchase plus up to five remainder attempts remain dependent on trusted user clicks. Intermediate partial purchases show the popup but do not reload the page.

Once the sequence ends (target fulfilled, all five remainder attempts consumed, or a known pre-submission stop after verified partial purchases), TU saves the confirmed purchase and return/departure-choice state. It pauses further TU actions for three seconds, allowing the final popup to show, then reloads Torn once to initialize native inventory cells. An uncertain purchase never schedules a completion refresh or an automatic retry.

A full inventory restores the return action. If space remains, the Purchase Completed dialog is restored after reload with its manual-purchase/depart-now choices; it does not interrupt the pending refresh. The saved completion marker prevents reload loops or replaying purchases. Module exit/disarm or confirmed return flight cancels a pending refresh. No automatic return-flight action is introduced.

## Native countdown synchronization

Flight and hospital display updates now observe native clock DOM mutations immediately, independently of the deferred stock scan and the arbitrary phase of the local one-second intervals. Readable native hospital seconds are mirrored for display while the verified hospital deadline/status remain unchanged; no one-second subtraction or early hospital release is inferred. Local clocks remain the fallback if native seconds are unavailable. Small sampling jitter in a relative hospital duration no longer creates a new deadline on every observation. Existing alarm thresholds and once-per-deadline/flight behavior are retained.

The observer filters to native clock nodes, ignores TU's own rendering and unrelated DOM changes, resumes on visibility/focus and disconnects on tool exit. It does not make API requests or scan inventory. Browser background throttling and unreadable native timer formats remain limitations; this is not a guarantee of real-time execution in suspended tabs. Source/generated and Chromium off-phase tests verify hospital 01:29 and flight 89 seconds update together before waiting for the independent interval, with no extra requests or repeated alarms. Clock screenshots are in `evidence/native-clocks-95/`.

## Changes and verification

Implementation: `all-in-one/src/features/direct-items/direct-quick-items.js` (verified per-slot results), `all-in-one/src/features/direct-items/snatch-direct-items.js` (verified popup and badges), `all-in-one/src/features/travel-enhancements.js` (terminal refresh scheduling and state restoration), and `all-in-one/scripts/integrate-direct-items.mjs` (button continuation labels), plus DEV metadata/distributions. Native clock changes are in `hospital-clock.js`, `native-clock-sync.js`, the Item Monitor runtime and build integration. The payload guard gains 15 KB for feedback, refresh and numbered-slot badges.

Validation: DEV build; direct-purchase quantity/capacity/uncertainty tests; popup replacement, three-second timer, exit cleanup and display-failure tests; completion-only refresh, saved state before reload, action guard, restored choices, no replay/loop, no intermediate/uncertain refresh and exit/flight cancellation; integration (179 checks), compact presentation, return-flight cleanup, travel features, post-purchase choice, primary DEV lifecycle and full desktop/PDA bundle regressions. Additional tests cover column-order slot numbering, partial green/red counts, red-to-green transitions, unrelated/decorative cells, remount restoration, ambiguity rejection and noninteractive cleanup. Browser fixtures verify actual reload after completed full/partial/exhausted sequences, per-event notifications, three-second dismissal, preserved purchases/badges and no additional requests after reload. All network responses and inventory are synthetic. Screenshots are in `evidence/purchase-notice-95/`; they are not live Torn/PDA acceptance claims.

Recovery before publication: .94 commit `4ff0db3fece35e9028adae727e07b8f3ce64c964` and archived .94 installer. Agreement, production release, Worker, D1, Durable Objects and other server/storage are unchanged. This uses the page refresh already observed to repopulate live cells; it does not modify Torn's internal UI state or fabricate item controls. Live acceptance of the automatic refresh remains to be confirmed.

Queued separately: removal of the Direct Item Tools UI section from Travel Assistant and Item Monitor. It remains pending in IMPLEMENTATION-QUEUE.md and is not part of this release.

Final validation: full `npm test` passed; the final native Hospital-prefixed counter compatibility was rebuilt and passed dedicated native-clock, hospital-clock, resume and travel regressions. Final build: 955,105 bytes, 10 tools, 59 diagnostic checks. Public installers are verified byte-for-byte after publication.
