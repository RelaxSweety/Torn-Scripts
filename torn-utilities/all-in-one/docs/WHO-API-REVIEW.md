# WHO Limited API implementation review — 2026-11-04

Source: `torn-utilities/core/cross-platform/torn-utilities.user.js` on `dev/tu-all-in-one`.

## Existing behavior
- TU Settings > API Keys accepts any 16-character key and invokes `requestIdentity(key)` to obtain `info.access.type` and `info.user.id` from Torn.
- Public Only keys are verified again via `updatePlayer(key)`, saved via `saveKey(key)`, and used for Manager registration.
- Limited Access keys are saved in `localStorage['tu:who:limited-api-key:v1']`; duplicates are removed from additional keys.
- Other key types can be stored in `tu:api:additional-keys:v1` after warning.
- Saved keys can be viewed and removed; they are stored locally without encryption.
- WHO `requestWhoTorn(path)` requires Manager authorization and reads the Limited key, allowing selected Torn v2 faction and player profile paths.
- Manager authorization and session renewal still depend on `readSavedKey()` (Public Only) and `POST /api/auth/register`.

## Assessment
Reuse WHO's Torn access metadata verification, key labeling, and scoped API request approach. Do **not** duplicate the storage model: migrate toward one verified primary credential with access metadata and optional scoped module credentials.

## Gaps
1. A Limited key cannot currently authenticate the Manager without a Public key.
2. WHO's Torn-side verification is not equivalent to Cloudflare server-side verification. Extend existing registration endpoint to verify actual access type.
3. Current WHO key is accessible to other page scripts through localStorage; evaluate secure storage boundaries and disclose limits.
4. Module-specific requests must check verified access scope and player identity. Current WHO path restriction alone is insufficient for permission enforcement.
5. The current settings UI permits storing Full Access keys; All-in-One should reject unsupported levels for its primary login.
6. Reconcile key ownership with Manager identity to avoid accidentally mixing keys from different accounts.

## Recommended implementation
1. Preserve the working Cloudflare registration/session/agreement flow.
2. Extend `POST /api/auth/register` response with server-confirmed `accessLevel` and `playerId`, without requiring a new endpoint.
3. Adapt existing WHO key detection and saved-key UI for Public or Limited as a primary credential.
4. Keep WHO's allowlisted request paths and add scope/identity checks.
5. Add diagnostics for Public login, Limited login, WHO data retrieval, rejection/mismatch, and key privacy.
6. Validate both PDA and Tampermonkey before switching login logic.

**No backend deployment or Manager authentication changes were made by this review.**
