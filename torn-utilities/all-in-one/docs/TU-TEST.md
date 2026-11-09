# Independent TU Testing and Diagnostics DEV

This updates **TU Testing and Diagnostics DEV**, previously v0.1.9-dev, to **v0.2.17-dev**. It is the independent guided checklist at `dist/tu-diagnostics-dev.user.js`. The separate `torn-utilities/diagnostics/torn-pda-diagnostic.user.js` is unchanged.

[Install/update TU Test](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/all-in-one/dist/tu-diagnostics-dev.user.js)

Install alongside the integrated TU DEV userscript. The current checklist targets **0.5.42.81-dev**, contains **59 checks** and covers **10 tools**. Stock and Calculations is absent.

## Using it

1. Open **TU Test**, select the actual host (Tampermonkey or Torn PDA), and review the auto-filled device/OS/browser and host version. Correct or complete any editable values. Platform detection is a hint, not proof of compatibility.
2. Run **Run read-only checks**. Seven automatic checks inspect the installed version label, shared tool registrations, temporary local storage, the version-specific integrated DEV artifact and agreement version metadata. The authenticated Manager supplies a read-only backend version response; GitHub supplies the small version.json file. Agreement wording is not downloaded or compared by these checks. A registration/source check does not establish functional correctness. Blocked networking remains BLOCKED.
3. For the remaining 45 manual checks, follow the displayed steps in the actual selected host. Record observed behavior or a reproduction/blocking reason before marking PASS, FAIL, BLOCKED or SKIP. Use NOT TESTED to clear a result. Manual recording requires the target integrated TU build's version label to be present.
4. Exercise real DEV authentication and backend agreement acceptance/cancellation yourself. The test tool never accepts terms, registers keys, creates rooms, submits gameplay, or deploys backend changes. Controlled agreement-version-change tests need an authorized DEV setup; leave BLOCKED when unavailable.
5. Complete functional and lifecycle checks for every tool. Multiplayer requires separate DEV accounts and fresh DEV rooms; check full games, reconnects, rematches, histories and token handling. Use device-specific input/audio/rendering checks for games.
6. Repeat on the other host. PDA and Tampermonkey results are independent, keyed by target build and checklist version. A mock/browser fixture cannot count as native host evidence. When testing on separate devices, export each device's report and retain both; results are not synchronized or automatically merged.
7. Use **Export all diagnostics** to save JSON evidence. Both host checklists must pass every critical check and include device/host metadata for `acceptanceComplete`. SKIP, BLOCKED and NOT TESTED do not satisfy completion. `productionAuthorized` always remains false; production still requires review and a separate explicit decision.

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

The 0.5.42.49-dev target adds explicit inventory and removal checks covering multiple keys of both supported levels, independent verified labels, explicit role/login selection, reload and clearing all selected-key copies. Checklist version v3 starts fresh evidence for this changed acceptance plan. Previous build/checklist results remain in their original storage namespace. Agreement acceptance requires backend event evidence; UI access alone is insufficient.

## Version-only verification (v0.2.4)

The checklist targets 0.5.42.49-dev and uses checklist revision v10. Review the session-cache/observer checks for cold and warm navigation, resume/expiry, version changes, backend denial and zero connected Manager observers when idle. Full agreement text is still reviewed explicitly inside TU; diagnostic consistency uses the version string only. If backend status is unavailable or the session needs renewal, authenticate/reopen TU and rerun the read-only check. See `SESSION-AND-OBSERVERS.md` for the complete contract.

The v5 checklist adds six Travel checks: minimized alarms, reversible monitored-only rows, Snatch and Run eligibility, medical release, Max/purchase confirmation, and return/cancellation/navigation. Record native PDA and Tampermonkey outcomes separately; fixture success does not pass these checks. See [Travel enhancement acceptance](TRAVEL-ENHANCEMENTS.md) for setup and current limitations.

Revision v6 validates the single red/green Snatch and Run button, automatic native-control matching, minimizing on arm, no separate status window, conditional labeled healing selection and bounded post-click status reads.

Revision v7 checks the inline checkbox, removal of the About logo link, and compact filtering/restoration of nested native foreign-shop item containers without blank slots.

## Continuous travel DOM diagnostic (TU Test 0.2.10)

Integrated TU remains 0.5.42.49-dev. Update the independent TU Test script and confirm/correct its device and actual host/version fields before starting.

**Start while still hospitalized.** In **Snatch and Run · DOM diagnostic**, leave the stage as **Workflow (continuous)** and press **Start monitoring**. TU Test minimizes and its launcher reads **TU Test · REC**. Perform the whole normal manual sequence without returning to diagnostics: healing item → Use → Yes → Max → Buy → Yes → Return to Torn → native flight confirmation. Do not pause after healing to capture or label steps. Once safely on the flight, open TU Test, press **Stop monitoring**, then **Export all diagnostics**.

