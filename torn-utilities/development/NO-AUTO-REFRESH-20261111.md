# DEV no automatic purchase refresh — 0.5.42.98-dev

TU 0.5.42.98-dev / Item Monitor 1.12.48-dev removes automatic Torn page refresh after purchasing, along with the three-second action lock and delayed departure dialog. The purchase refresh timer, scheduler and reload callback are removed from the workflow. Old saved refresh-pending/completed flags are cleared when a run is restored.

After purchase verification, a full inventory enables Return to Torn immediately. If inventory space remains (including after the fifth additional click-dependent attempt), Purchase Completed and its departure choice are available immediately. The three-second per-purchase confirmation popup remains noninteractive; its lifetime never gates departure. Verified green/red slot badges, quantity/capacity checks, the five-remainder limit, uncertain-outcome protection, native countdown synchronization and per-item alarm preferences remain intact.

There is no replacement native refresh command in this release. Native inventory item images may remain stale until Torn itself updates them or the user explicitly refreshes/navigates; the badges and notification provide independent server-verified feedback. TU does not buy again or fabricate item controls to update the display.

Implementation: `all-in-one/src/features/travel-enhancements.js`, `scripts/integrate-direct-items.mjs`, DEV metadata/distributions. The former refresh regression is replaced by `tests/purchase-departure-readiness.mjs`, which checks no reload timer/lock, immediate full/partial/exhausted departure, unchanged intermediate/uncertain behavior and migration from saved refresh flags. Direct-purchase tests preserve notification duration and slot badges. Full desktop/PDA bundle fixtures, integration, primary diagnostics, return cleanup, native clocks and per-item alert regressions cover retained behavior.

Chromium fixtures exercise trusted purchases, initial plus five partial-fill attempts, three-second popup expiry, immediate return/departure while the popup is active, no automatic navigation afterward, and badge preservation across an explicitly requested manual reload. Desktop/portrait/landscape screenshots are in `evidence/purchase-no-refresh-98/`. All gameplay responses and inventory are synthetic; no real purchases, item use/destruction or tester-data changes were used.

Recovery: .97 commit `f007c5fb78997480925f4e307f8b4b55a845b191` and archived .97 installer. Separate production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`; Worker, databases, agreement and other server/storage are unchanged.
