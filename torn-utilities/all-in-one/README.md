# Torn Utilities — single-script DEV

Version **0.5.42.66-dev**, branch `dev/tu-all-in-one`. Install one complete userscript for desktop Tampermonkey or Torn PDA. This is a DEV release for manual acceptance; no production deployment is included.

[Install DEV](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js) · [Installation and rollback](../INSTALLATION.md) · [Acceptance checklist](docs/DEV-ACCEPTANCE.md)

The 10 retained tools are Flight Game, Stick Fighter, Tic-Tac-Toe, Torn Four, Torn Fleet, Slithering Streets, Chaos Marbles, Travel Assistant and Item Monitor, War Organizer, and Chat Archiver. Navigation is Tools / Settings / About, with War Organizer under War Tools. User Agreement loads the published DEV agreement; Version Notes are embedded.

## Build and tests

Use Node 24 and npm. From `torn-utilities/all-in-one`:

```sh
npm ci --no-audit --no-fund
npm run validate
node scripts/build-dev.mjs --check
```

`npm run build` assembles `src/manager/manager.user.js` and the explicit `config/tools.json` sources. The staging, version-specific, and rolling DEV files are identical. No module catalog or external script installation is required. `config/releases.json` supplies the embedded release history; update it with each release. The builder checks source/bundle syntax, metadata, tool count, production endpoints, obsolete diagnostics, and patch markers. `--check` rejects stale committed outputs.

Tests use jsdom, mocked HTTP/account responses and a mocked canvas. They validate integration behavior, not actual game graphics, native GM/PDA bridges, or live multiplayer service behavior. See the acceptance report before installing.

## Architecture and migration

The internal Manager registers 10 lazy factories. Each retained source initializes on its first activation, captures its definition through a private Window facade, and receives its own version through `GM_info`. Native Window methods retain their receiver. Closing a tool calls its cleanup; reopening uses the retained factory. The build removes obsolete authorization bootstrap wrappers; the Manager controls access and revocation. Flight/Stick listeners use abortable scopes; Travel polling and observers stop on deactivation and resume on reopening. Minimizing preserves the active tool.

All bundled service endpoints target the DEV Worker. Multiplayer requests carry account authorization plus a separate room token. DEV room session keys are separate from production; saved game history, settings, and other storage namespaces remain in place. Existing room sessions are not copied between servers. Backups preserve the existing TU-managed namespace format; large archives and legacy tool storage are outside that backup format and must be exported using their own tools.

The selected sample #1 Integrated Gold logo is embedded from `../assets/tu-logo-integrated-gold.png`, including the compact 34px launcher, shared headers and War Organizer logo. The previous SVG master remains available for historical releases. Device rendering remains an acceptance check.

Historical independent sources, `modules.json`, legacy catalog Managers, and production guard workflows remain for rollback and existing supported installations. They are not inputs to the DEV integrated build. Never run the production candidate builder as part of DEV release setup, and never deploy Workers or databases for this workflow.

## Independent TU Test

Use [TU Testing and Diagnostics DEV](docs/TU-TEST.md) v0.2.17-dev for the 58-check acceptance plan, separate PDA/Tampermonkey evidence, and sanitized exports. This checklist targets the current integrated DEV build; actual host tests remain manual. `npm run build` also regenerates this independent test tool; `npm run build:diagnostics` updates only TU Test.

## Saved API keys

Settings → API Keys keeps each Torn-verified Public Only/Limited key in a separate record with its own access level and player ID. Saving adds or updates that key without replacing the login. Use the explicit TU login or War Organizer buttons to select a role. Legacy login/WHO/additional stores are merged without discarding keys; legacy labels stay unverified until rechecked. Removing a key clears matching legacy/role copies and preserves other keys. Active-key removal still requires confirmed DEV cancellation. Keys already overwritten before this fix cannot be recovered if no stored copy remains; re-add those keys. Key records are excluded from TU-managed backups and diagnostic reports.

