# TU implementation status

## Agreement publication

Agreement **1.3 / number 4** is being published from the approved revised draft following the user's instruction to update the agreement. The prior implementation hold is lifted for this approved publication. Active text and metadata are maintained in [current.json](../agreements/dev/current.json); the readable text is [1.3.md](../agreements/dev/1.3.md).

The original approved draft and approved revised review copies remain preserved unchanged. Review-only covers, provisional metadata and non-operative review notes are omitted from the published document. Earlier agreement 1.2 is archived under `agreements/dev/history/1.2.json`; immutable agreement history is not rewritten.

## Client release

DEV **0.5.42.86-dev** provides wrapped agreement text, safe links, the approved feature-by-feature disclosure tables and the same disclosures on saved-key entry. Acceptance requires the current document to be displayed, an explicit checkbox and a successful backend record. Existing acceptance does not count for a different agreement version. Optional reporting remains optional.

Full regression tests, agreement publication/UI tests and mobile/desktop layout checks passed. Worker source/configuration is unchanged by this publication; the existing service synchronizes the published manifest.

## Remaining follow-up

Confirm the updated client and agreement flow on supported devices, then resume the planned Item Monitor diagnostic check. Continue the remaining rollout/operational checks in the [implementation checklist](CHANGE-IMPLEMENTATION-CHECKLIST.md). Release notes remain limited to user-visible improvements.
