# Authentication backend audit — 2026-11-04

## Confirmed source review
- Manager source: `torn-utilities/core/cross-platform/torn-utilities.user.js` on `dev/tu-all-in-one`.
- Current Manager auth service: `https://tu-multiplayer-server-dev.tuserver.workers.dev`.
- Manager endpoints: `POST /api/auth/register`, `GET/POST /api/auth/agreement`.
- Registration body currently includes `api_key` and `platform`; renewal assumes a Public Only key.
- Connected repository `RelaxSweety/TU-Multiplayer-Server` main, `src/index.js` routes `/api/access/agreements` and `/api/access/confirm`, not `/api/auth/register`.
- `src/access/agreements.js` validates identity using Torn v1 user basic, but does not independently verify a key's Public/Limited permission classification.
- The source of the DEV auth worker has **not** been identified; do not assume this multiplayer repository is the same deployed service.

## Blocker
The proposed `POST /api/auth/verify-key` endpoint in `src/core/server-verifier.js` is a **contract proposal**, not a deployed route. The actual DEV auth worker must be located and audited before client integration.

## Required backend behavior
1. Accept key and requested Public/Limited access; never trust requested access as actual access.
2. Query Torn's authoritative key metadata (confirm endpoint and schema against Torn API documentation) and identity, and reject revoked/invalid, Full or unrecognized access.
3. Return `{verified:true,accessLevel:'public'|'limited',playerId:<positive integer>}` only after verification.
4. Existing user agreement records are testing-only and need not be migrated. Implement a clean versioned agreement and session lifecycle for All-in-One; do not delete or overwrite old data until the replacement is validated.
5. Do not log/store raw API keys unless explicitly required by a reviewed security design.
6. Add automated tests for Public, Limited, Full, invalid, revoked, mismatched and Torn API failures.
7. Deploy to isolated DEV and manually validate PDA and Tampermonkey before switching Manager login.

## Safety
Do not modify production worker routes, unrelated database records, or the existing Manager authentication based on this audit. Existing TU agreement test records may be abandoned during migration; destructive deletion requires a separate explicit deployment decision.

## User decision
On 2026-11-04 the user confirmed all previous TU agreements were testing-only. Backward compatibility and preservation of prior agreement acceptance history are **not requirements** for the All-in-One authentication rebuild.
