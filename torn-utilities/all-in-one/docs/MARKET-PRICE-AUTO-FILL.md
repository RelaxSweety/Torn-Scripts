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
