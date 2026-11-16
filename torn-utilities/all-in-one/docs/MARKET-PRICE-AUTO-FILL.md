# Market Price Auto Fill DEV review

Build: 0.5.42.126-dev. Based on unified DEV commit `105db7a` (0.5.42.125-dev).
Review branch: `dev/market-price-auto-fill`; production and the existing DEV branch are unchanged.

## Provenance and integration

Original: Torn Market Filler 3.2.0, Silmaril [2665762]. Author repository
`https://github.com/SOLiNARY/torn-scripts`, commit
`1f702fd6040c99da54b98f7bdd655370ba145a7f`,
`trade/market-filler/market-filler.user.js`. The official Greasy Fork download was
blocked by this workspace's network policy. The author's repository source matches
the version and source header visible on the official distribution page.
MIT copyright 2026 Ramin Quluzade; full notice is retained in the source and every
generated unified bundle, and in MARKET-FILLER-LICENSE.txt.

This is an integrated factory in the existing build, registered in the existing
Business Tools registry. There is no separately installed market script, remote
catalog, downloaded module, additional launcher, backend change or production deployment.

The original formula parser, selectors, arithmetic, weighted medians, min/max and
pipe combinations, fixed prices, stack/mine/above filters, category/item rules,
bazaar normalization/fallback, fees, comparison ladder, freshness, formula
explanations, help and formula wizard remain. Favorites/exclusions and Fill All
remain; the command is in TU rather than a floating bar. The legacy floating bar,
long-press shortcut, separate API prompt/menu and changelog are not activated.
Known original settings are imported to TU namespaced settings without changing
the originals. API credentials are never imported from the original script.

## Safety and compatibility changes

- A single native input setter sends bubbling input/change events and checks
  accepted values twice after asynchronous React updates. Formatting and replacement
  inputs are supported; rejected values fail rather than indicating success.
- Manual Fill, favorites queue, analytics price choice, popup price selection and
  Clear use the same setter. Pricing errors leave both values and button action
  unchanged. Failed writes attempt to restore prior values; an unmounted or rejecting
  Torn component can prevent restoration and therefore still needs device testing.
- Quantity maximum comes from DOM bounds/counts. The original write-an-enormous-number
  probe is removed. Unknown maximum leaves the row unchanged and asks for a manual
  quantity. An existing manual quantity wins. Fill never submits/publishes a listing.
- Read-only transport shares TU's API governor and verified current player's Public
  Only/Limited Access key. Native PDA bridge, GM legacy/modern, legacy PDA GET helper
  and fetch fallback are supported. Authorization headers go only to api.torn.com.
  The bazaar host receives no Torn key, player token or TU session token.
- 15-second timeouts, HTTP/JSON checks, cancellation, rate-limit handling and bounded
  60-second response caching are included. Response freshness still depends on each
  provider. Original market snapshots may be approximately an hour old.
- Validated data attributes, information controls and item image paths identify items.
  Stable class fragments and semantic attributes replace generated suffix matching.
  Market-root mutation filtering and idempotent controls support remounts.
- Touch uses single-click activation without the original hold-to-open behavior;
  setting fields remain native inputs and price writes do not focus them.
- Settings are embedded in TU: General, original pricing/category/formula assistance,
  individual item rules, favorites/exclusions, analytics explanation/display options,
  and sanitized diagnostics. No extra key entry is needed.
- Enabling persists. The factory initializes with TU; background row controls and
  queues do not depend on the manager being visible or this tool being selected.
  Agreement/authorization checks remain required; disable cancels requests/removes controls.

## War and window changes

Players has a compact Collapse filters / Show filters button. It hides search,
sorting, activity, status and FF controls together, preserving their state and
the navigation/faction list. The preference persists with War settings.

All known TU windows receive Expand/Restore, including War and Travel windows.
Expanded geometry covers the entire web viewport and is saved separately from
normal bounds. Device fullscreen is offered only when the Fullscreen API exists.
Native PDA toolbar/OS chrome cannot be covered by page CSS. Actual native toolbar
coverage requires PDA's own fullscreen support and cannot be promised by TU.

## Validation and limitations

Automated checks use jsdom fixtures and mocked APIs, not an actual Torn account.
Market tests cover original formula outputs, fixed prices without requests,
manual quantities, max-minus/fixed/skip rules, rejected and remounted controlled
inputs, invalid IDs, dynamic controls, embedded settings, error preservation,
enable/disable, cache/key isolation, malformed JSON, rate limits and cancellation.
Existing regression suites cover manager/tools/agreements/API key management,
PDA initialization, windows, War, Travel and Item Monitor.