## Session and observer lifecycle

DEV 0.5.42.38 reuses verified sessions, removes idle authorization polling, checks agreement versions through metadata, and limits observation to TU UI/activated tool lifecycles. See [cache bounds, verification behavior and lifecycle tests](docs/SESSION-AND-OBSERVERS.md).

DEV 0.5.42.40 adds minimized-alarm preservation, reversible **Show monitored items only**, and opt-in **Snatch and Run** using visible native controls and explicit user actions. See [setup and acceptance limits](docs/TRAVEL-ENHANCEMENTS.md). Native medical selection currently requires a verified Limited login key. The bundle uses a single small WebP derived from the unchanged approved logo master; The original master remains in GitHub; About has no logo-image link.

DEV 0.5.42.41 simplifies Snatch and Run to one red/green action button. Arming minimizes the main window; matching visible native controls replaces manual binding. The separate floating status panel is removed. TU Test 0.2.7 uses checklist v6 for the revised flow.

DEV 0.5.42.42 removes the About logo link and fixes inline monitored-only checkbox alignment and full native item-container collapse. Hidden foreign items no longer leave empty list slots; disabling or exiting restores them in place.

TU Test 0.2.10 adds continuous, passive travel recording. Start monitoring while hospitalized, complete healing, purchase and return without changing diagnostic stages, then stop and export after reaching the flight screen. Recording resumes across navigation in the same tab and retains a bounded rolling buffer. This does not change integrated TU gameplay behavior.

DEV 0.5.42.43 updates PC Tampermonkey Snatch and Run from captured native DOM: the Heal click includes Use/Yes, Purchase Max includes its item-specific Yes, and Return handles Travel home/Back/Continue. Native outcome evidence gates each separately clicked stage. PDA gameplay handling and production are unchanged. See [desktop acceptance and limits](docs/TRAVEL-ENHANCEMENTS.md).

DEV 0.5.42.44 extends the captured native Snatch and Run flow to Torn PDA. Purchase Max opens the mobile item-specific quantity panel and uses its visible Max/Buy/Yes controls; desktop inline controls remain supported. Both layouts use confirmed native medical release and selected-item inventory proof. Actual host acceptance remains required before production.

DEV 0.5.42.45 fixes native item-ID resolution for existing name-based foreign watches and direct no-hospital purchases without medical selection. It also defers early PDA startup until BODY exists and bounds saved launcher coordinates; TU Test 0.2.13 exports startup/launcher state for the missing-icon investigation.

DEV 0.5.42.46 waits for a rendered return confirmation rather than treating an empty panel as ready, and handles automatic flight navigation. The red/green Snatch and Run button is draggable with persistent position and drag-release protection. TU Test 0.2.14 records its function/native-step/error timeline as well as DOM evidence when monitoring is enabled.

DEV 0.5.42.47 verifies fresh free travel slots and affordability on Purchase Max, including a slot freed by the selected healing item. Stale native Max quantities are corrected before confirming Buy. TU Test 0.2.15 adds capacity-check metrics and a read-only launcher-startup check; actual PDA missing-icon diagnosis still needs a PDA export.

DEV 0.5.42.48 fixes a syntax error introduced by Torn PDA’s global quote normalization, which could prevent the entire bundle and startup marker from running. Builds and regression tests now reproduce PDA’s source adaptation before asserting launcher startup.

DEV 0.5.42.49 simplifies foreign catalog labels to country names and restores an already-active minimized Travel Assistant and Item Monitor through its tool card without restarting it or losing its state.

DEV 0.5.42.50 isolates Snatch and Run touch/mouse events from native outside-tap dismissal handlers and shows action-specific pending labels. Each subsequent stage still requires a fresh user click.

DEV 0.5.42.52 loads the complete item catalog with the verified TU login key through Manager on both PC and PDA, including Public Only keys.
