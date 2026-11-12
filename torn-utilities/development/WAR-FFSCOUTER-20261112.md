# War Organizer estimates and filters — DEV .105

Current .113 private session-cache retention is described in
[shared War coordination](WAR-SHARED-COORDINATION-20261112.md); it supersedes the
original memory-only estimate retention below. Premium data remains personal.

Current .107 separate-key behavior supersedes the original key fallback described below. See [separate key selection and validation](WAR-FFSCOUTER-KEYS-20261112.md).

TU **0.5.42.105-dev**, War Organizer **0.3.19-dev**; Item Monitor remains **1.12.53-dev**.

Targets place the player name, battle-stat estimate and personalized FF on one line. Level, HP, status, countdown and activity share the second line. Reserve controls retain at least 44px height. FF sorts numerically in either direction, with unavailable values last; minimum/maximum ranges use the displayed two-decimal value. The Okay filter matches only Okay players. Both faction headers show Online and colored Okay (green), Hosp (red), Trvl (blue) totals from the complete roster. Trvl includes traveling and abroad members. Counts are not affected by target filters.

## Optional provider and privacy

FFScouter is off by default. War Organizer Settings discloses the recipient, selected-key/target-ID transmission and provider policy links before its explicit checkbox. A trusted checkbox event is required to enable requests. Each viewer uses their verified War Organizer key, falling back to their TU login key when no War key is selected; it must already be registered with FFScouter. No automatic provider registration is performed.

The Manager keeps raw keys inside its closure, sends GET requests directly to `https://ffscouter.com/api/v1/get-stats` with `key` and `targets`, and returns only sanitized statistics to the module. No TU session token or Torn Authorization header is sent. The request uses anonymous/omit-credentials mode and rejects redirects where the transport supports that option. Batches contain at most 200 IDs; results are cached in memory for ten minutes, scoped to a SHA-256 viewer/key identifier. Consent stores that identifier and account ID, never the key. Changed keys/accounts require fresh consent, clear displayed estimates and discard late responses. Disable, authorization loss and TU deletion clear the relevant cache; TU deletion also removes matching local consent. Generic errors omit request URLs, keys and provider response bodies. Errors back off for 60 seconds, or 120 seconds after HTTP 429. Offline mode pauses requests. No FF values enter shared storage, saved rosters or exports.

The API contract and policy URL were cross-checked against the official Torn PDA client at commit `28fdc2b8a0ea6e39758ceba8483d4cf4367c4067`, `lib/utils/external/ffscouter_comm.dart` and its models/info widget. The current agreement 1.4 / number 5 already provides for optional integrations with disclosure, policy links and opt-in; it was not changed.

## Validation and limitations

Build: `npm run build`, integrated payload **991759 bytes**. Service tests cover per-user/key isolation, consent, stale responses, batching, cache, malformed/duplicate data, cooldowns, disable, deletion and authorization loss. Module tests cover inline fields, numeric sorts, unknown values last, rounded-value range boundaries, Okay filtering, full-roster faction totals and key invalidation. The full `npm test` regression suite passed, including backend ownership/deletion/security, agreement, travel, purchase, healing and existing War window navigation/minimize checks. Final layout/link changes were rechecked with the focused module/navigation/PDA tests and generated-bundle browser fixture.

`scripts/validate-war-scouter.py` tests the complete generated bundle in Chromium at desktop 1280×900, mobile portrait 390×844 and landscape 844×390. It checks trusted opt-in, rejected programmatic consent spoofing, no pre-consent provider calls, anonymous batched transport without TU tokens, inline layout, 44px Reserve targets, range/Okay filters, cached refresh and disabling. All identities, rosters, credentials and responses are synthetic; no real tester data or gameplay actions are used. Screenshots are under [evidence/war-scouter-105](evidence/war-scouter-105/).

## Live public verification and correction — .106-dev, 2026-11-12

TU **0.5.42.106-dev**, War Organizer **0.3.20-dev**; Item Monitor remains **1.12.53-dev**. The new environment reports current observations, running state and **enforced** restricted network policy including `ffscouter.com`; the startup policy agrees. Public HTTPS requests succeeded through the inherited proxy. The sandbox could not reach the proxy and could not launch Chromium; approved outer-executor retries succeeded. No allowlist change was needed.

