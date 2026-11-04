# TU agreement publication — DEV

**GitHub is authoritative; Cloudflare D1 is synchronized automatically.**

Current published manifest: [current.json](./current.json). This file contains the agreement metadata and exact Markdown text as JSON. Only authorized TU personnel/agents should modify it. Protect the publication branch with repository permissions and review rules.

## Publish a new version

1. Edit `current.json` on `dev/tu-all-in-one`. Increment both `agreement_version` and monotonically increasing `agreement_number`, set the effective `agreement_date` (YYYY-MM-DD), and update the matching Version / Agreement number / Effective date lines in `content`.
2. Review and commit. Do not rewrite a previously published agreement number; D1 rejects conflicts and rollback.
3. The DEV Cloudflare Worker retrieves the manifest from GitHub (edge cache TTL 60 seconds) when serving agreement endpoints, validates it, and automatically inserts the new immutable row and switches the current pointer in a D1 batch.
4. TU Manager fetches the worker's current agreement and requires renewed acceptance when its version changes. No manual D1 SQL or worker redeploy for future edits.
5. Verify `https://tu-multiplayer-server-dev.tuserver.workers.dev/api/auth/agreement/current` and inspect D1 if needed.

## Initial deployment only

The updated worker code must be deployed **once** to `tu-multiplayer-server-dev`, with `TU_USERS_DB` bound to `tu-users-dev`. The `tu_agreement_registry` table must already exist. Existing agreement events in `FOREIGN_DB` are retained. Do not deploy DEV code to PROD.

## Failure handling

If GitHub is unavailable or publishes invalid data, agreement verification fails closed with 503; the Worker does not silently accept an outdated agreement. A published agreement number is immutable and cannot be reused for different text. GitHub repository controls are therefore critical.

**Security limitation:** This implementation trusts the configured GitHub branch and HTTPS; it does not cryptographically sign releases. A compromised authorized publisher could alter the manifest. Use branch protection and limited write access. The worker fetches at request time with a 60-second edge cache, not a scheduled polling job.
