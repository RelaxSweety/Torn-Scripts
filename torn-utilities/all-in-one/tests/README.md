# Automated validation

Run `npm run validate` from `torn-utilities/all-in-one` with Node 24. `core-smoke.mjs` checks credential verification/rejection, backend verification contracts, registration fault isolation and diagnostic redaction. `integration.mjs` checks the actual generated bundle in shared and isolated Window fixtures, lazy startup, all 11 tools, repeat activation, interval cleanup, duplicate DOM IDs, About, agreement persistence and registration, key visibility/access rejection, fetch fallback, storage backup/restore, time settings, window controls and DEV multiplayer credential separation.

Canvas, networking and browser bridge responses are mocked. These tests do not establish native PDA/Tampermonkey or live server compatibility. See `../docs/DEV-ACCEPTANCE.md` for remaining checks. `node scripts/build-dev.mjs --check` verifies committed release files exactly match the reproducible build.
