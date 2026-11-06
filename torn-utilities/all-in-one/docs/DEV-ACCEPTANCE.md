## PDA performance update: 0.5.42.37-dev

The Manager filters/batches window mutation work and Item Monitor skips empty/hidden scans. [Investigation and repeatable measurements](PDA-PERFORMANCE.md) document the reproduced excess DOM work and regression coverage. Actual PDA lag/frame-rate resolution remains unverified until device retesting; use TU Test v0.2.3 against this build. The approved logo and existing saved-key behavior are preserved.

## Saved-key update: 0.5.42.36-dev

Settings now retains multiple validated keys independently, labels each from its own verified metadata, preserves the login when adding a key, offers explicit login/War Organizer selection, and removes matching copies of only the selected key. Legacy keys can be rechecked; incompatible-account War key roles are cleared without deleting the saved key. Dedicated saved-key regressions cover the reported failure, persistence, account isolation, deletion, failed requests and GM fallback. Re-run the updated TU Test v0.2.2 (52 checks) against this build; actual PDA/Tampermonkey retesting and authorized backend event evidence remain required. Previous build test evidence is preserved separately.

## Tool removal: 0.5.42.34-dev

Stock and Calculations is excluded from the integrated build, navigation and registration. Ten tools remain. Historical standalone source, releases and stored settings are retained. Native device testing remains manual.

## Logo update: 0.5.42.33-dev

Selected sample #1 Integrated Gold replaces the DEV launcher, shared header and War Organizer logos. Core smoke tests and all 191 integration assertions pass; committed-output checks pass. The previous 0.5.42.32-dev file is preserved. Native device logo rendering remains a manual acceptance check.

# DEV 0.5.42.32 acceptance report

Release date: 2026-11-05. Branch: `dev/tu-all-in-one`. This is a DEV userscript for user review, with 11 retained tools. The working pre-integration Manager and all Worker/database files are unchanged.

## Automated results

- PASS: existing core smoke suite, including Public Only / Limited Access verification contracts, rejected Full/Custom keys, identity requirements, fault isolation and diagnostic redaction.
- PASS: 191 integration assertions against the generated userscript with jsdom. Shared and isolated Window fixtures cover startup and duplicate injection, 11 lazy registrations, every tool's activation/deactivation and repeated opening, interval cleanup and duplicate DOM IDs, published agreement rendering and persistence, accepted/rejected registration, Show/Hide controls, no-GM fetch fallback, navigation, structured Version Notes, backup/restore, credential exclusion from Manager backups/diagnostics, saved time settings, minimize/restore/exit, and DEV account/room header separation.
- PASS: source and bundle syntax, one metadata header, exactly 11 tools, no external module catalog or War Status Diagnostic, no production backend URL or patch headers, matching release version.
- PASS: deterministic generation; rolling DEV, versioned DEV and staging outputs match byte for byte. `node scripts/build-dev.mjs --check` rejects stale release files.
- NOT TESTED here: hosted GitHub Actions execution. A DEV workflow is committed; local equivalent commands passed.

Mocks replace HTTP/backend responses, account credentials and canvas drawing. Assertions on tool lifecycle do not verify graphics, actual touch input, online game rules or service authorization against live accounts.

## Manual acceptance required on both platforms

Record device/browser, OS, userscript host version, results and errors. Never include API keys or session tokens in screenshots, logs or reports.

- [ ] Install the complete version-specific file and update through the rolling URL, with the old Manager/tools disabled.
- [ ] Confirm the established gold T-inside-U SVG at standard and high density, compact launcher visibility and touch/pointer dragging.
- [ ] Register with Public Only and Limited Access; reject Full Access. Verify Show/Hide, useful authentication errors, saved access-level labels and session renewal across navigation/refresh.
- [ ] Compare the complete displayed agreement, version, number and date with the DEV published agreement. Verify accept/cancel event recording, cancellation/revocation, no repeat prompt for an accepted current version, and reacceptance after a genuine agreement update.
- [ ] Open, minimize, restore, Back, Exit, disable, re-enable and reopen every tool. Check mobile sizing, overflow, stacking, persistent positions, touch resize, no duplicate windows and no late requests/timers after exit.
- [ ] Play Flight Game, Stick Fighter and Slithering Streets, checking controls, canvas rendering, audio, scoring, saves and restoration.
- [ ] With two DEV accounts, create/join/play/finish/rematch Tic-Tac-Toe, Torn Four, Torn Fleet and Chaos Marbles. Verify reconnects, room tokens and histories; do not use production rooms.
- [ ] Check Travel monitoring, reports, alarms, predictions and reopening after cleanup on representative Torn pages.
- [ ] Check War Organizer roster/reservation/timer behavior with a Limited key, including faction API errors.
- [ ] Check Chat Archiver capture, pause/stop, scroll stability, stored records and CSV/JSON exports.
- [ ] Verify TU-managed backup/restore and each tool's legacy archive export separately. Manager backup does not contain all legacy storage or large chat archives.
- [ ] Verify native GM legacy/modern transport, PDA fallback capabilities, and backend/multiplayer connectivity on each host.

## Current limitations

Actual Torn PDA and Tampermonkey runtime tests: **NOT TESTED**. Live Torn API, DEV account authentication/events and multiplayer: **NOT TESTED**, no live account key was used. The cloud proxy denied the public DEV agreement request with CONNECT HTTP 403 because the DEV Worker hostname is outside its current allowlist. Environment settings need the saved domain additions before cloud live checks can run. No Worker deployment or production access was attempted.

The existing item-list catalog is Torn item data, not a TU module catalog; that data feature remains. Historical independent sources/catalogs remain for supported old builds and rollback, but are absent from the integrated build graph. DEV room sessions use separate keys; previous room sessions and historical records are retained. Backups keep the existing TU namespace format and do not claim coverage of legacy storage.

Release publication and direct raw artifact verification are recorded in the delivery response after Git push. Publication of the cloud environment is a separate user action in environment settings.
