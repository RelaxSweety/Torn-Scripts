# Independent TU Testing and Diagnostics DEV

This updates **TU Testing and Diagnostics DEV**, previously v0.1.9-dev, to **v0.2.3-dev**. It is the independent guided checklist at `dist/tu-diagnostics-dev.user.js`. The separate `torn-utilities/diagnostics/torn-pda-diagnostic.user.js` is unchanged.

[Install/update TU Test](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/all-in-one/dist/tu-diagnostics-dev.user.js)

Install alongside the integrated TU DEV userscript. The current checklist targets **0.5.42.37-dev**, contains **52 checks** and covers **10 tools**. Stock and Calculations is absent.

## Using it

1. Open **TU Test**, select the actual host (Tampermonkey or Torn PDA), and review the auto-filled device/OS/browser and host version. Correct or complete any editable values. Platform detection is a hint, not proof of compatibility.
2. Run **Run read-only checks**. Seven automatic checks inspect the installed version label, shared tool registrations, temporary local storage, the version-specific integrated DEV artifact and agreement publications. A registration/source check does not establish functional correctness. Blocked networking remains BLOCKED.
3. For the remaining 45 manual checks, follow the displayed steps in the actual selected host. Record observed behavior or a reproduction/blocking reason before marking PASS, FAIL, BLOCKED or SKIP. Use NOT TESTED to clear a result. Manual recording requires the target integrated TU build's version label to be present.
4. Exercise real DEV authentication and backend agreement acceptance/cancellation yourself. The test tool never accepts terms, registers keys, creates rooms, submits gameplay, or deploys backend changes. Controlled agreement-version-change tests need an authorized DEV setup; leave BLOCKED when unavailable.
5. Complete functional and lifecycle checks for every tool. Multiplayer requires separate DEV accounts and fresh DEV rooms; check full games, reconnects, rematches, histories and token handling. Use device-specific input/audio/rendering checks for games.
6. Repeat on the other host. PDA and Tampermonkey results are independent, keyed by target build and checklist version. A mock/browser fixture cannot count as native host evidence. When testing on separate devices, export each device's report and retain both; results are not synchronized or automatically merged.
7. Use **Export both host reports** to save JSON evidence. Both host checklists must pass every critical check and include device/host metadata for `acceptanceComplete`. SKIP, BLOCKED and NOT TESTED do not satisfy completion. `productionAuthorized` always remains false; production still requires review and a separate explicit decision.

Notes/feedback are sanitized for common API key, bearer token, UUID and JWT patterns. Never enter credentials: redaction is a safeguard, not a credential-input feature. Exports include every check, including untested entries and instructions, separate host summaries, target version and method of verification.

Old v0.1.9 results remain in their original local storage key but are not imported as passes. Existing launcher and panel layout keys are retained. Reset clears only the selected host for this target/checklist version; export first if evidence must be retained. Previous target-build sessions remain stored separately.

## Coverage

- Public Only / Limited registration, key rejection, visibility controls, persistence, expiry/renewal, error recovery and privacy.
- Full published agreement content/metadata, acceptance event, cancellation/revocation, reacceptance and GitHub/Worker consistency.
- Navigation, approved no-flare gold branding, launcher/window controls, mobile layout/input, lazy startup, cleanup and duplicate injection.
- Native GM/PDA request bridges; settings, TU-managed backup/restore and separate legacy/archive exports.
- Single-script update and rollback.
- Flight Game, Stick Fighter, Chat Archiver, Tic-Tac-Toe, Torn Four, Torn Fleet, Slithering Streets, Chaos Marbles, Travel Assistant/Item Monitor and War Organizer: actual function plus lifecycle/data behavior for each.

## Maintenance and verification

`config/test-cases.json` is the checklist source. Bump its `checklistVersion` when changing acceptance meaning so previous passes cannot silently satisfy revised requirements. `scripts/build-diagnostics.mjs` embeds it, the current `config/tools.json` IDs and the latest `config/releases.json` target into `src/diagnostics/tu-test.user.js`. It does not fetch a runtime module catalog.

From `torn-utilities/all-in-one`:

```sh
npm run build:diagnostics
node scripts/build-diagnostics.mjs --check
node tests/diagnostics.mjs
npm test
```

Automated regressions cover catalog/tool coverage, evidence requirements, redaction, build/host isolation, unknown hosts, skipped/incomplete results, filters, resets, exports, duplicate launchers and blocked networks. They run in jsdom with mocked service responses. Actual Torn PDA/Tampermonkey execution and live DEV acceptance are still manual; no real-account outcomes were established by these regression tests.

## Automatic environment details (v0.2.1)

TU Test fills device type/family or exposed model, OS/platform version, browser/version and actual script host/version from available browser metadata. It prefers richer User-Agent Client Hints when supported and permitted, falling back to the reported user agent. It makes no network requests to detect device details. Manual corrections and saved values are retained, including when Client Hints arrive later.

Tampermonkey uses `GM_info.version`, never `GM_info.script.version` (the test script's own version). Torn PDA version is read only from an explicit TornPDA app/version token in the user agent. A PDA bridge identifies the host but does not reveal its app version; when that version is not exposed, enter it from PDA's About screen. The tool does not invent app versions or read credentials/settings to find them.

Browsers may reduce/spoof user agents, hide exact hardware models, report desktop-style iPad user agents or expose an OS platform code instead of a marketing version. Windows NT 10.0 is labeled Windows 10/11 without guessing which. Client Hints OS values are labeled platform versions. iPhone/iPad family identification is not an exact hardware model. Detection sources are included in the report's structured `detectedEnvironment`; manual profile fields remain authoritative evidence context. Auto-detection never marks functional checks as passed.

## Saved-key regression acceptance (v0.2.2)

The 0.5.42.37-dev target adds explicit inventory and removal checks covering multiple keys of both supported levels, independent verified labels, explicit role/login selection, reload and clearing all selected-key copies. Checklist version v3 starts fresh evidence for this changed acceptance plan. Previous build/checklist results remain in their original storage namespace. Agreement acceptance requires backend event evidence; UI access alone is insufficient.
