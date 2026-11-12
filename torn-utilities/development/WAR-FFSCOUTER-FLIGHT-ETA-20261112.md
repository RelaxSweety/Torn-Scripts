# Personal premium return-flight ETA — DEV .109

TU **0.5.42.109-dev**, War Organizer **0.3.23-dev**, Item Monitor unchanged at **1.12.53-dev**.

## Behavior

Players with a current return trip to Torn show a blue **ETA MM:SS** beside travel status for a viewer whose own selected FFScouter key has active premium access. When the provider supplies different earliest/latest arrival bounds, the display is **ETA MM:SS–MM:SS**, preserving that uncertainty. Minutes can exceed 59. Counts update locally every second with the existing target-list timer; they do not generate per-second requests. Outbound flights, abroad/non-traveling players, unknown destinations, missing/inverted/expired windows and past arrivals do not show an ETA. Expired cached values disappear, rather than freezing at zero.

The selected, Torn-verified FFScouter key and existing explicit opt-in are required. There is no fallback to a TU login/roster key and no use of another faction member's credentials. Settings explains personal premium flight access; target-list and Settings status lines report entitlement, pending access or sanitized errors.

Flight data and premium status live only in viewer/key-scoped Manager and module memory. They are not added to saved target records, reservations, shared storage, faction data, exports, backend calls or credentials. Key/account changes, authorization loss, disabling consent and TU deletion invalidate flight data and pending responses. Minimized windows and Offline mode make no flight requests. Offline mode also hides the premium ETA.

## Contract and request budget

Public official OpenAPI **1.20.0** checked on 2026-11-12:

- `GET /api/v1/check-key?key=...`: strict `is_registered`, `is_premium`, `policy_update_required` booleans. Registered + premium + no pending policy update is required. The response's echoed raw key and other account metadata are discarded.
- `GET /api/v1/player-flights/batch?key=...&targets=...`: at most **100 unique IDs** per batch. Response `flights[]` has `player_id` and nullable `current`; only the current leg's explicit return-to-Torn description, takeoff and valid earliest/latest arrival times are used. `recent_flights`/historical landings are not substituted.
- Active premium entitlement is checked at most every five minutes, bounded by a known entitlement expiry. Flight results are cached for at most 60 seconds and within that entitlement window. Existing 15-second roster refreshes reuse the cache. Only traveling target IDs are requested. Identical pending requests are deduplicated.
- Flight failures have a separate cooldown from battle estimates: 60 seconds for ordinary failures, 120 seconds for rate limiting. HTTP 401/403 clears the flight entitlement/cache. Provider messages, response bodies, URLs and credentials are never displayed in errors.
- Existing Manager anonymous GM / omit-credentials fetch transport is reused, with no Torn Authorization header, TU token, cookies, automatic registration or credential forwarding to the TU backend.

Public guidance prohibits premium redistribution and key sharing. This implementation displays data only to the entitled key owner and introduces no faction collector, aggregation or sharing mechanism. Each entitled viewer independently retrieves their own data through their own key.

Credential-free live GET probes of both endpoints returned the documented HTTP 400 `API key is required` response. No key or target ID was sent in these probes. Public contract excerpts and sanitized probe results are in [evidence/war-scouter-109](evidence/war-scouter-109/).

## Validation and limits

Build plus full npm regression suite. Dedicated premium-flight tests cover opt-in, per-key entitlement/policy gating, non-premium exclusion, 100-ID batches, cache reuse/expiry, return/outbound selection, malformed/conflicting data, sanitized network/rate errors, stale-response rejection and disable/auth changes. Module tests cover ETA placement, one-second local countdown updates without API calls, abroad exclusion and immediate key-change hiding.

Full generated-bundle Chromium checks at desktop 1280×900, mobile portrait 390×844 and landscape 844×390 cover own separate-key selection, premium ETA window beside traveling status, non-premium hiding, original FF fields/filters, faction totals, reserve height, consent and rejection behavior. All test credentials, identities, rosters and provider flight responses are synthetic. Screenshots and regression logs are in the evidence directory. The payload test budget is 1,020,000 bytes for the added flight contract/validation/UI code.

**Unverified:** real registered premium-key acceptance, live flight completeness/accuracy, actual return-description variants and real PDA/GM device transport. Public unauthenticated responses and mocked premium tests do not establish authenticated functionality. Provider arrival windows are estimates; TU does not infer or promise an exact landing time. Real user credentials/data were not requested or used.

DEV-only publication targets remain `dev/tu-all-in-one` and `release/approved-changes-20261110`; production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`. Archived .108 and earlier installers/evidence are preserved. No Workers, databases, agreements, production releases, purchase/healing workflows or navigation behavior are changed.