Read the public [OpenAPI explorer](https://ffscouter.com/openapi), linked specification `/openapi/spec.yaml` (**API version 1.20.0**), [API guidance](https://ffscouter.com/api-docs/guidance), [API data policy](https://ffscouter.com/#data-policy), [privacy policy](https://ffscouter.com/privacy) and [key safety guide](https://ffscouter.com/guides/api-keys). Sanitized public excerpts, specification hash and transport evidence are in [war-scouter-106](evidence/war-scouter-106/).

Contract matches: GET `/api/v1/get-stats`, registered 16-alphanumeric-character `key`, comma-separated `targets`, JSON array with `player_id`, nullable `bs_estimate`, `fair_fight`, Unix `last_updated`. Additional fields can be ignored. The documented maximum is **205**, so our 200-target batches are valid. Errors include 400 validation, 401 unregistered key, 403 bans and 429 throttling; documented limit is 120 requests/minute/IP. Existing generic errors and cooldowns remain. Guidance recommends one-hour per-viewer caching; the current ten-minute cache is shorter than that recommendation, not a documented contract violation. No per-target repeated polling is introduced.

Registration is a separate user action requiring provider-approved custom permissions or Limited/Full keys (the provider discourages the latter). A TU public-only key alone does not meet registration requirements. The provider policy lists persistent API-key/private-stat storage until account deletion, permanent player IDs/public estimates, battle/personal-stat AI training, and provider owner access. Its privacy policy additionally describes IP/request metadata logging and retention. Disabling TU's integration clears local cached estimates and prevents further requests; it does not delete the user's provider registration or data. Provider deletion is separate and public estimates may remain.

Corrected Settings to link the specific API Data Policy hash, separate Privacy Policy and API Guidance (instead of labeling the homepage as Terms), with a provider premium/support link. Expanded the existing pre-opt-in disclosure to cover registration permissions, provider key/private-stat retention and AI training. Consent remains off by default and scoped to the user's verified selected key; no automatic registration or agreement change.

Live **credential-free** GET returned HTTP 400 JSON `{"code":1,"error":"API key is required"}`, matching the specification. A GET with Torn Origin returned `Access-Control-Allow-Origin: *`; OPTIONS returned HTTP 204 permitting GET. Isolated Chromium successfully fetched the real endpoint from a synthetic `https://www.torn.com` page using the implementation's `Accept: application/json`, `credentials: omit`, `redirect: error`, `cache: no-store` options and read the same CORS JSON response. No real Torn page, credentials, cookies, account, roster or API target IDs were used.

**Limits:** this verifies public documentation, live unauthenticated HTTPS and browser fetch/CORS error-response transport only. It does not verify registered-key acceptance, personalized FF, successful authenticated response headers/schema, estimate accuracy, Tampermonkey GM transport, or real PDA/device transport. Prior full-bundle tests use synthetic GM transport and responses. No credentials were requested or used; no registration endpoint was called.

Validation for .106: build and full npm regression suite; full generated-bundle Chromium fixture at desktop, mobile portrait and landscape. Evidence remains synthetic except the explicitly labeled public provider snapshots and credential-free transport check. Archived .105 and earlier releases remain unchanged.


## Recovery and publication boundary

Recovery reference: prior DEV commit `bb44054a37ebfab49e8d88813c080749bb2229a0` and archived `torn-utilities-0.5.42.104-dev.user.js`, unchanged. Publish only `dev/tu-all-in-one` and `release/approved-changes-20261110`. Separate production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`. No Worker, database, backend storage or agreement changes are part of this release.

Implementation files: `all-in-one/src/features/ffscouter.js`, `all-in-one/src/manager/manager.user.js`, `all-in-one/src/ui/compact.css`, `modules/war-hit-organizer.user.js`, build/release/tool configuration, regression tests and browser fixture, evidence, generated DEV distributions, this record and the implementation queue.

DEV installation: https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js
