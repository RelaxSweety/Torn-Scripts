# Agreement integration — development-only validation

Current production Managers must remain unchanged until integration and live testing are complete.

## Protocol
- Register: POST /api/auth/register with {platform,api_key}; response includes bearer token.
- Read agreement: GET /api/auth/agreement with bearer token.
- Accept: POST /api/auth/agreement with {action:"accepted",request_id:UUID,agreement_version:"1.0",agreement_number:1,agreement_date:"2026-10-22"}.
- Cancel before deleting key: POST /api/auth/agreement with {action:"cancelled",request_id:UUID}; successful response revokes sessions.
- Register again with API key, and require a new acceptance.
- Never copy development sessions into production storage or put the API key in URLs/logs.

## Blocking integration gaps
- PDA production currently calls /api/access/agreements and uses version 2026-10-20.
- Tampermonkey production accepts agreement locally without server persistence.
- Neither production Manager uses the new bearer-session protocol.
- Dev-only adapter in agreement-client.mjs is not yet wired into either Manager.
- The dev Worker is not yet verified with authenticated live requests.
- The dev D1 ledger needs verification of acceptance, cancellation and reacceptance events.

## Required before promotion
1. Wire both Managers on development branch with explicit opt-in and separate session storage.
2. Ensure API-key deletion calls cancellation before clearing key; fail safely on network errors.
3. Show canonical agreement text and record matching metadata.
4. Verify D1 ledger event history and revocation via authenticated live tests.
5. Keep production release manual and require explicit approval.
