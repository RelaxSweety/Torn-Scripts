# TU client API request safeguards — DEV .83

The approved agreement 1.3 is queued separately and is not active. This release changes API request handling only; the current agreement remains 1.2 / number 3.

- A common browser-origin budget reserves up to 60 Torn API requests per rolling minute across TU keys and bundled modules. Cached responses are counted conservatively. There is no automatic retry when the budget is exhausted.
- Before registration, reserve two slots for the current backend's possible key/info and user/basic reads. A failed registration verification is suspended locally; a successful explicit key/info verification is required before reuse.
- Torn error codes 1/2/10/13/18 suspend that credential for automatic reads. The suspended state survives navigation/reload. Explicit Verify in API Keys can test key/info once; it clears suspension only after a successful key-info response with an owner and access information.
- API limit/IP-block responses (5/8) and HTTP 429/503 impose a shared one-minute cooldown. Errors include a local code and remaining delay for callers. Requests are not replayed.
- Manager and bundled module fetch, GM and legacy PDA GET API paths use the same guard. Read-only API requests are distinguished by the exact https://api.torn.com origin. Torn website actions, TU backend/game requests, and unrelated services are not treated as API mutations or silently delayed by this guard.
- The budget record contains timestamps, non-authenticating credential fingerprints, suspension codes and cooldowns. It does not contain API keys, request URLs, response bodies or authorization headers. Existing key storage remains a separate security issue; this does not turn localStorage into a secure vault.
- Web Locks serialize budget changes across supported tabs. Without Web Locks, each window serializes its own changes and checks shared localStorage; cross-tab updates are best effort rather than atomic. The status API exposes that distinction. Storage failure prevents a new API request rather than bypassing the budget.
- This is a TU client budget, not control over all traffic for a Torn account. Other scripts/apps, other browser profiles/devices, operator-origin server jobs and the service-wide IP quota require separate coordination. The 60-request cap leaves headroom but cannot guarantee the account's aggregate limit when unrelated tools also run. Backend reservations depend on the current two-read registration contract.

Tests cover multiple keys/controllers, persistent suspension, manual restoration, backend verification reservations, JSON API errors, GM and fetch, non-API gameplay pass-through, and concurrent reservations across simulated tabs with Web Locks.
