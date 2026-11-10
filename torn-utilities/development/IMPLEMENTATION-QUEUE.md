# TU implementation status

## Pending compact-formatting approval

Queue these changes with the compact UI update. Do not implement or publish them until the formatting updates are approved.

- Rename the on-screen item picker button from “Select item on Torn” (also described as “Select Item in Torn”) to **“Select Item on Screen”**. Preserve its existing selection behavior.
- Hide the red Snatch and Run arming-feedback area when it is empty or marked hidden. Display it only when there is an actual arming error message. Preserve error reporting.
- Move **“Show monitored items only”** directly below **“Add / update monitor”**, alongside the item-selection and monitoring controls. Preserve its filter behavior and saved preference.
- Further compress the Alarm settings section with tighter internal spacing and compact controls while retaining readable labels and usable touch targets.
- Resolve header/frame gaps across the Manager and all applicable integrated windows. Headers must join the top window frame without external top margin or exposed container-padding gaps. Their background must fully cover the header region so scrolled content cannot appear above or behind it. Verify initial display, intermediate and maximum scroll positions, narrow portrait/landscape layouts, dragging, resizing, minimization/restoration and saved dimensions. Preserve compact header sizing, readable text and existing controls; apply content padding below the header rather than creating a gap above it.
- Under each alarm subtype (Inventory, Hospital and Landing), place separate **Audio** and **Visual** activation checkboxes together. Each checkbox must independently enable/disable its alert channel and persist its setting. Preserve the master volume, sound selection, duration/until-muted settings, mute controls and existing per-item alert preferences. This explicitly requested channel independence is a functional extension beyond the original styling-only scope; implement and test it with the approved revisions.

These are queued requirements, not changes included in the current preview installers.

## Pending self-service identity deletion and agreement revision

Add this requested functional feature to the pending release. It is not implemented by the existing key-removal or agreement-cancellation flows.

- Add **Delete My TU Data** under **Settings > API**, separate from removing an individual saved key. Clearly state the selected verified account and deletion scope, with Confirm/Cancel controls.
- Remove that account's player name, API credentials and other identifying information from TU-controlled local/private/fallback storage and active server storage. Audit linked identity fields, session and room credentials, agreement/access/audit records, submission links and identifying hashes. Preserve non-identifying preferences and shared records; do not erase other users' data.
- Authenticate ownership server-side; never trust a browser-supplied player ID to select another account. Account-data management must not require accepting a new agreement just to request deletion.
- Stop tools, armed actions and reporting during deletion. Invalidate all TU sessions and remove cached authorization/acceptance. Require fresh manual API-key entry, verification and explicit agreement acceptance before returning to TU. Prevent legacy credential or consent restoration.
- Show deletion-complete confirmation only after both remote deletion and local cleanup succeed. Provide truthful pending/failure/recovery states for interrupted or partially completed deletion. Do not mistake logout/session revocation for data erasure.
- Update the agreement and relevant disclosure tables to describe the button, scope, confirmation, access removal and return process. Remove instructions to contact RelaxSweety for data removal. Keep provider backups, exports and other-device limitations accurate.
- Review [the implementation plan](SELF-SERVICE-DATA-DELETION-PLAN.md) and [agreement 1.4 draft](../agreements/drafts/1.4-self-service-deletion-review-draft.md). Publish no new agreement or backend changes until the implemented deletion flow has passed validation and the release is approved.

## Agreement publication

Agreement **1.3 / number 4** is being published from the approved revised draft following the user's instruction to update the agreement. The prior implementation hold is lifted for this approved publication. Active text and metadata are maintained in [current.json](../agreements/dev/current.json); the readable text is [1.3.md](../agreements/dev/1.3.md).

The original approved draft and approved revised review copies remain preserved unchanged. Review-only covers, provisional metadata and non-operative review notes are omitted from the published document. Earlier agreement 1.2 is archived under `agreements/dev/history/1.2.json`; immutable agreement history is not rewritten.

## Client release

DEV **0.5.42.86-dev** provides wrapped agreement text, safe links, the approved feature-by-feature disclosure tables and the same disclosures on saved-key entry. Acceptance requires the current document to be displayed, an explicit checkbox and a successful backend record. Existing acceptance does not count for a different agreement version. Optional reporting remains optional.

Full regression tests, agreement publication/UI tests and mobile/desktop layout checks passed. Worker source/configuration is unchanged by this publication; the existing service synchronizes the published manifest.

## Remaining follow-up

Confirm the updated client and agreement flow on supported devices, then resume the planned Item Monitor diagnostic check. Continue the remaining rollout/operational checks in the [implementation checklist](CHANGE-IMPLEMENTATION-CHECKLIST.md). Release notes remain limited to user-visible improvements.
