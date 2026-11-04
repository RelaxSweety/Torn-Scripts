# Option A — Extend existing Cloudflare registration

## Implemented on DEV branch
- `src/backend/verify-registration-key.js`: backend-only Torn key verification using `GET https://api.torn.com/v2/key/info`. Requires confirmed `info.access.type` and `info.user.id`; permits Public Only and Limited Access only.
- `src/core/server-verifier.js`: client adapter calling existing `POST /api/auth/register` and rejecting responses without verified access metadata.
- `tests/core-smoke.mjs`: contract tests for verification and failure paths.

## Required integration in the existing Cloudflare DEV worker
Locate the **actual deployed source** for `tu-multiplayer-server-dev.tuserver.workers.dev`. The connected `TU-Multiplayer-Server` repository exposes different routes and has not been proven to be this auth worker.

Inside the existing `POST /api/auth/register` handler, after validating the incoming API key and before issuing the session token:

```js
const verifiedKey = await verifyRegistrationKey(body.api_key);
if (body.requested_access && body.requested_access !== verifiedKey.accessLevel) {
  return json({error:'Requested access does not match verified key'},400);
}
// Use verifiedKey.playerId as the authoritative account identity.
// Continue the EXISTING registration/session creation logic.
// Add these fields to the existing successful registration JSON:
verified: true,
accessLevel: verifiedKey.accessLevel,
playerId: verifiedKey.playerId
```

The above is an integration illustration, **not a deployed patch**. Keep existing token issuance, agreement acceptance and renewal unchanged. Never trust the client-supplied access level as proof. Never log API keys.

## Activation gates
1. Find and update real DEV worker source, deploy DEV only.
2. Validate endpoint response and key metadata against real Torn Public/Limited keys.
3. Update Manager primary credential handling, session renewal and WHO credential reuse.
4. Update TU Testing & Diagnostics to include Public and Limited registration, mismatched keys and recovery.
5. Run automated tests and manually validate both PDA and Tampermonkey.
6. Only then publish an installable All-in-One DEV build.

The existing agreements are testing data; preserving acceptance history is not required.
