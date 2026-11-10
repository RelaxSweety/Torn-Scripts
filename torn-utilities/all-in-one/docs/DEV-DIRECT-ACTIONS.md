# Primary DEV .82 — direct actions and post-purchase choice

Primary DEV 0.5.42.82-dev / Item Monitor 1.12.37-dev incorporates the validated experimental .13 action flow and request diagnostics. Disable the separate experimental userscript before enabling this release. Primary DEV retains its existing monitor/settings keys; it does not overwrite them with experimental settings. Production and the Worker are unchanged.

## Actions and diagnostics

Hospitalize Me, + Hosp?, and Heal use one direct travel-item request per trusted press, after checking the current inventory slot and selected item. The validated direct types are Blood Bag A+ and AB+; unsupported selected types block with an explanation. Identity, capacity refresh, uncertain-outcome locks and fresh live release evidence are retained. Native purchase, destruction and return steps require separate presses for each native click, including any reconciliation purchase. Informational checks do not require acknowledgement.

Open Item Monitor starts diagnostic recording; its Diagnostic section stops recording and exports reports. Direct Item Tools provides the existing inventory inspector and direct-item pilot. Recording remains passive until activated. Sanitized request history, direct-action evidence, build provenance and native-page information are included in reports. The helpers now live under src/features/direct-items; experimental imports remain compatibility exports. The primary build integration is scripts/integrate-direct-items.mjs.

## Unfilled inventory after purchase

On a confirmed purchase, use the confirmed capacity ledger (including consumed/destroyed slots and purchased items), or a verified current DOM summary if the ledger is unavailable. Do not make an additional purchase-time request just to show the choice.

- No free slots: proceed to the usual Return to Torn button.
- Free slots: automatically display the number of remaining slots and two choices.
- Unknown remaining capacity: explain that it could not be verified and offer the same choices rather than assuming full inventory.

Purchase more items disarms Snatch and Run, hides its action UI and edge alert, and leaves Torn open. No further purchasing or travel is initiated. The user handles both manually.

Depart now starts the first existing return action. The button then displays Book return flight and Continue to return flight as applicable; each further native action needs another press. Declining manual control never triggers a purchase automatically. The choice survives same-tab restoration, and cancellation removes it.

## Validation and size

Tests cover full/partial/unknown capacity, funds- and stock-limited quantities, slot credits, automatic dialog display, manual close, departure continuation, restored choice and cancellation. Primary integrated desktop/PDA tests use the direct blood-bag request and stepped native controls. The diagnostic-enabled DEV payload budget is now 900 KB, increased from 800 KB to accommodate the integrated action helpers and early passive request hooks; this release is about 846 KB. Existing .81 and experimental .13 artifacts remain immutable.
