# DEV agreement registry deployment

Do not apply to PROD. No existing agreement-event tables should be deleted.

1. In Cloudflare Dashboard open D1 > **tu-users-dev** > Console.
2. Execute the full SQL from `migrations/20261104_agreement_registry_dev.sql` against **tu-users-dev** (the worker's `TU_USERS_DB` binding).
3. Verify:
   ```sql
   SELECT agreement_number,agreement_version,agreement_date,is_current
   FROM tu_agreement_registry ORDER BY agreement_number;
   ```
   Exactly one row should have `is_current=1`, initially agreement 1.2 / number 3.
4. Only after migration, deploy the complete `tu-multiplayer-server-dev-option-a.js` source to **tu-multiplayer-server-dev**. Keep existing D1 and Durable Object bindings. Never deploy to PROD.
5. In a browser check `https://tu-multiplayer-server-dev.tuserver.workers.dev/api/auth/agreement/current` returns the `agreement` object and `content` for 1.2.
6. Install DEV Manager v0.5.42.22 and Diagnostics v0.1.8; use the diagnostics **Check DEV agreement** button. Verify Public Only and Limited Access acceptance, reload/session renewal, and that old agreement acceptance is rejected until reaccepted.

## Publishing future agreements (no worker redeploy)

Use a transaction (or a single D1 batch) to insert a **new immutable row**, unset the old current row, and set the new row current. Maintain the unique partial index so only one agreement can be current. Keep old versions and existing `tu_agreement_events`. Do not update the text of a published historical agreement. Never publish a new version without verifying the text and the matching version, number, and effective date.

Example for a future 1.3: insert `agreement_number=4`, `agreement_version='1.3'`, an ISO date and complete content with `is_current=0`, then update the old current to 0 and the new row to 1. Do this atomically using a D1 transaction/batch.

## Failure behavior

If D1 is unavailable, the worker returns 503 for current agreement and acceptance requests; it must not silently fall back to an older bundled agreement. The Manager must not accept an agreement it cannot retrieve.

## Limitations

This GitHub change does not itself execute the D1 migration or deploy Cloudflare. No live end-to-end tests have been run. The bundled agreement in worker source remains only as legacy source data, not as the runtime source of truth.
