# Automated validation

Run `npm run validate` from `torn-utilities/all-in-one` with Node 24. `core-smoke.mjs` checks credential verification/rejection, backend verification contracts, registration fault isolation and diagnostic redaction. `integration.mjs` checks the actual generated bundle in shared and isolated Window fixtures, lazy startup, all 10 tools, repeat activation, interval cleanup, duplicate DOM IDs, About, agreement persistence and registration, key visibility/access rejection, fetch fallback, storage backup/restore, time settings, window controls and DEV multiplayer credential separation.

Canvas, networking and browser bridge responses are mocked. These tests do not establish native PDA/Tampermonkey or live server compatibility. See `../docs/DEV-ACCEPTANCE.md` for remaining checks. `node scripts/build-dev.mjs --check` verifies committed release files exactly match the reproducible build.

`diagnostics.mjs` validates the independent TU Test checklist/session engine and generated UI, including evidence gates, credential redaction, build/host isolation, complete exports and blocked networking. These are mocked jsdom tests, not native host acceptance. Run `node scripts/build-diagnostics.mjs --check` to reject a stale TU Test build. See `../docs/TU-TEST.md` for usage.

`environment.mjs` covers device/browser/host parsing, reduced user agents, PDA version availability, correct Tampermonkey version selection, Client Hints success/denial and preservation of manual metadata corrections. These fixtures do not constitute real-device acceptance.

`saved-keys.mjs` runs the generated Manager with mock Torn/DEV services to verify per-key access levels, multiple-key retention/deduplication, legacy recovery, explicit login/War selection, cross-player rejection, reload, failed operations, deletion of all selected-key copies and prevention of stale GM login recovery. Live device/account retesting is still required.

`performance.mjs` measures Manager root lookups/style reads and Item Monitor candidate queries under unrelated Torn updates, with zero or configured monitors. It checks header recreation, window visibility and hidden-page behavior. These work-count regressions are not a mobile frame-rate benchmark; see `../docs/PDA-PERFORMANCE.md`.

`session-lifecycle.mjs` validates warm navigation without HTTP, metadata-only rechecks, identity/profile reuse, full-text cache behavior, changed versions, read-only diagnostics, expired/revoked sessions, cross-tab logout and observer disconnection while the Manager/tools are idle.