The existing acceptance catalog contains the added Market section; no live fields
are changed by its safe diagnostic. PASS/FAIL results apply only to completed checks;
live/device checks are SKIP/WARN until observed. Actual Android PDA, iOS PDA and
desktop Tampermonkey must be tested before production. Live weav3r requests are
unverified because the environment's host policy excludes weav3r.dev.

The unified artifact grows to approximately 1.41 MB with the retained pricing engine,
analytics and help; its explicit payload regression ceiling is now 1.45 MB.
No unrelated assets or runtime packages were added. The project does not define a
lint command; syntax/PDA typography checks run as part of the normal build.

Production recommendation: DEV acceptance only until real-host input, queue,
analytics/popup, provider and fullscreen checks pass. Production publication still
requires explicit user approval.

## DEV installation

PDA Android/iOS and desktop Tampermonkey use the same unified DEV script:
https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/market-price-auto-fill/torn-utilities/releases/dev/torn-utilities-0.5.42.126-dev.user.js

The review branch update/download URL remains on that branch. Replace the existing
TU DEV installation rather than enabling two TU managers at once. Enable the new
tool in Business Tools after verifying the TU session. A production installation
need not be replaced for review if the user chooses a separate testing profile.

Validation evidence: the full repository npm test command completed successfully;
focused Market, War navigation/filter, manager integration and build-consistency
checks were rerun after the final hardening changes. Headless Chromium UI capture
stalled in this environment; visual/device acceptance is not claimed.

## Established DEV update channel

Build 0.5.42.127-dev makes this integration available through the established
`dev/tu-all-in-one` auto-update channel. The isolated .126 review artifact remains
available on its review branch. Production remains unchanged.

Canonical DEV installation/update URL:
https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js

## PDA window defect fixed in .128

The .127 PDA report identified a failed manual Market tool check despite seven
automatic checks passing. The settings had been mounted in an unpositioned body
host while the Manager hid itself. The visible module content also caused the
launcher to hide, leaving the settings and its enable toggle inaccessible.

The market settings now use a fixed TU-managed window registered with shared
window navigation, expansion and layout persistence. The new lifecycle regression
checks actual visibility, TU branding, navigation controls, enable, minimize/restore,
Back/reopen, background enable preference and Exit/launcher recovery. Diagnostic
exports now include the Market tool's own window, input and network state; TU Test
metadata, visible label and exported version consistently identify 0.2.49-dev.

Automated Market, manager integration (191 checks), War navigation, diagnostics,
PDA-loader/startup and idle-performance checks passed. Actual PDA pricing needs
a user retest: the attached report has no market-page capture or pricing error.

## PDA quantity detection fixed in .129

The .128 report showed the tool enabled and market rows detected, but three
`Available quantity is unknown` errors. The user confirmed quantity was not filling.
The prior detector only searched the pricing-info container. It now searches the
complete owning item row, validated maximum attributes, marked quantity/count
elements, ASCII x, multiplication-sign ×, and labeled available/owned counts.
No oversized input probe or submission is used. Tests move the count outside
pricing controls and remove the input maximum attribute, reproducing the failure
and verifying max-minus fills and preservation of manually entered quantities.
Quantity-source evidence is exported; local quantity errors no longer masquerade
as a failed network request. Native PDA verification remains required.

## Shared quantity handling and diagnostic updates in .130

Market Auto Fill and Item Monitor now use the same stock quantity reader in the
unified bundle. Market-specific owned counts and validated input bounds remain
first choices. If they are absent, an explicit Fill may use the unique native
quantity MAX control, following Snatch and Run's verified native-maximum approach.
The fallback is restricted to the matching quantity input container and non-submit
controls. It verifies a stable accepted quantity twice, restores the original field,
then applies the configured max/max-N amount through the shared React setter.
Stop/cancellation restores the pre-MAX field. No purchase/listing submit or
price-side MAX control is clicked. Missing or ambiguous controls remain errors.

Tests cover absent quantities, native MAX, max-N, cancellation during MAX, unrelated
price controls and submit rejection, alongside manual quantity preservation.

The diagnostics updater previously retained version 0.2.49-dev while its bundled TU
target changed. A host could therefore retain an outdated required TU version.
The diagnostics version now uses the full TU release version at build time:
TU and TU Test both identify 0.5.42.130-dev, including future numeric rollovers. Metadata, visible version and
export agree automatically on future builds. Version mismatch guidance asks users
to update both scripts rather than downgrade TU. Strict per-build acceptance
isolation remains. Update both the unified TU script and the existing diagnostic
script through their established DEV URLs; production is unchanged.

## Current-list control and live Favorites in .131