Recording observes clicks/changes in chronological order and captures related DOM updates such as a newly opened confirmation. It does not prevent, submit, repeat, confirm or otherwise automate native gameplay actions. There is no one-click capture stop or 30-second monitoring cutoff. The optional stage selector can annotate a later test, but no stage changes are required during the workflow. Closing/minimizing the TU Test panel does not stop recording. Monitoring and records resume across normal page navigation/reload in the same tab; a new tab, different WebView or cleared sessionStorage may not retain them. Stop removes its listeners, pending capture work and DOM observer.

Recording runs until explicitly stopped. To bound overhead/storage, it keeps the latest 200 entries and at most 1,000,000 characters of sanitized HTML; older entries are discarded with a count in the export. Each region is capped at 160 nodes, depth 9 and 16,000 HTML characters. DOM updates are debounced and scoped to relevant controls/messages, with broader context limited to the period after a click. No background recorder exists before Start or after Stop. If the buffer fills during a long session, Stop and export when safe; do not interrupt a dangerous gameplay sequence for this.

The JSON includes `travelDom` schema 2: monitoring state, discarded count, ordered sequence numbers, timestamps, event kinds, clicked target descriptors, region HTML, host and visible installed TU build per entry. The normal detected device, OS, browser, PDA/Tampermonkey version where exposed, manually corrected host/device fields and viewport are included. Review it before sharing. Credentials, input values, scripts, media, URLs, event handlers and arbitrary data attributes are excluded/redacted; captured text can still contain visible player/item information in relevant regions. No cookies, network payloads, uploads or private API requests are collected. Clear removes only these captures and stops recording. Recording never marks gameplay acceptance checks passed.

Revision v8 targets the captured PC Tampermonkey native-action flow in DEV 0.5.42.43: Heal includes its matching Yes, Purchase Max includes the monitored item/quantity Yes, and Return handles Travel home/Back/Continue. Each stage needs a new trusted click. Fixture checks are separate from live desktop acceptance; PDA remains unvalidated.

Revision v9 adds the captured Torn PDA compact purchase-panel flow to DEV 0.5.42.44 and TU Test 0.2.12. Validate PDA and PC separately. The Purchase Max click must expand the monitored icon, use the visible panel controls and confirm the exact item/quantity once; hidden desktop fields must remain unused. Healing/return are shared native flows. Continuous recording can run throughout without pausing after healing.

Revision v10 covers name-based watches with Hospital No/no medical selection and Public Only keys on both hosts. TU Test 0.2.13 exports startup/launcher diagnostics even without a gameplay recording. For a missing PDA icon, use Export all diagnostics immediately; inspect startup.phase, startup.error, managerApiPresent and launcher state before inferring whether TU is absent.

## Snatch and Run function monitoring (TU Test 0.2.14)

Install both integrated DEV 0.5.42.46 and TU Test 0.2.14. Start monitoring before arming Snatch and Run, then use the complete workflow without pausing between healing, purchase and return. Stop/export after safely flying. Alongside DOM/click evidence, `travelDom` schema 3 contains `function-event` timeline entries for arming, stock readiness, action starts, individual native clicks, confirmed results, errors/submission state, cancellation, blocked clicks and button moves. `snatchAndRun` contains the current button stage, label, readiness and last message.

Events cross the userscript boundary as JSON strings and the recorder exports only allowed, scrubbed fields. It records item/control labels and outcome information, not keys, tokens, request bodies or private API calls. Events are recorded only while monitoring is ON and share the existing bounded rolling buffer. Stop removes the function listener as well as the DOM observer. Existing captures and function events survive ordinary same-tab navigation; review exports before sharing. This instrumentation observes the functions and never calls them.

The draggable button is validated separately: touch/mouse movement, persistence and viewport bounds must work while red and green, and drag-release must never activate an action. Revision v12 also tests empty/collapsed return panels, delayed question rendering and automatic flight navigation.

TU Test 0.2.15 targets DEV 0.5.42.47 and records capacity-check metrics (including the native Max and chosen quantity) in function events. The read-only Check TU launcher startup button displays startup phase/build, Manager/icon presence and any sanitized startup error. For the missing PDA icon, run this check/export on PDA itself; a PC export cannot establish PDA startup state. No gameplay recording is required for a startup report.

