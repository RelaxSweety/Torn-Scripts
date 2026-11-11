# DEV return-flight cleanup — 0.5.42.94-dev

TU 0.5.42.94-dev / Item Monitor 1.12.44-dev fixes the lingering armed action button and red/green screen border after departure to Torn.

The supplied .93 diagnostic recorded successful return booking, then a paused native Continue step. Torn independently entered the return flight while the run remained in `return`, not `return-pending`. After refresh the retained run was still `return`; its readiness reason explicitly identified `return-flight`. Previous completion logic only accepted the `return-pending` stage, leaving an inactive red button and border visible.

Confirmed travel toward Torn for the same player now completes the armed run regardless of its prior stage or destination label. It cancels any suspended native action, removes its continuation label and departure dialog, persists completion, hides the action button and clears screen/hospital alarm controls. Canceled native promises cannot restore the old stage. Outbound travel remains armed and a different player cannot establish completion. The same cleanup runs when restoring a run during a return flight. Historical purchase/capacity evidence is retained; no additional gameplay request is sent.

Changed implementation: `all-in-one/src/features/travel-enhancements.js` and `all-in-one/scripts/integrate-direct-items.mjs`, plus DEV version metadata/distributions. New source/generated-engine regression tests cover multiple stages, manual departure, paused Continue, refresh, destination changes, repeated cleanup and asynchronous native cancellation.

Chromium tests verify the generated engine before/after departure on desktop, portrait and landscape; screenshots in `evidence/return-cleanup-94/` are synthetic fixtures, not a live PDA acceptance claim. Purchase Chromium regression remains passing, including initial plus five remainder transactions. No real purchases, item use/destruction or tester deletions are performed for verification.

The report and screenshot also confirm purchased items become visible after native page refresh. This release does not force a page reload or alter Torn's inventory rendering. Direct purchase continues to verify actual server inventory independently of its visible cells; live inventory display synchronization remains a separate limitation.

Recovery: DEV .93 commit `9cf4ada9c1bf1061abbc0c95e6f7279c898882ac` and archived .93 installer. No agreement, Worker, D1, Durable Object or other server/storage changes. Separate production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`.

Validation: build (944,908 bytes; 10 tools; 59 diagnostic checks), focused lifecycle/desktop/PDA/travel tests and Chromium cleanup/purchase tests passed. The existing flight-readiness test was updated to require a completed run to remain retired on subsequent route changes; it previously expected that same run to reactivate after a return flight. All established regression checks passed across the suite and its continuations after updating superseded readiness/stepped-return expectations. Native-only Continue behavior remains tested when no return-flight state is yet observed.
