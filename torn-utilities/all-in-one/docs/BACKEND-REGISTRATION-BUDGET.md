# Shared DEV registration budget

Status: source and DEV configuration prepared; **not deployed**. No client release or agreement publication. The active agreement and exact approved draft are unchanged.

## Behavior

Every well-formed `/api/auth/register` request must obtain a reservation from a single named `RegistrationBudget` Durable Object before the first Torn verification call. Storage transactions enforce these limits across Worker instances:

| Scope | Registrations per rolling 70 seconds | Maximum reserved Torn reads |
| --- | ---: | ---: |
| Entire DEV Worker | 500 | 1000 |
| Same API key | 10 | 20 |
| Same Cloudflare client IP | 20 | 40 |

Each reservation budgets both possible Torn requests. Failed or partial verification is not refunded. The extra ten seconds covers the existing eight-second verification deadline. The reservation does not expire at a fixed minute boundary. Limit responses return 429 with Retry-After: 70. An unavailable/missing limiter returns 503 and makes no Torn request. There is no automatic retry or per-instance fallback.

The Worker reads `CF-Connecting-IP`, rather than user-supplied forwarded-IP chains. Missing addresses share the conservative `unknown` IP bucket. Shared NATs may encounter the IP limit. All keys/IPs use the same object name; callers cannot select their own counter partition. The limiter route is internal to its binding, not a new public endpoint.

Only domain-separated SHA-256 key/IP fingerprints and timestamps are sent to and stored by the limiter. These are pseudonymous identifiers, not anonymous data. State is bounded to 500 reservations (under the storage value-size limit). Expired reservations no longer count after 70 seconds; a Durable Object alarm removes expired records even when traffic stops. Actual deletion timing depends on alarm execution/retries and does not establish platform backup or log retention. Raw keys remain only in the registration verification path and Torn Authorization header, as before.

## Verification and deployment hold

`npm run test:backend-safety` checks existing verification behavior plus concurrent key/IP/global limits, persistence across object reconstruction, expiry, alarm cleanup, state size, failure handling, and unauthorized private routes. The transaction tests use a serial storage double; they do not establish Cloudflare runtime or deployed behavior.

The DEV config declares `REGISTRATION_BUDGET` and the `registration-budget-v1` SQLite-class migration. Before any separately authorized deployment, inspect existing remote migration history and reconcile the new tag, validate the class/binding in a Cloudflare-compatible runtime, and test concurrent requests and alarm cleanup in DEV. Missing binding intentionally blocks registration. Do not deploy the Worker without that preparation. This source commit does not run a deployment or migration.

This budget covers this Worker's registration reads only. It cannot enforce Torn's account-wide limit across other keys/apps, coordinate different Workers sharing an outbound IP, or establish that Cloudflare's egress IP is dedicated to TU. The 1000-read global budget leaves headroom under the documented 5000/IP/minute ceiling, but is not proof of IP-wide compliance. Live egress, logging, retention and operator access remain operational audit items. The initial unauthenticated-route tests do not constitute a complete authorization audit.