Revision v13 targets the PDA loader parser fix in integrated DEV 0.5.42.48 / TU Test 0.2.16. After updating and navigating/reloading in PDA, Check TU launcher startup should report ready with Manager and icon present. Build validation now checks both original and PDA-normalized script syntax; the wrapper regression reproduces the former failure before startup. No gameplay is needed to verify launcher recovery.

Revision v14 / TU Test 0.2.17 targets DEV 0.5.42.49: validate country-only catalog labels while retaining Torn market/bazaar, and minimize/restore the main tool and planner through both the launcher and tool card. Confirm unsaved fields and the armed Snatch and Run intent remain, with no cancellation/reinitialization on resume.

TU Test 0.2.18 targets DEV 0.5.42.50 with the existing v14 checklist. Record the entire PDA Heal → Purchase Max → Return flow; pending-button taps should no longer dismiss medical confirmations or start a subsequent stage.

TU Test 0.2.19 targets 0.5.42.51. Validate same-tab refresh with a minimized monitor, setup retention, explicit Exit disabling resume, and immediate Return readiness after a matching purchase success.

TU Test 0.2.20 targets 0.5.42.52. Validate Select Item from Complete List on a cold catalog cache on PC and PDA, using a verified Public Only or Limited Access login key.

TU Test 0.2.21 targets 0.5.42.53. Quantity preparation/readiness events help distinguish an unavailable form from a native quantity reset during post-heal Purchase Max.

## Chat Archiver behavior monitor and combined export (0.2.22-dev)

Sections identify System/test host, Travel/Snatch and Run, Chat Archiver, tool acceptance results and export. Start chat monitoring before capture or historical scrolling. Scroll positions, abrupt jumps, archive progress and exact/group timestamp counts are recorded; chat text, room names and player identities are excluded. Stop afterward. The passive monitor is limited to 300 events, sampled scroll events are throttled, and same-tab recording resumes across navigation. A jump to the latest end pauses automated archiving and retains its captured records instead of declaring history complete. Large history prepends are not classified as jumps.

The single Export all diagnostics button includes both host checklists, system/startup information, travel/Snatch and Run evidence and chat behavior records collected so far. It does not claim unperformed tests passed. Update both TU and TU Test for new capture events.

Native timestamp support reads explicit message attributes or full timestamps, preserving unknown/group-only values when exact evidence is absent. The provided M'AOL 0.1.29 source now supplies the native React id/createdAt method; no capture-time fallback is treated as a message timestamp.

TU Test 0.2.23 targets 0.5.42.55. Chat exact timestamp counts include native createdAt metadata. Verify JSON/CSV exports preserve native message ID, UTC timestamp, Unix milliseconds and source torn-react-createdAt; identical messages must remain separate.

TU Test 0.2.24 / checklist v16 adds screen-alert and Inventory Destruction validation. The continuous Snatch and Run monitor records destroy action starts, each native Trash/Yes, item removal counts and errors. Optional stage label Inventory Trash / Yes confirmation helps identify unsupported layouts. All evidence remains in Export all diagnostics.

TU Test 0.2.25 / checklist v17 covers Planning to Hospitalize, selected healing/hospitalization items, stock arrival before Use, confirmed hospital wait and selected-only destruction. Use the Hospitalization item / Use / Yes confirmation label during continuous recording. Confirm that unselected items remain after destruction.

TU Test 0.2.26 targets 0.5.42.58. Verify Load inventory lists visible carried names/counts in both action selectors even when inventory endpoints fail, excludes empty/home items, and requires an explicit healing choice.

TU Test 0.2.27 targets 0.5.42.59. Confirm the destruction warning automatically displays current inventory choices while explicit selection/acceptance remains required.

TU Test 0.2.28 / checklist v18 covers the before-landing hospitalization confirmation. Continuous recording includes before-landing-confirmation, before-landing-declined/confirmed, native Use/Yes and result/error events. Capture the in-flight inventory layout if native controls are unavailable.

TU Test 0.2.29 / checklist v19 verifies explicit None hospitalization selection, already-hospitalized arming and no in-flight Hospitalize Me prompt without a selected item.

TU Test 0.2.30 / checklist v20 covers the second-line hospital countdown while waiting, hospital versus flight timing, unknown/zero states, no gameplay at expiry, and removal when stock enables the next action.

TU Test 0.2.31 targets 0.5.42.63. Every export now includes travelDom.snatchAndRun.hospitalClock with displayed/available flags, deadline and remaining seconds, source/reason, lookup status, profile state and whether profile until was present. Recording need not be started for this structured snapshot, and no raw profile payload or credentials are exported.

