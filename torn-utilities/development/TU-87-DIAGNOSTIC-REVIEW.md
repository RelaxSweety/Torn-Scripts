# TU .86 diagnostic review and .87 implementation

Prepared 2026-11-10. Client build: **0.5.42.87-dev**, Item Monitor **1.12.38-dev**.
The .87 files are built locally; this review does not establish publication or live installation.

## Evidence reviewed

The latest supplied report was exported at 2026-11-10 04:38:53.606 UTC from
.86 DEV on desktop Edge/Tampermonkey. Its evidence includes .84, .85 and .86;
older records were separated when assessing the current client. The purchase
below is .86 evidence also retained in the preceding report, not a second new
purchase at the latest export time.

At 04:07:08.788, release after healing was confirmed. TU calculated 18 free
slots at 04:07:08.925, while Torn's quantity field accepted 17. Torn confirmed
the purchase of 17 Xanax. TU stopped reconciliation at 04:07:09.398 with its
combined hospital/stock rejection. The shop and inventory refresh requests
were still pending. A missing shop row was represented as zero stock, making
this a credible immediate reason for stopping; the old combined error cannot
prove which predicate rejected the attempt. A subsequent manual purchase of
one Xanax succeeded at 04:07:14.708.

The same report retains an in-flight item consumption at 04:00:37.834 followed
by a failure to confirm hospitalization at 04:00:38.190. Consumption and hospital
status must remain separate facts. A Traveling profile alone cannot establish
whether an incompatible blood bag caused hospitalization.

Both this .86 sequence and the earlier .84 sequence include hospitalization
item use followed by healing. That supports investigating the reported
association, but these reports cannot measure its frequency against runs that
omit hospitalization. Two item uses free slots in the ledger while Torn's
rendered quantity limits may lag. The ledger's 18-slot result was correct in
the observed .86 purchase; the native field and subsequent reconciliation were
the failure points.

## Opening and launcher assessment

The latest export records a tool exit at 04:29:06 and a diagnostic restart on
/index.php at 04:38:38. It does not contain an exception or an event timeline
establishing an Open Item Monitor crash. The previous recorder excluded the
launcher, so absence of its clicks is not evidence that clicks never occurred.
An external script conflict remains unproven.

The launcher rejected repeated native clicks (detail greater than one) even
after drag suppression expired; this was reproduced against the original
bundle. Navigation state could also disagree with actual window visibility.
The diagnostic DOM observer did not consistently exclude TU's own interface,
creating avoidable work and a possible feedback path. These findings justify
focused fixes, but do not prove the exact cause of the user's opening failure.

## Implemented changes

- [x] Keep the immediate initial purchase path, using verified capacity and funds.
- [x] Account for confirmed item consumption/destruction and completed purchases.
- [x] Cross-check item-use capacity against the fresh inventory response already
      obtained for consumption verification; no additional inventory request added.
- [x] Allow five remainder attempts after the initial purchase. Each quantity is
      bounded by remaining capacity, stock and funds, and the outstanding target.
- [x] Use an explicit receipt quantity or changed inventory count when available
      so partial results credit the confirmed amount rather than the request.
- [x] Wait only on the recovery path when the shop row is temporarily absent.
- [x] Keep required native purchase actions behind separate trusted user clicks.
- [x] Retain the manual-purchase/depart choice when space remains, with early
      stopping for unavailable stock, funds, cancellation or uncertain outcomes.
- [x] Accept repeated launcher clicks after a completed drag; retain click-through
      protection and restore based on actual window visibility as well as state.
- [x] Contain Item Monitor button events and exclude TU DOM changes from automatic
      diagnostic capture, while retaining allowlisted explicit alarm setting edits.
- [x] Record bounded launcher, monitor-opening and runtime error-type events in
      exports and retain them across same-tab navigation.
- [x] Exclude TU buttons from native hospital-clock evidence. Accept explicit live
      hospitalization text after verified consumption, independently of flight
      status; an unconfirmed response still cannot authorize another item use.
- [x] Add Clear Logs. Clear diagnostic histories when the installed build changes,
      preserving monitoring preferences, gameplay settings and uncertain-use locks.
- [x] Build versioned and rolling .87 DEV artifacts; leave historical .86 immutable.

## Validation and limits

The complete npm regression suite passed. After the final purchase-accounting
adjustment, targeted tests passed again for the compiled stepped adapter,
partial purchases, six total purchase attempts, funds limits, delayed shop
rows, desktop/PDA flows, hospital status, diagnostics and lifecycle behavior.
Build reproducibility and whitespace checks passed.

Chromium tests using mocked network responses passed repeated Item Monitor
opening on desktop and mobile layouts, Clear Logs with continued recording,
and repeated launcher restores. These are local fixtures, not live Torn
transactions. No real inventory was consumed or purchased during testing.

The prior 900 KB bundle assertion was raised to 915 KB to accommodate the new
bounded diagnostics and retry recovery; the resulting bundle is about 905 KB.
No service or agreement changes are included.
