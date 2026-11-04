# Option A deployment status

The source for the deployed DEV authentication worker at `tu-multiplayer-server-dev.tuserver.workers.dev` was not located in the connected GitHub repositories. `RelaxSweety/TU-Multiplayer-Server` exposes `/api/access/agreements` and `/api/access/confirm`, not `/api/auth/register` or `/api/auth/agreement`. Do not deploy its source over the working DEV auth worker.

Existing DEV-only implementation: `src/backend/verify-registration-key.js` and `src/core/server-verifier.js`; tests in `tests/core-smoke.mjs`. The verifier has not been integrated into the deployed auth handler or tested against live Torn API.

Required to proceed: locate the Cloudflare worker source or provide Cloudflare deployment access, then patch the existing `/api/auth/register` handler and deploy to DEV only. Production must remain untouched.