TU Test 0.2.32 / checklist v22 validates native-first purchase and at most one remainder transaction. Continuous Snatch monitoring captures purchase-confirmed, capacity-reconcile and reconcile-stopped native-step events with exact quantities. Verify 17 then 1 rather than repeated 17, and Return readiness after a confirmed initial purchase when reconciliation cannot complete.

DEV .65 diagnostics also report the companion hospital button label, presence, warning state and blink period. Use the Snatch and Run monitor to capture extra hospitalization and partial-heal actions through their native confirmations. Verify both hosts with multiple item types, remaining copies, exhausted inventory, threshold crossing, audio volume/sound and refresh persistence.

Hospital evidence in TU Test 0.2.34 / TU DEV .67 includes configured versus armed warning seconds, whether rearming is needed, sound enable and selection, live shared volume, threshold state/time to threshold, alarm dispatch deadline and audio context support/state. Selected and carried hospitalization item counts and an explicit availability reason explain missing + Hosp? controls. These are read-only, explicitly named TU settings; arbitrary input values remain excluded. Settings snapshots accompany clicks, changes and function events and survive same-tab navigation. Threshold transitions and alarm attempts are distinct; audible output always remains unverified. On older .66, named UI settings can be read, but armed runtime evidence is unavailable until TU is updated. Update both rolling DEV and diagnostics scripts for complete evidence.

TU Test 0.2.35 adds capacity source, confirmed freed slots and confirmed purchases to native-step events. DEV .68 setup and purchase testing should cover stale consumed-item labels, direct quantity entry, downward clamps and one remainder transaction, cash/stock limits, destruction credits and refresh/manual-change baseline invalidation.

TU Test 0.2.36 / DEV .69 reports confirmation-capacity-check with desired quantity, free space and stock source (current visible stock versus confirmation row absent). Validate a native row replaced by confirmation and genuine zero stock/cash/price-change cancellation. The stock-source fallback is scoped to an already matched native item/quantity confirmation.

### TU Test 0.2.37: automatic native travel page DOM

While Snatch and Run / travel monitoring is ON, the tool captures bounded native travel-page fragments at Start and on relevant native layout/control changes, including inventory panels, inventory search/Add/Fill controls and destination sections. No individual element selection is required. Debounced scans have a minimum 1.5-second interval and unchanged fragments are deduplicated. Text-only ticker/countdown updates do not trigger full page-fragment scans. Stop removes the observer, route listeners and pending scan; same-tab resume captures the new page.

Report travelDom.pageContext distinguishes Travel Agency/travel pages, retains only an allowlisted sid travel category and the pathname, and reports native-root presence. travelDom.pageDom stores at most 64 sanitized fragments / 512 KB separately from the existing 200-action timeline. Unknown page layouts may still require a selected capture. The tool excludes script/style/media, arbitrary input values, credentials, URLs, chat/log regions and TU overlays from automatic page captures. This gathers evidence for Travel Agency inventory support; it does not change gameplay or add that support itself.

For DEV .70 Travel Agency validation, confirm the overview reports 18 free slots for the captured empty layout. Pack an intended healing or hospitalization item using Torn's own controls, then use TU Load inventory and verify the carried name, occupied/free count and selection annotations. The diagnostic capture established empty-slot structure; the occupied agency item case remains a live acceptance check.

### TU Test 0.2.43: retained Snatch capacity evidence

Exports include travelDom.retainedSnatchRun even if action monitoring was off. This reads only TU's known same-tab run key and exports an allowlist of stage/flags, selected destruction count and numeric capacity-ledger fields (total, initial occupancy, confirmed frees/purchases, spending, starting funds and computed remaining capacity). Player identity, credentials, arbitrary storage and raw session contents are excluded. Missing/invalid state is explicit. It is a point-in-time retained summary, not proof of unrecorded action order or failure cause. Export from the original tab before rearming or closing it to preserve the affected run.

DEV .75 launcher validation: tap the TU icon over Torn Home and other clickable controls; the menu should remain open and Torn must not navigate. Dragging must reposition without opening. Keyboard activation remains supported. A local 500 ms guard suppresses duplicate clicks only inside the icon's prior rectangle; other controls remain usable.

The DEV Item Monitor opens from **Open Item Monitor** on the tool menu. This starts the bundled diagnostic recorder automatically. The temporary section at the bottom offers **Diagnostic Monitor Activation**, **Monitoring Deactivation**, and **Report Generation**. Recording continues while minimized, after Back, and across same-tab page navigation; manual deactivation or explicit tool exit stops recording and retains evidence. Reports include bounded, sanitized native DOM and action records, without a separate diagnostic userscript. Storage writes are deferred off action dispatch; older DOM captures are evicted before action records when limits are reached. Live PDA acceptance remains required.
