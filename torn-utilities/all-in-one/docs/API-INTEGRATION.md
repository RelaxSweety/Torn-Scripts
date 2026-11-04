# API verification integration — backend work required

The existing Manager calls the DEV worker /api/auth/register with api_key and then /api/auth/agreement. That existing flow currently assumes a Public Only key. The new credential controller does **not** bypass it.

Required backend contract before activation:
1. Accept a requested access level (public or limited) during registration.
2. Verify the actual Torn API access level and player identity server-side; reject Full Access or unknown levels unless explicitly designed and reviewed.
3. Return an authenticated result containing verified=true, accessLevel and playerId. A client-selected label must never be treated as verification.
4. Preserve agreement lookup, acceptance, renewal, cancellation, and session expiration.
5. Decide whether a Limited key can serve as the primary login key and migrate existing saved Public keys safely.
6. Ensure tokens and API keys are not recorded in diagnostics, logs or exports.

The current implementation is a reusable core library, **not** a connected production authentication flow. Do not replace the old authentication flow until the backend contract is implemented and tested on both platforms.
