# DEV .117 — recover hospitalization after a transient status reading

TU **0.5.42.117-dev**, Item Monitor **1.12.57-dev**. War Organizer remains
0.3.29-dev. No Worker, database, agreement or production changes.

## Cause and correction

A hospital-state observation changed an armed, unused hospitalization plan to
`waiting`. When the observation later cleared, there was no transition back to
`hospitalize`. The button stayed blocked waiting for stock instead of offering
the originally selected hospitalization item. Private server diagnostics showed
this transition and blocked clicks; the source behavior was reproduced locally.
The original source of the transient reading was not captured by those reports.
No actual user diagnostic content is included in this public record.

The corrected workflow remembers when an **unattempted** plan was suspended by a
hospital reading. It restores Hospitalize only when all of these hold:

- Same authorized player's active armed run, correct destination, focused page.
- Verified not hospitalized, not traveling and not returning.
- Known stock below the monitored minimum and a selected hospitalization item.
- No recorded hospitalization attempt, confirmed hospitalization, consumed-item
  proof, uncertain item result or action currently in progress.

Recovery changes button readiness only. It never uses an item. A new trusted
click still goes through existing inventory, ownership, native-request and
outcome-verification guards. An attempt immediately clears recovery eligibility,
so an item consumed without hospitalization or an uncertain result cannot cause
this recovery path to offer another attempt. Available stock still bypasses the
optional hospitalization stage as before. A structured `hospitalize-restored`
event makes the recovery visible in future opted-in workflow diagnostics.

The intent marker survives navigation. An **older already-stuck waiting run**
without recorded intent/consumption history is deliberately not guessed at:
update and re-arm it once after checking current Torn status/inventory. Older
runs still in Hospitalize can acquire the marker if a new transient observation
occurs. New .117 runs record their attempt state explicitly.

## Validation

- Regression tests cover the reported ready → hospital observation → waiting →
  clear observation sequence, restored ready button with zero item use, and one
  use only after a new trusted click.
- Negative cases cover flights/return, wrong destination/missing identity,
  unknown hospital state/stock, consumed/uncertain items, previous attempts,
  confirmed hospitalization, missing plan, older unknown-history runs and stock
  becoming available. Persisted suspension/reload is also tested.
- Full generated userscript regression exercises an outbound-to-foreign-page
  DOM transition with a temporary hospital indicator and no item/gameplay POST.
- Isolated full-bundle Chromium checks desktop 1280×900, portrait 390×844 and
  landscape 844×390. Recovery occurs once with zero gameplay action starts.
  Synthetic identities, credentials, pages and transport responses only.
  [Evidence](evidence/hospitalization-recovery-117/validation.json).
- Build and full npm regression checks cover the integrated release, including
  faster healing, direct item/destruction/purchases, no automatic purchase reload,
  existing War navigation/scrolling and reporting behavior.

Real-device acceptance after updating/re-arming is still needed. No real tester
credentials or gameplay requests are used by these regression checks. Assessment
and correction did not modify existing diagnostic payloads or review states.
