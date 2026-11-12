# Separate FFScouter keys — DEV .107

TU **0.5.42.107-dev**, War Organizer **0.3.21-dev**, Item Monitor **1.12.53-dev**.

## Problem and behavior

A Torn-valid TU login/roster key can be different from the user's registered FFScouter key. The previous automatic fallback could send the wrong key. Every target then showed dashes, with the provider error below the full target list; a retry cooldown replaced the useful failure category. The mobile Settings screenshot also showed the FFScouter heading crowded against Save Settings, an oversized heading, and a checked consent box alongside stale "Off" text.

War Organizer Settings now asks which FFScouter key to use. It lists saved TU keys with access level, masked ending and owner, and offers password entry plus **Confirm & Save key**. Both saved-key selection and new entry revalidate `/v2/key/info` through the existing Torn request/verification process, require the current TU player as owner, and save a deduplicated record through the existing credential store. Only nonsecret selection metadata (`ffscouter: true`) is added to that record; there is no new raw-key storage field. Keys remain visible/removable in TU Settings > API Keys with an FFScouter role label. Custom and Full Access provider keys can be saved; TU login remains restricted to its existing Public Only/Limited Access levels. Login and roster selections remain unchanged.

**No login/roster-key fallback remains.** Existing installations must explicitly choose and confirm an FFScouter key. Selecting/rechecking a key clears consent and cached estimates, requiring the explicit provider consent checkbox again. Torn verification and saving do not call FFScouter. After opt-in, the first estimate request confirms provider acceptance; when no roster is selected it requests the viewer's own ID. No provider registration request is made.

Two labeled red/green indicators distinguish **Valid Key** (Torn verified the selected key belongs to this player) from **FFScouter Confirmed** (HTTP 200 JSON array containing a requested player result). A confirmed response can still have null estimates. Provider confirmation is held in memory, cleared on disabling/key/session changes or failed requests, and does not claim that every estimate is available or accurate. Successful saved Torn verification survives reload; provider confirmation is checked again on a fresh session. A failed explicit recheck of the selected key removes its verified status while retaining its saved record.

Network, HTTP 401 registration/rejection, HTTP 403 access denial, HTTP 429 rate limiting, malformed and conflicting responses retain fixed credential-free categories during cooldown, with remaining retry seconds. Provider text, request URLs, keys and tokens are not shown. The status now appears above the target list and updates in Settings, including after successful or failed consent changes.

Settings uses a separated section, restrained heading, consistent gaps, wrapping policy links, 44px key action buttons, password entry, and a collapsible detailed disclosure. Consent status and indicators share the current live state. API guidance, API data policy, privacy policy and provider support links remain available before opt-in.

## Validation and limits

Full build and npm regression suite; expanded saved-key integration tests cover same-owner validation, Custom/Full provider keys, masked options, unchanged login/roster roles, private persistence/reload, wrong-owner rejection, deletion/removal and no provider calls before consent. Service tests cover confirmation loss and preserved failure categories in cooldown.

Full generated-bundle Chromium tests use synthetic credentials, rosters and provider responses at desktop 1280×900, portrait 390×844 and landscape 844×390. They choose an existing saved key, then add a different Custom key, verify that only this separate key reaches FFScouter after trusted opt-in, assert green indicators on success, red provider confirmation on HTTP 401, and preserve the rejection reason on cooldown. Existing inline fields, filters/sorting, faction totals, 44px Reserve controls, cache and disable cleanup remain covered. Screenshots and logs: [war-scouter-107](evidence/war-scouter-107/).

The bundle grows by about 8KB from .106. Its explicit payload test budget is updated from 1,000,000 to 1,010,000 bytes for the new key-management controls. No performance timers, purchase/healing behavior or provider cache duration change.

No real credentials or tester data were used. Prior public live verification remains applicable to documentation and unauthenticated HTTPS/CORS only. Actual registered-key acceptance, live personalized FF/estimate accuracy and real PDA/GM transport still require user-side acceptance without sharing keys in chat. A green provider light in the synthetic fixture is not evidence of real authenticated success.

Only DEV branches `dev/tu-all-in-one` and `release/approved-changes-20261110` are publication targets. Production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`. No Workers, databases, production releases or agreements are changed. Archived .106 and earlier distributions/evidence are preserved.