The .130 PDA report confirms accepted input values, a successful pricing response,
16 identified market rows and no recorded errors. It reports stale Favorites and
Excluded module lists. The settings snapshot is replaced with live named lists,
synchronized ID editors and remove actions. Row star transitions update an already
open module immediately. Saved string IDs are normalized to numeric IDs; saving
one list removes conflicting membership in the other. Names are cached from
visible item rows; unseen items remain identifiable by item ID.

The new $ button is inserted beside the native Fill box when that control is
identified. Otherwise it remains at the current market list bottom, then relocates
when the native control mounts. It is not a floating launcher. It fills maximum
quantities and configured prices for current mounted rows without requiring
favorites. Excluded items and skip rules are untouched, manually entered quantities
are preserved, and already-filled rows are skipped. The explicit max action
overrides other non-skip quantity rules; the existing favorites command retains
its configured quantity rules. Separate rows/stacks of one item are processed
individually. No listing is submitted and Torn's own Fill checkbox is not toggled.
The button becomes Stop while the paced queue runs, with progress beside it.
List mode finishes after its snapshot rather than watching future lists.

Automated tests cover footer adjacency/remounts, all-list max, duplicate IDs,
exclusions/skip/manual amounts, no form submission, live names/list synchronization,
legacy ID types and persistence. Actual native PDA footer placement remains an
acceptance check; its detected placement is included in the diagnostic export.
Both TU and Testing and Diagnostics update together as 0.5.42.131-dev.

## Canonical marks, keep quantities and scrolling in .132

Visible row controls are now rebound when Torn reuses a row for a different item.
Native identity attributes and image/control changes trigger reconciliation. Stale
handlers cannot change another item's marks, and another tab's persisted mark
changes are reflected in the module. Remove/unmark clears saved restriction values;
only marked IDs populate the corresponding lists. Marks for genuinely off-page
items remain persistent rather than being erased by scrolling.

Restricted items now have a Keep quantity editor. Existing exclusions default to
all copies, preserving their prior protection. A number such as 1 permits only
surplus to fill. The per-run ledger reserves copies once across separate stacks;
one-copy rows stay unfilled when their copy is reserved. A manually entered amount
above the permitted surplus fails without overwriting it. Changes to a restriction
cancel pending filling and invalidate tool-prepared prices for that item; a new
Fill recalculates against the saved count. No listing is submitted.

The list queue retains logical work keyed by native item/stack identifiers, with
an occurrence fallback for stable groups. Unmounted work remains pending instead
of being marked complete. Scrolling and remounts can resume pending work, while
recycled rows cannot receive a prior item's price or rollback. Already completed
rows remounted with empty fields can be refilled while the run remains active.
Ambiguous duplicate groups wait until identifiable; status exposes pending rows
and Stop remains available. Navigation to another route cancels the run.

Regression fixtures cover canonical mark removal, storage events, native-ID row
reuse, keep-one across two stacks, manual cap rejection, only-copy preservation,
unmounting a queued row, recycling an in-flight price row, resuming both rows and
no form submission. Physical Android/iOS PDA scrolling still needs acceptance.
TU and Testing and Diagnostics both identify 0.5.42.132-dev.

The restricted editor includes an All button for touch keyboards; saving 0 removes
the restriction and its mark. Changing a keep quantity refreshes row tooltips and
clears prepared prices before recalculation while preserving manual quantities.
Temporarily disabled/remounted fields wait for native readiness instead of being
counted as completed; single-copy selection checkboxes can unlock their price
field while protected single copies remain unselected.

## Alphabetical lists, search and master Save in .133

Favorites and Restricted items sort alphabetically by cached item name, ignoring
case and using item ID as the tie-breaker. A shared search field filters both lists
by name keywords or item ID, with matching/total counts and empty-result messages.
Unknown names retain an Item [ID] label until Torn supplies the name.

Per-item Save quantity, Save Favorites and Save Excluded buttons are replaced by
one Save changes button at the bottom of the combined list pane. Keep quantities,
All and manual ID edits are drafts until that button is pressed. Drafts persist
through filtering and name/row refreshes, including items hidden by search.
All drafts validate before any settings are written; invalid values prevent
partial application. Row marks and Remove continue to apply immediately and
update staged ID edits so a later Save does not resurrect a removed mark.
Search and focused quantity controls retain focus on refresh.

Tests cover alphabetical ordering, case-insensitive multi-keyword and ID search,
draft retention, hidden-item batch saving, one bottom Save, validation without
partial persistence, All drafts, removal and existing restriction/fill workflows.
TU and Testing and Diagnostics both identify 0.5.42.133-dev.
